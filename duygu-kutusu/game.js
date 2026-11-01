/* Duygu Kutusu — Egemen için duyguları tanıma oyunu */
(function(){
  "use strict";

  const SAVE = "duygu-kutusu", SOUND_KEY = "duygu-kutusu-ses", PER_LEVEL = 5;
  const RAINBOW = ["#E4483B", "#C98F00", "#2A64C0", "#1E8A41", "#6E36B8"];
  // duygular: yüz, ad, -i hâli (“... yüzü bul”)
  const FEEL = {
    mutlu:  {e:"😀", ad:"mutlu"},
    uzgun:  {e:"😢", ad:"üzgün"},
    kizgin: {e:"😠", ad:"kızgın"},
    korku:  {e:"😨", ad:"korkmuş"},
    sasir:  {e:"😮", ad:"şaşkın"},
    uyku:   {e:"😴", ad:"uykulu"}
  };
  // olaylar: resim, anlatım, doğru duygu, açıklama
  const EVENTS = [
    ["🎁", "Doğum gününde hediye aldı.", "mutlu", "Hediye almak insanı sevindirir."],
    ["🍦⬇️", "Dondurması yere düştü.", "uzgun", "Sevdiği bir şeyi kaybedince insan üzülür."],
    ["⛈️⚡", "Gece gök gürledi, çok ses çıktı.", "korku", "Ani yüksek sesler insanı korkutabilir."],
    ["🧱👟", "Arkadaşı yaptığı kuleyi devirdi.", "kizgin", "Emeği bozulunca insan kızabilir."],
    ["🎉🎈", "Kapıyı açınca herkes “Sürpriz!” dedi.", "sasir", "Beklemediğimiz bir şey olunca şaşırırız."],
    ["🌙🛏️", "Çok geç oldu, gözleri kapanıyor.", "uyku", "Yorulunca uykumuz gelir."],
    ["🐶❤️", "Köpeğiyle parkta oynuyor.", "mutlu", "Sevdiklerimizle oynamak bizi mutlu eder."],
    ["🧸💔", "En sevdiği oyuncağı kırıldı.", "uzgun", "Sevdiğimiz şey kırılınca üzülürüz."],
    ["🕷️", "Yastığının üstünde kocaman bir örümcek gördü.", "korku", "Beklemediğimiz bir hayvan bizi korkutabilir."],
    ["🎢🙅", "Sırası gelmişken biri önüne geçti.", "kizgin", "Haksızlık olunca insan kızar."],
    ["🎩🐰", "Sihirbaz şapkasından tavşan çıkardı!", "sasir", "Sihirbazlık gösterisi insanı şaşırtır."],
    ["🏖️☀️", "Denize gittiler, kumdan kale yapıyor.", "mutlu", "Tatil ve oyun insanı mutlu eder."],
    ["🥱📚", "Uzun bir günün sonunda kitap okunuyor.", "uyku", "Akşam masalı uyku getirir."],
    ["👋🚌", "En yakın arkadaşı başka şehre taşındı.", "uzgun", "Sevdiğimiz biri uzaklaşınca özleriz, üzülürüz."]
  ];
  // bölümler: tür (face = yüzü bul, event = olay), kaç yüz
  const LEVELS = [{t:"face", n:2}, {t:"face", n:3}, {t:"face", n:4}, {t:"event", n:3}, {t:"face", n:6}, {t:"event", n:4}, {t:"event", n:6}];

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
  const sfx = {
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

  /* ---------- oyun ---------- */
  let level = 0, q = 0, mistakes = 0, cur = null, busy = false, usedEv = [], lastFeel = null;

  function startLevel(i){
    level = Math.max(0, Math.min(LEVELS.length - 1, i)); q = 0; mistakes = 0; usedEv = [];
    $("intro").hidden = true; $("done").hidden = true; $("party").hidden = true;
    next();
  }
  function next(){
    const L = LEVELS[level]; busy = false;
    let answer, scene = "", speak = "";
    if (L.t === "event"){
      let ev; do { ev = EVENTS[rnd(EVENTS.length)]; } while ((usedEv.includes(ev) && usedEv.length < EVENTS.length) || ev[2] === lastFeel);
      usedEv.push(ev); answer = ev[2];
      cur = {answer, why:ev[3]};
      scene = `<div class="pic" aria-hidden="true">${ev[0]}</div><div class="tx">${ev[1]}</div>`;
      speak = ev[1] + " Nasıl hisseder?";
      $("mid").textContent = "Nasıl hisseder?";
    } else {
      const keys = Object.keys(FEEL);
      do { answer = keys[rnd(keys.length)]; } while (answer === lastFeel);
      cur = {answer};
      scene = `<div class="tx">${cap(FEEL[answer].ad)} yüzü bul!</div>`;
      speak = `${cap(FEEL[answer].ad)} yüzü bul!`;
      $("mid").textContent = "";
    }
    lastFeel = answer;
    const others = shuffle(Object.keys(FEEL).filter(k => k !== answer)).slice(0, L.n - 1);
    const opts = shuffle([answer, ...others]);
    const box = $("faces"); box.textContent = "";
    for (const k of opts){
      const b = document.createElement("button"); b.type = "button"; b.className = "it face";
      b.innerHTML = `${FEEL[k].e}<small>${L.t === "face" && level < 2 ? "" : FEEL[k].ad}</small>`;
      b.dataset.k = k; b.setAttribute("aria-label", FEEL[k].ad);
      b.addEventListener("click", () => { audio(); pick(b); });
      box.appendChild(b);
    }
    $("scene").innerHTML = scene; say(speak); renderDots();
  }
  const cap = s => s.charAt(0).toLocaleUpperCase("tr-TR") + s.slice(1);
  function renderDots(){
    const d = $("dots"); d.textContent = "";
    for (let i = 0; i < PER_LEVEL; i++){ const e = document.createElement("i"); if (i < q) e.className = "on"; d.appendChild(e); }
  }
  function pick(b){
    if (busy || !cur) return false;
    const k = b.dataset.k;
    if (k === cur.answer){
      busy = true; b.classList.add("ok"); sfx.ok(); q++; renderDots();
      say(cur.why ? `Evet, ${FEEL[k].ad}. ${cur.why}` : `Evet! Bu ${FEEL[k].ad} yüz.`);
      if (q >= PER_LEVEL) setTimeout(finishLevel, cur.why ? 3200 : 1600);
      else setTimeout(next, cur.why ? 3400 : 1700);
      return true;
    }
    mistakes++; sfx.no(); b.classList.remove("no"); void b.offsetWidth; b.classList.add("no");
    say(`Bu ${FEEL[k].ad} yüz. Bir daha bak.`);
    return false;
  }
  function starsNow(){ return mistakes <= 1 ? 3 : mistakes <= 3 ? 2 : 1; }
  function finishLevel(){
    const s = starsNow();
    best[level] = Math.max(best[level] || 0, s); persist(); renderLevels();
    if (level === LEVELS.length - 1){ $("party").hidden = false; sfx.party(); say("Aferin Egemen! Duyguları çok iyi tanıyorsun!"); return; }
    [...$("stars").children].forEach((el, i) => { el.className = ""; void el.offsetWidth; if (i < s) el.className = "on"; });
    $("stars").setAttribute("aria-label", s + " yıldız");
    $("done").hidden = false; sfx.party(); say("Aferin!");
  }

  /* ---------- menüler ---------- */
  function renderLevels(){
    const box = $("levels"); box.textContent = "";
    LEVELS.forEach((lv, i) => {
      const b = document.createElement("button");
      b.type = "button"; b.className = "lvl";
      b.setAttribute("aria-label", `Bölüm ${i + 1}${lv.t === "event" ? ", olaylar" : ", yüzler"}${best[i] ? ", " + best[i] + " yıldız" : ""}`);
      b.innerHTML = `<span class="ic" aria-hidden="true">${lv.t === "event" ? "📖" : "😀"}</span>${i + 1}<small aria-hidden="true">${"★".repeat(best[i] || 0)}</small>`;
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

  renderLevels();
  startLevel(0); $("intro").hidden = false; if (canSpeak) speechSynthesis.cancel();

  // test kancası
  window.__dk = { EVENTS, FEEL, startLevel, pick, get st(){ return {level, q, mistakes, cur}; } };
})();
