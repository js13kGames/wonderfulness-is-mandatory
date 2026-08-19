// ================= GAME =================
// st: 0 title/select  1 play  2 curtain call  3 ending
var st = 0, li = 0, acc = 0, last = 0, intro = 0, cc = 0, ccEnd = 0, ccT = 0;
var total = 0, best = [], maxL = 0, sel = 0, endT = 0, zoom = 1;
var spare = 13, SPMAX = 13, refund = 0, denied = 0;
function GC(i) { return 'hsl(' + ((i * 67 + 24) % 360) + ',92%,66%)' }
var POST = ("THE END OF THE RAINBOW IS THIS WAY!|SHE WILL WAIT HERE. SHE DOESN'T MIND.|" +
  "EVERY RAINBOW HAS AN END. THIS IS FINE.|YOU ARE MAKING EXCELLENT PROGRESS.|" +
  "SHE STOOD THERE UNTIL YOU WERE ACROSS.|ONE OF YOU IS ENOUGH, IF SHE HURRIES.|" +
  "THE LIGHT DOES NOT MIND BEING BLOCKED.|PLEASE DO NOT LOOK BACK AT THE MEADOW.|" +
  "TWO COLOURS. ONE OF YOU. AS DESIGNED.|THE STAR WAS NEVER YOURS TO CARRY.|" +
  "THEY ARE STILL STANDING. ALL OF THEM.|A BODY IS A COMPONENT. YOU KNEW THAT.|" +
  "THE HERD IS A NUMBER. THE NUMBER IS YOU.|THERE IS NO OTHER SIDE.").split('|');

function load() {
  try {
    var d = JSON.parse(localStorage['tlu.p']);
    maxL = d.m | 0; total = d.t | 0; best = d.b || [];
    spare = d.s == null ? SPMAX : d.s | 0;
  } catch (e) {}
}
function save() {
  try { localStorage['tlu.p'] = JSON.stringify({ m: maxL, t: total, b: best, s: spare }) } catch (e) {}
}
// Each level issues you par+1 unicorns. Going over draws on a reserve of 13 for the
// whole game; finishing at par or better returns one to the reserve.
function allow() { return LEV[li].p + 1 }
function over() { return max(0, ghosts.length - allow()) }
function spareLeft() { return spare - over() }
function startLevel(n) {
  li = n; sel = n; ghosts = []; parseLevel(LEV[n].m);
  cr = LEV.length > 1 ? M.pow(n / (LEV.length - 1), 1.85) : 0;   // stay cheerful, then collapse
  refund = 0; denied = 0;
  skyC = -1; cc = 0; intro = 2.4; st = 1; P.length = 0;
  resetWorld();
}
function startCurtain() {
  ghosts.push({ i: rec.slice(0, frame + 1), n: frame + 1 });
  ccEnd = frame + 40; ccT = 0; cc = 1; st = 2; zoom = 1;
  var u = ghosts.length - 1;                       // the winning run is not a ghost you spent
  spare -= max(0, u - allow());
  refund = 0;
  if (u <= LEV[li].p && spare < SPMAX) { spare++; refund = 1; sfx(3) }
  total += u; if (best[li] == null || u < best[li]) best[li] = u;
  if (li + 1 > maxL) maxL = li + 1;
  save();
  resetWorld(); pl.dead = 1;
}
function nextLevel() { if (li + 1 < LEV.length) startLevel(li + 1); else { st = 3; endT = 0; musStart() } }

function tick() {
  if (cc) {
    if (frame >= ccEnd) return;
    K = 0; step(); won = 0; return;
  }
  if (won) { sfx(7); shake = 7; burst(pl.x, pl.y - 8, 7, 46); startCurtain(); return }
  if (frame >= LOOPF) { commitLoop(); return }
  if (pl.dead) { resetWorld(); sfx(6); return }
  step();
  if (frame > LOOPF - 180 && !(frame % 20)) sfx(9);
}

