/* Penaltı Atışları — iki kişi ya da bilgisayara karşı */
(function(){
  "use strict";

  const W = 1000, H = 620;
  const GOAL = {l:250, r:750, top:170, bottom:380};
  const BALL0 = {x:500, y:560, r:34};
  const KEEPER0 = {x:500, y:282};
  const COLORS = ["#3D6BF2", "#FF7A2F"], AVATARS = ["🚀", "🎈"];
  // seviye: 0 Kolay, 1 Normal, 2 Zor
  const AIM_SPEED = [1.05, 1.7, 2.4];          // nişanın gezinme hızı (şutçu)
  const FLIGHT = [1.25, .85, .7];              // topun kaleye varış süresi (kalecinin seviyesi)
  const REACH = [56, 40, 36];                  // eldiven menzili (kalecinin seviyesi)
  const DIVE_X = [128, 96, 90], DIVE_T = .42; // kalecinin ortadan en fazla uçabildiği mesafe; köşeler kurtarılamaz
  const KICK_FAST = [.85, 1, 1];               // Kolay şutçunun topu biraz daha hızlı gider
  // bilgisayar her seviyede normal fizikle oynar; zorluk tepki süresi ve isabetten gelir
  const CPU_REACT = [.72, .46, .3], CPU_ERR = [150, 80, 38];
  const SETTINGS_KEY = "penalti-ayar", SOUND_KEY = "penalti-ses";
  const RM = window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches;
  const TAU = Math.PI*2;

  const $ = id => document.getElementById(id);
  const stage = $("stage"), cv = $("cv"), ctx = cv.getContext("2d");
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const rand = (a, b) => a + Math.random()*(b - a);
  const ease = t => 1 - Math.pow(1 - t, 3);

  let settings = {mode:"2p", players:[{name:"Enes", lv:1}, {name:"Egemen", lv:0}]};
  try { const s = JSON.parse(localStorage.getItem(SETTINGS_KEY)); if (s && Array.isArray(s.players) && s.players.length === 2) settings = {mode:s.mode === "cpu" ? "cpu" : "2p", players:s.players.map((p, i) => ({name:String(p.name || "").slice(0, 12) || ["Enes", "Egemen"][i], lv:clamp(p.lv | 0, 0, 2)}))}; } catch(e) {}
  let soundOn = true;
  try { soundOn = localStorage.getItem(SOUND_KEY) !== "0"; } catch(e) {}

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
  function crowd(dur, vol, freq){
    const a = audio(); if (!a || !soundOn) return;
    const len = Math.floor(a.sampleRate*dur), buf = a.createBuffer(1, len, a.sampleRate), d = buf.getChannelData(0);
    for (let i = 0; i < len; i++){ const env = Math.min(1, i/(a.sampleRate*.15))*Math.pow(1 - i/len, 1.5); d[i] = (Math.random()*2 - 1)*env; }
    const s = a.createBufferSource(); s.buffer = buf;
    const f = a.createBiquadFilter(); f.type = "bandpass"; f.frequency.value = freq || 900; f.Q.value = .6;
    const g = a.createGain(); g.gain.value = vol;
    s.connect(f).connect(g).connect(a.destination); s.start();
  }
  const sfx = {
    whistle(){ tone(2600, .12, "sine", .07); tone(2600, .3, "sine", .07, 2500, .16); },
    kick(){ tone(120, .12, "sine", .3, 60); crowd(.08, .5, 400); },
    goal(){ crowd(2.2, .7, 1000); [523.25, 659.25, 783.99].forEach((f, i) => tone(f, .25, "triangle", .08, null, .1 + i*.1)); },
    save(){ crowd(1.2, .45, 500); tone(300, .12, "square", .05, 200); },
    post(){ tone(1400, .5, "triangle", .1, 1300); tone(2100, .4, "sine", .06); crowd(1, .35, 600); },
    out(){ crowd(1, .35, 450); },
    dive(){ crowd(.15, .3, 1800); },
    win(){ [523.25, 659.25, 783.99, 1046.5, 1318.5].forEach((f, i) => tone(f, .3, "triangle", .13, null, i*.12)); crowd(2.5, .6, 1000); }
  };
  const canSpeak = "speechSynthesis" in window;
  let trVoice = null;
  function pickVoice(){ trVoice = speechSynthesis.getVoices().find(v => /^tr(-|_|$)/i.test(v.lang)) || null; }
  if (canSpeak){ pickVoice(); if (speechSynthesis.addEventListener) speechSynthesis.addEventListener("voiceschanged", pickVoice); }
  function say(text, queue){
    if (!canSpeak || !soundOn || !trVoice) return;
    if (!queue) speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text); u.voice = trVoice; u.lang = trVoice.lang; u.rate = 1.02; u.pitch = 1.08;
    speechSynthesis.speak(u);
  }
  function renderSound(){
    $("ic-on").hidden = !soundOn; $("ic-off").hidden = soundOn;
    $("sound").setAttribute("aria-label", soundOn ? "Sesi kapat" : "Sesi aç");
    $("sound").setAttribute("aria-pressed", String(soundOn));
  }
  $("sound").addEventListener("click", () => { soundOn = !soundOn; try { localStorage.setItem(SOUND_KEY, soundOn ? "1" : "0"); } catch(e) {} if (!soundOn && canSpeak) speechSynthesis.cancel(); renderSound(); });
  renderSound();

  /* ---------- oyun durumu ---------- */
  let G = null, time = 0, timers = [], crowdJump = 0;
  const later = (s, fn) => timers.push({t:s, fn});
  const CROWD = Array.from({length:260}, (_, i) => ({x:(i*37.7) % 1000, row:i % 5, c:["#E5484D", "#FFD23F", "#FFFFFF", "#3D6BF2", "#FF7A2F", "#35C46A"][i*7 % 6], p:Math.random()*6}));

  function newMatch(){
    const cpu = settings.mode === "cpu";
    G = {
      players:settings.players.map((p, i) => ({name:(p.name || "").trim() || ["Oyuncu 1", "Oyuncu 2"][i], lv:p.lv, cpu:cpu && i === 1, keeperHint:false, kickHint:false})),
      shots:[[], []], turn:0, state:"intro", aimT:0, aimPhase:0, reticle:{x:500, y:275},
      ball:{x:BALL0.x, y:BALL0.y, r:BALL0.r, t:0, spin:0}, keeper:{x:KEEPER0.x, y:KEEPER0.y, dive:false, sx:0, sy:0, tx:0, ty:0, t:0}, res:null, after:null, cpuShootAt:0
    };
    if (cpu){ G.players[1].name = "Bilgisayar"; }
    timers = [];
    renderBoard();
    startTurn();
  }
  const kicker = () => G.turn % 2, keeper = () => 1 - G.turn % 2;
  const physLv = i => G.players[i].cpu ? 1 : G.players[i].lv;

  function renderBoard(){
    [0, 1].forEach(i => {
      const p = G.players[i], shots = G.shots[i];
      $("nm-" + i).textContent = p.name;
      $("av-" + i).textContent = p.cpu ? "🤖" : AVATARS[i];
      $("sc-" + i).textContent = shots.filter(Boolean).length;
      const n = Math.max(5, shots.length + (G.state !== "end" && kicker() === i && shots.length >= 5 ? 1 : 0));
      $("dots-" + i).innerHTML = Array.from({length:n}, (_, k) => `<i class="${k < shots.length ? (shots[k] ? "g" : "m") : ""}"></i>`).join("");
      $("team-" + i).classList.toggle("kick", G.state !== "end" && kicker() === i);
    });
  }

  function startTurn(){
    const K = G.players[kicker()], Kp = G.players[keeper()];
    G.state = "intro";
    G.ball = {x:BALL0.x, y:BALL0.y, r:BALL0.r, t:0, spin:0, vx:0, vy:0};
    G.keeper = {x:KEEPER0.x, y:KEEPER0.y, dive:false, t:0};
    G.res = null;
    renderBoard();
    banner(`${K.name}`, false, 1.2);
    role(`⚽ ${K.name} şut · 🧤 ${Kp.name} kaleci`);
    let line = `${K.name} şut atıyor, ${Kp.name} kaleci!`;
    if (!K.cpu && !K.kickHint){ K.kickHint = true; line += " Nişan istediğin yerdeyken dokun."; }
    say(line);
    later(1.3, () => {
      G.state = "aim"; G.aimT = 0; G.aimPhase = rand(0, TAU); sfx.whistle();
      if (K.cpu){ G.cpuShootAt = rand(1.1, 2.6); G.cpuCorner = K.lv === 2 && Math.random() < .5; }
      if (!Kp.cpu && !Kp.keeperHint){ Kp.keeperHint = true; later(.2, () => say(`${Kp.name}, top gelince gittiği yere dokun!`, true)); }
    });
  }

  function reticleAt(t, lv, ph){
    // üçgen dalga: nişan kalenin her yerinde eşit süre geçirir
    const tri = v => Math.asin(Math.sin(v))*2/Math.PI;
    const s = AIM_SPEED[lv], ex = [230, 246, 258][lv], ey = [92, 102, 114][lv], cy = [282, 276, 272][lv];
    return {x:500 + tri(t*s + ph)*ex, y:cy + tri(t*s*.63 + ph*1.7)*ey};
  }

  function shoot(){
    if (G.state !== "aim") return;
    const K = G.players[kicker()], Kp = G.players[keeper()];
    const r = G.reticle;
    G.state = "flight";
    G.target = {x:r.x, y:Math.min(r.y, GOAL.bottom - 12)};
    G.flightDur = FLIGHT[physLv(keeper())]*KICK_FAST[physLv(kicker())];
    G.ball.t = 0;
    sfx.kick();
    if (Kp.cpu){
      const err = CPU_ERR[Kp.lv];
      later(CPU_REACT[Kp.lv] + rand(0, .12), () => { if (G.state === "flight") dive(G.target.x + rand(-err, err), G.target.y + rand(-err*.6, err*.6)); });
    }
  }
  function dive(x, y){
    const k = G.keeper;
    if (k.dive || G.state !== "flight") return;
    k.dive = true; k.t = 0; k.sx = k.x; k.sy = k.y;
    const mx = DIVE_X[physLv(keeper())];
    k.tx = clamp(x, KEEPER0.x - mx, KEEPER0.x + mx); k.ty = clamp(y, GOAL.top + 30, GOAL.bottom - 40);
    sfx.dive();
  }

  function resolveShot(){
    const b = G.ball, k = G.keeper, reach = REACH[physLv(keeper())];
    const x = G.target.x, y = G.target.y;
    let res;
    const inX = x > GOAL.l - 6 && x < GOAL.r + 6;
    if (!inX || y < GOAL.top - 6) res = "out";
    else if (Math.abs(x - GOAL.l) < 12 || Math.abs(x - GOAL.r) < 12 || Math.abs(y - GOAL.top) < 12) res = "post";
    else {
      const d = Math.hypot(x - k.x, y - k.y);
      const bodyHit = !k.dive && Math.abs(x - k.x) < 58 && y > k.y - 40;
      res = (k.dive && d < reach) || bodyHit ? "save" : "goal";
    }
    G.res = res;
    const i = kicker();
    G.shots[i].push(res === "goal");
    G.state = "result";
    const K = G.players[i], Kp = G.players[keeper()];
    if (res === "goal"){ sfx.goal(); banner("GOL!", true, 1.6); say(`Gol! ${K.name} attı!`); b.vx = (x - 500)*.25; b.vy = -30; crowdJump = 1.6; }
    else if (res === "save"){ sfx.save(); banner("KURTARDI!", false, 1.6); say(`${Kp.name} kurtardı!`); b.vx = (x < k.x ? -1 : 1)*380; b.vy = -420; }
    else if (res === "post"){ sfx.post(); banner("DİREK!", false, 1.6); say("Direğe çarptı!"); b.vx = (x < 500 ? 1 : -1)*300; b.vy = -380; }
    else { sfx.out(); banner("DIŞARI!", false, 1.6); say("Dışarı gitti!"); b.vx = (x - 500)*.8; b.vy = -60; }
    renderBoard();
    later(2.1, () => { if (matchOver()) endMatch(); else { G.turn++; startTurn(); } });
  }

  function matchOver(){
    const [a, b] = G.shots, ga = a.filter(Boolean).length, gb = b.filter(Boolean).length;
    if (a.length <= 5 && b.length <= 5){
      const remA = 5 - a.length, remB = 5 - b.length;
      if (ga + remA < gb || gb + remB < ga) return true;
      if (a.length === 5 && b.length === 5) return ga !== gb;
      return false;
    }
    return a.length === b.length && ga !== gb;   // seri penaltılar
  }
  function endMatch(){
    G.state = "end";
    const ga = G.shots[0].filter(Boolean).length, gb = G.shots[1].filter(Boolean).length, w = ga > gb ? 0 : 1;
    renderBoard(); sfx.win(); crowdJump = 2.5;
    const winner = G.players[w];
    $("end-title").textContent = winner.cpu ? "Bilgisayar kazandı!" : `${winner.name} kazandı!`;
    $("end-score").textContent = `${ga} – ${gb}`;
    say(winner.cpu ? "Bilgisayar kazandı. Rövanş?" : `${winner.name} kazandı! Tebrikler!`);
    role(""); $("role").hidden = true;
    later(1.2, () => { $("end").hidden = false; $("again").focus(); });
  }

  let bannerT = 0;
  function banner(text, goal, sec){ const el = $("banner"); el.textContent = text; el.classList.toggle("goal", !!goal); el.hidden = false; el.style.animation = "none"; void el.offsetWidth; el.style.animation = ""; bannerT = sec; }
  function role(text){ const el = $("role"); el.textContent = text; el.hidden = !text; }

  /* ---------- giriş ---------- */
  const view = {s:1, ox:0, oy:0, dpr:1};
  function resize(){
    const r = stage.getBoundingClientRect();
    view.dpr = Math.min(window.devicePixelRatio || 1, 2);
    cv.width = Math.round(r.width*view.dpr); cv.height = Math.round(r.height*view.dpr);
    view.s = Math.min(r.width/W, r.height/H);
    view.ox = (r.width - W*view.s)/2; view.oy = (r.height - H*view.s)/2;
  }
  function onTap(x, y){
    if (!G) return;
    if (G.state === "aim" && !G.players[kicker()].cpu) shoot();
    else if (G.state === "flight" && !G.players[keeper()].cpu) dive(x, y);
  }
  cv.addEventListener("pointerdown", e => {
    e.preventDefault(); audio();
    const r = cv.getBoundingClientRect();
    onTap((e.clientX - r.left - view.ox)/view.s, (e.clientY - r.top - view.oy)/view.s);
  });
  window.addEventListener("keydown", e => {
    if (!G || !$("setup").hidden || e.target.tagName === "INPUT") return;
    if (!$("end").hidden){ if (e.key === "Enter"){ e.preventDefault(); $("again").click(); } return; }
    const keys = {ArrowLeft:[330, 300], ArrowRight:[670, 300], ArrowUp:[500, 220], ArrowDown:[500, 340], a:[330, 300], d:[670, 300], w:[500, 220], s:[500, 340]};
    if (e.key === " " || e.key === "Enter"){ e.preventDefault(); audio(); if (G.state === "aim") onTap(0, 0); }
    else if (keys[e.key] && G.state === "flight"){ e.preventDefault(); onTap(...keys[e.key]); }
  });

  /* ---------- kurulum ---------- */
  function renderSetup(){
    $("mode-" + settings.mode).checked = true;
    settings.players.forEach((p, i) => { $("pn-" + i).value = p.name; $(`lv-${i}-${p.lv}`).checked = true; });
    const cpu = settings.mode === "cpu";
    $("pn-1").disabled = cpu; if (cpu) $("pn-1").value = "Bilgisayar";
    $("av2").textContent = cpu ? "🤖" : "🎈";
  }
  function readSetup(){
    settings.mode = document.querySelector('input[name="mode"]:checked').value;
    settings.players = [0, 1].map(i => ({
      name:(i === 1 && settings.mode === "cpu") ? (settings.players[1].name === "Bilgisayar" ? "Egemen" : settings.players[1].name) : ($("pn-" + i).value.trim().slice(0, 12) || ["Enes", "Egemen"][i]),
      lv:+document.querySelector(`input[name="lv-${i}"]:checked`).value
    }));
  }
  document.querySelectorAll('input[name="mode"]').forEach(r => r.addEventListener("change", () => { readSetup(); renderSetup(); }));
  $("setup-form").addEventListener("submit", e => {
    e.preventDefault(); audio(); readSetup();
    try { localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings)); } catch(err) {}
    $("setup").hidden = true; newMatch();
  });
  function openSetup(){ if (G) G.state = "paused"; timers = []; renderSetup(); $("end").hidden = true; $("setup").hidden = false; $("banner").hidden = true; $("role").hidden = true; if (canSpeak) speechSynthesis.cancel(); }
  $("open-setup").addEventListener("click", openSetup);
  $("end-setup").addEventListener("click", openSetup);
  $("again").addEventListener("click", () => { $("end").hidden = true; newMatch(); });

  /* ---------- güncelle ---------- */
  function update(dt){
    time += dt;
    for (let i = timers.length - 1; i >= 0; i--){ const tk = timers[i]; tk.t -= dt; if (tk.t <= 0){ timers.splice(i, 1); tk.fn(); } }
    if (bannerT > 0){ bannerT -= dt; if (bannerT <= 0) $("banner").hidden = true; }
    crowdJump = Math.max(0, crowdJump - dt);
    if (!G) return;
    if (G.state === "aim"){
      G.aimT += dt;
      const K = G.players[kicker()];
      G.reticle = reticleAt(G.aimT, physLv(kicker()), G.aimPhase);
      // zor bilgisayar köşeye yakınken vurur
      const corner = Math.abs(G.reticle.x - 500) > 140;
      if (K.cpu && G.aimT >= G.cpuShootAt && (!G.cpuCorner || corner || G.aimT > G.cpuShootAt + 2)) shoot();
      else if (!K.cpu && G.aimT > 8) shoot();   // çok beklerse kendiliğinden vurur
    }
    const b = G.ball, k = G.keeper;
    if (G.state === "flight"){
      b.t = Math.min(1, b.t + dt/G.flightDur);
      const t = b.t, e = t;
      b.x = BALL0.x + (G.target.x - BALL0.x)*e;
      b.y = BALL0.y + (G.target.y - BALL0.y)*e - Math.sin(t*Math.PI)*70;
      b.r = BALL0.r + (14 - BALL0.r)*ease(t);
      b.spin += dt*14;
      if (t >= 1) resolveShot();
    } else if (G.state === "result"){
      b.vy += 900*dt; b.x += b.vx*dt; b.y += b.vy*dt; b.spin += dt*10;
      if (G.res === "goal"){ b.vx *= .9; b.vy *= .9; b.r = Math.max(11, b.r - dt*4); if (b.y > GOAL.bottom - 8){ b.y = GOAL.bottom - 8; b.vy = -b.vy*.3; } }
      else if (b.y > GOAL.bottom + 40){ b.y = GOAL.bottom + 40; b.vy = -b.vy*.45; b.vx *= .7; }
    }
    if (k.dive){
      k.t = Math.min(1, k.t + dt/DIVE_T);
      k.x = k.sx + (k.tx - k.sx)*ease(k.t); k.y = k.sy + (k.ty - k.sy)*ease(k.t);
      if (G.state === "result" && k.t >= 1) k.y = Math.min(GOAL.bottom - 30, k.y + dt*160);
    } else if (G.state === "aim" || G.state === "flight"){
      k.x = KEEPER0.x + (RM ? 0 : Math.sin(time*2.4)*14); k.y = KEEPER0.y;
    }
  }

  /* ---------- çizim ---------- */
  function drawStadium(){
    const x0 = -view.ox/view.s - 2, y0 = -view.oy/view.s - 2, w = W + 2*view.ox/view.s + 4, h = H + 2*view.oy/view.s + 4;
    const sky = ctx.createLinearGradient(0, y0, 0, 150);
    sky.addColorStop(0, "#06131F"); sky.addColorStop(1, "#16324A");
    ctx.fillStyle = sky; ctx.fillRect(x0, y0, w, 150 - y0);
    // ışık kuleleri
    for (const lx of [80, 920]){
      const g = ctx.createRadialGradient(lx, 30, 5, lx, 30, 160);
      g.addColorStop(0, "rgba(255,255,230,.9)"); g.addColorStop(1, "rgba(255,255,230,0)");
      ctx.fillStyle = g; ctx.fillRect(lx - 160, -130, 320, 320);
      ctx.fillStyle = "#FFFFF0"; ctx.fillRect(lx - 30, 18, 60, 22);
    }
    // tribün
    ctx.fillStyle = "#24384F"; ctx.fillRect(x0, 60, w, 95);
    for (const c of CROWD){
      const jump = crowdJump > 0 && !RM ? Math.abs(Math.sin(time*12 + c.p))*6*Math.min(1, crowdJump) : 0;
      const y = 76 + c.row*16 - jump;
      ctx.fillStyle = c.c; ctx.beginPath(); ctx.arc(c.x, y, 5, 0, TAU); ctx.fill();
      ctx.fillStyle = "rgba(0,0,0,.25)"; ctx.fillRect(c.x - 5, y + 4, 10, 6);
    }
    ctx.fillStyle = "#E5484D"; ctx.fillRect(x0, 150, w, 12);
    ctx.fillStyle = "#FFFFFF"; ctx.font = "700 10px Oswald, sans-serif"; ctx.textAlign = "center"; ctx.textBaseline = "middle";
    for (let x = 60; x < 1000; x += 160) ctx.fillText("EGEMEN VE ENES KUPASI", x, 156);
    // saha
    const pitch = ctx.createLinearGradient(0, 162, 0, h + y0);
    pitch.addColorStop(0, "#2E8B47"); pitch.addColorStop(1, "#3FAE5A");
    ctx.fillStyle = pitch; ctx.fillRect(x0, 162, w, h + y0 - 162);
    ctx.fillStyle = "rgba(255,255,255,.06)";
    let y = 162, band = 20, k = 0;
    while (y < H + 40){ if (k % 2) ctx.fillRect(x0, y, w, band); y += band; band *= 1.22; k++; }
    ctx.strokeStyle = "rgba(255,255,255,.85)"; ctx.lineWidth = 4;
    ctx.beginPath(); ctx.moveTo(x0, GOAL.bottom); ctx.lineTo(x0 + w, GOAL.bottom); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(150, GOAL.bottom); ctx.lineTo(10, H); ctx.moveTo(850, GOAL.bottom); ctx.lineTo(990, H); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(90, 470); ctx.lineTo(910, 470); ctx.stroke();
    ctx.fillStyle = "rgba(255,255,255,.9)"; ctx.beginPath(); ctx.ellipse(BALL0.x, BALL0.y + 30, 16, 6, 0, 0, TAU); ctx.fill();
  }

  function drawGoal(){
    const bl = 290, br = 710, bt = 200, bb = 360;
    // file
    ctx.strokeStyle = "rgba(255,255,255,.35)"; ctx.lineWidth = 1.5;
    const bulge = G && G.res === "goal" && G.state === "result" ? 12 : 0;
    for (let i = 0; i <= 14; i++){
      const t = i/14, fx = GOAL.l + (GOAL.r - GOAL.l)*t, bx = bl + (br - bl)*t;
      ctx.beginPath(); ctx.moveTo(fx, GOAL.top); ctx.lineTo(bx, bt - bulge*.3); ctx.lineTo(bx, bb + bulge*.2); ctx.stroke();
    }
    for (let j = 0; j <= 8; j++){
      const t = j/8, y = bt + (bb - bt)*t - bulge*Math.sin(t*Math.PI)*.3;
      ctx.beginPath(); ctx.moveTo(bl, y); ctx.lineTo(br, y); ctx.stroke();
    }
    for (let j = 0; j <= 5; j++){
      const t = j/5;
      ctx.beginPath(); ctx.moveTo(GOAL.l, GOAL.top + (GOAL.bottom - GOAL.top)*t); ctx.lineTo(bl, bt + (bb - bt)*t); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(GOAL.r, GOAL.top + (GOAL.bottom - GOAL.top)*t); ctx.lineTo(br, bt + (bb - bt)*t); ctx.stroke();
    }
    // direkler
    ctx.fillStyle = "#FFFFFF";
    ctx.fillRect(GOAL.l - 7, GOAL.top - 7, 14, GOAL.bottom - GOAL.top + 7);
    ctx.fillRect(GOAL.r - 7, GOAL.top - 7, 14, GOAL.bottom - GOAL.top + 7);
    ctx.fillRect(GOAL.l - 7, GOAL.top - 7, GOAL.r - GOAL.l + 14, 14);
    ctx.fillStyle = "rgba(0,0,0,.15)"; ctx.fillRect(GOAL.l + 7, GOAL.top + 7, GOAL.r - GOAL.l - 14, 4);
  }

  function drawKeeper(){
    const k = G ? G.keeper : {x:KEEPER0.x, y:KEEPER0.y, dive:false};
    const ki = G ? keeper() : 1, lv = G ? physLv(ki) : 1, col = COLORS[ki], reach = REACH[lv];
    const dx = k.x - KEEPER0.x, ang = clamp(dx/260, -1, 1)*1.15 + (k.dive ? 0 : Math.sin(time*2.4)*.03);
    ctx.save(); ctx.translate(k.x, k.y); ctx.rotate(ang);
    // bacaklar
    ctx.strokeStyle = "#1F2937"; ctx.lineWidth = 12; ctx.lineCap = "round";
    ctx.beginPath(); ctx.moveTo(-8, 70); ctx.lineTo(-18, 104); ctx.moveTo(8, 70); ctx.lineTo(18, 104); ctx.stroke();
    ctx.fillStyle = "#111827"; ctx.beginPath(); ctx.ellipse(-20, 106, 10, 6, 0, 0, TAU); ctx.ellipse(20, 106, 10, 6, 0, 0, TAU); ctx.fill();
    // gövde
    ctx.fillStyle = col; ctx.beginPath(); ctx.roundRect(-22, 14, 44, 60, 12); ctx.fill();
    ctx.fillStyle = "rgba(255,255,255,.9)"; ctx.font = "700 22px Oswald, sans-serif"; ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.fillText("1", 0, 44);
    // kollar
    ctx.strokeStyle = col; ctx.lineWidth = 11;
    const spread = 34 + (reach - 56)*.5;
    ctx.beginPath(); ctx.moveTo(-18, 22); ctx.lineTo(-spread, -2); ctx.moveTo(18, 22); ctx.lineTo(spread, -2); ctx.stroke();
    // eldivenler
    const gr = 12 + (reach - 56)*.2;
    ctx.fillStyle = "#FFD23F"; ctx.strokeStyle = "#B88A00"; ctx.lineWidth = 2;
    for (const s of [-1, 1]){ ctx.beginPath(); ctx.arc(s*spread, -6, gr, 0, TAU); ctx.fill(); ctx.stroke(); }
    // baş
    ctx.fillStyle = "#F1C9A5"; ctx.beginPath(); ctx.arc(0, 2, 13, 0, TAU); ctx.fill();
    ctx.fillStyle = "#3B2A20"; ctx.beginPath(); ctx.arc(0, -3, 13, Math.PI, 0); ctx.fill();
    ctx.restore();
  }

  function drawBall(){
    const b = G ? G.ball : {x:BALL0.x, y:BALL0.y, r:BALL0.r, spin:0};
    ctx.fillStyle = "rgba(0,0,0,.25)";
    const shadowY = G && G.state === "flight" ? BALL0.y + 30 + (G.target.y + 20 - BALL0.y - 30)*G.ball.t : b.y + b.r*.9;
    ctx.beginPath(); ctx.ellipse(b.x, Math.max(shadowY, b.y + b.r*.8), b.r*.9, b.r*.3, 0, 0, TAU); ctx.fill();
    ctx.save(); ctx.translate(b.x, b.y); ctx.rotate(b.spin);
    ctx.fillStyle = "#FFFFFF"; ctx.beginPath(); ctx.arc(0, 0, b.r, 0, TAU); ctx.fill();
    ctx.save(); ctx.beginPath(); ctx.arc(0, 0, b.r, 0, TAU); ctx.clip();
    ctx.fillStyle = "#1F2937";
    const pent = (cx, cy, s) => { ctx.beginPath(); for (let i = 0; i < 5; i++){ const a = -Math.PI/2 + i*TAU/5; i ? ctx.lineTo(cx + Math.cos(a)*s, cy + Math.sin(a)*s) : ctx.moveTo(cx + Math.cos(a)*s, cy + Math.sin(a)*s); } ctx.fill(); };
    pent(0, 0, b.r*.36);
    for (let i = 0; i < 5; i++){ const a = -Math.PI/2 + i*TAU/5; pent(Math.cos(a)*b.r*.95, Math.sin(a)*b.r*.95, b.r*.3); }
    ctx.restore();
    ctx.strokeStyle = "rgba(0,0,0,.35)"; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(0, 0, b.r, 0, TAU); ctx.stroke();
    ctx.restore();
  }

  function drawReticle(){
    if (!G || G.state !== "aim") return;
    const r = G.reticle, col = COLORS[kicker()], p = RM ? 0 : Math.sin(time*10)*3;
    ctx.save();
    ctx.strokeStyle = "rgba(255,255,255,.28)"; ctx.setLineDash([6, 10]); ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(BALL0.x, BALL0.y - 20); ctx.quadraticCurveTo((BALL0.x + r.x)/2, (BALL0.y + r.y)/2 - 80, r.x, r.y); ctx.stroke();
    ctx.setLineDash([]);
    ctx.strokeStyle = "#FFFFFF"; ctx.lineWidth = 7; ctx.beginPath(); ctx.arc(r.x, r.y, 24 + p, 0, TAU); ctx.stroke();
    ctx.strokeStyle = col; ctx.lineWidth = 4; ctx.beginPath(); ctx.arc(r.x, r.y, 24 + p, 0, TAU); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(r.x - 36, r.y); ctx.lineTo(r.x - 12, r.y); ctx.moveTo(r.x + 12, r.y); ctx.lineTo(r.x + 36, r.y); ctx.moveTo(r.x, r.y - 36); ctx.lineTo(r.x, r.y - 12); ctx.moveTo(r.x, r.y + 12); ctx.lineTo(r.x, r.y + 36); ctx.stroke();
    ctx.fillStyle = col; ctx.beginPath(); ctx.arc(r.x, r.y, 5, 0, TAU); ctx.fill();
    ctx.restore();
  }

  function draw(){
    const d = view.dpr;
    ctx.setTransform(d, 0, 0, d, 0, 0);
    ctx.clearRect(0, 0, cv.width, cv.height);
    ctx.save(); ctx.translate(view.ox, view.oy); ctx.scale(view.s, view.s);
    drawStadium();
    drawGoal();
    // top kaleciden öndeyse sonra, arkadaysa önce çizilir
    const ballBehind = G && G.state === "result" && G.res === "goal";
    if (ballBehind) drawBall();
    drawKeeper();
    if (!ballBehind) drawBall();
    drawReticle();
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
  document.addEventListener("visibilitychange", () => { last = performance.now(); if (document.hidden && canSpeak) speechSynthesis.cancel(); });
  if ("ResizeObserver" in window) new ResizeObserver(resize).observe(stage);
  else window.addEventListener("resize", resize);
  resize();
  renderSetup();
  requestAnimationFrame(frame);
})();
