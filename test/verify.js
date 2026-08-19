// Verify a level is solvable with a scripted herd. Each phase = one loop's plan.
const G = require('./harness');
const L = 1, R = 2, J = 4, A = 8;
function steer(a, tx, jumpIf) {
  let k = 0, dx = tx - a.x;
  if (dx < -2) k |= L; else if (dx > 2) k |= R;
  if (jumpIf && jumpIf(a)) k |= J;
  return k;
}
// plan: array of loops; each loop is fn(pl, frame) -> keybits ; run until `frames` then commit
function play(levIdx, plan, verbose) {
  G.parseLevel(G.LEV[levIdx].m); G.resetWorld();
  for (let p = 0; p < plan.length; p++) {
    const { fn, frames } = plan[p];
    for (let f = 0; f < frames; f++) {
      G.setK(fn(G.pl, f) | 0); G.step();
      if (G.won) return { won: 1, loops: p, f };
      if (G.pl.dead) { if (verbose) console.log('  died in loop', p, 'f', f); G.resetWorld(); break }
    }
    if (p < plan.length - 1) G.commitLoop();
  }
  return { won: G.won ? 1 : 0, loops: plan.length - 1, x: G.pl.x, y: G.pl.y };
}
module.exports = { play, steer, G, L, R, J, A };

if (require.main === module) {
  // LEVEL 1: ghost holds plate at col 6 (x=104); player runs right across the bridge to castle (x=424)
  const r = play(0, [
    { frames: 779, fn: a => steer(a, 104) },
    { frames: 420, fn: a => steer(a, 424, x => !x.g ? 0 : Math.abs(x.vx) < .15 && x.x < 420) },
  ], 1);
  console.log('LEVEL 1 ->', JSON.stringify(r));
  console.log('plates', JSON.stringify(G.plates), 'bridge cells', G.bfloor.filter(v => v).length);
}
