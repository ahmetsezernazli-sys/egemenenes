/* Blok Yağmuru — düşen bloklar */
(function(){
  "use strict";

  const COLS = 10, ROWS = 22, HIDDEN = 2;       // üstteki 2 sıra görünmez
  const SHAPES = {
    I:[[0,0,0,0],[1,1,1,1],[0,0,0,0],[0,0,0,0]],
    J:[[1,0,0],[1,1,1],[0,0,0]],
    L:[[0,0,1],[1,1,1],[0,0,0]],
    O:[[1,1],[1,1]],
    S:[[0,1,1],[1,1,0],[0,0,0]],
    T:[[0,1,0],[1,1,1],[0,0,0]],
    Z:[[1,1,0],[0,1,1],[0,0,0]]
  };
  const COLORS = {I:"#3ED6E8", J:"#4C7DFF", L:"#FF9A3D", O:"#FFD23F", S:"#4FD17A", T:"#A06BFF", Z:"#FF5A6E"};
  // SRS duvar sekmeleri (x sağa, y yukarı pozitif)
  const KICKS = {
    "0>1":[[0,0],[-1,0],[-1,1],[0,-2],[-1,-2]], "1>0":[[0,0],[1,0],[1,-1],[0,2],[1,2]],
    "1>2":[[0,0],[1,0],[1,-1],[0,2],[1,2]],     "2>1":[[0,0],[-1,0],[-1,1],[0,-2],[-1,-2]],
    "2>3":[[0,0],[1,0],[1,1],[0,-2],[1,-2]],    "3>2":[[0,0],[-1,0],[-1,-1],[0,2],[-1,2]],
    "3>0":[[0,0],[-1,0],[-1,-1],[0,2],[-1,2]],  "0>3":[[0,0],[1,0],[1,1],[0,-2],[1,-2]]
  };
  const KICKS_I = {
    "0>1":[[0,0],[-2,0],[1,0],[-2,-1],[1,2]], "1>0":[[0,0],[2,0],[-1,0],[2,1],[-1,-2]],
    "1>2":[[0,0],[-1,0],[2,0],[-1,2],[2,-1]], "2>1":[[0,0],[1,0],[-2,0],[1,-2],[-2,1]],
    "2>3":[[0,0],[2,0],[-1,0],[2,1],[-1,-2]], "3>2":[[0,0],[-2,0],[1,0],[-2,-1],[1,2]],
    "3>0":[[0,0],[1,0],[-2,0],[1,-2],[-2,1]], "0>3":[[0,0],[-1,0],[2,0],[-1,2],[2,-1]]
  };
  const LINE_SCORE = [0, 100, 300, 500, 800];
  const LOCK_DELAY = .5, MAX_RESETS = 15, DAS = .17, ARR = .05;
  const BEST_KEY = "blok-yagmuru-rekor", SOUND_KEY = "blok-yagmuru-ses";
  const RM = window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches;

  const $ = id => document.getElementById(id);
  const cv = $("board"), ctx = cv.getContext("2d");
  const holdCv = $("hold"), hctx = holdCv.getContext("2d");
  const nextCv = $("next"), nctx = nextCv.getContext("2d");

  let best = 0;
  try { best = +localStorage.getItem(BEST_KEY) || 0; } catch(e) {}
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
    g.gain.setValueAtTime(.0001, n); g.gain.exponentialRampToValueAtTime(vol || .1, n + .006); g.gain.exponentialRampToValueAtTime(.0001, n + dur);
    o.connect(g).connect(a.destination); o.start(n); o.stop(n + dur + .05);
  }
  const sfx = {
    move(){ tone(300, .03, "square", .02); },
    rotate(){ tone(520, .05, "triangle", .05, 700); },
    lock(){ tone(160, .08, "sine", .1, 110); },
    hard(){ tone(220, .12, "square", .06, 80); },
    clear(n){ const base = [0, 523.25, 587.33, 659.25, 783.99][n]; for (let i = 0; i < n + 1; i++) tone(base*(1 + i*.25), .14, "triangle", .12, null, i*.06); },
    level(){ [659.25, 880, 1174.66].forEach((f, i) => tone(f, .15, "square", .05, null, i*.09)); },
    hold(){ tone(440, .06, "sine", .06, 660); },
    over(){ tone(330, .5, "sawtooth", .08, 110); }
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

  /* ---------- durum ---------- */
  let grid, cur, holdType, holdUsed, queue, bag, score, lines, level, phase = "intro";
  let fallT = 0, lockT = 0, resets = 0, clearing = null, flash = 0;

  const emptyRow = () => new Array(COLS).fill(null);
  function rotateCW(m){ const n = m.length; return m.map((row, r) => row.map((_, c) => m[n - 1 - c][r])); }
  function shapeOf(type, rot){ let m = SHAPES[type]; for (let i = 0; i < rot; i++) m = rotateCW(m); return m; }

  function refillBag(){
    const b = Object.keys(SHAPES);
    for (let i = b.length - 1; i > 0; i--){ const j = Math.random()*(i + 1) | 0; [b[i], b[j]] = [b[j], b[i]]; }
    bag.push(...b);
  }
  function takeNext(){
    while (queue.length < 4){ if (!bag.length) refillBag(); queue.push(bag.shift()); }
    const t = queue.shift();
    while (queue.length < 3){ if (!bag.length) refillBag(); queue.push(bag.shift()); }
    return t;
  }

  function collides(type, rot, x, y){
    const m = shapeOf(type, rot);
    for (let r = 0; r < m.length; r++) for (let c = 0; c < m.length; c++){
      if (!m[r][c]) continue;
      const gx = x + c, gy = y + r;
      if (gx < 0 || gx >= COLS || gy >= ROWS) return true;
      if (gy >= 0 && grid[gy][gx]) return true;
    }
    return false;
  }

  function spawn(type){
    const x = type === "O" ? 4 : 3, y = 0;
    cur = {type, rot:0, x, y};
    fallT = 0; lockT = 0; resets = 0;
    if (collides(type, 0, x, y)){ gameOver(); return false; }
    return true;
  }

  function reset(){
    grid = Array.from({length:ROWS}, emptyRow);
    queue = []; bag = [];
    holdType = null; holdUsed = false;
    score = 0; lines = 0; level = 1; clearing = null; flash = 0;
    spawn(takeNext());
    renderSide();
  }

  const gravity = () => Math.max(.03, Math.pow(.8 - (level - 1)*.007, level - 1));
  const grounded = () => collides(cur.type, cur.rot, cur.x, cur.y + 1);

  function move(dx){
    if (!cur || clearing) return false;
    if (collides(cur.type, cur.rot, cur.x + dx, cur.y)) return false;
    cur.x += dx; sfx.move(); touchLock();
    return true;
  }
  function rotate(dir){
    if (!cur || clearing || cur.type === "O") return false;
    const from = cur.rot, to = (from + (dir > 0 ? 1 : 3)) % 4;
    const table = (cur.type === "I" ? KICKS_I : KICKS)[`${from}>${to}`];
    for (const [kx, ky] of table){
      if (!collides(cur.type, to, cur.x + kx, cur.y - ky)){
        cur.rot = to; cur.x += kx; cur.y -= ky; sfx.rotate(); touchLock();
        return true;
      }
    }
    return false;
  }
  function touchLock(){ if (grounded() && resets < MAX_RESETS){ lockT = 0; resets++; } }

  function softDrop(){
    if (!cur || clearing) return;
    if (!grounded()){ cur.y++; score += 1; fallT = 0; }
  }
  function hardDrop(){
    if (!cur || clearing) return;
    let d = 0;
    while (!grounded()){ cur.y++; d++; }
    score += d*2;
    sfx.hard();
    lock();
  }
  function hold(){
    if (!cur || clearing || holdUsed) return;
    const t = cur.type;
    holdUsed = true; sfx.hold();
    if (holdType){ const h = holdType; holdType = t; spawn(h); }
    else { holdType = t; spawn(takeNext()); }
    renderSide();
  }

  function lock(){
    const m = shapeOf(cur.type, cur.rot);
    let above = true;
    for (let r = 0; r < m.length; r++) for (let c = 0; c < m.length; c++){
      if (!m[r][c]) continue;
      const gy = cur.y + r;
      if (gy >= 0) grid[gy][cur.x + c] = cur.type;
      if (gy >= HIDDEN) above = false;
    }
    cur = null;
    sfx.lock();
    if (above){ gameOver(); return; }
    const full = [];
    for (let r = 0; r < ROWS; r++) if (grid[r].every(Boolean)) full.push(r);
    if (full.length){
      clearing = {rows:full, t:RM ? 0 : .22};
      sfx.clear(Math.min(4, full.length));
    } else finishLock(0);
  }
  function finishLock(n){
    if (n){
      const before = level;
      lines += n;
      score += LINE_SCORE[Math.min(4, n)]*level;
      level = 1 + Math.floor(lines/10);
      if (level > before) sfx.level();
      flash = .25;
    }
    holdUsed = false;
    spawn(takeNext());
    renderSide();
  }
  function clearRows(){
    const rows = clearing.rows;
    grid = grid.filter((_, r) => !rows.includes(r));
    while (grid.length < ROWS) grid.unshift(emptyRow());
    clearing = null;
    finishLock(rows.length);
  }

  function gameOver(){
    phase = "over"; cur = null;
    sfx.over();
    const isBest = score > best;
    if (isBest){ best = score; try { localStorage.setItem(BEST_KEY, String(best)); } catch(e) {} }
    $("over-title").textContent = isBest && score > 0 ? "Yeni rekor!" : "Oyun bitti";
    $("over-score").textContent = score.toLocaleString("tr-TR");
    $("over-lines").textContent = lines;
    renderSide();
    setTimeout(() => { if (phase === "over"){ $("over").hidden = false; $("again").focus({preventScroll:true}); } }, 600);
  }

  /* ---------- güncelleme ---------- */
  const held = {left:false, right:false, soft:false};
  let dasT = 0, arrT = 0, lastDir = 0, softT = 0;

  function update(dt){
    flash = Math.max(0, flash - dt);
    if (clearing){ clearing.t -= dt; if (clearing.t <= 0) clearRows(); return; }
    if (!cur) return;

    // basılı tutulan yön tuşu: gecikme sonra tekrar
    const dir = held.left && !held.right ? -1 : held.right && !held.left ? 1 : 0;
    if (dir !== lastDir){ lastDir = dir; dasT = 0; arrT = 0; }
    else if (dir){
      dasT += dt;
      if (dasT >= DAS){ arrT += dt; while (arrT >= ARR){ arrT -= ARR; if (!move(dir)) break; } }
    }
    if (held.soft){ softT += dt; while (softT >= .035 && cur){ softT -= .035; softDrop(); } }
    if (!cur) return;

    if (grounded()){
      lockT += dt;
      if (lockT >= LOCK_DELAY){ lock(); return; }
    } else {
      lockT = 0;
      fallT += dt;
      const g = gravity();
      while (fallT >= g && !grounded()){ fallT -= g; cur.y++; }
    }
  }

  /* ---------- çizim ---------- */
  let cell = 24, dpr = 1;
  function layout(){
    const wrap = $("well").getBoundingClientRect();
    const maxH = Math.max(200, window.innerHeight - (window.matchMedia("(max-width:720px), (pointer:coarse)").matches ? 190 : 110));
    cell = Math.max(14, Math.floor(Math.min(maxH/(ROWS - HIDDEN), (wrap.width || 300)/COLS, 36)));
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    cv.style.width = cell*COLS + "px"; cv.style.height = cell*(ROWS - HIDDEN) + "px";
    cv.width = Math.round(cell*COLS*dpr); cv.height = Math.round(cell*(ROWS - HIDDEN)*dpr);
  }

  function block(c2, x, y, s, color, alpha){
    c2.globalAlpha = alpha == null ? 1 : alpha;
    c2.fillStyle = color; c2.fillRect(x + 1, y + 1, s - 2, s - 2);
    c2.fillStyle = "rgba(255,255,255,.28)"; c2.fillRect(x + 1, y + 1, s - 2, Math.max(2, s*.18));
    c2.fillStyle = "rgba(0,0,0,.22)"; c2.fillRect(x + 1, y + s - 1 - Math.max(2, s*.16), s - 2, Math.max(2, s*.16));
    c2.globalAlpha = 1;
  }

  function draw(){
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const W = cell*COLS, H = cell*(ROWS - HIDDEN);
    ctx.fillStyle = "#071C20"; ctx.fillRect(0, 0, W, H);
    ctx.strokeStyle = "rgba(62,214,232,.07)"; ctx.lineWidth = 1;
    ctx.beginPath();
    for (let c = 1; c < COLS; c++){ ctx.moveTo(c*cell + .5, 0); ctx.lineTo(c*cell + .5, H); }
    for (let r = 1; r < ROWS - HIDDEN; r++){ ctx.moveTo(0, r*cell + .5); ctx.lineTo(W, r*cell + .5); }
    ctx.stroke();

    if (!grid) return;
    for (let r = HIDDEN; r < ROWS; r++){
      const clearRow = clearing && clearing.rows.includes(r);
      for (let c = 0; c < COLS; c++){
        const t = grid[r][c];
        if (!t) continue;
        if (clearRow) { ctx.fillStyle = `rgba(255,255,255,${(.5 + .5*Math.sin(clearing.t*40)).toFixed(2)})`; ctx.fillRect(c*cell, (r - HIDDEN)*cell, cell, cell); }
        else block(ctx, c*cell, (r - HIDDEN)*cell, cell, COLORS[t]);
      }
    }
    if (cur){
      const m = shapeOf(cur.type, cur.rot);
      let gy = cur.y; while (!collides(cur.type, cur.rot, cur.x, gy + 1)) gy++;
      ctx.strokeStyle = COLORS[cur.type]; ctx.lineWidth = 2; ctx.globalAlpha = .55;
      for (let r = 0; r < m.length; r++) for (let c = 0; c < m.length; c++){
        if (!m[r][c] || gy + r < HIDDEN) continue;
        ctx.strokeRect((cur.x + c)*cell + 3, (gy + r - HIDDEN)*cell + 3, cell - 6, cell - 6);
      }
      ctx.globalAlpha = 1;
      for (let r = 0; r < m.length; r++) for (let c = 0; c < m.length; c++){
        if (!m[r][c] || cur.y + r < HIDDEN) continue;
        block(ctx, (cur.x + c)*cell, (cur.y + r - HIDDEN)*cell, cell, COLORS[cur.type]);
      }
    }
    if (flash > 0){ ctx.fillStyle = `rgba(62,214,232,${(flash*.4).toFixed(2)})`; ctx.fillRect(0, 0, W, H); }
  }

  function drawMini(c2, type, cx, cy, s){
    const m = SHAPES[type];
    const cells = [];
    m.forEach((row, r) => row.forEach((v, c) => { if (v) cells.push([c, r]); }));
    const minX = Math.min(...cells.map(p => p[0])), maxX = Math.max(...cells.map(p => p[0]));
    const minY = Math.min(...cells.map(p => p[1])), maxY = Math.max(...cells.map(p => p[1]));
    const w = (maxX - minX + 1)*s, h = (maxY - minY + 1)*s;
    cells.forEach(([c, r]) => block(c2, cx - w/2 + (c - minX)*s, cy - h/2 + (r - minY)*s, s, COLORS[type]));
  }

  function renderSide(){
    $("score").textContent = (score || 0).toLocaleString("tr-TR");
    $("level").textContent = level || 1;
    $("lines").textContent = lines || 0;
    $("best").textContent = best.toLocaleString("tr-TR");
    hctx.clearRect(0, 0, holdCv.width, holdCv.height);
    if (holdType) { hctx.globalAlpha = holdUsed ? .4 : 1; drawMini(hctx, holdType, 60, 40, 22); hctx.globalAlpha = 1; }
    nctx.clearRect(0, 0, nextCv.width, nextCv.height);
    (queue || []).slice(0, 3).forEach((t, i) => drawMini(nctx, t, 60, 42 + i*78, i === 0 ? 24 : 20));
  }

  let last = performance.now();
  function frame(now){
    const dt = Math.min(.05, (now - last)/1000); last = now;
    if (phase === "play") update(dt);
    draw();
    requestAnimationFrame(frame);
  }

  /* ---------- kontroller ---------- */
  function start(){
    audio();
    reset();
    phase = "play";
    ["intro", "over", "paused"].forEach(id => { $(id).hidden = true; });
    if (document.activeElement && document.activeElement.blur) document.activeElement.blur();
  }
  function togglePause(){
    if (phase === "play"){ phase = "paused"; $("paused").hidden = false; held.left = held.right = held.soft = false; $("resume").focus({preventScroll:true}); }
    else if (phase === "paused"){ phase = "play"; $("paused").hidden = true; last = performance.now(); if (document.activeElement && document.activeElement.blur) document.activeElement.blur(); }
  }
  $("start").addEventListener("click", start);
  $("again").addEventListener("click", start);
  $("resume").addEventListener("click", togglePause);
  $("pause").addEventListener("click", togglePause);
  window.addEventListener("blur", () => { held.left = held.right = held.soft = false; if (phase === "play") togglePause(); });
  document.addEventListener("visibilitychange", () => { if (document.hidden && phase === "play") togglePause(); });

  window.addEventListener("keydown", e => {
    const k = e.key.toLowerCase();
    const gameKeys = ["arrowleft", "arrowright", "arrowdown", "arrowup", " ", "z", "x", "c", "shift"];
    if (gameKeys.includes(k) && phase === "play") e.preventDefault();
    if ((k === "enter" || k === " ") && (phase === "intro" || (phase === "over" && !$("over").hidden))){ e.preventDefault(); start(); return; }
    if (k === "p" || k === "escape"){ togglePause(); return; }
    if (phase !== "play") return;
    if (k === "arrowleft"){ if (!e.repeat){ held.left = true; move(-1); } }
    else if (k === "arrowright"){ if (!e.repeat){ held.right = true; move(1); } }
    else if (k === "arrowdown"){ if (!e.repeat){ held.soft = true; softT = 0; softDrop(); } }
    else if (e.repeat) return;
    else if (k === "arrowup" || k === "x") rotate(1);
    else if (k === "z" || k === "control") rotate(-1);
    else if (k === " ") hardDrop();
    else if (k === "c" || k === "shift") hold();
  });
  window.addEventListener("keyup", e => {
    const k = e.key.toLowerCase();
    if (k === "arrowleft") held.left = false;
    if (k === "arrowright") held.right = false;
    if (k === "arrowdown") held.soft = false;
  });

  // dokunmatik düğmeler
  document.querySelectorAll("#pad .pb").forEach(b => {
    const act = b.dataset.act;
    b.addEventListener("pointerdown", e => {
      e.preventDefault(); audio();
      if (phase !== "play") return;
      try { b.setPointerCapture(e.pointerId); } catch(_) {}
      if (act === "left"){ held.left = true; move(-1); }
      else if (act === "right"){ held.right = true; move(1); }
      else if (act === "soft"){ held.soft = true; softT = 0; softDrop(); }
      else if (act === "rotate") rotate(1);
      else if (act === "hard") hardDrop();
      else if (act === "hold") hold();
    });
    ["pointerup", "pointercancel", "lostpointercapture"].forEach(ev => b.addEventListener(ev, () => {
      if (act === "left") held.left = false;
      if (act === "right") held.right = false;
      if (act === "soft") held.soft = false;
    }));
  });

  // tahtada kaydırma: yatay sürükle = kaydır, dokun = çevir, hızla aşağı = bırak
  let drag = null;
  cv.addEventListener("pointerdown", e => {
    if (phase !== "play") return;
    e.preventDefault(); audio();
    drag = {id:e.pointerId, x:e.clientX, y:e.clientY, sx:e.clientX, sy:e.clientY, t:performance.now(), moved:false};
    try { cv.setPointerCapture(e.pointerId); } catch(_) {}
  });
  cv.addEventListener("pointermove", e => {
    if (!drag || drag.id !== e.pointerId || phase !== "play") return;
    const dx = e.clientX - drag.x, dy = e.clientY - drag.y;
    if (Math.abs(dx) >= cell){ const steps = Math.trunc(dx/cell); for (let i = 0; i < Math.abs(steps); i++) move(Math.sign(steps)); drag.x += steps*cell; drag.moved = true; }
    if (dy >= cell){ const steps = Math.trunc(dy/cell); for (let i = 0; i < steps; i++) softDrop(); drag.y += steps*cell; drag.moved = true; }
  });
  cv.addEventListener("pointerup", e => {
    if (!drag || drag.id !== e.pointerId) return;
    const dt = performance.now() - drag.t, dy = e.clientY - drag.sy, dx = e.clientX - drag.sx;
    if (phase === "play"){
      if (dy > cell*2.5 && dt < 250 && Math.abs(dy) > Math.abs(dx)*1.5) hardDrop();
      else if (!drag.moved && dt < 300) rotate(1);
    }
    drag = null;
  });
  cv.addEventListener("pointercancel", () => { drag = null; });

  window.addEventListener("resize", layout);
  if ("ResizeObserver" in window) new ResizeObserver(layout).observe($("well"));
  layout();
  grid = Array.from({length:ROWS}, emptyRow);
  queue = []; bag = []; score = 0; lines = 0; level = 1;
  renderSide();
  requestAnimationFrame(frame);
})();
