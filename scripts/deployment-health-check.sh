#!/bin/bash

# Deployment Health Check Script for GansAuditor_Codex
# This script performs comprehensive health checks after deployment

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Helper functions
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

log_critical() {
    echo -e "${RED}[CRITICAL]${NC} $1"
}

# Global variables
HEALTH_ERRORS=0
HEALTH_WARNINGS=0
DEPLOYMENT_TYPE="local"
VERBOSE=false
JSON_OUTPUT=false
TIMEOUT=30

# Parse command line arguments
parse_args() {
    while [[ $# -gt 0 ]]; do
        case $1 in
            --type|-t)
                DEPLOYMENT_TYPE="$2"
                shift 2
                ;;
            --verbose|-v)
                VERBOSE=true
                shift
                ;;
            --json)
                JSON_OUTPUT=true
                shift
                ;;
            --timeout)
                TIMEOUT="$2"
                shift 2
                ;;
            --help|-h)
                show_help
                exit 0
                ;;
            *)
                log_error "Unknown option: $1"
                show_help
                exit 1
                ;;
        esac
    done
}

show_help() {
    cat << EOF
Deployment Health Check Script for GansAuditor_Codex

Usage: $0 [OPTIONS]

OPTIONS:
    --type, -t TYPE     Deployment type (local|docker|npm)
    --verbose, -v       Enable verbose output
    --json              Output results in JSON format
    --timeout SECONDS   Timeout for health checks (default: 30)
    --help, -h          Show this help message

DESCRIPTION:
    This script performs comprehensive health checks after deployment,
    validating that all components are working correctly.
    
    Health checks include:
    - Service availability and responsiveness
    - MCP protocol communication
    - Tool functionality testing
    - Performance benchmarking
    - Configuration validation
    - Resource monitoring
    - Error handling verification

EXAMPLES:
    $0                          # Check local deployment
    $0 --type docker            # Check Docker deployment
    $0 --type npm               # Check npm deployment
    $0 --verbose                # Detailed health check output
    $0 --json                   # JSON output for automation

EXIT CODES:
    0   All health checks passed
    1   Critical health issues found
    2   Warnings found (deployment may have issues)
EOF
}

# JSON output functions
json_start() {
    if [ "$JSON_OUTPUT" = true ]; then
        echo "{"
        echo "  \"timestamp\": \"$(date -u +%Y-%m-%dT%H:%M:%SZ)\","
        echo "  \"deployment_type\": \"$DEPLOYMENT_TYPE\","
        echo "  \"health_checks\": {"
    fi
}

json_end() {
    if [ "$JSON_OUTPUT" = true ]; then
        echo "  },"
        echo "  \"summary\": {"
        echo "    \"errors\": $HEALTH_ERRORS,"
        echo "    \"warnings\": $HEALTH_WARNINGS,"
        echo "    \"status\": \"$([ $HEALTH_ERRORS -eq 0 ] && echo "healthy" || echo "unhealthy")\""
        echo "  }"
        echo "}"
    fi
}

json_section() {
    if [ "$JSON_OUTPUT" = true ]; then
        echo "    \"$1\": {"
    fi
}

json_section_end() {
    if [ "$JSON_OUTPUT" = true ]; then
        echo "    },"
    fi
}

json_result() {
    if [ "$JSON_OUTPUT" = true ]; then
        echo "      \"$1\": {"
        echo "        \"status\": \"$2\","
        echo "        \"message\": \"$3\""
        [ -n "$4" ] && echo "        ,\"details\": $4"
        echo "      },"
    fi
}

# Get command and args based on deployment type
get_deployment_command() {
    case $DEPLOYMENT_TYPE in
        "local")
            if [ ! -f "dist/index.js" ]; then
                log_critical "Local deployment not found. Run './deploy.sh local' first."
                exit 1
            fi
            echo "node dist/index.js"
            ;;
        "docker")
            if ! docker image inspect gansauditor-codex:latest >/dev/null 2>&1; then
                log_critical "Docker image not found. Run './deploy.sh docker' first."
                exit 1
            fi
            echo "docker run --rm -i gansauditor-codex:latest"
            ;;
        "npm")
            if ! command -v uvx >/dev/null 2>&1; then
                log_critical "uvx not found. Install with: pip install uv"
                exit 1
            fi
            echo "uvx @modelcontextprotocol/server-gansauditor-codex@latest"
            ;;
        *)
            log_error "Invalid deployment type: $DEPLOYMENT_TYPE"
            exit 1
            ;;
    esac
}

