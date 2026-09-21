(() => {
  "use strict";
  const $ = id => document.getElementById(id);

  /* ---------- hayvanlar ve oyuncular ---------- */
  const ANIMALS = [
    {nm:"Kedi",    face:"🐱", c:"#FF8A3D", d:"#B4561A", f:659.25, w:"triangle"},
    {nm:"Köpek",   face:"🐶", c:"#3D8BFD", d:"#1D57B0", f:523.25, w:"square"},
    {nm:"İnek",    face:"🐮", c:"#2FB36A", d:"#1B7543", f:392.00, w:"sawtooth"},
    {nm:"Ördek",   face:"🦆", c:"#F2B51C", d:"#A87A06", f:783.99, w:"square"},
    {nm:"Kurbağa", face:"🐸", c:"#16B8A6", d:"#0B7A6E", f:880.00, w:"triangle"},
    {nm:"Kuzu",    face:"🐑", c:"#E0609E", d:"#9C2F66", f:587.33, w:"sine"}
  ];
  const SLOTS = [
    {av:"🐯", bg:"#3D8BFD", name:"Enes",   help:false},
    {av:"🐣", bg:"#FF7A2F", name:"Egemen", help:true},
    {av:"🦋", bg:"#9B5DE5", name:"Anne",   help:false},
    {av:"🐢", bg:"#2EB872", name:"Baba",   help:false},
    {av:"🦊", bg:"#E5484D", name:"",       help:false},
    {av:"🐧", bg:"#1CC7B1", name:"",       help:false}
  ];
  const BEST_KEY = "hayvan-korosu-best";
  const STEP = 0.62;          // dinleme modunda notalar arası (sn)

  /* ---------- ses ---------- */
  let soundOn = true, ac = null;
  function audio(){
    if (!ac){ try { ac = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { ac = null; } }
    if (ac && ac.state === "suspended") ac.resume();
    return ac;
  }
  function tone(freq, type, dur, vol, bend){
    if (!soundOn) return;
    const a = audio(); if (!a) return;
    const t = a.currentTime, o = a.createOscillator(), g = a.createGain(), lp = a.createBiquadFilter();
    o.type = type; o.frequency.setValueAtTime(freq, t);
    if (bend) o.frequency.exponentialRampToValueAtTime(freq * bend, t + dur * .8);
    lp.type = "lowpass"; lp.frequency.value = 2600;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + .02);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(lp); lp.connect(g); g.connect(a.destination);
    o.start(t); o.stop(t + dur + .05);
  }
  function sing(i){
    const A = ANIMALS[i];
    tone(A.f, A.w, .42, A.w === "sine" || A.w === "triangle" ? .32 : .14, i === 0 ? 1.12 : i === 5 ? .97 : 0);
  }
  const buzz = () => tone(150, "sawtooth", .45, .16, .7);
  const cheer = () => [0, 4, 7, 12].forEach((s, k) => later(k * .09, () => tone(523.25 * Math.pow(2, s / 12), "triangle", .3, .22)));

  const canSpeak = "speechSynthesis" in window;
  let trVoice = null;
  function pickVoice(){ trVoice = speechSynthesis.getVoices().find(v => /^tr(-|_|$)/i.test(v.lang)) || null; }
  if (canSpeak){ pickVoice(); if (speechSynthesis.addEventListener) speechSynthesis.addEventListener("voiceschanged", pickVoice); }
  function say(text){
    if (!canSpeak || !soundOn || !trVoice) return;
    speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text); u.voice = trVoice; u.lang = trVoice.lang; u.rate = .98; u.pitch = 1.15;
    speechSynthesis.speak(u);
  }
  function renderSound(){
    $("ic-on").hidden = !soundOn; $("ic-off").hidden = soundOn;
    $("sound").setAttribute("aria-label", soundOn ? "Sesi kapat" : "Sesi aç");
    $("sound").setAttribute("aria-pressed", String(soundOn));
  }
  $("sound").addEventListener("click", () => {
    soundOn = !soundOn;
    if (!soundOn && canSpeak) speechSynthesis.cancel();
    renderSound();
  });
  renderSound();

  /* ---------- zamanlayıcı ---------- */
  let timers = [];
  function later(sec, fn){ timers.push({t: sec, fn}); }
  function tick(dt){
    for (const tm of timers) tm.t -= dt;
    const due = timers.filter(tm => tm.t <= 0);
    timers = timers.filter(tm => tm.t > 0);
    due.forEach(tm => tm.fn());
  }

  /* ---------- durum ---------- */
  let G = null;
  let best = 0;
  try { best = +localStorage.getItem(BEST_KEY) || 0; } catch (e) {}

  function nameOf(p){ return p.name; }
  function alive(){ return G.players.filter(p => p.hearts > 0); }

  function newGame(cfg){
    timers = [];
    G = {
      cfg,
      players: cfg.players.map(p => ({...p, hearts: cfg.hearts})),
      pads: cfg.pads,
      seq: [],
      cur: -1,
      pos: 0,
      phase: "idle",
      longest: 0
    };
    $("end").hidden = true;
    $("curtain").hidden = true;
    buildChoir();
    renderPlayers();
    renderNotes();
    nextTurn();
  }

  function nextTurn(){
    const n = G.players.length;
    let i = G.cur;
    for (let k = 0; k < n; k++){
      i = (i + 1) % n;
      if (G.players[i].hearts > 0) break;
    }
    G.cur = i; G.pos = 0;
    G.phase = "curtain";
    const p = G.players[i];
    renderPlayers(); renderNotes(); setPads(false);
    $("curtain-av").textContent = p.av;
    $("curtain-av").style.background = p.bg;
    $("curtain-name").textContent = `Sıra ${p.name}${suffix(p.name)}`;
    $("curtain-note").textContent = G.seq.length === 0
      ? "Şarkıyı sen başlat: bir hayvana bas."
      : p.help
        ? `Önce şarkıyı dinle, sonra ${G.seq.length} hayvanı aynı sırayla çal ve bir tane ekle.`
        : `${G.seq.length} hayvanlık şarkıyı aklından çal, sonra bir tane ekle.`;
    status(`${p.av} ${p.name} hazırlanıyor…`);
    $("curtain").hidden = false;
    $("curtain-go").focus();
    say(`Sıra ${p.name}${suffix(p.name)}`);
  }

  // Türkçe bulunma eki: Enes'te, Egemen'de, Anne'de, Baba'da
  function suffix(name){
    const dig = {"1":"'de","2":"'de","3":"'te","4":"'te","5":"'te","6":"'da","7":"'de","8":"'de","9":"'da","0":"'da"}[name.slice(-1)];
    if (dig) return dig;
    const low = name.toLocaleLowerCase("tr");
    const vowels = low.match(/[aeıioöuü]/g);
    const v = vowels ? vowels[vowels.length - 1] : "e";
    const back = "aıou".includes(v);
    const hard = /[fstkçşhp]$/.test(low);
    return "'" + (hard ? "t" : "d") + (back ? "a" : "e");
  }

  function beginTurn(){
    $("curtain").hidden = true;
    const p = G.players[G.cur];
    if (G.seq.length === 0){ toAdd(true); return; }
    if (p.help){
      G.phase = "listen";
      status("🎧 Dinle…");
      setPads(false);
      G.seq.forEach((a, k) => later(.35 + k * STEP, () => { light(a, .42); sing(a); G.listenAt = k + 1; renderNotes(); }));
      later(.35 + G.seq.length * STEP + .15, () => { G.listenAt = 0; toRepeat(); });
    } else toRepeat();
  }

  function toRepeat(){
    G.phase = "repeat"; G.pos = 0;
    status(`Şimdi sen çal: ${G.seq.length} hayvan`);
    setPads(true); renderNotes();
  }
  function toAdd(first){
    G.phase = "add";
    status(first ? "Bir hayvana bas, şarkı başlasın!" : "Harika! Şimdi bir hayvan ekle ✨", "good");
    if (!first) say("Harika! Şimdi bir hayvan ekle.");
    else say("Bir hayvana bas.");
    setPads(true); renderNotes();
  }

  function press(i){
    if (!G || (G.phase !== "repeat" && G.phase !== "add") || i >= G.pads) return;
    light(i, .3); sing(i);
    if (G.phase === "add"){
      G.seq.push(i);
      G.longest = Math.max(G.longest, G.seq.length);
      if (G.seq.length > best){ best = G.seq.length; try { localStorage.setItem(BEST_KEY, String(best)); } catch (e) {} }
      G.phase = "between"; setPads(false);
      status(`🎵 ${G.seq.length} hayvanlık şarkı!`, "good");
      renderNotes(true);
      later(1.1, nextTurn);
      return;
    }
    if (i === G.seq[G.pos]){
      G.pos++;
      renderNotes();
      if (G.pos === G.seq.length){ G.phase = "between"; setPads(false); cheer(); later(.55, () => toAdd(false)); }
      return;
    }
    // yanlış hayvan
    const want = G.seq[G.pos], p = G.players[G.cur];
    G.phase = "between"; setPads(false);
    p.hearts--;
    buzz();
    const pad = padEls[i]; pad.classList.remove("wrong"); void pad.offsetWidth; pad.classList.add("wrong");
    later(.55, () => { light(want, .7); sing(want); });
    status(`Olmadı! Sıradaki ${ANIMALS[want].face} ${ANIMALS[want].nm} idi.`, "bad");
    say(`Olmadı! Sıradaki ${ANIMALS[want].nm} idi.`);
    renderPlayers();
    later(2.1, () => {
      if (G.players.length > 1 && alive().length <= 1) endGame();
      else nextTurn();
    });
  }

  function endGame(){
    G.phase = "over";
    const w = alive()[0];
    $("end-title").textContent = w ? `${w.name} kazandı!` : "Oyun bitti!";
    $("end-note").textContent = `En uzun şarkı: ${G.longest} hayvan · Rekor: ${best} hayvan`;
    $("end").hidden = false;
    cheer();
    if (w) say(`${w.name} kazandı!`);
  }

  /* ---------- çizim ---------- */
  let padEls = [];
  function buildChoir(){
    const box = $("choir");
    box.innerHTML = "";
    box.classList.toggle("six", G.pads === 6);
    padEls = ANIMALS.slice(0, G.pads).map((A, i) => {
      const b = document.createElement("button");
      b.type = "button"; b.className = "pad"; b.disabled = true;
      b.style.setProperty("--c", A.c); b.style.setProperty("--d", A.d);
      b.setAttribute("aria-label", A.nm);
      b.innerHTML = `<span class="face" aria-hidden="true">${A.face}</span><span class="nm">${A.nm}</span>`;
      b.addEventListener("pointerdown", e => { e.preventDefault(); press(i); });
      b.addEventListener("keydown", e => { if (e.key === "Enter" || e.key === " "){ e.preventDefault(); press(i); } });
      box.appendChild(b);
      return b;
    });
  }
  function setPads(on){
    padEls.forEach(b => b.disabled = !on);
    $("choir").classList.toggle("play", on);
  }
  function light(i, sec){
    const b = padEls[i]; if (!b) return;
    b.classList.add("lit");
    later(sec, () => b.classList.remove("lit"));
  }
  function status(text, kind){
    const s = $("status");
    s.textContent = text;
    s.className = "status" + (kind ? " " + kind : "");
  }
  function renderPlayers(){
    const ul = $("players");
    ul.innerHTML = "";
    G.players.forEach((p, i) => {
      const li = document.createElement("li");
      li.className = "pl" + (i === G.cur && G.phase !== "over" ? " on" : "") + (p.hearts <= 0 ? " out" : "");
      const hearts = "❤️".repeat(Math.max(0, p.hearts)) + "🤍".repeat(G.cfg.hearts - Math.max(0, p.hearts));
      li.innerHTML = `<span class="av" style="background:${p.bg}">${p.av}</span><span class="name"></span><span class="hearts" aria-label="${p.hearts} kalp">${hearts}</span>`;
      li.querySelector(".name").textContent = p.name;
      ul.appendChild(li);
    });
  }
  function renderNotes(justAdded){
    const box = $("notes");
    box.innerHTML = "";
    const done = G.phase === "listen" ? (G.listenAt || 0) : G.phase === "repeat" || G.phase === "add" ? G.pos : 0;
    G.seq.forEach((a, k) => {
      const d = document.createElement("i");
      d.className = "note" + (justAdded && k === G.seq.length - 1 ? " new" : k < done ? " done" : "");
      box.appendChild(d);
    });
    $("song-len").textContent = G.seq.length;
  }

  /* ---------- klavye ---------- */
  document.addEventListener("keydown", e => {
    if (!G || e.repeat || e.target.closest("input")) return;
    const n = parseInt(e.key, 10);
    if (n >= 1 && n <= G.pads) press(n - 1);
  });

  /* ---------- kurulum ---------- */
  const form = $("setup-form");
  function buildRows(){
    const count = +form.count.value;
    const box = $("rows");
    const old = [...box.querySelectorAll(".p-row")].map(r => ({name: r.querySelector("input[type=text]").value, help: r.querySelector("input[type=checkbox]").checked}));
    box.innerHTML = "";
    for (let i = 0; i < count; i++){
      const s = SLOTS[i], prev = old[i];
      const row = document.createElement("div");
      row.className = "p-row";
      row.innerHTML = `<span class="av" style="background:${s.bg}">${s.av}</span>
        <input type="text" id="pn-${i}" maxlength="12" aria-label="${i + 1}. oyuncunun adı" placeholder="Oyuncu ${i + 1}">
        <label class="toggle"><input type="checkbox" id="help-${i}"><span>🎧 dinle</span></label>`;
      row.querySelector("input[type=text]").value = prev ? prev.name : s.name;
      row.querySelector("input[type=checkbox]").checked = prev ? prev.help : s.help;
      box.appendChild(row);
    }
  }
  form.addEventListener("change", e => { if (e.target.name === "count") buildRows(); });
  form.addEventListener("submit", e => {
    e.preventDefault();
    audio();
    const count = +form.count.value;
    const players = [];
    for (let i = 0; i < count; i++){
      const nm = $("pn-" + i).value.trim() || `Oyuncu ${i + 1}`;
      players.push({name: nm, av: SLOTS[i].av, bg: SLOTS[i].bg, help: $("help-" + i).checked});
    }
    $("setup").hidden = true;
    newGame({players, pads: +form.pads.value, hearts: +form.hearts.value});
  });
  $("open-setup").addEventListener("click", () => {
    timers = []; if (G) G.phase = "idle";
    $("curtain").hidden = true; $("end").hidden = true;
    $("setup").hidden = false;
  });
  $("end-setup").addEventListener("click", () => { $("end").hidden = true; $("setup").hidden = false; });
  $("again").addEventListener("click", () => { audio(); newGame(G.cfg); });
  $("curtain-go").addEventListener("click", () => { audio(); beginTurn(); });

  buildRows();

  /* ---------- döngü ---------- */
  let last = performance.now();
  function frame(now){
    const dt = Math.min(.1, (now - last) / 1000); last = now;
    tick(dt);
    requestAnimationFrame(frame);
  }
  document.addEventListener("visibilitychange", () => { last = performance.now(); if (document.hidden && canSpeak) speechSynthesis.cancel(); });
  requestAnimationFrame(frame);
})();
