/* El Ele Labirent — tek top, iki kumanda: biri yukarı-aşağı, öbürü sağa-sola */
(function(){
  "use strict";

  // # duvar · . boşluk · S başlangıç · G kapı · * yıldız · O delik   (16 sütun × 11 satır)
  const LEVELS = [
    ["################",
     "#S.............#",
     "#..............#",
     "#......*.......#",
     "#..............#",
     "#..............#",
     "#..............#",
     "#..............#",
     "#.............G#",
     "#..............#",
     "################"],

    ["################",
     "#S.............#",
     "#......#.......#",
     "#......#...*...#",
     "#......#.......#",
     "#......#.......#",
     "#......#.......#",
     "#..*...#.......#",
     "#......#......G#",
     "#..............#",
     "################"],

    ["################",
     "#S.............#",
     "#..##..##..##..#",
     "#..##..##..##..#",
     "#.......O......#",
     "#..##..##..##..#",
     "#..##..##..##..#",
     "#...*......*...#",
     "#..............#",
     "#.............G#",
     "################"],

    ["################",
     "#S....#........#",
     "#.....#...*....#",
     "#.....#........#",
     "#..O..#....O...#",
     "#.....######...#",
     "#.....#........#",
     "#..*..#........#",
     "#.....#.......G#",
     "#..............#",
     "################"],

    ["################",
     "#S...........*.#",
     "#.############.#",
     "#..............#",
     "#.############.#",
     "#*......O......#",
     "#.############.#",
     "#..............#",
     "#.############.#",
     "#*...........G.#",
     "################"],

    ["################",
     "#S.............#",
     "#..##..##..##..#",
     "#.O..........O.#",
     "#..##..##..##..#",
     "#....*....*....#",
     "#..##..##..##..#",
     "#.O..........O.#",
     "#..##..##..##..#",
     "#.............G#",
     "################"],

    ["################",
     "#S....#...#....#",
     "#.....#...#....#",
     "#..O..#.*.#..O.#",
     "#.....#...#....#",
     "#..#..#...#..#.#",
     "#.....#...#....#",
     "#..*..#...#..*.#",
     "#.....#...#....#",
     "#.............G#",
     "################"],

    ["################",
     "#S..#......#...#",
     "#...#..O...#...#",
     "#...#......#.*.#",
     "#........#.....#",
     "#..O..#..#..O..#",
     "#.....#........#",
     "#.*.#......#...#",
     "#...#...O..#..*#",
     "#...#......#..G#",
     "################"],

    ["################",
     "#S...#....#....#",
     "#....#....#....#",
     "#..*.#..O.#.*..#",
     "#....#....#....#",
     "#..............#",
     "#....#....#....#",
     "#.O..#..*.#..O.#",
     "#....#....#..*.#",
     "#....#....#...G#",
     "################"],

    ["################",
     "#S..#...O..#..*#",
     "#...#......#...#",
     "#.O.#..##..#.O.#",
     "#...#..##..#...#",
     "#.....*..*.....#",
     "#...#..##..#...#",
     "#.O.#..##..#.O.#",
     "#...#......#...#",
     "#*..#...O..#..G#",
     "################"]
  ];

  const COLS = 16, ROWS = 11;
  const SPEED = [                                   // hücre biriminde: ivme, sürtünme, en yüksek hız
    {acc:9,    fric:3.4, max:5.2},
    {acc:11.5, fric:2.4, max:7},
    {acc:13.5, fric:1.5, max:9}
  ];
  const BALL_R = .30, HOLE_R = .34, FALL_R = .20, STAR_R = .40, GOAL_R = .34, BOUNCE = .34;
  const STEP = 1/120;
  const SETTINGS_KEY = "el-ele-ayar", SOUND_KEY = "el-ele-ses", SAVE_KEY = "el-ele-kayit";
  const RM = window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches;
  const TAU = Math.PI*2;

  const $ = id => document.getElementById(id);
  const stage = $("stage"), cv = $("cv"), ctx = cv.getContext("2d");
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

  let settings = {a:"Egemen", b:"Enes", speed:1};
  try {
    const s = JSON.parse(localStorage.getItem(SETTINGS_KEY) || "null");
    if (s) settings = {a:String(s.a || "Egemen").slice(0, 12), b:String(s.b || "Enes").slice(0, 12), speed:clamp(s.speed | 0, 0, 2)};
  } catch(e) {}
  let save = {done:[], best:{}, falls:0};
  try { const s = JSON.parse(localStorage.getItem(SAVE_KEY) || "null"); if (s && Array.isArray(s.done)) save = {done:s.done, best:s.best || {}, falls:s.falls | 0}; } catch(e) {}
  const store = () => { try { localStorage.setItem(SAVE_KEY, JSON.stringify(save)); } catch(e) {} };
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
    bump(v){ noise(.05, 300 + v*60, Math.min(.18, .03 + v*.02), "lowpass"); },
    star(){ [784, 1046.5].forEach((f, i) => tone(f, .16, "triangle", .08, null, i*.07)); },
    open(){ [523.25, 659.25, 784].forEach((f, i) => tone(f, .2, "sine", .07, null, i*.08)); },
    fall(){ tone(420, .45, "sine", .09, 90); noise(.3, 300, .12, "lowpass"); },
    win(){ [523.25, 659.25, 784, 1046.5, 1318.5].forEach((f, i) => tone(f, .26, "triangle", .11, null, i*.1)); },
    all(){ [659.25, 784, 1046.5, 1318.5, 1568].forEach((f, i) => tone(f, .32, "triangle", .12, null, i*.13)); }
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

  /* ---------- bölüm ---------- */
  function parse(lv){
    const src = LEVELS[lv], wall = [], stars = [], holes = [];
    let start = null, goal = null;
    for (let y = 0; y < ROWS; y++){
      for (let x = 0; x < COLS; x++){
        const ch = src[y][x];
        wall.push(ch === "#" ? 1 : 0);
        if (ch === "S") start = {x:x + .5, y:y + .5};
        else if (ch === "G") goal = {x:x + .5, y:y + .5};
        else if (ch === "*") stars.push({x:x + .5, y:y + .5, got:false});
        else if (ch === "O") holes.push({x:x + .5, y:y + .5});
      }
    }
    return {wall, stars, holes, start, goal};
  }
  const isWall = (L, cx, cy) => (cx < 0 || cy < 0 || cx >= COLS || cy >= ROWS) ? 1 : L.wall[cy*COLS + cx];

  /* ---------- oyun ---------- */
  let G = null;
  const input = {up:false, down:false, left:false, right:false};

  function loadLevel(lv){
    const L = parse(lv);
    G = {
      lv, L, b:{x:L.start.x, y:L.start.y, vx:0, vy:0},
      open:false, done:false, falling:0, t:0, falls:0, acc:0,
      shake:0, sparks:[], started:false
    };
    banner(null);
    $("end").hidden = true;
    renderHud();
    draw();
  }

  function resetBall(){
    G.b.x = G.L.start.x; G.b.y = G.L.start.y; G.b.vx = 0; G.b.vy = 0;
  }

  function renderHud(){
    const got = G.L.stars.filter(s => s.got).length;
    $("lvn").textContent = G.lv + 1;
    $("stars").textContent = got + "/" + G.L.stars.length;
    $("falls").textContent = G.falls;
    $("clock").textContent = fmt(G.t);
    $("who-a").textContent = settings.a;
    $("who-b").textContent = settings.b;
  }
  const fmt = s => Math.floor(s/60) + ":" + String(Math.floor(s) % 60).padStart(2, "0");

  let bannerT = null;
  function banner(text){
    const el = $("banner");
    clearTimeout(bannerT);
    if (!text){ el.hidden = true; return; }
    el.textContent = text; el.hidden = false;
    bannerT = setTimeout(() => { el.hidden = true; }, 1400);
  }

  function step(dt){
    const b = G.b, S = SPEED[settings.speed];
    const ax = (input.right ? 1 : 0) - (input.left ? 1 : 0);
    const ay = (input.down ? 1 : 0) - (input.up ? 1 : 0);
    b.vx += ax*S.acc*dt; b.vy += ay*S.acc*dt;
    const f = Math.exp(-S.fric*dt);
    b.vx *= f; b.vy *= f;
    const sp = Math.hypot(b.vx, b.vy);
    if (sp > S.max){ b.vx *= S.max/sp; b.vy *= S.max/sp; }
    b.x += b.vx*dt; b.y += b.vy*dt;
    collide();
    pickups();
  }

  function collide(){
    const b = G.b, L = G.L;
    const c0 = Math.floor(b.x - BALL_R), c1 = Math.floor(b.x + BALL_R);
    const r0 = Math.floor(b.y - BALL_R), r1 = Math.floor(b.y + BALL_R);
    for (let cy = r0; cy <= r1; cy++){
      for (let cx = c0; cx <= c1; cx++){
        if (!isWall(L, cx, cy)) continue;
        const nx = clamp(b.x, cx, cx + 1), ny = clamp(b.y, cy, cy + 1);
        let dx = b.x - nx, dy = b.y - ny, d = Math.hypot(dx, dy);
        if (d >= BALL_R) continue;
        if (d < 1e-6){                                    // merkez kutunun içinde: en yakın kenardan çık
          const left = b.x - cx, right = cx + 1 - b.x, up = b.y - cy, down = cy + 1 - b.y;
          const m = Math.min(left, right, up, down);
          dx = m === left ? -1 : m === right ? 1 : 0;
          dy = m === up ? -1 : m === down ? 1 : 0;
          d = 0.0001;
        }
        const ux = dx/d || 0, uy = dy/d || 0, push = BALL_R - d;
        b.x += ux*push; b.y += uy*push;
        const vn = b.vx*ux + b.vy*uy;
        if (vn < 0){
          b.vx -= (1 + BOUNCE)*vn*ux; b.vy -= (1 + BOUNCE)*vn*uy;
          const hit = -vn;
          if (hit > .8){ sfx.bump(hit); if (!RM) G.shake = Math.min(1, hit/6); }
        }
      }
    }
  }

  function pickups(){
    const b = G.b, L = G.L;
    for (const s of L.stars){
      if (s.got) continue;
      if (Math.hypot(b.x - s.x, b.y - s.y) < STAR_R){
        s.got = true; sfx.star(); spark(s.x, s.y, "#FFD166");
        renderHud();
        if (L.stars.every(q => q.got)){ G.open = true; sfx.open(); banner("Kapı açıldı!"); }
      }
    }
    for (const h of L.holes){
      if (Math.hypot(b.x - h.x, b.y - h.y) < FALL_R){ fall(); return; }
    }
    if (G.open && !G.done && Math.hypot(b.x - L.goal.x, b.y - L.goal.y) < GOAL_R) finish();
  }

  function fall(){
    G.falls++; save.falls++; store();
    sfx.fall();
    spark(G.b.x, G.b.y, "#4ECDC4");
    resetBall();
    banner("Deliğe düştü!");
    renderHud();
  }

  function spark(x, y, col){
    if (RM) return;
    for (let i = 0; i < 12; i++){
      const a = Math.random()*TAU, v = .8 + Math.random()*2.6;
      G.sparks.push({x, y, vx:Math.cos(a)*v, vy:Math.sin(a)*v, life:.5 + Math.random()*.4, max:.9, col});
    }
  }

  function finish(){
    G.done = true;
    const sec = Math.floor(G.t);
    const key = String(G.lv);
    const old = save.best[key];
    const rec = !old || sec < old;
    if (save.done.indexOf(G.lv) < 0) save.done.push(G.lv);
    if (rec) save.best[key] = sec;
    store();
    sfx.win();
    const last = G.lv === LEVELS.length - 1;
    if (last) sfx.all();
    setTimeout(() => {
      $("end-emoji").textContent = last ? "🎉" : (rec ? "🥇" : "🏆");
      $("end-title").textContent = last ? "Bütün bölümleri bitirdiniz!" : (rec ? "Yeni rekor!" : "Bölüm tamam!");
      $("end-time").textContent = fmt(sec);
      $("end-note").textContent = G.falls === 0
        ? "Hiç deliğe düşmediniz. Tam uyum!"
        : `${G.falls} kez deliğe düştünüz. Bölüm rekoru: ${fmt(save.best[key])}`;
      $("next").textContent = last ? "Baştan oyna" : "Sıradaki bölüm";
      $("end").hidden = false;
      $("next").focus();
    }, 600);
  }

  /* ---------- güncelleme ---------- */
  let acc = 0;
  function update(dt){
    if (!G) return;
    if (G.shake > 0) G.shake = Math.max(0, G.shake - dt*3);
    for (let i = G.sparks.length - 1; i >= 0; i--){
      const s = G.sparks[i];
      s.x += s.vx*dt; s.y += s.vy*dt; s.vx *= .94; s.vy *= .94; s.life -= dt;
      if (s.life <= 0) G.sparks.splice(i, 1);
    }
    if (G.done || !$("setup").hidden) return;
    const moving = input.up || input.down || input.left || input.right;
    if (moving) G.started = true;
    if (G.started) G.t += dt;
    acc += dt;
    let guard = 0;
    while (acc >= STEP && guard++ < 400 && !G.done){ step(STEP); acc -= STEP; }
    if (acc > .3) acc = 0;
    if (Math.floor(G.t) !== Math.floor(G.t - dt)) $("clock").textContent = fmt(G.t);
  }

  /* ---------- çizim ---------- */
  const view = {cs:40, ox:0, oy:0, dpr:1};
  function resize(){
    const r = stage.getBoundingClientRect();
    view.dpr = Math.min(window.devicePixelRatio || 1, 2);
    cv.width = Math.round(r.width*view.dpr); cv.height = Math.round(r.height*view.dpr);
    view.cs = Math.max(8, Math.min((r.width - 12)/COLS, (r.height - 12)/ROWS));
    view.ox = (r.width - COLS*view.cs)/2;
    view.oy = (r.height - ROWS*view.cs)/2;
  }

  function draw(){
    if (!G) return;
    const cs = view.cs, d = view.dpr;
    ctx.setTransform(d, 0, 0, d, 0, 0);
    ctx.clearRect(0, 0, cv.width, cv.height);
    ctx.save();
    ctx.translate(view.ox, view.oy);
    if (G.shake > 0) ctx.translate((Math.random() - .5)*G.shake*6, (Math.random() - .5)*G.shake*6);
    const L = G.L;
    // zemin
    ctx.fillStyle = "#14293A";
    ctx.fillRect(0, 0, COLS*cs, ROWS*cs);
    ctx.fillStyle = "rgba(255,255,255,.028)";
    for (let y = 0; y < ROWS; y++) for (let x = (y % 2); x < COLS; x += 2) ctx.fillRect(x*cs, y*cs, cs, cs);
    // duvarlar
    for (let y = 0; y < ROWS; y++) for (let x = 0; x < COLS; x++){
      if (!L.wall[y*COLS + x]) continue;
      ctx.fillStyle = "#24455E";
      ctx.beginPath(); ctx.roundRect(x*cs + 1, y*cs + 1, cs - 2, cs - 2, cs*.18); ctx.fill();
      ctx.fillStyle = "rgba(255,255,255,.10)";
      ctx.beginPath(); ctx.roundRect(x*cs + 1, y*cs + 1, cs - 2, (cs - 2)*.35, cs*.18); ctx.fill();
    }
    // delikler
    L.holes.forEach(h => {
      const g = ctx.createRadialGradient(h.x*cs, h.y*cs, cs*.05, h.x*cs, h.y*cs, HOLE_R*cs);
      g.addColorStop(0, "#04090D"); g.addColorStop(1, "#0B1620");
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.arc(h.x*cs, h.y*cs, HOLE_R*cs, 0, TAU); ctx.fill();
      ctx.strokeStyle = "rgba(0,0,0,.6)"; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(h.x*cs, h.y*cs, HOLE_R*cs, 0, TAU); ctx.stroke();
    });
    // kapı
    const gp = L.goal;
    ctx.fillStyle = G.open ? "#4ECDC4" : "#2C4C5E";
    ctx.beginPath(); ctx.roundRect((gp.x - .42)*cs, (gp.y - .42)*cs, cs*.84, cs*.84, cs*.16); ctx.fill();
    ctx.fillStyle = G.open ? "#0B3B37" : "#16303E";
    ctx.beginPath(); ctx.roundRect((gp.x - .28)*cs, (gp.y - .3)*cs, cs*.56, cs*.6, cs*.1); ctx.fill();
    if (G.open){
      ctx.fillStyle = "#FFD166";
      ctx.beginPath(); ctx.arc(gp.x*cs + cs*.16, gp.y*cs, cs*.05, 0, TAU); ctx.fill();
    }
    // yıldızlar
    L.stars.forEach(s => {
      if (s.got) return;
      ctx.save(); ctx.translate(s.x*cs, s.y*cs); ctx.rotate(Math.sin(Date.now()/700 + s.x)*.16);
      ctx.fillStyle = "#FFD166";
      ctx.beginPath();
      for (let i = 0; i < 10; i++){
        const a = -Math.PI/2 + i*Math.PI/5, rr = (i % 2 ? .13 : .3)*cs;
        i ? ctx.lineTo(Math.cos(a)*rr, Math.sin(a)*rr) : ctx.moveTo(Math.cos(a)*rr, Math.sin(a)*rr);
      }
      ctx.closePath(); ctx.fill();
      ctx.restore();
    });
    // top
    const b = G.b;
    ctx.fillStyle = "rgba(0,0,0,.35)";
    ctx.beginPath(); ctx.ellipse(b.x*cs, (b.y + .18)*cs, BALL_R*cs*.95, BALL_R*cs*.5, 0, 0, TAU); ctx.fill();
    const bg = ctx.createRadialGradient((b.x - .1)*cs, (b.y - .12)*cs, cs*.04, b.x*cs, b.y*cs, BALL_R*cs);
    bg.addColorStop(0, "#FFF3D6"); bg.addColorStop(.55, "#FFD166"); bg.addColorStop(1, "#D79B1F");
    ctx.fillStyle = bg;
    ctx.beginPath(); ctx.arc(b.x*cs, b.y*cs, BALL_R*cs, 0, TAU); ctx.fill();
    // eğim okları
    const ax = (input.right ? 1 : 0) - (input.left ? 1 : 0), ay = (input.down ? 1 : 0) - (input.up ? 1 : 0);
    if (ax || ay){
      ctx.strokeStyle = "rgba(255,255,255,.55)"; ctx.lineWidth = Math.max(2, cs*.07); ctx.lineCap = "round";
      ctx.beginPath();
      ctx.moveTo(b.x*cs, b.y*cs);
      ctx.lineTo((b.x + ax*.8)*cs, (b.y + ay*.8)*cs);
      ctx.stroke(); ctx.lineCap = "butt";
    }
    // parıltılar
    G.sparks.forEach(s => {
      ctx.globalAlpha = clamp(s.life/s.max, 0, 1);
      ctx.fillStyle = s.col;
      ctx.beginPath(); ctx.arc(s.x*cs, s.y*cs, cs*.07, 0, TAU); ctx.fill();
    });
    ctx.globalAlpha = 1;
    ctx.restore();
  }

  /* ---------- kumandalar ---------- */
  function bindKey(id, dir){
    const el = $(id);
    const on = e => { e.preventDefault(); audio(); input[dir] = true; el.classList.add("on"); };
    const off = e => { if (e) e.preventDefault(); input[dir] = false; el.classList.remove("on"); };
    el.addEventListener("pointerdown", on);
    el.addEventListener("pointerup", off);
    el.addEventListener("pointercancel", off);
    el.addEventListener("pointerleave", off);
    el.addEventListener("contextmenu", e => e.preventDefault());
  }
  bindKey("k-up", "up"); bindKey("k-down", "down"); bindKey("k-left", "left"); bindKey("k-right", "right");
  const KEYMAP = {w:"up", W:"up", s:"down", S:"down", ArrowUp:"up", ArrowDown:"down", ArrowLeft:"left", ArrowRight:"right",
                  a:"left", A:"left", d:"right", D:"right"};
  window.addEventListener("keydown", e => {
    if (!$("setup").hidden || e.target.tagName === "INPUT") return;
    if (!$("end").hidden){ if (e.key === "Enter"){ e.preventDefault(); $("next").click(); } return; }
    const k = KEYMAP[e.key];
    if (k){ e.preventDefault(); audio(); input[k] = true; $("k-" + k).classList.add("on"); }
    else if (e.key === "r" || e.key === "R"){ e.preventDefault(); loadLevel(G.lv); }
  });
  window.addEventListener("keyup", e => {
    const k = KEYMAP[e.key];
    if (k){ input[k] = false; $("k-" + k).classList.remove("on"); }
  });
  window.addEventListener("blur", () => {
    ["up", "down", "left", "right"].forEach(k => { input[k] = false; $("k-" + k).classList.remove("on"); });
  });

  /* ---------- düğmeler ---------- */
  $("retry").addEventListener("click", () => { audio(); loadLevel(G.lv); });
  $("end-retry").addEventListener("click", () => { audio(); $("end").hidden = true; loadLevel(G.lv); });
  $("next").addEventListener("click", () => {
    audio(); $("end").hidden = true;
    loadLevel(G.lv === LEVELS.length - 1 ? 0 : G.lv + 1);
  });
  function drawLevels(){
    const cur = G ? G.lv : 0;
    $("levels").innerHTML = LEVELS.map((_, i) => {
      const done = save.done.indexOf(i) >= 0;
      const locked = i > 0 && save.done.indexOf(i - 1) < 0;
      return `<button type="button" class="lvb${done ? " done" : ""}${locked ? " locked" : ""}${i === cur ? " cur" : ""}" data-i="${i}"${locked ? " disabled" : ""}>${i + 1}</button>`;
    }).join("");
  }
  $("levels").addEventListener("click", e => {
    const b = e.target.closest(".lvb");
    if (!b || b.disabled) return;
    document.querySelectorAll(".lvb").forEach(x => x.classList.remove("cur"));
    b.classList.add("cur");
  });
  function openSetup(){
    $("pn-a").value = settings.a; $("pn-b").value = settings.b;
    const r = document.querySelector(`input[name="speed"][value="${settings.speed}"]`);
    if (r) r.checked = true;
    drawLevels();
    $("end").hidden = true;
    $("setup").hidden = false;
  }
  $("open-setup").addEventListener("click", openSetup);
  $("setup-form").addEventListener("submit", e => {
    e.preventDefault(); audio();
    settings.a = ($("pn-a").value || "").trim().slice(0, 12) || "Egemen";
    settings.b = ($("pn-b").value || "").trim().slice(0, 12) || "Enes";
    const sp = document.querySelector('input[name="speed"]:checked');
    settings.speed = sp ? +sp.value : 1;
    try { localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings)); } catch(e) {}
    const cur = document.querySelector(".lvb.cur");
    $("setup").hidden = true;
    loadLevel(cur ? +cur.dataset.i : (G ? G.lv : 0));
  });

  /* ---------- döngü ---------- */
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
  document.addEventListener("visibilitychange", () => { last = performance.now(); });
  if ("ResizeObserver" in window) new ResizeObserver(resize).observe(stage);
  else window.addEventListener("resize", resize);
  resize();
  loadLevel(save.done.length ? Math.min(Math.max.apply(null, save.done) + 1, LEVELS.length - 1) : 0);
  openSetup();                       // ilk açılışta kuralları ve isimleri göster
  requestAnimationFrame(frame);
})();
