/* Hava Hokeyi — Egemen ve Enes için iki kişilik hava hokeyi */
(function(){
  "use strict";

  // Mantıksal masa: dikey düşünülür. 0. oyuncu üstte (y küçük), 1. oyuncu altta.
  // Geniş ekranda masa yan çevrilir: 0. oyuncu solda, 1. oyuncu sağda.
  const FW = 600, FL = 1000, MID = 500, PR = 28, MR = 46, B = 22;
  const GOAL_W = {small:160, normal:210, large:270};
  const SPEED = {slow:{cap:800, keep:.6}, normal:{cap:1150, keep:.7}, fast:{cap:1550, keep:.8}};
  const AI = {
    kolay:{speed:520,  track:.45, attack:240, noise:80},
    orta: {speed:900,  track:.75, attack:380, noise:40},
    zor:  {speed:1400, track:.95, attack:480, noise:12}
  };
  const COLORS = [{c:"#3D6BF2", dark:"#2A4FC0", soft:"#E3EAFE"}, {c:"#FF7A2F", dark:"#D65A14", soft:"#FFEADF"}];
  const DEFAULT_NAMES = ["Enes", "Egemen"], AVATARS = ["🚀", "🎈"];
  const SETTINGS_KEY = "hava-hokeyi-ayar", SOUND_KEY = "hava-hokeyi-ses";
  const FONT = '"Fredoka", "Segoe UI", sans-serif';
  const HUMAN_SPEED = 2600, KEY_SPEED = 750;
  const RM = window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches;

  const $ = id => document.getElementById(id);
  const stage = $("stage"), cv = $("cv"), ctx = cv.getContext("2d");
  const rink = document.createElement("canvas"), rctx = rink.getContext("2d");
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const hexA = (hex, a) => { const n = parseInt(hex.slice(1), 16); return `rgba(${n >> 16},${(n >> 8) & 255},${n & 255},${a})`; };

  let settings = {mode:"pvp", ai:"orta", target:7, names:DEFAULT_NAMES.slice(), goal:["large", "normal"], speed:"normal"};
  try { const s = JSON.parse(localStorage.getItem(SETTINGS_KEY) || "null"); if (s) settings = Object.assign(settings, s); } catch(e) {}
  let soundOn = true;
  try { soundOn = localStorage.getItem(SOUND_KEY) !== "0"; } catch(e) {}

  let phase = "setup";          // setup | countdown | play | goal | over | paused
  let resumePhase = "play", cd = 0, goalT = 0, lastScorer = 0, lastBeep = 0, jamT = 0;
  const score = [0, 0];
  const puck = {x:FW/2, y:MID, vx:0, vy:0, live:false, trail:[]};
  const mallets = [newMallet(0), newMallet(1)];
  function newMallet(i){ const y = i ? FL - 150 : 150; return {x:FW/2, y, vx:0, vy:0, tx:FW/2, ty:y, maxSpeed:HUMAN_SPEED, keys:false}; }

  const isAI = i => settings.mode === "ai" && i === 0;
  const nameOf = i => isAI(i) ? "Bilgisayar" : ((settings.names[i] || "").trim() || DEFAULT_NAMES[i]);
  const avatarOf = i => isAI(i) ? "🤖" : AVATARS[i];
  const goalW = i => GOAL_W[settings.goal[i]] || GOAL_W.normal;

  /* ---------- ses ---------- */
  let ac = null, lastHit = 0;
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
    g.gain.setValueAtTime(.0001, n); g.gain.exponentialRampToValueAtTime(vol || .1, n + .008); g.gain.exponentialRampToValueAtTime(.0001, n + dur);
    o.connect(g).connect(a.destination); o.start(n); o.stop(n + dur + .05);
  }
  const sfx = {
    hit(v){ const now = performance.now(); if (now - lastHit < 50) return; lastHit = now; tone(clamp(380 + v*.35, 380, 1000), .06, "triangle", clamp(v/2200, .04, .16)); },
    wall(){ const now = performance.now(); if (now - lastHit < 50) return; lastHit = now; tone(240, .05, "sine", .07); },
    beep(high){ tone(high ? 1046.5 : 659.25, high ? .25 : .12, "sine", .13); },
    goal(){ [523.25, 659.25, 783.99, 1046.5].forEach((f, i) => tone(f, .2, "triangle", .15, null, i*.08)); },
    win(){ [523.25, 659.25, 783.99, 1046.5, 1318.5].forEach((f, i) => tone(f, .28, "triangle", .15, null, i*.12)); }
  };
  const canSpeak = "speechSynthesis" in window;
  let trVoice = null;
  function pickVoice(){ trVoice = speechSynthesis.getVoices().find(v => /^tr(-|_|$)/i.test(v.lang)) || null; }
  if (canSpeak){ pickVoice(); if (speechSynthesis.addEventListener) speechSynthesis.addEventListener("voiceschanged", pickVoice); }
  function say(text){
    if (!canSpeak || !soundOn || !trVoice) return;
    speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text); u.voice = trVoice; u.lang = trVoice.lang; u.pitch = 1.1;
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

  /* ---------- ekran eşlemesi ---------- */
  let orient = "v", s = 1, ox = 0, oy = 0, cssW = 0, cssH = 0, dpr = 1;
  const S = (x, y) => orient === "v" ? [ox + x*s, oy + y*s] : [ox + y*s, oy + x*s];
  function toLogical(e){
    const r = cv.getBoundingClientRect(), sx = e.clientX - r.left, sy = e.clientY - r.top;
    return orient === "v" ? {x:(sx - ox)/s, y:(sy - oy)/s} : {x:(sy - oy)/s, y:(sx - ox)/s};
  }
  function rectS(x0, y0, x1, y1){
    const [ax, ay] = S(x0, y0), [bx, by] = S(x1, y1);
    return [Math.min(ax, bx), Math.min(ay, by), Math.abs(bx - ax), Math.abs(by - ay)];
  }
  function roundRect(c, x, y, w, h, r){
    c.beginPath(); c.moveTo(x + r, y); c.arcTo(x + w, y, x + w, y + h, r); c.arcTo(x + w, y + h, x, y + h, r);
    c.arcTo(x, y + h, x, y, r); c.arcTo(x, y, x + w, y, r); c.closePath();
  }

  function resize(){
    const r = stage.getBoundingClientRect();
    cssW = Math.max(1, r.width); cssH = Math.max(1, r.height);
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    cv.width = rink.width = Math.round(cssW*dpr);
    cv.height = rink.height = Math.round(cssH*dpr);
    orient = cssW > cssH*1.05 ? "h" : "v";
    const RW = orient === "v" ? FW : FL, RH = orient === "v" ? FL : FW, pad = B + 8;
    s = Math.min(cssW/(RW + pad*2), cssH/(RH + pad*2));
    ox = (cssW - RW*s)/2; oy = (cssH - RH*s)/2;
    buildRink();
  }

  function buildRink(){
    const c = rctx;
    c.setTransform(dpr, 0, 0, dpr, 0, 0);
    c.clearRect(0, 0, cssW, cssH);
    // çerçeve
    let [x, y, w, h] = rectS(-B, -B, FW + B, FL + B);
    c.fillStyle = "#0B1B2B"; roundRect(c, x, y, w, h, 40*s); c.fill();
    // kale ağızları
    for (const i of [0, 1]){
      const gw = goalW(i), yy = i === 0 ? -B : FL;
      [x, y, w, h] = rectS(FW/2 - gw/2, yy, FW/2 + gw/2, yy + B);
      c.fillStyle = COLORS[i].c; c.fillRect(x, y, w, h);
      c.fillStyle = "rgba(0,0,0,.25)";
      const [nx, ny, nw, nh] = rectS(FW/2 - gw/2 + 8, i === 0 ? -B + 6 : FL, FW/2 + gw/2 - 8, i === 0 ? 0 : FL + B - 6);
      c.fillRect(nx, ny, nw, nh);
    }
    // zemin
    [x, y, w, h] = rectS(0, 0, FW, FL);
    const g = c.createLinearGradient(x, y, x + w, y + h);
    g.addColorStop(0, "#F4FBFE"); g.addColorStop(1, "#E2F0F7");
    c.fillStyle = g; roundRect(c, x, y, w, h, 22*s); c.fill();
    c.save(); roundRect(c, x, y, w, h, 22*s); c.clip();
    // hava delikleri
    c.fillStyle = "rgba(23,50,77,.10)";
    for (let gx = 30; gx < FW; gx += 40) for (let gy = 30; gy < FL; gy += 40){ const [px, py] = S(gx, gy); c.beginPath(); c.arc(px, py, 1.6*s, 0, Math.PI*2); c.fill(); }
    // kale bölgeleri
    for (const i of [0, 1]){
      const [cx, cy] = S(FW/2, i === 0 ? 0 : FL);
      c.beginPath(); c.arc(cx, cy, (goalW(i)/2 + 40)*s, 0, Math.PI*2);
      c.fillStyle = hexA(COLORS[i].c, .08); c.fill();
      c.strokeStyle = hexA(COLORS[i].c, .45); c.lineWidth = 5*s; c.stroke();
    }
    // orta çizgi ve daire
    c.strokeStyle = "rgba(23,50,77,.22)"; c.lineWidth = 6*s;
    let [ax, ay] = S(0, MID), [bx, by] = S(FW, MID);
    c.beginPath(); c.moveTo(ax, ay); c.lineTo(bx, by); c.stroke();
    const [mx, my] = S(FW/2, MID);
    c.lineWidth = 4*s; c.beginPath(); c.arc(mx, my, 90*s, 0, Math.PI*2); c.stroke();
    c.fillStyle = "rgba(23,50,77,.22)"; c.beginPath(); c.arc(mx, my, 8*s, 0, Math.PI*2); c.fill();
    c.restore();
  }

  /* ---------- oyun akışı ---------- */
  function resetPositions(){
    mallets.forEach((m, i) => { const n = newMallet(i); Object.assign(m, n); });
    Object.assign(puck, {x:FW/2, y:MID, vx:0, vy:0, live:false, trail:[]});
  }

  function startMatch(){
    audio();
    score[0] = score[1] = 0;
    resetPositions(); buildRink();
    ["setup", "paused", "over"].forEach(id => { $(id).hidden = true; });
    phase = "countdown"; cd = 3; lastBeep = 4;
    if (document.activeElement && document.activeElement.blur) document.activeElement.blur();
  }

  function goal(scorer){
    score[scorer]++; lastScorer = scorer;
    puck.live = false; puck.trail = [];
    sfx.goal();
    const conceding = 1 - scorer;
    Object.assign(puck, {x:FW/2, y:conceding === 0 ? MID/2 : MID + MID/2, vx:0, vy:0});
    if (score[scorer] >= settings.target){
      phase = "over";
      say(`${nameOf(scorer)} kazandı!`);
      setTimeout(showWinner, 900);
    } else {
      phase = "goal"; goalT = 1.6;
      say(`Gol! ${nameOf(scorer)}!`);
    }
  }

  function showWinner(){
    sfx.win(); confetti();
    const w = score[0] > score[1] ? 0 : 1;
    $("res-title").textContent = isAI(w) ? "Bilgisayar kazandı!" : `${nameOf(w)} kazandı!`;
    $("res-score").innerHTML = `<span class="s0">${score[0]}</span><span class="dash">–</span><span class="s1">${score[1]}</span>`;
    $("res-sub").textContent = isAI(w) ? "Bir daha dene, bu sefer yenersin!" : `${nameOf(0)} ve ${nameOf(1)}, harika bir maçtı!`;
    $("over").hidden = false;
    $("rematch").focus({preventScroll:true});
  }

  function togglePause(){
    if (phase === "countdown" || phase === "play" || phase === "goal"){
      resumePhase = phase; phase = "paused"; $("paused").hidden = false; $("resume").focus({preventScroll:true});
    } else if (phase === "paused"){
      phase = resumePhase; $("paused").hidden = true; last = performance.now();
    }
  }

  function confetti(){
    if (RM) return;
    const layer = $("confetti"), colors = ["#3D6BF2", "#FF7A2F", "#FFC93C", "#2DB75A", "#F2F7FB"];
    for (let i = 0; i < 90; i++){
      const el = document.createElement("i");
      el.style.left = Math.random()*100 + "%"; el.style.background = colors[i % colors.length];
      el.style.animationDelay = Math.random()*.8 + "s"; el.style.animationDuration = 2.2 + Math.random()*1.6 + "s";
      el.style.setProperty("--dx", (Math.random()*160 - 80) + "px"); el.style.setProperty("--r", (Math.random()*720 - 360) + "deg");
      layer.appendChild(el);
    }
    setTimeout(() => { layer.innerHTML = ""; }, 4800);
  }

  /* ---------- kontroller ---------- */
  const owners = new Map();
  function setTarget(p, L){
    if (isAI(p)) return;
    const m = mallets[p];
    m.tx = L.x; m.ty = L.y; m.maxSpeed = HUMAN_SPEED; m.keys = false;
  }
  function sideOf(L){ return settings.mode === "ai" ? 1 : (L.y < MID ? 0 : 1); }

  cv.addEventListener("pointerdown", e => {
    e.preventDefault(); audio();
    const L = toLogical(e), p = sideOf(L);
    owners.set(e.pointerId, p); setTarget(p, L);
    try { cv.setPointerCapture(e.pointerId); } catch(_) {}
  });
  cv.addEventListener("pointermove", e => {
    const L = toLogical(e);
    let p = owners.get(e.pointerId);
    if (p === undefined){ if (e.pointerType !== "mouse") return; p = sideOf(L); }
    setTarget(p, L);
  });
  ["pointerup", "pointercancel"].forEach(ev => cv.addEventListener(ev, e => owners.delete(e.pointerId)));
  cv.addEventListener("contextmenu", e => e.preventDefault());

  const keys = {};
  window.addEventListener("keydown", e => {
    const k = e.key.toLowerCase();
    const typing = e.target && (e.target.tagName === "INPUT");
    if (!typing && ["arrowup","arrowdown","arrowleft","arrowright"," "].includes(k) && phase !== "setup") e.preventDefault();
    if (typing) return;
    keys[k] = true;
    if (!e.repeat && (k === "p" || k === "escape")) togglePause();
  });
  window.addEventListener("keyup", e => { keys[e.key.toLowerCase()] = false; });
  window.addEventListener("blur", () => { for (const k in keys) keys[k] = false; if (phase === "play" || phase === "goal" || phase === "countdown") togglePause(); });
  document.addEventListener("visibilitychange", () => { if (document.hidden && (phase === "play" || phase === "goal" || phase === "countdown")) togglePause(); });

  const KEYSETS = [{u:"w", d:"s", l:"a", r:"d"}, {u:"arrowup", d:"arrowdown", l:"arrowleft", r:"arrowright"}];
  function readKeys(){
    for (const p of [0, 1]){
      if (isAI(p)) continue;
      const sets = settings.mode === "ai" ? KEYSETS : [KEYSETS[p]];
      let sx = 0, sy = 0;
      for (const k of sets){ sx += (keys[k.r] ? 1 : 0) - (keys[k.l] ? 1 : 0); sy += (keys[k.d] ? 1 : 0) - (keys[k.u] ? 1 : 0); }
      sx = clamp(sx, -1, 1); sy = clamp(sy, -1, 1);
      const m = mallets[p];
      if (sx || sy){
        const lx = orient === "v" ? sx : sy, ly = orient === "v" ? sy : sx;
        m.tx = m.x + lx*80; m.ty = m.y + ly*80; m.maxSpeed = KEY_SPEED; m.keys = true;
      } else if (m.keys){
        m.tx = m.x; m.ty = m.y; m.keys = false;
      }
    }
  }

  /* ---------- bilgisayar oyuncu ---------- */
  let aiNoise = 0, aiNoiseT = 0, aiHalfT = 0;
  function aiThink(dt){
    const L = AI[settings.ai] || AI.orta, m = mallets[0];
    m.maxSpeed = L.speed;
    aiNoiseT -= dt;
    if (aiNoiseT <= 0){ aiNoise = (Math.random()*2 - 1)*L.noise; aiNoiseT = .6; }
    if (!puck.live){ m.tx = FW/2; m.ty = 110; aiHalfT = 0; return; }
    aiHalfT = puck.y < MID ? aiHalfT + dt : 0;
    // yavaş ya da duran pak kendi yarısındaysa her zorlukta vurmaya gider, yoksa oyun kilitlenir
    const slow = Math.hypot(puck.vx, puck.vy) < 220;
    if (puck.y < MID + PR && (puck.y < L.attack || slow || aiHalfT > 4)){
      if (aiHalfT > 6){
        // uzun süredir kendi yarısında dolaşıyorsa doğrudan pakın üstüne git
        m.tx = puck.x; m.ty = puck.y;
      } else if (puck.y < m.y + 5){
        // pak tokmakla kendi kalesi arasında: duvara sıkıştırmamak için yandan yaklaş
        const side = puck.x < FW/2 ? 1 : -1;
        m.tx = puck.x + side*(MR + PR + 30); m.ty = Math.max(MR, puck.y - 20);
      } else { m.tx = puck.x + aiNoise*.4; m.ty = puck.y + 40; }
    } else {
      m.tx = FW/2 + (puck.x - FW/2)*L.track + aiNoise; m.ty = 100;
    }
  }

  /* ---------- fizik ---------- */
  function moveMallet(i, h){
    const m = mallets[i];
    const minY = i === 0 ? MR : MID + MR, maxY = i === 0 ? MID - MR : FL - MR;
    const tx = clamp(m.tx, MR, FW - MR), ty = clamp(m.ty, minY, maxY);
    let dx = tx - m.x, dy = ty - m.y;
    const d = Math.hypot(dx, dy), step = m.maxSpeed*h;
    if (d > step){ dx *= step/d; dy *= step/d; }
    m.vx = dx/h; m.vy = dy/h; m.x += dx; m.y += dy;
  }

  function capPuck(){
    const cap = (SPEED[settings.speed] || SPEED.normal).cap, sp = Math.hypot(puck.vx, puck.vy);
    if (sp > cap){ puck.vx *= cap/sp; puck.vy *= cap/sp; }
  }

  function collide(i){
    const m = mallets[i];
    let dx = puck.x - m.x, dy = puck.y - m.y, d = Math.hypot(dx, dy);
    const min = MR + PR;
    if (d >= min) return;
    if (d < .001){ dx = 0; dy = i === 0 ? 1 : -1; d = 1; }
    const nx = dx/d, ny = dy/d;
    puck.x = m.x + nx*min; puck.y = m.y + ny*min;
    const vn = (puck.vx - m.vx)*nx + (puck.vy - m.vy)*ny;
    if (vn < 0){ puck.vx -= 1.9*vn*nx; puck.vy -= 1.9*vn*ny; sfx.hit(-vn); }
    capPuck();
  }

  function walls(){
    if (puck.x < PR){ puck.x = PR; if (puck.vx < 0){ puck.vx = -puck.vx*.9; sfx.wall(); } }
    if (puck.x > FW - PR){ puck.x = FW - PR; if (puck.vx > 0){ puck.vx = -puck.vx*.9; sfx.wall(); } }
    for (const i of [0, 1]){
      const half = goalW(i)/2, inMouth = Math.abs(puck.x - FW/2) < half - PR*.3;
      const past = i === 0 ? puck.y < PR : puck.y > FL - PR;
      if (!past) continue;
      if (inMouth){
        // kale ağzının içindeyken yan direklerden sek
        const lo = FW/2 - half + PR, hi = FW/2 + half - PR;
        const beyond = i === 0 ? puck.y < 0 : puck.y > FL;
        if (beyond && (puck.x < lo || puck.x > hi)){ puck.x = clamp(puck.x, lo, hi); puck.vx = -puck.vx*.8; }
      } else {
        puck.y = i === 0 ? PR : FL - PR;
        if (i === 0 ? puck.vy < 0 : puck.vy > 0){ puck.vy = -puck.vy*.9; sfx.wall(); }
      }
    }
  }

  function physics(dt){
    readKeys();
    if (settings.mode === "ai") aiThink(dt);
    const N = 6, h = dt/N;
    for (let k = 0; k < N; k++){
      moveMallet(0, h); moveMallet(1, h);
      if (!puck.live) continue;
      puck.x += puck.vx*h; puck.y += puck.vy*h;
      collide(0); collide(1);
      walls();
      if (puck.y < -PR){ goal(1); break; }
      if (puck.y > FL + PR){ goal(0); break; }
    }
    if (puck.live){
      // pak iki tokmak ya da tokmakla duvar arasında sıkışıp kaldıysa ortaya doğru hafifçe it
      const touching = mallets.some(m => Math.hypot(puck.x - m.x, puck.y - m.y) < MR + PR + 2);
      jamT = (touching && Math.hypot(puck.vx, puck.vy) < 40) ? jamT + dt : 0;
      if (jamT > 1.2){
        jamT = 0;
        puck.vx = (puck.x < FW/2 ? 1 : -1)*380;
        puck.vy = (puck.y < MID ? 1 : -1)*(Math.abs(puck.y - MID) < 60 ? 0 : 120);
      }
      const f = Math.pow((SPEED[settings.speed] || SPEED.normal).keep, dt);
      puck.vx *= f; puck.vy *= f;
      if (Math.hypot(puck.vx, puck.vy) > 450 && !RM){ puck.trail.push([puck.x, puck.y]); if (puck.trail.length > 6) puck.trail.shift(); }
      else if (puck.trail.length) puck.trail.shift();
    }
  }

  /* ---------- çizim ---------- */
  function circle(x, y, r){ ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI*2); ctx.fill(); }

  function drawHalfText(i){
    const [sx, sy] = S(FW/2, i === 0 ? MID/2 : MID + MID/2);
    ctx.save(); ctx.translate(sx, sy);
    if (orient === "v" && i === 0) ctx.rotate(Math.PI);
    ctx.textAlign = "center"; ctx.textBaseline = "middle";
    ctx.fillStyle = hexA(COLORS[i].c, .2); ctx.font = `700 ${Math.round(170*s)}px ${FONT}`;
    // dikeyde ad, tokmağın başlangıç yerine denk gelmesin diye skorun orta çizgi tarafına yazılır
    const nameY = orient === "v" ? -120*s : 100*s, scoreY = orient === "v" ? 20*s : -12*s;
    ctx.fillText(String(score[i]), 0, scoreY);
    ctx.fillStyle = hexA(COLORS[i].dark, .55); ctx.font = `600 ${Math.max(11, Math.round(30*s))}px ${FONT}`;
    ctx.fillText(`${avatarOf(i)} ${nameOf(i)}`, 0, nameY);
    ctx.restore();
  }

  function drawMallet(i){
    const m = mallets[i], col = COLORS[i], [x, y] = S(m.x, m.y), r = MR*s;
    ctx.fillStyle = "rgba(11,27,43,.2)"; circle(x + 3*s, y + 6*s, r);
    ctx.fillStyle = col.dark; circle(x, y, r);
    ctx.fillStyle = col.c; circle(x, y, r*.84);
    ctx.fillStyle = col.soft; circle(x, y, r*.52);
    ctx.font = `${Math.round(r*.62)}px "Segoe UI Emoji","Apple Color Emoji","Noto Color Emoji",sans-serif`;
    ctx.textAlign = "center"; ctx.textBaseline = "middle";
    ctx.fillText(avatarOf(i), x, y + r*.04);
  }

  function drawPuck(ghost){
    const r = PR*s;
    puck.trail.forEach(([tx, ty], k) => { const [x, y] = S(tx, ty); ctx.fillStyle = `rgba(23,50,77,${(.04 + k*.03).toFixed(2)})`; circle(x, y, r*(.6 + k*.06)); });
    const [x, y] = S(puck.x, puck.y);
    ctx.globalAlpha = ghost ? .35 : 1;
    ctx.fillStyle = "rgba(11,27,43,.2)"; circle(x + 2*s, y + 4*s, r);
    ctx.fillStyle = "#17324D"; circle(x, y, r);
    ctx.strokeStyle = "rgba(255,255,255,.35)"; ctx.lineWidth = 3*s;
    ctx.beginPath(); ctx.arc(x, y, r*.6, 0, Math.PI*2); ctx.stroke();
    ctx.globalAlpha = 1;
  }

  function bigText(text, color, sub){
    const [cx, cy] = S(FW/2, MID);
    ctx.textAlign = "center"; ctx.textBaseline = "middle";
    ctx.font = `700 ${Math.round(120*s)}px ${FONT}`;
    ctx.lineWidth = 10*s; ctx.strokeStyle = "#FFFFFF"; ctx.strokeText(text, cx, cy);
    ctx.fillStyle = color; ctx.fillText(text, cx, cy);
    if (sub){
      ctx.font = `600 ${Math.max(14, Math.round(38*s))}px ${FONT}`;
      ctx.lineWidth = 8*s; ctx.strokeText(sub, cx, cy + 95*s);
      ctx.fillStyle = "#17324D"; ctx.fillText(sub, cx, cy + 95*s);
    }
  }

  function draw(){
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, cv.width, cv.height);
    ctx.drawImage(rink, 0, 0);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    drawHalfText(0); drawHalfText(1);
    const showPuck = phase !== "setup";
    if (showPuck) drawPuck(!puck.live);
    drawMallet(0); drawMallet(1);
    if (phase === "countdown") bigText(String(Math.max(1, Math.ceil(cd))), "#17324D", "Hazır ol!");
    if (phase === "goal" || (phase === "over" && $("over").hidden)) bigText("GOL!", COLORS[lastScorer].c, `${avatarOf(lastScorer)} ${nameOf(lastScorer)}`);
  }

  let last = performance.now();
  function frame(now){
    const dt = Math.min(.033, (now - last)/1000); last = now;
    if (phase === "countdown"){
      cd -= dt;
      const n = Math.ceil(cd);
      if (n !== lastBeep && n > 0){ lastBeep = n; sfx.beep(false); }
      if (cd <= 0){ phase = "play"; puck.live = true; sfx.beep(true); }
    } else if (phase === "goal"){
      goalT -= dt;
      if (goalT <= 0){ phase = "play"; puck.live = true; }
    }
    if (phase === "countdown" || phase === "play" || phase === "goal" || phase === "over") physics(dt);
    draw();
    requestAnimationFrame(frame);
  }

  /* ---------- ayarlar ---------- */
  function fillForm(){
    $("mode-" + settings.mode).checked = true;
    const a = $("ai-" + settings.ai); if (a) a.checked = true;
    const t = $("target-" + settings.target); if (t) t.checked = true;
    const sp = $("speed-" + settings.speed); if (sp) sp.checked = true;
    [0, 1].forEach(i => {
      $("name-" + i).value = settings.names[i] || DEFAULT_NAMES[i];
      const g = $(`goal${i}-${settings.goal[i]}`); if (g) g.checked = true;
    });
    syncMode();
  }
  function syncMode(){
    const ai = $("mode-ai").checked;
    $("ai-level").hidden = !ai;
    $("name-0").disabled = ai;
    $("avatar-0").textContent = ai ? "🤖" : AVATARS[0];
    if (ai) $("name-0").value = "Bilgisayar";
    else if ($("name-0").value === "Bilgisayar") $("name-0").value = settings.names[0] || DEFAULT_NAMES[0];
  }
  $("mode-pvp").addEventListener("change", syncMode);
  $("mode-ai").addEventListener("change", syncMode);

  function openSetup(){
    fillForm();
    ["paused", "over"].forEach(id => { $(id).hidden = true; });
    phase = "setup";
    $("setup").hidden = false;
    $("start").focus({preventScroll:true});
  }
  $("setup-form").addEventListener("submit", e => {
    e.preventDefault();
    const val = n => { const el = $("setup-form").elements.namedItem(n); return el ? el.value : ""; };
    settings.mode = val("mode") === "ai" ? "ai" : "pvp";
    settings.ai = AI[val("ai")] ? val("ai") : "orta";
    settings.target = [5, 7, 10].includes(+val("target")) ? +val("target") : 7;
    settings.speed = SPEED[val("speed")] ? val("speed") : "normal";
    settings.goal = [val("goal0"), val("goal1")].map(v => GOAL_W[v] ? v : "normal");
    if (settings.mode === "pvp") settings.names[0] = $("name-0").value.trim() || DEFAULT_NAMES[0];
    settings.names[1] = $("name-1").value.trim() || DEFAULT_NAMES[1];
    try { localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings)); } catch(err) {}
    startMatch();
  });
  $("open-setup").addEventListener("click", openSetup);
  $("pause-setup").addEventListener("click", openSetup);
  $("over-setup").addEventListener("click", openSetup);
  $("rematch").addEventListener("click", startMatch);
  $("resume").addEventListener("click", togglePause);
  $("pause").addEventListener("click", togglePause);

  if ("ResizeObserver" in window) new ResizeObserver(resize).observe(stage);
  else window.addEventListener("resize", resize);
  fillForm();
  resize();
  requestAnimationFrame(frame);
})();
