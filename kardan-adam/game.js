(() => {
  "use strict";
  const $ = id => document.getElementById(id);

  /* ---------- ölçüler ---------- */
  const W = 480, H = 720;
  const SNOW_Y = 300;                         // karın başladığı yükseklik
  const TARGETS = [76, 54, 38];               // büyük, orta, küçük top
  const SIZE_NM = ["büyük", "orta", "küçük"];
  const STACK_X = 150;                        // kardan adamın yeri
  const GROUND = H - 70;
  const SAVE_KEY = "kardan-adam";

  const ITEMS = [
    {id:"goz",    nm:"gözler",       at:[0, -.42], part:2},
    {id:"burun",  nm:"havuç burun",  at:[0, -.06], part:2},
    {id:"agiz",   nm:"ağız",         at:[0, .38],  part:2},
    {id:"sapka",  nm:"şapka",        at:[0, -1.1], part:2},
    {id:"atki",   nm:"atkı",         at:[0, 1.15], part:2},
    {id:"dugme",  nm:"düğmeler",     at:[0, 0],    part:1},
    {id:"kol",    nm:"kollar",       at:[0, -.2],  part:1}
  ];

  let save = {made: 0};
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
    o.type = type; o.frequency.setValueAtTime(f1, t); o.frequency.exponentialRampToValueAtTime(Math.max(20, f2), t + dur * .9);
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + .02); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(a.destination); o.start(t); o.stop(t + dur + .05);
  }
  const sRoll = () => tone(120 + Math.random() * 60, 90, "sawtooth", .08, .03);
  const sReady = () => [520, 700].forEach((f, k) => tone(f, f * 1.2, "triangle", .16, .18, k * .09));
  const sSnap = () => tone(300, 700, "sine", .14, .25);
  const sPick = () => tone(700, 760, "sine", .07, .14);
  const sCheer = () => [523, 659, 784, 1047].forEach((f, k) => tone(f, f, "triangle", .3, .2, k * .13));

  const canSpeak = "speechSynthesis" in window;
  let trVoice = null;
  function pickVoice(){ trVoice = speechSynthesis.getVoices().find(v => /^tr(-|_|$)/i.test(v.lang)) || null; }
  if (canSpeak){ pickVoice(); if (speechSynthesis.addEventListener) speechSynthesis.addEventListener("voiceschanged", pickVoice); }
  function say(text){
    if (!canSpeak || !soundOn || !trVoice) return;
    speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text); u.voice = trVoice; u.lang = trVoice.lang; u.rate = .95; u.pitch = 1.15;
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
  const SAY_N = ["", "bir", "iki", "üç"];

  function newRound(){
    timers = [];
    G = {
      stage: "roll", idx: 0, t: 0,
      ball: null, balls: [], tracks: [], flakes: [], bits: [],
      stacked: [], items: [], drag: null, alive: 0, blink: 0
    };
    for (let i = 0; i < 70; i++) G.flakes.push({x: Math.random() * W, y: Math.random() * H, r: 1.5 + Math.random() * 2.5, s: 12 + Math.random() * 26, w: Math.random() * 6});
    $("done").hidden = true; $("next").hidden = true;
    say("Parmağınla karı yuvarla, büyük bir top yap!");
  }

  /* ---------- dokunma ---------- */
  const cv = $("cv"), stage = $("stage"), ctx = cv.getContext("2d");
  let view = {s: 1, ox: 0, oy: 0, dpr: 1};
  const toLogical = e => {
    const r = cv.getBoundingClientRect();
    return {x: (e.clientX - r.left - view.ox) / view.s, y: (e.clientY - r.top - view.oy) / view.s};
  };
  function trayPos(k){ return {x: 54 + k * 62, y: H - 46}; }
  function stackPos(k){                       // k: 0 büyük, 1 orta, 2 küçük
    let y = GROUND - TARGETS[0];
    if (k === 1) y = GROUND - TARGETS[0] * 2 - TARGETS[1] + 14;
    if (k === 2) y = GROUND - TARGETS[0] * 2 - TARGETS[1] * 2 - TARGETS[2] + 26;
    return {x: STACK_X, y};
  }

  function down(e){
    if (!G) return;
    e.preventDefault(); audio();
    const {x, y} = toLogical(e);
    if (G.stage === "roll"){
      G.ball = {x, y: Math.max(y, SNOW_Y + 20), r: 14, rolled: 0};
      G.rolling = true;
      return;
    }
    if (G.stage === "stack"){
      const k = G.idx;                       // sırası gelen top
      const b = G.balls[k];
      if (b && Math.hypot(b.x - x, b.y - y) < b.r + 30){ G.drag = {ball: b, dx: b.x - x, dy: b.y - y}; sPick(); }
      return;
    }
    if (G.stage === "dress"){
      // tepsiden eşya al
      for (let k = 0; k < ITEMS.length; k++){
        if (G.items.some(it => it.id === ITEMS[k].id)) continue;
        const p = trayPos(k);
        if (Math.hypot(p.x - x, p.y - y) < 32){
          G.drag = {item: ITEMS[k], x, y};
          sPick(); say(ITEMS[k].nm);
          return;
        }
      }
      // yerleştirilmiş eşyayı tekrar tut
      for (const it of G.items){
        if (Math.hypot(it.x - x, it.y - y) < 36){ G.drag = {item: it.def, x, y, move: it}; sPick(); return; }
      }
    }
  }
  function move(e){
    if (!G) return;
    const {x, y} = toLogical(e);
    if (G.stage === "roll" && G.rolling && G.ball){
      const b = G.ball;
      const d = Math.hypot(x - b.x, Math.max(y, SNOW_Y + 20) - b.y);
      const t = TARGETS[G.idx];
      if (b.r < t && y > SNOW_Y){
        b.r = Math.min(t, b.r + d * .055);
        if (Math.random() < .5) G.tracks.push({x: b.x, y: b.y, r: b.r * .55});
        if (Math.random() < .4) sRoll();
      }
      b.x = Math.max(b.r, Math.min(W - b.r, x));
      b.y = Math.max(SNOW_Y + b.r * .3, Math.min(GROUND, Math.max(y, SNOW_Y + 20)));
      if (b.r >= t && !b.ready){ b.ready = true; ballReady(); }
      return;
    }
    if (G.drag && G.drag.ball){
      const b = G.drag.ball;
      b.x = Math.max(b.r, Math.min(W - b.r, x + G.drag.dx));
      b.y = Math.max(60, Math.min(GROUND, y + G.drag.dy));
      return;
    }
    if (G.drag && G.drag.item){ G.drag.x = x; G.drag.y = y; }
  }
  function up(){
    if (!G) return;
    if (G.stage === "roll"){ G.rolling = false; return; }
    if (G.drag && G.drag.ball){
      const b = G.drag.ball, k = G.idx, p = stackPos(k);
      if (Math.hypot(b.x - p.x, b.y - p.y) < 70){
        b.x = p.x; b.y = p.y; b.placed = true;
        G.stacked.push(b);
        sSnap();
        G.idx++;
        if (G.idx >= 3){
          G.stage = "dress"; G.idx = 0;
          later(.4, () => say("Şimdi süsle! Havuç burnunu ve şapkasını tak."));
        } else say(`${SAY_N[G.idx + 1]}. top`);
      }
      G.drag = null;
      return;
    }
    if (G.drag && G.drag.item){
      const d = G.drag, def = d.item;
      const near = snapSpot(def, d.x, d.y);
      const it = d.move || {id: def.id, def};
      it.x = near.x; it.y = near.y;
      if (!d.move) G.items.push(it);
      sSnap();
      G.drag = null;
      if (G.items.length >= 2) $("done").hidden = false;
    }
  }
  function snapSpot(def, x, y){
    const b = G.stacked[def.part] || G.stacked[2];
    if (!b) return {x, y};
    const sx = b.x + def.at[0] * b.r, sy = b.y + def.at[1] * b.r;
    return Math.hypot(sx - x, sy - y) < 90 ? {x: sx, y: sy} : {x, y};
  }
  function ballReady(){
    sReady();
    const b = G.ball;
    b.ready = true;
    G.balls.push(b);
    G.ball = null; G.rolling = false;
    const n = G.balls.length;
    say(n < 3 ? `${SAY_N[n]} top! Şimdi ${SIZE_NM[n]} top yap.` : "Üç top! Şimdi üst üste koy.");
    G.idx = n;
    if (n >= 3){
      G.stage = "stack"; G.idx = 0;
      G.balls.forEach((bb, k) => { bb.hx = 330 + k * 44; bb.hy = GROUND - 30 - k * 10; bb.x = bb.hx; bb.y = bb.hy; });
    }
  }
  cv.addEventListener("pointerdown", down);
  cv.addEventListener("pointermove", move);
  cv.addEventListener("pointerup", up);
  cv.addEventListener("pointercancel", up);

  $("done").addEventListener("click", () => {
    if (!G || G.stage !== "dress") return;
    audio();
    G.stage = "alive"; G.alive = 0;
    $("done").hidden = true;
    sCheer();
    save.made++; store(); renderCount(true);
    for (let i = 0; i < 40; i++) G.bits.push({x: STACK_X, y: GROUND - 150, vx: (Math.random() - .5) * 320, vy: -120 - Math.random() * 220, life: 1 + Math.random(), c: ["#FFD166","#FF7A8A","#38BDF8","#FFFFFF"][i % 4]});
    say("Harika bir kardan adam! Bak, el sallıyor.");
    later(2.6, () => { $("next").hidden = false; });
  });
  $("next").addEventListener("click", () => { audio(); newRound(); });

  /* ---------- güncelleme ---------- */
  function update(dt){
    if (!G) return;
    G.t += dt;
    for (const tm of timers) tm.t -= dt;
    const due = timers.filter(tm => tm.t <= 0); timers = timers.filter(tm => tm.t > 0); due.forEach(tm => tm.fn());
    for (const f of G.flakes){
      f.y += f.s * dt; f.x += Math.sin(G.t + f.w) * 8 * dt;
      if (f.y > H){ f.y = -6; f.x = Math.random() * W; }
    }
    for (const b of G.bits){ b.x += b.vx * dt; b.y += b.vy * dt; b.vy += 420 * dt; b.life -= dt; }
    G.bits = G.bits.filter(b => b.life > 0);
    if (G.stage === "alive") G.alive += dt;
    G.blink = (G.blink + dt) % 4;
  }

  /* ---------- çizim ---------- */
  function resize(){
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const cw = stage.clientWidth, ch = stage.clientHeight;
    cv.width = Math.round(cw * dpr); cv.height = Math.round(ch * dpr);
    const s = Math.min(cw / W, ch / H);
    view = {s, ox: (cw - W * s) / 2, oy: (ch - H * s) / 2, dpr};
  }
  function ball(x, y, r){
    const g = ctx.createRadialGradient(x - r * .35, y - r * .4, r * .1, x, y, r);
    g.addColorStop(0, "#FFFFFF"); g.addColorStop(1, "#D8E9F5");
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = "rgba(120,160,190,.35)"; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(x, y, r - 1, 0, Math.PI * 2); ctx.stroke();
  }
  function drawItem(def, x, y, r){
    const sc = r / 38;
    ctx.save(); ctx.translate(x, y); ctx.scale(sc, sc);
    if (def.id === "goz"){
      const blink = G.stage === "alive" && G.blink > 3.7;
      ctx.fillStyle = "#27405A";
      for (const dx of [-13, 13]){
        if (blink){ ctx.fillRect(dx - 5, -1, 10, 3); }
        else { ctx.beginPath(); ctx.arc(dx, 0, 5.5, 0, Math.PI * 2); ctx.fill(); }
      }
    } else if (def.id === "burun"){
      ctx.fillStyle = "#F97316";
      ctx.beginPath(); ctx.moveTo(-5, -6); ctx.lineTo(-5, 6); ctx.lineTo(34, 1); ctx.closePath(); ctx.fill();
      ctx.strokeStyle = "#C2410C"; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.moveTo(4, -4); ctx.lineTo(4, 5); ctx.moveTo(14, -3); ctx.lineTo(14, 4); ctx.stroke();
    } else if (def.id === "agiz"){
      ctx.fillStyle = "#27405A";
      for (let k = -2; k <= 2; k++){ ctx.beginPath(); ctx.arc(k * 9, Math.abs(k) * 2.5, 3, 0, Math.PI * 2); ctx.fill(); }
    } else if (def.id === "sapka"){
      ctx.fillStyle = "#334155";
      ctx.fillRect(-34, -4, 68, 8);
      ctx.fillRect(-21, -34, 42, 32);
      ctx.fillStyle = "#E5484D"; ctx.fillRect(-21, -12, 42, 8);
    } else if (def.id === "atki"){
      ctx.fillStyle = "#E5484D";
      ctx.fillRect(-30, -8, 60, 15);
      ctx.fillRect(14, 2, 15, 34);
      ctx.fillStyle = "#FFFFFF";
      for (let k = 0; k < 3; k++) ctx.fillRect(16, 8 + k * 10, 11, 4);
    } else if (def.id === "dugme"){
      ctx.fillStyle = "#334155";
      for (const dy of [-22, 0, 22]){ ctx.beginPath(); ctx.arc(0, dy, 6, 0, Math.PI * 2); ctx.fill(); }
    } else if (def.id === "kol"){
      const wave = G.stage === "alive" ? Math.sin(G.t * 6) * .5 : 0;
      ctx.strokeStyle = "#8B5A2B"; ctx.lineWidth = 6; ctx.lineCap = "round";
      for (const dir of [-1, 1]){
        ctx.save(); ctx.rotate(dir > 0 ? wave : 0);
        ctx.beginPath(); ctx.moveTo(dir * 8, 0); ctx.lineTo(dir * 56, dir > 0 ? -18 : 6);
        ctx.moveTo(dir * 40, dir > 0 ? -10 : 2); ctx.lineTo(dir * 56, dir > 0 ? -26 : -12);
        ctx.stroke();
        ctx.restore();
      }
    }
    ctx.restore();
  }
  function draw(){
    const {s, ox, oy, dpr} = view;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.fillStyle = "#BFE3F7"; ctx.fillRect(0, 0, cv.width, cv.height);
    ctx.setTransform(dpr * s, 0, 0, dpr * s, dpr * ox, dpr * oy);
    // gökyüzü
    const sky = ctx.createLinearGradient(0, -200, 0, SNOW_Y);
    sky.addColorStop(0, "#8FC9E8"); sky.addColorStop(1, "#DCEFFA");
    ctx.fillStyle = sky; ctx.fillRect(-300, -300, W + 600, SNOW_Y + 300);
    // uzak ağaçlar
    for (let i = 0; i < 9; i++){
      const x = 20 + i * 58, h = 60 + ((i * 37) % 40);
      ctx.fillStyle = "#1F6B46";
      for (let k = 0; k < 3; k++){
        const w = 30 - k * 7, yy = SNOW_Y - 6 - k * (h / 4);
        ctx.beginPath(); ctx.moveTo(x, yy - h / 2.4); ctx.lineTo(x + w, yy); ctx.lineTo(x - w, yy); ctx.closePath(); ctx.fill();
      }
      ctx.fillStyle = "#FFFFFF";
      ctx.beginPath(); ctx.moveTo(x, SNOW_Y - 6 - 2 * (h / 4) - h / 2.4); ctx.lineTo(x + 9, SNOW_Y - 10 - 2 * (h / 4)); ctx.lineTo(x - 9, SNOW_Y - 10 - 2 * (h / 4)); ctx.closePath(); ctx.fill();
    }
    // kar zemini
    ctx.fillStyle = "#FFFFFF";
    ctx.beginPath(); ctx.moveTo(-200, SNOW_Y + 24);
    for (let x = -200; x <= W + 200; x += 24) ctx.lineTo(x, SNOW_Y + Math.sin(x * .02) * 10 + 14);
    ctx.lineTo(W + 200, H + 200); ctx.lineTo(-200, H + 200); ctx.closePath(); ctx.fill();
    if (!G) return;
    // yuvarlanan izler
    ctx.fillStyle = "rgba(216,233,245,.6)";
    for (const t of G.tracks){ ctx.beginPath(); ctx.arc(t.x, t.y, t.r, 0, Math.PI * 2); ctx.fill(); }
    // hedef halkası
    if (G.stage === "roll"){
      const t = TARGETS[G.idx];
      ctx.strokeStyle = `rgba(42,125,180,${.35 + .25 * Math.sin(G.t * 3)})`; ctx.lineWidth = 5; ctx.setLineDash([12, 10]);
      ctx.beginPath(); ctx.arc(W - 110, SNOW_Y + 120, t, 0, Math.PI * 2); ctx.stroke(); ctx.setLineDash([]);
      ctx.fillStyle = "#27405A"; ctx.font = "700 20px 'Baloo 2', sans-serif"; ctx.textAlign = "center";
      ctx.fillText(`${SIZE_NM[G.idx]} top`, W - 110, SNOW_Y + 120 + t + 28);
      if (!G.ball){
        const ty = SNOW_Y + 78;
        ctx.fillStyle = "rgba(255,255,255,.85)";
        ctx.beginPath(); ctx.roundRect(W / 2 - 128, ty - 26, 256, 40, 20); ctx.fill();
        ctx.fillStyle = `rgba(39,64,90,${.65 + .35 * Math.sin(G.t * 3)})`; ctx.font = "700 22px 'Baloo 2', sans-serif";
        ctx.fillText("👆 karı yuvarla", W / 2, ty);
      }
    }
    // gölge + toplar
    const shade = (x, y, r) => { ctx.fillStyle = "rgba(90,130,160,.18)"; ctx.beginPath(); ctx.ellipse(x, y + r * .92, r * .95, r * .3, 0, 0, Math.PI * 2); ctx.fill(); };
    for (const b of G.balls) if (!b.placed){ shade(b.x, b.y, b.r); ball(b.x, b.y, b.r); }
    for (const b of G.stacked){ if (b === G.stacked[0]) shade(b.x, b.y, b.r); ball(b.x, b.y, b.r); }
    if (G.ball){ shade(G.ball.x, G.ball.y, G.ball.r); ball(G.ball.x, G.ball.y, G.ball.r); }
    // yerleştirme hedefi
    if (G.stage === "stack" && G.idx < 3){
      const p = stackPos(G.idx), r = TARGETS[G.idx];
      ctx.strokeStyle = `rgba(42,125,180,${.4 + .3 * Math.sin(G.t * 3)})`; ctx.lineWidth = 5; ctx.setLineDash([12, 10]);
      ctx.beginPath(); ctx.arc(p.x, p.y, r, 0, Math.PI * 2); ctx.stroke(); ctx.setLineDash([]);
      const b = G.balls[G.idx];
      if (b && !G.drag){
        ctx.strokeStyle = `rgba(42,125,180,${.5 + .3 * Math.sin(G.t * 4)})`; ctx.lineWidth = 4;
        ctx.beginPath(); ctx.arc(b.x, b.y, b.r + 10, 0, Math.PI * 2); ctx.stroke();
      }
    }
    // süsler
    for (const it of G.items){
      const r = (G.stacked[it.def.part] || G.stacked[2]).r;
      drawItem(it.def, it.x, it.y, r);
    }
    // tepsi
    if (G.stage === "dress"){
      ctx.fillStyle = "rgba(255,255,255,.75)";
      ctx.beginPath(); ctx.roundRect(16, H - 84, W - 32, 76, 20); ctx.fill();
      ITEMS.forEach((def, k) => {
        if (G.items.some(it => it.id === def.id)) return;
        const p = trayPos(k);
        ctx.save(); ctx.translate(p.x, p.y); ctx.scale(.66, .66);
        drawItem(def, 0, 0, 38);
        ctx.restore();
      });
    }
    // sürüklenen eşya
    if (G.drag && G.drag.item) drawItem(G.drag.item, G.drag.x, G.drag.y, 38);
    // konfeti
    for (const b of G.bits){ ctx.globalAlpha = Math.max(0, b.life); ctx.fillStyle = b.c; ctx.fillRect(b.x - 4, b.y - 4, 8, 8); }
    ctx.globalAlpha = 1;
    // kar taneleri
    ctx.fillStyle = "rgba(255,255,255,.9)";
    for (const f of G.flakes){ ctx.beginPath(); ctx.arc(f.x, f.y, f.r, 0, Math.PI * 2); ctx.fill(); }
  }

  /* ---------- sayaç ---------- */
  function renderCount(bump){
    $("made").textContent = save.made;
    if (bump){ const b = $("shelf-btn"); b.classList.remove("bump"); void b.offsetWidth; b.classList.add("bump"); }
  }
  $("shelf-btn").addEventListener("click", () => {
    audio();
    say(save.made ? `${save.made} kardan adam yaptın!` : "Hadi ilk kardan adamını yap!");
  });

  /* ---------- döngü ---------- */
  let last = performance.now();
  function frame(now){
    const dt = Math.min(.05, (now - last) / 1000); last = now;
    update(dt);
    draw();
    requestAnimationFrame(frame);
  }
  document.addEventListener("visibilitychange", () => { last = performance.now(); if (document.hidden && canSpeak) speechSynthesis.cancel(); });
  if ("ResizeObserver" in window) new ResizeObserver(resize).observe(stage); else window.addEventListener("resize", resize);
  resize();
  renderCount(false);
  newRound();
  requestAnimationFrame(frame);
})();
