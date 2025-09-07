#!/bin/bash

# Production Readiness Validation Script for GansAuditor_Codex
# This script runs all validation checks to ensure production readiness

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
TOTAL_ERRORS=0
TOTAL_WARNINGS=0
DEPLOYMENT_TYPE="local"
VERBOSE=false
JSON_OUTPUT=false
SKIP_HEALTH_CHECK=false

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
            --skip-health-check)
                SKIP_HEALTH_CHECK=true
                shift
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
Production Readiness Validation Script for GansAuditor_Codex

Usage: $0 [OPTIONS]

OPTIONS:
    --type, -t TYPE         Deployment type (local|docker|npm)
    --verbose, -v           Enable verbose output
    --json                  Output results in JSON format
    --skip-health-check     Skip deployment health check
    --help, -h              Show this help message

DESCRIPTION:
    This script runs comprehensive validation checks to ensure GansAuditor_Codex
    is ready for production deployment. It combines multiple validation scripts
    to provide a complete readiness assessment.
    
    Validation includes:
    - Codex CLI installation and configuration
    - Environment and system requirements
    - Application configuration
    - Deployment health checks (optional)
    - Performance benchmarking
    - Security and production readiness

EXAMPLES:
    $0                          # Validate local deployment
    $0 --type docker            # Validate Docker deployment
    $0 --verbose                # Detailed validation output
    $0 --json                   # JSON output for automation
    $0 --skip-health-check      # Skip health check (faster)

EXIT CODES:
    0   All validations passed - ready for production
    1   Critical errors found - deployment will fail
    2   Warnings found - deployment may have issues
EOF
}

# JSON output functions
json_start() {
    if [ "$JSON_OUTPUT" = true ]; then
        echo "{"
        echo "  \"timestamp\": \"$(date -u +%Y-%m-%dT%H:%M:%SZ)\","
        echo "  \"deployment_type\": \"$DEPLOYMENT_TYPE\","
        echo "  \"validation_results\": {"
    fi
}

json_end() {
    if [ "$JSON_OUTPUT" = true ]; then
        echo "  },"
        echo "  \"summary\": {"
        echo "    \"total_errors\": $TOTAL_ERRORS,"
        echo "    \"total_warnings\": $TOTAL_WARNINGS,"
        echo "    \"production_ready\": $([ $TOTAL_ERRORS -eq 0 ] && echo "true" || echo "false"),"
        echo "    \"status\": \"$([ $TOTAL_ERRORS -eq 0 ] && echo "ready" || echo "not_ready")\""
        echo "  }"
        echo "}"
    fi
}

json_validation_result() {
    if [ "$JSON_OUTPUT" = true ]; then
        echo "    \"$1\": {"
        echo "      \"status\": \"$2\","
        echo "      \"errors\": $3,"
        echo "      \"warnings\": $4,"
        echo "      \"message\": \"$5\""
        echo "    },"
    fi
}

# Run Codex CLI validation
validate_codex_cli() {
    if [ "$JSON_OUTPUT" = false ]; then
        log_info "=== Codex CLI Validation ==="
    fi
    
    local errors=0
    local warnings=0
    local status="pass"
    local message="Codex CLI validation passed"
    
    if [ "$VERBOSE" = true ] && [ "$JSON_OUTPUT" = false ]; then
        ./scripts/validate-codex-installation.sh --verbose
        local exit_code=$?
    else
        ./scripts/validate-codex-installation.sh --json >/tmp/codex-validation.json 2>&1
        local exit_code=$?
    fi
    
    if [ $exit_code -eq 1 ]; then
        errors=1
        status="fail"
        message="Codex CLI validation failed - critical issues found"
        if [ "$JSON_OUTPUT" = false ]; then
            log_critical "Codex CLI validation failed"
            log_error "Run './scripts/validate-codex-installation.sh --verbose' for details"
        fi
    elif [ $exit_code -eq 2 ]; then
        warnings=1
        status="warning"
        message="Codex CLI validation passed with warnings"
        if [ "$JSON_OUTPUT" = false ]; then
            log_warning "Codex CLI validation passed with warnings"
        fi
    else
        if [ "$JSON_OUTPUT" = false ]; then
            log_success "Codex CLI validation passed"
        fi
    fi
    
    TOTAL_ERRORS=$((TOTAL_ERRORS + errors))
    TOTAL_WARNINGS=$((TOTAL_WARNINGS + warnings))
    
    json_validation_result "codex_cli" "$status" "$errors" "$warnings" "$message"
}

