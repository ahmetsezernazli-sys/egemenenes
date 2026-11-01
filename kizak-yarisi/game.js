/* Kızak Yarışı — iki kişilik penguen kızak yarışı */
(() => {
  "use strict";
  const $ = (id) => document.getElementById(id);
  const cv = $("cv"), ctx = cv.getContext("2d"), stage = $("stage");
  const SAVE_KEY = "kizak-yarisi";
  const VW = 1000, LANE = 260, VH = LANE * 2, FINISH = 9000, PX = 160;   // penguenin ekrandaki x'i
  const BASE = 300, BOOST = 140, SLOW = 0.45, GRAV = 2400, JUMP = 820;

  /* ---------- ses ---------- */
  let AC = null, headless = false;
  function audio() { try { AC = AC || new (window.AudioContext || window.webkitAudioContext)(); if (AC.state === "suspended") AC.resume(); } catch (e) {} }
  function tone(f, d = 0.1, type = "triangle", vol = 0.06, slide = 0) {
    if (!AC || headless) return;
    const t = AC.currentTime, o = AC.createOscillator(), g = AC.createGain();
    o.type = type; o.frequency.setValueAtTime(f, t); if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(30, f + slide), t + d);
    g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + d);
    o.connect(g).connect(AC.destination); o.start(t); o.stop(t + d + 0.02);
  }
  const SND = { jump: (i) => tone(i ? 520 : 440, 0.14, "sine", 0.06, 300), hit: () => tone(140, 0.25, "sawtooth", 0.06, -60), fish: () => { tone(880, 0.07, "square", 0.04); setTimeout(() => tone(1320, 0.09, "square", 0.04), 60); }, beep: (h) => tone(h ? 880 : 520, 0.15, "square", 0.05), win: () => [523, 659, 784, 1046].forEach((f, i) => setTimeout(() => tone(f, 0.2), i * 130)) };

  /* ---------- durum ---------- */
  let CFG = { mode: "2p", ai: 0, win: 2, names: ["Enes", "Egemen"], help: [false, true] };
  try { const s = JSON.parse(localStorage.getItem(SAVE_KEY) || "null"); if (s && s.cfg) CFG = Object.assign(CFG, s.cfg); } catch (e) {}
  const store = () => { try { localStorage.setItem(SAVE_KEY, JSON.stringify({ cfg: CFG })); } catch (e) {} };
  let G = null, M = null;
  const keys = [false, false];

  function makeTrack() {
    // iki şeridin engel düzeni aynı olsun (adil yarış)
    const rocks = [], fish = [];
    let x = 900;
    while (x < FINISH - 400) {
      rocks.push({ x, w: 46 + Math.random() * 30 });
      if (Math.random() < 0.5) fish.push({ x: x + 180 + Math.random() * 120, y: 70 + Math.random() * 60 });
      x += 420 + Math.random() * 380;
    }
    return { rocks, fish };
  }
  function newMatch() { M = { pts: [0, 0], race: 0 }; newRace(); }
  function newRace() {
    M.race++;
    const tr = makeTrack();
    G = { over: false, count: 3, cT: 0.9, msg: "3", t: 0, flakes: Array.from({ length: 50 }, () => ({ x: Math.random() * VW, y: Math.random() * VH, s: 1 + Math.random() * 2 })),
      pl: [0, 1].map(i => ({ i, x: 0, y: 0, vy: 0, slow: 0, boost: 0, rocks: tr.rocks.map(r => ({ ...r, hit: false, lucky: Math.random() < (CFG.mode === "ai" && i === 1 ? (CFG.ai ? 0.95 : 0.7) : 0.8) })), fish: tr.fish.map(f => ({ ...f, got: false })), help: CFG.help[i], ai: CFG.mode === "ai" && i === 1 ? { lvl: CFG.ai } : null, hits: 0 })) };
    keys[0] = keys[1] = false;
    renderHud(); SND.beep(false);
  }
  function jump(p) { if (p.y === 0 && !G.over && G.count <= 0) { p.vy = JUMP; SND.jump(p.i); } }

  function update(dt) {
    if (!G || G.over) return;
    G.t += dt;
    if (G.count > 0) {
      G.cT -= dt;
      if (G.cT <= 0) { G.count--; G.cT = 0.9; G.msg = G.count > 0 ? String(G.count) : "Kay!"; SND.beep(G.count <= 0); if (G.count <= 0) G.msgT = 0.7; }
      return;
    }
    if (G.msgT > 0) G.msgT -= dt;
    for (const p of G.pl) {
      const next = p.rocks.find(r => !r.hit && r.x + r.w > p.x);
      const gap = next ? next.x - p.x : 1e9;
      // bilgisayar ve yardım: kayaya yaklaşınca zıplar
      if (p.ai) { if (next && next.lucky && gap < (p.ai.lvl ? 80 : 60 + Math.random() * 40) && gap > 20) jump(p); }
      else if (p.help && next && next.lucky && gap < 55 && gap > 20) jump(p);
      if (keys[p.i] && !p.ai) jump(p);
      p.slow = Math.max(0, p.slow - dt); p.boost = Math.max(0, p.boost - dt);
      const sp = (BASE + (p.boost > 0 ? BOOST : 0)) * (p.slow > 0 ? SLOW : 1);
      p.x += sp * dt;
      if (p.y > 0 || p.vy > 0) { p.vy -= GRAV * dt; p.y = Math.max(0, p.y + p.vy * dt); if (p.y === 0) p.vy = 0; }
      for (const r of p.rocks) if (!r.hit && p.x + 24 > r.x && p.x - 18 < r.x + r.w && p.y < 34) { r.hit = true; p.slow = 1.1; p.hits++; SND.hit(); }
      for (const f of p.fish) if (!f.got && Math.abs(p.x - f.x) < 34 && Math.abs(p.y + 30 - f.y) < 40) { f.got = true; p.boost = 2; SND.fish(); }
    }
    const done = G.pl.filter(p => p.x >= FINISH);
    if (done.length) {
      const w = done.length === 2 ? (G.pl[0].x >= G.pl[1].x ? 0 : 1) : done[0].i;
      endRace(w);
    }
  }
  function endRace(w) {
    G.over = true; M.pts[w]++; renderHud();
    const matchOver = M.pts[w] >= CFG.win;
    if (headless) return;
    SND.win();
    setTimeout(() => {
      $("end-icon").textContent = matchOver ? "🏆" : "🏁";
      $("end-title").textContent = matchOver ? `${CFG.names[w]} şampiyon!` : `${CFG.names[w]} yarışı kazandı!`;
      $("end-text").textContent = `Skor: ${CFG.names[0]} ${M.pts[0]} – ${M.pts[1]} ${CFG.names[1]}`;
      $("end-next").textContent = matchOver ? "Yeni yarış serisi" : "Sonraki yarış";
      $("end-next").dataset.new = matchOver ? "1" : "";
      $("end").hidden = false; $("end-next").focus();
    }, 700);
  }

  /* ---------- çizim ---------- */
  let W = 0, H = 0, dpr = 1, sc = 1, ox = 0, oy = 0;
  function resize() {
    const r = stage.getBoundingClientRect(); dpr = Math.min(2, window.devicePixelRatio || 1);
    W = r.width; H = r.height; cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr);
    sc = Math.min(W / VW, H / VH); ox = (W - VW * sc) / 2; oy = (H - VH * sc) / 2;
  }
  const COL = [{ c: "#3D8BFD" }, { c: "#E5484D" }];
  function penguin(x, y, col, t, air) {
    ctx.save(); ctx.translate(x, y);
    // kızak
    ctx.fillStyle = col; ctx.beginPath(); ctx.roundRect(-30, -8, 62, 10, 5); ctx.fill();
    ctx.strokeStyle = "#5A3A1A"; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(-30, 6); ctx.lineTo(30, 6); ctx.quadraticCurveTo(42, 6, 40, -6); ctx.stroke();
    // penguen
    const bob = air ? 0 : Math.sin(t * 18) * 1.5;
    ctx.fillStyle = "#1E2A44"; ctx.beginPath(); ctx.ellipse(0, -36 + bob, 20, 28, 0, 0, 7); ctx.fill();
    ctx.fillStyle = "#fff"; ctx.beginPath(); ctx.ellipse(4, -32 + bob, 12, 20, 0, 0, 7); ctx.fill();
    ctx.fillStyle = "#fff"; ctx.beginPath(); ctx.arc(8, -54 + bob, 5, 0, 7); ctx.fill();
    ctx.fillStyle = "#1E2A44"; ctx.beginPath(); ctx.arc(9.5, -54 + bob, 2.4, 0, 7); ctx.fill();
    ctx.fillStyle = "#FF8C1A"; ctx.beginPath(); ctx.moveTo(14, -50 + bob); ctx.lineTo(26, -46 + bob); ctx.lineTo(14, -43 + bob); ctx.fill();
    ctx.fillStyle = col; ctx.fillRect(-14, -46 + bob, 26, 6);   // atkı
    ctx.restore();
  }
  function draw() {
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.clearRect(0, 0, W, H);
    if (!G) return;
    const t = performance.now() / 1000;
    ctx.setTransform(dpr * sc, 0, 0, dpr * sc, dpr * ox, dpr * oy);
    ctx.save(); ctx.beginPath(); ctx.rect(0, 0, VW, VH); ctx.clip();
    for (const p of G.pl) {
      const top = p.i * LANE, ground = top + LANE - 46, cam = p.x - PX;
      const sky = ctx.createLinearGradient(0, top, 0, top + LANE); sky.addColorStop(0, p.i ? "#FFE3E4" : "#DCEBFF"); sky.addColorStop(1, "#F7FBFF");
      ctx.fillStyle = sky; ctx.fillRect(0, top, VW, LANE);
      // dağlar
      ctx.fillStyle = "rgba(160,190,225,.6)";
      for (let k = 0; k < 6; k++) { const mx = ((k * 260 - cam * 0.2) % 1560 + 1560) % 1560 - 260; ctx.beginPath(); ctx.moveTo(mx, ground); ctx.lineTo(mx + 130, top + 70); ctx.lineTo(mx + 260, ground); ctx.fill(); }
      ctx.fillStyle = "#FFFFFF"; ctx.fillRect(0, ground, VW, LANE - (ground - top));
      ctx.fillStyle = "#E3EEF8"; ctx.fillRect(0, ground, VW, 4);
      // bitiş
      const fx = FINISH - cam;
      if (fx > -40 && fx < VW + 40) {
        for (let k = 0; k < 8; k++) { ctx.fillStyle = k % 2 ? "#1E2A44" : "#fff"; ctx.fillRect(fx, ground - 120 + k * 15, 14, 15); }
        ctx.fillStyle = "#E5484D"; ctx.beginPath(); ctx.moveTo(fx + 14, ground - 120); ctx.lineTo(fx + 50, ground - 108); ctx.lineTo(fx + 14, ground - 96); ctx.fill();
      }
      // kayalar ve balıklar
      for (const r of p.rocks) { const rx = r.x - cam; if (rx < -100 || rx > VW + 100) continue; ctx.fillStyle = r.hit ? "#B9C2CF" : "#7D8796"; ctx.beginPath(); ctx.moveTo(rx, ground + 2); ctx.quadraticCurveTo(rx + r.w * 0.2, ground - 40, rx + r.w * 0.55, ground - 36); ctx.quadraticCurveTo(rx + r.w, ground - 30, rx + r.w, ground + 2); ctx.fill(); ctx.fillStyle = "#fff"; ctx.fillRect(rx + r.w * 0.3, ground - 38, r.w * 0.35, 5); }
      for (const f of p.fish) { if (f.got) continue; const fx2 = f.x - cam; if (fx2 < -40 || fx2 > VW + 40) continue; const fy = ground - f.y + Math.sin(t * 4 + f.x) * 4; ctx.fillStyle = "#FFB547"; ctx.beginPath(); ctx.ellipse(fx2, fy, 16, 9, 0, 0, 7); ctx.fill(); ctx.beginPath(); ctx.moveTo(fx2 - 14, fy); ctx.lineTo(fx2 - 26, fy - 9); ctx.lineTo(fx2 - 26, fy + 9); ctx.fill(); ctx.fillStyle = "#1E2A44"; ctx.beginPath(); ctx.arc(fx2 + 8, fy - 2, 2, 0, 7); ctx.fill(); }
      // hız izleri
      if (p.boost > 0) { ctx.strokeStyle = "rgba(255,181,71,.7)"; ctx.lineWidth = 3; for (let k = 0; k < 3; k++) { ctx.beginPath(); ctx.moveTo(PX - 50 - k * 14, ground - 20 - k * 10 - p.y); ctx.lineTo(PX - 90 - k * 14, ground - 20 - k * 10 - p.y); ctx.stroke(); } }
      penguin(PX, ground - p.y, COL[p.i].c, t, p.y > 0);
      if (p.slow > 0) { ctx.font = "26px sans-serif"; ctx.textAlign = "center"; ctx.fillText("💫", PX, ground - p.y - 78); }
      // ilerleme çubuğu
      const prog = Math.min(1, p.x / FINISH);
      ctx.fillStyle = "rgba(30,42,68,.12)"; ctx.fillRect(20, top + 14, VW - 40, 8);
      ctx.fillStyle = COL[p.i].c; ctx.fillRect(20, top + 14, (VW - 40) * prog, 8);
      const o = G.pl[1 - p.i]; ctx.fillStyle = COL[o.i].c; ctx.globalAlpha = 0.5; ctx.beginPath(); ctx.arc(20 + (VW - 40) * Math.min(1, o.x / FINISH), top + 18, 6, 0, 7); ctx.fill(); ctx.globalAlpha = 1;
      ctx.fillStyle = "#1E2A44"; ctx.font = "800 18px Rubik, sans-serif"; ctx.textAlign = "left"; ctx.fillText(CFG.names[p.i] + (p.help && !p.ai ? " 🪄" : ""), 20, top + 44);
    }
    ctx.fillStyle = "#1E2A44"; ctx.fillRect(0, LANE - 2, VW, 4);
    for (const f of G.flakes) { f.y += f.s * 0.6; f.x -= f.s * 0.4; if (f.y > VH) f.y = 0; if (f.x < 0) f.x = VW; ctx.fillStyle = "rgba(255,255,255,.9)"; ctx.beginPath(); ctx.arc(f.x, f.y, f.s, 0, 7); ctx.fill(); }
    if (G.count > 0 || G.msgT > 0) {
      ctx.font = "800 72px Rubik, sans-serif"; ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.lineWidth = 8; ctx.strokeStyle = "rgba(30,42,68,.8)"; ctx.fillStyle = "#fff";
      ctx.strokeText(G.msg, VW / 2, VH / 2); ctx.fillText(G.msg, VW / 2, VH / 2); ctx.textBaseline = "alphabetic";
    }
    ctx.restore();
  }
  function renderHud() {
    for (const i of [0, 1]) { $("n" + i).textContent = CFG.names[i]; $("p" + i).textContent = M ? M.pts[i] : 0; }
    $("round").textContent = M ? `${M.race}. yarış · ${CFG.win} kazanır` : "";
    $("pad1").hidden = CFG.mode === "ai";
  }

  /* ---------- girdi ---------- */
  const KM = { w: 0, " ": 0, arrowup: 1, enter: 1 };
  function setKey(e, on) {
    const k = KM[e.key.toLowerCase()]; if (k === undefined || !$("menu").hidden || !$("end").hidden) return;
    const pi = CFG.mode === "ai" ? 0 : k;
    e.preventDefault(); keys[pi] = on;
  }
  document.addEventListener("keydown", (e) => { if (!e.repeat) { audio(); setKey(e, true); } });
  document.addEventListener("keyup", (e) => setKey(e, false));
  document.querySelectorAll(".pad button").forEach(btn => {
    const p = +btn.dataset.p;
    btn.addEventListener("pointerdown", (e) => { e.preventDefault(); audio(); keys[p] = true; btn.classList.add("on"); });
    const off = () => { keys[p] = false; btn.classList.remove("on"); };
    btn.addEventListener("pointerup", off); btn.addEventListener("pointercancel", off); btn.addEventListener("pointerleave", off);
  });

  /* ---------- menü ---------- */
  const form = $("form");
  function syncForm() { $("f-ai").hidden = form.mode.value !== "ai"; if (form.mode.value === "ai") { if ($("in1").value === "Egemen") $("in1").value = "Bilgisayar"; $("h1").checked = false; } else if ($("in1").value === "Bilgisayar") $("in1").value = "Egemen"; }
  function fillForm() { form.mode.value = CFG.mode; form.ai.value = String(CFG.ai); form.win.value = String(CFG.win); $("in0").value = CFG.names[0]; $("in1").value = CFG.names[1]; $("h0").checked = CFG.help[0]; $("h1").checked = CFG.help[1]; syncForm(); }
  form.addEventListener("change", (e) => { if (e.target.name === "mode") syncForm(); });
  form.addEventListener("submit", (e) => {
    e.preventDefault(); audio();
    CFG = { mode: form.mode.value, ai: +form.ai.value, win: +form.win.value, names: [$("in0").value.trim() || "Mavi", $("in1").value.trim() || (form.mode.value === "ai" ? "Bilgisayar" : "Kırmızı")], help: [$("h0").checked, $("h1").checked] };
    store(); $("menu").hidden = true; newMatch();
  });
  $("menu-btn").addEventListener("click", () => { fillForm(); $("end").hidden = true; $("menu").hidden = false; });
  $("end-next").addEventListener("click", () => { $("end").hidden = true; if ($("end-next").dataset.new) newMatch(); else newRace(); });
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
  resize();
  M = { pts: [0, 0], race: 0 }; newRace(); G.count = 0; G.msgT = 0;
  requestAnimationFrame(loop);

  // test kancası
  window.__kz = { get G() { return G; }, update, newMatch, setHeadless: (h) => { headless = h; }, setCFG: (c) => { CFG = Object.assign(CFG, c); }, keys };
})();
