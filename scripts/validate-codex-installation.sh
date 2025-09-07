#!/bin/bash

# Codex CLI Installation Validation Script
# This script validates that Codex CLI is properly installed and configured
# for use with GansAuditor_Codex

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
VALIDATION_ERRORS=0
VALIDATION_WARNINGS=0
CODEX_EXECUTABLE="codex"
VERBOSE=false
JSON_OUTPUT=false

# Parse command line arguments
parse_args() {
    while [[ $# -gt 0 ]]; do
        case $1 in
            --verbose|-v)
                VERBOSE=true
                shift
                ;;
            --json)
                JSON_OUTPUT=true
                shift
                ;;
            --executable)
                CODEX_EXECUTABLE="$2"
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
Codex CLI Installation Validation Script

Usage: $0 [OPTIONS]

OPTIONS:
    --verbose, -v       Enable verbose output
    --json              Output results in JSON format
    --executable PATH   Specify custom Codex CLI executable path
    --help, -h          Show this help message

DESCRIPTION:
    This script validates that Codex CLI is properly installed and configured
    for use with GansAuditor_Codex. It performs comprehensive checks including:
    
    - Executable availability and permissions
    - Version compatibility
    - Basic functionality testing
    - Environment configuration
    - Performance benchmarking
    
EXAMPLES:
    $0                          # Basic validation
    $0 --verbose                # Detailed validation output
    $0 --json                   # JSON output for automation
    $0 --executable /usr/bin/codex  # Custom executable path

EXIT CODES:
    0   All validations passed
    1   Critical errors found (deployment will fail)
    2   Warnings found (deployment may have issues)
EOF
}

# JSON output functions
json_start() {
    if [ "$JSON_OUTPUT" = true ]; then
        echo "{"
        echo "  \"timestamp\": \"$(date -u +%Y-%m-%dT%H:%M:%SZ)\","
        echo "  \"validation\": {"
    fi
}

