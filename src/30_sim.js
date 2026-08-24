// ================= SIMULATION =================
var TT, TP, racc, bfloor, plates = [0, 0, 0], plateBy = [-1, -1, -1], power = 0, pulse = 0, pwOld = 0;
var segs = [], spX, spY, stX, stY, hasStar, gndY = 224;
var LOOPF = 780;                       // 13 seconds @ 60
var ghosts = [], actors = [], rec, frame = 0, star = 0, pl;

function idx(cx, cy) { return cy * GW + cx }

function parseLevel(m) {
  TT = new Uint8Array(GW * GH); TP = new Uint8Array(GW * GH);
  racc = new Uint8Array(GW * GH); bfloor = new Uint8Array(GW * GH);
  hasStar = 0; spX = 24; spY = 100;
  var rows = m.split('\n'), y, x, ch, d;
  for (y = 0; y < GH; y++) {
    for (x = 0; x < GW; x++) {
      ch = (rows[y] || '')[x] || '.';
      if (ch == 'S') { spX = x * TS + 8; spY = y * TS + 15.99; continue }
      if (ch == '*') { hasStar = 1; stX = x * TS + 8; stY = y * TS + 11; continue }
      d = CH[ch];
      if (d) {
        TT[idx(x, y)] = d[0]; TP[idx(x, y)] = d[1];
      }
    }
  }
  findGround();
}

// find the top of the main floor slab, so the chasm shading only darkens actual pits
var chG = 0;
function findGround() {
  var y, x, cnt, t, gnd = GH;
  for (y = GH - 1; y >= 0; y--) {
    cnt = 0;
    for (x = 0; x < GW; x++) { t = TT[idx(x, y)]; if (t == SOLID || t == PLATE || t == DOOR) cnt++ }
    if (cnt < 6) break;
    gnd = y;
  }
  gndY = gnd * TS;
  var y0 = gndY - 6;
  chG = X.createLinearGradient(0, y0, 0, H);
  chG.addColorStop(0, 'rgba(30,15,50,0)');
  chG.addColorStop(.3, 'rgba(24,11,42,.55)');
  chG.addColorStop(1, 'rgba(8,3,18,.97)');
}

// ---------- collision queries ----------
function solidCell(cx, cy) {
  if (cy >= GH) return 0;            // the world has no floor - pits are bottomless
  if (cx < 0 || cy < 0 || cx >= GW) return 1;
  var i = idx(cx, cy), t = TT[i];
  if (t == DOOR) return (power & TP[i]) == TP[i] ? 0 : 1;
  return t == SOLID || t > 4 && t < 10 || t == PLATE ? 1 : 0;
}
function owTop(cx, cy) {          // one-way platform surface, -1 none
  if (cx < 0 || cx >= GW || cy < 0 || cy >= GH) return -1;
  var i = idx(cx, cy);
  if (TT[i] == CLOUD) return cy * TS + 4;
  if (bfloor[i]) return cy * TS + 8;
  return -1;
}
function boxSolid(x, y, w, h) {
  var x0 = flr((x - w) / TS), x1 = flr((x + w - .01) / TS),
      y0 = flr((y - h) / TS), y1 = flr((y - .01) / TS), cx, cy;
  for (cy = y0; cy <= y1; cy++) for (cx = x0; cx <= x1; cx++) if (solidCell(cx, cy)) return 1;
  return 0;
}

