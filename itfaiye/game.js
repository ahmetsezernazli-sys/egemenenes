(() => {
  "use strict";
  const $ = id => document.getElementById(id);

  /* ---------- ölçüler ---------- */
  const W = 480, H = 720;
  const GROUND = 640;                         // yol çizgisi
  const NOZZLE = {x: 134, y: 506};            // hortumun ucu
  const LADDER = {x: 52, y: 548};             // merdivenin dibi (sepet burada)
  const GRAV = 1100;
  const SAVE_KEY = "itfaiye";
  const NUM = ["", "Bir", "İki", "Üç", "Dört", "Beş", "Altı", "Yedi"];

  // binalar: her biri pencere ızgarası + çatı tipi + kurtarılacak hayvan
  const BUILDINGS = [
    {nm:"ev",       loc:"Evde",      x0:236, x1:456, top:360, roof:"tri",    wall:"#F6D7A7", roofC:"#C0392B", rows:2, cols:2, wy0:372, wy1:560,
      extra:[{x:346, y:302}], animal:{e:"🐱", x:346, y:232}, an:{nm:"kedi", dat:"Kediye", acc:"Kediyi", where:"Çatıda"}, fires:3},
    {nm:"apartman", loc:"Apartmanda", x0:236, x1:460, top:150, roof:"flat",  wall:"#A9C1CF", roofC:"#5B6B78", rows:4, cols:3, wy0:165, wy1:556,
      extra:[], animal:{e:"🐶", x:288, y:128}, an:{nm:"köpek", dat:"Köpeğe", acc:"Köpeği", where:"Çatıda"}, fires:4},
    {nm:"okul",     loc:"Okulda",    x0:230, x1:462, top:330, roof:"tower",  wall:"#F2E3C6", roofC:"#3E7CB1", rows:2, cols:3, wy0:345, wy1:556,
      extra:[], animal:{e:"🐦", x:346, y:178}, an:{nm:"kuş", dat:"Kuşa", acc:"Kuşu", where:"Kulede"}, fires:4},
    {nm:"ahır",     loc:"Ahırda",    x0:240, x1:452, top:390, roof:"barn",   wall:"#C8423B", roofC:"#7A2A24", rows:1, cols:2, wy0:400, wy1:500,
      extra:[{x:346, y:336}], animal:{e:"🐑", x:346, y:262}, an:{nm:"kuzu", dat:"Kuzuya", acc:"Kuzuyu", where:"Çatıda"}, fires:3},
    {nm:"fırın",    loc:"Fırında",   x0:236, x1:458, top:300, roof:"chimney", wall:"#F4C9A8", roofC:"#6D4C41", rows:2, cols:3, wy0:314, wy1:548,
      extra:[], animal:{e:"🐰", x:300, y:280}, an:{nm:"tavşan", dat:"Tavşana", acc:"Tavşanı", where:"Çatıda"}, fires:5}
  ];

  let save = {saved: 0, fires: 0};
  try { save = Object.assign(save, JSON.parse(localStorage.getItem(SAVE_KEY)) || {}); } catch (e) {}
  const store = () => { try { localStorage.setItem(SAVE_KEY, JSON.stringify(save)); } catch (e) {} };

  /* ---------- ses ---------- */
  let soundOn = true, ac = null, noiseBuf = null, spraySnd = null;
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
  function noise(a){
    if (!noiseBuf){
      noiseBuf = a.createBuffer(1, a.sampleRate, a.sampleRate);
      const d = noiseBuf.getChannelData(0);
      for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    }
    const src = a.createBufferSource(); src.buffer = noiseBuf; src.loop = true;
    return src;
  }
  function hiss(dur, freq, vol){
    if (!soundOn) return;
    const a = audio(); if (!a) return;
    const t = a.currentTime, src = noise(a), f = a.createBiquadFilter(), g = a.createGain();
    f.type = "bandpass"; f.frequency.value = freq; f.Q.value = .8;
    g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(f); f.connect(g); g.connect(a.destination); src.start(t); src.stop(t + dur + .05);
  }
  function sprayOn(){
    if (!soundOn || spraySnd) return;
    const a = audio(); if (!a) return;
    const src = noise(a), f = a.createBiquadFilter(), g = a.createGain();
    f.type = "bandpass"; f.frequency.value = 1400; f.Q.value = .6;
    g.gain.setValueAtTime(0.0001, a.currentTime); g.gain.exponentialRampToValueAtTime(.05, a.currentTime + .08);
    src.connect(f); f.connect(g); g.connect(a.destination); src.start();
    spraySnd = {src, g};
  }
  function sprayOff(){
    if (!spraySnd || !ac) return;
    const {src, g} = spraySnd, t = ac.currentTime;
    g.gain.cancelScheduledValues(t); g.gain.setValueAtTime(g.gain.value, t); g.gain.exponentialRampToValueAtTime(0.0001, t + .12);
    src.stop(t + .15); spraySnd = null;
  }
  const siren = () => { for (let k = 0; k < 4; k++) tone(k % 2 ? 620 : 820, k % 2 ? 620 : 820, "square", .34, .05, k * .36); };
  const sOut = () => { hiss(.6, 3000, .12); tone(500, 900, "sine", .18, .12, .1); };
  const sTap = () => tone(600, 900, "sine", .1, .15);
  const sCheer = () => [523, 659, 784, 1047, 1319].forEach((f, k) => tone(f, f, "triangle", .3, .18, k * .12));

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
  $("sound").addEventListener("click", () => { soundOn = !soundOn; if (!soundOn){ sprayOff(); if (canSpeak) speechSynthesis.cancel(); } renderSound(); });
  renderSound();

  function renderCount(bump){
    $("saved").textContent = save.saved;
    $("shelf-btn").setAttribute("aria-label", `${save.saved} hayvan kurtardın`);
    if (bump){ const b = $("shelf-btn"); b.classList.remove("bump"); void b.offsetWidth; b.classList.add("bump"); }
  }
  $("shelf-btn").addEventListener("click", () => { audio(); say(save.saved ? `${save.saved} hayvan kurtardın, ${save.fires} yangın söndürdün!` : "Henüz hayvan kurtarmadın. Hadi başlayalım!"); });

  /* ---------- durum ---------- */
  let G = null, timers = [];
  const later = (sec, fn) => timers.push({t: sec, fn});

  function windowsOf(b){
    const ww = 46, wh = 52, out = [];
    const gx = (b.x1 - b.x0 - b.cols * ww) / (b.cols + 1);
    const gy = (b.wy1 - b.wy0 - b.rows * wh) / (b.rows + 1);
    for (let r = 0; r < b.rows; r++) for (let c = 0; c < b.cols; c++){
      out.push({x: b.x0 + gx + c * (ww + gx) + ww / 2, y: b.wy0 + gy + r * (wh + gy) + wh / 2, w: ww, h: wh});
    }
    for (const e of b.extra) out.push({x: e.x, y: e.y, w: 40, h: 44, round: true});
    return out;
  }

  function newRound(){
    timers = []; sprayOff();
    const bi = save.saved % BUILDINGS.length, b = BUILDINGS[bi];
    const wins = windowsOf(b);
    const n = Math.min(wins.length, b.fires + (save.saved >= BUILDINGS.length ? 1 : 0));
    const pick = wins.map((w, i) => i).sort(() => Math.random() - .5).slice(0, n);
    G = {
      b, wins, stage: "arrive", t: 0, truckX: -260,
      fires: pick.map(i => ({x: wins[i].x, y: wins[i].y - 4, win: i, hp: 100, out: false, hitT: 9, ph: Math.random() * 6, smokeT: 0})),
      drops: [], bits: [], puffs: [], smoke: [], confetti: [],
      spraying: false, aim: {x: 300, y: 400}, spawn: 0, idle: 0, nagT: 0, outCount: 0,
      ladder: 0, slide: 0, animal: {x: b.animal.x, y: b.animal.y}, rescueT: 0
    };
    $("next").hidden = true;
    siren();
  }
  const activeFires = () => G.fires.filter(f => !f.out);

  /* ---------- dokunma ---------- */
  const cv = $("cv"), stage = $("stage"), ctx = cv.getContext("2d");
  let view = {s: 1, ox: 0, oy: 0, dpr: 1};
  const toLogical = e => {
    const r = cv.getBoundingClientRect();
    return {x: (e.clientX - r.left - view.ox) / view.s, y: (e.clientY - r.top - view.oy) / view.s};
  };
  const onTruck = (x, y) => x > G.truckX && x < G.truckX + 200 && y > 552 && y < GROUND + 10;

  function press(x, y){
    if (!G) return;
    audio();
    if (G.stage === "rescue" && Math.hypot(x - G.animal.x, y - G.animal.y) < 48){
      G.stage = "ladder"; sTap();
      say(`Merdiven geliyor!`);
      return;
    }
    if (G.stage !== "arrive" && onTruck(x, y)){ siren(); return; }
    if (G.stage === "arrive") return;
    G.spraying = true; G.aim = {x, y}; G.idle = 0;
    sprayOn();
  }
  function move(x, y){ if (G && G.spraying) G.aim = {x, y}; }
  function release(){ if (G){ G.spraying = false; } sprayOff(); }

  cv.addEventListener("pointerdown", e => {
    e.preventDefault();
    try { cv.setPointerCapture(e.pointerId); } catch (err) {}
    const p = toLogical(e); press(p.x, p.y);
  });
  cv.addEventListener("pointermove", e => { const p = toLogical(e); move(p.x, p.y); });
  ["pointerup", "pointercancel", "lostpointercapture"].forEach(ev => cv.addEventListener(ev, release));
  $("next").addEventListener("click", () => { audio(); newRound(); });

  /* ---------- güncelle ---------- */
  function spawnDrop(){
    const tx = G.aim.x + (Math.random() - .5) * 10, ty = G.aim.y + (Math.random() - .5) * 10;
    const d = Math.hypot(tx - NOZZLE.x, ty - NOZZLE.y);
    const tf = Math.max(.24, Math.min(.6, .2 + d / 1500));
    G.drops.push({x: NOZZLE.x, y: NOZZLE.y, vx: (tx - NOZZLE.x) / tf, vy: (ty - NOZZLE.y) / tf - .5 * GRAV * tf, t: 0, tf});
  }
  function splash(x, y, n, col){
    for (let k = 0; k < n; k++) G.bits.push({x, y, vx: (Math.random() - .5) * 220, vy: -60 - Math.random() * 160, life: .45, col: col || "#BFE6FF"});
  }
  function inBuilding(x, y){
    const b = G.b;
    return x > b.x0 && x < b.x1 && y > b.top - 20 && y < GROUND;
  }

  function fireOut(f){
    f.out = true; f.hp = 0; G.outCount++;
    save.fires++; store();
    sOut();
    for (let k = 0; k < 8; k++) G.puffs.push({x: f.x + (Math.random() - .5) * 30, y: f.y + (Math.random() - .5) * 20, r: 10 + Math.random() * 8, vy: -40 - Math.random() * 40, life: 1.3, max: 1.3});
    const left = activeFires().length;
    if (left === 0){
      say(`${NUM[G.outCount] || G.outCount}! Hepsi söndü!`);
      G.stage = "calm";
      later(1.6, () => {
        G.stage = "rescue"; G.rescueT = 0;
        say(`${G.b.an.where} bir ${G.b.an.nm} var! ${G.b.an.dat} dokun, kurtaralım!`);
      });
    } else say(`${NUM[G.outCount] || G.outCount}!`);
  }

  function update(dt){
    for (const tm of timers) tm.t -= dt;
    const due = timers.filter(tm => tm.t <= 0); timers = timers.filter(tm => tm.t > 0); due.forEach(tm => tm.fn());
    if (!G) return;
    G.t += dt;
    // araç geliyor
    if (G.stage === "arrive"){
      G.truckX = Math.min(14, G.truckX + 360 * dt);
      if (G.truckX >= 14){
        G.stage = "fire";
        const n = G.fires.length;
        say(`Yangın var! ${G.b.loc} ${NUM[n].toLocaleLowerCase("tr")} yangın var. Ateşe dokun, su sık!`);
      }
    }
    // su
    if (G.spraying){
      G.spawn += dt * 60;
      while (G.spawn >= 1){ G.spawn--; spawnDrop(); }
    } else G.spawn = 0;
    const act = activeFires();
    for (const d of G.drops){
      d.t += dt; d.vy += GRAV * dt; d.x += d.vx * dt; d.y += d.vy * dt;
      for (const f of act){
        if (Math.hypot(d.x - f.x, d.y - f.y) < 30){
          f.hp -= 1.6; f.hitT = 0; d.dead = true;
          if (Math.random() < .35) splash(d.x, d.y, 1);
          if (f.hp <= 0 && !f.out) fireOut(f);
          break;
        }
      }
      if (d.dead) continue;
      if (d.y > GROUND || d.x > W + 40 || d.y < -200 || (d.t > d.tf && inBuilding(d.x, d.y))){ d.dead = true; if (Math.random() < .3) splash(d.x, Math.min(d.y, GROUND), 2); }
    }
    G.drops = G.drops.filter(d => !d.dead);
    // ateş: su gelmezse yavaşça toparlanır ama hiç yayılmaz
    for (const f of G.fires){
      if (f.out) continue;
      f.hitT += dt;
      if (f.hitT > 1.8 && f.hp < 100) f.hp = Math.min(100, f.hp + 10 * dt);
      f.smokeT -= dt;
      if (f.smokeT <= 0 && G.smoke.length < 90){
        f.smokeT = .16;
        G.smoke.push({x: f.x + (Math.random() - .5) * 16, y: f.y - 24, r: 8 + Math.random() * 6, vx: 6 + Math.random() * 14, vy: -50 - Math.random() * 30, life: 2.2, max: 2.2});
      }
    }
    for (const s of G.smoke){ s.life -= dt; s.x += s.vx * dt; s.y += s.vy * dt; s.r += 9 * dt; }
    G.smoke = G.smoke.filter(s => s.life > 0);
    for (const p of G.puffs){ p.life -= dt; p.y += p.vy * dt; p.r += 16 * dt; }
    G.puffs = G.puffs.filter(p => p.life > 0);
    for (const b of G.bits){ b.life -= dt; b.vy += 700 * dt; b.x += b.vx * dt; b.y += b.vy * dt; }
    G.bits = G.bits.filter(b => b.life > 0);
    for (const c of G.confetti){ c.life -= dt; c.vy += 300 * dt; c.x += c.vx * dt; c.y += c.vy * dt; c.r += c.vr * dt; }
    G.confetti = G.confetti.filter(c => c.life > 0 && c.y < H + 20);
    // ipucu: uzun süre dokunulmazsa el gösterir
    if (G.stage === "fire" && !G.spraying){
      G.idle += dt;
      if (G.idle > 7 && G.t - G.nagT > 12){ G.nagT = G.t; say("Ateşe dokun!"); }
    }
    if (G.stage === "rescue"){
      G.rescueT += dt;
      if (G.rescueT > 7 && G.t - G.nagT > 9){ G.nagT = G.t; say(`${G.b.an.dat} dokun!`); }
    }
    // merdiven uzar, hayvan kayarak sepete iner
    if (G.stage === "ladder"){
      G.ladder = Math.min(1, G.ladder + dt / 1.1);
      if (G.ladder >= 1){ G.stage = "slide"; tone(400, 800, "sine", .5, .1); }
    }
    if (G.stage === "slide"){
      G.slide = Math.min(1, G.slide + dt / 1.4);
      const e = G.slide < .5 ? 2 * G.slide * G.slide : 1 - Math.pow(-2 * G.slide + 2, 2) / 2;
      G.animal.x = G.b.animal.x + (LADDER.x + 30 - G.b.animal.x) * e;
      G.animal.y = G.b.animal.y + (LADDER.y - 22 - G.b.animal.y) * e;
      if (G.slide >= 1) rescued();
    }
    if (G.stage === "done" && G.t > G.ladderBackAt) G.ladder = Math.max(0, G.ladder - dt / 1.2);
  }

  function rescued(){
    G.stage = "done"; G.ladderBackAt = G.t + .8;
    save.saved++; store(); renderCount(true);
    sCheer();
    say(`Aferin! ${G.b.an.acc} kurtardın!`);
    const cols = ["#E53935", "#FFC107", "#22C55E", "#3D8BFD", "#FF7A2F", "#9B5DE5"];
    for (let k = 0; k < 70; k++) G.confetti.push({x: 60 + Math.random() * 360, y: -10 - Math.random() * 120, vx: (Math.random() - .5) * 80, vy: 40 + Math.random() * 80,
      r: Math.random() * 6, vr: (Math.random() - .5) * 8, c: cols[k % cols.length], life: 4});
    later(1.2, () => { $("next").hidden = false; });
  }

  /* ---------- çizim ---------- */
  function resize(){
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const cw = stage.clientWidth, ch = stage.clientHeight;
    cv.width = Math.round(cw * dpr); cv.height = Math.round(ch * dpr);
    const s = Math.min(cw / W, ch / H);
    view = {s, ox: (cw - W * s) / 2, oy: (ch - H * s) / 2, dpr};
  }

  function rr(x, y, w, h, r, fill){ ctx.fillStyle = fill; ctx.beginPath(); ctx.roundRect(x, y, w, h, r); ctx.fill(); }

  function drawBuilding(){
    const b = G.b, w = b.x1 - b.x0, cx = (b.x0 + b.x1) / 2;
    ctx.fillStyle = "rgba(0,0,0,.12)"; ctx.fillRect(b.x0 + 8, b.top + 8, w, GROUND - b.top - 8);
    // çatı
    ctx.fillStyle = b.roofC;
    if (b.roof === "tri"){
      ctx.beginPath(); ctx.moveTo(b.x0 - 16, b.top + 4); ctx.lineTo(cx, b.top - 112); ctx.lineTo(b.x1 + 16, b.top + 4); ctx.closePath(); ctx.fill();
      rr(b.x1 - 66, b.top - 92, 26, 50, 3, "#8E3B2F");
    } else if (b.roof === "barn"){
      ctx.beginPath(); ctx.moveTo(b.x0 - 12, b.top + 4); ctx.lineTo(b.x0 + 10, b.top - 70); ctx.lineTo(cx, b.top - 120); ctx.lineTo(b.x1 - 10, b.top - 70); ctx.lineTo(b.x1 + 12, b.top + 4); ctx.closePath(); ctx.fill();
      ctx.fillStyle = b.wall;
      ctx.beginPath(); ctx.moveTo(b.x0 + 4, b.top + 4); ctx.lineTo(b.x0 + 20, b.top - 62); ctx.lineTo(cx, b.top - 104); ctx.lineTo(b.x1 - 20, b.top - 62); ctx.lineTo(b.x1 - 4, b.top + 4); ctx.closePath(); ctx.fill();
    } else if (b.roof === "tower"){
      rr(cx - 32, b.top - 122, 64, 130, 4, b.wall);
      ctx.fillStyle = b.roofC; ctx.beginPath(); ctx.moveTo(cx - 40, b.top - 120); ctx.lineTo(cx, b.top - 160); ctx.lineTo(cx + 40, b.top - 120); ctx.closePath(); ctx.fill();
      ctx.fillStyle = "#fff"; ctx.beginPath(); ctx.arc(cx, b.top - 80, 20, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = "#27405A"; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(cx, b.top - 80, 20, 0, Math.PI * 2); ctx.stroke();
      ctx.lineCap = "round"; ctx.beginPath(); ctx.moveTo(cx, b.top - 80); ctx.lineTo(cx, b.top - 94); ctx.moveTo(cx, b.top - 80); ctx.lineTo(cx + 9, b.top - 76); ctx.stroke();
      rr(b.x0 - 6, b.top - 10, w + 12, 16, 3, b.roofC);
    } else if (b.roof === "chimney"){
      rr(b.x1 - 58, b.top - 52, 26, 56, 2, "#8D6E63");
      rr(b.x0 - 10, b.top - 12, w + 20, 18, 4, b.roofC);
    } else {
      rr(b.x0 - 6, b.top - 12, w + 12, 16, 3, b.roofC);
      rr(b.x1 - 62, b.top - 44, 36, 34, 4, "#7B8C99");
    }
    // duvar
    rr(b.x0, b.top, w, GROUND - b.top, 4, b.wall);
    if (b.roof === "barn"){
      ctx.strokeStyle = "rgba(255,255,255,.85)"; ctx.lineWidth = 5;
      ctx.strokeRect(b.x0 + 4, b.top + 2, w - 8, GROUND - b.top - 4);
    }
    // kapı
    const dw = b.roof === "barn" ? 86 : 50, dh = b.roof === "barn" ? 110 : 76;
    rr(cx - dw / 2, GROUND - dh, dw, dh, 6, b.roof === "barn" ? "#7A2A24" : "#6D4C41");
    if (b.roof === "barn"){
      ctx.strokeStyle = "#fff"; ctx.lineWidth = 4;
      ctx.beginPath(); ctx.moveTo(cx - dw / 2, GROUND - dh); ctx.lineTo(cx + dw / 2, GROUND); ctx.moveTo(cx + dw / 2, GROUND - dh); ctx.lineTo(cx - dw / 2, GROUND); ctx.stroke();
    } else { ctx.fillStyle = "#FFC107"; ctx.beginPath(); ctx.arc(cx + dw / 2 - 10, GROUND - dh / 2, 4, 0, Math.PI * 2); ctx.fill(); }
    if (b.roof === "chimney"){
      // tente
      const aw = 150, ax = cx - aw / 2, ay = GROUND - dh - 30;
      for (let k = 0; k < 6; k++) rr(ax + k * aw / 6, ay, aw / 6, 22, 0, k % 2 ? "#fff" : "#E53935");
      ctx.font = "26px sans-serif"; ctx.textAlign = "center"; ctx.textBaseline = "middle";
      ctx.fillText("🥖", cx - 46, GROUND - 40);
    }
    // pencereler
    G.wins.forEach((wn, i) => {
      const f = G.fires.find(q => q.win === i);
      const burnt = f && f.out, lit = f && !f.out;
      ctx.fillStyle = lit ? "#FFB300" : burnt ? "#4E4A47" : "#BFE6FF";
      ctx.beginPath();
      if (wn.round) ctx.arc(wn.x, wn.y, wn.w / 2, 0, Math.PI * 2); else ctx.roundRect(wn.x - wn.w / 2, wn.y - wn.h / 2, wn.w, wn.h, 5);
      ctx.fill();
      ctx.strokeStyle = "#fff"; ctx.lineWidth = 4; ctx.stroke();
      if (!wn.round){ ctx.beginPath(); ctx.moveTo(wn.x, wn.y - wn.h / 2); ctx.lineTo(wn.x, wn.y + wn.h / 2); ctx.moveTo(wn.x - wn.w / 2, wn.y); ctx.lineTo(wn.x + wn.w / 2, wn.y); ctx.lineWidth = 3; ctx.stroke(); }
    });
  }

  function drawFire(f){
    const k = Math.max(.35, f.hp / 100), t = G.t * 9 + f.ph;
    const layers = [{c: "#E53935", s: 1}, {c: "#FF9800", s: .72}, {c: "#FFEB3B", s: .42}];
    for (const L of layers){
      for (let j = -1; j <= 1; j++){
        const hgt = (42 + 10 * Math.sin(t + j * 1.7)) * k * L.s * (j ? .8 : 1);
        const wid = 20 * k * L.s;
        const x = f.x + j * 15 * k * L.s, y = f.y + 18 * k;
        ctx.fillStyle = L.c;
        ctx.beginPath();
        ctx.moveTo(x - wid, y);
        ctx.quadraticCurveTo(x - wid, y - hgt * .55, x + Math.sin(t * .7 + j) * 5, y - hgt);
        ctx.quadraticCurveTo(x + wid, y - hgt * .55, x + wid, y);
        ctx.closePath(); ctx.fill();
      }
    }
  }

  function drawTruck(){
    const x = G.truckX, y = 552;
    ctx.fillStyle = "rgba(0,0,0,.18)"; ctx.beginPath(); ctx.ellipse(x + 100, GROUND + 4, 110, 10, 0, 0, Math.PI * 2); ctx.fill();
    rr(x, y, 150, 72, 8, "#E53935");                       // gövde
    rr(x + 140, y - 18, 60, 90, 10, "#E53935");            // kabin
    rr(x + 152, y - 8, 38, 30, 5, "#BFE6FF");              // cam
    rr(x, y + 30, 200, 8, 3, "#FFFFFF");                   // şerit
    for (let k = 0; k < 4; k++) rr(x + 10 + k * 32, y + 8, 24, 16, 3, "#B71C1C");   // dolaplar
    // tepe lambası
    const blink = Math.sin(G.t * 12) > 0;
    rr(x + 158, y - 28, 24, 11, 4, blink ? "#2196F3" : "#90CAF9");
    // hortum makarası
    ctx.fillStyle = "#FFD54F"; ctx.beginPath(); ctx.arc(x + 118, y + 50, 13, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "#B71C1C"; ctx.beginPath(); ctx.arc(x + 118, y + 50, 5, 0, Math.PI * 2); ctx.fill();
    // tekerler
    for (const wx of [x + 40, x + 168]){
      ctx.fillStyle = "#263238"; ctx.beginPath(); ctx.arc(wx, GROUND - 4, 19, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = "#B0BEC5"; ctx.beginPath(); ctx.arc(wx, GROUND - 4, 8, 0, Math.PI * 2); ctx.fill();
    }
  }

  function drawLadder(){
    const L = G.ladder;
    // katlı merdiven her zaman aracın üstünde durur
    const base = {x: G.truckX + 38, y: LADDER.y};
    let ex, ey;
    if (L <= 0){ ex = base.x + 70; ey = base.y; }
    else {
      const tx = G.b.animal.x - 14, ty = G.b.animal.y + 22;
      const restX = base.x + 70, restY = base.y;
      ex = restX + (tx - restX) * L; ey = restY + (ty - restY) * L;
    }
    const dx = ex - base.x, dy = ey - base.y, len = Math.hypot(dx, dy), nx = -dy / len * 7, ny = dx / len * 7;
    ctx.strokeStyle = "#ECEFF1"; ctx.lineWidth = 5; ctx.lineCap = "round";
    ctx.beginPath(); ctx.moveTo(base.x + nx, base.y + ny); ctx.lineTo(ex + nx, ey + ny); ctx.moveTo(base.x - nx, base.y - ny); ctx.lineTo(ex - nx, ey - ny); ctx.stroke();
    ctx.lineWidth = 3;
    for (let d = 14; d < len; d += 16){
      const px = base.x + dx * d / len, py = base.y + dy * d / len;
      ctx.beginPath(); ctx.moveTo(px + nx, py + ny); ctx.lineTo(px - nx, py - ny); ctx.stroke();
    }
    // sepet
    rr(base.x - 6, base.y - 26, 52, 24, 5, "#FFC107");
    ctx.strokeStyle = "#B28704"; ctx.lineWidth = 2; ctx.strokeRect(base.x - 6, base.y - 26, 52, 24);
  }

  function drawFirefighter(){
    const x = G.truckX + 108, y = 552;
    const ang = Math.atan2((G.spraying ? G.aim.y : NOZZLE.y + 40) - NOZZLE.y, (G.spraying ? G.aim.x : NOZZLE.x + 60) - NOZZLE.x);
    // bacaklar ve gövde
    rr(x - 9, y - 30, 8, 30, 3, "#37474F"); rr(x + 2, y - 30, 8, 30, 3, "#37474F");
    rr(x - 13, y - 66, 27, 40, 8, "#C9A227");
    rr(x - 13, y - 44, 27, 5, 2, "#E0E0E0");
    // kafa ve kask
    ctx.fillStyle = "#F2C9A0"; ctx.beginPath(); ctx.arc(x, y - 78, 11, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "#E53935"; ctx.beginPath(); ctx.arc(x, y - 82, 13, Math.PI, 0); ctx.fill();
    rr(x - 17, y - 84, 34, 5, 2, "#E53935");
    ctx.fillStyle = "#FFC107"; ctx.beginPath(); ctx.arc(x, y - 88, 4, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "#27405A"; ctx.beginPath(); ctx.arc(x + 4, y - 78, 1.8, 0, Math.PI * 2); ctx.fill();
    // hortum: makaradan ellere
    const hx = G.truckX + 118, hy = 602, nx = G.truckX - 14 + NOZZLE.x, ny = NOZZLE.y;
    ctx.strokeStyle = "#5D4037"; ctx.lineWidth = 6; ctx.lineCap = "round";
    ctx.beginPath(); ctx.moveTo(hx, hy); ctx.quadraticCurveTo(x + 30, y - 10, nx, ny + 6); ctx.stroke();
    // nozul
    ctx.save(); ctx.translate(nx, ny); ctx.rotate(ang);
    rr(-4, -5, 26, 10, 3, "#90A4AE"); rr(18, -6, 8, 12, 2, "#455A64");
    ctx.restore();
    // kollar
    ctx.strokeStyle = "#C9A227"; ctx.lineWidth = 7;
    ctx.beginPath(); ctx.moveTo(x + 6, y - 58); ctx.lineTo(nx + 2, ny + 2); ctx.stroke();
  }

  function draw(){
    const {s, ox, oy, dpr} = view;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.fillStyle = "#9FD3F0"; ctx.fillRect(0, 0, cv.width, cv.height);
    ctx.setTransform(dpr * s, 0, 0, dpr * s, dpr * ox, dpr * oy);
    // gökyüzü
    const sky = ctx.createLinearGradient(0, -200, 0, GROUND);
    sky.addColorStop(0, "#6FB8E6"); sky.addColorStop(1, "#D9F0FB");
    ctx.fillStyle = sky; ctx.fillRect(-400, -300, W + 800, GROUND + 300);
    if (G){
      const heat = activeFires().length / Math.max(1, G.fires.length);
      if (heat > 0){ ctx.fillStyle = `rgba(255,140,60,${.22 * heat})`; ctx.fillRect(-400, -300, W + 800, GROUND + 300); }
    }
    ctx.fillStyle = "#FFE082"; ctx.beginPath(); ctx.arc(438, 46, 30, 0, Math.PI * 2); ctx.fill();
    // uzak şehir
    ctx.fillStyle = "rgba(90,130,160,.35)";
    [[-60, 430, 70], [20, 470, 60], [90, 410, 50], [470, 400, 80], [540, 450, 60]].forEach(([x, y, w]) => ctx.fillRect(x, y, w, GROUND - y));
    // yol
    ctx.fillStyle = "#B0BEC5"; ctx.fillRect(-400, GROUND - 14, W + 800, 14);
    ctx.fillStyle = "#455A64"; ctx.fillRect(-400, GROUND, W + 800, H - GROUND + 300);
    ctx.fillStyle = "#FFEB3B"; for (let x = -380; x < W + 400; x += 60) ctx.fillRect(x, GROUND + 38, 32, 6);
    if (!G) return;
    drawBuilding();
    // duman
    for (const sm of G.smoke){ ctx.fillStyle = `rgba(70,70,75,${.32 * sm.life / sm.max})`; ctx.beginPath(); ctx.arc(sm.x, sm.y, sm.r, 0, Math.PI * 2); ctx.fill(); }
    for (const f of G.fires) if (!f.out) drawFire(f);
    for (const p of G.puffs){ ctx.fillStyle = `rgba(255,255,255,${.8 * p.life / p.max})`; ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2); ctx.fill(); }
    // hayvan
    const a = G.animal;
    const scared = G.stage === "fire" || G.stage === "arrive";
    const hop = G.stage === "rescue" ? Math.abs(Math.sin(G.t * 5)) * 8 : scared ? Math.sin(G.t * 20) * 1.5 : 0;
    if (G.stage === "rescue"){
      ctx.strokeStyle = `rgba(34,197,94,${.55 + .4 * Math.sin(G.t * 5)})`; ctx.lineWidth = 6; ctx.setLineDash([12, 9]);
      ctx.beginPath(); ctx.arc(a.x, a.y, 40 + 4 * Math.sin(G.t * 5), 0, Math.PI * 2); ctx.stroke(); ctx.setLineDash([]);
    }
    drawTruck();
    drawLadder();
    ctx.font = "40px sans-serif"; ctx.textAlign = "center"; ctx.textBaseline = "middle";
    ctx.fillText(G.b.animal.e, a.x, a.y - hop);
    if (scared){ ctx.font = "800 22px 'Baloo 2', sans-serif"; ctx.fillStyle = "#E53935"; ctx.fillText("!", a.x + 22, a.y - 26 + Math.sin(G.t * 8) * 2); }
    if (G.stage === "done"){ ctx.font = "26px sans-serif"; ctx.fillText("❤️", a.x + 4, a.y - 40 - Math.abs(Math.sin(G.t * 3)) * 10); }
    drawFirefighter();
    // su
    ctx.fillStyle = "rgba(120,200,255,.9)";
    for (const d of G.drops){ ctx.beginPath(); ctx.arc(d.x, d.y, 5, 0, Math.PI * 2); ctx.fill(); }
    ctx.fillStyle = "rgba(225,245,255,.95)";
    for (const d of G.drops){ ctx.beginPath(); ctx.arc(d.x - 1.5, d.y - 1.5, 2, 0, Math.PI * 2); ctx.fill(); }
    for (const b of G.bits){ ctx.fillStyle = b.col; ctx.globalAlpha = Math.max(0, b.life / .45); ctx.beginPath(); ctx.arc(b.x, b.y, 3, 0, Math.PI * 2); ctx.fill(); }
    ctx.globalAlpha = 1;
    // ipucu eli
    const hintFire = G.stage === "fire" && !G.spraying && G.idle > 3 ? activeFires()[0] : null;
    if (hintFire || (G.stage === "rescue" && G.rescueT > 3)){
      const tgt = hintFire || a, k = (G.t % 1.6) / 1.6;
      const hx = tgt.x + 40 * (1 - k) + 6, hy = tgt.y + 60 * (1 - k) + 16;
      ctx.font = "44px sans-serif"; ctx.globalAlpha = Math.min(1, k * 3);
      ctx.fillText("👆", hx, hy); ctx.globalAlpha = 1;
    }
    // sayaç: söndürülen yangınlar
    if (G.stage !== "arrive"){
      const n = G.fires.length;
      rr(12, 12, 40 + n * 34, 46, 23, "rgba(255,255,255,.85)");
      ctx.font = "26px sans-serif";
      ctx.fillText("🚒", 36, 36);
      G.fires.forEach((f, i) => {
        ctx.globalAlpha = f.out ? 1 : .3;
        ctx.fillText(f.out ? "💧" : "🔥", 70 + i * 34, 36);
      });
      ctx.globalAlpha = 1;
    }
    // konfeti
    for (const c of G.confetti){
      ctx.save(); ctx.translate(c.x, c.y); ctx.rotate(c.r); ctx.fillStyle = c.c; ctx.fillRect(-5, -3, 10, 6); ctx.restore();
    }
  }

  let last = performance.now();
  function frame(now){
    const dt = Math.min(.05, (now - last) / 1000); last = now;
    update(dt);
    draw();
    requestAnimationFrame(frame);
  }
  document.addEventListener("visibilitychange", () => { last = performance.now(); if (document.hidden){ release(); if (canSpeak) speechSynthesis.cancel(); } });
  if ("ResizeObserver" in window) new ResizeObserver(resize).observe(stage); else window.addEventListener("resize", resize);
  resize();
  renderCount(false);
  newRound();
  requestAnimationFrame(frame);

  // testler için: oyun mantığına dışarıdan erişim
  window.__itfaiye = {state: () => G, update, press, move, release, newRound, BUILDINGS, windowsOf};
})();
