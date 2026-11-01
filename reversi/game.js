/* Reversi — iki kişilik taş çevirme oyunu */
(() => {
  "use strict";
  const $ = (id) => document.getElementById(id);
  const SAVE_KEY = "reversi", SOUND_KEY = "reversi-ses";
  const N = 8, EMPTY = -1;
  const DIRS = [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]];
  // kare değerleri: köşe çok iyi, köşe yanı kötü
  const WEIGHT = [
    [100, -20, 10, 5, 5, 10, -20, 100],
    [-20, -40, -2, -2, -2, -2, -40, -20],
    [10, -2, 2, 1, 1, 2, -2, 10],
    [5, -2, 1, 0, 0, 1, -2, 5],
    [5, -2, 1, 0, 0, 1, -2, 5],
    [10, -2, 2, 1, 1, 2, -2, 10],
    [-20, -40, -2, -2, -2, -2, -40, -20],
    [100, -20, 10, 5, 5, 10, -20, 100]
  ];

  /* ---------- ses ---------- */
  let AC = null, soundOn = true;
  try { soundOn = localStorage.getItem(SOUND_KEY) !== "0"; } catch (e) {}
  function audio() { try { AC = AC || new (window.AudioContext || window.webkitAudioContext)(); if (AC.state === "suspended") AC.resume(); } catch (e) {} }
  function tone(f, d = 0.1, type = "triangle", vol = 0.06, delay = 0) {
    if (!AC || !soundOn || fast) return;
    const t = AC.currentTime + delay, o = AC.createOscillator(), g = AC.createGain();
    o.type = type; o.frequency.setValueAtTime(f, t);
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + 0.01); g.gain.exponentialRampToValueAtTime(0.0001, t + d);
    o.connect(g).connect(AC.destination); o.start(t); o.stop(t + d + 0.02);
  }
  const SND = {
    put: () => tone(220, 0.08, "square", 0.05),
    flip: (n) => { for (let i = 0; i < Math.min(n, 8); i++) tone(600 + i * 70, 0.06, "triangle", 0.05, 0.08 + i * 0.05); },
    pass: () => tone(330, 0.2, "sine", 0.06),
    win: () => [523, 659, 784, 1046].forEach((f, i) => tone(f, 0.22, "triangle", 0.08, i * 0.13)),
  };
  function renderSound() {
    $("ic-on").hidden = !soundOn; $("ic-off").hidden = soundOn;
    $("sound").setAttribute("aria-label", soundOn ? "Sesi kapat" : "Sesi aç"); $("sound").setAttribute("aria-pressed", String(soundOn));
  }
  $("sound").addEventListener("click", () => { soundOn = !soundOn; try { localStorage.setItem(SOUND_KEY, soundOn ? "1" : "0"); } catch (e) {} renderSound(); });
  renderSound();

  /* ---------- kurallar ---------- */
  const newBoard = () => { const b = Array.from({ length: N }, () => new Array(N).fill(EMPTY)); b[3][3] = 1; b[4][4] = 1; b[3][4] = 0; b[4][3] = 0; return b; };
  function flipsFor(b, r, c, p) {
    if (b[r][c] !== EMPTY) return [];
    const out = [];
    for (const [dr, dc] of DIRS) {
      const line = []; let rr = r + dr, cc = c + dc;
      while (rr >= 0 && rr < N && cc >= 0 && cc < N && b[rr][cc] === 1 - p) { line.push([rr, cc]); rr += dr; cc += dc; }
      if (line.length && rr >= 0 && rr < N && cc >= 0 && cc < N && b[rr][cc] === p) out.push(...line);
    }
    return out;
  }
  function moves(b, p) {
    const out = [];
    for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) { const f = flipsFor(b, r, c, p); if (f.length) out.push({ r, c, f }); }
    return out;
  }
  function apply(b, m, p) { const nb = b.map(row => row.slice()); nb[m.r][m.c] = p; for (const [r, c] of m.f) nb[r][c] = p; return nb; }
  const count = (b, p) => b.reduce((s, row) => s + row.filter(x => x === p).length, 0);

  // değerlendirme: kare ağırlığı + hareket serbestliği (+ oyun sonunda taş sayısı)
  function evalBoard(b, p) {
    let s = 0;
    for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) if (b[r][c] === p) s += WEIGHT[r][c]; else if (b[r][c] === 1 - p) s -= WEIGHT[r][c];
    const mp = moves(b, p).length, mo = moves(b, 1 - p).length;
    s += (mp - mo) * 5;
    return s;
  }
  function minimax(b, p, me, depth, alpha, beta) {
    const ms = moves(b, p);
    if (depth === 0 || (!ms.length && !moves(b, 1 - p).length)) {
      if (!ms.length && !moves(b, 1 - p).length) { const d = count(b, me) - count(b, 1 - me); return d * 1000; }
      return evalBoard(b, me);
    }
    if (!ms.length) return minimax(b, 1 - p, me, depth - 1, alpha, beta);
    if (p === me) {
      let best = -Infinity;
      for (const m of ms) { best = Math.max(best, minimax(apply(b, m, p), 1 - p, me, depth - 1, alpha, beta)); alpha = Math.max(alpha, best); if (alpha >= beta) break; }
      return best;
    }
    let best = Infinity;
    for (const m of ms) { best = Math.min(best, minimax(apply(b, m, p), 1 - p, me, depth - 1, alpha, beta)); beta = Math.min(beta, best); if (alpha >= beta) break; }
    return best;
  }
  function bestMove(b, p, depth) {
    const ms = moves(b, p); if (!ms.length) return null;
    let best = null, bv = -Infinity;
    for (const m of ms) {
      const v = minimax(apply(b, m, p), 1 - p, p, depth - 1, -Infinity, Infinity) + Math.random() * 0.5;
      if (v > bv) { bv = v; best = m; }
    }
    return best;
  }
  // kolay bilgisayar: çoğunlukla en çok taş çeviren hamle, bazen rastgele
  function easyMove(b, p) {
    const ms = moves(b, p); if (!ms.length) return null;
    if (Math.random() < 0.35) return ms[Math.floor(Math.random() * ms.length)];
    return ms.reduce((a, m) => (m.f.length + Math.random() > a.f.length + Math.random() ? m : a));
  }

  /* ---------- durum ---------- */
  let CFG = { mode: "2p", ai: 0, names: ["Enes", "Egemen"], help: [false, true] };
  try { const s = JSON.parse(localStorage.getItem(SAVE_KEY) || "null"); if (s) CFG = Object.assign(CFG, s); } catch (e) {}
  let G = null, fast = false, aiTimer = null, flipped = new Set(), placed = null;
  const isCpu = (p) => CFG.mode === "ai" && p === 1;

  function newGame() {
    clearTimeout(aiTimer);
    G = { b: newBoard(), turn: 0, last: null, over: false, passes: 0 };
    flipped = new Set(); placed = null;
    $("setup").hidden = true; $("end").hidden = true;
    render(); nextTurn();
  }
  function nextTurn() {
    if (G.over) return;
    const ms = moves(G.b, G.turn);
    if (!ms.length) {
      if (!moves(G.b, 1 - G.turn).length) return finish();
      setHint(`${CFG.names[G.turn]} koyacak yer bulamadı, sıra geçti.`); SND.pass();
      G.turn = 1 - G.turn; render();
      return later(fast ? 0 : 900, nextTurn);
    }
    render();
    if (isCpu(G.turn)) {
      setHint(`${CFG.names[1]} düşünüyor…`);
      later(fast ? 0 : 650, () => {
        const m = CFG.ai === 1 ? bestMove(G.b, G.turn, 4) : easyMove(G.b, G.turn);
        play(m.r, m.c);
      });
    } else setHint(`Sıra ${CFG.names[G.turn]}${sfx(CFG.names[G.turn])}: noktalı karelerden birine taş koy.`);
  }
  function later(ms, fn) { if (fast) fn(); else aiTimer = setTimeout(fn, ms); }
  function play(r, c) {
    if (!G || G.over) return false;
    const f = flipsFor(G.b, r, c, G.turn);
    if (!f.length) return false;
    G.b = apply(G.b, { r, c, f }, G.turn);
    G.last = [r, c]; placed = r * N + c; flipped = new Set(f.map(([a, b]) => a * N + b));
    SND.put(); SND.flip(f.length);
    G.turn = 1 - G.turn;
    render(true);
    nextTurn();
    return true;
  }
  function finish() {
    G.over = true; render();
    const a = count(G.b, 0), w = count(G.b, 1);
    const title = a === w ? "Berabere!" : `${CFG.names[a > w ? 0 : 1]} kazandı!`;
    $("end-title").textContent = title;
    $("end-note").textContent = `${CFG.names[0]} ${a} – ${w} ${CFG.names[1]}`;
    setHint(title);
    if (fast) return;
    SND.win();
    setTimeout(() => { $("end").hidden = false; $("again").focus(); }, 900);
  }
  // Türkçe -de/-da eki
  function sfx(name) {
    const l = name.toLocaleLowerCase("tr-TR"), v = (l.match(/[aıoueiöü]/g) || ["e"]).pop(), back = "aıou".includes(v);
    const hard = "fstkçşhp".includes(l.slice(-1));
    return `'${hard ? (back ? "ta" : "te") : (back ? "da" : "de")}`;
  }

  /* ---------- çizim ---------- */
  const board = $("board");
  for (let i = 0; i < N * N; i++) {
    const b = document.createElement("button"); b.type = "button"; b.className = "cell"; b.dataset.i = i;
    b.addEventListener("click", () => { audio(); if (G && !G.over && !isCpu(G.turn)) play(Math.floor(i / N), i % N); });
    board.appendChild(b);
  }
  function setHint(t) { $("hintline").textContent = t; }
  function render(anim) {
    if (fast || !G) return;
    const ms = G.over || isCpu(G.turn) ? [] : moves(G.b, G.turn);
    const can = new Set(ms.map(m => m.r * N + m.c));
    let best = -1;
    if (!G.over && CFG.help[G.turn] && !isCpu(G.turn) && ms.length) { const m = bestMove(G.b, G.turn, 2); best = m.r * N + m.c; }
    const cols = "ABCDEFGH";
    [...board.children].forEach((cell, i) => {
      const r = Math.floor(i / N), c = i % N, v = G.b[r][c];
      cell.className = "cell" + ((r + c) % 2 ? " alt" : "") + (can.has(i) ? " can" : "") + (i === best ? " best" : "") + (G.last && G.last[0] === r && G.last[1] === c ? " last" : "");
      let d = cell.firstChild;
      if (v === EMPTY) { if (d) d.remove(); }
      else {
        if (!d) { d = document.createElement("span"); cell.appendChild(d); }
        d.className = "disc " + (v === 0 ? "b" : "w") + (anim && flipped.has(i) ? " flip" : "") + (anim && placed === i ? " new" : "");
      }
      cell.setAttribute("aria-label", `${cols[c]}${r + 1}: ${v === 0 ? "siyah" : v === 1 ? "beyaz" : can.has(i) ? "boş, oynanabilir" : "boş"}`);
    });
    for (const p of [0, 1]) { $("n" + p).textContent = CFG.names[p]; $("c" + p).textContent = count(G.b, p); $("s" + p).classList.toggle("cur", !G.over && G.turn === p); }
  }

  /* ---------- ayarlar ---------- */
  const form = $("setup-form");
  function sync() {
    const ai = form.mode.value === "ai";
    $("f-ai").hidden = !ai;
    if (ai) { if ($("in1").value === "Egemen") $("in1").value = "Bilgisayar"; $("h1").checked = false; $("h1").disabled = true; }
    else { if ($("in1").value === "Bilgisayar") $("in1").value = "Egemen"; $("h1").disabled = false; }
  }
  function fill() { form.mode.value = CFG.mode; form.ai.value = String(CFG.ai); $("in0").value = CFG.names[0]; $("in1").value = CFG.names[1]; $("h0").checked = CFG.help[0]; $("h1").checked = CFG.help[1]; sync(); }
  form.addEventListener("change", (e) => { if (e.target.name === "mode") sync(); });
  form.addEventListener("submit", (e) => {
    e.preventDefault(); audio();
    const ai = form.mode.value === "ai";
    CFG = { mode: form.mode.value, ai: +form.ai.value, names: [$("in0").value.trim() || "Siyah", $("in1").value.trim() || (ai ? "Bilgisayar" : "Beyaz")], help: [$("h0").checked, ai ? false : $("h1").checked] };
    try { localStorage.setItem(SAVE_KEY, JSON.stringify(CFG)); } catch (_) {}
    newGame();
  });
  $("open-setup").addEventListener("click", () => { clearTimeout(aiTimer); fill(); $("end").hidden = true; $("setup").hidden = false; });
  $("again").addEventListener("click", () => { audio(); newGame(); });
  $("end-setup").addEventListener("click", () => { fill(); $("end").hidden = true; $("setup").hidden = false; });
  fill();
  G = { b: newBoard(), turn: 0, last: null, over: true }; render();
  setHint("");

  // test kancası
  window.__rv = { moves, flipsFor, apply, count, bestMove, easyMove, newBoard, play, newGame, setFast: (f) => { fast = f; }, setCFG: (c) => { CFG = Object.assign(CFG, c); }, get G() { return G; } };
})();
