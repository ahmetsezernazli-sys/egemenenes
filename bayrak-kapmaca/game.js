/* Bayrak Kapmaca — iki kişilik bayrak kapma oyunu */
(() => {
  "use strict";
  const $ = (id) => document.getElementById(id);
  const cv = $("cv"), ctx = cv.getContext("2d"), stage = $("stage");
  const SAVE_KEY = "bayrak-kapmaca";
  const AW = 960, AH = 560, R = 18, SPEED = 210, MID = AW / 2;
  const BASES = [{ x: 70, y: AH / 2 }, { x: AW - 70, y: AH / 2 }];
  const TREES = [[300, 140], [300, 420], [660, 140], [660, 420], [480, 90], [480, 470]];

  let AC = null, headless = false;
  function audio() { try { AC = AC || new (window.AudioContext || window.webkitAudioContext)(); if (AC.state === "suspended") AC.resume(); } catch (e) {} }
  function tone(f, d = 0.1, type = "triangle", vol = 0.06) {
    if (!AC || headless) return;
    const t = AC.currentTime, o = AC.createOscillator(), g = AC.createGain();
    o.type = type; o.frequency.setValueAtTime(f, t); g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + d);
    o.connect(g).connect(AC.destination); o.start(t); o.stop(t + d + 0.02);
  }
  const SND = { grab: () => { tone(660, 0.1); setTimeout(() => tone(880, 0.12), 80); }, tag: () => tone(180, 0.25, "sawtooth", 0.06), score: () => [523, 659, 784, 1046].forEach((f, i) => setTimeout(() => tone(f, 0.2), i * 110)), beep: (h) => tone(h ? 880 : 520, 0.15, "square", 0.05) };

  let CFG = { mode: "2p", ai: 0, win: 3, names: ["Enes", "Egemen"], shield: [false, true] };
  try { const s = JSON.parse(localStorage.getItem(SAVE_KEY) || "null"); if (s && s.cfg) CFG = Object.assign(CFG, s.cfg); } catch (e) {}
  const store = () => { try { localStorage.setItem(SAVE_KEY, JSON.stringify({ cfg: CFG })); } catch (e) {} };
  let G = null, M = null, paused = false;
  const keys = [{}, {}];

  function newMatch() { M = { pts: [0, 0], round: 0 }; newRound(); }
  function newRound() {
    M.round++;
    G = { over: false, count: 3, cT: 0.8, msg: "3", msgT: 1, fx: [],
      flags: [0, 1].map(i => ({ owner: i, x: BASES[i].x, y: BASES[i].y, carrier: -1 })),
      pl: [0, 1].map(i => ({ i, x: BASES[i].x, y: BASES[i].y + 90, stun: 0, fast: CFG.shield[i], ai: CFG.mode === "ai" && i === 1 ? { lvl: CFG.ai, t: 0, tx: 0, ty: 0 } : null })) };
    keys.forEach(k => { for (const n in k) k[n] = 0; });
    renderHud(); SND.beep(false);
  }
  const inOwnHalf = (p) => p.i === 0 ? p.x < MID : p.x > MID;
  const blocked = (x, y) => x < R || y < R || x > AW - R || y > AH - R || TREES.some(([tx, ty]) => Math.hypot(tx - x, ty - y) < R + 26);
  function sendHome(p) {
    p.x = BASES[p.i].x; p.y = BASES[p.i].y + 90; p.stun = 1;
    for (const f of G.flags) if (f.carrier === p.i) { f.carrier = -1; f.x = BASES[f.owner].x; f.y = BASES[f.owner].y; }
  }
  function update(dt) {
    if (!G || G.over) return;
    if (G.msgT > 0) G.msgT -= dt;
    if (G.count > 0) { G.cT -= dt; if (G.cT <= 0) { G.count--; G.cT = 0.8; G.msg = G.count > 0 ? String(G.count) : "Koş!"; G.msgT = G.count > 0 ? 1 : 0.6; SND.beep(G.count <= 0); } return; }
    for (const p of G.pl) {
      p.stun = Math.max(0, p.stun - dt);
      if (p.stun > 0) continue;
      let mx = 0, my = 0;
      if (p.ai) { think(p, dt); mx = p.ai.mx; my = p.ai.my; }
      else { const k = keys[p.i]; mx = (k.r ? 1 : 0) - (k.l ? 1 : 0); my = (k.d ? 1 : 0) - (k.u ? 1 : 0); }
      const len = Math.hypot(mx, my); if (!len) continue;
      const carrying = G.flags.some(f => f.carrier === p.i);
      const sp = SPEED * (p.fast ? 1.2 : 1) * (carrying ? 0.88 : 1) * (p.ai && p.ai.lvl === 0 ? 0.82 : 1);
      const vx = mx / len * sp * dt, vy = my / len * sp * dt;
      if (!blocked(p.x + vx, p.y)) p.x += vx;
      if (!blocked(p.x, p.y + vy)) p.y += vy;
    }
    const [a, b] = G.pl;
    // yakalama: kendi sahasındaki oyuncu rakibe dokunursa
    if (a.stun <= 0 && b.stun <= 0 && Math.hypot(a.x - b.x, a.y - b.y) < R * 2) {
      if (inOwnHalf(a) && !inOwnHalf(b)) { sendHome(b); SND.tag(); fx(b, "💫"); }
      else if (inOwnHalf(b) && !inOwnHalf(a)) { sendHome(a); SND.tag(); fx(a, "💫"); }
    }
    for (const f of G.flags) {
      const enemy = G.pl[1 - f.owner];
      if (f.carrier < 0 && enemy.stun <= 0 && Math.hypot(enemy.x - f.x, enemy.y - f.y) < R + 14) { f.carrier = enemy.i; SND.grab(); }
      if (f.carrier >= 0) { const c = G.pl[f.carrier]; f.x = c.x; f.y = c.y - 24; if (inOwnHalf(c)) return scoreFlag(c); }
    }
    for (let i = G.fx.length - 1; i >= 0; i--) { G.fx[i].t += dt; if (G.fx[i].t > 1) G.fx.splice(i, 1); }
  }
  function fx(p, s) { G.fx.push({ x: p.x, y: p.y, s, t: 0 }); }
  function scoreFlag(p) {
    G.over = true; M.pts[p.i]++; renderHud(); SND.score();
    const matchOver = M.pts[p.i] >= CFG.win;
    if (headless) return;
    setTimeout(() => {
      $("end-icon").textContent = matchOver ? "🏆" : "🚩";
      $("end-title").textContent = matchOver ? `${CFG.names[p.i]} kazandı!` : `${CFG.names[p.i]} bayrağı getirdi!`;
      $("end-text").textContent = `Skor: ${CFG.names[0]} ${M.pts[0]} – ${M.pts[1]} ${CFG.names[1]}`;
      $("end-next").textContent = matchOver ? "Yeni oyun" : "Sonraki raund";
      $("end-next").dataset.new = matchOver ? "1" : "";
      $("end").hidden = false; $("end-next").focus();
    }, 600);
  }
  // bilgisayar: bayrağı kap, kaçıyorsa eve dön; rakip kendi bayrağımızı taşıyorsa kovala
  function think(p, dt) {
    const ai = p.ai; ai.t -= dt;
    if (ai.t > 0) return;
    ai.t = ai.lvl ? 0.08 : 0.25;
    const foe = G.pl[1 - p.i], myFlag = G.flags[p.i], theirFlag = G.flags[1 - p.i];
    let tx, ty;
    if (theirFlag.carrier === p.i) { tx = p.i ? MID + 120 : MID - 120; ty = p.y + (foe.y > p.y ? -60 : 60); }
    else if (myFlag.carrier === foe.i || (inOwnHalf(p) && (p.i ? foe.x > MID : foe.x < MID) && Math.hypot(foe.x - p.x, foe.y - p.y) < 100)) { tx = foe.x; ty = foe.y; }
    else { tx = theirFlag.x; ty = theirFlag.y; }
    let mx = tx - p.x, my = ty - p.y;
    const ml = Math.hypot(mx, my) || 1; mx = mx / ml * 100; my = my / ml * 100;
    // rakip sahasındayken rakipten uzak dur (yakalanmamak için)
    const fd = Math.hypot(foe.x - p.x, foe.y - p.y);
    if (!inOwnHalf(p) && foe.stun <= 0 && fd < (ai.lvl ? 140 : 100)) { const k = (ai.lvl ? 200 : 140) / Math.max(fd, 20); mx += (p.x - foe.x) / fd * k * 60; my += (p.y - foe.y) / fd * k * 60; }
    // ağaçlardan kaçın
    for (const [qx, qy] of TREES) { const dx = p.x - qx, dy = p.y - qy, d = Math.hypot(dx, dy); if (d < 80) { mx += dx / d * 60; my += dy / d * 60; } }
    ai.mx = mx; ai.my = my;
  }

  /* ---------- çizim ---------- */
  let W = 0, H = 0, dpr = 1, sc = 1, ox = 0, oy = 0;
  function resize() { const r = stage.getBoundingClientRect(); dpr = Math.min(2, window.devicePixelRatio || 1); W = r.width; H = r.height; cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr); sc = Math.min(W / AW, H / AH); ox = (W - AW * sc) / 2; oy = (H - AH * sc) / 2; }
  const COL = ["#3D8BFD", "#E5484D"];
  function draw() {
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.clearRect(0, 0, W, H);
    if (!G) return;
    ctx.setTransform(dpr * sc, 0, 0, dpr * sc, dpr * ox, dpr * oy);
    ctx.fillStyle = "#5FAE4E"; ctx.fillRect(0, 0, AW, AH);
    ctx.fillStyle = "rgba(61,139,253,.12)"; ctx.fillRect(0, 0, MID, AH); ctx.fillStyle = "rgba(229,72,77,.12)"; ctx.fillRect(MID, 0, MID, AH);
    for (let x = 0; x < AW; x += 80) { ctx.fillStyle = "rgba(255,255,255,.05)"; ctx.fillRect(x, 0, 40, AH); }
    ctx.strokeStyle = "#fff"; ctx.lineWidth = 4; ctx.setLineDash([16, 12]); ctx.beginPath(); ctx.moveTo(MID, 0); ctx.lineTo(MID, AH); ctx.stroke(); ctx.setLineDash([]);
    BASES.forEach((b, i) => { ctx.strokeStyle = COL[i]; ctx.lineWidth = 4; ctx.beginPath(); ctx.arc(b.x, b.y, 38, 0, 7); ctx.stroke(); });
    for (const [x, y] of TREES) { ctx.fillStyle = "#2E7D32"; ctx.beginPath(); ctx.arc(x, y, 26, 0, 7); ctx.fill(); ctx.fillStyle = "#43A047"; ctx.beginPath(); ctx.arc(x - 6, y - 6, 15, 0, 7); ctx.fill(); }
    const t = performance.now() / 1000;
    for (const f of G.flags) {
      ctx.fillStyle = "#fff"; ctx.fillRect(f.x - 2, f.y - 26, 4, 34);
      const wv = Math.sin(t * 8 + f.owner) * 3;
      ctx.fillStyle = COL[f.owner]; ctx.beginPath(); ctx.moveTo(f.x + 2, f.y - 26); ctx.lineTo(f.x + 26, f.y - 18 + wv); ctx.lineTo(f.x + 2, f.y - 10); ctx.fill();
    }
    for (const p of G.pl) {
      if (p.stun > 0 && Math.floor(t * 10) % 2) continue;
      ctx.fillStyle = "rgba(0,0,0,.25)"; ctx.beginPath(); ctx.ellipse(p.x, p.y + R - 2, R, 6, 0, 0, 7); ctx.fill();
      ctx.fillStyle = COL[p.i]; ctx.beginPath(); ctx.arc(p.x, p.y, R, 0, 7); ctx.fill();
      ctx.fillStyle = "#F2C29B"; ctx.beginPath(); ctx.arc(p.x, p.y - 4, R * 0.62, 0, 7); ctx.fill();
      ctx.fillStyle = "#222"; ctx.beginPath(); ctx.arc(p.x - 4, p.y - 6, 2, 0, 7); ctx.arc(p.x + 4, p.y - 6, 2, 0, 7); ctx.fill();
      if (p.fast) { ctx.font = "14px sans-serif"; ctx.textAlign = "center"; ctx.fillText("⚡", p.x, p.y - R - 6); }
    }
    for (const e of G.fx) { ctx.globalAlpha = 1 - e.t; ctx.font = "30px sans-serif"; ctx.textAlign = "center"; ctx.fillText(e.s, e.x, e.y - e.t * 40); ctx.globalAlpha = 1; }
    if (G.msgT > 0 || G.count > 0) {
      ctx.font = "800 64px Rubik, sans-serif"; ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.lineWidth = 8; ctx.strokeStyle = "rgba(20,40,20,.85)"; ctx.fillStyle = "#fff";
      ctx.strokeText(G.msg, AW / 2, AH / 2); ctx.fillText(G.msg, AW / 2, AH / 2); ctx.textBaseline = "alphabetic";
    }
    if (paused) { ctx.fillStyle = "rgba(0,0,0,.45)"; ctx.fillRect(0, 0, AW, AH); ctx.fillStyle = "#fff"; ctx.font = "800 40px Rubik, sans-serif"; ctx.textAlign = "center"; ctx.fillText("Duraklatıldı", AW / 2, AH / 2); }
  }
  function renderHud() {
    for (const i of [0, 1]) { $("n" + i).textContent = CFG.names[i]; $("p" + i).textContent = M ? M.pts[i] : 0; }
    $("round").textContent = M ? `${M.round}. raund · ${CFG.win} sayı kazanır` : "";
    $("pad1").hidden = CFG.mode === "ai";
  }

  /* ---------- girdi ---------- */
  let order = 0;
  const KM = { w: [0, "u"], s: [0, "d"], a: [0, "l"], d: [0, "r"], arrowup: [1, "u"], arrowdown: [1, "d"], arrowleft: [1, "l"], arrowright: [1, "r"] };
  function setKey(e, on) {
    const m = KM[e.key.toLowerCase()];
    if (!m || !$("menu").hidden || !$("end").hidden) return;
    const pi = CFG.mode === "ai" ? 0 : m[0];
    e.preventDefault(); keys[pi][m[1]] = on ? (keys[pi][m[1]] || ++order) : 0;
  }
  document.addEventListener("keydown", (e) => { if (e.key === "p" || e.key === "P" || e.key === "Escape") { togglePause(); return; } if (!e.repeat) { audio(); setKey(e, true); } });
  document.addEventListener("keyup", (e) => setKey(e, false));
  window.addEventListener("blur", () => keys.forEach(k => { for (const n in k) k[n] = 0; }));
  document.querySelectorAll(".pad button").forEach(btn => {
    const p = +btn.dataset.p, k = btn.dataset.k;
    btn.addEventListener("pointerdown", (e) => { e.preventDefault(); audio(); keys[p][k] = ++order; btn.classList.add("on"); try { btn.setPointerCapture(e.pointerId); } catch (_) {} });
    const off = () => { keys[p][k] = 0; btn.classList.remove("on"); };
    btn.addEventListener("pointerup", off); btn.addEventListener("pointercancel", off); btn.addEventListener("lostpointercapture", off);
    btn.addEventListener("contextmenu", (e) => e.preventDefault());
  });
  function togglePause() { if (!G || G.over || !$("menu").hidden) return; paused = !paused; $("pause").textContent = paused ? "▶" : "⏸"; }
  $("pause").addEventListener("click", togglePause);

  /* ---------- menü ---------- */
  const form = $("form");
  function syncForm() { $("f-ai").hidden = form.mode.value !== "ai"; if (form.mode.value === "ai") { if ($("in1").value === "Egemen") $("in1").value = "Bilgisayar"; $("sh1").checked = false; } else if ($("in1").value === "Bilgisayar") $("in1").value = "Egemen"; }
  function fillForm() { form.mode.value = CFG.mode; form.ai.value = String(CFG.ai); form.win.value = String(CFG.win); $("in0").value = CFG.names[0]; $("in1").value = CFG.names[1]; $("sh0").checked = CFG.shield[0]; $("sh1").checked = CFG.shield[1]; syncForm(); }
  form.addEventListener("change", (e) => { if (e.target.name === "mode") syncForm(); });
  form.addEventListener("submit", (e) => {
    e.preventDefault(); audio();
    CFG = { mode: form.mode.value, ai: +form.ai.value, win: +form.win.value, names: [$("in0").value.trim() || "Mavi", $("in1").value.trim() || (form.mode.value === "ai" ? "Bilgisayar" : "Kırmızı")], shield: [$("sh0").checked, $("sh1").checked] };
    store(); $("menu").hidden = true; paused = false; newMatch();
  });
  $("menu-btn").addEventListener("click", () => { fillForm(); $("end").hidden = true; $("menu").hidden = false; });
  $("end-next").addEventListener("click", () => { $("end").hidden = true; if ($("end-next").dataset.new) newMatch(); else newRound(); });
  $("end-menu").addEventListener("click", () => { fillForm(); $("end").hidden = true; $("menu").hidden = false; });
  fillForm();

  let last = performance.now();
  function loop(now) {
    const dt = Math.min(0.05, (now - last) / 1000); last = now;
    const sr = stage.getBoundingClientRect(); if (Math.abs(sr.width - W) > 0.5 || Math.abs(sr.height - H) > 0.5) resize();
    if (!paused && !headless && $("menu").hidden) update(dt);
    draw(); requestAnimationFrame(loop);
  }
  resize();
  M = { pts: [0, 0], round: 0 }; newRound(); G.count = 0; G.msgT = 0;
  requestAnimationFrame(loop);

  window.__bk = { get G() { return G; }, get M() { return M; }, update, newMatch, setHeadless: (h) => { headless = h; }, setCFG: (c) => { CFG = Object.assign(CFG, c); }, aiOn: (i, lvl) => { G.pl[i].ai = { lvl, t: 0, mx: 0, my: 0 }; } };
})();