function loop(now) {
  requestAnimationFrame(loop);
  var dt = min(.05, (now - last) / 1000); last = now; T += dt;
  inputPoll();
  if (st == 1) {
    if (MP & 1) commitLoop();
    if (MP & 2) undoLoop();
    if (MP & 8) { ghosts = []; resetWorld() }
    acc += dt;
    var n = 0, mx = meta & 4 ? 5 : 1;
    while (acc > 1 / 60 && n < 8) { acc -= 1 / 60; for (var q = 0; q < mx && st == 1; q++) tick(); n++ }
    if (intro > 0) intro -= dt;
    if (loopFlash > 0) loopFlash -= dt * 3;
    if (pulse > 0) pulse -= dt * 5;
    if (denied > 0) denied -= dt;
  } else if (st == 2) {
    ccT += dt; zoom += (.86 - zoom) * dt * 3;
    acc += dt;
    while (acc > 1 / 60) { acc -= 1 / 60; tick() }
    if ((ccT > 1.2 && frame >= ccEnd) || MP & 16 && ccT > .4) nextLevel();
  } else if (st == 0) {
    if (MP & 1 || KP & 4) { A0(); startLevel(sel) }
    if (KP & 1) sel = max(0, sel - 1);
    if (KP & 2) sel = min(min(maxL, LEV.length - 1), sel + 1);
  } else if (st == 3) {
    endT += dt;
    if (endT > 6.4 && MP & 16) { st = 0; sel = 0 }
  }
  stepP(); shake *= .86;
  render(dt);
}

function render() {
  var sh = shake * (rnd(T * 313) - .5) * 2, sv = shake * (rnd(T * 71 + 5) - .5) * 2, z = st == 2 ? zoom : 1;
  X.setTransform(1, 0, 0, 1, 0, 0);
  X.fillStyle = '#0d0a18'; X.fillRect(0, 0, c.width, c.height);
  var s2 = SC * DPR * z;
  X.setTransform(s2, 0, 0, s2, (OX + sh) * DPR + W * SC * DPR * (1 - z) / 2, (OY + sv) * DPR + H * SC * DPR * (1 - z) / 2);
  X.save(); X.beginPath(); X.rect(0, 0, W, H); X.clip();
  sky(X);
  if (st == 0) { title(); X.restore(); return }
  if (st == 3) { ending(); X.restore(); return }

  chasm(X); tiles(X);
  var lp = st == 1 ? max(0, frame / LOOPF - .58) / .42 : 0;
  if (cr > .02 || lp > 0) {                 // the world drains; the rainbows never do
    X.globalCompositeOperation = 'saturation';
    X.globalAlpha = min(.96, cr * .82 + lp * .45);
    X.fillStyle = '#808080'; X.fillRect(0, 0, W, H);
    X.globalAlpha = 1; X.globalCompositeOperation = 'source-over';
  }
  BX.setTransform(1, 0, 0, 1, 0, 0); BX.clearRect(0, 0, bc.width, bc.height);
  var bs = bc.width / W; BX.setTransform(bs, 0, 0, bs, 0, 0);
  beams(BX, 1); drawP(BX);
  beams(X, 0);
  if (st == 1) hint(X, li);
  if (star) star_(X);
  var i, a;
  for (i = 0; i < actors.length; i++) {
    a = actors[i]; if (a.dead) continue;
    if (i < ghosts.length) {
      X.globalAlpha = .45; X.fillStyle = GC(i);
      X.beginPath(); X.ellipse(a.x, a.y - 1, 9, 2.6, 0, 0, TAU); X.fill();
      X.globalAlpha = 1;
      uni(X, a, .38 + .2 * M.pow(.94, ghosts.length - i), 0, i + 1, GC(i));
    }
  }
  if (!pl.dead) { rim(X, pl); uni(X, pl, 1, 0, 0, 0) }
  drawP(X);
  X.globalCompositeOperation = 'lighter';
  X.globalAlpha = .3 + pulse * .22; X.drawImage(bc, 0, 0, W, H);
  X.globalAlpha = .1; X.drawImage(bc, -7, -7, W + 14, H + 14);
  X.globalAlpha = 1; X.globalCompositeOperation = 'source-over';
  var vg = X.createRadialGradient(W / 2, H / 2, H * .3, W / 2, H / 2, H * .95);
  vg.addColorStop(0, '#0000'); vg.addColorStop(1, 'rgba(12,4,26,' + (.32 + cr * .5) + ')');
  X.fillStyle = vg; X.fillRect(0, 0, W, H);
  if (cr > .5) {
    X.globalAlpha = (cr - .5) * .28; X.fillStyle = '#000';
    for (var y2 = 0; y2 < H; y2 += 3) X.fillRect(0, y2, W, 1);
    X.globalAlpha = 1;
  }
  if (loopFlash > 0) { X.fillStyle = 'rgba(255,255,255,' + loopFlash * .3 + ')'; X.fillRect(0, 0, W, H) }
  if (st == 1) touchUI(X);
  hud();
  X.restore();
}
function rim(g, a) {                     // the live unicorn gets a halo nothing else has
  g.globalCompositeOperation = 'lighter'; g.globalAlpha = .17;
  var rg = g.createRadialGradient(a.x, a.y - 13, 1, a.x, a.y - 13, 17);
  rg.addColorStop(0, '#fff4d8'); rg.addColorStop(1, '#fff0');
  g.fillStyle = rg; g.beginPath(); g.arc(a.x, a.y - 13, 17, 0, TAU); g.fill();
  g.globalAlpha = 1; g.globalCompositeOperation = 'source-over';
}
function star_(g) {
  g.save(); g.translate(star.x, star.y); g.rotate(star.in ? 0 : T * 1.6);
  g.fillStyle = '#ffd24a'; g.beginPath();
  for (var z = 0; z < 10; z++) { var r = z & 1 ? 2.6 : 6.6, an = z * PI / 5 - PI / 2; g[z ? 'lineTo' : 'moveTo'](cos(an) * r, sin(an) * r) }
  g.closePath(); g.fill();
  g.fillStyle = '#fff'; g.beginPath(); g.arc(-1.2, -1.6, 1.5, 0, TAU); g.fill();
  g.restore();
  BX.globalCompositeOperation = 'lighter'; BX.fillStyle = '#fc3'; BX.globalAlpha = star.in ? 1 : .7;
  BX.beginPath(); BX.arc(star.x, star.y, star.in ? 13 : 9, 0, TAU); BX.fill();
  BX.globalAlpha = 1; BX.globalCompositeOperation = 'source-over';
}

