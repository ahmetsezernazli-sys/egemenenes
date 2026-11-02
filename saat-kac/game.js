/* Saat Kaç? — Egemen için saat okuma ve kurma oyunu */
(function(){
  "use strict";

  const SAVE = "saat-kac", SOUND_KEY = "saat-kac-ses", PER_LEVEL = 5;
  const RAINBOW = ["#E4483B", "#C98F00", "#2A64C0", "#1E8A41", "#6E36B8"];
  const NUM = ["", "bir", "iki", "üç", "dört", "beş", "altı", "yedi", "sekiz", "dokuz", "on", "on bir", "on iki"];
  const DAY = {7:"Saat yedide uyanıyoruz.", 8:"Saat sekizde okula gidiyoruz.", 9:"Saat dokuzda ders başlıyor.", 10:"Saat onda meyve yiyoruz.", 11:"Saat on birde bahçede oynuyoruz.", 12:"Saat on ikide öğle yemeği.", 1:"Saat birde masal okuyoruz.", 2:"Saat ikide resim yapıyoruz.", 3:"Saat üçte parka gidiyoruz.", 4:"Saat dörtte süt içiyoruz.", 5:"Saat beşte çizgi film izliyoruz.", 6:"Saat altıda babam eve geliyor."};
  // bölümler: tür (read okuma, set kurma), buçuk var mı
  const LEVELS = [{t:"read", half:false}, {t:"set", half:false}, {t:"read", half:true}, {t:"set", half:true}, {t:"mix", half:true}];

  const $ = id => document.getElementById(id);
  const rnd = n => Math.floor(Math.random()*n);
  const shuffle = a => { for (let i = a.length - 1; i > 0; i--){ const j = rnd(i + 1); [a[i], a[j]] = [a[j], a[i]]; } return a; };
  const spoken = (h, m) => m ? `Saat ${NUM[h]} buçuk` : `Saat ${NUM[h]}`;
  const digital = (h, m) => `${h}:${m ? "30" : "00"}`;

  let soundOn = true, best = [];
  try { soundOn = localStorage.getItem(SOUND_KEY) !== "0"; } catch(e) {}
  try { best = JSON.parse(localStorage.getItem(SAVE) || "{}").stars || []; } catch(e) { best = []; }
  const persist = () => { try { localStorage.setItem(SAVE, JSON.stringify({stars:best})); } catch(e) {} };

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
  function tone(freq, dur, type, vol, delay){
    const a = audio(); if (!a || !soundOn) return;
    const n = a.currentTime + (delay || 0), o = a.createOscillator(), g = a.createGain();
    o.type = type || "sine"; o.frequency.setValueAtTime(freq, n);
    g.gain.setValueAtTime(.0001, n); g.gain.exponentialRampToValueAtTime(vol || .1, n + .015); g.gain.exponentialRampToValueAtTime(.0001, n + dur);
    o.connect(g).connect(a.destination); o.start(n); o.stop(n + dur + .05);
  }
  const sfx = {
    tick(){ tone(1600, .03, "square", .03); },
    ok(){ [659.25, 783.99, 1046.5].forEach((f, i) => tone(f, .16, "triangle", .11, i*.08)); },
    no(){ tone(240, .2, "sine", .1); },
    party(){ [523.25, 659.25, 783.99, 1046.5, 1318.5].forEach((f, i) => tone(f, .3, "triangle", .14, i*.12)); }
  };
  const canSpeak = "speechSynthesis" in window;
  let trVoice = null;
  function pickVoice(){ trVoice = speechSynthesis.getVoices().find(v => /^tr(-|_|$)/i.test(v.lang)) || null; }
  if (canSpeak){ pickVoice(); if (speechSynthesis.addEventListener) speechSynthesis.addEventListener("voiceschanged", pickVoice); }
  function say(text){
    if (!canSpeak || !soundOn || !trVoice) return;
    speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text); u.voice = trVoice; u.lang = trVoice.lang; u.rate = .92; u.pitch = 1.15;
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

  /* ---------- kadran ---------- */
  const NS = "http://www.w3.org/2000/svg";
  const svg = $("clock");
  function el(tag, attrs, parent){ const e = document.createElementNS(NS, tag); for (const k in attrs) e.setAttribute(k, attrs[k]); (parent || svg).appendChild(e); return e; }
  let hourHand, minHand, hourKnob, minKnob;
  function buildClock(){
    svg.textContent = "";
    el("circle", {r:104, fill:"#2DB75A"}); el("circle", {r:96, fill:"#fff"});
    for (let i = 0; i < 60; i++){ const a = i*Math.PI/30, r1 = i % 5 ? 88 : 82; el("line", {x1:Math.sin(a)*r1, y1:-Math.cos(a)*r1, x2:Math.sin(a)*92, y2:-Math.cos(a)*92, stroke:"#9AA6B8", "stroke-width":i % 5 ? 1.5 : 3}); }
    for (let h = 1; h <= 12; h++){ const a = h*Math.PI/6; const t = el("text", {x:Math.sin(a)*68, y:-Math.cos(a)*68 + 8, "text-anchor":"middle", "font-size":22, "font-weight":800, fill:"#2A2540", "font-family":"Baloo 2, sans-serif"}); t.textContent = h; }
    minHand = el("line", {x1:0, y1:10, x2:0, y2:-80, stroke:"#3D8BFD", "stroke-width":6, "stroke-linecap":"round"});
    hourHand = el("line", {x1:0, y1:8, x2:0, y2:-50, stroke:"#2A2540", "stroke-width":10, "stroke-linecap":"round"});
    minKnob = el("circle", {r:9, fill:"#3D8BFD", opacity:0});
    hourKnob = el("circle", {r:11, fill:"#2A2540", opacity:0});
    el("circle", {r:7, fill:"#FFC529"});
  }
  let shown = {h:12, m:0};
  function setHands(h, m){
    shown = {h, m};
    const ha = ((h % 12) + m/60)*30, ma = m*6;
    hourHand.setAttribute("transform", `rotate(${ha})`); minHand.setAttribute("transform", `rotate(${ma})`);
    const hr = ha*Math.PI/180, mr = ma*Math.PI/180;
    hourKnob.setAttribute("cx", Math.sin(hr)*50); hourKnob.setAttribute("cy", -Math.cos(hr)*50);
    minKnob.setAttribute("cx", Math.sin(mr)*80); minKnob.setAttribute("cy", -Math.cos(mr)*80);
  }

  /* ---------- oyun ---------- */
  let level = 0, q = 0, mistakes = 0, target = null, mode = "read", busy = false, drag = null, last = null;

  function startLevel(i){
    level = Math.max(0, Math.min(LEVELS.length - 1, i)); q = 0; mistakes = 0;
    $("intro").hidden = true; $("done").hidden = true; $("party").hidden = true;
    next();
  }
  function next(){
    const L = LEVELS[level]; busy = false;
    let h, m; do { h = 1 + rnd(12); m = L.half && Math.random() < .5 ? 30 : 0; } while (last && last.h === h && last.m === m);
    target = {h, m}; last = target;
    mode = L.t === "mix" ? (Math.random() < .5 ? "read" : "set") : L.t;
    const cards = $("cards"); cards.textContent = "";
    if (mode === "read"){
      setHands(h, m); hourKnob.setAttribute("opacity", 0); minKnob.setAttribute("opacity", 0);
      const opts = [target];
      while (opts.length < 3){ const o = {h:1 + rnd(12), m:L.half && Math.random() < .5 ? 30 : 0}; if (!opts.some(x => x.h === o.h && x.m === o.m)) opts.push(o); }
      for (const o of shuffle(opts)){
        const b = document.createElement("button"); b.type = "button"; b.className = "card-t"; b.innerHTML = `${digital(o.h, o.m)}<small>${spoken(o.h, o.m).replace("Saat ", "")}</small>`;
        b.setAttribute("aria-label", spoken(o.h, o.m));
        b.addEventListener("click", () => { audio(); answer(o, b); });
        cards.appendChild(b);
      }
      $("task").textContent = "Saat kaç? Doğru kartı seç!";
      say("Saat kaç? Doğru kartı seç!");
    } else {
      setHands(12, 0); hourKnob.setAttribute("opacity", .35); minKnob.setAttribute("opacity", L.half ? .35 : 0);
      const b = document.createElement("button"); b.type = "button"; b.className = "okbtn"; b.textContent = "✔ Tamam";
      b.addEventListener("click", () => { audio(); answer(shown, b); });
      cards.appendChild(b);
      const line = m === 0 && DAY[h] ? DAY[h] + " " : "";
      $("task").textContent = `${line}${spoken(h, m)} olsun! ${level === 1 ? "Kısa kolu" : "Kolları"} sürükle.`;
      say(`${line}${spoken(h, m)} olsun! ${level === 1 ? "Kısa kolu sürükle." : "Kolları sürükle."}`);
    }
    renderDots();
  }
  function renderDots(){
    const d = $("dots"); d.textContent = "";
    for (let i = 0; i < PER_LEVEL; i++){ const e = document.createElement("i"); if (i < q) e.className = "on"; d.appendChild(e); }
  }
  function answer(o, b){
    if (busy) return false;
    const ok = o.h === target.h && o.m === target.m;
    if (ok){
      busy = true; sfx.ok(); if (b) b.classList.add("ok"); q++; renderDots();
      say(`Evet! ${spoken(target.h, target.m)}.`);
      if (q >= PER_LEVEL) setTimeout(finishLevel, 1500); else setTimeout(next, 1700);
      return true;
    }
    mistakes++; sfx.no(); if (b){ b.classList.remove("no"); void b.offsetWidth; b.classList.add("no"); }
    if (mode === "set"){
      say(`Bu ${spoken(o.h, o.m).toLocaleLowerCase("tr-TR")}. Bak, doğrusu böyle.`);
      busy = true; setHands(target.h, target.m);
      setTimeout(() => { busy = false; setHands(12, 0); }, 2200);
    } else say(`Bu ${spoken(o.h, o.m).toLocaleLowerCase("tr-TR")}. Kısa kol hangi sayıyı gösteriyor?`);
    return false;
  }
  function starsNow(){ return mistakes <= 1 ? 3 : mistakes <= 3 ? 2 : 1; }
  function finishLevel(){
    const s = starsNow();
    best[level] = Math.max(best[level] || 0, s); persist(); renderLevels();
    if (level === LEVELS.length - 1){ $("party").hidden = false; sfx.party(); say("Aferin Egemen! Artık saati okuyabiliyorsun!"); return; }
    [...$("stars").children].forEach((el, i) => { el.className = ""; void el.offsetWidth; if (i < s) el.className = "on"; });
    $("stars").setAttribute("aria-label", s + " yıldız");
    $("done").hidden = false; sfx.party();
  }

  /* ---------- kolları sürükleme ---------- */
  function angleOf(e){
    const r = svg.getBoundingClientRect(), x = e.clientX - (r.left + r.width/2), y = e.clientY - (r.top + r.height/2);
    return {a:(Math.atan2(x, -y)*180/Math.PI + 360) % 360, d:Math.hypot(x, y)/(r.width/2)*110};
  }
  svg.addEventListener("pointerdown", e => {
    if (mode !== "set" || busy) return;
    audio();
    const {a, d} = angleOf(e), L = LEVELS[level];
    const ha = ((shown.h % 12) + shown.m/60)*30, ma = shown.m*6;
    const diff = (x, y) => Math.min(Math.abs(x - y), 360 - Math.abs(x - y));
    // yelkovan uzun: dışarıdan tutulursa ya da açıya daha yakınsa
    drag = L.half && d > 62 ? "m" : "h"; void diff; void ha; void ma;
    try { svg.setPointerCapture(e.pointerId); } catch(_) {}
    move(e);
  });
  svg.addEventListener("pointermove", e => { if (drag) move(e); });
  svg.addEventListener("pointerup", () => { drag = null; });
  function move(e){
    const {a} = angleOf(e);
    let {h, m} = shown;
    if (drag === "m"){ const nm = Math.round(a/180) % 2 ? 30 : 0; if (nm !== m){ m = nm; sfx.tick(); } }
    else { let nh = Math.round((a - m/2)/30) % 12; if (nh <= 0) nh += 12; if (nh !== h){ h = nh; sfx.tick(); } }
    setHands(h, m);
  }

  /* ---------- menüler ---------- */
  function renderLevels(){
    const box = $("levels"); box.textContent = "";
    LEVELS.forEach((lv, i) => {
      const b = document.createElement("button");
      b.type = "button"; b.className = "lvl";
      b.setAttribute("aria-label", `Bölüm ${i + 1}${lv.t === "read" ? ", okuma" : lv.t === "set" ? ", kurma" : ", karışık"}${best[i] ? ", " + best[i] + " yıldız" : ""}`);
      b.innerHTML = `<span class="ic" aria-hidden="true">${lv.t === "read" ? "👀" : lv.t === "set" ? "✋" : "🔀"}</span>${i + 1}<small aria-hidden="true">${"★".repeat(best[i] || 0)}</small>`;
      b.addEventListener("click", () => { audio(); startLevel(i); });
      box.appendChild(b);
    });
  }
  function showIntro(){ if (canSpeak) speechSynthesis.cancel(); $("intro").hidden = false; $("done").hidden = true; $("party").hidden = true; }
  $("play").addEventListener("click", () => { audio(); const i = LEVELS.findIndex((_, k) => !best[k]); startLevel(i < 0 ? 0 : i); });
  $("next").addEventListener("click", () => { audio(); startLevel(level + 1); });
  $("replay").addEventListener("click", () => { audio(); startLevel(level); });
  $("again").addEventListener("click", () => { audio(); showIntro(); });
  $("menu").addEventListener("click", () => { audio(); showIntro(); });
  document.addEventListener("visibilitychange", () => { if (document.hidden && canSpeak) speechSynthesis.cancel(); });

  buildClock(); renderLevels();
  startLevel(0); $("intro").hidden = false; if (canSpeak) speechSynthesis.cancel();

  window.__sk2 = { startLevel, answer, setHands, get st(){ return {level, q, mistakes, target, mode, shown}; } };
})();
