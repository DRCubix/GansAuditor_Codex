# GansAuditor_Codex Deployment Guide

This guide provides comprehensive instructions for deploying GansAuditor_Codex in various environments.

## Prerequisites

**CRITICAL REQUIREMENT**: Codex CLI must be installed and properly configured on all deployment targets.

### Required Software
- **Codex CLI**: Must be installed and available in PATH
- Node.js 18+ installed
- npm or yarn package manager
- Docker (for containerized deployment)
- Git (for source deployment)

### Codex CLI Installation Verification

Before proceeding with any deployment, verify Codex CLI is properly installed:

```bash
# Check Codex CLI is available
codex --version
# Should display version information

# Test basic execution
codex exec "console.log('Deployment test')"
# Should execute successfully

# Verify PATH configuration
which codex
# Should show the path to codex executable
```

**If Codex CLI is not available, the deployment will fail immediately with clear error messages.**

## Deployment Options

### 1. Local Development Deployment

#### Quick Setup
```bash
# Verify Codex CLI first (REQUIRED)
codex --version
# Must succeed before proceeding

# Clone and build
git clone <your-repository-url>
cd GansAuditor_Codex
npm install

# Validate Codex CLI integration
npm run validate:codex

# Build the server
npm run build

# Test the server (will fail if Codex CLI not available)
node dist/index.js
# Should show: "GansAuditor_Codex MCP Server running on stdio"
```

#### Environment Configuration
```bash
# Copy environment template
cp .env.example .env

# Edit configuration
nano .env
```

**Essential Environment Variables:**
```bash
# Core functionality
ENABLE_GAN_AUDITING=true
ENABLE_SYNCHRONOUS_AUDIT=true
DISABLE_THOUGHT_LOGGING=false

# Performance settings
AUDIT_TIMEOUT_SECONDS=30
MAX_CONCURRENT_AUDITS=5
MAX_CONCURRENT_SESSIONS=50

# Completion criteria
SYNC_AUDIT_TIER1_SCORE=95
SYNC_AUDIT_TIER2_SCORE=90
SYNC_AUDIT_TIER3_SCORE=85
SYNC_AUDIT_HARD_STOP_LOOPS=25

# Safety features
ENABLE_STAGNATION_DETECTION=true
ENABLE_AUDIT_CACHING=true
```

### 2. Production Deployment

#### Build for Production
```bash
# Validate Codex CLI availability (CRITICAL)
codex --version
npm run validate:codex

# Clean build
npm run clean
npm run rebuild

# Validate configuration
npm run validate-config

# Run production tests (requires Codex CLI)
npm run test:production

# Verify build and Codex integration
node dist/index.js --version
```

#### Production Environment Setup
```bash
# Use production configuration
cp config/production.env .env

# Set production-specific variables
export NODE_ENV=production
export ENABLE_GAN_AUDITING=true
export ENABLE_SYNCHRONOUS_AUDIT=true
export AUDIT_TIMEOUT_SECONDS=30
export MAX_CONCURRENT_AUDITS=10
export MAX_CONCURRENT_SESSIONS=100
```

### 3. Docker Deployment

#### Build Docker Image
```bash
# Build the image
docker build -t gansauditor-codex:latest .

# Test the container
docker run --rm -i gansauditor-codex:latest
```

#### Docker Compose Setup
Create `docker-compose.yml`:
```yaml
version: '3.8'

services:
  gansauditor-codex:
    build: .
    image: gansauditor-codex:latest
    environment:
      - NODE_ENV=production
      - ENABLE_GAN_AUDITING=true
      - ENABLE_SYNCHRONOUS_AUDIT=true
      - AUDIT_TIMEOUT_SECONDS=30
      - MAX_CONCURRENT_AUDITS=10
      - MAX_CONCURRENT_SESSIONS=100
      - ENABLE_STAGNATION_DETECTION=true
      - ENABLE_AUDIT_CACHING=true
    volumes:
      - ./logs:/app/logs
      - ./state:/app/.mcp-gan-state
    restart: unless-stopped
    stdin_open: true
    tty: true
```

#### Run with Docker Compose
```bash
# Start the service
docker-compose up -d

# Check logs
docker-compose logs -f gansauditor-codex

# Stop the service
docker-compose down
```

### 4. NPM Package Deployment

#### Prepare for Publishing
```bash
# Update version
npm version patch  # or minor/major

# Build and test
npm run rebuild
npm run test:run

# Validate package contents
npm pack --dry-run
```

#### Publish to NPM
```bash
# Login to npm (if not already)
npm login

# Publish the package
npm publish --access public

# Verify publication
npm view @modelcontextprotocol/server-gansauditor-codex
```

#### Install from NPM
```bash
# Global installation
npm install -g @modelcontextprotocol/server-gansauditor-codex

# Run globally installed version
mcp-server-gansauditor-codex

# Or use with uvx (recommended)
uvx @modelcontextprotocol/server-gansauditor-codex@latest
```

