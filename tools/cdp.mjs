// CDP driver: navigates headless chrome to auto.html, watches the REAL game
// globals, and captures screenshots itself - no dependence on page-side fetch.
import fs from 'fs';

const DBG = 'http://127.0.0.1:9222';
const OUT = process.argv[2] || 'shots';
fs.mkdirSync(OUT, { recursive: true });

const list = await (await fetch(DBG + '/json/list')).json();
const page = list.find(t => t.type === 'page');
if (!page) { console.log('no page target'); process.exit(1); }
const ws = new WebSocket(page.webSocketDebuggerUrl);
await new Promise(r => ws.onopen = r);

let id = 0;
const pending = new Map();
ws.onmessage = ev => {
  const m = JSON.parse(ev.data);
  if (m.id && pending.has(m.id)) { pending.get(m.id)(m); pending.delete(m.id); }
};
function send(method, params = {}) {
  return new Promise(res => { const i = ++id; pending.set(i, res); ws.send(JSON.stringify({ id: i, method, params })); });
}
async function evalJs(expr) {
  const r = await send('Runtime.evaluate', { expression: expr, returnByValue: true });
  return r.result?.result?.value;
}
async function shot(name) {
  const r = await send('Page.captureScreenshot', { format: 'png' });
  if (r.result?.data) {
    fs.writeFileSync(`${OUT}/${name}.png`, Buffer.from(r.result.data, 'base64'));
    console.log('shot', name);
  }
}
function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

await send('Page.enable');
await send('Page.navigate', { url: 'http://localhost:8014/auto.html' });
console.log('navigated; watching...');

let lastLi = -1, lastSt = -1, midTaken = {}, booted = false;
const MID = { 1: 480, 4: 420, 8: 430, 11: 430, 12: 380 };
const t0 = Date.now();
while (Date.now() - t0 < 750000) {
  await sleep(250);
  let s;
  try { s = JSON.parse(await evalJs(`JSON.stringify({st:+st,li:+li,fr:+frame,g:ghosts.length,err:window.onerror?'':'x'})`) || 'null'); }
  catch (e) { console.log('eval fail', e.message); continue; }
  if (!s) continue;
  if (!booted && s.st === 1) { booted = true; console.log('game running'); await sleep(2600); await shot('a_intro_L01'); }
  if (!booted) continue;
  if (s.li !== lastLi || s.st !== lastSt) {
    console.log(`state -> L${s.li + 1} st${s.st} f${s.fr} ghosts${s.g}`);
    if (s.st === 1) await shot(`b_start_L${String(s.li + 1).padStart(2, '0')}`);
    lastLi = s.li; lastSt = s.st;
  }
  const mk = 'L' + s.li;
  if (MID[s.li] && !midTaken[mk] && s.fr >= MID[s.li]) { midTaken[mk] = 1; await shot(`c_mid_L${String(s.li + 1).padStart(2, '0')}`); }
  if (s.st === 3) { await sleep(6500); await shot('z_ending'); console.log('ENDING REACHED'); break; }
}
await shot('zz_final');
ws.close();
process.exit(0);