(() => {
  "use strict";
  const $ = id => document.getElementById(id);

  /* ---------- masa ---------- */
  const W = 360, H = 640;
  const L = 30, R = 330, T = 40, B = 600;              // çuhanın kenarları
  const BR = 10;                                       // top yarıçapı
  const POCKETS = [{x: L, y: T}, {x: R, y: T}, {x: L - 2, y: (T + B) / 2}, {x: R + 2, y: (T + B) / 2}, {x: L, y: B}, {x: R, y: B}];
  const POCKET_R = 17, MOUTH = 27;
  const CUE_SPOT = {x: 180, y: 480}, BLACK_SPOT = {x: 180, y: 190};
  const MAXP = 1050;                                   // en sert vuruş hızı
  const FRIC = .9, ROLL = 14;                          // hıza bağlı ve sabit sürtünme
  const COLS = [{c: "#3D8BFD", d: "#1F5FC2"}, {c: "#FF7A2F", d: "#C2531A"}];
  const CPU_ERR = [4.5, 1.8, .6];                       // derece

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
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + .003); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(a.destination); o.start(t); o.stop(t + dur + .05);
  }
  let clickT = 0;
  const sClick = v => { const now = performance.now(); if (now - clickT < 25) return; clickT = now; tone(1800, 1200, "triangle", .04, Math.min(.25, .03 + v / 2500)); };
  const sCushion = v => tone(140, 90, "sine", .08, Math.min(.2, v / 3000));
  const sShot = p => tone(900, 400, "triangle", .06, .1 + p * .15);
  const sPot = () => { tone(300, 120, "sine", .25, .2); tone(200, 80, "triangle", .3, .12, .05); };
  const sWin = () => [523, 659, 784, 1047, 1319].forEach((f, k) => tone(f, f, "triangle", .22, .13, k * .09));

  const canSpeak = "speechSynthesis" in window;
  let trVoice = null;
  function pickVoice(){ trVoice = speechSynthesis.getVoices().find(v => /^tr(-|_|$)/i.test(v.lang)) || null; }
  if (canSpeak){ pickVoice(); if (speechSynthesis.addEventListener) speechSynthesis.addEventListener("voiceschanged", pickVoice); }
  function say(text){
    if (!canSpeak || !soundOn || !trVoice) return;
    speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text); u.voice = trVoice; u.lang = trVoice.lang; u.rate = 1; u.pitch = 1.1;
    speechSynthesis.speak(u);
  }
  function suffix(name){
    const dig = {"1":"'de","2":"'de","3":"'te","4":"'te","5":"'te","6":"'da","7":"'de","8":"'de","9":"'da","0":"'da"}[name.slice(-1)];
    if (dig) return dig;
    const low = name.toLocaleLowerCase("tr");
    const vowels = low.match(/[aeıioöuü]/g);
    const v = vowels ? vowels[vowels.length - 1] : "e";
    const back = "aıou".includes(v);
    const hard = /[fstkçşhp]$/.test(low);
    return "'" + (hard ? "t" : "d") + (back ? "a" : "e");
  }
  function renderSound(){
    $("ic-on").hidden = !soundOn; $("ic-off").hidden = soundOn;
    $("sound").setAttribute("aria-label", soundOn ? "Sesi kapat" : "Sesi aç");
    $("sound").setAttribute("aria-pressed", String(soundOn));
  }
  $("sound").addEventListener("click", () => { soundOn = !soundOn; if (!soundOn && canSpeak) speechSynthesis.cancel(); renderSound(); });
  renderSound();

  /* ---------- durum ---------- */
  let G = null;
  // kind: "cue" | "k" (siyah) | 0 | 1 (oyuncu grubu)
  function rack(n){
    const total = n * 2 + 1, pos = [], gap = BR * 2.04, dy = gap * Math.sqrt(3) / 2;
    for (let row = 0; pos.length < total; row++) for (let k = 0; k <= row && pos.length < total; k++) pos.push({x: 180 + (k - row / 2) * gap, y: 210 - row * dy});
    // siyah 3. sıranın ortasına (5. top), renkler karışık ama iki arka köşe farklı renkte
    const kinds = []; for (let i = 0; i < n; i++) kinds.push(0, 1);
    for (let i = kinds.length - 1; i > 0; i--){ const j = Math.random() * (i + 1) | 0; [kinds[i], kinds[j]] = [kinds[j], kinds[i]]; }
    kinds.splice(4, 0, "k");
    return pos.map((p, i) => ({x: p.x, y: p.y, vx: 0, vy: 0, kind: kinds[i], in: false}));
  }
  function newGame(cfg){
    const balls = rack(cfg.size);
    balls.push({x: CUE_SPOT.x, y: CUE_SPOT.y, vx: 0, vy: 0, kind: "cue", in: false});
    G = {cfg, balls, cur: 0, moving: false, aim: null, shot: null, over: false, t: 0, cpuT: 0, msg: ""};
    ["setup", "end"].forEach(id => $(id).hidden = true);
    turnStart(true);
  }
  const cue = () => G.balls.find(b => b.kind === "cue");
  const P = () => G.cfg.players[G.cur];
  const left = k => G.balls.filter(b => b.kind === k && !b.in).length;
  const cleared = k => left(k) === 0;

  function turnStart(first){
    G.aim = null; render();
    const p = P();
    setStatus(first ? `${p.name} başlıyor.` : `Sıra ${p.name}${suffix(p.name)}.${cleared(G.cur) ? " Şimdi siyah top!" : ""}`);
    if (p.cpu){ G.cpuT = 1.1; return; }
    if (p.help) say(cleared(G.cur) ? `Sıra ${p.name}${suffix(p.name)}. Şimdi siyah top!` : `Sıra ${p.name}${suffix(p.name)}`);
  }
  function setStatus(t){ $("status").textContent = t; }

  function shoot(dx, dy, power){
    const c = cue(), l = Math.hypot(dx, dy) || 1;
    c.vx = dx / l * power * MAXP; c.vy = dy / l * power * MAXP;
    G.moving = true; G.aim = null;
    G.shot = {potted: [], first: null, cueIn: false};
    sShot(power);
  }

  /* ---------- fizik ---------- */
  function step(dt){
    const bs = G.balls.filter(b => !b.in);
    for (const b of bs){
      b.x += b.vx * dt; b.y += b.vy * dt;
      const sp = Math.hypot(b.vx, b.vy);
      if (sp > 0){
        const ns = Math.max(0, sp * Math.exp(-FRIC * dt) - ROLL * dt);
        b.vx *= ns / sp; b.vy *= ns / sp;
      }
    }
    // top-top
    for (let i = 0; i < bs.length; i++) for (let j = i + 1; j < bs.length; j++){
      const a = bs[i], c = bs[j], dx = c.x - a.x, dy = c.y - a.y, d = Math.hypot(dx, dy);
      if (d >= BR * 2 || d === 0) continue;
      const nx = dx / d, ny = dy / d, over = BR * 2 - d;
      a.x -= nx * over / 2; a.y -= ny * over / 2; c.x += nx * over / 2; c.y += ny * over / 2;
      const vn = (a.vx - c.vx) * nx + (a.vy - c.vy) * ny;
      if (vn > 0){
        const j2 = vn * .97;
        a.vx -= j2 * nx; a.vy -= j2 * ny; c.vx += j2 * nx; c.vy += j2 * ny;
        sClick(vn);
        if (G.shot && !G.shot.first){ if (a.kind === "cue") G.shot.first = c.kind; else if (c.kind === "cue") G.shot.first = a.kind; }
      }
    }
    // delikler ve bantlar
    for (const b of bs){
      let near = false;
      for (const p of POCKETS){
        const d = Math.hypot(b.x - p.x, b.y - p.y);
        if (d < POCKET_R){ pot(b); break; }
        if (d < MOUTH) near = true;
      }
      if (b.in) continue;
      if (!near){
        if (b.x < L + BR){ b.x = L + BR; if (b.vx < 0){ sCushion(-b.vx); b.vx = -b.vx * .78; } }
        if (b.x > R - BR){ b.x = R - BR; if (b.vx > 0){ sCushion(b.vx); b.vx = -b.vx * .78; } }
        if (b.y < T + BR){ b.y = T + BR; if (b.vy < 0){ sCushion(-b.vy); b.vy = -b.vy * .78; } }
        if (b.y > B - BR){ b.y = B - BR; if (b.vy > 0){ sCushion(b.vy); b.vy = -b.vy * .78; } }
      } else if (b.x < L - 8 || b.x > R + 8 || b.y < T - 8 || b.y > B + 8){
        pot(b);                                         // ağızdan dışarı kaçan top deliğe düşmüş sayılır
      }
    }
  }
  function pot(b){
    b.in = true; b.vx = b.vy = 0; sPot();
    if (G.shot){ if (b.kind === "cue") G.shot.cueIn = true; else G.shot.potted.push(b.kind); }
  }
  function placeFree(b, spot){
    // noktaya en yakın boş yer
    for (let r = 0; r < 200; r += 4) for (let a = 0; a < Math.PI * 2; a += .5){
      const x = spot.x + Math.cos(a) * r, y = spot.y + Math.sin(a) * r;
      if (x < L + BR || x > R - BR || y < T + BR || y > B - BR) continue;
      if (G.balls.every(o => o === b || o.in || Math.hypot(o.x - x, o.y - y) > BR * 2.1)){ b.x = x; b.y = y; b.in = false; b.vx = b.vy = 0; return; }
      if (r === 0) break;
    }
  }

  function shotOver(){
    G.moving = false;
    const s = G.shot, me = G.cur, p = P();
    const mine = s.potted.filter(k => k === me).length;
    let keep = mine > 0, msg = "";
    if (s.potted.includes("k")){
      // kendi topları bittiyse siyahı sokan kazanır; bitmediyse siyah yerine konur (çocuk kuralı)
      if (cleared(me)){ finish(me); return; }
      placeFree(G.balls.find(b => b.kind === "k"), BLACK_SPOT);
      msg = "Siyah top erken girdi, yerine kondu.";
      keep = false;
    }
    if (s.cueIn){ placeFree(cue(), CUE_SPOT); msg = "Beyaz top deliğe girdi! Sıra karşıda."; keep = false; }
    else if (!s.first){ msg = msg || "Hiçbir topa değmedi."; }
    if (mine && keep){ msg = `${mine > 1 ? mine + " top" : "Süper"}! ${p.name} bir daha vuruyor.`; if (p.help && !p.cpu) say("Süper! Bir daha vur."); }
    G.shot = null;
    if (!keep) G.cur = 1 - G.cur;
    setStatus(msg);
    G.pending = {t: .5, msg};
    render();
  }
  function finish(w){
    G.over = true; G.moving = false;
    const wp = G.cfg.players[w];
    $("end-title").textContent = `${wp.name} kazandı!`;
    $("end-note").textContent = G.cfg.cpu ? (w === 0 ? "Bilgisayarı yendin! 🎱" : "Bilgisayar kazandı, bir daha dene!") : "Siyah top girdi! 🎱";
    sWin(); say(`${wp.name} kazandı!`);
    render();
    setTimeout(() => { $("end").hidden = false; $("again").focus(); }, 700);
  }

  /* ---------- nişan ---------- */
  // beyaz topun (x,y)'den (dx,dy) yönünde ilk çarpacağı top ya da bant
  function trace(x, y, dx, dy){
    let best = Infinity, hit = null;
    for (const b of G.balls){
      if (b.in || b.kind === "cue") continue;
      const fx = b.x - x, fy = b.y - y, t = fx * dx + fy * dy;
      if (t <= 0) continue;
      const perp2 = fx * fx + fy * fy - t * t, rr = (BR * 2) ** 2;
      if (perp2 > rr) continue;
      const th = t - Math.sqrt(rr - perp2);
      if (th < best){ best = th; hit = b; }
    }
    // bant
    let tw = Infinity;
    if (dx > 0) tw = Math.min(tw, (R - BR - x) / dx); if (dx < 0) tw = Math.min(tw, (L + BR - x) / dx);
    if (dy > 0) tw = Math.min(tw, (B - BR - y) / dy); if (dy < 0) tw = Math.min(tw, (T + BR - y) / dy);
    if (tw < best) return {t: tw, ball: null};
    return {t: best, ball: hit};
  }
  function clearPath(x0, y0, x1, y1, skip){
    const dx = x1 - x0, dy = y1 - y0, l = Math.hypot(dx, dy); if (!l) return true;
    const ux = dx / l, uy = dy / l;
    for (const b of G.balls){
      if (b.in || skip.includes(b)) continue;
      const fx = b.x - x0, fy = b.y - y0, t = fx * ux + fy * uy;
      if (t < 0 || t > l) continue;
      if (fx * fx + fy * fy - t * t < (BR * 2) ** 2) return false;
    }
    return true;
  }

  /* ---------- bilgisayar ---------- */
  function cpuShot(){
    const me = G.cur, c = cue();
    const targets = G.balls.filter(b => !b.in && (cleared(me) ? b.kind === "k" : b.kind === me));
    let best = null;
    for (const b of targets) for (const p of POCKETS){
      const px = p.x - b.x, py = p.y - b.y, pl = Math.hypot(px, py);
      const gx = b.x - px / pl * BR * 2, gy = b.y - py / pl * BR * 2;       // hayalet top
      const ax = gx - c.x, ay = gy - c.y, al = Math.hypot(ax, ay);
      const cut = Math.acos(Math.max(-1, Math.min(1, (ax * px + ay * py) / (al * pl)))) * 180 / Math.PI;
      if (cut > 72) continue;
      if (!clearPath(c.x, c.y, gx, gy, [c, b]) || !clearPath(b.x, b.y, p.x, p.y, [b])) continue;
      const score = cut * 1.4 + (al + pl) * .08;
      if (!best || score < best.score) best = {score, ax, ay, dist: al + pl, cut};
    }
    let ax, ay, power;
    if (best){ ax = best.ax; ay = best.ay; power = Math.min(.95, .32 + best.dist / 900 + best.cut / 250); }
    else {
      // iyi vuruş yoksa kendi topuna doğru orta sertlikte vur
      const b = targets.sort((u, v) => Math.hypot(u.x - c.x, u.y - c.y) - Math.hypot(v.x - c.x, v.y - c.y))[0] || G.balls.find(o => !o.in && o.kind !== "cue");
      ax = b.x - c.x; ay = b.y - c.y; power = .55;
    }
    const err = (Math.random() * 2 - 1) * CPU_ERR[G.cfg.level] * Math.PI / 180, a = Math.atan2(ay, ax) + err;
    return {dx: Math.cos(a), dy: Math.sin(a), power};
  }

  /* ---------- döngü ---------- */
  function update(dt){
    if (!G || G.over) return;
    G.t += dt;
    if (G.moving){
      const n = 6; for (let k = 0; k < n; k++) step(dt / n);
      if (G.balls.every(b => b.in || Math.hypot(b.vx, b.vy) < 4)){
        G.balls.forEach(b => {
          b.vx = b.vy = 0;
          // deliğin ağzında bandın içine taşmış duran top masaya geri alınır
          if (!b.in){ b.x = Math.max(L + BR, Math.min(R - BR, b.x)); b.y = Math.max(T + BR, Math.min(B - BR, b.y)); }
        });
        shotOver();
      }
      return;
    }
    if (G.pending){
      G.pending.t -= dt;
      if (G.pending.t > 0) return;
      const msg = G.pending.msg; G.pending = null;
      turnStart(false); if (msg) setStatus(msg + " " + $("status").textContent);
      return;
    }
    if (P().cpu && !G.over){
      G.cpuT -= dt;
      if (G.cpuT <= 0 && !G.cpuPlan){ G.cpuPlan = cpuShot(); G.cpuPlanT = 0; }
      if (G.cpuPlan){
        G.cpuPlanT += dt;
        const c = cue(), pl = G.cpuPlan, k = Math.min(1, G.cpuPlanT / .7);
        G.aim = {dx: pl.dx, dy: pl.dy, power: pl.power * k};
        if (G.cpuPlanT > .9){ shoot(pl.dx, pl.dy, pl.power); G.cpuPlan = null; }
      }
    }
  }

  /* ---------- çizim ---------- */
  const cv = $("cv"), stage = $("stage"), ctx = cv.getContext("2d");
  let view = {s: 1, ox: 0, oy: 0, dpr: 1};
  function resize(){
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const cw = stage.clientWidth, ch = stage.clientHeight;
    cv.width = Math.round(cw * dpr); cv.height = Math.round(ch * dpr);
    const s = Math.min(cw / W, ch / H);
    view = {s, ox: (cw - W * s) / 2, oy: (ch - H * s) / 2, dpr};
  }
  const toLogical = e => { const r = cv.getBoundingClientRect(); return {x: (e.clientX - r.left - view.ox) / view.s, y: (e.clientY - r.top - view.oy) / view.s}; };

  function ball(b){
    const col = b.kind === "cue" ? {c: "#FAFAF5", d: "#C9C9BE"} : b.kind === "k" ? {c: "#2A2A2A", d: "#000"} : COLS[b.kind];
    ctx.fillStyle = "rgba(0,0,0,.3)"; ctx.beginPath(); ctx.arc(b.x + 2, b.y + 3, BR, 0, Math.PI * 2); ctx.fill();
    const g = ctx.createRadialGradient(b.x - 3, b.y - 4, 1, b.x, b.y, BR);
    g.addColorStop(0, "#FFFFFF"); g.addColorStop(.25, col.c); g.addColorStop(1, col.d);
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(b.x, b.y, BR, 0, Math.PI * 2); ctx.fill();
    if (b.kind === "k"){ ctx.fillStyle = "#fff"; ctx.beginPath(); ctx.arc(b.x, b.y, 4.6, 0, Math.PI * 2); ctx.fill(); ctx.fillStyle = "#111"; ctx.font = "800 7px Rubik, sans-serif"; ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.fillText("8", b.x, b.y + .5); }
  }
  function draw(){
    const {s, ox, oy, dpr} = view;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, cv.width, cv.height);
    ctx.setTransform(dpr * s, 0, 0, dpr * s, dpr * ox, dpr * oy);
    // ahşap ve çuha
    ctx.fillStyle = "#6B3E22"; ctx.beginPath(); ctx.roundRect(L - 26, T - 26, R - L + 52, B - T + 52, 20); ctx.fill();
    ctx.fillStyle = "#8A5330"; ctx.beginPath(); ctx.roundRect(L - 18, T - 18, R - L + 36, B - T + 36, 14); ctx.fill();
    ctx.fillStyle = "#1E7A4A"; ctx.fillRect(L - 6, T - 6, R - L + 12, B - T + 12);
    const felt = ctx.createRadialGradient(180, 320, 40, 180, 320, 360); felt.addColorStop(0, "#2A9A5E"); felt.addColorStop(1, "#1C6E43");
    ctx.fillStyle = felt; ctx.fillRect(L, T, R - L, B - T);
    ctx.strokeStyle = "rgba(255,255,255,.18)"; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(L, CUE_SPOT.y - 40); ctx.lineTo(R, CUE_SPOT.y - 40); ctx.stroke();
    ctx.fillStyle = "rgba(255,255,255,.3)"; ctx.beginPath(); ctx.arc(BLACK_SPOT.x, BLACK_SPOT.y, 2, 0, Math.PI * 2); ctx.fill();
    for (const p of POCKETS){ ctx.fillStyle = "#0B0B0B"; ctx.beginPath(); ctx.arc(p.x, p.y, POCKET_R + 2, 0, Math.PI * 2); ctx.fill(); }
    if (!G) return;
    for (const b of G.balls) if (!b.in) ball(b);
    // nişan (topların üstünde görünsün)
    const c = cue();
    if (G.aim && !G.moving && !c.in){
      const a = G.aim, help = P().help && !P().cpu;
      const tr = trace(c.x, c.y, a.dx, a.dy);
      const len = help ? tr.t : Math.min(tr.t, 70);
      ctx.strokeStyle = "rgba(255,255,255,.75)"; ctx.lineWidth = 2; ctx.setLineDash([6, 6]);
      ctx.beginPath(); ctx.moveTo(c.x, c.y); ctx.lineTo(c.x + a.dx * len, c.y + a.dy * len); ctx.stroke(); ctx.setLineDash([]);
      if (help && tr.ball){
        const gx = c.x + a.dx * tr.t, gy = c.y + a.dy * tr.t;
        ctx.strokeStyle = "rgba(255,255,255,.8)"; ctx.beginPath(); ctx.arc(gx, gy, BR, 0, Math.PI * 2); ctx.stroke();
        const nx = tr.ball.x - gx, ny = tr.ball.y - gy, nl = Math.hypot(nx, ny) || 1;
        ctx.strokeStyle = "#FFD166"; ctx.lineWidth = 2.5;
        ctx.beginPath(); ctx.moveTo(tr.ball.x, tr.ball.y); ctx.lineTo(tr.ball.x + nx / nl * 90, tr.ball.y + ny / nl * 90); ctx.stroke();
      }
      // isteka
      const back = 18 + a.power * 70;
      ctx.strokeStyle = "#D9A066"; ctx.lineWidth = 6; ctx.lineCap = "round";
      ctx.beginPath(); ctx.moveTo(c.x - a.dx * back, c.y - a.dy * back); ctx.lineTo(c.x - a.dx * (back + 210), c.y - a.dy * (back + 210)); ctx.stroke();
      ctx.strokeStyle = "#F3F0E6"; ctx.lineWidth = 6;
      ctx.beginPath(); ctx.moveTo(c.x - a.dx * back, c.y - a.dy * back); ctx.lineTo(c.x - a.dx * (back + 8), c.y - a.dy * (back + 8)); ctx.stroke();
      // güç çubuğu
      ctx.fillStyle = "rgba(0,0,0,.4)"; ctx.fillRect(L + 10, B + 8, R - L - 20, 8);
      ctx.fillStyle = a.power > .75 ? "#FF6B6B" : "#FFD166"; ctx.fillRect(L + 10, B + 8, (R - L - 20) * a.power, 8);
    }
  }

  function render(){
    if (!G) return;
    const box = $("score"); box.innerHTML = "";
    G.cfg.players.forEach((p, i) => {
      const d = document.createElement("div");
      d.className = "pl" + (i === G.cur && !G.over ? " on" : "");
      const balls = G.balls.filter(b => b.kind === i);
      d.innerHTML = `<span class="nm"></span><span class="balls">${balls.map(b => `<i class="${b.in ? "gone" : ""}" style="background:${COLS[i].c}"></i>`).join("")}${cleared(i) ? '<i class="k"></i>' : ""}</span>`;
      d.querySelector(".nm").textContent = p.name + (p.cpu ? " 🤖" : "");
      box.appendChild(d);
    });
  }

  /* ---------- dokunma: çek ve bırak ---------- */
  let drag = null;
  cv.addEventListener("pointerdown", e => {
    if (!G || G.over || G.moving || P().cpu) return;
    e.preventDefault(); audio();
    try { cv.setPointerCapture(e.pointerId); } catch (err) {}
    drag = e.pointerId; aimAt(toLogical(e));
  });
  cv.addEventListener("pointermove", e => { if (drag === e.pointerId) aimAt(toLogical(e)); });
  cv.addEventListener("pointerup", e => {
    if (drag !== e.pointerId) return; drag = null;
    if (G && G.aim && G.aim.power > .04) shoot(G.aim.dx, G.aim.dy, G.aim.power);
    else if (G) G.aim = null;
  });
  cv.addEventListener("pointercancel", () => { drag = null; if (G) G.aim = null; });
  function aimAt(p){
    const c = cue(), dx = c.x - p.x, dy = c.y - p.y, d = Math.hypot(dx, dy);
    if (d < 4) return;
    G.aim = {dx: dx / d, dy: dy / d, power: Math.max(0, Math.min(1, (d - 22) / 170))};
  }

  /* ---------- kurulum ---------- */
  const form = $("setup-form");
  function syncMode(){
    const cpu = form.mode.value === "cpu";
    $("cpu-level").hidden = !cpu;
    $("pn-1").disabled = cpu;
    $("pn-1").value = cpu ? "Bilgisayar" : ($("pn-1").dataset.name || "Egemen");
    $("help-1").closest(".toggle").hidden = cpu;
  }
  form.addEventListener("change", e => { if (e.target.name === "mode") syncMode(); });
  $("pn-1").addEventListener("input", e => { if (!e.target.disabled) e.target.dataset.name = e.target.value; });
  form.addEventListener("submit", e => {
    e.preventDefault(); audio();
    const cpu = form.mode.value === "cpu";
    newGame({cpu, level: +form.cpu.value, size: +form.size.value, players: [
      {name: $("pn-0").value.trim() || "Mavi", help: $("help-0").checked, cpu: false},
      {name: $("pn-1").value.trim() || "Turuncu", help: !cpu && $("help-1").checked, cpu}
    ]});
  });
  $("open-setup").addEventListener("click", () => { if (G) G.over = true; $("end").hidden = true; $("setup").hidden = false; });
  $("end-setup").addEventListener("click", () => { $("end").hidden = true; $("setup").hidden = false; });
  $("again").addEventListener("click", () => { audio(); newGame(G.cfg); });
  $("pn-0").value = "Enes"; $("pn-1").value = "Egemen"; $("pn-1").dataset.name = "Egemen";
  syncMode();

  let last = performance.now();
  function frame(now){
    const dt = Math.min(.033, (now - last) / 1000); last = now;
    update(dt); draw();
    requestAnimationFrame(frame);
  }
  document.addEventListener("visibilitychange", () => { last = performance.now(); });
  if ("ResizeObserver" in window) new ResizeObserver(resize).observe(stage); else window.addEventListener("resize", resize);
  resize();
  requestAnimationFrame(frame);

  // testler için
  window.__bilardo = {state: () => G, newGame, update, shoot, cpuShot, trace, POCKETS, BR, L, R, T, B, cue};
})();
