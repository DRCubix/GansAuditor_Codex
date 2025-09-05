# GansAuditor_Codex MCP Server

A sophisticated Model Context Protocol (MCP) server that provides **GAN-style adversarial code auditing** with **sequential thinking capabilities** for comprehensive code review and iterative quality improvement.

## What is GansAuditor_Codex?

GansAuditor_Codex combines thoughtful problem-solving with automated code quality assessment through a unique **GAN-inspired adversarial auditing system**. It features both asynchronous and **synchronous audit workflows** that provide immediate, iterative feedback for continuous code improvement.

### Key Innovations

- **🧠 Sequential Thinking Engine**: Dynamic, reflective problem-solving with revision capabilities
- **⚔️ GAN-Style Adversarial Auditing**: Multiple judge perspectives for comprehensive code review  
- **⚡ Synchronous Workflow**: Immediate feedback with iterative improvement cycles
- **🔄 Session Continuity**: Persistent audit sessions across multiple interactions
- **🎯 Automatic Code Detection**: Identifies code blocks, diffs, and programming content
- **📊 Tiered Completion System**: Smart completion criteria with kill switches
- **🛡️ Stagnation Detection**: Prevents infinite loops with similarity analysis

## How It Works

### 1. Sequential Thinking Process

The tool processes thoughts sequentially, allowing for:
- **Dynamic problem breakdown** with adjustable thought counts
- **Revision capabilities** to question and improve previous thoughts
- **Branching logic** for exploring alternative approaches
- **Hypothesis generation and verification**

### 2. Automatic Code Auditing

When code is detected in thoughts, the system automatically:
- **Analyzes code quality** using multiple judge perspectives
- **Provides structured feedback** with scores and inline comments
- **Suggests specific improvements** with actionable recommendations
- **Tracks progress** across iterative improvement cycles

### 3. Synchronous Iterative Improvement

The synchronous workflow enables:
- **Immediate audit results** in the same response
- **Iterative refinement** based on structured feedback
- **Progress tracking** with completion criteria
- **Session continuity** across multiple tool calls

## Installation & Setup

### Quick Start with uvx (Recommended)

```bash
# Install and run with uvx
uvx @modelcontextprotocol/server-gansauditor-codex@latest
```

### Manual Installation

```bash
# Clone and build
git clone <repository-url>
cd GansAuditor_Codex
npm install
npm run build

# Test the server
node dist/index.js
```

### MCP Client Configuration

#### For Kiro (.kiro/settings/mcp.json)

