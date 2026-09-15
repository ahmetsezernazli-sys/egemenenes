/* Golf Adası — 9 delikli mini golf, 1-4 oyuncu */
(function(){
  "use strict";

  /* ---------- delikler (saha 1000 x 600) ---------- */
  const rect = (x0, y0, x1, y1) => [[x0, y0], [x1, y0], [x1, y1], [x0, y1]];
  const HOLES = [
    {name:"İlk Vuruş", par:2, tee:[190, 300], hole:[810, 300],
      shape:rect(80, 120, 920, 480)},
    {name:"Duvar", par:3, tee:[180, 180], hole:[820, 180],
      shape:rect(80, 80, 920, 520),
      blocks:[rect(470, 80, 530, 380)]},
    {name:"L Viraj", par:3, tee:[250, 160], hole:[840, 440],
      shape:[[80, 80], [420, 80], [420, 360], [920, 360], [920, 520], [80, 520]],
      blocks:[[[80, 430], [170, 520], [80, 520]]]},
    {name:"Göl", par:3, tee:[170, 300], hole:[850, 300],
      shape:rect(80, 100, 920, 500),
      water:[ellipse(500, 300, 150, 130)],
      sand:[rect(700, 120, 790, 210), rect(700, 390, 790, 480)]},
    {name:"Tamponlar", par:3, tee:[170, 300], hole:[830, 300],
      shape:rect(80, 80, 920, 520),
      bumpers:[[400, 200, 26], [400, 400, 26], [520, 300, 26], [640, 200, 26], [640, 400, 26]],
      blocks:[rect(740, 220, 760, 380)]},
    {name:"Yel Değirmeni", par:3, tee:[180, 300], hole:[820, 300],
      shape:[[80, 120], [400, 120], [400, 240], [600, 240], [600, 120], [920, 120], [920, 480], [600, 480], [600, 360], [400, 360], [400, 480], [80, 480]],
      mills:[{x:500, y:300, len:60, speed:1.6, blades:2}]},
    {name:"Hız Pisti", par:3, tee:[160, 175], hole:[160, 425],
      shape:[[80, 80], [920, 80], [920, 520], [80, 520], [80, 330], [760, 330], [760, 270], [80, 270]],
      blocks:[[[830, 80], [920, 80], [920, 170]], [[920, 430], [920, 520], [830, 520]]],
      boosts:[{r:rect(450, 140, 570, 210), dir:0}, {r:rect(450, 390, 570, 460), dir:Math.PI}]},
    {name:"Kayan Kapılar", par:3, tee:[190, 300], hole:[820, 400],
      shape:rect(80, 80, 920, 520),
      blocks:[rect(360, 80, 390, 240), rect(360, 360, 390, 520), rect(620, 80, 650, 340), rect(620, 460, 650, 520)],
      movers:[{w:30, h:100, ax:375, ay:190, bx:375, by:410, period:3.2, phase:0}, {w:30, h:90, ax:635, ay:330, bx:635, by:470, period:2.6, phase:.5}]},
    {name:"Ada", par:4, tee:[160, 300], hole:[800, 300],
      shape:rect(60, 60, 940, 540),
      blocks:[[[270, 250], [320, 300], [270, 350], [220, 300]]],
      water:[rect(380, 60, 460, 250), rect(380, 350, 460, 540), rect(460, 60, 940, 150), rect(460, 450, 940, 540), rect(900, 150, 940, 450)],
      sand:[rect(690, 220, 730, 380)],
      bumpers:[[610, 300, 22]]}
  ];
  function ellipse(cx, cy, rx, ry){ const p = []; for (let i = 0; i < 28; i++){ const a = i/28*Math.PI*2; p.push([cx + Math.cos(a)*rx, cy + Math.sin(a)*ry]); } return p; }

  const BALL_R = 9, HOLE_R = 15, WALL_W = 6, DT = 1/120;
  const MIN_SPEED = 90, MAX_SPEED = 1320, MAX_STROKES = 10;
  const BALL_COLORS = ["#FFFFFF", "#FFC940", "#5EC8FF", "#FF7AB6"];
  const PLAYERS_KEY = "golf-adasi-oyuncular", RECORD_KEY = "golf-adasi-rekor", SOUND_KEY = "golf-adasi-ses";
  const RM = window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches;
  const TAU = Math.PI*2;
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const rand = (a, b) => a + Math.random()*(b - a);

  /* ---------- fizik (çizimden bağımsız, test ve bot da kullanır) ---------- */
  function pip(poly, x, y){
    let inside = false;
    for (let i = 0, j = poly.length - 1; i < poly.length; j = i++){
      const [xi, yi] = poly[i], [xj, yj] = poly[j];
      if ((yi > y) !== (yj > y) && x < (xj - xi)*(y - yi)/(yj - yi) + xi) inside = !inside;
    }
    return inside;
  }
  function edges(poly, out){ for (let i = 0; i < poly.length; i++){ const a = poly[i], b = poly[(i + 1) % poly.length]; out.push([a[0], a[1], b[0], b[1]]); } return out; }
  function bbox(poly){ let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9; for (const [x, y] of poly){ x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y); } return [x0, y0, x1, y1]; }

  function makeWorld(H){
    const segs = [];
    edges(H.shape, segs);
    (H.blocks || []).forEach(b => edges(b, segs));
    return {H, segs, blocks:H.blocks || [], water:H.water || [], sand:H.sand || [], bumpers:H.bumpers || [],
      boosts:(H.boosts || []).map(b => ({poly:b.r, dx:Math.cos(b.dir), dy:Math.sin(b.dir)})),
      movers:H.movers || [], mills:H.mills || []};
  }
  function moverAt(m, t){
    const ph = TAU*(t/m.period + m.phase), u = .5 - .5*Math.cos(ph), du = Math.PI/m.period*Math.sin(ph);
    return {x:m.ax + (m.bx - m.ax)*u, y:m.ay + (m.by - m.ay)*u, vx:(m.bx - m.ax)*du, vy:(m.by - m.ay)*du};
  }
  function millBars(m, t){
    const out = [], a0 = m.speed*t;
    for (let k = 0; k < m.blades/2; k++){
      const a = a0 + k*Math.PI/(m.blades/2), c = Math.cos(a)*m.len, s = Math.sin(a)*m.len;
      out.push([m.x - c, m.y - s, m.x + c, m.y + s]);
    }
    return out;
  }
  // topu bir doğru parçasından it; parça hareketliyse (svx, svy) onun hızını kullan
  function hitSeg(b, ax, ay, bx, by, w, e, velAt){
    const ex = bx - ax, ey = by - ay, l2 = ex*ex + ey*ey;
    let u = l2 ? ((b.x - ax)*ex + (b.y - ay)*ey)/l2 : 0; u = clamp(u, 0, 1);
    const px = ax + ex*u, py = ay + ey*u;
    let dx = b.x - px, dy = b.y - py; const d2 = dx*dx + dy*dy, R = BALL_R + w;
    if (d2 >= R*R) return false;
    const d = Math.sqrt(d2) || 1e-6, el = Math.sqrt(l2) || 1; const nx = d2 ? dx/d : (l2 ? -ey/el : 1), ny = d2 ? dy/d : (l2 ? ex/el : 0);
    b.x = px + nx*R; b.y = py + ny*R;
    const sv = velAt ? velAt(px, py) : null, svx = sv ? sv[0] : 0, svy = sv ? sv[1] : 0;
    let rvx = b.vx - svx, rvy = b.vy - svy; const vn = rvx*nx + rvy*ny;
    if (vn < 0){ rvx -= (1 + e)*vn*nx; rvy -= (1 + e)*vn*ny; b.vx = rvx*.97 + svx; b.vy = rvy*.97 + svy; b.hit = Math.max(b.hit || 0, -vn); }
    return true;
  }
  function collide(Wd, b, t){
    for (const s of Wd.segs) hitSeg(b, s[0], s[1], s[2], s[3], WALL_W, .72);
    for (const m of Wd.movers){
      const p = moverAt(m, t), x0 = p.x - m.w/2, y0 = p.y - m.h/2, x1 = p.x + m.w/2, y1 = p.y + m.h/2, v = () => [p.vx, p.vy];
      hitSeg(b, x0, y0, x1, y0, WALL_W, .6, v); hitSeg(b, x1, y0, x1, y1, WALL_W, .6, v);
      hitSeg(b, x1, y1, x0, y1, WALL_W, .6, v); hitSeg(b, x0, y1, x0, y0, WALL_W, .6, v);
    }
    for (const m of Wd.mills){
      const vel = (px, py) => [-m.speed*(py - m.y), m.speed*(px - m.x)];
      for (const s of millBars(m, t)) hitSeg(b, s[0], s[1], s[2], s[3], 6, .6, vel);
      hitSeg(b, m.x, m.y, m.x, m.y, 10, .6);
    }
    for (const [x, y, r] of Wd.bumpers){
      const dx = b.x - x, dy = b.y - y, d = Math.hypot(dx, dy), R = r + BALL_R;
      if (d < R && d > 0){
        const nx = dx/d, ny = dy/d; b.x = x + nx*R; b.y = y + ny*R;
        const vn = b.vx*nx + b.vy*ny;
        if (vn < 0){ b.vx -= 2*vn*nx; b.vy -= 2*vn*ny; b.vx += nx*140; b.vy += ny*140; b.bump = true; }
      }
    }
  }
  function validSpot(Wd, x, y){
    if (!pip(Wd.H.shape, x, y)) return false;
    for (const bl of Wd.blocks) if (pip(bl, x, y)) return false;
    return true;
  }
  // Bir zaman adımı. Olay döndürür: "sink" | "water" | "stop" | null
  function stepBall(Wd, b, t, dt){
    const H = Wd.H;
    const sand = Wd.sand.some(p => pip(p, b.x, b.y));
    for (const bo of Wd.boosts) if (pip(bo.poly, b.x, b.y)){ b.vx += bo.dx*1700*dt; b.vy += bo.dy*1700*dt; }
    let sp = Math.hypot(b.vx, b.vy);
    const c = sand ? 1100 : 160, k = sand ? 1.8 : .42;
    const ns = Math.max(0, sp - (c + k*sp)*dt);
    if (sp > 0){ const f = Math.min(ns, 1600)/sp; b.vx *= f; b.vy *= f; }
    const hx = H.hole[0] - b.x, hy = H.hole[1] - b.y, hd = Math.hypot(hx, hy);
    if (hd < HOLE_R + 4 && hd > .01){ b.vx += hx/hd*380*dt; b.vy += hy/hd*380*dt; }
    sp = Math.hypot(b.vx, b.vy);
    const n = Math.max(1, Math.ceil(sp*dt/4)), h = dt/n;
    for (let i = 0; i < n; i++){
      const ox = b.x, oy = b.y;
      b.x += b.vx*h; b.y += b.vy*h;
      collide(Wd, b, t + (i + 1)*h);
      if (!validSpot(Wd, b.x, b.y)){ b.x = ox; b.y = oy; b.vx *= -.4; b.vy *= -.4; }
    }
    const d = Math.hypot(H.hole[0] - b.x, H.hole[1] - b.y);
    sp = Math.hypot(b.vx, b.vy);
    if (d < HOLE_R - 4 && sp < 430) return "sink";
    for (const w of Wd.water) if (pip(w, b.x, b.y)) return "water";
    if (sp < 5 && d >= HOLE_R + 4){ b.vx = 0; b.vy = 0; return "stop"; }
    return null;
  }
  // Bütün vuruşu hızlıca sonuna kadar oynatır (bot ve testler için)
  function simulate(Wd, x, y, vx, vy, t0, maxT){
    const b = {x, y, vx, vy}; let t = t0; const end = t0 + (maxT || 14);
    while (t < end){ const ev = stepBall(Wd, b, t, DT); t += DT; if (ev) return {ev, x:b.x, y:b.y, t}; }
    return {ev:"stop", x:b.x, y:b.y, t};
  }

  /* ---------- ses ---------- */
  const $ = id => document.getElementById(id);
  let soundOn = true;
  try { soundOn = localStorage.getItem(SOUND_KEY) !== "0"; } catch(e) {}
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
  function noise(dur, freq, vol, delay){
    const a = audio(); if (!a || !soundOn) return;
    const len = Math.floor(a.sampleRate*dur), buf = a.createBuffer(1, len, a.sampleRate), d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = (Math.random()*2 - 1)*Math.pow(1 - i/len, 2);
    const s = a.createBufferSource(); s.buffer = buf;
    const f = a.createBiquadFilter(); f.type = "bandpass"; f.frequency.value = freq; f.Q.value = .7;
    const g = a.createGain(); g.gain.value = vol;
    s.connect(f).connect(g).connect(a.destination); s.start(a.currentTime + (delay || 0));
  }
  let lastClack = 0;
  const sfx = {
    putt(p){ tone(700 + p*500, .06, "triangle", .12 + p*.1, 300); noise(.05, 2500, .15 + p*.2); },
    clack(v){ const now = performance.now(); if (now - lastClack < 60) return; lastClack = now; tone(1300, .04, "square", Math.min(.08, .015 + v/9000)); },
    bump(){ tone(520, .14, "sine", .14, 1040); },
    boost(){ tone(300, .3, "sawtooth", .05, 900); },
    sink(){ tone(900, .08, "sine", .15, 500); tone(600, .1, "sine", .12, 300, .07); [784, 988, 1175].forEach((f, i) => tone(f, .2, "triangle", .11, null, .25 + i*.09)); },
    splash(){ noise(.45, 900, .5); tone(260, .3, "sine", .1, 120); },
    ace(){ [523.25, 659.25, 783.99, 1046.5, 1318.5, 1567.98].forEach((f, i) => tone(f, .28, "triangle", .13, null, i*.08)); },
    end(){ [659.25, 783.99, 1046.5, 783.99, 1046.5, 1318.5].forEach((f, i) => tone(f, .3, "triangle", .13, null, i*.14)); }
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

  /* ---------- Türkçe ekler ---------- */
  function lastVowel(s){ const m = s.toLocaleLowerCase("tr").match(/[aeıioöuü](?=[^aeıioöuü]*$)/); return m ? m[0] : "e"; }
  function gen(name){
    const v = lastVowel(name), hv = {a:"ı", ı:"ı", e:"i", i:"i", o:"u", u:"u", ö:"ü", ü:"ü"}[v];
    const endsV = /[aeıioöuü]$/i.test(name);
    return `${name}'${endsV ? "n" : ""}${hv}n`;
  }

  /* ---------- oyun durumu ---------- */
  const stage = $("stage"), cv = $("cv"), ctx = cv.getContext("2d");
  let players = [{name:"Enes"}];
  try { const p = JSON.parse(localStorage.getItem(PLAYERS_KEY)); if (Array.isArray(p) && p.length) players = p.slice(0, 4).map(x => ({name:String(x.name || "").slice(0, 14) || "Oyuncu"})); } catch(e) {}
  let records = {};
  try { records = JSON.parse(localStorage.getItem(RECORD_KEY)) || {}; } catch(e) { records = {}; }

  let phase = "setup";      // setup | aim | roll | sinking | splash | wait | end
  let holeNo = 0, pi = 0, strokes = 0, scores = [];
  let world = makeWorld(HOLES[0]);
  let simT = 0, acc = 0, time = 0;
  const ball = {x:0, y:0, vx:0, vy:0, vis:1};
  let shotFrom = {x:0, y:0};
  let aim = {angle:0, power:.5, show:false}, drag = null;
  let parts = [], trail = [], waves = [];
  let timers = [];
  let toastT = 0;
  const later = (s, fn) => timers.push({t:s, fn});

  function toast(html, sec){
    const el = $("toast"); el.innerHTML = html; el.hidden = false;
    el.style.animation = "none"; void el.offsetWidth; el.style.animation = "";
    toastT = sec || 1.6;
  }

  function renderHud(){
    const H = HOLES[holeNo];
    $("h-hole").textContent = holeNo + 1; $("h-name").textContent = H.name; $("h-par").textContent = H.par;
    $("h-shots").textContent = strokes;
    $("h-player").textContent = players.length > 1 ? `${gen(players[pi].name)} sırası` : players[pi].name;
    $("h-ball").style.background = BALL_COLORS[pi];
  }

  function startGame(){
    scores = players.map(() => HOLES.map(() => null));
    holeNo = 0; pi = 0;
    startHole(true);
  }
  function startHole(first){
    world = makeWorld(HOLES[holeNo]);
    pi = 0;
    buildWaves();
    placeBall();
    toast(`Delik ${holeNo + 1}<small>${HOLES[holeNo].name} · Par ${HOLES[holeNo].par}</small>`, 1.8);
  }
  function placeBall(){
    const H = HOLES[holeNo];
    ball.x = H.tee[0]; ball.y = H.tee[1]; ball.vx = 0; ball.vy = 0; ball.vis = 1;
    strokes = 0; trail = [];
    const dx = H.hole[0] - H.tee[0], dy = H.hole[1] - H.tee[1];
    aim = {angle:Math.atan2(dy, dx), power:.5, show:false};
    phase = "aim";
    renderHud();
  }

  function shoot(angle, power){
    if (phase !== "aim") return;
    power = clamp(power, 0, 1);
    const sp = MIN_SPEED + (MAX_SPEED - MIN_SPEED)*power;
    shotFrom = {x:ball.x, y:ball.y};
    ball.vx = Math.cos(angle)*sp; ball.vy = Math.sin(angle)*sp;
    strokes++; renderHud();
    aim.show = false; aim.angle = angle; aim.power = power;
    phase = "roll"; trail = [];
    sfx.putt(power);
    $("help").hidden = true;
  }

  function onEvent(ev){
    if (ev === "sink"){
      phase = "sinking"; ball.vx = ball.vy = 0;
      sfx.sink();
      later(.5, finishPlayer);
    } else if (ev === "water"){
      phase = "splash"; ball.vis = 0; sfx.splash();
      splashFx(ball.x, ball.y);
      strokes++; renderHud();
      toast(`Suya düştü!<small>+1 ceza vuruşu</small>`, 1.3);
      later(1.1, () => {
        ball.x = shotFrom.x; ball.y = shotFrom.y; ball.vx = ball.vy = 0; ball.vis = 1;
        if (strokes >= MAX_STROKES) giveUp(); else phase = "aim";
      });
    } else if (ev === "stop"){
      if (strokes >= MAX_STROKES) giveUp(); else phase = "aim";
    }
  }
  function giveUp(){
    phase = "sinking"; strokes = MAX_STROKES; renderHud();
    const H = HOLES[holeNo];
    toast(`${MAX_STROKES} vuruş oldu<small>Top deliğe kondu</small>`, 1.4);
    later(1.2, () => { ball.x = H.hole[0]; ball.y = H.hole[1]; finishPlayer(); });
  }
  function scoreName(s, par){
    if (s === 1) return "Tek vuruşta!";
    const d = s - par;
    return d <= -3 ? "Albatros!" : d === -2 ? "Kartal!" : d === -1 ? "Birdie!" : d === 0 ? "Par" : d === 1 ? "Bogey" : `+${d}`;
  }
  function finishPlayer(){
    const H = HOLES[holeNo];
    scores[pi][holeNo] = strokes;
    const d = strokes - H.par;
    if (strokes === 1 || d < 0){ sfx.ace(); confetti(H.hole[0], H.hole[1], RM ? 12 : 50); }
    const who = players.length > 1 ? `${players[pi].name} · ` : "";
    toast(`${scoreName(strokes, H.par)}<small>${who}${strokes} vuruş</small>`, 1.7);
    phase = "wait";
    later(1.8, () => {
      if (pi < players.length - 1){ pi++; placeBall(); toast(`${gen(players[pi].name)} sırası`, 1.2); return; }
      if (holeNo < HOLES.length - 1){ holeNo++; startHole(); return; }
      endGame();
    });
  }

  /* ---------- skor kartı ---------- */
  const total = i => scores[i].reduce((a, s) => a + (s || 0), 0);
  const parTo = i => scores[i].reduce((a, s, h) => a + (s ? s - HOLES[h].par : 0), 0);
  const fmtRel = d => d === 0 ? "E" : d > 0 ? `+${d}` : `${d}`;
  function renderCard(){
    const t = $("score");
    let h = `<thead><tr><th>Delik</th>${HOLES.map((_, i) => `<th>${i + 1}</th>`).join("")}<th>Top.</th></tr></thead><tbody>`;
    h += `<tr class="par"><td>Par</td>${HOLES.map(H => `<td>${H.par}</td>`).join("")}<td>${HOLES.reduce((a, H) => a + H.par, 0)}</td></tr>`;
    players.forEach((p, i) => {
      h += `<tr><td><span style="display:inline-block;width:10px;height:10px;border-radius:50%;background:${BALL_COLORS[i]};border:1px solid #9BB;margin-right:6px"></span>${esc(p.name)}</td>`;
      HOLES.forEach((H, k) => {
        const s = scores[i] && scores[i][k];
        const cls = [s && s < H.par ? "u" : "", s && s > H.par ? "o" : "", k === holeNo && i === pi && phase !== "end" ? "cur" : ""].join(" ").trim();
        h += `<td class="${cls}">${s == null ? "·" : s === 1 ? `<span class="ace">1</span>` : s}</td>`;
      });
      h += `<td class="tot">${scores[i] ? total(i) : 0} <small>${scores[i] ? fmtRel(parTo(i)) : ""}</small></td></tr>`;
    });
    t.innerHTML = h + "</tbody>";
  }
  const esc = s => s.replace(/[&<>"]/g, c => ({"&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;"}[c]));

  function openCard(){
    if (phase === "setup") return;
    renderCard();
    $("card-title").textContent = "Skor Kartı"; $("card-note").hidden = true;
    $("card-actions").hidden = false; $("end-actions").hidden = true;
    $("card").hidden = false; $("card-close").focus();
  }
  $("card-btn").addEventListener("click", openCard);
  $("card-close").addEventListener("click", () => { $("card").hidden = true; });

  function endGame(){
    phase = "end"; sfx.end();
    const totals = players.map((_, i) => total(i));
    const news = [];
    players.forEach((p, i) => {
      const key = p.name.toLocaleLowerCase("tr");
      if (!records[key] || totals[i] < records[key].best){ records[key] = {name:p.name, best:totals[i]}; news.push(p.name); }
    });
    try { localStorage.setItem(RECORD_KEY, JSON.stringify(records)); } catch(e) {}
    renderCard();
    const parTot = HOLES.reduce((a, H) => a + H.par, 0);
    if (players.length > 1){
      const min = Math.min(...totals), win = players.filter((_, i) => totals[i] === min).map(p => p.name);
      $("card-title").textContent = win.length > 1 ? `Berabere: ${win.join(" ve ")}!` : `Kazanan: ${win[0]}!`;
    } else {
      $("card-title").textContent = `${totals[0]} vuruş (${fmtRel(totals[0] - parTot)})`;
    }
    $("card-note").hidden = !news.length;
    if (news.length) $("card-note").innerHTML = `<strong>Yeni rekor:</strong> ${news.map(esc).join(", ")}`;
    $("card-actions").hidden = true; $("end-actions").hidden = false;
    $("card").hidden = false; $("again").focus();
    confetti(500, 300, RM ? 20 : 90);
  }
  $("again").addEventListener("click", () => { $("card").hidden = true; startGame(); });
  $("change").addEventListener("click", () => { $("card").hidden = true; openSetup(); });

  /* ---------- kurulum ---------- */
  function renderRows(){
    const box = $("p-rows"); box.innerHTML = "";
    players.forEach((p, i) => {
      const row = document.createElement("div"); row.className = "p-row";
      row.innerHTML = `<span class="ball" style="background:${BALL_COLORS[i]}"></span><input id="pname-${i}" type="text" maxlength="14" aria-label="${i + 1}. oyuncunun adı"><button class="rm" type="button" aria-label="${i + 1}. oyuncuyu çıkar">×</button>`;
      const inp = row.querySelector("input"); inp.value = p.name;
      inp.addEventListener("input", () => { p.name = inp.value; });
      const rm = row.querySelector(".rm"); rm.disabled = players.length === 1;
      rm.addEventListener("click", () => { players.splice(i, 1); renderRows(); });
      box.appendChild(row);
    });
    $("add-player").disabled = players.length >= 4;
    const recs = Object.values(records).sort((a, b) => a.best - b.best).slice(0, 4);
    $("records").hidden = !recs.length;
    const parTot = HOLES.reduce((a, H) => a + H.par, 0);
    $("records").innerHTML = "En iyi 9 delik: " + recs.map(r => `<b>${esc(r.name)}</b> ${r.best} (${fmtRel(r.best - parTot)})`).join(" · ");
  }
  $("add-player").addEventListener("click", () => {
    const def = ["Enes", "Egemen", "Anne", "Baba"].find(n => !players.some(p => p.name === n)) || `Oyuncu ${players.length + 1}`;
    players.push({name:def}); renderRows();
    const inp = $(`pname-${players.length - 1}`); inp && inp.select();
  });
  function openSetup(){ phase = "setup"; renderRows(); $("setup").hidden = false; }
  $("setup-form").addEventListener("submit", e => {
    e.preventDefault(); audio();
    players.forEach((p, i) => { p.name = p.name.trim().slice(0, 14) || `Oyuncu ${i + 1}`; });
    try { localStorage.setItem(PLAYERS_KEY, JSON.stringify(players)); } catch(e) {}
    $("setup").hidden = true;
    startGame();
  });

  /* ---------- giriş ---------- */
  const view = {s:1, ox:0, oy:0, dpr:1, rot:false};
  const FW = 1000, FH = 600;
  function resize(){
    const r = stage.getBoundingClientRect();
    view.dpr = Math.min(window.devicePixelRatio || 1, 2);
    cv.width = Math.round(r.width*view.dpr); cv.height = Math.round(r.height*view.dpr);
    view.rot = r.height > r.width*1.1;
    const w = view.rot ? FH : FW, h = view.rot ? FW : FH;
    view.s = Math.min(r.width/w, r.height/h);
    view.ox = (r.width - w*view.s)/2; view.oy = (r.height - h*view.s)/2;
  }
  function toField(e){
    const r = cv.getBoundingClientRect();
    const fx = (e.clientX - r.left - view.ox)/view.s, fy = (e.clientY - r.top - view.oy)/view.s;
    return view.rot ? {x:fy, y:FH - fx} : {x:fx, y:fy};
  }
  const canAim = () => phase === "aim" && $("card").hidden && $("setup").hidden;

  cv.addEventListener("pointerdown", e => {
    if (!canAim()) return;
    e.preventDefault(); audio();
    cv.setPointerCapture(e.pointerId);
    drag = {id:e.pointerId, sx:e.clientX, sy:e.clientY};
  });
  cv.addEventListener("pointermove", e => {
    if (!drag || e.pointerId !== drag.id) return;
    const dx = drag.sx - e.clientX, dy = drag.sy - e.clientY, len = Math.hypot(dx, dy);
    if (len < 8){ aim.show = false; return; }
    // ekran yönünü saha yönüne çevir (dikey ekranda saha döndürülmüş)
    const a = Math.atan2(dy, dx);
    aim.angle = view.rot ? a - Math.PI/2 : a;
    aim.power = clamp((len - 8)/150, 0, 1);
    aim.show = true;
  });
  function endDrag(e){
    if (!drag || e.pointerId !== drag.id) return;
    const go = aim.show && aim.power > .02;
    drag = null;
    if (go && canAim()) shoot(aim.angle, aim.power); else aim.show = false;
  }
  cv.addEventListener("pointerup", endDrag);
  cv.addEventListener("pointercancel", e => { drag = null; aim.show = false; });

  const keys = {};
  window.addEventListener("keydown", e => {
    if (e.target.tagName === "INPUT" || !canAim()) return;
    if (["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(e.key)){ keys[e.key] = true; aim.show = true; e.preventDefault(); }
    else if ((e.key === " " || e.key === "Enter") && aim.show && !e.repeat){ e.preventDefault(); audio(); shoot(aim.angle, aim.power); }
  });
  window.addEventListener("keyup", e => { keys[e.key] = false; });

  /* ---------- efektler ---------- */
  function splashFx(x, y){
    for (let i = 0; i < (RM ? 6 : 22); i++){ const a = rand(0, TAU), v = rand(40, 200); parts.push({x, y, vx:Math.cos(a)*v, vy:Math.sin(a)*v, life:.7, max:.7, r:rand(3, 7), c:"#D9F4FF"}); }
    parts.push({ring:true, x, y, life:.8, max:.8, r:10, c:"#FFFFFF"});
  }
  function confetti(x, y, n){
    const cs = ["#FFC940", "#E84A3C", "#5EC8FF", "#FF7AB6", "#FFFFFF", "#7DDB6F"];
    for (let i = 0; i < n; i++){ const a = rand(0, TAU), v = rand(80, 420); parts.push({x, y, vx:Math.cos(a)*v, vy:Math.sin(a)*v, life:1.3, max:1.3, r:rand(3, 7), c:cs[i % cs.length], g:260, sq:true, rot:rand(0, TAU)}); }
  }
  function buildWaves(){ waves = Array.from({length:22}, () => ({x:rand(-50, 1050), y:rand(-20, 620), s:rand(.6, 1.2), p:rand(0, TAU)})); }

  /* ---------- güncelle ---------- */
  function update(dt){
    time += dt;
    for (let i = timers.length - 1; i >= 0; i--){ const tk = timers[i]; tk.t -= dt; if (tk.t <= 0){ timers.splice(i, 1); tk.fn(); } }
    if (toastT > 0){ toastT -= dt; if (toastT <= 0) $("toast").hidden = true; }

    if (phase === "aim"){
      if (keys.ArrowLeft) aim.angle -= dt*1.4;
      if (keys.ArrowRight) aim.angle += dt*1.4;
      if (keys.ArrowUp) aim.power = clamp(aim.power + dt*.6, 0, 1);
      if (keys.ArrowDown) aim.power = clamp(aim.power - dt*.6, 0, 1);
    }

    acc += dt;
    while (acc >= DT){
      acc -= DT;
      if (phase === "roll"){
        ball.hit = 0; ball.bump = false;
        const wasBoost = world.boosts.some(b => pip(b.poly, ball.x, ball.y));
        const ev = stepBall(world, ball, simT, DT);
        if (ball.hit > 60) sfx.clack(ball.hit);
        if (ball.bump) sfx.bump();
        if (!wasBoost && world.boosts.some(b => pip(b.poly, ball.x, ball.y))) sfx.boost();
        if (ev) onEvent(ev);
      } else if (phase === "aim"){
        // duran top hareketli engele takılırsa itilsin
        const moved = world.movers.length || world.mills.length;
        if (moved){ ball.hit = 0; collide(world, ball, simT); if (Math.hypot(ball.vx, ball.vy) > 20){ phase = "roll"; } }
      }
      simT += DT;
    }
    if (phase === "roll" && !RM){ trail.push([ball.x, ball.y]); if (trail.length > 14) trail.shift(); }
    else if (trail.length) trail.shift();
    if (phase === "sinking"){ const H = world.H; ball.x += (H.hole[0] - ball.x)*Math.min(1, dt*12); ball.y += (H.hole[1] - ball.y)*Math.min(1, dt*12); ball.vis = Math.max(0, ball.vis - dt*2.5); }

    for (let i = parts.length - 1; i >= 0; i--){
      const p = parts[i]; p.life -= dt;
      if (p.ring){ p.r += dt*60; }
      else { p.vx *= 1 - dt*1.5; p.vy = p.vy*(1 - dt*1.5) + (p.g || 0)*dt; p.x += p.vx*dt; p.y += p.vy*dt; if (p.rot !== undefined) p.rot += dt*6; }
      if (p.life <= 0) parts.splice(i, 1);
    }
  }

  /* ---------- çizim ---------- */
  function poly(p){ ctx.beginPath(); p.forEach(([x, y], i) => i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)); ctx.closePath(); }

  function drawSea(){
    const w = view.rot ? FH : FW, h = view.rot ? FW : FH;
    const x0 = -view.ox/view.s, y0 = -view.oy/view.s;
    ctx.fillStyle = "#127A8F"; ctx.fillRect(x0 - 2, y0 - 2, w - 2*x0 + 4, h - 2*y0 + 4);
  }
  function drawField(){
    const Wd = world, H = Wd.H;
    // deniz dalgaları
    ctx.strokeStyle = "rgba(255,255,255,.14)"; ctx.lineWidth = 4; ctx.lineCap = "round";
    for (const wv of waves){
      const dx = RM ? 0 : Math.sin(time*.8 + wv.p)*10;
      ctx.beginPath(); ctx.arc(wv.x + dx, wv.y, 14*wv.s, Math.PI*1.15, Math.PI*1.85); ctx.stroke();
      ctx.beginPath(); ctx.arc(wv.x + dx + 26*wv.s, wv.y, 14*wv.s, Math.PI*1.15, Math.PI*1.85); ctx.stroke();
    }
    // kumsal kenarı ve gölge
    ctx.lineJoin = "round";
    poly(H.shape); ctx.strokeStyle = "#F2D48B"; ctx.lineWidth = 46; ctx.stroke();
    ctx.save(); ctx.translate(0, 10); poly(H.shape); ctx.strokeStyle = "rgba(0,0,0,.18)"; ctx.lineWidth = 14; ctx.stroke(); ctx.restore();
    // çim
    poly(H.shape); ctx.fillStyle = "#58B846"; ctx.fill();
    ctx.save(); poly(H.shape); ctx.clip();
    ctx.fillStyle = "#63C552";
    for (let k = -600; k < 1600; k += 80){ ctx.beginPath(); ctx.moveTo(k, 0); ctx.lineTo(k + 40, 0); ctx.lineTo(k + 40 - 600, 600); ctx.lineTo(k - 600, 600); ctx.closePath(); ctx.fill(); }
    // su
    for (const w of Wd.water){
      poly(w); ctx.fillStyle = "#2E9FD0"; ctx.fill();
      ctx.save(); poly(w); ctx.clip();
      const [x0, y0, x1, y1] = bbox(w);
      ctx.strokeStyle = "rgba(255,255,255,.35)"; ctx.lineWidth = 3;
      for (let y = y0 + 14; y < y1; y += 22) for (let x = x0 + ((y/22) % 2)*20; x < x1; x += 44){
        const dx = RM ? 0 : Math.sin(time*1.5 + x*.05 + y*.07)*4;
        ctx.beginPath(); ctx.arc(x + dx, y, 8, Math.PI*1.2, Math.PI*1.8); ctx.stroke();
      }
      ctx.restore();
      poly(w); ctx.strokeStyle = "#1F7FA8"; ctx.lineWidth = 4; ctx.stroke();
    }
    // kum
    for (const s of Wd.sand){
      poly(s); ctx.fillStyle = "#F2D48B"; ctx.fill();
      ctx.save(); poly(s); ctx.clip();
      const [x0, y0, x1, y1] = bbox(s); ctx.fillStyle = "rgba(160,120,40,.3)";
      for (let y = y0 + 6; y < y1; y += 12) for (let x = x0 + (y % 24 ? 6 : 0); x < x1; x += 12){ ctx.beginPath(); ctx.arc(x, y, 1.6, 0, TAU); ctx.fill(); }
      ctx.restore();
    }
    // hız bantları
    for (const bo of Wd.boosts){
      poly(bo.poly); ctx.fillStyle = "rgba(255,201,64,.35)"; ctx.fill();
      const [x0, y0, x1, y1] = bbox(bo.poly), cx = (x0 + x1)/2, cy = (y0 + y1)/2, ang = Math.atan2(bo.dy, bo.dx);
      ctx.save(); poly(bo.poly); ctx.clip(); ctx.translate(cx, cy); ctx.rotate(ang);
      const off = RM ? 0 : (time*80) % 40;
      ctx.fillStyle = "#FFC940";
      for (let k = -3; k <= 3; k++){ const x = k*40 + off; ctx.beginPath(); ctx.moveTo(x - 12, -22); ctx.lineTo(x + 10, 0); ctx.lineTo(x - 12, 22); ctx.lineTo(x - 2, 22 - 0); ctx.lineTo(x + 20, 0); ctx.lineTo(x - 2, -22); ctx.closePath(); ctx.fill(); }
      ctx.restore();
    }
    ctx.restore();
    // tee
    ctx.fillStyle = "rgba(255,255,255,.28)"; ctx.beginPath(); ctx.roundRect(H.tee[0] - 24, H.tee[1] - 24, 48, 48, 10); ctx.fill();
    // delik
    ctx.fillStyle = "#3E8E32"; ctx.beginPath(); ctx.arc(H.hole[0], H.hole[1] + 1, HOLE_R + 4, 0, TAU); ctx.fill();
    ctx.fillStyle = "#18241A"; ctx.beginPath(); ctx.arc(H.hole[0], H.hole[1], HOLE_R, 0, TAU); ctx.fill();
    ctx.fillStyle = "#2C3A2E"; ctx.beginPath(); ctx.arc(H.hole[0], H.hole[1] + 4, HOLE_R - 4, 0, TAU); ctx.fill();
    // duvarlar
    poly(H.shape); ctx.strokeStyle = "#FFF6DF"; ctx.lineWidth = WALL_W*2; ctx.stroke();
    for (const b of Wd.blocks){
      ctx.save(); ctx.translate(0, 5); poly(b); ctx.fillStyle = "rgba(0,0,0,.2)"; ctx.fill(); ctx.strokeStyle = "rgba(0,0,0,.2)"; ctx.lineWidth = WALL_W*2; ctx.stroke(); ctx.restore();
      poly(b); ctx.fillStyle = "#FFF6DF"; ctx.fill(); ctx.strokeStyle = "#FFF6DF"; ctx.stroke();
      poly(b); ctx.strokeStyle = "rgba(180,150,100,.35)"; ctx.lineWidth = 2; ctx.stroke();
    }
    // tamponlar
    for (const [x, y, r] of Wd.bumpers){
      ctx.fillStyle = "rgba(0,0,0,.2)"; ctx.beginPath(); ctx.arc(x, y + 5, r, 0, TAU); ctx.fill();
      ctx.fillStyle = "#E84A3C"; ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fill();
      ctx.fillStyle = "#FFF6DF"; ctx.beginPath(); ctx.arc(x, y, r*.62, 0, TAU); ctx.fill();
      ctx.fillStyle = "#E84A3C"; ctx.beginPath(); ctx.arc(x, y, r*.3, 0, TAU); ctx.fill();
    }
    // kayan kapılar
    for (const m of Wd.movers){
      const p = moverAt(m, simT);
      ctx.fillStyle = "rgba(0,0,0,.22)"; ctx.fillRect(p.x - m.w/2 - WALL_W, p.y - m.h/2 - WALL_W + 6, m.w + WALL_W*2, m.h + WALL_W*2);
      ctx.fillStyle = "#6C7A89"; ctx.beginPath(); ctx.roundRect(p.x - m.w/2 - WALL_W, p.y - m.h/2 - WALL_W, m.w + WALL_W*2, m.h + WALL_W*2, 8); ctx.fill();
      ctx.save(); ctx.beginPath(); ctx.rect(p.x - m.w/2, p.y - m.h/2, m.w, m.h); ctx.clip();
      ctx.strokeStyle = "#FFC940"; ctx.lineWidth = 8;
      for (let k = -m.h; k < m.h*2; k += 22){ ctx.beginPath(); ctx.moveTo(p.x - m.w, p.y - m.h/2 + k); ctx.lineTo(p.x + m.w, p.y - m.h/2 + k - m.w*2); ctx.stroke(); }
      ctx.restore();
    }
    // yel değirmeni
    for (const m of Wd.mills){
      ctx.lineCap = "round";
      for (const s of millBars(m, simT)){
        ctx.strokeStyle = "rgba(0,0,0,.2)"; ctx.lineWidth = 12; ctx.beginPath(); ctx.moveTo(s[0], s[1] + 5); ctx.lineTo(s[2], s[3] + 5); ctx.stroke();
        ctx.strokeStyle = "#8D5A3B"; ctx.lineWidth = 12; ctx.beginPath(); ctx.moveTo(s[0], s[1]); ctx.lineTo(s[2], s[3]); ctx.stroke();
        ctx.strokeStyle = "#B97A50"; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(s[0], s[1]); ctx.lineTo(s[2], s[3]); ctx.stroke();
      }
      ctx.fillStyle = "#5B3A26"; ctx.beginPath(); ctx.arc(m.x, m.y, 16, 0, TAU); ctx.fill();
      ctx.fillStyle = "#FFC940"; ctx.beginPath(); ctx.arc(m.x, m.y, 6, 0, TAU); ctx.fill();
      ctx.lineCap = "butt";
    }
  }

  function drawAim(){
    if (phase !== "aim" || !aim.show) return;
    const p = aim.power, len = 40 + p*190, ca = Math.cos(aim.angle), sa = Math.sin(aim.angle);
    const col = `hsl(${Math.round(120 - p*120)}, 85%, 55%)`;
    ctx.save();
    ctx.setLineDash([2, 14]); ctx.lineCap = "round"; ctx.lineWidth = 7; ctx.strokeStyle = "rgba(255,255,255,.9)";
    ctx.beginPath(); ctx.moveTo(ball.x + ca*18, ball.y + sa*18); ctx.lineTo(ball.x + ca*len, ball.y + sa*len); ctx.stroke();
    ctx.setLineDash([]);
    const tx = ball.x + ca*(len + 10), ty = ball.y + sa*(len + 10);
    ctx.fillStyle = col; ctx.beginPath(); ctx.moveTo(tx + ca*14, ty + sa*14); ctx.lineTo(tx - sa*11 - ca*6, ty + ca*11 - sa*6); ctx.lineTo(tx + sa*11 - ca*6, ty - ca*11 - sa*6); ctx.closePath(); ctx.fill();
    // güç halkası
    ctx.lineWidth = 6; ctx.strokeStyle = "rgba(0,0,0,.25)"; ctx.beginPath(); ctx.arc(ball.x, ball.y, 26, 0, TAU); ctx.stroke();
    ctx.strokeStyle = col; ctx.beginPath(); ctx.arc(ball.x, ball.y, 26, -Math.PI/2, -Math.PI/2 + TAU*p); ctx.stroke();
    ctx.restore();
  }

  function drawBall(){
    if (ball.vis <= 0) return;
    const col = BALL_COLORS[pi] || "#fff";
    for (let i = 0; i < trail.length; i++){
      const a = i/trail.length;
      ctx.fillStyle = `rgba(255,255,255,${a*.25})`; ctx.beginPath(); ctx.arc(trail[i][0], trail[i][1], BALL_R*a, 0, TAU); ctx.fill();
    }
    const r = BALL_R*(phase === "sinking" ? .6 + .4*ball.vis : 1);
    ctx.globalAlpha = phase === "sinking" ? ball.vis : 1;
    ctx.fillStyle = "rgba(0,0,0,.25)"; ctx.beginPath(); ctx.arc(ball.x + 2, ball.y + 4, r, 0, TAU); ctx.fill();
    ctx.fillStyle = col; ctx.beginPath(); ctx.arc(ball.x, ball.y, r, 0, TAU); ctx.fill();
    ctx.strokeStyle = "rgba(0,0,0,.3)"; ctx.lineWidth = 1.5; ctx.stroke();
    ctx.fillStyle = "rgba(255,255,255,.8)"; ctx.beginPath(); ctx.arc(ball.x - r*.35, ball.y - r*.35, r*.3, 0, TAU); ctx.fill();
    ctx.globalAlpha = 1;
    if (phase === "aim" && !aim.show){
      const pulse = RM ? .5 : .5 + .5*Math.sin(time*4);
      ctx.strokeStyle = `rgba(255,255,255,${.25 + pulse*.4})`; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(ball.x, ball.y, 16 + pulse*5, 0, TAU); ctx.stroke();
    }
  }

  function drawFlag(){
    const H = world.H, near = Math.hypot(ball.x - H.hole[0], ball.y - H.hole[1]) < 70 && phase !== "wait";
    ctx.save(); ctx.translate(H.hole[0], H.hole[1]);
    if (view.rot) ctx.rotate(-Math.PI/2);   // bayrak ekranda hep dik dursun
    ctx.globalAlpha = near ? .45 : 1;
    ctx.fillStyle = "rgba(0,0,0,.2)"; ctx.beginPath(); ctx.ellipse(14, 4, 16, 4, .3, 0, TAU); ctx.fill();
    ctx.strokeStyle = "#FFF6DF"; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(0, -62); ctx.stroke();
    const wv = RM ? 0 : Math.sin(time*5)*4;
    ctx.fillStyle = "#E84A3C"; ctx.beginPath(); ctx.moveTo(2, -62); ctx.quadraticCurveTo(20, -58 + wv, 36, -52); ctx.quadraticCurveTo(20, -44 - wv, 2, -40); ctx.closePath(); ctx.fill();
    ctx.restore();
  }

  function drawParts(){
    for (const p of parts){
      ctx.globalAlpha = clamp(p.life/p.max*1.5, 0, 1);
      if (p.ring){ ctx.strokeStyle = p.c; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, TAU); ctx.stroke(); }
      else if (p.sq){ ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.rot); ctx.fillStyle = p.c; ctx.fillRect(-p.r, -p.r*.5, p.r*2, p.r); ctx.restore(); }
      else { ctx.fillStyle = p.c; ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, TAU); ctx.fill(); }
    }
    ctx.globalAlpha = 1;
  }

  function draw(){
    const d = view.dpr;
    ctx.setTransform(d, 0, 0, d, 0, 0);
    ctx.clearRect(0, 0, cv.width, cv.height);
    ctx.save(); ctx.translate(view.ox, view.oy); ctx.scale(view.s, view.s);
    drawSea();
    if (view.rot){ ctx.translate(FH, 0); ctx.rotate(Math.PI/2); }
    drawField();
    drawAim();
    drawBall();
    drawFlag();
    drawParts();
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
  document.addEventListener("visibilitychange", () => { last = performance.now(); acc = 0; });
  if ("ResizeObserver" in window) new ResizeObserver(resize).observe(stage);
  else window.addEventListener("resize", resize);
  resize();
  buildWaves();
  placeBall();
  openSetup();
  requestAnimationFrame(frame);
})();
