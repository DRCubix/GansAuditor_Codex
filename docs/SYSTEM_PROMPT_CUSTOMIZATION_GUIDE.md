# System Prompt Customization Guide

This guide provides detailed instructions for customizing the GAN Auditor System Prompt to meet specific project requirements, team preferences, and organizational standards.

## Table of Contents

1. [Customization Overview](#customization-overview)
2. [Identity and Role Customization](#identity-and-role-customization)
3. [Workflow Customization](#workflow-customization)
4. [Quality Framework Customization](#quality-framework-customization)
5. [Completion Criteria Customization](#completion-criteria-customization)
6. [Security Configuration](#security-configuration)
7. [Performance Tuning](#performance-tuning)
8. [Integration Customization](#integration-customization)
9. [Monitoring and Alerting](#monitoring-and-alerting)
10. [Advanced Customizations](#advanced-customizations)

## Customization Overview

The system prompt configuration is highly flexible and can be customized at multiple levels:

- **Environment-specific**: Different settings for development, staging, and production
- **Use case-specific**: Tailored configurations for security, performance, or compliance needs
- **Team-specific**: Adapted to team preferences and development practices
- **Project-specific**: Customized for specific project requirements and constraints

### Configuration Hierarchy

```
Base Configuration
├── Environment Overrides (development/staging/production)
├── Use Case Specializations (security/performance/compliance)
├── Team Customizations (coding standards/preferences)
└── Project Adaptations (specific requirements/constraints)
```

## Identity and Role Customization

### Basic Identity Configuration

```json
{
  "identity": {
    "name": "Custom Auditor Name",
    "role": "Specialized Auditor Role",
    "stance": "custom-adversarial-stance",
    "authority": "custom-ground-truth-sources"
  }
}
```

### Identity Examples

#### Security-Focused Auditor
```json
{
  "identity": {
    "name": "Kilo Code Security",
    "role": "Security-Focused Adversarial Auditor",
    "stance": "security-first-adversarial",
    "authority": "spec-steering-and-security-policies"
  }
}
```

#### Performance-Focused Auditor
```json
{
  "identity": {
    "name": "Kilo Code Turbo",
    "role": "Performance-Focused Adversarial Auditor",
    "stance": "efficiency-driven-adversarial",
    "authority": "spec-and-performance-benchmarks"
  }
}
```

#### Compliance-Focused Auditor
```json
{
  "identity": {
    "name": "Kilo Code Compliance",
    "role": "Compliance-Focused Adversarial Auditor",
    "stance": "regulation-driven-adversarial",
    "authority": "spec-steering-and-compliance-frameworks"
  }
}
```

### Custom Authority Sources

Define what the auditor considers as ground truth:

```json
{
  "identity": {
    "authority": "custom-authority-definition",
    "authoritySources": [
      "Spec documents (.kiro/specs/)",
      "Steering documents (.kiro/steering/)",
      "Security policies (security/)",
      "Performance benchmarks (benchmarks/)",
      "Compliance frameworks (compliance/)",
      "Team coding standards (standards/)"
    ]
  }
}
```

## Workflow Customization

### Basic Workflow Configuration

```json
{
  "workflow": {
    "steps": 8,
    "enforceOrder": true,
    "allowSkipping": false,
    "evidenceRequired": true,
    "customSteps": []
  }
}
```

### Adding Custom Workflow Steps

#### Security Scanning Step
```json
{
  "workflow": {
    "customSteps": [
      {
        "name": "SECURITY_SCAN",
        "position": "after:DYNAMIC",
        "description": "Comprehensive security vulnerability scanning",
        "required": true,
        "timeout": 30000,
        "tools": ["semgrep", "bandit", "safety"],
        "criteria": [
          "No critical security vulnerabilities",
          "All dependencies scanned for known CVEs",
          "Input validation implemented",
          "Authentication and authorization verified"
        ]
      }
    ]
  }
}
```

#### Accessibility Check Step
```json
{
  "workflow": {
    "customSteps": [
      {
        "name": "ACCESSIBILITY_CHECK",
        "position": "after:CONFORM",
        "description": "Validate accessibility compliance",
        "required": false,
        "timeout": 15000,
        "tools": ["axe-core", "lighthouse"],
        "criteria": [
          "WCAG 2.1 AA compliance",
          "Screen reader compatibility",
          "Keyboard navigation support",
          "Color contrast requirements met"
        ]
      }
    ]
  }
}
```

#### Performance Benchmarking Step
```json
{
  "workflow": {
    "customSteps": [
      {
        "name": "PERFORMANCE_BENCHMARK",
        "position": "after:TESTS",
        "description": "Performance benchmarking and optimization validation",
        "required": true,
        "timeout": 45000,
        "tools": ["benchmark", "profiler"],
        "criteria": [
          "Response time under 200ms",
          "Memory usage within limits",
          "CPU utilization optimized",
          "Database queries efficient"
        ]
      }
    ]
  }
}
```

### Workflow Step Ordering

```json
{
  "workflow": {
    "stepOrder": [
      "INIT",
      "REPRO",
      "STATIC",
      "SECURITY_SCAN",
      "TESTS",
      "PERFORMANCE_BENCHMARK",
      "DYNAMIC",
      "ACCESSIBILITY_CHECK",
      "CONFORM",
      "TRACE",
      "VERDICT"
    ]
  }
}
```

### Conditional Workflow Steps

```json
{
  "workflow": {
    "conditionalSteps": [
      {
        "name": "MOBILE_TESTING",
        "condition": "project.type === 'mobile'",
        "position": "after:TESTS",
        "description": "Mobile-specific testing and validation"
      },
      {
        "name": "API_TESTING",
        "condition": "project.hasAPI === true",
        "position": "after:DYNAMIC",
        "description": "API endpoint testing and validation"
      }
    ]
  }
}
```

## Quality Framework Customization

### Custom Quality Dimensions

```json
{
  "qualityFramework": {
    "customDimensions": [
      {
        "name": "accessibility",
        "weight": 0.1,
        "criteria": [
          "WCAG 2.1 AA compliance",
          "Screen reader compatibility",
          "Keyboard navigation support",
          "Color contrast requirements",
          "Alternative text for images"
        ],
        "scoringMethod": "checklist",
        "requiredScore": 80
      },
      {
        "name": "internationalization",
        "weight": 0.05,
        "criteria": [
          "Text externalization complete",
          "Locale-aware formatting",
          "RTL language support",
          "Currency and date formatting",
          "Character encoding handling"
        ],
        "scoringMethod": "weighted",
        "requiredScore": 70
      },
      {
        "name": "compliance",
        "weight": 0.15,
        "criteria": [
          "SOC 2 Type II compliance",
          "GDPR data protection requirements",
          "HIPAA security safeguards",
          "PCI DSS requirements",
          "Industry-specific regulations"
        ],
        "scoringMethod": "strict",
        "requiredScore": 95
      }
    ]
  }
}
```

### Custom Weighting Schemes

```json
{
  "qualityFramework": {
    "weightingSchemes": {
      "security-focused": {
        "correctnessCompleteness": 0.25,
        "tests": 0.15,
        "styleConventions": 0.10,
        "security": 0.30,
        "performance": 0.05,
        "docsTraceability": 0.10,
        "compliance": 0.05
      },
      "performance-focused": {
        "correctnessCompleteness": 0.30,
        "tests": 0.20,
        "styleConventions": 0.05,
        "security": 0.10,
        "performance": 0.25,
        "docsTraceability": 0.10
      },
      "startup-mvp": {
        "correctnessCompleteness": 0.40,
        "tests": 0.25,
        "styleConventions": 0.05,
        "security": 0.15,
        "performance": 0.10,
        "docsTraceability": 0.05
      }
    }
  }
}
```

### Project-Specific Quality Criteria

```json
{
  "qualityFramework": {
    "projectSpecific": {
      "frontend": {
        "additionalCriteria": [
          "Cross-browser compatibility",
          "Responsive design implementation",
          "Progressive web app features",
          "Bundle size optimization"
        ]
      },
      "backend": {
        "additionalCriteria": [
          "API design consistency",
          "Database query optimization",
          "Caching strategy implementation",
          "Error handling completeness"
        ]
      },
      "mobile": {
        "additionalCriteria": [
          "Platform-specific guidelines",
          "Battery usage optimization",
          "Offline functionality",
          "App store compliance"
        ]
      }
    }
  }
}
```

## Completion Criteria Customization

### Custom Completion Tiers

```json
{
  "completionCriteria": {
    "customTiers": [
      {
        "name": "MVP Ready",
        "condition": "overallScore >= 70 && criticalIssues === 0",
        "verdict": "pass",
        "priority": 1,
        "message": "Minimum viable product quality achieved"
      },
      {
        "name": "Production Ready",
        "condition": "overallScore >= 85 && securityScore >= 90",
        "verdict": "pass",
        "priority": 2,
        "message": "Production deployment quality achieved"
      },
      {
        "name": "Enterprise Ready",
        "condition": "overallScore >= 95 && complianceScore >= 95",
        "verdict": "pass",
        "priority": 3,
        "message": "Enterprise-grade quality achieved"
      }
    ]
  }
}
```

### Custom Kill Switches

```json
{
  "completionCriteria": {
    "customKillSwitches": [
      {
        "name": "critical-security-failure",
        "condition": "criticalSecurityIssues > 0 && loops >= 5",
        "action": "terminate",
        "escalate": true,
        "message": "Critical security issues must be resolved"
      },
      {
        "name": "performance-regression",
        "condition": "performanceScore < 50 && loops >= 10",
        "action": "escalate",
        "escalate": true,
        "message": "Performance regression detected"
      },
      {
        "name": "compliance-violation",
        "condition": "complianceViolations > 0 && loops >= 3",
        "action": "terminate",
        "escalate": true,
        "message": "Compliance violations must be addressed"
      }
    ]
  }
}
```

### Dynamic Completion Criteria

```json
{
  "completionCriteria": {
    "dynamic": {
      "enabled": true,
      "adaptToProject": true,
      "adaptToTeam": true,
      "learningEnabled": true,
      "adaptationRules": [
        {
          "condition": "project.type === 'prototype'",
          "adjustments": {
            "tierThresholds": { "tier1": 60, "tier2": 70, "tier3": 80 },
            "maxIterations": 10
          }
        },
        {
          "condition": "project.criticality === 'high'",
          "adjustments": {
            "tierThresholds": { "tier1": 95, "tier2": 90, "tier3": 85 },
            "maxIterations": 30
          }
        }
      ]
    }
  }
}
```

## Security Configuration

### Security Level Configurations

#### Development Security
```json
{
  "security": {
    "level": "development",
    "sanitizePII": true,
    "validateCommands": false,
    "respectPermissions": false,
    "flagVulnerabilities": true,
    "commandValidationLevel": "lenient",
    "auditTrail": false,
    "encryptSessionData": false
  }
}
```

#### Production Security
```json
{
  "security": {
    "level": "production",
    "sanitizePII": true,
    "validateCommands": true,
    "respectPermissions": true,
    "flagVulnerabilities": true,
    "commandValidationLevel": "strict",
    "auditTrail": true,
    "encryptSessionData": true,
    "accessLogging": true,
    "integrityChecking": true
  }
}
```

#### Maximum Security
```json
{
  "security": {
    "level": "maximum",
    "sanitizePII": true,
    "validateCommands": true,
    "respectPermissions": true,
    "flagVulnerabilities": true,
    "commandValidationLevel": "maximum",
    "auditTrail": true,
    "encryptSessionData": true,
    "accessLogging": true,
    "integrityChecking": true,
    "secretDetection": true,
    "dependencyScanning": true,
    "codeSigningValidation": true,
    "networkSecurityValidation": true
  }
}
```

### Custom Security Policies

```json
{
  "security": {
    "customPolicies": {
      "dataHandling": {
        "piiDetectionPatterns": [
          "email",
          "phone",
          "ssn",
          "credit_card",
          "custom_id_pattern"
        ],
        "dataClassification": "automatic",
        "encryptionRequirements": {
          "atRest": "AES-256",
          "inTransit": "TLS-1.3"
        }
      },
      "accessControl": {
        "authenticationRequired": true,
        "multiFactorAuth": "conditional",
        "sessionTimeout": 1800000,
        "roleBasedAccess": true
      },
      "compliance": {
        "frameworks": ["SOC2", "GDPR", "HIPAA"],
        "auditRetention": "7years",
        "incidentResponse": "mandatory"
      }
    }
  }
}
```

## Performance Tuning

### Performance Profiles

#### High Throughput Profile
```json
{
  "performance": {
    "profile": "high-throughput",
    "contextTokenLimit": 100000,
    "auditTimeoutMs": 15000,
    "enableCaching": true,
    "maxConcurrentAudits": 10,
    "memoryLimit": "256MB",
    "aggressiveCaching": true,
    "parallelProcessing": true,
    "streamingMode": true
  }
}
```

#### High Quality Profile
```json
{
  "performance": {
    "profile": "high-quality",
    "contextTokenLimit": 300000,
    "auditTimeoutMs": 60000,
    "enableCaching": false,
    "maxConcurrentAudits": 2,
    "memoryLimit": "1GB",
    "comprehensiveAnalysis": true,
    "detailedReporting": true
  }
}
```

#### Balanced Profile
```json
{
  "performance": {
    "profile": "balanced",
    "contextTokenLimit": 200000,
    "auditTimeoutMs": 30000,
    "enableCaching": true,
    "maxConcurrentAudits": 5,
    "memoryLimit": "512MB",
    "adaptiveOptimization": true
  }
}
```

### Custom Performance Optimizations

```json
{
  "performance": {
    "customOptimizations": {
      "contextPruning": {
        "enabled": true,
        "strategy": "relevance-based",
        "aggressiveness": "medium",
        "relevanceThreshold": 0.7
      },
      "responseCompression": {
        "enabled": true,
        "algorithm": "gzip",
        "level": 6,
        "minSize": 1024
      },
      "memoryManagement": {
        "garbageCollection": "optimized",
        "memoryPooling": true,
        "objectReuse": true,
        "memoryLeakDetection": true
      },
      "networkOptimization": {
        "connectionReuse": true,
        "requestBatching": true,
        "responseStreaming": true,
        "compressionEnabled": true
      }
    }
  }
}
```

## Integration Customization

### Custom Integration Points

```json
{
  "integration": {
    "customIntegrations": [
      {
        "name": "jira",
        "type": "issue-tracking",
        "enabled": true,
        "config": {
          "baseUrl": "https://company.atlassian.net",
          "projectKey": "PROJ",
          "issueType": "Bug"
        }
      },
      {
        "name": "slack",
        "type": "notification",
        "enabled": true,
        "config": {
          "webhook": "https://hooks.slack.com/...",
          "channel": "#code-reviews"
        }
      },
      {
        "name": "sonarqube",
        "type": "quality-gate",
        "enabled": true,
        "config": {
          "serverUrl": "https://sonar.company.com",
          "projectKey": "project-key"
        }
      }
    ]
  }
}
```

### Webhook Integrations

```json
{
  "integration": {
    "webhooks": [
      {
        "name": "audit-completion",
        "url": "https://api.company.com/webhooks/audit-complete",
        "events": ["audit.completed", "audit.failed"],
        "headers": {
          "Authorization": "Bearer ${WEBHOOK_TOKEN}",
          "Content-Type": "application/json"
        },
        "retryPolicy": {
          "maxRetries": 3,
          "backoffMultiplier": 2
        }
      }
    ]
  }
}
```

## Monitoring and Alerting

### Custom Metrics

```json
{
  "monitoring": {
    "customMetrics": [
      {
        "name": "security_issues_per_audit",
        "type": "gauge",
        "description": "Number of security issues found per audit",
        "labels": ["severity", "category"]
      },
      {
        "name": "audit_quality_trend",
        "type": "histogram",
        "description": "Quality score distribution over time",
        "buckets": [60, 70, 80, 85, 90, 95, 100]
      },
      {
        "name": "developer_satisfaction",
        "type": "counter",
        "description": "Developer feedback on audit usefulness",
        "labels": ["rating", "team"]
      }
    ]
  }
}
```

### Custom Alerts

```json
{
  "monitoring": {
    "customAlerts": [
      {
        "name": "quality-regression",
        "condition": {
          "metric": "average_quality_score",
          "operator": "lt",
          "threshold": 80,
          "windowMs": 3600000
        },
        "severity": "warning",
        "actions": [
          {
            "type": "slack",
            "channel": "#quality-alerts"
          },
          {
            "type": "email",
            "recipients": ["quality-team@company.com"]
          }
        ]
      },
      {
        "name": "security-trend-negative",
        "condition": {
          "metric": "security_issues_trend",
          "operator": "increasing",
          "threshold": 0.1,
          "windowMs": 7200000
        },
        "severity": "error",
        "actions": [
          {
            "type": "pagerduty",
            "service": "security-team"
          }
        ]
      }
    ]
  }
}
```

## Advanced Customizations

### AI-Assisted Customization

```json
{
  "advanced": {
    "aiAssisted": {
      "enabled": true,
      "adaptToProject": true,
      "learnFromFeedback": true,
      "personalizeForDeveloper": true,
      "optimizeForTeam": true,
      "models": {
        "feedbackGeneration": "gpt-4",
        "patternRecognition": "claude-3",
        "qualityPrediction": "custom-model"
      }
    }
  }
}
```

### Dynamic Configuration

```json
{
  "advanced": {
    "dynamicConfiguration": {
      "enabled": true,
      "adaptationRules": [
        {
          "trigger": "project.complexity > 0.8",
          "adjustments": {
            "maxIterations": 30,
            "qualityThresholds": { "tier1": 95 }
          }
        },
        {
          "trigger": "team.experience < 0.5",
          "adjustments": {
            "feedbackDetail": "verbose",
            "educationalContent": true
          }
        }
      ]
    }
  }
}
```

### Plugin System

```json
{
  "advanced": {
    "plugins": [
      {
        "name": "custom-quality-assessor",
        "type": "quality-assessor",
        "path": "./plugins/custom-quality-assessor.js",
        "config": {
          "weight": 0.1,
          "criteria": ["custom-criterion-1", "custom-criterion-2"]
        }
      },
      {
        "name": "team-specific-workflow",
        "type": "workflow-step",
        "path": "./plugins/team-workflow.js",
        "config": {
          "position": "after:TESTS",
          "required": true
        }
      }
    ]
  }
}
```

## Configuration Validation and Testing

### Validation Rules

```bash
# Validate custom configuration
npm run config:validate config/custom-config.json --strict

# Test configuration with sample data
npm run config:test config/custom-config.json --sample-data

# Validate against schema
npm run config:validate-schema config/custom-config.json

# Check compatibility with existing system
npm run config:check-compatibility config/custom-config.json
```

### Testing Custom Configurations

```bash
# Test in development environment
npm run config:test-dev config/custom-config.json

# Simulate production conditions
npm run config:simulate-prod config/custom-config.json

# Performance test custom configuration
npm run config:performance-test config/custom-config.json

# Security test custom configuration
npm run config:security-test config/custom-config.json
```

## Best Practices for Customization

### 1. Start with Base Templates
- Use provided environment templates as starting points
- Gradually customize based on specific needs
- Maintain compatibility with existing systems

### 2. Document Customizations
- Document all custom configurations
- Explain rationale for customizations
- Maintain change logs for configuration updates

### 3. Test Thoroughly
- Test configurations in development first
- Validate against real-world scenarios
- Monitor performance impact of customizations

### 4. Version Control
- Use version control for all configuration files
- Tag configuration versions
- Maintain rollback capabilities

### 5. Monitor and Iterate
- Monitor effectiveness of customizations
- Collect feedback from development teams
- Iterate and improve configurations over time

## Migration and Rollback

### Configuration Migration

```bash
# Migrate from old configuration format
npm run config:migrate config/old-config.json

# Validate migrated configuration
npm run config:validate config/old-config.json --post-migration

# Test migrated configuration
npm run config:test config/old-config.json --migration-test
```

### Rollback Procedures

```bash
# Create backup before customization
npm run config:backup config/current-config.json

# Rollback to previous version
npm run config:rollback config/current-config.json --to-backup

# Emergency rollback to defaults
npm run config:reset-to-defaults
```

This customization guide provides comprehensive instructions for adapting the system prompt to your specific needs. Start with the provided templates and gradually customize based on your requirements, always testing thoroughly before deploying to production.