// ---------- actor ----------
var AW = 5, AH = 12;
function mkActor(i) {
  return { i: i, x: spX, y: spY, vx: 0, vy: 0, g: 0, pg: 0, f: 1, ct: 0, jb: 0, pj: 0,
           dead: 0, hold: 0, sq: 1, an: 0, pt: [] };
}
function mvX(a, dx) {
  a.x += dx;
  if (boxSolid(a.x, a.y, AW, AH)) {
    if (a.pg) for (var s = 1; s < 10; s++)      // step assist over small lips
      if (!boxSolid(a.x, a.y - s, AW, AH)) { a.y -= s; a.g = 1; return }
    a.x = dx > 0 ? flr((a.x + AW) / TS) * TS - AW - .01 : (flr((a.x - AW) / TS) + 1) * TS + AW + .01;
    a.vx = 0; return;
  }
}
function mvY(a, dy) {
  var py = a.y; a.y += dy;
  if (boxSolid(a.x, a.y, AW, AH)) {
    if (dy > 0) { a.y = flr(a.y / TS) * TS - .01; a.g = 1 }
    else a.y = (flr((a.y - AH) / TS) + 1) * TS + AH + .01;
    a.vy = 0; return;
  }
  if (dy > 0) {
    var best = -1, x0 = flr((a.x - AW) / TS), x1 = flr((a.x + AW - .01) / TS), cx, cy, t, j, o;
    for (cy = flr(py / TS); cy <= flr(a.y / TS); cy++)
      for (cx = x0; cx <= x1; cx++) {
        t = owTop(cx, cy);
        if (t >= 0 && py <= t + 1.5 && a.y >= t && (best < 0 || t < best)) best = t;
      }
    for (j = 0; j < a.i; j++) {              // stand on earlier unicorns
      o = actors[j];
      if (!o.dead && abs(o.x - a.x) < 9) {
        t = o.y - AH - 1;
        if (py <= t + 1.5 && a.y >= t && (best < 0 || t < best)) best = t;
      }
    }
    if (best >= 0) { a.y = best; a.vy = 0; a.g = 1 }
  }
}
function stepActor(a, k, isP) {
  if (a.dead) return;
  var dir = ((k >> 1) & 1) - (k & 1), acc = a.pg ? .55 : .3;
  if (dir) { a.vx += dir * acc; a.f = dir } else a.vx *= a.pg ? .7 : .92;
  a.vx = clamp(a.vx, -2.15, 2.15);
  if (k & 4) { if (!a.pj) a.jb = 7 } else if (a.jb) a.jb--;
  a.pj = k & 4;
  if (a.jb && a.ct) { a.vy = -6.45; a.jb = 0; a.ct = 0; a.sq = 1.4; if (isP) sfx(0) }
  if (!(k & 4) && a.vy < -1.7) a.vy = -1.7;
  a.vy += .42; if (a.vy > 7.4) a.vy = 7.4;
  a.pg = a.g; a.g = 0;
  mvX(a, a.vx); mvY(a, a.vy);
  if (a.g) {
    if (!a.pg && a.vy > 3) {
      a.sq = .62; if (isP) sfx(1);
      for (var zi = 0; zi < 5; zi++)                       // landing puff
        pp(a.x + rnd(zi * 9 + a.x) * 9 - 4.5, a.y, rnd(zi * 3) * 1.8 - .9, -rnd(zi * 7) * 1.3, 12 + zi * 3, 0, 1.1);
    }
    a.ct = 7;
  } else if (a.ct) a.ct--;
  a.sq += (1 - a.sq) * .22;
  a.an += a.g ? abs(a.vx) * .18 : .06;
  if (!(frame % 7)) a.pt.push(a.x, a.y - 8);
  // hazards
  var cx = flr(a.x / TS), cy = flr((a.y - 6) / TS);
  if (cx >= 0 && cx < GW && cy >= 0 && cy < GH) {
    var t = TT[idx(cx, cy)];
    if (t == THORN) { a.dead = 2; burst(a.x, a.y - 6, 1, 14) }
    if (t == GOAL) won = 1;
  }
  if (a.y > H + 40) a.dead = 2;
  // star pickup
  if (star && !star.h && !star.in && !star.cd && !a.hold &&
      abs(star.x - a.x) < 11 && abs(star.y - a.y + 6) < 13) { star.h = a; a.hold = 1; sfx(4) }
  if ((k & 8) && !a.pa && a.hold) { star.h = 0; a.hold = 0; star.cd = 14; star.vx = a.vx * 1.4; star.vy = -2.2 }
  a.pa = k & 8;
}

