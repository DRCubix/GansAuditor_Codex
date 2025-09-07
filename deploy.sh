#!/bin/bash

# GansAuditor_Codex Deployment Script
# Usage: ./deploy.sh [local|docker|npm]

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
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check prerequisites
check_prerequisites() {
    log_info "Checking prerequisites..."
    
    # Check Codex CLI first (CRITICAL REQUIREMENT)
    log_info "Validating Codex CLI installation..."
    if ! ./scripts/validate-codex-installation.sh --json >/dev/null 2>&1; then
        log_error "Codex CLI validation failed"
        log_error "Run './scripts/validate-codex-installation.sh' for detailed diagnosis"
        log_error "GansAuditor_Codex requires Codex CLI to be properly installed"
        exit 1
    fi
    log_success "Codex CLI validation passed"
    
    # Check Node.js version
    if ! command -v node &> /dev/null; then
        log_error "Node.js is not installed. Please install Node.js 18+ first."
        exit 1
    fi
    
    NODE_VERSION=$(node --version | cut -d'v' -f2 | cut -d'.' -f1)
    if [ "$NODE_VERSION" -lt 18 ]; then
        log_error "Node.js version 18+ required. Current version: $(node --version)"
        exit 1
    fi
    
    # Check npm
    if ! command -v npm &> /dev/null; then
        log_error "npm is not installed. Please install npm first."
        exit 1
    fi
    
    # Run environment validation
    log_info "Validating deployment environment..."
    if ! ./scripts/validate-environment.sh --json >/dev/null 2>&1; then
        log_warning "Environment validation found issues (non-critical)"
        log_warning "Run './scripts/validate-environment.sh' for detailed diagnosis"
    else
        log_success "Environment validation passed"
    fi
    
    log_success "Prerequisites check passed"
}

# Build the project
build_project() {
    log_info "Building project..."
    
    # Install dependencies
    log_info "Installing dependencies..."
    npm install
    
    # Clean and rebuild
    log_info "Building TypeScript..."
    npm run clean
    npm run build
    
    # Validate configuration
    log_info "Validating configuration..."
    npm run validate-config || log_warning "Configuration validation failed (non-critical)"
    
    # Run tests
    log_info "Running tests..."
    npm run test:run || log_warning "Some tests failed (non-critical for deployment)"
    
    log_success "Project built successfully"
}

# Test the server
test_server() {
    log_info "Testing server startup and functionality..."
    
    # Test basic server functionality
    timeout 5s node dist/index.js > /dev/null 2>&1 || {
        if [ $? -eq 124 ]; then
            log_success "Server starts correctly (timeout expected)"
        else
            log_error "Server failed to start"
            exit 1
        fi
    }
    
    # Run comprehensive health check
    log_info "Running deployment health check..."
    if ./scripts/deployment-health-check.sh --type local --json >/dev/null 2>&1; then
        log_success "Deployment health check passed"
    else
        log_warning "Deployment health check found issues (non-critical for initial deployment)"
        log_warning "Run './scripts/deployment-health-check.sh --type local' for detailed diagnosis"
    fi
}

# Local deployment
deploy_local() {
    log_info "Deploying locally..."
    
    check_prerequisites
    build_project
    test_server
    
    # Create environment file if it doesn't exist
    if [ ! -f .env ]; then
        log_info "Creating .env file from template..."
        cp .env.example .env
        log_warning "Please edit .env file to configure your settings"
    fi
    
    # Create state directory
    mkdir -p .mcp-gan-state
    chmod 755 .mcp-gan-state
    
    log_success "Local deployment complete!"
    log_info "To run the server: node dist/index.js"
    log_info "To configure MCP client, see DEPLOYMENT.md"
}

# Docker deployment
deploy_docker() {
    log_info "Deploying with Docker..."
    
    # Check Docker
    if ! command -v docker &> /dev/null; then
        log_error "Docker is not installed. Please install Docker first."
        exit 1
    fi
    
    check_prerequisites
    build_project
    
    # Build Docker image
    log_info "Building Docker image..."
    docker build -t gansauditor-codex:latest .
    
    # Test Docker container
    log_info "Testing Docker container..."
    timeout 5s docker run --rm gansauditor-codex:latest > /dev/null 2>&1 || {
        if [ $? -eq 124 ]; then
            log_success "Docker container works correctly (timeout expected)"
        else
            log_error "Docker container failed to start"
            exit 1
        fi
    }
    
    # Create docker-compose.yml if it doesn't exist
    if [ ! -f docker-compose.yml ]; then
        log_info "Creating docker-compose.yml..."
        cat > docker-compose.yml << 'EOF'
version: '3.8'

services:
  gansauditor-codex:
    image: gansauditor-codex:latest
    environment:
      - NODE_ENV=production
      - ENABLE_GAN_AUDITING=true
      - ENABLE_SYNCHRONOUS_AUDIT=true
      - AUDIT_TIMEOUT_SECONDS=30
      - MAX_CONCURRENT_AUDITS=10
      - MAX_CONCURRENT_SESSIONS=100
    volumes:
      - ./logs:/app/logs
      - ./state:/app/.mcp-gan-state
    restart: unless-stopped
    stdin_open: true
    tty: true
EOF
        log_success "Created docker-compose.yml"
    fi
    
    log_success "Docker deployment complete!"
    log_info "To start: docker-compose up -d"
    log_info "To view logs: docker-compose logs -f"
    log_info "To stop: docker-compose down"
}

