// Unit tests for the optics: emitters, mirrors, prisms, filters, receivers, doors, plates, star.
const G = require('./harness');
let pass = 0, fail = 0;
function mk(cells) {
  const g = Array.from({ length: 17 }, () => Array(30).fill('.'));
  for (let x = 0; x < 30; x++) { g[16][x] = '#'; g[15][x] = '#' }
  if (!Object.values(cells).includes('S')) g[14][1] = 'S';
  for (const k in cells) { const [x, y] = k.split(',').map(Number); g[y][x] = cells[k] }
  return g.map(r => r.join('')).join('\n');
}
function load(cells, frames) {
  G.parseLevel(mk(cells)); G.resetWorld();
  for (let i = 0; i < (frames || 3); i++) { G.setK(0); G.step() }
}
function segs() { const o = []; for (let i = 0; i < G.segs.length; i += 5) o.push(G.segs.slice(i, i + 5).join(',')); return o }
function ck(name, got, want) {
  const ok = JSON.stringify(got) === JSON.stringify(want);
  console.log((ok ? '  ok   ' : '  FAIL ') + name + (ok ? '' : '\n         got  ' + JSON.stringify(got) + '\n         want ' + JSON.stringify(want)));
  ok ? pass++ : fail++;
}
const cc = (cx, cy) => [cx * 16 + 8, cy * 16 + 8];

console.log('--- emitter + walls ---');
load({ '2,5': '>', '9,5': '#' });
ck('beam right stops at the wall face', segs(), ['40,88,144,88,7']);

console.log('--- fixed mirrors ---');
load({ '2,5': '>', '9,5': '/' });
ck('/ turns R into U', segs(), ['40,88,152,88,7', '152,88,152,0,7']);
load({ '2,5': '>', '9,5': '\\' });
ck('\\ turns R into D', segs(), ['40,88,152,88,7', '152,88,152,240,7']);

console.log('--- prism ---');
load({ '2,5': '>', '9,5': 'p' });
ck('prism splits R/G/B into up/straight/down', segs().sort(), [
  '152,88,152,0,1',       // red turns left (up)
  '152,88,152,240,4',     // blue turns right (down)
  '152,88,480,88,2',      // green continues
  '40,88,152,88,7',
].sort());

console.log('--- filters ---');
load({ '2,5': '>', '9,5': 'r' });
ck('red filter passes red only', segs(), ['40,88,152,88,7', '152,88,480,88,1']);
load({ '2,5': '>', '9,5': 'r', '13,5': 'g' });
ck('red then green filter = absorbed', segs(), ['40,88,152,88,7', '152,88,216,88,1']);

console.log('--- receivers / power ---');
load({ '2,5': '>', '9,5': 'r', '20,5': 'R' }, 4);
ck('red receiver lit by red beam -> power 1', G.power, 1);
load({ '2,5': '>', '9,5': 'b', '20,5': 'R' }, 4);
ck('blue beam does NOT light red receiver', G.power, 0);
load({ '2,5': '>', '20,5': 'Y' }, 4);
ck('white beam lights yellow (R|G) receiver', G.power, 3);
// two coloured beams merging on one receiver
load({ '2,5': '>', '9,5': 'r', '20,5': 'Y', '20,1': 'v', '20,3': 'g' }, 4);
ck('red + green from two directions light Y', G.power, 3);

console.log('--- doors ---');
load({ '2,5': '>', '9,5': '1', '20,5': 'R' }, 6);
ck('unpowered red door blocks the beam', G.power, 0);
load({ '2,5': '>', '9,5': 'R', '2,8': '>', '9,8': '1', '20,8': 'G' }, 8);
ck('door opens once its channel is powered', G.power, 3);

console.log('--- toggle mirror + plate ---');
load({ '20,5': 'v', '20,14': 'A', '6,15': '!' }, 4);
ck('rest / sends the down-beam left (until it hits the unicorn)', segs()[1].split(',')[2] | 0, 32);
G.parseLevel(mk({ '20,5': 'v', '20,14': 'A', '6,15': '!' })); G.resetWorld();
for (let i = 0; i < 200; i++) { const d = 104 - G.pl.x; G.setK(d < -2 ? 1 : d > 2 ? 2 : 0); G.step() }
ck('unicorn on plate flips the mirror', G.plates[0], 1);
ck('flipped mirror sends the beam right', G.segs[G.segs.length - 3], 480);

console.log('--- body eclipse ---');
load({ '2,5': '>', '2,14': '#' }, 3);
ck('beam crosses an empty row', segs(), ['40,88,480,88,7']);
// unicorn standing on a floor with the beam at chest height blocks it
load({ '2,5': '>', '8,6': '#', '8,5': 'S' }, 3);
ck('a unicorn eclipses a beam through its torso', (segs()[0].split(',')[2] | 0) < 200, true);
// but a unicorn standing ON a horizontal beam must NOT sever it
G.parseLevel(mk({ '2,5': '>', '10,2': 'S' })); G.resetWorld();
for (let i = 0; i < 90; i++) { G.setK(0); G.step() }
ck('unicorn falls onto the rainbow', Math.abs(G.pl.y - 88) < 1.5, true);
ck('standing on a rainbow does NOT sever it', segs(), ['40,88,480,88,7']);
// vertical beam is cut by a body
load({ '9,2': 'v', '9,14': 'S' }, 3);
ck('a unicorn eclipses a vertical beam', (segs()[0].split(',')[3] | 0) < 232, true);

console.log('--- star + socket ---');
G.parseLevel(mk({ '5,13': '*', '9,14': 'O' })); G.resetWorld();
for (let i = 0; i < 60; i++) { G.setK(0); G.step() }
ck('star falls and rests on the floor', Math.abs(G.star.y - 236) < 3, true);
G.parseLevel(mk({ '5,13': '*', '9,13': 'O' })); G.resetWorld();
for (let i = 0; i < 300; i++) { const d = 152 - G.pl.x; G.setK(d < -2 ? 1 : d > 2 ? 2 : 0); G.step() }
ck('unicorn picks the star up', !!(G.star.h || G.star.in), true);
for (let i = 0; i < 90; i++) { G.setK(8); G.step(); G.setK(0); G.step() }
ck('star dropped into socket powers channel 8', (G.power & 8) === 8, true);

console.log('\n' + pass + ' passed, ' + fail + ' failed');
process.exitCode = fail ? 1 : 0;
