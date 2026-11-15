/* Duvar Ustası — iki kişilik yol ve duvar strateji oyunu */
(() => {
  "use strict";
  const $ = (id) => document.getElementById(id);
  const SAVE_KEY = "duvar-ustasi", SOUND_KEY = "duvar-ustasi-ses", NS = "http://www.w3.org/2000/svg";
  const S = 60, G = 14, M = 12;

  /* ---------- ses ---------- */
  let AC = null, soundOn = true, fast = false;
  try { soundOn = localStorage.getItem(SOUND_KEY) !== "0"; } catch (e) {}
  function audio() { try { AC = AC || new (window.AudioContext || window.webkitAudioContext)(); if (AC.state === "suspended") AC.resume(); } catch (e) {} }
  function tone(f, d = 0.1, type = "triangle", vol = 0.06, delay = 0) {
    if (!AC || !soundOn || fast) return;
    const t = AC.currentTime + delay, o = AC.createOscillator(), g = AC.createGain();
    o.type = type; o.frequency.setValueAtTime(f, t);
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + 0.01); g.gain.exponentialRampToValueAtTime(0.0001, t + d);
    o.connect(g).connect(AC.destination); o.start(t); o.stop(t + d + 0.02);
  }
  const SND = { step: () => tone(440, 0.07, "triangle", 0.06), wall: () => { tone(160, 0.12, "square", 0.06); tone(120, 0.15, "square", 0.05, 0.05); }, no: () => tone(200, 0.12, "sine", 0.05), win: () => [523, 659, 784, 1046].forEach((f, i) => tone(f, 0.22, "triangle", 0.08, i * 0.13)) };
  function renderSound() { $("ic-on").hidden = !soundOn; $("ic-off").hidden = soundOn; $("sound").setAttribute("aria-label", soundOn ? "Sesi kapat" : "Sesi aç"); $("sound").setAttribute("aria-pressed", String(soundOn)); }
  $("sound").addEventListener("click", () => { soundOn = !soundOn; try { localStorage.setItem(SOUND_KEY, soundOn ? "1" : "0"); } catch (e) {} renderSound(); });
  renderSound();

  /* ---------- kurallar ---------- */
  // durum: N, pos[[r,c],[r,c]], walls Set("h r,c" / "v r,c"), left[2], turn
  const goal = (st, p) => p === 0 ? 0 : st.N - 1;
  function blockedDown(W, r, c) { return W.has(`h${r},${c}`) || W.has(`h${r},${c - 1}`); }
  function blockedRight(W, r, c) { return W.has(`v${r},${c}`) || W.has(`v${r - 1},${c}`); }
  function canStep(st, r, c, dr, dc, W) {
    W = W || st.walls; const r2 = r + dr, c2 = c + dc;
    if (r2 < 0 || c2 < 0 || r2 >= st.N || c2 >= st.N) return false;
    if (dr === 1) return !blockedDown(W, r, c);
    if (dr === -1) return !blockedDown(W, r2, c);
    if (dc === 1) return !blockedRight(W, r, c);
    return !blockedRight(W, r, c2);
  }
  const DIR4 = [[-1, 0], [1, 0], [0, -1], [0, 1]];
  function path(st, p, W) { // en kısa yol (hücre listesi) ya da null
    W = W || st.walls;
    const [sr, sc] = st.pos[p], gr = goal(st, p), N = st.N, prev = new Int16Array(N * N).fill(-1), seen = new Uint8Array(N * N);
    const q = [sr * N + sc]; seen[q[0]] = 1;
    for (let h = 0; h < q.length; h++) {
      const k = q[h], r = Math.floor(k / N), c = k % N;
      if (r === gr) { const out = []; let x = k; while (x !== -1) { out.unshift([Math.floor(x / N), x % N]); x = prev[x]; } return out; }
      for (const [dr, dc] of DIR4) {
        if (!canStep(st, r, c, dr, dc, W)) continue;
        const n = (r + dr) * N + c + dc; if (seen[n]) continue; seen[n] = 1; prev[n] = k; q.push(n);
      }
    }
    return null;
  }
  const dist = (st, p, W) => { const pth = path(st, p, W); return pth ? pth.length - 1 : Infinity; };
  function pawnMoves(st, p) {
    const out = [], [r, c] = st.pos[p], [or, oc] = st.pos[1 - p];
    for (const [dr, dc] of DIR4) {
      if (!canStep(st, r, c, dr, dc)) continue;
      const r2 = r + dr, c2 = c + dc;
      if (r2 !== or || c2 !== oc) { out.push([r2, c2]); continue; }
      // rakibin üstünden atla
      if (canStep(st, r2, c2, dr, dc)) out.push([r2 + dr, c2 + dc]);
      else for (const [er, ec] of dr ? [[0, -1], [0, 1]] : [[-1, 0], [1, 0]]) if (canStep(st, r2, c2, er, ec)) out.push([r2 + er, c2 + ec]);
    }
    return out;
  }
  function wallConflicts(W, key) {
    const o = key[0], [r, c] = key.slice(1).split(",").map(Number);
    if (W.has(key)) return true;
    if (o === "h") return W.has(`h${r},${c - 1}`) || W.has(`h${r},${c + 1}`) || W.has(`v${r},${c}`);
    return W.has(`v${r - 1},${c}`) || W.has(`v${r + 1},${c}`) || W.has(`h${r},${c}`);
  }
  function wallOk(st, key) {
    const [r, c] = key.slice(1).split(",").map(Number);
    if (r < 0 || c < 0 || r > st.N - 2 || c > st.N - 2) return false;
    if (st.left[st.turn] <= 0 || wallConflicts(st.walls, key)) return false;
    const W = new Set(st.walls); W.add(key);
    return path(st, 0, W) && path(st, 1, W) ? true : false;
  }
  function apply(st, mv) { // mv: {t:"m", to:[r,c]} | {t:"w", k}
    const n = { N: st.N, pos: st.pos.map(x => x.slice()), walls: new Set(st.walls), left: st.left.slice(), turn: 1 - st.turn };
    if (mv.t === "m") n.pos[st.turn] = mv.to.slice(); else { n.walls.add(mv.k); n.left[st.turn]--; }
    return n;
  }
  const winner = (st) => st.pos[0][0] === 0 ? 0 : st.pos[1][0] === st.N - 1 ? 1 : -1;

  /* ---------- yapay zekâ ---------- */
  function wallsAgainst(st, p) { // p'nin yolunu kesen aday duvarlar
    const pth = path(st, p); if (!pth) return [];
    const out = new Set();
    for (let i = 0; i < Math.min(pth.length - 1, 5); i++) {
      const [r1, c1] = pth[i], [r2, c2] = pth[i + 1];
      if (r1 !== r2) { const r = Math.min(r1, r2); out.add(`h${r},${c1}`); out.add(`h${r},${c1 - 1}`); }
      else { const c = Math.min(c1, c2); out.add(`v${r1},${c}`); out.add(`v${r1 - 1},${c}`); }
    }
    return [...out];
  }
  function cands(st) {
    const p = st.turn, out = pawnMoves(st, p).map(to => ({ t: "m", to }));
    if (st.left[p] > 0) for (const k of wallsAgainst(st, 1 - p)) if (wallOk(st, k)) out.push({ t: "w", k });
    return out;
  }
  function evalSt(st, me) {
    const w = winner(st); if (w === me) return 1000; if (w === 1 - me) return -1000;
    return dist(st, 1 - me) - dist(st, me) + 0.3 * (st.left[me] - st.left[1 - me]) + (st.turn === me ? 0.5 : -0.5);
  }
  function bestMove(st, depth) {
    const me = st.turn;
    const search = (s, d) => {
      if (d === 0 || winner(s) >= 0) return evalSt(s, me);
      const cs = cands(s); let best = s.turn === me ? -Infinity : Infinity;
      for (const m of cs) { const v = search(apply(s, m), d - 1); best = s.turn === me ? Math.max(best, v) : Math.min(best, v); }
      return best;
    };
    let bm = null, bv = -Infinity;
    for (const m of cands(st)) { const v = search(apply(st, m), depth - 1) + Math.random() * 0.2 - (m.t === "w" ? 0.15 : 0); if (v > bv) { bv = v; bm = m; } }
    return bm;
  }
  function easyMove(st) {
    const p = st.turn, pth = path(st, p);
    if (st.left[p] > 0 && Math.random() < 0.25) { const ws = wallsAgainst(st, 1 - p).filter(k => wallOk(st, k)); if (ws.length) return { t: "w", k: ws[Math.floor(Math.random() * ws.length)] }; }
    const pm = pawnMoves(st, p);
    if (pth && Math.random() < 0.8) { const nx = pth[1]; const m = pm.find(([r, c]) => r === nx[0] && c === nx[1]); if (m) return { t: "m", to: m }; }
    // en çok yaklaştıran
    let b = pm[0], bd = Infinity; for (const to of pm) { const d = dist(apply(st, { t: "m", to }), p); if (d < bd) { bd = d; b = to; } }
    return { t: "m", to: b };
  }

  /* ---------- oyun ---------- */
  let CFG = { mode: "2p", ai: 0, size: 7, names: ["Enes", "Egemen"], help: [false, true] };
  try { const s = JSON.parse(localStorage.getItem(SAVE_KEY) || "null"); if (s) CFG = Object.assign(CFG, s); } catch (e) {}
  let ST = null, over = true, mode = "move", rotH = true, prevW = null, aiTimer = null, lastMv = null;
  const isCpu = (p) => CFG.mode === "ai" && p === 1;
  function newGame() {
    clearTimeout(aiTimer);
    const N = CFG.size, mid = Math.floor(N / 2), nw = N === 9 ? 10 : 6;
    ST = { N, pos: [[N - 1, mid], [0, mid]], walls: new Set(), left: [nw, nw], turn: 0 };
    over = false; prevW = null; lastMv = null; setMode("move");
    $("setup").hidden = true; $("end").hidden = true;
    buildBoard(); nextTurn();
  }
  function nextTurn() {
    const w = winner(ST); if (w >= 0) return finish(w);
    prevW = null; render();
    const p = ST.turn, nm = CFG.names[p];
    if (isCpu(p)) {
      setHint(`${nm} düşünüyor…`);
      aiTimer = setTimeout(() => { const m = CFG.ai ? bestMove(ST, 2) : easyMove(ST); play(m); }, fast ? 0 : 650);
    } else setHint(`Sıra ${nm}${sfx(nm)}: ${ST.left[p] ? "yürü ya da duvar koy." : "duvarın bitti, yürü."}`);
  }
  function play(mv) {
    if (over || !mv) return false;
    if (mv.t === "m") { if (!pawnMoves(ST, ST.turn).some(([r, c]) => r === mv.to[0] && c === mv.to[1])) return false; SND.step(); }
    else { if (!wallOk(ST, mv.k)) return false; SND.wall(); }
    lastMv = mv; ST = apply(ST, mv); setMode("move");
    nextTurn(); return true;
  }
  function finish(w) {
    over = true; render();
    $("end-title").textContent = `${CFG.names[w]} kazandı!`;
    $("end-note").textContent = `${CFG.names[w]} karşı kenara ulaştı. Kalan duvarlar: ${ST.left[0]} – ${ST.left[1]}`;
    setHint(`${CFG.names[w]} kazandı!`);
    if (fast) return;
    SND.win(); setTimeout(() => { $("end").hidden = false; $("again").focus(); }, 900);
  }
  function sfx(name) { const l = name.toLocaleLowerCase("tr-TR"), v = (l.match(/[aıoueiöü]/g) || ["e"]).pop(), back = "aıou".includes(v), hard = "fstkçşhp".includes(l.slice(-1)); return `'${hard ? (back ? "ta" : "te") : (back ? "da" : "de")}`; }
  function setHint(t) { $("hintline").textContent = t; }
  function setMode(m) {
    mode = m; prevW = null;
    $("m-move").classList.toggle("on", m === "move"); $("m-wall").classList.toggle("on", m === "wall");
    $("m-move").setAttribute("aria-pressed", String(m === "move")); $("m-wall").setAttribute("aria-pressed", String(m === "wall"));
    if (ST) render();
  }

  /* ---------- çizim ---------- */
  const svg = $("board");
  const X = (c) => M + c * (S + G), Y = (r) => M + r * (S + G);
  const el = (tag, a, parent) => { const e = document.createElementNS(NS, tag); for (const k in a) e.setAttribute(k, a[k]); (parent || svg).appendChild(e); return e; };
  let layer = null, cellEls = [];
  function buildBoard() {
    const N = ST.N, size = 2 * M + N * S + (N - 1) * G;
    svg.setAttribute("viewBox", `0 0 ${size} ${size}`); svg.textContent = "";
    el("rect", { x: 0, y: 0, width: size, height: size, rx: 18, fill: "#6B4423" });
    cellEls = [];
    for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) {
      const e = el("rect", { class: "cellr" + (r === 0 ? " goal0" : r === N - 1 ? " goal1" : ""), x: X(c), y: Y(r), width: S, height: S, rx: 8 });
      cellEls.push(e);
    }
    layer = el("g", {});
  }
  function render() {
    if (fast || !layer) return;
    layer.textContent = "";
    const p = ST.turn, mine = !over && !isCpu(p);
    const moves = mine && mode === "move" ? pawnMoves(ST, p) : [];
    const N = ST.N;
    cellEls.forEach((e, i) => { const r = Math.floor(i / N), c = i % N; e.classList.toggle("can", moves.some(([a, b]) => a === r && b === c)); });
    // yardım: yollar
    for (const q of [0, 1]) {
      if (over || !CFG.help[q] || isCpu(q)) continue;
      const pth = path(ST, q); if (!pth) continue;
      for (const [r, c] of pth.slice(1)) el("circle", { class: "pathd" + (q !== p ? " o" : ""), cx: X(c) + S / 2 + (q ? 6 : -6), cy: Y(r) + S / 2, r: 5, fill: q ? "#FFC9CB" : "#CFE6FF" }, layer);
    }
    for (const k of ST.walls) wallRect(k, "wall");
    if (prevW) wallRect(prevW.k, "wall prev" + (prevW.ok ? "" : " bad"));
    [0, 1].forEach(q => {
      const [r, c] = ST.pos[q], g = el("g", { class: "pawn" }, layer);
      el("circle", { cx: X(c) + S / 2, cy: Y(r) + S / 2 + 3, r: S * 0.34, fill: "rgba(0,0,0,.3)" }, g);
      el("circle", { cx: X(c) + S / 2, cy: Y(r) + S / 2, r: S * 0.34, fill: q ? "#E5484D" : "#3D8BFD", stroke: "#fff", "stroke-width": q === p && !over ? 5 : 2 }, g);
      el("circle", { cx: X(c) + S / 2 - 6, cy: Y(r) + S / 2 - 7, r: 6, fill: "rgba(255,255,255,.55)" }, g);
    });
    for (const q of [0, 1]) { $("n" + q).textContent = CFG.names[q]; $("c" + q).textContent = ST.left[q]; $("s" + q).classList.toggle("cur", !over && ST.turn === q); }
    $("m-wall").disabled = !mine || ST.left[p] <= 0;
    $("m-move").disabled = !mine; $("m-rot").disabled = !mine;
  }
  function wallRect(k, cls) {
    const o = k[0], [r, c] = k.slice(1).split(",").map(Number);
    if (o === "h") el("rect", { class: cls, x: X(c) - 2, y: Y(r) + S + 1, width: 2 * S + G + 4, height: G - 2, rx: 4 }, layer);
    else el("rect", { class: cls, x: X(c) + S + 1, y: Y(r) - 2, width: G - 2, height: 2 * S + G + 4, rx: 4 }, layer);
  }

  /* ---------- girdi ---------- */
  function boardPt(e) { const r = svg.getBoundingClientRect(), vb = svg.viewBox.baseVal; return { x: (e.clientX - r.left) * vb.width / r.width, y: (e.clientY - r.top) * vb.height / r.height }; }
  svg.addEventListener("click", (e) => {
    audio(); if (!ST || over || isCpu(ST.turn)) return;
    const { x, y } = boardPt(e), N = ST.N;
    if (mode === "move") {
      const c = Math.floor((x - M) / (S + G)), r = Math.floor((y - M) / (S + G));
      if (r < 0 || c < 0 || r >= N || c >= N) return;
      if (!play({ t: "m", to: [r, c] })) { SND.no(); setHint("Oraya gidemezsin: açık renkli karelerden birine dokun."); }
      return;
    }
    // duvar: en yakın çizgi kesişimi
    let r = Math.round((y - M - S - G / 2) / (S + G)), c = Math.round((x - M - S - G / 2) / (S + G));
    r = Math.max(0, Math.min(N - 2, r)); c = Math.max(0, Math.min(N - 2, c));
    const k = (rotH ? "h" : "v") + r + "," + c;
    if (prevW && prevW.k === k) {
      if (prevW.ok) play({ t: "w", k }); else { SND.no(); setHint("Bu duvar konamaz: başka duvarla çakışıyor ya da yolu tamamen kapatıyor."); }
      return;
    }
    prevW = { k, ok: wallOk(ST, k) }; render();
    setHint(prevW.ok ? "Duvarı koymak için gölgeye tekrar dokun. ↔/↕ ile çevirebilirsin." : "Buraya duvar konamaz (çakışma ya da yol kapanıyor).");
  });
  $("m-move").addEventListener("click", () => setMode("move"));
  $("m-wall").addEventListener("click", () => { if (ST && ST.left[ST.turn] > 0) { setMode("wall"); setHint("Çizgilerin arasına dokun, sonra gölgeye tekrar dokun."); } });
  $("m-rot").addEventListener("click", () => {
    rotH = !rotH; $("m-rot").textContent = rotH ? "↔ Yatay" : "↕ Dikey";
    if (prevW) { const k = (rotH ? "h" : "v") + prevW.k.slice(1); prevW = { k, ok: wallOk(ST, k) }; render(); }
  });

  /* ---------- ayarlar ---------- */
  const form = $("setup-form");
  function sync() {
    const ai = form.mode.value === "ai";
    $("f-ai").hidden = !ai;
    if (ai) { if ($("in1").value === "Egemen") $("in1").value = "Bilgisayar"; $("h1").checked = false; $("h1").disabled = true; }
    else { if ($("in1").value === "Bilgisayar") $("in1").value = "Egemen"; $("h1").disabled = false; }
  }
  function fill() { form.mode.value = CFG.mode; form.ai.value = String(CFG.ai); form.size.value = String(CFG.size); $("in0").value = CFG.names[0]; $("in1").value = CFG.names[1]; $("h0").checked = CFG.help[0]; $("h1").checked = CFG.help[1]; sync(); }
  form.addEventListener("change", (e) => { if (e.target.name === "mode") sync(); });
  form.addEventListener("submit", (e) => {
    e.preventDefault(); audio();
    const ai = form.mode.value === "ai";
    CFG = { mode: form.mode.value, ai: +form.ai.value, size: +form.size.value, names: [$("in0").value.trim() || "Mavi", $("in1").value.trim() || (ai ? "Bilgisayar" : "Kırmızı")], help: [$("h0").checked, ai ? false : $("h1").checked] };
    try { localStorage.setItem(SAVE_KEY, JSON.stringify(CFG)); } catch (_) {}
    newGame();
  });
  $("open-setup").addEventListener("click", () => { clearTimeout(aiTimer); fill(); $("end").hidden = true; $("setup").hidden = false; });
  $("again").addEventListener("click", () => { audio(); newGame(); });
  $("end-setup").addEventListener("click", () => { fill(); $("end").hidden = true; $("setup").hidden = false; });
  fill();
  { const N = CFG.size, mid = Math.floor(N / 2); ST = { N, pos: [[N - 1, mid], [0, mid]], walls: new Set(), left: [0, 0], turn: 0 }; buildBoard(); render(); }
  setHint("");

  window.__du = { pawnMoves, wallOk, path, dist, apply, winner, bestMove, easyMove, play, newGame, setFast: (f) => { fast = f; }, setCFG: (c) => { CFG = Object.assign(CFG, c); }, get ST() { return ST; }, get over() { return over; } };
})();