```json
{
  "mcpServers": {
    "gansauditor-codex": {
      "command": "uvx",
      "args": ["@modelcontextprotocol/server-gansauditor-codex@latest"],
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

#### For Claude Desktop

```json
{
  "mcpServers": {
    "gansauditor-codex": {
      "command": "uvx",
      "args": ["@modelcontextprotocol/server-gansauditor-codex@latest"],
      "env": {
        "ENABLE_GAN_AUDITING": "true",
        "ENABLE_SYNCHRONOUS_AUDIT": "true"
      }
    }
  }
}
```

## Usage Examples

### Basic Sequential Thinking

```javascript
{
  "name": "gansauditor_codex",
  "arguments": {
    "thought": "I need to design a user authentication system. Let me break this down into security requirements first.",
    "thoughtNumber": 1,
    "totalThoughts": 5,
    "nextThoughtNeeded": true
  }
}
```

### Code Review with Automatic Auditing

```javascript
{
  "name": "gansauditor_codex", 
  "arguments": {
    "thought": "Here's my authentication function:\n\n```javascript\nfunction authenticateUser(username, password) {\n  const user = database.query('SELECT * FROM users WHERE username = \"' + username + '\"');\n  if (user && user.password === password) {\n    return { success: true, user: user };\n  }\n  return { success: false };\n}\n```",
    "thoughtNumber": 1,
    "totalThoughts": 1,
    "nextThoughtNeeded": false,
    "branchId": "auth-review"
  }
}
```

**Response with Audit Feedback:**
```json
{
  "thoughtNumber": 1,
  "totalThoughts": 1,
  "nextThoughtNeeded": true,
  "sessionId": "auth-review",
  "gan": {
    "verdict": "revise",
    "overall": 45,
    "review": {
      "summary": "Critical security vulnerabilities detected",
      "inline": [
        {
          "path": "auth.js",
          "line": 2,
          "comment": "SQL injection vulnerability - use parameterized queries"
        },
        {
          "path": "auth.js",
          "line": 3, 
          "comment": "Password should be hashed, not compared in plaintext"
        }
      ]
    },
    "completionStatus": {
      "isComplete": false,
      "currentLoop": 1,
      "score": 45,
      "threshold": 95
    }
  }
}
```

### Iterative Improvement (Loop 2)

```javascript
{
  "name": "gansauditor_codex",
  "arguments": {
    "thought": "I've addressed the security issues:\n\n```javascript\nconst bcrypt = require('bcrypt');\n\nfunction authenticateUser(username, password) {\n  const user = database.query('SELECT * FROM users WHERE username = ?', [username]);\n  if (user && bcrypt.compareSync(password, user.hashedPassword)) {\n    return { success: true, user: { id: user.id, username: user.username } };\n  }\n  return { success: false };\n}\n```",
    "thoughtNumber": 2,
    "totalThoughts": 2,
    "nextThoughtNeeded": false,
    "branchId": "auth-review"
  }
}
```

**Final Response (Completion):**
```json
{
  "thoughtNumber": 2,
  "totalThoughts": 2,
  "nextThoughtNeeded": false,
  "sessionId": "auth-review",
  "gan": {
    "verdict": "pass",
    "overall": 96,
    "review": {
      "summary": "Excellent implementation with proper security measures"
    },
    "completionStatus": {
      "isComplete": true,
      "reason": "score_95_at_10",
      "currentLoop": 2,
      "score": 96,
      "threshold": 95
    }
  }
}
```

### Custom Audit Configuration

```javascript
{
  "name": "gansauditor_codex",
  "arguments": {
    "thought": "```gan-config\n{\n  \"task\": \"Security review for payment processing\",\n  \"threshold\": 90,\n  \"maxCycles\": 15,\n  \"judges\": [\"security\", \"performance\"]\n}\n```\n\n```python\ndef process_payment(amount, card_number):\n    # Payment processing logic\n    return True\n```",
    "thoughtNumber": 1,
    "totalThoughts": 1,
    "nextThoughtNeeded": false,
    "branchId": "payment-security"
  }
}
```

## Configuration

### Environment Variables

#### Core Settings
| Variable | Default | Description |
|----------|---------|-------------|
| `ENABLE_GAN_AUDITING` | `false` | Enable automatic code auditing |
| `ENABLE_SYNCHRONOUS_AUDIT` | `false` | Enable synchronous workflow mode |
| `DISABLE_THOUGHT_LOGGING` | `false` | Disable formatted console output |

#### Synchronous Workflow Settings
| Variable | Default | Description |
|----------|---------|-------------|
| `AUDIT_TIMEOUT_SECONDS` | `30` | Timeout for audit operations |
| `MAX_CONCURRENT_AUDITS` | `5` | Maximum concurrent audit operations |
| `MAX_CONCURRENT_SESSIONS` | `50` | Maximum concurrent sessions |

#### Completion Criteria (Tiered System)
| Variable | Default | Description |
|----------|---------|-------------|
| `SYNC_AUDIT_TIER1_SCORE` | `95` | Score threshold for Tier 1 completion (10 loops) |
| `SYNC_AUDIT_TIER2_SCORE` | `90` | Score threshold for Tier 2 completion (15 loops) |
| `SYNC_AUDIT_TIER3_SCORE` | `85` | Score threshold for Tier 3 completion (20 loops) |
| `SYNC_AUDIT_HARD_STOP_LOOPS` | `25` | Hard stop maximum loops |

#### Safety Features
| Variable | Default | Description |
|----------|---------|-------------|
| `ENABLE_STAGNATION_DETECTION` | `true` | Enable stagnation detection |
| `SYNC_AUDIT_STAGNATION_THRESHOLD` | `0.95` | Similarity threshold for stagnation |
| `ENABLE_AUDIT_CACHING` | `true` | Enable audit result caching |

### Configuration Templates

#### Development Environment
```bash
export ENABLE_GAN_AUDITING=true
export ENABLE_SYNCHRONOUS_AUDIT=true
export AUDIT_TIMEOUT_SECONDS=60
export MAX_CONCURRENT_AUDITS=2
export SYNC_AUDIT_FEEDBACK_DETAIL_LEVEL=verbose
```

#### Production Environment
```bash
export ENABLE_GAN_AUDITING=true
export ENABLE_SYNCHRONOUS_AUDIT=true
export AUDIT_TIMEOUT_SECONDS=30
export MAX_CONCURRENT_AUDITS=10
export MAX_CONCURRENT_SESSIONS=100
export ENABLE_AUDIT_CACHING=true
```

## Features Deep Dive

### Automatic Code Detection

The system automatically detects and audits:
- **Code blocks** with language identifiers (```javascript, ```python, etc.)
- **Diff content** (git diffs, patch files)
- **Programming patterns** and keywords
- **gan-config blocks** for custom configuration

### Synchronous Workflow Features

#### Tiered Completion System
- **Tier 1**: 95% score at 10 loops → Completion
- **Tier 2**: 90% score at 15 loops → Completion  
- **Tier 3**: 85% score at 20 loops → Completion
- **Hard Stop**: 25 loops maximum → Forced termination

#### Kill Switches and Safety Features
- **Stagnation Detection**: Identifies repetitive responses (>95% similarity)
- **Loop Prevention**: Prevents infinite improvement cycles
- **Timeout Protection**: Configurable timeout per audit
- **Resource Management**: Concurrent session and audit limits

#### Enhanced Response Format
```typescript
interface SynchronousResponse {
  thoughtNumber: number;
  totalThoughts: number;
  nextThoughtNeeded: boolean;
  sessionId: string;
  gan: {
    verdict: "pass" | "revise" | "reject";
    overall: number; // 0-100 score
    review: {
      summary: string;
      inline: Array<{path: string, line: number, comment: string}>;
      citations: string[];
    };
    completionStatus: {
      isComplete: boolean;
      reason: string;
      currentLoop: number;
      score: number;
      threshold: number;
    };
    loopInfo?: {
      currentLoop: number;
      stagnationDetected: boolean;
      progressTrend: "improving" | "stagnant" | "declining";
    };
  };
}
```

### Session Continuity

Use `branchId` to maintain audit context across multiple tool calls:
```javascript
// First call - Initial submission
{ "branchId": "feature-review", "thoughtNumber": 1 }

