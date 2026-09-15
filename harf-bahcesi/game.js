/* Harf Bahçesi — Türk alfabesini resimlerle öğrenme */
(function(){
  "use strict";

  // n: harfin okunuşu. end: harf kelimenin başında değil sonunda (Ğ ile kelime başlamaz)
  const LETTERS = [
    {l:"A", n:"a", w:"ARI", e:"🐝"},          {l:"B", n:"be", w:"BALIK", e:"🐟"},
    {l:"C", n:"ce", w:"CİVCİV", e:"🐥"},      {l:"Ç", n:"çe", w:"ÇİLEK", e:"🍓"},
    {l:"D", n:"de", w:"DONDURMA", e:"🍦"},    {l:"E", n:"e", w:"ELMA", e:"🍎"},
    {l:"F", n:"fe", w:"FİL", e:"🐘"},          {l:"G", n:"ge", w:"GÜNEŞ", e:"☀️"},
    {l:"Ğ", n:"yumuşak ge", w:"DAĞ", e:"⛰️", end:true},
    {l:"H", n:"he", w:"HOROZ", e:"🐓"},       {l:"I", n:"ı", w:"ISPANAK", e:"🥬"},
    {l:"İ", n:"i", w:"İNEK", e:"🐄"},          {l:"J", n:"je", w:"JİMNASTİK", e:"🤸"},
    {l:"K", n:"ke", w:"KEDİ", e:"🐱"},         {l:"L", n:"le", w:"LİMON", e:"🍋"},
    {l:"M", n:"me", w:"MUZ", e:"🍌"},          {l:"N", n:"ne", w:"NOTA", e:"🎵"},
    {l:"O", n:"o", w:"OTOBÜS", e:"🚌"},        {l:"Ö", n:"ö", w:"ÖRDEK", e:"🦆"},
    {l:"P", n:"pe", w:"PANDA", e:"🐼"},        {l:"R", n:"re", w:"ROKET", e:"🚀"},
    {l:"S", n:"se", w:"SAAT", e:"⏰"},         {l:"Ş", n:"şe", w:"ŞEMSİYE", e:"☂️"},
    {l:"T", n:"te", w:"TAVŞAN", e:"🐰"},       {l:"U", n:"u", w:"UÇAK", e:"✈️"},
    {l:"Ü", n:"ü", w:"ÜZÜM", e:"🍇"},          {l:"V", n:"ve", w:"VAPUR", e:"⛴️"},
    {l:"Y", n:"ye", w:"YILDIZ", e:"⭐"},       {l:"Z", n:"ze", w:"ZÜRAFA", e:"🦒"}
  ];
  const WORDS = [
    {w:"ARI", e:"🐝"}, {w:"FİL", e:"🐘"}, {w:"MUZ", e:"🍌"},
    {w:"KEDİ", e:"🐱"}, {w:"ELMA", e:"🍎"}, {w:"İNEK", e:"🐄"}, {w:"ÜZÜM", e:"🍇"}, {w:"UÇAK", e:"✈️"}, {w:"SAAT", e:"⏰"}, {w:"TREN", e:"🚂"},
    {w:"BALIK", e:"🐟"}, {w:"PANDA", e:"🐼"}, {w:"ROKET", e:"🚀"}, {w:"LİMON", e:"🍋"}, {w:"ÖRDEK", e:"🦆"}
  ];
  const TILE_COLORS = [["#FF7A6B", "#D95243"], ["#FFB23F", "#D98A12"], ["#5BBE5B", "#3C9A3C"], ["#3DA5F5", "#1F7FCC"], ["#9B7BF5", "#7654D6"], ["#F06BAE", "#C9478A"]];
  const QUIZ_LEN = 10, BUILD_LEN = 6;
  const STORE_KEY = "harf-bahcesi", SOUND_KEY = "harf-bahcesi-ses";
  const RM = window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches;

  const $ = id => document.getElementById(id);
  const shuffle = a => { a = a.slice(); for (let i = a.length - 1; i > 0; i--){ const j = Math.random()*(i + 1) | 0; [a[i], a[j]] = [a[j], a[i]]; } return a; };
  const lower = s => s.toLocaleLowerCase("tr");
  const colorOf = i => TILE_COLORS[i % TILE_COLORS.length];
  const letterIndex = l => LETTERS.findIndex(x => x.l === l);

  let store = {hits:{}};
  try { const s = JSON.parse(localStorage.getItem(STORE_KEY) || "null"); if (s && s.hits) store = s; } catch(e) {}
  const persist = () => { try { localStorage.setItem(STORE_KEY, JSON.stringify(store)); } catch(e) {} };
  const learned = l => (store.hits[l] || 0) >= 2;
  let soundOn = true;
  try { soundOn = localStorage.getItem(SOUND_KEY) !== "0"; } catch(e) {}

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
    g.gain.setValueAtTime(.0001, n); g.gain.exponentialRampToValueAtTime(vol || .1, n + .012); g.gain.exponentialRampToValueAtTime(.0001, n + dur);
    o.connect(g).connect(a.destination); o.start(n); o.stop(n + dur + .05);
  }
  const sfx = {
    tap(){ tone(660, .08, "triangle", .08); },
    good(){ tone(784, .14, "triangle", .14); tone(1174.66, .25, "triangle", .12, null, .1); },
    nope(){ tone(300, .2, "sine", .1, 220); },
    party(){ [523.25, 659.25, 783.99, 1046.5, 1318.5].forEach((f, i) => tone(f, .28, "triangle", .14, null, i*.12)); }
  };
  const canSpeak = "speechSynthesis" in window;
  let trVoice = null;
  function pickVoice(){ trVoice = speechSynthesis.getVoices().find(v => /^tr(-|_|$)/i.test(v.lang)) || null; }
  if (canSpeak){ pickVoice(); if (speechSynthesis.addEventListener) speechSynthesis.addEventListener("voiceschanged", pickVoice); }
  function say(text, queue){
    if (!canSpeak || !soundOn || !trVoice) return;
    if (!queue) speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text); u.voice = trVoice; u.lang = trVoice.lang; u.rate = .85; u.pitch = 1.1;
    speechSynthesis.speak(u);
  }
  const wordSay = w => lower(w).charAt(0).toLocaleUpperCase("tr") + lower(w).slice(1);
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

  function renderLearned(){ $("learned").textContent = `🌱 ${LETTERS.filter(x => learned(x.l)).length}/${LETTERS.length}`; }

  function makeTile(text, colorIdx, extra){
    const b = document.createElement("button");
    b.type = "button"; b.className = "tile";
    const [c, cd] = colorOf(colorIdx);
    b.style.setProperty("--c", c); b.style.setProperty("--cd", cd);
    b.innerHTML = extra ? `${text}${extra}` : text;
    return b;
  }

  /* ---------- modlar ---------- */
  let mode = "explore";
  function setMode(m){
    mode = m;
    document.querySelectorAll(".mode").forEach(b => b.setAttribute("aria-selected", String(b.dataset.mode === m)));
    ["explore", "quiz", "build"].forEach(x => { $("v-" + x).hidden = x !== m; });
    $("party").hidden = true;
    if (canSpeak) speechSynthesis.cancel();
    if (m === "explore") renderGrid();
    if (m === "quiz") startQuiz();
    if (m === "build") startBuild();
  }
  document.querySelectorAll(".mode").forEach(b => b.addEventListener("click", () => { audio(); setMode(b.dataset.mode); }));

  /* ---------- harfleri keşfet ---------- */
  function renderGrid(){
    const grid = $("letter-grid");
    grid.innerHTML = "";
    LETTERS.forEach((x, i) => {
      const t = makeTile(x.l, i, `<span class="emo" aria-hidden="true">${x.e}</span>${learned(x.l) ? '<span class="ok" aria-hidden="true">✓</span>' : ""}`);
      t.setAttribute("aria-label", `${x.l} harfi, ${lower(x.w)}`);
      t.addEventListener("click", () => { audio(); sfx.tap(); openCard(i); });
      grid.appendChild(t);
    });
    renderLearned();
  }

  let cardIdx = 0;
  function openCard(i){
    cardIdx = (i + LETTERS.length) % LETTERS.length;
    const x = LETTERS[cardIdx], [c] = colorOf(cardIdx);
    $("letter-card").style.setProperty("--c", c);
    $("card-letter").innerHTML = `<span>${x.l}</span><small>${lower(x.l)}</small>`;
    $("card-emo").textContent = x.e;
    const w = x.w, pos = x.end ? w.lastIndexOf(x.l) : 0;
    $("card-word").innerHTML = `${w.slice(0, pos)}<b>${w.charAt(pos)}</b>${w.slice(pos + 1)}`;
    $("card-note").hidden = !x.end;
    $("card-note").textContent = x.end ? "Ğ ile başlayan kelime yoktur. Dağ kelimesinin sonunda duyarsın." : "";
    $("card").hidden = false;
    speakCard();
  }
  function speakCard(){
    const x = LETTERS[cardIdx];
    say(x.end ? `${x.n}. ${wordSay(x.w)} kelimesinin sonunda.` : `${x.n}. ${x.n}, ${wordSay(x.w)}!`);
  }
  $("card-listen").addEventListener("click", speakCard);
  $("card-prev").addEventListener("click", () => openCard(cardIdx - 1));
  $("card-next").addEventListener("click", () => openCard(cardIdx + 1));
  $("card-close").addEventListener("click", () => { $("card").hidden = true; });
  $("card").addEventListener("click", e => { if (e.target === $("card")) $("card").hidden = true; });

  /* ---------- yıldızlar ve kutlama ---------- */
  function renderStars(id, total, got){
    $(id).innerHTML = Array.from({length:total}, (_, k) => `<i class="${k < got ? "on" : ""}">⭐</i>`).join("");
  }
  function party(stars, again){
    sfx.party(); confetti();
    $("party-stars").textContent = "⭐".repeat(Math.min(stars, 10));
    $("party").hidden = false;
    $("party-again").onclick = () => { $("party").hidden = true; again(); };
    say("Aferin Egemen! Harikasın!");
  }
  function confetti(){
    if (RM) return;
    const layer = $("confetti"), colors = TILE_COLORS.map(c => c[0]);
    for (let i = 0; i < 90; i++){
      const el = document.createElement("i");
      el.style.left = Math.random()*100 + "%"; el.style.background = colors[i % colors.length];
      el.style.animationDelay = Math.random()*.6 + "s"; el.style.animationDuration = 2 + Math.random()*1.5 + "s";
      el.style.setProperty("--dx", (Math.random()*160 - 80) + "px"); el.style.setProperty("--r", (Math.random()*720 - 360) + "deg");
      layer.appendChild(el);
      setTimeout(() => el.remove(), 4000);
    }
  }

  /* ---------- harfi bul ---------- */
  const Q = {list:[], i:0, stars:0, locked:false, missed:false};
  function startQuiz(){
    // öğrenilmemiş harfler önce gelsin
    const pool = LETTERS.filter(x => !x.end);
    const fresh = shuffle(pool.filter(x => !learned(x.l))), known = shuffle(pool.filter(x => learned(x.l)));
    Q.list = fresh.concat(known).slice(0, QUIZ_LEN);
    Q.list = shuffle(Q.list);
    Q.i = 0; Q.stars = 0;
    showQuiz();
  }
  function quizQuestion(){ const x = Q.list[Q.i]; return `${wordSay(x.w)} hangi harfle başlar?`; }
  function showQuiz(){
    const x = Q.list[Q.i];
    Q.locked = false; Q.missed = false;
    renderStars("quiz-stars", QUIZ_LEN, Q.stars);
    $("quiz-pic").textContent = x.e;
    $("quiz-text").textContent = quizQuestion();
    const distract = shuffle(LETTERS.filter(y => y.l !== x.l && !y.end)).slice(0, 2);
    const opts = shuffle([x].concat(distract));
    const box = $("quiz-options");
    box.innerHTML = "";
    opts.forEach(o => {
      const t = makeTile(o.l, letterIndex(o.l));
      t.setAttribute("aria-label", o.l);
      t.addEventListener("click", () => answerQuiz(o, t));
      box.appendChild(t);
    });
    say(quizQuestion());
  }
  $("quiz-pic").addEventListener("click", () => { audio(); say(quizQuestion()); });
  function answerQuiz(o, t){
    audio();
    if (Q.locked) return;
    const x = Q.list[Q.i];
    if (o.l === x.l){
      Q.locked = true;
      t.classList.add("good"); sfx.good();
      if (!Q.missed){ store.hits[x.l] = (store.hits[x.l] || 0) + 1; persist(); renderLearned(); }
      Q.stars++; renderStars("quiz-stars", QUIZ_LEN, Q.stars);
      say(`Evet! ${x.n}, ${wordSay(x.w)}!`);
      setTimeout(() => {
        Q.i++;
        if (Q.i >= Q.list.length) party(Q.stars, startQuiz);
        else showQuiz();
      }, 1700);
    } else {
      Q.missed = true;
      t.classList.remove("nope"); void t.offsetWidth; t.classList.add("nope");
      sfx.nope();
      say(`Bu ${o.n}. Tekrar dene.`);
    }
  }

  /* ---------- kelime kur ---------- */
  const W = {list:[], i:0, stars:0, pos:0, locked:false};
  function startBuild(){
    const short = shuffle(WORDS.filter(x => x.w.length === 3)).slice(0, 2);
    const mid = shuffle(WORDS.filter(x => x.w.length === 4)).slice(0, 2);
    const long = shuffle(WORDS.filter(x => x.w.length === 5)).slice(0, 2);
    W.list = short.concat(mid, long).slice(0, BUILD_LEN);
    W.i = 0; W.stars = 0;
    showBuild();
  }
  function showBuild(){
    const x = W.list[W.i];
    W.pos = 0; W.locked = false;
    renderStars("build-stars", BUILD_LEN, W.stars);
    $("build-pic").textContent = x.e;
    const letters = [...x.w];
    $("build-slots").innerHTML = letters.map(() => `<span class="slot"></span>`).join("");
    const box = $("build-tiles");
    box.innerHTML = "";
    shuffle(letters.map((l, k) => ({l, k}))).forEach((o, n) => {
      const t = makeTile(o.l, letterIndex(o.l) >= 0 ? letterIndex(o.l) : n);
      t.setAttribute("aria-label", o.l);
      t.addEventListener("click", () => tapBuild(o.l, t));
      box.appendChild(t);
    });
    say(`${wordSay(x.w)}. Harfleri sırayla diz.`);
  }
  $("build-pic").addEventListener("click", () => { audio(); const x = W.list[W.i]; say(wordSay(x.w)); });
  function tapBuild(l, t){
    audio();
    if (W.locked || t.classList.contains("used")) return;
    const x = W.list[W.i], want = x.w.charAt(W.pos);
    const info = LETTERS.find(y => y.l === l);
    if (l === want){
      t.classList.add("used");
      const slot = $("build-slots").children[W.pos];
      slot.textContent = l; slot.classList.add("filled");
      W.pos++;
      sfx.tap();
      if (info) say(info.n);
      if (W.pos >= x.w.length){
        W.locked = true;
        W.stars++; renderStars("build-stars", BUILD_LEN, W.stars);
        sfx.good();
        say(`${wordSay(x.w)}! Aferin!`, true);
        setTimeout(() => {
          W.i++;
          if (W.i >= W.list.length) party(W.stars, startBuild);
          else showBuild();
        }, 1800);
      }
    } else {
      t.classList.remove("nope"); void t.offsetWidth; t.classList.add("nope");
      setTimeout(() => t.classList.remove("nope"), 450);
      sfx.nope();
      const wantInfo = LETTERS.find(y => y.l === want);
      say(wantInfo ? `Şimdi ${wantInfo.n} lazım.` : "Tekrar dene.");
    }
  }

  window.addEventListener("keydown", e => {
    if (!$("card").hidden){
      if (e.key === "ArrowLeft") openCard(cardIdx - 1);
      else if (e.key === "ArrowRight") openCard(cardIdx + 1);
      else if (e.key === "Escape") $("card").hidden = true;
    }
  });

  setMode("explore");
})();