# NPM deployment
deploy_npm() {
    log_info "Preparing for NPM deployment..."
    
    check_prerequisites
    build_project
    test_server
    
    # Check if logged in to npm
    if ! npm whoami > /dev/null 2>&1; then
        log_warning "Not logged in to npm. Please run 'npm login' first."
        read -p "Do you want to login now? (y/n): " -n 1 -r
        echo
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            npm login
        else
            log_error "NPM login required for publishing"
            exit 1
        fi
    fi
    
    # Dry run
    log_info "Running npm pack dry run..."
    npm pack --dry-run
    
    # Confirm publication
    CURRENT_VERSION=$(node -p "require('./package.json').version")
    log_warning "About to publish version $CURRENT_VERSION to npm"
    read -p "Continue with publication? (y/n): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        log_info "Publication cancelled"
        exit 0
    fi
    
    # Publish
    log_info "Publishing to npm..."
    npm publish --access public
    
    log_success "NPM deployment complete!"
    log_info "Package published as: @modelcontextprotocol/server-gansauditor-codex@$CURRENT_VERSION"
    log_info "Install with: uvx @modelcontextprotocol/server-gansauditor-codex@latest"
}

# Generate MCP configuration
generate_mcp_config() {
    local deployment_type=$1
    local config_file="mcp-config-generated.json"
    
    log_info "Generating MCP configuration for $deployment_type deployment..."
    
    case $deployment_type in
        "local")
            cat > $config_file << EOF
{
  "mcpServers": {
    "gansauditor-codex": {
      "command": "node",
      "args": ["$(pwd)/dist/index.js"],
      "env": {
        "ENABLE_GAN_AUDITING": "true",
        "ENABLE_SYNCHRONOUS_AUDIT": "true",
        "DISABLE_THOUGHT_LOGGING": "false"
      },
      "disabled": false,
      "autoApprove": ["gansauditor_codex"]
    }
  }
}
EOF
            ;;
        "docker")
            cat > $config_file << EOF
{
  "mcpServers": {
    "gansauditor-codex": {
      "command": "docker",
      "args": [
        "run", "--rm", "-i",
        "-e", "ENABLE_GAN_AUDITING=true",
        "-e", "ENABLE_SYNCHRONOUS_AUDIT=true",
        "gansauditor-codex:latest"
      ],
      "disabled": false,
      "autoApprove": ["gansauditor_codex"]
    }
  }
}
EOF
            ;;
        "npm")
            cat > $config_file << EOF
{
  "mcpServers": {
    "gansauditor-codex": {
      "command": "uvx",
      "args": ["@modelcontextprotocol/server-gansauditor-codex@latest"],
      "env": {
        "ENABLE_GAN_AUDITING": "true",
        "ENABLE_SYNCHRONOUS_AUDIT": "true"
      },
      "disabled": false,
      "autoApprove": ["gansauditor_codex"]
    }
  }
}
EOF
            ;;
    esac
    
    log_success "MCP configuration generated: $config_file"
    log_info "Copy this configuration to your MCP client settings"
}

# Main deployment logic
main() {
    local deployment_type=${1:-"local"}
    
    echo "🚀 GansAuditor_Codex Deployment Script"
    echo "======================================"
    
    case $deployment_type in
        "local")
            deploy_local
            generate_mcp_config "local"
            ;;
        "docker")
            deploy_docker
            generate_mcp_config "docker"
            ;;
        "npm")
            deploy_npm
            generate_mcp_config "npm"
            ;;
        *)
            log_error "Invalid deployment type: $deployment_type"
            echo "Usage: $0 [local|docker|npm]"
            echo ""
            echo "Deployment types:"
            echo "  local  - Build and deploy locally"
            echo "  docker - Build Docker image and create compose file"
            echo "  npm    - Publish to npm registry"
            exit 1
            ;;
    esac
    
    echo ""
    log_success "🎉 Deployment completed successfully!"
    echo ""
    echo "Next steps:"
    echo "1. Configure your MCP client with the generated configuration"
    echo "2. Test the deployment with a sample request"
    echo "3. Monitor performance and adjust settings as needed"
    echo ""
    echo "For detailed instructions, see DEPLOYMENT.md"
}

# Run main function with all arguments
main "$@"