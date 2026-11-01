/* Solitaire — Enes için Klondike sabır oyunu */
(() => {
  "use strict";
  const $ = (id) => document.getElementById(id);
  const SAVE_KEY = "solitaire";
  const SUITS = ["♠", "♥", "♦", "♣"], RANKS = ["", "A", "2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K"];
  const SUIT_TR = ["maça", "kupa", "karo", "sinek"];
  const red = (c) => c.s === 1 || c.s === 2;
  const table = $("table");

  let save = { wins: 0, best: {} };
  try { save = Object.assign(save, JSON.parse(localStorage.getItem(SAVE_KEY) || "{}")); } catch (e) {}
  const persist = () => { try { localStorage.setItem(SAVE_KEY, JSON.stringify(save)); } catch (e) {} };

  /* ---------- ses ---------- */
  let AC = null;
  function audio() { try { AC = AC || new (window.AudioContext || window.webkitAudioContext)(); if (AC.state === "suspended") AC.resume(); } catch (e) {} }
  function snd(f, d, type, vol, delay) {
    if (!AC) return;
    const t = AC.currentTime + (delay || 0), o = AC.createOscillator(), g = AC.createGain();
    o.type = type || "triangle"; o.frequency.setValueAtTime(f, t);
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol || 0.05, t + 0.01); g.gain.exponentialRampToValueAtTime(0.0001, t + d);
    o.connect(g).connect(AC.destination); o.start(t); o.stop(t + d + 0.02);
  }
  const SND = { place: () => snd(320, 0.06, "square", 0.03), found: () => { snd(660, 0.08); snd(990, 0.1, "triangle", 0.05, 0.06); }, flip: () => snd(520, 0.05, "sine", 0.04), no: () => snd(180, 0.12, "sine", 0.06), win: () => [523, 659, 784, 1046, 1318].forEach((f, i) => snd(f, 0.25, "triangle", 0.07, i * 0.12)) };

  /* ---------- durum ---------- */
  let S = null, undoStack = [], draw = 1, moves = 0, t0 = 0, elapsed = 0, timerOn = false, autoT = null;
  const pileOf = (name) => name === "stock" ? S.stock : name === "waste" ? S.waste : name[0] === "f" ? S.f[+name[1]] : S.t[+name[1]];
  const top = (p) => p[p.length - 1];

  function shuffle(a) { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }
  function deal(d) {
    clearInterval(autoT);
    draw = d;
    const deck = [];
    for (let s = 0; s < 4; s++) for (let r = 1; r <= 13; r++) deck.push({ id: s * 13 + r, s, r, up: false });
    shuffle(deck);
    S = { stock: [], waste: [], f: [[], [], [], []], t: [[], [], [], [], [], [], []] };
    for (let i = 0; i < 7; i++) for (let k = 0; k <= i; k++) { const c = deck.pop(); c.up = k === i; S.t[i].push(c); }
    S.stock = deck;
    undoStack = []; moves = 0; elapsed = 0; timerOn = false;
    $("menu").hidden = true; $("win").hidden = true;
    buildCards(); layout(); render(); stats();
  }
  const snapshot = () => JSON.stringify({ S, moves });
  function pushUndo() { undoStack.push(snapshot()); if (undoStack.length > 300) undoStack.shift(); }
  function startTimer() { if (!timerOn) { timerOn = true; t0 = performance.now() - elapsed * 1000; } }

  /* ---------- kurallar ---------- */
  function canTab(cards, pile) {
    const c = cards[0], tp = top(pile);
    if (!tp) return c.r === 13;
    return tp.up && tp.r === c.r + 1 && red(tp) !== red(c);
  }
  function canFound(cards, pile) {
    if (cards.length !== 1) return false;
    const c = cards[0], tp = top(pile);
    if (!tp) return c.r === 1;
    return tp.s === c.s && tp.r === c.r - 1;
  }
  function legal(fromName, idx, toName) {
    if (fromName === toName) return false;
    const from = pileOf(fromName), cards = from.slice(idx);
    if (!cards.length || !cards[0].up) return false;
    if ((fromName === "waste" || fromName[0] === "f") && idx !== from.length - 1) return false;
    if (toName[0] === "f") return canFound(cards, pileOf(toName));
    if (toName[0] === "t") return canTab(cards, pileOf(toName));
    return false;
  }
  function doMove(fromName, idx, toName, quiet) {
    if (!legal(fromName, idx, toName)) return false;
    pushUndo(); startTimer();
    const from = pileOf(fromName), cards = from.splice(idx);
    pileOf(toName).push(...cards);
    moves++;
    if (fromName[0] === "t" && from.length && !top(from).up) { top(from).up = true; if (!quiet) SND.flip(); }
    if (!quiet) (toName[0] === "f" ? SND.found : SND.place)();
    afterMove();
    return true;
  }
  function drawStock() {
    pushUndo(); startTimer();
    if (!S.stock.length) {
      if (!S.waste.length) { undoStack.pop(); return; }
      S.stock = S.waste.reverse().map(c => (c.up = false, c)); S.waste = [];
    } else {
      for (let i = 0; i < draw && S.stock.length; i++) { const c = S.stock.pop(); c.up = true; S.waste.push(c); }
    }
    moves++; SND.flip(); afterMove();
  }
  function afterMove() {
    render(); stats();
    if (S.f.every(p => p.length === 13)) return win();
    const ready = !S.stock.length && !S.waste.length && S.t.every(p => p.every(c => c.up));
    $("auto").hidden = !ready;
  }
  // dokununca: önce yuva, sonra sütun (kapalı kart açan ya da boş olmayan sütun önce)
  function autoTarget(fromName, idx) {
    const from = pileOf(fromName);
    if (idx === from.length - 1 && fromName[0] !== "f") for (let i = 0; i < 4; i++) if (legal(fromName, idx, "f" + i)) return "f" + i;
    let bestT = null, bestScore = -1;
    for (let i = 0; i < 7; i++) {
      const to = "t" + i;
      if (!legal(fromName, idx, to)) continue;
      let sc = S.t[i].length ? 2 : 1;
      if (fromName[0] === "t" && idx === 0 && !S.t[i].length) continue; // K'yı boş sütundan boş sütuna taşıma
      if (sc > bestScore) { bestScore = sc; bestT = to; }
    }
    return bestT;
  }
  function findHint() {
    // 1) yuvaya gidebilen
    const srcs = [["waste", S.waste.length - 1], ...S.t.map((p, i) => ["t" + i, p.length - 1])];
    for (const [n, i] of srcs) if (i >= 0) for (let f = 0; f < 4; f++) if (legal(n, i, "f" + f)) return { from: n, idx: i, to: "f" + f };
    // 2) kapalı kart açan ya da sütun boşaltan sütun hamlesi
    for (let a = 0; a < 7; a++) {
      const p = S.t[a], first = p.findIndex(c => c.up);
      if (first < 0) continue;
      if (first === 0 && p[0].r === 13) continue;
      for (let b = 0; b < 7; b++) if (legal("t" + a, first, "t" + b)) return { from: "t" + a, idx: first, to: "t" + b };
    }
    // 3) atıktan sütuna
    if (S.waste.length) for (let b = 0; b < 7; b++) if (legal("waste", S.waste.length - 1, "t" + b)) return { from: "waste", idx: S.waste.length - 1, to: "t" + b };
    if (S.stock.length || S.waste.length) return { stock: true };
    return null;
  }
  function win() {
    timerOn = false; $("auto").hidden = true; SND.win();
    const key = "d" + draw, b = save.best[key] || {};
    const sec = Math.round(elapsed);
    const newTime = !b.time || sec < b.time, newMoves = !b.moves || moves < b.moves;
    save.best[key] = { time: Math.min(sec, b.time || 1e9), moves: Math.min(moves, b.moves || 1e9) };
    save.wins++; persist();
    $("win-tx").textContent = `${fmt(sec)} sürede, ${moves} hamlede bitirdin.${newTime ? " Yeni süre rekoru!" : ""}${newMoves ? " Yeni hamle rekoru!" : ""} Toplam kazanma: ${save.wins}.`;
    setTimeout(() => { $("win").hidden = false; $("again").focus(); }, 700);
    stats();
  }
  function autoFinish() {
    clearInterval(autoT);
    autoT = setInterval(() => {
      let moved = false;
      for (let i = 0; i < 7 && !moved; i++) { const p = S.t[i]; if (p.length) for (let f = 0; f < 4 && !moved; f++) if (legal("t" + i, p.length - 1, "f" + f)) { doMove("t" + i, p.length - 1, "f" + f); moved = true; } }
      if (!moved) clearInterval(autoT);
    }, 90);
  }

  /* ---------- yerleşim ve çizim ---------- */
  const L = { cw: 60, ch: 84, gap: 6, tabTop: 100, fan: 14 };
  const els = new Map(); let slotEls = [];
  function buildCards() {
    table.textContent = ""; els.clear(); slotEls = [];
    const names = ["stock", "waste", "f0", "f1", "f2", "f3", "t0", "t1", "t2", "t3", "t4", "t5", "t6"];
    for (const n of names) {
      const d = document.createElement("div"); d.className = "slot" + (n === "stock" ? " stock" : ""); d.dataset.pile = n;
      if (n === "stock") { d.textContent = "↻"; d.setAttribute("role", "button"); d.setAttribute("aria-label", "Deste"); d.addEventListener("click", () => { audio(); drawStock(); }); }
      if (n[0] === "f") d.textContent = "A";
      table.appendChild(d); slotEls.push(d);
    }
    for (let s = 0; s < 4; s++) for (let r = 1; r <= 13; r++) {
      const e = document.createElement("div"), id = s * 13 + r;
      e.className = "card " + (s === 1 || s === 2 ? "red" : "blk"); e.dataset.id = id;
      e.innerHTML = `<span class="tl"><i>${RANKS[r]}</i><i>${SUITS[s]}</i></span><span class="mid">${SUITS[s]}</span>`;
      table.appendChild(e); els.set(id, e);
    }
  }
  function layout() {
    const w = table.clientWidth, h = Math.max(table.clientHeight, 300);
    L.gap = Math.max(3, w * 0.012);
    L.cw = Math.min((w - L.gap * 8) / 7, (h - L.gap * 4) / 1.4 / 3.2);
    L.ch = L.cw * 1.4;
    L.x0 = (w - (L.cw * 7 + L.gap * 6)) / 2;
    L.tabTop = L.ch + L.gap * 3;
    L.h = h;
    table.style.setProperty("--fs", (L.cw * 0.25) + "px");
    for (const e of els.values()) { e.style.width = L.cw + "px"; e.style.height = L.ch + "px"; e.querySelector(".tl").style.fontSize = (L.cw * 0.26) + "px"; e.querySelector(".mid").style.fontSize = (L.cw * 0.5) + "px"; }
    slotEls.forEach(d => { const p = slotPos(d.dataset.pile); Object.assign(d.style, { left: p.x + "px", top: p.y + "px", width: L.cw + "px", height: L.ch + "px", fontSize: (L.cw * 0.35) + "px" }); });
  }
  const colX = (i) => L.x0 + i * (L.cw + L.gap);
  function slotPos(n) {
    if (n === "stock") return { x: colX(0), y: 0 };
    if (n === "waste") return { x: colX(1), y: 0 };
    if (n[0] === "f") return { x: colX(3 + +n[1]), y: 0 };
    return { x: colX(+n[1]), y: L.tabTop };
  }
  // bir sütundaki kartların dikey aralıkları (ekrana sığacak şekilde sıkıştırılır)
  function offsets(p) {
    let down = L.ch * 0.13, up = L.ch * 0.27;
    const nd = p.filter(c => !c.up).length, nu = p.length - nd;
    const room = L.h - L.tabTop - L.ch - 4;
    const need = nd * down + Math.max(0, nu - 1) * up;
    if (need > room && nu > 1) up = Math.max(L.ch * 0.12, (room - nd * down) / (nu - 1));
    return { down, up };
  }
  const loc = new Map();
  function render() {
    loc.clear();
    const place = (c, x, y, z, pile, idx) => {
      const e = els.get(c.id);
      e.style.left = x + "px"; e.style.top = y + "px"; e.style.zIndex = z;
      e.classList.toggle("down", !c.up);
      e.setAttribute("aria-label", c.up ? `${SUIT_TR[c.s]} ${RANKS[c.r]}` : "kapalı kart");
      loc.set(c.id, { pile, idx });
    };
    S.stock.forEach((c, i) => place(c, colX(0), 0, 10 + i, "stock", i));
    const wv = S.waste.length, shown = draw === 3 ? 3 : 1;
    S.waste.forEach((c, i) => { const k = Math.max(0, i - (wv - shown)); place(c, colX(1) + k * L.cw * 0.22, 0, 100 + i, "waste", i); });
    S.f.forEach((p, fi) => p.forEach((c, i) => place(c, colX(3 + fi), 0, 200 + i, "f" + fi, i)));
    S.t.forEach((p, ti) => {
      const o = offsets(p); let y = L.tabTop;
      p.forEach((c, i) => { place(c, colX(ti), y, 300 + i, "t" + ti, i); y += c.up ? o.up : o.down; });
    });
    document.querySelectorAll(".card.hint").forEach(e => e.classList.remove("hint"));
    $("undo").disabled = !undoStack.length;
  }
  const fmt = (s) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}`;
  function stats() {
    $("moves").textContent = moves; $("time").textContent = fmt(elapsed);
    const b = save.best["d" + draw];
    $("best-line").innerHTML = b ? `Rekor <b>${fmt(b.time)}</b> · <b>${b.moves}</b> hamle` : "";
  }
  setInterval(() => { if (timerOn) { elapsed = (performance.now() - t0) / 1000; $("time").textContent = fmt(elapsed); } }, 500);

  /* ---------- sürükle-bırak ve dokunma ---------- */
  let drag = null;
  table.addEventListener("pointerdown", (e) => {
    const ce = e.target.closest(".card"); if (!ce || !S) return;
    audio();
    const l = loc.get(+ce.dataset.id); if (!l) return;
    if (l.pile === "stock") { drawStock(); return; }
    const pile = pileOf(l.pile), c = pile[l.idx];
    if (!c.up) return;
    if ((l.pile === "waste" || l.pile[0] === "f") && l.idx !== pile.length - 1) return;
    const stack = pile.slice(l.idx).map(c => els.get(c.id));
    drag = { pile: l.pile, idx: l.idx, x0: e.clientX, y0: e.clientY, moved: false, stack, starts: stack.map(el => [parseFloat(el.style.left), parseFloat(el.style.top)]) };
    try { table.setPointerCapture(e.pointerId); } catch (_) {}
    e.preventDefault();
  });
  table.addEventListener("pointermove", (e) => {
    if (!drag) return;
    const dx = e.clientX - drag.x0, dy = e.clientY - drag.y0;
    if (!drag.moved && Math.hypot(dx, dy) < 6) return;
    drag.moved = true;
    drag.stack.forEach((el, i) => { el.classList.add("dragging"); el.style.left = (drag.starts[i][0] + dx) + "px"; el.style.top = (drag.starts[i][1] + dy) + "px"; el.style.zIndex = 1000 + i; });
  });
  const endDrag = (e) => {
    if (!drag) return;
    const d = drag; drag = null;
    d.stack.forEach(el => el.classList.remove("dragging"));
    if (!d.moved) {
      const to = autoTarget(d.pile, d.idx);
      if (to) doMove(d.pile, d.idx, to); else { SND.no(); render(); }
      return;
    }
    // bırakılan yer: ilk kartın ortası hangi yığının üstünde
    const r = table.getBoundingClientRect(), first = d.stack[0];
    const cx = parseFloat(first.style.left) + L.cw / 2, cy = parseFloat(first.style.top) + L.ch / 2;
    let target = null, bestD = 1e9;
    for (const n of ["f0", "f1", "f2", "f3", "t0", "t1", "t2", "t3", "t4", "t5", "t6"]) {
      const p = slotPos(n), pile = pileOf(n);
      let py = p.y;
      if (n[0] === "t" && pile.length) py = parseFloat(els.get(top(pile).id).style.top);
      const inX = cx > p.x - L.gap && cx < p.x + L.cw + L.gap;
      const inY = n[0] === "t" ? cy > L.tabTop - L.ch * 0.3 : cy < L.ch * 1.3;
      if (!inX || !inY) continue;
      const dd = Math.abs(cy - (py + L.ch / 2));
      if (dd < bestD && legal(d.pile, d.idx, n)) { bestD = dd; target = n; }
    }
    if (target) doMove(d.pile, d.idx, target); else { SND.no(); render(); }
    void r; void e;
  };
  table.addEventListener("pointerup", endDrag);
  table.addEventListener("pointercancel", () => { if (drag) { drag.stack.forEach(el => el.classList.remove("dragging")); drag = null; render(); } });

  /* ---------- düğmeler ---------- */
  $("undo").addEventListener("click", () => {
    if (!undoStack.length) return;
    clearInterval(autoT);
    const s = JSON.parse(undoStack.pop()); S = s.S; moves = s.moves;
    render(); stats(); $("auto").hidden = true; SND.flip();
  });
  $("hint").addEventListener("click", () => {
    audio(); if (!S) return;
    const h = findHint();
    render();
    if (!h) { SND.no(); return; }
    if (h.stock) { const t = top(S.stock) || top(S.waste); const sl = slotEls[0]; sl.animate([{ boxShadow: "0 0 0 4px #FFD166" }, { boxShadow: "none" }], { duration: 1200 }); if (t) els.get(t.id).classList.add("hint"); return; }
    pileOf(h.from).slice(h.idx).forEach(c => els.get(c.id).classList.add("hint"));
    const tt = top(pileOf(h.to)); if (tt) els.get(tt.id).classList.add("hint");
  });
  $("auto").addEventListener("click", () => { audio(); autoFinish(); });
  $("new").addEventListener("click", () => { renderBest(); $("menu").hidden = false; });
  $("start").addEventListener("click", () => { audio(); deal(+document.querySelector('input[name="draw"]:checked').value); });
  $("again").addEventListener("click", () => { audio(); deal(draw); });
  function renderBest() {
    const b1 = save.best.d1, b3 = save.best.d3;
    $("best").textContent = save.wins ? `Kazanma: ${save.wins}${b1 ? ` · 1 kart rekoru ${fmt(b1.time)}` : ""}${b3 ? ` · 3 kart rekoru ${fmt(b3.time)}` : ""}` : "";
  }
  window.addEventListener("keydown", (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "z") { e.preventDefault(); $("undo").click(); }
    else if (e.key === " " && $("menu").hidden && S) { e.preventDefault(); audio(); drawStock(); }
  });
  if ("ResizeObserver" in window) new ResizeObserver(() => { if (S) { layout(); render(); } }).observe(table);
  renderBest();
  deal(1); $("menu").hidden = false;

  // test kancası
  window.__sol = { get S() { return S; }, legal, doMove, drawStock, findHint, autoTarget, deal, get moves() { return moves; }, autoFinish };
})();
