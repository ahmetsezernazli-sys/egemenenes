/* Meyve Kesici — Enes için kaydırarak kesme oyunu */
(() => {
  "use strict";
  const $ = (id) => document.getElementById(id);
  const SAVE_KEY = "meyve-kesici";
  const W = 800, H = 600, G = 0.24;
  const FRUITS = [
    { e: "🍉", r: 40, juice: "#FF4D6D" }, { e: "🍊", r: 30, juice: "#FF9F43" }, { e: "🍎", r: 30, juice: "#FFF1D6" },
    { e: "🍋", r: 28, juice: "#FFE066" }, { e: "🍐", r: 30, juice: "#E9F5C9" }, { e: "🍍", r: 36, juice: "#FFD84D" },
    { e: "🥝", r: 26, juice: "#8BD450" }, { e: "🍓", r: 24, juice: "#E5484D" }, { e: "🍑", r: 30, juice: "#FFB38A" }, { e: "🍇", r: 30, juice: "#9B5DE5" }
  ];
  const EMO = '"Segoe UI Emoji","Apple Color Emoji","Noto Color Emoji",sans-serif';
  const cv = $("cv"), ctx = cv.getContext("2d");
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  cv.width = W * dpr; cv.height = H * dpr; ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

  let save = { hi: [0, 0], df: 0 };
  try { save = Object.assign(save, JSON.parse(localStorage.getItem(SAVE_KEY) || "{}")); } catch (e) {}
  const persist = () => { try { localStorage.setItem(SAVE_KEY, JSON.stringify(save)); } catch (e) {} };

  /* ---------- ses ---------- */
  let AC = null, nbuf = null;
  function audio() { try { AC = AC || new (window.AudioContext || window.webkitAudioContext)(); if (AC.state === "suspended") AC.resume(); } catch (e) {} }
  function tone(f, d, type, vol, delay, f2) {
    if (!AC) return;
    const t = AC.currentTime + (delay || 0), o = AC.createOscillator(), g = AC.createGain();
    o.type = type || "sine"; o.frequency.setValueAtTime(f, t); if (f2) o.frequency.exponentialRampToValueAtTime(f2, t + d);
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol || 0.06, t + 0.01); g.gain.exponentialRampToValueAtTime(0.0001, t + d);
    o.connect(g).connect(AC.destination); o.start(t); o.stop(t + d + 0.02);
  }
  function noise(d, freq, vol) {
    if (!AC) return;
    if (!nbuf) { nbuf = AC.createBuffer(1, AC.sampleRate, AC.sampleRate); const a = nbuf.getChannelData(0); for (let i = 0; i < a.length; i++) a[i] = Math.random() * 2 - 1; }
    const s = AC.createBufferSource(), f = AC.createBiquadFilter(), g = AC.createGain(), t = AC.currentTime;
    s.buffer = nbuf; f.type = "bandpass"; f.frequency.value = freq; g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + d);
    s.connect(f).connect(g).connect(AC.destination); s.start(t); s.stop(t + d);
  }
  const SND = {
    swish: () => noise(0.12, 3000, 0.08),
    slice: (n) => { noise(0.08, 1200, 0.15); tone(500 + n * 60, 0.08, "triangle", 0.05); },
    bomb: () => { noise(0.7, 200, 0.6); tone(90, 0.6, "sawtooth", 0.15, 0, 40); },
    miss: () => tone(200, 0.25, "sine", 0.08, 0, 120),
    combo: (n) => [0, 1, 2].forEach(i => tone(700 + n * 50 + i * 150, 0.1, "square", 0.04, i * 0.06)),
    freeze: () => tone(1400, 0.4, "sine", 0.06, 0, 700),
    star: () => [880, 1175, 1568].forEach((f, i) => tone(f, 0.12, "triangle", 0.06, i * 0.07)),
    over: () => [392, 330, 262].forEach((f, i) => tone(f, 0.3, "triangle", 0.08, i * 0.18))
  };

  /* ---------- durum ---------- */
  let S = null, paused = true;
  const blade = [];
  function newGame(df) {
    S = { df, score: 0, lives: 3, t: 0, left: 60, items: [], bits: [], splats: [], pops: [], next: 1, wave: 0, slow: 0, dbl: 0, over: false, swipeCount: 0, swipeT: 0, best: 0 };
    paused = false; hud(); msg("");
  }
  function hud() {
    $("sc").textContent = S ? S.score : 0;
    $("hi").textContent = save.hi[S ? S.df : save.df] || 0;
    $("lifechip").firstChild.textContent = S && S.df === 1 ? "Süre " : "Can ";
    $("lv").textContent = !S ? "❤❤❤" : S.df === 1 ? Math.ceil(Math.max(0, S.left)) : "❤".repeat(S.lives) + "♡".repeat(3 - S.lives);
  }
  function msg(t) { $("msg").textContent = t; }
  function launch() {
    S.wave++;
    const lvl = Math.min(1, S.t / 90), n = 1 + Math.floor(Math.random() * (2 + lvl * 4));
    const bombP = S.t < 6 ? 0 : 0.12 + lvl * 0.12;
    for (let i = 0; i < n; i++) {
      const x = 120 + Math.random() * (W - 240), vx = (W / 2 - x) / 90 + (Math.random() - 0.5) * 2.2;
      const vy = -(11.5 + Math.random() * 3);
      let it;
      const r = Math.random();
      if (r < bombP && i < 2) it = { kind: "bomb", r: 30 };
      else if (r > 0.975) it = { kind: "ice", r: 28 };
      else if (r > 0.955) it = { kind: "star", r: 28 };
      else { const f = FRUITS[Math.floor(Math.random() * FRUITS.length)]; it = { kind: "fruit", r: f.r, f }; }
      Object.assign(it, { x, y: H + 40, vx, vy, rot: 0, vr: (Math.random() - 0.5) * 0.12, delay: i * (0.12 + Math.random() * 0.2) });
      S.items.push(it);
    }
    S.next = 1.4 - lvl * 0.6 + Math.random() * 0.6;
  }
  function step(dt) {
    if (!S || paused || S.over) { stepFx(dt); return; }
    const k = S.slow > 0 ? 0.45 : 1, f = dt * 60 * k;
    S.t += dt; S.slow = Math.max(0, S.slow - dt); S.dbl = Math.max(0, S.dbl - dt);
    if (S.df === 1) { S.left -= dt; if (S.left <= 0) return gameOver("Süre bitti!"); }
    S.next -= dt * k; if (S.next <= 0) launch();
    for (const it of S.items) {
      if (it.delay > 0) { it.delay -= dt * k; continue; }
      it.vy += G * f; it.x += it.vx * f; it.y += it.vy * f; it.rot += it.vr * f;
      if (it.y > H + 60 && it.vy > 0) {
        it.gone = true;
        if (it.kind === "fruit" && S.df === 0) { S.lives--; SND.miss(); S.pops.push({ x: Math.max(30, Math.min(W - 30, it.x)), y: H - 30, t: 1, s: "✖", c: "#FF4D6D" }); if (S.lives <= 0) return gameOver("Üç meyve kaçtı!"); }
      }
    }
    S.items = S.items.filter(i => !i.gone);
    S.swipeT -= dt; if (S.swipeT <= 0 && S.swipeCount) endSwipe();
    stepFx(dt * k);
    hud();
  }
  function stepFx(dt) {
    const f = dt * 60;
    if (!S) return;
    for (const b of S.bits) { b.vy += G * f; b.x += b.vx * f; b.y += b.vy * f; b.rot += b.vr * f; b.t -= dt; }
    S.bits = S.bits.filter(b => b.t > 0 && b.y < H + 80);
    for (const s of S.splats) s.t -= dt; S.splats = S.splats.filter(s => s.t > 0);
    for (const p of S.pops) { p.t -= dt; p.y -= 30 * dt; } S.pops = S.pops.filter(p => p.t > 0);
    const now = performance.now(); while (blade.length && now - blade[0].t > 140) blade.shift();
  }
  function cut(it, ax, ay, bx, by) {
    it.gone = true;
    const ang = Math.atan2(by - ay, bx - ax), nx = -Math.sin(ang), ny = Math.cos(ang);
    if (it.kind === "bomb") return boom(it);
    for (const s of [1, -1]) S.bits.push({ x: it.x, y: it.y, vx: it.vx * 0.5 + nx * s * 2.2, vy: Math.min(it.vy, 0) * 0.4 + ny * s * 2.2 - 1, rot: it.rot, vr: s * 0.08, ang, side: s, it, t: 2.2 });
    const col = it.kind === "fruit" ? it.f.juice : it.kind === "ice" ? "#BDE7FF" : "#FFD166";
    S.splats.push({ x: it.x, y: it.y, r: it.r * 1.4, c: col, t: 1.6 });
    let pts = 1;
    if (it.kind === "ice") { S.slow = 4; SND.freeze(); S.pops.push({ x: it.x, y: it.y - 30, t: 1.2, s: "Yavaş zaman!", c: "#BDE7FF" }); }
    if (it.kind === "star") { S.dbl = 7; SND.star(); S.pops.push({ x: it.x, y: it.y - 30, t: 1.2, s: "×2 puan!", c: "#FFD166" }); pts = 3; }
    if (S.dbl > 0) pts *= 2;
    S.score += pts; S.swipeCount++; S.swipeT = 0.25;
    SND.slice(S.swipeCount);
  }
  function endSwipe() {
    const n = S.swipeCount; S.swipeCount = 0;
    if (n >= 3) { const bonus = n * (S.dbl > 0 ? 2 : 1); S.score += bonus; SND.combo(n); S.pops.push({ x: W / 2, y: H / 2 - 120, t: 1.3, s: `${n}'li seri! +${bonus}`, c: "#FFD166", big: true }); }
  }
  function boom(it) {
    SND.bomb(); S.splats.push({ x: it.x, y: it.y, r: 160, c: "#FFFFFF", t: 0.6, flash: true });
    if (S.df === 1) { S.score = Math.max(0, S.score - 10); S.pops.push({ x: it.x, y: it.y, t: 1.3, s: "-10", c: "#FF4D6D", big: true }); return; }
    gameOver("Bombaya dokundun!");
  }
  function gameOver(why) {
    if (S.over) return;
    S.over = true; endSwipe(); SND.over();
    const rec = S.score > (save.hi[S.df] || 0);
    if (rec) { save.hi[S.df] = S.score; persist(); }
    hud(); msg(why);
    const s0 = S;
    setTimeout(() => {
      if (S !== s0) return;
      $("m-title").textContent = rec ? "🏆 Yeni rekor!" : why;
      $("m-tx").innerHTML = `Puan: <b>${S.score}</b> · Rekor: <b>${save.hi[S.df]}</b>. Seri yapmak için meyveler bir aradayken uzun bir kaydırış dene!`;
      $("start").textContent = "Yeniden oyna"; $("resume").hidden = true; $("menu").hidden = false;
    }, 1100);
  }

  /* ---------- çizim ---------- */
  function emoji(e, x, y, size, rot) { ctx.save(); ctx.translate(x, y); ctx.rotate(rot || 0); ctx.font = `${size}px ${EMO}`; ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.fillText(e, 0, size * 0.05); ctx.restore(); }
  function itemEmoji(it) { return it.kind === "fruit" ? it.f.e : it.kind === "bomb" ? "💣" : it.kind === "ice" ? "❄️" : "⭐"; }
  function draw() {
    // tahta zemin
    const g = ctx.createLinearGradient(0, 0, 0, H); g.addColorStop(0, "#5A3D1E"); g.addColorStop(1, "#2E1E0C");
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    ctx.strokeStyle = "rgba(0,0,0,.18)"; ctx.lineWidth = 2;
    for (let x = 0; x < W; x += 100) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke(); }
    if (!S) return;
    if (S.slow > 0) { ctx.fillStyle = `rgba(150,210,255,${0.12 + 0.05 * Math.sin(S.t * 6)})`; ctx.fillRect(0, 0, W, H); }
    for (const s of S.splats) {
      ctx.globalAlpha = Math.min(1, s.t) * (s.flash ? 0.8 : 0.55); ctx.fillStyle = s.c;
      ctx.beginPath(); ctx.arc(s.x, s.y, s.r * (s.flash ? (1.6 - s.t) : 1), 0, 7); ctx.fill();
      if (!s.flash) for (let i = 0; i < 6; i++) { const a = i * 1.05 + s.x; ctx.beginPath(); ctx.arc(s.x + Math.cos(a) * s.r * 1.1, s.y + Math.sin(a) * s.r * 1.1, s.r * 0.18, 0, 7); ctx.fill(); }
      ctx.globalAlpha = 1;
    }
    for (const it of S.items) if (it.delay <= 0) {
      if (it.kind === "bomb") { ctx.fillStyle = "rgba(255,80,80,.25)"; ctx.beginPath(); ctx.arc(it.x, it.y, it.r + 10 + Math.sin(S.t * 12) * 4, 0, 7); ctx.fill(); }
      emoji(itemEmoji(it), it.x, it.y, it.r * 2.1, it.rot);
    }
    for (const b of S.bits) {
      ctx.save(); ctx.globalAlpha = Math.min(1, b.t);
      ctx.translate(b.x, b.y); ctx.rotate(b.ang);
      ctx.beginPath(); ctx.rect(-b.it.r * 1.6, b.side > 0 ? 0 : -b.it.r * 1.6, b.it.r * 3.2, b.it.r * 1.6); ctx.clip();
      ctx.rotate(-b.ang + b.rot); ctx.font = `${b.it.r * 2.1}px ${EMO}`; ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.fillText(itemEmoji(b.it), 0, b.it.r * 0.1);
      ctx.restore();
    }
    // bıçak izi
    if (blade.length > 1) {
      ctx.lineCap = "round"; ctx.lineJoin = "round";
      for (let i = 1; i < blade.length; i++) {
        const a = blade[i - 1], b = blade[i], k = i / blade.length;
        ctx.strokeStyle = `rgba(255,255,255,${0.25 + k * 0.75})`; ctx.lineWidth = 2 + k * 9;
        ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
      }
    }
    for (const p of S.pops) { ctx.globalAlpha = Math.min(1, p.t * 1.5); ctx.fillStyle = p.c; ctx.font = `800 ${p.big ? 40 : 24}px Rubik, sans-serif`; ctx.textAlign = "center"; ctx.textBaseline = "alphabetic"; ctx.fillText(p.s, p.x, p.y); ctx.globalAlpha = 1; }
    if (S.dbl > 0) { ctx.fillStyle = "#FFD166"; ctx.font = "800 20px Rubik, sans-serif"; ctx.textAlign = "left"; ctx.fillText(`⭐ ×2  ${Math.ceil(S.dbl)} sn`, 16, 32); }
    if (S.slow > 0) { ctx.fillStyle = "#BDE7FF"; ctx.font = "800 20px Rubik, sans-serif"; ctx.textAlign = "right"; ctx.fillText(`❄️ ${Math.ceil(S.slow)} sn`, W - 16, 32); }
  }
  let last = 0;
  function loop(ts) { const dt = Math.min(0.05, (ts - (last || ts)) / 1000); last = ts; step(dt); draw(); requestAnimationFrame(loop); }

  /* ---------- girdi ---------- */
  let down = false, prev = null;
  function pt(e) { const r = cv.getBoundingClientRect(); return { x: (e.clientX - r.left) * W / r.width, y: (e.clientY - r.top) * H / r.height }; }
  function segHit(ax, ay, bx, by, cx, cy, r) {
    const ex = bx - ax, ey = by - ay, L2 = ex * ex + ey * ey || 1;
    let t = ((cx - ax) * ex + (cy - ay) * ey) / L2; t = Math.max(0, Math.min(1, t));
    const dx = ax + ex * t - cx, dy = ay + ey * t - cy; return dx * dx + dy * dy < r * r;
  }
  function swipeTo(p) {
    if (!S || paused || S.over) { prev = p; return; }
    const now = performance.now();
    if (prev) {
      const d = Math.hypot(p.x - prev.x, p.y - prev.y);
      if (d > 4) {
        blade.push({ x: p.x, y: p.y, t: now });
        if (d > 30 && Math.random() < 0.3) SND.swish();
        for (const it of S.items) if (!it.gone && it.delay <= 0 && segHit(prev.x, prev.y, p.x, p.y, it.x, it.y, it.r * 0.9)) cut(it, prev.x, prev.y, p.x, p.y);
        S.items = S.items.filter(i => !i.gone);
      }
    } else blade.push({ x: p.x, y: p.y, t: now });
    prev = p;
  }
  cv.addEventListener("pointerdown", (e) => { audio(); down = true; prev = null; cv.setPointerCapture(e.pointerId); swipeTo(pt(e)); e.preventDefault(); });
  cv.addEventListener("pointermove", (e) => { if (down) swipeTo(pt(e)); });
  const up = () => { down = false; prev = null; };
  cv.addEventListener("pointerup", up); cv.addEventListener("pointercancel", up);

  /* ---------- menü ---------- */
  function openMenu() {
    if (S && !S.over) { paused = true; $("resume").hidden = false; $("m-title").textContent = "⏸ Ara"; }
    $("menu").hidden = false;
  }
  $("open-menu").addEventListener("click", openMenu);
  $("resume").addEventListener("click", () => { $("menu").hidden = true; paused = false; });
  document.querySelectorAll('input[name="df"]').forEach((i) => { if (+i.value === save.df) i.checked = true; });
  $("start").addEventListener("click", () => {
    audio();
    const df = +document.querySelector('input[name="df"]:checked').value;
    save.df = df; persist(); $("menu").hidden = true; $("start").textContent = "Yeni oyun";
    newGame(df);
  });
  document.addEventListener("keydown", (e) => { if (e.key === "Escape" && $("menu").hidden) openMenu(); });
  document.addEventListener("visibilitychange", () => { if (document.hidden && S && !S.over && !paused) openMenu(); });

  hud(); requestAnimationFrame(loop);
  window.__mk2 = { newGame, step, launch, swipeTo, cut, lift() { prev = null; }, get S() { return S; }, setPaused(p) { paused = p; } };
})();
