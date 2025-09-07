# Codex CLI Troubleshooting Guide

This guide helps diagnose and resolve common Codex CLI integration issues with GansAuditor_Codex.

## Quick Diagnosis

Run this command to get a comprehensive diagnosis:

```bash
npm run diagnose:codex
```

If the above command is not available, run manual checks:

```bash
# Check Codex CLI availability
codex --version

# Test basic execution
codex exec "console.log('test')"

# Check PATH configuration
which codex
echo $PATH
```

## Common Issues and Solutions

### 1. Codex CLI Not Found

**Error Messages:**
- `Error: Codex CLI not found in PATH`
- `spawn codex ENOENT`
- `Command 'codex' not found`

**Solutions:**

#### Install Codex CLI
```bash
# Follow the official Codex CLI installation guide for your platform
# Common installation methods:

# Using npm (if available)
npm install -g @codex/cli

# Using pip (if available)
pip install codex-cli

# Using homebrew (macOS)
brew install codex-cli

# Using apt (Ubuntu/Debian)
sudo apt install codex-cli

# Using yum (RHEL/CentOS)
sudo yum install codex-cli
```

#### Add to PATH
```bash
# Find where Codex CLI is installed
find /usr -name "codex" 2>/dev/null
find /opt -name "codex" 2>/dev/null
find $HOME -name "codex" 2>/dev/null

# Add to PATH (replace /path/to/codex with actual path)
export PATH="/path/to/codex/bin:$PATH"

# Make permanent by adding to shell profile
echo 'export PATH="/path/to/codex/bin:$PATH"' >> ~/.bashrc
source ~/.bashrc
```

### 2. Codex CLI Permission Issues

**Error Messages:**
- `Permission denied: codex`
- `EACCES: permission denied`

**Solutions:**

```bash
# Make Codex CLI executable
chmod +x $(which codex)

# If installed in system directory, may need sudo
sudo chmod +x /usr/local/bin/codex

# Check file permissions
ls -la $(which codex)
```

### 3. Codex CLI Configuration Issues

**Error Messages:**
- `Codex CLI configuration error`
- `API key not configured`
- `Authentication failed`

**Solutions:**

```bash
# Initialize Codex CLI configuration
codex init

# Set API key (if required)
codex config set api-key YOUR_API_KEY

# Verify configuration
codex config list

# Test with simple command
codex exec "console.log('Configuration test')"
```

### 4. Codex CLI Version Compatibility

**Error Messages:**
- `Unsupported Codex CLI version`
- `Version compatibility check failed`

**Solutions:**

```bash
# Check current version
codex --version

# Update to latest version
# Method depends on how Codex CLI was installed

# If installed via npm
npm update -g @codex/cli

# If installed via pip
pip install --upgrade codex-cli

# If installed via package manager
sudo apt update && sudo apt upgrade codex-cli
```

**Supported Versions:**
- Minimum: 1.0.0
- Recommended: Latest stable release
- Check compatibility matrix in project documentation

### 5. Environment Variable Issues

**Error Messages:**
- `Environment variable not set`
- `Missing required environment variables`

**Solutions:**

```bash
# Check current environment
env | grep -i codex

# Set required environment variables
export CODEX_API_KEY="your-api-key"
export CODEX_BASE_URL="https://api.codex.example.com"

# Make permanent
echo 'export CODEX_API_KEY="your-api-key"' >> ~/.bashrc
echo 'export CODEX_BASE_URL="https://api.codex.example.com"' >> ~/.bashrc
source ~/.bashrc
```

### 6. Network and Connectivity Issues

**Error Messages:**
- `Connection timeout`
- `Network error`
- `Unable to reach Codex API`

**Solutions:**

```bash
# Test network connectivity
ping api.codex.example.com

# Check proxy settings
echo $HTTP_PROXY
echo $HTTPS_PROXY

# Configure proxy if needed
export HTTP_PROXY="http://proxy.company.com:8080"
export HTTPS_PROXY="http://proxy.company.com:8080"

# Test with curl
curl -I https://api.codex.example.com
```

### 7. Working Directory Issues

**Error Messages:**
- `Cannot access working directory`
- `Repository not found`
- `Git repository required`

**Solutions:**

```bash
# Ensure you're in a Git repository
git status

# Initialize Git repository if needed
git init

# Check directory permissions
ls -la .
pwd

# Verify Codex CLI can access current directory
codex exec "console.log(process.cwd())"
```

### 8. Process Management Issues

**Error Messages:**
- `Process timeout`
- `Too many concurrent processes`
- `Resource exhaustion`

**Solutions:**

```bash
# Check running Codex processes
ps aux | grep codex

# Kill hanging processes
pkill -f codex

# Reduce concurrency in environment variables
export MAX_CONCURRENT_AUDITS=2
export AUDIT_TIMEOUT_SECONDS=60

# Monitor system resources
top
htop
```

## Platform-Specific Issues

### macOS

**Common Issues:**
- Gatekeeper blocking Codex CLI execution
- PATH not updated in GUI applications

**Solutions:**
```bash
# Allow Codex CLI through Gatekeeper
sudo spctl --add $(which codex)

# Update PATH for GUI applications
echo 'export PATH="/usr/local/bin:$PATH"' >> ~/.zshrc
```

