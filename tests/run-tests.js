#!/usr/bin/env node

/**
 * Simple test runner for wishlist data integrity tests
 * Run with: node tests/run-tests.js
 */

const path = require('path');

// Mock require for TypeScript imports
require('ts-node').register({
  transpileOnly: true,
  compilerOptions: {
    module: 'commonjs',
    target: 'es2020',
    esModuleInterop: true,
    skipLibCheck: true,
  },
});

// Run the tests
const { runAllTests } = require('./wishlist-data-integrity.test.ts');

runAllTests().catch((err) => {
  console.error('Test runner error:', err);
  process.exit(1);
});
