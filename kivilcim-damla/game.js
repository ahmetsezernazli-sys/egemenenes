/* Kıvılcım ve Damla — iki kişilik işbirliği platform oyunu */
(() => {
  "use strict";
  const $ = (id) => document.getElementById(id);
  const cv = $("cv"), ctx = cv.getContext("2d"), stage = $("stage");
  const SAVE_KEY = "kivilcim-damla";
  const T = 32, COLS = 30, ROWS = 17;

  /* ---------- bölümler ----------
     # duvar · L lav · W su · G balçık · r/b elmas · R/B çıkış kapısı · 1/2 başlangıç
     X Y Z kapı (kapalıyken duvar) · x y z düğme (plates: hangi kapıyı açar) · k m kaldıraç (levers: hangi kapıyı açar/kapar) */
  const EMPTY = "#............................#";
  const LEVELS = [
    { nm: "İlk Adımlar", par: 40,
      hint: "Kıvılcım lavda yürüyebilir ama suya giremez. Damla suda yüzebilir ama lava giremez. Yeşil balçığa ikiniz de giremezsiniz, üstünden zıplayın!",
      map: ["##############################", EMPTY, EMPTY, EMPTY, EMPTY, EMPTY, EMPTY, EMPTY, EMPTY, EMPTY, EMPTY, EMPTY, EMPTY,
        "#..........r.....b...........#",
        "#........r###..b###..........#",
        "#12.....LLL...WWW....GG...R.B#",
        "##############################"] },
    { nm: "Düğmeler", par: 60, plates: { x: "X", y: "X", z: "Y", w: "Y" },
      hint: "Düğmeye basılı tutan, kapıyı arkadaşına açar. Kapının öbür yanındaki düğmeyle de sen ona açabilirsin!",
      map: ["##############################", EMPTY, EMPTY, EMPTY, EMPTY, EMPTY, EMPTY, EMPTY, EMPTY, EMPTY, EMPTY,
        "#...........#......#.........#",
        "#...........X......Y.........#",
        "#...........X......Y.........#",
        "#........b..X...r..Y...rb....#",
        "#12...x.....X.y..z.Y.w....R.B#",
        "##############################"] },
    { nm: "Kaldıraç", par: 75, plates: { x: "X" }, levers: { k: "K" },
      hint: "Kıvılcım yukarıdan, lavların içinden gider ve kaldıracı çeker. Damla aşağıdan, suyun içinden gider ve düğmeye basar.",
      map: ["##############################", EMPTY, EMPTY, EMPTY,
        "#.......................#....#",
        "#.......................X....#",
        "#.......................X....#",
        "#.......................X....#",
        "#...........r...........X....#",
        "#.........LLLLL...k..r..X....#",
        "#......###################..##",
        "#...............K............#",
        "#....##.........K............#",
        "#...............K............#",
        "#.##......b.....K............#",
        "#12.....WWWWW...K...x.b..R.B.#",
        "##############################"] },
    { nm: "Kule", par: 90, plates: { x: "X", y: "X" },
      hint: "Birlikte yukarı tırmanın! En üstteki kapı, düğmeye basılı tutulunca açılır.",
      map: ["##############################",
        "#......X.....................#",
        "#......X.....................#",
        "#R.By..X.....................#",
        "#######......................#",
        "#........r..xb...............#",
        "#.......######...............#",
        "#..............bGG.r.........#",
        "#..............######........#",
        "#.....................r.WW.b.#",
        "#.....................######.#",
        "#..............b..L.r........#",
        "#..............######........#",
        "#.......b...r................#",
        "#.......######...............#",
        "#12..........................#",
        "##############################"] },
    { nm: "Ayrı Yollar", par: 50, levers: { k: "K", m: "M" },
      hint: "Kıvılcım sola, Damla sağa gider. Her biri kendi kaldıracını çekince arkadaşının kapısı açılır.",
      map: ["##############################", EMPTY, EMPTY, EMPTY, EMPTY, EMPTY, EMPTY, EMPTY, EMPTY, EMPTY,
        "#...#....................#...#",
        "#...M....................K...#",
        "#...M....................K...#",
        "#...M.....r........b.....K...#",
        "#...M....................K...#",
        "#.R.M.k.LLLLL.12.WWWWW.m.K.B.#",
        "##############################"] },
  ];

  /* ---------- kayıt ---------- */
  let SAVE = { un: 1, st: {} };
  try { SAVE = Object.assign(SAVE, JSON.parse(localStorage.getItem(SAVE_KEY) || "{}")); } catch (e) {}
  const store = () => { try { localStorage.setItem(SAVE_KEY, JSON.stringify(SAVE)); } catch (e) {} };

  /* ---------- ses ---------- */
  let AC = null, soundOn = true, lastT = {};
  function audio() { try { AC = AC || new (window.AudioContext || window.webkitAudioContext)(); if (AC.state === "suspended") AC.resume(); } catch (e) {} }
  function tone(f, d = 0.1, type = "triangle", vol = 0.06, slide = 0, key = "") {
    if (!soundOn || !AC) return;
    const now = performance.now(); if (key) { if (now - (lastT[key] || 0) < 80) return; lastT[key] = now; }
    const t = AC.currentTime, o = AC.createOscillator(), g = AC.createGain();
    o.type = type; o.frequency.setValueAtTime(f, t);
    if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(30, f + slide), t + d);
    g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + d);
    o.connect(g).connect(AC.destination); o.start(t); o.stop(t + d + 0.02);
  }
  const SND = {
    jump: (i) => tone(i ? 520 : 380, 0.1, "square", 0.035, 220, "j" + i),
    gem: () => { tone(988, 0.08, "sine", 0.06); setTimeout(() => tone(1318, 0.1, "sine", 0.05), 60); },
    die: (i) => tone(i ? 700 : 300, 0.4, "sawtooth", 0.05, i ? -500 : -200),
    gate: () => tone(220, 0.18, "triangle", 0.04, 80, "gate"),
    lever: () => { tone(300, 0.06, "square", 0.05); setTimeout(() => tone(450, 0.08, "square", 0.05), 70); },
    win: () => [523, 659, 784, 1046].forEach((f, i) => setTimeout(() => tone(f, 0.2, "triangle", 0.07), i * 130)),
  };
  function say(text) {
    if (!soundOn || !("speechSynthesis" in window)) return;
    try {
      speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(text); u.lang = "tr-TR"; u.rate = 1;
      const v = speechSynthesis.getVoices().find(v => v.lang && v.lang.toLowerCase().startsWith("tr")); if (v) u.voice = v;
      speechSynthesis.speak(u);
    } catch (e) {}
  }

  /* ---------- durum ---------- */
  const PLAYERS = [
    { nm: "Kıvılcım", safe: "L", col: "#FF7A2F", dark: "#C2410C", light: "#FFD08A" },
    { nm: "Damla", safe: "W", col: "#3D8BFD", dark: "#1D4ED8", light: "#BFE0FF" },
  ];
  const keys = [{ l: 0, r: 0, j: 0 }, { l: 0, r: 0, j: 0 }];
  let L = null, lvIdx = 0, easy = true, paused = false;
  const PW = 20, PH = 28, SPD = 190, JUMP = 500, GRAV = 1400, FALL = 720;

  function loadLevel(i, quiet) {
    lvIdx = i;
    const D = LEVELS[i];
    const grid = D.map.map(r => r.split(""));
    L = { D, grid, gems: [], starts: [], doors: {}, plates: [], levers: [], gates: {}, p: [], t: 0, done: false, deaths: 0, msgs: [], fx: [] };
    for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) {
      const ch = grid[r][c];
      if (ch === "r" || ch === "b") { L.gems.push({ c, r, who: ch === "r" ? 0 : 1, got: false }); grid[r][c] = "."; }
      else if (ch === "1" || ch === "2") { L.starts[+ch - 1] = { c, r }; grid[r][c] = "."; }
      else if (ch === "R" || ch === "B") { L.doors[ch === "R" ? 0 : 1] = { c, r }; grid[r][c] = "."; }
      else if (D.plates && D.plates[ch]) { L.plates.push({ c, r, gate: D.plates[ch], on: false }); grid[r][c] = "."; }
      else if (D.levers && D.levers[ch]) { L.levers.push({ c, r, gate: D.levers[ch], on: false, cd: 0 }); grid[r][c] = "."; }
      else if (/[XYZKM]/.test(ch)) { (L.gates[ch] = L.gates[ch] || { cells: [], open: 0, want: false }).cells.push({ c, r }); }
    }
    L.p = [0, 1].map(i => spawn(i));
    // görünüm: boş üst satırları kırp (içerikten 3 satır yukarısı kalsın)
    let top = ROWS - 1; for (let r = 1; r < ROWS - 1; r++) if (grid[r].slice(1, -1).some(ch => ch !== ".") || D.map[r].slice(1, -1).split("").some(ch => ch !== ".")) { top = r; break; }
    L.top = Math.max(0, Math.min(top - 3, ROWS - 8)); resize();
    L.totals = [L.gems.filter(g => g.who === 0).length, L.gems.filter(g => g.who === 1).length];
    keys.forEach(k => (k.l = k.r = k.j = 0));
    renderHud();
    if (!quiet) say(`${i + 1}. bölüm, ${D.nm}. ${D.hint}`);
  }
  function spawn(i) {
    const s = L.starts[i];
    return { i, x: s.c * T + T / 2, y: (s.r + 1) * T, vx: 0, vy: 0, ground: false, dead: 0, inDoor: false, face: 1, jumpHeld: false, squash: 0 };
  }

  /* ---------- karo sorguları ---------- */
  const tileAt = (c, r) => (c < 0 || r < 0 || c >= COLS || r >= ROWS ? "#" : L.grid[r][c]);
  function solidAt(c, r) {
    const ch = tileAt(c, r);
    if (ch === "#") return true;
    if (L.gates[ch]) return L.gates[ch].open < 0.5;
    return false;
  }
  const liquid = (ch) => (ch === "L" || ch === "W" || ch === "G" ? ch : null);

  /* ---------- fizik ---------- */
  function moveX(p, dx) {
    p.x += dx;
    const top = p.y - PH, bot = p.y - 0.01, left = p.x - PW / 2, right = p.x + PW / 2;
    const r0 = Math.floor(top / T), r1 = Math.floor(bot / T);
    if (dx > 0) { const c = Math.floor(right / T); for (let r = r0; r <= r1; r++) if (solidAt(c, r)) { p.x = c * T - PW / 2 - 0.01; p.vx = 0; break; } }
    else if (dx < 0) { const c = Math.floor(left / T); for (let r = r0; r <= r1; r++) if (solidAt(c, r)) { p.x = (c + 1) * T + PW / 2 + 0.01; p.vx = 0; break; } }
  }
  function moveY(p, dy) {
    p.y += dy; p.ground = false;
    const top = p.y - PH, left = p.x - PW / 2 + 0.01, right = p.x + PW / 2 - 0.01;
    const c0 = Math.floor(left / T), c1 = Math.floor(right / T);
    if (dy > 0) { const r = Math.floor(p.y / T); for (let c = c0; c <= c1; c++) if (solidAt(c, r)) { p.y = r * T; if (p.vy > 300) p.squash = 0.12; p.vy = 0; p.ground = true; break; } }
    else if (dy < 0) { const r = Math.floor(top / T); for (let c = c0; c <= c1; c++) if (solidAt(c, r)) { p.y = (r + 1) * T + PH; p.vy = 0; break; } }
  }
  const overlaps = (p, c, r, pad = 0) => p.x + PW / 2 > c * T + pad && p.x - PW / 2 < (c + 1) * T - pad && p.y > r * T + pad && p.y - PH < (r + 1) * T - pad;

  function stepPlayer(p, dt) {
    if (p.dead > 0) { p.dead -= dt; if (p.dead <= 0) respawn(p); return; }
    const k = keys[p.i];
    const want = (k.r ? 1 : 0) - (k.l ? 1 : 0);
    const acc = p.ground ? 2400 : 1500;
    if (want) { p.vx += want * acc * dt; p.face = want; } else { const f = (p.ground ? 2600 : 500) * dt; p.vx = Math.abs(p.vx) <= f ? 0 : p.vx - Math.sign(p.vx) * f; }
    p.vx = Math.max(-SPD, Math.min(SPD, p.vx));
    if (k.j && p.ground && !p.jumpHeld) { p.vy = -JUMP; p.ground = false; SND.jump(p.i); }
    p.jumpHeld = !!k.j;
    if (!k.j && p.vy < -200) p.vy += GRAV * dt * 1.2; // kısa basışta alçak zıplama
    p.vy = Math.min(FALL, p.vy + GRAV * dt);
    moveX(p, p.vx * dt); moveY(p, p.vy * dt);
    p.squash = Math.max(0, p.squash - dt);
    // sıvılar: ayak bölgesi
    const c0 = Math.floor((p.x - PW / 2 + 3) / T), c1 = Math.floor((p.x + PW / 2 - 3) / T), rf = Math.floor((p.y - 6) / T);
    for (let c = c0; c <= c1; c++) {
      const lq = liquid(tileAt(c, rf));
      if (lq && lq !== PLAYERS[p.i].safe && p.y > rf * T + 12) { die(p, lq); return; }
    }
    // elmaslar
    for (const g of L.gems) if (!g.got && g.who === p.i && overlaps(p, g.c, g.r, 6)) { g.got = true; SND.gem(); burst(g.c * T + 16, g.r * T + 16, PLAYERS[p.i].col, 10); renderHud(); }
    // kaldıraçlar
    for (const lv of L.levers) {
      lv.cd = Math.max(0, lv.cd - dt);
      if (overlaps(p, lv.c, lv.r, 8) && lv.cd <= 0 && !lv.touch?.[p.i]) {
        lv.on = !lv.on; lv.cd = 0.6; SND.lever();
        L.msgs.push({ s: lv.on ? "Kaldıraç çekildi!" : "Kaldıraç geri!", t: 0, life: 1.2 });
      }
      lv.touch = lv.touch || [false, false];
      lv.touch[p.i] = overlaps(p, lv.c, lv.r, 8);
    }
    // kapı
    const d = L.doors[p.i];
    p.inDoor = d && p.ground && Math.abs(p.x - (d.c * T + T / 2)) < 12 && Math.floor((p.y - 1) / T) === d.r;
    if (p.y > ROWS * T + 60) die(p, "G");
  }
  function die(p, why) {
    p.dead = 0.9; L.deaths++;
    SND.die(p.i);
    burst(p.x, p.y - 14, why === "G" ? "#7BD35A" : PLAYERS[p.i].col, 18);
    const msg = p.i === 0 ? (why === "W" ? "Kıvılcım suya düşüp söndü!" : "Kıvılcım balçığa düştü!") : (why === "L" ? "Damla lavda buharlaştı!" : "Damla balçığa düştü!");
    L.msgs.push({ s: msg, t: 0, life: 1.6 });
    if (!easy) { L.restartIn = 1.1; }
  }
  function respawn(p) {
    if (!easy) return;
    const np = spawn(p.i); Object.assign(p, np);
  }

  function update(dt) {
    if (!L || L.done) return;
    L.t += dt;
    if (L.restartIn) { L.restartIn -= dt; if (L.restartIn <= 0) { const keep = L.deaths; loadLevel(lvIdx, true); L.deaths = keep; } return; }
    // düğmeler ve kapılar
    for (const pl of L.plates) pl.on = L.p.some(p => !p.dead && p.ground && overlaps(p, pl.c, pl.r, 4) && p.y >= (pl.r + 1) * T - 2);
    for (const [g, gate] of Object.entries(L.gates)) {
      const want = L.plates.some(pl => pl.gate === g && pl.on) || L.levers.some(lv => lv.gate === g && lv.on);
      if (want !== gate.want) { gate.want = want; SND.gate(); }
      // içinde oyuncu varken kapı kapanmaz
      const blocked = !want && L.p.some(p => !p.dead && gate.cells.some(cl => overlaps(p, cl.c, cl.r, 1)));
      const target = want || blocked ? 1 : 0;
      gate.open += Math.sign(target - gate.open) * Math.min(Math.abs(target - gate.open), dt * 3.5);
    }
    const n = 3, h = dt / n;
    for (let s = 0; s < n; s++) for (const p of L.p) stepPlayer(p, h);
    for (const f of L.fx) { f.t += dt; f.x += f.vx * dt; f.y += f.vy * dt; f.vy += 600 * dt; }
    L.fx = L.fx.filter(f => f.t < f.life);
    for (const m of L.msgs) m.t += dt;
    L.msgs = L.msgs.filter(m => m.t < m.life);
    if (L.p.every(p => p.inDoor && !p.dead)) finish();
    $("time").textContent = fmt(L.t);
  }
  const fmt = (t) => `${Math.floor(t / 60)}:${String(Math.floor(t % 60)).padStart(2, "0")}`;
  function burst(x, y, col, n) { for (let i = 0; i < n; i++) { const a = Math.random() * 6.28, v = 60 + Math.random() * 200; L.fx.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 120, t: 0, life: 0.6 + Math.random() * 0.4, col }); } }

  function finish() {
    L.done = true;
    SND.win();
    const allGems = L.gems.every(g => g.got), fast = L.t <= L.D.par;
    const stars = 1 + (allGems ? 1 : 0) + (fast ? 1 : 0);
    const n = lvIdx + 1;
    SAVE.st[n] = Math.max(SAVE.st[n] || 0, stars);
    SAVE.un = Math.max(SAVE.un, Math.min(LEVELS.length, n + 1));
    store();
    const last = n >= LEVELS.length;
    $("done-title").textContent = last ? "Bütün bölümler bitti!" : "Bölüm tamam!";
    $("done-stars").textContent = "★".repeat(stars) + "☆".repeat(3 - stars);
    const got = L.gems.filter(g => g.got).length;
    $("done-text").textContent = `Süre ${fmt(L.t)} (hedef ${fmt(L.D.par)}) · Elmas ${got}/${L.gems.length}` + (allGems ? "" : " — hepsini topla ⭐") ;
    $("done-next").hidden = last;
    say(last ? "Harika! Bütün bölümleri birlikte bitirdiniz!" : "Harika! Birlikte başardınız!");
    setTimeout(() => { $("done").hidden = false; ($("done-next").hidden ? $("done-retry") : $("done-next")).focus(); }, 700);
  }

  /* ---------- çizim ---------- */
  let W = 0, H = 0, sc = 1, ox = 0, oy = 0, dpr = 1;
  function resize() {
    const r = stage.getBoundingClientRect(); dpr = Math.min(2, window.devicePixelRatio || 1);
    W = r.width; H = r.height; cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr);
    const top = L ? L.top : 0, VR = ROWS - top;
    sc = Math.min(W / (COLS * T), H / (VR * T)); ox = (W - COLS * T * sc) / 2; oy = (H - VR * T * sc) / 2 - top * T * sc;
  }
  function drawTiles(t) {
    for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) {
      const ch = L.grid[r][c], x = c * T, y = r * T;
      if (ch === "#") {
        ctx.fillStyle = (c * 7 + r * 3) % 5 ? "#4A4266" : "#524A70"; ctx.fillRect(x, y, T, T);
        ctx.fillStyle = "rgba(255,255,255,.06)"; ctx.fillRect(x, y, T, 3);
        ctx.strokeStyle = "rgba(0,0,0,.25)"; ctx.lineWidth = 1; ctx.strokeRect(x + 0.5, y + 0.5, T - 1, T - 1);
        if (r > 0 && tileAt(c, r - 1) !== "#" && !liquid(tileAt(c, r - 1))) { ctx.fillStyle = "#6D6494"; ctx.fillRect(x, y, T, 4); }
      } else if (liquid(ch)) {
        const col = ch === "L" ? ["#FF5A1F", "#FFB02E"] : ch === "W" ? ["#2F6FE0", "#7FC0FF"] : ["#4FA83A", "#9BE36E"];
        const surf = y + 12;
        ctx.fillStyle = col[0];
        ctx.beginPath(); ctx.moveTo(x, y + T);
        for (let i = 0; i <= 8; i++) ctx.lineTo(x + i * 4, surf + Math.sin(t * 4 + (c * 8 + i) * 0.7) * 2.5);
        ctx.lineTo(x + T, y + T); ctx.closePath(); ctx.fill();
        ctx.fillStyle = col[1]; ctx.globalAlpha = 0.6;
        ctx.fillRect(x, surf + 3 + Math.sin(t * 3 + c) * 1.5, T, 2.5); ctx.globalAlpha = 1;
      }
    }
    // kapılar (geçitler)
    for (const [g, gate] of Object.entries(L.gates)) for (const cl of gate.cells) {
      const x = cl.c * T, y = cl.r * T, k = gate.open;
      const col = g === "X" || g === "K" ? "#FFD166" : "#C77DFF";
      ctx.fillStyle = col; ctx.globalAlpha = 1 - k * 0.8;
      for (let i = 0; i < 3; i++) ctx.fillRect(x + 5 + i * 9, y + k * T * 0.9, 5, T * (1 - k * 0.9));
      ctx.globalAlpha = 1;
      ctx.fillStyle = "rgba(0,0,0,.3)"; ctx.fillRect(x, y, T, 3);
    }
  }
  function drawDoor(i, t) {
    const d = L.doors[i]; if (!d) return;
    const x = d.c * T, y = d.r * T, P = PLAYERS[i], inside = L.p[i] && L.p[i].inDoor;
    ctx.fillStyle = "rgba(0,0,0,.35)"; ctx.fillRect(x - 6, y - T + 2, T + 12, 2 * T - 2);
    ctx.fillStyle = inside ? P.light : P.dark;
    ctx.beginPath(); ctx.moveTo(x - 2, y + T); ctx.lineTo(x - 2, y - T + 14); ctx.arc(x + T / 2, y - T + 14, T / 2 + 2, Math.PI, 0); ctx.lineTo(x + T + 2, y + T); ctx.closePath(); ctx.fill();
    ctx.fillStyle = inside ? "#fff" : P.col;
    ctx.save(); ctx.translate(x + T / 2, y - 4);
    if (i === 0) { ctx.beginPath(); ctx.moveTo(0, -12); ctx.quadraticCurveTo(10, 0, 0, 10); ctx.quadraticCurveTo(-10, 0, 0, -12); ctx.fill(); }
    else { ctx.beginPath(); ctx.moveTo(0, -12); ctx.quadraticCurveTo(9, 2, 0, 10); ctx.quadraticCurveTo(-9, 2, 0, -12); ctx.fill(); }
    ctx.restore();
    if (inside) { ctx.strokeStyle = `rgba(255,255,255,${0.5 + 0.4 * Math.sin(t * 8)})`; ctx.lineWidth = 2; ctx.strokeRect(x - 4, y - T + 2, T + 8, 2 * T - 4); }
  }
  function drawPlayer(p, t) {
    if (p.dead > 0) return;
    const P = PLAYERS[p.i], x = p.x, y = p.y;
    const sq = p.squash > 0 ? 1 + p.squash * 2 : 1, st = 1 / sq;
    ctx.save(); ctx.translate(x, y); ctx.scale(sq, st);
    // gövde
    ctx.fillStyle = P.dark; ctx.fillRect(-7, -12, 14, 10);
    ctx.fillStyle = "#2B2440"; ctx.fillRect(-7, -3, 5, 3); ctx.fillRect(2, -3, 5, 3);
    // kafa
    const bob = Math.sin(t * 12) * (Math.abs(p.vx) > 20 && p.ground ? 1.2 : 0);
    ctx.translate(0, -20 + bob);
    ctx.fillStyle = P.col;
    if (p.i === 0) { // alev
      ctx.beginPath(); ctx.moveTo(-11, 2); ctx.quadraticCurveTo(-12, -10, -4, -14 + Math.sin(t * 15) * 2);
      ctx.quadraticCurveTo(-3, -8, 0, -18 + Math.sin(t * 11) * 2); ctx.quadraticCurveTo(4, -10, 6, -15 + Math.sin(t * 13) * 2);
      ctx.quadraticCurveTo(13, -6, 11, 2); ctx.quadraticCurveTo(0, 10, -11, 2); ctx.fill();
      ctx.fillStyle = P.light; ctx.beginPath(); ctx.ellipse(0, 0, 6, 6, 0, 0, 7); ctx.fill();
    } else { // damla
      ctx.beginPath(); ctx.moveTo(0, -17); ctx.quadraticCurveTo(12, -2, 10, 3); ctx.quadraticCurveTo(0, 12, -10, 3); ctx.quadraticCurveTo(-12, -2, 0, -17); ctx.fill();
      ctx.fillStyle = "rgba(255,255,255,.45)"; ctx.beginPath(); ctx.ellipse(-4, -4, 2.5, 4, -0.4, 0, 7); ctx.fill();
    }
    // gözler
    const ex = p.face * 2;
    ctx.fillStyle = "#fff"; ctx.beginPath(); ctx.ellipse(-4 + ex, -1, 3, 3.6, 0, 0, 7); ctx.ellipse(4 + ex, -1, 3, 3.6, 0, 0, 7); ctx.fill();
    ctx.fillStyle = "#1A1426"; ctx.beginPath(); ctx.arc(-4 + ex * 1.5, -0.5, 1.6, 0, 7); ctx.arc(4 + ex * 1.5, -0.5, 1.6, 0, 7); ctx.fill();
    ctx.restore();
  }
  function draw() {
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = "#15121F"; ctx.fillRect(0, 0, cv.width, cv.height);
    if (!L) return;
    ctx.setTransform(sc * dpr, 0, 0, sc * dpr, ox * dpr, oy * dpr);
    ctx.save(); ctx.beginPath(); ctx.rect(0, L.top * T, COLS * T, (ROWS - L.top) * T); ctx.clip();
    drawScene();
    ctx.restore();
  }
  function drawScene() {
    const t = performance.now() / 1000;
    // arka plan
    ctx.fillStyle = "#26203A"; ctx.fillRect(0, L.top * T, COLS * T, (ROWS - L.top) * T);
    ctx.fillStyle = "rgba(255,255,255,.025)";
    for (let r = 0; r < ROWS; r += 2) for (let c = (r / 2) % 2; c < COLS; c += 2) ctx.fillRect(c * T, r * T, T, T);
    drawDoor(0, t); drawDoor(1, t);
    drawTiles(t);
    // düğmeler
    for (const pl of L.plates) {
      const x = pl.c * T, y = (pl.r + 1) * T, h = pl.on ? 3 : 7;
      ctx.fillStyle = pl.gate === "X" || pl.gate === "K" ? "#FFD166" : "#C77DFF";
      ctx.fillRect(x + 4, y - h, T - 8, h); ctx.fillStyle = "rgba(0,0,0,.3)"; ctx.fillRect(x + 2, y - 2, T - 4, 2);
    }
    // kaldıraçlar
    for (const lv of L.levers) {
      const x = lv.c * T + T / 2, y = (lv.r + 1) * T;
      ctx.fillStyle = "#6D6494"; ctx.fillRect(x - 10, y - 6, 20, 6);
      ctx.strokeStyle = "#ddd"; ctx.lineWidth = 3; ctx.lineCap = "round";
      const a = lv.on ? 0.6 : -0.6;
      ctx.beginPath(); ctx.moveTo(x, y - 5); ctx.lineTo(x + Math.sin(a) * 18, y - 5 - Math.cos(a) * 18); ctx.stroke();
      ctx.fillStyle = lv.gate === "K" ? "#FFD166" : "#C77DFF"; ctx.beginPath(); ctx.arc(x + Math.sin(a) * 18, y - 5 - Math.cos(a) * 18, 4.5, 0, 7); ctx.fill();
    }
    // elmaslar
    for (const g of L.gems) {
      if (g.got) continue;
      const x = g.c * T + T / 2, y = g.r * T + T / 2 + Math.sin(t * 3 + g.c) * 2, P = PLAYERS[g.who];
      ctx.fillStyle = P.col; ctx.beginPath(); ctx.moveTo(x, y - 9); ctx.lineTo(x + 8, y); ctx.lineTo(x, y + 9); ctx.lineTo(x - 8, y); ctx.closePath(); ctx.fill();
      ctx.fillStyle = "rgba(255,255,255,.6)"; ctx.beginPath(); ctx.moveTo(x, y - 9); ctx.lineTo(x + 3, y - 2); ctx.lineTo(x - 3, y - 2); ctx.closePath(); ctx.fill();
    }
    for (const p of L.p) drawPlayer(p, t);
    for (const f of L.fx) { ctx.globalAlpha = Math.max(0, 1 - f.t / f.life); ctx.fillStyle = f.col; ctx.fillRect(f.x - 2.5, f.y - 2.5, 5, 5); }
    ctx.globalAlpha = 1;
    // mesajlar
    const m = L.msgs[L.msgs.length - 1];
    if (m) {
      ctx.globalAlpha = Math.min(1, (m.life - m.t) * 3);
      ctx.font = "800 22px Rubik, sans-serif"; ctx.textAlign = "center"; ctx.textBaseline = "middle";
      const w = ctx.measureText(m.s).width + 30;
      ctx.fillStyle = "rgba(10,8,18,.8)"; ctx.fillRect(COLS * T / 2 - w / 2, L.top * T + 46, w, 38);
      ctx.fillStyle = "#fff"; ctx.fillText(m.s, COLS * T / 2, L.top * T + 66);
      ctx.globalAlpha = 1;
    }
    if (L.p.some(p => p.inDoor) && !L.done && !L.p.every(p => p.inDoor)) {
      ctx.font = "700 16px Rubik, sans-serif"; ctx.textAlign = "center"; ctx.fillStyle = "rgba(255,255,255,.75)";
      ctx.fillText(`${PLAYERS[L.p.findIndex(p => !p.inDoor)].nm} bekleniyor…`, COLS * T / 2, L.top * T + 24);
    }
  }
  function renderHud() {
    if (!L) return;
    $("lvl-name").textContent = `${lvIdx + 1}. ${L.D.nm}`;
    $("gems-r").textContent = `${L.gems.filter(g => g.who === 0 && g.got).length}/${L.totals[0]}`;
    $("gems-b").textContent = `${L.gems.filter(g => g.who === 1 && g.got).length}/${L.totals[1]}`;
  }

  /* ---------- menü ---------- */
  function renderMenu() {
    $("lvgrid").innerHTML = LEVELS.map((D, i) => {
      const n = i + 1, st = SAVE.st[n] || 0, lock = n > SAVE.un;
      return `<button class="lv" type="button" data-i="${i}" ${lock ? "disabled" : ""} aria-label="${n}. bölüm ${D.nm}${lock ? ", kilitli" : ""}"><b>${lock ? "🔒" : n}</b><small>${st ? "★".repeat(st) : ""}</small></button>`;
    }).join("");
    $("lvgrid").querySelectorAll(".lv").forEach(b => b.addEventListener("click", () => { audio(); easy = $("easy").checked; $("menu").hidden = true; loadLevel(+b.dataset.i); }));
  }
  $("menu-btn").addEventListener("click", () => { renderMenu(); $("menu").hidden = false; });
  $("menu").addEventListener("click", (e) => { if (e.target === $("menu") && L && !L.done) $("menu").hidden = true; });
  $("easy").addEventListener("change", () => { easy = $("easy").checked; });
  $("restart").addEventListener("click", () => { if (L) { audio(); $("done").hidden = true; loadLevel(lvIdx); } });
  $("done-next").addEventListener("click", () => { $("done").hidden = true; loadLevel(lvIdx + 1); });
  $("done-retry").addEventListener("click", () => { $("done").hidden = true; loadLevel(lvIdx); });
  $("sound").addEventListener("click", () => {
    soundOn = !soundOn; $("ic-on").hidden = !soundOn; $("ic-off").hidden = soundOn;
    $("sound").setAttribute("aria-pressed", soundOn); $("sound").setAttribute("aria-label", soundOn ? "Sesi kapat" : "Sesi aç");
    if (!soundOn && "speechSynthesis" in window) speechSynthesis.cancel();
  });

  /* ---------- girdi ---------- */
  const KEYMAP = { a: [0, "l"], d: [0, "r"], w: [0, "j"], arrowleft: [1, "l"], arrowright: [1, "r"], arrowup: [1, "j"] };
  function setKey(e, v) {
    const m = KEYMAP[e.key.toLowerCase()];
    if (!m || !$("menu").hidden || !$("done").hidden) return;
    e.preventDefault(); keys[m[0]][m[1]] = v;
  }
  document.addEventListener("keydown", (e) => {
    if ((e.key === "r" || e.key === "R") && $("menu").hidden && $("done").hidden && L) { loadLevel(lvIdx); return; }
    setKey(e, 1);
  });
  document.addEventListener("keyup", (e) => setKey(e, 0));
  window.addEventListener("blur", () => keys.forEach(k => (k.l = k.r = k.j = 0)));
  document.querySelectorAll(".pad button").forEach(btn => {
    const p = +btn.dataset.p, k = btn.dataset.k;
    btn.addEventListener("pointerdown", (e) => { e.preventDefault(); audio(); keys[p][k] = 1; btn.classList.add("on"); try { btn.setPointerCapture(e.pointerId); } catch (_) {} });
    const off = () => { keys[p][k] = 0; btn.classList.remove("on"); };
    btn.addEventListener("pointerup", off); btn.addEventListener("pointercancel", off); btn.addEventListener("lostpointercapture", off);
    btn.addEventListener("contextmenu", (e) => e.preventDefault());
  });

  /* ---------- döngü ---------- */
  let last = performance.now();
  function loop(now) {
    const dt = Math.min(1 / 30, (now - last) / 1000); last = now;
    const sr = stage.getBoundingClientRect();
    if (Math.abs(sr.width - W) > 0.5 || Math.abs(sr.height - H) > 0.5) resize();
    if (!paused && $("menu").hidden && $("done").hidden) update(dt);
    draw();
    requestAnimationFrame(loop);
  }
  resize();
  lvIdx = Math.min(SAVE.un, LEVELS.length) - 1;
  loadLevel(lvIdx); try { speechSynthesis.cancel(); } catch (e) {}
  renderMenu();
  requestAnimationFrame(loop);

  // test kancası
  window.__kd = { get L() { return L; }, LEVELS, keys, update, loadLevel, solidAt, tileAt, setEasy: (v) => { easy = v; }, save: () => SAVE,
    P: { PW, PH, SPD, JUMP, GRAV } };
})();