// ---------- beams ----------
// A unicorn's torso casts a shadow. The band (y-11 .. y-3) excludes the feet,
// so standing on a horizontal rainbow never severs the rainbow you stand on.
function eclipsed(cx, cy, d) {
  var bx = cx * TS + 8, by = cy * TS + 8, ty = cy * TS, i, a;
  for (i = 0; i < actors.length; i++) {
    a = actors[i];
    if (a.dead) continue;
    if (d & 1) { if (abs(a.x - bx) < 5.5 && a.y - 3 > ty && a.y - 11 < ty + TS) return 1 }
    else if (a.y - 11 < by && a.y - 3 > by && a.x + 4.5 > cx * TS && a.x - 4.5 < cx * TS + TS) return 1;
  }
  return 0;
}
function traceBeams() {
  segs.length = 0; bfloor.fill(0); racc.fill(0);
  var q = [], seen = {}, n = 0, i, t, p;
  for (i = 0; i < GW * GH; i++) if (TT[i] == EMIT) q.push([i % GW, (i / GW) | 0, TP[i], 7]);
  while (q.length && n < 500) {
    var B = q.pop(), cx = B[0], cy = B[1], d = B[2], mk = B[3];
    var ax = cx * TS + 8, ay = cy * TS + 8, key, ix, brk = 0, nd;
    for (; !brk;) {
      if (++n > 500) break;
      key = (idx(cx, cy) * 4 + d) * 8 + mk;
      if (seen[key]) { brk = 4; break } seen[key] = 1;
      cx += DX[d]; cy += DY[d];
      if (cx < 0 || cy < 0 || cx >= GW || cy >= GH) { brk = 2; break }
      ix = idx(cx, cy); t = TT[ix]; p = TP[ix];
      if (t == SOLID || t == EMIT || t == PLATE) { brk = 2; break }
      if (t == DOOR && (power & p) != p) { brk = 2; break }
      if (t == RECV) { racc[ix] |= mk; brk = 1; break }
      if (eclipsed(cx, cy, d)) { brk = 2; break }
      if (t == FILT) {
        segs.push(ax, ay, cx * TS + 8, cy * TS + 8, mk);
        mk &= p; ax = cx * TS + 8; ay = cy * TS + 8;
        if (!mk) { brk = 3; break }
      } else if (t == MIRR) {
        var g = p >> 1, o = p & 1;
        if (g && plates[g - 1]) o ^= 1;
        nd = o ? d ^ 1 : d ^ 3;
        segs.push(ax, ay, cx * TS + 8, cy * TS + 8, mk);
        ax = cx * TS + 8; ay = cy * TS + 8; d = nd;
      } else if (t == PRIS) {
        segs.push(ax, ay, cx * TS + 8, cy * TS + 8, mk);
        if (mk & 1) q.push([cx, cy, (d + 3) & 3, 1]);
        if (mk & 2) q.push([cx, cy, d, 2]);
        if (mk & 4) q.push([cx, cy, (d + 1) & 3, 4]);
        brk = 3; break;
      } else if (!(d & 1)) bfloor[ix] = 1;        // horizontal beam -> walkable
    }
    if (brk == 2) segs.push(ax, ay, cx * TS + 8 - DX[d] * 8, cy * TS + 8 - DY[d] * 8, mk);
    else if (brk != 3) segs.push(ax, ay, cx * TS + 8, cy * TS + 8, mk);
  }
  var np = 0;
  for (i = 0; i < GW * GH; i++) if (TT[i] == RECV && (racc[i] & TP[i]) == TP[i]) np |= TP[i];
  if (star && star.in) np |= 8;
  if (np != power) { sfx(np > power ? 2 : 10); pulse = 1 }
  power = np;
}

// ---------- world reset ----------
var won = 0, loopFlash = 0;
function resetWorld() {
  frame = 0; won = 0; power = 0; loopFlash = 1;
  actors = [];
  for (var i = 0; i <= ghosts.length; i++) actors.push(mkActor(i));
  pl = actors[ghosts.length];
  star = hasStar ? { x: stX, y: stY, vx: 0, vy: 0, h: 0, in: 0, cd: 0 } : 0;
  for (var ri = 0; ri < actors.length; ri++)          // the herd re-forms in a shower
    burst(spX, spY - 9, ri < ghosts.length ? 7 : 8, 3);
  rec = new Uint8Array(LOOPF);
  bfloor.fill(0); racc.fill(0); segs.length = 0;
  musStart();                       // the song restarts with the loop: music IS the clock
}
function commitLoop() {
  if (frame < 5) { sfx(6); resetWorld(); return }
  if (ghosts.length + 1 > allow() && spareLeft() < 1) { denied = 2.6; sfx(6); return }
  var n = frame || 1;                                   // guarantee ≥1 frame of life
  ghosts.push({ i: rec.slice(0, frame), n: n, pt: pl.pt }); sfx(5);
  resetWorld();
}
function stuck() { return ghosts.length + 1 > allow() && spareLeft() < 1 }
function undoLoop() { if (ghosts.length) { ghosts.pop(); sfx(6) } resetWorld() }

