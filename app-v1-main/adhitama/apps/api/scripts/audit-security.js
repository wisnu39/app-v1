const fs = require('fs');
const path = require('path');

console.log('\n=== PHASE 3: SECURITY COVERAGE AUDIT ===\n');

const testFiles = [
  'src/modules/auth/services/auth.service.spec.ts',
  'src/modules/auth/services/auth-security.service.spec.ts',
  'src/modules/auth/services/session.service.spec.ts',
  'src/modules/auth/repositories/session.repository.spec.ts',
  'src/modules/auth/e2e/auth.e2e-spec.ts',
  'src/test/e2e/auth/auth.e2e-spec.ts',
];

const securityFlows = {
  'LOGIN': [
    'valid email login',
    'valid NIP login',
    'invalid email',
    'invalid NIP',
    'inactive account',
    'deleted account',
    'wrong password',
    'tenant mismatch',
    'audit logging',
  ],
  'REFRESH TOKEN': [
    'valid refresh',
    'expired refresh',
    'revoked refresh',
    'replay attack',
    'malformed token',
    'token rotation',
  ],
  'SESSION': [
    'create session',
    'revoke session',
    'revoke all sessions',
    'rotate session',
    'stale session handling',
  ],
  'EMAIL VERIFICATION': [
    'verify success',
    'verify expired token',
    'verify invalid token',
    'resend verification',
  ],
  'FORGOT PASSWORD': [
    'request reset',
    'reset success',
    'reset expired token',
    'reset invalid token',
  ],
  'THROTTLING': [
    'login throttle',
    'IP throttle',
    'refresh throttle',
    'Redis unavailable fallback',
  ],
};

const baseDir = '/workspaces/app-v1/adhitama/apps/api';

// Map test descriptions to security requirements
const testCoverage = {};
Object.keys(securityFlows).forEach(flow => {
  testCoverage[flow] = {};
  securityFlows[flow].forEach(item => {
    testCoverage[flow][item] = false;
  });
});

