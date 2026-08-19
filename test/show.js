// ASCII preview of a level + its live beams, so level geometry can be eyeballed.
const G = require('./harness');
const n = +(process.argv[2] || 0);
const frames = +(process.argv[3] || 3);
if (!G.LEV[n]) { console.log('no level ' + n + ' (have ' + G.LEV.length + ')'); process.exit(1) }
const map = G.LEV[n].m;
G.parseLevel(map); G.resetWorld();
for (let i = 0; i < frames; i++) { G.setK(0); G.step() }

const rows = map.split('\n');
const grid = rows.map(r => r.split(''));
// overlay beams
const MK = { 1: 'r', 2: 'g', 4: 'b', 3: 'y', 6: 'c', 5: 'm', 7: '=' };
for (let i = 0; i < G.segs.length; i += 5) {
  const [x1, y1, x2, y2, mk] = G.segs.slice(i, i + 5);
  const cx1 = Math.round((x1 - 8) / 16), cy1 = Math.round((y1 - 8) / 16);
  const cx2 = Math.round((x2 - 8) / 16), cy2 = Math.round((y2 - 8) / 16);
  const dx = Math.sign(cx2 - cx1), dy = Math.sign(cy2 - cy1);
  let cx = cx1, cy = cy1, guard = 0;
  for (;;) {
    if (cy >= 0 && cy < 17 && cx >= 0 && cx < 30 && grid[cy][cx] === '.') grid[cy][cx] = MK[mk] || '?';
    if ((cx === cx2 && cy === cy2) || ++guard > 60) break;
    cx += dx; cy += dy;
  }
}
// overlay player
const px = Math.floor(G.pl.x / 16), py = Math.floor((G.pl.y - 6) / 16);
if (grid[py] && grid[py][px] === '.') grid[py][px] = 'U';

console.log('    ' + '0123456789'.repeat(3));
grid.forEach((r, i) => console.log(String(i).padStart(2) + ': ' + r.join('')));
console.log('\nplates', JSON.stringify(G.plates), 'power', G.power,
  'bridgeCells', G.bfloor.filter(v => v).length, 'segs', G.segs.length / 5);
console.log('legend: r/g/b/y/c/m single-colour beam, = full rainbow, U player');
