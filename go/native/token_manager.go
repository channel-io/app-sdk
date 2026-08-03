package native

import (
	"context"
	"fmt"
	"strings"
	"sync"
	"time"
)

const (
	defaultRefreshBuffer        = 5 * time.Minute
	maxTokenInvalidationRetries = 2
)

type TokenManagerLogger interface {
	Debug(msg string, args ...any)
}

type TokenManagerConfig struct {
	AppID         string
	AppSecret     string
	AppStoreURL   string
	Client        *Client
	Cache         TokenCache
	RefreshBuffer time.Duration
	Debug         bool
	Logger        TokenManagerLogger
}

type TokenManager struct {
	appID         string
	appSecret     string
	client        *Client
	cache         TokenCache
	refreshBuffer time.Duration
	debug         bool
	logger        TokenManagerLogger

	mu         sync.Mutex
	inFlight   map[string]*tokenCall
	generation uint64
}

type tokenCall struct {
	done  chan struct{}
	token *TokenResponse
	err   error
}

type TokenManagerError struct {
	Message string
	Cause   error
}

func (e *TokenManagerError) Error() string {
	if e.Cause == nil {
		return e.Message
	}
	return e.Message + ": " + e.Cause.Error()
}

func (e *TokenManagerError) Unwrap() error {
	return e.Cause
}

func NewTokenManager(config TokenManagerConfig) *TokenManager {
	client := config.Client
	if client == nil {
		opts := []Option{}
		if config.AppStoreURL != "" {
			opts = append(opts, WithBaseURL(config.AppStoreURL))
		}
		client = NewClient(opts...)
	}

	cache := config.Cache
	if cache == nil {
		cache = NewInMemoryTokenCache()
	}

	refreshBuffer := config.RefreshBuffer
	if refreshBuffer == 0 {
		refreshBuffer = defaultRefreshBuffer
	}

	return &TokenManager{
		appID:         config.AppID,
		appSecret:     config.AppSecret,
		client:        client,
		cache:         cache,
		refreshBuffer: refreshBuffer,
		debug:         config.Debug,
		logger:        config.Logger,
		inFlight:      make(map[string]*tokenCall),
	}
}

func (m *TokenManager) Client() *Client {
	return m.client
}

func (m *TokenManager) GetAppToken(ctx context.Context) (*TokenResponse, error) {
	return m.getOrRefreshToken(ctx, m.buildCacheKey("app", ""), func(ctx context.Context) (*TokenResponse, error) {
		return m.issueAppToken(ctx)
	})
}

func (m *TokenManager) GetChannelToken(ctx context.Context, channelID string) (*TokenResponse, error) {
	if strings.TrimSpace(channelID) == "" {
		return nil, &TokenManagerError{Message: "channelId is required"}
	}
	return m.getOrRefreshToken(ctx, m.buildCacheKey("channel", channelID), func(ctx context.Context) (*TokenResponse, error) {
		return m.issueChannelToken(ctx, channelID)
	})
}

func (m *TokenManager) RefreshToken(ctx context.Context, refreshToken string) (*TokenResponse, error) {
	token, err := m.client.RefreshToken(ctx, refreshToken)
	if err != nil {
		return nil, &TokenManagerError{Message: "failed to refresh token", Cause: err}
	}
	if err := validateToken(token); err != nil {
		return nil, err
	}
	return token, nil
}

func (m *TokenManager) InvalidateAppToken(ctx context.Context) error {
	return m.invalidateCacheKey(ctx, m.buildCacheKey("app", ""))
}

func (m *TokenManager) InvalidateChannelToken(ctx context.Context, channelID string) error {
	return m.invalidateCacheKey(ctx, m.buildCacheKey("channel", channelID))
}

func (m *TokenManager) ClearCache(ctx context.Context) error {
	m.mu.Lock()
	m.generation++
	m.inFlight = make(map[string]*tokenCall)
	m.mu.Unlock()

	return m.cache.Clear(ctx)
}

