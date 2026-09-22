(() => {
  "use strict";
  const $ = id => document.getElementById(id);

  /* ---------- sabitler ---------- */
  const W = 480, H = 720;
  const COLS = 12, BW = 36, BH = 18, GAP = 3, TOP = 64;
  const X0 = (W - COLS * BW - (COLS - 1) * GAP) / 2;
  const PADDLE_Y = H - 46, PADDLE_H = 14, PADDLE_W = 84;
  const BALL_R = 7;
  const BASE_SPEED = 360, MAX_SPEED = 640;
  const CAP_TYPES = {
    G: {c:"#2EC4B6", t:"Geniş raket"},
    "3": {c:"#4CC9F0", t:"Üç top"},
    Y: {c:"#9B5DE5", t:"Yavaş top"},
    "+": {c:"#F15BB5", t:"Can +1"},
    K: {c:"#E63946", t:"Küçük raket"}
  };
  const BRICK_COL = {1:"#4CC9F0", 2:"#F7B801", 3:"#F35B04", "*":"#B5179E", "#":"#8D99AE"};

  // . boş · 1-3 vuruş · * kapsül tuğlası · # çelik (kırılmaz)
  const LEVELS = [
    ["............",
     "111111111111",
     "111111111111",
     "222222222222",
     "111*1111*111",
     "111111111111"],
    [".....33.....",
     "....2222....",
     "...111111...",
     "..11*11*11..",
     ".1111111111.",
     "222222222222"],
    ["222222222222",
     "2##22##22##2",
     "111111111111",
     "1*11111111*1",
     "............",
     "##...##...##"],
    ["1.2.1.2.1.2.",
     ".2.1.2.1.2.1",
     "3.1.3.1.3.1.",
     ".1.3.1.3.1.3",
     "1.2.1*2.1.2.",
     ".2.1.2.1.2.1"],
    [".....33.....",
     "....3223....",
     "...322223...",
     "..32211223..",
     "...322223...",
     "....3*23....",
     ".....33....."],
    ["############",
     "#3333333333#",
     "#2222222222#",
     "#1111**1111#",
     "#2222222222#",
     "#..........#",
     "###......###"],
    ["333333333333",
     "............",
     "222222222222",
     "..##....##..",
     "111111111111",
     "1*111111111*",
     "111111111111"],
    ["#3#3#3#3#3#3",
     "333333333333",
     "2*22222222*2",
     "222222222222",
     "111111111111",
     "111111111111",
     "..##....##..",
     "............",
     "...##..##..."]
  ];
  const SAVE_KEY = "tugla-kirici";

  /* ---------- kayıt ---------- */
  let save = {best: 0, reached: 1};
  try { save = Object.assign(save, JSON.parse(localStorage.getItem(SAVE_KEY)) || {}); } catch (e) {}
  const store = () => { try { localStorage.setItem(SAVE_KEY, JSON.stringify(save)); } catch (e) {} };

  /* ---------- ses ---------- */
  let soundOn = true, ac = null;
  function audio(){
    if (!ac){ try { ac = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { ac = null; } }
    if (ac && ac.state === "suspended") ac.resume();
    return ac;
  }
  function tone(f1, f2, type, dur, vol, delay){
    if (!soundOn) return;
    const a = audio(); if (!a) return;
    const t = a.currentTime + (delay || 0), o = a.createOscillator(), g = a.createGain();
    o.type = type; o.frequency.setValueAtTime(f1, t); o.frequency.exponentialRampToValueAtTime(f2, t + dur * .9);
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + .01); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(a.destination); o.start(t); o.stop(t + dur + .05);
  }
  const sBrick = hp => tone(520 + hp * 140, 520 + hp * 140, "square", .06, .06);
  const sSteel = () => tone(1400, 1300, "triangle", .05, .07);
  const sPaddle = () => tone(260, 300, "square", .07, .07);
  const sCap = () => [660, 880, 1100].forEach((f, k) => tone(f, f, "triangle", .1, .12, k * .06));
  const sLose = () => tone(400, 90, "sawtooth", .5, .1);
  const sClear = () => [523, 659, 784, 1047, 1319].forEach((f, k) => tone(f, f, "triangle", .15, .14, k * .09));
  function renderSound(){
    $("ic-on").hidden = !soundOn; $("ic-off").hidden = soundOn;
    $("sound").setAttribute("aria-label", soundOn ? "Sesi kapat" : "Sesi aç");
    $("sound").setAttribute("aria-pressed", String(soundOn));
  }
  $("sound").addEventListener("click", () => { soundOn = !soundOn; renderSound(); });
  renderSound();

  /* ---------- durum ---------- */
  let G = null, timers = [];
  function later(sec, fn){ timers.push({t: sec, fn}); }

  function newGame(level){
    timers = [];
    G = {level, score: 0, lives: 3, phase: "serve", balls: [], bricks: [], caps: [], parts: [],
      paddle: {x: W / 2, w: PADDLE_W, tw: PADDLE_W}, wide: 0, small: 0, slow: 0, keys: {l: false, r: false}, loop: 0};
    loadLevel();
    ["menu", "over", "paused"].forEach(id => $(id).hidden = true);
    hud();
  }
  function loadLevel(){
    const L = LEVELS[(G.level - 1) % LEVELS.length];
    G.loop = Math.floor((G.level - 1) / LEVELS.length);
    G.bricks = [];
    L.forEach((row, r) => [...row].forEach((ch, c) => {
      if (ch === ".") return;
      const hp = ch === "#" ? Infinity : ch === "*" ? 1 : +ch + (G.loop > 0 && ch !== "3" ? 1 : 0);
      G.bricks.push({x: X0 + c * (BW + GAP), y: TOP + r * (BH + GAP), hp, max: hp, kind: ch});
    }));
    G.caps = []; G.wide = G.small = G.slow = 0;
    serve();
    toast(`Bölüm ${G.level}`);
  }
  function serve(){
    G.phase = "serve";
    G.balls = [{x: G.paddle.x, y: PADDLE_Y - BALL_R, vx: 0, vy: 0, sp: BASE_SPEED + (G.level - 1) * 12, stuck: true}];
  }
  function launch(){
    if (!G || G.phase !== "serve") return;
    const b = G.balls[0], a = (Math.random() - .5) * .6;
    b.vx = Math.sin(a); b.vy = -Math.cos(a); b.stuck = false;
    G.phase = "play";
  }

  /* ---------- güncelleme ---------- */
  function update(dt){
    for (const tm of timers) tm.t -= dt;
    const due = timers.filter(tm => tm.t <= 0); timers = timers.filter(tm => tm.t > 0); due.forEach(tm => tm.fn());
    for (const p of G.parts){ p.x += p.vx * dt; p.y += p.vy * dt; p.vy += 600 * dt; p.life -= dt; }
    G.parts = G.parts.filter(p => p.life > 0);
    if (G.phase !== "play" && G.phase !== "serve") return;

    // raket
    const P = G.paddle;
    if (G.keys.l) P.x -= 560 * dt;
    if (G.keys.r) P.x += 560 * dt;
    G.wide = Math.max(0, G.wide - dt); G.small = Math.max(0, G.small - dt); G.slow = Math.max(0, G.slow - dt);
    P.tw = PADDLE_W * (G.wide > 0 ? 1.5 : 1) * (G.small > 0 ? .65 : 1);
    P.w += (P.tw - P.w) * Math.min(1, dt * 10);
    P.x = Math.max(P.w / 2, Math.min(W - P.w / 2, P.x));

    if (G.phase === "serve"){ const b = G.balls[0]; b.x = P.x; b.y = PADDLE_Y - BALL_R; return; }

    // toplar: küçük adımlarla ilerlet, tünel olmasın
    const slowK = G.slow > 0 ? .65 : 1;
    for (const b of G.balls){
      const dist = b.sp * slowK * dt, steps = Math.max(1, Math.ceil(dist / 3));
      for (let s = 0; s < steps && !b.dead; s++) stepBall(b, dist / steps);
    }
    G.balls = G.balls.filter(b => !b.dead);
    if (!G.balls.length) loseLife();

    // kapsüller
    for (const c of G.caps){
      c.y += 150 * dt;
      if (c.y + 9 > PADDLE_Y && c.y - 9 < PADDLE_Y + PADDLE_H && Math.abs(c.x - P.x) < P.w / 2 + 16){ c.dead = true; catchCap(c.type); }
      if (c.y > H + 20) c.dead = true;
    }
    G.caps = G.caps.filter(c => !c.dead);

    if (G.phase === "play" && !G.bricks.some(b => b.hp !== Infinity)) levelClear();
  }

  function stepBall(b, d){
    b.x += b.vx * d; b.y += b.vy * d;
    const r = BALL_R;
    if (b.x < r){ b.x = r; b.vx = Math.abs(b.vx); }
    if (b.x > W - r){ b.x = W - r; b.vx = -Math.abs(b.vx); }
    if (b.y < r){ b.y = r; b.vy = Math.abs(b.vy); }
    if (b.y > H + r * 3){ b.dead = true; return; }

    // raket
    const P = G.paddle;
    if (b.vy > 0 && b.y + r >= PADDLE_Y && b.y - r <= PADDLE_Y + PADDLE_H && Math.abs(b.x - P.x) <= P.w / 2 + r){
      const rel = Math.max(-1, Math.min(1, (b.x - P.x) / (P.w / 2)));
      let a = rel * 1.05 + (Math.random() - .5) * .06;   // en fazla ~60°, hafif sapma
      if (Math.abs(a) < .08) a = a < 0 ? -.08 : .08;      // dimdik gidip çelikle raket arasında takılmasın
      b.vx = Math.sin(a); b.vy = -Math.cos(a);
      b.y = PADDLE_Y - r;
      b.sp = Math.min(MAX_SPEED, b.sp + 5);
      sPaddle();
      return;
    }

    // tuğlalar (bir adımda bir tuğla)
    for (const k of G.bricks){
      const cx = Math.max(k.x, Math.min(b.x, k.x + BW)), cy = Math.max(k.y, Math.min(b.y, k.y + BH));
      const dx = b.x - cx, dy = b.y - cy;
      if (dx * dx + dy * dy > r * r) continue;
      if (dx === 0 && dy === 0){ b.vy = -b.vy; }       // merkez içerde (olmamalı): geri dön
      else if (Math.abs(dx) > Math.abs(dy)){ b.vx = Math.sign(dx) * Math.abs(b.vx); b.x = cx + Math.sign(dx) * r; }
      else { b.vy = Math.sign(dy) * Math.abs(b.vy); b.y = cy + Math.sign(dy) * r; }
      hitBrick(k);
      break;
    }
  }

  function hitBrick(k){
    if (k.hp === Infinity){ sSteel(); return; }
    k.hp--;
    sBrick(k.hp);
    if (k.hp > 0){ G.score += 5; hud(); return; }
    G.bricks.splice(G.bricks.indexOf(k), 1);
    G.score += 10 * k.max * (1 + G.loop);
    burst(k.x + BW / 2, k.y + BH / 2, BRICK_COL[k.kind === "*" ? "*" : Math.min(3, k.max)]);
    if (k.kind === "*" || Math.random() < .1){
      const pool = ["G", "G", "3", "3", "Y", "Y", "K", "K", "+"];
      G.caps.push({x: k.x + BW / 2, y: k.y + BH / 2, type: pool[Math.random() * pool.length | 0]});
    }
    hud();
  }
  function catchCap(type){
    sCap(); toast(CAP_TYPES[type].t);
    G.score += 25;
    if (type === "G"){ G.wide = 14; G.small = 0; }
    if (type === "K"){ G.small = 10; G.wide = 0; }
    if (type === "Y") G.slow = 10;
    if (type === "+") G.lives = Math.min(6, G.lives + 1);
    if (type === "3"){
      const extra = [];
      for (const b of G.balls.slice(0, 3)){
        for (const da of [-.35, .35]){
          const a = Math.atan2(b.vx, -b.vy) + da;
          extra.push({x: b.x, y: b.y, vx: Math.sin(a), vy: -Math.abs(Math.cos(a)), sp: b.sp});
        }
      }
      G.balls.push(...extra.slice(0, 8 - G.balls.length));
    }
    hud();
  }
  function burst(x, y, c){
    for (let i = 0; i < 10; i++){
      const a = Math.random() * Math.PI * 2, s = 60 + Math.random() * 160;
      G.parts.push({x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s - 80, life: .5 + Math.random() * .3, c});
    }
  }

  function loseLife(){
    G.lives--;
    sLose();
    G.caps = []; G.wide = G.small = G.slow = 0;
    hud();
    if (G.lives <= 0){ gameOver(false); return; }
    toast(G.lives === 1 ? "Son can!" : `${G.lives} can kaldı`);
    serve();
  }
  function levelClear(){
    G.phase = "clear";
    const bonus = 100 * G.level + 50 * G.lives;
    G.score += bonus;
    sClear();
    toast(`Bölüm bitti! +${bonus}`);
    G.level++;
    save.reached = Math.max(save.reached, Math.min(G.level, LEVELS.length));
    if (G.score > save.best) save.best = G.score;
    store(); hud();
    later(1.8, loadLevel);
  }
  function gameOver(){
    G.phase = "over";
    const rec = G.score > save.best;
    if (rec) save.best = G.score;
    store(); hud();
    $("over-title").textContent = rec ? "Yeni rekor!" : "Oyun bitti";
    $("over-score").textContent = G.score;
    $("over-level").textContent = G.level;
    $("over-note").textContent = rec ? "Tebrikler, en yüksek skor senin!" : `Rekor: ${save.best}`;
    later(.6, () => { $("over").hidden = false; $("again").focus(); });
  }

  /* ---------- arayüz ---------- */
  let toastT = 0;
  function toast(t){
    const el = $("toast");
    el.textContent = t; el.hidden = false;
    el.style.animation = "none"; void el.offsetWidth; el.style.animation = "";
    clearTimeout(toastT); toastT = setTimeout(() => el.hidden = true, 1300);
  }
  function hud(){
    if (!G) return;
    $("score").textContent = G.score;
    $("best").textContent = Math.max(save.best, G.score);
    $("level").textContent = G.level;
    $("lives").textContent = "❤".repeat(Math.max(0, Math.min(G.lives, 6)));
  }
  function buildMenu(){
    const box = $("levels"); box.innerHTML = "";
    LEVELS.forEach((_, i) => {
      const b = document.createElement("button");
      b.type = "button"; b.textContent = i + 1;
      b.disabled = i + 1 > save.reached;
      b.setAttribute("aria-label", `Bölüm ${i + 1}` + (b.disabled ? " (kilitli)" : ""));
      b.addEventListener("click", () => { audio(); newGame(i + 1); });
      box.appendChild(b);
    });
    $("menu-best").textContent = save.best ? `Rekor: ${save.best} puan · Açılan bölüm: ${save.reached}/${LEVELS.length}` : "Bir bölümü bitirince sıradaki açılır.";
    $("best").textContent = save.best;
  }
  function showMenu(){ G = null; timers = []; buildMenu(); ["over", "paused"].forEach(id => $(id).hidden = true); $("menu").hidden = false; }
  function pause(on){
    if (!G || G.phase === "over" || G.phase === "clear") return;
    if (on && G.phase !== "pause"){ G.prev = G.phase; G.phase = "pause"; $("paused").hidden = false; $("resume").focus(); }
    else if (!on && G.phase === "pause"){ G.phase = G.prev; $("paused").hidden = true; }
  }
  $("pause").addEventListener("click", () => pause(true));
  $("resume").addEventListener("click", () => pause(false));
  $("to-menu").addEventListener("click", showMenu);
  $("over-menu").addEventListener("click", showMenu);
  $("again").addEventListener("click", () => { audio(); newGame(1); });

  /* ---------- girdi ---------- */
  const cv = $("cv"), stage = $("stage"), ctx = cv.getContext("2d");
  let view = {s: 1, ox: 0, oy: 0};
  function toLogical(e){
    const r = cv.getBoundingClientRect();
    return {x: (e.clientX - r.left - view.ox) / view.s, y: (e.clientY - r.top - view.oy) / view.s};
  }
  cv.addEventListener("pointerdown", e => {
    if (!G) return;
    audio();
    if (G.phase === "serve"){ G.paddle.x = toLogical(e).x; launch(); }
  });
  cv.addEventListener("pointermove", e => {
    if (!G || G.phase === "pause") return;
    G.paddle.x = toLogical(e).x;
  });
  document.addEventListener("keydown", e => {
    if (!G) return;
    if (e.key === "ArrowLeft" || e.key === "a" || e.key === "A"){ G.keys.l = true; e.preventDefault(); }
    if (e.key === "ArrowRight" || e.key === "d" || e.key === "D"){ G.keys.r = true; e.preventDefault(); }
    if (e.key === " " || e.key === "ArrowUp"){ e.preventDefault(); audio(); if (G.phase === "serve") launch(); }
    if (e.key === "p" || e.key === "P" || e.key === "Escape") pause(G.phase !== "pause");
  });
  document.addEventListener("keyup", e => {
    if (!G) return;
    if (e.key === "ArrowLeft" || e.key === "a" || e.key === "A") G.keys.l = false;
    if (e.key === "ArrowRight" || e.key === "d" || e.key === "D") G.keys.r = false;
  });
  document.addEventListener("visibilitychange", () => { if (document.hidden) pause(true); });

  /* ---------- çizim ---------- */
  function resize(){
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const cw = stage.clientWidth, ch = stage.clientHeight;
    cv.width = Math.round(cw * dpr); cv.height = Math.round(ch * dpr);
    const s = Math.min(cw / W, ch / H);
    view = {s, ox: (cw - W * s) / 2, oy: (ch - H * s) / 2, dpr};
  }
  function rr(x, y, w, h, r){ ctx.beginPath(); ctx.roundRect ? ctx.roundRect(x, y, w, h, r) : ctx.rect(x, y, w, h); }
  function draw(){
    const {s, ox, oy, dpr} = view;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.fillStyle = "#08121D"; ctx.fillRect(0, 0, cv.width, cv.height);
    ctx.setTransform(dpr * s, 0, 0, dpr * s, dpr * ox, dpr * oy);
    // alan
    ctx.fillStyle = "#0D1B2A"; ctx.fillRect(0, 0, W, H);
    ctx.strokeStyle = "rgba(76,201,240,.06)"; ctx.lineWidth = 1;
    for (let x = 40; x < W; x += 40){ ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke(); }
    for (let y = 40; y < H; y += 40){ ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke(); }
    if (!G) return;
    // tuğlalar
    for (const k of G.bricks){
      const col = k.hp === Infinity ? BRICK_COL["#"] : k.kind === "*" ? BRICK_COL["*"] : BRICK_COL[Math.min(3, k.hp)];
      ctx.fillStyle = col; rr(k.x, k.y, BW, BH, 4); ctx.fill();
      ctx.fillStyle = "rgba(255,255,255,.22)"; ctx.fillRect(k.x + 3, k.y + 2, BW - 6, 3);
      if (k.hp === Infinity){ ctx.strokeStyle = "rgba(0,0,0,.35)"; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(k.x + 8, k.y + 5); ctx.lineTo(k.x + BW - 8, k.y + BH - 5); ctx.stroke(); }
      else if (k.kind === "*"){ ctx.fillStyle = "#fff"; ctx.font = "700 13px Chakra Petch, sans-serif"; ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.fillText("★", k.x + BW / 2, k.y + BH / 2 + 1); }
      else if (k.hp > 1){ ctx.fillStyle = "rgba(13,27,42,.75)"; ctx.font = "700 12px Chakra Petch, sans-serif"; ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.fillText(k.hp, k.x + BW / 2, k.y + BH / 2 + 1); }
    }
    // parçacıklar
    for (const p of G.parts){ ctx.globalAlpha = Math.max(0, p.life * 1.6); ctx.fillStyle = p.c; ctx.fillRect(p.x - 2.5, p.y - 2.5, 5, 5); }
    ctx.globalAlpha = 1;
    // kapsüller
    for (const c of G.caps){
      ctx.fillStyle = CAP_TYPES[c.type].c; rr(c.x - 16, c.y - 9, 32, 18, 9); ctx.fill();
      ctx.fillStyle = "#fff"; ctx.font = "700 13px Chakra Petch, sans-serif"; ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.fillText(c.type, c.x, c.y + 1);
    }
    // raket
    const P = G.paddle;
    const pc = G.small > 0 ? "#E63946" : G.wide > 0 ? "#2EC4B6" : "#EAF2FB";
    ctx.shadowColor = pc; ctx.shadowBlur = 14;
    ctx.fillStyle = pc; rr(P.x - P.w / 2, PADDLE_Y, P.w, PADDLE_H, 7); ctx.fill();
    ctx.shadowBlur = 0;
    // toplar
    for (const b of G.balls){
      ctx.fillStyle = G.slow > 0 ? "#C9A7FF" : "#FFFFFF";
      ctx.shadowColor = ctx.fillStyle; ctx.shadowBlur = 10;
      ctx.beginPath(); ctx.arc(b.x, b.y, BALL_R, 0, Math.PI * 2); ctx.fill();
    }
    ctx.shadowBlur = 0;
    // süreli etkiler
    const fx = [["G", G.wide, 14], ["K", G.small, 10], ["Y", G.slow, 10]].filter(f => f[1] > 0);
    fx.forEach((f, i) => {
      const x = 12 + i * 70, y = H - 16;
      ctx.fillStyle = "rgba(255,255,255,.12)"; rr(x, y, 60, 6, 3); ctx.fill();
      ctx.fillStyle = CAP_TYPES[f[0]].c; rr(x, y, 60 * f[1] / f[2], 6, 3); ctx.fill();
    });
    if (G.phase === "serve"){
      ctx.fillStyle = "rgba(234,242,251,.7)"; ctx.font = "600 16px Chakra Petch, sans-serif"; ctx.textAlign = "center"; ctx.textBaseline = "middle";
      ctx.fillText("Dokun ya da boşluk: topu at", W / 2, PADDLE_Y - 60);
    }
  }

  let last = performance.now();
  function frame(now){
    const dt = Math.min(.033, (now - last) / 1000); last = now;
    if (G) update(dt);
    draw();
    requestAnimationFrame(frame);
  }
  if ("ResizeObserver" in window) new ResizeObserver(resize).observe(stage); else window.addEventListener("resize", resize);
  resize();
  buildMenu();
  requestAnimationFrame(frame);
})();
