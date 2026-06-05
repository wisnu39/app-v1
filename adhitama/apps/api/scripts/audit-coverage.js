const fs = require('fs');
const path = require('path');

const cov = JSON.parse(fs.readFileSync('coverage/coverage-final.json', 'utf8'));

// List all auth files
const allAuthFiles = Object.keys(cov).filter(p => p.includes('src/modules/auth') && p.endsWith('.ts'));

// Filter for service/repository/controller files (exclude specs, types, dto)
const keyFiles = allAuthFiles.filter(p => {
  const name = p.toLowerCase();
  return (
    (name.includes('service') || name.includes('repository') || name.includes('controller')) &&
    !name.includes('.spec.ts') &&
    !name.includes('/types/') &&
    !name.includes('/dto/')
  );
});

console.log('\n=== PHASE 1: COVERAGE SUMMARY TABLE ===\n');
console.log('| File | Statements | Branches | Functions | Lines |');
console.log('|------|-----------|----------|-----------|-------|');

const summary = {};

keyFiles.forEach(filepath => {
  const filename = path.basename(filepath);
  const data = cov[filepath];

  if (!data || !data.s) return;

  const calcPercent = (items) => {
    const covered = Object.values(items).filter(x => x > 0).length;
    const total = Object.values(items).length;
    return total > 0 ? ((covered / total) * 100).toFixed(2) : '0.00';
  };

  const statements = calcPercent(data.s || {});
  const branches = calcPercent(data.b || {});
  const functions = calcPercent(data.f || {});
  const lines = calcPercent(data.l || {});

  summary[filename] = { statements, branches, functions, lines, filepath };
  
  console.log(`| ${filename} | ${statements}% | ${branches}% | ${functions}% | ${lines}% |`);
});

console.log('\n=== STATEMENT COVERAGE TARGETS ===\n');
const targets = {
  'session.service.ts': 95,
  'session.repository.ts': 90,
  'auth.service.ts': 90,
  'auth-security.service.ts': 85,
};

Object.entries(summary).forEach(([file, metrics]) => {
  const target = targets[file] || 80;
  const stmt = parseFloat(metrics.statements);
  const status = stmt >= target ? '✓' : '✗';
  console.log(`${status} ${file}: ${metrics.statements}% (target: ${target}%)`);
});
