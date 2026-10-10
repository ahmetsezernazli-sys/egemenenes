(() => {
  "use strict";
  const $ = id => document.getElementById(id);

  /* ---------- ölçüler ve fizik ---------- */
  const W = 480, H = 720, CX = 240, CY = 360;
  const R0 = 200, RMIN = 30;                  // ring yarıçapı; sonunda iki top sığmayacak kadar küçülür, tur mutlaka biter
  const SHRINK_AT = 14, SHRINK_SPEED = 4.5;   // kaçıncı saniyede, saniyede kaç birim küçülür
  const ACCEL = 620, DAMP = 1.8, REST = .8;
  const DASH = 330, DASH_CD = 2.2;
  const BALL = [{r: 30, m: 1, acc: 1}, {r: 37, m: 1.6, acc: 1.22}];   // normal, güçlü
  const DASH_BTN = [{x: 420, y: 664}, {x: 60, y: 56}];
  const PL = [{av: "🚀", c: "#3D8BFD", d: "#1F5FC2", l: "#A9CBFF"}, {av: "🎈", c: "#FF7A2F", d: "#C2531A", l: "#FFC39E"}];
  const CPU = [{acc: .55, react: .45, dash: false, err: .55}, {acc: .8, react: .25, dash: true, err: .3}, {acc: 1, react: .12, dash: true, err: .1}];

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
    o.type = type; o.frequency.setValueAtTime(f1, t); o.frequency.exponentialRampToValueAtTime(Math.max(20, f2), t + dur * .9);
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + .01); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(a.destination); o.start(t); o.stop(t + dur + .05);
  }
  const sBump = k => tone(120 + k * 80, 60, "triangle", .12, Math.min(.3, .08 + k * .2));
  const sDash = () => tone(300, 900, "sawtooth", .16, .06);
  const sFall = () => tone(600, 90, "sine", .7, .16);
  const sBeep = hi => tone(hi ? 880 : 520, hi ? 880 : 520, "sine", hi ? .3 : .14, .14);
  const sWin = () => [523, 659, 784, 1047, 1319].forEach((f, k) => tone(f, f, "triangle", .22, .13, k * .09));

  const canSpeak = "speechSynthesis" in window;
  let trVoice = null;
  function pickVoice(){ trVoice = speechSynthesis.getVoices().find(v => /^tr(-|_|$)/i.test(v.lang)) || null; }
  if (canSpeak){ pickVoice(); if (speechSynthesis.addEventListener) speechSynthesis.addEventListener("voiceschanged", pickVoice); }
  function say(text){
    if (!canSpeak || !soundOn || !trVoice) return;
    speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text); u.voice = trVoice; u.lang = trVoice.lang; u.rate = 1.02; u.pitch = 1.1;
    speechSynthesis.speak(u);
  }
  function renderSound(){
    $("ic-on").hidden = !soundOn; $("ic-off").hidden = soundOn;
    $("sound").setAttribute("aria-label", soundOn ? "Sesi kapat" : "Sesi aç");
    $("sound").setAttribute("aria-pressed", String(soundOn));
  }
  $("sound").addEventListener("click", () => { soundOn = !soundOn; if (!soundOn && canSpeak) speechSynthesis.cancel(); renderSound(); });
  renderSound();

  /* ---------- durum ---------- */
  let G = null, timers = [];
  const later = (sec, fn) => timers.push({t: sec, fn});

  function newMatch(cfg){
    timers = [];
    G = {cfg, score: [0, 0], balls: cfg.players.map((p, i) => {
      const k = BALL[p.strong ? 1 : 0];
      return {i, x: CX, y: CY, vx: 0, vy: 0, r: k.r, m: k.m, acc: k.acc, cd: 0, inp: {x: 0, y: 0}, fall: 0, look: {x: 0, y: i ? 1 : -1}};
    }), R: R0, stage: "count", t: 0, playT: 0, count: 0, dust: [], loser: -1, over: false, cpuT: 0, cpuDir: {x: 0, y: 0}, banner: ""};
    ["setup", "end"].forEach(id => $(id).hidden = true);
    newRound();
  }
  function newRound(){
    G.R = R0; G.playT = 0; G.loser = -1; G.dust = [];
    G.balls.forEach((b, i) => { b.x = CX; b.y = CY + (i ? -110 : 110); b.vx = b.vy = 0; b.cd = 0; b.fall = 0; b.look = {x: 0, y: i ? 1 : -1}; });
    G.stage = "count"; G.count = 3; G.banner = "3"; sBeep(false);
    later(.7, () => { G.count = 2; G.banner = "2"; sBeep(false); });
    later(1.4, () => { G.count = 1; G.banner = "1"; sBeep(false); });
    later(2.1, () => { G.stage = "play"; G.banner = "Başla!"; sBeep(true); say("Başla!"); later(.7, () => { if (G.banner === "Başla!") G.banner = ""; }); });
  }

  function dash(i){
    if (!G || G.stage !== "play") return;
    const b = G.balls[i];
    if (b.cd > 0) return;
    let dx = b.inp.x, dy = b.inp.y, L = Math.hypot(dx, dy);
    if (L < .2){ dx = b.vx; dy = b.vy; L = Math.hypot(dx, dy); }
    if (L < 1e-3){ const o = G.balls[1 - i]; dx = o.x - b.x; dy = o.y - b.y; L = Math.hypot(dx, dy) || 1; }
    b.vx += dx / L * DASH; b.vy += dy / L * DASH;
    b.cd = DASH_CD; sDash();
    for (let k = 0; k < 6; k++) G.dust.push({x: b.x - dx / L * b.r, y: b.y - dy / L * b.r, vx: -dx / L * 80 + (Math.random() - .5) * 60, vy: -dy / L * 80 + (Math.random() - .5) * 60, life: .5, r: 5});
  }

  /* ---------- bilgisayar ---------- */
  function cpuThink(dt){
    const lv = CPU[G.cfg.level], me = G.balls[1], op = G.balls[0];
    G.cpuT -= dt;
    if (G.cpuT <= 0){
      G.cpuT = lv.react;
      const dc = Math.hypot(me.x - CX, me.y - CY);
      let dx, dy;
      if (dc > G.R * .72){ dx = CX - me.x; dy = CY - me.y; }                 // kenardan uzaklaş
      else {
        // rakibi dışarı doğru itecek açıdan yaklaş
        const ox = op.x - CX, oy = op.y - CY, ol = Math.hypot(ox, oy) || 1;
        const tx = op.x - ox / ol * 18, ty = op.y - oy / ol * 18;
        dx = tx - me.x + ox / ol * 40; dy = ty - me.y + oy / ol * 40;
      }
      const L = Math.hypot(dx, dy) || 1;
      const a = Math.atan2(dy / L, dx / L) + (Math.random() - .5) * lv.err * 2;
      G.cpuDir = {x: Math.cos(a) * lv.acc, y: Math.sin(a) * lv.acc};
      const dOp = Math.hypot(op.x - me.x, op.y - me.y);
      if (lv.dash && me.cd <= 0 && dOp < 120 && dc < G.R * .6 && Math.random() < .5){ me.inp = {x: (op.x - me.x) / dOp, y: (op.y - me.y) / dOp}; dash(1); }
    }
    me.inp = G.cpuDir;
  }

  /* ---------- güncelle ---------- */
  function update(dt){
    for (const tm of timers) tm.t -= dt;
    const due = timers.filter(tm => tm.t <= 0); timers = timers.filter(tm => tm.t > 0); due.forEach(tm => tm.fn());
    if (!G) return;
    G.t += dt;
    for (const d of G.dust){ d.life -= dt; d.x += d.vx * dt; d.y += d.vy * dt; d.vx *= .92; d.vy *= .92; }
    G.dust = G.dust.filter(d => d.life > 0);
    if (G.stage === "fall"){
      const b = G.balls[G.loser];
      b.fall += dt; b.x += b.vx * dt; b.y += b.vy * dt;
      return;
    }
    if (G.stage !== "play") return;
    G.playT += dt;
    if (G.playT > SHRINK_AT) G.R = Math.max(RMIN, R0 - (G.playT - SHRINK_AT) * SHRINK_SPEED);
    if (G.cfg.cpu) cpuThink(dt);
    else if (!touchActive(1)) G.balls[1].inp = keyInput(1);
    if (!touchActive(0)) G.balls[0].inp = keyInput(0);
    if (G.forced) G.forced.forEach((f, i) => { if (f) G.balls[i].inp = f; });   // yalnızca testler
    // hareket
    for (const b of G.balls){
      b.vx += b.inp.x * ACCEL * b.acc * dt; b.vy += b.inp.y * ACCEL * b.acc * dt;
      const k = Math.exp(-DAMP * dt); b.vx *= k; b.vy *= k;
      b.x += b.vx * dt; b.y += b.vy * dt;
      if (b.cd > 0) b.cd = Math.max(0, b.cd - dt);
      const sp = Math.hypot(b.vx, b.vy);
      if (sp > 20){ b.look.x += (b.vx / sp - b.look.x) * Math.min(1, dt * 8); b.look.y += (b.vy / sp - b.look.y) * Math.min(1, dt * 8); }
    }
    // çarpışma
    const [a, c] = G.balls;
    let dx = c.x - a.x, dy = c.y - a.y, d = Math.hypot(dx, dy);
    if (d < a.r + c.r && d > 0){
      const nx = dx / d, ny = dy / d, over = a.r + c.r - d, tot = a.m + c.m;
      a.x -= nx * over * c.m / tot; a.y -= ny * over * c.m / tot;
      c.x += nx * over * a.m / tot; c.y += ny * over * a.m / tot;
      const vn = (a.vx - c.vx) * nx + (a.vy - c.vy) * ny;
      if (vn > 0){
        const j = (1 + REST) * vn / (1 / a.m + 1 / c.m);
        a.vx -= j / a.m * nx; a.vy -= j / a.m * ny;
        c.vx += j / c.m * nx; c.vy += j / c.m * ny;
        if (vn > 60){
          sBump(Math.min(1, vn / 500));
          const px = a.x + nx * a.r, py = a.y + ny * a.r;
          for (let k = 0; k < Math.min(10, vn / 40); k++) G.dust.push({x: px, y: py, vx: (Math.random() - .5) * 200, vy: (Math.random() - .5) * 200, life: .45, r: 4 + Math.random() * 3});
        }
      }
    }
    // ringin dışına çıkan
    const outs = G.balls.map(b => Math.hypot(b.x - CX, b.y - CY) - G.R);
    if (outs[0] > 0 || outs[1] > 0){
      const loser = outs[0] > outs[1] ? 0 : 1;
      roundOver(loser);
    }
  }

  function roundOver(loser){
    G.stage = "fall"; G.loser = loser;
    const winner = 1 - loser;
    G.score[winner]++;
    sFall();
    const wp = G.cfg.players[winner];
    if (G.score[winner] >= G.cfg.wins){
      G.banner = "";
      later(1.1, finish);
      return;
    }
    G.banner = `${wp.name} +1`;
    say(`${wp.name} turu aldı!`);
    later(1.6, () => { if (G && !G.over) newRound(); });
  }

  function finish(){
    G.over = true; G.stage = "over";
    const w = G.score[0] > G.score[1] ? 0 : 1, wp = G.cfg.players[w];
    $("end-title").textContent = `${wp.name} kazandı!`;
    $("end-note").textContent = `${PL[0].av} ${G.cfg.players[0].name} ${G.score[0]} · ${G.score[1]} ${G.cfg.players[1].name} ${PL[1].av}`;
    sWin(); say(`${wp.name} kazandı!`);
    $("end").hidden = false; $("again").focus();
  }

  /* ---------- dokunmatik kollar ve klavye ---------- */
  const cv = $("cv"), stage = $("stage"), ctx = cv.getContext("2d");
  let view = {s: 1, ox: 0, oy: 0, dpr: 1};
  const toLogical = e => {
    const r = cv.getBoundingClientRect();
    return {x: (e.clientX - r.left - view.ox) / view.s, y: (e.clientY - r.top - view.oy) / view.s};
  };
  const sticks = new Map();                    // pointerId -> {pi, ox, oy, x, y}
  const touchActive = pi => [...sticks.values()].some(s => s.pi === pi);
  function stickInput(s){
    const dx = s.x - s.ox, dy = s.y - s.oy, L = Math.hypot(dx, dy), max = 56;
    if (L < 4) return {x: 0, y: 0};
    const k = Math.min(1, L / max) / L;
    return {x: dx * k, y: dy * k};
  }
  cv.addEventListener("pointerdown", e => {
    if (!G) return;
    e.preventDefault(); audio();
    const p = toLogical(e);
    for (let i = 0; i < 2; i++){
      if (G.cfg.cpu && i === 1) continue;
      const bt = DASH_BTN[i];
      if (Math.hypot(p.x - bt.x, p.y - bt.y) < 46){ dash(i); return; }
    }
    const pi = p.y >= CY ? 0 : 1;
    if (G.cfg.cpu && pi === 1) return;
    try { cv.setPointerCapture(e.pointerId); } catch (err) {}
    sticks.set(e.pointerId, {pi, ox: p.x, oy: p.y, x: p.x, y: p.y});
  });
  cv.addEventListener("pointermove", e => {
    const s = sticks.get(e.pointerId); if (!s || !G) return;
    const p = toLogical(e); s.x = p.x; s.y = p.y;
    G.balls[s.pi].inp = stickInput(s);
  });
  const endStick = e => { const s = sticks.get(e.pointerId); if (s && G) G.balls[s.pi].inp = {x: 0, y: 0}; sticks.delete(e.pointerId); };
  ["pointerup", "pointercancel", "lostpointercapture"].forEach(ev => cv.addEventListener(ev, endStick));

  const keys = new Set();
  const KEYMAP = [{u: "KeyW", d: "KeyS", l: "KeyA", r: "KeyD", dash: "Space"}, {u: "ArrowUp", d: "ArrowDown", l: "ArrowLeft", r: "ArrowRight", dash: "Enter"}];
  function keyInput(i){
    const k = KEYMAP[i];
    let x = (keys.has(k.r) ? 1 : 0) - (keys.has(k.l) ? 1 : 0), y = (keys.has(k.d) ? 1 : 0) - (keys.has(k.u) ? 1 : 0);
    const L = Math.hypot(x, y); if (L > 1){ x /= L; y /= L; }
    return {x, y};
  }
  document.addEventListener("keydown", e => {
    if (!G || (e.target instanceof Element && e.target.closest("input, button, form"))) return;
    if ([...Object.values(KEYMAP[0]), ...Object.values(KEYMAP[1])].includes(e.code)) e.preventDefault();
    if (e.code === KEYMAP[0].dash && !e.repeat) dash(0);
    if (e.code === KEYMAP[1].dash && !e.repeat && !G.cfg.cpu) dash(1);
    keys.add(e.code);
  });
  document.addEventListener("keyup", e => keys.delete(e.code));
  window.addEventListener("blur", () => keys.clear());

  /* ---------- çizim ---------- */
  function resize(){
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const cw = stage.clientWidth, ch = stage.clientHeight;
    cv.width = Math.round(cw * dpr); cv.height = Math.round(ch * dpr);
    const s = Math.min(cw / W, ch / H);
    view = {s, ox: (cw - W * s) / 2, oy: (ch - H * s) / 2, dpr};
  }

  function drawBall(b){
    const P = PL[b.i];
    let r = b.r, alpha = 1;
    if (G.stage === "fall" && G.loser === b.i){ r *= Math.max(.15, 1 - b.fall * .9); alpha = Math.max(0, 1 - b.fall); }
    ctx.save(); ctx.globalAlpha = alpha;
    ctx.fillStyle = "rgba(0,0,0,.25)"; ctx.beginPath(); ctx.ellipse(b.x + 4, b.y + r * .7, r * .95, r * .45, 0, 0, Math.PI * 2); ctx.fill();
    const g = ctx.createRadialGradient(b.x - r * .35, b.y - r * .4, r * .1, b.x, b.y, r);
    g.addColorStop(0, P.l); g.addColorStop(.55, P.c); g.addColorStop(1, P.d);
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(b.x, b.y, r, 0, Math.PI * 2); ctx.fill();
    // kemer
    ctx.strokeStyle = "rgba(255,255,255,.75)"; ctx.lineWidth = r * .14;
    ctx.beginPath(); ctx.arc(b.x, b.y, r * .82, Math.PI * .15, Math.PI * .85); ctx.stroke();
    // gözler bakış yönüne
    const lx = b.look.x * r * .22, ly = b.look.y * r * .22;
    for (const s of [-1, 1]){
      const ex = b.x + s * r * .3 + lx * .4, ey = b.y - r * .18 + ly * .4;
      ctx.fillStyle = "#fff"; ctx.beginPath(); ctx.arc(ex, ey, r * .2, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = "#1F2933"; ctx.beginPath(); ctx.arc(ex + lx * .35, ey + ly * .35, r * .1, 0, Math.PI * 2); ctx.fill();
    }
    // kenara yakınken uyarı
    const dc = Math.hypot(b.x - CX, b.y - CY);
    if (G.stage === "play" && dc > G.R - b.r * .6){
      ctx.strokeStyle = `rgba(229,72,77,${.5 + .5 * Math.sin(G.t * 18)})`; ctx.lineWidth = 4;
      ctx.beginPath(); ctx.arc(b.x, b.y, r + 6, 0, Math.PI * 2); ctx.stroke();
    }
    ctx.restore();
  }

  function drawDashBtn(i){
    const bt = DASH_BTN[i], b = G.balls[i], ready = b.cd <= 0;
    ctx.save(); ctx.translate(bt.x, bt.y); if (i === 1) ctx.rotate(Math.PI);
    ctx.fillStyle = ready ? PL[i].c : "rgba(255,255,255,.15)";
    ctx.beginPath(); ctx.arc(0, 0, 34, 0, Math.PI * 2); ctx.fill();
    if (!ready){
      ctx.strokeStyle = PL[i].c; ctx.lineWidth = 6;
      ctx.beginPath(); ctx.arc(0, 0, 34, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * (1 - b.cd / DASH_CD)); ctx.stroke();
    }
    ctx.font = "30px sans-serif"; ctx.textAlign = "center"; ctx.textBaseline = "middle";
    ctx.globalAlpha = ready ? 1 : .5; ctx.fillText("⚡", 0, 2);
    ctx.restore();
  }

  function draw(){
    const {s, ox, oy, dpr} = view;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.fillStyle = "#2A1E15"; ctx.fillRect(0, 0, cv.width, cv.height);
    ctx.setTransform(dpr * s, 0, 0, dpr * s, dpr * ox, dpr * oy);
    // oyuncu yarıları
    ctx.fillStyle = "rgba(61,139,253,.08)"; ctx.fillRect(-400, CY, W + 800, H - CY + 400);
    ctx.fillStyle = "rgba(255,122,47,.08)"; ctx.fillRect(-400, -400, W + 800, CY + 400);
    // platform ve ring
    ctx.fillStyle = "#B88A55"; ctx.beginPath(); ctx.roundRect(CX - 228, CY - 228, 456, 456, 26); ctx.fill();
    ctx.fillStyle = "#A9794A"; ctx.beginPath(); ctx.arc(CX, CY, R0 + 10, 0, Math.PI * 2); ctx.fill();
    if (!G) return;
    if (G.R < R0){ ctx.fillStyle = "#8F6235"; ctx.beginPath(); ctx.arc(CX, CY, R0, 0, Math.PI * 2); ctx.fill(); }
    ctx.fillStyle = "#E9D3A6"; ctx.beginPath(); ctx.arc(CX, CY, G.R, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = "#C9A45C"; ctx.lineWidth = 9; ctx.beginPath(); ctx.arc(CX, CY, G.R, 0, Math.PI * 2); ctx.stroke();
    ctx.strokeStyle = "rgba(120,80,30,.35)"; ctx.lineWidth = 2; ctx.setLineDash([6, 8]); ctx.beginPath(); ctx.arc(CX, CY, G.R - 3, 0, Math.PI * 2); ctx.stroke(); ctx.setLineDash([]);
    ctx.fillStyle = "#FFFFFF"; ctx.fillRect(CX - 24, CY - 34, 48, 5); ctx.fillRect(CX - 24, CY + 29, 48, 5);
    // toz
    for (const d of G.dust){ ctx.fillStyle = `rgba(233,211,166,${d.life * 1.6})`; ctx.beginPath(); ctx.arc(d.x, d.y, d.r, 0, Math.PI * 2); ctx.fill(); }
    // toplar: düşen önce
    const order = G.balls.slice().sort((a, b) => (b.i === G.loser) - (a.i === G.loser));
    for (const b of order) drawBall(b);
    // kollar
    for (const st of sticks.values()){
      ctx.strokeStyle = "rgba(255,255,255,.35)"; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.arc(st.ox, st.oy, 56, 0, Math.PI * 2); ctx.stroke();
      const inp = stickInput(st);
      ctx.fillStyle = PL[st.pi].c + "AA"; ctx.beginPath(); ctx.arc(st.ox + inp.x * 56, st.oy + inp.y * 56, 22, 0, Math.PI * 2); ctx.fill();
    }
    drawDashBtn(0); if (!G.cfg.cpu) drawDashBtn(1);
    // skor: alt oyuncu sol altta, üst oyuncu sağ üstte (ona dönük)
    const tag = (i, x, y, rot) => {
      ctx.save(); ctx.translate(x, y); if (rot) ctx.rotate(Math.PI);
      ctx.fillStyle = "rgba(0,0,0,.35)"; ctx.beginPath(); ctx.roundRect(-8, -20, 168, 40, 20); ctx.fill();
      ctx.font = "800 18px Rubik, sans-serif"; ctx.textAlign = "left"; ctx.textBaseline = "middle";
      ctx.fillStyle = PL[i].c; ctx.fillText(`${PL[i].av} ${G.cfg.players[i].name}`.slice(0, 16), 4, 1);
      ctx.textAlign = "right"; ctx.fillStyle = "#FBF3E4"; ctx.font = "800 24px Rubik, sans-serif";
      ctx.fillText(G.score[i], 150, 2);
      ctx.restore();
    };
    tag(0, 18, H - 50, false); tag(1, W - 18, 50, true);
    // ring küçülürken uyarı
    if (G.stage === "play" && G.playT > SHRINK_AT - 1.5 && G.R > RMIN){
      ctx.font = "800 16px Rubik, sans-serif"; ctx.textAlign = "center"; ctx.fillStyle = `rgba(255,214,102,${.6 + .4 * Math.sin(G.t * 6)})`;
      ctx.fillText("Ring küçülüyor!", CX, CY + R0 + 30);
      ctx.save(); ctx.translate(CX, CY - R0 - 30); ctx.rotate(Math.PI); ctx.fillText("Ring küçülüyor!", 0, 0); ctx.restore();
    }
    // sayım ve duyurular (iki tarafa da dönük)
    if (G.banner){
      ctx.font = "800 54px Rubik, sans-serif"; ctx.textAlign = "center"; ctx.textBaseline = "middle";
      ctx.lineWidth = 8; ctx.strokeStyle = "#3A2A1E"; ctx.fillStyle = "#FBF3E4";
      for (const [y, rot] of [[CY + 120, false], [CY - 120, true]]){
        ctx.save(); ctx.translate(CX, y); if (rot) ctx.rotate(Math.PI);
        ctx.strokeText(G.banner, 0, 0); ctx.fillText(G.banner, 0, 0); ctx.restore();
      }
    }
  }

  let last = performance.now();
  function frame(now){
    const dt = Math.min(.033, (now - last) / 1000); last = now;
    update(dt);
    draw();
    requestAnimationFrame(frame);
  }
  document.addEventListener("visibilitychange", () => { last = performance.now(); keys.clear(); });
  if ("ResizeObserver" in window) new ResizeObserver(resize).observe(stage); else window.addEventListener("resize", resize);
  resize();

  /* ---------- kurulum ---------- */
  const form = $("setup-form");
  function syncMode(){
    const cpu = form.mode.value === "cpu";
    $("cpu-level").hidden = !cpu;
    $("pn-1").disabled = cpu;
    $("pn-1").value = cpu ? "Bilgisayar" : ($("pn-1").dataset.name || "Egemen");
    $("strong-1").closest(".toggle").hidden = cpu;
  }
  form.addEventListener("change", e => { if (e.target.name === "mode") syncMode(); });
  $("pn-1").addEventListener("input", e => { if (!e.target.disabled) e.target.dataset.name = e.target.value; });
  form.addEventListener("submit", e => {
    e.preventDefault(); audio();
    const cpu = form.mode.value === "cpu";
    newMatch({cpu, level: +form.cpu.value, wins: +form.wins.value, players: [
      {name: $("pn-0").value.trim() || "Mavi", strong: $("strong-0").checked},
      {name: $("pn-1").value.trim() || "Turuncu", strong: !cpu && $("strong-1").checked}
    ]});
  });
  $("open-setup").addEventListener("click", () => { timers = []; if (G){ G.over = true; G.stage = "over"; } $("end").hidden = true; $("setup").hidden = false; });
  $("end-setup").addEventListener("click", () => { $("end").hidden = true; $("setup").hidden = false; });
  $("again").addEventListener("click", () => { audio(); newMatch(G.cfg); });
  $("pn-0").value = "Enes"; $("pn-1").value = "Egemen"; $("pn-1").dataset.name = "Egemen";
  syncMode();
  requestAnimationFrame(frame);

  // testler için
  window.__sumo = {state: () => G, update, newMatch, dash, setInput: (i, x, y) => { G.forced = G.forced || []; G.forced[i] = x === null ? null : {x, y}; }, cpuThink, CX, CY, R0, RMIN};
})();