// Second call - Improved version (same session)  
{ "branchId": "feature-review", "thoughtNumber": 2 }

// Third call - Final version (same session)
{ "branchId": "feature-review", "thoughtNumber": 3 }
```

## Architecture

### Core Components

- **`auditor/`**: GAN-style auditing engine and orchestration
- **`session/`**: Session state management with persistence
- **`types/`**: TypeScript type definitions and response builders
- **`config/`**: Configuration management and validation
- **`context/`**: Repository context building and analysis
- **`utils/`**: Shared utilities and error handling
- **`monitoring/`**: System monitoring and observability

### Technology Stack

- **Runtime**: Node.js 18+ with ESM modules
- **Language**: TypeScript 5.3+ with strict mode
- **Build System**: TypeScript compiler (tsc)
- **Testing**: Vitest with comprehensive test coverage
- **Protocol**: Model Context Protocol (MCP) SDK

## Testing

Run the comprehensive test suite:

```bash
# Run all tests
npm test

# Run with coverage
npm run test:coverage

# Test specific functionality
node test-mcp-server.js
node test-mcp-server-with-auditing.js
node integration-test.js
```

## Documentation

### Quick References
- **[Configuration Quick Start](docs/CONFIGURATION_QUICK_START.md)**: Essential setup guide
- **[MCP Integration Guide](MCP-INTEGRATION-GUIDE.md)**: Complete integration reference
- **[Starter Guide](Docs/Starter-Guides/GansAuditorCodex.md)**: Getting started tutorial

### Comprehensive Guides
- **[Synchronous Workflow Examples](docs/SYNCHRONOUS_WORKFLOW_EXAMPLES.md)**: Detailed usage examples
- **[Configuration Reference](docs/SYNCHRONOUS_AUDIT_CONFIGURATION.md)**: Complete configuration guide
- **[Migration Guide](docs/SYNCHRONOUS_AUDIT_MIGRATION_GUIDE.md)**: Async to sync migration
- **[Troubleshooting Guide](docs/SYNCHRONOUS_WORKFLOW_TROUBLESHOOTING.md)**: Problem resolution

## Use Cases

### Code Review and Quality Assessment
- **Automated code review** with multiple judge perspectives
- **Security vulnerability detection** with specific remediation suggestions
- **Performance optimization** recommendations
- **Code style and convention** enforcement

### Iterative Development
- **Continuous improvement cycles** with structured feedback
- **Progress tracking** across development iterations
- **Quality gate enforcement** with configurable thresholds
- **Session-based development** with persistent context

### Educational and Learning
- **Code mentoring** with detailed explanations
- **Best practice guidance** with real-world examples
- **Progressive skill building** through iterative feedback
- **Pattern recognition** and anti-pattern identification

## Contributing

1. **Fork the repository**
2. **Create a feature branch**: `git checkout -b feature/amazing-feature`
3. **Make your changes** with comprehensive tests
4. **Run the test suite**: `npm test`
5. **Submit a pull request** with detailed description

## License

This project is licensed under the MIT License. See the [LICENSE](LICENSE) file for details.

## Support

- **Issues**: Report bugs and feature requests via GitHub Issues
- **Documentation**: Comprehensive guides in the `docs/` directory
- **Examples**: Working examples in the `examples/` directory
- **Testing**: Use provided test scripts for validation

---

**GansAuditor_Codex** - Elevating code quality through adversarial auditing and intelligent iteration.