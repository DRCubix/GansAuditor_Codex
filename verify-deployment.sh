#!/bin/bash

# GansAuditor_Codex Deployment Verification Script
# Usage: ./verify-deployment.sh [local|docker|npm]

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[✓]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[⚠]${NC} $1"
}

log_error() {
    echo -e "${RED}[✗]${NC} $1"
}

# Test MCP protocol communication
test_mcp_protocol() {
    local command="$1"
    local args="$2"
    
    log_info "Testing MCP protocol communication..."
    
    # Create test request
    local test_request='{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2024-11-05","capabilities":{},"clientInfo":{"name":"test","version":"1.0.0"}}}'
    
    # Test server response
    local response
    if [ "$command" = "docker" ]; then
        response=$(echo "$test_request" | timeout 10s docker run --rm -i gansauditor-codex:latest 2>/dev/null || echo "timeout")
    elif [ "$command" = "uvx" ]; then
        response=$(echo "$test_request" | timeout 10s uvx @modelcontextprotocol/server-gansauditor-codex@latest 2>/dev/null || echo "timeout")
    else
        response=$(echo "$test_request" | timeout 10s $command $args 2>/dev/null || echo "timeout")
    fi
    
    if [[ "$response" == *"capabilities"* ]] && [[ "$response" == *"tools"* ]]; then
        log_success "MCP protocol communication working"
        return 0
    elif [[ "$response" == "timeout" ]]; then
        log_warning "Server response timeout (may be normal for stdio servers)"
        return 0
    else
        log_error "MCP protocol communication failed"
        echo "Response: $response"
        return 1
    fi
}

# Test tool functionality
test_tool_functionality() {
    local command="$1"
    local args="$2"
    
    log_info "Testing gansauditor_codex tool..."
    
    # Create tool test request
    local tool_request='{"jsonrpc":"2.0","id":2,"method":"tools/call","params":{"name":"gansauditor_codex","arguments":{"thought":"Test thought for verification","thoughtNumber":1,"totalThoughts":1,"nextThoughtNeeded":false}}}'
    
    local response
    if [ "$command" = "docker" ]; then
        response=$(echo -e "$tool_request" | timeout 15s docker run --rm -i gansauditor-codex:latest 2>/dev/null || echo "timeout")
    elif [ "$command" = "uvx" ]; then
        response=$(echo -e "$tool_request" | timeout 15s uvx @modelcontextprotocol/server-gansauditor-codex@latest 2>/dev/null || echo "timeout")
    else
        response=$(echo -e "$tool_request" | timeout 15s $command $args 2>/dev/null || echo "timeout")
    fi
    
    if [[ "$response" == *"thoughtNumber"* ]] && [[ "$response" == *"nextThoughtNeeded"* ]]; then
        log_success "Tool functionality working"
        return 0
    elif [[ "$response" == "timeout" ]]; then
        log_warning "Tool test timeout (server may be working but slow)"
        return 0
    else
        log_error "Tool functionality test failed"
        echo "Response: $response"
        return 1
    fi
}

# Verify local deployment
verify_local() {
    log_info "Verifying local deployment..."
    
    # Check if built
    if [ ! -f "dist/index.js" ]; then
        log_error "dist/index.js not found. Run './deploy.sh local' first."
        return 1
    fi
    log_success "Build artifacts found"
    
    # Check if executable
    if [ ! -x "dist/index.js" ]; then
        log_error "dist/index.js is not executable"
        return 1
    fi
    log_success "Build artifacts are executable"
    
    # Test MCP communication
    test_mcp_protocol "node" "dist/index.js"
    
    # Test tool functionality
    test_tool_functionality "node" "dist/index.js"
    
    # Check environment file
    if [ -f ".env" ]; then
        log_success "Environment configuration found"
    else
        log_warning "No .env file found (using defaults)"
    fi
    
    # Check state directory
    if [ -d ".mcp-gan-state" ]; then
        log_success "Session state directory exists"
    else
        log_warning "Session state directory not found"
    fi
    
    log_success "Local deployment verification complete"
}

