/* Beş Taş — iki kişilik beşli dizme oyunu (13×13) */
(() => {
  "use strict";
  const $ = (id) => document.getElementById(id);
  const SAVE_KEY = "bes-tas", SOUND_KEY = "bes-tas-ses", N = 13, EMPTY = -1;
  const DIRS = [[1, 0], [0, 1], [1, 1], [1, -1]];

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
  function renderSound() { $("ic-on").hidden = !soundOn; $("ic-off").hidden = soundOn; $("sound").setAttribute("aria-label", soundOn ? "Sesi kapat" : "Sesi aç"); }
  $("sound").addEventListener("click", () => { soundOn = !soundOn; try { localStorage.setItem(SOUND_KEY, soundOn ? "1" : "0"); } catch (e) {} renderSound(); });
  renderSound();

  /* ---------- kurallar ---------- */
  const newBoard = () => Array.from({ length: N }, () => new Array(N).fill(EMPTY));
  const inB = (r, c) => r >= 0 && c >= 0 && r < N && c < N;
  function lineAt(b, r, c, p) {
    for (const [dr, dc] of DIRS) {
      const cells = [[r, c]];
      for (const s of [1, -1]) { let rr = r + dr * s, cc = c + dc * s; while (inB(rr, cc) && b[rr][cc] === p) { cells.push([rr, cc]); rr += dr * s; cc += dc * s; } }
      if (cells.length >= 5) return cells;
    }
    return null;
  }
  // bir hamlenin değeri: kendi dizilerini uzatma + rakibinkini kesme
  function scoreFor(b, r, c, p) {
    let s = 0;
    for (const [dr, dc] of DIRS) {
      let cnt = 1, open = 0;
      for (const sg of [1, -1]) {
        let rr = r + dr * sg, cc = c + dc * sg;
        while (inB(rr, cc) && b[rr][cc] === p) { cnt++; rr += dr * sg; cc += dc * sg; }
        if (inB(rr, cc) && b[rr][cc] === EMPTY) open++;
      }
      if (cnt >= 5) s += 100000;
      else if (cnt === 4) s += open === 2 ? 20000 : open === 1 ? 4000 : 0;
      else if (cnt === 3) s += open === 2 ? 2500 : open === 1 ? 300 : 0;
      else if (cnt === 2) s += open === 2 ? 120 : open === 1 ? 30 : 0;
      else s += open * 4;
    }
    return s;
  }
  function candidates(b) {
    const out = [], any = b.some(row => row.some(v => v !== EMPTY));
    if (!any) return [[N >> 1, N >> 1]];
    for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) {
      if (b[r][c] !== EMPTY) continue;
      let near = false;
      for (let dr = -2; dr <= 2 && !near; dr++) for (let dc = -2; dc <= 2 && !near; dc++) if (inB(r + dr, c + dc) && b[r + dr][c + dc] !== EMPTY) near = true;
      if (near) out.push([r, c]);
    }
    return out;
  }
  function bestMove(b, p, level) {
    let best = null, bv = -1;
    for (const [r, c] of candidates(b)) {
      const atk = scoreFor(b, r, c, p), def = scoreFor(b, r, c, 1 - p);
      const v = (level === 0 ? atk * 0.6 + def * (Math.random() < 0.7 ? 0.5 : 0.1) : atk * 1.05 + def) + Math.random() * (level === 0 ? 2500 : 10);
      if (v > bv) { bv = v; best = [r, c]; }
    }
    return best;
  }
  // tehlike: rakip buraya oynarsa dörtlü/açık üçlü olur mu
  function dangers(b, p) {
    const out = [];
    for (const [r, c] of candidates(b)) if (scoreFor(b, r, c, 1 - p) >= 2500) out.push(r * N + c);
    return out;
  }

  /* ---------- durum ---------- */
  let CFG = { mode: "2p", ai: 0, names: ["Enes", "Egemen"], help: [false, true] };
  try { const s = JSON.parse(localStorage.getItem(SAVE_KEY) || "null"); if (s) CFG = Object.assign(CFG, s); } catch (e) {}
  let G = null, fast = false, aiTimer = null;
  const isCpu = (p) => CFG.mode === "ai" && p === 1;
  function newGame() {
    clearTimeout(aiTimer);
    G = { b: newBoard(), turn: 0, last: null, over: false, win: null, moves: 0 };
    $("setup").hidden = true; $("end").hidden = true;
    render(); nextTurn();
  }
  function nextTurn() {
    if (G.over) return;
    render();
    if (isCpu(G.turn)) { setHint(`${CFG.names[1]} düşünüyor…`); later(fast ? 0 : 550, () => { const m = bestMove(G.b, G.turn, CFG.ai); play(m[0], m[1]); }); }
    else setHint(`Sıra ${CFG.names[G.turn]}${sfx(CFG.names[G.turn])}.`);
  }
  function later(ms, fn) { if (fast) fn(); else aiTimer = setTimeout(fn, ms); }
  function play(r, c) {
    if (!G || G.over || !inB(r, c) || G.b[r][c] !== EMPTY) return false;
    G.b[r][c] = G.turn; G.last = [r, c]; G.moves++;
    tone(G.turn ? 520 : 420, 0.08, "square", 0.04);
    const w = lineAt(G.b, r, c, G.turn);
    if (w) { G.over = true; G.win = w; render(); return finish(G.turn), true; }
    if (G.moves >= N * N) { G.over = true; render(); return finish(-1), true; }
    G.turn = 1 - G.turn; nextTurn();
    return true;
  }
  function finish(w) {
    const t = w < 0 ? "Berabere!" : `${CFG.names[w]} kazandı!`;
    $("end-title").textContent = t; $("end-note").textContent = w < 0 ? "Tahta doldu." : `${G.moves} hamlede beş taşı dizdi.`;
    setHint(t);
    if (fast) return;
    [523, 659, 784, 1046].forEach((f, i) => tone(f, 0.22, "triangle", 0.08, i * 0.13));
    setTimeout(() => { $("end").hidden = false; $("again").focus(); }, 1000);
  }
  function sfx(name) { const l = name.toLocaleLowerCase("tr-TR"), v = (l.match(/[aıoueiöü]/g) || ["e"]).pop(), back = "aıou".includes(v), hard = "fstkçşhp".includes(l.slice(-1)); return `'${hard ? (back ? "ta" : "te") : (back ? "da" : "de")}`; }

  /* ---------- çizim ---------- */
  const board = $("board");
  for (let i = 0; i < N * N; i++) {
    const b = document.createElement("button"); b.type = "button"; b.className = "cell";
    b.addEventListener("click", () => { audio(); if (G && !G.over && !isCpu(G.turn)) play(Math.floor(i / N), i % N); });
    board.appendChild(b);
  }
  function setHint(t) { $("hintline").textContent = t; }
  function render() {
    if (fast || !G) return;
    const helping = !G.over && CFG.help[G.turn] && !isCpu(G.turn) && G.moves > 0;
    const dz = helping ? new Set(dangers(G.b, G.turn)) : new Set();
    let best = -1; if (helping) { const m = bestMove(G.b, G.turn, 1); best = m[0] * N + m[1]; }
    const win = new Set((G.win || []).map(([r, c]) => r * N + c));
    [...board.children].forEach((cell, i) => {
      const r = Math.floor(i / N), c = i % N, v = G.b[r][c];
      cell.className = "cell" + (i === best ? " best" : dz.has(i) ? " danger" : "") + (win.has(i) ? " win" : "") + (G.last && G.last[0] === r && G.last[1] === c ? " last" : "");
      cell.innerHTML = v === EMPTY ? (i === best || dz.has(i) ? '<span class="ring"></span>' : "") : `<span class="disc ${v === 0 ? "b" : "w"}"></span>`;
      cell.setAttribute("aria-label", `${r + 1}. satır ${c + 1}. sütun: ${v === 0 ? "siyah" : v === 1 ? "beyaz" : "boş"}`);
    });
    for (const p of [0, 1]) { $("n" + p).textContent = CFG.names[p]; $("c" + p).textContent = G.b.flat().filter(x => x === p).length; $("s" + p).classList.toggle("cur", !G.over && G.turn === p); }
  }

  /* ---------- ayarlar ---------- */
  const form = $("setup-form");
  function sync() { const ai = form.mode.value === "ai"; $("f-ai").hidden = !ai; if (ai) { if ($("in1").value === "Egemen") $("in1").value = "Bilgisayar"; $("h1").checked = false; $("h1").disabled = true; } else { if ($("in1").value === "Bilgisayar") $("in1").value = "Egemen"; $("h1").disabled = false; } }
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
  G = { b: newBoard(), turn: 0, last: null, over: true, moves: 0 }; render(); setHint("");

  window.__bt = { lineAt, bestMove, scoreFor, play, newGame, setFast: (f) => { fast = f; }, setCFG: (c) => { CFG = Object.assign(CFG, c); }, newBoard, get G() { return G; } };
})();
