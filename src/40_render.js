// ================= RENDER =================
var T = 0, shake = 0, P = [], RB = ['#f45', '#f83', '#fd4', '#5d6', '#49f', '#a5f'];
var F1 = '"Comic Sans MS","Chalkboard SE",system-ui,sans-serif';
var F2 = 'ui-monospace,"Courier New",monospace';
function FT(sz, b) { return (b ? 'bold ' : '') + sz + 'px ' + (cr > .55 ? F2 : F1) }

// ---------- particles: x y vx vy life max mask size ----------
function pp(x, y, vx, vy, lf, mk, sz) { if (P.length < 1600) P.push(x, y, vx, vy, lf, lf, mk, sz) }
function burst(x, y, mk, n) {
  for (var i = 0; i < n; i++) {
    var a = rnd(T * 91 + i * 7.3) * TAU, s = .4 + rnd(i * 3.1 + T) * 2.4;
    pp(x, y, cos(a) * s, sin(a) * s - .6, 18 + rnd(i) * 22 | 0, mk, 1 + rnd(i * 5) * 1.8);
  }
}
function stepP() {
  for (var i = 0; i < P.length; i += 8) {
    P[i] += P[i + 2]; P[i + 1] += P[i + 3]; P[i + 3] += .045; P[i + 2] *= .985; P[i + 4]--;
    if (P[i + 4] <= 0) { P.splice(i, 8); i -= 8 }
  }
}
function drawP(g) {
  g.globalCompositeOperation = 'lighter';
  for (var i = 0; i < P.length; i += 8) {
    var l = P[i + 4] / P[i + 5], s = P[i + 7] * l;
    g.globalAlpha = l * .9; g.fillStyle = COL[P[i + 6]] || '#fff';
    g.beginPath(); g.arc(P[i], P[i + 1], s, 0, TAU); g.fill();
  }
  g.globalAlpha = 1; g.globalCompositeOperation = 'source-over';
}

// ---------- colour-blind redundancy pips ----------
function pips(g, x, y, mk, s) {
  var n = 0, i, b, px;
  for (i = 0; i < 4; i++) if (mk >> i & 1) n++;
  for (i = 0, b = 0; i < 4; i++) {
    if (!(mk >> i & 1)) continue;
    px = x + (b - (n - 1) / 2) * (s * 2.3); b++;
    g.fillStyle = COL[1 << i]; g.beginPath();
    if (i == 0) { g.moveTo(px, y - s); g.lineTo(px + s, y + s); g.lineTo(px - s, y + s) }
    else if (i == 1) g.rect(px - s * .85, y - s * .85, s * 1.7, s * 1.7);
    else if (i == 2) g.arc(px, y, s, 0, TAU);
    else { for (var k = 0; k < 8; k++) { var r = k & 1 ? s * .45 : s * 1.2, an = k * PI / 4 - PI / 2; g[k ? 'lineTo' : 'moveTo'](px + cos(an) * r, y + sin(an) * r) } }
    g.fill();
  }
}

