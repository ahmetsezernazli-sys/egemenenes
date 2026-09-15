/* Tilki Macerası — Enes için platform oyunu */
(function(){
  "use strict";

  const LEVELS = window.TILKI_LEVELS;
  const T = 40, ROWS = 14, VIEW_W = 1000, VIEW_H = ROWS*T;
  const PH = {w:26, h:36, run:300, accel:2000, airAccel:1400, friction:2400, gravity:2200, jump:820, cut:.45, maxFall:900, coyote:.08, buffer:.12, spring:1250, stomp:540};
  const SAVE_KEY = "tilki-macerasi", SOUND_KEY = "tilki-macerasi-ses";
  const RM = window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches;
  const TAU = Math.PI*2;
  const THEMES = {
    forest:{sky:["#8FD3F2", "#DDF3FF"], far:"#A9DDB0", near:"#7BC47F", top:"#5DBB4C", dirt:"#8B5A2B", dot:"#74481F", block:"#9AA0AA", plank:"#B97A45"},
    hills:{sky:["#A7E3FF", "#FFF1F7"], far:"#C4EBB5", near:"#9ED88B", top:"#6CC24A", dirt:"#9A6B3F", dot:"#7F552E", block:"#A7A2B0", plank:"#C98B55", flowers:true},
    cave:{sky:["#1E1B2E", "#3A3450"], far:"#2B2640", near:"#342D4C", top:"#6B5B8A", dirt:"#3F3553", dot:"#2E2640", block:"#56506B", plank:"#8A6A4A", dark:true},
    canyon:{sky:["#FFB36B", "#FFE3B0"], far:"#E9A073", near:"#D98458", top:"#D9774A", dirt:"#A4502C", dot:"#8A3F20", block:"#B5835A", plank:"#8A5A34"},
    night:{sky:["#18204A", "#3B4A8A"], far:"#26306A", near:"#2E3B78", top:"#4E8A5B", dirt:"#3C2F2A", dot:"#2B211D", block:"#5E6680", plank:"#8A6A4A", dark:true, moon:true},
    sky:{sky:["#6EC6FF", "#E8F8FF"], far:"#FFFFFF", near:"#F2FAFF", top:"#7FD07F", dirt:"#C8A27A", dot:"#AD875F", block:"#B7C3D0", plank:"#FFFFFF", clouds:true},
    castle:{sky:["#2C2F4A", "#565B80"], far:"#3A3E60", near:"#44496E", top:"#7C8497", dirt:"#4B4F63", dot:"#3A3D4E", block:"#8A8FA3", plank:"#8A6A4A", dark:true},
    sunset:{sky:["#FF7E5F", "#FEB47B"], far:"#B8698A", near:"#8E5A7A", top:"#6FBF5A", dirt:"#7A4A2E", dot:"#5F3822", block:"#9A8F8A", plank:"#A8744A"}
  };

  const $ = id => document.getElementById(id);
  const stage = $("stage"), cv = $("cv"), ctx = cv.getContext("2d");
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const fmtTime = s => `${Math.floor(s/60)}:${String(Math.floor(s % 60)).padStart(2, "0")}`;

  /* ---------- kayıt ---------- */
  let save = {unlocked:1, levels:{}};
  try { const s = JSON.parse(localStorage.getItem(SAVE_KEY)); if (s && s.levels) save = {unlocked:clamp(s.unlocked | 0, 1, LEVELS.length), levels:s.levels}; } catch(e) {}
  const persist = () => { try { localStorage.setItem(SAVE_KEY, JSON.stringify(save)); } catch(e) {} };
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
  const sfx = {
    jump(){ tone(420, .14, "square", .05, 760); },
    coin(){ tone(988, .06, "square", .05); tone(1319, .12, "square", .05, null, .06); },
    star(){ [784, 988, 1175, 1568].forEach((f, i) => tone(f, .12, "triangle", .1, null, i*.06)); },
    stomp(){ tone(300, .12, "square", .08, 120); },
    hurt(){ tone(500, .3, "sawtooth", .07, 150); },
    die(){ [523, 440, 349, 262].forEach((f, i) => tone(f, .16, "triangle", .1, null, i*.1)); },
    spring(){ tone(300, .25, "sine", .12, 1200); },
    check(){ [659, 880].forEach((f, i) => tone(f, .14, "triangle", .1, null, i*.08)); },
    win(){ [523, 659, 784, 1047, 784, 1047, 1319].forEach((f, i) => tone(f, .18, "triangle", .12, null, i*.1)); }
  };
  function renderSound(){
    $("ic-on").hidden = !soundOn; $("ic-off").hidden = soundOn;
    $("sound").setAttribute("aria-label", soundOn ? "Sesi kapat" : "Sesi aç");
    $("sound").setAttribute("aria-pressed", String(soundOn));
  }
  $("sound").addEventListener("click", () => { soundOn = !soundOn; try { localStorage.setItem(SOUND_KEY, soundOn ? "1" : "0"); } catch(e) {} renderSound(); });
  renderSound();

  /* ---------- bölüm yükleme ---------- */
  function parseLevel(i){
    const def = LEVELS[i], rows = def.map, cols = rows[0].length;
    const grid = rows.map(r => r.split(""));
    const lv = {i, def, cols, grid, theme:THEMES[def.theme], start:null, coins:[], stars:[], enemies:[], springs:[], checks:[], goal:null};
    for (let r = 0; r < ROWS; r++) for (let c = 0; c < cols; c++){
      const ch = grid[r][c], x = c*T, y = r*T;
      const clear = () => { grid[r][c] = "."; };
      if (ch === "P"){ lv.start = {x:x + (T - PH.w)/2, y:y + T - PH.h}; clear(); }
      else if (ch === "o"){ lv.coins.push({x:x + T/2, y:y + T/2, got:false}); clear(); }
      else if (ch === "*"){ lv.stars.push({x:x + T/2, y:y + T/2, got:false}); clear(); }
      else if (ch === "E"){ lv.enemies.push({kind:"beetle", x:x + 4, y:y + T - 24, w:32, h:24, vx:-60, vy:0, dead:0, alive:true, x0:x + 4, y0:y + T - 24}); clear(); }
      else if (ch === "F"){ lv.enemies.push({kind:"bat", x:x + 5, y:y + 10, w:30, h:20, x0:x + 5, y0:y + 10, t:Math.random()*6, dead:0, alive:true}); clear(); }
      else if (ch === "S"){ lv.springs.push({x, y:y + T - 18, w:T, h:18, squash:0}); clear(); }
      else if (ch === "C"){ lv.checks.push({x, y, on:false}); clear(); }
      else if (ch === "G"){ lv.goal = {x:x + 6, y:y - 2*T, w:28, h:3*T}; clear(); }
    }
    return lv;
  }
  const tileAt = (lv, c, r) => (c < 0 || c >= lv.cols) ? "#" : (r < 0 || r >= ROWS) ? "." : lv.grid[r][c];
  const isSolid = ch => ch === "#" || ch === "B";

  /* ---------- oyuncu fiziği (bot ve testler de kullanır) ---------- */
  function newPlayer(lv, at){
    const s = at || lv.start;
    return {x:s.x, y:s.y, vx:0, vy:0, onGround:false, coyote:0, buffer:0, jumpHeld:false, cutDone:true, face:1, anim:0, inv:0};
  }
  // input: {left, right, jump (basılı mı), jumpPressed (bu karede basıldı mı)}
  function stepPlayer(lv, p, input, dt){
    const ev = {};
    const dir = (input.right ? 1 : 0) - (input.left ? 1 : 0);
    if (dir) p.face = dir;
    const acc = p.onGround ? PH.accel : PH.airAccel;
    if (dir) p.vx = clamp(p.vx + dir*acc*dt, -PH.run, PH.run);
    else if (p.onGround){ const f = PH.friction*dt; p.vx = Math.abs(p.vx) <= f ? 0 : p.vx - Math.sign(p.vx)*f; }
    if (input.jumpPressed) p.buffer = PH.buffer; else p.buffer = Math.max(0, p.buffer - dt);
    p.coyote = p.onGround ? PH.coyote : Math.max(0, p.coyote - dt);
    if (p.buffer > 0 && p.coyote > 0){ p.vy = -PH.jump; p.buffer = 0; p.coyote = 0; p.onGround = false; p.cutDone = false; ev.jump = true; }
    if (!input.jump && !p.cutDone && p.vy < -200){ p.vy *= PH.cut; p.cutDone = true; }
    if (input.jump === false) p.cutDone = true;
    p.vy = Math.min(PH.maxFall, p.vy + PH.gravity*dt);

    // yatay
    p.x += p.vx*dt;
    {
      const r0 = Math.floor((p.y + 1)/T), r1 = Math.floor((p.y + PH.h - 1)/T);
      if (p.vx > 0){
        const c = Math.floor((p.x + PH.w)/T);
        for (let r = r0; r <= r1; r++) if (isSolid(tileAt(lv, c, r))){ p.x = c*T - PH.w; p.vx = 0; break; }
      } else if (p.vx < 0){
        const c = Math.floor(p.x/T);
        for (let r = r0; r <= r1; r++) if (isSolid(tileAt(lv, c, r))){ p.x = (c + 1)*T; p.vx = 0; break; }
      }
    }
    // dikey
    const prevBottom = p.y + PH.h;
    p.y += p.vy*dt;
    p.onGround = false;
    {
      const c0 = Math.floor((p.x + 1)/T), c1 = Math.floor((p.x + PH.w - 1)/T);
      if (p.vy >= 0){
        const r = Math.floor((p.y + PH.h)/T);
        for (let c = c0; c <= c1; c++){
          const ch = tileAt(lv, c, r);
          if (isSolid(ch) || (ch === "=" && prevBottom <= r*T + 1)){ p.y = r*T - PH.h; p.vy = 0; p.onGround = true; break; }
        }
      } else {
        const r = Math.floor(p.y/T);
        for (let c = c0; c <= c1; c++) if (isSolid(tileAt(lv, c, r))){ p.y = (r + 1)*T; p.vy = 0; ev.bump = true; break; }
      }
    }
    // zıplama yastığı
    if (p.vy >= 0) for (const s of lv.springs){
      if (p.x + PH.w > s.x + 4 && p.x < s.x + s.w - 4 && p.y + PH.h >= s.y && prevBottom <= s.y + 8){
        p.vy = -PH.spring; p.onGround = false; p.cutDone = true; p.coyote = 0; s.squash = 1; ev.spring = true;
      }
    }
    // diken: karenin alt yarısına değerse
    {
      const c0 = Math.floor((p.x + 4)/T), c1 = Math.floor((p.x + PH.w - 4)/T), r0 = Math.floor((p.y + 4)/T), r1 = Math.floor((p.y + PH.h - 2)/T);
      for (let r = r0; r <= r1 && !ev.spike; r++) for (let c = c0; c <= c1; c++){
        if (tileAt(lv, c, r) === "^" && p.y + PH.h > r*T + T*.45){ ev.spike = true; break; }
      }
    }
    if (p.y > VIEW_H + 80) ev.fall = true;
    const g = lv.goal;
    if (g && p.x + PH.w > g.x && p.x < g.x + g.w && p.y + PH.h > g.y && p.y < g.y + g.h) ev.goal = true;
    return ev;
  }

  /* ---------- oyun durumu ---------- */
  let state = "menu";   // menu | play | paused | dying | won
  let L = null, P = null, cam = 0, time = 0, levelTime = 0, deaths = 0, hearts = 3, coinsGot = 0, respawn = null, dieT = 0, winT = 0;
  const keys = {left:false, right:false, jump:false};
  let jumpQueued = false, particles = [], popups = [];

  function startLevel(i){
    L = parseLevel(i);
    respawn = null; deaths = 0; levelTime = 0; coinsGot = 0; hearts = 3;
    P = newPlayer(L); cam = 0; particles = []; popups = [];
    state = "play";
    ["menu", "paused", "result"].forEach(id => $(id).hidden = true);
    cv.focus && cv.focus();
  }
  function die(){
    if (state !== "play") return;
    state = "dying"; dieT = .9; deaths++; sfx.die();
    burst(P.x + PH.w/2, P.y + PH.h/2, "#FF8A3D", 16);
  }
  function revive(){
    const at = respawn || L.start;
    P = newPlayer(L, at); hearts = 3; P.inv = 1;
    // düşmanlar yerine döner, ölenler canlanmaz
    for (const e of L.enemies) if (e.alive && e.kind === "beetle"){ e.x = e.x0; e.y = e.y0; e.vy = 0; }
    state = "play";
  }
  function win(){
    state = "won"; winT = 1.2; sfx.win();
    burst(L.goal.x + 14, L.goal.y + 20, "#FFD23F", 30);
  }
  function showResult(){
    const i = L.i, starMask = L.stars.map(s => s.got), got = starMask.filter(Boolean).length;
    const prev = save.levels[i] || {stars:[false, false, false], best:null, coins:0};
    const merged = prev.stars.map((v, k) => v || !!starMask[k]);
    const newBest = prev.best == null || levelTime < prev.best;
    save.levels[i] = {stars:merged, best:newBest ? +levelTime.toFixed(2) : prev.best, coins:Math.max(prev.coins || 0, coinsGot)};
    if (i + 1 < LEVELS.length) save.unlocked = Math.max(save.unlocked, i + 2);
    persist();
    $("res-level").textContent = `${i + 1}. bölüm · ${L.def.name}`;
    $("res-title").textContent = i === LEVELS.length - 1 ? "Zirveye ulaştın!" : got === 3 ? "Kusursuz!" : "Bölüm tamam!";
    $("res-stars").innerHTML = starMask.map(v => `<span class="${v ? "" : "off"}">⭐</span>`).join("");
    $("res-time").textContent = fmtTime(levelTime);
    $("res-coins").textContent = `${coinsGot}/${L.coins.length}`;
    $("res-deaths").textContent = deaths;
    const notes = [];
    if (newBest && prev.best != null) notes.push(`Yeni süre rekoru! (önceki ${fmtTime(prev.best)})`);
    if (got < 3) notes.push(`${3 - got} yıldız bu bölümde saklı kaldı.`);
    $("res-note").textContent = notes.join(" ");
    $("next").hidden = i + 1 >= LEVELS.length;
    $("result").hidden = false;
    ($("next").hidden ? $("again") : $("next")).focus();
  }

  function openMenu(){
    state = "menu";
    const box = $("levels"); box.innerHTML = "";
    LEVELS.forEach((def, i) => {
      const s = save.levels[i], b = document.createElement("button");
      b.type = "button"; b.className = "lvl"; b.disabled = i + 1 > save.unlocked;
      const stars = s ? s.stars.map(v => v ? "⭐" : "☆").join("") : "☆☆☆";
      b.innerHTML = `<b>${i + 1}</b><span class="nm"></span><span class="st">${b.disabled ? "🔒" : stars}</span><span class="tm">${s && s.best != null ? fmtTime(s.best) : ""}</span>`;
      b.querySelector(".nm").textContent = def.name;
      b.setAttribute("aria-label", `${i + 1}. bölüm ${def.name}${b.disabled ? ", kilitli" : ""}`);
      b.addEventListener("click", () => { audio(); startLevel(i); });
      box.appendChild(b);
    });
    ["paused", "result"].forEach(id => $(id).hidden = true);
    $("menu").hidden = false;
    const open = [...box.querySelectorAll(".lvl:not(:disabled)")];
    if (open.length) open[open.length - 1].focus();   // en son açılan bölüm seçili gelsin
  }

  function pause(on){
    if (on && state === "play"){ state = "paused"; $("paused").hidden = false; $("resume").focus(); }
    else if (!on && state === "paused"){ state = "play"; $("paused").hidden = true; last = performance.now(); }
  }
  $("pause").addEventListener("click", () => pause(state === "play"));
  $("resume").addEventListener("click", () => pause(false));
  $("restart").addEventListener("click", () => startLevel(L.i));
  $("to-menu").addEventListener("click", openMenu);
  $("again").addEventListener("click", () => startLevel(L.i));
  $("next").addEventListener("click", () => startLevel(L.i + 1));
  $("res-menu").addEventListener("click", openMenu);
  document.addEventListener("visibilitychange", () => { if (document.hidden) pause(true); });

  /* ---------- klavye ve dokunmatik ---------- */
  const KEYMAP = {ArrowLeft:"left", KeyA:"left", ArrowRight:"right", KeyD:"right", ArrowUp:"jump", KeyW:"jump", Space:"jump"};
  window.addEventListener("keydown", e => {
    if (e.code === "Escape" || e.code === "KeyP"){ if (state === "play" || state === "paused") pause(state === "play"); return; }
    if (e.code === "KeyR" && (state === "play" || state === "paused")){ startLevel(L.i); return; }
    const k = KEYMAP[e.code];
    if (!k || state !== "play") return;
    e.preventDefault(); audio();
    if (k === "jump" && !keys.jump) jumpQueued = true;
    keys[k] = true;
  });
  window.addEventListener("keyup", e => { const k = KEYMAP[e.code]; if (k) keys[k] = false; });
  window.addEventListener("blur", () => { keys.left = keys.right = keys.jump = false; });

  function bindTouch(id, k){
    const el = $(id);
    const on = e => { e.preventDefault(); audio(); if (k === "jump" && !keys.jump) jumpQueued = true; keys[k] = true; el.classList.add("on"); el.setPointerCapture && el.setPointerCapture(e.pointerId); };
    const off = e => { e.preventDefault(); keys[k] = false; el.classList.remove("on"); };
    el.addEventListener("pointerdown", on);
    el.addEventListener("pointerup", off); el.addEventListener("pointercancel", off); el.addEventListener("lostpointercapture", off);
  }
  bindTouch("t-left", "left"); bindTouch("t-right", "right"); bindTouch("t-jump", "jump");
  const showTouch = () => { $("touch").hidden = false; };
  if (window.matchMedia && matchMedia("(pointer: coarse)").matches) showTouch();
  window.addEventListener("touchstart", showTouch, {once:true, passive:true});

  /* ---------- efektler ---------- */
  function burst(x, y, c, n){
    for (let i = 0; i < (RM ? Math.ceil(n/4) : n); i++){ const a = Math.random()*TAU, v = 80 + Math.random()*260; particles.push({x, y, vx:Math.cos(a)*v, vy:Math.sin(a)*v - 120, life:.7, max:.7, c, r:3 + Math.random()*4}); }
  }
  function popup(text, x, y, c){ popups.push({text, x, y, life:1, c}); }

  /* ---------- güncelle ---------- */
  function overlap(a, ax, ay, aw, ah){ return P.x + PH.w > ax && P.x < ax + aw && P.y + PH.h > ay && P.y < ay + ah; }
  function update(dt){
    time += dt;
    for (let i = particles.length - 1; i >= 0; i--){ const q = particles[i]; q.life -= dt; q.vy += 900*dt; q.x += q.vx*dt; q.y += q.vy*dt; if (q.life <= 0) particles.splice(i, 1); }
    for (let i = popups.length - 1; i >= 0; i--){ const q = popups[i]; q.life -= dt; q.y -= 40*dt; if (q.life <= 0) popups.splice(i, 1); }
    if (!L) return;
    for (const s of L.springs) s.squash = Math.max(0, s.squash - dt*4);
    if (state === "dying"){ dieT -= dt; if (dieT <= 0) revive(); return; }
    if (state === "won"){ winT -= dt; if (winT <= 0){ state = "result"; showResult(); } return; }
    if (state !== "play") return;
    levelTime += dt;

    // oyuncu (küçük adımlarla)
    const steps = Math.ceil(dt/(1/120)), h = dt/steps;
    for (let k = 0; k < steps && state === "play"; k++){
      const ev = stepPlayer(L, P, {left:keys.left, right:keys.right, jump:keys.jump, jumpPressed:jumpQueued && k === 0}, h);
      if (ev.jump) sfx.jump();
      if (ev.spring){ sfx.spring(); }
      if (ev.spike || ev.fall){ die(); return; }
      if (ev.goal){ win(); return; }
    }
    jumpQueued = false;
    P.inv = Math.max(0, P.inv - dt);
    P.anim += Math.abs(P.vx)*dt*.04;

    // toplananlar
    for (const c of L.coins) if (!c.got && overlap(null, c.x - 12, c.y - 14, 24, 28)){ c.got = true; coinsGot++; sfx.coin(); }
    L.stars.forEach((s, k) => {
      if (!s.got && overlap(null, s.x - 18, s.y - 18, 36, 36)){ s.got = true; sfx.star(); burst(s.x, s.y, "#FFD23F", 14); popup(`★ ${L.stars.filter(q => q.got).length}/3`, s.x, s.y - 20, "#FFD23F"); }
    });
    for (const c of L.checks) if (!c.on && overlap(null, c.x, c.y - T, T, 2*T)){
      c.on = true; respawn = {x:c.x + (T - PH.w)/2, y:c.y + T - PH.h}; sfx.check(); popup("Kontrol noktası", c.x + T/2, c.y - 30, "#FFFFFF");
    }

    // düşmanlar
    for (const e of L.enemies){
      if (!e.alive){ e.dead = Math.max(0, e.dead - dt); continue; }
      if (e.kind === "beetle"){
        e.vy = Math.min(PH.maxFall, e.vy + PH.gravity*dt);
        const nx = e.x + e.vx*dt, dirx = Math.sign(e.vx);
        const frontC = Math.floor((dirx > 0 ? nx + e.w : nx)/T), rowMid = Math.floor((e.y + e.h/2)/T), footR = Math.floor((e.y + e.h + 2)/T);
        const wall = isSolid(tileAt(L, frontC, rowMid)) || tileAt(L, frontC, rowMid) === "^";
        const ledge = !isSolid(tileAt(L, frontC, footR)) && tileAt(L, frontC, footR) !== "=";
        if (wall || ledge) e.vx = -e.vx; else e.x = nx;
        e.y += e.vy*dt;
        const r = Math.floor((e.y + e.h)/T), c = Math.floor((e.x + e.w/2)/T);
        if (isSolid(tileAt(L, c, r)) || tileAt(L, c, r) === "="){ e.y = r*T - e.h; e.vy = 0; }
        if (e.y > VIEW_H + 100) e.alive = false;
      } else {
        e.t += dt;
        e.x = e.x0 + Math.sin(e.t*1.1)*80; e.y = e.y0 + Math.sin(e.t*2.2)*22;
      }
      if (overlap(null, e.x, e.y, e.w, e.h)){
        const fromAbove = P.vy > 0 && P.y + PH.h - e.y < 20;
        if (fromAbove){
          e.alive = false; e.dead = .5; sfx.stomp(); burst(e.x + e.w/2, e.y + e.h/2, e.kind === "bat" ? "#6B4F8A" : "#7E57C2", 10);
          P.vy = keys.jump ? -PH.jump*.95 : -PH.stomp; P.cutDone = !keys.jump;
        } else if (P.inv <= 0){
          hearts--; sfx.hurt(); P.inv = 1.3;
          P.vx = (P.x + PH.w/2 < e.x + e.w/2 ? -1 : 1)*260; P.vy = -380;
          if (hearts <= 0){ die(); return; }
        }
      }
    }

    // kamera
    const want = clamp(P.x - VIEW_W*.4, 0, L.cols*T - VIEW_W);
    cam += (want - cam)*Math.min(1, dt*8);
  }

  /* ---------- çizim ---------- */
  const view = {s:1, ox:0, oy:0, dpr:1};
  function resize(){
    const r = stage.getBoundingClientRect();
    view.dpr = Math.min(window.devicePixelRatio || 1, 2);
    cv.width = Math.round(r.width*view.dpr); cv.height = Math.round(r.height*view.dpr);
    view.s = Math.min(r.width/VIEW_W, r.height/VIEW_H);
    view.ox = (r.width - VIEW_W*view.s)/2; view.oy = (r.height - VIEW_H*view.s)/2;
  }

  function drawBackground(th){
    const w = VIEW_W + 2*view.ox/view.s + 4, x0 = -view.ox/view.s - 2, y0 = -view.oy/view.s - 2, hh = VIEW_H + 2*view.oy/view.s + 4;
    const g = ctx.createLinearGradient(0, 0, 0, VIEW_H);
    g.addColorStop(0, th.sky[0]); g.addColorStop(1, th.sky[1]);
    ctx.fillStyle = g; ctx.fillRect(x0, y0, w, hh);
    if (th.dark){
      ctx.fillStyle = "rgba(255,255,255,.7)";
      for (let k = 0; k < 40; k++){ const sx = ((k*137.5 - cam*.05) % (VIEW_W + 40) + VIEW_W + 40) % (VIEW_W + 40) - 20, sy = (k*53) % 260 + 20; ctx.fillRect(sx, sy, 2, 2); }
    }
    if (th.moon){ ctx.fillStyle = "#FFF3C4"; ctx.beginPath(); ctx.arc(820, 90, 40, 0, TAU); ctx.fill(); }
    // uzak tepeler
    for (const [color, par, amp, base, freq] of [[th.far, .15, 60, 330, .006], [th.near, .35, 50, 400, .011]]){
      ctx.fillStyle = color; ctx.beginPath(); ctx.moveTo(x0, hh + y0);
      for (let x = x0; x <= x0 + w + 20; x += 20){ const wx = x + cam*par; ctx.lineTo(x, base - Math.sin(wx*freq)*amp - Math.sin(wx*freq*2.7)*amp*.35); }
      ctx.lineTo(x0 + w + 20, hh + y0); ctx.closePath(); ctx.fill();
    }
    if (th.clouds){
      ctx.fillStyle = "rgba(255,255,255,.9)";
      for (let k = 0; k < 8; k++){ const cx = ((k*260 - cam*.3 + time*8) % 1300 + 1300) % 1300 - 150, cy = 80 + (k*71) % 200; ctx.beginPath(); ctx.arc(cx, cy, 30, 0, TAU); ctx.arc(cx + 34, cy - 10, 38, 0, TAU); ctx.arc(cx + 72, cy, 28, 0, TAU); ctx.fill(); }
    }
  }

  function drawTiles(th){
    const c0 = Math.max(0, Math.floor(cam/T) - 1), c1 = Math.min(L.cols - 1, Math.ceil((cam + VIEW_W)/T) + 1);
    for (let r = 0; r < ROWS; r++) for (let c = c0; c <= c1; c++){
      const ch = L.grid[r][c], x = c*T, y = r*T;
      if (ch === "#"){
        ctx.fillStyle = th.dirt; ctx.fillRect(x, y, T + .5, T + .5);
        ctx.fillStyle = th.dot;
        ctx.fillRect(x + 8 + (c*7 + r*3) % 18, y + 12 + (c*5 + r) % 16, 5, 5); ctx.fillRect(x + 24 - (c*3) % 12, y + 26, 4, 4);
        if (tileAt(L, c, r - 1) !== "#"){
          ctx.fillStyle = th.top; ctx.fillRect(x, y, T + .5, 12);
          ctx.beginPath(); for (let k = 0; k < 4; k++){ ctx.moveTo(x + k*10, y + 12); ctx.lineTo(x + k*10 + 5, y + 18); ctx.lineTo(x + k*10 + 10, y + 12); } ctx.fill();
          if (th.flowers && (c*7 + r) % 5 === 0){ ctx.fillStyle = "#FF7AB6"; ctx.beginPath(); ctx.arc(x + 20, y - 4, 5, 0, TAU); ctx.fill(); ctx.fillStyle = "#FFE45C"; ctx.beginPath(); ctx.arc(x + 20, y - 4, 2, 0, TAU); ctx.fill(); }
        }
      } else if (ch === "B"){
        ctx.fillStyle = th.block; ctx.fillRect(x, y, T + .5, T + .5);
        ctx.fillStyle = "rgba(0,0,0,.18)"; ctx.fillRect(x, y + T/2 - 2, T, 3); ctx.fillRect(x + (r % 2 ? 10 : 28), y, 3, T/2); ctx.fillRect(x + (r % 2 ? 28 : 10), y + T/2, 3, T/2);
        ctx.fillStyle = "rgba(255,255,255,.12)"; ctx.fillRect(x, y, T, 3);
      } else if (ch === "="){
        ctx.fillStyle = th.plank; ctx.beginPath(); ctx.roundRect(x, y, T + .5, 14, 5); ctx.fill();
        ctx.fillStyle = "rgba(0,0,0,.18)"; ctx.fillRect(x, y + 10, T, 4);
      } else if (ch === "^"){
        ctx.fillStyle = "#D9DEE7"; ctx.strokeStyle = "#7E8796"; ctx.lineWidth = 2;
        ctx.beginPath(); for (let k = 0; k < 3; k++){ ctx.moveTo(x + k*T/3, y + T); ctx.lineTo(x + k*T/3 + T/6, y + T*.35); ctx.lineTo(x + (k + 1)*T/3, y + T); } ctx.fill(); ctx.stroke();
      }
    }
  }

  function drawStar(x, y, r, rot, fill){
    ctx.save(); ctx.translate(x, y); ctx.rotate(rot); ctx.beginPath();
    for (let i = 0; i < 10; i++){ const a = -Math.PI/2 + i*Math.PI/5, rr = i % 2 ? r*.45 : r; i ? ctx.lineTo(Math.cos(a)*rr, Math.sin(a)*rr) : ctx.moveTo(Math.cos(a)*rr, Math.sin(a)*rr); }
    ctx.closePath(); ctx.fillStyle = fill; ctx.fill(); ctx.strokeStyle = "#C99400"; ctx.lineWidth = 2.5; ctx.stroke(); ctx.restore();
  }

  function drawThings(){
    const vis = x => x > cam - 80 && x < cam + VIEW_W + 80;
    for (const c of L.coins){ if (c.got || !vis(c.x)) continue; const sx = Math.abs(Math.cos(time*4 + c.x*.01)); ctx.fillStyle = "#FFD23F"; ctx.beginPath(); ctx.ellipse(c.x, c.y, 10*Math.max(.25, sx), 12, 0, 0, TAU); ctx.fill(); ctx.strokeStyle = "#C99400"; ctx.lineWidth = 2; ctx.stroke(); }
    for (const s of L.stars){ if (s.got || !vis(s.x)) continue; drawStar(s.x, s.y + Math.sin(time*3 + s.x)*3, 17, Math.sin(time*2)*.2, "#FFE45C"); }
    for (const s of L.springs){
      if (!vis(s.x)) continue;
      const k = 1 - s.squash*.5;
      ctx.fillStyle = "#7E8796"; ctx.fillRect(s.x + 6, s.y + 14, T - 12, 4);
      ctx.strokeStyle = "#5B6270"; ctx.lineWidth = 3; ctx.beginPath();
      for (let i = 0; i <= 4; i++){ const yy = s.y + 14 - i*3*k; ctx.lineTo(s.x + (i % 2 ? 12 : T - 12), yy); } ctx.stroke();
      ctx.fillStyle = "#E84A3C"; ctx.beginPath(); ctx.roundRect(s.x + 4, s.y + 14 - 14*k - 6, T - 8, 8, 4); ctx.fill();
    }
    for (const c of L.checks){
      if (!vis(c.x)) continue;
      ctx.fillStyle = "#6B7280"; ctx.fillRect(c.x + 18, c.y - T + 6, 4, 2*T - 6);
      ctx.fillStyle = c.on ? "#FF8A3D" : "#C8CDD6";
      ctx.beginPath(); ctx.moveTo(c.x + 22, c.y - T + 8); ctx.lineTo(c.x + 44, c.y - T + 18); ctx.lineTo(c.x + 22, c.y - T + 28); ctx.closePath(); ctx.fill();
    }
    const g = L.goal;
    if (g && vis(g.x)){
      ctx.fillStyle = "#F5F7FF"; ctx.fillRect(g.x + 12, g.y, 6, g.h);
      ctx.fillStyle = "#FFD23F"; ctx.beginPath(); ctx.arc(g.x + 15, g.y, 8, 0, TAU); ctx.fill();
      const wv = RM ? 0 : Math.sin(time*5)*5;
      ctx.fillStyle = "#2DB75A"; ctx.beginPath(); ctx.moveTo(g.x + 18, g.y + 6); ctx.quadraticCurveTo(g.x + 44, g.y + 12 + wv, g.x + 70, g.y + 20); ctx.quadraticCurveTo(g.x + 44, g.y + 30 - wv, g.x + 18, g.y + 40); ctx.closePath(); ctx.fill();
      drawStar(g.x + 40, g.y + 23, 8, 0, "#FFE45C");
    }
    for (const e of L.enemies){
      if (!vis(e.x)) continue;
      if (!e.alive){
        if (e.dead > 0){ ctx.globalAlpha = e.dead*2; ctx.fillStyle = e.kind === "bat" ? "#4A3A66" : "#7E57C2"; ctx.beginPath(); ctx.ellipse(e.x + e.w/2, e.y + e.h - 4, e.w/2 + 4, 5, 0, 0, TAU); ctx.fill(); ctx.globalAlpha = 1; }
        continue;
      }
      if (e.kind === "beetle"){
        const f = e.vx > 0 ? 1 : -1, leg = Math.sin(time*16 + e.x*.1)*3;
        ctx.strokeStyle = "#2B2140"; ctx.lineWidth = 3;
        for (const lx of [8, 16, 24]){ ctx.beginPath(); ctx.moveTo(e.x + lx, e.y + 16); ctx.lineTo(e.x + lx + leg, e.y + 25); ctx.stroke(); }
        ctx.fillStyle = "#7E57C2"; ctx.beginPath(); ctx.ellipse(e.x + e.w/2, e.y + 12, e.w/2, 12, 0, Math.PI, 0); ctx.lineTo(e.x + e.w, e.y + 18); ctx.lineTo(e.x, e.y + 18); ctx.closePath(); ctx.fill();
        ctx.fillStyle = "#B39DDB"; ctx.beginPath(); ctx.arc(e.x + e.w/2 - 6, e.y + 6, 3, 0, TAU); ctx.arc(e.x + e.w/2 + 5, e.y + 9, 2.5, 0, TAU); ctx.fill();
        ctx.fillStyle = "#2B2140"; ctx.beginPath(); ctx.arc(e.x + e.w/2 + f*16, e.y + 12, 7, 0, TAU); ctx.fill();
        ctx.fillStyle = "#fff"; ctx.beginPath(); ctx.arc(e.x + e.w/2 + f*18, e.y + 10, 2.5, 0, TAU); ctx.fill();
      } else {
        const flap = Math.sin(time*14 + e.t)*10;
        ctx.fillStyle = "#3D2E57";
        ctx.beginPath(); ctx.moveTo(e.x + 15, e.y + 10); ctx.quadraticCurveTo(e.x - 6, e.y + 2 - flap, e.x - 14, e.y + 14); ctx.quadraticCurveTo(e.x, e.y + 10, e.x + 15, e.y + 16); ctx.fill();
        ctx.beginPath(); ctx.moveTo(e.x + 15, e.y + 10); ctx.quadraticCurveTo(e.x + 36, e.y + 2 - flap, e.x + 44, e.y + 14); ctx.quadraticCurveTo(e.x + 30, e.y + 10, e.x + 15, e.y + 16); ctx.fill();
        ctx.beginPath(); ctx.arc(e.x + 15, e.y + 12, 9, 0, TAU); ctx.fill();
        ctx.fillStyle = "#FFD23F"; ctx.beginPath(); ctx.arc(e.x + 11, e.y + 11, 2.5, 0, TAU); ctx.arc(e.x + 19, e.y + 11, 2.5, 0, TAU); ctx.fill();
      }
    }
  }

  function drawFox(){
    if (state === "dying") return;
    if (P.inv > 0 && Math.floor(time*20) % 2 === 0 && state === "play") return;
    const x = P.x + PH.w/2, y = P.y, f = P.face, run = P.onGround && Math.abs(P.vx) > 20, ph = P.anim;
    ctx.save(); ctx.translate(x, y); ctx.scale(f, 1);
    // kuyruk
    const wag = Math.sin(time*8)*.2;
    ctx.save(); ctx.translate(-10, 22); ctx.rotate(-.6 + wag + (P.onGround ? 0 : -.4));
    ctx.fillStyle = "#FF8A3D"; ctx.beginPath(); ctx.ellipse(-12, 0, 16, 7, 0, 0, TAU); ctx.fill();
    ctx.fillStyle = "#FFF4E0"; ctx.beginPath(); ctx.ellipse(-24, 0, 6, 5, 0, 0, TAU); ctx.fill();
    ctx.restore();
    // bacaklar
    ctx.strokeStyle = "#5A3418"; ctx.lineWidth = 5; ctx.lineCap = "round";
    const l1 = run ? Math.sin(ph)*7 : 0, l2 = run ? -Math.sin(ph)*7 : 0;
    if (P.onGround){
      ctx.beginPath(); ctx.moveTo(-5, 28); ctx.lineTo(-5 + l1, 36); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(6, 28); ctx.lineTo(6 + l2, 36); ctx.stroke();
    } else {
      ctx.beginPath(); ctx.moveTo(-5, 28); ctx.lineTo(-9, 33); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(6, 28); ctx.lineTo(10, 32); ctx.stroke();
    }
    // gövde
    ctx.fillStyle = "#FF8A3D"; ctx.beginPath(); ctx.ellipse(0, 22, 12, 10, 0, 0, TAU); ctx.fill();
    ctx.fillStyle = "#FFF4E0"; ctx.beginPath(); ctx.ellipse(4, 25, 6, 6, 0, 0, TAU); ctx.fill();
    // baş
    ctx.fillStyle = "#FF8A3D";
    ctx.beginPath(); ctx.moveTo(-8, 4); ctx.lineTo(-6, -8); ctx.lineTo(1, 2); ctx.fill();
    ctx.beginPath(); ctx.moveTo(4, 2); ctx.lineTo(9, -8); ctx.lineTo(12, 5); ctx.fill();
    ctx.beginPath(); ctx.ellipse(2, 9, 11, 9, 0, 0, TAU); ctx.fill();
    ctx.beginPath(); ctx.moveTo(8, 6); ctx.lineTo(20, 11); ctx.lineTo(8, 15); ctx.fill();
    ctx.fillStyle = "#FFF4E0"; ctx.beginPath(); ctx.moveTo(6, 12); ctx.lineTo(20, 11); ctx.lineTo(8, 17); ctx.fill();
    ctx.fillStyle = "#2B1A0E"; ctx.beginPath(); ctx.arc(20, 11, 2.5, 0, TAU); ctx.fill();
    ctx.beginPath(); ctx.arc(7, 7, 2.2, 0, TAU); ctx.fill();
    ctx.restore();
  }

  function drawHud(){
    ctx.save();
    ctx.font = `700 22px Fredoka, "Arial Rounded MT Bold", sans-serif`; ctx.textBaseline = "middle";
    ctx.fillStyle = "rgba(10,20,15,.45)"; ctx.beginPath(); ctx.roundRect(12, 10, 470, 40, 12); ctx.fill();
    let x = 26;
    for (let k = 0; k < 3; k++){ ctx.fillStyle = k < hearts ? "#FF4D6D" : "rgba(255,255,255,.25)"; heart(x + 10, 30, 9); x += 26; }
    x += 10;
    ctx.fillStyle = "#FFD23F"; ctx.beginPath(); ctx.arc(x + 8, 30, 9, 0, TAU); ctx.fill();
    ctx.fillStyle = "#FFFFFF"; ctx.fillText(`${coinsGot}/${L.coins.length}`, x + 24, 32); x += 96;
    L.stars.forEach(s => { drawStar(x + 10, 30, 10, 0, s.got ? "#FFE45C" : "rgba(255,255,255,.25)"); x += 26; });
    x += 12;
    ctx.fillStyle = "#FFFFFF"; ctx.fillText(fmtTime(levelTime), x, 32);
    ctx.textAlign = "right"; ctx.fillStyle = "rgba(10,20,15,.45)"; ctx.beginPath(); ctx.roundRect(VIEW_W - 262, 10, 250, 40, 12); ctx.fill();
    ctx.fillStyle = "#FFFFFF"; ctx.fillText(`${L.i + 1}. ${L.def.name}`, VIEW_W - 26, 32);
    for (const q of popups){ ctx.globalAlpha = clamp(q.life*2, 0, 1); ctx.textAlign = "center"; ctx.fillStyle = q.c; ctx.fillText(q.text, q.x - cam, q.y); }
    ctx.globalAlpha = 1;
    ctx.restore();
  }
  function heart(x, y, s){ ctx.beginPath(); ctx.moveTo(x, y + s*.9); ctx.bezierCurveTo(x - s*1.6, y - s*.2, x - s*.6, y - s*1.3, x, y - s*.35); ctx.bezierCurveTo(x + s*.6, y - s*1.3, x + s*1.6, y - s*.2, x, y + s*.9); ctx.fill(); }

  function draw(){
    const d = view.dpr;
    ctx.setTransform(d, 0, 0, d, 0, 0);
    ctx.clearRect(0, 0, cv.width, cv.height);
    ctx.save(); ctx.translate(view.ox, view.oy); ctx.scale(view.s, view.s);
    const th = L ? L.theme : THEMES.forest;
    drawBackground(th);
    if (L){
      ctx.save(); ctx.translate(-Math.round(cam), 0);
      drawTiles(th); drawThings(); drawFox();
      for (const q of particles){ ctx.globalAlpha = clamp(q.life/q.max*1.5, 0, 1); ctx.fillStyle = q.c; ctx.beginPath(); ctx.arc(q.x, q.y, q.r, 0, TAU); ctx.fill(); }
      ctx.globalAlpha = 1;
      ctx.restore();
      if (state !== "menu") drawHud();
    }
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
  if ("ResizeObserver" in window) new ResizeObserver(resize).observe(stage);
  else window.addEventListener("resize", resize);
  resize();
  L = parseLevel(0); P = newPlayer(L); cam = 0;
  openMenu();
  requestAnimationFrame(frame);
})();
