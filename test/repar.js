// For levels with a cheaper timed solution, find the most FORGIVING version of it
// (widest window of split timings that works) and rewrite the plan to that.
const fs = require('fs');
const G = require('./harness');
const TARGETS = process.argv.slice(2);

function plates(map) {
  const out = [];
  map.split('\n').forEach((r, y) => [...r].forEach((ch, x) => {
    if ('!@$'.includes(ch)) out.push({ x: x * 16 + 8, ch });
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
function attempt(map, routes, playerSteps) {
  G.ghosts.length = 0; G.parseLevel(map); G.resetWorld();
  for (const r of routes) { const x = runSteps(r, G.LOOPF - 1); if (x.won) return { won: 0 }; G.commitLoop() }
  const x = runSteps(playerSteps, G.LOOPF);
  return { won: !!x.won, f: x.f };
}

for (const id of TARGETS) {
  const mf = __dirname + '/../levels/' + id + '.txt';
  const pf = __dirname + '/../levels/' + id + '.plan.json';
  const map = fs.readFileSync(mf, 'utf8').replace(/\n+$/, '');
  const plan = JSON.parse(fs.readFileSync(pf, 'utf8'));
  const par = plan.length - 1;
  const P = plates(map);
  const playerSteps = plan[plan.length - 1].steps || plan[plan.length - 1];
  let best = null;
  for (let a = 0; a < P.length; a++)
    for (let b = 0; b < P.length; b++) {
      if (a === b || P[a].ch === P[b].ch) continue;
      const ok = [];
      for (let split = 60; split <= 640; split += 20) {
        const seen = {}, others = [];
        const used = { [P[a].ch]: 1, [P[b].ch]: 1 };
        for (const p of P) if (!used[p.ch] && !seen[p.ch]) { seen[p.ch] = 1; others.push([{ x: p.x, hold: 900 }]) }
        const routes = others.concat([[{ x: P[a].x, hold: split }, { x: P[b].x, hold: 900 }]]);
        if (routes.length >= par) continue;
        if (attempt(map, routes, playerSteps).won) ok.push(split);
      }
      if (ok.length && (!best || ok.length > best.ok.length)) best = { a, b, ok, n: P.length };
    }
  if (!best) { console.log(id + ': no cheaper route found'); continue }
  const mid = best.ok[Math.floor(best.ok.length / 2)];
  const seen = {}, others = [];
  const used = { [P[best.a].ch]: 1, [P[best.b].ch]: 1 };
  for (const p of P) if (!used[p.ch] && !seen[p.ch]) { seen[p.ch] = 1; others.push({ steps: [{ x: p.x, hold: 900 }] }) }
  const newPlan = others.concat([{ steps: [{ x: P[best.a].x, hold: mid }, { x: P[best.b].x, hold: 900 }] }],
                                [{ steps: playerSteps }]);
  fs.writeFileSync(pf, JSON.stringify(newPlan, null, 1) + '\n');
  console.log(id + ': par ' + par + ' -> ' + (newPlan.length - 1) +
    '   one ghost holds ' + P[best.a].ch + ' then ' + P[best.b].ch +
    '   works for splits ' + best.ok[0] + '-' + best.ok[best.ok.length - 1] +
    ' (' + best.ok.length + ' of 30 tested), using ' + mid);
}
