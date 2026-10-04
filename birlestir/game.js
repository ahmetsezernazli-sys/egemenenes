(() => {
  "use strict";
  const $ = id => document.getElementById(id);

  const SIZES = [
    {id:"4", n:4, nm:"4×4", note:"klasik"},
    {id:"5", n:5, nm:"5×5", note:"daha bol yer"}
  ];
  const SAVE_KEY = "birlestir-2048";
  let save = {best: {}};
  try { save = Object.assign(save, JSON.parse(localStorage.getItem(SAVE_KEY)) || {}); } catch (e) {}
  const store = () => { try { localStorage.setItem(SAVE_KEY, JSON.stringify(save)); } catch (e) {} };

  /* ---------- ses ---------- */
  let soundOn = true, ac = null;
  function audio(){
    if (!ac){ try { ac = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { ac = null; } }
    if (ac && ac.state === "suspended") ac.resume();
    return ac;
  }
  function tone(f1, f2, type, dur, vol, delay){
    if (!soundOn) return;
    const a = audio(); if (!a) return;
    const t = a.currentTime + (delay || 0), o = a.createOscillator(), g = a.createGain();
    o.type = type; o.frequency.setValueAtTime(f1, t); o.frequency.exponentialRampToValueAtTime(Math.max(20, f2), t + dur * .9);
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + .01); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(a.destination); o.start(t); o.stop(t + dur + .05);
  }
  const sSlide = () => tone(240, 200, "sine", .07, .05);
  const sMerge = v => tone(300 + Math.min(Math.log2(v), 11) * 60, 480 + Math.min(Math.log2(v), 11) * 60, "triangle", .12, .11);
  const sNope = () => tone(180, 150, "square", .08, .04);
  const sWin = () => [523, 659, 784, 1047, 1319].forEach((f, k) => tone(f, f, "triangle", .22, .15, k * .1));
  const sOver = () => tone(360, 110, "sawtooth", .6, .12);
  function renderSound(){
    $("ic-on").hidden = !soundOn; $("ic-off").hidden = soundOn;
    $("sound").setAttribute("aria-label", soundOn ? "Sesi kapat" : "Sesi aç");
    $("sound").setAttribute("aria-pressed", String(soundOn));
  }
  $("sound").addEventListener("click", () => { soundOn = !soundOn; renderSound(); });
  renderSound();

  /* ---------- oyun mantığı (saf) ---------- */
  // grid: n×n sayı dizisi (0 = boş). Hareket: tek bir satırı sola kaydır.
  function slideRow(row){
    const vals = row.filter(v => v);
    const out = [], gained = [];
    for (let i = 0; i < vals.length; i++){
      if (vals[i] === vals[i + 1]){
        out.push(vals[i] * 2); gained.push(vals[i] * 2); i++;
      } else out.push(vals[i]);
    }
    while (out.length < row.length) out.push(0);
    return {row: out, gained};
  }
  const rows = (g, n) => Array.from({length: n}, (_, y) => g.slice(y * n, y * n + n));
  const flat = rs => [].concat(...rs);
  const rotate = (g, n) => {                  // saat yönünde 90°
    const out = new Array(n * n).fill(0);
    for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) out[x * n + (n - 1 - y)] = g[y * n + x];
    return out;
  };
  const DIR_ROT = {left: 0, up: 3, right: 2, down: 1};   // kaç kez saat yönünde döndürüp sola kaydıracağız
  function move(grid, n, dir){
    let g = grid.slice();
    for (let k = 0; k < DIR_ROT[dir]; k++) g = rotate(g, n);
    let score = 0, moved = false;
    const rs = rows(g, n).map(r => {
      const {row, gained} = slideRow(r);
      if (row.some((v, i) => v !== r[i])) moved = true;
      score += gained.reduce((a, b) => a + b, 0);
      return row;
    });
    g = flat(rs);
    for (let k = DIR_ROT[dir]; k < 4; k++) g = rotate(g, n);   // geri döndür
    return {grid: g, score, moved};
  }
  const emptyCells = (g) => g.map((v, i) => v === 0 ? i : -1).filter(i => i >= 0);
  function canMove(g, n){
    if (emptyCells(g).length) return true;
    for (const d of ["left", "up", "right", "down"]) if (move(g, n, d).moved) return true;
    return false;
  }
  function spawn(g, n){
    const cells = emptyCells(g);
    if (!cells.length) return null;
    const i = cells[Math.random() * cells.length | 0];
    g[i] = Math.random() < .9 ? 2 : 4;
    return i;
  }

  /* ---------- durum ---------- */
  let G = null;

  function newGame(sizeIdx){
    const sz = SIZES[sizeIdx];
    G = {sz, sizeIdx, n: sz.n, grid: new Array(sz.n * sz.n).fill(0), score: 0, moves: 0, prev: null, won: false, over: false, fresh: []};
    spawn(G.grid, G.n); spawn(G.grid, G.n);
    G.fresh = emptyCells(G.grid).length === G.n * G.n - 2 ? G.grid.map((v, i) => v ? i : -1).filter(i => i >= 0) : [];
    ["menu", "win", "over"].forEach(id => $(id).hidden = true);
    buildBoard();
    render(true);
    hud();
  }

  function buildBoard(){
    const b = $("board"), grid = $("grid"), tiles = $("tiles");
    b.style.setProperty("--gap", G.n === 4 ? "10px" : "8px");
    grid.style.gridTemplateColumns = `repeat(${G.n}, 1fr)`;
    grid.innerHTML = "";
    for (let i = 0; i < G.n * G.n; i++) grid.appendChild(document.createElement("i"));
    tiles.innerHTML = "";
    sizeVars();
  }
  function sizeVars(){
    const b = $("board");
    const gap = parseFloat(getComputedStyle(b).getPropertyValue("--gap"));
    const inner = b.clientWidth - gap * 2;
    const sz = (inner - gap * (G.n - 1)) / G.n;
    b.style.setProperty("--sz", sz + "px");
    b.style.setProperty("--fs", Math.round(sz * .42) + "px");
  }
  function cls(v){
    if (v > 2048) return "vbig";
    return "v" + v;
  }
  function render(initial){
    sizeVars();
    const box = $("tiles");
    box.innerHTML = "";
    const fs = getComputedStyle($("board")).getPropertyValue("--fs");
    for (let i = 0; i < G.n * G.n; i++){
      const v = G.grid[i];
      if (!v) continue;
      const el = document.createElement("div");
      el.className = "tile " + cls(v) + (G.fresh.includes(i) ? " new" : "") + (G.merged && G.merged.includes(i) ? " merged" : "");
      el.style.setProperty("--x", i % G.n);
      el.style.setProperty("--y", (i / G.n) | 0);
      el.style.fontSize = v >= 1024 ? `calc(${fs} * .72)` : v >= 128 ? `calc(${fs} * .85)` : fs;
      el.textContent = v;
      box.appendChild(el);
    }
    $("undo").disabled = !G.prev || G.over;
  }
  function hud(bump){
    $("score").textContent = G.score;
    $("moves").textContent = G.moves;
    const mx = Math.max(...G.grid, 2);
    $("max").textContent = mx;
    const b = save.best[G.sz.id] || 0;
    $("best").textContent = Math.max(b, G.score);
    if (bump){ const el = $("score"); el.classList.remove("up"); void el.offsetWidth; el.classList.add("up"); }
  }

  function doMove(dir){
    if (!G || G.over) return false;
    const r = move(G.grid, G.n, dir);
    if (!r.moved){ sNope(); return false; }
    G.prev = {grid: G.grid.slice(), score: G.score, moves: G.moves};
    G.grid = r.grid;
    G.score += r.score;
    G.moves++;
    // birleşen karoları işaretle: yeni gridde eski değerinden farklı olanlar
    G.merged = r.score > 0 ? G.grid.map((v, i) => v && v !== G.prev.grid[i] ? i : -1).filter(i => i >= 0) : [];
    const idx = spawn(G.grid, G.n);
    G.fresh = idx === null ? [] : [idx];
    if (r.score > 0) sMerge(Math.max(...G.merged.map(i => G.grid[i]), 2)); else sSlide();
    if (G.score > (save.best[G.sz.id] || 0)){ save.best[G.sz.id] = G.score; store(); }
    render(); hud(r.score > 0);
    if (!G.won && G.grid.includes(2048)){
      G.won = true;
      sWin();
      $("win-note").textContent = `Skor: ${G.score} · ${G.moves} hamle. İstersen daha büyük karolar için devam et.`;
      setTimeout(() => { $("win").hidden = false; $("keep").focus(); }, 320);
    } else if (!canMove(G.grid, G.n)) gameOver();
    return true;
  }
  function gameOver(){
    G.over = true;
    sOver();
    const mx = Math.max(...G.grid);
    const best = save.best[G.sz.id] || 0;
    $("over-score").textContent = G.score;
    $("over-max").textContent = mx;
    $("over-title").textContent = G.score >= best ? "Yeni rekor!" : "Hamle kalmadı";
    $("over-note").textContent = G.score >= best ? "En iyi skorun!" : `Rekorun: ${best}`;
    render();
    setTimeout(() => { $("over").hidden = false; $("again").focus(); }, 500);
  }
  function undo(){
    if (!G || !G.prev) return;
    audio();
    G.grid = G.prev.grid; G.score = G.prev.score; G.moves = G.prev.moves;
    G.prev = null; G.fresh = []; G.merged = []; G.over = false;
    $("over").hidden = true;
    render(); hud();
  }

  /* ---------- girdi ---------- */
  document.addEventListener("keydown", e => {
    if (!G || (e.target && e.target.closest && e.target.closest("input"))) return;
    const d = {ArrowLeft: "left", ArrowRight: "right", ArrowUp: "up", ArrowDown: "down",
               a: "left", d: "right", w: "up", s: "down"}[e.key] || {A: "left", D: "right", W: "up", S: "down"}[e.key];
    if (d){ e.preventDefault(); audio(); doMove(d); }
    if (e.key === "z" && (e.ctrlKey || e.metaKey)){ e.preventDefault(); undo(); }
  });
  const board = $("board");
  let touch = null;
  board.addEventListener("pointerdown", e => { touch = {x: e.clientX, y: e.clientY}; audio(); });
  board.addEventListener("pointermove", e => {
    if (!touch) return;
    const dx = e.clientX - touch.x, dy = e.clientY - touch.y;
    if (Math.hypot(dx, dy) < 28) return;
    doMove(Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? "right" : "left") : (dy > 0 ? "down" : "up"));
    touch = null;
  });
  const endTouch = () => { touch = null; };
  board.addEventListener("pointerup", endTouch);
  board.addEventListener("pointercancel", endTouch);
  board.addEventListener("pointerleave", endTouch);

  $("undo").addEventListener("click", undo);
  $("restart").addEventListener("click", () => { audio(); newGame(G.sizeIdx); });
  $("again").addEventListener("click", () => { $("over").hidden = true; newGame(G.sizeIdx); });
  $("keep").addEventListener("click", () => { $("win").hidden = true; });
  $("win-new").addEventListener("click", () => { $("win").hidden = true; newGame(G.sizeIdx); });
  $("over-menu").addEventListener("click", () => { buildMenu(); $("over").hidden = true; $("menu").hidden = false; });
  $("open-menu").addEventListener("click", () => { buildMenu(); ["win", "over"].forEach(id => $(id).hidden = true); $("menu").hidden = false; });

  function buildMenu(){
    const box = $("levels"); box.innerHTML = "";
    SIZES.forEach((sz, i) => {
      const b = document.createElement("button");
      b.type = "button";
      const best = save.best[sz.id] || 0;
      b.innerHTML = `<b>${sz.nm}</b><small>${best ? "rekor " + best : sz.note}</small>`;
      b.addEventListener("click", () => { audio(); newGame(i); });
      box.appendChild(b);
    });
  }
  if ("ResizeObserver" in window) new ResizeObserver(() => { if (G) render(); }).observe($("board"));
  else window.addEventListener("resize", () => { if (G) render(); });
  buildMenu();
})();
