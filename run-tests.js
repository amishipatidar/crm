#!/usr/bin/env node

/**
 * Test Runner Script
 * Runs the SMS webhook tests and displays results
 */

const { spawn } = require('child_process');
const path = require('path');

console.log('🚀 Starting SMS Webhook Test Suite...\n');

// Test configurations
const testConfigs = [
  {
    name: 'SMS Webhook Commands',
    script: 'jest',
    args: ['tests/sms-webhook.test.js', '--verbose'],
    description: 'Tests all SMS command functionality'
  },
  {
    name: 'API Response Format',
    script: 'jest',
    args: ['tests/api-responses.test.js', '--verbose'],
    description: 'Tests webhook response formats and TwiML'
  }
];

async function runTest(config) {
  return new Promise((resolve, reject) => {
    console.log(`\n📋 Running: ${config.name}`);
    console.log(`📝 Description: ${config.description}`);
    console.log('─'.repeat(50));

    const testProcess = spawn(config.script, config.args, {
      stdio: 'inherit',
      shell: true
    });

    testProcess.on('close', (code) => {
      if (code === 0) {
        console.log(`✅ ${config.name} - PASSED`);
        resolve(true);
      } else {
        console.log(`❌ ${config.name} - FAILED (exit code: ${code})`);
        resolve(false);
      }
    });

    testProcess.on('error', (error) => {
      console.error(`❌ Error running ${config.name}:`, error);
      reject(error);
    });
  });
}

async function runAllTests() {
  const results = [];
  
  try {
    for (const config of testConfigs) {
      const result = await runTest(config);
      results.push({ name: config.name, passed: result });
    }
    
    // Summary
    console.log('\n' + '='.repeat(60));
    console.log('📊 TEST SUMMARY');
    console.log('='.repeat(60));
    
    const passed = results.filter(r => r.passed).length;
    const total = results.length;
    
    results.forEach(result => {
      const status = result.passed ? '✅ PASSED' : '❌ FAILED';
      console.log(`${status} - ${result.name}`);
    });
    
    console.log('─'.repeat(60));
    console.log(`📈 Results: ${passed}/${total} test suites passed`);
    
    if (passed === total) {
      console.log('🎉 All tests passed! Your SMS webhook is working correctly.');
      process.exit(0);
    } else {
      console.log('⚠️  Some tests failed. Please check the output above.');
      process.exit(1);
    }
    
  } catch (error) {
    console.error('💥 Fatal error running tests:', error);
    process.exit(1);
  }
}

// Handle command line arguments
const args = process.argv.slice(2);

if (args.includes('--help') || args.includes('-h')) {
  console.log(`
SMS Webhook Test Runner

Usage:
  node run-tests.js [options]

Options:
  --help, -h     Show this help message
  --coverage     Run tests with coverage report
  --watch        Run tests in watch mode
  --webhook      Run only webhook command tests
  --api          Run only API response tests

Examples:
  node run-tests.js                    # Run all tests
  node run-tests.js --coverage         # Run with coverage
  node run-tests.js --webhook          # Run webhook tests only
  node run-tests.js --api              # Run API tests only

Test Commands Covered:
  ✅ CREATE_LEAD - Add new leads via SMS
  ✅ UPDATE_LEAD - Update existing leads
  ✅ SET_FOLLOWUP - Schedule follow-ups
  ✅ GET_LEAD_STATUS - Get lead information
  ✅ LIST_LEADS - List all leads
  ✅ HELP - Show help message
  ✅ Error handling and edge cases
  ✅ API response format validation
`);
  process.exit(0);
}

// Handle specific test options
if (args.includes('--webhook')) {
  const webhookConfig = testConfigs.find(c => c.name === 'SMS Webhook Commands');
  runTest(webhookConfig).then(passed => process.exit(passed ? 0 : 1));
} else if (args.includes('--api')) {
  const apiConfig = testConfigs.find(c => c.name === 'API Response Format');
  runTest(apiConfig).then(passed => process.exit(passed ? 0 : 1));
} else if (args.includes('--coverage')) {
  console.log('📊 Running tests with coverage report...\n');
  const coverageProcess = spawn('jest', ['--coverage'], {
    stdio: 'inherit',
    shell: true
  });
  coverageProcess.on('close', (code) => process.exit(code));
} else if (args.includes('--watch')) {
  console.log('👀 Running tests in watch mode...\n');
  const watchProcess = spawn('jest', ['--watch'], {
    stdio: 'inherit',
    shell: true
  });
  watchProcess.on('close', (code) => process.exit(code));
} else {
  // Run all tests
  runAllTests();
}