// ---------- the unicorn ----------
function uni(g, a, alp, tint, num, ring) {
  var fx = a.f, sy = a.sq, sx = 2 - sy, i, ph = a.an, mv = abs(a.vx) > .3 && a.g;
  g.save();
  g.translate(a.x, a.y); g.scale(sx * fx, sy); g.globalAlpha = alp;
  // legs
  g.strokeStyle = tint || '#fff'; g.lineWidth = 2.4; g.lineCap = 'round';
  g.beginPath();
  for (i = 0; i < 4; i++) {
    var o = [-3.6, -2.2, 2.2, 3.6][i], p = ph + [0, 2.4, 3.6, 1.1][i], ex = o, ey = 0;
    if (!a.g) { ex = o + (i < 2 ? -2.4 : 2.6); ey = -1.8 - (i < 2 ? 1.4 : 0) }
    else if (mv) { ex = o + sin(p) * 3.4; ey = -max(0, sin(p + 1)) * 3.4 }
    g.moveTo(o * .9, -5.4); g.lineTo(ex, ey);
  }
  g.stroke();
  // tail
  g.lineWidth = 2.1;
  for (i = 0; i < 6; i++) {
    var t0 = i / 6, t1 = (i + 1) / 6;
    g.strokeStyle = tint || RB[i];
    g.beginPath();
    g.moveTo(-6 - t0 * 8, -9 + sin(T * 5 - i * .7) * 2.6 * t0 + t0 * t0 * 5);
    g.lineTo(-6 - t1 * 8, -9 + sin(T * 5 - (i + 1) * .7) * 2.6 * t1 + t1 * t1 * 5);
    g.stroke();
  }
  // body
  g.fillStyle = tint || '#fff';
  g.beginPath(); g.ellipse(0, -8, 7.2, 5.2, 0, 0, TAU); g.fill();
  // mane - drawn BEFORE the neck so it falls behind the head, not across the face
  g.lineWidth = 2.35; g.lineCap = 'round';
  for (i = 0; i < 6; i++) {
    var q0 = i / 6, q1 = (i + 1) / 6;
    g.strokeStyle = tint || RB[5 - i];
    g.beginPath();
    g.moveTo(4.4 - q0 * 3.3, -20.8 + q0 * 11.6 + sin(T * 6 - i * .9) * 1.3 * q0);
    g.lineTo(4.4 - q1 * 3.3, -20.8 + q1 * 11.6 + sin(T * 6 - (i + 1) * .9) * 1.3 * q1);
    g.stroke();
  }
  // neck + head
  g.beginPath(); g.moveTo(2, -8); g.lineTo(4.4, -17.6); g.lineTo(8.2, -17.2); g.lineTo(6, -7); g.fill();
  g.beginPath(); g.ellipse(7, -17.4, 4.3, 3.7, .25, 0, TAU); g.fill();
  g.beginPath(); g.ellipse(10.4, -16.2, 2.5, 1.9, .35, 0, TAU); g.fill();
  // ears
  g.beginPath(); g.moveTo(4.4, -20); g.lineTo(5.2, -23.8); g.lineTo(7.2, -20.3); g.fill();
  if (!tint) { g.fillStyle = 'rgba(255,170,195,.75)'; g.beginPath(); g.moveTo(5.1, -20.4); g.lineTo(5.4, -22.6); g.lineTo(6.3, -20.5); g.fill(); g.fillStyle = '#fff' }
  // horn: a proper tapered spiral, not a triangle
  var bx0 = 7.7, by0 = -20.3, tx0 = 12.8, ty0 = -29.4, q, tq, qx, qy, qw;
  var hg = g.createLinearGradient(bx0, by0, tx0, ty0);
  hg.addColorStop(0, '#fff6d2'); hg.addColorStop(.5, '#ffcf5e'); hg.addColorStop(1, '#fffbe8');
  g.fillStyle = tint || hg;
  g.beginPath(); g.moveTo(bx0 - 1.5, by0 - .5); g.lineTo(bx0 + 1.2, by0 + .9); g.lineTo(tx0, ty0); g.closePath(); g.fill();
  if (!tint) {
    g.strokeStyle = 'rgba(158,104,12,.5)'; g.lineWidth = .5;
    g.beginPath();
    for (q = 1; q < 4; q++) {
      tq = q / 4.3; qx = bx0 + (tx0 - bx0) * tq; qy = by0 + (ty0 - by0) * tq; qw = 1.4 * (1 - tq);
      g.moveTo(qx - qw * 1.1, qy + qw * .55); g.lineTo(qx + qw * 1.2, qy - qw * .25);
    }
    g.stroke();
    g.fillStyle = '#fff'; g.globalAlpha = alp * (.55 + sin(T * 5) * .35);
    g.beginPath(); g.arc(tx0 - .3, ty0 + .5, .62, 0, TAU); g.fill(); g.globalAlpha = alp;
  }
  // eye
  if (!tint) {
    g.fillStyle = '#213';
    if (cr > .8 && (T * 3 | 0) % 7 < 2) { g.fillRect(6.6, -19.6, 3.4, 4.4) }
    else { g.beginPath(); g.arc(8.2, -17.9, 1.15, 0, TAU); g.fill(); }
    g.fillStyle = '#fff'; g.beginPath(); g.arc(8.55, -18.3, .42, 0, TAU); g.fill();
    // cheek
    g.fillStyle = 'rgba(255,120,170,' + (.5 - cr * .45) + ')';
    g.beginPath(); g.arc(5.6, -15.8, 1.5, 0, TAU); g.fill();
  } else { g.fillStyle = '#0000'; }
  g.restore();
  if (num) {
    g.globalAlpha = .95; g.font = FT(6.5, 1); g.textAlign = 'center';
    g.fillStyle = 'rgba(20,8,30,.55)';
    g.beginPath(); g.ellipse(a.x, a.y - 31.5, 5.2, 4.4, 0, 0, TAU); g.fill();
    g.fillStyle = ring || '#fff'; g.fillText(num, a.x, a.y - 29.4);
    g.textAlign = 'left';
  }
  g.globalAlpha = 1;
}

