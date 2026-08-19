// "Can I just walk to the castle?" - tile-level reachability over the REST state
// (no beams, no ghosts, doors in their unpowered state). Deliberately GENEROUS
// about what a skilled player can do, so it over-reports rather than under-reports.
const fs = require('fs');
const G = require('./harness');
const { GW, GH, TS } = G;

function analyse(map) {
  G.ghosts.length = 0; G.parseLevel(map); G.resetWorld();
  for (let i = 0; i < 3; i++) { G.setK(0); G.step() }     // let devices settle
  const solid = (cx, cy) => {
    if (cx < 0 || cy < 0 || cx >= GW || cy >= GH) return 1;
    return G.solidCell(cx, cy) ? 1 : 0;
  };
  // a cell you can stand in: empty, with support underneath
  const support = (cx, cy) => {
    if (solid(cx, cy)) return 0;
    if (G.TT[G.idx(cx, cy)] === 3) return 0;               // standing in thorns is death
    if (cy + 1 >= GH) return 0;                            // no floor at the bottom of the world
    if (solid(cx, cy + 1)) return 1;
    const t = G.TT[G.idx(cx, cy + 1)];
    return t === 2 ? 1 : 0;                                // cloud platform
  };
  const spawn = [Math.floor(24 / TS), 0];
  // find the spawn cell from the map text (S)
  const rows = map.split('\n');
  let sx = 1, sy = 13, gx = -1, gy = -1;
  rows.forEach((r, y) => [...r].forEach((ch, x) => {
    if (ch === 'S') { sx = x; sy = y }
    if (ch === 'C') { gx = x; gy = y }
  }));
  // drop the spawn to its resting cell
  while (sy + 1 < GH && !support(sx, sy)) sy++;

  const seen = new Set(), q = [[sx, sy]];
  const key = (x, y) => y * GW + x;
  seen.add(key(sx, sy));
  const JUMP_UP = 3, JUMP_ACROSS = 4;
  while (q.length) {
    const [cx, cy] = q.pop();
    const push = (nx, ny) => {
      if (nx < 0 || ny < 0 || nx >= GW || ny >= GH) return;
      if (solid(nx, ny)) return;
      if (!support(nx, ny)) return;
      const k = key(nx, ny);
      if (!seen.has(k)) { seen.add(k); q.push([nx, ny]) }
    };
    // walk / step
    for (const d of [-1, 1]) if (!solid(cx + d, cy)) push(cx + d, cy);
    // fall straight down or one column over
    for (const d of [-1, 0, 1]) {
      let ny = cy;
      while (ny + 1 < GH && !solid(cx + d, ny + 1) && !support(cx + d, ny)) ny++;
      if (!solid(cx + d, ny)) push(cx + d, ny);
    }
    // jump: up to 3 up and 4 across, needs headroom above the start
    let head = 0;
    while (head < JUMP_UP && !solid(cx, cy - head - 1)) head++;
    for (let up = 0; up <= head; up++)
      for (let ax = -JUMP_ACROSS; ax <= JUMP_ACROSS; ax++) {
        const nx = cx + ax, ny = cy - up;
        if (solid(nx, ny)) continue;
        // crude corridor check along the horizontal leg
        let clear = 1;
        for (let s = 1; s <= Math.abs(ax); s++) {
          const mx = cx + Math.sign(ax) * s;
          if (solid(mx, ny)) { clear = 0; break }
        }
        if (clear) push(nx, ny);
      }
  }
  return { reach: seen.has(key(gx, gy)), gx, gy, sx, sy, cells: seen.size };
}

let bad = 0;
for (let n = 1; n <= 13; n++) {
  const id = 'L' + String(n).padStart(2, '0');
  const map = fs.readFileSync(__dirname + '/../levels/' + id + '.txt', 'utf8').replace(/\n+$/, '');
  const plan = JSON.parse(fs.readFileSync(__dirname + '/../levels/' + id + '.plan.json', 'utf8'));
  const par = plan.length - 1;
  const r = analyse(map);
  const walk = r.reach && par > 0;
  if (walk) bad++;
  console.log((walk ? 'WALKABLE ' : 'ok       ') + id + '  par ' + par +
    '  spawn(' + r.sx + ',' + r.sy + ') goal(' + r.gx + ',' + r.gy + ')  reachable=' + r.reach +
    (walk ? '   <-- castle reachable with NO mechanic' : ''));
}
console.log('\n' + (bad ? bad + ' levels can be walked to the goal without using anything' : 'no level is walk-throughable'));
process.exitCode = bad ? 1 : 0;
