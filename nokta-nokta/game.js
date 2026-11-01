/* Nokta Nokta — noktaları birleştirme (Egemen için) */
(() => {
  "use strict";
  const $ = (id) => document.getElementById(id);
  const cv = $("cv"), ctx = cv.getContext("2d"), stage = $("stage");
  const SAVE_KEY = "nokta-nokta";

  /* ---------- resimler (0..100 koordinat, sırayla dış çizgi) ---------- */
  const PICS = [
    { id: "yildiz", nm: "yıldız", col: "#F7C933", pts: (() => { const a = []; for (let i = 0; i < 10; i++) { const t = -Math.PI / 2 + i * Math.PI / 5, r = i % 2 ? 20 : 46; a.push([50 + Math.cos(t) * r, 54 + Math.sin(t) * r]); } return a; })(),
      deco: (d) => { d.eye(43, 52, 3); d.eye(57, 52, 3); d.smile(50, 60, 7); } },
    { id: "ev", nm: "ev", col: "#E5484D", pts: [[20, 90], [20, 50], [8, 50], [50, 12], [92, 50], [80, 50], [80, 90]],
      deco: (d) => { d.rect(42, 65, 16, 25, "#8B5A2B"); d.rect(26, 56, 12, 12, "#9CD3FF"); d.rect(62, 56, 12, 12, "#9CD3FF"); d.circle(55, 78, 1.6, "#F7C933"); } },
    { id: "kalp", nm: "kalp", col: "#FF6FB5", pts: [[50, 30], [62, 16], [80, 14], [92, 30], [86, 52], [50, 88], [14, 52], [8, 30], [20, 14], [38, 16]],
      deco: (d) => { d.eye(40, 42, 3); d.eye(60, 42, 3); d.smile(50, 52, 8); } },
    { id: "kedi", nm: "kedi", col: "#FF9F43", pts: [[20, 86], [14, 52], [18, 12], [38, 30], [62, 30], [82, 12], [86, 52], [80, 86], [50, 94]],
      deco: (d) => { d.eye(37, 52, 5); d.eye(63, 52, 5); d.tri(50, 66, 4, "#FF6FB5"); d.line(30, 68, 12, 64); d.line(30, 72, 12, 76); d.line(70, 68, 88, 64); d.line(70, 72, 88, 76); d.smile(50, 72, 6); } },
    { id: "araba", nm: "araba", col: "#3D8BFD", pts: [[6, 72], [6, 56], [24, 52], [34, 32], [66, 32], [78, 52], [94, 56], [94, 72]],
      deco: (d) => { d.rect(38, 37, 11, 14, "#CFE8FF"); d.rect(52, 37, 11, 14, "#CFE8FF"); d.circle(26, 74, 9, "#2B2B2B"); d.circle(74, 74, 9, "#2B2B2B"); d.circle(26, 74, 3.5, "#BDBDBD"); d.circle(74, 74, 3.5, "#BDBDBD"); d.circle(90, 60, 3, "#F7C933"); } },
    { id: "gemi", nm: "gemi", col: "#2EB872", pts: [[8, 60], [38, 60], [38, 10], [80, 48], [50, 48], [50, 60], [92, 60], [78, 86], [22, 86]],
      deco: (d) => { d.wave(); d.circle(30, 74, 3.5, "#fff"); d.circle(50, 74, 3.5, "#fff"); d.circle(70, 74, 3.5, "#fff"); } },
    { id: "balik", nm: "balık", col: "#FF7A2F", pts: [[12, 50], [26, 32], [48, 24], [68, 30], [80, 44], [95, 28], [92, 50], [95, 72], [80, 56], [68, 70], [48, 76], [26, 68]],
      deco: (d) => { d.eye(28, 46, 4.5); d.smile(20, 56, 4); d.line(52, 34, 58, 66, "rgba(0,0,0,.18)"); d.bubble(); } },
    { id: "roket", nm: "roket", col: "#E5484D", pts: [[50, 4], [62, 22], [62, 62], [76, 80], [62, 78], [58, 88], [42, 88], [38, 78], [24, 80], [38, 62], [38, 22]],
      deco: (d) => { d.circle(50, 38, 7, "#9CD3FF"); d.circle(50, 38, 7, null, "#fff"); d.flame(50, 92); } },
    { id: "kelebek", nm: "kelebek", col: "#9B5DE5", pts: [[50, 30], [66, 10], [88, 14], [92, 36], [76, 50], [90, 72], [72, 90], [50, 68], [28, 90], [10, 72], [24, 50], [8, 36], [12, 14], [34, 10]],
      deco: (d) => { d.rect(47, 28, 6, 44, "#3B2A1A"); d.circle(28, 30, 6, "#F7C933"); d.circle(72, 30, 6, "#F7C933"); d.circle(30, 72, 5, "#FF6FB5"); d.circle(70, 72, 5, "#FF6FB5"); d.line(48, 28, 42, 16, "#3B2A1A"); d.line(52, 28, 58, 16, "#3B2A1A"); } },
    { id: "elma", nm: "elma", col: "#E5484D", pts: [[50, 26], [64, 18], [84, 26], [90, 50], [80, 80], [62, 92], [50, 86], [38, 92], [20, 80], [10, 50], [16, 26], [36, 18]],
      deco: (d) => { d.line(50, 26, 54, 8, "#6B4220", 4); d.leaf(); d.circle(34, 40, 5, "rgba(255,255,255,.45)"); } },
    { id: "dondurma", nm: "dondurma", col: "#FFC0DF", pts: [[50, 96], [30, 46], [22, 40], [24, 24], [38, 16], [50, 8], [62, 16], [76, 24], [78, 40], [70, 46]],
      deco: (d) => { d.poly([[30, 46], [70, 46], [50, 96]], "#E8B060"); d.line(36, 56, 60, 52, "rgba(0,0,0,.2)"); d.line(40, 68, 58, 64, "rgba(0,0,0,.2)"); d.circle(50, 6, 4, "#E5484D"); d.eye(42, 32, 3); d.eye(58, 32, 3); } },
    { id: "agac", nm: "ağaç", col: "#2EB872", pts: [[44, 92], [44, 70], [22, 70], [10, 52], [20, 34], [32, 16], [50, 8], [68, 16], [80, 34], [90, 52], [78, 70], [56, 70], [56, 92]],
      deco: (d) => { d.rect(44, 70, 12, 22, "#8B5A2B"); d.circle(34, 40, 4, "#E5484D"); d.circle(62, 30, 4, "#E5484D"); d.circle(66, 54, 4, "#E5484D"); d.circle(42, 58, 4, "#E5484D"); } },
  ];
  const NUMS = ["", "bir", "iki", "üç", "dört", "beş", "altı", "yedi", "sekiz", "dokuz", "on", "on bir", "on iki", "on üç", "on dört", "on beş", "on altı", "on yedi", "on sekiz", "on dokuz", "yirmi"];

  // 20 moduna uygun olsun diye uzun kenarlara ara nokta ekle
  function subdivide(pts, target) {
    const p = pts.slice();
    while (p.length < target) {
      let best = -1, bl = -1;
      for (let i = 0; i < p.length - 1; i++) {
        const l = Math.hypot(p[i + 1][0] - p[i][0], p[i + 1][1] - p[i][1]);
        const mx = (p[i][0] + p[i + 1][0]) / 2, my = (p[i][1] + p[i + 1][1]) / 2;
        // ara nokta başka bir noktaya fazla yaklaşmasın
        if (l > bl && p.every(q => Math.hypot(q[0] - mx, q[1] - my) >= 9)) { bl = l; best = i; }
      }
      if (best < 0) break;
      p.splice(best + 1, 0, [(p[best][0] + p[best + 1][0]) / 2, (p[best][1] + p[best + 1][1]) / 2]);
    }
    return p;
  }
  function dotsFor(pic, mode) {
    if (mode === 10) return pic.pts.length <= 10 ? pic.pts : null;
    return subdivide(pic.pts, Math.max(pic.pts.length, Math.min(20, 15 + (pic.id.length % 6))));
  }

  /* ---------- kayıt ---------- */
  let SAVE = { mode: 10, stars: 0, got: {} };
  try { SAVE = Object.assign(SAVE, JSON.parse(localStorage.getItem(SAVE_KEY) || "{}")); } catch (e) {}
  const store = () => { try { localStorage.setItem(SAVE_KEY, JSON.stringify(SAVE)); } catch (e) {} };

  /* ---------- ses ---------- */
  let AC = null, soundOn = true, trVoice = null;
  function audio() { try { AC = AC || new (window.AudioContext || window.webkitAudioContext)(); if (AC.state === "suspended") AC.resume(); } catch (e) {} }
  function tone(f, d = 0.12, type = "triangle", vol = 0.07, slide = 0) {
    if (!soundOn || !AC) return;
    const t = AC.currentTime, o = AC.createOscillator(), g = AC.createGain();
    o.type = type; o.frequency.setValueAtTime(f, t);
    if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(40, f + slide), t + d);
    g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + d);
    o.connect(g).connect(AC.destination); o.start(t); o.stop(t + d + 0.02);
  }
  const pickVoice = () => { try { trVoice = speechSynthesis.getVoices().find(v => v.lang && v.lang.toLowerCase().startsWith("tr")) || trVoice; } catch (e) {} };
  if ("speechSynthesis" in window) { pickVoice(); speechSynthesis.onvoiceschanged = pickVoice; }
  function say(text) {
    if (!soundOn || !("speechSynthesis" in window)) return;
    try { speechSynthesis.cancel(); const u = new SpeechSynthesisUtterance(text); u.lang = "tr-TR"; u.rate = 0.95; u.pitch = 1.1; if (trVoice) u.voice = trVoice; speechSynthesis.speak(u); } catch (e) {}
  }

  /* ---------- durum ---------- */
  let S = null, order = [];
  function pool(mode) { return PICS.filter(p => dotsFor(p, mode)); }
  function newPicture() {
    const list = pool(SAVE.mode);
    if (!order.length) order = list.map(p => p.id).sort(() => Math.random() - 0.5);
    let id = order.shift();
    if (S && S.pic.id === id && order.length) { order.push(id); id = order.shift(); }
    const pic = PICS.find(p => p.id === id);
    S = { pic, dots: dotsFor(pic, SAVE.mode), next: 1, done: false, idle: 0, wrong: 0, fill: 0, bounce: 0, fx: [], drag: false, tAnim: 0 };
    $("next").hidden = true; $("say").hidden = false;
    setTimeout(() => say("Noktaları sırayla birleştir. Bir'den başla!"), 200);
  }
  function connect(i) {
    S.next++; S.idle = 0; S.wrong = 0;
    tone(400 + i * 28, 0.12, "triangle", 0.07);
    say(NUMS[i]);
    if (S.next > S.dots.length) finish();
  }
  function finish() {
    S.done = true; S.tAnim = 0;
    [523, 659, 784, 1046].forEach((f, k) => setTimeout(() => tone(f, 0.2), 300 + k * 120));
    for (let i = 0; i < 40; i++) S.fx.push({ x: 50, y: 50, vx: (Math.random() - 0.5) * 120, vy: -Math.random() * 120 - 20, t: 0, life: 1.6, col: ["#E5484D", "#F7C933", "#3D8BFD", "#2EB872", "#9B5DE5"][i % 5] });
    const key = SAVE.mode + ":" + S.pic.id, fresh = !SAVE.got[key];
    SAVE.got[key] = true; SAVE.stars++; store(); renderInfo();
    setTimeout(() => say(`Bir ${S.pic.nm}! Aferin sana!` + (fresh ? " Albümüne yeni çıkartma eklendi." : "")), 700);
    $("next").hidden = false; $("say").hidden = true;
    setTimeout(() => $("next").focus(), 50);
  }

  /* ---------- çizim ---------- */
  let W = 0, H = 0, box = 0, bx = 0, by = 0, dpr = 1;
  function resize() {
    const r = stage.getBoundingClientRect(); dpr = Math.min(2, window.devicePixelRatio || 1);
    W = r.width; H = r.height; cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr);
    box = Math.min(W, H) - 30; bx = (W - box) / 2; by = (H - box) / 2;
  }
  const X = (x) => bx + x / 100 * box, Y = (y) => by + y / 100 * box;
  function decoKit(c, k) {
    const s = box / 100;
    return {
      eye: (x, y, r) => { c.fillStyle = "#fff"; c.beginPath(); c.arc(X(x), Y(y), r * s, 0, 7); c.fill(); c.fillStyle = "#2B2B2B"; c.beginPath(); c.arc(X(x) + r * s * 0.2, Y(y) + r * s * 0.15, r * s * 0.5, 0, 7); c.fill(); },
      smile: (x, y, r) => { c.strokeStyle = "#3B2A1A"; c.lineWidth = Math.max(2, s * 1.2); c.beginPath(); c.arc(X(x), Y(y) - r * s * 0.4, r * s * 0.8, 0.2 * Math.PI, 0.8 * Math.PI); c.stroke(); },
      rect: (x, y, w, h, col) => { c.fillStyle = col; c.beginPath(); c.roundRect ? c.roundRect(X(x), Y(y), w * s, h * s, 2 * s) : c.rect(X(x), Y(y), w * s, h * s); c.fill(); },
      circle: (x, y, r, col, stroke) => { c.beginPath(); c.arc(X(x), Y(y), r * s, 0, 7); if (col) { c.fillStyle = col; c.fill(); } if (stroke) { c.strokeStyle = stroke; c.lineWidth = s * 1.2; c.stroke(); } },
      tri: (x, y, r, col) => { c.fillStyle = col; c.beginPath(); c.moveTo(X(x - r), Y(y - r * 0.6)); c.lineTo(X(x + r), Y(y - r * 0.6)); c.lineTo(X(x), Y(y + r * 0.6)); c.fill(); },
      line: (x1, y1, x2, y2, col = "#3B2A1A", w = 1.4) => { c.strokeStyle = col; c.lineWidth = w * s; c.lineCap = "round"; c.beginPath(); c.moveTo(X(x1), Y(y1)); c.lineTo(X(x2), Y(y2)); c.stroke(); },
      poly: (pts, col) => { c.fillStyle = col; c.beginPath(); pts.forEach(([x, y], i) => (i ? c.lineTo(X(x), Y(y)) : c.moveTo(X(x), Y(y)))); c.closePath(); c.fill(); },
      wave: () => { c.strokeStyle = "#3D8BFD"; c.lineWidth = 2.5 * s; c.beginPath(); for (let x = 0; x <= 100; x += 2) c.lineTo(X(x), Y(90 + Math.sin(x / 6 + k * 4) * 2)); c.stroke(); },
      bubble: () => { for (let i = 0; i < 3; i++) { const yy = 40 - ((k * 30 + i * 12) % 36); c.strokeStyle = "#3D8BFD"; c.lineWidth = s; c.beginPath(); c.arc(X(6 - i * 1.5), Y(yy), (2 + i) * s, 0, 7); c.stroke(); } },
      flame: (x, y) => { const f = 1 + Math.sin(k * 20) * 0.15; c.fillStyle = "#FF9F1C"; c.beginPath(); c.moveTo(X(x - 7), Y(y - 4)); c.quadraticCurveTo(X(x), Y(y + 14 * f), X(x + 7), Y(y - 4)); c.fill(); c.fillStyle = "#F7C933"; c.beginPath(); c.moveTo(X(x - 3.5), Y(y - 4)); c.quadraticCurveTo(X(x), Y(y + 7 * f), X(x + 3.5), Y(y - 4)); c.fill(); },
      leaf: () => { c.fillStyle = "#2EB872"; c.beginPath(); c.ellipse(X(62), Y(14), 9 * s, 4.5 * s, -0.4, 0, 7); c.fill(); },
    };
  }
  function draw() {
    ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.clearRect(0, 0, cv.width, cv.height);
    if (!S) return;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const t = performance.now() / 1000;
    // kâğıt
    ctx.fillStyle = "#FFFFFF"; ctx.beginPath(); ctx.roundRect ? ctx.roundRect(bx - 12, by - 12, box + 24, box + 24, 22) : ctx.rect(bx - 12, by - 12, box + 24, box + 24); ctx.fill();
    ctx.strokeStyle = "rgba(61,139,253,.08)"; ctx.lineWidth = 1;
    for (let i = 1; i < 10; i++) { ctx.beginPath(); ctx.moveTo(bx, by + i * box / 10); ctx.lineTo(bx + box, by + i * box / 10); ctx.stroke(); }
    const D = S.dots, k = S.done ? Math.min(1, S.tAnim / 0.8) : 0;
    // tamamlanınca boya + zıpla
    ctx.save();
    if (S.done) {
      const bounce = 1 + Math.sin(Math.min(S.tAnim, 1.6) * Math.PI * 2.5) * 0.04 * Math.max(0, 1 - S.tAnim / 1.6);
      ctx.translate(X(50), Y(50)); ctx.scale(bounce, bounce); ctx.translate(-X(50), -Y(50));
      ctx.globalAlpha = k; ctx.fillStyle = S.pic.col;
      ctx.beginPath(); D.forEach(([x, y], i) => (i ? ctx.lineTo(X(x), Y(y)) : ctx.moveTo(X(x), Y(y)))); ctx.closePath(); ctx.fill();
      ctx.globalAlpha = 1;
      if (k >= 1) S.pic.deco(decoKit(ctx, t));
    }
    // çizgiler
    ctx.strokeStyle = S.done ? "#3B2A1A" : "#3D8BFD"; ctx.lineWidth = Math.max(4, box / 90); ctx.lineCap = "round"; ctx.lineJoin = "round";
    ctx.beginPath();
    for (let i = 0; i < Math.min(S.next - 1, D.length); i++) { const [x, y] = D[i]; i ? ctx.lineTo(X(x), Y(y)) : ctx.moveTo(X(x), Y(y)); }
    if (S.done) ctx.closePath();
    ctx.stroke();
    ctx.restore();
    // sürüklerken çizgi parmağı izlesin
    if (S.drag && S.next > 1 && !S.done && S.pointer) {
      const [x, y] = D[S.next - 2];
      ctx.strokeStyle = "rgba(61,139,253,.5)"; ctx.lineWidth = Math.max(3, box / 110); ctx.setLineDash([8, 8]);
      ctx.beginPath(); ctx.moveTo(X(x), Y(y)); ctx.lineTo(S.pointer[0], S.pointer[1]); ctx.stroke(); ctx.setLineDash([]);
    }
    // noktalar
    if (!S.done || k < 1) {
      const r = Math.max(14, box / 26);
      D.forEach(([x, y], i) => {
        const n = i + 1, done = n < S.next, isNext = n === S.next;
        const hint = isNext && (S.idle > 4 || S.wrong >= 2);
        const rr = r * (hint ? 1 + 0.18 * Math.sin(t * 8) : 1);
        ctx.globalAlpha = S.done ? 1 - k : 1;
        ctx.fillStyle = done ? "#3D8BFD" : hint ? "#F7C933" : isNext && n === 1 ? "#F7C933" : "#FFFFFF";
        ctx.strokeStyle = done ? "#2563C9" : "#E5484D"; ctx.lineWidth = 3;
        ctx.beginPath(); ctx.arc(X(x), Y(y), rr, 0, 7); ctx.fill(); ctx.stroke();
        ctx.fillStyle = done ? "#fff" : "#3B2A1A"; ctx.font = `800 ${Math.round(r * 0.95)}px Rubik, sans-serif`; ctx.textAlign = "center"; ctx.textBaseline = "middle";
        ctx.fillText(n, X(x), Y(y) + 1);
        ctx.globalAlpha = 1;
      });
    }
    // konfeti
    for (const f of S.fx) { ctx.globalAlpha = Math.max(0, 1 - f.t / f.life); ctx.fillStyle = f.col; ctx.fillRect(X(f.x) - 4, Y(f.y) - 4, 8, 8); }
    ctx.globalAlpha = 1;
    if (S.done && k >= 1) {
      ctx.fillStyle = "#3B2A1A"; ctx.font = `800 ${Math.round(box / 11)}px Rubik, sans-serif`; ctx.textAlign = "center"; ctx.textBaseline = "alphabetic";
      ctx.fillText(S.pic.nm.toLocaleUpperCase("tr-TR") + "!", X(50), by - 18 > 30 ? by - 18 : Y(99));
    }
  }

  /* ---------- dokunma ---------- */
  function dotAt(px, py) {
    const r = Math.max(26, box / 16);
    let best = -1, bd = r;
    S.dots.forEach(([x, y], i) => { const d = Math.hypot(X(x) - px, Y(y) - py); if (d < bd) { bd = d; best = i; } });
    return best;
  }
  function tryDot(i, fromTap) {
    if (i < 0 || S.done) return;
    const n = i + 1;
    if (n === S.next) connect(n);
    else if (n >= S.next && fromTap) {
      S.wrong++; tone(220, 0.18, "triangle", 0.06, -80);
      say(`Bu ${NUMS[n]}. Şimdi ${NUMS[S.next]} sayısını bul!`);
    }
  }
  const local = (e) => { const r = cv.getBoundingClientRect(); return [e.clientX - r.left, e.clientY - r.top]; };
  cv.addEventListener("pointerdown", (e) => {
    audio(); if (!S || S.done) return;
    const [x, y] = local(e);
    S.drag = true; S.pointer = [x, y];
    try { cv.setPointerCapture(e.pointerId); } catch (_) {}
    tryDot(dotAt(x, y), true);
  });
  cv.addEventListener("pointermove", (e) => {
    if (!S || !S.drag || S.done) return;
    const [x, y] = local(e); S.pointer = [x, y];
    const i = dotAt(x, y); if (i + 1 === S.next) connect(S.next);
  });
  const up = () => { if (S) { S.drag = false; S.pointer = null; } };
  cv.addEventListener("pointerup", up); cv.addEventListener("pointercancel", up);

  /* ---------- arayüz ---------- */
  function renderInfo() {
    $("stars").textContent = `⭐ ${SAVE.stars}`;
    $("m10").setAttribute("aria-checked", SAVE.mode === 10); $("m20").setAttribute("aria-checked", SAVE.mode === 20);
  }
  [$("m10"), $("m20")].forEach(b => b.addEventListener("click", () => {
    audio(); const m = +b.dataset.m; if (m === SAVE.mode && S && !S.done) return;
    SAVE.mode = m; store(); order = []; renderInfo(); newPicture();
    say(m === 10 ? "On'a kadar sayıyoruz." : "Yirmiye kadar sayıyoruz!");
  }));
  $("next").addEventListener("click", () => { audio(); newPicture(); });
  $("say").addEventListener("click", () => { audio(); if (S && !S.done) { S.idle = 5; say(`Şimdi ${NUMS[S.next]} sayısını bul!`); } });
  $("go").addEventListener("click", () => { audio(); pickVoice(); $("start").hidden = true; newPicture(); });
  $("sound").addEventListener("click", () => {
    soundOn = !soundOn; $("ic-on").hidden = !soundOn; $("ic-off").hidden = soundOn;
    $("sound").setAttribute("aria-pressed", soundOn); $("sound").setAttribute("aria-label", soundOn ? "Sesi kapat" : "Sesi aç");
    if (!soundOn && "speechSynthesis" in window) speechSynthesis.cancel();
  });
  function renderAlbum() {
    const box2 = $("stickers"); box2.innerHTML = "";
    for (const p of PICS) {
      const got = SAVE.got["10:" + p.id] || SAVE.got["20:" + p.id];
      const d = document.createElement("div");
      if (got) {
        const c = document.createElement("canvas"); c.width = 120; c.height = 120; d.appendChild(c);
        const g = c.getContext("2d");
        // küçük resim: dış çizgiyi boya
        g.fillStyle = p.col; g.strokeStyle = "#3B2A1A"; g.lineWidth = 3; g.lineJoin = "round";
        g.beginPath(); p.pts.forEach(([x, y], i) => (i ? g.lineTo(10 + x, 10 + y) : g.moveTo(10 + x, 10 + y))); g.closePath(); g.fill(); g.stroke();
        d.setAttribute("aria-label", p.nm);
      } else { d.textContent = "?"; d.setAttribute("aria-label", "henüz bulunmadı"); }
      box2.appendChild(d);
    }
  }
  $("album-btn").addEventListener("click", () => { renderAlbum(); $("album").hidden = false; });
  $("album-close").addEventListener("click", () => { $("album").hidden = true; });

  /* ---------- döngü ---------- */
  let last = performance.now();
  function loop(now) {
    const dt = Math.min(0.05, (now - last) / 1000); last = now;
    const sr = stage.getBoundingClientRect();
    if (Math.abs(sr.width - W) > 0.5 || Math.abs(sr.height - H) > 0.5) resize();
    if (S) {
      if (!S.done) S.idle += dt; else S.tAnim += dt;
      for (const f of S.fx) { f.t += dt; f.x += f.vx * dt; f.y += f.vy * dt; f.vy += 160 * dt; }
      S.fx = S.fx.filter(f => f.t < f.life);
    }
    draw();
    requestAnimationFrame(loop);
  }
  resize(); renderInfo();
  // açılışta arkada bir resim görünsün
  S = { pic: PICS[0], dots: PICS[0].pts, next: 1, done: false, idle: 0, wrong: 0, fx: [], tAnim: 0 };
  requestAnimationFrame(loop);

  // test kancası
  window.__nokta = { get S() { return S; }, PICS, dotsFor, connect, newPicture, save: () => SAVE, X, Y, get box() { return box; } };
})();
