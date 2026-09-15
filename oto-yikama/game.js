/* Oto Yıkama — Egemen için dokunarak araç yıkama */
(function(){
  "use strict";

  const VW = 700, VH = 360, GROUND = 345, CELL = 20, DONE_AT = .8;
  const STAGES = [
    {id:"sponge", r:48, say:"Süngerle köpükle!"},
    {id:"water",  r:54, say:"Şimdi suyla durula!"},
    {id:"towel",  r:50, say:"Havluyla kurula!"}
  ];
  const STICKERS = ["⭐", "❤️", "🌈", "🌸", "⚡", "😊"];
  const RAINBOW = ["#E4483B", "#C98F00", "#2A64C0", "#1E8A41", "#6E36B8"];
  const SOUND_KEY = "oto-yikama-ses";
  const RM = window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches;
  const EMOJI_FONT = '"Segoe UI Emoji","Apple Color Emoji","Noto Color Emoji",sans-serif';
  const INK = "#2A2540", TAU = Math.PI*2;

  const $ = id => document.getElementById(id);
  const stage = $("stage"), cv = $("cv"), ctx = cv.getContext("2d");
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const rand = (a, b) => a + Math.random()*(b - a);
  const ease = t => t < .5 ? 2*t*t : 1 - Math.pow(-2*t + 2, 2)/2;

  let soundOn = true;
  try { soundOn = localStorage.getItem(SOUND_KEY) !== "0"; } catch(e) {}

  document.querySelectorAll("[data-rainbow]").forEach(el => {
    const text = el.textContent.trim(); el.textContent = ""; el.setAttribute("aria-label", text);
    let k = 0;
    for (const ch of text){
      const s = document.createElement("span"); s.textContent = ch; s.setAttribute("aria-hidden", "true");
      if (ch.trim()) s.style.color = RAINBOW[k++ % RAINBOW.length];
      el.appendChild(s);
    }
  });

  /* ---------- ses ---------- */
  let ac = null;
  function audio(){
    if (!ac){ try { ac = new (window.AudioContext || window.webkitAudioContext)(); } catch(e) { ac = null; } }
    if (ac && ac.state === "suspended") ac.resume();
    return ac;
  }
  function tone(freq, dur, type, vol, slide, delay){
    const a = audio(); if (!a || !soundOn) return;
    const n = a.currentTime + (delay || 0), o = a.createOscillator(), g = a.createGain();
    o.type = type || "sine"; o.frequency.setValueAtTime(freq, n);
    if (slide) o.frequency.exponentialRampToValueAtTime(slide, n + dur);
    g.gain.setValueAtTime(.0001, n); g.gain.exponentialRampToValueAtTime(vol || .1, n + .015); g.gain.exponentialRampToValueAtTime(.0001, n + dur);
    o.connect(g).connect(a.destination); o.start(n); o.stop(n + dur + .05);
  }
  function noise(dur, type, freq, vol, delay){
    const a = audio(); if (!a || !soundOn) return;
    const len = Math.floor(a.sampleRate*dur), buf = a.createBuffer(1, len, a.sampleRate), d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = (Math.random()*2 - 1)*Math.sin(Math.PI*i/len);
    const s = a.createBufferSource(); s.buffer = buf;
    const f = a.createBiquadFilter(); f.type = type; f.frequency.value = freq; f.Q.value = .9;
    const g = a.createGain(); g.gain.value = vol;
    s.connect(f).connect(g).connect(a.destination); s.start(a.currentTime + (delay || 0));
  }
  const sfx = {
    sponge(){ noise(.12, "bandpass", 900 + Math.random()*500, .35); if (Math.random() < .3) tone(rand(900, 1400), .06, "sine", .04, rand(1500, 2000)); },
    water(){ noise(.16, "highpass", 3500, .25); },
    towel(){ noise(.14, "lowpass", 700, .45); },
    step(){ [659.25, 783.99, 1046.5].forEach((f, i) => tone(f, .18, "triangle", .12, null, i*.09)); },
    sparkle(){ [1318.5, 1567.98, 2093].forEach((f, i) => tone(f, .2, "sine", .07, null, i*.07)); },
    sticker(){ tone(700, .1, "triangle", .12, 1100); },
    horn(){ tone(392, .22, "square", .07); tone(494, .22, "square", .05); tone(392, .3, "square", .07, null, .3); tone(494, .3, "square", .05, null, .3); },
    engine(){ tone(80, 1.2, "sawtooth", .06, 160); },
    arrive(){ tone(120, .9, "sawtooth", .04, 70); },
    party(){ [523.25, 659.25, 783.99, 1046.5, 1318.5].forEach((f, i) => tone(f, .3, "triangle", .14, null, i*.12)); }
  };
  const canSpeak = "speechSynthesis" in window;
  let trVoice = null;
  function pickVoice(){ trVoice = speechSynthesis.getVoices().find(v => /^tr(-|_|$)/i.test(v.lang)) || null; }
  if (canSpeak){ pickVoice(); if (speechSynthesis.addEventListener) speechSynthesis.addEventListener("voiceschanged", pickVoice); }
  function say(text, queue){
    if (!canSpeak || !soundOn || !trVoice) return;
    if (!queue) speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text); u.voice = trVoice; u.lang = trVoice.lang; u.rate = .95; u.pitch = 1.15;
    speechSynthesis.speak(u);
  }
  function renderSound(){
    $("ic-on").hidden = !soundOn; $("ic-off").hidden = soundOn;
    $("sound").setAttribute("aria-label", soundOn ? "Sesi kapat" : "Sesi aç");
    $("sound").setAttribute("aria-pressed", String(soundOn));
  }
  $("sound").addEventListener("click", () => {
    soundOn = !soundOn;
    try { localStorage.setItem(SOUND_KEY, soundOn ? "1" : "0"); } catch(e) {}
    if (!soundOn && canSpeak) speechSynthesis.cancel();
    renderSound();
  });
  renderSound();

  /* ---------- araçlar (yerel koordinat 700 x 360, zemin 345) ---------- */
  function rr(p, x, y, w, h, r){ p.roundRect(x, y, w, h, r); }
  function wheelPath(p, x, y, r){ p.moveTo(x + r, y); p.arc(x, y, r, 0, TAU); }
  const VEHICLES = [
    {id:"araba", name:"Araba", color:"#E63946", dark:"#A4232D", wheels:[[180, 297, 48], [520, 297, 48]], eyes:[410, 132],
      body(p){ rr(p, 40, 170, 620, 124, 44); p.moveTo(170, 178); p.quadraticCurveTo(210, 70, 300, 70); p.lineTo(450, 70); p.quadraticCurveTo(525, 70, 565, 178); p.closePath(); },
      details(c){
        c.fillStyle = "#CFF1FF";
        c.beginPath(); c.moveTo(210, 170); c.quadraticCurveTo(240, 96, 300, 94); c.lineTo(338, 94); c.lineTo(338, 170); c.closePath(); c.fill();
        c.beginPath(); c.moveTo(362, 170); c.lineTo(362, 94); c.lineTo(448, 94); c.quadraticCurveTo(505, 100, 530, 170); c.closePath(); c.fill();
        c.fillStyle = "#FFE08A"; c.beginPath(); c.ellipse(648, 212, 12, 18, 0, 0, TAU); c.fill();
        c.fillStyle = "rgba(0,0,0,.18)"; c.fillRect(348, 180, 6, 100);
        c.fillStyle = "#FFFFFF"; c.fillRect(270, 205, 34, 8); c.fillRect(420, 205, 34, 8);
      }},
    {id:"otobus", name:"Otobüs", color:"#FFC300", dark:"#C99400", wheels:[[160, 297, 46], [540, 297, 46]], eyes:[610, 130],
      body(p){ rr(p, 20, 60, 660, 232, 34); },
      details(c){
        c.fillStyle = "#CFF1FF";
        for (let x = 50; x < 500; x += 110){ c.beginPath(); c.roundRect(x, 90, 90, 70, 12); c.fill(); }
        c.beginPath(); c.roundRect(560, 90, 100, 90, 14); c.fill();
        c.fillStyle = "#8ECDF0"; c.beginPath(); c.roundRect(500, 175, 44, 105, 8); c.fill();
        c.fillStyle = "#2A2540"; c.fillRect(20, 190, 660, 10);
        c.fillStyle = "#FFE08A"; c.beginPath(); c.ellipse(668, 240, 10, 16, 0, 0, TAU); c.fill();
      }},
    {id:"itfaiye", name:"İtfaiye", color:"#D62828", dark:"#8F1A1A", wheels:[[130, 297, 48], [330, 297, 48], [580, 297, 48]], eyes:[578, 165],
      body(p){ rr(p, 470, 112, 200, 180, 30); rr(p, 30, 160, 460, 132, 12); },
      details(c){
        c.fillStyle = "#CFF1FF"; c.beginPath(); c.roundRect(505, 135, 140, 70, 12); c.fill();
        c.fillStyle = "#B8C4D0";
        c.fillRect(50, 132, 400, 10); c.fillRect(50, 150, 400, 8);
        for (let x = 60; x < 450; x += 32) c.fillRect(x, 132, 6, 26);
        c.fillStyle = "#FFD60A"; c.fillRect(30, 222, 460, 14);
        c.fillStyle = "#3DA5FF"; c.beginPath(); c.roundRect(540, 92, 60, 22, 8); c.fill();
        c.fillStyle = "#FFE08A"; c.beginPath(); c.ellipse(662, 250, 10, 16, 0, 0, TAU); c.fill();
      }},
    {id:"traktor", name:"Traktör", color:"#2A9D55", dark:"#1B6B39", wheels:[[210, 255, 90], [575, 297, 48]], eyes:[215, 118],
      body(p){ rr(p, 300, 172, 350, 112, 26); rr(p, 120, 64, 190, 186, 20); rr(p, 100, 44, 230, 32, 12); },
      details(c){
        c.fillStyle = "#CFF1FF"; c.beginPath(); c.roundRect(145, 88, 140, 70, 12); c.fill();
        c.fillStyle = "#4A4A4A"; c.fillRect(560, 110, 18, 64);
        c.fillStyle = "#FFE08A"; c.beginPath(); c.ellipse(640, 215, 10, 16, 0, 0, TAU); c.fill();
        c.fillStyle = "rgba(0,0,0,.18)"; for (let y = 190; y < 270; y += 18) c.fillRect(420, y, 120, 6);
      }},
    {id:"dondurma", name:"Dondurma arabası", color:"#FF8FB1", dark:"#D4577D", wheels:[[170, 297, 48], [500, 297, 48]], eyes:[622, 205],
      body(p){ rr(p, 40, 92, 560, 200, 40); rr(p, 560, 170, 112, 122, 30); p.moveTo(302, 60); p.lineTo(358, 60); p.lineTo(330, 100); p.closePath(); p.moveTo(362, 44); p.arc(330, 44, 32, 0, TAU); },
      details(c){
        c.fillStyle = "#FFF4D6"; c.beginPath(); c.roundRect(110, 122, 280, 96, 14); c.fill();
        c.fillStyle = "#F4A259"; for (let x = 110; x < 390; x += 40){ c.beginPath(); c.moveTo(x, 122); c.lineTo(x + 40, 122); c.lineTo(x + 20, 140); c.closePath(); c.fill(); }
        c.fillStyle = "#CFF1FF"; c.beginPath(); c.roundRect(590, 188, 64, 50, 10); c.fill();
        c.fillStyle = "#E0A96D"; c.beginPath(); c.moveTo(306, 62); c.lineTo(354, 62); c.lineTo(330, 98); c.closePath(); c.fill();
        c.fillStyle = "#FFF"; c.beginPath(); c.arc(330, 44, 26, 0, TAU); c.fill();
        c.fillStyle = "#FF5C8A"; [[318, 34], [338, 50], [342, 30]].forEach(([x, y]) => { c.beginPath(); c.arc(x, y, 4, 0, TAU); c.fill(); });
      }}
  ];

  /* ---------- düzen ---------- */
  const view = {s:1, ox:0, oy:0, dpr:1, portrait:false};
  let W = 1000, H = 620, L = null;
  function layout(){
    if (view.portrait){
      W = 760; H = 1000;
      L = {vx:30, vy:360, floor:680, icons:{x:380, y:70}, cars:{x:380, y:150}, horn:{x:640, y:890}, tool:{x:640, y:890}, tray:{x:250, y:890}};
    } else {
      W = 1000; H = 620;
      L = {vx:150, vy:185, floor:500, icons:{x:500, y:48}, cars:{x:500, y:118}, horn:{x:900, y:540}, tool:{x:900, y:540}, tray:{x:150, y:560}};
    }
  }
  function resize(){
    const r = stage.getBoundingClientRect();
    view.dpr = Math.min(window.devicePixelRatio || 1, 2);
    cv.width = Math.round(r.width*view.dpr); cv.height = Math.round(r.height*view.dpr);
    view.portrait = r.height > r.width*1.1;
    layout();
    view.s = Math.min(r.width/W, r.height/H);
    view.ox = (r.width - W*view.s)/2; view.oy = (r.height - H*view.s)/2;
  }
  function toLogical(e){
    const r = cv.getBoundingClientRect();
    return {x:(e.clientX - r.left - view.ox)/view.s, y:(e.clientY - r.top - view.oy)/view.s};
  }

  /* ---------- oyun durumu ---------- */
  let phase = "intro";          // intro | arrive | wash | stickers | leave | party
  let vIndex = 0, veh = null, vOff = -1, stepNo = 0, progress = 0, lock = false, time = 0;
  let mask = null, cells = [], inside = 0, doneCount = 0;
  let layers = null, fade = null, stickers = [], parts = [], timers = [];
  let pointer = {down:false, x:0, y:0, lx:null, ly:null, id:null}, soundT = 0, idleT = 0, autoScrub = false, autoT = 0;
  const later = (s, fn) => timers.push({t:s, fn});
  const mkCanvas = () => { const c = document.createElement("canvas"); c.width = VW; c.height = VH; return c; };

  function buildMask(v){
    const p = new Path2D();
    v.body(p);
    for (const [x, y, r] of v.wheels) wheelPath(p, x, y, r);
    return p;
  }
  function newVehicle(i){
    veh = VEHICLES[i];
    mask = buildMask(veh);
    const probe = document.createElement("canvas").getContext("2d");
    cells = [];
    for (let y = CELL/2; y < VH; y += CELL) for (let x = CELL/2; x < VW; x += CELL){
      if (probe.isPointInPath(mask, x, y)) cells.push({x, y, done:false});
    }
    inside = cells.length;
    layers = {dirt:mkCanvas(), foam:mkCanvas(), drops:mkCanvas(), alpha:{dirt:1, foam:1, drops:1}};
    // çamur
    const d = layers.dirt.getContext("2d");
    d.save(); d.clip(mask);
    const browns = ["#6B4A2B", "#7A5634", "#8B6A45", "#5C3D22"];
    for (let k = 0; k < 70; k++){
      d.fillStyle = browns[k % browns.length]; d.globalAlpha = rand(.55, .9);
      const x = rand(0, VW), y = rand(20, VH), r = rand(18, 60);
      d.beginPath();
      for (let a = 0; a < 12; a++){ const ang = a/12*TAU, rr2 = r*rand(.7, 1.15); a ? d.lineTo(x + Math.cos(ang)*rr2, y + Math.sin(ang)*rr2) : d.moveTo(x + Math.cos(ang)*rr2, y + Math.sin(ang)*rr2); }
      d.closePath(); d.fill();
    }
    d.globalAlpha = .8; d.fillStyle = "#4E3420";
    for (let k = 0; k < 160; k++){ d.beginPath(); d.arc(rand(0, VW), rand(0, VH), rand(2, 7), 0, TAU); d.fill(); }
    d.restore();
    stepNo = 0; progress = 0; stickers = []; fade = null;
    cells.forEach(c => c.done = false); doneCount = 0;
  }

  function startGame(){
    $("intro").hidden = true; $("party").hidden = true;
    vIndex = 0; timers = []; parts = [];
    arrive();
  }
  function arrive(){
    newVehicle(vIndex);
    phase = "arrive"; vOff = -1; lock = true;
    sfx.arrive();
    later(RM ? .2 : 1.3, () => {
      phase = "wash"; lock = false; idleT = 0;
      say(`${veh.name} çamur olmuş! ${STAGES[0].say}`);
    });
  }

  function brush(x, y){
    if (phase !== "wash" || lock) return;
    const st = STAGES[stepNo], r = st.r;
    if (st.id === "sponge"){
      const dc = layers.dirt.getContext("2d");
      dc.save(); dc.globalCompositeOperation = "destination-out"; dc.beginPath(); dc.arc(x, y, r*.9, 0, TAU); dc.fill(); dc.restore();
      const fc = layers.foam.getContext("2d");
      fc.save(); fc.clip(mask);
      for (let k = 0; k < 3; k++){
        const bx = x + rand(-r*.7, r*.7), by = y + rand(-r*.7, r*.7), br = rand(8, 20);
        fc.fillStyle = "rgba(255,255,255,.92)"; fc.beginPath(); fc.arc(bx, by, br, 0, TAU); fc.fill();
        fc.strokeStyle = "rgba(150,200,240,.8)"; fc.lineWidth = 2; fc.stroke();
        fc.fillStyle = "rgba(255,255,255,.9)"; fc.beginPath(); fc.arc(bx - br*.35, by - br*.35, br*.25, 0, TAU); fc.fill();
      }
      fc.restore();
    } else if (st.id === "water"){
      for (const key of ["foam", "dirt"]){
        const c = layers[key].getContext("2d");
        c.save(); c.globalCompositeOperation = "destination-out"; c.beginPath(); c.arc(x, y, r, 0, TAU); c.fill(); c.restore();
      }
      if (!RM && Math.random() < .5){
        const gx = L.vx + x, gy = L.vy + y;
        parts.push({x:gx + rand(-20, 20), y:gy - r*.6, vx:rand(-60, 60), vy:rand(80, 220), life:.5, max:.5, r:rand(3, 6), c:"rgba(120,200,255,.8)", g:900});
      }
    } else {
      const c = layers.drops.getContext("2d");
      c.save(); c.globalCompositeOperation = "destination-out"; c.beginPath(); c.arc(x, y, r, 0, TAU); c.fill(); c.restore();
    }
    for (const c of cells){
      if (!c.done && (c.x - x)*(c.x - x) + (c.y - y)*(c.y - y) < r*r){ c.done = true; doneCount++; }
    }
    progress = doneCount/inside;
    if (soundT <= 0){ sfx[st.id](); soundT = .12; }
    idleT = 0;
    if (progress >= DONE_AT) finishStep();
  }

  function stroke(x0, y0, x1, y1){
    const dist = Math.hypot(x1 - x0, y1 - y0), n = Math.max(1, Math.ceil(dist/10));
    for (let i = 1; i <= n; i++) brush(x0 + (x1 - x0)*i/n, y0 + (y1 - y0)*i/n);
  }

  function finishStep(){
    lock = true;
    const st = STAGES[stepNo];
    const key = st.id === "sponge" ? "dirt" : st.id === "water" ? "foam" : "drops";
    fade = {key, t:0};
    if (st.id === "water") fade.also = "dirt";
    sfx.step();
    progress = 1;
    later(.6, () => {
      layers[key].getContext("2d").clearRect(0, 0, VW, VH);
      if (fade && fade.also) layers[fade.also].getContext("2d").clearRect(0, 0, VW, VH);
      layers.alpha = {dirt:1, foam:1, drops:1};
      fade = null;
      stepNo++;
      cells.forEach(c => c.done = false); doneCount = 0; progress = 0;
      if (stepNo === 2) sprinkleDrops();
      if (stepNo < STAGES.length){
        lock = false; idleT = 0;
        say(STAGES[stepNo].say);
      } else {
        phase = "stickers"; lock = false; idleT = 0;
        sfx.sparkle(); sparkles(12);
        say("Pırıl pırıl oldu! Çıkartma yapıştır, sonra kornaya bas!");
      }
    });
  }
  function sprinkleDrops(){
    const c = layers.drops.getContext("2d");
    c.save(); c.clip(mask);
    const probe = c;
    let n = 0;
    for (let k = 0; k < 400 && n < 90; k++){
      const x = rand(10, VW - 10), y = rand(10, VH - 10);
      if (!probe.isPointInPath(mask, x, y)) continue;
      n++;
      const r = rand(6, 13);
      c.fillStyle = "rgba(170,225,255,.75)"; c.beginPath(); c.ellipse(x, y, r*.8, r, 0, 0, TAU); c.fill();
      c.strokeStyle = "rgba(80,160,220,.6)"; c.lineWidth = 2; c.stroke();
      c.fillStyle = "rgba(255,255,255,.9)"; c.beginPath(); c.arc(x - r*.25, y - r*.35, r*.25, 0, TAU); c.fill();
    }
    c.restore();
  }
  function sparkles(n){
    for (let i = 0; i < n; i++){
      const c = cells[Math.random()*cells.length | 0];
      parts.push({x:L.vx + c.x, y:L.vy + c.y, vx:0, vy:-20, life:1.2, max:1.2, r:rand(10, 18), c:"#FFFFFF", star:true, rot:rand(0, TAU), g:0, delay:i*.06});
    }
  }

  function placeSticker(x, y){
    if (stickers.length >= 8) return;
    stickers.push({e:STICKERS[stickers.length % STICKERS.length], x, y, rot:rand(-.3, .3), pop:0});
    sfx.sticker(); idleT = 0;
    if (stickers.length === 3) say("Hazır olunca yeşil kornaya bas!");
  }
  function honk(){
    if (phase !== "stickers" || lock) return;
    lock = true; phase = "leave";
    sfx.horn(); say("Düt düt! Güle güle!");
    later(.6, () => { sfx.engine(); });
    later(RM ? .8 : 2, () => {
      vIndex++;
      if (vIndex < VEHICLES.length) arrive();
      else { phase = "party"; sfx.party(); say("Aferin Egemen! Bütün araçlar tertemiz!"); $("party").hidden = false; $("again").focus(); }
    });
  }

  /* ---------- giriş ---------- */
  cv.addEventListener("pointerdown", e => {
    e.preventDefault(); audio();
    const p = toLogical(e);
    if (phase === "stickers"){
      if (Math.hypot(p.x - L.horn.x, p.y - L.horn.y) < 70){ honk(); return; }
      const probe = document.createElement("canvas").getContext("2d");
      if (probe.isPointInPath(mask, p.x - L.vx, p.y - L.vy)) placeSticker(p.x - L.vx, p.y - L.vy);
      return;
    }
    if (phase !== "wash") return;
    cv.setPointerCapture(e.pointerId);
    pointer = {down:true, id:e.pointerId, x:p.x, y:p.y, lx:p.x - L.vx, ly:p.y - L.vy};
    brush(pointer.lx, pointer.ly);
  });
  cv.addEventListener("pointermove", e => {
    const p = toLogical(e);
    pointer.x = p.x; pointer.y = p.y;
    if (!pointer.down || e.pointerId !== pointer.id) return;
    const lx = p.x - L.vx, ly = p.y - L.vy;
    stroke(pointer.lx, pointer.ly, lx, ly);
    pointer.lx = lx; pointer.ly = ly;
  });
  const up = e => { if (e.pointerId === pointer.id) pointer.down = false; };
  cv.addEventListener("pointerup", up);
  cv.addEventListener("pointercancel", up);
  window.addEventListener("keydown", e => {
    if (e.key === " " && !e.repeat && (phase === "wash" || phase === "stickers")){
      e.preventDefault(); audio();
      if (phase === "stickers") honk(); else autoScrub = true;
    }
  });
  window.addEventListener("keyup", e => { if (e.key === " ") autoScrub = false; });

  $("play").addEventListener("click", () => { audio(); startGame(); });
  $("again").addEventListener("click", () => { audio(); startGame(); });
  document.addEventListener("visibilitychange", () => { if (document.hidden && canSpeak) speechSynthesis.cancel(); last = performance.now(); });

  /* ---------- güncelle ---------- */
  function update(dt){
    time += dt;
    for (let i = timers.length - 1; i >= 0; i--){ const tk = timers[i]; tk.t -= dt; if (tk.t <= 0){ timers.splice(i, 1); tk.fn(); } }
    soundT -= dt;
    if (phase === "arrive") vOff = Math.min(0, vOff + dt/(RM ? .2 : 1.2));
    if (phase === "leave") vOff = Math.min(2, vOff + dt*.9);
    if (fade){ fade.t += dt; layers.alpha[fade.key] = Math.max(0, 1 - fade.t/.5); if (fade.also) layers.alpha[fade.also] = layers.alpha[fade.key]; }
    if (autoScrub && phase === "wash" && !lock){
      // klavye yardımı: araç üzerinde zikzak çiz
      autoT += dt;
      const c = cells[Math.floor(autoT*14) % cells.length];
      const nx = c.x, ny = c.y;
      if (pointer.lx == null) { pointer.lx = nx; pointer.ly = ny; }
      stroke(pointer.lx, pointer.ly, nx, ny); pointer.lx = nx; pointer.ly = ny;
      pointer.x = L.vx + nx; pointer.y = L.vy + ny;
    }
    if (phase === "wash" || phase === "stickers"){
      idleT += dt;
      if (idleT > 10){ idleT = 0; say(phase === "wash" ? STAGES[stepNo].say : "Kornaya bas!"); }
    }
    for (const s of stickers) s.pop = Math.min(1, s.pop + dt*4);
    for (let i = parts.length - 1; i >= 0; i--){
      const p = parts[i];
      if (p.delay > 0){ p.delay -= dt; continue; }
      p.life -= dt; p.vy += (p.g || 0)*dt; p.x += p.vx*dt; p.y += p.vy*dt; if (p.rot !== undefined) p.rot += dt*3;
      if (p.life <= 0) parts.splice(i, 1);
    }
    if (phase === "stickers" && !RM && Math.random() < dt*3) sparkles(1);
  }

  /* ---------- çizim ---------- */
  function drawGarage(){
    const x0 = -view.ox/view.s - 2, x1 = W + view.ox/view.s + 2, y0 = -view.oy/view.s - 2, y1 = H + view.oy/view.s + 2;
    ctx.fillStyle = "#CFEFFF"; ctx.fillRect(x0, y0, x1 - x0, L.floor - y0);
    ctx.strokeStyle = "rgba(255,255,255,.8)"; ctx.lineWidth = 3;
    for (let y = L.floor - 60; y > y0; y -= 60){ ctx.beginPath(); ctx.moveTo(x0, y); ctx.lineTo(x1, y); ctx.stroke(); }
    for (let x = Math.floor(x0/80)*80; x < x1; x += 80) for (let y = L.floor; y > y0; y -= 120){ ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x, y - 60); ctx.stroke(); ctx.beginPath(); ctx.moveTo(x + 40, y - 60); ctx.lineTo(x + 40, y - 120); ctx.stroke(); }
    ctx.fillStyle = "#9AA7B5"; ctx.fillRect(x0, L.floor, x1 - x0, y1 - L.floor);
    ctx.fillStyle = "#FFD60A";
    for (let x = Math.floor(x0/120)*120; x < x1; x += 120) ctx.fillRect(x, L.floor + 70, 60, 10);
    ctx.fillStyle = "#6E7B89"; ctx.beginPath(); ctx.roundRect(W/2 - 60, L.floor + 26, 120, 18, 9); ctx.fill();
    // su damlası tabelası
    ctx.fillStyle = "#3DA5FF"; ctx.beginPath(); ctx.roundRect(W - 150, 20, 120, 60, 16); ctx.fill();
    ctx.fillStyle = "#FFFFFF"; ctx.beginPath(); ctx.moveTo(W - 90, 30); ctx.bezierCurveTo(W - 70, 55, W - 70, 70, W - 90, 72); ctx.bezierCurveTo(W - 110, 70, W - 110, 55, W - 90, 30); ctx.fill();
  }

  function drawVehicle(offX){
    const gx = L.vx + offX, gy = L.vy;
    ctx.save(); ctx.translate(gx, gy);
    const bounce = phase === "arrive" || phase === "leave" ? Math.sin(time*18)*2 : 0;
    ctx.translate(0, bounce);
    // gölge
    ctx.fillStyle = "rgba(0,0,0,.18)"; ctx.beginPath(); ctx.ellipse(VW/2, GROUND + 6, VW*.45, 16, 0, 0, TAU); ctx.fill();
    const body = new Path2D(); veh.body(body);
    ctx.fillStyle = veh.color; ctx.fill(body);
    ctx.lineWidth = 6; ctx.strokeStyle = veh.dark; ctx.stroke(body);
    veh.details(ctx);
    // tekerlekler
    const spin = phase === "arrive" || phase === "leave" ? time*12 : 0;
    for (const [x, y, r] of veh.wheels){
      ctx.fillStyle = "#2B2B36"; ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fill();
      ctx.fillStyle = "#C8D0DA"; ctx.beginPath(); ctx.arc(x, y, r*.45, 0, TAU); ctx.fill();
      ctx.strokeStyle = "#7A8594"; ctx.lineWidth = 4;
      for (let k = 0; k < 4; k++){ const a = spin + k*Math.PI/2; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + Math.cos(a)*r*.45, y + Math.sin(a)*r*.45); ctx.stroke(); }
    }
    // kir katmanları
    if (layers){
      for (const key of ["dirt", "foam", "drops"]){
        if (layers.alpha[key] <= 0) continue;
        ctx.globalAlpha = layers.alpha[key]; ctx.drawImage(layers[key], 0, 0); ctx.globalAlpha = 1;
      }
    }
    // gözler (çamurun üstünde kalsın, çocuk aracın yüzünü hep görsün)
    const [ex, ey] = veh.eyes, clean = phase === "stickers" || phase === "leave";
    for (const dx of [-24, 24]){
      ctx.fillStyle = "#FFFFFF"; ctx.beginPath(); ctx.ellipse(ex + dx, ey, 17, 21, 0, 0, TAU); ctx.fill();
      ctx.strokeStyle = INK; ctx.lineWidth = 3; ctx.stroke();
      if (clean){ ctx.lineWidth = 5; ctx.beginPath(); ctx.arc(ex + dx, ey + 6, 9, Math.PI*1.15, Math.PI*1.85); ctx.stroke(); }
      else {
        const blink = (time % 4) < .12;
        if (blink){ ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(ex + dx - 9, ey); ctx.lineTo(ex + dx + 9, ey); ctx.stroke(); }
        else { ctx.fillStyle = INK; ctx.beginPath(); ctx.arc(ex + dx + 3, ey + 3, 8, 0, TAU); ctx.fill(); ctx.fillStyle = "#fff"; ctx.beginPath(); ctx.arc(ex + dx + 6, ey, 3, 0, TAU); ctx.fill(); }
      }
    }
    // parlaklık
    if (clean){
      ctx.save(); ctx.clip(body);
      const sx = ((time*250) % (VW + 400)) - 200;
      const g = ctx.createLinearGradient(sx - 60, 0, sx + 60, 0);
      g.addColorStop(0, "rgba(255,255,255,0)"); g.addColorStop(.5, "rgba(255,255,255,.45)"); g.addColorStop(1, "rgba(255,255,255,0)");
      ctx.fillStyle = g; ctx.fillRect(sx - 60, 0, 120, VH);
      ctx.restore();
    }
    // çıkartmalar
    for (const s of stickers){
      const k = s.pop < 1 ? .4 + .6*s.pop + Math.sin(s.pop*Math.PI)*.3 : 1;
      ctx.save(); ctx.translate(s.x, s.y); ctx.rotate(s.rot); ctx.scale(k, k);
      ctx.fillStyle = "#FFFFFF"; ctx.beginPath(); ctx.arc(0, 0, 30, 0, TAU); ctx.fill();
      ctx.fillStyle = "#000"; ctx.font = `42px ${EMOJI_FONT}`; ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.fillText(s.e, 0, 2);
      ctx.restore();
    }
    ctx.restore();
  }

  function toolIcon(id, x, y, s, active){
    ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
    if (id === "sponge"){
      ctx.rotate(-.15);
      ctx.fillStyle = "#3FB950"; ctx.beginPath(); ctx.roundRect(-52, -38, 104, 22, 10); ctx.fill();
      ctx.fillStyle = "#FFD23F"; ctx.beginPath(); ctx.roundRect(-52, -22, 104, 58, 14); ctx.fill();
      ctx.fillStyle = "#E0A800"; [[-30, -2, 6], [0, 12, 8], [28, -4, 5], [-10, 22, 4], [34, 20, 6]].forEach(([a, b, r]) => { ctx.beginPath(); ctx.arc(a, b, r, 0, TAU); ctx.fill(); });
    } else if (id === "water"){
      ctx.fillStyle = "#2A64C0"; ctx.beginPath(); ctx.roundRect(-40, -22, 70, 34, 12); ctx.fill();
      ctx.beginPath(); ctx.roundRect(-30, 4, 24, 46, 10); ctx.fill();
      ctx.fillStyle = "#9BD4FF"; ctx.beginPath(); ctx.roundRect(26, -14, 26, 18, 6); ctx.fill();
      if (active && !RM){ ctx.strokeStyle = "rgba(120,200,255,.9)"; ctx.lineWidth = 4; for (let k = -1; k <= 1; k++){ ctx.beginPath(); ctx.moveTo(56, -5); ctx.lineTo(96, -5 + k*18 + Math.sin(time*30 + k)*3); ctx.stroke(); } }
    } else if (id === "towel"){
      ctx.rotate(.1);
      ctx.fillStyle = "#7CC6FE"; ctx.beginPath(); ctx.roundRect(-50, -34, 100, 68, 12); ctx.fill();
      ctx.fillStyle = "#FFFFFF"; ctx.fillRect(-50, -14, 100, 8); ctx.fillRect(-50, 8, 100, 8);
      ctx.fillStyle = "#5AA9E6"; ctx.beginPath(); ctx.roundRect(-50, 22, 100, 12, 6); ctx.fill();
    } else if (id === "sticker"){
      ctx.fillStyle = "#000"; ctx.font = `64px ${EMOJI_FONT}`; ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.fillText("⭐", 0, 4);
    }
    ctx.restore();
  }

  function drawHud(){
    // adımlar
    const ids = ["sponge", "water", "towel", "sticker"], cur = phase === "stickers" || phase === "leave" ? 3 : stepNo;
    ids.forEach((id, i) => {
      const x = L.icons.x + (i - 1.5)*110, y = L.icons.y, active = i === cur && phase !== "arrive";
      ctx.fillStyle = i < cur ? "#B7F0C4" : active ? "#FFFFFF" : "rgba(255,255,255,.55)";
      ctx.beginPath(); ctx.arc(x, y, 40, 0, TAU); ctx.fill();
      if (active && i < 3){
        ctx.strokeStyle = "rgba(42,37,64,.15)"; ctx.lineWidth = 8; ctx.beginPath(); ctx.arc(x, y, 40, 0, TAU); ctx.stroke();
        ctx.strokeStyle = "#2DB75A"; ctx.beginPath(); ctx.arc(x, y, 40, -Math.PI/2, -Math.PI/2 + TAU*Math.min(1, progress/DONE_AT)); ctx.stroke();
      }
      toolIcon(id, x, y, .5, false);
      if (i < cur){ ctx.strokeStyle = "#1E8A41"; ctx.lineWidth = 7; ctx.lineCap = "round"; ctx.beginPath(); ctx.moveTo(x + 14, y + 18); ctx.lineTo(x + 24, y + 28); ctx.lineTo(x + 42, y + 6); ctx.stroke(); ctx.lineCap = "butt"; }
    });
    // araç sayacı
    VEHICLES.forEach((v, i) => {
      const x = L.cars.x + (i - 2)*44, y = L.cars.y;
      ctx.fillStyle = i < vIndex ? v.color : i === vIndex ? "#FFFFFF" : "rgba(255,255,255,.5)";
      ctx.beginPath(); ctx.roundRect(x - 16, y - 8, 32, 16, 6); ctx.fill();
      ctx.fillStyle = i < vIndex ? INK : "rgba(42,37,64,.35)"; ctx.beginPath(); ctx.arc(x - 9, y + 9, 5, 0, TAU); ctx.arc(x + 9, y + 9, 5, 0, TAU); ctx.fill();
    });
  }

  function draw(){
    const d = view.dpr;
    ctx.setTransform(d, 0, 0, d, 0, 0);
    ctx.clearRect(0, 0, cv.width, cv.height);
    ctx.save(); ctx.translate(view.ox, view.oy); ctx.scale(view.s, view.s);
    drawGarage();
    if (veh){
      // gelişte soldan kayarak girer, gidişte sağdan çıkar
      const off = phase === "arrive" ? -ease(-vOff)*(L.vx + VW + 80) : phase === "leave" ? ease(Math.min(1, vOff))*(W - L.vx + 80) : 0;
      drawVehicle(off);
      if (phase !== "intro") drawHud();
    }
    // su damlaları ve parıltılar
    for (const p of parts){
      if (p.delay > 0) continue;
      ctx.globalAlpha = clamp(p.life/p.max*1.5, 0, 1);
      if (p.star){
        ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.rot); ctx.fillStyle = p.c;
        ctx.beginPath(); for (let i = 0; i < 8; i++){ const a = i*Math.PI/4, r = i % 2 ? p.r*.3 : p.r; i ? ctx.lineTo(Math.cos(a)*r, Math.sin(a)*r) : ctx.moveTo(Math.cos(a)*r, Math.sin(a)*r); } ctx.closePath(); ctx.fill();
        ctx.restore();
      } else { ctx.fillStyle = p.c; ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, TAU); ctx.fill(); }
    }
    ctx.globalAlpha = 1;
    if (phase === "wash"){
      const st = STAGES[stepNo];
      if (pointer.down || autoScrub) toolIcon(st.id, pointer.x, pointer.y, 1.1, true);
      else {
        // araç üstünde ipucu: gidip gelen alet
        const hx = L.vx + VW/2 + Math.sin(time*2.2)*170, hy = L.vy + 200 + Math.sin(time*4.4)*30;
        ctx.globalAlpha = idleT > 2 || (stepNo === 0 && vIndex === 0 && progress < .05) ? .85 : 0;
        if (ctx.globalAlpha) toolIcon(st.id, hx, hy, 1, false);
        ctx.globalAlpha = 1;
      }
    }
    if (phase === "stickers"){
      // yeşil korna
      const pulse = RM ? 1 : 1 + Math.sin(time*5)*.06, h = L.horn;
      ctx.save(); ctx.translate(h.x, h.y); ctx.scale(pulse, pulse);
      ctx.fillStyle = "#1E8A41"; ctx.beginPath(); ctx.arc(0, 6, 62, 0, TAU); ctx.fill();
      ctx.fillStyle = "#2DB75A"; ctx.beginPath(); ctx.arc(0, 0, 62, 0, TAU); ctx.fill();
      ctx.strokeStyle = "#fff"; ctx.lineWidth = 6; ctx.stroke();
      ctx.fillStyle = "#FFFFFF"; ctx.beginPath(); ctx.moveTo(-30, -14); ctx.lineTo(-8, -14); ctx.lineTo(22, -34); ctx.lineTo(22, 34); ctx.lineTo(-8, 14); ctx.lineTo(-30, 14); ctx.closePath(); ctx.fill();
      ctx.strokeStyle = "#FFFFFF"; ctx.lineWidth = 5; ctx.lineCap = "round";
      ctx.beginPath(); ctx.arc(24, 0, 20, -.7, .7); ctx.stroke(); ctx.beginPath(); ctx.arc(24, 0, 34, -.7, .7); ctx.stroke();
      ctx.restore();
      // çıkartma tepsisi ipucu
      const nx = stickers.length % STICKERS.length;
      ctx.fillStyle = "rgba(255,255,255,.85)"; ctx.beginPath(); ctx.arc(L.tray.x, L.tray.y, 44, 0, TAU); ctx.fill();
      ctx.fillStyle = "#000"; ctx.font = `50px ${EMOJI_FONT}`; ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.fillText(STICKERS[nx], L.tray.x, L.tray.y + 3);
    }
    ctx.restore();
  }

  let last = performance.now();
  function frame(now){
    const dt = Math.min(.05, Math.max(0, (now - last)/1000)); last = now;
    update(dt); draw();
    requestAnimationFrame(frame);
  }

  if (!CanvasRenderingContext2D.prototype.roundRect){
    const rrPoly = function(x, y, w, h, r){
      r = Math.min(r, w/2, h/2);
      this.moveTo(x + r, y); this.arcTo(x + w, y, x + w, y + h, r); this.arcTo(x + w, y + h, x, y + h, r);
      this.arcTo(x, y + h, x, y, r); this.arcTo(x, y, x + w, y, r); this.closePath();
    };
    CanvasRenderingContext2D.prototype.roundRect = rrPoly;
    if (window.Path2D && !Path2D.prototype.roundRect) Path2D.prototype.roundRect = rrPoly;
  }
  if ("ResizeObserver" in window) new ResizeObserver(resize).observe(stage);
  else window.addEventListener("resize", resize);
  resize();
  newVehicle(0);
  requestAnimationFrame(frame);
})();
