#!/bin/bash

# Environment Validation Script for GansAuditor_Codex
# This script validates the deployment environment and system requirements

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
VERBOSE=false
JSON_OUTPUT=false
CHECK_DOCKER=false
CHECK_PRODUCTION=false

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
            --docker)
                CHECK_DOCKER=true
                shift
                ;;
            --production)
                CHECK_PRODUCTION=true
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
Environment Validation Script for GansAuditor_Codex

Usage: $0 [OPTIONS]

OPTIONS:
    --verbose, -v       Enable verbose output
    --json              Output results in JSON format
    --docker            Include Docker environment checks
    --production        Include production-specific checks
    --help, -h          Show this help message

DESCRIPTION:
    This script validates the deployment environment for GansAuditor_Codex,
    checking system requirements, dependencies, and configuration.
    
    Validation includes:
    - Node.js version and configuration
    - System resources (memory, disk, CPU)
    - Network connectivity
    - File system permissions
    - Environment variables
    - Optional: Docker environment
    - Optional: Production readiness

EXAMPLES:
    $0                          # Basic environment validation
    $0 --verbose                # Detailed validation output
    $0 --docker                 # Include Docker checks
    $0 --production             # Production readiness check
    $0 --json                   # JSON output for automation

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
        echo "  \"environment\": \"$(uname -s)\","
        echo "  \"hostname\": \"$(hostname)\","
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

# System information gathering
get_system_info() {
    if [ "$VERBOSE" = true ] && [ "$JSON_OUTPUT" = false ]; then
        log_info "System Information:"
        echo "  OS: $(uname -s) $(uname -r)"
        echo "  Architecture: $(uname -m)"
        echo "  Hostname: $(hostname)"
        echo "  User: $(whoami)"
        echo "  Shell: $SHELL"
        echo "  PWD: $(pwd)"
        echo ""
    fi
}

# Node.js validation
validate_nodejs() {
    if [ "$JSON_OUTPUT" = false ]; then
        log_info "Validating Node.js environment..."
    fi
    
    json_section "nodejs"
    
    # Check Node.js availability
    if command -v node >/dev/null 2>&1; then
        local node_version=$(node --version)
        local node_major=$(echo "$node_version" | cut -d'v' -f2 | cut -d'.' -f1)
        
        if [ "$JSON_OUTPUT" = false ]; then
            log_success "Node.js found: $node_version"
        fi
        json_result "availability" "pass" "Node.js found: $node_version" "{\"version\": \"$node_version\"}"
        
        # Check version requirement (18+)
        if [ "$node_major" -ge 18 ]; then
            if [ "$JSON_OUTPUT" = false ]; then
                log_success "Node.js version meets requirements (18+)"
            fi
            json_result "version_check" "pass" "Node.js version meets requirements"
        else
            if [ "$JSON_OUTPUT" = false ]; then
                log_critical "Node.js version $node_version is too old (requires 18+)"
            fi
            json_result "version_check" "fail" "Node.js version too old" "{\"required\": \"18+\", \"current\": \"$node_major\"}"
            VALIDATION_ERRORS=$((VALIDATION_ERRORS + 1))
        fi
        
        # Check Node.js configuration
        if [ "$VERBOSE" = true ] && [ "$JSON_OUTPUT" = false ]; then
            log_info "Node.js configuration:"
            echo "  Executable: $(which node)"
            echo "  Version: $node_version"
            echo "  V8 Version: $(node -e "console.log(process.versions.v8)")"
            echo "  Platform: $(node -e "console.log(process.platform)")"
            echo "  Architecture: $(node -e "console.log(process.arch)")"
        fi
        
    else
        if [ "$JSON_OUTPUT" = false ]; then
            log_critical "Node.js not found"
            log_error "Please install Node.js 18+ before proceeding"
        fi
        json_result "availability" "fail" "Node.js not found"
        VALIDATION_ERRORS=$((VALIDATION_ERRORS + 1))
    fi
    
    # Check npm availability
    if command -v npm >/dev/null 2>&1; then
        local npm_version=$(npm --version)
        if [ "$JSON_OUTPUT" = false ]; then
            log_success "npm found: $npm_version"
        fi
        json_result "npm_availability" "pass" "npm found: $npm_version" "{\"version\": \"$npm_version\"}"
    else
        if [ "$JSON_OUTPUT" = false ]; then
            log_error "npm not found"
        fi
        json_result "npm_availability" "fail" "npm not found"
        VALIDATION_ERRORS=$((VALIDATION_ERRORS + 1))
    fi
    
    json_section_end
}

