/* Mutfak Kardeşler — iki kişilik ortak yemek oyunu */
(function () {
  "use strict";
  const W = 960, H = 600, TS = 60, COLS = 16, ROWS = 9, OY = 60;
  const $ = (id) => document.getElementById(id);
  const cv = $("cv"); let ctx = cv.getContext("2d");
  const SAVE = "mutfak-kardesler";
  const rnd = (a, b) => a + Math.random() * (b - a);
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const pick = (a) => a[Math.floor(Math.random() * a.length)];
  const OL = "#3A2418";

  /* ---------- tarifler ve mutfaklar ---------- */
  const RECIPES = {
    salata: { name: "Salata", parts: ["marul:dograndi", "domates:dograndi"] },
    burger: { name: "Hamburger", parts: ["ekmek:cig", "kofte:pisti", "marul:dograndi"] },
    corba: { name: "Domates Çorbası", parts: ["corba:pisti"] },
    pizza: { name: "Pizza", parts: ["pizza:pisti"] }
  };
  const LEVELS = [
    { name: "Salata Büfesi", rec: ["salata"], every: 20, limit: 70, map: [
      "#MM#DD####T##WW#",
      "#..............#",
      "#..1...........#",
      "B..............#",
      "B.....####.....X",
      "#.....####.....#",
      "#...........2..#",
      "#..............#",
      "##B####B#####T##"] },
    { name: "Burger Zamanı", rec: ["salata", "burger"], every: 20, limit: 80, map: [
      "#MM#DD#EE#T#WW##",
      "#..............#",
      "K..1...........S",
      "K..............S",
      "#.....####.....#",
      "B.....####.....#",
      "B...........2..X",
      "#..............#",
      "###B#####T##S###"] },
    { name: "Ayrık Mutfak", rec: ["salata", "burger"], every: 20, limit: 85, map: [
      "#MM#DDE###T##WW#",
      "#.......#......#",
      "K..1....#......S",
      "K.......#......S",
      "B.......#......#",
      "B.......#...2..X",
      "#.......#......#",
      "#.......#......#",
      "###B######T#S###"] },
    { name: "Çorba Günü", rec: ["salata", "burger", "corba"], every: 18, limit: 85, map: [
      "#MM#DD#EE#TT#WW#",
      "#..............#",
      "K..1...........O",
      "K..............O",
      "#....######....#",
      "B....######....S",
      "B...........2..S",
      "#..............#",
      "###B####X####B##"] },
    { name: "Pizzacı", rec: ["pizza", "salata"], every: 18, limit: 90, map: [
      "#HH#PP#DD#TT#WW#",
      "#..............#",
      "M..1...........F",
      "M..............F",
      "#.....####.....#",
      "B.....####.....#",
      "B...........2..X",
      "#..............#",
      "###B####B####T##"] },
    { name: "Büyük Ziyafet", rec: ["salata", "burger", "corba", "pizza"], every: 16, limit: 95, map: [
      "#MM#DD#HP#TT#WW#",
      "#..............#",
      "K.......#......O",
      "K..1....#......O",
      "B..............F",
      "B.......#...2..F",
      "#.......#......S",
      "E.......#......S",
      "###B#####X#T####"] }
  ];
  const CRATE = { M: "marul", D: "domates", K: "kofte", E: "ekmek", P: "peynir", H: "hamur" };
  const NAMES = { marul: "Marul", domates: "Domates", kofte: "Köfte", ekmek: "Ekmek", peynir: "Peynir", hamur: "Hamur" };
  const CHOP = new Set(["marul", "domates", "peynir"]);
  const DUR = 180;

  /* ---------- ses ---------- */
  let ac = null, master = null, mg = null, muted = false;
  try { muted = localStorage.getItem(SAVE + ":mute") === "1"; } catch (e) {}
  function audio() { if (!ac) { const C = window.AudioContext || window.webkitAudioContext; if (!C) return; ac = new C(); master = ac.createGain(); master.gain.value = muted ? 0 : 1; master.connect(ac.destination); mg = ac.createGain(); mg.gain.value = .4; mg.connect(master); } if (ac.state === "suspended") ac.resume(); }
  function tone(f, d, type, vol, when, slide, dest) { if (!ac || muted || fast) return; const t = when || ac.currentTime, o = ac.createOscillator(), g = ac.createGain(); o.type = type || "triangle"; o.frequency.setValueAtTime(f, t); if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(30, slide), t + d); g.gain.setValueAtTime(.0001, t); g.gain.linearRampToValueAtTime(vol || .1, t + .01); g.gain.exponentialRampToValueAtTime(.0008, t + d); o.connect(g); g.connect(dest || master); o.start(t); o.stop(t + d + .02); }
  let nb = null;
  function noise(d, vol, freq, q) { if (!ac || muted || fast) return; if (!nb) { nb = ac.createBuffer(1, ac.sampleRate, ac.sampleRate); const c = nb.getChannelData(0); for (let i = 0; i < c.length; i++) c[i] = Math.random() * 2 - 1; } const s = ac.createBufferSource(), f = ac.createBiquadFilter(), g = ac.createGain(), t = ac.currentTime; s.buffer = nb; f.type = "bandpass"; f.frequency.value = freq || 1500; f.Q.value = q || 1; g.gain.setValueAtTime(vol || .1, t); g.gain.exponentialRampToValueAtTime(.001, t + d); s.connect(f); f.connect(g); g.connect(master); s.start(t); s.stop(t + d); }
  const now = () => ac ? ac.currentTime : 0;
  const sfx = {
    pick() { tone(600, .07, "sine", .08, 0, 900); }, drop() { tone(420, .08, "sine", .08, 0, 260); },
    chop() { noise(.05, .12, 2500, 2); tone(900, .03, "square", .02); }, done() { const t = now(); tone(880, .08, "triangle", .08, t); tone(1175, .12, "triangle", .08, t + .07); },
    sizzle() { noise(.3, .03, 5000, .5); }, burn() { tone(200, .4, "sawtooth", .06, 0, 90); },
    serve() { const t = now(); [784, 988, 1175, 1568].forEach((f, i) => tone(f, .15, "triangle", .1, t + i * .07)); noise(.1, .05, 6000); },
    bell() { tone(1760, .5, "sine", .08); tone(2640, .4, "sine", .03); }, fail() { const t = now(); tone(330, .2, "triangle", .1, t); tone(247, .3, "triangle", .1, t + .15); },
    no() { tone(180, .12, "square", .05, 0, 140); }, trash() { noise(.25, .1, 600); },
    win() { const t = now(); [[523, 0], [659, .15], [784, .3], [1047, .45], [880, .7], [1047, .85]].forEach(([f, d]) => { tone(f, .3, "triangle", .12, t + d); tone(f / 2, .3, "sine", .06, t + d); }); }
  };
  const mf = (m) => 440 * Math.pow(2, (m - 69) / 12);
  const SONG = { bpm: 140, lead: [72, 0, 74, 76, 0, 72, 69, 0, 71, 0, 72, 74, 0, 71, 67, 0, 72, 0, 74, 76, 79, 0, 76, 74, 72, 74, 72, 69, 72, 0, 0, 0], bass: [48, 55, 52, 55, 48, 55, 52, 55, 43, 50, 47, 50, 43, 50, 47, 50, 45, 52, 48, 52, 41, 48, 45, 48, 43, 50, 47, 50, 48, 55, 48, 0] };
  let mStep = 0, mNext = 0;
  setInterval(() => {
    if (!ac || muted || state !== "play" || paused) { if (ac) mNext = Math.max(mNext, ac.currentTime); return; }
    const d = 60 / SONG.bpm / 2; if (mNext < ac.currentTime) mNext = ac.currentTime + .05;
    while (mNext < ac.currentTime + .3) { const i = mStep % 32; if (SONG.lead[i]) tone(mf(SONG.lead[i]), d * 1.2, "square", .02, mNext, 0, mg); if (SONG.bass[i]) tone(mf(SONG.bass[i]), d * .8, "triangle", .07, mNext, 0, mg); if (i % 2 === 0) noise(.03, .03, 8000); mStep++; mNext += d; }
  }, 90);

  /* ---------- kayıt ---------- */
  let SV = { stars: [], mode: 2, n1: "Egemen", n2: "Enes" };
  try { const s = JSON.parse(localStorage.getItem(SAVE) || "null"); if (s && s.stars) SV = Object.assign(SV, s); } catch (e) {}
  const saveSV = () => { try { localStorage.setItem(SAVE, JSON.stringify(SV)); } catch (e) {} };

  /* ---------- seviye ---------- */
  let LV = null, li = 0, grid = [], st = {}, chefs = [], orders = [], parts = [], floaters = [], score = 0, served = 0, missed = 0, timeLeft = DUR, nextOrder = 0, state = "title", paused = false, fast = false, active = 0, bgCv = null, clock = 0, possible = 0;
  const key = (x, y) => x + "," + y;
  const isFloor = (c) => c === "." || c === "1" || c === "2";
  function loadLevel(i) {
    li = i; LV = LEVELS[i]; grid = LV.map.map((r) => r.split("")); st = {}; orders = []; parts = []; floaters = []; score = 0; served = 0; missed = 0; timeLeft = DUR; paused = false;
    chefs = [];
    for (let y = 0; y < ROWS; y++) for (let x = 0; x < COLS; x++) {
      const c = grid[y][x];
      if (c === "1" || c === "2") chefs[+c - 1] = mkChef(+c - 1, x * TS + 30, OY + y * TS + 30);
      else if (!isFloor(c)) st[key(x, y)] = { c, x, y, item: null, prog: 0, cook: 0, pot: 0, potDone: false };
    }
    const mul = SV.mode === 1 ? 1.35 : 1;
    LV.lim = LV.limit * mul; LV.ev = LV.every * (SV.mode === 1 ? 1.25 : 1);
    nextOrder = 3; addOrder(); possible = 2 + Math.floor((DUR - 10) / LV.ev);
    bgCv = renderBg(); state = "play"; active = 0; updateSwap();
  }
  function mkChef(i, x, y) { return { i, x, y, fx: 0, fy: 1, hold: null, walk: 0, anim: 0, using: false, bump: 0 }; }
  function addOrder() { if (orders.length >= 4) return; const r = pick(LV.rec); orders.push({ r, t: LV.lim, max: LV.lim, id: Math.random(), pop: 0 }); sfx.bell(); }

  /* ---------- eşyalar ---------- */
  const ing = (id, s) => ({ t: "ing", id, s: s || "cig", top: [] });
  const partKey = (it) => it.id + ":" + it.s;
  function multiSub(a, b) { const m = {}; for (const k of b) m[k] = (m[k] || 0) + 1; for (const k of a) { if (!m[k]) return false; m[k]--; } return true; }
  function plateAccepts(plate, it) { if (it.t !== "ing") return false; const cand = plate.parts.concat([partKey(it)]); return LV.rec.some((r) => multiSub(cand, RECIPES[r].parts)); }
  function matchRecipe(plate) { return LV.rec.find((r) => plate.parts.length === RECIPES[r].parts.length && multiSub(plate.parts, RECIPES[r].parts)); }
  function pizzaAdd(base, it) { // hamur/pizza + doğranmış domates/peynir
    if (!(base.t === "ing" && (base.id === "hamur" || base.id === "pizza") && base.s === "cig")) return false;
    if (!(it.t === "ing" && it.s === "dograndi" && (it.id === "domates" || it.id === "peynir"))) return false;
    if (base.top.includes(it.id)) return false;
    base.top.push(it.id); base.id = "pizza"; return true;
  }
  const pizzaReady = (it) => it.id === "pizza" && it.s === "cig" && it.top.length === 2;

  /* ---------- etkileşim ---------- */
  function target(c) {
    const tx = Math.floor(c.x / TS), ty = Math.floor((c.y - OY) / TS);
    let dx = 0, dy = 0; if (Math.abs(c.fx) > Math.abs(c.fy)) dx = Math.sign(c.fx); else dy = Math.sign(c.fy) || 1;
    const k = key(tx + dx, ty + dy); if (st[k]) return st[k];
    // çapraz ya da yakındaki istasyonu da dene
    let best = null, bd = 1e9;
    for (const [ox, oy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const s = st[key(tx + ox, ty + oy)]; if (!s) continue; const d = Math.hypot((tx + ox) * TS + 30 - (c.x + c.fx * 30), OY + (ty + oy) * TS + 30 - (c.y + c.fy * 30)); if (d < bd && d < 46) { bd = d; best = s; } }
    return best;
  }
  function grab(c) {
    const s = target(c); if (!s) { sfx.no(); return; }
    const h = c.hold, k = s.c;
    if (CRATE[k]) {
      if (!h) { c.hold = ing(CRATE[k]); sfx.pick(); return; }
      if (h.t === "plate") { const it = ing(CRATE[k]); if (plateAccepts(h, it)) { h.parts.push(partKey(it)); sfx.drop(); return; } }
      sfx.no(); return;
    }
    if (k === "T") { if (!h) { c.hold = { t: "plate", parts: [] }; sfx.pick(); } else sfx.no(); return; }
    if (k === "X") { if (!h) { sfx.no(); return; } if (h.t === "plate") h.parts = []; else c.hold = null; sfx.trash(); puff(s, "#888"); return; }
    if (k === "W") { if (!h || h.t !== "plate") { sfx.no(); flo(s, "Tabakla getir!", "#fff"); return; } serve(c, s); return; }
    if (k === "O") { // tencere
      if (h && h.t === "ing" && h.id === "domates" && h.s === "dograndi" && s.pot < 3 && !s.potDone) { s.pot++; c.hold = null; sfx.drop(); s.cook = 0; return; }
      if (h && h.t === "ing" && h.id === "domates" && h.s === "cig") { flo(s, "Önce doğra!", "#fff"); sfx.no(); return; }
      if (h && h.t === "plate" && s.potDone) { const it = ing("corba", "pisti"); if (plateAccepts(h, it)) { h.parts.push(partKey(it)); s.pot = 0; s.potDone = false; s.cook = 0; sfx.pick(); return; } }
      sfx.no(); return;
    }
    if (k === "S" || k === "F") { // tava / fırın
      const okIn = (it) => it.t === "ing" && (k === "S" ? it.id === "kofte" && it.s === "cig" : pizzaReady(it));
      if (!s.item && h && okIn(h)) { s.item = h; c.hold = null; s.cook = 0; sfx.drop(); return; }
      if (!s.item && h && h.t === "ing") { flo(s, k === "S" ? "Buraya köfte!" : (h.id === "pizza" || h.id === "hamur") ? "Domates + peynir ekle!" : "Buraya pizza!", "#fff"); sfx.no(); return; }
      if (s.item && h && h.t === "plate") { if (plateAccepts(h, s.item)) { h.parts.push(partKey(s.item)); s.item = null; sfx.pick(); return; } sfx.no(); return; }
      if (s.item && !h) { c.hold = s.item; s.item = null; sfx.pick(); return; }
      sfx.no(); return;
    }
    // tezgâh / tahta
    if (!h && s.item) { c.hold = s.item; s.item = null; s.prog = 0; sfx.pick(); return; }
    if (h && !s.item) { s.item = h; c.hold = null; s.prog = 0; sfx.drop(); return; }
    if (h && s.item) {
      if (h.t === "plate" && s.item.t === "ing" && plateAccepts(h, s.item)) { h.parts.push(partKey(s.item)); s.item = null; sfx.drop(); return; }
      if (s.item.t === "plate" && h.t === "ing" && plateAccepts(s.item, h)) { s.item.parts.push(partKey(h)); c.hold = null; sfx.drop(); return; }
      if (pizzaAdd(s.item, h)) { c.hold = null; sfx.drop(); return; }
      if (pizzaAdd(h, s.item)) { s.item = null; sfx.drop(); return; }
      if (h.t === "plate" && s.item.t === "plate" && h.parts.length === 0) { h.parts = s.item.parts; s.item.parts = []; sfx.drop(); return; }
    }
    sfx.no();
  }
  function serve(c, s) {
    const plate = c.hold, r = matchRecipe(plate);
    const oi = r ? orders.findIndex((o) => o.r === r) : -1;
    if (oi < 0) { sfx.no(); flo(s, plate.parts.length ? "Bunu isteyen yok!" : "Tabak boş!", "#FFB3A0"); return; }
    const o = orders.splice(oi, 1)[0]; const tip = Math.round(10 * o.t / o.max); const pts = 20 + tip;
    score += pts; served++; c.hold = null; sfx.serve(); flo(s, "+" + pts + (tip >= 7 ? " Süper!" : ""), "#FFD23F", 1);
    for (let i = 0; i < 16; i++) parts.push({ x: s.x * TS + 30, y: OY + s.y * TS + 30, vx: rnd(-120, 120), vy: rnd(-200, -40), life: rnd(.5, 1), c: pick(["#FFD23F", "#FF7AA2", "#9FE3FA", "#fff"]), s: 5, g: 1 });
    if (orders.length === 0) nextOrder = Math.min(nextOrder, 2);
  }
  function flo(s, text, col, big) { floaters.push({ x: s.x * TS + 30, y: OY + s.y * TS + 10, text, col, t: 0, big }); }
  function puff(s, col) { for (let i = 0; i < 8; i++) parts.push({ x: s.x * TS + 30, y: OY + s.y * TS + 26, vx: rnd(-40, 40), vy: rnd(-60, -10), life: .5, c: col, s: 5 }); }

  /* ---------- girdi ---------- */
  const inp = [{ x: 0, y: 0 }, { x: 0, y: 0 }], keys = {};
  const KEY2 = { KeyW: [0, "up"], KeyS: [0, "down"], KeyA: [0, "left"], KeyD: [0, "right"], KeyE: [0, "grab"], KeyQ: [0, "use"], KeyF: [0, "use"], ArrowUp: [1, "up"], ArrowDown: [1, "down"], ArrowLeft: [1, "left"], ArrowRight: [1, "right"], Enter: [1, "grab"], ShiftRight: [1, "use"], Slash: [1, "use"], Period: [1, "grab"], NumpadEnter: [1, "grab"], Numpad0: [1, "use"] };
  const KEY1 = { KeyW: "up", ArrowUp: "up", KeyS: "down", ArrowDown: "down", KeyA: "left", ArrowLeft: "left", KeyD: "right", ArrowRight: "right", Space: "grab", KeyE: "grab", Enter: "grab", KeyQ: "use", KeyF: "use", ShiftLeft: "use", ShiftRight: "use" };
  addEventListener("keydown", (e) => {
    if (e.target && e.target.tagName === "INPUT") return;
    if (state !== "play") return;
    if (e.code === "Escape" || e.code === "KeyP") { paused = !paused; return; }
    if (SV.mode === 1 && (e.code === "Tab" || e.code === "KeyC")) { e.preventDefault(); if (!e.repeat) swap(); return; }
    let m = SV.mode === 2 ? KEY2[e.code] : (KEY1[e.code] ? [active, KEY1[e.code]] : null); if (!m) return; e.preventDefault();
    if (paused) { paused = false; return; }
    const [p, a] = m; if (a === "grab") { if (!e.repeat) grab(chefs[p]); } else keys[p + a] = true;
  });
  addEventListener("keyup", (e) => { const m = SV.mode === 2 ? KEY2[e.code] : (KEY1[e.code] ? [active, KEY1[e.code]] : null); if (m) keys[m[0] + m[1]] = false; if (SV.mode === 1) for (const a of ["up", "down", "left", "right", "use"]) if (KEY1[e.code] === a) { keys[0 + a] = false; keys[1 + a] = false; } });
  addEventListener("blur", () => { for (const k in keys) keys[k] = false; });
  // dokunmatik
  const stickV = [{ x: 0, y: 0 }, { x: 0, y: 0 }], touchUse = [false, false];
  document.querySelectorAll(".stick").forEach((el) => {
    const pad = +el.dataset.p, knob = el.querySelector("span"); let pid = null;
    const set = (e) => { const r = el.getBoundingClientRect(), cx = r.left + r.width / 2, cy = r.top + r.height / 2; let dx = e.clientX - cx, dy = e.clientY - cy; const L = Math.hypot(dx, dy), mx = r.width * .36; if (L > mx) { dx = dx / L * mx; dy = dy / L * mx; } knob.style.transform = "translate(" + dx + "px," + dy + "px)"; const k = Math.min(1, L / mx); stickV[pad] = L > 8 ? { x: dx / (L || 1) * k, y: dy / (L || 1) * k } : { x: 0, y: 0 }; };
    el.addEventListener("pointerdown", (e) => { e.preventDefault(); audio(); pid = e.pointerId; try { el.setPointerCapture(pid); } catch (x) {} set(e); });
    el.addEventListener("pointermove", (e) => { if (e.pointerId === pid) set(e); });
    const end = (e) => { if (e.pointerId !== pid) return; pid = null; knob.style.transform = ""; stickV[pad] = { x: 0, y: 0 }; };
    el.addEventListener("pointerup", end); el.addEventListener("pointercancel", end);
  });
  document.querySelectorAll(".pad .k").forEach((b) => {
    const pad = +b.closest(".pad").dataset.p, k = b.dataset.k, who = () => SV.mode === 2 ? pad : active;
    b.addEventListener("pointerdown", (e) => { e.preventDefault(); audio(); b.classList.add("on"); if (state !== "play") return; if (paused) { paused = false; return; } if (k === "grab") grab(chefs[who()]); else touchUse[who()] = true; });
    const off = () => { b.classList.remove("on"); if (k === "use") { touchUse[0] = touchUse[1] = false; } };
    b.addEventListener("pointerup", off); b.addEventListener("pointercancel", off); b.addEventListener("contextmenu", (e) => e.preventDefault());
  });
  function swap() { active = 1 - active; for (const k in keys) keys[k] = false; updateSwap(); sfx.pick(); }
  function updateSwap() { $("swap").hidden = !(SV.mode === 1 && state === "play"); document.querySelectorAll(".pad .who").forEach((w, i) => w.textContent = SV.mode === 2 ? [SV.n1, SV.n2][i] : "Aşçı"); }
  $("swap").onclick = () => swap();

  /* ---------- güncelleme ---------- */
  function solidAt(px, py) { const tx = Math.floor(px / TS), ty = Math.floor((py - OY) / TS); if (tx < 0 || ty < 0 || tx >= COLS || ty >= ROWS) return true; return !isFloor(grid[ty][tx]); }
  function boxFree(x, y) { const r = 19; return !solidAt(x - r, y - r) && !solidAt(x + r, y - r) && !solidAt(x - r, y + r) && !solidAt(x + r, y + r); }
  function update(dt) {
    clock += dt;
    for (const p of parts) { p.life -= dt; p.x += p.vx * dt; p.y += p.vy * dt; if (p.g) p.vy += 420 * dt; } parts = parts.filter((p) => p.life > 0);
    for (const f of floaters) f.t += dt; floaters = floaters.filter((f) => f.t < 1.3);
    if (state !== "play" || paused) return;
    timeLeft -= dt;
    if (timeLeft <= 0) { timeLeft = 0; finish(); return; }
    // siparişler
    nextOrder -= dt; if (nextOrder <= 0 && timeLeft > 12) { addOrder(); nextOrder = LV.ev; }
    for (const o of orders) { o.t -= dt; o.pop = Math.min(1, o.pop + dt * 4); }
    for (let i = orders.length - 1; i >= 0; i--) if (orders[i].t <= 0) { orders.splice(i, 1); score = Math.max(0, score - 5); missed++; sfx.fail(); floaters.push({ x: 120 + i * 190, y: 64, text: "Müşteri gitti −5", col: "#FFB3A0", t: 0 }); }
    if (orders.length === 0 && nextOrder > 2) nextOrder = 2;
    // aşçılar
    for (const c of chefs) {
      let vx = 0, vy = 0; const p = c.i, ctl = SV.mode === 2 || p === active;
      if (ctl) { const kp = SV.mode === 2 ? p : active; vx = (keys[kp + "right"] ? 1 : 0) - (keys[kp + "left"] ? 1 : 0) + (SV.mode === 2 ? stickV[p].x : stickV[0].x + stickV[1].x); vy = (keys[kp + "down"] ? 1 : 0) - (keys[kp + "up"] ? 1 : 0) + (SV.mode === 2 ? stickV[p].y : stickV[0].y + stickV[1].y); }
      const L = Math.hypot(vx, vy); if (L > 1) { vx /= L; vy /= L; }
      if (L > .15) { c.fx = vx; c.fy = vy; }
      const sp = 235;
      const nx = c.x + vx * sp * dt, ny = c.y + vy * sp * dt;
      if (boxFree(nx, c.y)) c.x = nx; if (boxFree(c.x, ny)) c.y = ny;
      c.walk = L > .15; if (c.walk) c.anim += dt * 10;
      const useK = ctl && (keys[(SV.mode === 2 ? p : active) + "use"] || touchUse[SV.mode === 2 ? p : active]);
      c.using = false;
      if (useK) { const s = target(c); if (s && s.c === "B" && s.item && s.item.t === "ing" && s.item.s === "cig" && CHOP.has(s.item.id)) { c.using = true; s.prog += dt / 1.1; if (Math.floor(clock * 7) !== Math.floor((clock - dt) * 7)) { sfx.chop(); for (let i = 0; i < 2; i++) parts.push({ x: s.x * TS + 30, y: OY + s.y * TS + 24, vx: rnd(-60, 60), vy: rnd(-80, -20), life: .35, c: s.item.id === "marul" ? "#7CCB5E" : s.item.id === "domates" ? "#E8463F" : "#FFD23F", s: 4, g: 1 }); } if (s.prog >= 1) { s.item.s = "dograndi"; s.prog = 0; sfx.done(); } } }
    }
    // aşçılar birbirini iter
    if (chefs.length === 2) { const a = chefs[0], b = chefs[1], dx = b.x - a.x, dy = b.y - a.y, d = Math.hypot(dx, dy); if (d < 40 && d > .01) { const push = (40 - d) / 2, ux = dx / d, uy = dy / d; if (boxFree(a.x - ux * push, a.y - uy * push)) { a.x -= ux * push; a.y -= uy * push; } if (boxFree(b.x + ux * push, b.y + uy * push)) { b.x += ux * push; b.y += uy * push; } } }
    // pişirme
    for (const s of Object.values(st)) {
      if ((s.c === "S" || s.c === "F") && s.item) {
        s.cook += dt; const t1 = s.c === "S" ? 5 : 7, t2 = t1 + (s.c === "S" ? 8 : 9);
        if (s.item.s === "cig" && s.cook >= t1) { s.item.s = "pisti"; sfx.done(); }
        else if (s.item.s === "pisti" && s.cook >= t2) { s.item.s = "yandi"; sfx.burn(); puff(s, "#333"); }
        if (s.item.s !== "yandi" && Math.random() < dt * 6) parts.push({ x: s.x * TS + 30 + rnd(-12, 12), y: OY + s.y * TS + 22, vx: rnd(-10, 10), vy: -rnd(20, 50), life: .8, c: "rgba(255,255,255,.6)", s: 6 });
        if (s.item.s === "yandi" && Math.random() < dt * 10) parts.push({ x: s.x * TS + 30 + rnd(-12, 12), y: OY + s.y * TS + 22, vx: rnd(-10, 10), vy: -rnd(20, 50), life: 1, c: "rgba(40,40,40,.7)", s: 8 });
      }
      if (s.c === "O" && s.pot >= 3 && !s.potDone) { s.cook += dt; if (s.cook >= 7) { s.potDone = true; sfx.done(); } if (Math.random() < dt * 6) parts.push({ x: s.x * TS + 30 + rnd(-10, 10), y: OY + s.y * TS + 18, vx: 0, vy: -40, life: .8, c: "rgba(255,255,255,.6)", s: 6 }); }
    }
  }
  function finish() {
    state = "done"; updateSwap();
    const maxPts = possible * 25 * [1, .95, .9, .85, .85, .75][li], s1 = Math.round(maxPts * .3), s2 = Math.round(maxPts * .5), s3 = Math.round(maxPts * .7);
    const stars = score >= s3 ? 3 : score >= s2 ? 2 : score >= s1 ? 1 : 0;
    if (stars) { SV.stars[li] = Math.max(SV.stars[li] || 0, stars); saveSV(); sfx.win(); } else sfx.fail();
    $("endTitle").textContent = stars ? ["", "Servis bitti!", "Harika ekip!", "Usta aşçılar!"][stars] : "Mutfak biraz karıştı...";
    $("endStars").innerHTML = "★".repeat(stars) + "<i>" + "★".repeat(3 - stars) + "</i>";
    $("endTx").textContent = "Puan: " + score + " · Servis: " + served + " · Kaçan müşteri: " + missed + "\nYıldızlar: " + s1 + " / " + s2 + " / " + s3 + " puan";
    $("endNext").hidden = !stars || li >= LEVELS.length - 1; $("end").hidden = false;
  }

  /* ---------- çizim yardımcıları ---------- */
  function circle(c, x, y, r, fill, lw) { c.beginPath(); c.arc(x, y, r, 0, Math.PI * 2); if (fill) { c.fillStyle = fill; c.fill(); } if (lw) { c.strokeStyle = OL; c.lineWidth = lw; c.stroke(); } }
  function ell(c, x, y, rx, ry, rot, fill, lw) { c.beginPath(); c.ellipse(x, y, Math.max(.1, rx), Math.max(.1, ry), rot || 0, 0, Math.PI * 2); if (fill) { c.fillStyle = fill; c.fill(); } if (lw) { c.strokeStyle = OL; c.lineWidth = lw; c.stroke(); } }
  function rr(c, x, y, w, h, r) { c.beginPath(); c.moveTo(x + r, y); c.arcTo(x + w, y, x + w, y + h, r); c.arcTo(x + w, y + h, x, y + h, r); c.arcTo(x, y + h, x, y, r); c.arcTo(x, y, x + w, y, r); c.closePath(); }
  // malzeme simgesi (s ~ yarıçap)
  function food(c, id, s, x, y, sz, top) {
    c.save(); c.translate(x, y); const lw = Math.max(1.5, sz * .1); c.lineJoin = "round";
    const burnt = s === "yandi";
    if (id === "marul") { if (s === "dograndi") { for (const [dx, dy] of [[-.4, -.2], [.3, -.3], [0, .3], [-.3, .4], [.45, .3]]) ell(c, dx * sz, dy * sz, sz * .32, sz * .24, dx, "#7CCB5E", lw * .7); } else { circle(c, 0, 0, sz * .9, "#5DB34A", lw); circle(c, -sz * .2, -sz * .15, sz * .55, "#8BD96A"); c.strokeStyle = "#3E8E44"; c.lineWidth = lw * .7; c.beginPath(); c.moveTo(-sz * .5, sz * .3); c.quadraticCurveTo(0, -sz * .2, sz * .5, sz * .3); c.stroke(); } }
    else if (id === "domates") { if (s === "dograndi") { for (const [dx, dy] of [[-.35, -.1], [.35, -.1], [0, .35]]) { circle(c, dx * sz, dy * sz, sz * .36, "#E8463F", lw * .7); circle(c, dx * sz, dy * sz, sz * .2, "#FF8A80"); } } else { circle(c, 0, sz * .08, sz * .85, "#E8463F", lw); c.fillStyle = "#3FA34D"; c.beginPath(); for (let i = 0; i < 5; i++) { const a = -Math.PI / 2 + i * 1.256; c.lineTo(Math.cos(a) * sz * .35, -sz * .6 + Math.sin(a) * sz * .2); c.lineTo(Math.cos(a + .6) * sz * .1, -sz * .6 + Math.sin(a + .6) * sz * .06); } c.fill(); ell(c, -sz * .3, -sz * .1, sz * .15, sz * .1, -.6, "rgba(255,255,255,.6)"); } }
    else if (id === "peynir") { if (s === "dograndi") { for (const [dx, dy] of [[-.35, -.25], [.3, -.2], [-.1, .3], [.4, .35]]) { c.fillStyle = "#FFD23F"; c.fillRect((dx - .18) * sz, (dy - .14) * sz, sz * .36, sz * .28); c.strokeStyle = OL; c.lineWidth = lw * .6; c.strokeRect((dx - .18) * sz, (dy - .14) * sz, sz * .36, sz * .28); } } else { c.beginPath(); c.moveTo(-sz * .9, sz * .5); c.lineTo(sz * .9, sz * .5); c.lineTo(sz * .9, -sz * .1); c.lineTo(-sz * .7, -sz * .5); c.closePath(); c.fillStyle = "#FFD23F"; c.fill(); c.strokeStyle = OL; c.lineWidth = lw; c.stroke(); circle(c, -sz * .2, sz * .1, sz * .12, "#E8B020"); circle(c, sz * .4, sz * .2, sz * .1, "#E8B020"); } }
    else if (id === "kofte") { const col = burnt ? "#2A2220" : s === "pisti" ? "#8A4A2A" : "#E07A80"; ell(c, 0, 0, sz * .85, sz * .6, 0, col, lw); if (!burnt) { c.fillStyle = s === "pisti" ? "#5A2E1A" : "#C05A60"; for (let i = 0; i < 5; i++) c.fillRect(-sz * .5 + i * sz * .25, -sz * .1 + (i % 2) * sz * .2, sz * .12, sz * .08); } if (s === "pisti") { c.strokeStyle = "#3A1A0A"; c.lineWidth = lw * .7; c.beginPath(); c.moveTo(-sz * .4, -sz * .2); c.lineTo(sz * .2, -sz * .4); c.moveTo(-sz * .2, sz * .2); c.lineTo(sz * .4, 0); c.stroke(); } }
    else if (id === "ekmek") { ell(c, 0, sz * .1, sz * .9, sz * .55, 0, "#E8A850", lw); ell(c, 0, -sz * .05, sz * .8, sz * .4, 0, "#F2C070"); for (let i = 0; i < 5; i++) ell(c, -sz * .5 + i * sz * .25, -sz * .2 + (i % 2) * sz * .1, sz * .05, sz * .03, 0, "#FFF6D8"); }
    else if (id === "hamur" || id === "pizza") {
      const baked = s === "pisti", col = burnt ? "#3A2A20" : baked ? "#E8B060" : "#F2E0B0";
      circle(c, 0, 0, sz * .9, col, lw); if (!burnt) circle(c, 0, 0, sz * .72, baked ? "#D84A30" : top && top.includes("domates") ? "#E8463F" : "#F8ECCC");
      if (!burnt && top && top.includes("peynir")) { c.fillStyle = baked ? "#FFE680" : "#FFD23F"; for (let i = 0; i < 7; i++) { const a = i * .9, r = sz * (.2 + (i % 3) * .15); ell(c, Math.cos(a) * r, Math.sin(a) * r, sz * .16, sz * .1, a, baked ? "#FFE680" : "#FFD23F"); } }
      if (baked && !burnt) for (let i = 0; i < 4; i++) circle(c, Math.cos(i * 1.6) * sz * .45, Math.sin(i * 1.6) * sz * .45, sz * .1, "#A03020");
    }
    else if (id === "corba") { ell(c, 0, 0, sz * .85, sz * .5, 0, "#D84A30", lw); ell(c, -sz * .2, -sz * .1, sz * .2, sz * .08, 0, "rgba(255,255,255,.5)"); }
    c.restore();
  }
  function itemDraw(c, it, x, y, sz) {
    if (it.t === "plate") { ell(c, x, y + 3, sz * 1.15, sz * .75, 0, "rgba(0,0,0,.2)"); ell(c, x, y, sz * 1.15, sz * .75, 0, "#F4F7FA", 2); ell(c, x, y, sz * .85, sz * .52, 0, "#E2E8EE");
      const ps = it.parts; ps.forEach((p, i) => { const [id, s] = p.split(":"); if (id === "corba") { ell(c, x, y, sz * .85, sz * .5, 0, "#D84A30"); return; } if (id === "pizza") { food(c, "pizza", "pisti", x, y - 2, sz * .95, ["domates", "peynir"]); return; } const off = ps.length > 1 ? (i - (ps.length - 1) / 2) * sz * .45 : 0; if (id === "ekmek") food(c, "ekmek", s, x, y + sz * .05, sz * .8); else food(c, id, s, x + off * .6, y - i * sz * .18, sz * .62); });
      return; }
    food(c, it.id, it.s, x, y, sz, it.top);
  }

  /* ---------- arka plan ---------- */
  function renderBg() {
    const c = document.createElement("canvas"); c.width = W; c.height = H; const x = c.getContext("2d");
    x.fillStyle = "#3A2A22"; x.fillRect(0, 0, W, H);
    for (let ty = 0; ty < ROWS; ty++) for (let tx = 0; tx < COLS; tx++) { const X = tx * TS, Y = OY + ty * TS; x.fillStyle = (tx + ty) % 2 ? "#F2E6D0" : "#E6D4B8"; x.fillRect(X, Y, TS, TS); }
    x.fillStyle = "rgba(0,0,0,.05)"; for (let i = 0; i < 300; i++) x.fillRect(Math.random() * W, OY + Math.random() * (H - OY), 3, 3);
    for (const s of Object.values(st)) stationBase(x, s);
    return c;
  }
  function stationBase(x, s) {
    const X = s.x * TS, Y = OY + s.y * TS, k = s.c;
    x.fillStyle = "rgba(0,0,0,.25)"; x.fillRect(X + 3, Y + 8, TS, TS);
    // tezgâh gövdesi
    x.fillStyle = k === "W" ? "#5A8A3A" : k === "X" ? "#6A6A72" : "#B8743A"; x.fillRect(X, Y, TS, TS); x.strokeStyle = OL; x.lineWidth = 2; x.strokeRect(X + 1, Y + 1, TS - 2, TS - 2);
    x.fillStyle = k === "W" ? "#7CB84A" : k === "X" ? "#8E8E96" : "#D8945A"; x.fillRect(X + 3, Y + 3, TS - 6, TS - 14);
    x.fillStyle = "rgba(255,255,255,.18)"; x.fillRect(X + 3, Y + 3, TS - 6, 4);
    if (CRATE[k]) { x.fillStyle = "#8A5A2B"; rr(x, X + 7, Y + 9, TS - 14, TS - 22, 5); x.fill(); x.stroke(); x.strokeStyle = "#6E4A26"; x.lineWidth = 2; x.beginPath(); x.moveTo(X + 9, Y + 22); x.lineTo(X + TS - 9, Y + 22); x.stroke(); food(x, CRATE[k], "cig", X + 30, Y + 22, 14); food(x, CRATE[k], "cig", X + 22, Y + 30, 11); food(x, CRATE[k], "cig", X + 38, Y + 31, 11); }
    else if (k === "B") { x.fillStyle = "#E8C88A"; rr(x, X + 8, Y + 10, TS - 16, TS - 26, 6); x.fill(); x.strokeStyle = OL; x.stroke(); x.strokeStyle = "#C8A060"; x.lineWidth = 1.5; x.beginPath(); x.moveTo(X + 12, Y + 20); x.lineTo(X + 46, Y + 20); x.stroke(); x.fillStyle = "#C8C8D8"; x.save(); x.translate(X + 44, Y + 16); x.rotate(.6); x.fillRect(-2, -12, 5, 14); x.fillStyle = "#3A2418"; x.fillRect(-2, 2, 5, 9); x.restore(); }
    else if (k === "S" || k === "O") { x.fillStyle = "#3A3A44"; rr(x, X + 5, Y + 6, TS - 10, TS - 18, 6); x.fill(); x.stroke(); for (const [cx, cy] of [[X + 30, Y + 26]]) { circle(x, cx, cy, 16, "#22222A"); x.strokeStyle = "#FF6A3A"; x.lineWidth = 2; x.beginPath(); x.arc(cx, cy, 13, 0, 7); x.stroke(); } }
    else if (k === "F") { x.fillStyle = "#B8463F"; x.fillRect(X + 4, Y + 4, TS - 8, TS - 14); x.strokeStyle = OL; x.strokeRect(X + 4, Y + 4, TS - 8, TS - 14); x.strokeStyle = "#8E2A26"; x.lineWidth = 1.5; for (let r = 0; r < 4; r++) { x.beginPath(); x.moveTo(X + 4, Y + 14 + r * 9); x.lineTo(X + TS - 4, Y + 14 + r * 9); x.stroke(); } x.fillStyle = "#1A0E0A"; x.beginPath(); x.arc(X + 30, Y + 36, 16, Math.PI, 0); x.lineTo(X + 46, Y + 44); x.lineTo(X + 14, Y + 44); x.fill(); }
    else if (k === "T") { for (let i = 0; i < 4; i++) { ell(x, X + 30, Y + 34 - i * 5, 20, 9, 0, "#F4F7FA", 1.5); } }
    else if (k === "W") { x.fillStyle = "#FFF0E0"; x.fillRect(X + 6, Y + 6, TS - 12, 8); x.strokeStyle = OL; x.lineWidth = 1.5; x.strokeRect(X + 6, Y + 6, TS - 12, 8); circle(x, X + 30, Y + 34, 9, "#FFD23F", 1.5); x.fillStyle = "#C8A020"; x.fillRect(X + 28, Y + 22, 4, 5); x.fillStyle = "#fff"; x.font = "700 10px Fredoka"; x.textAlign = "center"; x.fillText("SERVİS", X + 30, Y + 52); }
    else if (k === "X") { x.fillStyle = "#4A4A52"; rr(x, X + 14, Y + 12, 32, 36, 5); x.fill(); x.stroke(); x.fillStyle = "#5A5A62"; x.fillRect(X + 11, Y + 9, 38, 7); x.strokeRect(X + 11, Y + 9, 38, 7); x.strokeStyle = "#2A2A30"; for (let i = 0; i < 3; i++) { x.beginPath(); x.moveTo(X + 21 + i * 9, Y + 20); x.lineTo(X + 21 + i * 9, Y + 44); x.stroke(); } }
  }

  /* ---------- aşçılar ---------- */
  const CHEFC = [{ apron: "#E8463F", fur: "#C98A4A", kind: "ayi" }, { apron: "#2E86DE", fur: "#F7F3FA", kind: "tavsan" }];
  function drawChef(c) {
    const C = CHEFC[c.i], x = c.x, y = c.y, b = c.walk ? Math.abs(Math.sin(c.anim)) * 3 : Math.sin(clock * 2 + c.i) * 1, sway = c.walk ? Math.sin(c.anim) * .08 : 0;
    ctx.save(); ctx.translate(x, y);
    ctx.fillStyle = "rgba(0,0,0,.25)"; ctx.beginPath(); ctx.ellipse(0, 18, 20, 7, 0, 0, 7); ctx.fill();
    ctx.translate(0, -b); ctx.rotate(sway);
    // gövde
    ctx.lineWidth = 2.5; ctx.strokeStyle = OL;
    ell(ctx, 0, 6, 17, 15, 0, "#FFFFFF", 2.5); ctx.fillStyle = C.apron; ctx.beginPath(); ctx.moveTo(-11, 0); ctx.lineTo(11, 0); ctx.lineTo(9, 18); ctx.lineTo(-9, 18); ctx.closePath(); ctx.fill(); ctx.stroke();
    // kafa
    const hx = c.fx * 3, hy = -16 + Math.max(0, c.fy) * 2;
    if (C.kind === "ayi") { circle(ctx, hx - 12, hy - 10, 6, C.fur, 2); circle(ctx, hx + 12, hy - 10, 6, C.fur, 2); }
    else { ell(ctx, hx - 7, hy - 22, 5, 13, -.15, C.fur, 2); ell(ctx, hx + 7, hy - 22, 5, 13, .15, C.fur, 2); ell(ctx, hx - 7, hy - 21, 2.5, 9, -.15, "#FFB3C8"); ell(ctx, hx + 7, hy - 21, 2.5, 9, .15, "#FFB3C8"); }
    circle(ctx, hx, hy, 15, C.fur, 2.5);
    if (c.fy > -.5) { ell(ctx, hx + c.fx * 4, hy + 5, 7, 5, 0, C.kind === "ayi" ? "#E8C08A" : "#fff"); circle(ctx, hx - 5 + c.fx * 5, hy - 2, 2.2, OL); circle(ctx, hx + 5 + c.fx * 5, hy - 2, 2.2, OL); circle(ctx, hx + c.fx * 5, hy + 3, 2, OL); ctx.globalAlpha = .4; circle(ctx, hx - 9, hy + 4, 3, "#FF7AA2"); circle(ctx, hx + 9, hy + 4, 3, "#FF7AA2"); ctx.globalAlpha = 1; }
    // aşçı şapkası
    ctx.fillStyle = "#fff"; ctx.fillRect(hx - 10, hy - 18, 20, 7); ctx.strokeRect(hx - 10, hy - 18, 20, 7);
    for (const [dx, dy, r] of [[-7, -24, 7], [7, -24, 7], [0, -29, 8]]) circle(ctx, hx + dx, hy + dy, r, "#fff", 2);
    for (const [dx, dy, r] of [[-7, -24, 7], [7, -24, 7], [0, -29, 8]]) circle(ctx, hx + dx, hy + dy, r - 1.6, "#fff");
    ctx.restore();
    // elindeki
    const ix = x + c.fx * 22, iy = y - 2 - b + c.fy * 14;
    if (c.hold) itemDraw(ctx, c.hold, ix, iy, 15);
    if (c.using) { ctx.save(); ctx.translate(ix, iy - 10); ctx.rotate(Math.sin(clock * 30) * .6); ctx.fillStyle = "#C8C8D8"; ctx.fillRect(-2, -14, 5, 14); ctx.restore(); }
    // isim
    const nm = c.i ? SV.n2 : SV.n1; ctx.font = "700 13px Fredoka"; ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.lineWidth = 3; ctx.strokeStyle = "rgba(0,0,0,.6)"; ctx.strokeText(nm, x, y - 62); ctx.fillStyle = C.apron === "#E8463F" ? "#FFB3A8" : "#B8DAFF"; ctx.fillText(nm, x, y - 62);
    if (SV.mode === 1 && c.i === active) { ctx.fillStyle = "#FFD23F"; ctx.beginPath(); ctx.moveTo(x - 7, y - 76); ctx.lineTo(x + 7, y - 76); ctx.lineTo(x, y - 69); ctx.fill(); }
  }

  /* ---------- ana çizim ---------- */
  function draw() {
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    if (!LV) { ctx.fillStyle = "#3A2A22"; ctx.fillRect(0, 0, W, H); return; }
    ctx.drawImage(bgCv, 0, 0);
    // hedef vurgusu
    for (const c of chefs) { const s = target(c); if (s && (SV.mode === 2 || c.i === active)) { ctx.strokeStyle = CHEFC[c.i].apron; ctx.lineWidth = 4; ctx.globalAlpha = .7 + .3 * Math.sin(clock * 6); rr(ctx, s.x * TS + 3, OY + s.y * TS + 3, TS - 6, TS - 6, 8); ctx.stroke(); ctx.globalAlpha = 1; } }
    // istasyon içerikleri
    for (const s of Object.values(st)) stationTop(s);
    const L = chefs.slice().sort((a, b) => a.y - b.y); for (const c of L) drawChef(c);
    for (const p of parts) { ctx.globalAlpha = Math.min(1, p.life * 2); ctx.fillStyle = p.c; ctx.beginPath(); ctx.arc(p.x, p.y, p.s / 2, 0, 7); ctx.fill(); } ctx.globalAlpha = 1;
    for (const f of floaters) { ctx.globalAlpha = Math.max(0, 1 - f.t / 1.3); txt(f.text, f.x, f.y - f.t * 40, f.big ? 26 : 17, f.col); } ctx.globalAlpha = 1;
    hud();
    if (paused) { ctx.fillStyle = "rgba(0,0,0,.45)"; ctx.fillRect(0, 0, W, H); txt("Mola!", W / 2, H / 2 - 10, 60, "#fff"); txt("Devam için bir tuşa bas", W / 2, H / 2 + 40, 22, "#FFD9C8"); }
    if (state === "done") { ctx.fillStyle = "rgba(0,0,0,.3)"; ctx.fillRect(0, 0, W, H); }
  }
  function stationTop(s) {
    const X = s.x * TS + 30, Y = OY + s.y * TS + 26;
    if (s.c === "S" || s.c === "F") {
      if (s.c === "S") { ctx.fillStyle = "#2A2A30"; ctx.beginPath(); ctx.ellipse(X, Y, 18, 12, 0, 0, 7); ctx.fill(); ctx.fillRect(X + 14, Y - 3, 16, 6); }
      if (s.item) { itemDraw(ctx, s.item, X, s.c === "F" ? Y + 6 : Y, 14); const t1 = s.c === "S" ? 5 : 7, t2 = t1 + (s.c === "S" ? 8 : 9); if (s.item.s === "cig") bar(X, Y - 26, s.cook / t1, "#7CE05A"); else if (s.item.s === "pisti") { const k = (s.cook - t1) / (t2 - t1); if (k > .5 && Math.floor(clock * 6) % 2) { ctx.fillStyle = "#E8463F"; circle(ctx, X + 22, Y - 22, 9, "#E8463F", 2); txt("!", X + 22, Y - 21, 14, "#fff"); } } }
      return;
    }
    if (s.c === "O") { ell(ctx, X, Y, 20, 13, 0, "#8E8E9E", 2); ell(ctx, X, Y - 2, 16, 9, 0, s.pot ? (s.potDone ? "#D84A30" : "#E8705A") : "#5A5A66"); for (let i = 0; i < 3; i++) circle(ctx, X - 16 + i * 16, Y + 24, 4, i < s.pot ? "#E8463F" : "rgba(255,255,255,.4)", 1.2); if (s.pot >= 3 && !s.potDone) bar(X, Y - 26, s.cook / 7, "#7CE05A"); if (s.potDone) txt("✓", X + 22, Y - 20, 18, "#7CE05A"); return; }
    if (s.item) { itemDraw(ctx, s.item, X, Y + 2, 15); if (s.c === "B" && s.prog > 0) bar(X, Y - 24, s.prog, "#FFD23F"); }
  }
  function bar(x, y, k, col) { ctx.fillStyle = "rgba(0,0,0,.55)"; rr(ctx, x - 22, y - 5, 44, 10, 5); ctx.fill(); ctx.fillStyle = col; rr(ctx, x - 20, y - 3, 40 * clamp(k, 0, 1), 6, 3); ctx.fill(); }
  function txt(s, x, y, size, col) { ctx.font = "700 " + size + "px Fredoka, sans-serif"; ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.lineWidth = Math.max(3, size * .18); ctx.strokeStyle = "rgba(40,20,10,.85)"; ctx.strokeText(s, x, y); ctx.fillStyle = col; ctx.fillText(s, x, y); }
  function hud() {
    const g = ctx.createLinearGradient(0, 0, 0, OY); g.addColorStop(0, "#8E2A26"); g.addColorStop(1, "#6A1E1A"); ctx.fillStyle = g; ctx.fillRect(0, 0, W, OY);
    // siparişler
    orders.forEach((o, i) => {
      const x = 8 + i * 178, y = 5, w = 170, h = 50, k = o.t / o.max, sc = .8 + o.pop * .2;
      ctx.save(); ctx.translate(x + w / 2, y + h / 2); ctx.scale(sc, sc); ctx.translate(-w / 2, -h / 2);
      ctx.fillStyle = "#FFF8EC"; rr(ctx, 0, 0, w, h, 10); ctx.fill(); ctx.strokeStyle = OL; ctx.lineWidth = 2; ctx.stroke();
      const R = RECIPES[o.r]; dish(o.r, 28, 24, 15);
      ctx.fillStyle = "#3A2418"; ctx.font = "700 13px Fredoka"; ctx.textAlign = "left"; ctx.textBaseline = "top"; ctx.fillText(R.name, 52, 4);
      R.parts.forEach((p, j) => { const [id, s] = p.split(":"); circle(ctx, 62 + j * 26, 32, 11, "#F2E0C8"); food(ctx, id, s, 62 + j * 26, 32, 8, ["domates", "peynir"]); if (s === "dograndi") { ctx.fillStyle = "#C8C8D8"; ctx.fillRect(62 + j * 26 + 6, 36, 3, 7); } if (s === "pisti") { ctx.fillStyle = "#FF6A3A"; ctx.beginPath(); ctx.arc(62 + j * 26 + 8, 40, 3, 0, 7); ctx.fill(); } });
      ctx.fillStyle = "rgba(0,0,0,.15)"; ctx.fillRect(4, h - 7, w - 8, 4); ctx.fillStyle = k > .5 ? "#3FA34D" : k > .25 ? "#F2B530" : "#E8463F"; ctx.fillRect(4, h - 7, (w - 8) * k, 4);
      ctx.restore();
    });
    // puan ve süre
    ctx.fillStyle = "rgba(0,0,0,.25)"; rr(ctx, W - 230, 8, 222, 44, 12); ctx.fill();
    circle(ctx, W - 210, 30, 12, "#FFD23F", 2); txt(String(score), W - 168, 31, 24, "#FFE9A0");
    const m = Math.floor(timeLeft / 60), s = Math.floor(timeLeft % 60); txt("⏱ " + m + ":" + String(s).padStart(2, "0"), W - 68, 31, 22, timeLeft < 20 && Math.floor(clock * 4) % 2 ? "#FF8A80" : "#fff");
  }
  function dish(r, x, y, sz) {
    if (r === "salata") { ell(ctx, x, y + 4, sz * 1.1, sz * .6, 0, "#9FD8F0", 2); food(ctx, "marul", "dograndi", x - 3, y, sz * .7); food(ctx, "domates", "dograndi", x + 4, y + 1, sz * .5); }
    else if (r === "burger") { ell(ctx, x, y + 5, sz, sz * .4, 0, "#E8A850", 2); ell(ctx, x, y + 1, sz * .95, sz * .3, 0, "#7CCB5E"); ell(ctx, x, y - 2, sz * .9, sz * .32, 0, "#8A4A2A", 1.5); ctx.beginPath(); ctx.ellipse(x, y - 5, sz, sz * .6, 0, Math.PI, 0); ctx.fillStyle = "#F2C070"; ctx.fill(); ctx.strokeStyle = OL; ctx.lineWidth = 2; ctx.stroke(); }
    else if (r === "corba") { ell(ctx, x, y + 2, sz, sz * .55, 0, "#fff", 2); ell(ctx, x, y, sz * .8, sz * .35, 0, "#D84A30"); ctx.fillStyle = "#fff"; ctx.beginPath(); ctx.moveTo(x - sz, y + 2); ctx.quadraticCurveTo(x, y + sz * 1.4, x + sz, y + 2); ctx.fill(); ctx.stroke(); }
    else food(ctx, "pizza", "pisti", x, y, sz, ["domates", "peynir"]);
  }

  /* ---------- menüler ---------- */
  function setMode(m) { SV.mode = m; saveSV(); $("m2").setAttribute("aria-pressed", m === 2); $("m1").setAttribute("aria-pressed", m === 1); $("keys").innerHTML = m === 2 ? "<b>" + SV.n1 + ":</b> WASD yürü · E al/bırak · Q doğra &nbsp; <b>" + SV.n2 + ":</b> oklar yürü · Enter al/bırak · Sağ Shift doğra" : "Oklar/WASD yürü · Boşluk al/bırak · Shift doğra · Tab aşçı değiştir"; updateSwap(); }
  $("m2").onclick = () => setMode(2); $("m1").onclick = () => setMode(1);
  $("n1").value = SV.n1; $("n2").value = SV.n2;
  $("n1").oninput = () => { SV.n1 = $("n1").value.trim() || "Egemen"; saveSV(); setMode(SV.mode); };
  $("n2").oninput = () => { SV.n2 = $("n2").value.trim() || "Enes"; saveSV(); setMode(SV.mode); };
  function showTitle() { state = "title"; LV = null; $("title").hidden = false; setMode(SV.mode); drawLogo(); }
  function drawLogo() {
    const c = $("logoCv"), x = c.getContext("2d"); x.clearRect(0, 0, 360, 160);
    const old = ctxSwap(x); const fakeSV = { n1: SV.n1, n2: SV.n2 }; x.save(); x.translate(180, 96); x.scale(1.6, 1.6);
    const a = { i: 0, x: -48, y: 20, fx: .3, fy: .6, hold: { t: "plate", parts: ["ekmek:cig", "kofte:pisti", "marul:dograndi"] }, walk: false, anim: 0 };
    const b = { i: 1, x: 48, y: 20, fx: -.3, fy: .6, hold: ing("pizza", "pisti"), walk: false, anim: 0 }; b.hold.top = ["domates", "peynir"];
    drawChef(a); drawChef(b); x.restore(); void fakeSV; ctxSwap(old);
  }
  function ctxSwap(c) { const o = ctx; ctx = c; return o; }
  $("play").onclick = () => { audio(); openLevels(); };
  function openLevels() {
    state = "levels"; $("title").hidden = true; $("end").hidden = true; $("levels").hidden = false; updateSwap(); const box = $("lvlList"); box.innerHTML = "";
    const cur = LEVELS.findIndex((L, i) => !SV.stars[i]);
    LEVELS.forEach((L, i) => {
      const b = document.createElement("button"); b.type = "button"; b.className = "lv" + (i === cur ? " cur" : ""); b.disabled = i > 0 && !SV.stars[i - 1];
      const c = document.createElement("canvas"); c.width = 320; c.height = 200; const x = c.getContext("2d"); const keep = { LV, grid, st }; LV = L; grid = L.map.map((r) => r.split("")); st = {}; for (let yy = 0; yy < ROWS; yy++) for (let xx = 0; xx < COLS; xx++) if (!isFloor(grid[yy][xx])) st[key(xx, yy)] = { c: grid[yy][xx], x: xx, y: yy }; x.drawImage(renderBg(), 0, OY, W, H - OY, 0, 0, 320, 200); LV = keep.LV; grid = keep.grid; st = keep.st;
      const s = SV.stars[i] || 0; b.appendChild(c);
      const t = document.createElement("div"); t.innerHTML = (i + 1) + ". " + L.name + "<div class='st'>" + (b.disabled ? "🔒" : "★".repeat(s) + "<i>" + "★".repeat(3 - s) + "</i>") + "</div><small>" + L.rec.map((r) => RECIPES[r].name).join(" · ") + "</small>"; b.appendChild(t);
      b.onclick = () => { audio(); $("levels").hidden = true; loadLevel(i); };
      box.appendChild(b);
    });
  }
  $("toTitle").onclick = () => { $("levels").hidden = true; showTitle(); };
  $("menuBtn").onclick = () => { if (state === "play" && !confirm("Mutfaklara dönülsün mü? Bu servis biter.")) return; LV = null; openLevels(); };
  $("pauseBtn").onclick = () => { if (state === "play") paused = !paused; };
  $("endNext").onclick = () => { $("end").hidden = true; loadLevel(li + 1); };
  $("endAgain").onclick = () => { $("end").hidden = true; loadLevel(li); };
  $("endMap").onclick = () => { $("end").hidden = true; openLevels(); };
  const muteBtn = $("mute");
  function setMute(m) { muted = m; muteBtn.setAttribute("aria-pressed", m ? "true" : "false"); muteBtn.setAttribute("aria-label", m ? "Sesi aç" : "Sesi kapat"); if (master) master.gain.value = m ? 0 : 1; try { localStorage.setItem(SAVE + ":mute", m ? "1" : "0"); } catch (e) {} }
  setMute(muted); muteBtn.onclick = () => { audio(); setMute(!muted); };
  document.addEventListener("visibilitychange", () => { if (document.hidden && state === "play") paused = true; });

  /* ---------- ölçek ve döngü ---------- */
  const stage = $("stage"), screen = $("screen");
  function fit() { const w = screen.clientWidth, h = screen.clientHeight; if (!w || !h) return; let sw = w, sh = w * H / W; if (sh > h) { sh = h; sw = h * W / H; } stage.style.width = Math.floor(sw) + "px"; stage.style.height = Math.floor(sh) + "px"; stage.style.setProperty("--fs", clamp(sw / 50, 12, 19).toFixed(1) + "px"); }
  addEventListener("resize", fit); if (window.ResizeObserver) new ResizeObserver(fit).observe(screen); fit();
  let last = performance.now();
  function frame(t) { const dt = Math.min(.05, (t - last) / 1000); last = t; update(dt); draw(); requestAnimationFrame(frame); }
  requestAnimationFrame(frame);
  showTitle();

  window.__mk = { LEVELS, get st() { return st; }, get chefs() { return chefs; }, get orders() { return orders; }, get score() { return score; }, get state() { return state; }, get grid() { return grid; }, keys, loadLevel, update, grab, target, setFast(v) { fast = v; }, finish, get timeLeft() { return timeLeft; }, set timeLeft(v) { timeLeft = v; } };
})();
