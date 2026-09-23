(() => {
  "use strict";
  const $ = id => document.getElementById(id);

  /* ---------- sabitler ---------- */
  const COLS = 41, ROWS = 57, CELL = 12;
  const AW = COLS * CELL, AH = ROWS * CELL;
  const DIRS = [[0,-1],[1,0],[0,1],[-1,0]];          // 0 yukarı, 1 sağ, 2 aşağı, 3 sol
  const COL = ["#3DDBFF", "#FF8A3D"];
  const DIM = ["#1B6C86", "#8A4A1E"];
  const WIN = 3;

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
  const sTurn = () => tone(700, 900, "square", .05, .05);
  const sCrash = () => { tone(300, 60, "sawtooth", .5, .14); tone(120, 50, "square", .4, .1); };
  const sShield = () => tone(900, 1500, "triangle", .25, .12);
  const sBeep = hi => tone(hi ? 900 : 600, hi ? 900 : 600, "square", .12, .1);
  const sWin = () => [523, 659, 784, 1047].forEach((f, k) => tone(f, f, "triangle", .18, .13, k * .1));
  function renderSound(){
    $("ic-on").hidden = !soundOn; $("ic-off").hidden = soundOn;
    $("sound").setAttribute("aria-label", soundOn ? "Sesi kapat" : "Sesi aç");
    $("sound").setAttribute("aria-pressed", String(soundOn));
  }
  $("sound").addEventListener("click", () => { soundOn = !soundOn; renderSound(); });
  renderSound();

  /* ---------- durum ---------- */
  let G = null, timers = [];
  const later = (sec, fn) => timers.push({t: sec, fn});
  const idx = (x, y) => y * COLS + x;

  function newMatch(cfg){
    timers = [];
    G = {cfg, wins: [0, 0], round: 0, phase: "idle", grid: null, players: [], fx: []};
    ["setup", "end"].forEach(id => $(id).hidden = true);
    buildPads();
    newRound();
  }

  function newRound(){
    timers = [];
    G.round++;
    G.grid = new Uint8Array(COLS * ROWS);
    G.fx = [];
    G.players = G.cfg.players.map((p, i) => ({
      ...p, i, x: i === 0 ? 8 : COLS - 9, y: (ROWS >> 1) + (i === 0 ? 6 : -6),
      dir: i === 0 ? 0 : 2, queued: null, alive: true, sh: p.shield, acc: 0, trail: []
    }));
    for (const p of G.players){ G.grid[idx(p.x, p.y)] = p.i + 1; p.trail.push([p.x, p.y]); }
    G.phase = "count";
    let n = 3;
    toast(String(n)); sBeep(false);
    const step = () => {
      n--;
      if (n > 0){ toast(String(n)); sBeep(false); later(.75, step); }
      else { toast("BAŞLA!"); sBeep(true); G.phase = "play"; }
    };
    later(.75, step);
    renderScore();
  }

  /* ---------- hareket ---------- */
  function turn(i, side){                 // side: -1 sol, +1 sağ
    const p = G.players[i];
    if (!p || !p.alive || G.phase !== "play") return;
    setDir(i, (p.dir + side + 4) % 4);
  }
  function setDir(i, d){
    const p = G.players[i];
    if (!p || !p.alive || G.phase !== "play") return;
    const cur = p.queued === null ? p.dir : p.queued;
    if (d === (cur + 2) % 4 || d === cur) return;    // geri dönemez
    p.queued = d;
    sTurn();
  }

  function stepPlayer(p){
    if (p.queued !== null){ p.dir = p.queued; p.queued = null; }
    let nx = p.x + DIRS[p.dir][0], ny = p.y + DIRS[p.dir][1];
    let out = nx < 0 || ny < 0 || nx >= COLS || ny >= ROWS;
    if (out && G.cfg.wrap){ nx = (nx + COLS) % COLS; ny = (ny + ROWS) % ROWS; out = false; }
    if (out || G.grid[idx(nx, ny)]){
      if (p.sh > 0){                                  // kalkan: çevreyi erit, devam et
        p.sh--;
        sShield();
        if (out){ p.dir = (p.dir + 2) % 4; nx = p.x + DIRS[p.dir][0]; ny = p.y + DIRS[p.dir][1]; }
        for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++){
          const x = nx + dx, y = ny + dy;
          if (x >= 0 && y >= 0 && x < COLS && y < ROWS) G.grid[idx(x, y)] = 0;
        }
        G.fx.push({x: nx, y: ny, r: 0, c: COL[p.i], life: .5});
        renderScore();
      } else { p.alive = false; p.deadAt = [p.x, p.y]; return; }
    }
    p.x = nx; p.y = ny;
    G.grid[idx(nx, ny)] = p.i + 1;
    p.trail.push([nx, ny]);
  }

  function update(dt){
    for (const tm of timers) tm.t -= dt;
    const due = timers.filter(tm => tm.t <= 0); timers = timers.filter(tm => tm.t > 0); due.forEach(tm => tm.fn());
    for (const f of G.fx){ f.r += dt * 90; f.life -= dt; }
    G.fx = G.fx.filter(f => f.life > 0);
    if (G.phase !== "play") return;

    if (G.cfg.cpu !== null && G.players[1].alive) cpuThink(G.players[1]);
    let moved = false;
    for (const p of G.players){
      if (!p.alive) continue;
      p.acc += dt * p.speed;
      while (p.acc >= 1 && p.alive){ p.acc -= 1; stepPlayer(p); moved = true; }
    }
    if (!moved) return;
    const alive = G.players.filter(p => p.alive);
    if (alive.length <= 1) endRound(alive[0]);
  }

  function endRound(winner){
    G.phase = "over";
    sCrash();
    for (const p of G.players) if (!p.alive) G.fx.push({x: p.deadAt[0], y: p.deadAt[1], r: 0, c: COL[p.i], life: .8});
    if (winner) G.wins[winner.i]++;
    renderScore();
    const done = G.wins[0] >= WIN || G.wins[1] >= WIN;
    toast(winner ? `${winner.name} kazandı!` : "Berabere!");
    later(done ? 1.4 : 1.8, () => {
      if (!done){ newRound(); return; }
      const w = G.wins[0] > G.wins[1] ? G.players[0] : G.players[1];
      sWin();
      $("end-title").textContent = `${w.name} maçı kazandı!`;
      $("end-note").textContent = `Skor ${G.wins[0]} - ${G.wins[1]} · ${G.round} raund`;
      $("end").hidden = false;
      $("again").focus();
    });
  }

  /* ---------- bilgisayar ---------- */
  function free(x, y){
    if (G.cfg.wrap){ x = (x + COLS) % COLS; y = (y + ROWS) % ROWS; }
    else if (x < 0 || y < 0 || x >= COLS || y >= ROWS) return false;
    return !G.grid[idx(x, y)];
  }
  function room(x, y, d, limit){            // o yöne kaç kare açık (kaba alan ölçüsü)
    let n = 0, cx = x, cy = y;
    for (let k = 0; k < limit; k++){
      cx += DIRS[d][0]; cy += DIRS[d][1];
      if (!free(cx, cy)) break;
      n++;
      const s1 = free(cx + DIRS[(d + 1) % 4][0], cy + DIRS[(d + 1) % 4][1]);
      const s2 = free(cx + DIRS[(d + 3) % 4][0], cy + DIRS[(d + 3) % 4][1]);
      if (s1) n += .5;
      if (s2) n += .5;
    }
    return n;
  }
  function cpuThink(p){
    const lv = G.cfg.cpu, limit = [8, 16, 26][lv];
    const opts = [p.dir, (p.dir + 1) % 4, (p.dir + 3) % 4]
      .map(d => ({d, s: free(p.x + DIRS[d][0], p.y + DIRS[d][1]) ? room(p.x, p.y, d, limit) : -1}));
    const best = opts.reduce((a, b) => b.s > a.s ? b : a);
    const straight = opts[0];
    let pick = best.d;
    if (straight.s >= 0 && best.s - straight.s < (lv === 2 ? 1.5 : 4)) pick = straight.d;   // gereksiz dönme
    if (lv === 0 && Math.random() < .12) pick = opts[1 + (Math.random() * 2 | 0)].d;        // kolay: hata yap
    if (pick !== p.dir) setDir(p.i, pick);
  }

  /* ---------- arayüz ---------- */
  let toastT = 0;
  function toast(t){
    const el = $("toast");
    el.textContent = t; el.hidden = false;
    el.style.animation = "none"; void el.offsetWidth; el.style.animation = "";
    clearTimeout(toastT); toastT = setTimeout(() => el.hidden = true, 1200);
  }
  function renderScore(){
    const box = $("score");
    box.innerHTML = "";
    G.players.forEach((p, i) => {
      const d = document.createElement("div");
      d.className = `sc p${i}` + (G.wins[i] >= Math.max(...G.wins) && G.wins[i] > 0 ? " lead" : "");
      d.innerHTML = `<span class="nm"></span><b>${G.wins[i]}</b>` + (p.sh > 0 ? `<span class="sh">🛡${p.sh}</span>` : "");
      d.querySelector(".nm").textContent = p.name;
      box.appendChild(d);
    });
  }
  function keyBtn(cls, label, aria, onDown){
    const b = document.createElement("button");
    b.type = "button"; b.className = "key " + cls; b.textContent = label; b.setAttribute("aria-label", aria);
    b.addEventListener("pointerdown", e => { e.preventDefault(); audio(); b.classList.add("on"); onDown(); });
    const up = () => b.classList.remove("on");
    b.addEventListener("pointerup", up); b.addEventListener("pointercancel", up); b.addEventListener("pointerleave", up);
    return b;
  }
  function buildPads(){
    G.cfg.players.forEach((p, i) => {
      const pad = $("pad-" + i);
      pad.innerHTML = "";
      pad.className = "pad pad-" + i + " " + p.ctl;
      pad.hidden = i === 1 && G.cfg.cpu !== null;
      if (p.ctl === "turn"){
        pad.appendChild(keyBtn("", "↺", `${p.name} sola dön`, () => turn(i, -1)));
        pad.appendChild(keyBtn("", "↻", `${p.name} sağa dön`, () => turn(i, 1)));
      } else {
        pad.appendChild(keyBtn("up", "▲", `${p.name} yukarı`, () => setDir(i, 0)));
        pad.appendChild(keyBtn("left", "◀", `${p.name} sol`, () => setDir(i, 3)));
        pad.appendChild(keyBtn("down", "▼", `${p.name} aşağı`, () => setDir(i, 2)));
        pad.appendChild(keyBtn("right", "▶", `${p.name} sağ`, () => setDir(i, 1)));
      }
    });
  }
  document.addEventListener("keydown", e => {
    if (!G || e.repeat || e.target.closest("input")) return;
    const k = e.key.toLowerCase();
    const m = {arrowup: [1, 0], arrowdown: [1, 2], arrowleft: [1, 3], arrowright: [1, 1],
               w: [0, 0], s: [0, 2], a: [0, 3], d: [0, 1]}[k];
    if (m){ e.preventDefault(); audio(); if (!(m[0] === 1 && G.cfg.cpu !== null)) setDir(m[0], m[1]); }
    if (k === "q") turn(0, -1);
    if (k === "e") turn(0, 1);
  });

  /* ---------- çizim ---------- */
  const cv = $("cv"), stage = $("stage"), ctx = cv.getContext("2d");
  let view = {s: 1, ox: 0, oy: 0, dpr: 1};
  function resize(){
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const cw = stage.clientWidth, ch = stage.clientHeight;
    cv.width = Math.round(cw * dpr); cv.height = Math.round(ch * dpr);
    const s = Math.min(cw / AW, ch / AH);
    view = {s, ox: (cw - AW * s) / 2, oy: (ch - AH * s) / 2, dpr};
  }
  function draw(){
    const {s, ox, oy, dpr} = view;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.fillStyle = "#050B14"; ctx.fillRect(0, 0, cv.width, cv.height);
    ctx.setTransform(dpr * s, 0, 0, dpr * s, dpr * ox, dpr * oy);
    ctx.fillStyle = "#07101C"; ctx.fillRect(0, 0, AW, AH);
    ctx.strokeStyle = "rgba(61,219,255,.07)"; ctx.lineWidth = 1;
    for (let x = 0; x <= COLS; x += 4){ ctx.beginPath(); ctx.moveTo(x * CELL, 0); ctx.lineTo(x * CELL, AH); ctx.stroke(); }
    for (let y = 0; y <= ROWS; y += 4){ ctx.beginPath(); ctx.moveTo(0, y * CELL); ctx.lineTo(AW, y * CELL); ctx.stroke(); }
    ctx.strokeStyle = G && G.cfg.wrap ? "rgba(255,255,255,.18)" : "rgba(61,219,255,.5)";
    ctx.lineWidth = 3; ctx.strokeRect(1.5, 1.5, AW - 3, AH - 3);
    if (!G) return;
    for (const p of G.players){
      ctx.fillStyle = DIM[p.i];
      for (const [x, y] of p.trail) ctx.fillRect(x * CELL + 1, y * CELL + 1, CELL - 2, CELL - 2);
      ctx.fillStyle = COL[p.i];
      const n = p.trail.length;
      for (let k = Math.max(0, n - 14); k < n; k++){
        ctx.globalAlpha = .35 + .65 * (k - (n - 14)) / 14;
        const [x, y] = p.trail[k];
        ctx.fillRect(x * CELL + 1, y * CELL + 1, CELL - 2, CELL - 2);
      }
      ctx.globalAlpha = 1;
      if (p.alive){
        ctx.shadowColor = COL[p.i]; ctx.shadowBlur = 16;
        ctx.fillStyle = p.sh > 0 ? "#FFFFFF" : COL[p.i];
        ctx.fillRect(p.x * CELL, p.y * CELL, CELL, CELL);
        ctx.shadowBlur = 0;
      }
    }
    for (const f of G.fx){
      ctx.globalAlpha = Math.max(0, f.life);
      ctx.strokeStyle = f.c; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.arc(f.x * CELL + CELL / 2, f.y * CELL + CELL / 2, f.r, 0, Math.PI * 2); ctx.stroke();
      ctx.globalAlpha = 1;
    }
  }

  /* ---------- kurulum ---------- */
  const form = $("setup-form");
  function syncMode(){
    const cpu = form.mode.value === "cpu";
    $("cpu-level").hidden = !cpu;
    $("pn-1").disabled = cpu;
    $("pn-1").value = cpu ? "Bilgisayar" : ($("pn-1").dataset.name || "Egemen");
  }
  form.addEventListener("change", e => { if (e.target.name === "mode") syncMode(); });
  $("pn-1").addEventListener("input", e => { if (!e.target.disabled) e.target.dataset.name = e.target.value; });
  form.addEventListener("submit", e => {
    e.preventDefault();
    audio();
    const cpu = form.mode.value === "cpu";
    const players = [0, 1].map(i => ({
      name: ($("pn-" + i).value.trim() || (i ? "Turuncu" : "Mavi")),
      ctl: form["ctl" + i].value,
      speed: +form["sp" + i].value,
      shield: +form["sh" + i].value
    }));
    newMatch({players, wrap: form.wrap.value === "1", cpu: cpu ? +form.cpu.value : null});
  });
  $("open-setup").addEventListener("click", () => { timers = []; if (G) G.phase = "idle"; $("end").hidden = true; $("setup").hidden = false; });
  $("end-setup").addEventListener("click", () => { $("end").hidden = true; $("setup").hidden = false; });
  $("again").addEventListener("click", () => { audio(); newMatch(G.cfg); });

  /* ---------- döngü ---------- */
  let last = performance.now();
  function frame(now){
    const dt = Math.min(.05, (now - last) / 1000); last = now;
    if (G) update(dt);
    draw();
    requestAnimationFrame(frame);
  }
  document.addEventListener("visibilitychange", () => { last = performance.now(); });
  if ("ResizeObserver" in window) new ResizeObserver(resize).observe(stage); else window.addEventListener("resize", resize);
  resize();
  $("pn-0").value = "Enes";
  $("pn-1").value = "Egemen"; $("pn-1").dataset.name = "Egemen";
  syncMode();
  requestAnimationFrame(frame);
})();
