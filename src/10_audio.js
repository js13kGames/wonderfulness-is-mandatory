// ================= AUDIO =================
// The music loop is EXACTLY 13.000s and restarts with every time loop, so the
// song is the clock: 13 beats, one accent per second. 13/4 is a subtly wrong
// meter, which is free cosmic horror.
var A = 0, MG, MUT = 0, cr = 0, MBUF = 0, MSRC = 0, MCR = -1, sq = 1;
function A0() {
  if (A) { if (A.state == 'suspended') A.resume(); return }
  A = new (self.AudioContext || self.webkitAudioContext)();
  MG = A.createGain(); MG.gain.value = .55;
  var cmp = A.createDynamicsCompressor();
  MG.connect(cmp); cmp.connect(A.destination);
  musStart();
}
function rnf() { sq = (sq * 1103515245 + 12345) & 2147483647; return sq / 1073741824 - 1 }

// ---- one-shot voices (sfx) ----
function tone(f, t, d, ty, v, sl) {
  if (!A || MUT) return;
  var o = A.createOscillator(), g = A.createGain();
  o.type = ty; o.frequency.setValueAtTime(f, t);
  if (sl != 1) o.frequency.exponentialRampToValueAtTime(max(24, f * sl), t + d);
  g.gain.setValueAtTime(1e-4, t);
  g.gain.exponentialRampToValueAtTime(v, t + .006);
  g.gain.exponentialRampToValueAtTime(1e-4, t + d);
  o.connect(g); g.connect(MG); o.start(t); o.stop(t + d + .03);
}
// 0 jump 1 land 2 power 3 socket 4 grab 5 loop 6 nope 7 win 8 tick 9 alarm 10 poof 11 unpower
var SFX = [
  [430, .1, 0, .17, 2.3], [150, .07, 1, .15, .6], [700, .13, 3, .12, 1.5],
  [520, .2, 3, .13, 2], [880, .07, 0, .11, 1.6], [300, .3, 1, .14, .35],
  [90, .16, 2, .12, .8], [523, .45, 3, .18, 2], [1500, .02, 0, .04, 1],
  [1900, .05, 0, .09, .7], [1100, .12, 3, .08, .4], [420, .16, 2, .1, .5],
];
var vc = 0, vt = 0;
function sfx(n) {
  if (!A || MUT) return;
  var t = A.currentTime;
  if (t != vt) { vt = t; vc = 0 }
  if (++vc > 4) return;                       // voice cap: 5 ghosts landing at once must not clip
  var s = SFX[n], dt = (vc - 1) * .012;
  tone(s[0] * (1 + dt), t + dt, s[1], ['square', 'triangle', 'sawtooth', 'sine'][s[2]], s[3], s[4]);
  if (n == 5) tone(s[0] * 1.5, t + .05, .25, 'triangle', .1, .4);
  if (n == 3 || n == 7) for (var i = 1; i < 4; i++) tone(s[0] * (1 + i * .26), t + i * .07, .3, 'triangle', .11, 1.3);
}

// ---- the 13 second song ----
function nf(n) { return 261.63 * M.pow(2, n / 12) }
// wave: 0 square 1 tri 2 saw 3 sine 4 noise
function put(d, N, sr, t0, dur, f, amp, wave, dec) {
  var i0 = t0 * sr | 0, n = dur * sr | 0, ph = 0, dp = f / sr, i, v, e, at = sr * .004;
  for (i = 0; i < n; i++) {
    e = min(1, i / at) * M.pow(1 - i / n, dec);
    ph += dp; ph -= ph | 0;
    v = wave == 0 ? (ph < .5 ? 1 : -1) : wave == 1 ? 4 * abs(ph - .5) - 1
      : wave == 2 ? 2 * ph - 1 : wave == 3 ? sin(ph * TAU) : rnf();
    d[(i0 + i) % N] += v * e * amp;
  }
}
var MEL = "H E A E H   J H L H C H L   J H J E A E J   M L F E ";
function renderSong(dr) {
  var sr = A.sampleRate, N = M.round(13 * sr), buf = A.createBuffer(1, N, sr), d = buf.getChannelData(0);
  var STEP = .25, S = 52, i, s, beat, rt, th, fi, ch, n, det = 1 - dr * .014;
  th = dr > .3 ? 3 : 4; fi = dr > .7 ? 6 : 7;
  sq = 1;
  for (s = 0; s < S; s++) {
    var t = s * STEP; beat = s >> 2;
    rt = [0, 0, 0, 0, 7, 7, 7, 7, 9, 9, 9, 9, 5][beat];
    ch = [rt, rt + th, rt + fi];
    if (!(s & 3)) {                                   // one accent per second: the clock
      put(d, N, sr, t, .3, nf(rt - 24) * det, .3, 1, 2.4);
      put(d, N, sr, t, .05, 60, .18 * (1 - dr * .4), 4, 6);
    }
    put(d, N, sr, t, .16, nf(ch[s % 3] - 12 + (s % 8 > 3 ? 12 : 0)) * det, .07, dr > .6 ? 1 : 0, 3);
    n = MEL.charCodeAt(s) - 65;
    if (n >= 0) {
      if (dr > .3 && (n == 4 || n == 9 || n == 11)) n--;
      put(d, N, sr, t, .3, nf(n) * det, .1, dr > .55 ? 2 : 0, 2.6);
    }
    if ((s & 1) && dr < .8) put(d, N, sr, t, .035, 9000, .035 * (1 - dr), 4, 5);
    if (dr > .35 && !(s % 16)) put(d, N, sr, t, 4.2, nf(rt - 36) * 1.006, .1 * dr, 2, .35);
  }
  if (dr > .5) for (i = 0; i < N; i++) d[i] += rnf() * .006 * dr;    // tape hiss
  for (i = 0; i < N; i++) d[i] = clamp(d[i], -.92, .92);
  return buf;
}
function musStart() {
  if (!A || MUT) return;
  var k = M.round(cr * 4) / 4;
  if (MCR != k) { MCR = k; MBUF = renderSong(k) }
  if (MSRC) try { MSRC.stop() } catch (e) {}
  MSRC = A.createBufferSource(); MSRC.buffer = MBUF; MSRC.loop = 1;
  MSRC.connect(MG); MSRC.start();
}
function musStop() { if (MSRC) { try { MSRC.stop() } catch (e) {} MSRC = 0 } }