## MCP Client Configuration

### For Kiro (.kiro/settings/mcp.json)

#### Local Development
```json
{
  "mcpServers": {
    "gansauditor-codex": {
      "command": "node",
      "args": ["/path/to/GansAuditor_Codex/dist/index.js"],
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
```

#### Production with uvx
```json
{
  "mcpServers": {
    "gansauditor-codex": {
      "command": "uvx",
      "args": ["@modelcontextprotocol/server-gansauditor-codex@latest"],
      "env": {
        "ENABLE_GAN_AUDITING": "true",
        "ENABLE_SYNCHRONOUS_AUDIT": "true",
        "AUDIT_TIMEOUT_SECONDS": "30",
        "MAX_CONCURRENT_AUDITS": "10"
      },
      "disabled": false,
      "autoApprove": ["gansauditor_codex"]
    }
  }
}
```

#### Docker Deployment
```json
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
```

### For Claude Desktop

#### macOS (~/.claude/mcp_servers.json)
```json
{
  "gansauditor-codex": {
    "command": "uvx",
    "args": ["@modelcontextprotocol/server-gansauditor-codex@latest"],
    "env": {
      "ENABLE_GAN_AUDITING": "true",
      "ENABLE_SYNCHRONOUS_AUDIT": "true"
    }
  }
}
```

#### Windows (%APPDATA%/Claude/mcp_servers.json)
```json
{
  "gansauditor-codex": {
    "command": "uvx",
    "args": ["@modelcontextprotocol/server-gansauditor-codex@latest"],
    "env": {
      "ENABLE_GAN_AUDITING": "true",
      "ENABLE_SYNCHRONOUS_AUDIT": "true"
    }
  }
}
```

## Environment-Specific Configurations

### Development Environment
```bash
# Relaxed settings for development
export ENABLE_GAN_AUDITING=true
export ENABLE_SYNCHRONOUS_AUDIT=true
export AUDIT_TIMEOUT_SECONDS=60
export MAX_CONCURRENT_AUDITS=2
export SYNC_AUDIT_TIER1_SCORE=85
export SYNC_AUDIT_TIER2_SCORE=80
export SYNC_AUDIT_TIER3_SCORE=75
export SYNC_AUDIT_FEEDBACK_DETAIL_LEVEL=verbose
export ENABLE_SYNC_AUDIT_METRICS=true
```

### Staging Environment
```bash
# Production-like settings with monitoring
export ENABLE_GAN_AUDITING=true
export ENABLE_SYNCHRONOUS_AUDIT=true
export AUDIT_TIMEOUT_SECONDS=45
export MAX_CONCURRENT_AUDITS=8
export MAX_CONCURRENT_SESSIONS=75
export SYNC_AUDIT_TIER1_SCORE=92
export SYNC_AUDIT_TIER2_SCORE=87
export SYNC_AUDIT_TIER3_SCORE=82
export ENABLE_SYNC_AUDIT_METRICS=true
export ENABLE_SYNC_AUDIT_HEALTH_CHECKS=true
```

### Production Environment
```bash
# Optimized for production workloads
export ENABLE_GAN_AUDITING=true
export ENABLE_SYNCHRONOUS_AUDIT=true
export AUDIT_TIMEOUT_SECONDS=30
export MAX_CONCURRENT_AUDITS=15
export MAX_CONCURRENT_SESSIONS=150
export SYNC_AUDIT_TIER1_SCORE=95
export SYNC_AUDIT_TIER2_SCORE=90
export SYNC_AUDIT_TIER3_SCORE=85
export ENABLE_AUDIT_CACHING=true
export ENABLE_SESSION_PERSISTENCE=true
export ENABLE_SYNC_AUDIT_METRICS=true
export ENABLE_SYNC_AUDIT_HEALTH_CHECKS=true
export SESSION_CLEANUP_INTERVAL=1800000  # 30 minutes
export MAX_SESSION_AGE=43200000  # 12 hours
```

## Monitoring and Maintenance

### Health Checks
```bash
# Configuration health check
npm run config:health-check

# System status
npm run monitoring:status

# Validate all configurations
npm run examples:validate
```

### Log Management
```bash
# View logs (if using Docker)
docker-compose logs -f gansauditor-codex

# Log rotation setup (Linux)
sudo nano /etc/logrotate.d/gansauditor-codex
```

**Logrotate configuration:**
```
/path/to/logs/*.log {
    daily
    missingok
    rotate 30
    compress
    delaycompress
    notifempty
    create 644 node node
    postrotate
        # Restart service if needed
        systemctl reload gansauditor-codex || true
    endscript
}
```

### Performance Monitoring
```bash
# Enable metrics collection
export ENABLE_SYNC_AUDIT_METRICS=true

# Generate monitoring dashboard
npm run dashboard:generate

# Monitor resource usage
top -p $(pgrep -f "gansauditor-codex")
```

