#!/usr/bin/env node

/**
 * Configuration validation script for GansAuditor Codex
 * 
 * This script validates the current environment configuration and provides
 * recommendations for optimization and migration.
 */

import { 
  createRuntimeConfig, 
  getEnvironmentConfigSummary, 
  isSynchronousModeReady,
  generateMigrationRecommendations 
} from '../dist/src/config/synchronous-config.js';
import chalk from 'chalk';

function printHeader(title) {
  console.log('\n' + '='.repeat(60));
  console.log(chalk.bold.blue(title));
  console.log('='.repeat(60));
}

function printSection(title) {
  console.log('\n' + chalk.bold.yellow(title));
  console.log('-'.repeat(title.length));
}

function printSuccess(message) {
  console.log(chalk.green('✓ ' + message));
}

function printWarning(message) {
  console.log(chalk.yellow('⚠ ' + message));
}

function printError(message) {
  console.log(chalk.red('✗ ' + message));
}

function printInfo(message) {
  console.log(chalk.blue('ℹ ' + message));
}

async function validateConfiguration() {
  printHeader('GansAuditor Codex Configuration Validation');

  // 1. Environment Configuration Summary
  printSection('Environment Configuration Summary');
  const envConfig = getEnvironmentConfigSummary();
  
  console.log(`Core Settings:`);
  console.log(`  GAN Auditing: ${envConfig.enableGanAuditing ? chalk.green('Enabled') : chalk.red('Disabled')}`);
  console.log(`  Synchronous Mode: ${envConfig.enableSynchronousAudit ? chalk.green('Enabled') : chalk.red('Disabled')}`);
  console.log(`  Audit Timeout: ${envConfig.auditTimeoutSeconds}s`);
  console.log(`  Max Concurrent Audits: ${envConfig.maxConcurrentAudits}`);
  console.log(`  Max Concurrent Sessions: ${envConfig.maxConcurrentSessions}`);
  console.log(`  State Directory: ${envConfig.stateDirectory}`);

  console.log(`\nFeature Flags:`);
  console.log(`  Stagnation Detection: ${envConfig.enableStagnationDetection ? chalk.green('Enabled') : chalk.red('Disabled')}`);
  console.log(`  Codex Context Management: ${envConfig.enableCodexContextManagement ? chalk.green('Enabled') : chalk.red('Disabled')}`);
  console.log(`  Audit Caching: ${envConfig.enableAuditCaching ? chalk.green('Enabled') : chalk.red('Disabled')}`);
  console.log(`  Session Persistence: ${envConfig.enableSessionPersistence ? chalk.green('Enabled') : chalk.red('Disabled')}`);
  console.log(`  Metrics: ${envConfig.enableMetrics ? chalk.green('Enabled') : chalk.red('Disabled')}`);
  console.log(`  Health Checks: ${envConfig.enableHealthChecks ? chalk.green('Enabled') : chalk.red('Disabled')}`);

  // 2. Runtime Configuration Validation
  printSection('Runtime Configuration Validation');
  const { config, validation } = createRuntimeConfig();
  
  if (validation.isValid) {
    printSuccess('Configuration validation passed');
  } else {
    printError('Configuration validation failed');
    validation.errors.forEach(error => printError(`  ${error}`));
  }

  if (validation.warnings.length > 0) {
    console.log('\nWarnings:');
    validation.warnings.forEach(warning => printWarning(`  ${warning}`));
  }

  // 3. Synchronous Mode Readiness Check
  printSection('Synchronous Mode Readiness Check');
  const readinessCheck = isSynchronousModeReady();
  
  if (readinessCheck.ready) {
    printSuccess('Synchronous mode is ready');
  } else {
    printError('Synchronous mode is not ready');
    readinessCheck.issues.forEach(issue => printError(`  ${issue}`));
  }

  if (readinessCheck.recommendations.length > 0) {
    console.log('\nRecommendations:');
    readinessCheck.recommendations.forEach(rec => printInfo(`  ${rec}`));
  }

  // 4. Completion Criteria Analysis
  printSection('Completion Criteria Analysis');
  const { completionCriteria } = config;
  
  console.log(`Tier 1: ${completionCriteria.tier1.score}% at ${completionCriteria.tier1.maxLoops} loops`);
  console.log(`Tier 2: ${completionCriteria.tier2.score}% at ${completionCriteria.tier2.maxLoops} loops`);
  console.log(`Tier 3: ${completionCriteria.tier3.score}% at ${completionCriteria.tier3.maxLoops} loops`);
  console.log(`Hard Stop: ${completionCriteria.hardStop.maxLoops} loops`);
  console.log(`Stagnation Check: Start at loop ${completionCriteria.stagnationCheck.startLoop}, threshold ${completionCriteria.stagnationCheck.similarityThreshold}`);

  // Validate tier progression
  if (completionCriteria.tier1.score > completionCriteria.tier2.score && 
      completionCriteria.tier2.score > completionCriteria.tier3.score) {
    printSuccess('Score thresholds are properly ordered');
  } else {
    printWarning('Score thresholds may not be optimally ordered');
  }

  if (completionCriteria.tier1.maxLoops < completionCriteria.tier2.maxLoops && 
      completionCriteria.tier2.maxLoops < completionCriteria.tier3.maxLoops &&
      completionCriteria.tier3.maxLoops < completionCriteria.hardStop.maxLoops) {
    printSuccess('Loop limits are properly ordered');
  } else {
    printError('Loop limits are not properly ordered');
  }

  // 5. Performance Configuration Analysis
  printSection('Performance Configuration Analysis');
  const { auditTimeout, concurrency } = config;
  
  console.log(`Audit Timeout: ${auditTimeout.auditTimeoutSeconds}s`);
  console.log(`Progress Indicators: ${auditTimeout.enableProgressIndicators ? 'Enabled' : 'Disabled'} (${auditTimeout.progressIndicatorInterval}ms interval)`);
  console.log(`Timeout Retries: ${auditTimeout.timeoutRetryAttempts}`);
  console.log(`Partial Results on Timeout: ${auditTimeout.partialResultsOnTimeout ? 'Enabled' : 'Disabled'}`);

  console.log(`\nConcurrency Settings:`);
  console.log(`  Max Concurrent Audits: ${concurrency.maxConcurrentAudits}`);
  console.log(`  Max Concurrent Sessions: ${concurrency.maxConcurrentSessions}`);
  console.log(`  Queue Timeout: ${concurrency.queueTimeout}ms`);
  console.log(`  Audit Queue: ${concurrency.enableAuditQueue ? 'Enabled' : 'Disabled'}`);
  console.log(`  Session Cleanup Interval: ${concurrency.sessionCleanupInterval}ms`);
  console.log(`  Max Session Age: ${concurrency.maxSessionAge}ms`);

  // Performance recommendations
  if (auditTimeout.auditTimeoutSeconds < 20) {
    printWarning('Audit timeout may be too short for complex code reviews');
  } else if (auditTimeout.auditTimeoutSeconds > 60) {
    printWarning('Audit timeout may be too long, consider reducing for better responsiveness');
  } else {
    printSuccess('Audit timeout is within recommended range');
  }

  if (concurrency.maxConcurrentAudits > 20) {
    printWarning('High concurrency may impact system performance');
  } else if (concurrency.maxConcurrentAudits < 2) {
    printWarning('Low concurrency may limit throughput');
  } else {
    printSuccess('Concurrency settings are reasonable');
  }

  // 6. Migration Recommendations
  printSection('Migration Recommendations');
  const migration = generateMigrationRecommendations();
  
  if (migration.recommendations.length === 0) {
    printSuccess('No migration recommendations - configuration is optimal');
  } else {
    console.log('Configuration improvements available:');
    
    const highPriority = migration.recommendations.filter(r => r.priority === 'high');
    const mediumPriority = migration.recommendations.filter(r => r.priority === 'medium');
    const lowPriority = migration.recommendations.filter(r => r.priority === 'low');

    if (highPriority.length > 0) {
      console.log('\n' + chalk.red.bold('High Priority:'));
      highPriority.forEach(rec => {
        console.log(chalk.red(`  • ${rec.description}`));
        if (rec.envVar && rec.suggestedValue) {
          console.log(chalk.gray(`    ${rec.envVar}=${rec.suggestedValue}`));
        }
      });
    }

    if (mediumPriority.length > 0) {
      console.log('\n' + chalk.yellow.bold('Medium Priority:'));
      mediumPriority.forEach(rec => {
        console.log(chalk.yellow(`  • ${rec.description}`));
        if (rec.envVar && rec.suggestedValue) {
          console.log(chalk.gray(`    ${rec.envVar}=${rec.suggestedValue}`));
        }
      });
    }

    if (lowPriority.length > 0) {
      console.log('\n' + chalk.blue.bold('Low Priority:'));
      lowPriority.forEach(rec => {
        console.log(chalk.blue(`  • ${rec.description}`));
        if (rec.envVar && rec.suggestedValue) {
          console.log(chalk.gray(`    ${rec.envVar}=${rec.suggestedValue}`));
        }
      });
    }
  }

  // 7. Summary and Next Steps
  printSection('Summary and Next Steps');
  
  const totalIssues = validation.errors.length + readinessCheck.issues.length;
  const totalWarnings = validation.warnings.length + readinessCheck.recommendations.length;
  
  if (totalIssues === 0 && totalWarnings === 0) {
    printSuccess('Configuration is optimal and ready for production');
  } else if (totalIssues === 0) {
    printWarning(`Configuration is functional but has ${totalWarnings} optimization opportunities`);
  } else {
    printError(`Configuration has ${totalIssues} critical issues that must be addressed`);
  }

  console.log('\nNext Steps:');
  if (totalIssues > 0) {
    console.log('1. Address critical configuration issues listed above');
    console.log('2. Re-run this validation script to verify fixes');
  }
  if (totalWarnings > 0) {
    console.log('3. Consider implementing recommended optimizations');
  }
  console.log('4. Test configuration with your typical workload');
  console.log('5. Monitor performance metrics after deployment');

  // Exit with appropriate code
  process.exit(totalIssues > 0 ? 1 : 0);
}

