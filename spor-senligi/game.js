/* Spor Şenliği — iki kişilik atletizm: koşu, uzun atlama, cirit */
(() => {
  "use strict";
  const $ = (id) => document.getElementById(id);
  const cv = $("cv"), ctx = cv.getContext("2d"), stage = $("stage");
  const SAVE_KEY = "spor-senligi";
  const VW = 1000, LANE = 260, VH = LANE * 2, PPM = 22, PX = 230;
  const EVENTS = [
    { k: "run", ad: "60 metre koşu", tip: "Düğmeye hızlı hızlı bas!" },
    { k: "jump", ad: "Uzun atlama", tip: "Hızlan! Sarı bölgede bas: atlarsın. Çizgiye ne kadar yakın, o kadar iyi!" },
    { k: "jav", ad: "Cirit atma", tip: "Hızlan! Sarı bölgede basılı tut, ok yeşildeyken bırak!" }
  ];
  const BOARD = 40, LINE = 30, COL = ["#3D8BFD", "#E5484D"];

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
  const SND = { step: (i) => tone(i ? 260 : 220, 0.03, "square", 0.025), beep: (h) => tone(h ? 880 : 520, 0.15, "square", 0.05), jump: () => tone(400, 0.25, "sine", 0.06), foul: () => tone(150, 0.4, "sawtooth", 0.06), land: () => tone(120, 0.15, "triangle", 0.08), win: () => [523, 659, 784, 1046].forEach((f, i) => tone(f, 0.2, "triangle", 0.08, i * 0.13)) };

  /* ---------- durum ---------- */
  let CFG = { mode: "2p", ai: 0, names: ["Enes", "Egemen"], help: [false, true] };
  try { const s = JSON.parse(localStorage.getItem(SAVE_KEY) || "null"); if (s && s.cfg) CFG = Object.assign(CFG, s.cfg); } catch (e) {}
  const store = () => { try { localStorage.setItem(SAVE_KEY, JSON.stringify({ cfg: CFG })); } catch (e) {} };
  let M = null, G = null;
  const isCpu = (p) => CFG.mode === "ai" && p === 1;

  function newMatch() { M = { ev: 0, pts: [0, 0], res: [] }; newEvent(); }
  function newEvent() {
    G = { ev: EVENTS[M.ev].k, t: -3, beeped: 3, over: false, endT: 0,
      pl: [0, 1].map(i => ({ i, x: 0, v: 0, phase: "run", res: null, foul: false, holding: false, hs: 0, charging: false, cs: 0, ang: 0, air: null, jav: null, time: 0, ai: { next: 0, plan: 0 } })) };
    renderHud();
  }
  const hold = (p) => G.t - p.hs;
  function press(i) {
    if (!G || G.over || G.t < 0) return;
    const p = G.pl[i];
    if (p.phase !== "run") return;
    const helped = CFG.help[i] && !isCpu(i);
    if (!helped && G.ev === "jump" && p.x >= BOARD - 3) return takeoff(p);
    if (!helped && G.ev === "jav" && p.x >= LINE - 5) { if (!p.charging) { p.charging = true; p.cs = G.t; p.vc = p.v; } p.holding = true; return; }
    p.v = Math.min(11, p.v + (CFG.help[i] && !isCpu(i) ? 1.35 : 0.9)); p.holding = true; p.hs = G.t; SND.step(i);
  }
  function release(i) {
    if (!G) return;
    const p = G.pl[i]; p.holding = false;
    if (p.charging && G.t - p.cs >= 0.3) throwJav(p);
  }
  function takeoff(p) {
    if (p.phase !== "run") return;
    p.phase = "air";
    if (p.x > BOARD) { p.foul = true; p.res = 0; SND.foul(); p.air = { x0: p.x, d: 1.5, t: 0, T: 0.4 }; return; }
    const d = p.v * p.v / 13;
    p.air = { x0: p.x, d, t: 0, T: 0.55 + d / 20 }; SND.jump();
  }
  function throwJav(p) {
    p.charging = false; p.phase = "air";
    if (p.x > LINE) { p.foul = true; p.res = 0; SND.foul(); p.jav = { x0: p.x, d: 0, t: 0, T: 0.6, ang: p.ang }; return; }
    const vt = (p.vc || p.v) * 2.5, th = p.ang * Math.PI / 180, d = vt * vt * Math.sin(2 * th) / 9.8;
    p.jav = { x0: p.x, d, t: 0, T: 0.8 + d / 45, ang: p.ang }; SND.jump();
  }
  function aiStep(p, dt) {
    const A = p.ai, rate = CFG.ai ? 8.6 : 6.2;
    if (p.phase === "run") {
      A.next -= dt;
      const zone = G.ev === "jump" ? p.x >= BOARD - 3 : G.ev === "jav" ? p.x >= LINE - 5 : false;
      if (A.next <= 0 && !p.charging && !zone) { press(p.i); p.holding = false; A.next = 1 / rate * (0.8 + Math.random() * 0.4); }
      if (G.ev === "jump" && p.x >= BOARD - (CFG.ai ? 0.3 : 0.9) - Math.random() * 0.5) takeoff(p);
      if (G.ev === "jav" && !p.charging && p.x >= LINE - 3) { press(p.i); A.plan = CFG.ai ? 43 + Math.random() * 4 : 30 + Math.random() * 30; }
      if (p.charging && (p.ang >= A.plan || p.x >= LINE - 0.1)) throwJav(p);
    }
  }
  function update(dt) {
    if (!G || G.over) return;
    G.t += dt;
    if (G.t < 0) { const c = Math.ceil(-G.t); if (c < G.beeped) { G.beeped = c; SND.beep(false); } return; }
    if (G.beeped > 0) { G.beeped = 0; SND.beep(true); }
    for (const p of G.pl) {
      if (isCpu(p.i)) aiStep(p, dt);
      if (p.phase === "run") {
        p.v = Math.max(0, p.v - p.v * 0.65 * dt); p.x += p.v * dt; p.time += dt;
        const help = CFG.help[p.i] && !isCpu(p.i);
        if (G.ev === "run" && p.x >= 60) { p.phase = "done"; p.res = p.time; tone(700, 0.1); }
        if (G.ev === "jump") {
          if (help && p.x >= BOARD - 0.35) takeoff(p);
          else if (p.x > BOARD + 0.6) { p.phase = "done"; p.foul = true; p.res = 0; SND.foul(); }
        }
        if (G.ev === "jav") {
          if (help && p.x >= LINE - 1.2) { p.vc = p.v; p.ang = 42; throwJav(p); }
          if (p.charging) { const ph = ((G.t - p.cs) / 0.8) % 2; p.ang = 80 * (ph < 1 ? ph : 2 - ph); p.v = Math.max(0, p.v - p.v * 3 * dt); }
          if (p.phase === "run" && p.x > LINE + 1.2) { p.phase = "done"; p.charging = false; p.foul = true; p.res = 0; SND.foul(); }
        }
        if (p.phase === "run" && p.v < 0.05 && G.t > 12 && G.ev !== "run") { p.phase = "done"; p.foul = true; p.res = 0; }
      } else if (p.phase === "air") {
        if (p.air) { p.air.t += dt; if (p.air.t >= p.air.T) { p.phase = "done"; if (!p.foul) { p.res = Math.max(0, Math.round((p.air.x0 + p.air.d - BOARD) * 100) / 100); SND.land(); } p.x = p.air.x0 + p.air.d; } }
        if (p.jav) { p.v = Math.max(0, p.v - p.v * 2 * dt); p.x += p.v * dt; p.jav.t += dt; if (p.jav.t >= p.jav.T) { p.phase = "done"; if (!p.foul) { p.res = Math.max(0, Math.round((p.jav.d - (LINE - p.jav.x0)) * 10) / 10); SND.land(); } } }
      }
    }
    if (G.ev === "run" && G.t > 25) for (const p of G.pl) if (p.phase !== "done") { p.phase = "done"; p.res = 99; }
    if (G.pl.every(p => p.phase === "done")) { G.endT += dt; if (G.endT > 1.2) finishEvent(); }
  }
  function finishEvent() {
    G.over = true;
    const [a, b] = G.pl.map(p => p.res);
    let w;
    if (G.ev === "run") w = a === b ? -1 : a < b ? 0 : 1; else w = a === b ? -1 : a > b ? 0 : 1;
    if (w < 0) { M.pts[0]++; M.pts[1]++; } else M.pts[w] += 2;
    const fmt = (p) => p.foul ? "faul" : G.ev === "run" ? (p.res >= 99 ? "—" : p.res.toFixed(2) + " sn") : p.res.toFixed(G.ev === "jump" ? 2 : 1) + " m";
    M.res.push({ ad: EVENTS[M.ev].ad, a: fmt(G.pl[0]), b: fmt(G.pl[1]), w });
    renderHud();
    const last = M.ev === EVENTS.length - 1;
    const title = w < 0 ? "Berabere!" : `${CFG.names[w]} kazandı!`;
    let text = `${EVENTS[M.ev].ad}: ${CFG.names[0]} ${fmt(G.pl[0])} · ${CFG.names[1]} ${fmt(G.pl[1])}`;
    if (last) {
      const W = M.pts[0] === M.pts[1] ? -1 : M.pts[0] > M.pts[1] ? 0 : 1;
      $("end-icon").textContent = W < 0 ? "🤝" : "🏆";
      $("end-title").textContent = W < 0 ? "Şenlik berabere bitti!" : `Şampiyon: ${CFG.names[W]}!`;
      text = M.res.map(r => `${r.ad}: ${r.a} – ${r.b}`).join(" · ") + ` · Puan ${M.pts[0]} – ${M.pts[1]}`;
      $("end-next").textContent = "Yeni şenlik"; $("end-next").dataset.new = "1";
    } else {
      $("end-icon").textContent = w < 0 ? "🤝" : "🥇"; $("end-title").textContent = title;
      $("end-next").textContent = `Sonraki yarış: ${EVENTS[M.ev + 1].ad}`; delete $("end-next").dataset.new;
    }
    $("end-text").textContent = text;
    if (headless) return;
    if (last) SND.win(); else tone(784, 0.2, "triangle", 0.07);
    setTimeout(() => { $("end").hidden = false; $("end-next").focus(); }, 500);
  }

  /* ---------- çizim ---------- */
  let W = 0, H = 0, dpr = 1, sc = 1, ox = 0, oy = 0;
  function resize() {
    const r = stage.getBoundingClientRect(); dpr = Math.min(2, window.devicePixelRatio || 1);
    W = r.width; H = r.height; cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr);
    sc = Math.min(W / VW, H / VH); ox = (W - VW * sc) / 2; oy = (H - VH * sc) / 2;
  }
  const EMO = '"Segoe UI Emoji","Apple Color Emoji","Noto Color Emoji",sans-serif';
  function runner(x, y, rot, flip, col) {
    ctx.save(); ctx.translate(x, y); ctx.rotate(rot); ctx.scale(-1, 1);
    ctx.font = `84px ${EMO}`; ctx.textAlign = "center"; ctx.textBaseline = "bottom"; ctx.fillText("🏃", 0, 8);
    ctx.restore();
    ctx.fillStyle = col; ctx.beginPath(); ctx.arc(x, y + 8, 6, 0, 7); ctx.fill();
  }
  function lane(p) {
    const top = p.i * LANE, ground = top + LANE - 60;
    let focus = p.x;
    if (p.jav && p.phase !== "run") focus = Math.max(p.x, p.jav.x0 + p.jav.d * Math.min(1, p.jav.t / p.jav.T));
    if (p.air) focus = p.air.x0 + p.air.d * Math.min(1, p.air.t / p.air.T);
    const cam = focus * PPM - PX;
    ctx.save(); ctx.beginPath(); ctx.rect(0, top, VW, LANE); ctx.clip();
    // gökyüzü, seyirci, pist
    const g = ctx.createLinearGradient(0, top, 0, ground); g.addColorStop(0, "#BFE6FF"); g.addColorStop(1, "#E8F6FF");
    ctx.fillStyle = g; ctx.fillRect(0, top, VW, LANE);
    ctx.fillStyle = "#7FA36B"; ctx.fillRect(0, ground - 70, VW, 20);
    for (let k = -2; k < 30; k++) { const sx = k * 40 - (cam * 0.4) % 40; ctx.fillStyle = ["#E5484D", "#FFC529", "#3D8BFD", "#2DB75A"][(k + 100) % 4]; ctx.beginPath(); ctx.arc(sx, ground - 74, 9, 0, 7); ctx.fill(); }
    ctx.fillStyle = "#E8664A"; ctx.fillRect(0, ground - 50, VW, 70);
    ctx.fillStyle = "#6FBF5A"; ctx.fillRect(0, ground + 20, VW, LANE - 80);
    ctx.strokeStyle = "rgba(255,255,255,.7)"; ctx.lineWidth = 2;
    for (let m = 0; m <= 110; m += 10) { const sx = m * PPM - cam; if (sx < -50 || sx > VW + 50) continue; ctx.beginPath(); ctx.moveTo(sx, ground - 50); ctx.lineTo(sx, ground + 20); ctx.stroke(); ctx.fillStyle = "#fff"; ctx.font = "700 14px Rubik, sans-serif"; ctx.textAlign = "center"; ctx.fillText(m + " m", sx, ground + 38); }
    if (G.ev === "run") { const sx = 60 * PPM - cam; ctx.fillStyle = "#fff"; for (let k = 0; k < 7; k++) { ctx.fillStyle = k % 2 ? "#1E2A44" : "#fff"; ctx.fillRect(sx - 6, ground - 50 + k * 10, 12, 10); } }
    if (G.ev === "jump") { const bx = BOARD * PPM - cam; ctx.fillStyle = "rgba(255,209,102,.6)"; ctx.fillRect(bx - 3 * PPM, ground - 50, 3 * PPM, 70); ctx.fillStyle = "#fff"; ctx.fillRect(bx - 4, ground - 50, 8, 70); ctx.fillStyle = "#F2D49B"; ctx.fillRect(bx + 20, ground - 46, 12 * PPM, 62); }
    if (G.ev === "jav") { const lx = LINE * PPM - cam; ctx.fillStyle = "rgba(255,209,102,.6)"; ctx.fillRect(lx - 5 * PPM, ground - 50, 5 * PPM, 70); ctx.fillStyle = "#fff"; ctx.fillRect(lx - 4, ground - 50, 8, 70); }
    // sporcu
    let rx = p.x * PPM - cam, ry = ground, rot = 0;
    if (p.air) { const k = Math.min(1, p.air.t / p.air.T); rx = (p.air.x0 + p.air.d * k) * PPM - cam; ry = ground - Math.sin(k * Math.PI) * (40 + p.air.d * 6); rot = -0.3 + k * 0.6; }
    const bob = p.phase === "run" && p.v > 0.5 ? Math.abs(Math.sin(G.t * p.v * 1.6)) * 4 : 0;
    runner(rx, ry - bob, rot, true, COL[p.i]);
    // cirit
    if (G.ev === "jav") {
      if (p.phase === "run") { const a = (p.charging ? p.ang : 15) * Math.PI / 180; ctx.strokeStyle = "#8A5A2B"; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(rx - Math.cos(a) * 40, ry - 50 + Math.sin(a) * 40); ctx.lineTo(rx + Math.cos(a) * 40, ry - 50 - Math.sin(a) * 40); ctx.stroke(); }
      if (p.jav) {
        const k = Math.min(1, p.jav.t / p.jav.T), d = p.jav.d, jx = (p.jav.x0 + d * k) * PPM - cam, h = Math.sin(k * Math.PI) * d * PPM * Math.tan(p.jav.ang * Math.PI / 180) / 4;
        const jy = ground - 50 - h, sl = Math.cos(k * Math.PI) * p.jav.ang * Math.PI / 180;
        ctx.strokeStyle = "#8A5A2B"; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(jx - Math.cos(sl) * 40, jy + Math.sin(sl) * 40); ctx.lineTo(jx + Math.cos(sl) * 40, jy - Math.sin(sl) * 40); ctx.stroke();
      }
      if (p.charging) { // açı göstergesi
        ctx.save(); ctx.translate(rx + 60, ry - 110); ctx.strokeStyle = "rgba(30,42,68,.3)"; ctx.lineWidth = 10; ctx.beginPath(); ctx.arc(0, 0, 40, -Math.PI / 2, 0); ctx.stroke();
        ctx.strokeStyle = "#2DB75A"; ctx.beginPath(); ctx.arc(0, 0, 40, -50 * Math.PI / 180, -38 * Math.PI / 180); ctx.stroke();
        const a = p.ang * Math.PI / 180; ctx.strokeStyle = "#1E2A44"; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(Math.cos(a) * 46, -Math.sin(a) * 46); ctx.stroke(); ctx.restore();
      }
    }
    // hız çubuğu ve ad
    ctx.fillStyle = "rgba(255,255,255,.85)"; ctx.fillRect(16, top + 14, 200, 30);
    ctx.fillStyle = COL[p.i]; ctx.font = "800 18px Rubik, sans-serif"; ctx.textAlign = "left"; ctx.textBaseline = "middle";
    ctx.fillText(`${CFG.names[p.i]}${CFG.help[p.i] && !isCpu(p.i) ? " ✨" : ""}${isCpu(p.i) ? " 🤖" : ""}`, 24, top + 29);
    ctx.fillStyle = "rgba(30,42,68,.15)"; ctx.fillRect(230, top + 20, 160, 16);
    ctx.fillStyle = p.v > 9 ? "#2DB75A" : "#FFC529"; ctx.fillRect(230, top + 20, 160 * Math.min(1, p.v / 11), 16);
    if (p.phase === "done") {
      ctx.fillStyle = p.foul ? "#B3261E" : "#1E2A44"; ctx.font = "800 30px Rubik, sans-serif"; ctx.textAlign = "right";
      ctx.fillText(p.foul ? "FAUL!" : G.ev === "run" ? `${p.res.toFixed(2)} sn` : `${p.res.toFixed(G.ev === "jump" ? 2 : 1)} m`, VW - 20, top + 32);
    }
    ctx.textBaseline = "alphabetic";
    ctx.restore();
  }
  function draw() {
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.clearRect(0, 0, W, H);
    if (!G) return;
    ctx.save(); ctx.translate(ox, oy); ctx.scale(sc, sc);
    ctx.beginPath(); ctx.roundRect(0, 0, VW, VH, 18); ctx.clip();
    for (const p of G.pl) lane(p);
    ctx.fillStyle = "#1E2A44"; ctx.fillRect(0, LANE - 2, VW, 4);
    if (G.t < 0) {
      ctx.font = "800 90px Rubik, sans-serif"; ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.lineWidth = 8; ctx.strokeStyle = "rgba(30,42,68,.85)"; ctx.fillStyle = "#fff";
      const s = String(Math.ceil(-G.t)); ctx.strokeText(s, VW / 2, VH / 2); ctx.fillText(s, VW / 2, VH / 2);
      ctx.font = "800 28px Rubik, sans-serif"; ctx.lineWidth = 6; const tip = EVENTS[M.ev].tip; ctx.strokeText(tip, VW / 2, VH / 2 + 70); ctx.fillText(tip, VW / 2, VH / 2 + 70);
      ctx.textBaseline = "alphabetic";
    }
    ctx.restore();
  }
  function renderHud() {
    for (const i of [0, 1]) { $("n" + i).textContent = CFG.names[i]; $("p" + i).textContent = M ? M.pts[i] : 0; }
    $("round").textContent = M ? `${M.ev + 1}. yarış: ${EVENTS[M.ev].ad}` : "";
    $("pad1").hidden = CFG.mode === "ai";
  }

  /* ---------- girdi ---------- */
  const KM = { s: 0, arrowdown: 1 };
  const kd = [false, false];
  document.addEventListener("keydown", (e) => {
    const k = KM[e.key.toLowerCase()]; if (k === undefined || !$("menu").hidden || !$("end").hidden) return;
    const i = CFG.mode === "ai" ? 0 : k; e.preventDefault(); audio();
    if (!e.repeat && !kd[i]) { kd[i] = true; press(i); }
  });
  document.addEventListener("keyup", (e) => { const k = KM[e.key.toLowerCase()]; if (k === undefined) return; const i = CFG.mode === "ai" ? 0 : k; kd[i] = false; release(i); });
  document.querySelectorAll(".pad button").forEach(btn => {
    const i = +btn.dataset.p;
    btn.addEventListener("pointerdown", (e) => { e.preventDefault(); audio(); btn.setPointerCapture(e.pointerId); btn.classList.add("on"); press(i); });
    const off = () => { btn.classList.remove("on"); release(i); };
    btn.addEventListener("pointerup", off); btn.addEventListener("pointercancel", off);
  });

  /* ---------- menü ---------- */
  const form = $("form");
  function syncForm() { $("f-ai").hidden = form.mode.value !== "ai"; if (form.mode.value === "ai") { if ($("in1").value === "Egemen") $("in1").value = "Bilgisayar"; $("h1").checked = false; } else if ($("in1").value === "Bilgisayar") $("in1").value = "Egemen"; }
  function fillForm() { form.mode.value = CFG.mode; form.ai.value = String(CFG.ai); $("in0").value = CFG.names[0]; $("in1").value = CFG.names[1]; $("h0").checked = CFG.help[0]; $("h1").checked = CFG.help[1]; syncForm(); }
  form.addEventListener("change", (e) => { if (e.target.name === "mode") syncForm(); });
  form.addEventListener("submit", (e) => {
    e.preventDefault(); audio();
    const ai = form.mode.value === "ai";
    CFG = { mode: form.mode.value, ai: +form.ai.value, names: [$("in0").value.trim() || "Mavi", $("in1").value.trim() || (ai ? "Bilgisayar" : "Kırmızı")], help: [$("h0").checked, ai ? false : $("h1").checked] };
    store(); $("menu").hidden = true; newMatch();
  });
  $("menu-btn").addEventListener("click", () => { fillForm(); $("end").hidden = true; $("menu").hidden = false; });
  $("end-next").addEventListener("click", () => { $("end").hidden = true; if ($("end-next").dataset.new) newMatch(); else { M.ev++; newEvent(); } });
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
  resize(); M = { ev: 0, pts: [0, 0], res: [] }; newEvent(); G.t = -3;
  requestAnimationFrame(loop);

  window.__ss = { get G() { return G; }, get M() { return M; }, update, newMatch, newEvent, press, release, setHeadless: (h) => { headless = h; }, setCFG: (c) => { CFG = Object.assign(CFG, c); } };
})();