# Test service availability
test_service_availability() {
    if [ "$JSON_OUTPUT" = false ]; then
        log_info "Testing service availability..."
    fi
    
    json_section "service_availability"
    
    local command=$(get_deployment_command)
    local test_request='{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2024-11-05","capabilities":{},"clientInfo":{"name":"health-check","version":"1.0.0"}}}'
    
    local start_time=$(date +%s%N)
    local response
    
    if response=$(echo "$test_request" | timeout $TIMEOUT $command 2>&1); then
        local end_time=$(date +%s%N)
        local duration=$(( (end_time - start_time) / 1000000 ))
        
        if [[ "$response" == *"capabilities"* ]] && [[ "$response" == *"tools"* ]]; then
            if [ "$JSON_OUTPUT" = false ]; then
                log_success "Service is available and responding (${duration}ms)"
            fi
            json_result "availability" "pass" "Service available and responding" "{\"response_time_ms\": $duration}"
            
            # Check response structure
            if [[ "$response" == *"gansauditor_codex"* ]]; then
                if [ "$JSON_OUTPUT" = false ]; then
                    log_success "Tool registration successful"
                fi
                json_result "tool_registration" "pass" "Tool registration successful"
            else
                if [ "$JSON_OUTPUT" = false ]; then
                    log_warning "Tool registration may be incomplete"
                fi
                json_result "tool_registration" "warning" "Tool registration may be incomplete"
                HEALTH_WARNINGS=$((HEALTH_WARNINGS + 1))
            fi
            
        else
            if [ "$JSON_OUTPUT" = false ]; then
                log_error "Service responded but with unexpected format"
                if [ "$VERBOSE" = true ]; then
                    echo "Response: $response"
                fi
            fi
            json_result "availability" "fail" "Unexpected response format" "{\"response\": \"$(echo "$response" | head -c 200)\"}"
            HEALTH_ERRORS=$((HEALTH_ERRORS + 1))
        fi
        
    else
        if [ "$JSON_OUTPUT" = false ]; then
            log_error "Service is not responding"
            if [ "$VERBOSE" = true ]; then
                echo "Error: $response"
            fi
        fi
        json_result "availability" "fail" "Service not responding" "{\"error\": \"$(echo "$response" | head -c 200)\"}"
        HEALTH_ERRORS=$((HEALTH_ERRORS + 1))
    fi
    
    json_section_end
}

# Test MCP protocol communication
test_mcp_protocol() {
    if [ "$JSON_OUTPUT" = false ]; then
        log_info "Testing MCP protocol communication..."
    fi
    
    json_section "mcp_protocol"
    
    local command=$(get_deployment_command)
    
    # Test list tools
    local list_tools_request='{"jsonrpc":"2.0","id":2,"method":"tools/list","params":{}}'
    local response
    
    if response=$(echo "$list_tools_request" | timeout $TIMEOUT $command 2>&1); then
        if [[ "$response" == *"gansauditor_codex"* ]]; then
            if [ "$JSON_OUTPUT" = false ]; then
                log_success "Tools list request successful"
            fi
            json_result "tools_list" "pass" "Tools list request successful"
        else
            if [ "$JSON_OUTPUT" = false ]; then
                log_error "Tools list request failed"
            fi
            json_result "tools_list" "fail" "Tools list request failed"
            HEALTH_ERRORS=$((HEALTH_ERRORS + 1))
        fi
    else
        if [ "$JSON_OUTPUT" = false ]; then
            log_error "MCP protocol communication failed"
        fi
        json_result "tools_list" "fail" "MCP protocol communication failed"
        HEALTH_ERRORS=$((HEALTH_ERRORS + 1))
    fi
    
    json_section_end
}

