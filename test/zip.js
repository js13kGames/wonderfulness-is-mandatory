// Guards the submission rules. The classic js13k disqualification is zipping the
// FOLDER instead of its contents, which buries index.html one level down.
const fs = require('fs'), cp = require('child_process');
const ZIP = __dirname + '/../dist/game.zip';
const LIMIT = 13312;
let bad = 0;
const ok = (c, msg) => { console.log((c ? '  ok   ' : '  FAIL ') + msg); if (!c) bad++ };

if (!fs.existsSync(ZIP)) { console.log('no dist/game.zip - run npm run build'); process.exit(1) }

const names = cp.execSync('unzip -Z1 ' + JSON.stringify(ZIP), { encoding: 'utf8' })
  .split('\n').map(s => s.trim()).filter(Boolean);

console.log('zip contains: ' + JSON.stringify(names));
ok(names.includes('index.html'), 'index.html is present');
ok(!names.some(n => n.includes('/')), 'no nested paths - index.html is in the TOP directory');
ok(!names.some(n => /__MACOSX|\.DS_Store|Thumbs\.db/.test(n)), 'no OS junk files');
ok(names.length === 1, 'exactly one entry (' + names.length + ')');

const size = fs.statSync(ZIP).size;
ok(size <= LIMIT, 'zip is ' + size + ' bytes, limit ' + LIMIT + ' (' + (LIMIT - size) + ' free)');

// the extracted file must equal what we built, byte for byte
const tmp = fs.mkdtempSync(require('os').tmpdir() + '/z13-');
cp.execSync('cd ' + tmp + ' && unzip -q ' + JSON.stringify(ZIP));
const a = fs.readFileSync(tmp + '/index.html'), b = fs.readFileSync(__dirname + '/../dist/index.html');
ok(a.equals(b), 'extracted index.html is byte-identical to the build');
fs.rmSync(tmp, { recursive: true, force: true });

const html = a.toString('binary');
ok(/<\/script>/.test(html), 'the script tag is closed (an unterminated one silently never runs)');
ok(/^<!DOCTYPE html>/i.test(html), 'starts with a doctype');
ok(!/https?:\/\/(?!www\.w3\.org)/.test(html), 'no external URLs - rule 2 forbids external resources');
let ctl = 0; for (const c of a) if (c < 9 || (c > 13 && c < 32)) ctl++;
console.log('  note   ' + ctl + ' packed control bytes present (must survive git/transfer intact)');

console.log(bad ? '\n' + bad + ' SUBMISSION PROBLEMS' : '\nzip is submission-ready');
process.exitCode = bad ? 1 : 0;
