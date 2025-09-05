# Getting Started with GansAuditor_Codex

This guide will get you up and running with GansAuditor_Codex in under 5 minutes.

## Quick Start (Recommended)

### 1. Deploy Locally
```bash
# Clone the repository
git clone <your-repository-url>
cd GansAuditor_Codex

# Run the deployment script
./deploy.sh local

# Verify the deployment
./verify-deployment.sh local
```

### 2. Configure Your MCP Client

The deployment script generates `mcp-config-generated.json`. Copy this configuration to your MCP client:

#### For Kiro
Copy to `.kiro/settings/mcp.json`:
```json
{
  "mcpServers": {
    "gansauditor-codex": {
      "command": "node",
      "args": ["/path/to/GansAuditor_Codex/dist/index.js"],
      "env": {
        "ENABLE_GAN_AUDITING": "true",
        "ENABLE_SYNCHRONOUS_AUDIT": "true"
      },
      "disabled": false,
      "autoApprove": ["gansauditor_codex"]
    }
  }
}
```

#### For Claude Desktop
Copy to `~/.claude/mcp_servers.json`:
```json
{
  "gansauditor-codex": {
    "command": "node",
    "args": ["/path/to/GansAuditor_Codex/dist/index.js"],
    "env": {
      "ENABLE_GAN_AUDITING": "true",
      "ENABLE_SYNCHRONOUS_AUDIT": "true"
    }
  }
}
```

### 3. Test Your Setup

Restart your MCP client and try this example:

```javascript
{
  "name": "gansauditor_codex",
  "arguments": {
    "thought": "Here's a simple function I wrote:\n\n```javascript\nfunction add(a, b) {\n  return a + b;\n}\n```",
    "thoughtNumber": 1,
    "totalThoughts": 1,
    "nextThoughtNeeded": false,
    "branchId": "test-function"
  }
}
```

You should get back a response with audit feedback!

## Alternative Deployment Methods

### Using Docker
```bash
./deploy.sh docker
./verify-deployment.sh docker

# Start the service
docker-compose up -d
```

### Using NPM (Published Package)
```bash
# If you've published to npm
./deploy.sh npm
./verify-deployment.sh npm

# Or install directly
uvx @modelcontextprotocol/server-gansauditor-codex@latest
```

## Configuration Options

### Basic Configuration (.env)
```bash
# Core features
ENABLE_GAN_AUDITING=true
ENABLE_SYNCHRONOUS_AUDIT=true

# Performance
AUDIT_TIMEOUT_SECONDS=30
MAX_CONCURRENT_AUDITS=5

# Quality thresholds
SYNC_AUDIT_TIER1_SCORE=95  # Excellent (10 loops)
SYNC_AUDIT_TIER2_SCORE=90  # Good (15 loops)
SYNC_AUDIT_TIER3_SCORE=85  # Acceptable (20 loops)
```

### Development vs Production
```bash
# Development (relaxed settings)
cp config/development.env .env

# Production (optimized settings)
cp config/production.env .env
```

## Usage Examples

### 1. Simple Code Review
```javascript
{
  "thought": "```javascript\nfunction validateEmail(email) {\n  return email.includes('@');\n}\n```",
  "thoughtNumber": 1,
  "totalThoughts": 1,
  "nextThoughtNeeded": false,
  "branchId": "email-validation"
}
```

### 2. Security-Focused Review
```javascript
{
  "thought": "```gan-config\n{\n  \"task\": \"Security review\",\n  \"threshold\": 95\n}\n```\n\n```javascript\napp.post('/login', (req, res) => {\n  const { username, password } = req.body;\n  // Login logic here\n});\n```",
  "branchId": "login-security"
}
```

### 3. Iterative Improvement
```javascript
// First submission
{
  "thought": "Initial implementation...",
  "branchId": "feature-impl"
}

// After getting feedback, improve with same branchId
{
  "thought": "Improved version based on feedback...",
  "branchId": "feature-impl"  // Same session
}
```

## Understanding Responses

### Basic Response
```json
{
  "thoughtNumber": 1,
  "totalThoughts": 1,
  "nextThoughtNeeded": false,
  "branches": [],
  "thoughtHistoryLength": 1
}
```

### With Code Auditing
```json
{
  "thoughtNumber": 1,
  "totalThoughts": 1,
  "nextThoughtNeeded": true,  // Continue improving
  "sessionId": "feature-impl",
  "gan": {
    "verdict": "revise",       // pass/revise/reject
    "overall": 75,             // 0-100 score
    "review": {
      "summary": "Issues found: input validation needed",
      "inline": [
        {
          "path": "code.js",
          "line": 2,
          "comment": "Add input validation for email parameter"
        }
      ]
    },
    "completionStatus": {
      "isComplete": false,
      "currentLoop": 1,
      "score": 75,
      "threshold": 95
    }
  }
}
```

## Key Concepts

### Session Continuity
- Use the same `branchId` for related improvements
- The system tracks progress across iterations
- Each session has its own completion criteria

### Completion Tiers
- **Tier 1**: 95% score at ≤10 loops (Excellent)
- **Tier 2**: 90% score at ≤15 loops (Good)
- **Tier 3**: 85% score at ≤20 loops (Acceptable)
- **Hard Stop**: 25 loops maximum (Safety limit)

### Response to Feedback
- When `verdict` is "revise" or "reject", address the issues
- Use `inline` comments to understand specific problems
- Continue with the same `branchId` to maintain session
- Let the system decide `nextThoughtNeeded` (usually set to `false`)

## Troubleshooting

### Server Won't Start
```bash
# Check Node.js version
node --version  # Should be 18+

# Rebuild
npm run rebuild

# Check for errors
node dist/index.js
```

### MCP Client Can't Connect
```bash
# Verify path in configuration
which node
ls -la dist/index.js

# Test manually
echo '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2024-11-05","capabilities":{},"clientInfo":{"name":"test","version":"1.0.0"}}}' | node dist/index.js
```

### Performance Issues
```bash
# Reduce concurrency
export MAX_CONCURRENT_AUDITS=2
export MAX_CONCURRENT_SESSIONS=25

# Increase timeout
export AUDIT_TIMEOUT_SECONDS=60

# Enable caching
export ENABLE_AUDIT_CACHING=true
```

## Next Steps

1. **Read the Agent Guide**: See `agent.md` for detailed LLM usage instructions
2. **Explore Examples**: Check `docs/SYNCHRONOUS_WORKFLOW_EXAMPLES.md`
3. **Configure for Production**: See `DEPLOYMENT.md` for advanced setup
4. **Monitor Performance**: Use the built-in metrics and health checks

## Support

- **Documentation**: Complete guides in `docs/` directory
- **Examples**: Working examples in `docs/SYNCHRONOUS_WORKFLOW_EXAMPLES.md`
- **Configuration**: Detailed setup in `docs/CONFIGURATION_QUICK_START.md`
- **Troubleshooting**: Common issues in `docs/SYNCHRONOUS_WORKFLOW_TROUBLESHOOTING.md`

---

**You're ready to start using GansAuditor_Codex for iterative code improvement!**