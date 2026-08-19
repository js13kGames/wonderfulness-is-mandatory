// Is par honest? Tries routes where ONE ghost serves TWO plates at different
// times (walk to A, hold, walk to B, hold). If that beats par, par is too high
// and the level is secretly a timing puzzle.
const fs = require('fs');
const G = require('./harness');

function plateCols(map) {
  const out = [];
  map.split('\n').forEach((r, y) => [...r].forEach((ch, x) => {
    if (ch === '!' || ch === '@' || ch === '$') out.push({ x: x * 16 + 8, ch });
  }));
  return out;
}
function runSteps(steps, budget) {
  let si = 0, held = 0;
  for (let f = 0; f < budget; f++) {
    const s = steps[si] || { x: null, hold: 1e9 };
    const a = G.pl, tx = s.x == null ? a.x : s.x, dx = tx - a.x;
    let k = 0;
    if (dx < -2.5) k |= 1; else if (dx > 2.5) k |= 2;
    if ((k & 3) && Math.abs(a.vx) < .1 && a.g) k |= 4;
    if (Math.abs(dx) <= 2.5) { held++; if (held > (s.hold || 0)) { si++; held = 0 } } else held = 0;
    G.setK(k); G.step();
    if (G.won) return { won: 1, f };
    if (G.pl.dead) return { dead: 1, f };
  }
  return {};
}
function attempt(map, ghostRoutes, playerSteps) {
  G.ghosts.length = 0; G.parseLevel(map); G.resetWorld();
  for (const r of ghostRoutes) { const x = runSteps(r, G.LOOPF - 1); if (x.won) return { won: 1, note: 'won early' }; G.commitLoop() }
  const x = runSteps(playerSteps, G.LOOPF);
  return { won: !!x.won, f: x.f };
}

let flagged = 0;
for (let n = 1; n <= 13; n++) {
  const id = 'L' + String(n).padStart(2, '0');
  const map = fs.readFileSync(__dirname + '/../levels/' + id + '.txt', 'utf8').replace(/\n+$/, '');
  const plan = JSON.parse(fs.readFileSync(__dirname + '/../levels/' + id + '.plan.json', 'utf8'));
  const par = plan.length - 1;
  const P = plateCols(map);
  if (par < 2 || P.length < 2) { console.log('skip   ' + id + '  par ' + par + '  plates ' + P.length); continue }
  G.parseLevel(map);
  const goalX = G.goalX;
  const playerSteps = plan[plan.length - 1].steps || plan[plan.length - 1];
  let hit = null;
  // pick pairs of distinct plate groups and let ONE ghost cover both
  for (let a = 0; a < P.length && !hit; a++)
    for (let b = 0; b < P.length && !hit; b++) {
      if (P[a].ch === P[b].ch || a === b) continue;
      for (const split of [120, 200, 280, 360, 440, 520]) {
        // the other plates still get their own ghosts, minus one
        const others = [];
        const usedCh = { [P[a].ch]: 1, [P[b].ch]: 1 };
        const seen = {};
        for (const p of P) if (!usedCh[p.ch] && !seen[p.ch]) { seen[p.ch] = 1; others.push([{ x: p.x, hold: 900 }]) }
        const routes = others.concat([[{ x: P[a].x, hold: split }, { x: P[b].x, hold: 900 }]]);
        if (routes.length >= par) continue;                       // not cheaper, skip
        const r = attempt(map, routes, playerSteps);
        if (r.won) { hit = routes.length + ' ghosts: one covers ' + P[a].ch + ' then ' + P[b].ch + ' at f' + split; break }
      }
    }
  if (hit) { flagged++; console.log('PAR HIGH ' + id + '  par ' + par + '  <- ' + hit) }
  else console.log('ok     ' + id + '  par ' + par + '  (no 1-ghost-2-plate shortcut)');
}
console.log('\n' + (flagged ? flagged + ' levels have a cheaper timed solution than their par' : 'all pars are honest'));