# System resources validation
validate_system_resources() {
    if [ "$JSON_OUTPUT" = false ]; then
        log_info "Validating system resources..."
    fi
    
    json_section "system_resources"
    
    # Memory check
    if command -v free >/dev/null 2>&1; then
        local total_mem_kb=$(free | grep '^Mem:' | awk '{print $2}')
        local total_mem_gb=$((total_mem_kb / 1024 / 1024))
        local available_mem_kb=$(free | grep '^Mem:' | awk '{print $7}')
        local available_mem_gb=$((available_mem_kb / 1024 / 1024))
        
        if [ "$JSON_OUTPUT" = false ]; then
            log_info "Memory: ${available_mem_gb}GB available / ${total_mem_gb}GB total"
        fi
        
        if [ $total_mem_gb -ge 2 ]; then
            json_result "memory_total" "pass" "Sufficient total memory: ${total_mem_gb}GB" "{\"total_gb\": $total_mem_gb, \"available_gb\": $available_mem_gb}"
        elif [ $total_mem_gb -ge 1 ]; then
            if [ "$JSON_OUTPUT" = false ]; then
                log_warning "Low total memory: ${total_mem_gb}GB (recommended: 2GB+)"
            fi
            json_result "memory_total" "warning" "Low total memory: ${total_mem_gb}GB" "{\"total_gb\": $total_mem_gb, \"recommended_gb\": 2}"
            VALIDATION_WARNINGS=$((VALIDATION_WARNINGS + 1))
        else
            if [ "$JSON_OUTPUT" = false ]; then
                log_error "Insufficient memory: ${total_mem_gb}GB (minimum: 1GB)"
            fi
            json_result "memory_total" "fail" "Insufficient memory: ${total_mem_gb}GB" "{\"total_gb\": $total_mem_gb, \"minimum_gb\": 1}"
            VALIDATION_ERRORS=$((VALIDATION_ERRORS + 1))
        fi
        
        if [ $available_mem_gb -lt 1 ]; then
            if [ "$JSON_OUTPUT" = false ]; then
                log_warning "Low available memory: ${available_mem_gb}GB"
            fi
            json_result "memory_available" "warning" "Low available memory: ${available_mem_gb}GB"
            VALIDATION_WARNINGS=$((VALIDATION_WARNINGS + 1))
        fi
        
    else
        if [ "$JSON_OUTPUT" = false ]; then
            log_warning "Cannot check memory (free command not available)"
        fi
        json_result "memory_check" "warning" "Cannot check memory"
        VALIDATION_WARNINGS=$((VALIDATION_WARNINGS + 1))
    fi
    
    # CPU check
    local cpu_cores
    if command -v nproc >/dev/null 2>&1; then
        cpu_cores=$(nproc)
    elif [ -f /proc/cpuinfo ]; then
        cpu_cores=$(grep -c ^processor /proc/cpuinfo)
    else
        cpu_cores="unknown"
    fi
    
    if [ "$cpu_cores" != "unknown" ]; then
        if [ "$JSON_OUTPUT" = false ]; then
            log_info "CPU cores: $cpu_cores"
        fi
        
        if [ $cpu_cores -ge 2 ]; then
            json_result "cpu_cores" "pass" "Sufficient CPU cores: $cpu_cores" "{\"cores\": $cpu_cores}"
        else
            if [ "$JSON_OUTPUT" = false ]; then
                log_warning "Single CPU core detected (recommended: 2+)"
            fi
            json_result "cpu_cores" "warning" "Single CPU core detected" "{\"cores\": $cpu_cores, \"recommended\": 2}"
            VALIDATION_WARNINGS=$((VALIDATION_WARNINGS + 1))
        fi
    else
        if [ "$JSON_OUTPUT" = false ]; then
            log_warning "Cannot determine CPU core count"
        fi
        json_result "cpu_cores" "warning" "Cannot determine CPU core count"
        VALIDATION_WARNINGS=$((VALIDATION_WARNINGS + 1))
    fi
    
    # Disk space check
    local disk_available_gb
    if command -v df >/dev/null 2>&1; then
        disk_available_gb=$(df . | tail -1 | awk '{print int($4/1024/1024)}')
        
        if [ "$JSON_OUTPUT" = false ]; then
            log_info "Disk space available: ${disk_available_gb}GB"
        fi
        
        if [ $disk_available_gb -ge 5 ]; then
            json_result "disk_space" "pass" "Sufficient disk space: ${disk_available_gb}GB" "{\"available_gb\": $disk_available_gb}"
        elif [ $disk_available_gb -ge 1 ]; then
            if [ "$JSON_OUTPUT" = false ]; then
                log_warning "Low disk space: ${disk_available_gb}GB (recommended: 5GB+)"
            fi
            json_result "disk_space" "warning" "Low disk space: ${disk_available_gb}GB" "{\"available_gb\": $disk_available_gb, \"recommended_gb\": 5}"
            VALIDATION_WARNINGS=$((VALIDATION_WARNINGS + 1))
        else
            if [ "$JSON_OUTPUT" = false ]; then
                log_error "Insufficient disk space: ${disk_available_gb}GB (minimum: 1GB)"
            fi
            json_result "disk_space" "fail" "Insufficient disk space: ${disk_available_gb}GB" "{\"available_gb\": $disk_available_gb, \"minimum_gb\": 1}"
            VALIDATION_ERRORS=$((VALIDATION_ERRORS + 1))
        fi
    else
        if [ "$JSON_OUTPUT" = false ]; then
            log_warning "Cannot check disk space"
        fi
        json_result "disk_space" "warning" "Cannot check disk space"
        VALIDATION_WARNINGS=$((VALIDATION_WARNINGS + 1))
    fi
    
    json_section_end
}

