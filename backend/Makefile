.PHONY: test test-unit test-integration test-coverage test-watch clean help

# Default target
default: help

## Run all tests
test: test-unit

## Run unit tests
test-unit:
	@echo "Running unit tests..."
	@go test -v -race -short ./...

## Run integration tests (requires services)
test-integration:
	@echo "Running integration tests..."
	@go test -v -race -run Integration ./...

## Run tests with coverage
test-coverage:
	@echo "Running tests with coverage..."
	@go test -v -race -coverprofile=coverage.out -covermode=atomic ./...
	@go tool cover -html=coverage.out -o coverage.html
	@echo "Coverage report generated: coverage.html"

## Run specific test
test-run:
	@echo "Running test: $(TEST)"
	@go test -v -race -run $(TEST) ./...

## Watch for changes and run tests
test-watch:
	@echo "Watching for changes..."
	@air -c .air.test.toml

## Clean test artifacts
clean:
	@echo "Cleaning test artifacts..."
	@rm -f coverage.out coverage.html
	@go clean -testcache

## Lint code
lint:
	@echo "Running linter..."
	@golangci-lint run ./...

## Format code
fmt:
	@echo "Formatting code..."
	@go fmt ./...
	@goimports -w .

## Run tests and lint
check: fmt lint test

## Show help
help:
	@echo "Available targets:"
	@awk '/^[a-zA-Z\-\_0-9]+:/ { \
		helpMessage = match(lastLine, /^## (.*)/); \
		if (helpMessage) { \
			helpCommand = substr($$1, 0, index($$1, ":")-1); \
			helpMessage = substr(lastLine, RSTART + 3, RLENGTH); \
			printf "  %-20s %s\n", helpCommand, helpMessage; \
		} \
	} \
	{ lastLine = $$0 }' $(MAKEFILE_LIST)