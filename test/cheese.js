// Adversarial solver. Tries hard to BEAT each level with fewer ghosts than par,
// using a bot that can actually jump (holds the button) plus a seeded random search.
const fs = require('fs');
const G = require('./harness');

let seed = 1;
function rnd() { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return seed / 0x7fffffff }

// ---- policies -------------------------------------------------------------
// A full-height jump needs the button HELD (~14 frames); one-frame taps only hop 8px.
function mkPolicy(kind, goalX, spawnX) {
  let jt = 0, dir = kind.dir;
  return (a, f) => {
    let k = 0;
    if (kind.mode === 'goal') k = goalX - a.x < -2 ? 1 : goalX - a.x > 2 ? 2 : 0;
    else k = dir;
    if (kind.wait && f < kind.wait) return 0;
    if (jt > 0) { k |= 4; jt-- }
    else if (a.g) {
      if (kind.jump === 'always') jt = 14;
      else if (kind.jump === 'stuck' && (k & 3) && Math.abs(a.vx) < .15) jt = 14;
      else if (kind.jump === 'random' && rnd() < kind.p) jt = 6 + (rnd() * 9 | 0);
    }
    if (kind.act && f % 37 === 0) k |= 8;
    return k;
  };
}
function POLICIES(goalX, spawnX) {
  const out = [];
  for (const mode of ['goal', 'dir'])
    for (const jump of ['none', 'stuck', 'always'])
      for (const dir of (mode === 'dir' ? [1, 2] : [0]))
        for (const wait of [0, 60, 200, 400])
          out.push({ name: mode + '/' + jump + (dir ? '/dir' + dir : '') + (wait ? '/wait' + wait : ''), kind: { mode, jump, dir, wait } });
  return out;
}

function play(map, policyFn, ghostPlan) {
  G.ghosts.length = 0;
  G.parseLevel(map); G.resetWorld();
  for (const steps of ghostPlan || []) {
    let si = 0, held = 0;
    for (let f = 0; f < G.LOOPF - 1; f++) {
      const s = steps[si] || { x: null, hold: 1e9 };
      const a = G.pl, tx = s.x == null ? a.x : s.x, dx = tx - a.x;
      let k = 0;
      if (dx < -2.5) k |= 1; else if (dx > 2.5) k |= 2;
      if ((k & 3) && Math.abs(a.vx) < .1 && a.g) k |= 4;
      if (Math.abs(dx) <= 2.5) { held++; if (held > (s.hold || 0)) { si++; held = 0 } } else held = 0;
      G.setK(k); G.step();
      if (G.won) return { won: 1, f, note: 'won while laying ghosts' };
    }
    G.commitLoop();
  }
  for (let f = 0; f < G.LOOPF; f++) {
    G.setK(policyFn(G.pl, f) | 0); G.step();
    if (G.won) return { won: 1, f };
    if (G.pl.dead) return { won: 0, f };
  }
  return { won: 0 };
}

const TRIALS = +(process.env.TRIALS || 240);
let broken = 0; const report = [];
for (let n = 1; n <= 13; n++) {
  const id = 'L' + String(n).padStart(2, '0');
  const map = fs.readFileSync(__dirname + '/../levels/' + id + '.txt', 'utf8').replace(/\n+$/, '');
  const plan = JSON.parse(fs.readFileSync(__dirname + '/../levels/' + id + '.plan.json', 'utf8'));
  const par = plan.length - 1;
  G.parseLevel(map);
  const goalX = G.goalX, spawnX = 24;
  let hit = null;

  for (let ng = 0; ng < par && !hit; ng++) {
    const prefix = plan.slice(0, ng).map(p => p.steps || p);
    // deterministic policies
    for (const P of POLICIES(goalX, spawnX)) {
      const r = play(map, mkPolicy(P.kind, goalX, spawnX), prefix);
      if (r.won) { hit = ng + ' ghosts: ' + P.name + ' (f' + r.f + ')'; break }
    }
    // seeded random search
    if (!hit) {
      seed = 12345 + n * 977;
      for (let t = 0; t < TRIALS && !hit; t++) {
        const kind = { mode: rnd() < .75 ? 'goal' : 'dir', jump: 'random', dir: rnd() < .5 ? 1 : 2,
                       wait: [0, 0, 0, 40, 120, 300][rnd() * 6 | 0], p: .02 + rnd() * .25, act: rnd() < .3 };
        const r = play(map, mkPolicy(kind, goalX, spawnX), prefix);
        if (r.won) hit = ng + ' ghosts: random search trial ' + t + ' (f' + r.f + ')';
      }
    }
  }
  if (hit) { broken++; report.push('BROKEN ' + id + '  par ' + par + '  <- beaten with ' + hit) }
  else report.push('ok     ' + id + '  par ' + par);
}
console.log(report.join('\n'));
console.log('\n' + (broken ? broken + ' of 13 levels can be beaten below par' : 'no level can be beaten below par'));
process.exitCode = broken ? 1 : 0;