# Test tool functionality
test_tool_functionality() {
    if [ "$JSON_OUTPUT" = false ]; then
        log_info "Testing tool functionality..."
    fi
    
    json_section "tool_functionality"
    
    local command=$(get_deployment_command)
    
    # Test basic tool call
    local tool_request='{"jsonrpc":"2.0","id":3,"method":"tools/call","params":{"name":"gansauditor_codex","arguments":{"thought":"Health check test","thoughtNumber":1,"totalThoughts":1,"nextThoughtNeeded":false,"branchId":"health-check"}}}'
    
    local start_time=$(date +%s%N)
    local response
    
    if response=$(echo "$tool_request" | timeout $TIMEOUT $command 2>&1); then
        local end_time=$(date +%s%N)
        local duration=$(( (end_time - start_time) / 1000000 ))
        
        if [[ "$response" == *"thoughtNumber"* ]] && [[ "$response" == *"nextThoughtNeeded"* ]]; then
            if [ "$JSON_OUTPUT" = false ]; then
                log_success "Basic tool functionality working (${duration}ms)"
            fi
            json_result "basic_functionality" "pass" "Basic tool functionality working" "{\"response_time_ms\": $duration}"
            
            # Check for audit functionality if enabled
            if [[ "$response" == *"gan"* ]]; then
                if [ "$JSON_OUTPUT" = false ]; then
                    log_success "Audit functionality detected"
                fi
                json_result "audit_functionality" "pass" "Audit functionality detected"
            else
                if [ "$JSON_OUTPUT" = false ]; then
                    log_info "Audit functionality not triggered (normal for simple test)"
                fi
                json_result "audit_functionality" "info" "Audit functionality not triggered"
            fi
            
        else
            if [ "$JSON_OUTPUT" = false ]; then
                log_error "Tool functionality test failed"
                if [ "$VERBOSE" = true ]; then
                    echo "Response: $response"
                fi
            fi
            json_result "basic_functionality" "fail" "Tool functionality test failed" "{\"response\": \"$(echo "$response" | head -c 200)\"}"
            HEALTH_ERRORS=$((HEALTH_ERRORS + 1))
        fi
        
    else
        if [ "$JSON_OUTPUT" = false ]; then
            log_error "Tool call failed"
        fi
        json_result "basic_functionality" "fail" "Tool call failed"
        HEALTH_ERRORS=$((HEALTH_ERRORS + 1))
    fi
    
    json_section_end
}

# Test code auditing functionality
test_code_auditing() {
    if [ "$JSON_OUTPUT" = false ]; then
        log_info "Testing code auditing functionality..."
    fi
    
    json_section "code_auditing"
    
    local command=$(get_deployment_command)
    
    # Test with code that should trigger auditing
    local audit_request='{"jsonrpc":"2.0","id":4,"method":"tools/call","params":{"name":"gansauditor_codex","arguments":{"thought":"Here is a simple function:\n\n```javascript\nfunction add(a, b) {\n  return a + b;\n}\n```","thoughtNumber":1,"totalThoughts":1,"nextThoughtNeeded":false,"branchId":"audit-test"}}}'
    
    local start_time=$(date +%s%N)
    local response
    
    if response=$(echo "$audit_request" | timeout $TIMEOUT $command 2>&1); then
        local end_time=$(date +%s%N)
        local duration=$(( (end_time - start_time) / 1000000 ))
        
        if [[ "$response" == *"thoughtNumber"* ]]; then
            if [ "$JSON_OUTPUT" = false ]; then
                log_success "Code auditing request processed (${duration}ms)"
            fi
            json_result "audit_processing" "pass" "Code auditing request processed" "{\"response_time_ms\": $duration}"
            
            # Check if auditing was triggered
            if [[ "$response" == *"gan"* ]] && [[ "$response" == *"verdict"* ]]; then
                if [ "$JSON_OUTPUT" = false ]; then
                    log_success "Code auditing functionality working"
                fi
                json_result "audit_execution" "pass" "Code auditing functionality working"
            else
                if [ "$JSON_OUTPUT" = false ]; then
                    log_warning "Code auditing may not be enabled or configured"
                fi
                json_result "audit_execution" "warning" "Code auditing may not be enabled"
                HEALTH_WARNINGS=$((HEALTH_WARNINGS + 1))
            fi
            
        else
            if [ "$JSON_OUTPUT" = false ]; then
                log_error "Code auditing test failed"
            fi
            json_result "audit_processing" "fail" "Code auditing test failed"
            HEALTH_ERRORS=$((HEALTH_ERRORS + 1))
        fi
        
    else
        if [ "$JSON_OUTPUT" = false ]; then
            log_error "Code auditing request failed"
        fi
        json_result "audit_processing" "fail" "Code auditing request failed"
        HEALTH_ERRORS=$((HEALTH_ERRORS + 1))
    fi
    
    json_section_end
}

