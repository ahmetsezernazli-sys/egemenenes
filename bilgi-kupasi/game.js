/* Bilgi Kupası — aile bilgi yarışması */
(function(){
  "use strict";

  const Q = window.BILGI_SORULAR || {kucuk:[], orta:[], buyuk:[]};
  const LEVELS = {kucuk:"Resimli", orta:"Orta", buyuk:"Zor"};
  const SEATS = [
    {avatar:"🚀", c:"#3D6BF2"}, {avatar:"🎈", c:"#FF7A2F"}, {avatar:"🌸", c:"#E4508F"}, {avatar:"⭐", c:"#12A594"}
  ];
  const DEFAULT_PLAYERS = [{name:"Enes", level:"buyuk"}, {name:"Egemen", level:"kucuk"}];
  const SETTINGS_KEY = "bilgi-kupasi-ayar", SOUND_KEY = "bilgi-kupasi-ses";
  const RM = window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches;

  const $ = id => document.getElementById(id);
  const esc = s => String(s).replace(/[&<>"']/g, ch => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[ch]));
  const shuffle = a => { a = a.slice(); for (let i = a.length - 1; i > 0; i--){ const j = Math.random()*(i + 1) | 0; [a[i], a[j]] = [a[j], a[i]]; } return a; };

  let settings = {players:DEFAULT_PLAYERS.map(p => Object.assign({}, p)), count:5};
  try { const s = JSON.parse(localStorage.getItem(SETTINGS_KEY) || "null"); if (s && Array.isArray(s.players) && s.players.length) settings = s; } catch(e) {}
  let soundOn = true;
  try { soundOn = localStorage.getItem(SOUND_KEY) !== "0"; } catch(e) {}

  let G = null;

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
    good(){ tone(659.25, .15, "triangle", .15); tone(987.77, .3, "triangle", .14, null, .12); },
    bad(){ tone(300, .3, "sawtooth", .06, 180); },
    turn(){ tone(523.25, .12, "sine", .1); tone(784, .18, "sine", .1, null, .1); },
    win(){ [523.25, 659.25, 783.99, 1046.5, 1318.5].forEach((f, i) => tone(f, .3, "triangle", .15, null, i*.12)); }
  };
  const canSpeak = "speechSynthesis" in window;
  let trVoice = null;
  function pickVoice(){ trVoice = speechSynthesis.getVoices().find(v => /^tr(-|_|$)/i.test(v.lang)) || null; }
  if (canSpeak){ pickVoice(); if (speechSynthesis.addEventListener) speechSynthesis.addEventListener("voiceschanged", pickVoice); }
  function say(text, interrupt){
    if (!canSpeak || !soundOn || !trVoice) return;
    if (interrupt) speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text); u.voice = trVoice; u.lang = trVoice.lang; u.rate = .95;
    speechSynthesis.speak(u);
  }
  function renderSound(){
    $("ic-on").hidden = !soundOn; $("ic-off").hidden = soundOn;
    $("sound").setAttribute("aria-label", soundOn ? "Sesi kapat" : "Sesi aç");
    $("sound").setAttribute("aria-pressed", String(soundOn));
    $("listen").hidden = !trVoice;
  }
  $("sound").addEventListener("click", () => {
    soundOn = !soundOn;
    try { localStorage.setItem(SOUND_KEY, soundOn ? "1" : "0"); } catch(e) {}
    if (!soundOn && canSpeak) speechSynthesis.cancel();
    renderSound();
  });
  if (canSpeak && speechSynthesis.addEventListener) speechSynthesis.addEventListener("voiceschanged", renderSound);
  renderSound();

  /* ---------- oyun ---------- */
  function newGame(){
    const pools = {};
    for (const k of Object.keys(LEVELS)) pools[k] = shuffle(Q[k] || []);
    G = {
      players:settings.players.map((p, i) => ({name:p.name, level:p.level, avatar:SEATS[i].avatar, c:SEATS[i].c, score:0, results:[]})),
      count:settings.count, turn:0, pools, current:null, answered:false, over:false
    };
    renderBoard();
    showTurn();
  }

  function drawQuestion(level){
    if (!G.pools[level].length) G.pools[level] = shuffle(Q[level] || []);
    const raw = G.pools[level].pop();
    const opts = shuffle(raw.o.map((o, i) => ({o, correct:i === 0})));
    return {raw, opts};
  }

  function renderBoard(){
    const sb = $("scoreboard");
    sb.innerHTML = "";
    G.players.forEach((p, i) => {
      const row = document.createElement("div");
      row.className = "score-row" + (i === G.turn && !G.over ? " active" : "");
      row.style.setProperty("--c", p.c);
      const dots = Array.from({length:G.count}, (_, k) => `<i class="${p.results[k] === true ? "ok" : p.results[k] === false ? "no" : ""}"></i>`).join("");
      row.innerHTML = `<span class="av" aria-hidden="true">${p.avatar}</span><span class="nm">${esc(p.name)}<span class="lv">${LEVELS[p.level]}</span></span><span class="pts" aria-label="${p.score} puan">${p.score}</span><span class="dots" aria-hidden="true">${dots}</span>`;
      sb.appendChild(row);
    });
  }

  function showTurn(){
    const p = G.players[G.turn];
    $("v-q").hidden = true; $("v-turn").hidden = false;
    const av = $("turn-avatar");
    av.textContent = p.avatar; av.style.setProperty("--c", p.c);
    $("turn-title").textContent = `Sıra ${locative(p.name)}`;
    $("turn-meta").textContent = `${LEVELS[p.level]} sorular · ${p.results.length + 1}. soru / ${G.count}`;
    renderBoard();
    sfx.turn();
    say(`Sıra ${locative(p.name)}.`, true);
    $("ready").focus({preventScroll:true});
  }

  function showQuestion(){
    const p = G.players[G.turn];
    G.current = drawQuestion(p.level);
    G.answered = false;
    const {raw, opts} = G.current, pics = p.level === "kucuk";
    $("v-turn").hidden = true; $("v-q").hidden = false;
    const chip = $("q-player");
    chip.textContent = `${p.avatar} ${p.name}`; chip.style.setProperty("--c", p.c);
    $("options").style.setProperty("--c", p.c);
    $("q-level").textContent = LEVELS[p.level];
    $("q-text").textContent = raw.q;
    $("q-img").hidden = !raw.img; $("q-img").textContent = raw.img || "";
    $("feedback").hidden = true;
    const box = $("options");
    box.className = "options" + (pics ? " pics" : "");
    box.innerHTML = "";
    opts.forEach((item, i) => {
      const b = document.createElement("button");
      b.type = "button"; b.className = "opt" + (pics ? " pic" : "");
      if (pics){
        const [emo, label] = item.o, isNum = /^\d+$/.test(emo);
        b.innerHTML = `<span class="${isNum ? "num" : "emo"}" aria-hidden="true">${emo}</span>${label ? `<span class="lbl">${esc(label)}</span>` : ""}`;
        b.setAttribute("aria-label", label || emo);
      } else {
        b.innerHTML = `<span class="key" aria-hidden="true">${i + 1}</span><span>${esc(item.o)}</span>`;
      }
      b.addEventListener("click", () => answer(i));
      box.appendChild(b);
    });
    if (pics) say(raw.q, true);
  }

  function optionLabel(item){ return Array.isArray(item.o) ? (item.o[1] || item.o[0]) : item.o; }

  function answer(i){
    if (!G || G.answered || G.over) return;
    audio();
    G.answered = true;
    const p = G.players[G.turn], {raw, opts} = G.current, ok = opts[i].correct;
    const buttons = [...$("options").children];
    buttons.forEach((b, k) => {
      b.disabled = true;
      if (opts[k].correct) b.classList.add("correct");
      else if (k === i) b.classList.add("wrong");
      else b.classList.add("dim");
    });
    p.results.push(ok);
    if (ok) p.score++;
    const right = opts.find(o => o.correct);
    const title = $("fb-title");
    if (ok){
      title.textContent = p.level === "kucuk" ? "Doğru! Aferin!" : "Doğru!";
      title.className = "fb-title good";
      sfx.good(); miniConfetti();
      say(p.level === "kucuk" ? "Doğru! Aferin!" : "Doğru!", true);
    } else {
      title.textContent = "Olmadı!";
      title.className = "fb-title bad";
      sfx.bad();
      say(`Olmadı. Doğru cevap: ${optionLabel(right)}.`, true);
    }
    $("fb-info").textContent = ok ? (raw.e || "") : `Doğru cevap: ${optionLabel(right)}.` + (raw.e ? " " + raw.e : "");
    const last = G.players.every(pl => pl.results.length >= G.count);
    const nextIdx = nextTurnIndex();
    $("continue").innerHTML = last ? `Sonuçları gör <kbd>Enter</kbd>` : `Sıradaki: ${esc(G.players[nextIdx].name)} <kbd>Enter</kbd>`;
    $("feedback").hidden = false;
    renderBoard();
    $("continue").focus({preventScroll:true});
  }

  function nextTurnIndex(){
    const n = G.players.length;
    for (let k = 1; k <= n; k++){
      const idx = (G.turn + k) % n;
      if (G.players[idx].results.length < G.count) return idx;
    }
    return G.turn;
  }

  function proceed(){
    if (!G || !G.answered) return;
    if (G.players.every(pl => pl.results.length >= G.count)){ finish(); return; }
    G.turn = nextTurnIndex();
    showTurn();
  }

  function finish(){
    G.over = true;
    renderBoard();
    const ranked = G.players.slice().sort((a, b) => b.score - a.score);
    const top = ranked[0].score, winners = ranked.filter(p => p.score === top);
    const title = G.players.length === 1 ? `${ranked[0].score} / ${G.count} doğru!` : winners.length > 1 ? "Berabere!" : `${winners[0].name} kazandı!`;
    $("end-title").textContent = title;
    let rank = 0, prev = null;
    $("podium").innerHTML = ranked.map((p, i) => {
      if (p.score !== prev){ rank = i + 1; prev = p.score; }
      return `<li style="--c:${p.c}"><span class="rk">${rank}.</span><span class="av" aria-hidden="true">${p.avatar}</span><span class="nm">${esc(p.name)}</span><span class="pts">${p.score}</span></li>`;
    }).join("");
    $("end-note").textContent = "Herkes kendi seviyesinde yarıştı. Hepiniz harikaydınız!";
    sfx.win(); bigConfetti();
    say(`${title} Hepiniz harikaydınız!`, true);
    $("end").hidden = false;
    $("rematch").focus({preventScroll:true});
  }

  function confetti(n){
    if (RM) return;
    const layer = $("confetti"), colors = ["#FFC83D", "#3D6BF2", "#FF7A2F", "#E4508F", "#12A594", "#FFFFFF"];
    for (let i = 0; i < n; i++){
      const el = document.createElement("i");
      el.style.left = Math.random()*100 + "%"; el.style.background = colors[i % colors.length];
      el.style.animationDelay = Math.random()*.5 + "s"; el.style.animationDuration = 1.8 + Math.random()*1.4 + "s";
      el.style.setProperty("--dx", (Math.random()*160 - 80) + "px"); el.style.setProperty("--r", (Math.random()*720 - 360) + "deg");
      layer.appendChild(el);
      setTimeout(() => el.remove(), 3800);
    }
  }
  const miniConfetti = () => confetti(28);
  const bigConfetti = () => confetti(110);

  /* ---------- kurulum ---------- */
  function renderSetup(){
    const box = $("players-edit");
    box.innerHTML = "";
    settings.players.forEach((p, i) => {
      const row = document.createElement("div");
      row.className = "p-edit";
      row.innerHTML = `
        <span class="av" style="background:${SEATS[i].c}" aria-hidden="true">${SEATS[i].avatar}</span>
        <input type="text" id="pname-${i}" maxlength="12" value="${esc(p.name)}" aria-label="${i + 1}. yarışmacının adı" autocomplete="off">
        <div class="seg" role="radiogroup" aria-label="${i + 1}. yarışmacının seviyesi">
          ${Object.entries(LEVELS).map(([k, label]) => `<label><input type="radio" name="plevel-${i}" id="plevel-${i}-${k}" value="${k}" ${p.level === k ? "checked" : ""}><span>${label}</span></label>`).join("")}
        </div>
        <button type="button" class="remove" id="premove-${i}" aria-label="${i + 1}. yarışmacıyı çıkar" ${settings.players.length <= 1 ? "disabled" : ""}>×</button>`;
      box.appendChild(row);
      row.querySelector(".remove").addEventListener("click", () => { readSetup(); settings.players.splice(i, 1); renderSetup(); });
    });
    $("add-player").disabled = settings.players.length >= SEATS.length;
    const c = $("count-" + settings.count); if (c) c.checked = true;
  }
  function readSetup(){
    settings.players = settings.players.map((p, i) => {
      const name = ($("pname-" + i).value || "").trim() || `Yarışmacı ${i + 1}`;
      const sel = document.querySelector(`input[name="plevel-${i}"]:checked`);
      return {name, level:sel ? sel.value : p.level};
    });
    const cnt = document.querySelector('input[name="count"]:checked');
    settings.count = cnt ? +cnt.value : 5;
  }
  $("add-player").addEventListener("click", () => {
    readSetup();
    if (settings.players.length < SEATS.length) settings.players.push({name:"", level:"buyuk"});
    renderSetup();
    const i = settings.players.length - 1, inp = $("pname-" + i);
    if (inp){ inp.value = ""; inp.placeholder = "Adı"; inp.focus(); }
  });
  $("setup-form").addEventListener("submit", e => {
    e.preventDefault();
    readSetup();
    try { localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings)); } catch(err) {}
    audio();
    $("setup").hidden = true;
    newGame();
  });
  function openSetup(){
    $("end").hidden = true;
    renderSetup();
    $("setup").hidden = false;
    $("start").focus({preventScroll:true});
  }
  $("open-setup").addEventListener("click", openSetup);
  $("end-setup").addEventListener("click", openSetup);
  $("rematch").addEventListener("click", () => { $("end").hidden = true; newGame(); });
  $("ready").addEventListener("click", () => { audio(); showQuestion(); });
  $("continue").addEventListener("click", proceed);
  $("listen").addEventListener("click", () => {
    if (!G || !G.current) return;
    const {raw, opts} = G.current;
    const text = G.players[G.turn].level === "kucuk" ? raw.q : `${raw.q} ${opts.map((o, i) => `${i + 1}: ${optionLabel(o)}.`).join(" ")}`;
    say(text, true);
  });

  window.addEventListener("keydown", e => {
    if (!$("setup").hidden || !$("end").hidden || !G) return;
    if (e.target && e.target.tagName === "INPUT") return;
    if (!$("v-turn").hidden && (e.key === "Enter" || e.key === " ")){ e.preventDefault(); showQuestion(); return; }
    if ($("v-q").hidden) return;
    if (!G.answered && /^[1-4]$/.test(e.key)){
      const i = +e.key - 1;
      if (i < G.current.opts.length){ e.preventDefault(); answer(i); }
    } else if (G.answered && (e.key === "Enter" || e.key === " ")){ e.preventDefault(); proceed(); }
  });

  // açılışta arkada örnek bir sahne görünsün
  renderSetup();
  G = {players:settings.players.map((p, i) => ({name:p.name, level:p.level, avatar:SEATS[i].avatar, c:SEATS[i].c, score:0, results:[]})), count:settings.count, turn:0, pools:{}, over:false};
  renderBoard();
  const first = G.players[0];
  $("turn-avatar").textContent = first.avatar; $("turn-avatar").style.setProperty("--c", first.c);
  $("turn-title").textContent = `Sıra ${locative(first.name)}`;
  $("turn-meta").textContent = `${LEVELS[first.level]} sorular · 1. soru / ${G.count}`;
  G = null;
})();
