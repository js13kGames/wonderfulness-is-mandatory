// ============ THE LAST UNICORN ============
// world grid
var TS = 16, GW = 30, GH = 17, W = GW * TS, H = GH * TS;
var X = c.getContext('2d');

// bloom buffer (1/3 res)
var bc = document.createElement('canvas'), BX;
bc.width = 240; bc.height = 136; BX = bc.getContext('2d');

var VW = 1, VH = 1, SC = 1, OX = 0, OY = 0, DPR = 1;
function resize() {
  DPR = Math.min(2, devicePixelRatio || 1);
  VW = innerWidth; VH = innerHeight;
  c.width = VW * DPR | 0; c.height = VH * DPR | 0;
  c.style.width = VW + 'px'; c.style.height = VH + 'px';
  SC = Math.min(VW / W, VH / H);
  OX = (VW - W * SC) / 2; OY = (VH - H * SC) / 2;
}
onresize = resize;

// ---- math ----
var M = Math, PI = M.PI, TAU = PI * 2;
var sin = M.sin, cos = M.cos, abs = M.abs, min = M.min, max = M.max, flr = M.floor, hyp = M.hypot;
function clamp(v, a, b) { return v < a ? a : v > b ? b : v }
function lerp(a, b, t) { return a + (b - a) * t }
// deterministic hash-noise (never used in sim, only decor)
function rnd(n) { n = sin(n * 127.1 + 311.7) * 43758.5453; return n - flr(n) }

// ---- tile ids ----
var EMPTY = 0, SOLID = 1, CLOUD = 2, THORN = 3, GOAL = 4, EMIT = 5, MIRR = 6,
    PRIS = 7, FILT = 8, RECV = 9, DOOR = 10, PLATE = 11, SOCK = 12;

// grid char -> [type, param]
// param: EMIT=dir | MIRR = orient | (grp+1)<<1 | FILT/RECV/DOOR = colour mask | PLATE = grp
var CH = {};
function def(s, t, f) { for (var i = 0; i < s.length; i++) CH[s[i]] = [t, f(i, s[i])] }
def('#', SOLID, () => 0);
def('=', CLOUD, () => 0);
def('x', THORN, () => 0);
def('C', GOAL, () => 0);
def('><v^', EMIT, i => [0, 2, 1, 3][i]);          // right left down up
def('/\\', MIRR, i => i);                          // fixed mirrors
def('AaDdEe', MIRR, i => (i & 1) | ((i >> 1) + 1) << 1); // toggle: grp 0,1,2
def('p', PRIS, () => 0);
def('rgbykm', FILT, i => [1, 2, 4, 3, 6, 5][i]);
def('RGBYKM', RECV, i => [1, 2, 4, 3, 6, 5][i]);
def('W', RECV, () => 7);
def('123456789', DOOR, i => i + 1);
def('!@$', PLATE, i => i);
def('O', SOCK, () => 0);

// colour by mask (0..8 used)
var COL = [, '#f24', '#4e6', '#fd4', '#49f', '#f5e', '#5ef', '#fff', '#fc3'];
// darker rim
var COLD = [, '#801', '#180', '#951', '#026', '#809', '#088', '#889', '#940'];

// direction vectors  0=R 1=D 2=L 3=U
var DX = [1, 0, -1, 0], DY = [0, 1, 0, -1];

// ---- input ----
// three sources OR'd into one action map: 1=left 2=right 4=jump 8=action
// meta: 1=new loop 2=undo 4=fast-forward 8=restart level 16=any-key 32=mute
var K = 0, KP = 0, meta = 0, MP = 0, kbK = 0, kbM = 0, tK = 0, tM = 0, gpK = 0, gpM = 0, anyK = 0;
var kmap = { ArrowLeft: 1, KeyA: 1, ArrowRight: 2, KeyD: 2, ArrowUp: 4, KeyW: 4, Space: 4, KeyZ: 4, KeyK: 4,
             KeyX: 8, ArrowDown: 8, KeyS: 8, KeyL: 8 };
var mmap = { KeyR: 1, Enter: 1, KeyQ: 2, Backspace: 2, KeyE: 2, ShiftLeft: 4, ShiftRight: 4, Tab: 4, KeyT: 8, KeyM: 32 };
onkeydown = e => {
  if (e.metaKey || e.ctrlKey) return;
  if (e.code == 'Tab' || e.code == 'Space' || e.code.slice(0, 5) == 'Arrow') e.preventDefault();
  kbK |= kmap[e.code] | 0; kbM |= mmap[e.code] | 0; anyK = 1; A0();
};
onkeyup = e => { kbK &= ~(kmap[e.code] | 0); kbM &= ~(mmap[e.code] | 0) };
onblur = () => { kbK = kbM = 0 };

var touchOn = 0;
try { touchOn = matchMedia('(pointer:coarse)').matches ? 1 : 0 } catch (e) {}
function tpt(t) { return [(t.clientX - OX) / SC, (t.clientY - OY) / SC] }
function tupd(e) {
  e.preventDefault(); touchOn = 1; anyK = 1; A0();
  var k = 0, m = 0, i, p;
  for (i = 0; i < e.touches.length; i++) {
    p = tpt(e.touches[i]);
    if (p[1] > H * .46) k |= p[0] < W * .13 ? 1 : p[0] < W * .27 ? 2 : p[0] > W * .87 ? 8 : p[0] > W * .72 ? 4 : 0;
    else if (p[0] > W * .87) m |= 1; else if (p[0] > W * .74) m |= 2; else if (p[0] < W * .13) m |= 4;
  }
  tK = k; tM = m;
}
addEventListener('touchstart', tupd, { passive: 0 });
addEventListener('touchmove', tupd, { passive: 0 });
addEventListener('touchend', tupd, { passive: 0 });
addEventListener('touchcancel', tupd, { passive: 0 });
addEventListener('pointerdown', () => { anyK = 1; A0() });

function pad() {
  var g = navigator.getGamepads ? navigator.getGamepads()[0] : 0, k = 0, m = 0, b, i;
  if (!g) { gpK = gpM = 0; return }
  b = i => g.buttons[i] && g.buttons[i].pressed;
  var ax = g.axes[0] || 0;
  if (ax < -.4 || b(14)) k |= 1;
  if (ax > .4 || b(15)) k |= 2;
  if (b(0) || b(12)) k |= 4;
  if (b(2) || b(13)) k |= 8;
  if (b(1)) m |= 1;
  if (b(3)) m |= 2;
  if (b(5) || b(7) || b(4) || b(6)) m |= 4;
  if (b(9)) m |= 8;
  if (k | m) anyK = 1;
  gpK = k; gpM = m;
}
function inputPoll() {
  pad();
  var nk = kbK | tK | gpK, nm = kbM | tM | gpM;
  KP = nk & ~K; K = nk;
  MP = (nm & ~meta) | (anyK ? 16 : 0); meta = nm; anyK = 0;
  if (MP & 32) { MUT ^= 1; if (MUT) musStop(); else musStart() }
}