func (m *TokenManager) invalidateCacheKey(ctx context.Context, key string) error {
	m.mu.Lock()
	m.generation++
	delete(m.inFlight, key)
	m.mu.Unlock()

	return m.cache.Delete(ctx, key)
}

func (m *TokenManager) getOrRefreshToken(ctx context.Context, key string, issueToken func(context.Context) (*TokenResponse, error)) (*TokenResponse, error) {
	cached, err := m.cache.Get(ctx, key)
	if err != nil {
		return nil, &TokenManagerError{Message: "failed to read token cache", Cause: err}
	}
	if cached != nil && !m.needsRefresh(*cached) {
		m.log("token cache hit", "key", key)
		token := cached.Token
		return &token, nil
	}

	return m.dedup(ctx, key, func(ctx context.Context) (*TokenResponse, error) {
		return m.withCacheLock(ctx, key, func(ctx context.Context) (*TokenResponse, error) {
			return m.getOrRefreshTokenWithRetry(ctx, key, issueToken)
		})
	})
}

func (m *TokenManager) getOrRefreshTokenWithRetry(ctx context.Context, key string, issueToken func(context.Context) (*TokenResponse, error)) (*TokenResponse, error) {
	for attempt := 0; attempt <= maxTokenInvalidationRetries; attempt++ {
		token, err := m.getOrRefreshTokenOnce(ctx, key, issueToken)
		if err != nil {
			return nil, err
		}
		if token != nil {
			return token, nil
		}
		m.log("token invalidated while resolving; retrying", "key", key, "attempt", attempt+1)
	}

	return nil, &TokenManagerError{Message: fmt.Sprintf("token invalidated while resolving %s", key)}
}

func (m *TokenManager) getOrRefreshTokenOnce(ctx context.Context, key string, issueToken func(context.Context) (*TokenResponse, error)) (*TokenResponse, error) {
	latest, err := m.cache.Get(ctx, key)
	if err != nil {
		return nil, &TokenManagerError{Message: "failed to read token cache", Cause: err}
	}
	if latest != nil && !m.needsRefresh(*latest) {
		m.log("token cache hit", "key", key)
		token := latest.Token
		return &token, nil
	}

	generation := m.cacheGeneration()
	if latest != nil {
		m.log("token expiring soon; refreshing", "key", key)
		refreshed, err := m.RefreshToken(ctx, latest.Token.RefreshToken)
		if err == nil && !m.isWithinRefreshBuffer(*refreshed) {
			return m.cacheTokenIfCurrent(ctx, key, *refreshed, generation)
		}
		if err == nil {
			err = &TokenManagerError{Message: fmt.Sprintf("refreshed token expires within the configured refresh buffer (%ds)", refreshed.ExpiresIn)}
		}
		m.log("refresh failed; issuing new token", "key", key, "err", err)
		if m.cacheGeneration() != generation {
			return nil, nil
		}
	}

	m.log("issuing new token", "key", key)
	token, err := issueToken(ctx)
	if err != nil {
		return nil, err
	}
	token, err = m.refreshNewShortLivedToken(ctx, key, token)
	if err != nil {
		return nil, err
	}
	return m.cacheTokenIfCurrent(ctx, key, *token, generation)
}

func (m *TokenManager) withCacheLock(ctx context.Context, key string, fn func(context.Context) (*TokenResponse, error)) (*TokenResponse, error) {
	locker, ok := m.cache.(TokenCacheLocker)
	if !ok {
		return fn(ctx)
	}

	var token *TokenResponse
	err := locker.WithLock(ctx, key, func(lockCtx context.Context) error {
		var err error
		token, err = fn(lockCtx)
		return err
	})
	return token, err
}

func (m *TokenManager) refreshNewShortLivedToken(ctx context.Context, key string, token *TokenResponse) (*TokenResponse, error) {
	if !m.isWithinRefreshBuffer(*token) {
		return token, nil
	}

	m.log("new token expires within refresh buffer; refreshing once", "key", key)
	refreshed, err := m.RefreshToken(ctx, token.RefreshToken)
	if err != nil {
		return nil, err
	}
	if m.isWithinRefreshBuffer(*refreshed) {
		return nil, &TokenManagerError{Message: fmt.Sprintf("token after immediate refresh expires within the configured refresh buffer (%ds)", refreshed.ExpiresIn)}
	}
	return refreshed, nil
}

