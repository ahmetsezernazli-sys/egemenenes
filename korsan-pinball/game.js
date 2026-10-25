/* Korsan Pinball — Enes için */
(() => {
  "use strict";
  const $ = (id) => document.getElementById(id);
  const cv = $("cv"), ctx = cv.getContext("2d"), stage = $("stage");
  const REC_KEY = "korsan-pinball-rekor";

  /* ---------- masa (mantıksal birim) ---------- */
  const TW = 480, TH = 880, GRAV = 1150, BR = 10, SUB = 10, VMAX = 2600;
  const CXP = 225; // oyun alanının ortası (fırlatma kanalı hariç)
  const mx = (x) => 2 * CXP - x; // sol-sağ ayna

  const walls = [];   // {x1,y1,x2,y2,r,e,kick,kind}
  const wall = (x1, y1, x2, y2, o = {}) => { const w = Object.assign({ x1, y1, x2, y2, r: 3, e: 0.45, kick: 0, kind: "wall" }, o); walls.push(w); return w; };
  // üst kemer
  const ARC_C = [240, 240], ARC_R = 220, ARC_N = 28;
  for (let i = 0; i < ARC_N; i++) {
    const a1 = Math.PI + i / ARC_N * Math.PI, a2 = Math.PI + (i + 1) / ARC_N * Math.PI;
    wall(ARC_C[0] + Math.cos(a1) * ARC_R, ARC_C[1] + Math.sin(a1) * ARC_R, ARC_C[0] + Math.cos(a2) * ARC_R, ARC_C[1] + Math.sin(a2) * ARC_R, { kind: "rail" });
  }
  wall(20, 240, 20, 640, { kind: "rail" });          // sol duvar
  wall(460, 240, 460, 880, { kind: "rail" });        // sağ dış duvar
  wall(430, 880, 430, 330, { kind: "lane" });        // fırlatma kanalı iç duvarı
  wall(430, 856, 460, 856, { kind: "lane", e: 0.1 }); // fırlatıcı tabanı
  wall(20, 640, 139, 742, { kind: "inlane" });       // sol iç kanal
  wall(430, 640, 311, 742, { kind: "inlane" });      // sağ iç kanal
  // üst fener geçitleri (direkler)
  const POSTS = [170, 210, 250, 290];
  POSTS.forEach(x => wall(x, 100, x, 145, { r: 4, kind: "post", e: 0.5 }));
  const LANES = [190, 230, 270];
  // sapanlar
  const SLING = [];
  for (const side of [0, 1]) {
    const X = side ? mx : (x) => x;
    const A = [X(62), 548], Bp = [X(62), 640], C = [X(118), 668];
    SLING.push({ side, pts: [A, Bp, C] });
    wall(A[0], A[1], C[0], C[1], { kind: "sling", kick: 430, e: 0.6, side });
    wall(A[0], A[1], Bp[0], Bp[1], { kind: "slingback" });
    wall(Bp[0], Bp[1], C[0], C[1], { kind: "slingback" });
  }
  // düşen hedefler (kafatasları)
  const TARGETS = [380, 415, 450].map(y => wall(32, y - 13, 32, y + 13, { r: 4, kind: "target", e: 0.35, down: false }));
  // tamponlar (can simidi)
  const BUMPERS = [{ x: 150, y: 290 }, { x: 300, y: 290 }, { x: 225, y: 375 }].map(b => Object.assign(b, { r: 24, kick: 540, flash: 0 }));
  // hazine sandığı
  const CHEST = { x: 388, y: 470, r: 16 };
  // paletler
  const FL = [
    { px: 145, py: 758, rest: 0.52, up: -0.44, dir: -1, a: 0.52, w: 0, key: false },
    { px: 305, py: 758, rest: Math.PI - 0.52, up: Math.PI + 0.44, dir: 1, a: Math.PI - 0.52, w: 0, key: false },
  ];
  const FLEN = 66, FR = 9, FSPD = 24;

  /* ---------- ses ---------- */
  let AC = null, soundOn = true, lastT = {};
  function audio() { try { AC = AC || new (window.AudioContext || window.webkitAudioContext)(); if (AC.state === "suspended") AC.resume(); } catch (e) {} }
  function tone(f, d = 0.08, type = "square", vol = 0.05, slide = 0, key = "") {
    if (!soundOn || !AC || headless) return;
    const now = performance.now(); if (key) { if (now - (lastT[key] || 0) < 45) return; lastT[key] = now; }
    const t = AC.currentTime, o = AC.createOscillator(), g = AC.createGain();
    o.type = type; o.frequency.setValueAtTime(f, t);
    if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(30, f + slide), t + d);
    g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + d);
    o.connect(g).connect(AC.destination); o.start(t); o.stop(t + d + 0.02);
  }
  const SND = {
    flip: () => tone(180, 0.05, "square", 0.04, -60, "flip"),
    bump: () => tone(880, 0.09, "square", 0.05, -300, "bump"),
    sling: () => tone(520, 0.07, "square", 0.05, -200, "sling"),
    target: () => tone(330, 0.12, "triangle", 0.06, 200, "target"),
    lane: () => tone(1200, 0.12, "sine", 0.05, 300, "lane"),
    chest: () => [392, 523, 659, 784].forEach((f, i) => setTimeout(() => tone(f, 0.12, "triangle", 0.06), i * 70)),
    launch: () => tone(150, 0.25, "sawtooth", 0.05, 500),
    drain: () => [330, 262, 196].forEach((f, i) => setTimeout(() => tone(f, 0.2, "triangle", 0.06), i * 150)),
    big: () => [523, 659, 784, 1046, 1318].forEach((f, i) => setTimeout(() => tone(f, 0.15, "square", 0.05), i * 80)),
    wall: () => tone(140, 0.03, "triangle", 0.03, 0, "wall"),
  };

  /* ---------- durum ---------- */
  let G = null, paused = false, headless = false, best = 0;
  try { best = +localStorage.getItem(REC_KEY) || 0; } catch (e) {}

  function newBall(x = 445, y = 840) { return { x, y, vx: 0, vy: 0, cap: 0, still: 0, id: Math.random() }; }
  function newGame() {
    G = { score: 0, ballsLeft: 3, balls: [newBall()], mult: 1, lanes: [false, false, false], chestN: 0, chestLit: false,
          save: 0, saveArmed: true, charge: 0, charging: false, msgs: [], over: false, multiball: 0, targetsReset: 0, time: 0 };
    TARGETS.forEach(t => (t.down = false));
    FL.forEach(f => { f.a = f.rest; f.w = 0; f.key = false; });
    renderHud();
  }
  const inPlunger = (b) => b.x > 432 && b.y > 780;
  function add(pts, x, y, label) {
    const v = pts * G.mult;
    G.score += v;
    if (x !== undefined) G.msgs.push({ x, y, s: label || "+" + v, t: 0, life: 0.8 });
    renderHud();
  }
  function banner(s, life = 1.8) { G.msgs.push({ x: CXP, y: 520, s, t: 0, life, big: true }); }

  /* ---------- fizik ---------- */
  function collideCapsule(b, x1, y1, x2, y2, r, e, sv) {
    const dx = x2 - x1, dy = y2 - y1, L2 = dx * dx + dy * dy;
    let t = L2 ? ((b.x - x1) * dx + (b.y - y1) * dy) / L2 : 0; t = Math.max(0, Math.min(1, t));
    const cx = x1 + dx * t, cy = y1 + dy * t;
    let nx = b.x - cx, ny = b.y - cy; const d = Math.hypot(nx, ny), min = r + BR;
    if (d >= min) return 0;
    if (d < 1e-6) { nx = -dy; ny = dx; const l = Math.hypot(nx, ny) || 1; nx /= l; ny /= l; } else { nx /= d; ny /= d; }
    b.x = cx + nx * min; b.y = cy + ny * min;
    const svx = sv ? sv(cx, cy)[0] : 0, svy = sv ? sv(cx, cy)[1] : 0;
    const rvx = b.vx - svx, rvy = b.vy - svy, vn = rvx * nx + rvy * ny;
    if (vn < 0) { b.vx -= (1 + e) * vn * nx; b.vy -= (1 + e) * vn * ny; return { vn: -vn, nx, ny }; }
    return { vn: 0, nx, ny };
  }

  function stepBall(b, h) {
    if (b.cap > 0) { // sandıkta
      b.cap -= h; b.x = CHEST.x; b.y = CHEST.y; b.vx = b.vy = 0;
      if (b.cap <= 0) { b.cap = 0; b.vx = -520 - Math.random() * 120; b.vy = 260; b.x -= 22; b.y += 4; b.cooldown = 0.5; }
      return;
    }
    b.vy += GRAV * h;
    b.x += b.vx * h; b.y += b.vy * h;
    if (b.cooldown) b.cooldown = Math.max(0, b.cooldown - h);
    // duvarlar
    for (const w of walls) {
      if (w.kind === "target" && w.down) continue;
      const c = collideCapsule(b, w.x1, w.y1, w.x2, w.y2, w.r, w.e);
      if (!c) continue;
      if (w.kind === "sling" && c.vn > 60) {
        // sapan: dışa doğru tekme
        const sx = w.side ? -1 : 1;
        let nx = c.nx, ny = c.ny; if (nx * sx < 0) { nx = -nx; ny = -ny; }
        b.vx += nx * w.kick; b.vy += ny * w.kick; w.flash = 0.15; add(10); SND.sling();
      } else if (w.kind === "target" && c.vn > 40) {
        w.down = true; add(250, w.x1 + 18, (w.y1 + w.y2) / 2); SND.target();
        if (TARGETS.every(t => t.down)) {
          add(2000, 110, 410, "Kafataslar! +" + 2000 * G.mult); banner("☠ SANDIK AÇIK ☠");
          G.chestLit = true; G.targetsReset = 2; SND.big();
        }
      } else if (c.vn > 260 && (w.kind === "rail" || w.kind === "inlane")) SND.wall();
    }
    // tamponlar
    for (const bp of BUMPERS) {
      const dx = b.x - bp.x, dy = b.y - bp.y, d = Math.hypot(dx, dy), min = bp.r + BR;
      if (d < min && d > 0) {
        const nx = dx / d, ny = dy / d;
        b.x = bp.x + nx * min; b.y = bp.y + ny * min;
        const vn = b.vx * nx + b.vy * ny;
        if (vn < 0) { b.vx -= 1.6 * vn * nx; b.vy -= 1.6 * vn * ny; }
        b.vx += nx * bp.kick * 0.55; b.vy += ny * bp.kick * 0.55;
        bp.flash = 0.18; add(100, bp.x, bp.y - 34); SND.bump();
      }
    }
    // paletler
    for (const f of FL) {
      const tx = f.px + Math.cos(f.a) * FLEN, ty = f.py + Math.sin(f.a) * FLEN;
      const sv = (cx, cy) => [-f.w * (cy - f.py), f.w * (cx - f.px)];
      collideCapsule(b, f.px, f.py, tx, ty, FR, 0.3, sv);
    }
    // fener geçitleri (yalnız aşağı inerken)
    if (b.y > 118 && b.y < 128 && b.vy > 0) {
      LANES.forEach((lx, i) => {
        if (Math.abs(b.x - lx) < 16 && !b["l" + i]) {
          b["l" + i] = 1; setTimeout(() => (b["l" + i] = 0), 400);
          if (!G.lanes[i]) { G.lanes[i] = true; add(100, lx, 160); SND.lane(); }
          else add(20);
          if (G.lanes.every(Boolean)) {
            G.lanes = [false, false, false];
            if (G.mult < 5) { G.mult++; banner(`ÇARPAN ×${G.mult}!`); } else { add(5000); banner("FENERLER +5000"); }
            SND.big(); renderHud();
          }
        }
      });
    }
    // sandık
    // sandık: yalnız yavaş gelen topu ve sandık boşsa yakalar; çoklu top sırasında sayılmaz
    if (!b.cooldown && Math.hypot(b.x - CHEST.x, b.y - CHEST.y) < CHEST.r - 2 && Math.hypot(b.vx, b.vy) < 760 &&
        !G.balls.some(o => o !== b && o.cap > 0)) {
      b.cap = 1.1;
      const single = G.balls.length === 1;
      if (single) G.chestN++;
      const pts = G.chestLit ? 3000 : 1000;
      add(pts, CHEST.x - 40, CHEST.y - 30, "Hazine! +" + pts * G.mult); SND.chest();
      if (G.chestLit) { G.chestLit = false; TARGETS.forEach(t => (t.down = false)); }
      if (single && G.chestN % 3 === 0) startMultiball();
    }
    // hız sınırı
    const sp = Math.hypot(b.vx, b.vy); if (sp > VMAX) { b.vx *= VMAX / sp; b.vy *= VMAX / sp; }
  }
  function startMultiball() {
    banner("🏴‍☠️ ÇOKLU TOP! 🏴‍☠️", 2.4); SND.big();
    G.multiball++;
    for (let i = 0; i < 2; i++) { const nb = newBall(CXP + (i ? 60 : -60), 60); nb.vx = i ? 120 : -120; nb.vy = 50; G.balls.push(nb); }
    G.save = Math.max(G.save, 6);
  }
  function ballBall() {
    const B = G.balls;
    for (let i = 0; i < B.length; i++) for (let j = i + 1; j < B.length; j++) {
      const a = B[i], b = B[j]; if (a.cap > 0 || b.cap > 0) continue;
      const dx = b.x - a.x, dy = b.y - a.y, d = Math.hypot(dx, dy);
      if (d < 2 * BR && d > 0) {
        const nx = dx / d, ny = dy / d, o = (2 * BR - d) / 2;
        a.x -= nx * o; a.y -= ny * o; b.x += nx * o; b.y += ny * o;
        const rv = (b.vx - a.vx) * nx + (b.vy - a.vy) * ny;
        if (rv < 0) { const j2 = -rv * 0.95; a.vx -= j2 * nx; a.vy -= j2 * ny; b.vx += j2 * nx; b.vy += j2 * ny; }
      }
    }
  }

  function update(dt) {
    if (!G || G.over) return;
    G.time += dt;
    const h = dt / SUB;
    for (let s = 0; s < SUB; s++) {
      for (const f of FL) {
        const target = f.key ? f.up : f.rest, prev = f.a, step = FSPD * h;
        if (Math.abs(target - f.a) <= step) f.a = target; else f.a += Math.sign(target - f.a) * step;
        f.w = (f.a - prev) / h;
      }
      for (const b of G.balls) {
        if (inPlunger(b) && !(b.cap > 0)) {
          // fırlatıcıda bekleyen top
          if (Math.abs(b.vy) < 60 && b.y > 820) { b.x = 445; b.y = 846 - BR; b.vx = 0; b.vy = 0; b.ready = true; continue; }
        }
        b.ready = false;
        stepBall(b, h);
      }
      if (G.balls.length > 1) ballBall();
    }
    // takılma koruması ve kayıp toplar
    for (const b of G.balls) {
      const sp = Math.hypot(b.vx, b.vy);
      if (!b.ready && !(b.cap > 0) && sp < 25) { b.still += dt; if (b.still > 2.5) { b.vx = (Math.random() - 0.5) * 300; b.vy = -350; b.still = 0; } } else b.still = 0;
      if (b.y > TH + 30 || b.x < -40 || b.x > TW + 40 || b.y < -60) b.lost = true;
    }
    const lost = G.balls.filter(b => b.lost);
    if (lost.length) {
      G.balls = G.balls.filter(b => !b.lost);
      for (const b of lost) {
        if (G.save > 0 && G.balls.length < 3 && !G.balls.some(x => x.ready || x.y > 780 && x.x > 432)) { G.balls.push(newBall()); banner("TOP KURTARILDI!", 1.4); }
      }
      if (!G.balls.length) loseBall();
    }
    if (G.save > 0) G.save = Math.max(0, G.save - dt);
    if (G.targetsReset > 0) { G.targetsReset -= dt; if (G.targetsReset <= 0 && !G.chestLit) TARGETS.forEach(t => (t.down = false)); }
    // fırlatma şarjı
    if (G.charging) G.charge = Math.min(1, G.charge + dt * 1.2);
    for (const bp of BUMPERS) bp.flash = Math.max(0, bp.flash - dt);
    for (const w of walls) if (w.flash) w.flash = Math.max(0, w.flash - dt);
    for (const m of G.msgs) { m.t += dt; if (!m.big) m.y -= 30 * dt; }
    G.msgs = G.msgs.filter(m => m.t < m.life);
  }
  function loseBall() {
    G.ballsLeft--;
    SND.drain();
    if (G.ballsLeft <= 0) { G.over = true; renderHud(); setTimeout(finish, 900); return; }
    G.mult = 1; G.lanes = [false, false, false];
    banner(`${G.ballsLeft} TOP KALDI`, 1.6);
    G.balls = [newBall()]; G.saveArmed = true; G.save = 0;
    renderHud();
  }
  function launch() {
    const b = G && G.balls.find(x => x.ready);
    if (!b) { G && (G.charging = false, G.charge = 0); return; }
    b.vy = -(1250 + 700 * G.charge); b.y -= 2; b.ready = false;
    G.charging = false; G.charge = 0;
    if (G.saveArmed) { G.save = 8; G.saveArmed = false; } // her yeni top için bir kez
    SND.launch();
  }
  function finish() {
    const isRec = G.score > best;
    if (isRec) { best = G.score; try { localStorage.setItem(REC_KEY, String(best)); } catch (e) {} }
    $("end-score").textContent = G.score.toLocaleString("tr-TR");
    $("end-text").textContent = isRec ? "🎉 Yeni rekor!" : `Rekor: ${best.toLocaleString("tr-TR")}`;
    $("end").hidden = false; $("again").focus();
    renderHud();
  }

  /* ---------- çizim ---------- */
  let W = 0, H = 0, sc = 1, ox = 0, oy = 0, dpr = 1;
  const bg = document.createElement("canvas"), bctx = bg.getContext("2d");
  function resize() {
    const r = stage.getBoundingClientRect(); dpr = Math.min(2, window.devicePixelRatio || 1);
    W = r.width; H = r.height; cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr);
    sc = Math.min(W / TW, H / TH); ox = (W - TW * sc) / 2; oy = (H - TH * sc) / 2;
    renderBg();
  }
  function renderBg() {
    bg.width = Math.max(1, Math.round(TW * sc * dpr)); bg.height = Math.max(1, Math.round(TH * sc * dpr));
    const c = bctx; c.setTransform(sc * dpr, 0, 0, sc * dpr, 0, 0);
    // tahta çerçeve + deniz
    c.fillStyle = "#5A3A1E"; c.beginPath(); c.roundRect ? c.roundRect(0, 0, TW, TH, 26) : c.rect(0, 0, TW, TH); c.fill();
    const sea = c.createLinearGradient(0, 0, 0, TH); sea.addColorStop(0, "#1C6E93"); sea.addColorStop(0.6, "#0F4C6E"); sea.addColorStop(1, "#0A3550");
    c.fillStyle = sea;
    c.beginPath(); c.moveTo(20, 880); c.lineTo(20, 240); c.arc(240, 240, 220, Math.PI, 0); c.lineTo(460, 880); c.closePath(); c.fill();
    // dalgalar
    c.strokeStyle = "rgba(255,255,255,.07)"; c.lineWidth = 2;
    for (let y = 120; y < 860; y += 34) { c.beginPath(); for (let x = 24; x < 456; x += 4) c.lineTo(x, y + Math.sin(x / 18 + y) * 4); c.stroke(); }
    // ada (tamponların altı)
    c.fillStyle = "#E8C887"; c.beginPath(); c.ellipse(225, 330, 120, 82, 0, 0, 7); c.fill();
    c.fillStyle = "#D9B26A"; c.beginPath(); c.ellipse(225, 338, 104, 66, 0, 0, 7); c.fill();
    c.fillStyle = "#4E9A4A";
    for (const [x, y] of [[120, 340], [330, 340], [225, 270]]) { c.beginPath(); c.arc(x, y, 9, 0, 7); c.fill(); }
    // X işareti
    c.strokeStyle = "#B03A2E"; c.lineWidth = 5; c.lineCap = "round";
    c.beginPath(); c.moveTo(212, 318); c.lineTo(238, 344); c.moveTo(238, 318); c.lineTo(212, 344); c.stroke();
    // fırlatma kanalı
    c.fillStyle = "rgba(0,0,0,.25)"; c.fillRect(430, 330, 30, 530);
    // iç kanal ve sapan gövdeleri
    for (const s of SLING) {
      c.fillStyle = "#8B5A2B"; c.beginPath(); s.pts.forEach(([x, y], i) => (i ? c.lineTo(x, y) : c.moveTo(x, y))); c.closePath(); c.fill();
      c.strokeStyle = "#6B4220"; c.lineWidth = 3; c.stroke();
    }
    // duvar/ray çizimi
    c.lineCap = "round";
    for (const w of walls) {
      if (w.kind === "target" || w.kind === "sling") continue;
      c.strokeStyle = w.kind === "post" ? "#F2C14E" : "#D9C49A"; c.lineWidth = Math.max(4, w.r * 2);
      c.beginPath(); c.moveTo(w.x1, w.y1); c.lineTo(w.x2, w.y2); c.stroke();
    }
    // drenaj işareti
    c.fillStyle = "rgba(255,255,255,.12)"; c.font = "800 14px Rubik, sans-serif"; c.textAlign = "center";
    c.fillText("KORSAN PINBALL", 225, 860);
  }

  function draw() {
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, cv.width, cv.height);
    if (!G) return;
    ctx.drawImage(bg, Math.round(ox * dpr), Math.round(oy * dpr));
    ctx.setTransform(sc * dpr, 0, 0, sc * dpr, ox * dpr, oy * dpr);
    const t = performance.now() / 1000;
    // fenerler
    LANES.forEach((x, i) => {
      const on = G.lanes[i];
      ctx.fillStyle = on ? "#FFD84D" : "rgba(255,216,77,.18)";
      ctx.shadowColor = "#FFD84D"; ctx.shadowBlur = on ? 14 : 0;
      ctx.beginPath(); ctx.arc(x, 165, 9, 0, 7); ctx.fill(); ctx.shadowBlur = 0;
      ctx.strokeStyle = "#5A3A1E"; ctx.lineWidth = 2; ctx.stroke();
    });
    // sapan lastikleri
    for (const w of walls) if (w.kind === "sling") {
      ctx.strokeStyle = w.flash ? "#FFD84D" : "#F4EEDC"; ctx.lineWidth = 7; ctx.lineCap = "round";
      ctx.beginPath(); ctx.moveTo(w.x1, w.y1); ctx.lineTo(w.x2, w.y2); ctx.stroke();
    }
    // kafatası hedefleri
    for (const tg of TARGETS) {
      const y = (tg.y1 + tg.y2) / 2;
      if (tg.down) { ctx.fillStyle = "rgba(0,0,0,.3)"; ctx.fillRect(24, y - 14, 12, 28); continue; }
      ctx.fillStyle = "#1E1E1E"; ctx.strokeStyle = "#F2C14E"; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.roundRect ? ctx.roundRect(24, y - 15, 20, 30, 4) : ctx.rect(24, y - 15, 20, 30); ctx.fill(); ctx.stroke();
      ctx.fillStyle = "#fff"; ctx.beginPath(); ctx.arc(34, y - 3, 6.5, 0, 7); ctx.fill(); ctx.fillRect(30.5, y + 1, 7, 6);
      ctx.fillStyle = "#1E1E1E"; ctx.beginPath(); ctx.arc(31.6, y - 3.5, 1.8, 0, 7); ctx.arc(36.4, y - 3.5, 1.8, 0, 7); ctx.fill();
      ctx.fillRect(32.5, y + 3, 1, 4); ctx.fillRect(35, y + 3, 1, 4);
    }
    // sandık
    ctx.save(); ctx.translate(CHEST.x, CHEST.y);
    if (G.chestLit) { ctx.shadowColor = "#FFD84D"; ctx.shadowBlur = 18 + Math.sin(t * 8) * 6; }
    ctx.fillStyle = "#7A4A1E"; ctx.fillRect(-22, -8, 44, 26);
    ctx.fillStyle = "#9A6430"; ctx.beginPath(); ctx.ellipse(0, -8, 22, 12, 0, Math.PI, 0); ctx.fill();
    ctx.shadowBlur = 0;
    ctx.fillStyle = "#F2C14E"; ctx.fillRect(-22, -3, 44, 4); ctx.fillRect(-3, -6, 6, 10);
    ctx.fillStyle = "#1A0F06"; ctx.beginPath(); ctx.arc(0, 4, CHEST.r * 0.55, 0, 7); ctx.fill();
    ctx.restore();
    ctx.fillStyle = "rgba(255,255,255,.75)"; ctx.font = "800 11px Rubik, sans-serif"; ctx.textAlign = "center";
    ctx.fillText(`${G.chestN % 3}/3`, CHEST.x, CHEST.y + 34);
    // tamponlar (can simidi)
    for (const bp of BUMPERS) {
      const k = bp.flash > 0 ? 1.08 : 1;
      ctx.save(); ctx.translate(bp.x, bp.y); ctx.scale(k, k);
      ctx.fillStyle = "rgba(0,0,0,.25)"; ctx.beginPath(); ctx.arc(3, 4, bp.r, 0, 7); ctx.fill();
      for (let i = 0; i < 8; i++) {
        ctx.fillStyle = i % 2 ? "#FFFFFF" : (bp.flash > 0 ? "#FFD84D" : "#E5484D");
        ctx.beginPath(); ctx.arc(0, 0, bp.r, i * Math.PI / 4, (i + 1) * Math.PI / 4); ctx.arc(0, 0, bp.r * 0.5, (i + 1) * Math.PI / 4, i * Math.PI / 4, true); ctx.closePath(); ctx.fill();
      }
      ctx.strokeStyle = "#7A2A20"; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(0, 0, bp.r, 0, 7); ctx.stroke();
      ctx.fillStyle = "#0F4C6E"; ctx.beginPath(); ctx.arc(0, 0, bp.r * 0.48, 0, 7); ctx.fill();
      ctx.restore();
    }
    // paletler (altın kılıç)
    for (const f of FL) {
      const tx = f.px + Math.cos(f.a) * FLEN, ty = f.py + Math.sin(f.a) * FLEN;
      ctx.lineCap = "round";
      ctx.strokeStyle = "#7A5A12"; ctx.lineWidth = FR * 2 + 3; ctx.beginPath(); ctx.moveTo(f.px, f.py); ctx.lineTo(tx, ty); ctx.stroke();
      ctx.strokeStyle = "#F2C14E"; ctx.lineWidth = FR * 2 - 2; ctx.beginPath(); ctx.moveTo(f.px, f.py); ctx.lineTo(tx, ty); ctx.stroke();
      ctx.fillStyle = "#A9822A"; ctx.beginPath(); ctx.arc(f.px, f.py, 5, 0, 7); ctx.fill();
    }
    // fırlatıcı yay
    const pl = G.charge;
    ctx.fillStyle = "#9AA4AE"; ctx.fillRect(436, 850 + pl * 18, 18, 24);
    ctx.strokeStyle = "#C9D1D9"; ctx.lineWidth = 2;
    ctx.beginPath(); for (let i = 0; i <= 6; i++) ctx.lineTo(445 + (i % 2 ? 6 : -6), 856 + pl * 18 + i * 3); ctx.stroke();
    // toplar
    for (const b of G.balls) {
      const g = ctx.createRadialGradient(b.x - 3, b.y - 4, 1, b.x, b.y, BR);
      g.addColorStop(0, "#FFFFFF"); g.addColorStop(0.4, "#C9D1D9"); g.addColorStop(1, "#5D6872");
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(b.x, b.y, BR, 0, 7); ctx.fill();
    }
    // kurtarma ışığı
    if (G.save > 0) { ctx.fillStyle = `rgba(110,255,170,${0.5 + 0.4 * Math.sin(t * 10)})`; ctx.beginPath(); ctx.arc(CXP, 830, 7, 0, 7); ctx.fill(); }
    // fırlatma ipucu
    if (G.balls.some(b => b.ready) && !G.charging) {
      ctx.fillStyle = "rgba(255,255,255,.85)"; ctx.font = "800 15px Rubik, sans-serif"; ctx.textAlign = "center";
      ctx.fillText("Basılı tut, bırak → fırlat", CXP, 600);
    }
    if (G.charging) { ctx.fillStyle = "#FFD84D"; ctx.fillRect(436, 760 - 70 * G.charge, 6, 70 * G.charge); }
    // yazılar
    for (const m of G.msgs) {
      const a = Math.max(0, 1 - m.t / m.life);
      ctx.globalAlpha = a; ctx.textAlign = "center";
      if (m.big) {
        ctx.font = "800 30px Rubik, sans-serif"; ctx.lineWidth = 6; ctx.strokeStyle = "rgba(10,30,45,.85)"; ctx.fillStyle = "#FFD84D";
        ctx.strokeText(m.s, m.x, m.y); ctx.fillText(m.s, m.x, m.y);
      } else {
        ctx.font = "800 16px Rubik, sans-serif"; ctx.lineWidth = 4; ctx.strokeStyle = "rgba(10,30,45,.8)"; ctx.fillStyle = "#fff";
        ctx.strokeText(m.s, m.x, m.y); ctx.fillText(m.s, m.x, m.y);
      }
      ctx.globalAlpha = 1;
    }
    if (paused) {
      ctx.fillStyle = "rgba(0,0,0,.5)"; ctx.fillRect(0, 0, TW, TH);
      ctx.fillStyle = "#fff"; ctx.font = "800 36px Rubik, sans-serif"; ctx.textAlign = "center"; ctx.fillText("Duraklatıldı", TW / 2, TH / 2);
    }
  }

  function renderHud() {
    if (!G) return;
    $("score").textContent = G.score.toLocaleString("tr-TR");
    $("balls").textContent = G.over ? "—" : "●".repeat(Math.max(0, G.ballsLeft));
    $("mult").textContent = "×" + G.mult;
    $("best").textContent = Math.max(best, G.score).toLocaleString("tr-TR");
  }

  /* ---------- girdi ---------- */
  function setFlip(i, on) { if (!G || G.over || paused) return; if (on && !FL[i].key) SND.flip(); FL[i].key = on; }
  function readyBall() { return G && G.balls.some(b => b.ready); }
  const KL = ["z", "a", "arrowleft", "shift"], KR = ["m", "l", "arrowright", "/"];
  document.addEventListener("keydown", (e) => {
    const k = e.key.toLowerCase();
    if (!$("start").hidden || !$("end").hidden) return;
    if (k === "p" || k === "escape") { togglePause(); return; }
    if (KL.includes(k)) { e.preventDefault(); setFlip(0, true); }
    else if (KR.includes(k)) { e.preventDefault(); setFlip(1, true); }
    else if ((k === " " || k === "arrowdown" || k === "enter") && G && !e.repeat) { e.preventDefault(); if (readyBall()) G.charging = true; }
  });
  document.addEventListener("keyup", (e) => {
    const k = e.key.toLowerCase();
    if (KL.includes(k)) setFlip(0, false);
    else if (KR.includes(k)) setFlip(1, false);
    else if ((k === " " || k === "arrowdown" || k === "enter") && G && G.charging) launch();
  });
  const touches = new Map();
  cv.addEventListener("pointerdown", (e) => {
    audio();
    if (!G || G.over || paused) return;
    const r = cv.getBoundingClientRect(), side = e.clientX - r.left < r.width / 2 ? 0 : 1;
    touches.set(e.pointerId, side);
    try { cv.setPointerCapture(e.pointerId); } catch (_) {}
    if (side === 1 && readyBall()) { G.charging = true; touches.set(e.pointerId, "launch"); return; }
    setFlip(side, true);
  });
  const up = (e) => {
    const s = touches.get(e.pointerId); if (s === undefined) return;
    touches.delete(e.pointerId);
    if (s === "launch") { launch(); return; }
    if (![...touches.values()].includes(s)) setFlip(s, false);
  };
  cv.addEventListener("pointerup", up); cv.addEventListener("pointercancel", up);
  window.addEventListener("blur", () => { FL.forEach(f => (f.key = false)); if (G) G.charging = false; });
  function togglePause() { if (!G || G.over) return; paused = !paused; FL.forEach(f => (f.key = false)); $("pause").textContent = paused ? "▶" : "⏸"; $("pause").setAttribute("aria-label", paused ? "Devam et" : "Duraklat"); }
  $("pause").addEventListener("click", togglePause);
  $("sound").addEventListener("click", () => {
    soundOn = !soundOn; $("ic-on").hidden = !soundOn; $("ic-off").hidden = soundOn;
    $("sound").setAttribute("aria-pressed", soundOn); $("sound").setAttribute("aria-label", soundOn ? "Sesi kapat" : "Sesi aç");
  });
  $("go").addEventListener("click", () => { audio(); $("start").hidden = true; newGame(); });
  $("again").addEventListener("click", () => { audio(); $("end").hidden = true; newGame(); });
  $("start-best").textContent = best ? `Rekor: ${best.toLocaleString("tr-TR")}` : "";

  /* ---------- döngü ---------- */
  let last = performance.now();
  function loop(now) {
    const dt = Math.min(1 / 30, (now - last) / 1000); last = now;
    const sr = stage.getBoundingClientRect();
    if (Math.abs(sr.width - W) > 0.5 || Math.abs(sr.height - H) > 0.5) resize();
    if (!paused && !headless && $("start").hidden) update(dt);
    draw();
    requestAnimationFrame(loop);
  }
  resize(); newGame(); renderHud();
  requestAnimationFrame(loop);

  // test kancası
  window.__pin = { get G() { return G; }, FL, walls, BUMPERS, TARGETS, CHEST, update, launch, newGame, setFlip,
    setHeadless: (h) => { headless = h; }, inPlunger };
})();
