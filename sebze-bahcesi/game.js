(() => {
  "use strict";
  const $ = id => document.getElementById(id);

  /* ---------- ölçüler ---------- */
  const W = 480, H = 720;
  const SOIL_Y = 430;                      // toprağın üst çizgisi
  const SPOTS = [120, 240, 360];           // üç ekim yeri (x)
  const HOLE_Y = SOIL_Y + 90;
  const VEG = [
    {id:"havuc",   nm:"havuç",    one:"bir havuç",     c:"#F97316", c2:"#C2410C"},
    {id:"domates", nm:"domates",  one:"bir domates",   c:"#EF4444", c2:"#B91C1C"},
    {id:"cilek",   nm:"çilek",    one:"bir çilek",     c:"#F43F5E", c2:"#BE123C"},
    {id:"ayci",    nm:"ayçiçeği", one:"bir ayçiçeği",  c:"#FACC15", c2:"#A16207"},
    {id:"patates", nm:"patates",  one:"bir patates",   c:"#C9A227", c2:"#8A6D12"},
    {id:"salatalik", nm:"salatalık", one:"bir salatalık", c:"#4ADE80", c2:"#15803D"}
  ];
  const SAVE_KEY = "sebze-bahcesi";
  const SAY_N = ["", "bir", "iki", "üç"];

  let save = {counts: {}};
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
  const sDig = () => tone(180, 90, "sawtooth", .2, .12);
  const sSeed = () => tone(500, 800, "sine", .14, .25);
  const sDrop = () => tone(900, 1400, "sine", .08, .12);
  const sGrow = () => [400, 560, 760].forEach((f, k) => tone(f, f * 1.2, "triangle", .22, .2, k * .12));
  const sPop = () => { tone(300, 1000, "sine", .16, .3); tone(1000, 1500, "sine", .1, .12, .08); };
  const sCheer = () => [523, 659, 784, 1047].forEach((f, k) => tone(f, f, "triangle", .28, .22, k * .13));

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

  /* ---------- durum ---------- */
  let G = null, timers = [];
  const later = (sec, fn) => timers.push({t: sec, fn});
  let lastVeg = -1;

  function newRound(){
    timers = [];
    let k; do { k = Math.random() * VEG.length | 0; } while (k === lastVeg && VEG.length > 1);
    lastVeg = k;
    G = {
      veg: VEG[k], stage: "dig",
      plots: SPOTS.map(x => ({x, dug: 0, seed: false, water: 0, grow: 0, picked: false, pop: 0})),
      sun: {y: -300, on: false}, can: null, drops: [], bits: [], picked: 0, hint: 0, t: 0
    };
    $("next").hidden = true;
    say("Üç çukur kaz! Toprağa dokun.");
  }

  /* ---------- dokunma ---------- */
  const cv = $("cv"), stage = $("stage"), ctx = cv.getContext("2d");
  let view = {s: 1, ox: 0, oy: 0, dpr: 1};
  const toLogical = e => {
    const r = cv.getBoundingClientRect();
    return {x: (e.clientX - r.left - view.ox) / view.s, y: (e.clientY - r.top - view.oy) / view.s};
  };
  const near = (p, x, y, r) => Math.hypot(p.x - x, HOLE_Y - y) < (r || 70);

  function down(e){
    if (!G) return;
    e.preventDefault(); audio();
    const {x, y} = toLogical(e);
    G.hint = 0;
    if (G.stage === "dig"){
      const p = G.plots.find(p => !p.dug && near(p, x, y));
      if (p){
        p.dug = 1; sDig();
        bits(p.x, HOLE_Y, "#6B4423", 12);
        const n = G.plots.filter(p => p.dug).length;
        say(SAY_N[n] + (n === 3 ? ". Şimdi tohumları ek!" : ""));
        if (n === 3) later(.1, () => { G.stage = "seed"; });
      }
      return;
    }
    if (G.stage === "seed"){
      const p = G.plots.find(p => p.dug && !p.seed && near(p, x, y));
      if (p){
        p.seed = true; sSeed();
        const n = G.plots.filter(p => p.seed).length;
        say(n === 3 ? "Üç tohum! Şimdi sula." : SAY_N[n] + " tohum");
        if (n === 3) later(.1, () => { G.stage = "water"; G.can = {x: 240, y: SOIL_Y - 120}; });
      }
      return;
    }
    if (G.stage === "water"){ G.can = {x, y: Math.min(y, SOIL_Y + 30)}; G.pouring = true; return; }
    if (G.stage === "sun"){
      if (Math.hypot(x - 390, y - 110) < 110){ grow(); }
      return;
    }
    if (G.stage === "pick"){
      const p = G.plots.find(p => !p.picked && Math.abs(p.x - x) < 70 && y < SOIL_Y + 120 && y > SOIL_Y - 190);
      if (p) pick(p);
    }
  }
  function move(e){
    if (!G || G.stage !== "water" || !G.pouring) return;
    const {x, y} = toLogical(e);
    G.can = {x, y: Math.min(y, SOIL_Y + 30)};
  }
  const up = () => { if (G) G.pouring = false; };
  cv.addEventListener("pointerdown", down);
  cv.addEventListener("pointermove", move);
  cv.addEventListener("pointerup", up);
  cv.addEventListener("pointercancel", up);

  function grow(){
    G.stage = "grow";
    G.sun.on = true;
    sGrow();
    say("Güneş geldi! Bak nasıl büyüyor.");
  }
  function pick(p){
    p.picked = true; p.pop = 1;
    G.picked++;
    sPop();
    bits(p.x, SOIL_Y - 40, G.veg.c, 14);
    const n = G.picked;
    say(n === 3 ? `Üç ${G.veg.nm}! Sepet doldu.` : SAY_N[n]);
    save.counts[G.veg.id] = (save.counts[G.veg.id] || 0) + 1;
    store(); renderCount(true);
    if (n === 3){
      G.stage = "done";
      sCheer();
      later(1.2, () => { say(`Aferin! ${SAY_N[3]} ${G.veg.nm} topladın.`); $("next").hidden = false; });
    }
  }
  function bits(x, y, c, n){
    for (let i = 0; i < n; i++){
      const a = Math.random() * Math.PI * 2, s = 60 + Math.random() * 170;
      G.bits.push({x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s - 120, life: .6 + Math.random() * .4, c});
    }
  }

  /* ---------- güncelleme ---------- */
  function update(dt){
    if (!G) return;
    G.t += dt;
    for (const tm of timers) tm.t -= dt;
    const due = timers.filter(tm => tm.t <= 0); timers = timers.filter(tm => tm.t > 0); due.forEach(tm => tm.fn());
    for (const b of G.bits){ b.x += b.vx * dt; b.y += b.vy * dt; b.vy += 700 * dt; b.life -= dt; }
    G.bits = G.bits.filter(b => b.life > 0);
    for (const d of G.drops){ d.y += d.vy * dt; d.vy += 900 * dt; }
    G.drops = G.drops.filter(d => d.y < HOLE_Y + 10);
    for (const p of G.plots) if (p.pop > 0) p.pop = Math.max(0, p.pop - dt * 1.6);
    G.hint += dt;

    if (G.stage === "water"){
      if (G.pouring && G.can){
        if (Math.random() < .55) G.drops.push({x: G.can.x + 26 + Math.random() * 10, y: G.can.y + 18, vy: 120});
        const p = G.plots.find(p => Math.abs(p.x - G.can.x) < 52 && p.water < 1);
        if (p){
          p.water = Math.min(1, p.water + dt * .75);
          if (p.water >= 1){ sDrop(); say(SAY_N[G.plots.filter(q => q.water >= 1).length] + " tamam"); }
        }
      }
      if (G.plots.every(p => p.water >= 1)){
        G.stage = "sun";
        later(.3, () => say("Şimdi güneşe dokun!"));
      }
      return;
    }
    if (G.stage === "sun"){
      G.sun.y += (110 - G.sun.y) * Math.min(1, dt * 1.2);
      return;
    }
    if (G.stage === "grow"){
      let all = true;
      for (const p of G.plots){
        p.grow = Math.min(1, p.grow + dt * .42);
        if (p.grow < 1) all = false;
      }
      if (all){ G.stage = "pick"; say(`Hazır! ${G.veg.nm} topla, hepsine dokun.`); }
      return;
    }
  }

  /* ---------- çizim ---------- */
  function resize(){
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const cw = stage.clientWidth, ch = stage.clientHeight;
    cv.width = Math.round(cw * dpr); cv.height = Math.round(ch * dpr);
    const s = Math.min(cw / W, ch / H);
    view = {s, ox: (cw - W * s) / 2, oy: (ch - H * s) / 2, dpr};
  }
  function leafPair(x, y, sc, col){
    ctx.fillStyle = col;
    for (const dir of [-1, 1]){
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.quadraticCurveTo(x + dir * 34 * sc, y - 26 * sc, x + dir * 10 * sc, y - 48 * sc);
      ctx.quadraticCurveTo(x + dir * 6 * sc, y - 20 * sc, x, y);
      ctx.fill();
    }
  }
  function plant(p, veg){
    const g = p.grow, x = p.x, base = SOIL_Y + 6;
    if (g <= 0) return;
    const sc = .3 + g * .7;
    ctx.strokeStyle = "#2E7D32"; ctx.lineWidth = 7 * sc; ctx.lineCap = "round";
    const topY = base - 120 * g;
    ctx.beginPath(); ctx.moveTo(x, base); ctx.lineTo(x, topY); ctx.stroke();
    leafPair(x, base - 55 * g, sc, "#3FA34D");
    if (g < .55) return;
    const f = (g - .55) / .45, pop = p.pop;
    const lift = p.picked ? 150 * (1 - pop) : 0;
    ctx.save();
    ctx.translate(x, topY - lift);
    ctx.scale(f, f);
    const id = veg.id;
    if (id === "havuc" || id === "patates" || id === "salatalik"){
      // kökten çıkan sebze: gövdeyi toprak hizasında göster
      ctx.restore();
      ctx.save();
      ctx.translate(x, base - (p.picked ? 110 * (1 - pop) : -10) + (p.picked ? 0 : 0));
      ctx.scale(f, f);
      if (!p.picked) ctx.globalAlpha = .35;
    }
    ctx.fillStyle = veg.c;
    if (id === "havuc"){ ctx.beginPath(); ctx.moveTo(-26, -40); ctx.lineTo(26, -40); ctx.lineTo(0, 54); ctx.closePath(); ctx.fill();
      ctx.strokeStyle = veg.c2; ctx.lineWidth = 3; for (let k = -24; k < 40; k += 18){ ctx.beginPath(); ctx.moveTo(-18 + k * .1, k); ctx.lineTo(18 - k * .1, k - 6); ctx.stroke(); } }
    else if (id === "patates"){ ctx.beginPath(); ctx.ellipse(0, 0, 36, 26, .3, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = veg.c2; for (const d of [[-12,-6],[8,4],[16,-10],[-4,10]]){ ctx.beginPath(); ctx.ellipse(d[0], d[1], 3.5, 2.5, 0, 0, Math.PI * 2); ctx.fill(); } }
    else if (id === "salatalik"){ ctx.beginPath(); ctx.ellipse(0, 0, 18, 44, .12, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = veg.c2; for (let k = -30; k < 30; k += 12){ ctx.beginPath(); ctx.ellipse(6, k, 2.6, 2.6, 0, 0, Math.PI * 2); ctx.fill(); } }
    else if (id === "domates"){ ctx.beginPath(); ctx.arc(0, 0, 36, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = "#2E7D32"; for (let a = 0; a < 5; a++){ ctx.save(); ctx.rotate(a * Math.PI * 2 / 5); ctx.beginPath(); ctx.ellipse(0, -32, 7, 14, 0, 0, Math.PI * 2); ctx.fill(); ctx.restore(); } }
    else if (id === "cilek"){ ctx.beginPath(); ctx.moveTo(0, 42); ctx.quadraticCurveTo(-40, 6, -26, -20); ctx.quadraticCurveTo(-12, -36, 0, -18); ctx.quadraticCurveTo(12, -36, 26, -20); ctx.quadraticCurveTo(40, 6, 0, 42); ctx.fill();
      ctx.fillStyle = "#FFE9A8"; for (const d of [[-12,0],[8,6],[0,20],[14,-8],[-6,-10]]){ ctx.beginPath(); ctx.ellipse(d[0], d[1], 2.6, 3.6, 0, 0, Math.PI * 2); ctx.fill(); }
      ctx.fillStyle = "#2E7D32"; for (let a = 0; a < 5; a++){ ctx.save(); ctx.rotate(a * Math.PI * 2 / 5 + .3); ctx.beginPath(); ctx.ellipse(0, -26, 7, 13, 0, 0, Math.PI * 2); ctx.fill(); ctx.restore(); } }
    else { // ayçiçeği
      ctx.fillStyle = veg.c;
      for (let a = 0; a < 12; a++){ ctx.save(); ctx.rotate(a * Math.PI / 6); ctx.beginPath(); ctx.ellipse(0, -34, 9, 19, 0, 0, Math.PI * 2); ctx.fill(); ctx.restore(); }
      ctx.fillStyle = "#7A4A12"; ctx.beginPath(); ctx.arc(0, 0, 22, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = "#5C370D"; for (const d of [[-8,-6],[6,-4],[0,6],[10,6],[-9,8]]){ ctx.beginPath(); ctx.arc(d[0], d[1], 2.6, 0, Math.PI * 2); ctx.fill(); }
    }
    ctx.restore();
  }
  function wateringCan(x, y){
    ctx.save(); ctx.translate(x, y);
    ctx.fillStyle = "#3B82F6";
    ctx.beginPath(); ctx.roundRect(-34, -22, 54, 44, 8); ctx.fill();
    ctx.beginPath(); ctx.moveTo(18, -14); ctx.lineTo(44, 10); ctx.lineTo(34, 22); ctx.lineTo(12, 6); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = "#1D4ED8"; ctx.lineWidth = 7; ctx.lineCap = "round";
    ctx.beginPath(); ctx.arc(-8, -24, 16, Math.PI, 0); ctx.stroke();
    ctx.restore();
  }
  function draw(){
    const {s, ox, oy, dpr} = view;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.fillStyle = "#8ED6F5"; ctx.fillRect(0, 0, cv.width, cv.height);
    ctx.setTransform(dpr * s, 0, 0, dpr * s, dpr * ox, dpr * oy);
    // gökyüzü
    const sky = ctx.createLinearGradient(0, 0, 0, SOIL_Y);
    sky.addColorStop(0, "#7FCDEF"); sky.addColorStop(1, "#C9ECFA");
    ctx.fillStyle = sky; ctx.fillRect(-200, -200, W + 400, SOIL_Y + 200);
    // bulutlar
    ctx.fillStyle = "rgba(255,255,255,.9)";
    for (const c of [[90, 90, 1], [330, 60, .75], [220, 170, .55]]){
      const t = G ? (G.t * 8 * c[2]) % (W + 260) - 130 : 0;
      const cx = (c[0] + t) % (W + 260) - 60, cy = c[1], k = c[2] * 34;
      ctx.beginPath(); ctx.arc(cx, cy, k, 0, Math.PI * 2); ctx.arc(cx + k, cy + 6, k * .8, 0, Math.PI * 2); ctx.arc(cx - k, cy + 8, k * .7, 0, Math.PI * 2); ctx.fill();
    }
    // güneş
    if (G){
      const sy = G.stage === "sun" || G.sun.on ? G.sun.y : -300;
      ctx.save(); ctx.translate(390, sy);
      ctx.fillStyle = "#FDB813";
      for (let a = 0; a < 12; a++){ ctx.save(); ctx.rotate(a * Math.PI / 6 + (G.t * .3)); ctx.fillRect(-5, -78, 10, 24); ctx.restore(); }
      ctx.beginPath(); ctx.arc(0, 0, 52, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = "#8A4B00";
      ctx.beginPath(); ctx.arc(-18, -8, 5, 0, Math.PI * 2); ctx.arc(18, -8, 5, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = "#8A4B00"; ctx.lineWidth = 4; ctx.lineCap = "round";
      ctx.beginPath(); ctx.arc(0, 6, 18, .25, Math.PI - .25); ctx.stroke();
      ctx.restore();
      if (G.stage === "sun"){
        ctx.strokeStyle = `rgba(255,255,255,${.35 + .25 * Math.sin(G.t * 5)})`; ctx.lineWidth = 5;
        ctx.beginPath(); ctx.arc(390, G.sun.y, 74, 0, Math.PI * 2); ctx.stroke();
      }
    }
    // toprak
    const soil = ctx.createLinearGradient(0, SOIL_Y, 0, H);
    soil.addColorStop(0, "#9C6B3C"); soil.addColorStop(1, "#6F4620");
    ctx.fillStyle = soil; ctx.fillRect(-200, SOIL_Y, W + 400, H - SOIL_Y + 200);
    ctx.fillStyle = "#4CAF50"; ctx.fillRect(-200, SOIL_Y - 12, W + 400, 16);
    ctx.fillStyle = "#3E8E41";
    for (let x = -20; x < W + 20; x += 16){ ctx.beginPath(); ctx.moveTo(x, SOIL_Y - 10); ctx.lineTo(x + 5, SOIL_Y - 26); ctx.lineTo(x + 10, SOIL_Y - 10); ctx.fill(); }
    if (!G) return;

    // çukurlar ve tohumlar
    for (const p of G.plots){
      if (p.dug){
        ctx.fillStyle = "#5A3A1C";
        ctx.beginPath(); ctx.ellipse(p.x, HOLE_Y, 40, 20, 0, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = "#3E270F";
        ctx.beginPath(); ctx.ellipse(p.x, HOLE_Y + 3, 30, 13, 0, 0, Math.PI * 2); ctx.fill();
      } else if (G.stage === "dig"){
        ctx.strokeStyle = `rgba(255,255,255,${.35 + .3 * Math.sin(G.t * 4)})`; ctx.lineWidth = 5; ctx.setLineDash([9, 9]);
        ctx.beginPath(); ctx.ellipse(p.x, HOLE_Y, 42, 21, 0, 0, Math.PI * 2); ctx.stroke(); ctx.setLineDash([]);
      }
      if (p.seed && p.grow === 0){
        ctx.fillStyle = "#6B4423";
        ctx.beginPath(); ctx.ellipse(p.x, HOLE_Y, 9, 7, .4, 0, Math.PI * 2); ctx.fill();
      }
      if (G.stage === "seed" && p.dug && !p.seed){
        ctx.strokeStyle = `rgba(255,255,255,${.4 + .3 * Math.sin(G.t * 4)})`; ctx.lineWidth = 4;
        ctx.beginPath(); ctx.arc(p.x, HOLE_Y, 34, 0, Math.PI * 2); ctx.stroke();
      }
      if (G.stage === "water"){
        ctx.fillStyle = "rgba(255,255,255,.45)";
        ctx.beginPath(); ctx.roundRect(p.x - 34, HOLE_Y + 28, 68, 12, 6); ctx.fill();
        ctx.fillStyle = "#2E8BC0";
        ctx.beginPath(); ctx.roundRect(p.x - 34, HOLE_Y + 28, 68 * p.water, 12, 6); ctx.fill();
      }
      plant(p, G.veg);
      if (G.stage === "pick" && !p.picked){
        ctx.strokeStyle = `rgba(255,255,255,${.4 + .3 * Math.sin(G.t * 4)})`; ctx.lineWidth = 5;
        ctx.beginPath(); ctx.arc(p.x, SOIL_Y - 110, 56, 0, Math.PI * 2); ctx.stroke();
      }
    }
    // damlalar, sulama kabı
    ctx.fillStyle = "#67C7F0";
    for (const d of G.drops){ ctx.beginPath(); ctx.ellipse(d.x, d.y, 4, 7, 0, 0, Math.PI * 2); ctx.fill(); }
    if (G.stage === "water" && G.can) wateringCan(G.can.x, G.can.y);
    // parçacıklar
    for (const b of G.bits){ ctx.globalAlpha = Math.max(0, b.life * 1.5); ctx.fillStyle = b.c; ctx.fillRect(b.x - 4, b.y - 4, 8, 8); }
    ctx.globalAlpha = 1;
    // sepet
    const bx = 70, by = H - 60;
    ctx.fillStyle = "#B5762F";
    ctx.beginPath(); ctx.moveTo(bx - 52, by - 30); ctx.lineTo(bx + 52, by - 30); ctx.lineTo(bx + 38, by + 30); ctx.lineTo(bx - 38, by + 30); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = "#8A5620"; ctx.lineWidth = 4;
    for (let k = -40; k <= 40; k += 16){ ctx.beginPath(); ctx.moveTo(bx + k, by - 30); ctx.lineTo(bx + k * .72, by + 30); ctx.stroke(); }
    ctx.beginPath(); ctx.moveTo(bx - 46, by - 2); ctx.lineTo(bx + 46, by - 2); ctx.stroke();
    for (let i = 0; i < G.picked; i++){
      ctx.fillStyle = G.veg.c;
      ctx.beginPath(); ctx.arc(bx - 26 + i * 26, by - 36, 15, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = "#2E7D32";
      ctx.beginPath(); ctx.ellipse(bx - 26 + i * 26, by - 50, 5, 9, 0, 0, Math.PI * 2); ctx.fill();
    }
  }

  /* ---------- sepet listesi ---------- */
  function renderCount(bump){
    const total = Object.values(save.counts).reduce((a, b) => a + b, 0);
    $("basket-count").textContent = total;
    if (bump){ const b = $("shelf-btn"); b.classList.remove("bump"); void b.offsetWidth; b.classList.add("bump"); }
  }
  const ICON = {
    havuc: '<svg viewBox="0 0 48 48"><path d="M24 44L13 12h22z" fill="#F97316"/><path d="M24 12c-5-7-13-8-13-8s2 7 13 8zm0 0c5-7 13-8 13-8s-2 7-13 8z" fill="#22C55E"/></svg>',
    domates: '<svg viewBox="0 0 48 48"><circle cx="24" cy="28" r="16" fill="#EF4444"/><path d="M24 8l4 6h-8z" fill="#2E7D32"/><path d="M24 14c-6 0-10-3-10-3s3 6 10 6 10-6 10-6-4 3-10 3z" fill="#2E7D32"/></svg>',
    cilek: '<svg viewBox="0 0 48 48"><path d="M24 44c-12-8-16-16-12-22 3-5 9-4 12 0 3-4 9-5 12 0 4 6 0 14-12 22z" fill="#F43F5E"/><circle cx="19" cy="26" r="1.8" fill="#FFE9A8"/><circle cx="29" cy="28" r="1.8" fill="#FFE9A8"/><circle cx="24" cy="34" r="1.8" fill="#FFE9A8"/><path d="M24 14c-5 0-9-3-9-3s2 6 9 6 9-6 9-6-4 3-9 3z" fill="#2E7D32"/></svg>',
    ayci: '<svg viewBox="0 0 48 48"><g fill="#FACC15"><ellipse cx="24" cy="8" rx="4" ry="8"/><ellipse cx="24" cy="40" rx="4" ry="8"/><ellipse cx="8" cy="24" rx="8" ry="4"/><ellipse cx="40" cy="24" rx="8" ry="4"/><ellipse cx="13" cy="13" rx="4" ry="8" transform="rotate(-45 13 13)"/><ellipse cx="35" cy="35" rx="4" ry="8" transform="rotate(-45 35 35)"/><ellipse cx="35" cy="13" rx="4" ry="8" transform="rotate(45 35 13)"/><ellipse cx="13" cy="35" rx="4" ry="8" transform="rotate(45 13 35)"/></g><circle cx="24" cy="24" r="11" fill="#7A4A12"/></svg>',
    patates: '<svg viewBox="0 0 48 48"><ellipse cx="24" cy="26" rx="18" ry="13" transform="rotate(-15 24 26)" fill="#C9A227"/><ellipse cx="18" cy="22" rx="2" ry="1.6" fill="#8A6D12"/><ellipse cx="29" cy="28" rx="2" ry="1.6" fill="#8A6D12"/><ellipse cx="24" cy="33" rx="2" ry="1.6" fill="#8A6D12"/></svg>',
    salatalik: '<svg viewBox="0 0 48 48"><ellipse cx="24" cy="24" rx="9" ry="19" transform="rotate(20 24 24)" fill="#4ADE80"/><circle cx="22" cy="16" r="1.6" fill="#15803D"/><circle cx="25" cy="24" r="1.6" fill="#15803D"/><circle cx="28" cy="32" r="1.6" fill="#15803D"/></svg>'
  };
  $("shelf-btn").addEventListener("click", () => {
    const box = $("veggies"); box.innerHTML = "";
    VEG.forEach(v => {
      const n = save.counts[v.id] || 0;
      const d = document.createElement("div");
      d.innerHTML = ICON[v.id] + `<span>${n}</span>`;
      d.setAttribute("aria-label", `${v.nm}: ${n}`);
      d.addEventListener("click", () => say(n ? `${n} ${v.nm}` : `Hiç ${v.nm} yok`));
      box.appendChild(d);
    });
    $("shelf").hidden = false;
  });
  $("shelf-close").addEventListener("click", () => { $("shelf").hidden = true; });
  $("shelf").addEventListener("click", e => { if (e.target.id === "shelf") $("shelf").hidden = true; });
  $("next").addEventListener("click", () => { audio(); newRound(); });

  /* ---------- döngü ---------- */
  let last = performance.now();
  function frame(now){
    const dt = Math.min(.05, (now - last) / 1000); last = now;
    update(dt);
    draw();
    requestAnimationFrame(frame);
  }
  document.addEventListener("visibilitychange", () => { last = performance.now(); if (document.hidden && canSpeak) speechSynthesis.cancel(); });
  if ("ResizeObserver" in window) new ResizeObserver(resize).observe(stage); else window.addEventListener("resize", resize);
  resize();
  renderCount(false);
  newRound();
  requestAnimationFrame(frame);
})();
