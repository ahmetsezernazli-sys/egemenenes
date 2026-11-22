/* Ada Macerası — tüm aile için masa oyunu */
(function () {
  "use strict";
  const W = 960, H = 600, CX = 480, CY = 300;
  const $ = (id) => document.getElementById(id);
  const cv = $("cv"), ctx = cv.getContext("2d");
  const SAVE = "ada-macerasi";
  const rnd = (a, b) => a + Math.random() * (b - a);
  const ri = (a, b) => Math.floor(rnd(a, b + 1));
  const pick = (a) => a[Math.floor(Math.random() * a.length)];
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const STAR_COST = 10;

  /* ---------- ses ---------- */
  let ac = null, master = null, mg = null, muted = false;
  try { muted = localStorage.getItem(SAVE + ":mute") === "1"; } catch (e) {}
  function audio() {
    if (!ac) { const C = window.AudioContext || window.webkitAudioContext; if (!C) return null; ac = new C(); master = ac.createGain(); master.gain.value = muted ? 0 : 1; master.connect(ac.destination); mg = ac.createGain(); mg.gain.value = .45; mg.connect(master); }
    if (ac.state === "suspended") ac.resume(); return ac;
  }
  function tone(f, d, type, vol, when, slide, dest) {
    if (!ac || muted) return; const t = when || ac.currentTime, o = ac.createOscillator(), g = ac.createGain();
    o.type = type || "triangle"; o.frequency.setValueAtTime(f, t); if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(30, slide), t + d);
    g.gain.setValueAtTime(.0001, t); g.gain.linearRampToValueAtTime(vol || .1, t + .01); g.gain.exponentialRampToValueAtTime(.0008, t + d);
    o.connect(g); g.connect(dest || master); o.start(t); o.stop(t + d + .02);
  }
  let nbuf = null;
  function noise(d, vol, freq) { if (!ac || muted) return; if (!nbuf) { nbuf = ac.createBuffer(1, ac.sampleRate * .6, ac.sampleRate); const c = nbuf.getChannelData(0); for (let i = 0; i < c.length; i++) c[i] = Math.random() * 2 - 1; } const s = ac.createBufferSource(), f = ac.createBiquadFilter(), g = ac.createGain(), t = ac.currentTime; s.buffer = nbuf; f.type = "bandpass"; f.frequency.value = freq || 1500; g.gain.setValueAtTime(vol || .1, t); g.gain.exponentialRampToValueAtTime(.001, t + d); s.connect(f); f.connect(g); g.connect(master); s.start(t); s.stop(t + d); }
  const T0 = () => ac ? ac.currentTime : 0;
  const sfx = {
    hop() { tone(520 + Math.random() * 80, .08, "sine", .08, 0, 900); },
    dice() { noise(.05, .08, 2500); },
    land() { tone(330, .12, "triangle", .1); },
    coin() { const t = T0(); tone(988, .07, "square", .04, t); tone(1319, .16, "square", .04, t + .07); },
    lose() { const t = T0(); tone(392, .14, "triangle", .1, t); tone(294, .25, "triangle", .1, t + .12); },
    star() { const t = T0(); [523, 659, 784, 1047, 1319, 1568].forEach((f, i) => tone(f, .25, "triangle", .1, t + i * .08)); },
    card() { noise(.12, .06, 4000); tone(700, .1, "sine", .06, 0, 1200); },
    whoosh() { noise(.5, .14, 900); tone(200, .5, "sine", .06, 0, 800); },
    pop() { tone(900, .08, "square", .05, 0, 200); noise(.06, .08, 3000); },
    tick() { tone(1200, .03, "square", .03); },
    go() { const t = T0(); tone(660, .12, "square", .05, t); tone(880, .2, "square", .05, t + .12); },
    win() { const t = T0(); [[523, 0], [659, .15], [784, .3], [1047, .45], [880, .7], [1047, .85], [1319, 1.05]].forEach(([f, d]) => { tone(f, .3, "triangle", .12, t + d); tone(f / 2, .3, "sine", .08, t + d); }); }
  };
  const mf = (m) => 440 * Math.pow(2, (m - 69) / 12);
  const SONGS = {
    board: { bpm: 108, lead: [72, 0, 76, 79, 0, 76, 74, 72, 74, 0, 77, 81, 0, 79, 77, 76, 72, 0, 76, 79, 84, 0, 81, 79, 77, 76, 74, 71, 72, 0, 0, 0], bass: [48, 0, 55, 0, 52, 0, 55, 0, 50, 0, 57, 0, 53, 0, 57, 0, 48, 0, 55, 0, 52, 0, 57, 0, 53, 0, 55, 0, 48, 0, 43, 0] },
    mini: { bpm: 150, lead: [76, 79, 76, 72, 74, 76, 74, 71, 72, 74, 76, 79, 81, 79, 76, 0, 76, 79, 76, 72, 74, 76, 79, 81, 83, 81, 79, 76, 79, 0, 0, 0], bass: [48, 60, 48, 60, 43, 55, 43, 55, 45, 57, 45, 57, 41, 53, 43, 55, 48, 60, 48, 60, 43, 55, 43, 55, 45, 57, 41, 53, 43, 55, 48, 0] }
  };
  let song = null, st = 0, nxt = 0, mt = null;
  function music(n) { if (song === n) return; song = n; st = 0; if (ac) nxt = ac.currentTime + .1; if (!mt) mt = setInterval(tickM, 90); }
  function tickM() {
    if (!ac || !song || muted) { if (ac) nxt = Math.max(nxt, ac.currentTime); return; }
    const s = SONGS[song], d = 60 / s.bpm / 2; if (nxt < ac.currentTime) nxt = ac.currentTime + .02;
    while (nxt < ac.currentTime + .3) { const i = st % s.lead.length; if (s.lead[i]) { tone(mf(s.lead[i]), d * 1.6, "sine", .05, nxt, 0, mg); tone(mf(s.lead[i]) * 2, d * .6, "triangle", .012, nxt, 0, mg); } if (s.bass[i]) tone(mf(s.bass[i]), d * .9, "triangle", .08, nxt, 0, mg); st++; nxt += d; }
  }

  /* ---------- hayvanlar ---------- */
  const ANIMALS = [
    { id: "tavsan", name: "Tavşan" }, { id: "ayi", name: "Ayı" }, { id: "kedi", name: "Kedi" },
    { id: "penguen", name: "Penguen" }, { id: "tilki", name: "Tilki" }, { id: "kurbaga", name: "Kurbağa" }
  ];
  const PCOL = ["#E8463F", "#2E86DE", "#3FA34D", "#F2A516"];
  const OL = "#2A1E3A";
  function circle(c, x, y, r, fill, line) { c.beginPath(); c.arc(x, y, r, 0, Math.PI * 2); if (fill) { c.fillStyle = fill; c.fill(); } if (line) { c.strokeStyle = OL; c.lineWidth = line; c.stroke(); } }
  function ell(c, x, y, rx, ry, rot, fill, line) { c.beginPath(); c.ellipse(x, y, rx, ry, rot || 0, 0, Math.PI * 2); if (fill) { c.fillStyle = fill; c.fill(); } if (line) { c.strokeStyle = OL; c.lineWidth = line; c.stroke(); } }
  // r: kafa yarıçapı; mood: 0 normal, 1 mutlu, -1 üzgün
  function animal(c, kind, x, y, r, mood, blink) {
    const lw = Math.max(1.5, r * .09);
    c.save(); c.translate(x, y); c.lineJoin = "round";
    const eyes = (ex, ey, er, col) => { if (blink) { c.strokeStyle = OL; c.lineWidth = lw; for (const s of [-1, 1]) { c.beginPath(); c.moveTo(s * ex - er, ey); c.lineTo(s * ex + er, ey); c.stroke(); } return; } for (const s of [-1, 1]) { circle(c, s * ex, ey, er, col || OL); circle(c, s * ex + er * .35, ey - er * .35, er * .38, "#fff"); } };
    const mouth = (my, w) => { c.strokeStyle = OL; c.lineWidth = lw; c.beginPath(); if (mood > 0) c.arc(0, my - w * .3, w, .2 * Math.PI, .8 * Math.PI); else if (mood < 0) c.arc(0, my + w * .9, w * .8, 1.25 * Math.PI, 1.75 * Math.PI); else { c.moveTo(-w * .6, my); c.quadraticCurveTo(0, my + w * .5, w * .6, my); } c.stroke(); };
    const cheeks = (cx, cy) => { c.globalAlpha = .45; ell(c, -cx, cy, r * .16, r * .1, 0, "#FF7AA2"); ell(c, cx, cy, r * .16, r * .1, 0, "#FF7AA2"); c.globalAlpha = 1; };
    if (kind === "tavsan") {
      for (const s of [-1, 1]) { ell(c, s * r * .42, -r * 1.15, r * .26, r * .7, s * .15, "#F7F3FA", lw); ell(c, s * r * .42, -r * 1.1, r * .12, r * .48, s * .15, "#FFB3C8"); }
      circle(c, 0, 0, r, "#F7F3FA", lw); eyes(r * .38, -r * .1, r * .14); ell(c, 0, r * .22, r * .12, r * .08, 0, "#FF7AA2"); cheeks(r * .6, r * .25); mouth(r * .42, r * .2);
      c.fillStyle = "#fff"; c.fillRect(-r * .09, r * .45, r * .08, r * .14); c.fillRect(r * .01, r * .45, r * .08, r * .14);
    } else if (kind === "ayi") {
      for (const s of [-1, 1]) { circle(c, s * r * .72, -r * .72, r * .33, "#9A6234", lw); circle(c, s * r * .72, -r * .72, r * .17, "#D9A877"); }
      circle(c, 0, 0, r, "#9A6234", lw); ell(c, 0, r * .3, r * .45, r * .34, 0, "#E2B98A"); eyes(r * .38, -r * .15, r * .13); ell(c, 0, r * .14, r * .16, r * .11, 0, OL); mouth(r * .42, r * .18); cheeks(r * .66, r * .2);
    } else if (kind === "kedi") {
      for (const s of [-1, 1]) { c.beginPath(); c.moveTo(s * r * .85, -r * .35); c.lineTo(s * r * .72, -r * 1.12); c.lineTo(s * r * .2, -r * .82); c.closePath(); c.fillStyle = "#F29A38"; c.fill(); c.strokeStyle = OL; c.lineWidth = lw; c.stroke(); c.beginPath(); c.moveTo(s * r * .7, -r * .55); c.lineTo(s * r * .66, -r * .95); c.lineTo(s * r * .38, -r * .78); c.fillStyle = "#FFC3A0"; c.fill(); }
      circle(c, 0, 0, r, "#F29A38", lw);
      c.strokeStyle = "#C96A1A"; c.lineWidth = lw * 1.2; for (const dx of [-.25, 0, .25]) { c.beginPath(); c.moveTo(r * dx, -r * .95); c.lineTo(r * dx, -r * .65); c.stroke(); }
      ell(c, 0, r * .3, r * .42, r * .3, 0, "#FFE3C8"); eyes(r * .38, -r * .12, r * .14, "#2F7A3A"); c.beginPath(); c.moveTo(-r * .1, r * .12); c.lineTo(r * .1, r * .12); c.lineTo(0, r * .24); c.closePath(); c.fillStyle = "#FF7AA2"; c.fill();
      c.strokeStyle = OL; c.lineWidth = lw * .6; for (const s of [-1, 1]) for (const dy of [-.05, .1]) { c.beginPath(); c.moveTo(s * r * .3, r * (.25 + dy)); c.lineTo(s * r * 1.05, r * (.18 + dy * 2)); c.stroke(); }
      mouth(r * .42, r * .16);
    } else if (kind === "penguen") {
      circle(c, 0, 0, r, "#2B3346", lw); ell(c, -r * .3, r * .1, r * .42, r * .55, 0, "#F7F3FA"); ell(c, r * .3, r * .1, r * .42, r * .55, 0, "#F7F3FA"); ell(c, 0, r * .3, r * .5, r * .45, 0, "#F7F3FA");
      eyes(r * .3, -r * .05, r * .13); c.beginPath(); c.moveTo(-r * .2, r * .2); c.lineTo(r * .2, r * .2); c.lineTo(0, r * .45); c.closePath(); c.fillStyle = "#FF9A2E"; c.fill(); c.strokeStyle = OL; c.lineWidth = lw * .7; c.stroke(); cheeks(r * .6, r * .32);
      c.beginPath(); c.arc(0, 0, r, 0, Math.PI * 2); c.strokeStyle = OL; c.lineWidth = lw; c.stroke();
    } else if (kind === "tilki") {
      for (const s of [-1, 1]) { c.beginPath(); c.moveTo(s * r * .9, -r * .2); c.lineTo(s * r * .78, -r * 1.25); c.lineTo(s * r * .15, -r * .8); c.closePath(); c.fillStyle = "#E8632A"; c.fill(); c.strokeStyle = OL; c.lineWidth = lw; c.stroke(); c.beginPath(); c.moveTo(s * r * .8, -r * 1.2); c.lineTo(s * r * .72, -r * .95); c.lineTo(s * r * .58, -r * 1.02); c.fillStyle = OL; c.fill(); }
      circle(c, 0, 0, r, "#E8632A", lw);
      c.beginPath(); c.moveTo(-r * .95, r * .1); c.quadraticCurveTo(-r * .4, r * .1, 0, r * .95); c.quadraticCurveTo(r * .4, r * .1, r * .95, r * .1); c.quadraticCurveTo(r * .8, r * .8, 0, r); c.quadraticCurveTo(-r * .8, r * .8, -r * .95, r * .1); c.fillStyle = "#FFF3E6"; c.fill();
      eyes(r * .36, -r * .12, r * .13); ell(c, 0, r * .42, r * .12, r * .09, 0, OL); mouth(r * .6, r * .12);
      c.beginPath(); c.arc(0, 0, r, 0, Math.PI * 2); c.strokeStyle = OL; c.lineWidth = lw; c.stroke();
    } else if (kind === "kurbaga") {
      for (const s of [-1, 1]) { circle(c, s * r * .5, -r * .62, r * .36, "#5CC25A", lw); circle(c, s * r * .5, -r * .65, r * .24, "#fff"); if (!blink) circle(c, s * r * .5, -r * .62, r * .13, OL); else { c.strokeStyle = OL; c.lineWidth = lw; c.beginPath(); c.moveTo(s * r * .5 - r * .18, -r * .62); c.lineTo(s * r * .5 + r * .18, -r * .62); c.stroke(); } }
      ell(c, 0, r * .05, r * 1.08, r * .85, 0, "#5CC25A", lw); for (const s of [-1, 1]) circle(c, s * r * .5, -r * .62, r * .24, "#fff"); for (const s of [-1, 1]) if (!blink) circle(c, s * r * .5, -r * .6, r * .12, OL);
      c.strokeStyle = OL; c.lineWidth = lw; c.beginPath(); if (mood < 0) c.arc(0, r * .7, r * .45, 1.2 * Math.PI, 1.8 * Math.PI); else c.arc(0, r * .05, r * .6, .15 * Math.PI, .85 * Math.PI); c.stroke(); cheeks(r * .7, r * .3);
      circle(c, -r * .1, -r * .05, r * .04, OL); circle(c, r * .1, -r * .05, r * .04, OL);
    }
    c.restore();
  }
  // piyon: gövde + kafa
  function token(c, p, x, y, z, s, mood, blink) {
    s = s || 1;
    c.save(); c.translate(x, y);
    c.globalAlpha = .3; ell(c, 0, 2, 15 * s * Math.max(.2, 1 - z / 120), 6 * s * Math.max(.2, 1 - z / 120), 0, "#000"); c.globalAlpha = 1;
    c.translate(0, -z);
    ell(c, 0, 0, 14 * s, 6 * s, 0, PCOL[p.ci], 2);
    c.beginPath(); c.moveTo(-9 * s, -2 * s); c.quadraticCurveTo(-10 * s, -18 * s, 0, -20 * s); c.quadraticCurveTo(10 * s, -18 * s, 9 * s, -2 * s); c.closePath(); c.fillStyle = PCOL[p.ci]; c.fill(); c.strokeStyle = OL; c.lineWidth = 2; c.stroke();
    c.globalAlpha = .25; ell(c, -4 * s, -12 * s, 3 * s, 5 * s, 0, "#fff"); c.globalAlpha = 1;
    animal(c, p.animal, 0, -30 * s, 13 * s, mood, blink);
    c.restore();
  }

  /* ---------- tahta ---------- */
  const N = 32, NODES = [];
  const TYPES = ["start", "blue", "blue", "event", "red", "blue", "gift", "blue", "blue", "event", "red", "blue", "storm", "blue", "event", "blue", "blue", "red", "event", "blue", "gift", "blue", "red", "event", "blue", "storm", "blue", "event", "red", "blue", "gift", "blue"];
  for (let i = 0; i < N; i++) {
    const a = Math.PI / 2 + i / N * Math.PI * 2, wob = 1 + .06 * Math.sin(a * 3 + .5);
    NODES.push({ id: i, x: Math.round(CX + Math.cos(a) * 375 * wob), y: Math.round(CY + 18 + Math.sin(a) * 215 * wob), type: TYPES[i], next: [(i + 1) % N] });
  }
  // kısa yol: 8 → 32..35 → 16
  const J = 8, RJ = 16, SC = ["red", "event", "red", "gift"];
  for (let k = 0; k < 4; k++) {
    const t = (k + 1) / 5, a = NODES[J], b = NODES[RJ], mx = CX - 150, my = CY + 10;
    const x = (1 - t) * (1 - t) * a.x + 2 * (1 - t) * t * mx + t * t * b.x, y = (1 - t) * (1 - t) * a.y + 2 * (1 - t) * t * my + t * t * b.y;
    NODES.push({ id: N + k, x: Math.round(x), y: Math.round(y), type: SC[k], next: [k < 3 ? N + k + 1 : RJ], short: 1 });
  }
  NODES[J].next = [J + 1, N];
  const TCOL = { start: ["#3FA34D", "#1F6A2A"], blue: ["#3E8EDE", "#1E5A9E"], red: ["#E04848", "#9A2626"], event: ["#F2B530", "#A0700A"], gift: ["#9B59D0", "#5E2A8E"], storm: ["#5B6478", "#2E3446"] };

  let boardCv = null;
  const hash = (a, b) => { let h = (a * 374761393 + b * 668265263) | 0; h = (h ^ (h >>> 13)) * 1274126177; return ((h ^ (h >>> 16)) >>> 0) / 4294967295; };
  function islandPath(c, s) {
    c.beginPath();
    for (let i = 0; i <= 120; i++) { const a = i / 120 * Math.PI * 2, r = 1 + .045 * Math.sin(a * 5 + 1) + .03 * Math.sin(a * 9 + 2) + .02 * Math.sin(a * 13); const x = CX + Math.cos(a) * 440 * r * s, y = CY + 22 + Math.sin(a) * 262 * r * s; i ? c.lineTo(x, y) : c.moveTo(x, y); }
    c.closePath();
  }
  function palm(c, x, y, s, flip) {
    c.save(); c.translate(x, y); c.scale(flip ? -s : s, s);
    c.globalAlpha = .25; ell(c, 8, 2, 16, 5, 0, "#000"); c.globalAlpha = 1;
    c.strokeStyle = "#7A4A26"; c.lineWidth = 6; c.lineCap = "round"; c.beginPath(); c.moveTo(0, 0); c.quadraticCurveTo(-4, -22, 6, -42); c.stroke();
    c.strokeStyle = "#A0673A"; c.lineWidth = 2; for (let i = 0; i < 6; i++) { const t = i / 6; c.beginPath(); c.moveTo(-2 + t * 7, -t * 40 - 2); c.lineTo(3 + t * 7, -t * 40 - 4); c.stroke(); }
    for (let i = 0; i < 6; i++) { const a = -Math.PI + i * Math.PI / 5 + .1; c.save(); c.translate(6, -42); c.rotate(a); c.fillStyle = i % 2 ? "#2E8A3A" : "#3FA34D"; c.beginPath(); c.moveTo(0, 0); c.quadraticCurveTo(14, -8, 28, 4); c.quadraticCurveTo(14, 2, 0, 0); c.fill(); c.restore(); }
    circle(c, 4, -40, 3, "#7A4A26"); circle(c, 9, -39, 3, "#8A5A2B");
    c.restore();
  }
  function hut(c, x, y) {
    c.save(); c.translate(x, y); c.globalAlpha = .25; ell(c, 0, 2, 24, 6, 0, "#000"); c.globalAlpha = 1;
    c.fillStyle = "#C98A4A"; c.fillRect(-18, -20, 36, 22); c.strokeStyle = OL; c.lineWidth = 2; c.strokeRect(-18, -20, 36, 22);
    c.fillStyle = "#6E4A26"; c.fillRect(-5, -12, 10, 14);
    c.beginPath(); c.moveTo(-26, -18); c.lineTo(0, -40); c.lineTo(26, -18); c.closePath(); c.fillStyle = "#E3C27A"; c.fill(); c.stroke();
    c.strokeStyle = "#B8964A"; c.lineWidth = 1.5; for (let i = -2; i <= 2; i++) { c.beginPath(); c.moveTo(i * 5, -36 + Math.abs(i) * 2); c.lineTo(i * 10, -19); c.stroke(); }
    c.restore();
  }
  function renderBoard() {
    const c = document.createElement("canvas"); c.width = W; c.height = H; const x = c.getContext("2d");
    const g = x.createRadialGradient(CX, CY, 100, CX, CY, 620); g.addColorStop(0, "#3AB5E8"); g.addColorStop(.6, "#1F8AC9"); g.addColorStop(1, "#155C94"); x.fillStyle = g; x.fillRect(0, 0, W, H);
    // sığ su halkası
    islandPath(x, 1.1); x.fillStyle = "rgba(140,230,240,.45)"; x.fill();
    islandPath(x, 1.04); x.fillStyle = "#F2D58A"; x.fill();
    islandPath(x, .985); x.fillStyle = "#E8C677"; x.fill();
    islandPath(x, .955); const gg = x.createRadialGradient(CX, CY, 40, CX, CY, 420); gg.addColorStop(0, "#7CCB5E"); gg.addColorStop(1, "#4FA845"); x.fillStyle = gg; x.fill();
    x.save(); islandPath(x, .95); x.clip();
    for (let i = 0; i < 600; i++) { const px = hash(i, 1) * W, py = hash(i, 2) * H; x.fillStyle = i % 3 ? "rgba(40,110,40,.25)" : "rgba(200,240,150,.25)"; x.fillRect(px, py, 2, 4); }
    // nehir
    x.strokeStyle = "#5EC8F0"; x.lineWidth = 16; x.lineCap = "round"; x.beginPath(); x.moveTo(CX + 30, CY - 10); x.bezierCurveTo(CX - 60, CY + 40, CX - 200, CY - 30, CX - 300, CY - 180); x.stroke();
    x.strokeStyle = "#9FE3FA"; x.lineWidth = 4; x.stroke();
    // göl
    ell(x, CX + 30, CY - 6, 62, 30, 0, "#5EC8F0"); ell(x, CX + 30, CY - 8, 54, 24, 0, "#7FD8F6"); ell(x, CX + 14, CY - 14, 16, 5, 0, "rgba(255,255,255,.6)");
    x.restore();
    // yanardağ
    x.save(); x.translate(CX + 190, CY - 50);
    x.globalAlpha = .25; ell(x, 0, 30, 90, 18, 0, "#000"); x.globalAlpha = 1;
    x.beginPath(); x.moveTo(-90, 30); x.lineTo(-22, -60); x.lineTo(22, -60); x.lineTo(90, 30); x.closePath(); x.fillStyle = "#8A6A55"; x.fill(); x.strokeStyle = OL; x.lineWidth = 2.5; x.stroke();
    x.beginPath(); x.moveTo(0, 30); x.lineTo(22, -60); x.lineTo(90, 30); x.closePath(); x.fillStyle = "#6E5444"; x.fill();
    x.beginPath(); x.moveTo(-22, -60); x.quadraticCurveTo(-10, -30, -18, -10); x.lineTo(-8, -20); x.quadraticCurveTo(0, -40, 4, -60); x.closePath(); x.fillStyle = "#FF7A2E"; x.fill();
    ell(x, 0, -60, 22, 6, 0, "#FF5A1F", 2); ell(x, 0, -61, 14, 3, 0, "#FFD23F");
    x.restore();
    // kale kalıntısı
    x.save(); x.translate(CX + 40, CY - 96); x.fillStyle = "#B8B0A8"; x.strokeStyle = OL; x.lineWidth = 2;
    x.fillRect(-40, -30, 80, 34); x.strokeRect(-40, -30, 80, 34); for (let i = 0; i < 5; i++) { x.fillRect(-40 + i * 18, -40, 10, 10); x.strokeRect(-40 + i * 18, -40, 10, 10); }
    x.fillStyle = "#6E5A4A"; x.beginPath(); x.moveTo(-8, 4); x.lineTo(-8, -12); x.arc(0, -12, 8, Math.PI, 0); x.lineTo(8, 4); x.fill();
    x.fillStyle = "#8E867E"; for (let i = 0; i < 6; i++) x.fillRect(-34 + (i % 3) * 24, -24 + Math.floor(i / 3) * 12, 12, 4);
    x.strokeStyle = "#7A4A26"; x.lineWidth = 2; x.beginPath(); x.moveTo(30, -40); x.lineTo(30, -66); x.stroke(); x.fillStyle = "#E8463F"; x.beginPath(); x.moveTo(30, -66); x.lineTo(48, -60); x.lineTo(30, -54); x.fill();
    x.restore();
    // liman: iskele + tekne (başlangıç)
    const s0 = NODES[0];
    x.fillStyle = "#8A5A2B"; x.fillRect(s0.x - 8, s0.y + 22, 16, 60); for (let i = 0; i < 6; i++) { x.fillStyle = i % 2 ? "#B07A40" : "#9A6A34"; x.fillRect(s0.x - 12, s0.y + 26 + i * 10, 24, 8); }
    x.save(); x.translate(s0.x + 46, s0.y + 66); x.fillStyle = "#C8463F"; x.beginPath(); x.moveTo(-28, 0); x.lineTo(28, 0); x.lineTo(20, 12); x.lineTo(-20, 12); x.closePath(); x.fill(); x.strokeStyle = OL; x.lineWidth = 2; x.stroke(); x.strokeStyle = "#6E4A26"; x.beginPath(); x.moveTo(0, 0); x.lineTo(0, -40); x.stroke(); x.fillStyle = "#FFF9EC"; x.beginPath(); x.moveTo(2, -38); x.lineTo(24, -6); x.lineTo(2, -6); x.closePath(); x.fill(); x.stroke(); x.restore();
    // kulübeler, palmiyeler, çiçekler
    hut(x, CX - 120, CY + 150); hut(x, CX + 110, CY + 160);
    const palms = [[CX - 330, CY - 40], [CX - 230, CY + 120], [CX + 320, CY + 60], [CX + 260, CY - 170], [CX - 250, CY - 120], [CX + 40, CY + 120], [CX - 20, CY + 60], [CX + 340, CY - 60], [CX - 160, CY + 190], [CX + 200, CY + 120]];
    palms.forEach(([px, py], i) => palm(x, px, py, .9 + hash(i, 4) * .3, i % 2));
    for (let i = 0; i < 70; i++) { const px = CX + (hash(i, 7) - .5) * 640, py = CY + (hash(i, 8) - .5) * 360; if (Math.hypot((px - CX) / 330, (py - CY - 18) / 190) > 1.12 || Math.hypot((px - CX) / 290, (py - CY - 18) / 160) < 1 && hash(i, 9) < .5) continue; circle(x, px, py, 2.5, ["#FF7AA2", "#FFD23F", "#fff", "#B98CFF"][i % 4]); circle(x, px, py, 1, "#E8A317"); }
    // yollar
    x.lineCap = "round"; x.lineJoin = "round";
    const link = (a, b, col, w) => { x.strokeStyle = col; x.lineWidth = w; x.beginPath(); x.moveTo(a.x, a.y); x.lineTo(b.x, b.y); x.stroke(); };
    for (const n of NODES) for (const m of n.next) link(n, NODES[m], "#C9A15A", 18);
    for (const n of NODES) for (const m of n.next) link(n, NODES[m], "#EED9A0", 11);
    for (const n of NODES) for (const m of n.next) { const b = NODES[m]; x.fillStyle = "#C9A15A"; for (let t = .25; t < 1; t += .25) circle(x, n.x + (b.x - n.x) * t, n.y + (b.y - n.y) * t, 1.6, "#C9A15A"); }
    // köprü (kısa yol nehri geçer)
    const bn = NODES[N + 1], bm = NODES[N + 2]; x.save(); x.translate((bn.x + bm.x) / 2, (bn.y + bm.y) / 2); x.rotate(Math.atan2(bm.y - bn.y, bm.x - bn.x)); x.fillStyle = "#8A5A2B"; x.fillRect(-20, -12, 40, 24); for (let i = 0; i < 5; i++) { x.fillStyle = i % 2 ? "#B07A40" : "#9A6A34"; x.fillRect(-18 + i * 8, -11, 6, 22); } x.fillStyle = "#6E4A26"; x.fillRect(-20, -13, 40, 3); x.fillRect(-20, 10, 40, 3); x.restore();
    // kareler
    for (const n of NODES) drawSpace(x, n);
    return c;
  }
  function drawSpace(x, n) {
    const [c1, c2] = TCOL[n.type], r = n.type === "start" ? 24 : 19;
    x.globalAlpha = .3; ell(x, n.x, n.y + 5, r + 1, r * .55, 0, "#000"); x.globalAlpha = 1;
    circle(x, n.x, n.y + 2, r, c2); circle(x, n.x, n.y, r, c1); x.strokeStyle = OL; x.lineWidth = 2; x.beginPath(); x.arc(n.x, n.y, r, 0, Math.PI * 2); x.stroke();
    x.globalAlpha = .3; ell(x, n.x - r * .3, n.y - r * .4, r * .45, r * .25, -.5, "#fff"); x.globalAlpha = 1;
    x.fillStyle = "#fff"; x.strokeStyle = c2; x.lineWidth = 3; x.textAlign = "center"; x.textBaseline = "middle";
    if (n.type === "blue" || n.type === "red") { coinIcon(x, n.x - 4, n.y, 7); x.font = "800 13px Rubik, sans-serif"; x.fillStyle = "#fff"; x.strokeStyle = OL; x.lineWidth = 3; const s = n.type === "blue" ? "+" : "−"; x.strokeText(s, n.x + 9, n.y); x.fillText(s, n.x + 9, n.y); }
    else if (n.type === "event") { x.font = "800 22px Fredoka, Rubik, sans-serif"; x.strokeStyle = OL; x.lineWidth = 4; x.strokeText("?", n.x, n.y + 1); x.fillText("?", n.x, n.y + 1); }
    else if (n.type === "gift") giftIcon(x, n.x, n.y, 9);
    else if (n.type === "storm") { x.strokeStyle = "#fff"; x.lineWidth = 2.5; x.beginPath(); for (let i = 0; i < 40; i++) { const a = i * .35, rr = 1 + i * .3; i ? x.lineTo(n.x + Math.cos(a) * rr, n.y + Math.sin(a) * rr) : x.moveTo(n.x, n.y); } x.stroke(); }
    else if (n.type === "start") { x.font = "700 11px Fredoka, Rubik, sans-serif"; x.fillStyle = "#fff"; x.strokeStyle = OL; x.lineWidth = 3; x.strokeText("LİMAN", n.x, n.y + 1); x.fillText("LİMAN", n.x, n.y + 1); }
  }
  function coinIcon(x, cx, cy, r) { circle(x, cx, cy + 1, r, "#B07A10"); circle(x, cx, cy, r, "#FFD23F"); x.strokeStyle = "#B07A10"; x.lineWidth = 1.5; x.beginPath(); x.arc(cx, cy, r * .62, 0, Math.PI * 2); x.stroke(); x.fillStyle = "#FFF3B0"; x.fillRect(cx - r * .5, cy - r * .55, r * .3, r * .3); }
  function giftIcon(x, cx, cy, s) { x.fillStyle = "#FF7AA2"; x.fillRect(cx - s, cy - s * .5, s * 2, s * 1.5); x.strokeStyle = OL; x.lineWidth = 1.5; x.strokeRect(cx - s, cy - s * .5, s * 2, s * 1.5); x.fillStyle = "#FFD23F"; x.fillRect(cx - s * .2, cy - s * .5, s * .4, s * 1.5); x.fillStyle = "#FF5A8A"; x.fillRect(cx - s * 1.1, cy - s * .8, s * 2.2, s * .4); x.fillStyle = "#FFD23F"; ell(x, cx - s * .4, cy - s, s * .4, s * .3, -.4, "#FFD23F"); ell(x, cx + s * .4, cy - s, s * .4, s * .3, .4, "#FFD23F"); }
  function starPath(x, cx, cy, R, r) { x.beginPath(); for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5, rr = i % 2 ? r : R; x.lineTo(cx + Math.cos(a) * rr, cy + Math.sin(a) * rr); } x.closePath(); }
  function starIcon(x, cx, cy, R) { starPath(x, cx, cy + R * .08, R, R * .45); x.fillStyle = "#B07A10"; x.fill(); starPath(x, cx, cy, R, R * .45); x.fillStyle = "#FFD23F"; x.fill(); x.strokeStyle = OL; x.lineWidth = Math.max(1.5, R * .1); x.stroke(); x.fillStyle = "#FFF6C4"; ell(x, cx - R * .2, cy - R * .25, R * .18, R * .1, -.5, "#FFF6C4"); }

  /* ---------- oyun durumu ---------- */
  let G = null; // {players, round, rounds, turn, star, mini}
  const ITEMS = {
    zar2: { name: "Çift Zar", desc: "İki zar atarsın!", icon: "🎲" },
    kalkan: { name: "Kalkan", desc: "Bir sonraki kötü şeyi engeller.", icon: "🛡️" },
    pusula: { name: "Yıldız Pusulası", desc: "Seni yıldızın hemen önüne ışınlar.", icon: "🧭" }
  };
  function saveGame() { try { localStorage.setItem(SAVE, JSON.stringify(G)); } catch (e) {} }
  function loadGame() { try { const s = JSON.parse(localStorage.getItem(SAVE) || "null"); if (s && s.players && s.round) return s; } catch (e) {} return null; }
  const vis = []; // görsel piyon konumları {x,y,z}
  function placeAll() { G.players.forEach((p, i) => { const v = vis[i] || (vis[i] = { x: 0, y: 0, z: 0, mood: 0, bl: rnd(2, 5) }); const o = slotOff(p.node, i); v.x = NODES[p.node].x + o[0]; v.y = NODES[p.node].y + o[1]; v.z = 0; }); }
  function slotOff(node, i) {
    const same = G.players.map((p, j) => j).filter((j) => G.players[j].node === node); if (same.length <= 1) return [0, 4];
    const k = same.indexOf(i), n = same.length, a = -Math.PI / 2 + k / n * Math.PI * 2; return [Math.round(Math.cos(a) * 14), Math.round(Math.sin(a) * 8) + 4];
  }

  /* ---------- zaman yardımcıları ---------- */
  let fast = false;
  const tweens = [];
  function wait(ms) { if (fast) return Promise.resolve(); return new Promise((r) => tweens.push({ t: 0, d: ms / 1000, done: r })); }
  function tween(ms, fn) { if (fast) { fn(1); return Promise.resolve(); } return new Promise((r) => tweens.push({ t: 0, d: ms / 1000, fn, done: r })); }
  function stepTweens(dt) { for (let i = tweens.length - 1; i >= 0; i--) { const w = tweens[i]; w.t += dt; const k = Math.min(1, w.t / w.d); if (w.fn) w.fn(k); if (k >= 1) { tweens.splice(i, 1); w.done(); } } }

  /* ---------- efektler ---------- */
  let parts = [], floaters = [], clock = 0, dice = null, banner = null;
  function burst(x, y, cols, n, sp) { for (let i = 0; i < n; i++) { const a = rnd(0, 7), s = rnd(40, sp || 160); parts.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s - 60, life: rnd(.6, 1.2), c: pick(cols), s: rnd(3, 6), g: 1, r: rnd(0, 6) }); } }
  function floater(x, y, text, col) { floaters.push({ x, y, text, col, t: 0 }); }

  /* ---------- modal & seçim ---------- */
  const modal = $("modal");
  function card(opt) {
    // opt: {title, text, art(fn), color, buttons:[label], cpu: index or null, cpuDelay}
    return new Promise((res) => {
      $("mTitle").textContent = opt.title; $("mText").textContent = opt.text || ""; $("card").style.setProperty("--cc", opt.color || "#FFD23F");
      const ca = $("cardArt"), x = ca.getContext("2d"); x.clearRect(0, 0, ca.width, ca.height); ca.hidden = !opt.art; if (opt.art) opt.art(x, ca.width, ca.height);
      const bx = $("mBtns"); bx.innerHTML = "";
      let doneF = false; const finish = (i) => { if (doneF) return; doneF = true; modal.hidden = true; res(i); };
      (opt.buttons || ["Tamam"]).forEach((b, i) => { const e = document.createElement("button"); e.type = "button"; e.className = "btn" + (i === 0 ? " go" : ""); e.textContent = b; e.onclick = () => { sfx.tick(); finish(i); }; bx.appendChild(e); });
      modal.hidden = false;
      if (fast) { finish(opt.cpu != null ? opt.cpu : 0); return; }
      if (opt.cpu != null) setTimeout(() => finish(opt.cpu), opt.cpuDelay || 1600);
      else { const f = bx.querySelector("button"); f && f.focus(); }
    });
  }

  /* ---------- oyuncu paneli ---------- */
  function avatarCanvas(p, size, mood) { const c = document.createElement("canvas"); c.width = c.height = size * 2; const x = c.getContext("2d"); x.scale(2, 2); circle(x, size / 2, size / 2, size / 2 - 1, PCOL[p.ci]); animal(x, p.animal, size / 2, size / 2 + size * .08, size * .3, mood || 0); return c; }
  function renderPlayers() {
    const box = $("pl"); box.innerHTML = "";
    if (!G) return;
    G.players.forEach((p, i) => {
      const d = document.createElement("div"); d.className = "pcard" + (i === G.turn && !G.mini ? " on" : ""); d.style.setProperty("--pc", PCOL[p.ci]);
      d.appendChild(avatarCanvas(p, 38));
      const t = document.createElement("div"); t.innerHTML = "<div class='nm'></div><div class='sc'><span class='st'>★ " + p.stars + "</span><span class='co'>● " + p.coins + "</span>" + (p.item ? "<span class='it' title='" + ITEMS[p.item].name + "'>" + ITEMS[p.item].icon + "</span>" : "") + (p.shield ? "" : "") + "</div>";
      t.querySelector(".nm").textContent = p.name + (p.cpu ? " 🤖" : ""); d.appendChild(t); box.appendChild(d);
    });
    const rt = $("roundTag"); rt.hidden = false; rt.textContent = "Tur " + Math.min(G.round, G.rounds) + " / " + G.rounds;
  }

  /* ---------- tur akışı ---------- */
  let rollWait = null;
  function waitRoll(p) {
    return new Promise((res) => {
      const tb = $("turnbar"); tb.hidden = false; tb.style.setProperty("--pc", PCOL[p.ci]);
      const av = $("turnAv"), ax = av.getContext("2d"); ax.clearRect(0, 0, 64, 64); circle(ax, 32, 32, 30, PCOL[p.ci]); animal(ax, p.animal, 32, 36, 18, 1);
      $("turnName").textContent = p.name + (p.cpu ? " 🤖" : ""); $("turnSub").textContent = p.cpu ? "Bilgisayar düşünüyor..." : "Sıra sende! Zar at.";
      const ib = $("useItem"), rb = $("roll"); ib.hidden = !p.item || p.cpu; if (p.item) ib.textContent = ITEMS[p.item].icon + " " + ITEMS[p.item].name; rb.disabled = !!p.cpu; ib.disabled = !!p.cpu;
      const done = (useItem) => { rollWait = null; tb.hidden = true; res(useItem); };
      rollWait = done;
      rb.onclick = () => { audio(); done(false); }; ib.onclick = () => { audio(); done(true); };
      if (fast) { done(p.cpu ? cpuUseItem(p) : false); return; }
      if (p.cpu) setTimeout(() => done(cpuUseItem(p)), 1100); else rb.focus();
    });
  }
  function cpuUseItem(p) { if (!p.item) return false; if (p.item === "pusula") return p.coins >= STAR_COST && Math.min(...G.stars.map((s) => dist(p.node, s))) > 6; return p.item === "zar2"; }
  function dist(a, b) { // ana yol üzerinde ileri adım sayısı (yaklaşık)
    let n = a, d = 0; while (n !== b && d < 60) { n = NODES[n].next[0]; d++; } return d;
  }
  async function rollDice(n) {
    sfx.go(); const vals = [];
    for (let i = 0; i < n; i++) vals.push(ri(1, 6));
    dice = { vals: vals.map(() => 1), n, t: 0, final: false };
    if (!fast) { for (let k = 0; k < 14; k++) { dice.vals = dice.vals.map(() => ri(1, 6)); dice.rot = rnd(-.5, .5); sfx.dice(); await wait(55 + k * 6); } }
    dice.vals = vals; dice.rot = 0; dice.final = true; sfx.land();
    await wait(650);
    return vals.reduce((a, b) => a + b, 0);
  }
  async function takeTurn(i) {
    const p = G.players[i]; G.turn = i; renderPlayers();
    banner = { text: p.name, sub: "Sıra " + p.name + "'" + ek(p.name) + "!", col: PCOL[p.ci], t: 1.3 };
    await wait(600);
    const useItem = await waitRoll(p);
    let diceN = 1;
    if (useItem && p.item) {
      const it = p.item; p.item = null; renderPlayers(); sfx.card();
      if (it === "zar2") { diceN = 2; floater(vis[i].x, vis[i].y - 60, "Çift Zar!", "#FFD23F"); await wait(500); }
      else if (it === "kalkan") { p.shield = 1; floater(vis[i].x, vis[i].y - 60, "Kalkan hazır!", "#9FE3FA"); await wait(500); }
      else if (it === "pusula") { const tgt = G.stars.slice().sort((a, b) => dist(p.node, a) - dist(p.node, b))[0]; await teleport(i, prevOf(tgt)); }
    }
    const steps = await rollDice(diceN);
    dice = null;
    await move(i, steps);
    await land(i);
    G.turn = i + 1; renderPlayers(); saveGame();
  }
  const ek = (n) => { const s = n.toLocaleLowerCase("tr"), v = (s.match(/[aeıioöuü]/g) || ["e"]).pop(), back = "aıou".includes(v), hard = /[çfhkpsşt]$/.test(s); return (hard ? "t" : "d") + (back ? "a" : "e"); };
  function prevOf(node) { for (const n of NODES) if (n.next.includes(node) && !n.short && n.id < N) return n.id; return NODES.find((n) => n.next.includes(node)).id; }
  async function hopTo(i, node) {
    const v = vis[i], p = G.players[i], fx = v.x, fy = v.y; const old = p.node; p.node = node;
    const o = slotOff(node, i), tx = NODES[node].x + o[0], ty = NODES[node].y + o[1];
    sfx.hop();
    await tween(230, (k) => { v.x = fx + (tx - fx) * k; v.y = fy + (ty - fy) * k; v.z = Math.sin(k * Math.PI) * 22; });
    v.z = 0;
    // diğer piyonları yeniden diz
    G.players.forEach((q, j) => { if (j !== i && (q.node === node || q.node === old)) { const oo = slotOff(q.node, j); vis[j].x = NODES[q.node].x + oo[0]; vis[j].y = NODES[q.node].y + oo[1]; } });
  }
  async function teleport(i, node) {
    const v = vis[i]; sfx.whoosh(); burst(v.x, v.y - 20, ["#B98CFF", "#fff", "#9FE3FA"], 18);
    await tween(250, (k) => { v.z = k * 300; });
    G.players[i].node = node; G.players[i].hist = []; placeAll(); vis[i].z = 300;
    await tween(300, (k) => { vis[i].z = 300 * (1 - k); });
    burst(vis[i].x, vis[i].y - 10, ["#B98CFF", "#fff"], 12);
  }
  async function move(i, steps, silent) {
    const p = G.players[i];
    p.hist = p.hist || [];
    for (let s = 0; s < steps; s++) {
      const n = NODES[p.node]; let nx = n.next[0];
      if (n.next.length > 1) {
        const k = await card({ title: "Yol ayrımı!", text: "Köprüden kısa yol mu, sahilden uzun yol mu?\nKısa yolda kırmızı kareler var!", art: (x, w, h) => forkArt(x, w, h), color: "#F2B530", buttons: ["🌉 Kısa yol", "🏖️ Sahil yolu"], cpu: p.cpu ? (Math.random() < .5 ? 0 : 1) : null, cpuDelay: 1200 });
        nx = k === 0 ? n.next[1] : n.next[0];
      }
      p.hist.push(p.node); if (p.hist.length > 12) p.hist.shift();
      await hopTo(i, nx);
      if (!silent) floatSteps(i, steps - s - 1);
      if (nx === 0 && !silent) { p.coins += 3; sfx.coin(); floater(vis[i].x, vis[i].y - 50, "Liman +3", "#FFE9A0"); renderPlayers(); await limanShop(i); }
      if (G.stars.includes(nx)) await offerStar(i, G.stars.indexOf(nx));
    }
  }
  function floatSteps(i, left) { if (left > 0) floater(vis[i].x, vis[i].y - 56, String(left), "#fff"); }
  async function offerStar(i, si) {
    const p = G.players[i];
    if (p.coins < STAR_COST) { await card({ title: "Parlayan yıldız!", text: "Yıldız " + STAR_COST + " altın. Sende " + p.coins + " altın var.\nDaha çok altın topla!", art: starArt, color: "#FFD23F", cpu: p.cpu ? 0 : null, cpuDelay: 1200 }); return; }
    const k = await card({ title: "Yıldız!", text: STAR_COST + " altına yıldızı almak ister misin?\n(Sende " + p.coins + " altın var)", art: starArt, color: "#FFD23F", buttons: ["★ Al!", "Hayır"], cpu: p.cpu ? 0 : null, cpuDelay: 1200 });
    if (k !== 0) return;
    p.coins -= STAR_COST; p.stars++; sfx.star(); vis[i].mood = 1;
    burst(NODES[G.stars[si]].x, NODES[G.stars[si]].y - 40, ["#FFD23F", "#fff", "#FF7AA2", "#9FE3FA"], 40, 220);
    renderPlayers(); await wait(900); await moveStar(si); vis[i].mood = 0;
  }
  async function moveStar(si) {
    if (si == null) si = ri(0, G.stars.length - 1);
    const cands = NODES.filter((n) => n.type === "blue" && !G.stars.includes(n.id) && G.stars.every((s) => Math.abs(s - n.id) > 4) && !G.players.some((p) => p.node === n.id));
    if (!cands.length) cands.push(...NODES.filter((n) => n.type === "blue" && !G.stars.includes(n.id)));
    const target = pick(cands).id; starAnim = { si, from: G.stars[si], to: target, t: 0 }; sfx.whoosh();
    await tween(fast ? 1 : 1100, (k) => { starAnim.t = k; }); G.stars[si] = target; starAnim = null;
  }
  let starAnim = null;
  async function limanShop(i) {
    const p = G.players[i], cost = 2 * STAR_COST; if (p.coins < cost) return;
    const k = await card({ title: "Liman dükkânı", text: "Kaptan Martı yıldız satıyor: " + cost + " altın.\n(Sende " + p.coins + " altın var.) Alır mısın?", art: starArt, color: "#3FA34D", buttons: ["★ Al!", "Hayır"], cpu: p.cpu ? 0 : null, cpuDelay: 1200 });
    if (k !== 0) return; p.coins -= cost; p.stars++; sfx.star(); vis[i].mood = 1; burst(vis[i].x, vis[i].y - 40, ["#FFD23F", "#fff"], 30, 200); renderPlayers(); await wait(700); vis[i].mood = 0;
  }
  async function land(i) {
    const p = G.players[i], n = NODES[p.node], v = vis[i];
    if (n.type === "blue") { p.coins += 3; sfx.coin(); floater(v.x, v.y - 60, "+3", "#FFE9A0"); burst(v.x, v.y - 30, ["#FFD23F", "#FFF3B0"], 10); v.mood = 1; }
    else if (n.type === "red") { if (useShield(p)) { floater(v.x, v.y - 60, "Kalkan korudu!", "#9FE3FA"); } else { const l = Math.min(3, p.coins); p.coins -= l; sfx.lose(); floater(v.x, v.y - 60, "−" + l, "#FF9C96"); v.mood = -1; } }
    else if (n.type === "event") await eventCard(i);
    else if (n.type === "gift") await giftBox(i);
    else if (n.type === "storm") await storm(i);
    renderPlayers(); await wait(700); v.mood = 0;
  }
  function useShield(p) { if (p.shield) { p.shield = 0; sfx.card(); return true; } return false; }
  async function giftBox(i) {
    const p = G.players[i], it = pick(Object.keys(ITEMS));
    sfx.card();
    if (p.item) { const k = await card({ title: "Hediye kutusu!", text: ITEMS[it].icon + " " + ITEMS[it].name + " çıktı: " + ITEMS[it].desc + "\nÇantanda zaten " + ITEMS[p.item].name + " var. Değiştirsin mi?", art: (x, w, h) => itemArt(x, w, h, it), color: "#9B59D0", buttons: ["Değiştir", "Kalsın"], cpu: p.cpu ? 1 : null }); if (k === 0) p.item = it; }
    else { p.item = it; await card({ title: "Hediye kutusu!", text: ITEMS[it].icon + " " + ITEMS[it].name + "\n" + ITEMS[it].desc + "\nSıran gelince kullanabilirsin.", art: (x, w, h) => itemArt(x, w, h, it), color: "#9B59D0", cpu: p.cpu ? 0 : null }); }
  }
  async function storm(i) {
    const p = G.players[i], others = G.players.map((q, j) => j).filter((j) => j !== i);
    await card({ title: "Kasırga!", text: "Rüzgâr seni havaya kaldırdı...\nRastgele biriyle yer değiştireceksin!", art: stormArt, color: "#5B6478", cpu: p.cpu ? 0 : null, cpuDelay: 1300 });
    const j = pick(others), a = p.node, b = G.players[j].node; sfx.whoosh();
    await Promise.all([tween(300, (k) => { vis[i].z = k * 260; vis[j].z = k * 260; })]);
    p.node = b; G.players[j].node = a; p.hist = []; G.players[j].hist = []; placeAll(); vis[i].z = vis[j].z = 260;
    await tween(380, (k) => { vis[i].z = vis[j].z = 260 * (1 - k); });
    floater(vis[i].x, vis[i].y - 60, "Vuuu!", "#fff"); floater(vis[j].x, vis[j].y - 60, "Vuuu!", "#fff");
  }
  const EVENTS = [
    { t: "Martı arkadaşın", d: "Bir martı gagasında parlak bir altınla geldi! +5 altın", f: async (i) => give(i, 5) },
    { t: "Hindistan cevizi!", d: "Tepeden bir hindistan cevizi düştü, bonk! Biraz altın döküldü: −3", bad: 1, f: async (i) => take(i, 3) },
    { t: "Yunus yolculuğu", d: "Yunuslar seni sırtlarında taşıdı! 3 kare ileri git.", f: async (i) => { await move(i, 3, true); } },
    { t: "Ada şenliği", d: "Davullar çalıyor, herkes dans ediyor! Herkes +3 altın", f: async () => { G.players.forEach((q, j) => give(j, 3)); } },
    { t: "Cömert kalp", d: "En az altını olan oyuncuya 3 altın hediye ettin. Ne güzel!", f: async (i) => { const poor = G.players.reduce((m, q, j) => q.coins < G.players[m].coins ? j : m, 0); if (poor === i) { give(i, 3); } else { const l = Math.min(3, G.players[i].coins); G.players[i].coins -= l; give(poor, l); } } },
    { t: "Hazine haritası", d: "Kumların altında eski bir harita! İçinden bir eşya çıktı.", f: async (i) => { G.players[i].item = pick(Object.keys(ITEMS)); } },
    { t: "Yengeç!", d: "Bir yengeç ayak parmağını kıstırdı! 2 kare geri git.", bad: 1, f: async (i) => { const p = G.players[i]; for (let k = 0; k < 2 && p.hist && p.hist.length; k++) await hopTo(i, p.hist.pop()); } },
    { t: "Rüzgârlı gün", d: "Esen rüzgâr yıldızı başka bir yere uçurdu!", f: async () => { await moveStar(); } },
    { t: "Şanslı yonca", d: "Dört yapraklı yonca buldun! Şansına kaç altın çıkacak?", f: async (i) => give(i, ri(1, 8)) },
    { t: "Kayıp kumbara", d: "Liman'da bir kumbara buldun ve sahibine verdin. Teşekkür olarak +4 altın!", f: async (i) => give(i, 4) },
    { t: "Dondurma molası", d: "Çok sıcak! Herkese dondurma ısmarladın: −2 altın, ama herkes mutlu.", bad: 1, f: async (i) => take(i, 2) },
    { t: "Kuş sürüsü", d: "Kuşlar seni yıldıza doğru götürdü! 2 kare ileri.", f: async (i) => { await move(i, 2, true); } }
  ];
  function give(i, n) { G.players[i].coins += n; const v = vis[i]; sfx.coin(); floater(v.x, v.y - 60, "+" + n, "#FFE9A0"); burst(v.x, v.y - 30, ["#FFD23F"], 8); v.mood = 1; }
  function take(i, n) { const p = G.players[i], v = vis[i]; if (useShield(p)) { floater(v.x, v.y - 60, "Kalkan korudu!", "#9FE3FA"); return; } const l = Math.min(n, p.coins); p.coins -= l; sfx.lose(); floater(v.x, v.y - 60, "−" + l, "#FF9C96"); v.mood = -1; }
  async function eventCard(i) {
    const p = G.players[i], e = pick(EVENTS); sfx.card();
    await card({ title: e.t, text: e.d, art: (x, w, h) => eventArt(x, w, h, e), color: e.bad ? "#E04848" : "#F2B530", cpu: p.cpu ? 0 : null, cpuDelay: 1700 });
    await e.f(i); renderPlayers();
  }

  /* ---------- kart resimleri ---------- */
  function sky(x, w, h, c1, c2) { const g = x.createLinearGradient(0, 0, 0, h); g.addColorStop(0, c1); g.addColorStop(1, c2); x.fillStyle = g; x.beginPath(); x.roundRect ? x.roundRect(0, 0, w, h, 12) : x.rect(0, 0, w, h); x.fill(); }
  function starArt(x, w, h) { sky(x, w, h, "#2B2458", "#6A4BB8"); for (let i = 0; i < 20; i++) circle(x, hash(i, 1) * w, hash(i, 2) * h, 1, "#fff"); starIcon(x, w / 2, h / 2, 34); }
  function forkArt(x, w, h) { sky(x, w, h, "#8FD3FF", "#D6F1FF"); x.fillStyle = "#5DB34A"; x.fillRect(0, h * .55, w, h * .45); x.strokeStyle = "#EED9A0"; x.lineWidth = 12; x.lineCap = "round"; x.beginPath(); x.moveTo(w / 2, h); x.lineTo(w / 2, h * .75); x.lineTo(w * .2, h * .55); x.moveTo(w / 2, h * .75); x.lineTo(w * .85, h * .58); x.stroke(); x.fillStyle = "#8A5A2B"; x.fillRect(w / 2 - 3, h * .35, 6, h * .4); x.fillStyle = "#B07A40"; x.fillRect(w / 2 - 40, h * .3, 36, 14); x.fillRect(w / 2 + 4, h * .4, 36, 14); x.fillStyle = "#fff"; x.font = "700 10px Rubik"; x.textAlign = "center"; x.fillText("KISA", w / 2 - 22, h * .3 + 11); x.fillText("UZUN", w / 2 + 22, h * .4 + 11); }
  function stormArt(x, w, h) { sky(x, w, h, "#3B4458", "#7A8498"); x.strokeStyle = "#E9EEF4"; x.lineWidth = 4; for (let k = 0; k < 4; k++) { x.beginPath(); x.ellipse(w / 2, h * .2 + k * 20, 40 - k * 8, 8, 0, 0, Math.PI * 2); x.stroke(); } x.fillStyle = "#FFD23F"; x.beginPath(); x.moveTo(30, 20); x.lineTo(22, 50); x.lineTo(32, 48); x.lineTo(26, 76); x.lineTo(44, 40); x.lineTo(34, 42); x.lineTo(42, 20); x.fill(); }
  function itemArt(x, w, h, it) {
    sky(x, w, h, "#B98CFF", "#E9DCFF");
    if (it === "zar2") { dieFace(x, w / 2 - 26, h / 2, 22, 5, -.2); dieFace(x, w / 2 + 26, h / 2 + 4, 22, 3, .25); }
    else if (it === "kalkan") { x.save(); x.translate(w / 2, h / 2); x.beginPath(); x.moveTo(0, -36); x.lineTo(30, -26); x.quadraticCurveTo(30, 18, 0, 38); x.quadraticCurveTo(-30, 18, -30, -26); x.closePath(); x.fillStyle = "#4D8DF0"; x.fill(); x.strokeStyle = OL; x.lineWidth = 3; x.stroke(); x.fillStyle = "#FFD23F"; starPath(x, 0, 0, 14, 6); x.fill(); x.restore(); }
    else { x.save(); x.translate(w / 2, h / 2); circle(x, 0, 0, 34, "#C9A24A", 3); circle(x, 0, 0, 27, "#FFF9EC"); x.rotate(clock); x.fillStyle = "#E04848"; x.beginPath(); x.moveTo(0, -24); x.lineTo(6, 0); x.lineTo(-6, 0); x.fill(); x.fillStyle = "#3E8EDE"; x.beginPath(); x.moveTo(0, 24); x.lineTo(6, 0); x.lineTo(-6, 0); x.fill(); x.restore(); starIcon(x, w - 26, 24, 12); }
  }
  function eventArt(x, w, h, e) {
    sky(x, w, h, e.bad ? "#FFB3A8" : "#8FD3FF", e.bad ? "#FFE3D8" : "#E6F7FF");
    x.fillStyle = "#F2D58A"; x.fillRect(0, h * .72, w, h * .28); x.fillStyle = "#4FA8E0"; x.fillRect(0, h * .66, w, h * .08);
    const t = e.t;
    if (/Martı|Kuş/.test(t)) { for (let k = 0; k < (t === "Kuş sürüsü" ? 4 : 1); k++) { const bx = w / 2 - 30 + k * 22, by = 34 + (k % 2) * 12; x.strokeStyle = OL; x.lineWidth = 3; x.beginPath(); x.moveTo(bx - 16, by); x.quadraticCurveTo(bx - 8, by - 10, bx, by); x.quadraticCurveTo(bx + 8, by - 10, bx + 16, by); x.stroke(); } if (t === "Martı arkadaşın") coinIcon(x, w / 2 + 2, 52, 8); }
    else if (/Hindistan/.test(t)) { palm(x, w / 2, h * .74, .9); circle(x, w / 2 + 30, h * .55, 9, "#7A4A26", 2); }
    else if (/Yunus/.test(t)) { x.fillStyle = "#6E8CA8"; x.beginPath(); x.ellipse(w / 2, h * .6, 34, 12, -.2, 0, Math.PI * 2); x.fill(); x.beginPath(); x.moveTo(w / 2 + 4, h * .5); x.lineTo(w / 2 + 12, h * .36); x.lineTo(w / 2 + 16, h * .52); x.fill(); circle(x, w / 2 - 22, h * .56, 2.5, OL); }
    else if (/şenliği|Dondurma/.test(t)) { for (let k = 0; k < 4; k++) { const bx = 26 + k * 36; x.strokeStyle = "#555"; x.lineWidth = 1.5; x.beginPath(); x.moveTo(bx, 70); x.lineTo(bx, 40); x.stroke(); circle(x, bx, 30, 11, ["#E8463F", "#FFD23F", "#3E8EDE", "#3FA34D"][k], 2); } if (/Dondurma/.test(t)) { x.fillStyle = "#E0A060"; x.beginPath(); x.moveTo(w / 2 - 10, 60); x.lineTo(w / 2 + 10, 60); x.lineTo(w / 2, 88); x.fill(); circle(x, w / 2, 54, 12, "#FF9EC7", 2); } }
    else if (/Cömert|kumbara/.test(t)) { x.save(); x.translate(w / 2, h / 2); x.fillStyle = "#FF5A8A"; x.beginPath(); x.moveTo(0, 20); x.bezierCurveTo(-40, -8, -18, -38, 0, -18); x.bezierCurveTo(18, -38, 40, -8, 0, 20); x.fill(); x.strokeStyle = OL; x.lineWidth = 3; x.stroke(); x.restore(); coinIcon(x, w / 2 + 34, 30, 9); coinIcon(x, w / 2 - 36, 26, 7); }
    else if (/Hazine/.test(t)) { x.save(); x.translate(w / 2, h / 2); x.rotate(-.1); x.fillStyle = "#F2E2B0"; x.fillRect(-40, -26, 80, 50); x.strokeStyle = OL; x.lineWidth = 2; x.strokeRect(-40, -26, 80, 50); x.strokeStyle = "#B8964A"; x.setLineDash([4, 4]); x.beginPath(); x.moveTo(-30, 14); x.quadraticCurveTo(0, -20, 22, 0); x.stroke(); x.setLineDash([]); x.strokeStyle = "#E04848"; x.lineWidth = 4; x.beginPath(); x.moveTo(18, -6); x.lineTo(28, 6); x.moveTo(28, -6); x.lineTo(18, 6); x.stroke(); x.restore(); }
    else if (/Yengeç/.test(t)) { x.save(); x.translate(w / 2, h * .62); ell(x, 0, 0, 24, 14, 0, "#E8463F", 2.5); for (const s of [-1, 1]) { circle(x, s * 30, -14, 8, "#E8463F", 2.5); x.strokeStyle = OL; x.lineWidth = 3; for (let k = 0; k < 3; k++) { x.beginPath(); x.moveTo(s * 18, 4 + k * 4); x.lineTo(s * 30, 12 + k * 4); x.stroke(); } circle(x, s * 7, -18, 4, "#fff", 2); circle(x, s * 7, -18, 1.8, OL); } x.restore(); }
    else if (/Rüzgâr/.test(t)) { starIcon(x, w * .7, h * .35, 18); x.strokeStyle = "#fff"; x.lineWidth = 3; for (let k = 0; k < 3; k++) { x.beginPath(); x.moveTo(14, 26 + k * 16); x.quadraticCurveTo(60, 16 + k * 16, 90, 30 + k * 16); x.stroke(); } }
    else if (/yonca/.test(t)) { x.save(); x.translate(w / 2, h / 2 - 6); for (let k = 0; k < 4; k++) { x.rotate(Math.PI / 2); x.fillStyle = "#3FA34D"; x.beginPath(); x.arc(0, -12, 11, 0, Math.PI * 2); x.fill(); } x.strokeStyle = "#2E7A36"; x.lineWidth = 4; x.beginPath(); x.moveTo(0, 0); x.quadraticCurveTo(6, 26, 14, 36); x.stroke(); x.restore(); }
  }
  function dieFace(x, cx, cy, s, v, rot) {
    x.save(); x.translate(cx, cy); x.rotate(rot || 0);
    x.fillStyle = "rgba(0,0,0,.25)"; rr(x, -s + 3, -s + 5, s * 2, s * 2, s * .35); x.fill();
    x.fillStyle = "#FFF9EC"; rr(x, -s, -s, s * 2, s * 2, s * .35); x.fill(); x.strokeStyle = OL; x.lineWidth = Math.max(2, s * .1); x.stroke();
    x.fillStyle = "rgba(0,0,0,.08)"; rr(x, -s, s * .45, s * 2, s * .55, s * .3); x.fill();
    const P = { 1: [[0, 0]], 2: [[-1, -1], [1, 1]], 3: [[-1, -1], [0, 0], [1, 1]], 4: [[-1, -1], [1, -1], [-1, 1], [1, 1]], 5: [[-1, -1], [1, -1], [0, 0], [-1, 1], [1, 1]], 6: [[-1, -1], [1, -1], [-1, 0], [1, 0], [-1, 1], [1, 1]] }[v];
    for (const [a, b] of P) circle(x, a * s * .5, b * s * .5, s * .17, v === 1 ? "#E04848" : OL);
    x.restore();
  }
  function rr(x, a, b, w, h, r) { x.beginPath(); x.moveTo(a + r, b); x.arcTo(a + w, b, a + w, b + h, r); x.arcTo(a + w, b + h, a, b + h, r); x.arcTo(a, b + h, a, b, r); x.arcTo(a, b, a + w, b, r); x.closePath(); }

  /* ---------- mini oyunlar ---------- */
  const MINIS = [
    { id: "balon", name: "Balon Patlat", desc: "Yükselen balonlara dokun ve patlat!\nAltın balon 3 puan. 8 saniye.", cpu: [5, 15] },
    { id: "hedef", name: "Hedef Vur", desc: "Hedef sağa sola kayıyor. Tam ortadayken dokun ya da Boşluk'a bas!\n3 atış hakkın var.", cpu: [9, 25] },
    { id: "say", name: "Meyve Say", desc: "Meyvelere iyi bak! Sonra kaç tane olduklarını soracağım.\n3 soru.", cpu: [10, 40] },
    { id: "pompa", name: "Balonu Şişir", desc: "Pompaya olabildiğince hızlı bas! (dokun ya da Boşluk)\n5 saniye.", cpu: [18, 36] }
  ];
  let M = null; // aktif mini oyun durumu
  function miniArt(id) {
    return (x, w, h) => {
      sky(x, w, h, "#FFE3A0", "#FFF6D8");
      if (id === "balon") { [["#E8463F", 50, 60], ["#3E8EDE", 80, 44], ["#FFD23F", 112, 58]].forEach(([c, bx, by]) => { x.strokeStyle = "#555"; x.lineWidth = 1; x.beginPath(); x.moveTo(bx, by + 18); x.lineTo(bx, by + 40); x.stroke(); ell(x, bx, by, 14, 18, 0, c, 2); }); }
      else if (id === "hedef") { ["#E8463F", "#fff", "#E8463F", "#fff", "#FFD23F"].forEach((c, k) => circle(x, w / 2, h / 2, 40 - k * 8, c, k ? 0 : 2)); }
      else if (id === "say") { for (let k = 0; k < 5; k++) fruit(x, 30 + k * 26, 50 + (k % 2) * 18, k % 2 ? "armut" : "elma", 11); }
      else { pump(x, w / 2 - 30, h - 10, 0); ell(x, w / 2 + 30, h / 2, 26, 30, 0, "#FF7AA2", 2); }
    };
  }
  function fruit(x, cx, cy, kind, s) {
    if (kind === "elma") { circle(x, cx, cy, s, "#E8463F", 2); x.fillStyle = "#7A4A26"; x.fillRect(cx - 1, cy - s - 5, 2, 6); ell(x, cx + 5, cy - s - 2, 5, 2.5, -.5, "#3FA34D"); ell(x, cx - s * .4, cy - s * .4, s * .25, s * .15, -.6, "rgba(255,255,255,.6)"); }
    else if (kind === "armut") { x.beginPath(); x.arc(cx, cy + s * .25, s * .85, 0, Math.PI * 2); x.arc(cx, cy - s * .45, s * .55, 0, Math.PI * 2); x.fillStyle = "#B8D84A"; x.fill(); x.strokeStyle = OL; x.lineWidth = 2; x.beginPath(); x.arc(cx, cy + s * .25, s * .85, -.2, Math.PI + .2); x.stroke(); x.fillStyle = "#7A4A26"; x.fillRect(cx - 1, cy - s - 4, 2, 6); }
    else if (kind === "muz") { x.save(); x.translate(cx, cy); x.rotate(-.4); x.beginPath(); x.arc(0, -s * .6, s * 1.2, .35 * Math.PI, .9 * Math.PI); x.arc(0, -s * 1.4, s * 1.5, .85 * Math.PI, .4 * Math.PI, true); x.closePath(); x.fillStyle = "#FFD23F"; x.fill(); x.strokeStyle = OL; x.lineWidth = 2; x.stroke(); x.restore(); }
    else { circle(x, cx, cy, s, "#FF9A2E", 2); for (let k = 0; k < 6; k++) circle(x, cx + Math.cos(k) * s * .5, cy + Math.sin(k) * s * .5, 1, "#E07A10"); ell(x, cx + 3, cy - s, 4, 2, .3, "#3FA34D"); }
  }
  function pump(x, bx, by, k) { x.fillStyle = "#3E8EDE"; x.fillRect(bx - 10, by - 50, 20, 50); x.strokeStyle = OL; x.lineWidth = 2; x.strokeRect(bx - 10, by - 50, 20, 50); x.fillStyle = "#888"; x.fillRect(bx - 2, by - 70 + k * 18, 4, 22); x.fillStyle = "#E8463F"; x.fillRect(bx - 16, by - 74 + k * 18, 32, 8); x.strokeRect(bx - 16, by - 74 + k * 18, 32, 8); }
  function startMini(id, p) {
    M = { id, p, t: 0, score: 0, done: false, items: [], phase: "go", flash: 0 };
    if (id === "balon") { M.dur = 8; M.spawn = 0; }
    if (id === "hedef") { M.shots = 3; M.tx = 0; M.sp = 1.6; M.res = []; M.cool = 0; }
    if (id === "say") { M.q = 0; newCountScene(); }
    if (id === "pompa") { M.dur = 5; M.size = 0; M.k = 0; }
  }
  const FR = ["elma", "armut", "muz", "portakal"], FRN = { elma: "elma", armut: "armut", muz: "muz", portakal: "portakal" };
  function newCountScene() {
    const kinds = [FR[ri(0, 3)]]; let k2; do { k2 = pick(FR); } while (k2 === kinds[0]); kinds.push(k2);
    const n1 = ri(2, 7), n2 = ri(1, 6), list = [];
    const spots = []; for (let gx = 0; gx < 8; gx++) for (let gy = 0; gy < 4; gy++) spots.push([150 + gx * 90 + rnd(-18, 18), 170 + gy * 80 + rnd(-14, 14)]);
    spots.sort(() => Math.random() - .5);
    for (let i = 0; i < n1; i++) list.push([kinds[0], ...spots.pop()]); for (let i = 0; i < n2; i++) list.push([kinds[1], ...spots.pop()]);
    const askI = Math.random() < .5 ? 0 : 1, ans = askI ? n2 : n1;
    const opts = new Set([ans]); while (opts.size < 4) opts.add(clamp(ans + ri(-3, 3), 1, 9));
    M.scene = { list, ask: kinds[askI], ans, opts: [...opts].sort((a, b) => a - b), show: 3.2, t: 0, picked: null };
  }
  function miniInput(x, y) {
    if (!M || M.done || M.phase !== "play") return;
    if (M.id === "balon") { for (let i = M.items.length - 1; i >= 0; i--) { const b = M.items[i]; if (Math.hypot(x - b.x, y - b.y) < b.r + 8) { M.items.splice(i, 1); M.score += b.gold ? 3 : 1; sfx.pop(); burst(b.x, b.y, [b.c, "#fff"], 12, 200); floater(b.x, b.y - 20, b.gold ? "+3" : "+1", b.gold ? "#FFD23F" : "#fff"); return; } } }
    else if (M.id === "hedef") shoot();
    else if (M.id === "say") { const s = M.scene; if (s.t < s.show || s.picked != null) return; s.opts.forEach((o, k) => { const bx = 480 - 210 + k * 140; if (Math.abs(x - bx) < 60 && Math.abs(y - 470) < 50) answer(o); }); }
    else if (M.id === "pompa") pumpIt();
  }
  function miniKey() { if (!M || M.done || M.phase !== "play") return; if (M.id === "hedef") shoot(); else if (M.id === "pompa") pumpIt(); }
  function shoot() { if (M.cool > 0 || M.shots <= 0) return; const d = Math.abs(M.tx), pts = Math.max(0, 10 - Math.floor(d / 9)); M.score += pts; M.shots--; M.cool = .7; M.res.push({ x: 480 + M.tx, pts }); sfx[pts >= 8 ? "coin" : pts > 0 ? "pop" : "lose"](); floater(480, 200, pts ? "+" + pts : "Iska!", pts >= 8 ? "#FFD23F" : "#fff"); M.flash = .25; if (M.shots <= 0) setTimeoutF(() => endMini(), 900); }
  function pumpIt() { M.score++; M.k = 1; M.size = M.score; sfx.tick(); if (M.score % 5 === 0) tone(300 + M.score * 15, .08, "sine", .06); }
  function answer(o) { const s = M.scene; s.picked = o; const ok = o === s.ans; if (ok) { const bonus = Math.max(0, Math.round(5 - (s.t - s.show))); M.score += 10 + bonus; sfx.star(); floater(480, 420, "Doğru! +" + (10 + bonus), "#3FA34D"); } else { sfx.lose(); floater(480, 420, "Doğrusu " + s.ans, "#E04848"); } setTimeoutF(() => { M.q++; if (M.q >= 3) endMini(); else newCountScene(); }, 1300); }
  function setTimeoutF(f, ms) { if (fast) f(); else wait(ms).then(f); }
  let miniResolve = null;
  function endMini() { if (!M || M.done) return; M.done = true; const r = miniResolve; miniResolve = null; wait(fast ? 0 : 700).then(() => r && r(M.score)); }
  function updateMini(dt) {
    if (!M || M.done) return;
    if (M.phase === "count") { M.ct -= dt; if (Math.ceil(M.ct + dt) !== Math.ceil(M.ct) && M.ct > 0) sfx.tick(); if (M.ct <= 0) { M.phase = "play"; sfx.go(); } return; }
    M.t += dt; M.flash = Math.max(0, M.flash - dt);
    if (M.id === "balon") {
      M.spawn -= dt; if (M.spawn <= 0) { M.spawn = rnd(.22, .42); const gold = Math.random() < .1; M.items.push({ x: rnd(80, 880), y: 640, r: gold ? 24 : rnd(26, 34), vy: rnd(80, 150) * (gold ? 1.5 : 1), c: gold ? "#FFD23F" : pick(["#E8463F", "#3E8EDE", "#3FA34D", "#B98CFF", "#FF9A2E", "#FF7AA2"]), gold, ph: rnd(0, 6) }); }
      for (const b of M.items) { b.y -= b.vy * dt; b.x += Math.sin(M.t * 2 + b.ph) * 20 * dt; }
      M.items = M.items.filter((b) => b.y > -60);
      if (M.t >= M.dur) endMini();
    } else if (M.id === "hedef") { M.cool = Math.max(0, M.cool - dt); M.sp = 1.6 + (3 - M.shots) * .7; M.tx = Math.sin(M.t * M.sp) * 300; }
    else if (M.id === "say") { M.scene.t += dt; }
    else if (M.id === "pompa") { M.k = Math.max(0, M.k - dt * 6); if (M.t >= M.dur) { burst(560, 300 - M.size * 2, ["#FF7AA2", "#fff", "#FFD23F"], 30, 260); sfx.pop(); endMini(); } }
  }
  function drawMini() {
    const g = ctx.createLinearGradient(0, 0, 0, H); g.addColorStop(0, "#8FD3FF"); g.addColorStop(1, "#E6F7FF"); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    for (let i = 0; i < 4; i++) { const x = ((hash(i, 3) * 1100 + clock * 14 * (i + 1)) % 1160) - 100; ell(ctx, x, 60 + i * 40, 50, 16, 0, "rgba(255,255,255,.8)"); ell(ctx, x + 30, 52 + i * 40, 34, 14, 0, "rgba(255,255,255,.8)"); }
    ctx.fillStyle = "#7CCB5E"; ctx.fillRect(0, H - 50, W, 50); ctx.fillStyle = "#5DB34A"; ctx.fillRect(0, H - 50, W, 6);
    const m = M; if (!m) return;
    if (m.id === "balon") for (const b of m.items) { ctx.strokeStyle = "rgba(60,60,60,.6)"; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(b.x, b.y + b.r * 1.2); ctx.quadraticCurveTo(b.x + 6, b.y + b.r * 1.8, b.x, b.y + b.r * 2.6); ctx.stroke(); ell(ctx, b.x, b.y, b.r, b.r * 1.2, 0, b.c, 2.5); ell(ctx, b.x - b.r * .35, b.y - b.r * .45, b.r * .22, b.r * .32, -.4, "rgba(255,255,255,.6)"); ctx.fillStyle = b.c; ctx.beginPath(); ctx.moveTo(b.x - 5, b.y + b.r * 1.25); ctx.lineTo(b.x + 5, b.y + b.r * 1.25); ctx.lineTo(b.x, b.y + b.r * 1.1); ctx.fill(); if (b.gold) starIcon(ctx, b.x, b.y, 9); }
    if (m.id === "hedef") {
      const tx = 480 + m.tx; ctx.fillStyle = "#8A5A2B"; ctx.fillRect(tx - 4, 300, 8, 250);
      ["#E8463F", "#fff", "#E8463F", "#fff", "#FFD23F"].forEach((c, k) => circle(ctx, tx, 260, 90 - k * 18, c, k ? 0 : 3));
      ctx.strokeStyle = "#1E2A3A"; ctx.lineWidth = 3; ctx.setLineDash([10, 8]); ctx.beginPath(); ctx.moveTo(480, 120); ctx.lineTo(480, 420); ctx.stroke(); ctx.setLineDash([]);
      ctx.fillStyle = "#1E2A3A"; ctx.beginPath(); ctx.moveTo(468, 110); ctx.lineTo(492, 110); ctx.lineTo(480, 128); ctx.fill();
      for (const r of m.res) { ctx.save(); ctx.translate(r.x - m.tx + m.tx, 260); ctx.restore(); }
      for (let k = 0; k < 3; k++) { const used = k >= m.shots; ctx.save(); ctx.translate(380 + k * 100, 480); ctx.rotate(-Math.PI / 2); ctx.globalAlpha = used ? .3 : 1; ctx.fillStyle = "#8A5A2B"; ctx.fillRect(-30, -2, 50, 4); ctx.fillStyle = "#C8C8D8"; ctx.beginPath(); ctx.moveTo(20, -7); ctx.lineTo(34, 0); ctx.lineTo(20, 7); ctx.fill(); ctx.fillStyle = "#E8463F"; ctx.fillRect(-34, -6, 10, 12); ctx.restore(); }
      ctx.globalAlpha = 1; if (m.flash > 0) { ctx.fillStyle = "rgba(255,255,255," + m.flash * 2 + ")"; ctx.fillRect(0, 0, W, H); }
    }
    if (m.id === "say") {
      const s = m.scene;
      if (s.t < s.show) { for (const [k, x, y] of s.list) fruit(ctx, x, y, k, 22); bigText("Bak ve say!", 480, 80, 40, "#1E2A3A"); const w = 400 * (1 - s.t / s.show); ctx.fillStyle = "#3E8EDE"; ctx.fillRect(480 - w / 2, 110, w, 10); }
      else {
        fruit(ctx, 480, 200, s.ask, 46); bigText("Kaç tane " + FRN[s.ask] + " vardı?", 480, 300, 42, "#1E2A3A");
        s.opts.forEach((o, k) => { const bx = 480 - 210 + k * 140, sel = s.picked === o, ok = s.picked != null && o === s.ans; ctx.fillStyle = ok ? "#3FA34D" : sel ? "#E04848" : "#FFF9EC"; rr(ctx, bx - 55, 425, 110, 90, 18); ctx.fill(); ctx.strokeStyle = OL; ctx.lineWidth = 3; ctx.stroke(); bigText(String(o), bx, 472, 54, ok || sel ? "#fff" : "#1E2A3A"); });
      }
      bigText("Soru " + Math.min(3, m.q + 1) + "/3", 880, 40, 24, "#1E2A3A");
    }
    if (m.id === "pompa") {
      pump(ctx, 330, 540, m.k); ctx.strokeStyle = "#555"; ctx.lineWidth = 6; ctx.beginPath(); ctx.moveTo(346, 520); ctx.quadraticCurveTo(450, 560, 560, 520); ctx.stroke();
      const r = 30 + m.size * 4.2; ell(ctx, 560, 470 - r, r * .9, r, 0, "#FF7AA2", 3); ell(ctx, 560 - r * .35, 470 - r * 1.45, r * .2, r * .3, -.4, "rgba(255,255,255,.55)");
      animal(ctx, m.p.animal, 560, 470 - r, Math.min(60, r * .45), 1);
      bigText(m.score + " pompa", 820, 120, 36, "#1E2A3A");
    }
    // üst bilgi
    ctx.fillStyle = "rgba(255,249,236,.92)"; rr(ctx, 16, 12, 300, 56, 16); ctx.fill(); ctx.strokeStyle = PCOL[m.p.ci]; ctx.lineWidth = 4; ctx.stroke();
    circle(ctx, 46, 40, 22, PCOL[m.p.ci]); animal(ctx, m.p.animal, 46, 44, 13, 1);
    ctx.fillStyle = "#1E2A3A"; ctx.font = "700 22px Fredoka, Rubik"; ctx.textAlign = "left"; ctx.textBaseline = "middle"; ctx.fillText(m.p.name + ": " + m.score, 78, 40);
    if (m.dur) { const left = Math.max(0, m.dur - m.t); ctx.fillStyle = left < 2 ? "#E04848" : "#1E2A3A"; ctx.font = "700 34px Fredoka, Rubik"; ctx.textAlign = "right"; ctx.fillText(left.toFixed(1), 940, 44); }
    if (m.phase === "count") { ctx.fillStyle = "rgba(0,0,0,.35)"; ctx.fillRect(0, 0, W, H); bigText(String(Math.ceil(m.ct)), 480, 300, 140, "#fff"); }
  }
  function bigText(s, x, y, size, col) { ctx.font = "700 " + size + "px Fredoka, Rubik, sans-serif"; ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.lineWidth = size * .16; ctx.strokeStyle = col === "#fff" ? OL : "rgba(255,255,255,.9)"; ctx.strokeText(s, x, y); ctx.fillStyle = col; ctx.fillText(s, x, y); }
  async function miniRound() {
    const mm = MINIS[(G.round - 1) % MINIS.length]; G.mini = true; renderPlayers(); music("mini");
    await card({ title: "Mini oyun: " + mm.name, text: mm.desc + "\n\nSırayla herkes oynayacak. En iyiler altın kazanır!", art: miniArt(mm.id), color: "#FF9A2E", buttons: ["Hadi!"], cpu: G.players.every((p) => p.cpu) ? 0 : null });
    const scores = [];
    for (const p of G.players) {
      if (p.cpu) { const s = ri(mm.cpu[0], mm.cpu[1]); scores.push(s); await card({ title: p.name + " 🤖", text: "Bilgisayar oynadı: " + s + " puan", art: (x, w, h) => { sky(x, w, h, "#FFE3A0", "#FFF6D8"); circle(x, w / 2, h / 2, 36, PCOL[p.ci]); animal(x, p.animal, w / 2, h / 2 + 4, 22, 1); }, color: PCOL[p.ci], cpu: 0, cpuDelay: 1300 }); continue; }
      await card({ title: "Sıra " + p.name + "'" + ek(p.name) + "!", text: mm.name + " — hazır mısın?", art: (x, w, h) => { sky(x, w, h, "#FFE3A0", "#FFF6D8"); circle(x, w / 2, h / 2, 36, PCOL[p.ci]); animal(x, p.animal, w / 2, h / 2 + 4, 22, 1); }, color: PCOL[p.ci], buttons: ["Başla!"] });
      $("roundTag").hidden = true; mode = "mini"; startMini(mm.id, p); M.phase = "count"; M.ct = fast ? 0 : 3;
      const s = await new Promise((res) => { miniResolve = res; if (fast) { M.phase = "play"; M.score = ri(mm.cpu[0], mm.cpu[1]); endMini(); } });
      scores.push(s); mode = "board"; M = null; renderPlayers();
    }
    // sıralama
    const order = G.players.map((p, i) => i).sort((a, b) => scores[b] - scores[a]);
    const prize = [6, 4, 2, 1]; let lines = [], rank = 0;
    order.forEach((pi, k) => { if (k > 0 && scores[pi] < scores[order[k - 1]]) rank = k; const pz = prize[rank]; G.players[pi].coins += pz; lines.push((rank + 1) + ". " + G.players[pi].name + " — " + scores[pi] + " puan  (+" + pz + " altın)"); });
    sfx.win(); renderPlayers();
    await card({ title: "Mini oyun sonuçları", text: lines.join("\n"), art: (x, w, h) => podiumArt(x, w, h, order.slice(0, 3)), color: "#FF9A2E", cpu: G.players.every((p) => p.cpu) ? 0 : null });
    G.mini = false; music("board");
  }
  function podiumArt(x, w, h, top) {
    sky(x, w, h, "#FFE3A0", "#FFF6D8"); const hs = [44, 30, 20], xs = [w / 2, w / 2 - 50, w / 2 + 50];
    top.forEach((pi, k) => { const p = G.players[pi]; x.fillStyle = ["#FFD23F", "#C8D0DC", "#E0A060"][k]; x.fillRect(xs[k] - 22, h - hs[k], 44, hs[k]); x.strokeStyle = OL; x.lineWidth = 2; x.strokeRect(xs[k] - 22, h - hs[k], 44, hs[k]); circle(x, xs[k], h - hs[k] - 20, 17, PCOL[p.ci]); animal(x, p.animal, xs[k], h - hs[k] - 18, 10, 1); x.fillStyle = OL; x.font = "700 14px Fredoka"; x.textAlign = "center"; x.fillText(String(k + 1), xs[k], h - hs[k] + 16); });
  }

  /* ---------- oyun döngüsü ---------- */
  let mode = "board", running = false;
  async function playGame() {
    running = true; music("board"); placeAll(); renderPlayers();
    while (G.round <= G.rounds) {
      for (let i = G.turn; i < G.players.length; i++) { await takeTurn(i); if (!running) return; }
      G.turn = 0;
      if (G.round === G.rounds) { banner = { text: "Son tur bitti!", sub: "Son mini oyun!", col: "#FF9A2E", t: 1.6 }; await wait(1200); }
      else if (G.round === G.rounds - 1) { banner = { text: "Son tur geliyor!", sub: "", col: "#E04848", t: 1.6 }; }
      await miniRound(); if (!running) return;
      G.round++; renderPlayers(); saveGame();
      if (G.round <= G.rounds) { banner = { text: "Tur " + G.round, sub: "", col: "#3E8EDE", t: 1.4 }; await wait(900); }
    }
    await finale();
  }
  async function finale() {
    try { localStorage.removeItem(SAVE); } catch (e) {}
    const order = G.players.map((p, i) => i).sort((a, b) => (G.players[b].stars - G.players[a].stars) || (G.players[b].coins - G.players[a].coins));
    const win = G.players[order[0]]; music(null); sfx.win();
    mode = "finale"; finaleT = 0; finaleOrder = order;
    for (let k = 0; k < 6; k++) setTimeoutF(() => burst(rnd(200, 760), rnd(100, 300), ["#FFD23F", "#E8463F", "#3E8EDE", "#3FA34D", "#fff"], 40, 260), k * 400);
    await wait(2200);
    const lines = order.map((pi, k) => (k + 1) + ". " + G.players[pi].name + " — ★ " + G.players[pi].stars + "  ● " + G.players[pi].coins);
    const k = await card({ title: "🏆 " + win.name + " kazandı!", text: lines.join("\n"), art: (x, w, h) => podiumArt(x, w, h, order.slice(0, 3)), color: "#FFD23F", buttons: ["Yeni oyun", "Aynı kişilerle tekrar"], cpu: G.players.every((p) => p.cpu) ? 0 : null });
    running = false; mode = "board";
    if (k === 1) { const again = { players: G.players.map((p) => ({ name: p.name, animal: p.animal, cpu: p.cpu, ci: p.ci })), rounds: G.rounds }; newGame(again.players, again.rounds); }
    else showSetup();
  }
  let finaleT = 0, finaleOrder = [];
  function newGame(list, rounds) {
    G = { players: list.map((p) => ({ name: p.name, animal: p.animal, cpu: !!p.cpu, ci: p.ci, node: 0, coins: 10, stars: 0, item: null, shield: 0, hist: [] })), round: 1, rounds, turn: 0, stars: [], mini: false };
    const blues = NODES.filter((n) => n.type === "blue" && n.id > 4 && n.id < 28); const a = pick(blues).id; let b; do { b = pick(blues).id; } while (Math.abs(a - b) < 9); G.stars = [a, b];
    vis.length = 0; placeAll(); saveGame(); $("setup").hidden = true;
    banner = { text: "Ada Macerası başlıyor!", sub: G.rounds + " tur · yıldızları topla!", col: "#3E8EDE", t: 2 };
    playGame();
  }

  /* ---------- çizim ---------- */
  function draw() {
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    if (mode === "mini") { drawMini(); drawFX(); return; }
    if (!boardCv) boardCv = renderBoard();
    ctx.drawImage(boardCv, 0, 0);
    waves();
    // duman
    for (let i = 0; i < 5; i++) { const t = (clock * .25 + i / 5) % 1; ctx.globalAlpha = (1 - t) * .5; circle(ctx, CX + 190 + Math.sin(t * 6 + i) * 8, CY - 116 - t * 70, 8 + t * 18, "#E9EEF4"); } ctx.globalAlpha = 1;
    if (!G) { drawFX(); return; }
    // yıldız
    (G.stars || []).forEach((sn, si) => {
      let sx = NODES[sn].x, sy = NODES[sn].y; const moving = starAnim && starAnim.si === si;
      if (moving) { const a = NODES[starAnim.from], b = NODES[starAnim.to], k = starAnim.t; sx = a.x + (b.x - a.x) * k; sy = a.y + (b.y - a.y) * k - Math.sin(k * Math.PI) * 120; }
      const gl = ctx.createRadialGradient(sx, sy - 34, 4, sx, sy - 34, 46); gl.addColorStop(0, "rgba(255,240,150,.8)"); gl.addColorStop(1, "rgba(255,240,150,0)"); ctx.fillStyle = gl; ctx.beginPath(); ctx.arc(sx, sy - 34, 46, 0, Math.PI * 2); ctx.fill();
      if (!moving) { ctx.strokeStyle = "rgba(255,230,120,.9)"; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(sx, sy, 24 + Math.sin(clock * 4 + si) * 2, 0, Math.PI * 2); ctx.stroke(); }
      ctx.save(); ctx.translate(sx, sy - 36 + Math.sin(clock * 2.5 + si * 2) * 4); ctx.rotate(Math.sin(clock * 1.5 + si) * .15); starIcon(ctx, 0, 0, 18); ctx.restore();
    });
    // piyonlar (y sırasına göre)
    const order = G.players.map((p, i) => i).sort((a, b) => vis[a].y - vis[b].y);
    for (const i of order) { const v = vis[i]; v.bl -= 1 / 60; if (v.bl < -.12) v.bl = rnd(2, 5); const act = i === G.turn && !G.mini; token(ctx, G.players[i], v.x, v.y, v.z + (act && v.z === 0 ? Math.abs(Math.sin(clock * 4)) * 3 : 0), act ? 1.12 : 1, v.mood, v.bl < 0); if (G.players[i].shield) { ctx.globalAlpha = .4 + .2 * Math.sin(clock * 5); circle(ctx, v.x, v.y - 24 - v.z, 30, null); ctx.strokeStyle = "#9FE3FA"; ctx.lineWidth = 4; ctx.stroke(); ctx.globalAlpha = 1; } }
    if (dice) drawDice();
    if (banner) drawBanner();
    if (mode === "finale") drawFinale();
    drawFX();
  }
  function waves() {
    ctx.strokeStyle = "rgba(255,255,255,.35)"; ctx.lineWidth = 2;
    for (let i = 0; i < 26; i++) { const a = i / 26 * Math.PI * 2 + clock * .03, r = 1.17 + .04 * Math.sin(clock * 1.5 + i); const x = CX + Math.cos(a) * 440 * r, y = CY + 22 + Math.sin(a) * 262 * r; ctx.beginPath(); ctx.arc(x, y, 10, Math.PI * 1.1, Math.PI * 1.9); ctx.stroke(); }
    for (let i = 0; i < 12; i++) { const x = hash(i, 11) * W, y = hash(i, 12) * H; if (Math.hypot((x - CX) / 500, (y - CY) / 300) < 1) continue; const t = (clock * .5 + hash(i, 13)) % 1; ctx.globalAlpha = Math.sin(t * Math.PI) * .6; ctx.beginPath(); ctx.moveTo(x - 12, y); ctx.quadraticCurveTo(x - 6, y - 5, x, y); ctx.quadraticCurveTo(x + 6, y - 5, x + 12, y); ctx.stroke(); } ctx.globalAlpha = 1;
  }
  function drawDice() {
    const n = dice.vals.length;
    ctx.fillStyle = "rgba(10,30,60,.25)"; ctx.fillRect(0, 0, W, H);
    dice.vals.forEach((v, k) => { const x = W / 2 + (k - (n - 1) / 2) * 120, s = dice.final ? 46 : 42 + Math.sin(clock * 30 + k) * 3; dieFace(ctx, x, H / 2 - 20 + (dice.final ? 0 : Math.sin(clock * 25 + k) * 10), s, v, dice.final ? 0 : (dice.rot || 0) + k * .3); });
    if (dice.final && n > 1) bigText("= " + dice.vals.reduce((a, b) => a + b, 0), W / 2, H / 2 + 60, 44, "#fff");
  }
  function drawBanner() {
    const b = banner; b.t -= 1 / 60; if (b.t <= 0) { banner = null; return; }
    const a = Math.min(1, b.t * 3, (1.6 - Math.min(1.6, b.t)) * 6 + .2);
    ctx.globalAlpha = Math.min(1, a); ctx.fillStyle = "rgba(255,249,236,.95)"; rr(ctx, W / 2 - 230, 210, 460, b.sub ? 110 : 80, 24); ctx.fill(); ctx.strokeStyle = b.col; ctx.lineWidth = 6; ctx.stroke();
    bigText(b.text, W / 2, 252, 44, "#1E2A3A"); if (b.sub) { ctx.font = "700 22px Fredoka, Rubik"; ctx.fillStyle = "#55657A"; ctx.textAlign = "center"; ctx.fillText(b.sub, W / 2, 294); }
    ctx.globalAlpha = 1;
  }
  function drawFinale() {
    finaleT += 1 / 60;
    ctx.fillStyle = "rgba(10,30,60,.45)"; ctx.fillRect(0, 0, W, H);
    const hs = [150, 105, 70, 40], xs = [W / 2, W / 2 - 170, W / 2 + 170, W / 2 + 320];
    finaleOrder.forEach((pi, k) => { if (k > 3) return; const p = G.players[pi], x = xs[k], hh = hs[k] * Math.min(1, finaleT * 1.5); ctx.fillStyle = ["#FFD23F", "#C8D0DC", "#E0A060", "#8FA6B8"][k]; ctx.fillRect(x - 70, H - 40 - hh, 140, hh); ctx.strokeStyle = OL; ctx.lineWidth = 4; ctx.strokeRect(x - 70, H - 40 - hh, 140, hh); bigText(String(k + 1), x, H - 40 - hh + 36, 44, OL === "" ? "#000" : "#1E2A3A"); token(ctx, p, x, H - 40 - hh, k === 0 ? Math.abs(Math.sin(finaleT * 5)) * 20 : 0, k === 0 ? 2.2 : 1.7, 1, false); });
    bigText("Kazanan: " + G.players[finaleOrder[0]].name + "!", W / 2, 70, 56, "#FFD23F");
  }
  function drawFX() {
    for (const p of parts) { p.life -= 1 / 60; p.x += p.vx / 60; p.y += p.vy / 60; if (p.g) p.vy += 300 / 60; p.r += .1; ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.r); ctx.globalAlpha = Math.min(1, p.life * 2); ctx.fillStyle = p.c; ctx.fillRect(-p.s / 2, -p.s / 2, p.s, p.s * .6); ctx.restore(); }
    parts = parts.filter((p) => p.life > 0); ctx.globalAlpha = 1;
    for (const f of floaters) { f.t += 1 / 60; const a = Math.max(0, 1 - f.t / 1.3); ctx.globalAlpha = a; bigText(f.text, f.x, f.y - f.t * 40, 30, f.col === "#fff" ? "#fff" : f.col); }
    floaters = floaters.filter((f) => f.t < 1.3); ctx.globalAlpha = 1;
  }

  /* ---------- girdi ---------- */
  function canvasXY(e) { const r = cv.getBoundingClientRect(); return [(e.clientX - r.left) / r.width * W, (e.clientY - r.top) / r.height * H]; }
  cv.addEventListener("pointerdown", (e) => { audio(); if (mode === "mini") { e.preventDefault(); const [x, y] = canvasXY(e); miniInput(x, y); } });
  addEventListener("keydown", (e) => {
    if (e.target && (e.target.tagName === "INPUT" || e.target.tagName === "SELECT")) return;
    if (mode === "mini" && (e.code === "Space" || e.code === "Enter")) { e.preventDefault(); if (!e.repeat) miniKey(); return; }
    if (mode === "mini" && M && M.id === "say" && /^Digit[1-9]$/.test(e.code)) { const n = +e.code.slice(5), s = M.scene; if (s && s.t >= s.show && s.picked == null && s.opts.includes(n)) answer(n); return; }
    if (e.code === "Space" && rollWait && modal.hidden && document.activeElement !== $("useItem")) { const p = G.players[G.turn]; if (!p.cpu) { e.preventDefault(); rollWait(false); } }
  });

  /* ---------- kurulum ekranı ---------- */
  let setupList = [];
  function defaultSetup() { return [{ name: "Egemen", animal: "tavsan", cpu: false, ci: 0 }, { name: "Enes", animal: "tilki", cpu: false, ci: 1 }, { name: "Annem", animal: "kedi", cpu: false, ci: 2 }]; }
  try { const s = JSON.parse(localStorage.getItem(SAVE + ":setup") || "null"); if (s && s.list) { setupList = s.list; $("rounds").value = String(s.rounds || 10); } } catch (e) {}
  if (!setupList.length) setupList = defaultSetup();
  function renderSetup() {
    const box = $("rows"); box.innerHTML = "";
    setupList.forEach((p, i) => {
      const r = document.createElement("div"); r.className = "prow"; r.style.setProperty("--pc", PCOL[p.ci]);
      const av = document.createElement("button"); av.type = "button"; av.className = "av"; av.setAttribute("aria-label", "Hayvanı değiştir: " + ANIMALS.find((a) => a.id === p.animal).name);
      av.appendChild(avatarCanvas(p, 54)); av.onclick = () => { audio(); const k = ANIMALS.findIndex((a) => a.id === p.animal); let n = k; do { n = (n + 1) % ANIMALS.length; } while (setupList.some((q) => q !== p && q.animal === ANIMALS[n].id) && n !== k); p.animal = ANIMALS[n].id; sfx.pop(); renderSetup(); };
      const inp = document.createElement("input"); inp.value = p.name; inp.maxLength = 12; inp.setAttribute("aria-label", "Oyuncu " + (i + 1) + " adı"); inp.oninput = () => { p.name = inp.value; };
      const cpu = document.createElement("button"); cpu.type = "button"; cpu.className = "cpu"; cpu.setAttribute("aria-pressed", p.cpu ? "true" : "false"); cpu.textContent = p.cpu ? "🤖 Bilgisayar" : "🙂 İnsan"; cpu.onclick = () => { p.cpu = !p.cpu; if (p.cpu && (!p.name || /^Oyuncu/.test(p.name))) p.name = pick(["Robo", "Bip", "Zıpzıp", "Tıktık"]); renderSetup(); };
      r.append(av, inp, cpu);
      if (setupList.length > 2) { const del = document.createElement("button"); del.type = "button"; del.className = "del"; del.textContent = "✕"; del.setAttribute("aria-label", "Oyuncuyu çıkar"); del.onclick = () => { setupList.splice(i, 1); renderSetup(); }; r.appendChild(del); }
      box.appendChild(r);
    });
    $("addP").hidden = setupList.length >= 4;
  }
  $("addP").onclick = () => { const used = setupList.map((p) => p.ci), ci = [0, 1, 2, 3].find((c) => !used.includes(c)), an = ANIMALS.find((a) => !setupList.some((p) => p.animal === a.id)).id; setupList.push({ name: "Oyuncu " + (setupList.length + 1), animal: an, cpu: false, ci }); renderSetup(); };
  $("start").onclick = () => {
    audio(); const list = setupList.map((p) => ({ ...p, name: (p.name || "").trim() || ANIMALS.find((a) => a.id === p.animal).name }));
    try { localStorage.setItem(SAVE + ":setup", JSON.stringify({ list, rounds: +$("rounds").value })); } catch (e) {}
    running = false; tweens.length = 0; newGame(list, +$("rounds").value);
  };
  $("resume").onclick = () => { audio(); const s = loadGame(); if (!s) return; G = s; vis.length = 0; $("setup").hidden = true; banner = { text: "Kaldığımız yerden!", sub: "Tur " + G.round + " / " + G.rounds, col: "#3E8EDE", t: 1.6 }; if (G.mini) { G.mini = false; } playGame(); };
  function showSetup() { running = false; tweens.length = 0; modal.hidden = true; $("turnbar").hidden = true; rollWait = null; mode = "board"; M = null; music(null); $("resume").hidden = !loadGame(); renderSetup(); $("setup").hidden = false; G = null; renderPlayers(); $("roundTag").hidden = true; }
  $("menuBtn").onclick = () => { if (G && running && !confirm("Ana menüye dönülsün mü? Oyun kaydedildi, sonra devam edebilirsin.")) return; showSetup(); };
  const muteBtn = $("mute");
  function setMute(m) { muted = m; muteBtn.setAttribute("aria-pressed", m ? "true" : "false"); muteBtn.setAttribute("aria-label", m ? "Sesi aç" : "Sesi kapat"); if (master) master.gain.value = m ? 0 : 1; try { localStorage.setItem(SAVE + ":mute", m ? "1" : "0"); } catch (e) {} }
  setMute(muted); muteBtn.onclick = () => { audio(); setMute(!muted); };

  /* ---------- ölçek ---------- */
  const stage = $("stage"), screen = $("screen");
  function fit() { const w = screen.clientWidth, h = screen.clientHeight; if (!w || !h) return; let sw = w, sh = w * H / W; if (sh > h) { sh = h; sw = h * W / H; } stage.style.width = Math.floor(sw) + "px"; stage.style.height = Math.floor(sh) + "px"; stage.style.setProperty("--fs", clamp(sw / 50, 12, 19).toFixed(1) + "px"); }
  addEventListener("resize", fit); if (window.ResizeObserver) new ResizeObserver(fit).observe(screen); fit();

  /* ---------- döngü ---------- */
  let last = performance.now();
  function frame(t) { const dt = Math.min(.05, (t - last) / 1000); last = t; clock += dt; stepTweens(dt); if (mode === "mini") updateMini(dt); draw(); requestAnimationFrame(frame); }
  requestAnimationFrame(frame);
  showSetup();

  window.__am = { testMini(id) { mode = "mini"; startMini(id, G.players[0]); M.phase = "play"; }, get G() { return G; }, get M() { return M; }, get mode() { return mode; }, NODES, setFast(v) { fast = v; }, step(n) { for (let i = 0; i < n; i++) { clock += 1 / 60; stepTweens(1 / 60); if (mode === "mini") updateMini(1 / 60); } }, newGame, miniInput, get running() { return running; }, finale, draw };
})();
