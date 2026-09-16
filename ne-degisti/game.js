/* Ne Değişti? — resme bak, göz kırpınca değişeni bul */
(function(){
  "use strict";

  let W = 1000, H = 620;                         // ekran dikeyse 620x1000 olur
  const TOP = 64, BOT = 34;                      // oyun alanı: TOP ile H-BOT arası
  const AVATARS = ["🚀", "🎈", "🌸", "⭐", "🐼", "🦊"];
  const HUES = ["#EF476F", "#118AB2", "#06D6A0", "#F4811E", "#7B5CD6", "#0E8C9E"];
  // seviye: 0 Kolay, 1 Normal, 2 Zor
  const LV = [
    {n:6,  grid:[4, 2], look:5,  find:20},
    {n:10, grid:[4, 3], look:4.5, find:18},
    {n:14, grid:[6, 3], look:4,  find:16}
  ];
  const TYPES = [
    ["gone", "new", "color", "color"],
    ["gone", "new", "color", "size", "move"],
    ["gone", "new", "color", "size", "move", "swap", "shift"]
  ];
  const KINDS = ["yıldız", "kalp", "top", "balon", "çiçek", "balık", "hediye", "bulut"];
  const PAL = [
    {hex:"#EF476F", name:"pembe"},
    {hex:"#F4811E", name:"turuncu"},
    {hex:"#FFC93C", name:"sarı"},
    {hex:"#06D6A0", name:"yeşil"},
    {hex:"#118AB2", name:"mavi"},
    {hex:"#7B5CD6", name:"mor"}
  ];
  const SETTINGS_KEY = "ne-degisti-ayar", SOUND_KEY = "ne-degisti-ses";
  const RM = window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches;
  const TAU = Math.PI*2;

  const $ = id => document.getElementById(id);
  const stage = $("stage"), cv = $("cv"), ctx = cv.getContext("2d");
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const rand = (a, b) => a + Math.random()*(b - a);
  const rnd = n => Math.floor(Math.random()*n);
  const esc = s => String(s).replace(/[&<>"']/g, ch => ({"&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#39;"}[ch]));
  function shuffle(a){ for (let i = a.length - 1; i > 0; i--){ const j = rnd(i + 1), t = a[i]; a[i] = a[j]; a[j] = t; } return a; }

  let settings = {players:[{name:"Enes", lv:1}, {name:"Egemen", lv:0}], rounds:3};
  try {
    const s = JSON.parse(localStorage.getItem(SETTINGS_KEY) || "null");
    if (s && Array.isArray(s.players) && s.players.length >= 1)
      settings = {players:s.players.slice(0, 6).map((p, i) => ({name:String(p.name || "").slice(0, 12) || `Oyuncu ${i + 1}`, lv:clamp(p.lv | 0, 0, 2)})),
                  rounds:[3, 5, 8].includes(s.rounds) ? s.rounds : 3};
  } catch(e) {}
  let soundOn = true;
  try { soundOn = localStorage.getItem(SOUND_KEY) !== "0"; } catch(e) {}
  const saveSettings = () => { try { localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings)); } catch(e) {} };

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
  function noise(dur, freq, vol){
    const a = audio(); if (!a || !soundOn) return;
    const len = Math.floor(a.sampleRate*dur), buf = a.createBuffer(1, len, a.sampleRate), d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = (Math.random()*2 - 1)*Math.pow(1 - i/len, 2);
    const s = a.createBufferSource(); s.buffer = buf;
    const f = a.createBiquadFilter(); f.type = "bandpass"; f.frequency.value = freq;
    const g = a.createGain(); g.gain.value = vol;
    s.connect(f).connect(g).connect(a.destination); s.start();
  }
  const sfx = {
    look(){ tone(660, .1, "triangle", .06, 880); },
    blink(){ noise(.2, 700, .25); tone(320, .18, "sine", .07, 180); },
    tick(){ tone(520, .05, "triangle", .04); },
    good(){ [659.25, 783.99, 1046.5].forEach((f, i) => tone(f, .2, "triangle", .1, null, i*.09)); },
    bad(){ tone(240, .2, "sawtooth", .06, 150); },
    fail(){ tone(300, .3, "sine", .07, 130); noise(.2, 400, .15); },
    win(){ [523.25, 659.25, 783.99, 1046.5, 1318.5].forEach((f, i) => tone(f, .28, "triangle", .12, null, i*.12)); }
  };
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

  // "Sıra Enes'te" / "Sıra Egemen'de"
  function locative(name){
    const low = name.toLocaleLowerCase("tr"), vowels = "aeıioöuü";
    let v = "e";
    for (let i = low.length - 1; i >= 0; i--){ if (vowels.includes(low[i])){ v = low[i]; break; } }
    const hard = "çfhkpsşt".includes(low[low.length - 1]);
    return `${name}'${hard ? "t" : "d"}${"aıou".includes(v) ? "a" : "e"}`;
  }

  /* ---------- sahne ---------- */
  // ekran dikeyse ızgara devrilir: 4x2 yerine 2x4 olur
  const gridFor = lv => H > W ? [LV[lv].grid[1], LV[lv].grid[0]] : LV[lv].grid.slice();

  function makeScene(lv){
    const [cols, rows] = gridFor(lv), n = LV[lv].n;
    const cells = [];
    for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) cells.push({c, r});
    shuffle(cells);
    const sc = {cols, rows, cw:0, ch:0, items:cells.slice(0, n).map((cell, i) => newItem(cell, i)),
                ghosts:[], free:cells.slice(n), lv, nextId:n, portrait:H > W};
    place(sc);
    return sc;
  }
  function newItem(cell, id){
    return {
      id, cell,
      kind:rnd(KINDS.length), col:rnd(PAL.length),
      jx:rand(-.06, .06), jy:rand(-.06, .06), rf:.30*rand(.92, 1.08),
      rot:rand(-.18, .18), x:0, y:0, r:0
    };
  }
  // göz + kayma oranlarından ekrandaki gerçek yeri hesaplar
  function place(sc){
    sc.cw = W/sc.cols; sc.ch = (H - TOP - BOT)/sc.rows;
    sc.items.concat(sc.ghosts).forEach(it => {
      it.x = it.cell.c*sc.cw + sc.cw/2 + it.jx*sc.cw;
      it.y = TOP + it.cell.r*sc.ch + sc.ch/2 + it.jy*sc.ch;
      it.r = Math.min(sc.cw, sc.ch)*it.rf;
    });
  }
  // ekran yön değiştirirse ızgarayı devirip her şeyi yeniden yerleştirir
  function relayout(){
    if (!G || !G.scene) return;
    const sc = G.scene, want = H > W;
    if (sc.portrait !== want){
      const t = sc.cols; sc.cols = sc.rows; sc.rows = t;
      sc.items.concat(sc.ghosts).forEach(it => {
        it.cell = {c:it.cell.r, r:it.cell.c};
        const jx = it.jx; it.jx = it.jy; it.jy = jx;
      });
      sc.free = sc.free.map(c => ({c:c.r, r:c.c}));
      sc.portrait = want;
    }
    place(sc);
  }
  const ghostOf = it => ({cell:{c:it.cell.c, r:it.cell.r}, jx:it.jx, jy:it.jy, rf:it.rf, x:it.x, y:it.y, r:it.r});

  const otherColor = (cur, subtle) => {
    if (subtle) return (cur + (Math.random() < .5 ? 1 : PAL.length - 1)) % PAL.length;
    return (cur + 2 + rnd(PAL.length - 3)) % PAL.length;
  };

  // sahneyi değiştirir; {type, targets, desc} döner
  function applyChange(sc, lv){
    const types = TYPES[lv].filter(t => (t !== "new" && t !== "move") || sc.free.length);
    const type = types[rnd(types.length)];
    const pick = () => sc.items[rnd(sc.items.length)];
    let out;
    if (type === "gone"){
      const i = rnd(sc.items.length), it = sc.items[i];
      sc.items.splice(i, 1); sc.free.push(it.cell);
      const gh = ghostOf(it); sc.ghosts.push(gh);
      out = {type, targets:[gh], desc:`${PAL[it.col].name} ${KINDS[it.kind]} kayboldu`};
    } else if (type === "new"){
      const cell = sc.free.splice(rnd(sc.free.length), 1)[0];
      const it = newItem(cell, sc.nextId++);
      sc.items.push(it);
      out = {type, targets:[it], desc:`${PAL[it.col].name} ${KINDS[it.kind]} geldi`};
    } else if (type === "color"){
      const it = pick(), was = PAL[it.col].name;
      it.col = otherColor(it.col, lv === 2 && Math.random() < .6);
      out = {type, targets:[it], desc:`${was} ${KINDS[it.kind]} ${PAL[it.col].name} oldu`};
    } else if (type === "size"){
      const it = pick(), big = Math.random() < .5;
      it.rf *= big ? 1.5 : .6;
      out = {type, targets:[it], desc:`${PAL[it.col].name} ${KINDS[it.kind]} ${big ? "büyüdü" : "küçüldü"}`};
    } else if (type === "move"){
      const it = pick(), gh = ghostOf(it); sc.ghosts.push(gh);
      const idx = rnd(sc.free.length), cell = sc.free[idx];
      sc.free[idx] = it.cell; it.cell = cell;
      it.jx = rand(-.06, .06); it.jy = rand(-.06, .06);
      out = {type, targets:[it, gh], desc:`${PAL[it.col].name} ${KINDS[it.kind]} yer değiştirdi`};
    } else if (type === "shift"){
      const it = pick(), d = (Math.random() < .5 ? 1 : -1)*.16;
      if (Math.random() < .5) it.jx += d; else it.jy += d;
      out = {type, targets:[it], desc:`${PAL[it.col].name} ${KINDS[it.kind]} biraz kaydı`};
    } else {
      // swap: iki şeyin rengi yer değiştirir
      const a = rnd(sc.items.length);
      let b = rnd(sc.items.length), guard = 0;
      while ((b === a || sc.items[b].col === sc.items[a].col) && guard++ < 40) b = rnd(sc.items.length);
      if (b === a || sc.items[b].col === sc.items[a].col){      // uygun ikili yoksa renk değiştir
        const it = sc.items[a], was = PAL[it.col].name;
        it.col = otherColor(it.col, false);
        out = {type:"color", targets:[it], desc:`${was} ${KINDS[it.kind]} ${PAL[it.col].name} oldu`};
      } else {
        const A = sc.items[a], B = sc.items[b], t = A.col; A.col = B.col; B.col = t;
        out = {type:"swap", targets:[A, B], desc:`${KINDS[A.kind]} ile ${KINDS[B.kind]} renk değiş tokuş etti`};
      }
    }
    place(sc);
    return out;
  }

  // dokunulan yer hedefe yeterince yakın mı? (başka bir şey daha yakınsa sayılmaz)
  function isHit(x, y){
    const ch = G.change;
    if (!ch) return false;
    for (const t of ch.targets){
      const d = Math.hypot(x - t.x, y - t.y);
      if (d > Math.max(t.r*1.35, 40)) continue;
      let closer = false;
      for (const it of G.scene.items){
        if (ch.targets.indexOf(it) >= 0) continue;
        if (Math.hypot(x - it.x, y - it.y) < d - 2){ closer = true; break; }
      }
      if (!closer) return true;
    }
    return false;
  }

  /* ---------- oyun ---------- */
  let G = null, timers = [];
  const later = (s, fn) => timers.push({t:s, fn});
  const clearTimers = () => { timers = []; };

  function startGame(){
    clearTimers();
    G = {
      players:settings.players.map((p, i) => ({
        name:p.name, lv:p.lv, av:AVATARS[i % AVATARS.length], hue:HUES[i % HUES.length],
        score:0, found:0, best:null
      })),
      rounds:settings.rounds, turn:0, round:1,
      state:"ready", scene:null, change:null, t:0, left:0, wrongs:0, marks:[], flash:0
    };
    $("end").hidden = true;
    banner(null);
    renderBoard();
    askReady();
  }

  function askReady(){
    const p = G.players[G.turn];
    G.state = "ready"; G.scene = null; G.change = null;
    role(null); meter(null);
    $("ready-av").textContent = p.av;
    $("ready-av").style.background = p.hue;
    $("ready-name").textContent = `${G.round}. tur · Sıra ${locative(p.name)}`;
    $("ready-note").textContent = "Resme iyi bak. Göz kırpınca bir şey değişecek.";
    $("ready").hidden = false;
    renderBoard();
  }

  function beginLook(){
    const p = G.players[G.turn];
    $("ready").hidden = true;
    G.scene = makeScene(p.lv);
    G.change = null; G.wrongs = 0; G.marks = [];
    G.state = "look"; G.left = LV[p.lv].look; G.max = LV[p.lv].look;
    role("İyi bak!"); meter(1);
    sfx.look(); say("İyi bak");
  }

  function blink(){
    G.state = "blink"; G.left = .7; G.flash = 1;
    role(null); meter(null);
    sfx.blink();
    later(.7, reveal);
  }

  function reveal(){
    const p = G.players[G.turn];
    G.change = applyChange(G.scene, p.lv);
    G.state = "find"; G.t = 0; G.left = LV[p.lv].find; G.max = LV[p.lv].find;
    role("Ne değişti?"); meter(1);
    say("Ne değişti?");
  }

  function tap(x, y){
    if (!G || G.state !== "find") return;
    if (isHit(x, y)) found(x, y);
    else {
      G.wrongs++;
      G.marks.push({x, y, life:.8});
      sfx.bad();
      if (G.wrongs >= 2) fail();
    }
  }

  function found(){
    const p = G.players[G.turn];
    const pts = Math.max(10, Math.round(clamp(100 - G.t*6, 25, 100)) - G.wrongs*25);
    p.score += pts; p.found++;
    if (p.best == null || G.t < p.best) p.best = G.t;
    G.state = "result"; G.gain = pts;
    role(null); meter(null);
    sfx.good(); banner("BULDUN!", "good"); say("Aferin!");
    renderBoard();
    later(RM ? .6 : 1.8, nextTurn);
  }

  function fail(){
    G.state = "result"; G.gain = 0;
    role(null); meter(null);
    sfx.fail(); banner(G.wrongs >= 2 ? "OLMADI" : "SÜRE BİTTİ", "bad");
    say(G.change.desc);
    later(RM ? .8 : 2.4, nextTurn);
  }

  function nextTurn(){
    G.turn++;
    if (G.turn >= G.players.length){
      G.turn = 0; G.round++;
      if (G.round > G.rounds){ endGame(); return; }
    }
    askReady();
  }

  function endGame(){
    G.state = "over";
    role(null); meter(null); banner(null);
    sfx.win();
    const list = G.players.map((p, i) => ({p, i})).sort((a, b) => b.p.score - a.p.score || b.p.found - a.p.found);
    const first = list[0].p;
    $("end-title").textContent = G.players.length > 1 ? `${first.name} kazandı!` : `${first.name}: ${first.score} puan`;
    $("podium").innerHTML = list.map((e, k) =>
      `<li><span>${k + 1}.</span><span class="av" style="background:${e.p.hue}">${e.p.av}</span>` +
      `<span class="nm">${esc(e.p.name)}</span><span class="res">${e.p.score} puan · ${e.p.found}/${G.rounds}</span></li>`).join("");
    $("end").hidden = false;
    $("again").focus();
    say(G.players.length > 1 ? `${first.name} kazandı!` : "Oyun bitti");
  }

  function role(text){ const el = $("role"); el.textContent = text || ""; el.hidden = !text; }
  function meter(v){
    const m = $("meter"), f = $("meter-fill");
    if (v == null){ m.hidden = true; return; }
    m.hidden = false; f.style.width = `${clamp(v, 0, 1)*100}%`;
    f.classList.toggle("low", v < .3);
  }
  let bannerT = null;
  function banner(text, cls){
    const el = $("banner");
    clearTimeout(bannerT);
    if (!text){ el.hidden = true; return; }
    el.textContent = text; el.className = "banner" + (cls ? " " + cls : ""); el.hidden = false;
    bannerT = setTimeout(() => { el.hidden = true; }, 1500);
  }

  /* ---------- güncelleme ---------- */
  function update(dt){
    if (!G) return;
    if (timers.length){
      const due = [];
      for (const t of timers) if ((t.t -= dt) <= 0) due.push(t);
      if (due.length){ timers = timers.filter(t => t.t > 0); due.forEach(t => t.fn()); }
    }
    if (G.flash > 0) G.flash = Math.max(0, G.flash - dt*2.2);
    for (let i = G.marks.length - 1; i >= 0; i--){ G.marks[i].life -= dt; if (G.marks[i].life <= 0) G.marks.splice(i, 1); }
    if (G.state === "look"){
      G.left -= dt; meter(G.left/G.max);
      if (G.left <= 0) blink();
    } else if (G.state === "find"){
      G.t += dt; G.left -= dt; meter(G.left/G.max);
      if (G.left <= 0) fail();
    }
  }

  /* ---------- çizim ---------- */
  function shape(it){
    const c = PAL[it.col].hex, r = it.r;
    ctx.save();
    ctx.translate(it.x, it.y); ctx.rotate(it.rot);
    ctx.fillStyle = c;
    switch (KINDS[it.kind]){
      case "yıldız": {
        ctx.beginPath();
        for (let i = 0; i < 10; i++){
          const a = -Math.PI/2 + i*Math.PI/5, rad = i % 2 ? r*.45 : r;
          i ? ctx.lineTo(Math.cos(a)*rad, Math.sin(a)*rad) : ctx.moveTo(Math.cos(a)*rad, Math.sin(a)*rad);
        }
        ctx.closePath(); ctx.fill();
        break;
      }
      case "kalp": {
        ctx.beginPath();
        ctx.moveTo(0, r*.85);
        ctx.bezierCurveTo(-r*1.25, -r*.1, -r*.55, -r*1.05, 0, -r*.35);
        ctx.bezierCurveTo(r*.55, -r*1.05, r*1.25, -r*.1, 0, r*.85);
        ctx.fill();
        break;
      }
      case "top": {
        ctx.beginPath(); ctx.arc(0, 0, r, 0, TAU); ctx.fill();
        ctx.fillStyle = "rgba(255,255,255,.8)";
        ctx.beginPath(); ctx.ellipse(0, 0, r*.95, r*.3, .4, 0, TAU); ctx.fill();
        ctx.fillStyle = "rgba(255,255,255,.45)";
        ctx.beginPath(); ctx.arc(-r*.35, -r*.35, r*.22, 0, TAU); ctx.fill();
        break;
      }
      case "balon": {
        ctx.strokeStyle = "rgba(60,50,40,.45)"; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(0, r*.95); ctx.quadraticCurveTo(r*.25, r*1.3, 0, r*1.6); ctx.stroke();
        ctx.beginPath(); ctx.ellipse(0, 0, r*.78, r*.95, 0, 0, TAU); ctx.fill();
        ctx.beginPath(); ctx.moveTo(-r*.14, r*.92); ctx.lineTo(r*.14, r*.92); ctx.lineTo(0, r*1.12); ctx.closePath(); ctx.fill();
        ctx.fillStyle = "rgba(255,255,255,.45)";
        ctx.beginPath(); ctx.ellipse(-r*.26, -r*.3, r*.16, r*.26, .5, 0, TAU); ctx.fill();
        break;
      }
      case "çiçek": {
        for (let i = 0; i < 6; i++){
          const a = i*TAU/6;
          ctx.beginPath(); ctx.ellipse(Math.cos(a)*r*.55, Math.sin(a)*r*.55, r*.42, r*.3, a, 0, TAU); ctx.fill();
        }
        ctx.fillStyle = "#FFF3C4";
        ctx.beginPath(); ctx.arc(0, 0, r*.36, 0, TAU); ctx.fill();
        break;
      }
      case "balık": {
        ctx.beginPath(); ctx.moveTo(-r, 0); ctx.lineTo(-r*.45, -r*.45); ctx.lineTo(-r*.45, r*.45); ctx.closePath(); ctx.fill();
        ctx.beginPath(); ctx.ellipse(r*.12, 0, r*.85, r*.55, 0, 0, TAU); ctx.fill();
        ctx.fillStyle = "#fff"; ctx.beginPath(); ctx.arc(r*.55, -r*.12, r*.16, 0, TAU); ctx.fill();
        ctx.fillStyle = "#2A2038"; ctx.beginPath(); ctx.arc(r*.6, -r*.12, r*.08, 0, TAU); ctx.fill();
        break;
      }
      case "hediye": {
        ctx.beginPath(); ctx.roundRect(-r*.8, -r*.7, r*1.6, r*1.5, r*.18); ctx.fill();
        ctx.fillStyle = "rgba(255,255,255,.75)";
        ctx.fillRect(-r*.16, -r*.7, r*.32, r*1.5);
        ctx.fillRect(-r*.8, -r*.2, r*1.6, r*.3);
        ctx.beginPath(); ctx.arc(-r*.22, -r*.78, r*.24, 0, TAU); ctx.arc(r*.22, -r*.78, r*.24, 0, TAU); ctx.fill();
        break;
      }
      default: { // bulut
        ctx.beginPath();
        ctx.arc(-r*.45, r*.12, r*.45, 0, TAU);
        ctx.arc(0, -r*.2, r*.58, 0, TAU);
        ctx.arc(r*.5, r*.1, r*.42, 0, TAU);
        ctx.fill();
        ctx.beginPath(); ctx.roundRect(-r*.9, r*.05, r*1.8, r*.5, r*.25); ctx.fill();
        ctx.fillStyle = "rgba(255,255,255,.5)";
        ctx.beginPath(); ctx.arc(-r*.1, -r*.3, r*.3, 0, TAU); ctx.fill();
      }
    }
    ctx.restore();
  }

  function drawBack(){
    const x0 = -view.ox/view.s - 2, y0 = -view.oy/view.s - 2;
    const w = W + 2*view.ox/view.s + 4, h = H + 2*view.oy/view.s + 4;
    ctx.fillStyle = "#FFF6E9"; ctx.fillRect(x0, y0, w, h);
    ctx.fillStyle = "rgba(42,32,56,.05)";
    for (let y = y0 - (y0 % 42) ; y < y0 + h; y += 42)
      for (let x = x0 - (x0 % 42); x < x0 + w; x += 42)
        { ctx.beginPath(); ctx.arc(x, y, 3, 0, TAU); ctx.fill(); }
  }

  function draw(){
    const d = view.dpr;
    ctx.setTransform(d, 0, 0, d, 0, 0);
    ctx.clearRect(0, 0, cv.width, cv.height);
    ctx.save(); ctx.translate(view.ox, view.oy); ctx.scale(view.s, view.s);
    drawBack();
    if (G && G.scene && G.state !== "ready"){
      if (G.state === "blink"){
        ctx.fillStyle = "#2B3560";
        ctx.fillRect(-view.ox/view.s - 2, -view.oy/view.s - 2, W + 2*view.ox/view.s + 4, H + 2*view.oy/view.s + 4);
        ctx.fillStyle = "#FFC93C";
        ctx.font = "700 150px Fredoka, sans-serif"; ctx.textAlign = "center"; ctx.textBaseline = "middle";
        ctx.fillText("?", W/2, TOP + (H - TOP - BOT)/2);
        ctx.textAlign = "left"; ctx.textBaseline = "alphabetic";
      } else {
        G.scene.items.forEach(shape);
        if (G.state === "result" && G.change){
          ctx.strokeStyle = G.gain ? "#06D6A0" : "#EF476F"; ctx.lineWidth = 7;
          G.change.targets.forEach(t => {
            ctx.beginPath(); ctx.arc(t.x, t.y, Math.max(t.r*1.3, 34), 0, TAU); ctx.stroke();
          });
        }
        if (G.flash > 0){
          ctx.fillStyle = `rgba(255,255,255,${G.flash*.65})`;
          ctx.fillRect(-view.ox/view.s - 2, -view.oy/view.s - 2, W + 2*view.ox/view.s + 4, H + 2*view.oy/view.s + 4);
        }
        ctx.strokeStyle = "#EF476F"; ctx.lineWidth = 6; ctx.lineCap = "round";
        G.marks.forEach(m => {
          ctx.globalAlpha = clamp(m.life/.8, 0, 1);
          ctx.beginPath();
          ctx.moveTo(m.x - 14, m.y - 14); ctx.lineTo(m.x + 14, m.y + 14);
          ctx.moveTo(m.x + 14, m.y - 14); ctx.lineTo(m.x - 14, m.y + 14);
          ctx.stroke();
        });
        ctx.globalAlpha = 1; ctx.lineCap = "butt";
      }
    }
    ctx.restore();
  }

  /* ---------- tabela ---------- */
  function renderBoard(){
    $("board").innerHTML = G.players.map((p, i) =>
      `<div class="pl${G.state !== "over" && i === G.turn ? " turn" : ""}">
        <span class="av" style="background:${p.hue}">${p.av}</span>
        <span class="nm">${esc(p.name)}<small>${["Kolay", "Normal", "Zor"][p.lv]}</small></span>
        <b class="sc">${p.score}</b>
      </div>`).join("");
  }

  /* ---------- giriş ---------- */
  const view = {s:1, ox:0, oy:0, dpr:1};
  function resize(){
    const r = stage.getBoundingClientRect();
    view.dpr = Math.min(window.devicePixelRatio || 1, 2);
    cv.width = Math.round(r.width*view.dpr); cv.height = Math.round(r.height*view.dpr);
    if (r.width > 0 && r.height > 0){        // dar ve uzun ekranda saha dikey olur
      const portrait = r.height > r.width*1.06;
      W = portrait ? 620 : 1000; H = portrait ? 1000 : 620;
      relayout();
    }
    view.s = Math.min(r.width/W, r.height/H);
    view.ox = (r.width - W*view.s)/2; view.oy = (r.height - H*view.s)/2;
  }
  cv.addEventListener("pointerdown", e => {
    e.preventDefault(); audio();
    const r = cv.getBoundingClientRect();
    tap((e.clientX - r.left - view.ox)/view.s, (e.clientY - r.top - view.oy)/view.s);
  });
  $("ready-go").addEventListener("click", () => { audio(); beginLook(); });
  window.addEventListener("keydown", e => {
    if (!$("ready").hidden && (e.key === " " || e.key === "Enter")){ e.preventDefault(); $("ready-go").click(); }
    else if (!$("end").hidden && e.key === "Enter"){ e.preventDefault(); $("again").click(); }
  });

  /* ---------- ayarlar ---------- */
  function drawSetupRows(){
    $("p-rows").innerHTML = settings.players.map((p, i) => `
      <div class="p-row">
        <span class="av" style="background:${HUES[i % HUES.length]}">${AVATARS[i % AVATARS.length]}</span>
        <input type="text" id="nm-${i}" value="${esc(p.name)}" maxlength="12" aria-label="${i + 1}. oyuncunun adı">
        <div class="seg" role="radiogroup" aria-label="${i + 1}. oyuncunun seviyesi">
          <label><input type="radio" name="lv-${i}" value="0" ${p.lv === 0 ? "checked" : ""}><span>Kolay</span></label>
          <label><input type="radio" name="lv-${i}" value="1" ${p.lv === 1 ? "checked" : ""}><span>Normal</span></label>
          <label><input type="radio" name="lv-${i}" value="2" ${p.lv === 2 ? "checked" : ""}><span>Zor</span></label>
        </div>
      </div>`).join("");
    $("add-player").disabled = settings.players.length >= 6;
    $("remove-player").disabled = settings.players.length <= 1;
  }
  function readSetupRows(){
    settings.players.forEach((p, i) => {
      const nm = $("nm-" + i); if (nm) p.name = nm.value.trim().slice(0, 12) || `Oyuncu ${i + 1}`;
      const lv = document.querySelector(`input[name="lv-${i}"]:checked`); if (lv) p.lv = +lv.value;
    });
  }
  $("add-player").addEventListener("click", () => {
    if (settings.players.length >= 6) return;
    readSetupRows();
    settings.players.push({name:`Oyuncu ${settings.players.length + 1}`, lv:1});
    drawSetupRows();
  });
  $("remove-player").addEventListener("click", () => {
    if (settings.players.length <= 1) return;
    readSetupRows(); settings.players.pop(); drawSetupRows();
  });
  function openSetup(){
    drawSetupRows();
    const r = document.querySelector(`input[name="rounds"][value="${settings.rounds}"]`);
    if (r) r.checked = true;
    $("ready").hidden = true; $("end").hidden = true;
    $("setup").hidden = false;
  }
  $("open-setup").addEventListener("click", openSetup);
  $("end-setup").addEventListener("click", openSetup);
  $("again").addEventListener("click", () => { audio(); startGame(); });
  $("setup-form").addEventListener("submit", e => {
    e.preventDefault(); audio();
    readSetupRows();
    const r = document.querySelector('input[name="rounds"]:checked');
    settings.rounds = r ? +r.value : 3;
    saveSettings();
    $("setup").hidden = true;
    startGame();
  });

  /* ---------- döngü ---------- */
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
  document.addEventListener("visibilitychange", () => { last = performance.now(); if (document.hidden && canSpeak) speechSynthesis.cancel(); });
  if ("ResizeObserver" in window) new ResizeObserver(resize).observe(stage);
  else window.addEventListener("resize", resize);
  resize();
  drawSetupRows();
  startGame();
  $("ready").hidden = true;
  $("setup").hidden = false;
  requestAnimationFrame(frame);
})();
