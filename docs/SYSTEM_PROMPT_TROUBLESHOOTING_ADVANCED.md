# Advanced System Prompt Troubleshooting Guide

This comprehensive troubleshooting guide addresses complex issues specific to the GAN Auditor System Prompt implementation, including workflow problems, quality assessment issues, and integration challenges.

## Table of Contents

1. [Diagnostic Tools and Commands](#diagnostic-tools-and-commands)
2. [System Prompt Loading Issues](#system-prompt-loading-issues)
3. [Workflow Execution Problems](#workflow-execution-problems)
4. [Quality Assessment Issues](#quality-assessment-issues)
5. [Completion Criteria Problems](#completion-criteria-problems)
6. [Integration and Session Issues](#integration-and-session-issues)
7. [Performance and Resource Problems](#performance-and-resource-problems)
8. [Security and Validation Issues](#security-and-validation-issues)
9. [Advanced Debugging Techniques](#advanced-debugging-techniques)
10. [Emergency Recovery Procedures](#emergency-recovery-procedures)

## Diagnostic Tools and Commands

### Quick Health Check

```bash
# Comprehensive system prompt health check
npm run system-prompt:health-check

# Check system prompt configuration
npm run system-prompt:validate-config

# Test system prompt loading
npm run system-prompt:test-load

# Verify integration points
npm run system-prompt:test-integration
```

### Detailed Diagnostics

```bash
# Generate comprehensive diagnostic report
npm run system-prompt:diagnostics --output diagnostics-report.html

# Check workflow step execution
npm run system-prompt:test-workflow --step-by-step

# Validate quality assessment framework
npm run system-prompt:test-quality-framework

# Test completion criteria logic
npm run system-prompt:test-completion-criteria
```

### Debug Mode Activation

```bash
# Enable comprehensive debugging
export GAN_AUDITOR_DEBUG_MODE=true
export GAN_AUDITOR_LOG_LEVEL=debug
export DEBUG=system-prompt:*,audit-workflow:*,quality-assessment:*

# Run with detailed logging
npm run audit:start --debug --session-id debug-session
```

## System Prompt Loading Issues

### Issue: System Prompt Not Loading

**Symptoms:**
- Audits run without system prompt behavior
- Default auditor behavior instead of "Kilo Code"
- No structured workflow execution
- Missing quality assessment framework

**Diagnosis:**
```bash
# Check if system prompt is enabled
echo $GAN_AUDITOR_PROMPT_ENABLED

# Verify configuration loading
npm run system-prompt:test-config-loading

# Check configuration file existence and permissions
ls -la config/system-prompt*.json

# Test configuration parsing
npm run config:parse config/system-prompt.json --verbose
```

**Solutions:**

1. **Enable System Prompt:**
   ```bash
   export GAN_AUDITOR_PROMPT_ENABLED=true
   export GAN_AUDITOR_IDENTITY_NAME="Kilo Code"
   ```

2. **Fix Configuration Path:**
   ```bash
   # Check configuration file path
   npm run config:find-config

   # Set explicit configuration path
   export GAN_AUDITOR_CONFIG_PATH="/full/path/to/config/system-prompt.json"
   ```

3. **Validate Configuration Structure:**
   ```bash
   # Validate against schema
   npm run config:validate config/system-prompt.json --schema

   # Compare with working template
   npm run config:create config/template.json development
   diff config/template.json config/system-prompt.json
   ```

### Issue: Configuration Loading Errors

**Symptoms:**
- JSON parsing errors
- Schema validation failures
- Missing required fields errors

**Solutions:**

1. **Fix JSON Syntax:**
   ```bash
   # Validate JSON syntax
   cat config/system-prompt.json | jq '.'

   # Fix common JSON issues
   npm run config:fix-json config/system-prompt.json
   ```

2. **Complete Missing Fields:**
   ```json
   {
     "version": "2.0.0",
     "systemPrompt": {
       "identity": {
         "name": "Kilo Code",
         "role": "Adversarial Auditor",
         "stance": "constructive-adversarial",
         "authority": "spec-and-steering-ground-truth"
       }
     }
   }
   ```

## Workflow Execution Problems

### Issue: Workflow Steps Not Executing

**Symptoms:**
- Steps skipped or not executed
- Workflow completes too quickly
- Missing step outputs in audit results

**Diagnosis:**
```bash
# Test individual workflow steps
npm run workflow:test-step INIT --session-id test-session
npm run workflow:test-step STATIC --session-id test-session

# Check workflow configuration
npm run workflow:validate-config config/system-prompt.json

# Debug workflow execution
npm run workflow:debug --session-id debug-session --step-by-step
```

**Solutions:**

1. **Enable Workflow Order Enforcement:**
   ```json
   {
     "workflow": {
       "enforceOrder": true,
       "allowSkipping": false,
       "evidenceRequired": true
     }
   }
   ```

2. **Check Custom Step Configuration:**
   ```json
   {
     "workflow": {
       "customSteps": [
         {
           "name": "SECURITY_SCAN",
           "position": "after:DYNAMIC",
           "description": "Security vulnerability scanning",
           "required": true,
           "timeout": 30000
         }
       ]
     }
   }
   ```

3. **Verify Step Dependencies:**
   ```bash
   # Check if required tools are available
   which codex
   which git
   which npm

   # Test tool execution
   npm run tools:test-availability
   ```

### Issue: Workflow Steps Failing

**Symptoms:**
- Individual steps return errors
- Workflow terminates early
- Step execution timeouts

**Solutions:**

1. **Increase Step Timeouts:**
   ```json
   {
     "workflow": {
       "stepTimeouts": {
         "INIT": 10000,
         "REPRO": 15000,
         "STATIC": 30000,
         "TESTS": 60000,
         "DYNAMIC": 45000,
         "CONFORM": 20000,
         "TRACE": 15000,
         "VERDICT": 10000
       }
     }
   }
   ```

2. **Debug Specific Step:**
   ```bash
   # Debug STATIC step
   npm run workflow:debug-step STATIC --session-id debug-session

   # Check step prerequisites
   npm run workflow:check-prerequisites STATIC

   # Test step in isolation
   npm run workflow:test-step-isolated STATIC
   ```

### Issue: Custom Workflow Steps Not Working

**Symptoms:**
- Custom steps ignored
- Custom step execution errors
- Integration failures with custom steps

**Solutions:**

1. **Validate Custom Step Configuration:**
   ```json
   {
     "workflow": {
       "customSteps": [
         {
           "name": "CUSTOM_STEP",
           "position": "after:TESTS",
           "description": "Custom validation step",
           "required": true,
           "executor": "custom-step-executor.js",
           "config": {
             "timeout": 30000,
             "retries": 3
           }
         }
       ]
     }
   }
   ```

2. **Test Custom Step Executor:**
   ```bash
   # Test custom step executor
   node custom-step-executor.js --test

   # Validate custom step integration
   npm run workflow:test-custom-step CUSTOM_STEP
   ```

## Quality Assessment Issues

### Issue: Quality Scores Incorrect

**Symptoms:**
- Unrealistic quality scores (too high/low)
- Inconsistent scoring across similar code
- Quality dimensions not properly weighted

**Diagnosis:**
```bash
# Test quality assessment calculation
npm run quality:test-calculation --session-id test-session

# Debug dimensional scoring
npm run quality:debug-dimensions --session-id test-session

# Validate quality framework configuration
npm run quality:validate-framework config/system-prompt.json
```

**Solutions:**

1. **Verify Quality Framework Configuration:**
   ```json
   {
     "qualityFramework": {
       "dimensions": 6,
       "weights": {
         "correctnessCompleteness": 0.30,
         "tests": 0.20,
         "styleConventions": 0.15,
         "security": 0.15,
         "performance": 0.10,
         "docsTraceability": 0.10
       },
       "scoringScale": "0-100",
       "aggregationMethod": "weighted-average"
     }
   }
   ```

2. **Test Individual Quality Assessors:**
   ```bash
   # Test correctness assessor
   npm run quality:test-assessor correctness-completeness

   # Test security assessor
   npm run quality:test-assessor security

   # Debug assessor calculations
   npm run quality:debug-assessor tests --session-id debug-session
   ```

### Issue: Custom Quality Dimensions Not Working

**Symptoms:**
- Custom dimensions ignored in scoring
- Custom dimension calculation errors
- Integration issues with custom assessors

**Solutions:**

1. **Validate Custom Dimension Configuration:**
   ```json
   {
     "qualityFramework": {
       "customDimensions": [
         {
           "name": "accessibility",
           "weight": 0.1,
           "assessor": "accessibility-assessor.js",
           "criteria": [
             "WCAG 2.1 AA compliance",
             "Screen reader compatibility"
           ],
           "scoringMethod": "checklist"
         }
       ]
     }
   }
   ```

2. **Test Custom Assessor:**
   ```bash
   # Test custom assessor
   node accessibility-assessor.js --test

   # Validate assessor integration
   npm run quality:test-custom-assessor accessibility
   ```

## Completion Criteria Problems

### Issue: Audits Not Completing

**Symptoms:**
- Audits run indefinitely
- Completion criteria never met
- Kill switches not triggering

**Diagnosis:**
```bash
# Test completion criteria logic
npm run completion:test-criteria --session-id test-session

# Debug completion evaluation
npm run completion:debug --session-id debug-session

# Check kill switch configuration
npm run completion:test-kill-switches
```

**Solutions:**

1. **Adjust Completion Thresholds:**
   ```json
   {
     "completionCriteria": {
       "tierThresholds": {
         "tier1": { "score": 85, "minLoops": 5 },
         "tier2": { "score": 75, "minLoops": 8 },
         "tier3": { "score": 65, "minLoops": 10 }
       },
       "maxIterations": 20
     }
   }
   ```

2. **Enable Kill Switches:**
   ```json
   {
     "completionCriteria": {
       "killSwitches": [
         {
           "name": "max-iterations",
           "condition": "loops >= 25",
           "action": "terminate"
         },
         {
           "name": "stagnation",
           "condition": "loops >= 10 && similarity > 0.95",
           "action": "escalate"
         }
       ]
     }
   }
   ```

### Issue: Premature Completion

**Symptoms:**
- Audits complete too early
- Low quality scores accepted
- Insufficient iteration count

**Solutions:**

1. **Increase Quality Thresholds:**
   ```json
   {
     "completionCriteria": {
       "tierThresholds": {
         "tier1": { "score": 95, "minLoops": 10 },
         "tier2": { "score": 90, "minLoops": 15 },
         "tier3": { "score": 85, "minLoops": 20 }
       }
     }
   }
   ```

2. **Add Minimum Iteration Requirements:**
   ```json
   {
     "completionCriteria": {
       "minimumIterations": 5,
       "requireAllDimensionsPass": true,
       "criticalIssueThreshold": 0
     }
   }
   ```

## Integration and Session Issues

### Issue: Session Continuity Problems

**Symptoms:**
- Session state not preserved
- Context lost between iterations
- Audit history not maintained

**Diagnosis:**
```bash
# Test session management
npm run session:test-continuity --session-id test-session

# Check session state persistence
npm run session:validate-state --session-id test-session

# Debug session integration
npm run session:debug --session-id debug-session
```

**Solutions:**

1. **Verify Session Configuration:**
   ```json
   {
     "integration": {
       "sessionManagement": true,
       "contextAwareness": true,
       "sessionPersistence": true
     }
   }
   ```

2. **Check Session State Directory:**
   ```bash
   # Verify session state directory exists
   ls -la .mcp-gan-state/

   # Check session file permissions
   ls -la .mcp-gan-state/*.json

   # Fix permissions if needed
   chmod 644 .mcp-gan-state/*.json
   ```

### Issue: Codex Integration Failures

**Symptoms:**
- Codex CLI not responding
- System prompt not passed to Codex
- Audit execution errors

**Solutions:**

1. **Test Codex CLI Integration:**
   ```bash
   # Test Codex CLI availability
   which codex
   codex --version

   # Test Codex CLI with system prompt
   npm run codex:test-integration --with-system-prompt

   # Debug Codex CLI execution
   npm run codex:debug --session-id debug-session
   ```

2. **Verify Codex Configuration:**
   ```json
   {
     "integration": {
       "codexIntegration": true,
       "codexExecutable": "/path/to/codex",
       "systemPromptEnabled": true
     }
   }
   ```

## Performance and Resource Problems

### Issue: Slow Audit Execution

**Symptoms:**
- Audits take too long to complete
- Timeout errors
- Resource exhaustion

**Diagnosis:**
```bash
# Profile audit performance
npm run performance:profile --session-id test-session

# Monitor resource usage
npm run performance:monitor --duration 300

# Check performance configuration
npm run performance:validate-config config/system-prompt.json
```

**Solutions:**

1. **Optimize Performance Settings:**
   ```json
   {
     "performance": {
       "contextTokenLimit": 150000,
       "auditTimeoutMs": 30000,
       "enableCaching": true,
       "maxConcurrentAudits": 3,
       "compressionEnabled": true
     }
   }
   ```

2. **Enable Performance Optimizations:**
   ```json
   {
     "performance": {
       "aggressiveCaching": true,
       "parallelProcessing": true,
       "contextPruning": true,
       "streamingMode": true
     }
   }
   ```

### Issue: Memory Usage Problems

**Symptoms:**
- High memory consumption
- Out of memory errors
- Memory leaks

**Solutions:**

1. **Reduce Memory Usage:**
   ```json
   {
     "performance": {
       "memoryLimit": "256MB",
       "contextTokenLimit": 100000,
       "enableProgressTracking": false,
       "garbageCollection": "aggressive"
     }
   }
   ```

2. **Monitor Memory Usage:**
   ```bash
   # Monitor memory usage
   npm run monitoring:memory --interval 30

   # Check for memory leaks
   npm run diagnostics:memory-leaks

   # Profile memory usage
   npm run performance:memory-profile
   ```

## Security and Validation Issues

### Issue: PII Sanitization Not Working

**Symptoms:**
- Sensitive data in audit outputs
- PII detection failures
- Security compliance violations

**Solutions:**

1. **Enable PII Sanitization:**
   ```json
   {
     "security": {
       "sanitizePII": true,
       "piiDetectionPatterns": [
         "email",
         "phone",
         "ssn",
         "credit_card"
       ]
     }
   }
   ```

2. **Test PII Sanitization:**
   ```bash
   # Test PII detection
   npm run security:test-pii-detection

   # Validate sanitization
   npm run security:test-sanitization --input "test@example.com"
   ```

### Issue: Command Validation Problems

**Symptoms:**
- Commands blocked incorrectly
- Security validation too strict
- Command execution failures

**Solutions:**

1. **Adjust Command Validation Level:**
   ```json
   {
     "security": {
       "validateCommands": true,
       "commandValidationLevel": "moderate",
       "allowedCommands": [
         "git status",
         "npm test",
         "npm run lint"
       ]
     }
   }
   ```

2. **Test Command Validation:**
   ```bash
   # Test command validation
   npm run security:test-command-validation "git status"

   # Add command to whitelist
   npm run security:add-allowed-command "custom-command"
   ```

## Advanced Debugging Techniques

### Enable Comprehensive Logging

```bash
# Enable all debug logging
export DEBUG=*
export GAN_AUDITOR_LOG_LEVEL=trace
export GAN_AUDITOR_VERBOSE_LOGGING=true

# Log to file
npm run audit:start --session-id debug-session 2>&1 | tee audit-debug.log
```

### Step-by-Step Debugging

```bash
# Debug workflow step by step
npm run workflow:debug-interactive --session-id debug-session

# Pause at each step
npm run workflow:step-through --session-id debug-session

# Debug specific component
npm run debug:quality-assessment --session-id debug-session
npm run debug:completion-criteria --session-id debug-session
```

### Performance Profiling

```bash
# Profile entire audit process
npm run profile:audit --session-id profile-session

# Profile specific components
npm run profile:workflow --session-id profile-session
npm run profile:quality-assessment --session-id profile-session

# Generate performance report
npm run performance:report --output performance-report.html
```

### Memory Debugging

```bash
# Enable memory debugging
export NODE_OPTIONS="--inspect --max-old-space-size=4096"

# Profile memory usage
npm run profile:memory --session-id memory-profile

# Check for memory leaks
npm run debug:memory-leaks --duration 600
```

## Emergency Recovery Procedures

### Complete System Reset

```bash
# Stop all running audits
npm run audit:stop-all

# Clear all caches
npm run cache:clear-all

# Reset configuration to defaults
npm run config:reset-to-defaults

# Restart system
npm run restart
```

### Configuration Rollback

```bash
# List available backups
npm run config:list-backups

# Rollback to previous configuration
npm run config:rollback --to-backup config/system-prompt.json.backup.20240115_103000

# Validate rollback
npm run config:validate config/system-prompt.json
```

### Session Recovery

```bash
# List corrupted sessions
npm run session:list-corrupted

# Recover session from backup
npm run session:recover --session-id corrupted-session

# Clean up corrupted sessions
npm run session:cleanup-corrupted
```

### Emergency Disable

```bash
# Disable system prompt temporarily
export GAN_AUDITOR_PROMPT_ENABLED=false

# Use fallback configuration
export GAN_AUDITOR_FALLBACK_MODE=true

# Restart with minimal configuration
npm run start:minimal
```

## Getting Additional Help

### Diagnostic Report Generation

```bash
# Generate comprehensive diagnostic report
npm run diagnostics:comprehensive --output full-diagnostics.zip

# Include system information
npm run diagnostics:system-info

# Include configuration audit
npm run diagnostics:config-audit

# Include performance metrics
npm run diagnostics:performance-metrics
```

### Support Information Collection

When contacting support, include:

1. **System Information:**
   ```bash
   npm run diagnostics:system-info > system-info.txt
   ```

2. **Configuration Details:**
   ```bash
   npm run config:export-sanitized > config-export.json
   ```

3. **Error Logs:**
   ```bash
   tail -1000 logs/system-prompt.log > error-logs.txt
   ```

4. **Performance Metrics:**
   ```bash
   npm run performance:export-metrics > performance-metrics.json
   ```

5. **Session State:**
   ```bash
   npm run session:export-state --session-id problem-session > session-state.json
   ```

This advanced troubleshooting guide should help resolve complex system prompt issues. For additional support, refer to the main documentation or contact the development team with the diagnostic information collected using the procedures above.