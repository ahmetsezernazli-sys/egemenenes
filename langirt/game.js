/* Langırt — iki kişilik masa futbolu */
(() => {
  "use strict";
  const $ = (id) => document.getElementById(id);
  const cv = $("cv"), ctx = cv.getContext("2d"), stage = $("stage");
  const SAVE_KEY = "langirt";
  const VW = 1000, VH = 600, X0 = 30, X1 = 970, Y0 = 30, Y1 = 570, GT = 215, GB = 385, BR = 11;
  const COL = ["#3D8BFD", "#E5484D"], DARK = ["#1F5FC4", "#A92F25"];
  // çubuklar: x, takım, adam sayısı
  const RODS = [[80, 0, 1], [200, 0, 2], [330, 1, 3], [460, 0, 4], [540, 1, 4], [670, 0, 3], [800, 1, 2], [920, 1, 1]];
  const SP = { 1: 0, 2: 220, 3: 165, 4: 118 };

  /* ---------- ses ---------- */
  let AC = null, headless = false;
  function audio() { try { AC = AC || new (window.AudioContext || window.webkitAudioContext)(); if (AC.state === "suspended") AC.resume(); } catch (e) {} }
  function tone(f, d = 0.1, type = "triangle", vol = 0.06, delay = 0) {
    if (!AC || headless) return;
    const t = AC.currentTime + delay, o = AC.createOscillator(), g = AC.createGain();
    o.type = type; o.frequency.setValueAtTime(f, t);
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + 0.01); g.gain.exponentialRampToValueAtTime(0.0001, t + d);
    o.connect(g).connect(AC.destination); o.start(t); o.stop(t + d + 0.02);
  }
  const SND = { hit: () => tone(300, 0.04, "square", 0.04), kick: () => tone(180, 0.08, "square", 0.07), wall: () => tone(120, 0.03, "sine", 0.03), goal: () => [523, 659, 784, 1046, 784, 1046].forEach((f, i) => tone(f, 0.14, "triangle", 0.08, i * 0.09)), win: () => [523, 659, 784, 1046].forEach((f, i) => tone(f, 0.25, "triangle", 0.08, i * 0.15)) };

  /* ---------- durum ---------- */
  let CFG = { mode: "2p", ai: 0, goals: 5, names: ["Enes", "Egemen"], help: [false, true] };
  try { const s = JSON.parse(localStorage.getItem(SAVE_KEY) || "null"); if (s && s.cfg) CFG = Object.assign(CFG, s.cfg); } catch (e) {}
  const store = () => { try { localStorage.setItem(SAVE_KEY, JSON.stringify({ cfg: CFG })); } catch (e) {} };
  let G = null;
  const keys = [[false, false, false], [false, false, false]], touch = [null, null];
  const manR = (team) => CFG.help[team] && !(CFG.mode === "ai" && team === 1) ? 26 : 19;

  function newGame() {
    G = { score: [0, 0], u: [0, 0], kick: [0, 0], ball: null, pause: 1.5, msg: "Hazır!", over: false, still: 0, t: 0, ai: { tu: 0, kt: 0 } };
    serve(Math.random() < 0.5 ? 0 : 1);
    renderHud();
  }
  function serve(toward) {
    const a = (Math.random() - 0.5) * 0.8;
    G.ball = { x: VW / 2, y: VH / 2 + (Math.random() - 0.5) * 120, vx: (toward ? 1 : -1) * 4 * Math.cos(a), vy: 4 * Math.sin(a) };
  }
  function rodMen(rod) { // [ {x,y,r} ]
    const [x, team, n] = rod, sp = SP[n], u = G.u[team], r = manR(team);
    const span = (n - 1) * sp, maxOff = n === 1 ? 105 : (Y1 - Y0 - 2 * r - span) / 2 - 4;
    const cy = VH / 2 + u * maxOff, out = [];
    for (let k = 0; k < n; k++) out.push({ x, y: cy - span / 2 + k * sp, r, team });
    return out;
  }
  function allMen() { const o = []; for (const rod of RODS) o.push(...rodMen(rod)); return o; }

  function update(dt) {
    if (!G || G.over) return;
    G.t += dt;
    for (const t of [0, 1]) G.kick[t] = Math.max(0, G.kick[t] - dt);
    // kontroller
    for (const t of [0, 1]) {
      if (CFG.mode === "ai" && t === 1) continue;
      if (touch[t] != null) G.u[t] += Math.max(-dt * 6, Math.min(dt * 6, touch[t] - G.u[t]));
      else { const d = (keys[t][1] ? 1 : 0) - (keys[t][0] ? 1 : 0); G.u[t] += d * dt * 2.6; }
      G.u[t] = Math.max(-1, Math.min(1, G.u[t]));
    }
    if (CFG.mode === "ai") aiThink(dt);
    if (G.pause > 0) { G.pause -= dt; if (G.pause <= 0) G.msg = ""; return; }
    const b = G.ball, men = allMen();
    const steps = 4;
    for (let s = 0; s < steps; s++) {
      b.x += b.vx / steps * dt * 60; b.y += b.vy / steps * dt * 60;
      if (b.y < Y0 + BR) { b.y = Y0 + BR; b.vy = Math.abs(b.vy) * 0.9; SND.wall(); }
      if (b.y > Y1 - BR) { b.y = Y1 - BR; b.vy = -Math.abs(b.vy) * 0.9; SND.wall(); }
      const inMouth = b.y > GT && b.y < GB;
      if (b.x < X0 + BR && !inMouth) { b.x = X0 + BR; b.vx = Math.abs(b.vx) * 0.9; SND.wall(); }
      if (b.x > X1 - BR && !inMouth) { b.x = X1 - BR; b.vx = -Math.abs(b.vx) * 0.9; SND.wall(); }
      if (b.x < X0 - 6) return goal(1);
      if (b.x > X1 + 6) return goal(0);
      for (const m of men) {
        if (m.team === 0 ? b.vx > 6 : b.vx < -6) continue; // hızlı giden top kendi takımının içinden geçer
        const dx = b.x - m.x, dy = b.y - m.y, d = Math.hypot(dx, dy), md = m.r + BR;
        if (d < md && d > 0.001) {
          const nx = dx / d, ny = dy / d; b.x = m.x + nx * md; b.y = m.y + ny * md;
          const dir = m.team === 0 ? 1 : -1;
          if (G.kick[m.team] > 0) {
            const sp = 15 + Math.random() * 2;
            b.vx = dir * sp; b.vy = ny * 6 + (Math.random() - 0.5) * 3; G.kick[m.team] = 0; SND.kick();
          } else {
            const vn = b.vx * nx + b.vy * ny;
            if (vn < 0) { b.vx -= 1.8 * vn * nx; b.vy -= 1.8 * vn * ny; SND.hit(); }
            if (Math.abs(b.vx) < 1.5) b.vx += dir * 1.2; // top adamda takılmasın
          }
        }
      }
    }
    b.vx *= Math.pow(0.992, dt * 60); b.vy *= Math.pow(0.992, dt * 60);
    const spd = Math.hypot(b.vx, b.vy); if (spd > 19) { b.vx *= 19 / spd; b.vy *= 19 / spd; }
    if (spd < 0.6) { G.still += dt; if (G.still > 2) { G.still = 0; const a = Math.random() * Math.PI * 2; b.vx = Math.cos(a) * 5; b.vy = Math.sin(a) * 5; } } else G.still = 0;
  }
  function goal(t) {
    G.score[t]++; SND.goal(); renderHud();
    if (G.score[t] >= CFG.goals) return finish(t);
    G.msg = `GOL! ${CFG.names[t]}`; G.pause = 1.6; serve(1 - t); // yiyen tarafa doğru başlar
  }
  function finish(t) {
    G.over = true; G.msg = `${CFG.names[t]} kazandı!`;
    $("end-icon").textContent = "🏆"; $("end-title").textContent = `${CFG.names[t]} kazandı!`;
    $("end-text").textContent = `${CFG.names[0]} ${G.score[0]} – ${G.score[1]} ${CFG.names[1]}`;
    if (headless) return;
    SND.win(); setTimeout(() => { $("end").hidden = false; $("end-next").focus(); }, 900);
  }
  function aiThink(dt) {
    const A = G.ai, b = G.ball, hard = CFG.ai === 1;
    A.kt -= dt;
    if (A.kt <= 0) {
      A.kt = hard ? 0.05 : 0.14;
      // topa en yakın kırmızı çubuğu (top ile kendi kalesi arasındakileri tercih ederek) topun y'sine getir
      let best = null, bd = Infinity;
      for (const rod of RODS) {
        if (rod[1] !== 1) continue;
        const dx = rod[0] - b.x, d = Math.abs(dx) + (dx < -20 ? 150 : 0);
        if (d < bd) { bd = d; best = rod; }
      }
      const [x, team, n] = best, sp = SP[n], r = manR(1), span = (n - 1) * sp, maxOff = n === 1 ? 105 : (Y1 - Y0 - 2 * r - span) / 2 - 4;
      const ty = b.y + b.vy * (hard ? Math.abs((x - b.x) / (b.vx || 1)) * 0.6 : 0) + (hard ? 0 : (Math.random() - 0.5) * 40);
      let bu = 0, be = Infinity;
      for (let k = 0; k < n; k++) { const u = (ty - (VH / 2 - span / 2 + k * sp)) / maxOff; if (Math.abs(u) <= 1.05 && Math.abs(u - G.u[1]) < be) { be = Math.abs(u - G.u[1]); bu = u; } }
      A.tu = Math.max(-1, Math.min(1, bu));
      // şut
      const near = allMen().some(m => m.team === 1 && Math.hypot(b.x - m.x, b.y - m.y) < m.r + BR + (hard ? 18 : 10) && b.x <= m.x + 6);
      if (near && (hard || Math.random() < 0.7)) kick(1);
    }
    const spd = hard ? 3.2 : 2.1;
    G.u[1] += Math.max(-dt * spd, Math.min(dt * spd, A.tu - G.u[1]));
  }
  function kick(t) { if (!G || G.over) return; if (G.kick[t] <= 0) G.kick[t] = 0.22; }

  /* ---------- çizim ---------- */
  let W = 0, H = 0, dpr = 1, sc = 1, ox = 0, oy = 0;
  function resize() {
    const r = stage.getBoundingClientRect(); dpr = Math.min(2, window.devicePixelRatio || 1);
    W = r.width; H = r.height; cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr);
    sc = Math.min(W / VW, H / VH); ox = (W - VW * sc) / 2; oy = (H - VH * sc) / 2;
  }
  function draw() {
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.clearRect(0, 0, W, H);
    ctx.save(); ctx.translate(ox, oy); ctx.scale(sc, sc);
    // masa
    ctx.fillStyle = "#6B4423"; ctx.beginPath(); ctx.roundRect(0, 0, VW, VH, 26); ctx.fill();
    ctx.fillStyle = "#2E8B4E"; ctx.fillRect(X0, Y0, X1 - X0, Y1 - Y0);
    ctx.fillStyle = "rgba(255,255,255,.05)"; for (let i = 0; i < 10; i += 2) ctx.fillRect(X0 + i * 94, Y0, 94, Y1 - Y0);
    ctx.strokeStyle = "rgba(255,255,255,.75)"; ctx.lineWidth = 4;
    ctx.strokeRect(X0, Y0, X1 - X0, Y1 - Y0);
    ctx.beginPath(); ctx.moveTo(VW / 2, Y0); ctx.lineTo(VW / 2, Y1); ctx.stroke();
    ctx.beginPath(); ctx.arc(VW / 2, VH / 2, 70, 0, 7); ctx.stroke();
    ctx.strokeRect(X0, VH / 2 - 130, 90, 260); ctx.strokeRect(X1 - 90, VH / 2 - 130, 90, 260);
    // kaleler
    for (const [gx, t] of [[X0 - 22, 0], [X1, 1]]) { ctx.fillStyle = "rgba(255,255,255,.85)"; ctx.fillRect(gx, GT, 22, GB - GT); ctx.fillStyle = COL[t]; ctx.globalAlpha = 0.35; ctx.fillRect(gx, GT, 22, GB - GT); ctx.globalAlpha = 1; }
    if (!G) { ctx.restore(); return; }
    // çubuklar ve adamlar
    for (const rod of RODS) {
      const [x, team] = rod;
      ctx.fillStyle = "#C9CED6"; ctx.fillRect(x - 4, 0, 8, VH);
      ctx.fillStyle = "#8A919C"; ctx.fillRect(x - 4, 0, 3, VH);
      for (const m of rodMen(rod)) {
        const k = G.kick[team] > 0 ? (team === 0 ? 1 : -1) * 10 : 0;
        ctx.fillStyle = "rgba(0,0,0,.25)"; ctx.beginPath(); ctx.ellipse(m.x + 4, m.y + 5, m.r, m.r * 0.8, 0, 0, 7); ctx.fill();
        ctx.fillStyle = DARK[team]; ctx.beginPath(); ctx.roundRect(m.x - m.r * 0.45 + k, m.y - m.r * 0.35, m.r * 0.9, m.r * 0.7, 4); ctx.fill(); // ayak
        ctx.fillStyle = COL[team]; ctx.beginPath(); ctx.ellipse(m.x, m.y, m.r * 0.72, m.r, 0, 0, 7); ctx.fill();
        ctx.fillStyle = "#FFD7B0"; ctx.beginPath(); ctx.arc(m.x, m.y, m.r * 0.42, 0, 7); ctx.fill();
        ctx.fillStyle = "#4A2E16"; ctx.beginPath(); ctx.arc(m.x, m.y, m.r * 0.42, Math.PI * 0.9, Math.PI * 2.1); ctx.fill();
      }
    }
    // top
    const b = G.ball;
    ctx.fillStyle = "rgba(0,0,0,.25)"; ctx.beginPath(); ctx.arc(b.x + 3, b.y + 4, BR, 0, 7); ctx.fill();
    ctx.fillStyle = "#fff"; ctx.beginPath(); ctx.arc(b.x, b.y, BR, 0, 7); ctx.fill();
    ctx.fillStyle = "#1E2A44"; ctx.beginPath(); ctx.arc(b.x - 2, b.y - 1, 3.5, 0, 7); ctx.fill();
    // adlar
    ctx.font = "800 20px Rubik, sans-serif"; ctx.textBaseline = "top";
    ctx.fillStyle = "#fff"; ctx.textAlign = "left"; ctx.fillText(`${CFG.names[0]}${CFG.help[0] ? " ✨" : ""}`, X0 + 8, Y0 + 6);
    ctx.textAlign = "right"; ctx.fillText(`${CFG.names[1]}${CFG.mode === "ai" ? " 🤖" : CFG.help[1] ? " ✨" : ""}`, X1 - 8, Y0 + 6);
    ctx.textBaseline = "alphabetic";
    if (G.msg) {
      ctx.font = "800 64px Rubik, sans-serif"; ctx.textAlign = "center"; ctx.lineWidth = 8; ctx.strokeStyle = "rgba(20,40,25,.85)"; ctx.fillStyle = "#fff";
      ctx.strokeText(G.msg, VW / 2, VH / 2 - 90); ctx.fillText(G.msg, VW / 2, VH / 2 - 90);
    }
    ctx.restore();
  }
  function renderHud() { for (const i of [0, 1]) { $("n" + i).textContent = CFG.names[i]; $("p" + i).textContent = G ? G.score[i] : 0; } $("round").textContent = `${CFG.goals} gol kazanır`; }

  /* ---------- girdi ---------- */
  const KM = { w: [0, 0], s: [0, 1], d: [0, 2], arrowup: [1, 0], arrowdown: [1, 1], arrowleft: [1, 2] };
  function setKey(e, on) {
    const k = KM[e.key.toLowerCase()]; if (!k || !$("menu").hidden || !$("end").hidden) return;
    let t = k[0]; if (CFG.mode === "ai") t = 0;
    e.preventDefault(); keys[t][k[1]] = on; if (on && k[1] === 2) kick(t);
  }
  document.addEventListener("keydown", (e) => { audio(); if (!e.repeat || KM[e.key.toLowerCase()]?.[1] !== 2) setKey(e, true); });
  document.addEventListener("keyup", (e) => setKey(e, false));
  const owner = new Map();
  function logical(e) { const r = cv.getBoundingClientRect(); return { x: (e.clientX - r.left - ox) / sc, y: (e.clientY - r.top - oy) / sc }; }
  const toU = (y) => Math.max(-1, Math.min(1, (y - VH / 2) / 220));
  cv.addEventListener("pointerdown", (e) => {
    audio(); const q = logical(e); const t = q.x < VW / 2 ? 0 : 1;
    if (CFG.mode === "ai" && t === 1) return;
    owner.set(e.pointerId, { t, y0: q.y, u0: G ? G.u[t] : 0 }); cv.setPointerCapture(e.pointerId); kick(t); e.preventDefault();
  });
  cv.addEventListener("pointermove", (e) => { const o = owner.get(e.pointerId); if (!o) return; const q = logical(e); touch[o.t] = Math.max(-1, Math.min(1, o.u0 + (q.y - o.y0) / 200)); });
  const release = (e) => { const o = owner.get(e.pointerId); if (!o) return; owner.delete(e.pointerId); touch[o.t] = null; };
  cv.addEventListener("pointerup", release); cv.addEventListener("pointercancel", release);

  /* ---------- menü ---------- */
  const form = $("form");
  function syncForm() {
    const ai = form.mode.value === "ai";
    $("f-ai").hidden = !ai;
    if (ai) { if ($("in1").value === "Egemen") $("in1").value = "Bilgisayar"; $("h1").checked = false; $("h1").disabled = true; }
    else { if ($("in1").value === "Bilgisayar") $("in1").value = "Egemen"; $("h1").disabled = false; }
  }
  function fillForm() { form.mode.value = CFG.mode; form.ai.value = String(CFG.ai); form.goals.value = String(CFG.goals); $("in0").value = CFG.names[0]; $("in1").value = CFG.names[1]; $("h0").checked = CFG.help[0]; $("h1").checked = CFG.help[1]; syncForm(); }
  form.addEventListener("change", (e) => { if (e.target.name === "mode") syncForm(); });
  form.addEventListener("submit", (e) => {
    e.preventDefault(); audio();
    const ai = form.mode.value === "ai";
    CFG = { mode: form.mode.value, ai: +form.ai.value, goals: +form.goals.value, names: [$("in0").value.trim() || "Mavi", $("in1").value.trim() || (ai ? "Bilgisayar" : "Kırmızı")], help: [$("h0").checked, ai ? false : $("h1").checked] };
    store(); $("menu").hidden = true; newGame();
  });
  $("menu-btn").addEventListener("click", () => { fillForm(); $("end").hidden = true; $("menu").hidden = false; });
  $("end-next").addEventListener("click", () => { $("end").hidden = true; newGame(); });
  $("end-menu").addEventListener("click", () => { fillForm(); $("end").hidden = true; $("menu").hidden = false; });
  fillForm();

  if (!CanvasRenderingContext2D.prototype.roundRect) {
    CanvasRenderingContext2D.prototype.roundRect = function (x, y, w, h, r) { r = Math.min(r, w / 2, h / 2); this.moveTo(x + r, y); this.arcTo(x + w, y, x + w, y + h, r); this.arcTo(x + w, y + h, x, y + h, r); this.arcTo(x, y + h, x, y, r); this.arcTo(x, y, x + w, y, r); this.closePath(); };
  }
  let last = performance.now();
  function loop(now) {
    const dt = Math.min(0.05, (now - last) / 1000); last = now;
    const r = stage.getBoundingClientRect(); if (Math.abs(r.width - W) > 0.5 || Math.abs(r.height - H) > 0.5) resize();
    if ($("menu").hidden && $("end").hidden && !headless) update(dt);
    draw(); requestAnimationFrame(loop);
  }
  resize(); newGame();
  requestAnimationFrame(loop);

  window.__lg = { get G() { return G; }, update, newGame, kick, setHeadless: (h) => { headless = h; }, setCFG: (c) => { CFG = Object.assign(CFG, c); }, keys, touch, allMen };
})();
