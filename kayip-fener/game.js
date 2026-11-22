/* Kayıp Fener — oyun motoru */
(function () {
  "use strict";
  const A = window.ART, W = window.WORLD, T = 16, RW = 20, RH = 11, HUD = 24;
  const $ = (id) => document.getElementById(id);
  const cv = $("cv"), ctx = cv.getContext("2d");
  ctx.imageSmoothingEnabled = false;
  const SAVE = "kayip-fener";
  const SOLID = new Set("TB~RFSHrWLtCcXMYGOVQD".split(""));
  const LINKT = new Set(["E", "U"]);
  const rnd = (a, b) => a + Math.random() * (b - a);
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const DIRV = [[0, 1], [0, -1], [1, 0], [-1, 0]];

  /* ---------- durum ---------- */
  let S = null; // kayıtlı durum
  function fresh(name) {
    return { name: name || "Enes", maxHp: 6, hp: 6, sword: 0, lamp: 0, crystals: [0, 0, 0], keys: { cave: 0, tower: 0 }, opened: {}, bosses: {}, coins: 0,
      room: W.start.room, sx: W.start.x, sy: W.start.y, visited: {}, deaths: 0, time: 0, done: 0, intro: 0, bought: {} };
  }
  function save() { if (!S) return; try { localStorage.setItem(SAVE, JSON.stringify(S)); } catch (e) {} }
  function load() { try { const s = JSON.parse(localStorage.getItem(SAVE) || "null"); if (s && s.room && W.rooms[s.room]) return Object.assign(fresh(s.name), s); } catch (e) {} return null; }

  /* ---------- ses ---------- */
  let ac = null, master = null, musicGain = null, muted = false;
  try { muted = localStorage.getItem(SAVE + ":mute") === "1"; } catch (e) {}
  function audio() {
    if (ac) return ac;
    const C = window.AudioContext || window.webkitAudioContext; if (!C) return null;
    ac = new C(); master = ac.createGain(); master.gain.value = muted ? 0 : 1; master.connect(ac.destination);
    musicGain = ac.createGain(); musicGain.gain.value = .55; musicGain.connect(master);
    return ac;
  }
  function tone(f, d, type, vol, when, slide, dest) {
    if (!ac || muted) return; const t = when || ac.currentTime;
    const o = ac.createOscillator(), g = ac.createGain(); o.type = type || "square"; o.frequency.setValueAtTime(f, t);
    if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(30, slide), t + d);
    g.gain.setValueAtTime(vol || .08, t); g.gain.exponentialRampToValueAtTime(.0008, t + d);
    o.connect(g); g.connect(dest || master); o.start(t); o.stop(t + d + .02);
  }
  let noiseBuf = null;
  function noise(d, vol, freq) {
    if (!ac || muted) return; if (!noiseBuf) { noiseBuf = ac.createBuffer(1, ac.sampleRate * .5, ac.sampleRate); const ch = noiseBuf.getChannelData(0); for (let i = 0; i < ch.length; i++) ch[i] = Math.random() * 2 - 1; }
    const s = ac.createBufferSource(), f = ac.createBiquadFilter(), g = ac.createGain(), t = ac.currentTime; s.buffer = noiseBuf; f.type = "bandpass"; f.frequency.value = freq || 1800; f.Q.value = .8;
    g.gain.setValueAtTime(vol || .15, t); g.gain.exponentialRampToValueAtTime(.001, t + d); s.connect(f); f.connect(g); g.connect(master); s.start(t); s.stop(t + d);
  }
  const mf = (m) => 440 * Math.pow(2, (m - 69) / 12);
  const sfx = {
    swing() { noise(.12, .12, 2600); },
    hit() { tone(220, .1, "square", .08, 0, 90); noise(.08, .1, 900); },
    tink() { tone(1400, .08, "square", .05); tone(1900, .06, "square", .03); },
    hurt() { tone(330, .25, "sawtooth", .08, 0, 110); },
    coin() { const t = ac && ac.currentTime; tone(988, .06, "square", .05, t); tone(1319, .14, "square", .05, t + .06); },
    heart() { const t = ac && ac.currentTime; [784, 988, 1175].forEach((f, i) => tone(f, .1, "triangle", .09, t + i * .06)); },
    chest() { const t = ac && ac.currentTime; [523, 659, 784, 1047].forEach((f, i) => tone(f, .16, "square", .05, t + i * .09)); },
    item() { const t = ac && ac.currentTime; [[523, 0], [659, .12], [784, .24], [1047, .36], [988, .6], [1047, .72]].forEach(([f, d]) => { tone(f, .22, "square", .05, t + d); tone(f / 2, .22, "triangle", .07, t + d); }); },
    door() { tone(180, .2, "square", .06, 0, 90); noise(.2, .08, 500); },
    stairs() { const t = ac && ac.currentTime; [600, 500, 400, 300].forEach((f, i) => tone(f, .08, "square", .04, t + i * .07)); },
    die() { const t = ac && ac.currentTime; [523, 440, 349, 262].forEach((f, i) => tone(f, .25, "triangle", .1, t + i * .18)); },
    roar() { tone(110, .7, "sawtooth", .12, 0, 50); noise(.6, .15, 300); },
    boom() { noise(.5, .25, 200); tone(80, .5, "sine", .2, 0, 30); },
    bump() { tone(120, .05, "square", .04); },
    cut() { noise(.1, .1, 3500); },
    shoot() { tone(700, .2, "sine", .06, 0, 300); },
    reflect() { tone(500, .15, "square", .06, 0, 1500); },
    talk() { tone(600 + Math.random() * 200, .03, "square", .02); },
    sel() { tone(880, .05, "square", .04); }
  };
  /* müzik: 8'lik adımlar, 0 = sus */
  const SONGS = {
    village: { bpm: 112, lead: [72, 0, 76, 79, 77, 76, 74, 0, 72, 74, 76, 72, 74, 0, 67, 0, 72, 0, 76, 79, 81, 79, 77, 76, 74, 76, 74, 71, 72, 0, 0, 0], bass: [48, 0, 55, 0, 53, 0, 55, 0, 48, 0, 55, 0, 50, 0, 55, 0, 48, 0, 55, 0, 53, 0, 57, 0, 50, 0, 55, 0, 48, 0, 55, 0] },
    forest: { bpm: 96, lead: [69, 0, 72, 0, 76, 74, 72, 0, 71, 0, 74, 0, 72, 71, 69, 0, 69, 0, 72, 76, 79, 0, 77, 76, 74, 0, 72, 74, 76, 0, 0, 0], bass: [45, 0, 52, 0, 48, 0, 52, 0, 43, 0, 50, 0, 45, 0, 52, 0, 41, 0, 48, 0, 45, 0, 48, 0, 43, 0, 50, 0, 45, 0, 52, 0] },
    cave: { bpm: 80, lead: [64, 0, 0, 67, 0, 0, 71, 0, 69, 0, 0, 64, 0, 0, 62, 0, 64, 0, 0, 67, 0, 0, 72, 0, 71, 0, 69, 0, 67, 0, 0, 0], bass: [40, 0, 0, 0, 47, 0, 0, 0, 38, 0, 0, 0, 45, 0, 0, 0, 36, 0, 0, 0, 43, 0, 0, 0, 38, 0, 0, 0, 47, 0, 0, 0] },
    tower: { bpm: 90, lead: [70, 0, 69, 0, 66, 0, 69, 70, 0, 73, 0, 70, 69, 0, 66, 0, 70, 0, 73, 0, 75, 0, 73, 70, 69, 0, 66, 0, 65, 0, 0, 0], bass: [42, 0, 42, 0, 49, 0, 42, 0, 40, 0, 40, 0, 47, 0, 40, 0, 38, 0, 38, 0, 45, 0, 38, 0, 37, 0, 37, 0, 44, 0, 37, 0] },
    boss: { bpm: 150, lead: [64, 64, 67, 64, 70, 69, 67, 64, 62, 62, 65, 62, 69, 67, 65, 62, 64, 64, 67, 64, 71, 70, 69, 67, 68, 0, 68, 0, 71, 0, 71, 0], bass: [40, 52, 40, 52, 40, 52, 40, 52, 38, 50, 38, 50, 38, 50, 38, 50, 40, 52, 40, 52, 40, 52, 40, 52, 44, 56, 44, 56, 47, 59, 47, 59] },
    win: { bpm: 120, lead: [72, 76, 79, 84, 0, 79, 84, 0, 81, 77, 81, 84, 0, 0, 86, 0, 84, 0, 79, 76, 77, 79, 76, 72, 74, 76, 74, 71, 72, 0, 0, 0], bass: [48, 0, 55, 0, 48, 0, 55, 0, 53, 0, 60, 0, 53, 0, 55, 0, 48, 0, 55, 0, 53, 0, 55, 0, 50, 0, 55, 0, 48, 0, 48, 0] }
  };
  let song = null, songStep = 0, songNext = 0, songTimer = null;
  function music(name) {
    if (song === name) return; song = name; songStep = 0; if (ac) songNext = ac.currentTime + .1;
    if (!songTimer) songTimer = setInterval(tickMusic, 90);
  }
  function tickMusic() {
    if (!ac || !song || muted || paused()) { if (ac) songNext = Math.max(songNext, ac.currentTime); return; }
    const sg = SONGS[song], st = 60 / sg.bpm / 2;
    if (songNext < ac.currentTime) songNext = ac.currentTime + .02;
    while (songNext < ac.currentTime + .3) {
      const i = songStep % sg.lead.length, l = sg.lead[i], b = sg.bass[i];
      if (l) tone(mf(l), st * .9, "square", .035, songNext, 0, musicGain);
      if (b) tone(mf(b), st * .95, "triangle", .09, songNext, 0, musicGain);
      songStep++; songNext += st;
    }
  }

  /* ---------- odalar ---------- */
  let room = null, roomId = "", live = [], staticCv = null, staticDirty = true;
  const layerOf = (id) => id.split(":")[0];
  const xyOf = (id) => id.split(":")[1].split(",").map(Number);
  function neighbor(id, dx, dy) { const [x, y] = xyOf(id); const n = layerOf(id) + ":" + (x + dx) + "," + (y + dy); return W.rooms[n] ? n : null; }
  const theme = (r) => A.THEMES[W.areas[r.area].theme];
  function buildLive(id) {
    const r = W.rooms[id], m = r.map.map((s) => s.split(""));
    for (const k in r.chests || {}) { const [x, y] = k.split(",").map(Number); if (S.opened[id + "@" + k]) m[y][x] = "c"; }
    if (r.clearChest) { const c = r.clearChest; if (S.opened[id + "@clear"]) m[c.y][c.x] = "c"; }
    for (let y = 0; y < RH; y++) for (let x = 0; x < RW; x++) if (m[y][x] === "L" && S.opened[id + "@" + x + "," + y]) m[y][x] = ".";
    return m;
  }
  const tileAt = (tx, ty) => (tx < 0 || ty < 0 || tx >= RW || ty >= RH) ? null : live[ty][tx];
  function solidAt(tx, ty) {
    const c = tileAt(tx, ty); if (c === null) return false;
    if (c === "Q") return S.crystals.filter(Boolean).length < 2;
    return SOLID.has(c);
  }
  function renderStatic(id, m, target) {
    const r = W.rooms[id], th = theme(r), c = target || document.createElement("canvas"); c.width = RW * T; c.height = RH * T;
    const x = c.getContext("2d");
    for (let ty = 0; ty < RH; ty++) for (let tx = 0; tx < RW; tx++) drawT(x, m[ty][tx], tx, ty, th, 0);
    if (id === "o:0,0") drawFenerBase(x);
    return c;
  }
  const ANIM = new Set(["~", "P", "t", "M", "Q"]);
  function drawT(x, ch, tx, ty, th, t) {
    if (ch === "O") { A.drawTile(x, ".", tx, ty, th, t); return; }
    if (ch === "Q") { A.drawTile(x, ".", tx, ty, th, t); drawBarrier(x, tx * T, ty * T, t); return; }
    A.drawTile(x, ch, tx, ty, th, t);
  }
  function drawBarrier(x, px, py, t) {
    if (S && S.crystals.filter(Boolean).length >= 2) { x.globalAlpha = .25 + .1 * Math.sin(t * 3); }
    for (let i = 0; i < 4; i++) { const yy = (t * 20 + i * 4) % 16; x.fillStyle = i % 2 ? "#B98CFF" : "#7DF9FF"; x.fillRect(px + 1, py + yy, 14, 1); }
    x.fillStyle = "rgba(160,110,255,.45)"; x.fillRect(px + 1, py, 14, 16);
    x.fillStyle = "#E9DCFF"; x.fillRect(px + 7, py + 3 + Math.floor(t * 4) % 10, 2, 2);
    x.globalAlpha = 1;
  }

  /* ---------- varlıklar ---------- */
  const P = { x: 0, y: 0, dir: 0, frame: 0, ft: 0, atk: 0, inv: 0, kbx: 0, kby: 0, kbt: 0, hold: 0, holdItem: null, moving: false, push: 0 };
  let enemies = [], shots = [], parts = [], drops = [], hazards = [], npcs = [], boss = null, portal = null;
  let shake = 0, banner = null, flash = 0, clock = 0, lastArea = "", fade = 0, fadeDir = 0, fadeAct = null, slide = null, linkArm = true, deadT = 0, endT = 0;
  const box = (e) => ({ x: e.x + 3, y: e.y + 8, w: 10, h: 8 });
  const pbox = () => ({ x: P.x + 3, y: P.y + 7, w: 10, h: 9 });
  const over = (a, b) => a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
  function hitsSolid(bx, by, bw, bh) {
    const x0 = Math.floor(bx / T), x1 = Math.floor((bx + bw - .01) / T), y0 = Math.floor(by / T), y1 = Math.floor((by + bh - .01) / T);
    for (let ty = y0; ty <= y1; ty++) for (let tx = x0; tx <= x1; tx++) if (solidAt(tx, ty)) return { tx, ty };
    for (const n of npcs) if (bx < n.x + 13 && bx + bw > n.x + 3 && by < n.y + 16 && by + bh > n.y + 8) return { npc: n };
    return null;
  }
  // varlık hareketi (karo çarpışmalı), bx..: kutu ofsetleri
  function moveBox(e, dx, dy, ox, oy, w, h, bounds) {
    let hit = false;
    if (dx) { const nx = e.x + dx; if (!hitsSolid(nx + ox, e.y + oy, w, h) && (!bounds || (nx + ox >= 0 && nx + ox + w <= RW * T))) e.x = nx; else hit = true; }
    if (dy) { const ny = e.y + dy; if (!hitsSolid(e.x + ox, ny + oy, w, h) && (!bounds || (ny + oy >= 0 && ny + oy + h <= RH * T))) e.y = ny; else hit = true; }
    return hit;
  }

  const EN = {
    slime: { hp: 2, dmg: 1, col: "#5FD068" }, rslime: { hp: 4, dmg: 1, col: "#A8A8C0" }, pslime: { hp: 3, dmg: 2, col: "#B37CFF" },
    beetle: { hp: 3, dmg: 2 }, bat: { hp: 1, dmg: 1, fly: 1 }, ghost: { hp: 3, dmg: 2, fly: 1, ghost: 1 }
  };
  function spawnEnemy(type, tx, ty) {
    const d = EN[type]; return { type, x: tx * T, y: ty * T, hp: d.hp, max: d.hp, t: rnd(0, 2), st: 0, vx: 0, vy: 0, hurt: 0, kbx: 0, kby: 0, kbt: 0, dir: Math.floor(rnd(0, 4)), phase: rnd(0, 6), alpha: 1 };
  }
  function enterRoom(id, px, py, dir) {
    roomId = id; room = W.rooms[id]; live = buildLive(id); staticDirty = true;
    P.x = px; P.y = py; if (dir != null) P.dir = dir; P.atk = 0; P.kbt = 0;
    enemies = []; shots = []; parts = []; drops = []; hazards = []; boss = null; portal = null;
    if (!(room.boss && S.bosses[room.boss])) (room.enemies || []).forEach(([t, x, y]) => enemies.push(spawnEnemy(t, x, y)));
    npcs = (room.npcs || []).map((n) => ({ ...n, x: n.x * T, y: n.y * T, t: rnd(0, 3) }));
    if (room.boss && !S.bosses[room.boss]) startBoss(room.boss);
    if (room.boss === "wizard" && S.bosses.wizard) portal = { x: 9 * T + 8, y: 5 * T + 8 };
    S.visited[id] = 1;
    const area = room.area;
    if (area !== lastArea) { banner = { text: W.areas[area].name, t: 2.4 }; lastArea = area; }
    else banner = { text: room.name, t: 1.4, small: 1 };
    music(boss ? "boss" : S.done && area === "village" ? "win" : W.areas[area].music);
    if (!boss) { S.room = id; S.sx = px / T; S.sy = py / T; save(); }
    linkArm = !LINKT.has(tileAt(Math.floor((P.x + 8) / T), Math.floor((P.y + 12) / T)));
  }

  /* ---------- bosslar ---------- */
  const BOSS = {
    mantar: { name: "DEV MANTAR", hp: 10, w: 32, h: 32 },
    golem: { name: "TAŞ DEV", hp: 6, w: 28, h: 28 },
    wizard: { name: "GÖLGE BÜYÜCÜSÜ", hp: 8, w: 16, h: 24 }
  };
  function startBoss(kind) {
    const b = BOSS[kind];
    boss = { kind, name: b.name, hp: b.hp, max: b.hp, w: b.w, h: b.h, x: 9 * T - (b.w - 16) / 2, y: 3 * T, st: "intro", t: 1.6, hurt: 0, vx: 0, vy: 0, alpha: 1, n: 0, dead: 0 };
    later(300, () => sfx.roar());
    shake = .4;
  }
  function bossBox() { return { x: boss.x + 2, y: boss.y + 4, w: boss.w - 4, h: boss.h - 4 }; }
  function bossVulnerable() {
    if (!boss || boss.dead) return false;
    if (boss.kind === "mantar") return boss.st === "idle" || boss.st === "land";
    if (boss.kind === "golem") return boss.st === "stun";
    if (boss.kind === "wizard") return boss.st === "daze";
    return false;
  }
  function hurtBoss(dmg) {
    boss.hp -= dmg; boss.hurt = .3; sfx.hit(); shake = .15;
    burst(boss.x + boss.w / 2, boss.y + boss.h / 2, "#fff", 8);
    if (boss.hp <= 0) {
      boss.dead = 1; boss.st = "die"; boss.t = 1.6; sfx.roar(); shake = .6; shots = []; hazards = [];
      enemies.forEach((e) => { e.hp = 0; burst(e.x + 8, e.y + 8, "#C9C2F2", 8); }); enemies = [];
    } else if (boss.kind === "golem") { boss.st = "look"; boss.t = 1.2; }
    else if (boss.kind === "wizard") { boss.st = "vanish"; boss.t = .5; }
  }
  function updateBoss(dt) {
    const b = boss, cx = () => b.x + b.w / 2, cy = () => b.y + b.h / 2, pcx = P.x + 8, pcy = P.y + 10;
    b.t -= dt; b.hurt = Math.max(0, b.hurt - dt); b.anim = (b.anim || 0) + dt;
    if (b.st === "die") {
      if (Math.random() < .5) burst(b.x + rnd(0, b.w), b.y + rnd(0, b.h), ["#FFD166", "#fff", "#FF7AA2"][Math.floor(rnd(0, 3))], 3);
      if (b.t <= 0) {
        S.bosses[b.kind] = 1; sfx.boom(); burst(cx(), cy(), "#FFD166", 30);
        const ci = { mantar: 0, golem: 1, wizard: 2 }[b.kind];
        drops.push({ type: "crystal", ci, x: cx() - 8, y: cy() - 8, t: 0, still: 1 });
        if (b.kind !== "wizard") drops.push({ type: "heartc", x: cx() + 14, y: cy() - 4, t: 0, still: 1 });
        else portal = { x: 9 * T + 8, y: 5 * T + 8 };
        boss = null; music(W.areas[room.area].music); save();
      }
      return;
    }
    if (b.st === "intro") { if (b.t <= 0) { b.st = b.kind === "golem" ? "look" : "idle"; b.t = 1; } return; }
    if (b.kind === "mantar") {
      const ph2 = b.hp <= 5;
      if (b.st === "idle" && b.t <= 0) { b.st = "jump"; b.t = .9; b.fx = b.x; b.fy = b.y; b.tx = clamp(pcx - b.w / 2 + rnd(-30, 30), T, (RW - 1) * T - b.w); b.ty = clamp(pcy - b.h / 2 + rnd(-20, 20), T, (RH - 1) * T - b.h); }
      else if (b.st === "jump") { const k = 1 - b.t / .9; b.x = b.fx + (b.tx - b.fx) * k; b.y = b.fy + (b.ty - b.fy) * k; b.z = Math.sin(k * Math.PI) * 40; if (b.t <= 0) { b.st = "land"; b.t = .5; b.z = 0; shake = .25; sfx.boom();
        const n = ph2 ? 12 : 8; for (let i = 0; i < n; i++) { const a = i / n * Math.PI * 2 + (b.n++ % 2) * .3; shots.push({ x: cx(), y: cy() + 6, vx: Math.cos(a) * 62, vy: Math.sin(a) * 62, r: 3, life: 4, kind: "spore", dmg: 1 }); }
        if (ph2 && enemies.length < 3 && Math.random() < .6) enemies.push(spawnEnemy("slime", Math.floor(cx() / T), Math.floor(cy() / T) + 1)); } }
      else if (b.st === "land" && b.t <= 0) { b.st = "idle"; b.t = ph2 ? rnd(.8, 1.3) : rnd(1.3, 1.9); }
    } else if (b.kind === "golem") {
      if (b.st === "look") { b.face = Math.sign(pcx - cx()) || 1; if (b.t <= 0) { const dx = pcx - cx(), dy = pcy - cy(), d = Math.hypot(dx, dy) || 1, sp = b.hp <= 3 ? 175 : 140; b.vx = dx / d * sp; b.vy = dy / d * sp; b.st = "charge"; b.t = 3; sfx.roar(); } }
      else if (b.st === "charge") {
        const hit = moveBox(b, b.vx * dt, 0, 2, 4, b.w - 4, b.h - 4, 1) | moveBox(b, 0, b.vy * dt, 2, 4, b.w - 4, b.h - 4, 1);
        if (Math.random() < .4) parts.push({ x: cx() + rnd(-8, 8), y: b.y + b.h, vx: rnd(-10, 10), vy: rnd(-20, -5), life: .4, col: "#8A8296", s: 2 });
        if (hit || b.t <= 0) { b.st = "stun"; b.t = 2.4; shake = .5; sfx.boom(); burst(cx(), cy(), "#B0A8C0", 14);
          const n = b.hp <= 3 ? 5 : 3; for (let i = 0; i < n; i++) hazards.push({ x: i === 0 ? pcx : rnd(2 * T, 18 * T), y: i === 0 ? pcy : rnd(2 * T, 9 * T), t: .9 + i * .15, kind: "rock" }); }
      } else if (b.st === "stun" && b.t <= 0) { b.st = "look"; b.t = b.hp <= 3 ? .7 : 1.1; }
    } else if (b.kind === "wizard") {
      const ph2 = b.hp <= 4;
      if (b.st === "idle") { b.y += Math.sin(b.anim * 2) * .3; if (b.t <= 0) { b.st = "cast"; b.t = .7; } }
      else if (b.st === "cast") { if (b.t <= 0) { const dx = pcx - cx(), dy = pcy - cy(), d = Math.hypot(dx, dy) || 1; shots.push({ x: cx(), y: cy(), vx: dx / d * 70, vy: dy / d * 70, r: 5, life: 7, kind: "orb", dmg: 2, home: 1 }); sfx.shoot();
          if (ph2) for (const s of [-.5, .5]) { const a = Math.atan2(dy, dx) + s; shots.push({ x: cx(), y: cy(), vx: Math.cos(a) * 80, vy: Math.sin(a) * 80, r: 3, life: 3, kind: "dark", dmg: 1 }); }
          b.n++; b.st = b.n % 3 === 0 ? "vanish" : "idle"; b.t = ph2 ? 1 : 1.6; } }
      else if (b.st === "vanish") { b.alpha = Math.max(0, b.t / .5); if (b.t <= 0) { b.x = rnd(2, 16) * T; b.y = rnd(1.5, 6) * T; if (Math.hypot(b.x - P.x, b.y - P.y) < 60) b.y = P.y > 5 * T ? 2 * T : 7 * T; b.st = "appear"; b.t = .5; if (ph2 && enemies.length < 2) enemies.push(spawnEnemy("ghost", rnd(2, 17) | 0, rnd(2, 8) | 0)); } }
      else if (b.st === "appear") { b.alpha = 1 - Math.max(0, b.t / .5); if (b.t <= 0) { b.alpha = 1; b.st = "idle"; b.t = .8; } }
      else if (b.st === "daze") { if (b.t <= 0) { b.st = "vanish"; b.t = .5; } }
    }
    // temas hasarı
    if (b.st !== "jump" && b.st !== "vanish" && b.st !== "stun" && b.st !== "daze" && b.st !== "intro" && b.alpha > .5 && over(bossBox(), pbox())) hurtPlayer(b.kind === "golem" && b.st === "charge" ? 3 : 2, cx(), cy());
  }

  /* ---------- oyuncu ---------- */
  function swordBox() {
    const d = P.dir;
    if (d === 0) return { x: P.x - 1, y: P.y + 10, w: 18, h: 16 };
    if (d === 1) return { x: P.x - 1, y: P.y - 10, w: 18, h: 16 };
    if (d === 2) return { x: P.x + 10, y: P.y + 1, w: 16, h: 16 };
    return { x: P.x - 10, y: P.y + 1, w: 16, h: 16 };
  }
  function hurtPlayer(dmg, fx, fy) {
    if (P.inv > 0 || deadT > 0 || endT) return;
    S.hp = Math.max(0, S.hp - dmg); P.inv = 1.1; sfx.hurt(); flash = .15; shake = .15;
    const dx = P.x + 8 - fx, dy = P.y + 10 - fy, d = Math.hypot(dx, dy) || 1; P.kbx = dx / d * 170; P.kby = dy / d * 170; P.kbt = .16;
    if (S.hp <= 0) { deadT = 1.8; sfx.die(); music(null); }
  }
  function attack() {
    if (!S.sword || P.atk > 0 || P.hold > 0) return;
    P.atk = .26; sfx.swing(); P.hitSet = new Set();
  }
  function swordHits() {
    const sb = swordBox(), dmg = S.sword >= 2 ? 2 : 1;
    // çalılar
    const x0 = Math.floor(sb.x / T), x1 = Math.floor((sb.x + sb.w) / T), y0 = Math.floor(sb.y / T), y1 = Math.floor((sb.y + sb.h) / T);
    for (let ty = y0; ty <= y1; ty++) for (let tx = x0; tx <= x1; tx++) if (tileAt(tx, ty) === "B") {
      live[ty][tx] = "."; staticDirty = true; sfx.cut();
      for (let i = 0; i < 8; i++) parts.push({ x: tx * T + 8, y: ty * T + 8, vx: rnd(-50, 50), vy: rnd(-60, 10), life: .5, col: i % 2 ? "#2E8A3A" : "#57C05E", s: 2, g: 1 });
      const r = Math.random(); if (r < .22) drops.push({ type: "coin", x: tx * T + 4, y: ty * T + 4, t: 0 }); else if (r < .32 && S.hp < S.maxHp) drops.push({ type: "heart", x: tx * T + 4, y: ty * T + 4, t: 0 });
    }
    for (const e of enemies) {
      if (e.hp <= 0 || P.hitSet.has(e) || (e.type === "ghost" && e.alpha < .5)) continue;
      if (over(sb, { x: e.x + 2, y: e.y + 2, w: 12, h: 13 })) { P.hitSet.add(e); damageEnemy(e, dmg); }
    }
    for (const s of shots) if (s.kind === "orb" && !s.friendly && over(sb, { x: s.x - s.r, y: s.y - s.r, w: s.r * 2, h: s.r * 2 })) {
      s.friendly = 1; s.life = 5; sfx.reflect(); burst(s.x, s.y, "#7DF9FF", 6);
      if (boss) { const dx = boss.x + boss.w / 2 - s.x, dy = boss.y + boss.h / 2 - s.y, d = Math.hypot(dx, dy) || 1; s.vx = dx / d * 120; s.vy = dy / d * 120; }
    }
    if (boss && !P.hitSet.has(boss) && over(sb, bossBox())) {
      P.hitSet.add(boss);
      if (bossVulnerable()) hurtBoss(dmg); else { sfx.tink(); burst(sb.x + sb.w / 2, sb.y + sb.h / 2, "#fff", 4); }
    }
  }
  function damageEnemy(e, dmg) {
    e.hp -= dmg; e.hurt = .2; sfx.hit();
    const dx = e.x - P.x, dy = e.y - P.y, d = Math.hypot(dx, dy) || 1; e.kbx = dx / d * 190; e.kby = dy / d * 190; e.kbt = .15;
    if (e.hp <= 0) {
      burst(e.x + 8, e.y + 8, e.type === "ghost" ? "#C9C2F2" : EN[e.type].col || "#8E6BD0", 10);
      const r = Math.random();
      if (r < .4) drops.push({ type: "coin", x: e.x + 4, y: e.y + 4, t: 0 });
      else if (r < .55) drops.push({ type: "heart", x: e.x + 4, y: e.y + 4, t: 0 });
      else if (r < .62) drops.push({ type: "gem", x: e.x + 4, y: e.y + 4, t: 0 });
    }
  }
  function burst(x, y, col, n) { for (let i = 0; i < n; i++) { const a = rnd(0, 7), s = rnd(20, 90); parts.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, life: rnd(.3, .6), col, s: rnd(1, 3) | 0 }); } }

  /* ---------- etkileşim ---------- */
  function front() { const [dx, dy] = DIRV[P.dir]; return { tx: Math.floor((P.x + 8 + dx * 14) / T), ty: Math.floor((P.y + 12 + dy * 14) / T) }; }
  function interact() {
    // kişiler
    const fx = P.x + 8 + DIRV[P.dir][0] * 12, fy = P.y + 11 + DIRV[P.dir][1] * 12;
    for (const n of npcs) if (Math.abs(n.x + 8 - fx) < 13 && Math.abs(n.y + 10 - fy) < 13) { n.dir = [1, 0, 3, 2][P.dir]; talk(n.id); return true; }
    const { tx, ty } = front(), c = tileAt(tx, ty);
    if (c === "C") { openChest(tx, ty); return true; }
    if (c === "S") { const s = (room.signs || {})[tx + "," + ty]; if (s) say([[null, s]]); return true; }
    if (c === "L") { tryDoor(tx, ty); return true; }
    if (c === "Q" && S.crystals.filter(Boolean).length < 2) { say([[null, "Büyülü bir engel parıldıyor. Üzerinde yazı var:\n\"Yalnızca iki ışık kristali taşıyan geçebilir.\""]]); return true; }
    if (c === "O") { fener(); return true; }
    if (c === "D") { say([[null, ["Kapı kilitli. İçeriden horultu geliyor... Zzz.", "Kapıyı çaldın. Ses yok. Herkes meydanda galiba.", "Kapının arkasından mis gibi börek kokusu geliyor!"][(tx + ty) % 3]]]); return true; }
    if (c === "M") { if (S.hp < S.maxHp) { S.hp = S.maxHp; sfx.heart(); say([[null, "Çeşmenin serin suyundan içtin. Canın tamamen doldu!"]]); } else say([[null, "Çeşmenin suyu pırıl pırıl. Canın zaten dolu."]]); return true; }
    return false;
  }
  function openChest(tx, ty) {
    const k = tx + "," + ty, cl = room.clearChest && room.clearChest.x === tx && room.clearChest.y === ty;
    const content = cl ? { item: room.clearChest.item } : (room.chests || {})[k];
    if (!content) return;
    S.opened[roomId + "@" + (cl ? "clear" : k)] = 1; live[ty][tx] = "c"; staticDirty = true; sfx.chest();
    later(350, () => give(content));
  }
  function tryDoor(tx, ty) {
    const a = room.area;
    if (S.keys[a] > 0) { S.keys[a]--; S.opened[roomId + "@" + tx + "," + ty] = 1; live[ty][tx] = "."; staticDirty = true; sfx.door(); burst(tx * T + 8, ty * T + 8, "#FFD166", 10); save(); }
    else say([[null, "Kilitli bir kapı. Bir anahtar lazım.\nBelki bu katta saklı bir sandık vardır..."]]);
  }
  const ITEM = {
    sword: ["KILIÇ", "Dedenin kılıcını aldın!\nA ya da Boşluk ile salla. Çalıları da keser."],
    lamp: ["ESKİ LAMBA", "Eski Lamba'yı buldun!\nArtık karanlık mağarada yolunu görebilirsin."],
    key: ["ANAHTAR", "Bir anahtar buldun! Bu kattaki kilitli kapıyı açar."],
    heart: ["KALP", "Kalp kabı! Canın bir kalp arttı ve tamamen doldu."],
    sword2: ["GÜÇLÜ KILIÇ", "Kılıcın parlıyor! Artık iki kat güçlü vuruyorsun."]
  };
  function give(c, after) {
    let icon = c.item, lines;
    if (c.coins) { S.coins += c.coins; icon = "coins"; sfx.coin(); lines = [[null, c.coins + " altın buldun! Toplam: " + S.coins]]; P.hold = .9; P.holdItem = icon; say(lines, () => { P.hold = 0; after && after(); }); save(); return; }
    if (c.heart) icon = "heart";
    if (icon === "sword") S.sword = Math.max(S.sword, 1);
    if (icon === "sword2") S.sword = 2;
    if (icon === "lamp") S.lamp = 1;
    if (icon === "key") S.keys[room.area]++;
    if (icon === "heart") { S.maxHp += 2; S.hp = S.maxHp; }
    if (icon && icon.startsWith("crystal")) {
      const i = +icon.slice(7); S.crystals[i] = 1; const n = S.crystals.filter(Boolean).length;
      lines = [[null, "IŞIK KRİSTALİ! (" + n + "/3)\n" + ["Gölge Büyücüsü'nün çaldığı ilk kristal! Sıcacık parlıyor.", "İkinci kristal! Taş Dev onu bu yüzden saklıyormuş.", "Son kristal! Hepsi sende. Köye dön ve Fener'i yak!"][Math.min(n, 3) - 1]]];
    } else lines = [[null, ITEM[icon][1]]];
    P.hold = 1.4; P.holdItem = icon; sfx.item(); music(null);
    say(lines, () => { P.hold = 0; music(boss ? "boss" : W.areas[room.area].music); after && after(); });
    save();
  }

  /* ---------- konuşmalar ---------- */
  const nm = () => S.name;
  const crystalsN = () => S.crystals.filter(Boolean).length;
  function talk(id) {
    sfx.talk();
    if (id === "elder") {
      const N = "Bilge Nine";
      if (S.done) return say([[N, "Köyümüz yeniden ışıl ışıl. Sen gerçek bir kahramansın, " + nm() + "!"], [N, "Ormanda dolaşmak istersen canavarlar hâlâ orada. Dikkatli ol!"]]);
      if (!S.sword) return introTalk();
      const n = crystalsN();
      if (n === 3) return say([[N, "Üç kristal de sende! Hadi " + nm() + ", Fener'in kapısına git ve kristalleri yerleştir!"]]);
      if (n === 2) return say([[N, "İki kristal! Artık Eski Kule'nin büyülü kapısı açılır."], [N, "Kule, ormanın güneyinde. Gölge Büyücüsü orada saklanıyor. Büyülü toplarını kılıcınla geri çevir!"]]);
      if (n === 1 && !S.lamp) return say([[N, "Bir kristal! Aferin! İkincisi karanlık Kristal Mağarası'nda."], [N, "Ama içerisi zifiri karanlık. Lamba Korusu'ndaki canavarları yenersen eski lambayı bulursun."]]);
      if (n === 1) return say([[N, "Bir kristal! Aferin! İkincisi Kristal Mağarası'nda, ormanın güneydoğusunda."], [N, "Mağaradaki Taş Dev çok güçlü ama duvara çarpınca sersemler. İşte o an vur!"]]);
      if (!S.lamp) return say([[N, "Gizemli Orman doğuda. Ormanın kuzeyindeki korulukta eski bir lamba olduğu söylenir."], [N, "Kristallerden birinin parıltısı ise Mantar Çayırı'ndan geliyor. Kocaman bir mantar varmış orada..."]]);
      return say([[N, "Lambayı bulmuşsun! Harika."], [N, "Şimdi Mantar Çayırı'na git. Orman Girişi'nden doğuya, sonra kuzeye. Dev Mantar zıplarken vuramazsın, yere inince vur!"]]);
    }
    if (id === "smith") {
      const N = "Demirci Usta";
      if (!S.sword) return say([[N, "Önce Bilge Nine'yle konuş evlat. Meydanda seni bekliyor."]]);
      if (S.sword < 2) return ask(N, "Kılıcını güçlendireyim mi? İki kat vurur!\nFiyatı 30 altın. (Sende " + S.coins + " var)", ["Evet", "Hayır"], (i) => {
        if (i !== 0) return say([[N, "Peki. Altın toplarsan gel. Çalılarda bile altın çıkar!"]]);
        if (S.coins < 30) return say([[N, "Altının yetmiyor evlat. 30 altın lazım. Canavarlar ve çalılar altın düşürür."]]);
        S.coins -= 30; give({ item: "sword2" });
      });
      if (!S.bought.heart) return ask(N, "Sana bir kalp kabı yapabilirim. Canın bir kalp artar.\nFiyatı 40 altın. (Sende " + S.coins + " var)", ["Evet", "Hayır"], (i) => {
        if (i !== 0) return say([[N, "Ne zaman istersen buradayım."]]);
        if (S.coins < 40) return say([[N, "40 altın lazım evlat. Biraz daha topla."]]);
        S.coins -= 40; S.bought.heart = 1; give({ heart: 1 });
      });
      return say([[N, "Kılıcın ve kalbin en iyisi oldu. Artık sıra sende, kahraman!"]]);
    }
    if (id === "ada") {
      const N = "Ada";
      if (S.hp < S.maxHp) { S.hp = S.maxHp; sfx.heart(); return say([[N, "Of, çok yorgun görünüyorsun! Al, annemin elmalı turtası."], [null, "Canın tamamen doldu!"]]); }
      return say([[N, ["Merhaba " + nm() + "! Yaralanırsan bana gel, turtam hep hazır.", "Meydandaki çeşmenin suyu da insanı dinlendirir, biliyor muydun?", "Demirci Usta altın karşılığında kılıçları güçlendiriyor!"][Math.floor(clock) % 3]]]);
    }
    if (id === "can") {
      const N = "Can";
      if (!S.opened["o:0,1@12,8"]) return say([[N, "Psst! Gölün yanında bir sandık var. İçinde altın varmış!"]]);
      return say([[N, ["Çalıları kesince bazen altın, bazen kalp çıkıyor. Ben hep denerim!", "Mağarada yarasalar varmış. Brrr... Ben korkarım.", "Fener yandığında çok güzel olacak. Bir gece bütün köy izleyecek!"][Math.floor(clock) % 3]]]);
    }
  }
  function introTalk() {
    const N = "Bilge Nine";
    say([[N, nm() + "! Sonunda geldin. Kötü haberlerim var..."],
      [N, "Köyümüzün Büyük Feneri söndü! Gölge Büyücüsü üç ışık kristalini çalıp dört bir yana sakladı."],
      [N, "Fener yanmazsa köyü sonsuz gece kaplayacak. Kristalleri ancak sen geri getirebilirsin."],
      [N, "Al, bu dedenin kılıcı. Sana güveniyorum."]], () => {
      give({ item: "sword" }, () => { say([[N, "Doğudaki Gizemli Orman'a git. Köy Evleri'nden aşağı in, oradan doğuya."], [N, "Canın azalırsa çeşmeden su iç ya da Ada'ya uğra. Haydi, yolun açık olsun!"]]); });
    });
  }
  function fener() {
    const n = crystalsN();
    if (S.done) return say([[null, "Büyük Fener pırıl pırıl yanıyor. Işığı ta ormana kadar uzanıyor."]]);
    if (n < 3) return say([[null, "Büyük Fener sönük duruyor. Kristal yuvalarından " + n + " tanesi dolabilir.\nÜç kristal de gerekli: " + n + "/3"]]);
    // final
    say([[null, "Üç ışık kristalini Fener'in yuvalarına yerleştirdin..."]], () => {
      endT = 0.001; music(null); sfx.item();
    });
  }

  /* ---------- diyalog ---------- */
  let dlg = null, onDialogEnd = null;
  const dEl = $("dlg"), dName = $("dlgName"), dText = $("dlgText"), dOpts = $("dlgOpts"), dMore = $("dlgMore");
  function say(lines, cb) { dlg = { lines, i: 0, shown: 0, cb, opts: null }; onDialogEnd = null; showLine(); }
  function ask(name, text, opts, cb) { dlg = { lines: [[name, text]], i: 0, shown: 0, opts, sel: 0, acb: cb }; onDialogEnd = null; showLine(); }
  function showLine() {
    const [n, t] = dlg.lines[dlg.i]; dEl.hidden = false; dName.textContent = n || ""; dText.textContent = ""; dlg.full = t; dlg.shown = 0; dOpts.innerHTML = ""; dMore.hidden = true;
  }
  function dlgTick(dt) {
    if (!dlg) return;
    if (dlg.shown < dlg.full.length) {
      const before = Math.floor(dlg.shown); dlg.shown = Math.min(dlg.full.length, dlg.shown + dt * 45);
      if (Math.floor(dlg.shown) !== before) { dText.textContent = dlg.full.slice(0, Math.floor(dlg.shown)); if (before % 3 === 0) sfx.talk(); }
      if (dlg.shown >= dlg.full.length) lineDone();
    }
  }
  function lineDone() {
    dText.textContent = dlg.full;
    if (dlg.opts && !dOpts.children.length) { dlg.opts.forEach((o, i) => { const b = document.createElement("button"); b.type = "button"; b.textContent = o; b.className = i === dlg.sel ? "sel" : ""; b.onclick = (ev) => { ev.stopPropagation(); dlg.sel = i; advance(); }; dOpts.appendChild(b); }); }
    else dMore.hidden = false;
  }
  function advance() {
    if (!dlg) return;
    if (dlg.shown < dlg.full.length) { dlg.shown = dlg.full.length; lineDone(); return; }
    if (dlg.opts) { const cb = dlg.acb, s = dlg.sel; closeDlg(); sfx.sel(); cb(s); return; }
    dlg.i++;
    if (dlg.i < dlg.lines.length) { showLine(); return; }
    const cb = dlg.cb; closeDlg(); if (cb) cb(); else if (onDialogEnd) { const f = onDialogEnd; onDialogEnd = null; f(); }
  }
  function closeDlg() { dlg = null; dEl.hidden = true; }
  function dlgMove(d) { if (dlg && dlg.opts && dOpts.children.length) { dlg.sel = (dlg.sel + d + dlg.opts.length) % dlg.opts.length; [...dOpts.children].forEach((b, i) => b.className = i === dlg.sel ? "sel" : ""); sfx.sel(); } }

  /* ---------- girdi ---------- */
  const keys = {}; let pressA = false, pressB = false;
  const KM = { ArrowUp: "up", KeyW: "up", ArrowDown: "down", KeyS: "down", ArrowLeft: "left", KeyA: "left", ArrowRight: "right", KeyD: "right", Space: "a", KeyJ: "a", KeyE: "b", KeyK: "b", Enter: "b" };
  addEventListener("keydown", (e) => {
    if (e.target && e.target.tagName === "INPUT") return;
    if (e.code === "Escape" || e.code === "KeyP") { e.preventDefault(); toggleBag(); return; }
    const k = KM[e.code]; if (!k) return; e.preventDefault();
    if (!keys[k]) { if (k === "a") pressA = true; if (k === "b") pressB = true; if (dlg && (k === "left" || k === "up")) dlgMove(-1); if (dlg && (k === "right" || k === "down")) dlgMove(1); }
    keys[k] = true;
  });
  addEventListener("keyup", (e) => { const k = KM[e.code]; if (k) keys[k] = false; });
  addEventListener("blur", () => { for (const k in keys) keys[k] = false; });
  document.querySelectorAll("#pad .k").forEach((b) => {
    const k = b.dataset.k;
    const on = (e) => { e.preventDefault(); audio(); if (!keys[k]) { if (k === "a") pressA = true; if (k === "b") pressB = true; if (dlg && (k === "left" || k === "up")) dlgMove(-1); if (dlg && (k === "right" || k === "down")) dlgMove(1); } keys[k] = true; b.classList.add("on"); try { b.setPointerCapture(e.pointerId); } catch (x) {} };
    const off = (e) => { e.preventDefault(); keys[k] = false; b.classList.remove("on"); };
    b.addEventListener("pointerdown", on); b.addEventListener("pointerup", off); b.addEventListener("pointercancel", off); b.addEventListener("lostpointercapture", off);
    b.addEventListener("contextmenu", (e) => e.preventDefault());
  });
  dEl.addEventListener("pointerdown", (e) => { if (e.target.tagName !== "BUTTON") { e.preventDefault(); advance(); } });

  /* ---------- güncelleme ---------- */
  let state = "title";
  const paused = () => state !== "play";
  let fast = false; const timers = [];
  function later(ms, fn) { if (fast) fn(); else timers.push({ t: ms / 1000, fn }); }
  function update(dt) {
    clock += dt; if (state !== "play") return;
    for (let i = timers.length - 1; i >= 0; i--) { timers[i].t -= dt; if (timers[i].t <= 0) { const f = timers[i].fn; timers.splice(i, 1); f(); } }
    S.time += dt; shake = Math.max(0, shake - dt); flash = Math.max(0, flash - dt);
    if (banner) { banner.t -= dt; if (banner.t <= 0) banner = null; }
    parts = parts.filter((p) => { p.life -= dt; p.x += p.vx * dt; p.y += p.vy * dt; if (p.g) p.vy += 220 * dt; return p.life > 0; });
    dlgTick(dt);
    if (endT) { endT += dt; if (endT > 1.25 && !S.done) { S.done = 1; sfx.item(); later(400, () => music("win")); save(); for (let i = 0; i < 40; i++) parts.push({ x: 168, y: 8, vx: rnd(-90, 90), vy: rnd(-30, 80), life: rnd(.8, 1.6), col: ["#FFD166", "#fff", "#7DF9FF", "#FF7AD9"][i % 4], s: 2, g: 1 }); } if (endT > 6.5 && $("end").hidden) showEnd(); return; }
    if (slide) { slide.t += dt; if (slide.t >= slide.d) { const s = slide; slide = null; enterRoom(s.to, s.px, s.py, P.dir); } return; }
    if (fadeDir) { fade += fadeDir * dt * 4; if (fade >= 1 && fadeDir > 0) { fade = 1; fadeDir = -1; const f = fadeAct; fadeAct = null; f && f(); } else if (fade <= 0 && fadeDir < 0) { fade = 0; fadeDir = 0; } if (fadeDir > 0) return; }
    if (deadT > 0) { deadT -= dt; if (deadT <= 0) respawn(); return; }
    if (dlg) { if (pressA || pressB) advance(); pressA = pressB = false; return; }
    if (P.hold > 0) { P.hold -= dt; pressA = pressB = false; return; }
    if (pressB) { pressB = false; if (!interact()) attack(); }
    if (pressA) { pressA = false; if (!S.sword) interact(); else attack(); }
    P.inv = Math.max(0, P.inv - dt);
    // hareket
    let mx = (keys.right ? 1 : 0) - (keys.left ? 1 : 0), my = (keys.down ? 1 : 0) - (keys.up ? 1 : 0);
    if (P.atk > 0) { P.atk -= dt; swordHits(); mx = my = 0; }
    if (P.kbt > 0) { P.kbt -= dt; moveP(P.kbx * dt, P.kby * dt); }
    else if (mx || my) {
      if (mx && my) { const l = Math.SQRT1_2; mx *= l; my *= l; }
      if (Math.abs(mx) > Math.abs(my)) P.dir = mx > 0 ? 2 : 3; else if (my) P.dir = my > 0 ? 0 : 1;
      if (my && mx && !P.lockDir) { /* çaprazda son yönü koru */ }
      const sp = 74 * dt, bx = P.x, by = P.y; moveP(mx * sp, my * sp);
      P.moving = true; P.ft += dt; if (P.ft > .16) { P.ft = 0; P.frame++; }
      if (P.x === bx && P.y === by) { P.push += dt; if (P.push > .25) { const { tx, ty } = front(); if (tileAt(tx, ty) === "L") { P.push = -1; tryDoor(tx, ty); } } } else P.push = 0;
    } else { P.moving = false; P.push = 0; }
    checkEdges(); if (slide || fadeDir) return;
    checkLinks();
    // düşmanlar
    for (const e of enemies) updateEnemy(e, dt);
    enemies = enemies.filter((e) => e.hp > 0);
    if (room.clearChest && !S.opened[roomId + "@clear"] && !room.clearShown && enemies.length === 0) {
      const c = room.clearChest; if (live[c.y][c.x] !== "C") { live[c.y][c.x] = "C"; staticDirty = true; sfx.chest(); burst(c.x * T + 8, c.y * T + 8, "#FFD166", 16); banner = { text: "Bir sandık belirdi!", t: 1.6, small: 1 }; }
    }
    if (boss) updateBoss(dt);
    // mermiler
    for (const s of shots) {
      s.life -= dt;
      if (s.home && !s.friendly) { const dx = P.x + 8 - s.x, dy = P.y + 10 - s.y, d = Math.hypot(dx, dy) || 1, sp = Math.hypot(s.vx, s.vy); s.vx += (dx / d * sp - s.vx) * dt * .9; s.vy += (dy / d * sp - s.vy) * dt * .9; }
      if (s.friendly && boss) { const dx = boss.x + boss.w / 2 - s.x, dy = boss.y + boss.h / 2 - s.y, d = Math.hypot(dx, dy) || 1; s.vx += (dx / d * 130 - s.vx) * dt * 3; s.vy += (dy / d * 130 - s.vy) * dt * 3; }
      s.x += s.vx * dt; s.y += s.vy * dt;
      if (s.x < 0 || s.y < 0 || s.x > RW * T || s.y > RH * T) s.life = 0;
      if (s.kind === "spore" && solidAt(Math.floor(s.x / T), Math.floor(s.y / T)) && tileAt(Math.floor(s.x / T), Math.floor(s.y / T)) !== "B") s.life = 0;
      if (s.friendly) { if (boss && !boss.dead && (boss.st === "idle" || boss.st === "cast") && over({ x: s.x - 3, y: s.y - 3, w: 6, h: 6 }, bossBox())) { s.life = 0; boss.st = "daze"; boss.t = 2; boss.alpha = 1; hurtBoss(1); if (boss && !boss.dead) { boss.st = "daze"; boss.t = 2; } } }
      else if (over({ x: s.x - s.r + 1, y: s.y - s.r + 1, w: s.r * 2 - 2, h: s.r * 2 - 2 }, pbox())) { s.life = 0; hurtPlayer(s.dmg, s.x, s.y); }
    }
    shots = shots.filter((s) => s.life > 0);
    for (const h of hazards) { h.t -= dt; if (h.t <= 0 && !h.done) { h.done = 1; sfx.bump(); burst(h.x, h.y, "#8A8296", 10); shake = .1; if (Math.hypot(P.x + 8 - h.x, P.y + 12 - h.y) < 13) hurtPlayer(2, h.x, h.y - 10); } }
    hazards = hazards.filter((h) => h.t > -.3);
    // düşenler
    for (const d of drops) {
      d.t += dt; if (!d.still && d.t > 9) d.gone = 1;
      if (over({ x: d.x, y: d.y, w: d.type === "crystal" ? 16 : 9, h: d.type === "crystal" ? 16 : 9 }, pbox())) {
        d.gone = 1;
        if (d.type === "coin") { S.coins++; sfx.coin(); }
        else if (d.type === "gem") { S.coins += 5; sfx.coin(); }
        else if (d.type === "heart") { S.hp = Math.min(S.maxHp, S.hp + 2); sfx.heart(); }
        else if (d.type === "heartc") give({ heart: 1 });
        else if (d.type === "crystal") give({ item: "crystal" + d.ci });
      }
    }
    drops = drops.filter((d) => !d.gone);
    if (portal && Math.hypot(P.x + 8 - portal.x, P.y + 12 - portal.y) < 9 && !drops.length) { portal = null; sfx.stairs(); doFade(() => enterRoom("o:0,0", 10 * T, 6 * T, 0)); }
    for (const n of npcs) { n.t += dt; }
  }
  function moveP(dx, dy) {
    const b = pbox(), ox = b.x - P.x, oy = b.y - P.y;
    const lockEdge = !!boss || deadT > 0;
    if (dx) { const nx = P.x + dx, h = hitsSolid(nx + ox, P.y + oy, b.w, b.h); if (!h && !(lockEdge && (nx + ox < 0 || nx + ox + b.w > RW * T))) P.x = nx; else if (h && h.tx != null && !dy) nudge(h, 0); }
    if (dy) { const ny = P.y + dy, h = hitsSolid(P.x + ox, ny + oy, b.w, b.h); if (!h && !(lockEdge && (ny + oy < 0 || ny + oy + b.h > RH * T))) P.y = ny; else if (h && h.tx != null && !dx) nudge(h, 1); }
  }
  // köşelere takılmayı önle: kapıya/boşluğa doğru hafifçe kaydır
  function nudge(h, axisY) {
    const b = pbox();
    if (axisY) { const c = b.x + b.w / 2, tc = h.tx * T + 8; const side = c < tc ? -1 : 1; const ex = side < 0 ? h.tx * T - b.w : (h.tx + 1) * T; if (Math.abs((side < 0 ? b.x + b.w - h.tx * T : (h.tx + 1) * T - b.x)) < 6) { const nx = P.x + side * .8; if (!hitsSolid(nx + 3, P.y + 7, b.w, b.h)) P.x = nx; } void ex; }
    else { const c = b.y + b.h / 2, tc = h.ty * T + 8; const side = c < tc ? -1 : 1; if (Math.abs((side < 0 ? b.y + b.h - h.ty * T : (h.ty + 1) * T - b.y)) < 6) { const ny = P.y + side * .8; if (!hitsSolid(P.x + 3, ny + 7, b.w, b.h)) P.y = ny; } }
  }
  function checkEdges() {
    if (boss) return;
    const b = pbox(); let dx = 0, dy = 0;
    if (b.x < 0) dx = -1; else if (b.x + b.w > RW * T) dx = 1; else if (b.y < 0) dy = -1; else if (b.y + b.h > RH * T) dy = 1;
    if (!dx && !dy) return;
    const n = neighbor(roomId, dx, dy);
    if (!n) { P.x = clamp(P.x, -3, RW * T - 13); P.y = clamp(P.y, -7, RH * T - 16); return; }
    const px = dx ? (dx > 0 ? -2 : RW * T - 14) : P.x, py = dy ? (dy > 0 ? -6 : RH * T - 16) : P.y;
    const nextLive = buildLive(n);
    slide = { from: staticCv, to: n, toCv: renderStatic(n, nextLive), dx, dy, t: 0, d: fast ? 0 : .5, px, py, ox: P.x, oy: P.y };
  }
  function checkLinks() {
    const tx = Math.floor((P.x + 8) / T), ty = Math.floor((P.y + 12) / T), c = tileAt(tx, ty);
    if (!LINKT.has(c)) { linkArm = true; return; }
    if (!linkArm) return;
    const L = (room.links || {})[tx + "," + ty]; if (!L) return;
    linkArm = false;
    if (L.need === "lamp" && !S.lamp) { P.y += 8; P.dir = 0; say([[S.name, "İçerisi zifiri karanlık! Hiçbir şey göremiyorum.\nÖnce bir lamba bulmalıyım."]]); return; }
    sfx.stairs(); doFade(() => enterRoom(L.to, L.x * T, L.y * T - 4, L.dir));
  }
  function doFade(fn) { fadeDir = 1; fade = fast ? 1 : 0; fadeAct = fn; if (fast) { fadeDir = 0; fade = 0; fn(); } }
  function respawn() {
    S.deaths++; S.hp = S.maxHp; P.inv = 1.5;
    const r = W.rooms[S.room] && !W.rooms[S.room].boss ? S.room : W.start.room;
    doFade(() => enterRoom(r, S.sx * T, S.sy * T, 0));
    banner = { text: "Yeniden dene!", t: 2 };
  }

  function updateEnemy(e, dt) {
    e.t += dt; e.hurt = Math.max(0, e.hurt - dt);
    const d = EN[e.type], pcx = P.x + 8, pcy = P.y + 10, dx = pcx - (e.x + 8), dy = pcy - (e.y + 10), dist = Math.hypot(dx, dy) || 1;
    if (e.kbt > 0) { e.kbt -= dt; if (d.fly) { e.x = clamp(e.x + e.kbx * dt, 0, (RW - 1) * T); e.y = clamp(e.y + e.kby * dt, 0, (RH - 1) * T); } else moveBox(e, e.kbx * dt, e.kby * dt, 3, 8, 10, 7, 1); return; }
    if (e.type.endsWith("slime")) {
      e.st -= dt;
      if (e.st <= 0) { if (e.vx || e.vy) { e.vx = e.vy = 0; e.st = rnd(.6, 1.2); } else { const chase = Math.random() < .7 && dist < 140, a = chase ? Math.atan2(dy, dx) : rnd(0, 7), sp = e.type === "pslime" ? 62 : 46; e.vx = Math.cos(a) * sp; e.vy = Math.sin(a) * sp; e.st = .38; } }
      if (e.vx || e.vy) moveBox(e, e.vx * dt, e.vy * dt, 3, 8, 10, 7, 1);
    } else if (e.type === "beetle") {
      e.st -= dt;
      const aligned = (Math.abs(dx) < 8 && dist < 110) || (Math.abs(dy) < 8 && dist < 110);
      if (!e.charge && aligned && e.st < .8) { e.charge = .9; e.dir = Math.abs(dx) < 8 ? (dy > 0 ? 0 : 1) : (dx > 0 ? 2 : 3); }
      if (e.charge > 0) { e.charge -= dt; const [vx, vy] = DIRV[e.dir]; if (moveBox(e, vx * 115 * dt, vy * 115 * dt, 2, 6, 12, 9, 1)) e.charge = 0; if (e.charge <= 0) { e.charge = 0; e.st = 1.4; } }
      else { if (e.st <= 0) { e.dir = Math.floor(rnd(0, 4)); e.st = rnd(1, 2); } const [vx, vy] = DIRV[e.dir]; if (moveBox(e, vx * 34 * dt, vy * 34 * dt, 2, 6, 12, 9, 1)) e.st = 0; }
    } else if (e.type === "bat") {
      e.st -= dt; if (e.st <= 0) { const a = Math.atan2(dy, dx) + rnd(-1.3, 1.3); e.vx = Math.cos(a) * 58; e.vy = Math.sin(a) * 58; e.st = rnd(.4, .9); }
      e.x = clamp(e.x + e.vx * dt, T * .5, (RW - 1.5) * T); e.y = clamp(e.y + e.vy * dt, T * .5, (RH - 1.5) * T);
    } else if (e.type === "ghost") {
      const cyc = (e.t + e.phase) % 4.5; e.alpha = cyc > 3.4 ? .2 : cyc > 3.1 ? .55 : 1;
      e.x += dx / dist * 26 * dt; e.y += dy / dist * 26 * dt + Math.sin(e.t * 3) * .2;
    }
    const hb = { x: e.x + 3, y: e.y + 5, w: 10, h: 10 };
    if ((e.type !== "ghost" || e.alpha > .5) && over(hb, pbox())) hurtPlayer(d.dmg, e.x + 8, e.y + 10);
  }

  /* ---------- çizim ---------- */
  function draw() {
    ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.fillStyle = "#000"; ctx.fillRect(0, 0, 320, 200);
    if (state === "title" || !room) { drawTitleBg(); return; }
    const sx = shake > 0 ? Math.round(rnd(-2, 2)) : 0, sy = shake > 0 ? Math.round(rnd(-2, 2)) : 0;
    ctx.save(); ctx.beginPath(); ctx.rect(0, HUD, 320, 176); ctx.clip(); ctx.translate(sx, HUD + sy);
    if (slide) {
      const k = Math.min(1, slide.t / (slide.d || 1)), e = k * k * (3 - 2 * k), W2 = RW * T, H2 = RH * T;
      const ox = -slide.dx * W2 * e, oy = -slide.dy * H2 * e;
      ctx.drawImage(slide.from, ox, oy); ctx.drawImage(slide.toCv, ox + slide.dx * W2, oy + slide.dy * H2);
      const ppx = slide.ox + (slide.px + slide.dx * W2 - slide.ox) * e - slide.dx * W2 * e, ppy = slide.oy + (slide.py + slide.dy * H2 - slide.oy) * e - slide.dy * H2 * e;
      A.person(ctx, Math.round(ppx), Math.round(ppy), P.dir, Math.floor(slide.t * 7), "hero");
    } else drawRoom();
    ctx.restore();
    drawHUD();
    if (banner && !slide) drawBanner();
    if (fade > 0) { ctx.fillStyle = "rgba(0,0,0," + clamp(fade, 0, 1) + ")"; ctx.fillRect(0, HUD, 320, 176); }
    if (flash > 0) { ctx.fillStyle = "rgba(255,60,60," + flash * 1.6 + ")"; ctx.fillRect(0, HUD, 320, 176); }
    if (deadT > 0) { ctx.fillStyle = "rgba(20,0,10," + clamp(1.8 - deadT, 0, .8) + ")"; ctx.fillRect(0, HUD, 320, 176); if (deadT < 1.2) txt("Bayıldın...", 160, 110, 16, "#FF9C96", "center"); }
  }
  function drawRoom() {
    const th = theme(room);
    if (staticDirty || !staticCv) { staticCv = renderStatic(roomId, live, staticCv || undefined); staticDirty = false; }
    ctx.drawImage(staticCv, 0, 0);
    for (let ty = 0; ty < RH; ty++) for (let tx = 0; tx < RW; tx++) if (ANIM.has(live[ty][tx])) drawT(ctx, live[ty][tx], tx, ty, th, clock);
    // açılan sandık parıltısı
    if (room.clearChest && !S.opened[roomId + "@clear"] && live[room.clearChest.y][room.clearChest.x] === "C") { const c = room.clearChest; ctx.fillStyle = "rgba(255,209,102," + (.25 + .2 * Math.sin(clock * 5)) + ")"; ctx.fillRect(c.x * T - 2, c.y * T - 2, 20, 20); A.chest(ctx, c.x * T, c.y * T, false); }
    if (roomId === "o:0,0") drawFener();
    // nesneler y sırasına göre
    const list = [];
    for (const d of drops) list.push({ y: d.y + 8, f: () => drawDrop(d) });
    for (const n of npcs) list.push({ y: n.y + 14, f: () => A.person(ctx, n.x, n.y, n.dir, Math.floor(n.t * 1.5) % 2 && n.id === "can" ? 1 : 0, n.pal) });
    for (const e of enemies) list.push({ y: e.y + 14 + (EN[e.type].fly ? 10 : 0), f: () => drawEnemy(e) });
    if (boss) list.push({ y: boss.y + boss.h, f: drawBoss });
    list.push({ y: P.y + 14, f: drawPlayer });
    list.sort((a, b) => a.y - b.y).forEach((o) => o.f());
    if (portal) drawPortal();
    for (const h of hazards) drawHazard(h);
    for (const s of shots) drawShot(s);
    for (const p of parts) { ctx.fillStyle = p.col; ctx.fillRect(Math.round(p.x), Math.round(p.y), p.s, p.s); }
    if (room.dark) drawDark();
    if (room.area === "village" && !S.done) { ctx.fillStyle = "rgba(40,20,90,.22)"; ctx.fillRect(0, 0, 320, 176); }
    if (room.area === "tower") { ctx.fillStyle = "rgba(30,10,60,.15)"; ctx.fillRect(0, 0, 320, 176); }
    if (boss) drawBossBar();
    if (endT) drawEnding();
  }
  let darkCv = null;
  function drawDark() {
    if (!darkCv) { darkCv = document.createElement("canvas"); darkCv.width = 320; darkCv.height = 176; }
    const d = darkCv.getContext("2d"); d.globalCompositeOperation = "source-over"; d.clearRect(0, 0, 320, 176); d.fillStyle = "rgba(6,4,18,.95)"; d.fillRect(0, 0, 320, 176);
    d.globalCompositeOperation = "destination-out";
    const hole = (x, y, r) => { const g = d.createRadialGradient(x, y, r * .25, x, y, r); g.addColorStop(0, "rgba(0,0,0,1)"); g.addColorStop(.7, "rgba(0,0,0,.75)"); g.addColorStop(1, "rgba(0,0,0,0)"); d.fillStyle = g; d.beginPath(); d.arc(x, y, r, 0, 7); d.fill(); };
    hole(P.x + 8, P.y + 9, (S.lamp ? 64 : 22) + Math.sin(clock * 6) * 1.5);
    for (let ty = 0; ty < RH; ty++) for (let tx = 0; tx < RW; tx++) if (live[ty][tx] === "t") hole(tx * T + 8, ty * T + 8, 34 + Math.sin(clock * 9 + tx) * 2);
    for (const s of shots) hole(s.x, s.y, 14);
    d.globalCompositeOperation = "source-over";
    ctx.drawImage(darkCv, 0, 0);
    // lamba ışığı sarımsı
    if (S.lamp) { const g = ctx.createRadialGradient(P.x + 8, P.y + 9, 4, P.x + 8, P.y + 9, 60); g.addColorStop(0, "rgba(255,210,120,.18)"); g.addColorStop(1, "rgba(255,210,120,0)"); ctx.fillStyle = g; ctx.fillRect(0, 0, 320, 176); }
  }
  function drawPlayer() {
    if (P.inv > 0 && Math.floor(P.inv * 20) % 2 && deadT <= 0) return;
    const x = Math.round(P.x), y = Math.round(P.y);
    if (deadT > 0) { ctx.save(); ctx.translate(x + 8, y + 10); ctx.rotate(Math.min(1, (1.8 - deadT) * 2) * Math.PI / 2); A.person(ctx, -8, -10, 0, 0, "hero"); ctx.restore(); return; }
    if (P.hold > 0) { A.person(ctx, x, y, 0, 0, "hero"); drawIcon(ctx, P.holdItem, x, y - 15, clock); return; }
    const atk = P.atk > 0, d = P.dir;
    if (atk && d === 1) drawSword(x, y);
    A.person(ctx, x, y, d, P.moving ? P.frame : 0, "hero");
    if (atk && d !== 1) drawSword(x, y);
    // lamba belde
    if (S.lamp && room.dark && d !== 1) { A.px(ctx, x + (d === 3 ? 2 : 11), y + 10, 3, 4, "#C9A24A"); A.px(ctx, x + (d === 3 ? 3 : 12), y + 11, 1, 2, "#FFE680"); }
  }
  function drawSword(x, y) {
    const k = 1 - P.atk / .26, base = [Math.PI / 2, -Math.PI / 2, 0, Math.PI][P.dir], a = base + (-1.3 + k * 2.6) * (P.dir === 3 || P.dir === 0 ? -1 : 1);
    const cx = x + 8 + DIRV[P.dir][0] * 3, cy = y + 10 + DIRV[P.dir][1] * 2, L = 14, s2 = S.sword >= 2;
    ctx.save(); ctx.lineCap = "square";
    ctx.strokeStyle = "rgba(255,255,255,.35)"; ctx.lineWidth = 6; ctx.beginPath(); ctx.arc(cx, cy, L - 2, a - .7 * Math.sign(.5 - (P.dir === 3 || P.dir === 0 ? 1 : 0) || 1), a); ctx.stroke();
    ctx.strokeStyle = "#1B1730"; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(cx + Math.cos(a) * 4, cy + Math.sin(a) * 4); ctx.lineTo(cx + Math.cos(a) * L, cy + Math.sin(a) * L); ctx.stroke();
    ctx.strokeStyle = s2 ? "#9FF7FF" : "#E8EEF8"; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(cx + Math.cos(a) * 5, cy + Math.sin(a) * 5); ctx.lineTo(cx + Math.cos(a) * (L - 1), cy + Math.sin(a) * (L - 1)); ctx.stroke();
    ctx.fillStyle = "#C9A24A"; ctx.fillRect(Math.round(cx + Math.cos(a) * 4) - 2, Math.round(cy + Math.sin(a) * 4) - 2, 4, 4);
    ctx.restore();
  }
  function drawEnemy(e) {
    const x = Math.round(e.x), y = Math.round(e.y), h = e.hurt > 0 && Math.floor(e.hurt * 30) % 2;
    if (e.type.endsWith("slime")) A.slime(ctx, x, y, e.t + e.phase, EN[e.type].col, h);
    else if (e.type === "bat") A.bat(ctx, x, y, e.t, h);
    else if (e.type === "ghost") { ctx.globalAlpha = e.alpha; A.ghost(ctx, x, y, e.t, h); ctx.globalAlpha = 1; }
    else if (e.type === "beetle") drawBeetle(x, y, e, h);
  }
  function drawBeetle(x, y, e, h) {
    ctx.save(); ctx.translate(x + 8, y + 9); ctx.rotate([0, Math.PI, -Math.PI / 2, Math.PI / 2][e.dir]);
    ctx.fillStyle = "rgba(0,0,0,.25)"; ctx.beginPath(); ctx.ellipse(0, 5, 7, 3, 0, 0, 7); ctx.fill();
    const leg = Math.sin(e.t * (e.charge ? 30 : 14)) * 1.5; ctx.fillStyle = "#1B1730";
    for (const s of [-1, 1]) for (let i = -1; i <= 1; i++) ctx.fillRect(s * 6 - (s < 0 ? 2 : 0), i * 3 + (i % 2 ? leg : -leg) - 1, 3, 1.5);
    ctx.fillStyle = h ? "#fff" : e.charge ? "#E8463F" : "#B8352F"; ctx.beginPath(); ctx.ellipse(0, -1, 5.5, 6.5, 0, 0, 7); ctx.fill();
    ctx.fillStyle = "#1B1730"; ctx.fillRect(-.5, -6, 1, 11); ctx.beginPath(); ctx.arc(0, 6, 3.5, 0, 7); ctx.fill();
    ctx.fillStyle = "#1B1730"; ctx.fillRect(-3, -2, 2, 2); ctx.fillRect(1, 1, 2, 2);
    ctx.fillStyle = "#FFD166"; ctx.fillRect(-2, 7, 1, 1); ctx.fillRect(1, 7, 1, 1);
    ctx.fillStyle = "rgba(255,255,255,.5)"; ctx.fillRect(-4, -5, 2, 2);
    ctx.restore();
  }
  function drawDrop(d) {
    const bob = d.still ? Math.sin(d.t * 3) * 2 : 0, blink = !d.still && d.t > 7 && Math.floor(d.t * 10) % 2;
    if (blink) return;
    ctx.fillStyle = "rgba(0,0,0,.25)"; ctx.fillRect(d.x + 1, d.y + 8, 7, 2);
    if (d.type === "coin") A.coin(ctx, d.x, d.y + bob, d.t);
    else if (d.type === "gem") { A.px(ctx, d.x + 2, d.y + 1, 5, 6, "#3FD0FF"); A.px(ctx, d.x + 3, d.y, 3, 8, "#3FD0FF"); A.px(ctx, d.x + 3, d.y + 2, 1, 2, "#fff"); }
    else if (d.type === "heart") A.heart(ctx, d.x + 1, d.y + 2 + bob, 1);
    else if (d.type === "heartc") { ctx.save(); ctx.translate(d.x, d.y + bob); ctx.scale(2, 2); A.heart(ctx, 0, 0, 1); ctx.restore(); }
    else if (d.type === "crystal") A.crystal(ctx, d.x, d.y + bob, d.t, ["#7DF9FF", "#FF7AD9", "#FFE066"][d.ci]);
  }
  function drawIcon(c, icon, x, y, t) {
    if (icon === "sword" || icon === "sword2") A.swordIcon(c, x, y);
    else if (icon === "lamp") A.lantern(c, x, y, true);
    else if (icon === "key") A.key(c, x + 5, y + 2);
    else if (icon === "heart") { c.save(); c.translate(x + 1, y + 2); c.scale(2, 2); A.heart(c, 0, 0, 1); c.restore(); }
    else if (icon === "coins") A.coin(c, x + 4, y + 4, t);
    else if (icon && icon.startsWith("crystal")) A.crystal(c, x, y, t, ["#7DF9FF", "#FF7AD9", "#FFE066"][+icon.slice(7)]);
  }
  function drawShot(s) {
    if (s.kind === "spore") { ctx.fillStyle = "#E9C46A"; ctx.beginPath(); ctx.arc(s.x, s.y, s.r, 0, 7); ctx.fill(); ctx.fillStyle = "#FFF3C4"; ctx.fillRect(s.x - 1, s.y - 1, 2, 2); }
    else if (s.kind === "orb") A.spark(ctx, s.x, s.y, clock, s.friendly ? "#7DF9FF" : "#B05CFF");
    else { ctx.fillStyle = "#3A1A6A"; ctx.beginPath(); ctx.arc(s.x, s.y, s.r + 1, 0, 7); ctx.fill(); ctx.fillStyle = "#8A4AE0"; ctx.beginPath(); ctx.arc(s.x, s.y, s.r - 1, 0, 7); ctx.fill(); }
  }
  function drawHazard(h) {
    if (!h.done) {
      const k = clamp(1 - h.t / 1, 0, 1); ctx.fillStyle = "rgba(0,0,0," + (.2 + k * .3) + ")"; ctx.beginPath(); ctx.ellipse(h.x, h.y, 4 + k * 6, 2 + k * 3, 0, 0, 7); ctx.fill();
      const ry = h.y - h.t * 120; if (ry > -20) { ctx.fillStyle = "#7A7486"; ctx.beginPath(); ctx.arc(h.x, ry - 6, 6, 0, 7); ctx.fill(); ctx.fillStyle = "#A8A2B4"; ctx.fillRect(h.x - 3, ry - 10, 3, 2); }
    }
  }
  function drawPortal() {
    const { x, y } = portal; for (let i = 0; i < 3; i++) { ctx.strokeStyle = ["#7DF9FF", "#B98CFF", "#FFE066"][i]; ctx.lineWidth = 2; ctx.beginPath(); ctx.ellipse(x, y, 10 - i * 3 + Math.sin(clock * 4 + i) * 1.5, 6 - i * 1.5, 0, 0, 7); ctx.stroke(); }
    ctx.fillStyle = "rgba(180,140,255,.3)"; ctx.beginPath(); ctx.ellipse(x, y, 10, 6, 0, 0, 7); ctx.fill();
    if (Math.random() < .3) parts.push({ x: x + rnd(-8, 8), y, vx: 0, vy: -30, life: .6, col: "#E9DCFF", s: 1 });
  }
  function drawBoss() {
    const b = boss, x = Math.round(b.x), y = Math.round(b.y), h = b.hurt > 0 && Math.floor(b.hurt * 30) % 2;
    if (b.kind === "mantar") {
      const z = b.z || 0, sq = b.st === "land" ? Math.max(0, b.t) * 6 : b.st === "idle" ? Math.sin(b.anim * 4) : 0;
      ctx.fillStyle = "rgba(0,0,0,.3)"; ctx.beginPath(); ctx.ellipse(x + 16, y + 30, 14 - z / 6, 4, 0, 0, 7); ctx.fill();
      ctx.save(); ctx.translate(x + 16, y + 30 - z); ctx.scale(1 + sq * .04, 1 - sq * .04);
      // sap
      ctx.fillStyle = h ? "#fff" : "#F1E3C4"; ctx.fillRect(-8, -14, 16, 14); ctx.fillStyle = "#D8C49C"; ctx.fillRect(4, -14, 4, 14);
      ctx.fillStyle = "#1B1730"; ctx.fillRect(-5, -10, 3, 3); ctx.fillRect(2, -10, 3, 3); ctx.fillRect(-6, -12, 4, 1); ctx.fillRect(2, -12, 4, 1);
      ctx.fillRect(-3, -5, 6, 2); ctx.fillStyle = "#fff"; ctx.fillRect(-2, -5, 1, 1); ctx.fillRect(1, -5, 1, 1);
      // şapka
      ctx.fillStyle = "#1B1730"; ctx.beginPath(); ctx.ellipse(0, -15, 17, 13, 0, Math.PI, 0); ctx.closePath(); ctx.fill();
      ctx.fillStyle = h ? "#fff" : b.hp <= 5 ? "#B03A8C" : "#D8463F"; ctx.beginPath(); ctx.ellipse(0, -15, 16, 12, 0, Math.PI, 0); ctx.closePath(); ctx.fill();
      ctx.fillStyle = "#fff"; [[-9, -19, 3], [1, -24, 3.5], [9, -18, 2.5], [-3, -17, 2]].forEach(([a, c, r]) => { ctx.beginPath(); ctx.arc(a, c, r, 0, 7); ctx.fill(); });
      ctx.fillStyle = "rgba(0,0,0,.2)"; ctx.fillRect(-16, -16, 32, 2);
      ctx.restore();
    } else if (b.kind === "golem") {
      const st = b.st === "stun", wob = b.st === "charge" ? Math.sin(b.anim * 30) * 1 : 0;
      ctx.fillStyle = "rgba(0,0,0,.3)"; ctx.beginPath(); ctx.ellipse(x + 14, y + 27, 14, 4, 0, 0, 7); ctx.fill();
      ctx.save(); ctx.translate(x + 14, y + 14 + wob);
      const body = h ? "#fff" : "#7E7690", dark = "#4E4862";
      ctx.fillStyle = "#1B1730"; ctx.fillRect(-14, -12, 28, 25); ctx.fillStyle = body; ctx.fillRect(-13, -11, 26, 23);
      ctx.fillStyle = dark; ctx.fillRect(-13, 6, 26, 6); ctx.fillRect(-4, -11, 1, 10); ctx.fillRect(6, -2, 1, 8);
      ctx.fillStyle = "#9A92AC"; ctx.fillRect(-11, -9, 8, 3); ctx.fillStyle = "#4FA855"; ctx.fillRect(-13, -11, 9, 2); ctx.fillRect(5, -11, 6, 2);
      // kollar
      ctx.fillStyle = "#1B1730"; ctx.fillRect(-19, -4, 7, 13); ctx.fillRect(12, -4, 7, 13); ctx.fillStyle = body; ctx.fillRect(-18, -3, 5, 11); ctx.fillRect(13, -3, 5, 11);
      // gözler
      const eye = st ? "#555" : b.st === "look" ? "#FF5A1F" : "#FFB020";
      ctx.fillStyle = eye; if (st) { ctx.fillRect(-7, -4, 5, 1); ctx.fillRect(3, -4, 5, 1); } else { ctx.fillRect(-7, -5, 4, 3); ctx.fillRect(3, -5, 4, 3); }
      ctx.fillStyle = "#1B1730"; ctx.fillRect(-4, 2, 9, 2);
      ctx.restore();
      if (st) for (let i = 0; i < 3; i++) { const a = b.anim * 4 + i * 2.1; A.px(ctx, Math.round(x + 14 + Math.cos(a) * 12), Math.round(y - 4 + Math.sin(a) * 3), 3, 3, "#FFE066"); }
    } else if (b.kind === "wizard") {
      ctx.globalAlpha = b.alpha;
      const fl = b.st === "daze" ? 0 : Math.sin(b.anim * 3) * 2, dz = b.st === "daze";
      ctx.fillStyle = "rgba(0,0,0,.3)"; ctx.beginPath(); ctx.ellipse(x + 8, y + 24, 7, 2.5, 0, 0, 7); ctx.fill();
      ctx.save(); ctx.translate(x + 8, y + 12 + fl + (dz ? 4 : 0));
      if (b.st === "cast") { const g = ctx.createRadialGradient(0, -2, 1, 0, -2, 18); g.addColorStop(0, "rgba(176,92,255,.7)"); g.addColorStop(1, "rgba(176,92,255,0)"); ctx.fillStyle = g; ctx.beginPath(); ctx.arc(0, -2, 18, 0, 7); ctx.fill(); }
      ctx.fillStyle = "#1B1730"; ctx.beginPath(); ctx.moveTo(0, -17); ctx.lineTo(9, 12); ctx.lineTo(-9, 12); ctx.closePath(); ctx.fill();
      ctx.fillStyle = h ? "#fff" : b.hp <= 4 ? "#5A1A4A" : "#2E1F5E"; ctx.beginPath(); ctx.moveTo(0, -15); ctx.lineTo(8, 11); ctx.lineTo(-8, 11); ctx.closePath(); ctx.fill();
      ctx.fillStyle = "#4A3590"; ctx.fillRect(-1, -6, 2, 17);
      ctx.fillStyle = "#0B0816"; ctx.beginPath(); ctx.arc(0, -6, 4.5, 0, 7); ctx.fill();
      ctx.fillStyle = dz ? "#888" : "#FF5AD9"; if (dz) { ctx.fillRect(-3, -7, 2, 1); ctx.fillRect(1, -7, 2, 1); } else { ctx.fillRect(-3, -7, 2, 2); ctx.fillRect(1, -7, 2, 2); }
      ctx.fillStyle = "#8A6A20"; ctx.fillRect(9, -12, 2, 24); ctx.fillStyle = b.st === "cast" ? "#fff" : "#B05CFF"; ctx.beginPath(); ctx.arc(10, -13, 3, 0, 7); ctx.fill();
      ctx.restore(); ctx.globalAlpha = 1;
      if (dz) for (let i = 0; i < 3; i++) { const a = b.anim * 4 + i * 2.1; A.px(ctx, Math.round(x + 8 + Math.cos(a) * 9), Math.round(y + 2 + Math.sin(a) * 3), 2, 2, "#FFE066"); }
    }
  }
  function drawBossBar() {
    const b = boss; ctx.fillStyle = "rgba(15,12,34,.85)"; ctx.fillRect(72, 2, 176, 20); ctx.fillStyle = "#3B3470"; ctx.fillRect(78, 15, 164, 4);
    ctx.fillStyle = "#E8463F"; ctx.fillRect(78, 15, 164 * Math.max(0, b.hp) / b.max, 4); ctx.fillStyle = "#FF9C96"; ctx.fillRect(78, 15, 164 * Math.max(0, b.hp) / b.max, 1); txt(b.name, 160, 8, 8, "#FFD166", "center");
  }
  function drawFenerBase(c) {
    // kaide (statik)
    A.px(c, 146, 52, 44, 12, "#7A7A86"); A.px(c, 146, 52, 44, 2, "#A8A8B4"); A.px(c, 146, 62, 44, 2, "#4E4E5A");
    for (let i = 0; i < 4; i++) A.px(c, 150 + i * 11, 54, 1, 8, "#5E5E6A");
    A.px(c, 163, 56, 10, 8, "#3A2A1A"); A.px(c, 164, 57, 8, 7, "#5A3A1E");
  }
  function drawFener() {
    const lit = S.done || (endT && endT > 1.2);
    ctx.fillStyle = "#1B1730"; ctx.beginPath(); ctx.moveTo(149, 53); ctx.lineTo(157, 15); ctx.lineTo(179, 15); ctx.lineTo(187, 53); ctx.fill();
    ctx.fillStyle = "#F4EEDB"; ctx.beginPath(); ctx.moveTo(151, 52); ctx.lineTo(158, 16); ctx.lineTo(178, 16); ctx.lineTo(185, 52); ctx.fill();
    ctx.fillStyle = "#D8463F"; ctx.beginPath(); ctx.moveTo(155.5, 30); ctx.lineTo(156.8, 24); ctx.lineTo(179.2, 24); ctx.lineTo(180.5, 30); ctx.fill();
    ctx.beginPath(); ctx.moveTo(152.6, 46); ctx.lineTo(153.8, 40); ctx.lineTo(182.2, 40); ctx.lineTo(183.4, 46); ctx.fill();
    ctx.fillStyle = "rgba(0,0,0,.12)"; ctx.beginPath(); ctx.moveTo(170, 16); ctx.lineTo(178, 16); ctx.lineTo(185, 52); ctx.lineTo(172, 52); ctx.fill();
    A.px(ctx, 152, 12, 32, 4, "#4E4E5A"); A.px(ctx, 152, 12, 32, 1, "#7A7A86");
    A.px(ctx, 158, 4, 20, 8, "#1B1730"); A.px(ctx, 159, 5, 18, 7, lit ? "#FFE680" : "#3A4A6A");
    A.px(ctx, 164, 5, 1, 7, "#1B1730"); A.px(ctx, 171, 5, 1, 7, "#1B1730");
    ctx.fillStyle = "#D8463F"; ctx.beginPath(); ctx.moveTo(156, 5); ctx.lineTo(180, 5); ctx.lineTo(168, -2); ctx.fill();
    // kristal yuvaları
    for (let i = 0; i < 3; i++) { const has = S.crystals[i]; A.px(ctx, 160 + i * 6, 46, 4, 4, "#1B1730"); if (has) A.px(ctx, 161 + i * 6, 47, 2, 2, lit ? "#fff" : ["#7DF9FF", "#FF7AD9", "#FFE066"][i]); }
    if (lit) {
      const g = ctx.createRadialGradient(168, 8, 2, 168, 8, 90); g.addColorStop(0, "rgba(255,236,150,.75)"); g.addColorStop(.3, "rgba(255,210,100,.25)"); g.addColorStop(1, "rgba(255,210,100,0)");
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(168, 8, 90, 0, 7); ctx.fill();
      const a = clock * 1.4; ctx.fillStyle = "rgba(255,240,180,.16)";
      for (const s of [0, Math.PI]) { ctx.beginPath(); ctx.moveTo(168, 8); ctx.arc(168, 8, 260, a + s - .16, a + s + .16); ctx.closePath(); ctx.fill(); }
    } else if (crystalsN()) { ctx.fillStyle = "rgba(125,249,255," + (.06 + .04 * Math.sin(clock * 2)) + ")"; ctx.beginPath(); ctx.arc(168, 48, 14, 0, 7); ctx.fill(); }
  }
  function drawEnding() {
    const k = endT;
    if (k < 1.2) { for (let i = 0; i < 3; i++) { const t = clamp(k / 1.2 - i * .15, 0, 1); const x = 168 + (i - 1) * 30 * (1 - t), y = 140 - t * 132; A.crystal(ctx, x - 8, y - 8, clock, ["#7DF9FF", "#FF7AD9", "#FFE066"][i]); } }
    if (k > 1.2 && k < 1.6) { ctx.fillStyle = "rgba(255,255,230," + (1 - (k - 1.2) / .4) + ")"; ctx.fillRect(0, 0, 320, 176); }
    if (k > 2) txt("FENER YANDI!", 160, 100, 16, "#FFD166", "center", true);
  }
  function txt(s, x, y, size, col, align, shadow) {
    ctx.font = size + 'px "Press Start 2P", monospace'; ctx.textAlign = align || "left"; ctx.textBaseline = "middle";
    if (shadow !== false) { ctx.fillStyle = "#1B1730"; ctx.fillText(s, x + 1, y + 1); }
    ctx.fillStyle = col; ctx.fillText(s, x, y);
  }
  function drawHUD() {
    ctx.fillStyle = "#0F0C22"; ctx.fillRect(0, 0, 320, HUD); ctx.fillStyle = "#3B3470"; ctx.fillRect(0, HUD - 2, 320, 2);
    if (!S) return;
    const n = S.maxHp / 2;
    for (let i = 0; i < n; i++) { const v = S.hp - i * 2, f = v >= 2 ? 1 : v === 1 ? .5 : 0; A.heart(ctx, 6 + (i % 7) * 9, n > 7 && i >= 7 ? 13 : 8 + (n > 7 ? -3 : 0), f); }
    A.coin(ctx, 128, 7, 0); txt(String(S.coins).padStart(3, "0"), 140, 12, 8, "#FFD166");
    const kk = room ? S.keys[room.area] || 0 : 0; if (kk) { A.key(ctx, 176, 6); txt("×" + kk, 184, 12, 8, "#fff"); }
    for (let i = 0; i < 3; i++) { const x = 228 + i * 14; A.px(ctx, x, 5, 12, 14, "#1C1840"); if (S.crystals[i]) { ctx.save(); ctx.translate(x - 2, 4); ctx.scale(1, 1); A.crystal(ctx, 0, 0, clock + i, ["#7DF9FF", "#FF7AD9", "#FFE066"][i]); ctx.restore(); } else { A.px(ctx, x + 5, 9, 2, 6, "#3B3470"); } }
    if (S.sword) { ctx.save(); ctx.translate(276, 4); A.swordIcon(ctx, 0, 0); ctx.restore(); }
    if (S.lamp) { ctx.save(); ctx.translate(296, 4); A.lantern(ctx, 0, 0, true); ctx.restore(); }
  }
  function drawBanner() {
    const a = Math.min(1, banner.t * 2), y = banner.small ? 186 : 70;
    ctx.globalAlpha = a; const w = banner.text.length * 8 + 24;
    ctx.fillStyle = "rgba(15,12,34,.85)"; ctx.fillRect(160 - w / 2, y - 10, w, 20); ctx.fillStyle = "#FFD166"; ctx.fillRect(160 - w / 2, y + 9, w, 1);
    txt(banner.text, 160, y, 8, banner.small ? "#E9E4FF" : "#FFD166", "center"); ctx.globalAlpha = 1;
  }
  // başlık arka planı: gece köyü ve sönük fener
  function drawTitleBg() {
    const g = ctx.createLinearGradient(0, 0, 0, 200); g.addColorStop(0, "#0B0820"); g.addColorStop(1, "#2B2458"); ctx.fillStyle = g; ctx.fillRect(0, 0, 320, 200);
    for (let i = 0; i < 40; i++) { const x = A.hash(i, 1) * 320, y = A.hash(i, 2) * 120; ctx.fillStyle = "rgba(255,255,255," + (.3 + .5 * Math.abs(Math.sin(clock + i))) + ")"; ctx.fillRect(x | 0, y | 0, 1, 1); }
    ctx.fillStyle = "#1A3A2A"; for (let x = 0; x < 320; x += 12) { ctx.beginPath(); ctx.arc(x, 170 + Math.sin(x) * 4, 12, 0, 7); ctx.fill(); }
    ctx.fillStyle = "#123020"; ctx.fillRect(0, 175, 320, 25);
  }

  /* ---------- bitiş ---------- */
  function showEnd() {
    state = "end"; const m = Math.floor(S.time / 60), s = Math.floor(S.time % 60);
    $("endTx").textContent = "Tebrikler " + S.name + "! Köy yeniden aydınlandı.";
    $("endStats").innerHTML = "<span><b>" + m + ":" + String(s).padStart(2, "0") + "</b>Süre</span><span><b>" + S.coins + "</b>Altın</span><span><b>" + S.maxHp / 2 + "</b>Kalp</span><span><b>" + S.deaths + "</b>Bayılma</span>";
    $("end").hidden = false; endT = 0;
  }
  $("endGo").onclick = () => { $("end").hidden = true; state = "play"; music("win"); };
  $("endNew").onclick = () => { $("end").hidden = true; newGame(); };

  /* ---------- çanta ---------- */
  function goalText() {
    if (S.done) return "Köy kurtuldu! İstersen dolaş, altın topla.";
    if (!S.sword) return "Meydandaki Bilge Nine ile konuş.";
    const n = crystalsN();
    if (n === 3) return "Köy Meydanı'na dön ve kristalleri Fener'e yerleştir.";
    if (n === 2) return "Eski Kule'ye git (ormanın güneyi) ve Gölge Büyücüsü'nü yen.";
    if (!S.lamp) return "Gizemli Orman'ın kuzeyindeki Lamba Korusu'nda canavarları yen.";
    if (!S.crystals[0]) return "Mantar Çayırı'nda Dev Mantar'ı yen (Derin Orman'ın kuzeyi).";
    return "Kristal Mağarası'na gir (Mağara Ağzı) ve Taş Dev'i bul.";
  }
  function toggleBag() {
    if (state === "play" && !dlg && !endT) {
      state = "bag"; $("bag").hidden = false; renderBag(); $("resume").focus();
    } else if (state === "bag") { state = "play"; $("bag").hidden = true; }
  }
  function slot(label, got, drawer, extra) {
    const d = document.createElement("div"); d.className = "slot" + (got ? " got" : "");
    const c = document.createElement("canvas"); c.width = c.height = 16; const x = c.getContext("2d"); if (got) drawer(x); else { x.fillStyle = "#3B3470"; x.font = "12px sans-serif"; x.fillText("?", 4, 13); }
    d.appendChild(c); d.appendChild(document.createTextNode(got ? label + (extra || "") : "???")); return d;
  }
  function renderBag() {
    const inv = $("inv"); inv.innerHTML = "";
    inv.appendChild(slot(S.sword >= 2 ? "Güçlü Kılıç" : "Kılıç", S.sword, (x) => A.swordIcon(x, 0, 0)));
    inv.appendChild(slot("Lamba", S.lamp, (x) => A.lantern(x, 0, 0, true)));
    inv.appendChild(slot("Kalp", 1, (x) => { x.save(); x.translate(1, 2); x.scale(2, 2); A.heart(x, 0, 0, 1); x.restore(); }, " ×" + S.maxHp / 2));
    inv.appendChild(slot("Altın", 1, (x) => A.coin(x, 4, 4, 0), " " + S.coins));
    ["Orman", "Mağara", "Kule"].forEach((n, i) => inv.appendChild(slot(n + " Kristali", S.crystals[i], (x) => A.crystal(x, 0, 0, 1, ["#7DF9FF", "#FF7AD9", "#FFE066"][i]))));
    const k = S.keys.cave + S.keys.tower; inv.appendChild(slot("Anahtar", k, (x) => A.key(x, 5, 2), " ×" + k));
    $("goal").textContent = goalText();
    $("tip").textContent = ["İpucu: Çalıları kes, altın ve kalp çıkabilir.", "İpucu: Meydandaki çeşmeden su içersen canın dolar.", "İpucu: Demirci Usta altınla kılıcını güçlendirir.", "İpucu: Boss odasından kaçamazsın, ama bayılırsan son girdiğin odadan başlarsın."][Math.floor(clock / 5) % 4];
    drawMap();
  }
  function drawMap() {
    const c = $("map"), x = c.getContext("2d"), L = layerOf(roomId);
    x.fillStyle = "#0F0C22"; x.fillRect(0, 0, c.width, c.height);
    const ids = Object.keys(W.rooms).filter((id) => layerOf(id) === L), cw = 26, ch = 16;
    let minx = 9, miny = 9; ids.forEach((id) => { const [a, b] = xyOf(id); minx = Math.min(minx, a); miny = Math.min(miny, b); });
    const cols = { village: "#5DB34A", forest: "#2E7A36", cave: "#6A6488", tower: "#6A5592" };
    ids.forEach((id) => {
      const [a, b] = xyOf(id), r = W.rooms[id], px = 4 + (a - minx) * (cw + 2), py = 4 + (b - miny) * (ch + 2);
      x.fillStyle = S.visited[id] ? cols[r.area] : "#221D47"; x.fillRect(px, py, cw, ch);
      if (r.boss && !S.bosses[r.boss] && S.visited[id]) { x.fillStyle = "#E8463F"; x.fillRect(px + cw / 2 - 2, py + ch / 2 - 2, 4, 4); }
      if (id === roomId) { x.strokeStyle = "#FFD166"; x.lineWidth = 2; x.strokeRect(px + 1, py + 1, cw - 2, ch - 2); }
    });
    x.fillStyle = "#A9A2C8"; x.font = "8px sans-serif"; x.fillText({ o: "Dış dünya", c: "Mağara", t: "Kule" }[L], 4, c.height - 3);
  }
  $("pause").onclick = () => { audio(); toggleBag(); };
  $("resume").onclick = () => toggleBag();
  $("toTitle").onclick = () => { $("bag").hidden = true; showTitle(); };
  const muteBtn = $("mute");
  function setMute(m) { muted = m; muteBtn.setAttribute("aria-pressed", m ? "true" : "false"); muteBtn.setAttribute("aria-label", m ? "Sesi aç" : "Sesi kapat"); if (master) master.gain.value = m ? 0 : 1; try { localStorage.setItem(SAVE + ":mute", m ? "1" : "0"); } catch (e) {} }
  setMute(muted);
  muteBtn.onclick = () => { audio(); setMute(!muted); };

  /* ---------- başlık ---------- */
  function showTitle() {
    state = "title"; save(); music(null); closeDlg();
    const s = load(); $("cont").hidden = !s; if (s) $("hero").value = s.name;
    $("title").hidden = false;
  }
  function begin() {
    state = "play"; $("title").hidden = true; lastArea = ""; if (document.activeElement) document.activeElement.blur();
    timers.length = 0; deadT = 0; endT = 0; fade = 0; fadeDir = 0; slide = null; P.hold = 0; P.inv = 0;
    enterRoom(S.room, S.sx * T, S.sy * T, 0);
    if (!S.intro) { S.intro = 1; P.dir = 1; later(700, () => { const el = npcs.find((n) => n.id === "elder"); if (el) el.dir = 2; introTalk(); }); }
  }
  function newGame() { const name = ($("hero").value || "").trim().slice(0, 10) || "Enes"; S = fresh(name); save(); begin(); }
  $("newg").onclick = () => {
    audio(); if (ac && ac.state === "suspended") ac.resume();
    const old = load(); if (old && old.time > 30 && !confirm("Kayıtlı macera silinip yeniden başlansın mı?")) return;
    newGame();
  };
  $("cont").onclick = () => { audio(); if (ac && ac.state === "suspended") ac.resume(); S = load(); const name = ($("hero").value || "").trim().slice(0, 10); if (name) S.name = name; begin(); };
  $("hero").addEventListener("keydown", (e) => { if (e.key === "Enter") { e.preventDefault(); ($("cont").hidden ? $("newg") : $("cont")).click(); } });

  /* ---------- ölçek ---------- */
  const stage = $("stage"), screen = $("screen");
  function fit() {
    const w = screen.clientWidth, h = screen.clientHeight; if (!w || !h) return;
    let sw = w, sh = w / 1.6; if (sh > h) { sh = h; sw = h * 1.6; }
    // tam sayı ölçek tercih et (keskin pikseller)
    const k = sw / 320; if (k > 2) { const ik = Math.floor(k); if (ik / k > .86) { sw = 320 * ik; sh = 200 * ik; } }
    stage.style.width = Math.floor(sw) + "px"; stage.style.height = Math.floor(sh) + "px"; stage.style.setProperty("--fs", clamp(sw / 34, 12, 22).toFixed(1) + "px");
  }
  addEventListener("resize", fit); if (window.ResizeObserver) new ResizeObserver(fit).observe(screen); fit();

  /* ---------- döngü ---------- */
  let last = performance.now(), headless = false;
  function frame(now) {
    const dt = Math.min(.05, (now - last) / 1000); last = now;
    if (!headless) { update(dt); draw(); }
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
  showTitle();

  /* ---------- test kancası ---------- */
  window.__kf = {
    get S() { return S; }, set S(v) { S = v; }, P, get room() { return roomId; }, get live() { return live; }, get enemies() { return enemies; }, get boss() { return boss; }, get drops() { return drops; }, get shots() { return shots; }, get dlg() { return dlg; }, get state() { return state; }, get endT() { return endT; }, get npcs() { return npcs; }, get portal() { return portal; },
    keys, setHeadless(v) { headless = v; }, setFast(v) { fast = v; },
    go(id, tx, ty) { enterRoom(id, tx * T, ty * T, 0); },
    step(n, k, dt) { dt = dt || 1 / 60; Object.keys(keys).forEach((x) => keys[x] = false); Object.assign(keys, k || {}); for (let i = 0; i < n; i++) update(dt); Object.keys(keys).forEach((x) => keys[x] = false); },
    press(b) { if (b === "a") pressA = true; else pressB = true; update(1 / 60); },
    advance, draw, newGame, begin, give, solidAt, tileAt, interact,
    rooms: W.rooms
  };
})();
