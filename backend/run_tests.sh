#!/bin/bash

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Default values
COVERAGE=false
WATCH=false
VERBOSE=false
INTEGRATION=false
SPECIFIC_TEST=""

# Parse command line arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        -c|--coverage)
            COVERAGE=true
            shift
            ;;
        -w|--watch)
            WATCH=true
            shift
            ;;
        -v|--verbose)
            VERBOSE=true
            shift
            ;;
        -i|--integration)
            INTEGRATION=true
            shift
            ;;
        -t|--test)
            SPECIFIC_TEST="$2"
            shift 2
            ;;
        -h|--help)
            echo "Usage: $0 [options]"
            echo "Options:"
            echo "  -c, --coverage      Run with coverage report"
            echo "  -w, --watch        Watch for changes and rerun tests"
            echo "  -v, --verbose      Verbose output"
            echo "  -i, --integration  Run integration tests"
            echo "  -t, --test NAME    Run specific test"
            echo "  -h, --help         Show this help message"
            exit 0
            ;;
        *)
            echo "Unknown option: $1"
            exit 1
            ;;
    esac
done

echo -e "${GREEN}🧪 Running Plex Requests Backend Tests${NC}"
echo "=================================="

# Build test command
TEST_CMD="go test"

if [ "$VERBOSE" = true ]; then
    TEST_CMD="$TEST_CMD -v"
fi

TEST_CMD="$TEST_CMD -race"

if [ "$INTEGRATION" = false ]; then
    TEST_CMD="$TEST_CMD -short"
fi

if [ "$COVERAGE" = true ]; then
    TEST_CMD="$TEST_CMD -coverprofile=coverage.out -covermode=atomic"
fi

if [ -n "$SPECIFIC_TEST" ]; then
    TEST_CMD="$TEST_CMD -run $SPECIFIC_TEST"
fi

TEST_CMD="$TEST_CMD ./..."

# Run tests
if [ "$WATCH" = true ]; then
    echo -e "${YELLOW}👀 Watching for changes...${NC}"
    air -c .air.test.toml
else
    echo -e "${YELLOW}🏃 Running tests...${NC}"
    echo "Command: $TEST_CMD"
    echo ""
    
    eval $TEST_CMD
    TEST_EXIT_CODE=$?
    
    if [ $TEST_EXIT_CODE -eq 0 ]; then
        echo -e "\n${GREEN}✅ All tests passed!${NC}"
        
        if [ "$COVERAGE" = true ]; then
            echo -e "${YELLOW}📊 Generating coverage report...${NC}"
            go tool cover -html=coverage.out -o coverage.html
            echo -e "${GREEN}Coverage report saved to coverage.html${NC}"
            
            # Show coverage summary
            COVERAGE_PCT=$(go tool cover -func=coverage.out | grep total | awk '{print $3}')
            echo -e "${GREEN}Total coverage: $COVERAGE_PCT${NC}"
        fi
    else
        echo -e "\n${RED}❌ Tests failed!${NC}"
        exit $TEST_EXIT_CODE
    fi
fi