# Run environment validation
validate_environment() {
    if [ "$JSON_OUTPUT" = false ]; then
        log_info "=== Environment Validation ==="
    fi
    
    local errors=0
    local warnings=0
    local status="pass"
    local message="Environment validation passed"
    
    local env_args=""
    [ "$DEPLOYMENT_TYPE" = "docker" ] && env_args="--docker"
    [ "$DEPLOYMENT_TYPE" != "local" ] && env_args="$env_args --production"
    
    if [ "$VERBOSE" = true ] && [ "$JSON_OUTPUT" = false ]; then
        ./scripts/validate-environment.sh $env_args --verbose
        local exit_code=$?
    else
        ./scripts/validate-environment.sh $env_args --json >/tmp/env-validation.json 2>&1
        local exit_code=$?
    fi
    
    if [ $exit_code -eq 1 ]; then
        errors=1
        status="fail"
        message="Environment validation failed - critical issues found"
        if [ "$JSON_OUTPUT" = false ]; then
            log_critical "Environment validation failed"
            log_error "Run './scripts/validate-environment.sh $env_args --verbose' for details"
        fi
    elif [ $exit_code -eq 2 ]; then
        warnings=1
        status="warning"
        message="Environment validation passed with warnings"
        if [ "$JSON_OUTPUT" = false ]; then
            log_warning "Environment validation passed with warnings"
        fi
    else
        if [ "$JSON_OUTPUT" = false ]; then
            log_success "Environment validation passed"
        fi
    fi
    
    TOTAL_ERRORS=$((TOTAL_ERRORS + errors))
    TOTAL_WARNINGS=$((TOTAL_WARNINGS + warnings))
    
    json_validation_result "environment" "$status" "$errors" "$warnings" "$message"
}

# Run configuration validation
validate_configuration() {
    if [ "$JSON_OUTPUT" = false ]; then
        log_info "=== Configuration Validation ==="
    fi
    
    local errors=0
    local warnings=0
    local status="pass"
    local message="Configuration validation passed"
    
    if [ -f "scripts/validate-config.js" ]; then
        if [ "$VERBOSE" = true ] && [ "$JSON_OUTPUT" = false ]; then
            node scripts/validate-config.js
            local exit_code=$?
        else
            node scripts/validate-config.js --json >/tmp/config-validation.json 2>&1
            local exit_code=$?
        fi
        
        if [ $exit_code -eq 1 ]; then
            errors=1
            status="fail"
            message="Configuration validation failed - critical issues found"
            if [ "$JSON_OUTPUT" = false ]; then
                log_critical "Configuration validation failed"
                log_error "Run 'node scripts/validate-config.js' for details"
            fi
        elif [ $exit_code -eq 2 ]; then
            warnings=1
            status="warning"
            message="Configuration validation passed with warnings"
            if [ "$JSON_OUTPUT" = false ]; then
                log_warning "Configuration validation passed with warnings"
            fi
        else
            if [ "$JSON_OUTPUT" = false ]; then
                log_success "Configuration validation passed"
            fi
        fi
    else
        if [ "$JSON_OUTPUT" = false ]; then
            log_warning "Configuration validation script not found"
        fi
        warnings=1
        status="warning"
        message="Configuration validation script not found"
    fi
    
    TOTAL_ERRORS=$((TOTAL_ERRORS + errors))
    TOTAL_WARNINGS=$((TOTAL_WARNINGS + warnings))
    
    json_validation_result "configuration" "$status" "$errors" "$warnings" "$message"
}

