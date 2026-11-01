/* Ördek Yolu — Egemen için trafik ışığı ve karşıdan karşıya geçme oyunu */
(function(){
  "use strict";

  // dünya yüksekliği sabit, genişlik ekran oranına göre değişir
  const H = 700, LANE = 74, MED = 60, BOT = 100, TOP = 54, CW = 92, DUCKS = 3;
  const SAVE = "ordek-yolu", SOUND_KEY = "ordek-yolu-ses";
  const RM = window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches;
  const RAINBOW = ["#E4483B", "#C98F00", "#2A64C0", "#1E8A41", "#6E36B8"];
  const TAU = Math.PI*2;

  // şeritler alttan üste: [yön, hız]; yön 1 = soldan sağa (yakın şerit), "m" = refüj
  const LEVELS = [
    {light:true,  lanes:[[1, 130], [-1, 130]], gap:[240, 420], types:["car", "car", "taxi"]},
    {light:true,  lanes:[[1, 150], [1, 190], [-1, 190], [-1, 150]], gap:[200, 380], types:["car", "taxi", "bus", "truck"]},
    {light:false, lanes:[[1, 100]], gap:[440, 660], types:["car", "taxi"]},
    {light:false, lanes:[[1, 115], [-1, 115]], gap:[400, 620], types:["car", "taxi", "truck"]},
    {light:false, lanes:[[1, 135], "m", [-1, 135]], gap:[360, 580], types:["car", "taxi", "bus"]},
    {light:false, lanes:[[1, 110], [1, 150], "m", [-1, 150], [-1, 110]], gap:[400, 640], types:["car", "taxi", "bus", "truck", "tractor"]}
  ];
  const SPEC = {
    car:    {w:120, cols:["#E63946", "#3D8BFD", "#2DB75A", "#9B5DE5", "#FF8C42", "#EDEDED"]},
    taxi:   {w:120, cols:["#FFC72C"]},
    bus:    {w:212, cols:["#FFB703", "#E63946"]},
    truck:  {w:192, cols:["#F4F1EA", "#FF8C42"]},
    tractor:{w:104, cols:["#3A9D3A"], vmax:70}
  };

  const $ = id => document.getElementById(id);
  const stage = $("stage"), cv = $("cv"), ctx = cv.getContext("2d");
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const rand = (a, b) => a + Math.random()*(b - a);
  const pick = a => a[Math.floor(Math.random()*a.length)];
  const ease = t => t < .5 ? 2*t*t : 1 - Math.pow(-2*t + 2, 2)/2;

  let soundOn = true, best = [];
  try { soundOn = localStorage.getItem(SOUND_KEY) !== "0"; } catch(e) {}
  try { best = JSON.parse(localStorage.getItem(SAVE) || "{}").stars || []; } catch(e) { best = []; }
  function persist(){ try { localStorage.setItem(SAVE, JSON.stringify({stars:best})); } catch(e) {} }

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
    hop(){ tone(520, .09, "triangle", .08, 780); },
    quack(){ tone(640, .11, "sawtooth", .045, 380); tone(600, .12, "sawtooth", .045, 350, .15); },
    honk(){ tone(330, .28, "square", .06); tone(415, .28, "square", .045); noise(.25, "bandpass", 2600, .12); },
    no(){ tone(240, .22, "sine", .12, 170); },
    tick(){ tone(1250, .035, "square", .035); },
    splash(){ noise(.4, "lowpass", 900, .4); tone(900, .15, "sine", .05, 1500, .05); },
    star(){ [783.99, 1046.5, 1318.5].forEach((f, i) => tone(f, .2, "triangle", .12, null, i*.1)); },
    party(){ [523.25, 659.25, 783.99, 1046.5, 1318.5].forEach((f, i) => tone(f, .3, "triangle", .14, null, i*.12)); }
  };
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
  $("sound").addEventListener("click", () => {
    soundOn = !soundOn;
    try { localStorage.setItem(SOUND_KEY, soundOn ? "1" : "0"); } catch(e) {}
    if (!soundOn && canSpeak) speechSynthesis.cancel();
    renderSound();
  });
  renderSound();

  /* ---------- ekran ---------- */
  let W = 1000;
  const view = {s:1, ox:0, oy:0, dpr:1};
  function resize(){
    const r = stage.getBoundingClientRect();
    if (!r.width || !r.height) return;
    view.dpr = Math.min(window.devicePixelRatio || 1, 2);
    cv.width = Math.round(r.width*view.dpr); cv.height = Math.round(r.height*view.dpr);
    W = clamp(H*r.width/r.height, 420, 1400);
    view.s = Math.min(r.width/W, r.height/H);
    view.ox = (r.width - W*view.s)/2; view.oy = (r.height - H*view.s)/2;
  }
  function toLogical(e){
    const r = cv.getBoundingClientRect();
    return {x:(e.clientX - r.left - view.ox)/view.s, y:(e.clientY - r.top - view.oy)/view.s};
  }

  /* ---------- oyun durumu ---------- */
  let phase = "intro";      // intro | play | done | party
  let level = 0, lv = LEVELS[0], rows = [], roadTop = 0, parkBottom = 0;
  let duck = null, delivered = 0, mistakes = 0, time = 0, idleT = 0, timers = [], parts = [];
  let light = {st:"car", t:3}, tickT = 0, saidRight = false, refused = false, waitSaid = -9;
  const later = (s, fn) => timers.push({t:s, fn});

  function buildRows(){
    rows = [{type:"side", y:H - BOT/2, y0:H - BOT, h:BOT}];
    let top = H - BOT;
    for (const ln of lv.lanes){
      if (ln === "m"){ rows.push({type:"median", y:top - MED/2, y0:top - MED, h:MED}); top -= MED; }
      else { rows.push({type:"lane", dir:ln[0], vmax:ln[1], y:top - LANE/2, y0:top - LANE, h:LANE, cars:[], gap:0}); top -= LANE; }
    }
    roadTop = top;
    rows.push({type:"top", y:top - TOP/2, y0:top - TOP, h:TOP});
    parkBottom = top - TOP;
  }
  const gapFor = () => rand(lv.gap[0], lv.gap[1]);
  function newCar(row, f){
    let t = pick(lv.types);
    if (t === "tractor" && row.vmax > 120) t = "car";
    const sp = SPEC[t], vmax = Math.min(row.vmax, sp.vmax || 999)*rand(.94, 1.06);
    return {t, w:sp.w, f, v:vmax, vmax, col:pick(sp.cols), brake:0, wr:Math.random()*TAU};
  }
  function fillLane(row){
    // dizide öndeki araç önce gelir (f büyük olan)
    row.cars = []; let f = W + 200;
    while (f > 0){ const c = newCar(row, f); row.cars.push(c); f -= c.w + gapFor(); }
    row.gap = gapFor();
  }
  // f: aracın ön ucunun giriş kenarından uzaklığı; ekran x'i yöne göre
  const frontX = (row, f) => row.dir > 0 ? f - 40 : W + 40 - f;
  const duckF = () => W/2 + 40;
  const stopF = () => W/2 - CW/2 - 16 + 40;

  function resetDuck(){
    duck = {row:0, prev:0, t:1, dur:.26, mode:"walk", shake:0, face:-1, flap:0, sx:0, sy:0, swimT:0};
    saidRight = false; refused = false;
  }
  function startLevel(i, silent){
    level = clamp(i, 0, LEVELS.length - 1); lv = LEVELS[level];
    buildRows();
    for (const r of rows) if (r.type === "lane") fillLane(r);
    resetDuck(); delivered = 0; mistakes = 0; timers = []; parts = []; idleT = 0;
    light = {st:"car", t:2.5}; tickT = 0;
    phase = "play";
    $("intro").hidden = true; $("done").hidden = true; $("party").hidden = true;
    if (silent) return;
    sfx.quack();
    if (lv.light) say("Yavruları annesine götür. Yaya ışığı yeşil olunca geç, kırmızıda bekle!");
    else if (level === 2) say("Burada ışık yok. Önce sola bak, sonra sağa bak. Araba yoksa geç!");
    else say("Önce sola bak, sonra sağa bak. Yeşil ok yanınca geç!");
  }

  const onRoad = () => duck && (rows[duck.row].type === "lane" || rows[duck.prev].type === "lane") && duck.mode !== "swim";
  const effRow = () => duck.t >= .5 ? duck.row : duck.prev;

  function lightTick(dt){
    if (!lv.light) return;
    light.t -= dt;
    if (light.st === "walk" || light.st === "flash"){
      tickT -= dt; if (tickT <= 0){ tickT = light.st === "walk" ? .5 : .25; sfx.tick(); }
    }
    if (light.t > 0) return;
    switch (light.st){
      case "car":
        light.st = "yellow"; light.t = 1.2;
        // sarıda çizgiyi geçmiş ya da çok yakın araçlar devam eder
        for (const r of rows) if (r.type === "lane") for (const c of r.cars) c.go = c.f >= stopF() - 6;
        break;
      case "yellow": light.st = "allred"; light.t = 1.0; break;
      case "allred":
        light.st = "walk"; light.t = 6.5; tickT = 0;
        if (duck && duck.row === 0 && duck.mode === "walk") say("Yeşil yandı. Şimdi geçebilirsin!");
        break;
      case "walk": light.st = "flash"; light.t = 1.6; break;
      case "flash":
        // yavru yoldayken arabalara yeşil yanmaz
        if (onRoad()) light.t = .3; else { light.st = "car"; light.t = rand(3.5, 5); }
        break;
    }
  }

  function moveCars(dt){
    const fd = duckF(), fs = stopF();
    for (const row of rows){
      if (row.type !== "lane") continue;
      const cars = row.cars, er = duck ? effRow() : -1;
      const yieldDuck = lv.light && duck && rows.indexOf(row) === er && duck.mode !== "swim";
      for (let i = 0; i < cars.length; i++){
        const c = cars[i];
        let lim = Infinity;
        if (i > 0){ const p = cars[i - 1]; lim = p.f - p.w - 16; }
        if (lv.light && light.st !== "car" && !c.go && c.f < fs + 2) lim = Math.min(lim, fs);
        if (yieldDuck && c.f < fd - 28 + 1) lim = Math.min(lim, fd - 40);
        let tv = c.vmax;
        if (c.brake > 0){ c.brake -= dt; tv = 0; }
        if (lim !== Infinity) tv = Math.min(tv, Math.max(0, (lim - c.f)*2.6));
        c.v = tv < c.v ? tv : Math.min(tv, c.v + 260*dt);
        c.f += c.v*dt; c.wr += c.v*dt/12;
      }
      while (cars.length && cars[0].f - cars[0].w > W + 120) cars.shift();
      const last = cars[cars.length - 1];
      if (!last || last.f - last.w >= row.gap){ cars.push(newCar(row, 0)); row.gap = gapFor(); }
    }
  }

  // şerit şu an ve "margin" saniye boyunca yavrunun durduğu yerde boş mu
  function laneSafe(row, margin){
    const fd = duckF();
    for (const c of row.cars){
      if (c.f - c.w > fd + 30) continue;
      if (c.f >= fd - 30) return false;
      if ((fd - 30 - c.f)/Math.max(c.vmax, 1) < margin) return false;
    }
    return true;
  }
  function canGo(){
    if (!duck || duck.mode !== "walk" || duck.t < 1) return false;
    const next = duck.row + 1;
    if (next >= rows.length) return false;
    if (lv.light) return rows[duck.row].type !== "side" || light.st === "walk";
    // bir sonraki güvenli yere kadar bütün şeritlere bak
    let k = 0;
    for (let r = next; r < rows.length && rows[r].type === "lane"; r++, k++)
      if (!laneSafe(rows[r], 1.3 + .9*k)) return false;
    return true;
  }

  function hop(to, dur){
    duck.prev = duck.row; duck.row = to; duck.t = 0; duck.dur = dur || .26;
  }
  function forward(){
    if (phase !== "play" || !duck || duck.mode !== "walk" || duck.t < 1) return;
    idleT = 0;
    const next = duck.row + 1;
    if (next >= rows.length) return;
    if (lv.light && rows[duck.row].type === "side" && rows[next].type === "lane" && light.st !== "walk"){
      duck.shake = .45; sfx.no();
      if (!refused){ refused = true; mistakes++; }
      say("Dur! Kırmızı ışık. Yeşili bekle.");
      return;
    }
    // önünde araba duruyorsa ya da tam önünden geçiyorsa yavru adım atmaz
    if (!lv.light && rows[next].type === "lane" && !laneSafe(rows[next], .25)){
      duck.shake = .45; sfx.no();
      if (time - waitSaid > 3){ waitSaid = time; say("Araba var, bekle!"); }
      return;
    }
    hop(next); sfx.hop();
  }
  function back(){
    if (phase !== "play" || !duck || duck.mode !== "walk" || duck.t < 1 || duck.row === 0) return;
    idleT = 0; hop(duck.row - 1); sfx.hop();
  }

  function hitCheck(){
    if (duck.mode !== "walk") return;
    const r = effRow(), row = rows[r];
    if (row.type !== "lane") return;
    const fd = duckF();
    for (const c of row.cars){
      if (c.f >= fd - 22 && c.f - c.w <= fd + 22){
        for (const o of row.cars) if (o.f <= c.f + 1) o.brake = Math.max(o.brake, 1.1);
        c.v = 0; sfx.honk(); mistakes++;
        let safe = r - 1;
        while (safe > 0 && rows[safe].type === "lane") safe--;
        duck.mode = "bounce"; hop(safe, .45);
        say("Dikkat, araba geliyor! Önce bak, sonra geç.");
        for (let i = 0; i < 8; i++) parts.push({x:W/2, y:row.y - 10, vx:rand(-120, 120), vy:rand(-200, -60), life:.7, max:.7, c:"#FFE38A", r:rand(3, 6)});
        return;
      }
    }
  }

  function arrive(){
    duck.mode = "swim"; duck.swimT = 0; sfx.quack();
  }
  function landed(){
    delivered++; sfx.splash();
    const p = pondPos();
    for (let i = 0; i < 12; i++){ const a = rand(0, TAU); parts.push({x:p.x, y:p.y, vx:Math.cos(a)*rand(40, 140), vy:Math.sin(a)*rand(40, 120) - 60, life:.6, max:.6, c:"#BFE9FF", r:rand(3, 6)}); }
    if (delivered >= DUCKS){
      duck = null; sfx.party();
      say("Yaşasın! Bütün yavrular annesinin yanında.");
      later(1.4, finishLevel);
    } else {
      duck = null;
      say(delivered === 1 ? "Yaşasın! Bir yavru geldi. Sıradaki!" : "Aferin! Bir yavru daha!");
      later(.8, () => { resetDuck(); sfx.quack(); });
    }
  }
  function starsNow(){ return mistakes === 0 ? 3 : mistakes <= 2 ? 2 : 1; }
  function finishLevel(){
    const s = starsNow();
    best[level] = Math.max(best[level] || 0, s); persist(); renderLevels();
    if (level === LEVELS.length - 1){
      phase = "party"; $("party").hidden = false; sfx.party();
      say("Aferin Egemen! Bütün yolları güvenle geçtin.");
      return;
    }
    phase = "done";
    [...$("stars").children].forEach((el, i) => { el.className = ""; void el.offsetWidth; if (i < s) el.className = "on"; });
    $("stars").setAttribute("aria-label", s + " yıldız");
    $("done").hidden = false; sfx.star();
  }

  function update(dt){
    time += dt;
    for (let i = timers.length - 1; i >= 0; i--){ const tk = timers[i]; tk.t -= dt; if (tk.t <= 0){ timers.splice(i, 1); tk.fn(); } }
    for (let i = parts.length - 1; i >= 0; i--){ const p = parts[i]; p.life -= dt; p.x += p.vx*dt; p.y += p.vy*dt; p.vy += 400*dt; if (p.life <= 0) parts.splice(i, 1); }
    if (phase !== "play"){ lightTick(dt); moveCars(dt); }
    if (phase !== "play") return;
    lightTick(dt);
    moveCars(dt);
    if (!duck) return;
    idleT += dt;
    duck.shake = Math.max(0, duck.shake - dt);
    if (duck.t < 1){
      duck.t = Math.min(1, duck.t + dt/duck.dur);
      if (duck.t >= 1){
        if (duck.mode === "bounce") duck.mode = "walk";
        const row = rows[duck.row];
        if (row.type === "top" && duck.mode === "walk") arrive();
        if (row.type === "median" && !saidRight && duck.row > duck.prev){ saidRight = true; say("Şimdi sağa bak!"); }
      }
    }
    if (duck.mode === "swim"){
      duck.swimT += dt/1.1;
      if (duck.swimT >= 1){ landed(); return; }
    }
    // yavru bekledikçe önce sola, sonra sağa bakar
    const cur = rows[duck.row], next = rows[duck.row + 1];
    if (duck.mode === "swim") duck.face = 1;
    else if (cur.type !== "lane" && next && next.type === "lane") duck.face = Math.sin(time*2.4) > 0 ? -1 : 1;
    else if (next && next.type === "lane") duck.face = -next.dir;
    else duck.face = 1;
    hitCheck();
  }

  /* ---------- çizim ---------- */
  function pondPos(){ return {x:W/2, y:parkBottom*.52}; }
  function pondR(){ return {rx:Math.min(W*.34, 280), ry:clamp(parkBottom*.3, 40, 90)}; }
  const pondGap = () => Math.min(44, (pondR().rx - 50)/DUCKS);

  function drawDuck(x, y, s, face, opt){
    opt = opt || {};
    ctx.save(); ctx.translate(x, y); ctx.scale(s*face, s);
    if (!opt.swim){
      ctx.fillStyle = "rgba(0,0,0,.18)"; ctx.beginPath(); ctx.ellipse(0, 19, 20, 5, 0, 0, TAU); ctx.fill();
      ctx.fillStyle = "#FF8C1A";
      const k = opt.step ? Math.sin(opt.step)*4 : 0;
      ctx.beginPath(); ctx.ellipse(-6 + k, 16, 6, 3, 0, 0, TAU); ctx.fill();
      ctx.beginPath(); ctx.ellipse(6 - k, 16, 6, 3, 0, 0, TAU); ctx.fill();
    }
    const body = opt.mom ? "#FFFFFF" : "#FFD93B", edge = opt.mom ? "#D9D2C2" : "#E0A800";
    ctx.fillStyle = body; ctx.strokeStyle = edge; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(-18, -2); ctx.lineTo(-28, -12); ctx.lineTo(-20, 6); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.beginPath(); ctx.ellipse(0, 2, 22, 16, 0, 0, TAU); ctx.fill(); ctx.stroke();
    ctx.fillStyle = opt.mom ? "#EFE9DC" : "#F5C518";
    ctx.save(); ctx.translate(-3, 3); ctx.rotate(-.3 + (opt.flap ? Math.sin(opt.flap)*.6 : 0));
    ctx.beginPath(); ctx.ellipse(0, 0, 12, 7, 0, 0, TAU); ctx.fill(); ctx.restore();
    ctx.fillStyle = body;
    ctx.beginPath(); ctx.arc(12, -16, 12, 0, TAU); ctx.fill(); ctx.stroke();
    ctx.fillStyle = "#FF8C1A"; ctx.beginPath(); ctx.moveTo(21, -19); ctx.quadraticCurveTo(34, -17, 32, -13); ctx.lineTo(21, -11); ctx.closePath(); ctx.fill();
    ctx.fillStyle = "#222"; ctx.beginPath(); ctx.arc(16, -19, 2.8, 0, TAU); ctx.fill();
    ctx.fillStyle = "#fff"; ctx.beginPath(); ctx.arc(17, -20, 1, 0, TAU); ctx.fill();
    if (opt.swim){ ctx.fillStyle = "rgba(255,255,255,.55)"; ctx.beginPath(); ctx.ellipse(0, 16, 26, 4, 0, 0, TAU); ctx.fill(); }
    ctx.restore();
  }

  function wheel(x, y, r, rot){
    ctx.fillStyle = "#26262B"; ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fill();
    ctx.fillStyle = "#C9CED6"; ctx.beginPath(); ctx.arc(x, y, r*.45, 0, TAU); ctx.fill();
    ctx.strokeStyle = "#7B818C"; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(x + Math.cos(rot)*r*.42, y + Math.sin(rot)*r*.42); ctx.lineTo(x - Math.cos(rot)*r*.42, y - Math.sin(rot)*r*.42); ctx.stroke();
  }
  function rr(x, y, w, h, r, fill){ ctx.fillStyle = fill; ctx.beginPath(); ctx.roundRect(x, y, w, h, r); ctx.fill(); }
  const GLASS = "#CFF1FF";
  function drawVehicle(c, row){
    const fx = frontX(row, c.f), cx = fx - row.dir*c.w/2, gy = row.y + 30;
    ctx.save(); ctx.translate(cx, gy); ctx.scale(row.dir, 1);
    const rot = c.wr;
    ctx.fillStyle = "rgba(0,0,0,.2)"; ctx.beginPath(); ctx.ellipse(0, 0, c.w/2, 6, 0, 0, TAU); ctx.fill();
    if (c.t === "car" || c.t === "taxi"){
      ctx.fillStyle = c.col; ctx.beginPath();
      ctx.moveTo(-38, -34); ctx.lineTo(-26, -56); ctx.lineTo(20, -56); ctx.lineTo(40, -34); ctx.closePath(); ctx.fill();
      rr(-60, -38, 120, 28, 11, c.col);
      ctx.fillStyle = GLASS;
      ctx.beginPath(); ctx.moveTo(-30, -36); ctx.lineTo(-22, -51); ctx.lineTo(-4, -51); ctx.lineTo(-4, -36); ctx.closePath(); ctx.fill();
      ctx.beginPath(); ctx.moveTo(3, -36); ctx.lineTo(3, -51); ctx.lineTo(18, -51); ctx.lineTo(32, -36); ctx.closePath(); ctx.fill();
      if (c.t === "taxi"){ rr(-12, -66, 24, 10, 3, "#222"); rr(-9, -64, 18, 6, 2, "#FFE680"); }
      ctx.fillStyle = "#FFE08A"; ctx.beginPath(); ctx.ellipse(57, -27, 4, 5, 0, 0, TAU); ctx.fill();
      ctx.fillStyle = "#E5484D"; ctx.fillRect(-60, -30, 4, 8);
      wheel(-34, -12, 12, rot); wheel(36, -12, 12, rot);
    } else if (c.t === "bus"){
      rr(-106, -66, 212, 56, 12, c.col);
      ctx.fillStyle = "rgba(0,0,0,.15)"; ctx.fillRect(-106, -34, 212, 5);
      for (let x = -94; x < 50; x += 36) rr(x, -60, 28, 20, 4, GLASS);
      rr(72, -60, 28, 32, 5, GLASS); rr(48, -58, 18, 46, 3, "#8ECDF0");
      ctx.fillStyle = "#FFE08A"; ctx.beginPath(); ctx.ellipse(103, -20, 3, 5, 0, 0, TAU); ctx.fill();
      wheel(-68, -12, 13, rot); wheel(70, -12, 13, rot);
    } else if (c.t === "truck"){
      rr(-96, -72, 142, 58, 6, c.col);
      ctx.strokeStyle = "rgba(0,0,0,.12)"; ctx.lineWidth = 2; ctx.strokeRect(-90, -66, 130, 46);
      rr(50, -56, 46, 44, 9, "#3D8BFD"); rr(68, -52, 22, 16, 4, GLASS);
      rr(46, -20, 52, 8, 3, "#2A2540");
      ctx.fillStyle = "#FFE08A"; ctx.beginPath(); ctx.ellipse(94, -24, 3, 5, 0, 0, TAU); ctx.fill();
      wheel(-64, -12, 12, rot); wheel(-36, -12, 12, rot); wheel(68, -12, 12, rot);
    } else {
      rr(-12, -42, 62, 24, 6, c.col);
      ctx.fillStyle = "#555"; ctx.fillRect(34, -66, 5, 26);
      ctx.strokeStyle = "#2A2540"; ctx.lineWidth = 4;
      ctx.beginPath(); ctx.moveTo(-40, -36); ctx.lineTo(-40, -76); ctx.moveTo(-6, -40); ctx.lineTo(-6, -76); ctx.stroke();
      rr(-46, -82, 46, 8, 3, "#E63946");
      rr(-44, -44, 36, 10, 3, c.col);
      wheel(-26, -22, 22, rot); wheel(36, -12, 12, rot);
    }
    ctx.restore();
  }

  function person(x, y, walking, col){
    ctx.fillStyle = col; ctx.strokeStyle = col; ctx.lineWidth = 3; ctx.lineCap = "round";
    ctx.beginPath(); ctx.arc(x, y - 9, 3.4, 0, TAU); ctx.fill();
    ctx.beginPath(); ctx.moveTo(x, y - 5); ctx.lineTo(x, y + 3);
    if (walking){ ctx.moveTo(x, y + 3); ctx.lineTo(x - 5, y + 10); ctx.moveTo(x, y + 3); ctx.lineTo(x + 5, y + 10); ctx.moveTo(x, y - 3); ctx.lineTo(x - 5, y + 2); ctx.moveTo(x, y - 3); ctx.lineTo(x + 5, y - 1); }
    else { ctx.moveTo(x - 2, y + 3); ctx.lineTo(x - 2, y + 10); ctx.moveTo(x + 2, y + 3); ctx.lineTo(x + 2, y + 10); ctx.moveTo(x - 4, y - 3); ctx.lineTo(x - 4, y + 3); ctx.moveTo(x + 4, y - 3); ctx.lineTo(x + 4, y + 3); }
    ctx.stroke();
  }
  function carSignal(x, base){
    ctx.fillStyle = "#5C6370"; ctx.fillRect(x - 3, base - 70, 6, 70);
    rr(x - 12, base - 124, 24, 60, 7, "#2A2A2E");
    const st = light.st;
    const on = [st !== "car" && st !== "yellow", st === "yellow", st === "car"];
    ["#FF4D4D", "#FFC93C", "#3DDC6A"].forEach((c, i) => {
      ctx.fillStyle = on[i] ? c : "#4A4A50";
      ctx.beginPath(); ctx.arc(x, base - 113 + i*19, 7.5, 0, TAU); ctx.fill();
    });
  }
  function pedSignal(x, base){
    ctx.fillStyle = "#5C6370"; ctx.fillRect(x - 3, base - 70, 6, 70);
    rr(x - 22, base - 134, 44, 70, 9, "#2A2A2E");
    const walk = light.st === "walk" || (light.st === "flash" && Math.sin(time*16) > 0);
    rr(x - 17, base - 129, 34, 29, 6, walk ? "#3B2222" : "#5A1C1C");
    rr(x - 17, base - 97, 34, 29, 6, walk ? "#1C5A2E" : "#22332A");
    person(x, base - 114, false, walk ? "#6B3A3A" : "#FF5A5A");
    person(x, base - 83, true, walk ? "#5BFF8A" : "#3A5A44");
    if (walk && !RM){ ctx.strokeStyle = "rgba(91,255,138,.5)"; ctx.lineWidth = 4; ctx.beginPath(); ctx.roundRect(x - 24, base - 136, 48, 74, 11); ctx.stroke(); }
  }
  function tree(x, y, r){
    ctx.fillStyle = "#7A5230"; ctx.fillRect(x - 4, y, 8, r*.8);
    ctx.fillStyle = "#3E9B4A"; ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fill();
    ctx.fillStyle = "#56B85E"; ctx.beginPath(); ctx.arc(x - r*.3, y - r*.3, r*.55, 0, TAU); ctx.fill();
  }
  function flower(x, y, c){
    ctx.fillStyle = c; for (let i = 0; i < 5; i++){ const a = i*TAU/5; ctx.beginPath(); ctx.arc(x + Math.cos(a)*4, y + Math.sin(a)*4, 3, 0, TAU); ctx.fill(); }
    ctx.fillStyle = "#FFE14D"; ctx.beginPath(); ctx.arc(x, y, 2.4, 0, TAU); ctx.fill();
  }
  function sidewalk(y0, h){
    ctx.fillStyle = "#DCD6C8"; ctx.fillRect(0, y0, W, h);
    ctx.strokeStyle = "rgba(0,0,0,.07)"; ctx.lineWidth = 2;
    ctx.beginPath(); for (let x = 20; x < W; x += 44){ ctx.moveTo(x, y0); ctx.lineTo(x, y0 + h); } ctx.stroke();
  }
  function arrow(x, y, ok){
    const b = RM ? 0 : Math.sin(time*6)*4;
    ctx.save(); ctx.translate(x, y + b);
    if (ok){
      ctx.fillStyle = "#2DB75A"; ctx.strokeStyle = "#fff"; ctx.lineWidth = 4; ctx.lineJoin = "round";
      ctx.beginPath(); ctx.moveTo(0, -22); ctx.lineTo(18, 0); ctx.lineTo(7, 0); ctx.lineTo(7, 16); ctx.lineTo(-7, 16); ctx.lineTo(-7, 0); ctx.lineTo(-18, 0); ctx.closePath();
      ctx.stroke(); ctx.fill();
    } else {
      ctx.fillStyle = "#E5484D"; ctx.strokeStyle = "#fff"; ctx.lineWidth = 4;
      ctx.beginPath(); ctx.arc(0, -2, 15, 0, TAU); ctx.fill(); ctx.stroke();
      ctx.fillStyle = "#fff"; ctx.fillRect(-9, -5, 18, 6);
    }
    ctx.restore();
  }

  function duckPos(){
    if (duck.mode === "swim"){
      const p = pondPos(), top = rows[rows.length - 1], k = ease(clamp(duck.swimT, 0, 1));
      const tx = p.x - 40 - pondGap()*(delivered + 1);
      return {x:W/2 + (tx - W/2)*k, y:top.y + (p.y + 6 - top.y)*k, hop:0};
    }
    const a = rows[duck.prev], b = rows[duck.row], k = ease(duck.t);
    const hopH = duck.mode === "bounce" ? 46 : 20;
    return {x:W/2 + (duck.shake ? Math.sin(duck.shake*40)*6 : 0), y:a.y + (b.y - a.y)*k - Math.sin(Math.PI*duck.t)*hopH + 4, hop:duck.t < 1};
  }

  function draw(){
    const d = view.dpr;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = "#9BD77E"; ctx.fillRect(0, 0, cv.width, cv.height);
    ctx.setTransform(d*view.s, 0, 0, d*view.s, d*view.ox, d*view.oy);
    if (!rows.length){ return; }
    // park ve göl
    ctx.fillStyle = "#9BD77E"; ctx.fillRect(0, 0, W, parkBottom);
    const p = pondPos(), pr = pondR();
    for (let x = 40; x < W; x += 130){
      const tx = x + (x*37 % 50);
      if (Math.abs(tx - p.x) > pr.rx + 30) tree(tx, Math.max(36, parkBottom*.4 + (x % 3)*12), 26);
    }
    ctx.fillStyle = "#8ED0EE"; ctx.beginPath(); ctx.ellipse(p.x, p.y, pr.rx + 8, pr.ry + 8, 0, 0, TAU); ctx.fill();
    ctx.fillStyle = "#5FB7E5"; ctx.beginPath(); ctx.ellipse(p.x, p.y, pr.rx, pr.ry, 0, 0, TAU); ctx.fill();
    ctx.fillStyle = "#4FA85A"; ctx.beginPath(); ctx.ellipse(p.x + pr.rx*.6, p.y - pr.ry*.35, 16, 8, .3, 0, TAU); ctx.fill();
    ctx.beginPath(); ctx.ellipse(p.x + pr.rx*.45, p.y + pr.ry*.4, 12, 6, -.4, 0, TAU); ctx.fill();
    const bob = RM ? 0 : Math.sin(time*2)*2;
    drawDuck(p.x - 30, p.y + bob, 1.45, 1, {mom:true, swim:true});
    for (let i = 0; i < delivered; i++) drawDuck(p.x - 40 - pondGap()*(i + 1), p.y + 6 + (RM ? 0 : Math.sin(time*2 + i)*2), .8, 1, {swim:true});

    // kaldırımlar, yol ve refüj
    const topRow = rows[rows.length - 1];
    sidewalk(topRow.y0, topRow.h);
    sidewalk(rows[0].y0, rows[0].h);
    ctx.fillStyle = "#B9B09D"; ctx.fillRect(0, topRow.y0 + topRow.h - 6, W, 6); ctx.fillRect(0, rows[0].y0, W, 6);
    for (let i = 1; i < rows.length - 1; i++){
      const r = rows[i];
      if (r.type === "median"){
        ctx.fillStyle = "#7CC45A"; ctx.fillRect(0, r.y0, W, r.h);
        ctx.fillStyle = "#E6E0D2"; ctx.fillRect(0, r.y0, W, 6); ctx.fillRect(0, r.y0 + r.h - 6, W, 6);
        for (let x = 30; x < W; x += 90) if (Math.abs(x - W/2) > 50) flower(x, r.y + ((x/90) % 2 ? -6 : 8), x % 180 ? "#FF7EB6" : "#FFFFFF");
      } else {
        ctx.fillStyle = "#555A63"; ctx.fillRect(0, r.y0, W, r.h);
      }
    }
    // şerit çizgileri
    for (let i = 1; i < rows.length - 1; i++){
      const r = rows[i], up = rows[i + 1];
      if (r.type !== "lane") continue;
      if (up.type === "lane"){
        if (up.dir === r.dir){
          ctx.fillStyle = "#FFFFFF";
          for (let x = (time*0) % 60; x < W; x += 60) ctx.fillRect(x, r.y0 - 2, 32, 4);
        } else { ctx.fillStyle = "#FFC93C"; ctx.fillRect(0, r.y0 - 5, W, 3); ctx.fillRect(0, r.y0 + 2, W, 3); }
      }
    }
    // yaya geçidi
    if (lv.light){
      ctx.fillStyle = "rgba(255,255,255,.92)";
      for (const r of rows) if (r.type === "lane") for (let y = r.y0 + 5; y < r.y0 + r.h - 8; y += 17) ctx.fillRect(W/2 - CW/2, y, CW, 9);
      ctx.fillStyle = "rgba(255,255,255,.8)";
      const lanes = rows.filter(r => r.type === "lane");
      for (const r of lanes){ const x = r.dir > 0 ? W/2 - CW/2 - 16 : W/2 + CW/2 + 10; ctx.fillRect(x, r.y0 + 4, 6, r.h - 8); }
    }
    // araçlar: üst şeritten alta doğru
    for (let i = rows.length - 2; i >= 1; i--){
      const r = rows[i];
      if (r.type === "lane") for (const c of r.cars) drawVehicle(c, r);
    }
    // ışıklar
    if (lv.light){
      carSignal(W/2 - CW/2 - 44, rows[0].y + 34);
      carSignal(W/2 + CW/2 + 44, topRow.y + 22);
      pedSignal(W/2 + CW/2 + 40, rows[0].y + 44);
    }
    // yuva ve bekleyen yavrular
    const nx = W/2 - Math.min(150, W*.28), ny = rows[0].y + 18;
    ctx.fillStyle = "#9A6B3E"; ctx.beginPath(); ctx.ellipse(nx, ny + 8, 58, 14, 0, 0, TAU); ctx.fill();
    ctx.strokeStyle = "#C79A5B"; ctx.lineWidth = 2;
    ctx.beginPath(); for (let i = -50; i < 50; i += 9){ ctx.moveTo(nx + i, ny + 2); ctx.lineTo(nx + i + 12, ny + 14); } ctx.stroke();
    const waiting = DUCKS - delivered - (duck ? 1 : 0);
    for (let i = 0; i < waiting; i++) drawDuck(nx - 24 + i*34, ny - 8 + (RM ? 0 : Math.sin(time*3 + i)*1.5), .7, 1, {});

    // yavru
    if (duck){
      const q = duckPos();
      const can = phase === "play" && canGo();
      if (phase === "play" && duck.mode === "walk" && duck.t >= 1 && duck.row < rows.length - 1){
        if (can) arrow(q.x, q.y - 62, true);
        else if (!lv.light || rows[duck.row].type === "side") arrow(q.x, q.y - 58, false);
      }
      drawDuck(q.x, q.y, 1.05, duck.face, {step:q.hop ? time*30 : 0, flap:duck.mode === "bounce" ? time*40 : 0, swim:duck.mode === "swim" && duck.swimT > .6});
    }
    for (const pt of parts){
      ctx.globalAlpha = clamp(pt.life/pt.max*1.5, 0, 1);
      ctx.fillStyle = pt.c; ctx.beginPath(); ctx.arc(pt.x, pt.y, pt.r, 0, TAU); ctx.fill();
    }
    ctx.globalAlpha = 1;

    // üst bilgi: bölüm noktaları ve gelen yavrular
    for (let i = 0; i < LEVELS.length; i++){
      ctx.fillStyle = i === level ? "#FFC529" : i < level ? "#FFFFFF" : "rgba(255,255,255,.45)";
      ctx.beginPath(); ctx.arc(26 + i*24, 24, i === level ? 9 : 7, 0, TAU); ctx.fill();
    }
    for (let i = 0; i < DUCKS; i++){
      ctx.globalAlpha = i < delivered ? 1 : .35;
      drawDuck(W - 34 - i*40, 26, .55, -1, {swim:true});
    }
    ctx.globalAlpha = 1;
  }

  /* ---------- giriş ---------- */
  cv.addEventListener("pointerdown", e => {
    e.preventDefault(); audio();
    if (phase !== "play" || !duck) return;
    const pt = toLogical(e), q = duckPos();
    if (pt.y > q.y + 45) back(); else forward();
  });
  window.addEventListener("keydown", e => {
    if (phase !== "play") return;
    if (e.key === "ArrowUp" || e.key === " " || e.key === "w" || e.key === "W"){ e.preventDefault(); audio(); if (!e.repeat) forward(); }
    else if (e.key === "ArrowDown" || e.key === "s" || e.key === "S"){ e.preventDefault(); audio(); if (!e.repeat) back(); }
  });

  function renderLevels(){
    const box = $("levels"); box.textContent = "";
    LEVELS.forEach((L, i) => {
      const b = document.createElement("button");
      b.type = "button"; b.className = "lvl";
      b.setAttribute("aria-label", `Bölüm ${i + 1}${L.light ? ", ışıklı" : ", ışıksız"}${best[i] ? ", " + best[i] + " yıldız" : ""}`);
      b.innerHTML = `<span class="ic" aria-hidden="true">${L.light ? "🚦" : "👀"}</span>${i + 1}<small aria-hidden="true">${"★".repeat(best[i] || 0)}</small>`;
      b.addEventListener("click", () => { audio(); startLevel(i); });
      box.appendChild(b);
    });
  }
  function showIntro(){
    phase = "intro"; timers = [];
    if (canSpeak) speechSynthesis.cancel();
    $("intro").hidden = false; $("done").hidden = true; $("party").hidden = true;
  }
  $("play").addEventListener("click", () => {
    audio();
    const i = LEVELS.findIndex((_, k) => !best[k]);
    startLevel(i < 0 ? 0 : i);
  });
  $("next").addEventListener("click", () => { audio(); startLevel(level + 1); });
  $("replay").addEventListener("click", () => { audio(); startLevel(level); });
  $("again").addEventListener("click", () => { audio(); showIntro(); });
  $("menu").addEventListener("click", () => { audio(); showIntro(); });
  document.addEventListener("visibilitychange", () => { if (document.hidden && canSpeak) speechSynthesis.cancel(); last = performance.now(); });

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
  window.__oy = {
    LEVELS, startLevel, forward, back, canGo, update, draw, get rows(){ return rows; },
    get st(){ return {phase, level, delivered, mistakes, light:light.st, duck:duck && {row:duck.row, t:duck.t, mode:duck.mode}, rows:rows.length, W}; }
  };

  if ("ResizeObserver" in window) new ResizeObserver(resize).observe(stage);
  else window.addEventListener("resize", resize);
  resize();
  renderLevels();
  // arka planda sokağı canlı göster
  startLevel(0, true); phase = "intro"; $("intro").hidden = false;
  requestAnimationFrame(frame);
})();