# File system permissions validation
validate_filesystem_permissions() {
    if [ "$JSON_OUTPUT" = false ]; then
        log_info "Validating file system permissions..."
    fi
    
    json_section "filesystem_permissions"
    
    # Check current directory permissions
    if [ -w "." ]; then
        if [ "$JSON_OUTPUT" = false ]; then
            log_success "Current directory is writable"
        fi
        json_result "current_directory" "pass" "Current directory is writable"
    else
        if [ "$JSON_OUTPUT" = false ]; then
            log_error "Current directory is not writable"
        fi
        json_result "current_directory" "fail" "Current directory is not writable"
        VALIDATION_ERRORS=$((VALIDATION_ERRORS + 1))
    fi
    
    # Check if we can create directories
    local test_dir=".test-permissions-$$"
    if mkdir "$test_dir" 2>/dev/null; then
        rmdir "$test_dir"
        if [ "$JSON_OUTPUT" = false ]; then
            log_success "Can create directories"
        fi
        json_result "directory_creation" "pass" "Can create directories"
    else
        if [ "$JSON_OUTPUT" = false ]; then
            log_error "Cannot create directories"
        fi
        json_result "directory_creation" "fail" "Cannot create directories"
        VALIDATION_ERRORS=$((VALIDATION_ERRORS + 1))
    fi
    
    # Check if we can create files
    local test_file=".test-file-$$"
    if touch "$test_file" 2>/dev/null; then
        rm "$test_file"
        if [ "$JSON_OUTPUT" = false ]; then
            log_success "Can create files"
        fi
        json_result "file_creation" "pass" "Can create files"
    else
        if [ "$JSON_OUTPUT" = false ]; then
            log_error "Cannot create files"
        fi
        json_result "file_creation" "fail" "Cannot create files"
        VALIDATION_ERRORS=$((VALIDATION_ERRORS + 1))
    fi
    
    # Check home directory access
    if [ -w "$HOME" ]; then
        if [ "$JSON_OUTPUT" = false ]; then
            log_success "Home directory is accessible"
        fi
        json_result "home_directory" "pass" "Home directory is accessible"
    else
        if [ "$JSON_OUTPUT" = false ]; then
            log_warning "Home directory is not writable"
        fi
        json_result "home_directory" "warning" "Home directory is not writable"
        VALIDATION_WARNINGS=$((VALIDATION_WARNINGS + 1))
    fi
    
    json_section_end
}

