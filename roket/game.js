/* Roket Atölyesi — 5 yaş için: roketini yap, fırlat, yıldız topla, gezegene kon */
(function(){
  "use strict";

  const COLORS = [
    {hex:"#FF5A5F", dark:"#C7373C", name:"kırmızı"},
    {hex:"#FF9F1C", dark:"#C77200", name:"turuncu"},
    {hex:"#FFD23F", dark:"#C9A000", name:"sarı"},
    {hex:"#3BCE7A", dark:"#23965A", name:"yeşil"},
    {hex:"#3D8BFD", dark:"#2261C4", name:"mavi"},
    {hex:"#A66CFF", dark:"#7A45D1", name:"mor"}
  ];
  const PARTS = {
    nose:    {count:3, say:["sivri burun", "yuvarlak burun", "yıldızlı burun"]},
    color:   {count:6, say:COLORS.map(c => c.name)},
    fins:    {count:3, say:["üçgen kanat", "yuvarlak kanat", "uzun kanat"]},
    window:  {count:3, say:["bir pencere", "üç pencere", "astronot"]},
    pattern: {count:3, say:["düz", "çizgili", "benekli"]}
  };
  const DEST = [
    {name:"Ay",     dat:"Ay'a",     need:5,  rocks:0,   sky:"#9AA3B5", ground:"#C9CED8", crater:"#AEB5C4"},
    {name:"Mars",   dat:"Mars'a",   need:8,  rocks:.28, sky:"#3A1712", ground:"#D2643C", crater:"#B24E2B"},
    {name:"Satürn", dat:"Satürn'e", need:10, rocks:.4,  sky:"#2A2140", ground:"#E8C27A", crater:"#CFA45A"}
  ];
  const NUMS = ["", "bir", "iki", "üç", "dört", "beş", "altı", "yedi", "sekiz", "dokuz", "on"];
  const ASSIST_AFTER = 4.5;                 // bu kadar saniye yıldız yakalanmazsa sıradaki roketin üstüne düşer
  const SPEC_KEY = "roket-tasarim", ALBUM_KEY = "roket-album", SOUND_KEY = "roket-ses";
  const RM = window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches;
  const TAU = Math.PI*2;

  const $ = id => document.getElementById(id);
  const stage = $("stage"), cv = $("cv"), ctx = cv.getContext("2d");
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const rand = (a, b) => a + Math.random()*(b - a);

  let spec = {nose:0, color:0, fins:0, window:0, pattern:0};
  try { const s = JSON.parse(localStorage.getItem(SPEC_KEY) || "null"); if (s) Object.keys(spec).forEach(k => { if (s[k] >= 0 && s[k] < PARTS[k].count) spec[k] = s[k] | 0; }); } catch(e) {}
  let album = [0, 0, 0];
  try { const a = JSON.parse(localStorage.getItem(ALBUM_KEY) || "null"); if (Array.isArray(a) && a.length === 3) album = a.map(v => Math.max(0, v | 0)); } catch(e) {}
  let soundOn = true;
  try { soundOn = localStorage.getItem(SOUND_KEY) !== "0"; } catch(e) {}
  let dest = 0, part = "nose";

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
    g.gain.setValueAtTime(.0001, n); g.gain.exponentialRampToValueAtTime(vol || .1, n + .01); g.gain.exponentialRampToValueAtTime(.0001, n + dur);
    o.connect(g).connect(a.destination); o.start(n); o.stop(n + dur + .05);
  }
  function noise(dur, freq, vol, type){
    const a = audio(); if (!a || !soundOn) return;
    const len = Math.floor(a.sampleRate*dur), buf = a.createBuffer(1, len, a.sampleRate), d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = (Math.random()*2 - 1)*Math.pow(1 - i/len, 1.2);
    const s = a.createBufferSource(); s.buffer = buf;
    const f = a.createBiquadFilter(); f.type = type || "bandpass"; f.frequency.value = freq;
    const g = a.createGain(); g.gain.value = vol;
    s.connect(f).connect(g).connect(a.destination); s.start();
  }
  const sfx = {
    pick(){ tone(660, .08, "triangle", .07, 990); },
    beep(){ tone(880, .12, "sine", .08); },
    blast(){ noise(2.2, 160, .5, "lowpass"); tone(70, 1.6, "sawtooth", .06, 140); },
    star(n){ tone(660 + n*60, .14, "triangle", .09, 1200 + n*60); },
    bonk(){ tone(180, .16, "square", .05, 110); noise(.12, 500, .15, "lowpass"); },
    land(){ noise(.5, 240, .3, "lowpass"); },
    win(){ [523.25, 659.25, 784, 1046.5, 1318.5].forEach((f, i) => tone(f, .28, "triangle", .12, null, i*.12)); }
  };
  const canSpeak = "speechSynthesis" in window;
  let trVoice = null;
  function pickVoice(){ trVoice = speechSynthesis.getVoices().find(v => /^tr(-|_|$)/i.test(v.lang)) || null; }
  if (canSpeak){ pickVoice(); if (speechSynthesis.addEventListener) speechSynthesis.addEventListener("voiceschanged", pickVoice); }
  function say(text){
    if (!canSpeak || !soundOn || !trVoice) return;
    speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text); u.voice = trVoice; u.lang = trVoice.lang; u.rate = .98; u.pitch = 1.15;
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

  /* ---------- roket çizimi (yerel ölçü: gövde 60×130, merkez 0,0) ---------- */
  function drawRocket(c, x, y, s, sp, opt){
    opt = opt || {};
    const col = COLORS[sp.color], accent = COLORS[(sp.color + 3) % COLORS.length];
    c.save();
    c.translate(x, y); c.rotate(opt.tilt || 0); c.scale(s, s);
    // alev
    if (opt.flame){
      const f = opt.flame, flick = 1 + Math.sin(Date.now()/40)*.12;
      c.fillStyle = "#FF9F1C";
      c.beginPath(); c.moveTo(-18, 62); c.quadraticCurveTo(0, 62 + 90*f*flick, 18, 62); c.fill();
      c.fillStyle = "#FFE066";
      c.beginPath(); c.moveTo(-10, 62); c.quadraticCurveTo(0, 62 + 55*f*flick, 10, 62); c.fill();
    }
    // kanatlar
    c.fillStyle = accent.hex;
    [-1, 1].forEach(side => {
      c.save(); c.scale(side, 1);
      c.beginPath();
      if (sp.fins === 0){ c.moveTo(28, 10); c.lineTo(58, 66); c.lineTo(28, 58); }
      else if (sp.fins === 1){ c.moveTo(28, 14); c.quadraticCurveTo(66, 30, 56, 70); c.lineTo(28, 58); }
      else { c.moveTo(28, -20); c.lineTo(50, 40); c.lineTo(62, 78); c.lineTo(28, 56); }
      c.closePath(); c.fill();
      c.restore();
    });
    // gövde
    c.fillStyle = col.hex;
    c.beginPath(); c.roundRect(-30, -62, 60, 124, [24, 24, 12, 12]); c.fill();
    // desen
    c.save();
    c.beginPath(); c.roundRect(-30, -62, 60, 124, [24, 24, 12, 12]); c.clip();
    if (sp.pattern === 1){
      c.fillStyle = "rgba(255,255,255,.55)";
      [-26, 18, 42].forEach(yy => c.fillRect(-30, yy, 60, 8));
    } else if (sp.pattern === 2){
      c.fillStyle = "rgba(255,255,255,.5)";
      [[-16, -34], [14, -18], [-12, 10], [16, 30], [-6, 46]].forEach(([dx, dy]) => { c.beginPath(); c.arc(dx, dy, 5, 0, TAU); c.fill(); });
    }
    c.fillStyle = "rgba(0,0,0,.12)";
    c.fillRect(12, -62, 18, 124);
    c.restore();
    // burun
    c.fillStyle = accent.hex;
    c.beginPath();
    if (sp.nose === 0){ c.moveTo(-30, -52); c.quadraticCurveTo(-26, -100, 0, -128); c.quadraticCurveTo(26, -100, 30, -52); }
    else if (sp.nose === 1){ c.moveTo(-30, -52); c.bezierCurveTo(-30, -112, 30, -112, 30, -52); }
    else {
      c.moveTo(-30, -52); c.quadraticCurveTo(-24, -92, 0, -104); c.quadraticCurveTo(24, -92, 30, -52);
    }
    c.closePath(); c.fill();
    if (sp.nose === 2){                                        // tepede yıldız
      c.fillStyle = "#FFE066";
      c.beginPath();
      for (let i = 0; i < 10; i++){
        const a = -Math.PI/2 + i*Math.PI/5, r = i % 2 ? 7 : 16;
        i ? c.lineTo(Math.cos(a)*r, -112 + Math.sin(a)*r) : c.moveTo(Math.cos(a)*r, -112 + Math.sin(a)*r);
      }
      c.closePath(); c.fill();
    }
    // pencere
    const port = (py, r) => {
      c.fillStyle = "#E9EEF8"; c.beginPath(); c.arc(0, py, r + 4, 0, TAU); c.fill();
      c.fillStyle = "#8ED3FF"; c.beginPath(); c.arc(0, py, r, 0, TAU); c.fill();
      c.fillStyle = "rgba(255,255,255,.7)"; c.beginPath(); c.arc(-r*.35, py - r*.35, r*.28, 0, TAU); c.fill();
    };
    if (sp.window === 0) port(-18, 15);
    else if (sp.window === 1){ port(-36, 9); port(-10, 9); port(16, 9); }
    else {
      port(-16, 17);
      c.fillStyle = "#FFD9B8"; c.beginPath(); c.arc(0, -13, 10, 0, TAU); c.fill();           // yüz
      c.fillStyle = "#3A2A20";
      c.beginPath(); c.arc(-4, -15, 1.8, 0, TAU); c.arc(4, -15, 1.8, 0, TAU); c.fill();
      c.strokeStyle = "#3A2A20"; c.lineWidth = 1.6;
      c.beginPath(); c.arc(0, -11, 4, .2*Math.PI, .8*Math.PI); c.stroke();
    }
    c.restore();
  }

  /* ---------- atölye ---------- */
  function renderOptions(){
    const box = $("options");
    box.innerHTML = "";
    for (let i = 0; i < PARTS[part].count; i++){
      const b = document.createElement("button");
      b.type = "button"; b.className = "opt" + (spec[part] === i ? " on" : "");
      b.setAttribute("aria-label", PARTS[part].say[i]);
      const c = document.createElement("canvas");
      c.width = 132; c.height = 132;
      b.appendChild(c);
      const cx = c.getContext("2d");
      const preview = Object.assign({}, spec, {[part]:i});
      drawRocket(cx, 66, 78, .38, preview);
      b.addEventListener("click", () => { audio(); setPart(part, i); });
      box.appendChild(b);
    }
    document.querySelectorAll(".tab").forEach(t => t.classList.toggle("on", t.dataset.part === part));
    document.querySelectorAll(".planet").forEach(p => p.classList.toggle("on", +p.dataset.dest === dest));
  }
  function setPart(k, i){
    if (!PARTS[k] || i < 0 || i >= PARTS[k].count) return false;
    spec[k] = i;
    try { localStorage.setItem(SPEC_KEY, JSON.stringify(spec)); } catch(e) {}
    sfx.pick(); say(PARTS[k].say[i]);
    G.pop = 1;
    renderOptions();
    return true;
  }
  document.querySelectorAll(".tab").forEach(t => t.addEventListener("click", () => { audio(); sfx.pick(); part = t.dataset.part; renderOptions(); }));
  document.querySelectorAll(".planet").forEach(p => p.addEventListener("click", () => {
    audio(); sfx.pick(); dest = +p.dataset.dest; say(DEST[dest].name); renderOptions();
  }));
  function renderAlbum(){ $("album").textContent = `🌙 ${album[0]} · 🔴 ${album[1]} · 🪐 ${album[2]}`; }

  /* ---------- durum ---------- */
  let G = null, W = 1000, H = 620, timers = [];
  const later = (s, fn) => timers.push({t:s, fn});
  const clearTimers = () => { timers = []; };

  function toBuild(){
    clearTimers();
    G = {state:"build", t:0, pop:0, rise:0, x:W/2, tx:W/2, stars:[], rocks:[], got:0, spawn:0, rockT:2, since:0,
         wobble:0, puffs:[], sparks:[], land:0, bg:makeBg(), flagT:0};
    $("workshop").hidden = false; $("landed").hidden = true; $("countdown").hidden = true;
    renderOptions(); renderAlbum();
  }

  function makeBg(){
    const out = [];
    for (let i = 0; i < 90; i++) out.push({x:Math.random(), y:Math.random(), z:rand(.3, 1)});
    return out;
  }

  function launch(){
    if (G.state !== "build") return false;
    clearTimers();
    G.state = "count"; G.t = 0;
    $("workshop").hidden = true;
    const cd = $("countdown");
    [5, 4, 3, 2, 1].forEach((n, k) => later(k, () => {
      cd.hidden = false; cd.textContent = n;
      cd.style.animation = "none"; void cd.offsetWidth; cd.style.animation = "";
      sfx.beep(); say(NUMS[n]);
    }));
    later(5, () => {
      cd.textContent = "Kalkış!"; sfx.blast(); say("Kalkış!");
      G.state = "rise"; G.rise = 0;
    });
    later(6.2, () => { cd.hidden = true; });
    return true;
  }

  function startFly(){
    G.state = "fly"; G.t = 0; G.got = 0; G.stars = []; G.rocks = []; G.spawn = .6; G.rockT = 2.5; G.since = 0;
    G.x = W/2; G.tx = W/2;
  }

  const rocketY = () => H - Math.min(170, H*.26);

  function spawnStar(atRocket){
    const m = 70;
    const x = atRocket ? clamp(G.x, m, W - m) : rand(m, W - m);
    G.stars.push({x, y:-40, r:26, rot:rand(0, TAU)});
  }
  function spawnRock(){
    const m = 60;
    let x = rand(m, W - m);
    if (Math.abs(x - G.x) < 90 && G.since > ASSIST_AFTER - 1) x = clamp(G.x + (Math.random() < .5 ? -180 : 180), m, W - m);
    G.rocks.push({x, y:-60, r:rand(26, 38), rot:rand(0, TAU), spin:rand(-2, 2), vx:rand(-30, 30)});
  }

  function catchStar(s){
    G.got++; G.since = 0;
    sfx.star(G.got); say(NUMS[G.got] || String(G.got));
    burst(s.x, s.y, "#FFE066");
    if (G.got >= DEST[dest].need){
      G.state = "arrive"; G.t = 0;
      later(1.2, () => { G.state = "land"; G.land = 0; });
    }
  }

  function burst(x, y, col){
    if (RM) return;
    for (let i = 0; i < 14; i++){
      const a = rand(0, TAU), v = rand(60, 260);
      G.sparks.push({x, y, vx:Math.cos(a)*v, vy:Math.sin(a)*v, life:rand(.4, .9), max:.9, col});
    }
  }

  function landed(){
    G.state = "landed"; G.flagT = 0;
    album[dest]++;
    try { localStorage.setItem(ALBUM_KEY, JSON.stringify(album)); } catch(e) {}
    renderAlbum();
    sfx.win(); say(DEST[dest].dat + " vardık!");
    for (let i = 0; i < 40; i++) burst(rand(0, W), rand(0, H*.5), COLORS[i % COLORS.length].hex);
    $("landed").hidden = false;
  }

  /* ---------- güncelleme ---------- */
  function update(dt){
    if (!G) return;
    G.t += dt;
    if (timers.length){
      const due = [];
      for (const t of timers) if ((t.t -= dt) <= 0) due.push(t);
      if (due.length){ timers = timers.filter(t => t.t > 0); due.forEach(t => t.fn()); }
    }
    if (G.pop > 0) G.pop = Math.max(0, G.pop - dt*3);
    for (let i = G.sparks.length - 1; i >= 0; i--){
      const s = G.sparks[i];
      s.x += s.vx*dt; s.y += s.vy*dt; s.vy += 300*dt; s.life -= dt;
      if (s.life <= 0) G.sparks.splice(i, 1);
    }
    for (let i = G.puffs.length - 1; i >= 0; i--){
      const p = G.puffs[i];
      p.x += p.vx*dt; p.y += p.vy*dt; p.r += 30*dt; p.life -= dt;
      if (p.life <= 0) G.puffs.splice(i, 1);
    }
    if (G.state === "count" && !RM && Math.random() < dt*14) G.puffs.push(puff());
    if (G.state === "rise"){
      G.rise += dt;
      if (!RM) for (let k = 0; k < 3; k++) G.puffs.push(puff());
      if (G.rise >= 2.2) startFly();
    }
    if (G.state === "fly" || G.state === "arrive") fly(dt);
    if (G.state === "land"){
      G.land += dt;
      if (G.land >= 2.4){ sfx.land(); landed(); }
    }
    if (G.state === "landed") G.flagT = Math.min(1, G.flagT + dt*1.5);
  }

  function puff(){
    const px = W/2 + rand(-40, 40), py = padY() + 10;
    return {x:px, y:py, vx:rand(-90, 90), vy:rand(-20, 30), r:rand(14, 26), life:rand(.8, 1.6), max:1.6};
  }
  const padY = () => H - 70;

  function fly(dt){
    const D = DEST[dest];
    // roket parmağı yumuşakça izler
    G.x += (clamp(G.tx, 60, W - 60) - G.x)*Math.min(1, dt*6);
    if (G.wobble > 0) G.wobble = Math.max(0, G.wobble - dt);
    const fall = H*.30;
    if (G.state === "fly"){
      G.since += dt;
      G.spawn -= dt;
      if (G.spawn <= 0){
        spawnStar(G.since > ASSIST_AFTER);
        G.spawn = rand(.9, 1.4);
      }
      if (D.rocks > 0){
        G.rockT -= dt;
        if (G.rockT <= 0){ spawnRock(); G.rockT = rand(1.6, 2.6)/(D.rocks*2.5); }
      }
    }
    const ry = rocketY();
    for (let i = G.stars.length - 1; i >= 0; i--){
      const s = G.stars[i];
      s.y += fall*dt; s.rot += dt;
      if (G.state === "fly" && Math.hypot(s.x - G.x, s.y - (ry - 40)) < s.r + 44){ G.stars.splice(i, 1); catchStar(s); continue; }
      if (s.y > H + 60) G.stars.splice(i, 1);
    }
    for (let i = G.rocks.length - 1; i >= 0; i--){
      const r = G.rocks[i];
      r.y += fall*1.15*dt; r.x += r.vx*dt; r.rot += r.spin*dt;
      if (G.wobble <= 0 && Math.hypot(r.x - G.x, r.y - (ry - 20)) < r.r + 34){
        G.wobble = .6; sfx.bonk();
        r.vx = (r.x < G.x ? -1 : 1)*260;                        // taş kenara savrulur, hiçbir şey kaybedilmez
      }
      if (r.y > H + 80 || r.x < -80 || r.x > W + 80) G.rocks.splice(i, 1);
    }
  }

  /* ---------- çizim ---------- */
  function sky(topCol, botCol){
    const g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, topCol); g.addColorStop(1, botCol);
    ctx.fillStyle = g;
    ctx.fillRect(-view.ox/view.s - 2, -view.oy/view.s - 2, W + 2*view.ox/view.s + 4, H + 2*view.oy/view.s + 4);
  }
  function starfield(speed){
    const top = -view.oy/view.s, span = H + 2*view.oy/view.s;   // kenar boşlukları dahil görünen yükseklik
    ctx.fillStyle = "#fff";
    G.bg.forEach(b => {
      const y = top + ((b.y*span + G.t*speed*b.z) % span + span) % span;
      ctx.globalAlpha = .35 + b.z*.6;
      ctx.fillRect(b.x*W, y, 2*b.z + .5, (speed > 0 ? 2 + speed*.02*b.z : 2*b.z + .5));
    });
    ctx.globalAlpha = 1;
  }
  function drawStar(x, y, r, rot){
    ctx.save(); ctx.translate(x, y); ctx.rotate(rot);
    ctx.fillStyle = "#FFE066";
    ctx.beginPath();
    for (let i = 0; i < 10; i++){
      const a = -Math.PI/2 + i*Math.PI/5, rr = i % 2 ? r*.45 : r;
      i ? ctx.lineTo(Math.cos(a)*rr, Math.sin(a)*rr) : ctx.moveTo(Math.cos(a)*rr, Math.sin(a)*rr);
    }
    ctx.closePath(); ctx.fill();
    ctx.restore();
  }
  function drawRock(r){
    ctx.save(); ctx.translate(r.x, r.y); ctx.rotate(r.rot);
    ctx.fillStyle = "#7C6A5E";
    ctx.beginPath();
    for (let i = 0; i < 9; i++){
      const a = i*TAU/9, rr = r.r*(.8 + .2*Math.sin(i*2.3));
      i ? ctx.lineTo(Math.cos(a)*rr, Math.sin(a)*rr) : ctx.moveTo(Math.cos(a)*rr, Math.sin(a)*rr);
    }
    ctx.closePath(); ctx.fill();
    ctx.fillStyle = "#5E4F45";
    ctx.beginPath(); ctx.arc(-r.r*.25, -r.r*.1, r.r*.22, 0, TAU); ctx.arc(r.r*.3, r.r*.25, r.r*.15, 0, TAU); ctx.fill();
    ctx.restore();
  }
  function drawPad(){
    ctx.fillStyle = "#3BA55C"; ctx.fillRect(-view.ox/view.s - 2, H - 50, W + 2*view.ox/view.s + 4, 60 + view.oy/view.s);
    ctx.fillStyle = "#6B7280"; ctx.fillRect(W/2 - 90, padY(), 180, 22);
    ctx.fillStyle = "#4B5563"; ctx.fillRect(W/2 - 80, padY() + 22, 20, 30); ctx.fillRect(W/2 + 60, padY() + 22, 20, 30);
  }
  function drawSurface(D){
    const gy = H - Math.min(150, H*.24);
    const x0 = -view.ox/view.s - 40, x1 = W + view.ox/view.s + 40;   // kenar boşluklarına da taşsın
    ctx.fillStyle = D.ground;
    ctx.beginPath(); ctx.moveTo(x0, gy);
    for (let x = x0; x <= x1; x += 40) ctx.lineTo(x, gy + Math.sin(x/90)*8);
    ctx.lineTo(x1, H + view.oy/view.s + 2); ctx.lineTo(x0, H + view.oy/view.s + 2); ctx.closePath(); ctx.fill();
    ctx.fillStyle = D.crater;
    [[.2, 40], [.55, 60], [.82, 36]].forEach(([fx, w]) => { ctx.beginPath(); ctx.ellipse(W*fx, gy + 50, w, w*.3, 0, 0, TAU); ctx.fill(); });
    return gy;
  }
  function drawBigPlanet(D){
    // gökyüzünde uzak dünya ya da halkalı gezegen
    if (dest === 2){
      ctx.strokeStyle = "rgba(232,194,122,.7)"; ctx.lineWidth = 10;
      ctx.beginPath(); ctx.ellipse(W*.78, H*.22, 120, 26, -.3, 0, TAU); ctx.stroke();
    }
    ctx.fillStyle = dest === 0 ? "#3D8BFD" : "#F5F1E8";
    ctx.beginPath(); ctx.arc(W*.78, H*.22, dest === 0 ? 46 : 22, 0, TAU); ctx.fill();
    if (dest === 0){ ctx.fillStyle = "#3BCE7A"; ctx.beginPath(); ctx.arc(W*.78 - 12, H*.22 - 8, 16, 0, TAU); ctx.arc(W*.78 + 18, H*.22 + 14, 10, 0, TAU); ctx.fill(); }
  }

  function draw(){
    if (!G) return;
    const d = view.dpr;
    ctx.setTransform(d, 0, 0, d, 0, 0);
    ctx.clearRect(0, 0, cv.width, cv.height);
    ctx.save(); ctx.translate(view.ox, view.oy); ctx.scale(view.s, view.s);
    const st = G.state;
    if (st === "build" || st === "count" || st === "rise"){
      const k = st === "rise" ? clamp(G.rise/2.2, 0, 1) : 0;
      sky(mix("#5FB6F0", "#0E1433", k), mix("#CDEBFF", "#1C2554", k));
      if (k > .3){ ctx.globalAlpha = (k - .3)/.7; starfield(0); ctx.globalAlpha = 1; }
      ctx.save(); ctx.translate(0, k*H*.9); drawPad(); ctx.restore();
      G.puffs.forEach(p => { ctx.globalAlpha = clamp(p.life/p.max, 0, 1)*.8; ctx.fillStyle = "#F3F4F6"; ctx.beginPath(); ctx.arc(p.x, p.y + k*H*.9, p.r, 0, TAU); ctx.fill(); });
      ctx.globalAlpha = 1;
      const riseY = st === "rise" ? Math.pow(G.rise/2.2, 2)*H*.55 : 0;
      const shake = st === "count" && G.t > 3.5 && !RM ? rand(-2, 2) : 0;
      const s = Math.min(1.25, H/520)*(1 + G.pop*.12);
      drawRocket(ctx, W/2 + shake, padY() - 78*s - riseY, s, spec, {flame:st === "rise" ? 1 : (st === "count" && G.t > 4 ? .4 : 0)});
    } else if (st === "fly" || st === "arrive"){
      sky("#0E1433", "#1C2554");
      starfield(260);
      G.stars.forEach(s => drawStar(s.x, s.y, s.r, s.rot));
      G.rocks.forEach(drawRock);
      const ry = rocketY();
      drawRocket(ctx, G.x, ry - 60, .7, spec, {flame:1, tilt:clamp((G.tx - G.x)/300, -.3, .3) + (G.wobble > 0 ? Math.sin(G.t*40)*.15 : 0)});
      // ilerleme: toplanacak yıldızlar
      const need = DEST[dest].need, sz = 22, gap = 6, total = need*(sz + gap) - gap;
      for (let i = 0; i < need; i++){
        const x = W/2 - total/2 + i*(sz + gap) + sz/2;
        ctx.globalAlpha = i < G.got ? 1 : .25;
        drawStar(x, -view.oy/view.s + 28, sz/2, 0);
      }
      ctx.globalAlpha = 1;
      if (st === "arrive"){ ctx.fillStyle = `rgba(255,255,255,${clamp(G.t/1.2, 0, 1)})`; ctx.fillRect(-view.ox/view.s - 2, -view.oy/view.s - 2, W + 2*view.ox/view.s + 4, H + 2*view.oy/view.s + 4); }
    } else {
      const D = DEST[dest];
      sky(D.sky, "#0B1030");
      starfield(0);
      drawBigPlanet(D);
      const gy = drawSurface(D);
      const k = st === "land" ? clamp(G.land/2.4, 0, 1) : 1;
      const ease = 1 - Math.pow(1 - k, 3);
      const s = Math.min(1, H/600);
      const restY = gy - 66*s - 4;
      drawRocket(ctx, W*.4, -200 + (restY + 200)*ease, s, spec, {flame:k < 1 ? .6 : 0});
      if (st === "landed"){
        // astronot ve bayrak
        const fx = W*.4 + 150*s, fy = gy;
        const f = G.flagT;
        ctx.strokeStyle = "#E5E7EB"; ctx.lineWidth = 5;
        ctx.beginPath(); ctx.moveTo(fx + 60*s, fy); ctx.lineTo(fx + 60*s, fy - 110*s*f); ctx.stroke();
        ctx.fillStyle = COLORS[spec.color].hex;
        ctx.fillRect(fx + 60*s, fy - 110*s*f, 60*s*f, 38*s*f);
        ctx.fillStyle = "#fff";
        ctx.beginPath(); ctx.arc(fx, fy - 42*s, 22*s, 0, TAU); ctx.fill();                 // kask
        ctx.fillStyle = "#1F2937"; ctx.beginPath(); ctx.arc(fx + 4*s, fy - 44*s, 13*s, 0, TAU); ctx.fill();
        ctx.fillStyle = "#fff"; ctx.beginPath(); ctx.roundRect(fx - 18*s, fy - 24*s, 36*s, 24*s, 8*s); ctx.fill();
      }
      if (st === "land" && G.land < .5){ ctx.fillStyle = `rgba(255,255,255,${1 - G.land/.5})`; ctx.fillRect(-view.ox/view.s - 2, -view.oy/view.s - 2, W + 2*view.ox/view.s + 4, H + 2*view.oy/view.s + 4); }
    }
    G.sparks.forEach(s => {
      ctx.globalAlpha = clamp(s.life/s.max, 0, 1); ctx.fillStyle = s.col;
      ctx.beginPath(); ctx.arc(s.x, s.y, 4, 0, TAU); ctx.fill();
    });
    ctx.globalAlpha = 1;
    ctx.restore();
  }
  function mix(a, b, k){
    const pa = [1, 3, 5].map(i => parseInt(a.substr(i, 2), 16)), pb = [1, 3, 5].map(i => parseInt(b.substr(i, 2), 16));
    return "rgb(" + pa.map((v, i) => Math.round(v + (pb[i] - v)*k)).join(",") + ")";
  }

  /* ---------- giriş ---------- */
  const view = {s:1, ox:0, oy:0, dpr:1};
  function resize(){
    const r = stage.getBoundingClientRect();
    view.dpr = Math.min(window.devicePixelRatio || 1, 2);
    cv.width = Math.round(r.width*view.dpr); cv.height = Math.round(r.height*view.dpr);
    if (r.width > 0 && r.height > 0){
      const portrait = r.height > r.width*1.05;
      const nW = portrait ? 600 : 1000, nH = portrait ? 900 : 620;
      if (G && (nW !== W || nH !== H)){                          // yön değiştiyse konumları oranla taşı
        const fx = nW/W, fy = nH/H;
        G.x *= fx; G.tx *= fx;
        G.stars.forEach(s => { s.x *= fx; s.y *= fy; });
        G.rocks.forEach(o => { o.x *= fx; o.y *= fy; });
      }
      W = nW; H = nH;
    }
    view.s = Math.min(r.width/W, r.height/H) || 1;
    view.ox = (r.width - W*view.s)/2; view.oy = (r.height - H*view.s)/2;
  }
  const toX = e => {
    const r = cv.getBoundingClientRect();
    return (e.clientX - r.left - view.ox)/view.s;
  };
  cv.addEventListener("pointerdown", e => { e.preventDefault(); audio(); if (G) G.tx = toX(e); });
  cv.addEventListener("pointermove", e => { if (G && (e.buttons || e.pointerType === "touch")) G.tx = toX(e); });
  window.addEventListener("keydown", e => {
    if (!G) return;
    if (e.key === "ArrowLeft"){ e.preventDefault(); G.tx = clamp(G.tx - 90, 60, W - 60); }
    else if (e.key === "ArrowRight"){ e.preventDefault(); G.tx = clamp(G.tx + 90, 60, W - 60); }
    else if ((e.key === " " || e.key === "Enter") && G.state === "build"){ e.preventDefault(); audio(); launch(); }
  });
  $("go").addEventListener("click", () => { audio(); launch(); });
  $("again").addEventListener("click", () => { audio(); toBuild(); });
  $("fly-again").addEventListener("click", () => { audio(); toBuild(); launch(); });

  /* ---------- döngü ---------- */
  let last = performance.now();
  function frame(now){
    const dt = Math.min(.05, Math.max(0, (now - last)/1000)); last = now;
    update(dt); draw();
    requestAnimationFrame(frame);
  }

  if (!CanvasRenderingContext2D.prototype.roundRect){
    CanvasRenderingContext2D.prototype.roundRect = function(x, y, w, h, r){
      r = Array.isArray(r) ? r[0] : r;
      r = Math.min(r, w/2, h/2);
      this.moveTo(x + r, y); this.arcTo(x + w, y, x + w, y + h, r); this.arcTo(x + w, y + h, x, y + h, r);
      this.arcTo(x, y + h, x, y, r); this.arcTo(x, y, x + w, y, r); this.closePath();
    };
  }
  document.addEventListener("visibilitychange", () => { last = performance.now(); if (document.hidden && canSpeak) speechSynthesis.cancel(); });
  if ("ResizeObserver" in window) new ResizeObserver(resize).observe(stage);
  else window.addEventListener("resize", resize);
  resize();
  toBuild();
  requestAnimationFrame(frame);
})();
