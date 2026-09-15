/* Çabuk Bas! — 2-4 kişilik hız oyunu */
(function(){
  "use strict";

  const SETS = [
    [["🐸","kurbağa"],["🐶","köpek"],["🐱","kedi"],["🐵","maymun"],["🐰","tavşan"],["🦁","aslan"],["🐼","panda"],["🐔","tavuk"],["🐧","penguen"],["🦊","tilki"],["🐮","inek"],["🐯","kaplan"]],
    [["🍎","elma"],["🍌","muz"],["🍇","üzüm"],["🍓","çilek"],["🍉","karpuz"],["🍊","portakal"],["🍐","armut"],["🍒","kiraz"],["🍍","ananas"],["🥝","kivi"]],
    [["🚗","araba"],["🚌","otobüs"],["🚂","tren"],["✈️","uçak"],["🚀","roket"],["🚲","bisiklet"],["🚁","helikopter"],["⛵","yelkenli"],["🚜","traktör"],["🚒","itfaiye"]]
  ];
  const SEATS = [
    {c:"#3D6BF2", d:"#2A4FC0", av:"🚀", key:"a"},
    {c:"#FF7A2F", d:"#D65A14", av:"🎈", key:"l"},
    {c:"#E4508F", d:"#B8316C", av:"🌸", key:"q"},
    {c:"#12A594", d:"#0B7A6D", av:"⭐", key:"p"}
  ];
  const ADV = {yok:0, biraz:.3, cok:.6};
  const ADV_LABEL = {yok:"Yok", biraz:"Biraz", cok:"Çok"};
  const DEFAULT = [{name:"Enes", adv:"yok"}, {name:"Egemen", adv:"cok"}];
  const FREEZE = 1.5;
  const SETTINGS_KEY = "cabuk-bas-ayar", SOUND_KEY = "cabuk-bas-ses";
  const RM = window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches;

  const $ = id => document.getElementById(id);
  const rand = (a, b) => a + Math.random()*(b - a);
  const cap = s => s.charAt(0).toLocaleUpperCase("tr") + s.slice(1);
  const esc = s => String(s).replace(/[&<>"']/g, ch => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[ch]));

  let settings = {players:DEFAULT.map(p => Object.assign({}, p)), goal:5};
  try { const s = JSON.parse(localStorage.getItem(SETTINGS_KEY) || "null"); if (s && Array.isArray(s.players) && s.players.length >= 2) settings = s; } catch(e) {}
  let soundOn = true;
  try { soundOn = localStorage.getItem(SOUND_KEY) !== "0"; } catch(e) {}

  let G = null;
  let timer = null;

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
    g.gain.setValueAtTime(.0001, n); g.gain.exponentialRampToValueAtTime(vol || .1, n + .008); g.gain.exponentialRampToValueAtTime(.0001, n + dur);
    o.connect(g).connect(a.destination); o.start(n); o.stop(n + dur + .05);
  }
  const sfx = {
    tick(){ tone(520, .04, "sine", .03); },
    target(){ tone(880, .08, "square", .04); },
    score(){ tone(784, .12, "triangle", .15); tone(1174.66, .22, "triangle", .14, null, .1); },
    early(){ tone(180, .3, "sawtooth", .07, 120); },
    miss(){ tone(400, .2, "sine", .06, 300); },
    win(){ [523.25, 659.25, 783.99, 1046.5, 1318.5].forEach((f, i) => tone(f, .28, "triangle", .15, null, i*.12)); }
  };
  const canSpeak = "speechSynthesis" in window;
  let trVoice = null;
  function pickVoice(){ trVoice = speechSynthesis.getVoices().find(v => /^tr(-|_|$)/i.test(v.lang)) || null; }
  if (canSpeak){ pickVoice(); if (speechSynthesis.addEventListener) speechSynthesis.addEventListener("voiceschanged", pickVoice); }
  function say(text){
    if (!canSpeak || !soundOn || !trVoice) return;
    speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text); u.voice = trVoice; u.lang = trVoice.lang; u.rate = 1.05; u.pitch = 1.1;
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

  /* ---------- düzen ---------- */
  function buildPads(){
    const top = $("pads-top"), bottom = $("pads-bottom");
    top.innerHTML = ""; bottom.innerHTML = "";
    const n = G.players.length;
    $("arena").classList.toggle("two", n === 2);
    G.players.forEach((p, i) => {
      const b = document.createElement("button");
      b.type = "button"; b.className = "pad"; b.id = "pad-" + i;
      b.style.setProperty("--c", p.c); b.style.setProperty("--c-dark", p.d);
      b.setAttribute("aria-label", `${p.name} düğmesi`);
      b.innerHTML = `<span class="av" aria-hidden="true">${p.av}</span>
        <span class="info"><span class="nm">${esc(p.name)}</span><span class="dots">${Array.from({length:settings.goal}, () => "<i></i>").join("")}</span></span>
        <span class="side"><span class="mini" aria-hidden="true"></span><span class="key">${p.key.toUpperCase()}</span></span>
        <span class="ice" aria-hidden="true">❄️</span>`;
      b.addEventListener("pointerdown", e => { e.preventDefault(); press(i); });
      b.addEventListener("click", e => { if (e.detail === 0) press(i); });
      // 2 kişide biri üstte (ters), biri altta; 3-4 kişide ikişer
      const onTop = n === 2 ? i === 1 : i >= 2;
      (onTop ? top : bottom).appendChild(b);
    });
    renderPads();
  }
  function renderPads(){
    G.players.forEach((p, i) => {
      const pad = $("pad-" + i);
      if (!pad) return;
      [...pad.querySelectorAll(".dots i")].forEach((d, k) => d.classList.toggle("on", k < p.score));
      pad.querySelector(".mini").textContent = G.target ? G.target[0] : "❔";
    });
  }
  function setMsg(t){ $("msg").textContent = t; }

  /* ---------- oyun ---------- */
  function newGame(){
    clearTimeout(timer);
    G = {
      players:settings.players.map((p, i) => ({name:(p.name || "").trim() || `Oyuncu ${i + 1}`, adv:ADV[p.adv] || 0, score:0, frozenUntil:0, c:SEATS[i].c, d:SEATS[i].d, av:SEATS[i].av, key:SEATS[i].key})),
      target:null, current:null, isTarget:false, shownAt:0, claimed:false, since:0, over:false, lastSet:-1
    };
    buildPads();
    $("end").hidden = true;
    nextRound(true);
  }

  function now(){ return performance.now()/1000; }

  function nextRound(first){
    clearTimeout(timer);
    if (!G || G.over) return;
    let s;
    do { s = Math.random()*SETS.length | 0; } while (SETS.length > 1 && s === G.lastSet && Math.random() < .7);
    G.lastSet = s; G.set = SETS[s];
    G.target = G.set[Math.random()*G.set.length | 0];
    G.claimed = false; G.isTarget = false; G.since = 0;
    $("t-emo").textContent = G.target[0];
    $("show-emo").textContent = "👀";
    $("show").classList.remove("hot");
    renderPads();
    setMsg(`${cap(G.target[1])} çıkınca bas!`);
    say(`${cap(G.target[1])} çıkınca bas!`);
    timer = setTimeout(flashNext, first ? 2200 : 1800);
  }

  function flashNext(){
    if (!G || G.over || G.claimed) return;
    // aranan resim en geç 5-6 resimde bir çıkar
    const forceTarget = G.since >= 5 || (G.since >= 2 && Math.random() < .3);
    let item;
    if (forceTarget) item = G.target;
    else {
      const others = G.set.filter(x => x !== G.target && x !== G.current);
      item = others[Math.random()*others.length | 0];
    }
    G.current = item;
    G.isTarget = item === G.target;
    G.since = G.isTarget ? 0 : G.since + 1;
    G.shownAt = now();
    const el = $("show-emo");
    el.textContent = item[0];
    el.classList.remove("pop"); void el.offsetWidth; if (!RM) el.classList.add("pop");
    $("show").classList.toggle("hot", G.isTarget);
    if (G.isTarget) sfx.target(); else sfx.tick();
    const dur = G.isTarget ? rand(1.3, 1.7) : rand(.7, 1.15);
    timer = setTimeout(() => {
      if (!G || G.over || G.claimed) return;
      if (G.isTarget){
        // kimse yakalayamadı
        G.isTarget = false; sfx.miss();
        setMsg("Kaçtı! Tekrar geliyor…");
      }
      flashNext();
    }, dur*1000);
  }

  function press(i){
    audio();
    if (!G || G.over) return;
    const p = G.players[i], pad = $("pad-" + i), t = now();
    if (pad){ pad.classList.remove("press"); void pad.offsetWidth; pad.classList.add("press"); setTimeout(() => pad.classList.remove("press"), 120); }
    if (t < p.frozenUntil || G.claimed || !G.current) return;
    const maxAdv = Math.max(...G.players.map(x => x.adv));
    if (G.isTarget){
      // avantajı az olan biraz bekler; erken basış yok sayılır, ceza verilmez
      if (t - G.shownAt < maxAdv - p.adv) return;
      G.claimed = true; clearTimeout(timer);
      p.score++;
      sfx.score();
      if (pad && !RM){ pad.classList.remove("winflash"); void pad.offsetWidth; pad.classList.add("winflash"); }
      renderPads();
      if (p.score >= settings.goal){ finish(i); return; }
      setMsg(`${p.name} aldı!`);
      say(`${p.name} aldı!`);
      timer = setTimeout(() => nextRound(false), 1400);
    } else {
      p.frozenUntil = t + FREEZE;
      sfx.early();
      if (pad){ pad.classList.add("frozen"); setTimeout(() => pad.classList.remove("frozen"), FREEZE*1000); }
      setMsg(`${p.name} erken bastı, dondu!`);
    }
  }

  function finish(i){
    G.over = true; clearTimeout(timer);
    const w = G.players[i];
    setMsg(`${w.name} kazandı!`);
    sfx.win(); say(`${w.name} kazandı! Tebrikler!`);
    const ranked = G.players.slice().sort((a, b) => b.score - a.score);
    let rank = 0, prev = null;
    $("podium").innerHTML = ranked.map((p, k) => {
      if (p.score !== prev){ rank = k + 1; prev = p.score; }
      return `<li><span>${rank}.</span><span class="av" style="background:${p.c}">${p.av}</span><span>${esc(p.name)}</span><span class="pts">${p.score}</span></li>`;
    }).join("");
    $("end-title").textContent = `${w.name} kazandı!`;
    setTimeout(() => { if (G && G.over){ $("end").hidden = false; $("again").focus({preventScroll:true}); } }, 900);
  }

  window.addEventListener("keydown", e => {
    if (e.repeat || !$("setup").hidden || (e.target && e.target.tagName === "INPUT")) return;
    if (!$("end").hidden){ if (e.key === "Enter"){ e.preventDefault(); newGame(); } return; }
    if (!G) return;
    const i = G.players.findIndex(p => p.key === e.key.toLowerCase());
    if (i >= 0){ e.preventDefault(); press(i); }
  });
  // başka uygulamaya geçince durur, geri dönünce yeni turla devam eder
  document.addEventListener("visibilitychange", () => {
    if (!G || G.over) return;
    if (document.hidden){ clearTimeout(timer); G.claimed = true; G.paused = true; }
    else if (G.paused && $("setup").hidden){ G.paused = false; nextRound(false); }
  });

  /* ---------- ayarlar ---------- */
  function renderSetup(){
    const box = $("p-rows");
    box.innerHTML = "";
    settings.players.forEach((p, i) => {
      const row = document.createElement("div");
      row.className = "p-row";
      row.innerHTML = `<span class="sw" style="background:${SEATS[i].c}" aria-hidden="true">${SEATS[i].av}</span>
        <input type="text" id="pn-${i}" maxlength="12" value="${esc(p.name)}" aria-label="${i + 1}. oyuncunun adı" placeholder="Adı" autocomplete="off">
        <div class="seg" role="radiogroup" aria-label="${i + 1}. oyuncunun avantajı">
          ${Object.keys(ADV).map(k => `<label><input type="radio" name="adv-${i}" id="adv-${i}-${k}" value="${k}" ${p.adv === k ? "checked" : ""}><span>${ADV_LABEL[k]}</span></label>`).join("")}
        </div>`;
      box.appendChild(row);
    });
    $("add-player").disabled = settings.players.length >= SEATS.length;
    $("remove-player").disabled = settings.players.length <= 2;
    const g = $("goal-" + settings.goal); if (g) g.checked = true;
  }
  function readSetup(){
    settings.players = settings.players.map((p, i) => {
      const sel = document.querySelector(`input[name="adv-${i}"]:checked`);
      return {name:$("pn-" + i).value.trim(), adv:sel ? sel.value : "yok"};
    });
    const g = document.querySelector('input[name="goal"]:checked');
    settings.goal = g ? +g.value : 5;
  }
  $("add-player").addEventListener("click", () => { readSetup(); if (settings.players.length < 4) settings.players.push({name:"", adv:"yok"}); renderSetup(); });
  $("remove-player").addEventListener("click", () => { readSetup(); if (settings.players.length > 2) settings.players.pop(); renderSetup(); });
  $("setup-form").addEventListener("submit", e => {
    e.preventDefault();
    readSetup();
    try { localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings)); } catch(err) {}
    audio();
    $("setup").hidden = true;
    newGame();
  });
  function openSetup(){
    clearTimeout(timer);
    if (G) G.claimed = true;
    renderSetup();
    $("end").hidden = true;
    $("setup").hidden = false;
    $("start").focus({preventScroll:true});
  }
  $("open-setup").addEventListener("click", openSetup);
  $("end-setup").addEventListener("click", openSetup);
  $("again").addEventListener("click", newGame);

  // açılışta arkada oyuncu düğmeleri görünsün
  renderSetup();
  G = {players:settings.players.map((p, i) => ({name:(p.name || "").trim() || `Oyuncu ${i + 1}`, adv:0, score:0, frozenUntil:0, c:SEATS[i].c, d:SEATS[i].d, av:SEATS[i].av, key:SEATS[i].key})), target:null, over:true};
  buildPads();
  G = null;
})();