# Test performance characteristics
test_performance() {
    if [ "$JSON_OUTPUT" = false ]; then
        log_info "Testing performance characteristics..."
    fi
    
    json_section "performance"
    
    local command=$(get_deployment_command)
    local total_time=0
    local successful_requests=0
    local failed_requests=0
    
    # Run multiple requests to test performance
    for i in {1..3}; do
        local test_request='{"jsonrpc":"2.0","id":'$((i+10))',"method":"tools/call","params":{"name":"gansauditor_codex","arguments":{"thought":"Performance test '$i'","thoughtNumber":'$i',"totalThoughts":3,"nextThoughtNeeded":true,"branchId":"perf-test-'$i'"}}}'
        
        local start_time=$(date +%s%N)
        
        if echo "$test_request" | timeout $TIMEOUT $command >/dev/null 2>&1; then
            local end_time=$(date +%s%N)
            local duration=$(( (end_time - start_time) / 1000000 ))
            total_time=$((total_time + duration))
            successful_requests=$((successful_requests + 1))
            
            if [ "$VERBOSE" = true ] && [ "$JSON_OUTPUT" = false ]; then
                log_info "Request $i: ${duration}ms"
            fi
        else
            failed_requests=$((failed_requests + 1))
        fi
    done
    
    if [ $successful_requests -gt 0 ]; then
        local avg_time=$((total_time / successful_requests))
        
        if [ "$JSON_OUTPUT" = false ]; then
            log_success "Performance test completed: ${avg_time}ms average ($successful_requests/3 successful)"
        fi
        
        # Performance assessment
        if [ $avg_time -lt 2000 ]; then
            json_result "response_time" "pass" "Excellent performance: ${avg_time}ms average" "{\"average_ms\": $avg_time, \"successful_requests\": $successful_requests}"
        elif [ $avg_time -lt 5000 ]; then
            json_result "response_time" "pass" "Good performance: ${avg_time}ms average" "{\"average_ms\": $avg_time, \"successful_requests\": $successful_requests}"
        elif [ $avg_time -lt 10000 ]; then
            if [ "$JSON_OUTPUT" = false ]; then
                log_warning "Moderate performance: ${avg_time}ms average"
            fi
            json_result "response_time" "warning" "Moderate performance: ${avg_time}ms average" "{\"average_ms\": $avg_time, \"successful_requests\": $successful_requests}"
            HEALTH_WARNINGS=$((HEALTH_WARNINGS + 1))
        else
            if [ "$JSON_OUTPUT" = false ]; then
                log_error "Poor performance: ${avg_time}ms average"
            fi
            json_result "response_time" "fail" "Poor performance: ${avg_time}ms average" "{\"average_ms\": $avg_time, \"successful_requests\": $successful_requests}"
            HEALTH_ERRORS=$((HEALTH_ERRORS + 1))
        fi
        
        # Success rate assessment
        local success_rate=$((successful_requests * 100 / 3))
        if [ $success_rate -eq 100 ]; then
            json_result "success_rate" "pass" "Perfect success rate: ${success_rate}%" "{\"success_rate\": $success_rate}"
        elif [ $success_rate -ge 80 ]; then
            if [ "$JSON_OUTPUT" = false ]; then
                log_warning "Good success rate: ${success_rate}%"
            fi
            json_result "success_rate" "warning" "Good success rate: ${success_rate}%" "{\"success_rate\": $success_rate}"
            HEALTH_WARNINGS=$((HEALTH_WARNINGS + 1))
        else
            if [ "$JSON_OUTPUT" = false ]; then
                log_error "Poor success rate: ${success_rate}%"
            fi
            json_result "success_rate" "fail" "Poor success rate: ${success_rate}%" "{\"success_rate\": $success_rate}"
            HEALTH_ERRORS=$((HEALTH_ERRORS + 1))
        fi
        
    else
        if [ "$JSON_OUTPUT" = false ]; then
            log_error "All performance test requests failed"
        fi
        json_result "response_time" "fail" "All performance test requests failed"
        HEALTH_ERRORS=$((HEALTH_ERRORS + 1))
    fi
    
    json_section_end
}

