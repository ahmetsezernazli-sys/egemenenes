/* Kurabiye Dükkânı — 5 yaş için: hamuru karıştır, kes, pişir, süsle, ver */
(function(){
  "use strict";

  const W = 1000, H = 640;
  const TAU = Math.PI*2;
  const RM = window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches;
  const SOUND_KEY = "kurabiye-ses", MADE_KEY = "kurabiye-sayi";

  const OVEN = {x:26, y:292, w:232, h:330};
  const BOWL = {x:520, y:286, r:120};
  const TRAY = {x:520, y:478, w:452, h:150};
  const GUEST = {x:858, y:392};
  const ING = [{x:322, y:150, id:"un"}, {x:520, y:138, id:"yumurta"}, {x:718, y:150, id:"şeker"}];
  const PAL = ["#FF6FA5", "#FFD24A", "#7BD86A", "#63C7F2", "#B98CFF", "#FFFFFF"];
  const SHAPES = ["yıldız", "kalp", "yuvarlak", "çiçek"];
  const NUMS = ["", "bir", "iki", "üç", "dört", "beş"];
  const GUESTS = [
    {name:"ayı",     fur:"#C98A5B", ear:"#A96F44", face:"#F0D2A8"},
    {name:"kedi",    fur:"#8E9BB3", ear:"#6F7C94", face:"#E7EDF5"},
    {name:"tavşan",  fur:"#F2D7E4", ear:"#E3B9CD", face:"#FFF1F6"},
    {name:"penguen", fur:"#3C4A63", ear:"#2C3850", face:"#FFFFFF"},
    {name:"kurbağa", fur:"#7BC96F", ear:"#5FAE55", face:"#DFF3D8"}
  ];

  const $ = id => document.getElementById(id);
  const stage = $("stage"), cv = $("cv"), ctx = cv.getContext("2d");
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const rand = (a, b) => a + Math.random()*(b - a);
  const rnd = n => Math.floor(Math.random()*n);
  const dist = (x, y, a, b) => Math.hypot(x - a, y - b);

  let soundOn = true, made = 0;
  try { soundOn = localStorage.getItem(SOUND_KEY) !== "0"; } catch(e) {}
  try { made = Math.max(0, parseInt(localStorage.getItem(MADE_KEY), 10) || 0); } catch(e) {}

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
    for (let i = 0; i < len; i++) d[i] = (Math.random()*2 - 1)*Math.pow(1 - i/len, 2);
    const s = a.createBufferSource(); s.buffer = buf;
    const f = a.createBiquadFilter(); f.type = type || "bandpass"; f.frequency.value = freq;
    const g = a.createGain(); g.gain.value = vol;
    s.connect(f).connect(g).connect(a.destination); s.start();
  }
  const sfx = {
    pour(){ noise(.5, 900, .18); },
    crack(){ noise(.12, 2400, .25); tone(320, .1, "triangle", .06, 180); },
    stir(){ tone(rand(300, 420), .07, "sine", .035); },
    cut(){ noise(.1, 1600, .22); tone(640, .07, "triangle", .05, 420); },
    door(){ noise(.22, 180, .35, "lowpass"); },
    ding(){ [1318.5, 1760].forEach((f, i) => tone(f, .5, "sine", .09, null, i*.12)); },
    icing(){ tone(520, .14, "sine", .07, 900); },
    sprinkle(){ noise(.22, 3000, .18); },
    munch(){ noise(.16, 500, .3, "lowpass"); },
    happy(){ [523.25, 659.25, 783.99, 1046.5].forEach((f, i) => tone(f, .26, "triangle", .11, null, i*.11)); },
    pop(){ tone(720, .08, "triangle", .06, 980); }
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

  /* ---------- durum ---------- */
  let G = null, timers = [];
  const later = (s, fn) => timers.push({t:s, fn});
  const clearTimers = () => { timers = []; };

  function newOrder(){
    clearTimers();
    const shape = rnd(SHAPES.length), count = 1 + rnd(5);
    G = {
      stage:"dough", order:{shape, count}, guest:rnd(GUESTS.length),
      ing:[false, false, false], pours:[], stir:0, lastAng:null,
      spots:[], cookies:[], bake:0, tool:0, sparks:[], hearts:[], cr:count <= 3 ? 42 : 34,
      t:0, guestIn:0, eaten:0, made:made
    };
    const cr = G.cr;
    for (let i = 0; i < count; i++){
      const w = TRAY.w - 2*(cr + 12), x = TRAY.x - w/2 + (count === 1 ? w/2 : i*w/(count - 1));
      G.spots.push({x, y:TRAY.y + rand(-14, 14), cut:false});
    }
    hint("dough");
    renderMade();
    later(.6, () => say(orderText()));
  }

  const HINTS = {
    dough:"Malzemeleri kaseye dök",
    stir:"Parmağınla karıştır",
    cut:"Kurabiyeleri kes",
    bake:"Fırına koy",
    baking:"Pişiyor…",
    decorate:"İstediğin gibi süsle",
    serve:"Kurabiyeleri müşteriye ver",
    eating:"Mmm!"
  };
  const SPOKEN = {
    stir:"Şimdi karıştır",
    cut:"Kurabiyeleri kes",
    bake:"Fırına koyalım",
    decorate:"İstediğin gibi süsle",
    serve:"Kurabiyeleri müşteriye ver"
  };
  function hint(st, quiet){
    G.stage = st;
    const el = $("role");
    el.textContent = HINTS[st] || "";
    el.hidden = !HINTS[st];
    if (!quiet && SPOKEN[st]) say(SPOKEN[st]);
  }

  function orderText(){
    const o = G.order;
    return `${NUMS[o.count]} ${SHAPES[o.shape]} kurabiye lütfen`;
  }

  /* ---------- dokunma ---------- */
  function tap(x, y){
    if (!G) return false;
    if (G.stage === "dough"){
      for (let i = 0; i < ING.length; i++){
        if (!G.ing[i] && dist(x, y, ING[i].x, ING[i].y) < 78){ addIng(i); return true; }
      }
      return false;
    }
    if (G.stage === "cut"){
      for (const s of G.spots){
        if (!s.cut && dist(x, y, s.x, s.y) < G.cr + 10){ cutOne(s); return true; }
      }
      return false;
    }
    if (G.stage === "bake"){
      if (x > OVEN.x && x < OVEN.x + OVEN.w && y > OVEN.y && y < OVEN.y + OVEN.h){ startBake(); return true; }
      return false;
    }
    if (G.stage === "decorate"){
      for (let i = 0; i < PAL.length + 1; i++){
        const p = toolPos(i);
        if (dist(x, y, p.x, p.y) < 34){ G.tool = i; sfx.pop(); return true; }
      }
      const d = donePos();
      if (dist(x, y, d.x, d.y) < 54){ hint("serve"); return true; }
      for (const c of G.cookies){
        if (dist(x, y, c.x, c.y) < G.cr + 10){ paint(c); return true; }
      }
      return false;
    }
    if (G.stage === "serve"){
      if (dist(x, y, GUEST.x, GUEST.y) < 170 || (Math.abs(x - TRAY.x) < TRAY.w/2 && Math.abs(y - TRAY.y) < TRAY.h/2)){
        serve(); return true;
      }
    }
    return false;
  }

  function addIng(i){
    G.ing[i] = true;
    G.pours.push({i, t:0});
    sfx[i === 1 ? "crack" : "pour"]();
    say(ING[i].id);
    burst(ING[i].x, ING[i].y + 40, 10, "#FFF6E3");
    if (G.ing.every(Boolean)) later(.7, () => hint("stir"));
    return true;
  }

  function stirMove(x, y){
    if (G.stage !== "stir") return;
    if (dist(x, y, BOWL.x, BOWL.y) > BOWL.r*1.25){ G.lastAng = null; return; }
    const a = Math.atan2(y - BOWL.y, x - BOWL.x);
    if (G.lastAng != null){
      let d = a - G.lastAng;
      while (d > Math.PI) d -= TAU;
      while (d < -Math.PI) d += TAU;
      if (Math.abs(d) < 1.2){                       // sıçramaları sayma
        G.stir += d;
        if (Math.random() < .12) sfx.stir();
      }
    }
    G.lastAng = a;
    if (Math.abs(G.stir) >= TAU*3){
      sfx.happy(); burst(BOWL.x, BOWL.y, 18, "#F0D9A8");
      hint("cut");
    }
  }

  function cutOne(s){
    s.cut = true;
    const n = G.spots.filter(q => q.cut).length;
    G.cookies.push({x:s.x, y:s.y, shape:G.order.shape, baked:false, icing:null, sprinkles:false, pop:1});
    sfx.cut(); say(NUMS[n]);
    if (G.spots.every(q => q.cut)) later(.6, () => hint("bake"));
  }

  function startBake(){
    hint("baking", true);
    G.bake = 0;
    sfx.door();
  }

  function finishBake(){
    G.cookies.forEach(c => { c.baked = true; c.chips = [0, 1, 2, 3].map(() => ({x:rand(-.5, .5), y:rand(-.5, .5)})); });
    sfx.ding(); say("Kurabiyeler hazır!");
    burst(OVEN.x + OVEN.w/2, OVEN.y + 120, 16, "#FFD98A");
    later(.5, () => hint("decorate"));
  }

  function paint(c){
    if (G.tool === PAL.length){ c.sprinkles = true; sfx.sprinkle(); }
    else { c.icing = PAL[G.tool]; sfx.icing(); }
    burst(c.x, c.y, 8, G.tool === PAL.length ? "#FF6FA5" : PAL[G.tool]);
  }

  function serve(){
    hint("eating", true);
    G.eaten = 0;
    eatNext();
  }
  function eatNext(){
    if (!G.cookies.length){
      made++; G.made = made;
      try { localStorage.setItem(MADE_KEY, String(made)); } catch(e) {}
      renderMade();
      sfx.happy(); say("Mmm! Çok lezzetli. Teşekkürler!");
      for (let i = 0; i < 6; i++) later(i*.12, () => G.hearts.push({x:GUEST.x + rand(-40, 40), y:GUEST.y - 90, t:0}));
      later(2.4, newOrder);
      return;
    }
    const c = G.cookies.shift();
    G.eaten++;
    sfx.munch();
    burst(GUEST.x, GUEST.y - 40, 8, c.icing || "#D89A57");
    later(.45, eatNext);
  }

  function burst(x, y, n, col){
    if (RM) return;
    for (let i = 0; i < n; i++){
      const a = rand(0, TAU), v = rand(40, 190);
      G.sparks.push({x, y, vx:Math.cos(a)*v, vy:Math.sin(a)*v - 60, life:rand(.4, .9), max:.9, r:rand(2, 5), col});
    }
  }

  const toolPos = i => ({x:300 + i*66, y:586});
  const donePos = () => ({x:906, y:586});

  /* ---------- güncelleme ---------- */
  function update(dt){
    if (!G) return;
    G.t += dt;
    if (timers.length){
      const due = [];
      for (const t of timers) if ((t.t -= dt) <= 0) due.push(t);
      if (due.length){ timers = timers.filter(t => t.t > 0); due.forEach(t => t.fn()); }
    }
    G.guestIn = Math.min(1, G.guestIn + dt*1.6);
    G.pours.forEach(p => { p.t += dt; });
    G.pours = G.pours.filter(p => p.t < 1);
    G.cookies.forEach(c => { if (c.pop > 0) c.pop = Math.max(0, c.pop - dt*3); });
    for (let i = G.sparks.length - 1; i >= 0; i--){
      const s = G.sparks[i];
      s.vy += 420*dt; s.x += s.vx*dt; s.y += s.vy*dt; s.life -= dt;
      if (s.life <= 0) G.sparks.splice(i, 1);
    }
    for (let i = G.hearts.length - 1; i >= 0; i--){
      const h = G.hearts[i]; h.t += dt; h.y -= 46*dt;
      if (h.t > 1.6) G.hearts.splice(i, 1);
    }
    if (G.stage === "baking"){
      G.bake += dt;
      if (G.bake >= 3){ G.stage = "baked"; finishBake(); }
    }
  }

  /* ---------- çizim ---------- */
  function cookieShape(x, y, r, shape, fill){
    ctx.save(); ctx.translate(x, y); ctx.fillStyle = fill;
    ctx.beginPath();
    if (SHAPES[shape] === "yıldız"){
      for (let i = 0; i < 10; i++){
        const a = -Math.PI/2 + i*Math.PI/5, rad = i % 2 ? r*.46 : r;
        i ? ctx.lineTo(Math.cos(a)*rad, Math.sin(a)*rad) : ctx.moveTo(Math.cos(a)*rad, Math.sin(a)*rad);
      }
      ctx.closePath();
    } else if (SHAPES[shape] === "kalp"){
      ctx.moveTo(0, r*.85);
      ctx.bezierCurveTo(-r*1.25, -r*.1, -r*.55, -r*1.05, 0, -r*.35);
      ctx.bezierCurveTo(r*.55, -r*1.05, r*1.25, -r*.1, 0, r*.85);
    } else if (SHAPES[shape] === "yuvarlak"){
      ctx.arc(0, 0, r*.92, 0, TAU);
    } else {
      for (let i = 0; i < 6; i++){
        const a = i*TAU/6;
        ctx.moveTo(0, 0);
        ctx.arc(Math.cos(a)*r*.52, Math.sin(a)*r*.52, r*.46, 0, TAU);
      }
    }
    ctx.fill();
    ctx.restore();
  }

  function drawCookie(c){
    const r = G.cr*(1 + c.pop*.35);
    cookieShape(c.x, c.y + 4, r, c.shape, "rgba(90,60,30,.18)");
    cookieShape(c.x, c.y, r, c.shape, c.baked ? "#D89A57" : "#F0D9A8");
    if (c.baked && c.chips){
      ctx.fillStyle = "#5B3418";
      c.chips.forEach(p => { ctx.beginPath(); ctx.arc(c.x + p.x*r*.9, c.y + p.y*r*.9, r*.10, 0, TAU); ctx.fill(); });
    }
    if (c.icing){
      ctx.save(); ctx.globalAlpha = .92;
      cookieShape(c.x, c.y - 2, r*.72, c.shape, c.icing);
      ctx.restore();
    }
    if (c.sprinkles){
      ctx.save(); ctx.translate(c.x, c.y);
      for (let i = 0; i < 9; i++){
        const a = i*2.1, rr = (i % 3 + 1)*r*.2;
        ctx.strokeStyle = PAL[i % PAL.length]; ctx.lineWidth = 4; ctx.lineCap = "round";
        const px = Math.cos(a)*rr, py = Math.sin(a)*rr;
        ctx.beginPath(); ctx.moveTo(px - 4, py - 3); ctx.lineTo(px + 4, py + 3); ctx.stroke();
      }
      ctx.restore(); ctx.lineCap = "butt";
    }
  }

  function glow(x, y, r){
    const p = .5 + .5*Math.sin(G.t*4);
    ctx.strokeStyle = `rgba(255,193,104,${.55 + p*.4})`;
    ctx.lineWidth = 6 + p*3;
    ctx.beginPath(); ctx.arc(x, y, r + p*5, 0, TAU); ctx.stroke();
  }

  function drawKitchen(){
    const x0 = -view.ox/view.s - 2, y0 = -view.oy/view.s - 2;
    const w = W + 2*view.ox/view.s + 4, h = H + 2*view.oy/view.s + 4;
    ctx.fillStyle = "#FFE3C8"; ctx.fillRect(x0, y0, w, h);
    ctx.fillStyle = "rgba(255,255,255,.35)";
    for (let y = 40; y < 400; y += 66) for (let x = x0 - (x0 % 92); x < x0 + w; x += 92)
      ctx.fillRect(x + 6, y, 80, 54);
    ctx.fillStyle = "#C98A5B"; ctx.fillRect(x0, 400, w, h);
    ctx.fillStyle = "#B2764A"; ctx.fillRect(x0, 400, w, 16);
    ctx.fillStyle = "rgba(255,255,255,.12)";
    for (let x = x0 - (x0 % 120); x < x0 + w; x += 120) ctx.fillRect(x, 416, 4, h);
  }

  function drawOven(){
    const o = OVEN;
    ctx.fillStyle = "#6E7B8A"; ctx.beginPath(); ctx.roundRect(o.x, o.y, o.w, o.h, 18); ctx.fill();
    ctx.fillStyle = "#59636F"; ctx.beginPath(); ctx.roundRect(o.x + 14, o.y + 14, o.w - 28, 54, 12); ctx.fill();
    ctx.fillStyle = "#FFC168";
    [0, 1, 2].forEach(i => { ctx.beginPath(); ctx.arc(o.x + 44 + i*50, o.y + 41, 13, 0, TAU); ctx.fill(); });
    const open = G.stage === "bake" || G.stage === "decorate" || G.stage === "serve" || G.stage === "eating";
    ctx.fillStyle = "#3E4752"; ctx.beginPath(); ctx.roundRect(o.x + 14, o.y + 82, o.w - 28, o.h - 100, 14); ctx.fill();
    ctx.fillStyle = G.stage === "baking" ? "#FFB04A" : "#2B323B";
    ctx.beginPath(); ctx.roundRect(o.x + 30, o.y + 100, o.w - 60, o.h - 140, 10); ctx.fill();
    if (G.stage === "baking"){
      ctx.fillStyle = "rgba(255,255,255,.5)";
      ctx.font = "700 40px Baloo 2, sans-serif"; ctx.textAlign = "center";
      const dots = 1 + Math.floor(G.bake) % 3;
      ctx.fillText(".".repeat(dots), o.x + o.w/2, o.y + o.h/2);
      ctx.textAlign = "left";
      // pişme çubuğu
      ctx.fillStyle = "rgba(0,0,0,.35)"; ctx.fillRect(o.x + 40, o.y + o.h - 62, o.w - 80, 16);
      ctx.fillStyle = "#FFC168"; ctx.fillRect(o.x + 40, o.y + o.h - 62, (o.w - 80)*clamp(G.bake/3, 0, 1), 16);
    }
    ctx.fillStyle = "#9AA6B3";
    ctx.beginPath(); ctx.roundRect(o.x + 26, o.y + o.h - 30, o.w - 52, 12, 6); ctx.fill();
    if (open && G.stage === "bake") glow(o.x + o.w/2, o.y + o.h/2, 118);
  }

  function drawBowl(){
    const b = BOWL;
    const level = G.ing.filter(Boolean).length;
    ctx.fillStyle = "rgba(90,60,30,.15)";
    ctx.beginPath(); ctx.ellipse(b.x, b.y + b.r*.85, b.r*.95, 18, 0, 0, TAU); ctx.fill();
    if (level){                                    // içindeki karışım
      const t = G.stage === "stir" ? clamp(Math.abs(G.stir)/(TAU*3), 0, 1) : (G.stage === "dough" ? 0 : 1);
      ctx.fillStyle = t > .99 ? "#F0D9A8" : ["#FFFDF6", "#FFF3C9", "#F6E4B8"][level - 1];
      ctx.beginPath(); ctx.ellipse(b.x, b.y - 8, b.r*.82, b.r*.42, 0, 0, TAU); ctx.fill();
      if (G.stage === "stir"){
        ctx.strokeStyle = "rgba(160,120,70,.5)"; ctx.lineWidth = 6; ctx.lineCap = "round";
        const a = G.stir;
        ctx.beginPath();
        ctx.arc(b.x, b.y - 8, b.r*.5, a, a + 2.4); ctx.stroke();
        ctx.lineCap = "butt";
      }
    }
    ctx.fillStyle = "#EFF3F7";
    ctx.beginPath(); ctx.moveTo(b.x - b.r, b.y - 18); ctx.quadraticCurveTo(b.x, b.y + b.r*1.15, b.x + b.r, b.y - 18); ctx.closePath(); ctx.fill();
    ctx.fillStyle = "#D9E1EA";
    ctx.beginPath(); ctx.ellipse(b.x, b.y - 18, b.r, 22, 0, 0, TAU); ctx.fill();
    ctx.fillStyle = "#FBFDFF";
    ctx.beginPath(); ctx.ellipse(b.x, b.y - 18, b.r*.86, 15, 0, 0, TAU); ctx.fill();
    if (G.stage === "stir"){
      // kaşık
      ctx.save(); ctx.translate(b.x, b.y - 10); ctx.rotate(G.stir);
      ctx.strokeStyle = "#B2764A"; ctx.lineWidth = 12; ctx.lineCap = "round";
      ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(b.r*.55, -b.r*.5); ctx.stroke();
      ctx.fillStyle = "#C98A5B"; ctx.beginPath(); ctx.ellipse(0, 0, 22, 15, .5, 0, TAU); ctx.fill();
      ctx.restore(); ctx.lineCap = "butt";
      glow(b.x, b.y - 10, b.r*.75);
    }
  }

  function drawIngredients(){
    ING.forEach((g, i) => {
      const done = G.ing[i];
      const pour = G.pours.find(p => p.i === i);
      ctx.save();
      if (pour){ const k = Math.sin(clamp(pour.t, 0, 1)*Math.PI); ctx.translate(g.x, g.y); ctx.rotate(k*.7); ctx.translate(-g.x, -g.y); }
      ctx.globalAlpha = done && !pour ? .35 : 1;
      if (i === 0){                                   // un torbası
        ctx.fillStyle = "#F3E3C8"; ctx.beginPath(); ctx.roundRect(g.x - 46, g.y - 48, 92, 96, 14); ctx.fill();
        ctx.fillStyle = "#E3CEA6"; ctx.beginPath(); ctx.roundRect(g.x - 46, g.y - 48, 92, 26, 12); ctx.fill();
        ctx.fillStyle = "#C98A5B"; ctx.font = "800 26px Baloo 2, sans-serif"; ctx.textAlign = "center";
        ctx.fillText("UN", g.x, g.y + 22); ctx.textAlign = "left";
      } else if (i === 1){                            // yumurta
        ctx.fillStyle = "#FFF7EA"; ctx.beginPath(); ctx.ellipse(g.x, g.y, 38, 48, 0, 0, TAU); ctx.fill();
        ctx.fillStyle = "#FFD24A"; ctx.beginPath(); ctx.arc(g.x, g.y + 6, 15, 0, TAU); ctx.fill();
      } else {                                        // şeker kavanozu
        ctx.fillStyle = "rgba(255,255,255,.85)"; ctx.beginPath(); ctx.roundRect(g.x - 40, g.y - 40, 80, 86, 12); ctx.fill();
        ctx.fillStyle = "#FFFFFF"; ctx.beginPath(); ctx.roundRect(g.x - 34, g.y + 2, 68, 40, 8); ctx.fill();
        ctx.fillStyle = "#C98A5B"; ctx.beginPath(); ctx.roundRect(g.x - 44, g.y - 52, 88, 20, 8); ctx.fill();
      }
      ctx.globalAlpha = 1;
      ctx.restore();
      if (!done && G.stage === "dough") glow(g.x, g.y, 62);
      if (done){
        ctx.fillStyle = "#7BD86A"; ctx.beginPath(); ctx.arc(g.x + 44, g.y - 44, 17, 0, TAU); ctx.fill();
        ctx.strokeStyle = "#fff"; ctx.lineWidth = 5; ctx.lineCap = "round";
        ctx.beginPath(); ctx.moveTo(g.x + 36, g.y - 44); ctx.lineTo(g.x + 42, g.y - 38); ctx.lineTo(g.x + 52, g.y - 51); ctx.stroke();
        ctx.lineCap = "butt";
      }
      if (pour){                                      // dökülen malzeme
        const k = clamp(pour.t, 0, 1);
        ctx.fillStyle = i === 1 ? "#FFD24A" : "#FFF6E3";
        for (let d = 0; d < 6; d++){
          const p = clamp(k*1.4 - d*.08, 0, 1);
          if (p <= 0 || p >= 1) continue;
          ctx.beginPath();
          ctx.arc(g.x + (BOWL.x - g.x)*p, g.y + (BOWL.y - 40 - g.y)*p + 40*Math.sin(p*Math.PI), 7, 0, TAU);
          ctx.fill();
        }
      }
    });
  }

  function drawTray(){
    ctx.fillStyle = "#8E9BB3";
    ctx.beginPath(); ctx.roundRect(TRAY.x - TRAY.w/2, TRAY.y - TRAY.h/2, TRAY.w, TRAY.h, 18); ctx.fill();
    ctx.fillStyle = "#A6B2C6";
    ctx.beginPath(); ctx.roundRect(TRAY.x - TRAY.w/2 + 10, TRAY.y - TRAY.h/2 + 10, TRAY.w - 20, TRAY.h - 20, 12); ctx.fill();
  }

  function drawDough(){
    ctx.fillStyle = "#F0D9A8";
    ctx.beginPath(); ctx.roundRect(TRAY.x - TRAY.w/2 + 6, TRAY.y - TRAY.h/2 + 6, TRAY.w - 12, TRAY.h - 12, 26); ctx.fill();
    ctx.fillStyle = "rgba(200,160,100,.35)";
    for (let i = 0; i < 26; i++){
      const x = TRAY.x - TRAY.w/2 + 20 + (i*97) % (TRAY.w - 40);
      const y = TRAY.y - TRAY.h/2 + 22 + (i*53) % (TRAY.h - 44);
      ctx.beginPath(); ctx.arc(x, y, 4, 0, TAU); ctx.fill();
    }
    G.spots.forEach(s => {
      if (s.cut) return;
      ctx.save();
      ctx.setLineDash([12, 10]); ctx.strokeStyle = "rgba(120,80,40,.65)"; ctx.lineWidth = 4;
      ctx.beginPath(); ctx.arc(s.x, s.y, G.cr + 2, 0, TAU); ctx.stroke();
      ctx.restore();
      glow(s.x, s.y, G.cr + 8);
    });
  }

  function drawPalette(){
    for (let i = 0; i <= PAL.length; i++){
      const p = toolPos(i), sel = G.tool === i;
      ctx.fillStyle = "rgba(0,0,0,.18)"; ctx.beginPath(); ctx.arc(p.x, p.y + 4, 28, 0, TAU); ctx.fill();
      if (i < PAL.length){
        ctx.fillStyle = PAL[i]; ctx.beginPath(); ctx.arc(p.x, p.y, 27, 0, TAU); ctx.fill();
      } else {
        ctx.fillStyle = "#FFF6E3"; ctx.beginPath(); ctx.arc(p.x, p.y, 27, 0, TAU); ctx.fill();
        for (let k = 0; k < 7; k++){
          ctx.strokeStyle = PAL[k % PAL.length]; ctx.lineWidth = 4; ctx.lineCap = "round";
          const a = k*.9, rr = 14;
          ctx.beginPath();
          ctx.moveTo(p.x + Math.cos(a)*rr - 4, p.y + Math.sin(a)*rr - 3);
          ctx.lineTo(p.x + Math.cos(a)*rr + 4, p.y + Math.sin(a)*rr + 3); ctx.stroke();
        }
        ctx.lineCap = "butt";
      }
      ctx.strokeStyle = sel ? "#3A2118" : "rgba(255,255,255,.8)"; ctx.lineWidth = sel ? 6 : 3;
      ctx.beginPath(); ctx.arc(p.x, p.y, 30, 0, TAU); ctx.stroke();
    }
    const d = donePos();
    ctx.fillStyle = "#3E9D4E"; ctx.beginPath(); ctx.arc(d.x, d.y + 4, 44, 0, TAU); ctx.fill();
    ctx.fillStyle = "#59C463"; ctx.beginPath(); ctx.arc(d.x, d.y, 44, 0, TAU); ctx.fill();
    ctx.strokeStyle = "#fff"; ctx.lineWidth = 9; ctx.lineCap = "round";
    ctx.beginPath(); ctx.moveTo(d.x - 19, d.y + 1); ctx.lineTo(d.x - 5, d.y + 16); ctx.lineTo(d.x + 21, d.y - 16); ctx.stroke();
    ctx.lineCap = "butt";
    glow(d.x, d.y, 50);
  }

  function drawGuest(){
    const g = GUESTS[G.guest], x = GUEST.x + (1 - G.guestIn)*220, y = GUEST.y;
    const bob = Math.sin(G.t*2)*4;
    ctx.save(); ctx.translate(x, y + bob);
    ctx.fillStyle = "rgba(90,60,30,.18)";
    ctx.beginPath(); ctx.ellipse(0, 118, 74, 16, 0, 0, TAU); ctx.fill();
    ctx.fillStyle = g.fur;                                   // gövde
    ctx.beginPath(); ctx.roundRect(-58, 10, 116, 110, 42); ctx.fill();
    ctx.fillStyle = g.face;
    ctx.beginPath(); ctx.ellipse(0, 74, 36, 40, 0, 0, TAU); ctx.fill();
    ctx.fillStyle = g.ear;                                   // kulaklar
    if (g.name === "tavşan"){
      ctx.beginPath(); ctx.ellipse(-24, -84, 15, 44, .15, 0, TAU); ctx.ellipse(24, -84, 15, 44, -.15, 0, TAU); ctx.fill();
    } else if (g.name === "kurbağa"){
      ctx.beginPath(); ctx.arc(-34, -62, 24, 0, TAU); ctx.arc(34, -62, 24, 0, TAU); ctx.fill();
    } else {
      ctx.beginPath(); ctx.arc(-40, -52, 24, 0, TAU); ctx.arc(40, -52, 24, 0, TAU); ctx.fill();
    }
    ctx.fillStyle = g.fur;                                   // kafa
    ctx.beginPath(); ctx.arc(0, -22, 62, 0, TAU); ctx.fill();
    ctx.fillStyle = g.face;
    ctx.beginPath(); ctx.ellipse(0, -2, 36, 28, 0, 0, TAU); ctx.fill();
    const munch = G.stage === "eating" ? Math.abs(Math.sin(G.t*9))*6 : 0;
    ctx.fillStyle = "#3A2118";                               // gözler
    ctx.beginPath(); ctx.arc(-22, -34, 8, 0, TAU); ctx.arc(22, -34, 8, 0, TAU); ctx.fill();
    ctx.beginPath(); ctx.ellipse(0, -12, 10, 7, 0, 0, TAU); ctx.fill();
    ctx.strokeStyle = "#3A2118"; ctx.lineWidth = 4; ctx.lineCap = "round";
    ctx.beginPath(); ctx.arc(0, 2 + munch, 14, .15*Math.PI, .85*Math.PI); ctx.stroke();
    ctx.lineCap = "butt";
    ctx.restore();
    if (G.stage === "serve") glow(GUEST.x, GUEST.y, 150);
  }

  function drawBubble(){
    const x = GUEST.x + (1 - G.guestIn)*220, y = 146, o = G.order;
    const w = Math.max(190, 60 + o.count*54), h = 104;
    ctx.fillStyle = "#FFFFFF";
    ctx.beginPath(); ctx.roundRect(x - w/2, y - h/2, w, h, 26); ctx.fill();
    ctx.beginPath(); ctx.moveTo(x - 18, y + h/2 - 4); ctx.lineTo(x + 6, y + h/2 + 34); ctx.lineTo(x + 20, y + h/2 - 4); ctx.closePath(); ctx.fill();
    const step = 52, x0 = x - (o.count - 1)*step/2;
    for (let i = 0; i < o.count; i++) cookieShape(x0 + i*step, y, 21, o.shape, "#D89A57");
  }

  function drawSparks(){
    G.sparks.forEach(s => {
      ctx.globalAlpha = clamp(s.life/s.max, 0, 1);
      ctx.fillStyle = s.col;
      ctx.beginPath(); ctx.arc(s.x, s.y, s.r, 0, TAU); ctx.fill();
    });
    ctx.globalAlpha = 1;
    G.hearts.forEach(h => {
      ctx.globalAlpha = clamp(1 - h.t/1.6, 0, 1);
      cookieShape(h.x, h.y, 18, 1, "#FF6FA5");
    });
    ctx.globalAlpha = 1;
  }

  const view = {s:1, ox:0, oy:0, dpr:1};
  function draw(){
    const d = view.dpr;
    ctx.setTransform(d, 0, 0, d, 0, 0);
    ctx.clearRect(0, 0, cv.width, cv.height);
    ctx.save(); ctx.translate(view.ox, view.oy); ctx.scale(view.s, view.s);
    drawKitchen();
    drawOven();
    drawBubble();
    drawGuest();
    const st = G.stage;
    if (st === "dough" || st === "stir"){
      drawBowl();
      if (st === "dough") drawIngredients();
    } else if (st === "cut"){
      drawDough();
      G.cookies.forEach(drawCookie);        // kesilen kurabiye hemen görünsün
    } else if (st === "baking"){
      drawTray();
    } else {
      drawTray();
      G.cookies.forEach(drawCookie);
      if (st === "decorate") drawPalette();
    }
    drawSparks();
    ctx.restore();
  }

  /* ---------- giriş ---------- */
  function resize(){
    const r = stage.getBoundingClientRect();
    view.dpr = Math.min(window.devicePixelRatio || 1, 2);
    cv.width = Math.round(r.width*view.dpr); cv.height = Math.round(r.height*view.dpr);
    view.s = Math.min(r.width/W, r.height/H) || 1;
    view.ox = (r.width - W*view.s)/2; view.oy = (r.height - H*view.s)/2;
  }
  const toLogic = e => {
    const r = cv.getBoundingClientRect();
    return {x:(e.clientX - r.left - view.ox)/view.s, y:(e.clientY - r.top - view.oy)/view.s};
  };
  let down = false;
  cv.addEventListener("pointerdown", e => {
    e.preventDefault(); audio();
    down = true;
    const q = toLogic(e);
    if (G.stage === "stir"){ G.lastAng = null; stirMove(q.x, q.y); }
    else tap(q.x, q.y);
  });
  cv.addEventListener("pointermove", e => {
    if (!down) return;
    const q = toLogic(e);
    if (G.stage === "stir") stirMove(q.x, q.y);
  });
  const up = () => { down = false; if (G) G.lastAng = null; };
  cv.addEventListener("pointerup", up);
  cv.addEventListener("pointercancel", up);
  cv.addEventListener("pointerleave", up);
  $("restart").addEventListener("click", () => { audio(); newOrder(); say(orderText()); });

  function renderMade(){ $("made").textContent = "🍪 " + made; }

  /* ---------- döngü ---------- */
  let last = performance.now();
  function frame(now){
    const dt = Math.min(.05, Math.max(0, (now - last)/1000)); last = now;
    update(dt); draw();
    requestAnimationFrame(frame);
  }

  if (!CanvasRenderingContext2D.prototype.roundRect){
    CanvasRenderingContext2D.prototype.roundRect = function(x, y, w, h, r){
      r = Math.min(r, w/2, h/2);
      this.moveTo(x + r, y); this.arcTo(x + w, y, x + w, y + h, r); this.arcTo(x + w, y + h, x, y + h, r);
      this.arcTo(x, y + h, x, y, r); this.arcTo(x, y, x + w, y, r); this.closePath();
    };
  }
  document.addEventListener("visibilitychange", () => { last = performance.now(); if (document.hidden && canSpeak) speechSynthesis.cancel(); });
  if ("ResizeObserver" in window) new ResizeObserver(resize).observe(stage);
  else window.addEventListener("resize", resize);
  resize();
  newOrder();
  requestAnimationFrame(frame);
})();