# Run deployment health check
validate_deployment_health() {
    if [ "$SKIP_HEALTH_CHECK" = true ]; then
        if [ "$JSON_OUTPUT" = false ]; then
            log_info "=== Deployment Health Check (Skipped) ==="
        fi
        json_validation_result "deployment_health" "skipped" "0" "0" "Deployment health check skipped"
        return 0
    fi
    
    if [ "$JSON_OUTPUT" = false ]; then
        log_info "=== Deployment Health Check ==="
    fi
    
    local errors=0
    local warnings=0
    local status="pass"
    local message="Deployment health check passed"
    
    # Check if deployment exists
    case $DEPLOYMENT_TYPE in
        "local")
            if [ ! -f "dist/index.js" ]; then
                errors=1
                status="fail"
                message="Local deployment not found - run './deploy.sh local' first"
                if [ "$JSON_OUTPUT" = false ]; then
                    log_error "Local deployment not found"
                    log_error "Run './deploy.sh local' first"
                fi
                TOTAL_ERRORS=$((TOTAL_ERRORS + errors))
                json_validation_result "deployment_health" "$status" "$errors" "$warnings" "$message"
                return 1
            fi
            ;;
        "docker")
            if ! docker image inspect gansauditor-codex:latest >/dev/null 2>&1; then
                errors=1
                status="fail"
                message="Docker image not found - run './deploy.sh docker' first"
                if [ "$JSON_OUTPUT" = false ]; then
                    log_error "Docker image not found"
                    log_error "Run './deploy.sh docker' first"
                fi
                TOTAL_ERRORS=$((TOTAL_ERRORS + errors))
                json_validation_result "deployment_health" "$status" "$errors" "$warnings" "$message"
                return 1
            fi
            ;;
        "npm")
            if ! command -v uvx >/dev/null 2>&1; then
                errors=1
                status="fail"
                message="uvx not found - install with 'pip install uv'"
                if [ "$JSON_OUTPUT" = false ]; then
                    log_error "uvx not found"
                    log_error "Install with: pip install uv"
                fi
                TOTAL_ERRORS=$((TOTAL_ERRORS + errors))
                json_validation_result "deployment_health" "$status" "$errors" "$warnings" "$message"
                return 1
            fi
            ;;
    esac
    
    # Run health check
    if [ "$VERBOSE" = true ] && [ "$JSON_OUTPUT" = false ]; then
        ./scripts/deployment-health-check.sh --type "$DEPLOYMENT_TYPE" --verbose
        local exit_code=$?
    else
        ./scripts/deployment-health-check.sh --type "$DEPLOYMENT_TYPE" --json >/tmp/health-check.json 2>&1
        local exit_code=$?
    fi
    
    if [ $exit_code -eq 1 ]; then
        errors=1
        status="fail"
        message="Deployment health check failed - critical issues found"
        if [ "$JSON_OUTPUT" = false ]; then
            log_critical "Deployment health check failed"
            log_error "Run './scripts/deployment-health-check.sh --type $DEPLOYMENT_TYPE --verbose' for details"
        fi
    elif [ $exit_code -eq 2 ]; then
        warnings=1
        status="warning"
        message="Deployment health check passed with warnings"
        if [ "$JSON_OUTPUT" = false ]; then
            log_warning "Deployment health check passed with warnings"
        fi
    else
        if [ "$JSON_OUTPUT" = false ]; then
            log_success "Deployment health check passed"
        fi
    fi
    
    TOTAL_ERRORS=$((TOTAL_ERRORS + errors))
    TOTAL_WARNINGS=$((TOTAL_WARNINGS + warnings))
    
    json_validation_result "deployment_health" "$status" "$errors" "$warnings" "$message"
}