# Test error handling
test_error_handling() {
    if [ "$JSON_OUTPUT" = false ]; then
        log_info "Testing error handling..."
    fi
    
    json_section "error_handling"
    
    local command=$(get_deployment_command)
    
    # Test invalid request
    local invalid_request='{"jsonrpc":"2.0","id":20,"method":"tools/call","params":{"name":"gansauditor_codex","arguments":{"invalid":"request"}}}'
    
    if response=$(echo "$invalid_request" | timeout $TIMEOUT $command 2>&1); then
        if [[ "$response" == *"error"* ]] || [[ "$response" == *"Invalid"* ]]; then
            if [ "$JSON_OUTPUT" = false ]; then
                log_success "Error handling working (invalid request properly rejected)"
            fi
            json_result "invalid_request" "pass" "Error handling working"
        else
            if [ "$JSON_OUTPUT" = false ]; then
                log_warning "Error handling may not be working properly"
            fi
            json_result "invalid_request" "warning" "Error handling may not be working properly"
            HEALTH_WARNINGS=$((HEALTH_WARNINGS + 1))
        fi
    else
        if [ "$JSON_OUTPUT" = false ]; then
            log_warning "Error handling test inconclusive"
        fi
        json_result "invalid_request" "warning" "Error handling test inconclusive"
        HEALTH_WARNINGS=$((HEALTH_WARNINGS + 1))
    fi
    
    # Test malformed JSON
    local malformed_request='{"jsonrpc":"2.0","id":21,"method":"tools/call","params":{"name":"gansauditor_codex","arguments":{"thought":"test"'
    
    if response=$(echo "$malformed_request" | timeout $TIMEOUT $command 2>&1); then
        if [[ "$response" == *"error"* ]] || [[ "$response" == *"parse"* ]]; then
            if [ "$JSON_OUTPUT" = false ]; then
                log_success "JSON parsing error handling working"
            fi
            json_result "malformed_json" "pass" "JSON parsing error handling working"
        else
            if [ "$JSON_OUTPUT" = false ]; then
                log_warning "JSON parsing error handling may not be working"
            fi
            json_result "malformed_json" "warning" "JSON parsing error handling may not be working"
            HEALTH_WARNINGS=$((HEALTH_WARNINGS + 1))
        fi
    else
        if [ "$JSON_OUTPUT" = false ]; then
            log_info "Malformed JSON test completed (expected behavior)"
        fi
        json_result "malformed_json" "info" "Malformed JSON test completed"
    fi
    
    json_section_end
}

