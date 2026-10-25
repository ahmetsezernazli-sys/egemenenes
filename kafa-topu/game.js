/* Kafa Topu — iki kişilik yandan futbol */
(() => {
  "use strict";
  const $ = (id) => document.getElementById(id);
  const cv = $("cv"), ctx = cv.getContext("2d"), stage = $("stage");
  const SAVE_KEY = "kafa-topu";

  // sahne (mantıksal birim)
  const FW = 1000, FH = 560, GROUND = 496, GOAL_W = 70, GOAL_H = 156, BAR_Y = GROUND - GOAL_H, BAR_R = 6;
  const GRAV = 1900, BALL_R = 17;

  /* ---------- ayarlar ---------- */
  let OPT = { mode: "2p", ai: 1, p1: 0, p2: 0, time: 90 };
  try { OPT = Object.assign(OPT, JSON.parse(localStorage.getItem(SAVE_KEY) || "{}").opt || {}); } catch (e) {}
  const store = () => { try { localStorage.setItem(SAVE_KEY, JSON.stringify({ opt: OPT })); } catch (e) {} };

  /* ---------- ses ---------- */
  let AC = null, soundOn = true;
  function ac() { try { AC = AC || new (window.AudioContext || window.webkitAudioContext)(); } catch (e) {} return AC; }
  function tone(f, d = 0.1, type = "triangle", vol = 0.06, slide = 0) {
    if (!soundOn || !ac()) return;
    const t = AC.currentTime, o = AC.createOscillator(), g = AC.createGain();
    o.type = type; o.frequency.setValueAtTime(f, t);
    if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(30, f + slide), t + d);
    g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + d);
    o.connect(g).connect(AC.destination); o.start(t); o.stop(t + d + 0.02);
  }
  function noise(d = 1.2, vol = 0.08) {
    if (!soundOn || !ac()) return;
    const n = Math.floor(AC.sampleRate * d), buf = AC.createBuffer(1, n, AC.sampleRate), ch = buf.getChannelData(0);
    for (let i = 0; i < n; i++) ch[i] = (Math.random() * 2 - 1) * Math.sin(Math.PI * i / n);
    const s = AC.createBufferSource(), f = AC.createBiquadFilter(), g = AC.createGain();
    f.type = "bandpass"; f.frequency.value = 900; f.Q.value = 0.6; g.gain.value = vol;
    s.buffer = buf; s.connect(f).connect(g).connect(AC.destination); s.start();
  }
  let lastKickSnd = 0;
  const SND = {
    kick: (p) => { const n = performance.now(); if (n - lastKickSnd < 60) return; lastKickSnd = n; tone(160 + p * 120, 0.08, "square", 0.06, -60); },
    head: () => tone(420, 0.07, "sine", 0.06, -120),
    post: () => tone(900, 0.18, "triangle", 0.05, -300),
    whistle: (long) => { tone(2400, long ? 0.6 : 0.25, "sine", 0.05); setTimeout(() => tone(2600, long ? 0.6 : 0.2, "sine", 0.04), 40); },
    goal: () => { noise(1.6, 0.12); [523, 659, 784].forEach((f, i) => setTimeout(() => tone(f, 0.18, "triangle", 0.06), i * 120)); },
  };
  function say(text) {
    if (!soundOn || !("speechSynthesis" in window)) return;
    try {
      speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(text); u.lang = "tr-TR"; u.rate = 1.05;
      const v = speechSynthesis.getVoices().find(v => v.lang && v.lang.toLowerCase().startsWith("tr")); if (v) u.voice = v;
      speechSynthesis.speak(u);
    } catch (e) {}
  }

  /* ---------- durum ---------- */
  const TEAM = [
    { nm: "Mavi", shirt: "#2F7BEA", dark: "#1B4F9E", hair: "#3B2414", skin: "#F2C29B" },
    { nm: "Kırmızı", shirt: "#E5484D", dark: "#9E1F25", hair: "#E0A82E", skin: "#E8B48A" },
  ];
  let S = null, paused = false;
  const keys = [{ l: 0, r: 0, j: 0, k: 0 }, { l: 0, r: 0, j: 0, k: 0 }];

  function mkPlayer(i, sup) {
    return {
      i, dir: i === 0 ? 1 : -1, sup,
      x: i === 0 ? 260 : FW - 260, y: GROUND, vx: 0, vy: 0, ground: true,
      headR: sup ? 44 : 35, spd: sup ? 400 : 320, jump: sup ? 880 : 760, kickPow: sup ? 1.12 : 1,
      kickT: 0, kickHit: false, kickCd: 0, ai: null,
    };
  }
  const headPos = (p) => [p.x, p.y - 44 - p.headR];
  const bodyPos = (p) => [p.x, p.y - 26];
  function footPos(p) {
    // şutta ayak öne ve yukarı savrulur
    const k = p.kickT > 0 ? Math.sin((1 - p.kickT / 0.2) * Math.PI) : 0;
    return [p.x + p.dir * (18 + 26 * k), p.y - 10 - 22 * k];
  }

  function newMatch() {
    S = {
      pl: [mkPlayer(0, !!OPT.p1), mkPlayer(1, OPT.mode === "ai" ? false : !!OPT.p2)],
      ball: null, score: [0, 0], time: OPT.time, golden: false, over: false,
      pause: 0, msg: "", msgT: 0, fx: [], lastTouch: -1, shake: 0, stuck: 0,
    };
    if (OPT.mode === "ai") setAi(S.pl[1], +OPT.ai);
    kickoff(-1);
    SND.whistle(false);
  }
  function kickoff(conceded) {
    for (const p of S.pl) { p.x = p.i === 0 ? 260 : FW - 260; p.y = GROUND; p.vx = p.vy = 0; p.kickT = 0; }
    // gol yiyen tarafa doğru hafif atılan top
    const dx = conceded === 0 ? -1 : conceded === 1 ? 1 : (Math.random() < 0.5 ? -1 : 1);
    S.ball = { x: FW / 2, y: 120, vx: dx * 60, vy: 0, spin: 0, a: 0 };
    S.pause = 1.1;
  }

  /* ---------- fizik ---------- */
  function circleHit(ball, cx, cy, r, vx, vy, rest, onHit) {
    const dx = ball.x - cx, dy = ball.y - cy, d = Math.hypot(dx, dy), min = r + BALL_R;
    if (d >= min || d === 0) return false;
    const nx = dx / d, ny = dy / d;
    ball.x = cx + nx * min; ball.y = cy + ny * min;
    const rvx = ball.vx - vx, rvy = ball.vy - vy, vn = rvx * nx + rvy * ny;
    if (vn < 0) {
      ball.vx -= (1 + rest) * vn * nx; ball.vy -= (1 + rest) * vn * ny;
      ball.spin += (rvx * ny - rvy * nx) * 0.01;
      if (onHit) onHit(-vn);
    }
    return true;
  }
  function segHit(ball, x1, x2, y, rest) {
    const cx = Math.max(x1, Math.min(x2, ball.x));
    return circleHit(ball, cx, y, BAR_R, 0, 0, rest, (v) => { if (v > 200) SND.post(); });
  }

  function stepPlayer(p, dt, inp) {
    const acc = p.ground ? 4200 : 2600;
    const want = (inp.r ? 1 : 0) - (inp.l ? 1 : 0);
    if (want) p.vx += want * acc * dt; else { const f = (p.ground ? 3000 : 600) * dt; p.vx = Math.abs(p.vx) <= f ? 0 : p.vx - Math.sign(p.vx) * f; }
    p.vx = Math.max(-p.spd, Math.min(p.spd, p.vx));
    if (inp.j && p.ground) { p.vy = -p.jump; p.ground = false; }
    p.vy += GRAV * dt;
    p.x += p.vx * dt; p.y += p.vy * dt;
    if (p.y >= GROUND) { p.y = GROUND; p.vy = 0; p.ground = true; }
    const m = 30; p.x = Math.max(m, Math.min(FW - m, p.x));
    p.kickCd = Math.max(0, p.kickCd - dt);
    if (inp.k && p.kickT <= 0 && p.kickCd <= 0) { p.kickT = 0.2; p.kickHit = false; p.kickCd = 0.32; }
    if (p.kickT > 0) p.kickT = Math.max(0, p.kickT - dt);
  }

  function physics(dt) {
    const [a, b] = S.pl, ball = S.ball;
    stepPlayer(a, dt, a.ai ? aiInput(a, dt) : keys[0]);
    stepPlayer(b, dt, b.ai ? aiInput(b, dt) : keys[1]);
    // oyuncular birbirini iter (kafa üstüne de basılabilir)
    const dx = b.x - a.x, minD = 46;
    if (Math.abs(dx) < minD && Math.abs(a.y - b.y) < 70) {
      const push = (minD - Math.abs(dx)) / 2 * (dx >= 0 ? 1 : -1);
      a.x -= push; b.x += push;
    }
    // top
    ball.vy += GRAV * 0.62 * dt;
    ball.vx *= 1 - 0.18 * dt;
    ball.x += ball.vx * dt; ball.y += ball.vy * dt;
    ball.a += ball.vx * dt / BALL_R;
    // zemin, tavan, duvarlar
    if (ball.y > GROUND - BALL_R) {
      ball.y = GROUND - BALL_R;
      if (ball.vy > 0) { ball.vy = ball.vy > 120 ? -ball.vy * 0.66 : 0; ball.vx *= 0.97; }
    }
    if (ball.y < BALL_R) { ball.y = BALL_R; ball.vy = Math.abs(ball.vy) * 0.7; }
    if (ball.x < BALL_R) { ball.x = BALL_R; ball.vx = Math.abs(ball.vx) * 0.5; }
    if (ball.x > FW - BALL_R) { ball.x = FW - BALL_R; ball.vx = -Math.abs(ball.vx) * 0.5; }
    // kale üst direkleri
    segHit(ball, 0, GOAL_W, BAR_Y, 0.6);
    segHit(ball, FW - GOAL_W, FW, BAR_Y, 0.6);
    // oyuncular
    for (const p of S.pl) {
      const [hx, hy] = headPos(p);
      if (circleHit(ball, hx, hy, p.headR, p.vx, p.vy, 0.82, (v) => { if (v > 150) SND.head(); })) {
        S.lastTouch = p.i;
        // kafa vuruşu: öne doğru biraz itiş
        if (!p.ground && p.vy < 0) { ball.vx += p.dir * 140; ball.vy -= 80; }
      }
      const [bx, by] = bodyPos(p);
      if (circleHit(ball, bx, by, 24, p.vx, p.vy, 0.5)) S.lastTouch = p.i;
      const [fx, fy] = footPos(p);
      if (p.kickT > 0 && !p.kickHit) {
        const d = Math.hypot(ball.x - fx, ball.y - fy);
        if (d < BALL_R + 30) {
          p.kickHit = true; S.lastTouch = p.i;
          const up = ball.y < fy - 6 ? 1 : 0;
          const pow = p.kickPow;
          ball.vx = p.dir * (600 + Math.random() * 140) * pow + p.vx * 0.3;
          ball.vy = -(up ? 380 : 560) * pow - Math.random() * 180;
          ball.spin = p.dir * 4;
          SND.kick(1); S.shake = 0.12;
          burst(ball.x, ball.y, "#fff", 5);
        }
      } else if (circleHit(ball, fx, fy, 13, p.vx, p.vy, 0.45)) S.lastTouch = p.i;
    }
    ball.x = Math.max(BALL_R, Math.min(FW - BALL_R, ball.x));
    ball.y = Math.max(BALL_R, Math.min(GROUND - BALL_R, ball.y));
    const sp = Math.hypot(ball.vx, ball.vy);
    if (sp > 1500) { ball.vx *= 1500 / sp; ball.vy *= 1500 / sp; }
    // gol?
    if (ball.y > BAR_Y + BAR_R && ball.x < GOAL_W - BALL_R * 0.6) return goal(1);
    if (ball.y > BAR_Y + BAR_R && ball.x > FW - GOAL_W + BALL_R * 0.6) return goal(0);
    // direk üstünde takılı kalırsa ortaya bırak
    if (Math.abs(ball.vx) < 15 && Math.abs(ball.vy) < 15 && ball.y < BAR_Y && (ball.x < GOAL_W + 10 || ball.x > FW - GOAL_W - 10)) {
      S.stuck += dt; if (S.stuck > 1.2) { ball.vx = ball.x < FW / 2 ? 260 : -260; ball.vy = -200; S.stuck = 0; }
    } else S.stuck = 0;
  }

  function goal(team) {
    S.score[team]++;
    SND.goal(); S.shake = 0.4;
    S.msg = "GOL!"; S.msgT = 2; S.msgTeam = team;
    for (let i = 0; i < 40; i++) burst(team === 0 ? FW - 40 : 40, GROUND - 80, i % 2 ? TEAM[team].shirt : "#FFD166", 1);
    say(`${TEAM[team].nm} gol attı! ${S.score[0]}, ${S.score[1]}`);
    if (S.golden) { S.over = true; setTimeout(finish, 1400); S.pause = 99; return; }
    S.pause = 99; S.afterGoal = 1.6; S.conceded = 1 - team;
  }

  /* ---------- bilgisayar ---------- */
  // seviye hem kararları hem koşu hızını etkiler
  function setAi(p, lvl) {
    p.ai = { lvl, think: 0, tx: p.x, wantJ: false, wantK: false };
    p.spd = (p.sup ? 400 : 320) * [0.85, 0.95, 1.06][lvl];
  }
  function aiInput(p, dt) {
    const A = p.ai, ball = S.ball, o = { l: 0, r: 0, j: 0, k: 0 };
    const LV = [{ react: 0.28, err: 70, spd: 0.7 }, { react: 0.09, err: 22, spd: 0.94 }, { react: 0.05, err: 12, spd: 1 }][A.lvl];
    A.think -= dt;
    const myGoalX = p.dir === 1 ? 0 : FW;
    if (A.think <= 0) {
      A.think = LV.react;
      // topun nereye düşeceğini kabaca tahmin et
      let bx = ball.x, by = ball.y, vx = ball.vx, vy = ball.vy;
      for (let i = 0; i < 30 && by < GROUND - BALL_R; i++) { vy += GRAV * 0.62 / 30; bx += vx / 30; by += vy / 30; }
      bx = Math.max(40, Math.min(FW - 40, bx));
      const opp = S.pl[1 - p.i], [, hy] = headPos(p);
      const dxb = ball.x - p.x, front = dxb * p.dir;
      const speed = Math.hypot(ball.vx, ball.vy);
      // topun arkasında (kendi kalesi tarafında) dur
      let tx = bx - p.dir * (26 + Math.random() * 10);
      // rakip topa daha yakınsa ve top rakip yarıdaysa biraz geride bekle (top yavaşsa bekleme, git al)
      const ownHalf = p.dir === 1 ? ball.x < FW / 2 : ball.x > FW / 2;
      if (!ownHalf && speed > 150 && Math.abs(opp.x - ball.x) < Math.abs(p.x - ball.x) - 60) tx = (p.dir === 1 ? FW * 0.34 : FW * 0.66);
      // kaleye gelen hızlı top: kalenin önüne geç
      const toward = ball.vx * -p.dir > 220, nearGoal = Math.abs(ball.x - myGoalX) < 420;
      let keeper = false;
      if (toward && nearGoal && front < 0) { tx = myGoalX + p.dir * (GOAL_W + 45); keeper = true; }
      A.tx = tx + (Math.random() - 0.5) * LV.err;
      // top arkada kaldıysa üstünden atla, şut çekme (kendi kalesine atmasın)
      const behindBall = front < -8 && Math.abs(dxb) < 85 && ball.y > GROUND - 70;
      A.wantJ = behindBall || (front > -6 && front < 90 && ball.y < hy - 10 && ball.y > hy - 200 && ball.vy > -200) ||
                (keeper && Math.abs(dxb) < 170 && ball.y < hy);
      A.wantK = !behindBall && front > -5 && front < 75 && ball.y > GROUND - 110;
      if (A.lvl === 0 && Math.random() < 0.35) A.wantK = false;
    }
    const d = A.tx - p.x;
    if (Math.abs(d) > 12) { if (d > 0) o.r = 1; else o.l = 1; }
    if (A.lvl < 2 && Math.random() > LV.spd) { o.l = o.r = 0; }
    o.j = A.wantJ ? 1 : 0;
    o.k = A.wantK ? 1 : 0;
    return o;
  }

  /* ---------- güncelleme ---------- */
  function update(dt) {
    if (!S) return;
    for (const f of S.fx) { f.t += dt; f.x += f.vx * dt; f.y += f.vy * dt; f.vy += 900 * dt; }
    S.fx = S.fx.filter(f => f.t < f.life);
    S.msgT = Math.max(0, S.msgT - dt); S.shake = Math.max(0, S.shake - dt);
    if (S.over) return;
    if (S.afterGoal > 0) { S.afterGoal -= dt; if (S.afterGoal <= 0) { kickoff(S.conceded); } }
    if (S.pause > 0 && S.pause < 50) { S.pause -= dt; if (S.pause <= 0) SND.whistle(false); return; }
    if (S.pause >= 50) { // gol sevinci sırasında oyuncular hareket edebilir ama top durur
      for (const p of S.pl) stepPlayer(p, dt, { l: 0, r: 0, j: 0, k: 0 });
      return;
    }
    const n = 4, h = dt / n;
    for (let i = 0; i < n; i++) { physics(h); if (S.pause > 0) break; }
    if (!S.golden) {
      S.time -= dt;
      if (S.time <= 0) {
        S.time = 0;
        if (S.score[0] === S.score[1]) { S.golden = true; S.msg = "ALTIN GOL!"; S.msgT = 2.5; S.msgTeam = -1; say("Berabere! Altın gol: ilk golü atan kazanır."); SND.whistle(false); }
        else { S.over = true; SND.whistle(true); setTimeout(finish, 900); }
      }
    }
  }
  function burst(x, y, col, n) { for (let i = 0; i < n; i++) { const a = Math.random() * 6.28, v = 120 + Math.random() * 320; S.fx.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 200, t: 0, life: 0.7 + Math.random() * 0.4, col }); } }

  function finish() {
    const [s0, s1] = S.score, w = s0 > s1 ? 0 : 1;
    $("end-icon").textContent = OPT.mode === "ai" && w === 1 ? "🤖" : "🏆";
    $("end-title").textContent = OPT.mode === "ai" ? (w === 0 ? "Kazandın!" : "Bilgisayar kazandı") : `${TEAM[w].nm} kazandı!`;
    $("end-score").innerHTML = `<span class="b">${s0}</span> – <span class="r">${s1}</span>`;
    $("end-text").textContent = S.golden ? "Maç altın golle bitti." : (OPT.mode === "ai" && w === 1 ? "Bir dahaki sefere! İstersen Süper güç seç." : "Harika maçtı!");
    $("end").hidden = false; $("again").focus();
    say(OPT.mode === "ai" ? (w === 0 ? "Tebrikler, kazandın!" : "Bilgisayar kazandı.") : `${TEAM[w].nm} kazandı! Tebrikler!`);
  }

  /* ---------- çizim ---------- */
  let W = 0, H = 0, sc = 1, ox = 0, oy = 0, dpr = 1;
  const bg = document.createElement("canvas"), bctx = bg.getContext("2d");
  function resize() {
    const r = stage.getBoundingClientRect();
    dpr = Math.min(2, window.devicePixelRatio || 1);
    W = r.width; H = r.height;
    cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr);
    sc = Math.min(W / FW, H / FH);
    ox = (W - FW * sc) / 2; oy = (H - FH * sc) / 2;
    renderBg();
  }
  function renderBg() {
    bg.width = Math.max(1, Math.round(FW * sc * dpr)); bg.height = Math.max(1, Math.round(FH * sc * dpr));
    const c = bctx; c.setTransform(sc * dpr, 0, 0, sc * dpr, 0, 0);
    const sky = c.createLinearGradient(0, 0, 0, GROUND); sky.addColorStop(0, "#5FB4F0"); sky.addColorStop(1, "#BFE4FA");
    c.fillStyle = sky; c.fillRect(0, 0, FW, FH);
    // tribün
    c.fillStyle = "#3D4B5C"; c.fillRect(0, 150, FW, 200);
    let seed = 7; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
    const crowd = ["#E5484D", "#2F7BEA", "#FFD166", "#FFFFFF", "#3CB371", "#F5922F", "#A35BE0"];
    for (let row = 0; row < 8; row++) for (let x = 6 + (row % 2) * 8; x < FW; x += 16) {
      c.fillStyle = crowd[Math.floor(rnd() * crowd.length)];
      c.beginPath(); c.arc(x, 166 + row * 22, 6, 0, 7); c.fill();
    }
    c.fillStyle = "#2B3644"; c.fillRect(0, 340, FW, 22);
    c.fillStyle = "#FFD166"; c.font = "800 15px Rubik, sans-serif"; c.textAlign = "center";
    for (let x = 80; x < FW; x += 220) c.fillText("EGEMEN ♥ ENES", x, 357);
    // çim
    for (let i = 0; i < 10; i++) { c.fillStyle = i % 2 ? "#46A853" : "#3F9E4D"; c.fillRect(i * 100, 362, 100, FH - 362); }
    c.strokeStyle = "rgba(255,255,255,.75)"; c.lineWidth = 3;
    c.beginPath(); c.moveTo(FW / 2, 370); c.lineTo(FW / 2, GROUND); c.stroke();
    c.beginPath(); c.ellipse(FW / 2, GROUND - 4, 90, 14, 0, Math.PI, 0); c.stroke();
    c.beginPath(); c.moveTo(0, GROUND); c.lineTo(FW, GROUND); c.stroke();
    c.fillStyle = "#2F7F3B"; c.fillRect(0, GROUND, FW, FH - GROUND);
    // kaleler (ağ)
    for (const side of [0, 1]) {
      const x0 = side ? FW - GOAL_W : 0;
      c.fillStyle = "rgba(255,255,255,.18)"; c.fillRect(x0, BAR_Y, GOAL_W, GOAL_H);
      c.strokeStyle = "rgba(255,255,255,.55)"; c.lineWidth = 1.2;
      for (let x = x0; x <= x0 + GOAL_W; x += 12) { c.beginPath(); c.moveTo(x, BAR_Y); c.lineTo(x, GROUND); c.stroke(); }
      for (let y = BAR_Y; y <= GROUND; y += 12) { c.beginPath(); c.moveTo(x0, y); c.lineTo(x0 + GOAL_W, y); c.stroke(); }
      c.strokeStyle = "#fff"; c.lineWidth = BAR_R * 2; c.lineCap = "round";
      c.beginPath(); c.moveTo(x0, BAR_Y); c.lineTo(x0 + GOAL_W, BAR_Y); c.stroke();
      const px = side ? FW - GOAL_W : GOAL_W;
      c.lineWidth = 6; c.beginPath(); c.moveTo(px, BAR_Y); c.lineTo(px, GROUND); c.stroke();
      c.lineCap = "butt";
    }
  }

  function drawPlayer(c, p) {
    const T = TEAM[p.i], [hx, hy] = headPos(p), [fx, fy] = footPos(p), d = p.dir;
    // gölge
    c.fillStyle = "rgba(0,0,0,.2)"; c.beginPath(); c.ellipse(p.x, GROUND + 3, 30, 6, 0, 0, 7); c.fill();
    // arka bacak
    c.strokeStyle = T.skin; c.lineWidth = 8; c.lineCap = "round";
    c.beginPath(); c.moveTo(p.x - d * 6, p.y - 22); c.lineTo(p.x - d * 10, p.y - 8); c.stroke();
    c.fillStyle = "#222"; c.beginPath(); c.ellipse(p.x - d * 10, p.y - 6, 11, 6, 0, 0, 7); c.fill();
    // gövde (forma)
    c.fillStyle = T.shirt; c.beginPath();
    c.moveTo(p.x - 19, p.y - 44); c.lineTo(p.x + 19, p.y - 44); c.lineTo(p.x + 15, p.y - 18); c.lineTo(p.x - 15, p.y - 18); c.closePath(); c.fill();
    c.fillStyle = "#fff"; c.font = "800 14px Rubik, sans-serif"; c.textAlign = "center"; c.textBaseline = "middle";
    c.fillText(p.i === 0 ? "7" : "10", p.x, p.y - 31);
    c.fillStyle = T.dark; c.fillRect(p.x - 15, p.y - 22, 30, 7);
    // ön bacak + ayakkabı (şut)
    c.strokeStyle = T.skin; c.lineWidth = 9;
    c.beginPath(); c.moveTo(p.x + d * 6, p.y - 22); c.lineTo(fx - d * 4, fy); c.stroke();
    c.fillStyle = p.kickT > 0 ? "#FFD166" : "#111";
    c.beginPath(); c.ellipse(fx, fy + 2, 13, 7, p.kickT > 0 ? -d * 0.5 : 0, 0, 7); c.fill();
    // kafa
    c.fillStyle = T.skin; c.beginPath(); c.arc(hx, hy, p.headR, 0, 7); c.fill();
    c.strokeStyle = "rgba(0,0,0,.25)"; c.lineWidth = 2; c.stroke();
    // saç
    c.fillStyle = T.hair; c.beginPath(); c.arc(hx, hy, p.headR, Math.PI * 1.02, Math.PI * 1.98); c.closePath(); c.fill();
    c.beginPath(); c.arc(hx - d * p.headR * 0.55, hy - p.headR * 0.55, p.headR * 0.38, 0, 7); c.fill();
    if (p.sup) { // süper güç bandı
      c.fillStyle = "#FFD166"; c.fillRect(hx - p.headR * 0.95, hy - p.headR * 0.38, p.headR * 1.9, p.headR * 0.2);
    }
    // gözler topa bakar
    const b = S.ball, ang = Math.atan2(b.y - hy, b.x - hx);
    for (const e of [-1, 1]) {
      const ex = hx + d * p.headR * 0.32 + e * p.headR * 0.27, ey = hy + p.headR * 0.02;
      c.fillStyle = "#fff"; c.beginPath(); c.arc(ex, ey, p.headR * 0.2, 0, 7); c.fill();
      c.fillStyle = "#1A1A1A"; c.beginPath(); c.arc(ex + Math.cos(ang) * p.headR * 0.08, ey + Math.sin(ang) * p.headR * 0.08, p.headR * 0.1, 0, 7); c.fill();
    }
    // ağız
    c.strokeStyle = "#7A3B2A"; c.lineWidth = 2.5;
    c.beginPath();
    if (S.msgT > 0 && S.msgTeam === p.i) c.arc(hx + d * p.headR * 0.3, hy + p.headR * 0.4, p.headR * 0.2, 0, Math.PI);
    else { c.moveTo(hx + d * p.headR * 0.15, hy + p.headR * 0.48); c.lineTo(hx + d * p.headR * 0.5, hy + p.headR * 0.45); }
    c.stroke();
    // kulak
    c.fillStyle = T.skin; c.beginPath(); c.arc(hx - d * p.headR * 0.9, hy + p.headR * 0.08, p.headR * 0.17, 0, 7); c.fill();
  }
  function drawBall(c, b) {
    c.fillStyle = "rgba(0,0,0,.18)";
    const sh = Math.max(0.3, 1 - (GROUND - b.y) / 400);
    c.beginPath(); c.ellipse(b.x, GROUND + 3, BALL_R * sh, 4 * sh, 0, 0, 7); c.fill();
    c.save(); c.translate(b.x, b.y); c.rotate(b.a);
    c.fillStyle = "#fff"; c.beginPath(); c.arc(0, 0, BALL_R, 0, 7); c.fill();
    c.strokeStyle = "#333"; c.lineWidth = 1.5; c.stroke();
    c.fillStyle = "#222";
    const pent = (x, y, r) => { c.beginPath(); for (let i = 0; i < 5; i++) { const a = -Math.PI / 2 + i * 2 * Math.PI / 5; c[i ? "lineTo" : "moveTo"](x + Math.cos(a) * r, y + Math.sin(a) * r); } c.closePath(); c.fill(); };
    pent(0, 0, 6);
    for (let i = 0; i < 5; i++) { const a = -Math.PI / 2 + i * 2 * Math.PI / 5; pent(Math.cos(a) * 14, Math.sin(a) * 14, 4); }
    c.restore();
  }
  function fmtTime(t) { const s = Math.ceil(t); return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`; }

  function draw() {
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = "#0B2236"; ctx.fillRect(0, 0, cv.width, cv.height);
    if (!S) return;
    const shx = S.shake > 0 ? (Math.random() - 0.5) * 8 * S.shake * 4 : 0, shy = S.shake > 0 ? (Math.random() - 0.5) * 8 * S.shake * 4 : 0;
    ctx.drawImage(bg, Math.round((ox + shx) * dpr), Math.round((oy + shy) * dpr));
    ctx.setTransform(sc * dpr, 0, 0, sc * dpr, (ox + shx) * dpr, (oy + shy) * dpr);
    for (const p of S.pl) drawPlayer(ctx, p);
    drawBall(ctx, S.ball);
    // kale direkleri öne (top ağın arkasında görünsün diye ön direk tekrar)
    ctx.strokeStyle = "#fff"; ctx.lineWidth = 6;
    ctx.beginPath(); ctx.moveTo(GOAL_W, BAR_Y); ctx.lineTo(GOAL_W, GROUND); ctx.moveTo(FW - GOAL_W, BAR_Y); ctx.lineTo(FW - GOAL_W, GROUND); ctx.stroke();
    for (const f of S.fx) { ctx.globalAlpha = Math.max(0, 1 - f.t / f.life); ctx.fillStyle = f.col; ctx.fillRect(f.x - 4, f.y - 4, 8, 8); }
    ctx.globalAlpha = 1;
    // skor tabelası
    ctx.fillStyle = "rgba(10,20,34,.85)";
    ctx.beginPath(); ctx.roundRect ? ctx.roundRect(FW / 2 - 150, 10, 300, 58, 14) : ctx.rect(FW / 2 - 150, 10, 300, 58); ctx.fill();
    ctx.textBaseline = "middle"; ctx.textAlign = "center";
    ctx.fillStyle = TEAM[0].shirt; ctx.fillRect(FW / 2 - 140, 20, 14, 38);
    ctx.fillStyle = TEAM[1].shirt; ctx.fillRect(FW / 2 + 126, 20, 14, 38);
    ctx.fillStyle = "#fff"; ctx.font = "800 34px Rubik, sans-serif";
    ctx.fillText(S.score[0], FW / 2 - 92, 40); ctx.fillText(S.score[1], FW / 2 + 92, 40);
    ctx.font = "800 22px Rubik, sans-serif"; ctx.fillStyle = S.golden ? "#FFD166" : (S.time < 10 ? "#FF8A8A" : "#fff");
    ctx.fillText(S.golden ? "ALTIN GOL" : fmtTime(S.time), FW / 2, 40);
    if (S.msgT > 0) {
      const k = Math.min(1, (2.5 - S.msgT) * 6), s = 0.6 + 0.4 * k;
      ctx.save(); ctx.translate(FW / 2, 210); ctx.scale(s, s);
      ctx.font = "800 96px Rubik, sans-serif"; ctx.lineWidth = 10; ctx.strokeStyle = "rgba(10,20,34,.85)";
      ctx.fillStyle = S.msgTeam >= 0 ? TEAM[S.msgTeam].shirt : "#FFD166";
      ctx.strokeText(S.msg, 0, 0); ctx.fillText(S.msg, 0, 0);
      ctx.restore();
    }
    if (paused) {
      ctx.fillStyle = "rgba(0,0,0,.45)"; ctx.fillRect(0, 0, FW, FH);
      ctx.fillStyle = "#fff"; ctx.font = "800 48px Rubik, sans-serif"; ctx.fillText("Duraklatıldı", FW / 2, FH / 2);
    }
  }

  /* ---------- girdi ---------- */
  const KEYMAP = { a: [0, "l"], d: [0, "r"], w: [0, "j"], s: [0, "k"], " ": [0, "k"],
                   arrowleft: [1, "l"], arrowright: [1, "r"], arrowup: [1, "j"], arrowdown: [1, "k"], enter: [1, "k"] };
  function setKey(e, v) {
    const m = KEYMAP[e.key.toLowerCase()];
    if (!m) return;
    if (!$("menu").hidden || !$("end").hidden) return;
    e.preventDefault();
    keys[m[0]][m[1]] = v;
  }
  document.addEventListener("keydown", (e) => { if (e.key === "p" || e.key === "P" || e.key === "Escape") { togglePause(); return; } setKey(e, 1); });
  document.addEventListener("keyup", (e) => setKey(e, 0));
  window.addEventListener("blur", () => keys.forEach(k => (k.l = k.r = k.j = k.k = 0)));
  // dokunmatik tuşlar (çoklu dokunuş)
  document.querySelectorAll(".pad button").forEach(btn => {
    const p = +btn.dataset.p, k = btn.dataset.k;
    const on = (e) => { e.preventDefault(); keys[p][k] = 1; btn.classList.add("on"); try { btn.setPointerCapture(e.pointerId); } catch (_) {} ac(); };
    const off = () => { keys[p][k] = 0; btn.classList.remove("on"); };
    btn.addEventListener("pointerdown", on);
    btn.addEventListener("pointerup", off); btn.addEventListener("pointercancel", off); btn.addEventListener("lostpointercapture", off);
    btn.addEventListener("contextmenu", (e) => e.preventDefault());
  });
  function togglePause() { if (!S || S.over || !$("menu").hidden) return; paused = !paused; $("pause").textContent = paused ? "▶" : "⏸"; $("pause").setAttribute("aria-label", paused ? "Devam et" : "Duraklat"); }
  $("pause").addEventListener("click", togglePause);
  $("sound").addEventListener("click", () => {
    soundOn = !soundOn; $("ic-on").hidden = !soundOn; $("ic-off").hidden = soundOn;
    $("sound").setAttribute("aria-pressed", soundOn); $("sound").setAttribute("aria-label", soundOn ? "Sesi kapat" : "Sesi aç");
    if (!soundOn && "speechSynthesis" in window) speechSynthesis.cancel();
  });

  /* ---------- menü ---------- */
  function bindSeg(id, key, num) {
    const box = $(id);
    const render = () => box.querySelectorAll("button").forEach(b => b.setAttribute("aria-checked", String(b.dataset.v) === String(OPT[key])));
    box.querySelectorAll("button").forEach(b => b.addEventListener("click", () => { OPT[key] = num ? +b.dataset.v : b.dataset.v; render(); renderMenu(); }));
    render();
  }
  function renderMenu() {
    $("row-ai").hidden = OPT.mode !== "ai";
    $("row-p2").hidden = OPT.mode === "ai";
    $("pad2").hidden = OPT.mode === "ai";
  }
  bindSeg("o-mode", "mode", false); bindSeg("o-ai", "ai", true); bindSeg("o-p1", "p1", true); bindSeg("o-p2", "p2", true); bindSeg("o-time", "time", true);
  renderMenu();
  $("go").addEventListener("click", () => { store(); $("menu").hidden = true; paused = false; newMatch(); ac(); say("Maç başlıyor!"); });
  $("again").addEventListener("click", () => { $("end").hidden = true; newMatch(); });
  $("to-menu").addEventListener("click", () => { $("end").hidden = true; $("menu").hidden = false; });

  /* ---------- döngü ---------- */
  let last = performance.now();
  function loop(now) {
    const dt = Math.min(0.04, (now - last) / 1000); last = now;
    const sr = stage.getBoundingClientRect();
    if (Math.abs(sr.width - W) > 0.5 || Math.abs(sr.height - H) > 0.5) resize();
    if (!paused && $("menu").hidden) update(dt);
    draw();
    requestAnimationFrame(loop);
  }
  resize();
  newMatch(); S.pause = 1e9; // menü arkasında duran saha
  requestAnimationFrame(loop);

  // test kancası
  window.__kafa = { get S() { return S; }, OPT, keys, update, newMatch, kickoff, mkPlayer, aiOn: (i, lvl) => setAi(S.pl[i], lvl) };
})();
