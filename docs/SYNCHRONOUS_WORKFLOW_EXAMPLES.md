# Synchronous Audit Workflow Usage Examples

This document provides comprehensive examples of using the GansAuditor synchronous audit workflow for iterative code improvement.

## Table of Contents

1. [Basic Iterative Improvement](#basic-iterative-improvement)
2. [Security Code Review](#security-code-review)
3. [Performance Optimization](#performance-optimization)
4. [API Design Review](#api-design-review)
5. [Test-Driven Development](#test-driven-development)
6. [Refactoring Legacy Code](#refactoring-legacy-code)
7. [Configuration Examples](#configuration-examples)
8. [Advanced Scenarios](#advanced-scenarios)

## Basic Iterative Improvement

### Scenario: Simple Function Implementation

**Initial Submission (Loop 1)**

```javascript
{
  "name": "gansauditor_codex",
  "arguments": {
    "thought": "I need to implement a function to calculate the factorial of a number:\n\n```javascript\nfunction factorial(n) {\n  let result = 1;\n  for (let i = 1; i <= n; i++) {\n    result *= i;\n  }\n  return result;\n}\n```",
    "thoughtNumber": 1,
    "totalThoughts": 1,
    "nextThoughtNeeded": false,
    "branchId": "factorial-implementation"
  }
}
```

**Response (Score: 72 - Needs Improvement)**

```json
{
  "thoughtNumber": 1,
  "totalThoughts": 1,
  "nextThoughtNeeded": true,
  "sessionId": "factorial-implementation",
  "gan": {
    "verdict": "revise",
    "overall": 72,
    "review": {
      "summary": "Basic implementation works but lacks input validation and edge case handling",
      "inline": [
        {
          "path": "factorial.js",
          "line": 1,
          "comment": "Add input validation for negative numbers and non-integers"
        },
        {
          "path": "factorial.js",
          "line": 1,
          "comment": "Consider handling edge case for n = 0"
        },
        {
          "path": "factorial.js",
          "line": 1,
          "comment": "Add JSDoc documentation"
        }
      ]
    },
    "completionStatus": {
      "isComplete": false,
      "currentLoop": 1,
      "score": 72,
      "threshold": 95
    },
    "feedback": {
      "improvements": [
        "Add input validation",
        "Handle edge cases (n = 0, negative numbers)",
        "Add proper documentation",
        "Consider performance for large numbers"
      ]
    }
  }
}
```

**Improved Submission (Loop 2)**

```javascript
{
  "name": "gansauditor_codex",
  "arguments": {
    "thought": "I've improved the factorial function with validation and documentation:\n\n```javascript\n/**\n * Calculates the factorial of a non-negative integer\n * @param {number} n - The number to calculate factorial for\n * @returns {number} The factorial of n\n * @throws {Error} If n is negative or not an integer\n */\nfunction factorial(n) {\n  // Input validation\n  if (typeof n !== 'number' || !Number.isInteger(n)) {\n    throw new Error('Input must be an integer');\n  }\n  if (n < 0) {\n    throw new Error('Factorial is not defined for negative numbers');\n  }\n  \n  // Handle edge case\n  if (n === 0 || n === 1) {\n    return 1;\n  }\n  \n  let result = 1;\n  for (let i = 2; i <= n; i++) {\n    result *= i;\n  }\n  return result;\n}\n```",
    "thoughtNumber": 2,
    "totalThoughts": 2,
    "nextThoughtNeeded": false,
    "branchId": "factorial-implementation"
  }
}
```

**Final Response (Score: 96 - Completed)**

```json
{
  "thoughtNumber": 2,
  "totalThoughts": 2,
  "nextThoughtNeeded": false,
  "sessionId": "factorial-implementation",
  "gan": {
    "verdict": "pass",
    "overall": 96,
    "review": {
      "summary": "Excellent implementation with proper validation, documentation, and edge case handling",
      "inline": []
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

## Security Code Review

### Scenario: User Authentication System

**Initial Submission with Custom Configuration**

```javascript
{
  "name": "gansauditor_codex",
  "arguments": {
    "thought": "```gan-config\n{\n  \"task\": \"Security review of authentication system\",\n  \"threshold\": 90,\n  \"scope\": \"function\"\n}\n```\n\nHere's my user authentication implementation:\n\n```javascript\nconst express = require('express');\nconst app = express();\n\napp.post('/login', (req, res) => {\n  const { username, password } = req.body;\n  \n  // Query user from database\n  const query = `SELECT * FROM users WHERE username = '${username}'`;\n  const user = db.query(query);\n  \n  if (user && user.password === password) {\n    // Create session\n    req.session.userId = user.id;\n    res.json({ success: true, message: 'Login successful' });\n  } else {\n    res.json({ success: false, message: 'Invalid credentials' });\n  }\n});\n```",
    "thoughtNumber": 1,
    "totalThoughts": 1,
    "nextThoughtNeeded": false,
    "branchId": "auth-security-review"
  }
}
```

**Response (Score: 25 - Critical Security Issues)**

```json
{
  "thoughtNumber": 1,
  "totalThoughts": 1,
  "nextThoughtNeeded": true,
  "sessionId": "auth-security-review",
  "gan": {
    "verdict": "reject",
    "overall": 25,
    "review": {
      "summary": "CRITICAL SECURITY VULNERABILITIES DETECTED - Immediate attention required",
      "inline": [
        {
          "path": "auth.js",
          "line": 6,
          "comment": "CRITICAL: SQL injection vulnerability - never concatenate user input into SQL queries"
        },
        {
          "path": "auth.js",
          "line": 9,
          "comment": "CRITICAL: Plaintext password comparison - passwords must be hashed"
        },
        {
          "path": "auth.js",
          "line": 11,
          "comment": "Missing rate limiting - vulnerable to brute force attacks"
        },
        {
          "path": "auth.js",
          "line": 14,
          "comment": "Information disclosure - error messages reveal whether username exists"
        }
      ]
    },
    "completionStatus": {
      "isComplete": false,
      "currentLoop": 1,
      "score": 25,
      "threshold": 90
    },
    "feedback": {
      "criticalIssues": [
        "SQL injection vulnerability",
        "Plaintext password storage/comparison",
        "No rate limiting",
        "Information disclosure in error messages"
      ],
      "nextSteps": [
        "Use parameterized queries or ORM",
        "Implement proper password hashing (bcrypt)",
        "Add rate limiting middleware",
        "Use generic error messages",
        "Add input validation and sanitization"
      ]
    }
  }
}
```

**Improved Submission (Loop 2)**

```javascript
{
  "name": "gansauditor_codex",
  "arguments": {
    "thought": "I've addressed all the critical security issues:\n\n```javascript\nconst express = require('express');\nconst bcrypt = require('bcrypt');\nconst rateLimit = require('express-rate-limit');\nconst { body, validationResult } = require('express-validator');\nconst app = express();\n\n// Rate limiting for login attempts\nconst loginLimiter = rateLimit({\n  windowMs: 15 * 60 * 1000, // 15 minutes\n  max: 5, // 5 attempts per window\n  message: 'Too many login attempts, please try again later',\n  standardHeaders: true,\n  legacyHeaders: false\n});\n\napp.post('/login', \n  loginLimiter,\n  [\n    body('username').isLength({ min: 3, max: 30 }).trim().escape(),\n    body('password').isLength({ min: 8, max: 128 })\n  ],\n  async (req, res) => {\n    // Validate input\n    const errors = validationResult(req);\n    if (!errors.isEmpty()) {\n      return res.status(400).json({ \n        success: false, \n        message: 'Invalid input format' \n      });\n    }\n    \n    const { username, password } = req.body;\n    \n    try {\n      // Use parameterized query to prevent SQL injection\n      const query = 'SELECT id, username, password_hash FROM users WHERE username = ?';\n      const user = await db.query(query, [username]);\n      \n      if (user && await bcrypt.compare(password, user.password_hash)) {\n        // Regenerate session ID to prevent session fixation\n        req.session.regenerate((err) => {\n          if (err) {\n            return res.status(500).json({ \n              success: false, \n              message: 'Authentication error' \n            });\n          }\n          \n          req.session.userId = user.id;\n          res.json({ \n            success: true, \n            message: 'Authentication successful' \n          });\n        });\n      } else {\n        // Generic error message to prevent username enumeration\n        res.status(401).json({ \n          success: false, \n          message: 'Invalid credentials' \n        });\n      }\n    } catch (error) {\n      console.error('Login error:', error);\n      res.status(500).json({ \n        success: false, \n        message: 'Authentication error' \n      });\n    }\n  }\n);\n```",
    "thoughtNumber": 2,
    "totalThoughts": 2,
    "nextThoughtNeeded": false,
    "branchId": "auth-security-review"
  }
}
```

**Final Response (Score: 94 - Completed)**

```json
{
  "thoughtNumber": 2,
  "totalThoughts": 2,
  "nextThoughtNeeded": false,
  "sessionId": "auth-security-review",
  "gan": {
    "verdict": "pass",
    "overall": 94,
    "review": {
      "summary": "Excellent security implementation - all critical vulnerabilities addressed",
      "inline": [
        {
          "path": "auth.js",
          "line": 8,
          "comment": "Good: Rate limiting implemented"
        },
        {
          "path": "auth.js",
          "line": 33,
          "comment": "Good: Parameterized queries prevent SQL injection"
        },
        {
          "path": "auth.js",
          "line": 35,
          "comment": "Good: Proper password hashing with bcrypt"
        },
        {
          "path": "auth.js",
          "line": 48,
          "comment": "Good: Generic error messages prevent information disclosure"
        }
      ]
    },
    "completionStatus": {
      "isComplete": true,
      "reason": "score_90_at_15",
      "currentLoop": 2,
      "score": 94,
      "threshold": 90
    }
  }
}
```

## Performance Optimization

### Scenario: Database Query Optimization

**Initial Submission**

```javascript
{
  "name": "gansauditor_codex",
  "arguments": {
    "thought": "```gan-config\n{\n  \"task\": \"Performance optimization for user data retrieval\",\n  \"threshold\": 85,\n  \"maxCycles\": 20\n}\n```\n\nHere's my implementation for retrieving user data with their posts:\n\n```javascript\nasync function getUserWithPosts(userId) {\n  // Get user data\n  const user = await db.query('SELECT * FROM users WHERE id = ?', [userId]);\n  \n  if (!user) {\n    return null;\n  }\n  \n  // Get user's posts\n  const posts = [];\n  const userPosts = await db.query('SELECT * FROM posts WHERE user_id = ?', [userId]);\n  \n  for (const post of userPosts) {\n    // Get comments for each post\n    const comments = await db.query('SELECT * FROM comments WHERE post_id = ?', [post.id]);\n    \n    // Get likes for each post\n    const likes = await db.query('SELECT COUNT(*) as count FROM likes WHERE post_id = ?', [post.id]);\n    \n    posts.push({\n      ...post,\n      comments: comments,\n      likeCount: likes.count\n    });\n  }\n  \n  return {\n    ...user,\n    posts: posts\n  };\n}\n```",
    "thoughtNumber": 1,
    "totalThoughts": 1,
    "nextThoughtNeeded": false,
    "branchId": "performance-optimization"
  }
}
```

**Response (Score: 45 - Performance Issues)**

```json
{
  "thoughtNumber": 1,
  "totalThoughts": 1,
  "nextThoughtNeeded": true,
  "sessionId": "performance-optimization",
  "gan": {
    "verdict": "revise",
    "overall": 45,
    "review": {
      "summary": "Severe N+1 query problem and inefficient data fetching patterns",
      "inline": [
        {
          "path": "user-service.js",
          "line": 12,
          "comment": "N+1 query problem: Making separate queries for each post's comments"
        },
        {
          "path": "user-service.js",
          "line": 15,
          "comment": "N+1 query problem: Making separate queries for each post's likes"
        },
        {
          "path": "user-service.js",
          "line": 3,
          "comment": "Selecting all columns (*) instead of needed fields"
        },
        {
          "path": "user-service.js",
          "line": 9,
          "comment": "No pagination - could return unlimited posts"
        }
      ]
    },
    "completionStatus": {
      "isComplete": false,
      "currentLoop": 1,
      "score": 45,
      "threshold": 85
    },
    "feedback": {
      "improvements": [
        "Use JOIN queries to eliminate N+1 problems",
        "Select only required columns",
        "Add pagination support",
        "Consider caching for frequently accessed data",
        "Use batch queries where possible"
      ]
    }
  }
}
```

**Optimized Submission (Loop 2)**

```javascript
{
  "name": "gansauditor_codex",
  "arguments": {
    "thought": "I've optimized the queries to eliminate N+1 problems and improve performance:\n\n```javascript\nasync function getUserWithPosts(userId, options = {}) {\n  const { limit = 10, offset = 0, includeComments = true } = options;\n  \n  try {\n    // Single optimized query with JOINs to get all data at once\n    const query = `\n      SELECT \n        u.id as user_id,\n        u.username,\n        u.email,\n        u.created_at as user_created_at,\n        p.id as post_id,\n        p.title,\n        p.content,\n        p.created_at as post_created_at,\n        COUNT(DISTINCT l.id) as like_count,\n        ${includeComments ? `\n        c.id as comment_id,\n        c.content as comment_content,\n        c.author_id as comment_author_id,\n        c.created_at as comment_created_at\n        ` : 'NULL as comment_id, NULL as comment_content, NULL as comment_author_id, NULL as comment_created_at'}\n      FROM users u\n      LEFT JOIN posts p ON u.id = p.user_id\n      LEFT JOIN likes l ON p.id = l.post_id\n      ${includeComments ? 'LEFT JOIN comments c ON p.id = c.post_id' : ''}\n      WHERE u.id = ?\n      GROUP BY u.id, p.id${includeComments ? ', c.id' : ''}\n      ORDER BY p.created_at DESC\n      LIMIT ? OFFSET ?\n    `;\n    \n    const results = await db.query(query, [userId, limit, offset]);\n    \n    if (!results.length) {\n      return null;\n    }\n    \n    // Transform flat results into nested structure\n    const user = {\n      id: results[0].user_id,\n      username: results[0].username,\n      email: results[0].email,\n      created_at: results[0].user_created_at,\n      posts: []\n    };\n    \n    const postsMap = new Map();\n    \n    for (const row of results) {\n      if (row.post_id) {\n        if (!postsMap.has(row.post_id)) {\n          postsMap.set(row.post_id, {\n            id: row.post_id,\n            title: row.title,\n            content: row.content,\n            created_at: row.post_created_at,\n            like_count: row.like_count,\n            comments: []\n          });\n        }\n        \n        const post = postsMap.get(row.post_id);\n        \n        if (includeComments && row.comment_id && \n            !post.comments.find(c => c.id === row.comment_id)) {\n          post.comments.push({\n            id: row.comment_id,\n            content: row.comment_content,\n            author_id: row.comment_author_id,\n            created_at: row.comment_created_at\n          });\n        }\n      }\n    }\n    \n    user.posts = Array.from(postsMap.values());\n    \n    return user;\n    \n  } catch (error) {\n    console.error('Error fetching user with posts:', error);\n    throw new Error('Failed to fetch user data');\n  }\n}\n\n// Add caching layer for frequently accessed users\nconst userCache = new Map();\nconst CACHE_TTL = 5 * 60 * 1000; // 5 minutes\n\nasync function getUserWithPostsCached(userId, options = {}) {\n  const cacheKey = `user_${userId}_${JSON.stringify(options)}`;\n  const cached = userCache.get(cacheKey);\n  \n  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {\n    return cached.data;\n  }\n  \n  const userData = await getUserWithPosts(userId, options);\n  \n  if (userData) {\n    userCache.set(cacheKey, {\n      data: userData,\n      timestamp: Date.now()\n    });\n  }\n  \n  return userData;\n}\n```",
    "thoughtNumber": 2,
    "totalThoughts": 2,
    "nextThoughtNeeded": false,
    "branchId": "performance-optimization"
  }
}
```

**Final Response (Score: 91 - Completed)**

```json
{
  "thoughtNumber": 2,
  "totalThoughts": 2,
  "nextThoughtNeeded": false,
  "sessionId": "performance-optimization",
  "gan": {
    "verdict": "pass",
    "overall": 91,
    "review": {
      "summary": "Excellent performance optimization - N+1 problems eliminated, caching added",
      "inline": [
        {
          "path": "user-service.js",
          "line": 5,
          "comment": "Good: Single optimized query eliminates N+1 problem"
        },
        {
          "path": "user-service.js",
          "line": 8,
          "comment": "Good: Selecting only required columns"
        },
        {
          "path": "user-service.js",
          "line": 3,
          "comment": "Good: Pagination support added"
        },
        {
          "path": "user-service.js",
          "line": 75,
          "comment": "Good: Caching layer for performance"
        }
      ]
    },
    "completionStatus": {
      "isComplete": true,
      "reason": "score_90_at_15",
      "currentLoop": 2,
      "score": 91,
      "threshold": 85
    }
  }
}
```

## API Design Review

### Scenario: RESTful API Endpoint Design

**Initial Submission**

```javascript
{
  "name": "gansauditor_codex",
  "arguments": {
    "thought": "```gan-config\n{\n  \"task\": \"RESTful API design review for e-commerce product management\",\n  \"threshold\": 88,\n  \"scope\": \"workspace\"\n}\n```\n\nHere's my API design for product management:\n\n```javascript\nconst express = require('express');\nconst router = express.Router();\n\n// Get all products\nrouter.get('/products', (req, res) => {\n  const products = db.getAllProducts();\n  res.json(products);\n});\n\n// Get product by ID\nrouter.get('/products/:id', (req, res) => {\n  const product = db.getProduct(req.params.id);\n  res.json(product);\n});\n\n// Create new product\nrouter.post('/products', (req, res) => {\n  const product = db.createProduct(req.body);\n  res.json(product);\n});\n\n// Update product\nrouter.put('/products/:id', (req, res) => {\n  const product = db.updateProduct(req.params.id, req.body);\n  res.json(product);\n});\n\n// Delete product\nrouter.delete('/products/:id', (req, res) => {\n  db.deleteProduct(req.params.id);\n  res.json({ message: 'Product deleted' });\n});\n\nmodule.exports = router;\n```",
    "thoughtNumber": 1,
    "totalThoughts": 1,
    "nextThoughtNeeded": false,
    "branchId": "api-design-review"
  }
}
```

**Response (Score: 58 - Multiple Issues)**

```json
{
  "thoughtNumber": 1,
  "totalThoughts": 1,
  "nextThoughtNeeded": true,
  "sessionId": "api-design-review",
  "gan": {
    "verdict": "revise",
    "overall": 58,
    "review": {
      "summary": "Basic REST structure present but missing essential API features and error handling",
      "inline": [
        {
          "path": "products-api.js",
          "line": 5,
          "comment": "Missing pagination, filtering, and sorting for product listing"
        },
        {
          "path": "products-api.js",
          "line": 10,
          "comment": "No error handling for non-existent products"
        },
        {
          "path": "products-api.js",
          "line": 15,
          "comment": "Missing input validation and sanitization"
        },
        {
          "path": "products-api.js",
          "line": 20,
          "comment": "No authentication/authorization checks"
        },
        {
          "path": "products-api.js",
          "line": 25,
          "comment": "Missing proper HTTP status codes"
        }
      ]
    },
    "completionStatus": {
      "isComplete": false,
      "currentLoop": 1,
      "score": 58,
      "threshold": 88
    },
    "feedback": {
      "improvements": [
        "Add comprehensive error handling",
        "Implement input validation",
        "Add authentication and authorization",
        "Include pagination, filtering, and sorting",
        "Use proper HTTP status codes",
        "Add API documentation",
        "Implement rate limiting",
        "Add request/response logging"
      ]
    }
  }
}
```

## Configuration Examples

### Development Configuration

```javascript
{
  "name": "gansauditor_codex",
  "arguments": {
    "thought": "```gan-config\n{\n  \"task\": \"Development code review\",\n  \"threshold\": 80,\n  \"maxCycles\": 20,\n  \"scope\": \"diff\"\n}\n```\n\n// Your code here...",
    "branchId": "dev-review"
  }
}
```

### Production Configuration

```javascript
{
  "name": "gansauditor_codex",
  "arguments": {
    "thought": "```gan-config\n{\n  \"task\": \"Production readiness review\",\n  \"threshold\": 95,\n  \"maxCycles\": 15,\n  \"scope\": \"workspace\"\n}\n```\n\n// Your production code here...",
    "branchId": "prod-review"
  }
}
```

### Security-Focused Configuration

```javascript
{
  "name": "gansauditor_codex",
  "arguments": {
    "thought": "```gan-config\n{\n  \"task\": \"Security vulnerability assessment\",\n  \"threshold\": 92,\n  \"maxCycles\": 25,\n  \"scope\": \"paths\",\n  \"paths\": [\"src/auth/\", \"src/api/\", \"src/middleware/\"]\n}\n```\n\n// Security-critical code here...",
    "branchId": "security-audit"
  }
}
```

## Advanced Scenarios

### Stagnation Detection Example

When the system detects that improvements have stalled:

```json
{
  "thoughtNumber": 13,
  "totalThoughts": 13,
  "nextThoughtNeeded": true,
  "sessionId": "stagnant-session",
  "gan": {
    "verdict": "revise",
    "overall": 78,
    "loopInfo": {
      "currentLoop": 13,
      "stagnationDetected": true,
      "progressTrend": "stagnant",
      "similarityScore": 0.97
    },
    "feedback": {
      "stagnationAnalysis": {
        "detectedAtLoop": 11,
        "repeatedPatterns": [
          "Similar error handling approaches",
          "Repeated validation logic",
          "Consistent architectural patterns"
        ],
        "recommendation": "Consider a different architectural approach or break the problem into smaller components"
      }
    }
  }
}
```

### Kill Switch Activation

When maximum loops are reached without completion:

```json
{
  "thoughtNumber": 25,
  "totalThoughts": 25,
  "nextThoughtNeeded": false,
  "sessionId": "max-loops-session",
  "gan": {
    "verdict": "reject",
    "overall": 82,
    "terminationInfo": {
      "reason": "Maximum loops (25) reached without achieving completion criteria",
      "failureRate": 0.18,
      "criticalIssues": [
        "Persistent security vulnerabilities in authentication flow",
        "Incomplete error handling in payment processing",
        "Performance bottlenecks in data retrieval"
      ],
      "finalAssessment": "Code shows improvement from 45 to 82 points but requires fundamental architectural changes to meet production standards",
      "recommendations": [
        "Consider redesigning the authentication system with established patterns",
        "Implement comprehensive error handling strategy",
        "Optimize database queries and add caching layer"
      ]
    }
  }
}
```

### Multi-File Review Session

```javascript
{
  "name": "gansauditor_codex",
  "arguments": {
    "thought": "```gan-config\n{\n  \"task\": \"Full-stack feature review\",\n  \"threshold\": 90,\n  \"maxCycles\": 30,\n  \"scope\": \"paths\",\n  \"paths\": [\n    \"src/components/UserProfile.tsx\",\n    \"src/api/users.ts\",\n    \"src/database/user-queries.sql\",\n    \"tests/user-profile.test.ts\"\n  ]\n}\n```\n\nI've implemented a complete user profile feature across frontend, backend, and database layers:\n\n**Frontend Component (UserProfile.tsx):**\n```typescript\n// Component code here...\n```\n\n**Backend API (users.ts):**\n```typescript\n// API code here...\n```\n\n**Database Queries (user-queries.sql):**\n```sql\n-- SQL queries here...\n```\n\n**Tests (user-profile.test.ts):**\n```typescript\n// Test code here...\n```",
    "thoughtNumber": 1,
    "totalThoughts": 1,
    "nextThoughtNeeded": false,
    "branchId": "fullstack-user-profile"
  }
}
```

## Best Practices

### 1. Use Descriptive Branch IDs
```javascript
// Good
"branchId": "payment-security-review"
"branchId": "user-auth-optimization"
"branchId": "api-error-handling"

// Avoid
"branchId": "review1"
"branchId": "test"
```

### 2. Set Appropriate Thresholds
- **Development/Learning**: 75-85
- **Production Code**: 90-95
- **Security-Critical**: 95+

### 3. Configure Scope Appropriately
- **`diff`**: For reviewing changes/patches
- **`paths`**: For specific files/directories
- **`workspace`**: For comprehensive reviews

### 4. Monitor Progress
- Check `loopInfo` for stagnation detection
- Review `completionStatus` for progress tracking
- Use `feedback.improvements` for next steps

### 5. Handle Termination Gracefully
- Review `terminationInfo` when sessions end
- Use `criticalIssues` to prioritize fixes
- Consider `recommendations` for architectural changes

This comprehensive guide demonstrates how to effectively use the synchronous audit workflow for various code review scenarios, from simple function improvements to complex security audits and performance optimizations.