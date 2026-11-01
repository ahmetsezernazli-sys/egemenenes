/* Gölge Bul — Egemen için gölge eşleştirme oyunu */
(function(){
  "use strict";

  const SAVE = "golge-bul", SOUND_KEY = "golge-bul-ses", PER_LEVEL = 2;
  const RAINBOW = ["#E4483B", "#C98F00", "#2A64C0", "#1E8A41", "#6E36B8"];
  // benzer gölgeler aynı grupta: üst bölümlerde aynı gruptan seçilir
  const GROUPS = [
    [["🐶", "köpek"], ["🐱", "kedi"], ["🐰", "tavşan"], ["🐻", "ayı"], ["🐼", "panda"], ["🐨", "koala"]],
    [["🐘", "fil"], ["🦒", "zürafa"], ["🐪", "deve"], ["🐄", "inek"], ["🐎", "at"], ["🦓", "zebra"]],
    [["🍎", "elma"], ["🍐", "armut"], ["🍊", "portakal"], ["🍋", "limon"], ["🍑", "şeftali"], ["🍓", "çilek"]],
    [["🍌", "muz"], ["🍇", "üzüm"], ["🍉", "karpuz"], ["🥕", "havuç"], ["🌽", "mısır"], ["🍄", "mantar"]],
    [["🚗", "araba"], ["🚌", "otobüs"], ["🚒", "itfaiye"], ["🚜", "traktör"], ["🚲", "bisiklet"], ["🛵", "motosiklet"]],
    [["✈️", "uçak"], ["🚀", "roket"], ["🚁", "helikopter"], ["⛵", "yelkenli"], ["🚂", "tren"], ["🚢", "gemi"]],
    [["🐟", "balık"], ["🐬", "yunus"], ["🐳", "balina"], ["🦀", "yengeç"], ["🐙", "ahtapot"], ["🐢", "kaplumbağa"]],
    [["🦋", "kelebek"], ["🐝", "arı"], ["🐞", "uğur böceği"], ["🐌", "salyangoz"], ["🐦", "kuş"], ["🦆", "ördek"]]
  ];
  // bölümler: kaç resim, benzer gruptan mı
  const LEVELS = [{n:3, same:false}, {n:3, same:false}, {n:4, same:false}, {n:4, same:true}, {n:5, same:false}, {n:5, same:true}, {n:6, same:true}, {n:6, same:true}];

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
  function tone(freq, dur, type, vol, slide, delay){
    const a = audio(); if (!a || !soundOn) return;
    const n = a.currentTime + (delay || 0), o = a.createOscillator(), g = a.createGain();
    o.type = type || "sine"; o.frequency.setValueAtTime(freq, n);
    if (slide) o.frequency.exponentialRampToValueAtTime(slide, n + dur);
    g.gain.setValueAtTime(.0001, n); g.gain.exponentialRampToValueAtTime(vol || .1, n + .015); g.gain.exponentialRampToValueAtTime(.0001, n + dur);
    o.connect(g).connect(a.destination); o.start(n); o.stop(n + dur + .05);
  }
  const sfx = {
    pick(){ tone(600, .08, "triangle", .08, 800); },
    ok(){ [659.25, 783.99, 1046.5].forEach((f, i) => tone(f, .16, "triangle", .11, null, i*.08)); },
    no(){ tone(240, .2, "sine", .1, 180); },
    party(){ [523.25, 659.25, 783.99, 1046.5, 1318.5].forEach((f, i) => tone(f, .3, "triangle", .14, null, i*.12)); }
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
  let level = 0, round = 0, mistakes = 0, set = [], left = 0, sel = null, idleT = null, busy = false;

  function startLevel(i){
    level = Math.max(0, Math.min(LEVELS.length - 1, i)); round = 0; mistakes = 0;
    $("intro").hidden = true; $("done").hidden = true; $("party").hidden = true;
    newRound();
    say(level === 0 ? "Resmi gölgesine götür!" : "Her resmin gölgesini bul!");
  }
  function newRound(){
    const L = LEVELS[level];
    let pool;
    if (L.same){ pool = shuffle(GROUPS[rnd(GROUPS.length)].slice()); }
    else { pool = shuffle(GROUPS.map(g => g[rnd(g.length)])); }
    set = pool.slice(0, L.n).map(([e, ad], k) => ({e, ad, k}));
    left = set.length; sel = null; busy = false;
    const items = $("items"), shadows = $("shadows"); items.textContent = ""; shadows.textContent = "";
    for (const s of shuffle(set.slice())){
      const b = document.createElement("button"); b.type = "button"; b.className = "it"; b.textContent = s.e; b.dataset.k = s.k;
      b.setAttribute("aria-label", s.ad);
      items.appendChild(b);
    }
    for (const s of shuffle(set.slice())){
      const b = document.createElement("button"); b.type = "button"; b.className = "it sh"; b.dataset.k = s.k;
      b.innerHTML = `<span>${s.e}</span>`; b.setAttribute("aria-label", "gölge");
      shadows.appendChild(b);
    }
    renderDots(); armIdle();
  }
  function renderDots(){
    const d = $("dots"); d.textContent = "";
    for (let i = 0; i < PER_LEVEL; i++){ const e = document.createElement("i"); if (i < round) e.className = "on"; d.appendChild(e); }
  }
  function armIdle(){
    clearTimeout(idleT);
    document.querySelectorAll(".sh.hint").forEach(e => e.classList.remove("hint"));
    idleT = setTimeout(() => {
      const it = sel || document.querySelector("#items .it:not(.done)"); if (!it) return;
      const sh = document.querySelector(`#shadows .it[data-k="${it.dataset.k}"]`);
      if (sh){ sh.classList.add("hint"); if (!sel) select(it); say("Parlayan gölgeye bak!"); }
    }, 8000);
  }
  function select(b){
    document.querySelectorAll("#items .it.sel").forEach(e => e.classList.remove("sel"));
    sel = b; if (b){ b.classList.add("sel"); sfx.pick(); }
  }
  function tryMatch(itemBtn, shBtn){
    if (busy || !itemBtn || !shBtn || shBtn.classList.contains("done")) return false;
    armIdle();
    const s = set.find(x => x.k === +itemBtn.dataset.k);
    if (itemBtn.dataset.k === shBtn.dataset.k){
      itemBtn.classList.add("done"); itemBtn.classList.remove("sel");
      shBtn.classList.add("done"); shBtn.setAttribute("aria-label", s.ad);
      sel = null; left--; sfx.ok(); say(s.ad);
      if (left === 0){
        round++; renderDots(); busy = true; clearTimeout(idleT);
        setTimeout(() => say("Aferin! Hepsini buldun!"), 600);
        if (round >= PER_LEVEL) setTimeout(finishLevel, 1400);
        else setTimeout(newRound, 1600);
      }
      return true;
    }
    mistakes++; sfx.no();
    shBtn.classList.remove("no"); void shBtn.offsetWidth; shBtn.classList.add("no");
    say(`Bu ${s.ad} değil. Bir daha bak.`);
    return false;
  }
  function starsNow(){ return mistakes <= 1 ? 3 : mistakes <= 4 ? 2 : 1; }
  function finishLevel(){
    const s = starsNow();
    best[level] = Math.max(best[level] || 0, s); persist(); renderLevels();
    if (level === LEVELS.length - 1){ $("party").hidden = false; sfx.party(); say("Aferin Egemen! Bütün gölgeleri buldun!"); return; }
    [...$("stars").children].forEach((el, i) => { el.className = ""; void el.offsetWidth; if (i < s) el.className = "on"; });
    $("stars").setAttribute("aria-label", s + " yıldız");
    $("done").hidden = false; sfx.party();
  }

  /* ---------- giriş: dokun ya da sürükle ---------- */
  let drag = null;
  $("items").addEventListener("pointerdown", e => {
    const b = e.target.closest(".it"); if (!b || b.classList.contains("done") || busy) return;
    audio(); select(b);
    drag = {b, x:e.clientX, y:e.clientY, moved:false, el:null};
    try { $("items").setPointerCapture(e.pointerId); } catch(_) {}
  });
  $("items").addEventListener("pointermove", e => {
    if (!drag) return;
    if (!drag.moved && Math.hypot(e.clientX - drag.x, e.clientY - drag.y) < 8) return;
    if (!drag.moved){ drag.moved = true; drag.el = document.createElement("div"); drag.el.className = "drag"; drag.el.textContent = drag.b.textContent; document.body.appendChild(drag.el); drag.b.style.opacity = ".3"; }
    drag.el.style.left = e.clientX + "px"; drag.el.style.top = e.clientY + "px";
  });
  $("items").addEventListener("pointerup", e => {
    if (!drag) return;
    const d = drag; drag = null;
    if (!d.moved) return;
    d.el.remove(); d.b.style.opacity = "";
    const target = document.elementsFromPoint(e.clientX, e.clientY).find(el => el.classList && el.classList.contains("sh"));
    if (target) tryMatch(d.b, target);
  });
  $("shadows").addEventListener("click", e => {
    const sh = e.target.closest(".sh"); if (!sh) return;
    audio();
    if (!sel){ say("Önce yukarıdaki resme dokun."); const first = document.querySelector("#items .it:not(.done)"); if (first){ first.classList.add("sel"); setTimeout(() => first.classList.remove("sel"), 700); } return; }
    tryMatch(sel, sh);
  });

  /* ---------- menüler ---------- */
  function renderLevels(){
    const box = $("levels"); box.textContent = "";
    LEVELS.forEach((lv, i) => {
      const b = document.createElement("button");
      b.type = "button"; b.className = "lvl";
      b.setAttribute("aria-label", `Bölüm ${i + 1}, ${lv.n} resim${best[i] ? ", " + best[i] + " yıldız" : ""}`);
      b.innerHTML = `<span class="ic" aria-hidden="true">${lv.same ? "🌗" : "🌞"}</span>${i + 1}<small aria-hidden="true">${"★".repeat(best[i] || 0)}</small>`;
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
  window.__gb = { GROUPS, LEVELS, startLevel, tryMatch, get st(){ return {level, round, mistakes, left}; } };
})();
