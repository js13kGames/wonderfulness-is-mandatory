// Author + verify a single level file.
//   node test/try.js levels/L04.txt              -> lint + ASCII preview (rest state)
//   node test/try.js levels/L04.txt --plan       -> also run levels/L04.plan.json and report solvability
// Map file: 17 lines x 30 cols. Plan file: JSON array of loops (see below).
const fs = require('fs'), path = require('path');
const G = require('./harness');
const file = process.argv[2];
if (!file) { console.log('usage: node test/try.js <mapfile> [--plan]'); process.exit(1) }
let map = fs.readFileSync(file, 'utf8').replace(/\n+$/, '');
const rows = map.split('\n');

// ---- lint ----
const core = fs.readFileSync(__dirname + '/../src/00_core.js', 'utf8');
const known = new Set(['.', 'S', '*']);
for (const m of core.matchAll(/^def\('((?:[^'\\]|\\\\)+)'/gm))
  for (const ch of m[1].replace('\\\\', '\\')) known.add(ch);
let bad = 0;
if (rows.length !== 17) { console.log('!! ' + rows.length + ' rows, want 17'); bad++ }
rows.forEach((r, i) => {
  if (r.length !== 30) { console.log('!! row ' + i + ' has ' + r.length + ' cols, want 30'); bad++ }
  for (const ch of r) if (!known.has(ch)) { console.log('!! row ' + i + ' unknown glyph "' + ch + '"'); bad++ }
});
if (!map.includes('S')) { console.log('!! no spawn S'); bad++ }
if (!map.includes('C')) { console.log('!! no goal C'); bad++ }
if (bad) process.exit(1);

// ---- preview ----
function preview(label) {
  const grid = map.split('\n').map(r => r.split(''));
  const MK = { 1: 'r', 2: 'g', 4: 'b', 3: 'y', 6: 'c', 5: 'm', 7: '=' };
  for (let i = 0; i < G.segs.length; i += 5) {
    const [x1, y1, x2, y2, mk] = G.segs.slice(i, i + 5);
    let cx = Math.round((x1 - 8) / 16), cy = Math.round((y1 - 8) / 16);
    const cx2 = Math.round((x2 - 8) / 16), cy2 = Math.round((y2 - 8) / 16);
    const dx = Math.sign(cx2 - cx), dy = Math.sign(cy2 - cy);
    for (let g = 0; g < 60; g++) {
      if (grid[cy] && grid[cy][cx] === '.') grid[cy][cx] = MK[mk] || '?';
      if (cx === cx2 && cy === cy2) break;
      cx += dx; cy += dy;
    }
  }
  G.actors.forEach((a, i) => {
    if (a.dead) return;
    const px = Math.floor(a.x / 16), py = Math.floor((a.y - 6) / 16);
    if (grid[py] && grid[py][px] === '.') grid[py][px] = i < G.ghosts.length ? String(i + 1) : 'U';
  });
  console.log('\n== ' + label + ' ==');
  console.log('    ' + '0123456789'.repeat(3));
  grid.forEach((r, i) => console.log(String(i).padStart(2) + ': ' + r.join('')));
  console.log('plates ' + JSON.stringify(G.plates) + '  power ' + G.power +
    '  walkableBeamCells ' + G.bfloor.filter(v => v).length + '  segments ' + G.segs.length / 5);
}
G.parseLevel(map); G.resetWorld();
for (let i = 0; i < 3; i++) { G.setK(0); G.step() }
preview('REST STATE (nothing held)');

if (process.argv.includes('--plan')) {
  const pf = file.replace(/\.txt$/, '.plan.json');
  if (!fs.existsSync(pf)) { console.log('\nno plan file at ' + pf); process.exit(1) }
  const plan = JSON.parse(fs.readFileSync(pf, 'utf8'));
  const { check } = require('./check');
  const r = check(map, plan);
  G.parseLevel(map); G.resetWorld();
  // replay to the final loop for a preview
  const { check: _c } = require('./check');
  console.log('\n== PLAN RESULT ==');
  console.log(r.ok ? 'SOLVED using ' + (r.loops + 1) + ' unicorns (' + r.loops + ' ghosts)'
                   : 'NOT SOLVED  ' + JSON.stringify(r));
  if (!r.ok) process.exit(1);
}
console.log('\nlegend: r/g/b/y/c/m = single-colour beam, = full rainbow, 1..n = ghosts, U = you');