func (m *TokenManager) dedup(ctx context.Context, key string, fn func(context.Context) (*TokenResponse, error)) (*TokenResponse, error) {
	m.mu.Lock()
	if existing := m.inFlight[key]; existing != nil {
		m.mu.Unlock()
		m.log("deduplicating token request", "key", key)
		select {
		case <-existing.done:
			return existing.token, existing.err
		case <-ctx.Done():
			return nil, ctx.Err()
		}
	}

	call := &tokenCall{done: make(chan struct{})}
	m.inFlight[key] = call
	m.mu.Unlock()

	call.token, call.err = fn(ctx)
	close(call.done)

	m.mu.Lock()
	if m.inFlight[key] == call {
		delete(m.inFlight, key)
	}
	m.mu.Unlock()

	return call.token, call.err
}

func (m *TokenManager) issueAppToken(ctx context.Context) (*TokenResponse, error) {
	token, err := m.client.IssueToken(ctx, m.appSecret)
	if err != nil {
		return nil, &TokenManagerError{Message: "failed to issue app token", Cause: err}
	}
	if err := validateToken(token); err != nil {
		return nil, err
	}
	return token, nil
}

func (m *TokenManager) issueChannelToken(ctx context.Context, channelID string) (*TokenResponse, error) {
	token, err := m.client.IssueToken(ctx, m.appSecret, IssueTokenOptions{ChannelID: channelID})
	if err != nil {
		return nil, &TokenManagerError{Message: "failed to issue channel token", Cause: err}
	}
	if err := validateToken(token); err != nil {
		return nil, err
	}
	return token, nil
}

func (m *TokenManager) cacheTokenIfCurrent(ctx context.Context, key string, token TokenResponse, generation uint64) (*TokenResponse, error) {
	if m.cacheGeneration() != generation {
		return nil, nil
	}
	if err := m.cacheToken(ctx, key, token); err != nil {
		return nil, err
	}
	if m.cacheGeneration() != generation {
		return nil, nil
	}
	return &token, nil
}

func (m *TokenManager) cacheToken(ctx context.Context, key string, token TokenResponse) error {
	now := time.Now()
	expiresAt := now.Add(time.Duration(token.ExpiresIn) * time.Second)
	cached := CachedToken{
		Token:     token,
		CachedAt:  now,
		ExpiresAt: expiresAt,
		Key:       key,
	}
	ttl := time.Until(expiresAt)
	if ttl < 0 {
		ttl = 0
	}
	if err := m.cache.Set(ctx, key, cached, ttl); err != nil {
		return &TokenManagerError{Message: "failed to write token cache", Cause: err}
	}
	return nil
}

func (m *TokenManager) needsRefresh(cached CachedToken) bool {
	return !time.Now().Before(cached.ExpiresAt.Add(-m.refreshBuffer))
}

func (m *TokenManager) isWithinRefreshBuffer(token TokenResponse) bool {
	return time.Duration(token.ExpiresIn)*time.Second <= m.refreshBuffer
}

func (m *TokenManager) cacheGeneration() uint64 {
	m.mu.Lock()
	defer m.mu.Unlock()
	return m.generation
}

func (m *TokenManager) buildCacheKey(scope, channelID string) string {
	parts := []string{m.appID, scope}
	if channelID != "" {
		parts = append(parts, channelID)
	}
	return strings.Join(parts, ":")
}

func (m *TokenManager) log(msg string, args ...any) {
	if !m.debug || m.logger == nil {
		return
	}
	m.logger.Debug(msg, args...)
}

func validateToken(token *TokenResponse) error {
	if token == nil ||
		token.AccessToken == "" ||
		token.RefreshToken == "" ||
		token.ExpiresIn <= 0 {
		return &TokenManagerError{Message: "invalid native token response"}
	}
	return nil
}
