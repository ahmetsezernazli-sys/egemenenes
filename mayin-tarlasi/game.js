/* Mayın Tarlası — tahmin gerektirmeyen tahtalar, üç zorluk */
(function(){
  "use strict";

  const LEVELS = [
    {name:"Kolay", cols:9,  rows:9,  mines:10},
    {name:"Orta",  cols:16, rows:16, mines:40},
    {name:"Zor",   cols:30, rows:16, mines:99}
  ];
  const NUM_COL = ["", "#5BA8F2", "#6FD06F", "#F2545B", "#B98CFF", "#FFC857", "#4ED6C8", "#E9EDF5", "#93A3BE"];
  const SETTINGS_KEY = "mayin-ayar", SOUND_KEY = "mayin-ses", REC_KEY = "mayin-rekor";
  const GEN_BUDGET = 1200;                  // tahmin gerektirmeyen tahta aramak için en fazla ms
  const TAU = Math.PI*2;

  const $ = id => document.getElementById(id);
  const wrap = $("wrap"), cv = $("cv"), ctx = cv.getContext("2d");
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const rnd = n => Math.floor(Math.random()*n);
  function shuffle(a){ for (let i = a.length - 1; i > 0; i--){ const j = rnd(i + 1), t = a[i]; a[i] = a[j]; a[j] = t; } return a; }

  let settings = {lv:1, noguess:true, autoflag:true};
  try {
    const s = JSON.parse(localStorage.getItem(SETTINGS_KEY) || "null");
    if (s) settings = {lv:clamp(s.lv | 0, 0, 2), noguess:s.noguess !== false, autoflag:s.autoflag !== false};
  } catch(e) {}
  let soundOn = true;
  try { soundOn = localStorage.getItem(SOUND_KEY) !== "0"; } catch(e) {}
  let records = {};
  try { records = JSON.parse(localStorage.getItem(REC_KEY) || "{}") || {}; } catch(e) {}

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
    dig(){ tone(520, .05, "triangle", .05, 700); },
    open(){ noise(.09, 1400, .12); },
    flag(){ tone(700, .07, "square", .05, 980); },
    unflag(){ tone(520, .07, "square", .04, 380); },
    boom(){ noise(.6, 160, .5, "lowpass"); tone(90, .5, "sine", .12, 40); },
    win(){ [523.25, 659.25, 783.99, 1046.5, 1318.5].forEach((f, i) => tone(f, .26, "triangle", .11, null, i*.1)); },
    rec(){ [880, 1174.7, 1568].forEach((f, i) => tone(f, .3, "sine", .1, null, i*.13)); }
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

  /* ---------- tahta ---------- */
  function neighbours(cols, rows){
    const n = cols*rows, out = new Array(n);
    for (let i = 0; i < n; i++){
      const x = i % cols, y = (i / cols) | 0, list = [];
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++){
        if (!dx && !dy) continue;
        const nx = x + dx, ny = y + dy;
        if (nx < 0 || ny < 0 || nx >= cols || ny >= rows) continue;
        list.push(ny*cols + nx);
      }
      out[i] = list;
    }
    return out;
  }
  function counts(mine, neigh){
    const num = new Uint8Array(mine.length);
    for (let i = 0; i < mine.length; i++){
      let c = 0;
      for (const k of neigh[i]) if (mine[k]) c++;
      num[i] = c;
    }
    return num;
  }

  // Kusursuz mantıkla oynayan çözücü: tahta tahmin gerektirmeden bitiyor mu?
  function solvable(mine, neigh, mines, safe){
    const n = mine.length, num = counts(mine, neigh);
    const st = new Uint8Array(n);                 // 0 kapalı, 1 açık, 2 bayrak
    let opened = 0, flags = 0;
    function open(i){
      const stack = [i];
      while (stack.length){
        const c = stack.pop();
        if (st[c] !== 0 || mine[c]) continue;
        st[c] = 1; opened++;
        if (num[c] === 0) for (const k of neigh[c]) if (st[k] === 0) stack.push(k);
      }
    }
    open(safe);
    for (;;){
      let progress = false;
      const cons = [];                            // {hid:[...], r:kalan mayın}
      for (let i = 0; i < n; i++){
        if (st[i] !== 1 || num[i] === 0) continue;
        const hid = []; let f = 0;
        for (const k of neigh[i]){ if (st[k] === 0) hid.push(k); else if (st[k] === 2) f++; }
        if (!hid.length) continue;
        const r = num[i] - f;
        if (r === 0){ hid.forEach(open); progress = true; }
        else if (r === hid.length){ hid.forEach(k => { st[k] = 2; flags++; }); progress = true; }
        else cons.push({hid, r});
      }
      if (progress) continue;
      // alt küme kuralı: A ⊂ B ise farkta kalan mayın sayısı bilinir
      for (let a = 0; a < cons.length && !progress; a++){
        for (let b = 0; b < cons.length; b++){
          if (a === b) continue;
          const A = cons[a], B = cons[b];
          if (A.hid.length >= B.hid.length) continue;
          let sub = true;
          for (const k of A.hid) if (B.hid.indexOf(k) < 0){ sub = false; break; }
          if (!sub) continue;
          const diff = B.hid.filter(k => A.hid.indexOf(k) < 0), rd = B.r - A.r;
          if (rd === 0){ diff.forEach(open); progress = true; break; }
          if (rd === diff.length){ diff.forEach(k => { if (st[k] === 0){ st[k] = 2; flags++; } }); progress = true; break; }
        }
      }
      if (progress) continue;
      // kalan mayın sayısından çıkan sonuç
      let hidden = 0;
      for (let i = 0; i < n; i++) if (st[i] === 0) hidden++;
      if (hidden){
        if (flags === mines){ for (let i = 0; i < n; i++) if (st[i] === 0) open(i); progress = true; }
        else if (hidden === mines - flags){ for (let i = 0; i < n; i++) if (st[i] === 0){ st[i] = 2; flags++; } progress = true; }
      }
      if (!progress) break;
    }
    return opened === n - mines;
  }

  // İlk dokunulan karenin çevresi hep boş; istenirse tahmin gerektirmeyen tahta aranır
  function makeBoard(cols, rows, mines, safe, neigh, noguess){
    const n = cols*rows, forbidden = new Set([safe].concat(neigh[safe]));
    const pool = [];
    for (let i = 0; i < n; i++) if (!forbidden.has(i)) pool.push(i);
    const t0 = (typeof performance !== "undefined" ? performance.now() : Date.now());
    let last = null, tries = 0;
    for (;;){
      const mine = new Uint8Array(n);
      shuffle(pool);
      for (let k = 0; k < mines; k++) mine[pool[k]] = 1;
      tries++;
      if (!noguess) return {mine, tries, guess:false};
      if (solvable(mine, neigh, mines, safe)) return {mine, tries, guess:false};
      last = mine;
      const now = (typeof performance !== "undefined" ? performance.now() : Date.now());
      if (now - t0 > GEN_BUDGET) return {mine:last, tries, guess:true};
    }
  }

  /* ---------- oyun ---------- */
  let G = null, cs = 32, cursor = -1;

  function newGame(){
    const L = LEVELS[settings.lv], n = L.cols*L.rows;
    G = {
      lv:settings.lv, cols:L.cols, rows:L.rows, mines:L.mines, n,
      neigh:neighbours(L.cols, L.rows),
      mine:new Uint8Array(n), num:new Uint8Array(n), st:new Uint8Array(n),
      opened:0, flags:0, started:false, over:false, win:false, guessBoard:false,
      boom:-1, t0:0, time:0, press:-1
    };
    cursor = -1;
    $("end").hidden = true;
    face("🙂");
    layout();
    render();
  }

  const face = e => { $("face").textContent = e; };
  const fmt = s => Math.floor(s/60) + ":" + String(Math.floor(s) % 60).padStart(2, "0");

  function render(){
    $("mines-n").textContent = Math.max(0, G.mines - G.flags);
    $("clock-n").textContent = fmt(G.time);
    draw();
  }

  function start(i){
    const r = makeBoard(G.cols, G.rows, G.mines, i, G.neigh, settings.noguess);
    G.mine = r.mine; G.num = counts(r.mine, G.neigh); G.guessBoard = r.guess;
    G.started = true; G.t0 = Date.now();
  }

  function openCell(i){
    if (G.over || G.st[i] !== 0) return;
    if (!G.started) start(i);
    if (G.mine[i]){ lose(i); return; }
    const stack = [i];
    let any = false;
    while (stack.length){
      const c = stack.pop();
      if (G.st[c] !== 0 || G.mine[c]) continue;
      G.st[c] = 1; G.opened++; any = true;
      if (G.num[c] === 0) for (const k of G.neigh[c]) if (G.st[k] === 0) stack.push(k);
    }
    if (any) sfx.open();
    afterMove();
  }

  function toggleFlag(i){
    if (G.over || G.st[i] === 1) return;
    if (!G.started){ G.st[i] = G.st[i] === 2 ? 0 : 2; G.flags += G.st[i] === 2 ? 1 : -1; sfx.flag(); render(); return; }
    if (G.st[i] === 2){ G.st[i] = 0; G.flags--; sfx.unflag(); }
    else { G.st[i] = 2; G.flags++; sfx.flag(); }
    render();
  }

  // açık bir sayıya dokunmak: etrafındaki bayraklar yetiyorsa kalanları açar
  function chord(i){
    if (G.over || G.st[i] !== 1 || !G.num[i]) return;
    let f = 0;
    const hid = [];
    for (const k of G.neigh[i]){ if (G.st[k] === 2) f++; else if (G.st[k] === 0) hid.push(k); }
    if (f !== G.num[i] || !hid.length) return;
    for (const k of hid){ if (G.mine[k]){ lose(k); return; } }
    hid.forEach(openCell);
  }

  function afterMove(){
    if (settings.autoflag && !G.over){
      const hidden = G.n - G.opened - G.flags;
      if (hidden > 0 && hidden === G.mines - G.flags){
        for (let i = 0; i < G.n; i++) if (G.st[i] === 0){ G.st[i] = 2; G.flags++; }
      }
    }
    if (G.opened === G.n - G.mines) win();
    else render();
  }

  function win(){
    G.over = true; G.win = true;
    G.time = (Date.now() - G.t0)/1000;
    for (let i = 0; i < G.n; i++) if (G.st[i] === 0){ G.st[i] = 2; G.flags++; }
    face("😎"); sfx.win();
    const key = LEVELS[G.lv].name, sec = Math.floor(G.time);
    const old = records[key];
    const isRec = !old || sec < old;
    if (isRec){ records[key] = sec; try { localStorage.setItem(REC_KEY, JSON.stringify(records)); } catch(e) {} sfx.rec(); }
    render();
    setTimeout(() => {
      $("end-emoji").textContent = isRec ? "🥇" : "🏆";
      $("end-title").textContent = isRec ? "Yeni rekor!" : "Tarlayı temizledin!";
      $("end-time").textContent = fmt(sec);
      $("end-note").textContent = isRec
        ? `${LEVELS[G.lv].name} seviyesinde en iyi süren.`
        : `${LEVELS[G.lv].name} rekorun: ${fmt(records[key])}`;
      $("end").hidden = false;
      $("again").focus();
    }, 700);
  }

  function lose(i){
    G.over = true; G.win = false; G.boom = i;
    G.time = G.started ? (Date.now() - G.t0)/1000 : 0;
    face("💥"); sfx.boom();
    if (navigator.vibrate) { try { navigator.vibrate(120); } catch(e) {} }
    render();
    setTimeout(() => {
      $("end-emoji").textContent = "💥";
      $("end-title").textContent = "Mayına bastın!";
      $("end-time").textContent = fmt(Math.floor(G.time));
      const left = G.n - G.mines - G.opened;
      $("end-note").textContent = `${G.opened} kare açmıştın, ${left} kare kalmıştı.`;
      $("end").hidden = false;
      $("again").focus();
    }, 900);
  }

  /* ---------- çizim ---------- */
  function layout(){
    const r = wrap.getBoundingClientRect();
    const fitW = (r.width - 20)/G.cols, fitH = (r.height - 20)/G.rows;
    cs = Math.max(24, Math.min(46, Math.floor(Math.min(fitW, fitH))));
    const w = G.cols*cs, h = G.rows*cs;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    cv.style.width = w + "px"; cv.style.height = h + "px";
    cv.width = Math.round(w*dpr); cv.height = Math.round(h*dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  function drawMine(x, y, s, col){
    ctx.fillStyle = col;
    ctx.beginPath(); ctx.arc(x, y, s*.26, 0, TAU); ctx.fill();
    ctx.strokeStyle = col; ctx.lineWidth = Math.max(2, s*.07); ctx.lineCap = "round";
    for (let a = 0; a < 4; a++){
      const an = a*Math.PI/4;
      ctx.beginPath();
      ctx.moveTo(x - Math.cos(an)*s*.4, y - Math.sin(an)*s*.4);
      ctx.lineTo(x + Math.cos(an)*s*.4, y + Math.sin(an)*s*.4);
      ctx.stroke();
    }
    ctx.lineCap = "butt";
    ctx.fillStyle = "rgba(255,255,255,.65)";
    ctx.beginPath(); ctx.arc(x - s*.09, y - s*.09, s*.06, 0, TAU); ctx.fill();
  }

  function drawFlag(x, y, s){
    ctx.strokeStyle = "#C9D3E4"; ctx.lineWidth = Math.max(2, s*.07);
    ctx.beginPath(); ctx.moveTo(x + s*.04, y - s*.28); ctx.lineTo(x + s*.04, y + s*.28); ctx.stroke();
    ctx.fillStyle = "#2A3A55";
    ctx.fillRect(x - s*.2, y + s*.24, s*.44, s*.08);
    ctx.fillStyle = "#F2545B";
    ctx.beginPath(); ctx.moveTo(x + s*.04, y - s*.3); ctx.lineTo(x - s*.28, y - s*.12); ctx.lineTo(x + s*.04, y + s*.04); ctx.closePath(); ctx.fill();
  }

  function draw(){
    if (!G) return;
    const w = G.cols*cs, h = G.rows*cs;
    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = "#1B2434"; ctx.fillRect(0, 0, w, h);
    ctx.textAlign = "center"; ctx.textBaseline = "middle";
    ctx.font = `700 ${Math.round(cs*.56)}px "Chivo Mono", monospace`;
    for (let i = 0; i < G.n; i++){
      const x = (i % G.cols)*cs, y = ((i/G.cols) | 0)*cs;
      const cx = x + cs/2, cy = y + cs/2, s = cs;
      const open = G.st[i] === 1;
      if (open){
        ctx.fillStyle = "#151C28";
        ctx.fillRect(x + 1, y + 1, cs - 2, cs - 2);
        if (G.num[i]){
          ctx.fillStyle = NUM_COL[G.num[i]];
          ctx.fillText(String(G.num[i]), cx, cy + cs*.03);
        }
      } else {
        const pressed = G.press === i;
        ctx.fillStyle = pressed ? "#2E4266" : "#2A3A55";
        ctx.beginPath(); ctx.roundRect(x + 1.5, y + 1.5, cs - 3, cs - 3, Math.max(3, cs*.16)); ctx.fill();
        ctx.fillStyle = "rgba(255,255,255,.10)";
        ctx.beginPath(); ctx.roundRect(x + 1.5, y + 1.5, cs - 3, (cs - 3)*.42, Math.max(3, cs*.16)); ctx.fill();
        if (G.st[i] === 2) drawFlag(cx, cy, s);
      }
      // oyun bittiyse mayınları göster
      if (G.over){
        if (G.mine[i] && G.st[i] !== 2){
          if (i === G.boom){ ctx.fillStyle = "#F2545B"; ctx.fillRect(x + 1, y + 1, cs - 2, cs - 2); }
          drawMine(cx, cy, s, i === G.boom ? "#2B0E10" : "#C9D3E4");
        } else if (!G.mine[i] && G.st[i] === 2){
          drawMine(cx, cy, s, "#7A879C");
          ctx.strokeStyle = "#F2545B"; ctx.lineWidth = Math.max(2, cs*.08);
          ctx.beginPath(); ctx.moveTo(x + cs*.22, y + cs*.22); ctx.lineTo(x + cs*.78, y + cs*.78);
          ctx.moveTo(x + cs*.78, y + cs*.22); ctx.lineTo(x + cs*.22, y + cs*.78); ctx.stroke();
        }
      }
    }
    // ızgara çizgileri
    ctx.strokeStyle = "rgba(0,0,0,.35)"; ctx.lineWidth = 1;
    ctx.beginPath();
    for (let c = 1; c < G.cols; c++){ ctx.moveTo(c*cs + .5, 0); ctx.lineTo(c*cs + .5, h); }
    for (let r = 1; r < G.rows; r++){ ctx.moveTo(0, r*cs + .5); ctx.lineTo(w, r*cs + .5); }
    ctx.stroke();
    if (cursor >= 0){
      const x = (cursor % G.cols)*cs, y = ((cursor/G.cols) | 0)*cs;
      ctx.strokeStyle = "#8CE05B"; ctx.lineWidth = 3;
      ctx.strokeRect(x + 2, y + 2, cs - 4, cs - 4);
    }
  }

  /* ---------- giriş ---------- */
  let flagMode = false, pressTimer = 0, pressIdx = -1, pressXY = null, longDone = false;
  function setMode(on){
    flagMode = on;
    $("mode").setAttribute("aria-pressed", String(on));
    $("mode-ic").textContent = on ? "🚩" : "⛏️";
    $("mode-tx").textContent = on ? "Bayrak" : "Kaz";
  }
  $("mode").addEventListener("click", () => { audio(); setMode(!flagMode); });

  const cellAt = e => {
    const r = cv.getBoundingClientRect();
    const x = Math.floor((e.clientX - r.left)/(r.width/G.cols));
    const y = Math.floor((e.clientY - r.top)/(r.height/G.rows));
    if (x < 0 || y < 0 || x >= G.cols || y >= G.rows) return -1;
    return y*G.cols + x;
  };

  cv.addEventListener("pointerdown", e => {
    if (!G || G.over) return;
    e.preventDefault(); audio();
    const i = cellAt(e);
    if (i < 0) return;
    pressIdx = i; pressXY = {x:e.clientX, y:e.clientY}; longDone = false;
    if (G.st[i] === 0){ G.press = i; face("😮"); draw(); }
    clearTimeout(pressTimer);
    pressTimer = setTimeout(() => {                       // basılı tutunca bayrak
      if (pressIdx !== i) return;
      longDone = true; G.press = -1; face("🙂");
      toggleFlag(i);
      if (navigator.vibrate) { try { navigator.vibrate(18); } catch(err) {} }
    }, 420);
  });
  cv.addEventListener("pointermove", e => {
    if (pressIdx < 0 || !pressXY) return;
    if (Math.hypot(e.clientX - pressXY.x, e.clientY - pressXY.y) > 12){   // parmak kaydıysa iptal
      clearTimeout(pressTimer); pressIdx = -1;
      if (G){ G.press = -1; if (!G.over) face("🙂"); draw(); }
    }
  });
  function release(e){
    clearTimeout(pressTimer);
    const i = pressIdx; pressIdx = null; pressXY = null;
    if (!G || G.over || i == null || i < 0){ if (G){ G.press = -1; draw(); } return; }
    G.press = -1;
    if (!longDone){
      if (!G.over) face("🙂");
      if (flagMode && G.st[i] !== 1) toggleFlag(i);
      else if (G.st[i] === 1) chord(i);
      else if (G.st[i] === 0){ sfx.dig(); openCell(i); }
      else toggleFlag(i);
    }
    pressIdx = -1;
    draw();
  }
  cv.addEventListener("pointerup", release);
  cv.addEventListener("pointercancel", () => { clearTimeout(pressTimer); pressIdx = -1; if (G){ G.press = -1; draw(); } });
  cv.addEventListener("contextmenu", e => {                // sağ tık: bayrak
    e.preventDefault();
    if (!G || G.over) return;
    const i = cellAt(e);
    if (i >= 0) toggleFlag(i);
  });

  window.addEventListener("keydown", e => {
    if (!$("setup").hidden){ return; }
    if (!$("end").hidden){ if (e.key === "Enter"){ e.preventDefault(); $("again").click(); } return; }
    if (!G) return;
    const step = {ArrowLeft:-1, ArrowRight:1, ArrowUp:-G.cols, ArrowDown:G.cols}[e.key];
    if (step !== undefined){
      e.preventDefault();
      if (cursor < 0) cursor = ((G.rows/2) | 0)*G.cols + ((G.cols/2) | 0);
      else {
        const x = cursor % G.cols;
        if (e.key === "ArrowLeft" && x === 0) return;
        if (e.key === "ArrowRight" && x === G.cols - 1) return;
        cursor = clamp(cursor + step, 0, G.n - 1);
      }
      draw();
    } else if (e.key === " " || e.key === "Enter"){
      e.preventDefault(); audio();
      if (cursor < 0) return;
      if (G.st[cursor] === 1) chord(cursor); else openCell(cursor);
      draw();
    } else if (e.key === "f" || e.key === "F"){
      e.preventDefault(); audio();
      if (cursor >= 0) toggleFlag(cursor);
    } else if (e.key === "r" || e.key === "R"){
      e.preventDefault(); audio(); newGame();
    }
  });

  $("restart").addEventListener("click", () => { audio(); newGame(); });
  $("again").addEventListener("click", () => { audio(); $("end").hidden = true; newGame(); });
  function openSetup(){
    const r = document.querySelector(`input[name="lv"][value="${settings.lv}"]`);
    if (r) r.checked = true;
    $("noguess").checked = settings.noguess;
    $("autoflag").checked = settings.autoflag;
    $("end").hidden = true;
    $("setup").hidden = false;
  }
  $("open-setup").addEventListener("click", openSetup);
  $("end-setup").addEventListener("click", openSetup);
  $("setup-form").addEventListener("submit", e => {
    e.preventDefault(); audio();
    const lv = document.querySelector('input[name="lv"]:checked');
    settings.lv = lv ? +lv.value : 1;
    settings.noguess = $("noguess").checked;
    settings.autoflag = $("autoflag").checked;
    try { localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings)); } catch(e) {}
    $("setup").hidden = true;
    newGame();
  });

  /* ---------- döngü ---------- */
  function tick(){
    if (G && G.started && !G.over){
      const t = (Date.now() - G.t0)/1000;
      if (Math.floor(t) !== Math.floor(G.time)){ G.time = t; $("clock-n").textContent = fmt(t); }
      else G.time = t;
    }
    requestAnimationFrame(tick);
  }

  if (!CanvasRenderingContext2D.prototype.roundRect){
    CanvasRenderingContext2D.prototype.roundRect = function(x, y, w, h, r){
      r = Math.min(r, w/2, h/2);
      this.moveTo(x + r, y); this.arcTo(x + w, y, x + w, y + h, r); this.arcTo(x + w, y + h, x, y + h, r);
      this.arcTo(x, y + h, x, y, r); this.arcTo(x, y, x + w, y, r); this.closePath();
    };
  }
  if ("ResizeObserver" in window) new ResizeObserver(() => { if (G){ layout(); draw(); } }).observe(wrap);
  else window.addEventListener("resize", () => { if (G){ layout(); draw(); } });
  setMode(false);
  newGame();
  $("setup").hidden = true;
  requestAnimationFrame(tick);
})();
