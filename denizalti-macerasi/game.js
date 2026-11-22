/* Denizaltı Macerası — Egemen için sesli okyanus keşfi */
(function () {
  "use strict";
  const W = 960, H = 600, WW = 3600, WH = 1800, DEEP = 1120;
  const $ = (id) => document.getElementById(id);
  const cv = $("cv"); let ctx = cv.getContext("2d");
  const SAVE = "denizalti-macerasi";
  const rnd = (a, b) => a + Math.random() * (b - a);
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const OL = "#0E2A40";

  /* ---------- dünya ---------- */
  function floorY(x) {
    if (x < 1100) return 660 + Math.sin(x / 90) * 30 + Math.sin(x / 37) * 10;
    if (x < 1500) { const k = (x - 1100) / 400; return 660 + (1060 - 660) * (k * k * (3 - 2 * k)) + Math.sin(x / 50) * 8; }
    if (x < 2500) return 1060 + Math.sin(x / 120) * 30 + Math.sin(x / 41) * 8;
    if (x < 2800) { const k = (x - 2500) / 300; return 1060 + (1660 - 1060) * (k * k * (3 - 2 * k)); }
    return 1660 + Math.sin(x / 100) * 30;
  }
  // canlılar: ad, bilgi, bölge, hareket
  const SPECIES = [
    { id: "palyaco", name: "Palyaço balığı", fact: "Turuncu beyaz çizgili. Anemonun dokunaçları arasında saklanır.", x: [200, 900], y: [450, 620], move: "swim", sp: 40, s: 1, n: 3 },
    { id: "yildiz", name: "Deniz yıldızı", fact: "Beş kolu var. Bir kolu koparsa yeniden çıkar!", x: [100, 1000], y: "floor", move: "still", s: 1, n: 3 },
    { id: "yengec", name: "Yengeç", fact: "Yan yan yürür. Kıskaçlarıyla yemeğini tutar.", x: [150, 1050], y: "floor", move: "crab", sp: 30, s: 1, n: 2 },
    { id: "denizati", name: "Denizatı", fact: "Yavrularını babası karnındaki kesede taşır.", x: [600, 1050], y: [500, 600], move: "bob", sp: 10, s: 1, n: 2 },
    { id: "balon", name: "Balon balığı", fact: "Korkunca kocaman bir top gibi şişer!", x: [300, 1000], y: [380, 560], move: "swim", sp: 25, s: 1, n: 1, puff: 1 },
    { id: "mercan", name: "Mercan", fact: "Bitkiye benzer ama aslında küçük hayvanlardan oluşur.", x: [250, 950], y: "floor", move: "still", s: 1.4, n: 4 },
    { id: "istiridye", name: "İstiridye", fact: "Kabuğunun içinde inci saklayabilir. Dokun, inci topla!", x: [100, 2400], y: "floor", move: "oyster", s: 1, n: 6 },
    { id: "kaplumbaga", name: "Deniz kaplumbağası", fact: "Yüz yıl yaşayabilir. Yumurtalarını kumsala bırakır.", x: [400, 2300], y: [250, 700], move: "swim", sp: 50, s: 1.6, n: 1 },
    { id: "ahtapot", name: "Ahtapot", fact: "Sekiz kolu ve üç kalbi var. Rengini değiştirebilir!", x: [1300, 2400], y: [950, 1040], move: "bob", sp: 15, s: 1.4, n: 1 },
    { id: "denizanasi", name: "Denizanası", fact: "Beyni yok, suda süzülür. Sakın dokunma, yakar!", x: [1200, 2400], y: [250, 850], move: "jelly", sp: 20, s: 1.2, n: 3 },
    { id: "yunus", name: "Yunus", fact: "Çok akıllıdır. Islık çalarak arkadaşlarıyla konuşur.", x: [1300, 2500], y: [90, 300], move: "swim", sp: 120, s: 2, n: 2 },
    { id: "balina", name: "Mavi balina", fact: "Dünyanın en büyük hayvanı! Kalbi bir araba kadar büyük.", x: [1600, 2500], y: [400, 600], move: "swim", sp: 35, s: 5, n: 1 },
    { id: "kopekbaligi", name: "Köpek balığı", fact: "Bir dişi düşünce hemen yenisi çıkar.", x: [1300, 2500], y: [500, 900], move: "swim", sp: 70, s: 2.2, n: 1 },
    { id: "vatoz", name: "Vatoz", fact: "Kanat gibi yüzgeçleriyle suda uçar gibi yüzer.", x: [1300, 2400], y: [900, 1020], move: "swim", sp: 40, s: 1.8, n: 1 },
    { id: "suru", name: "Balık sürüsü", fact: "Hep birlikte yüzerler. Kalabalıkta daha güvende olurlar.", x: [1250, 2400], y: [300, 700], move: "school", sp: 60, s: 1, n: 1 },
    { id: "kestane", name: "Deniz kestanesi", fact: "Her yeri dikenli küçük bir top gibidir.", x: [1300, 2450], y: "floor", move: "still", s: 1, n: 3 },
    { id: "kalamar", name: "Kalamar", fact: "Tehlike olunca mürekkep püskürtüp kaçar.", x: [2700, 3500], y: [1200, 1500], move: "swim", sp: 45, s: 1.6, n: 2 },
    { id: "fener", name: "Fener balığı", fact: "Başındaki ışıklı yemle karanlık derinlikte avlanır.", x: [2900, 3500], y: [1400, 1600], move: "swim", sp: 20, s: 1.4, n: 2 },
    { id: "gemi", name: "Batık gemi", fact: "Çok eski bir yelkenli gemi. Şimdi balıkların evi!", x: [2000, 2000], y: "floor", move: "still", s: 1, n: 1 },
    { id: "hazine", name: "Hazine sandığı", fact: "İçinden parlak inciler çıktı! Gerçek bir kaşifsin!", x: [3300, 3300], y: "floor", move: "still", s: 1, n: 1 }
  ];
  const SP = Object.fromEntries(SPECIES.map((s) => [s.id, s]));
  let crit = [];
  function spawnAll() {
    crit = [];
    for (const sp of SPECIES) for (let k = 0; k < sp.n; k++) {
      const x = sp.x[0] + (sp.x[1] - sp.x[0]) * (sp.n === 1 ? .5 : k / Math.max(1, sp.n - 1)) + (sp.x[1] > sp.x[0] ? rnd(-40, 40) : 0);
      const y = sp.y === "floor" ? floorY(x) - (sp.id === "gemi" ? 0 : 8) : rnd(sp.y[0], sp.y[1]);
      crit.push({ sp, x, y, hx: x, hy: y, dir: Math.random() < .5 ? -1 : 1, t: rnd(0, 9), open: 0, regen: 0, puff: 0, ink: 0 });
    }
  }

  /* ---------- durum ---------- */
  let S = { found: {}, pearls: 0, lamp: 0, turbo: 0, color: 0, owned: [0], tut: 0 };
  try { const s = JSON.parse(localStorage.getItem(SAVE) || "null"); if (s && s.found) S = Object.assign(S, s); } catch (e) {}
  const save = () => { try { localStorage.setItem(SAVE, JSON.stringify(S)); } catch (e) {} };
  const SUBCOL = [["#FFD23F", "#E8A317"], ["#E8463F", "#A82A26"], ["#3FA34D", "#22672A"], ["#B98CFF", "#7A5AB8"], ["#FF7AA2", "#C84A78"]];
  const sub = { x: 300, y: 300, vx: 0, vy: 0, dir: 1, prop: 0 };

  /* ---------- ses ---------- */
  let ac = null, master = null, mg = null, muted = false;
  try { muted = localStorage.getItem(SAVE + ":mute") === "1"; } catch (e) {}
  function audio() { if (!ac) { const C = window.AudioContext || window.webkitAudioContext; if (!C) return; ac = new C(); master = ac.createGain(); master.gain.value = muted ? 0 : 1; master.connect(ac.destination); mg = ac.createGain(); mg.gain.value = .35; mg.connect(master); } if (ac.state === "suspended") ac.resume(); }
  function tone(f, d, type, vol, when, slide, dest) { if (!ac || muted) return; const t = when || ac.currentTime, o = ac.createOscillator(), g = ac.createGain(); o.type = type || "sine"; o.frequency.setValueAtTime(f, t); if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(30, slide), t + d); g.gain.setValueAtTime(.0001, t); g.gain.linearRampToValueAtTime(vol || .1, t + .02); g.gain.exponentialRampToValueAtTime(.0008, t + d); o.connect(g); g.connect(dest || master); o.start(t); o.stop(t + d + .02); }
  let nb = null;
  function noise(d, vol, freq, q) { if (!ac || muted) return; if (!nb) { nb = ac.createBuffer(1, ac.sampleRate, ac.sampleRate); const c = nb.getChannelData(0); for (let i = 0; i < c.length; i++) c[i] = Math.random() * 2 - 1; } const s = ac.createBufferSource(), f = ac.createBiquadFilter(), g = ac.createGain(), t = ac.currentTime; s.buffer = nb; f.type = "bandpass"; f.frequency.value = freq || 1500; f.Q.value = q || 1; g.gain.setValueAtTime(vol || .1, t); g.gain.exponentialRampToValueAtTime(.001, t + d); s.connect(f); f.connect(g); g.connect(master); s.start(t); s.stop(t + d); }
  const now = () => ac ? ac.currentTime : 0;
  const sfx = {
    snap() { noise(.08, .25, 3000, .5); tone(1800, .05, "square", .05); }, found() { const t = now(); [523, 659, 784, 1047, 1319].forEach((f, i) => tone(f, .3, "triangle", .1, t + i * .08)); },
    pearl() { const t = now(); [1319, 1568, 2093].forEach((f, i) => tone(f, .2, "sine", .08, t + i * .06)); }, bubble() { tone(rnd(400, 900), .08, "sine", .05, 0, rnd(900, 1600)); },
    no() { tone(220, .25, "triangle", .1, 0, 160); }, buy() { const t = now(); [784, 988, 1175, 1568].forEach((f, i) => tone(f, .15, "square", .04, t + i * .06)); }, sonar() { tone(1200, .6, "sine", .05, 0, 1100); }
  };
  const mf = (m) => 440 * Math.pow(2, (m - 69) / 12);
  const SONG = { bpm: 76, lead: [72, 0, 76, 0, 79, 0, 76, 74, 72, 0, 0, 69, 67, 0, 0, 0, 69, 0, 72, 0, 76, 0, 74, 72, 71, 0, 0, 67, 72, 0, 0, 0], bass: [48, 0, 0, 0, 55, 0, 0, 0, 53, 0, 0, 0, 52, 0, 0, 0, 50, 0, 0, 0, 53, 0, 0, 0, 55, 0, 0, 0, 48, 0, 0, 0] };
  let mStep = 0, mNext = 0, mOn = false;
  setInterval(() => { if (!ac || muted || !mOn) { if (ac) mNext = Math.max(mNext, ac.currentTime); return; } const d = 60 / SONG.bpm / 2; if (mNext < ac.currentTime) mNext = ac.currentTime + .05; const deep = sub.y > DEEP ? -5 : 0; while (mNext < ac.currentTime + .3) { const i = mStep % 32; if (SONG.lead[i]) { tone(mf(SONG.lead[i] + deep), d * 2.6, "sine", .045, mNext, 0, mg); tone(mf(SONG.lead[i] + 12 + deep), d * 1.2, "sine", .012, mNext, 0, mg); } if (SONG.bass[i]) tone(mf(SONG.bass[i] + deep), d * 3.5, "triangle", .06, mNext, 0, mg); mStep++; mNext += d; } }, 90);
  const canSpeak = "speechSynthesis" in window; let trVoice = null, lastSay = "";
  function pickVoice() { trVoice = speechSynthesis.getVoices().find((v) => /^tr(-|_|$)/i.test(v.lang)) || null; }
  if (canSpeak) { pickVoice(); if (speechSynthesis.addEventListener) speechSynthesis.addEventListener("voiceschanged", pickVoice); }
  let tipT = null;
  function say(text, keep) { lastSay = text; $("tip").textContent = text; clearTimeout(tipT); if (!keep) tipT = setTimeout(() => { if ($("tip").textContent === text) $("tip").textContent = ""; }, 6500); if (!canSpeak || muted || !trVoice) return; speechSynthesis.cancel(); const u = new SpeechSynthesisUtterance(text); u.voice = trVoice; u.lang = trVoice.lang; u.rate = .92; u.pitch = 1.12; speechSynthesis.speak(u); }
  document.addEventListener("visibilitychange", () => { if (document.hidden && canSpeak) speechSynthesis.cancel(); });

  /* ---------- çizim yardımcıları ---------- */
  function circle(c, x, y, r, fill, lw) { c.beginPath(); c.arc(x, y, Math.max(.1, r), 0, Math.PI * 2); if (fill) { c.fillStyle = fill; c.fill(); } if (lw) { c.strokeStyle = OL; c.lineWidth = lw; c.stroke(); } }
  function ell(c, x, y, rx, ry, rot, fill, lw) { c.beginPath(); c.ellipse(x, y, Math.max(.1, rx), Math.max(.1, ry), rot || 0, 0, Math.PI * 2); if (fill) { c.fillStyle = fill; c.fill(); } if (lw) { c.strokeStyle = OL; c.lineWidth = lw; c.stroke(); } }
  function eye(c, x, y, r) { circle(c, x, y, r, "#fff", r * .25); circle(c, x + r * .15, y, r * .55, OL); circle(c, x - r * .1, y - r * .25, r * .22, "#fff"); }
  function smile(c, x, y, r) { c.strokeStyle = OL; c.lineWidth = Math.max(1.5, r * .3); c.beginPath(); c.arc(x, y - r * .4, r, .2 * Math.PI, .8 * Math.PI); c.stroke(); }

  // tür çizimleri: (0,0) merkez, sağa bakar
  function drawCreature(c, sp, t, o) {
    o = o || {}; const id = sp.id || sp;
    c.save(); c.lineJoin = "round";
    if (id === "palyaco") { const w = Math.sin(t * 8) * .2; c.save(); c.rotate(w * .2); fishBody(c, 22, 14, "#FF8A2E"); c.fillStyle = "#fff"; c.strokeStyle = OL; c.lineWidth = 1.5; for (const bx of [-8, 4]) { c.beginPath(); c.ellipse(bx, 0, 3.5, 13, 0, 0, Math.PI * 2); c.fill(); c.stroke(); } tail(c, -20, "#FF8A2E", w); eye(c, 12, -3, 4); c.restore(); }
    else if (id === "yildiz") { c.save(); c.rotate(t * .05); c.beginPath(); for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5, r = i % 2 ? 9 : 22; c.lineTo(Math.cos(a) * r, Math.sin(a) * r); } c.closePath(); c.fillStyle = "#FF7A5A"; c.fill(); c.strokeStyle = OL; c.lineWidth = 2; c.stroke(); for (let i = 0; i < 12; i++) circle(c, Math.cos(i) * (5 + (i % 3) * 4), Math.sin(i) * (5 + (i % 3) * 4), 1.4, "#FFD0B0"); c.restore(); eye(c, -4, -2, 3); eye(c, 4, -2, 3); smile(c, 0, 5, 3); }
    else if (id === "yengec") { const l = Math.sin(t * 10) * 3; c.strokeStyle = OL; c.lineWidth = 3; for (const s of [-1, 1]) for (let k = 0; k < 3; k++) { c.beginPath(); c.moveTo(s * 10, 2 + k * 3); c.lineTo(s * 22, 8 + k * 4 + (k % 2 ? l : -l)); c.stroke(); } ell(c, 0, 0, 18, 12, 0, "#E8463F", 2); for (const s of [-1, 1]) { c.strokeStyle = OL; c.lineWidth = 3; c.beginPath(); c.moveTo(s * 12, -6); c.lineTo(s * 20, -16); c.stroke(); circle(c, s * 22, -19, 6, "#E8463F", 2); c.fillStyle = OL; c.beginPath(); c.moveTo(s * 22, -19); c.lineTo(s * 28, -23); c.lineTo(s * 26, -16); c.fill(); c.strokeStyle = OL; c.lineWidth = 2; c.beginPath(); c.moveTo(s * 5, -10); c.lineTo(s * 6, -18); c.stroke(); circle(c, s * 6, -20, 3.5, "#fff", 1.5); circle(c, s * 6.5, -20, 1.8, OL); } smile(c, 0, 2, 4); }
    else if (id === "denizati") { c.save(); c.rotate(Math.sin(t * 2) * .1); c.strokeStyle = "#FFB020"; c.lineWidth = 8; c.lineCap = "round"; c.beginPath(); c.moveTo(0, -14); c.quadraticCurveTo(10, 2, 2, 16); c.quadraticCurveTo(-8, 24, -2, 28); c.stroke(); c.strokeStyle = OL; c.lineWidth = 1.5; c.beginPath(); c.moveTo(-4, -14); c.quadraticCurveTo(6, 2, -2, 16); c.stroke(); ell(c, 2, -20, 8, 7, 0, "#FFB020", 2); c.fillStyle = "#FFB020"; c.beginPath(); c.moveTo(8, -22); c.lineTo(17, -20); c.lineTo(8, -16); c.fill(); c.strokeStyle = OL; c.stroke(); for (let k = 0; k < 4; k++) circle(c, -3, -26 + k * 0, 2, "#E8A020"); eye(c, 4, -21, 3); c.fillStyle = "#FFE066"; c.beginPath(); c.moveTo(-6, -4); c.lineTo(-13, -8 + Math.sin(t * 12) * 2); c.lineTo(-7, 2); c.fill(); c.restore(); }
    else if (id === "balon") { const p = o.puff || 0, r = 14 + p * 12; circle(c, 0, 0, r, "#E8D07A", 2); for (let i = 0; i < 14; i++) { const a = i / 14 * Math.PI * 2; c.strokeStyle = OL; c.lineWidth = 1.5; c.beginPath(); c.moveTo(Math.cos(a) * r, Math.sin(a) * r); c.lineTo(Math.cos(a) * (r + 3 + p * 5), Math.sin(a) * (r + 3 + p * 5)); c.stroke(); } ell(c, 0, r * .4, r * .8, r * .45, 0, "#FFF3C4"); tail(c, -r, "#E8D07A", Math.sin(t * 8) * .3); eye(c, r * .4, -r * .2, 4 + p * 2); c.strokeStyle = OL; c.lineWidth = 2; c.beginPath(); c.arc(r * .7, r * .2, 2.5, 0, Math.PI * 2); c.stroke(); }
    else if (id === "mercan") { const cols = ["#FF7AA2", "#FF9A5A", "#B98CFF"]; const col = cols[Math.floor(Math.abs(o.seed || 0) * 3) % 3]; c.strokeStyle = col; c.lineCap = "round"; const br = (x, y, a, l, w) => { if (l < 6) { circle(c, x, y, w * .9, col); return; } const x2 = x + Math.cos(a) * l, y2 = y + Math.sin(a) * l; c.lineWidth = w; c.beginPath(); c.moveTo(x, y); c.lineTo(x2, y2); c.stroke(); br(x2, y2, a - .45 + Math.sin(t + l) * .04, l * .72, w * .78); br(x2, y2, a + .45, l * .72, w * .78); }; br(0, 8, -Math.PI / 2, 20, 7); }
    else if (id === "istiridye") { const op = o.open || 0; c.save(); ell(c, 0, 4, 20, 9, 0, "#8E8496", 2); if (op > 0) { circle(c, 0, 0, 5, "#FFFFFF", 1.2); circle(c, -1.5, -1.5, 1.5, "#fff"); } c.save(); c.translate(-18, 2); c.rotate(-op * .8); c.beginPath(); c.moveTo(0, 0); c.quadraticCurveTo(18, -18, 36, 0); c.closePath(); c.fillStyle = "#B8AEC0"; c.fill(); c.strokeStyle = OL; c.lineWidth = 2; c.stroke(); c.strokeStyle = "rgba(0,0,0,.2)"; for (let k = 1; k < 4; k++) { c.beginPath(); c.moveTo(k * 9, 0); c.lineTo(18, -10); c.stroke(); } c.restore(); c.restore(); }
    else if (id === "kaplumbaga") { const f = Math.sin(t * 3); c.fillStyle = "#7CC04A"; for (const [x, y, s] of [[10, -10, 1], [10, 10, -1], [-12, -9, 1], [-12, 9, -1]]) { c.save(); c.translate(x, y); c.rotate(s * (.4 + f * .35)); ell(c, 6, 0, 10, 4, 0, "#7CC04A", 1.5); c.restore(); } ell(c, 22, 0, 8, 6.5, 0, "#7CC04A", 2); eye(c, 25, -2, 2.5); ell(c, 0, 0, 19, 14, 0, "#5A8A3A", 2.5); c.fillStyle = "#8BB860"; for (const [x, y] of [[0, 0], [-9, -6], [9, -6], [-9, 6], [9, 6]]) { c.beginPath(); c.ellipse(x, y, 5, 4, 0, 0, Math.PI * 2); c.fill(); } }
    else if (id === "ahtapot") { const col = o.ink ? "#C8C0B0" : "#B05AA8"; c.strokeStyle = col; c.lineCap = "round"; c.lineWidth = 6; for (let i = 0; i < 8; i++) { const bx = -16 + i * 4.5; c.beginPath(); c.moveTo(bx, 6); c.quadraticCurveTo(bx + Math.sin(t * 3 + i) * 10, 22, bx + Math.sin(t * 2 + i * 1.3) * 12, 32); c.stroke(); } ell(c, 0, -6, 20, 18, 0, col, 2.5); eye(c, -7, -6, 5); eye(c, 7, -6, 5); smile(c, 0, 4, 4); for (const [x, y] of [[-10, -16], [8, -18], [0, -20]]) circle(c, x, y, 2, "rgba(255,255,255,.35)"); }
    else if (id === "denizanasi") { const p = Math.sin(t * 2.5); c.strokeStyle = "rgba(255,180,230,.8)"; c.lineWidth = 2; for (let i = 0; i < 5; i++) { const bx = -10 + i * 5; c.beginPath(); c.moveTo(bx, 2); c.bezierCurveTo(bx + Math.sin(t * 2 + i) * 6, 14, bx - Math.sin(t * 2 + i) * 6, 26, bx + Math.sin(t + i) * 4, 36); c.stroke(); } c.globalAlpha = .85; c.beginPath(); c.ellipse(0, 0, 17 + p * 2, 14 - p * 2, 0, Math.PI, 0); c.lineTo(17, 3); c.quadraticCurveTo(0, 7, -17, 3); c.closePath(); c.fillStyle = "#FF9ED8"; c.fill(); c.strokeStyle = OL; c.lineWidth = 1.5; c.stroke(); c.globalAlpha = 1; eye(c, -5, -4, 3); eye(c, 5, -4, 3); }
    else if (id === "yunus") { c.save(); c.rotate(Math.sin(t * 3) * .08); c.beginPath(); c.moveTo(30, 2); c.quadraticCurveTo(24, -12, 0, -11); c.quadraticCurveTo(-22, -10, -30, 0); c.quadraticCurveTo(-18, 10, 6, 9); c.quadraticCurveTo(22, 9, 30, 2); c.closePath(); c.fillStyle = "#7A9AC8"; c.fill(); c.strokeStyle = OL; c.lineWidth = 2; c.stroke(); ell(c, 4, 5, 16, 4, 0, "#DDE8F4"); c.beginPath(); c.moveTo(30, 2); c.lineTo(38, 4); c.lineTo(29, 6); c.fillStyle = "#7A9AC8"; c.fill(); c.stroke(); c.beginPath(); c.moveTo(-2, -10); c.lineTo(-8, -20); c.lineTo(-12, -9); c.fill(); c.stroke(); tail(c, -30, "#7A9AC8", Math.sin(t * 6) * .3, true); eye(c, 18, -2, 3); c.restore(); }
    else if (id === "balina") { c.beginPath(); c.moveTo(34, 4); c.quadraticCurveTo(30, -16, 0, -16); c.quadraticCurveTo(-28, -14, -34, 0); c.quadraticCurveTo(-20, 14, 8, 13); c.quadraticCurveTo(30, 12, 34, 4); c.closePath(); c.fillStyle = "#4E78B8"; c.fill(); c.strokeStyle = OL; c.lineWidth = 2; c.stroke(); c.save(); c.clip(); c.fillStyle = "#BCD0EC"; c.fillRect(-30, 5, 64, 12); c.strokeStyle = "rgba(0,0,0,.2)"; for (let k = 0; k < 6; k++) { c.beginPath(); c.moveTo(-10 + k * 7, 6); c.lineTo(-10 + k * 7, 14); c.stroke(); } c.restore(); tail(c, -34, "#4E78B8", Math.sin(t * 2) * .25, true); eye(c, 20, -3, 3); smile(c, 26, 6, 4); ell(c, 4, 8, 7, 3, .4, "#4E78B8", 1.5); }
    else if (id === "kopekbaligi") { c.beginPath(); c.moveTo(34, 2); c.quadraticCurveTo(26, -12, 0, -11); c.quadraticCurveTo(-24, -9, -30, 0); c.quadraticCurveTo(-18, 10, 8, 9); c.quadraticCurveTo(26, 9, 34, 2); c.closePath(); c.fillStyle = "#8E9AAE"; c.fill(); c.strokeStyle = OL; c.lineWidth = 2; c.stroke(); ell(c, 6, 5, 18, 4, 0, "#E6ECF4"); c.beginPath(); c.moveTo(0, -10); c.lineTo(-6, -24); c.lineTo(-12, -9); c.fillStyle = "#8E9AAE"; c.fill(); c.stroke(); tail(c, -30, "#8E9AAE", Math.sin(t * 5) * .3, true); eye(c, 20, -3, 3); c.strokeStyle = OL; c.lineWidth = 1.5; c.beginPath(); c.arc(24, 4, 6, .1 * Math.PI, .8 * Math.PI); c.stroke(); c.fillStyle = "#fff"; for (let k = 0; k < 3; k++) { c.beginPath(); c.moveTo(20 + k * 3, 8); c.lineTo(21.5 + k * 3, 11); c.lineTo(23 + k * 3, 8); c.fill(); } for (let k = 0; k < 3; k++) { c.beginPath(); c.moveTo(10 - k * 3, -2); c.lineTo(10 - k * 3, 4); c.stroke(); } }
    else if (id === "vatoz") { const f = Math.sin(t * 3) * 6; c.beginPath(); c.moveTo(18, 0); c.quadraticCurveTo(4, -26 - f, -10, -4); c.lineTo(-14, 0); c.lineTo(-10, 4); c.quadraticCurveTo(4, 26 + f, 18, 0); c.closePath(); c.fillStyle = "#6E8AA8"; c.fill(); c.strokeStyle = OL; c.lineWidth = 2; c.stroke(); c.strokeStyle = "#4E6A88"; c.lineWidth = 2.5; c.beginPath(); c.moveTo(-12, 0); c.quadraticCurveTo(-26, 2, -36, -4 + f * .4); c.stroke(); eye(c, 10, -4, 2.5); eye(c, 10, 4, 2.5); }
    else if (id === "suru") { for (let k = 0; k < 9; k++) { const a = k * 2.4, r = 6 + (k % 3) * 9; c.save(); c.translate(Math.cos(a + t * .5) * r * 1.4, Math.sin(a + t * .5) * r * .6); c.scale(.45, .45); fishBody(c, 22, 10, "#BFD8E8"); tail(c, -20, "#BFD8E8", Math.sin(t * 10 + k) * .3); eye(c, 12, -2, 3.5); c.restore(); } }
    else if (id === "kestane") { for (let i = 0; i < 22; i++) { const a = i / 22 * Math.PI * 2; c.strokeStyle = "#5A2E6A"; c.lineWidth = 2; c.beginPath(); c.moveTo(Math.cos(a) * 9, Math.sin(a) * 7); c.lineTo(Math.cos(a) * (18 + (i % 2) * 4), Math.sin(a) * (14 + (i % 2) * 3)); c.stroke(); } ell(c, 0, 0, 11, 9, 0, "#7A3A8E", 2); eye(c, -4, -1, 2.5); eye(c, 4, -1, 2.5); }
    else if (id === "kalamar") { c.strokeStyle = "#E88A6A"; c.lineCap = "round"; c.lineWidth = 3.5; for (let i = 0; i < 6; i++) { c.beginPath(); c.moveTo(-14, -6 + i * 2.4); c.quadraticCurveTo(-24, -8 + i * 3 + Math.sin(t * 4 + i) * 4, -34, -8 + i * 3.4); c.stroke(); } c.beginPath(); c.moveTo(28, 0); c.lineTo(12, -10); c.quadraticCurveTo(-8, -9, -14, 0); c.quadraticCurveTo(-8, 9, 12, 10); c.closePath(); c.fillStyle = "#F2A07A"; c.fill(); c.strokeStyle = OL; c.lineWidth = 2; c.stroke(); eye(c, -6, -2, 4.5); }
    else if (id === "fener") { const g = c.createRadialGradient(22, -22, 1, 22, -22, 26); g.addColorStop(0, "rgba(255,250,170,.9)"); g.addColorStop(1, "rgba(255,250,170,0)"); c.fillStyle = g; c.beginPath(); c.arc(22, -22, 26, 0, Math.PI * 2); c.fill(); c.strokeStyle = "#5A4A6A"; c.lineWidth = 2; c.beginPath(); c.moveTo(6, -14); c.quadraticCurveTo(14, -30, 22, -22); c.stroke(); circle(c, 22, -22, 4, "#FFFAB0"); circle(c, 0, 0, 17, "#5A4A6A", 2); tail(c, -16, "#5A4A6A", Math.sin(t * 4) * .3); eye(c, 4, -6, 4); c.fillStyle = "#fff"; c.strokeStyle = OL; c.lineWidth = 1.5; c.beginPath(); c.moveTo(6, 6); for (let k = 0; k < 5; k++) { c.lineTo(8 + k * 2.5, 2 + (k % 2) * 6); } c.lineTo(17, 6); c.stroke(); }
    else if (id === "gemi") { c.save(); c.rotate(-.12); c.fillStyle = "#6E4A26"; c.beginPath(); c.moveTo(-90, -40); c.lineTo(90, -40); c.lineTo(70, 0); c.lineTo(-74, 0); c.closePath(); c.fill(); c.strokeStyle = OL; c.lineWidth = 3; c.stroke(); c.strokeStyle = "#4A2E16"; c.lineWidth = 2; for (let k = 1; k < 4; k++) { c.beginPath(); c.moveTo(-86 + k * 2, -40 + k * 10); c.lineTo(86 - k * 4, -40 + k * 10); c.stroke(); } for (const px of [-50, -10, 30]) circle(c, px, -24, 6, "#1A2A3A", 2); c.strokeStyle = "#5A3A1E"; c.lineWidth = 6; c.beginPath(); c.moveTo(0, -40); c.lineTo(10, -130); c.stroke(); c.fillStyle = "rgba(230,220,190,.75)"; c.beginPath(); c.moveTo(8, -124); c.quadraticCurveTo(50, -100, 40, -60); c.lineTo(4, -66); c.closePath(); c.fill(); c.strokeStyle = OL; c.lineWidth = 2; c.stroke(); c.restore(); ell(c, -20, -70, 10, 4, 0, "rgba(255,255,255,.0)"); }
    else if (id === "hazine") { const op = o.open || 0; c.fillStyle = "#8A5A2B"; c.fillRect(-26, -18, 52, 26); c.strokeStyle = OL; c.lineWidth = 2.5; c.strokeRect(-26, -18, 52, 26); c.fillStyle = "#C9A24A"; c.fillRect(-26, -6, 52, 4); c.fillRect(-4, -18, 8, 26); if (op) { for (let k = 0; k < 6; k++) circle(c, -16 + k * 6.5, -20 - (k % 2) * 4, 4, k % 2 ? "#FFF" : "#FFD23F", 1); } c.save(); c.translate(-26, -18); c.rotate(-op * 1.1); c.fillStyle = "#A0673A"; c.beginPath(); c.moveTo(0, 0); c.quadraticCurveTo(26, -18, 52, 0); c.closePath(); c.fill(); c.strokeStyle = OL; c.stroke(); c.restore(); if (op) { const g = c.createRadialGradient(0, -24, 2, 0, -24, 40); g.addColorStop(0, "rgba(255,230,120,.7)"); g.addColorStop(1, "rgba(255,230,120,0)"); c.fillStyle = g; c.beginPath(); c.arc(0, -24, 40, 0, Math.PI * 2); c.fill(); } }
    c.restore();
  }
  function fishBody(c, w, h, col) { c.beginPath(); c.ellipse(0, 0, w, h, 0, 0, Math.PI * 2); c.fillStyle = col; c.fill(); c.strokeStyle = OL; c.lineWidth = 2; c.stroke(); }
  function tail(c, x, col, w, horiz) { c.save(); c.translate(x, 0); c.rotate(w || 0); c.beginPath(); if (horiz) { c.moveTo(2, 0); c.lineTo(-10, -9); c.quadraticCurveTo(-6, 0, -10, 9); } else { c.moveTo(2, 0); c.lineTo(-12, -10); c.lineTo(-12, 10); } c.closePath(); c.fillStyle = col; c.fill(); c.strokeStyle = OL; c.lineWidth = 2; c.stroke(); c.restore(); }
  function drawSub(c, x, y, dir, t, col, lamp) {
    const [c1, c2] = SUBCOL[col] || SUBCOL[0];
    c.save(); c.translate(x, y); c.scale(dir, 1); c.rotate(Math.sin(t * 1.5) * .04);
    if (lamp) { const g = c.createLinearGradient(40, 0, 220, 0); g.addColorStop(0, "rgba(255,250,200,.45)"); g.addColorStop(1, "rgba(255,250,200,0)"); c.fillStyle = g; c.beginPath(); c.moveTo(40, -4); c.lineTo(230, -70); c.lineTo(230, 70); c.lineTo(40, 6); c.fill(); }
    // pervane
    c.save(); c.translate(-52, 2); c.fillStyle = "#8E8E9E"; c.fillRect(-6, -4, 8, 8); const s = Math.sin(t * 30); ell(c, -8, 0, 4, 14 * Math.abs(s) + 2, 0, "#B8B8C8", 1.5); c.restore();
    // gövde
    ell(c, 0, 0, 52, 30, 0, c1, 3); ell(c, -4, 12, 44, 14, 0, c2); ell(c, 0, 0, 52, 30, 0, null, 3);
    ell(c, -14, -12, 18, 7, -.2, "rgba(255,255,255,.45)");
    c.fillStyle = c1; c.fillRect(-12, -46, 22, 20); c.strokeStyle = OL; c.lineWidth = 3; c.strokeRect(-12, -46, 22, 20); c.fillRect(2, -58, 5, 14); c.strokeRect(2, -58, 5, 14); c.fillRect(2, -60, 14, 5); c.strokeRect(2, -60, 14, 5);
    // lomboz ve Egemen
    circle(c, 18, -2, 16, "#B8B8C8", 3); circle(c, 18, -2, 12, "#8FD3FF");
    c.save(); c.beginPath(); c.arc(18, -2, 12, 0, Math.PI * 2); c.clip(); circle(c, 18, 2, 9, "#F3C49B"); c.fillStyle = "#6B4226"; c.beginPath(); c.arc(18, -2, 9.5, Math.PI * 1.05, Math.PI * 1.95); c.fill(); circle(c, 15, 1, 1.4, OL); circle(c, 21, 1, 1.4, OL); c.strokeStyle = OL; c.lineWidth = 1.2; c.beginPath(); c.arc(18, 3, 3, .2 * Math.PI, .8 * Math.PI); c.stroke(); c.restore();
    ell(c, 13, -7, 3, 2, -.5, "rgba(255,255,255,.7)");
    for (const bx of [-30, -16]) circle(c, bx, -2, 4, "#B8B8C8", 2);
    circle(c, 48, -4, 6, lamp ? "#FFF6B0" : "#8E8E9E", 2);
    c.restore();
  }

  /* ---------- arka plan ---------- */
  let bgCv = null;
  function renderBg() {
    const c = document.createElement("canvas"); c.width = WW; c.height = WH; const x = c.getContext("2d");
    const g = x.createLinearGradient(0, 0, 0, WH); g.addColorStop(0, "#5EC8F0"); g.addColorStop(.3, "#2A90D0"); g.addColorStop(.6, "#155C94"); g.addColorStop(.8, "#0B2E52"); g.addColorStop(1, "#061A30"); x.fillStyle = g; x.fillRect(0, 0, WW, WH);
    // uzak kayalar
    x.fillStyle = "rgba(10,50,90,.35)"; x.beginPath(); x.moveTo(0, WH); for (let px = 0; px <= WW; px += 40) x.lineTo(px, floorY(px) - 90 - Math.sin(px / 210) * 60); x.lineTo(WW, WH); x.fill();
    // deniz tabanı
    x.beginPath(); x.moveTo(0, WH); for (let px = 0; px <= WW; px += 10) x.lineTo(px, floorY(px)); x.lineTo(WW, WH); x.closePath();
    const sg = x.createLinearGradient(0, 600, 0, WH); sg.addColorStop(0, "#F2D58A"); sg.addColorStop(.35, "#C9A86A"); sg.addColorStop(.7, "#5A5A6E"); sg.addColorStop(1, "#2A2A3A"); x.fillStyle = sg; x.fill();
    x.strokeStyle = "rgba(0,0,0,.2)"; x.lineWidth = 3; x.stroke();
    for (let i = 0; i < 500; i++) { const px = Math.random() * WW, py = floorY(px) + Math.random() * 80; x.fillStyle = "rgba(0,0,0,.08)"; x.fillRect(px, py, 3, 2); }
    // kayalar
    for (let i = 0; i < 40; i++) { const px = Math.random() * WW, py = floorY(px); x.fillStyle = px > 2600 ? "#3A3A4A" : "#7A7A8A"; x.beginPath(); x.ellipse(px, py + 4, 18 + Math.random() * 30, 12 + Math.random() * 14, 0, Math.PI, 0); x.fill(); x.strokeStyle = "rgba(0,0,0,.3)"; x.lineWidth = 2; x.stroke(); }
    // anemonlar (resif)
    for (let i = 0; i < 14; i++) { const px = 180 + i * 62 + Math.random() * 20, py = floorY(px); x.strokeStyle = ["#FF7AA2", "#B98CFF", "#FF9A5A"][i % 3]; x.lineWidth = 5; x.lineCap = "round"; for (let k = 0; k < 7; k++) { x.beginPath(); x.moveTo(px, py); x.quadraticCurveTo(px - 15 + k * 5, py - 20, px - 18 + k * 6, py - 34 - Math.random() * 10); x.stroke(); } }
    // ışık huzmeleri
    for (let i = 0; i < 18; i++) { const px = i * 210 + Math.random() * 60, w = 40 + Math.random() * 50; const lg = x.createLinearGradient(0, 0, 0, 800); lg.addColorStop(0, "rgba(255,255,255,.18)"); lg.addColorStop(1, "rgba(255,255,255,0)"); x.fillStyle = lg; x.beginPath(); x.moveTo(px, 0); x.lineTo(px + w, 0); x.lineTo(px + w + 120, 800); x.lineTo(px + 120, 800); x.fill(); }
    return c;
  }
  const kelp = []; for (let i = 0; i < 46; i++) { const kx = 1250 + Math.random() * 1200; kelp.push({ x: kx, h: 160 + Math.random() * 260, ph: Math.random() * 6 }); }
  for (let i = 0; i < 14; i++) { const kx = 60 + Math.random() * 1000; kelp.push({ x: kx, h: 80 + Math.random() * 120, ph: Math.random() * 6 }); }

  /* ---------- oyun döngüsü ---------- */
  let state = "title", clock = 0, cam = { x: 0, y: 0 }, target = null, keys = {}, parts = [], bubbles = [], flash = 0, floaters = [], modalOpen = false, idleT = 0;
  function canvasXY(e) { const r = cv.getBoundingClientRect(); return [(e.clientX - r.left) / r.width * W, (e.clientY - r.top) / r.height * H]; }
  let pdown = null;
  cv.addEventListener("pointerdown", (e) => { audio(); if (state !== "play" || modalOpen) return; e.preventDefault(); const [sx, sy] = canvasXY(e); pdown = { sx, sy, t: clock, moved: false }; target = { x: sx + cam.x, y: sy + cam.y }; try { cv.setPointerCapture(e.pointerId); } catch (x) {} });
  cv.addEventListener("pointermove", (e) => { if (!pdown) return; const [sx, sy] = canvasXY(e); if (Math.hypot(sx - pdown.sx, sy - pdown.sy) > 14) pdown.moved = true; target = { x: sx + cam.x, y: sy + cam.y }; });
  const up = (e) => { if (!pdown) return; const [sx, sy] = canvasXY(e); if (!pdown.moved && clock - pdown.t < .35) tapAt(sx + cam.x, sy + cam.y); pdown = null; target = null; };
  cv.addEventListener("pointerup", up); cv.addEventListener("pointercancel", () => { pdown = null; target = null; });
  addEventListener("keydown", (e) => { if (state !== "play") return; if (["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(e.code)) { e.preventDefault(); keys[e.code] = true; } if (e.code === "Space") { e.preventDefault(); const c = nearest(); if (c) tapAt(c.x, c.y); } });
  addEventListener("keyup", (e) => { keys[e.code] = false; });
  function nearest() { let best = null, bd = 260; for (const c of crit) { const d = Math.hypot(c.x - sub.x, c.y - sub.y); if (d < bd) { bd = d; best = c; } } return best; }
  function hitR(c) { return 26 * c.sp.s + 16; }
  function tapAt(wx, wy) {
    let hit = null, hd = 1e9;
    for (const c of crit) { const d = Math.hypot(wx - c.x, wy - (c.y - (c.sp.id === "gemi" ? 60 : 0))); const r = c.sp.id === "gemi" ? 110 : hitR(c); if (d < r && d < hd) { hd = d; hit = c; } }
    if (!hit) return;
    const dist = Math.hypot(hit.x - sub.x, hit.y - sub.y);
    if (dist > 300 + hit.sp.s * 20) { say("Biraz daha yaklaş!"); sfx.no(); return; }
    if (hit.sp.id === "istiridye") { if (hit.regen > 0) { say("Bu istiridye boş. Sonra yine inci olacak."); } else { hit.open = 1; hit.regen = 40; S.pearls++; sfx.pearl(); floaters.push({ x: hit.x, y: hit.y - 30, text: "+1 inci", t: 0 }); save(); } }
    if (hit.sp.id === "hazine" && !S.found.hazine) { hit.open = 1; S.pearls += 10; floaters.push({ x: hit.x, y: hit.y - 50, text: "+10 inci!", t: 0 }); }
    if (hit.sp.id === "balon") hit.puff = 1;
    if (hit.sp.id === "kalamar") hit.ink = 1.5;
    photo(hit);
  }
  function photo(c) {
    flash = 1; sfx.snap();
    const sp = c.sp;
    if (!S.found[sp.id]) {
      S.found[sp.id] = 1; save(); sfx.found(); state = "card";
      const n = Object.keys(S.found).length;
      setTimeout(() => showCard(sp, n), 450);
    } else { say(sp.name + "! " + sp.fact); floaters.push({ x: c.x, y: c.y - 40, text: sp.name, t: 0 }); }
    if (S.tut === 1 && sp.id === "palyaco") S.tut = 2;
  }
  function showCard(sp, n) {
    modalOpen = true; const sh = $("sheet");
    sh.innerHTML = "<h2>Yeni keşif! 📸</h2><canvas class='big' width='480' height='320'></canvas><h2>" + sp.name + "</h2><p>" + sp.fact + "</p><p><b>Albüm: " + n + " / " + SPECIES.length + "</b></p><button class='btn' type='button' id='cardOk'>Harika!</button>";
    const c = sh.querySelector("canvas"), x = c.getContext("2d"); paintPortrait(x, 480, 320, sp, true);
    $("modal").hidden = false; $("cardOk").focus();
    say(sp.name + "! " + sp.fact + (n === SPECIES.length ? " Tebrikler Egemen, albümü tamamladın!" : ""), true);
    $("cardOk").onclick = () => { $("modal").hidden = true; modalOpen = false; state = "play"; $("tip").textContent = ""; if (n === 3 && !S.lamp) setTimeout(() => say("İstiridyelerden inci topla. Garajda fener alırsan karanlık derinliğe inebilirsin!"), 800); };
  }
  function paintPortrait(x, w, h, sp, color) {
    const g = x.createLinearGradient(0, 0, 0, h); const deep = sp.x[0] >= 2700; g.addColorStop(0, deep ? "#1A3A6A" : "#7FD8F6"); g.addColorStop(1, deep ? "#061A30" : "#2A90D0"); x.fillStyle = g; x.fillRect(0, 0, w, h);
    x.fillStyle = "rgba(242,213,138,.9)"; x.fillRect(0, h * .82, w, h * .18);
    const big = { balina: .55, gemi: .9, kopekbaligi: .9, yunus: 1 }[sp.id] || 1.6;
    const sc = Math.min(w, h) / 120 * big * (sp.id === "gemi" ? .5 : 1);
    x.save(); x.translate(w / 2, h / 2 + (sp.y === "floor" ? h * .2 : 0) + (sp.id === "gemi" ? h * .25 : 0)); x.scale(sc, sc); drawCreature(x, sp, clock, { open: sp.id === "hazine" ? 1 : 0, seed: .4 }); x.restore();
  }
  function update(dt) {
    clock += dt;
    for (const p of parts) { p.life -= dt; p.x += p.vx * dt; p.y += p.vy * dt; } parts = parts.filter((p) => p.life > 0);
    for (const f of floaters) f.t += dt; floaters = floaters.filter((f) => f.t < 1.5);
    flash = Math.max(0, flash - dt * 3);
    if (state !== "play") return;
    // denizaltı
    const maxV = S.turbo ? 260 : 180; let ax = 0, ay = 0;
    if (target) { const dx = target.x - sub.x, dy = target.y - sub.y, d = Math.hypot(dx, dy); if (d > 20) { ax = dx / d; ay = dy / d; } }
    if (keys.ArrowLeft) ax = -1; if (keys.ArrowRight) ax = 1; if (keys.ArrowUp) ay = -1; if (keys.ArrowDown) ay = 1;
    sub.vx += (ax * maxV - sub.vx) * Math.min(1, dt * 2.5); sub.vy += (ay * maxV - sub.vy) * Math.min(1, dt * 2.5);
    sub.x += sub.vx * dt; sub.y += sub.vy * dt; if (Math.abs(sub.vx) > 15) sub.dir = sub.vx > 0 ? 1 : -1;
    sub.x = clamp(sub.x, 60, WW - 60); sub.y = clamp(sub.y, 50, floorY(sub.x) - 40);
    if (!S.lamp && sub.y > DEEP - 40) { sub.y = DEEP - 40; sub.vy = Math.min(0, sub.vy); if (clock - (update.lt || 0) > 6) { update.lt = clock; say("Aşağısı çok karanlık! Garajdan fener almamız lazım. İstiridyelerden inci topla."); sfx.no(); } }
    sub.prop += dt;
    if (Math.random() < dt * (3 + Math.hypot(sub.vx, sub.vy) / 30)) bubbles.push({ x: sub.x - sub.dir * 56, y: sub.y + rnd(-6, 6), r: rnd(2, 5), vy: -rnd(30, 60), life: 3 });
    for (const b of bubbles) { b.life -= dt; b.y += b.vy * dt; b.x += Math.sin(clock * 3 + b.r) * 10 * dt; } bubbles = bubbles.filter((b) => b.life > 0 && b.y > 0);
    if (Math.random() < dt * .5) sfx.bubble();
    // canlılar
    for (const c of crit) {
      const sp = c.sp; c.t += dt; c.regen = Math.max(0, c.regen - dt); if (c.regen <= 0 && sp.id === "istiridye") c.open = Math.max(0, c.open - dt);
      c.puff = Math.max(0, c.puff - dt * .3); c.ink = Math.max(0, c.ink - dt);
      if (sp.move === "swim" || sp.move === "school") { c.x += c.dir * sp.sp * dt; if (c.x < sp.x[0] - 60) c.dir = 1; if (c.x > sp.x[1] + 60) c.dir = -1; c.y = c.hy + Math.sin(c.t * .7) * 20; if (Math.random() < dt * .05) c.dir *= -1; }
      else if (sp.move === "bob") { c.y = c.hy + Math.sin(c.t * 1.2) * 10; c.x = c.hx + Math.sin(c.t * .4) * 30; c.dir = Math.cos(c.t * .4) > 0 ? 1 : -1; }
      else if (sp.move === "jelly") { c.y = c.hy + Math.sin(c.t * .8) * 40; c.x = c.hx + Math.sin(c.t * .3) * 40; }
      else if (sp.move === "crab") { c.x = c.hx + Math.sin(c.t * .5) * 60; c.y = floorY(c.x) - 10; }
      // denizaltından kaçma ve merak
      const d = Math.hypot(c.x - sub.x, c.y - sub.y); if (sp.id === "balon" && d < 90) c.puff = Math.min(1, c.puff + dt * 3);
      if (sp.id === "kalamar" && d < 80 && c.ink <= 0) { c.ink = 1.5; for (let k = 0; k < 20; k++) parts.push({ x: c.x, y: c.y, vx: rnd(-40, 40), vy: rnd(-40, 40), life: rnd(1, 2), c: "rgba(20,10,30,.6)", s: rnd(8, 16) }); }
    }
    // kamera
    cam.x += (clamp(sub.x - W / 2, 0, WW - W) - cam.x) * Math.min(1, dt * 4); cam.y += (clamp(sub.y - H / 2, 0, WH - H) - cam.y) * Math.min(1, dt * 4);
    // ipucu
    idleT += dt;
    if (S.tut === 0) { S.tut = 1; save(); say("Merhaba Egemen! Ekrana parmağını bastır ve tut, denizaltı oraya gider. Hadi turuncu palyaço balığını bulalım!"); idleT = 0; }
    if (S.tut === 1 && idleT > 14) { idleT = 0; say("Palyaço balığının yanına git ve ona dokun. Fotoğrafını çekelim!"); }
    if (S.tut === 2) { S.tut = 3; save(); setTimeout(() => say("Süper! Okyanusta daha birçok canlı var. Sağa doğru açık denize git!"), 4000); }
  }

  /* ---------- çizim ---------- */
  function draw() {
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    if (!bgCv) bgCv = renderBg();
    if (state === "title") { ctx.drawImage(bgCv, 0, 0, W, H, 0, 0, W, H); return; }
    const cx = Math.round(cam.x), cy = Math.round(cam.y);
    ctx.drawImage(bgCv, cx, cy, W, H, 0, 0, W, H);
    ctx.save(); ctx.translate(-cx, -cy);
    // yüzey dalgaları
    if (cy < 80) { ctx.fillStyle = "rgba(255,255,255,.5)"; for (let x = Math.floor(cx / 40) * 40; x < cx + W + 40; x += 40) { ctx.beginPath(); ctx.ellipse(x + Math.sin(clock + x) * 5, 6, 22, 5, 0, 0, Math.PI * 2); ctx.fill(); } ctx.fillStyle = "#BDEFFF"; ctx.fillRect(cx, -20, W, 22); }
    // yosunlar
    for (const k of kelp) { if (k.x < cx - 60 || k.x > cx + W + 60) continue; const by = floorY(k.x); ctx.strokeStyle = "#2E8A4A"; ctx.lineWidth = 8; ctx.lineCap = "round"; ctx.beginPath(); ctx.moveTo(k.x, by); for (let s = 1; s <= 8; s++) { const yy = by - k.h * s / 8; ctx.lineTo(k.x + Math.sin(clock * 1.2 + k.ph + s * .6) * s * 3, yy); } ctx.stroke(); ctx.fillStyle = "#3FA35A"; for (let s = 2; s <= 8; s += 2) { const yy = by - k.h * s / 8, xx = k.x + Math.sin(clock * 1.2 + k.ph + s * .6) * s * 3; ctx.beginPath(); ctx.ellipse(xx + 8, yy, 10, 4, .5, 0, Math.PI * 2); ctx.fill(); } }
    // canlılar
    for (const c of crit) { const sp = c.sp, r = 300 * Math.max(1, sp.s); if (c.x < cx - r || c.x > cx + W + r || c.y < cy - r || c.y > cy + H + r) continue; ctx.save(); ctx.translate(c.x, c.y); if (sp.move !== "still" && sp.move !== "crab" && sp.move !== "oyster" && sp.id !== "denizanasi") ctx.scale(c.dir * sp.s, sp.s); else ctx.scale(sp.s, sp.s); drawCreature(ctx, sp, c.t, { puff: c.puff, ink: c.ink, open: c.open, seed: (c.hx % 7) / 7 });
        if (!S.found[sp.id] && Math.hypot(c.x - sub.x, c.y - sub.y) < 320) { ctx.restore(); ctx.save(); ctx.translate(c.x, c.y - 30 * sp.s - 22 - (sp.id === "gemi" ? 110 : 0)); ctx.globalAlpha = .6 + .4 * Math.sin(clock * 5); ctx.fillStyle = "#FFD23F"; ctx.beginPath(); ctx.arc(0, 0, 13, 0, Math.PI * 2); ctx.fill(); ctx.strokeStyle = OL; ctx.lineWidth = 2; ctx.stroke(); ctx.fillStyle = OL; ctx.font = "700 16px Fredoka"; ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.fillText("?", 0, 1); }
        ctx.restore(); }
    // kabarcıklar ve parçacıklar
    for (const b of bubbles) { ctx.strokeStyle = "rgba(255,255,255,.7)"; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2); ctx.stroke(); }
    for (const p of parts) { ctx.globalAlpha = Math.min(1, p.life); ctx.fillStyle = p.c; ctx.beginPath(); ctx.arc(p.x, p.y, p.s, 0, Math.PI * 2); ctx.fill(); } ctx.globalAlpha = 1;
    drawSub(ctx, sub.x, sub.y, sub.dir, clock, S.color, S.lamp && sub.y > 700);
    if (target && pdown) { ctx.strokeStyle = "rgba(255,255,255,.6)"; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(target.x, target.y, 14 + Math.sin(clock * 8) * 3, 0, Math.PI * 2); ctx.stroke(); }
    for (const f of floaters) { ctx.globalAlpha = 1 - f.t / 1.5; txt(f.text, f.x, f.y - f.t * 30, 22, "#FFF6B0"); } ctx.globalAlpha = 1;
    ctx.restore();
    // derinlik karanlığı
    const dark = clamp((sub.y - 800) / 600, 0, .93);
    if (dark > 0) {
      if (!darkCv) { darkCv = document.createElement("canvas"); darkCv.width = W; darkCv.height = H; }
      const d = darkCv.getContext("2d"); d.globalCompositeOperation = "source-over"; d.clearRect(0, 0, W, H); d.fillStyle = "rgba(2,8,20," + dark + ")"; d.fillRect(0, 0, W, H);
      d.globalCompositeOperation = "destination-out"; const sx = sub.x - cx, sy = sub.y - cy;
      const hole = (x, y, r) => { const g = d.createRadialGradient(x, y, r * .2, x, y, r); g.addColorStop(0, "rgba(0,0,0,1)"); g.addColorStop(1, "rgba(0,0,0,0)"); d.fillStyle = g; d.beginPath(); d.arc(x, y, r, 0, Math.PI * 2); d.fill(); };
      hole(sx, sy, S.lamp ? 120 : 70); if (S.lamp) { hole(sx + sub.dir * 150, sy, 130); hole(sx + sub.dir * 260, sy, 90); }
      for (const c of crit) if (c.sp.id === "fener") hole(c.x - cx + 22 * c.sp.s * c.dir, c.y - cy - 22 * c.sp.s, 70);
      for (const c of crit) if (c.sp.id === "hazine" && c.open) hole(c.x - cx, c.y - cy - 20, 80);
      d.globalCompositeOperation = "source-over"; ctx.drawImage(darkCv, 0, 0);
    }
    if (flash > 0) { ctx.fillStyle = "rgba(255,255,255," + flash * .8 + ")"; ctx.fillRect(0, 0, W, H); }
    hud();
  }
  let darkCv = null;
  function txt(s, x, y, size, col) { ctx.font = "700 " + size + "px Fredoka, sans-serif"; ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.lineWidth = size * .2; ctx.strokeStyle = "rgba(10,30,50,.85)"; ctx.strokeText(s, x, y); ctx.fillStyle = col; ctx.fillText(s, x, y); }
  function hud() {
    const n = Object.keys(S.found).length;
    ctx.fillStyle = "rgba(10,40,70,.65)"; ctx.beginPath(); ctx.roundRect ? ctx.roundRect(14, 14, 250, 50, 25) : ctx.rect(14, 14, 250, 50); ctx.fill();
    ctx.font = "26px sans-serif"; ctx.textAlign = "left"; ctx.textBaseline = "middle"; ctx.fillText("📷", 26, 40); txt(n + " / " + SPECIES.length, 100, 41, 24, "#fff");
    circle(ctx, 168, 40, 11, "#F4F4FF", 2); circle(ctx, 165, 37, 3, "#fff"); txt(String(S.pearls), 210, 41, 24, "#F4F4FF");
    // derinlik ölçer
    const dm = Math.round(sub.y / 10); txt(dm + " m", W - 60, 36, 22, sub.y > DEEP ? "#9FE3FA" : "#fff");
    // mini harita
    const mw = 180, mh = 90, mx = W - mw - 16, my = 58; ctx.fillStyle = "rgba(10,40,70,.6)"; ctx.fillRect(mx, my, mw, mh); ctx.strokeStyle = "rgba(255,255,255,.6)"; ctx.lineWidth = 2; ctx.strokeRect(mx, my, mw, mh);
    ctx.fillStyle = "rgba(242,213,138,.7)"; ctx.beginPath(); ctx.moveTo(mx, my + mh); for (let px = 0; px <= WW; px += 60) ctx.lineTo(mx + px / WW * mw, my + floorY(px) / WH * mh); ctx.lineTo(mx + mw, my + mh); ctx.fill();
    for (const c of crit) if (!S.found[c.sp.id] && c.sp.id !== "istiridye") { const near = Math.hypot(c.x - sub.x, c.y - sub.y) < 900; if (near) circle(ctx, mx + c.x / WW * mw, my + c.y / WH * mh, 2, "#FFD23F"); }
    circle(ctx, mx + sub.x / WW * mw, my + sub.y / WH * mh, 4, "#FF5A5A", 1.5);
  }

  /* ---------- albüm ve garaj ---------- */
  function openAlbum() {
    if (state !== "play") return; modalOpen = true; const sh = $("sheet"), n = Object.keys(S.found).length;
    sh.innerHTML = "<h2>Keşif Albümüm " + n + " / " + SPECIES.length + "</h2><div class='alb' id='alb'></div><button class='btn ghost' type='button' id='mClose'>✕ Kapat</button>";
    const box = $("alb");
    SPECIES.forEach((sp) => { const own = !!S.found[sp.id]; const d = document.createElement("button"); d.type = "button"; d.className = "slot" + (own ? "" : " no"); const c = document.createElement("canvas"); c.width = 180; c.height = 120; paintPortrait(c.getContext("2d"), 180, 120, sp); d.appendChild(c); d.appendChild(document.createTextNode(own ? sp.name : "?")); d.onclick = () => { if (own) say(sp.name + "! " + sp.fact); else { say("Bunu henüz bulmadın. Okyanusta ara!"); } }; box.appendChild(d); });
    $("modal").hidden = false; $("mClose").onclick = closeModal; say(n ? "Albümünde " + n + " keşif var!" : "Albümün henüz boş. Hadi keşfe çık!");
  }
  const GARAGE = [
    { id: "lamp", name: "Güçlü fener", cost: 12, desc: "Karanlık derinliğe inebilirsin." },
    { id: "turbo", name: "Turbo motor", cost: 8, desc: "Denizaltı daha hızlı gider." },
    { id: "c1", name: "Kırmızı boya", cost: 3 }, { id: "c2", name: "Yeşil boya", cost: 3 }, { id: "c3", name: "Mor boya", cost: 4 }, { id: "c4", name: "Pembe boya", cost: 4 }
  ];
  function openGarage() {
    if (state !== "play") return; modalOpen = true; const sh = $("sheet");
    sh.innerHTML = "<h2>Garaj 🔧</h2><p>İncilerin: <b>" + S.pearls + "</b></p><div class='shop' id='shop'></div><button class='btn ghost' type='button' id='mClose'>✕ Kapat</button>";
    const box = $("shop");
    GARAGE.forEach((g) => {
      const isColor = g.id[0] === "c", ci = isColor ? +g.id.slice(1) : 0, own = isColor ? S.owned.includes(ci) : !!S[g.id];
      const b = document.createElement("button"); b.type = "button"; b.className = "item" + (own ? " own" : S.pearls < g.cost ? " no" : "");
      const c = document.createElement("canvas"); c.width = 200; c.height = 136; const x = c.getContext("2d"); x.save(); x.translate(100, 76); x.scale(1.25, 1.25); drawSub(x, 0, 0, 1, 0, isColor ? ci : S.color, g.id === "lamp"); if (g.id === "turbo") { for (let k = 0; k < 4; k++) circle(x, -70 - k * 12, (k % 2) * 6, 5 - k, "rgba(255,255,255,.8)"); } x.restore(); b.appendChild(c);
      b.appendChild(document.createTextNode(g.name)); const pr = document.createElement("span"); pr.className = "pr"; pr.textContent = own ? (isColor ? (S.color === ci ? "✔ Seçili" : "Seç") : "✔ Var") : "⚪ " + g.cost + " inci"; b.appendChild(pr);
      b.onclick = () => {
        if (own) { if (isColor) { S.color = ci; save(); sfx.buy(); openGarage(); } else say(g.name + " zaten var!"); return; }
        if (S.pearls < g.cost) { sfx.no(); say(g.name + " için " + g.cost + " inci lazım. İstiridyelere dokunarak inci topla!"); return; }
        S.pearls -= g.cost; if (isColor) { S.owned.push(ci); S.color = ci; } else S[g.id] = 1; save(); sfx.buy(); say(g.name + " aldın! " + (g.desc || "")); openGarage();
      };
      box.appendChild(b);
    });
    // ilk renk her zaman var
    if (!S.owned.includes(0)) S.owned.push(0);
    $("modal").hidden = false; $("mClose").onclick = closeModal;
  }
  function closeModal() { $("modal").hidden = true; modalOpen = false; }
  $("albumBtn").onclick = () => { audio(); openAlbum(); };
  $("garageBtn").onclick = () => { audio(); openGarage(); };
  $("modal").addEventListener("pointerdown", (e) => { if (e.target === $("modal") && state === "play") closeModal(); });

  /* ---------- başlık ---------- */
  function drawLogo() { const c = $("logoCv"), x = c.getContext("2d"); x.clearRect(0, 0, 360, 180); x.save(); x.translate(160, 100); x.scale(1.5, 1.5); drawSub(x, 0, 0, 1, 0, S.color, false); x.restore(); x.save(); x.translate(300, 60); drawCreature(x, SP.palyaco, 0); x.restore(); x.save(); x.translate(52, 140); x.scale(-1.2, 1.2); drawCreature(x, SP.kaplumbaga, 1); x.restore(); for (let k = 0; k < 6; k++) { x.strokeStyle = "rgba(255,255,255,.8)"; x.lineWidth = 2; x.beginPath(); x.arc(70 + k * 10, 90 - k * 14, 3 + k % 3, 0, Math.PI * 2); x.stroke(); } }
  $("play").onclick = () => { audio(); $("title").hidden = true; state = "play"; mOn = true; spawnAll(); sub.x = 300; sub.y = 300; cam.x = 0; cam.y = 0; idleT = 0; if (S.tut >= 3) say("Tekrar hoş geldin kaşif! Albümünde " + Object.keys(S.found).length + " keşif var."); };
  $("reset").onclick = () => { if (confirm("Albüm ve inciler silinsin mi?")) { try { localStorage.removeItem(SAVE); } catch (e) {} location.reload(); } };
  $("speak").onclick = () => { audio(); if (lastSay) say(lastSay); };
  const muteBtn = $("mute");
  function setMute(m) { muted = m; muteBtn.setAttribute("aria-pressed", m ? "true" : "false"); muteBtn.setAttribute("aria-label", m ? "Sesi aç" : "Sesi kapat"); if (master) master.gain.value = m ? 0 : 1; if (m && canSpeak) speechSynthesis.cancel(); try { localStorage.setItem(SAVE + ":mute", m ? "1" : "0"); } catch (e) {} }
  setMute(muted); muteBtn.onclick = () => { audio(); setMute(!muted); };

  /* ---------- ölçek ve döngü ---------- */
  const stage = $("stage"), screen = $("screen");
  function fit() { const w = screen.clientWidth, h = screen.clientHeight; if (!w || !h) return; let sw = w, sh = w * H / W; if (sh > h) { sh = h; sw = h * W / H; } stage.style.width = Math.floor(sw) + "px"; stage.style.height = Math.floor(sh) + "px"; stage.style.setProperty("--fs", clamp(sw / 46, 12, 21).toFixed(1) + "px"); }
  addEventListener("resize", fit); if (window.ResizeObserver) new ResizeObserver(fit).observe(screen); fit();
  let last = performance.now();
  function frame(t) { const dt = Math.min(.05, (t - last) / 1000); last = t; update(dt); draw(); requestAnimationFrame(frame); }
  requestAnimationFrame(frame);
  drawLogo(); $("reset").hidden = !Object.keys(S.found).length;

  window.__dm = { get S() { return S; }, sub, get crit() { return crit; }, update, tapAt, openAlbum, openGarage, closeModal, get state() { return state; }, set state(v) { state = v; }, SPECIES, floorY, cam };
})();