### Session State Management
```bash
# Check session state directory
ls -la .mcp-gan-state/

# Clean old sessions (manual)
find .mcp-gan-state/ -name "*.json" -mtime +7 -delete

# Monitor session statistics
node -e "
const fs = require('fs');
const sessions = fs.readdirSync('.mcp-gan-state')
  .filter(f => f.endsWith('.json'))
  .map(f => JSON.parse(fs.readFileSync('.mcp-gan-state/' + f)));
console.log('Total sessions:', sessions.length);
console.log('Completed:', sessions.filter(s => s.isComplete).length);
console.log('Average loops:', sessions.reduce((sum, s) => sum + s.currentLoop, 0) / sessions.length);
"
```

## Troubleshooting

### Common Issues

#### 1. Server Won't Start
```bash
# Check Node.js version
node --version  # Should be 18+

# Verify build
npm run rebuild

# Check for missing dependencies
npm install

# Test basic functionality
node -e "console.log('Node.js working')"
```

#### 2. MCP Client Connection Issues
```bash
# Verify server responds to stdio
echo '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2024-11-05","capabilities":{},"clientInfo":{"name":"test","version":"1.0.0"}}}' | node dist/index.js

# Check file permissions
chmod +x dist/index.js

# Verify path in MCP configuration
which node
```

#### 3. Performance Issues
```bash
# Check resource usage
htop

# Reduce concurrency
export MAX_CONCURRENT_AUDITS=2
export MAX_CONCURRENT_SESSIONS=25

# Enable caching
export ENABLE_AUDIT_CACHING=true

# Increase timeout
export AUDIT_TIMEOUT_SECONDS=60
```

#### 4. Session State Issues
```bash
# Check state directory permissions
ls -la .mcp-gan-state/
chmod 755 .mcp-gan-state/

# Clear corrupted sessions
rm -rf .mcp-gan-state/*.json

# Disable persistence temporarily
export ENABLE_SESSION_PERSISTENCE=false
```

### Debug Mode
```bash
# Enable verbose logging
export DISABLE_THOUGHT_LOGGING=false
export SYNC_AUDIT_FEEDBACK_DETAIL_LEVEL=verbose

# Run with debug output
DEBUG=* node dist/index.js
```

## Security Considerations

### File Permissions
```bash
# Secure the application directory
chmod 755 /path/to/GansAuditor_Codex
chmod 644 /path/to/GansAuditor_Codex/dist/*
chmod +x /path/to/GansAuditor_Codex/dist/index.js

# Secure state directory
chmod 700 .mcp-gan-state/
```

### Environment Variables
```bash
# Use environment files instead of command line
# Never commit .env files with sensitive data
echo ".env" >> .gitignore
echo ".env.*" >> .gitignore
echo "!.env.example" >> .gitignore
```

### Network Security
- Run on localhost only for local development
- Use proper firewall rules for production
- Consider running in isolated containers
- Monitor for unusual resource usage

## Backup and Recovery

### Session State Backup
```bash
# Create backup
tar -czf gansauditor-backup-$(date +%Y%m%d).tar.gz .mcp-gan-state/ logs/

# Restore backup
tar -xzf gansauditor-backup-20241201.tar.gz
```

### Configuration Backup
```bash
# Backup configurations
npm run config:backup

# Version control important configs
git add .env.example config/ docs/
git commit -m "Update deployment configurations"
```

## Scaling Considerations

### Horizontal Scaling
- Each instance maintains its own session state
- Use load balancer with session affinity
- Consider shared session storage for multi-instance deployments

### Vertical Scaling
```bash
# Increase resource limits
export MAX_CONCURRENT_AUDITS=20
export MAX_CONCURRENT_SESSIONS=200
export AUDIT_TIMEOUT_SECONDS=45
```

### Resource Requirements

**Minimum (Development):**
- CPU: 1 core
- RAM: 512MB
- Disk: 1GB

**Recommended (Production):**
- CPU: 2-4 cores
- RAM: 2-4GB
- Disk: 10GB (with log rotation)

**High Load (Enterprise):**
- CPU: 4-8 cores
- RAM: 8-16GB
- Disk: 50GB (with monitoring)

## Next Steps

1. **Choose your deployment method** based on your environment
2. **Configure environment variables** for your use case
3. **Set up MCP client configuration** 
4. **Test the deployment** with sample requests
5. **Monitor performance** and adjust settings as needed
6. **Set up backup and maintenance** procedures

For additional help, refer to:
- [Configuration Quick Start](docs/CONFIGURATION_QUICK_START.md)
- [MCP Integration Guide](MCP-INTEGRATION-GUIDE.md)
- [Troubleshooting Guide](docs/SYNCHRONOUS_WORKFLOW_TROUBLESHOOTING.md)