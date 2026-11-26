/* Oyuncak Rallisi — aile için oyuncak araba yarışı */
(function () {
  "use strict";
  const W = 960, H = 600, TOP = 40, HALF = 44, LAPS = 3;
  const $ = (id) => document.getElementById(id);
  const cv = $("cv"); let ctx = cv.getContext("2d");
  const SAVE = "oyuncak-rallisi";
  const rnd = (a, b) => a + Math.random() * (b - a);
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const pick = (a) => a[Math.floor(Math.random() * a.length)];
  const OL = "#2A1A10";
  const COLS = ["#E8463F", "#2E86DE", "#3FA34D", "#F2B530", "#9B59D0", "#FF8A3D"];
  const KEYS = [["KeyA", "KeyD", "KeyW"], ["ArrowLeft", "ArrowRight", "ArrowUp"], ["KeyJ", "KeyL", "KeyI"], ["KeyV", "KeyN", "KeyB"]];
  const KEYN = ["A D · W", "← → · ↑", "J L · I", "V N · B"];

  /* ---------- pistler ---------- */
  const TRACKS = [
    { name: "Mutfak Masası", theme: "mutfak", pts: [[150, 320], [200, 150], [480, 105], [770, 140], [850, 310], [770, 480], [580, 500], [480, 390], [380, 500], [200, 480]] },
    { name: "Bahçe", theme: "bahce", pts: [[120, 230], [270, 100], [500, 160], [700, 95], [865, 230], [810, 440], [610, 510], [480, 390], [330, 520], [140, 450]] },
    { name: "Çocuk Odası", theme: "oda", pts: [[150, 160], [460, 100], [800, 120], [870, 290], [660, 330], [720, 500], [380, 525], [260, 380], [110, 340]] },
    { name: "Banyo", theme: "banyo", pts: [[190, 120], [470, 200], [770, 105], [870, 300], [760, 470], [600, 400], [470, 515], [210, 520], [95, 330]] }
  ];
  function buildTrack(T) {
    const P = T.pts, n = P.length, out = [];
    for (let i = 0; i < n; i++) {
      const p0 = P[(i - 1 + n) % n], p1 = P[i], p2 = P[(i + 1) % n], p3 = P[(i + 2) % n];
      const seg = Math.hypot(p2[0] - p1[0], p2[1] - p1[1]), steps = Math.ceil(seg / 6);
      for (let k = 0; k < steps; k++) { const t = k / steps, t2 = t * t, t3 = t2 * t; out.push([.5 * ((2 * p1[0]) + (-p0[0] + p2[0]) * t + (2 * p0[0] - 5 * p1[0] + 4 * p2[0] - p3[0]) * t2 + (-p0[0] + 3 * p1[0] - 3 * p2[0] + p3[0]) * t3), .5 * ((2 * p1[1]) + (-p0[1] + p2[1]) * t + (2 * p0[1] - 5 * p1[1] + 4 * p2[1] - p3[1]) * t2 + (-p0[1] + 3 * p1[1] - 3 * p2[1] + p3[1]) * t3)]); }
    }
    const s = [0]; for (let i = 1; i < out.length; i++) s.push(s[i - 1] + Math.hypot(out[i][0] - out[i - 1][0], out[i][1] - out[i - 1][1]));
    const L = s[s.length - 1] + Math.hypot(out[0][0] - out[out.length - 1][0], out[0][1] - out[out.length - 1][1]);
    return { p: out, s, L, n: out.length };
  }
  function nearestIdx(tr, x, y, hint) {
    let best = hint, bd = 1e9; const n = tr.n;
    const range = hint == null ? n : 30;
    for (let k = -range; k <= range; k++) { const i = hint == null ? k + range : (hint + k + n) % n; if (i < 0 || i >= n) continue; const p = tr.p[i], d = (p[0] - x) ** 2 + (p[1] - y) ** 2; if (d < bd) { bd = d; best = i; } }
    return { i: best, d: Math.sqrt(bd) };
  }
  const dirAt = (tr, i) => { const a = tr.p[i], b = tr.p[(i + 3) % tr.n]; return Math.atan2(b[1] - a[1], b[0] - a[0]); };
  const posAt = (tr, i) => tr.p[((i % tr.n) + tr.n) % tr.n];
  const idxAtS = (tr, s) => { s = ((s % tr.L) + tr.L) % tr.L; let lo = 0, hi = tr.n - 1; while (lo < hi) { const m = (lo + hi + 1) >> 1; if (tr.s[m] <= s) lo = m; else hi = m - 1; } return lo; };

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
    beep(h) { tone(h ? 880 : 440, h ? .5 : .2, "square", .07); }, box() { const t = now(); [784, 988, 1175].forEach((f, i) => tone(f, .1, "square", .04, t + i * .05)); },
    turbo() { noise(.5, .1, 1200, .7); tone(200, .5, "sawtooth", .05, 0, 600); }, oil() { noise(.25, .08, 300); }, shield() { tone(600, .4, "sine", .07, 0, 1200); },
    rocket() { noise(.6, .1, 2500, 2); tone(400, .6, "square", .03, 0, 900); }, spin() { tone(700, .5, "triangle", .08, 0, 200); }, bump() { tone(150, .08, "square", .05); noise(.06, .06, 600); },
    lap() { const t = now(); tone(988, .1, "square", .05, t); tone(1319, .18, "square", .05, t + .1); }, finish() { const t = now(); [[523, 0], [659, .12], [784, .24], [1047, .36], [784, .54], [1047, .66]].forEach(([f, d]) => { tone(f, .25, "triangle", .1, t + d); tone(f / 2, .25, "sine", .05, t + d); }); }
  };
  const mf = (m) => 440 * Math.pow(2, (m - 69) / 12);
  const SONG = { bpm: 152, lead: [74, 0, 76, 78, 0, 74, 71, 0, 73, 0, 74, 76, 0, 73, 69, 0, 74, 0, 76, 78, 81, 0, 78, 76, 74, 76, 74, 73, 74, 0, 0, 0], bass: [50, 57, 50, 57, 50, 57, 50, 57, 45, 52, 45, 52, 45, 52, 45, 52, 47, 54, 47, 54, 43, 50, 43, 50, 45, 52, 45, 52, 50, 57, 50, 0] };
  let mStep = 0, mNext = 0;
  setInterval(() => { if (!ac || muted || state !== "race" || paused) { if (ac) mNext = Math.max(mNext, ac.currentTime); return; } const d = 60 / SONG.bpm / 2; if (mNext < ac.currentTime) mNext = ac.currentTime + .05; while (mNext < ac.currentTime + .3) { const i = mStep % 32; if (SONG.lead[i]) tone(mf(SONG.lead[i]), d * .9, "square", .018, mNext, 0, mg); if (SONG.bass[i]) tone(mf(SONG.bass[i]), d * .8, "triangle", .06, mNext, 0, mg); if (i % 2 === 0) noise(.03, .025, 8000); mStep++; mNext += d; } }, 90);
  // motor sesi
  let eng = null;
  function engine(on, pitch) { if (!ac || muted) { if (eng) { eng.g.gain.value = 0; } return; } if (!eng) { const o = ac.createOscillator(), g = ac.createGain(), f = ac.createBiquadFilter(); o.type = "sawtooth"; f.type = "lowpass"; f.frequency.value = 600; o.connect(f); f.connect(g); g.connect(master); g.gain.value = 0; o.start(); eng = { o, g }; } eng.g.gain.setTargetAtTime(on ? .025 : 0, ac.currentTime, .1); eng.o.frequency.setTargetAtTime(60 + pitch * 110, ac.currentTime, .1); }

  /* ---------- durum ---------- */
  let TR = null, ti = 0, karts = [], boxes = [], oils = [], rockets = [], parts = [], skid = null, bgCv = null, state = "setup", paused = false, fast = false, clock = 0, countT = 0, raceT = 0, finishOrder = [], cup = null, banner = null;
  let setup = [];
  try { const s = JSON.parse(localStorage.getItem(SAVE) || "null"); if (s && s.list) setup = s.list; } catch (e) {}
  if (!setup.length) setup = [{ name: "Egemen", easy: true, cpu: false }, { name: "Enes", easy: false, cpu: false }];
  const humans = () => karts.filter((k) => k.human);

  function startRace(trackI) {
    ti = trackI; const T = TRACKS[ti]; TR = buildTrack(T); bgCv = renderBg(T); skid = document.createElement("canvas"); skid.width = W; skid.height = H;
    karts = []; boxes = []; oils = []; rockets = []; parts = []; finishOrder = []; raceT = 0; paused = false;
    const players = cup.players;
    players.forEach((pl, i) => {
      const row = Math.floor(i / 2), col = i % 2, s = TR.L - 40 - row * 44, idx = idxAtS(TR, s), p = TR.p[idx], a = dirAt(TR, idx), off = (col ? 1 : -1) * 20;
      karts.push({ i, name: pl.name, ci: pl.ci, human: pl.human, easy: pl.easy, keyI: pl.keyI, x: p[0] - Math.sin(a) * off, y: p[1] + Math.cos(a) * off, ang: a, spd: 0, idx, lap: -1, s: TR.s[idx], prog: -TR.L + TR.s[idx], fin: 0, item: null, spin: 0, boost: 0, shield: 0, off: false, lat: rnd(-16, 16), skill: rnd(.86, .95), think: 0, steer: 0, wob: rnd(0, 6), lastS: TR.s[idx] });
    });
    for (const f of [.28, .56, .8]) { const idx = idxAtS(TR, TR.L * f), p = TR.p[idx], a = dirAt(TR, idx); for (const o of [-24, 0, 24]) boxes.push({ x: p[0] - Math.sin(a) * o, y: p[1] + Math.cos(a) * o, t: 0, gone: 0 }); }
    state = "count"; countT = 3.5; sfx.beep();
    banner = { text: (cup.mode === "cup" ? "Yarış " + (cup.race + 1) + "/4 · " : "") + T.name, t: 2 };
    buildTouch();
  }

  /* ---------- girdi ---------- */
  const keys = {}, touch = [{}, {}, {}, {}], itemP = [0, 0, 0, 0];
  addEventListener("keydown", (e) => { if (e.target && (e.target.tagName === "INPUT" || e.target.tagName === "SELECT")) return; for (let i = 0; i < 4; i++) { const k = KEYS[i].indexOf(e.code); if (k >= 0) { e.preventDefault(); if (k === 2) { if (!e.repeat) itemP[i]++; } else keys[i + "" + k] = true; } } if (e.code === "Escape" || e.code === "KeyP") paused = !paused; });
  addEventListener("keyup", (e) => { for (let i = 0; i < 4; i++) { const k = KEYS[i].indexOf(e.code); if (k >= 0 && k < 2) keys[i + "" + k] = false; } });
  addEventListener("blur", () => { for (const k in keys) keys[k] = false; });
  function buildTouch() {
    const box = $("tpads"); box.innerHTML = "";
    karts.filter((k) => k.human).forEach((k) => { const i = k.keyI; const d = document.createElement("div"); d.className = "tp p" + i; const mk = (label, cls, on, off) => { const b = document.createElement("button"); b.type = "button"; b.textContent = label; b.className = cls || ""; b.style.background = COLS[k.ci]; b.addEventListener("pointerdown", (e) => { e.preventDefault(); audio(); b.classList.add("on"); on(); try { b.setPointerCapture(e.pointerId); } catch (x) {} }); const o = (e) => { e.preventDefault(); b.classList.remove("on"); off && off(); }; b.addEventListener("pointerup", o); b.addEventListener("pointercancel", o); b.addEventListener("lostpointercapture", o); b.addEventListener("contextmenu", (e) => e.preventDefault()); return b; };
      const L = mk("◀", "", () => touch[i].l = 1, () => touch[i].l = 0), R = mk("▶", "", () => touch[i].r = 1, () => touch[i].r = 0), I = mk("★", "it", () => itemP[i]++);
      if (i < 2) d.append(I, L, R); else d.append(L, R, I); box.appendChild(d); });
  }

  /* ---------- güncelleme ---------- */
  function update(dt) {
    clock += dt;
    for (const p of parts) { p.life -= dt; p.x += p.vx * dt; p.y += p.vy * dt; } parts = parts.filter((p) => p.life > 0);
    if (banner) { banner.t -= dt; if (banner.t <= 0) banner = null; }
    if (paused || !TR) return;
    if (state === "count") { const b = Math.ceil(countT); countT -= dt; if (Math.ceil(countT) !== b && countT > 0 && countT < 3) sfx.beep(); if (countT <= 0) { state = "race"; sfx.beep(true); } for (let i = 0; i < 4; i++) itemP[i] = 0; return; }
    if (state !== "race" && state !== "done") return;
    raceT += dt;
    for (const k of karts) updKart(k, dt);
    // çarpışma
    for (let a = 0; a < karts.length; a++) for (let b = a + 1; b < karts.length; b++) { const A = karts[a], B = karts[b], dx = B.x - A.x, dy = B.y - A.y, d = Math.hypot(dx, dy); if (d < 26 && d > .01) { const nx = dx / d, ny = dy / d, ov = (26 - d) / 2; A.x -= nx * ov; A.y -= ny * ov; B.x += nx * ov; B.y += ny * ov; A.spd *= .96; B.spd *= .96; if (Math.random() < .2) sfx.bump(); } }
    // kutular
    for (const b of boxes) { if (b.gone > 0) { b.gone -= dt; continue; } b.t += dt; for (const k of karts) if (!k.item && Math.hypot(k.x - b.x, k.y - b.y) < 22) { b.gone = 4; giveItem(k); if (k.human) sfx.box(); burst(b.x, b.y, ["#FFD23F", "#FF7AA2", "#9FE3FA", "#fff"], 10); break; } }
    // yağ
    for (const o of oils) { o.t += dt; for (const k of karts) if ((k !== o.own || o.t > 1) && !k.spin && Math.hypot(k.x - o.x, k.y - o.y) < 22) { hitSpin(k, 1); o.hit = 1; } }
    oils = oils.filter((o) => o.t < 20 && !o.hit);
    // roketler
    for (const r of rockets) { r.t += dt; const tg = r.tg; if (!tg || tg.fin) { r.dead = 1; continue; } const a = Math.atan2(tg.y - r.y, tg.x - r.x); let da = a - r.ang; while (da > Math.PI) da -= Math.PI * 2; while (da < -Math.PI) da += Math.PI * 2; r.ang += clamp(da, -4 * dt, 4 * dt); r.x += Math.cos(r.ang) * 360 * dt; r.y += Math.sin(r.ang) * 360 * dt; if (Math.random() < .6) parts.push({ x: r.x, y: r.y, vx: rnd(-20, 20), vy: rnd(-20, 20), life: .4, c: pick(["#FFB020", "#FF6A3A", "#ddd"]), s: 3 }); if (Math.hypot(tg.x - r.x, tg.y - r.y) < 18) { r.dead = 1; hitSpin(tg, 1.3); burst(r.x, r.y, ["#FF6A3A", "#FFD23F", "#fff"], 18); sfx.bump(); } if (r.t > 6) r.dead = 1; }
    rockets = rockets.filter((r) => !r.dead);
    // sıralama
    const order = karts.slice().sort((a, b) => (b.fin ? 1e9 - b.finT : b.prog) - (a.fin ? 1e9 - a.finT : a.prog)); order.forEach((k, i) => k.place = i + 1);
    // bitiş
    const hs = humans();
    if (state === "race" && ((hs.length && hs.every((k) => k.fin)) || karts.every((k) => k.fin) || (finishOrder.length && raceT > finishOrder[0].finT + 30) || raceT > 300)) { state = "done"; doneT = 2.5; }
    if (state === "done") { doneT -= dt; if (doneT <= 0) { state = "results"; results(); } }
    const hk = hs[0]; if (hk && state === "race") engine(true, hk.spd / 230); else engine(false, 0);
  }
  let doneT = 0;
  function updKart(k, dt) {
    k.boost = Math.max(0, k.boost - dt); k.shield = Math.max(0, k.shield - dt);
    let nr = nearestIdx(TR, k.x, k.y, k.idx); if (nr.d > HALF * 2) { const f = nearestIdx(TR, k.x, k.y, null); if (Math.abs(TR.s[f.i] - TR.s[nr.i]) < TR.L * .2) nr = f; } k.idx = nr.i; k.off = nr.d > HALF;
    k.lost = nr.d > HALF + 26 ? (k.lost || 0) + dt : 0;
    if (k.lost > 2.2 && !k.spin) { const i = (k.idx + 4) % TR.n, p = TR.p[i]; k.x = p[0]; k.y = p[1]; k.ang = dirAt(TR, i); k.spd = 70; k.lost = 0; k.idx = i; burst(k.x, k.y, ["#fff", "#FFD23F"], 12); if (k.human) floater(k, "Piste dönüş!"); }
    // ilerleme
    const s = TR.s[k.idx]; if (s < TR.L * .25 && k.lastS > TR.L * .75) { k.lap++; if (k.lap >= 1 && k.lap < LAPS && k.human) { sfx.lap(); floater(k, "Tur " + (k.lap + 1) + "/" + LAPS); } if (k.lap >= LAPS && !k.fin) { k.fin = 1; k.finT = raceT; finishOrder.push(k); if (finishOrder.length === 1 && karts.some((o) => o.human && !o.fin)) banner = { text: k.name + " bitirdi! Son 30 saniye", t: 2.5 }; if (k.human) { sfx.finish(); floater(k, k.place === 1 ? "BİRİNCİ!" : k.place + ". oldun!"); } } } else if (s > TR.L * .75 && k.lastS < TR.L * .25) k.lap--;
    k.lastS = s; k.prog = k.lap * TR.L + s;
    if (k.spin > 0) { k.spin -= dt; k.ang += 13 * dt; k.spd *= Math.pow(.25, dt); move(k, dt); return; }
    let steer = 0, useItem = false;
    if (k.human && !k.fin) { const i = k.keyI; steer = (keys[i + "1"] || touch[i].r ? 1 : 0) - (keys[i + "0"] || touch[i].l ? 1 : 0); if (itemP[i]) { useItem = true; itemP[i] = 0; } }
    else { const c = cpuDrive(k, dt); steer = c.s; useItem = c.use; }
    const da = angDiff(k.ang, dirAt(TR, (k.idx + 8) % TR.n));
    if (k.human && k.easy) { const tgt = posAt(TR, k.idx + 14), ta = Math.atan2(tgt[1] - k.y, tgt[0] - k.x); k.ang += clamp(angDiff(k.ang, ta), -1, 1) * dt * (steer ? .8 : 3.4); }
    k.ang += steer * 3.0 * dt * clamp(k.spd / 80, .3, 1);
    k.steer = steer;
    let max = 235 * (k.boost > 0 ? 1.55 : 1); if (!k.human || k.fin) max *= k.fin ? .6 : k.skill; if (k.off) max *= k.easy && k.human ? .8 : .55;
    if (state !== "race" && !k.fin) max = 0;
    k.spd += (max - k.spd) * Math.min(1, dt * 1.7);
    if (useItem && k.item) useIt(k);
    void da;
    move(k, dt);
    if (k.off && k.spd > 60 && Math.random() < dt * 14) parts.push({ x: k.x, y: k.y, vx: rnd(-30, 30), vy: rnd(-30, 30), life: .5, c: TRACKS[ti].theme === "banyo" ? "rgba(255,255,255,.8)" : TRACKS[ti].theme === "bahce" ? "#8BD96A" : "rgba(200,170,130,.7)", s: 4 });
    if (Math.abs(steer) > 0 && k.spd > 150 && Math.random() < dt * 20) { const c = skid.getContext("2d"); c.fillStyle = "rgba(0,0,0,.08)"; for (const sd of [-1, 1]) c.fillRect(k.x - Math.cos(k.ang) * 10 + Math.sin(k.ang) * 8 * sd - 1.5, k.y - Math.sin(k.ang) * 10 - Math.cos(k.ang) * 8 * sd - 1.5, 3, 3); }
    if (k.boost > 0 && Math.random() < .7) parts.push({ x: k.x - Math.cos(k.ang) * 16, y: k.y - Math.sin(k.ang) * 16, vx: -Math.cos(k.ang) * 60 + rnd(-20, 20), vy: -Math.sin(k.ang) * 60 + rnd(-20, 20), life: .35, c: pick(["#FFD23F", "#FF8A3D", "#FF5A3A"]), s: 4 });
  }
  function move(k, dt) { k.x += Math.cos(k.ang) * k.spd * dt; k.y += Math.sin(k.ang) * k.spd * dt; if (k.x < 16) { k.x = 16; k.spd *= .5; } if (k.x > W - 16) { k.x = W - 16; k.spd *= .5; } if (k.y < TOP + 14) { k.y = TOP + 14; k.spd *= .5; } if (k.y > H - 14) { k.y = H - 14; k.spd *= .5; } }
  function angDiff(a, b) { let d = b - a; while (d > Math.PI) d -= Math.PI * 2; while (d < -Math.PI) d += Math.PI * 2; return d; }
  function cpuDrive(k, dt) {
    const look = 12 + Math.floor(k.spd / 22), p = posAt(TR, k.idx + look), a = dirAt(TR, (k.idx + look) % TR.n);
    const tx = p[0] - Math.sin(a) * k.lat, ty = p[1] + Math.cos(a) * k.lat; const da = angDiff(k.ang, Math.atan2(ty - k.y, tx - k.x));
    let use = false; k.think -= dt;
    if (k.item && k.think <= 0) { k.think = rnd(.5, 1.5); if (k.item === "turbo" || k.item === "kalkan") use = true; else if (k.item === "roket" && k.place > 1) use = Math.random() < .6; else if (k.item === "yag") use = karts.some((o) => o !== k && o.prog < k.prog && k.prog - o.prog < 140); }
    if (Math.random() < dt * .3) k.lat = rnd(-18, 18);
    return { s: clamp(da * 2.4, -1, 1), use };
  }
  function giveItem(k) {
    const behind = k.place / karts.length;
    const pool = behind > .6 ? ["turbo", "turbo", "roket", "roket", "kalkan", "yag"] : behind > .3 ? ["turbo", "roket", "kalkan", "yag", "yag"] : ["yag", "yag", "kalkan", "turbo"];
    k.item = pick(pool);
    if (k.human) floater(k, { turbo: "Turbo!", roket: "Roket!", kalkan: "Kalkan!", yag: "Yağ!" }[k.item]);
  }
  function useIt(k) {
    const it = k.item; k.item = null;
    if (it === "turbo") { k.boost = 1.6; if (k.human) sfx.turbo(); }
    else if (it === "kalkan") { k.shield = 7; if (k.human) sfx.shield(); }
    else if (it === "yag") { oils.push({ x: k.x - Math.cos(k.ang) * 26, y: k.y - Math.sin(k.ang) * 26, t: 0, own: k }); sfx.oil(); }
    else if (it === "roket") { const ahead = karts.filter((o) => o !== k && !o.fin && o.prog > k.prog).sort((a, b) => a.prog - b.prog)[0] || karts.filter((o) => o !== k && !o.fin).sort((a, b) => b.prog - a.prog)[0]; if (ahead) { rockets.push({ x: k.x + Math.cos(k.ang) * 18, y: k.y + Math.sin(k.ang) * 18, ang: k.ang, tg: ahead, t: 0 }); sfx.rocket(); } }
  }
  function hitSpin(k, t) { if (k.shield > 0) { k.shield = 0; burst(k.x, k.y, ["#9FE3FA", "#fff"], 12); sfx.shield(); return; } k.spin = t; if (k.human) { sfx.spin(); floater(k, "Fırrr!"); } }
  function burst(x, y, cols, n) { for (let i = 0; i < n; i++) { const a = rnd(0, 7), s = rnd(40, 140); parts.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, life: rnd(.3, .7), c: pick(cols), s: rnd(2, 5) }); } }
  let floaters = [];
  function floater(k, text) { floaters.push({ x: k.x, y: k.y - 30, text, col: COLS[k.ci], t: 0 }); }

  /* ---------- sonuçlar ---------- */
  const PTS = [10, 8, 6, 5, 4, 3];
  function results() {
    engine(false, 0);
    const order = karts.slice().sort((a, b) => a.place - b.place);
    let html = "<h2>🏁 " + TRACKS[ti].name + "</h2><div class='res'>";
    order.forEach((k, i) => { const pl = cup.players[k.i], pts = PTS[i] || 0; pl.score += pts; html += "<div><span class='rk' style='background:" + COLS[k.ci] + "'>" + (i + 1) + "</span><span class='nm'>" + esc(k.name) + (k.human ? "" : " 🤖") + " <small>" + (k.fin ? k.finT.toFixed(1) + " sn" : "") + "</small></span><span class='pt'>+" + pts + "</span>" + (cup.mode === "cup" ? "<span class='tot'>★ " + pl.score + "</span>" : "") + "</div>"; });
    html += "</div>";
    sfx.finish();
    cup.race++;
    const more = cup.mode === "cup" && cup.race < 4;
    card(html, [more ? "Sonraki pist ▶" : cup.mode === "cup" ? "Kupa töreni 🏆" : "Tekrar yarış", "Ana menü"]).then((k) => {
      if (k === 1) { showSetup(); return; }
      if (more) startRace(cup.race); else if (cup.mode === "cup") ceremony(); else { cup.race = 0; cup.players.forEach((p) => p.score = 0); startRace(ti); }
    });
  }
  function ceremony() {
    state = "podium"; podT = 0; const order = cup.players.slice().sort((a, b) => b.score - a.score); podium = order; sfx.finish();
    setTimeout(() => {
      const html = "<h2>🏆 " + esc(order[0].name) + " kupayı kazandı!</h2><div class='res'>" + order.map((p, i) => "<div><span class='rk' style='background:" + COLS[p.ci] + "'>" + (i + 1) + "</span><span class='nm'>" + esc(p.name) + (p.human ? "" : " 🤖") + "</span><span class='tot'>★ " + p.score + "</span></div>").join("") + "</div>";
      card(html, ["Yeni kupa", "Ana menü"]).then((k) => { if (k === 0) { newCup(); } else showSetup(); });
    }, fast ? 0 : 3500);
  }
  let podium = null, podT = 0;
  function card(html, buttons) {
    return new Promise((res) => { const c = $("card"), cin = $("cin"); cin.innerHTML = html; const bx = document.createElement("div"); bx.className = "menu-btns"; buttons.forEach((b, i) => { const e = document.createElement("button"); e.type = "button"; e.className = "btn" + (i === 0 ? " go" : ""); e.textContent = b; e.onclick = () => { audio(); c.hidden = true; res(i); }; bx.appendChild(e); }); cin.appendChild(bx); c.hidden = false; bx.querySelector("button").focus(); if (fast) { c.hidden = true; res(0); } });
  }
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;" })[c]);

  /* ---------- arka planlar ---------- */
  function renderBg(T) {
    const c = document.createElement("canvas"); c.width = W; c.height = H; const x = c.getContext("2d"), th = T.theme;
    const fillAll = (col) => { x.fillStyle = col; x.fillRect(0, 0, W, H); };
    if (th === "mutfak") { fillAll("#C8864A"); for (let i = 0; i < 12; i++) { x.fillStyle = i % 2 ? "#B87A40" : "#D09050"; x.fillRect(0, i * 52, W, 50); x.fillStyle = "rgba(0,0,0,.1)"; x.fillRect(0, i * 52 + 50, W, 2); for (let k = 0; k < 4; k++) { x.strokeStyle = "rgba(90,50,20,.2)"; x.lineWidth = 1.5; x.beginPath(); x.ellipse(rnd(0, W), i * 52 + 25, rnd(20, 60), rnd(4, 8), 0, 0, 7); x.stroke(); } }
      plate(x, 480, 300, 52); plate(x, 60, 80, 36); plate(x, 905, 560, 40); mug(x, 905, 70); mug(x, 60, 560); cookie(x, 470, 290); cookie(x, 492, 312); cookie(x, 905, 555); }
    else if (th === "bahce") { fillAll("#6CBF4F"); for (let i = 0; i < 900; i++) { x.fillStyle = Math.random() < .5 ? "#5DAF45" : "#7CCB5E"; x.fillRect(rnd(0, W), rnd(0, H), 2, 5); } x.fillStyle = "#4FA8E0"; x.beginPath(); x.ellipse(480, 300, 70, 40, 0, 0, 7); x.fill(); x.strokeStyle = "#8A8A96"; x.lineWidth = 8; x.stroke(); for (let i = 0; i < 40; i++) { const fx = rnd(0, W), fy = rnd(TOP, H); x.fillStyle = pick(["#FF7AA2", "#FFD23F", "#fff", "#B98CFF"]); for (let k = 0; k < 5; k++) { x.beginPath(); x.arc(fx + Math.cos(k * 1.26) * 4, fy + Math.sin(k * 1.26) * 4, 3, 0, 7); x.fill(); } x.fillStyle = "#E8A317"; x.beginPath(); x.arc(fx, fy, 2, 0, 7); x.fill(); } }
    else if (th === "oda") { fillAll("#B88A60"); for (let i = 0; i < 24; i++) { x.fillStyle = i % 2 ? "#A87A50" : "#C49A70"; x.fillRect(i * 40, 0, 40, H); } x.fillStyle = "#7A5AB8"; x.beginPath(); x.ellipse(480, 310, 450, 280, 0, 0, 7); x.fill(); x.strokeStyle = "#FFD23F"; x.lineWidth = 10; x.stroke(); x.strokeStyle = "rgba(255,255,255,.15)"; x.lineWidth = 3; for (let r = 60; r < 440; r += 40) { x.beginPath(); x.ellipse(480, 310, r, r * .62, 0, 0, 7); x.stroke(); } block(x, 470, 300, "#E8463F", "A"); block(x, 500, 320, "#2E86DE", "B"); block(x, 470, 330, "#3FA34D", "C"); ball(x, 60, 80); teddy(x, 900, 560); }
    else { fillAll("#BFE3F7"); for (let i = 0; i < 25; i++) for (let k = 0; k < 16; k++) { x.fillStyle = (i + k) % 2 ? "#CDEBFA" : "#B0DAF2"; x.fillRect(i * 40, k * 40, 39, 39); } x.fillStyle = "rgba(255,255,255,.9)"; for (let i = 0; i < 30; i++) { x.beginPath(); x.arc(480 + rnd(-60, 60), 300 + rnd(-35, 35), rnd(6, 16), 0, 7); x.fill(); } duck(x, 480, 296); soap(x, 70, 560); duck(x, 900, 80, .8); }
    return c;
  }
  function plate(x, cx, cy, r) { x.fillStyle = "rgba(0,0,0,.15)"; x.beginPath(); x.ellipse(cx + 4, cy + 6, r, r * .9, 0, 0, 7); x.fill(); x.fillStyle = "#fff"; x.beginPath(); x.arc(cx, cy, r, 0, 7); x.fill(); x.strokeStyle = "#D8E4EC"; x.lineWidth = 4; x.beginPath(); x.arc(cx, cy, r * .72, 0, 7); x.stroke(); }
  function mug(x, cx, cy) { x.fillStyle = "rgba(0,0,0,.15)"; x.beginPath(); x.arc(cx + 4, cy + 5, 26, 0, 7); x.fill(); x.fillStyle = "#E8463F"; x.beginPath(); x.arc(cx, cy, 26, 0, 7); x.fill(); x.fillStyle = "#5A3A1E"; x.beginPath(); x.arc(cx, cy, 20, 0, 7); x.fill(); x.strokeStyle = "#E8463F"; x.lineWidth = 6; x.beginPath(); x.arc(cx + 28, cy, 9, -1.3, 1.3); x.stroke(); }
  function cookie(x, cx, cy) { x.fillStyle = "#D89A50"; x.beginPath(); x.arc(cx, cy, 13, 0, 7); x.fill(); x.fillStyle = "#5A3A1E"; for (let k = 0; k < 5; k++) { x.beginPath(); x.arc(cx + Math.cos(k * 1.3) * 7, cy + Math.sin(k * 1.3) * 7, 2.2, 0, 7); x.fill(); } }
  function block(x, cx, cy, col, ch) { x.fillStyle = "rgba(0,0,0,.2)"; x.fillRect(cx - 14 + 4, cy - 14 + 4, 28, 28); x.fillStyle = col; x.fillRect(cx - 14, cy - 14, 28, 28); x.strokeStyle = OL; x.lineWidth = 2; x.strokeRect(cx - 14, cy - 14, 28, 28); x.fillStyle = "#fff"; x.font = "700 18px Fredoka"; x.textAlign = "center"; x.textBaseline = "middle"; x.fillText(ch, cx, cy + 1); }
  function ball(x, cx, cy) { x.fillStyle = "rgba(0,0,0,.2)"; x.beginPath(); x.arc(cx + 5, cy + 6, 28, 0, 7); x.fill(); const cols = ["#E8463F", "#FFD23F", "#2E86DE", "#3FA34D"]; for (let k = 0; k < 4; k++) { x.fillStyle = cols[k]; x.beginPath(); x.moveTo(cx, cy); x.arc(cx, cy, 28, k * Math.PI / 2, (k + 1) * Math.PI / 2); x.fill(); } x.strokeStyle = OL; x.lineWidth = 2; x.beginPath(); x.arc(cx, cy, 28, 0, 7); x.stroke(); }
  function teddy(x, cx, cy) { x.fillStyle = "#9A6234"; for (const [dx, dy, r] of [[0, 0, 26], [0, -34, 18], [-14, -48, 7], [14, -48, 7], [-26, -6, 9], [26, -6, 9], [-14, 22, 10], [14, 22, 10]]) { x.beginPath(); x.arc(cx + dx, cy + dy, r, 0, 7); x.fill(); } x.fillStyle = "#E2B98A"; x.beginPath(); x.ellipse(cx, cy - 28, 8, 6, 0, 0, 7); x.fill(); x.fillStyle = OL; x.beginPath(); x.arc(cx - 6, cy - 38, 2.5, 0, 7); x.arc(cx + 6, cy - 38, 2.5, 0, 7); x.fill(); }
  function duck(x, cx, cy, s) { s = s || 1; x.save(); x.translate(cx, cy); x.scale(s, s); x.fillStyle = "#FFD23F"; x.beginPath(); x.ellipse(0, 6, 26, 16, 0, 0, 7); x.fill(); x.beginPath(); x.arc(14, -12, 14, 0, 7); x.fill(); x.fillStyle = "#FF8A2E"; x.beginPath(); x.moveTo(26, -12); x.lineTo(38, -8); x.lineTo(26, -4); x.fill(); x.fillStyle = OL; x.beginPath(); x.arc(18, -15, 2.5, 0, 7); x.fill(); x.restore(); }
  function soap(x, cx, cy) { x.fillStyle = "#FF9EC7"; x.beginPath(); x.roundRect ? x.roundRect(cx - 30, cy - 16, 60, 32, 12) : x.rect(cx - 30, cy - 16, 60, 32); x.fill(); x.fillStyle = "rgba(255,255,255,.8)"; for (let k = 0; k < 6; k++) { x.beginPath(); x.arc(cx + rnd(-30, 30), cy - 16 + rnd(-8, 4), rnd(4, 9), 0, 7); x.fill(); } }
  const ROAD = { mutfak: ["#FF8A3D", "#E8742A"], bahce: ["#8A8A96", "#6E6E7A"], oda: ["#4DA3FF", "#2E86DE"], banyo: ["#B98CFF", "#9B59D0"] };
  function drawTrackOn(x) {
    const p = TR.p, th = TRACKS[ti].theme, [r1, r2] = ROAD[th];
    const path = () => { x.beginPath(); p.forEach(([a, b], i) => i ? x.lineTo(a, b) : x.moveTo(a, b)); x.closePath(); };
    x.lineJoin = "round"; x.lineCap = "round";
    x.strokeStyle = "rgba(0,0,0,.25)"; x.lineWidth = HALF * 2 + 14; x.save(); x.translate(4, 6); path(); x.stroke(); x.restore();
    x.strokeStyle = "#fff"; x.lineWidth = HALF * 2 + 12; path(); x.stroke();
    x.strokeStyle = "#E8463F"; x.setLineDash([16, 16]); path(); x.stroke(); x.setLineDash([]);
    x.strokeStyle = r2; x.lineWidth = HALF * 2; path(); x.stroke();
    x.strokeStyle = r1; x.lineWidth = HALF * 2 - 10; path(); x.stroke();
    x.strokeStyle = "rgba(255,255,255,.75)"; x.lineWidth = 3; x.setLineDash([14, 14]); path(); x.stroke(); x.setLineDash([]);
    // başlangıç çizgisi
    const a = dirAt(TR, 0), [sx, sy] = p[0]; x.save(); x.translate(sx, sy); x.rotate(a); for (let r = 0; r < 2; r++) for (let k = -5; k < 5; k++) { x.fillStyle = (r + k) % 2 ? "#fff" : OL; x.fillRect(r * 6 - 6, k * 9, 6, 9); } x.restore();
  }
  let trackCv = null, trackFor = -1;

  /* ---------- çizim ---------- */
  function drawKart(k) {
    ctx.save(); ctx.translate(k.x, k.y);
    ctx.fillStyle = "rgba(0,0,0,.28)"; ctx.beginPath(); ctx.ellipse(3, 5, 17, 11, k.ang, 0, 7); ctx.fill();
    ctx.rotate(k.ang); const col = COLS[k.ci];
    ctx.fillStyle = "#2A2A3A"; for (const [wx, wy] of [[-9, -11], [9, -11], [-9, 11], [9, 11]]) { ctx.save(); ctx.translate(wx, wy); if (wx > 0) ctx.rotate(k.steer * .35); ctx.fillRect(-5, -3, 10, 6); ctx.restore(); }
    ctx.fillStyle = col; ctx.strokeStyle = OL; ctx.lineWidth = 2; ctx.beginPath(); ctx.roundRect ? ctx.roundRect(-16, -10, 32, 20, 7) : ctx.rect(-16, -10, 32, 20); ctx.fill(); ctx.stroke();
    ctx.fillStyle = "rgba(255,255,255,.35)"; ctx.fillRect(-12, -8, 22, 4);
    ctx.fillStyle = "#8FD3FF"; ctx.beginPath(); ctx.roundRect ? ctx.roundRect(3, -7, 8, 14, 3) : ctx.rect(3, -7, 8, 14); ctx.fill();
    ctx.fillStyle = "#F3C49B"; ctx.beginPath(); ctx.arc(-3, 0, 6.5, 0, 7); ctx.fill(); ctx.stroke(); ctx.fillStyle = col; ctx.beginPath(); ctx.arc(-3, 0, 6.5, Math.PI * .6, Math.PI * 1.4); ctx.fill();
    ctx.fillStyle = "#fff"; ctx.fillRect(-15, -2, 3, 4);
    ctx.restore();
    if (k.shield > 0) { ctx.strokeStyle = "rgba(159,227,250," + (.5 + .3 * Math.sin(clock * 10)) + ")"; ctx.lineWidth = 4; ctx.beginPath(); ctx.arc(k.x, k.y, 24, 0, 7); ctx.stroke(); }
    if (k.human) { ctx.font = "700 13px Fredoka"; ctx.textAlign = "center"; ctx.lineWidth = 3; ctx.strokeStyle = "rgba(0,0,0,.7)"; ctx.strokeText(k.name, k.x, k.y - 22); ctx.fillStyle = "#fff"; ctx.fillText(k.name, k.x, k.y - 22); }
  }
  function draw() {
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    if (state === "podium") { drawPodium(); return; }
    if (!TR) { ctx.fillStyle = "#C8864A"; ctx.fillRect(0, 0, W, H); return; }
    ctx.drawImage(bgCv, 0, 0);
    if (trackFor !== ti || !trackCv) { trackCv = document.createElement("canvas"); trackCv.width = W; trackCv.height = H; drawTrackOn(trackCv.getContext("2d")); trackFor = ti; }
    ctx.drawImage(trackCv, 0, 0); ctx.drawImage(skid, 0, 0);
    for (const o of oils) { ctx.fillStyle = "rgba(30,20,40,.85)"; ctx.beginPath(); ctx.ellipse(o.x, o.y, 18, 12, o.x, 0, 7); ctx.fill(); ctx.fillStyle = "rgba(180,140,255,.4)"; ctx.beginPath(); ctx.ellipse(o.x - 4, o.y - 3, 6, 3, 0, 0, 7); ctx.fill(); }
    for (const b of boxes) { if (b.gone > 0) continue; ctx.save(); ctx.translate(b.x, b.y + Math.sin(clock * 3 + b.x) * 2); ctx.rotate(Math.sin(clock * 2 + b.y) * .3); const g = ctx.createLinearGradient(-11, -11, 11, 11); g.addColorStop(0, "#FF7AA2"); g.addColorStop(.5, "#FFD23F"); g.addColorStop(1, "#4DA3FF"); ctx.fillStyle = g; ctx.globalAlpha = .9; ctx.fillRect(-11, -11, 22, 22); ctx.globalAlpha = 1; ctx.strokeStyle = "#fff"; ctx.lineWidth = 2; ctx.strokeRect(-11, -11, 22, 22); ctx.fillStyle = "#fff"; ctx.font = "700 15px Fredoka"; ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.fillText("?", 0, 1); ctx.restore(); }
    for (const k of karts.slice().sort((a, b) => a.y - b.y)) drawKart(k);
    for (const r of rockets) { ctx.save(); ctx.translate(r.x, r.y); ctx.rotate(r.ang); ctx.fillStyle = "#E8463F"; ctx.fillRect(-8, -3, 14, 6); ctx.fillStyle = "#fff"; ctx.beginPath(); ctx.moveTo(6, -3); ctx.lineTo(11, 0); ctx.lineTo(6, 3); ctx.fill(); ctx.restore(); }
    for (const p of parts) { ctx.globalAlpha = Math.min(1, p.life * 2); ctx.fillStyle = p.c; ctx.beginPath(); ctx.arc(p.x, p.y, p.s, 0, 7); ctx.fill(); } ctx.globalAlpha = 1;
    for (const f of floaters) { f.t += 1 / 60; ctx.globalAlpha = Math.max(0, 1 - f.t / 1.2); txt(f.text, f.x, f.y - f.t * 30, 18, f.col); } floaters = floaters.filter((f) => f.t < 1.2); ctx.globalAlpha = 1;
    hud();
    if (state === "count") { const c = Math.ceil(countT); ctx.fillStyle = "rgba(0,0,0,.25)"; ctx.fillRect(0, 0, W, H); const lx = W / 2 - 90; ctx.fillStyle = "#2A2A3A"; ctx.beginPath(); ctx.roundRect ? ctx.roundRect(lx, 200, 180, 70, 20) : ctx.rect(lx, 200, 180, 70); ctx.fill(); for (let k = 0; k < 3; k++) { const on = c <= 3 - k && c > 0; ctx.fillStyle = on ? (c === 1 ? "#3FD06A" : "#E8463F") : "#555"; ctx.beginPath(); ctx.arc(lx + 35 + k * 55, 235, 22, 0, 7); ctx.fill(); } if (c <= 3 && c > 0) txt(String(c), W / 2, 320, 70, "#fff"); }
    if (state === "race" && raceT < .8) txt("BAŞLA!", W / 2, H / 2, 90 - raceT * 30, "#3FD06A");
    if (banner) { ctx.globalAlpha = Math.min(1, banner.t * 2); txt(banner.text, W / 2, 120, 40, "#FFD23F"); ctx.globalAlpha = 1; }
    if (paused) { ctx.fillStyle = "rgba(0,0,0,.45)"; ctx.fillRect(0, 0, W, H); txt("Mola!", W / 2, H / 2, 60, "#fff"); }
  }
  function txt(s, x, y, size, col) { ctx.font = "700 " + size + "px Fredoka, sans-serif"; ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.lineWidth = Math.max(3, size * .16); ctx.strokeStyle = "rgba(30,15,5,.85)"; ctx.strokeText(s, x, y); ctx.fillStyle = col; ctx.fillText(s, x, y); }
  function hud() {
    ctx.fillStyle = "rgba(30,15,5,.75)"; ctx.fillRect(0, 0, W, TOP);
    const hs = karts.filter((k) => k.human);
    hs.forEach((k, i) => { const x = 12 + i * 232; ctx.fillStyle = COLS[k.ci]; ctx.beginPath(); ctx.roundRect ? ctx.roundRect(x, 5, 222, 30, 15) : ctx.rect(x, 5, 222, 30); ctx.fill(); ctx.font = "700 15px Fredoka"; ctx.textAlign = "left"; ctx.textBaseline = "middle"; ctx.fillStyle = "#fff"; ctx.fillText(k.name.slice(0, 8) + "  " + (k.place || "-") + ". · Tur " + clamp(k.lap + 1, 1, LAPS) + "/" + LAPS, x + 10, 21);
      ctx.fillStyle = "rgba(255,255,255,.9)"; ctx.beginPath(); ctx.arc(x + 204, 20, 12, 0, 7); ctx.fill(); itemIcon(k.item, x + 204, 20); });
  }
  function itemIcon(it, x, y) { if (!it) return; ctx.save(); ctx.translate(x, y); if (it === "turbo") { ctx.fillStyle = "#FF8A3D"; ctx.beginPath(); ctx.moveTo(-6, 6); ctx.lineTo(0, -8); ctx.lineTo(6, 6); ctx.lineTo(0, 2); ctx.closePath(); ctx.fill(); } else if (it === "yag") { ctx.fillStyle = "#2A1A3A"; ctx.beginPath(); ctx.ellipse(0, 2, 8, 5, 0, 0, 7); ctx.fill(); ctx.beginPath(); ctx.arc(0, -4, 4, 0, 7); ctx.fill(); } else if (it === "kalkan") { ctx.strokeStyle = "#2E86DE"; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(0, 0, 7, 0, 7); ctx.stroke(); } else { ctx.rotate(-.7); ctx.fillStyle = "#E8463F"; ctx.fillRect(-7, -2.5, 11, 5); ctx.fillStyle = OL; ctx.beginPath(); ctx.moveTo(4, -2.5); ctx.lineTo(8, 0); ctx.lineTo(4, 2.5); ctx.fill(); } ctx.restore(); }
  function drawPodium() {
    podT += 1 / 60; const g = ctx.createLinearGradient(0, 0, 0, H); g.addColorStop(0, "#C8743A"); g.addColorStop(1, "#4A2A1A"); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    const hs = [190, 140, 100], xs = [480, 290, 670], cols = ["#FFD23F", "#D8DEE8", "#E8A060"];
    podium.slice(0, 3).forEach((p, k) => { const h = hs[k] * Math.min(1, podT * 1.4), x = xs[k]; ctx.fillStyle = cols[k]; ctx.fillRect(x - 80, 560 - h, 160, h + 40); ctx.strokeStyle = OL; ctx.lineWidth = 4; ctx.strokeRect(x - 80, 560 - h, 160, h + 40); txt(String(k + 1), x, 560 - h + 40, 50, "#fff"); ctx.save(); ctx.translate(x, 560 - h - 30 - (k === 0 ? Math.abs(Math.sin(podT * 5)) * 20 : 0)); ctx.scale(2.2, 2.2); drawKart({ x: 0, y: 0, ang: -Math.PI / 2 + Math.sin(podT * 3) * .2, ci: p.ci, steer: 0, shield: 0, human: false, name: "" }); ctx.restore(); txt(p.name + "  ★" + p.score, x, 560 - h - 90, 22, "#fff"); });
    txt("KUPA ŞAMPİYONU!", W / 2, 70, 52, "#FFD23F");
    if (Math.random() < .3) burst(rnd(100, 860), rnd(80, 200), COLS, 6);
    for (const p of parts) { ctx.fillStyle = p.c; ctx.beginPath(); ctx.arc(p.x, p.y, p.s, 0, 7); ctx.fill(); }
  }

  /* ---------- kurulum ---------- */
  function carIcon(ci) { const c = document.createElement("canvas"); c.width = 104; c.height = 72; const x = c.getContext("2d"); const old = ctx; ctx = x; x.scale(2, 2); drawKart({ x: 26, y: 20, ang: 0, ci, steer: 0, shield: 0, human: false, name: "" }); ctx = old; return c; }
  function renderSetup() {
    const box = $("rows"); box.innerHTML = "";
    setup.forEach((p, i) => {
      const r = document.createElement("div"); r.className = "prow"; r.style.setProperty("--pc", COLS[i]); r.appendChild(carIcon(i));
      const inp = document.createElement("input"); inp.value = p.name; inp.maxLength = 10; inp.setAttribute("aria-label", (i + 1) + ". sürücü adı"); inp.oninput = () => { p.name = inp.value; }; r.appendChild(inp);
      const k = document.createElement("span"); k.className = "tg"; k.style.cursor = "default"; k.textContent = KEYN[i]; r.appendChild(k);
      const e = document.createElement("button"); e.type = "button"; e.className = "tg"; e.setAttribute("aria-pressed", p.easy ? "true" : "false"); e.textContent = p.easy ? "⭐ Kolay" : "Normal"; e.title = "Direksiyon yardımı"; e.onclick = () => { p.easy = !p.easy; renderSetup(); }; r.appendChild(e);
      if (setup.length > 1) { const d = document.createElement("button"); d.type = "button"; d.className = "del"; d.textContent = "✕"; d.setAttribute("aria-label", "Sürücüyü çıkar"); d.onclick = () => { setup.splice(i, 1); renderSetup(); }; r.appendChild(d); }
      box.appendChild(r);
    });
    $("addP").hidden = setup.length >= 4;
  }
  $("addP").onclick = () => { setup.push({ name: "Oyuncu " + (setup.length + 1), easy: false }); renderSetup(); };
  function newCup() {
    const mode = $("mode").value;
    try { localStorage.setItem(SAVE, JSON.stringify({ list: setup })); } catch (e) {}
    const players = setup.map((p, i) => ({ name: (p.name || "").trim() || "Oyuncu " + (i + 1), ci: i, human: true, easy: !!p.easy, keyI: i, score: 0 }));
    const cpuN = ["Robo", "Bip", "Vınn", "Zıp", "Tıkır"]; const hn = players.length; for (let i = hn; i < 6; i++) players.push({ name: cpuN[i - hn], ci: i, human: false, easy: false, keyI: -1, score: 0 });
    cup = { mode, race: 0, players };
    $("setup").hidden = true; startRace(mode === "cup" ? 0 : +mode);
  }
  $("start").onclick = () => { audio(); newCup(); };
  function showSetup() { state = "setup"; TR = null; podium = null; $("card").hidden = true; $("setup").hidden = false; $("tpads").innerHTML = ""; renderSetup(); drawLogo(); engine(false, 0); }
  function drawLogo() { const c = $("logoCv"), x = c.getContext("2d"); x.clearRect(0, 0, 420, 150); const old = ctx; ctx = x; x.save(); x.scale(2.4, 2.4); [0, 1, 2].forEach((ci) => drawKart({ x: 30 + ci * 52, y: 32 + (ci % 2) * 10, ang: -.15, ci, steer: 0, shield: 0, human: false, name: "" })); x.restore(); ctx = old; }
  $("menuBtn").onclick = () => { if ((state === "race" || state === "count") && !confirm("Yarış bitsin mi?")) return; showSetup(); };
  $("pauseBtn").onclick = () => { if (state === "race") paused = !paused; };
  document.addEventListener("visibilitychange", () => { if (document.hidden && state === "race") paused = true; });
  const muteBtn = $("mute");
  function setMute(m) { muted = m; muteBtn.setAttribute("aria-pressed", m ? "true" : "false"); muteBtn.setAttribute("aria-label", m ? "Sesi aç" : "Sesi kapat"); if (master) master.gain.value = m ? 0 : 1; try { localStorage.setItem(SAVE + ":mute", m ? "1" : "0"); } catch (e) {} }
  setMute(muted); muteBtn.onclick = () => { audio(); setMute(!muted); };

  /* ---------- ölçek ve döngü ---------- */
  const stage = $("stage"), screen = $("screen");
  function fit() { const cs = getComputedStyle(screen), w = screen.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight), h = screen.clientHeight; if (!w || !h) return; let sw = w, sh = w * H / W; if (sh > h) { sh = h; sw = h * W / H; } stage.style.width = Math.floor(sw) + "px"; stage.style.height = Math.floor(sh) + "px"; stage.style.setProperty("--fs", clamp(sw / 50, 12, 19).toFixed(1) + "px"); }
  addEventListener("resize", fit); if (window.ResizeObserver) new ResizeObserver(fit).observe(screen); fit();
  let last = performance.now();
  function frame(t) { const dt = Math.min(.05, (t - last) / 1000); last = t; if (!fast) update(dt); draw(); requestAnimationFrame(frame); }
  requestAnimationFrame(frame);
  showSetup();

  window.__or = { TRACKS, buildTrack, get karts() { return karts; }, get state() { return state; }, get TR() { return TR; }, update, setFast(v) { fast = v; }, newCup, setup, keys, itemP, get cup() { return cup; }, startRace };
})();
