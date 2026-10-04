(() => {
  "use strict";
  const $ = id => document.getElementById(id);

  /* ---------- ölçüler ---------- */
  const W = 480, H = 720;
  const BED_Y = 430;                 // muayene masasının üstü
  const CX = 240, CY = 320;          // hayvanın merkezi
  const TRAY_Y = H - 62;
  const SAVE_KEY = "hayvan-doktoru";

  const ANIMALS = [
    {id:"kedi",      nm:"kedi",      fur:"#F4A259", fur2:"#D9833B", ear:"tri",  nose:"#E07A9A"},
    {id:"kopek",     nm:"köpek",     fur:"#C98B4F", fur2:"#A66C34", ear:"flop", nose:"#4A3728"},
    {id:"tavsan",    nm:"tavşan",    fur:"#F3F0EC", fur2:"#D8D2CA", ear:"long", nose:"#E07A9A"},
    {id:"ayi",       nm:"ayı",       fur:"#A9763F", fur2:"#855B2E", ear:"round",nose:"#3B2A1A"},
    {id:"kurbaga",   nm:"kurbağa",   fur:"#6DBE45", fur2:"#4E9430", ear:"none", nose:"#2F6B1C"},
    {id:"domuzcuk",  nm:"domuzcuk",  fur:"#F7AFC0", fur2:"#DE8AA0", ear:"tri",  nose:"#D4677F"}
  ];
  // dertler: hangi alet iyileştirir
  const ILLS = {
    camur:  {tool:"sunger",  nm:"çamur",      say:"Çamur olmuş! Süngerle yıka."},
    diken:  {tool:"cimbiz",  nm:"diken",      say:"Ayağına diken batmış! Cımbızla çek."},
    yara:   {tool:"bant",    nm:"yara",       say:"Canı yanmış! Yara bandı yapıştır."},
    ates:   {tool:"termo",   nm:"ateş",       say:"Ateşi var! Termometreyle ölç."},
    ilac:   {tool:"ilac",    nm:"ilaç",       say:"Şimdi şurubunu ver."},
    uzgun:  {tool:"sevgi",   nm:"üzgün",      say:"Biraz korkmuş! Onu sevelim."}
  };
  const TOOLS = [
    {id:"sunger", nm:"sünger",      c:"#3B82F6"},
    {id:"cimbiz", nm:"cımbız",      c:"#94A3B8"},
    {id:"bant",   nm:"yara bandı",  c:"#F7C59F"},
    {id:"termo",  nm:"termometre",  c:"#E5484D"},
    {id:"ilac",   nm:"şurup",       c:"#A855F7"},
    {id:"sevgi",  nm:"sevgi",       c:"#FF6B8A"}
  ];

  let save = {healed: 0};
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
  const sPick = () => tone(680, 760, "sine", .07, .13);
  const sScrub = () => tone(220 + Math.random() * 120, 180, "sawtooth", .07, .04);
  const sFix = () => [600, 820].forEach((f, k) => tone(f, f * 1.25, "triangle", .16, .18, k * .09));
  const sNope = () => tone(300, 240, "triangle", .18, .09);
  const sBeep = () => [900, 900, 1200].forEach((f, k) => tone(f, f, "square", .09, .1, k * .14));
  const sCheer = () => [523, 659, 784, 1047].forEach((f, k) => tone(f, f, "triangle", .28, .2, k * .12));

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

  /* ---------- hasta ---------- */
  let G = null, timers = [];
  const later = (sec, fn) => timers.push({t: sec, fn});
  let lastAnimal = -1;

  function newPatient(){
    timers = [];
    let k; do { k = Math.random() * ANIMALS.length | 0; } while (k === lastAnimal && ANIMALS.length > 1);
    lastAnimal = k;
    const pool = ["camur", "diken", "yara", "ates", "uzgun"];
    for (let i = pool.length - 1; i > 0; i--){ const j = Math.random() * (i + 1) | 0; [pool[i], pool[j]] = [pool[j], pool[i]]; }
    const picked = pool.slice(0, 2);
    const ills = [];
    for (const id of picked){
      if (id === "camur") ills.push({id, spots: Array.from({length: 5}, () => ({x: CX + (Math.random() - .5) * 150, y: CY + (Math.random() - .3) * 130, r: 16 + Math.random() * 10})), done: false});
      else if (id === "diken") ills.push({id, x: CX - 70, y: CY + 115, done: false});
      else if (id === "yara") ills.push({id, x: CX + 78, y: CY + 60, done: false});
      else if (id === "ates") ills.push({id, x: CX, y: CY - 10, done: false, stage: 0});
      else ills.push({id, x: CX, y: CY + 10, done: false});
    }
    G = {an: ANIMALS[k], ills, cur: 0, drag: null, bits: [], hearts: [], t: 0, happy: 0, done: false, shake: 0, msg: ""};
    $("next").hidden = true;
    later(.5, () => tell());
  }
  function tell(){
    const ill = G.ills[G.cur];
    if (!ill) return;
    const key = ill.id === "ates" && ill.stage === 1 ? "ilac" : ill.id;
    G.msg = ILLS[key].say;
    say(`${G.an.nm} geldi. ${ILLS[key].say}`);
  }
  const needTool = () => {
    const ill = G.ills[G.cur];
    if (!ill) return null;
    return ill.id === "ates" && ill.stage === 1 ? "ilac" : ILLS[ill.id].tool;
  };

  /* ---------- dokunma ---------- */
  const cv = $("cv"), stage = $("stage"), ctx = cv.getContext("2d");
  let view = {s: 1, ox: 0, oy: 0, dpr: 1};
  const toLogical = e => {
    const r = cv.getBoundingClientRect();
    return {x: (e.clientX - r.left - view.ox) / view.s, y: (e.clientY - r.top - view.oy) / view.s};
  };
  const toolPos = k => ({x: 46 + k * 78, y: TRAY_Y});

  function down(e){
    if (!G || G.done) return;
    e.preventDefault(); audio();
    const {x, y} = toLogical(e);
    for (let k = 0; k < TOOLS.length; k++){
      const p = toolPos(k);
      if (Math.hypot(p.x - x, p.y - y) < 36){
        G.drag = {tool: TOOLS[k], x, y};
        sPick(); say(TOOLS[k].nm);
        return;
      }
    }
  }
  function move(e){
    if (!G || !G.drag) return;
    const {x, y} = toLogical(e);
    G.drag.x = x; G.drag.y = y;
    const ill = G.ills[G.cur];
    if (ill && ill.id === "camur" && G.drag.tool.id === "sunger"){
      for (const s of ill.spots){
        if (s.r > 0 && Math.hypot(s.x - x, s.y - y) < s.r + 26){
          s.r -= 1.6;
          if (Math.random() < .3){ sScrub(); bubble(x, y); }
          if (s.r <= 0) s.r = 0;
        }
      }
      if (ill.spots.every(s => s.r <= 0)) fixed();
    }
  }
  function up(){
    if (!G || !G.drag) return;
    const d = G.drag, ill = G.ills[G.cur];
    G.drag = null;
    if (!ill) return;
    const onAnimal = Math.hypot(d.x - CX, d.y - CY) < 190;
    if (!onAnimal) return;
    if (d.tool.id !== needTool()){
      sNope(); G.shake = .5;
      say("Bu olmadı, başka bir şey dene.");
      return;
    }
    if (ill.id === "camur") return;                         // sünger sürterek temizlenir
    if (ill.id === "ates" && ill.stage === 0){
      ill.stage = 1; sBeep();
      G.msg = ILLS.ilac.say;
      say("Ateşi var! Şimdi şurubunu ver.");
      return;
    }
    fixed();
  }
  cv.addEventListener("pointerdown", down);
  cv.addEventListener("pointermove", move);
  cv.addEventListener("pointerup", up);
  cv.addEventListener("pointercancel", up);

  function fixed(){
    const ill = G.ills[G.cur];
    ill.done = true;
    sFix();
    for (let i = 0; i < 12; i++) G.hearts.push({x: CX + (Math.random() - .5) * 120, y: CY, vy: -60 - Math.random() * 60, life: 1.2});
    G.cur++;
    if (G.cur >= G.ills.length){
      G.done = true; G.happy = 0;
      save.healed++; store(); renderCount(true);
      G.msg = "Teşekkürler!";
      sCheer();
      say(`Oldu! ${G.an.nm} iyileşti. Teşekkür ediyor!`);
      later(2.2, () => { $("next").hidden = false; });
    } else later(.6, tell);
  }
  function bubble(x, y){
    G.bits.push({x: x + (Math.random() - .5) * 30, y: y + (Math.random() - .5) * 30, r: 4 + Math.random() * 7, life: .7, vy: -40 - Math.random() * 40});
  }
  $("next").addEventListener("click", () => { audio(); newPatient(); });

  /* ---------- güncelleme ---------- */
  function update(dt){
    if (!G) return;
    G.t += dt;
    for (const tm of timers) tm.t -= dt;
    const due = timers.filter(tm => tm.t <= 0); timers = timers.filter(tm => tm.t > 0); due.forEach(tm => tm.fn());
    for (const b of G.bits){ b.y += b.vy * dt; b.life -= dt; }
    G.bits = G.bits.filter(b => b.life > 0);
    for (const h of G.hearts){ h.y += h.vy * dt; h.life -= dt; }
    G.hearts = G.hearts.filter(h => h.life > 0);
    G.shake = Math.max(0, G.shake - dt);
    if (G.done) G.happy += dt;
  }

  /* ---------- çizim ---------- */
  function resize(){
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const cw = stage.clientWidth, ch = stage.clientHeight;
    cv.width = Math.round(cw * dpr); cv.height = Math.round(ch * dpr);
    const s = Math.min(cw / W, ch / H);
    view = {s, ox: (cw - W * s) / 2, oy: (ch - H * s) / 2, dpr};
  }
  function roundRect(x, y, w, h, r){ ctx.beginPath(); ctx.roundRect ? ctx.roundRect(x, y, w, h, r) : ctx.rect(x, y, w, h); }
  function drawAnimal(){
    const a = G.an, bob = Math.sin(G.t * 2) * 4, sh = G.shake > 0 ? Math.sin(G.t * 40) * 6 : 0;
    ctx.save(); ctx.translate(CX + sh, CY + bob);
    // gövde
    ctx.fillStyle = a.fur;
    ctx.beginPath(); ctx.ellipse(0, 90, 95, 72, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = a.fur2;
    ctx.beginPath(); ctx.ellipse(0, 108, 62, 46, 0, 0, Math.PI * 2); ctx.fill();
    // patiler
    ctx.fillStyle = a.fur;
    for (const dx of [-62, 62]){ ctx.beginPath(); ctx.ellipse(dx, 150, 28, 20, 0, 0, Math.PI * 2); ctx.fill(); }
    // kulaklar
    ctx.fillStyle = a.fur;
    if (a.ear === "tri"){
      for (const dx of [-54, 54]){ ctx.beginPath(); ctx.moveTo(dx - 26, -48); ctx.lineTo(dx + 4, -104); ctx.lineTo(dx + 28, -44); ctx.closePath(); ctx.fill(); }
    } else if (a.ear === "flop"){
      for (const dx of [-74, 74]){ ctx.beginPath(); ctx.ellipse(dx, -10, 24, 46, dx < 0 ? .3 : -.3, 0, Math.PI * 2); ctx.fill(); }
    } else if (a.ear === "long"){
      for (const dx of [-32, 32]){ ctx.beginPath(); ctx.ellipse(dx, -104, 19, 56, dx < 0 ? .12 : -.12, 0, Math.PI * 2); ctx.fill(); }
    } else if (a.ear === "round"){
      for (const dx of [-62, 62]){ ctx.beginPath(); ctx.arc(dx, -58, 26, 0, Math.PI * 2); ctx.fill(); }
    }
    // kafa
    ctx.fillStyle = a.fur;
    ctx.beginPath(); ctx.ellipse(0, -10, 84, 76, 0, 0, Math.PI * 2); ctx.fill();
    if (a.id === "kurbaga"){
      ctx.fillStyle = a.fur;
      for (const dx of [-44, 44]){ ctx.beginPath(); ctx.arc(dx, -66, 26, 0, Math.PI * 2); ctx.fill(); }
    }
    // gözler
    const blink = (G.t % 4) > 3.8;
    const eyeY = a.id === "kurbaga" ? -66 : -16, eyeDX = a.id === "kurbaga" ? 44 : 32;
    ctx.fillStyle = "#FFFFFF";
    if (!blink) for (const dx of [-eyeDX, eyeDX]){ ctx.beginPath(); ctx.ellipse(dx, eyeY, 17, 19, 0, 0, Math.PI * 2); ctx.fill(); }
    ctx.fillStyle = "#2A2118";
    for (const dx of [-eyeDX, eyeDX]){
      if (blink){ ctx.fillRect(dx - 13, eyeY - 2, 26, 5); continue; }
      ctx.beginPath(); ctx.arc(dx + (G.done ? 0 : 2), eyeY + 3, 9, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = "#FFFFFF"; ctx.beginPath(); ctx.arc(dx - 2, eyeY - 2, 3.4, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = "#2A2118";
    }
    // burun ve ağız
    ctx.fillStyle = a.nose;
    ctx.beginPath(); ctx.ellipse(0, 18, 15, 11, 0, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = "#2A2118"; ctx.lineWidth = 4; ctx.lineCap = "round";
    ctx.beginPath();
    if (G.done){ ctx.arc(0, 30, 24, .25, Math.PI - .25); }
    else { ctx.arc(0, 56, 24, Math.PI + .3, -.3); }
    ctx.stroke();
    ctx.restore();
  }
  function drawIll(ill){
    if (ill.done) return;
    ctx.save();
    if (ill.id === "camur"){
      ctx.fillStyle = "#7A5230";
      for (const s of ill.spots){
        if (s.r <= 0) continue;
        ctx.beginPath(); ctx.ellipse(s.x, s.y, s.r, s.r * .8, s.x * .01, 0, Math.PI * 2); ctx.fill();
      }
    } else if (ill.id === "diken"){
      ctx.strokeStyle = "#6B4423"; ctx.lineWidth = 6; ctx.lineCap = "round";
      ctx.beginPath(); ctx.moveTo(ill.x - 12, ill.y + 14); ctx.lineTo(ill.x + 10, ill.y - 16); ctx.stroke();
      ctx.fillStyle = "#E5484D";
      ctx.beginPath(); ctx.arc(ill.x - 12, ill.y + 14, 7, 0, Math.PI * 2); ctx.fill();
    } else if (ill.id === "yara"){
      ctx.strokeStyle = "#E5484D"; ctx.lineWidth = 5; ctx.lineCap = "round";
      for (let k = -1; k <= 1; k++){
        ctx.beginPath(); ctx.moveTo(ill.x - 16 + k * 4, ill.y - 14 + k * 12); ctx.lineTo(ill.x + 16 + k * 4, ill.y - 6 + k * 12); ctx.stroke();
      }
    } else if (ill.id === "ates"){
      ctx.fillStyle = "rgba(229,72,77,.45)";
      for (const dx of [-54, 54]){ ctx.beginPath(); ctx.ellipse(CX + dx, CY + 12 + Math.sin(G.t * 2) * 4, 22, 15, 0, 0, Math.PI * 2); ctx.fill(); }
      ctx.fillStyle = "#E5484D"; ctx.font = "700 28px 'Baloo 2', sans-serif"; ctx.textAlign = "center";
      for (let k = 0; k < 3; k++){
        const yy = CY - 120 - ((G.t * 40 + k * 40) % 120);
        ctx.globalAlpha = .5;
        ctx.fillText("≈", CX - 30 + k * 30, yy);
      }
      ctx.globalAlpha = 1;
    } else if (ill.id === "uzgun"){
      ctx.fillStyle = "#6EC1E4";
      for (const dx of [-32, 32]){
        const yy = CY + 10 + ((G.t * 55 + (dx > 0 ? 30 : 0)) % 70);
        ctx.beginPath(); ctx.ellipse(CX + dx, yy, 7, 10, 0, 0, Math.PI * 2); ctx.fill();
      }
    }
    ctx.restore();
  }
  function drawTool(t, x, y, sc){
    ctx.save(); ctx.translate(x, y); ctx.scale(sc, sc);
    if (t.id === "sunger"){
      ctx.fillStyle = "#FFE082"; roundRect(-26, -18, 52, 36, 8); ctx.fill();
      ctx.fillStyle = "#3B82F6"; roundRect(-26, -18, 52, 14, 7); ctx.fill();
      ctx.fillStyle = "rgba(0,0,0,.12)";
      for (const d of [[-12,6],[2,10],[14,4],[-4,0]]){ ctx.beginPath(); ctx.arc(d[0], d[1], 3.4, 0, Math.PI * 2); ctx.fill(); }
    } else if (t.id === "cimbiz"){
      ctx.strokeStyle = "#94A3B8"; ctx.lineWidth = 7; ctx.lineCap = "round";
      ctx.beginPath(); ctx.moveTo(-10, -24); ctx.lineTo(-3, 22); ctx.moveTo(10, -24); ctx.lineTo(3, 22); ctx.stroke();
      ctx.strokeStyle = "#64748B"; ctx.lineWidth = 5;
      ctx.beginPath(); ctx.moveTo(-10, -24); ctx.lineTo(10, -24); ctx.stroke();
    } else if (t.id === "bant"){
      ctx.fillStyle = "#F7C59F"; ctx.rotate(-.5); roundRect(-30, -12, 60, 24, 11); ctx.fill();
      ctx.fillStyle = "#E7B183"; roundRect(-11, -12, 22, 24, 4); ctx.fill();
      ctx.fillStyle = "rgba(0,0,0,.18)";
      for (const d of [[-5,-4],[5,-4],[-5,4],[5,4]]){ ctx.beginPath(); ctx.arc(d[0], d[1], 2, 0, Math.PI * 2); ctx.fill(); }
    } else if (t.id === "termo"){
      ctx.fillStyle = "#E2E8F0"; roundRect(-7, -28, 14, 46, 7); ctx.fill();
      ctx.fillStyle = "#E5484D";
      ctx.beginPath(); ctx.arc(0, 20, 11, 0, Math.PI * 2); ctx.fill();
      roundRect(-4, -4, 8, 24, 4); ctx.fill();
    } else if (t.id === "ilac"){
      ctx.fillStyle = "#A855F7"; roundRect(-16, -8, 32, 34, 8); ctx.fill();
      ctx.fillStyle = "#C4B5FD"; roundRect(-10, -26, 20, 20, 5); ctx.fill();
      ctx.fillStyle = "#FFFFFF"; ctx.fillRect(-9, 4, 18, 5); ctx.fillRect(-3.5, -1.5, 7, 18);
    } else if (t.id === "sevgi"){
      ctx.fillStyle = "#FF6B8A";
      ctx.beginPath();
      ctx.moveTo(0, 22); ctx.bezierCurveTo(-34, 2, -24, -26, 0, -10); ctx.bezierCurveTo(24, -26, 34, 2, 0, 22);
      ctx.fill();
    }
    ctx.restore();
  }
  function draw(){
    const {s, ox, oy, dpr} = view;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.fillStyle = "#DFF1F7"; ctx.fillRect(0, 0, cv.width, cv.height);
    ctx.setTransform(dpr * s, 0, 0, dpr * s, dpr * ox, dpr * oy);
    // oda
    ctx.fillStyle = "#EAF6FB"; ctx.fillRect(-300, -300, W + 600, H + 600);
    ctx.fillStyle = "#CFE7F0"; ctx.fillRect(-300, BED_Y + 120, W + 600, H);
    // duvar süsleri
    ctx.fillStyle = "#FFFFFF";
    roundRect(26, 40, 120, 86, 14); ctx.fill();
    ctx.fillStyle = "#E5484D";
    ctx.fillRect(74, 56, 24, 54); ctx.fillRect(59, 71, 54, 24);
    ctx.strokeStyle = "#B8D8E4"; ctx.lineWidth = 4;
    roundRect(330, 44, 118, 78, 12); ctx.stroke();
    ctx.fillStyle = "#B8D8E4"; ctx.font = "700 42px 'Baloo 2', sans-serif"; ctx.textAlign = "center";
    ctx.fillText("🐾", 389, 96);
    // masa
    ctx.fillStyle = "#9CC9D8"; roundRect(40, BED_Y, W - 80, 120, 22); ctx.fill();
    ctx.fillStyle = "#FFFFFF"; roundRect(54, BED_Y + 10, W - 108, 40, 14); ctx.fill();
    if (!G) return;
    drawAnimal();
    for (const ill of G.ills) drawIll(ill);
    // kalpler ve köpükler
    for (const h of G.hearts){
      ctx.globalAlpha = Math.max(0, h.life);
      ctx.fillStyle = "#FF6B8A";
      ctx.save(); ctx.translate(h.x, h.y); ctx.scale(.5, .5);
      ctx.beginPath(); ctx.moveTo(0, 22); ctx.bezierCurveTo(-34, 2, -24, -26, 0, -10); ctx.bezierCurveTo(24, -26, 34, 2, 0, 22); ctx.fill();
      ctx.restore();
      ctx.globalAlpha = 1;
    }
    for (const b of G.bits){
      ctx.globalAlpha = Math.max(0, b.life);
      ctx.strokeStyle = "#8FD3F4"; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2); ctx.stroke();
      ctx.globalAlpha = 1;
    }
    // söz balonu
    if (G.msg){
      ctx.fillStyle = "rgba(255,255,255,.92)";
      const tw = Math.min(400, 20 + G.msg.length * 11);
      roundRect(CX - tw / 2, 150, tw, 46, 18); ctx.fill();
      ctx.fillStyle = "#27405A"; ctx.font = "700 20px 'Baloo 2', sans-serif"; ctx.textAlign = "center"; ctx.textBaseline = "middle";
      ctx.fillText(G.msg, CX, 174);
      ctx.textBaseline = "alphabetic";
    }
    // alet tepsisi
    ctx.fillStyle = "rgba(255,255,255,.85)";
    roundRect(14, TRAY_Y - 44, W - 28, 88, 22); ctx.fill();
    const need = needTool();
    TOOLS.forEach((t, k) => {
      const p = toolPos(k);
      if (G.drag && G.drag.tool.id === t.id) return;
      if (!G.done && need === t.id){
        ctx.strokeStyle = `rgba(34,197,94,${.5 + .4 * Math.sin(G.t * 4)})`; ctx.lineWidth = 4;
        ctx.beginPath(); ctx.arc(p.x, p.y, 36, 0, Math.PI * 2); ctx.stroke();
      }
      drawTool(t, p.x, p.y, .92);
    });
    if (G.drag) drawTool(G.drag.tool, G.drag.x, G.drag.y, 1.25);
  }

  /* ---------- sayaç ---------- */
  function renderCount(bump){
    $("healed").textContent = save.healed;
    if (bump){ const b = $("shelf-btn"); b.classList.remove("bump"); void b.offsetWidth; b.classList.add("bump"); }
  }
  $("shelf-btn").addEventListener("click", () => {
    audio();
    say(save.healed ? `${save.healed} hayvan iyileştirdin!` : "Hadi ilk hastana bak!");
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
  newPatient();
  requestAnimationFrame(frame);
})();
