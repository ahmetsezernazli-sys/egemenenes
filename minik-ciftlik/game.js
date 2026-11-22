/* Minik Çiftlik — Egemen için sesli çiftlik oyunu */
(function () {
  "use strict";
  const W = 960, H = 600, GY = 330;
  const $ = (id) => document.getElementById(id);
  const cv = $("cv"), ctx = cv.getContext("2d");
  const SAVE = "minik-ciftlik";
  const rnd = (a, b) => a + Math.random() * (b - a);
  const ri = (a, b) => Math.floor(rnd(a, b + 1));
  const pick = (a) => a[Math.floor(Math.random() * a.length)];
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const OL = "#3A2A1A";

  /* ---------- veriler ---------- */
  const CROPS = {
    havuc: { name: "havuç", cost: 0, stage: 6, price: 2, yield: 2 },
    domates: { name: "domates", cost: 25, stage: 8, price: 3, yield: 2 },
    misir: { name: "mısır", cost: 50, stage: 10, price: 4, yield: 2 },
    cilek: { name: "çilek", cost: 80, stage: 12, price: 5, yield: 3 },
    kabak: { name: "kabak", cost: 120, stage: 15, price: 9, yield: 1 }
  };
  const ANIM = {
    tavuk: { name: "tavuk", prod: "yumurta", time: 14, cost: 30, home: "pen" },
    inek: { name: "inek", prod: "sut", time: 22, cost: 70, home: "field" },
    koyun: { name: "koyun", prod: "yun", time: 26, cost: 110, home: "field" }
  };
  const ITEMS = { havuc: "havuç", domates: "domates", misir: "mısır", cilek: "çilek", kabak: "kabak", yumurta: "yumurta", sut: "süt", yun: "yün" };
  const PRICE = { havuc: 2, domates: 3, misir: 4, cilek: 5, kabak: 9, yumurta: 3, sut: 6, yun: 8 };
  const DECOR = {
    cicek: { name: "Çiçek bahçesi", cost: 15 }, kulube: { name: "Köpek kulübesi", cost: 20 },
    korkuluk: { name: "Korkuluk", cost: 25 }, degirmen: { name: "Yel değirmeni", cost: 60 }, kuyu: { name: "Su kuyusu", cost: 40 }
  };
  const PLOT_STARS = [0, 0, 0, 3, 6, 10];
  const PLOTS = []; for (let r = 0; r < 2; r++) for (let c = 0; c < 3; c++) PLOTS.push({ x: 292 + c * 122, y: 372 + r * 104, w: 108, h: 80 });
  const PEN = { x: 26, y: 360, w: 236, h: 200 }, FIELD = { x: 682, y: 372, w: 256, h: 196 }, STALL = { x: 744, y: 150, w: 196, h: 180 };
  const CUSTOMERS = ["ayi", "tavsan", "kirpi", "ordek", "kedi"];
  const CNAME = { ayi: "Ayı Amca", tavsan: "Tavşan Teyze", kirpi: "Kirpi Kardeş", ordek: "Ördek Hanım", kedi: "Kedi Pati" };

  /* ---------- durum ---------- */
  let S = null;
  function fresh() {
    return { coins: 5, stars: 0, inv: {}, crops: ["havuc"], decor: [], plots: PLOTS.map(() => ({ crop: null, stage: 0, t: 0, need: false })),
      animals: [mkAnimal("tavuk"), mkAnimal("tavuk")], order: { who: "ayi", items: { havuc: 1, yumurta: 1 } }, tut: 0, served: 0, savedAt: Date.now() };
  }
  function mkAnimal(kind) { const h = ANIM[kind].home === "pen" ? PEN : FIELD; return { kind, x: h.x + rnd(40, h.w - 40), y: h.y + rnd(50, h.h - 20), fed: false, t: 0, prod: false, dir: 1, tx: 0, ty: 0, wt: 0 }; }
  function save() { if (!S) return; S.savedAt = Date.now(); try { localStorage.setItem(SAVE, JSON.stringify(S)); } catch (e) {} }
  function load() { try { const s = JSON.parse(localStorage.getItem(SAVE) || "null"); if (s && s.plots) return s; } catch (e) {} return null; }

  /* ---------- ses ---------- */
  let ac = null, master = null, mus = null, muted = false;
  try { muted = localStorage.getItem(SAVE + ":mute") === "1"; } catch (e) {}
  function audio() { if (!ac) { const C = window.AudioContext || window.webkitAudioContext; if (!C) return; ac = new C(); master = ac.createGain(); master.gain.value = muted ? 0 : 1; master.connect(ac.destination); mus = ac.createGain(); mus.gain.value = .35; mus.connect(master); } if (ac.state === "suspended") ac.resume(); }
  function tone(f, d, type, vol, when, slide, dest) { if (!ac || muted) return; const t = when || ac.currentTime, o = ac.createOscillator(), g = ac.createGain(); o.type = type || "triangle"; o.frequency.setValueAtTime(f, t); if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(30, slide), t + d); g.gain.setValueAtTime(.0001, t); g.gain.linearRampToValueAtTime(vol || .1, t + .015); g.gain.exponentialRampToValueAtTime(.0008, t + d); o.connect(g); g.connect(dest || master); o.start(t); o.stop(t + d + .02); }
  let nb = null;
  function noise(d, vol, freq, q) { if (!ac || muted) return; if (!nb) { nb = ac.createBuffer(1, ac.sampleRate, ac.sampleRate); const c = nb.getChannelData(0); for (let i = 0; i < c.length; i++) c[i] = Math.random() * 2 - 1; } const s = ac.createBufferSource(), f = ac.createBiquadFilter(), g = ac.createGain(), t = ac.currentTime; s.buffer = nb; f.type = "bandpass"; f.frequency.value = freq || 1500; f.Q.value = q || 1; g.gain.setValueAtTime(vol || .1, t); g.gain.exponentialRampToValueAtTime(.001, t + d); s.connect(f); f.connect(g); g.connect(master); s.start(t); s.stop(t + d); }
  const now = () => ac ? ac.currentTime : 0;
  const sfx = {
    pop() { tone(500, .1, "sine", .12, 0, 1100); },
    plant() { noise(.15, .12, 400); tone(300, .12, "sine", .08, 0, 500); },
    water() { noise(.6, .1, 2500, 3); const t = now(); for (let i = 0; i < 5; i++) tone(1200 + Math.random() * 800, .05, "sine", .04, t + i * .1); },
    harvest() { const t = now(); [523, 659, 784].forEach((f, i) => tone(f, .14, "triangle", .1, t + i * .06)); },
    coin() { const t = now(); tone(988, .07, "square", .04, t); tone(1319, .18, "square", .04, t + .07); },
    star() { const t = now(); [523, 659, 784, 1047, 1319].forEach((f, i) => tone(f, .3, "triangle", .1, t + i * .09)); },
    cluck() { const t = now(); for (let i = 0; i < 3; i++) tone(700 + i * 60, .06, "square", .04, t + i * .09, 500); },
    moo() { tone(180, .9, "sawtooth", .07, 0, 120); tone(182, .9, "triangle", .08, 0, 125); },
    baa() { const t = now(); for (let i = 0; i < 6; i++) tone(420 + (i % 2) * 20, .08, "sawtooth", .05, t + i * .07); },
    woof() { tone(320, .12, "square", .07, 0, 180); setTimeout(() => tone(300, .14, "square", .07, 0, 160), 160); },
    no() { tone(220, .2, "triangle", .1, 0, 160); },
    buy() { const t = now(); [784, 988, 1175, 1568].forEach((f, i) => tone(f, .15, "square", .04, t + i * .06)); },
    munch() { for (let i = 0; i < 3; i++) setTimeout(() => noise(.06, .1, 900), i * 120); }
  };
  const mf = (m) => 440 * Math.pow(2, (m - 69) / 12);
  const SONG = { bpm: 96, lead: [67, 0, 72, 0, 74, 76, 74, 72, 69, 0, 72, 0, 74, 0, 0, 0, 67, 0, 72, 0, 76, 79, 76, 74, 72, 0, 69, 0, 72, 0, 0, 0], bass: [48, 0, 55, 0, 53, 0, 55, 0, 50, 0, 57, 0, 55, 0, 43, 0, 48, 0, 55, 0, 52, 0, 57, 0, 53, 0, 55, 0, 48, 0, 43, 0] };
  let mStep = 0, mNext = 0, mOn = false;
  setInterval(() => {
    if (!ac || muted || !mOn) { if (ac) mNext = Math.max(mNext, ac.currentTime); return; }
    const d = 60 / SONG.bpm / 2; if (mNext < ac.currentTime) mNext = ac.currentTime + .05;
    while (mNext < ac.currentTime + .3) { const i = mStep % 32; if (SONG.lead[i]) { tone(mf(SONG.lead[i]), d * 1.8, "sine", .05, mNext, 0, mus); tone(mf(SONG.lead[i] + 12), d * .5, "triangle", .01, mNext, 0, mus); } if (SONG.bass[i]) tone(mf(SONG.bass[i]), d * 1.2, "triangle", .07, mNext, 0, mus); mStep++; mNext += d; }
  }, 90);
  // konuşma
  const canSpeak = "speechSynthesis" in window; let trVoice = null, lastSay = "";
  function pickVoice() { trVoice = speechSynthesis.getVoices().find((v) => /^tr(-|_|$)/i.test(v.lang)) || null; }
  if (canSpeak) { pickVoice(); if (speechSynthesis.addEventListener) speechSynthesis.addEventListener("voiceschanged", pickVoice); }
  function say(text, show) {
    lastSay = text; if (show !== false) { $("tip").textContent = text; clearTimeout(say.t); say.t = setTimeout(() => { if ($("tip").textContent === text && S && S.tut >= 99) $("tip").textContent = ""; }, 6000); }
    if (!canSpeak || muted || !trVoice) return; speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text); u.voice = trVoice; u.lang = trVoice.lang; u.rate = .92; u.pitch = 1.15; speechSynthesis.speak(u);
  }
  document.addEventListener("visibilitychange", () => { if (document.hidden) { if (canSpeak) speechSynthesis.cancel(); save(); } });

  /* ---------- çizim yardımcıları ---------- */
  function circle(c, x, y, r, fill, lw) { c.beginPath(); c.arc(x, y, r, 0, Math.PI * 2); if (fill) { c.fillStyle = fill; c.fill(); } if (lw) { c.strokeStyle = OL; c.lineWidth = lw; c.stroke(); } }
  function ell(c, x, y, rx, ry, rot, fill, lw) { c.beginPath(); c.ellipse(x, y, Math.max(.1, rx), Math.max(.1, ry), rot || 0, 0, Math.PI * 2); if (fill) { c.fillStyle = fill; c.fill(); } if (lw) { c.strokeStyle = OL; c.lineWidth = lw; c.stroke(); } }
  function rr(c, x, y, w, h, r) { c.beginPath(); c.moveTo(x + r, y); c.arcTo(x + w, y, x + w, y + h, r); c.arcTo(x + w, y + h, x, y + h, r); c.arcTo(x, y + h, x, y, r); c.arcTo(x, y, x + w, y, r); c.closePath(); }
  const hash = (a, b) => { let h = (a * 374761393 + b * 668265263) | 0; h = (h ^ (h >>> 13)) * 1274126177; return ((h ^ (h >>> 16)) >>> 0) / 4294967295; };
  function shadow(c, x, y, rx, ry) { c.globalAlpha = .22; ell(c, x, y, rx, ry, 0, "#000"); c.globalAlpha = 1; }
  function starP(c, x, y, R, r) { c.beginPath(); for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5, q = i % 2 ? r : R; c.lineTo(x + Math.cos(a) * q, y + Math.sin(a) * q); } c.closePath(); }
  function star(c, x, y, R) { starP(c, x, y + R * .1, R, R * .45); c.fillStyle = "#B07A10"; c.fill(); starP(c, x, y, R, R * .45); c.fillStyle = "#FFD23F"; c.fill(); c.strokeStyle = OL; c.lineWidth = Math.max(1.5, R * .1); c.stroke(); }
  function coin(c, x, y, r) { circle(c, x, y + r * .12, r, "#B07A10"); circle(c, x, y, r, "#FFD23F", Math.max(1.5, r * .12)); c.strokeStyle = "#D89A10"; c.lineWidth = r * .14; c.beginPath(); c.arc(x, y, r * .6, 0, Math.PI * 2); c.stroke(); ell(c, x - r * .3, y - r * .35, r * .2, r * .12, -.6, "#FFF3B0"); }

  // ürün simgeleri (s ≈ yarıçap)
  function icon(c, id, x, y, s) {
    c.save(); c.translate(x, y); c.lineJoin = "round"; const lw = Math.max(1.5, s * .09);
    if (id === "havuc") { c.rotate(.5); c.beginPath(); c.moveTo(-s * .38, -s * .5); c.quadraticCurveTo(0, -s * .7, s * .38, -s * .5); c.lineTo(0, s * .95); c.closePath(); c.fillStyle = "#FF8A2E"; c.fill(); c.strokeStyle = OL; c.lineWidth = lw; c.stroke(); c.strokeStyle = "#D8661A"; c.lineWidth = lw * .8; for (const k of [-.1, .2, .45]) { c.beginPath(); c.moveTo(-s * .2, s * k); c.lineTo(s * .05, s * k + s * .05); c.stroke(); } for (const a of [-.5, 0, .5]) { c.save(); c.translate(0, -s * .55); c.rotate(a); ell(c, 0, -s * .3, s * .13, s * .32, 0, "#3FA34D", lw * .8); c.restore(); } }
    else if (id === "domates") { circle(c, 0, s * .1, s * .78, "#E8463F", lw); ell(c, -s * .3, -s * .1, s * .18, s * .12, -.6, "rgba(255,255,255,.55)"); c.fillStyle = "#3FA34D"; starP(c, 0, -s * .58, s * .38, s * .14); c.fill(); c.strokeStyle = OL; c.lineWidth = lw * .7; c.stroke(); }
    else if (id === "misir") { c.rotate(-.3); ell(c, 0, 0, s * .4, s * .85, 0, "#FFD23F", lw); c.fillStyle = "#E8B020"; for (let i = -3; i <= 3; i++) for (let j = -1; j <= 1; j++) circle(c, j * s * .18, i * s * .2, s * .07, "#F2B530"); c.beginPath(); c.moveTo(-s * .1, s * .9); c.quadraticCurveTo(-s * .7, s * .2, -s * .35, -s * .5); c.quadraticCurveTo(-s * .35, s * .3, 0, s * .9); c.fillStyle = "#5DB34A"; c.fill(); c.strokeStyle = OL; c.lineWidth = lw * .8; c.stroke(); c.beginPath(); c.moveTo(s * .1, s * .9); c.quadraticCurveTo(s * .7, s * .2, s * .35, -s * .5); c.quadraticCurveTo(s * .35, s * .3, 0, s * .9); c.fill(); c.stroke(); }
    else if (id === "cilek") { c.beginPath(); c.moveTo(0, s * .9); c.bezierCurveTo(-s * .9, s * .2, -s * .7, -s * .55, 0, -s * .45); c.bezierCurveTo(s * .7, -s * .55, s * .9, s * .2, 0, s * .9); c.fillStyle = "#E8304A"; c.fill(); c.strokeStyle = OL; c.lineWidth = lw; c.stroke(); for (let i = 0; i < 8; i++) ell(c, (hash(i, 1) - .5) * s * .9, -s * .15 + hash(i, 2) * s * .7, s * .04, s * .07, 0, "#FFE680"); c.fillStyle = "#3FA34D"; starP(c, 0, -s * .5, s * .38, s * .15); c.fill(); }
    else if (id === "kabak") { for (const [dx, w, col] of [[-s * .45, s * .42, "#E8742A"], [s * .45, s * .42, "#E8742A"], [0, s * .5, "#FF8A2E"]]) ell(c, dx, s * .1, w, s * .7, 0, col, lw); c.fillStyle = "#6E8A2A"; c.fillRect(-s * .08, -s * .78, s * .16, s * .3); c.strokeStyle = OL; c.lineWidth = lw * .7; c.strokeRect(-s * .08, -s * .78, s * .16, s * .3); ell(c, s * .25, -s * .7, s * .2, s * .1, .4, "#3FA34D"); }
    else if (id === "yumurta") { ell(c, 0, s * .08, s * .6, s * .8, 0, "#FFF6E0", lw); ell(c, -s * .2, -s * .25, s * .14, s * .22, -.3, "#fff"); }
    else if (id === "sut") { c.beginPath(); c.moveTo(-s * .5, -s * .3); c.lineTo(s * .5, -s * .3); c.lineTo(s * .55, s * .85); c.lineTo(-s * .55, s * .85); c.closePath(); c.fillStyle = "#F4F7FA"; c.fill(); c.strokeStyle = OL; c.lineWidth = lw; c.stroke(); c.fillStyle = "#4D8DF0"; c.fillRect(-s * .52, s * .1, s * 1.04, s * .3); c.beginPath(); c.moveTo(-s * .3, -s * .3); c.lineTo(-s * .3, -s * .7); c.lineTo(s * .3, -s * .7); c.lineTo(s * .3, -s * .3); c.fillStyle = "#F4F7FA"; c.fill(); c.stroke(); c.fillStyle = "#E8463F"; c.fillRect(-s * .32, -s * .85, s * .64, s * .18); c.strokeRect(-s * .32, -s * .85, s * .64, s * .18); }
    else if (id === "yun") { for (const [dx, dy, r] of [[-.35, .1, .42], [.35, .1, .42], [0, -.25, .45], [0, .3, .42]]) circle(c, dx * s, dy * s, r * s, "#F7F3FA", lw); for (const [dx, dy, r] of [[-.35, .1, .42], [.35, .1, .42], [0, -.25, .45], [0, .3, .42]]) circle(c, dx * s, dy * s, r * s - lw, "#F7F3FA"); c.strokeStyle = "#C8C0D8"; c.lineWidth = lw * .7; c.beginPath(); c.arc(0, 0, s * .25, 0, 4); c.stroke(); }
    else if (id === "tohum") { ell(c, 0, s * .4, s * .7, s * .3, 0, "#8A5A2B", lw); ell(c, -s * .15, s * .25, s * .1, s * .14, .3, "#E8C677"); ell(c, s * .2, s * .3, s * .1, s * .14, -.3, "#E8C677"); }
    else if (id === "yem") { c.beginPath(); c.moveTo(-s * .6, -s * .3); c.lineTo(s * .6, -s * .3); c.lineTo(s * .5, s * .8); c.lineTo(-s * .5, s * .8); c.closePath(); c.fillStyle = "#D8B070"; c.fill(); c.strokeStyle = OL; c.lineWidth = lw; c.stroke(); for (let i = 0; i < 9; i++) ell(c, (hash(i, 3) - .5) * s, -s * .35 - hash(i, 4) * s * .25, s * .08, s * .12, i, "#F2C14E"); }
    else if (id === "su") { c.beginPath(); c.moveTo(0, -s * .9); c.bezierCurveTo(s * .7, -s * .1, s * .6, s * .8, 0, s * .8); c.bezierCurveTo(-s * .6, s * .8, -s * .7, -s * .1, 0, -s * .9); c.fillStyle = "#4DA3FF"; c.fill(); c.strokeStyle = OL; c.lineWidth = lw; c.stroke(); ell(c, -s * .2, s * .1, s * .12, s * .22, -.3, "rgba(255,255,255,.7)"); }
    c.restore();
  }

  /* ---------- hayvanlar ---------- */
  function chicken(c, x, y, t, dir, happy) {
    const b = Math.abs(Math.sin(t * 8)) * 2;
    c.save(); c.translate(x, y); c.scale(dir, 1);
    shadow(c, 0, 2, 22, 6);
    c.strokeStyle = "#E89A20"; c.lineWidth = 3; c.beginPath(); c.moveTo(-6, -10); c.lineTo(-7, 0); c.moveTo(6, -10); c.lineTo(7, 0); c.stroke();
    ell(c, 0, -22 - b, 22, 17, 0, "#FFFBEE", 2.5); ell(c, -14, -28 - b, 9, 6, -.6, "#F0E8D0");
    ell(c, -2, -20 - b, 10, 7, .2, "#EDE3C8", 1.5);
    circle(c, 14, -38 - b, 11, "#FFFBEE", 2.5);
    c.fillStyle = "#E8463F"; for (let i = 0; i < 3; i++) circle(c, 9 + i * 5, -50 - b - (i === 1 ? 2 : 0), 4);
    c.beginPath(); c.moveTo(24, -40 - b); c.lineTo(32, -36 - b); c.lineTo(24, -33 - b); c.closePath(); c.fillStyle = "#FFB020"; c.fill(); c.strokeStyle = OL; c.lineWidth = 1.5; c.stroke();
    ell(c, 21, -30 - b, 3, 4, 0, "#E8463F");
    if (happy) { c.strokeStyle = OL; c.lineWidth = 2; c.beginPath(); c.arc(16, -40 - b, 2.5, Math.PI, 0); c.stroke(); } else circle(c, 16, -40 - b, 2.2, OL);
    c.restore();
  }
  function cow(c, x, y, t, dir, happy) {
    const b = Math.abs(Math.sin(t * 5)) * 1.5;
    c.save(); c.translate(x, y); c.scale(dir, 1);
    shadow(c, 0, 2, 44, 9);
    c.fillStyle = "#F4F0EA"; for (const lx of [-28, -14, 16, 28]) { c.fillRect(lx - 4, -22, 9, 22); c.strokeStyle = OL; c.lineWidth = 2; c.strokeRect(lx - 4, -22, 9, 22); c.fillStyle = "#5A4A3A"; c.fillRect(lx - 4, -5, 9, 5); c.fillStyle = "#F4F0EA"; }
    rr(c, -42, -58 - b, 80, 42, 18); c.fillStyle = "#F4F0EA"; c.fill(); c.strokeStyle = OL; c.lineWidth = 2.5; c.stroke();
    c.save(); rr(c, -42, -58 - b, 80, 42, 18); c.clip(); ell(c, -18, -50 - b, 14, 10, .3, "#3A2E2A"); ell(c, 14, -30 - b, 12, 9, -.2, "#3A2E2A"); ell(c, 30, -52 - b, 8, 6, 0, "#3A2E2A"); c.restore();
    ell(c, 2, -18 - b, 9, 5, 0, "#FFB3C8", 1.5);
    c.strokeStyle = OL; c.lineWidth = 2; c.beginPath(); c.moveTo(-42, -50 - b); c.quadraticCurveTo(-54, -44, -50, -28); c.stroke(); circle(c, -50, -27, 4, "#3A2E2A");
    c.save(); c.translate(44, -62 - b + Math.sin(t * 2) * 1.5);
    ell(c, -12, -14, 8, 4, -.5, "#F4F0EA", 2); ell(c, 14, -14, 8, 4, .5, "#F4F0EA", 2);
    c.fillStyle = "#E8D7A0"; c.beginPath(); c.moveTo(-7, -16); c.lineTo(-10, -26); c.lineTo(-3, -18); c.fill(); c.beginPath(); c.moveTo(7, -16); c.lineTo(10, -26); c.lineTo(3, -18); c.fill();
    rr(c, -14, -18, 28, 32, 12); c.fillStyle = "#F4F0EA"; c.fill(); c.strokeStyle = OL; c.lineWidth = 2.5; c.stroke();
    ell(c, 0, 8, 15, 9, 0, "#FFB3C8", 2); circle(c, -5, 8, 2, "#B06070"); circle(c, 5, 8, 2, "#B06070");
    if (happy) { c.lineWidth = 2; c.beginPath(); c.arc(-6, -4, 3, Math.PI, 0); c.arc(6, -4, 3, Math.PI, 0); c.stroke(); } else { circle(c, -6, -4, 2.6, OL); circle(c, 6, -4, 2.6, OL); }
    c.restore(); c.restore();
  }
  function sheep(c, x, y, t, dir, happy, shorn) {
    const b = Math.abs(Math.sin(t * 6)) * 1.5;
    c.save(); c.translate(x, y); c.scale(dir, 1);
    shadow(c, 0, 2, 34, 8);
    c.fillStyle = "#3A2E3A"; for (const lx of [-18, -6, 8, 20]) c.fillRect(lx - 3, -18, 6, 18);
    const puff = shorn ? .75 : 1;
    for (let i = 0; i < 9; i++) { const a = i / 9 * Math.PI * 2; circle(c, Math.cos(a) * 26 * puff, -34 - b + Math.sin(a) * 15 * puff, 12 * puff, "#F7F3FA", 2.2); }
    ell(c, 0, -34 - b, 28 * puff, 17 * puff, 0, "#F7F3FA");
    for (let i = 0; i < 5; i++) circle(c, -14 + i * 7, -42 - b + (i % 2) * 8, 4, "#ECE6F2");
    c.save(); c.translate(30, -42 - b); ell(c, 0, 0, 11, 13, .2, "#3A2E3A", 2); ell(c, -9, -4, 7, 3.5, -.4, "#3A2E3A"); circle(c, 0, -12, 7, "#F7F3FA", 1.5);
    if (happy) { c.strokeStyle = "#fff"; c.lineWidth = 2; c.beginPath(); c.arc(4, -1, 2.5, Math.PI, 0); c.stroke(); } else circle(c, 4, -2, 2.5, "#fff"); circle(c, 4.6, -2.2, 1.2, OL);
    c.restore(); c.restore();
  }
  function dog(c, x, y, t, dir, run) {
    const b = run ? Math.abs(Math.sin(t * 14)) * 3 : Math.abs(Math.sin(t * 3)) * 1;
    c.save(); c.translate(x, y); c.scale(dir, 1);
    shadow(c, 0, 2, 22, 6);
    c.strokeStyle = "#B07A40"; c.lineWidth = 5; c.lineCap = "round"; c.beginPath(); c.moveTo(-16, -22 - b); c.quadraticCurveTo(-26, -32 - b, -24 + Math.sin(t * 12) * 4, -40 - b); c.stroke();
    c.fillStyle = "#C98A4A"; for (const lx of [-12, -4, 8, 14]) { c.fillRect(lx - 3, -14, 6, 14); }
    ell(c, 0, -20 - b, 20, 11, 0, "#D99A5A", 2.2); ell(c, -2, -16 - b, 10, 6, 0, "#F2D8B0");
    c.save(); c.translate(18, -32 - b); circle(c, 0, 0, 11, "#D99A5A", 2.2); ell(c, -7, 2, 5, 10, .3, "#8A5A2B", 1.8); ell(c, 9, 4, 7, 5, 0, "#F2D8B0", 1.5); circle(c, 14, 2, 2.6, OL); circle(c, 3, -3, 2.2, OL); c.fillStyle = "#E8463F"; if (run) { ell(c, 10, 9, 3, 4, 0, "#FF7AA2"); } c.restore();
    c.fillStyle = "#E8463F"; c.fillRect(10, -26 - b, 12, 3);
    c.restore();
  }
  function customer(c, kind, x, y, t, happy) {
    const b = Math.abs(Math.sin(t * 3)) * 1.5;
    c.save(); c.translate(x, y - b);
    shadow(c, 0, b + 2, 26, 7);
    const col = { ayi: "#9A6234", tavsan: "#F7F3FA", kirpi: "#B08A60", ordek: "#FFFBEE", kedi: "#F29A38" }[kind];
    rr(c, -20, -56, 40, 54, 18); c.fillStyle = col; c.fill(); c.strokeStyle = OL; c.lineWidth = 2.5; c.stroke();
    ell(c, 0, -26, 12, 16, 0, kind === "ordek" ? "#FFE9A0" : "rgba(255,255,255,.45)");
    c.fillStyle = "#FF9A2E"; rr(c, -14, -36, 28, 22, 6); c.fill(); c.stroke(); // önlük
    const hy = -76;
    if (kind === "ayi") { for (const s of [-1, 1]) { circle(c, s * 16, hy - 16, 8, col, 2.2); circle(c, s * 16, hy - 16, 4, "#D9A877"); } }
    if (kind === "tavsan") { for (const s of [-1, 1]) { ell(c, s * 9, hy - 30, 6, 18, s * .15, col, 2.2); ell(c, s * 9, hy - 28, 3, 12, s * .15, "#FFB3C8"); } }
    if (kind === "kedi") { for (const s of [-1, 1]) { c.beginPath(); c.moveTo(s * 20, hy - 6); c.lineTo(s * 16, hy - 26); c.lineTo(s * 5, hy - 19); c.closePath(); c.fillStyle = col; c.fill(); c.stroke(); } }
    if (kind === "kirpi") { for (let i = 0; i < 9; i++) { const a = Math.PI + i / 8 * Math.PI; c.beginPath(); c.moveTo(Math.cos(a) * 16, hy + Math.sin(a) * 16); c.lineTo(Math.cos(a) * 30, hy + Math.sin(a) * 28); c.lineTo(Math.cos(a + .25) * 16, hy + Math.sin(a + .25) * 16); c.fillStyle = "#6E4A26"; c.fill(); c.stroke(); } }
    circle(c, 0, hy, 22, kind === "kirpi" ? "#E8C8A0" : col, 2.5);
    if (kind === "ordek") { ell(c, 14, hy + 6, 14, 6, 0, "#FF9A2E", 2); }
    else { ell(c, 0, hy + 8, 9, 6, 0, kind === "ayi" ? "#E2B98A" : "#fff"); circle(c, 0, hy + 5, 3.5, OL); }
    c.strokeStyle = OL; c.lineWidth = 2;
    if (happy) { c.beginPath(); c.arc(-8, hy - 4, 3.5, Math.PI, 0); c.arc(8, hy - 4, 3.5, Math.PI, 0); c.stroke(); c.beginPath(); c.arc(0, hy + 8, 6, .1 * Math.PI, .9 * Math.PI); c.stroke(); }
    else { circle(c, -8, hy - 3, 3, OL); circle(c, 8, hy - 3, 3, OL); }
    c.globalAlpha = .4; ell(c, -14, hy + 6, 4, 2.5, 0, "#FF7AA2"); ell(c, 14, hy + 6, 4, 2.5, 0, "#FF7AA2"); c.globalAlpha = 1;
    c.restore();
  }

  /* ---------- bitkiler ---------- */
  function plant(c, crop, stage, x, y, t) {
    const sw = Math.sin(t * 2 + x) * .05;
    c.save(); c.translate(x, y);
    if (stage === 0) { ell(c, 0, -2, 12, 5, 0, "#6E4A26"); for (let i = 0; i < 3; i++) ell(c, -5 + i * 5, -4, 2, 3, 0, "#E8C677"); c.restore(); return; }
    c.rotate(sw);
    const leaf = (lx, ly, l, a, col) => { c.save(); c.translate(lx, ly); c.rotate(a); ell(c, 0, -l / 2, l * .28, l / 2, 0, col || "#4FA845", 1.6); c.strokeStyle = "rgba(0,0,0,.2)"; c.lineWidth = 1; c.beginPath(); c.moveTo(0, 0); c.lineTo(0, -l * .8); c.stroke(); c.restore(); };
    if (stage === 1) { leaf(0, 0, 14, -.5); leaf(0, 0, 14, .5); c.restore(); return; }
    const big = stage === 3;
    if (crop === "havuc") { for (const a of [-.6, -.2, .2, .6]) leaf(0, 0, big ? 30 : 22, a, "#3FA34D"); if (big) { c.beginPath(); c.moveTo(-9, -2); c.quadraticCurveTo(0, -8, 9, -2); c.lineTo(5, 8); c.lineTo(-5, 8); c.closePath(); c.fillStyle = "#FF8A2E"; c.fill(); c.strokeStyle = OL; c.lineWidth = 2; c.stroke(); } }
    else if (crop === "domates") { c.strokeStyle = "#3E8E44"; c.lineWidth = 3; c.beginPath(); c.moveTo(0, 0); c.lineTo(0, big ? -50 : -34); c.stroke(); for (let i = 0; i < (big ? 4 : 3); i++) leaf(0, -10 - i * 11, 16, i % 2 ? .9 : -.9); c.fillStyle = "#8A5A2B"; c.fillRect(8, -54, 3, 54); if (big) for (const [dx, dy] of [[-10, -22], [9, -34], [-7, -42], [10, -14]]) { circle(c, dx, dy, 7, "#E8463F", 1.8); circle(c, dx - 2, dy - 2, 2, "rgba(255,255,255,.6)"); } }
    else if (crop === "misir") { const hh = big ? 66 : 44; c.strokeStyle = "#5DB34A"; c.lineWidth = 5; c.beginPath(); c.moveTo(0, 0); c.lineTo(0, -hh); c.stroke(); c.strokeStyle = OL; c.lineWidth = 1.2; for (let i = 0; i < 4; i++) leaf(0, -10 - i * 13, 26, i % 2 ? 1.1 : -1.1, "#5DB34A"); if (big) { c.save(); c.translate(6, -36); c.rotate(.35); ell(c, 0, 0, 6, 13, 0, "#FFD23F", 1.8); c.restore(); c.fillStyle = "#E8C677"; c.beginPath(); c.moveTo(-3, -hh); c.lineTo(0, -hh - 10); c.lineTo(3, -hh); c.fill(); } }
    else if (crop === "cilek") { for (const a of [-1.1, -.5, .1, .7, 1.2]) leaf(0, 0, big ? 20 : 16, a, "#3FA34D"); if (big) for (const [dx, dy] of [[-12, -6], [11, -8], [0, -16], [-3, 2]]) { c.beginPath(); c.moveTo(dx, dy + 6); c.bezierCurveTo(dx - 7, dy, dx - 5, dy - 6, dx, dy - 5); c.bezierCurveTo(dx + 5, dy - 6, dx + 7, dy, dx, dy + 6); c.fillStyle = "#E8304A"; c.fill(); c.strokeStyle = OL; c.lineWidth = 1.5; c.stroke(); } }
    else if (crop === "kabak") { c.strokeStyle = "#3E8E44"; c.lineWidth = 3; c.beginPath(); c.moveTo(-30, -2); c.quadraticCurveTo(0, -14, 30, -2); c.stroke(); for (const lx of [-22, -6, 14, 26]) leaf(lx, -6, 16, lx < 0 ? -.4 : .4); if (big) { c.restore(); c.save(); c.translate(x, y); icon(c, "kabak", 2, -10, 20); } }
    c.restore();
  }

  /* ---------- sahne ---------- */
  let bgCv = null;
  function renderBg() {
    const c = document.createElement("canvas"); c.width = W; c.height = H; const x = c.getContext("2d");
    // tepeler
    x.fillStyle = "#9FDC80"; x.beginPath(); x.moveTo(0, GY); for (let i = 0; i <= W; i += 10) x.lineTo(i, GY - 60 - Math.sin(i / 160 + 1) * 40 - Math.sin(i / 60) * 8); x.lineTo(W, GY); x.fill();
    x.fillStyle = "#86C873"; x.beginPath(); x.moveTo(0, GY); for (let i = 0; i <= W; i += 10) x.lineTo(i, GY - 28 - Math.sin(i / 110 + 3) * 22); x.lineTo(W, GY); x.fill();
    // çimen
    const g = x.createLinearGradient(0, GY, 0, H); g.addColorStop(0, "#6CC157"); g.addColorStop(1, "#4FA845"); x.fillStyle = g; x.fillRect(0, GY - 2, W, H - GY + 2);
    for (let i = 0; i < 500; i++) { const px = hash(i, 1) * W, py = GY + hash(i, 2) * (H - GY); x.fillStyle = i % 3 ? "rgba(40,110,40,.3)" : "rgba(200,240,150,.35)"; x.fillRect(px, py, 2, 5); }
    // patika
    x.fillStyle = "#E8D29A"; x.beginPath(); x.moveTo(262, H); x.quadraticCurveTo(270, 470, 286, 340); x.lineTo(300, 340); x.quadraticCurveTo(290, 470, 290, H); x.fill();
    x.beginPath(); x.moveTo(650, H); x.quadraticCurveTo(660, 450, 700, 340); x.lineTo(720, 340); x.quadraticCurveTo(684, 450, 676, H); x.fill();
    // ağaç
    x.save(); x.translate(600, GY + 2); shadow(x, 0, 0, 40, 9); x.fillStyle = "#8A5A2B"; x.fillRect(-10, -70, 20, 72); x.strokeStyle = OL; x.lineWidth = 2.5; x.strokeRect(-10, -70, 20, 72);
    for (const [dx, dy, r, col] of [[-30, -90, 34, "#3E8E44"], [28, -94, 36, "#3E8E44"], [0, -124, 40, "#4FA845"], [-10, -100, 30, "#5DB34A"], [18, -112, 24, "#6CC157"]]) circle(x, dx, dy, r, col);

    for (const [dx, dy] of [[-24, -100], [20, -120], [30, -86], [-8, -134]]) circle(x, dx, dy, 5, "#E8463F", 1.5);
    x.restore();
    // ahır
    x.save(); x.translate(30, 150);
    shadow(x, 105, 182, 110, 12);
    x.fillStyle = "#C8463F"; x.fillRect(0, 60, 210, 122); x.strokeStyle = OL; x.lineWidth = 3; x.strokeRect(0, 60, 210, 122);
    x.strokeStyle = "rgba(0,0,0,.18)"; x.lineWidth = 2; for (let i = 1; i < 10; i++) { x.beginPath(); x.moveTo(i * 21, 62); x.lineTo(i * 21, 180); x.stroke(); }
    x.beginPath(); x.moveTo(-12, 64); x.lineTo(105, -6); x.lineTo(222, 64); x.closePath(); x.fillStyle = "#7A3A2E"; x.fill(); x.strokeStyle = OL; x.lineWidth = 3; x.stroke();
    x.beginPath(); x.moveTo(-12, 64); x.lineTo(105, -6); x.lineTo(222, 64); x.strokeStyle = "#FFFBEE"; x.lineWidth = 6; x.stroke();
    x.fillStyle = "#FFFBEE"; x.fillRect(66, 100, 78, 82); x.fillStyle = "#8E2A26"; x.fillRect(72, 106, 66, 76); x.strokeStyle = "#FFFBEE"; x.lineWidth = 5; x.beginPath(); x.moveTo(72, 106); x.lineTo(138, 182); x.moveTo(138, 106); x.lineTo(72, 182); x.stroke();
    x.fillStyle = "#FFFBEE"; x.fillRect(88, 26, 34, 28); x.fillStyle = "#3A2A1A"; x.fillRect(92, 30, 26, 20); x.fillStyle = "#F2C14E"; for (let i = 0; i < 4; i++) x.fillRect(94 + i * 6, 40 - (i % 2) * 3, 5, 10);
    x.restore();
    // ağıl çiti (tavuklar)
    fence(x, PEN.x, PEN.y, PEN.w, PEN.h);
    // kümes
    x.save(); x.translate(PEN.x + 30, PEN.y + 46); x.fillStyle = "#E8C677"; x.fillRect(-26, -34, 52, 34); x.strokeStyle = OL; x.lineWidth = 2.5; x.strokeRect(-26, -34, 52, 34); x.beginPath(); x.moveTo(-32, -32); x.lineTo(0, -54); x.lineTo(32, -32); x.closePath(); x.fillStyle = "#B8463F"; x.fill(); x.stroke(); x.fillStyle = "#3A2A1A"; x.beginPath(); x.arc(0, -10, 9, Math.PI, 0); x.lineTo(9, 0); x.lineTo(-9, 0); x.fill(); x.restore();
    // otlak
    fence(x, FIELD.x, FIELD.y, FIELD.w, FIELD.h);
    // tezgâh
    x.save(); x.translate(STALL.x, STALL.y);
    shadow(x, 98, 180, 100, 10);
    x.fillStyle = "#B07A40"; x.fillRect(10, 40, 10, 140); x.fillRect(176, 40, 10, 140);
    x.fillStyle = "#C98A4A"; x.fillRect(0, 118, 196, 62); x.strokeStyle = OL; x.lineWidth = 3; x.strokeRect(0, 118, 196, 62);
    for (let i = 1; i < 4; i++) { x.strokeStyle = "rgba(0,0,0,.2)"; x.lineWidth = 2; x.beginPath(); x.moveTo(0, 118 + i * 15); x.lineTo(196, 118 + i * 15); x.stroke(); }
    for (let i = 0; i < 7; i++) { x.fillStyle = i % 2 ? "#FFFBEE" : "#E8463F"; x.beginPath(); x.moveTo(-8 + i * 30, 10); x.lineTo(22 + i * 30, 10); x.lineTo(22 + i * 30, 44); x.quadraticCurveTo(7 + i * 30, 56, -8 + i * 30, 44); x.closePath(); x.fill(); }
    x.strokeStyle = OL; x.lineWidth = 3; x.strokeRect(-8, 10, 212, 34);
    x.fillStyle = "#FFFBEE"; rr(x, 40, -20, 116, 30, 10); x.fill(); x.stroke(); x.fillStyle = "#C8463F"; x.font = "700 20px Fredoka, sans-serif"; x.textAlign = "center"; x.textBaseline = "middle"; x.fillText("PAZAR", 98, -5);
    x.restore();
    return c;
  }
  function fence(x, fx, fy, fw, fh) {
    x.strokeStyle = OL; x.lineWidth = 2;
    const post = (px, py) => { x.fillStyle = "#E8D7B0"; x.fillRect(px - 4, py - 26, 8, 28); x.strokeRect(px - 4, py - 26, 8, 28); };
    x.fillStyle = "#F2E3C0";
    // arka
    x.fillRect(fx, fy - 20, fw, 5); x.fillRect(fx, fy - 10, fw, 5); x.strokeRect(fx, fy - 20, fw, 5); x.strokeRect(fx, fy - 10, fw, 5);
    for (let i = 0; i <= fw; i += 36) post(fx + i, fy);
  }
  function fenceFront(x, fx, fy, fw, fh) {
    x.strokeStyle = OL; x.lineWidth = 2; x.fillStyle = "#F2E3C0";
    x.fillRect(fx, fy + fh - 20, fw, 5); x.fillRect(fx, fy + fh - 10, fw, 5); x.strokeRect(fx, fy + fh - 20, fw, 5); x.strokeRect(fx, fy + fh - 10, fw, 5);
    for (const sx of [fx, fx + fw]) { x.fillRect(sx - 2, fy, 5, fh); x.strokeRect(sx - 2, fy, 5, fh); }
    for (let i = 0; i <= fw; i += 36) { x.fillStyle = "#E8D7B0"; x.fillRect(fx + i - 4, fy + fh - 26, 8, 28); x.strokeRect(fx + i - 4, fy + fh - 26, 8, 28); }
  }

  /* ---------- oyun nesneleri ---------- */
  let clock = 0, parts = [], flyers = [], floaters = [], dogS = { x: 470, y: 560, tx: 470, ty: 560, dir: 1, run: false, t: 0 }, cust = null, hand = null;
  const sky = () => { const k = (clock / 240) % 1; return k < .75 ? 0 : Math.sin((k - .75) / .25 * Math.PI); }; // 0 gündüz → 1 gece
  function burst(x, y, cols, n, sp) { for (let i = 0; i < n; i++) { const a = rnd(0, 7), s = rnd(40, sp || 150); parts.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s - 50, life: rnd(.5, 1), c: pick(cols), s: rnd(3, 6), g: 1 }); } }
  function floater(x, y, text, col) { floaters.push({ x, y, text, col, t: 0 }); }
  const BASKET = { x: 900, y: 46 }, COINP = { x: 70, y: 40 };
  function fly(item, x, y, tx, ty, onDone, delay) { flyers.push({ item, x0: x, y0: y, x1: tx, y1: ty, t: -(delay || 0), d: .7, onDone }); }

  /* ---------- güncelleme ---------- */
  let state = "title", modalOpen = false;
  function tick(dt) {
    clock += dt;
    for (const p of parts) { p.life -= dt; p.x += p.vx * dt; p.y += p.vy * dt; if (p.g) p.vy += 300 * dt; }
    parts = parts.filter((p) => p.life > 0);
    for (const f of flyers) { f.t += dt; if (f.t >= f.d && !f.done) { f.done = true; f.onDone && f.onDone(); } }
    flyers = flyers.filter((f) => !f.done);
    for (const f of floaters) f.t += dt; floaters = floaters.filter((f) => f.t < 1.4);
    if (state !== "play" || !S) return;
    grow(dt);
    // hayvanlar
    for (const a of S.animals) {
      a.wt -= dt;
      if (a.wt <= 0) { const h = ANIM[a.kind].home === "pen" ? PEN : FIELD; a.tx = h.x + rnd(50, h.w - 50); a.ty = h.y + rnd(60, h.h - 24); a.wt = rnd(3, 7); }
      const dx = a.tx - a.x, dy = a.ty - a.y, d = Math.hypot(dx, dy), sp = a.kind === "tavuk" ? 30 : 16;
      if (d > 3 && !a.prod) { a.x += dx / d * sp * dt; a.y += dy / d * sp * dt; if (Math.abs(dx) > 2) a.dir = dx > 0 ? 1 : -1; a.walk = true; } else a.walk = false;
      a.happy = Math.max(0, (a.happy || 0) - dt);
    }
    // köpek
    const dd = Math.hypot(dogS.tx - dogS.x, dogS.ty - dogS.y); dogS.t += dt;
    if (dd > 4) { dogS.x += (dogS.tx - dogS.x) / dd * 160 * dt; dogS.y += (dogS.ty - dogS.y) / dd * 160 * dt; dogS.dir = dogS.tx > dogS.x ? 1 : -1; dogS.run = true; } else dogS.run = false;
    // müşteri
    if (!cust && S.order) cust = { kind: S.order.who, x: 1010, y: STALL.y + 178, t: 0, happy: 0 };
    if (cust) { cust.t += dt; const tx = cust.leaving ? 1040 : STALL.x - 26; cust.x += clamp(tx - cust.x, -90 * dt, 90 * dt); cust.happy = Math.max(0, cust.happy - dt); if (cust.leaving && cust.x >= 1030) { cust = null; } }
    if (!S.order && !cust && (tick.wait = (tick.wait || 0) + dt) > 4) { tick.wait = 0; newOrder(); }
    tutorial();
    if ((tick.st = (tick.st || 0) + dt) > 4) { tick.st = 0; save(); }
  }
  function grow(dt) {
    S.plots.forEach((p, i) => {
      if (!p.crop || p.need || p.stage >= 3) return;
      p.t += dt; const st = CROPS[p.crop].stage;
      if (p.t >= st) { p.t = 0; p.stage++; if (p.stage === 2) p.need = true; if (p.stage === 3) { sparkle(PLOTS[i].x + PLOTS[i].w / 2, PLOTS[i].y + 20); } }
    });
    for (const a of S.animals) if (a.fed && !a.prod) { a.t += dt; if (a.t >= ANIM[a.kind].time) { a.prod = true; a.fed = false; a.t = 0; if (state === "play") { if (a.kind === "tavuk") sfx.cluck(); else if (a.kind === "inek") sfx.moo(); else sfx.baa(); } } }
  }
  function sparkle(x, y) { burst(x, y, ["#FFD23F", "#fff"], 10, 90); }
  function catchUp() { // oyun kapalıyken geçen süre (en fazla 1 saat)
    const away = clamp((Date.now() - (S.savedAt || Date.now())) / 1000, 0, 3600); let left = away;
    while (left > 0) { const d = Math.min(1, left); grow(d); left -= d; }
    return away;
  }
  function newOrder() {
    const pool = S.crops.slice(); if (S.animals.some((a) => a.kind === "tavuk")) pool.push("yumurta"); if (S.animals.some((a) => a.kind === "inek")) pool.push("sut"); if (S.animals.some((a) => a.kind === "koyun")) pool.push("yun");
    const kinds = Math.min(pool.length, S.served < 3 ? 1 : ri(1, Math.min(3, 1 + Math.floor(S.served / 4)))), items = {};
    const shuffled = pool.sort(() => Math.random() - .5).slice(0, kinds);
    for (const k of shuffled) items[k] = ri(1, S.served < 5 ? 2 : 3);
    let who; do { who = pick(CUSTOMERS); } while (S.order && who === S.order.who && Math.random() < .8);
    S.order = { who, items }; save();
    setTimeout(() => { if (state === "play" && !modalOpen) say(CNAME[who] + " geldi! " + orderText(items) + " istiyor."); }, 1800);
  }
  function orderText(items) { return Object.entries(items).map(([k, n]) => n + " " + ITEMS[k]).join(", "); }

  /* ---------- eğitim ---------- */
  const TUT = [
    { say: "Merhaba Egemen! Burası senin çiftliğin. Kahverengi toprağa dokun, havuç ekelim!", target: () => plotC(0), done: () => S.plots.some((p) => p.crop) },
    { say: "Havucun susadı! Mavi damlaya dokun ve sula.", target: () => { const i = S.plots.findIndex((p) => p.need); return i >= 0 ? plotC(i) : null; }, done: () => S.plots.some((p) => p.crop && !p.need) || S.plots.some((p) => p.stage > 0) },
    { say: "Havuç büyüyor! Bu arada tavuklar acıktı. Bir tavuğa dokun, yem ver.", target: () => { const a = S.animals.find((a) => a.kind === "tavuk"); return a && { x: a.x, y: a.y - 30 }; }, done: () => S.animals.some((a) => a.fed || a.prod) },
    { say: "Havuç yine susadı. Damlaya dokun! Yumurta da birazdan gelecek.", target: () => { const i = S.plots.findIndex((p) => p.need); return i >= 0 ? plotC(i) : null; }, done: () => !S.plots.some((p) => p.need) && (S.plots.some((p) => p.stage >= 3) || S.inv.havuc > 0), wait: () => S.plots.some((p) => p.need) },
    { say: "Havuç hazır! Dokun ve topla.", target: () => { const i = S.plots.findIndex((p) => p.stage >= 3); return i >= 0 ? plotC(i) : null; }, done: () => (S.inv.havuc || 0) > 0, wait: () => S.plots.some((p) => p.stage >= 3) },
    { say: "Tavuk yumurtladı! Yumurtaya dokun.", target: () => { const a = S.animals.find((a) => a.prod); return a && { x: a.x + 30, y: a.y - 10 }; }, done: () => (S.inv.yumurta || 0) > 0, wait: () => S.animals.some((a) => a.prod) },
    { say: "Ayı Amca bir havuç ve bir yumurta istiyor. Pazar tezgâhına dokun!", target: () => ({ x: STALL.x + 98, y: STALL.y + 120 }), done: () => S.served > 0 },
    { say: "Aferin! Altın ve yıldız kazandın. Sağ üstteki dükkândan yeni tohumlar ve hayvanlar alabilirsin!", target: () => ({ x: 830, y: 46 }), done: () => !!S.shopSeen, last: 1 }
  ];
  let tutSaid = -1;
  function plotC(i) { const p = PLOTS[i]; return { x: p.x + p.w / 2, y: p.y + p.h / 2 }; }
  function tutorial() {
    if (S.tut >= 99) { hand = null; return; }
    const st = TUT[S.tut]; if (!st) { S.tut = 99; return; }
    if (st.done()) { S.tut++; tutSaid = -1; hand = null; save(); if (st.last) { S.tut = 99; } return; }
    if (st.wait && !st.wait()) { hand = null; if (tutSaid !== S.tut + 100 && S.tut === 3) { /* bekleme */ } return; }
    if (tutSaid !== S.tut && !modalOpen) { tutSaid = S.tut; say(st.say); if (st.last) { setTimeout(() => { if (S.tut === TUT.length - 1) { S.tut = 99; save(); } }, 6000); } }
    hand = st.target();
  }

  /* ---------- dokunma ---------- */
  function canvasXY(e) { const r = cv.getBoundingClientRect(); return [(e.clientX - r.left) / r.width * W, (e.clientY - r.top) / r.height * H]; }
  cv.addEventListener("pointerdown", (e) => { audio(); if (state !== "play" || modalOpen) return; e.preventDefault(); const [x, y] = canvasXY(e); tap(x, y); });
  const inR = (x, y, r, pad) => x >= r.x - (pad || 0) && x <= r.x + r.w + (pad || 0) && y >= r.y - (pad || 0) && y <= r.y + r.h + (pad || 0);
  function tap(x, y) {
    // üst düğmeler
    if (Math.hypot(x - 830, y - 46) < 34) { openShop(); return; }
    if (Math.hypot(x - BASKET.x, y - BASKET.y) < 34) { openBasket(); return; }
    // ürünler (hayvan üretimi)
    for (const a of S.animals) if (a.prod && Math.hypot(x - (a.x + prodOff(a)), y - (a.y - 12)) < 32) { collect(a); return; }
    // hayvanlar
    for (const a of S.animals.slice().sort((p, q) => q.y - p.y)) { const r = a.kind === "tavuk" ? 32 : 46; if (Math.hypot(x - a.x, y - (a.y - (a.kind === "tavuk" ? 26 : 40))) < r) { tapAnimal(a); return; } }
    // tarlalar
    for (let i = 0; i < PLOTS.length; i++) if (inR(x, y, PLOTS[i], 8)) { tapPlot(i); return; }
    // pazar
    if (inR(x, y, STALL) || (cust && Math.hypot(x - cust.x, y - (cust.y - 50)) < 50)) { openMarket(); return; }
    // köpek
    if (Math.hypot(x - dogS.x, y - (dogS.y - 22)) < 30) { sfx.woof(); burst(dogS.x, dogS.y - 40, ["#FF7AA2", "#fff"], 8, 80); say("Hav hav! Ben Karabaş!", false); return; }
    if (y > GY + 10) { dogS.tx = clamp(x, 20, W - 20); dogS.ty = clamp(y, GY + 30, H - 10); }
  }
  const prodOff = (a) => a.kind === "tavuk" ? 30 : 56;
  function tapPlot(i) {
    const p = S.plots[i], P = PLOTS[i], cx = P.x + P.w / 2, cy = P.y + P.h / 2;
    if (S.stars < PLOT_STARS[i]) { sfx.no(); say("Bu tarlayı açmak için " + PLOT_STARS[i] + " yıldız lazım. Siparişleri tamamla, yıldız kazan!"); return; }
    if (!p.crop) { if (S.crops.length === 1) doPlant(i, S.crops[0]); else openSeeds(i); return; }
    if (p.need) { p.need = false; p.wet = 2; sfx.water(); waterFx(cx, cy); floater(cx, cy - 40, "Sulandı!", "#4DA3FF"); save(); return; }
    if (p.stage >= 3) {
      const c = CROPS[p.crop], n = c.yield; sfx.harvest(); burst(cx, cy - 10, ["#FFD23F", "#5DB34A", "#fff"], 14, 140);
      S.inv[p.crop] = (S.inv[p.crop] || 0) + n; for (let k = 0; k < n; k++) fly(p.crop, cx + k * 10, cy - 20, BASKET.x, BASKET.y, () => sfx.pop(), k * .12);
      say(n + " " + c.name + " topladın!", false);
      p.crop = null; p.stage = 0; p.t = 0; p.need = false; save(); return;
    }
    sfx.pop(); floater(cx, cy - 40, "Büyüyor...", "#fff"); say(CROPS[p.crop].name + " büyüyor. Biraz bekle!", false);
  }
  function doPlant(i, crop) { const p = S.plots[i], P = PLOTS[i]; p.crop = crop; p.stage = 0; p.t = 0; p.need = true; sfx.plant(); burst(P.x + P.w / 2, P.y + P.h / 2, ["#8A5A2B", "#5DB34A"], 10, 90); dogS.tx = P.x + P.w / 2; dogS.ty = Math.min(H - 10, P.y + P.h + 16); save(); }
  function waterFx(x, y) { for (let i = 0; i < 18; i++) parts.push({ x: x + rnd(-30, 30), y: y - 60 - rnd(0, 20), vx: rnd(-10, 10), vy: rnd(80, 160), life: .5, c: "#4DA3FF", s: 3, g: 1 }); canAnim = { x, y, t: 0 }; }
  let canAnim = null;
  function tapAnimal(a) {
    a.happy = 1.2;
    if (a.kind === "tavuk") sfx.cluck(); else if (a.kind === "inek") sfx.moo(); else sfx.baa();
    if (!a.fed && !a.prod) { a.fed = true; a.t = 0; sfx.munch(); for (let i = 0; i < 10; i++) parts.push({ x: a.x + rnd(-14, 14), y: a.y - 70, vx: rnd(-20, 20), vy: rnd(40, 120), life: .6, c: "#F2C14E", s: 3, g: 1 }); floater(a.x, a.y - 80, "Ham ham!", "#fff"); save(); }
    else if (a.fed) floater(a.x, a.y - 80, a.kind === "tavuk" ? "Gıt gıdak!" : a.kind === "inek" ? "Möö!" : "Mee!", "#fff");
  }
  function collect(a) {
    const item = ANIM[a.kind].prod, x = a.x + prodOff(a), y = a.y - 12; a.prod = false; sfx.harvest(); burst(x, y, ["#FFD23F", "#fff"], 10, 100);
    S.inv[item] = (S.inv[item] || 0) + 1; save(); fly(item, x, y, BASKET.x, BASKET.y, () => sfx.pop()); say(ITEMS[item] + " topladın!", false);
  }

  /* ---------- pencereler ---------- */
  const modal = $("modal"), sheet = $("sheet");
  function openModal(html) { modalOpen = true; sheet.innerHTML = html; modal.hidden = false; }
  function closeModal() { modalOpen = false; modal.hidden = true; }
  modal.addEventListener("pointerdown", (e) => { if (e.target === modal) closeModal(); });
  function iconCanvas(id, size) { const c = document.createElement("canvas"); c.width = c.height = size * 2; const x = c.getContext("2d"); x.scale(2, 2); if (id.startsWith("an:")) { const k = id.slice(3), s = size / 100; x.translate(size / 2, size * .86); x.scale(s * (k === "tavuk" ? 1.4 : .9), s * (k === "tavuk" ? 1.4 : .9)); if (k === "tavuk") chicken(x, -6, 0, 0, 1, 1); else if (k === "inek") cow(x, -10, 0, 0, 1, 1); else sheep(x, -8, 0, 0, 1, 1); } else if (id.startsWith("de:")) decorIcon(x, id.slice(3), size); else icon(x, id, size / 2, size / 2, size * .38); return c; }
  function decorIcon(x, id, size) { x.save(); x.translate(size / 2, size * .9); const s = size / 110; x.scale(s, s); drawDecor(x, id, 0, 0, 0); x.restore(); }
  function openSeeds(i) {
    openModal("<h2>Ne ekelim?</h2><div class='row' id='seedRow'></div><button class='big ghost' id='mClose' type='button'>✕ Vazgeç</button>");
    say("Ne ekelim?", false);
    const row = $("seedRow");
    S.crops.forEach((k) => { const b = document.createElement("button"); b.type = "button"; b.className = "choice"; b.appendChild(iconCanvas(k, 64)); b.appendChild(document.createTextNode(cap(CROPS[k].name))); b.onclick = () => { closeModal(); doPlant(i, k); say(cap(CROPS[k].name) + " ektin! Şimdi sula.", false); }; row.appendChild(b); });
    $("mClose").onclick = closeModal;
  }
  const cap = (s) => s.charAt(0).toLocaleUpperCase("tr") + s.slice(1);
  function needHtml(items) { return Object.entries(items).map(([k, n]) => "<div class='it" + ((S.inv[k] || 0) >= n ? " ok" : "") + "' data-ic='" + k + "'><b>" + (S.inv[k] || 0) + "/" + n + "</b></div>").join(""); }
  function fillIcons(root) { root.querySelectorAll("[data-ic]").forEach((d) => d.prepend(iconCanvas(d.dataset.ic, 56))); }
  function openMarket() {
    const o = S.order;
    const can = o && Object.entries(o.items).every(([k, n]) => (S.inv[k] || 0) >= n);
    const extra = Object.entries(S.inv).filter(([k, n]) => n > 0 && !(o && o.items[k])).reduce((s, [k, n]) => s + n * PRICE[k], 0);
    let h = "<h2>Pazar</h2>";
    if (o) h += "<p><b>" + CNAME[o.who] + "</b> şunları istiyor:</p><div class='need'>" + needHtml(o.items) + "</div><div class='row'><button class='big' id='give' type='button'" + (can ? "" : " disabled") + ">🎁 Ver</button></div>";
    else h += "<p>Yeni müşteri birazdan gelecek.</p>";
    h += "<div class='row'><button class='big alt' id='sell' type='button'" + (extra ? "" : " disabled") + ">Fazlaları sat (+" + extra + " altın)</button><button class='big ghost' id='mClose' type='button'>✕ Kapat</button></div>";
    openModal(h); fillIcons(sheet);
    if (o) say(can ? CNAME[o.who] + " için her şey hazır! Ver düğmesine bas." : CNAME[o.who] + " " + orderText(o.items) + " istiyor. Sepetinde henüz yeterli yok.", false);
    $("mClose").onclick = closeModal;
    if ($("give")) $("give").onclick = () => { closeModal(); deliver(); };
    $("sell").onclick = () => { closeModal(); sellExtra(); };
  }
  function deliver() {
    const o = S.order; let sum = 0;
    for (const [k, n] of Object.entries(o.items)) { S.inv[k] -= n; sum += n * PRICE[k]; }
    const pay = sum * 2 + 2; S.served++; S.order = null;
    if (cust) { cust.happy = 3; setTimeout(() => { if (cust) cust.leaving = true; }, 1500); }
    sfx.star(); burst(STALL.x + 40, STALL.y + 100, ["#FFD23F", "#FF7AA2", "#fff", "#4DA3FF"], 30, 200);
    S.coins += pay; S.stars++; for (let k = 0; k < 6; k++) fly("coin", STALL.x + 60, STALL.y + 110, COINP.x, COINP.y, () => sfx.coin(), k * .09); fly("star", STALL.x + 60, STALL.y + 90, 170, 40, () => sfx.star(), .65);
    say("Teşekkürler! " + pay + " altın ve bir yıldız kazandın!", false);
    const unlock = PLOT_STARS.indexOf(S.stars); if (unlock >= 0) setTimeout(() => say("Yaşasın! Yeni bir tarla açıldı!", false), 3000);
    save();
  }
  function sellExtra() {
    const o = S.order; let sum = 0;
    for (const [k, n] of Object.entries(S.inv)) if (n > 0 && !(o && o.items[k])) { sum += n * PRICE[k]; S.inv[k] = 0; }
    if (!sum) return; S.coins += sum; for (let k = 0; k < Math.min(8, sum); k++) fly("coin", STALL.x + 80, STALL.y + 110, COINP.x, COINP.y, () => sfx.coin(), k * .08); say(sum + " altın kazandın!", false); save();
  }
  function openBasket() {
    const items = Object.entries(S.inv).filter(([, n]) => n > 0);
    openModal("<h2>Sepetim</h2>" + (items.length ? "<div class='need'>" + items.map(([k, n]) => "<div class='it ok' data-ic='" + k + "'><b>" + n + "</b></div>").join("") + "</div>" : "<p>Sepet boş. Ürün topla!</p>") + "<div class='row'><button class='big ghost' id='mClose' type='button'>✕ Kapat</button></div>");
    fillIcons(sheet); $("mClose").onclick = closeModal;
    say(items.length ? "Sepetinde " + items.map(([k, n]) => n + " " + ITEMS[k]).join(", ") + " var." : "Sepetin boş.", false);
  }
  let shopTab = "tohum";
  function openShop() {
    S.shopSeen = true;
    const tabs = [["tohum", "🌱 Tohum"], ["hayvan", "🐔 Hayvan"], ["sus", "🌻 Süs"]];
    let h = "<h2>Dükkân</h2><div class='tabs' role='tablist'>" + tabs.map(([k, t]) => "<button type='button' role='tab' data-tab='" + k + "' aria-selected='" + (shopTab === k) + "'>" + t + "</button>").join("") + "</div><div class='row' id='shopRow'></div><div class='row'><button class='big ghost' id='mClose' type='button'>✕ Kapat</button></div>";
    openModal(h); $("mClose").onclick = closeModal;
    sheet.querySelectorAll("[data-tab]").forEach((b) => b.onclick = () => { shopTab = b.dataset.tab; sfx.pop(); openShop(); });
    const row = $("shopRow"), add = (id, label, cost, own, buy, sub) => {
      const b = document.createElement("button"); b.type = "button"; b.className = "choice" + (own ? " own" : S.coins < cost ? " no" : "");
      b.appendChild(iconCanvas(id, 64)); b.appendChild(document.createTextNode(label));
      const pr = document.createElement("span"); pr.className = "pr"; pr.textContent = own ? "✔ Var" : "● " + cost + (sub || ""); b.appendChild(pr);
      b.onclick = () => { if (own) { say(label + " zaten sende!", false); return; } if (S.coins < cost) { sfx.no(); say(label + " " + cost + " altın. Biraz daha altın topla!", false); return; } S.coins -= cost; buy(); sfx.buy(); say(label + " aldın!", false); save(); openShop(); };
      row.appendChild(b);
    };
    if (shopTab === "tohum") for (const [k, c] of Object.entries(CROPS)) add(k, cap(c.name), c.cost, S.crops.includes(k), () => S.crops.push(k));
    if (shopTab === "hayvan") for (const [k, a] of Object.entries(ANIM)) { const n = S.animals.filter((x) => x.kind === k).length, max = k === "tavuk" ? 4 : 2; add("an:" + k, cap(a.name) + " (" + n + ")", a.cost * (k === "tavuk" ? 1 : 1 + n * .5) | 0, n >= max, () => { S.animals.push(mkAnimal(k)); }); }
    if (shopTab === "sus") for (const [k, d] of Object.entries(DECOR)) add("de:" + k, d.name, d.cost, S.decor.includes(k), () => S.decor.push(k));
    say(shopTab === "tohum" ? "Hangi tohumu alalım?" : shopTab === "hayvan" ? "Yeni bir hayvan alalım mı?" : "Çiftliği süsleyelim!", false);
  }

  /* ---------- süsler ---------- */
  function drawDecor(c, id, x, y, t) {
    c.save(); c.translate(x, y);
    if (id === "degirmen") { c.fillStyle = "#E8D7B0"; c.beginPath(); c.moveTo(-22, 0); c.lineTo(-12, -100); c.lineTo(12, -100); c.lineTo(22, 0); c.closePath(); c.fill(); c.strokeStyle = OL; c.lineWidth = 2.5; c.stroke(); c.fillStyle = "#8A5A2B"; c.fillRect(-6, -24, 12, 24); c.save(); c.translate(0, -96); c.rotate(t * 1.2); for (let i = 0; i < 4; i++) { c.rotate(Math.PI / 2); c.fillStyle = "#FFFBEE"; c.fillRect(-6, 4, 12, 52); c.strokeRect(-6, 4, 12, 52); c.fillStyle = "#C8463F"; c.fillRect(-6, 40, 12, 16); } circle(c, 0, 0, 6, "#8A5A2B", 2); c.restore(); }
    else if (id === "korkuluk") { c.strokeStyle = "#8A5A2B"; c.lineWidth = 5; c.beginPath(); c.moveTo(0, 0); c.lineTo(0, -80); c.moveTo(-32, -56); c.lineTo(32, -56); c.stroke(); c.fillStyle = "#4D8DF0"; rr(c, -16, -64, 32, 36, 6); c.fill(); c.strokeStyle = OL; c.lineWidth = 2; c.stroke(); circle(c, 0, -80, 14, "#F2D58A", 2); c.fillStyle = "#C8463F"; c.beginPath(); c.moveTo(-20, -86); c.lineTo(20, -86); c.lineTo(10, -104); c.lineTo(-10, -104); c.closePath(); c.fill(); c.stroke(); c.lineWidth = 2; c.beginPath(); c.moveTo(-6, -80); c.lineTo(-2, -76); c.moveTo(-2, -80); c.lineTo(-6, -76); c.moveTo(2, -80); c.lineTo(6, -76); c.moveTo(6, -80); c.lineTo(2, -76); c.stroke(); c.beginPath(); c.arc(0, -74, 5, .1 * Math.PI, .9 * Math.PI); c.stroke(); }
    else if (id === "kulube") { c.fillStyle = "#C98A4A"; c.fillRect(-28, -34, 56, 34); c.strokeStyle = OL; c.lineWidth = 2.5; c.strokeRect(-28, -34, 56, 34); c.beginPath(); c.moveTo(-34, -32); c.lineTo(0, -58); c.lineTo(34, -32); c.closePath(); c.fillStyle = "#4D8DF0"; c.fill(); c.stroke(); c.fillStyle = "#3A2A1A"; c.beginPath(); c.arc(0, -14, 12, Math.PI, 0); c.lineTo(12, 0); c.lineTo(-12, 0); c.fill(); c.fillStyle = "#fff"; c.font = "700 10px Fredoka"; c.textAlign = "center"; c.fillText("KARABAŞ", 0, -36); }
    else if (id === "kuyu") { ell(c, 0, -4, 30, 10, 0, "#8E8E9E", 2.5); c.fillStyle = "#A8A8B8"; c.fillRect(-30, -30, 60, 26); c.strokeStyle = OL; c.lineWidth = 2.5; c.strokeRect(-30, -30, 60, 26); ell(c, 0, -30, 30, 9, 0, "#5A6A8A", 2.5); c.strokeStyle = "#8A5A2B"; c.lineWidth = 5; c.beginPath(); c.moveTo(-26, -30); c.lineTo(-26, -76); c.moveTo(26, -30); c.lineTo(26, -76); c.stroke(); c.beginPath(); c.moveTo(-36, -70); c.lineTo(0, -92); c.lineTo(36, -70); c.closePath(); c.fillStyle = "#C8463F"; c.fill(); c.strokeStyle = OL; c.lineWidth = 2.5; c.stroke(); c.fillStyle = "#8A5A2B"; c.fillRect(-6, -60, 12, 14); }
    else if (id === "cicek") { for (let i = 0; i < 7; i++) { const fx = -42 + i * 14, fy = -10 - (i % 2) * 8; c.strokeStyle = "#3E8E44"; c.lineWidth = 2; c.beginPath(); c.moveTo(fx, 0); c.lineTo(fx, fy); c.stroke(); const col = ["#FF7AA2", "#FFD23F", "#B98CFF", "#FF5A5A", "#fff"][i % 5]; for (let k = 0; k < 5; k++) circle(c, fx + Math.cos(k * 1.26 + t) * 5, fy + Math.sin(k * 1.26 + t) * 5, 4, col); circle(c, fx, fy, 3, "#E8A317"); } }
    c.restore();
  }
  const DECPOS = { degirmen: [262, GY + 4], korkuluk: [440, GY + 22], kulube: [430, 585], kuyu: [700, 340], cicek: [140, 590] };

  /* ---------- çizim ---------- */
  function draw() {
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    const n = sky();
    const g = ctx.createLinearGradient(0, 0, 0, GY); g.addColorStop(0, mix("#7EC8FF", "#1B2050", n)); g.addColorStop(1, mix("#D6F1FF", "#4A3A7A", n)); ctx.fillStyle = g; ctx.fillRect(0, 0, W, GY);
    if (n > .1) for (let i = 0; i < 40; i++) { ctx.globalAlpha = n * (.4 + .6 * Math.abs(Math.sin(clock + i))); circle(ctx, hash(i, 5) * W, hash(i, 6) * GY * .8, 1.3, "#fff"); } ctx.globalAlpha = 1;
    const k = (clock / 240) % 1, sx = 80 + k / .75 * 800;
    if (k < .75) { circle(ctx, sx, 90 - Math.sin(k / .75 * Math.PI) * 40, 34, "rgba(255,240,150,.35)"); circle(ctx, sx, 90 - Math.sin(k / .75 * Math.PI) * 40, 26, "#FFE066"); }
    else { circle(ctx, 480, 80, 22, "#F4F0D8"); circle(ctx, 490, 74, 18, mix("#7EC8FF", "#1B2050", n)); }
    for (let i = 0; i < 4; i++) { const cx = ((hash(i, 9) * 1100 + clock * (8 + i * 3)) % 1160) - 100, cy = 40 + i * 32; ctx.globalAlpha = .9 - n * .5; for (const [dx, dy, r] of [[0, 0, 22], [24, -8, 26], [50, 0, 20], [26, 6, 22]]) circle(ctx, cx + dx, cy + dy, r, "#fff"); ctx.globalAlpha = 1; }
    if (!bgCv) bgCv = renderBg();
    ctx.drawImage(bgCv, 0, 0);
    if (!S) return;
    // süsler (arka)
    for (const d of ["degirmen", "kuyu"]) if (S.decor.includes(d)) drawDecor(ctx, d, DECPOS[d][0], DECPOS[d][1], clock);
    // tarlalar
    PLOTS.forEach((P, i) => drawPlot(P, S.plots[i], i));
    if (S.decor.includes("korkuluk")) drawDecor(ctx, "korkuluk", ...DECPOS.korkuluk, clock);
    // nesneler (y sıralı)
    const L = [];
    for (const a of S.animals) L.push({ y: a.y, f: () => drawAnimal(a) });
    L.push({ y: dogS.y, f: () => dog(ctx, dogS.x, dogS.y, dogS.t, dogS.dir, dogS.run) });
    if (cust) L.push({ y: cust.y, f: () => drawCust() });
    if (S.decor.includes("kulube")) L.push({ y: DECPOS.kulube[1], f: () => drawDecor(ctx, "kulube", ...DECPOS.kulube, clock) });
    if (S.decor.includes("cicek")) L.push({ y: DECPOS.cicek[1], f: () => drawDecor(ctx, "cicek", ...DECPOS.cicek, clock) });
    L.sort((a, b) => a.y - b.y).forEach((o) => o.f());
    fenceFront(ctx, PEN.x, PEN.y, PEN.w, PEN.h); fenceFront(ctx, FIELD.x, FIELD.y, FIELD.w, FIELD.h);
    if (!S.animals.some((a) => ANIM[a.kind].home === "field")) { ctx.save(); ctx.translate(FIELD.x + FIELD.w / 2, FIELD.y + 110); ctx.fillStyle = "#8A5A2B"; ctx.fillRect(-4, -10, 8, 40); ctx.fillStyle = "#FFFBEE"; rr(ctx, -70, -50, 140, 46, 10); ctx.fill(); ctx.strokeStyle = OL; ctx.lineWidth = 2.5; ctx.stroke(); ctx.fillStyle = OL; ctx.font = "700 17px Fredoka"; ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.fillText("İnek ve koyun", 0, -36); ctx.fillText("dükkânda!", 0, -16); ctx.restore(); }
    // gece karartması
    if (n > 0) { ctx.fillStyle = "rgba(20,20,70," + n * .35 + ")"; ctx.fillRect(0, 0, W, H); ctx.fillStyle = "rgba(255,220,120," + n * .8 + ")"; ctx.fillRect(122, 180, 26, 20); }
    if (canAnim) drawCan();
    hud();
    for (const p of parts) { ctx.globalAlpha = Math.min(1, p.life * 2); ctx.fillStyle = p.c; ctx.fillRect(p.x - p.s / 2, p.y - p.s / 2, p.s, p.s); } ctx.globalAlpha = 1;
    for (const f of flyers) { if (f.t < 0) continue; const k = Math.min(1, f.t / f.d), e = k * k * (3 - 2 * k), x = f.x0 + (f.x1 - f.x0) * e, y = f.y0 + (f.y1 - f.y0) * e - Math.sin(k * Math.PI) * 90; if (f.item === "coin") coin(ctx, x, y, 12); else if (f.item === "star") star(ctx, x, y, 16); else icon(ctx, f.item, x, y, 20); }
    for (const f of floaters) { ctx.globalAlpha = Math.max(0, 1 - f.t / 1.4); txt(f.text, f.x, f.y - f.t * 40, 26, f.col); } ctx.globalAlpha = 1;
    if (hand) drawHand(hand.x, hand.y);
  }
  function mix(a, b, k) { const pa = parseInt(a.slice(1), 16), pb = parseInt(b.slice(1), 16); const r = (pa >> 16) + ((pb >> 16) - (pa >> 16)) * k, g = ((pa >> 8) & 255) + (((pb >> 8) & 255) - ((pa >> 8) & 255)) * k, bl = (pa & 255) + ((pb & 255) - (pa & 255)) * k; return "rgb(" + (r | 0) + "," + (g | 0) + "," + (bl | 0) + ")"; }
  function drawPlot(P, p, i) {
    const locked = S.stars < PLOT_STARS[i];
    ctx.save(); shadow(ctx, P.x + P.w / 2, P.y + P.h + 4, P.w * .55, 8);
    rr(ctx, P.x, P.y, P.w, P.h, 16); ctx.fillStyle = locked ? "#9A8A6A" : p.wet > 0 || (p.crop && !p.need) ? "#6E4626" : "#8A5A30"; ctx.fill(); ctx.strokeStyle = OL; ctx.lineWidth = 3; ctx.stroke();
    ctx.strokeStyle = "rgba(0,0,0,.18)"; ctx.lineWidth = 3; for (let r = 0; r < 3; r++) { ctx.beginPath(); ctx.moveTo(P.x + 12, P.y + 18 + r * 22); ctx.quadraticCurveTo(P.x + P.w / 2, P.y + 14 + r * 22, P.x + P.w - 12, P.y + 18 + r * 22); ctx.stroke(); }
    if (locked) { ctx.fillStyle = "rgba(255,255,255,.85)"; rr(ctx, P.x + 24, P.y + 20, P.w - 48, 40, 12); ctx.fill(); star(ctx, P.x + 42, P.y + 40, 12); txt(String(PLOT_STARS[i]), P.x + 68, P.y + 41, 22, OL); ctx.restore(); return; }
    if (p.crop) { const pos = [[P.x + P.w * .27, P.y + P.h * .45], [P.x + P.w * .73, P.y + P.h * .45], [P.x + P.w * .5, P.y + P.h * .82]]; for (const [x, y] of pos) plant(ctx, p.crop, p.stage, x, y, clock); }
    if (p.wet > 0) p.wet -= 1 / 60;
    // baloncuk
    const bx = P.x + P.w - 8, by = P.y - 10 + Math.sin(clock * 4 + i) * 3;
    if (!p.crop && i < 6) { bubble(bx, by, () => icon(ctx, "tohum", bx, by - 2, 14)); }
    else if (p.need) bubble(bx, by, () => icon(ctx, "su", bx, by, 13));
    else if (p.stage >= 3) { bubble(bx, by, () => { ctx.fillStyle = "#3FA34D"; ctx.font = "700 22px Fredoka"; ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.fillText("✓", bx, by + 1); }); if (Math.random() < .05) sparkle(P.x + rnd(10, P.w - 10), P.y + rnd(0, 40)); }
    else if (p.crop) { const k = (p.stage + p.t / CROPS[p.crop].stage) / 3; ctx.fillStyle = "rgba(0,0,0,.35)"; rr(ctx, P.x + 14, P.y + P.h - 12, P.w - 28, 8, 4); ctx.fill(); ctx.fillStyle = "#7CF06A"; rr(ctx, P.x + 14, P.y + P.h - 12, (P.w - 28) * k, 8, 4); ctx.fill(); }
    ctx.restore();
  }
  function bubble(x, y, inner) { ctx.save(); ctx.fillStyle = "#fff"; ctx.strokeStyle = OL; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.arc(x, y, 18, 0, Math.PI * 2); ctx.fill(); ctx.stroke(); ctx.beginPath(); ctx.moveTo(x - 8, y + 14); ctx.lineTo(x - 14, y + 26); ctx.lineTo(x + 1, y + 17); ctx.fill(); inner(); ctx.restore(); }
  function drawAnimal(a) {
    const happy = a.happy > 0, t = a.walk ? clock : 0;
    if (a.kind === "tavuk") chicken(ctx, a.x, a.y, t, a.dir, happy); else if (a.kind === "inek") cow(ctx, a.x, a.y, t, a.dir, happy); else sheep(ctx, a.x, a.y, t, a.dir, happy, a.prod === false && a.fed);
    const top = a.y - (a.kind === "tavuk" ? 70 : 100);
    if (a.prod) { const x = a.x + prodOff(a), y = a.y - 12 + Math.sin(clock * 4) * 2; shadow(ctx, x, a.y, 14, 4); circle(ctx, x, y, 22, "rgba(255,240,150,.5)"); icon(ctx, ANIM[a.kind].prod, x, y, 16); }
    else if (!a.fed) bubble(a.x, top + Math.sin(clock * 4 + a.x) * 3, () => icon(ctx, "yem", a.x, top, 12));
    else { const k = a.t / ANIM[a.kind].time; ctx.fillStyle = "rgba(0,0,0,.35)"; rr(ctx, a.x - 22, top + 10, 44, 7, 3); ctx.fill(); ctx.fillStyle = "#FFD23F"; rr(ctx, a.x - 22, top + 10, 44 * k, 7, 3); ctx.fill(); }
  }
  function drawCust() {
    const c = cust; customer(ctx, c.kind, c.x, c.y, c.t, c.happy > 0);
    if (S.order && !c.leaving && Math.abs(c.x - (STALL.x - 26)) < 4) {
      const items = Object.entries(S.order.items), w = items.length * 52 + 16, bx = c.x - w / 2 - 20, by = c.y - 176;
      ctx.fillStyle = "#fff"; ctx.strokeStyle = OL; ctx.lineWidth = 3; rr(ctx, bx, by, w, 60, 16); ctx.fill(); ctx.stroke(); ctx.beginPath(); ctx.moveTo(c.x - 10, by + 58); ctx.lineTo(c.x - 4, by + 74); ctx.lineTo(c.x + 6, by + 58); ctx.fill();
      items.forEach(([k, n], i) => { const x = bx + 34 + i * 52, have = (S.inv[k] || 0) >= n; icon(ctx, k, x - 4, by + 30, 16); circle(ctx, x + 14, by + 44, 11, have ? "#3FA34D" : "#C8463F", 2); txt(String(n), x + 14, by + 45, 15, "#fff"); });
    }
  }
  function drawCan() { const a = canAnim; a.t += 1 / 60; if (a.t > 1) { canAnim = null; return; } ctx.save(); ctx.translate(a.x + 30, a.y - 70); ctx.rotate(-.5 - Math.sin(a.t * Math.PI) * .3); ctx.fillStyle = "#4D8DF0"; rr(ctx, -20, -14, 40, 28, 6); ctx.fill(); ctx.strokeStyle = OL; ctx.lineWidth = 2.5; ctx.stroke(); ctx.beginPath(); ctx.moveTo(-20, -4); ctx.lineTo(-44, 6); ctx.lineTo(-44, 0); ctx.lineTo(-20, -10); ctx.fillStyle = "#4D8DF0"; ctx.fill(); ctx.stroke(); ctx.beginPath(); ctx.arc(4, -18, 12, Math.PI, 0); ctx.stroke(); ctx.restore(); }
  function drawHand(x, y) {
    const b = Math.sin(clock * 6) * 8; ctx.save(); ctx.translate(x + 10, y + 16 + b); ctx.rotate(-.5);
    circle(ctx, -14, -14, 26 + Math.sin(clock * 6) * 4, null); ctx.strokeStyle = "rgba(255,255,255,.8)"; ctx.lineWidth = 4; ctx.stroke();
    ctx.fillStyle = "#FFD9B8"; ctx.strokeStyle = OL; ctx.lineWidth = 2.5; rr(ctx, -8, -4, 22, 30, 8); ctx.fill(); ctx.stroke(); rr(ctx, -6, -28, 9, 30, 4.5); ctx.fill(); ctx.stroke(); ctx.fillStyle = "#4D8DF0"; ctx.fillRect(-9, 22, 24, 10); ctx.strokeRect(-9, 22, 24, 10);
    ctx.restore();
  }
  function txt(s, x, y, size, col) { ctx.font = "700 " + size + "px Fredoka, sans-serif"; ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.lineWidth = size * .2; ctx.strokeStyle = col === OL ? "#fff" : OL; ctx.strokeText(s, x, y); ctx.fillStyle = col; ctx.fillText(s, x, y); }
  function hud() {
    // altın
    ctx.fillStyle = "rgba(255,251,238,.95)"; rr(ctx, 16, 16, 118, 48, 24); ctx.fill(); ctx.strokeStyle = OL; ctx.lineWidth = 3; ctx.stroke(); coin(ctx, 42, 40, 16); txt(String(S.coins), 92, 41, 26, OL);
    rr(ctx, 144, 16, 98, 48, 24); ctx.fillStyle = "rgba(255,251,238,.95)"; ctx.fill(); ctx.stroke(); star(ctx, 170, 39, 16); txt(String(S.stars), 212, 41, 26, OL);
    // dükkân
    ctx.fillStyle = "#FF9A2E"; circle(ctx, 830, 46, 32, "#FF9A2E", 3); ctx.save(); ctx.translate(830, 46); ctx.fillStyle = "#fff"; ctx.strokeStyle = OL; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(-16, -10); ctx.lineTo(16, -10); ctx.lineTo(12, 10); ctx.lineTo(-12, 10); ctx.closePath(); ctx.fill(); ctx.stroke(); circle(ctx, -8, 15, 3.5, "#fff", 2); circle(ctx, 8, 15, 3.5, "#fff", 2); ctx.beginPath(); ctx.moveTo(-16, -10); ctx.lineTo(-22, -16); ctx.stroke(); ctx.restore();
    // sepet
    circle(ctx, BASKET.x, BASKET.y, 32, "#FFFBEE", 3); ctx.save(); ctx.translate(BASKET.x, BASKET.y + 4); ctx.fillStyle = "#C98A4A"; ctx.beginPath(); ctx.moveTo(-18, -6); ctx.lineTo(18, -6); ctx.lineTo(13, 14); ctx.lineTo(-13, 14); ctx.closePath(); ctx.fill(); ctx.strokeStyle = OL; ctx.lineWidth = 2; ctx.stroke(); ctx.beginPath(); ctx.arc(0, -6, 14, Math.PI, 0); ctx.stroke(); ctx.strokeStyle = "#8A5A2B"; ctx.beginPath(); ctx.moveTo(-15, 2); ctx.lineTo(15, 2); ctx.stroke(); ctx.restore();
    const total = Object.values(S.inv).reduce((a, b) => a + b, 0); if (total) { circle(ctx, BASKET.x + 22, BASKET.y - 22, 14, "#C8463F", 2.5); txt(String(total), BASKET.x + 22, BASKET.y - 21, 16, "#fff"); }
  }

  /* ---------- başlık ---------- */
  function drawLogo() { const c = $("logoCv"), x = c.getContext("2d"); x.clearRect(0, 0, 300, 150); x.save(); x.translate(10, 0); icon(x, "havuc", 40, 90, 30); x.restore(); chicken(x, 110, 140, 0, 1, true); cow(x, 220, 146, 0, -1, true); icon(x, "cilek", 272, 110, 22); }
  function showTitle() { state = "title"; $("title").hidden = false; drawLogo(); $("reset").hidden = !load(); mOn = false; }
  $("play").onclick = () => {
    audio(); S = load() || fresh(); bgCv = null; const away = catchUp(); state = "play"; $("title").hidden = true; mOn = true;
    if (S.tut >= 99) { const ready = S.plots.filter((p) => p.stage >= 3).length; say(away > 60 && ready ? "Tekrar hoş geldin! " + ready + " tarlada ürün hazır!" : "Tekrar hoş geldin Egemen!"); }
    tutSaid = -1; save();
  };
  $("reset").onclick = () => { if (confirm("Çiftlik silinip baştan başlansın mı?")) { try { localStorage.removeItem(SAVE); } catch (e) {} $("reset").hidden = true; } };
  $("speak").onclick = () => { audio(); if (lastSay) say(lastSay); };
  const muteBtn = $("mute");
  function setMute(m) { muted = m; muteBtn.setAttribute("aria-pressed", m ? "true" : "false"); muteBtn.setAttribute("aria-label", m ? "Sesi aç" : "Sesi kapat"); if (master) master.gain.value = m ? 0 : 1; if (m && canSpeak) speechSynthesis.cancel(); try { localStorage.setItem(SAVE + ":mute", m ? "1" : "0"); } catch (e) {} }
  setMute(muted); muteBtn.onclick = () => { audio(); setMute(!muted); };

  /* ---------- ölçek ve döngü ---------- */
  const stage = $("stage"), screen = $("screen");
  function fit() { const w = screen.clientWidth, h = screen.clientHeight; if (!w || !h) return; let sw = w, sh = w * H / W; if (sh > h) { sh = h; sw = h * W / H; } stage.style.width = Math.floor(sw) + "px"; stage.style.height = Math.floor(sh) + "px"; stage.style.setProperty("--fs", clamp(sw / 46, 12, 21).toFixed(1) + "px"); }
  addEventListener("resize", fit); if (window.ResizeObserver) new ResizeObserver(fit).observe(screen); fit();
  let last = performance.now();
  function frame(t) { const dt = Math.min(.05, (t - last) / 1000); last = t; tick(dt); draw(); requestAnimationFrame(frame); }
  requestAnimationFrame(frame);
  showTitle();
  addEventListener("pagehide", save);

  window.__mc = { get S() { return S; }, set S(v) { S = v; }, tick, tap, PLOTS, STALL, get cust() { return cust; }, get hand() { return hand; }, deliver, newOrder, openShop, openMarket, closeModal, get state() { return state; } };
})();
