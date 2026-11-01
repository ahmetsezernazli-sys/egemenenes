/* Su Balonu Savaşı — iki kişilik arena (bomberman benzeri, su balonlarıyla) */
(() => {
  "use strict";
  const $ = (id) => document.getElementById(id);
  const cv = $("cv"), ctx = cv.getContext("2d"), stage = $("stage");
  const SAVE_KEY = "su-balonu";
  const GW = 13, GH = 11, TS = 48;           // ızgara ve karo boyu (mantıksal)
  const FUSE = 2.4, SPLASH = 0.5, ROUND_T = 150;
  const EMPTY = 0, WALL = 1, CRATE = 2;
  const DIRS = { u: [0, -1], d: [0, 1], l: [-1, 0], r: [1, 0] };

  /* ---------- ses ---------- */
  let AC = null;
  function audio() { try { AC = AC || new (window.AudioContext || window.webkitAudioContext)(); if (AC.state === "suspended") AC.resume(); } catch (e) {} }
  function tone(f, d = 0.1, type = "triangle", vol = 0.06, slide = 0) {
    if (!AC || headless) return;
    const t = AC.currentTime, o = AC.createOscillator(), g = AC.createGain();
    o.type = type; o.frequency.setValueAtTime(f, t); if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(30, f + slide), t + d);
    g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + d);
    o.connect(g).connect(AC.destination); o.start(t); o.stop(t + d + 0.02);
  }
  function splashSnd() {
    if (!AC || headless) return;
    const n = AC.sampleRate * 0.35, buf = AC.createBuffer(1, n, AC.sampleRate), ch = buf.getChannelData(0);
    for (let i = 0; i < n; i++) ch[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / n, 2);
    const s = AC.createBufferSource(), f = AC.createBiquadFilter(), g = AC.createGain();
    f.type = "lowpass"; f.frequency.value = 1400; g.gain.value = 0.25;
    s.buffer = buf; s.connect(f).connect(g).connect(AC.destination); s.start();
  }
  const SND = {
    drop: () => tone(300, 0.08, "sine", 0.06, 120),
    pop: () => { splashSnd(); tone(180, 0.15, "sine", 0.05, -80); },
    item: () => [660, 880, 1100].forEach((f, i) => setTimeout(() => tone(f, 0.08, "square", 0.04), i * 60)),
    hit: () => tone(500, 0.35, "sawtooth", 0.05, -380),
    win: () => [523, 659, 784, 1046].forEach((f, i) => setTimeout(() => tone(f, 0.2), i * 130)),
  };

  /* ---------- durum ---------- */
  let CFG = { mode: "2p", ai: 0, win: 3, names: ["Enes", "Egemen"], shield: [false, true] };
  try { const s = JSON.parse(localStorage.getItem(SAVE_KEY) || "null"); if (s && s.cfg) CFG = Object.assign(CFG, s.cfg); } catch (e) {}
  const store = () => { try { localStorage.setItem(SAVE_KEY, JSON.stringify({ cfg: CFG })); } catch (e) {} };
  let G = null, M = null, paused = false, headless = false;
  const keys = [{}, {}];

  function newMatch() { M = { pts: [0, 0], round: 0 }; newRound(); }
  function newRound() {
    M.round++;
    const grid = [];
    for (let y = 0; y < GH; y++) {
      const row = [];
      for (let x = 0; x < GW; x++) {
        if (x === 0 || y === 0 || x === GW - 1 || y === GH - 1 || (x % 2 === 0 && y % 2 === 0)) row.push(WALL);
        else row.push(Math.random() < 0.72 ? CRATE : EMPTY);
      }
      grid.push(row);
    }
    // başlangıç köşeleri boş kalsın
    const starts = [[1, 1], [GW - 2, GH - 2]];
    for (const [sx, sy] of starts) for (const [dx, dy] of [[0, 0], [1, 0], [0, 1], [2, 0], [0, 2], [-1, 0], [0, -1], [-2, 0], [0, -2]]) {
      const x = sx + dx, y = sy + dy; if (grid[y] && grid[y][x] === CRATE) grid[y][x] = EMPTY;
    }
    const items = {};
    for (let y = 0; y < GH; y++) for (let x = 0; x < GW; x++) if (grid[y][x] === CRATE && Math.random() < 0.32) items[x + "," + y] = ["b", "r", "s"][Math.floor(Math.random() * 3)];
    G = { grid, hidden: items, items: {}, balloons: [], splashes: [], fx: [], t: 0, over: false, msg: "", msgT: 0,
          pl: starts.map(([x, y], i) => ({ i, x, y, tx: x, ty: y, px: x, py: y, prog: 1, speed: 3.6, max: 1, range: 2, hearts: CFG.shield[i] ? 3 : 1, inv: 0, face: [0, 1], ai: CFG.mode === "ai" && i === 1 ? { lvl: CFG.ai, think: 0, path: [] } : null, wet: 0 })) };
    G.msg = `${M.round}. raund!`; G.msgT = 1.6;
    keys.forEach(k => { for (const n in k) k[n] = 0; });
    renderHud();
  }

  /* ---------- ızgara yardımcıları ---------- */
  const inGrid = (x, y) => x >= 0 && y >= 0 && x < GW && y < GH;
  const balloonAt = (x, y) => G.balloons.find(b => b.x === x && b.y === y);
  function blocked(x, y, p) {
    if (!inGrid(x, y) || G.grid[y][x] !== EMPTY) return true;
    const b = balloonAt(x, y);
    return !!(b && !(p && b.pass && b.pass.includes(p.i)));
  }
  const tileOf = (p) => [Math.round(p.px), Math.round(p.py)];

  /* ---------- oyuncu ---------- */
  function wantDir(p) {
    if (p.ai) return aiDir(p);
    const k = keys[p.i];
    // son basılan yön öncelikli
    let best = null, bt = -1;
    for (const d of ["u", "d", "l", "r"]) if (k[d] && k[d] > bt) { bt = k[d]; best = d; }
    return best;
  }
  function stepPlayer(p, dt) {
    if (p.hearts <= 0) return;
    p.inv = Math.max(0, p.inv - dt); p.wet = Math.max(0, p.wet - dt);
    let move = p.speed * dt;
    while (move > 0) {
      if (p.prog >= 1) {
        // karo merkezinde: yeni yön seç
        p.x = p.tx; p.y = p.ty; p.px = p.x; p.py = p.y;
        const d = wantDir(p);
        if (!d) break;
        const [dx, dy] = DIRS[d]; p.face = [dx, dy];
        if (blocked(p.x + dx, p.y + dy, p)) break;
        p.tx = p.x + dx; p.ty = p.y + dy; p.prog = 0;
      }
      const step = Math.min(move, 1 - p.prog);
      p.prog += step; move -= step;
      p.px = p.x + (p.tx - p.x) * p.prog; p.py = p.y + (p.ty - p.y) * p.prog;
      // yarı yolda geri dönebilsin
      if (p.prog < 1 && !p.ai) {
        const d = wantDir(p);
        if (d) { const [dx, dy] = DIRS[d]; if (dx === p.x - p.tx && dy === p.y - p.ty) { [p.x, p.tx] = [p.tx, p.x]; [p.y, p.ty] = [p.ty, p.y]; p.prog = 1 - p.prog; p.face = [dx, dy]; } }
      }
    }
    // balondan çıkınca artık geçemez
    const [cx, cy] = tileOf(p);
    for (const b of G.balloons) if (b.pass && b.pass.includes(p.i) && !(b.x === cx && b.y === cy) && !(b.x === p.x && b.y === p.y && p.prog < 0.5)) b.pass = b.pass.filter(i => i !== p.i);
    // güçlendirici
    const it = G.items[cx + "," + cy];
    if (it) {
      delete G.items[cx + "," + cy];
      if (it === "b") p.max = Math.min(6, p.max + 1); else if (it === "r") p.range = Math.min(7, p.range + 1); else p.speed = Math.min(6, p.speed + 0.5);
      SND.item();
      G.fx.push({ k: "txt", x: cx, y: cy, s: it === "b" ? "+🎈" : it === "r" ? "+💧" : "+👟", t: 0, life: 0.9 });
    }
    // balon bırak
    const wants = p.ai ? p.ai.drop : keys[p.i].b && !keys[p.i].bHeld;
    if (!p.ai) keys[p.i].bHeld = !!keys[p.i].b;
    if (wants) { if (p.ai) p.ai.drop = false; drop(p); }
  }
  function drop(p) {
    const [x, y] = tileOf(p);
    if (G.balloons.filter(b => b.owner === p.i).length >= p.max || balloonAt(x, y) || G.grid[y][x] !== EMPTY) return false;
    G.balloons.push({ x, y, t: FUSE, owner: p.i, range: p.range, pass: G.pl.filter(q => { const [qx, qy] = tileOf(q); return qx === x && qy === y; }).map(q => q.i) });
    SND.drop();
    return true;
  }
  function blastTiles(b) {
    const out = [[b.x, b.y]];
    for (const [dx, dy] of Object.values(DIRS)) {
      for (let k = 1; k <= b.range; k++) {
        const x = b.x + dx * k, y = b.y + dy * k;
        if (!inGrid(x, y) || G.grid[y][x] === WALL) break;
        out.push([x, y]);
        if (G.grid[y][x] === CRATE) break;
      }
    }
    return out;
  }
  function explode(b) {
    G.balloons = G.balloons.filter(q => q !== b);
    const tiles = blastTiles(b);
    for (const [x, y] of tiles) {
      if (G.grid[y][x] === CRATE) {
        G.grid[y][x] = EMPTY;
        const it = G.hidden[x + "," + y]; if (it) G.items[x + "," + y] = it;
        for (let i = 0; i < 6; i++) G.fx.push({ k: "wood", x: x + 0.5, y: y + 0.5, vx: (Math.random() - 0.5) * 4, vy: (Math.random() - 0.5) * 4, t: 0, life: 0.5 });
      } else if (G.items[x + "," + y] && !(x === b.x && y === b.y)) delete G.items[x + "," + y];
      G.splashes.push({ x, y, t: SPLASH, center: x === b.x && y === b.y, owner: b.owner });
      const other = balloonAt(x, y); if (other) other.t = Math.min(other.t, 0.06); // zincirleme
    }
    SND.pop();
  }
  function soak(p) {
    if (p.inv > 0 || p.hearts <= 0) return;
    p.hearts--; p.inv = 2; p.wet = 1.2;
    SND.hit();
    for (let i = 0; i < 12; i++) G.fx.push({ k: "drop", x: p.px + 0.5, y: p.py + 0.5, vx: (Math.random() - 0.5) * 5, vy: -Math.random() * 4, t: 0, life: 0.7 });
    renderHud();
  }

  function update(dt) {
    if (!G || G.over) return;
    G.t += dt; G.msgT = Math.max(0, G.msgT - dt);
    for (const p of G.pl) stepPlayer(p, dt);
    for (const b of [...G.balloons]) { b.t -= dt; if (b.t <= 0 && G.balloons.includes(b)) explode(b); }
    for (const s of G.splashes) s.t -= dt;
    G.splashes = G.splashes.filter(s => s.t > 0);
    for (const p of G.pl) { const [x, y] = tileOf(p); const s = G.splashes.find(s => s.x === x && s.y === y); if (s) { if (p.hearts > 0 && p.inv <= 0) G.lastSoak = { who: p.i, by: s.owner }; soak(p); } }
    for (const f of G.fx) { f.t += dt; if (f.vx !== undefined) { f.x += f.vx * dt; f.y += f.vy * dt; f.vy += 8 * dt; } }
    G.fx = G.fx.filter(f => f.t < f.life);
    const alive = G.pl.filter(p => p.hearts > 0);
    if (alive.length < 2 || G.t > ROUND_T) endRound(alive.length === 1 ? alive[0].i : -1);
  }
  function endRound(w) {
    G.over = true;
    if (w >= 0) M.pts[w]++;
    renderHud();
    const matchOver = w >= 0 && M.pts[w] >= CFG.win;
    if (!headless) SND.win();
    if (headless) return;
    setTimeout(() => {
      $("end-icon").textContent = w < 0 ? "🤝" : matchOver ? "🏆" : "💦";
      $("end-title").textContent = w < 0 ? "Berabere!" : matchOver ? `${CFG.names[w]} savaşı kazandı!` : `${CFG.names[w]} raundu aldı!`;
      $("end-text").textContent = `Skor: ${CFG.names[0]} ${M.pts[0]} – ${M.pts[1]} ${CFG.names[1]}` + (w < 0 ? " (süre doldu)" : "");
      $("end-next").textContent = matchOver ? "Yeni savaş" : "Sonraki raund";
      $("end-next").dataset.new = matchOver ? "1" : "";
      $("end").hidden = false; $("end-next").focus();
    }, 900);
  }

  /* ---------- bilgisayar ---------- */
  function dangerMap(extra) {
    // her karo için en erken ıslanma zamanı
    const dm = Array.from({ length: GH }, () => new Array(GW).fill(Infinity));
    const bs = G.balloons.map(b => ({ x: b.x, y: b.y, t: b.t, range: b.range })).concat(extra || []);
    // zincir: basitçe tekrar tekrar en erken zamanı yay
    for (let pass = 0; pass < 3; pass++) for (const b of bs) {
      for (const [x, y] of blastTiles(b)) {
        dm[y][x] = Math.min(dm[y][x], b.t);
        const o = bs.find(q => q.x === x && q.y === y && q !== b); if (o && o.t > b.t) o.t = b.t;
      }
    }
    for (const s of G.splashes) dm[s.y][s.x] = Math.min(dm[s.y][s.x], 0);
    return dm;
  }
  function bfs(p, sx, sy, dm, goal, maxD = 40) {
    const q = [[sx, sy, 0, null]], seen = new Set([sx + "," + sy]);
    const step = 1 / p.speed;
    while (q.length) {
      const [x, y, d, first] = q.shift();
      if (goal(x, y, d)) return { x, y, d, first };
      if (d >= maxD) continue;
      for (const [k, [dx, dy]] of Object.entries(DIRS)) {
        const nx = x + dx, ny = y + dy, key = nx + "," + ny;
        if (seen.has(key) || blocked(nx, ny, p)) continue;
        const tArr = (d + 1) * step;
        // varınca ya da geçerken ıslanmayacak mı
        if (dm[ny][nx] < tArr + 0.35 && dm[ny][nx] > tArr - 0.6) continue;
        seen.add(key); q.push([nx, ny, d + 1, first || k]);
      }
    }
    return null;
  }
  function aiDir(p) {
    const A = p.ai;
    const [x, y] = [p.x, p.y];
    const dm = dangerMap();
    const safeHere = dm[y][x] === Infinity;
    // tehlikedeysek en yakın güvenli karoya kaç
    if (!safeHere) {
      const r = bfs(p, x, y, dm, (gx, gy) => dm[gy][gx] === Infinity);
      return r ? r.first : null;
    }
    const okDir = (d) => { const [dx, dy] = DIRS[d]; return !blocked(x + dx, y + dy, p) && dm[y + dy][x + dx] === Infinity; };
    // kolay seviye biraz yavaş düşünür; önbellekteki yön de güvenli olmalı
    if (G.t < A.next && A.cache && okDir(A.cache)) return A.cache;
    if (G.t < A.next) return null;
    A.next = G.t + (A.lvl ? 0 : 0.2 + Math.random() * 0.3);
    const opp = G.pl[1 - p.i];
    // balon bırakmaya değer mi? (rakip menzilde ya da yanında sandık) ve kaçış yolu var mı
    const bal = G.balloons.filter(b => b.owner === p.i).length;
    if (bal < p.max && !balloonAt(x, y)) {
      const fake = { x, y, t: FUSE, range: p.range };
      const tiles = blastTiles(fake);
      const hitsOpp = opp.hearts > 0 && tiles.some(([tx, ty]) => { const [ox, oy] = tileOf(opp); return ox === tx && oy === ty; });
      const crates = tiles.filter(([tx, ty]) => G.grid[ty][tx] === CRATE).length;
      if (hitsOpp || crates > 0) {
        const dm2 = dangerMap([fake]);
        const esc = bfs(p, x, y, dm2, (gx, gy) => dm2[gy][gx] === Infinity, 10);
        if (esc && (A.lvl || Math.random() < 0.7)) { A.drop = true; return esc.first; }
      }
    }
    // hedef: güçlendirici > sandık yanı > rakip
    const itemGoal = (gx, gy) => !!G.items[gx + "," + gy] && dm[gy][gx] === Infinity;
    const crateGoal = (gx, gy) => dm[gy][gx] === Infinity && Object.values(DIRS).some(([dx, dy]) => inGrid(gx + dx, gy + dy) && G.grid[gy + dy][gx + dx] === CRATE) && !(gx === x && gy === y);
    const [ox, oy] = tileOf(opp);
    const oppGoal = (gx, gy) => dm[gy][gx] === Infinity && Math.abs(gx - ox) + Math.abs(gy - oy) <= Math.max(1, p.range - 1) && (gx === ox || gy === oy) && !(gx === x && gy === y);
    let r = bfs(p, x, y, dm, itemGoal, 12) || (A.lvl ? bfs(p, x, y, dm, oppGoal, 20) : null) || bfs(p, x, y, dm, crateGoal, 25) || bfs(p, x, y, dm, oppGoal, 30);
    if (!r || !r.first) { A.cache = undefined; const opts = ["u", "d", "l", "r"].filter(okDir); return opts.length && Math.random() < 0.3 ? opts[Math.floor(Math.random() * opts.length)] : null; }
    A.cache = r.first;
    // sonraki karo tehlikeliyse bekle
    const [dx, dy] = DIRS[r.first];
    if (dm[y + dy][x + dx] !== Infinity) return null;
    return r.first;
  }

  /* ---------- çizim ---------- */
  let W = 0, H = 0, sc = 1, ox = 0, oy = 0, dpr = 1;
  function resize() {
    const r = stage.getBoundingClientRect(); dpr = Math.min(2, window.devicePixelRatio || 1);
    W = r.width; H = r.height; cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr);
    sc = Math.min(W / (GW * TS), H / (GH * TS)); ox = (W - GW * TS * sc) / 2; oy = (H - GH * TS * sc) / 2;
  }
  const COLORS = [{ c: "#3D8BFD", d: "#1F57B0" }, { c: "#E5484D", d: "#A3262B" }];
  function drawPlayer(p, t) {
    if (p.hearts <= 0) return;
    if (p.inv > 0 && Math.floor(t * 10) % 2) return;
    const x = (p.px + 0.5) * TS, y = (p.py + 0.5) * TS, C = COLORS[p.i];
    const bob = p.prog < 1 ? Math.sin(t * 20) * 2 : 0;
    ctx.fillStyle = "rgba(0,0,0,.25)"; ctx.beginPath(); ctx.ellipse(x, y + 16, 15, 5, 0, 0, 7); ctx.fill();
    ctx.fillStyle = C.c; ctx.beginPath(); ctx.roundRect ? ctx.roundRect(x - 13, y - 2 + bob, 26, 18, 7) : ctx.rect(x - 13, y - 2 + bob, 26, 18); ctx.fill();
    ctx.fillStyle = "#F2C29B"; ctx.beginPath(); ctx.arc(x, y - 8 + bob, 13, 0, 7); ctx.fill();
    ctx.fillStyle = C.d; ctx.beginPath(); ctx.arc(x, y - 11 + bob, 13, Math.PI, 0); ctx.fill();
    const [fx, fy] = p.face;
    ctx.fillStyle = "#1A1A1A";
    ctx.beginPath(); ctx.arc(x - 4 + fx * 3, y - 7 + fy * 2 + bob, 2, 0, 7); ctx.arc(x + 4 + fx * 3, y - 7 + fy * 2 + bob, 2, 0, 7); ctx.fill();
    if (p.wet > 0) { ctx.fillStyle = "rgba(76,201,240,.55)"; ctx.beginPath(); ctx.arc(x, y - 4, 20, 0, 7); ctx.fill(); }
  }
  function draw() {
    ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.clearRect(0, 0, cv.width, cv.height);
    if (!G) return;
    ctx.setTransform(sc * dpr, 0, 0, sc * dpr, ox * dpr, oy * dpr);
    const t = performance.now() / 1000;
    for (let y = 0; y < GH; y++) for (let x = 0; x < GW; x++) {
      const X = x * TS, Y = y * TS, v = G.grid[y][x];
      ctx.fillStyle = (x + y) % 2 ? "#5CB85C" : "#55AE55"; ctx.fillRect(X, Y, TS, TS);
      if (v === WALL) {
        ctx.fillStyle = "#7D8A99"; ctx.fillRect(X, Y, TS, TS);
        ctx.fillStyle = "#97A4B3"; ctx.fillRect(X + 3, Y + 3, TS - 6, TS - 12);
        ctx.fillStyle = "rgba(0,0,0,.18)"; ctx.fillRect(X, Y + TS - 6, TS, 6);
      } else if (v === CRATE) {
        ctx.fillStyle = "#B97A3D"; ctx.fillRect(X + 3, Y + 3, TS - 6, TS - 6);
        ctx.strokeStyle = "#8A5526"; ctx.lineWidth = 3; ctx.strokeRect(X + 5, Y + 5, TS - 10, TS - 10);
        ctx.beginPath(); ctx.moveTo(X + 7, Y + 7); ctx.lineTo(X + TS - 7, Y + TS - 7); ctx.moveTo(X + TS - 7, Y + 7); ctx.lineTo(X + 7, Y + TS - 7); ctx.stroke();
      }
      const it = G.items[x + "," + y];
      if (it) {
        ctx.fillStyle = "rgba(255,255,255,.85)"; ctx.beginPath(); ctx.arc(X + TS / 2, Y + TS / 2 + Math.sin(t * 4 + x) * 2, 15, 0, 7); ctx.fill();
        ctx.font = "22px sans-serif"; ctx.textAlign = "center"; ctx.textBaseline = "middle";
        ctx.fillText(it === "b" ? "🎈" : it === "r" ? "💧" : "👟", X + TS / 2, Y + TS / 2 + 1 + Math.sin(t * 4 + x) * 2);
      }
    }
    // su sıçraması
    for (const s of G.splashes) {
      const k = s.t / SPLASH;
      ctx.fillStyle = `rgba(76,201,240,${0.35 + 0.55 * k})`;
      ctx.beginPath(); ctx.roundRect ? ctx.roundRect(s.x * TS + 4, s.y * TS + 4, TS - 8, TS - 8, 12) : ctx.rect(s.x * TS + 4, s.y * TS + 4, TS - 8, TS - 8); ctx.fill();
      ctx.fillStyle = `rgba(255,255,255,${0.6 * k})`; ctx.beginPath(); ctx.arc(s.x * TS + 18, s.y * TS + 18, 5, 0, 7); ctx.fill();
    }
    // balonlar
    for (const b of G.balloons) {
      const X = (b.x + 0.5) * TS, Y = (b.y + 0.5) * TS, w = 1 + Math.sin(t * (6 + (FUSE - b.t) * 6)) * 0.08;
      ctx.save(); ctx.translate(X, Y); ctx.scale(w, 2 - w);
      ctx.fillStyle = b.owner === 0 ? "#4CC9F0" : "#FF8FB1";
      ctx.beginPath(); ctx.arc(0, 0, 16, 0, 7); ctx.fill();
      ctx.fillStyle = "rgba(255,255,255,.55)"; ctx.beginPath(); ctx.ellipse(-6, -6, 4, 6, -0.5, 0, 7); ctx.fill();
      ctx.restore();
      ctx.fillStyle = b.owner === 0 ? "#2E9FC4" : "#D9668A"; ctx.beginPath(); ctx.moveTo(X - 3, Y + 16); ctx.lineTo(X + 3, Y + 16); ctx.lineTo(X, Y + 21); ctx.fill();
    }
    for (const p of G.pl) drawPlayer(p, t);
    for (const f of G.fx) {
      const a = Math.max(0, 1 - f.t / f.life); ctx.globalAlpha = a;
      if (f.k === "txt") { ctx.font = "800 20px Rubik, sans-serif"; ctx.textAlign = "center"; ctx.fillStyle = "#fff"; ctx.fillText(f.s, (f.x + 0.5) * TS, (f.y + 0.2 - f.t) * TS); }
      else { ctx.fillStyle = f.k === "wood" ? "#8A5526" : "#4CC9F0"; ctx.fillRect(f.x * TS - 3, f.y * TS - 3, 6, 6); }
      ctx.globalAlpha = 1;
    }
    // süre ve mesaj
    const left = Math.max(0, ROUND_T - G.t);
    if (left < 20 && !G.over) { ctx.fillStyle = "#fff"; ctx.font = "800 22px Rubik, sans-serif"; ctx.textAlign = "center"; ctx.fillText(`⏱ ${Math.ceil(left)}`, GW * TS / 2, 30); }
    if (G.msgT > 0) {
      ctx.globalAlpha = Math.min(1, G.msgT * 2);
      ctx.font = "800 48px Rubik, sans-serif"; ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.lineWidth = 8; ctx.strokeStyle = "rgba(10,40,20,.8)"; ctx.fillStyle = "#fff";
      ctx.strokeText(G.msg, GW * TS / 2, GH * TS / 2); ctx.fillText(G.msg, GW * TS / 2, GH * TS / 2);
      ctx.globalAlpha = 1;
    }
    if (paused) { ctx.fillStyle = "rgba(0,0,0,.45)"; ctx.fillRect(0, 0, GW * TS, GH * TS); ctx.fillStyle = "#fff"; ctx.font = "800 40px Rubik, sans-serif"; ctx.textAlign = "center"; ctx.fillText("Duraklatıldı", GW * TS / 2, GH * TS / 2); }
  }
  function renderHud() {
    for (const i of [0, 1]) {
      $("n" + i).textContent = CFG.names[i]; $("p" + i).textContent = M ? M.pts[i] : 0;
      $("h" + i).textContent = G ? "💧".repeat(Math.max(0, G.pl[i].hearts)) : "";
    }
    $("round").textContent = M ? `${M.round}. raund · ${CFG.win} kazanır` : "";
    $("pad1").hidden = CFG.mode === "ai";
  }

  /* ---------- girdi ---------- */
  let order = 0;
  const KM = { w: [0, "u"], s: [0, "d"], a: [0, "l"], d: [0, "r"], " ": [0, "b"], e: [0, "b"],
               arrowup: [1, "u"], arrowdown: [1, "d"], arrowleft: [1, "l"], arrowright: [1, "r"], enter: [1, "b"], "0": [1, "b"], shift: [1, "b"] };
  function setKey(e, on) {
    const m = KM[e.key.toLowerCase()];
    if (!m || !$("menu").hidden || !$("end").hidden) return;
    const pi = CFG.mode === "ai" ? 0 : m[0]; // tek oyunculu modda oklar da maviyi yönetsin
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
  function syncForm() { $("f-ai").hidden = form.mode.value !== "ai"; if (form.mode.value === "ai") { if ($("in1").value === "Egemen") $("in1").value = "Bilgisayar"; $("sh1").checked = false; } else if ($("in1").value === "Bilgisayar") $("in1").value = "Egemen"; }
  function fillForm() {
    form.mode.value = CFG.mode; form.ai.value = String(CFG.ai); form.win.value = String(CFG.win);
    $("in0").value = CFG.names[0]; $("in1").value = CFG.names[1]; $("sh0").checked = CFG.shield[0]; $("sh1").checked = CFG.shield[1];
    syncForm();
  }
  form.addEventListener("change", (e) => { if (e.target.name === "mode") syncForm(); });
  form.addEventListener("submit", (e) => {
    e.preventDefault(); audio();
    CFG = { mode: form.mode.value, ai: +form.ai.value, win: +form.win.value,
      names: [$("in0").value.trim() || "Mavi", $("in1").value.trim() || (form.mode.value === "ai" ? "Bilgisayar" : "Kırmızı")],
      shield: [$("sh0").checked, $("sh1").checked] };
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
  M = { pts: [0, 0], round: 0 }; newRound(); G.msgT = 0;
  requestAnimationFrame(loop);

  // test kancası
  window.__su = { get G() { return G; }, get M() { return M; }, update, newMatch, newRound, drop, blastTiles, explode, keys, setHeadless: (h) => { headless = h; },
    setCFG: (c) => { CFG = Object.assign(CFG, c); }, aiOn: (i, lvl) => { G.pl[i].ai = { lvl, think: 0, path: [] }; } };
})();