### Linux

**Common Issues:**
- Missing dependencies
- SELinux blocking execution

**Solutions:**
```bash
# Install common dependencies
sudo apt install build-essential python3-dev

# Check SELinux status
sestatus

# Temporarily disable SELinux if needed
sudo setenforce 0
```

### Windows

**Common Issues:**
- PowerShell execution policy
- Windows Defender blocking execution

**Solutions:**
```powershell
# Set execution policy
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser

# Add Windows Defender exclusion
Add-MpPreference -ExclusionPath "C:\path\to\codex"
```

## Docker-Specific Issues

### Codex CLI in Docker Containers

**Dockerfile additions:**
```dockerfile
# Install Codex CLI in container
RUN npm install -g @codex/cli

# Or copy from host
COPY --from=codex-cli /usr/local/bin/codex /usr/local/bin/codex

# Set environment variables
ENV CODEX_API_KEY=${CODEX_API_KEY}
ENV PATH="/usr/local/bin:${PATH}"
```

**Docker Compose configuration:**
```yaml
services:
  gansauditor-codex:
    environment:
      - CODEX_API_KEY=${CODEX_API_KEY}
    volumes:
      - /usr/local/bin/codex:/usr/local/bin/codex:ro
```

## Advanced Diagnostics

### Enable Debug Logging

```bash
# Enable Codex CLI debug logging
export CODEX_DEBUG=true
export CODEX_LOG_LEVEL=debug

# Enable GansAuditor debug logging
export DEBUG=gansauditor:*
export DISABLE_THOUGHT_LOGGING=false
```

### Comprehensive System Check

```bash
# Create a diagnostic script
cat > codex-diagnostic.sh << 'EOF'
#!/bin/bash
echo "=== Codex CLI Diagnostic ==="
echo "Date: $(date)"
echo "User: $(whoami)"
echo "PWD: $(pwd)"
echo

echo "=== System Information ==="
uname -a
echo "Node.js: $(node --version)"
echo "npm: $(npm --version)"
echo

echo "=== PATH Configuration ==="
echo "PATH: $PATH"
echo "which codex: $(which codex 2>/dev/null || echo 'NOT FOUND')"
echo

echo "=== Codex CLI Status ==="
if command -v codex >/dev/null 2>&1; then
    echo "Codex CLI found: $(which codex)"
    echo "Version: $(codex --version 2>/dev/null || echo 'VERSION CHECK FAILED')"
    echo "Permissions: $(ls -la $(which codex) 2>/dev/null || echo 'PERMISSION CHECK FAILED')"
    echo
    echo "=== Test Execution ==="
    echo "Testing basic execution..."
    if codex exec "console.log('Diagnostic test successful')" 2>/dev/null; then
        echo "✅ Basic execution: SUCCESS"
    else
        echo "❌ Basic execution: FAILED"
    fi
else
    echo "❌ Codex CLI not found in PATH"
fi

echo
echo "=== Environment Variables ==="
env | grep -i codex | sort

echo
echo "=== Git Repository Status ==="
if git status >/dev/null 2>&1; then
    echo "✅ Git repository detected"
    echo "Branch: $(git branch --show-current)"
    echo "Remote: $(git remote -v | head -1)"
else
    echo "❌ Not in a Git repository"
fi

echo
echo "=== Network Connectivity ==="
if ping -c 1 8.8.8.8 >/dev/null 2>&1; then
    echo "✅ Internet connectivity: OK"
else
    echo "❌ Internet connectivity: FAILED"
fi
EOF

chmod +x codex-diagnostic.sh
./codex-diagnostic.sh
```

## Getting Help

### Log Collection

When reporting issues, include:

```bash
# Collect diagnostic information
npm run diagnose:codex > codex-diagnostic.log 2>&1

# Collect system logs
journalctl -u gansauditor-codex --since "1 hour ago" > system.log

# Collect application logs
tail -n 100 logs/audit/*.log > app.log
```

### Support Channels

1. **Check documentation**: Review all troubleshooting guides
2. **Search issues**: Look for similar problems in project issues
3. **Create issue**: Include diagnostic logs and system information
4. **Community support**: Ask in project discussions or forums

### Escalation Path

1. **Level 1**: Basic troubleshooting (this guide)
2. **Level 2**: Advanced configuration issues
3. **Level 3**: Codex CLI integration bugs
4. **Level 4**: Core system architecture issues

## Prevention and Best Practices

### Pre-deployment Validation

```bash
# Always validate before deployment
npm run validate:codex
npm run test:codex-integration
npm run validate:production
```

### Monitoring and Alerting

```bash
# Set up health checks
export ENABLE_CODEX_HEALTH_CHECKS=true
export CODEX_HEALTH_CHECK_INTERVAL=300000  # 5 minutes

# Monitor Codex CLI availability
watch -n 60 'codex --version || echo "CODEX CLI DOWN"'
```

### Regular Maintenance

```bash
# Weekly Codex CLI health check
codex --version
codex exec "console.log('Health check: ' + new Date())"

# Monthly updates
npm run update:codex-cli
npm run validate:codex
```

This troubleshooting guide should help resolve most Codex CLI integration issues. For persistent problems, collect diagnostic information and seek support through appropriate channels.