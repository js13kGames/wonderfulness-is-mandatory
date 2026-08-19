// Closed-loop bot: verifies a level is actually solvable by driving unicorns to targets.
const G = require('./harness');
const L = 1, R = 2, J = 4, A = 8;

// steer toward world x, jumping when blocked or when below target y
function steer(a, tx, ty) {
  let k = 0, dx = tx - a.x;
  if (dx < -1.5) k |= L; else if (dx > 1.5) k |= R;
  if (ty != null && a.y > ty + 2 && a.g) k |= J;
  // unstick: if pressed against a wall while wanting to move, jump
  if ((k & 3) && Math.abs(a.vx) < .12 && a.g) k |= J;
  return k;
}
function record(fn, frames) {
  const inp = [];
  for (let f = 0; f < frames; f++) {
    const k = fn(G.pl, f) | 0;
    inp.push(k); G.setK(k); G.step();
    if (G.won) return { inp, won: 1, f };
    if (G.pl.dead) return { inp, won: 0, dead: 1, f };
  }
  return { inp, won: G.won, f: frames };
}
module.exports = { steer, record, L, R, J, A, G };

if (require.main === module) {
  const n = +(process.argv[2] || 0);
  G.parseLevel(G.LEV[n].m); G.resetWorld();
  // LOOP 1: go stand on the plate at col 3 (x=56)
  let r1 = record((a) => steer(a, 56, null), 200);
  console.log('L1 ghost end x=', G.pl.x.toFixed(1), 'plates=', JSON.stringify(G.plates), 'segs=', G.segs.length / 5);
  let bf = []; for (let i = 0; i < G.bfloor.length; i++) if (G.bfloor[i]) bf.push([i % G.GW, (i / G.GW) | 0]);
  console.log('bridge:', JSON.stringify(bf));
  console.log('beam segs:', JSON.stringify([...G.segs].reduce((a, v, i) => (i % 5 ? a[a.length - 1].push(v) : a.push([v]), a), [])));
}
