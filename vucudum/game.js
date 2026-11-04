/* Vücudumu Tanıyorum — Egemen için vücut bölümleri oyunu */
(function(){
  "use strict";

  const SAVE = "vucudum", SOUND_KEY = "vucudum-ses", PER_LEVEL = 6;
  const RAINBOW = ["#E4483B", "#C98F00", "#2A64C0", "#1E8A41", "#6E36B8"];
  // bölümler: ad, “… göster” hâli
  const PART = {
    sac:{ad:"saç", acc:"Saçı"}, goz:{ad:"göz", acc:"Gözü"}, kulak:{ad:"kulak", acc:"Kulağı"}, burun:{ad:"burun", acc:"Burnu"}, agiz:{ad:"ağız", acc:"Ağzı"},
    el:{ad:"el", acc:"Eli"}, kol:{ad:"kol", acc:"Kolu"}, karin:{ad:"karın", acc:"Karnı"}, bacak:{ad:"bacak", acc:"Bacağı"}, ayak:{ad:"ayak", acc:"Ayağı"}
  };
  const USE = [["goz", "Hangisiyle görürüz?"], ["kulak", "Hangisiyle duyarız?"], ["burun", "Hangisiyle koklarız?"], ["agiz", "Hangisiyle yemek yeriz?"], ["el", "Hangisiyle tutarız?"], ["ayak", "Hangisiyle yürürüz?"], ["kol", "Hangisiyle sarılırız?"]];
  const LEVELS = [
    {parts:["sac", "goz", "kulak", "burun", "agiz"]},
    {parts:["el", "kol", "karin", "bacak", "ayak"]},
    {parts:Object.keys(PART)},
    {use:true},
    {parts:Object.keys(PART), use:true}
  ];

  const $ = id => document.getElementById(id);
  const rnd = n => Math.floor(Math.random()*n);

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

  /* ---------- çocuk resmi ---------- */
  const FIG = `<svg class="fig" id="fig" viewBox="0 0 300 520" role="img" aria-label="Çocuk resmi">
    <g data-p="bacak"><rect x="110" y="330" width="34" height="120" rx="14" fill="#2A64C0"/><rect x="156" y="330" width="34" height="120" rx="14" fill="#2A64C0"/></g>
    <g data-p="ayak"><ellipse cx="122" cy="462" rx="30" ry="15" fill="#E5484D"/><ellipse cx="178" cy="462" rx="30" ry="15" fill="#E5484D"/></g>
    <g data-p="kol"><rect x="54" y="205" width="30" height="110" rx="14" fill="#FFB547" transform="rotate(12 69 205)"/><rect x="216" y="205" width="30" height="110" rx="14" fill="#FFB547" transform="rotate(-12 231 205)"/></g>
    <g data-p="el"><circle cx="58" cy="322" r="19" fill="#F2C29B"/><circle cx="242" cy="322" r="19" fill="#F2C29B"/></g>
    <g data-p="karin"><rect x="92" y="190" width="116" height="150" rx="30" fill="#FFC529"/><circle cx="150" cy="275" r="4" fill="#C98F00"/></g>
    <rect x="136" y="170" width="28" height="26" fill="#F2C29B"/>
    <g data-p="kulak"><ellipse cx="88" cy="110" rx="14" ry="20" fill="#E8AE85"/><ellipse cx="212" cy="110" rx="14" ry="20" fill="#E8AE85"/></g>
    <circle cx="150" cy="108" r="64" fill="#F2C29B"/>
    <g data-p="sac"><path d="M86 96c0-46 30-66 64-66s64 20 64 66c-10-16-26-26-40-28 6 10 6 18 4 22-14-14-40-26-62-24-14 2-24 14-30 30z" fill="#6B4226"/></g>
    <g data-p="goz"><ellipse cx="124" cy="104" rx="12" ry="14" fill="#fff"/><circle cx="126" cy="106" r="7" fill="#2A2540"/><ellipse cx="176" cy="104" rx="12" ry="14" fill="#fff"/><circle cx="178" cy="106" r="7" fill="#2A2540"/></g>
    <g data-p="burun"><path d="M150 112c-8 14-10 22-2 24 6 2 12 0 14-4" fill="#E8AE85" stroke="#C98A60" stroke-width="3"/></g>
    <g data-p="agiz"><path d="M126 146q24 22 48 0q-24 8-48 0z" fill="#C2414A"/><path d="M134 150q16 10 32 0" fill="#fff"/></g>
    <text class="label" id="lbl" x="150" y="505" text-anchor="middle"></text>
  </svg>`;

  /* ---------- oyun ---------- */
  let level = 0, q = 0, mistakes = 0, target = null, busy = false, idleT = null, lastT = null;

  function startLevel(i){
    level = Math.max(0, Math.min(LEVELS.length - 1, i)); q = 0; mistakes = 0;
    $("intro").hidden = true; $("done").hidden = true; $("party").hidden = true;
    $("figwrap").innerHTML = FIG;
    $("fig").querySelectorAll("[data-p]").forEach(g => {
      g.setAttribute("role", "button"); g.setAttribute("tabindex", "0"); g.setAttribute("aria-label", PART[g.dataset.p].ad);
      g.addEventListener("click", () => { audio(); pick(g); });
      g.addEventListener("keydown", e => { if (e.key === "Enter" || e.key === " "){ e.preventDefault(); audio(); pick(g); } });
    });
    next();
  }
  function next(){
    const L = LEVELS[level]; busy = false;
    let p, text;
    do {
      const useIt = L.use && (!L.parts || Math.random() < .5);
      if (useIt){ const u = USE[rnd(USE.length)]; p = u[0]; text = u[1]; }
      else { p = L.parts[rnd(L.parts.length)]; text = `${PART[p].acc} göster!`; }
    } while (p === lastT);
    target = p; lastT = p;
    $("task").textContent = text; $("lbl").textContent = ""; say(text);
    renderDots(); armIdle();
  }
  function renderDots(){
    const d = $("dots"); d.textContent = "";
    for (let i = 0; i < PER_LEVEL; i++){ const e = document.createElement("i"); if (i < q) e.className = "on"; d.appendChild(e); }
  }
  function flash(g, cls){ g.classList.remove("ok", "no"); void g.getBBox(); g.classList.add(cls); setTimeout(() => g.classList.remove(cls), 800); }
  function armIdle(){
    clearTimeout(idleT);
    document.querySelectorAll("#fig .hint").forEach(g => g.classList.remove("hint"));
    idleT = setTimeout(() => { const g = $("fig").querySelector(`[data-p="${target}"]`); if (g && !busy){ g.classList.add("hint"); say("Parlayan yere dokun."); } }, 8000);
  }
  function pick(g){
    if (busy) return false;
    const p = g.dataset.p;
    if (p === target){
      busy = true; clearTimeout(idleT); g.classList.remove("hint"); flash(g, "ok"); sfx.ok(); q++; renderDots();
      $("lbl").textContent = PART[p].ad.toLocaleUpperCase("tr-TR");
      say(`Evet, ${PART[p].ad}!`);
      if (q >= PER_LEVEL) setTimeout(finishLevel, 1400); else setTimeout(next, 1600);
      return true;
    }
    mistakes++; sfx.no(); flash(g, "no");
    say(`Bu ${PART[p].ad}. Bir daha bak.`);
    return false;
  }
  function starsNow(){ return mistakes <= 1 ? 3 : mistakes <= 3 ? 2 : 1; }
  function finishLevel(){
    const s = starsNow();
    best[level] = Math.max(best[level] || 0, s); persist(); renderLevels();
    if (level === LEVELS.length - 1){ $("party").hidden = false; sfx.party(); say("Aferin Egemen! Vücudunu çok iyi tanıyorsun!"); return; }
    [...$("stars").children].forEach((el, i) => { el.className = ""; void el.offsetWidth; if (i < s) el.className = "on"; });
    $("stars").setAttribute("aria-label", s + " yıldız");
    $("done").hidden = false; sfx.party();
  }

  /* ---------- menüler ---------- */
  function renderLevels(){
    const box = $("levels"); box.textContent = "";
    const IC = ["🙂", "🖐️", "🧍", "❓", "⭐"];
    LEVELS.forEach((lv, i) => {
      const b = document.createElement("button");
      b.type = "button"; b.className = "lvl";
      b.setAttribute("aria-label", `Bölüm ${i + 1}${best[i] ? ", " + best[i] + " yıldız" : ""}`);
      b.innerHTML = `<span class="ic" aria-hidden="true">${IC[i]}</span>${i + 1}<small aria-hidden="true">${"★".repeat(best[i] || 0)}</small>`;
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

  window.__vc = { startLevel, pick, get st(){ return {level, q, mistakes, target}; } };
})();
