(() => {
  "use strict";
  const $ = id => document.getElementById(id);

  /* ---------- ölçüler ---------- */
  const W = 480, H = 720;
  const WIN = {x: 34, y: 40, w: 214, h: 200};          // pencere
  const KID = {x: 344, y: 272};                         // kafanın ortası
  const DROP = {x: 236, y: 190, w: 220, h: 360};        // kıyafetin bırakılabileceği alan
  const SAVE_KEY = "ne-giysem";
  const cap = s => s.charAt(0).toLocaleUpperCase("tr") + s.slice(1);

  const WEATHERS = [
    {id: "gunes",  nm: "güneşli", needs: ["gozluk", "sapka", "sort"], extra: []},
    {id: "yagmur", nm: "yağmurlu", needs: ["yagmurluk", "semsiye", "cizme"], extra: []},
    {id: "kar",    nm: "karlı", needs: ["mont", "bere", "atki", "eldiven"], extra: ["cizme"]}
  ];
  const ITEMS = [
    {id: "gozluk", nm: "güneş gözlüğü", acc: "güneş gözlüğünü", ok: "Gözlerimizi güneşten korur.",
      no: {yagmur: "Yağmurda güneş gözlüğüne gerek yok!", kar: "Karlı havada güneş gözlüğüne gerek yok, bere lazım!"}},
    {id: "sapka", nm: "şapka", acc: "şapkayı", ok: "Güneşte başımız yanmaz.",
      no: {yagmur: "Bu hasır şapka yağmurda ıslanır!", kar: "Bu şapka kulaklarımızı ısıtmaz, bere lazım!"}},
    {id: "sort", nm: "şort", acc: "şortu", ok: "Sıcakta serin tutar.",
      no: {yagmur: "Yağmurda şort giyersek bacaklarımız ıslanır!", kar: "Karlı havada şort giyersek üşürüz!"}},
    {id: "yagmurluk", nm: "yağmurluk", acc: "yağmurluğu", ok: "Yağmurda ıslanmayız.",
      no: {gunes: "Güneşli havada yağmurluk çok sıcak olur!", kar: "Yağmurluk karda ısıtmaz, mont lazım!"}},
    {id: "semsiye", nm: "şemsiye", acc: "şemsiyeyi", ok: "Yağmur üstümüze yağmaz.",
      no: {gunes: "Güneş varken şemsiyeye gerek yok!", kar: "Karda şemsiye yerine mont ve bere giyelim!"}},
    {id: "cizme", nm: "çizme", acc: "çizmeyi", ok: "Su birikintilerine basabiliriz.", okKar: "Ayaklarımız kardan ıslanmaz.",
      no: {gunes: "Güneşli havada çizme çok sıcak olur!"}},
    {id: "mont", nm: "mont", acc: "montu", ok: "Bizi sıcacık tutar.",
      no: {gunes: "Güneşli havada mont giyersek terleriz!", yagmur: "Yağmurda yağmurluk daha iyi, mont ıslanır!"}},
    {id: "bere", nm: "bere", acc: "bereyi", ok: "Kulaklarımız üşümez.",
      no: {gunes: "Güneşli havada bere çok sıcak olur!", yagmur: "Yağmurda bere ıslanır, yağmurluğun başlığı var!"}},
    {id: "atki", nm: "atkı", acc: "atkıyı", ok: "Boynumuz üşümez.",
      no: {gunes: "Güneşli havada atkı çok sıcak olur!", yagmur: "Yağmurda atkıya gerek yok!"}},
    {id: "eldiven", nm: "eldiven", acc: "eldiveni", ok: "Ellerimiz üşümez.",
      no: {gunes: "Güneşli havada eldiven çok sıcak olur!", yagmur: "Yağmurda eldivene gerek yok!"}}
  ];
  const ITEM = Object.fromEntries(ITEMS.map(it => [it.id, it]));
  const TRAY = ITEMS.map((it, i) => ({id: it.id, x: 50 + (i % 5) * 95, y: 608 + Math.floor(i / 5) * 72}));

  let save = {outings: 0, last: -1};
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
  const sPick = () => tone(600, 700, "sine", .07, .12);
  const sWear = () => [660, 880].forEach((f, k) => tone(f, f * 1.1, "triangle", .14, .15, k * .07));
  const sNo = () => tone(260, 170, "triangle", .3, .14);
  const sOut = () => [523, 659, 784, 1047, 1319].forEach((f, k) => tone(f, f, "triangle", .25, .16, k * .1));

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
  function renderCount(bump){
    $("out-n").textContent = save.outings;
    $("out-btn").setAttribute("aria-label", `${save.outings} kez dışarı çıktın`);
    if (bump){ const b = $("out-btn"); b.classList.remove("bump"); void b.offsetWidth; b.classList.add("bump"); }
  }
  $("out-btn").addEventListener("click", () => { audio(); say(save.outings ? `${save.outings} kez giyinip dışarı çıktın!` : "Hadi giyinip dışarı çıkalım!"); });

  /* ---------- durum ---------- */
  let G = null, timers = [];
  const later = (sec, fn) => timers.push({t: sec, fn});

  function newRound(){
    timers = [];
    // aynı hava art arda gelmesin
    let wi; do { wi = Math.random() * WEATHERS.length | 0; } while (wi === save.last && WEATHERS.length > 1);
    save.last = wi; store();
    G = {w: WEATHERS[wi], worn: [], drag: null, back: [], t: 0, idle: 0, nagT: -99, done: false, jump: 0, confetti: [], shake: {}};
    $("next").hidden = true;
    say(`Bugün hava ${G.w.nm}! Ne giyelim?`);
  }
  const needLeft = () => G.w.needs.filter(id => !G.worn.includes(id));

  function tryWear(id){
    const it = ITEM[id], w = G.w;
    G.idle = 0;
    if (w.needs.includes(id) || w.extra.includes(id)){
      G.worn.push(id); sWear();
      const why = id === "cizme" && w.id === "kar" ? it.okKar : it.ok;
      if (!needLeft().length){
        G.done = true; G.jump = 0; save.outings++; store(); renderCount(true);
        say(`${cap(it.nm)}! Hazırız! Hadi dışarı çıkalım!`);
        later(.5, () => { sOut(); confetti(); });
        later(2, () => { $("next").hidden = false; });
      } else say(`${cap(it.nm)}! ${why}`);
      return true;
    }
    sNo(); G.shake[id] = .6;
    say(it.no[w.id] || `${cap(it.nm)} ${w.nm} havaya uygun değil.`);
    return false;
  }
  function confetti(){
    const cols = ["#E5484D", "#F5C542", "#22C55E", "#3D8BFD", "#FF7A2F", "#9B5DE5"];
    for (let k = 0; k < 70; k++) G.confetti.push({x: 40 + Math.random() * 400, y: -10 - Math.random() * 120, vx: (Math.random() - .5) * 80, vy: 60 + Math.random() * 90, r: Math.random() * 6, vr: (Math.random() - .5) * 8, c: cols[k % 6], life: 4});
  }

  /* ---------- dokunma ---------- */
  const cv = $("cv"), stage = $("stage"), ctx = cv.getContext("2d");
  let view = {s: 1, ox: 0, oy: 0, dpr: 1};
  const toLogical = e => { const r = cv.getBoundingClientRect(); return {x: (e.clientX - r.left - view.ox) / view.s, y: (e.clientY - r.top - view.oy) / view.s}; };
  const inDrop = (x, y) => x > DROP.x && x < DROP.x + DROP.w && y > DROP.y && y < DROP.y + DROP.h;

  cv.addEventListener("pointerdown", e => {
    if (!G || G.done) return;
    e.preventDefault(); audio();
    const p = toLogical(e);
    for (const t of TRAY){
      if (G.worn.includes(t.id)) continue;
      if (Math.abs(p.x - t.x) < 44 && Math.abs(p.y - t.y) < 34){
        try { cv.setPointerCapture(e.pointerId); } catch (err) {}
        G.drag = {id: t.id, x: p.x, y: p.y, pid: e.pointerId}; G.idle = 0; sPick();
        return;
      }
    }
    // çocuğa dokununca hava söylenir
    if (inDrop(p.x, p.y)){ const left = needLeft(); say(left.length ? `Hava ${G.w.nm}. Daha ${left.length} şey giymeliyiz!` : "Hazırız!"); }
  });
  cv.addEventListener("pointermove", e => { if (G && G.drag && G.drag.pid === e.pointerId){ const p = toLogical(e); G.drag.x = p.x; G.drag.y = p.y; } });
  function drop(){
    if (!G || !G.drag) return;
    const d = G.drag; G.drag = null;
    if (inDrop(d.x, d.y) && tryWear(d.id)) return;
    G.back.push({id: d.id, x: d.x, y: d.y, t: 0});             // dolaba geri uçar
  }
  cv.addEventListener("pointerup", drop);
  cv.addEventListener("pointercancel", () => { if (G && G.drag){ G.back.push({id: G.drag.id, x: G.drag.x, y: G.drag.y, t: 0}); G.drag = null; } });
  $("next").addEventListener("click", () => { audio(); newRound(); });

  /* ---------- güncelle ---------- */
  function update(dt){
    for (const tm of timers) tm.t -= dt;
    const due = timers.filter(tm => tm.t <= 0); timers = timers.filter(tm => tm.t > 0); due.forEach(tm => tm.fn());
    if (!G) return;
    G.t += dt;
    for (const b of G.back) b.t += dt / .35;
    G.back = G.back.filter(b => b.t < 1);
    for (const k in G.shake) G.shake[k] = Math.max(0, G.shake[k] - dt);
    for (const c of G.confetti){ c.life -= dt; c.x += c.vx * dt; c.y += c.vy * dt; c.r += c.vr * dt; }
    G.confetti = G.confetti.filter(c => c.life > 0 && c.y < H + 20);
    if (G.done) G.jump += dt;
    if (!G.done && !G.drag){
      G.idle += dt;
      if (G.idle > 8 && G.t - G.nagT > 12){ G.nagT = G.t; const it = ITEM[needLeft()[0]]; say(`${cap(it.acc)} dene!`); }
    }
  }

  /* ---------- çizim ---------- */
  function resize(){
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const cw = stage.clientWidth, ch = stage.clientHeight;
    cv.width = Math.round(cw * dpr); cv.height = Math.round(ch * dpr);
    const s = Math.min(cw / W, ch / H);
    view = {s, ox: (cw - W * s) / 2, oy: (ch - H * s) / 2, dpr};
  }
  function rr(x, y, w, h, r, fill){ ctx.fillStyle = fill; ctx.beginPath(); ctx.roundRect(x, y, w, h, r); ctx.fill(); }
  function circ(x, y, r, fill){ ctx.fillStyle = fill; ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill(); }

  function drawWeather(){
    const w = G.w.id, {x, y, w: ww, h} = WIN, t = G.t;
    ctx.save(); ctx.beginPath(); ctx.rect(x, y, ww, h); ctx.clip();
    const sky = ctx.createLinearGradient(0, y, 0, y + h);
    if (w === "gunes"){ sky.addColorStop(0, "#5DBBF2"); sky.addColorStop(1, "#BFE6FF"); }
    else if (w === "yagmur"){ sky.addColorStop(0, "#6E7F8F"); sky.addColorStop(1, "#AEBBC6"); }
    else { sky.addColorStop(0, "#AFC3D3"); sky.addColorStop(1, "#E6EEF4"); }
    ctx.fillStyle = sky; ctx.fillRect(x, y, ww, h);
    // uzaktaki tepe
    ctx.fillStyle = w === "kar" ? "#FFFFFF" : w === "yagmur" ? "#6E9E6A" : "#7CCB5A";
    ctx.beginPath(); ctx.ellipse(x + ww * .3, y + h + 30, 140, 70, 0, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.ellipse(x + ww * .9, y + h + 40, 120, 70, 0, 0, Math.PI * 2); ctx.fill();
    const cloud = (cx, cy, s, c) => { ctx.fillStyle = c; for (const [dx, dy, r] of [[-22, 4, 18], [0, -6, 24], [24, 4, 18], [0, 8, 18]]){ ctx.beginPath(); ctx.arc(cx + dx * s, cy + dy * s, r * s, 0, Math.PI * 2); ctx.fill(); } };
    if (w === "gunes"){
      const sx = x + 64, sy = y + 60;
      ctx.save(); ctx.translate(sx, sy); ctx.rotate(t * .4);
      ctx.strokeStyle = "#FFD54F"; ctx.lineWidth = 5; ctx.lineCap = "round";
      for (let k = 0; k < 10; k++){ ctx.rotate(Math.PI / 5); ctx.beginPath(); ctx.moveTo(0, 34); ctx.lineTo(0, 46); ctx.stroke(); }
      ctx.restore();
      circ(sx, sy, 28, "#FFD54F");
      circ(sx - 9, sy - 4, 3, "#8D6E00"); circ(sx + 9, sy - 4, 3, "#8D6E00");
      ctx.strokeStyle = "#8D6E00"; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.arc(sx, sy + 4, 10, .2, Math.PI - .2); ctx.stroke();
      cloud(x + 160 + Math.sin(t * .3) * 10, y + 70, 1, "#FFFFFF");
    } else {
      const c1 = w === "yagmur" ? "#5B6B78" : "#C8D3DD";
      cloud(x + 60, y + 50, 1.3, c1); cloud(x + 160, y + 44, 1.2, c1);
      if (w === "yagmur"){
        ctx.strokeStyle = "rgba(220,240,255,.85)"; ctx.lineWidth = 2.5; ctx.lineCap = "round";
        for (let k = 0; k < 26; k++){ const dx = x + (k * 37) % ww, dy = y + 70 + ((t * 260 + k * 53) % (h - 60)); ctx.beginPath(); ctx.moveTo(dx, dy); ctx.lineTo(dx - 4, dy + 12); ctx.stroke(); }
      } else {
        for (let k = 0; k < 30; k++){ const dx = x + ((k * 41) + Math.sin(t + k) * 10) % ww, dy = y + 60 + ((t * 40 + k * 47) % (h - 50)); circ(dx, dy, 3, "#FFFFFF"); }
      }
    }
    ctx.restore();
    // pencere çerçevesi ve perdeler
    ctx.strokeStyle = "#FFFFFF"; ctx.lineWidth = 10; ctx.strokeRect(x, y, ww, h);
    ctx.lineWidth = 6; ctx.beginPath(); ctx.moveTo(x + ww / 2, y); ctx.lineTo(x + ww / 2, y + h); ctx.moveTo(x, y + h / 2); ctx.lineTo(x + ww, y + h / 2); ctx.stroke();
    rr(x - 18, y - 14, ww + 36, 9, 4, "#8D6E63");
    rr(x - 22, y - 8, 26, h + 40, 10, "#FF8FB1"); rr(x + ww - 4, y - 8, 26, h + 40, 10, "#FF8FB1");
    rr(x - 8, y + h + 6, ww + 16, 12, 4, "#FFFFFF");
  }

  // çocuğun üzerindeki kıyafetler
  function drawKid(){
    const hop = G.done ? Math.abs(Math.sin(G.jump * 6)) * 22 : 0;
    const X = KID.x, Y = KID.y - hop, worn = id => G.worn.includes(id);
    const skin = "#F2C9A0";
    ctx.fillStyle = "rgba(0,0,0,.12)"; ctx.beginPath(); ctx.ellipse(X, 532, 60, 10, 0, 0, Math.PI * 2); ctx.fill();
    // bacaklar
    if (worn("sort")){ rr(X - 30, Y + 140, 26, 92, 10, skin); rr(X + 4, Y + 140, 26, 92, 10, skin); rr(X - 34, Y + 132, 68, 44, 10, "#F5A623"); }
    else { rr(X - 32, Y + 136, 28, 96, 10, "#3D5A99"); rr(X + 4, Y + 136, 28, 96, 10, "#3D5A99"); }
    // ayaklar
    if (worn("cizme")){ rr(X - 36, Y + 196, 34, 52, 8, "#E5484D"); rr(X + 2, Y + 196, 34, 52, 8, "#E5484D"); }
    else { rr(X - 38, Y + 228, 36, 18, 9, "#4A90E2"); rr(X + 2, Y + 228, 36, 18, 9, "#4A90E2"); }
    // gövde ve kollar
    const coat = worn("mont") ? "#3D8BFD" : worn("yagmurluk") ? "#FFD54F" : null;
    const shirt = coat || "#22C55E";
    rr(X - 64, Y + 44, 22, 82, 11, coat ? shirt : skin); rr(X + 42, Y + 44, 22, 82, 11, coat ? shirt : skin);
    rr(X - 64, Y + 44, 22, 34, 11, shirt); rr(X + 42, Y + 44, 22, 34, 11, shirt);
    rr(X - 44, Y + 36, 88, 108, 18, shirt);
    if (worn("mont")){ ctx.strokeStyle = "rgba(255,255,255,.5)"; ctx.lineWidth = 3; for (const dy of [62, 86, 110]){ ctx.beginPath(); ctx.moveTo(X - 40, Y + dy); ctx.lineTo(X + 40, Y + dy); ctx.stroke(); } }
    if (worn("yagmurluk")){ circ(X, Y + 70, 4, "#C49A00"); circ(X, Y + 96, 4, "#C49A00"); circ(X, Y + 122, 4, "#C49A00"); }
    if (!coat){ ctx.fillStyle = "#FFFFFF"; ctx.font = "800 22px 'Baloo 2', sans-serif"; ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.fillText("★", X, Y + 82); }
    // eller
    const hand = worn("eldiven") ? "#E5484D" : skin;
    circ(X - 53, Y + 130, 12, hand); circ(X + 53, Y + 130, 12, hand);
    // boyun ve atkı
    rr(X - 12, Y + 26, 24, 16, 6, skin);
    if (worn("atki")){ rr(X - 34, Y + 26, 68, 20, 10, "#9B5DE5"); rr(X + 8, Y + 38, 18, 50, 8, "#9B5DE5"); ctx.strokeStyle = "#7A3FC4"; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(X + 10, Y + 80); ctx.lineTo(X + 24, Y + 80); ctx.stroke(); }
    // kafa
    circ(X, Y, 36, skin);
    ctx.fillStyle = "#6D4C41"; ctx.beginPath(); ctx.arc(X, Y - 6, 37, Math.PI * 1.05, Math.PI * 1.95); ctx.fill();
    circ(X - 13, Y + 2, 4, "#27405A"); circ(X + 13, Y + 2, 4, "#27405A");
    circ(X - 22, Y + 14, 6, "rgba(255,120,120,.35)"); circ(X + 22, Y + 14, 6, "rgba(255,120,120,.35)");
    ctx.strokeStyle = "#B5523B"; ctx.lineWidth = 3; ctx.lineCap = "round"; ctx.beginPath(); ctx.arc(X, Y + 12, 10, .25, Math.PI - .25); ctx.stroke();
    if (worn("gozluk")){ ctx.fillStyle = "#1F2933"; ctx.beginPath(); ctx.roundRect(X - 26, Y - 6, 22, 14, 6); ctx.roundRect(X + 4, Y - 6, 22, 14, 6); ctx.fill(); ctx.strokeStyle = "#1F2933"; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(X - 4, Y); ctx.lineTo(X + 4, Y); ctx.stroke(); }
    if (worn("sapka")){ ctx.fillStyle = "#E8C77A"; ctx.beginPath(); ctx.ellipse(X, Y - 26, 58, 12, 0, 0, Math.PI * 2); ctx.fill(); rr(X - 30, Y - 58, 60, 34, 14, "#E8C77A"); rr(X - 30, Y - 36, 60, 8, 2, "#E5484D"); }
    if (worn("bere")){ ctx.fillStyle = "#E5484D"; ctx.beginPath(); ctx.arc(X, Y - 14, 38, Math.PI, 0); ctx.fill(); rr(X - 40, Y - 20, 80, 14, 6, "#FFFFFF"); circ(X, Y - 56, 10, "#FFFFFF"); }
    if (worn("yagmurluk") && !worn("bere")){ ctx.strokeStyle = "#FFD54F"; ctx.lineWidth = 10; ctx.beginPath(); ctx.arc(X, Y + 2, 40, Math.PI * .95, Math.PI * 2.05); ctx.stroke(); }
    if (worn("semsiye")){
      // sap elden başın üstüne, kubbe başın üstünde ortalı (ekrandan taşmasın)
      ctx.strokeStyle = "#333"; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(X + 53, Y + 128); ctx.lineTo(X + 14, Y - 70); ctx.stroke();
      ctx.fillStyle = "#3D8BFD"; ctx.beginPath(); ctx.moveTo(X - 78, Y - 66); ctx.quadraticCurveTo(X + 12, Y - 160, X + 102, Y - 66); ctx.closePath(); ctx.fill();
      ctx.fillStyle = "#FFFFFF"; for (let k = 0; k < 4; k++){ ctx.beginPath(); ctx.arc(X - 56 + k * 46, Y - 66, 22, Math.PI, 0); ctx.fill(); }
      ctx.fillStyle = "#3D8BFD"; for (let k = 0; k < 4; k++){ ctx.beginPath(); ctx.arc(X - 56 + k * 46, Y - 66, 16, Math.PI, 0); ctx.fill(); }
    }
  }

  // dolaptaki simge
  function icon(id, x, y, s){
    ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
    const F = (c) => { ctx.fillStyle = c; };
    switch (id){
      case "gozluk": F("#1F2933"); ctx.beginPath(); ctx.roundRect(-26, -8, 22, 16, 7); ctx.roundRect(4, -8, 22, 16, 7); ctx.fill(); ctx.strokeStyle = "#1F2933"; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(-4, -2); ctx.lineTo(4, -2); ctx.stroke(); break;
      case "sapka": F("#E8C77A"); ctx.beginPath(); ctx.ellipse(0, 8, 30, 8, 0, 0, Math.PI * 2); ctx.fill(); ctx.beginPath(); ctx.roundRect(-16, -14, 32, 22, 10); ctx.fill(); F("#E5484D"); ctx.fillRect(-16, -2, 32, 6); break;
      case "sort": F("#F5A623"); ctx.beginPath(); ctx.moveTo(-22, -14); ctx.lineTo(22, -14); ctx.lineTo(24, 16); ctx.lineTo(4, 16); ctx.lineTo(0, 2); ctx.lineTo(-4, 16); ctx.lineTo(-24, 16); ctx.closePath(); ctx.fill(); break;
      case "yagmurluk": F("#FFD54F"); ctx.beginPath(); ctx.roundRect(-20, -16, 40, 36, 8); ctx.fill(); ctx.beginPath(); ctx.roundRect(-30, -14, 12, 26, 6); ctx.roundRect(18, -14, 12, 26, 6); ctx.fill(); ctx.beginPath(); ctx.arc(0, -16, 12, Math.PI, 0); ctx.fill(); break;
      case "semsiye": ctx.strokeStyle = "#333"; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(0, -8); ctx.lineTo(0, 16); ctx.quadraticCurveTo(0, 22, -6, 20); ctx.stroke(); F("#3D8BFD"); ctx.beginPath(); ctx.moveTo(-28, -2); ctx.quadraticCurveTo(0, -36, 28, -2); ctx.closePath(); ctx.fill(); break;
      case "cizme": F("#E5484D"); ctx.beginPath(); ctx.roundRect(-22, -18, 16, 32, 4); ctx.roundRect(-26, 8, 22, 10, 4); ctx.roundRect(6, -18, 16, 32, 4); ctx.roundRect(4, 8, 22, 10, 4); ctx.fill(); break;
      case "mont": F("#3D8BFD"); ctx.beginPath(); ctx.roundRect(-20, -16, 40, 36, 10); ctx.fill(); ctx.beginPath(); ctx.roundRect(-30, -14, 12, 28, 6); ctx.roundRect(18, -14, 12, 28, 6); ctx.fill(); ctx.strokeStyle = "rgba(255,255,255,.6)"; ctx.lineWidth = 2; for (const dy of [-4, 8]){ ctx.beginPath(); ctx.moveTo(-18, dy); ctx.lineTo(18, dy); ctx.stroke(); } break;
      case "bere": F("#E5484D"); ctx.beginPath(); ctx.arc(0, 8, 24, Math.PI, 0); ctx.fill(); F("#FFFFFF"); ctx.beginPath(); ctx.roundRect(-26, 4, 52, 10, 5); ctx.fill(); ctx.beginPath(); ctx.arc(0, -18, 7, 0, Math.PI * 2); ctx.fill(); break;
      case "atki": F("#9B5DE5"); ctx.beginPath(); ctx.roundRect(-28, -10, 56, 14, 7); ctx.roundRect(8, -6, 14, 26, 6); ctx.fill(); break;
      case "eldiven": F("#E5484D"); ctx.beginPath(); ctx.roundRect(-26, -12, 20, 26, 9); ctx.roundRect(6, -12, 20, 26, 9); ctx.fill(); ctx.beginPath(); ctx.roundRect(-32, -4, 8, 12, 4); ctx.roundRect(24, -4, 8, 12, 4); ctx.fill(); break;
    }
    ctx.restore();
  }

  function draw(){
    const {s, ox, oy, dpr} = view;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.fillStyle = "#FFF1D6"; ctx.fillRect(0, 0, cv.width, cv.height);
    ctx.setTransform(dpr * s, 0, 0, dpr * s, dpr * ox, dpr * oy);
    // oda
    ctx.fillStyle = "#FFE4B8"; ctx.fillRect(-400, -300, W + 800, 860);
    ctx.fillStyle = "rgba(224,150,80,.12)"; for (let y = 20; y < 540; y += 46) for (let x = (y / 46 % 2) * 23; x < W; x += 46){ ctx.beginPath(); ctx.arc(x, y, 5, 0, Math.PI * 2); ctx.fill(); }
    ctx.fillStyle = "#D9A066"; ctx.fillRect(-400, 528, W + 800, 300);
    rr(-400, 524, W + 800, 8, 0, "#B97A4A");
    if (!G) return;
    drawWeather();
    // askılık
    rr(60, 300, 10, 220, 4, "#8D6E63"); rr(36, 300, 58, 8, 4, "#8D6E63"); rr(44, 516, 42, 10, 4, "#8D6E63");
    // halı ve çocuk
    ctx.fillStyle = "#9BD3F0"; ctx.beginPath(); ctx.ellipse(KID.x, 540, 110, 18, 0, 0, Math.PI * 2); ctx.fill();
    drawKid();
    // hava etiketi
    ctx.fillStyle = "rgba(255,255,255,.9)"; ctx.beginPath(); ctx.roundRect(WIN.x + 22, WIN.y + WIN.h + 26, WIN.w - 44, 40, 20); ctx.fill();
    ctx.fillStyle = "#27405A"; ctx.font = "800 24px 'Baloo 2', sans-serif"; ctx.textAlign = "center"; ctx.textBaseline = "middle";
    ctx.fillText({gunes: "☀️ güneşli", yagmur: "🌧️ yağmurlu", kar: "❄️ karlı"}[G.w.id], WIN.x + WIN.w / 2, WIN.y + WIN.h + 47);
    // giyilecekler: kaç şey kaldı
    const need = G.w.needs.length, done = need - needLeft().length;
    for (let k = 0; k < need; k++){ circ(WIN.x + WIN.w / 2 - (need - 1) * 14 + k * 28, WIN.y + WIN.h + 86, 10, k < done ? "#22C55E" : "rgba(39,64,90,.18)"); }
    // dolap
    rr(4, 566, W - 8, 150, 18, "#C98B55"); rr(12, 574, W - 24, 134, 14, "#E8B98A");
    const hintId = !G.done && G.idle > 8 ? needLeft()[0] : null;
    for (const t of TRAY){
      if (G.worn.includes(t.id) || (G.drag && G.drag.id === t.id) || G.back.some(b => b.id === t.id)){ rr(t.x - 40, t.y - 30, 80, 60, 14, "rgba(255,255,255,.25)"); continue; }
      const sh = (G.shake[t.id] || 0) > 0 ? Math.sin(G.t * 50) * 6 : 0, wig = hintId === t.id ? Math.sin(G.t * 10) * .12 : 0;
      rr(t.x - 40 + sh, t.y - 30, 80, 60, 14, hintId === t.id ? "#FFF6C2" : "#FFFFFF");
      ctx.save(); ctx.translate(t.x + sh, t.y); ctx.rotate(wig); icon(t.id, 0, 0, 1); ctx.restore();
    }
    for (const b of G.back){ const tr = TRAY.find(t => t.id === b.id), k = b.t; icon(b.id, b.x + (tr.x - b.x) * k, b.y + (tr.y - b.y) * k, 1.1); }
    if (G.drag){
      ctx.strokeStyle = inDrop(G.drag.x, G.drag.y) ? "rgba(34,197,94,.7)" : "rgba(39,64,90,.15)"; ctx.lineWidth = 4; ctx.setLineDash([10, 8]);
      ctx.strokeRect(DROP.x, DROP.y, DROP.w, DROP.h); ctx.setLineDash([]);
      icon(G.drag.id, G.drag.x, G.drag.y - 10, 1.5);
    }
    if (hintId){
      const t = TRAY.find(q => q.id === hintId), k = (G.t % 1.4) / 1.4;
      const hx = t.x + (KID.x - t.x) * k, hy = t.y + (KID.y + 90 - t.y) * k;
      ctx.font = "40px sans-serif"; ctx.globalAlpha = Math.min(1, k * 4); ctx.fillText("👆", hx + 10, hy + 26); ctx.globalAlpha = 1;
    }
    for (const c of G.confetti){ ctx.save(); ctx.translate(c.x, c.y); ctx.rotate(c.r); ctx.fillStyle = c.c; ctx.fillRect(-5, -3, 10, 6); ctx.restore(); }
  }

  let last = performance.now();
  function frame(now){
    const dt = Math.min(.05, (now - last) / 1000); last = now;
    update(dt); draw();
    requestAnimationFrame(frame);
  }
  document.addEventListener("visibilitychange", () => { last = performance.now(); if (document.hidden && canSpeak) speechSynthesis.cancel(); });
  if ("ResizeObserver" in window) new ResizeObserver(resize).observe(stage); else window.addEventListener("resize", resize);
  resize(); renderCount(false); newRound();
  requestAnimationFrame(frame);

  // testler için
  window.__giy = {state: () => G, update, tryWear, newRound, WEATHERS, ITEMS, TRAY, DROP, KID, setWeather: i => { G.w = WEATHERS[i]; G.worn = []; G.done = false; }};
})();