function hud() {
  var g = X, L = LEV[li], pr = 1 - frame / LOOPF, i, bx = 8, bw = W - 16;
  g.textAlign = 'left';
  g.fillStyle = 'rgba(10,4,22,.4)'; g.fillRect(bx, 6, bw, 5);
  var bg = g.createLinearGradient(bx, 0, bx + bw, 0);
  for (i = 0; i < 6; i++) bg.addColorStop(i / 5, RB[i]);
  g.fillStyle = pr < .23 ? (frame >> 3 & 1 ? '#f45' : '#fa6') : bg;
  g.fillRect(bx, 6, bw * pr, 5);
  // one thin lane per ghost: how long each one lives, and a shared playhead
  for (i = 0; i < ghosts.length; i++) {
    g.globalAlpha = actors[i] && !actors[i].dead ? .6 : .18;
    g.fillStyle = GC(i);
    g.fillRect(bx, 12.5 + i * 1.9, bw * (ghosts[i].n / LOOPF), 1.1);
  }
  g.globalAlpha = 1;
  g.fillStyle = '#fff';
  g.fillRect(bx + bw * (1 - pr) - .5, 5, 1, 7.5 + ghosts.length * 1.9);
  var hy = 21 + ghosts.length * 1.9, i2, sl = spareLeft();
  g.font = FT(7, 1);
  lab(g, 'HERD ' + (ghosts.length - (st == 2 ? 1 : 0)) + '/' + allow() + (best[li] ? '   BEST ' + best[li] : '   PAR ' + L.p), bx, hy, 0,
      ghosts.length - (st == 2 ? 1 : 0) > allow() ? '#ff9ec4' : '#fff');
  g.font = FT(7, 1); lab(g, L.n, W / 2, 22, 1, '#fff');
  g.font = FT(6.5); lab(g, 'WONDERFULNESS: ' + max(1, M.round((1 - cr) * 100)) + '%', W - 8, 22, 2, cr > .5 ? '#ff9ec4' : 'rgba(255,255,255,.85)');
  // the reserve: 13 spare unicorns for the whole game
  for (i2 = 0; i2 < SPMAX; i2++) {
    var on = i2 < sl;
    g.globalAlpha = on ? 1 : .22;
    g.fillStyle = on ? RB[i2 % 6] : '#fff';
    g.beginPath(); g.arc(W - 8 - i2 * 6.4 - 3, 31, 2.2, 0, TAU); g.fill();
    if (on) { g.fillStyle = '#fff'; g.beginPath(); g.moveTo(W - 8 - i2 * 6.4 - 3, 27.4); g.lineTo(W - 9.4 - i2 * 6.4 - 3, 29.6); g.lineTo(W - 6.6 - i2 * 6.4 - 3, 29.6); g.fill() }
  }
  g.globalAlpha = 1;
  g.font = FT(5.5); lab(g, 'SPARE', W - 8 - SPMAX * 6.4 - 8, 33, 2, 'rgba(255,255,255,.6)');
  g.textAlign = 'left';
  if (pr < .23 && st == 1) {
    g.textAlign = 'center'; g.font = FT(11, 1); g.fillStyle = '#fff';
    g.globalAlpha = .8; g.fillText(M.ceil(pr * 13), W / 2, 44); g.globalAlpha = 1; g.textAlign = 'left';
  }
  if (li < 3 && st == 1) {
    g.font = FT(6); g.fillStyle = 'rgba(255,255,255,.5)';
    g.fillText(touchOn ? 'L/R MOVE   ▲ JUMP   tap top-right: NEW LOOP' :
      '←→ MOVE    ↑ JUMP    R NEW LOOP    Q UNDO    SHIFT FAST', 8, H - 7);
  }
  // the one instruction the whole game depends on, shown exactly when it makes sense
  if (li == 1 && st == 1 && !ghosts.length && (plates[0] | plates[1] | plates[2])) {
    g.globalAlpha = .72 + sin(T * 5) * .28; g.font = FT(9, 1);
    lab(g, touchOn ? 'NOW TAP \u21ba TO LEAVE A COPY OF YOURSELF HERE'
                   : 'NOW PRESS R TO LEAVE A COPY OF YOURSELF HERE', W / 2, H - 32, 1, '#fff');
    g.globalAlpha = 1; g.textAlign = 'left';
  }
  if (intro > 0 && st == 1) {
    var al = min(1, intro * 1.6) * min(1, (2.4 - intro) * 3.5);
    g.textAlign = 'center'; g.globalAlpha = al;
    bigText(L.t, W / 2, H / 2 - 6, 19);
    g.globalAlpha = 1; g.textAlign = 'left';
  }
  if (denied > 0) {
    g.textAlign = 'center'; g.globalAlpha = min(1, denied * 2);
    bigText('THE HERD IS EXHAUSTED', W / 2, H / 2 - 8, 16);
    g.font = FT(8, 1); g.fillStyle = '#ffd0e4';
    g.fillText(touchOn ? 'TAP \u21b6 TO TAKE ONE BACK' : 'PRESS Q TO TAKE ONE BACK', W / 2, H / 2 + 12);
    g.globalAlpha = 1; g.textAlign = 'left';
  }
  if (st == 2) {
    g.textAlign = 'center';
    g.globalAlpha = min(1, ccT * 2);
    bigText(['WONDERFUL!', 'STILL WONDERFUL!', 'WONDERFUL.', 'W O N D E R F U L'][min(3, li >> 2)], W / 2, 52, 21);
    var nu = ghosts.length - 1;
    g.font = FT(8, 1);
    outline(g, nu + (nu == 1 ? ' UNICORN WAS REQUIRED' : ' UNICORNS WERE REQUIRED'), W / 2, H - 10, '#fff');
    if (refund) { g.font = FT(9, 1); g.fillStyle = '#9f9'; g.fillText('PAR MET \u2014 ONE UNICORN RETURNED TO THE RESERVE', W / 2, 72) }
    g.font = FT(7);
    outline(g, POST[li] || '', W / 2, H - 24, cr > .5 ? '#ffc6dd' : '#fff');
    g.globalAlpha = 1; g.textAlign = 'left';
  }
}
function lab(g, s, x, y, al, col) {         // text stays legible on any sky
  g.textAlign = ['left', 'center', 'right'][al];
  g.strokeStyle = 'rgba(18,6,32,.62)'; g.lineWidth = 2.6; g.lineJoin = 'round';
  g.strokeText(s, x, y); g.fillStyle = col; g.fillText(s, x, y);
}
function outline(g, s, x, y, col) {
  g.strokeStyle = 'rgba(16,6,30,.92)'; g.lineWidth = 3; g.lineJoin = 'round';
  g.strokeText(s, x, y); g.fillStyle = col; g.fillText(s, x, y);
}
function bigText(s, x, y, sz) {
  X.font = FT(sz, 1);
  X.strokeStyle = 'rgba(28,8,44,.9)'; X.lineWidth = sz / 4.5; X.lineJoin = 'round';
  X.strokeText(s, x, y); X.fillStyle = '#fff'; X.fillText(s, x, y);
}

