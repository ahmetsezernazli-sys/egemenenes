/* Mancınık Düellosu — sırayla taş atan iki mancınık */
(function(){
  "use strict";

  const W = 1200, H = 640;
  const GRAV = 620, WIND_A = 130, STEP = 1/120;   // yer çekimi, rüzgâr ivmesi, sabit fizik adımı
  const P0X = 112, P1X = W - 112;                 // mancınıkların yeri
  const POW_MIN = 150, POW_MAX = 900, DRAG_K = 2.6;
  const BLAST = 72, CLOSE = 32, CRATER = 46, HEARTS = 5;
  const COLORS = ["#3D8BFD", "#FF7A2F"], AVATARS = ["🚀", "🎈"];
  // seviye: 0 Kolay (yolun tamamı görünür), 1 Normal (yolun başı), 2 Zor (yardım yok)
  const PREVIEW = [1, .34, 0];
  const CPU_POW_ERR = [.13, .06, .038], CPU_ANG_ERR = [.10, .045, .026];
  const SETTINGS_KEY = "mancinik-ayar", SOUND_KEY = "mancinik-ses";
  const RM = window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches;
  const TAU = Math.PI*2;

  const $ = id => document.getElementById(id);
  const stage = $("stage"), cv = $("cv"), ctx = cv.getContext("2d");
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const rand = (a, b) => a + Math.random()*(b - a);

  let settings = {mode:"2p", players:[{name:"Enes", lv:1}, {name:"Egemen", lv:0}]};
  try {
    const s = JSON.parse(localStorage.getItem(SETTINGS_KEY));
    if (s && Array.isArray(s.players) && s.players.length === 2)
      settings = {mode:s.mode === "cpu" ? "cpu" : "2p",
                  players:s.players.map((p, i) => ({name:String(p.name || "").slice(0, 12) || ["Enes", "Egemen"][i], lv:clamp(p.lv | 0, 0, 2)}))};
  } catch(e) {}
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
    launch(){ noise(.12, 500, .3); tone(200, .12, "triangle", .08, 90); },
    boom(){ noise(.45, 220, .5, "lowpass"); tone(90, .35, "sine", .1, 40); },
    hit(){ noise(.5, 300, .5, "lowpass"); [392, 523.25].forEach((f, i) => tone(f, .18, "square", .07, null, i*.09)); },
    miss(){ tone(260, .18, "sine", .05, 170); },
    turn(){ tone(620, .08, "triangle", .05, 760); },
    win(){ [523.25, 659.25, 783.99, 1046.5].forEach((f, i) => tone(f, .28, "triangle", .12, null, i*.12)); }
  };
  const canSpeak = "speechSynthesis" in window;
  let trVoice = null;
  function pickVoice(){ trVoice = speechSynthesis.getVoices().find(v => /^tr(-|_|$)/i.test(v.lang)) || null; }
  if (canSpeak){ pickVoice(); if (speechSynthesis.addEventListener) speechSynthesis.addEventListener("voiceschanged", pickVoice); }
  function say(text){
    if (!canSpeak || !soundOn || !trVoice) return;
    speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text); u.voice = trVoice; u.lang = trVoice.lang; u.rate = 1; u.pitch = 1.05;
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

  // "Sıra Enes'te" / "Sıra Egemen'de"
  function locative(name){
    const low = name.toLocaleLowerCase("tr"), vowels = "aeıioöuü";
    let v = "e";
    for (let i = low.length - 1; i >= 0; i--){ if (vowels.includes(low[i])){ v = low[i]; break; } }
    const hard = "çfhkpsşt".includes(low[low.length - 1]);
    return `${name}'${hard ? "t" : "d"}${"aıou".includes(v) ? "a" : "e"}`;
  }

  /* ---------- arazi ---------- */
  function makeTerrain(){
    const t = new Float64Array(W), base = H - 148;
    const ph = [rand(0, TAU), rand(0, TAU), rand(0, TAU), rand(0, TAU)];
    const amp = [rand(20, 44), rand(12, 26), rand(6, 16), rand(3, 9)];
    const hillH = rand(90, 200), hillW = rand(95, 175), hillX = W/2 + rand(-70, 70);
    for (let x = 0; x < W; x++){
      let y = base;
      y -= amp[0]*Math.sin(x/260 + ph[0]);
      y -= amp[1]*Math.sin(x/130 + ph[1]);
      y -= amp[2]*Math.sin(x/70 + ph[2]);
      y -= amp[3]*Math.sin(x/33 + ph[3]);
      y -= hillH*Math.exp(-Math.pow((x - hillX)/hillW, 2));
      t[x] = clamp(y, 150, H - 46);
    }
    // mancınıkların altı düzleşsin
    [P0X, P1X].forEach(px => {
      const h = t[Math.round(px)];
      for (let x = Math.round(px) - 60; x <= Math.round(px) + 60; x++){
        if (x < 0 || x >= W) continue;
        const k = Math.max(0, 1 - Math.abs(x - px)/60);
        t[x] = t[x]*(1 - k) + h*k;
      }
    });
    return t;
  }
  const groundAt = x => G.terr[clamp(Math.round(x), 0, W - 1)];
  function dig(cx, cy, r){
    const x0 = Math.max(0, Math.round(cx - r)), x1 = Math.min(W - 1, Math.round(cx + r));
    for (let x = x0; x <= x1; x++){
      const dy = Math.sqrt(Math.max(0, r*r - (x - cx)*(x - cx)));
      const top = cy - dy, bot = cy + dy;
      if (G.terr[x] >= top && G.terr[x] < bot) G.terr[x] = Math.min(H - 6, bot);
    }
  }

  /* ---------- durum ---------- */
  let G = null, timers = [];
  const later = (s, fn) => timers.push({t:s, fn});
  const clearTimers = () => { timers = []; };
  const muzzle = p => ({x:p.x, y:groundAt(p.x) - 44});
  const target = p => ({x:p.x, y:groundAt(p.x) - 22});
  const newWind = () => Math.round(rand(-1, 1)*20)/20;

  function newMatch(){
    clearTimers();
    G = {
      players:settings.players.map((p, i) => ({
        name:p.name, lv:p.lv, cpu:settings.mode === "cpu" && i === 1,
        x:i === 0 ? P0X : P1X, hp:HEARTS, score:0,
        aim:{ang:i === 0 ? -Math.PI/4 : -Math.PI*3/4, pow:620}
      })),
      terr:makeTerrain(), turn:0, starter:0, state:"aim", shot:null, parts:[], shake:0, recoil:0,
      wind:newWind(), t:0, round:1, over:false, clouds:[{x:rand(0, W), y:rand(60, 150), s:rand(6, 12), w:rand(70, 130)},
                                                        {x:rand(0, W), y:rand(40, 120), s:rand(4, 9), w:rand(90, 160)},
                                                        {x:rand(0, W), y:rand(70, 170), s:rand(8, 14), w:rand(60, 110)}]
    };
    if (G.players[1].cpu) G.players[1].name = "Bilgisayar";
    newRound(true);
  }

  function newRound(first){
    clearTimers();
    G.terr = makeTerrain();
    G.players.forEach((p, i) => {
      p.hp = HEARTS;
      p.aim = {ang:i === 0 ? -Math.PI/4 : -Math.PI*3/4, pow:620};
    });
    if (!first){ G.starter = 1 - G.starter; G.round++; }
    G.turn = G.starter; G.state = "aim"; G.shot = null; G.parts = []; G.over = false;
    G.wind = newWind(); G.drag = null;
    $("end").hidden = true;
    banner(null);
    announceTurn(true);
    renderBoard();
  }

  function announceTurn(quiet){
    const p = G.players[G.turn];
    role(p.cpu ? "Bilgisayar nişan alıyor…" : `Sıra ${locative(p.name)}`);
    if (!quiet) sfx.turn();
    if (!quiet && !p.cpu) say(`Sıra ${locative(p.name)}`);
    if (p.cpu) later(1, cpuShoot);
    renderBoard();
  }
  function role(text){ const el = $("role"); el.textContent = text || ""; el.hidden = !text; }
  let bannerT = null;
  function banner(text, hit){
    const el = $("banner");
    clearTimeout(bannerT);
    if (!text){ el.hidden = true; return; }
    el.textContent = text; el.classList.toggle("hit", !!hit); el.hidden = false;
    bannerT = setTimeout(() => { el.hidden = true; }, 1400);
  }

  /* ---------- fizik ---------- */
  // atışın nereye düşeceğini baştan hesaplar; nişan çizgisi de bilgisayar da bunu kullanır
  function simulate(x, y, vx, vy, wind){
    const pts = [];
    let t = 0;
    for (let i = 0; i < 1700; i++){
      vx += wind*WIND_A*STEP; vy += GRAV*STEP;
      x += vx*STEP; y += vy*STEP; t += STEP;
      if (i % 3 === 0) pts.push(x, y);
      if (x < 2 || x > W - 2) return {x, y, t, hit:false, pts};
      if (y >= groundAt(x)) return {x, y:groundAt(x), t, hit:true, pts};
    }
    return {x, y, t, hit:false, pts};
  }

  function fire(){
    const p = G.players[G.turn], m = muzzle(p);
    G.shot = {x:m.x, y:m.y, vx:Math.cos(p.aim.ang)*p.aim.pow, vy:Math.sin(p.aim.ang)*p.aim.pow, t:0, trail:[], n:0};
    G.state = "fly"; G.drag = null; G.recoil = 1;
    sfx.launch();
    role(null);
  }

  function stepShot(){
    const s = G.shot;
    s.vx += G.wind*WIND_A*STEP; s.vy += GRAV*STEP;
    s.x += s.vx*STEP; s.y += s.vy*STEP; s.t += STEP; s.n++;
    if (s.n % 4 === 0){ s.trail.push(s.x, s.y); if (s.trail.length > 160) s.trail.splice(0, 2); }
    if (s.x < 2 || s.x > W - 2 || s.t > 14){ boom(clamp(s.x, 2, W - 2), Math.max(s.y, 0), false); return; }
    if (s.y >= groundAt(s.x)) boom(s.x, groundAt(s.x), true);
  }

  function boom(x, y, onGround){
    const hits = [];
    G.players.forEach((p, i) => {
      const t = target(p), d = Math.hypot(t.x - x, t.y - y);
      if (onGround && d < CLOSE) hits.push({i, dmg:2});
      else if (onGround && d < BLAST) hits.push({i, dmg:1});
    });
    G.shot = null; G.state = "boom";
    if (onGround){
      dig(x, y, CRATER);
      if (!RM) G.shake = hits.length ? 1 : .55;
      for (let i = 0; i < (RM ? 10 : 34); i++){
        const a = rand(-Math.PI, 0), v = rand(60, 330);
        G.parts.push({x, y, vx:Math.cos(a)*v, vy:Math.sin(a)*v, life:rand(.5, 1.1), max:1.1,
                      r:rand(2, 6), col:Math.random() < .5 ? "#8B5E3C" : "#6FAF5A"});
      }
      G.ring = {x, y, t:0};
    }
    hits.forEach(h => { G.players[h.i].hp = Math.max(0, G.players[h.i].hp - h.dmg); });
    renderBoard();

    if (hits.length){
      sfx.hit();
      const victim = G.players[hits[0].i];
      const shooter = G.players[G.turn];
      if (hits[0].i === G.turn){ banner("KENDİNİ VURDU!", false); say(`${shooter.name} kendi mancınığını vurdu`); }
      else { banner(hits[0].dmg > 1 ? "TAM İSABET!" : "VURDU!", true); say(hits[0].dmg > 1 ? "Tam isabet!" : `${victim.name} vuruldu`); }
    } else {
      if (onGround) sfx.boom(); else sfx.miss();
      banner("ISKA!", false);
    }
    later(1.4, afterBoom);
  }

  function afterBoom(){
    const dead = G.players.findIndex(p => p.hp <= 0);
    if (dead >= 0){ endRound(1 - dead); return; }
    G.turn = 1 - G.turn;
    G.wind = newWind();
    G.state = "aim";
    announceTurn(false);
  }

  function endRound(winner){
    G.over = true; G.state = "over";
    G.players[winner].score++;
    role(null); banner(null);
    sfx.win();
    const w = G.players[winner];
    say(`${w.name} kazandı!`);
    renderBoard();
    later(RM ? .3 : 1.1, () => {
      $("end-title").textContent = `${w.name} raundu kazandı!`;
      $("end-score").textContent = `${G.players[0].score} – ${G.players[1].score}`;
      $("end-note").textContent = `${G.round}. raunt bitti. Yeni raundda tepe ve rüzgâr değişir.`;
      $("end").hidden = false;
      $("again").focus();
    });
  }

  /* ---------- bilgisayar ---------- */
  // kaba tarama + çevresinde ince tarama; en yakın düşen atışı seçer
  function bestShot(pi){
    const me = G.players[pi], foe = G.players[1 - pi];
    const m = muzzle(me), tg = target(foe), dir = foe.x > me.x ? 1 : -1;
    let best = null;
    const tryShot = (angDeg, pow) => {
      const a = dir > 0 ? -angDeg*Math.PI/180 : Math.PI + angDeg*Math.PI/180;
      const r = simulate(m.x, m.y, Math.cos(a)*pow, Math.sin(a)*pow, G.wind);
      const d = Math.hypot(r.x - tg.x, r.y - tg.y);
      if (!best || d < best.d) best = {d, ang:a, pow};
    };
    for (let deg = 14; deg <= 78; deg += 4) for (let pow = 220; pow <= POW_MAX; pow += 40) tryShot(deg, pow);
    const bd = dir > 0 ? -best.ang*180/Math.PI : (best.ang - Math.PI)*180/Math.PI;
    for (let deg = bd - 4; deg <= bd + 4; deg += 1)
      for (let pow = best.pow - 40; pow <= best.pow + 40; pow += 8)
        if (deg > 5 && deg < 88 && pow >= POW_MIN && pow <= POW_MAX) tryShot(deg, pow);
    return best;
  }

  function cpuShoot(){
    if (!G || G.state !== "aim") return;
    if (!$("setup").hidden || !$("end").hidden){ later(.5, cpuShoot); return; }
    const p = G.players[G.turn], b = bestShot(G.turn);
    p.aim.ang = b.ang + rand(-1, 1)*CPU_ANG_ERR[p.lv];
    p.aim.pow = clamp(b.pow*(1 + rand(-1, 1)*CPU_POW_ERR[p.lv]), POW_MIN, POW_MAX);
    later(.6, () => { if (G.state === "aim") fire(); });
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
  const toLogic = e => {
    const r = cv.getBoundingClientRect();
    return {x:(e.clientX - r.left - view.ox)/view.s, y:(e.clientY - r.top - view.oy)/view.s};
  };
  const canAim = () => G && G.state === "aim" && !G.players[G.turn].cpu && $("setup").hidden && $("end").hidden;
  function aimAt(x, y){
    const p = G.players[G.turn], m = muzzle(p);
    const dx = x - m.x, dy = y - m.y, len = Math.hypot(dx, dy);
    if (len < 8) return;
    p.aim.ang = Math.atan2(dy, dx);
    p.aim.pow = clamp(len*DRAG_K, POW_MIN, POW_MAX);
  }
  cv.addEventListener("pointerdown", e => {
    e.preventDefault(); audio();
    if (!canAim()) return;
    cv.setPointerCapture && cv.setPointerCapture(e.pointerId);
    const q = toLogic(e); G.drag = q; aimAt(q.x, q.y);
  });
  cv.addEventListener("pointermove", e => {
    if (!G || !G.drag || !canAim()) return;
    const q = toLogic(e); G.drag = q; aimAt(q.x, q.y);
  });
  const release = () => {
    if (!G) return;
    if (G.drag && canAim()){
      const m = muzzle(G.players[G.turn]);
      // kısa bir dokunuş atış saymaz, yalnız nişanı bırakır
      if (Math.hypot(G.drag.x - m.x, G.drag.y - m.y) >= 26){ G.drag = null; fire(); return; }
    }
    G.drag = null;
  };
  cv.addEventListener("pointerup", e => { e.preventDefault(); release(); });
  cv.addEventListener("pointercancel", () => { if (G) G.drag = null; });
  window.addEventListener("keydown", e => {
    if (!G || !$("setup").hidden || e.target.tagName === "INPUT") return;
    if (!$("end").hidden){ if (e.key === "Enter"){ e.preventDefault(); $("again").click(); } return; }
    if (!canAim()) return;
    const p = G.players[G.turn];
    if (e.key === "ArrowLeft" || e.key === "a"){ e.preventDefault(); p.aim.ang -= .025; }
    else if (e.key === "ArrowRight" || e.key === "d"){ e.preventDefault(); p.aim.ang += .025; }
    else if (e.key === "ArrowUp" || e.key === "w"){ e.preventDefault(); p.aim.pow = clamp(p.aim.pow + 18, POW_MIN, POW_MAX); }
    else if (e.key === "ArrowDown" || e.key === "s"){ e.preventDefault(); p.aim.pow = clamp(p.aim.pow - 18, POW_MIN, POW_MAX); }
    else if (e.key === " " || e.key === "Enter"){ e.preventDefault(); audio(); fire(); }
  });

  /* ---------- güncelleme ---------- */
  let acc = 0;
  function update(dt){
    if (!G) return;
    G.t += dt;
    if (timers.length){
      const due = [];
      for (const t of timers) if ((t.t -= dt) <= 0) due.push(t);
      if (due.length){ timers = timers.filter(t => t.t > 0); due.forEach(t => t.fn()); }
    }
    G.clouds.forEach(c => { c.x += c.s*dt; if (c.x > W + c.w) c.x = -c.w; });
    if (G.recoil > 0) G.recoil = Math.max(0, G.recoil - dt*3.2);
    if (G.shake > 0) G.shake = Math.max(0, G.shake - dt*2.4);
    if (G.ring){ G.ring.t += dt; if (G.ring.t > .45) G.ring = null; }
    for (let i = G.parts.length - 1; i >= 0; i--){
      const q = G.parts[i];
      q.vy += 700*dt; q.x += q.vx*dt; q.y += q.vy*dt; q.life -= dt;
      if (q.life <= 0) G.parts.splice(i, 1);
    }
    if (G.state === "fly" && G.shot){
      acc += dt;
      let guard = 0;
      while (acc >= STEP && G.state === "fly" && guard++ < 400){ stepShot(); acc -= STEP; }
    } else acc = 0;
  }

  /* ---------- çizim ---------- */
  function drawSky(){
    const g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, "#5FB8E8"); g.addColorStop(.62, "#A5DCF5"); g.addColorStop(1, "#E4F4DD");
    ctx.fillStyle = g; ctx.fillRect(-1200, -1200, W + 2400, H + 2400);
    ctx.fillStyle = "#FFE9A8"; ctx.beginPath(); ctx.arc(W - 150, 92, 42, 0, TAU); ctx.fill();
    ctx.fillStyle = "rgba(255,255,255,.85)";
    G.clouds.forEach(c => {
      ctx.beginPath();
      ctx.arc(c.x, c.y, c.w*.32, 0, TAU);
      ctx.arc(c.x + c.w*.3, c.y - c.w*.12, c.w*.26, 0, TAU);
      ctx.arc(c.x + c.w*.6, c.y, c.w*.3, 0, TAU);
      ctx.fill();
    });
    // uzaktaki tepeler
    ctx.fillStyle = "#93C9A6";
    ctx.beginPath(); ctx.moveTo(-600, H + 900);
    for (let x = -600; x <= W + 600; x += 20) ctx.lineTo(x, H - 210 - 42*Math.sin(x/190) - 26*Math.sin(x/77 + 1.3));
    ctx.lineTo(W + 600, H + 900); ctx.fill();
    ctx.fillStyle = "#79B68D";
    ctx.beginPath(); ctx.moveTo(-600, H + 900);
    for (let x = -600; x <= W + 600; x += 20) ctx.lineTo(x, H - 160 - 30*Math.sin(x/140 + 2.1) - 18*Math.sin(x/61));
    ctx.lineTo(W + 600, H + 900); ctx.fill();
  }

  function drawTerrain(){
    ctx.fillStyle = "#8B5E3C";
    ctx.beginPath(); ctx.moveTo(-600, H + 900);
    ctx.lineTo(-600, G.terr[0]);
    for (let x = 0; x < W; x += 2) ctx.lineTo(x, G.terr[x]);
    ctx.lineTo(W - 1, G.terr[W - 1]); ctx.lineTo(W + 600, G.terr[W - 1]); ctx.lineTo(W + 600, H + 900); ctx.closePath(); ctx.fill();
    ctx.fillStyle = "#6FAF5A";
    ctx.beginPath(); ctx.moveTo(-600, G.terr[0]);
    for (let x = 0; x < W; x += 2) ctx.lineTo(x, G.terr[x]);
    ctx.lineTo(W + 600, G.terr[W - 1]); ctx.lineTo(W + 600, G.terr[W - 1] + 15);
    for (let x = W - 1; x >= 0; x -= 2) ctx.lineTo(x, G.terr[x] + 15);
    ctx.lineTo(-600, G.terr[0] + 15); ctx.closePath(); ctx.fill();
    ctx.fillStyle = "rgba(0,0,0,.09)";
    for (let x = 6; x < W; x += 34){
      const y = G.terr[x] + 30;
      if (y < H) ctx.fillRect(x, y, 16, 5);
    }
  }

  function drawCatapult(p, i){
    const gy = groundAt(p.x), recoil = (i === G.turn ? G.recoil : 0);
    const dir = i === 0 ? 1 : -1;
    ctx.save();
    ctx.translate(p.x, gy);
    ctx.scale(dir, 1);
    // gölge
    ctx.fillStyle = "rgba(0,0,0,.18)";
    ctx.beginPath(); ctx.ellipse(0, 2, 46, 8, 0, 0, TAU); ctx.fill();
    // kaide
    ctx.fillStyle = "#8A5A33";
    ctx.beginPath(); ctx.moveTo(-34, 0); ctx.lineTo(34, 0); ctx.lineTo(26, -16); ctx.lineTo(-26, -16); ctx.closePath(); ctx.fill();
    ctx.fillStyle = "#6E4626";
    ctx.beginPath(); ctx.arc(-18, -4, 10, 0, TAU); ctx.arc(18, -4, 10, 0, TAU); ctx.fill();
    ctx.fillStyle = "#A9713F";
    ctx.fillRect(-6, -34, 12, 20);
    // kol
    const arm = -Math.PI*.78 + recoil*.8;
    ctx.save();
    ctx.translate(0, -32); ctx.rotate(arm);
    ctx.fillStyle = "#A9713F"; ctx.fillRect(-4, -4, 52, 8);
    ctx.fillStyle = "#6B7A85"; ctx.beginPath(); ctx.arc(52, 0, 9, 0, TAU); ctx.fill();
    ctx.restore();
    // bayrak
    ctx.strokeStyle = "#6E4626"; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(-30, -14); ctx.lineTo(-30, -56); ctx.stroke();
    ctx.fillStyle = COLORS[i];
    ctx.beginPath(); ctx.moveTo(-30, -56); ctx.lineTo(-4, -48); ctx.lineTo(-30, -40); ctx.closePath(); ctx.fill();
    ctx.restore();
    // canı biten mancınıkta duman
    if (p.hp <= 0){
      ctx.fillStyle = "rgba(60,60,60,.45)";
      for (let k = 0; k < 3; k++){
        const t = (G.t*.6 + k*.33) % 1;
        ctx.beginPath(); ctx.arc(p.x + Math.sin(t*6 + k)*10, gy - 40 - t*60, 8 + t*14, 0, TAU); ctx.fill();
      }
    }
  }

  function drawAim(){
    if (!canAim()) return;
    const p = G.players[G.turn], m = muzzle(p);
    const vx = Math.cos(p.aim.ang)*p.aim.pow, vy = Math.sin(p.aim.ang)*p.aim.pow;
    const share = PREVIEW[p.lv];
    if (share > 0){
      const r = simulate(m.x, m.y, vx, vy, G.wind);
      const n = Math.max(2, Math.floor(r.pts.length/2*share));
      ctx.fillStyle = "rgba(255,255,255,.85)";
      for (let i = 1; i < n; i += 2){
        const x = r.pts[i*2], y = r.pts[i*2 + 1];
        if (y < -40) continue;
        ctx.beginPath(); ctx.arc(x, y, 3.2, 0, TAU); ctx.fill();
      }
      if (share >= 1 && r.hit){
        ctx.strokeStyle = "#fff"; ctx.lineWidth = 3;
        ctx.beginPath(); ctx.arc(r.x, r.y - 4, 13, 0, TAU); ctx.stroke();
      }
    }
    // nişan oku
    const len = 34 + p.aim.pow*.08;
    ctx.strokeStyle = COLORS[G.turn]; ctx.lineWidth = 6; ctx.lineCap = "round";
    ctx.beginPath(); ctx.moveTo(m.x, m.y);
    ctx.lineTo(m.x + Math.cos(p.aim.ang)*len, m.y + Math.sin(p.aim.ang)*len); ctx.stroke();
    ctx.lineCap = "butt";
    if (p.lv < 2){
      const deg = Math.round(Math.abs(p.aim.ang*180/Math.PI));
      const txt = `${G.turn === 0 ? deg : 180 - deg}° · ${Math.round(p.aim.pow/10)}`;
      ctx.font = "700 20px Nunito, sans-serif"; ctx.textAlign = "center";
      ctx.fillStyle = "rgba(10,26,40,.55)";
      ctx.fillRect(p.x - 52, groundAt(p.x) - 92, 104, 28);
      ctx.fillStyle = "#fff"; ctx.fillText(txt, p.x, groundAt(p.x) - 72);
      ctx.textAlign = "left";
    }
  }

  function drawWind(){
    const y = 132, cx = W/2, c = cx + 36, full = 60;   // c: göstergenin ortası
    ctx.font = "700 19px Nunito, sans-serif"; ctx.textAlign = "center";
    ctx.fillStyle = "rgba(10,26,40,.4)";
    ctx.beginPath(); ctx.roundRect(cx - 110, y - 21, 220, 34, 17); ctx.fill();
    ctx.fillStyle = "#fff"; ctx.fillText("rüzgâr", cx - 58, y + 3);
    ctx.strokeStyle = "rgba(255,255,255,.4)"; ctx.lineWidth = 4; ctx.lineCap = "round";
    ctx.beginPath(); ctx.moveTo(c - full, y - 4); ctx.lineTo(c + full, y - 4); ctx.stroke();
    ctx.strokeStyle = "#FFCF5C";
    if (Math.abs(G.wind) < .06){
      ctx.fillStyle = "#FFCF5C"; ctx.beginPath(); ctx.arc(c, y - 4, 5, 0, TAU); ctx.fill();
    } else {
      const x1 = c + G.wind*full, sgn = Math.sign(G.wind);
      ctx.beginPath(); ctx.moveTo(c, y - 4); ctx.lineTo(x1, y - 4);
      ctx.moveTo(x1, y - 4); ctx.lineTo(x1 - sgn*10, y - 11);
      ctx.moveTo(x1, y - 4); ctx.lineTo(x1 - sgn*10, y + 3);
      ctx.stroke();
    }
    ctx.lineCap = "butt"; ctx.textAlign = "left";
  }

  function drawShot(){
    const s = G.shot;
    if (!s) return;
    ctx.fillStyle = "rgba(255,255,255,.55)";
    for (let i = 0; i < s.trail.length; i += 2){
      const k = i/Math.max(2, s.trail.length);
      ctx.globalAlpha = .12 + k*.5;
      ctx.beginPath(); ctx.arc(s.trail[i], s.trail[i + 1], 2 + k*2.5, 0, TAU); ctx.fill();
    }
    ctx.globalAlpha = 1;
    if (s.y < 6){
      ctx.fillStyle = "#4A3B2A";
      ctx.beginPath(); ctx.moveTo(clamp(s.x, 16, W - 16), 10); ctx.lineTo(clamp(s.x, 16, W - 16) - 11, -6); ctx.lineTo(clamp(s.x, 16, W - 16) + 11, -6); ctx.closePath(); ctx.fill();
      return;
    }
    ctx.fillStyle = "#5A6771"; ctx.strokeStyle = "#2E3A44"; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.arc(s.x, s.y, 11, 0, TAU); ctx.fill(); ctx.stroke();
    ctx.fillStyle = "rgba(255,255,255,.4)";
    ctx.beginPath(); ctx.arc(s.x - 3.5, s.y - 3.5, 4, 0, TAU); ctx.fill();
  }

  function drawEffects(){
    if (G.ring){
      const k = G.ring.t/.45;
      ctx.strokeStyle = `rgba(255,190,80,${(1 - k)*.9})`; ctx.lineWidth = 8*(1 - k) + 2;
      ctx.beginPath(); ctx.arc(G.ring.x, G.ring.y, 14 + k*78, 0, TAU); ctx.stroke();
    }
    G.parts.forEach(q => {
      ctx.globalAlpha = clamp(q.life/q.max, 0, 1);
      ctx.fillStyle = q.col;
      ctx.beginPath(); ctx.arc(q.x, q.y, q.r, 0, TAU); ctx.fill();
    });
    ctx.globalAlpha = 1;
  }

  function draw(){
    const d = view.dpr;
    ctx.setTransform(d, 0, 0, d, 0, 0);
    ctx.clearRect(0, 0, cv.width, cv.height);
    ctx.save();
    ctx.translate(view.ox, view.oy); ctx.scale(view.s, view.s);
    if (G.shake > 0) ctx.translate(rand(-1, 1)*G.shake*9, rand(-1, 1)*G.shake*9);
    drawSky();
    drawTerrain();
    G.players.forEach(drawCatapult);
    drawAim();
    drawShot();
    drawEffects();
    drawWind();
    ctx.restore();
  }

  /* ---------- tabela ve kurulum ---------- */
  function renderBoard(){
    G.players.forEach((p, i) => {
      $("nm-" + i).textContent = p.name;
      $("av-" + i).textContent = AVATARS[i];
      $("sc-" + i).textContent = p.score;
      let h = "";
      for (let k = 0; k < HEARTS; k++) h += `<i class="${k < p.hp ? "" : "off"}">❤️</i>`;
      $("hp-" + i).innerHTML = h;
      $("team-" + i).classList.toggle("turn", !G.over && G.turn === i);
    });
  }

  function renderSetup(){
    $("mode-2p").checked = settings.mode !== "cpu";
    $("mode-cpu").checked = settings.mode === "cpu";
    settings.players.forEach((p, i) => {
      $("pn-" + i).value = p.name;
      const r = document.querySelector(`input[name="lv${i}"][value="${p.lv}"]`);
      if (r) r.checked = true;
    });
    $("pn-1").disabled = settings.mode === "cpu";
  }
  document.querySelectorAll('input[name="mode"]').forEach(el => el.addEventListener("change", () => {
    settings.mode = $("mode-cpu").checked ? "cpu" : "2p";
    $("pn-1").disabled = settings.mode === "cpu";
  }));
  $("setup-form").addEventListener("submit", e => {
    e.preventDefault(); audio();
    settings.mode = $("mode-cpu").checked ? "cpu" : "2p";
    settings.players = [0, 1].map(i => ({
      name:($("pn-" + i).value || "").trim().slice(0, 12) || ["Enes", "Egemen"][i],
      lv:+((document.querySelector(`input[name="lv${i}"]:checked`) || {}).value || 1)
    }));
    try { localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings)); } catch(e) {}
    $("setup").hidden = true;
    newMatch();
  });
  $("open-setup").addEventListener("click", () => { renderSetup(); $("setup").hidden = false; });
  $("end-setup").addEventListener("click", () => { $("end").hidden = true; renderSetup(); $("setup").hidden = false; });
  $("again").addEventListener("click", () => { audio(); newRound(false); });

  /* ---------- döngü ---------- */
  let last = performance.now();
  function frame(now){
    const dt = Math.min(.05, Math.max(0, (now - last)/1000)); last = now;
    update(dt);
    if (G) draw();
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
  newMatch();
  requestAnimationFrame(frame);
})();
