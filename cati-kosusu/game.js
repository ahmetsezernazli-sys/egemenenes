/* Çatı Koşusu — Enes için sonsuz koşu oyunu */
(function(){
  "use strict";

  const W = 960, H = 540, PX = 190;
  const GRAV = 2300, JUMP = 820, DJUMP = 720, CUT = 320, COYOTE = .09;
  const STAND_H = 64, SLIDE_H = 30, PW = 30;
  const BEST_KEY = "cati-kosusu-rekor", SOUND_KEY = "cati-kosusu-ses";
  const RM = window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches;
  const FONT = '"Bungee", "Arial Black", sans-serif';

  const $ = id => document.getElementById(id);
  const stage = $("stage"), cv = $("cv"), ctx = cv.getContext("2d");
  const rand = (a, b) => a + Math.random()*(b - a);
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

  let best = 0;
  try { best = +localStorage.getItem(BEST_KEY) || 0; } catch(e) {}
  let soundOn = true;
  try { soundOn = localStorage.getItem(SOUND_KEY) !== "0"; } catch(e) {}

  let phase = "intro"; // intro | play | paused | over
  let P, plats, crates, signs, coins, shields, parts, speed, distPx, coinCount, time = 0, lastGround = 0, jumpHeld = false, flash = 0, shake = 0;
  let farX = 0, midX = 0;

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
  const sfx = {
    jump(){ tone(420, .14, "square", .05, 760); },
    djump(){ tone(620, .14, "square", .05, 1100); },
    land(){ tone(140, .06, "sine", .08); },
    slide(){ tone(300, .2, "sawtooth", .03, 150); },
    coin(){ tone(1320, .07, "square", .04); tone(1760, .1, "square", .04, null, .05); },
    shield(){ tone(660, .12, "triangle", .1); tone(990, .2, "triangle", .1, null, .1); },
    block(){ tone(880, .2, "sine", .1, 300); },
    crash(){ tone(200, .5, "sawtooth", .1, 60); },
    record(){ [523.25, 659.25, 783.99, 1046.5].forEach((f, i) => tone(f, .2, "triangle", .12, null, i*.1)); }
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

  /* ---------- dünya ---------- */
  const meters = () => Math.floor(distPx/40);
  const gapMax = () => Math.min(speed*.58, 330);

  function reset(){
    P = {y:400, vy:0, grounded:true, jumps:0, slideT:0, shield:false, run:0};
    plats = []; crates = []; signs = []; coins = []; shields = []; parts = [];
    speed = 360; distPx = 0; coinCount = 0; flash = 0; shake = 0; lastGround = 0;
    plats.push({x:-40, w:1100, y:400, seed:Math.random()*1000});
    fill();
  }

  function fill(){
    while (plats[plats.length - 1].x + plats[plats.length - 1].w < W + 500) spawnPlatform();
  }

  function spawnPlatform(){
    const prev = plats[plats.length - 1];
    const m = meters();
    const gap = rand(90, Math.max(110, gapMax()));
    const y = clamp(prev.y + rand(-80, 110), 300, 460);
    const w = rand(280 + speed*.25, 520 + speed*.45);
    const x = prev.x + prev.w + gap;
    const p = {x, w, y, seed:Math.random()*1000};
    plats.push(p);

    // boşluğun üstünde altın kavisi
    if (Math.random() < .45){
      const x0 = prev.x + prev.w, n = 5;
      for (let i = 0; i < n; i++){
        const u = (i + .5)/n, cx = x0 + gap*u, cy = Math.min(prev.y, y) - 70 - Math.sin(Math.PI*u)*70;
        coins.push({x:cx, y:cy});
      }
    }

    // engeller çatının başına çok yakın konmaz: inen oyuncunun tepki verecek zamanı olsun
    const safe = Math.max(190, speed*.55);
    const busy = [];
    if (m > 80 && w - 110 > safe + 20 && Math.random() < .65){
      const cxp = x + rand(safe, w - 110);
      crates.push({x:cxp, y:y - 40, w:40, h:40});
      busy.push(cxp);
    }
    if (m > 250 && w - 150 > safe + 20 && Math.random() < .4){
      const sx = x + rand(safe, w - 150);
      if (busy.every(b => Math.abs(b - sx) > 220)){ signs.push({x:sx, w:44, bottom:y - 44}); busy.push(sx); }
    }
    if (Math.random() < .5){
      const start = x + rand(40, 120);
      for (let i = 0; i < 5; i++){
        const cx = start + i*42;
        if (cx > x + w - 30) break;
        if (busy.some(b => Math.abs(b - cx) < 80)) continue;
        coins.push({x:cx, y:y - 38});
      }
    }
    if (m > 150 && Math.random() < .07 && !P.shield){
      shields.push({x:x + rand(60, w - 60), y:y - 70});
    }
  }

  /* ---------- kontroller ---------- */
  function pressJump(){
    if (phase !== "play") return;
    jumpHeld = true;
    if (P.slideT > 0) P.slideT = 0;
    if (P.grounded || time - lastGround < COYOTE && P.jumps === 0){
      P.vy = -JUMP; P.grounded = false; P.jumps = 1; sfx.jump(); dust(PX, P.y, 6);
    } else if (P.jumps < 2){
      P.vy = -DJUMP; P.jumps = 2; sfx.djump(); dust(PX, P.y, 8);
    }
  }
  function releaseJump(){
    jumpHeld = false;
    if (P && P.vy < -CUT) P.vy = -CUT;
  }
  function pressSlide(){
    if (phase !== "play") return;
    if (P.grounded){ if (P.slideT <= 0) sfx.slide(); P.slideT = .7; }
    else P.vy = Math.max(P.vy, 900);
  }

  window.addEventListener("keydown", e => {
    const k = e.key.toLowerCase();
    if ([" ", "arrowup", "arrowdown", "w", "s"].includes(k) && phase === "play") e.preventDefault();
    if (e.repeat) return;
    if (k === " " || k === "arrowup" || k === "w"){
      if (phase === "intro" || phase === "over"){ e.preventDefault(); if (phase === "intro" || !$("over").hidden) start(); return; }
      pressJump();
    } else if (k === "arrowdown" || k === "s") pressSlide();
    else if (k === "p" || k === "escape") togglePause();
    else if (k === "enter" && (phase === "intro" || (phase === "over" && !$("over").hidden))){ e.preventDefault(); start(); }
  });
  window.addEventListener("keyup", e => {
    const k = e.key.toLowerCase();
    if (k === " " || k === "arrowup" || k === "w") releaseJump();
  });

  let swipe = null;
  // dokununca hemen zıplar (basılı tutunca daha yükseğe), aşağı kaydırınca kayar
  cv.addEventListener("pointerdown", e => {
    e.preventDefault(); audio();
    swipe = {id:e.pointerId, y:e.clientY, fired:false};
    try { cv.setPointerCapture(e.pointerId); } catch(_) {}
    pressJump();
  });
  cv.addEventListener("pointermove", e => {
    if (!swipe || swipe.id !== e.pointerId || swipe.fired) return;
    if (e.clientY - swipe.y > 34){ swipe.fired = true; releaseJump(); pressSlide(); }
  });
  ["pointerup", "pointercancel"].forEach(ev => cv.addEventListener(ev, e => {
    if (!swipe || swipe.id !== e.pointerId) return;
    releaseJump(); swipe = null;
  }));

  $("t-jump").addEventListener("pointerdown", e => { e.preventDefault(); audio(); pressJump(); });
  ["pointerup", "pointercancel", "pointerleave"].forEach(ev => $("t-jump").addEventListener(ev, releaseJump));
  $("t-slide").addEventListener("pointerdown", e => { e.preventDefault(); audio(); pressSlide(); });
  if (window.matchMedia && matchMedia("(pointer: coarse)").matches) $("touch").hidden = false;

  function start(){
    audio();
    reset();
    phase = "play";
    ["intro", "over", "paused"].forEach(id => { $(id).hidden = true; });
    if (document.activeElement && document.activeElement.blur) document.activeElement.blur();
  }
  function togglePause(){
    if (phase === "play"){ phase = "paused"; $("paused").hidden = false; $("resume").focus({preventScroll:true}); }
    else if (phase === "paused"){ phase = "play"; $("paused").hidden = true; last = performance.now(); }
  }
  $("start").addEventListener("click", start);
  $("again").addEventListener("click", start);
  $("resume").addEventListener("click", togglePause);
  $("pause").addEventListener("click", togglePause);
  window.addEventListener("blur", () => { if (phase === "play") togglePause(); });
  document.addEventListener("visibilitychange", () => { if (document.hidden && phase === "play") togglePause(); });

  function gameOver(reason){
    phase = "over";
    sfx.crash(); shake = 16; flash = .6;
    dust(PX, P.y - 20, 24, "#FFB86B");
    const m = meters(), score = m + coinCount*10, isBest = m > best;
    if (isBest){ best = m; try { localStorage.setItem(BEST_KEY, String(best)); } catch(e) {} }
    $("over-title").textContent = isBest && m > 0 ? "Yeni rekor!" : reason === "fall" ? "Düştün!" : "Çarptın!";
    $("r-dist").textContent = m.toLocaleString("tr-TR") + " m";
    $("r-coins").textContent = coinCount;
    $("r-score").textContent = score.toLocaleString("tr-TR");
    $("r-best").innerHTML = `Rekor: <b>${best.toLocaleString("tr-TR")} m</b>`;
    $("intro-best").textContent = best.toLocaleString("tr-TR") + " m";
    if (isBest && m > 0) setTimeout(sfx.record, 500);
    setTimeout(() => { if (phase === "over"){ $("over").hidden = false; $("again").focus({preventScroll:true}); } }, 700);
  }

  function dust(x, y, n, color){
    if (RM) return;
    for (let i = 0; i < n; i++) parts.push({x, y, vx:rand(-160, 60), vy:rand(-160, -20), life:rand(.3, .6), max:.6, c:color || "rgba(255,244,230,.7)", r:rand(2, 4)});
  }

  /* ---------- güncelleme ---------- */
  function update(dt){
    time += dt;
    const m = meters();
    speed = Math.min(860, 360 + m*.6);
    const dx = speed*dt;
    distPx += dx;
    farX += dx*.15; midX += dx*.4;

    for (const arr of [plats, crates, signs, coins, shields]) for (const o of arr) o.x -= dx;
    plats = plats.filter(p => p.x + p.w > -60);
    crates = crates.filter(c => c.x + c.w > -60);
    signs = signs.filter(s => s.x + s.w > -60);
    coins = coins.filter(c => c.x > -40 && !c.taken);
    shields = shields.filter(s => s.x > -40 && !s.taken);
    fill();

    // oyuncu
    const prevFeet = P.y;
    P.slideT = Math.max(0, P.slideT - dt);
    P.vy += GRAV*dt;
    P.y += P.vy*dt;
    P.run += dt*speed/40;
    const wasGrounded = P.grounded;
    P.grounded = false;
    // kasaların üstüne de basılabilir
    const floors = plats.concat(crates.filter(c => !c.hit).map(c => ({x:c.x, w:c.w, y:c.y})));
    for (const p of floors){
      if (PX + PW*.3 < p.x || PX - PW*.3 > p.x + p.w) continue;
      if (P.vy >= 0 && prevFeet <= p.y + 4 && P.y >= p.y){
        P.y = p.y; P.vy = 0; P.grounded = true; P.jumps = 0; lastGround = time;
        if (!wasGrounded){ sfx.land(); dust(PX, P.y, 5); }
      }
    }
    // binanın duvarına çarpma: çatı hizasının altında bir binanın üstündeyse
    for (const p of plats){
      if (PX + PW/2 < p.x || PX - PW/2 > p.x + p.w) continue;
      if (P.y > p.y + 16){ gameOver("crash"); return; }
    }
    if (P.y > H + 80){ gameOver("fall"); return; }

    const h = P.slideT > 0 && P.grounded ? SLIDE_H : STAND_H;
    const left = PX - PW/2, right = PX + PW/2, top = P.y - h, bottom = P.y;

    for (const c of crates){
      if (c.hit) continue;
      // sadece önden çarpma sayılır, üstüne basmak serbest
      if (right - 4 > c.x && left + 4 < c.x + c.w && bottom > c.y + 12 && top < c.y + c.h){
        if (P.shield){ P.shield = false; c.hit = true; sfx.block(); flash = .3; dust(c.x + 20, c.y + 20, 16, "#C98B4E"); }
        else { gameOver("crash"); return; }
      }
    }
    for (const s of signs){
      if (s.hit) continue;
      if (right - 4 > s.x && left + 4 < s.x + s.w && top < s.bottom){
        if (P.shield){ P.shield = false; s.hit = true; sfx.block(); flash = .3; }
        else { gameOver("crash"); return; }
      }
    }
    for (const c of coins){
      if (Math.abs(c.x - PX) < 26 && c.y > top - 16 && c.y < bottom + 10){ c.taken = true; coinCount++; sfx.coin(); dust(c.x, c.y, 4, "#FFD23F"); }
    }
    for (const s of shields){
      if (Math.abs(s.x - PX) < 30 && s.y > top - 20 && s.y < bottom + 10){ s.taken = true; P.shield = true; sfx.shield(); }
    }

    for (const q of parts){ q.life -= dt; q.x += (q.vx - speed*.4)*dt; q.y += q.vy*dt; q.vy += 500*dt; }
    parts = parts.filter(q => q.life > 0);
    flash = Math.max(0, flash - dt*2);
    shake = Math.max(0, shake - dt*40);
  }

  function updateIdle(dt){
    time += dt;
    farX += dt*40; midX += dt*90;
    for (const q of parts){ q.life -= dt; q.x += q.vx*dt; q.y += q.vy*dt; q.vy += 500*dt; }
    parts = parts ? parts.filter(q => q.life > 0) : [];
    flash = Math.max(0, flash - dt*2);
    shake = Math.max(0, shake - dt*40);
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

  function hash(n){ const x = Math.sin(n*127.1)*43758.5453; return x - Math.floor(x); }

  function skyline(offset, base, color, minH, maxH, wBase, windows){
    const span = 2000;
    const o = offset % span;
    ctx.fillStyle = color;
    for (let k = -1; k < 2; k++){
      let x = k*span - o;
      let i = 0;
      while (x < k*span - o + span){
        const bw = wBase + hash(i*3.1 + wBase)*wBase, bh = minH + hash(i*7.7 + minH)*(maxH - minH);
        if (x + bw > -20 && x < W + 20){
          ctx.fillRect(x, base - bh, bw - 6, bh + 300);
          if (windows){
            ctx.fillStyle = "rgba(255,210,140,.35)";
            for (let wy = base - bh + 14; wy < base - 10; wy += 22) for (let wx = x + 8; wx < x + bw - 16; wx += 16){ if (hash(wx*.13 + wy*.71 + i) > .62) ctx.fillRect(wx, wy, 6, 9); }
            ctx.fillStyle = color;
          }
        }
        x += bw; i++;
      }
    }
  }

  function drawPlatform(p){
    ctx.fillStyle = "#241C38"; ctx.fillRect(p.x, p.y, p.w, H - p.y + 20);
    ctx.fillStyle = "#1A1429"; ctx.fillRect(p.x + p.w - 10, p.y, 10, H - p.y + 20);
    ctx.fillStyle = "rgba(255,210,140,.22)";
    for (let wy = p.y + 30; wy < H; wy += 34){
      for (let wx = p.x + 18; wx < p.x + p.w - 26; wx += 30){ if (hash(p.seed + wx*.07 - p.x*.07 + wy*.3) > .55) ctx.fillRect(wx, wy, 12, 16); }
    }
    ctx.fillStyle = "#FFB86B"; ctx.fillRect(p.x, p.y - 4, p.w, 6);
    ctx.fillStyle = "#3A2E56"; ctx.fillRect(p.x, p.y + 2, p.w, 8);
  }

  function drawPlayer(){
    const sliding = P.slideT > 0 && P.grounded;
    const x = PX, y = P.y;
    ctx.save();
    ctx.lineCap = "round"; ctx.lineJoin = "round";
    if (sliding){
      ctx.strokeStyle = "#2A2140"; ctx.lineWidth = 7;
      ctx.beginPath(); ctx.moveTo(x - 6, y - 8); ctx.lineTo(x + 18, y - 4); ctx.stroke();
      ctx.fillStyle = "#3ED3C4"; ctx.beginPath(); ctx.ellipse(x - 8, y - 16, 18, 9, -.15, 0, Math.PI*2); ctx.fill();
      ctx.fillStyle = "#FFD9B3"; ctx.beginPath(); ctx.arc(x - 28, y - 22, 9, 0, Math.PI*2); ctx.fill();
      ctx.fillStyle = "#FF6B5A"; ctx.beginPath(); ctx.arc(x - 29, y - 25, 9, Math.PI, Math.PI*2); ctx.fill();
    } else {
      const air = !P.grounded, ph = P.run*1.6;
      const legA = air ? .7 : Math.sin(ph)*.9, legB = air ? -.3 : -Math.sin(ph)*.9;
      ctx.strokeStyle = "#2A2140"; ctx.lineWidth = 7;
      const hip = [x, y - 26];
      for (const a of [legA, legB]){
        const kx = hip[0] + Math.sin(a)*14, ky = hip[1] + Math.cos(a)*12;
        ctx.beginPath(); ctx.moveTo(hip[0], hip[1]); ctx.lineTo(kx, ky); ctx.lineTo(kx - (air ? 8 : Math.abs(Math.sin(a))*6), y - 2); ctx.stroke();
      }
      ctx.fillStyle = "#3ED3C4";
      ctx.beginPath(); ctx.moveTo(x - 11, y - 54); ctx.lineTo(x + 11, y - 54); ctx.lineTo(x + 9, y - 24); ctx.lineTo(x - 9, y - 24); ctx.closePath(); ctx.fill();
      ctx.strokeStyle = "#2BA99C"; ctx.lineWidth = 6;
      const arm = air ? -1.2 : Math.sin(ph + Math.PI)*.9;
      ctx.beginPath(); ctx.moveTo(x, y - 48); ctx.lineTo(x + Math.sin(arm)*16, y - 48 + Math.cos(arm)*14); ctx.stroke();
      ctx.fillStyle = "#FFD9B3"; ctx.beginPath(); ctx.arc(x + 2, y - 64, 10, 0, Math.PI*2); ctx.fill();
      ctx.fillStyle = "#FF6B5A"; ctx.beginPath(); ctx.arc(x + 1, y - 67, 10, Math.PI, Math.PI*2); ctx.fill();
      ctx.fillRect(x + 1, y - 69, 14, 4);
    }
    if (P.shield){
      ctx.strokeStyle = `rgba(62,211,196,${(.55 + .3*Math.sin(time*8)).toFixed(2)})`; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.arc(x, y - (sliding ? 16 : 34), sliding ? 30 : 44, 0, Math.PI*2); ctx.stroke();
    }
    ctx.restore();
  }

  function drawCoin(c){
    const sx = Math.abs(Math.cos(time*5 + c.x*.02));
    ctx.fillStyle = "#FFD23F"; ctx.beginPath(); ctx.ellipse(c.x, c.y, 10*Math.max(.25, sx), 10, 0, 0, Math.PI*2); ctx.fill();
    ctx.strokeStyle = "#D99A00"; ctx.lineWidth = 2; ctx.stroke();
  }

  function draw(){
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = "#1C1630"; ctx.fillRect(0, 0, cv.width, cv.height);
    const sk = view.dpr*view.s;
    const shx = shake > 0 && !RM ? rand(-shake, shake)*.4 : 0, shy = shake > 0 && !RM ? rand(-shake, shake)*.4 : 0;
    ctx.setTransform(sk, 0, 0, sk, view.dpr*view.ox + shx*sk, view.dpr*view.oy + shy*sk);
    ctx.save(); ctx.beginPath(); ctx.rect(0, 0, W, H); ctx.clip();

    const g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, "#5B3F8C"); g.addColorStop(.55, "#F08A6C"); g.addColorStop(1, "#FFC78F");
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = "rgba(255,236,190,.9)"; ctx.beginPath(); ctx.arc(720, 250, 70, 0, Math.PI*2); ctx.fill();
    skyline(farX, 360, "#8A5A8E", 60, 180, 70, false);
    skyline(midX, 430, "#4A3566", 80, 220, 90, true);

    if (P){
      plats.forEach(drawPlatform);
      for (const s of signs){
        ctx.strokeStyle = "#1A1429"; ctx.lineWidth = 4;
        ctx.beginPath(); ctx.moveTo(s.x + s.w/2, 0); ctx.lineTo(s.x + s.w/2, s.bottom - 60); ctx.stroke();
        ctx.fillStyle = s.hit ? "rgba(255,255,255,.3)" : "#E5484D"; ctx.fillRect(s.x - 20, s.bottom - 60, s.w + 40, 60);
        ctx.fillStyle = "#FFF4E6";
        for (let k = 0; k < 4; k++) ctx.fillRect(s.x - 16 + k*22, s.bottom - 52, 10, 44);
      }
      for (const c of crates){
        if (c.hit) continue;
        ctx.fillStyle = "#C98B4E"; ctx.fillRect(c.x, c.y, c.w, c.h);
        ctx.strokeStyle = "#7E5230"; ctx.lineWidth = 4; ctx.strokeRect(c.x + 2, c.y + 2, c.w - 4, c.h - 4);
        ctx.beginPath(); ctx.moveTo(c.x + 4, c.y + 4); ctx.lineTo(c.x + c.w - 4, c.y + c.h - 4); ctx.moveTo(c.x + c.w - 4, c.y + 4); ctx.lineTo(c.x + 4, c.y + c.h - 4); ctx.stroke();
      }
      coins.forEach(drawCoin);
      for (const s of shields){
        const bob = Math.sin(time*4)*4;
        ctx.fillStyle = "#3ED3C4"; ctx.beginPath(); ctx.moveTo(s.x, s.y - 16 + bob); ctx.lineTo(s.x + 14, s.y - 10 + bob); ctx.lineTo(s.x + 12, s.y + 6 + bob); ctx.lineTo(s.x, s.y + 16 + bob); ctx.lineTo(s.x - 12, s.y + 6 + bob); ctx.lineTo(s.x - 14, s.y - 10 + bob); ctx.closePath(); ctx.fill();
        ctx.strokeStyle = "#FFF4E6"; ctx.lineWidth = 2; ctx.stroke();
      }
      if (phase !== "over" || shake > 0) drawPlayer();
      for (const q of parts){ ctx.globalAlpha = clamp(q.life/q.max, 0, 1); ctx.fillStyle = q.c; ctx.beginPath(); ctx.arc(q.x, q.y, q.r, 0, Math.PI*2); ctx.fill(); }
      ctx.globalAlpha = 1;

      // gösterge
      ctx.fillStyle = "rgba(28,22,48,.45)"; ctx.fillRect(14, 12, 230, 50);
      ctx.fillStyle = "#FFF4E6"; ctx.font = `400 26px ${FONT}`; ctx.textBaseline = "middle"; ctx.textAlign = "left";
      ctx.fillText(meters().toLocaleString("tr-TR") + " m", 26, 38);
      ctx.fillStyle = "#FFD23F"; ctx.beginPath(); ctx.arc(176, 37, 10, 0, Math.PI*2); ctx.fill();
      ctx.fillStyle = "#FFF4E6"; ctx.font = `400 20px ${FONT}`; ctx.fillText(String(coinCount), 194, 38);
      ctx.textAlign = "right"; ctx.font = `400 16px ${FONT}`; ctx.fillStyle = "rgba(255,244,230,.85)";
      ctx.fillText("REKOR " + best.toLocaleString("tr-TR") + " m", W - 20, 36);
      if (P.shield){ ctx.fillStyle = "#3ED3C4"; ctx.fillText("KALKAN", W - 20, 62); }
    }
    if (flash > 0){ ctx.fillStyle = `rgba(255,244,230,${(flash*.6).toFixed(2)})`; ctx.fillRect(0, 0, W, H); }
    ctx.restore();
  }

  let last = performance.now();
  function frame(now){
    const dt = Math.min(.033, (now - last)/1000); last = now;
    if (phase === "play") update(dt); else if (phase !== "paused") updateIdle(dt);
    draw();
    requestAnimationFrame(frame);
  }

  if ("ResizeObserver" in window) new ResizeObserver(resize).observe(stage);
  else window.addEventListener("resize", resize);
  resize();
  $("intro-best").textContent = best.toLocaleString("tr-TR") + " m";
  parts = [];
  // açılışta arka planda boş bir çatı görünsün
  reset();
  requestAnimationFrame(frame);
})();
