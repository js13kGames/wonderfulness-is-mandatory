// charset collision + level geometry lint
const fs = require('fs');
const core = fs.readFileSync(__dirname + '/../src/00_core.js', 'utf8');
const seen = {}, dup = [];
for (const m of core.matchAll(/^def\('((?:[^'\\]|\\\\)+)'/gm)) {
  const chars = m[1].replace('\\\\', '\\');
  for (const ch of chars) { if (seen[ch]) dup.push(ch + ' (in "' + seen[ch] + '" and "' + chars + '")'); seen[ch] = chars }
}
// specials handled outside CH
for (const ch of 'S*') { if (seen[ch]) dup.push(ch + ' collides with a special (spawn/star)') }
if (dup.length) { console.log('CHARSET COLLISIONS:\n  ' + dup.join('\n  ')); process.exitCode = 1 }
else console.log('charset OK  (' + Object.keys(seen).length + ' glyphs + S,* specials)');

const lv = fs.readFileSync(__dirname + '/../src/20_levels.js', 'utf8');
const known = new Set(Object.keys(seen).concat(['.', 'S', '*']));
let n = 0, bad = 0;
for (const m of lv.matchAll(/m:\n`([^`]*)`/g)) {
  n++; const rows = m[1].replace(/\\\\/g, '\\').split('\n');
  if (rows.length != 17) { console.log('L' + n + ': ' + rows.length + ' rows (want 17)'); bad++ }
  rows.forEach((r, i) => {
    if (r.length != 30) { console.log('L' + n + ' row ' + i + ': ' + r.length + ' cols (want 30)'); bad++ }
    for (const ch of r) if (!known.has(ch)) { console.log('L' + n + ' row ' + i + ': unknown glyph "' + ch + '"'); bad++ }
  });
  if (!m[1].includes('S')) { console.log('L' + n + ': no spawn'); bad++ }
  if (!m[1].includes('C')) { console.log('L' + n + ': no goal'); bad++ }
}
console.log(bad ? bad + ' LEVEL PROBLEMS' : n + ' levels OK');
if (bad) process.exitCode = 1;
