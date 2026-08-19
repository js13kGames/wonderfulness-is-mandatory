// Generic level verifier.
//   plan = [ loop, loop, ... ]  ; loop = [ step, ... ]
//   step = { x: targetX, hold: framesAfterArrival, j: bunnyhop, a: pressActionOnArrival, up: jumpImmediately }
// The last loop is the player's; earlier loops become ghosts.
const G = require('./harness');
const LOOPF = G.LOOPF;

function runLoop(steps, budget) {
  let si = 0, held = 0, acted = 0, jt = 0;
  for (let f = 0; f < budget; f++) {
    const s = steps[si] || { x: G.pl.x, hold: 1e9 };
    const a = G.pl, dx = (s.x == null ? a.x : s.x) - a.x;
    let k = 0;
    if (dx < -2.5) k |= 1; else if (dx > 2.5) k |= 2;
    const arrived = Math.abs(dx) <= 2.5;
    if (s.j && a.g) k |= 4;
    if (s.up && !arrived && a.g) k |= 4;
    if ((k & 3) && Math.abs(a.vx) < .1 && a.g) k |= 4;      // blocked -> hop
    if (arrived) {
      if (s.a && !acted) { k |= 8; acted = 1 }
      held++;
      if (held > (s.hold || 0)) { si++; held = 0; acted = 0 }
    } else held = 0;
    G.setK(k); G.step();
    if (G.won) return { won: 1, f };
    if (G.pl.dead) return { won: 0, dead: 1, f };
  }
  return { won: 0, f: budget };
}
function check(map, plan, opts) {
  opts = opts || {};
  G.ghosts.length = 0;          // must clear, or the previous level's herd leaks in
  G.parseLevel(map); G.resetWorld();
  const notes = [];
  for (let i = 0; i < plan.length; i++) {
    const last = i == plan.length - 1;
    const budget = last ? LOOPF : (plan[i].budget || LOOPF - 1);
    const r = runLoop(plan[i].steps || plan[i], budget);
    if (r.won) return { ok: 1, loops: i, f: r.f, notes };
    if (r.dead) notes.push('loop ' + i + ' died at frame ' + r.f);
    if (!last) G.commitLoop();
  }
  return { ok: 0, loops: plan.length - 1, notes, x: G.pl.x, y: G.pl.y, ghosts: G.ghosts.length };
}
module.exports = { check, G };

if (require.main === module) {
  const idx = +(process.argv[2] || 0);
  const plans = require('./plans.json');
  const p = plans[idx];
  if (!p) { console.log('no plan for level ' + idx); process.exit(1) }
  const r = check(G.LEV[idx].m, p);
  console.log('L' + (idx + 1), r.ok ? 'SOLVED in ' + (r.loops + 1) + ' loops (par ' + G.LEV[idx].p + ')' : 'UNSOLVED ' + JSON.stringify(r));
}
