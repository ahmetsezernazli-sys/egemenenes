/* Yumurta Kapmaca — iki kişilik yumurta yakalama oyunu */
(() => {
  "use strict";
  const $ = (id) => document.getElementById(id);
  const cv = $("cv"), ctx = cv.getContext("2d"), stage = $("stage");
  const SAVE_KEY = "yumurta";
  const VW = 1000, VH = 600, HALF = 500, BY = 540, HENS = [95, 250, 405];
  const COL = ["#3D8BFD", "#E5484D"];

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
  const SND = {
    egg: (i) => tone(i ? 700 : 600, 0.08, "triangle", 0.06),
    gold: () => [880, 1175, 1568].forEach((f, k) => tone(f, 0.1, "square", 0.04, k * 0.06)),
    rock: () => tone(110, 0.25, "sawtooth", 0.06),
    chick: () => [660, 990].forEach((f, k) => tone(f, 0.08, "sine", 0.06, k * 0.08)),
    splat: () => tone(180, 0.06, "sine", 0.03),
    beep: (h) => tone(h ? 880 : 520, 0.15, "square", 0.05),
    win: () => [523, 659, 784, 1046].forEach((f, k) => tone(f, 0.2, "triangle", 0.07, k * 0.13))
  };

  /* ---------- durum ---------- */
  let CFG = { mode: "2p", ai: 0, team: 0, len: 60, names: ["Enes", "Egemen"], help: [false, true] };
  let REC = 0;
  try { const s = JSON.parse(localStorage.getItem(SAVE_KEY) || "null"); if (s) { if (s.cfg) CFG = Object.assign(CFG, s.cfg); REC = s.rec || 0; } } catch (e) {}
  const store = () => { try { localStorage.setItem(SAVE_KEY, JSON.stringify({ cfg: CFG, rec: REC })); } catch (e) {} };
  let G = null;
  const keys = [[false, false], [false, false]], ptr = [null, null];

  function newGame() {
    G = {
      t: -3, len: CFG.len, next: 0.4, items: [], splats: [], pops: [], over: false, beeped: 3,
      pl: [0, 1].map((i) => ({ i, x: 250, pts: 0, big: 0, stun: 0, eggs: 0, golds: 0, ai: CFG.mode === "ai" && i === 1, aiT: 0, aiX: 250, lay: [0, 0, 0] }))
    };
    renderHud();
  }
  const prog = () => Math.max(0, Math.min(1, G.t / G.len));
  const bw = (p) => (CFG.help[p.i] && !p.ai ? 140 : 92) * (p.big > 0 ? 1.6 : 1);
  function spawn() {
    const r = Math.random(), late = G.t > 5;
    const kind = r < 0.08 ? "gold" : late && r < 0.21 ? "rock" : r < 0.25 ? "chick" : "egg";
    const h = Math.floor(Math.random() * 3), x = HENS[h] + (Math.random() - 0.5) * 50;
    // iki yarıya da aynı nesne düşer (adil)
    for (const p of G.pl) { G.items.push({ p: p.i, x, y: 108, vy: 40 + Math.random() * 30, kind, h }); p.lay[h] = 0.35; }
  }
  function update(dt) {
    if (!G || G.over) return;
    G.t += dt;
    if (G.t < 0) { const c = Math.ceil(-G.t); if (c < G.beeped) { G.beeped = c; SND.beep(false); } return; }
    if (G.beeped > 0) { G.beeped = 0; SND.beep(true); }
    const P = prog();
    G.next -= dt;
    if (G.next <= 0) { spawn(); G.next = 1.15 - P * 0.6 + Math.random() * 0.25; }
    const grav = 300 + P * 260;
    for (const p of G.pl) {
      for (let h = 0; h < 3; h++) p.lay[h] = Math.max(0, p.lay[h] - dt);
      p.big = Math.max(0, p.big - dt); p.stun = Math.max(0, p.stun - dt);
      const w = bw(p), lo = w / 2 + 4, hi = HALF - w / 2 - 4;
      let tx = null, sp = 560;
      if (p.ai) {
        p.aiT -= dt;
        if (p.aiT <= 0) {
          p.aiT = CFG.ai ? 0.1 : 0.42;
          // en yakında yere inecek iyi nesneyi hedefle, taştan kaç
          const mine = G.items.filter((o) => o.p === 1 && o.y < BY && o.kind !== "rock");
          mine.sort((a, b) => (BY - a.y) / (a.vy + 1) - (BY - b.y) / (b.vy + 1));
          const tgt = mine[0];
          if (tgt && (CFG.ai || Math.random() > 0.35)) p.aiX = tgt.x + (CFG.ai ? 0 : (Math.random() - 0.5) * 100);
          const rock = G.items.find((o) => o.p === 1 && o.kind === "rock" && o.y > 330 && o.y < BY && Math.abs(o.x - p.aiX) < w / 2 + 14);
          if (rock && CFG.ai) p.aiX = rock.x + (rock.x > 250 ? -1 : 1) * (w / 2 + 40);
        }
        tx = p.aiX; sp = CFG.ai ? 560 : 230;
      } else if (ptr[p.i] != null) { tx = ptr[p.i]; sp = 1600; }
      else { const d = (keys[p.i][1] ? 1 : 0) - (keys[p.i][0] ? 1 : 0); if (d) tx = p.x + d * 999; }
      if (tx != null && p.stun <= 0) { const d = tx - p.x; p.x += Math.sign(d) * Math.min(Math.abs(d), sp * dt); }
      p.x = Math.max(lo, Math.min(hi, p.x));
    }
    for (const o of G.items) {
      o.vy += grav * dt; o.y += o.vy * dt;
      const p = G.pl[o.p];
      if (!o.done && o.y >= BY - 14 && o.y <= BY + 16 && Math.abs(o.x - p.x) < bw(p) / 2 + 8) {
        o.done = true; catchIt(p, o);
      } else if (!o.done && o.y > VH - 30) {
        o.done = true; if (o.kind === "egg" || o.kind === "gold") { G.splats.push({ p: o.p, x: o.x, t: 1.2, gold: o.kind === "gold" }); SND.splat(); }
      }
    }
    G.items = G.items.filter((o) => !o.done);
    for (const s of G.splats) s.t -= dt; G.splats = G.splats.filter((s) => s.t > 0);
    for (const s of G.pops) { s.t -= dt; s.y -= 40 * dt; } G.pops = G.pops.filter((s) => s.t > 0);
    if (G.t >= G.len) finish();
    renderHud();
  }
  function catchIt(p, o) {
    let txt = "";
    if (o.kind === "egg") { p.pts += 1; p.eggs++; SND.egg(p.i); txt = "+1"; }
    else if (o.kind === "gold") { p.pts += 5; p.golds++; SND.gold(); txt = "+5"; }
    else if (o.kind === "rock") { const lost = Math.min(2, p.pts); p.pts -= lost; p.stun = 0.6; SND.rock(); txt = lost ? `-${lost}` : "Ah!"; }
    else { p.big = 6; SND.chick(); txt = "Büyük sepet!"; }
    G.pops.push({ p: p.i, x: o.x, y: BY - 40, t: 0.9, s: txt, bad: o.kind === "rock" });
  }
  function finish() {
    G.over = true; G.items = [];
    const [a, b] = G.pl.map((p) => p.pts);
    let title, text, icon = "🏆";
    if (CFG.team) {
      const sum = a + b, newRec = sum > REC;
      if (newRec) { REC = sum; store(); }
      title = newRec ? `Takım rekoru: ${sum} puan!` : `Takım: ${sum} puan`;
      text = `${CFG.names[0]} ${a} + ${CFG.names[1]} ${b}. ${newRec ? "Harika iş birliği!" : `Rekor ${REC}. Bir daha deneyelim!`}`;
      icon = "🧺";
    } else if (a === b) { title = "Berabere!"; text = `İkiniz de ${a} puan topladınız.`; icon = "🤝"; }
    else { const w = a > b ? 0 : 1; title = `${CFG.names[w]} kazandı!`; text = `${CFG.names[0]} ${a} – ${b} ${CFG.names[1]}`; }
    const gold = G.pl.map((p) => p.golds);
    if (gold[0] + gold[1]) text += ` · Altın yumurta: ${gold[0]} / ${gold[1]}`;
    $("end-icon").textContent = icon; $("end-title").textContent = title; $("end-text").textContent = text;
    if (headless) return;
    SND.win();
    setTimeout(() => { $("end").hidden = false; $("end-next").focus(); }, 700);
  }

  /* ---------- çizim ---------- */
  let W = 0, H = 0, dpr = 1, sc = 1, ox = 0, oy = 0;
  function resize() {
    const r = stage.getBoundingClientRect(); dpr = Math.min(2, window.devicePixelRatio || 1);
    W = r.width; H = r.height; cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr);
    sc = Math.min(W / VW, H / VH); ox = (W - VW * sc) / 2; oy = (H - VH * sc) / 2;
  }
  function hen(x, y, lay, t) {
    ctx.save(); ctx.translate(x, y + Math.sin(t * 3 + x) * 2 - lay * 14);
    ctx.fillStyle = "#fff"; ctx.beginPath(); ctx.ellipse(0, 0, 30, 22, 0, 0, 7); ctx.fill();
    ctx.beginPath(); ctx.ellipse(22, -16, 13, 13, 0, 0, 7); ctx.fill();
    ctx.fillStyle = "#E5484D"; ctx.beginPath(); ctx.arc(20, -30, 5, 0, 7); ctx.arc(27, -28, 5, 0, 7); ctx.fill();
    ctx.fillStyle = "#FFB020"; ctx.beginPath(); ctx.moveTo(34, -17); ctx.lineTo(44, -13); ctx.lineTo(34, -10); ctx.fill();
    ctx.fillStyle = "#1E2A44"; ctx.beginPath(); ctx.arc(26, -19, 2.5, 0, 7); ctx.fill();
    ctx.fillStyle = "#EDE6DA"; ctx.beginPath(); ctx.ellipse(-8, 2, 16, 10, -0.3, 0, 7); ctx.fill();
    ctx.restore();
  }
  function item(o) {
    ctx.save(); ctx.translate(o.x, o.y);
    if (o.kind === "egg" || o.kind === "gold") {
      ctx.fillStyle = o.kind === "gold" ? "#FFC529" : "#FFF8EA"; ctx.strokeStyle = o.kind === "gold" ? "#C98F00" : "#D9C7A6"; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.ellipse(0, 0, 12, 16, 0, 0, 7); ctx.fill(); ctx.stroke();
      ctx.fillStyle = "rgba(255,255,255,.8)"; ctx.beginPath(); ctx.ellipse(-4, -6, 3, 5, -0.4, 0, 7); ctx.fill();
      if (o.kind === "gold") { ctx.strokeStyle = "rgba(255,230,120,.8)"; ctx.lineWidth = 2; for (let k = 0; k < 4; k++) { const a = k * Math.PI / 2 + G.t * 3; ctx.beginPath(); ctx.moveTo(Math.cos(a) * 20, Math.sin(a) * 22); ctx.lineTo(Math.cos(a) * 26, Math.sin(a) * 28); ctx.stroke(); } }
    } else if (o.kind === "rock") {
      ctx.fillStyle = "#7A7F8C"; ctx.beginPath(); ctx.moveTo(-15, 6); ctx.lineTo(-11, -10); ctx.lineTo(4, -14); ctx.lineTo(15, -3); ctx.lineTo(11, 11); ctx.lineTo(-6, 13); ctx.closePath(); ctx.fill();
      ctx.fillStyle = "#9AA0AE"; ctx.beginPath(); ctx.arc(-3, -5, 4, 0, 7); ctx.fill();
    } else {
      ctx.fillStyle = "#FFD84D"; ctx.beginPath(); ctx.arc(0, 2, 13, 0, 7); ctx.arc(7, -9, 8, 0, 7); ctx.fill();
      ctx.fillStyle = "#FF9F1C"; ctx.beginPath(); ctx.moveTo(14, -9); ctx.lineTo(20, -7); ctx.lineTo(14, -5); ctx.fill();
      ctx.fillStyle = "#1E2A44"; ctx.beginPath(); ctx.arc(9, -11, 1.8, 0, 7); ctx.fill();
    }
    ctx.restore();
  }
  function basket(p) {
    const w = bw(p), x = p.x + (p.stun > 0 ? Math.sin(G.t * 60) * 4 : 0), y = BY;
    ctx.fillStyle = "#B9773A"; ctx.beginPath(); ctx.moveTo(x - w / 2, y - 10); ctx.lineTo(x + w / 2, y - 10); ctx.lineTo(x + w / 2 - 12, y + 30); ctx.lineTo(x - w / 2 + 12, y + 30); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = "#8A5222"; ctx.lineWidth = 3;
    for (let k = 1; k < 3; k++) { ctx.beginPath(); ctx.moveTo(x - w / 2 + k * 4, y - 10 + k * 13); ctx.lineTo(x + w / 2 - k * 4, y - 10 + k * 13); ctx.stroke(); }
    ctx.fillStyle = COL[p.i]; ctx.beginPath(); ctx.roundRect(x - w / 2 - 4, y - 16, w + 8, 9, 4); ctx.fill();
    if (p.big > 0) { ctx.fillStyle = "rgba(255,216,77,.9)"; ctx.font = "800 14px Rubik, sans-serif"; ctx.textAlign = "center"; ctx.fillText(`🐤 ${Math.ceil(p.big)}`, x, y + 52); }
  }
  function draw() {
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.clearRect(0, 0, W, H);
    ctx.save(); ctx.translate(ox, oy); ctx.scale(sc, sc);
    ctx.beginPath(); ctx.roundRect(0, 0, VW, VH, 22); ctx.clip();
    for (const p of (G ? G.pl : [])) {
      ctx.save(); ctx.translate(p.i * HALF, 0);
      const g = ctx.createLinearGradient(0, 0, 0, VH); g.addColorStop(0, p.i ? "#FFE3E0" : "#E0EDFF"); g.addColorStop(1, "#FFF6E0");
      ctx.fillStyle = g; ctx.fillRect(0, 0, HALF, VH);
      // kümes tahtası ve tavuklar
      ctx.fillStyle = "#8A5222"; ctx.fillRect(0, 86, HALF, 14);
      for (let h = 0; h < 3; h++) hen(HENS[h], 72, p.lay[h], G.t);
      // saman zemin
      ctx.fillStyle = "#F2C66D"; ctx.fillRect(0, VH - 40, HALF, 40);
      ctx.strokeStyle = "#D9A441"; ctx.lineWidth = 2;
      for (let k = 0; k < 24; k++) { const sx = (k * 47) % HALF; ctx.beginPath(); ctx.moveTo(sx, VH - 6); ctx.lineTo(sx + 14, VH - 30); ctx.stroke(); }
      for (const s of G.splats) if (s.p === p.i) { ctx.globalAlpha = Math.min(1, s.t * 2); ctx.fillStyle = "#fff"; ctx.beginPath(); ctx.ellipse(s.x, VH - 30, 22, 7, 0, 0, 7); ctx.fill(); ctx.fillStyle = s.gold ? "#FFC529" : "#FFB020"; ctx.beginPath(); ctx.arc(s.x + 2, VH - 31, 6, 0, 7); ctx.fill(); ctx.globalAlpha = 1; }
      for (const o of G.items) if (o.p === p.i) item(o);
      basket(p);
      for (const s of G.pops) if (s.p === p.i) { ctx.globalAlpha = Math.min(1, s.t * 2); ctx.fillStyle = s.bad ? "#B3261E" : "#1E8A41"; ctx.font = "800 24px Rubik, sans-serif"; ctx.textAlign = "center"; ctx.fillText(s.s, s.x, s.y); ctx.globalAlpha = 1; }
      ctx.fillStyle = COL[p.i]; ctx.font = "800 20px Rubik, sans-serif"; ctx.textAlign = p.i ? "right" : "left";
      ctx.fillText(`${CFG.names[p.i]}${CFG.help[p.i] && !p.ai ? " ✨" : ""}${p.ai ? " 🤖" : ""}`, p.i ? HALF - 16 : 16, 30);
      ctx.restore();
    }
    ctx.fillStyle = "#1E2A44"; ctx.fillRect(HALF - 3, 0, 6, VH);
    if (G && G.t < 0) {
      ctx.font = "800 110px Rubik, sans-serif"; ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.lineWidth = 10; ctx.strokeStyle = "rgba(30,42,68,.8)"; ctx.fillStyle = "#fff";
      const s = String(Math.ceil(-G.t)); ctx.strokeText(s, VW / 2, VH / 2); ctx.fillText(s, VW / 2, VH / 2); ctx.textBaseline = "alphabetic";
    }
    ctx.restore();
  }
  function renderHud() {
    for (const i of [0, 1]) { $("n" + i).textContent = CFG.names[i]; $("p" + i).textContent = G ? G.pl[i].pts : 0; }
    $("round").textContent = G ? (G.t < 0 ? "Hazır…" : `${Math.max(0, Math.ceil(G.len - G.t))} sn${CFG.team ? ` · Takım ${G.pl[0].pts + G.pl[1].pts}` : ""}`) : "";
  }

  /* ---------- girdi ---------- */
  const KM = { a: [0, 0], d: [0, 1], arrowleft: [1, 0], arrowright: [1, 1] };
  function setKey(e, on) {
    const k = KM[e.key.toLowerCase()]; if (!k || !$("menu").hidden || !$("end").hidden) return;
    let pi = k[0]; if (CFG.mode === "ai") pi = 0;
    e.preventDefault(); keys[pi][k[1]] = on;
  }
  document.addEventListener("keydown", (e) => { audio(); setKey(e, true); });
  document.addEventListener("keyup", (e) => setKey(e, false));
  const owner = new Map();
  function logical(e) { const r = cv.getBoundingClientRect(); return { x: (e.clientX - r.left - ox) / sc, y: (e.clientY - r.top - oy) / sc }; }
  cv.addEventListener("pointerdown", (e) => {
    audio(); const q = logical(e); let pi = q.x < HALF ? 0 : 1;
    if (CFG.mode === "ai" && pi === 1) return;
    owner.set(e.pointerId, pi); cv.setPointerCapture(e.pointerId); ptr[pi] = q.x - pi * HALF; e.preventDefault();
  });
  cv.addEventListener("pointermove", (e) => { const pi = owner.get(e.pointerId); if (pi == null) return; ptr[pi] = logical(e).x - pi * HALF; });
  const release = (e) => { const pi = owner.get(e.pointerId); if (pi == null) return; owner.delete(e.pointerId); ptr[pi] = null; };
  cv.addEventListener("pointerup", release); cv.addEventListener("pointercancel", release);

  /* ---------- menü ---------- */
  const form = $("form");
  function syncForm() {
    const ai = form.mode.value === "ai";
    $("f-ai").hidden = !ai;
    if (ai) { if ($("in1").value === "Egemen") $("in1").value = "Bilgisayar"; $("h1").checked = false; $("h1").disabled = true; }
    else { if ($("in1").value === "Bilgisayar") $("in1").value = "Egemen"; $("h1").disabled = false; }
  }
  function fillForm() { form.mode.value = CFG.mode; form.ai.value = String(CFG.ai); form.team.value = String(CFG.team); form.len.value = String(CFG.len); $("in0").value = CFG.names[0]; $("in1").value = CFG.names[1]; $("h0").checked = CFG.help[0]; $("h1").checked = CFG.help[1]; syncForm(); }
  form.addEventListener("change", (e) => { if (e.target.name === "mode") syncForm(); });
  form.addEventListener("submit", (e) => {
    e.preventDefault(); audio();
    const ai = form.mode.value === "ai";
    CFG = { mode: form.mode.value, ai: +form.ai.value, team: +form.team.value, len: +form.len.value, names: [$("in0").value.trim() || "Mavi", $("in1").value.trim() || (ai ? "Bilgisayar" : "Kırmızı")], help: [$("h0").checked, ai ? false : $("h1").checked] };
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
    if ($("menu").hidden && !headless) update(dt);
    draw(); requestAnimationFrame(loop);
  }
  resize(); newGame();
  requestAnimationFrame(loop);

  window.__ym = { get G() { return G; }, update, newGame, setHeadless: (h) => { headless = h; }, setCFG: (c) => { CFG = Object.assign(CFG, c); }, keys, ptr };
})();
