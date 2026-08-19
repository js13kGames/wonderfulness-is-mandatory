// Plays the ENTIRE game start-to-ending using the shipped level plans.
const fs = require('fs');
const G = require('./harness');
const R = __dirname + '/../levels/';
let totalLoops = 0, fail = 0;

function runLoop(steps, budget) {
  let si = 0, held = 0, acted = 0;
  for (let f = 0; f < budget; f++) {
    const s = steps[si] || { x: null, hold: 1e9 };
    const a = G.pl, tx = s.x == null ? a.x : s.x, dx = tx - a.x;
    let k = 0;
    if (dx < -2.5) k |= 1; else if (dx > 2.5) k |= 2;
    const arrived = Math.abs(dx) <= 2.5;
    if (s.j && a.g) k |= 4;
    if (s.up && !arrived && a.g) k |= 4;
    if ((k & 3) && Math.abs(a.vx) < .1 && a.g) k |= 4;
    if (arrived) {
      if (s.a && !acted) { k |= 8; acted = 1 }
      held++;
      if (held > (s.hold || 0)) { si++; held = 0; acted = 0 }
    } else held = 0;
    G.setK(k); G.tick();
    if (G.st !== 1) return { done: 1, f };          // level cleared -> curtain call
    if (G.pl.dead) return { dead: 1, f };
  }
  return { f: budget };
}

G.st = 1;
for (let i = 0; i < G.LEV.length; i++) {
  G.startLevel(i);
  const plan = JSON.parse(fs.readFileSync(R + 'L' + String(i + 1).padStart(2, '0') + '.plan.json', 'utf8'));
  let cleared = 0;
  for (let p = 0; p < plan.length; p++) {
    const r = runLoop(plan[p].steps || plan[p], p === plan.length - 1 ? G.LOOPF : G.LOOPF - 1);
    if (r.done) { cleared = 1; totalLoops += p; break }
    if (r.dead) { console.log('  L' + (i + 1) + ' died in loop ' + p); }
    if (p < plan.length - 1) G.commitLoop();
  }
  if (!cleared) { console.log('FAIL L' + (i + 1) + ' ' + G.LEV[i].n); fail++; G.st = 1; continue }
  // run the curtain call to completion, then advance
  let guard = 0;
  while (G.st === 2 && guard++ < 2000) G.tick();
  G.nextLevel();
  console.log('ok   L' + String(i + 1).padStart(2) + ' ' + G.LEV[i].n.padEnd(28) +
    ' par ' + G.LEV[i].p + '  cr ' + G.cr.toFixed(2) + '  ground y' + G.gndY);
}
console.log('\nreached state ' + G.st + (G.st === 3 ? '  (ENDING)' : '  (expected 3 = ending)'));
console.log('total unicorns spent: ' + G.total);
if (fail || G.st !== 3) { console.log(fail + ' levels failed'); process.exitCode = 1 }
else console.log('FULL PLAYTHROUGH OK - all ' + G.LEV.length + ' levels + ending');
