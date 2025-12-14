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

// Check client.ts - look for the actual setting, not just the string
checkFile('lib/supabase/client.ts', [
  { type: 'regex', pattern: /autoRefreshToken:\s*(false|AUTO_REFRESH_TOKEN)/, shouldMatch: true },
  { type: 'regex', pattern: /autoRefreshToken:\s*true/, shouldMatch: false },
  { type: 'mustContain', value: 'LOCKED CONFIG' },
]);

// Check server.ts - look for the actual setting
checkFile('lib/supabase/server.ts', [
  { type: 'regex', pattern: /autoRefreshToken:\s*(false|AUTO_REFRESH_TOKEN)/, shouldMatch: true },
  { type: 'regex', pattern: /autoRefreshToken:\s*true/, shouldMatch: false },
  { type: 'mustContain', value: 'LOCKED CONFIG' },
]);

// Check middleware.ts - look for actual code usage, not comments
// We need to check if these are in actual code (not comments)
function checkMiddleware(filePath) {
  const fullPath = path.join(process.cwd(), filePath);
  if (!fs.existsSync(fullPath)) {
    errors.push(`❌ File not found: ${filePath}`);
    return;
  }

  const content = fs.readFileSync(fullPath, 'utf8');
  
  // Remove comments to check only actual code
  const withoutComments = content
    .replace(/\/\*[\s\S]*?\*\//g, '') // Remove block comments
    .replace(/\/\/.*$/gm, ''); // Remove line comments
  
  // Check for forbidden patterns in actual code
  if (withoutComments.match(/await\s+supabase\.auth\.getUser\(\)/)) {
    errors.push(`❌ ${filePath}: Contains getUser() call in actual code`);
  } else {
    console.log(`✅ ${filePath}: No getUser() calls in code`);
  }
  
  if (withoutComments.match(/await\s+supabase\.auth\.getSession\(\)/)) {
    errors.push(`❌ ${filePath}: Contains getSession() call in actual code`);
  } else {
    console.log(`✅ ${filePath}: No getSession() calls in code`);
  }
  
  if (content.includes('DO NOT MAKE ANY AUTH CALLS')) {
    console.log(`✅ ${filePath}: Contains warning comment`);
  }
  
  if (content.includes('LOCKED MIDDLEWARE')) {
    console.log(`✅ ${filePath}: Contains locked config marker`);
  }
}

// Check auth-context.tsx - look for actual listener setup, not comments
function checkAuthContext(filePath) {
  const fullPath = path.join(process.cwd(), filePath);
  if (!fs.existsSync(fullPath)) {
    errors.push(`❌ File not found: ${filePath}`);
    return;
  }

  const content = fs.readFileSync(fullPath, 'utf8');
  
  // Remove comments to check only actual code
  const withoutComments = content
    .replace(/\/\*[\s\S]*?\*\//g, '') // Remove block comments
    .replace(/\/\/.*$/gm, ''); // Remove line comments
  
  // Check for forbidden patterns in actual code
  if (withoutComments.match(/supabase\.auth\.onAuthStateChange\(/)) {
    errors.push(`❌ ${filePath}: Contains onAuthStateChange() call in actual code`);
  } else {
    console.log(`✅ ${filePath}: No onAuthStateChange() calls in code`);
  }
  
  if (content.includes('DO NOT ENABLE onAuthStateChange')) {
    console.log(`✅ ${filePath}: Contains warning comment`);
  }
}

checkMiddleware('middleware.ts');
checkAuthContext('contexts/auth-context.tsx');

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