// ---------- tiles ----------
function chasm(g) {                       // depth under the world so pits read as pits
  var y0 = gndY - 6, d = g.createLinearGradient(0, y0, 0, H);
  d.addColorStop(0, 'rgba(30,15,50,0)');
  d.addColorStop(.3, 'rgba(24,11,42,.55)');
  d.addColorStop(1, 'rgba(8,3,18,.97)');
  g.fillStyle = d; g.fillRect(0, y0, W, H - y0);
}
function tiles(g) {
  var cx, cy, i, t, p, x, y;
  for (cy = 0; cy < GH; cy++) for (cx = 0; cx < GW; cx++) {
    i = idx(cx, cy); t = TT[i]; if (!t) continue;
    p = TP[i]; x = cx * TS; y = cy * TS;
    if (t == SOLID) {
      var up = cy > 0 && (TT[i - GW] == 0 || TT[i - GW] == CLOUD || TT[i - GW] == GOAL);
      var dn = cy < GH - 1 && TT[i + GW] != SOLID && TT[i + GW] != PLATE;
      g.fillStyle = cr > .6 ? '#3b3048' : '#b4794e';
      if (dn) {                                   // tapered underside: a floating island
        g.beginPath(); g.moveTo(x, y); g.lineTo(x + TS, y);
        g.lineTo(x + TS - 2.5, y + TS - 1); g.lineTo(x + 2.5, y + TS - 1); g.closePath(); g.fill();
      } else g.fillRect(x, y, TS, TS);
      g.fillStyle = cr > .6 ? '#2e2539' : '#96603c';
      if (dn) { g.beginPath(); g.moveTo(x + 1, y + TS - 5); g.lineTo(x + TS - 1, y + TS - 5); g.lineTo(x + TS - 2.5, y + TS - 1); g.lineTo(x + 2.5, y + TS - 1); g.closePath(); g.fill() }
      else g.fillRect(x, y + TS - 4, TS, 4);
      if (up) {
        g.fillStyle = cr > .6 ? '#44614f' : '#6fc97c';
        g.beginPath(); g.moveTo(x, y + 6);
        for (var k = 0; k <= 4; k++) g.lineTo(x + k * 4, y + (k & 1 ? 1 : 3.6));
        g.lineTo(x + TS, y + 6); g.fill();
        g.fillStyle = cr > .6 ? '#688a75' : '#a9ef92';
        g.fillRect(x, y + 4.4, TS, 1.6);
        if ((cx * 7 + cy * 13) % 5 == 0) flower(g, x + 8, y + 1, cx + cy);
      }
    } else if (t == CLOUD) {
      g.fillStyle = cr > .6 ? 'rgba(190,180,205,.85)' : 'rgba(255,255,255,.93)';
      g.beginPath();
      g.ellipse(x + 4, y + 6, 5, 4.2, 0, 0, TAU); g.ellipse(x + 12, y + 6, 5, 4.2, 0, 0, TAU);
      g.ellipse(x + 8, y + 4.5, 6, 4.6, 0, 0, TAU); g.fill();
      g.fillStyle = 'rgba(150,170,220,.35)';
      g.beginPath(); g.ellipse(x + 8, y + 8.5, 7.4, 2.2, 0, 0, TAU); g.fill();
    } else if (t == THORN) {
      g.fillStyle = cr > .5 ? '#2a1030' : '#7a2050';
      g.beginPath();
      for (var s = 0; s < 3; s++) { g.moveTo(x + 1 + s * 5, y + TS); g.lineTo(x + 3.5 + s * 5, y + 3); g.lineTo(x + 6 + s * 5, y + TS) }
      g.fill();
      g.fillStyle = '#f4a'; g.globalAlpha = .5;
      g.beginPath(); for (s = 0; s < 3; s++) g.arc(x + 3.5 + s * 5, y + 3.5, 1.2, 0, TAU);
      g.fill(); g.globalAlpha = 1;
    } else if (t == GOAL) {
      var pu = sin(T * 3) * .5 + .5;
      g.fillStyle = cr > .6 ? '#2b1f38' : '#7d59a0';         // towers
      g.fillRect(x - 5, y - 9, 5, TS + 9); g.fillRect(x + 16, y - 9, 5, TS + 9);
      g.fillStyle = cr > .6 ? '#3a2b4a' : '#9670b8';
      for (var bt = 0; bt < 3; bt++) { g.fillRect(x - 5 + bt * 2, y - 12, 1.4, 3); g.fillRect(x + 16 + bt * 2, y - 12, 1.4, 3) }
      g.fillStyle = cr > .6 ? '#241a2e' : '#6b4a86';
      g.beginPath(); g.moveTo(x, y + TS); g.lineTo(x, y + 5);
      g.arc(x + 8, y + 5, 8, PI, 0); g.lineTo(x + 16, y + TS); g.fill();
      var dg = g.createLinearGradient(x, y + TS, x, y - 4);
      dg.addColorStop(0, 'rgba(255,246,200,' + (.55 + pu * .4) + ')');
      dg.addColorStop(1, 'rgba(255,210,120,' + (.15 + pu * .2) + ')');
      g.fillStyle = dg;
      g.beginPath(); g.moveTo(x + 3, y + TS); g.lineTo(x + 3, y + 6);
      g.arc(x + 8, y + 6, 5, PI, 0); g.lineTo(x + 13, y + TS); g.fill();
      BX.globalCompositeOperation = 'lighter'; BX.globalAlpha = .5 + pu * .3;
      BX.fillStyle = '#ffe9a0'; BX.beginPath(); BX.arc(x + 8, y + 7, 13, 0, TAU); BX.fill();
      BX.globalAlpha = 1; BX.globalCompositeOperation = 'source-over';
    } else if (t == EMIT) {
      g.fillStyle = '#8a92b8'; g.beginPath();
      g.roundRect(x + 1, y + 1, 14, 14, 3); g.fill();
      g.fillStyle = '#f0f4ff';
      g.beginPath(); g.arc(x + 8 + DX[p] * 3, y + 8 + DY[p] * 3, 3.4 + sin(T * 8) * .35, 0, TAU); g.fill();
      g.fillStyle = '#4b5478';
      g.beginPath(); g.arc(x + 8 - DX[p] * 4, y + 8 - DY[p] * 4, 3, 0, TAU); g.fill();
    } else if (t == MIRR) {
      var gp = p >> 1, o = p & 1;
      if (gp && plates[gp - 1]) o ^= 1;
      g.save(); g.translate(x + 8, y + 8); g.rotate(o ? PI / 4 : -PI / 4);
      g.fillStyle = gp ? COL[[1, 2, 4][gp - 1]] : '#7d86a8';
      g.beginPath(); g.roundRect(-9, -3.2, 18, 6.4, 3); g.fill();
      g.fillStyle = '#fff'; g.globalAlpha = .82;
      g.beginPath(); g.roundRect(-8, -2.4, 16, 2.6, 1.3); g.fill(); g.globalAlpha = 1;
      g.restore();
      if (gp) { g.fillStyle = '#0006'; g.beginPath(); g.arc(x + 8, y + 8, 2.2, 0, TAU); g.fill(); pips(g, x + 8, y + 8, [1, 2, 4][gp - 1], 1.5) }
    } else if (t == PRIS) {
      g.fillStyle = 'rgba(235,245,255,.6)';
      g.beginPath(); g.moveTo(x + 8, y + 1); g.lineTo(x + 15, y + 14); g.lineTo(x + 1, y + 14); g.closePath(); g.fill();
      g.strokeStyle = '#fff'; g.lineWidth = 1; g.stroke();
      for (var q = 0; q < 3; q++) { g.fillStyle = COL[1 << q]; g.globalAlpha = .55; g.fillRect(x + 4 + q * 3, y + 9, 2.4, 4) }
      g.globalAlpha = 1;
    } else if (t == FILT) {
      g.fillStyle = COL[p]; g.globalAlpha = .38; g.fillRect(x + 1, y + 1, 14, 14); g.globalAlpha = 1;
      g.strokeStyle = COL[p]; g.lineWidth = 1.6; g.strokeRect(x + 1.4, y + 1.4, 13.2, 13.2);
      pips(g, x + 8, y + 8, p, 1.7);
    } else if (t == RECV) {
      var on = (racc[i] & p) == p;
      g.fillStyle = '#39406a'; g.beginPath(); g.roundRect(x + .5, y + .5, 15, 15, 4); g.fill();
      g.fillStyle = on ? COL[p] : COLD[p];
      g.beginPath(); g.arc(x + 8, y + 8, on ? 5.6 + sin(T * 9) * .5 : 4.4, 0, TAU); g.fill();
      if (on) { g.globalAlpha = .35; g.beginPath(); g.arc(x + 8, y + 8, 8.5, 0, TAU); g.fill(); g.globalAlpha = 1 }
      pips(g, x + 8, y + 13, p, 1.5);
    } else if (t == DOOR) {
      var op = (power & p) == p,
          mid = cy == 0 || TT[i - GW] != DOOR || TP[i - GW] != p,
          bot = cy == GH - 1 || TT[i + GW] != DOOR || TP[i + GW] != p;
      g.fillStyle = 'rgba(30,14,48,.75)';                 // jamb, always visible
      g.fillRect(x + .5, y, 2, TS); g.fillRect(x + 13.5, y, 2, TS);
      if (op) {
        g.globalAlpha = .22; g.fillStyle = COL[p];
        g.fillRect(x + 2.5, y, 11, TS); g.globalAlpha = 1;
        g.fillStyle = COL[p];
        if (mid) g.fillRect(x + 2.5, y, 11, 1.8);
        if (bot) g.fillRect(x + 2.5, y + TS - 1.8, 11, 1.8);
      } else {
        g.fillStyle = COL[p]; g.fillRect(x + 2.5, y, 11, TS);
        g.fillStyle = 'rgba(255,255,255,.35)';
        for (var b2 = 0; b2 < 3; b2++) g.fillRect(x + 2.5, y + 2 + b2 * 5, 11, 1.3);
        g.fillStyle = COLD[p]; g.fillRect(x + 2.5, y + TS - 2, 11, 2);
      }
      if (mid) { g.fillStyle = 'rgba(20,8,34,.5)'; g.beginPath(); g.roundRect(x + 2, y + 3, 12, 8, 3); g.fill(); pips(g, x + 8, y + 7, p, 1.5) }
    } else if (t == PLATE) {
      var pd = plates[p], pc = COL[[1, 2, 4][p]];
      g.fillStyle = cr > .6 ? '#3b3348' : '#8b6a4e'; g.fillRect(x, y + 4, TS, 12);
      g.fillStyle = pc; g.globalAlpha = pd ? 1 : .75;
      g.beginPath(); g.roundRect(x + 1.5, y + (pd ? 3.4 : 1), 13, pd ? 3.4 : 5, 1.8); g.fill();
      g.globalAlpha = 1;
      if (pd) {
        var who = plateBy[p], hc = who >= 0 ? (who < ghosts.length ? GC(who) : '#fff6d0') : who == -2 ? '#fc3' : pc;
        g.globalAlpha = .3; g.fillStyle = hc;
        g.beginPath(); g.arc(x + 8, y + 4, 9 + sin(T * 8) * .8, 0, TAU); g.fill();
        g.globalAlpha = .9; g.lineWidth = 1; g.strokeStyle = hc;
        g.beginPath(); g.roundRect(x + 1, y + 2.6, 14, 5, 2); g.stroke();
        g.globalAlpha = 1;
      }
      pips(g, x + 8, y + 11, [1, 2, 4][p], 1.4);
    } else if (t == SOCK) {
      g.fillStyle = '#39406a'; g.beginPath(); g.roundRect(x + .5, y + .5, 15, 15, 4); g.fill();
      g.strokeStyle = star && star.in ? '#fc3' : '#6a72a0'; g.lineWidth = 1.5;
      g.beginPath();
      for (var z = 0; z < 10; z++) { var rr = z & 1 ? 2.4 : 5.6, an2 = z * PI / 5 - PI / 2; g[z ? 'lineTo' : 'moveTo'](x + 8 + cos(an2) * rr, y + 8 + sin(an2) * rr) }
      g.closePath(); g.stroke();
    }
  }
}
function flower(g, x, y, sd) {
  var h = rnd(sd) * 4 + 3, cn = flr(rnd(sd * 3) * 4);
  g.strokeStyle = cr > .6 ? '#4a6b5e' : '#4fae52'; g.lineWidth = 1;
  g.beginPath(); g.moveTo(x, y + 1); g.lineTo(x + sin(T * 1.6 + sd) * 1.2, y - h); g.stroke();
  var fy = y - h;
  g.fillStyle = cr > .7 ? '#54406a' : ['#ff8fb0', '#ffd76a', '#b28fff', '#8fe6ff'][cn];
  for (var i = 0; i < 5; i++) { g.beginPath(); g.arc(x + cos(i * 1.257) * 2.1, fy + sin(i * 1.257) * 2.1, 1.5, 0, TAU); g.fill() }
  g.fillStyle = cr > .7 ? '#1a1020' : '#ffe9a0'; g.beginPath(); g.arc(x, fy, 1.7, 0, TAU); g.fill();
  g.fillStyle = '#3a2030';
  g.fillRect(x - 1, fy - .6, .55, .55); g.fillRect(x + .5, fy - .6, .55, .55);
  g.beginPath();
  if (cr < .45) g.arc(x, fy + .2, 1, .2, PI - .2);
  else if (cr < .8) g.moveTo(x - .9, fy + .9), g.lineTo(x + .9, fy + .9);
  else g.arc(x, fy + 1.5, 1, PI + .2, -.2);
  g.strokeStyle = '#3a2030'; g.lineWidth = .4; g.stroke();
}

