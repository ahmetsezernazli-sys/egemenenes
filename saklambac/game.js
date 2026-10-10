(() => {
  "use strict";
  const $ = id => document.getElementById(id);

  /* ---------- ölçüler ---------- */
  const W = 480, H = 720;
  const SAVE_KEY = "saklambac";
  const ANIMALS = [
    {e:"🐱", nm:"kedi"}, {e:"🐶", nm:"köpek"}, {e:"🐰", nm:"tavşan"}, {e:"🐻", nm:"ayı"}, {e:"🐼", nm:"panda"},
    {e:"🦊", nm:"tilki"}, {e:"🐸", nm:"kurbağa"}, {e:"🐵", nm:"maymun"}, {e:"🐧", nm:"penguen"}
  ];
  const NUM = ["", "bir", "iki", "üç", "dört"];
  const cap = s => s.charAt(0).toLocaleUpperCase("tr") + s.slice(1);
  // "yatağın altında" -> "yatağın altındaymış" (son ünlüye göre -ymış / -ymiş)
  const mis = s => { const v = s.match(/[aeıioöuü]/g).pop(); return s + ("aıou".includes(v) ? "ymış" : "ymiş"); };

  /* ---------- sahneler ---------- */
  // hit: dokunma alanı, peek: ipucunda kulakların göründüğü yer, home: bulununca hayvanın durduğu yer
  const SCENES = [
    {id: "oda", spots: [
      {loc: "perdenin arkasında", hit: [270, 80, 70, 260], peek: [322, 215], home: [300, 300], draw: drawCurtain},
      {loc: "dolabın içinde", hit: [348, 145, 120, 360], peek: [407, 146], home: [407, 540], draw: drawWardrobe},
      {loc: "yatağın altında", hit: [12, 335, 210, 210], peek: [115, 530], home: [115, 392], draw: drawBed},
      {loc: "saksının arkasında", hit: [228, 355, 90, 160], peek: [306, 420], home: [270, 338], draw: drawPlant},
      {loc: "masanın altında", hit: [160, 560, 172, 105], peek: [245, 658], home: [245, 546], draw: drawTable},
      {loc: "kutunun içinde", hit: [22, 585, 118, 100], peek: [80, 592], home: [80, 560], draw: drawToyBox},
      {loc: "sepetin içinde", hit: [376, 595, 94, 90], peek: [422, 602], home: [422, 570], draw: drawBasket}
    ]},
    {id: "bahce", spots: [
      {loc: "ağacın arkasında", hit: [10, 120, 170, 360], peek: [120, 440], home: [150, 478], draw: drawTree},
      {loc: "kulübenin içinde", hit: [262, 270, 146, 205], peek: [335, 458], home: [335, 252], draw: drawDogHouse},
      {loc: "çalının arkasında", hit: [370, 508, 110, 100], peek: [420, 522], home: [420, 492], draw: drawBush},
      {loc: "çitin arkasında", hit: [14, 510, 162, 96], peek: [95, 520], home: [95, 492], draw: drawFence},
      {loc: "kovanın içinde", hit: [192, 600, 68, 78], peek: [226, 612], home: [226, 584], draw: drawBucket},
      {loc: "çiçeklerin arasında", hit: [272, 600, 96, 80], peek: [320, 630], home: [320, 584], draw: drawFlowers}
    ]}
  ];

  let save = {found: 0, rounds: 0};
  try { save = Object.assign(save, JSON.parse(localStorage.getItem(SAVE_KEY)) || {}); } catch (e) {}
  const store = () => { try { localStorage.setItem(SAVE_KEY, JSON.stringify(save)); } catch (e) {} };

  /* ---------- ses ---------- */
  let soundOn = true, ac = null;
  function audio(){
    if (!ac){ try { ac = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { ac = null; } }
    if (ac && ac.state === "suspended") ac.resume();
    return ac;
  }
  function tone(f1, f2, type, dur, vol, delay){
    if (!soundOn) return;
    const a = audio(); if (!a) return;
    const t = a.currentTime + (delay || 0), o = a.createOscillator(), g = a.createGain();
    o.type = type; o.frequency.setValueAtTime(f1, t); o.frequency.exponentialRampToValueAtTime(Math.max(20, f2), t + dur * .9);
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + .02); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(a.destination); o.start(t); o.stop(t + dur + .05);
  }
  const sHop = () => tone(400, 800, "sine", .14, .12);
  const sBoing = () => tone(260, 180, "triangle", .25, .14);
  const sFound = () => [523, 784, 1047].forEach((f, k) => tone(f, f, "triangle", .2, .16, k * .08));
  const sAll = () => [523, 659, 784, 1047, 1319].forEach((f, k) => tone(f, f, "triangle", .25, .16, k * .1));

  const canSpeak = "speechSynthesis" in window;
  let trVoice = null;
  function pickVoice(){ trVoice = speechSynthesis.getVoices().find(v => /^tr(-|_|$)/i.test(v.lang)) || null; }
  if (canSpeak){ pickVoice(); if (speechSynthesis.addEventListener) speechSynthesis.addEventListener("voiceschanged", pickVoice); }
  function say(text){
    if (!canSpeak || !soundOn || !trVoice) return;
    speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text); u.voice = trVoice; u.lang = trVoice.lang; u.rate = .95; u.pitch = 1.15;
    speechSynthesis.speak(u);
  }
  function renderSound(){
    $("ic-on").hidden = !soundOn; $("ic-off").hidden = soundOn;
    $("sound").setAttribute("aria-label", soundOn ? "Sesi kapat" : "Sesi aç");
    $("sound").setAttribute("aria-pressed", String(soundOn));
  }
  $("sound").addEventListener("click", () => { soundOn = !soundOn; if (!soundOn && canSpeak) speechSynthesis.cancel(); renderSound(); });
  renderSound();
  function renderCount(bump){
    $("found-n").textContent = save.found;
    $("found-btn").setAttribute("aria-label", `${save.found} arkadaş buldun`);
    if (bump){ const b = $("found-btn"); b.classList.remove("bump"); void b.offsetWidth; b.classList.add("bump"); }
  }
  $("found-btn").addEventListener("click", () => { audio(); say(save.found ? `Şimdiye kadar ${save.found} arkadaş buldun!` : "Hadi saklananları bulalım!"); });

  /* ---------- durum ---------- */
  let G = null, timers = [];
  const later = (sec, fn) => timers.push({t: sec, fn});
  const shuffle = a => { for (let i = a.length - 1; i > 0; i--){ const j = Math.random() * (i + 1) | 0; [a[i], a[j]] = [a[j], a[i]]; } return a; };

  function newRound(){
    timers = [];
    const scene = SCENES[save.rounds % SCENES.length];
    const n = save.rounds < 2 ? 3 : 4;
    const spots = scene.spots.map(s => ({...s, wig: 0, found: false}));
    const pick = shuffle(spots.map((s, i) => i)).slice(0, n);
    const animals = shuffle(ANIMALS.slice()).slice(0, n).map((a, k) => ({
      ...a, spot: pick[k], state: "wait", x: W / 2 - (n - 1) * 45 + k * 90, y: 400, t: 0, peek: 0, hinted: false
    }));
    animals.forEach(a => { a.sx = a.x; a.sy = a.y; });
    G = {scene, spots, animals, phase: "intro", t: 0, idle: 0, hintT: 0, confetti: []};
    $("next").hidden = true;
    say(`Saklambaç! ${cap(NUM[n])} arkadaş saklanıyor. İyi bak!`);
    // sırayla saklanırlar
    animals.forEach((a, k) => later(1.6 + k * .95, () => { a.state = "run"; a.t = 0; sHop(); }));
    later(1.6 + n * .95 + .5, () => { G.phase = "seek"; G.idle = 0; say("Önüm arkam sağım solum sobe! Hadi bul bakalım!"); });
  }

  /* ---------- dokunma ---------- */
  const cv = $("cv"), stage = $("stage"), ctx = cv.getContext("2d");
  let view = {s: 1, ox: 0, oy: 0, dpr: 1};
  const toLogical = e => {
    const r = cv.getBoundingClientRect();
    return {x: (e.clientX - r.left - view.ox) / view.s, y: (e.clientY - r.top - view.oy) / view.s};
  };
  const inRect = (x, y, r) => x >= r[0] && x <= r[0] + r[2] && y >= r[1] && y <= r[1] + r[3];

  function press(x, y){
    if (!G) return;
    audio();
    // bulunmuş bir hayvana dokunmak: adını söyler
    for (const a of G.animals) if (a.state === "found" && Math.hypot(x - a.x, y - a.y) < 30){ a.t = 0; sHop(); say(cap(a.nm) + "!"); return; }
    if (G.phase !== "seek") return;
    G.idle = 0;
    // en üstte çizilen eşya önce
    for (let i = G.spots.length - 1; i >= 0; i--){
      const s = G.spots[i];
      if (!inRect(x, y, s.hit)) continue;
      const a = G.animals.find(q => q.spot === i && q.state === "hidden");
      s.wig = .6;
      if (a){ foundIt(a, s); return; }
      sBoing();
      say(`${cap(s.loc)} kimse yok!`);
      return;
    }
  }
  cv.addEventListener("pointerdown", e => { e.preventDefault(); const p = toLogical(e); press(p.x, p.y); });
  $("next").addEventListener("click", () => { audio(); newRound(); });

  function foundIt(a, s){
    a.state = "found"; a.t = 0; a.x = s.home[0]; a.y = s.home[1]; a.peek = 0;
    s.found = true;
    save.found++; store(); renderCount(true);
    sFound();
    const left = G.animals.filter(q => q.state === "hidden").length;
    if (!left){
      G.phase = "done"; save.rounds++; store();
      say(`Buldun! ${cap(a.nm)} ${mis(s.loc)}! Hepsini buldun, sobe!`);
      later(.6, () => { sAll(); confetti(); });
      later(2.2, () => { $("next").hidden = false; });
    } else say(`Buldun! ${cap(a.nm)} ${mis(s.loc)}!`);
  }
  function confetti(){
    const cols = ["#E5484D", "#F5C542", "#2EB872", "#3D8BFD", "#FF7A2F", "#9B5DE5"];
    for (let k = 0; k < 70; k++) G.confetti.push({x: 40 + Math.random() * 400, y: -10 - Math.random() * 120, vx: (Math.random() - .5) * 80, vy: 60 + Math.random() * 90, r: Math.random() * 6, vr: (Math.random() - .5) * 8, c: cols[k % 6], life: 4});
  }

  /* ---------- güncelle ---------- */
  function update(dt){
    for (const tm of timers) tm.t -= dt;
    const due = timers.filter(tm => tm.t <= 0); timers = timers.filter(tm => tm.t > 0); due.forEach(tm => tm.fn());
    if (!G) return;
    G.t += dt;
    for (const s of G.spots) if (s.wig > 0) s.wig = Math.max(0, s.wig - dt);
    for (const a of G.animals){
      a.t += dt;
      if (a.state === "run"){
        const s = G.spots[a.spot], k = Math.min(1, a.t / .8);
        a.x = a.sx + (s.peek[0] - a.sx) * k;
        a.y = a.sy + (s.peek[1] - a.sy) * k - Math.sin(k * Math.PI) * 90;
        if (k >= 1){ a.state = "hidden"; G.spots[a.spot].wig = .4; }
      }
      if (a.state === "hidden") a.peek = Math.max(0, a.peek - dt * 2);
    }
    for (const c of G.confetti){ c.life -= dt; c.x += c.vx * dt; c.y += c.vy * dt; c.r += c.vr * dt; }
    G.confetti = G.confetti.filter(c => c.life > 0 && c.y < H + 20);
    // ipucu: uzun süre bulunamazsa bir hayvanın kulakları görünür
    if (G.phase === "seek"){
      G.idle += dt;
      if (G.idle > 7){
        const hid = G.animals.filter(a => a.state === "hidden");
        if (hid.length){
          const a = hid[Math.floor(G.t / 6) % hid.length];
          a.peek = 1;
          if (!a.hinted){ a.hinted = true; say("Bak! Orada bir şey kıpırdadı!"); }
        }
      }
    }
  }

  /* ---------- çizim yardımcıları ---------- */
  function resize(){
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const cw = stage.clientWidth, ch = stage.clientHeight;
    cv.width = Math.round(cw * dpr); cv.height = Math.round(ch * dpr);
    const s = Math.min(cw / W, ch / H);
    view = {s, ox: (cw - W * s) / 2, oy: (ch - H * s) / 2, dpr};
  }
  function rr(x, y, w, h, r, fill){ ctx.fillStyle = fill; ctx.beginPath(); ctx.roundRect(x, y, w, h, r); ctx.fill(); }
  const wig = s => Math.sin(G.t * 40) * s.wig * 5;

  // oda
  function drawCurtain(s){
    rr(150, 100, 140, 140, 6, "#BFE6FF"); ctx.strokeStyle = "#fff"; ctx.lineWidth = 8; ctx.strokeRect(150, 100, 140, 140);
    ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(220, 100); ctx.lineTo(220, 240); ctx.moveTo(150, 170); ctx.lineTo(290, 170); ctx.stroke();
    ctx.fillStyle = "#FFE082"; ctx.beginPath(); ctx.arc(185, 135, 14, 0, Math.PI * 2); ctx.fill();
    rr(130, 84, 220, 10, 4, "#8D6E63");
    rr(136, 92, 30, 230, 10, "#E5484D");
    const w = wig(s);
    ctx.fillStyle = "#E5484D"; ctx.beginPath(); ctx.moveTo(276, 92); ctx.lineTo(334, 92);
    ctx.quadraticCurveTo(342 + w, 210, 336 + w, 330); ctx.lineTo(272 + w, 330); ctx.quadraticCurveTo(282 + w, 210, 276, 92); ctx.fill();
    ctx.strokeStyle = "#B8333A"; ctx.lineWidth = 3;
    for (const x of [292, 308, 322]){ ctx.beginPath(); ctx.moveTo(x, 96); ctx.quadraticCurveTo(x + 6 + w, 210, x + 2 + w, 326); ctx.stroke(); }
  }
  function drawWardrobe(s){
    const w = wig(s);
    rr(350 + w, 150, 116, 350, 8, "#A0683E");
    rr(356 + w, 158, 50, 334, 5, "#B97A4A"); rr(410 + w, 158, 50, 334, 5, s.found ? "#5C3B22" : "#B97A4A");
    if (s.found){ ctx.fillStyle = "#B97A4A"; ctx.beginPath(); ctx.moveTo(460 + w, 158); ctx.lineTo(478 + w, 150); ctx.lineTo(478 + w, 500); ctx.lineTo(460 + w, 492); ctx.fill(); }
    ctx.fillStyle = "#FFD54F"; ctx.beginPath(); ctx.arc(399 + w, 320, 5, 0, Math.PI * 2); ctx.arc(417 + w, 320, 5, 0, Math.PI * 2); ctx.fill();
  }
  function drawBed(s){
    const w = wig(s);
    rr(14 + w, 340, 24, 200, 6, "#8D6E63");
    ctx.fillStyle = "#4E342E"; ctx.fillRect(38 + w, 488, 176, 52);                 // yatak altı karanlık
    rr(38 + w, 420, 182, 70, 10, "#FFFFFF");
    rr(38 + w, 440, 182, 52, 10, "#64B5F6");
    rr(46 + w, 410, 54, 28, 10, "#FFF8E1");
    rr(36 + w, 488, 186, 12, 4, "#8D6E63");
    rr(40 + w, 498, 10, 42, 3, "#8D6E63"); rr(208 + w, 498, 10, 42, 3, "#8D6E63");
  }
  function drawPlant(s){
    const w = wig(s);
    ctx.fillStyle = "#2E9E5B";
    for (const [dx, dy, r] of [[-22, 410, 26], [22, 405, 28], [0, 380, 30], [-10, 430, 24], [16, 432, 24]]){ ctx.beginPath(); ctx.arc(270 + dx + w, dy, r, 0, Math.PI * 2); ctx.fill(); }
    ctx.fillStyle = "#D2693C"; ctx.beginPath(); ctx.moveTo(238 + w, 450); ctx.lineTo(302 + w, 450); ctx.lineTo(294 + w, 512); ctx.lineTo(246 + w, 512); ctx.closePath(); ctx.fill();
    rr(234 + w, 446, 72, 12, 4, "#B85A30");
  }
  function drawTable(s){
    const w = wig(s);
    rr(160 + w, 566, 172, 14, 5, "#8D6E63");
    ctx.fillStyle = "#F8BBD0"; ctx.beginPath(); ctx.moveTo(162 + w, 572); ctx.lineTo(330 + w, 572); ctx.lineTo(336 + w, 664); ctx.lineTo(156 + w, 664); ctx.closePath(); ctx.fill();
    ctx.fillStyle = "#fff"; for (let k = 0; k < 8; k++){ ctx.beginPath(); ctx.arc(172 + k * 22 + w, 664, 6, 0, Math.PI); ctx.fill(); }
    ctx.font = "30px sans-serif"; ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.fillText("🍎", 290 + w, 552);
  }
  function drawToyBox(s){
    const w = wig(s), lift = s.found ? -18 : 0;
    rr(24 + w, 610, 114, 72, 8, "#3D8BFD");
    ctx.fillStyle = "#FFD54F"; ctx.font = "800 26px 'Baloo 2', sans-serif"; ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.fillText("ABC", 81 + w, 648);
    ctx.save(); ctx.translate(20 + w, 600 + lift); if (s.found) ctx.rotate(-.25);
    rr(0, 0, 122, 16, 6, "#1F5FC2"); ctx.restore();
  }
  function drawBasket(s){
    const w = wig(s);
    ctx.fillStyle = "#C98B55"; ctx.beginPath(); ctx.moveTo(378 + w, 610); ctx.lineTo(468 + w, 610); ctx.lineTo(458 + w, 682); ctx.lineTo(388 + w, 682); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = "#9C6B3E"; ctx.lineWidth = 3;
    for (let k = 0; k < 4; k++){ ctx.beginPath(); ctx.moveTo(380 + w, 624 + k * 15); ctx.lineTo(466 + w, 624 + k * 15); ctx.stroke(); }
    ctx.lineWidth = 5; ctx.beginPath(); ctx.arc(423 + w, 610, 34, Math.PI, 0); ctx.stroke();
  }
  // bahçe
  function drawTree(s){
    const w = wig(s);
    rr(72, 260, 40, 220, 8, "#8D6E63");
    ctx.fillStyle = "#2E9E5B";
    for (const [dx, dy, r] of [[0, 190, 80], [-50, 230, 55], [50, 228, 58], [0, 250, 60]]){ ctx.beginPath(); ctx.arc(92 + dx + w * 1.5, dy, r, 0, Math.PI * 2); ctx.fill(); }
    ctx.fillStyle = "#E5484D"; for (const [x, y] of [[60, 180], [120, 210], [92, 150], [140, 250], [40, 245]]){ ctx.beginPath(); ctx.arc(x + w * 1.5, y, 7, 0, Math.PI * 2); ctx.fill(); }
  }
  function drawDogHouse(s){
    const w = wig(s);
    rr(270 + w, 340, 130, 132, 4, "#E07A2F");
    ctx.fillStyle = "#B8442E"; ctx.beginPath(); ctx.moveTo(258 + w, 344); ctx.lineTo(335 + w, 278); ctx.lineTo(412 + w, 344); ctx.closePath(); ctx.fill();
    ctx.fillStyle = "#3E2723"; ctx.beginPath(); ctx.moveTo(305 + w, 472); ctx.lineTo(305 + w, 420); ctx.arc(335 + w, 420, 30, Math.PI, 0); ctx.lineTo(365 + w, 472); ctx.closePath(); ctx.fill();
    ctx.fillStyle = "#FFE082"; ctx.font = "800 18px 'Baloo 2', sans-serif"; ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.fillText("HAV", 335 + w, 372);
  }
  function drawBush(s){
    const w = wig(s);
    ctx.fillStyle = "#3FBF73";
    for (const [dx, dy, r] of [[-38, 568, 34], [0, 552, 42], [38, 566, 36], [-14, 584, 34], [22, 586, 32]]){ ctx.beginPath(); ctx.arc(420 + dx + w, dy, r, 0, Math.PI * 2); ctx.fill(); }
    ctx.fillStyle = "#FF8FB1"; for (const [x, y] of [[396, 548], [440, 538], [420, 580], [452, 574]]){ ctx.beginPath(); ctx.arc(x + w, y, 5, 0, Math.PI * 2); ctx.fill(); }
  }
  function drawFence(s){
    const w = wig(s);
    ctx.fillStyle = "#FFFFFF";
    rr(14, 540, 162, 12, 3, "#F1E7D8"); rr(14, 574, 162, 12, 3, "#F1E7D8");
    for (let k = 0; k < 6; k++){
      const x = 20 + k * 27 + (k % 2 ? w : -w);
      ctx.fillStyle = "#FFFFFF"; ctx.beginPath(); ctx.moveTo(x, 604); ctx.lineTo(x, 528); ctx.lineTo(x + 11, 516); ctx.lineTo(x + 22, 528); ctx.lineTo(x + 22, 604); ctx.closePath(); ctx.fill();
    }
  }
  function drawBucket(s){
    const w = wig(s);
    ctx.fillStyle = "#3D8BFD"; ctx.beginPath(); ctx.moveTo(194 + w, 612); ctx.lineTo(258 + w, 612); ctx.lineTo(250 + w, 676); ctx.lineTo(202 + w, 676); ctx.closePath(); ctx.fill();
    rr(190 + w, 606, 72, 10, 4, "#1F5FC2");
    ctx.strokeStyle = "#90A4AE"; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(226 + w, 612, 30, Math.PI, 0); ctx.stroke();
  }
  function drawFlowers(s){
    const w = wig(s);
    rr(272, 650, 96, 28, 6, "#8D6E63");
    const cols = ["#E5484D", "#F5C542", "#9B5DE5", "#FF8FB1", "#3D8BFD"];
    for (let k = 0; k < 5; k++){
      const x = 284 + k * 18 + (k % 2 ? w : -w), y = 604 + (k % 2) * 12;
      ctx.strokeStyle = "#2E9E5B"; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x, 652); ctx.stroke();
      ctx.fillStyle = cols[k]; for (let p = 0; p < 5; p++){ const a = p / 5 * Math.PI * 2; ctx.beginPath(); ctx.arc(x + Math.cos(a) * 7, y + Math.sin(a) * 7, 5.5, 0, Math.PI * 2); ctx.fill(); }
      ctx.fillStyle = "#FFE082"; ctx.beginPath(); ctx.arc(x, y, 4, 0, Math.PI * 2); ctx.fill();
    }
  }

  function drawBackground(){
    if (G.scene.id === "oda"){
      ctx.fillStyle = "#FCE9C8"; ctx.fillRect(-400, -300, W + 800, 772 + 300);
      ctx.fillStyle = "rgba(224,122,47,.12)";
      for (let y = 20; y < 470; y += 40) for (let x = (y / 40 % 2) * 20; x < W; x += 40){ ctx.beginPath(); ctx.arc(x, y, 4, 0, Math.PI * 2); ctx.fill(); }
      ctx.fillStyle = "#D9A066"; ctx.fillRect(-400, 470, W + 800, H - 470 + 300);
      ctx.strokeStyle = "rgba(120,70,30,.25)"; ctx.lineWidth = 2;
      for (let y = 500; y < H + 40; y += 34){ ctx.beginPath(); ctx.moveTo(-400, y); ctx.lineTo(W + 400, y); ctx.stroke(); }
      rr(-400, 462, W + 800, 10, 0, "#B97A4A");
    } else {
      const sky = ctx.createLinearGradient(0, -300, 0, 380); sky.addColorStop(0, "#7CC6F2"); sky.addColorStop(1, "#D9F0FB");
      ctx.fillStyle = sky; ctx.fillRect(-400, -300, W + 800, 680);
      ctx.fillStyle = "#FFE082"; ctx.beginPath(); ctx.arc(420, 70, 36, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = "#FFFFFF"; for (const [x, y] of [[250, 90], [280, 80], [305, 92]]){ ctx.beginPath(); ctx.arc(x, y, 22, 0, Math.PI * 2); ctx.fill(); }
      ctx.fillStyle = "#7CCB5A"; ctx.fillRect(-400, 370, W + 800, H - 370 + 300);
      ctx.fillStyle = "#6AB84B"; for (let k = 0; k < 40; k++){ const x = (k * 53) % W, y = 400 + (k * 37) % 300; ctx.fillRect(x, y, 3, 8); }
    }
  }

  function draw(){
    const {s, ox, oy, dpr} = view;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.fillStyle = "#FCE9C8"; ctx.fillRect(0, 0, cv.width, cv.height);
    ctx.setTransform(dpr * s, 0, 0, dpr * s, dpr * ox, dpr * oy);
    if (!G) return;
    drawBackground();
    G.spots.forEach(sp => sp.draw(sp));
    ctx.textAlign = "center"; ctx.textBaseline = "middle";
    // ipucu: kulakların ucu görünür
    for (const a of G.animals){
      if (a.state !== "hidden" || a.peek <= 0) continue;
      const sp = G.spots[a.spot], [px, py] = sp.peek, k = Math.min(1, a.peek);
      ctx.save(); ctx.beginPath(); ctx.rect(px - 30, py - 44, 60, 26 * k); ctx.clip();
      ctx.font = "44px sans-serif"; ctx.fillText(a.e, px + Math.sin(G.t * 10) * 3, py - 12 + (1 - k) * 20);
      ctx.restore();
    }
    // koşan ve bulunan hayvanlar
    for (const a of G.animals){
      if (a.state === "wait" || a.state === "run"){
        const fade = a.state === "run" ? Math.max(0, 1 - Math.max(0, a.t / .8 - .75) * 4) : 1;
        ctx.globalAlpha = fade; ctx.font = "50px sans-serif";
        ctx.fillText(a.e, a.x, a.y + (a.state === "wait" ? Math.sin(G.t * 6 + a.sx) * 4 : 0));
        ctx.globalAlpha = 1;
      } else if (a.state === "found"){
        const pop = Math.min(1, a.t / .35), bounce = a.t < .6 ? Math.sin(a.t / .6 * Math.PI) * 26 : Math.abs(Math.sin(G.t * 3)) * 4;
        ctx.save(); ctx.translate(a.x, a.y - bounce); ctx.scale(.4 + .6 * pop, .4 + .6 * pop);
        ctx.font = "50px sans-serif"; ctx.fillText(a.e, 0, 0); ctx.restore();
        if (a.t < 1.2){ ctx.font = "22px sans-serif"; ctx.globalAlpha = 1 - a.t / 1.2; ctx.fillText("⭐", a.x + 30, a.y - 34 - a.t * 20); ctx.fillText("⭐", a.x - 30, a.y - 30 - a.t * 24); ctx.globalAlpha = 1; }
      }
    }
    // üstte: bulunanlar ve bulunacaklar
    const n = G.animals.length;
    rr(W / 2 - n * 30 - 12, 12, n * 60 + 24, 52, 26, "rgba(255,255,255,.88)");
    G.animals.forEach((a, k) => {
      const x = W / 2 - (n - 1) * 30 + k * 60;
      if (a.state === "found"){ ctx.font = "34px sans-serif"; ctx.fillText(a.e, x, 39); }
      else { ctx.fillStyle = "rgba(39,64,90,.25)"; ctx.font = "800 30px 'Baloo 2', sans-serif"; ctx.fillText("?", x, 40); }
    });
    if (G.phase === "intro" && G.t < 1.6){
      ctx.font = "800 34px 'Baloo 2', sans-serif"; ctx.fillStyle = "#27405A"; ctx.fillText("İyi bak! 👀", W / 2, 330);
    }
    for (const c of G.confetti){ ctx.save(); ctx.translate(c.x, c.y); ctx.rotate(c.r); ctx.fillStyle = c.c; ctx.fillRect(-5, -3, 10, 6); ctx.restore(); }
  }

  let last = performance.now();
  function frame(now){
    const dt = Math.min(.05, (now - last) / 1000); last = now;
    update(dt); draw();
    requestAnimationFrame(frame);
  }
  document.addEventListener("visibilitychange", () => { last = performance.now(); if (document.hidden && canSpeak) speechSynthesis.cancel(); });
  if ("ResizeObserver" in window) new ResizeObserver(resize).observe(stage); else window.addEventListener("resize", resize);
  resize(); renderCount(false); newRound();
  requestAnimationFrame(frame);

  // testler için
  window.__saklambac = {state: () => G, update, press, newRound, SCENES, mis};
})();
