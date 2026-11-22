/* Kale Muhafızları — kule savunma */
(function () {
  "use strict";
  const W = 960, H = 600, TOP = 48;
  const $ = (id) => document.getElementById(id);
  const cv = $("cv"); let ctx = cv.getContext("2d");
  const SAVE = "kale-muhafizlari";
  const rnd = (a, b) => a + Math.random() * (b - a);
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const OL = "#2A1E12";
  let seed = 1; const srnd = () => { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; };

  /* ---------- haritalar ---------- */
  const LEVELS = [
    { name: "Yeşil Vadi", theme: "grass", gold: 260, waves: 8, paths: [[[-30, 300], [200, 300], [200, 140], [460, 140], [460, 450], [720, 450], [720, 250], [990, 250]]] },
    { name: "Nehir Geçidi", theme: "river", gold: 300, waves: 10, paths: [[[-30, 160], [290, 160], [290, 480], [650, 480], [650, 160], [850, 160], [850, 630]]] },
    { name: "Çöl Vahası", theme: "desert", gold: 330, waves: 10, paths: [[[-30, 500], [200, 500], [200, 130], [420, 130], [420, 490], [640, 490], [640, 130], [860, 130], [860, 630]]] },
    { name: "Karlı Dağlar", theme: "snow", gold: 380, waves: 12, paths: [[[-30, 140], [380, 140], [380, 330], [990, 330]], [[-30, 520], [380, 520], [380, 330], [990, 330]]] },
    { name: "Bataklık", theme: "swamp", gold: 420, waves: 12, paths: [[[-30, 310], [140, 310], [140, 100], [830, 100], [830, 520], [290, 520], [290, 270], [640, 270], [640, 400], [470, 400]]] },
    { name: "Ejderha Kalesi", theme: "lava", gold: 480, waves: 15, paths: [[[-30, 120], [760, 120], [760, 300], [180, 300], [180, 480], [990, 480]]], air: [[-30, 300], [990, 300]] }
  ];
  const THEMES = {
    grass: { g1: "#6CBF4F", g2: "#5DAF45", path: "#D9B878", edge: "#B8955A", dark: "#3E8E44" },
    river: { g1: "#72C258", g2: "#62B04A", path: "#D9B878", edge: "#B8955A", dark: "#3E8E44" },
    desert: { g1: "#EED29A", g2: "#E2C285", path: "#C9A066", edge: "#A8804A", dark: "#B08A50" },
    snow: { g1: "#EEF4FA", g2: "#DDE8F2", path: "#B8C2D0", edge: "#8E9AAE", dark: "#9AB0C8" },
    swamp: { g1: "#5E7A3E", g2: "#526C36", path: "#8A7A52", edge: "#6A5A3A", dark: "#3A4A26" },
    lava: { g1: "#5A4A48", g2: "#4E3E3C", path: "#8A6A5A", edge: "#6A4A3A", dark: "#2E2220" }
  };
  // yol uzunlukları
  function prepPath(pts) { const segs = []; let L = 0; for (let i = 0; i < pts.length - 1; i++) { const [x0, y0] = pts[i], [x1, y1] = pts[i + 1], l = Math.hypot(x1 - x0, y1 - y0); segs.push({ x0, y0, x1, y1, l, s: L }); L += l; } return { pts, segs, L }; }
  function posAt(P, d) { d = clamp(d, 0, P.L); for (const s of P.segs) if (d <= s.s + s.l) { const k = (d - s.s) / s.l; return { x: s.x0 + (s.x1 - s.x0) * k, y: s.y0 + (s.y1 - s.y0) * k, dx: (s.x1 - s.x0) / s.l, dy: (s.y1 - s.y0) / s.l }; } const s = P.segs[P.segs.length - 1]; return { x: s.x1, y: s.y1, dx: 1, dy: 0 }; }
  function distToPaths(x, y, paths) { let m = 1e9; for (const P of paths) for (const s of P.segs) { const vx = s.x1 - s.x0, vy = s.y1 - s.y0, t = clamp(((x - s.x0) * vx + (y - s.y0) * vy) / (s.l * s.l), 0, 1); m = Math.min(m, Math.hypot(x - (s.x0 + vx * t), y - (s.y0 + vy * t))); } return m; }
  function makePads(L, paths) {
    const cands = []; if (L.air) paths = paths.concat([prepPath(L.air)]);
    for (let y = TOP + 40; y <= H - 30; y += 18) for (let x = 34; x <= W - 34; x += 18) { const d = distToPaths(x, y, paths); if (d >= 54 && d <= 78) cands.push({ x, y, d }); }
    // nehir ve kale bölgelerinden uzak
    const ok = cands.filter((c) => !(L.theme === "river" && Math.abs(c.x - 470) < 44));
    seed = 1000 + LEVELS.indexOf(L) * 77; ok.sort((a, b) => a.d - b.d + (srnd() - .5) * 6);
    const pads = [];
    for (const c of ok) { if (pads.every((p) => Math.hypot(p.x - c.x, p.y - c.y) >= 78)) pads.push({ x: c.x, y: c.y }); if (pads.length >= 15) break; }
    return pads;
  }

  /* ---------- kuleler ve düşmanlar ---------- */
  const TOWERS = {
    okcu: { name: "Okçu Kulesi", cost: [70, 110, 160], dmg: [9, 15, 24], rate: [.55, .48, .42], range: [135, 148, 165], kind: "fiz", desc: "Hızlı oklar, uçanları da vurur" },
    top: { name: "Top Kulesi", cost: [110, 150, 220], dmg: [32, 54, 86], rate: [1.6, 1.5, 1.4], range: [125, 135, 148], splash: [46, 52, 60], kind: "fiz", ground: true, desc: "Alan hasarı, uçanları vuramaz" },
    buz: { name: "Buz Kulesi", cost: [90, 120, 170], dmg: [6, 10, 15], rate: [1, .9, .8], range: [118, 128, 140], slow: [.4, .5, .6], kind: "buy", desc: "Düşmanları yavaşlatır" },
    yildirim: { name: "Yıldırım Kulesi", cost: [150, 190, 260], dmg: [28, 42, 64], rate: [1.4, 1.3, 1.15], range: [125, 138, 152], chain: [2, 3, 4], kind: "buy", unlock: 2, desc: "Zincirleme şimşek, zırhı deler" }
  };
  const TKEYS = ["okcu", "top", "buz", "yildirim"];
  const ENEMIES = {
    goblin: { hp: 40, sp: 50, arm: 0, gold: 5, lives: 1, r: 9 },
    kurt: { hp: 32, sp: 88, arm: 0, gold: 6, lives: 1, r: 10 },
    ork: { hp: 130, sp: 36, arm: .5, gold: 12, lives: 1, r: 12 },
    yarasa: { hp: 48, sp: 62, arm: 0, gold: 8, lives: 1, r: 9, fly: 1 },
    trol: { hp: 460, sp: 26, arm: .2, gold: 30, lives: 3, r: 17 },
    ejderha: { hp: 1700, sp: 22, arm: .3, gold: 250, lives: 10, r: 26, fly: 1 }
  };
  function genWaves(li) {
    const L = LEVELS[li], out = [];
    for (let w = 0; w < L.waves; w++) {
      const g = [], last = w === L.waves - 1;
      g.push(["goblin", Math.round(5 + w * 1.1 + li * .6)]);
      if (w >= 2) g.push(["kurt", Math.round(2 + w * .6)]);
      if ((li >= 1 && w >= 3) || w >= 5) g.push(["ork", Math.round(1 + w * .35 + li * .3)]);
      if (li >= 1 ? w >= 4 : w >= 6) g.push(["yarasa", Math.round(2 + w * .45)]);
      if (w % 4 === 3 || last) g.push(["trol", 1 + Math.floor(w / 6) + (li >= 4 ? 1 : 0)]);
      if (li === 5 && last) g.push(["ejderha", 1]);
      out.push({ groups: g, hpMul: 1 + li * .3 + w * .1 });
    }
    return out;
  }

  /* ---------- ses ---------- */
  let ac = null, master = null, mg = null, muted = false;
  try { muted = localStorage.getItem(SAVE + ":mute") === "1"; } catch (e) {}
  function audio() { if (!ac) { const C = window.AudioContext || window.webkitAudioContext; if (!C) return; ac = new C(); master = ac.createGain(); master.gain.value = muted ? 0 : 1; master.connect(ac.destination); mg = ac.createGain(); mg.gain.value = .4; mg.connect(master); } if (ac.state === "suspended") ac.resume(); }
  function tone(f, d, type, vol, when, slide, dest) { if (!ac || muted || fast) return; const t = when || ac.currentTime, o = ac.createOscillator(), g = ac.createGain(); o.type = type || "triangle"; o.frequency.setValueAtTime(f, t); if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(30, slide), t + d); g.gain.setValueAtTime(.0001, t); g.gain.linearRampToValueAtTime(vol || .1, t + .01); g.gain.exponentialRampToValueAtTime(.0008, t + d); o.connect(g); g.connect(dest || master); o.start(t); o.stop(t + d + .02); }
  let nb = null;
  function noise(d, vol, freq, q) { if (!ac || muted || fast) return; if (!nb) { nb = ac.createBuffer(1, ac.sampleRate, ac.sampleRate); const c = nb.getChannelData(0); for (let i = 0; i < c.length; i++) c[i] = Math.random() * 2 - 1; } const s = ac.createBufferSource(), f = ac.createBiquadFilter(), g = ac.createGain(), t = ac.currentTime; s.buffer = nb; f.type = "bandpass"; f.frequency.value = freq || 1500; f.Q.value = q || 1; g.gain.setValueAtTime(vol || .1, t); g.gain.exponentialRampToValueAtTime(.001, t + d); s.connect(f); f.connect(g); g.connect(master); s.start(t); s.stop(t + d); }
  let sfxCount = 0; setInterval(() => sfxCount = 0, 100);
  const lim = (f) => (...a) => { if (sfxCount++ < 6) f(...a); };
  const now = () => ac ? ac.currentTime : 0;
  const sfx = {
    arrow: lim(() => noise(.08, .05, 3500, 2)), boom: lim(() => { noise(.4, .2, 220); tone(90, .35, "sine", .15, 0, 40); }),
    frost: lim(() => { tone(1400, .25, "sine", .04, 0, 2200); noise(.2, .04, 6000, 3); }), zap: lim(() => { noise(.18, .12, 4000, .6); tone(200, .15, "sawtooth", .05, 0, 900); }),
    die: lim(() => tone(260 + Math.random() * 80, .12, "square", .04, 0, 120)), leak: () => { tone(160, .4, "sawtooth", .1, 0, 80); },
    build: () => { noise(.15, .12, 500); const t = now(); tone(392, .1, "triangle", .1, t); tone(523, .15, "triangle", .1, t + .08); },
    up: () => { const t = now(); [523, 659, 784, 1047].forEach((f, i) => tone(f, .15, "triangle", .1, t + i * .06)); },
    sell: () => { const t = now(); tone(988, .08, "square", .04, t); tone(784, .12, "square", .04, t + .08); },
    horn: () => { const t = now(); tone(220, .5, "sawtooth", .07, t); tone(330, .7, "sawtooth", .06, t + .35); },
    meteor: lim(() => { noise(.6, .25, 160); tone(70, .6, "sine", .2, 0, 30); }),
    no: () => tone(180, .18, "square", .06, 0, 120),
    win: () => { const t = now(); [[392, 0], [523, .18], [659, .36], [784, .54], [659, .78], [784, .92], [1047, 1.1]].forEach(([f, d]) => { tone(f, .35, "triangle", .12, t + d); tone(f / 2, .35, "sawtooth", .03, t + d); }); },
    lose: () => { const t = now(); [392, 349, 311, 262].forEach((f, i) => tone(f, .4, "triangle", .12, t + i * .25)); }
  };
  const mf = (m) => 440 * Math.pow(2, (m - 69) / 12);
  const SONG = { bpm: 112, lead: [62, 0, 65, 69, 67, 65, 64, 62, 64, 0, 65, 64, 62, 0, 57, 0, 62, 0, 65, 69, 72, 70, 69, 67, 69, 67, 65, 64, 62, 0, 0, 0], bass: [38, 0, 45, 0, 38, 0, 45, 0, 36, 0, 43, 0, 33, 0, 40, 0, 34, 0, 41, 0, 36, 0, 43, 0, 33, 0, 40, 0, 38, 0, 45, 0] };
  let mStep = 0, mNext = 0;
  setInterval(() => {
    if (!ac || muted || state !== "play" || paused) { if (ac) mNext = Math.max(mNext, ac.currentTime); return; }
    const d = 60 / SONG.bpm / 2; if (mNext < ac.currentTime) mNext = ac.currentTime + .05;
    while (mNext < ac.currentTime + .3) { const i = mStep % 32; if (SONG.lead[i]) tone(mf(SONG.lead[i]), d * 1.5, "triangle", .04, mNext, 0, mg); if (SONG.bass[i]) tone(mf(SONG.bass[i]), d * .9, "sawtooth", .025, mNext, 0, mg); if (i % 4 === 0) noise(.05, .04, 120); mStep++; mNext += d; }
  }, 90);

  /* ---------- kayıt ---------- */
  let SV = { stars: [] };
  try { const s = JSON.parse(localStorage.getItem(SAVE) || "null"); if (s && s.stars) SV = s; } catch (e) {}
  const saveSV = () => { try { localStorage.setItem(SAVE, JSON.stringify(SV)); } catch (e) {} };

  /* ---------- seviye durumu ---------- */
  let LV = null, li = 0, paths = [], air = null, pads = [], towers = [], enemies = [], shots = [], parts = [], floaters = [], bolts = [], meteors = [];
  let gold = 0, lives = 20, wave = 0, waves = [], spawnQ = [], countdown = 0, waveActive = false, menu = null, bgCv = null, clock = 0, shake = 0;
  let state = "title", paused = false, speed = 1, fast = false, meteorCd = 0, meteorAim = false, started = false, endT = 0;
  function loadLevel(i) {
    li = i; LV = LEVELS[i]; paths = LV.paths.map(prepPath); air = LV.air ? prepPath(LV.air) : null;
    pads = makePads(LV, paths); towers = []; enemies = []; shots = []; parts = []; floaters = []; bolts = []; meteors = [];
    gold = LV.gold; lives = 20; wave = 0; waves = genWaves(i); spawnQ = []; countdown = 0; waveActive = false; menu = null; meteorCd = 8; meteorAim = false; started = false; endT = 0; paused = false;
    bgCv = renderBg(LV, paths, pads);
    state = "play";
    hint(i === 0 ? "Boş taşlara dokun ve kule kur. Hazır olunca ⚔ düğmesine bas!" : i === 2 ? "Yeni kule açıldı: Yıldırım! Zırhlı orklara karşı çok güçlü." : i === 3 ? "Dikkat: düşmanlar iki yoldan geliyor!" : i === 5 ? "Yarasalar ve ejderha yolu takip etmez, dümdüz uçar!" : "");
  }
  let hintT = null;
  function hint(t) { const h = $("hint"); if (!t) { h.hidden = true; return; } h.textContent = t; h.hidden = false; clearTimeout(hintT); hintT = setTimeout(() => h.hidden = true, 7000); }
  function startWave() {
    if (wave >= waves.length) return;
    const W2 = waves[wave]; let t = 0;
    W2.groups.forEach(([type, n], gi) => { for (let k = 0; k < n; k++) spawnQ.push({ type, at: t + k * (type === "kurt" ? .5 : type === "trol" || type === "ejderha" ? 2.2 : .8), path: k % paths.length, hpMul: W2.hpMul }); t += n * .55 + 1.2; });
    spawnQ.sort((a, b) => a.at - b.at); waveT = 0; wave++; waveActive = true; countdown = 0; started = true; sfx.horn();
    floaters.push({ x: W / 2, y: H / 2, text: "Dalga " + wave + " / " + waves.length, col: "#FFD23F", t: 0, big: 1 });
  }
  let waveT = 0;
  function callEarly() { if (wave >= waves.length) return; const bonus = waveActive || !started ? 0 : Math.round(countdown * 3); if (bonus) { gold += bonus; floaters.push({ x: 60, y: 90, text: "+" + bonus + " erken bonus", col: "#FFD23F", t: 0 }); } startWave(); }

  /* ---------- güncelleme ---------- */
  function update(dt) {
    clock += dt; shake = Math.max(0, shake - dt);
    for (const p of parts) { p.life -= dt; p.x += p.vx * dt; p.y += p.vy * dt; if (p.g) p.vy += 300 * dt; }
    parts = parts.filter((p) => p.life > 0);
    for (const f of floaters) f.t += dt; floaters = floaters.filter((f) => f.t < (f.big ? 1.8 : 1.1));
    for (const b of bolts) b.t += dt; bolts = bolts.filter((b) => b.t < .18);
    if (state !== "play" || paused) return;
    meteorCd = Math.max(0, meteorCd - dt);
    // doğma
    if (waveActive) { waveT += dt; while (spawnQ.length && spawnQ[0].at <= waveT) spawn(spawnQ.shift()); if (!spawnQ.length && !enemies.length) { waveActive = false; const bonus = 20 + wave * 4; gold += bonus; floaters.push({ x: W / 2, y: H / 2 + 40, text: "Dalga temizlendi! +" + bonus, col: "#9FE870", t: 0, big: 1 }); if (wave >= waves.length) { win(); return; } countdown = 14; } }
    else if (started && countdown > 0) { countdown -= dt; if (countdown <= 0) startWave(); }
    // düşmanlar
    for (const e of enemies) {
      e.slowT = Math.max(0, e.slowT - dt); const sp = e.sp * (e.slowT > 0 ? 1 - e.slow : 1);
      e.d += sp * dt; e.t += dt; const P = e.P, p = posAt(P, e.d); e.x = p.x + p.dy * e.off; e.y = p.y - p.dx * e.off; e.face = p.dx < -.1 ? -1 : p.dx > .1 ? 1 : e.face;
      e.hurt = Math.max(0, e.hurt - dt);
      if (e.d >= P.L) { e.dead = 2; lives -= e.lives; shake = .3; sfx.leak(); floaters.push({ x: clamp(e.x, 40, W - 40), y: clamp(e.y, 80, H - 30), text: "−" + e.lives + " ♥", col: "#FF6B6B", t: 0 }); }
    }
    enemies = enemies.filter((e) => !e.dead);
    if (lives <= 0) { lives = 0; lose(); return; }
    // kuleler
    for (const t of towers) towerUpdate(t, dt);
    // mermiler
    for (const s of shots) shotUpdate(s, dt);
    shots = shots.filter((s) => !s.done);
    for (const m of meteors) { m.t += dt; if (m.t >= m.d && !m.hit) { m.hit = 1; sfx.meteor(); shake = .25; boom(m.x, m.y, 60, "#FF8A2E"); for (const e of enemies) if (Math.hypot(e.x - m.x, e.y - m.y) < 64) hurt(e, 130, "true"); } }
    meteors = meteors.filter((m) => m.t < m.d + .2);
  }
  function spawn(q) {
    const d = ENEMIES[q.type], P = d.fly && air ? air : paths[q.path];
    enemies.push({ type: q.type, P, d: -rnd(0, 20), off: rnd(-12, 12) * (d.fly ? 2 : 1), hp: d.hp * q.hpMul, max: d.hp * q.hpMul, sp: d.sp * rnd(.95, 1.05), arm: d.arm, fly: d.fly, r: d.r, gold: d.gold, lives: d.lives, t: rnd(0, 3), slowT: 0, slow: 0, hurt: 0, face: 1, x: -40, y: -40 });
  }
  function hurt(e, dmg, kind) {
    if (e.dead) return; const a = kind === "fiz" ? 1 - e.arm : 1; e.hp -= dmg * a; e.hurt = .12;
    if (e.hp <= 0) { e.dead = 1; gold += e.gold; sfx.die(); floaters.push({ x: e.x, y: e.y - 20, text: "+" + e.gold, col: "#FFD23F", t: 0 }); for (let i = 0; i < 10; i++) { const an = rnd(0, 7), s = rnd(30, 110); parts.push({ x: e.x, y: e.y, vx: Math.cos(an) * s, vy: Math.sin(an) * s - 40, life: rnd(.3, .6), c: e.type === "yarasa" ? "#7A5AB8" : e.type === "ejderha" ? "#E8463F" : "#B8B0A0", s: 3, g: 1 }); } if (e.type === "ejderha") { boom(e.x, e.y, 90, "#FFD23F"); shake = .6; } }
  }
  function inRange(t, e) { return Math.hypot(e.x - t.x, e.y - (t.y - 10)) <= T(t, "range"); }
  const T = (t, k) => TOWERS[t.type][k][t.lv];
  function pickTarget(t) { let best = null; for (const e of enemies) { if (e.d < 0 || (TOWERS[t.type].ground && e.fly)) continue; if (!inRange(t, e)) continue; if (!best || e.d / e.P.L > best.d / best.P.L) best = e; } return best; }
  function towerUpdate(t, dt) {
    t.cd -= dt; t.anim = Math.max(0, t.anim - dt);
    const tg = pickTarget(t); if (tg) t.ang = Math.atan2(tg.y - t.y, tg.x - t.x);
    if (t.cd > 0 || !tg) return;
    t.cd = T(t, "rate"); t.anim = .2;
    const sx = t.x, sy = t.y - 34;
    if (t.type === "okcu") { shots.push({ k: "arrow", x: sx, y: sy, tg, sp: 520, dmg: T(t, "dmg") }); sfx.arrow(); }
    else if (t.type === "top") { const lead = Math.min(.8, Math.hypot(tg.x - sx, tg.y - sy) / 300); const fp = posAt(tg.P, tg.d + tg.sp * lead); shots.push({ k: "ball", x0: sx, y0: sy - 4, x1: fp.x + fp.dy * tg.off, y1: fp.y - fp.dx * tg.off, t: 0, d: lead, dmg: T(t, "dmg"), r: T(t, "splash") }); sfx.boom(); for (let i = 0; i < 5; i++) parts.push({ x: sx + Math.cos(t.ang) * 20, y: sy + Math.sin(t.ang) * 20, vx: rnd(-20, 20), vy: rnd(-40, -10), life: .5, c: "#C8C0B0", s: 5 }); }
    else if (t.type === "buz") { shots.push({ k: "frost", x: sx, y: sy - 6, tg, sp: 300, dmg: T(t, "dmg"), slow: T(t, "slow"), splash: t.lv === 2 ? 40 : 0 }); sfx.frost(); }
    else if (t.type === "yildirim") {
      let cur = tg, from = { x: sx, y: sy - 14 }; const hit = new Set();
      for (let k = 0; k < T(t, "chain") && cur; k++) { hit.add(cur); bolts.push({ x0: from.x, y0: from.y, x1: cur.x, y1: cur.y - 6, t: 0, seed: Math.random() }); hurt(cur, T(t, "dmg") * (k ? .75 : 1), "buy"); from = { x: cur.x, y: cur.y - 6 }; let nx = null, nd = 95; for (const e of enemies) { if (e.dead || hit.has(e)) continue; const dd = Math.hypot(e.x - cur.x, e.y - cur.y); if (dd < nd) { nd = dd; nx = e; } } cur = nx; }
      sfx.zap();
    }
  }
  function shotUpdate(s, dt) {
    if (s.k === "ball") { s.t += dt; if (s.t >= s.d) { s.done = 1; boom(s.x1, s.y1, s.r, "#FFB020"); for (const e of enemies) if (!e.fly && Math.hypot(e.x - s.x1, e.y - s.y1) < s.r) hurt(e, s.dmg, "fiz"); } return; }
    const tg = s.tg; if (tg.dead) { s.done = 1; return; }
    const dx = tg.x - s.x, dy = tg.y - 8 - s.y, d = Math.hypot(dx, dy), step = s.sp * dt; s.ang = Math.atan2(dy, dx);
    if (d <= step + 4) { s.done = 1; if (s.k === "arrow") hurt(tg, s.dmg, "fiz"); else { const hitE = s.splash ? enemies.filter((e) => Math.hypot(e.x - tg.x, e.y - tg.y) < s.splash) : [tg]; for (const e of hitE) { hurt(e, s.dmg, "buy"); e.slow = Math.max(e.slowT > 0 ? e.slow : 0, s.slow); e.slowT = 1.6; } for (let i = 0; i < 8; i++) parts.push({ x: tg.x, y: tg.y - 8, vx: rnd(-60, 60), vy: rnd(-60, 30), life: .4, c: i % 2 ? "#BDF4FF" : "#fff", s: 3 }); } return; }
    s.x += dx / d * step; s.y += dy / d * step;
  }
  function boom(x, y, r, col) { for (let i = 0; i < 18; i++) { const a = rnd(0, 7), s = rnd(40, r * 3); parts.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s - 30, life: rnd(.3, .7), c: pick([col, "#FFF3B0", "#8A7A6A"]), s: rnd(3, 6) }); } parts.push({ x, y, vx: 0, vy: 0, life: .25, c: "ring", s: r }); }
  const pick = (a) => a[Math.floor(Math.random() * a.length)];
  function win() {
    state = "won"; endT = 0; menu = null; const st = lives >= 18 ? 3 : lives >= 10 ? 2 : 1; SV.stars[li] = Math.max(SV.stars[li] || 0, st); saveSV(); sfx.win();
    setTimeoutF(() => showEnd(true, st), 1600);
  }
  function lose() { state = "lost"; menu = null; sfx.lose(); setTimeoutF(() => showEnd(false, 0), 1300); }
  function setTimeoutF(f, ms) { if (fast) f(); else setTimeout(f, ms); }

  /* ---------- girdi ---------- */
  function canvasXY(e) { const r = cv.getBoundingClientRect(); return [(e.clientX - r.left) / r.width * W, (e.clientY - r.top) / r.height * H]; }
  cv.addEventListener("pointerdown", (e) => { audio(); if (state !== "play") return; e.preventDefault(); const [x, y] = canvasXY(e); tap(x, y); });
  const BTN = { wave: { x: 900, y: 24, r: 20 }, meteor: { x: 846, y: 24, r: 20 }, speed: { x: 792, y: 24, r: 20 }, pause: { x: 738, y: 24, r: 20 } };
  function tap(x, y) {
    const hitB = (b) => Math.hypot(x - b.x, y - b.y) < b.r + 6;
    if (hitB(BTN.pause)) { paused = !paused; menu = null; return; }
    if (paused) { paused = false; return; }
    if (hitB(BTN.speed)) { speed = speed === 1 ? 2 : 1; sfx.build(); return; }
    if (hitB(BTN.wave)) { if (wave < waves.length && (!started || spawnQ.length === 0)) callEarly(); else sfx.no(); return; }
    if (hitB(BTN.meteor)) { if (meteorCd > 0) { sfx.no(); return; } meteorAim = !meteorAim; menu = null; if (meteorAim) hint("Meteorun düşeceği yere dokun!"); return; }
    if (meteorAim) { if (y > TOP) { meteorAim = false; meteorCd = 40; $("hint").hidden = true; for (let k = 0; k < 3; k++) meteors.push({ x: x + rnd(-30, 30), y: y + rnd(-24, 24), t: -k * .18, d: .6 }); } return; }
    if (menu) { const opt = menu.opts.find((o) => Math.hypot(x - o.x, y - o.y) < 26); if (opt) { opt.act(); return; } menu = null; }
    const t = towers.find((t) => Math.hypot(x - t.x, y - (t.y - 14)) < 32); if (t) { openTowerMenu(t); return; }
    const p = pads.find((p) => !p.tower && Math.hypot(x - p.x, y - p.y) < 30); if (p) { openBuildMenu(p); return; }
  }
  function openBuildMenu(p) {
    const opts = []; const ang = [-Math.PI * .75, -Math.PI * .25, Math.PI * .25, Math.PI * .75];
    TKEYS.forEach((k, i) => { const T0 = TOWERS[k], locked = T0.unlock && li < T0.unlock; const o = { x: p.x + Math.cos(ang[i]) * 62, y: p.y + Math.sin(ang[i]) * 56, icon: k, cost: T0.cost[0], locked, act: () => { if (locked) { sfx.no(); hint(T0.name + " " + (T0.unlock + 1) + ". haritada açılır."); return; } if (gold < T0.cost[0]) { sfx.no(); hint(T0.name + ": " + T0.cost[0] + " altın lazım."); return; } gold -= T0.cost[0]; const tw = { type: k, lv: 0, x: p.x, y: p.y, cd: 0, ang: 0, anim: 0, spent: T0.cost[0], pad: p, built: 0 }; towers.push(tw); p.tower = tw; menu = null; sfx.build(); boom(p.x, p.y, 20, "#C8B898"); hint(T0.name + ": " + T0.desc); } }; clampOpt(o); opts.push(o); });
    menu = { pad: p, x: p.x, y: p.y, opts, build: 1 };
  }
  function openTowerMenu(t) {
    const T0 = TOWERS[t.type], opts = [];
    const up = { x: t.x, y: t.y - 92, icon: "up", cost: t.lv < 2 ? T0.cost[t.lv + 1] : null, act: () => { if (t.lv >= 2) return; const c = T0.cost[t.lv + 1]; if (gold < c) { sfx.no(); hint("Yükseltme için " + c + " altın lazım."); return; } gold -= c; t.spent += c; t.lv++; sfx.up(); boom(t.x, t.y - 20, 24, "#FFD23F"); menu = null; } };
    const sellV = Math.round(t.spent * .6);
    const sell = { x: t.x, y: t.y + 50, icon: "sell", cost: sellV, act: () => { gold += sellV; towers.splice(towers.indexOf(t), 1); t.pad.tower = null; sfx.sell(); floaters.push({ x: t.x, y: t.y - 30, text: "+" + sellV, col: "#FFD23F", t: 0 }); menu = null; } };
    clampOpt(up); clampOpt(sell); if (t.lv < 2) opts.push(up); opts.push(sell);
    menu = { tower: t, x: t.x, y: t.y, opts };
  }
  function clampOpt(o) { o.x = clamp(o.x, 30, W - 30); o.y = clamp(o.y, TOP + 26, H - 26); }
  addEventListener("keydown", (e) => { if (state !== "play") return; if (e.code === "Space") { e.preventDefault(); paused = !paused; } if (e.code === "KeyF") speed = speed === 1 ? 2 : 1; if (e.code === "KeyN" && wave < waves.length && (!started || spawnQ.length === 0)) callEarly(); if (e.code === "Escape") menu = null; });

  /* ---------- arka plan çizimi ---------- */
  function renderBg(L, paths, pads) {
    const c = document.createElement("canvas"); c.width = W; c.height = H; const x = c.getContext("2d"), th = THEMES[L.theme];
    x.fillStyle = th.g1; x.fillRect(0, 0, W, H);
    seed = 7 + LEVELS.indexOf(L) * 13;
    for (let i = 0; i < 900; i++) { x.fillStyle = srnd() < .5 ? th.g2 : "rgba(255,255,255,.08)"; x.fillRect(srnd() * W, srnd() * H, 3, 3); }
    for (let i = 0; i < 30; i++) { const px = srnd() * W, py = srnd() * H; x.globalAlpha = .18; ellipse(x, px, py, 40 + srnd() * 60, 20 + srnd() * 30, th.g2); x.globalAlpha = 1; }
    if (L.theme === "river") { x.fillStyle = "#4FA8E0"; x.beginPath(); x.moveTo(440, 0); for (let y = 0; y <= H; y += 20) x.lineTo(446 + Math.sin(y / 60) * 10, y); for (let y = H; y >= 0; y -= 20) x.lineTo(496 + Math.sin(y / 60) * 10, y); x.fill(); x.strokeStyle = "rgba(255,255,255,.4)"; x.lineWidth = 2; for (let y = 20; y < H; y += 40) { x.beginPath(); x.moveTo(456 + Math.sin(y / 60) * 10, y); x.lineTo(476 + Math.sin(y / 60) * 10, y + 6); x.stroke(); } }
    if (L.theme === "lava") { x.strokeStyle = "#FF6A1F"; x.lineWidth = 6; x.globalAlpha = .8; for (let k = 0; k < 4; k++) { x.beginPath(); let px = srnd() * W, py = TOP + srnd() * (H - TOP); x.moveTo(px, py); for (let s = 0; s < 6; s++) { px += rnd(-60, 60); py += rnd(-40, 40); x.lineTo(px, py); } x.stroke(); } x.globalAlpha = 1; }
    // yol
    for (const [w, col] of [[54, th.edge], [44, th.path]]) { x.strokeStyle = col; x.lineWidth = w; x.lineCap = "round"; x.lineJoin = "round"; for (const P of paths) { x.beginPath(); P.pts.forEach(([px, py], i) => i ? x.lineTo(px, py) : x.moveTo(px, py)); x.stroke(); } }
    for (const P of paths) for (let d = 0; d < P.L; d += 14) { const p = posAt(P, d); if (srnd() < .5) { x.fillStyle = "rgba(0,0,0,.09)"; x.beginPath(); x.ellipse(p.x + rnd(-14, 14), p.y + rnd(-14, 14), 4, 3, 0, 0, 7); x.fill(); } }
    if (L.theme === "river") { const by = 480; x.fillStyle = "#8A5A2B"; x.fillRect(430, by - 30, 80, 60); for (let i = 0; i < 8; i++) { x.fillStyle = i % 2 ? "#B07A40" : "#9A6A34"; x.fillRect(432 + i * 10, by - 28, 8, 56); } x.fillStyle = "#6E4A26"; x.fillRect(430, by - 33, 80, 5); x.fillRect(430, by + 28, 80, 5); }
    // süsler
    const deco = [];
    for (let i = 0; i < 70; i++) { const px = 20 + srnd() * (W - 40), py = TOP + 20 + srnd() * (H - TOP - 30); if (distToPaths(px, py, paths) < 46 || pads.some((p) => Math.hypot(p.x - px, p.y - py) < 44) || (L.theme === "river" && Math.abs(px - 470) < 50)) continue; deco.push([px, py, srnd()]); }
    deco.sort((a, b) => a[1] - b[1]).forEach(([px, py, r]) => decor(x, L.theme, px, py, r));
    // giriş ve kale
    for (const P of paths) { const s = P.pts[0]; cave(x, clamp(s[0], 16, W - 16), clamp(s[1], TOP + 20, H - 20), th); }
    const e = paths[0].pts[paths[0].pts.length - 1]; castle(x, clamp(e[0], 40, W - 40), clamp(e[1], TOP + 40, H - 34));
    // kule yerleri
    for (const p of pads) padDraw(x, p.x, p.y);
    return c;
  }
  function ellipse(x, cx, cy, rx, ry, col) { x.fillStyle = col; x.beginPath(); x.ellipse(cx, cy, rx, ry, 0, 0, 7); x.fill(); }
  function decor(x, theme, px, py, r) {
    x.save(); x.translate(px, py);
    x.globalAlpha = .25; ellipse(x, 0, 2, 14, 5, "#000"); x.globalAlpha = 1;
    if (theme === "grass" || theme === "river") { if (r < .55) tree(x, r, "#3E8E44", "#5DB34A"); else if (r < .75) rock(x, "#9A9AA6"); else flowers(x, r); }
    else if (theme === "desert") { if (r < .4) cactus(x); else if (r < .6) palm(x); else rock(x, "#C9A066"); }
    else if (theme === "snow") { if (r < .6) pine(x, true); else rock(x, "#B8C2D0"); }
    else if (theme === "swamp") { if (r < .4) deadTree(x); else if (r < .7) { ellipse(x, 0, 0, 18, 8, "#4A6A3A"); ellipse(x, 0, -1, 14, 6, "#3E7A5A"); ellipse(x, 6, -3, 4, 2, "#FF7AA2"); } else tree(x, r, "#2E5A2A", "#3E6E36"); }
    else { if (r < .5) rock(x, "#3A2E2C"); else { ellipse(x, 0, 0, 14, 7, "#FF6A1F"); ellipse(x, 0, -1, 9, 4, "#FFD23F"); } }
    x.restore();
  }
  function tree(x, r, d, l) { x.fillStyle = "#7A4A26"; x.fillRect(-3, -14, 6, 14); x.strokeStyle = OL; x.lineWidth = 1.5; x.strokeRect(-3, -14, 6, 14); const s = .8 + r * .5; x.fillStyle = d; x.beginPath(); x.arc(0, -22 * s, 14 * s, 0, 7); x.fill(); x.stroke(); x.fillStyle = l; x.beginPath(); x.arc(-4 * s, -26 * s, 7 * s, 0, 7); x.fill(); }
  function pine(x, snow) { x.fillStyle = "#6E4A26"; x.fillRect(-3, -8, 6, 8); for (let i = 0; i < 3; i++) { x.fillStyle = "#2E6A4A"; x.beginPath(); x.moveTo(-16 + i * 3, -6 - i * 10); x.lineTo(0, -26 - i * 10); x.lineTo(16 - i * 3, -6 - i * 10); x.closePath(); x.fill(); x.strokeStyle = OL; x.lineWidth = 1.5; x.stroke(); if (snow) { x.fillStyle = "#fff"; x.beginPath(); x.moveTo(-6, -20 - i * 10); x.lineTo(0, -26 - i * 10); x.lineTo(6, -20 - i * 10); x.closePath(); x.fill(); } } }
  function rock(x, col) { x.fillStyle = col; x.beginPath(); x.moveTo(-12, 0); x.lineTo(-9, -10); x.lineTo(2, -14); x.lineTo(12, -6); x.lineTo(12, 0); x.closePath(); x.fill(); x.strokeStyle = OL; x.lineWidth = 1.5; x.stroke(); x.fillStyle = "rgba(255,255,255,.3)"; x.fillRect(-6, -10, 6, 3); }
  function flowers(x, r) { for (let i = 0; i < 4; i++) { const fx = -10 + i * 7, fy = -2 - (i % 2) * 4; x.fillStyle = ["#FF7AA2", "#FFD23F", "#fff", "#B98CFF"][(i + Math.floor(r * 10)) % 4]; x.beginPath(); x.arc(fx, fy, 3, 0, 7); x.fill(); } }
  function cactus(x) { x.fillStyle = "#4F9A4A"; x.strokeStyle = OL; x.lineWidth = 1.5; x.beginPath(); x.roundRect ? x.roundRect(-5, -30, 10, 30, 5) : x.rect(-5, -30, 10, 30); x.fill(); x.stroke(); x.beginPath(); x.roundRect ? x.roundRect(-14, -20, 8, 12, 4) : x.rect(-14, -20, 8, 12); x.fill(); x.stroke(); x.beginPath(); x.roundRect ? x.roundRect(6, -24, 8, 12, 4) : x.rect(6, -24, 8, 12); x.fill(); x.stroke(); }
  function palm(x) { x.strokeStyle = "#7A4A26"; x.lineWidth = 4; x.beginPath(); x.moveTo(0, 0); x.quadraticCurveTo(-3, -16, 4, -30); x.stroke(); for (let i = 0; i < 5; i++) { x.save(); x.translate(4, -30); x.rotate(-Math.PI + i * .8); x.fillStyle = "#3FA34D"; x.beginPath(); x.moveTo(0, 0); x.quadraticCurveTo(10, -6, 20, 3); x.quadraticCurveTo(10, 1, 0, 0); x.fill(); x.restore(); } }
  function deadTree(x) { x.strokeStyle = "#4A3A2A"; x.lineWidth = 4; x.lineCap = "round"; x.beginPath(); x.moveTo(0, 0); x.lineTo(0, -28); x.moveTo(0, -16); x.lineTo(-10, -26); x.moveTo(0, -22); x.lineTo(9, -32); x.stroke(); }
  function cave(x, cx, cy, th) { x.save(); x.translate(cx, cy); x.fillStyle = "#5A5A66"; x.beginPath(); x.arc(0, 0, 34, 0, 7); x.fill(); x.strokeStyle = OL; x.lineWidth = 2.5; x.stroke(); x.fillStyle = "#14101A"; x.beginPath(); x.arc(0, 4, 22, 0, 7); x.fill(); x.fillStyle = "#FF4A3A"; x.beginPath(); x.arc(-7, 0, 2.5, 0, 7); x.arc(7, 0, 2.5, 0, 7); x.fill(); x.restore(); }
  function castle(x, cx, cy) {
    x.save(); x.translate(cx, cy); x.globalAlpha = .3; ellipse(x, 0, 30, 54, 10, "#000"); x.globalAlpha = 1;
    x.fillStyle = "#B8B0A8"; x.strokeStyle = OL; x.lineWidth = 2.5;
    for (const sx of [-40, 26]) { x.fillRect(sx, -46, 16, 74); x.strokeRect(sx, -46, 16, 74); for (let k = 0; k < 2; k++) { x.fillRect(sx + k * 10, -54, 6, 8); x.strokeRect(sx + k * 10, -54, 6, 8); } }
    x.fillRect(-26, -26, 52, 54); x.strokeRect(-26, -26, 52, 54); for (let k = 0; k < 5; k++) { x.fillRect(-26 + k * 11, -34, 7, 8); x.strokeRect(-26 + k * 11, -34, 7, 8); }
    x.fillStyle = "#5A3A1E"; x.beginPath(); x.moveTo(-12, 28); x.lineTo(-12, 2); x.arc(0, 2, 12, Math.PI, 0); x.lineTo(12, 28); x.fill(); x.stroke();
    x.strokeStyle = "#7A4A26"; x.lineWidth = 2; x.beginPath(); x.moveTo(0, -26); x.lineTo(0, -62); x.stroke(); x.fillStyle = "#2E86DE"; x.beginPath(); x.moveTo(0, -62); x.lineTo(24, -56); x.lineTo(0, -48); x.fill();
    x.restore();
  }
  function padDraw(x, px, py) { x.save(); x.translate(px, py); x.globalAlpha = .3; ellipse(x, 0, 5, 30, 11, "#000"); x.globalAlpha = 1; ellipse(x, 0, 0, 28, 14, "#8A7A64"); x.strokeStyle = OL; x.lineWidth = 2; x.beginPath(); x.ellipse(0, 0, 28, 14, 0, 0, 7); x.stroke(); ellipse(x, 0, -2, 23, 10, "#B0A088"); for (let k = 0; k < 6; k++) { const a = k / 6 * 6.28; x.strokeStyle = "rgba(0,0,0,.25)"; x.beginPath(); x.moveTo(Math.cos(a) * 10, -2 + Math.sin(a) * 4); x.lineTo(Math.cos(a) * 22, -2 + Math.sin(a) * 9); x.stroke(); } x.restore(); }

  /* ---------- kule çizimi ---------- */
  function drawTower(t) {
    const lv = t.lv, x = t.x, y = t.y, rec = t.anim > 0 ? t.anim * 10 : 0;
    ctx.save(); ctx.translate(x, y);
    const stone = lv >= 1, body = t.type === "okcu" ? (stone ? "#A89A88" : "#A0673A") : t.type === "top" ? "#8E8A96" : t.type === "buz" ? "#8FA6D8" : "#8A7AB8";
    const hgt = 34 + lv * 8, w = 22 + lv * 2;
    // gövde
    ctx.fillStyle = body; ctx.strokeStyle = OL; ctx.lineWidth = 2.5;
    ctx.beginPath(); ctx.moveTo(-w, 0); ctx.lineTo(-w + 3, -hgt); ctx.lineTo(w - 3, -hgt); ctx.lineTo(w, 0); ctx.quadraticCurveTo(0, 10, -w, 0); ctx.fill(); ctx.stroke();
    ctx.fillStyle = "rgba(0,0,0,.15)"; ctx.beginPath(); ctx.moveTo(4, 4); ctx.lineTo(w, 0); ctx.lineTo(w - 3, -hgt); ctx.lineTo(4, -hgt); ctx.fill();
    if (t.type === "okcu" && !stone) { ctx.strokeStyle = "rgba(0,0,0,.25)"; ctx.lineWidth = 1.5; for (let i = -w + 6; i < w; i += 7) { ctx.beginPath(); ctx.moveTo(i, 2); ctx.lineTo(i, -hgt); ctx.stroke(); } }
    else { ctx.strokeStyle = "rgba(0,0,0,.2)"; ctx.lineWidth = 1.2; for (let r = 1; r < 4; r++) { ctx.beginPath(); ctx.moveTo(-w + 2, -r * hgt / 4); ctx.lineTo(w - 2, -r * hgt / 4); ctx.stroke(); } }
    ctx.fillStyle = "#2A1E12"; ctx.beginPath(); ctx.arc(0, -hgt * .45, 4, Math.PI, 0); ctx.lineTo(4, -hgt * .3); ctx.lineTo(-4, -hgt * .3); ctx.fill();
    // tepe
    const top = -hgt;
    ctx.fillStyle = body; ctx.strokeStyle = OL; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.ellipse(0, top, w, 8, 0, 0, 7); ctx.fill(); ctx.stroke();
    if (t.type !== "buz" && t.type !== "yildirim") { ctx.fillStyle = body; for (let k = 0; k < 5; k++) { const a = Math.PI + k / 4 * Math.PI; const bx = Math.cos(a) * (w - 3), by = top + Math.sin(a) * 6; ctx.fillRect(bx - 4, by - 8, 8, 8); ctx.strokeRect(bx - 4, by - 8, 8, 8); } }
    if (t.type === "okcu") { // okçu
      ctx.save(); ctx.translate(0, top - 6); const f = Math.cos(t.ang) < 0 ? -1 : 1; ctx.scale(f, 1);
      ctx.fillStyle = lv === 2 ? "#2E86DE" : "#3FA34D"; ctx.fillRect(-5, -14, 10, 14); ctx.strokeRect(-5, -14, 10, 14); ctx.fillStyle = "#F2C49B"; ctx.beginPath(); ctx.arc(0, -19, 6, 0, 7); ctx.fill(); ctx.stroke(); ctx.fillStyle = lv === 2 ? "#2E86DE" : "#3FA34D"; ctx.beginPath(); ctx.moveTo(-7, -21); ctx.lineTo(0, -32); ctx.lineTo(7, -21); ctx.fill(); ctx.stroke();
      ctx.strokeStyle = "#7A4A26"; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(7, -9, 9, -1.2, 1.2); ctx.stroke(); ctx.strokeStyle = "#ddd"; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(7 + Math.cos(-1.2) * 9, -9 + Math.sin(-1.2) * 9); ctx.lineTo(7 - rec * .3, -9); ctx.lineTo(7 + Math.cos(1.2) * 9, -9 + Math.sin(1.2) * 9); ctx.stroke();
      ctx.restore();
      if (lv >= 1) { ctx.strokeStyle = "#6E4A26"; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(w - 4, top); ctx.lineTo(w - 4, top - 30); ctx.stroke(); ctx.fillStyle = lv === 2 ? "#E8463F" : "#FFD23F"; ctx.beginPath(); ctx.moveTo(w - 4, top - 30); ctx.lineTo(w + 12 + Math.sin(clock * 6) * 2, top - 25); ctx.lineTo(w - 4, top - 20); ctx.fill(); }
    } else if (t.type === "top") {
      ctx.save(); ctx.translate(0, top - 4); ctx.rotate(t.ang); ctx.fillStyle = "#3A3A44"; ctx.strokeStyle = OL; ctx.lineWidth = 2; const bl = 22 + lv * 4; ctx.fillRect(-4 - rec, -6 - lv, bl, 12 + lv * 2); ctx.strokeRect(-4 - rec, -6 - lv, bl, 12 + lv * 2); ctx.fillStyle = "#5A5A66"; ctx.fillRect(bl - 8 - rec, -7 - lv, 6, 14 + lv * 2); ctx.restore();
      ctx.fillStyle = "#5A5A66"; ctx.beginPath(); ctx.arc(0, top - 4, 9, 0, 7); ctx.fill(); ctx.stroke();
      if (lv === 2) { ctx.fillStyle = "#FFD23F"; ctx.beginPath(); ctx.arc(0, top - 4, 3, 0, 7); ctx.fill(); }
    } else if (t.type === "buz") {
      ctx.fillStyle = "#5A6AB8"; ctx.beginPath(); ctx.moveTo(-w + 2, top); ctx.lineTo(0, top - 26 - lv * 6); ctx.lineTo(w - 2, top); ctx.fill(); ctx.stroke();
      const cy = top - 40 - lv * 7 + Math.sin(clock * 2) * 3; ctx.fillStyle = "rgba(157,246,255,.35)"; ctx.beginPath(); ctx.arc(0, cy, 14 + lv * 3, 0, 7); ctx.fill();
      ctx.fillStyle = "#BDF4FF"; ctx.beginPath(); ctx.moveTo(0, cy - 11 - lv * 2); ctx.lineTo(7, cy); ctx.lineTo(0, cy + 11 + lv * 2); ctx.lineTo(-7, cy); ctx.closePath(); ctx.fill(); ctx.stroke(); ctx.fillStyle = "#fff"; ctx.fillRect(-2, cy - 6, 2, 6);
    } else {
      ctx.fillStyle = "#4A3A80"; ctx.beginPath(); ctx.moveTo(-w + 4, top); ctx.lineTo(-6, top - 22 - lv * 5); ctx.lineTo(6, top - 22 - lv * 5); ctx.lineTo(w - 4, top); ctx.fill(); ctx.stroke();
      ctx.strokeStyle = "#C88A4A"; ctx.lineWidth = 2; for (let k = 0; k < 3; k++) { ctx.beginPath(); ctx.ellipse(0, top - 8 - k * 6, 9 - k * 1.5, 3, 0, 0, 7); ctx.stroke(); }
      const cy = top - 30 - lv * 6; ctx.fillStyle = "rgba(180,140,255,.4)"; ctx.beginPath(); ctx.arc(0, cy, 13 + Math.sin(clock * 9) * 2 + lv * 2, 0, 7); ctx.fill(); ctx.fillStyle = "#E9DCFF"; ctx.beginPath(); ctx.arc(0, cy, 7 + lv, 0, 7); ctx.fill(); ctx.strokeStyle = OL; ctx.lineWidth = 2; ctx.stroke();
      if (Math.random() < .3) { ctx.strokeStyle = "#fff"; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(0, cy); ctx.lineTo(rnd(-14, 14), cy + rnd(-14, 14)); ctx.stroke(); }
    }
    // seviye yıldızları
    for (let k = 0; k <= lv; k++) { const sx = (k - lv / 2) * 11; starShape(ctx, sx, 12, 5, "#FFD23F"); }
    ctx.restore();
  }
  function starShape(c, x, y, R, col) { c.beginPath(); for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5, r = i % 2 ? R * .45 : R; c.lineTo(x + Math.cos(a) * r, y + Math.sin(a) * r); } c.closePath(); c.fillStyle = col; c.fill(); c.strokeStyle = OL; c.lineWidth = 1.2; c.stroke(); }

  /* ---------- düşman çizimi ---------- */
  function drawEnemy(e) {
    const x = e.x, y = e.y, f = e.face, t = e.t, hurtC = e.hurt > 0;
    ctx.save(); ctx.translate(x, y);
    if (e.fly) { ctx.globalAlpha = .25; ctx.fillStyle = "#000"; ctx.beginPath(); ctx.ellipse(0, 8, e.r, e.r * .35, 0, 0, 7); ctx.fill(); ctx.globalAlpha = 1; ctx.translate(0, -26 - Math.sin(t * 4) * 3); }
    else { ctx.globalAlpha = .25; ctx.fillStyle = "#000"; ctx.beginPath(); ctx.ellipse(0, 2, e.r, e.r * .35, 0, 0, 7); ctx.fill(); ctx.globalAlpha = 1; }
    ctx.scale(f, 1); ctx.lineWidth = 2; ctx.strokeStyle = OL; ctx.lineJoin = "round";
    const leg = Math.sin(t * 12) * 3, wh = hurtC ? "#fff" : null;
    if (e.type === "goblin") {
      ctx.strokeStyle = OL; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(-3, -6); ctx.lineTo(-3 - leg, 0); ctx.moveTo(3, -6); ctx.lineTo(3 + leg, 0); ctx.stroke(); ctx.lineWidth = 2;
      fillS(wh || "#8A5A2B", () => { ctx.beginPath(); ctx.ellipse(0, -11, 7, 7, 0, 0, 7); });
      fillS(wh || "#7CC04A", () => { ctx.beginPath(); ctx.arc(0, -22, 7, 0, 7); });
      fillS(wh || "#7CC04A", () => { ctx.beginPath(); ctx.moveTo(-5, -24); ctx.lineTo(-15, -28); ctx.lineTo(-6, -19); ctx.closePath(); });
      fillS(wh || "#7CC04A", () => { ctx.beginPath(); ctx.moveTo(5, -24); ctx.lineTo(15, -28); ctx.lineTo(6, -19); ctx.closePath(); });
      ctx.fillStyle = "#FFE066"; ctx.beginPath(); ctx.arc(3, -23, 1.6, 0, 7); ctx.fill();
      ctx.strokeStyle = "#7A4A26"; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(6, -12); ctx.lineTo(12, -22 + Math.sin(t * 6) * 2); ctx.stroke();
    } else if (e.type === "kurt") {
      ctx.strokeStyle = OL; ctx.lineWidth = 3; for (const [lx, s] of [[-8, 1], [-3, -1], [5, 1], [9, -1]]) { ctx.beginPath(); ctx.moveTo(lx, -7); ctx.lineTo(lx + leg * s, 0); ctx.stroke(); } ctx.lineWidth = 2;
      fillS(wh || "#8E8E9E", () => { ctx.beginPath(); ctx.ellipse(0, -10, 12, 6, 0, 0, 7); });
      fillS(wh || "#8E8E9E", () => { ctx.beginPath(); ctx.moveTo(-11, -12); ctx.lineTo(-20, -18 + Math.sin(t * 10) * 2); ctx.lineTo(-11, -8); ctx.closePath(); });
      fillS(wh || "#8E8E9E", () => { ctx.beginPath(); ctx.ellipse(12, -15, 6, 5, .2, 0, 7); });
      fillS(wh || "#8E8E9E", () => { ctx.beginPath(); ctx.moveTo(14, -15); ctx.lineTo(22, -13); ctx.lineTo(15, -11); ctx.closePath(); });
      fillS(wh || "#6E6E7E", () => { ctx.beginPath(); ctx.moveTo(9, -19); ctx.lineTo(10, -25); ctx.lineTo(13, -19); ctx.closePath(); });
      ctx.fillStyle = "#FFE066"; ctx.beginPath(); ctx.arc(14, -16, 1.5, 0, 7); ctx.fill();
    } else if (e.type === "ork") {
      ctx.strokeStyle = OL; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(-4, -8); ctx.lineTo(-4 - leg, 0); ctx.moveTo(4, -8); ctx.lineTo(4 + leg, 0); ctx.stroke(); ctx.lineWidth = 2;
      fillS(wh || "#5A6A7A", () => { ctx.beginPath(); ctx.rect(-9, -24, 18, 17); });
      fillS(wh || "#4E7A3A", () => { ctx.beginPath(); ctx.arc(0, -30, 8, 0, 7); });
      fillS(wh || "#8E8E9E", () => { ctx.beginPath(); ctx.arc(0, -32, 9, Math.PI, 0); ctx.closePath(); });
      ctx.fillStyle = "#fff"; ctx.fillRect(2, -27, 2, 3); ctx.fillRect(-4, -27, 2, 3); ctx.fillStyle = "#FF4A3A"; ctx.fillRect(2, -31, 2, 2);
      fillS(wh || "#A0673A", () => { ctx.beginPath(); ctx.ellipse(10, -16, 5, 9, 0, 0, 7); }); ctx.fillStyle = "#C9A24A"; ctx.beginPath(); ctx.arc(10, -16, 2, 0, 7); ctx.fill();
    } else if (e.type === "yarasa") {
      const fl = Math.sin(t * 18);
      fillS(wh || "#5B3F8C", () => { ctx.beginPath(); ctx.moveTo(-3, -2); ctx.quadraticCurveTo(-14, -12 - fl * 8, -20, -2 - fl * 6); ctx.quadraticCurveTo(-12, 0, -3, 3); ctx.closePath(); });
      fillS(wh || "#5B3F8C", () => { ctx.beginPath(); ctx.moveTo(3, -2); ctx.quadraticCurveTo(14, -12 - fl * 8, 20, -2 - fl * 6); ctx.quadraticCurveTo(12, 0, 3, 3); ctx.closePath(); });
      fillS(wh || "#7A5AB8", () => { ctx.beginPath(); ctx.arc(0, 0, 6, 0, 7); });
      ctx.fillStyle = "#FFE066"; ctx.fillRect(-3, -2, 2, 2); ctx.fillRect(1, -2, 2, 2);
    } else if (e.type === "trol") {
      ctx.strokeStyle = OL; ctx.lineWidth = 6; ctx.beginPath(); ctx.moveTo(-6, -10); ctx.lineTo(-6 - leg, 0); ctx.moveTo(6, -10); ctx.lineTo(6 + leg, 0); ctx.stroke(); ctx.lineWidth = 2.5;
      fillS(wh || "#8A8A7A", () => { ctx.beginPath(); ctx.ellipse(0, -24, 16, 16, 0, 0, 7); });
      fillS(wh || "#A8A898", () => { ctx.beginPath(); ctx.ellipse(4, -42, 9, 8, 0, 0, 7); });
      fillS(wh || "#6E4A26", () => { ctx.beginPath(); ctx.rect(-12, -18, 24, 8); });
      ctx.fillStyle = OL; ctx.fillRect(6, -44, 3, 3); ctx.fillStyle = "#fff"; ctx.fillRect(8, -38, 2, 3);
      ctx.save(); ctx.translate(14, -28); ctx.rotate(-.6 + Math.sin(t * 3) * .3); fillS(wh || "#7A4A26", () => { ctx.beginPath(); ctx.moveTo(-3, 0); ctx.lineTo(-5, -26); ctx.lineTo(5, -26); ctx.lineTo(3, 0); ctx.closePath(); }); ctx.restore();
    } else if (e.type === "ejderha") {
      const fl = Math.sin(t * 5);
      fillS(wh || "#B8282A", () => { ctx.beginPath(); ctx.moveTo(-6, -10); ctx.quadraticCurveTo(-30, -50 - fl * 14, -46, -16 - fl * 10); ctx.quadraticCurveTo(-26, -14, -6, 0); ctx.closePath(); });
      fillS(wh || "#B8282A", () => { ctx.beginPath(); ctx.moveTo(6, -10); ctx.quadraticCurveTo(28, -52 - fl * 14, 44, -18 - fl * 10); ctx.quadraticCurveTo(24, -14, 6, 0); ctx.closePath(); });
      fillS(wh || "#E8463F", () => { ctx.beginPath(); ctx.ellipse(0, -6, 22, 12, 0, 0, 7); });
      fillS(wh || "#E8463F", () => { ctx.beginPath(); ctx.moveTo(-20, -6); ctx.quadraticCurveTo(-38, -2, -44, 10); ctx.lineTo(-36, 4); ctx.quadraticCurveTo(-30, 0, -18, 2); ctx.closePath(); });
      fillS(wh || "#E8463F", () => { ctx.beginPath(); ctx.ellipse(26, -14, 11, 8, -.3, 0, 7); });
      fillS(wh || "#FFE9A0", () => { ctx.beginPath(); ctx.moveTo(20, -22); ctx.lineTo(18, -34); ctx.lineTo(25, -22); ctx.closePath(); });
      ctx.fillStyle = "#FFE066"; ctx.beginPath(); ctx.arc(28, -16, 2.5, 0, 7); ctx.fill();
      if (Math.random() < .2) parts.push({ x: x + 36 * f, y: y - 40, vx: 60 * f, vy: rnd(-10, 10), life: .4, c: pick(["#FF8A2E", "#FFD23F"]), s: 4 });
    }
    ctx.restore();
    // can çubuğu
    if (e.hp < e.max) { const bw = Math.max(20, e.r * 2), by = y - (e.fly ? 62 : e.type === "trol" ? 60 : e.type === "ork" ? 46 : 38); ctx.fillStyle = "rgba(0,0,0,.6)"; ctx.fillRect(x - bw / 2 - 1, by - 1, bw + 2, 6); ctx.fillStyle = e.hp / e.max > .5 ? "#7CE05A" : e.hp / e.max > .25 ? "#FFD23F" : "#FF5A4A"; ctx.fillRect(x - bw / 2, by, bw * Math.max(0, e.hp / e.max), 4); }
    if (e.slowT > 0) { ctx.globalAlpha = .5; ctx.fillStyle = "#9FE3FA"; ctx.beginPath(); ctx.ellipse(x, y, e.r + 2, (e.r + 2) * .4, 0, 0, 7); ctx.fill(); ctx.globalAlpha = 1; }
  }
  function fillS(col, path) { path(); ctx.fillStyle = col; ctx.fill(); ctx.stroke(); }

  /* ---------- ana çizim ---------- */
  function draw() {
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    if (!LV) { ctx.fillStyle = "#1C2414"; ctx.fillRect(0, 0, W, H); return; }
    const sx = shake > 0 ? rnd(-3, 3) : 0, sy = shake > 0 ? rnd(-3, 3) : 0; ctx.translate(sx, sy);
    ctx.drawImage(bgCv, 0, 0);
    // boş taşlarda ipucu
    if (!started) for (const p of pads) if (!p.tower) { ctx.globalAlpha = .35 + .25 * Math.sin(clock * 4); ctx.strokeStyle = "#FFE9A0"; ctx.lineWidth = 2; ctx.beginPath(); ctx.ellipse(p.x, p.y, 30, 15, 0, 0, 7); ctx.stroke(); ctx.globalAlpha = 1; }
    if (menu && menu.tower) rangeCircle(menu.tower.x, menu.tower.y - 10, T(menu.tower, "range"), "rgba(255,255,255,.12)");
    const L = [];
    for (const t of towers) L.push({ y: t.y, f: () => drawTower(t) });
    for (const e of enemies) if (!e.fly) L.push({ y: e.y, f: () => drawEnemy(e) });
    L.sort((a, b) => a.y - b.y).forEach((o) => o.f());
    for (const e of enemies) if (e.fly) drawEnemy(e);
    for (const s of shots) drawShot(s);
    for (const b of bolts) drawBolt(b);
    for (const m of meteors) drawMeteor(m);
    for (const p of parts) { if (p.c === "ring") { ctx.globalAlpha = p.life * 3; ctx.strokeStyle = "#FFF3B0"; ctx.lineWidth = 4; ctx.beginPath(); ctx.ellipse(p.x, p.y, p.s * (1 - p.life * 2), p.s * .5 * (1 - p.life * 2), 0, 0, 7); ctx.stroke(); ctx.globalAlpha = 1; continue; } ctx.globalAlpha = Math.min(1, p.life * 3); ctx.fillStyle = p.c; ctx.fillRect(p.x - p.s / 2, p.y - p.s / 2, p.s, p.s); } ctx.globalAlpha = 1;
    if (LV.theme === "lava") { ctx.fillStyle = "rgba(255,80,20," + (.05 + .03 * Math.sin(clock)) + ")"; ctx.fillRect(0, 0, W, H); }
    if (LV.theme === "snow") { ctx.fillStyle = "rgba(255,255,255,.8)"; for (let i = 0; i < 40; i++) { const fx = (i * 97 + clock * 20) % W, fy = (i * 53 + clock * 40 + Math.sin(clock + i) * 10) % H; ctx.fillRect(fx, fy, 2, 2); } }
    if (menu) drawMenu();
    if (meteorAim) { ctx.fillStyle = "rgba(255,120,40,.12)"; ctx.fillRect(0, TOP, W, H - TOP); }
    for (const f of floaters) { ctx.globalAlpha = Math.max(0, 1 - f.t / (f.big ? 1.8 : 1.1)); txt(f.text, f.x, f.y - f.t * (f.big ? 10 : 30), f.big ? 34 : 16, f.col); } ctx.globalAlpha = 1;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    hud();
    if (paused && state === "play") { ctx.fillStyle = "rgba(0,0,0,.45)"; ctx.fillRect(0, 0, W, H); txt("DURAKLATILDI", W / 2, H / 2 - 10, 44, "#FFD23F"); txt("Devam etmek için dokun", W / 2, H / 2 + 34, 20, "#fff"); }
    if (state === "won" || state === "lost") { ctx.fillStyle = "rgba(0,0,0,.35)"; ctx.fillRect(0, 0, W, H); txt(state === "won" ? "ZAFER!" : "KALE DÜŞTÜ...", W / 2, H / 2, 64, state === "won" ? "#FFD23F" : "#FF6B6B"); }
  }
  function rangeCircle(x, y, r, col) { ctx.fillStyle = col; ctx.strokeStyle = "rgba(255,255,255,.5)"; ctx.lineWidth = 2; ctx.setLineDash([8, 6]); ctx.beginPath(); ctx.ellipse(x, y, r, r * .8, 0, 0, 7); ctx.fill(); ctx.stroke(); ctx.setLineDash([]); }
  function drawShot(s) {
    if (s.k === "arrow") { ctx.save(); ctx.translate(s.x, s.y); ctx.rotate(s.ang || 0); ctx.strokeStyle = "#7A4A26"; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(-10, 0); ctx.lineTo(6, 0); ctx.stroke(); ctx.fillStyle = "#ddd"; ctx.beginPath(); ctx.moveTo(9, 0); ctx.lineTo(4, -3); ctx.lineTo(4, 3); ctx.fill(); ctx.fillStyle = "#E8463F"; ctx.fillRect(-11, -2, 4, 4); ctx.restore(); }
    else if (s.k === "ball") { const k = Math.min(1, s.t / s.d), x = s.x0 + (s.x1 - s.x0) * k, y = s.y0 + (s.y1 - s.y0) * k - Math.sin(k * Math.PI) * 70; ctx.globalAlpha = .3; ctx.fillStyle = "#000"; ctx.beginPath(); ctx.ellipse(s.x0 + (s.x1 - s.x0) * k, s.y0 + 30 + (s.y1 - s.y0 - 30) * k, 6, 2.5, 0, 0, 7); ctx.fill(); ctx.globalAlpha = 1; ctx.fillStyle = "#2A2A34"; ctx.beginPath(); ctx.arc(x, y, 6, 0, 7); ctx.fill(); ctx.fillStyle = "#8A8A9A"; ctx.fillRect(x - 3, y - 3, 2, 2); }
    else { ctx.fillStyle = "rgba(157,246,255,.4)"; ctx.beginPath(); ctx.arc(s.x, s.y, 9, 0, 7); ctx.fill(); ctx.fillStyle = "#E6FCFF"; ctx.beginPath(); ctx.arc(s.x, s.y, 4.5, 0, 7); ctx.fill(); parts.push({ x: s.x, y: s.y, vx: 0, vy: 10, life: .25, c: "#BDF4FF", s: 2 }); }
  }
  function drawBolt(b) { ctx.strokeStyle = "rgba(200,170,255," + (1 - b.t / .18) + ")"; ctx.lineWidth = 5; jag(b); ctx.strokeStyle = "#fff"; ctx.lineWidth = 2; jag(b); }
  function jag(b) { ctx.beginPath(); ctx.moveTo(b.x0, b.y0); const n = 6; for (let i = 1; i < n; i++) { const k = i / n; ctx.lineTo(b.x0 + (b.x1 - b.x0) * k + rnd(-8, 8), b.y0 + (b.y1 - b.y0) * k + rnd(-8, 8)); } ctx.lineTo(b.x1, b.y1); ctx.stroke(); }
  function drawMeteor(m) { if (m.t < 0) return; const k = Math.min(1, m.t / m.d); if (!m.hit) { const x = m.x - 160 * (1 - k), y = m.y - 300 * (1 - k); ctx.globalAlpha = .3; ctx.fillStyle = "#000"; ctx.beginPath(); ctx.ellipse(m.x, m.y, 30 * k, 12 * k, 0, 0, 7); ctx.fill(); ctx.globalAlpha = 1; ctx.strokeStyle = "rgba(255,160,40,.6)"; ctx.lineWidth = 10; ctx.beginPath(); ctx.moveTo(x - 50, y - 90); ctx.lineTo(x, y); ctx.stroke(); ctx.fillStyle = "#5A3A2A"; ctx.beginPath(); ctx.arc(x, y, 14, 0, 7); ctx.fill(); ctx.fillStyle = "#FF8A2E"; ctx.beginPath(); ctx.arc(x + 3, y - 3, 7, 0, 7); ctx.fill(); } }
  function drawMenu() {
    const m = menu;
    for (const o of m.opts) {
      const can = o.icon === "sell" ? true : o.icon === "up" ? gold >= o.cost : !o.locked && gold >= o.cost;
      ctx.save(); ctx.translate(o.x, o.y);
      ctx.fillStyle = "rgba(0,0,0,.35)"; ctx.beginPath(); ctx.arc(2, 3, 25, 0, 7); ctx.fill();
      ctx.fillStyle = o.icon === "sell" ? "#6A4A2A" : can ? "#3A2E1A" : "#3A3A3A"; ctx.strokeStyle = can ? "#FFD23F" : "#777"; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(0, 0, 24, 0, 7); ctx.fill(); ctx.stroke();
      if (o.icon === "up") { ctx.fillStyle = can ? "#7CE05A" : "#888"; ctx.beginPath(); ctx.moveTo(0, -14); ctx.lineTo(11, 0); ctx.lineTo(4, 0); ctx.lineTo(4, 10); ctx.lineTo(-4, 10); ctx.lineTo(-4, 0); ctx.lineTo(-11, 0); ctx.closePath(); ctx.fill(); ctx.strokeStyle = OL; ctx.lineWidth = 1.5; ctx.stroke(); }
      else if (o.icon === "sell") { ctx.fillStyle = "#FFD23F"; ctx.beginPath(); ctx.arc(0, -2, 10, 0, 7); ctx.fill(); ctx.strokeStyle = OL; ctx.lineWidth = 1.5; ctx.stroke(); txt("$", 0, -1, 13, "#8A5A08"); }
      else { ctx.save(); ctx.scale(.42, .42); ctx.translate(0, 26); const fake = { type: o.icon, lv: 0, x: 0, y: 0, ang: 0, anim: 0 }; if (o.locked) ctx.globalAlpha = .4; drawTowerAt(fake); ctx.restore(); if (o.locked) txt("🔒", 0, 0, 18, "#fff"); }
      ctx.restore();
      if (o.cost != null) { ctx.fillStyle = "rgba(20,14,6,.85)"; const tx = o.x, ty = o.y + 30; ctx.beginPath(); ctx.roundRect ? ctx.roundRect(tx - 24, ty - 9, 48, 18, 9) : ctx.rect(tx - 24, ty - 9, 48, 18); ctx.fill(); txt((o.icon === "sell" ? "+" : "") + o.cost, tx, ty + 1, 14, o.icon === "sell" ? "#9FE870" : can ? "#FFD23F" : "#FF8A80"); }
    }
    if (m.build) { const hov = m.opts; void hov; }
  }
  function drawTowerAt(t) { const save = { x: t.x, y: t.y }; drawTower(t); return save; }
  function txt(s, x, y, size, col) { ctx.font = "800 " + size + "px Rubik, sans-serif"; ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.lineWidth = Math.max(3, size * .18); ctx.strokeStyle = "rgba(20,14,6,.9)"; ctx.strokeText(s, x, y); ctx.fillStyle = col; ctx.fillText(s, x, y); }
  function hud() {
    const g = ctx.createLinearGradient(0, 0, 0, TOP); g.addColorStop(0, "rgba(40,30,16,.95)"); g.addColorStop(1, "rgba(28,20,10,.9)"); ctx.fillStyle = g; ctx.fillRect(0, 0, W, TOP); ctx.fillStyle = "#C9A24A"; ctx.fillRect(0, TOP - 3, W, 3);
    // altın, can, dalga
    ctx.fillStyle = "#FFD23F"; ctx.beginPath(); ctx.arc(26, 24, 12, 0, 7); ctx.fill(); ctx.strokeStyle = OL; ctx.lineWidth = 2; ctx.stroke(); txt(String(gold), 74, 25, 22, "#FFE9A0");
    ctx.fillStyle = "#FF5A5A"; ctx.beginPath(); ctx.moveTo(140, 32); ctx.bezierCurveTo(122, 20, 130, 8, 140, 16); ctx.bezierCurveTo(150, 8, 158, 20, 140, 32); ctx.fill(); ctx.stroke(); txt(String(lives), 180, 25, 22, "#FFB3B3");
    txt("Dalga " + Math.min(wave, waves.length) + "/" + waves.length, 280, 25, 20, "#fff");
    txt(LV.name, 470, 25, 18, "#CFC4A8");
    // düğmeler
    const btn = (b, draw, on, glow) => { ctx.fillStyle = on ? "#5A4A2A" : "#3A2E1A"; ctx.strokeStyle = glow ? "#FFD23F" : "#8A7A4A"; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.arc(b.x, b.y, b.r, 0, 7); ctx.fill(); ctx.stroke(); draw(b.x, b.y); };
    btn(BTN.pause, (x, y) => { ctx.fillStyle = "#fff"; if (paused) { ctx.beginPath(); ctx.moveTo(x - 5, y - 8); ctx.lineTo(x + 8, y); ctx.lineTo(x - 5, y + 8); ctx.fill(); } else { ctx.fillRect(x - 6, y - 8, 4, 16); ctx.fillRect(x + 2, y - 8, 4, 16); } }, paused);
    btn(BTN.speed, (x, y) => txt(speed + "×", x, y + 1, 16, speed > 1 ? "#FFD23F" : "#fff"), speed > 1);
    btn(BTN.meteor, (x, y) => { ctx.fillStyle = meteorCd > 0 ? "#6A5A4A" : "#FF8A2E"; ctx.beginPath(); ctx.arc(x + 2, y + 2, 8, 0, 7); ctx.fill(); ctx.strokeStyle = meteorCd > 0 ? "#6A5A4A" : "#FFD23F"; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(x - 10, y - 10); ctx.lineTo(x - 2, y - 2); ctx.stroke(); if (meteorCd > 0) { ctx.strokeStyle = "#FFD23F"; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(x, y, 18, -Math.PI / 2, -Math.PI / 2 + (1 - meteorCd / 40) * Math.PI * 2); ctx.stroke(); } }, meteorAim, meteorCd <= 0);
    const canCall = wave < waves.length && (!waveActive || spawnQ.length === 0);
    btn(BTN.wave, (x, y) => { ctx.strokeStyle = "#fff"; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(x - 8, y + 8); ctx.lineTo(x + 8, y - 8); ctx.moveTo(x + 8, y + 8); ctx.lineTo(x - 8, y - 8); ctx.stroke(); }, false, !started || canCall);
    if (!started) { const b = BTN.wave; ctx.globalAlpha = .5 + .5 * Math.sin(clock * 5); ctx.strokeStyle = "#FFD23F"; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(b.x, b.y, b.r + 6, 0, 7); ctx.stroke(); ctx.globalAlpha = 1; txt("Başlat!", b.x - 4, b.y + 38, 15, "#FFD23F"); }
    else if (!waveActive && countdown > 0) txt(Math.ceil(countdown) + " sn", BTN.wave.x, BTN.wave.y + 36, 14, "#FFD23F");
  }

  /* ---------- menüler ---------- */
  function showEnd(won, st) {
    $("endTitle").textContent = won ? "Zafer! " + LV.name + " kurtarıldı" : "Kale düştü!";
    $("endStars").innerHTML = won ? "★".repeat(st) + "<i>" + "★".repeat(3 - st) + "</i>" : "<i>★★★</i>";
    $("endTx").textContent = won ? (st === 3 ? "Kusursuz savunma! Tek can bile kaybetmeye yakındın." : "Kalan can: " + lives + ". 3 yıldız için 18 can kalmalı.") : "Kuleleri yolun dönemeçlerine kur ve yükseltmeyi unutma. Ork'lara yıldırım, yarasalara okçu iyi gelir!";
    $("endNext").hidden = !won || li >= LEVELS.length - 1; $("end").hidden = false; ($("endNext").hidden ? $("endAgain") : $("endNext")).focus();
  }
  $("endNext").onclick = () => { $("end").hidden = true; loadLevel(li + 1); };
  $("endAgain").onclick = () => { $("end").hidden = true; loadLevel(li); };
  $("endMap").onclick = () => { $("end").hidden = true; openMaps(); };
  function openMaps() {
    state = "maps"; $("title").hidden = true; $("maps").hidden = false; const box = $("mapList"); box.innerHTML = "";
    const cur = LEVELS.findIndex((L, i) => SV.stars[i] == null);
    LEVELS.forEach((L, i) => {
      const b = document.createElement("button"); b.type = "button"; b.className = "mcard" + (i === cur ? " cur" : ""); b.disabled = i > 0 && SV.stars[i - 1] == null;
      const c = document.createElement("canvas"); c.width = 320; c.height = 200; const x = c.getContext("2d"); const P = L.paths.map(prepPath); const pd = makePads(L, P); x.drawImage(renderBg(L, P, pd), 0, 0, 320, 200);
      const st = SV.stars[i]; b.appendChild(c);
      const t = document.createElement("div"); t.innerHTML = "<b>" + (i + 1) + ". " + L.name + "</b><div class='st'>" + (st == null ? (b.disabled ? "🔒" : "<i>★★★</i>") : "★".repeat(st) + "<i>" + "★".repeat(3 - st) + "</i>") + "</div><div>" + L.waves + " dalga</div>"; b.appendChild(t);
      b.onclick = () => { audio(); $("maps").hidden = true; loadLevel(i); };
      box.appendChild(b);
    });
  }
  $("toTitle").onclick = () => { $("maps").hidden = true; showTitle(); };
  $("mapBtn").onclick = () => { if (state === "play" && started && !confirm("Haritaya dönülsün mü? Bu savaş kaybolur.")) return; LV = null; openMaps(); };
  function showTitle() {
    state = "title"; $("title").hidden = false;
    const c = $("logoCv"), x = c.getContext("2d"); x.clearRect(0, 0, 360, 170);
    castle(x, 180, 110);
    x.save(); x.translate(70, 150); x.scale(1.4, 1.4); drawTowerOn(x, { type: "okcu", lv: 2, x: 0, y: 0, ang: 0, anim: 0 }); x.restore();
    x.save(); x.translate(290, 150); x.scale(1.4, 1.4); drawTowerOn(x, { type: "yildirim", lv: 2, x: 0, y: 0, ang: 0, anim: 0 }); x.restore();
  }
  function drawTowerOn(c, t) { const old = ctxSwap(c); drawTower(t); ctxSwap(old); }
  function ctxSwap(c) { const o = ctx; ctx = c; return o; }
  $("play").onclick = () => { audio(); openMaps(); };
  const muteBtn = $("mute");
  function setMute(m) { muted = m; muteBtn.setAttribute("aria-pressed", m ? "true" : "false"); muteBtn.setAttribute("aria-label", m ? "Sesi aç" : "Sesi kapat"); if (master) master.gain.value = m ? 0 : 1; try { localStorage.setItem(SAVE + ":mute", m ? "1" : "0"); } catch (e) {} }
  setMute(muted); muteBtn.onclick = () => { audio(); setMute(!muted); };

  /* ---------- ölçek ve döngü ---------- */
  const stage = $("stage"), screen = $("screen");
  function fit() { const w = screen.clientWidth, h = screen.clientHeight; if (!w || !h) return; let sw = w, sh = w * H / W; if (sh > h) { sh = h; sw = h * W / H; } stage.style.width = Math.floor(sw) + "px"; stage.style.height = Math.floor(sh) + "px"; stage.style.setProperty("--fs", clamp(sw / 50, 12, 19).toFixed(1) + "px"); }
  addEventListener("resize", fit); if (window.ResizeObserver) new ResizeObserver(fit).observe(screen); fit();
  let last = performance.now();
  function frame(t) { const dt = Math.min(.05, (t - last) / 1000); last = t; for (let i = 0; i < speed; i++) update(dt); draw(); requestAnimationFrame(frame); }
  requestAnimationFrame(frame);
  showTitle();

  window.__km = { LEVELS, TOWERS, get towers() { return towers; }, get pads() { return pads; }, get enemies() { return enemies; }, get state() { return state; }, get gold() { return gold; }, set gold(v) { gold = v; }, get lives() { return lives; }, get wave() { return wave; }, get waves() { return waves; }, get waveActive() { return waveActive; }, loadLevel, update, tap, startWave, callEarly, setFast(v) { fast = v; }, SV, makePads, prepPath, distToPaths,
    build(pi, type) { const p = pads[pi]; if (p.tower || gold < TOWERS[type].cost[0]) return false; gold -= TOWERS[type].cost[0]; const tw = { type, lv: 0, x: p.x, y: p.y, cd: 0, ang: 0, anim: 0, spent: TOWERS[type].cost[0], pad: p }; towers.push(tw); p.tower = tw; return true; },
    upgrade(t) { if (t.lv >= 2) return false; const c = TOWERS[t.type].cost[t.lv + 1]; if (gold < c) return false; gold -= c; t.spent += c; t.lv++; return true; } };
})();
