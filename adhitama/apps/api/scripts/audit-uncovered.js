const fs = require('fs');
const path = require('path');

const cov = JSON.parse(fs.readFileSync('coverage/coverage-final.json', 'utf8'));

// Files to analyze for uncovered code
const filesToAnalyze = [
  'src/modules/auth/services/auth.service.ts',
  'src/modules/auth/services/auth-security.service.ts',
  'src/modules/auth/services/session.service.ts',
  'src/modules/auth/repositories/session.repository.ts',
  'src/modules/auth/repositories/auth.repository.ts',
  'src/modules/auth/repositories/email-verification.repository.ts',
  'src/modules/auth/controllers/auth.controller.ts',
];

const baseDir = '/workspaces/app-v1/adhitama/apps/api';

console.log('\n=== PHASE 2: UNCOVERED LINES ANALYSIS ===\n');

filesToAnalyze.forEach(relPath => {
  const fullPath = path.join(baseDir, relPath);
  const covKey = fullPath;

  if (!cov[covKey]) {
    console.log(`⚠ ${path.basename(relPath)}: NO COVERAGE DATA\n`);
    return;
  }

  const data = cov[covKey];
  const src = fs.readFileSync(fullPath, 'utf8').split('\n');

  // Find uncovered statements
  const uncovered = Object.entries(data.s || {})
    .map(([idx, count]) => ({
      idx: parseInt(idx),
      line: data.statementMap[idx]?.start?.line,
      covered: count > 0,
    }))
    .filter(x => !x.covered && x.line)
    .sort((a, b) => a.line - b.line);

  // Find uncovered branches
  const uncoveredBranches = Object.entries(data.b || {})
    .map(([idx, counts]) => ({
      idx: parseInt(idx),
      line: data.branchMap[idx]?.start?.line,
      coveredCount: counts.filter(c => c > 0).length,
      totalCount: counts.length,
    }))
    .filter(x => x.coveredCount < x.totalCount && x.line)
    .sort((a, b) => a.line - b.line);

  const filename = path.basename(relPath);
  
  if (uncovered.length === 0 && uncoveredBranches.length === 0) {
    console.log(`✓ ${filename}: 100% covered\n`);
    return;
  }

  console.log(`📊 ${filename}:`);
  console.log(`   Uncovered statements: ${uncovered.length}, Uncovered branches: ${uncoveredBranches.length}\n`);

  if (uncovered.length > 0) {
    console.log(`   Uncovered Statements:\n`);
    uncovered.slice(0, 15).forEach(x => {
      const code = src[x.line - 1]?.trim() || '';
      if (code && !code.startsWith('//')) {
        console.log(`     L${x.line}: ${code.substring(0, 80)}`);
      }
    });
    if (uncovered.length > 15) {
      console.log(`     ... and ${uncovered.length - 15} more`);
    }
    console.log();
  }

  if (uncoveredBranches.length > 0) {
    console.log(`   Uncovered Branches:\n`);
    uncoveredBranches.slice(0, 8).forEach(x => {
      const code = src[x.line - 1]?.trim() || '';
      console.log(`     L${x.line} (${x.coveredCount}/${x.totalCount} branches): ${code.substring(0, 70)}`);
    });
    if (uncoveredBranches.length > 8) {
      console.log(`     ... and ${uncoveredBranches.length - 8} more`);
    }
    console.log();
  }
});

console.log('\n=== CRITICAL GAPS (Below 80% statements) ===\n');

filesToAnalyze.forEach(relPath => {
  const fullPath = path.join(baseDir, relPath);
  const covKey = fullPath;

  if (!cov[covKey]) return;

  const data = cov[covKey];
  const stmt = Object.values(data.s || {});
  const covered = stmt.filter(x => x > 0).length;
  const percent = ((covered / stmt.length) * 100);

  if (percent < 80) {
    console.log(`⚠ ${path.basename(relPath)}: ${percent.toFixed(2)}% statements`);
    console.log(`  Need ${(80 - percent).toFixed(2)} more percentage points\n`);
  }
});
