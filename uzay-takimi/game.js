/* Uzay Takımı — iki kişilik ortak uzay oyunu: biri sürer, biri nişan alır */
(() => {
  "use strict";
  const $ = (id) => document.getElementById(id);
  const cv = $("cv"), ctx = cv.getContext("2d"), stage = $("stage");
  const SAVE_KEY = "uzay-takimi";
  const AW = 960, AH = 560, R = 22, SPEED = 300, TURN = 3.6, FIRE = 0.26, BSPEED = 620, SHIELDS = 5;
  const LV = [{ rock: 0.8, spawn: 1.25 }, { rock: 1.1, spawn: 0.9 }];
  const TAU = Math.PI * 2;
  const rnd = (a, b) => a + Math.random() * (b - a);
  const angDiff = (a, b) => { let d = b - a; while (d > Math.PI) d -= TAU; while (d < -Math.PI) d += TAU; return d; };

  let AC = null, headless = false;
  function audio() { try { AC = AC || new (window.AudioContext || window.webkitAudioContext)(); if (AC.state === "suspended") AC.resume(); } catch (e) {} }
  function tone(f, d = 0.1, type = "triangle", vol = 0.05, delay = 0) {
    if (!AC || headless) return;
    const t = AC.currentTime + delay, o = AC.createOscillator(), g = AC.createGain();
    o.type = type; o.frequency.setValueAtTime(f, t); g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + d);
    o.connect(g).connect(AC.destination); o.start(t); o.stop(t + d + 0.02);
  }
  const SND = { shot: () => tone(760, 0.05, "square", 0.015), boom: () => tone(130, 0.18, "sawtooth", 0.05), gem: () => { tone(880, 0.08); tone(1320, 0.1, "triangle", 0.05, 0.06); }, hit: () => tone(90, 0.35, "sawtooth", 0.08), wave: () => [523, 659, 784].forEach((f, i) => tone(f, 0.15, "triangle", 0.06, i * 0.1)), over: () => [392, 330, 262, 196].forEach((f, i) => tone(f, 0.25, "sawtooth", 0.05, i * 0.16)) };

  let CFG = { mode: "2p", lvl: 0, names: ["Enes", "Egemen"], assist: true }, best = {};
  try { const s = JSON.parse(localStorage.getItem(SAVE_KEY) || "null"); if (s) { if (s.cfg) CFG = Object.assign(CFG, s.cfg); best = s.best || {}; } } catch (e) {}
  const store = () => { try { localStorage.setItem(SAVE_KEY, JSON.stringify({ cfg: CFG, best })); } catch (e) {} };
  const bestKey = () => `${CFG.mode}${CFG.lvl}`;
  let G = null, paused = false;
  const keys = [{}, {}];
  const stars = Array.from({ length: 90 }, () => ({ x: rnd(0, AW), y: rnd(0, AH), s: rnd(0.5, 2) }));

  function newGame() {
    G = { x: AW / 2, y: AH / 2, a: -Math.PI / 2, ta: -Math.PI / 2, shield: SHIELDS, inv: 1.5, cd: 0, score: 0, wave: 1, kills: 0, spawn: 0.6, rocks: [], shots: [], gems: [], fx: [], over: false, t: 0, msg: "1. dalga", msgT: 1.2 };
    keys.forEach(k => { for (const n in k) k[n] = 0; });
    renderHud();
  }
  function spawnRock(size, x, y, vx, vy) {
    const L = LV[CFG.lvl];
    if (x === undefined) {
      const side = Math.floor(rnd(0, 4));
      x = side === 0 ? -40 : side === 1 ? AW + 40 : rnd(0, AW); y = side === 2 ? -40 : side === 3 ? AH + 40 : rnd(0, AH);
      const a = Math.atan2(G.y + rnd(-120, 120) - y, G.x + rnd(-120, 120) - x), sp = rnd(70, 120) * L.rock * (1 + G.wave * 0.05);
      vx = Math.cos(a) * sp; vy = Math.sin(a) * sp;
    }
    G.rocks.push({ x, y, vx, vy, size, r: 14 + size * 13, hp: size, rot: rnd(0, TAU), spin: rnd(-2, 2) });
  }
  function nearestRock() { let b = null, bd = 1e9; for (const r of G.rocks) { if (r.x < 0 || r.y < 0 || r.x > AW || r.y > AH) continue; const d = Math.hypot(r.x - G.x, r.y - G.y); if (d < bd) { bd = d; b = r; } } return b; }
  function fxBurst(x, y, c, n) { if (headless) return; for (let i = 0; i < n; i++) { const a = rnd(0, TAU), s = rnd(40, 220); G.fx.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, t: 0, life: rnd(0.3, 0.7), c }); } }
  function update(dt) {
    if (!G || G.over) return;
    G.t += dt; if (G.msgT > 0) G.msgT -= dt;
    G.inv = Math.max(0, G.inv - dt);
    // pilot
    const k0 = keys[0], mx = (k0.r ? 1 : 0) - (k0.l ? 1 : 0), my = (k0.d ? 1 : 0) - (k0.u ? 1 : 0), len = Math.hypot(mx, my);
    if (len) { G.x = Math.max(R, Math.min(AW - R, G.x + mx / len * SPEED * dt)); G.y = Math.max(R, Math.min(AH - R, G.y + my / len * SPEED * dt)); G.a = Math.atan2(my, mx); }
    // nişancı: elle, yardımla ya da bilgisayar
    const k1 = keys[1], tr = (k1.r ? 1 : 0) - (k1.l ? 1 : 0), ai = CFG.mode === "ai";
    if (tr && !ai) G.ta += tr * TURN * dt;
    else if (ai || CFG.assist) {
      const r = nearestRock();
      if (r) { const d = angDiff(G.ta, Math.atan2(r.y - G.y, r.x - G.x)), rate = ai ? TURN * 0.8 : TURN * 0.55; G.ta += Math.sign(d) * Math.min(Math.abs(d), rate * dt); }
    }
    // kendiliğinden ateş
    G.cd -= dt;
    if (G.cd <= 0) { G.cd = FIRE; G.shots.push({ x: G.x + Math.cos(G.ta) * 34, y: G.y + Math.sin(G.ta) * 34, vx: Math.cos(G.ta) * BSPEED, vy: Math.sin(G.ta) * BSPEED, life: 1.1 }); SND.shot(); }
    // göktaşı üretimi
    G.spawn -= dt;
    if (G.spawn <= 0 && G.rocks.length < 8 + G.wave * 2) { G.spawn = Math.max(0.35, LV[CFG.lvl].spawn - G.wave * 0.06); spawnRock(1 + Math.floor(rnd(0, 3))); }
    for (let i = G.shots.length - 1; i >= 0; i--) { const s = G.shots[i]; s.x += s.vx * dt; s.y += s.vy * dt; s.life -= dt; if (s.life <= 0 || s.x < -20 || s.y < -20 || s.x > AW + 20 || s.y > AH + 20) G.shots.splice(i, 1); }
    for (let i = G.rocks.length - 1; i >= 0; i--) {
      const r = G.rocks[i];
      r.x += r.vx * dt; r.y += r.vy * dt; r.rot += r.spin * dt;
      if (r.x < -120 || r.y < -120 || r.x > AW + 120 || r.y > AH + 120) { G.rocks.splice(i, 1); continue; }
      let dead = false;
      for (let j = G.shots.length - 1; j >= 0; j--) {
        const s = G.shots[j];
        if (Math.hypot(s.x - r.x, s.y - r.y) < r.r + 4) { G.shots.splice(j, 1); r.hp--; fxBurst(s.x, s.y, "#FFE6A8", 3); if (r.hp <= 0) { dead = true; break; } }
      }
      if (dead) { killRock(i, r); continue; }
      if (G.inv <= 0 && Math.hypot(r.x - G.x, r.y - G.y) < r.r + R - 4) {
        G.shield--; G.inv = 1.4; SND.hit(); fxBurst(G.x, G.y, "#7FD4FF", 22); G.rocks.splice(i, 1); renderHud();
        if (G.shield <= 0) return gameOver();
      }
    }
    for (let i = G.gems.length - 1; i >= 0; i--) {
      const g = G.gems[i]; g.t -= dt;
      if (g.t <= 0) { G.gems.splice(i, 1); continue; }
      if (Math.hypot(g.x - G.x, g.y - G.y) < R + 16) {
        G.gems.splice(i, 1); SND.gem();
        if (g.k === "s" && G.shield < SHIELDS) { G.shield++; G.fx.push({ txt: "+kalkan", x: g.x, y: g.y, t: 0, life: 0.9 }); }
        else { G.score += 25; G.fx.push({ txt: "+25", x: g.x, y: g.y, t: 0, life: 0.9 }); }
        renderHud();
      }
    }
    for (let i = G.fx.length - 1; i >= 0; i--) { const f = G.fx[i]; f.t += dt; if (!f.txt) { f.x += f.vx * dt; f.y += f.vy * dt; } if (f.t > f.life) G.fx.splice(i, 1); }
  }
  function killRock(i, r) {
    G.rocks.splice(i, 1); G.score += 10 * r.size; G.kills++; SND.boom(); fxBurst(r.x, r.y, "#B9A98F", 12);
    if (r.size > 1) for (const s of [-1, 1]) { const a = Math.atan2(r.vy, r.vx) + s * 0.7, sp = Math.hypot(r.vx, r.vy) * 1.15; spawnRock(r.size - 1, r.x, r.y, Math.cos(a) * sp, Math.sin(a) * sp); }
    if (Math.random() < 0.28) G.gems.push({ x: r.x, y: r.y, t: 7, k: Math.random() < 0.2 ? "s" : "c" });
    if (G.kills >= G.wave * 12) { G.wave++; G.kills = 0; G.msg = `${G.wave}. dalga`; G.msgT = 1.2; SND.wave(); }
    renderHud();
  }
  function gameOver() {
    G.over = true; fxBurst(G.x, G.y, "#FF7A3C", 40);
    const k = bestKey(), nb = G.score > (best[k] || 0);
    if (nb) { best[k] = G.score; store(); }
    if (headless) return;
    SND.over();
    setTimeout(() => {
      $("end-icon").textContent = nb ? "🏆" : "💥";
      $("end-title").textContent = nb ? `Yeni takım rekoru: ${G.score}!` : `Takım skoru: ${G.score}`;
      $("end-text").textContent = `${G.wave}. dalgaya ulaştınız. Rekor: ${best[k] || 0}`;
      $("end-next").textContent = "Yeniden oyna"; $("end").hidden = false; $("end-next").focus();
    }, 800);
  }

  /* ---------- çizim ---------- */
  let W = 0, H = 0, dpr = 1, sc = 1, ox = 0, oy = 0;
  function resize() { const r = stage.getBoundingClientRect(); dpr = Math.min(2, window.devicePixelRatio || 1); W = r.width; H = r.height; cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr); sc = Math.min(W / AW, H / AH); ox = (W - AW * sc) / 2; oy = (H - AH * sc) / 2; }
  function draw() {
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.clearRect(0, 0, W, H);
    if (!G) return;
    ctx.setTransform(dpr * sc, 0, 0, dpr * sc, dpr * ox, dpr * oy);
    ctx.fillStyle = "#070A22"; ctx.fillRect(0, 0, AW, AH);
    const t = performance.now() / 1000;
    for (const s of stars) { ctx.fillStyle = `rgba(255,255,255,${0.3 + s.s * 0.3})`; ctx.fillRect((s.x + t * s.s * 8) % AW, s.y, s.s, s.s); }
    for (const g of G.gems) { const p = 1 + Math.sin(t * 6) * 0.12; ctx.save(); ctx.translate(g.x, g.y); ctx.scale(p, p); ctx.fillStyle = g.k === "s" ? "#7FD4FF" : "#FFD166"; ctx.beginPath(); ctx.moveTo(0, -13); ctx.lineTo(11, 0); ctx.lineTo(0, 13); ctx.lineTo(-11, 0); ctx.fill(); ctx.restore(); }
    for (const r of G.rocks) {
      ctx.save(); ctx.translate(r.x, r.y); ctx.rotate(r.rot); ctx.fillStyle = "#8D8476"; ctx.beginPath();
      for (let i = 0; i < 9; i++) { const a = i * TAU / 9, q = r.r * (0.82 + ((i * 7) % 4) * 0.08); i ? ctx.lineTo(Math.cos(a) * q, Math.sin(a) * q) : ctx.moveTo(Math.cos(a) * q, Math.sin(a) * q); }
      ctx.closePath(); ctx.fill(); ctx.fillStyle = "rgba(0,0,0,.2)"; ctx.beginPath(); ctx.arc(-r.r * 0.25, -r.r * 0.2, r.r * 0.22, 0, TAU); ctx.arc(r.r * 0.3, r.r * 0.25, r.r * 0.16, 0, TAU); ctx.fill(); ctx.restore();
    }
    ctx.fillStyle = "#FFE6A8"; for (const s of G.shots) { ctx.beginPath(); ctx.arc(s.x, s.y, 4, 0, TAU); ctx.fill(); }
    if (!G.over && !(G.inv > 0 && Math.floor(t * 12) % 2)) {
      ctx.save(); ctx.translate(G.x, G.y);
      ctx.save(); ctx.rotate(G.a); ctx.fillStyle = "#3D8BFD"; ctx.beginPath(); ctx.moveTo(30, 0); ctx.lineTo(-20, -22); ctx.lineTo(-12, 0); ctx.lineTo(-20, 22); ctx.closePath(); ctx.fill(); ctx.fillStyle = "#92BEFF"; ctx.beginPath(); ctx.arc(6, 0, 8, 0, TAU); ctx.fill(); ctx.restore();
      ctx.rotate(G.ta); ctx.fillStyle = "#E5484D"; ctx.fillRect(0, -5, 34, 10); ctx.beginPath(); ctx.arc(0, 0, 12, 0, TAU); ctx.fill(); ctx.restore();
    }
    for (const f of G.fx) { const a = Math.max(0, 1 - f.t / f.life); ctx.globalAlpha = a; if (f.txt) { ctx.fillStyle = "#fff"; ctx.font = "800 18px Rubik, sans-serif"; ctx.textAlign = "center"; ctx.fillText(f.txt, f.x, f.y - f.t * 40); } else { ctx.fillStyle = f.c; ctx.beginPath(); ctx.arc(f.x, f.y, 2 + a * 3, 0, TAU); ctx.fill(); } ctx.globalAlpha = 1; }
    if (G.msgT > 0) { ctx.font = "800 54px Rubik, sans-serif"; ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.fillStyle = "#fff"; ctx.fillText(G.msg, AW / 2, AH / 4); ctx.textBaseline = "alphabetic"; }
    if (paused) { ctx.fillStyle = "rgba(0,0,0,.5)"; ctx.fillRect(0, 0, AW, AH); ctx.fillStyle = "#fff"; ctx.font = "800 40px Rubik, sans-serif"; ctx.textAlign = "center"; ctx.fillText("Duraklatıldı", AW / 2, AH / 2); }
  }
  function renderHud() {
    $("n0").textContent = `${CFG.names[0]} (pilot)`; $("n1").textContent = `${CFG.names[1]} (nişancı)`;
    $("score").textContent = G ? G.score : 0; $("hearts").textContent = G ? "🛡".repeat(Math.max(0, G.shield)) : "";
    $("round").textContent = G ? `${G.wave}. dalga` : ""; $("pad1").hidden = CFG.mode === "ai";
  }

  /* ---------- girdi ---------- */
  const KM = { w: [0, "u"], s: [0, "d"], a: [0, "l"], d: [0, "r"], arrowleft: [1, "l"], arrowright: [1, "r"] };
  const KM_AI = { arrowup: "u", arrowdown: "d", arrowleft: "l", arrowright: "r" };
  function setKey(e, on) {
    if (!$("menu").hidden || !$("end").hidden) return;
    const key = e.key.toLowerCase();
    if (CFG.mode === "ai" && KM_AI[key]) { e.preventDefault(); keys[0][KM_AI[key]] = on ? 1 : 0; return; }
    const m = KM[key]; if (!m) return;
    e.preventDefault(); keys[m[0]][m[1]] = on ? 1 : 0;
  }
  document.addEventListener("keydown", (e) => { if (e.key === "p" || e.key === "P" || e.key === "Escape") { togglePause(); return; } if (!e.repeat) { audio(); setKey(e, true); } });
  document.addEventListener("keyup", (e) => setKey(e, false));
  window.addEventListener("blur", () => keys.forEach(k => { for (const n in k) k[n] = 0; }));
  document.querySelectorAll(".pad button").forEach(btn => {
    const p = +btn.dataset.p, k = btn.dataset.k;
    if (p === 1 && (k === "u" || k === "d")) { btn.style.visibility = "hidden"; return; }
    btn.addEventListener("pointerdown", (e) => { e.preventDefault(); audio(); keys[p][k] = 1; btn.classList.add("on"); try { btn.setPointerCapture(e.pointerId); } catch (_) {} });
    const off = () => { keys[p][k] = 0; btn.classList.remove("on"); };
    btn.addEventListener("pointerup", off); btn.addEventListener("pointercancel", off); btn.addEventListener("lostpointercapture", off);
    btn.addEventListener("contextmenu", (e) => e.preventDefault());
  });
  function togglePause() { if (!G || G.over || !$("menu").hidden) return; paused = !paused; $("pause").textContent = paused ? "▶" : "⏸"; }
  $("pause").addEventListener("click", togglePause);

  /* ---------- menü ---------- */
  const form = $("form");
  function syncForm() { $("row1").hidden = form.mode.value === "ai"; }
  function fillForm() {
    form.mode.value = CFG.mode; form.lvl.value = String(CFG.lvl); $("in0").value = CFG.names[0]; $("in1").value = CFG.names[1]; $("sh1").checked = CFG.assist; syncForm();
    const vals = ["2p0", "2p1", "ai0", "ai1"].filter(k => best[k]);
    $("best-line").textContent = vals.length ? "Rekorlar: " + vals.map(k => `${k.startsWith("ai") ? "bilgisayarla" : "iki kişi"} ${k.endsWith("1") ? "Normal" : "Kolay"} ${best[k]}`).join(" · ") : "";
  }
  form.addEventListener("change", (e) => { if (e.target.name === "mode") syncForm(); });
  form.addEventListener("submit", (e) => {
    e.preventDefault(); audio();
    const ai = form.mode.value === "ai";
    CFG = { mode: form.mode.value, lvl: +form.lvl.value, names: [$("in0").value.trim() || "Pilot", ai ? "Bilgisayar" : ($("in1").value.trim() || "Nişancı")], assist: $("sh1").checked };
    store(); $("menu").hidden = true; paused = false; newGame();
  });
  $("menu-btn").addEventListener("click", () => { fillForm(); $("end").hidden = true; $("menu").hidden = false; });
  $("end-next").addEventListener("click", () => { $("end").hidden = true; newGame(); });
  $("end-menu").addEventListener("click", () => { fillForm(); $("end").hidden = true; $("menu").hidden = false; });
  fillForm();

  let last = performance.now();
  function loop(now) {
    const dt = Math.min(0.05, (now - last) / 1000); last = now;
    const sr = stage.getBoundingClientRect(); if (Math.abs(sr.width - W) > 0.5 || Math.abs(sr.height - H) > 0.5) resize();
    if (!paused && !headless && $("menu").hidden) update(dt);
    draw(); requestAnimationFrame(loop);
  }
  resize(); newGame(); requestAnimationFrame(loop);

  window.__ut = { get G() { return G; }, update, newGame, keys, setHeadless: (h) => { headless = h; }, setCFG: (c) => { CFG = Object.assign(CFG, c); }, clearBest: () => { best = {}; } };
})();