# Network connectivity validation
validate_network_connectivity() {
    if [ "$JSON_OUTPUT" = false ]; then
        log_info "Validating network connectivity..."
    fi
    
    json_section "network_connectivity"
    
    # Test basic internet connectivity
    if command -v ping >/dev/null 2>&1; then
        if ping -c 1 8.8.8.8 >/dev/null 2>&1; then
            if [ "$JSON_OUTPUT" = false ]; then
                log_success "Internet connectivity available"
            fi
            json_result "internet_connectivity" "pass" "Internet connectivity available"
        else
            if [ "$JSON_OUTPUT" = false ]; then
                log_warning "No internet connectivity (may be normal in some environments)"
            fi
            json_result "internet_connectivity" "warning" "No internet connectivity"
            VALIDATION_WARNINGS=$((VALIDATION_WARNINGS + 1))
        fi
    else
        if [ "$JSON_OUTPUT" = false ]; then
            log_warning "Cannot test internet connectivity (ping not available)"
        fi
        json_result "internet_connectivity" "warning" "Cannot test internet connectivity"
        VALIDATION_WARNINGS=$((VALIDATION_WARNINGS + 1))
    fi
    
    # Test DNS resolution
    if command -v nslookup >/dev/null 2>&1; then
        if nslookup google.com >/dev/null 2>&1; then
            if [ "$JSON_OUTPUT" = false ]; then
                log_success "DNS resolution working"
            fi
            json_result "dns_resolution" "pass" "DNS resolution working"
        else
            if [ "$JSON_OUTPUT" = false ]; then
                log_warning "DNS resolution issues"
            fi
            json_result "dns_resolution" "warning" "DNS resolution issues"
            VALIDATION_WARNINGS=$((VALIDATION_WARNINGS + 1))
        fi
    elif command -v dig >/dev/null 2>&1; then
        if dig google.com >/dev/null 2>&1; then
            if [ "$JSON_OUTPUT" = false ]; then
                log_success "DNS resolution working"
            fi
            json_result "dns_resolution" "pass" "DNS resolution working"
        else
            if [ "$JSON_OUTPUT" = false ]; then
                log_warning "DNS resolution issues"
            fi
            json_result "dns_resolution" "warning" "DNS resolution issues"
            VALIDATION_WARNINGS=$((VALIDATION_WARNINGS + 1))
        fi
    else
        if [ "$JSON_OUTPUT" = false ]; then
            log_info "Cannot test DNS resolution (tools not available)"
        fi
        json_result "dns_resolution" "info" "Cannot test DNS resolution"
    fi
    
    json_section_end
}

# Environment variables validation
validate_environment_variables() {
    if [ "$JSON_OUTPUT" = false ]; then
        log_info "Validating environment variables..."
    fi
    
    json_section "environment_variables"
    
    # Check PATH
    if [ -n "$PATH" ]; then
        if [ "$JSON_OUTPUT" = false ]; then
            log_success "PATH is set"
        fi
        json_result "path_variable" "pass" "PATH is set"
        
        if [ "$VERBOSE" = true ] && [ "$JSON_OUTPUT" = false ]; then
            echo "  PATH: $PATH"
        fi
    else
        if [ "$JSON_OUTPUT" = false ]; then
            log_error "PATH is not set"
        fi
        json_result "path_variable" "fail" "PATH is not set"
        VALIDATION_ERRORS=$((VALIDATION_ERRORS + 1))
    fi
    
    # Check HOME
    if [ -n "$HOME" ]; then
        if [ "$JSON_OUTPUT" = false ]; then
            log_success "HOME is set: $HOME"
        fi
        json_result "home_variable" "pass" "HOME is set" "{\"value\": \"$HOME\"}"
    else
        if [ "$JSON_OUTPUT" = false ]; then
            log_warning "HOME is not set"
        fi
        json_result "home_variable" "warning" "HOME is not set"
        VALIDATION_WARNINGS=$((VALIDATION_WARNINGS + 1))
    fi
    
    # Check for Node.js specific variables
    local node_env_vars=("NODE_ENV" "NODE_OPTIONS" "NPM_CONFIG_PREFIX")
    local node_env_found=0
    
    for var in "${node_env_vars[@]}"; do
        if [ -n "${!var}" ]; then
            node_env_found=$((node_env_found + 1))
            if [ "$VERBOSE" = true ] && [ "$JSON_OUTPUT" = false ]; then
                log_info "$var is set: ${!var}"
            fi
        fi
    done
    
    if [ $node_env_found -gt 0 ]; then
        json_result "nodejs_environment" "info" "$node_env_found Node.js environment variables found"
    else
        json_result "nodejs_environment" "info" "No Node.js environment variables found"
    fi
    
    json_section_end
}

