/* Yıldız Devriyesi — Enes için uzay nişancı oyunu */
(function(){
  "use strict";

  const W = 480, H = 720;                 // mantıksal oyun alanı, ekrana ölçeklenir
  const BEST_KEY = "yildiz-devriyesi-rekor", SOUND_KEY = "yildiz-devriyesi-ses";
  const RM = window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches;
  const C = {space:"#140F2E", ship:"#F5F1E8", flame:"#FF8A3D", shot:"#FFD166", coral:"#FF5D73", teal:"#3DD6C6",
             rock:"#8C7AA8", rockDark:"#4A3E66", ink:"#EDE7FF", muted:"#A79BC9", hull:"#2A1F4F"};
  const DROP_COLORS = {weapon:C.shot, shield:C.teal, bomb:C.flame, life:C.coral};
  const DROP_LABELS = {weapon:"SİLAH +", shield:"KALKAN", bomb:"BOMBA +1", life:"CAN +1"};
  const FONT = '"Chakra Petch", "Segoe UI", sans-serif';

  const $ = id => document.getElementById(id);
  const stage = $("stage"), cv = $("cv"), ctx = cv.getContext("2d");
  let scale = 1;

  const rand = (a,b) => a + Math.random()*(b-a);
  const clamp = (v,a,b) => Math.max(a, Math.min(b, v));
  const hitCircle = (a, b, r) => { const dx = a.x - b.x, dy = a.y - b.y; return dx*dx + dy*dy < r*r; };

  let state = "intro"; // intro | play | paused | over
  let player = null, bullets = [], foes = [], foeShots = [], drops = [], parts = [], texts = [], spawned = [];
  let score = 0, wave = 0, combo = 0, comboT = 0, mult = 1, shake = 0, flash = 0;
  let bannerT = 0, bannerText = "", spawnQueue = [], spawnT = 0, waveGap = 0, bossRef = null, bossWave = false;
  let time = 0, last = performance.now(), shotSound = 0;

  let best = {score:0, wave:0};
  try { const b = JSON.parse(localStorage.getItem(BEST_KEY) || "null"); if (b && typeof b.score === "number") best = b; } catch(e) {}
  let soundOn = true;
  try { soundOn = localStorage.getItem(SOUND_KEY) !== "0"; } catch(e) {}

  const stars = [];
  for (let i = 0; i < 90; i++) stars.push({x:rand(0, W), y:rand(0, H), z:[.3, .6, 1][i % 3]});

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
  function noise(dur, vol, freq){
    const a = audio(); if (!a || !soundOn) return;
    const len = Math.floor(a.sampleRate*dur), buf = a.createBuffer(1, len, a.sampleRate), d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = (Math.random()*2 - 1) * Math.pow(1 - i/len, 2);
    const src = a.createBufferSource(); src.buffer = buf;
    const f = a.createBiquadFilter(); f.type = "lowpass"; f.frequency.value = freq;
    const g = a.createGain(); g.gain.value = vol;
    src.connect(f).connect(g).connect(a.destination); src.start();
  }
  const sfx = {
    shoot(){ tone(880, .05, "square", .02, 620); },
    enemyShot(){ tone(320, .09, "sawtooth", .025, 200); },
    boom(r){ noise(.2 + r/120, .35, Math.max(300, 1100 - r*12)); },
    hurt(){ tone(420, .45, "sawtooth", .1, 70); noise(.35, .35, 700); },
    shield(){ tone(1200, .12, "sine", .08, 600); },
    power(){ tone(660, .08, "triangle", .12); tone(880, .08, "triangle", .12, null, .08); tone(1320, .14, "triangle", .12, null, .16); },
    bomb(){ noise(.9, .55, 500); tone(220, .8, "sine", .3, 40); },
    alarm(){ for (let i = 0; i < 3; i++){ tone(560, .2, "square", .05, null, i*.45); tone(420, .2, "square", .05, null, i*.45 + .22); } },
    clear(){ [523.25, 659.25, 783.99, 1046.5].forEach((f, i) => tone(f, .18, "triangle", .1, null, i*.09)); },
    over(){ tone(440, .3, "triangle", .12, 330); tone(330, .5, "triangle", .12, 160, .3); }
  };

  function renderSound(){
    $("ic-on").hidden = !soundOn; $("ic-off").hidden = soundOn;
    $("sound").setAttribute("aria-label", soundOn ? "Sesi kapat" : "Sesi aç");
    $("sound").setAttribute("aria-pressed", String(soundOn));
  }
  $("sound").addEventListener("click", () => {
    soundOn = !soundOn;
    try { localStorage.setItem(SOUND_KEY, soundOn ? "1" : "0"); } catch(e) {}
    renderSound();
  });
  renderSound();

  /* ---------- oyun akışı ---------- */
  function speedMul(){ return Math.min(1.8, 1 + (wave - 1)*.05); }

  function reset(){
    player = {x:W/2, y:H - 100, r:8, lives:3, inv:2, weapon:1, shield:0, bombs:2, fireCd:0, tilt:0};
    bullets = []; foes = []; foeShots = []; drops = []; parts = []; texts = []; spawned = [];
    score = 0; wave = 0; combo = 0; comboT = 0; mult = 1; shake = 0; flash = 0; bossRef = null; waveGap = 0;
    nextWave();
    updateBombUI();
  }

  function nextWave(){
    wave++;
    bossWave = wave % 5 === 0;
    spawnQueue = [];
    if (bossWave){
      spawnQueue.push("boss");
      bannerText = "ANA GEMİ YAKLAŞIYOR";
      sfx.alarm();
    } else {
      const n = 8 + wave*3;
      for (let i = 0; i < n; i++){
        const r = Math.random();
        let type = "rock";
        if (wave >= 2 && r < .35) type = "fighter";
        if (wave >= 3 && r > .78) type = "diver";
        spawnQueue.push(type);
      }
      bannerText = "DALGA " + wave;
    }
    bannerT = 2; spawnT = 1.6;
  }

  function rockVerts(){ const v = []; for (let i = 0; i < 9; i++) v.push(rand(.75, 1.1)); return v; }

  function spawn(type){
    const sp = speedMul();
    if (type === "rock"){
      const r = rand(22, 30);
      foes.push({type, x:rand(r, W - r), y:-r, vx:rand(-30, 30), vy:rand(60, 110)*sp, r, hp:3, score:30, rot:rand(0, 6), vr:rand(-1.5, 1.5), verts:rockVerts(), hitT:0});
    } else if (type === "fighter"){
      const x = rand(60, W - 60);
      foes.push({type, x, baseX:x, y:-20, vy:150, r:16, hp:2, score:60, life:0, holdY:rand(80, 260), fireCd:rand(.8, 2), phase:rand(0, 6), hitT:0});
    } else if (type === "diver"){
      foes.push({type, x:rand(30, W - 30), y:-20, vy:100*sp, r:14, hp:1, score:50, mode:"in", t:0, hitT:0});
    } else if (type === "boss"){
      const hp = 60 + wave*8;
      bossRef = {type, x:W/2, y:-80, r:54, hp, maxHp:hp, score:1500, t:0, shotA:1.5, shotB:1, dir:1, hitT:0};
      foes.push(bossRef);
    }
  }

  function startGame(){
    audio();
    reset();
    state = "play";
    ["intro", "paused", "over"].forEach(id => { $(id).hidden = true; });
    $("bomb").hidden = false;
    if (document.activeElement && document.activeElement.blur) document.activeElement.blur();
  }

  function togglePause(){
    if (state === "play"){ state = "paused"; $("paused").hidden = false; $("resume").focus({preventScroll:true}); drag = null; moveTarget = null; }
    else if (state === "paused"){ state = "play"; $("paused").hidden = true; last = performance.now(); if (document.activeElement && document.activeElement.blur) document.activeElement.blur(); }
  }

  function gameOver(){
    state = "over";
    $("bomb").hidden = true;
    const isBest = score > best.score;
    best = {score:Math.max(best.score, score), wave:Math.max(best.wave, wave)};
    try { localStorage.setItem(BEST_KEY, JSON.stringify(best)); } catch(e) {}
    $("over-score").textContent = score.toLocaleString("tr-TR");
    $("over-wave").textContent = wave;
    $("over-best").textContent = best.score.toLocaleString("tr-TR");
    $("newrec").hidden = !isBest || score === 0;
    renderRecords();
    setTimeout(() => { if (state === "over"){ $("over").hidden = false; $("again").focus({preventScroll:true}); } }, 900);
    sfx.over();
  }

  function renderRecords(){
    $("intro-best").textContent = best.score.toLocaleString("tr-TR");
    $("intro-wave").textContent = best.wave;
  }
  renderRecords();

  function updateBombUI(){
    $("bomb-count").textContent = player ? player.bombs : 0;
    $("bomb").disabled = !player || player.bombs <= 0;
  }

  /* ---------- savaş ---------- */
  function fire(){
    const p = player, s = 720;
    const add = (dx, ang) => bullets.push({x:p.x + dx, y:p.y - 18, vx:Math.sin(ang)*s, vy:-Math.cos(ang)*s});
    if (p.weapon === 1) add(0, 0);
    else if (p.weapon === 2){ add(-7, 0); add(7, 0); }
    else if (p.weapon === 3){ add(0, 0); add(-8, -.14); add(8, .14); }
    else { add(0, 0); add(-8, -.12); add(8, .12); add(-12, -.26); add(12, .26); }
    if (++shotSound % 2 === 0) sfx.shoot();
  }

  function explode(x, y, n, color){
    for (let i = 0; i < n; i++){
      const a = rand(0, Math.PI*2), sp = rand(40, 260);
      parts.push({x, y, vx:Math.cos(a)*sp, vy:Math.sin(a)*sp, life:rand(.3, .8), max:.8, color: i % 4 === 0 ? "#FFFFFF" : color, size:rand(1.5, 4)});
    }
  }

  function damage(f, n){
    if (f.hp <= 0) return;
    f.hp -= n; f.hitT = .08;
    if (f.hp <= 0) kill(f);
  }

  function kill(f){
    f.hp = 0;
    const col = (f.type === "rock" || f.type === "small") ? C.rock : f.type === "diver" ? C.teal : C.coral;
    explode(f.x, f.y, f.type === "boss" ? 90 : f.r > 20 ? 26 : 14, col);
    sfx.boom(f.r);
    combo++; comboT = 2; mult = Math.min(5, 1 + Math.floor(combo/8));
    const gain = f.score*mult; score += gain;
    texts.push({x:f.x, y:f.y, txt:"+" + gain, t:.9, color: mult > 1 ? C.shot : C.ink});
    if (f.type === "rock"){
      for (const k of [-1, 1]) spawned.push({type:"small", x:f.x + k*8, y:f.y, vx:k*rand(50, 90), vy:f.vy*1.1, r:13, hp:1, score:15, rot:0, vr:rand(-3, 3), verts:rockVerts(), hitT:0});
    }
    if (f.type === "boss"){
      bossRef = null; flash = 1; shake = 24;
      foeShots.forEach(s => explode(s.x, s.y, 3, C.coral)); foeShots = [];
      bannerText = "ANA GEMİ YOK EDİLDİ"; bannerT = 2;
      sfx.clear();
    }
    maybeDrop(f);
  }

  function makeDrop(x, y){
    const r = Math.random();
    let kind = r < .4 ? "weapon" : r < .65 ? "shield" : r < .87 ? "bomb" : "life";
    if (kind === "life" && player.lives >= 5) kind = "bomb";
    if (kind === "weapon" && player.weapon >= 4 && Math.random() < .5) kind = "shield";
    return {x, y, kind, t:0};
  }
  function maybeDrop(f){
    if (f.type === "boss"){ for (let i = -1; i <= 1; i++) drops.push(makeDrop(f.x + i*34, f.y)); return; }
    const chance = {rock:.06, small:.02, fighter:.15, diver:.1}[f.type] || 0;
    if (Math.random() < chance) drops.push(makeDrop(f.x, f.y));
  }

  function bomb(){
    if (state !== "play" || !player || player.bombs <= 0) return;
    player.bombs--; updateBombUI();
    flash = 1; shake = 18; sfx.bomb();
    foeShots.forEach(s => explode(s.x, s.y, 2, C.flame)); foeShots = [];
    for (const f of foes) if (f.y > -20) damage(f, f.type === "boss" ? 12 : 10);
  }

  function hurtPlayer(){
    const p = player;
    if (p.inv > 0) return false;
    if (p.shield > 0){ sfx.shield(); return true; }
    p.lives--; p.inv = 2; p.weapon = Math.max(1, p.weapon - 1);
    combo = 0; mult = 1; comboT = 0; shake = 14;
    foeShots = [];
    explode(p.x, p.y, 30, C.flame);
    sfx.hurt();
    if (p.lives <= 0){ explode(p.x, p.y, 60, C.ship); gameOver(); }
    return true;
  }

  function applyDrop(d){
    const p = player;
    if (d.kind === "weapon"){ if (p.weapon < 4) p.weapon++; else { score += 500; texts.push({x:d.x, y:d.y - 18, txt:"+500", t:.9, color:C.shot}); } }
    else if (d.kind === "shield") p.shield = 8;
    else if (d.kind === "bomb"){ p.bombs = Math.min(5, p.bombs + 1); updateBombUI(); }
    else p.lives = Math.min(5, p.lives + 1);
    texts.push({x:d.x, y:d.y, txt:DROP_LABELS[d.kind], t:1, color:DROP_COLORS[d.kind]});
    sfx.power();
  }

  /* ---------- kontroller ---------- */
  const keys = {};
  let drag = null, moveTarget = null;

  window.addEventListener("keydown", e => {
    const k = e.key.toLowerCase();
    const gameKey = ["arrowleft","arrowright","arrowup","arrowdown"," ","enter"].includes(k);
    if (gameKey && (state !== "intro" || k === " " || k === "enter")) e.preventDefault();
    keys[k] = true;
    if (e.repeat) return;
    if (k === "b" || k === "x") bomb();
    else if (k === "p" || k === "escape") togglePause();
    else if (k === "enter" || k === " "){
      if (state === "intro" || (state === "over" && !$("over").hidden)) startGame();
      else if (state === "paused") togglePause();
    }
  });
  window.addEventListener("keyup", e => { keys[e.key.toLowerCase()] = false; });
  window.addEventListener("blur", () => { for (const k in keys) keys[k] = false; if (state === "play") togglePause(); });
  document.addEventListener("visibilitychange", () => { if (document.hidden && state === "play") togglePause(); });

  function toLogical(e){
    const r = cv.getBoundingClientRect();
    return {x:(e.clientX - r.left)/r.width*W, y:(e.clientY - r.top)/r.height*H};
  }
  cv.addEventListener("pointerdown", e => {
    if (state !== "play") return;
    e.preventDefault();
    const q = toLogical(e);
    drag = {id:e.pointerId, ox:player.x - q.x, oy:player.y - q.y};
    moveTarget = {x:player.x, y:player.y};
    try { cv.setPointerCapture(e.pointerId); } catch(_) {}
  });
  cv.addEventListener("pointermove", e => {
    if (!drag || e.pointerId !== drag.id) return;
    const q = toLogical(e);
    moveTarget = {x:q.x + drag.ox, y:q.y + drag.oy};
  });
  ["pointerup", "pointercancel"].forEach(ev => cv.addEventListener(ev, e => {
    if (drag && e.pointerId === drag.id){ drag = null; moveTarget = null; }
  }));
  cv.addEventListener("contextmenu", e => e.preventDefault());

  $("bomb").addEventListener("pointerdown", e => { e.preventDefault(); e.stopPropagation(); bomb(); });
  $("bomb").addEventListener("click", e => { if (e.detail === 0) bomb(); }); // klavye ile basılırsa
  $("start").addEventListener("click", startGame);
  $("again").addEventListener("click", startGame);
  $("restart").addEventListener("click", startGame);
  $("resume").addEventListener("click", togglePause);
  $("pause").addEventListener("click", togglePause);

  /* ---------- güncelleme ---------- */
  function update(dt){
    const p = player, sp = speedMul();

    // hareket
    const left = keys.arrowleft || keys.a, right = keys.arrowright || keys.d, up = keys.arrowup || keys.w, down = keys.arrowdown || keys.s;
    let dx = (right ? 1 : 0) - (left ? 1 : 0), dy = (down ? 1 : 0) - (up ? 1 : 0);
    if (dx || dy){ const l = Math.hypot(dx, dy); p.x += dx/l*340*dt; p.y += dy/l*340*dt; }
    if (moveTarget){
      const k = Math.min(1, dt*20);
      dx = clamp((moveTarget.x - p.x)/30, -1, 1);
      p.x += (moveTarget.x - p.x)*k; p.y += (moveTarget.y - p.y)*k;
    }
    p.x = clamp(p.x, 16, W - 16); p.y = clamp(p.y, H*.3, H - 28);
    p.tilt += (dx - p.tilt)*Math.min(1, dt*10);
    p.inv = Math.max(0, p.inv - dt);
    p.shield = Math.max(0, p.shield - dt);

    p.fireCd -= dt;
    if (p.fireCd <= 0){ fire(); p.fireCd = .15; }
    parts.push({x:p.x + rand(-3, 3), y:p.y + 16, vx:rand(-15, 15), vy:rand(120, 200), life:.25, max:.25, color:Math.random() < .5 ? C.flame : C.shot, size:rand(1.5, 3)});

    // dalga yönetimi
    bannerT = Math.max(0, bannerT - dt);
    spawnT -= dt;
    if (spawnT <= 0 && spawnQueue.length){
      spawn(spawnQueue.shift());
      spawnT = Math.max(.35, 1.05 - wave*.05) * rand(.7, 1.3);
    }
    if (bossRef && bossRef.y > 100 && Math.random() < dt*.35) spawn("rock");
    if (!spawnQueue.length && !foes.length && bannerT <= 0){
      waveGap += dt;
      if (waveGap > 1.2){ waveGap = 0; if (!bossWave) sfx.clear(); nextWave(); }
    }

    // düşmanlar
    for (const f of foes){
      f.hitT = Math.max(0, f.hitT - dt);
      if (f.type === "rock" || f.type === "small"){
        f.x += f.vx*dt; f.y += f.vy*dt; f.rot += f.vr*dt;
        if ((f.x < f.r && f.vx < 0) || (f.x > W - f.r && f.vx > 0)) f.vx *= -1;
      } else if (f.type === "fighter"){
        f.life += dt;
        if (f.life < 8){ if (f.y < f.holdY) f.y += f.vy*dt; } else f.y += 170*dt;
        f.x = clamp(f.baseX + Math.sin(f.life*1.4 + f.phase)*70, 20, W - 20);
        f.fireCd -= dt;
        if (f.fireCd <= 0 && f.y > 20 && f.y < H*.65){
          const a = Math.atan2(p.y - f.y, p.x - f.x), s = 210*sp;
          foeShots.push({x:f.x, y:f.y + 10, vx:Math.cos(a)*s, vy:Math.sin(a)*s, r:5});
          f.fireCd = rand(1.5, 2.4)/Math.sqrt(sp);
          sfx.enemyShot();
        }
      } else if (f.type === "diver"){
        f.t += dt;
        if (f.mode === "in"){ f.y += f.vy*dt; if (f.y > 110){ f.mode = "aim"; f.t = 0; } }
        else if (f.mode === "aim"){ f.x += (p.x - f.x)*Math.min(1, dt*3); if (f.t > .6) f.mode = "dive"; }
        else f.y += 470*sp*dt;
      } else if (f.type === "boss"){
        f.t += dt;
        if (f.y < 130) f.y += 60*dt;
        else {
          const rage = f.hp < f.maxHp/2;
          f.x += f.dir*(rage ? 110 : 70)*dt;
          if (f.x > W - 70) f.dir = -1;
          if (f.x < 70) f.dir = 1;
          f.shotA -= dt; f.shotB -= dt;
          if (f.shotA <= 0){
            const n = rage ? 18 : 14;
            for (let i = 0; i < n; i++){ const a = f.t + i*Math.PI*2/n; foeShots.push({x:f.x, y:f.y, vx:Math.cos(a)*150, vy:Math.sin(a)*150, r:6}); }
            f.shotA = rage ? 1.6 : 2.2; sfx.enemyShot();
          }
          if (f.shotB <= 0){
            const a0 = Math.atan2(p.y - f.y, p.x - f.x);
            for (let k = -1; k <= 1; k++){ const a = a0 + k*.18; foeShots.push({x:f.x, y:f.y + 30, vx:Math.cos(a)*240, vy:Math.sin(a)*240, r:5}); }
            f.shotB = rage ? .8 : 1.1;
          }
        }
      }
    }

    // oyuncu mermileri
    for (const b of bullets){
      b.x += b.vx*dt; b.y += b.vy*dt;
      for (const f of foes){
        if (f.hp <= 0 || f.y < -f.r*.5) continue;
        if (hitCircle(b, f, f.r + 4)){
          b.dead = true; damage(f, 1);
          explode(b.x, b.y, 2, C.shot);
          break;
        }
      }
    }
    bullets = bullets.filter(b => !b.dead && b.y > -20 && b.x > -20 && b.x < W + 20);

    // düşman mermileri
    for (const s of foeShots){
      s.x += s.vx*dt; s.y += s.vy*dt;
      if (state === "play" && hitCircle(s, p, p.r + s.r) && p.inv <= 0){ s.dead = true; hurtPlayer(); }
    }
    foeShots = foeShots.filter(s => !s.dead && s.y > -30 && s.y < H + 30 && s.x > -30 && s.x < W + 30);

    // çarpışma
    if (state === "play"){
      for (const f of foes){
        if (f.hp <= 0 || p.inv > 0) continue;
        if (hitCircle(f, p, p.r + f.r*.8)){
          if (hurtPlayer() && f.type !== "boss") damage(f, 3);
          if (state !== "play") break;
        }
      }
    }
    // bölünen göktaşları (bomba ile oluşanlar dahil) burada sahneye katılır
    foes = foes.filter(f => f.hp > 0 && f.y < H + 60).concat(spawned);
    spawned = [];

    // güçlendirmeler
    for (const d of drops){
      d.t += dt; d.y += 90*dt; d.x += Math.sin(d.t*3)*20*dt;
      if (state === "play" && hitCircle(d, p, 28)){ d.dead = true; applyDrop(d); }
    }
    drops = drops.filter(d => !d.dead && d.y < H + 20);

    // çarpan
    if (comboT > 0){ comboT -= dt; if (comboT <= 0){ combo = 0; mult = 1; } }
  }

  function updateAmbient(dt){
    time += dt;
    const speed = state === "play" ? 1 : .4;
    for (const s of stars){ s.y += (30 + 110*s.z)*dt*speed; if (s.y > H){ s.y = -2; s.x = rand(0, W); } }
    for (const q of parts){ q.life -= dt; q.x += q.vx*dt; q.y += q.vy*dt; q.vx *= .98; q.vy *= .98; }
    parts = parts.filter(q => q.life > 0);
    for (const t of texts){ t.t -= dt; t.y -= 30*dt; }
    texts = texts.filter(t => t.t > 0);
    shake = Math.max(0, shake - dt*40);
    flash = Math.max(0, flash - dt*2.5);
  }

  /* ---------- çizim ---------- */
  function shipPath(s){
    ctx.beginPath();
    ctx.moveTo(0, -20*s); ctx.lineTo(16*s, 12*s); ctx.lineTo(6*s, 8*s); ctx.lineTo(0, 14*s); ctx.lineTo(-6*s, 8*s); ctx.lineTo(-16*s, 12*s);
    ctx.closePath();
  }

  function drawPlayer(){
    const p = player;
    const blink = p.inv > 0 && Math.floor(p.inv*12) % 2 === 0;
    if (!blink){
      ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.tilt*.18);
      const fl = 8 + Math.random()*9;
      ctx.fillStyle = C.flame; ctx.beginPath(); ctx.moveTo(-5, 11); ctx.lineTo(5, 11); ctx.lineTo(0, 11 + fl); ctx.closePath(); ctx.fill();
      ctx.fillStyle = C.shot; ctx.beginPath(); ctx.moveTo(-2.5, 11); ctx.lineTo(2.5, 11); ctx.lineTo(0, 11 + fl*.55); ctx.closePath(); ctx.fill();
      shipPath(1); ctx.fillStyle = C.ship; ctx.fill();
      ctx.strokeStyle = "rgba(20,15,46,.5)"; ctx.lineWidth = 1.5; ctx.stroke();
      ctx.fillStyle = C.teal; ctx.beginPath(); ctx.ellipse(0, -4, 3, 6, 0, 0, Math.PI*2); ctx.fill();
      ctx.restore();
    }
    if (p.shield > 0 && !(p.shield < 2 && Math.floor(p.shield*8) % 2 === 0)){
      ctx.strokeStyle = `rgba(61,214,198,${(.55 + .3*Math.sin(time*8)).toFixed(3)})`; ctx.lineWidth = 2.5;
      ctx.beginPath(); ctx.arc(p.x, p.y - 2, 27, 0, Math.PI*2); ctx.stroke();
    }
  }

  function drawFoe(f){
    ctx.save(); ctx.translate(f.x, f.y);
    const white = f.hitT > 0;
    if (f.type === "rock" || f.type === "small"){
      ctx.rotate(f.rot);
      ctx.beginPath();
      f.verts.forEach((m, i) => { const a = i*Math.PI*2/f.verts.length, rr = f.r*m; i ? ctx.lineTo(Math.cos(a)*rr, Math.sin(a)*rr) : ctx.moveTo(Math.cos(a)*rr, Math.sin(a)*rr); });
      ctx.closePath();
      ctx.fillStyle = white ? "#FFFFFF" : C.rockDark; ctx.fill();
      ctx.strokeStyle = C.rock; ctx.lineWidth = 2; ctx.stroke();
      ctx.fillStyle = "rgba(20,15,46,.45)";
      ctx.beginPath(); ctx.arc(f.r*.25, -f.r*.2, f.r*.22, 0, Math.PI*2); ctx.fill();
      ctx.beginPath(); ctx.arc(-f.r*.3, f.r*.3, f.r*.14, 0, Math.PI*2); ctx.fill();
    } else if (f.type === "fighter"){
      ctx.beginPath(); ctx.moveTo(0, 16); ctx.lineTo(17, -10); ctx.lineTo(6, -5); ctx.lineTo(0, -14); ctx.lineTo(-6, -5); ctx.lineTo(-17, -10); ctx.closePath();
      ctx.fillStyle = white ? "#FFFFFF" : C.coral; ctx.fill();
      ctx.fillStyle = C.space; ctx.beginPath(); ctx.arc(0, 0, 3.5, 0, Math.PI*2); ctx.fill();
    } else if (f.type === "diver"){
      if (f.mode === "aim"){
        ctx.strokeStyle = `rgba(255,93,115,${(.35 + .35*Math.sin(f.t*30)).toFixed(3)})`; ctx.lineWidth = 3; ctx.setLineDash([10, 8]);
        ctx.beginPath(); ctx.moveTo(0, 18); ctx.lineTo(0, H); ctx.stroke(); ctx.setLineDash([]);
      }
      ctx.beginPath(); ctx.moveTo(0, 17); ctx.lineTo(11, -2); ctx.lineTo(5, -14); ctx.lineTo(-5, -14); ctx.lineTo(-11, -2); ctx.closePath();
      ctx.fillStyle = white ? "#FFFFFF" : (f.mode === "aim" && Math.sin(f.t*30) > 0 ? C.coral : C.teal); ctx.fill();
      ctx.fillStyle = C.space; ctx.beginPath(); ctx.arc(0, 1, 3, 0, Math.PI*2); ctx.fill();
    } else if (f.type === "boss"){
      const rage = f.hp < f.maxHp/2;
      ctx.beginPath();
      [[-54,-18],[-30,-40],[30,-40],[54,-18],[40,24],[14,40],[-14,40],[-40,24]].forEach(([x, y], i) => i ? ctx.lineTo(x, y) : ctx.moveTo(x, y));
      ctx.closePath();
      ctx.fillStyle = white ? "#3A2E66" : C.hull; ctx.fill();
      ctx.strokeStyle = C.coral; ctx.lineWidth = 3; ctx.stroke();
      ctx.fillStyle = C.coral;
      for (const x of [-34, 34]){ ctx.fillRect(x - 5, 18, 10, 18); }
      const pulse = 10 + Math.sin(time*(rage ? 14 : 6))*3;
      ctx.fillStyle = rage ? C.shot : C.coral;
      ctx.beginPath(); ctx.arc(0, 0, pulse, 0, Math.PI*2); ctx.fill();
      ctx.fillStyle = "#FFFFFF"; ctx.beginPath(); ctx.arc(0, 0, pulse*.4, 0, Math.PI*2); ctx.fill();
    }
    ctx.restore();
  }

  function drawDrop(d){
    const col = DROP_COLORS[d.kind], bob = Math.sin(d.t*5)*1.5;
    ctx.save(); ctx.translate(d.x, d.y + bob);
    ctx.fillStyle = "rgba(20,15,46,.85)"; ctx.beginPath(); ctx.arc(0, 0, 13, 0, Math.PI*2); ctx.fill();
    ctx.strokeStyle = col; ctx.lineWidth = 2; ctx.stroke();
    ctx.fillStyle = col; ctx.strokeStyle = col; ctx.lineWidth = 2.4; ctx.lineCap = "round"; ctx.lineJoin = "round";
    if (d.kind === "weapon"){ ctx.beginPath(); ctx.moveTo(-5, 3); ctx.lineTo(0, -3); ctx.lineTo(5, 3); ctx.stroke(); }
    else if (d.kind === "shield"){ ctx.beginPath(); ctx.arc(0, 2, 5.5, Math.PI, 0); ctx.stroke(); }
    else if (d.kind === "bomb"){ ctx.beginPath(); ctx.arc(0, 0, 4.5, 0, Math.PI*2); ctx.fill(); }
    else { ctx.beginPath(); ctx.moveTo(0, 5); ctx.bezierCurveTo(-7, 0, -4, -6, 0, -2.5); ctx.bezierCurveTo(4, -6, 7, 0, 0, 5); ctx.fill(); }
    ctx.restore();
  }

  function drawHUD(){
    const p = player;
    ctx.textBaseline = "top"; ctx.textAlign = "left";
    ctx.fillStyle = C.muted; ctx.font = `600 11px ${FONT}`; ctx.fillText("SKOR", 16, 14);
    ctx.fillStyle = C.ink; ctx.font = `700 26px ${FONT}`; ctx.fillText(score.toLocaleString("tr-TR"), 16, 25);
    ctx.fillStyle = C.muted; ctx.font = `600 12px ${FONT}`; ctx.fillText("DALGA " + wave, 16, 57);
    if (mult > 1){ ctx.fillStyle = C.shot; ctx.font = `700 16px ${FONT}`; ctx.fillText("x" + mult, 86, 54); }
    if (combo > 0){
      ctx.fillStyle = "rgba(237,231,255,.15)"; ctx.fillRect(16, 76, 80, 3);
      ctx.fillStyle = C.shot; ctx.fillRect(16, 76, 80*clamp(comboT/2, 0, 1), 3);
    }

    for (let i = 0; i < p.lives; i++){
      ctx.save(); ctx.translate(W - 20 - i*22, 26); shipPath(.55); ctx.fillStyle = C.ship; ctx.fill(); ctx.restore();
    }

    ctx.fillStyle = C.muted; ctx.font = `600 11px ${FONT}`; ctx.fillText("SİLAH", 16, H - 36);
    for (let i = 0; i < 4; i++){ ctx.fillStyle = i < p.weapon ? C.shot : "rgba(237,231,255,.18)"; ctx.fillRect(16 + i*14, H - 20, 10, 6); }
    if (p.shield > 0){ ctx.fillStyle = C.teal; ctx.fillText("KALKAN " + Math.ceil(p.shield), 90, H - 36); }

    if (bossRef && bossRef.y > -20){
      const bx = 150, bw = W - 290, by = 30;
      ctx.fillStyle = C.coral; ctx.font = `700 11px ${FONT}`; ctx.textAlign = "center"; ctx.fillText("ANA GEMİ", bx + bw/2, 14);
      ctx.fillStyle = "rgba(237,231,255,.15)"; ctx.fillRect(bx, by, bw, 8);
      ctx.fillStyle = C.coral; ctx.fillRect(bx, by, bw*clamp(bossRef.hp/bossRef.maxHp, 0, 1), 8);
      ctx.textAlign = "left";
    }

    if (bannerT > 0){
      const a = clamp(Math.min(bannerT/.4, (2 - bannerT)/.25), 0, 1);
      ctx.save(); ctx.globalAlpha = a; ctx.textAlign = "center"; ctx.textBaseline = "middle";
      ctx.fillStyle = bannerText === "ANA GEMİ YAKLAŞIYOR" ? C.coral : C.ink;
      ctx.font = `400 28px "Russo One", ${FONT}`;
      ctx.fillText(bannerText, W/2, H*.4);
      ctx.restore();
    }

    ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.font = `700 14px ${FONT}`;
    for (const t of texts){ ctx.globalAlpha = clamp(t.t/.4, 0, 1); ctx.fillStyle = t.color; ctx.fillText(t.txt, t.x, t.y); }
    ctx.globalAlpha = 1; ctx.textAlign = "left"; ctx.textBaseline = "alphabetic";
  }

  function draw(){
    ctx.setTransform(scale, 0, 0, scale, 0, 0);
    ctx.fillStyle = C.space; ctx.fillRect(0, 0, W, H);
    let g = ctx.createRadialGradient(110, 190, 0, 110, 190, 280);
    g.addColorStop(0, "rgba(107,42,122,.35)"); g.addColorStop(1, "rgba(107,42,122,0)");
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    g = ctx.createRadialGradient(390, 540, 0, 390, 540, 320);
    g.addColorStop(0, "rgba(40,80,150,.28)"); g.addColorStop(1, "rgba(40,80,150,0)");
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);

    for (const s of stars){ ctx.fillStyle = `rgba(237,231,255,${(.25 + .6*s.z).toFixed(2)})`; ctx.fillRect(s.x, s.y, s.z*2, s.z*2); }

    if (!player) return;

    ctx.save();
    if (shake > 0 && !RM) ctx.translate(rand(-shake, shake)*.5, rand(-shake, shake)*.5);

    drops.forEach(drawDrop);
    foes.forEach(drawFoe);

    ctx.globalCompositeOperation = "lighter";
    ctx.fillStyle = C.shot;
    for (const b of bullets){ ctx.fillRect(b.x - 1.5, b.y - 7, 3, 14); }
    for (const s of foeShots){
      ctx.fillStyle = "rgba(255,93,115,.35)"; ctx.beginPath(); ctx.arc(s.x, s.y, s.r + 3, 0, Math.PI*2); ctx.fill();
      ctx.fillStyle = C.coral; ctx.beginPath(); ctx.arc(s.x, s.y, s.r, 0, Math.PI*2); ctx.fill();
    }
    for (const q of parts){ ctx.globalAlpha = clamp(q.life/q.max, 0, 1); ctx.fillStyle = q.color; ctx.fillRect(q.x - q.size/2, q.y - q.size/2, q.size, q.size); }
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = "source-over";

    if (state !== "over") drawPlayer();
    ctx.restore();

    if (flash > 0){ ctx.fillStyle = `rgba(255,240,220,${(flash*.55).toFixed(3)})`; ctx.fillRect(0, 0, W, H); }
    drawHUD();
  }

  /* ---------- boyut ve döngü ---------- */
  function resize(){
    const r = stage.getBoundingClientRect();
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    cv.width = Math.max(1, Math.round(r.width*dpr));
    cv.height = Math.max(1, Math.round(r.height*dpr));
    scale = cv.width/W;
  }
  if ("ResizeObserver" in window) new ResizeObserver(resize).observe(stage);
  else window.addEventListener("resize", resize);
  resize();

  function frame(now){
    const dt = Math.min(.05, (now - last)/1000); last = now;
    if (state === "play") update(dt);
    if (state !== "paused") updateAmbient(dt);
    draw();
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
})();