// ---------- one sim tick ----------
function step() {
  var i, a, g;
  for (i = 0; i < ghosts.length; i++) {
    a = actors[i]; g = ghosts[i];
    if (frame >= g.n) { if (!a.dead) { a.dead = 1; burst(a.x, a.y - 7, 7, 10) } continue }
    stepActor(a, g.i[frame], 0);
  }
  rec[frame] = K & 15;
  stepActor(pl, K & 15, 1);

  // star physics
  if (star) {
    if (star.h) {
      star.x = star.h.x; star.y = star.h.y - 20; star.vx = star.vy = 0;
      if (seat()) { star.h.hold = 0; star.h = 0 }
    } else if (!star.in) {
      if (star.cd) star.cd--;
      star.vy += .4; if (star.vy > 7) star.vy = 7;
      star.x += star.vx;
      if (boxSolid(star.x, star.y + 4, 4, 8)) { star.x = star.vx > 0 ? flr((star.x + 4) / TS) * TS - 4.01 : (flr((star.x - 4) / TS) + 1) * TS + 4.01; star.vx *= -.4 }
      var py = star.y; star.y += star.vy;
      if (boxSolid(star.x, star.y + 4, 4, 8)) {
        star.y = star.vy > 0 ? flr((star.y + 4) / TS) * TS - 4.01 : (flr((star.y - 4) / TS) + 1) * TS + 4.01;
        star.vy = 0; star.vx *= .6;
      }
      else {
        var cx0 = flr((star.x - 4) / TS), cx1 = flr((star.x + 4) / TS), cx, cy, t2;
        for (cy = flr((py + 4) / TS); cy <= flr((star.y + 4) / TS); cy++)
          for (cx = cx0; cx <= cx1; cx++) {
            t2 = owTop(cx, cy);
            if (t2 >= 0 && py + 4 <= t2 + 1.5 && star.y + 4 >= t2) { star.y = t2 - 4; star.vy = 0; star.vx *= .8 }
          }
      }
      seat();
      if (star.y > H + 30) { star.x = stX; star.y = stY; star.vx = star.vy = 0 }
    }
  }
  // plates
  plates[0] = plates[1] = plates[2] = 0;
  plateBy[0] = plateBy[1] = plateBy[2] = -1;
  for (i = 0; i < actors.length; i++) {
    a = actors[i]; if (a.dead) continue;
    press(a.x, a.y + 2, AW, i);
  }
  if (star && !star.h && !star.in) press(star.x, star.y + 7, 4, -2);
  var pw = plates[0] | plates[1] << 1 | plates[2] << 2;
  if (pw != pwOld) { sfx(8); pwOld = pw }          // a plate just clicked down or up
  traceBeams();
  frame++;
}
function seat() {                      // snap the star into a socket it overlaps
  var sc = idx(clamp(flr(star.x / TS), 0, GW - 1), clamp(flr(star.y / TS), 0, GH - 1));
  if (TT[sc] != SOCK) return 0;
  star.in = 1; star.x = (sc % GW) * TS + 8; star.y = ((sc / GW) | 0) * TS + 8;
  star.vx = star.vy = 0; sfx(3); burst(star.x, star.y, 8, 22); return 1;
}
function press(x, y, w, who) {
  var cy = flr(y / TS), cx, i;
  for (cx = flr((x - w) / TS); cx <= flr((x + w - .01) / TS); cx++) {
    if (cx < 0 || cx >= GW || cy < 0 || cy >= GH) continue;
    i = idx(cx, cy);
    if (TT[i] == PLATE) { plates[TP[i]] = 1; if (plateBy[TP[i]] < 0) plateBy[TP[i]] = who }
  }
}