# Test configuration
test_configuration() {
    if [ "$JSON_OUTPUT" = false ]; then
        log_info "Testing configuration..."
    fi
    
    json_section "configuration"
    
    # Check if configuration files exist
    if [ -f ".env" ]; then
        if [ "$JSON_OUTPUT" = false ]; then
            log_success "Environment configuration found"
        fi
        json_result "env_file" "pass" "Environment configuration found"
    else
        if [ "$JSON_OUTPUT" = false ]; then
            log_info "No .env file found (using defaults)"
        fi
        json_result "env_file" "info" "No .env file found"
    fi
    
    # Check MCP configuration
    if [ -f "mcp-config-generated.json" ]; then
        if [ "$JSON_OUTPUT" = false ]; then
            log_success "Generated MCP configuration found"
        fi
        json_result "mcp_config" "pass" "Generated MCP configuration found"
        
        # Validate JSON structure
        if jq empty mcp-config-generated.json 2>/dev/null; then
            if [ "$JSON_OUTPUT" = false ]; then
                log_success "MCP configuration is valid JSON"
            fi
            json_result "mcp_config_valid" "pass" "MCP configuration is valid JSON"
        else
            if [ "$JSON_OUTPUT" = false ]; then
                log_error "MCP configuration is invalid JSON"
            fi
            json_result "mcp_config_valid" "fail" "MCP configuration is invalid JSON"
            HEALTH_ERRORS=$((HEALTH_ERRORS + 1))
        fi
    else
        if [ "$JSON_OUTPUT" = false ]; then
            log_warning "No generated MCP configuration found"
        fi
        json_result "mcp_config" "warning" "No generated MCP configuration found"
        HEALTH_WARNINGS=$((HEALTH_WARNINGS + 1))
    fi
    
    # Check state directory
    if [ -d ".mcp-gan-state" ]; then
        if [ "$JSON_OUTPUT" = false ]; then
            log_success "Session state directory exists"
        fi
        json_result "state_directory" "pass" "Session state directory exists"
        
        # Check permissions
        if [ -w ".mcp-gan-state" ]; then
            if [ "$JSON_OUTPUT" = false ]; then
                log_success "Session state directory is writable"
            fi
            json_result "state_directory_writable" "pass" "Session state directory is writable"
        else
            if [ "$JSON_OUTPUT" = false ]; then
                log_error "Session state directory is not writable"
            fi
            json_result "state_directory_writable" "fail" "Session state directory is not writable"
            HEALTH_ERRORS=$((HEALTH_ERRORS + 1))
        fi
    else
        if [ "$JSON_OUTPUT" = false ]; then
            log_warning "Session state directory not found"
        fi
        json_result "state_directory" "warning" "Session state directory not found"
        HEALTH_WARNINGS=$((HEALTH_WARNINGS + 1))
    fi
    
    json_section_end
}

# Generate health report
generate_health_report() {
    if [ "$JSON_OUTPUT" = false ]; then
        echo ""
        log_info "Deployment Health Check Summary"
        echo "==============================="
        echo ""
        
        if [ $HEALTH_ERRORS -eq 0 ] && [ $HEALTH_WARNINGS -eq 0 ]; then
            log_success "✅ Deployment is healthy and ready for use"
            log_success "✅ All health checks passed"
        elif [ $HEALTH_ERRORS -eq 0 ]; then
            log_warning "⚠️  Deployment is functional but has $HEALTH_WARNINGS warnings"
            log_info "Consider addressing warnings for optimal performance"
        else
            log_error "❌ Deployment has $HEALTH_ERRORS critical health issues"
            log_error "These should be investigated and resolved"
        fi
        
        echo ""
        echo "Deployment Type: $DEPLOYMENT_TYPE"
        echo "Health Check Duration: ${TIMEOUT}s timeout"
        echo ""
        
        echo "Next Steps:"
        if [ $HEALTH_ERRORS -gt 0 ]; then
            echo "1. Investigate and resolve critical health issues"
            echo "2. Re-run health check to verify fixes"
            echo "3. Check logs for detailed error information"
        else
            echo "1. Configure your MCP client with the generated configuration"
            echo "2. Test with real code review requests"
            echo "3. Monitor performance and adjust settings as needed"
        fi
        
        if [ $HEALTH_WARNINGS -gt 0 ]; then
            echo "4. Consider optimizing configuration to address warnings"
        fi
        
        echo ""
        echo "For more help:"
        echo "- See DEPLOYMENT.md for configuration guidance"
        echo "- Check docs/MONITORING_AND_ALERTING.md for monitoring setup"
        echo "- Run with --verbose for detailed output"
        echo "- Use --json for programmatic integration"
    fi
}

# Main health check function
main() {
    parse_args "$@"
    
    if [ "$JSON_OUTPUT" = false ]; then
        echo "🏥 Deployment Health Check for GansAuditor_Codex"
        echo "================================================"
        echo ""
        echo "Deployment Type: $DEPLOYMENT_TYPE"
        echo "Timeout: ${TIMEOUT}s"
        echo ""
    fi
    
    json_start
    
    # Run all health checks
    test_service_availability
    test_mcp_protocol
    test_tool_functionality
    test_code_auditing
    test_performance
    test_error_handling
    test_configuration
    
    json_end
    
    # Generate health report
    generate_health_report
    
    # Exit with appropriate code
    if [ $HEALTH_ERRORS -gt 0 ]; then
        exit 1
    elif [ $HEALTH_WARNINGS -gt 0 ]; then
        exit 2
    else
        exit 0
    fi
}

# Run main function with all arguments
main "$@"