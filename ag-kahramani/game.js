/* Ağ Kahramanı — Egemen için dokun, ağ at, sallan */
(function(){
  "use strict";

  const W = 1000, H = 620, RUN = 240, SWING_T = .95, WAIT_AUTO = 3.5;
  const CITIES = [
    {name:"Sabah", sky:["#9FD8FF", "#E3F3FF"], far:"#B9D7EE", build:["#F2A65A", "#6EC6CA", "#F4D35E", "#EE6C4D"], win:"#FFFFFF"},
    {name:"Öğle", sky:["#7CC8FF", "#D6F0FF"], far:"#A7C8E6", build:["#7B9EF0", "#F7B267", "#84DCC6", "#F25F5C"], win:"#E8F6FF"},
    {name:"Gün batımı", sky:["#FF9A6B", "#FFD9A0"], far:"#E7A08A", build:["#8E5572", "#F2C14E", "#5E8C9A", "#D7816A"], win:"#FFE9B0"},
    {name:"Gece", sky:["#1D2A5A", "#3C4D8F"], far:"#2B3A70", build:["#3F4B7A", "#5B4B8A", "#2F6F8A", "#6A4C93"], win:"#FFE08A", night:true}
  ];
  const ITEMS = ["🧸", "🍦", "🎈", "⚽", "🍩", "🚗"];
  const RAINBOW = ["#E4483B", "#C98F00", "#2A64C0", "#1E8A41", "#6E36B8"];
  const SOUND_KEY = "ag-kahramani-ses";
  const RM = window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches;
  const EMOJI_FONT = '"Segoe UI Emoji","Apple Color Emoji","Noto Color Emoji",sans-serif';
  const INK = "#1F1B33", TAU = Math.PI*2;
  // kostüm: kırmızı gövde, sarı eldiven, bot ve arma (mavi ve maskede ağ deseni yok, kendi kahramanımız)
  const SUIT = "#E63946", SUIT_DARK = "#B81D2B", TRIM = "#FFC53D";

  const $ = id => document.getElementById(id);
  const stage = $("stage"), cv = $("cv"), ctx = cv.getContext("2d");
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const rand = (a, b) => a + Math.random()*(b - a);
  const pick = a => a[Math.random()*a.length | 0];
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
  function noise(dur, type, freq, vol, delay, sweep){
    const a = audio(); if (!a || !soundOn) return;
    const len = Math.floor(a.sampleRate*dur), buf = a.createBuffer(1, len, a.sampleRate), d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = (Math.random()*2 - 1)*(1 - i/len);
    const s = a.createBufferSource(); s.buffer = buf;
    const f = a.createBiquadFilter(); f.type = type; f.frequency.value = freq; f.Q.value = 1;
    const t0 = a.currentTime + (delay || 0);
    if (sweep) f.frequency.exponentialRampToValueAtTime(sweep, t0 + dur);
    const g = a.createGain(); g.gain.value = vol;
    s.connect(f).connect(g).connect(a.destination); s.start(t0);
  }
  const sfx = {
    web(){ noise(.22, "bandpass", 4000, .45, 0, 900); },
    whoosh(){ noise(.6, "bandpass", 400, .35, 0, 1600); },
    star(){ tone(1319, .12, "triangle", .09); tone(1760, .16, "triangle", .07, null, .06); },
    wrap(){ tone(260, .25, "sine", .14, 520); noise(.2, "highpass", 2500, .2, .05); },
    flee(){ tone(700, .5, "square", .04, 1400); },
    land(){ noise(.1, "lowpass", 500, .4); },
    meow(){ tone(700, .18, "sine", .1, 1000); tone(1000, .3, "sine", .08, 600, .16); },
    level(){ [523.25, 659.25, 783.99, 1046.5].forEach((f, i) => tone(f, .25, "triangle", .13, null, i*.12)); },
    party(){ [523.25, 659.25, 783.99, 1046.5, 1318.5, 1567.98].forEach((f, i) => tone(f, .3, "triangle", .13, null, i*.12)); }
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

  /* ---------- şehir kurulumu ---------- */
  function buildCity(ci){
    const buildings = [], gaps = [], robots = [], stars = [];
    const count = 8 + ci;
    let x = -200;
    const itemsLeft = ITEMS.slice().sort(() => Math.random() - .5);
    for (let i = 0; i < count; i++){
      const w = i === 0 ? 900 : i === count - 1 ? 700 : rand(420, 620) | 0;
      const top = i === 0 ? 440 : pick([390, 420, 450, 470]);
      const b = {x, w, top, color:pick(CITIES[ci].build), tank:Math.random() < .35, seed:Math.random()*1000};
      buildings.push(b);
      // çatı yıldızları
      if (i > 0 && i < count - 1) for (let k = 0; k < 2; k++) stars.push({x:x + w*(.35 + k*.25), y:top - 70, got:false});
      if (i >= 1 && i < count - 1 && (i % 2 === 1 || Math.random() < .3) && robots.length < 4){
        robots.push({x:x + w*.62, y:top, state:"idle", item:itemsLeft.pop() || pick(ITEMS), t:0, wrapT:0});
      }
      x += w + (i < count - 1 ? rand(220, 300) | 0 : 0);
    }
    for (let i = 0; i < count - 1; i++){
      const a = buildings[i], b = buildings[i + 1];
      const S = {x:a.x + a.w - 24, y:a.top}, E = {x:b.x + 70, y:b.top};
      const A = {x:(S.x + E.x)/2, y:Math.min(S.y, E.y) - 230};
      const g = {S, E, A, done:false, color:pick(["#FF5A5F", "#FFC53D", "#4DA3FF", "#3DDC97", "#B06CFF"])};
      gaps.push(g);
      for (const t of [.3, .5, .7]){ const p = arcPoint(g, t); stars.push({x:p.x, y:p.y - 30, got:false}); }
    }
    const last = buildings[count - 1];
    const kitten = {x:last.x + last.w - 150, y:last.top - 150, state:"wait", t:0};
    return {ci, buildings, gaps, robots, stars, kitten, end:last.x + last.w};
  }
  function arcPoint(g, t){
    const a0 = Math.atan2(g.S.y - g.A.y, g.S.x - g.A.x), a1 = Math.atan2(g.E.y - g.A.y, g.E.x - g.A.x);
    const r0 = Math.hypot(g.S.x - g.A.x, g.S.y - g.A.y), r1 = Math.hypot(g.E.x - g.A.x, g.E.y - g.A.y);
    const a = a0 + (a1 - a0)*t, r = r0 + (r1 - r0)*t;
    return {x:g.A.x + Math.cos(a)*r, y:g.A.y + Math.sin(a)*r};
  }

  /* ---------- oyun durumu ---------- */
  let phase = "intro";     // intro | play | levelEnd | party
  let city = null, ciNow = 0, cam = 0, time = 0, starsGot = 0, rescued = [];
  let hero = null, webs = [], parts = [], timers = [], saidWebHint = 0;
  const later = (s, fn) => timers.push({t:s, fn});

  function roofAt(x){
    for (const b of city.buildings) if (x >= b.x && x <= b.x + b.w) return b;
    return null;
  }
  function startCity(ci){
    ciNow = ci; city = buildCity(ci);
    hero = {x:120, y:440, state:"run", t:0, gap:0, wait:0, anim:0, squash:0};
    cam = 0; webs = []; timers = [];
    phase = "play";
    say(ci === 0 ? "Ağ Kahramanı yola çıkıyor! Kediyi kurtaralım!" : `${CITIES[ci].name} şehri! Hadi Ağ Kahramanı!`);
  }
  function startGame(){
    $("intro").hidden = true; $("party").hidden = true;
    starsGot = 0; rescued = []; saidWebHint = 0; parts = [];
    startCity(0);
  }

  const HERO_S = 1.35;   // kahraman çizim büyüklüğü
  function heroHand(){ return {x:hero.x + 16*HERO_S, y:hero.y - 66*HERO_S}; }

  function tap(wx, wy){
    if (phase !== "play") return;
    // önce parlayan robot
    const r = city.robots.find(o => o.state === "idle" && o.x > hero.x - 20 && o.x - hero.x < 620 && Math.hypot(wx - o.x, wy - (o.y - 40)) < 110);
    if (r){ shootRobot(r); return; }
    if (hero.state === "wait"){ swing(); return; }
    // yakında robot varsa ona at (küçükler için geniş hedef)
    const near = city.robots.find(o => o.state === "idle" && o.x > hero.x && o.x - hero.x < 520);
    if (near){ shootRobot(near); return; }
    const h = heroHand();
    webs.push({x0:h.x, y0:h.y, x1:h.x + rand(80, 200), y1:h.y - rand(200, 320), t:0, dur:.25, life:.45, hit:null});
    sfx.web();
  }
  function shootRobot(r){
    r.state = "hit";
    const h = heroHand();
    webs.push({x0:h.x, y0:h.y, x1:r.x, y1:r.y - 40, t:0, dur:.28, life:.5, ball:true, hit(){
      r.state = "wrapped"; r.wrapT = 0;
      sfx.wrap(); starsGot++;
      rescued.push({e:r.item, t:0, x:r.x - cam, y:r.y - 90});
      burst(r.x, r.y - 40, "#FFFFFF", 16);
      say(pick(["Yakaladın!", "Süper ağ!", "Robot yakalandı!"]), false);
    }});
    sfx.web();
  }
  function swing(){
    const g = city.gaps[hero.gap];
    hero.state = "swing"; hero.t = 0; hero.wait = 0;
    const h = heroHand();
    webs.push({x0:h.x, y0:h.y, x1:g.A.x, y1:g.A.y + 40, t:0, dur:.18, life:.2, rope:true});
    sfx.web(); later(.1, sfx.whoosh);
  }

  /* ---------- güncelle ---------- */
  function update(dt){
    time += dt;
    for (let i = timers.length - 1; i >= 0; i--){ const tk = timers[i]; tk.t -= dt; if (tk.t <= 0){ timers.splice(i, 1); tk.fn(); } }
    for (let i = parts.length - 1; i >= 0; i--){ const p = parts[i]; p.life -= dt; p.vy += (p.g || 500)*dt; p.x += p.vx*dt; p.y += p.vy*dt; if (p.rot !== undefined) p.rot += dt*5; if (p.life <= 0) parts.splice(i, 1); }
    for (const r of rescued) r.t = Math.min(1, r.t + dt*1.6);
    if (!city || phase === "intro") return;

    for (let i = webs.length - 1; i >= 0; i--){
      const w = webs[i]; w.t += dt;
      if (w.hit && w.t >= w.dur){ const f = w.hit; w.hit = null; f(); }
      if (w.t >= w.life) webs.splice(i, 1);
    }

    const g = city.gaps[hero.gap];
    hero.squash = Math.max(0, hero.squash - dt*4);
    if (phase === "play"){
      if (hero.state === "run"){
        hero.x += RUN*dt; hero.anim += dt*12;
        const b = roofAt(hero.x); if (b) hero.y = b.top;
        if (g && hero.x >= g.S.x){
          hero.x = g.S.x; hero.state = "wait"; hero.wait = 0;
          if (saidWebHint < 3){ say("Balon parlıyor! Dokun, ağ at!"); saidWebHint++; }
        }
        if (!g && hero.x >= city.kitten.x - 110){ hero.state = "rescue"; rescueKitten(); }
      } else if (hero.state === "wait"){
        hero.wait += dt;
        if (hero.wait > WAIT_AUTO){ say("Hadi gidelim!"); swing(); }
      } else if (hero.state === "swing"){
        hero.t += dt/SWING_T;
        const p = arcPoint(g, ease(Math.min(1, hero.t)));
        hero.x = p.x; hero.y = p.y;
        if (hero.t >= 1){
          hero.state = "run"; hero.x = g.E.x; hero.y = g.E.y; hero.squash = 1; g.done = true; hero.gap++;
          sfx.land(); burst(hero.x, hero.y, "rgba(255,255,255,.8)", 6);
        }
      }
    }
    // yıldızlar
    for (const s of city.stars){
      if (!s.got && Math.hypot(s.x - hero.x, s.y - (hero.y - 46)) < 64){ s.got = true; starsGot++; sfx.star(); burst(s.x, s.y, "#FFD23F", 8); }
    }
    // robotlar
    for (const r of city.robots){
      r.t += dt;
      if (r.state === "wrapped") r.wrapT += dt;
      if (r.state === "idle" && hero.x > r.x - 40 && hero.state === "run"){
        r.state = "flee"; sfx.flee();
      }
      if (r.state === "flee"){ r.y -= 260*dt; r.x += 120*dt; }
    }
    // kedi
    const k = city.kitten;
    if (k.state === "fly"){
      k.t = Math.min(1, k.t + dt*1.4);
      const h = heroHand();
      k.x = k.sx + (h.x + 10 - k.sx)*ease(k.t); k.y = k.sy + (h.y + 20 - k.sy)*ease(k.t) - Math.sin(k.t*Math.PI)*60;
      if (k.t >= 1) k.state = "saved";
    }
    if (k.state === "saved"){ const h = heroHand(); k.x = h.x + 10; k.y = h.y + 20; }

    const want = hero.x - 330;
    cam += (want - cam)*Math.min(1, dt*5);
  }

  function rescueKitten(){
    const k = city.kitten, h = heroHand();
    webs.push({x0:h.x, y0:h.y, x1:k.x, y1:k.y, t:0, dur:.25, life:1.2, rope:true});
    sfx.web();
    later(.3, () => { k.state = "fly"; k.sx = k.x; k.sy = k.y; sfx.meow(); });
    later(1.2, () => {
      phase = "levelEnd"; sfx.level();
      for (let i = 0; i < (RM ? 10 : 40); i++) parts.push({x:hero.x + rand(-200, 200), y:hero.y - 300, vx:rand(-120, 120), vy:rand(-200, 50), life:1.6, g:300, c:RAINBOW[i % 5], sq:true, rot:0, r:rand(5, 9)});
      say("Kediyi kurtardın! Aferin Egemen!");
    });
    later(3.6, () => {
      if (ciNow + 1 < CITIES.length) startCity(ciNow + 1);
      else { phase = "party"; sfx.party(); say("Bütün şehirleri kurtardın! Sen gerçek bir kahramansın!"); $("party").hidden = false; $("again").focus(); }
    });
  }
  function burst(x, y, c, n){
    for (let i = 0; i < (RM ? Math.ceil(n/3) : n); i++){ const a = rand(0, TAU), v = rand(60, 220); parts.push({x, y, vx:Math.cos(a)*v, vy:Math.sin(a)*v - 80, life:.6, c, r:rand(3, 6)}); }
  }

  /* ---------- giriş ---------- */
  const view = {s:1, ox:0, oy:0, dpr:1};
  function resize(){
    const r = stage.getBoundingClientRect();
    view.dpr = Math.min(window.devicePixelRatio || 1, 2);
    cv.width = Math.round(r.width*view.dpr); cv.height = Math.round(r.height*view.dpr);
    view.s = Math.min(r.width/W, r.height/H);
    view.ox = (r.width - W*view.s)/2; view.oy = (r.height - H*view.s)/2;
  }
  cv.addEventListener("pointerdown", e => {
    e.preventDefault(); audio();
    const r = cv.getBoundingClientRect();
    const x = (e.clientX - r.left - view.ox)/view.s + cam, y = (e.clientY - r.top - view.oy)/view.s;
    tap(x, y);
  });
  window.addEventListener("keydown", e => {
    if ((e.key === " " || e.key === "Enter") && phase === "play" && !e.repeat){ e.preventDefault(); audio(); tap(-9999, -9999); }
  });
  $("play").addEventListener("click", () => { audio(); startGame(); });
  $("again").addEventListener("click", () => { audio(); startGame(); });
  document.addEventListener("visibilitychange", () => { if (document.hidden && canSpeak) speechSynthesis.cancel(); last = performance.now(); });

  /* ---------- çizim ---------- */
  function emoji(e, x, y, size){ ctx.fillStyle = "#000"; ctx.font = `${Math.round(size)}px ${EMOJI_FONT}`; ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.fillText(e, x, y); }

  function drawSky(c){
    const x0 = -view.ox/view.s - 2, y0 = -view.oy/view.s - 2, w = W + 2*view.ox/view.s + 4, h = H + 2*view.oy/view.s + 4;
    const g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, c.sky[0]); g.addColorStop(1, c.sky[1]);
    ctx.fillStyle = g; ctx.fillRect(x0, y0, w, h);
    if (c.night){
      ctx.fillStyle = "#FFF3C4"; ctx.beginPath(); ctx.arc(820, 90, 38, 0, TAU); ctx.fill();
      ctx.fillStyle = "rgba(255,255,255,.8)"; for (let k = 0; k < 30; k++) ctx.fillRect((k*97) % 1000, (k*53) % 240 + 10, 2, 2);
    } else {
      ctx.fillStyle = "rgba(255,255,255,.85)";
      for (let k = 0; k < 5; k++){ const x = ((k*260 - cam*.08 + time*6) % 1300 + 1300) % 1300 - 150, y = 60 + (k*47) % 120; ctx.beginPath(); ctx.arc(x, y, 26, 0, TAU); ctx.arc(x + 30, y - 10, 32, 0, TAU); ctx.arc(x + 62, y, 24, 0, TAU); ctx.fill(); }
    }
    // uzak siluet
    ctx.fillStyle = c.far;
    for (let k = -2; k < 16; k++){
      const bw = 90, x = k*bw - ((cam*.3) % bw), hh = 120 + ((k + Math.floor(cam*.3/bw))*37 % 5 + 5) % 5*30;
      ctx.fillRect(x, H - 140 - hh, bw - 8, hh + 140);
    }
  }

  function drawBuilding(b, c){
    if (b.x + b.w < cam - 50 || b.x > cam + W + 50) return;
    ctx.fillStyle = b.color; ctx.fillRect(b.x, b.top, b.w, H - b.top + 10);
    ctx.fillStyle = "rgba(0,0,0,.18)"; ctx.fillRect(b.x, b.top, b.w, 14);
    ctx.fillStyle = "rgba(255,255,255,.25)"; ctx.fillRect(b.x - 6, b.top - 8, b.w + 12, 10);
    for (let y = b.top + 40; y < H; y += 62) for (let x = b.x + 30; x < b.x + b.w - 40; x += 70){
      const lit = c.night ? ((x*7 + y*3 + b.seed) % 5) > 1 : true;
      ctx.fillStyle = lit ? c.win : "rgba(20,24,50,.5)"; ctx.globalAlpha = c.night ? 1 : .7;
      ctx.fillRect(x, y, 34, 36); ctx.globalAlpha = 1;
    }
    if (b.tank){
      const tx = b.x + b.w*.25;
      ctx.fillStyle = "#8D6E63"; ctx.fillRect(tx - 4, b.top - 70, 8, 70); ctx.fillRect(tx + 40, b.top - 70, 8, 70);
      ctx.fillStyle = "#A1887F"; ctx.beginPath(); ctx.roundRect(tx - 12, b.top - 120, 68, 56, 10); ctx.fill();
      ctx.fillStyle = "#6D4C41"; ctx.beginPath(); ctx.moveTo(tx - 16, b.top - 118); ctx.lineTo(tx + 22, b.top - 146); ctx.lineTo(tx + 60, b.top - 118); ctx.fill();
    }
  }

  function drawBalloon(g, glow){
    const x = g.A.x + Math.sin(time*1.5 + g.A.x)*4, y = g.A.y;
    if (glow){
      const p = RM ? .6 : .5 + .5*Math.sin(time*7);
      ctx.fillStyle = `rgba(255,255,160,${.3 + p*.35})`; ctx.beginPath(); ctx.arc(x, y - 20, 70 + p*14, 0, TAU); ctx.fill();
    }
    ctx.strokeStyle = "rgba(0,0,0,.35)"; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(x, y + 18); ctx.quadraticCurveTo(x + 8, y + 32, x, y + 44); ctx.stroke();
    ctx.fillStyle = g.color; ctx.beginPath(); ctx.ellipse(x, y - 20, 34, 42, 0, 0, TAU); ctx.fill();
    ctx.fillStyle = "rgba(255,255,255,.5)"; ctx.beginPath(); ctx.ellipse(x - 12, y - 34, 8, 13, -.4, 0, TAU); ctx.fill();
    ctx.fillStyle = "#FFD23F"; ctx.beginPath(); ctx.arc(x, y + 44, 8, 0, TAU); ctx.lineWidth = 4; ctx.strokeStyle = "#FFD23F"; ctx.stroke();
  }

  function drawRobot(r){
    if (r.x < cam - 80 || r.x > cam + W + 80 || r.y < -200) return;
    const x = r.x, y = r.y, bob = r.state === "idle" ? Math.sin(r.t*6)*3 : 0;
    const active = r.state === "idle" && r.x > hero.x && r.x - hero.x < 620 && phase === "play";
    if (active){
      const p = RM ? .6 : .5 + .5*Math.sin(time*6);
      ctx.strokeStyle = `rgba(255,80,80,${.45 + p*.45})`; ctx.lineWidth = 6; ctx.beginPath(); ctx.arc(x, y - 42, 58 + p*8, 0, TAU); ctx.stroke();
    }
    if (r.state === "wrapped" || r.state === "hit"){
      if (r.state === "wrapped"){
        ctx.fillStyle = "#F4F7FF"; ctx.beginPath(); ctx.ellipse(x, y - 38, 34, 40, 0, 0, TAU); ctx.fill();
        ctx.strokeStyle = "#B8C3D9"; ctx.lineWidth = 2;
        for (let k = -3; k <= 3; k++){ ctx.beginPath(); ctx.ellipse(x, y - 38, 34, 40, 0, Math.PI*(.1 + k*.05), Math.PI*(.9 + k*.05)); ctx.stroke(); }
        ctx.beginPath(); for (let k = 0; k < 5; k++){ ctx.moveTo(x - 32, y - 60 + k*12); ctx.lineTo(x + 32, y - 54 + k*12); } ctx.stroke();
        ctx.fillStyle = INK; ctx.beginPath(); ctx.arc(x - 9, y - 48, 4, 0, TAU); ctx.arc(x + 9, y - 48, 4, 0, TAU); ctx.fill();
        return;
      }
    }
    ctx.save(); ctx.translate(x, y + bob);
    if (r.state === "flee"){ ctx.fillStyle = "#FF8A3D"; ctx.beginPath(); ctx.moveTo(-10, 0); ctx.lineTo(0, 30 + Math.random()*10); ctx.lineTo(10, 0); ctx.fill(); }
    ctx.fillStyle = "#6B7280"; ctx.fillRect(-14, -12, 8, 12); ctx.fillRect(6, -12, 8, 12);
    ctx.fillStyle = "#9CA3AF"; ctx.beginPath(); ctx.roundRect(-26, -62, 52, 50, 10); ctx.fill();
    ctx.fillStyle = "#D1D5DB"; ctx.beginPath(); ctx.roundRect(-18, -54, 36, 22, 8); ctx.fill();
    ctx.fillStyle = "#EF4444"; ctx.beginPath(); ctx.arc(-8, -43, 5, 0, TAU); ctx.arc(8, -43, 5, 0, TAU); ctx.fill();
    ctx.strokeStyle = "#6B7280"; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(0, -62); ctx.lineTo(0, -76); ctx.stroke();
    ctx.fillStyle = (Math.floor(time*4) % 2) ? "#FACC15" : "#EF4444"; ctx.beginPath(); ctx.arc(0, -79, 5, 0, TAU); ctx.fill();
    ctx.restore();
    emoji(r.item, x + 30, y - 70 + bob, 34);
  }

  function drawHero(){
    const x = hero.x, y = hero.y, run = hero.state === "run", sw = hero.state === "swing";
    const sq = hero.squash, sy = 1 - sq*.15, sx = 1 + sq*.12;
    ctx.save(); ctx.translate(x, y); ctx.scale(sx*HERO_S, sy*HERO_S);
    if (sw){ const g = city.gaps[hero.gap]; const ang = Math.atan2(g.A.y - (y - 56), g.A.x - x); ctx.rotate((ang + Math.PI/2)*.5); }
    const leg = run ? Math.sin(hero.anim)*12 : sw ? 10 : 0;
    ctx.lineCap = "round";
    // bacaklar
    ctx.strokeStyle = SUIT_DARK; ctx.lineWidth = 10;
    ctx.beginPath(); ctx.moveTo(-6, -22); ctx.lineTo(-6 + leg, -4); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(6, -22); ctx.lineTo(6 - leg, -4); ctx.stroke();
    ctx.fillStyle = TRIM; ctx.beginPath(); ctx.ellipse(-6 + leg + 3, -2, 8, 5, 0, 0, TAU); ctx.ellipse(6 - leg + 3, -2, 8, 5, 0, 0, TAU); ctx.fill();
    // gövde
    ctx.fillStyle = SUIT; ctx.beginPath(); ctx.roundRect(-15, -52, 30, 34, 10); ctx.fill();
    // göğüs amblemi: sarı daire ve küçük örümcek
    ctx.fillStyle = "#FFD23F"; ctx.beginPath(); ctx.arc(0, -36, 9, 0, TAU); ctx.fill();
    ctx.strokeStyle = INK; ctx.lineWidth = 1.6;
    for (const s of [-1, 1]) for (const k of [-1, 0, 1]){ ctx.beginPath(); ctx.moveTo(0, -36); ctx.lineTo(s*6, -36 + k*4); ctx.stroke(); }
    ctx.fillStyle = INK; ctx.beginPath(); ctx.arc(0, -36, 2.6, 0, TAU); ctx.fill();
    // kollar
    ctx.strokeStyle = SUIT; ctx.lineWidth = 8;
    const armUp = sw || hero.state === "wait" || hero.state === "rescue" || webs.some(w => w.t < w.dur + .1);
    ctx.beginPath(); ctx.moveTo(12, -48); ctx.lineTo(armUp ? 16 : 20, armUp ? -66 : -30 + (run ? Math.sin(hero.anim + 1)*6 : 0)); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(-12, -48); ctx.lineTo(-20, -30 - (run ? Math.sin(hero.anim)*6 : 0)); ctx.stroke();
    ctx.fillStyle = TRIM; ctx.beginPath(); ctx.arc(armUp ? 16 : 20, armUp ? -68 : -28, 5, 0, TAU); ctx.fill();
    // baş
    ctx.fillStyle = SUIT; ctx.beginPath(); ctx.arc(0, -68, 18, 0, TAU); ctx.fill();
    for (const s of [-1, 1]){
      ctx.fillStyle = "#FFFFFF"; ctx.strokeStyle = INK; ctx.lineWidth = 2.5;
      ctx.beginPath(); ctx.ellipse(s*8, -70, 6.5, 8.5, s*.35, 0, TAU); ctx.fill(); ctx.stroke();
    }
    ctx.restore();
  }

  function drawKitten(k){
    if (k.x < cam - 100 || k.x > cam + W + 100) return;
    if (k.state === "wait"){
      const b = city.buildings[city.buildings.length - 1];
      ctx.strokeStyle = "#9CA3AF"; ctx.lineWidth = 6; ctx.beginPath(); ctx.moveTo(k.x - 40, b.top); ctx.lineTo(k.x, k.y + 20); ctx.lineTo(k.x + 40, b.top); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(k.x - 25, b.top - 50); ctx.lineTo(k.x + 25, b.top - 50); ctx.stroke();
      ctx.fillStyle = "#EF4444"; ctx.beginPath(); ctx.arc(k.x, k.y + 18, 6, 0, TAU); ctx.fill();
    }
    emoji("🐱", k.x, k.y + (k.state === "wait" ? Math.sin(time*3)*3 : 0), 46);
    if (k.state === "wait" && hero.x > k.x - 700){ ctx.fillStyle = "#FFFFFF"; ctx.beginPath(); ctx.roundRect(k.x + 24, k.y - 56, 84, 36, 14); ctx.fill(); ctx.fillStyle = INK; ctx.font = "800 20px 'Baloo 2', sans-serif"; ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.fillText("Miyav!", k.x + 66, k.y - 37); }
  }

  function drawHud(){
    ctx.fillStyle = "rgba(255,255,255,.85)"; ctx.beginPath(); ctx.roundRect(14, 14, 128, 48, 16); ctx.fill();
    emoji("⭐", 42, 39, 30);
    ctx.fillStyle = INK; ctx.font = "800 28px 'Baloo 2', sans-serif"; ctx.textAlign = "left"; ctx.textBaseline = "middle"; ctx.fillText(String(starsGot), 64, 41);
    // ilerleme
    const px = 300, pw = 400, py = 38;
    ctx.fillStyle = "rgba(255,255,255,.7)"; ctx.beginPath(); ctx.roundRect(px, py - 8, pw, 16, 8); ctx.fill();
    const prog = clamp(hero.x/(city.kitten.x), 0, 1);
    ctx.fillStyle = SUIT; ctx.beginPath(); ctx.roundRect(px, py - 8, pw*prog, 16, 8); ctx.fill();
    ctx.fillStyle = SUIT; ctx.beginPath(); ctx.arc(px + pw*prog, py, 14, 0, TAU); ctx.fill();
    ctx.fillStyle = "#fff"; ctx.beginPath(); ctx.ellipse(px + pw*prog - 5, py - 1, 4, 5, -.3, 0, TAU); ctx.ellipse(px + pw*prog + 5, py - 1, 4, 5, .3, 0, TAU); ctx.fill();
    emoji("🐱", px + pw + 24, py, 30);
    for (let i = 0; i < CITIES.length; i++){ ctx.fillStyle = i < ciNow ? "#FFD23F" : i === ciNow ? "#FFFFFF" : "rgba(255,255,255,.4)"; ctx.beginPath(); ctx.arc(px + pw/2 - 36 + i*24, py + 26, 7, 0, TAU); ctx.fill(); }
    // kurtarılanlar
    rescued.forEach((r, i) => {
      const tx = W - 40 - i*46, ty = 40, t = ease(r.t);
      emoji(r.e, r.x + (tx - r.x)*t, r.y + (ty - r.y)*t, 34);
    });
  }

  function draw(){
    const d = view.dpr;
    ctx.setTransform(d, 0, 0, d, 0, 0);
    ctx.clearRect(0, 0, cv.width, cv.height);
    ctx.save(); ctx.translate(view.ox, view.oy); ctx.scale(view.s, view.s);
    const c = CITIES[city ? city.ci : 0];
    if (!city){ city = buildCity(0); hero = {x:120, y:440, state:"run", t:0, gap:0, wait:0, anim:0, squash:0}; }
    drawSky(c);
    ctx.save(); ctx.translate(-cam, 0);
    for (const b of city.buildings) drawBuilding(b, c);
    city.gaps.forEach((g, i) => { if (g.A.x > cam - 100 && g.A.x < cam + W + 100) drawBalloon(g, i === hero.gap && hero.state === "wait"); });
    for (const s of city.stars){
      if (s.got || s.x < cam - 40 || s.x > cam + W + 40) continue;
      ctx.save(); ctx.translate(s.x, s.y + Math.sin(time*3 + s.x)*4); ctx.rotate(Math.sin(time*2 + s.x)*.2);
      ctx.fillStyle = "#FFD23F"; ctx.strokeStyle = "#C99400"; ctx.lineWidth = 3; ctx.beginPath();
      for (let i = 0; i < 10; i++){ const a = -Math.PI/2 + i*Math.PI/5, r = i % 2 ? 9 : 20; i ? ctx.lineTo(Math.cos(a)*r, Math.sin(a)*r) : ctx.moveTo(Math.cos(a)*r, Math.sin(a)*r); }
      ctx.closePath(); ctx.fill(); ctx.stroke(); ctx.restore();
    }
    for (const r of city.robots) drawRobot(r);
    drawKitten(city.kitten);
    // ağlar
    ctx.strokeStyle = "#FFFFFF"; ctx.lineCap = "round";
    for (const w of webs){
      const t = Math.min(1, w.t/w.dur), ex = w.x0 + (w.x1 - w.x0)*t, ey = w.y0 + (w.y1 - w.y0)*t;
      if (w.rope) continue;
      ctx.globalAlpha = w.t > w.dur ? Math.max(0, 1 - (w.t - w.dur)/(w.life - w.dur)) : 1;
      ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(w.x0, w.y0); ctx.lineTo(ex, ey); ctx.stroke();
      if (w.ball && t < 1){ ctx.fillStyle = "#FFFFFF"; ctx.beginPath(); ctx.arc(ex, ey, 12, 0, TAU); ctx.fill(); }
      ctx.globalAlpha = 1;
    }
    // sallanma ipi
    if (hero.state === "swing"){
      const g = city.gaps[hero.gap], h = heroHand(), rope = webs.find(w => w.rope);
      const t = rope ? Math.min(1, rope.t/rope.dur) : 1;
      ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(h.x, h.y); ctx.lineTo(h.x + (g.A.x - h.x)*t, h.y + (g.A.y + 44 - h.y)*t); ctx.stroke();
    }
    if (hero.state === "rescue" || city.kitten.state === "fly"){
      const rope = webs.find(w => w.rope);
      if (rope && city.kitten.state !== "saved"){ const h = heroHand(); ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(h.x, h.y); ctx.lineTo(city.kitten.x, city.kitten.y); ctx.stroke(); }
    }
    drawHero();
    for (const p of parts){
      ctx.globalAlpha = clamp(p.life*1.5, 0, 1); ctx.fillStyle = p.c;
      if (p.sq){ ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.rot); ctx.fillRect(-p.r, -p.r/2, p.r*2, p.r); ctx.restore(); }
      else { ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, TAU); ctx.fill(); }
    }
    ctx.globalAlpha = 1;
    // bekleme ipucu: parmak
    if (phase === "play" && hero.state === "wait" && hero.wait > .6){
      const g = city.gaps[hero.gap], p = RM ? 0 : Math.sin(time*6)*8;
      emoji("👆", g.A.x + 60, g.A.y + 70 + p, 48);
    }
    ctx.restore();
    if (phase !== "intro") drawHud();
    ctx.restore();
  }

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
  if ("ResizeObserver" in window) new ResizeObserver(resize).observe(stage);
  else window.addEventListener("resize", resize);
  resize();
  requestAnimationFrame(frame);
})();