var demo = { x: 0, y: 0, vx: 0, vy: 0, g: 1, pg: 1, f: 1, ct: 0, jb: 0, sq: 1, an: 0, i: 0, dead: 0, hold: 0, tr: [] };
function title() {
  var g = X, i;
  demo.x = W / 2 + sin(T * .9) * 90; demo.f = cos(T * .9) > 0 ? 1 : -1;
  demo.y = H * .62 + abs(sin(T * 2.6)) * -14; demo.an = T * 7; demo.vx = 2; demo.g = 1;
  g.strokeStyle = '#fff'; g.globalAlpha = .12; g.lineWidth = 2;
  g.beginPath(); g.moveTo(40, H * .62); g.lineTo(W - 40, H * .62); g.stroke(); g.globalAlpha = 1;
  uni(g, demo, 1, 0, 0, 0);
  g.textAlign = 'center';
  bigText('WONDERFULNESS', W / 2, H * .24, 31);
  bigText('IS MANDATORY', W / 2, H * .24 + 26, 31);
  g.font = FT(8); g.fillStyle = 'rgba(255,255,255,.82)';
  g.fillText('thirteen seconds. every loop leaves a friend behind.', W / 2, H * .24 + 44);
  // level select
  var n = LEV.length, tw = 15, x0 = W / 2 - n * tw / 2;
  for (i = 0; i < n; i++) {
    var ok = i <= maxL, on = i == sel;
    g.globalAlpha = ok ? 1 : .25;
    g.fillStyle = on ? '#fff' : best[i] ? RB[i % 6] : 'rgba(255,255,255,.35)';
    g.beginPath(); g.roundRect(x0 + i * tw + 1.5, H * .8, tw - 3, 11, 3); g.fill();
    g.fillStyle = on ? '#221033' : 'rgba(20,8,34,.85)'; g.font = FT(6.5, 1);
    g.fillText(i + 1, x0 + i * tw + tw / 2, H * .8 + 8.2);
    g.globalAlpha = 1;
  }
  g.font = FT(7); g.fillStyle = 'rgba(255,255,255,.85)';
  g.globalAlpha = .55 + sin(T * 4) * .35;
  g.fillText(touchOn ? 'TAP TO BEGIN' : '←→ PICK A CHAPTER      ↑ / ENTER TO BEGIN', W / 2, H * .8 + 24);
  g.globalAlpha = 1; g.textAlign = 'left';
}
function ending() {
  var g = X, i, n = min(120, total), t = endT;
  g.textAlign = 'center';
  for (i = 0; i < n; i++) {
    var p = i / n, x = ((rnd(i * 3.7) * W * 1.3) + t * (8 + rnd(i) * 22)) % (W + 60) - 30;
    var y = 30 + rnd(i * 9.1) * (H - 60), s = .35 + rnd(i * 5.3) * .5;
    g.globalAlpha = min(.5, t * .12) * (.25 + p * .4);
    g.save(); g.translate(x, y); g.scale(s, s);
    demo.x = 0; demo.y = 0; demo.an = t * 5 + i; demo.f = 1; demo.vx = 2; demo.g = 1;
    uni(g, demo, 1, '#c9b6e8', 0, 0);
    g.restore();
  }
  g.globalAlpha = 1;
  if (t > .6) bigText('YOU HAVE REACHED THE END OF THE RAINBOW.', W / 2, H * .26, 13);
  if (t > 1.8) { g.font = FT(9); g.fillStyle = '#ffc6dd'; g.fillText('IT IS A DOOR. IT ISSUES A NEW MEADOW.', W / 2, H * .38) }
  if (t > 3.2) { g.font = FT(10, 1); g.fillStyle = '#fff'; g.fillText('UNICORNS SPENT: ' + total, W / 2, H * .5);
    g.fillStyle = spare > 6 ? '#9f9' : '#ffd0e4'; g.fillText('RESERVE INTACT: ' + spare + ' / ' + SPMAX, W / 2, H * .58) }
  if (t > 4.6) { g.font = FT(9); g.fillStyle = '#f9b'; g.fillText('THEY ARE ALL STILL STANDING WHERE YOU LEFT THEM.', W / 2, H * .66) }
  if (t > 5.8) { g.font = FT(9, 1); g.fillStyle = '#fff'; g.globalAlpha = .6 + sin(T * 4) * .35; g.fillText('A NEW UNICORN HAS BEEN ISSUED.', W / 2, H * .78); g.globalAlpha = 1 }
  g.textAlign = 'left';
}

load(); resize(); last = performance.now();
requestAnimationFrame(loop);
