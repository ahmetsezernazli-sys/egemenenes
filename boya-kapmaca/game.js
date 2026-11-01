/* Boya Kapmaca — iki kişilik bölge boyama oyunu */
(() => {
  "use strict";
  const $ = (id) => document.getElementById(id);
  const cv = $("cv"), ctx = cv.getContext("2d"), stage = $("stage");
  const SAVE_KEY = "boya-kapmaca";
  const GW = 24, GH = 14, TS = 40, ROUND = 60;
  const DIRS = { u: [0, -1], d: [0, 1], l: [-1, 0], r: [1, 0] };
  const COL = [{ c: "#3D8BFD", l: "#7FB2FF", d: "#1F5FC0" }, { c: "#FF5A7A", l: "#FF9AAE", d: "#C9304F" }];

  /* ---------- ses ---------- */
  let AC = null;
  function audio() { try { AC = AC || new (window.AudioContext || window.webkitAudioContext)(); if (AC.state === "suspended") AC.resume(); } catch (e) {} }
  let lastPaint = 0;
  function tone(f, d = 0.08, type = "triangle", vol = 0.05, slide = 0) {
    if (!AC || headless) return;
    const t = AC.currentTime, o = AC.createOscillator(), g = AC.createGain();
    o.type = type; o.frequency.setValueAtTime(f, t); if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(30, f + slide), t + d);
    g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + d);
    o.connect(g).connect(AC.destination); o.start(t); o.stop(t + d + 0.02);
  }
  const SND = {
    paint: (i) => { const n = performance.now(); if (n - lastPaint < 90) return; lastPaint = n; tone(i ? 520 : 440, 0.05, "sine", 0.025, 80); },
    item: () => [660, 880, 1100].forEach((f, i) => setTimeout(() => tone(f, 0.08, "square", 0.04), i * 60)),
    bomb: () => { tone(160, 0.3, "sawtooth", 0.06, -80); tone(900, 0.15, "sine", 0.04, -500); },
    tick: () => tone(1200, 0.04, "square", 0.03),
    win: () => [523, 659, 784, 1046].forEach((f, i) => setTimeout(() => tone(f, 0.2), i * 130)),
  };

  /* ---------- durum ---------- */
  let CFG = { mode: "2p", ai: 0, win: 2, names: ["Enes", "Egemen"], big: [false, true] };
  try { const s = JSON.parse(localStorage.getItem(SAVE_KEY) || "null"); if (s && s.cfg) CFG = Object.assign(CFG, s.cfg); } catch (e) {}
  const store = () => { try { localStorage.setItem(SAVE_KEY, JSON.stringify({ cfg: CFG })); } catch (e) {} };
  let G = null, M = null, paused = false, headless = false;
  const keys = [{}, {}];

  // sabit engeller (simetrik)
  const BLOCKS = new Set();
  [[5, 3], [6, 3], [5, 4], [18, 3], [17, 3], [18, 4], [5, 10], [6, 10], [5, 9], [18, 10], [17, 10], [18, 9], [11, 6], [12, 6], [11, 7], [12, 7]].forEach(([x, y]) => BLOCKS.add(x + "," + y));
  const isBlock = (x, y) => x < 0 || y < 0 || x >= GW || y >= GH || BLOCKS.has(x + "," + y);

  function newMatch() { M = { pts: [0, 0], round: 0 }; newRound(); }
  function newRound() {
    M.round++;
    const own = Array.from({ length: GH }, () => new Array(GW).fill(-1));
    const starts = [[1, Math.floor(GH / 2)], [GW - 2, Math.floor(GH / 2) - 1]];
    G = { own, t: 0, left: ROUND, items: [], itemT: 3, splats: [], fx: [], over: false, count: 3.2, lastSec: 99,
      pl: starts.map(([x, y], i) => ({ i, x, y, tx: x, ty: y, px: x, py: y, prog: 1, base: 4.6, fast: 0, brush: 0, face: [i ? -1 : 1, 0],
        ai: CFG.mode === "ai" && i === 1 ? { lvl: CFG.ai, next: 0 } : null })) };
    for (const p of G.pl) paintAt(p, true);
    keys.forEach(k => { for (const n in k) k[n] = 0; });
    renderHud();
  }

  /* ---------- boyama ---------- */
  function radius(p) { return (CFG.big[p.i] ? 1 : 0) + (p.brush > 0 ? 1 : 0); }
  function paintAt(p, quiet) {
    const [cx, cy] = [Math.round(p.px), Math.round(p.py)], r = radius(p);
    let changed = 0;
    for (let y = cy - r; y <= cy + r; y++) for (let x = cx - r; x <= cx + r; x++) {
      if (isBlock(x, y)) continue;
      if (r >= 2 && Math.abs(x - cx) + Math.abs(y - cy) > r + 1) continue;
      if (G.own[y][x] !== p.i) { G.own[y][x] = p.i; changed++; }
    }
    if (changed && !quiet) SND.paint(p.i);
  }
  function bomb(p, x, y) {
    for (let yy = y - 3; yy <= y + 3; yy++) for (let xx = x - 3; xx <= x + 3; xx++) {
      if (isBlock(xx, yy) || Math.hypot(xx - x, yy - y) > 3.2) continue;
      G.own[yy][xx] = p.i;
    }
    G.splats.push({ x, y, i: p.i, t: 0 });
    SND.bomb();
  }
  function counts() { let a = 0, b = 0, tot = 0; for (let y = 0; y < GH; y++) for (let x = 0; x < GW; x++) { if (isBlock(x, y)) continue; tot++; if (G.own[y][x] === 0) a++; else if (G.own[y][x] === 1) b++; } return [a, b, tot]; }

  /* ---------- hareket ---------- */
  function wantDir(p) {
    if (p.ai) return aiDir(p);
    const k = keys[p.i]; let best = null, bt = -1;
    for (const d of ["u", "d", "l", "r"]) if (k[d] && k[d] > bt) { bt = k[d]; best = d; }
    return best;
  }
  function stepPlayer(p, dt) {
    p.fast = Math.max(0, p.fast - dt); p.brush = Math.max(0, p.brush - dt);
    let move = p.base * (p.fast > 0 ? 1.55 : 1) * dt;
    while (move > 0) {
      if (p.prog >= 1) {
        p.x = p.tx; p.y = p.ty; p.px = p.x; p.py = p.y;
        const d = wantDir(p); if (!d) break;
        const [dx, dy] = DIRS[d]; p.face = [dx, dy];
        if (isBlock(p.x + dx, p.y + dy)) break;
        p.tx = p.x + dx; p.ty = p.y + dy; p.prog = 0;
      }
      const st = Math.min(move, 1 - p.prog); p.prog += st; move -= st;
      p.px = p.x + (p.tx - p.x) * p.prog; p.py = p.y + (p.ty - p.y) * p.prog;
      if (p.prog < 1 && !p.ai) {
        const d = wantDir(p);
        if (d) { const [dx, dy] = DIRS[d]; if (dx === p.x - p.tx && dy === p.y - p.ty) { [p.x, p.tx] = [p.tx, p.x]; [p.y, p.ty] = [p.ty, p.y]; p.prog = 1 - p.prog; p.face = [dx, dy]; } }
      }
      paintAt(p);
    }
    const cx = Math.round(p.px), cy = Math.round(p.py);
    const it = G.items.find(q => q.x === cx && q.y === cy);
    if (it) {
      G.items = G.items.filter(q => q !== it);
      if (it.k === "bomb") bomb(p, cx, cy); else { SND.item(); if (it.k === "fast") p.fast = 5; else p.brush = 6; }
      G.fx.push({ s: it.k === "bomb" ? "💣" : it.k === "fast" ? "⚡" : "🖌️", x: cx, y: cy, t: 0 });
    }
  }

  /* ---------- bilgisayar ---------- */
  function aiDir(p) {
    const A = p.ai;
    if (G.t < A.next && A.dir) { const [dx, dy] = DIRS[A.dir]; if (!isBlock(p.x + dx, p.y + dy)) return A.dir; }
    A.next = G.t + (A.lvl ? 0.05 : 0.35 + Math.random() * 0.4);
    // BFS: yakın ve boyanmamış/rakip kareler, güçlendiriciler
    const q = [[p.x, p.y, 0, null]], seen = new Set([p.x + "," + p.y]);
    let best = null, bv = -1;
    while (q.length) {
      const [x, y, d, first] = q.shift();
      if (d > 0) {
        const o = G.own[y][x];
        let v = (o === p.i ? 0 : o === -1 ? 1 : A.lvl ? 1.6 : 1.1);
        // komşu boyanmamışlar da değerli
        for (const [dx, dy] of Object.values(DIRS)) { const nx = x + dx, ny = y + dy; if (!isBlock(nx, ny) && G.own[ny][nx] !== p.i) v += 0.3; }
        if (G.items.some(it => it.x === x && it.y === y)) v += A.lvl ? 8 : 3;
        v = v / (1 + d * (A.lvl ? 0.35 : 0.5));
        if (v > bv) { bv = v; best = first; }
      }
      if (d > 14) continue;
      for (const [k, [dx, dy]] of Object.entries(DIRS)) {
        const nx = x + dx, ny = y + dy, key = nx + "," + ny;
        if (seen.has(key) || isBlock(nx, ny)) continue;
        seen.add(key); q.push([nx, ny, d + 1, first || k]);
      }
    }
    if (!A.lvl && Math.random() < 0.25) { const opts = Object.keys(DIRS).filter(k => { const [dx, dy] = DIRS[k]; return !isBlock(p.x + dx, p.y + dy); }); best = opts[Math.floor(Math.random() * opts.length)]; }
    A.dir = best;
    return best;
  }

  /* ---------- tur ---------- */
  function update(dt) {
    if (!G || G.over) return;
    for (const s of G.splats) s.t += dt;
    G.splats = G.splats.filter(s => s.t < 0.8);
    for (const f of G.fx) f.t += dt;
    G.fx = G.fx.filter(f => f.t < 0.9);
    if (G.count > 0) { G.count -= dt; renderHud(); return; }
    G.t += dt; G.left = Math.max(0, ROUND - G.t);
    for (const p of G.pl) stepPlayer(p, dt);
    G.itemT -= dt;
    if (G.itemT <= 0 && G.items.length < 3) {
      for (let tries = 0; tries < 30; tries++) {
        const x = 1 + Math.floor(Math.random() * (GW - 2)), y = 1 + Math.floor(Math.random() * (GH - 2));
        if (isBlock(x, y) || G.items.some(q => q.x === x && q.y === y) || G.pl.some(p => Math.round(p.px) === x && Math.round(p.py) === y)) continue;
        G.items.push({ x, y, k: ["bomb", "fast", "brush"][Math.floor(Math.random() * 3)], t: 0 });
        break;
      }
      G.itemT = 4 + Math.random() * 3;
    }
    for (const it of G.items) it.t += dt;
    const sec = Math.ceil(G.left);
    if (sec <= 5 && sec !== G.lastSec && sec > 0) SND.tick();
    G.lastSec = sec;
    renderHud();
    if (G.left <= 0) endRound();
  }
  function endRound() {
    G.over = true;
    const [a, b, tot] = counts(), w = a === b ? -1 : a > b ? 0 : 1;
    if (w >= 0) M.pts[w]++;
    renderHud();
    if (headless) return;
    SND.win();
    const matchOver = w >= 0 && M.pts[w] >= CFG.win;
    setTimeout(() => {
      $("end-icon").textContent = w < 0 ? "🤝" : matchOver ? "🏆" : "🎨";
      $("end-title").textContent = w < 0 ? "Berabere!" : matchOver ? `${CFG.names[w]} kazandı!` : `${CFG.names[w]} raundu aldı!`;
      $("eb").style.width = (a / tot * 100) + "%"; $("er").style.width = (b / tot * 100) + "%";
      $("end-text").textContent = `${CFG.names[0]} %${Math.round(a / tot * 100)} · ${CFG.names[1]} %${Math.round(b / tot * 100)} · Skor ${M.pts[0]}–${M.pts[1]}`;
      $("end-next").textContent = matchOver ? "Yeni maç" : "Sonraki raund";
      $("end-next").dataset.new = matchOver ? "1" : "";
      $("end").hidden = false; $("end-next").focus();
    }, 500);
  }

  /* ---------- çizim ---------- */
  let W = 0, H = 0, sc = 1, ox = 0, oy = 0, dpr = 1;
  function resize() {
    const r = stage.getBoundingClientRect(); dpr = Math.min(2, window.devicePixelRatio || 1);
    W = r.width; H = r.height; cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr);
    sc = Math.min(W / (GW * TS), H / (GH * TS)); ox = (W - GW * TS * sc) / 2; oy = (H - GH * TS * sc) / 2;
  }
  const hash = (x, y) => ((x * 73856093) ^ (y * 19349663)) % 7;
  function draw() {
    ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.clearRect(0, 0, cv.width, cv.height);
    if (!G) return;
    ctx.setTransform(sc * dpr, 0, 0, sc * dpr, ox * dpr, oy * dpr);
    const t = performance.now() / 1000;
    ctx.fillStyle = "#FFFDF8"; ctx.fillRect(0, 0, GW * TS, GH * TS);
    ctx.strokeStyle = "rgba(0,0,0,.05)"; ctx.lineWidth = 1;
    for (let x = 1; x < GW; x++) { ctx.beginPath(); ctx.moveTo(x * TS, 0); ctx.lineTo(x * TS, GH * TS); ctx.stroke(); }
    for (let y = 1; y < GH; y++) { ctx.beginPath(); ctx.moveTo(0, y * TS); ctx.lineTo(GW * TS, y * TS); ctx.stroke(); }
    for (let y = 0; y < GH; y++) for (let x = 0; x < GW; x++) {
      const o = G.own[y][x];
      if (o < 0) continue;
      ctx.fillStyle = hash(x, y) % 3 ? COL[o].c : COL[o].l;
      ctx.beginPath(); ctx.roundRect ? ctx.roundRect(x * TS - 1, y * TS - 1, TS + 2, TS + 2, 6) : ctx.rect(x * TS, y * TS, TS, TS); ctx.fill();
    }
    for (const k of BLOCKS) {
      const [x, y] = k.split(",").map(Number);
      ctx.fillStyle = "#4A4A5E"; ctx.fillRect(x * TS, y * TS, TS, TS);
      ctx.fillStyle = "#5E5E76"; ctx.fillRect(x * TS + 3, y * TS + 3, TS - 6, TS - 10);
    }
    for (const s of G.splats) {
      const k = s.t / 0.8;
      ctx.globalAlpha = 1 - k; ctx.strokeStyle = COL[s.i].d; ctx.lineWidth = 8 * (1 - k) + 2;
      ctx.beginPath(); ctx.arc((s.x + 0.5) * TS, (s.y + 0.5) * TS, TS * (0.6 + k * 3), 0, 7); ctx.stroke(); ctx.globalAlpha = 1;
    }
    for (const it of G.items) {
      const x = (it.x + 0.5) * TS, y = (it.y + 0.5) * TS + Math.sin(t * 4 + it.x) * 3;
      ctx.fillStyle = "rgba(255,255,255,.9)"; ctx.beginPath(); ctx.arc(x, y, 16, 0, 7); ctx.fill();
      ctx.strokeStyle = "#FFD166"; ctx.lineWidth = 3; ctx.stroke();
      ctx.font = "20px sans-serif"; ctx.textAlign = "center"; ctx.textBaseline = "middle";
      ctx.fillText(it.k === "bomb" ? "💣" : it.k === "fast" ? "⚡" : "🖌️", x, y + 1);
    }
    for (const p of G.pl) {
      const x = (p.px + 0.5) * TS, y = (p.py + 0.5) * TS, C = COL[p.i], bob = p.prog < 1 ? Math.sin(t * 22) * 1.5 : 0;
      if (p.fast > 0) { ctx.fillStyle = "rgba(255,209,102,.5)"; ctx.beginPath(); ctx.arc(x - p.face[0] * 10, y - p.face[1] * 10, 12, 0, 7); ctx.fill(); }
      ctx.fillStyle = "rgba(0,0,0,.2)"; ctx.beginPath(); ctx.ellipse(x, y + 14, 14, 5, 0, 0, 7); ctx.fill();
      ctx.fillStyle = "#fff"; ctx.beginPath(); ctx.arc(x, y + bob, 17, 0, 7); ctx.fill();
      ctx.fillStyle = C.d; ctx.beginPath(); ctx.arc(x, y + bob, 14, 0, 7); ctx.fill();
      ctx.fillStyle = "#fff"; ctx.beginPath(); ctx.arc(x - 5 + p.face[0] * 3, y - 3 + bob + p.face[1] * 3, 4, 0, 7); ctx.arc(x + 5 + p.face[0] * 3, y - 3 + bob + p.face[1] * 3, 4, 0, 7); ctx.fill();
      ctx.fillStyle = "#1A1A2A"; ctx.beginPath(); ctx.arc(x - 5 + p.face[0] * 4.5, y - 3 + bob + p.face[1] * 4.5, 1.8, 0, 7); ctx.arc(x + 5 + p.face[0] * 4.5, y - 3 + bob + p.face[1] * 4.5, 1.8, 0, 7); ctx.fill();
      if (radius(p) > 0) { ctx.strokeStyle = C.c; ctx.globalAlpha = 0.35; ctx.lineWidth = 2; ctx.strokeRect((Math.round(p.px) - radius(p)) * TS, (Math.round(p.py) - radius(p)) * TS, (2 * radius(p) + 1) * TS, (2 * radius(p) + 1) * TS); ctx.globalAlpha = 1; }
    }
    for (const f of G.fx) { ctx.globalAlpha = 1 - f.t / 0.9; ctx.font = "26px sans-serif"; ctx.textAlign = "center"; ctx.fillText(f.s, (f.x + 0.5) * TS, (f.y - f.t) * TS); ctx.globalAlpha = 1; }
    if (G.count > 0) {
      ctx.fillStyle = "rgba(255,253,248,.55)"; ctx.fillRect(0, 0, GW * TS, GH * TS);
      ctx.font = "800 96px Rubik, sans-serif"; ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.fillStyle = "#2A2A3A";
      ctx.fillText(G.count > 0.4 ? Math.ceil(G.count - 0.2) : "Boya!", GW * TS / 2, GH * TS / 2);
    }
    if (paused) { ctx.fillStyle = "rgba(0,0,0,.4)"; ctx.fillRect(0, 0, GW * TS, GH * TS); ctx.fillStyle = "#fff"; ctx.font = "800 44px Rubik, sans-serif"; ctx.textAlign = "center"; ctx.fillText("Duraklatıldı", GW * TS / 2, GH * TS / 2); }
  }
  function renderHud() {
    for (const i of [0, 1]) { $("n" + i).textContent = CFG.names[i]; $("w" + i).textContent = M ? M.pts[i] : 0; }
    if (!G) return;
    const [a, b, tot] = counts();
    $("mb").style.width = (a / tot * 100) + "%"; $("mr").style.width = (b / tot * 100) + "%";
    $("time").textContent = G.count > 0 ? "Hazır…" : Math.ceil(G.left);
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
  }
  document.addEventListener("keydown", (e) => { if (e.key === "p" || e.key === "P" || e.key === "Escape") { togglePause(); return; } if (!e.repeat) setKey(e, true); });
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
  function syncForm() { $("f-ai").hidden = form.mode.value !== "ai"; if (form.mode.value === "ai") { if ($("in1").value === "Egemen") $("in1").value = "Bilgisayar"; $("big1").checked = false; } else if ($("in1").value === "Bilgisayar") $("in1").value = "Egemen"; }
  function fillForm() { form.mode.value = CFG.mode; form.ai.value = String(CFG.ai); form.win.value = String(CFG.win); $("in0").value = CFG.names[0]; $("in1").value = CFG.names[1]; $("big0").checked = CFG.big[0]; $("big1").checked = CFG.big[1]; syncForm(); }
  form.addEventListener("change", (e) => { if (e.target.name === "mode") syncForm(); });
  form.addEventListener("submit", (e) => {
    e.preventDefault(); audio();
    CFG = { mode: form.mode.value, ai: +form.ai.value, win: +form.win.value,
      names: [$("in0").value.trim() || "Mavi", $("in1").value.trim() || (form.mode.value === "ai" ? "Bilgisayar" : "Kırmızı")], big: [$("big0").checked, $("big1").checked] };
    store(); $("menu").hidden = true; paused = false; newMatch();
  });
  $("menu-btn").addEventListener("click", () => { fillForm(); $("end").hidden = true; $("menu").hidden = false; });
  $("end-next").addEventListener("click", () => { $("end").hidden = true; if ($("end-next").dataset.new) newMatch(); else newRound(); });
  $("end-menu").addEventListener("click", () => { fillForm(); $("end").hidden = true; $("menu").hidden = false; });
  fillForm();

  /* ---------- döngü ---------- */
  let last = performance.now();
  function loop(now) {
    const dt = Math.min(0.05, (now - last) / 1000); last = now;
    const sr = stage.getBoundingClientRect();
    if (Math.abs(sr.width - W) > 0.5 || Math.abs(sr.height - H) > 0.5) resize();
    if (!paused && !headless && $("menu").hidden) update(dt);
    draw();
    requestAnimationFrame(loop);
  }
  resize();
  M = { pts: [0, 0], round: 0 }; newRound();
  requestAnimationFrame(loop);

  // test kancası
  window.__boya = { get G() { return G; }, get M() { return M; }, update, newMatch, counts, keys, setHeadless: (h) => { headless = h; },
    setCFG: (c) => { CFG = Object.assign(CFG, c); }, aiOn: (i, lvl) => { G.pl[i].ai = { lvl, next: 0 }; } };
})();
