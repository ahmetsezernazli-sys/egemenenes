/* Çiftini Bul — Egemen ve Enes için iki kişilik hafıza oyunu */
(function(){
  "use strict";

  const ANIMALS = [
    {e:"🐶", n:"köpek"}, {e:"🐱", n:"kedi"}, {e:"🦁", n:"aslan"}, {e:"🐸", n:"kurbağa"},
    {e:"🐵", n:"maymun"}, {e:"🐼", n:"panda"}, {e:"🦊", n:"tilki"}, {e:"🐰", n:"tavşan"},
    {e:"🐯", n:"kaplan"}, {e:"🐮", n:"inek"}, {e:"🐧", n:"penguen"}, {e:"🐔", n:"tavuk"},
    {e:"🐙", n:"ahtapot"}, {e:"🦋", n:"kelebek"}, {e:"🐢", n:"kaplumbağa"}, {e:"🐳", n:"balina"},
    {e:"🦒", n:"zürafa"}, {e:"🐘", n:"fil"}, {e:"🦉", n:"baykuş"}
  ];
  const PLAYER_VARS = [
    {c:"#3D6BF2", dark:"#2A4FC0", soft:"#E3EAFE"},
    {c:"#FF7A2F", dark:"#D65A14", soft:"#FFEADF"}
  ];
  const AVATARS = ["🚀", "🎈"];
  const DEFAULT_NAMES = ["Enes", "Egemen"];
  const SETTINGS_KEY = "ciftini-bul-ayar", BEST_KEY = "ciftini-bul-takim-rekoru", SOUND_KEY = "ciftini-bul-ses";
  const RM = window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches;

  const $ = id => document.getElementById(id);
  const board = $("board"), boardWrap = $("boardWrap");

  let settings = {mode:"coop", pairs:8, names:DEFAULT_NAMES.slice(), help:[false, true], starter:1};
  try { const s = JSON.parse(localStorage.getItem(SETTINGS_KEY) || "null"); if (s) settings = Object.assign(settings, s); } catch(e) {}
  let best = {};
  try { best = JSON.parse(localStorage.getItem(BEST_KEY) || "{}") || {}; } catch(e) {}
  let soundOn = true;
  try { soundOn = localStorage.getItem(SOUND_KEY) !== "0"; } catch(e) {}

  let G = null;
  const cardEls = [];

  const shuffle = a => { a = a.slice(); for (let i = a.length - 1; i > 0; i--){ const j = Math.random()*(i + 1) | 0; [a[i], a[j]] = [a[j], a[i]]; } return a; };
  const cap = s => s.charAt(0).toLocaleUpperCase("tr") + s.slice(1);
  const esc = s => s.replace(/[&<>"']/g, ch => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[ch]));
  const saveSettings = () => { try { localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings)); } catch(e) {} };

  // Türkçe bulunma eki: Enes'te, Egemen'de, Ali'de, Burak'ta
  function locative(name){
    const low = name.toLocaleLowerCase("tr"), vowels = "aeıioöuü";
    let v = "e";
    for (let i = low.length - 1; i >= 0; i--){ if (vowels.includes(low[i])){ v = low[i]; break; } }
    const hard = "çfhkpsşt".includes(low[low.length - 1]);
    return `${name}'${hard ? "t" : "d"}${"aıou".includes(v) ? "a" : "e"}`;
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
    g.gain.setValueAtTime(.0001, n); g.gain.exponentialRampToValueAtTime(vol || .1, n + .012); g.gain.exponentialRampToValueAtTime(.0001, n + dur);
    o.connect(g).connect(a.destination); o.start(n); o.stop(n + dur + .05);
  }
  const sfx = {
    flip(){ tone(520, .08, "triangle", .08, 820); },
    match(){ tone(784, .18, "triangle", .14); tone(1174.66, .28, "triangle", .12, null, .1); },
    miss(){ tone(330, .22, "sine", .12, 200); },
    hint(){ [1046.5, 1318.5, 1568].forEach((f, i) => tone(f, .12, "sine", .07, null, i*.06)); },
    win(){ [523.25, 659.25, 783.99, 1046.5].forEach((f, i) => tone(f, .25, "triangle", .15, null, i*.12)); [523.25, 659.25, 783.99].forEach(f => tone(f, 1, "sine", .07, null, .55)); }
  };

  const canSpeak = "speechSynthesis" in window;
  let trVoice = null;
  function pickVoice(){ trVoice = speechSynthesis.getVoices().find(v => /^tr(-|_|$)/i.test(v.lang)) || null; }
  if (canSpeak){ pickVoice(); if (speechSynthesis.addEventListener) speechSynthesis.addEventListener("voiceschanged", pickVoice); }
  function say(text, interrupt){
    if (!canSpeak || !soundOn || !trVoice) return;
    if (interrupt) speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.voice = trVoice; u.lang = trVoice.lang; u.rate = 1; u.pitch = 1.1;
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
  function setStatus(html){ $("status").innerHTML = html; }

  function newGame(preview){
    const pick = shuffle(ANIMALS).slice(0, settings.pairs);
    const cards = shuffle(pick.flatMap((a, k) => [{a, key:k}, {a, key:k}]))
      .map((c, idx) => Object.assign(c, {idx, open:false, matched:false, peek:false, by:null}));
    G = {
      cards, open:[], lock:false, moves:0, found:0, over:false, turn:settings.starter,
      players:[0, 1].map(i => ({name:(settings.names[i] || "").trim() || DEFAULT_NAMES[i], help:!!settings.help[i], score:0, hints:settings.help[i] ? 3 : 0}))
    };
    buildBoard(); renderPlayers(); layout();
    if (preview){ G.lock = true; return; }
    const first = G.players[G.turn].name;
    setStatus(`<b>${esc(first)}</b> başlıyor. İki kart aç.`);
    say(`${first} başlıyor!`, true);
  }

  function buildBoard(){
    board.innerHTML = ""; cardEls.length = 0;
    for (const c of G.cards){
      const b = document.createElement("button");
      b.type = "button"; b.className = "card"; b.id = "card-" + c.idx;
      b.innerHTML = `<span class="inner"><span class="face face-back"></span><span class="face face-front"><span class="emoji">${c.a.e}</span></span><span class="badge"></span></span>`;
      b.addEventListener("click", () => flip(c.idx));
      board.appendChild(b); cardEls.push(b);
      renderCard(c);
    }
  }

  function renderCard(c){
    const el = cardEls[c.idx]; if (!el) return;
    el.classList.toggle("open", c.open || c.matched || c.peek);
    el.classList.toggle("matched", c.matched);
    el.classList.toggle("peek", c.peek);
    el.setAttribute("aria-label", (c.open || c.matched || c.peek) ? cap(c.a.n) : "Kapalı kart");
    el.disabled = c.matched;
    if (c.matched && c.by !== null){
      const v = PLAYER_VARS[c.by];
      el.style.setProperty("--by", v.c); el.style.setProperty("--by-dark", v.dark); el.style.setProperty("--by-soft", v.soft);
      el.querySelector(".badge").textContent = AVATARS[c.by];
    }
  }

  function animate(c, cls){
    const el = cardEls[c.idx]; if (!el || RM) return;
    el.classList.remove(cls); void el.offsetWidth; el.classList.add(cls);
    setTimeout(() => el.classList.remove(cls), 500);
  }

  function renderPlayers(){
    G.players.forEach((p, i) => {
      const el = $("p" + i);
      el.querySelector(".p-name").textContent = p.name;
      el.querySelector(".p-score b").textContent = p.score;
      el.classList.toggle("active", G.turn === i && !G.over);
      const h = el.querySelector(".hint");
      h.hidden = !p.help;
      h.querySelector("span").textContent = p.hints;
      h.disabled = !(G.turn === i && !G.over && !G.lock && G.open.length === 0 && p.hints > 0);
    });
  }

  function flip(i){
    if (!G || G.over || G.lock) return;
    const c = G.cards[i];
    if (c.open || c.matched) return;
    audio();
    c.open = true; G.open.push(c); renderCard(c);
    sfx.flip(); say(cap(c.a.n), true);
    renderPlayers();
    if (G.open.length < 2) return;

    G.moves++; G.lock = true; renderPlayers();
    const [x, y] = G.open, p = G.players[G.turn];

    if (x.key === y.key){
      setTimeout(() => {
        x.matched = y.matched = true; x.by = y.by = G.turn;
        p.score++; G.found++; G.open = [];
        renderCard(x); renderCard(y); animate(x, "pop"); animate(y, "pop");
        sfx.match();
        if (G.found === settings.pairs){ G.lock = false; renderPlayers(); setTimeout(finish, 600); return; }
        if (settings.mode === "race"){
          setStatus(`<b>${esc(p.name)}</b> buldu! Bir daha oynar.`);
          say("Buldun! Bir daha!", false);
        } else {
          G.turn = 1 - G.turn;
          const nm = G.players[G.turn].name;
          setStatus(`Süper! Sıra <b>${esc(locative(nm))}</b>.` + movesText());
          say(`Buldun! Sıra ${locative(nm)}.`, false);
        }
        G.lock = false; renderPlayers();
      }, 450);
    } else {
      setTimeout(() => { sfx.miss(); animate(x, "shake"); animate(y, "shake"); }, 350);
      // yardım açık oyuncu kartlara daha uzun bakar
      setTimeout(() => {
        x.open = y.open = false; G.open = [];
        renderCard(x); renderCard(y);
        G.turn = 1 - G.turn; G.lock = false; renderPlayers();
        const nm = G.players[G.turn].name;
        setStatus(`Olmadı. Sıra <b>${esc(locative(nm))}</b>.` + movesText());
        say(`Sıra ${locative(nm)}.`, true);
      }, p.help ? 2300 : 1200);
    }
  }

  function movesText(){
    if (settings.mode !== "coop") return "";
    const b = best[String(settings.pairs)];
    return ` <span class="moves">· Hamle ${G.moves}${b ? ` · Takım rekoru ${b}` : ""}</span>`;
  }

  function useHint(pi){
    if (!G || G.over || G.lock || G.turn !== pi || G.open.length) return;
    const p = G.players[pi];
    if (p.hints <= 0) return;
    const rest = G.cards.filter(c => !c.matched);
    if (!rest.length) return;
    const k = rest[Math.random()*rest.length | 0].key;
    const pair = rest.filter(c => c.key === k);
    p.hints--; G.lock = true; renderPlayers();
    pair.forEach(c => { c.peek = true; renderCard(c); });
    sfx.hint();
    setTimeout(() => {
      pair.forEach(c => { c.peek = false; renderCard(c); });
      G.lock = false; renderPlayers();
    }, 1100);
  }
  $("p0").querySelector(".hint").addEventListener("click", () => useHint(0));
  $("p1").querySelector(".hint").addEventListener("click", () => useHint(1));

  function starSvg(on){
    return `<svg viewBox="0 0 24 24"><path d="M12 2.5l2.9 6 6.6.9-4.8 4.6 1.2 6.5L12 17.4 6.1 20.5l1.2-6.5L2.5 9.4l6.6-.9z" fill="${on ? "#FFC93C" : "#E4EDF2"}" stroke="${on ? "#D9A400" : "#C9D6DE"}" stroke-width="1.5" stroke-linejoin="round"/></svg>`;
  }

  function finish(){
    G.over = true; renderPlayers();
    sfx.win(); confetti();
    const [a, b] = G.players;
    let title, sub, bestText = "", stars = 0;

    if (settings.mode === "race"){
      if (a.score === b.score) title = "Berabere!";
      else title = `Kazanan: ${(a.score > b.score ? a : b).name}!`;
      sub = "İkiniz de çok iyi oynadınız.";
      say(`${title} İkiniz de harikaydınız!`, true);
    } else {
      stars = G.moves <= settings.pairs*1.6 ? 3 : G.moves <= settings.pairs*2.3 ? 2 : 1;
      title = "Takım başardı!";
      sub = `${settings.pairs} çiftin hepsini ${G.moves} hamlede buldunuz.`;
      const key = String(settings.pairs), prev = best[key];
      if (!prev || G.moves < prev){
        best[key] = G.moves;
        try { localStorage.setItem(BEST_KEY, JSON.stringify(best)); } catch(e) {}
        if (prev) bestText = `Yeni takım rekoru! Önceki: ${prev} hamle`;
        else bestText = "İlk takım rekorunuz kaydedildi.";
      } else bestText = `Takım rekoru: ${prev} hamle`;
      say("Takım başardı! Aferin size!", true);
    }

    $("res-title").textContent = title;
    $("res-stars").innerHTML = settings.mode === "coop" ? [0, 1, 2].map(i => starSvg(i < stars)).join("") : "";
    $("res-stars").hidden = settings.mode !== "coop";
    $("res-sub").textContent = sub;
    $("res-players").innerHTML = G.players.map((p, i) => {
      const v = PLAYER_VARS[i];
      return `<span class="res-player" style="--c-soft:${v.soft};--c-dark:${v.dark}"><span class="avatar sm" style="background:#fff">${AVATARS[i]}</span>${esc(p.name)} <b>${p.score}</b></span>`;
    }).join("");
    $("res-best").textContent = bestText;

    settings.starter = 1 - settings.starter; saveSettings();
    setStatus(`Oyun bitti. Sıradaki oyunu <b>${esc(G.players[settings.starter].name)}</b> başlatacak.`);
    $("result").hidden = false;
    $("again").focus({preventScroll:true});
  }

  function confetti(){
    if (RM) return;
    const layer = $("confetti"), colors = ["#3D6BF2", "#FF7A2F", "#FFC93C", "#2DB75A", "#9B5DE5", "#F0453A"];
    for (let i = 0; i < 90; i++){
      const s = document.createElement("i");
      s.style.left = Math.random()*100 + "%";
      s.style.background = colors[i % colors.length];
      s.style.animationDelay = Math.random()*.8 + "s";
      s.style.animationDuration = 2.2 + Math.random()*1.6 + "s";
      s.style.setProperty("--dx", (Math.random()*160 - 80) + "px");
      s.style.setProperty("--r", (Math.random()*720 - 360) + "deg");
      layer.appendChild(s);
    }
    setTimeout(() => { layer.innerHTML = ""; }, 4800);
  }

  /* ---------- kart ızgarası boyutu ---------- */
  function layout(){
    if (!G) return;
    const Wd = boardWrap.clientWidth, Ht = boardWrap.clientHeight, n = G.cards.length;
    if (!Wd || !Ht) return;
    const gap = Math.min(Wd, Ht) < 520 ? 8 : 12;
    let bestCols = 4, bestScore = 0;
    for (let cols = 2; cols <= n; cols++){
      const rows = Math.ceil(n/cols);
      if (rows*cols - n >= cols) continue;
      const w = Math.min((Wd - gap*(cols - 1))/cols, ((Ht - gap*(rows - 1))/rows)/1.25);
      const score = w * (rows*cols === n ? 1 : .85);
      if (score > bestScore){ bestScore = score; bestCols = cols; }
    }
    const rows = Math.ceil(n/bestCols);
    const w = Math.max(40, Math.floor(Math.min((Wd - gap*(bestCols - 1))/bestCols, ((Ht - gap*(rows - 1))/rows)/1.25, 170)));
    board.style.setProperty("--cols", bestCols);
    board.style.setProperty("--cw", w + "px");
    board.style.setProperty("--gap", gap + "px");
  }
  if ("ResizeObserver" in window) new ResizeObserver(layout).observe(boardWrap);
  else window.addEventListener("resize", layout);

  /* ---------- ayarlar ---------- */
  function fillForm(){
    $("mode-" + settings.mode).checked = true;
    const pr = $("pairs-" + settings.pairs); if (pr) pr.checked = true;
    [0, 1].forEach(i => { $("name-" + i).value = settings.names[i] || DEFAULT_NAMES[i]; $("help-" + i).checked = !!settings.help[i]; });
  }
  function openSetup(){
    fillForm();
    $("result").hidden = true;
    $("setup").hidden = false;
    $("start").focus({preventScroll:true});
  }
  $("setup-form").addEventListener("submit", e => {
    e.preventDefault();
    const form = e.target;
    settings.mode = form.mode.value === "race" ? "race" : "coop";
    settings.pairs = [6, 8, 12].includes(+form.pairs.value) ? +form.pairs.value : 8;
    settings.names = [0, 1].map(i => $("name-" + i).value.trim() || DEFAULT_NAMES[i]);
    settings.help = [0, 1].map(i => $("help-" + i).checked);
    saveSettings();
    audio();
    $("setup").hidden = true;
    newGame(false);
  });
  $("open-setup").addEventListener("click", openSetup);
  $("to-setup").addEventListener("click", openSetup);
  $("again").addEventListener("click", () => { $("result").hidden = true; newGame(false); });

  fillForm();
  newGame(true);
})();