# Docker environment validation (optional)
validate_docker_environment() {
    if [ "$CHECK_DOCKER" = false ]; then
        return 0
    fi
    
    if [ "$JSON_OUTPUT" = false ]; then
        log_info "Validating Docker environment..."
    fi
    
    json_section "docker_environment"
    
    # Check Docker availability
    if command -v docker >/dev/null 2>&1; then
        local docker_version=$(docker --version)
        if [ "$JSON_OUTPUT" = false ]; then
            log_success "Docker found: $docker_version"
        fi
        json_result "docker_availability" "pass" "Docker found: $docker_version"
        
        # Check Docker daemon
        if docker info >/dev/null 2>&1; then
            if [ "$JSON_OUTPUT" = false ]; then
                log_success "Docker daemon is running"
            fi
            json_result "docker_daemon" "pass" "Docker daemon is running"
        else
            if [ "$JSON_OUTPUT" = false ]; then
                log_error "Docker daemon is not running"
            fi
            json_result "docker_daemon" "fail" "Docker daemon is not running"
            VALIDATION_ERRORS=$((VALIDATION_ERRORS + 1))
        fi
        
        # Check Docker permissions
        if docker ps >/dev/null 2>&1; then
            if [ "$JSON_OUTPUT" = false ]; then
                log_success "Docker permissions are correct"
            fi
            json_result "docker_permissions" "pass" "Docker permissions are correct"
        else
            if [ "$JSON_OUTPUT" = false ]; then
                log_warning "Docker permission issues (may need sudo or user group)"
            fi
            json_result "docker_permissions" "warning" "Docker permission issues"
            VALIDATION_WARNINGS=$((VALIDATION_WARNINGS + 1))
        fi
        
    else
        if [ "$JSON_OUTPUT" = false ]; then
            log_error "Docker not found"
        fi
        json_result "docker_availability" "fail" "Docker not found"
        VALIDATION_ERRORS=$((VALIDATION_ERRORS + 1))
    fi
    
    # Check Docker Compose
    if command -v docker-compose >/dev/null 2>&1; then
        local compose_version=$(docker-compose --version)
        if [ "$JSON_OUTPUT" = false ]; then
            log_success "Docker Compose found: $compose_version"
        fi
        json_result "docker_compose" "pass" "Docker Compose found: $compose_version"
    else
        if [ "$JSON_OUTPUT" = false ]; then
            log_warning "Docker Compose not found (optional)"
        fi
        json_result "docker_compose" "warning" "Docker Compose not found"
        VALIDATION_WARNINGS=$((VALIDATION_WARNINGS + 1))
    fi
    
    json_section_end
}