// ---------- beams ----------
// a beam carries a colour mask; we draw it as one stripe per component, so a
// full-spectrum (mask 7) beam is literally a rainbow ribbon you can stand on.
function bcols(mk) {
  if (mk == 7) return RB;
  var o = [], k;
  for (k = 0; k < 4; k++) if (mk >> k & 1) o.push(COL[1 << k]);
  return o.length ? o : ['#fff'];
}
function beams(g, wide) {
  g.lineCap = 'round';
  var i, mk, x1, y1, x2, y2, cs, n, sp, k, px, py, ox, oy, L, nx, ny, d2;
  for (i = 0; i < segs.length; i += 5) {
    x1 = segs[i]; y1 = segs[i + 1]; x2 = segs[i + 2]; y2 = segs[i + 3]; mk = segs[i + 4];
    L = hyp(x2 - x1, y2 - y1) || 1; nx = (x2 - x1) / L; ny = (y2 - y1) / L;
    px = -ny; py = nx;
    cs = bcols(mk); n = cs.length; sp = 6.4 / n;
    if (wide) {                                   // bloom pass: colour-preserving glow
      g.globalCompositeOperation = 'lighter';
      g.globalAlpha = .1; g.lineWidth = 7;
      for (k = 0; k < n; k++) {
        g.strokeStyle = cs[k]; ox = px * (k - (n - 1) / 2) * sp; oy = py * (k - (n - 1) / 2) * sp;
        g.beginPath(); g.moveTo(x1 + ox, y1 + oy); g.lineTo(x2 + ox, y2 + oy); g.stroke();
      }
      continue;
    }
    // soft halo
    g.globalCompositeOperation = 'lighter';
    g.globalAlpha = .13; g.lineWidth = 10; g.strokeStyle = COL[mk] || '#fff';
    g.beginPath(); g.moveTo(x1, y1); g.lineTo(x2, y2); g.stroke();
    // the ribbon itself - drawn NORMALLY so the colours stay colours
    g.globalCompositeOperation = 'source-over';
    g.globalAlpha = 1; g.lineWidth = sp * 1.2;
    for (k = 0; k < n; k++) {
      g.strokeStyle = cs[k]; ox = px * (k - (n - 1) / 2) * sp; oy = py * (k - (n - 1) / 2) * sp;
      g.beginPath(); g.moveTo(x1 + ox, y1 + oy); g.lineTo(x2 + ox, y2 + oy); g.stroke();
    }
    if (y1 == y2) {                               // stand-here affordance
      g.globalAlpha = .75; g.lineWidth = 1.1; g.strokeStyle = '#fff';
      g.setLineDash([2.5, 5]); g.lineDashOffset = -T * 20;
      g.beginPath(); g.moveTo(x1, y1 - 4.4); g.lineTo(x2, y2 - 4.4); g.stroke();
      g.setLineDash([]);
    }
    g.globalCompositeOperation = 'lighter';
    g.fillStyle = '#fff'; g.globalAlpha = .5;
    for (d2 = (T * 42) % 22; d2 < L; d2 += 22) {
      g.beginPath(); g.arc(x1 + nx * d2, y1 + ny * d2, 1.1, 0, TAU); g.fill();
    }
    var eg = g.createRadialGradient(x2, y2, 0, x2, y2, 7);   // the light lands here
    eg.addColorStop(0, '#fff'); eg.addColorStop(.4, COL[mk] || '#fff'); eg.addColorStop(1, '#0000');
    g.globalAlpha = .7 + sin(T * 11) * .12; g.fillStyle = eg;
    g.beginPath(); g.arc(x2, y2, 7, 0, TAU); g.fill();
  }
  g.globalAlpha = 1; g.globalCompositeOperation = 'source-over';
}

