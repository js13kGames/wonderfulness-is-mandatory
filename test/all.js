const { check, G } = require('./check');
const plans = require('./plans.json');
let bad = 0;
for (let i = 0; i < G.LEV.length; i++) {
  const p = plans[i];
  if (!p) { console.log('L' + (i + 1) + ' ' + G.LEV[i].n + ': NO PLAN'); bad++; continue }
  const r = check(G.LEV[i].m, p);
  const used = r.loops + 1, par = G.LEV[i].p + 1;
  const tag = r.ok ? (used <= par ? 'ok  ' : 'PAR?') : 'FAIL';
  console.log(tag + ' L' + (i + 1) + ' ' + G.LEV[i].n + '  ' + (r.ok ? used + ' loops (par ' + par + ')' : JSON.stringify(r)));
  if (!r.ok) bad++;
}
console.log(bad ? '\n' + bad + ' UNSOLVED' : '\nall ' + G.LEV.length + ' levels verified solvable');
process.exitCode = bad ? 1 : 0;
