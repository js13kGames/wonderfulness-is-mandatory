// builds dist/auto.html: dev bundle + autopilot playing every level from the
// shipped plans, snapping real rendered frames to serve.js /shot
import fs from 'fs';

const ORDER = fs.readdirSync('src').filter(f => f.endsWith('.js')).sort();
const RAW = ORDER.map(f => fs.readFileSync('src/' + f, 'utf8')).join('\n');
const PLANS = [];
for (let i = 1; i <= 13; i++) {
  const id = 'L' + String(i).padStart(2, '0');
  PLANS.push(JSON.parse(fs.readFileSync('levels/' + id + '.plan.json', 'utf8')));
}

// flatten every level's loops into one step list; non-final loops get a commit marker
const FLAT = PLANS.map((loops) => {
  const out = [];
  loops.forEach((loop, li) => {
    (loop.steps || loop).forEach(s => out.push(s));
    if (li < loops.length - 1) out.push({ commit: true });
  });
  return out;
});

const AUTOPILOT = `
(function () {
  var FLAT = ${JSON.stringify(FLAT)};
  var SHOTS = [[0,260,'g01_run'],[1,480,'l02_ghost'],[4,420,'l05_bridge'],
               [8,430,'l09_star'],[11,430,'l12_herd'],[12,380,'l13_light']];
  var taken = {}, errs = '';
  function shot(name) {
    try { fetch('/shot?n=' + name, { method: 'POST',
      body: document.getElementById('c').toDataURL('image/png') }); } catch (e) {}
  }
  function fail(e) { window.__err = String((e && e.message) || e); window.__si = cur ? cur.si : -1; window.__n = cur ? cur.n : -1; errs += e + ';'; try {
    var x = document.getElementById('c').getContext('2d');
    x.fillStyle = '#000'; x.fillRect(0, 0, W, H);
    x.fillStyle = '#fff'; x.font = '14px monospace';
    String(errs).split(';').forEach(function (l, i) { x.fillText(l.slice(0, 60), 10, 30 + i * 20) });
    shot('ERRORS');
  } catch (e2) {} }
  window.onerror = function (m) { fail(m); return false; };
  var markN = 0;
  function mark(tag) {
    try {
      var mc = document.createElement('canvas'); mc.width = 60; mc.height = 10;
      var mx = mc.getContext('2d'); mx.fillStyle = '#111'; mx.fillRect(0, 0, 60, 10);
      mx.fillStyle = '#5f5'; mx.font = '9px monospace'; mx.fillText(String(tag).slice(0, 14), 2, 8);
      fetch('/shot?n=m' + (markN++) + '_' + tag, { method: 'POST', body: mc.toDataURL('image/png') });
    } catch (e) {}
  }
  window.mark = mark;
  var cur = null, lastFrame = 0, justC = false;
  var started = {};
  try {
    var _tick = tick;
    tick = function () {
      try { step(); } catch (e) { fail(e); try { _tick(); } catch (e2) {} }
    };
    function step() {
      if (st === 0) { _tick(); return; }
      if (st === 3) {
        _tick();
        if (!taken['ending']) { taken['ending'] = 1; setTimeout(function () { shot('ending'); }, 6500); }
        return;
      }
      var i;
      for (i = 0; i < SHOTS.length; i++) {
        var sh = SHOTS[i];
        if (st === 1 && li === sh[0] && frame === sh[1] && !taken[sh[2]]) { taken[sh[2]] = 1; shot(sh[2]); }
      }
      if (st === 2) {
        if (!taken['w' + li]) { taken['w' + li] = 1; mark('cc_L' + li + '_f' + frame); }
        if (!taken['W' + li]) { taken['w' + li] = 1; if ([0, 1, 4].indexOf(li) >= 0) shot('win_L' + (li + 1)); }
        _tick(); won = 0; return;
      }
      if (!started['L' + li]) { started['L' + li] = 1; cur = { si: 0, n: 0, acted: false }; lastFrame = 0; justC = false; mark('go_L' + li + '_f' + frame); }
      window.__si = cur.si; window.__n = cur.n;
      var wrapped = frame < lastFrame;
      lastFrame = frame;
      if (wrapped && !justC) {           // auto-commit satisfied the hold:
        cur.si += 2;                     //   drop the hold step AND its commit marker
        cur.n = 0; cur.acted = false;
        mark('wrap_L' + li + '_si' + cur.si);
      }
      justC = false;
      if (!(frame % 120)) mark('L' + li + '_f' + frame);
      var plan = FLAT[li];
      var s = plan[cur.si];
      if (s && s.commit) { justC = true; commitLoop(); cur = { si: cur.si + 1, n: 0, acted: false }; _tick(); return; }
      if (!s) { K = 0; _tick(); return; }
      var a = pl, k = 0;
      var tx = s.x == null ? a.x : s.x, dx = tx - a.x;
      var arrived = Math.abs(dx) <= 2.5;
      if (dx < -2.5) k |= 1; else if (dx > 2.5) k |= 2;
      if ((s.j || s.up) && a.g && !arrived) k |= 4;
      if ((k & 3) && Math.abs(a.vx) < .1 && a.g) k |= 4;
      if (arrived && s.a && !cur.acted) k |= 8;
      K = k;
      _tick();
      if (won || pl.dead) { if (pl.dead) cur = { si: 0, n: 0, acted: false }; return; }
      if (arrived) {
        if (s.a && !cur.acted) cur.acted = true;
        cur.n++;
        if (cur.n > (s.hold || 0)) { cur.si++; cur.n = 0; cur.acted = false; }
      } else cur.n = 0;
    }
    startLevel(0);
    setTimeout(function () { shot('dbg_start'); }, 1500);
  } catch (e) { fail(e); }
})();`;

const HTML = `<!DOCTYPE html><html lang=en><meta charset=utf-8><title>auto</title><body style="margin:0"><canvas id=c></canvas>
<script>${RAW}</script><script>${AUTOPILOT}</script>`;
fs.writeFileSync('dist/auto.html', HTML);
console.log('auto.html written:', FLAT.reduce((a, p) => a + p.length, 0), 'steps total,', RAW.length, 'raw chars');