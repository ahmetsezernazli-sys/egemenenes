/* Balon Bahçesi — 5 yaş için renk ve sayı oyunu */
(function(){
  "use strict";

  // Her rengin bir de şekli var: renkleri ayırt etmekte zorlanan çocuklar şekilden de bulabilir.
  const COLORS = [
    {name:"kırmızı", fill:"#F0453A", dark:"#B8281F", shape:"heart"},
    {name:"sarı",    fill:"#FFC529", dark:"#C98F00", shape:"star"},
    {name:"mavi",    fill:"#2F80ED", dark:"#1B5BB8", shape:"circle"},
    {name:"yeşil",   fill:"#2DB75A", dark:"#1E8A41", shape:"triangle"},
    {name:"mor",     fill:"#9B5DE5", dark:"#6E36B8", shape:"square"}
  ];
  const NUMS = ["bir","iki","üç","dört","beş","altı","yedi","sekiz","dokuz","on","on bir","on iki"];
  const GOAL = 12;        // kutlama için gereken yıldız
  const PER_TARGET = 3;   // kaç balondan sonra renk değişir
  const NOTES = [523.25,587.33,659.25,783.99,880,1046.5,1174.66,1318.51,1567.98,1760,2093,2349.32];
  const SOUND_KEY = "balon-bahcesi-ses";
  const RM = window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches;

  const $ = id => document.getElementById(id);
  const stage = $("stage"), cv = $("cv"), ctx = cv.getContext("2d");

  let W = 0, H = 0, dpr = 1;
  let mode = "intro"; // intro | play | ending | party
  let balloons = [], parts = [], flyers = [];
  const clouds = [];
  let target = 0, stars = 0, starsShown = 0, roundCount = 0, hint = null;
  let t = 0, last = performance.now(), spawnTimer = 0, sinceTarget = 0, lastCorrectAt = 0, cloudBounce = 0, partyTimer = 0;
  const slotPop = new Array(GOAL).fill(0);
  let soundOn = true;
  try { soundOn = localStorage.getItem(SOUND_KEY) !== "0"; } catch(e) {}

  const clamp = (v,a,b) => Math.max(a, Math.min(b, v));
  const rand = (a,b) => a + Math.random()*(b-a);
  const cap = s => s.charAt(0).toLocaleUpperCase("tr") + s.slice(1);
  const hillH = () => clamp(H*.16, 70, 130);
  const balloonR = () => clamp(Math.min(W,H)*.075, 34, 62);
  const maxBalloons = () => Math.round(clamp(W/130, 4, 9));

  /* ---------- rengarenk başlıklar ---------- */
  document.querySelectorAll("[data-rainbow]").forEach(el => {
    const text = el.textContent.trim(); el.textContent = ""; el.setAttribute("aria-label", text);
    let k = 0;
    for (const ch of text){
      const s = document.createElement("span");
      s.textContent = ch; s.setAttribute("aria-hidden", "true");
      if (ch.trim()) s.style.color = COLORS[k++ % COLORS.length].dark;
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
  function tone(freq, delay, dur, type, vol){
    const a = audio(); if (!a || !soundOn) return;
    const n = a.currentTime + delay, o = a.createOscillator(), g = a.createGain();
    o.type = type || "sine"; o.frequency.setValueAtTime(freq, n);
    g.gain.setValueAtTime(.0001, n);
    g.gain.exponentialRampToValueAtTime(vol || .2, n + .015);
    g.gain.exponentialRampToValueAtTime(.0001, n + dur);
    o.connect(g).connect(a.destination); o.start(n); o.stop(n + dur + .05);
  }
  function popSound(){
    const a = audio(); if (!a || !soundOn) return;
    const len = Math.floor(a.sampleRate*.12), buf = a.createBuffer(1, len, a.sampleRate), d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = (Math.random()*2 - 1) * Math.pow(1 - i/len, 3);
    const src = a.createBufferSource(); src.buffer = buf;
    const f = a.createBiquadFilter(); f.type = "bandpass"; f.frequency.value = 1400; f.Q.value = .8;
    const g = a.createGain(); g.gain.value = .6;
    src.connect(f).connect(g).connect(a.destination); src.start();
  }
  function boop(){
    const a = audio(); if (!a || !soundOn) return;
    const n = a.currentTime, o = a.createOscillator(), g = a.createGain();
    o.type = "sine"; o.frequency.setValueAtTime(320, n); o.frequency.exponentialRampToValueAtTime(170, n + .22);
    g.gain.setValueAtTime(.0001, n); g.gain.exponentialRampToValueAtTime(.22, n + .02); g.gain.exponentialRampToValueAtTime(.0001, n + .28);
    o.connect(g).connect(a.destination); o.start(n); o.stop(n + .3);
  }
  function chime(i){ const f = NOTES[i % NOTES.length]; tone(f, 0, .3, "triangle", .2); tone(f*1.5, .07, .3, "sine", .08); }
  function fanfare(){
    [523.25, 659.25, 783.99, 1046.5].forEach((f, i) => tone(f, i*.13, .3, "triangle", .2));
    [523.25, 659.25, 783.99, 1046.5].forEach(f => tone(f, .6, 1.1, "sine", .09));
  }

  // Türkçe sesli yönlendirme (cihazda Türkçe ses yoksa sessiz kalır, oyun görsel olarak yine oynanır)
  const canSpeak = "speechSynthesis" in window;
  let trVoice = null;
  function pickVoice(){ const vs = speechSynthesis.getVoices(); trVoice = vs.find(v => /^tr(-|_|$)/i.test(v.lang)) || null; }
  if (canSpeak){ pickVoice(); speechSynthesis.addEventListener && speechSynthesis.addEventListener("voiceschanged", pickVoice); }
  function say(text, interrupt){
    if (!canSpeak || !soundOn || !trVoice) return;
    if (interrupt) speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.voice = trVoice; u.lang = trVoice.lang; u.rate = .95; u.pitch = 1.15;
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

  /* ---------- oyun akışı ---------- */
  function pickOther(){ let c; do { c = Math.random()*COLORS.length | 0; } while (c === target); return c; }

  function spawn(forceTarget){
    const r = balloonR() * rand(.9, 1.1);
    const c = mode === "intro" ? (Math.random()*COLORS.length | 0)
            : (forceTarget || Math.random() < .5) ? target : pickOther();
    const margin = r + 10;
    let x, tries = 0;
    do { x = rand(margin, Math.max(margin, W - margin)); tries++; }
    while (tries < 8 && balloons.some(b => Math.abs(b.baseX - x) < r*2.1 && b.y > H*.55));
    balloons.push({baseX:x, x, y:H + r*1.3 + 10, r, c, vy:rand(38, 66)*Math.max(.8, H/700), phase:rand(0, 6.28), sway:rand(6, 16), shake:0});
    if (c === target) sinceTarget = 0;
  }

  function start(){
    audio();
    $("intro").hidden = true; $("party").hidden = true;
    stars = 0; starsShown = 0; roundCount = 0; flyers = []; slotPop.fill(0);
    target = Math.random()*COLORS.length | 0;
    mode = "play"; lastCorrectAt = t; sinceTarget = 99; cloudBounce = 1;
    tone(659.25, 0, .15, "triangle", .15); tone(987.77, .1, .22, "triangle", .15);
    say(cap(COLORS[target].name) + " balonları patlat!", true);
  }

  function newTarget(){
    target = pickOther();
    cloudBounce = 1; lastCorrectAt = t; sinceTarget = 99;
    tone(783.99, .25, .15, "sine", .12); tone(1174.66, .35, .2, "sine", .12);
    say("Şimdi " + COLORS[target].name + " balonlar!", false);
  }

  function party(){
    mode = "party"; partyTimer = 3;
    fanfare(); confetti(RM ? 30 : 80);
    say("Aferin Egemen! Harikasın!", true);
    $("party").hidden = false;
    $("again").focus({preventScroll:true});
  }

  function slotPos(i){
    const sp = Math.min(46, (W - 32)/GOAL);
    return {x: W/2 - sp*(GOAL-1)/2 + i*sp, y: H - hillH()*.32, R: sp*.4};
  }

  function tap(px, py){
    if (mode !== "play") return;
    for (let i = balloons.length - 1; i >= 0; i--){
      const b = balloons[i];
      const dx = (px - b.x)/(b.r*1.25), dy = (py - b.y)/(b.r*1.35);
      if (dx*dx + dy*dy > 1 || b.y > H - hillH()*.5) continue;

      if (b.c === target){
        balloons.splice(i, 1);
        burst(b); popSound();
        const slot = stars; stars++; roundCount++; lastCorrectAt = t;
        chime(slot);
        const p = slotPos(slot);
        flyers.push({x0:b.x, y0:b.y, x1:p.x, y1:p.y, slot, u:0});
        say(cap(NUMS[slot]) + "!", true);
        if (stars >= GOAL){ mode = "ending"; setTimeout(party, 1100); }
        else if (roundCount >= PER_TARGET){ roundCount = 0; newTarget(); }
      } else {
        // yanlış renk: ceza yok, balon sallanır ve bulut rengi hatırlatır
        b.shake = .5; cloudBounce = 1; boop();
        say(cap(COLORS[target].name) + "!", true);
      }
      return;
    }
  }

  cv.addEventListener("pointerdown", e => {
    e.preventDefault();
    const r = cv.getBoundingClientRect();
    tap(e.clientX - r.left, e.clientY - r.top);
  });
  cv.addEventListener("contextmenu", e => e.preventDefault());
  $("play").addEventListener("click", start);
  $("again").addEventListener("click", start);

  /* ---------- parçacıklar ---------- */
  function burst(b){
    const col = COLORS[b.c];
    for (let i = 0; i < 14; i++){
      const a = Math.random()*Math.PI*2, sp = rand(140, 340);
      parts.push({k:"shard", x:b.x, y:b.y, vx:Math.cos(a)*sp, vy:Math.sin(a)*sp - 60, life:rand(.45, .7), max:.7,
        color: i % 3 ? col.fill : col.dark, size:rand(5, 10)*b.r/50, rot:rand(0, 6), vr:rand(-8, 8)});
    }
    parts.push({k:"ring", x:b.x, y:b.y, r:b.r, life:.3, max:.3});
  }
  function confetti(n){
    for (let i = 0; i < n; i++){
      parts.push({k:"conf", x:rand(0, W), y:rand(-60, -10), vx:rand(-30, 30), vy:rand(90, 200), life:rand(3, 4.5), max:4.5,
        color:COLORS[Math.random()*COLORS.length | 0].fill, size:rand(7, 12), rot:rand(0, 6), vr:rand(-5, 5)});
    }
  }

  /* ---------- güncelleme ---------- */
  function update(dt){
    t += dt;
    cloudBounce = Math.max(0, cloudBounce - dt*2.5);
    for (let i = 0; i < GOAL; i++) slotPop[i] = Math.max(0, slotPop[i] - dt*3);

    spawnTimer -= dt; sinceTarget += dt;
    if (spawnTimer <= 0 && balloons.length < maxBalloons()){ spawn(false); spawnTimer = rand(.7, 1.3); }
    if (mode === "play" && sinceTarget > 1.6 && balloons.length < maxBalloons() + 2 &&
        !balloons.some(b => b.c === target && b.y > H*.2)) spawn(true);

    for (const b of balloons){
      b.y -= b.vy*dt;
      b.shake = Math.max(0, b.shake - dt);
      b.x = b.baseX + Math.sin(b.phase + t*1.1)*b.sway + (b.shake > 0 ? Math.sin(t*50)*12*(b.shake/.5) : 0);
    }
    balloons = balloons.filter(b => b.y + b.r*3 > -20);

    hint = null;
    if (mode === "play" && t - lastCorrectAt > 6){
      hint = balloons.find(b => b.c === target && b.y < H - hillH() && b.y > H*.3) || null;
    }

    for (const p of parts){
      p.life -= dt;
      if (p.k === "shard"){ p.vy += 700*dt; p.x += p.vx*dt; p.y += p.vy*dt; p.rot += p.vr*dt; }
      else if (p.k === "conf"){ p.x += (p.vx + Math.sin(t*3 + p.rot)*30)*dt; p.y += p.vy*dt; p.rot += p.vr*dt; }
    }
    parts = parts.filter(p => p.life > 0 && p.y < H + 40);

    for (const f of flyers){
      f.u += dt/.75;
      if (f.u >= 1){ starsShown = Math.max(starsShown, f.slot + 1); slotPop[f.slot] = 1; tone(NOTES[f.slot]*2, 0, .12, "sine", .07); }
    }
    flyers = flyers.filter(f => f.u < 1);

    if (partyTimer > 0){ partyTimer -= dt; if (!RM && Math.random() < dt*20) confetti(2); }

    for (const c of clouds){ c.x += c.v*dt; if (c.x > 1.1) c.x = -.1; }
  }

  /* ---------- çizim ---------- */
  function cloudShape(x, y, s){
    ctx.beginPath();
    [[-40,6,26],[-12,-10,34],[22,-4,28],[46,8,20],[0,10,30],[-26,14,22],[30,14,22]].forEach(([dx,dy,r]) => {
      ctx.moveTo(x + dx*s + r*s, y + dy*s); ctx.arc(x + dx*s, y + dy*s, r*s, 0, Math.PI*2);
    });
  }
  function starPath(x, y, R, rot){
    ctx.beginPath();
    for (let i = 0; i < 10; i++){
      const a = rot - Math.PI/2 + i*Math.PI/5, rr = i % 2 ? R*.45 : R;
      i ? ctx.lineTo(x + Math.cos(a)*rr, y + Math.sin(a)*rr) : ctx.moveTo(x + Math.cos(a)*rr, y + Math.sin(a)*rr);
    }
    ctx.closePath();
  }
  function shapePath(kind, x, y, s){
    ctx.beginPath();
    if (kind === "heart"){
      ctx.moveTo(x, y + s*.9);
      ctx.bezierCurveTo(x - s*1.5, y - s*.1, x - s*.7, y - s*1.25, x, y - s*.45);
      ctx.bezierCurveTo(x + s*.7, y - s*1.25, x + s*1.5, y - s*.1, x, y + s*.9);
    } else if (kind === "star"){
      starPath(x, y, s*1.05, 0);
    } else if (kind === "circle"){
      ctx.arc(x, y, s*.72, 0, Math.PI*2);
    } else if (kind === "triangle"){
      ctx.moveTo(x, y - s*.95); ctx.lineTo(x + s*.95, y + s*.7); ctx.lineTo(x - s*.95, y + s*.7);
    } else {
      const h = s*.7; ctx.rect(x - h, y - h, h*2, h*2);
    }
    ctx.closePath();
  }

  function drawBalloon(b){
    const {x, y, r} = b, col = COLORS[b.c], ry = r*1.2, sl = r*1.7, w = Math.sin(t*2 + b.phase);
    ctx.strokeStyle = "rgba(30,58,95,.45)"; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(x, y + ry + 6);
    ctx.bezierCurveTo(x + 8*w, y + ry + sl*.35, x - 8*w, y + ry + sl*.7, x + 4*w, y + ry + sl);
    ctx.stroke();
    ctx.fillStyle = col.dark;
    ctx.beginPath(); ctx.moveTo(x - 6, y + ry + 8); ctx.lineTo(x + 6, y + ry + 8); ctx.lineTo(x, y + ry - 2); ctx.closePath(); ctx.fill();

    ctx.beginPath(); ctx.ellipse(x, y, r, ry, 0, 0, Math.PI*2);
    ctx.fillStyle = col.fill; ctx.fill();
    const g = ctx.createRadialGradient(x - r*.35, y - ry*.4, r*.1, x, y, ry*1.1);
    g.addColorStop(0, "rgba(255,255,255,.35)"); g.addColorStop(.5, "rgba(255,255,255,0)"); g.addColorStop(1, "rgba(0,0,0,.16)");
    ctx.fillStyle = g; ctx.fill();
    ctx.strokeStyle = col.dark; ctx.lineWidth = 2; ctx.stroke();

    ctx.fillStyle = "rgba(255,255,255,.7)";
    ctx.beginPath(); ctx.ellipse(x - r*.42, y - ry*.45, r*.12, r*.24, -.5, 0, Math.PI*2); ctx.fill();

    shapePath(col.shape, x + r*.05, y + ry*.08, r*.36);
    ctx.fillStyle = "rgba(255,255,255,.92)"; ctx.fill();
  }

  function draw(){
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const hh = hillH();

    const sky = ctx.createLinearGradient(0, 0, 0, H);
    sky.addColorStop(0, "#5DB8EE"); sky.addColorStop(1, "#D4F1FF");
    ctx.fillStyle = sky; ctx.fillRect(0, 0, W, H);

    // güneş
    const sx = W - 70, sy = 70, rot = RM ? 0 : t*.25;
    ctx.strokeStyle = "rgba(255,229,138,.9)"; ctx.lineWidth = 6; ctx.lineCap = "round";
    ctx.beginPath();
    for (let i = 0; i < 12; i++){ const a = rot + i*Math.PI/6; ctx.moveTo(sx + Math.cos(a)*46, sy + Math.sin(a)*46); ctx.lineTo(sx + Math.cos(a)*60, sy + Math.sin(a)*60); }
    ctx.stroke();
    ctx.fillStyle = "#FFD23F"; ctx.beginPath(); ctx.arc(sx, sy, 36, 0, Math.PI*2); ctx.fill();

    // bulutlar
    ctx.fillStyle = "rgba(255,255,255,.8)";
    const cs = clamp(W/900, .6, 1.2);
    for (const c of clouds){ cloudShape(c.x*(W + 160) - 80, c.y*H*.55 + 30, c.s*cs); ctx.fill(); }

    // arka tepe
    ctx.fillStyle = "#9BDB7F";
    ctx.beginPath(); ctx.moveTo(0, H); ctx.lineTo(0, H - hh*.9);
    ctx.quadraticCurveTo(W*.3, H - hh*.4, W*.6, H - hh*.85);
    ctx.quadraticCurveTo(W*.85, H - hh*1.2, W, H - hh*.95);
    ctx.lineTo(W, H); ctx.closePath(); ctx.fill();

    balloons.forEach(drawBalloon);

    if (hint){
      const pr = hint.r*1.6 + Math.sin(t*6)*6;
      ctx.strokeStyle = "rgba(255,255,255,.95)"; ctx.lineWidth = 5;
      ctx.beginPath(); ctx.ellipse(hint.x, hint.y, pr, pr*1.1, 0, 0, Math.PI*2); ctx.stroke();
      ctx.strokeStyle = "rgba(255,255,255,.45)"; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.ellipse(hint.x, hint.y, pr + 12, pr*1.1 + 12, 0, 0, Math.PI*2); ctx.stroke();
    }

    // ön tepe ve çiçekler
    ctx.fillStyle = "#5DBB54";
    ctx.beginPath(); ctx.moveTo(0, H); ctx.lineTo(0, H - hh*.7);
    ctx.quadraticCurveTo(W*.25, H - hh*1.05, W*.5, H - hh*.72);
    ctx.quadraticCurveTo(W*.75, H - hh*.45, W, H - hh*.78);
    ctx.lineTo(W, H); ctx.closePath(); ctx.fill();
    for (let i = 0; i < 14; i++){
      const fx = W*(i + .5)/14 + Math.sin(i*12.9)*14, fy = H - hh*.1 + Math.cos(i*7.3)*5;
      ctx.fillStyle = COLORS[i % COLORS.length].fill;
      for (let k = 0; k < 5; k++){ const a = k*Math.PI*2/5; ctx.beginPath(); ctx.arc(fx + Math.cos(a)*4, fy + Math.sin(a)*4, 3.2, 0, Math.PI*2); ctx.fill(); }
      ctx.fillStyle = "#FFF4C2"; ctx.beginPath(); ctx.arc(fx, fy, 2.6, 0, Math.PI*2); ctx.fill();
    }

    // parçacıklar
    for (const p of parts){
      const a = clamp(p.life/p.max, 0, 1);
      if (p.k === "ring"){
        ctx.strokeStyle = `rgba(255,255,255,${(a*.8).toFixed(3)})`; ctx.lineWidth = 4;
        ctx.beginPath(); ctx.arc(p.x, p.y, p.r*(1 + (1 - a)*.8), 0, Math.PI*2); ctx.stroke();
      } else {
        ctx.save(); ctx.globalAlpha = p.k === "conf" ? Math.min(1, a*2) : a;
        ctx.translate(p.x, p.y); ctx.rotate(p.rot); ctx.fillStyle = p.color;
        if (p.k === "conf") ctx.fillRect(-p.size/2, -p.size/4, p.size, p.size/2);
        else { ctx.beginPath(); ctx.moveTo(0, -p.size); ctx.lineTo(p.size*.8, p.size*.6); ctx.lineTo(-p.size*.8, p.size*.6); ctx.closePath(); ctx.fill(); }
        ctx.restore();
      }
    }

    if (mode !== "intro"){
      // yıldız sırası
      for (let i = 0; i < GOAL; i++){
        const p = slotPos(i), filled = i < starsShown, sc = 1 + Math.sin(slotPop[i]*Math.PI)*.5;
        starPath(p.x, p.y, p.R*sc, 0);
        ctx.fillStyle = filled ? "#FFD23F" : "rgba(255,255,255,.5)"; ctx.fill();
        ctx.strokeStyle = filled ? "#D99A00" : "rgba(30,58,95,.25)"; ctx.lineWidth = 2; ctx.lineJoin = "round"; ctx.stroke();
      }
      // uçan yıldızlar
      for (const f of flyers){
        const u = f.u, e = u < .5 ? 2*u*u : 1 - Math.pow(-2*u + 2, 2)/2;
        const x = f.x0 + (f.x1 - f.x0)*e, y = f.y0 + (f.y1 - f.y0)*e - Math.sin(Math.PI*u)*90;
        starPath(x, y, slotPos(f.slot).R*1.5, t*6);
        ctx.fillStyle = "#FFD23F"; ctx.fill(); ctx.strokeStyle = "#D99A00"; ctx.lineWidth = 2; ctx.stroke();
      }
      // hedef bulutu
      const s = clamp(W/700, .75, 1.15), bounce = Math.sin(cloudBounce*Math.PI);
      const cx = W/2, cy = 84*s + (RM ? 0 : Math.sin(t*2)*3) - bounce*14;
      ctx.save();
      ctx.shadowColor = "rgba(30,58,95,.2)"; ctx.shadowBlur = 18; ctx.shadowOffsetY = 6;
      cloudShape(cx, cy, 1.7*s); ctx.fillStyle = "#FFFFFF"; ctx.fill();
      ctx.restore();
      drawBalloon({x:cx, y:cy - 12*s, r:24*s*(1 + bounce*.15), c:target, phase:0});
    }
  }

  /* ---------- boyut ve döngü ---------- */
  function resize(){
    const r = stage.getBoundingClientRect();
    const nw = Math.max(1, r.width), nh = Math.max(1, r.height);
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    cv.width = Math.round(nw*dpr); cv.height = Math.round(nh*dpr);
    if (W && nw !== W) balloons.forEach(b => { b.baseX = clamp(b.baseX*nw/W, b.r, nw - b.r); });
    W = nw; H = nh;
  }
  for (let i = 0; i < 4; i++) clouds.push({x:rand(0, 1), y:rand(.1, .9), s:rand(.7, 1.2), v:rand(.006, .015)});
  if ("ResizeObserver" in window) new ResizeObserver(resize).observe(stage);
  else window.addEventListener("resize", resize);
  resize();

  // açılışta sahne boş görünmesin
  for (let i = 0; i < 5; i++){ spawn(false); const b = balloons[balloons.length - 1]; b.y = rand(H*.25, H*.9); }

  function frame(now){
    const dt = Math.min(.05, (now - last)/1000); last = now;
    update(dt); draw();
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
})();