json_end() {
    if [ "$JSON_OUTPUT" = true ]; then
        echo "  },"
        echo "  \"summary\": {"
        echo "    \"errors\": $VALIDATION_ERRORS,"
        echo "    \"warnings\": $VALIDATION_WARNINGS,"
        echo "    \"status\": \"$([ $VALIDATION_ERRORS -eq 0 ] && echo "pass" || echo "fail")\""
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

# Validation functions
validate_executable_availability() {
    if [ "$JSON_OUTPUT" = false ]; then
        log_info "Checking Codex CLI availability..."
    fi
    
    json_section "executable_availability"
    
    # Check if executable exists in PATH
    if command -v "$CODEX_EXECUTABLE" >/dev/null 2>&1; then
        CODEX_PATH=$(which "$CODEX_EXECUTABLE")
        if [ "$JSON_OUTPUT" = false ]; then
            log_success "Codex CLI found at: $CODEX_PATH"
        fi
        json_result "path_check" "pass" "Codex CLI found at $CODEX_PATH"
    else
        if [ "$JSON_OUTPUT" = false ]; then
            log_critical "Codex CLI not found in PATH"
            log_error "Please install Codex CLI or add it to your PATH"
        fi
        json_result "path_check" "fail" "Codex CLI not found in PATH"
        VALIDATION_ERRORS=$((VALIDATION_ERRORS + 1))
        json_section_end
        return 1
    fi
    
    # Check if executable is actually executable
    if [ -x "$CODEX_PATH" ]; then
        if [ "$JSON_OUTPUT" = false ]; then
            log_success "Codex CLI is executable"
        fi
        json_result "executable_check" "pass" "Codex CLI is executable"
    else
        if [ "$JSON_OUTPUT" = false ]; then
            log_error "Codex CLI is not executable"
            log_error "Run: chmod +x $CODEX_PATH"
        fi
        json_result "executable_check" "fail" "Codex CLI is not executable"
        VALIDATION_ERRORS=$((VALIDATION_ERRORS + 1))
    fi
    
    # Check file permissions and ownership
    if [ "$VERBOSE" = true ] && [ "$JSON_OUTPUT" = false ]; then
        log_info "File details:"
        ls -la "$CODEX_PATH"
    fi
    
    json_section_end
    return 0
}

validate_version_compatibility() {
    if [ "$JSON_OUTPUT" = false ]; then
        log_info "Checking Codex CLI version..."
    fi
    
    json_section "version_compatibility"
    
    # Get version information
    local version_output
    if version_output=$("$CODEX_EXECUTABLE" --version 2>&1); then
        local version=$(echo "$version_output" | head -n1 | grep -oE '[0-9]+\.[0-9]+\.[0-9]+' | head -n1)
        
        if [ -n "$version" ]; then
            if [ "$JSON_OUTPUT" = false ]; then
                log_success "Codex CLI version: $version"
            fi
            json_result "version_check" "pass" "Version $version detected" "{\"version\": \"$version\"}"
            
            # Check version compatibility (assuming minimum version 1.0.0)
            local major=$(echo "$version" | cut -d. -f1)
            local minor=$(echo "$version" | cut -d. -f2)
            
            if [ "$major" -ge 1 ]; then
                if [ "$JSON_OUTPUT" = false ]; then
                    log_success "Version is compatible"
                fi
                json_result "compatibility_check" "pass" "Version $version is compatible"
            else
                if [ "$JSON_OUTPUT" = false ]; then
                    log_warning "Version $version may not be fully compatible"
                    log_warning "Recommended: 1.0.0 or higher"
                fi
                json_result "compatibility_check" "warning" "Version $version may not be fully compatible"
                VALIDATION_WARNINGS=$((VALIDATION_WARNINGS + 1))
            fi
        else
            if [ "$JSON_OUTPUT" = false ]; then
                log_warning "Could not parse version from output: $version_output"
            fi
            json_result "version_check" "warning" "Could not parse version" "{\"output\": \"$version_output\"}"
            VALIDATION_WARNINGS=$((VALIDATION_WARNINGS + 1))
        fi
    else
        if [ "$JSON_OUTPUT" = false ]; then
            log_error "Failed to get version information"
            log_error "Output: $version_output"
        fi
        json_result "version_check" "fail" "Failed to get version information" "{\"error\": \"$version_output\"}"
        VALIDATION_ERRORS=$((VALIDATION_ERRORS + 1))
    fi
    
    json_section_end
}

validate_basic_functionality() {
    if [ "$JSON_OUTPUT" = false ]; then
        log_info "Testing basic Codex CLI functionality..."
    fi
    
    json_section "basic_functionality"
    
    # Test help command
    local help_output
    if help_output=$("$CODEX_EXECUTABLE" --help 2>&1); then
        if [ "$JSON_OUTPUT" = false ]; then
            log_success "Help command works"
        fi
        json_result "help_command" "pass" "Help command works"
        
        if [ "$VERBOSE" = true ] && [ "$JSON_OUTPUT" = false ]; then
            echo "Help output preview:"
            echo "$help_output" | head -5 | sed 's/^/  /'
        fi
    else
        if [ "$JSON_OUTPUT" = false ]; then
            log_error "Help command failed"
            log_error "Output: $help_output"
        fi
        json_result "help_command" "fail" "Help command failed" "{\"error\": \"$help_output\"}"
        VALIDATION_ERRORS=$((VALIDATION_ERRORS + 1))
    fi
    
    # Test simple execution (if exec command is available)
    local exec_output
    local exec_start_time=$(date +%s%N)
    
    if exec_output=$("$CODEX_EXECUTABLE" exec "console.log('Validation test')" 2>&1); then
        local exec_end_time=$(date +%s%N)
        local exec_duration=$(( (exec_end_time - exec_start_time) / 1000000 ))
        
        if echo "$exec_output" | grep -q "Validation test"; then
            if [ "$JSON_OUTPUT" = false ]; then
                log_success "Basic execution test passed (${exec_duration}ms)"
            fi
            json_result "execution_test" "pass" "Basic execution test passed" "{\"duration_ms\": $exec_duration}"
        else
            if [ "$JSON_OUTPUT" = false ]; then
                log_warning "Execution test completed but output unexpected"
                log_warning "Expected: 'Validation test', Got: $exec_output"
            fi
            json_result "execution_test" "warning" "Execution test completed but output unexpected" "{\"expected\": \"Validation test\", \"actual\": \"$exec_output\"}"
            VALIDATION_WARNINGS=$((VALIDATION_WARNINGS + 1))
        fi
    else
        if [ "$JSON_OUTPUT" = false ]; then
            log_warning "Basic execution test failed (may not be supported)"
            log_warning "Output: $exec_output"
        fi
        json_result "execution_test" "warning" "Basic execution test failed" "{\"error\": \"$exec_output\"}"
        VALIDATION_WARNINGS=$((VALIDATION_WARNINGS + 1))
    fi
    
    json_section_end
}

validate_environment_configuration() {
    if [ "$JSON_OUTPUT" = false ]; then
        log_info "Checking environment configuration..."
    fi
    
    json_section "environment_configuration"
    
    # Check PATH configuration
    if echo "$PATH" | grep -q "$(dirname "$CODEX_PATH")"; then
        if [ "$JSON_OUTPUT" = false ]; then
            log_success "Codex CLI directory is in PATH"
        fi
        json_result "path_configuration" "pass" "Codex CLI directory is in PATH"
    else
        if [ "$JSON_OUTPUT" = false ]; then
            log_warning "Codex CLI directory may not be in PATH"
            log_warning "This could cause issues in some environments"
        fi
        json_result "path_configuration" "warning" "Codex CLI directory may not be in PATH"
        VALIDATION_WARNINGS=$((VALIDATION_WARNINGS + 1))
    fi
    
    # Check for common environment variables
    local env_vars=("CODEX_API_KEY" "CODEX_BASE_URL" "CODEX_CONFIG_PATH")
    local env_found=0
    
    for var in "${env_vars[@]}"; do
        if [ -n "${!var}" ]; then
            env_found=$((env_found + 1))
            if [ "$VERBOSE" = true ] && [ "$JSON_OUTPUT" = false ]; then
                log_info "$var is set"
            fi
        fi
    done
    
    if [ $env_found -gt 0 ]; then
        if [ "$JSON_OUTPUT" = false ]; then
            log_success "$env_found Codex environment variables found"
        fi
        json_result "environment_variables" "pass" "$env_found Codex environment variables found"
    else
        if [ "$JSON_OUTPUT" = false ]; then
            log_info "No Codex-specific environment variables found (may be normal)"
        fi
        json_result "environment_variables" "info" "No Codex-specific environment variables found"
    fi
    
    # Check working directory accessibility
    if [ -w "." ]; then
        if [ "$JSON_OUTPUT" = false ]; then
            log_success "Current directory is writable"
        fi
        json_result "working_directory" "pass" "Current directory is writable"
    else
        if [ "$JSON_OUTPUT" = false ]; then
            log_error "Current directory is not writable"
            log_error "Codex CLI may need write access for temporary files"
        fi
        json_result "working_directory" "fail" "Current directory is not writable"
        VALIDATION_ERRORS=$((VALIDATION_ERRORS + 1))
    fi
    
    json_section_end
}

validate_performance_characteristics() {
    if [ "$JSON_OUTPUT" = false ]; then
        log_info "Testing performance characteristics..."
    fi
    
    json_section "performance_characteristics"
    
    # Test response time with multiple iterations
    local total_time=0
    local successful_runs=0
    local failed_runs=0
    
    for i in {1..3}; do
        local start_time=$(date +%s%N)
        
        if "$CODEX_EXECUTABLE" --version >/dev/null 2>&1; then
            local end_time=$(date +%s%N)
            local duration=$(( (end_time - start_time) / 1000000 ))
            total_time=$((total_time + duration))
            successful_runs=$((successful_runs + 1))
            
            if [ "$VERBOSE" = true ] && [ "$JSON_OUTPUT" = false ]; then
                log_info "Run $i: ${duration}ms"
            fi
        else
            failed_runs=$((failed_runs + 1))
        fi
    done
    
    if [ $successful_runs -gt 0 ]; then
        local avg_time=$((total_time / successful_runs))
        
        if [ "$JSON_OUTPUT" = false ]; then
            log_success "Average response time: ${avg_time}ms ($successful_runs/$((successful_runs + failed_runs)) successful)"
        fi
        
        # Performance assessment
        if [ $avg_time -lt 1000 ]; then
            json_result "response_time" "pass" "Excellent response time: ${avg_time}ms" "{\"average_ms\": $avg_time, \"successful_runs\": $successful_runs}"
        elif [ $avg_time -lt 3000 ]; then
            json_result "response_time" "pass" "Good response time: ${avg_time}ms" "{\"average_ms\": $avg_time, \"successful_runs\": $successful_runs}"
        elif [ $avg_time -lt 5000 ]; then
            if [ "$JSON_OUTPUT" = false ]; then
                log_warning "Slow response time: ${avg_time}ms"
            fi
            json_result "response_time" "warning" "Slow response time: ${avg_time}ms" "{\"average_ms\": $avg_time, \"successful_runs\": $successful_runs}"
            VALIDATION_WARNINGS=$((VALIDATION_WARNINGS + 1))
        else
            if [ "$JSON_OUTPUT" = false ]; then
                log_error "Very slow response time: ${avg_time}ms"
            fi
            json_result "response_time" "fail" "Very slow response time: ${avg_time}ms" "{\"average_ms\": $avg_time, \"successful_runs\": $successful_runs}"
            VALIDATION_ERRORS=$((VALIDATION_ERRORS + 1))
        fi
    else
        if [ "$JSON_OUTPUT" = false ]; then
            log_error "All performance test runs failed"
        fi
        json_result "response_time" "fail" "All performance test runs failed"
        VALIDATION_ERRORS=$((VALIDATION_ERRORS + 1))
    fi
    
    json_section_end
}

generate_installation_guidance() {
    if [ "$JSON_OUTPUT" = false ] && [ $VALIDATION_ERRORS -gt 0 ]; then
        echo ""
        log_info "Installation Guidance"
        echo "===================="
        echo ""
        
        echo "If Codex CLI is not installed, here are installation options:"
        echo ""
        
        echo "Option 1: Package Manager Installation"
        echo "  # Using npm (if available)"
        echo "  npm install -g @codex/cli"
        echo ""
        echo "  # Using pip (if available)"
        echo "  pip install codex-cli"
        echo ""
        echo "  # Using homebrew (macOS)"
        echo "  brew install codex-cli"
        echo ""
        echo "  # Using apt (Ubuntu/Debian)"
        echo "  sudo apt update && sudo apt install codex-cli"
        echo ""
        
        echo "Option 2: Manual Installation"
        echo "  1. Download Codex CLI from the official repository"
        echo "  2. Extract to a directory (e.g., /usr/local/bin/)"
        echo "  3. Make executable: chmod +x /usr/local/bin/codex"
        echo "  4. Add to PATH: export PATH=\"/usr/local/bin:\$PATH\""
        echo ""
        
        echo "Option 3: Custom Installation Path"
        echo "  If Codex CLI is installed in a custom location:"
        echo "  export PATH=\"/path/to/codex/bin:\$PATH\""
        echo "  # Or use --executable flag with this script"
        echo ""
        
        echo "After installation, verify with:"
        echo "  codex --version"
        echo "  codex --help"
        echo ""
    fi
}

generate_recommendations() {
    if [ "$JSON_OUTPUT" = false ]; then
        echo ""
        log_info "Recommendations"
        echo "==============="
        echo ""
        
        if [ $VALIDATION_ERRORS -eq 0 ] && [ $VALIDATION_WARNINGS -eq 0 ]; then
            log_success "✅ Codex CLI is properly installed and configured"
            log_success "✅ Ready for GansAuditor_Codex deployment"
        elif [ $VALIDATION_ERRORS -eq 0 ]; then
            log_warning "⚠️  Codex CLI is functional but has $VALIDATION_WARNINGS warnings"
            log_info "Consider addressing warnings for optimal performance"
        else
            log_error "❌ Codex CLI has $VALIDATION_ERRORS critical issues"
            log_error "These must be resolved before deploying GansAuditor_Codex"
        fi
        
        echo ""
        echo "Next Steps:"
        if [ $VALIDATION_ERRORS -gt 0 ]; then
            echo "1. Address critical issues listed above"
            echo "2. Re-run this validation script"
            echo "3. Proceed with GansAuditor_Codex deployment"
        else
            echo "1. Proceed with GansAuditor_Codex deployment"
            echo "2. Run: ./deploy.sh [local|docker|npm]"
            echo "3. Verify deployment: ./verify-deployment.sh"
        fi
        
        if [ $VALIDATION_WARNINGS -gt 0 ]; then
            echo "4. Consider optimizing configuration for better performance"
        fi
        
        echo ""
        echo "For more help:"
        echo "- See docs/CODEX_CLI_TROUBLESHOOTING.md"
        echo "- Run with --verbose for detailed output"
        echo "- Use --json for programmatic integration"
    fi
}

# Main validation function
main() {
    parse_args "$@"
    
    if [ "$JSON_OUTPUT" = false ]; then
        echo "🔍 Codex CLI Installation Validation"
        echo "===================================="
        echo ""
    fi
    
    json_start
    
    # Run all validation checks
    validate_executable_availability || true
    validate_version_compatibility || true
    validate_basic_functionality || true
    validate_environment_configuration || true
    validate_performance_characteristics || true
    
    json_end
    
    # Generate guidance and recommendations
    generate_installation_guidance
    generate_recommendations
    
    # Exit with appropriate code
    if [ $VALIDATION_ERRORS -gt 0 ]; then
        exit 1
    elif [ $VALIDATION_WARNINGS -gt 0 ]; then
        exit 2
    else
        exit 0
    fi
}

# Run main function with all arguments
main "$@"