const fs=require('fs');
const cov=JSON.parse(fs.readFileSync('coverage/coverage-final.json','utf8'));
const srcService = fs.readFileSync('src/modules/auth/services/session.service.ts', 'utf8').split('\n');
const srcRepo = fs.readFileSync('src/modules/auth/repositories/session.repository.ts', 'utf8').split('\n');

function showUncovered(filepath, src, name) {
  const data = cov[filepath];
  if (!data) return;
  
  const allUncovered = Object.entries(data.statementMap)
    .map(([idx, loc]) => ({
      idx: parseInt(idx),
      line: loc.start.line,
      covered: data.s[idx] > 0
    }))
    .filter(x => !x.covered)
    .sort((a, b) => a.line - b.line);
  
  console.log(`\n=== ${name} ===`);
  console.log(`Total uncovered: ${allUncovered.length}`);
  console.log('Key methods to cover:');
  
  allUncovered.filter(x => x.line >= 140 && x.line <= 250).forEach(x => {
    const code = src[x.line - 1];
    if (code && code.trim() && !code.trim().startsWith('//') && !code.trim().startsWith('*')) {
      console.log(`  L${x.line}: ${code.trim().substring(0, 90)}`);
    }
  });
}

showUncovered('/workspaces/app-v1/adhitama/apps/api/src/modules/auth/services/session.service.ts', srcService, 'session.service.ts');
showUncovered('/workspaces/app-v1/adhitama/apps/api/src/modules/auth/repositories/session.repository.ts', srcRepo, 'session.repository.ts');