# Generate production readiness report
generate_readiness_report() {
    if [ "$JSON_OUTPUT" = false ]; then
        echo ""
        echo "========================================"
        log_info "Production Readiness Assessment"
        echo "========================================"
        echo ""
        
        echo "Deployment Type: $DEPLOYMENT_TYPE"
        echo "Validation Date: $(date)"
        echo "Total Errors: $TOTAL_ERRORS"
        echo "Total Warnings: $TOTAL_WARNINGS"
        echo ""
        
        if [ $TOTAL_ERRORS -eq 0 ] && [ $TOTAL_WARNINGS -eq 0 ]; then
            log_success "🎉 PRODUCTION READY"
            log_success "✅ All validation checks passed"
            log_success "✅ No critical issues or warnings found"
            echo ""
            echo "Your GansAuditor_Codex deployment is ready for production use."
            
        elif [ $TOTAL_ERRORS -eq 0 ]; then
            log_warning "⚠️  PRODUCTION READY WITH WARNINGS"
            log_warning "✅ No critical issues found"
            log_warning "⚠️  $TOTAL_WARNINGS warnings need attention"
            echo ""
            echo "Your deployment is functional but consider addressing warnings"
            echo "for optimal performance and reliability."
            
        else
            log_error "❌ NOT PRODUCTION READY"
            log_error "✗ $TOTAL_ERRORS critical issues must be resolved"
            if [ $TOTAL_WARNINGS -gt 0 ]; then
                log_error "⚠️  $TOTAL_WARNINGS additional warnings found"
            fi
            echo ""
            echo "Critical issues must be resolved before production deployment."
        fi
        
        echo ""
        echo "Next Steps:"
        if [ $TOTAL_ERRORS -gt 0 ]; then
            echo "1. 🔧 Resolve critical issues identified above"
            echo "2. 🔄 Re-run this validation script"
            echo "3. 📋 Review detailed error messages in individual validation scripts"
            echo "4. 📚 Consult troubleshooting documentation"
        else
            echo "1. 🚀 Deploy to production environment"
            echo "2. 📊 Set up monitoring and alerting"
            echo "3. 🧪 Perform integration testing"
            echo "4. 📈 Monitor performance metrics"
        fi
        
        if [ $TOTAL_WARNINGS -gt 0 ]; then
            echo "5. ⚡ Optimize configuration to address warnings"
        fi
        
        echo ""
        echo "Documentation:"
        echo "- DEPLOYMENT.md - Comprehensive deployment guide"
        echo "- docs/MONITORING_AND_ALERTING.md - Monitoring setup"
        echo "- docs/PERFORMANCE_TUNING_GUIDE.md - Performance optimization"
        echo "- docs/CODEX_CLI_TROUBLESHOOTING.md - Codex CLI issues"
        echo ""
        
        echo "Validation Scripts:"
        echo "- ./scripts/validate-codex-installation.sh --verbose"
        echo "- ./scripts/validate-environment.sh --verbose"
        echo "- ./scripts/deployment-health-check.sh --type $DEPLOYMENT_TYPE --verbose"
        echo "- node scripts/validate-config.js"
        echo ""
        
        if [ $TOTAL_ERRORS -eq 0 ]; then
            echo "🎯 Ready for production deployment!"
        else
            echo "🔧 Please resolve issues before production deployment."
        fi
    fi
}

# Cleanup temporary files
cleanup() {
    rm -f /tmp/codex-validation.json
    rm -f /tmp/env-validation.json
    rm -f /tmp/config-validation.json
    rm -f /tmp/health-check.json
}

# Main validation function
main() {
    parse_args "$@"
    
    # Set trap for cleanup
    trap cleanup EXIT
    
    if [ "$JSON_OUTPUT" = false ]; then
        echo "🔍 Production Readiness Validation for GansAuditor_Codex"
        echo "========================================================="
        echo ""
        echo "Deployment Type: $DEPLOYMENT_TYPE"
        echo "Validation Mode: $([ "$VERBOSE" = true ] && echo "Verbose" || echo "Standard")"
        echo ""
    fi
    
    json_start
    
    # Run all validation checks
    validate_codex_cli
    validate_environment
    validate_configuration
    validate_deployment_health
    
    json_end
    
    # Generate readiness report
    generate_readiness_report
    
    # Exit with appropriate code
    if [ $TOTAL_ERRORS -gt 0 ]; then
        exit 1
    elif [ $TOTAL_WARNINGS -gt 0 ]; then
        exit 2
    else
        exit 0
    fi
}

# Run main function with all arguments
main "$@"