/* Ejderha Yuvası — Egemen için sesli yavru ejderha bakma oyunu */
(function () {
  "use strict";
  const W = 960, H = 600, TAU = Math.PI * 2, OL = "#2A1E3A";
  const $ = (id) => document.getElementById(id);
  const cv = $("cv"); let ctx = cv.getContext("2d");
  const SAVE = "ejderha-yuvasi";
  const rnd = (a, b) => a + Math.random() * (b - a);
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const pick = (a) => a[Math.floor(Math.random() * a.length)];
  const ease = (t) => 1 - Math.pow(1 - clamp(t, 0, 1), 3);

  /* ---------- ejderhalar ---------- */
  const TYPES = [
    { id: "ates", name: "Kıvılcım", kind: "ateş ejderi", body: "#F0553F", belly: "#FFD08A", wing: "#FF9A3D", acc: "#FFD23F", breath: ["#FFD23F", "#FF8A2E", "#FF4A2A"], fruit: 6, tail: "flame" },
    { id: "su", name: "Damla", kind: "su ejderi", body: "#3A9BEA", belly: "#BFE8FF", wing: "#7FD0FF", acc: "#E8F8FF", breath: ["#BFE8FF", "#7FD0FF", "#fff"], fruit: 5, tail: "fin" },
    { id: "yaprak", name: "Filiz", kind: "yaprak ejderi", body: "#4FBF5A", belly: "#E2F5B0", wing: "#8BD96A", acc: "#FF7AA2", breath: ["#8BD96A", "#C8F08A", "#FF9EC7"], fruit: 0, tail: "leaf" },
    { id: "buz", name: "Kristal", kind: "buz ejderi", body: "#8FD8E8", belly: "#F0FBFF", wing: "#C8F0FA", acc: "#5AA8E0", breath: ["#fff", "#C8F0FA", "#8FD8E8"], fruit: 4, tail: "crystal" },
    { id: "gokkusagi", name: "Gökçe", kind: "gökkuşağı ejderi", body: "#F28AC0", belly: "#FFF0A8", wing: "rainbow", acc: "#FFD23F", breath: ["#FF5A5A", "#FFD23F", "#5AD07A", "#4DA3FF", "#B98CFF"], fruit: 2, tail: "heart" },
    { id: "yildiz", name: "Pırıltı", kind: "yıldız ejderi", body: "#8A5AD8", belly: "#E2D0FF", wing: "#B98CFF", acc: "#FFD23F", breath: ["#FFD23F", "#fff", "#E2D0FF"], fruit: 3, tail: "star" },
    { id: "gunes", name: "Parlak", kind: "güneş ejderi", body: "#F7B92A", belly: "#FFF2C0", wing: "#FF8A3D", acc: "#E8463F", breath: ["#FFF2C0", "#FFD23F", "#FF8A3D"], fruit: 1, tail: "sun" },
    { id: "gece", name: "Gölge", kind: "gece ejderi", body: "#3A4A8A", belly: "#9FB0E8", wing: "#5A6AB8", acc: "#FFE08A", breath: ["#FFE08A", "#9FB0E8", "#fff"], fruit: 7, tail: "moon" }
  ];
  const FRUITS = ["elma", "muz", "çilek", "üzüm", "armut", "karpuz", "portakal", "kiraz"];
  const STG = [0, 8, 20, 36], STAGE_N = ["yavru", "minik", "genç", "kocaman"], STAGE_S = [.62, .76, .9, 1.04];
  const HATS = [{ id: "papyon", n: "papyon", at: 6 }, { id: "parti", n: "parti şapkası", at: 18 }, { id: "gozluk", n: "güneş gözlüğü", at: 32 }, { id: "cicek", n: "çiçek", at: 50 }, { id: "tac", n: "taç", at: 75 }, { id: "sihir", n: "büyücü şapkası", at: 105 }, { id: "kask", n: "pilot gözlüğü", at: 140 }];
  const NEEDS = ["food", "clean", "fun", "sleep"];
  const NEED_RATE = { food: .42, clean: .3, fun: .38, sleep: .24 };

  /* ---------- kayıt ---------- */
  let S = null;
  function fresh() { return { cur: null, eggs: null, grown: [], total: 0, hat: null, tut: 0, t: Date.now() }; }
  function load() { try { const s = JSON.parse(localStorage.getItem(SAVE) || "null"); if (s && s.grown) return s; } catch (e) {} return null; }
  function save() { if (!S) return; S.t = Date.now(); try { localStorage.setItem(SAVE, JSON.stringify(S)); } catch (e) {} }
  addEventListener("pagehide", save);

  /* ---------- ses ---------- */
  let ac = null, master = null, mus = null, muted = false;
  try { muted = localStorage.getItem(SAVE + ":mute") === "1"; } catch (e) {}
  function audio() { if (!ac) { const C = window.AudioContext || window.webkitAudioContext; if (!C) return; ac = new C(); master = ac.createGain(); master.gain.value = muted ? 0 : 1; master.connect(ac.destination); mus = ac.createGain(); mus.gain.value = .5; mus.connect(master); } if (ac.state === "suspended") ac.resume(); }
  let sN = 0; setInterval(() => sN = 0, 80);
  function tone(f, d, type, vol, when, slide, dest) { if (!ac || muted || fast || sN++ > 12) return; const t = when || ac.currentTime, o = ac.createOscillator(), g = ac.createGain(); o.type = type || "triangle"; o.frequency.setValueAtTime(f, t); if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(30, slide), t + d); g.gain.setValueAtTime(.0001, t); g.gain.linearRampToValueAtTime(vol || .1, t + .012); g.gain.exponentialRampToValueAtTime(.0008, t + d); o.connect(g); g.connect(dest || master); o.start(t); o.stop(t + d + .02); }
  let nb = null;
  function noise(d, vol, freq, q) { if (!ac || muted || fast) return; if (!nb) { nb = ac.createBuffer(1, ac.sampleRate, ac.sampleRate); const c = nb.getChannelData(0); for (let i = 0; i < c.length; i++) c[i] = Math.random() * 2 - 1; } const s = ac.createBufferSource(), f = ac.createBiquadFilter(), g = ac.createGain(), t = ac.currentTime; s.buffer = nb; f.type = "bandpass"; f.frequency.value = freq || 1500; f.Q.value = q || 1; g.gain.setValueAtTime(vol || .1, t); g.gain.exponentialRampToValueAtTime(.001, t + d); s.connect(f); f.connect(g); g.connect(master); s.start(t); s.stop(t + d); }
  const now = () => ac ? ac.currentTime : 0;
  const sfx = {
    tap() { tone(660, .08, "sine", .08); }, pop() { tone(900, .12, "square", .05, 0, 300); noise(.1, .08, 3000); },
    chomp() { noise(.08, .12, 700, 2); tone(220, .1, "square", .05, now() + .05); }, yum() { const t = now(); tone(523, .1, "sine", .1, t); tone(784, .16, "sine", .1, t + .1); },
    scrub() { noise(.07, .04, 2500, 3); }, bubble() { tone(rnd(700, 1200), .1, "sine", .06, 0, 1600); }, water() { noise(.6, .06, 4000, .5); },
    crack() { noise(.12, .14, 1800, 4); tone(300, .08, "square", .04); }, hatch() { const t = now(); [523, 659, 784, 1047, 1319].forEach((f, i) => tone(f, .25, "triangle", .1, t + i * .08)); noise(.3, .1, 2000); },
    heart() { tone(988, .1, "sine", .07); tone(1319, .14, "sine", .06, now() + .07); }, grow() { const t = now(); for (let i = 0; i < 8; i++) tone(392 * Math.pow(2, i / 7), .2, "triangle", .08, t + i * .07); },
    giggle() { const t = now(); [880, 1100, 940, 1180].forEach((f, i) => tone(f, .08, "sine", .07, t + i * .07)); }, breath() { noise(.35, .1, 1200, .8); },
    wrong() { tone(300, .2, "triangle", .07, 0, 220); }, twinkle() { tone(rnd(1200, 2000), .3, "sine", .05); }, click() { tone(1500, .05, "square", .03); },
    fanfare() { const t = now(); [[523, 0], [659, .12], [784, .24], [1047, .4], [784, .58], [1047, .7]].forEach(([f, d]) => { tone(f, .28, "triangle", .11, t + d); tone(f / 2, .28, "sine", .05, t + d); }); },
    yawn() { tone(500, .9, "sine", .07, 0, 200); }, whoosh() { noise(.6, .1, 600, .6); }
  };
  const mf = (m) => 440 * Math.pow(2, (m - 69) / 12);
  const SONG = { bpm: 104, lead: [72, 0, 76, 79, 0, 76, 72, 0, 74, 0, 77, 81, 0, 77, 74, 0, 76, 0, 79, 84, 0, 79, 76, 0, 74, 77, 76, 74, 72, 0, 0, 0], bass: [48, 0, 55, 0, 48, 0, 55, 0, 50, 0, 57, 0, 50, 0, 57, 0, 52, 0, 59, 0, 52, 0, 59, 0, 53, 0, 55, 0, 48, 0, 55, 0] };
  const LULL = [76, 0, 79, 0, 84, 0, 79, 0, 81, 0, 79, 0, 76, 0, 0, 0, 74, 0, 77, 0, 81, 0, 77, 0, 79, 0, 76, 0, 72, 0, 0, 0];
  let mStep = 0, mNext = 0;
  setInterval(() => {
    if (!ac || muted || scene === "title") { if (ac) mNext = Math.max(mNext, ac.currentTime); return; }
    const lull = scene === "sleep" && sl.phase === 1, d = 60 / (lull ? 76 : SONG.bpm) / 2; if (mNext < ac.currentTime) mNext = ac.currentTime + .05;
    while (mNext < ac.currentTime + .3) { const i = mStep % 32; if (lull) { if (LULL[i]) { tone(mf(LULL[i]), d * 2.4, "sine", .05, mNext, 0, mus); tone(mf(LULL[i] + 12), d * 1.2, "sine", .015, mNext, 0, mus); } } else { if (SONG.lead[i]) { tone(mf(SONG.lead[i]), d * 1.6, "sine", .035, mNext, 0, mus); tone(mf(SONG.lead[i] + 12), d * .4, "triangle", .008, mNext, 0, mus); } if (SONG.bass[i]) tone(mf(SONG.bass[i]), d * 1.4, "triangle", .05, mNext, 0, mus); } mStep++; mNext += d; }
  }, 90);
  // konuşma
  const canSpeak = "speechSynthesis" in window; let trVoice = null, lastSay = "";
  function pickVoice() { trVoice = speechSynthesis.getVoices().find((v) => /^tr(-|_|$)/i.test(v.lang)) || null; }
  if (canSpeak) { pickVoice(); if (speechSynthesis.addEventListener) speechSynthesis.addEventListener("voiceschanged", pickVoice); }
  function say(text, keep) {
    lastSay = text; $("tip").textContent = text; clearTimeout(say.t); if (!keep) say.t = setTimeout(() => { if ($("tip").textContent === text) $("tip").textContent = ""; }, 5500);
    if (!canSpeak || muted || !trVoice || fast) return; speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text); u.voice = trVoice; u.lang = trVoice.lang; u.rate = .92; u.pitch = 1.2; speechSynthesis.speak(u);
  }
  document.addEventListener("visibilitychange", () => { if (document.hidden) { if (canSpeak) speechSynthesis.cancel(); save(); } });

  /* ---------- çizim yardımcıları ---------- */
  function circle(c, x, y, r, fill, lw) { c.beginPath(); c.arc(x, y, Math.max(.1, r), 0, TAU); if (fill) { c.fillStyle = fill; c.fill(); } if (lw) { c.strokeStyle = OL; c.lineWidth = lw; c.stroke(); } }
  function ell(c, x, y, rx, ry, rot, fill, lw) { c.beginPath(); c.ellipse(x, y, Math.max(.1, rx), Math.max(.1, ry), rot || 0, 0, TAU); if (fill) { c.fillStyle = fill; c.fill(); } if (lw) { c.strokeStyle = OL; c.lineWidth = lw; c.stroke(); } }
  function rr(c, x, y, w, h, r) { c.beginPath(); c.moveTo(x + r, y); c.arcTo(x + w, y, x + w, y + h, r); c.arcTo(x + w, y + h, x, y + h, r); c.arcTo(x, y + h, x, y, r); c.arcTo(x, y, x + w, y, r); c.closePath(); }
  function star(c, x, y, r, fill, lw, n) { n = n || 5; c.beginPath(); for (let i = 0; i < n * 2; i++) { const a = -Math.PI / 2 + i * Math.PI / n, rr2 = i % 2 ? r * .45 : r; c.lineTo(x + Math.cos(a) * rr2, y + Math.sin(a) * rr2); } c.closePath(); c.fillStyle = fill; c.fill(); if (lw) { c.strokeStyle = OL; c.lineWidth = lw; c.stroke(); } }
  function heart(c, x, y, r, fill, lw) { c.beginPath(); c.moveTo(x, y + r * .9); c.bezierCurveTo(x - r * 1.5, y - r * .1, x - r * .7, y - r * 1.2, x, y - r * .45); c.bezierCurveTo(x + r * .7, y - r * 1.2, x + r * 1.5, y - r * .1, x, y + r * .9); c.fillStyle = fill; c.fill(); if (lw) { c.strokeStyle = OL; c.lineWidth = lw; c.stroke(); } }
  function txt(s, x, y, size, col, al, stroke) { const c = ctx; c.font = "700 " + size + "px Fredoka, sans-serif"; c.textAlign = al || "center"; c.textBaseline = "middle"; if (stroke !== false) { c.lineWidth = Math.max(3, size * .18); c.strokeStyle = "rgba(40,20,60,.85)"; c.lineJoin = "round"; c.strokeText(s, x, y); } c.fillStyle = col; c.fillText(s, x, y); }
  const RAINBOW = ["#FF5A5A", "#FFA53A", "#FFD23F", "#5AD07A", "#4DA3FF", "#B98CFF"];

  function fruit(c, i, x, y, r) {
    c.save(); c.translate(x, y); const s = r / 20; c.scale(s, s); c.lineWidth = 2.2; c.strokeStyle = OL;
    if (i === 0) { circle(c, 0, 2, 18, "#E8463F", 2.2); c.fillStyle = "#7A4A1E"; c.fillRect(-1.5, -22, 3, 9); ell(c, 7, -17, 7, 3.5, -.5, "#4FBF5A", 1.5); ell(c, -6, -4, 4, 6, .4, "rgba(255,255,255,.45)"); }
    else if (i === 1) { c.beginPath(); c.moveTo(-18, -10); c.quadraticCurveTo(-8, 22, 20, 6); c.quadraticCurveTo(-2, 10, -12, -14); c.closePath(); c.fillStyle = "#FFD23F"; c.fill(); c.stroke(); c.fillStyle = "#7A5A1E"; c.fillRect(-17, -16, 5, 5); }
    else if (i === 2) { c.beginPath(); c.moveTo(0, 20); c.quadraticCurveTo(-20, 2, -14, -10); c.quadraticCurveTo(0, -18, 14, -10); c.quadraticCurveTo(20, 2, 0, 20); c.fillStyle = "#F0384A"; c.fill(); c.stroke(); c.fillStyle = "#FFE08A"; for (const [a, b] of [[-7, -2], [5, -4], [-2, 6], [7, 6], [0, -8]]) { c.beginPath(); c.arc(a, b, 1.5, 0, TAU); c.fill(); } star(c, 0, -13, 9, "#4FBF5A", 1.5, 5); }
    else if (i === 3) { for (const [a, b] of [[-8, -8], [8, -8], [0, -8], [-4, 2], [6, 2], [0, 12], [-10, 2], [10, -2]]) circle(c, a, b, 7, "#9B59D0", 1.6); c.fillStyle = "#4FBF5A"; c.fillRect(-1.5, -22, 3, 8); }
    else if (i === 4) { c.beginPath(); c.moveTo(0, -16); c.quadraticCurveTo(10, -14, 9, -2); c.quadraticCurveTo(20, 10, 10, 18); c.quadraticCurveTo(0, 24, -10, 18); c.quadraticCurveTo(-20, 10, -9, -2); c.quadraticCurveTo(-10, -14, 0, -16); c.fillStyle = "#A8D84A"; c.fill(); c.stroke(); c.fillStyle = "#7A4A1E"; c.fillRect(-1.5, -24, 3, 9); }
    else if (i === 5) { c.beginPath(); c.arc(0, -4, 21, 0, Math.PI); c.closePath(); c.fillStyle = "#3FA34D"; c.fill(); c.stroke(); c.beginPath(); c.arc(0, -4, 16, 0, Math.PI); c.closePath(); c.fillStyle = "#FF5A6A"; c.fill(); c.fillStyle = OL; for (const a of [-9, -3, 3, 9]) { c.beginPath(); c.ellipse(a, 3 + Math.abs(a) * .1, 1.4, 2.4, 0, 0, TAU); c.fill(); } }
    else if (i === 6) { circle(c, 0, 0, 19, "#FF9A2E", 2.2); c.fillStyle = "rgba(200,90,0,.4)"; for (const [a, b] of [[-6, 4], [5, -6], [7, 7], [-4, -8]]) { c.beginPath(); c.arc(a, b, 1.3, 0, TAU); c.fill(); } ell(c, 4, -19, 6, 3, .4, "#4FBF5A", 1.4); }
    else { c.beginPath(); c.moveTo(-8, 4); c.quadraticCurveTo(-2, -20, 6, -20); c.moveTo(9, 6); c.quadraticCurveTo(6, -12, 6, -20); c.strokeStyle = "#3F8A2E"; c.lineWidth = 2.5; c.stroke(); circle(c, -9, 9, 10, "#D8203A", 2.2); circle(c, 10, 10, 10, "#D8203A", 2.2); ell(c, -12, 6, 2.5, 3.5, 0, "rgba(255,255,255,.5)"); }
    c.restore();
  }
  function needIcon(c, n, x, y, r) {
    if (n === "food") fruit(c, 0, x, y, r);
    else if (n === "clean") { c.save(); c.translate(x, y); const s = r / 20; c.scale(s, s); circle(c, -5, 3, 13, "rgba(160,220,255,.9)", 2); circle(c, 9, -6, 8, "rgba(200,240,255,.9)", 2); ell(c, -9, -2, 3, 5, .5, "rgba(255,255,255,.8)"); c.restore(); }
    else if (n === "fun") { c.save(); c.translate(x, y); const s = r / 20; c.scale(s, s); for (let k = 0; k < 4; k++) { c.fillStyle = ["#E8463F", "#FFD23F", "#4DA3FF", "#3FA34D"][k]; c.beginPath(); c.moveTo(0, 0); c.arc(0, 0, 17, k * Math.PI / 2, (k + 1) * Math.PI / 2); c.fill(); } circle(c, 0, 0, 17, null, 2.2); c.restore(); }
    else { c.save(); c.translate(x, y); const s = r / 20; c.scale(s, s); c.beginPath(); c.arc(0, 0, 17, .9, TAU - .9, false); c.arc(8, -6, 13, TAU - 1.3, 1.9, true); c.closePath(); c.fillStyle = "#FFE08A"; c.fill(); c.strokeStyle = OL; c.lineWidth = 2.2; c.stroke(); c.restore(); }
  }

  /* ---------- ejderha çizimi ---------- */
  function drawDragon(c, o) {
    const T = TYPES[o.type], st = o.stage, s = (o.s || 1) * STAGE_S[st], t = o.t || 0;
    const headR = 52 * (1 + (3 - st) * .07), bodyRx = 50 + st * 5, bodyRy = 56 + st * 6;
    const bob = o.sleep ? Math.sin(t * 1.6) * 2 : Math.sin(t * 3) * 3 + (o.jump || 0);
    c.save(); c.translate(o.x, o.y); c.scale(s * (o.flip ? -1 : 1), s * (o.squash ? 1 - o.squash : 1));
    // gölge
    if (!o.noShadow) { c.save(); c.scale(1, 1); ell(c, 0, 88, 78, 15, 0, "rgba(0,0,0,.22)"); c.restore(); }
    c.translate(0, bob);
    c.lineWidth = 3.5; c.strokeStyle = OL; c.lineJoin = "round"; c.lineCap = "round";
    // kuyruk
    const tw = Math.sin(t * 2.4) * .25;
    c.save(); c.translate(38, 58); c.rotate(tw);
    c.beginPath(); c.moveTo(-10, -16); c.quadraticCurveTo(50, -10, 70, -40); c.quadraticCurveTo(52, 8, -4, 14); c.closePath(); c.fillStyle = T.body; c.fill(); c.stroke();
    tailTip(c, T, 70, -40); c.restore();
    // kanatlar
    const fl = o.sleep ? .1 : Math.sin(t * (o.fly ? 14 : 3.2)) * (o.fly ? .55 : .14) + (o.happy ? .25 * Math.sin(t * 16) : 0);
    for (const sd of [-1, 1]) { c.save(); c.translate(sd * 34, -2); c.scale(sd, 1); c.rotate(-.25 - fl); wing(c, T, st); c.restore(); }
    // ayaklar
    for (const sd of [-1, 1]) { ell(c, sd * 30, 78, 22, 14, 0, T.body, 3.5); for (let k = -1; k <= 1; k++) circle(c, sd * 30 + k * 9, 86, 3.2, T.belly); }
    // gövde
    ell(c, 0, 30, bodyRx, bodyRy, 0, T.body, 3.5);
    ell(c, 0, 38, bodyRx * .62, bodyRy * .74, 0, T.belly);
    c.strokeStyle = "rgba(0,0,0,.1)"; c.lineWidth = 2.5; for (let k = -2; k <= 2; k++) { c.beginPath(); c.moveTo(-bodyRx * .5 * Math.cos(k * .3), 38 + k * 13); c.lineTo(bodyRx * .5 * Math.cos(k * .3), 38 + k * 13); c.stroke(); }
    c.strokeStyle = OL; c.lineWidth = 3.5;
    // kollar
    const wave = o.wave ? Math.sin(t * 12) * .6 : 0;
    for (const sd of [-1, 1]) { c.save(); c.translate(sd * (bodyRx - 10), 18); c.rotate(sd * (.5 + (sd > 0 ? wave : 0))); ell(c, 0, 12, 10, 18, 0, T.body, 3.5); c.restore(); }
    // tip süsleri
    if (T.id === "yildiz") { star(c, -24, 6, 6, "#FFD23F"); star(c, 28, 40, 5, "#FFD23F"); star(c, -30, 52, 4, "#fff"); }
    if (T.id === "gece") { circle(c, -26, 10, 3, "#FFE08A"); circle(c, 30, 30, 2.5, "#FFE08A"); circle(c, -22, 56, 2, "#fff"); }
    if (T.id === "su") for (const [a, b] of [[-30, 10], [32, 22], [-34, 44]]) ell(c, a, b, 6, 4, 0, "rgba(255,255,255,.4)");
    if (T.id === "ates" || T.id === "gunes") for (const [a, b] of [[-32, 12], [34, 26], [-30, 50]]) circle(c, a, b, 5, "rgba(255,255,255,.22)");
    // baş
    const hy = -52 + (o.nod || 0);
    c.save(); c.translate(0, hy); c.rotate(o.tilt || 0);
    // boynuzlar / tepelik
    const hl = 14 + st * 4;
    for (const sd of [-1, 1]) { c.beginPath(); c.moveTo(sd * 20, -headR * .78); c.quadraticCurveTo(sd * 30, -headR - hl * .7, sd * (30 + st * 2), -headR - hl); c.quadraticCurveTo(sd * 36, -headR * .7, sd * 34, -headR * .6); c.closePath(); c.fillStyle = T.acc; c.fill(); c.stroke(); }
    if (T.id === "yaprak") { c.save(); c.translate(0, -headR + 2); c.rotate(-.2); ell(c, 0, -10, 8, 15, 0, "#8BD96A", 3); c.restore(); }
    if (T.id === "su" || T.id === "buz") { for (let k = -1; k <= 1; k++) { c.beginPath(); c.moveTo(k * 12 - 7, -headR + 4); c.lineTo(k * 12, -headR - 12 + Math.abs(k) * 4); c.lineTo(k * 12 + 7, -headR + 4); c.closePath(); c.fillStyle = T.wing; c.fill(); c.stroke(); } }
    // kulaklar
    for (const sd of [-1, 1]) { c.beginPath(); c.moveTo(sd * headR * .78, -14); c.quadraticCurveTo(sd * (headR + 26), -30, sd * (headR + 18), -2); c.quadraticCurveTo(sd * headR, 4, sd * headR * .86, 6); c.closePath(); c.fillStyle = T.wing === "rainbow" ? "#B98CFF" : T.wing; c.fill(); c.stroke(); }
    circle(c, 0, 0, headR, T.body, 3.5);
    ell(c, -headR * .35, -headR * .45, headR * .3, headR * .18, -.5, "rgba(255,255,255,.22)");
    // burun
    ell(c, 0, headR * .45, headR * .55, headR * .36, 0, T.belly, 3);
    ell(c, -9, headR * .38, 3, 4, 0, "rgba(0,0,0,.35)"); ell(c, 9, headR * .38, 3, 4, 0, "rgba(0,0,0,.35)");
    // yanaklar
    ell(c, -headR * .62, headR * .3, 10, 7, 0, "rgba(255,110,140,.45)"); ell(c, headR * .62, headR * .3, 10, 7, 0, "rgba(255,110,140,.45)");
    // gözler
    const ex = headR * .4, ey = -headR * .12, er = headR * .27 * (1 + (3 - st) * .06);
    if (o.sleep || (o.blink > 0)) { c.lineWidth = 4; for (const sd of [-1, 1]) { c.beginPath(); c.arc(sd * ex, ey, er * .7, .2, Math.PI - .2); c.stroke(); } }
    else if (o.happy) { c.lineWidth = 4.5; for (const sd of [-1, 1]) { c.beginPath(); c.arc(sd * ex, ey + 4, er * .7, Math.PI + .3, TAU - .3); c.stroke(); } }
    else { const lx = (o.lookX || 0) * er * .3, ly = (o.lookY || 0) * er * .3; for (const sd of [-1, 1]) { ell(c, sd * ex, ey, er, er * 1.12, 0, "#fff", 3); circle(c, sd * ex + lx, ey + ly + 2, er * .66, o.sad ? "#4A3A5A" : "#2A1E3A"); circle(c, sd * ex + lx - er * .22, ey + ly - er * .2, er * .24, "#fff"); circle(c, sd * ex + lx + er * .2, ey + ly + er * .3, er * .1, "#fff"); }
      if (o.sad) { c.lineWidth = 3; for (const sd of [-1, 1]) { c.beginPath(); c.moveTo(sd * (ex - er), ey - er * 1.3); c.lineTo(sd * (ex + er * .7), ey - er * 1.6); c.stroke(); } } }
    // ağız
    c.lineWidth = 3.5; c.strokeStyle = OL;
    const my = headR * .66;
    if (o.mouth > .1) { ell(c, 0, my, 13 + o.mouth * 4, 6 + o.mouth * 12, 0, "#8A2A3A", 3); ell(c, 0, my + o.mouth * 7, 8, 5, 0, "#FF7A9A"); c.fillStyle = "#fff"; c.beginPath(); c.moveTo(-8, my - 5 - o.mouth * 8); c.lineTo(-5, my + 1 - o.mouth * 6); c.lineTo(-2, my - 5 - o.mouth * 8); c.fill(); c.beginPath(); c.moveTo(8, my - 5 - o.mouth * 8); c.lineTo(5, my + 1 - o.mouth * 6); c.lineTo(2, my - 5 - o.mouth * 8); c.fill(); }
    else if (o.sad) { c.beginPath(); c.arc(0, my + 10, 10, Math.PI + .5, TAU - .5); c.stroke(); }
    else { c.beginPath(); c.arc(0, my - 6, 12, .35, Math.PI - .35); c.stroke(); }
    // şapka
    if (o.hat) drawHat(c, o.hat, headR, T);
    c.restore();
    // çamur
    if (o.mud) for (const m of o.mud) if (m.d > 0) { c.globalAlpha = Math.min(1, m.d * 1.3); ell(c, m.x, m.y, m.r, m.r * .8, m.a, "#7A5230"); ell(c, m.x - m.r * .3, m.y - m.r * .3, m.r * .35, m.r * .25, 0, "#946A40"); circle(c, m.x + m.r * .9, m.y + m.r * .5, m.r * .3, "#7A5230"); c.globalAlpha = 1; }
    c.restore();
  }
  function tailTip(c, T, x, y) {
    c.save(); c.translate(x, y); c.lineWidth = 3;
    if (T.tail === "flame") { c.beginPath(); c.moveTo(-6, 6); c.quadraticCurveTo(-14, -14, 4, -26); c.quadraticCurveTo(0, -12, 12, -12); c.quadraticCurveTo(14, 4, -6, 6); c.fillStyle = "#FFD23F"; c.fill(); c.stroke(); }
    else if (T.tail === "fin") { c.beginPath(); c.moveTo(-4, 4); c.lineTo(-10, -22); c.lineTo(8, -10); c.lineTo(20, -18); c.lineTo(10, 6); c.closePath(); c.fillStyle = T.wing; c.fill(); c.stroke(); }
    else if (T.tail === "leaf") { c.rotate(-.7); ell(c, 0, -14, 9, 18, 0, "#8BD96A", 3); c.beginPath(); c.moveTo(0, 2); c.lineTo(0, -28); c.stroke(); }
    else if (T.tail === "crystal") { c.beginPath(); c.moveTo(0, 6); c.lineTo(-10, -10); c.lineTo(0, -28); c.lineTo(10, -10); c.closePath(); c.fillStyle = "#E8FBFF"; c.fill(); c.stroke(); }
    else if (T.tail === "heart") heart(c, 2, -10, 13, "#FF5A8A", 3);
    else if (T.tail === "star") star(c, 2, -8, 15, "#FFD23F", 3);
    else if (T.tail === "sun") { for (let k = 0; k < 8; k++) { c.save(); c.rotate(k * Math.PI / 4); c.fillStyle = "#FF8A3D"; c.beginPath(); c.moveTo(-4, -10); c.lineTo(0, -20); c.lineTo(4, -10); c.fill(); c.restore(); } circle(c, 0, 0, 11, "#FFD23F", 3); }
    else { c.beginPath(); c.arc(0, -6, 13, .9, TAU - .9); c.arc(6, -11, 10, TAU - 1.3, 1.9, true); c.closePath(); c.fillStyle = "#FFE08A"; c.fill(); c.stroke(); }
    c.restore();
  }
  function wing(c, T, st) {
    const L = 58 + st * 12;
    c.beginPath(); c.moveTo(0, 0); c.quadraticCurveTo(L * .3, -L * .9, L, -L * .78); c.quadraticCurveTo(L * .9, -L * .45, L * .98, -L * .2); c.quadraticCurveTo(L * .7, -L * .25, L * .68, 0); c.quadraticCurveTo(L * .45, -L * .1, L * .38, L * .2); c.quadraticCurveTo(L * .2, L * .05, 0, 24); c.closePath();
    if (T.wing === "rainbow") { const g = c.createLinearGradient(0, 0, L, -L); RAINBOW.forEach((col, i) => g.addColorStop(i / 5, col)); c.fillStyle = g; } else c.fillStyle = T.wing;
    c.fill(); c.stroke();
    c.strokeStyle = "rgba(0,0,0,.18)"; c.lineWidth = 2.5; c.beginPath(); c.moveTo(4, 2); c.lineTo(L * .95, -L * .74); c.moveTo(6, 6); c.lineTo(L * .92, -L * .22); c.moveTo(6, 10); c.lineTo(L * .62, -L * .02); c.stroke(); c.strokeStyle = OL; c.lineWidth = 3.5;
  }
  function drawHat(c, h, R, T) {
    c.save(); c.lineWidth = 3;
    if (h === "papyon") { c.translate(0, R * .98); c.beginPath(); c.moveTo(0, 0); c.lineTo(-20, -11); c.lineTo(-20, 11); c.closePath(); c.moveTo(0, 0); c.lineTo(20, -11); c.lineTo(20, 11); c.closePath(); c.fillStyle = "#E8463F"; c.fill(); c.stroke(); circle(c, 0, 0, 6, "#C8303A", 3); }
    else if (h === "parti") { c.translate(-8, -R * .92); c.rotate(-.25); c.beginPath(); c.moveTo(-22, 0); c.lineTo(0, -56); c.lineTo(22, 0); c.closePath(); c.fillStyle = "#4DA3FF"; c.fill(); c.stroke(); c.save(); c.clip(); c.fillStyle = "#FFD23F"; for (let k = 0; k < 4; k++) { c.beginPath(); c.arc(-6 + (k % 2) * 12, -10 - k * 11, 4, 0, TAU); c.fill(); } c.restore(); circle(c, 0, -58, 8, "#FF7AA2", 3); }
    else if (h === "gozluk") { c.translate(0, -R * .12); c.fillStyle = "#2A1E3A"; for (const sd of [-1, 1]) { rr(c, sd * R * .4 - 18, -12, 36, 24, 9); c.fill(); } c.fillRect(-8, -6, 16, 4); c.strokeStyle = "rgba(255,255,255,.5)"; c.lineWidth = 3; for (const sd of [-1, 1]) { c.beginPath(); c.moveTo(sd * R * .4 - 10, -6); c.lineTo(sd * R * .4 - 2, -6); c.stroke(); } }
    else if (h === "cicek") { c.translate(R * .55, -R * .7); for (let k = 0; k < 6; k++) circle(c, Math.cos(k * 1.047) * 11, Math.sin(k * 1.047) * 11, 9, "#FF9EC7", 2.5); circle(c, 0, 0, 8, "#FFD23F", 2.5); }
    else if (h === "tac") { c.translate(0, -R * .88); c.beginPath(); c.moveTo(-28, 6); c.lineTo(-30, -22); c.lineTo(-15, -8); c.lineTo(0, -30); c.lineTo(15, -8); c.lineTo(30, -22); c.lineTo(28, 6); c.closePath(); c.fillStyle = "#FFD23F"; c.fill(); c.stroke(); circle(c, 0, -4, 5, "#E8463F", 2); circle(c, -17, 0, 3.5, "#4DA3FF", 2); circle(c, 17, 0, 3.5, "#3FA34D", 2); }
    else if (h === "sihir") { c.translate(4, -R * .86); c.rotate(.15); ell(c, 0, 0, 40, 10, 0, "#5B3FA8", 3); c.beginPath(); c.moveTo(-24, -2); c.quadraticCurveTo(-4, -40, 10, -70); c.quadraticCurveTo(14, -30, 24, -2); c.closePath(); c.fillStyle = "#5B3FA8"; c.fill(); c.stroke(); star(c, 0, -26, 8, "#FFD23F"); star(c, 10, -48, 5, "#fff"); }
    else if (h === "kask") { c.translate(0, -R * .55); c.beginPath(); c.arc(0, 10, R * .95, Math.PI + .25, TAU - .25); c.closePath(); c.fillStyle = "#9A6234"; c.fill(); c.stroke(); for (const sd of [-1, 1]) { circle(c, sd * 18, 4, 13, "#8FD3FF", 3.5); circle(c, sd * 18 - 4, 0, 4, "rgba(255,255,255,.7)"); } }
    c.restore();
  }
  function drawEgg(c, type, x, y, s, crack, wob) {
    const T = TYPES[type]; c.save(); c.translate(x, y); c.rotate(wob || 0); c.scale(s, s);
    ell(c, 0, 66, 50, 10, 0, "rgba(0,0,0,.2)");
    const ep = () => { c.beginPath(); c.moveTo(0, -70); c.bezierCurveTo(46, -70, 58, 10, 54, 28); c.bezierCurveTo(48, 66, -48, 66, -54, 28); c.bezierCurveTo(-58, 10, -46, -70, 0, -70); c.closePath(); }; ep();
    c.fillStyle = T.belly; c.fill(); c.save(); c.clip();
    c.fillStyle = T.body; for (let k = 0; k < 3; k++) { c.beginPath(); for (let i = 0; i <= 12; i++) c.lineTo(-60 + i * 10, -20 + k * 34 + (i % 2 ? -9 : 9)); c.lineTo(60, -6 + k * 34); c.lineTo(-60, -6 + k * 34); c.closePath(); c.fill(); }
    if (T.wing === "rainbow") RAINBOW.forEach((col, i) => { c.fillStyle = col; c.fillRect(-60, -70 + i * 22, 120, 11); });
    for (const [a, b, r] of [[-22, -44, 8], [20, -30, 6], [26, 44, 7], [-30, 40, 5]]) circle(c, a, b, r, T.acc);
    ell(c, -20, -38, 10, 18, .3, "rgba(255,255,255,.4)");
    c.restore(); ep(); c.lineWidth = 4; c.strokeStyle = OL; c.stroke();
    if (crack > 0) { c.lineWidth = 3.5; c.beginPath(); const n = Math.min(4, Math.ceil(crack * 4)); const seg = [[-40, -6], [-26, 6], [-14, -8], [-2, 8], [10, -6], [24, 8], [40, -4]]; c.moveTo(seg[0][0], seg[0][1]); for (let i = 1; i < 1 + n * 1.5 && i < seg.length; i++) c.lineTo(seg[i][0], seg[i][1]); if (crack > .5) { c.moveTo(-2, 8); c.lineTo(-6, 30); c.moveTo(10, -6); c.lineTo(16, -34); } c.stroke(); }
    c.restore();
  }

  /* ---------- arka plan ---------- */
  let bgHome = null, bgIsland = null, bgFood = null;
  function mkCanvas() { const c = document.createElement("canvas"); c.width = W; c.height = H; return c; }
  function renderHome() {
    const c = mkCanvas(), x = c.getContext("2d");
    const g = x.createLinearGradient(0, 0, 0, H); g.addColorStop(0, "#4A3A8A"); g.addColorStop(1, "#2A1E5A"); x.fillStyle = g; x.fillRect(0, 0, W, H);
    // mağara içi sıcak ışık
    const r = x.createRadialGradient(480, 380, 40, 480, 380, 420); r.addColorStop(0, "rgba(255,200,120,.55)"); r.addColorStop(1, "rgba(255,200,120,0)"); x.fillStyle = r; x.fillRect(0, 0, W, H);
    // pencere
    x.save(); rr(x, 650, 90, 180, 150, 70); x.clip(); const sg = x.createLinearGradient(0, 90, 0, 240); sg.addColorStop(0, "#7EC8FF"); sg.addColorStop(1, "#D6F1FF"); x.fillStyle = sg; x.fillRect(650, 90, 180, 150); circle(x, 790, 130, 18, "#FFE08A"); ell(x, 700, 150, 30, 12, 0, "#fff"); ell(x, 725, 142, 22, 12, 0, "#fff"); x.fillStyle = "#6CBF4F"; x.beginPath(); x.ellipse(740, 250, 120, 40, 0, 0, TAU); x.fill(); x.restore();
    x.lineWidth = 10; x.strokeStyle = "#7A5A3A"; rr(x, 650, 90, 180, 150, 70); x.stroke(); x.lineWidth = 6; x.beginPath(); x.moveTo(740, 92); x.lineTo(740, 238); x.moveTo(652, 170); x.lineTo(828, 170); x.stroke();
    // kristaller
    for (const [cx, cy, s, col] of [[90, 200, 1.2, "#B98CFF"], [130, 230, .8, "#7FD0FF"], [880, 330, 1, "#FF9EC7"], [60, 420, .9, "#7FD0FF"], [910, 450, .7, "#B98CFF"]]) { x.save(); x.translate(cx, cy); x.scale(s, s); x.shadowColor = col; x.shadowBlur = 20; for (const [a, h] of [[-.3, 50], [0, 70], [.35, 44]]) { x.save(); x.rotate(a); x.beginPath(); x.moveTo(-10, 0); x.lineTo(-10, -h + 12); x.lineTo(0, -h); x.lineTo(10, -h + 12); x.lineTo(10, 0); x.closePath(); x.fillStyle = col; x.fill(); x.fillStyle = "rgba(255,255,255,.35)"; x.fillRect(-6, -h + 14, 4, h - 18); x.restore(); } x.restore(); }
    // mağara kemeri
    x.fillStyle = "#2A1E4A"; x.beginPath(); x.moveTo(0, 0); x.lineTo(W, 0); x.lineTo(W, H); x.lineTo(W - 40, H); x.quadraticCurveTo(W - 10, 200, 700, 40); x.quadraticCurveTo(480, -10, 260, 40); x.quadraticCurveTo(10, 200, 40, H); x.lineTo(0, H); x.closePath(); x.fill();
    x.fillStyle = "#3A2A6A"; for (let i = 0; i < 26; i++) { const a = i / 25, px = a < .5 ? 40 + a * 2 * 220 : 700 + (a - .5) * 2 * 220; ell(x, px + rnd(-20, 20), 60 + Math.abs(a - .5) * 700 * rnd(.3, .9), rnd(14, 30), rnd(10, 18), rnd(0, 3), "#3A2A6A"); }
    // zemin
    x.fillStyle = "#6A4A3A"; x.beginPath(); x.moveTo(0, 470); x.quadraticCurveTo(480, 430, W, 470); x.lineTo(W, H); x.lineTo(0, H); x.closePath(); x.fill();
    x.fillStyle = "rgba(0,0,0,.12)"; for (let i = 0; i < 40; i++) ell(x, rnd(0, W), rnd(480, 600), rnd(6, 16), rnd(3, 6), 0, "rgba(0,0,0,.12)");
    // yuva (saman)
    x.save(); x.translate(480, 470); ell(x, 0, 6, 190, 44, 0, "#B8862E"); x.strokeStyle = "#E8B850"; x.lineWidth = 4; for (let i = 0; i < 70; i++) { const a = rnd(0, TAU), rr2 = rnd(120, 186); x.beginPath(); x.moveTo(Math.cos(a) * rr2, Math.sin(a) * rr2 * .22); x.lineTo(Math.cos(a) * rr2 + rnd(-30, 30), Math.sin(a) * rr2 * .22 + rnd(-8, 8)); x.stroke(); } x.strokeStyle = "#8A5A1E"; x.lineWidth = 3; for (let i = 0; i < 30; i++) { const a = rnd(0, TAU); x.beginPath(); x.moveTo(Math.cos(a) * 150, Math.sin(a) * 34); x.lineTo(Math.cos(a) * 190, Math.sin(a) * 40); x.stroke(); } x.restore();
    // halı yastık
    ell(x, 160, 540, 70, 18, 0, "rgba(255,120,160,.5)");
    return c;
  }
  function renderIsland() {
    const c = mkCanvas(), x = c.getContext("2d");
    const g = x.createLinearGradient(0, 0, 0, H); g.addColorStop(0, "#FFB878"); g.addColorStop(.45, "#FFD8A8"); g.addColorStop(.46, "#4DA3E0"); g.addColorStop(1, "#2A6AB0"); x.fillStyle = g; x.fillRect(0, 0, W, H);
    circle(x, 760, 150, 60, "rgba(255,240,180,.9)");
    for (const [a, b, s] of [[150, 90, 1], [420, 60, .7], [620, 110, .8]]) { x.save(); x.translate(a, b); x.scale(s, s); ell(x, 0, 0, 50, 18, 0, "rgba(255,255,255,.85)"); ell(x, 30, -10, 34, 18, 0, "rgba(255,255,255,.85)"); ell(x, -30, -6, 28, 14, 0, "rgba(255,255,255,.85)"); x.restore(); }
    x.strokeStyle = "rgba(255,255,255,.35)"; x.lineWidth = 3; for (let i = 0; i < 30; i++) { const a = rnd(0, W), b = rnd(290, 600); x.beginPath(); x.moveTo(a, b); x.quadraticCurveTo(a + 10, b - 5, a + 20, b); x.stroke(); }
    // ada
    x.fillStyle = "#F2D58A"; x.beginPath(); x.ellipse(480, 430, 420, 120, 0, 0, TAU); x.fill();
    x.fillStyle = "#6CBF4F"; x.beginPath(); x.ellipse(480, 415, 380, 100, 0, 0, TAU); x.fill();
    x.fillStyle = "#5DAF45"; for (let i = 0; i < 300; i++) { const a = rnd(0, TAU), r = Math.sqrt(Math.random()); x.fillRect(480 + Math.cos(a) * r * 370, 415 + Math.sin(a) * r * 95, 2, 5); }
    // dağ
    x.fillStyle = "#8A6A9A"; x.beginPath(); x.moveTo(330, 350); x.lineTo(480, 200); x.lineTo(630, 350); x.closePath(); x.fill(); x.fillStyle = "#fff"; x.beginPath(); x.moveTo(445, 235); x.lineTo(480, 200); x.lineTo(515, 235); x.lineTo(495, 228); x.lineTo(480, 240); x.lineTo(465, 228); x.closePath(); x.fill();
    // palmiyeler
    for (const [px, py] of [[150, 400], [820, 390]]) { x.strokeStyle = "#8A5A2E"; x.lineWidth = 10; x.beginPath(); x.moveTo(px, py); x.quadraticCurveTo(px + 16, py - 60, px + 6, py - 110); x.stroke(); x.fillStyle = "#3FA34D"; for (let k = 0; k < 5; k++) { x.save(); x.translate(px + 6, py - 110); x.rotate(-2.6 + k * .55); ell(x, 30, 0, 32, 9, 0, "#3FA34D"); x.restore(); } }
    return c;
  }
  function renderFood() {
    const c = mkCanvas(), x = c.getContext("2d");
    const g = x.createLinearGradient(0, 0, 0, H); g.addColorStop(0, "#8FD3FF"); g.addColorStop(1, "#D6F1FF"); x.fillStyle = g; x.fillRect(0, 0, W, H);
    for (const [a, b] of [[160, 160], [780, 120]]) { ell(x, a, b, 50, 18, 0, "#fff"); ell(x, a + 30, b - 10, 34, 18, 0, "#fff"); }
    x.fillStyle = "#6CBF4F"; x.fillRect(0, 520, W, 80); x.fillStyle = "#5DAF45"; for (let i = 0; i < 200; i++) x.fillRect(rnd(0, W), rnd(520, 600), 2, 6);
    // ağaç tepesi
    x.fillStyle = "#3F8A2E"; for (let i = 0; i < 18; i++) circle(x, i * 58 - 10, rnd(10, 40), rnd(50, 70), i % 2 ? "#3F8A2E" : "#4FA845");
    for (const tx of [60, 900]) { x.fillStyle = "#8A5A2E"; x.fillRect(tx - 18, 60, 36, 470); }
    return c;
  }

  /* ---------- durum ---------- */
  let scene = "title", clock = 0, fast = false, parts = [], floaters = [], btns = [], hand = null, flash = 0;
  const dr = { blink: 0, bT: 2, mouth: 0, happy: 0, jump: 0, wave: 0, lookX: 0, lookY: 0, grow: 0, squash: 0, pet: 0 };
  let petCD = 0, needSay = 8, idleT = 0;
  const cur = () => S.cur;
  function newGame() { S = fresh(); offerEggs(); save(); }
  function offerEggs() {
    const left = TYPES.map((_, i) => i).filter((i) => !S.grown.includes(i)); const pool = left.length ? left : TYPES.map((_, i) => i);
    const a = pick(pool), rest = pool.filter((i) => i !== a); S.eggs = rest.length ? [a, pick(rest)] : [a]; S.cur = null; scene = "pick"; sceneT = 0;
    say(S.grown.length ? "Yeni bir yumurta seç! Hangisi olsun?" : "Merhaba Egemen! Bir ejderha yumurtası seç!");
  }
  let sceneT = 0;
  function go(sc) { scene = sc; sceneT = 0; btns = []; hand = null; save(); }

  /* ---------- girdi ---------- */
  let ptr = { x: 0, y: 0, down: false, id: null };
  function toCanvas(e) { const r = cv.getBoundingClientRect(); return { x: (e.clientX - r.left) * W / r.width, y: (e.clientY - r.top) * H / r.height }; }
  cv.addEventListener("pointerdown", (e) => { e.preventDefault(); audio(); const p = toCanvas(e); ptr = { x: p.x, y: p.y, down: true, id: e.pointerId }; try { cv.setPointerCapture(e.pointerId); } catch (x) {} tap(p.x, p.y); });
  cv.addEventListener("pointermove", (e) => { const p = toCanvas(e); const dx = p.x - ptr.x, dy = p.y - ptr.y; ptr.x = p.x; ptr.y = p.y; move(p.x, p.y, Math.hypot(dx, dy)); });
  const up = () => { ptr.down = false; }; cv.addEventListener("pointerup", up); cv.addEventListener("pointercancel", up);
  addEventListener("keydown", (e) => { if (scene === "food") { if (e.code === "ArrowLeft") fd.kx = -1; if (e.code === "ArrowRight") fd.kx = 1; } });
  addEventListener("keyup", (e) => { if (e.code === "ArrowLeft" || e.code === "ArrowRight") fd.kx = 0; });

  function hitBtn(x, y) { for (let i = btns.length - 1; i >= 0; i--) { const b = btns[i]; if (Math.hypot(x - b.x, y - b.y) < b.r + 8) { sfx.click(); b.fn(); return true; } } return false; }
  function tap(x, y) {
    if (hitBtn(x, y)) return;
    if (scene === "pick") { const eg = S.eggs.slice(); eg.some((t, i) => { const ex = eg.length === 1 ? 480 : 330 + i * 300; if (Math.abs(x - ex) < 90 && Math.abs(y - 330) < 110) { S.cur = { type: t, hearts: 0, stage: 0, needs: { food: 60, clean: 70, fun: 60, sleep: 80 }, crack: 0, born: false }; S.eggs = null; go("egg"); say(cap(TYPES[t].kind) + " yumurtası! Yumurtaya dokun, çatlasın!", true); return true; } return false; }); }
    else if (scene === "egg") eggTap(x, y);
    else if (scene === "home") homeTap(x, y);
    else if (scene === "food") fd.tx = x;
    else if (scene === "bath") bathTap(x, y);
    else if (scene === "play") playTap(x, y);
    else if (scene === "sleep") sleepTap(x, y);
    else if (scene === "island") islandTap(x, y);
    else if (scene === "wardrobe") wardTap(x, y);
  }
  function move(x, y, d) { if (scene === "food") { if (ptr.down || d > 0) fd.tx = x; } if (scene === "bath" && ptr.down) scrub(x, y, d); }

  /* ---------- yumurta ---------- */
  let eggWob = 0;
  function eggTap(x, y) {
    const c = cur(); if (c.born) return; if (Math.abs(x - 480) > 110 || Math.abs(y - 330) > 140) return;
    c.crack = Math.round(c.crack * 10 + 1) / 10; eggWob = .5; sfx.crack(); burst(480 + rnd(-30, 30), 300, ["#fff", TYPES[c.type].belly], 6);
    if (c.crack >= 1) { c.born = true; flash = 1; sfx.hatch(); burst(480, 330, ["#FFD23F", "#FF9EC7", "#fff", TYPES[c.type].body], 50); dr.happy = 2.5; dr.jump = 0; hatchT = 0; const T = TYPES[c.type]; setTimeout(() => say("Merhaba! Ben " + T.name + ", bir " + T.kind + "yim! Benimle ilgilenir misin?", true), fast ? 0 : 600); save(); }
  }
  let hatchT = 0;

  /* ---------- ev ---------- */
  const ACTS = [{ n: "food", sc: "food", label: "Yemek" }, { n: "clean", sc: "bath", label: "Banyo" }, { n: "fun", sc: "play", label: "Oyun" }, { n: "sleep", sc: "sleep", label: "Uyku" }];
  const NEED_SAY = { food: "Karnım acıktı! Bana yemek verir misin?", clean: "Üstüm çamur oldu, beni yıkar mısın?", fun: "Canım sıkıldı, hadi oynayalım!", sleep: "Uykum geldi... Beni uyutur musun?" };
  function lowest() { const n = cur().needs; return NEEDS.slice().sort((a, b) => n[a] - n[b])[0]; }
  function homeTap(x, y) {
    if (Math.abs(x - 480) < 110 && y > 200 && y < 500) { // sevme
      dr.happy = 1.4; dr.jump = -14; sfx.giggle(); burstHearts(480, 260, 4); dr.wave = 1;
      if (petCD <= 0) { petCD = 20; addHearts(1, 480, 260); }
      const lo = lowest(); if (cur().needs[lo] < 40) say(NEED_SAY[lo]); else say(pick(["Seni çok seviyorum!", "Hihi, gıdıklanıyorum!", "Sen benim en iyi arkadaşımsın!", "Bugün çok mutluyum!", "Bir sarılma daha!"]));
    }
  }
  function startAct(a) {
    if (a.sc === "food") startFood(); else if (a.sc === "bath") startBath(); else if (a.sc === "play") startPlay(); else startSleep();
  }
  function addHearts(n, x, y) {
    const c = cur(); c.hearts += n; S.total += n;
    for (let i = 0; i < n; i++) floaters.push({ kind: "heart", x: x + rnd(-20, 20), y: y + rnd(-10, 10), tx: 820, ty: 36, t: -i * .12 });
    const unlocked = HATS.filter((h) => S.total >= h.at && S.total - n < h.at);
    if (unlocked.length) setTimeout(() => { say("Yeni süs açıldı: " + unlocked[0].n + "! Giydir düğmesine bak."); sfx.fanfare(); }, fast ? 0 : 1800);
    let ns = c.stage; while (ns < 3 && c.hearts >= STG[ns + 1]) ns++;
    if (ns !== c.stage) { growTo = ns; growT = fast ? 0 : 1.4; }
    save();
  }
  let growTo = -1, growT = 0;

  /* ---------- yemek oyunu ---------- */
  const fd = { x: 480, tx: 480, kx: 0, items: [], got: 0, need: 10, spawn: 0, done: 0, chew: 0 };
  function startFood() { Object.assign(fd, { x: 480, tx: 480, items: [], got: 0, need: 10, spawn: .5, done: 0, chew: 0 }); go("food"); const T = TYPES[cur().type]; say("Düşen meyveleri yakala! " + T.name + " en çok " + FRUITS[T.fruit] + " sever.", true); }
  function updFood(dt) {
    if (fd.done) { fd.done -= dt; if (fd.done <= 0) finishAct("food"); return; }
    fd.tx = clamp(fd.tx + fd.kx * 600 * dt, 90, 870); fd.x += clamp(fd.tx - fd.x, -700 * dt, 700 * dt);
    fd.spawn -= dt; if (fd.spawn <= 0) { fd.spawn = rnd(.8, 1.2); const T = TYPES[cur().type]; const fi = Math.random() < .35 ? T.fruit : Math.floor(rnd(0, 8)); fd.items.push({ x: rnd(110, 850), y: 60, vy: rnd(110, 150), r: rnd(-1, 1), vr: rnd(-2, 2), fi, fav: fi === T.fruit }); }
    const mx = fd.x, my = 520 - 150 * STAGE_S[cur().stage] * .82;
    for (const it of fd.items) { it.y += it.vy * dt; it.r += it.vr * dt; if (!it.gone && Math.abs(it.x - mx) < 70 && Math.abs(it.y - my) < 50) { it.gone = 1; const v = it.fav ? 2 : 1; fd.got += v; dr.mouth = 1; fd.chew = .4; sfx.chomp(); setTimeout(sfx.yum, 120); burst(it.x, it.y, it.fav ? ["#FFD23F", "#FF9EC7", "#fff"] : ["#fff", "#FFE08A"], it.fav ? 14 : 7); if (it.fav) { floatText("Bayıldım!", mx, my - 60, "#FF7AA2"); } if (fd.got >= fd.need) { fd.done = 1.4; dr.happy = 1.6; say(pick(["Mmm, karnım doydu!", "Çok lezzetliydi, teşekkürler!", "Ohh, tıka basa doydum!"])); } } if (!it.gone && it.y > 560 && !it.bounced) { it.bounced = 1; it.vy = -120; it.vr *= 2; } if (it.bounced) it.vy += 400 * dt; }
    fd.items = fd.items.filter((i) => !i.gone && i.y < 640);
    fd.chew = Math.max(0, fd.chew - dt); dr.mouth = fd.chew > 0 ? Math.abs(Math.sin(fd.chew * 20)) : Math.max(0, .55 - Math.abs(fd.items.reduce((m, it) => Math.min(m, Math.abs(it.y - my) + Math.abs(it.x - mx) * .5), 999)) / 200);
    dr.lookX = clamp((fd.items[0] ? fd.items[0].x - mx : 0) / 200, -1, 1); dr.lookY = -.6;
  }
  function drawFood() {
    ctx.drawImage(bgFood, 0, 0);
    for (const it of fd.items) { ctx.save(); ctx.translate(it.x, it.y); ctx.rotate(it.r); if (it.fav) { ctx.shadowColor = "#FFD23F"; ctx.shadowBlur = 16; } fruit(ctx, it.fi, 0, 0, 24); ctx.restore(); }
    drawDragon(ctx, dragonObj(fd.x, 520 - 92 * STAGE_S[cur().stage], .82));
    progressBar(fd.got / fd.need, (c, x, y) => fruit(c, TYPES[cur().type].fruit, x, y, 16));
  }

  /* ---------- banyo ---------- */
  const bt = { mud: [], phase: 0, shower: 0, done: 0, bub: [] };
  function startBath() {
    const st = cur().stage; bt.mud = []; for (let i = 0; i < 9; i++) { const a = rnd(0, TAU), r = Math.sqrt(Math.random()); const onHead = i < 3; bt.mud.push({ x: onHead ? rnd(-36, 36) : Math.cos(a) * r * 44, y: onHead ? -52 + rnd(-30, 20) : 8 + Math.sin(a) * r * 22, r: rnd(11, 17), a: rnd(0, 3), d: 1 }); }
    bt.phase = 0; bt.shower = 0; bt.done = 0; bt.bub = []; void st; go("bath"); say("Parmağınla çamurları ovala! Köpük köpük olsun!", true);
  }
  const bathPos = () => ({ x: 480, y: 388, s: 1.85 });
  function scrub(x, y, d) {
    if (bt.phase !== 0) return; const P = bathPos(), s = P.s * STAGE_S[cur().stage];
    for (const m of bt.mud) { if (m.d <= 0) continue; const mx = P.x + m.x * s, my = P.y + m.y * s + (m.y < -10 ? 0 : 0); if (Math.hypot(x - mx, y - my) < 46) { m.d -= .02 + Math.min(.1, d * .004); if (Math.random() < .5) bt.bub.push({ x: x + rnd(-14, 14), y: y + rnd(-14, 14), r: rnd(6, 15), t: 0 }); if (Math.random() < .2) sfx.scrub(); if (m.d <= 0) { sfx.bubble(); burst(mx, my, ["#fff", "#BFE8FF"], 6); } } }
    if (bt.mud.every((m) => m.d <= 0)) { bt.phase = 1; dr.happy = 1; say("Harika! Şimdi duşu aç, köpükleri durula!", true); }
  }
  function bathTap(x, y) { if (bt.phase === 0) scrub(x, y, 12); else if (bt.phase === 1 && Math.hypot(x - 480, y - 70) < 70) { bt.phase = 2; bt.shower = 2.4; sfx.water(); } }
  function updBath(dt) {
    for (const b of bt.bub) b.t += dt;
    if (bt.phase === 2) { bt.shower -= dt; for (const b of bt.bub) b.y += 260 * dt; if (Math.random() < .9) for (let k = 0; k < 3; k++) parts.push({ x: rnd(380, 580), y: 100, vx: rnd(-20, 20), vy: rnd(300, 420), life: 1.3, c: "rgba(140,210,255,.9)", s: 3, g: 0 }); if (bt.shower <= 0) { bt.phase = 3; bt.done = 1.6; bt.bub = []; dr.happy = 1.8; sfx.yum(); burst(480, 300, ["#fff", "#FFD23F", "#BFE8FF"], 30); say(pick(["Mis gibi oldum!", "Pırıl pırıl oldum, teşekkürler!", "Ohh, tertemiz!"])); } }
    bt.bub = bt.bub.filter((b) => b.y < 640).slice(-120);
    if (bt.phase === 3) { bt.done -= dt; if (bt.done <= 0) finishAct("clean"); }
  }
  function drawBath() {
    const g = ctx.createLinearGradient(0, 0, 0, H); g.addColorStop(0, "#BFE3F7"); g.addColorStop(1, "#8FC8E8"); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    for (let i = 0; i < 25; i++) for (let k = 0; k < 10; k++) { ctx.fillStyle = (i + k) % 2 ? "rgba(255,255,255,.18)" : "rgba(255,255,255,.05)"; ctx.fillRect(i * 40, k * 40, 40, 40); }
    // küvet
    const P = bathPos();
    drawDragon(ctx, Object.assign(dragonObj(P.x, P.y, P.s), { mud: bt.phase === 0 ? bt.mud : null, noShadow: true }));
    ctx.fillStyle = "#fff"; rr(ctx, 150, 440, 660, 160, 60); ctx.fill(); ctx.lineWidth = 5; ctx.strokeStyle = OL; ctx.stroke(); ctx.fillStyle = "#E8F4FA"; ctx.fillRect(170, 450, 620, 18);
    for (const sd of [230, 730]) { ctx.fillStyle = "#C8A060"; ctx.fillRect(sd - 12, 570, 24, 24); }
    for (const b of bt.bub) { ctx.globalAlpha = .85; circle(ctx, b.x, b.y + Math.sin(b.t * 3) * 2, b.r, "rgba(255,255,255,.85)"); ctx.strokeStyle = "rgba(120,180,220,.6)"; ctx.lineWidth = 2; ctx.stroke(); circle(ctx, b.x - b.r * .3, b.y - b.r * .3, b.r * .25, "#fff"); ctx.globalAlpha = 1; }
    for (let k = 0; k < 16; k++) { circle(ctx, 180 + k * 40, 448 + Math.sin(clock * 2 + k) * 3, 22, "rgba(255,255,255,.95)"); }
    // duş
    ctx.strokeStyle = "#8A9AAA"; ctx.lineWidth = 10; ctx.beginPath(); ctx.moveTo(480, 0); ctx.lineTo(480, 50); ctx.stroke();
    ctx.fillStyle = bt.phase === 1 ? "#FFD23F" : "#B8C8D8"; ctx.beginPath(); ctx.moveTo(430, 90); ctx.lineTo(530, 90); ctx.lineTo(500, 50); ctx.lineTo(460, 50); ctx.closePath(); ctx.fill(); ctx.lineWidth = 4; ctx.strokeStyle = OL; ctx.stroke();
    if (bt.phase === 1) { ctx.globalAlpha = .5 + .5 * Math.sin(clock * 6); circle(ctx, 480, 70, 60, null); ctx.strokeStyle = "#FFD23F"; ctx.lineWidth = 6; ctx.stroke(); ctx.globalAlpha = 1; drawHand(530, 110); }
    if (bt.phase === 0 && sceneT < 6) { const m = bt.mud.find((q) => q.d > 0); if (m) { const s = P.s * STAGE_S[cur().stage]; drawHand(P.x + m.x * s + Math.sin(clock * 6) * 24, P.y + m.y * s + 20); } }
    const cl = bt.mud.reduce((a, m) => a + (1 - Math.max(0, m.d)), 0) / bt.mud.length; progressBar(bt.phase ? 1 : cl, (c, x, y) => needIcon(c, "clean", x, y, 16));
  }

  /* ---------- balon oyunu ---------- */
  const COLORS = [{ n: "kırmızı", c: "#E8463F" }, { n: "mavi", c: "#2E86DE" }, { n: "sarı", c: "#F7C531" }, { n: "yeşil", c: "#3FB34D" }, { n: "mor", c: "#9B59D0" }, { n: "turuncu", c: "#FF8A2E" }];
  const pl = { bal: [], round: 0, target: 0, got: 0, spawn: 0, done: 0, shots: [], colsUsed: [] };
  function startPlay() { Object.assign(pl, { bal: [], round: 0, next: 0, got: 0, spawn: 0, done: 0, shots: [], colsUsed: [] }); nextRound(); go("play"); for (let i = 0; i < 5; i++) spawnBal(rnd(200, 560)); }
  function nextRound() { const opts = [0, 1, 2, 3, 4, 5].filter((i) => !pl.colsUsed.includes(i)); pl.target = pick(opts); pl.colsUsed.push(pl.target); pl.got = 0; say(cap(COLORS[pl.target].n) + " balonları patlat!", true); }
  const cap = (s) => s.charAt(0).toLocaleUpperCase("tr") + s.slice(1);
  function spawnBal(y) { const want = !pl.bal.some((b) => b.c === pl.target && b.y > 120) || Math.random() < .4; const c = want ? pl.target : pick([0, 1, 2, 3, 4, 5].filter((i) => i !== pl.target)); pl.bal.push({ x: rnd(120, 840), y: y || 660, vy: rnd(50, 75), c, ph: rnd(0, 6), wob: 0, hit: 0 }); }
  function playTap(x, y) {
    if (pl.done || pl.next || pl.got + pl.shots.length >= 3) return;
    for (let i = pl.bal.length - 1; i >= 0; i--) { const b = pl.bal[i]; if (b.hit) continue; if (Math.hypot(x - b.x, y - b.y) < 52) {
      if (b.c === pl.target) { b.hit = 1; const D = playDragon(); const mx = D.x, my = D.y - 20 * STAGE_S[cur().stage]; pl.shots.push({ x0: mx, y0: my, x1: b.x, y1: b.y, t: 0, b }); dr.mouth = 1; sfx.breath(); dr.lookX = clamp((b.x - mx) / 250, -1, 1); dr.lookY = -1; }
      else { b.wob = .6; sfx.wrong(); say("Bu " + COLORS[b.c].n + "! " + cap(COLORS[pl.target].n) + " balonu bul."); }
      return; } }
  }
  const playDragon = () => ({ x: 480, y: 490 });
  function updPlay(dt) {
    if (pl.next) { pl.next -= dt; if (pl.next <= 0) { pl.next = 0; nextRound(); } }
    if (pl.done) { pl.done -= dt; if (pl.done <= 0) finishAct("fun"); }
    pl.spawn -= dt; if (pl.spawn <= 0 && !pl.done) { pl.spawn = rnd(.7, 1.1); if (pl.bal.length < 9) spawnBal(); }
    for (const b of pl.bal) { b.y -= b.vy * dt; b.ph += dt * 2; b.wob = Math.max(0, b.wob - dt); }
    pl.bal = pl.bal.filter((b) => b.y > -80 && !b.popped);
    for (const s of pl.shots) { s.t += dt * 3.2; const t = Math.min(1, s.t), x = s.x0 + (s.x1 - s.x0) * t, y = s.y0 + (s.y1 - s.y0) * t; const T = TYPES[cur().type]; for (let k = 0; k < 3; k++) parts.push({ x: x + rnd(-8, 8), y: y + rnd(-8, 8), vx: rnd(-30, 30), vy: rnd(-30, 30), life: .4, c: pick(T.breath), s: rnd(4, 9) }); if (s.t >= 1 && !s.done) { s.done = 1; s.b.popped = 1; sfx.pop(); burst(s.b.x, s.b.y, [COLORS[s.b.c].c, "#fff", "#FFD23F"], 22); pl.got++; if (pl.got >= 3 && !pl.next) { if (pl.colsUsed.length >= 3) { pl.done = 1.6; dr.happy = 2; say(pick(["Çok eğlendim! Yine oynayalım!", "Yaşasın, hepsini patlattık!", "Sen bir balon ustasısın!"])); sfx.fanfare(); } else { dr.happy = .8; pl.next = .8; } } } }
    pl.shots = pl.shots.filter((s) => !s.done);
    dr.mouth = Math.max(0, dr.mouth - dt * 2);
  }
  function drawPlay() {
    const g = ctx.createLinearGradient(0, 0, 0, H); g.addColorStop(0, "#FFB8D8"); g.addColorStop(1, "#FFE6C8"); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    for (let i = 0; i < 12; i++) { ctx.fillStyle = i % 2 ? "rgba(255,255,255,.18)" : "rgba(255,255,255,0)"; ctx.beginPath(); ctx.moveTo(480, 650); ctx.lineTo(i * 90 - 60, -10); ctx.lineTo(i * 90 + 30, -10); ctx.closePath(); ctx.fill(); }
    ctx.fillStyle = "#8BD96A"; ctx.fillRect(0, 540, W, 60);
    for (const b of pl.bal) { if (b.popped) continue; const x = b.x + Math.sin(b.ph) * 8 + Math.sin(b.wob * 30) * b.wob * 14, y = b.y; ctx.strokeStyle = "rgba(60,40,60,.5)"; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(x, y + 46); ctx.quadraticCurveTo(x + 8, y + 70, x, y + 96); ctx.stroke(); ell(ctx, x, y, 38, 46, 0, COLORS[b.c].c, 3.5); ctx.fillStyle = COLORS[b.c].c; ctx.beginPath(); ctx.moveTo(x - 7, y + 52); ctx.lineTo(x + 7, y + 52); ctx.lineTo(x, y + 44); ctx.fill(); ell(ctx, x - 13, y - 16, 8, 13, .4, "rgba(255,255,255,.5)"); }
    drawDragon(ctx, dragonObj(480, 490, 1));
    // hedef rozeti
    ctx.fillStyle = "rgba(255,255,255,.92)"; rr(ctx, 740, 50, 200, 54, 27); ctx.fill(); ctx.lineWidth = 4; ctx.strokeStyle = COLORS[pl.target].c; ctx.stroke(); ell(ctx, 778, 77, 15, 19, 0, COLORS[pl.target].c, 2.5); for (let k = 0; k < 3; k++) circle(ctx, 830 + k * 32, 77, 11, k < pl.got ? COLORS[pl.target].c : "#E8DCE8", 2.5);
    progressBar((pl.colsUsed.length - 1 + pl.got / 3) / 3, (c, x, y) => needIcon(c, "fun", x, y, 16));
  }

  /* ---------- uyku ---------- */
  const sl = { phase: 0, t: 0, dark: 0, stars: [], z: 0 };
  function startSleep() { sl.phase = 0; sl.t = 0; sl.dark = 0; sl.stars = []; for (let i = 0; i < 9; i++) sl.stars.push({ x: 640 + rnd(20, 180), y: 100 + rnd(10, 130), tw: 0 }); go("sleep"); say("Lambayı söndür, " + TYPES[cur().type].name + " uyusun.", true); }
  function sleepTap(x, y) {
    if (sl.phase === 0 && Math.hypot(x - 200, y - 330) < 80) { sl.phase = 1; sl.t = 0; sfx.click(); sfx.yawn(); say("İyi geceler " + TYPES[cur().type].name + "! Tatlı rüyalar.", true); return; }
    if (sl.phase === 1) { for (const s of sl.stars) if (Math.hypot(x - s.x, y - s.y) < 30) { s.tw = 1; sfx.twinkle(); burst(s.x, s.y, ["#FFE08A", "#fff"], 6); } if (Math.abs(x - 480) < 100 && y > 250 && y < 480) { sfx.twinkle(); floatText("Zzz", 520, 260, "#BFD8FF"); } }
  }
  function updSleep(dt) {
    sl.t += dt;
    if (sl.phase === 1) { sl.dark = Math.min(.7, sl.dark + dt * .8); sl.z -= dt; if (sl.z <= 0) { sl.z = .9; floaters.push({ kind: "z", x: 520, y: 270, t: 0 }); } if (sl.t > 7.5) { sl.phase = 2; sl.t = 0; sfx.yawn(); say("Günaydın! Çok güzel uyudum!"); dr.happy = 1.5; } }
    if (sl.phase === 2) { sl.dark = Math.max(0, sl.dark - dt * .8); if (sl.t > 2) finishAct("sleep"); }
    for (const s of sl.stars) s.tw = Math.max(0, s.tw - dt);
  }
  function drawSleep() {
    ctx.drawImage(bgHome, 0, 0);
    // lamba
    const on = sl.phase !== 1; ctx.fillStyle = "#7A5A3A"; ctx.fillRect(190, 360, 20, 120); ell(ctx, 200, 480, 40, 10, 0, "#7A5A3A"); if (on) { const r = ctx.createRadialGradient(200, 330, 10, 200, 330, 140); r.addColorStop(0, "rgba(255,230,140,.7)"); r.addColorStop(1, "rgba(255,230,140,0)"); ctx.fillStyle = r; ctx.fillRect(60, 190, 280, 280); }
    ctx.fillStyle = on ? "#FFD23F" : "#8A7A5A"; ctx.beginPath(); ctx.moveTo(150, 360); ctx.lineTo(250, 360); ctx.lineTo(225, 300); ctx.lineTo(175, 300); ctx.closePath(); ctx.fill(); ctx.lineWidth = 4; ctx.strokeStyle = OL; ctx.stroke();
    const D = dragonObj(480, 365, 1.25); D.sleep = sl.phase === 1; drawDragon(ctx, D);
    if (sl.dark > 0) { ctx.fillStyle = "rgba(10,10,40," + sl.dark + ")"; ctx.fillRect(0, 0, W, H); }
    if (sl.phase === 1) { ctx.save(); rr(ctx, 650, 90, 180, 150, 70); ctx.clip(); ctx.fillStyle = "rgba(20,20,70," + (sl.dark * 1.2) + ")"; ctx.fillRect(650, 90, 180, 150); ctx.restore(); circle(ctx, 790, 130, 16, "rgba(255,240,180," + sl.dark + ")"); for (const s of sl.stars) star(ctx, s.x, s.y, 6 + s.tw * 8 + Math.sin(clock * 3 + s.x) * 1.5, "rgba(255,240,180," + Math.min(1, sl.dark * 1.4) + ")"); }
    if (sl.phase === 0 && sceneT > .5) drawHand(240, 360);
    progressBar(sl.phase === 0 ? 0 : sl.phase === 1 ? sl.t / 7.5 : 1, (c, x, y) => needIcon(c, "sleep", x, y, 16));
  }

  function finishAct(n) {
    const c = cur(), before = c.needs[n]; c.needs[n] = 100; const gain = before < 50 ? 3 : before < 80 ? 2 : 1;
    go("home"); addHearts(gain, 480, 300); dr.happy = 1.5; sfx.heart(); if (S.tut < 2) S.tut++;
    if (gain === 1) say("Bunu zaten yapmıştık! Başka neye ihtiyacı var, bak bakalım.");
  }

  /* ---------- büyüme / ada ---------- */
  function updGrow(dt) {
    if (growTo < 0) return; growT -= dt; if (growT > 0) return;
    const c = cur(); c.stage = growTo; growTo = -1; flash = 1; sfx.grow(); dr.happy = 2; burst(480, 300, ["#FFD23F", "#fff", "#FF9EC7"], 40);
    if (c.stage === 3) { setTimeout(() => { go("grown"); say("Vay canına! " + TYPES[c.type].name + " kocaman oldu! Artık uçabilir. Onu Ejderha Adası'na uçur!", true); }, fast ? 0 : 1800); }
    else say("Yaşasın! " + TYPES[c.type].name + " büyüdü! Artık " + STAGE_N[c.stage] + " bir ejderha!");
    save();
  }
  let flyT = 0;
  function flyAway() { if (flyT) return; flyT = .001; sfx.whoosh(); say("Hoşça kal! Adada görüşürüz!"); }
  function updGrown(dt) { if (!flyT) return; flyT += dt; if (flyT > 2.4) { flyT = 0; const c = cur(); S.grown.push(c.type); S.cur = null; go("island"); islandNew = S.grown.length - 1; islandT = 0; sfx.fanfare(); const all = new Set(S.grown).size >= TYPES.length; say(all ? "İnanılmaz! Sekiz ejderhanın hepsi adada! Sen bir ejderha ustasısın!" : TYPES[c.type].name + " adaya kondu! Adada " + S.grown.length + " ejderha var. Yeni yumurta için düğmeye dokun.", true); save(); } }
  let islandNew = -1, islandT = 0;
  const islandSpot = (i) => { const sp = [[300, 400], [660, 400], [480, 450], [200, 450], [770, 450], [380, 330], [590, 330], [480, 280]]; const p = sp[i % 8]; return { x: p[0] + Math.floor(i / 8) * 30, y: p[1] - Math.floor(i / 8) * 20 }; };
  function islandTap(x, y) { S.grown.forEach((t, i) => { const p = islandSpot(i); if (Math.hypot(x - p.x, y - p.y + 40) < 60) { isl[i] = 1.2; sfx.giggle(); say("Ben " + TYPES[t].name + "! " + cap(TYPES[t].kind) + "yim."); burstHearts(p.x, p.y - 60, 3); } }); }
  const isl = {};

  /* ---------- gardırop ---------- */
  function wardTap(x, y) { HATS.forEach((h, i) => { const p = wardPos(i); if (Math.hypot(x - p.x, y - p.y) < 46) { if (S.total >= h.at) { S.hat = S.hat === h.id ? null : h.id; sfx.pop(); dr.happy = 1; burst(480, 220, ["#FFD23F", "#fff"], 12); say(S.hat ? cap(h.n) + " çok yakıştı!" : "Süsü çıkardık."); save(); } else { sfx.wrong(); say("Bu süs için " + (h.at - S.total) + " kalp daha topla!"); } } }); }
  const wardPos = (i) => ({ x: 150 + i * 110, y: 530 });

  /* ---------- efektler ---------- */
  function burst(x, y, cols, n) { if (fast) return; for (let i = 0; i < n; i++) { const a = rnd(0, TAU), s = rnd(60, 220); parts.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s - 60, life: rnd(.5, 1), c: pick(cols), s: rnd(3, 7), g: 300 }); } }
  function burstHearts(x, y, n) { for (let i = 0; i < n; i++) floaters.push({ kind: "fh", x: x + rnd(-40, 40), y: y + rnd(-20, 20), t: -i * .1 }); }
  function floatText(s, x, y, col) { floaters.push({ kind: "txt", s, x, y, col, t: 0 }); }
  function drawHand(x, y) { const b = Math.sin(clock * 6) * 6; ctx.save(); ctx.translate(x + b * .4, y + b); ctx.rotate(-.5); ctx.fillStyle = "#FFE0C0"; ctx.strokeStyle = OL; ctx.lineWidth = 3; rr(ctx, -12, -40, 24, 50, 12); ctx.fill(); ctx.stroke(); rr(ctx, -22, 0, 44, 40, 16); ctx.fill(); ctx.stroke(); ctx.restore(); }
  function progressBar(f, icon) { ctx.fillStyle = "rgba(255,255,255,.85)"; rr(ctx, 300, 556, 360, 30, 15); ctx.fill(); ctx.fillStyle = "#3FB34D"; rr(ctx, 304, 560, Math.max(22, 352 * clamp(f, 0, 1)), 22, 11); ctx.fill(); ctx.lineWidth = 3; ctx.strokeStyle = OL; rr(ctx, 300, 556, 360, 30, 15); ctx.stroke(); icon(ctx, 290, 571); btnBack(); }
  function btnBack() { btns.push({ x: 50, y: 50, r: 34, fn: () => { go("home"); say("Yuvaya döndük."); } }); circle(ctx, 50, 50, 32, "#fff", 3.5); ctx.fillStyle = OL; ctx.beginPath(); ctx.moveTo(36, 50); ctx.lineTo(56, 36); ctx.lineTo(56, 64); ctx.closePath(); ctx.fill(); ctx.fillRect(52, 45, 14, 10); }

  function dragonObj(x, y, s) { const c = cur(); return { type: c.type, stage: c.stage, x, y, s, t: clock, blink: dr.blink, mouth: dr.mouth, happy: dr.happy > 0, jump: dr.jump, wave: dr.wave > 0, lookX: dr.lookX, lookY: dr.lookY, hat: S.hat, sad: false, squash: dr.squash }; }

  /* ---------- güncelleme ---------- */
  function update(dt) {
    clock += dt; sceneT += dt; flash = Math.max(0, flash - dt * 1.5);
    dr.bT -= dt; if (dr.bT <= 0) { dr.blink = .14; dr.bT = rnd(2, 5); } dr.blink = Math.max(0, dr.blink - dt);
    dr.happy = Math.max(0, dr.happy - dt); dr.wave = Math.max(0, dr.wave - dt); dr.jump *= Math.pow(.02, dt); dr.squash = Math.max(0, dr.squash - dt);
    eggWob = Math.max(0, eggWob - dt * 1.5);
    for (const p of parts) { p.life -= dt; p.x += p.vx * dt; p.y += p.vy * dt; p.vy += (p.g || 0) * dt; } parts = parts.filter((p) => p.life > 0); if (parts.length > 500) parts = parts.slice(-500);
    for (const f of floaters) f.t += dt; floaters = floaters.filter((f) => f.t < (f.kind === "heart" ? 1 : f.kind === "z" ? 2.4 : 1.4));
    if (!S) return;
    if (scene === "home") {
      const c = cur(); petCD -= dt; idleT += dt;
      for (const n of NEEDS) c.needs[n] = Math.max(4, c.needs[n] - NEED_RATE[n] * dt);
      needSay -= dt; const lo = lowest(); if (needSay <= 0 && c.needs[lo] < 30 && growTo < 0) { needSay = 25; say(NEED_SAY[lo]); }
      dr.lookX = Math.sin(clock * .7) * .6; dr.lookY = Math.sin(clock * .5) * .3;
      updGrow(dt);
    }
    if (scene === "egg") { const c = cur(); if (c.born) { hatchT += dt; if (hatchT > (fast ? 0 : 4)) { go("home"); needSay = 6; say("Alttaki düğmelerle " + TYPES[c.type].name + "'e bak. Önce karnını doyuralım!"); } } }
    if (scene === "food") updFood(dt); else if (scene === "bath") updBath(dt); else if (scene === "play") updPlay(dt); else if (scene === "sleep") updSleep(dt); else if (scene === "grown") updGrown(dt);
    if (scene === "island") { islandT += dt; for (const k in isl) isl[k] = Math.max(0, isl[k] - dt); }
  }

  /* ---------- çizim ---------- */
  function draw() {
    ctx.setTransform(1, 0, 0, 1, 0, 0); btns = [];
    if (!S || scene === "title") { ctx.drawImage(bgHome, 0, 0); return; }
    if (scene === "pick") drawPick(); else if (scene === "egg") drawEggScene(); else if (scene === "home" || scene === "wardrobe") drawHome(); else if (scene === "food") drawFood(); else if (scene === "bath") drawBath(); else if (scene === "play") drawPlay(); else if (scene === "sleep") drawSleep(); else if (scene === "grown") drawGrown(); else if (scene === "island") drawIsland();
    for (const p of parts) { ctx.globalAlpha = Math.min(1, p.life * 2); circle(ctx, p.x, p.y, p.s, p.c); } ctx.globalAlpha = 1;
    for (const f of floaters) { if (f.t < 0) continue;
      if (f.kind === "heart") { const k = ease(f.t), x = f.x + (f.tx - f.x) * k, y = f.y + (f.ty - f.y) * k - Math.sin(k * Math.PI) * 80; heart(ctx, x, y, 16, "#FF4A7A", 3); }
      else if (f.kind === "fh") { ctx.globalAlpha = 1 - f.t / 1.4; heart(ctx, f.x + Math.sin(f.t * 6) * 8, f.y - f.t * 70, 12, "#FF7AA2", 2.5); ctx.globalAlpha = 1; }
      else if (f.kind === "z") { ctx.globalAlpha = Math.max(0, 1 - f.t / 2.4); txt("Z", f.x + f.t * 30 + Math.sin(f.t * 3) * 10, f.y - f.t * 50, 22 + f.t * 12, "#E8F0FF"); ctx.globalAlpha = 1; }
      else { ctx.globalAlpha = Math.max(0, 1 - f.t / 1.4); txt(f.s, f.x, f.y - f.t * 40, 30, f.col); ctx.globalAlpha = 1; } }
    if (flash > 0) { ctx.fillStyle = "rgba(255,255,255," + flash * .8 + ")"; ctx.fillRect(0, 0, W, H); }
  }
  function drawPick() {
    ctx.drawImage(bgHome, 0, 0);
    S.eggs.forEach((t, i) => { const x = S.eggs.length === 1 ? 480 : 330 + i * 300; drawEgg(ctx, t, x, 330 + Math.sin(clock * 2 + i) * 6, 1.25, 0, Math.sin(clock * 3 + i * 2) * .06); ctx.globalAlpha = .5 + .3 * Math.sin(clock * 4); circle(ctx, x, 330, 115, null); ctx.strokeStyle = "#FFE08A"; ctx.lineWidth = 5; ctx.setLineDash([12, 12]); ctx.stroke(); ctx.setLineDash([]); ctx.globalAlpha = 1; });
    if (sceneT > 1.5) drawHand(S.eggs.length === 1 ? 520 : 370, 420);
    if (S.grown.length) islandBtn(80, 530);
  }
  function drawEggScene() {
    ctx.drawImage(bgHome, 0, 0); const c = cur();
    if (!c.born) { drawEgg(ctx, c.type, 480, 360, 1.5, c.crack, Math.sin(clock * 30) * eggWob * .3); txt("Dokun! " + Math.round(c.crack * 10) + "/10", 480, 560, 40, "#FFE08A"); if (c.crack === 0 && sceneT > 1.5) drawHand(530, 440); }
    else { const k = ease(hatchT * 1.5); drawDragon(ctx, { type: c.type, stage: 0, x: 480, y: 420 - Math.sin(Math.min(1, hatchT * 2) * Math.PI) * 60, s: 1.3 * k, t: clock, happy: true, wave: true, hat: null });
      ctx.save(); ctx.globalAlpha = Math.max(0, 1 - hatchT); drawEgg(ctx, c.type, 400 - hatchT * 60, 470, .8, 1, -.6 - hatchT); drawEgg(ctx, c.type, 560 + hatchT * 60, 470, .8, 1, .6 + hatchT); ctx.restore();
      txt(TYPES[c.type].name, 480, 560, 54, "#FFE08A"); }
  }
  function drawHome() {
    ctx.drawImage(bgHome, 0, 0); const c = cur();
    const gs = growTo >= 0 ? 1 + Math.sin(clock * 30) * .04 : 1;
    const D = dragonObj(480, 365, gs * 1.25); D.sad = NEEDS.some((n) => c.needs[n] < 22) && !dr.happy; if (c.needs.sleep < 25 && !dr.happy) D.blink = Math.sin(clock * 2) > .3 ? 1 : 0; drawDragon(ctx, D);
    // düşünce balonu
    const lo = lowest(); if (c.needs[lo] < 35 && scene === "home") { const bx = 640, by = 190 + Math.sin(clock * 2) * 4; circle(ctx, 580, 260, 7, "#fff", 2.5); circle(ctx, 600, 236, 11, "#fff", 2.5); ell(ctx, bx, by, 46, 38, 0, "#fff", 3); needIcon(ctx, lo, bx, by, 24); }
    // ihtiyaç göstergeleri
    NEEDS.forEach((n, i) => { const x = 44 + i * 68, y = 44, v = c.needs[n] / 100; circle(ctx, x, y, 30, "rgba(255,255,255,.92)", 3); ctx.lineWidth = 7; ctx.strokeStyle = v > .5 ? "#3FB34D" : v > .25 ? "#F7B92A" : "#E8463F"; ctx.beginPath(); ctx.arc(x, y, 24, -Math.PI / 2, -Math.PI / 2 + TAU * v); ctx.stroke(); needIcon(ctx, n, x, y, 14); });
    // kalp/büyüme çubuğu
    const st = c.stage, a = STG[st], b = STG[Math.min(3, st + 1)], f = st >= 3 ? 1 : (c.hearts - a) / (b - a);
    ctx.fillStyle = "rgba(255,255,255,.92)"; rr(ctx, 690, 18, 250, 40, 20); ctx.fill(); ctx.lineWidth = 3; ctx.strokeStyle = OL; ctx.stroke(); ctx.fillStyle = "#FF7AA2"; rr(ctx, 724, 26, Math.max(20, 206 * clamp(f, 0, 1)), 24, 12); ctx.fill(); heart(ctx, 712, 38, 15, "#FF4A7A", 3);
    ctx.font = "700 15px Fredoka"; ctx.fillStyle = OL; ctx.textAlign = "left"; ctx.textBaseline = "middle"; ctx.fillText(cap(STAGE_N[st]) + " · " + c.hearts + " ♥", 734, 38);
    txt(TYPES[c.type].name, 150, 106, 26, "#FFE08A");
    if (scene === "wardrobe") { drawWardrobe(); return; }
    // eylem düğmeleri
    const sug = lowest();
    ACTS.forEach((A, i) => { const x = 300 + i * 120, y = 538, v = c.needs[A.n], hi = A.n === sug && v < 70; const r = 48 + (hi ? Math.sin(clock * 6) * 3 : 0);
      btns.push({ x, y, r: 50, fn: () => startAct(A) });
      circle(ctx, x, y + 5, r, "rgba(0,0,0,.25)"); circle(ctx, x, y, r, hi ? "#FFD23F" : "#FFF6E0", 4); needIcon(ctx, A.n, x, y - 2, 26);
      ctx.lineWidth = 6; ctx.strokeStyle = v > 50 ? "#3FB34D" : v > 25 ? "#F7B92A" : "#E8463F"; ctx.beginPath(); ctx.arc(x, y, r - 3, Math.PI * .8, Math.PI * .8 + Math.PI * 1.4 * v / 100); ctx.stroke(); });
    islandBtn(80, 538);
    // gardırop
    btns.push({ x: 880, y: 538, r: 44, fn: () => { go("wardrobe"); say("Hangi süsü takalım?"); } }); circle(ctx, 880, 543, 44, "rgba(0,0,0,.25)"); circle(ctx, 880, 538, 44, "#FFF6E0", 4); ctx.save(); ctx.translate(880, 570); ctx.scale(.55, .55); drawHat(ctx, "parti", 30, null); ctx.restore();
    if (HATS.some((h) => S.total >= h.at && !(S.seen || []).includes(h.id))) circle(ctx, 912, 506, 9, "#E8463F", 2.5);
    if (S.tut < 2 && sceneT > 2 && growTo < 0) { const i = ACTS.findIndex((A) => A.n === sug); drawHand(300 + i * 120 + 30, 560); }
  }
  function islandBtn(x, y) { btns.push({ x, y, r: 44, fn: () => { go("island"); islandNew = -1; say(S.grown.length ? "Ejderha Adası! Ejderhalara dokun." : "Ejderha Adası henüz boş. Ejderhanı büyütünce buraya uçacak!"); } }); circle(ctx, x, y + 5, 44, "rgba(0,0,0,.25)"); circle(ctx, x, y, 44, "#FFF6E0", 4); ctx.save(); ctx.beginPath(); ctx.arc(x, y, 40, 0, TAU); ctx.clip(); ctx.fillStyle = "#4DA3E0"; ctx.fillRect(x - 44, y, 88, 44); ell(ctx, x, y + 6, 30, 10, 0, "#F2D58A"); ctx.fillStyle = "#8A6A9A"; ctx.beginPath(); ctx.moveTo(x - 18, y + 4); ctx.lineTo(x, y - 20); ctx.lineTo(x + 18, y + 4); ctx.fill(); ctx.restore(); if (S.grown.length) { circle(ctx, x + 30, y - 30, 14, "#FF7AA2", 2.5); txt(String(S.grown.length), x + 30, y - 29, 16, "#fff", "center", false); } }
  function drawWardrobe() {
    S.seen = HATS.filter((h) => S.total >= h.at).map((h) => h.id);
    ctx.fillStyle = "rgba(40,20,60,.55)"; rr(ctx, 70, 470, 820, 120, 30); ctx.fill();
    HATS.forEach((h, i) => { const p = wardPos(i), own = S.total >= h.at; circle(ctx, p.x, p.y, 44, S.hat === h.id ? "#FFD23F" : own ? "#FFF6E0" : "#8A7A9A", 4); ctx.save(); ctx.translate(p.x, p.y + (h.id === "papyon" ? -34 : h.id === "gozluk" ? 6 : 26)); ctx.scale(.62, .62); if (!own) ctx.globalAlpha = .35; drawHat(ctx, h.id, 40, null); ctx.restore(); if (!own) { heart(ctx, p.x + 26, p.y + 28, 11, "#FF4A7A", 2); txt(String(h.at), p.x + 26, p.y + 28, 12, "#fff", "center", false); } });
    btns.push({ x: 900, y: 120, r: 34, fn: () => { go("home"); } }); circle(ctx, 900, 120, 32, "#fff", 3.5); ctx.strokeStyle = OL; ctx.lineWidth = 6; ctx.beginPath(); ctx.moveTo(888, 108); ctx.lineTo(912, 132); ctx.moveTo(912, 108); ctx.lineTo(888, 132); ctx.stroke();
  }
  function drawGrown() {
    ctx.drawImage(bgHome, 0, 0); const c = cur(); const D = dragonObj(480, 380 - (flyT ? ease(flyT / 2) * 600 : 0), 1); D.happy = true; D.fly = true; D.t = clock; const o = Object.assign(D, { fly: true }); drawDragon(ctx, o);
    for (let i = 0; i < 3; i++) star(ctx, 200 + i * 280, 150 + Math.sin(clock * 2 + i) * 10, 16, "#FFE08A");
    if (!flyT) { btns.push({ x: 480, y: 545, r: 60, fn: flyAway }); ctx.fillStyle = "#FF8A3D"; rr(ctx, 330, 510, 300, 70, 35); ctx.fill(); ctx.lineWidth = 4; ctx.strokeStyle = "#fff"; ctx.stroke(); txt("Adaya uçur!", 480, 545, 32, "#fff"); drawHand(560, 580); }
    void c;
  }
  function drawIsland() {
    ctx.drawImage(bgIsland, 0, 0);
    // boş yerler
    const seenTypes = new Set(S.grown);
    S.grown.forEach((t, i) => { const p = islandSpot(i), land = i === islandNew ? ease(islandT / 1.6) : 1; const y = p.y - (1 - land) * 500 - Math.abs(Math.sin(clock * 2 + i)) * 6 - (isl[i] ? Math.sin(isl[i] * 8) * 20 : 0);
      drawDragon(ctx, { type: t, stage: 3, x: p.x, y, s: .6, t: clock + i, happy: isl[i] > 0, fly: land < 1, flip: i % 2 === 1, wave: isl[i] > 0 }); });
    // koleksiyon şeridi
    ctx.fillStyle = "rgba(255,255,255,.85)"; rr(ctx, 150, 522, 520, 60, 30); ctx.fill(); ctx.lineWidth = 3; ctx.strokeStyle = OL; ctx.stroke();
    TYPES.forEach((T, i) => { const x = 184 + i * 64; if (seenTypes.has(i)) { ctx.save(); ctx.translate(x, 560); drawDragon(ctx, { type: i, stage: 0, x: 0, y: 0, s: .26, t: clock, noShadow: true }); ctx.restore(); } else { circle(ctx, x, 552, 20, "#D8D0E8"); txt("?", x, 553, 22, "#8A7A9A", "center", false); } });
    // düğmeler
    if (S.cur) { btns.push({ x: 880, y: 538, r: 44, fn: () => { go("home"); } }); circle(ctx, 880, 538, 44, "#FFF6E0", 4); ctx.save(); ctx.translate(880, 548); ctx.scale(.3, .3); drawDragon(ctx, { type: S.cur.type, stage: S.cur.stage, x: 0, y: 0, s: 1, t: clock, noShadow: true }); ctx.restore(); }
    else { btns.push({ x: 860, y: 540, r: 56, fn: offerEggs }); ctx.fillStyle = "#FF8A3D"; rr(ctx, 760, 500, 190, 80, 40); ctx.fill(); ctx.lineWidth = 4; ctx.strokeStyle = "#fff"; ctx.stroke(); ctx.save(); drawEgg(ctx, S.grown.length % 8, 800, 545, .38, 0, Math.sin(clock * 4) * .1); ctx.restore(); txt("Yeni", 880, 540, 28, "#fff"); if (islandT > 3) drawHand(890, 590); }
  }

  /* ---------- logo, menü ---------- */
  function drawLogo() { const c = $("logoCv"), x = c.getContext("2d"); x.clearRect(0, 0, 360, 200); drawEgg(x, 4, 70, 120, .7, 0, -.2); drawDragon(x, { type: 0, stage: 1, x: 200, y: 112, s: .9, t: 1.2, happy: true, noShadow: true }); drawEgg(x, 1, 300, 120, .7, 0, .2); }
  const muteBtn = $("mute");
  function setMute(m) { muted = m; muteBtn.setAttribute("aria-pressed", m ? "true" : "false"); muteBtn.setAttribute("aria-label", m ? "Sesi aç" : "Sesi kapat"); if (master) master.gain.value = m ? 0 : 1; if (m && canSpeak) speechSynthesis.cancel(); try { localStorage.setItem(SAVE + ":mute", m ? "1" : "0"); } catch (e) {} }
  setMute(muted); muteBtn.onclick = () => { audio(); setMute(!muted); };
  $("speak").onclick = () => { audio(); if (lastSay) say(lastSay); };
  function begin() {
    $("title").hidden = true; audio();
    if (!S) S = load();
    if (!S) { newGame(); return; }
    if (S.cur && S.cur.born) {
      const away = Math.min(600, (Date.now() - (S.t || Date.now())) / 1000); for (const n of NEEDS) S.cur.needs[n] = Math.max(10, S.cur.needs[n] - away * NEED_RATE[n] * .25);
      go("home"); const T = TYPES[S.cur.type]; needSay = 8; say(away > 60 ? T.name + " seni özlemiş! Tekrar hoş geldin!" : "Merhaba! " + T.name + " seni bekliyordu.");
    } else if (S.cur) { go("egg"); say("Yumurtaya dokun, çatlasın!", true); }
    else if (S.eggs) { scene = "pick"; say("Bir yumurta seç!"); }
    else { go("island"); say("Ejderha Adası! Yeni yumurta için düğmeye dokun."); }
  }
  $("play").onclick = begin;
  $("reset").onclick = () => { if (confirm("Bütün ejderhalar silinsin mi? Baştan başlanacak.")) { try { localStorage.removeItem(SAVE); } catch (e) {} S = null; $("reset").hidden = true; $("play").textContent = "▶ Yuvaya git"; } };
  { const s = load(); if (s) { $("reset").hidden = false; $("play").textContent = "▶ Devam et"; } }

  /* ---------- ölçek ve döngü ---------- */
  const stage = $("stage"), screen = $("screen");
  function fit() { const w = screen.clientWidth, h = screen.clientHeight; if (!w || !h) return; let sw = w, sh = w * H / W; if (sh > h) { sh = h; sw = h * W / H; } stage.style.width = Math.floor(sw) + "px"; stage.style.height = Math.floor(sh) + "px"; stage.style.setProperty("--fs", clamp(sw / 50, 12, 19).toFixed(1) + "px"); }
  addEventListener("resize", fit); if (window.ResizeObserver) new ResizeObserver(fit).observe(screen); fit();
  bgHome = renderHome(); bgIsland = renderIsland(); bgFood = renderFood();
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(drawLogo); drawLogo();
  let last = performance.now();
  function frame(t) { const dt = Math.min(.05, (t - last) / 1000); last = t; if (!fast) update(dt); draw(); requestAnimationFrame(frame); }
  requestAnimationFrame(frame);
  setInterval(save, 15000);

  window.__ey = { get S() { return S; }, set S(v) { S = v; }, get scene() { return scene; }, update, tap, move, setFast(v) { fast = v; }, begin, go, fd, bt, pl, sl, startFood, startBath, startPlay, startSleep, addHearts, TYPES, get btns() { return btns; }, draw, offerEggs };
})();
