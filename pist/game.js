/* Pist Rekoru — yukarıdan görünen zamana karşı yarış: 3 pist, 3 tur, hayalet araba */
(function(){
  "use strict";

  const W = 1000, H = 620;
  const HALF = 34;                       // pistin yarı genişliği
  const LAPS = 3, CPS = 10;              // tur sayısı, kontrol noktası sayısı
  const STEP = 1/120, GHOST_HZ = 40;
  // araba (piksel/saniye)
  const ACC = 400, BRAKE = 560, REV_MAX = 120, DRAG = 1.08, GRIP = 7.5, GRASS = 2.6, TURN = 3.1;
  const TRACKS = [
    {name:"Oval", pts:[[200,140],[800,140],[900,230],[900,390],[800,480],[200,480],[100,390],[100,230]]},
    {name:"Kıvrım", pts:[[170,105],[520,100],[850,115],[920,235],[800,305],[640,255],[500,305],[600,420],[850,440],[895,540],
                         [600,560],[300,545],[140,465],[215,335],[105,225]]},
    {name:"Dağ Yolu", pts:[[140,92],[860,92],[918,158],[860,218],[310,218],[252,280],[310,342],[860,342],[918,408],[860,470],
                           [300,470],[165,540],[82,420],[82,200]]}
  ];
  // madalya sınırları (en iyi tur, saniye): test botunun en iyi turu ×1.05 altın, ×1.2 gümüş, ×1.45 bronz
  // (bot: Oval 11.2, Kıvrım 17.3, Dağ Yolu 18.7 sn)
  const MEDALS = [[11.8, 13.5, 16.3], [18.1, 20.7, 25.0], [19.6, 22.4, 27.1]];
  const REC_KEY = "pist-rekor", SOUND_KEY = "pist-ses", LAST_KEY = "pist-son";
  const RM = window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches;
  const TAU = Math.PI*2;

  const $ = id => document.getElementById(id);
  const stage = $("stage"), cv = $("cv"), ctx = cv.getContext("2d");
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const fmt = s => s == null ? "–" : Math.floor(s/60) + ":" + (s % 60).toFixed(1).padStart(4, "0");

  let rec = {};
  try { rec = JSON.parse(localStorage.getItem(REC_KEY) || "{}") || {}; } catch(e) {}
  const saveRec = () => { try { localStorage.setItem(REC_KEY, JSON.stringify(rec)); } catch(e) {} };
  let soundOn = true;
  try { soundOn = localStorage.getItem(SOUND_KEY) !== "0"; } catch(e) {}
  let trackIdx = 0;
  try { trackIdx = clamp(parseInt(localStorage.getItem(LAST_KEY), 10) || 0, 0, TRACKS.length - 1); } catch(e) {}

  /* ---------- ses ---------- */
  let ac = null, engine = null;
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
  function noise(dur, freq, vol){
    const a = audio(); if (!a || !soundOn) return;
    const len = Math.floor(a.sampleRate*dur), buf = a.createBuffer(1, len, a.sampleRate), d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = (Math.random()*2 - 1)*Math.pow(1 - i/len, 2);
    const s = a.createBufferSource(); s.buffer = buf;
    const f = a.createBiquadFilter(); f.type = "bandpass"; f.frequency.value = freq;
    const g = a.createGain(); g.gain.value = vol;
    s.connect(f).connect(g).connect(a.destination); s.start();
  }
  function engineOn(){
    const a = audio(); if (!a || engine) return;
    const o = a.createOscillator(), o2 = a.createOscillator(), g = a.createGain(), f = a.createBiquadFilter();
    o.type = "sawtooth"; o2.type = "square"; f.type = "lowpass"; f.frequency.value = 700;
    g.gain.value = 0;
    o.connect(f); o2.connect(f); f.connect(g).connect(a.destination);
    o.start(); o2.start();
    engine = {o, o2, g};
  }
  function engineSet(speed){
    if (!engine || !ac) return;
    const k = clamp(Math.abs(speed)/360, 0, 1.2), t = ac.currentTime;
    engine.o.frequency.setTargetAtTime(55 + k*150, t, .05);
    engine.o2.frequency.setTargetAtTime(27 + k*75, t, .05);
    engine.g.gain.setTargetAtTime(soundOn ? .025 + k*.03 : 0, t, .08);
  }
  function engineOff(){
    if (!engine) return;
    try { engine.g.gain.setTargetAtTime(0, ac.currentTime, .05); engine.o.stop(ac.currentTime + .3); engine.o2.stop(ac.currentTime + .3); } catch(e) {}
    engine = null;
  }
  const sfx = {
    light(){ tone(440, .25, "square", .06); },
    go(){ tone(880, .5, "square", .07); },
    lap(){ tone(988, .12, "triangle", .08); tone(1318, .18, "triangle", .08, null, .1); },
    best(){ [659.25, 880, 1174.7, 1568].forEach((f, i) => tone(f, .2, "triangle", .1, null, i*.09)); },
    miss(){ tone(220, .3, "sawtooth", .06, 140); },
    skid(){ noise(.12, 1800, .05); },
    finish(){ [523.25, 659.25, 784, 1046.5, 1318.5].forEach((f, i) => tone(f, .28, "triangle", .12, null, i*.12)); }
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

  /* ---------- pist ---------- */
  // kapalı Catmull-Rom eğrisi, yaklaşık eşit aralıklı noktalar
  function buildTrack(t){
    const P = t.pts, n = P.length, raw = [];
    for (let i = 0; i < n; i++){
      const p0 = P[(i - 1 + n) % n], p1 = P[i], p2 = P[(i + 1) % n], p3 = P[(i + 2) % n];
      for (let k = 0; k < 40; k++){
        const u = k/40, u2 = u*u, u3 = u2*u;
        raw.push([
          .5*((2*p1[0]) + (-p0[0] + p2[0])*u + (2*p0[0] - 5*p1[0] + 4*p2[0] - p3[0])*u2 + (-p0[0] + 3*p1[0] - 3*p2[0] + p3[0])*u3),
          .5*((2*p1[1]) + (-p0[1] + p2[1])*u + (2*p0[1] - 5*p1[1] + 4*p2[1] - p3[1])*u2 + (-p0[1] + 3*p1[1] - 3*p2[1] + p3[1])*u3)
        ]);
      }
    }
    // yay uzunluğuna göre yeniden örnekle (her ~6 px)
    const C = [raw[0]];
    let acc = 0;
    for (let i = 1; i <= raw.length; i++){
      const a = raw[i - 1], b = raw[i % raw.length];
      let seg = Math.hypot(b[0] - a[0], b[1] - a[1]);
      let sx = a[0], sy = a[1];
      while (acc + seg >= 6){
        const r = (6 - acc)/seg;
        sx += (b[0] - sx)*r; sy += (b[1] - sy)*r;
        C.push([sx, sy]);
        seg = Math.hypot(b[0] - sx, b[1] - sy); acc = 0;
      }
      acc += seg;
    }
    if (Math.hypot(C[C.length - 1][0] - C[0][0], C[C.length - 1][1] - C[0][1]) < 3) C.pop();
    const N = C.length, T = C.map((p, i) => {
      const a = C[(i - 1 + N) % N], b = C[(i + 1) % N], d = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1;
      return [(b[0] - a[0])/d, (b[1] - a[1])/d];
    });
    const cps = [];
    for (let k = 1; k < CPS; k++) cps.push(Math.floor(k*N/CPS));
    let len = 0;
    for (let i = 0; i < N; i++) len += Math.hypot(C[(i + 1) % N][0] - C[i][0], C[(i + 1) % N][1] - C[i][1]);
    return {name:t.name, C, T, N, cps, len};
  }
  const BUILT = TRACKS.map(buildTrack);

  function nearest(tr, x, y){
    let bi = 0, bd = Infinity;
    for (let i = 0; i < tr.N; i++){
      const dx = tr.C[i][0] - x, dy = tr.C[i][1] - y, d = dx*dx + dy*dy;
      if (d < bd){ bd = d; bi = i; }
    }
    return {i:bi, d:Math.sqrt(bd)};
  }

  /* ---------- yarış ---------- */
  let G = null, timers = [];
  const later = (s, fn) => timers.push({t:s, fn});
  const input = {gas:false, brake:false, left:false, right:false};

  function newRace(idx){
    timers = [];
    trackIdx = idx;
    try { localStorage.setItem(LAST_KEY, String(idx)); } catch(e) {}
    const tr = BUILT[idx], i0 = 3;
    const r = rec[idx] || {};
    G = {
      tr, idx, state:"lights", t:0, raceT:0, lapStart:0, lap:0, laps:[], visited:new Set(),
      car:{x:tr.C[i0][0], y:tr.C[i0][1], a:Math.atan2(tr.T[i0][1], tr.T[i0][0]), vx:0, vy:0},
      side:1, near:i0, grass:false, skids:[], rec:[], ghost:r.ghost || null, bestLap:r.lap || null,
      thisBest:null, lastSkid:0, done:false
    };
    G.side = sideOfLine(G.car.x, G.car.y);
    $("end").hidden = true; $("setup").hidden = true;
    renderHud();
    prerender();
    // 3-2-1 ışıklar
    const L = $("lights");
    [3, 2, 1].forEach((n, k) => later(k*.8 + .3, () => { L.hidden = false; L.className = "lights"; L.textContent = n; restart(L); sfx.light(); }));
    later(2.7, () => {
      L.textContent = "BAŞLA"; L.className = "lights go"; restart(L); sfx.go();
      G.state = "race"; G.raceT = 0; G.lapStart = 0; engineOn();
    });
    later(3.5, () => { L.hidden = true; });
  }
  const restart = el => { el.style.animation = "none"; void el.offsetWidth; el.style.animation = ""; };

  // bitiş çizgisine göre hangi taraftayız: +1 çizginin önünde, −1 arkasında
  function sideOfLine(x, y){
    const tr = G.tr, p = tr.C[0], t = tr.T[0];
    return ((x - p[0])*t[0] + (y - p[1])*t[1]) >= 0 ? 1 : -1;
  }

  function step(dt){
    const c = G.car, tr = G.tr;
    const fx = Math.cos(c.a), fy = Math.sin(c.a);
    let vf = c.vx*fx + c.vy*fy, vr = -c.vx*fy + c.vy*fx;
    const racing = G.state === "race";
    if (racing){
      if (input.gas) vf += ACC*dt;
      if (input.brake) vf -= (vf > 0 ? BRAKE : ACC*.5)*dt;
      if (vf < -REV_MAX) vf = -REV_MAX;
      const steer = (input.right ? 1 : 0) - (input.left ? 1 : 0);
      const turn = TURN*steer*clamp(Math.abs(vf)/140, 0, 1)*(vf >= 0 ? 1 : -1);
      c.a += turn*dt;
    }
    vf *= Math.exp(-DRAG*dt);
    vr *= Math.exp(-GRIP*dt);
    const n = nearest(tr, c.x, c.y);
    G.near = n.i; G.grass = n.d > HALF;
    if (G.grass){ vf *= Math.exp(-GRASS*dt); vr *= Math.exp(-GRASS*dt); }
    if (!racing){ vf *= Math.exp(-4*dt); vr *= Math.exp(-4*dt); }
    const nfx = Math.cos(c.a), nfy = Math.sin(c.a);
    c.vx = nfx*vf - nfy*vr; c.vy = nfy*vf + nfx*vr;
    c.x += c.vx*dt; c.y += c.vy*dt;
    // tahtanın kenarından sek
    if (c.x < 14 || c.x > W - 14){ c.vx *= -.4; c.x = clamp(c.x, 14, W - 14); }
    if (c.y < 14 || c.y > H - 14){ c.vy *= -.4; c.y = clamp(c.y, 14, H - 14); }
    // kayma izi
    if (Math.abs(vr) > 90 && !G.grass){
      G.skids.push([c.x, c.y]); if (G.skids.length > 600) G.skids.shift();
      if (G.t - G.lastSkid > .25){ sfx.skid(); G.lastSkid = G.t; }
    }
    if (!racing) return;
    G.raceT += dt;
    // kontrol noktaları
    for (const k of tr.cps){
      if (!G.visited.has(k) && Math.hypot(c.x - tr.C[k][0], c.y - tr.C[k][1]) < HALF*1.35) G.visited.add(k);
    }
    // hayalet kaydı
    if (Math.round(G.raceT/dt) % Math.round(1/(GHOST_HZ*dt)) === 0) G.rec.push([Math.round(c.x*10)/10, Math.round(c.y*10)/10, Math.round(c.a*100)/100]);
    // bitiş çizgisi (çizginin yakınında ve pistin üstünde öne geçiş)
    const side = sideOfLine(c.x, c.y);
    const lat = Math.abs((c.x - tr.C[0][0])*(-tr.T[0][1]) + (c.y - tr.C[0][1])*tr.T[0][0]);
    if (side !== G.side && lat < HALF*1.6){
      if (side === 1) crossLine();
      G.side = side;
    } else if (lat >= HALF*1.6) G.side = side;
  }

  function crossLine(){
    const lapT = G.raceT - G.lapStart;
    const complete = G.visited.size === G.tr.cps.length;
    if (complete){
      G.lap++;
      G.laps.push(lapT);
      const isBest = G.bestLap == null || lapT < G.bestLap;
      if (G.thisBest == null || lapT < G.thisBest) G.thisBest = lapT;
      if (isBest){
        G.bestLap = lapT;
        rec[G.idx] = Object.assign(rec[G.idx] || {}, {lap:lapT, ghost:G.rec.slice()});
        saveRec();
        G.ghost = rec[G.idx].ghost;
        toast(`Tur rekoru! ${fmt(lapT)}`, true); sfx.best();
      } else { toast(`Tur ${G.lap}: ${fmt(lapT)}`); sfx.lap(); }
      if (G.lap >= LAPS){ finish(); return; }
    } else if (G.raceT > 1){
      toast("Kontrol noktası kaçtı — tur sayılmadı"); sfx.miss();
    }
    G.lapStart = G.raceT; G.visited = new Set(); G.rec = [];
  }

  let toastT = null;
  function toast(text, best){
    const el = $("toast");
    el.textContent = text; el.className = "toast" + (best ? " best" : ""); el.hidden = false; restart(el);
    clearTimeout(toastT); toastT = setTimeout(() => { el.hidden = true; }, 1600);
  }

  function medalFor(idx, lapT){
    if (lapT == null) return 0;
    const m = MEDALS[idx];
    return lapT <= m[0] ? 3 : lapT <= m[1] ? 2 : lapT <= m[2] ? 1 : 0;
  }

  function finish(){
    G.state = "done"; G.done = true;
    engineOff();
    const total = G.raceT;
    const r = rec[G.idx] = rec[G.idx] || {};
    const newTotal = r.total == null || total < r.total;
    if (newTotal) r.total = total;
    saveRec();
    sfx.finish();
    const medal = medalFor(G.idx, G.thisBest);
    later(.8, () => {
      $("end-medal").textContent = ["🏁", "🥉", "🥈", "🥇"][medal];
      $("end-title").textContent = medal === 3 ? "Altın madalya!" : medal === 2 ? "Gümüş madalya!" : medal === 1 ? "Bronz madalya!" : "Yarış bitti!";
      $("end-total").textContent = fmt(total);
      $("end-best").textContent = fmt(G.thisBest);
      const m = MEDALS[G.idx], next = medal < 3 ? m[2 - medal] : null;
      $("end-note").textContent = (newTotal ? "Bu pistte en hızlı yarışın! " : "") +
        (next != null ? `Sıradaki madalya için tur süren ${fmt(next)} altına inmeli.` : "Bu pistin en iyi madalyası sende.");
      $("end").hidden = false;
      $("again").focus();
    });
  }

  function renderHud(){
    $("h-track").textContent = G.tr.name;
    $("h-lap").textContent = Math.min(G.lap + 1, LAPS) + "/" + LAPS;
    $("h-cur").textContent = fmt(G.state === "race" ? G.raceT - G.lapStart : 0);
    $("h-best").textContent = fmt(G.bestLap);
    $("h-total").textContent = fmt(G.state === "lights" ? 0 : G.raceT);
  }

  /* ---------- güncelleme ---------- */
  let acc = 0;
  function update(dt){
    if (!G) return;
    if (!$("setup").hidden){ acc = 0; return; }       // pist seçilirken hiçbir şey işlemesin
    G.t += dt;
    if (timers.length){
      const due = [];
      for (const t of timers) if ((t.t -= dt) <= 0) due.push(t);
      if (due.length){ timers = timers.filter(t => t.t > 0); due.forEach(t => t.fn()); }
    }
    if (G.state === "done"){ acc = 0; return; }
    acc += dt;
    let guard = 0;
    while (acc >= STEP && guard++ < 400 && G.state !== "done"){ step(STEP); acc -= STEP; }
    engineSet(Math.hypot(G.car.vx, G.car.vy));
  }

  /* ---------- çizim ---------- */
  const view = {s:1, ox:0, oy:0, dpr:1};
  let trackCanvas = null;
  function strokeLoop(c, tr){
    c.beginPath();
    tr.C.forEach((p, i) => i ? c.lineTo(p[0], p[1]) : c.moveTo(p[0], p[1]));
    c.closePath();
  }
  function paintTrack(c, tr, detail){
    c.fillStyle = "#3E8E41"; c.fillRect(-2000, -2000, 5000, 5000);
    if (detail){
      c.fillStyle = "rgba(255,255,255,.035)";
      for (let x = -400; x < W + 400; x += 60) c.fillRect(x, -400, 30, H + 800);
    }
    c.lineJoin = "round"; c.lineCap = "round";
    // kerbler
    strokeLoop(c, tr); c.lineWidth = HALF*2 + 12; c.strokeStyle = "#F2F2F2"; c.stroke();
    c.setLineDash([14, 14]); strokeLoop(c, tr); c.strokeStyle = "#D62828"; c.stroke(); c.setLineDash([]);
    // asfalt
    strokeLoop(c, tr); c.lineWidth = HALF*2; c.strokeStyle = "#3A3F47"; c.stroke();
    if (detail){
      c.setLineDash([18, 22]); strokeLoop(c, tr); c.lineWidth = 2; c.strokeStyle = "rgba(255,255,255,.35)"; c.stroke(); c.setLineDash([]);
    }
    // bitiş çizgisi (dama)
    const p = tr.C[0], t = tr.T[0], nx = -t[1], ny = t[0];
    c.save(); c.translate(p[0], p[1]); c.rotate(Math.atan2(ny, nx));
    const sq = 7;
    for (let i = -HALF; i < HALF; i += sq){
      for (let j = 0; j < 2; j++){
        c.fillStyle = ((Math.round(i/sq) + j) % 2) ? "#111" : "#fff";
        c.fillRect(i, -sq + j*sq, sq, sq);
      }
    }
    c.restore();
  }
  function prerender(){
    if (!G) return;
    trackCanvas = document.createElement("canvas");
    const d = view.dpr*view.s;
    trackCanvas.width = Math.ceil(W*d); trackCanvas.height = Math.ceil(H*d);
    const c = trackCanvas.getContext("2d");
    c.scale(d, d);
    paintTrack(c, G.tr, true);
  }
  function drawCar(x, y, a, body, alpha){
    ctx.save(); ctx.globalAlpha = alpha == null ? 1 : alpha;
    ctx.translate(x, y); ctx.rotate(a);
    ctx.fillStyle = "#111";
    [[-11, -12], [-11, 8], [7, -12], [7, 8]].forEach(([wx, wy]) => ctx.fillRect(wx, wy, 8, 4));
    ctx.fillStyle = body;
    ctx.beginPath(); ctx.roundRect(-15, -9, 30, 18, 5); ctx.fill();
    ctx.fillStyle = "rgba(154,209,245,.95)";
    ctx.beginPath(); ctx.roundRect(1, -7, 8, 14, 2); ctx.fill();
    ctx.fillStyle = "rgba(255,255,255,.8)";
    ctx.fillRect(-13, -1.5, 12, 3);
    ctx.restore();
  }
  function draw(){
    if (!G) return;
    const d = view.dpr;
    ctx.setTransform(d, 0, 0, d, 0, 0);
    ctx.clearRect(0, 0, cv.width, cv.height);
    ctx.fillStyle = "#3E8E41"; ctx.fillRect(0, 0, cv.width, cv.height);
    ctx.save(); ctx.translate(view.ox, view.oy); ctx.scale(view.s, view.s);
    if (trackCanvas) ctx.drawImage(trackCanvas, 0, 0, W, H);
    // kayma izleri
    ctx.fillStyle = "rgba(20,20,20,.28)";
    G.skids.forEach(s => ctx.fillRect(s[0] - 2, s[1] - 2, 4, 4));
    // hayalet
    if (G.ghost && G.state === "race"){
      const k = Math.floor((G.raceT - G.lapStart)*GHOST_HZ);
      const g = G.ghost[Math.min(k, G.ghost.length - 1)];
      if (g && k < G.ghost.length + GHOST_HZ) drawCar(g[0], g[1], g[2], "#FFFFFF", .38);
    }
    const c = G.car;
    drawCar(c.x, c.y, c.a, "#E63946", 1);
    if (G.grass && G.state === "race"){
      ctx.fillStyle = "rgba(255,255,255,.8)"; ctx.font = "700 14px Barlow, sans-serif"; ctx.textAlign = "center";
      ctx.fillText("çim!", c.x, c.y - 22); ctx.textAlign = "left";
    }
    ctx.restore();
  }

  /* ---------- pist seçimi ---------- */
  function drawSetup(){
    $("tracks").innerHTML = "";
    BUILT.forEach((tr, i) => {
      const b = document.createElement("button");
      b.type = "button"; b.className = "track";
      const cvs = document.createElement("canvas");
      cvs.width = 300; cvs.height = 186;
      const c = cvs.getContext("2d");
      c.scale(.3, .3);
      paintTrack(c, tr, false);
      const r = rec[i] || {};
      const medal = medalFor(i, r.lap);
      const nm = document.createElement("b"); nm.textContent = tr.name;
      const sm = document.createElement("small");
      sm.textContent = r.lap != null ? `${["", "🥉 ", "🥈 ", "🥇 "][medal]}en iyi tur ${fmt(r.lap)}` : `altın için tur ${fmt(MEDALS[i][0])}`;
      b.append(cvs, nm, sm);
      b.addEventListener("click", () => { audio(); newRace(i); });
      $("tracks").appendChild(b);
    });
  }
  function openSetup(){ engineOff(); drawSetup(); $("end").hidden = true; $("setup").hidden = false; }
  $("open-setup").addEventListener("click", openSetup);
  $("end-setup").addEventListener("click", openSetup);
  $("again").addEventListener("click", () => { audio(); newRace(trackIdx); });

  /* ---------- kumanda ---------- */
  function bindKey(id, k){
    const el = $(id);
    const on = e => { e.preventDefault(); audio(); input[k] = true; el.classList.add("on"); };
    const off = e => { if (e) e.preventDefault(); input[k] = false; el.classList.remove("on"); };
    el.addEventListener("pointerdown", on);
    el.addEventListener("pointerup", off); el.addEventListener("pointercancel", off); el.addEventListener("pointerleave", off);
    el.addEventListener("contextmenu", e => e.preventDefault());
  }
  bindKey("k-left", "left"); bindKey("k-right", "right"); bindKey("k-gas", "gas"); bindKey("k-brake", "brake");
  const KEYS = {ArrowUp:"gas", w:"gas", W:"gas", ArrowDown:"brake", s:"brake", S:"brake", ArrowLeft:"left", a:"left", A:"left", ArrowRight:"right", d:"right", D:"right"};
  const BTN = {gas:"k-gas", brake:"k-brake", left:"k-left", right:"k-right"};
  window.addEventListener("keydown", e => {
    if (!$("end").hidden){ if (e.key === "Enter"){ e.preventDefault(); $("again").click(); } return; }
    if (!$("setup").hidden) return;
    const k = KEYS[e.key];
    if (k){ e.preventDefault(); audio(); input[k] = true; $(BTN[k]).classList.add("on"); }
    else if (e.key === "r" || e.key === "R"){ e.preventDefault(); newRace(trackIdx); }
  });
  window.addEventListener("keyup", e => { const k = KEYS[e.key]; if (k){ input[k] = false; $(BTN[k]).classList.remove("on"); } });
  window.addEventListener("blur", () => { Object.keys(input).forEach(k => { input[k] = false; $(BTN[k]).classList.remove("on"); }); });

  /* ---------- döngü ---------- */
  function resize(){
    const r = stage.getBoundingClientRect();
    view.dpr = Math.min(window.devicePixelRatio || 1, 2);
    cv.width = Math.round(r.width*view.dpr); cv.height = Math.round(r.height*view.dpr);
    view.s = Math.min(r.width/W, r.height/H) || 1;
    view.ox = (r.width - W*view.s)/2; view.oy = (r.height - H*view.s)/2;
    prerender();
  }
  let last = performance.now(), hudT = 0;
  function frame(now){
    const dt = Math.min(.05, Math.max(0, (now - last)/1000)); last = now;
    update(dt);
    hudT += dt;
    if (G && hudT > .1){ hudT = 0; renderHud(); }
    draw();
    requestAnimationFrame(frame);
  }

  if (!CanvasRenderingContext2D.prototype.roundRect){
    CanvasRenderingContext2D.prototype.roundRect = function(x, y, w, h, r){
      r = Math.min(r, w/2, h/2);
      this.moveTo(x + r, y); this.arcTo(x + w, y, x + w, y + h, r); this.arcTo(x + w, y + h, x, y + h, r);
      this.arcTo(x, y + h, x, y, r); this.arcTo(x, y, x + w, y, r); this.closePath();
    };
  }
  document.addEventListener("visibilitychange", () => { last = performance.now(); if (document.hidden) engineOff(); });
  if ("ResizeObserver" in window) new ResizeObserver(resize).observe(stage);
  else window.addEventListener("resize", resize);
  resize();
  newRace(trackIdx);
  openSetup();
  requestAnimationFrame(frame);
})();
