/* Gökkuşağı Adası — iki kişilik piksel platform macerası */
(function () {
  "use strict";
  const T = 16, COLS = 30, ROWS = 17, W = 480, H = 272;
  const $ = (id) => document.getElementById(id);
  const cv = $("cv"), ctx = cv.getContext("2d");
  const SAVE = "gokkusagi-adasi";
  const rnd = (a, b) => a + Math.random() * (b - a);
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const G = 950, MAXF = 620, THROW = 520, SPRING = 590;
  const NAMES = ["Pıtır", "Tombul"];

  /* ---------- kayıt ---------- */
  let SV = { stars: {}, mode: 2, seen: {} };
  try { const s = JSON.parse(localStorage.getItem(SAVE) || "null"); if (s && s.stars) SV = Object.assign(SV, s); } catch (e) {}
  function save() { try { localStorage.setItem(SAVE, JSON.stringify(SV)); } catch (e) {} }
  const LIST = []; WORLDS.forEach((w, wi) => w.levels.forEach((l, li) => LIST.push({ wi, li, w, l, id: wi + "-" + li })));
  const unlocked = (i) => i === 0 || SV.stars[LIST[i - 1].id] != null;

  /* ---------- ses ---------- */
  let ac = null, master = null, musicGain = null, muted = false;
  try { muted = localStorage.getItem(SAVE + ":mute") === "1"; } catch (e) {}
  function audio() {
    if (!ac) { const C = window.AudioContext || window.webkitAudioContext; if (!C) return null; ac = new C(); master = ac.createGain(); master.gain.value = muted ? 0 : 1; master.connect(ac.destination); musicGain = ac.createGain(); musicGain.gain.value = .5; musicGain.connect(master); }
    if (ac.state === "suspended") ac.resume();
    return ac;
  }
  function tone(f, d, type, vol, when, slide, dest) {
    if (!ac || muted) return; const t = when || ac.currentTime;
    const o = ac.createOscillator(), g = ac.createGain(); o.type = type || "square"; o.frequency.setValueAtTime(f, t);
    if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(30, slide), t + d);
    g.gain.setValueAtTime(vol || .08, t); g.gain.exponentialRampToValueAtTime(.0008, t + d);
    o.connect(g); g.connect(dest || master); o.start(t); o.stop(t + d + .02);
  }
  let nb = null;
  function noise(d, vol, freq) {
    if (!ac || muted) return; if (!nb) { nb = ac.createBuffer(1, ac.sampleRate * .5, ac.sampleRate); const c = nb.getChannelData(0); for (let i = 0; i < c.length; i++) c[i] = Math.random() * 2 - 1; }
    const s = ac.createBufferSource(), f = ac.createBiquadFilter(), g = ac.createGain(), t = ac.currentTime; s.buffer = nb; f.type = "bandpass"; f.frequency.value = freq || 1500; g.gain.setValueAtTime(vol || .12, t); g.gain.exponentialRampToValueAtTime(.001, t + d); s.connect(f); f.connect(g); g.connect(master); s.start(t); s.stop(t + d);
  }
  const now = () => ac ? ac.currentTime : 0;
  const sfx = {
    jump(p) { tone(p ? 330 : 520, .14, "square", .05, 0, p ? 620 : 980); },
    land() { noise(.06, .05, 700); },
    star() { const t = now(); [988, 1319, 1568, 1976].forEach((f, i) => tone(f, .12, "square", .045, t + i * .05)); },
    click() { tone(900, .04, "square", .05); tone(500, .06, "square", .04, now() + .03); },
    door() { tone(160, .25, "square", .05, 0, 320); noise(.2, .05, 400); },
    spring() { tone(220, .3, "triangle", .12, 0, 880); tone(330, .25, "square", .03, 0, 990); },
    throw() { noise(.25, .1, 2600); tone(300, .3, "triangle", .08, 0, 1200); },
    break() { noise(.4, .25, 500); tone(110, .3, "square", .07, 0, 50); },
    push() { noise(.05, .03, 300); },
    die() { const t = now(); tone(600, .12, "square", .06, t, 200); tone(300, .2, "square", .05, t + .1, 120); },
    win() { const t = now(); [[523, 0], [659, .1], [784, .2], [1047, .3], [784, .45], [1047, .55]].forEach(([f, d]) => { tone(f, .2, "square", .05, t + d); tone(f / 2, .2, "triangle", .08, t + d); }); },
    bump() { tone(140, .05, "square", .04); }
  };
  const mf = (m) => 440 * Math.pow(2, (m - 69) / 12);
  const SONGS = [
    { bpm: 132, lead: [67, 0, 72, 0, 76, 74, 72, 0, 69, 0, 72, 0, 74, 0, 0, 0, 67, 0, 72, 0, 76, 79, 81, 79, 77, 76, 74, 72, 74, 0, 0, 0], bass: [48, 0, 55, 0, 52, 0, 55, 0, 53, 0, 57, 0, 55, 0, 50, 0, 48, 0, 55, 0, 52, 0, 55, 0, 53, 0, 55, 0, 43, 0, 47, 0] },
    { bpm: 116, lead: [69, 72, 76, 0, 74, 72, 69, 0, 67, 71, 74, 0, 72, 71, 67, 0, 69, 72, 76, 81, 79, 76, 74, 72, 71, 72, 74, 76, 69, 0, 0, 0], bass: [45, 0, 52, 57, 45, 0, 52, 57, 43, 0, 50, 55, 43, 0, 50, 55, 41, 0, 48, 53, 41, 0, 48, 53, 40, 0, 47, 52, 45, 0, 45, 0] },
    { bpm: 104, lead: [76, 0, 79, 0, 83, 0, 81, 79, 76, 0, 74, 0, 76, 0, 0, 0, 72, 0, 76, 0, 79, 0, 77, 76, 74, 0, 71, 0, 72, 0, 0, 0], bass: [40, 47, 52, 47, 40, 47, 52, 47, 36, 43, 48, 43, 36, 43, 48, 43, 41, 48, 53, 48, 41, 48, 53, 48, 43, 50, 55, 50, 43, 50, 55, 50] }
  ];
  let song = null, step = 0, next = 0, mTimer = null;
  function music(i) { if (song === i) return; song = i; step = 0; if (ac) next = ac.currentTime + .1; if (!mTimer) mTimer = setInterval(tickMusic, 90); }
  function tickMusic() {
    if (!ac || song == null || muted || state !== "play") { if (ac) next = Math.max(next, ac.currentTime); return; }
    const sg = SONGS[song], st = 60 / sg.bpm / 2; if (next < ac.currentTime) next = ac.currentTime + .02;
    while (next < ac.currentTime + .3) { const i = step % sg.lead.length; if (sg.lead[i]) tone(mf(sg.lead[i]), st * .85, "square", .03, next, 0, musicGain); if (sg.bass[i]) tone(mf(sg.bass[i]), st * .9, "triangle", .085, next, 0, musicGain); step++; next += st; }
  }

  /* ---------- piksel karakterler ---------- */
  const PIT = {
    body: ["....kkk.....", "...kyyyk....", "..kkkyykkk..", ".kyyyyyyyyk.", "kyyyyyyyyyyk", "kyyyyyyyweek", "kyyyyyyyeeoo", "kYyYYyyppyoo", "kYYyyyyyyyyk", ".kYYyyyyyyk.", "..kYYYYYYk..", "...kkkkkk..."],
    feet: { a: ["...o...o....", "..oo..oo...."], b: ["....o.o.....", "...oo.oo...."], j: ["...o..o.....", "............"] },
    pal: { k: "#2A1E3A", y: "#FFD23F", Y: "#E8A317", w: "#FFFFFF", e: "#2A1E3A", o: "#FF8A3D", p: "#FF8FA3" }
  };
  const TOM = {
    body: ["..kk........kk..", ".kbbk......kbbk.", ".kbpbkkkkkkbpbk.", "..kbbbbbbbbbbk..", ".kbbbbbbbbbbbbk.", "kbbbbbbbbbbbbbbk", "kbbbbbwebbbwebbk", "kbbbbbeebbbeebbk", "kbbbbpllnnllpbbk", "kbbbbbllllllbbbk", ".kbbbbbbbbbbbbk.", ".kBbbbbbbbbbbBk.", "kbbkbllllllbkbbk", "kbbkbllllllbkbbk", "kBBkbllllllbkBBk", ".kk.kbllllbk.kk.", "....kbbbbbbk....", "....kBbbbbBk...."],
    legs: { a: ["....kbbkkbbk....", "...kbbbk.kbbbk..", "...kBBBk.kBBBk..", "....kkk...kkk..."], b: ["....kbbkkbbk....", "..kbbbk...kbbbk.", "..kBBBk...kBBBk.", "...kkk.....kkk.."], j: ["....kbbkkbbk....", "....kbbk.kbbk...", "....kBBk.kBBk...", ".....kk...kk...."] },
    pal: { k: "#2A1E3A", b: "#4D8DF0", B: "#2F64C0", l: "#BFE0FF", n: "#2A1E3A", w: "#FFFFFF", e: "#2A1E3A", p: "#FF8FA3" }
  };
  const sprCache = {};
  function sprite(kind, frame, blink) {
    const key = kind + frame + (blink ? "b" : ""); if (sprCache[key]) return sprCache[key];
    const D = kind ? TOM : PIT, rows = D.body.concat(kind ? D.legs[frame] : D.feet[frame]);
    const c = document.createElement("canvas"); c.width = rows[0].length; c.height = rows.length; const x = c.getContext("2d");
    rows.forEach((r, j) => { for (let i = 0; i < r.length; i++) { let ch = r[i]; if (ch === ".") continue; if (blink && (ch === "w" || ch === "e")) ch = kind ? "b" : (j === 6 ? "y" : "y"); if (blink && !kind && j === 6 && (i === 8 || i === 9)) ch = "k"; x.fillStyle = D.pal[ch]; x.fillRect(i, j, 1, 1); } });
    return (sprCache[key] = c);
  }

  /* ---------- dünya temaları ---------- */
  const TH = [
    { sky: ["#7EC8FF", "#D6F1FF"], top: "#5DB34A", top2: "#8BD96A", dirt: "#A0673A", dirt2: "#7A4A26", dirt3: "#B97E4A", shelf: "wood", crack: "#8E8E9E", plat: "#C8463F" },
    { sky: ["#6A4BB8", "#FF9EC7"], top: "#B57BE8", top2: "#E0B8FF", dirt: "#5A3A6A", dirt2: "#3E2650", dirt3: "#704A82", shelf: "mush", crack: "#8A7A9E", plat: "#E8463F" },
    { sky: ["#120E30", "#2E2870"], top: "#3FB8D8", top2: "#9DF6FF", dirt: "#3B3866", dirt2: "#2A2750", dirt3: "#4A4680", shelf: "crys", crack: "#6E6AA0", plat: "#4DA3FF" }
  ];
  const DOORC = ["#E8463F", "#4D8DF0", "#3FA34D"];

  /* ---------- bölüm durumu ---------- */
  let LV = null, map = [], th = TH[0], players = [], crates = [], stars = [], buttons = [], springs = [], plats = [], parts = [], exit = null;
  let doorOpen = [false, false, false], doorK = [0, 0, 0], got = 0, levelT = 0, winT = 0, staticCv = null, skyCv = null, active = 0, shake = 0;
  function loadLevel(i) {
    LV = LIST[i]; LV.i = i; th = TH[LV.wi];
    map = LV.l.map.map((r) => r.split(""));
    players = []; crates = []; stars = []; buttons = []; springs = []; plats = []; parts = []; exit = null; got = 0; levelT = 0; winT = 0; doorOpen = [false, false, false]; doorK = [0, 0, 0]; active = 0;
    for (let y = 0; y < ROWS; y++) for (let x = 0; x < COLS; x++) {
      const c = map[y][x];
      if (c === "1" || c === "2") { const k = +c - 1, d = k ? { w: 14, h: 21 } : { w: 10, h: 13 }; players[k] = { kind: k, sx: x * T + (16 - d.w) / 2, sy: (y + 1) * T - d.h, w: d.w, h: d.h, x: 0, y: 0, vx: 0, vy: 0, face: 1, ground: false, coyote: 0, jbuf: 0, on: null, sq: 0, anim: 0, dead: 0, blink: 2, dx: 0, dy: 0 }; map[y][x] = "."; }
      else if (c === "K") { crates.push({ x: x * T, y: y * T, w: 16, h: 16, vy: 0, dx: 0, dy: 0, on: null }); map[y][x] = "."; }
      else if (c === "*") { stars.push({ x: x * T + 8, y: y * T + 8, got: 0, t: rnd(0, 6) }); map[y][x] = "."; }
      else if (c === "E") { exit = { x: x * T, y: (y - 2) * T, w: 32, h: 48 }; map[y][x] = "."; }
      else if (c === "J") { springs.push({ x: x * T, y: y * T + 6, w: 16, h: 10, k: 0 }); map[y][x] = "."; }
      else if ("abcABC".includes(c)) { buttons.push({ x: x * T + 2, y: y * T + 12, w: 12, h: 4, g: "abc".indexOf(c.toLowerCase()), big: c === c.toUpperCase(), on: false }); map[y][x] = "."; }
      else if (c === "M" || c === "V") {
        if (x > 0 && map[y][x - 1] === c + "_") { map[y][x] = c + "_"; continue; }
        let n = 0; while (x + n < COLS && map[y][x + n] === c) { map[y][x + n] = c + "_"; n++; }
        plats.push({ x: x * T, y: y * T, w: n * T, h: 10, v: c === "V", dir: 1, dx: 0, dy: 0, sp: c === "V" ? 34 : 42 });
      }
    }
    for (let y = 0; y < ROWS; y++) for (let x = 0; x < COLS; x++) if (map[y][x] === "M_" || map[y][x] === "V_") map[y][x] = ".";
    players.forEach((p) => { p.x = p.sx; p.y = p.sy; });
    staticCv = renderStatic(); skyCv = renderSky();
    music(LV.wi);
    showHint(LV.l.hint);
    updateSwap();
  }
  const tile = (x, y) => (x < 0 || y < 0 || x >= COLS || y >= ROWS) ? "#" : map[y][x];
  function solidTile(c) { if (c === "#" || c === "X") return true; const d = "xyz".indexOf(c); return d >= 0 && !doorOpen[d] && doorK[d] < .5; }
  const over = (a, b) => a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;

  /* ---------- çarpışma ---------- */
  // e'yi yatayda dx kadar taşı; engel varsa dur. Tombul kutuyu iter.
  function moveX(e, dx, isCrate) {
    if (!dx) return 0;
    const nx = e.x + dx, r = { x: nx, y: e.y + .01, w: e.w, h: e.h - .02 };
    const y0 = Math.floor(r.y / T), y1 = Math.floor((r.y + r.h) / T), x0 = Math.floor(r.x / T), x1 = Math.floor((r.x + r.w - .001) / T);
    for (let ty = y0; ty <= y1; ty++) for (let tx = x0; tx <= x1; tx++) if (solidTile(tile(tx, ty))) {
      e.x = dx > 0 ? tx * T - e.w : (tx + 1) * T; if (e.vx !== undefined) e.vx = 0; return -1;
    }
    for (const c of crates) {
      if (c === e || !over(r, c)) continue;
      if (!isCrate && e.kind === 1 && Math.abs((e.y + e.h) - (c.y + c.h)) < 10) {
        const before = c.x; moveX(c, dx, true); const moved = c.x - before; if (Math.abs(moved) > .01) { c.pushT = .15; }
        if (!over({ x: nx, y: r.y, w: r.w, h: r.h }, c)) { e.x = nx; return 1; }
      }
      e.x = dx > 0 ? c.x - e.w : c.x + c.w; if (e.vx !== undefined) e.vx = 0; return -1;
    }
    e.x = nx; return 1;
  }
  // dikey hareket; tek yönlü raflar, platformlar, kutular, Tombul'un başı (Pıtır için)
  function moveY(e, dy) {
    if (!dy) return null;
    const oldB = e.y + e.h, ny = e.y + dy, r = { x: e.x + .01, y: ny, w: e.w - .02, h: e.h };
    let best = null, bestV = dy > 0 ? Infinity : -Infinity;
    const x0 = Math.floor(r.x / T), x1 = Math.floor((r.x + r.w) / T), y0 = Math.floor(r.y / T), y1 = Math.floor((r.y + r.h - .001) / T);
    for (let ty = y0; ty <= y1; ty++) for (let tx = x0; tx <= x1; tx++) {
      const c = tile(tx, ty);
      if (solidTile(c)) { if (dy > 0 && ty * T < bestV) { bestV = ty * T; best = { tile: 1 }; } else if (dy < 0 && (ty + 1) * T > bestV) { bestV = (ty + 1) * T; best = { tile: 1 }; } }
      else if (c === "=" && dy > 0 && oldB <= ty * T + .01 && !e.drop) { if (ty * T < bestV) { bestV = ty * T; best = { tile: 1 }; } }
    }
    const tops = [];
    for (const p of plats) tops.push([p, p.y, p.y + p.h, true]);
    for (const c of crates) if (c !== e) tops.push([c, c.y, c.y + c.h, false]);
    if (e.kind === 0 && players[1] && !players[1].dead) tops.push([players[1], players[1].y, players[1].y + 4, true]);
    for (const [o, top, bot, oneWay] of tops) {
      if (!(r.x < o.x + o.w && r.x + r.w > o.x)) continue;
      if (dy > 0) { if (oldB <= top + .5 && ny + e.h > top && top < bestV) { bestV = top; best = o; } }
      else if (!oneWay && e.y >= bot - .5 && ny < bot && bot > bestV) { bestV = bot; best = o; }
    }
    if (best) { e.y = dy > 0 ? bestV - e.h : bestV; return { obj: best, down: dy > 0 }; }
    e.y = ny; return null;
  }

  /* ---------- girdi ---------- */
  const inp = [{}, {}];
  const press = (p, k) => { if (!inp[p][k]) inp[p][k + "P"] = true; inp[p][k] = true; };
  const release = (p, k) => { inp[p][k] = false; };
  const two = () => SV.mode === 2;
  const KEY2 = { KeyA: [0, "left"], KeyD: [0, "right"], KeyW: [0, "jump"], KeyS: [0, "act"], ArrowLeft: [1, "left"], ArrowRight: [1, "right"], ArrowUp: [1, "jump"], ArrowDown: [1, "act"], Slash: [1, "act"], ShiftRight: [1, "act"], Numpad0: [1, "act"] };
  const KEY1 = { KeyA: "left", ArrowLeft: "left", KeyD: "right", ArrowRight: "right", KeyW: "jump", ArrowUp: "jump", Space: "jump", KeyS: "act", ArrowDown: "act", KeyX: "act", KeyF: "act" };
  addEventListener("keydown", (e) => {
    if (state !== "play") return;
    if (e.code === "KeyR") { restart(); return; }
    if (e.code === "Escape") { openMap(); return; }
    if (!two() && (e.code === "Tab" || e.code === "KeyQ" || e.code === "KeyC")) { e.preventDefault(); if (!e.repeat) swap(); return; }
    if (two()) { const m = KEY2[e.code]; if (!m) return; e.preventDefault(); if (!e.repeat) press(m[0], m[1]); else inp[m[0]][m[1]] = true; }
    else { const k = KEY1[e.code]; if (!k) return; e.preventDefault(); if (!e.repeat) press(active, k); }
  });
  addEventListener("keyup", (e) => {
    if (two()) { const m = KEY2[e.code]; if (m) release(m[0], m[1]); }
    else { const k = KEY1[e.code]; if (k) { release(0, k); release(1, k); } }
  });
  addEventListener("blur", () => { inp[0] = {}; inp[1] = {}; });
  document.querySelectorAll(".pad .k").forEach((b) => {
    const pad = +b.closest(".pad").dataset.p, k = b.dataset.k;
    const who = () => two() ? pad : active;
    const on = (e) => { e.preventDefault(); audio(); press(who(), k); b.classList.add("on"); b._p = who(); try { b.setPointerCapture(e.pointerId); } catch (x) {} };
    const off = (e) => { e.preventDefault(); release(b._p != null ? b._p : who(), k); b.classList.remove("on"); };
    b.addEventListener("pointerdown", on); b.addEventListener("pointerup", off); b.addEventListener("pointercancel", off); b.addEventListener("lostpointercapture", off); b.addEventListener("contextmenu", (e) => e.preventDefault());
  });
  function swap() { inp[0] = {}; inp[1] = {}; active = 1 - active; updateSwap(); sfx.click(); const p = players[active]; if (p) for (let i = 0; i < 6; i++) parts.push({ x: p.x + p.w / 2, y: p.y - 4, vx: rnd(-30, 30), vy: rnd(-50, -10), life: .4, c: "#FFF8E8", s: 1 }); }
  function updateSwap() { const b = $("swap"); b.hidden = two() || state !== "play"; $("swapName").textContent = NAMES[1 - active]; document.querySelectorAll(".pad .who").forEach((w, i) => w.textContent = two() ? NAMES[i] : NAMES[active]); }
  $("swap").onclick = () => swap();

  /* ---------- güncelleme ---------- */
  let state = "title", fast = false;
  function update(dt) {
    clock += dt;
    for (const p of parts) { p.life -= dt; p.x += p.vx * dt; p.y += p.vy * dt; if (p.g) p.vy += 400 * dt; }
    parts = parts.filter((p) => p.life > 0);
    if (state !== "play") return;
    levelT += dt; shake = Math.max(0, shake - dt);
    // düğmeler ve kapılar
    const prevOpen = doorOpen.slice(); doorOpen = [false, false, false];
    for (const b of buttons) {
      const zone = { x: b.x - 1, y: b.y - 4, w: b.w + 2, h: 8 }; let on = false;
      for (const p of players) if (!p.dead && (!b.big || p.kind === 1) && over(zone, p)) on = true;
      for (const c of crates) if (over(zone, c)) on = true;
      if (on && !b.on) sfx.click(); b.on = on; if (on) doorOpen[b.g] = true;
    }
    for (let g = 0; g < 3; g++) {
      if (!doorOpen[g] && doorK[g] > 0) { // kapanırken içinde biri varsa açık tut
        for (let y = 0; y < ROWS; y++) for (let x = 0; x < COLS; x++) if (map[y][x] === "xyz"[g]) { const r = { x: x * T, y: y * T, w: T, h: T }; if (players.some((p) => !p.dead && over(r, p)) || crates.some((c) => over(r, c))) doorOpen[g] = true; }
      }
      if (doorOpen[g] !== prevOpen[g] && levelT > .1) sfx.door();
      doorK[g] = clamp(doorK[g] + (doorOpen[g] ? 4 : -4) * dt, 0, 1);
    }
    // platformlar
    for (const p of plats) {
      const ox = p.x, oy = p.y, d = p.sp * p.dir * dt;
      if (p.wait > 0) p.wait -= dt;
      else if (p.v) { p.y += d; if (rectSolid(p.x, p.y, p.w, p.h) || (d < 0 && rectSolid(p.x, p.y - 26, p.w, 26))) { p.y = oy; p.dir *= -1; p.wait = 1.2; } }
      else { p.x += d; if (rectSolid(p.x, p.y, p.w, p.h)) { p.x = ox; p.dir *= -1; p.wait = 1.2; } }
      p.dx = p.x - ox; p.dy = p.y - oy;
    }
    // kutular
    for (const c of crates) {
      const ox = c.x, oy = c.y;
      if (c.on && c.on.dx !== undefined) { moveX(c, c.on.dx, true); if (c.on.dy) c.y += c.on.dy; }
      c.vy = Math.min(MAXF, c.vy + G * dt);
      const hit = moveY(c, c.vy * dt);
      if (hit && hit.down) { if (c.vy > 200) { sfx.land(); dust(c.x + 8, c.y + 16, 6); } c.vy = 0; c.on = hit.obj.tile ? null : hit.obj; } else if (hit) c.vy = 0; else c.on = null;
      c.pushT = Math.max(0, (c.pushT || 0) - dt); if (c.pushT > 0 && Math.random() < .2) { sfx.push(); dust(c.x + (Math.random() < .5 ? 0 : 16), c.y + 16, 1); }
      c.dx = c.x - ox; c.dy = c.y - oy;
    }
    // oyuncular: önce Tombul (Pıtır onun başında taşınabilir)
    for (const k of [1, 0]) updatePlayer(players[k], dt);
    // yaylar
    for (const s of springs) {
      s.k = Math.max(0, s.k - dt * 4);
      for (const e of players.concat(crates)) if (!e.dead && e.vy >= 0 && over({ x: s.x + 2, y: s.y, w: s.w - 4, h: 11 }, { x: e.x, y: e.y + e.h - 2, w: e.w, h: 3 })) {
        e.vy = -SPRING; e.boost = true; e.y = s.y - e.h - 1; e.on = null; s.k = 1; sfx.spring(); if (e.sq !== undefined) e.sq = -.4; dust(s.x + 8, s.y, 6);
      }
    }
    // yıldızlar
    for (const s of stars) { s.t += dt; if (!s.got) for (const p of players) if (!p.dead && over({ x: s.x - 7, y: s.y - 7, w: 14, h: 14 }, p)) { s.got = 1; got++; sfx.star(); for (let i = 0; i < 14; i++) { const a = i / 14 * 6.28; parts.push({ x: s.x, y: s.y, vx: Math.cos(a) * 70, vy: Math.sin(a) * 70, life: .5, c: i % 2 ? "#FFD23F" : "#fff", s: 2 }); } } }
    // çıkış
    const both = players.every((p) => !p.dead && over({ x: exit.x + 4, y: exit.y + 8, w: exit.w - 8, h: exit.h - 8 }, { x: p.x + p.w / 2 - 1, y: p.y + p.h / 2, w: 2, h: 2 }));
    if (both && !winT) { winT = .001; sfx.win(); players.forEach((p) => { p.vy = -200; }); }
    if (winT) { winT += dt; if (Math.random() < .5) parts.push({ x: exit.x + rnd(0, 32), y: exit.y + rnd(0, 40), vx: rnd(-20, 20), vy: rnd(-60, -20), life: .8, c: ["#E8463F", "#FFD23F", "#4DA3FF", "#3FA34D"][Math.floor(rnd(0, 4))], s: 2 }); if (winT > 1.6) finishLevel(); }
    for (const i of [0, 1]) { inp[i].jumpP = false; inp[i].actP = false; }
  }
  let clock = 0;
  function rectSolid(x, y, w, h) {
    const x0 = Math.floor(x / T), x1 = Math.floor((x + w - .01) / T), y0 = Math.floor(y / T), y1 = Math.floor((y + h - .01) / T);
    for (let ty = y0; ty <= y1; ty++) for (let tx = x0; tx <= x1; tx++) if (solidTile(tile(tx, ty))) return true;
    return false;
  }
  function updatePlayer(p, dt) {
    if (!p) return;
    p.blink -= dt; if (p.blink < -.12) p.blink = rnd(2, 4.5);
    p.sq += (0 - p.sq) * Math.min(1, dt * 12);
    if (p.dead) { p.dead -= dt; if (p.dead <= 0) { p.dead = 0; p.x = p.sx; p.y = p.sy; p.vx = p.vy = 0; p.on = null; poof(p); } return; }
    const I = (two() || p.kind === active) ? inp[p.kind] : {};
    const ctrl = !winT;
    // taşıyıcı
    if (p.on) { const o = p.on; if (o.dx !== undefined && (o.dx || o.dy)) { moveX(p, o.dx); if (o.dy) moveY(p, o.dy + (o.dy < 0 ? 0 : 0)); } }
    const sp = p.kind ? 88 : 100, jv = p.kind ? 330 : 355;
    const dir = ctrl ? (I.right ? 1 : 0) - (I.left ? 1 : 0) : 0;
    p.vx += (dir * sp - p.vx) * Math.min(1, dt * (p.ground ? 16 : 11));
    if (dir) p.face = dir;
    p.coyote = p.ground ? .1 : Math.max(0, p.coyote - dt);
    if (ctrl && I.jumpP) p.jbuf = .14; else p.jbuf = Math.max(0, p.jbuf - dt);
    if (p.jbuf > 0 && p.coyote > 0) { p.vy = -jv; p.jbuf = 0; p.coyote = 0; p.ground = false; p.on = null; p.sq = -.35; sfx.jump(p.kind); dust(p.x + p.w / 2, p.y + p.h, 4); }
    if (ctrl && I.actP) action(p);
    if (p.vy >= 0) p.boost = false;
    let g = G; if (p.vy < 0 && !I.jump && !p.boost) g *= 2.2;
    p.vy = Math.min(MAXF, p.vy + g * dt);
    const ox = p.x, oy = p.y;
    moveX(p, p.vx * dt);
    p.x = clamp(p.x, 0, W - p.w);
    if (p.ground) for (const pl of plats) { const b = p.y + p.h; if (p.x + p.w > pl.x + 2 && p.x < pl.x + pl.w - 2 && b > pl.y && b - pl.y <= 12 && !rectSolid(p.x, pl.y - p.h, p.w, p.h)) { p.y = pl.y - p.h; p.vy = 0; } }
    const was = p.ground, vyBefore = p.vy;
    const hit = moveY(p, p.vy * dt);
    if (hit && hit.down) { p.ground = true; p.on = hit.obj.tile ? null : hit.obj; if (!was && vyBefore > 160) { p.sq = Math.min(.45, vyBefore / 900); sfx.land(); dust(p.x + p.w / 2, p.y + p.h, 3); } p.vy = 0; }
    else { if (hit) { p.vy = Math.max(0, p.vy); sfx.bump(); } p.ground = false; p.on = null; }
    p.dx = p.x - ox; p.dy = p.y - oy;
    p.anim += Math.abs(p.dx) * .08;
    // dikenler
    const r = { x: p.x + 2, y: p.y + 2, w: p.w - 4, h: p.h - 2 };
    for (let ty = Math.floor(r.y / T); ty <= Math.floor((r.y + r.h) / T); ty++) for (let tx = Math.floor(r.x / T); tx <= Math.floor((r.x + r.w) / T); tx++)
      if (tile(tx, ty) === "^" && over(r, { x: tx * T + 2, y: ty * T + 8, w: 12, h: 8 })) { die(p); return; }
  }
  function action(p) {
    if (p.kind === 1) {
      const m = players[0];
      if (m && !m.dead && m.on === p) { m.vy = -THROW; m.boost = true; m.on = null; m.ground = false; m.y -= 2; p.sq = .35; m.sq = -.5; sfx.throw(); for (let i = 0; i < 8; i++) parts.push({ x: m.x + 5, y: m.y + 14, vx: rnd(-40, 40), vy: rnd(10, 60), life: .4, c: "#FFF8E8", s: 1 }); return; }
      // çatlak taş
      const fx = p.face > 0 ? p.x + p.w + 12 : p.x - 12;
      for (const fy of [p.y + 2, p.y + p.h / 2, p.y + p.h - 2]) { const tx = Math.floor(fx / T), ty = Math.floor(fy / T); if (tile(tx, ty) === "X") { breakX(tx, ty); p.sq = .3; return; } }
      p.sq = .2; tone(200, .08, "square", .03);
    } else { p.sq = -.3; p.vy = Math.min(p.vy, p.ground ? -120 : p.vy); tone(1200, .06, "square", .03); }
  }
  function breakX(tx, ty) {
    const q = [[tx, ty]]; let n = 0;
    while (q.length) { const [x, y] = q.pop(); if (tile(x, y) !== "X") continue; map[y][x] = "."; n++; for (let i = 0; i < 10; i++) parts.push({ x: x * T + 8, y: y * T + 8, vx: rnd(-90, 90), vy: rnd(-140, 0), life: rnd(.5, 1), c: i % 2 ? th.crack : th.dirt2, s: rnd(2, 4) | 0, g: 1 }); q.push([x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]); }
    sfx.break(); shake = .3; staticCv = renderStatic();
  }
  function die(p) { p.dead = .7; sfx.die(); poof(p, "#FF6B6B"); if (p.kind === 1 && players[0].on === p) players[0].on = null; }
  function poof(p, c) { for (let i = 0; i < 14; i++) { const a = rnd(0, 6.28), s = rnd(30, 90); parts.push({ x: p.x + p.w / 2, y: p.y + p.h / 2, vx: Math.cos(a) * s, vy: Math.sin(a) * s, life: rnd(.3, .6), c: c || "#FFF8E8", s: 2 }); } }
  function dust(x, y, n) { for (let i = 0; i < n; i++) parts.push({ x: x + rnd(-4, 4), y: y - 1, vx: rnd(-30, 30), vy: rnd(-25, -5), life: rnd(.25, .45), c: LV && LV.wi === 2 ? "#9AA0D8" : "#E9DCC0", s: 2 }); }

  /* ---------- çizim ---------- */
  function px(c, x, y, w, h, col) { c.fillStyle = col; c.fillRect(x, y, w, h); }
  const hash = (a, b, c) => { let h = (a * 374761393 + b * 668265263 + (c || 0) * 2147483647) | 0; h = (h ^ (h >>> 13)) * 1274126177; return ((h ^ (h >>> 16)) >>> 0) / 4294967295; };
  function renderSky() {
    const c = document.createElement("canvas"); c.width = W; c.height = H; const x = c.getContext("2d"), wi = LV.wi;
    const g = x.createLinearGradient(0, 0, 0, H); g.addColorStop(0, th.sky[0]); g.addColorStop(1, th.sky[1]); x.fillStyle = g; x.fillRect(0, 0, W, H);
    if (wi === 0) {
      x.fillStyle = "#FFF3B0"; x.beginPath(); x.arc(400, 46, 20, 0, 7); x.fill(); x.fillStyle = "rgba(255,243,176,.3)"; x.beginPath(); x.arc(400, 46, 30, 0, 7); x.fill();
      hills(x, 190, 40, "#A8DC8C", 1); hills(x, 215, 30, "#86C873", 2);
    } else if (wi === 1) {
      for (let i = 0; i < 40; i++) px(x, hash(i, 3) * W | 0, hash(i, 4) * 120 | 0, 1, 1, "rgba(255,255,255,.7)");
      for (let i = 0; i < 6; i++) { const mx = 30 + i * 85 + hash(i, 1) * 30, mh = 70 + hash(i, 2) * 70, cw = 40 + hash(i, 5) * 30; x.fillStyle = "rgba(60,30,110,.55)"; x.fillRect(mx - 5, H - mh, 10, mh); x.beginPath(); x.ellipse(mx, H - mh, cw, cw * .5, 0, Math.PI, 0); x.fill(); }
      hills(x, 225, 24, "rgba(70,40,120,.7)", 3);
    } else {
      for (let i = 0; i < 14; i++) { const cx = hash(i, 7) * W, cy = 40 + hash(i, 8) * 200, s = 6 + hash(i, 9) * 14; x.fillStyle = i % 2 ? "rgba(77,163,255,.25)" : "rgba(181,123,232,.22)"; x.beginPath(); x.moveTo(cx, cy - s * 1.6); x.lineTo(cx + s * .6, cy); x.lineTo(cx, cy + s * .4); x.lineTo(cx - s * .6, cy); x.fill(); }
      x.fillStyle = "rgba(10,8,30,.5)"; for (let i = 0; i < 16; i++) { const sx = i * 32 + hash(i, 2) * 10; x.beginPath(); x.moveTo(sx, 0); x.lineTo(sx + 16, 0); x.lineTo(sx + 8, 18 + hash(i, 3) * 30); x.fill(); }
    }
    return c;
  }
  function hills(x, base, amp, col, seed) { x.fillStyle = col; x.beginPath(); x.moveTo(0, H); for (let i = 0; i <= W; i += 8) x.lineTo(i, base - Math.abs(Math.sin(i / 70 + seed)) * amp - Math.sin(i / 23 + seed * 2) * 4); x.lineTo(W, H); x.fill(); }
  function renderStatic() {
    const c = document.createElement("canvas"); c.width = W; c.height = H; const x = c.getContext("2d");
    for (let ty = 0; ty < ROWS; ty++) for (let tx = 0; tx < COLS; tx++) drawTile(x, tx, ty);
    return c;
  }
  const isGround = (c) => c === "#";
  function drawTile(x, tx, ty) {
    const c = map[ty][tx], X = tx * T, Y = ty * T;
    if (c === "#") {
      px(x, X, Y, T, T, th.dirt);
      for (let i = 0; i < 5; i++) { const r = hash(tx, ty, i); px(x, X + Math.floor(r * 13), Y + Math.floor(hash(ty, tx, i) * 13), 3, 2, i % 2 ? th.dirt2 : th.dirt3); }
      const up = isGround(tile(tx, ty - 1)) || tile(tx, ty - 1) === "X", lf = isGround(tile(tx - 1, ty)), rt = isGround(tile(tx + 1, ty)), dn = isGround(tile(tx, ty + 1));
      if (!lf) px(x, X, Y, 2, T, th.dirt2); if (!rt) px(x, X + 14, Y, 2, T, th.dirt2); if (!dn) px(x, X, Y + 14, T, 2, th.dirt2);
      if (!up) {
        px(x, X, Y, T, 5, th.top); px(x, X, Y, T, 2, th.top2);
        for (let i = 0; i < 4; i++) px(x, X + i * 4 + (tx % 2), Y + 5, 2, 1 + (hash(tx, i) * 3 | 0), th.top);
        if (LV.wi === 0 && hash(tx, ty, 9) > .7 && tile(tx, ty - 1) === ".") { px(x, X + 6, Y - 3, 1, 3, "#3E8E44"); px(x, X + 5, Y - 5, 3, 2, ["#FF7AA2", "#FFD23F", "#fff"][tx % 3]); }
        if (LV.wi === 2 && hash(tx, ty, 9) > .75 && tile(tx, ty - 1) === ".") { x.fillStyle = "#7DF9FF"; x.beginPath(); x.moveTo(X + 8, Y - 7); x.lineTo(X + 11, Y); x.lineTo(X + 5, Y); x.fill(); px(x, X + 7, Y - 4, 1, 3, "#fff"); }
        if (LV.wi === 1 && hash(tx, ty, 9) > .75 && tile(tx, ty - 1) === ".") { px(x, X + 9, Y - 3, 2, 3, "#F1E3C4"); px(x, X + 7, Y - 5, 6, 2, "#E8463F"); px(x, X + 8, Y - 5, 1, 1, "#fff"); }
      }
    } else if (c === "=") {
      if (th.shelf === "wood") { px(x, X, Y, T, 5, "#B07A40"); px(x, X, Y, T, 1, "#D8A060"); px(x, X, Y + 5, T, 1, "#6E4A26"); px(x, X + (tx % 2 ? 2 : 12), Y + 5, 2, 5, "#6E4A26"); px(x, X + 7, Y + 1, 1, 3, "#8A5A2B"); }
      else if (th.shelf === "mush") { x.fillStyle = "#E8463F"; x.beginPath(); x.ellipse(X + 8, Y + 4, 9, 4.5, 0, Math.PI, 0); x.lineTo(X + 17, Y + 6); x.lineTo(X - 1, Y + 6); x.fill(); px(x, X + 3, Y + 1, 2, 2, "#fff"); px(x, X + 11, Y + 2, 2, 1, "#fff"); px(x, X - 1, Y + 5, 18, 1, "#9A2A26"); }
      else { px(x, X, Y, T, 5, "#5FB8E8"); px(x, X, Y, T, 1, "#BDF4FF"); px(x, X + 3, Y + 1, 3, 2, "#9DF6FF"); px(x, X, Y + 5, T, 1, "#2A6FA0"); }
    } else if (c === "^") {
      for (let i = 0; i < 3; i++) { x.fillStyle = "#5E5E70"; x.beginPath(); x.moveTo(X + i * 5 + 1, Y + 16); x.lineTo(X + i * 5 + 3.5, Y + 7); x.lineTo(X + i * 5 + 6, Y + 16); x.fill(); x.fillStyle = "#D8DCE8"; x.beginPath(); x.moveTo(X + i * 5 + 2, Y + 16); x.lineTo(X + i * 5 + 3.5, Y + 8); x.lineTo(X + i * 5 + 4, Y + 16); x.fill(); }
    } else if (c === "X") {
      px(x, X, Y, T, T, th.crack); px(x, X, Y, T, 1, "rgba(255,255,255,.35)"); px(x, X, Y + 15, T, 1, "rgba(0,0,0,.35)");
      x.strokeStyle = "rgba(20,14,40,.75)"; x.lineWidth = 1; x.beginPath(); x.moveTo(X + 3, Y + 1); x.lineTo(X + 7, Y + 6); x.lineTo(X + 5, Y + 10); x.lineTo(X + 9, Y + 15); x.moveTo(X + 7, Y + 6); x.lineTo(X + 13, Y + 5); x.stroke();
      px(x, X + 11, Y + 10, 2, 2, "rgba(20,14,40,.5)");
    }
  }
  function drawDoors() {
    for (let ty = 0; ty < ROWS; ty++) for (let tx = 0; tx < COLS; tx++) {
      const g = "xyz".indexOf(map[ty][tx]); if (g < 0) continue;
      const X = tx * T, Y = ty * T, k = doorK[g], col = DOORC[g];
      px(ctx, X, Y, 2, T, "#3A3456"); px(ctx, X + 14, Y, 2, T, "#3A3456");
      const h = Math.round(T * (1 - k)); if (h <= 0) continue;
      px(ctx, X + 2, Y, 12, h, col); for (let i = 0; i < 3; i++) px(ctx, X + 4 + i * 3, Y, 1, h, "rgba(0,0,0,.25)"); px(ctx, X + 2, Y, 2, h, "rgba(255,255,255,.3)");
      if (h > 6) px(ctx, X + 6, Y + 5, 4, 4, "rgba(255,255,255,.55)");
    }
  }
  function draw() {
    ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.imageSmoothingEnabled = false;
    if (!LV) { titleBg(); return; }
    const sx = shake > 0 ? Math.round(rnd(-2, 2)) : 0, sy = shake > 0 ? Math.round(rnd(-2, 2)) : 0;
    ctx.drawImage(skyCv, 0, 0);
    ambient();
    ctx.translate(sx, sy);
    ctx.drawImage(staticCv, 0, 0);
    drawExit(); drawDoors();
    for (const b of buttons) drawButton(b);
    for (const s of springs) drawSpring(s);
    for (const p of plats) drawPlat(p);
    for (const c of crates) drawCrate(c);
    for (const s of stars) if (!s.got) drawStar(s.x, s.y + Math.sin(s.t * 3) * 2, s.t);
    for (const k of [1, 0]) drawPlayer(players[k]);
    for (const p of parts) { ctx.fillStyle = p.c; ctx.globalAlpha = Math.min(1, p.life * 3); ctx.fillRect(Math.round(p.x), Math.round(p.y), p.s, p.s); } ctx.globalAlpha = 1;
    if (LV.wi === 2) { ctx.fillStyle = "rgba(10,6,40,.18)"; ctx.fillRect(0, 0, W, H); }
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    hud();
  }
  function ambient() {
    const wi = LV.wi;
    if (wi === 0) for (let i = 0; i < 5; i++) { const x = ((hash(i, 1) * 600 + clock * (6 + i * 2)) % 620) - 70, y = 18 + hash(i, 2) * 70; cloud(x, y, 1 + (i % 2)); }
    else if (wi === 1) for (let i = 0; i < 14; i++) { const x = (hash(i, 1) * W + Math.sin(clock * .7 + i) * 20) % W, y = 40 + hash(i, 2) * 200 + Math.cos(clock * .9 + i) * 10, a = .4 + .6 * Math.abs(Math.sin(clock * 2 + i)); ctx.fillStyle = "rgba(255,240,150," + a + ")"; ctx.fillRect(x | 0, y | 0, 2, 2); }
    else for (let i = 0; i < 12; i++) { const x = hash(i, 4) * W, y = hash(i, 5) * H, a = Math.max(0, Math.sin(clock * 1.5 + i * 1.7)); if (a > .2) { ctx.fillStyle = "rgba(157,246,255," + a + ")"; ctx.fillRect(x | 0, y | 0, 1, 3); ctx.fillRect((x | 0) - 1, (y | 0) + 1, 3, 1); } }
  }
  function cloud(x, y, s) { ctx.fillStyle = "rgba(255,255,255,.9)"; const r = [[0, 6, 10], [9, 2, 12], [20, 6, 10], [10, 8, 12]]; for (const [a, b, c] of r) { ctx.beginPath(); ctx.arc(x + a * s, y + b * s, c * s * .8, 0, 7); ctx.fill(); } }
  function drawExit() {
    const { x, y } = exit, ready = players.filter((p) => !p.dead && over(exit, p)).length;
    // gökkuşağı yayı
    const cols = ["#E8463F", "#FF8A3D", "#FFD23F", "#3FA34D", "#4DA3FF", "#8E5BE8"];
    cols.forEach((c, i) => { ctx.strokeStyle = c; ctx.lineWidth = 2; ctx.globalAlpha = .55 + .3 * Math.sin(clock * 3 + i); ctx.beginPath(); ctx.arc(x + 16, y + 20, 22 - i * 2, Math.PI, 0); ctx.stroke(); }); ctx.globalAlpha = 1;
    px(ctx, x + 3, y + 14, 26, 34, "#5A4A6E"); ctx.fillStyle = "#5A4A6E"; ctx.beginPath(); ctx.arc(x + 16, y + 16, 13, Math.PI, 0); ctx.fill();
    const open = winT ? 1 : ready ? .5 : 0;
    ctx.fillStyle = open ? "#FFF3B0" : "#2A1E3A"; ctx.beginPath(); ctx.arc(x + 16, y + 17, 10, Math.PI, 0); ctx.fill(); px(ctx, x + 6, y + 17, 20, 31, open ? "#FFF3B0" : "#2A1E3A");
    if (!winT) { px(ctx, x + 6, y + 17, 10 - open * 8, 31, "#B07A40"); px(ctx, x + 16 + open * 8, y + 17, 10 - open * 8, 31, "#B07A40"); px(ctx, x + 15, y + 17, 2, 31, "#6E4A26"); px(ctx, x + 12, y + 32, 2, 2, "#FFD23F"); px(ctx, x + 18, y + 32, 2, 2, "#FFD23F"); }
    if (ready === 1 && !winT) { ctx.fillStyle = "#fff"; ctx.font = '8px "Press Start 2P", monospace'; ctx.textAlign = "center"; ctx.fillText("1/2", x + 16, y - 8 + Math.sin(clock * 5) * 2); }
  }
  function drawButton(b) {
    const col = DOORC[b.g], ph = b.on ? 2 : 4;
    px(ctx, b.x - 2, b.y + 2, b.w + 4, 2, "#3A3456");
    if (b.big) { px(ctx, b.x - 1, b.y + 4 - ph - 1, b.w + 2, ph + 1, "#1B1730"); px(ctx, b.x, b.y + 4 - ph, b.w, ph, col); px(ctx, b.x + 1, b.y + 4 - ph, b.w - 2, 1, "rgba(255,255,255,.5)"); px(ctx, b.x + 5, b.y - 6 - ph + Math.sin(clock * 4) * 1, 2, 4, "#fff"); px(ctx, b.x + 4, b.y - 9 - ph + Math.sin(clock * 4), 4, 2, "#fff"); }
    else { px(ctx, b.x + 2, b.y + 4 - ph - 1, b.w - 4, ph + 1, "#1B1730"); px(ctx, b.x + 3, b.y + 4 - ph, b.w - 6, ph, col); px(ctx, b.x + 3, b.y + 4 - ph, b.w - 6, 1, "rgba(255,255,255,.5)"); }
  }
  function drawSpring(s) {
    const c = s.k, top = s.y + c * 4;
    if (LV.wi === 1) { px(ctx, s.x + 6, top + 4, 4, s.y + 10 - top - 4, "#F1E3C4"); ctx.fillStyle = "#FF5AA0"; ctx.beginPath(); ctx.ellipse(s.x + 8, top + 5, 8 + c * 2, 5 - c, 0, Math.PI, 0); ctx.fill(); px(ctx, s.x + 3, top + 1, 2, 2, "#fff"); px(ctx, s.x + 10, top + 2, 2, 2, "#fff"); }
    else { px(ctx, s.x + 2, s.y + 8, 12, 2, "#5E5E70"); for (let i = 0; i < 3; i++) px(ctx, s.x + 4, top + 3 + i * (s.y + 8 - top - 3) / 3, 8, 1, "#B0B0C8"); px(ctx, s.x + 1, top, 14, 3, "#E8463F"); px(ctx, s.x + 1, top, 14, 1, "#FF8A80"); }
  }
  function drawPlat(p) {
    const n = p.w / T;
    for (let i = 0; i < n; i++) {
      const X = Math.round(p.x) + i * T, Y = Math.round(p.y);
      if (LV.wi === 1) { ctx.fillStyle = "#C96BE8"; ctx.beginPath(); ctx.ellipse(X + 8, Y + 6, 9, 6, 0, Math.PI, 0); ctx.lineTo(X + 17, Y + 9); ctx.lineTo(X - 1, Y + 9); ctx.fill(); px(ctx, X + 4, Y + 2, 2, 2, "#F4D9FF"); px(ctx, X - 1, Y + 8, 18, 2, "#7A3A98"); }
      else if (LV.wi === 2) { px(ctx, X, Y, T, 10, "#4DA3FF"); px(ctx, X, Y, T, 2, "#BDF4FF"); px(ctx, X, Y + 8, T, 2, "#2A5FA0"); px(ctx, X + 6, Y + 3, 4, 3, "#9DF6FF"); }
      else { px(ctx, X, Y, T, 10, "#B07A40"); px(ctx, X, Y, T, 2, "#D8A060"); px(ctx, X, Y + 8, T, 2, "#6E4A26"); }
    }
    if (p.v) { px(ctx, Math.round(p.x) + p.w / 2 - 1, 0, 2, Math.round(p.y), "rgba(200,220,255,.35)"); }
  }
  function drawCrate(c) {
    const X = Math.round(c.x), Y = Math.round(c.y);
    px(ctx, X, Y, 16, 16, "#5A3A1E"); px(ctx, X + 1, Y + 1, 14, 14, "#C08A50"); px(ctx, X + 1, Y + 1, 14, 1, "#E0AA70");
    px(ctx, X + 1, Y + 7, 14, 2, "#8A5A2B"); px(ctx, X + 1, Y + 1, 2, 14, "#8A5A2B"); px(ctx, X + 13, Y + 1, 2, 14, "#8A5A2B");
    for (let i = 0; i < 10; i++) { px(ctx, X + 3 + i, Y + 3 + i * .4 | 0, 1, 1, "#8A5A2B"); }
    px(ctx, X + 2, Y + 2, 1, 1, "#FFD23F"); px(ctx, X + 13, Y + 2, 1, 1, "#FFD23F"); px(ctx, X + 2, Y + 13, 1, 1, "#FFD23F"); px(ctx, X + 13, Y + 13, 1, 1, "#FFD23F");
  }
  function drawStar(x, y, t, sc) {
    const s = sc || 1, sp = Math.cos(t * 2.4);
    ctx.save(); ctx.translate(x, y); ctx.scale(Math.max(.25, Math.abs(sp)) * s, s);
    const g = ctx.createRadialGradient(0, 0, 1, 0, 0, 12); g.addColorStop(0, "rgba(255,240,150,.6)"); g.addColorStop(1, "rgba(255,240,150,0)"); ctx.fillStyle = g; ctx.fillRect(-12, -12, 24, 24);
    starPath(7.5, 3.2); ctx.fillStyle = "#A0701A"; ctx.fill(); starPath(6.5, 2.8); ctx.fillStyle = sp > 0 ? "#FFD23F" : "#F2B400"; ctx.fill();
    ctx.fillStyle = "#FFF6C4"; ctx.fillRect(-2, -4, 2, 2);
    ctx.restore();
  }
  function starPath(R, r) { ctx.beginPath(); for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5, rr = i % 2 ? r : R; ctx.lineTo(Math.cos(a) * rr, Math.sin(a) * rr); } ctx.closePath(); }
  function drawPlayer(p) {
    if (!p || p.dead) return;
    const run = p.ground && Math.abs(p.vx) > 15, frame = !p.ground ? "j" : run ? (Math.floor(p.anim) % 2 ? "b" : "a") : "a";
    const s = sprite(p.kind, frame, p.blink < 0), sw = s.width, shh = s.height;
    const sq = p.sq, scx = 1 + sq * .5, scy = 1 - sq * .5;
    const cx = Math.round(p.x + p.w / 2), by = Math.round(p.y + p.h);
    const bob = p.ground && !run ? Math.round(Math.sin(clock * 3 + p.kind) * .5) : 0;
    ctx.save(); ctx.translate(cx, by); ctx.scale(p.face < 0 ? -scx : scx, scy); ctx.drawImage(s, -Math.floor(sw / 2), -shh + 1 + bob); ctx.restore();
    if (!two() && p.kind === active && !winT) { const ay = p.y - 9 + Math.sin(clock * 6) * 2; ctx.fillStyle = p.kind ? "#4D8DF0" : "#FFD23F"; ctx.beginPath(); ctx.moveTo(cx - 4, ay); ctx.lineTo(cx + 4, ay); ctx.lineTo(cx, ay + 5); ctx.fill(); ctx.strokeStyle = "#1B1730"; ctx.lineWidth = 1; ctx.stroke(); }
    if (p.kind === 1 && players[0] && players[0].on === p && !winT && levelT % 1.4 < .9) { ctx.fillStyle = "#fff"; ctx.font = '8px "Press Start 2P", monospace'; ctx.textAlign = "center"; ctx.fillText("↓", cx + (p.face > 0 ? 14 : -14), p.y + 6); }
  }
  function txt(s, x, y, col, align) { ctx.font = '8px "Press Start 2P", monospace'; ctx.textAlign = align || "left"; ctx.textBaseline = "top"; ctx.fillStyle = "#1B1730"; ctx.fillText(s, x + 1, y + 1); ctx.fillStyle = col; ctx.fillText(s, x, y); }
  function hud() {
    const n = (LV.wi + 1) + "-" + (LV.li + 1) + " " + LV.l.name;
    ctx.fillStyle = "rgba(20,16,48,.6)"; ctx.fillRect(4, 3, n.length * 8 + 8, 13); txt(n, 8, 5, "#FFF8E8");
    ctx.fillStyle = "rgba(20,16,48,.6)"; ctx.fillRect(W - 62, 3, 58, 15);
    for (let i = 0; i < 3; i++) { if (i < got) drawStar(W - 50 + i * 18, 10, 0, .8); else { ctx.save(); ctx.translate(W - 50 + i * 18, 10); ctx.scale(.8, .8); starPath(6.5, 2.8); ctx.fillStyle = "rgba(255,255,255,.18)"; ctx.fill(); ctx.restore(); } }
  }
  function titleBg() { const g = ctx.createLinearGradient(0, 0, 0, H); g.addColorStop(0, "#7EC8FF"); g.addColorStop(1, "#D6F1FF"); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H); }

  /* ---------- hikâye resmi ---------- */
  function drawStory(c, pieces, end) {
    const x = c.getContext("2d"), w = c.width, h = c.height; x.imageSmoothingEnabled = false;
    const g = x.createLinearGradient(0, 0, 0, h); g.addColorStop(0, end ? "#FFB8D9" : "#7EC8FF"); g.addColorStop(1, "#D6F1FF"); x.fillStyle = g; x.fillRect(0, 0, w, h);
    // gökkuşağı parçaları
    const cols = [["#E8463F", "#FF8A3D"], ["#FFD23F", "#3FA34D"], ["#4DA3FF", "#8E5BE8"]];
    for (let p = 0; p < 3; p++) {
      const a0 = Math.PI + p * Math.PI / 3, a1 = a0 + Math.PI / 3, has = p < pieces;
      cols[p].concat([]).forEach(() => {});
      ["#E8463F", "#FF8A3D", "#FFD23F", "#3FA34D", "#4DA3FF", "#8E5BE8"].forEach((col, i) => { x.strokeStyle = has ? col : "rgba(255,255,255,.35)"; x.lineWidth = 5; x.beginPath(); x.arc(w / 2, h - 18, 92 - i * 5, a0 + .02, a1 - .02); x.stroke(); });
    }
    // ada
    x.fillStyle = "#5DB34A"; x.beginPath(); x.ellipse(w / 2, h - 8, 90, 16, 0, Math.PI, 0); x.fill(); x.fillStyle = "#A0673A"; x.fillRect(w / 2 - 90, h - 8, 180, 8); x.fillStyle = "#4F9FE8"; x.fillRect(0, h - 4, w, 4);
    // kahramanlar
    x.drawImage(sprite(1, "a"), w / 2 - 24, h - 40, 16 * 1.2, 22 * 1.2);
    x.save(); x.translate(w / 2 + 14, h - 33); x.scale(-1, 1); x.drawImage(sprite(0, "a"), -12, 0, 12 * 1.2, 14 * 1.2); x.restore();
    if (end) for (let i = 0; i < 30; i++) { x.fillStyle = ["#E8463F", "#FFD23F", "#4DA3FF", "#3FA34D", "#fff"][i % 5]; x.fillRect(hash(i, 1) * w | 0, hash(i, 2) * (h - 40) | 0, 2, 3); }
  }
  const STORY = {
    intro: { p: 0, t: "Gökkuşağı Adası'nda bir sabah kocaman bir rüzgâr esti. Gökkuşağı üç parçaya bölünüp uçup gitti! Kardeşler Pıtır ile Tombul parçaları bulmak için yola çıktı." },
    w0: { p: 0, t: "Kırmızı parça Çayır Tepeleri'ne düşmüş. Pıtır küçük ve çevik, Tombul iri ve güçlü. Birlikte çalışırsanız her engeli aşarsınız!" },
    w1: { p: 1, t: "Kırmızı parça bulundu! Sıradaki sarı parça Mantar Ormanı'nda. Zıplayan mantarlara dikkat... ya da tadını çıkarın!" },
    w2: { p: 2, t: "Sarı parça da tamam! Son parça, mavi olanı, Kristal Mağara'nın derinliklerinde. Çatlak taşları Tombul kırabilir." },
    end: { p: 3, end: 1, t: "Üç parça birleşti ve gökkuşağı yeniden parladı! Adadaki herkes Pıtır ile Tombul'u alkışlıyor. Harika bir takımsınız!" }
  };
  let storyNext = null;
  function story(key, then) {
    const s = STORY[key]; SV.seen[key] = 1; save();
    drawStory($("storyCv"), s.p, s.end); $("storyTx").textContent = s.t; storyNext = then;
    hideAll(); $("story").hidden = false; state = "story"; $("storyGo").focus();
  }
  $("storyGo").onclick = () => { $("story").hidden = true; const f = storyNext; storyNext = null; f && f(); };

  /* ---------- akış ---------- */
  function hideAll() { ["title", "story", "levels", "done"].forEach((i) => $(i).hidden = true); }
  function startLevel(i) {
    const L = LIST[i];
    if (L.li === 0 && !SV.seen["w" + L.wi]) { story("w" + L.wi, () => startLevel(i)); return; }
    hideAll(); state = "play"; inp[0] = {}; inp[1] = {}; loadLevel(i); updateSwap();
    if (document.activeElement && document.activeElement.blur) document.activeElement.blur();
  }
  function restart() { if (LV) { sfx.click(); startLevel(LV.i); } }
  function finishLevel() {
    state = "done"; updateSwap();
    const id = LV.id, prev = SV.stars[id]; SV.stars[id] = Math.max(prev || 0, got); save();
    $("doneTitle").textContent = ["Harika!", "Süper takım!", "Başardınız!", "Bravo!"][LV.i % 4];
    $("doneStars").innerHTML = "★".repeat(got) + "<i>" + "★".repeat(3 - got) + "</i>";
    $("doneTx").textContent = got === 3 ? "Bütün yıldızları buldunuz!" : "Bu bölümde " + (3 - got) + " yıldız daha saklı. İsterseniz tekrar deneyin!";
    const last = LV.i === LIST.length - 1, worldEnd = LV.li === LV.w.levels.length - 1;
    $("next").textContent = last ? "Son ▶" : "Sonraki ▶";
    $("done").hidden = false; $("next").focus();
    $("next").onclick = () => {
      if (worldEnd) { const key = last ? "end" : "w" + (LV.wi + 1); if (last) { story("end", () => openMap()); return; } SV.seen[key] = 0; }
      if (last) openMap(); else startLevel(LV.i + 1);
    };
  }
  $("again").onclick = () => startLevel(LV.i);
  $("toMap").onclick = () => openMap();
  function openMap() {
    state = "map"; hideAll(); updateSwap();
    const wl = $("worldList"); wl.innerHTML = "";
    let cur = LIST.findIndex((L, i) => unlocked(i) && SV.stars[L.id] == null); if (cur < 0) cur = -1;
    WORLDS.forEach((w, wi) => {
      const d = document.createElement("div"); d.className = "world"; d.style.setProperty("--c", w.color);
      const tot = w.levels.reduce((s, l, li) => s + (SV.stars[wi + "-" + li] || 0), 0);
      d.innerHTML = "<h3>" + (wi + 1) + ". " + w.name + "<small>★ " + tot + "/" + w.levels.length * 3 + "</small></h3>";
      const g = document.createElement("div"); g.className = "lvls";
      w.levels.forEach((l, li) => {
        const i = LIST.findIndex((L) => L.wi === wi && L.li === li), st = SV.stars[wi + "-" + li], b = document.createElement("button");
        b.type = "button"; b.className = "lvl" + (i === cur ? " cur" : ""); b.disabled = !unlocked(i);
        b.innerHTML = "<b>" + (wi + 1) + "-" + (li + 1) + "</b>" + l.name + "<span class='st'>" + (st == null ? (unlocked(i) ? "<i>★★★</i>" : "🔒") : "★".repeat(st) + "<i>" + "★".repeat(3 - st) + "</i>") + "</span>";
        b.onclick = () => { audio(); startLevel(i); };
        g.appendChild(b);
      });
      d.appendChild(g); wl.appendChild(d);
    });
    $("levels").hidden = false;
    const c = wl.querySelector(".lvl.cur") || wl.querySelector(".lvl:not(:disabled)"); if (c) c.focus();
  }
  $("toTitle").onclick = () => showTitle();
  $("menu").onclick = () => { audio(); if (state === "play" || state === "done") openMap(); };
  $("restart").onclick = () => { audio(); if (state === "play") restart(); };
  function showTitle() {
    state = "title"; hideAll(); $("title").hidden = false; updateSwap(); setMode(SV.mode);
    const c = $("heroes"), x = c.getContext("2d"); x.clearRect(0, 0, c.width, c.height); x.imageSmoothingEnabled = false;
    x.drawImage(sprite(0, "a"), 20, 22); x.save(); x.translate(76, 18); x.scale(-1, 1); x.drawImage(sprite(1, "a"), 0, 0); x.restore();
  }
  function setMode(m) {
    SV.mode = m; save(); $("m2").setAttribute("aria-pressed", m === 2); $("m1").setAttribute("aria-pressed", m === 1);
    $("keysTx").innerHTML = m === 2 ? "<b>Pıtır:</b> A D yürü, W zıpla · <b>Tombul:</b> ← → yürü, ↑ zıpla, ↓ fırlat/kır · Tablette iki tuş takımı" : "Oklar ya da WASD yürü/zıpla · <b>↓</b> fırlat/kır · <b>Tab</b> karakter değiştir";
    updateSwap();
  }
  $("m2").onclick = () => setMode(2); $("m1").onclick = () => setMode(1);
  $("play").onclick = () => { audio(); if (!SV.seen.intro) story("intro", () => openMap()); else openMap(); };
  const muteBtn = $("mute");
  function setMute(m) { muted = m; muteBtn.setAttribute("aria-pressed", m ? "true" : "false"); muteBtn.setAttribute("aria-label", m ? "Sesi aç" : "Sesi kapat"); if (master) master.gain.value = m ? 0 : 1; try { localStorage.setItem(SAVE + ":mute", m ? "1" : "0"); } catch (e) {} }
  setMute(muted); muteBtn.onclick = () => { audio(); setMute(!muted); };

  /* ---------- ipucu ---------- */
  let hintTimer = null;
  function showHint(t) { const h = $("hint"); h.textContent = t; h.hidden = false; h.classList.remove("fade"); clearTimeout(hintTimer); hintTimer = setTimeout(() => h.classList.add("fade"), 7000); }
  $("hint").addEventListener("pointerdown", () => $("hint").classList.add("fade"));

  /* ---------- ölçek ---------- */
  const stage = $("stage"), screen = $("screen");
  function fit() {
    const w = screen.clientWidth, h = screen.clientHeight; if (!w || !h) return;
    let sw = w, sh = w * H / W; if (sh > h) { sh = h; sw = h * W / H; }
    const k = sw / W; if (k > 1.5) { const ik = Math.floor(k * 2) / 2; if (ik / k > .88) { sw = W * ik; sh = H * ik; } }
    stage.style.width = Math.floor(sw) + "px"; stage.style.height = Math.floor(sh) + "px"; stage.style.setProperty("--fs", clamp(sw / 40, 11, 20).toFixed(1) + "px");
  }
  addEventListener("resize", fit); if (window.ResizeObserver) new ResizeObserver(fit).observe(screen); fit();

  /* ---------- döngü ---------- */
  let last = performance.now(), headless = false;
  function frame(t) { const dt = Math.min(.033, (t - last) / 1000); last = t; if (!headless) { update(dt); draw(); } requestAnimationFrame(frame); }
  requestAnimationFrame(frame);
  showTitle();

  window.__ga = {
    get state() { return state; }, get players() { return players; }, get crates() { return crates; }, get stars() { return stars; }, get got() { return got; }, get doorOpen() { return doorOpen; }, get map() { return map; }, get plats() { return plats; }, get winT() { return winT; }, get LV() { return LV; }, SV, LIST, inp,
    setHeadless(v) { headless = v; }, startLevel, openMap, draw,
    step(n, keys, dt) { dt = dt || 1 / 60; for (let i = 0; i < n; i++) { for (const p of [0, 1]) { const k = (keys && keys[p]) || {}; for (const a of ["left", "right", "jump", "act"]) { if (k[a] && !inp[p][a]) inp[p][a + "P"] = true; inp[p][a] = !!k[a]; } } update(dt); } inp[0] = {}; inp[1] = {}; },
    tap(p, a) { inp[p][a + "P"] = true; inp[p][a] = true; update(1 / 60); inp[p][a] = false; }
  };
})();
