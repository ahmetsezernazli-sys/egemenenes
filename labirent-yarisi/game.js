/* Labirent Yarışı — iki kişilik labirent yarışı, ortadaki hazineye ilk ulaşan kazanır */
(() => {
  "use strict";
  const $ = (id) => document.getElementById(id);
  const cv = $("cv"), ctx = cv.getContext("2d"), stage = $("stage");
  const SAVE_KEY = "labirent-yarisi";
  const SIZES = [[7, 5], [11, 7], [15, 9]];   // hücre sayısı (genişlik, yükseklik), tek sayı: ortası hazine
  const STEP = 0.12;
  const DIRS = { u: [0, -1], d: [0, 1], l: [-1, 0], r: [1, 0] };

  /* ---------- ses ---------- */
  let AC = null, headless = false;
  function audio() { try { AC = AC || new (window.AudioContext || window.webkitAudioContext)(); if (AC.state === "suspended") AC.resume(); } catch (e) {} }
  function tone(f, d = 0.1, type = "triangle", vol = 0.05) {
    if (!AC || headless) return;
    const t = AC.currentTime, o = AC.createOscillator(), g = AC.createGain();
    o.type = type; o.frequency.setValueAtTime(f, t); g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + d);
    o.connect(g).connect(AC.destination); o.start(t); o.stop(t + d + 0.02);
  }
  const SND = { step: (i) => tone(i ? 330 : 280, 0.03, "sine", 0.02), bump: () => tone(120, 0.06, "square", 0.02), win: () => [523, 659, 784, 1046].forEach((f, i) => setTimeout(() => tone(f, 0.2), i * 130)), beep: (h) => tone(h ? 880 : 520, 0.15, "square", 0.05) };

  /* ---------- durum ---------- */
  let CFG = { mode: "2p", ai: 0, win: 3, size: 1, names: ["Enes", "Egemen"], shield: [false, true] };
  try { const s = JSON.parse(localStorage.getItem(SAVE_KEY) || "null"); if (s && s.cfg) CFG = Object.assign(CFG, s.cfg); } catch (e) {}
  const store = () => { try { localStorage.setItem(SAVE_KEY, JSON.stringify({ cfg: CFG })); } catch (e) {} };
  let G = null, M = null, paused = false;
  const keys = [{}, {}];

  // labirent: duvar ızgarası (2w+1)×(2h+1), 1 = duvar
  function carve(w, h) {
    const W = 2 * w + 1, H = 2 * h + 1, g = Array.from({ length: H }, () => new Uint8Array(W).fill(1));
    const seen = Array.from({ length: h }, () => new Array(w).fill(false)), st = [[w >> 1, h >> 1]];
    seen[h >> 1][w >> 1] = true; g[2 * (h >> 1) + 1][2 * (w >> 1) + 1] = 0;
    while (st.length) {
      const [x, y] = st[st.length - 1];
      const nb = [[1, 0], [-1, 0], [0, 1], [0, -1]].map(([dx, dy]) => [x + dx, y + dy, dx, dy]).filter(([nx, ny]) => nx >= 0 && ny >= 0 && nx < w && ny < h && !seen[ny][nx]);
      if (!nb.length) { st.pop(); continue; }
      const [nx, ny, dx, dy] = nb[Math.floor(Math.random() * nb.length)];
      seen[ny][nx] = true; g[2 * y + 1 + dy][2 * x + 1 + dx] = 0; g[2 * ny + 1][2 * nx + 1] = 0; st.push([nx, ny]);
    }
    // birkaç ek geçit: farklı yollar olsun
    for (let k = 0; k < Math.round(w * h / 8); k++) {
      const x = 1 + Math.floor(Math.random() * (W - 2)), y = 1 + Math.floor(Math.random() * (H - 2));
      if (g[y][x] === 1 && ((g[y][x - 1] === 0 && g[y][x + 1] === 0 && g[y - 1][x] === 1 && g[y + 1][x] === 1) || (g[y - 1][x] === 0 && g[y + 1][x] === 0 && g[y][x - 1] === 1 && g[y][x + 1] === 1))) g[y][x] = 0;
    }
    return g;
  }
  function bfs(g, sx, sy) {
    const H = g.length, W = g[0].length, d = Array.from({ length: H }, () => new Int16Array(W).fill(-1)), q = [[sx, sy]]; d[sy][sx] = 0;
    for (let i = 0; i < q.length; i++) { const [x, y] = q[i]; for (const [dx, dy] of Object.values(DIRS)) { const nx = x + dx, ny = y + dy; if (g[ny] && g[ny][nx] === 0 && d[ny][nx] < 0) { d[ny][nx] = d[y][x] + 1; q.push([nx, ny]); } } }
    return d;
  }
  function newMatch() { M = { pts: [0, 0], round: 0 }; newRound(); }
  function newRound() {
    M.round++;
    const [w, h] = SIZES[CFG.size];
    let g, dist, tx, ty;
    for (let t = 0; t < 200; t++) {
      g = carve(w, h); tx = 2 * (w >> 1) + 1; ty = 2 * (h >> 1) + 1;
      dist = bfs(g, tx, ty);
      const d0 = dist[1][1], d1 = dist[2 * h - 1][2 * w - 1];
      if (Math.abs(d0 - d1) <= 2) break;
    }
    G = { g, dist, tx, ty, over: false, count: 3, cT: 0.8, msg: "3", msgT: 1,
      pl: [[1, 1], [2 * w - 1, 2 * h - 1]].map(([x, y], i) => ({ i, x, y, px: x, py: y, cd: 0, help: CFG.shield[i], ai: CFG.mode === "ai" && i === 1 ? { lvl: CFG.ai, t: 0.5 } : null, trail: [] })) };
    keys.forEach(k => { for (const n in k) k[n] = 0; });
    renderHud(); SND.beep(false);
  }
  function tryMove(p, d) {
    const [dx, dy] = DIRS[d], nx = p.x + dx, ny = p.y + dy;
    if (G.g[ny][nx] !== 0) { SND.bump(); return false; }
    p.trail.push([p.x, p.y]); if (p.trail.length > 12) p.trail.shift();
    p.x = nx; p.y = ny; SND.step(p.i);
    if (p.x === G.tx && p.y === G.ty) endRound(p.i);
    return true;
  }
  function nextStep(p) {
    const cur = G.dist[p.y][p.x];
    for (const [k, [dx, dy]] of Object.entries(DIRS)) { const nx = p.x + dx, ny = p.y + dy; if (G.g[ny][nx] === 0 && G.dist[ny][nx] === cur - 1) return k; }
    return null;
  }
  function update(dt) {
    if (!G || G.over) return;
    if (G.msgT > 0) G.msgT -= dt;
    if (G.count > 0) { G.cT -= dt; if (G.cT <= 0) { G.count--; G.cT = 0.8; G.msg = G.count > 0 ? String(G.count) : "Koş!"; G.msgT = G.count > 0 ? 1 : 0.6; SND.beep(G.count <= 0); } return; }
    for (const p of G.pl) {
      p.px += (p.x - p.px) * Math.min(1, dt * 18); p.py += (p.y - p.py) * Math.min(1, dt * 18);
      p.cd -= dt;
      if (p.ai) {
        p.ai.t -= dt;
        if (p.ai.t <= 0) {
          const d = nextStep(p);
          // kolay bilgisayar arada yanlış yola sapar
          if (p.ai.lvl === 0 && Math.random() < 0.12) { const all = Object.keys(DIRS).filter(k => G.g[p.y + DIRS[k][1]][p.x + DIRS[k][0]] === 0); tryMove(p, all[Math.floor(Math.random() * all.length)]); }
          else if (d) tryMove(p, d);
          p.ai.t = p.ai.lvl ? 0.17 + Math.random() * 0.05 : 0.3 + Math.random() * 0.15;
        }
        continue;
      }
      if (p.cd > 0) continue;
      const k = keys[p.i], order = Object.keys(DIRS).filter(d => k[d]).sort((a, b) => k[b] - k[a]);
      if (order.length) { tryMove(p, order[0]); p.cd = STEP; }
      if (G.over) return;
    }
  }
  function endRound(w) {
    G.over = true; M.pts[w]++; renderHud();
    const matchOver = M.pts[w] >= CFG.win;
    if (headless) return;
    SND.win();
    setTimeout(() => {
      $("end-icon").textContent = matchOver ? "🏆" : "💎";
      $("end-title").textContent = matchOver ? `${CFG.names[w]} yarışı kazandı!` : `${CFG.names[w]} hazineyi buldu!`;
      $("end-text").textContent = `Skor: ${CFG.names[0]} ${M.pts[0]} – ${M.pts[1]} ${CFG.names[1]}`;
      $("end-next").textContent = matchOver ? "Yeni yarış" : "Sonraki raund";
      $("end-next").dataset.new = matchOver ? "1" : "";
      $("end").hidden = false; $("end-next").focus();
    }, 700);
  }

  /* ---------- çizim ---------- */
  let W = 0, H = 0, dpr = 1, cs = 20, ox = 0, oy = 0;
  function resize() {
    const r = stage.getBoundingClientRect(); dpr = Math.min(2, window.devicePixelRatio || 1);
    W = r.width; H = r.height; cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr);
  }
  const COLORS = ["#3D8BFD", "#E5484D"];
  function draw() {
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.clearRect(0, 0, W, H);
    if (!G) return;
    const gh = G.g.length, gw = G.g[0].length;
    cs = Math.floor(Math.min(W / gw, H / gh)); ox = (W - gw * cs) / 2; oy = (H - gh * cs) / 2;
    const t = performance.now() / 1000;
    ctx.fillStyle = "#3A3158"; ctx.fillRect(ox, oy, gw * cs, gh * cs);
    for (let y = 0; y < gh; y++) for (let x = 0; x < gw; x++) {
      if (G.g[y][x]) { ctx.fillStyle = "#8C7BD0"; ctx.fillRect(ox + x * cs, oy + y * cs, cs, cs); ctx.fillStyle = "#A796EA"; ctx.fillRect(ox + x * cs, oy + y * cs, cs, cs * 0.22); }
    }
    // yardım izi
    for (const p of G.pl) {
      if (!p.help || p.ai || G.over) continue;
      let x = p.x, y = p.y;
      for (let k = 0; k < 6; k++) {
        const cur = G.dist[y][x]; let moved = false;
        for (const [dx, dy] of Object.values(DIRS)) { const nx = x + dx, ny = y + dy; if (G.g[ny][nx] === 0 && G.dist[ny][nx] === cur - 1) { x = nx; y = ny; moved = true; break; } }
        if (!moved) break;
        ctx.fillStyle = `rgba(255,209,102,${0.75 - k * 0.1})`; ctx.beginPath(); ctx.arc(ox + (x + 0.5) * cs, oy + (y + 0.5) * cs, cs * 0.14, 0, 7); ctx.fill();
      }
    }
    // hazine
    const s = 1 + Math.sin(t * 4) * 0.08;
    ctx.save(); ctx.translate(ox + (G.tx + 0.5) * cs, oy + (G.ty + 0.5) * cs); ctx.scale(s, s);
    ctx.fillStyle = "#4CC9F0"; ctx.beginPath(); ctx.moveTo(0, -cs * 0.38); ctx.lineTo(cs * 0.34, -cs * 0.08); ctx.lineTo(0, cs * 0.38); ctx.lineTo(-cs * 0.34, -cs * 0.08); ctx.closePath(); ctx.fill();
    ctx.fillStyle = "rgba(255,255,255,.7)"; ctx.beginPath(); ctx.moveTo(0, -cs * 0.38); ctx.lineTo(cs * 0.12, -cs * 0.08); ctx.lineTo(-cs * 0.12, -cs * 0.08); ctx.fill();
    ctx.restore();
    for (const p of G.pl) {
      for (const [x, y] of p.trail) { ctx.fillStyle = p.i ? "rgba(229,72,77,.18)" : "rgba(61,139,253,.18)"; ctx.fillRect(ox + x * cs + cs * 0.3, oy + y * cs + cs * 0.3, cs * 0.4, cs * 0.4); }
      const X = ox + (p.px + 0.5) * cs, Y = oy + (p.py + 0.5) * cs;
      ctx.fillStyle = COLORS[p.i]; ctx.beginPath(); ctx.arc(X, Y, cs * 0.38, 0, 7); ctx.fill();
      ctx.fillStyle = "#fff"; ctx.beginPath(); ctx.arc(X - cs * 0.12, Y - cs * 0.06, cs * 0.09, 0, 7); ctx.arc(X + cs * 0.12, Y - cs * 0.06, cs * 0.09, 0, 7); ctx.fill();
      ctx.fillStyle = "#1A1530"; ctx.beginPath(); ctx.arc(X - cs * 0.12, Y - cs * 0.06, cs * 0.045, 0, 7); ctx.arc(X + cs * 0.12, Y - cs * 0.06, cs * 0.045, 0, 7); ctx.fill();
    }
    if (G.msgT > 0 || G.count > 0) {
      ctx.globalAlpha = Math.min(1, Math.max(G.msgT, G.count > 0 ? 1 : 0) * 2);
      ctx.font = "800 64px Rubik, sans-serif"; ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.lineWidth = 8; ctx.strokeStyle = "rgba(20,15,40,.85)"; ctx.fillStyle = "#fff";
      ctx.strokeText(G.msg, W / 2, H / 2); ctx.fillText(G.msg, W / 2, H / 2); ctx.globalAlpha = 1; ctx.textBaseline = "alphabetic";
    }
    if (paused) { ctx.fillStyle = "rgba(0,0,0,.45)"; ctx.fillRect(0, 0, W, H); ctx.fillStyle = "#fff"; ctx.font = "800 40px Rubik, sans-serif"; ctx.textAlign = "center"; ctx.fillText("Duraklatıldı", W / 2, H / 2); }
  }
  function renderHud() {
    for (const i of [0, 1]) { $("n" + i).textContent = CFG.names[i]; $("p" + i).textContent = M ? M.pts[i] : 0; }
    $("round").textContent = M ? `${M.round}. raund · ${CFG.win} kazanır` : "";
    $("pad1").hidden = CFG.mode === "ai";
  }

  /* ---------- girdi ---------- */
  let order = 0;
  const KM = { w: [0, "u"], s: [0, "d"], a: [0, "l"], d: [0, "r"], arrowup: [1, "u"], arrowdown: [1, "d"], arrowleft: [1, "l"], arrowright: [1, "r"] };
  function setKey(e, on) {
    const m = KM[e.key.toLowerCase()];
    if (!m || !$("menu").hidden || !$("end").hidden) return;
    const pi = CFG.mode === "ai" ? 0 : m[0];
    e.preventDefault();
    keys[pi][m[1]] = on ? (keys[pi][m[1]] || ++order) : 0;
    if (on && G && G.pl[pi].cd <= 0 && G.count <= 0 && !G.over) { tryMove(G.pl[pi], m[1]); G.pl[pi].cd = STEP * 1.6; }
  }
  document.addEventListener("keydown", (e) => { if (e.key === "p" || e.key === "P" || e.key === "Escape") { togglePause(); return; } if (!e.repeat) { audio(); setKey(e, true); } });
  document.addEventListener("keyup", (e) => setKey(e, false));
  window.addEventListener("blur", () => keys.forEach(k => { for (const n in k) k[n] = 0; }));
  document.querySelectorAll(".pad button").forEach(btn => {
    const p = +btn.dataset.p, k = btn.dataset.k;
    btn.addEventListener("pointerdown", (e) => { e.preventDefault(); audio(); keys[p][k] = ++order; btn.classList.add("on"); if (G && G.count <= 0 && !G.over) { tryMove(G.pl[p], k); G.pl[p].cd = STEP * 1.6; } try { btn.setPointerCapture(e.pointerId); } catch (_) {} });
    const off = () => { keys[p][k] = 0; btn.classList.remove("on"); };
    btn.addEventListener("pointerup", off); btn.addEventListener("pointercancel", off); btn.addEventListener("lostpointercapture", off);
    btn.addEventListener("contextmenu", (e) => e.preventDefault());
  });
  function togglePause() { if (!G || G.over || !$("menu").hidden) return; paused = !paused; $("pause").textContent = paused ? "▶" : "⏸"; }
  $("pause").addEventListener("click", togglePause);

  /* ---------- menü ---------- */
  const form = $("form");
  function syncForm() { $("f-ai").hidden = form.mode.value !== "ai"; if (form.mode.value === "ai") { if ($("in1").value === "Egemen") $("in1").value = "Bilgisayar"; $("sh1").checked = false; } else if ($("in1").value === "Bilgisayar") $("in1").value = "Egemen"; }
  function fillForm() { form.mode.value = CFG.mode; form.ai.value = String(CFG.ai); form.win.value = String(CFG.win); form.size.value = String(CFG.size); $("in0").value = CFG.names[0]; $("in1").value = CFG.names[1]; $("sh0").checked = CFG.shield[0]; $("sh1").checked = CFG.shield[1]; syncForm(); }
  form.addEventListener("change", (e) => { if (e.target.name === "mode") syncForm(); });
  form.addEventListener("submit", (e) => {
    e.preventDefault(); audio();
    CFG = { mode: form.mode.value, ai: +form.ai.value, win: +form.win.value, size: +form.size.value, names: [$("in0").value.trim() || "Mavi", $("in1").value.trim() || (form.mode.value === "ai" ? "Bilgisayar" : "Kırmızı")], shield: [$("sh0").checked, $("sh1").checked] };
    store(); $("menu").hidden = true; paused = false; newMatch();
  });
  $("menu-btn").addEventListener("click", () => { fillForm(); $("end").hidden = true; $("menu").hidden = false; });
  $("end-next").addEventListener("click", () => { $("end").hidden = true; if ($("end-next").dataset.new) newMatch(); else newRound(); });
  $("end-menu").addEventListener("click", () => { fillForm(); $("end").hidden = true; $("menu").hidden = false; });
  fillForm();

  let last = performance.now();
  function loop(now) {
    const dt = Math.min(0.05, (now - last) / 1000); last = now;
    const sr = stage.getBoundingClientRect();
    if (Math.abs(sr.width - W) > 0.5 || Math.abs(sr.height - H) > 0.5) resize();
    if (!paused && !headless && $("menu").hidden) update(dt);
    draw(); requestAnimationFrame(loop);
  }
  resize();
  M = { pts: [0, 0], round: 0 }; newRound(); G.count = 0; G.msgT = 0;
  requestAnimationFrame(loop);

  // test kancası
  window.__lb = { get G() { return G; }, update, newMatch, newRound, tryMove, nextStep, bfs, setHeadless: (h) => { headless = h; }, setCFG: (c) => { CFG = Object.assign(CFG, c); }, aiOn: (i, lvl) => { G.pl[i].ai = { lvl, t: 0 }; } };
})();
