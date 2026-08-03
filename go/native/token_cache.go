package native

import (
	"context"
	"sync"
	"time"
)

type TokenResponse = IssueTokenResponse

type CachedToken struct {
	Token     TokenResponse `json:"token"`
	CachedAt  time.Time     `json:"cachedAt"`
	ExpiresAt time.Time     `json:"expiresAt"`
	Key       string        `json:"key"`
}

type TokenCache interface {
	Get(ctx context.Context, key string) (*CachedToken, error)
	Set(ctx context.Context, key string, token CachedToken, ttl time.Duration) error
	Delete(ctx context.Context, key string) error
	Clear(ctx context.Context) error
}

// TokenCacheLocker is an optional extension for caches shared by multiple
// replicas. WithLock must invoke fn exactly once while holding a
// storage-backed lock for key and return fn's error unchanged.
type TokenCacheLocker interface {
	WithLock(ctx context.Context, key string, fn func(context.Context) error) error
}

type InMemoryTokenCache struct {
	mu    sync.Mutex
	cache map[string]memoryTokenEntry
	now   func() time.Time
}

type memoryTokenEntry struct {
	token     CachedToken
	expiresAt time.Time
}

func NewInMemoryTokenCache() *InMemoryTokenCache {
	return &InMemoryTokenCache{
		cache: make(map[string]memoryTokenEntry),
		now:   time.Now,
	}
}

func (c *InMemoryTokenCache) Get(_ context.Context, key string) (*CachedToken, error) {
	c.mu.Lock()
	defer c.mu.Unlock()

	entry, ok := c.cache[key]
	if !ok {
		return nil, nil
	}
	if !entry.expiresAt.IsZero() && !entry.expiresAt.After(c.now()) {
		delete(c.cache, key)
		return nil, nil
	}

	token := entry.token
	return &token, nil
}

func (c *InMemoryTokenCache) Set(_ context.Context, key string, token CachedToken, ttl time.Duration) error {
	c.mu.Lock()
	defer c.mu.Unlock()

	expiresAt := token.ExpiresAt
	if ttl > 0 {
		expiresAt = c.now().Add(ttl)
	}
	c.cache[key] = memoryTokenEntry{token: token, expiresAt: expiresAt}
	return nil
}

func (c *InMemoryTokenCache) Delete(_ context.Context, key string) error {
	c.mu.Lock()
	defer c.mu.Unlock()

	delete(c.cache, key)
	return nil
}

func (c *InMemoryTokenCache) Clear(_ context.Context) error {
	c.mu.Lock()
	defer c.mu.Unlock()

	c.cache = make(map[string]memoryTokenEntry)
	return nil
}

func (c *InMemoryTokenCache) Stats() (size int, keys []string) {
	c.mu.Lock()
	defer c.mu.Unlock()

	keys = make([]string, 0, len(c.cache))
	for key, entry := range c.cache {
		if !entry.expiresAt.IsZero() && !entry.expiresAt.After(c.now()) {
			continue
		}
		keys = append(keys, key)
	}
	return len(keys), keys
}
