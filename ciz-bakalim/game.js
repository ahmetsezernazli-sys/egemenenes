/* Çiz Bakalım! — aile çizim ve pandomim tahmin oyunu */
(function(){
  "use strict";

  const WORDS = {
    kolay: [
      ["KEDİ","🐱"],["EV","🏠"],["GÜNEŞ","☀️"],["BALIK","🐟"],["ARABA","🚗"],["AĞAÇ","🌳"],["TOP","⚽"],["ELMA","🍎"],
      ["ÇİÇEK","🌸"],["YILDIZ","⭐"],["KALP","❤️"],["AY","🌙"],["BULUT","☁️"],["ŞEMSİYE","☂️"],["DONDURMA","🍦"],["UÇAK","✈️"],
      ["GÖZLÜK","👓"],["SAAT","⏰"],["PASTA","🎂"],["BALON","🎈"],["KÖPEK","🐶"],["YILAN","🐍"],["ÖRÜMCEK","🕷️"],["TAVŞAN","🐰"],
      ["KARDAN ADAM","⛄"],["GEMİ","🚢"],["TREN","🚂"],["KİTAP","📖"],["ANAHTAR","🔑"],["TELEFON","📱"],["ŞAPKA","🎩"],["AYAKKABI","👟"],
      ["MUZ","🍌"],["PİZZA","🍕"],["ROBOT","🤖"],["KUŞ","🐦"],["SALYANGOZ","🐌"],["KAPLUMBAĞA","🐢"],["GÖKKUŞAĞI","🌈"],["FİL","🐘"]
    ],
    zor: [
      ["DOĞUM GÜNÜ","🎂"],["YAĞMUR","🌧️"],["FUTBOL MAÇI","⚽"],["PLAJ","🏖️"],["KORSAN","🏴‍☠️"],["SİHİRBAZ","🧙"],["DİNOZOR","🦖"],["ŞATO","🏰"],
      ["KÖPRÜ","🌉"],["VOLKAN","🌋"],["HAYALET","👻"],["SÜPER KAHRAMAN","🦸"],["KAMP ATEŞİ","🔥"],["HASTANE","🏥"],["KAYAK","⛷️"],["ASTRONOT","👨‍🚀"],
      ["İTFAİYE","🚒"],["AMBULANS","🚑"],["ÇADIR","⛺"],["DENİZ FENERİ",""],["PİRAMİT",""],["DİŞ FIRÇASI",""],["BERBER","💈"],["KÜTÜPHANE","📚"],
      ["LUNAPARK","🎡"],["FOTOĞRAF MAKİNESİ","📷"],["BUZDOLABI",""],["MIKNATIS","🧲"],["TAVLA",""],["ÖRDEK AİLESİ","🦆"],["UZAY GEMİSİ","🚀"],["ORMAN","🌲"]
    ]
  };
  const SEATS = [
    {c:"#3D6BF2", av:"🚀"}, {c:"#FF7A2F", av:"🎈"}, {c:"#E4508F", av:"🌸"}, {c:"#12A594", av:"⭐"}, {c:"#8E5CF5", av:"🌙"}, {c:"#D4A017", av:"☀️"}
  ];
  const CHALK = ["#F3F1E7", "#FFD25A", "#FF8FB1", "#FF9A4D", "#7FD3FF", "#8EE08A", "#FF6B5A", "#C7A6FF"];
  const DEFAULT = {players:["Enes", "Egemen"], mode:"draw", words:"kolay", time:60, rounds:2};
  const SETTINGS_KEY = "ciz-bakalim-ayar", SOUND_KEY = "ciz-bakalim-ses";
  const RING = 119.4;

  const $ = id => document.getElementById(id);
  const esc = s => String(s).replace(/[&<>"']/g, ch => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[ch]));
  const shuffle = a => { a = a.slice(); for (let i = a.length - 1; i > 0; i--){ const j = Math.random()*(i + 1) | 0; [a[i], a[j]] = [a[j], a[i]]; } return a; };

  let settings = Object.assign({}, DEFAULT, {players:DEFAULT.players.slice()});
  try { const s = JSON.parse(localStorage.getItem(SETTINGS_KEY) || "null"); if (s && Array.isArray(s.players) && s.players.length >= 2) settings = Object.assign(settings, s); } catch(e) {}
  let soundOn = true;
  try { soundOn = localStorage.getItem(SOUND_KEY) !== "0"; } catch(e) {}

  function locative(name){
    const low = name.toLocaleLowerCase("tr"), vowels = "aeıioöuü";
    let v = "e";
    for (let i = low.length - 1; i >= 0; i--){ if (vowels.includes(low[i])){ v = low[i]; break; } }
    const hard = "çfhkpsşt".includes(low[low.length - 1]);
    return `${name}'${hard ? "t" : "d"}${"aıou".includes(v) ? "a" : "e"}`;
  }
  function dative(name){
    const low = name.toLocaleLowerCase("tr"), vowels = "aeıioöuü";
    let v = "e";
    for (let i = low.length - 1; i >= 0; i--){ if (vowels.includes(low[i])){ v = low[i]; break; } }
    const endsVowel = vowels.includes(low[low.length - 1]);
    return `${name}'${endsVowel ? "y" : ""}${"aıou".includes(v) ? "a" : "e"}`;
  }

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
  const sfx = {
    tick(){ tone(900, .05, "square", .03); },
    start(){ tone(523.25, .12, "triangle", .12); tone(783.99, .2, "triangle", .12, null, .12); },
    got(){ [659.25, 783.99, 1046.5].forEach((f, i) => tone(f, .18, "triangle", .14, null, i*.09)); },
    timeup(){ tone(300, .6, "sawtooth", .08, 150); },
    pass(){ tone(440, .15, "sine", .08, 330); },
    win(){ [523.25, 659.25, 783.99, 1046.5, 1318.5].forEach((f, i) => tone(f, .28, "triangle", .14, null, i*.12)); }
  };
  const canSpeak = "speechSynthesis" in window;
  let trVoice = null;
  function pickVoice(){ trVoice = speechSynthesis.getVoices().find(v => /^tr(-|_|$)/i.test(v.lang)) || null; }
  if (canSpeak){ pickVoice(); if (speechSynthesis.addEventListener) speechSynthesis.addEventListener("voiceschanged", pickVoice); }
  function say(text){
    if (!canSpeak || !soundOn || !trVoice) return;
    speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text); u.voice = trVoice; u.lang = trVoice.lang; u.pitch = 1.1;
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

  /* ---------- çizim ---------- */
  const cv = $("board"), ctx = cv.getContext("2d");
  let strokes = [], current = null, color = CHALK[0], size = 9, canDraw = false;

  function resize(){
    const r = cv.getBoundingClientRect(), dpr = Math.min(window.devicePixelRatio || 1, 2);
    if (!r.width || !r.height) return;
    cv.width = Math.round(r.width*dpr); cv.height = Math.round(r.height*dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    redraw();
  }
  function drawStroke(s){
    const r = cv.getBoundingClientRect();
    ctx.strokeStyle = s.color; ctx.lineWidth = s.size*Math.max(.6, Math.min(r.width, r.height)/600); ctx.lineCap = "round"; ctx.lineJoin = "round";
    ctx.globalAlpha = .95;
    ctx.beginPath();
    s.pts.forEach((p, i) => { const x = p[0]*r.width, y = p[1]*r.height; i ? ctx.lineTo(x, y) : ctx.moveTo(x, y); });
    if (s.pts.length === 1){ const x = s.pts[0][0]*r.width, y = s.pts[0][1]*r.height; ctx.lineTo(x + .1, y + .1); }
    ctx.stroke(); ctx.globalAlpha = 1;
  }
  function redraw(){
    const r = cv.getBoundingClientRect();
    ctx.clearRect(0, 0, r.width, r.height);
    strokes.forEach(drawStroke);
    if (current) drawStroke(current);
  }
  // noktaları tahtaya göre oranla saklar, ekran dönünce çizim bozulmaz
  const pt = e => { const r = cv.getBoundingClientRect(); return [(e.clientX - r.left)/r.width, (e.clientY - r.top)/r.height]; };
  cv.addEventListener("pointerdown", e => {
    if (!canDraw || current) return;
    e.preventDefault(); audio();
    try { cv.setPointerCapture(e.pointerId); } catch(_) {}
    current = {id:e.pointerId, color, size, pts:[pt(e)]};
    redraw();
  });
  cv.addEventListener("pointermove", e => {
    if (!current || current.id !== e.pointerId) return;
    let evs = e.getCoalescedEvents ? e.getCoalescedEvents() : [];
    if (!evs.length) evs = [e];
    evs.forEach(ev => current.pts.push(pt(ev)));
    redraw();
  });
  ["pointerup", "pointercancel"].forEach(ev => cv.addEventListener(ev, e => {
    if (!current || current.id !== e.pointerId) return;
    strokes.push({color:current.color, size:current.size, pts:current.pts});
    current = null;
  }));

  CHALK.forEach((c, i) => {
    const b = document.createElement("button");
    b.type = "button"; b.className = "color"; b.style.setProperty("--c", c);
    b.setAttribute("role", "radio"); b.setAttribute("aria-label", `Renk ${i + 1}`);
    b.addEventListener("click", () => { color = c; renderTools(); });
    $("colors").appendChild(b);
  });
  document.querySelectorAll(".size").forEach(b => b.addEventListener("click", () => { size = +b.dataset.size; renderTools(); }));
  function renderTools(){
    [...$("colors").children].forEach((b, i) => b.setAttribute("aria-checked", String(CHALK[i] === color)));
    document.querySelectorAll(".size").forEach(b => b.setAttribute("aria-checked", String(+b.dataset.size === size)));
  }
  $("undo").addEventListener("click", () => { strokes.pop(); redraw(); });
  $("clear").addEventListener("click", () => { strokes = []; redraw(); });
  renderTools();

  /* ---------- oyun akışı ---------- */
  let G = null, timerId = null;
  const overlays = ["setup", "handoff", "secret", "credit", "result", "end"];
  const show = id => overlays.forEach(o => { $(o).hidden = o !== id; });

  function wordPool(){
    if (settings.words === "zor") return WORDS.zor;
    if (settings.words === "karisik") return WORDS.kolay.concat(WORDS.zor);
    return WORDS.kolay;
  }
  function nextWord(){
    if (!G.deck.length) G.deck = shuffle(wordPool());
    return G.deck.pop();
  }

  function newGame(){
    clearInterval(timerId);
    G = {
      players:settings.players.map((n, i) => ({name:n, score:0, c:SEATS[i].c, av:SEATS[i].av})),
      deck:shuffle(wordPool()), turn:0, totalTurns:settings.players.length*settings.rounds,
      drawer:0, word:null, left:settings.time, passUsed:false, running:false, lastGain:{}
    };
    $("mime").hidden = settings.mode !== "mime";
    $("tools").hidden = settings.mode === "mime";
    $("who-lbl").textContent = settings.mode === "mime" ? "Anlatan" : "Çizen";
    handoff();
  }

  function handoff(){
    G.drawer = G.turn % G.players.length;
    G.passUsed = false; G.running = false; G.left = settings.time;
    canDraw = false; strokes = []; current = null; redraw();
    const p = G.players[G.drawer];
    const round = Math.floor(G.turn/G.players.length) + 1;
    $("handoff-round").textContent = `${round}. tur · ${G.turn + 1}/${G.totalTurns}`;
    $("handoff-title").textContent = `Sıra ${locative(p.name)}!`;
    $("handoff-note").textContent = `Tableti ${dative(p.name)} ver. Diğerleri ekrana bakmasın 🙈`;
    renderHud();
    show("handoff");
    say(`Sıra ${locative(p.name)}.`);
  }

  function revealWord(){
    audio();
    G.word = nextWord();
    showSecret();
  }
  function showSecret(){
    const [w, e] = G.word;
    $("secret-kicker").textContent = settings.mode === "mime" ? "Bunu anlat" : "Bunu çiz";
    $("secret-emo").textContent = e || "❓";
    $("secret-emo").hidden = !e;
    $("secret-word").textContent = w;
    show("secret");
  }

  function go(){
    show(null);
    G.running = true; canDraw = settings.mode === "draw";
    sfx.start();
    renderHud();
    clearInterval(timerId);
    let lastTick = Date.now();
    timerId = setInterval(() => {
      if (!G || !G.running) return;
      const now = Date.now();
      if (now - lastTick < 1000) return;
      lastTick = now;
      G.left--;
      if (G.left <= 10 && G.left > 0) sfx.tick();
      renderHud();
      if (G.left <= 0) timeUp();
    }, 100);
  }

  function renderHud(){
    const p = G ? G.players[G.drawer] : null;
    $("who-name").textContent = p ? p.name : "—";
    $("who-name").style.color = p ? p.c : "";
    const left = G ? G.left : settings.time;
    $("timer-num").textContent = left;
    $("timer-ring").style.strokeDashoffset = String(RING*(1 - left/(settings.time || 60)));
    $("timer").classList.toggle("low", left <= 10);
    const live = !!(G && G.running);
    $("got").disabled = !live; $("pass").disabled = !live || G.passUsed; $("peek").disabled = !live;
  }

  function pass(){
    if (!G || !G.running || G.passUsed) return;
    G.passUsed = true; G.running = false; canDraw = false;
    strokes = []; redraw();
    sfx.pass();
    G.word = nextWord();
    showSecret();
  }

  function got(){
    if (!G || !G.running) return;
    G.running = false; canDraw = false;
    const others = G.players.map((p, i) => i).filter(i => i !== G.drawer);
    if (others.length === 1){ award(others[0]); return; }
    $("credit-chips").innerHTML = "";
    others.forEach(i => {
      const p = G.players[i], b = document.createElement("button");
      b.type = "button"; b.className = "chip"; b.style.setProperty("--c", p.c);
      b.textContent = `${p.av} ${p.name}`;
      b.addEventListener("click", () => award(i));
      $("credit-chips").appendChild(b);
    });
    show("credit");
  }

  function award(i){
    clearInterval(timerId);
    const d = G.players[G.drawer], g = G.players[i];
    d.score++; g.score++;
    G.lastGain = {[G.drawer]:1, [i]:1};
    sfx.got();
    say(`${g.name} bildi! İkisine de bir puan.`);
    showResult(`${g.name} bildi!`, `${d.name} ve ${g.name} birer puan aldı.`);
  }

  function timeUp(){
    clearInterval(timerId);
    G.running = false; canDraw = false;
    G.lastGain = {};
    sfx.timeup();
    say("Süre bitti!");
    showResult("Süre bitti!", "Bu sefer kimse bilemedi.");
  }

  function scoreLines(gain){
    return G.players.slice().map((p, i) => ({p, i})).sort((a, b) => b.p.score - a.p.score)
      .map(({p, i}) => `<div class="score-line"><span class="dot" style="background:${p.c}">${p.av}</span><span>${esc(p.name)}${gain && gain[i] ? '<span class="plus">+1</span>' : ""}</span><b>${p.score}</b></div>`).join("");
  }

  function showResult(kicker, note){
    const [w, e] = G.word;
    $("result-kicker").textContent = kicker;
    $("result-emo").textContent = e || "";
    $("result-emo").hidden = !e;
    $("result-word").textContent = w;
    $("result-note").textContent = note;
    $("result-scores").innerHTML = scoreLines(G.lastGain);
    $("next-turn").textContent = G.turn + 1 >= G.totalTurns ? "Sonuçlar" : "Sıradaki";
    renderHud();
    show("result");
  }

  function nextTurn(){
    G.turn++;
    if (G.turn >= G.totalTurns){ finish(); return; }
    handoff();
  }

  function finish(){
    const top = Math.max(...G.players.map(p => p.score));
    const winners = G.players.filter(p => p.score === top);
    $("end-title").textContent = winners.length > 1 ? "Berabere!" : `${winners[0].name} kazandı!`;
    $("end-scores").innerHTML = scoreLines(null);
    sfx.win();
    say(winners.length > 1 ? "Berabere! Hepiniz harikaydınız." : `${winners[0].name} kazandı! Hepiniz harikaydınız.`);
    show("end");
  }

  // kelimeyi basılı tutunca göster
  let peekHeld = false;
  $("peek").addEventListener("pointerdown", e => {
    if (!G || !G.running) return;
    e.preventDefault(); peekHeld = true;
    $("peek").textContent = `${G.word[1] || ""} ${G.word[0]}`.trim();
  });
  ["pointerup", "pointercancel", "pointerleave"].forEach(ev => $("peek").addEventListener(ev, () => {
    if (!peekHeld) return;
    peekHeld = false; $("peek").textContent = "👁 Kelime";
  }));

  $("reveal").addEventListener("click", revealWord);
  $("go").addEventListener("click", go);
  $("got").addEventListener("click", got);
  $("pass").addEventListener("click", pass);
  $("credit-cancel").addEventListener("click", () => { show(null); G.running = true; canDraw = settings.mode === "draw"; renderHud(); });
  $("next-turn").addEventListener("click", nextTurn);
  $("again").addEventListener("click", newGame);
  // başka uygulamaya geçince süre durur, dönünce kaldığı yerden devam eder
  document.addEventListener("visibilitychange", () => {
    if (!G) return;
    if (document.hidden && G.running){ G.running = false; G.paused = true; canDraw = false; renderHud(); }
    else if (!document.hidden && G.paused){ G.paused = false; G.running = true; canDraw = settings.mode === "draw"; renderHud(); }
  });

  /* ---------- ayarlar ---------- */
  function renderSetup(){
    const box = $("p-rows");
    box.innerHTML = "";
    settings.players.forEach((n, i) => {
      const row = document.createElement("div");
      row.className = "p-row";
      row.innerHTML = `<span class="dot" style="background:${SEATS[i].c}" aria-hidden="true">${SEATS[i].av}</span><input type="text" id="pn-${i}" maxlength="12" value="${esc(n)}" placeholder="Adı" aria-label="${i + 1}. oyuncunun adı" autocomplete="off">`;
      box.appendChild(row);
    });
    $("add-player").disabled = settings.players.length >= SEATS.length;
    $("remove-player").disabled = settings.players.length <= 2;
    [["mode", settings.mode], ["words", settings.words], ["time", settings.time], ["rounds", settings.rounds]].forEach(([k, v]) => { const el = $(`${k}-${v}`); if (el) el.checked = true; });
  }
  function readSetup(){
    settings.players = settings.players.map((_, i) => ($("pn-" + i).value || "").trim() || `Oyuncu ${i + 1}`);
    const val = n => (document.querySelector(`input[name="${n}"]:checked`) || {}).value;
    settings.mode = val("mode") === "mime" ? "mime" : "draw";
    settings.words = ["kolay", "zor", "karisik"].includes(val("words")) ? val("words") : "kolay";
    settings.time = [45, 60, 90].includes(+val("time")) ? +val("time") : 60;
    settings.rounds = [1, 2, 3].includes(+val("rounds")) ? +val("rounds") : 2;
  }
  $("add-player").addEventListener("click", () => { readSetup(); if (settings.players.length < SEATS.length) settings.players.push(""); renderSetup(); const inp = $("pn-" + (settings.players.length - 1)); if (inp){ inp.value = ""; inp.focus(); } });
  $("remove-player").addEventListener("click", () => { readSetup(); if (settings.players.length > 2) settings.players.pop(); renderSetup(); });
  $("setup-form").addEventListener("submit", e => {
    e.preventDefault();
    readSetup();
    try { localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings)); } catch(err) {}
    audio();
    newGame();
    requestAnimationFrame(resize);
  });
  function openSetup(){
    if (G && G.running){ G.running = false; canDraw = false; clearInterval(timerId); }
    renderSetup();
    show("setup");
  }
  $("open-setup").addEventListener("click", openSetup);
  $("end-setup").addEventListener("click", openSetup);

  if ("ResizeObserver" in window) new ResizeObserver(resize).observe(cv);
  else window.addEventListener("resize", resize);
  renderSetup();
  renderHud();
  resize();
})();