// Handle command line arguments
const args = process.argv.slice(2);
if (args.includes('--help') || args.includes('-h')) {
  console.log('Usage: node scripts/validate-config.js [options]');
  console.log('');
  console.log('Options:');
  console.log('  --help, -h     Show this help message');
  console.log('  --json         Output results in JSON format');
  console.log('');
  console.log('This script validates the GansAuditor Codex configuration and provides');
  console.log('recommendations for optimization and migration.');
  process.exit(0);
}

if (args.includes('--json')) {
  // JSON output mode for programmatic use
  const envConfig = getEnvironmentConfigSummary();
  const { config, validation } = createRuntimeConfig();
  const readinessCheck = isSynchronousModeReady();
  const migration = generateMigrationRecommendations();

  const result = {
    timestamp: new Date().toISOString(),
    environment: envConfig,
    validation: validation,
    readiness: readinessCheck,
    migration: migration,
    summary: {
      isValid: validation.isValid && readinessCheck.ready,
      criticalIssues: validation.errors.length + readinessCheck.issues.length,
      warnings: validation.warnings.length + readinessCheck.recommendations.length,
      recommendations: migration.recommendations.length,
    }
  };

  console.log(JSON.stringify(result, null, 2));
  process.exit(result.summary.criticalIssues > 0 ? 1 : 0);
} else {
  // Interactive mode
  validateConfiguration().catch(error => {
    console.error(chalk.red('Validation script failed:'), error);
    process.exit(1);
  });
}