# Production readiness validation (optional)
validate_production_readiness() {
    if [ "$CHECK_PRODUCTION" = false ]; then
        return 0
    fi
    
    if [ "$JSON_OUTPUT" = false ]; then
        log_info "Validating production readiness..."
    fi
    
    json_section "production_readiness"
    
    # Check if running as root (not recommended)
    if [ "$(id -u)" -eq 0 ]; then
        if [ "$JSON_OUTPUT" = false ]; then
            log_warning "Running as root (not recommended for production)"
        fi
        json_result "root_user" "warning" "Running as root"
        VALIDATION_WARNINGS=$((VALIDATION_WARNINGS + 1))
    else
        if [ "$JSON_OUTPUT" = false ]; then
            log_success "Not running as root"
        fi
        json_result "root_user" "pass" "Not running as root"
    fi
    
    # Check system limits
    if command -v ulimit >/dev/null 2>&1; then
        local max_files=$(ulimit -n)
        local max_processes=$(ulimit -u)
        
        if [ "$max_files" -ge 1024 ]; then
            if [ "$JSON_OUTPUT" = false ]; then
                log_success "File descriptor limit: $max_files"
            fi
            json_result "file_descriptors" "pass" "Sufficient file descriptor limit: $max_files"
        else
            if [ "$JSON_OUTPUT" = false ]; then
                log_warning "Low file descriptor limit: $max_files (recommended: 1024+)"
            fi
            json_result "file_descriptors" "warning" "Low file descriptor limit: $max_files"
            VALIDATION_WARNINGS=$((VALIDATION_WARNINGS + 1))
        fi
        
        if [ "$max_processes" -ge 1024 ]; then
            if [ "$JSON_OUTPUT" = false ]; then
                log_success "Process limit: $max_processes"
            fi
            json_result "process_limit" "pass" "Sufficient process limit: $max_processes"
        else
            if [ "$JSON_OUTPUT" = false ]; then
                log_warning "Low process limit: $max_processes (recommended: 1024+)"
            fi
            json_result "process_limit" "warning" "Low process limit: $max_processes"
            VALIDATION_WARNINGS=$((VALIDATION_WARNINGS + 1))
        fi
    fi
    
    # Check for process manager (systemd, etc.)
    if command -v systemctl >/dev/null 2>&1; then
        if [ "$JSON_OUTPUT" = false ]; then
            log_success "systemd available for process management"
        fi
        json_result "process_manager" "pass" "systemd available"
    elif command -v service >/dev/null 2>&1; then
        if [ "$JSON_OUTPUT" = false ]; then
            log_success "service command available for process management"
        fi
        json_result "process_manager" "pass" "service command available"
    else
        if [ "$JSON_OUTPUT" = false ]; then
            log_warning "No process manager detected"
        fi
        json_result "process_manager" "warning" "No process manager detected"
        VALIDATION_WARNINGS=$((VALIDATION_WARNINGS + 1))
    fi
    
    # Check for monitoring tools
    local monitoring_tools=("htop" "top" "ps" "netstat" "ss")
    local monitoring_found=0
    
    for tool in "${monitoring_tools[@]}"; do
        if command -v "$tool" >/dev/null 2>&1; then
            monitoring_found=$((monitoring_found + 1))
        fi
    done
    
    if [ $monitoring_found -ge 3 ]; then
        if [ "$JSON_OUTPUT" = false ]; then
            log_success "Monitoring tools available ($monitoring_found/5)"
        fi
        json_result "monitoring_tools" "pass" "Monitoring tools available" "{\"available\": $monitoring_found, \"total\": 5}"
    else
        if [ "$JSON_OUTPUT" = false ]; then
            log_warning "Limited monitoring tools ($monitoring_found/5)"
        fi
        json_result "monitoring_tools" "warning" "Limited monitoring tools" "{\"available\": $monitoring_found, \"total\": 5}"
        VALIDATION_WARNINGS=$((VALIDATION_WARNINGS + 1))
    fi
    
    json_section_end
}

# Generate recommendations
generate_recommendations() {
    if [ "$JSON_OUTPUT" = false ]; then
        echo ""
        log_info "Environment Validation Summary"
        echo "=============================="
        echo ""
        
        if [ $VALIDATION_ERRORS -eq 0 ] && [ $VALIDATION_WARNINGS -eq 0 ]; then
            log_success "✅ Environment is ready for GansAuditor_Codex deployment"
        elif [ $VALIDATION_ERRORS -eq 0 ]; then
            log_warning "⚠️  Environment is functional but has $VALIDATION_WARNINGS warnings"
            log_info "Consider addressing warnings for optimal performance"
        else
            log_error "❌ Environment has $VALIDATION_ERRORS critical issues"
            log_error "These must be resolved before deployment"
        fi
        
        echo ""
        echo "Next Steps:"
        if [ $VALIDATION_ERRORS -gt 0 ]; then
            echo "1. Address critical issues listed above"
            echo "2. Re-run this validation script"
            echo "3. Validate Codex CLI installation: ./scripts/validate-codex-installation.sh"
            echo "4. Proceed with deployment: ./deploy.sh"
        else
            echo "1. Validate Codex CLI installation: ./scripts/validate-codex-installation.sh"
            echo "2. Proceed with deployment: ./deploy.sh [local|docker|npm]"
            echo "3. Verify deployment: ./verify-deployment.sh"
        fi
        
        if [ $VALIDATION_WARNINGS -gt 0 ]; then
            echo "4. Consider optimizing environment for better performance"
        fi
        
        echo ""
        echo "For more help:"
        echo "- See DEPLOYMENT.md for detailed deployment instructions"
        echo "- Run with --verbose for detailed output"
        echo "- Use --production for production-specific checks"
        echo "- Use --docker for Docker environment validation"
    fi
}

# Main validation function
main() {
    parse_args "$@"
    
    if [ "$JSON_OUTPUT" = false ]; then
        echo "🔍 Environment Validation for GansAuditor_Codex"
        echo "==============================================="
        echo ""
    fi
    
    get_system_info
    json_start
    
    # Run all validation checks
    validate_nodejs
    validate_system_resources
    validate_filesystem_permissions
    validate_network_connectivity
    validate_environment_variables
    validate_docker_environment
    validate_production_readiness
    
    json_end
    
    # Generate recommendations
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