/* Mücevher Madeni — üçlü eşleştirme (Enes için) */
(() => {
  "use strict";
  const $ = (id) => document.getElementById(id);
  const cv = $("cv"), ctx = cv.getContext("2d"), stage = $("stage");
  const SAVE_KEY = "mucevher-madeni";

  /* ---------- bölümler ----------
     harita: "." boş kare, "#" delik, "1"/"2" buz katmanı
     hedef: score (puan), collect [[renk, adet]…], ice (bütün buzlar)
     renkler: 0 kırmızı 1 turuncu 2 sarı 3 yeşil 4 mavi 5 mor */
  const FULL8 = Array(8).fill("........"), FULL9 = Array(9).fill(".........");
  const LEVELS = [
    { moves: 20, colors: 5, goal: { score: 2500 }, stars: [2500, 6000, 8500], map: FULL8 },
    { moves: 22, colors: 5, goal: { collect: [[0, 18], [4, 18]] }, stars: [0, 8000, 11000], map: FULL8 },
    { moves: 22, colors: 5, goal: { ice: true }, stars: [0, 9000, 12000],
      map: ["........", "........", "..1111..", "..1111..", "..1111..", "..1111..", "........", "........"] },
    { moves: 20, colors: 5, goal: { score: 4000 }, stars: [4000, 7000, 9500],
      map: ["##....##", "#......#", "........", "........", "........", "........", "#......#", "##....##"] },
    { moves: 27, colors: 6, goal: { collect: [[1, 25], [3, 25]] }, stars: [0, 7500, 10000], map: FULL8 },
    { moves: 24, colors: 6, goal: { ice: true }, stars: [0, 8000, 11000],
      map: ["........", "........", "........", "11111111", "11111111", "........", "........", "........"] },
    { moves: 25, colors: 6, goal: { score: 5000, collect: [[2, 20]] }, stars: [5000, 7000, 9500],
      map: ["##....##", "##....##", "........", "........", "........", "........", "##....##", "##....##"] },
    { moves: 32, colors: 6, goal: { ice: true }, stars: [0, 9000, 12000],
      map: ["11111111", "1......1", "1......1", "1......1", "1......1", "1......1", "1......1", "11111111"] },
    { moves: 25, colors: 6, goal: { ice: true }, stars: [0, 8000, 11000],
      map: ["........", "........", "..1111..", "..1221..", "..1221..", "..1111..", "........", "........"] },
    { moves: 26, colors: 6, goal: { collect: [[0, 30], [2, 30], [5, 30]] }, stars: [0, 9500, 12500], map: FULL9 },
    { moves: 27, colors: 6, goal: { ice: true }, stars: [0, 7500, 10000],
      map: ["###..###", "##....##", "#......#", "11111111", "11111111", "#......#", "##....##", "###..###"] },
    { moves: 24, colors: 6, goal: { score: 6000 }, stars: [6000, 8500, 11000], map: FULL8 },
    { moves: 32, colors: 6, goal: { ice: true }, stars: [0, 10000, 13000],
      map: ["........", "........", "........", "........", "........", "........", "11111111", "11111111"] },
    { moves: 32, colors: 6, goal: { collect: [[3, 40], [4, 40]] }, stars: [0, 10000, 13000], map: FULL9 },
    { moves: 32, colors: 6, goal: { ice: true }, stars: [0, 9500, 12500],
      map: ["1.1.1.1.", ".1.1.1.1", "1.1.1.1.", ".1.1.1.1", "1.1.1.1.", ".1.1.1.1", "1.1.1.1.", ".1.1.1.1"] },
    { moves: 30, colors: 6, goal: { ice: true, collect: [[5, 25]] }, stars: [0, 8500, 11500],
      map: ["111##111", "...##...", "........", "........", "........", "111##111", "...##...", "...##..."] },
    { moves: 28, colors: 6, goal: { score: 10000 }, stars: [10000, 12500, 15000], map: FULL9 },
    { moves: 34, colors: 6, goal: { ice: true }, stars: [0, 12500, 15500],
      map: ["........", ".222222.", ".222222.", ".222222.", ".222222.", ".222222.", ".222222.", "........"] },
    { moves: 24, colors: 6, goal: { collect: [[0, 20], [1, 20], [2, 20], [3, 20], [4, 20], [5, 20]] }, stars: [0, 10000, 13000], map: FULL9 },
    { moves: 36, colors: 6, goal: { ice: true, score: 9000 }, stars: [9000, 13000, 16000],
      map: ["111111111", "1.......1", "1.......1", "1..222..1", "1..222..1", "1..222..1", "1.......1", "1.......1", "111111111"] },
  ];

  const GEMS = [
    { f: "#E5484D", d: "#9E1F25", l: "#FF9B9E", nm: "kırmızı" },
    { f: "#F5922F", d: "#A9551A", l: "#FFC48A", nm: "turuncu" },
    { f: "#F7D038", d: "#A88A10", l: "#FFF0A0", nm: "sarı" },
    { f: "#3CB371", d: "#1E6E43", l: "#9EEBB9", nm: "yeşil" },
    { f: "#3D8BFD", d: "#1C4FA8", l: "#A9CCFF", nm: "mavi" },
    { f: "#A35BE0", d: "#5E2A92", l: "#D9B6FF", nm: "mor" },
  ];

  /* ---------- kayıt ---------- */
  let SAVE = { un: 1, st: {}, best: {} };
  try { SAVE = Object.assign(SAVE, JSON.parse(localStorage.getItem(SAVE_KEY) || "{}")); } catch (e) {}
  const store = () => { try { localStorage.setItem(SAVE_KEY, JSON.stringify(SAVE)); } catch (e) {} };

  /* ---------- ses ---------- */
  let AC = null, soundOn = true;
  function tone(f, d = 0.1, type = "triangle", vol = 0.06, slide = 0) {
    if (!soundOn || headless) return;
    try {
      AC = AC || new (window.AudioContext || window.webkitAudioContext)();
      const t = AC.currentTime, o = AC.createOscillator(), g = AC.createGain();
      o.type = type; o.frequency.setValueAtTime(f, t);
      if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(30, f + slide), t + d);
      g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + d);
      o.connect(g).connect(AC.destination); o.start(t); o.stop(t + d + 0.02);
    } catch (e) {}
  }
  const SND = {
    match: (k) => { const f = 440 * Math.pow(2, Math.min(k - 1, 8) * 2 / 12); tone(f, 0.12); setTimeout(() => tone(f * 1.5, 0.1, "sine", 0.04), 60); },
    special: () => [784, 988, 1175].forEach((f, i) => setTimeout(() => tone(f, 0.1, "sine", 0.05), i * 50)),
    beam: () => tone(300, 0.3, "sawtooth", 0.04, 1200),
    bomb: () => tone(120, 0.35, "sawtooth", 0.07, -70),
    rain: () => [523, 659, 784, 1046, 1318].forEach((f, i) => setTimeout(() => tone(f, 0.12, "sine", 0.05), i * 45)),
    no: () => tone(150, 0.14, "square", 0.04),
    win: () => [523, 659, 784, 1046].forEach((f, i) => setTimeout(() => tone(f, 0.22, "triangle", 0.07), i * 140)),
    lose: () => [392, 330, 262].forEach((f, i) => setTimeout(() => tone(f, 0.28, "triangle", 0.06), i * 200)),
    shuffle: () => tone(500, 0.25, "sine", 0.05, -250),
  };

  /* ---------- durum ---------- */
  let B = null, S = null, lvIdx = 0, nid = 1, headless = false;
  const K = (r, c) => r + "," + c;
  const P = (k) => k.split(",").map(Number);
  const inB = (r, c) => r >= 0 && c >= 0 && r < B.H && c < B.W && B.valid[r][c];
  const colorAt = (r, c) => { if (!inB(r, c)) return -2; const g = B.g[r][c]; return g && g.c >= 0 ? g.c : -2; };
  const newGem = (c, sp = null, r = 0, col = 0) => ({ c, sp, id: nid++, vx: col, vy: r, v: 0, s: 1, born: 0 });
  const rc = () => Math.floor(Math.random() * B.colors);

  function startLevel(i) {
    lvIdx = i;
    const L = LEVELS[i], H = L.map.length, W = L.map[0].length;
    B = { W, H, colors: L.colors, valid: [], ice: [], g: [] };
    for (let r = 0; r < H; r++) {
      B.valid.push([]); B.ice.push([]); B.g.push([]);
      for (let c = 0; c < W; c++) {
        const ch = L.map[r][c];
        B.valid[r].push(ch !== "#"); B.ice[r].push(ch === "1" ? 1 : ch === "2" ? 2 : 0); B.g[r].push(null);
      }
    }
    S = { L, moves: L.moves, score: 0, counts: [0, 0, 0, 0, 0, 0], cascade: 1, phase: "idle", t: 0, over: false,
          forced: null, swapKeys: null, sel: null, dying: [], fx: [], idle: 0, hint: null, swap: null, won: false };
    fillBoard();
    if (!headless) { S.phase = "fall"; resize(); renderHud(); hint(L); }
  }
  function hint(L) {
    const g = L.goal, parts = [];
    if (g.score) parts.push(`${g.score} puan`);
    if (g.collect) parts.push(g.collect.map(([c, n]) => `${n} ${GEMS[c].nm}`).join(", ") + " topla");
    if (g.ice) parts.push("bütün buzları kır");
    toast(`Bölüm ${lvIdx + 1}: ${parts.join(" · ")}`, 2600);
  }

  function fillBoard() {
    for (let tries = 0; tries < 200; tries++) {
      for (let r = 0; r < B.H; r++) for (let c = 0; c < B.W; c++) {
        if (!B.valid[r][c]) continue;
        let k, n = 0;
        do { k = rc(); n++; } while (n < 30 && ((colorAt(r, c - 1) === k && colorAt(r, c - 2) === k) || (colorAt(r - 1, c) === k && colorAt(r - 2, c) === k)));
        B.g[r][c] = newGem(k, null, r - B.H - 1, c);
      }
      if (!findGroups().length && findMove()) return;
    }
  }

  /* ---------- eşleşme bulma ---------- */
  function findGroups() {
    const runs = [];
    for (let r = 0; r < B.H; r++) {
      let c = 0;
      while (c < B.W) {
        const k = colorAt(r, c);
        if (k < 0) { c++; continue; }
        let e = c + 1; while (e < B.W && colorAt(r, e) === k) e++;
        if (e - c >= 3) { const cells = []; for (let x = c; x < e; x++) cells.push(K(r, x)); runs.push({ dir: "h", cells, k }); }
        c = e;
      }
    }
    for (let c = 0; c < B.W; c++) {
      let r = 0;
      while (r < B.H) {
        const k = colorAt(r, c);
        if (k < 0) { r++; continue; }
        let e = r + 1; while (e < B.H && colorAt(e, c) === k) e++;
        if (e - r >= 3) { const cells = []; for (let y = r; y < e; y++) cells.push(K(y, c)); runs.push({ dir: "v", cells, k }); }
        r = e;
      }
    }
    let groups = [];
    for (const run of runs) {
      const hits = groups.filter(g => run.cells.some(x => g.keys.has(x)));
      let g;
      if (!hits.length) { g = { runs: [], keys: new Set(), k: run.k }; groups.push(g); }
      else {
        g = hits[0];
        for (const o of hits.slice(1)) { o.runs.forEach(x => g.runs.push(x)); o.keys.forEach(x => g.keys.add(x)); }
        groups = groups.filter(x => !hits.slice(1).includes(x));
      }
      g.runs.push(run); run.cells.forEach(x => g.keys.add(x));
    }
    return groups;
  }

  function swapCells(a, b) { const t = B.g[a[0]][a[1]]; B.g[a[0]][a[1]] = B.g[b[0]][b[1]]; B.g[b[0]][b[1]] = t; }
  // geçerli bir hamle var mı (ipucu için de)
  function findMove() {
    for (let r = 0; r < B.H; r++) for (let c = 0; c < B.W; c++) {
      if (!inB(r, c) || !B.g[r][c]) continue;
      for (const [dr, dc] of [[0, 1], [1, 0]]) {
        const r2 = r + dr, c2 = c + dc;
        if (!inB(r2, c2) || !B.g[r2][c2]) continue;
        const a = B.g[r][c], b = B.g[r2][c2];
        if (a.sp === "rain" || b.sp === "rain" || (a.sp && b.sp)) return [[r, c], [r2, c2]];
        swapCells([r, c], [r2, c2]);
        const ok = findGroups().length > 0;
        swapCells([r, c], [r2, c2]);
        if (ok) return [[r, c], [r2, c2]];
      }
    }
    return null;
  }

  /* ---------- özel taş alanları ---------- */
  function mostColor() {
    const n = [0, 0, 0, 0, 0, 0];
    for (let r = 0; r < B.H; r++) for (let c = 0; c < B.W; c++) { const g = inB(r, c) && B.g[r][c]; if (g && g.c >= 0) n[g.c]++; }
    return n.indexOf(Math.max(...n));
  }
  function area(sp, r, c) {
    const out = [];
    if (sp === "row") for (let x = 0; x < B.W; x++) out.push([r, x]);
    else if (sp === "col") for (let y = 0; y < B.H; y++) out.push([y, c]);
    else if (sp === "bomb") for (let y = r - 1; y <= r + 1; y++) for (let x = c - 1; x <= c + 1; x++) out.push([y, x]);
    else if (sp === "rain") { const k = mostColor(); for (let y = 0; y < B.H; y++) for (let x = 0; x < B.W; x++) if (colorAt(y, x) === k) out.push([y, x]); }
    return out.filter(([y, x]) => inB(y, x));
  }

  /* ---------- bir çözülme adımı: temizle + yerçekimi ---------- */
  function step() {
    const clear = new Set(), creates = [], fx = [];
    let consumed = new Set(), base = 0;
    if (S.forced) {
      S.forced.keys.forEach(k => clear.add(k)); consumed = new Set(S.forced.consumed);
      fx.push(...S.forced.fx); S.forced = null;
    } else {
      const groups = findGroups();
      if (!groups.length) return null;
      for (const gr of groups) {
        const len = Math.max(...gr.runs.map(r => r.cells.length));
        const hasH = gr.runs.some(r => r.dir === "h"), hasV = gr.runs.some(r => r.dir === "v");
        const sp = len >= 5 ? "rain" : hasH && hasV ? "bomb" : len === 4 ? (gr.runs.find(r => r.cells.length === 4).dir === "h" ? "row" : "col") : null;
        gr.keys.forEach(k => clear.add(k));
        base += gr.keys.size;
        if (sp) {
          let pos = (S.swapKeys || []).find(k => gr.keys.has(k));
          if (!pos && sp === "bomb") {
            const hk = new Set(gr.runs.filter(r => r.dir === "h").flatMap(r => r.cells));
            pos = gr.runs.filter(r => r.dir === "v").flatMap(r => r.cells).find(k => hk.has(k));
          }
          if (!pos) { const run = gr.runs.reduce((a, b) => (b.cells.length > a.cells.length ? b : a)); pos = run.cells[Math.floor(run.cells.length / 2)]; }
          if (!creates.some(x => x.key === pos)) creates.push({ key: pos, c: sp === "rain" ? -1 : gr.k, sp });
        }
      }
    }
    S.swapKeys = null;
    // özel taşlar zincirleme patlar
    const q = [...clear];
    while (q.length) {
      const [r, c] = P(q.pop()), g = B.g[r][c];
      if (!g || !g.sp || consumed.has(g.id)) continue;
      consumed.add(g.id);
      fx.push({ k: g.sp, r, c });
      for (const [y, x] of area(g.sp, r, c)) { const k = K(y, x); if (!clear.has(k)) { clear.add(k); q.push(k); } }
    }
    // uygula
    const dying = [], iceHit = [];
    for (const k of clear) {
      const [r, c] = P(k), g = B.g[r][c];
      if (g) { dying.push(g); if (g.c >= 0) S.counts[g.c]++; B.g[r][c] = null; }
      if (B.ice[r][c] > 0) { B.ice[r][c]--; iceHit.push([r, c]); }
    }
    const pts = (base * 20 + (dying.length - base) * 30 + creates.length * 120 + iceHit.length * 40) * S.cascade;
    S.score += pts;
    for (const cr of creates) {
      const [r, c] = P(cr.key);
      const g = newGem(cr.c, cr.sp, r, c); g.born = 1;
      B.g[r][c] = g;
    }
    gravity();
    const ev = { dying, fx, creates, pts, iceHit, cascade: S.cascade };
    S.cascade++;
    return ev;
  }
  function gravity() {
    for (let c = 0; c < B.W; c++) {
      const rows = []; for (let r = 0; r < B.H; r++) if (B.valid[r][c]) rows.push(r);
      const gems = rows.map(r => B.g[r][c]).filter(Boolean);
      rows.forEach(r => (B.g[r][c] = null));
      let gi = gems.length - 1, ri = rows.length - 1;
      for (; gi >= 0; gi--, ri--) B.g[rows[ri]][c] = gems[gi];
      const top = rows.length ? rows[0] : 0;
      for (let n = 0; ri >= 0; ri--, n++) B.g[rows[ri]][c] = newGem(rc(), null, top - 1 - n, c);
    }
  }

  /* ---------- oyuncu hamlesi ---------- */
  function tryMove(a, b) {
    const ga = B.g[a[0]][a[1]], gb = B.g[b[0]][b[1]];
    if (!ga || !gb) return false;
    if (ga.sp === "rain" || gb.sp === "rain") {
      const keys = new Set([K(...a), K(...b)]), fx = [];
      if (ga.sp === "rain" && gb.sp === "rain") { for (let r = 0; r < B.H; r++) for (let c = 0; c < B.W; c++) if (inB(r, c)) keys.add(K(r, c)); fx.push({ k: "rainAll", r: b[0], c: b[1] }); }
      else {
        const other = ga.sp === "rain" ? gb : ga, col = other.c;
        for (let r = 0; r < B.H; r++) for (let c = 0; c < B.W; c++) if (colorAt(r, c) === col) keys.add(K(r, c));
        fx.push({ k: "rainCol", r: b[0], c: b[1], col });
      }
      S.forced = { keys, consumed: [ga, gb].filter(g => g.sp === "rain").map(g => g.id), fx };
      return "special";
    }
    if (ga.sp && gb.sp) {
      const [r, c] = b, keys = new Set([K(...a), K(...b)]), fx = [];
      const bombs = (ga.sp === "bomb") + (gb.sp === "bomb");
      if (bombs === 2) { for (let y = r - 2; y <= r + 2; y++) for (let x = c - 2; x <= c + 2; x++) if (inB(y, x)) keys.add(K(y, x)); fx.push({ k: "bigbomb", r, c }); }
      else if (bombs === 1) {
        for (let d = -1; d <= 1; d++) { for (let x = 0; x < B.W; x++) if (inB(r + d, x)) keys.add(K(r + d, x)); for (let y = 0; y < B.H; y++) if (inB(y, c + d)) keys.add(K(y, c + d)); }
        fx.push({ k: "row", r: r - 1, c }, { k: "row", r, c }, { k: "row", r: r + 1, c }, { k: "col", r, c: c - 1 }, { k: "col", r, c }, { k: "col", r, c: c + 1 });
      } else {
        for (let x = 0; x < B.W; x++) if (inB(r, x)) keys.add(K(r, x));
        for (let y = 0; y < B.H; y++) if (inB(y, c)) keys.add(K(y, c));
        fx.push({ k: "row", r, c }, { k: "col", r, c });
      }
      S.forced = { keys, consumed: [ga.id, gb.id], fx };
      return "special";
    }
    swapCells(a, b);
    if (!findGroups().length) { swapCells(a, b); return false; }
    S.swapKeys = [K(...b), K(...a)];
    return "swap";
  }

  const goalsMet = () => {
    const g = S.L.goal;
    if (g.score && S.score < g.score) return false;
    if (g.collect && g.collect.some(([c, n]) => S.counts[c] < n)) return false;
    if (g.ice && iceLeft() > 0) return false;
    return true;
  };
  const iceLeft = () => { let n = 0; for (let r = 0; r < B.H; r++) for (let c = 0; c < B.W; c++) n += B.ice[r][c]; return n; };
  function starsFor(score) { const st = S.L.stars; return 1 + (score >= st[1]) + (score >= st[2]); }

  function shuffle() {
    const cells = [], gems = [];
    for (let r = 0; r < B.H; r++) for (let c = 0; c < B.W; c++) if (inB(r, c)) { cells.push([r, c]); gems.push(B.g[r][c]); }
    for (let t = 0; t < 300; t++) {
      for (let i = gems.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [gems[i], gems[j]] = [gems[j], gems[i]]; }
      cells.forEach(([r, c], i) => (B.g[r][c] = gems[i]));
      if (!findGroups().length && findMove()) return;
      if (t === 150) gems.forEach(g => { if (!g.sp) g.c = rc(); });
    }
  }

  // hamleler bittikten sonra: kazan / kaybet / karıştır
  function settle() {
    S.cascade = 1;
    if (goalsMet()) {
      const bonus = S.moves * 250;
      S.score += bonus; S.won = true; S.over = true; S.bonus = bonus;
      return "win";
    }
    if (S.moves <= 0) { S.over = true; return "lose"; }
    if (!findMove()) { shuffle(); return "shuffle"; }
    return "idle";
  }

  /* ---------- başsız oynatma (test ve denge için) ---------- */
  function playHeadless(a, b) {
    const r = tryMove(a, b);
    if (!r) return false;
    S.moves--; S.cascade = 1;
    while (step()) {}
    let st;
    while ((st = settle()) === "shuffle") { while (step()) {} }
    return st;
  }

  /* ---------- animasyonlu akış ---------- */
  function beginMove(a, b) {
    const ga = B.g[a[0]][a[1]], gb = B.g[b[0]][b[1]];
    const res = tryMove(a, b);
    S.sel = null; S.hint = null; S.idle = 0;
    if (!res) {
      S.phase = "bounce"; S.t = 0; S.swap = { ga, gb, a, b }; SND.no(); return;
    }
    S.moves--; S.cascade = 1; renderHud();
    S.phase = "swap"; S.t = 0; S.swap = { ga, gb, a, b, special: res === "special" };
  }
  function resolveNext() {
    const ev = step();
    if (!ev) {
      const st = settle();
      if (st === "shuffle") { toast("Hamle kalmadı, taşlar karışıyor…"); SND.shuffle(); S.phase = "fall"; return; }
      S.phase = st === "idle" ? "idle" : "done";
      renderHud();
      if (st === "win" || st === "lose") finish(st === "win");
      return;
    }
    S.dying = ev.dying.map(g => ({ g, x: g.vx, y: g.vy }));
    for (const g of ev.dying) burst(g.vx, g.vy, g.c >= 0 ? GEMS[g.c].f : "#fff", 4);
    for (const [r, c] of ev.iceHit) burst(c, r, "#DFF4FF", 3);
    for (const f of ev.fx) { S.fx.push(Object.assign({ t: 0, life: 0.45 }, f, { k: "fx-" + f.k })); }
    if (ev.fx.some(f => f.k === "bomb" || f.k === "bigbomb")) SND.bomb();
    if (ev.fx.some(f => f.k === "row" || f.k === "col")) SND.beam();
    if (ev.fx.some(f => f.k.startsWith("rain"))) SND.rain();
    if (ev.creates.length) SND.special();
    SND.match(ev.cascade);
    if (ev.dying.length) {
      const ax = ev.dying.reduce((s, g) => s + g.vx, 0) / ev.dying.length, ay = ev.dying.reduce((s, g) => s + g.vy, 0) / ev.dying.length;
      S.fx.push({ k: "txt", x: ax, y: ay, t: 0, life: 0.9, s: "+" + ev.pts });
    }
    if (ev.cascade === 3) toast("Harika! 🔥", 900); else if (ev.cascade === 5) toast("Muhteşem! 💎", 900);
    S.phase = "clear"; S.t = 0;
    renderHud();
  }
  function burst(x, y, col, n) { if (headless) return; for (let i = 0; i < n; i++) { const a = Math.random() * 6.28, v = 1 + Math.random() * 2; S.fx.push({ k: "p", x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 1, t: 0, life: 0.5, col }); } }

  function update(dt) {
    if (!S) return;
    S.t += dt;
    for (const f of S.fx) { f.t += dt; if (f.k === "p") { f.x += f.vx * dt; f.y += f.vy * dt; f.vy += 6 * dt; } if (f.k === "txt") f.y -= 0.8 * dt; }
    S.fx = S.fx.filter(f => f.t < f.life);
    for (let r = 0; r < B.H; r++) for (let c = 0; c < B.W; c++) { const g = B.g[r][c]; if (g && g.born > 0) g.born = Math.max(0, g.born - dt * 4); }
    const D = 0.15;
    if (S.phase === "swap" || S.phase === "bounce") {
      const { ga, gb, a, b } = S.swap;
      let k = Math.min(1, S.t / D);
      if (S.phase === "bounce") k = k < 0.5 ? k * 2 : 2 - k * 2;
      ga.vx = a[1] + (b[1] - a[1]) * k; ga.vy = a[0] + (b[0] - a[0]) * k;
      if (!S.swap.special) { gb.vx = b[1] + (a[1] - b[1]) * k; gb.vy = b[0] + (a[0] - b[0]) * k; }
      if (S.t >= D * (S.phase === "bounce" ? 1.6 : 1)) {
        if (S.phase === "bounce") { ga.vx = a[1]; ga.vy = a[0]; gb.vx = b[1]; gb.vy = b[0]; S.phase = "idle"; }
        else resolveNext();
      }
    } else if (S.phase === "clear") {
      for (const d of S.dying) d.g.s = Math.max(0, 1 - S.t / 0.2);
      if (S.t >= 0.2) { S.dying = []; S.phase = "fall"; S.t = 0; }
    } else if (S.phase === "fall") {
      let moving = false;
      for (let r = 0; r < B.H; r++) for (let c = 0; c < B.W; c++) {
        const g = B.g[r][c]; if (!g) continue;
        g.s = 1;
        if (g.vx !== c) { const dx = c - g.vx, st = 8 * dt; g.vx = Math.abs(dx) <= st ? c : g.vx + Math.sign(dx) * st; moving = true; }
        if (g.vy < r) { g.v = Math.min(22, g.v + 60 * dt); g.vy = Math.min(r, g.vy + g.v * dt); moving = true; if (g.vy === r) g.v = 0; }
        else if (g.vy > r) { g.vy = Math.max(r, g.vy - 8 * dt); moving = true; }
      }
      if (!moving) resolveNext();
    } else if (S.phase === "idle") {
      S.idle += dt;
      if (S.idle > 6 && !S.hint) S.hint = findMove();
    }
  }

  function finish(won) {
    const n = lvIdx + 1;
    let stars = 0;
    if (won) {
      stars = starsFor(S.score);
      SAVE.st[n] = Math.max(SAVE.st[n] || 0, stars);
      SAVE.best[n] = Math.max(SAVE.best[n] || 0, S.score);
      SAVE.un = Math.max(SAVE.un, Math.min(LEVELS.length, n + 1));
      store();
    }
    if (headless) return;
    setTimeout(() => {
      $("end-icon").textContent = won ? (n === LEVELS.length ? "👑" : "🏆") : "💔";
      $("end-title").textContent = won ? (n === LEVELS.length ? "Madenin ustası!" : "Bölüm tamam!") : "Hamle bitti";
      $("end-stars").textContent = won ? "★".repeat(stars) + "☆".repeat(3 - stars) : "";
      $("end-text").textContent = won
        ? `${S.score} puan` + (S.bonus ? ` (kalan hamle bonusu +${S.bonus})` : "") + `. En iyi: ${SAVE.best[n]}`
        : `Görev tamamlanamadı: ${goalText(true)}. Bir daha dene!`;
      $("end-next").hidden = !won || n >= LEVELS.length;
      $("end").hidden = false;
      ($("end-next").hidden ? $("end-retry") : $("end-next")).focus();
    }, 650);
    won ? SND.win() : SND.lose();
  }
  function goalText(remaining) {
    const g = S.L.goal, p = [];
    if (g.score && (!remaining || S.score < g.score)) p.push(`${g.score - (remaining ? S.score : 0)} puan daha`);
    if (g.collect) g.collect.forEach(([c, n]) => { if (!remaining || S.counts[c] < n) p.push(`${n - S.counts[c]} ${GEMS[c].nm}`); });
    if (g.ice && (!remaining || iceLeft())) p.push(`${iceLeft()} buz`);
    return p.join(", ");
  }

  /* ---------- çizim ---------- */
  let W = 0, H = 0, CS = 0, ox = 0, oy = 0, dpr = 1;
  function resize() {
    const r = stage.getBoundingClientRect();
    dpr = Math.min(2, window.devicePixelRatio || 1);
    W = r.width; H = r.height;
    cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr);
    if (!B) return;
    CS = Math.floor(Math.min((W - 8) / B.W, (H - 8) / B.H));
    ox = Math.floor((W - CS * B.W) / 2); oy = Math.floor((H - CS * B.H) / 2);
  }

  function shapePath(c, k, s) {
    c.beginPath();
    if (k === 0) c.arc(0, 0, s * 0.42, 0, 7);
    else if (k === 1) { const q = s * 0.37; c.roundRect ? c.roundRect(-q, -q, q * 2, q * 2, s * 0.1) : c.rect(-q, -q, q * 2, q * 2); }
    else if (k === 2) { c.moveTo(0, -s * 0.46); c.lineTo(s * 0.4, 0); c.lineTo(0, s * 0.46); c.lineTo(-s * 0.4, 0); c.closePath(); }
    else if (k === 3) { for (let i = 0; i < 6; i++) { const a = Math.PI / 6 + i * Math.PI / 3; c[i ? "lineTo" : "moveTo"](Math.cos(a) * s * 0.43, Math.sin(a) * s * 0.43); } c.closePath(); }
    else if (k === 4) { c.moveTo(0, -s * 0.44); c.lineTo(s * 0.44, s * 0.34); c.lineTo(-s * 0.44, s * 0.34); c.closePath(); }
    else { for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5, rr = i % 2 ? s * 0.2 : s * 0.46; c[i ? "lineTo" : "moveTo"](Math.cos(a) * rr, Math.sin(a) * rr); } c.closePath(); }
  }
  function drawGem(c, x, y, s, k, sp, t = 0) {
    c.save(); c.translate(x, y);
    if (sp === "rain") {
      const R = s * 0.42;
      for (let i = 0; i < 6; i++) { c.fillStyle = GEMS[i].f; c.beginPath(); c.moveTo(0, 0); c.arc(0, 0, R, t * 2 + i * Math.PI / 3, t * 2 + (i + 1) * Math.PI / 3); c.closePath(); c.fill(); }
      c.fillStyle = "#fff"; c.beginPath(); c.arc(0, 0, R * 0.38, 0, 7); c.fill();
      c.strokeStyle = "rgba(255,255,255,.8)"; c.lineWidth = Math.max(1, s * 0.04); c.beginPath(); c.arc(0, 0, R, 0, 7); c.stroke();
      c.restore(); return;
    }
    const G = GEMS[k];
    if (sp === "bomb") {
      c.fillStyle = "rgba(255,255,255,.25)"; c.beginPath(); c.arc(0, 0, s * 0.5 + Math.sin(t * 6) * s * 0.03, 0, 7); c.fill();
    }
    shapePath(c, k, s);
    const gr = c.createLinearGradient(-s * 0.4, -s * 0.4, s * 0.4, s * 0.4);
    gr.addColorStop(0, G.l); gr.addColorStop(0.45, G.f); gr.addColorStop(1, G.d);
    c.fillStyle = gr; c.fill();
    c.strokeStyle = G.d; c.lineWidth = Math.max(1, s * 0.035); c.stroke();
    c.save(); shapePath(c, k, s); c.clip();
    if (sp === "row" || sp === "col") {
      c.fillStyle = "rgba(255,255,255,.75)";
      for (let i = -1; i <= 1; i++) sp === "row" ? c.fillRect(-s * 0.5, i * s * 0.2 - s * 0.04, s, s * 0.08) : c.fillRect(i * s * 0.2 - s * 0.04, -s * 0.5, s * 0.08, s);
    }
    c.fillStyle = "rgba(255,255,255,.45)"; c.beginPath(); c.ellipse(-s * 0.12, -s * 0.16, s * 0.14, s * 0.08, -0.6, 0, 7); c.fill();
    c.restore();
    if (sp === "bomb") {
      c.strokeStyle = "#fff"; c.lineWidth = Math.max(1.5, s * 0.06); c.beginPath(); c.arc(0, 0, s * 0.47, 0, 7); c.stroke();
      c.fillStyle = "#FFE066"; c.beginPath(); c.arc(0, 0, s * 0.09, 0, 7); c.fill();
    }
    c.restore();
  }

  function draw() {
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, cv.width, cv.height);
    if (!B) return;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const t = performance.now() / 1000;
    // zemin
    for (let r = 0; r < B.H; r++) for (let c = 0; c < B.W; c++) {
      if (!B.valid[r][c]) continue;
      const x = ox + c * CS, y = oy + r * CS;
      ctx.fillStyle = (r + c) % 2 ? "rgba(40,26,64,.92)" : "rgba(52,36,80,.92)";
      ctx.fillRect(x, y, CS, CS);
      const ice = B.ice[r][c];
      if (ice) {
        ctx.fillStyle = ice === 2 ? "rgba(170,220,255,.72)" : "rgba(170,220,255,.42)";
        ctx.fillRect(x + 2, y + 2, CS - 4, CS - 4);
        ctx.strokeStyle = "rgba(255,255,255,.8)"; ctx.lineWidth = 1.5;
        ctx.strokeRect(x + 2.5, y + 2.5, CS - 5, CS - 5);
        ctx.beginPath(); ctx.moveTo(x + CS * 0.18, y + CS * 0.3); ctx.lineTo(x + CS * 0.3, y + CS * 0.18);
        if (ice === 2) { ctx.moveTo(x + CS * 0.62, y + CS * 0.82); ctx.lineTo(x + CS * 0.82, y + CS * 0.62); ctx.moveTo(x + CS * 0.2, y + CS * 0.5); ctx.lineTo(x + CS * 0.5, y + CS * 0.2); }
        ctx.stroke();
      }
    }
    // seçim / ipucu
    if (S.sel) { ctx.strokeStyle = "#FFD166"; ctx.lineWidth = 3; ctx.strokeRect(ox + S.sel[1] * CS + 2, oy + S.sel[0] * CS + 2, CS - 4, CS - 4); }
    if (S.hint && S.phase === "idle") {
      ctx.strokeStyle = `rgba(255,255,255,${0.35 + 0.35 * Math.sin(t * 6)})`; ctx.lineWidth = 3;
      for (const [r, c] of S.hint) ctx.strokeRect(ox + c * CS + 3, oy + r * CS + 3, CS - 6, CS - 6);
    }
    // taşlar (tahtanın üstünden doğanlar görünmesin)
    ctx.save(); ctx.beginPath(); ctx.rect(ox, oy, CS * B.W, CS * B.H); ctx.clip();
    const drawOne = (g) => {
      const sc = g.s * (g.born > 0 ? 1 + g.born * 0.5 : 1);
      if (sc <= 0.01) return;
      drawGem(ctx, ox + (g.vx + 0.5) * CS, oy + (g.vy + 0.5) * CS, CS * 0.92 * sc, g.c, g.sp, t);
    };
    for (let r = 0; r < B.H; r++) for (let c = 0; c < B.W; c++) { const g = B.g[r][c]; if (g && g.vy > -1) drawOne(g); }
    for (const d of S.dying) drawOne(d.g);
    ctx.restore();
    // efektler
    for (const f of S.fx) {
      const k = f.t / f.life;
      ctx.globalAlpha = Math.max(0, 1 - k);
      if (f.k === "p") { ctx.fillStyle = f.col; ctx.beginPath(); ctx.arc(ox + (f.x + 0.5) * CS, oy + (f.y + 0.5) * CS, CS * 0.07, 0, 7); ctx.fill(); }
      else if (f.k === "fx-row") { ctx.fillStyle = "#FFF6C8"; const h = CS * 0.5 * (1 - k); ctx.fillRect(ox, oy + (f.r + 0.5) * CS - h / 2, CS * B.W, h); }
      else if (f.k === "fx-col") { ctx.fillStyle = "#FFF6C8"; const w = CS * 0.5 * (1 - k); ctx.fillRect(ox + (f.c + 0.5) * CS - w / 2, oy, w, CS * B.H); }
      else if (f.k === "fx-bomb" || f.k === "fx-bigbomb") { ctx.strokeStyle = "#FFB347"; ctx.lineWidth = CS * 0.2 * (1 - k) + 1; ctx.beginPath(); ctx.arc(ox + (f.c + 0.5) * CS, oy + (f.r + 0.5) * CS, CS * (f.k === "fx-bomb" ? 1.5 : 2.5) * (0.3 + k * 0.7), 0, 7); ctx.stroke(); }
      else if (f.k.startsWith("fx-rain")) { ctx.strokeStyle = GEMS[Math.floor(f.t * 20) % 6].l; ctx.lineWidth = CS * 0.15; ctx.beginPath(); ctx.arc(ox + (f.c + 0.5) * CS, oy + (f.r + 0.5) * CS, CS * 4 * k + CS * 0.3, 0, 7); ctx.stroke(); }
      else if (f.k === "txt") {
        ctx.font = `800 ${Math.max(14, CS * 0.42)}px Rubik, sans-serif`; ctx.textAlign = "center"; ctx.textBaseline = "middle";
        ctx.lineWidth = 4; ctx.strokeStyle = "rgba(30,20,48,.8)"; ctx.fillStyle = "#FFE48A";
        const X = ox + (f.x + 0.5) * CS, Y = oy + (f.y + 0.5) * CS;
        ctx.strokeText(f.s, X, Y); ctx.fillText(f.s, X, Y);
      }
      ctx.globalAlpha = 1;
    }
  }

  /* ---------- arayüz ---------- */
  let toastT = 0;
  function toast(s, ms = 1500) { if (headless) return; const el = $("toast"); el.textContent = s; el.hidden = false; clearTimeout(toastT); toastT = setTimeout(() => (el.hidden = true), ms); }
  function iconCanvas(k, ice) {
    const c = document.createElement("canvas"); c.width = 52; c.height = 52;
    const x = c.getContext("2d");
    if (ice) { x.fillStyle = "rgba(170,220,255,.8)"; x.fillRect(6, 6, 40, 40); x.strokeStyle = "#fff"; x.lineWidth = 3; x.strokeRect(6, 6, 40, 40); x.beginPath(); x.moveTo(12, 22); x.lineTo(22, 12); x.moveTo(28, 40); x.lineTo(40, 28); x.stroke(); }
    else drawGem(x, 26, 26, 48, k, null);
    return c;
  }
  function renderHud() {
    if (headless) return;
    $("lvl").textContent = lvIdx + 1;
    $("moves").textContent = S.moves; $("moves").classList.toggle("low", S.moves <= 5);
    const box = $("goals"); box.innerHTML = "";
    const g = S.L.goal;
    const add = (icon, txt, done) => {
      const el = document.createElement("span"); el.className = "goal" + (done ? " done" : "");
      if (icon) el.appendChild(icon); else el.insertAdjacentHTML("beforeend", "🎯");
      el.insertAdjacentHTML("beforeend", `<span>${txt}</span>${done ? '<span class="ok">✔</span>' : ""}`);
      box.appendChild(el);
    };
    if (g.score) add(null, `${g.score}`, S.score >= g.score);
    if (g.collect) g.collect.forEach(([c, n]) => add(iconCanvas(c), `${Math.max(0, n - S.counts[c])}`, S.counts[c] >= n));
    if (g.ice) add(iconCanvas(0, true), `${iceLeft()}`, iceLeft() === 0);
    const st = S.L.stars, top = Math.max(st[2] * 1.1, 1);
    $("score").textContent = S.score;
    $("sfill").style.width = Math.min(100, S.score / top * 100) + "%";
    const marks = [st[0] || Math.round(st[1] * 0.5), st[1], st[2]];
    marks.forEach((v, i) => { const m = $("mk" + (i + 1)); m.style.left = (v / top * 100) + "%"; m.classList.toggle("on", S.score >= v && (i > 0 || goalsMet())); });
  }

  function renderMenu() {
    const box = $("lvgrid");
    box.innerHTML = LEVELS.map((L, i) => {
      const n = i + 1, st = SAVE.st[n] || 0, lock = n > SAVE.un;
      return `<button class="lv${i === lvIdx ? " cur" : ""}" type="button" data-i="${i}" ${lock ? "disabled" : ""} aria-label="Bölüm ${n}${lock ? ", kilitli" : st ? `, ${st} yıldız` : ""}"><b>${lock ? "🔒" : n}</b><small>${st ? "★".repeat(st) : ""}</small></button>`;
    }).join("");
    box.querySelectorAll(".lv").forEach(b => b.addEventListener("click", () => { $("menu").hidden = true; startLevel(+b.dataset.i); }));
  }

  // dokunma / kaydırma
  let down = null;
  function cellAt(ev) {
    const r = cv.getBoundingClientRect();
    if (Math.abs(r.width - W) > 0.5 || Math.abs(r.height - H) > 0.5) resize();
    const c = Math.floor((ev.clientX - r.left - ox) / CS), rr = Math.floor((ev.clientY - r.top - oy) / CS);
    return inB(rr, c) ? [rr, c] : null;
  }
  const adj = (a, b) => Math.abs(a[0] - b[0]) + Math.abs(a[1] - b[1]) === 1;
  cv.addEventListener("pointerdown", (ev) => {
    if (!S || S.phase !== "idle" || S.over) return;
    const c = cellAt(ev); if (!c) { S.sel = null; return; }
    S.idle = 0;
    if (S.sel && adj(S.sel, c)) { beginMove(S.sel, c); down = null; return; }
    S.sel = c; down = { c, x: ev.clientX, y: ev.clientY };
    try { cv.setPointerCapture(ev.pointerId); } catch (e) {}
  });
  cv.addEventListener("pointermove", (ev) => {
    if (!down || !S || S.phase !== "idle") return;
    const dx = ev.clientX - down.x, dy = ev.clientY - down.y;
    if (Math.max(Math.abs(dx), Math.abs(dy)) < CS * 0.35) return;
    const [r, c] = down.c, to = Math.abs(dx) > Math.abs(dy) ? [r, c + Math.sign(dx)] : [r + Math.sign(dy), c];
    down = null;
    if (inB(to[0], to[1])) beginMove([r, c], to); else S.sel = null;
  });
  cv.addEventListener("pointerup", () => { down = null; });

  $("levels-btn").addEventListener("click", () => { renderMenu(); $("menu").hidden = false; });
  $("menu").addEventListener("click", (e) => { if (e.target === $("menu") && S) $("menu").hidden = true; });
  $("end-next").addEventListener("click", () => { $("end").hidden = true; startLevel(lvIdx + 1); });
  $("end-retry").addEventListener("click", () => { $("end").hidden = true; startLevel(lvIdx); });
  $("end-menu").addEventListener("click", () => { $("end").hidden = true; renderMenu(); $("menu").hidden = false; });
  $("sound").addEventListener("click", () => {
    soundOn = !soundOn; $("ic-on").hidden = !soundOn; $("ic-off").hidden = soundOn;
    $("sound").setAttribute("aria-pressed", soundOn); $("sound").setAttribute("aria-label", soundOn ? "Sesi kapat" : "Sesi aç");
  });
  document.addEventListener("keydown", (e) => { if (e.key === "Escape" && !$("menu").hidden && S) $("menu").hidden = true; });

  /* ---------- döngü ---------- */
  let last = performance.now();
  function loop(now) {
    const dt = Math.min(0.05, (now - last) / 1000); last = now;
    const sr = stage.getBoundingClientRect();
    if (Math.abs(sr.width - W) > 0.5 || Math.abs(sr.height - H) > 0.5) resize();
    if (!headless) { update(dt); draw(); }
    requestAnimationFrame(loop);
  }
  lvIdx = Math.min(SAVE.un, LEVELS.length) - 1;
  startLevel(lvIdx);
  renderMenu();
  requestAnimationFrame(loop);

  // test kancası
  window.__mm = {
    LEVELS, get S() { return S; }, get B() { return B; },
    startLevel, findMove, findGroups, tryMove, playHeadless, step, settle, update, beginMove,
    setHeadless: (h) => { headless = h; },
    save: () => SAVE,
  };
})();
