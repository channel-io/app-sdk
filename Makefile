SHELL := /bin/bash

PNPM ?= pnpm
GO ?= go
GOFMT ?= gofmt
NODE ?= node
BUF ?= buf
GO_TEST_FLAGS ?= -p 1
PROTOC_GEN_GO ?= protoc-gen-go
PROTOC_GEN_GO_GRPC ?= protoc-gen-go-grpc

BUF_VERSION ?= v1.54.0
PROTOC_GEN_GO_VERSION ?= v1.36.11
PROTOC_GEN_GO_GRPC_VERSION ?= v1.6.1
GOCACHE ?= $(CURDIR)/.cache/go-build

GO_BIN_DIR := $(shell GOBIN="$$(go env GOBIN 2>/dev/null)"; if [ -n "$$GOBIN" ]; then printf "%s" "$$GOBIN"; else GOPATH="$$(go env GOPATH 2>/dev/null)"; printf "%s/bin" "$$GOPATH"; fi)
PATH := $(GO_BIN_DIR):$(PATH)
export PATH
export GOCACHE
export NODE_OPTIONS ?= --max-old-space-size=4096

TS_DIR := ts
GO_DIR := go
TS_NODE_BIN := $(CURDIR)/$(TS_DIR)/node_modules/.bin

PATH := $(TS_NODE_BIN):$(PATH)

.PHONY: help
help:
	@printf "Channel App SDK monorepo targets:\n"
	@printf "  make install          Install TypeScript deps and tidy Go deps\n"
	@printf "  make build            Build all SDKs\n"
	@printf "  make test             Test all SDKs\n"
	@printf "  make lint             Lint all SDKs and proto contracts\n"
	@printf "  make docs-check       Check localized Extension recipe parity\n"
	@printf "  make format           Format TypeScript docs/code and Go code\n"
	@printf "  make format-check     Check TypeScript and Go formatting\n"
	@printf "  make install-proto-tools Install buf and protoc-gen-go if missing\n"
	@printf "  make proto-lint       Lint proto contracts\n"
	@printf "  make proto-generate   Generate proto code and Zod schemas\n"
	@printf "  make proto-check      Verify generated code is up to date\n"
	@printf "  make proto-ssot-check Verify public extension DTOs are proto-backed\n"
	@printf "  make verify           Run lint, format, proto, build, and test checks\n"

.PHONY: install
install: install-ts tidy-go

.PHONY: install-ts
install-ts:
	cd $(TS_DIR) && $(PNPM) install --frozen-lockfile

.PHONY: tidy-go
tidy-go:
	cd $(GO_DIR) && $(GO) mod tidy

.PHONY: build build-ts build-go
build: build-ts build-go

build-ts:
	cd $(TS_DIR) && $(PNPM) build

build-go:
	cd $(GO_DIR) && $(GO) build ./...

.PHONY: test test-ts test-go
test: test-ts test-go

test-ts: build-ts
	cd $(TS_DIR) && $(PNPM) test
	./scripts/smoke-test-cli-create.sh

test-go:
	cd $(GO_DIR) && $(GO) test $(GO_TEST_FLAGS) ./...

.PHONY: lint lint-ts lint-go
lint: lint-ts lint-go proto-lint proto-ssot-check docs-check

lint-ts:
	cd $(TS_DIR) && $(PNPM) lint

lint-go:
	cd $(GO_DIR) && test -z "$$($(GOFMT) -l .)"
	cd $(GO_DIR) && $(GO) vet ./...

.PHONY: format format-ts format-go
format: format-ts format-go

format-ts:
	cd $(TS_DIR) && $(PNPM) format

format-go:
	$(GOFMT) -w $(GO_DIR)

.PHONY: format-check format-check-ts format-check-go
format-check: format-check-ts format-check-go

format-check-ts:
	cd $(TS_DIR) && $(PNPM) format:check

format-check-go:
	cd $(GO_DIR) && test -z "$$($(GOFMT) -l .)"

.PHONY: install-proto-tools proto-lint proto-generate proto-check proto-ssot-check
install-proto-tools:
	@if ! command -v $(BUF) >/dev/null 2>&1; then \
		$(GO) install github.com/bufbuild/buf/cmd/buf@$(BUF_VERSION); \
	fi
	@if ! command -v $(PROTOC_GEN_GO) >/dev/null 2>&1; then \
		$(GO) install google.golang.org/protobuf/cmd/protoc-gen-go@$(PROTOC_GEN_GO_VERSION); \
	fi
	@if ! command -v $(PROTOC_GEN_GO_GRPC) >/dev/null 2>&1; then \
		$(GO) install google.golang.org/grpc/cmd/protoc-gen-go-grpc@$(PROTOC_GEN_GO_GRPC_VERSION); \
	fi

proto-lint: install-proto-tools
	$(BUF) lint

proto-generate: install-proto-tools
	$(BUF) generate
	$(NODE) scripts/generate-proto-zod.mjs

proto-check: proto-generate
	git diff --exit-code -- go/internal/gen ts/packages/core/src/gen
	test -z "$$(git ls-files --others --exclude-standard -- go/internal/gen ts/packages/core/src/gen)"

proto-ssot-check:
	$(NODE) scripts/check-proto-ssot.mjs

.PHONY: docs-check
docs-check:
	./scripts/check-extension-guides.sh
	./scripts/check-first-app-guides.sh

.PHONY: verify
verify: lint format-check proto-check build test
