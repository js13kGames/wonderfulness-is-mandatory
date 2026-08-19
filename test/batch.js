const fs = require('fs'), { check } = require('./check');
const files = fs.readdirSync(__dirname + '/../levels').filter(f => /^L\d\d\.txt$/.test(f)).sort();
let bad = 0;
for (const f of files) {
  const map = fs.readFileSync(__dirname + '/../levels/' + f, 'utf8').replace(/\n+$/, '');
  const pf = __dirname + '/../levels/' + f.replace('.txt', '.plan.json');
  const rows = map.split('\n');
  let geo = rows.length === 17 && rows.every(r => r.length === 30) ? '' : ' [BAD GEOMETRY]';
  if (!fs.existsSync(pf)) { console.log(f + '  no plan' + geo); bad++; continue }
  let r;
  try { r = check(map, JSON.parse(fs.readFileSync(pf, 'utf8'))) }
  catch (e) { console.log(f + '  PLAN ERROR ' + e.message + geo); bad++; continue }
  console.log((r.ok ? 'ok  ' : 'FAIL') + ' ' + f + '  ghosts=' + (r.ok ? r.loops : '-') + geo +
    (r.ok ? '' : '  ' + JSON.stringify({ x: (r.x || 0) | 0, y: (r.y || 0) | 0, g: r.ghosts })));
  if (!r.ok) bad++;
}
console.log(bad ? '\n' + bad + ' of ' + files.length + ' not verified' : '\nall ' + files.length + ' verified');
