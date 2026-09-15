/* Renk Kazanı — Egemen için renk karıştırma oyunu */
(function(){
  "use strict";

  // Renk anahtarı: kavanozların baş harfleri her zaman R, Y, B, W sırasıyla (ör. "RY" = kırmızı + sarı)
  const ORDER = "RYBW";
  const COLORS = {
    R:    {hex:"#E53935", name:"kırmızı",         dat:"kırmızıya",         acc:"kırmızıyı"},
    Y:    {hex:"#FDD835", name:"sarı",            dat:"sarıya",            acc:"sarıyı"},
    B:    {hex:"#1E88E5", name:"mavi",            dat:"maviye",            acc:"maviyi"},
    W:    {hex:"#FFFFFF", name:"beyaz",           dat:"beyaza",            acc:"beyazı"},
    RY:   {hex:"#FB8C00", name:"turuncu",         dat:"turuncuya"},
    YB:   {hex:"#43A047", name:"yeşil",           dat:"yeşile"},
    RB:   {hex:"#8E24AA", name:"mor",             dat:"mora"},
    RW:   {hex:"#F48FB1", name:"pembe",           dat:"pembeye"},
    YW:   {hex:"#FFF59D", name:"açık sarı",       dat:"açık sarıya"},
    BW:   {hex:"#81D4FA", name:"açık mavi",       dat:"açık maviye"},
    RYB:  {hex:"#795548", name:"kahverengi",      dat:"kahverengiye"},
    RYW:  {hex:"#FFB74D", name:"açık turuncu",    dat:"açık turuncuya"},
    YBW:  {hex:"#A5D6A7", name:"açık yeşil",      dat:"açık yeşile"},
    RBW:  {hex:"#CE93D8", name:"lila",            dat:"lilaya"},
    RYBW: {hex:"#A1887F", name:"açık kahverengi", dat:"açık kahverengiye"}
  };
  // Her bölüm üç ya da dört resim. İlk bölümde tek kavanoz yeter, sonra karışımlar gelir.
  const STAGES = [
    {colors:["R", "Y", "B"],   pots:"RYB",  recipe:true},
    {colors:["RY", "YB", "RB"], pots:"RYB",  recipe:true},
    {colors:["RW", "BW", "RYB"], pots:"RYBW", recipe:true},
    {pick:4, from:["RY", "YB", "RB", "RW", "BW", "RYB"], pots:"RYBW", recipe:false}
  ];
  const MAX_DROPS = 6;
  const SOUND_KEY = "renk-kazani-ses";
  const RAINBOW = ["#E53935", "#D98A00", "#1E88E5", "#2E7D32", "#8E24AA"];
  const INK = "#3B3040";
  const RM = window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches;
  const FONT = '"Baloo 2", "Comic Sans MS", sans-serif';

  const $ = id => document.getElementById(id);
  const stage = $("stage"), cv = $("cv"), ctx = cv.getContext("2d");
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const rand = (a, b) => a + Math.random()*(b - a);
  const cap = s => s.charAt(0).toLocaleUpperCase("tr") + s.slice(1);
  const TAU = Math.PI*2;
  const keyOf = set => ORDER.split("").filter(k => set.has(k)).join("");
  const hexRgb = h => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16));
  const shuffle = a => { for (let i = a.length - 1; i > 0; i--){ const j = Math.random()*(i + 1) | 0; [a[i], a[j]] = [a[j], a[i]]; } return a; };

  let soundOn = true;
  try { soundOn = localStorage.getItem(SOUND_KEY) !== "0"; } catch(e) {}

  document.querySelectorAll("[data-rainbow]").forEach(el => {
    const text = el.textContent.trim(); el.textContent = ""; el.setAttribute("aria-label", text);
    let k = 0;
    for (const ch of text){
      const s = document.createElement("span"); s.textContent = ch; s.setAttribute("aria-hidden", "true");
      if (ch.trim()) s.style.color = RAINBOW[k++ % RAINBOW.length];
      el.appendChild(s);
    }
  });

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
    g.gain.setValueAtTime(.0001, n); g.gain.exponentialRampToValueAtTime(vol || .1, n + .015); g.gain.exponentialRampToValueAtTime(.0001, n + dur);
    o.connect(g).connect(a.destination); o.start(n); o.stop(n + dur + .05);
  }
  function splash(delay, vol){
    const a = audio(); if (!a || !soundOn) return;
    const len = Math.floor(a.sampleRate*.22), buf = a.createBuffer(1, len, a.sampleRate), d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = (Math.random()*2 - 1)*Math.pow(1 - i/len, 3);
    const src = a.createBufferSource(); src.buffer = buf;
    const f = a.createBiquadFilter(); f.type = "bandpass"; f.frequency.value = 1400; f.Q.value = .8;
    const g = a.createGain(); g.gain.value = vol || .35;
    src.connect(f).connect(g).connect(a.destination); src.start(a.currentTime + (delay || 0));
  }
  const sfx = {
    pick(){ tone(520, .12, "triangle", .1, 760); },
    plop(){ tone(900, .16, "sine", .16, 220); splash(.05, .25); },
    bubble(){ tone(rand(500, 900), .08, "sine", .08, rand(1000, 1500)); },
    drain(){ for (let i = 0; i < 5; i++) tone(320 - i*30, .12, "sine", .12, 180 - i*15, i*.11); },
    oops(){ tone(392, .2, "sine", .12, 330); tone(330, .3, "sine", .12, 262, .2); },
    fill(){ tone(392, .9, "triangle", .08, 784); },
    yay(){ [523.25, 659.25, 783.99, 1046.5].forEach((f, i) => tone(f, .25, "triangle", .14, null, i*.09)); },
    splat(){ splash(0, .4); tone(260, .12, "sine", .12, 120); },
    stage(){ [659.25, 783.99, 1046.5, 1318.5, 1567.98].forEach((f, i) => tone(f, .28, "triangle", .13, null, i*.1)); },
    party(){ [523.25, 659.25, 783.99, 1046.5, 783.99, 1046.5, 1318.5].forEach((f, i) => tone(f, .32, "triangle", .14, null, i*.13)); }
  };
  const canSpeak = "speechSynthesis" in window;
  let trVoice = null;
  function pickVoice(){ trVoice = speechSynthesis.getVoices().find(v => /^tr(-|_|$)/i.test(v.lang)) || null; }
  if (canSpeak){ pickVoice(); if (speechSynthesis.addEventListener) speechSynthesis.addEventListener("voiceschanged", pickVoice); }
  function say(text, interrupt){
    if (!canSpeak || !soundOn || !trVoice) return;
    if (interrupt) speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text); u.voice = trVoice; u.lang = trVoice.lang; u.rate = .95; u.pitch = 1.15;
    speechSynthesis.speak(u);
  }
  function renderSound(){
    $("ic-on").hidden = !soundOn; $("ic-off").hidden = soundOn;
    $("sound").setAttribute("aria-label", soundOn ? "Sesi kapat" : "Sesi aç");
    $("sound").setAttribute("aria-pressed", String(soundOn));
  }
  $("sound").addEventListener("click", () => {
    soundOn = !soundOn;
    try { localStorage.setItem(SOUND_KEY, soundOn ? "1" : "0"); } catch(e) {}
    if (!soundOn && canSpeak) speechSynthesis.cancel();
    renderSound();
  });
  renderSound();

  /* ---------- resimler (−100..100 kutusunda) ---------- */
  // body: boyanan bölge, under: gövdenin arkasında kalan sabit renkli parçalar, over: üstteki çizgiler
  function ell(x, y, rx, ry, rot){ ctx.moveTo(x + rx*Math.cos(rot || 0), y + rx*Math.sin(rot || 0)); ctx.ellipse(x, y, rx, ry, rot || 0, 0, TAU); }
  function circ(x, y, r){ ctx.moveTo(x + r, y); ctx.arc(x, y, r, 0, TAU); }
  function dot(x, y, r, c){ ctx.fillStyle = c; ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fill(); }
  function line(pts, w, c){ ctx.strokeStyle = c || INK; ctx.lineWidth = w; ctx.beginPath(); pts.forEach((p, i) => i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1])); ctx.stroke(); }
  function eyes(x, y, gap, r){ dot(x - gap, y, r, INK); dot(x + gap, y, r, INK); dot(x - gap + r*.35, y - r*.35, r*.35, "#fff"); dot(x + gap + r*.35, y - r*.35, r*.35, "#fff"); }
  function smile(x, y, w){ ctx.strokeStyle = INK; ctx.lineWidth = 5; ctx.beginPath(); ctx.arc(x, y - w*.4, w*.7, .25*Math.PI, .75*Math.PI); ctx.stroke(); }
  function shine(x, y, r, a0, a1){ ctx.strokeStyle = "rgba(255,255,255,.75)"; ctx.lineWidth = 7; ctx.beginPath(); ctx.arc(x, y, r, a0, a1); ctx.stroke(); }

  const OBJECTS = [
    {id:"elma", color:"R", nom:"elma", acc:"elmayı",
      body(){ ctx.moveTo(0, -52); ctx.bezierCurveTo(40, -86, 96, -60, 88, 5); ctx.bezierCurveTo(82, 66, 40, 96, 0, 80); ctx.bezierCurveTo(-40, 96, -82, 66, -88, 5); ctx.bezierCurveTo(-96, -60, -40, -86, 0, -52); },
      over(){ line([[0, -50], [6, -92]], 8, "#6D4C41"); ctx.fillStyle = "#43A047"; ctx.beginPath(); ell(34, -80, 26, 12, -.45); ctx.fill(); ctx.strokeStyle = INK; ctx.lineWidth = 4; ctx.stroke(); shine(-10, 5, 58, 3.5, 4.2); }},
    {id:"araba", color:"R", nom:"araba", acc:"arabayı",
      body(){ ctx.roundRect(-94, -12, 188, 58, 20); ctx.moveTo(-54, -10); ctx.lineTo(-32, -58); ctx.lineTo(34, -58); ctx.lineTo(62, -10); ctx.closePath(); },
      over(){
        ctx.fillStyle = "#D6F1FF"; ctx.strokeStyle = INK; ctx.lineWidth = 4;
        ctx.beginPath(); ctx.moveTo(-42, -16); ctx.lineTo(-27, -48); ctx.lineTo(-4, -48); ctx.lineTo(-4, -16); ctx.closePath(); ctx.fill(); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(6, -16); ctx.lineTo(6, -48); ctx.lineTo(28, -48); ctx.lineTo(48, -16); ctx.closePath(); ctx.fill(); ctx.stroke();
        for (const x of [-50, 50]){ dot(x, 48, 24, INK); dot(x, 48, 10, "#B0BEC5"); }
        dot(86, 8, 7, "#FFE082");
      }},
    {id:"gunes", color:"Y", nom:"güneş", acc:"güneşi",
      body(){ circ(0, 0, 56); for (let i = 0; i < 10; i++){ const a = i*TAU/10, b = .2; ctx.moveTo(Math.cos(a - b)*52, Math.sin(a - b)*52); ctx.lineTo(Math.cos(a)*95, Math.sin(a)*95); ctx.lineTo(Math.cos(a + b)*52, Math.sin(a + b)*52); ctx.closePath(); } },
      over(){ eyes(0, -8, 20, 7); smile(0, 14, 22); }},
    {id:"civciv", color:"Y", nom:"civciv", acc:"civcivi",
      under(){ line([[-22, 84], [-22, 96], [-34, 98]], 6, "#FB8C00"); line([[22, 84], [22, 96], [34, 98]], 6, "#FB8C00"); },
      body(){ circ(0, 30, 60); circ(8, -42, 42); },
      over(){ eyes(22, -52, 0, 7); ctx.fillStyle = "#FB8C00"; ctx.beginPath(); ctx.moveTo(44, -44); ctx.lineTo(72, -36); ctx.lineTo(44, -28); ctx.closePath(); ctx.fill(); ctx.strokeStyle = INK; ctx.lineWidth = 4; ctx.stroke();
        ctx.lineWidth = 5; ctx.beginPath(); ctx.arc(-12, 30, 32, .1*Math.PI, .9*Math.PI); ctx.stroke(); }},
    {id:"balik", color:"B", nom:"balık", acc:"balığı",
      body(){ ell(-14, 0, 72, 46); ctx.moveTo(48, 0); ctx.lineTo(96, -42); ctx.lineTo(96, 42); ctx.closePath(); },
      over(){ eyes(-50, -10, 0, 9); smile(-66, 18, 12); ctx.strokeStyle = INK; ctx.lineWidth = 5; ctx.beginPath(); ctx.arc(-10, 0, 26, -.4*Math.PI, .4*Math.PI); ctx.stroke();
        ctx.strokeStyle = "#90CAF9"; ctx.lineWidth = 4; ctx.beginPath(); circ(-40, -72, 9); circ(-58, -88, 6); ctx.stroke(); }},
    {id:"balon", color:"B", nom:"balon", acc:"balonu",
      under(){ ctx.strokeStyle = INK; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(0, 62); ctx.bezierCurveTo(-18, 76, 18, 84, 0, 98); ctx.stroke(); },
      body(){ ell(0, -18, 62, 76); ctx.moveTo(-10, 66); ctx.lineTo(0, 52); ctx.lineTo(10, 66); ctx.closePath(); },
      over(){ shine(0, -18, 46, 3.6, 4.3); }},
    {id:"havuc", color:"RY", nom:"havuç", acc:"havucu",
      under(){ ctx.fillStyle = "#43A047"; ctx.strokeStyle = INK; ctx.lineWidth = 4; for (const [x, r] of [[-16, -.35], [0, 0], [16, .35]]){ ctx.beginPath(); ell(x, -72, 11, 28, r); ctx.fill(); ctx.stroke(); } },
      body(){ ctx.moveTo(-44, -46); ctx.quadraticCurveTo(-30, 40, 0, 96); ctx.quadraticCurveTo(30, 40, 44, -46); ctx.quadraticCurveTo(0, -64, -44, -46); },
      over(){ line([[-30, -10], [-12, -6]], 5); line([[28, 20], [10, 24]], 5); line([[-18, 48], [-4, 50]], 5); }},
    {id:"portakal", color:"RY", nom:"portakal", acc:"portakalı",
      body(){ circ(0, 12, 80); },
      over(){ ctx.fillStyle = "#43A047"; ctx.beginPath(); ell(22, -72, 26, 12, -.4); ctx.fill(); ctx.strokeStyle = INK; ctx.lineWidth = 4; ctx.stroke(); dot(0, -66, 6, "#6D4C41");
        for (const [x, y] of [[-30, 0], [20, 30], [-10, 50], [40, -10], [-44, 40]]) dot(x, y, 3.5, "rgba(59,48,64,.35)"); shine(0, 12, 60, 3.5, 4.2); }},
    {id:"yaprak", color:"YB", nom:"yaprak", acc:"yaprağı",
      body(){ ctx.moveTo(0, -94); ctx.bezierCurveTo(78, -60, 80, 44, 0, 84); ctx.bezierCurveTo(-80, 44, -78, -60, 0, -94); },
      over(){ line([[0, -80], [0, 98]], 6); line([[0, -30], [-36, -52]], 4); line([[0, -30], [36, -52]], 4); line([[0, 14], [-44, -10]], 4); line([[0, 14], [44, -10]], 4); line([[0, 52], [-34, 32]], 4); line([[0, 52], [34, 32]], 4); }},
    {id:"kurbaga", color:"YB", nom:"kurbağa", acc:"kurbağayı",
      body(){ ell(0, 28, 88, 60); circ(-46, -34, 30); circ(46, -34, 30); },
      over(){ for (const x of [-46, 46]){ dot(x, -36, 17, "#fff"); ctx.strokeStyle = INK; ctx.lineWidth = 3; ctx.beginPath(); circ(x, -36, 17); ctx.stroke(); dot(x + 3, -34, 8, INK); }
        ctx.strokeStyle = INK; ctx.lineWidth = 6; ctx.beginPath(); ctx.arc(0, 8, 46, .2*Math.PI, .8*Math.PI); ctx.stroke(); dot(-58, 36, 9, "rgba(244,143,177,.8)"); dot(58, 36, 9, "rgba(244,143,177,.8)"); }},
    {id:"uzum", color:"RB", nom:"üzüm", acc:"üzümü",
      body(){ for (const [x, y] of [[-54, -38], [-18, -38], [18, -38], [54, -38], [-36, 0], [0, 0], [36, 0], [-18, 38], [18, 38], [0, 74]]) circ(x, y, 23); },
      over(){ line([[0, -60], [10, -94]], 8, "#6D4C41"); ctx.fillStyle = "#43A047"; ctx.beginPath(); ell(-26, -76, 28, 13, .35); ctx.fill(); ctx.strokeStyle = INK; ctx.lineWidth = 4; ctx.stroke(); }},
    {id:"patlican", color:"RB", nom:"patlıcan", acc:"patlıcanı",
      body(){ ell(12, 18, 50, 84, -.55); },
      over(){ ctx.fillStyle = "#43A047"; ctx.strokeStyle = INK; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(-70, -84); ctx.lineTo(-44, -66); ctx.lineTo(-58, -40); ctx.lineTo(-30, -48); ctx.lineTo(-12, -24); ctx.lineTo(-18, -54); ctx.lineTo(8, -60); ctx.lineTo(-34, -72); ctx.closePath(); ctx.fill(); ctx.stroke(); shine(12, 18, 50, 3.3, 3.9); }},
    {id:"domuz", color:"RW", nom:"domuzcuk", acc:"domuzcuğu",
      body(){ circ(0, 14, 74); ctx.moveTo(-62, -22); ctx.lineTo(-74, -86); ctx.lineTo(-18, -58); ctx.closePath(); ctx.moveTo(62, -22); ctx.lineTo(74, -86); ctx.lineTo(18, -58); ctx.closePath(); },
      over(){ eyes(0, -12, 28, 8); ctx.fillStyle = "rgba(255,255,255,.35)"; ctx.strokeStyle = INK; ctx.lineWidth = 5; ctx.beginPath(); ell(0, 32, 30, 20); ctx.fill(); ctx.stroke(); dot(-10, 32, 5, INK); dot(10, 32, 5, INK); }},
    {id:"kalp", color:"RW", nom:"kalp", acc:"kalbi",
      body(){ ctx.moveTo(0, 88); ctx.bezierCurveTo(-116, 12, -74, -98, 0, -44); ctx.bezierCurveTo(74, -98, 116, 12, 0, 88); },
      over(){ shine(-38, -26, 30, 3.4, 4.4); }},
    {id:"dondurma", color:"BW", nom:"dondurma", acc:"dondurmayı",
      under(){ ctx.fillStyle = "#E0A96D"; ctx.strokeStyle = INK; ctx.lineWidth = 5; ctx.beginPath(); ctx.moveTo(-56, 0); ctx.lineTo(56, 0); ctx.lineTo(0, 98); ctx.closePath(); ctx.fill(); ctx.stroke();
        ctx.save(); ctx.clip(); line([[-40, 0], [20, 98]], 3, "rgba(59,48,64,.45)"); line([[0, 0], [50, 70]], 3, "rgba(59,48,64,.45)"); line([[40, 0], [-20, 98]], 3, "rgba(59,48,64,.45)"); line([[0, 0], [-50, 70]], 3, "rgba(59,48,64,.45)"); ctx.restore(); },
      body(){ circ(0, -38, 52); circ(-42, -2, 26); circ(-14, 4, 26); circ(14, 4, 26); circ(42, -2, 26); },
      over(){ dot(0, -96, 13, "#E53935"); shine(0, -38, 38, 3.5, 4.3); }},
    {id:"bulut", color:"BW", nom:"bulut", acc:"bulutu",
      body(){ circ(-48, 18, 40); circ(0, -12, 54); circ(50, 16, 42); ctx.roundRect(-88, 18, 178, 46, 23); },
      over(){ eyes(0, 12, 20, 7); smile(0, 34, 18); dot(-36, 30, 8, "rgba(244,143,177,.8)"); dot(36, 30, 8, "rgba(244,143,177,.8)"); }},
    {id:"ayi", color:"RYB", nom:"ayıcık", acc:"ayıcığı",
      body(){ circ(0, 16, 72); circ(-56, -46, 28); circ(56, -46, 28); },
      over(){ dot(-56, -46, 13, "rgba(255,255,255,.35)"); dot(56, -46, 13, "rgba(255,255,255,.35)"); eyes(0, -2, 28, 8);
        ctx.fillStyle = "#F1D9B5"; ctx.strokeStyle = INK; ctx.lineWidth = 4; ctx.beginPath(); ell(0, 40, 32, 24); ctx.fill(); ctx.stroke(); ctx.fillStyle = INK; ctx.beginPath(); ell(0, 32, 11, 8); ctx.fill(); line([[0, 38], [0, 50]], 4); }},
    {id:"kurabiye", color:"RYB", nom:"kurabiye", acc:"kurabiyeyi",
      body(){ circ(0, 0, 84); },
      over(){ for (const [x, y, r] of [[-36, -34, 11], [28, -44, 9], [42, 16, 12], [-10, 8, 10], [-44, 38, 9], [14, 52, 11], [60, -14, 7]]){ ctx.fillStyle = "#3E2723"; ctx.beginPath(); ell(x, y, r, r*.75, x*.03); ctx.fill(); } }}
  ];

  function objPath(o){ ctx.beginPath(); o.body(); }
  // progress: 0 = boyanmamış, 1 = tamamen boyalı (boya aşağıdan yukarı dolar)
  function drawObject(o, x, y, s, hex, progress, bounce){
    ctx.save(); ctx.translate(x, y); ctx.scale(s*(bounce || 1), s/(bounce || 1));
    ctx.lineJoin = "round"; ctx.lineCap = "round";
    if (o.under) o.under();
    objPath(o); ctx.strokeStyle = INK; ctx.lineWidth = 12; ctx.stroke();
    ctx.fillStyle = "#FFFFFF"; ctx.fill();
    if (progress > 0){
      ctx.save(); ctx.beginPath(); ctx.rect(-120, 110 - 230*progress, 240, 240); ctx.clip();
      objPath(o); ctx.fillStyle = hex; ctx.fill(); ctx.restore();
    }
    if (o.over) o.over();
    ctx.restore();
  }

  /* ---------- düzen ---------- */
  const view = {s:1, ox:0, oy:0, dpr:1, portrait:false};
  let W = 1000, H = 620, lay = null;
  function layout(tall){
    if (view.portrait){
      // uzun telefon ekranında boşluk kalmasın: sahne 1000 ile 1240 arası uzar
      const ex = Math.round(clamp(620*tall - 1000, 0, 240));
      W = 620; H = 1000 + ex;
      lay = {tableY:800 + ex, thumbY:44 + ex*.15, thumbX:i => 310 + i*80, thumbCenter:true, thumbS:.27,
        card:{x:30, y:88 + ex*.2, w:560, h:340 + ex*.2}, obj:{x:175, y:258 + ex*.3, s:1}, recipe:{x:440, y:258 + ex*.3, s:.88},
        kazan:{x:310, y:660 + ex*.8, R:140}, potY:895 + ex, potXs:n => n === 3 ? [140, 310, 480] : [86, 236, 386, 536]};
    } else {
      W = 1000; H = 620;
      lay = {tableY:470, thumbY:44, thumbX:i => 440 + i*80, thumbCenter:false, thumbS:.27,
        card:{x:30, y:62, w:330, h:396}, obj:{x:195, y:220, s:.95}, recipe:{x:195, y:398, s:.95},
        kazan:{x:670, y:335, R:135}, potY:556, potXs:n => n === 3 ? [400, 600, 800] : [310, 490, 670, 850]};
    }
  }
  function resize(){
    const r = stage.getBoundingClientRect();
    view.dpr = Math.min(window.devicePixelRatio || 1, 2);
    cv.width = Math.round(r.width*view.dpr); cv.height = Math.round(r.height*view.dpr);
    const portrait = r.height > r.width*1.05;
    view.portrait = portrait; layout(r.height/Math.max(1, r.width)); placePots();
    view.s = Math.min(r.width/W, r.height/H);
    view.ox = (r.width - W*view.s)/2; view.oy = (r.height - H*view.s)/2;
  }
  function toLogical(e){
    const r = cv.getBoundingClientRect();
    return {x:(e.clientX - r.left - view.ox)/view.s, y:(e.clientY - r.top - view.oy)/view.s};
  }

  /* ---------- oyun durumu ---------- */
  let mode = "orders";           // orders | free
  let phase = "intro";           // intro | play | party
  let time = 0, lock = false, idleT = 0, remindT = 0;
  let stageNo = 0, orders = [], idx = 0, wrongs = 0, showRecipe = true, hint = "";
  let potKeys = "RYB", pots = [];
  let fillP = 0, fillTarget = 0, objPop = 1, swatchBounce = 0;
  let tasks = [], flights = [], parts = [], splats = [];
  let lastSaid = "";
  const kz = {set:new Set(), drops:0, level:0, rgb:[255, 255, 255], shake:0, stir:0, glow:0};

  function later(sec, fn){ tasks.push({t:sec, fn}); }
  function clearTasks(){ tasks = []; flights = []; }

  function placePots(){
    const xs = lay.potXs(potKeys.length);
    const old = pots;
    pots = potKeys.split("").map((k, i) => ({k, x:xs[i], y:lay.potY, tilt:(old.find(p => p.k === k) || {}).tilt || 0, pop:0}));
  }
  function setPots(keys){ if (keys !== potKeys){ potKeys = keys; placePots(); pots.forEach(p => p.pop = RM ? 0 : .5); } }

  function mixKey(){ return keyOf(kz.set); }
  function mixHex(){ const k = mixKey(); return k ? COLORS[k].hex : "#FFFFFF"; }
  function recipeText(key){
    const ks = key.split(""), names = ks.map(k => COLORS[k].name);
    names[names.length - 1] = COLORS[ks[ks.length - 1]].acc;
    return (names.length > 2 ? names.slice(0, -1).join(", ") + " ve " + names[names.length - 1] : names.join(" ve ")) + " karıştır.";
  }

  function buildStage(){
    const st = STAGES[stageNo];
    const colors = st.pick ? shuffle(st.from.slice()).slice(0, st.pick) : st.colors.slice();
    const used = new Set();
    orders = colors.map(c => {
      const pool = OBJECTS.filter(o => o.color === c && !used.has(o.id));
      const o = pool[Math.random()*pool.length | 0]; used.add(o.id);
      return {o, key:c, done:false};
    });
    idx = 0;
    setPots(st.pots);
  }

  function orderLine(){
    const ord = orders[idx], t = COLORS[ord.key];
    let s = `${cap(ord.o.acc)} ${t.dat} boyayalım!`;
    if (ord.key.length > 1) s += showRecipe ? " " + cap(recipeText(ord.key)) : " Hangi renkleri karıştıralım?";
    return s;
  }
  function showOrder(){
    const st = STAGES[stageNo];
    wrongs = 0; hint = ""; showRecipe = st.recipe; fillP = 0; fillTarget = 0; objPop = RM ? 1 : 0;
    idleT = 0; remindT = 0;
    lock = true;
    later(.5, () => { lock = false; lastSaid = orderLine(); say(lastSaid, true); });
  }

  function startOrders(){
    mode = "orders"; phase = "play"; clearTasks(); resetKazan(true); splats = [];
    stageNo = 0; buildStage(); showOrder();
  }
  function startFree(){
    mode = "free"; phase = "play"; clearTasks(); resetKazan(true); hint = "";
    setPots("RYBW"); lock = false;
    say("Boyaları karıştır, sonra kâğıda dokun!", true);
  }
  function resetKazan(instant){
    kz.set = new Set(); kz.drops = 0;
    if (instant){ kz.level = 0; kz.rgb = [255, 255, 255]; }
  }

  /* ---------- eylemler ---------- */
  function pour(i){
    const p = pots[i];
    if (!p || phase !== "play" || lock) return;
    idleT = 0;
    if (kz.drops >= MAX_DROPS){ kz.shake = .3; sfx.oops(); return; }
    if (mode === "orders") lock = true;
    p.tilt = 1; sfx.pick();
    const K = lay.kazan, hex = COLORS[p.k].hex;
    flights.push({x0:p.x, y0:p.y - 60, x1:K.x + rand(-20, 20), y1:K.y - K.R*.55, lift:120, t:0, dur:.45, r:17, c:hex,
      done(){
        kz.drops++; kz.set.add(p.k); sfx.plop();
        burst(K.x, K.y - K.R*.5, hex, RM ? 3 : 9, 180);
        if (mode === "orders") judge(p.k); else freeMix();
      }});
  }

  let lastMix = "";
  function freeMix(){
    const k = mixKey();
    if (k !== lastMix){ lastMix = k; say(COLORS[k].name, true); if (k.length > 1){ kz.glow = 1; sfx.bubble(); } }
  }

  function judge(k){
    const ord = orders[idx], need = new Set(ord.key.split(""));
    const extra = [...kz.set].some(c => !need.has(c));
    if (extra){
      wrongs++; kz.shake = .7; sfx.oops();
      const m = COLORS[mixKey()];
      say(`Bu ${m.name} oldu. Bize ${COLORS[ord.key].name} lazım. Kazanı boşaltalım.`, true);
      later(1.6, () => {
        drain();
        later(.8, () => {
          showRecipe = true; hint = ord.key; lock = false; idleT = 0;
          if (ord.key.length > 1) say(cap(recipeText(ord.key)), false);
          else say(`${cap(COLORS[ord.key].name)} kavanoza dokun.`, false);
        });
      });
      return;
    }
    if (kz.set.size === need.size){ success(); return; }
    say(COLORS[k].name, true);
    lock = false;
  }

  function success(){
    const ord = orders[idx], t = COLORS[ord.key], K = lay.kazan, O = lay.obj;
    hint = "";
    if (ord.key.length > 1) say(`${cap(t.name)} oldu!`, true); else say(`${cap(t.name)}!`, true);
    kz.stir = 1.1; kz.glow = 1;
    for (let i = 0; i < 6; i++) later(i*.17, sfx.bubble);
    later(1.1, () => {
      const n = RM ? 3 : 9;
      for (let i = 0; i < n; i++){
        later(i*.06, () => flights.push({x0:K.x + rand(-25, 25), y0:K.y - K.R*.6, x1:O.x + rand(-40, 40), y1:O.y + rand(-30, 50), lift:170, t:0, dur:.55, r:rand(10, 16), c:t.hex,
          done(){ if (!RM) burst(this.x1, this.y1, t.hex, 3, 120); }}));
      }
      resetKazan(false);
    });
    later(1.55, () => { fillTarget = 1; sfx.fill(); });
    later(2.7, () => {
      ord.done = true; sfx.yay(); swatchBounce = 1;
      stars(O.x, O.y, RM ? 6 : 18);
      say(`Aferin! ${cap(ord.o.nom)} ${t.name} oldu.`, false);
    });
    later(4.4, () => {
      idx++;
      if (idx < orders.length){ showOrder(); return; }
      if (stageNo < STAGES.length - 1){
        sfx.stage(); say(stageNo === STAGES.length - 2 ? "Süper! Şimdi tarif yok, sen bul!" : "Süper! Yeni renkler geliyor.", false);
        for (let i = 0; i < orders.length; i++) later(i*.15, () => { const x = thumbPos(i); stars(x.x, x.y, RM ? 3 : 8); });
        later(2.2, () => { stageNo++; buildStage(); showOrder(); });
      } else {
        later(.4, party);
      }
    });
  }

  function party(){
    phase = "party"; sfx.party(); stars(W/2, H/2, RM ? 10 : 40);
    say("Aferin Egemen! Bütün resimleri boyadın!", true);
    $("party").hidden = false; $("again").focus();
  }

  function drain(){
    if (kz.drops === 0) return;
    resetKazan(false); sfx.drain(); lastMix = "";
  }

  function stamp(x, y){
    if (kz.drops === 0){ kz.shake = .4; sfx.oops(); if (lastSaid !== "önce"){ say("Önce kazana boya dök.", true); lastSaid = "önce"; } return; }
    lastSaid = "";
    const pts = [], n = 9, r = rand(26, 40);
    for (let i = 0; i < n; i++) pts.push(r*rand(.75, 1.2));
    splats.push({x, y, c:mixHex(), pts, rot:rand(0, TAU), drops:Array.from({length:RM ? 0 : 4}, () => [rand(0, TAU), rand(r*1.3, r*1.9), rand(4, 8)])});
    if (splats.length > 160) splats.shift();
    sfx.splat();
  }

  function tap(x, y){
    if (phase !== "play") return;
    for (let i = 0; i < pots.length; i++){
      const p = pots[i];
      if (Math.hypot(x - p.x, y - (p.y - 8)) < 74){ pour(i); return; }
    }
    const K = lay.kazan;
    if (Math.hypot(x - K.x, y - K.y) < K.R + 10){
      if (!lock && kz.drops > 0){ drain(); idleT = 0; }
      return;
    }
    const c = lay.card;
    if (mode === "free" && x > c.x && x < c.x + c.w && y > c.y && y < c.y + c.h){
      const e = eraserPos();
      if (Math.hypot(x - e.x, y - e.y) < 30){ if (splats.length){ splats = []; sfx.drain(); } return; }
      stamp(clamp(x, c.x + 30, c.x + c.w - 30), clamp(y, c.y + 30, c.y + c.h - 30));
      return;
    }
    if (mode === "orders" && !lock && x > c.x && x < c.x + c.w && y > c.y && y < c.y + c.h){
      swatchBounce = 1; say(orderLine(), true); idleT = 0;
    }
  }
  const eraserPos = () => ({x:lay.card.x + lay.card.w - 32, y:lay.card.y + 32});

  cv.addEventListener("pointerdown", e => { e.preventDefault(); audio(); const p = toLogical(e); tap(p.x, p.y); });
  window.addEventListener("keydown", e => {
    if (phase !== "play" || e.ctrlKey || e.metaKey || e.altKey) return;
    const n = "1234".indexOf(e.key);
    if (n >= 0 && n < pots.length){ audio(); pour(n); e.preventDefault(); }
    else if ((e.key === "Backspace" || e.key === "Delete" || e.key === "0") && !lock){ drain(); e.preventDefault(); }
  });

  function hideOverlays(){ $("intro").hidden = true; $("party").hidden = true; $("menu").hidden = false; }
  $("play").addEventListener("click", () => { audio(); hideOverlays(); startOrders(); });
  $("free").addEventListener("click", () => { audio(); hideOverlays(); startFree(); });
  $("again").addEventListener("click", () => { audio(); hideOverlays(); startOrders(); });
  $("menu").addEventListener("click", () => {
    phase = "intro"; clearTasks(); lock = false; hint = "";
    if (canSpeak) speechSynthesis.cancel();
    $("party").hidden = true; $("intro").hidden = false; $("menu").hidden = true; $("play").focus();
  });
  document.addEventListener("visibilitychange", () => { if (document.hidden && canSpeak) speechSynthesis.cancel(); });

  /* ---------- efektler ---------- */
  function burst(x, y, c, n, sp){
    for (let i = 0; i < n; i++){ const a = rand(-Math.PI*.95, -Math.PI*.05), v = rand(sp*.4, sp); parts.push({x, y, vx:Math.cos(a)*v, vy:Math.sin(a)*v, life:.6, max:.6, r:rand(4, 8), c, g:600}); }
  }
  function stars(x, y, n){
    for (let i = 0; i < n; i++){ const a = rand(0, TAU), v = rand(120, 380); parts.push({x, y, vx:Math.cos(a)*v, vy:Math.sin(a)*v - 120, life:1.1, max:1.1, r:rand(9, 16), c:RAINBOW[i % RAINBOW.length], g:380, star:true, rot:rand(0, TAU)}); }
  }

  /* ---------- güncelle ---------- */
  function update(dt){
    time += dt;
    for (let i = tasks.length - 1; i >= 0; i--){
      const tk = tasks[i]; tk.t -= dt;
      if (tk.t <= 0){ tasks.splice(i, 1); tk.fn(); }
    }
    for (let i = flights.length - 1; i >= 0; i--){
      const f = flights[i]; f.t += dt/f.dur;
      if (f.t >= 1){ flights.splice(i, 1); f.done && f.done(); }
    }
    for (let i = parts.length - 1; i >= 0; i--){
      const p = parts[i]; p.life -= dt; p.vy += p.g*dt; p.x += p.vx*dt; p.y += p.vy*dt; if (p.rot !== undefined) p.rot += dt*4;
      if (p.life <= 0) parts.splice(i, 1);
    }
    for (const p of pots){ p.tilt = Math.max(0, p.tilt - dt*2.2); p.pop = Math.max(0, p.pop - dt); }

    const want = kz.drops ? .3 + .1*Math.min(kz.drops, MAX_DROPS) : 0;
    kz.level += (want - kz.level)*Math.min(1, dt*(want < kz.level ? 3 : 6));
    const target = kz.drops ? hexRgb(mixHex()) : kz.rgb;
    for (let j = 0; j < 3; j++) kz.rgb[j] += (target[j] - kz.rgb[j])*Math.min(1, dt*4);
    kz.shake = Math.max(0, kz.shake - dt); kz.stir = Math.max(0, kz.stir - dt); kz.glow = Math.max(0, kz.glow - dt*1.2);

    fillP += (fillTarget - fillP)*Math.min(1, dt*3.2);
    if (fillTarget === 1 && fillP > .995) fillP = 1;
    objPop = Math.min(1, objPop + dt*2.5);
    swatchBounce = Math.max(0, swatchBounce - dt*1.8);

    if (phase === "play" && mode === "orders" && !lock){
      idleT += dt;
      if (idleT > 9){ idleT = 0; remindT++; swatchBounce = 1; if (remindT >= 2 && !hint) hint = orders[idx].key; say(orderLine(), true); }
    }
  }

  /* ---------- çizim ---------- */
  function rr(x, y, w, h, r){ ctx.beginPath(); ctx.roundRect(x, y, w, h, r); }
  const DECOR = Array.from({length:14}, (_, i) => ({x:Math.random(), y:Math.random(), r:rand(8, 22), c:["#FFCDD2", "#FFF59D", "#BBDEFB", "#C8E6C9", "#E1BEE7"][i % 5]}));

  function drawRoom(){
    // sahne kutusunun dışında kalan boşluklar da oda ve masa ile dolsun
    const x0 = -view.ox/view.s - 2, x1 = W + view.ox/view.s + 2, y0 = -view.oy/view.s - 2, y1 = H + view.oy/view.s + 2;
    const g = ctx.createLinearGradient(0, y0, 0, lay.tableY);
    g.addColorStop(0, "#FFF4E6"); g.addColorStop(1, "#FFE6C7");
    ctx.fillStyle = g; ctx.fillRect(x0, y0, x1 - x0, lay.tableY - y0);
    for (const d of DECOR) dot(d.x*W, d.y*(lay.tableY - 40) + 10, d.r, d.c);
    ctx.fillStyle = "#E0A871"; ctx.fillRect(x0, lay.tableY, x1 - x0, 16);
    ctx.fillStyle = "#C98B55"; ctx.fillRect(x0, lay.tableY + 16, x1 - x0, y1 - lay.tableY - 16);
    ctx.strokeStyle = "rgba(120,70,30,.18)"; ctx.lineWidth = 3;
    for (let k = 1; k < 4; k++){ const y = lay.tableY + 16 + k*(H - lay.tableY - 16)/4; ctx.beginPath(); ctx.moveTo(x0, y); ctx.bezierCurveTo(W*.3, y - 6, W*.6, y + 6, x1, y); ctx.stroke(); }
  }

  function drawCard(){
    const c = lay.card;
    ctx.fillStyle = "rgba(120,70,30,.14)"; rr(c.x + 6, c.y + 10, c.w, c.h, 24); ctx.fill();
    ctx.fillStyle = "#FFFFFF"; rr(c.x, c.y, c.w, c.h, 24); ctx.fill();
    ctx.fillStyle = "rgba(255,213,79,.7)";
    for (const [tx, r] of [[c.x + 40, -.35], [c.x + c.w - 40, .35]]){ ctx.save(); ctx.translate(tx, c.y + 4); ctx.rotate(r); ctx.fillRect(-32, -11, 64, 22); ctx.restore(); }
  }

  function drop(x, y, r, c, q){
    ctx.save(); ctx.translate(x, y);
    ctx.beginPath(); ctx.moveTo(0, -r*1.5); ctx.bezierCurveTo(r*.9, -r*.5, r*1.05, r*.2, r*1.05, r*.35); ctx.arc(0, r*.35, r*1.05, 0, Math.PI); ctx.bezierCurveTo(-r*1.05, r*.2, -r*.9, -r*.5, 0, -r*1.5); ctx.closePath();
    ctx.fillStyle = c; ctx.fill(); ctx.strokeStyle = INK; ctx.lineWidth = 4; ctx.stroke();
    if (q){ ctx.fillStyle = INK; ctx.font = `800 ${Math.round(r*1.4)}px ${FONT}`; ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.fillText("?", 0, r*.35); }
    ctx.restore();
  }
  function blob(x, y, r, c, rot){
    ctx.beginPath();
    for (let i = 0; i <= 16; i++){ const a = rot + i*TAU/16, rr2 = r*(i % 2 ? .82 : 1.05); const px = x + Math.cos(a)*rr2, py = y + Math.sin(a)*rr2; i ? ctx.lineTo(px, py) : ctx.moveTo(px, py); }
    ctx.closePath(); ctx.fillStyle = c; ctx.fill(); ctx.strokeStyle = INK; ctx.lineWidth = 4; ctx.stroke();
  }

  function drawRecipe(){
    const ord = orders[idx]; if (!ord) return;
    const R = lay.recipe, s = R.s, ks = ord.key.split(""), hex = COLORS[ord.key].hex;
    const b = 1 + Math.sin(swatchBounce*Math.PI*3)*swatchBounce*.12;
    ctx.save(); ctx.translate(R.x, R.y); ctx.scale(s, s);
    if (ks.length === 1){ ctx.scale(b, b); blob(0, 0, 38, hex, time*.2); ctx.restore(); return; }
    const w = 44*ks.length + 30*(ks.length - 1) + 34 + 70;
    let x = -w/2;
    ks.forEach((k, i) => {
      if (showRecipe) drop(x + 22, 4, 17, COLORS[k].hex); else drop(x + 22, 4, 17, "#EFE7DA", true);
      x += 44;
      if (i < ks.length - 1){ ctx.strokeStyle = INK; ctx.lineWidth = 5; line([[x + 7, 8], [x + 23, 8]], 5); line([[x + 15, 0], [x + 15, 16]], 5); x += 30; }
    });
    line([[x + 7, 2], [x + 27, 2]], 5); line([[x + 7, 14], [x + 27, 14]], 5); x += 34;
    ctx.save(); ctx.translate(x + 35, 8); ctx.scale(b, b); blob(0, 0, 32, hex, time*.2); ctx.restore();
    ctx.restore();
  }

  function thumbPos(i){
    const n = orders.length;
    const x = lay.thumbCenter ? 310 + (i - (n - 1)/2)*80 : lay.thumbX(i);
    return {x, y:lay.thumbY};
  }
  function drawThumbs(){
    orders.forEach((ord, i) => {
      const p = thumbPos(i);
      ctx.fillStyle = i === idx && !ord.done ? "rgba(255,255,255,.95)" : "rgba(255,255,255,.55)";
      ctx.beginPath(); ctx.arc(p.x, p.y, 34, 0, TAU); ctx.fill();
      if (i === idx && !ord.done){ ctx.strokeStyle = "#FFB300"; ctx.lineWidth = 4; ctx.stroke(); }
      drawObject(ord.o, p.x, p.y, lay.thumbS, COLORS[ord.key].hex, ord.done ? 1 : 0);
    });
  }

  function drawKazan(){
    const K = lay.kazan, R = K.R;
    const sx = kz.shake > 0 && !RM ? Math.sin(time*50)*kz.shake*10 : 0;
    const x = K.x + sx, y = K.y, cutY = y - R*.7, half = R*Math.sqrt(1 - .49);
    const hex = `rgb(${kz.rgb.map(v => Math.round(v)).join(",")})`;
    ctx.fillStyle = "rgba(120,70,30,.2)"; ctx.beginPath(); ctx.ellipse(x, y + R + 2, R*.8, 12, 0, 0, TAU); ctx.fill();
    // cam gövde
    ctx.save();
    ctx.beginPath(); ctx.arc(x, y, R, Math.PI*1.5 + Math.asin(half/R), Math.PI*1.5 - Math.asin(half/R) + TAU); ctx.closePath();
    ctx.fillStyle = "rgba(255,255,255,.55)"; ctx.fill();
    ctx.clip();
    if (kz.level > .01){
      const top = y + R - kz.level*R*1.62, amp = RM ? 0 : 5 + kz.stir*8;
      ctx.beginPath(); ctx.moveTo(x - R, top);
      for (let px = -R; px <= R; px += 10) ctx.lineTo(x + px, top + Math.sin(px*.05 + time*(3 + kz.stir*10))*amp);
      ctx.lineTo(x + R, y + R); ctx.lineTo(x - R, y + R); ctx.closePath();
      ctx.fillStyle = hex; ctx.fill();
      ctx.fillStyle = "rgba(255,255,255,.35)";
      ctx.beginPath(); for (let k = 0; k < 5; k++){ const bx = x + Math.sin(k*2.3 + 1)*R*.5, by = y + R - 6 - ((time*(30 + k*9) + k*40) % Math.max(1, kz.level*R*1.45)); circ(bx, by, 4 + k % 3*2); } ctx.fill();
    }
    ctx.restore();
    // kaşık
    if (kz.stir > 0){
      const a = Math.sin(time*9)*.5;
      ctx.save(); ctx.translate(x, cutY + 20); ctx.rotate(a);
      ctx.fillStyle = "#D7A15F"; ctx.strokeStyle = INK; ctx.lineWidth = 4;
      rr(-7, -110, 14, 120, 7); ctx.fill(); ctx.stroke();
      ctx.beginPath(); ctx.ellipse(0, 20, 18, 26, 0, 0, TAU); ctx.fill(); ctx.stroke();
      ctx.restore();
    }
    // parıltı
    if (kz.glow > 0){
      ctx.strokeStyle = `rgba(255,255,255,${kz.glow*.9})`; ctx.lineWidth = 12;
      ctx.beginPath(); ctx.arc(x, y, R + 12 + (1 - kz.glow)*20, 0, TAU); ctx.stroke();
    }
    // cam kenar ve ağız
    ctx.strokeStyle = INK; ctx.lineWidth = 6;
    ctx.beginPath(); ctx.arc(x, y, R, Math.PI*1.5 + Math.asin(half/R), Math.PI*1.5 - Math.asin(half/R) + TAU); ctx.stroke();
    ctx.fillStyle = "#B3E5FC"; rr(x - half - 16, cutY - 12, half*2 + 32, 24, 12); ctx.fill(); ctx.stroke();
    ctx.strokeStyle = "rgba(255,255,255,.85)"; ctx.lineWidth = 9; ctx.lineCap = "round";
    ctx.beginPath(); ctx.arc(x, y, R*.8, Math.PI*1.05, Math.PI*1.35); ctx.stroke();
    ctx.beginPath(); ctx.arc(x, y, R*.8, Math.PI*.72, Math.PI*.8); ctx.stroke();
    ctx.lineCap = "butt";
  }

  function drawPot(p){
    const hex = COLORS[p.k].hex;
    const pop = p.pop > 0 ? 1 + Math.sin((1 - p.pop/.5)*Math.PI)*.15 : 1;
    const t = p.tilt, lean = (lay.kazan.x - p.x) >= 0 ? 1 : -1;
    const hint2 = hint && hint.includes(p.k) && phase === "play";
    ctx.save();
    ctx.translate(p.x, p.y - Math.sin(t*Math.PI)*30);
    if (hint2){
      const pulse = RM ? .6 : .5 + .5*Math.sin(time*6);
      ctx.fillStyle = `rgba(255,236,120,${.35 + pulse*.4})`; ctx.beginPath(); ctx.arc(0, -4, 72 + pulse*8, 0, TAU); ctx.fill();
    }
    ctx.rotate(Math.sin(t*Math.PI)*.45*lean);
    ctx.scale(pop, pop);
    ctx.fillStyle = "rgba(0,0,0,.15)"; ctx.beginPath(); ctx.ellipse(0, 52, 50, 10, 0, 0, TAU); ctx.fill();
    ctx.strokeStyle = INK; ctx.lineWidth = 5; ctx.lineJoin = "round";
    rr(-48, -26, 96, 76, 20); ctx.fillStyle = hex; ctx.fill(); ctx.stroke();
    ctx.fillStyle = "#ECEFF1"; rr(-54, -42, 108, 22, 10); ctx.fill(); ctx.stroke();
    // taşan boya
    ctx.fillStyle = hex; ctx.beginPath();
    ctx.moveTo(-40, -40); ctx.bezierCurveTo(-36, -62, 36, -62, 40, -40); ctx.lineTo(40, -26); ctx.bezierCurveTo(36, -14, 28, -14, 26, -26); ctx.lineTo(-18, -26); ctx.bezierCurveTo(-20, -8, -32, -8, -32, -26); ctx.closePath();
    ctx.fill(); ctx.stroke();
    // yüz
    for (const ex of [-17, 17]){ dot(ex, 6, 10, "#fff"); ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(ex, 6, 10, 0, TAU); ctx.stroke(); dot(ex + 2, 8, 5, INK); }
    ctx.lineWidth = 4; ctx.beginPath(); ctx.arc(0, 22, 11, .15*Math.PI, .85*Math.PI); ctx.stroke();
    ctx.restore();
  }

  function drawOrder(){
    const ord = orders[idx]; if (!ord) return;
    const O = lay.obj, e = objPop;
    const pop = e < 1 ? .3 + .7*(1 - Math.pow(1 - e, 3)) + Math.sin(e*Math.PI)*.12 : 1;
    const hex = COLORS[ord.key].hex;
    const b = ord.done && swatchBounce > 0 ? 1 + Math.sin(swatchBounce*Math.PI*4)*swatchBounce*.08 : 1;
    drawObject(ord.o, O.x, O.y, O.s*pop, hex, ord.done ? 1 : fillP, b);
    drawRecipe();
  }

  function drawPaper(){
    const c = lay.card;
    ctx.save(); rr(c.x, c.y, c.w, c.h, 24); ctx.clip();
    for (const s of splats){
      ctx.fillStyle = s.c;
      ctx.beginPath();
      s.pts.forEach((r, i) => { const a = s.rot + i*TAU/s.pts.length, px = s.x + Math.cos(a)*r, py = s.y + Math.sin(a)*r; i ? ctx.lineTo(px, py) : ctx.moveTo(px, py); });
      ctx.closePath(); ctx.fill();
      ctx.strokeStyle = "rgba(59,48,64,.25)"; ctx.lineWidth = 2; ctx.stroke();
      for (const d of s.drops) dot(s.x + Math.cos(d[0])*d[1], s.y + Math.sin(d[0])*d[1], d[2], s.c);
    }
    ctx.restore();
    if (splats.length){
      const e = eraserPos();
      dot(e.x, e.y, 22, "#FFCDD2"); ctx.strokeStyle = INK; ctx.lineWidth = 4; ctx.beginPath(); ctx.arc(e.x, e.y, 22, 0, TAU); ctx.stroke();
      line([[e.x - 8, e.y - 8], [e.x + 8, e.y + 8]], 5); line([[e.x + 8, e.y - 8], [e.x - 8, e.y + 8]], 5);
    } else {
      // boş kâğıtta parmak işareti
      const c2 = {x:c.x + c.w/2, y:c.y + c.h/2 + Math.sin(time*3)*6};
      ctx.globalAlpha = .35; dot(c2.x, c2.y, 30, kz.drops ? mixHex() : "#E0D6C8"); ctx.globalAlpha = 1;
      ctx.strokeStyle = "rgba(59,48,64,.35)"; ctx.lineWidth = 4; ctx.setLineDash([10, 10]); ctx.beginPath(); ctx.arc(c2.x, c2.y, 44, 0, TAU); ctx.stroke(); ctx.setLineDash([]);
    }
  }

  function draw(){
    const d = view.dpr;
    ctx.setTransform(d, 0, 0, d, 0, 0);
    ctx.clearRect(0, 0, cv.width, cv.height);
    ctx.fillStyle = "#FFE6C7"; ctx.fillRect(0, 0, cv.width/d, cv.height/d);
    ctx.save(); ctx.translate(view.ox, view.oy); ctx.scale(view.s, view.s);
    drawRoom();
    drawCard();
    if (phase !== "intro"){
      if (mode === "orders"){ drawOrder(); drawThumbs(); } else drawPaper();
    }
    drawKazan();
    for (const p of pots) drawPot(p);
    for (const f of flights){
      const t = f.t, x = f.x0 + (f.x1 - f.x0)*t, y = f.y0 + (f.y1 - f.y0)*t - Math.sin(t*Math.PI)*f.lift;
      drop(x, y, f.r, f.c);
    }
    for (const p of parts){
      ctx.globalAlpha = clamp(p.life/p.max*1.6, 0, 1); ctx.fillStyle = p.c;
      if (p.star){
        ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.rot); ctx.beginPath();
        for (let i = 0; i < 10; i++){ const a = -Math.PI/2 + i*Math.PI/5, r = i % 2 ? p.r*.45 : p.r; i ? ctx.lineTo(Math.cos(a)*r, Math.sin(a)*r) : ctx.moveTo(Math.cos(a)*r, Math.sin(a)*r); }
        ctx.closePath(); ctx.fill(); ctx.restore();
      } else { ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, TAU); ctx.fill(); }
    }
    ctx.globalAlpha = 1;
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
  if ("ResizeObserver" in window) new ResizeObserver(resize).observe(stage);
  else window.addEventListener("resize", resize);
  resize();
  requestAnimationFrame(frame);
})();
