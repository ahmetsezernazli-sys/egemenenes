(() => {
  "use strict";
  const $ = id => document.getElementById(id);

  /* ---------- oyun ayarları ---------- */
  const W = 480, H = 720;
  const FRUITS = [
    {nm: "elma",  col: "kırmızı", c: "#E5484D", d: "#A8262B"},
    {nm: "armut", col: "yeşil",   c: "#7BC043", d: "#4E8A22"},
    {nm: "limon", col: "sarı",    c: "#F5C542", d: "#C2951A"},
    {nm: "üzüm",  col: "mor",     c: "#8E44AD", d: "#5E2B75"}
  ];
  const PER_TREE = 6;
  const STEPS = [8, 6, 4];                     // karganın yolu: Kolay ~%88, Normal ~%69, Zor ~%37 kazanma (simülasyonla)
  const TREES = [{x: 125, y: 232}, {x: 355, y: 232}, {x: 125, y: 438}, {x: 355, y: 438}];
  const CROWN = 86;
  const DIE = {x: 384, y: 648, s: 92};
  const BASKET = {x: 30, y: 604, w: 290, h: 98};
  const SLOTS = [
    {av:"🚀", bg:"#3D8BFD"}, {av:"🎈", bg:"#FF7A2F"}, {av:"🦋", bg:"#9B5DE5"},
    {av:"🐢", bg:"#2EB872"}, {av:"🦊", bg:"#E5484D"}, {av:"🐧", bg:"#1CC7B1"}
  ];
  const DEF = ["Enes", "Egemen", "Anne", "Baba", "", ""];
  const SAVE_KEY = "hasat";
  const cap = s => s.charAt(0).toLocaleUpperCase("tr") + s.slice(1);
  const fruitSlots = Array.from({length: PER_TREE}, (_, i) => {
    const a = -Math.PI / 2 + i / PER_TREE * Math.PI * 2 + .3;
    return {x: Math.cos(a) * 50, y: Math.sin(a) * 44 - 6};
  });

  let save = {wins: 0, losses: 0};
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
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + .01); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(a.destination); o.start(t); o.stop(t + dur + .05);
  }
  const sRoll = () => { for (let k = 0; k < 6; k++) tone(200 + Math.random() * 300, 150, "square", .05, .04, k * .1); };
  const sPick = () => tone(500, 900, "sine", .14, .15);
  const sCaw = () => { tone(520, 300, "sawtooth", .18, .07); tone(480, 260, "sawtooth", .2, .07, .22); };
  const sWin = () => [523, 659, 784, 1047, 1319].forEach((f, k) => tone(f, f, "triangle", .25, .15, k * .1));
  const sLose = () => [392, 349, 330, 262].forEach((f, k) => tone(f, f, "triangle", .25, .12, k * .14));

  const canSpeak = "speechSynthesis" in window;
  let trVoice = null;
  function pickVoice(){ trVoice = speechSynthesis.getVoices().find(v => /^tr(-|_|$)/i.test(v.lang)) || null; }
  if (canSpeak){ pickVoice(); if (speechSynthesis.addEventListener) speechSynthesis.addEventListener("voiceschanged", pickVoice); }
  function say(text){
    if (!canSpeak || !soundOn || !trVoice || !G || !G.cfg.help) return;
    speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text); u.voice = trVoice; u.lang = trVoice.lang; u.rate = .97; u.pitch = 1.12;
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

  /* ---------- denge simülasyonu (testler ve ayar için) ---------- */
  function simulate(steps, games){
    let wins = 0;
    for (let g = 0; g < games; g++){
      const t = [PER_TREE, PER_TREE, PER_TREE, PER_TREE]; let crow = 0;
      while (crow < steps && t.some(n => n > 0)){
        const f = Math.random() * 6 | 0;
        if (f < 4){ if (t[f] > 0) t[f]--; }
        else if (f === 4){ for (let k = 0; k < 2; k++){ const i = t.indexOf(Math.max(...t)); if (t[i] > 0) t[i]--; } }
        else crow++;
      }
      if (crow < steps) wins++;
    }
    return wins / games;
  }

  /* ---------- durum ---------- */
  let G = null, timers = [];
  const later = (sec, fn) => timers.push({t: sec, fn});

  function newGame(cfg){
    timers = [];
    G = {cfg, trees: [PER_TREE, PER_TREE, PER_TREE, PER_TREE], got: [0, 0, 0, 0], crow: 0, steps: STEPS[cfg.level],
      cur: 0, state: "roll", face: 0, need: 0, allowed: [], fly: [], t: 0, hop: 0, confetti: [], over: false, rollT: 0};
    ["setup", "end"].forEach(id => $(id).hidden = true);
    render();
    turnStart(true);
  }
  const total = () => G.trees.reduce((a, b) => a + b, 0);
  const P = () => G.cfg.players[G.cur];

  function turnStart(first){
    G.state = "roll";
    render();
    status(`${P().name}, zara dokun!`);
    say(first ? `Hasat başlıyor! ${P().name}, zara dokun.` : `Sıra ${P().name}${suffix(P().name)}`);
  }
  function status(t){ $("status").textContent = t; }

  function roll(){
    if (!G || G.over || G.state !== "roll") return;
    audio();
    G.state = "rolling"; G.rollT = .9; sRoll();
  }
  function rolled(f){
    G.face = f;
    if (f < 4){
      const F = FRUITS[f];
      if (G.trees[f] > 0){
        G.state = "pick"; G.need = 1; G.allowed = [f];
        status(`${cap(F.col)}! ${cap(F.nm)} ağacından bir ${F.nm} topla.`);
        say(`${cap(F.col)}! Bir ${F.nm} topla.`);
      } else {
        status(`${cap(F.nm)} ağacı boş! Sıra geçiyor.`);
        say(`${cap(F.nm)} ağacı boş!`);
        G.state = "wait"; later(1.6, nextTurn);
      }
    } else if (f === 4){
      G.state = "pick"; G.need = Math.min(2, total()); G.allowed = [0, 1, 2, 3];
      status("Sepet! İstediğin iki meyveyi topla.");
      say("Sepet! İstediğin iki meyveyi topla.");
    } else {
      G.crow++; G.hop = .6; sCaw();
      G.state = "wait";
      if (G.crow >= G.steps){ status("Karga bahçeye vardı!"); later(1, lose); }
      else {
        const left = G.steps - G.crow;
        status(`Karga bir adım yaklaştı! ${left} adım kaldı.`);
        say(`Karga bir adım yaklaştı! ${left} adım kaldı.`);
        later(1.8, nextTurn);
      }
    }
    render();
  }
  function pickFrom(i){
    if (!G || G.state !== "pick" || !G.allowed.includes(i) || G.trees[i] <= 0) return;
    audio();
    const slot = fruitSlots[G.trees[i] - 1];
    G.trees[i]--; G.got[i]++; G.need--;
    sPick();
    G.fly.push({k: i, x0: TREES[i].x + slot.x, y0: TREES[i].y + slot.y, t: 0});
    const F = FRUITS[i];
    if (G.need > 0){ status(`Bir meyve daha topla!`); say(`${cap(F.nm)}! Bir tane daha.`); }
    render();
    if (total() === 0){ G.state = "wait"; later(.8, win); return; }
    if (G.need <= 0){ G.state = "wait"; if (G.face < 4) say(`${cap(F.nm)} sepette!`); later(1.1, nextTurn); }
  }
  function nextTurn(){ if (!G || G.over) return; G.cur = (G.cur + 1) % G.cfg.players.length; turnStart(false); }

  function win(){
    G.over = true; save.wins++; store(); sWin();
    const cols = ["#E5484D", "#F5C542", "#7BC043", "#8E44AD", "#3D8BFD", "#FF7A2F"];
    for (let k = 0; k < 80; k++) G.confetti.push({x: 40 + Math.random() * 400, y: -10 - Math.random() * 140, vx: (Math.random() - .5) * 80, vy: 60 + Math.random() * 90, r: Math.random() * 6, vr: (Math.random() - .5) * 8, c: cols[k % 6], life: 4});
    $("end-icon").textContent = "🧺"; $("end-title").textContent = "Hepimiz kazandık!";
    $("end-note").textContent = `Karga eli boş döndü! (${G.steps - G.crow} adım uzaktaydı) · Toplam: ${save.wins} kazanma, ${save.losses} kaybetme`;
    say("Bütün meyveleri topladık! Hepimiz kazandık!");
    later(1.4, () => { $("end").hidden = false; $("again").focus(); });
  }
  function lose(){
    G.over = true; save.losses++; store(); sLose();
    $("end-icon").textContent = "🐦"; $("end-title").textContent = "Karga kazandı!";
    $("end-note").textContent = `${total()} meyve kalmıştı. Bir daha deneyelim! · Toplam: ${save.wins} kazanma, ${save.losses} kaybetme`;
    say("Karga bahçeye vardı. Bu sefer karga kazandı. Bir daha deneyelim!");
    later(.8, () => { $("end").hidden = false; $("again").focus(); });
  }

  /* ---------- güncelle ---------- */
  function update(dt){
    for (const tm of timers) tm.t -= dt;
    const due = timers.filter(tm => tm.t <= 0); timers = timers.filter(tm => tm.t > 0); due.forEach(tm => tm.fn());
    if (!G) return;
    G.t += dt;
    if (G.state === "rolling"){
      G.rollT -= dt;
      if (Math.floor(G.rollT * 12) !== Math.floor((G.rollT + dt) * 12)) G.face = Math.random() * 6 | 0;
      if (G.rollT <= 0) rolled(Math.random() * 6 | 0);
    }
    if (G.hop > 0) G.hop = Math.max(0, G.hop - dt);
    for (const f of G.fly) f.t += dt / .6;
    G.fly = G.fly.filter(f => f.t < 1);
    for (const c of G.confetti){ c.life -= dt; c.x += c.vx * dt; c.y += c.vy * dt; c.r += c.vr * dt; }
    G.confetti = G.confetti.filter(c => c.life > 0 && c.y < H + 20);
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
  function rr(x, y, w, h, r, fill){ ctx.fillStyle = fill; ctx.beginPath(); ctx.roundRect(x, y, w, h, r); ctx.fill(); }

  function fruit(k, x, y, s){
    const F = FRUITS[k]; s = s || 1;
    ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
    if (k === 0){
      ctx.fillStyle = F.c; ctx.beginPath(); ctx.arc(-4, 2, 9, 0, Math.PI * 2); ctx.arc(4, 2, 9, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = "#6D4C41"; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(0, -6); ctx.lineTo(1, -11); ctx.stroke();
      ctx.fillStyle = "#4CAF50"; ctx.beginPath(); ctx.ellipse(5, -10, 5, 2.5, -.5, 0, Math.PI * 2); ctx.fill();
    } else if (k === 1){
      ctx.fillStyle = F.c; ctx.beginPath(); ctx.arc(0, 4, 9, 0, Math.PI * 2); ctx.arc(0, -4, 6, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = "#6D4C41"; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(0, -9); ctx.lineTo(2, -14); ctx.stroke();
    } else if (k === 2){
      ctx.fillStyle = F.c; ctx.beginPath(); ctx.ellipse(0, 0, 11, 8, 0, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(-11, 0, 2.5, 0, Math.PI * 2); ctx.arc(11, 0, 2.5, 0, Math.PI * 2); ctx.fill();
    } else {
      ctx.fillStyle = F.c;
      for (const [dx, dy] of [[-6, -5], [0, -6], [6, -5], [-3, 0], [3, 0], [0, 6], [-6, 4], [6, 4]]){ ctx.beginPath(); ctx.arc(dx, dy, 4.2, 0, Math.PI * 2); ctx.fill(); }
      ctx.fillStyle = "#4CAF50"; ctx.beginPath(); ctx.ellipse(3, -12, 5, 2.5, .3, 0, Math.PI * 2); ctx.fill();
    }
    ctx.fillStyle = "rgba(255,255,255,.45)"; ctx.beginPath(); ctx.arc(-3, -2, 2.2, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  }
  function crowShape(x, y, s, flap){
    ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
    ctx.fillStyle = "#1F1F24";
    ctx.beginPath(); ctx.ellipse(0, 0, 16, 11, 0, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(13, -8, 8, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.moveTo(-14, -2); ctx.lineTo(-26, -8); ctx.lineTo(-24, 4); ctx.closePath(); ctx.fill();
    ctx.save(); ctx.translate(-2, -4); ctx.rotate(-.6 - flap); ctx.beginPath(); ctx.ellipse(0, -8, 6, 13, 0, 0, Math.PI * 2); ctx.fill(); ctx.restore();
    ctx.fillStyle = "#F5A623"; ctx.beginPath(); ctx.moveTo(20, -9); ctx.lineTo(29, -6); ctx.lineTo(20, -4); ctx.closePath(); ctx.fill();
    ctx.fillStyle = "#fff"; ctx.beginPath(); ctx.arc(15, -10, 2.6, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "#000"; ctx.beginPath(); ctx.arc(15.6, -10, 1.3, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = "#F5A623"; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(-2, 10); ctx.lineTo(-3, 17); ctx.moveTo(4, 10); ctx.lineTo(5, 17); ctx.stroke();
    ctx.restore();
  }
  function dieFace(f, x, y, s){
    if (f < 4) fruit(f, x, y, s * 2.2);
    else if (f === 4){
      ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
      ctx.fillStyle = "#C98B55"; ctx.beginPath(); ctx.moveTo(-22, -4); ctx.lineTo(22, -4); ctx.lineTo(16, 18); ctx.lineTo(-16, 18); ctx.closePath(); ctx.fill();
      ctx.strokeStyle = "#9C6B3E"; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(0, -4, 17, Math.PI, 0); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(-19, 5); ctx.lineTo(19, 5); ctx.moveTo(-17, 12); ctx.lineTo(17, 12); ctx.stroke();
      ctx.restore();
    } else crowShape(x - 4, y + 2, s * .95, 0);
  }

  function draw(){
    const {s, ox, oy, dpr} = view;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.fillStyle = "#9AD27E"; ctx.fillRect(0, 0, cv.width, cv.height);
    ctx.setTransform(dpr * s, 0, 0, dpr * s, dpr * ox, dpr * oy);
    // gökyüzü ve çimen
    const sky = ctx.createLinearGradient(0, -200, 0, 130); sky.addColorStop(0, "#8ED1F5"); sky.addColorStop(1, "#D8F0FB");
    ctx.fillStyle = sky; ctx.fillRect(-400, -300, W + 800, 430);
    ctx.fillStyle = "#9AD27E"; ctx.fillRect(-400, 128, W + 800, H + 300);
    ctx.fillStyle = "#8BC56E"; for (let k = 0; k < 40; k++){ ctx.fillRect((k * 61) % W, 140 + (k * 43) % 450, 3, 8); }
    if (!G) return;
    // karganın yolu
    const n = G.steps, x0 = 46, x1 = 382, py = 82;
    for (let i = 0; i <= n; i++){
      const x = x0 + (x1 - x0) * i / n;
      ctx.fillStyle = i < G.crow ? "#B0A595" : "#D9CDB8"; ctx.beginPath(); ctx.ellipse(x, py + 18, 15, 7, 0, 0, Math.PI * 2); ctx.fill();
    }
    // bahçe kapısı
    ctx.fillStyle = "#FFFFFF";
    for (let k = 0; k < 4; k++) rr(404 + k * 15, 66, 9, 50, 3, "#FFFFFF");
    rr(400, 78, 68, 6, 2, "#F1E7D8"); rr(400, 100, 68, 6, 2, "#F1E7D8");
    const cx = x0 + (x1 - x0) * Math.min(G.crow, n) / n, hop = Math.sin(G.hop / .6 * Math.PI) * 18;
    crowShape(cx - (G.hop > 0 ? (x1 - x0) / n * (G.hop / .6) : 0), py - hop, 1, G.hop > 0 ? Math.sin(G.t * 30) * .6 : Math.sin(G.t * 2) * .1);
    // ağaçlar
    const glowAll = G.state === "pick" && G.cfg.help;
    const fullest = Math.max(...G.trees);
    TREES.forEach((T, i) => {
      rr(T.x - 12, T.y + 40, 24, 70, 6, "#8D6E63");
      const can = G.state === "pick" && G.allowed.includes(i) && G.trees[i] > 0;
      const glow = glowAll && can && (G.face < 4 || G.trees[i] === fullest);
      if (glow){ ctx.fillStyle = `rgba(255,255,255,${.35 + .3 * Math.sin(G.t * 6)})`; ctx.beginPath(); ctx.arc(T.x, T.y, CROWN + 12, 0, Math.PI * 2); ctx.fill(); }
      ctx.fillStyle = "#2E9E5B";
      for (const [dx, dy, r] of [[0, -10, 62], [-44, 12, 46], [44, 12, 46], [0, 28, 50]]){ ctx.beginPath(); ctx.arc(T.x + dx, T.y + dy, r, 0, Math.PI * 2); ctx.fill(); }
      for (let k = 0; k < G.trees[i]; k++) fruit(i, T.x + fruitSlots[k].x, T.y + fruitSlots[k].y, 1.25);
      // ağacın altındaki etiket: rengi ve kalan sayı
      ctx.fillStyle = "rgba(255,255,255,.85)"; ctx.beginPath(); ctx.roundRect(T.x + 20, T.y + 84, 46, 26, 13); ctx.fill();
      fruit(i, T.x + 34, T.y + 97, .8);
      ctx.fillStyle = "#24452E"; ctx.font = "800 18px 'Baloo 2', sans-serif"; ctx.textAlign = "center"; ctx.textBaseline = "middle";
      ctx.fillText(G.trees[i], T.x + 54, T.y + 98);
    });
    // sepet
    rr(BASKET.x, BASKET.y, BASKET.w, BASKET.h, 16, "rgba(255,255,255,.5)");
    ctx.fillStyle = "#C98B55"; ctx.beginPath(); ctx.moveTo(BASKET.x + 12, BASKET.y + 40); ctx.lineTo(BASKET.x + BASKET.w - 12, BASKET.y + 40); ctx.lineTo(BASKET.x + BASKET.w - 26, BASKET.y + BASKET.h - 8); ctx.lineTo(BASKET.x + 26, BASKET.y + BASKET.h - 8); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = "#9C6B3E"; ctx.lineWidth = 3;
    for (let k = 0; k < 3; k++){ ctx.beginPath(); ctx.moveTo(BASKET.x + 16 + k * 3, BASKET.y + 54 + k * 14); ctx.lineTo(BASKET.x + BASKET.w - 16 - k * 3, BASKET.y + 54 + k * 14); ctx.stroke(); }
    G.got.forEach((g, i) => { for (let k = 0; k < g; k++) fruit(i, BASKET.x + 26 + i * 66 + (k % 3) * 16, BASKET.y + 30 - Math.floor(k / 3) * 14, .95); });
    // uçan meyveler
    for (const f of G.fly){
      const k = f.t, ex = BASKET.x + 26 + f.k * 66 + ((G.got[f.k] - 1) % 3) * 16, ey = BASKET.y + 30;
      fruit(f.k, f.x0 + (ex - f.x0) * k, f.y0 + (ey - f.y0) * k - Math.sin(k * Math.PI) * 80, 1.25);
    }
    // zar
    const ready = G.state === "roll", pulse = ready ? 1 + Math.sin(G.t * 5) * .05 : 1, shake = G.state === "rolling" ? Math.sin(G.t * 50) * .15 : 0;
    ctx.save(); ctx.translate(DIE.x, DIE.y); ctx.rotate(shake); ctx.scale(pulse, pulse);
    ctx.fillStyle = "rgba(0,0,0,.18)"; ctx.beginPath(); ctx.roundRect(-DIE.s / 2 + 4, -DIE.s / 2 + 6, DIE.s, DIE.s, 20); ctx.fill();
    ctx.fillStyle = "#FFFDF7"; ctx.beginPath(); ctx.roundRect(-DIE.s / 2, -DIE.s / 2, DIE.s, DIE.s, 20); ctx.fill();
    if (ready && G.cfg.help){ ctx.strokeStyle = `rgba(229,72,77,${.5 + .4 * Math.sin(G.t * 5)})`; ctx.lineWidth = 5; ctx.stroke(); }
    ctx.restore();
    dieFace(G.face, DIE.x, DIE.y, 1);
    if (ready){ ctx.fillStyle = "#24452E"; ctx.font = "800 15px 'Baloo 2', sans-serif"; ctx.textAlign = "center"; ctx.fillText("dokun!", DIE.x, DIE.y + DIE.s / 2 + 14); }
    for (const c of G.confetti){ ctx.save(); ctx.translate(c.x, c.y); ctx.rotate(c.r); ctx.fillStyle = c.c; ctx.fillRect(-5, -3, 10, 6); ctx.restore(); }
  }

  function render(){
    if (!G) return;
    const ul = $("players"); ul.innerHTML = "";
    G.cfg.players.forEach((p, i) => {
      const li = document.createElement("li");
      li.className = "pl" + (i === G.cur && !G.over ? " on" : "");
      li.innerHTML = `<span class="av" style="background:${SLOTS[i].bg}">${SLOTS[i].av}</span><span></span>`;
      li.lastChild.textContent = p.name; ul.appendChild(li);
    });
  }

  /* ---------- dokunma ---------- */
  function press(x, y){
    if (!G || G.over) return;
    audio();
    if (Math.abs(x - DIE.x) < DIE.s / 2 + 10 && Math.abs(y - DIE.y) < DIE.s / 2 + 10){ roll(); return; }
    if (G.state === "pick"){
      for (let i = 0; i < 4; i++) if (Math.hypot(x - TREES[i].x, y - TREES[i].y) < CROWN + 10){
        if (G.allowed.includes(i) && G.trees[i] > 0) pickFrom(i);
        else if (G.trees[i] <= 0){ status(`${cap(FRUITS[i].nm)} ağacı boş, başka ağaç seç!`); say(`Bu ağaç boş!`); }
        else { const F = FRUITS[G.face]; status(`${cap(F.col)} ağaca dokun: ${F.nm}!`); say(`Hayır, ${F.col} ağaç! ${cap(F.nm)}.`); }
        return;
      }
    }
  }
  cv.addEventListener("pointerdown", e => { e.preventDefault(); const p = toLogical(e); press(p.x, p.y); });
  document.addEventListener("keydown", e => {
    if (!G || (e.target instanceof Element && e.target.closest("input, button, form"))) return;
    if (e.key === " " || e.key === "Enter"){ e.preventDefault(); roll(); }
    if (G.state === "pick" && ["1", "2", "3", "4"].includes(e.key)) pickFrom(+e.key - 1);
  });

  /* ---------- kurulum ---------- */
  const form = $("setup-form");
  function buildRows(){
    const n = +form.count.value, box = $("rows");
    const old = [...box.querySelectorAll("input")].map(i => i.value);
    box.innerHTML = "";
    for (let i = 0; i < n; i++){
      const row = document.createElement("div"); row.className = "p-row";
      row.innerHTML = `<span class="av" style="background:${SLOTS[i].bg}">${SLOTS[i].av}</span><input type="text" maxlength="12" aria-label="${i + 1}. oyuncunun adı" placeholder="Oyuncu ${i + 1}">`;
      row.querySelector("input").value = old[i] !== undefined ? old[i] : DEF[i];
      box.appendChild(row);
    }
  }
  form.addEventListener("change", e => { if (e.target.name === "count") buildRows(); });
  form.addEventListener("submit", e => {
    e.preventDefault(); audio();
    const players = [...$("rows").querySelectorAll("input")].map((inp, i) => ({name: inp.value.trim() || `Oyuncu ${i + 1}`}));
    newGame({players, level: +form.level.value, help: $("help").checked});
  });
  $("open-setup").addEventListener("click", () => { timers = []; if (G) G.over = true; $("end").hidden = true; $("setup").hidden = false; });
  $("end-setup").addEventListener("click", () => { $("end").hidden = true; $("setup").hidden = false; });
  $("again").addEventListener("click", () => { audio(); newGame(G.cfg); });

  let last = performance.now();
  function frame(now){
    const dt = Math.min(.05, (now - last) / 1000); last = now;
    update(dt); draw();
    requestAnimationFrame(frame);
  }
  document.addEventListener("visibilitychange", () => { last = performance.now(); if (document.hidden && canSpeak) speechSynthesis.cancel(); });
  if ("ResizeObserver" in window) new ResizeObserver(resize).observe(stage); else window.addEventListener("resize", resize);
  resize(); buildRows();
  requestAnimationFrame(frame);

  // testler için
  window.__hasat = {state: () => G, newGame, update, press, roll, rolled, pickFrom, simulate, STEPS, TREES, DIE, PER_TREE};
})();
