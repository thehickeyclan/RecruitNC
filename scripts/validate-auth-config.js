#!/usr/bin/env node

/**
 * Auth Configuration Validator
 * 
 * This script validates that critical auth settings are locked correctly.
 * Run this before deploying to ensure rate limiting won't occur.
 * 
 * Usage: node scripts/validate-auth-config.js
 */

const fs = require('fs');
const path = require('path');

const errors = [];
const warnings = [];

function checkFile(filePath, checks) {
  const fullPath = path.join(process.cwd(), filePath);
  if (!fs.existsSync(fullPath)) {
    errors.push(`❌ File not found: ${filePath}`);
    return;
  }

  const content = fs.readFileSync(fullPath, 'utf8');
  
  checks.forEach(check => {
    if (check.type === 'mustContain') {
      if (!content.includes(check.value)) {
        errors.push(`❌ ${filePath}: Missing required value "${check.value}"`);
      } else {
        console.log(`✅ ${filePath}: Contains "${check.value}"`);
      }
    } else if (check.type === 'mustNotContain') {
      if (content.includes(check.value)) {
        errors.push(`❌ ${filePath}: Contains forbidden value "${check.value}"`);
      } else {
        console.log(`✅ ${filePath}: Does not contain "${check.value}"`);
      }
    } else if (check.type === 'regex') {
      const match = content.match(check.pattern);
      if (match) {
        if (check.shouldMatch === false) {
          errors.push(`❌ ${filePath}: Contains forbidden pattern: ${check.pattern}`);
        } else {
          console.log(`✅ ${filePath}: Matches required pattern`);
        }
      } else {
        if (check.shouldMatch !== false) {
          errors.push(`❌ ${filePath}: Does not match required pattern: ${check.pattern}`);
        } else {
          console.log(`✅ ${filePath}: Does not match forbidden pattern`);
        }
      }
    }
  });
}

console.log('🔒 Validating Auth Configuration...\n');

// Check client.ts
checkFile('lib/supabase/client.ts', [
  { type: 'mustContain', value: 'autoRefreshToken: false' },
  { type: 'mustNotContain', value: 'autoRefreshToken: true' },
  { type: 'mustContain', value: 'LOCKED CONFIG' },
]);

// Check server.ts
checkFile('lib/supabase/server.ts', [
  { type: 'mustContain', value: 'autoRefreshToken: false' },
  { type: 'mustNotContain', value: 'autoRefreshToken: true' },
  { type: 'mustContain', value: 'LOCKED CONFIG' },
]);

// Check middleware.ts
checkFile('middleware.ts', [
  { type: 'mustNotContain', value: 'supabase.auth.getUser()' },
  { type: 'mustNotContain', value: 'supabase.auth.getSession()' },
  { type: 'mustContain', value: 'DO NOT MAKE ANY AUTH CALLS' },
  { type: 'mustContain', value: 'LOCKED MIDDLEWARE' },
]);

// Check auth-context.tsx
checkFile('contexts/auth-context.tsx', [
  { type: 'mustNotContain', value: 'onAuthStateChange' },
  { type: 'mustContain', value: 'DO NOT ENABLE onAuthStateChange' },
]);

// Check for documentation
if (!fs.existsSync(path.join(process.cwd(), 'AUTH_CONFIG_LOCKED.md'))) {
  warnings.push('⚠️  AUTH_CONFIG_LOCKED.md not found - documentation missing');
} else {
  console.log('✅ AUTH_CONFIG_LOCKED.md exists');
}

console.log('\n' + '='.repeat(50));

if (errors.length > 0) {
  console.log('\n❌ VALIDATION FAILED - Critical issues found:\n');
  errors.forEach(error => console.log(error));
  console.log('\n🚨 DO NOT DEPLOY - These issues will cause rate limiting!\n');
  process.exit(1);
} else {
  console.log('\n✅ VALIDATION PASSED - Auth configuration is locked correctly!\n');
  if (warnings.length > 0) {
    console.log('⚠️  Warnings:');
    warnings.forEach(warning => console.log(warning));
  }
  process.exit(0);
}