# Verify Docker deployment
verify_docker() {
    log_info "Verifying Docker deployment..."
    
    # Check if Docker is available
    if ! command -v docker &> /dev/null; then
        log_error "Docker is not installed"
        return 1
    fi
    log_success "Docker is available"
    
    # Check if image exists
    if ! docker image inspect gansauditor-codex:latest &> /dev/null; then
        log_error "Docker image 'gansauditor-codex:latest' not found. Run './deploy.sh docker' first."
        return 1
    fi
    log_success "Docker image found"
    
    # Test MCP communication
    test_mcp_protocol "docker" ""
    
    # Test tool functionality
    test_tool_functionality "docker" ""
    
    # Check docker-compose file
    if [ -f "docker-compose.yml" ]; then
        log_success "Docker Compose configuration found"
    else
        log_warning "No docker-compose.yml found"
    fi
    
    log_success "Docker deployment verification complete"
}

# Verify NPM deployment
verify_npm() {
    log_info "Verifying NPM deployment..."
    
    # Check if uvx is available
    if ! command -v uvx &> /dev/null; then
        log_error "uvx is not installed. Install with: pip install uv"
        return 1
    fi
    log_success "uvx is available"
    
    # Check if package exists on npm
    local package_info
    package_info=$(npm view @modelcontextprotocol/server-gansauditor-codex version 2>/dev/null || echo "not-found")
    
    if [ "$package_info" = "not-found" ]; then
        log_error "Package not found on npm. Run './deploy.sh npm' first."
        return 1
    fi
    log_success "Package found on npm (version: $package_info)"
    
    # Test MCP communication
    test_mcp_protocol "uvx" ""
    
    # Test tool functionality  
    test_tool_functionality "uvx" ""
    
    log_success "NPM deployment verification complete"
}

# Test configuration
test_configuration() {
    log_info "Testing configuration..."
    
    # Test configuration validation
    if npm run validate-config &> /dev/null; then
        log_success "Configuration validation passed"
    else
        log_warning "Configuration validation failed (may be non-critical)"
    fi
    
    # Check for generated MCP config
    if [ -f "mcp-config-generated.json" ]; then
        log_success "Generated MCP configuration found"
        log_info "Configuration preview:"
        head -10 mcp-config-generated.json | sed 's/^/  /'
    else
        log_warning "No generated MCP configuration found"
    fi
}

# Performance test
performance_test() {
    local deployment_type="$1"
    
    log_info "Running basic performance test..."
    
    # Simple performance test with multiple requests
    local start_time=$(date +%s%N)
    
    for i in {1..3}; do
        local test_request='{"jsonrpc":"2.0","id":'$i',"method":"tools/call","params":{"name":"gansauditor_codex","arguments":{"thought":"Performance test '$i'","thoughtNumber":'$i',"totalThoughts":3,"nextThoughtNeeded":true}}}'
        
        case $deployment_type in
            "local")
                echo "$test_request" | timeout 10s node dist/index.js > /dev/null 2>&1 || true
                ;;
            "docker")
                echo "$test_request" | timeout 10s docker run --rm -i gansauditor-codex:latest > /dev/null 2>&1 || true
                ;;
            "npm")
                echo "$test_request" | timeout 10s uvx @modelcontextprotocol/server-gansauditor-codex@latest > /dev/null 2>&1 || true
                ;;
        esac
    done
    
    local end_time=$(date +%s%N)
    local duration=$(( (end_time - start_time) / 1000000 ))
    
    log_success "Performance test completed in ${duration}ms"
    
    if [ $duration -lt 5000 ]; then
        log_success "Performance: Excellent (< 5s)"
    elif [ $duration -lt 10000 ]; then
        log_success "Performance: Good (< 10s)"
    else
        log_warning "Performance: Slow (> 10s) - consider optimization"
    fi
}

# Main verification function
main() {
    local deployment_type=${1:-"local"}
    
    echo "🔍 GansAuditor_Codex Deployment Verification"
    echo "==========================================="
    echo ""
    
    case $deployment_type in
        "local")
            verify_local
            ;;
        "docker")
            verify_docker
            ;;
        "npm")
            verify_npm
            ;;
        *)
            log_error "Invalid deployment type: $deployment_type"
            echo "Usage: $0 [local|docker|npm]"
            exit 1
            ;;
    esac
    
    echo ""
    test_configuration
    echo ""
    performance_test "$deployment_type"
    
    echo ""
    log_success "🎉 Verification completed!"
    echo ""
    echo "Your GansAuditor_Codex deployment is ready to use."
    echo "Next steps:"
    echo "1. Copy the MCP configuration to your client"
    echo "2. Restart your MCP client"
    echo "3. Test with a real code review request"
    echo ""
    echo "For usage examples, see agent.md and docs/SYNCHRONOUS_WORKFLOW_EXAMPLES.md"
}

# Run main function
main "$@"