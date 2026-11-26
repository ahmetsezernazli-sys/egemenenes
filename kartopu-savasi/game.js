/* Kartopu Savaşı — iki kişilik ortak kar savaşı */
(function () {
  "use strict";
  const W = 960, H = 600, TOP = 44;
  const $ = (id) => document.getElementById(id);
  const cv = $("cv"); let ctx = cv.getContext("2d");
  const SAVE = "kartopu-savasi";
  const rnd = (a, b) => a + Math.random() * (b - a);
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const pick = (a) => a[Math.floor(Math.random() * a.length)];
  const OL = "#1E3A5A";

  /* ---------- bölümler ---------- */
  const LEVELS = [
    { name: "Karlı Park", theme: "park", walls: [[300, 300, 90, 26], [600, 200, 26, 90], [620, 430, 110, 26]], trees: [[150, 130], [820, 140], [470, 520], [880, 520]], waves: [[["kucuk", 3]], [["kucuk", 3], ["normal", 2]], [["normal", 4]]] },
    { name: "Buz Gölü", theme: "ice", ice: [260, 170, 440, 290], walls: [[160, 150, 26, 100], [770, 360, 26, 100]], trees: [[100, 520], [880, 110]], waves: [[["kucuk", 4]], [["normal", 3], ["kucuk", 2]], [["normal", 3], ["atici", 1]], [["kucuk", 6]]] },
    { name: "Çam Ormanı", theme: "forest", walls: [[440, 280, 80, 26]], trees: [[220, 170], [330, 420], [560, 150], [660, 330], [790, 470], [820, 210], [150, 440], [480, 520], [700, 90]], waves: [[["atici", 2], ["kucuk", 2]], [["normal", 3], ["atici", 2]], [["iri", 1], ["kucuk", 3]], [["atici", 3], ["normal", 2]]] },
    { name: "Dev Kardan Adam", theme: "park", boss: "dev", walls: [[250, 260, 26, 110], [690, 260, 26, 110], [430, 460, 100, 26]], trees: [[120, 120], [840, 120]], waves: [[["boss", 1]]] },
    { name: "Köy Meydanı", theme: "village", walls: [[220, 200, 110, 26], [630, 200, 110, 26], [220, 420, 110, 26], [630, 420, 110, 26]], trees: [[480, 310]], waves: [[["normal", 4]], [["iri", 2], ["kucuk", 2]], [["atici", 3], ["normal", 3]], [["iri", 2], ["atici", 2], ["kucuk", 3]]] },
    { name: "Kar Fırtınası", theme: "storm", wind: 60, walls: [[350, 160, 26, 110], [600, 330, 26, 110]], trees: [[180, 460], [800, 140], [520, 520]], waves: [[["kucuk", 5]], [["normal", 4], ["atici", 1]], [["iri", 2], ["normal", 2]], [["kucuk", 4], ["atici", 3]], [["iri", 3]]] },
    { name: "Dağ Zirvesi", theme: "peak", ice: [380, 120, 220, 140], walls: [[200, 300, 100, 26], [680, 280, 100, 26], [450, 440, 26, 90]], trees: [[110, 140], [870, 470], [300, 520]], waves: [[["normal", 5]], [["kucuk", 6], ["atici", 2]], [["iri", 2], ["atici", 3]], [["normal", 4], ["iri", 2], ["kucuk", 3]], [["atici", 4], ["iri", 2]]] },
    { name: "Buz Kralı", theme: "castle", boss: "kral", walls: [[230, 220, 26, 120], [720, 220, 26, 120], [400, 470, 160, 26]], trees: [], waves: [[["boss", 1]]] }
  ];
  const EN = {
    kucuk: { hp: 2, sp: 88, range: 110, cd: 1.6, dmg: .13, r: 14 },
    normal: { hp: 3, sp: 56, range: 240, cd: 2.2, dmg: .18, r: 17 },
    atici: { hp: 3, sp: 46, range: 370, cd: 2.4, dmg: .2, r: 17, keep: 1 },
    iri: { hp: 9, sp: 32, range: 180, cd: 2.8, dmg: .3, r: 25, big: 1 },
    dev: { hp: 70, sp: 24, range: 520, cd: 2.6, dmg: .22, r: 46, boss: 1 },
    kral: { hp: 140, sp: 30, range: 560, cd: 2.2, dmg: .22, r: 44, boss: 1 }
  };

  /* ---------- ses ---------- */
  let ac = null, master = null, mg = null, muted = false;
  try { muted = localStorage.getItem(SAVE + ":mute") === "1"; } catch (e) {}
  function audio() { if (!ac) { const C = window.AudioContext || window.webkitAudioContext; if (!C) return; ac = new C(); master = ac.createGain(); master.gain.value = muted ? 0 : 1; master.connect(ac.destination); mg = ac.createGain(); mg.gain.value = .35; mg.connect(master); } if (ac.state === "suspended") ac.resume(); }
  let sN = 0; setInterval(() => sN = 0, 80);
  function tone(f, d, type, vol, when, slide, dest) { if (!ac || muted || fast || sN++ > 10) return; const t = when || ac.currentTime, o = ac.createOscillator(), g = ac.createGain(); o.type = type || "triangle"; o.frequency.setValueAtTime(f, t); if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(30, slide), t + d); g.gain.setValueAtTime(.0001, t); g.gain.linearRampToValueAtTime(vol || .1, t + .01); g.gain.exponentialRampToValueAtTime(.0008, t + d); o.connect(g); g.connect(dest || master); o.start(t); o.stop(t + d + .02); }
  let nb = null;
  function noise(d, vol, freq, q) { if (!ac || muted || fast) return; if (!nb) { nb = ac.createBuffer(1, ac.sampleRate, ac.sampleRate); const c = nb.getChannelData(0); for (let i = 0; i < c.length; i++) c[i] = Math.random() * 2 - 1; } const s = ac.createBufferSource(), f = ac.createBiquadFilter(), g = ac.createGain(), t = ac.currentTime; s.buffer = nb; f.type = "bandpass"; f.frequency.value = freq || 1500; f.Q.value = q || 1; g.gain.setValueAtTime(vol || .1, t); g.gain.exponentialRampToValueAtTime(.001, t + d); s.connect(f); f.connect(g); g.connect(master); s.start(t); s.stop(t + d); }
  const now = () => ac ? ac.currentTime : 0;
  const sfx = {
    throw() { noise(.1, .08, 2600, 2); }, splat() { noise(.12, .14, 900); }, hit() { noise(.1, .16, 600); tone(300, .1, "sine", .06, 0, 150); },
    ouch() { tone(520, .15, "triangle", .08, 0, 300); }, freeze() { const t = now(); [1600, 1300, 1000].forEach((f, i) => tone(f, .25, "sine", .06, t + i * .08)); noise(.3, .06, 7000, 3); },
    thaw() { const t = now(); [784, 988, 1175].forEach((f, i) => tone(f, .14, "triangle", .08, t + i * .06)); }, break() { noise(.35, .2, 400); tone(160, .25, "square", .05, 0, 70); },
    scoop() { noise(.05, .04, 3000); }, pickup() { const t = now(); [880, 1175, 1568].forEach((f, i) => tone(f, .12, "square", .04, t + i * .05)); },
    wave() { const t = now(); tone(392, .2, "square", .05, t); tone(523, .3, "square", .05, t + .15); }, roar() { tone(110, .8, "sawtooth", .1, 0, 60); noise(.6, .14, 300); },
    win() { const t = now(); [[523, 0], [659, .14], [784, .28], [1047, .42], [880, .64], [1047, .78], [1319, .98]].forEach(([f, d]) => { tone(f, .3, "triangle", .12, t + d); tone(f / 2, .3, "sine", .05, t + d); }); }, lose() { const t = now(); [523, 440, 349, 262].forEach((f, i) => tone(f, .3, "triangle", .1, t + i * .22)); }
  };
  const mf = (m) => 440 * Math.pow(2, (m - 69) / 12);
  const SONG = { bpm: 138, lead: [76, 0, 76, 0, 76, 0, 0, 0, 76, 0, 76, 0, 76, 0, 0, 0, 76, 0, 79, 0, 72, 0, 74, 0, 76, 0, 0, 0, 0, 0, 0, 0, 77, 0, 77, 0, 77, 0, 77, 0, 77, 0, 76, 0, 76, 0, 76, 76, 76, 0, 74, 0, 74, 0, 76, 0, 74, 0, 0, 0, 79, 0, 0, 0], bass: [48, 0, 55, 0, 48, 0, 55, 0, 48, 0, 55, 0, 48, 0, 55, 0, 48, 0, 55, 0, 53, 0, 55, 0, 48, 0, 55, 0, 48, 0, 55, 0, 53, 0, 60, 0, 53, 0, 60, 0, 48, 0, 55, 0, 48, 0, 55, 0, 50, 0, 57, 0, 55, 0, 50, 0, 55, 0, 55, 0, 43, 0, 47, 0] };
  let mStep = 0, mNext = 0;
  setInterval(() => { if (!ac || muted || state !== "play" || paused) { if (ac) mNext = Math.max(mNext, ac.currentTime); return; } const d = 60 / SONG.bpm / 2; if (mNext < ac.currentTime) mNext = ac.currentTime + .05; while (mNext < ac.currentTime + .3) { const i = mStep % SONG.lead.length; if (SONG.lead[i]) { tone(mf(SONG.lead[i]), d * 1.1, "square", .02, mNext, 0, mg); tone(mf(SONG.lead[i] + 12), d * .5, "sine", .02, mNext, 0, mg); } if (SONG.bass[i]) tone(mf(SONG.bass[i]), d * .9, "triangle", .06, mNext, 0, mg); if (i % 4 === 0) { tone(2400, .03, "square", .01, mNext, 0, mg); } mStep++; mNext += d; } }, 90);

  /* ---------- kayıt ve ayar ---------- */
  let SV = { stars: [], n1: "Egemen", n2: "Enes", e1: true, e2: false, c2: false };
  try { const s = JSON.parse(localStorage.getItem(SAVE) || "null"); if (s && s.stars) SV = Object.assign(SV, s); } catch (e) {}
  const saveSV = () => { try { localStorage.setItem(SAVE, JSON.stringify(SV)); } catch (e) {} };

  /* ---------- durum ---------- */
  let LV = null, li = 0, P = [], en = [], balls = [], walls = [], trees = [], pick_ = [], parts = [], floaters = [], waveI = 0, waveT = 0, state = "title", paused = false, fast = false, clock = 0, freezes = 0, bgCv = null, decal = null, banner = null, shake = 0, snow = [], endT = 0;
  for (let i = 0; i < 120; i++) snow.push({ x: rnd(0, W), y: rnd(0, H), s: rnd(1, 3), v: rnd(20, 50), ph: rnd(0, 6) });
  function mkPlayer(i) { return { i, x: 120 + i * 70, y: 470 - i * 30, vx: 0, vy: 0, fx: 1, fy: 0, ammo: 6, rg: 0, cd: 0, fr: 0, frozen: 0, thaw: 0, big: 0, fastT: 0, thr: 0, walk: 0, hitT: 0, easy: i === 0 ? SV.e1 : SV.e2, cpu: i === 1 && SV.c2, name: i ? SV.n2 : SV.n1 }; }
  function loadLevel(i) {
    li = i; LV = LEVELS[i]; P = [mkPlayer(0), mkPlayer(1)]; en = []; balls = []; pick_ = []; parts = []; floaters = []; waveI = 0; waveT = 1.5; freezes = 0; paused = false; endT = 0;
    walls = LV.walls.map(([x, y, w, h]) => ({ x, y, w, h, hp: 10 })); trees = LV.trees.map(([x, y]) => ({ x, y, r: 22 }));
    bgCv = renderBg(); decal = document.createElement("canvas"); decal.width = W; decal.height = H;
    state = "play"; banner = { text: LV.name, sub: LV.boss ? "Boss savaşı!" : LV.waves.length + " dalga", t: 2.2 };
    $("who1").textContent = SV.n1; $("who2").textContent = SV.c2 ? "🤖 " + SV.n2 : SV.n2;
  }
  function spawnWave() {
    const wv = LV.waves[waveI]; waveI++; sfx.wave();
    if (!LV.boss) banner = { text: "Dalga " + waveI + " / " + LV.waves.length, t: 1.4 };
    let k = 0;
    for (const [type, n] of wv) for (let j = 0; j < n; j++) {
      const t = type === "boss" ? LV.boss : type, d = EN[t];
      const side = k++ % 3; let x, y; if (d.boss) { x = 760; y = 200; } else if (side === 0) { x = W + 30; y = rnd(TOP + 60, H - 60); } else if (side === 1) { x = rnd(W * .45, W - 60); y = TOP - 20; } else { x = rnd(W * .5, W - 80); y = H + 30; }
      en.push({ type: t, x, y, hp: d.hp, max: d.hp, cd: rnd(1, 2.5), t: rnd(0, 6), hurt: 0, face: -1, enter: 1.2, sum: 6, roll: 4 });
      if (d.boss) { sfx.roar(); banner = { text: t === "dev" ? "DEV KARDAN ADAM!" : "BUZ KRALI!", sub: "Hep birlikte vurun!", t: 2.4 }; }
    }
  }

  /* ---------- girdi ---------- */
  const keys = {}, stickV = [{ x: 0, y: 0 }, { x: 0, y: 0 }], throwP = [0, 0];
  const K1 = { KeyW: "u", KeyS: "d", KeyA: "l", KeyD: "r" }, K2 = { ArrowUp: "u", ArrowDown: "d", ArrowLeft: "l", ArrowRight: "r" };
  addEventListener("keydown", (e) => {
    if (e.target && e.target.tagName === "INPUT") return; if (state !== "play") return;
    if (e.code === "Escape" || e.code === "KeyP") { paused = !paused; return; }
    if (K1[e.code]) { keys["0" + K1[e.code]] = true; e.preventDefault(); }
    if (K2[e.code]) { keys[(SV.c2 ? "0" : "1") + K2[e.code]] = true; e.preventDefault(); }
    if (!e.repeat && (e.code === "KeyF" || e.code === "Space" || e.code === "KeyE")) { throwP[0]++; e.preventDefault(); }
    if (!e.repeat && (e.code === "Enter" || e.code === "KeyL" || e.code === "Period" || e.code === "NumpadEnter" || e.code === "Numpad0")) { throwP[SV.c2 ? 0 : 1]++; e.preventDefault(); }
  });
  addEventListener("keyup", (e) => { if (K1[e.code]) keys["0" + K1[e.code]] = false; if (K2[e.code]) { keys["1" + K2[e.code]] = false; keys["0" + K2[e.code]] = false; } });
  addEventListener("blur", () => { for (const k in keys) keys[k] = false; });
  document.querySelectorAll(".stick").forEach((el) => {
    const pad = +el.dataset.p, knob = el.querySelector("span"); let pid = null;
    const set = (e) => { const r = el.getBoundingClientRect(), cx = r.left + r.width / 2, cy = r.top + r.height / 2; let dx = e.clientX - cx, dy = e.clientY - cy; const L = Math.hypot(dx, dy), mx = r.width * .36; if (L > mx) { dx = dx / L * mx; dy = dy / L * mx; } knob.style.transform = "translate(" + dx + "px," + dy + "px)"; const k = Math.min(1, L / mx); stickV[pad] = L > 8 ? { x: dx / (L || 1) * k, y: dy / (L || 1) * k } : { x: 0, y: 0 }; };
    el.addEventListener("pointerdown", (e) => { e.preventDefault(); audio(); pid = e.pointerId; try { el.setPointerCapture(pid); } catch (x) {} set(e); });
    el.addEventListener("pointermove", (e) => { if (e.pointerId === pid) set(e); });
    const end = (e) => { if (e.pointerId !== pid) return; pid = null; knob.style.transform = ""; stickV[pad] = { x: 0, y: 0 }; }; el.addEventListener("pointerup", end); el.addEventListener("pointercancel", end);
  });
  document.querySelectorAll(".pad .k").forEach((b) => { const p = +b.dataset.p; b.addEventListener("pointerdown", (e) => { e.preventDefault(); audio(); b.classList.add("on"); if (state === "play") { if (paused) paused = false; else throwP[SV.c2 ? 0 : p]++; } }); const off = () => b.classList.remove("on"); b.addEventListener("pointerup", off); b.addEventListener("pointercancel", off); });

  /* ---------- çarpışma ---------- */
  function blockedCircle(x, y, r) {
    if (x < r || x > W - r || y < TOP + r || y > H - r) return true;
    for (const w of walls) { const cx = clamp(x, w.x, w.x + w.w), cy = clamp(y, w.y, w.y + w.h); if (Math.hypot(x - cx, y - cy) < r) return true; }
    for (const t of trees) if (Math.hypot(x - t.x, y - t.y) < r + t.r * .6) return true;
    return false;
  }
  function moveC(o, dx, dy, r, free) { const nx = o.x + dx, ny = o.y + dy; if (free) { o.x = nx; o.y = ny; return; } if (!blockedCircle(nx, o.y, r)) o.x = nx; else o.vx = 0; if (!blockedCircle(o.x, ny, r)) o.y = ny; else o.vy = 0; }
  const onIce = (x, y) => LV.ice && x > LV.ice[0] && x < LV.ice[0] + LV.ice[2] && y > LV.ice[1] && y < LV.ice[1] + LV.ice[3];

  /* ---------- atış ---------- */
  function aimFor(p) {
    let best = null, bs = 1e9;
    for (const e of en) { if (e.enter > 0) continue; const dx = e.x - p.x, dy = e.y - p.y, d = Math.hypot(dx, dy); if (d > 470) continue; const dot = (dx * p.fx + dy * p.fy) / (d || 1); const s = d * (1.7 - dot); if (s < bs) { bs = s; best = e; } }
    if (best) { const lead = Math.hypot(best.x - p.x, best.y - p.y) / 520; const ed = EN[best.type]; const tx = best.x + (best.vx || 0) * lead, ty = best.y + (best.vy || 0) * lead; void ed; const d = Math.hypot(tx - p.x, ty - p.y) || 1; return { x: (tx - p.x) / d, y: (ty - p.y) / d }; }
    return { x: p.fx, y: p.fy };
  }
  function throwBall(p) {
    if (p.frozen || p.cd > 0) return;
    if (p.ammo <= 0) { floaters.push({ x: p.x, y: p.y - 50, text: "Kar topla! (dur)", col: "#2E6AA8", t: 0 }); sfx.scoop(); return; }
    const a = aimFor(p); p.ammo--; p.cd = p.fastT > 0 ? .14 : .28; p.thr = .2; p.fx = a.x; p.fy = a.y;
    const big = p.big > 0; if (big) p.big--;
    balls.push({ x: p.x + a.x * 20, y: p.y + a.y * 20 - 4, vx: a.x * 520, vy: a.y * 520, z: 18, vz: 90, own: "p", dmg: big ? 3 : 1, big, r: big ? 11 : 6, life: 1.2, pi: p.i });
    sfx.throw();
  }
  function enemyThrow(e, tx, ty, spread, n, spd) {
    const d = EN[e.type], base = Math.atan2(ty - e.y, tx - e.x);
    for (let k = 0; k < (n || 1); k++) { const a = base + ((n || 1) > 1 ? (k - (n - 1) / 2) * spread : rnd(-.08, .08)); const s = spd || (d.big ? 300 : 360); balls.push({ x: e.x + Math.cos(a) * d.r, y: e.y + Math.sin(a) * d.r - d.r * .6, vx: Math.cos(a) * s, vy: Math.sin(a) * s, z: d.r * 1.2, vz: 80, own: "e", dmg: d.dmg, big: d.big || d.boss, r: d.big || d.boss ? 10 : 6, life: 2.2 }); }
    sfx.throw();
  }

  /* ---------- güncelleme ---------- */
  function update(dt) {
    clock += dt; shake = Math.max(0, shake - dt);
    for (const s of snow) { s.y += s.v * dt; s.x += Math.sin(clock + s.ph) * 10 * dt + (LV && LV.wind ? LV.wind * .8 * dt : 0); if (s.y > H) { s.y = -5; s.x = rnd(0, W); } if (s.x > W) s.x -= W; }
    for (const p of parts) { p.life -= dt; p.x += p.vx * dt; p.y += p.vy * dt; p.vy += (p.g || 0) * dt; } parts = parts.filter((p) => p.life > 0);
    for (const f of floaters) f.t += dt; floaters = floaters.filter((f) => f.t < 1.2);
    if (banner) { banner.t -= dt; if (banner.t <= 0) banner = null; }
    if (state !== "play" || paused) return;
    if (endT) { endT -= dt; if (endT <= 0) finish(); return; }
    // dalgalar
    if (!en.length) { if (waveI >= LV.waves.length) { win(); return; } waveT -= dt; if (waveT <= 0) { spawnWave(); waveT = 2.5; } }
    // oyuncular
    for (const p of P) updPlayer(p, dt);
    if (P[0].frozen && P[1].frozen) { lose(); return; }
    // düşmanlar
    for (const e of en) updEnemy(e, dt);
    en = en.filter((e) => !e.dead);
    // kartopları
    for (const b of balls) {
      b.life -= dt; b.vx += (LV.wind || 0) * dt * (b.own === "e" ? .6 : .4); b.x += b.vx * dt; b.y += b.vy * dt; b.z += b.vz * dt; b.vz -= 260 * dt; if (b.z < 4) b.z = 4;
      if (b.life <= 0) { splat(b.x, b.y, b.big); b.done = 1; continue; }
      for (const w of walls) if (b.x > w.x - 2 && b.x < w.x + w.w + 2 && b.y > w.y - 2 && b.y < w.y + w.h + 2) { b.done = 1; splat(b.x, b.y, b.big); w.hp -= b.dmg; if (w.hp <= 0) breakWall(w); break; }
      if (b.done) continue;
      for (const t of trees) if (Math.hypot(b.x - t.x, b.y - t.y) < t.r * .7) { b.done = 1; splat(b.x, b.y, b.big); break; }
      if (b.done) continue;
      if (b.x < -20 || b.x > W + 20 || b.y < TOP - 20 || b.y > H + 20) { b.done = 1; continue; }
      if (b.own === "p") { for (const e of en) { const d = EN[e.type]; if (e.enter > 0) continue; if (Math.hypot(b.x - e.x, b.y - (e.y - d.r * .5)) < d.r + b.r) { b.done = 1; hitEnemy(e, b.dmg); if (b.big) { for (const o of en) if (o !== e && Math.hypot(o.x - e.x, o.y - e.y) < 60) hitEnemy(o, 1); boomFx(b.x, b.y); } splat(b.x, b.y, b.big); break; } } }
      else for (const p of P) { if (p.frozen) continue; if (Math.hypot(b.x - p.x, b.y - (p.y - 10)) < 16 + b.r) { b.done = 1; hitPlayer(p, b.dmg); splat(b.x, b.y, b.big); break; } }
    }
    balls = balls.filter((b) => !b.done);
    // bonuslar
    for (const k of pick_) { k.t += dt; for (const p of P) if (!p.frozen && Math.hypot(p.x - k.x, p.y - k.y) < 28) { k.got = 1; takePickup(p, k); } }
    pick_ = pick_.filter((k) => !k.got && k.t < 14);
  }
  function updPlayer(p, dt) {
    p.cd = Math.max(0, p.cd - dt); p.thr = Math.max(0, p.thr - dt); p.hitT = Math.max(0, p.hitT - dt); p.fastT = Math.max(0, p.fastT - dt);
    if (p.frozen) {
      p.frozen -= dt; const o = P[1 - p.i];
      if (!o.frozen && Math.hypot(o.x - p.x, o.y - p.y) < 50) { p.thaw += dt; if (Math.random() < .3) parts.push({ x: p.x + rnd(-14, 14), y: p.y - rnd(0, 30), vx: 0, vy: -30, life: .5, c: "#FFD23F", s: 3 }); if (p.thaw >= .8) unfreeze(p); } else p.thaw = Math.max(0, p.thaw - dt);
      if (p.frozen <= 0) unfreeze(p);
      throwP[p.i] = 0; return;
    }
    let ix = 0, iy = 0;
    if (p.cpu) { const c = cpuThink(p, dt); ix = c.x; iy = c.y; }
    else { const k = p.i; ix = (keys[k + "r"] ? 1 : 0) - (keys[k + "l"] ? 1 : 0) + stickV[SV.c2 ? 0 : p.i].x + (SV.c2 ? stickV[1].x : 0); iy = (keys[k + "d"] ? 1 : 0) - (keys[k + "u"] ? 1 : 0) + stickV[SV.c2 ? 0 : p.i].y + (SV.c2 ? stickV[1].y : 0); }
    const L = Math.hypot(ix, iy); if (L > 1) { ix /= L; iy /= L; }
    if (L > .15) { p.fx = ix; p.fy = iy; }
    const sp = 195, ice = onIce(p.x, p.y), acc = ice ? 1.6 : 14;
    p.vx += (ix * sp - p.vx) * Math.min(1, dt * acc); p.vy += (iy * sp - p.vy) * Math.min(1, dt * acc);
    moveC(p, p.vx * dt, p.vy * dt, 15);
    const moving = Math.hypot(p.vx, p.vy) > 25; p.walk += moving ? dt * 10 : 0;
    if (moving && Math.random() < dt * 8) footprint(p.x, p.y + 12);
    // kar toplama
    if (!moving && p.ammo < 6) { p.rg += dt * (p.easy ? 3.6 : 2.6) * (p.fastT > 0 ? 2 : 1); if (p.rg >= 1) { p.rg = 0; p.ammo++; sfx.scoop(); for (let k = 0; k < 3; k++) parts.push({ x: p.x + rnd(-10, 10), y: p.y + 14, vx: rnd(-20, 20), vy: -rnd(20, 50), life: .4, c: "#fff", s: 3, g: 120 }); } } else p.rg = Math.max(0, p.rg - dt);
    for (let k = 0; k < throwP[p.i]; k++) throwBall(p); throwP[p.i] = 0;
    if (p.cpu) { /* cpuThink atış yaptı */ }
  }
  function cpuThink(p, dt) {
    const o = P[1 - p.i]; p.ai = p.ai || { t: 0, tx: p.x, ty: p.y };
    if (o.frozen) { const d = Math.hypot(o.x - p.x, o.y - p.y); return d > 30 ? { x: (o.x - p.x) / d, y: (o.y - p.y) / d } : { x: 0, y: 0 }; }
    let near = null, nd = 1e9; for (const e of en) { if (e.enter > 0) continue; const d = Math.hypot(e.x - p.x, e.y - p.y); if (d < nd) { nd = d; near = e; } }
    if (p.ammo === 0 || (p.ammo < 3 && (!near || nd > 300))) return { x: 0, y: 0 };
    if (near) { if (nd < 420 && p.cd <= 0 && Math.random() < dt * 3.2) throwP[p.i]++; const want = 240, dx = near.x - p.x, dy = near.y - p.y; let mx = 0, my = 0; if (nd > want + 40) { mx = dx / nd; my = dy / nd; } else if (nd < want - 60) { mx = -dx / nd; my = -dy / nd; } p.ai.t -= dt; if (p.ai.t <= 0) { p.ai.t = rnd(.6, 1.4); p.ai.sx = rnd(-1, 1); } mx += -dy / nd * (p.ai.sx || 0) * .6; my += dx / nd * (p.ai.sx || 0) * .6; p.fx = dx / nd; p.fy = dy / nd; return { x: mx, y: my }; }
    const d = Math.hypot(o.x + 60 - p.x, o.y - p.y); return d > 50 ? { x: (o.x + 60 - p.x) / d, y: (o.y - p.y) / d } : { x: 0, y: 0 };
  }
  function updEnemy(e, dt) {
    const d = EN[e.type]; e.t += dt; e.hurt = Math.max(0, e.hurt - dt);
    const tgts = P.filter((p) => !p.frozen); if (!tgts.length) return;
    let tg = tgts[0], td = 1e9; for (const p of tgts) { const dd = Math.hypot(p.x - e.x, p.y - e.y); if (dd < td) { td = dd; tg = p; } }
    if (e.enter > 0) { e.enter -= dt; const tx = clamp(e.x, 60, W - 60), ty = clamp(e.y, TOP + 50, H - 50); e.x += (tx - e.x) * Math.min(1, dt * 2); e.y += (ty - e.y) * Math.min(1, dt * 2); return; }
    let mx = 0, my = 0; const dx = tg.x - e.x, dy = tg.y - e.y;
    const want = d.keep ? d.range * .8 : d.range * .6;
    if (td > want) { mx = dx / td; my = dy / td; } else if (d.keep && td < want - 80) { mx = -dx / td; my = -dy / td; }
    mx += Math.sin(e.t * 1.3 + e.x) * .4; my += Math.cos(e.t * 1.1) * .3;
    const hop = d.boss ? 1 : .55 + Math.abs(Math.sin(e.t * 5)) * .9;
    e.vx = mx * d.sp * hop; e.vy = my * d.sp * hop;
    moveC(e, e.vx * dt, e.vy * dt, d.r * .8);
    e.face = dx < 0 ? -1 : 1;
    e.cd -= dt;
    if (e.cd <= 0 && td < d.range) {
      e.cd = d.cd * rnd(.8, 1.2) * (P.some((p) => p.easy) ? 1.15 : 1);
      if (e.type === "dev") { enemyThrow(e, tg.x, tg.y, .26, e.hp < d.hp / 2 ? 5 : 3, 290); }
      else if (e.type === "kral") { const n = e.hp < d.hp / 2 ? 12 : 8; for (let k = 0; k < n; k++) { const a = k / n * Math.PI * 2 + e.t; balls.push({ x: e.x, y: e.y - 40, vx: Math.cos(a) * 250, vy: Math.sin(a) * 250, z: 40, vz: 60, own: "e", dmg: .18, r: 8, life: 2.4, ice: 1 }); } sfx.throw(); enemyThrow(e, tg.x, tg.y, 0, 1, 420); }
      else enemyThrow(e, tg.x, tg.y);
      e.thr = .25;
    }
    e.thr = Math.max(0, (e.thr || 0) - dt);
    if (e.type === "kral") { e.sum -= dt; if (e.sum <= 0 && en.length < 6) { e.sum = 7; for (let k = 0; k < 2; k++) en.push({ type: "kucuk", x: e.x + rnd(-60, 60), y: e.y + 60, hp: 2, max: 2, cd: 2, t: 0, hurt: 0, face: -1, enter: .6 }); floaters.push({ x: e.x, y: e.y - 110, text: "Askerlerim, saldırın!", col: "#fff", t: 0 }); } }
    if (e.type === "dev") { e.roll -= dt; if (e.roll <= 0) { e.roll = e.hp < d.hp / 2 ? 6 : 8; const a = Math.atan2(tg.y - e.y, tg.x - e.x); balls.push({ x: e.x, y: e.y, vx: Math.cos(a) * 200, vy: Math.sin(a) * 200, z: 14, vz: 0, own: "e", dmg: .28, r: 20, life: 3.5, big: 1, roll: 1 }); } }
    // temas
    for (const p of tgts) if (Math.hypot(p.x - e.x, p.y - e.y) < d.r + 14 && p.hitT <= 0) hitPlayer(p, d.boss ? .25 : .1);
  }
  function hitEnemy(e, dmg) {
    const d = EN[e.type]; e.hp -= dmg; e.hurt = .15; sfx.hit();
    for (let k = 0; k < 6; k++) parts.push({ x: e.x, y: e.y - d.r, vx: rnd(-80, 80), vy: rnd(-90, 10), life: .5, c: "#fff", s: 3, g: 300 });
    if (e.hp <= 0) {
      e.dead = 1; sfx.break(); shake = d.boss ? .6 : .08;
      for (let k = 0; k < (d.boss ? 50 : 16); k++) parts.push({ x: e.x + rnd(-d.r, d.r), y: e.y - rnd(0, d.r * 2), vx: rnd(-160, 160), vy: rnd(-220, -20), life: rnd(.6, 1.2), c: k % 5 === 0 ? "#FF8A2E" : k % 7 === 0 ? "#2A2A3A" : "#F4FAFF", s: rnd(3, 7), g: 500 });
      if (Math.random() < (d.big ? .5 : .14)) pick_.push({ x: e.x, y: e.y, k: pick(["kakao", "dev", "hizli", "kakao"]), t: 0 });
    }
  }
  function hitPlayer(p, dmg) {
    if (p.frozen) return; p.fr += dmg * (p.easy ? .6 : 1); p.hitT = .5; sfx.ouch(); shake = .1;
    if (p.fr >= 1) { p.fr = 1; p.frozen = 9; p.thaw = 0; freezes++; sfx.freeze(); floaters.push({ x: p.x, y: p.y - 60, text: "DONDU! " + (P[1 - p.i].frozen ? "" : P[1 - p.i].name + ", çöz onu!"), col: "#2E86DE", t: 0 }); }
  }
  function unfreeze(p) { p.frozen = 0; p.fr = .35; p.thaw = 0; p.hitT = 1; sfx.thaw(); for (let k = 0; k < 14; k++) parts.push({ x: p.x, y: p.y - 15, vx: rnd(-120, 120), vy: rnd(-150, 0), life: .6, c: "#BDE8FF", s: 4, g: 400 }); }
  function takePickup(p, k) {
    sfx.pickup();
    if (k.k === "kakao") { for (const q of P) { q.fr = Math.max(0, q.fr - .5); if (q.frozen) unfreeze(q); } floaters.push({ x: k.x, y: k.y - 30, text: "Sıcak kakao! Isındınız", col: "#C8743A", t: 0 }); }
    else if (k.k === "dev") { p.big = 3; floaters.push({ x: k.x, y: k.y - 30, text: "3 dev kartopu!", col: "#2E86DE", t: 0 }); }
    else { p.fastT = 8; p.ammo = 6; floaters.push({ x: k.x, y: k.y - 30, text: "Hızlı atış!", col: "#E8463F", t: 0 }); }
  }
  function breakWall(w) { walls.splice(walls.indexOf(w), 1); sfx.break(); for (let k = 0; k < 20; k++) parts.push({ x: w.x + rnd(0, w.w), y: w.y + rnd(0, w.h), vx: rnd(-80, 80), vy: rnd(-140, -20), life: .8, c: "#F4FAFF", s: rnd(4, 8), g: 400 }); }
  function splat(x, y, big) { sfx.splat(); for (let k = 0; k < (big ? 12 : 6); k++) parts.push({ x, y, vx: rnd(-70, 70), vy: rnd(-90, 0), life: .45, c: "#fff", s: rnd(2, 4), g: 300 }); if (decal) { const c = decal.getContext("2d"); c.fillStyle = "rgba(255,255,255,.85)"; c.beginPath(); c.arc(x, y + 6, big ? 10 : 6, 0, 7); c.fill(); } }
  function boomFx(x, y) { for (let k = 0; k < 18; k++) { const a = rnd(0, 7); parts.push({ x, y, vx: Math.cos(a) * 180, vy: Math.sin(a) * 180, life: .5, c: "#E6F6FF", s: 5 }); } }
  function footprint(x, y) { if (!decal) return; const c = decal.getContext("2d"); c.fillStyle = "rgba(140,180,220,.18)"; c.beginPath(); c.ellipse(x + rnd(-4, 4), y, 4, 2.5, 0, 0, 7); c.fill(); }
  function win() { state = "won"; endT = 0; sfx.win(); const st = freezes === 0 ? 3 : freezes <= 2 ? 2 : 1; SV.stars[li] = Math.max(SV.stars[li] || 0, st); saveSV(); for (let k = 0; k < 60; k++) parts.push({ x: rnd(0, W), y: rnd(-40, 0), vx: rnd(-30, 30), vy: rnd(80, 200), life: 3, c: pick(["#E8463F", "#FFD23F", "#2E86DE", "#3FA34D", "#fff"]), s: 5 }); setTimeoutF(() => showEnd(true, st), 1600); }
  function lose() { state = "lost"; sfx.lose(); setTimeoutF(() => showEnd(false, 0), 1400); }
  function setTimeoutF(f, ms) { if (fast) f(); else setTimeout(f, ms); }
  function finish() {}
  function showEnd(won, st) {
    $("endTitle").textContent = won ? (LV.boss ? "Boss yenildi!" : "Bölüm kazanıldı!") : "İkiniz de dondunuz!";
    $("endStars").innerHTML = won ? "★".repeat(st) + "<i>" + "★".repeat(3 - st) + "</i>" : "<i>★★★</i>";
    $("endTx").textContent = won ? (freezes === 0 ? "Hiç donmadınız! Mükemmel takım!" : "Donma sayısı: " + freezes + "\n3 yıldız için hiç donmayın.") : "İpucu: Kale duvarlarının arkasına saklanın, kartopu bitince durun ve toplayın. Donan arkadaşınızın yanına koşun!";
    $("endNext").hidden = !won || li >= LEVELS.length - 1; $("end").hidden = false;
  }

  /* ---------- arka plan ---------- */
  function renderBg() {
    const c = document.createElement("canvas"); c.width = W; c.height = H; const x = c.getContext("2d"), th = LV.theme;
    const g = x.createLinearGradient(0, 0, 0, H); g.addColorStop(0, th === "castle" ? "#D8E4F8" : th === "storm" ? "#DCE6F0" : "#F4FAFF"); g.addColorStop(1, th === "castle" ? "#B8CCE8" : "#DCEBF8"); x.fillStyle = g; x.fillRect(0, 0, W, H);
    for (let i = 0; i < 700; i++) { x.fillStyle = Math.random() < .5 ? "rgba(150,190,230,.18)" : "rgba(255,255,255,.9)"; x.beginPath(); x.ellipse(Math.random() * W, Math.random() * H, rnd(2, 12), rnd(1, 4), 0, 0, 7); x.fill(); }
    for (let i = 0; i < 18; i++) { x.fillStyle = "rgba(130,170,215,.14)"; x.beginPath(); x.ellipse(rnd(0, W), rnd(TOP, H), rnd(40, 120), rnd(16, 40), 0, 0, 7); x.fill(); }
    if (LV.ice) { const [ix, iy, iw, ih] = LV.ice; const ig = x.createLinearGradient(ix, iy, ix + iw, iy + ih); ig.addColorStop(0, "#BDE8FF"); ig.addColorStop(1, "#8FC8F0"); x.fillStyle = ig; x.beginPath(); x.ellipse(ix + iw / 2, iy + ih / 2, iw / 2, ih / 2, 0, 0, 7); x.fill(); x.strokeStyle = "#E6F6FF"; x.lineWidth = 6; x.stroke(); x.strokeStyle = "rgba(255,255,255,.7)"; x.lineWidth = 2; for (let k = 0; k < 8; k++) { x.beginPath(); const sx = ix + rnd(.2, .8) * iw, sy = iy + rnd(.2, .8) * ih; x.moveTo(sx, sy); x.lineTo(sx + rnd(-40, 40), sy + rnd(-20, 20)); x.stroke(); } }
    if (th === "park") { for (const [bx, by] of [[80, 300], [860, 330]]) { x.fillStyle = "#8A5A2B"; x.fillRect(bx - 26, by, 52, 8); x.fillRect(bx - 22, by + 8, 4, 12); x.fillRect(bx + 18, by + 8, 4, 12); x.fillStyle = "#fff"; x.fillRect(bx - 26, by - 4, 52, 5); } for (const [lx, ly] of [[260, 110], [700, 520]]) { x.fillStyle = "#3A3A44"; x.fillRect(lx - 2, ly - 50, 4, 50); x.fillStyle = "#FFE680"; x.beginPath(); x.arc(lx, ly - 54, 7, 0, 7); x.fill(); } }
    if (th === "village") { for (const [hx, hy, col] of [[60, 90, "#C8463F"], [900, 90, "#2E86DE"], [60, 560, "#3FA34D"], [900, 560, "#F2A516"]]) { x.fillStyle = "#E8D2A6"; x.fillRect(hx - 40, hy - 30, 80, 46); x.fillStyle = col; x.beginPath(); x.moveTo(hx - 50, hy - 30); x.lineTo(hx, hy - 66); x.lineTo(hx + 50, hy - 30); x.fill(); x.fillStyle = "#fff"; x.beginPath(); x.moveTo(hx - 50, hy - 30); x.lineTo(hx, hy - 66); x.lineTo(hx + 50, hy - 30); x.lineTo(hx + 40, hy - 26); x.lineTo(hx, hy - 58); x.lineTo(hx - 40, hy - 26); x.fill(); x.fillStyle = "#FFE680"; x.fillRect(hx - 12, hy - 18, 14, 12); } }
    if (th === "peak") { x.fillStyle = "rgba(120,140,170,.35)"; x.beginPath(); x.moveTo(0, TOP + 80); x.lineTo(120, TOP); x.lineTo(240, TOP + 70); x.lineTo(380, TOP); x.lineTo(500, TOP + 60); x.lineTo(660, TOP); x.lineTo(820, TOP + 70); x.lineTo(960, TOP + 10); x.lineTo(960, TOP); x.lineTo(0, TOP); x.fill(); }
    if (th === "castle") { x.fillStyle = "#9FC0E8"; x.fillRect(0, TOP, W, 40); for (let k = 0; k < 24; k++) { x.fillRect(k * 40, TOP + 40, 24, 14); } x.fillStyle = "#BDE0FF"; for (let k = 0; k < 6; k++) { x.beginPath(); x.moveTo(80 + k * 160, TOP + 40); x.lineTo(90 + k * 160, TOP); x.lineTo(100 + k * 160, TOP + 40); x.fill(); } }
    return c;
  }

  /* ---------- çizim ---------- */
  function circle(c, x, y, r, fill, lw) { c.beginPath(); c.arc(x, y, Math.max(.1, r), 0, Math.PI * 2); if (fill) { c.fillStyle = fill; c.fill(); } if (lw) { c.strokeStyle = OL; c.lineWidth = lw; c.stroke(); } }
  function ell(c, x, y, rx, ry, fill, lw) { c.beginPath(); c.ellipse(x, y, Math.max(.1, rx), Math.max(.1, ry), 0, 0, Math.PI * 2); if (fill) { c.fillStyle = fill; c.fill(); } if (lw) { c.strokeStyle = OL; c.lineWidth = lw; c.stroke(); } }
  const COAT = ["#E8463F", "#2E86DE"], HAT = ["#FFD23F", "#FF8A2E"];
  function drawKid(c, p, x, y) {
    const b = Math.abs(Math.sin(p.walk)) * 2.5, thr = p.thr > 0;
    c.save(); c.translate(x, y); c.scale(1.3, 1.3);
    c.globalAlpha = .22; ell(c, 0, 16, 16, 6, "#1E3A5A"); c.globalAlpha = 1;
    // ayaklar
    const lf = Math.sin(p.walk) * 4; ell(c, -6 + lf * .3, 13, 5, 4, "#3A2A2A"); ell(c, 6 - lf * .3, 13, 5, 4, "#3A2A2A");
    c.translate(0, -b);
    // atkı ucu
    c.strokeStyle = HAT[p.i]; c.lineWidth = 5; c.lineCap = "round"; c.beginPath(); c.moveTo(-4, -12); c.quadraticCurveTo(-14 - p.fx * 6, -6 + Math.sin(clock * 8) * 3, -18 - p.fx * 10, 0); c.stroke();
    // gövde
    ell(c, 0, 0, 14, 15, COAT[p.i], 2.2); c.fillStyle = "rgba(255,255,255,.25)"; c.fillRect(-1, -12, 2, 24);
    // kollar
    const ax = p.fx * 16, ay = p.fy * 10;
    c.strokeStyle = COAT[p.i]; c.lineWidth = 7; c.beginPath(); c.moveTo(-10, -4); c.lineTo(-14, 6); c.stroke();
    c.beginPath(); c.moveTo(10, -4); c.lineTo(thr ? 10 + ax * 1.2 : 13, thr ? -4 + ay * 1.2 - 6 : 6); c.stroke();
    circle(c, -14, 7, 4, "#5A4A4A"); circle(c, thr ? 10 + ax * 1.2 : 13, thr ? -10 + ay * 1.2 : 7, 4, "#5A4A4A");
    if (p.ammo > 0 && !thr) circle(c, 15, 4, 5, "#fff", 1.5);
    // kafa
    circle(c, 0, -18, 11, "#F3C49B", 2);
    if (p.fy > -.6) { circle(c, -4 + p.fx * 3, -18, 1.8, OL); circle(c, 4 + p.fx * 3, -18, 1.8, OL); c.globalAlpha = .5; circle(c, -7, -14, 2.5, "#FF7AA2"); circle(c, 7, -14, 2.5, "#FF7AA2"); c.globalAlpha = 1; c.strokeStyle = OL; c.lineWidth = 1.5; c.beginPath(); c.arc(p.fx * 3, -14, 3, .2 * Math.PI, .8 * Math.PI); c.stroke(); }
    // atkı
    c.fillStyle = HAT[p.i]; c.fillRect(-10, -10, 20, 5);
    // bere
    c.fillStyle = HAT[p.i]; c.beginPath(); c.arc(0, -21, 11, Math.PI, 0); c.closePath(); c.fill(); c.strokeStyle = OL; c.lineWidth = 2; c.stroke(); c.fillStyle = "#fff"; c.fillRect(-11, -22, 22, 4); circle(c, 0, -33, 4.5, "#fff", 1.5);
    c.restore();
    // donma
    if (p.frozen) { c.save(); c.globalAlpha = .7; c.fillStyle = "#BDE8FF"; c.strokeStyle = "#fff"; c.lineWidth = 3; c.beginPath(); c.roundRect ? c.roundRect(x - 28, y - 52, 56, 74, 10) : c.rect(x - 28, y - 52, 56, 74); c.fill(); c.stroke(); c.globalAlpha = .9; c.fillStyle = "#fff"; c.fillRect(x - 15, y - 34, 6, 20); c.restore(); if (p.thaw > 0) { c.strokeStyle = "#FFD23F"; c.lineWidth = 4; c.beginPath(); c.arc(x, y - 10, 34, -Math.PI / 2, -Math.PI / 2 + p.thaw / .8 * Math.PI * 2); c.stroke(); } }
    // durum çubukları
    const nx = x, ny = y - 66; c.fillStyle = "rgba(14,42,64,.6)"; c.fillRect(nx - 22, ny, 44, 5); c.fillStyle = p.fr > .7 ? "#2E86DE" : "#8FC8F0"; c.fillRect(nx - 22, ny, 44 * p.fr, 5);
    for (let k = 0; k < 6; k++) circle(c, nx - 20 + k * 8, ny - 7, 3, k < p.ammo ? "#fff" : "rgba(14,42,64,.25)", k < p.ammo ? 1 : 0);
    c.font = "700 12px Fredoka"; c.textAlign = "center"; c.fillStyle = COAT[p.i]; c.fillText(p.name + (p.big ? " 💪" + p.big : "") + (p.fastT > 0 ? " ⚡" : ""), nx, ny - 15);
  }
  function drawSnowman(c, e) {
    const d = EN[e.type], r = d.r, x = e.x, y = e.y, hop = d.boss ? 0 : Math.abs(Math.sin(e.t * 5)) * 5, h = e.hurt > 0;
    c.save(); c.translate(x, y);
    c.globalAlpha = .22; ell(c, 0, 4, r * 1.1, r * .4, "#1E3A5A"); c.globalAlpha = 1;
    if (e.enter > 0) c.globalAlpha = 1 - e.enter / 1.2 * .6;
    c.translate(0, -hop); const col = h ? "#DDE8F8" : e.type === "kral" ? "#E6F6FF" : "#F8FCFF";
    circle(c, 0, -r * .55, r, col, 2.2); c.fillStyle = "rgba(150,190,230,.35)"; c.beginPath(); c.arc(r * .25, -r * .45, r * .85, -.6, 1.6); c.fill();
    circle(c, 0, -r * 1.75, r * .72, col, 2.2); circle(c, 0, -r * 2.6, r * .55, col, 2.2);
    for (let k = 0; k < 3; k++) circle(c, 0, -r * 1.5 - k * r * .22, r * .07, "#2A2A3A");
    const f = e.face, ey = -r * 2.68;
    circle(c, -r * .18 + f * r * .12, ey, r * .07, "#2A2A3A"); circle(c, r * .18 + f * r * .12, ey, r * .07, "#2A2A3A");
    c.fillStyle = "#FF8A2E"; c.beginPath(); c.moveTo(f * r * .1, ey + r * .12); c.lineTo(f * r * .62, ey + r * .2); c.lineTo(f * r * .1, ey + r * .26); c.fill();
    c.strokeStyle = "#2A2A3A"; c.lineWidth = Math.max(1.5, r * .06); c.beginPath(); c.arc(f * r * .1, ey + r * .2, r * .22, .2 * Math.PI, .8 * Math.PI); c.stroke();
    // kollar
    const wave = Math.sin(e.t * 4) * .3, thr = e.thr > 0;
    c.strokeStyle = "#6E4A26"; c.lineWidth = Math.max(2.5, r * .1); c.lineCap = "round";
    c.beginPath(); c.moveTo(-r * .6, -r * 1.75); c.lineTo(-r * 1.4, -r * (2.1 + wave)); c.moveTo(-r * 1.15, -r * (2 + wave * .7)); c.lineTo(-r * 1.3, -r * (2.4 + wave)); c.stroke();
    c.beginPath(); c.moveTo(r * .6, -r * 1.75); c.lineTo(r * 1.4, -r * (thr ? 2.6 : 2.1 - wave)); c.stroke();
    // şapkalar
    const hy = -r * 3.05;
    if (e.type === "normal") { c.fillStyle = "#2A2A3A"; c.fillRect(-r * .55, hy, r * 1.1, r * .12); c.fillRect(-r * .38, hy - r * .55, r * .76, r * .58); c.fillStyle = "#E8463F"; c.fillRect(-r * .38, hy - r * .15, r * .76, r * .1); }
    else if (e.type === "atici") { c.fillStyle = "#3FA34D"; c.beginPath(); c.arc(0, hy + r * .12, r * .5, Math.PI, 0); c.fill(); circle(c, 0, hy - r * .4, r * .16, "#fff"); }
    else if (e.type === "kucuk") { c.fillStyle = "#B98CFF"; circle(c, -r * .52, -r * 2.6, r * .16, "#B98CFF"); circle(c, r * .52, -r * 2.6, r * .16, "#B98CFF"); c.strokeStyle = "#B98CFF"; c.lineWidth = 2; c.beginPath(); c.arc(0, -r * 2.6, r * .52, Math.PI, 0); c.stroke(); }
    else if (e.type === "iri") { c.fillStyle = "#8E8E9E"; c.beginPath(); c.moveTo(-r * .45, hy + r * .2); c.lineTo(-r * .35, hy - r * .45); c.lineTo(r * .35, hy - r * .45); c.lineTo(r * .45, hy + r * .2); c.closePath(); c.fill(); c.strokeStyle = OL; c.lineWidth = 1.5; c.stroke(); }
    else if (e.type === "dev") { c.fillStyle = "#2A2A3A"; c.fillRect(-r * .6, hy + r * .05, r * 1.2, r * .12); c.fillRect(-r * .42, hy - r * .6, r * .84, r * .66); c.fillStyle = "#3FA34D"; c.fillRect(-r * .42, hy - r * .1, r * .84, r * .1); c.fillStyle = "#E8463F"; c.fillRect(-r * .55, -r * 2.15, r * 1.1, r * .16); }
    else if (e.type === "kral") { c.fillStyle = "#7FD8F6"; c.beginPath(); c.moveTo(-r * .5, hy + r * .15); for (let k = 0; k < 5; k++) { c.lineTo(-r * .5 + k * r * .25, hy - r * (k % 2 ? .2 : .6)); } c.lineTo(r * .5, hy + r * .15); c.closePath(); c.fill(); c.strokeStyle = OL; c.lineWidth = 2; c.stroke(); circle(c, 0, hy - r * .2, r * .08, "#FF5AD9"); c.fillStyle = "rgba(127,216,246,.4)"; c.beginPath(); c.moveTo(-r * .9, -r * 1.5); c.lineTo(-r * 1.3, r * .4); c.lineTo(r * 1.3, r * .4); c.lineTo(r * .9, -r * 1.5); c.fill(); }
    c.restore();
    if ((d.big || d.boss) && e.hp < e.max) { const bw = d.boss ? 320 : 40, by = d.boss ? 54 : y - r * 3.4 - 6; const bxx = d.boss ? W / 2 : x; c.fillStyle = "rgba(14,42,64,.6)"; c.fillRect(bxx - bw / 2 - 2, by - 2, bw + 4, 9); c.fillStyle = "#E8463F"; c.fillRect(bxx - bw / 2, by, bw * e.hp / e.max, 5); }
  }
  function draw() {
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    if (!LV) { const g = ctx.createLinearGradient(0, 0, 0, H); g.addColorStop(0, "#5FA8E0"); g.addColorStop(1, "#EAF4FC"); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H); return; }
    const sx = shake > 0 ? rnd(-4, 4) : 0, sy = shake > 0 ? rnd(-4, 4) : 0; ctx.translate(sx, sy);
    ctx.drawImage(bgCv, 0, 0); ctx.drawImage(decal, 0, 0);
    // bonuslar
    for (const k of pick_) { const bob = Math.sin(clock * 4 + k.x) * 3, x = k.x, y = k.y - 10 + bob; circle(ctx, x, y, 15, "rgba(255,255,255,.8)", 2); if (k.k === "kakao") { ctx.fillStyle = "#fff"; ctx.fillRect(x - 7, y - 6, 14, 13); ctx.fillStyle = "#8A5A2B"; ctx.fillRect(x - 6, y - 5, 12, 4); ctx.strokeStyle = OL; ctx.lineWidth = 1.5; ctx.strokeRect(x - 7, y - 6, 14, 13); ctx.beginPath(); ctx.arc(x + 9, y, 3, -1.5, 1.5); ctx.stroke(); } else if (k.k === "dev") { circle(ctx, x, y, 9, "#fff", 2); ctx.fillStyle = "#2E86DE"; ctx.font = "700 10px Fredoka"; ctx.textAlign = "center"; ctx.fillText("3", x, y + 4); } else { ctx.fillStyle = "#E8463F"; ctx.beginPath(); ctx.moveTo(x + 2, y - 10); ctx.lineTo(x - 6, y + 2); ctx.lineTo(x, y + 2); ctx.lineTo(x - 2, y + 10); ctx.lineTo(x + 6, y - 2); ctx.lineTo(x, y - 2); ctx.closePath(); ctx.fill(); } if (k.t > 10 && Math.floor(k.t * 6) % 2) { ctx.fillStyle = "rgba(255,255,255,.6)"; ctx.beginPath(); ctx.arc(x, y, 16, 0, 7); ctx.fill(); } }
    // sıralı çizim
    const L = [];
    for (const w of walls) L.push({ y: w.y + w.h, f: () => drawWall(w) });
    for (const t of trees) L.push({ y: t.y, f: () => drawTree(t) });
    for (const e of en) L.push({ y: e.y, f: () => drawSnowman(ctx, e) });
    for (const p of P) L.push({ y: p.y + 14, f: () => drawKid(ctx, p, p.x, p.y) });
    L.sort((a, b) => a.y - b.y).forEach((o) => o.f());
    for (const b of balls) { ctx.globalAlpha = .22; ctx.fillStyle = "#1E3A5A"; ctx.beginPath(); ctx.ellipse(b.x, b.y + 6, b.r, b.r * .4, 0, 0, 7); ctx.fill(); ctx.globalAlpha = 1; const by = b.y - b.z * .4; circle(ctx, b.x, by, b.r, b.ice ? "#BDE8FF" : "#fff", 1.5); ctx.fillStyle = "rgba(150,190,230,.5)"; ctx.beginPath(); ctx.arc(b.x + b.r * .3, by + b.r * .3, b.r * .5, 0, 7); ctx.fill(); }
    for (const p of parts) { ctx.globalAlpha = Math.min(1, p.life * 2); ctx.fillStyle = p.c; ctx.beginPath(); ctx.arc(p.x, p.y, p.s, 0, 7); ctx.fill(); } ctx.globalAlpha = 1;
    for (const f of floaters) { ctx.globalAlpha = 1 - f.t / 1.2; txt(f.text, f.x, f.y - f.t * 30, 16, f.col); } ctx.globalAlpha = 1;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    // kar yağışı
    ctx.fillStyle = "rgba(255,255,255,.9)"; for (const s of snow) { ctx.beginPath(); ctx.arc(s.x, s.y, s.s, 0, 7); ctx.fill(); }
    if (LV.theme === "storm") { ctx.fillStyle = "rgba(230,240,250,.22)"; ctx.fillRect(0, 0, W, H); }
    hud();
    if (banner) { const a = Math.min(1, banner.t * 2); ctx.globalAlpha = a; ctx.fillStyle = "rgba(14,42,64,.75)"; ctx.fillRect(0, H / 2 - 50, W, banner.sub ? 100 : 76); txt(banner.text, W / 2, H / 2 - 12, 44, "#fff"); if (banner.sub) txt(banner.sub, W / 2, H / 2 + 30, 20, "#BDE8FF"); ctx.globalAlpha = 1; }
    if (paused) { ctx.fillStyle = "rgba(14,42,64,.5)"; ctx.fillRect(0, 0, W, H); txt("Mola!", W / 2, H / 2, 60, "#fff"); }
  }
  function drawWall(w) { const dmg = 1 - w.hp / 10; ctx.fillStyle = "rgba(30,58,90,.18)"; ctx.fillRect(w.x + 4, w.y + w.h - 2, w.w, 8); const g = ctx.createLinearGradient(0, w.y - 14, 0, w.y + w.h); g.addColorStop(0, "#FFFFFF"); g.addColorStop(1, "#C8DCF0"); ctx.fillStyle = g; ctx.beginPath(); ctx.roundRect ? ctx.roundRect(w.x, w.y - 14, w.w, w.h + 14, 8) : ctx.rect(w.x, w.y - 14, w.w, w.h + 14); ctx.fill(); ctx.strokeStyle = "#8FB8E0"; ctx.lineWidth = 2; ctx.stroke(); ctx.strokeStyle = "rgba(143,184,224,.7)"; ctx.lineWidth = 1.5; for (let yy = w.y - 4; yy < w.y + w.h; yy += 12) { ctx.beginPath(); ctx.moveTo(w.x + 3, yy); ctx.lineTo(w.x + w.w - 3, yy); ctx.stroke(); for (let xx = w.x + ((yy / 12) % 2 ? 10 : 20); xx < w.x + w.w; xx += 20) { ctx.beginPath(); ctx.moveTo(xx, yy); ctx.lineTo(xx, yy + 12); ctx.stroke(); } } if (dmg > .3) { ctx.strokeStyle = "rgba(60,90,130,.6)"; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(w.x + w.w * .3, w.y - 10); ctx.lineTo(w.x + w.w * .45, w.y + w.h * .4); ctx.lineTo(w.x + w.w * .38, w.y + w.h); ctx.stroke(); } }
  function drawTree(t) { const x = t.x, y = t.y; ctx.fillStyle = "rgba(30,58,90,.2)"; ctx.beginPath(); ctx.ellipse(x + 6, y + 4, 26, 9, 0, 0, 7); ctx.fill(); ctx.fillStyle = "#6E4A26"; ctx.fillRect(x - 4, y - 10, 8, 14); for (let k = 0; k < 3; k++) { const w2 = 30 - k * 7, yy = y - 8 - k * 18; ctx.fillStyle = "#2E6A4A"; ctx.beginPath(); ctx.moveTo(x - w2, yy); ctx.lineTo(x, yy - 30); ctx.lineTo(x + w2, yy); ctx.closePath(); ctx.fill(); ctx.strokeStyle = "#1E4A30"; ctx.lineWidth = 1.5; ctx.stroke(); ctx.fillStyle = "#fff"; ctx.beginPath(); ctx.moveTo(x - w2 * .55, yy - 13); ctx.lineTo(x, yy - 30); ctx.lineTo(x + w2 * .55, yy - 13); ctx.quadraticCurveTo(x, yy - 8, x - w2 * .55, yy - 13); ctx.fill(); } }
  function txt(s, x, y, size, col) { ctx.font = "700 " + size + "px Fredoka, sans-serif"; ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.lineWidth = Math.max(3, size * .18); ctx.strokeStyle = "rgba(14,42,64,.85)"; ctx.strokeText(s, x, y); ctx.fillStyle = col; ctx.fillText(s, x, y); }
  function hud() {
    ctx.fillStyle = "rgba(14,42,64,.75)"; ctx.fillRect(0, 0, W, TOP);
    txt((li + 1) + ". " + LV.name, 120, TOP / 2, 20, "#fff");
    txt(LV.boss ? "BOSS" : "Dalga " + Math.max(1, waveI) + " / " + LV.waves.length, W / 2, TOP / 2, 20, "#BDE8FF");
    txt("Donma: " + freezes, W - 90, TOP / 2, 18, freezes ? "#9FD8FF" : "#FFD23F");
    if (LV.wind) { txt("Rüzgâr →", W - 220, TOP / 2, 16, "#fff"); }
  }

  /* ---------- menüler ---------- */
  function setupUI() {
    const tg = (id, key, on, off) => { const b = $(id); const r = () => { b.setAttribute("aria-pressed", SV[key] ? "true" : "false"); b.textContent = SV[key] ? on : off; }; r(); b.onclick = () => { SV[key] = !SV[key]; saveSV(); r(); }; };
    tg("e1", "e1", "⭐ Kolay", "Normal"); tg("e2", "e2", "⭐ Kolay", "Normal"); tg("c2", "c2", "🤖 Bilgisayar", "🙂 İnsan");
    $("n1").value = SV.n1; $("n2").value = SV.n2; $("n1").oninput = () => { SV.n1 = $("n1").value.trim() || "Egemen"; saveSV(); }; $("n2").oninput = () => { SV.n2 = $("n2").value.trim() || "Enes"; saveSV(); };
  }
  function openLevels() {
    state = "levels"; LV = null; $("title").hidden = true; $("end").hidden = true; $("levels").hidden = false; const box = $("lvlList"); box.innerHTML = "";
    const cur = LEVELS.findIndex((L, i) => !SV.stars[i]);
    LEVELS.forEach((L, i) => { const b = document.createElement("button"); b.type = "button"; b.className = "lv" + (i === cur ? " cur" : ""); b.disabled = i > 0 && !SV.stars[i - 1];
      const c = document.createElement("canvas"); c.width = 320; c.height = 200; const keep = LV; LV = L; walls = L.walls.map(([x, y, w, h]) => ({ x, y, w, h, hp: 10 })); trees = L.trees.map(([x, y]) => ({ x, y, r: 22 })); const x = c.getContext("2d"); x.drawImage(renderBg(), 0, 0, 320, 200); const old = ctx; ctx = x; x.save(); x.scale(1 / 3, 1 / 3); for (const w of walls) drawWall(w); for (const t of trees) drawTree(t); if (L.boss) drawSnowman(x, { type: L.boss, x: 700, y: 300, hp: 1, max: 1, t: 0, face: -1, enter: 0 }); x.restore(); ctx = old; LV = keep;
      const s = SV.stars[i] || 0; b.appendChild(c); const t = document.createElement("div"); t.innerHTML = (i + 1) + ". " + L.name + "<div class='st'>" + (b.disabled ? "🔒" : "★".repeat(s) + "<i>" + "★".repeat(3 - s) + "</i>") + "</div>"; b.appendChild(t);
      b.onclick = () => { audio(); $("levels").hidden = true; loadLevel(i); }; box.appendChild(b); });
  }
  $("play").onclick = () => { audio(); openLevels(); };
  $("toTitle").onclick = () => { $("levels").hidden = true; $("title").hidden = false; state = "title"; };
  $("menuBtn").onclick = () => { if (state === "play" && !confirm("Bölümlere dönülsün mü?")) return; openLevels(); };
  $("pauseBtn").onclick = () => { if (state === "play") paused = !paused; };
  $("endNext").onclick = () => { $("end").hidden = true; loadLevel(li + 1); };
  $("endAgain").onclick = () => { $("end").hidden = true; loadLevel(li); };
  $("endMap").onclick = () => { $("end").hidden = true; openLevels(); };
  document.addEventListener("visibilitychange", () => { if (document.hidden && state === "play") paused = true; });
  const muteBtn = $("mute");
  function setMute(m) { muted = m; muteBtn.setAttribute("aria-pressed", m ? "true" : "false"); muteBtn.setAttribute("aria-label", m ? "Sesi aç" : "Sesi kapat"); if (master) master.gain.value = m ? 0 : 1; try { localStorage.setItem(SAVE + ":mute", m ? "1" : "0"); } catch (e) {} }
  setMute(muted); muteBtn.onclick = () => { audio(); setMute(!muted); };
  function drawLogo() { const c = $("logoCv"), x = c.getContext("2d"); x.clearRect(0, 0, 400, 170); const old = ctx; ctx = x; drawKid(x, Object.assign(mkPlayer(0), { fx: 1, fy: 0, thr: .1, walk: 0 }), 90, 120); drawKid(x, Object.assign(mkPlayer(1), { fx: 1, fy: .2, walk: 1 }), 150, 135); drawSnowman(x, { type: "normal", x: 310, y: 150, t: 0, face: -1, hp: 1, max: 1, enter: 0 }); circle(x, 220, 80, 7, "#fff", 1.5); circle(x, 250, 70, 6, "#fff", 1.5); ctx = old; }

  /* ---------- ölçek ve döngü ---------- */
  const stage = $("stage"), screen = $("screen");
  function fit() { const w = screen.clientWidth, h = screen.clientHeight; if (!w || !h) return; let sw = w, sh = w * H / W; if (sh > h) { sh = h; sw = h * W / H; } stage.style.width = Math.floor(sw) + "px"; stage.style.height = Math.floor(sh) + "px"; }
  addEventListener("resize", fit); if (window.ResizeObserver) new ResizeObserver(fit).observe(screen); fit();
  let last = performance.now();
  function frame(t) { const dt = Math.min(.05, (t - last) / 1000); last = t; if (!fast) update(dt); draw(); requestAnimationFrame(frame); }
  requestAnimationFrame(frame);
  setupUI(); drawLogo();

  window.__ks = { LEVELS, get P() { return P; }, get en() { return en; }, get state() { return state; }, get waveI() { return waveI; }, get freezes() { return freezes; }, loadLevel, update, setFast(v) { fast = v; }, SV, keys, throwP, get balls() { return balls; } };
})();
