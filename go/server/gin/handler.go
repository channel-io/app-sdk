package gin

import (
	"context"
	"crypto/hmac"
	"crypto/sha256"
	"encoding/base64"
	"encoding/hex"
	"encoding/json"
	"net/http"
	"time"

	"github.com/channel-io/app-sdk/go/appsdk"
	"github.com/channel-io/app-sdk/go/native"
	ginlib "github.com/gin-gonic/gin"
)

const (
	DefaultRoute    = "/functions/:version"
	SignatureHeader = "x-signature"
)

type RequestHandler interface {
	HandleRequest(ctx context.Context, req appsdk.FunctionRequest) appsdk.FunctionResponse
}

type Handler struct {
	requestHandler    RequestHandler
	signingKey        string
	validateSignature bool
	autoRegistrar     *native.AutoRegistrar
	signatureStatus   int
	signatureBody     any
	requestContext    RequestContextFunc
	autoRegisterDelay time.Duration
	autoRegisterTries int
	autoRegisterBack  time.Duration
}

type config struct {
	route                string
	engine               *ginlib.Engine
	signingKey           string
	validateSignature    bool
	autoRegistrar        *native.AutoRegistrar
	autoRegister         bool
	autoRegisterCfg      native.AutoRegisterConfig
	signatureStatus      int
	signatureBody        any
	requestContext       RequestContextFunc
	autoRegisterDelay    time.Duration
	autoRegisterTries    int
	autoRegisterBack     time.Duration
	autoRegisterRetrySet bool
}

type Option func(*config)

type AutoRegisterOption func(*native.AutoRegisterConfig)

type RequestContextFunc func(ctx context.Context, body []byte) context.Context

func WithSignature(signingKey string) Option {
	return func(c *config) {
		c.signingKey = signingKey
		c.validateSignature = signingKey != ""
	}
}

func WithSignatureError(status int, body any) Option {
	return func(c *config) {
		if status > 0 {
			c.signatureStatus = status
		}
		if body != nil {
			c.signatureBody = body
		}
	}
}

func WithRequestContext(fn RequestContextFunc) Option {
	return func(c *config) {
		c.requestContext = fn
	}
}

func WithRoute(route string) Option {
	return func(c *config) {
		if route != "" {
			c.route = route
		}
	}
}

func WithEngine(engine *ginlib.Engine) Option {
	return func(c *config) {
		c.engine = engine
	}
}

func WithAutoRegistrar(registrar *native.AutoRegistrar) Option {
	return func(c *config) {
		c.autoRegistrar = registrar
	}
}

func WithAutoRegister(opts ...AutoRegisterOption) Option {
	return func(c *config) {
		c.autoRegister = true
		for _, opt := range opts {
			if opt != nil {
				opt(&c.autoRegisterCfg)
			}
		}
	}
}

func WithAutoRegisterConfig(autoRegisterConfig native.AutoRegisterConfig) Option {
	return func(c *config) {
		c.autoRegister = true
		c.autoRegisterCfg = autoRegisterConfig
	}
}

func WithAutoRegisterClient(client *native.Client) AutoRegisterOption {
	return func(c *native.AutoRegisterConfig) {
		c.Client = client
	}
}

func WithAutoRegisterTokenManager(tokenManager *native.TokenManager) AutoRegisterOption {
	return func(c *native.AutoRegisterConfig) {
		c.TokenManager = tokenManager
	}
}

func WithAutoRegisterResult(handler func([]native.AutoRegisterResult)) AutoRegisterOption {
	return func(c *native.AutoRegisterConfig) {
		c.OnResult = handler
	}
}

func WithAppStoreURL(appStoreURL string) AutoRegisterOption {
	return func(c *native.AutoRegisterConfig) {
		c.AppStoreURL = appStoreURL
	}
}

func WithAutoRegisterDelay(delay time.Duration) Option {
	return func(c *config) {
		c.autoRegisterDelay = delay
	}
}

func WithAutoRegisterRetry(maxAttempts int, initialBackoff time.Duration) Option {
	return func(c *config) {
		c.autoRegisterRetrySet = true
		if maxAttempts > 0 {
			c.autoRegisterTries = maxAttempts
		}
		if initialBackoff > 0 {
			c.autoRegisterBack = initialBackoff
		}
	}
}

func New(app *appsdk.App, opts ...Option) *Handler {
	return newHandler(app, app, opts...)
}

func NewHandler(handler RequestHandler, opts ...Option) *Handler {
	return newHandler(nil, handler, opts...)
}

func newHandler(app *appsdk.App, requestHandler RequestHandler, opts ...Option) *Handler {
	cfg := newConfig(opts...)
	return newHandlerWithConfig(app, requestHandler, cfg)
}