// ---------- sky ----------
var skyG = 0, skyC = -1;
function sky(g) {
  var k = flr(cr * 5);
  if (skyC != k) {
    skyC = k; skyG = g.createLinearGradient(0, 0, 0, H);
    var top = ['#8fd8ff', '#8fd0f4', '#9aa9d8', '#6a6690', '#3a2f50', '#180d22'][k];
    var bot = ['#ffd8ee', '#f8cfe2', '#d9b8d2', '#9a7ea6', '#523a5c', '#25102c'][k];
    skyG.addColorStop(0, top); skyG.addColorStop(1, bot);
  }
  g.fillStyle = skyG; g.fillRect(-400, -400, W + 800, H + 800);
  // sun / hole
  var sx = W * .78, sy = H * .17;
  g.globalCompositeOperation = 'lighter';
  var sg = g.createRadialGradient(sx, sy, 2, sx, sy, 70);
  sg.addColorStop(0, cr > .6 ? 'rgba(255,80,140,.35)' : 'rgba(255,250,200,.42)');
  sg.addColorStop(1, 'rgba(255,240,180,0)');
  g.fillStyle = sg; g.beginPath(); g.arc(sx, sy, 70, 0, TAU); g.fill();
  g.globalCompositeOperation = 'source-over';
  // a rainbow arc in the sky: the thing the whole world is named after,
  // slowly coming apart as wonderfulness drains
  var ar = W * .62, acx = W * .42, acy = H * 1.02, k2;
  for (k2 = 0; k2 < 6; k2++) {
    g.strokeStyle = RB[k2]; g.lineWidth = 5.5;
    g.globalAlpha = (.2 - cr * .16) * (1 - k2 * .05);
    if (g.globalAlpha <= 0) break;
    g.beginPath();
    var gap = cr * 1.1, a0 = PI + .12 + gap * (k2 % 2 ? .5 : .2), a1 = TAU - .12 - gap * (k2 % 2 ? .2 : .5);
    g.arc(acx, acy, ar - k2 * 5.5, a0, a1);
    g.stroke();
  }
  g.globalAlpha = 1;
  // stars, once the sky has gone
  if (cr > .45) {
    g.fillStyle = '#fff';
    for (k2 = 0; k2 < 26; k2++) {
      g.globalAlpha = (cr - .45) * 1.4 * (.3 + rnd(k2 * 4.1) * .7) * (.5 + sin(T * 2 + k2) * .5);
      g.fillRect(rnd(k2 * 7.7) * W, rnd(k2 * 3.3) * H * .6, 1.3, 1.3);
    }
    g.globalAlpha = 1;
  }
  // rolling hills - depth, and stops the pastel sky washing out the floor
  for (var l = 0; l < 3; l++) {
    g.fillStyle = cr > .6 ? ['rgba(78,64,98,.38)', 'rgba(64,50,82,.6)', 'rgba(50,38,66,.85)'][l]
                          : ['rgba(198,226,214,.4)', 'rgba(176,214,190,.55)', 'rgba(146,200,164,.7)'][l];
    g.beginPath(); g.moveTo(-20, H + 20);
    for (var hx = -20; hx <= W + 20; hx += 16)
      g.lineTo(hx, H * .6 + l * 17 + sin(hx * (.009 + l * .004) + l * 2.2) * (16 - l * 3) + sin(hx * .031 + l) * 5);
    g.lineTo(W + 20, H + 20); g.fill();
  }
  // clouds
  for (var i = 0; i < 9; i++) {
    var sp = .35 + (i % 3) * .3, cxp = ((rnd(i * 5.7) * W * 1.6 + T * sp * 7) % (W + 160)) - 80;
    var cyp = 12 + rnd(i * 2.3) * H * .45, sc2 = .6 + rnd(i * 9.1) * .9;
    g.fillStyle = 'rgba(255,255,255,' + (.18 + (i % 3) * .12) * (1 - cr * .55) + ')';
    g.beginPath();
    g.ellipse(cxp, cyp, 17 * sc2, 8 * sc2, 0, 0, TAU);
    g.ellipse(cxp + 12 * sc2, cyp + 2, 12 * sc2, 6 * sc2, 0, 0, TAU);
    g.ellipse(cxp - 13 * sc2, cyp + 2.5, 10 * sc2, 5 * sc2, 0, 0, TAU);
    g.fill();
  }
  // pollen / dust drifting through the air
  g.globalCompositeOperation = 'lighter';
  for (i = 0; i < 22; i++) {
    var mx = (rnd(i * 11.3) * W + T * (5 + rnd(i) * 9)) % (W + 30) - 15;
    var my = (rnd(i * 2.9) * H + sin(T * .5 + i) * 9) % H;
    g.globalAlpha = (.28 - cr * .18) * (.4 + rnd(i * 5.1) * .6);
    if (g.globalAlpha <= 0) break;
    g.fillStyle = cr > .5 ? '#c9b6e8' : RB[i % 6];
    g.beginPath(); g.arc(mx, my, .8 + rnd(i * 8.8) * 1.1, 0, TAU); g.fill();
  }
  g.globalAlpha = 1; g.globalCompositeOperation = 'source-over';
}

