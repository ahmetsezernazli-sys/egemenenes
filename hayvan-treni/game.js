/* Hayvan Treni — Egemen için sayma oyunu */
(function(){
  "use strict";

  const W = 1000, H = 620;                // mantıksal sahne, ekrana sığdırılır
  const RAIL_Y = 430, WAGON_W = 230, GAP = 15, PLAT_Y = 545;
  const WAGONS = 3, SPOTS = 10, CAP = 10;
  // Her tren biraz daha zor: ilk trende koltuk sayısı görünür ve düdük gerekmez.
  const TRAINS = [
    {min:1, max:3, seats:true,  auto:true},
    {min:2, max:4, seats:true,  auto:false},
    {min:3, max:5, seats:true,  auto:false},
    {min:4, max:7, seats:false, auto:false},
    {min:5, max:9, seats:false, auto:false}
  ];
  const NUMS = ["bir", "iki", "üç", "dört", "beş", "altı", "yedi", "sekiz", "dokuz", "on"];
  const NUMS_ACC = ["birini", "ikisini", "üçünü", "dördünü", "beşini", "altısını", "yedisini", "sekizini", "dokuzunu", "onunu"];
  const ANIMALS = ["🐶", "🐱", "🐰", "🐻", "🐼", "🦊", "🐸", "🐷", "🐮", "🐵", "🐔", "🐧", "🦁", "🐯", "🐨", "🐹"];
  const WAGON_COLORS = [["#3D8BFD", "#2A64C0"], ["#FFC529", "#C98F00"], ["#9B5DE5", "#6E36B8"]];
  const RAINBOW = ["#E4483B", "#C98F00", "#2A64C0", "#1E8A41", "#6E36B8"];
  const SOUND_KEY = "hayvan-treni-ses";
  const RM = window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches;
  const EMOJI_FONT = '"Segoe UI Emoji","Apple Color Emoji","Noto Color Emoji",sans-serif';
  const FONT = '"Baloo 2", "Comic Sans MS", sans-serif';

  const $ = id => document.getElementById(id);
  const stage = $("stage"), cv = $("cv"), ctx = cv.getContext("2d");
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const rand = (a, b) => a + Math.random()*(b - a);
  const cap = s => s.charAt(0).toLocaleUpperCase("tr") + s.slice(1);

  let soundOn = true;
  try { soundOn = localStorage.getItem(SOUND_KEY) !== "0"; } catch(e) {}

  let phase = "intro";     // intro | arrive | play | depart | party
  let trainNo = 0, trainX = 30, trainV = 0, active = 0, lastTouch = 0, time = 0, busyT = 0;
  let wagons = [], animals = [], flights = [], puffs = [], stars = [];
  const spots = new Array(SPOTS).fill(null);
  let nextId = 1;

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
  function chuff(delay){
    const a = audio(); if (!a || !soundOn) return;
    const len = Math.floor(a.sampleRate*.14), buf = a.createBuffer(1, len, a.sampleRate), d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = (Math.random()*2 - 1)*Math.pow(1 - i/len, 2);
    const src = a.createBufferSource(); src.buffer = buf;
    const f = a.createBiquadFilter(); f.type = "lowpass"; f.frequency.value = 700;
    const g = a.createGain(); g.gain.value = .35;
    src.connect(f).connect(g).connect(a.destination); src.start(a.currentTime + (delay || 0));
  }
  const COUNT_NOTES = [523.25, 587.33, 659.25, 698.46, 783.99, 880, 987.77, 1046.5, 1174.66, 1318.5];
  const sfx = {
    hop(){ tone(400, .18, "sine", .12, 800); },
    land(n){ tone(COUNT_NOTES[clamp(n - 1, 0, 9)], .2, "triangle", .14); },
    back(){ tone(700, .16, "sine", .1, 350); },
    whistle(){ tone(1180, .5, "sine", .12, 1240); tone(1480, .5, "sine", .08, 1520); },
    bell(){ tone(1568, .35, "triangle", .12); tone(2093, .45, "sine", .07, null, .06); },
    oops(){ tone(330, .25, "sine", .12, 220); },
    depart(){ sfx.whistle(); for (let i = 0; i < 6; i++) chuff(.5 + i*.28); },
    party(){ [523.25, 659.25, 783.99, 1046.5, 1318.5].forEach((f, i) => tone(f, .3, "triangle", .14, null, i*.12)); }
  };
  const canSpeak = "speechSynthesis" in window;
  let trVoice = null;
  function pickVoice(){ trVoice = speechSynthesis.getVoices().find(v => /^tr(-|_|$)/i.test(v.lang)) || null; }
  if (canSpeak){ pickVoice(); if (speechSynthesis.addEventListener) speechSynthesis.addEventListener("voiceschanged", pickVoice); }
  function say(text, interrupt){
    if (!canSpeak || !soundOn || !trVoice) return;
    if (interrupt) speechSynthesis.cancel();
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

  /* ---------- sahne düzeni ---------- */
  const wagonX = i => trainX + i*(WAGON_W + GAP);
  const spotX = k => 70 + k*(860/(SPOTS - 1));

  function seatLayout(n){
    // koltuk merkezleri, vagonun soluna göre
    const out = [], left = 18, width = 194;
    if (n <= 5){ for (let k = 0; k < n; k++) out.push([left + (k + .5)*width/n, 319]); }
    else { for (let k = 0; k < n; k++){ const r = k < 5 ? 0 : 1, c = r ? k - 5 : k; out.push([left + (c + .5)*width/5, r ? 344 : 294]); } }
    return out;
  }

  function newAnimal(k){
    const a = {id:nextId++, e:ANIMALS[Math.random()*ANIMALS.length | 0], spot:k, wagon:null, seat:null, flying:false, pop:RM ? 1 : 0};
    animals.push(a); spots[k] = a;
    return a;
  }
  function refill(){
    for (let k = 0; k < SPOTS; k++) if (!spots[k]) newAnimal(k);
  }

  function newTrain(){
    const t = TRAINS[trainNo];
    const pool = [];
    for (let n = t.min; n <= t.max; n++) pool.push(n);
    const targets = [];
    for (let i = 0; i < WAGONS; i++){
      let n;
      do { n = pool[Math.random()*pool.length | 0]; } while (pool.length > 2 && targets.includes(n) && Math.random() < .7);
      targets.push(n);
    }
    wagons = targets.map((n, i) => ({target:n, seats:seatLayout(t.seats ? n : CAP).map(p => ({x:p[0], y:p[1], occ:null})), closed:false, wiggle:0, color:WAGON_COLORS[i]}));
    // önceki trende binmiş hayvanlar trenle gitti
    animals = animals.filter(a => a.wagon === null && !a.flying);
    active = 0; flights = [];
    trainX = -1100; trainV = 0;
    phase = "arrive";
    refill();
    for (let i = 0; i < 6; i++) chuff(i*.3);
    $("whistle").hidden = true;
  }

  function startGame(){
    audio();
    $("intro").hidden = true; $("party").hidden = true;
    trainNo = 0; stars = [];
    animals = []; spots.fill(null);
    newTrain();
    say("Tren geliyor!", true);
    lastTouch = time;
  }

  function promptWagon(interrupt){
    const w = wagons[active];
    say(`Bu vagona ${NUMS[w.target - 1]} hayvan bindir.`, interrupt);
    $("whistle").hidden = TRAINS[trainNo].auto;
    lastTouch = time;
  }

  function countIn(w){ return w.seats.filter(s => s.occ).length; }

  /* ---------- dokunma ---------- */
  function toLogical(e){
    const r = cv.getBoundingClientRect();
    return {x:(e.clientX - r.left - view.ox)/view.s, y:(e.clientY - r.top - view.oy)/view.s};
  }

  function tap(x, y){
    if (phase !== "play" || busyT > 0) return;
    lastTouch = time;
    const w = wagons[active];
    // vagondaki hayvana dokununca perona geri iner
    const wx = wagonX(active);
    for (const s of w.seats){
      if (s.occ && !s.occ.flying && Math.hypot(x - (wx + s.x), y - s.y) < 30){
        const free = spots.indexOf(null);
        if (free < 0) return;
        const a = s.occ; s.occ = null;
        a.wagon = null; a.seat = null; a.spot = free; spots[free] = a;
        fly(a, wx + s.x, s.y, spotX(free), PLAT_Y, false);
        sfx.back();
        return;
      }
    }
    // perondaki hayvana dokununca etkin vagona biner
    for (let k = 0; k < SPOTS; k++){
      const a = spots[k];
      if (!a || a.flying) continue;
      if (Math.hypot(x - spotX(k), y - (PLAT_Y - 10)) > 48) continue;
      const seat = w.seats.find(s => !s.occ);
      if (!seat){ w.wiggle = .5; sfx.oops(); say(TRAINS[trainNo].seats ? "Bu vagon doldu." : "Yer kalmadı, düdüğe bas.", true); return; }
      spots[k] = null; a.spot = null; a.wagon = active; a.seat = seat; seat.occ = a;
      fly(a, spotX(k), PLAT_Y, wx + seat.x, seat.y, true);
      sfx.hop();
      return;
    }
  }

  function fly(a, fx, fy, tx, ty, boarding){
    a.flying = true;
    flights.push({a, fx, fy, tx, ty, t:0, dur:RM ? .05 : .45, boarding});
  }

  function landed(f){
    const a = f.a; a.flying = false;
    if (!f.boarding) return;
    const w = wagons[a.wagon];
    if (!w || w.closed) return;
    const n = countIn(w);
    sfx.land(n);
    say(cap(NUMS[n - 1]) + "!", true);
    if (TRAINS[trainNo].auto && n === w.target && !flights.some(g => g !== f && g.boarding)) setTimeout(() => closeWagon(true), 450);
  }

  function whistle(){
    if (phase !== "play" || busyT > 0 || TRAINS[trainNo].auto) return;
    audio(); lastTouch = time;
    if (flights.length) return;
    const w = wagons[active], n = countIn(w);
    if (n === w.target){ sfx.whistle(); closeWagon(false); return; }
    w.wiggle = .6; sfx.oops();
    if (n < w.target){
      const d = w.target - n;
      say(d === 1 ? "Bir hayvan daha lazım." : `${cap(NUMS[d - 1])} hayvan daha lazım.`, true);
    } else {
      const d = n - w.target;
      say(`Çok fazla oldu. ${cap(NUMS_ACC[d - 1])} indir.`, true);
    }
  }

  function closeWagon(auto){
    if (phase !== "play") return;
    const w = wagons[active];
    if (w.closed) return;
    w.closed = true; busyT = .9;
    sfx.bell();
    burstStars(wagonX(active) + WAGON_W/2, 230);
    say(`${cap(NUMS[w.target - 1])} hayvan! Harika!`, !auto);
    setTimeout(() => {
      refill();
      if (active < WAGONS - 1){ active++; promptWagon(false); }
      else depart();
    }, 900);
  }

  function depart(){
    phase = "depart"; trainV = 0;
    $("whistle").hidden = true;
    sfx.depart();
    say("Çuf çuf! Hoşça kalın!", false);
  }

  function afterDeparture(){
    trainNo++;
    if (trainNo >= TRAINS.length){
      phase = "party";
      sfx.party();
      say("Aferin Egemen! Bütün trenler yola çıktı!", true);
      for (let i = 0; i < 5; i++) setTimeout(() => burstStars(rand(200, 800), rand(150, 350)), i*300);
      $("party").hidden = false;
      $("again").focus({preventScroll:true});
    } else {
      newTrain();
    }
  }

  function burstStars(x, y){
    if (RM) return;
    for (let i = 0; i < 16; i++){
      const a = rand(0, Math.PI*2), sp = rand(120, 320);
      stars.push({x, y, vx:Math.cos(a)*sp, vy:Math.sin(a)*sp - 120, life:rand(.7, 1.1), max:1.1, r:rand(8, 16), rot:rand(0, 6), c:RAINBOW[i % RAINBOW.length]});
    }
  }

  cv.addEventListener("pointerdown", e => { e.preventDefault(); audio(); const p = toLogical(e); tap(p.x, p.y); });
  cv.addEventListener("contextmenu", e => e.preventDefault());
  $("whistle").addEventListener("click", whistle);
  $("play").addEventListener("click", startGame);
  $("again").addEventListener("click", startGame);

  /* ---------- güncelleme ---------- */
  function update(dt){
    time += dt;
    busyT = Math.max(0, busyT - dt);
    for (const w of wagons) w.wiggle = Math.max(0, w.wiggle - dt);
    for (const a of animals) a.pop = Math.min(1, a.pop + dt*4);

    if (phase === "arrive"){
      // yavaşlayarak istasyona girer
      const dist = 30 - trainX;
      trainX += Math.max(40, dist*2.2)*dt;
      if (trainX >= 30){ trainX = 30; phase = "play"; promptWagon(true); }
      if (!RM && Math.random() < dt*10) puff();
    } else if (phase === "depart"){
      trainV += 260*dt; trainX += trainV*dt;
      if (!RM && Math.random() < dt*12) puff();
      if (trainX > W + 60) afterDeparture();
    }

    for (const f of flights){ f.t += dt; }
    const done = flights.filter(f => f.t >= f.dur);
    flights = flights.filter(f => f.t < f.dur);
    done.forEach(landed);

    for (const p of puffs){ p.life -= dt; p.x += p.vx*dt; p.y += p.vy*dt; p.r += 18*dt; }
    puffs = puffs.filter(p => p.life > 0);
    for (const s of stars){ s.life -= dt; s.vy += 500*dt; s.x += s.vx*dt; s.y += s.vy*dt; s.rot += dt*4; }
    stars = stars.filter(s => s.life > 0);
  }

  function puff(){
    const lx = wagonX(WAGONS);
    puffs.push({x:lx + 170, y:225, vx:rand(-40, -10), vy:rand(-60, -30), r:rand(10, 16), life:1.4, max:1.4});
  }

  /* ---------- çizim ---------- */
  const view = {s:1, ox:0, oy:0, dpr:1};
  function resize(){
    const r = stage.getBoundingClientRect();
    view.dpr = Math.min(window.devicePixelRatio || 1, 2);
    cv.width = Math.round(r.width*view.dpr); cv.height = Math.round(r.height*view.dpr);
    view.s = Math.min(r.width/W, r.height/H);
    view.ox = (r.width - W*view.s)/2; view.oy = (r.height - H*view.s)/2;
  }

  function rr(x, y, w, h, r){
    ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
  }
  function circle(x, y, r){ ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI*2); ctx.fill(); }
  // Chrome renkli emojiye fillStyle saydamlığını da uygular, bu yüzden her seferinde opak renge dön
  function emoji(e, x, y, size){ ctx.fillStyle = "#000"; ctx.font = `${Math.round(size)}px ${EMOJI_FONT}`; ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.fillText(e, x, y); }

  function wheel(x, y, r){
    ctx.fillStyle = "#2B2B3A"; circle(x, y, r);
    ctx.fillStyle = "#8A8FA3"; circle(x, y, r*.35);
    ctx.strokeStyle = "#8A8FA3"; ctx.lineWidth = 3;
    const rot = trainX/r;
    ctx.beginPath();
    for (let i = 0; i < 3; i++){ const a = rot + i*Math.PI/3; ctx.moveTo(x - Math.cos(a)*r*.8, y - Math.sin(a)*r*.8); ctx.lineTo(x + Math.cos(a)*r*.8, y + Math.sin(a)*r*.8); }
    ctx.stroke();
  }

  function drawBackground(){
    const g = ctx.createLinearGradient(0, 0, 0, RAIL_Y);
    g.addColorStop(0, "#9FD8F2"); g.addColorStop(1, "#FFF1D6");
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = "#FFD23F"; circle(880, 90, 46);
    ctx.fillStyle = "rgba(255,255,255,.9)";
    for (const [cx, cy, s] of [[180, 90, 1], [470, 60, .8], [690, 130, .7]]){
      const dx = RM ? 0 : ((time*8*s) % 1200);
      const x = ((cx + dx + 100) % 1200) - 100;
      circle(x, cy, 26*s); circle(x + 30*s, cy - 12*s, 32*s); circle(x + 64*s, cy, 24*s);
    }
    ctx.fillStyle = "#A9DB8E";
    ctx.beginPath(); ctx.moveTo(0, RAIL_Y); ctx.quadraticCurveTo(220, 250, 460, RAIL_Y - 60); ctx.quadraticCurveTo(700, 300, 1000, RAIL_Y - 40); ctx.lineTo(1000, RAIL_Y); ctx.closePath(); ctx.fill();
    ctx.fillStyle = "#86C96B";
    ctx.beginPath(); ctx.moveTo(0, RAIL_Y); ctx.quadraticCurveTo(300, 330, 620, RAIL_Y - 20); ctx.quadraticCurveTo(820, 360, 1000, RAIL_Y - 10); ctx.lineTo(1000, RAIL_Y); ctx.closePath(); ctx.fill();
    // ray
    ctx.fillStyle = "#9C7A5B";
    for (let x = 0; x < W; x += 34) ctx.fillRect(x, RAIL_Y + 2, 18, 12);
    ctx.fillStyle = "#6D6F80"; ctx.fillRect(0, RAIL_Y, W, 5);
    // peron
    ctx.fillStyle = "#E9C9A3"; ctx.fillRect(0, 462, W, H - 462);
    ctx.strokeStyle = "rgba(160,110,70,.18)"; ctx.lineWidth = 2;
    ctx.beginPath();
    for (let y = 500; y < H; y += 40){ ctx.moveTo(0, y); ctx.lineTo(W, y); }
    for (let row = 0, y = 462; y < H; y += 40, row++){ for (let x = (row % 2) ? 40 : 0; x < W; x += 80){ ctx.moveTo(x, y); ctx.lineTo(x, y + 38); } }
    ctx.stroke();
    ctx.fillStyle = "#FFD23F"; ctx.fillRect(0, 450, W, 14);
    ctx.fillStyle = "#2A2540";
    for (let x = 0; x < W; x += 40) ctx.fillRect(x, 450, 20, 14);
  }

  function drawWagon(i){
    const w = wagons[i], x = wagonX(i) + (w.wiggle > 0 ? Math.sin(w.wiggle*40)*6 : 0);
    const [col, dark] = w.closed ? ["#2DB75A", "#1E8A41"] : w.color;
    // bağlantı
    ctx.fillStyle = "#2B2B3A"; ctx.fillRect(x + WAGON_W - 4, 360, GAP + 8, 10);
    wheel(x + 48, 405, 22); wheel(x + WAGON_W - 48, 405, 22);
    rr(x, 250, WAGON_W, 135, 14); ctx.fillStyle = col; ctx.fill();
    ctx.fillStyle = dark; ctx.fillRect(x, 372, WAGON_W, 13);
    rr(x - 8, 238, WAGON_W + 16, 18, 8); ctx.fillStyle = dark; ctx.fill();
    rr(x + 14, 268, WAGON_W - 28, 102, 12); ctx.fillStyle = "#FFF8E7"; ctx.fill();

    const t = TRAINS[Math.min(trainNo, TRAINS.length - 1)];
    if (t.seats && !w.closed){
      ctx.strokeStyle = "rgba(42,37,64,.28)"; ctx.lineWidth = 3; ctx.setLineDash([6, 5]);
      for (const s of w.seats){ ctx.beginPath(); ctx.arc(x + s.x, s.y, w.seats.length <= 3 ? 26 : 20, 0, Math.PI*2); ctx.stroke(); }
      ctx.setLineDash([]);
    }
    const size = w.seats.length <= 3 ? 50 : w.seats.length <= 5 ? 40 : 34;
    for (const s of w.seats){ if (s.occ && !s.occ.flying) emoji(s.occ.e, x + s.x, s.y + 2, size); }

    // sayı rozeti
    const isActive = phase === "play" && i === active && !w.closed;
    const pulse = isActive && !RM ? 1 + Math.sin(time*5)*.06 : 1;
    const bx = x + WAGON_W/2, by = 206, br = 38*pulse;
    if (isActive){ ctx.fillStyle = "rgba(255,210,63,.55)"; circle(bx, by, br + 12); }
    ctx.fillStyle = "#FFFFFF"; circle(bx, by, br);
    ctx.strokeStyle = w.closed ? "#1E8A41" : dark; ctx.lineWidth = 6; ctx.beginPath(); ctx.arc(bx, by, br, 0, Math.PI*2); ctx.stroke();
    ctx.fillStyle = w.closed ? "#1E8A41" : "#2A2540";
    ctx.font = `800 ${Math.round(56*pulse)}px ${FONT}`; ctx.textAlign = "center"; ctx.textBaseline = "middle";
    ctx.fillText(w.closed ? "✓" : String(w.target), bx, by + 4);
  }

  function drawLoco(){
    const x = wagonX(WAGONS);
    wheel(x + 45, 402, 25); wheel(x + 115, 402, 25); wheel(x + 180, 405, 20);
    rr(x, 225, 90, 160, 12); ctx.fillStyle = "#C73A2F"; ctx.fill();
    rr(x + 16, 248, 58, 52, 8); ctx.fillStyle = "#FFF8E7"; ctx.fill();
    rr(x - 8, 212, 106, 20, 8); ctx.fillStyle = "#2B2B3A"; ctx.fill();
    rr(x + 70, 290, 150, 95, 20); ctx.fillStyle = "#E4483B"; ctx.fill();
    ctx.fillStyle = "#2B2B3A"; ctx.fillRect(x + 150, 245, 30, 48); ctx.fillRect(x + 142, 236, 46, 14);
    ctx.fillStyle = "#FFD23F"; circle(x + 222, 330, 13);
    ctx.fillStyle = "#2B2B3A";
    ctx.beginPath(); ctx.moveTo(x + 210, 385); ctx.lineTo(x + 245, 420); ctx.lineTo(x + 200, 420); ctx.closePath(); ctx.fill();
    // makinist
    emoji("🐘", x + 45, 280, 40);
  }

  function drawPlatformAnimals(){
    for (let k = 0; k < SPOTS; k++){
      const a = spots[k];
      if (!a || a.flying) continue;
      const bob = RM ? 0 : Math.sin(time*3 + a.id)*3;
      const sc = .4 + .6*a.pop;
      ctx.fillStyle = "rgba(42,37,64,.15)"; ctx.beginPath(); ctx.ellipse(spotX(k), PLAT_Y + 28, 26*sc, 7*sc, 0, 0, Math.PI*2); ctx.fill();
      emoji(a.e, spotX(k), PLAT_Y - 4 + bob, 62*sc);
    }
  }

  function drawFlights(){
    for (const f of flights){
      const u = clamp(f.t/f.dur, 0, 1), e = u < .5 ? 2*u*u : 1 - Math.pow(-2*u + 2, 2)/2;
      const x = f.fx + (f.tx - f.fx)*e, y = f.fy + (f.ty - f.fy)*e - Math.sin(Math.PI*u)*120;
      emoji(f.a.e, x, y, f.boarding ? 62 - 20*e : 42 + 20*e);
    }
  }

  function drawHud(){
    // 5 tren, bitenler dolu
    for (let i = 0; i < TRAINS.length; i++){
      const x = 24 + i*52, y = 24, done = i < trainNo || phase === "party";
      ctx.globalAlpha = done ? 1 : (i === trainNo ? .9 : .35);
      rr(x, y, 40, 24, 6); ctx.fillStyle = done ? "#2DB75A" : (i === trainNo ? "#E4483B" : "#FFFFFF"); ctx.fill();
      ctx.fillStyle = "#2B2B3A"; circle(x + 10, y + 26, 6); circle(x + 30, y + 26, 6);
      ctx.globalAlpha = 1;
    }
  }

  function drawHint(){
    if (phase !== "play" || trainNo > 1 || time - lastTouch < 5 || busyT > 0) return;
    const w = wagons[active];
    if (countIn(w) >= w.target){
      if (!TRAINS[trainNo].auto){ const r = $("whistle").getBoundingClientRect(), s = cv.getBoundingClientRect(); const hx = (r.left - s.left + r.width*.2 - view.ox)/view.s, hy = (r.top - s.top - view.oy)/view.s - 30; emoji("👇", hx, hy + Math.sin(time*6)*8, 56); }
      return;
    }
    const k = spots.findIndex(a => a && !a.flying);
    if (k < 0) return;
    emoji("👆", spotX(k) + 20, PLAT_Y + 60 + Math.sin(time*6)*8, 50);
  }

  function draw(){
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = "#BDE6F7"; ctx.fillRect(0, 0, cv.width, cv.height);
    ctx.setTransform(view.dpr*view.s, 0, 0, view.dpr*view.s, view.dpr*view.ox, view.dpr*view.oy);
    ctx.save(); ctx.beginPath(); ctx.rect(0, 0, W, H); ctx.clip();
    drawBackground();
    for (const p of puffs){ ctx.fillStyle = `rgba(255,255,255,${(.8*p.life/p.max).toFixed(3)})`; circle(p.x, p.y, p.r); }
    if (phase !== "intro" && phase !== "party" && wagons.length){ for (let i = 0; i < WAGONS; i++) drawWagon(i); drawLoco(); }
    drawPlatformAnimals();
    drawFlights();
    for (const s of stars){
      ctx.save(); ctx.globalAlpha = clamp(s.life/s.max*1.5, 0, 1); ctx.translate(s.x, s.y); ctx.rotate(s.rot); ctx.fillStyle = s.c;
      ctx.beginPath();
      for (let i = 0; i < 10; i++){ const a = -Math.PI/2 + i*Math.PI/5, r = i % 2 ? s.r*.45 : s.r; i ? ctx.lineTo(Math.cos(a)*r, Math.sin(a)*r) : ctx.moveTo(Math.cos(a)*r, Math.sin(a)*r); }
      ctx.closePath(); ctx.fill(); ctx.restore();
    }
    if (phase !== "intro") drawHud();
    drawHint();
    ctx.restore();
  }

  let last = performance.now();
  function frame(now){
    const dt = Math.min(.05, (now - last)/1000); last = now;
    update(dt); draw();
    requestAnimationFrame(frame);
  }

  if ("ResizeObserver" in window) new ResizeObserver(resize).observe(stage);
  else window.addEventListener("resize", resize);
  resize();
  refill();   // açılışta peronda hayvanlar beklesin
  requestAnimationFrame(frame);
})();
