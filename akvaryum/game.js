(() => {
  "use strict";
  const $ = id => document.getElementById(id);

  /* ---------- ölçüler ---------- */
  const W = 480, H = 720;
  const SURFACE = 66;                         // su yüzeyi
  const SAND = 578;                           // kum
  const SHELF = 640;                          // kavanoz rafı
  const BOX = {x0: 40, x1: 440, y0: 112, y1: 548};
  const MAX_FISH = 10;
  const SAVE_KEY = "akvaryum";
  const COLORS = [
    {nm:"kırmızı", c:"#E5484D", d:"#A3262B", l:"#FF9A9D"},
    {nm:"sarı",    c:"#F5C542", d:"#B88E17", l:"#FFE7A0"},
    {nm:"mavi",    c:"#3D8BFD", d:"#1F5FC2", l:"#A9CBFF"},
    {nm:"yeşil",   c:"#2EB872", d:"#1A7A4A", l:"#9BE5BE"},
    {nm:"mor",     c:"#9B5DE5", d:"#6A34B0", l:"#D3B6F5"}
  ];
  const NUM = ["sıfır", "Bir", "İki", "Üç", "Dört", "Beş", "Altı", "Yedi", "Sekiz", "Dokuz", "On"];
  const JAR = i => ({x: 48 + i * 96, y: 684});

  let save = {fish: [{col: 0, size: 1, feeds: 0}, {col: 2, size: 1, feeds: 0}], hatched: 0};
  try { const s = JSON.parse(localStorage.getItem(SAVE_KEY)); if (s && Array.isArray(s.fish) && s.fish.length) save = s; } catch (e) {}
  const store = () => { try { localStorage.setItem(SAVE_KEY, JSON.stringify({fish: G.fish.map(f => ({col: f.col, size: +f.size.toFixed(2), feeds: f.feeds})), hatched: save.hatched})); } catch (e) {} };

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
  const sDrop = () => [0, 1, 2].forEach(k => tone(900 + k * 120, 600, "sine", .08, .08, k * .05));
  const sNom = () => { tone(320, 200, "triangle", .1, .16); tone(380, 240, "triangle", .1, .14, .1); };
  const sBlub = () => tone(300, 700, "sine", .18, .12);
  const sJar = () => tone(700, 760, "sine", .08, .14);
  const sHappy = () => [523, 659, 784, 1047].forEach((f, k) => tone(f, f, "triangle", .25, .16, k * .1));
  const sHatch = () => [392, 523, 659, 784, 1047, 1319].forEach((f, k) => tone(f, f, "triangle", .2, .15, k * .08));

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
  const cap = s => s.charAt(0).toLocaleUpperCase("tr") + s.slice(1);

  /* ---------- durum ---------- */
  let G = null, timers = [];
  const later = (sec, fn) => timers.push({t: sec, fn});
  const rnd = (a, b) => a + Math.random() * (b - a);

  function makeFish(o, x, y){
    return {col: o.col, size: o.size, feeds: o.feeds || 0,
      x: x !== undefined ? x : rnd(BOX.x0 + 30, BOX.x1 - 30), y: y !== undefined ? y : rnd(BOX.y0 + 40, BOX.y1 - 60),
      vx: rnd(-30, 30), vy: 0, tx: 0, ty: 0, retarget: 0, face: Math.random() < .5 ? -1 : 1, ph: Math.random() * 6,
      hungry: false, ate: 0, happy: 0, flip: 0, hl: 0};
  }

  function start(){
    G = {fish: save.fish.map(o => makeFish(o)), pellets: [], eggs: [], bubbles: [], hearts: [], t: 0,
      sel: -1, nextHunger: 2.5, idle: 0, nagT: -99, warnT: -99, firstTap: true, counting: null};
    G.fish.forEach(retarget);
    renderCount(false);
    say("Merhaba! Balıklarını besleyelim.");
  }
  function renderCount(bump){
    $("fish-n").textContent = G.fish.length;
    $("count-btn").setAttribute("aria-label", `${G.fish.length} balık. Saymak için dokun.`);
    if (bump){ const b = $("count-btn"); b.classList.remove("bump"); void b.offsetWidth; b.classList.add("bump"); }
  }
  function retarget(f){
    f.tx = rnd(BOX.x0, BOX.x1); f.ty = rnd(BOX.y0, BOX.y1);
    f.retarget = rnd(2.5, 5);
  }
  const hungryFish = () => G.fish.find(f => f.hungry);

  function makeHungry(){
    if (hungryFish() || G.counting) return;
    // son doyandan farklı bir balık seç
    const pool = G.fish.filter(f => f !== G.lastFed);
    const f = (pool.length ? pool : G.fish)[Math.random() * (pool.length || G.fish.length) | 0];
    f.hungry = true; f.ate = 0; G.idle = 0;
    announce(f);
  }
  function announce(f){
    const nm = COLORS[f.col].nm;
    say(`${cap(nm)} balık acıktı! ${cap(nm)} yem ver.`);
  }

  /* ---------- dokunma ---------- */
  const cv = $("cv"), stage = $("stage"), ctx = cv.getContext("2d");
  let view = {s: 1, ox: 0, oy: 0, dpr: 1};
  const toLogical = e => {
    const r = cv.getBoundingClientRect();
    return {x: (e.clientX - r.left - view.ox) / view.s, y: (e.clientY - r.top - view.oy) / view.s};
  };

  function press(x, y){
    if (!G) return;
    audio();
    if (G.firstTap){ G.firstTap = false; const h = hungryFish(); if (h) announce(h); }
    G.idle = 0;
    // kavanoz
    if (y > SHELF){
      for (let i = 0; i < COLORS.length; i++){
        const j = JAR(i);
        if (Math.abs(x - j.x) < 46){ G.sel = i; sJar(); say(`${cap(COLORS[i].nm)} yem`); return; }
      }
      return;
    }
    // balığa dokunmak: takla atar; kavanoz seçili değilse rengini söyler, seçiliyse yem de serpilir
    for (const f of G.fish){
      if (Math.hypot(x - f.x, y - f.y) < 30 * f.size + 6){
        f.flip = .7; sBlub();
        for (let k = 0; k < 4; k++) G.bubbles.push({x: f.x + f.face * 20 * f.size, y: f.y - 4, r: rnd(2, 4), vy: rnd(-60, -40), w: Math.random() * 6});
        if (G.sel < 0){ if (!G.counting) say(`${cap(COLORS[f.col].nm)} balık!`); return; }
        break;
      }
    }
    // suya dokunmak: seçili yemden serp
    if (y > SURFACE - 10 && y < SAND){
      if (G.sel < 0){ say("Önce aşağıdan bir yem kavanozu seç!"); G.nagT = G.t; return; }
      if (G.pellets.length > 36) return;
      for (let k = 0; k < 3; k++) G.pellets.push({x: Math.max(30, Math.min(W - 30, x + rnd(-18, 18))), y: SURFACE + rnd(4, 14), col: G.sel, vy: rnd(38, 52), ph: Math.random() * 6, rest: 0, warned: false});
      sDrop();
    }
  }
  cv.addEventListener("pointerdown", e => { e.preventDefault(); const p = toLogical(e); press(p.x, p.y); });

  $("count-btn").addEventListener("click", () => {
    if (!G || G.counting) return;
    audio();
    G.counting = {i: 0, t: 0};
    G.fish.forEach(f => f.hl = 0);
  });

  /* ---------- güncelle ---------- */
  function fed(f){
    f.hungry = false; f.happy = 2.2; f.feeds++;
    f.size = Math.min(1.55, f.size + (f.size < .9 ? .15 : .1));
    G.lastFed = f;
    sHappy();
    for (let k = 0; k < 8; k++) G.hearts.push({x: f.x + rnd(-20, 20), y: f.y - 20, vy: rnd(-50, -30), life: 1.6});
    const lay = f.feeds % 3 === 0 && G.fish.length + G.eggs.length < MAX_FISH;
    say(`Mmm! ${cap(COLORS[f.col].nm)} balık doydu!${lay ? " Bak, bir yumurta bıraktı!" : ""}`);
    if (lay) later(1.2, () => G.eggs.push({x: f.x, y: f.y + 10, vy: 30, t: 0, landed: false}));
    G.nextHunger = rnd(4, 6.5);
    store();
  }
  function hatch(egg){
    const have = new Set(G.fish.map(f => f.col));
    const fresh = COLORS.map((c, i) => i).filter(i => !have.has(i));
    const col = fresh.length ? fresh[Math.random() * fresh.length | 0] : Math.random() * COLORS.length | 0;
    const baby = makeFish({col, size: .55, feeds: 0}, egg.x, egg.y - 10);
    baby.vy = -60; baby.flip = .7;
    G.fish.push(baby); retarget(baby);
    save.hatched = (save.hatched || 0) + 1;
    sHatch(); renderCount(true); store();
    say(`Yumurta çatladı! Yavru ${COLORS[col].nm} balık! Artık ${NUM[G.fish.length].toLocaleLowerCase("tr")} balık var!`);
    for (let k = 0; k < 10; k++) G.bubbles.push({x: egg.x + rnd(-12, 12), y: egg.y, r: rnd(2, 5), vy: rnd(-90, -50), w: Math.random() * 6});
  }

  function update(dt){
    for (const tm of timers) tm.t -= dt;
    const due = timers.filter(tm => tm.t <= 0); timers = timers.filter(tm => tm.t > 0); due.forEach(tm => tm.fn());
    if (!G) return;
    G.t += dt; G.idle += dt;
    // acıkma
    if (!hungryFish() && !G.counting){ G.nextHunger -= dt; if (G.nextHunger <= 0) makeHungry(); }
    // yemler batar, kuma konunca bir süre sonra kaybolur
    for (const p of G.pellets){
      if (p.y < SAND - 4){ p.y += p.vy * dt; p.x += Math.sin(G.t * 3 + p.ph) * 10 * dt; }
      else { p.y = SAND - 4; p.rest += dt; }
    }
    G.pellets = G.pellets.filter(p => p.rest < 5 && !p.eaten);
    // balıklar
    const hf = hungryFish();
    for (const f of G.fish){
      let speed = 55, target = null;
      if (f === hf){
        let best = Infinity;
        for (const p of G.pellets) if (p.col === f.col){ const d = Math.hypot(p.x - f.x, p.y - f.y); if (d < best){ best = d; target = p; } }
        // yanlış renkli yem yaklaşınca kibarca uyar
        for (const p of G.pellets) if (p.col !== f.col && !p.warned && Math.hypot(p.x - f.x, p.y - f.y) < 70){
          p.warned = true;
          if (G.t - G.warnT > 5){ G.warnT = G.t; say(`Bu ${COLORS[p.col].nm} yem. ${cap(COLORS[f.col].nm)} balık ${COLORS[f.col].nm} yem istiyor!`); }
        }
      }
      if (target){
        f.tx = target.x; f.ty = target.y; speed = 120;
        if (Math.hypot(target.x - f.x, target.y - f.y) < 18 * f.size + 6){
          target.eaten = true; f.ate++; sNom();
          if (f.ate >= 3) fed(f);
        }
      } else {
        f.retarget -= dt;
        if (f.retarget <= 0 || Math.hypot(f.tx - f.x, f.ty - f.y) < 20) retarget(f);
      }
      const dx = f.tx - f.x, dy = f.ty - f.y, d = Math.hypot(dx, dy) || 1;
      const ax = dx / d * speed, ay = dy / d * speed * .7;
      f.vx += (ax - f.vx) * Math.min(1, dt * 2.2);
      f.vy += (ay - f.vy) * Math.min(1, dt * 2.2);
      f.x = Math.max(BOX.x0 - 10, Math.min(BOX.x1 + 10, f.x + f.vx * dt));
      f.y = Math.max(SURFACE + 24, Math.min(SAND - 14 * f.size - 6, f.y + f.vy * dt));
      if (Math.abs(f.vx) > 6) f.face = f.vx > 0 ? 1 : -1;
      f.ph += dt * (4 + Math.abs(f.vx) / 20);
      if (f.flip > 0) f.flip = Math.max(0, f.flip - dt);
      if (f.happy > 0) f.happy = Math.max(0, f.happy - dt);
      if (f.hl > 0) f.hl = Math.max(0, f.hl - dt);
      if (Math.random() < dt * .25) G.bubbles.push({x: f.x + f.face * 24 * f.size, y: f.y - 4, r: rnd(1.5, 3), vy: rnd(-50, -30), w: Math.random() * 6});
    }
    // yumurtalar: kuma iner, sallanır, çatlar
    for (const e of G.eggs){
      if (!e.landed){ e.y += e.vy * dt; if (e.y >= SAND - 10){ e.y = SAND - 10; e.landed = true; } }
      else { e.t += dt; if (e.t > 2.6 && !e.done){ e.done = true; hatch(e); } }
    }
    G.eggs = G.eggs.filter(e => !e.done);
    // kabarcıklar ve kalpler
    if (Math.random() < dt * 4) G.bubbles.push({x: 418 + rnd(-4, 4), y: SAND - 30, r: rnd(2, 5), vy: rnd(-80, -50), w: Math.random() * 6});
    for (const b of G.bubbles){ b.y += b.vy * dt; b.x += Math.sin(G.t * 4 + b.w) * 12 * dt; }
    G.bubbles = G.bubbles.filter(b => b.y > SURFACE);
    for (const h of G.hearts){ h.y += h.vy * dt; h.life -= dt; }
    G.hearts = G.hearts.filter(h => h.life > 0);
    // sayma
    if (G.counting){
      const c = G.counting;
      c.t -= dt;
      if (c.t <= 0){
        if (c.i < G.fish.length){
          const f = G.fish[c.i]; f.hl = 1.2; f.flip = .5; f.num = c.i + 1;
          tone(500 + c.i * 60, 520 + c.i * 60, "sine", .15, .14);
          say(NUM[c.i + 1]);
          c.i++; c.t = .95;
        } else {
          say(`${NUM[G.fish.length]} balık!`);
          G.counting = null; G.nextHunger = Math.max(G.nextHunger, 3);
        }
      }
    }
    // ipucu: aç balık varken uzun süre doğru yem verilmezse
    const h = hungryFish();
    if (h && G.idle > 9 && G.t - G.nagT > 12){
      G.nagT = G.t;
      say(G.sel === h.col ? "Şimdi suya dokun, yem serp!" : `${cap(COLORS[h.col].nm)} kavanoza dokun!`);
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
  function rr(x, y, w, h, r, fill){ ctx.fillStyle = fill; ctx.beginPath(); ctx.roundRect(x, y, w, h, r); ctx.fill(); }

  function drawFish(f){
    const C = COLORS[f.col], s = f.size, wag = Math.sin(f.ph) * .35;
    ctx.save();
    ctx.translate(f.x, f.y);
    if (f.hl > 0){
      ctx.strokeStyle = `rgba(255,255,255,${Math.min(1, f.hl)})`; ctx.lineWidth = 5;
      ctx.beginPath(); ctx.arc(0, 0, 36 * s, 0, Math.PI * 2); ctx.stroke();
    }
    if (f.flip > 0) ctx.rotate((1 - f.flip / .7) * Math.PI * 2 * (f.face > 0 ? -1 : 1));
    ctx.scale(f.face * s, s);
    ctx.rotate(Math.max(-.35, Math.min(.35, f.vy / 200)) * f.face);
    // kuyruk
    ctx.fillStyle = C.d;
    ctx.beginPath(); ctx.moveTo(-20, 0); ctx.lineTo(-40, -15 + wag * 10); ctx.lineTo(-36, 0); ctx.lineTo(-40, 15 + wag * 10); ctx.closePath(); ctx.fill();
    // sırt yüzgeci
    ctx.beginPath(); ctx.moveTo(-8, -14); ctx.quadraticCurveTo(2, -28, 12, -14); ctx.closePath(); ctx.fill();
    // gövde
    ctx.fillStyle = C.c; ctx.beginPath(); ctx.ellipse(0, 0, 27, 18, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = C.l; ctx.beginPath(); ctx.ellipse(2, 7, 18, 8, 0, 0, Math.PI * 2); ctx.fill();
    // çizgiler
    ctx.strokeStyle = C.d; ctx.globalAlpha = .45; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.arc(-6, 0, 14, -1, 1); ctx.stroke(); ctx.globalAlpha = 1;
    // yan yüzgeç
    ctx.fillStyle = C.d; ctx.beginPath(); ctx.ellipse(-2, 6, 7, 4, .6 + wag, 0, Math.PI * 2); ctx.fill();
    // göz
    ctx.fillStyle = "#fff"; ctx.beginPath(); ctx.arc(14, -5, 6, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "#1F2933"; ctx.beginPath(); ctx.arc(15.5, -5, 3, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "#fff"; ctx.beginPath(); ctx.arc(16.5, -6.2, 1, 0, Math.PI * 2); ctx.fill();
    // ağız: açken yuvarlak, mutluyken gülümser
    ctx.strokeStyle = C.d; ctx.lineWidth = 2; ctx.lineCap = "round";
    if (f.hungry){ ctx.fillStyle = C.d; ctx.beginPath(); ctx.arc(25, 4, 3 + Math.abs(Math.sin(G.t * 6)) * 1.5, 0, Math.PI * 2); ctx.fill(); }
    else { ctx.beginPath(); ctx.arc(20, 3, 4, .2, 1.4); ctx.stroke(); }
    ctx.restore();
    // açlık balonu: kaç yem kaldı
    if (f.hungry){
      const bx = f.x, by = f.y - 40 * s - 14, left = 3 - f.ate;
      ctx.fillStyle = "rgba(255,255,255,.92)";
      ctx.beginPath(); ctx.roundRect(bx - 34, by - 16, 68, 30, 15); ctx.fill();
      ctx.beginPath(); ctx.arc(bx - 4, by + 20, 4, 0, Math.PI * 2); ctx.fill();
      for (let k = 0; k < 3; k++){
        ctx.fillStyle = k < left ? COLORS[f.col].c : "rgba(0,0,0,.12)";
        ctx.beginPath(); ctx.arc(bx - 18 + k * 18, by - 1, 7, 0, Math.PI * 2); ctx.fill();
      }
    }
    if (f.hl > 0 && f.num){
      ctx.font = "800 34px 'Baloo 2', sans-serif"; ctx.textAlign = "center"; ctx.textBaseline = "middle";
      ctx.lineWidth = 6; ctx.strokeStyle = "#1F4A63"; ctx.strokeText(f.num, f.x, f.y - 42 * s);
      ctx.fillStyle = "#fff"; ctx.fillText(f.num, f.x, f.y - 42 * s);
    }
  }

  function drawScene(){
    // su
    const water = ctx.createLinearGradient(0, SURFACE, 0, SAND);
    water.addColorStop(0, "#7DD6F2"); water.addColorStop(1, "#2E8FC0");
    ctx.fillStyle = water; ctx.fillRect(-400, SURFACE, W + 800, SAND - SURFACE + 10);
    ctx.fillStyle = "#CFEFFB"; ctx.fillRect(-400, -300, W + 800, SURFACE + 300);
    // ışık hüzmeleri
    ctx.fillStyle = "rgba(255,255,255,.08)";
    for (let k = 0; k < 4; k++){
      const x = 60 + k * 120 + Math.sin(G.t * .4 + k) * 20;
      ctx.beginPath(); ctx.moveTo(x, SURFACE); ctx.lineTo(x + 40, SURFACE); ctx.lineTo(x + 100, SAND); ctx.lineTo(x + 30, SAND); ctx.closePath(); ctx.fill();
    }
    // yüzey dalgası
    ctx.strokeStyle = "rgba(255,255,255,.8)"; ctx.lineWidth = 4;
    ctx.beginPath();
    for (let x = -20; x <= W + 20; x += 12) ctx.lineTo(x, SURFACE + Math.sin(x * .05 + G.t * 2) * 3);
    ctx.stroke();
    // kum
    ctx.fillStyle = "#F2D79B";
    ctx.beginPath(); ctx.moveTo(-400, SAND + 8);
    for (let x = -400; x <= W + 400; x += 20) ctx.lineTo(x, SAND + Math.sin(x * .03) * 6);
    ctx.lineTo(W + 400, SHELF); ctx.lineTo(-400, SHELF); ctx.closePath(); ctx.fill();
    ctx.fillStyle = "#E3C27E";
    for (let k = 0; k < 18; k++){ ctx.beginPath(); ctx.arc((k * 53) % W + 10, SAND + 18 + (k * 17) % 34, 3, 0, Math.PI * 2); ctx.fill(); }
    // yosunlar
    for (const [x, h, c] of [[70, 150, "#2E9E5B"], [96, 110, "#3FBF73"], [300, 120, "#2E9E5B"], [470, 160, "#3FBF73"], [20, 90, "#3FBF73"]]){
      ctx.strokeStyle = c; ctx.lineWidth = 10; ctx.lineCap = "round";
      ctx.beginPath(); ctx.moveTo(x, SAND + 6);
      for (let k = 1; k <= 6; k++) ctx.lineTo(x + Math.sin(G.t * 1.2 + k * .8 + x) * k * 2.4, SAND + 6 - h * k / 6);
      ctx.stroke();
    }
    // kale
    ctx.fillStyle = "#B9A58B";
    rr(176, SAND - 70, 86, 76, 4, "#B9A58B");
    for (let k = 0; k < 4; k++) rr(176 + k * 24, SAND - 84, 14, 16, 2, "#B9A58B");
    rr(240, SAND - 110, 26, 116, 3, "#A8937A");
    rr(237, SAND - 122, 9, 14, 2, "#A8937A"); rr(256, SAND - 122, 9, 14, 2, "#A8937A");
    ctx.fillStyle = "#3B5A70"; ctx.beginPath(); ctx.arc(213, SAND - 4, 16, Math.PI, 0); ctx.fill(); ctx.fillRect(197, SAND - 4, 32, 10);
    ctx.beginPath(); ctx.arc(253, SAND - 80, 6, 0, Math.PI * 2); ctx.fill();
    // taşlar ve deniz kabuğu
    ctx.fillStyle = "#8A9BA8"; ctx.beginPath(); ctx.ellipse(130, SAND + 2, 26, 14, 0, Math.PI, 0); ctx.fill();
    ctx.fillStyle = "#A7B6C1"; ctx.beginPath(); ctx.ellipse(356, SAND + 4, 34, 16, 0, Math.PI, 0); ctx.fill();
    ctx.fillStyle = "#FF9FB2"; ctx.beginPath(); ctx.moveTo(390, SAND + 14); ctx.arc(390, SAND + 14, 13, Math.PI, 0); ctx.closePath(); ctx.fill();
    // hava taşı
    rr(408, SAND - 36, 20, 34, 6, "#5C6B78");
  }

  function drawShelf(){
    rr(-400, SHELF, W + 800, H - SHELF + 300, 0, "#C98B55");
    rr(-400, SHELF, W + 800, 8, 0, "#A86F3E");
    for (let i = 0; i < COLORS.length; i++){
      const j = JAR(i), C = COLORS[i], sel = G.sel === i, lift = sel ? -8 : 0;
      const hint = (() => { const h = hungryFish(); return h && h.col === i && G.idle > 6 && G.sel !== i; })();
      if (sel || hint){
        ctx.fillStyle = sel ? "rgba(255,255,255,.75)" : `rgba(255,255,255,${.3 + .3 * Math.sin(G.t * 6)})`;
        ctx.beginPath(); ctx.arc(j.x, j.y + lift, 42, 0, Math.PI * 2); ctx.fill();
      }
      // kavanoz
      rr(j.x - 26, j.y - 26 + lift, 52, 52, 12, "rgba(255,255,255,.85)");
      rr(j.x - 22, j.y - 6 + lift, 44, 28, 8, C.c);
      for (let k = 0; k < 6; k++){ ctx.fillStyle = C.d; ctx.beginPath(); ctx.arc(j.x - 14 + (k % 3) * 14, j.y + 2 + Math.floor(k / 3) * 10 + lift, 3.5, 0, Math.PI * 2); ctx.fill(); }
      rr(j.x - 24, j.y - 34 + lift, 48, 12, 4, C.d);
    }
  }

  function draw(){
    const {s, ox, oy, dpr} = view;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.fillStyle = "#3BA7D1"; ctx.fillRect(0, 0, cv.width, cv.height);
    ctx.setTransform(dpr * s, 0, 0, dpr * s, dpr * ox, dpr * oy);
    if (!G) return;
    drawScene();
    // yemler
    for (const p of G.pellets){
      ctx.globalAlpha = p.rest > 3.5 ? Math.max(0, (5 - p.rest) / 1.5) : 1;
      ctx.fillStyle = COLORS[p.col].c; ctx.beginPath(); ctx.arc(p.x, p.y, 5, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = "rgba(255,255,255,.6)"; ctx.beginPath(); ctx.arc(p.x - 1.5, p.y - 1.5, 1.6, 0, Math.PI * 2); ctx.fill();
    }
    ctx.globalAlpha = 1;
    // yumurtalar
    for (const e of G.eggs){
      ctx.save(); ctx.translate(e.x, e.y);
      if (e.landed) ctx.rotate(Math.sin(e.t * 14) * .25 * Math.min(1, e.t));
      ctx.fillStyle = "#FFF8E7"; ctx.beginPath(); ctx.ellipse(0, 0, 11, 14, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = "#F5C542"; ctx.beginPath(); ctx.arc(-3, -4, 2.5, 0, Math.PI * 2); ctx.arc(4, 3, 2, 0, Math.PI * 2); ctx.fill();
      if (e.t > 1.6){ ctx.strokeStyle = "#B88E17"; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(-10, -2); ctx.lineTo(-4, 2); ctx.lineTo(0, -3); ctx.lineTo(5, 2); ctx.lineTo(10, -2); ctx.stroke(); }
      ctx.restore();
    }
    for (const f of G.fish) drawFish(f);
    // kabarcıklar
    ctx.strokeStyle = "rgba(255,255,255,.75)"; ctx.lineWidth = 1.6;
    for (const b of G.bubbles){ ctx.beginPath(); ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2); ctx.stroke(); }
    // kalpler
    ctx.font = "20px sans-serif"; ctx.textAlign = "center"; ctx.textBaseline = "middle";
    for (const h of G.hearts){ ctx.globalAlpha = Math.min(1, h.life); ctx.fillText("❤️", h.x, h.y); }
    ctx.globalAlpha = 1;
    drawShelf();
    // ipucu eli
    const h = hungryFish();
    if (h && G.idle > 6){
      const k = (G.t % 1.4) / 1.4;
      const tgt = G.sel === h.col ? {x: h.x, y: Math.max(SURFACE + 40, h.y - 60)} : JAR(h.col);
      ctx.font = "44px sans-serif"; ctx.globalAlpha = Math.min(1, k * 3);
      ctx.fillText("👆", tgt.x + 30 * (1 - k) + 8, tgt.y + 40 * (1 - k) + 24);
      ctx.globalAlpha = 1;
    }
  }

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
  start();
  requestAnimationFrame(frame);

  // testler için
  window.__akvaryum = {state: () => G, update, press, COLORS, JAR, SURFACE, SAND, SHELF};
})();
