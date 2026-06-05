const fs=require('fs');
const cov=JSON.parse(fs.readFileSync('coverage/coverage-final.json','utf8'));
const files=['/workspaces/app-v1/adhitama/apps/api/src/modules/auth/services/session.service.ts','/workspaces/app-v1/adhitama/apps/api/src/modules/auth/repositories/session.repository.ts'];
files.forEach(f=>{
  const data=cov[f];
  if(!data){console.error('MISSING',f);return;}
  const sKeys=Object.keys(data.statementMap);
  const sCounts=Object.values(data.s);
  const sTotal=sKeys.length;
  const sCovered=sCounts.filter(n=>n>0).length;
  const sPct=(sCovered/sTotal*100).toFixed(2);
  const bTotal=Object.keys(data.branchMap).reduce((acc,k)=>acc+data.branchMap[k].locations.length,0);
  const bCovered=Object.values(data.b).flat().filter(n=>n>0).length;
  const bPct=bTotal? (bCovered/bTotal*100).toFixed(2):'N/A';
  const fTotal=Object.keys(data.fnMap).length;
  const fCovered=Object.values(data.f).filter(n=>n>0).length;
  const fPct=fTotal? (fCovered/fTotal*100).toFixed(2):'N/A';
  console.log('\nFILE:',f);
  console.log('Statements:',sCovered+'/'+sTotal, sPct+'%');
  console.log('Branches :',bCovered+'/'+bTotal, bPct+'%');
  console.log('Functions:',fCovered+'/'+fTotal, fPct+'%');
});