// Scan test files for coverage evidence
testFiles.forEach(testFile => {
  const fullPath = path.join(baseDir, testFile);
  if (!fs.existsSync(fullPath)) return;

  const content = fs.readFileSync(fullPath, 'utf8').toLowerCase();

  // Check LOGIN flows
  if (content.includes('login')) {
    if (content.includes('email') && (content.includes('success') || content.includes('valid'))) {
      testCoverage['LOGIN']['valid email login'] = true;
    }
    if (content.includes('nip') && (content.includes('success') || content.includes('valid'))) {
      testCoverage['LOGIN']['valid NIP login'] = true;
    }
    if (content.includes('invalid') || content.includes('not found')) {
      testCoverage['LOGIN']['invalid email'] = true;
      testCoverage['LOGIN']['invalid NIP'] = true;
    }
    if (content.includes('inactive')) {
      testCoverage['LOGIN']['inactive account'] = true;
    }
    if (content.includes('deleted') || content.includes('not exist')) {
      testCoverage['LOGIN']['deleted account'] = true;
    }
    if (content.includes('password') && content.includes('wrong')) {
      testCoverage['LOGIN']['wrong password'] = true;
    }
    if (content.includes('tenant') && content.includes('mismatch')) {
      testCoverage['LOGIN']['tenant mismatch'] = true;
    }
    if (content.includes('audit') || content.includes('log')) {
      testCoverage['LOGIN']['audit logging'] = true;
    }
  }

  // Check REFRESH TOKEN flows
  if (content.includes('refresh')) {
    if (content.includes('valid') || content.includes('success')) {
      testCoverage['REFRESH TOKEN']['valid refresh'] = true;
    }
    if (content.includes('expired')) {
      testCoverage['REFRESH TOKEN']['expired refresh'] = true;
    }
    if (content.includes('revoked')) {
      testCoverage['REFRESH TOKEN']['revoked refresh'] = true;
    }
    if (content.includes('replay') || content.includes('stale')) {
      testCoverage['REFRESH TOKEN']['replay attack'] = true;
    }
    if (content.includes('malformed') || content.includes('invalid token')) {
      testCoverage['REFRESH TOKEN']['malformed token'] = true;
    }
    if (content.includes('rotate')) {
      testCoverage['REFRESH TOKEN']['token rotation'] = true;
    }
  }

  // Check SESSION flows
  if (content.includes('session')) {
    if (content.includes('create')) {
      testCoverage['SESSION']['create session'] = true;
    }
    if (content.includes('revoke') && content.includes('single')) {
      testCoverage['SESSION']['revoke session'] = true;
    }
    if (content.includes('revoke') && content.includes('all')) {
      testCoverage['SESSION']['revoke all sessions'] = true;
    }
    if (content.includes('rotate')) {
      testCoverage['SESSION']['rotate session'] = true;
    }
    if (content.includes('stale')) {
      testCoverage['SESSION']['stale session handling'] = true;
    }
  }

  // Check EMAIL VERIFICATION flows
  if (content.includes('email') && content.includes('verif')) {
    if (content.includes('success') || content.includes('valid')) {
      testCoverage['EMAIL VERIFICATION']['verify success'] = true;
    }
    if (content.includes('expired')) {
      testCoverage['EMAIL VERIFICATION']['verify expired token'] = true;
    }
    if (content.includes('invalid')) {
      testCoverage['EMAIL VERIFICATION']['verify invalid token'] = true;
    }
    if (content.includes('resend')) {
      testCoverage['EMAIL VERIFICATION']['resend verification'] = true;
    }
  }

  // Check FORGOT PASSWORD flows
  if (content.includes('forgot') || content.includes('password reset')) {
    if (content.includes('request') || content.includes('send')) {
      testCoverage['FORGOT PASSWORD']['request reset'] = true;
    }
    if (content.includes('reset') && content.includes('success')) {
      testCoverage['FORGOT PASSWORD']['reset success'] = true;
    }
    if (content.includes('expired')) {
      testCoverage['FORGOT PASSWORD']['reset expired token'] = true;
    }
    if (content.includes('invalid')) {
      testCoverage['FORGOT PASSWORD']['reset invalid token'] = true;
    }
  }

  // Check THROTTLING flows
  if (content.includes('throttl') || content.includes('rate limit')) {
    if (content.includes('login')) {
      testCoverage['THROTTLING']['login throttle'] = true;
    }
    if (content.includes('ip')) {
      testCoverage['THROTTLING']['IP throttle'] = true;
    }
    if (content.includes('refresh')) {
      testCoverage['THROTTLING']['refresh throttle'] = true;
    }
    if (content.includes('redis') && content.includes('unavailable')) {
      testCoverage['THROTTLING']['Redis unavailable fallback'] = true;
    }
  }
});

// Report results
let passCount = 0;
let failCount = 0;

Object.entries(testCoverage).forEach(([flow, items]) => {
  console.log(`\n${flow}\n${'─'.repeat(flow.length)}`);
  
  Object.entries(items).forEach(([item, covered]) => {
    const status = covered ? '✓' : '✗';
    console.log(`${status} ${item}`);
    if (covered) passCount++; else failCount++;
  });
});

console.log(`\n${'═'.repeat(50)}`);
console.log(`\nCOVERAGE SUMMARY: ${passCount} ✓ / ${failCount} ✗ (${((passCount / (passCount + failCount)) * 100).toFixed(1)}%)\n`);

if (failCount > 0) {
  console.log('GAPS DETECTED:');
  Object.entries(testCoverage).forEach(([flow, items]) => {
    const gaps = Object.entries(items).filter(([_, covered]) => !covered);
    if (gaps.length > 0) {
      console.log(`  ${flow}: ${gaps.map(([item]) => item).join(', ')}`);
    }
  });
}
