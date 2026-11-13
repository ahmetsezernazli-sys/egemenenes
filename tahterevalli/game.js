/* Tahterevalli — Egemen için denge oyunu */
(function(){
  "use strict";

  const SAVE = "tahterevalli", SOUND_KEY = "tahterevalli-ses", PER_LEVEL = 5, MAXB = 10;
  const RAINBOW = ["#E4483B", "#C98F00", "#2A64C0", "#1E8A41", "#6E36B8"];
  // hayvanlar: ağırlık blok cinsinden
  const AN = {
    fare:{e:"🐭", ad:"Fare", w:1}, civciv:{e:"🐥", ad:"Civciv", w:1}, tavsan:{e:"🐰", ad:"Tavşan", w:2}, kedi:{e:"🐱", ad:"Kedi", w:3},
    kopek:{e:"🐶", ad:"Köpek", w:4}, kuzu:{e:"🐑", ad:"Kuzu", w:5}, domuz:{e:"🐷", ad:"Domuz", w:6},
    ayi:{e:"🐻", ad:"Ayı", w:12}, at:{e:"🐴", ad:"At", w:15}, inek:{e:"🐮", ad:"İnek", w:20}, fil:{e:"🐘", ad:"Fil", w:30}
  };
  const SMALL = ["fare", "civciv", "tavsan", "kedi", "kopek", "kuzu", "domuz"];
  const LEVELS = [
    {kind:"pick"},
    {kind:"blocks", min:1, max:4},
    {kind:"blocks", min:3, max:8, big:true},
    {kind:"animal", big:true},
    {kind:"two", big:true}
  ];
  const NUM = ["sıfır", "bir", "iki", "üç", "dört", "beş", "altı", "yedi", "sekiz", "dokuz", "on"];

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

  /* ---------- oyun ---------- */
  let level = 0, q = 0, mistakes = 0, busy = false, idleT = null, R = null, lastKey = "";
  const wOf = side => side.reduce((s, k) => s + (k === "b" ? 1 : k === "B" ? 2 : AN[k].w), 0);
  const size = w => w >= 10 ? Math.min(.3, .2 + w * .004) : .12 + w * .018;
  const cap = s => s.charAt(0).toLocaleUpperCase("tr-TR") + s.slice(1);

  function makeRound(){
    const L = LEVELS[level]; let r, key, n = 0;
    do {
      if (L.kind === "pick"){
        const all = Object.keys(AN); let a, b;
        do { a = all[rnd(all.length)]; b = all[rnd(all.length)]; } while (a === b || Math.max(AN[a].w, AN[b].w) < 2 * Math.min(AN[a].w, AN[b].w));
        r = {left:[a], right:[b]}; key = [a, b].sort().join();
      } else if (L.kind === "blocks"){
        const k = L.min + rnd(L.max - L.min + 1); r = {left:Array(k).fill("b"), right:[]}; key = "b" + k;
      } else if (L.kind === "animal"){
        const a = SMALL[rnd(SMALL.length)]; r = {left:[a], right:[]}; key = a;
      } else {
        let a, b; do { a = SMALL[rnd(5)]; b = SMALL[rnd(5)]; } while (a === b || AN[a].w + AN[b].w > 8);
        r = {left:[a, b], right:[]}; key = [a, b].sort().join();
      }
    } while (key === lastKey && ++n < 20);
    lastKey = key; r.kind = L.kind; r.over = false; return r;
  }

  function startLevel(i){
    level = Math.max(0, Math.min(LEVELS.length - 1, i)); q = 0; mistakes = 0;
    $("intro").hidden = true; $("done").hidden = true; $("party").hidden = true;
    next();
  }
  function next(){
    busy = false; R = makeRound();
    const c = $("ctrl"); c.textContent = "";
    if (R.kind !== "pick"){
      c.innerHTML = `<button class="cb rem" id="rem" type="button" aria-label="Bir blok geri al"><svg viewBox="0 0 100 100"><path d="M22 50H78" stroke="#fff" stroke-width="16" stroke-linecap="round"/></svg></button>
        <button class="cb add" id="add" type="button" aria-label="Blok koy"><svg viewBox="0 0 100 100"><rect x="14" y="40" width="46" height="46" rx="8" fill="#fff"/><path d="M74 12v30M59 27h30" stroke="#fff" stroke-width="11" stroke-linecap="round"/></svg></button>`;
      if (LEVELS[level].big) c.insertAdjacentHTML("beforeend", `<button class="cb add big" id="add2" type="button" aria-label="Büyük blok koy, iki blok ağırlığında"><svg viewBox="0 0 100 100"><rect x="4" y="44" width="70" height="38" rx="8" fill="#fff"/><path d="M39 48v30" stroke="#6E36B8" stroke-width="4"/><path d="M80 12v28M66 26h28" stroke="#fff" stroke-width="11" stroke-linecap="round"/></svg></button>`);
      $("add").addEventListener("click", () => { audio(); add(); });
      if ($("add2")) $("add2").addEventListener("click", () => { audio(); add("B"); });
      $("rem").addEventListener("click", () => { audio(); remove(); });
    }
    let text;
    if (R.kind === "pick") text = "Hangisi daha ağır? Ağır olana dokun.";
    else if (R.kind === "blocks") text = LEVELS[level].big ? "Tahterevalliyi dengele! Mor blok iki blok ağırlığında." : "Tahterevalliyi dengele! Yeşil düğmeyle blok koy.";
    else if (R.kind === "animal") text = `${AN[R.left[0]].ad} kaç blok? Blok koyup dengele!`;
    else text = "İki hayvanı bloklarla dengele!";
    $("task").textContent = text; say(text);
    render(true); renderDots(); armIdle();
  }
  function angle(){
    if (R.kind === "pick" && !R.done) return 0;
    const d = wOf(R.right) - wOf(R.left);
    if (!d) return 0;
    return Math.sign(d) * Math.max(5, Math.min(15, Math.abs(d) * 4));
  }
  function render(fresh){
    const pan = (el, side, isRight) => {
      if (fresh) el.textContent = "";
      // yalnız eksik/fazla öğeleri ekle-çıkar ki düşme animasyonu sadece yenide oynasın
      while (el.children.length > side.length) el.lastChild.remove();
      for (let i = el.children.length; i < side.length; i++){
        const k = side[i], b = document.createElement("button"); b.type = "button";
        if (k === "b" || k === "B"){
          b.className = k === "B" ? "blk big" : "blk"; b.setAttribute("aria-label", k === "B" ? "Büyük blok" : "Blok");
          if (isRight) b.addEventListener("click", () => { audio(); remove(); });
          else { b.tabIndex = -1; b.style.cursor = "default"; }
        } else {
          b.className = "ani"; b.dataset.k = k; b.style.fontSize = `calc(var(--w) * ${size(AN[k].w)})`;
          b.setAttribute("aria-label", AN[k].ad); b.textContent = AN[k].e;
          b.addEventListener("click", () => { audio(); pick(b); });
        }
        el.appendChild(b);
      }
    };
    pan($("panL"), R.left, false); pan($("panR"), R.right, true);
    $("beam").style.transform = `rotate(${angle()}deg)`;
    $("scene").classList.toggle("balanced", R.kind !== "pick" && wOf(R.left) === wOf(R.right));
  }
  function renderDots(){
    const d = $("dots"); d.textContent = "";
    for (let i = 0; i < PER_LEVEL; i++){ const e = document.createElement("i"); if (i < q) e.className = "on"; d.appendChild(e); }
  }
  function clearHints(){ document.querySelectorAll(".hint").forEach(e => e.classList.remove("hint")); }
  function armIdle(){
    clearTimeout(idleT); clearHints();
    idleT = setTimeout(() => {
      if (busy || !R) return;
      if (R.kind === "pick"){
        const heavy = AN[R.left[0]].w > AN[R.right[0]].w ? "panL" : "panR";
        $(heavy).firstChild.classList.add("hint"); say("Büyük hayvan daha ağırdır. Parlayana dokun.");
      } else {
        const d = wOf(R.right) - wOf(R.left);
        if (d < 0){ $("add").classList.add("hint"); say("Bu taraf hafif kaldı. Bir blok daha koy."); }
        else if (d > 0){ $("rem").classList.add("hint"); say("Çok oldu. Bir blok geri al."); }
      }
    }, 9000);
  }
  function pick(b){
    if (!R || R.kind !== "pick" || busy) return false;
    const other = R.left[0] === b.dataset.k ? R.right[0] : R.left[0];
    const me = AN[b.dataset.k], ot = AN[other];
    R.done = true; busy = true; clearTimeout(idleT); clearHints(); render();
    if (me.w > ot.w){
      b.classList.add("ok"); sfx.ok(); q++; renderDots();
      say(`Evet! ${me.ad} daha ağır, tahterevalli onun tarafına indi.`);
      setTimeout(roundEnd, 2600); return true;
    }
    mistakes++; b.classList.add("no"); sfx.no();
    say(`Bak, ${ot.ad} daha ağırmış! Tahterevalli onun tarafına indi.`);
    setTimeout(next, 3200);
    return false;
  }
  function add(kind){
    if (!R || R.kind === "pick" || busy) return false;
    if (wOf(R.right) + (kind === "B" ? 2 : 1) > MAXB){ sfx.no(); say("Daha fazla sığmaz! Bir blok geri al."); return false; }
    R.right.push(kind === "B" ? "B" : "b"); tone(330 + wOf(R.right) * 40, .12, "triangle", .1); render(); check(); return true;
  }
  function remove(){
    if (!R || R.kind === "pick" || busy || !R.right.length) return false;
    R.right.pop(); tone(260, .1, "sine", .08); render(); check(); return true;
  }
  function check(){
    armIdle();
    const l = wOf(R.left), r = wOf(R.right);
    if (l === r){
      busy = true; clearTimeout(idleT); sfx.ok(); q++; renderDots();
      let msg = `${cap(NUM[r])} blok! Dengede!`;
      if (R.kind === "animal") msg = `Dengede! ${AN[R.left[0]].ad} ${NUM[r]} blok ağırlığında!`;
      if (R.kind === "two") msg = `Dengede! İkisi birlikte ${NUM[r]} blok!`;
      say(msg); $("task").textContent = msg;
      setTimeout(roundEnd, 2600); return;
    }
    if (r > l){
      if (!R.over){ R.over = true; mistakes++; }
      sfx.no(); say(`${cap(NUM[r])}. Çok oldu! Bir bloğa dokunup geri al.`);
    } else say(cap(NUM[r]));
  }
  function roundEnd(){ if (q >= PER_LEVEL) finishLevel(); else next(); }
  function starsNow(){ return mistakes <= 1 ? 3 : mistakes <= 3 ? 2 : 1; }
  function finishLevel(){
    const s = starsNow();
    best[level] = Math.max(best[level] || 0, s); persist(); renderLevels();
    if (level === LEVELS.length - 1){ $("party").hidden = false; sfx.party(); say("Aferin Egemen! Sen bir denge ustasısın!"); return; }
    [...$("stars").children].forEach((el, i) => { el.className = ""; void el.offsetWidth; if (i < s) el.className = "on"; });
    $("stars").setAttribute("aria-label", s + " yıldız");
    $("done").hidden = false; sfx.party();
  }

  /* ---------- menüler ---------- */
  function renderLevels(){
    const box = $("levels"); box.textContent = "";
    const IC = ["🐘", "🟦", "🧱", "🐱", "🐶"];
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

  window.__tt = { startLevel, add, remove, pick, wOf, roundEnd, get R(){ return R; }, get st(){ return {level, q, mistakes, busy}; } };
})();
