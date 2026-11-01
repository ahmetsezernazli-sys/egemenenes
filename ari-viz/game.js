/* Arı Vız — Egemen için yol çizme oyunu: arının yolunu parmakla çiz */
(function(){
  "use strict";

  const H = 700, SAVE = "ari-viz", SOUND_KEY = "ari-viz-ses", SPEED = 270;
  const RAINBOW = ["#E4483B", "#C98F00", "#2A64C0", "#1E8A41", "#6E36B8"];
  const PETALS = ["#FF6B9A", "#FF8C42", "#B77DFF", "#FF5A5F", "#4CC9F0", "#FFFFFF"];
  const TAU = Math.PI*2;
  // bölümler: çiçek sayısı, ağ sayısı, kesik çizgili ipucu
  const LEVELS = [
    {fl:1, web:0, guide:true}, {fl:2, web:0, guide:true}, {fl:2, web:0, guide:false}, {fl:3, web:0, guide:false},
    {fl:2, web:1, guide:true}, {fl:3, web:1, guide:false}, {fl:3, web:2, guide:false}, {fl:4, web:2, guide:false},
    {fl:4, web:3, guide:false}, {fl:5, web:3, guide:false}
  ];

  const $ = id => document.getElementById(id);
  const stage = $("stage"), cv = $("cv"), ctx = cv.getContext("2d");
  const rand = (a, b) => a + Math.random()*(b - a);
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
  const RM = window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches;

  let soundOn = true, best = [];
  try { soundOn = localStorage.getItem(SOUND_KEY) !== "0"; } catch(e) {}
  try { best = JSON.parse(localStorage.getItem(SAVE) || "{}").stars || []; } catch(e) { best = []; }
  const persist = () => { try { localStorage.setItem(SAVE, JSON.stringify({stars:best})); } catch(e) {} };

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
  let ac = null, buzz = null;
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
  function setBuzz(on){
    const a = ac; if (!a) return;
    if (!buzz){
      const o = a.createOscillator(), lfo = a.createOscillator(), lg = a.createGain(), g = a.createGain(), f = a.createBiquadFilter();
      o.type = "sawtooth"; o.frequency.value = 190; lfo.frequency.value = 22; lg.gain.value = 18;
      lfo.connect(lg).connect(o.frequency); f.type = "lowpass"; f.frequency.value = 900; g.gain.value = 0;
      o.connect(f).connect(g).connect(a.destination); o.start(); lfo.start(); buzz = g;
    }
    buzz.gain.setTargetAtTime(on && soundOn ? .035 : 0, a.currentTime, .05);
  }
  const sfx = {
    flower(){ [880, 1175, 1568].forEach((f, i) => tone(f, .14, "triangle", .09, null, i*.06)); },
    web(){ tone(300, .3, "sine", .12, 150); },
    home(){ [523.25, 659.25, 783.99, 1046.5].forEach((f, i) => tone(f, .22, "triangle", .12, null, i*.1)); },
    no(){ tone(260, .18, "sine", .1, 200); },
    party(){ [523.25, 659.25, 783.99, 1046.5, 1318.5].forEach((f, i) => tone(f, .3, "triangle", .14, null, i*.12)); }
  };
  const canSpeak = "speechSynthesis" in window;
  let trVoice = null;
  function pickVoice(){ trVoice = speechSynthesis.getVoices().find(v => /^tr(-|_|$)/i.test(v.lang)) || null; }
  if (canSpeak){ pickVoice(); if (speechSynthesis.addEventListener) speechSynthesis.addEventListener("voiceschanged", pickVoice); }
  function say(text){
    if (!canSpeak || !soundOn || !trVoice) return;
    speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text); u.voice = trVoice; u.lang = trVoice.lang; u.rate = .95; u.pitch = 1.2;
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
    if (!soundOn){ if (canSpeak) speechSynthesis.cancel(); setBuzz(false); }
    renderSound();
  });
  renderSound();

  /* ---------- ekran ---------- */
  let W = 1000;
  const view = {s:1, ox:0, oy:0, dpr:1};
  function resize(){
    const r = stage.getBoundingClientRect(); if (!r.width || !r.height) return;
    view.dpr = Math.min(window.devicePixelRatio || 1, 2);
    cv.width = Math.round(r.width*view.dpr); cv.height = Math.round(r.height*view.dpr);
    const nw = clamp(H*r.width/r.height, 480, 1400);
    if (S && Math.abs(nw - W) > 1) relayout(nw / W);
    W = nw;
    view.s = Math.min(r.width/W, r.height/H); view.ox = (r.width - W*view.s)/2; view.oy = (r.height - H*view.s)/2;
  }
  function toLogical(e){
    const r = cv.getBoundingClientRect();
    return {x:(e.clientX - r.left - view.ox)/view.s, y:(e.clientY - r.top - view.oy)/view.s};
  }

  /* ---------- oyun durumu ---------- */
  let phase = "intro", level = 0, S = null, time = 0, mistakes = 0, timers = [];
  const later = (s, fn) => timers.push({t:s, fn});

  function relayout(k){
    // genişlik değişince yatay konumları ölçekle
    const fx = p => { p.x *= k; };
    fx(S.start); fx(S.hive); S.flowers.forEach(fx); S.webs.forEach(fx); S.guide.forEach(fx);
    S.bee.x *= k; S.path.forEach(fx);
  }
  function placeLevel(){
    const L = LEVELS[level];
    for (let tries = 0; tries < 400; tries++){
      const portrait = W < 760;
      const start = portrait ? {x:W*.22, y:H*.84} : {x:W*.1, y:rand(H*.3, H*.75)};
      const hive = portrait ? {x:W*.78, y:H*.16} : {x:W*.9, y:rand(H*.25, H*.75)};
      const pts = [start, hive], flowers = [], webs = [];
      const ok = (p, d) => pts.every(q => dist(p, q) > d) && p.x > 60 && p.x < W - 60 && p.y > 90 && p.y < H - 60;
      for (let i = 0; i < L.fl; i++){
        let p, n = 0;
        do { p = {x:rand(W*.18, W*.82), y:rand(110, H - 80)}; } while (!ok(p, 150) && ++n < 80);
        if (n >= 80) break;
        flowers.push(Object.assign(p, {c:PETALS[i % PETALS.length], got:false, joy:0})); pts.push(p);
      }
      if (flowers.length < L.fl) continue;
      // ziyaret sırası: başlangıçtan en yakına doğru
      const order = []; let cur = start, left = flowers.slice();
      while (left.length){ left.sort((a, b) => dist(cur, a) - dist(cur, b)); cur = left.shift(); order.push(cur); }
      const route = [start, ...order, hive];
      for (let i = 0; i < L.web; i++){
        let p, n = 0;
        do { p = {x:rand(W*.2, W*.8), y:rand(110, H - 80), r:46}; } while ((!ok(p, 120) || routeNear(route, p) < 40) && ++n < 120);
        if (n >= 120) break;
        webs.push(p); pts.push(p);
      }
      if (webs.length < L.web) continue;
      // ağlar ipucu yolunu kesmesin
      if (webs.some(w => routeNear(route, w) < w.r + 30)) continue;
      return {start, hive, flowers, webs, guide:smooth(route)};
    }
    return null;
  }
  function routeNear(route, p){
    let m = 1e9;
    for (let i = 0; i < route.length - 1; i++){
      const a = route[i], b = route[i + 1], dx = b.x - a.x, dy = b.y - a.y, l2 = dx*dx + dy*dy;
      const t = clamp(((p.x - a.x)*dx + (p.y - a.y)*dy)/l2, 0, 1);
      m = Math.min(m, Math.hypot(a.x + dx*t - p.x, a.y + dy*t - p.y));
    }
    return m;
  }
  function smooth(route){
    const out = [];
    for (let i = 0; i < route.length - 1; i++){
      const a = route[i], b = route[i + 1], n = Math.ceil(dist(a, b)/14);
      for (let k = 0; k < n; k++) out.push({x:a.x + (b.x - a.x)*k/n, y:a.y + (b.y - a.y)*k/n});
    }
    out.push({x:route[route.length - 1].x, y:route[route.length - 1].y});
    return out;
  }

  function startLevel(i){
    level = clamp(i, 0, LEVELS.length - 1);
    let p = null; while (!p) p = placeLevel();
    S = Object.assign(p, {bee:{x:p.start.x, y:p.start.y, a:0}, path:[], drawing:false, fly:null, idle:0, sparks:[], showGuide:LEVELS[level].guide});
    mistakes = 0; timers = []; phase = "play";
    $("intro").hidden = true; $("done").hidden = true; $("party").hidden = true;
    const n = S.flowers.length;
    say(level === 0 ? "Arının üstüne parmağını koy, çiçeğe ve kovana kadar bir yol çiz!" :
      S.webs.length ? `${n} çiçekten bal topla, örümcek ağlarından kaçın, sonra kovana dön!` : `${n} çiçekten bal topla, sonra kovana dön!`);
  }
  function resetBee(msg){
    S.fly = null; S.path = [];
    S.bee.x = S.start.x; S.bee.y = S.start.y;
    S.flowers.forEach(f => { f.got = false; });
    setBuzz(false);
    if (msg) say(msg);
  }

  /* ---------- giriş: yol çizme ---------- */
  cv.addEventListener("pointerdown", e => {
    audio();
    if (phase !== "play" || S.fly) return;
    const p = toLogical(e);
    S.idle = 0;
    if (dist(p, S.bee) > 90){ sfx.no(); S.beeGlow = 1.2; say("Arıdan başla!"); return; }
    S.drawing = true; S.path = [{x:S.bee.x, y:S.bee.y}, p];
    try { cv.setPointerCapture(e.pointerId); } catch(_) {}
  });
  cv.addEventListener("pointermove", e => {
    if (!S || !S.drawing) return;
    const p = toLogical(e), last = S.path[S.path.length - 1];
    if (dist(p, last) >= 8) S.path.push({x:clamp(p.x, 10, W - 10), y:clamp(p.y, 10, H - 10)});
  });
  const endDraw = () => {
    if (!S || !S.drawing) return;
    S.drawing = false;
    if (S.path.length < 4){ S.path = []; return; }
    S.fly = {i:0, t:0}; setBuzz(true);
  };
  cv.addEventListener("pointerup", endDraw); cv.addEventListener("pointercancel", endDraw);

  /* ---------- güncelle ---------- */
  function update(dt){
    time += dt;
    for (let i = timers.length - 1; i >= 0; i--){ const tk = timers[i]; tk.t -= dt; if (tk.t <= 0){ timers.splice(i, 1); tk.fn(); } }
    if (!S) return;
    for (let i = S.sparks.length - 1; i >= 0; i--){ const p = S.sparks[i]; p.life -= dt; p.x += p.vx*dt; p.y += p.vy*dt; p.vy += 120*dt; if (p.life <= 0) S.sparks.splice(i, 1); }
    S.flowers.forEach(f => { f.joy = Math.max(0, f.joy - dt); });
    S.beeGlow = Math.max(0, (S.beeGlow || 0) - dt);
    if (phase !== "play") return;
    if (!S.fly && !S.drawing){
      S.idle += dt;
      if (S.idle > 9 && !S.showGuide){ S.showGuide = true; say("Kesik çizgileri takip edebilirsin."); }
    }
    if (!S.fly) return;
    // yol boyunca ilerle
    let move = SPEED*dt;
    while (move > 0 && S.fly){
      const a = S.path[S.fly.i], b = S.path[S.fly.i + 1];
      if (!b){ arrive(); break; }
      const seg = dist(a, b), rem = seg*(1 - S.fly.t);
      if (move < rem){ S.fly.t += move/seg; move = 0; }
      else { move -= rem; S.fly.i++; S.fly.t = 0; }
      const p = S.path[S.fly.i], q = S.path[S.fly.i + 1] || p;
      S.bee.x = p.x + (q.x - p.x)*S.fly.t; S.bee.y = p.y + (q.y - p.y)*S.fly.t;
      if (q !== p) S.bee.a = Math.atan2(q.y - p.y, q.x - p.x);
      // çiçek ve ağ kontrolü
      for (const f of S.flowers) if (!f.got && dist(f, S.bee) < 52){
        f.got = true; f.joy = 1; sfx.flower();
        for (let k = 0; k < 10; k++){ const an = rand(0, TAU); S.sparks.push({x:f.x, y:f.y, vx:Math.cos(an)*rand(40, 140), vy:Math.sin(an)*rand(40, 140) - 60, life:.7, c:"#FFE14D", r:rand(2, 4)}); }
      }
      const w = S.webs.find(w => dist(w, S.bee) < w.r + 14);
      if (w){
        sfx.web(); mistakes++; S.fly = null; setBuzz(false);
        S.stuck = 1;
        later(.9, () => { S.stuck = 0; resetBee("Ah, örümcek ağı! Ağın yanından dolaşarak tekrar dene."); });
        break;
      }
      if (dist(S.hive, S.bee) < 46 && S.flowers.every(f => f.got)){ arrive(); break; }
    }
  }
  function arrive(){
    S.fly = null; setBuzz(false);
    const home = dist(S.hive, S.bee) < 70, all = S.flowers.every(f => f.got);
    if (home && all){
      S.bee.x = S.hive.x; S.bee.y = S.hive.y; phase = "won"; sfx.home();
      say(level === LEVELS.length - 1 ? "Yaşasın! Kovan balla doldu!" : "Aferin! Bal kovana ulaştı!");
      later(1.4, finishLevel);
      return;
    }
    mistakes++; sfx.no();
    const missing = S.flowers.filter(f => !f.got).length;
    const msg = !all ? (missing === 1 ? "Bir çiçek unutuldu. Bütün çiçeklerin yanından geç!" : `${missing} çiçek unutuldu. Bütün çiçeklerin yanından geç!`) : "Yolun sonu kovanda bitmeli. Kovana kadar çiz!";
    later(.6, () => resetBee(msg));
  }
  function starsNow(){ return mistakes === 0 ? 3 : mistakes <= 2 ? 2 : 1; }
  function finishLevel(){
    const s = starsNow();
    best[level] = Math.max(best[level] || 0, s); persist(); renderLevels();
    if (level === LEVELS.length - 1){
      phase = "party"; $("party").hidden = false; sfx.party(); say("Aferin Egemen! Bütün arılar evde!");
      return;
    }
    phase = "done";
    [...$("stars").children].forEach((el, i) => { el.className = ""; void el.offsetWidth; if (i < s) el.className = "on"; });
    $("stars").setAttribute("aria-label", s + " yıldız");
    $("done").hidden = false; sfx.party();
  }

  /* ---------- çizim ---------- */
  function drawFlower(f){
    const s = 1 + (f.joy ? Math.sin(f.joy*12)*.12 : 0);
    ctx.save(); ctx.translate(f.x, f.y); ctx.scale(s, s);
    ctx.strokeStyle = "#3E9B4A"; ctx.lineWidth = 6; ctx.beginPath(); ctx.moveTo(0, 10); ctx.quadraticCurveTo(6, 40, 0, 60); ctx.stroke();
    ctx.fillStyle = "#56B85E"; ctx.beginPath(); ctx.ellipse(10, 44, 12, 6, -.5, 0, TAU); ctx.fill();
    ctx.fillStyle = f.c;
    for (let i = 0; i < 6; i++){ const a = i*TAU/6 + (RM ? 0 : Math.sin(time*1.5)*.05); ctx.beginPath(); ctx.ellipse(Math.cos(a)*17, Math.sin(a)*17, 13, 9, a, 0, TAU); ctx.fill(); }
    ctx.fillStyle = f.got ? "#FFB300" : "#FFE14D"; ctx.beginPath(); ctx.arc(0, 0, 12, 0, TAU); ctx.fill();
    if (f.got){ ctx.fillStyle = "#7A4A00"; ctx.beginPath(); ctx.arc(-4, -2, 2, 0, TAU); ctx.arc(4, -2, 2, 0, TAU); ctx.fill(); ctx.strokeStyle = "#7A4A00"; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(0, 2, 5, .2, Math.PI - .2); ctx.stroke(); }
    ctx.restore();
  }
  function drawWeb(w){
    ctx.save(); ctx.translate(w.x, w.y);
    ctx.strokeStyle = "rgba(255,255,255,.9)"; ctx.lineWidth = 2;
    for (let i = 0; i < 8; i++){ const a = i*TAU/8; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(Math.cos(a)*w.r, Math.sin(a)*w.r); ctx.stroke(); }
    for (let r = 12; r <= w.r; r += 11){ ctx.beginPath(); for (let i = 0; i <= 8; i++){ const a = i*TAU/8; i ? ctx.lineTo(Math.cos(a)*r, Math.sin(a)*r) : ctx.moveTo(Math.cos(a)*r, Math.sin(a)*r); } ctx.stroke(); }
    // örümcek
    const bob = RM ? 0 : Math.sin(time*2)*4;
    ctx.fillStyle = "#2A2540"; ctx.beginPath(); ctx.arc(0, bob, 9, 0, TAU); ctx.fill();
    ctx.strokeStyle = "#2A2540"; ctx.lineWidth = 2.5;
    for (const sx of [-1, 1]) for (let k = 0; k < 3; k++){ ctx.beginPath(); ctx.moveTo(sx*6, bob - 3 + k*4); ctx.lineTo(sx*15, bob - 9 + k*7); ctx.lineTo(sx*19, bob - 2 + k*7); ctx.stroke(); }
    ctx.fillStyle = "#fff"; ctx.beginPath(); ctx.arc(-3, bob - 2, 2.2, 0, TAU); ctx.arc(3, bob - 2, 2.2, 0, TAU); ctx.fill();
    ctx.restore();
  }
  function drawHive(h){
    ctx.save(); ctx.translate(h.x, h.y);
    ctx.fillStyle = "#7A5230"; ctx.fillRect(-4, -60, 8, 22);
    const rows = [[-30, 30, 0], [-38, 38, 16], [-42, 42, 32], [-36, 36, 48], [-26, 26, 62]];
    rows.forEach(([a, b, y], i) => { ctx.fillStyle = i % 2 ? "#E8A92C" : "#F5BD3C"; ctx.beginPath(); ctx.roundRect(a, y - 40, b - a, 16, 8); ctx.fill(); });
    ctx.fillStyle = "#5A3A10"; ctx.beginPath(); ctx.ellipse(0, 10, 10, 8, 0, 0, TAU); ctx.fill();
    ctx.restore();
  }
  function drawBee(b, glow){
    ctx.save(); ctx.translate(b.x, b.y);
    if (glow){ ctx.fillStyle = `rgba(255,225,77,${.3 + .3*Math.sin(time*12)})`; ctx.beginPath(); ctx.arc(0, 0, 44, 0, TAU); ctx.fill(); }
    const face = Math.cos(b.a) < 0 ? -1 : 1;
    ctx.scale(face, 1);
    const flap = RM ? 0 : Math.sin(time*40)*.35;
    ctx.fillStyle = "rgba(255,255,255,.85)";
    ctx.save(); ctx.rotate(-.4 + flap); ctx.beginPath(); ctx.ellipse(-4, -20, 10, 16, 0, 0, TAU); ctx.fill(); ctx.restore();
    ctx.save(); ctx.rotate(.2 - flap); ctx.beginPath(); ctx.ellipse(6, -20, 9, 14, 0, 0, TAU); ctx.fill(); ctx.restore();
    ctx.fillStyle = "#FFC529"; ctx.beginPath(); ctx.ellipse(0, 0, 24, 17, 0, 0, TAU); ctx.fill();
    ctx.save(); ctx.beginPath(); ctx.ellipse(0, 0, 24, 17, 0, 0, TAU); ctx.clip();
    ctx.fillStyle = "#2A2540"; ctx.fillRect(-10, -20, 7, 40); ctx.fillRect(2, -20, 7, 40); ctx.restore();
    ctx.fillStyle = "#2A2540"; ctx.beginPath(); ctx.moveTo(-24, -3); ctx.lineTo(-32, 0); ctx.lineTo(-24, 3); ctx.fill();
    ctx.fillStyle = "#fff"; ctx.beginPath(); ctx.arc(15, -4, 5, 0, TAU); ctx.fill();
    ctx.fillStyle = "#2A2540"; ctx.beginPath(); ctx.arc(16.5, -4, 2.6, 0, TAU); ctx.fill();
    ctx.strokeStyle = "#2A2540"; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(18, -14); ctx.quadraticCurveTo(22, -24, 28, -24); ctx.stroke();
    ctx.restore();
  }
  function draw(){
    const d = view.dpr;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = "#BFE6FF"; ctx.fillRect(0, 0, cv.width, cv.height);
    ctx.setTransform(d*view.s, 0, 0, d*view.s, d*view.ox, d*view.oy);
    // gökyüzü, tepeler, çimen
    const sky = ctx.createLinearGradient(0, 0, 0, H); sky.addColorStop(0, "#BFE6FF"); sky.addColorStop(1, "#E8F7FF");
    ctx.fillStyle = sky; ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = "rgba(255,255,255,.8)";
    for (const [cx, cy, s] of [[.18, 70, 1], [.62, 50, .8], [.86, 110, .7]]){ const x = W*cx + (RM ? 0 : Math.sin(time*.1 + cx*9)*20); ctx.beginPath(); ctx.ellipse(x, cy, 50*s, 20*s, 0, 0, TAU); ctx.ellipse(x + 30*s, cy - 12*s, 34*s, 22*s, 0, 0, TAU); ctx.fill(); }
    ctx.fillStyle = "#A8DB8A"; ctx.beginPath(); ctx.ellipse(W*.25, H + 40, W*.45, 220, 0, 0, TAU); ctx.fill();
    ctx.fillStyle = "#94D075"; ctx.beginPath(); ctx.ellipse(W*.8, H + 60, W*.45, 240, 0, 0, TAU); ctx.fill();
    if (!S) return;
    // ipucu yolu
    if (S.showGuide && phase === "play" && !S.fly){
      ctx.strokeStyle = "rgba(255,255,255,.9)"; ctx.lineWidth = 8; ctx.lineCap = "round"; ctx.setLineDash([2, 20]);
      ctx.lineDashOffset = RM ? 0 : -time*30;
      ctx.beginPath(); S.guide.forEach((p, i) => i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)); ctx.stroke();
      ctx.setLineDash([]);
    }
    S.webs.forEach(drawWeb);
    drawHive(S.hive);
    S.flowers.forEach(drawFlower);
    // çizilen yol
    if (S.path.length > 1){
      ctx.strokeStyle = "rgba(255,197,41,.9)"; ctx.lineWidth = 10; ctx.lineCap = "round"; ctx.lineJoin = "round";
      ctx.setLineDash(S.fly ? [14, 12] : []);
      ctx.beginPath(); S.path.forEach((p, i) => i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)); ctx.stroke(); ctx.setLineDash([]);
    }
    for (const p of S.sparks){ ctx.globalAlpha = clamp(p.life*1.5, 0, 1); ctx.fillStyle = p.c; ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, TAU); ctx.fill(); }
    ctx.globalAlpha = 1;
    const shake = S.stuck ? Math.sin(time*50)*4 : 0;
    drawBee({x:S.bee.x + shake, y:S.bee.y + (S.fly || RM ? 0 : Math.sin(time*3)*4), a:S.bee.a}, phase === "play" && !S.fly && !S.drawing && (S.idle > 3 || S.beeGlow > 0 || S.path.length === 0 && level === 0));
    // üst bilgi
    for (let i = 0; i < LEVELS.length; i++){
      ctx.fillStyle = i === level ? "#FFC529" : i < level ? "#FFFFFF" : "rgba(255,255,255,.5)";
      ctx.beginPath(); ctx.arc(24 + i*22, 24, i === level ? 8 : 6, 0, TAU); ctx.fill();
    }
    S.flowers.forEach((f, i) => {
      ctx.globalAlpha = f.got ? 1 : .35;
      ctx.fillStyle = "#FFB300"; ctx.beginPath(); ctx.arc(W - 26 - i*30, 26, 10, 0, TAU); ctx.fill();
      ctx.fillStyle = "#fff"; ctx.beginPath(); ctx.arc(W - 29 - i*30, 23, 3, 0, TAU); ctx.fill();
    });
    ctx.globalAlpha = 1;
  }

  /* ---------- menüler ---------- */
  function renderLevels(){
    const box = $("levels"); box.textContent = "";
    LEVELS.forEach((L, i) => {
      const b = document.createElement("button");
      b.type = "button"; b.className = "lvl";
      b.setAttribute("aria-label", `Bölüm ${i + 1}, ${L.fl} çiçek${L.web ? ", " + L.web + " ağ" : ""}${best[i] ? ", " + best[i] + " yıldız" : ""}`);
      b.innerHTML = `<span class="ic" aria-hidden="true">${L.web ? "🕸️" : "🌸"}</span>${i + 1}<small aria-hidden="true">${"★".repeat(best[i] || 0)}</small>`;
      b.addEventListener("click", () => { audio(); startLevel(i); });
      box.appendChild(b);
    });
  }
  function showIntro(){
    phase = "intro"; timers = []; if (S){ S.fly = null; S.path = []; } setBuzz(false);
    if (canSpeak) speechSynthesis.cancel();
    $("intro").hidden = false; $("done").hidden = true; $("party").hidden = true;
  }
  $("play").addEventListener("click", () => { audio(); const i = LEVELS.findIndex((_, k) => !best[k]); startLevel(i < 0 ? 0 : i); });
  $("next").addEventListener("click", () => { audio(); startLevel(level + 1); });
  $("replay").addEventListener("click", () => { audio(); startLevel(level); });
  $("again").addEventListener("click", () => { audio(); showIntro(); });
  $("menu").addEventListener("click", () => { audio(); showIntro(); });
  document.addEventListener("visibilitychange", () => { if (document.hidden){ if (canSpeak) speechSynthesis.cancel(); setBuzz(false); } last = performance.now(); });

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

  // test kancası
  window.__av = { LEVELS, startLevel, update, get view(){ return Object.assign({W}, view); }, get S(){ return S; }, get phase(){ return phase; }, get mistakes(){ return mistakes; },
    flyPath: (pts) => { S.path = pts; S.fly = {i:0, t:0}; } };

  if ("ResizeObserver" in window) new ResizeObserver(resize).observe(stage);
  else window.addEventListener("resize", resize);
  resize();
  renderLevels();
  startLevel(0); phase = "intro"; $("intro").hidden = false; if (canSpeak) speechSynthesis.cancel();
  requestAnimationFrame(frame);
})();
