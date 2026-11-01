/* Sırala Bakalım — Egemen için büyükten küçüğe / küçükten büyüğe sıralama */
(function(){
  "use strict";

  const SAVE = "sirala", SOUND_KEY = "sirala-ses", PER_LEVEL = 3;
  const RAINBOW = ["#E4483B", "#C98F00", "#2A64C0", "#1E8A41", "#6E36B8"];
  const PICS = [["🐻", "ayı"], ["🌳", "ağaç"], ["🍎", "elma"], ["🐟", "balık"], ["🎈", "balon"], ["⭐", "yıldız"], ["🚗", "araba"], ["🐘", "fil"], ["🌸", "çiçek"], ["🏠", "ev"]];
  const NUM = ["sıfır", "bir", "iki", "üç", "dört", "beş", "altı", "yedi", "sekiz", "dokuz", "on"];
  // bölümler: kaç tane, yön (1 küçükten büyüğe, -1 büyükten küçüğe, 0 karışık), rakam mı
  const LEVELS = [{n:3, dir:1}, {n:3, dir:0}, {n:4, dir:1}, {n:4, dir:0}, {n:5, dir:0}, {n:3, dir:1, num:true}, {n:5, dir:1, num:true}, {n:5, dir:0, num:true}];

  const $ = id => document.getElementById(id);
  const rnd = n => Math.floor(Math.random()*n);
  const shuffle = a => { for (let i = a.length - 1; i > 0; i--){ const j = rnd(i + 1); [a[i], a[j]] = [a[j], a[i]]; } return a; };

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
  const SCALE = [523.25, 587.33, 659.25, 698.46, 783.99, 880];
  const sfx = {
    ok(i){ tone(SCALE[i % SCALE.length], .18, "triangle", .11); },
    no(){ tone(240, .2, "sine", .1); },
    done(){ [659.25, 783.99, 1046.5].forEach((f, i) => tone(f, .16, "triangle", .11, i*.08)); },
    party(){ [523.25, 659.25, 783.99, 1046.5, 1318.5].forEach((f, i) => tone(f, .3, "triangle", .14, i*.12)); }
  };
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
  $("sound").addEventListener("click", () => {
    soundOn = !soundOn;
    try { localStorage.setItem(SOUND_KEY, soundOn ? "1" : "0"); } catch(e) {}
    if (!soundOn && canSpeak) speechSynthesis.cancel();
    renderSound();
  });
  renderSound();

  /* ---------- oyun ---------- */
  let level = 0, round = 0, mistakes = 0, items = [], order = [], placed = 0, dir = 1, idleT = null, busy = false;

  function startLevel(i){
    level = Math.max(0, Math.min(LEVELS.length - 1, i)); round = 0; mistakes = 0;
    $("intro").hidden = true; $("done").hidden = true; $("party").hidden = true;
    newRound();
  }
  function newRound(){
    const L = LEVELS[level];
    dir = L.dir || (Math.random() < .5 ? 1 : -1);
    if (L.num){
      const pool = shuffle([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]).slice(0, L.n);
      items = pool.map(v => ({v, label:String(v), word:NUM[v]}));
    } else {
      const [e, ad] = PICS[rnd(PICS.length)];
      items = Array.from({length:L.n}, (_, k) => ({v:k + 1, e, ad, size:1.1 + k*(2.6 / L.n)}));
    }
    order = items.slice().sort((a, b) => dir*(a.v - b.v));
    placed = 0; busy = false;
    const box = $("items"); box.textContent = "";
    for (const it of shuffle(items.slice())){
      const b = document.createElement("button"); b.type = "button";
      if (L.num){ b.className = "it num"; b.textContent = it.label; b.style.fontSize = "clamp(2.4rem,8vw,3.6rem)"; b.setAttribute("aria-label", it.word); }
      else { b.className = "it sz"; b.innerHTML = `<span style="font-size:${it.size}rem">${it.e}</span>`; b.setAttribute("aria-label", `${it.ad}, boy ${it.v}`); }
      b.dataset.v = it.v;
      b.addEventListener("click", () => { audio(); pick(b); });
      box.appendChild(b);
    }
    const sl = $("slots"); sl.textContent = "";
    for (let k = 0; k < items.length; k++){ const s = document.createElement("div"); s.className = "slot" + (L.num ? " num" : ""); sl.appendChild(s); }
    const what = L.num ? (dir > 0 ? "En küçük sayıdan en büyüğe" : "En büyük sayıdan en küçüğe") : (dir > 0 ? "En küçükten en büyüğe" : "En büyükten en küçüğe");
    $("goal").innerHTML = `<span class="arrow" aria-hidden="true">${dir > 0 ? "🔼" : "🔽"}</span>${what} diz!`;
    say(what + " diz!");
    renderDots(); armIdle();
  }
  function renderDots(){
    const d = $("dots"); d.textContent = "";
    for (let i = 0; i < PER_LEVEL; i++){ const e = document.createElement("i"); if (i < round) e.className = "on"; d.appendChild(e); }
  }
  function armIdle(){
    clearTimeout(idleT);
    document.querySelectorAll(".it.sel").forEach(e => e.classList.remove("sel"));
    idleT = setTimeout(() => {
      const want = order[placed]; if (!want || busy) return;
      const b = document.querySelector(`#items .it[data-v="${want.v}"]`);
      if (b){ b.classList.add("sel"); say(dir > 0 ? "Sıradaki en küçük hangisi? Parlayana bak." : "Sıradaki en büyük hangisi? Parlayana bak."); }
    }, 8000);
  }
  function pick(b){
    if (busy || b.classList.contains("done")) return false;
    const want = order[placed];
    if (+b.dataset.v !== want.v){
      mistakes++; sfx.no(); b.classList.remove("no"); void b.offsetWidth; b.classList.add("no");
      say(dir > 0 ? "Daha küçüğü var, bir daha bak." : "Daha büyüğü var, bir daha bak.");
      return false;
    }
    const L = LEVELS[level], slot = $("slots").children[placed];
    slot.classList.add("full");
    if (L.num){ slot.textContent = want.label; slot.style.fontSize = "2.2rem"; say(want.word); }
    else slot.innerHTML = `<span style="font-size:${want.size*0.62}rem">${want.e}</span>`;
    b.classList.add("done"); sfx.ok(placed); placed++; armIdle();
    if (placed === items.length){
      busy = true; clearTimeout(idleT); round++; renderDots();
      setTimeout(() => { sfx.done(); say("Aferin! Sıraladın!"); }, 300);
      if (round >= PER_LEVEL) setTimeout(finishLevel, 1500); else setTimeout(newRound, 1700);
    }
    return true;
  }
  function starsNow(){ return mistakes <= 1 ? 3 : mistakes <= 4 ? 2 : 1; }
  function finishLevel(){
    const s = starsNow();
    best[level] = Math.max(best[level] || 0, s); persist(); renderLevels();
    if (level === LEVELS.length - 1){ $("party").hidden = false; sfx.party(); say("Aferin Egemen! Sıralama ustasısın!"); return; }
    [...$("stars").children].forEach((el, i) => { el.className = ""; void el.offsetWidth; if (i < s) el.className = "on"; });
    $("stars").setAttribute("aria-label", s + " yıldız");
    $("done").hidden = false; sfx.party();
  }

  /* ---------- menüler ---------- */
  function renderLevels(){
    const box = $("levels"); box.textContent = "";
    LEVELS.forEach((lv, i) => {
      const b = document.createElement("button");
      b.type = "button"; b.className = "lvl";
      b.setAttribute("aria-label", `Bölüm ${i + 1}${lv.num ? ", rakamlar" : ""}${best[i] ? ", " + best[i] + " yıldız" : ""}`);
      b.innerHTML = `<span class="ic" aria-hidden="true">${lv.num ? "🔢" : "📏"}</span>${i + 1}<small aria-hidden="true">${"★".repeat(best[i] || 0)}</small>`;
      b.addEventListener("click", () => { audio(); startLevel(i); });
      box.appendChild(b);
    });
  }
  function showIntro(){ clearTimeout(idleT); if (canSpeak) speechSynthesis.cancel(); $("intro").hidden = false; $("done").hidden = true; $("party").hidden = true; }
  $("play").addEventListener("click", () => { audio(); const i = LEVELS.findIndex((_, k) => !best[k]); startLevel(i < 0 ? 0 : i); });
  $("next").addEventListener("click", () => { audio(); startLevel(level + 1); });
  $("replay").addEventListener("click", () => { audio(); startLevel(level); });
  $("again").addEventListener("click", () => { audio(); showIntro(); });
  $("menu").addEventListener("click", () => { audio(); showIntro(); });
  document.addEventListener("visibilitychange", () => { if (document.hidden && canSpeak) speechSynthesis.cancel(); });

  renderLevels();
  startLevel(0); clearTimeout(idleT); $("intro").hidden = false; if (canSpeak) speechSynthesis.cancel();

  // test kancası
  window.__sr = { LEVELS, startLevel, pick, get st(){ return {level, round, mistakes, placed, order:order.map(o => o.v), dir}; } };
})();