func newHandlerWithConfig(app *appsdk.App, requestHandler RequestHandler, cfg config) *Handler {
	autoRegisterTries := cfg.autoRegisterTries
	autoRegisterBack := cfg.autoRegisterBack
	if cfg.autoRegister && cfg.autoRegistrar == nil && app != nil {
		autoRegisterCfg := cfg.autoRegisterCfg
		autoRegisterCfg.App = app
		if cfg.autoRegisterRetrySet {
			if cfg.autoRegisterTries > 0 {
				autoRegisterCfg.MaxAttempts = cfg.autoRegisterTries
			}
			if cfg.autoRegisterBack > 0 {
				autoRegisterCfg.InitialBackoff = cfg.autoRegisterBack
			}
			autoRegisterTries = 1
			autoRegisterBack = 0
		}
		cfg.autoRegistrar = native.NewAutoRegistrar(autoRegisterCfg)
	}

	return &Handler{
		requestHandler:    requestHandler,
		signingKey:        cfg.signingKey,
		validateSignature: cfg.validateSignature,
		autoRegistrar:     cfg.autoRegistrar,
		signatureStatus:   cfg.signatureStatus,
		signatureBody:     cfg.signatureBody,
		requestContext:    cfg.requestContext,
		autoRegisterDelay: cfg.autoRegisterDelay,
		autoRegisterTries: autoRegisterTries,
		autoRegisterBack:  autoRegisterBack,
	}
}

func newConfig(opts ...Option) config {
	cfg := config{
		route:             DefaultRoute,
		signatureStatus:   http.StatusUnauthorized,
		signatureBody:     ginlib.H{"error": "invalid signature"},
		autoRegisterTries: 1,
	}
	for _, opt := range opts {
		if opt != nil {
			opt(&cfg)
		}
	}
	return cfg
}

func (h *Handler) Handle(ctx *ginlib.Context) {
	if h.requestHandler == nil {
		ctx.JSON(http.StatusInternalServerError, ginlib.H{"error": "function handler is not configured"})
		return
	}

	body, err := ctx.GetRawData()
	if err != nil {
		ctx.JSON(http.StatusBadRequest, ginlib.H{"error": err.Error()})
		return
	}
	if h.validateSignature && !VerifySignature(ctx.GetHeader(SignatureHeader), h.signingKey, body) {
		ctx.JSON(h.signatureStatus, h.signatureBody)
		return
	}

	var req appsdk.FunctionRequest
	if err := json.Unmarshal(body, &req); err != nil {
		ctx.JSON(http.StatusBadRequest, appsdk.ErrorResponse(appsdk.NewError(appsdk.CodeBadRequest, "parseError", "failed to parse function request")))
		return
	}

	routeVersion := ctx.Param("version")
	bodyVersion := req.SystemVersion
	if routeVersion == "" {
		routeVersion = appsdk.DefaultSystemVersion
	}
	if bodyVersion != "" && bodyVersion != routeVersion {
		ctx.JSON(
			http.StatusBadRequest,
			appsdk.ErrorResponse(appsdk.NewVersionMismatchError(bodyVersion, []string{routeVersion})),
		)
		return
	}
	req.SystemVersion = routeVersion

	requestCtx := ctx.Request.Context()
	if h.requestContext != nil {
		requestCtx = h.requestContext(requestCtx, body)
	}
	ctx.JSON(http.StatusOK, h.requestHandler.HandleRequest(requestCtx, req))
}

func (h *Handler) AutoRegister(ctx context.Context) []native.AutoRegisterResult {
	if h.autoRegistrar == nil {
		return nil
	}
	if h.autoRegisterDelay > 0 {
		timer := time.NewTimer(h.autoRegisterDelay)
		select {
		case <-ctx.Done():
			timer.Stop()
			return h.autoRegistrar.Register(ctx)
		case <-timer.C:
		}
	}

	attempts := h.autoRegisterTries
	if attempts <= 0 {
		attempts = 1
	}
	backoff := h.autoRegisterBack
	var results []native.AutoRegisterResult
	for attempt := 1; attempt <= attempts; attempt++ {
		results = h.autoRegistrar.Register(ctx)
		if autoRegisterSucceeded(results) || attempt == attempts || backoff <= 0 {
			return results
		}
		timer := time.NewTimer(backoff)
		select {
		case <-ctx.Done():
			timer.Stop()
			return results
		case <-timer.C:
			backoff *= 2
		}
	}
	return results
}

func (h *Handler) HasAutoRegistrar() bool {
	return h.autoRegistrar != nil
}

func VerifySignature(signature string, signingKey string, body []byte) bool {
	key, err := hex.DecodeString(signingKey)
	if err != nil {
		return false
	}
	mac := hmac.New(sha256.New, key)
	_, _ = mac.Write(body)
	expected := base64.StdEncoding.EncodeToString(mac.Sum(nil))
	return hmac.Equal([]byte(expected), []byte(signature))
}

func autoRegisterSucceeded(results []native.AutoRegisterResult) bool {
	if len(results) == 0 {
		return false
	}
	for _, result := range results {
		if !result.Success {
			return false
		}
	}
	return true
}