// ---------- on-screen controls (mobile is scored separately) ----------
var TB = [
  [.0, .46, .13, .54, '\u25c0', 1, 0], [.13, .46, .14, .54, '\u25b6', 2, 0],
  [.72, .46, .15, .54, '\u25b2', 4, 0], [.87, .46, .13, .54, '\u2726', 8, 0],
  [.87, 0, .13, .28, '\u21ba', 0, 1], [.74, 0, .13, .28, '\u21b6', 0, 2],
  [.0, 0, .13, .28, '\u00bb', 0, 4],
];
function touchUI(g) {
  if (!touchOn) return;
  var i, b, x, y, w, h, on;
  g.textAlign = 'center'; g.textBaseline = 'middle';
  for (i = 0; i < TB.length; i++) {
    b = TB[i]; x = b[0] * W; y = b[1] * H; w = b[2] * W; h = b[3] * H;
    on = (b[5] && (K & b[5])) || (b[6] && (meta & b[6]));
    g.globalAlpha = on ? .3 : .12;
    g.fillStyle = '#fff';
    g.beginPath(); g.roundRect(x + 3, y + 3, w - 6, h - 6, 7); g.fill();
    g.globalAlpha = on ? .95 : .5;
    g.font = FT(b[6] ? 13 : 17, 1);
    g.fillText(b[4], x + w / 2, y + h / 2);
  }
  g.globalAlpha = 1; g.textAlign = 'left'; g.textBaseline = 'alphabetic';
}

// ---------- first-minutes signposting ----------
function hint(g, li) {
  if (li > 2) return;
  var toPlate = hintX && !everPressed, x = toPlate ? hintX : goalX, y = toPlate ? hintY : goalY;
  if (!x) return;
  var bob = sin(T * 4) * 3, ty = y - 22 + bob;
  g.globalAlpha = .55 + sin(T * 4) * .25;
  g.fillStyle = '#fff';
  g.beginPath(); g.moveTo(x, ty + 9); g.lineTo(x - 5, ty); g.lineTo(x + 5, ty); g.fill();
  g.fillRect(x - 1.8, ty - 7, 3.6, 7);
  if (toPlate) {
    g.font = FT(6, 1); g.textAlign = 'center';
    g.fillText('STAND HERE', x, ty - 11);
    g.textAlign = 'left';
  }
  g.globalAlpha = 1;
}
