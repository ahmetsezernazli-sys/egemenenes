/* Renkli Ksilofon — serbest çal, şarkı öğren, hafıza */
(function(){
  "use strict";

  const NOTES = [
    {name:"Do",  f:261.63, c:"#E5484D", key:"a"},
    {name:"Re",  f:293.66, c:"#FF8A3D", key:"s"},
    {name:"Mi",  f:329.63, c:"#F2B51E", key:"d"},
    {name:"Fa",  f:349.23, c:"#6FBF3E", key:"f"},
    {name:"Sol", f:392.00, c:"#22A99A", key:"g"},
    {name:"La",  f:440.00, c:"#3D8BFD", key:"h"},
    {name:"Si",  f:493.88, c:"#7C5CFF", key:"j"},
    {name:"Do",  f:523.25, c:"#E4508F", key:"k"}
  ];
  // Telifsiz halk ve klasik ezgiler. n: nota sırası (0 = Do), d: vuruş süresi
  const SONGS = [
    {id:"gam", title:"Do Re Mi", emoji:"🎼",
     n:[0,1,2,3,4,5,6,7], d:[1,1,1,1,1,1,1,2]},
    {id:"yildiz", title:"Parıldayan Yıldız", emoji:"⭐",
     n:[0,0,4,4,5,5,4, 3,3,2,2,1,1,0, 4,4,3,3,2,2,1, 4,4,3,3,2,2,1, 0,0,4,4,5,5,4, 3,3,2,2,1,1,0],
     d:[1,1,1,1,1,1,2, 1,1,1,1,1,1,2, 1,1,1,1,1,1,2, 1,1,1,1,1,1,2, 1,1,1,1,1,1,2, 1,1,1,1,1,1,2]},
    {id:"kuzu", title:"Küçük Kuzu", emoji:"🐑",
     n:[2,1,0,1,2,2,2, 1,1,1, 2,4,4, 2,1,0,1,2,2,2,2,1,1,2,1,0],
     d:[1,1,1,1,1,1,2, 1,1,2, 1,1,2, 1,1,1,1,1,1,1,1,1,1,1,1,4]},
    {id:"nese", title:"Neşeye Övgü", emoji:"🎻",
     n:[2,2,3,4,4,3,2,1,0,0,1,2,2,1,1, 2,2,3,4,4,3,2,1,0,0,1,2,1,0,0],
     d:[1,1,1,1,1,1,1,1,1,1,1,1,1.5,.5,2, 1,1,1,1,1,1,1,1,1,1,1,1,1.5,.5,2]}
  ];
  const BEAT = .42;
  const MEM_KEYS = {4:[0, 2, 4, 7], 8:[0, 1, 2, 3, 4, 5, 6, 7]};
  const STORE_KEY = "renkli-ksilofon", SOUND_KEY = "renkli-ksilofon-ses";
  const RM = window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches;

  const $ = id => document.getElementById(id);
  let store = {best:{4:0, 8:0}, songsDone:{}};
  try { const s = JSON.parse(localStorage.getItem(STORE_KEY) || "null"); if (s) store = Object.assign(store, s); } catch(e) {}
  const persist = () => { try { localStorage.setItem(STORE_KEY, JSON.stringify(store)); } catch(e) {} };
  let soundOn = true;
  try { soundOn = localStorage.getItem(SOUND_KEY) !== "0"; } catch(e) {}

  let mode = "free", timbre = "xylo";
  let playing = null;          // çalınan ezgi zamanlayıcıları
  const song = {idx:1, pos:0, active:false};
  const mem = {seq:[], pos:0, phase:"idle", keys:4};

  /* ---------- ses ---------- */
  let ac = null, master = null;
  function audio(){
    if (!ac){
      try {
        ac = new (window.AudioContext || window.webkitAudioContext)();
        master = ac.createGain(); master.gain.value = .8; master.connect(ac.destination);
      } catch(e) { ac = null; }
    }
    if (ac && ac.state === "suspended") ac.resume();
    return ac;
  }
  function voice(freq, type, vol, attack, decay, when){
    const o = ac.createOscillator(), g = ac.createGain();
    o.type = type; o.frequency.setValueAtTime(freq, when);
    g.gain.setValueAtTime(.0001, when);
    g.gain.exponentialRampToValueAtTime(vol, when + attack);
    g.gain.exponentialRampToValueAtTime(.0001, when + attack + decay);
    o.connect(g).connect(master); o.start(when); o.stop(when + attack + decay + .05);
  }
  function playNote(i, delay){
    const a = audio(); if (!a || !soundOn) return;
    const f = NOTES[i].f, t = a.currentTime + (delay || 0);
    if (timbre === "bell"){
      voice(f, "sine", .32, .005, 2.2, t); voice(f*2.01, "sine", .09, .005, 1.2, t); voice(f*3.02, "sine", .05, .005, .6, t);
    } else if (timbre === "robot"){
      voice(f, "square", .09, .01, .35, t); voice(f/2, "sawtooth", .05, .01, .3, t);
    } else {
      voice(f, "sine", .45, .002, 1.1, t); voice(f*3.98, "sine", .12, .002, .18, t); voice(f*9.9, "sine", .03, .001, .05, t);
    }
  }
  function tone(freq, dur, type, vol, delay){
    const a = audio(); if (!a || !soundOn) return;
    voice(freq, type || "sine", vol || .1, .01, dur, a.currentTime + (delay || 0));
  }
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

  /* ---------- tuşlar ---------- */
  const barsEl = $("bars"), keys = [];
  NOTES.forEach((n, i) => {
    const b = document.createElement("button");
    b.type = "button"; b.className = "key"; b.id = "key-" + i;
    b.style.setProperty("--c", n.c);
    b.style.setProperty("--h", (100 - i*5) + "%");
    b.setAttribute("aria-label", n.name + (i === 7 ? " (ince)" : ""));
    b.innerHTML = `<span>${n.name}</span><span class="kb">${n.key.toUpperCase()}</span>`;
    barsEl.appendChild(b); keys.push(b);
  });

  function flash(i, cls, ms){
    const k = keys[i];
    k.classList.remove(cls); void k.offsetWidth; k.classList.add(cls);
    setTimeout(() => k.classList.remove(cls), ms || 160);
  }
  function floatNote(i){
    if (RM) return;
    const r = keys[i].getBoundingClientRect(), s = document.createElement("span");
    s.textContent = Math.random() < .5 ? "♪" : "♫";
    s.style.left = (r.left + r.width/2 - 10) + "px"; s.style.top = (r.top + 10) + "px"; s.style.color = NOTES[i].c;
    s.style.setProperty("--dx", (Math.random()*60 - 30) + "px"); s.style.setProperty("--r", (Math.random()*60 - 30) + "deg");
    $("notes").appendChild(s);
    setTimeout(() => s.remove(), 1200);
  }

  // kullanıcı bir tuşa vurdu
  function strike(i){
    if (keys[i].classList.contains("off")) return;
    if (mode === "song" && playing) return;
    if (mode === "memory" && mem.phase !== "input") { if (mem.phase === "show") return; }
    playNote(i); flash(i, "hit"); floatNote(i);
    if (mode === "song") songInput(i);
    else if (mode === "memory") memInput(i);
  }

  // dokunma ve kaydırma: parmak tuşlar üzerinde gezinirken yeni tuşa girince çalar
  const pointerKey = new Map();
  function keyAt(x, y){
    const el = document.elementFromPoint(x, y);
    const k = el && el.closest ? el.closest(".key") : null;
    return k ? keys.indexOf(k) : -1;
  }
  barsEl.addEventListener("pointerdown", e => {
    e.preventDefault(); audio();
    try { barsEl.setPointerCapture(e.pointerId); } catch(_) {}
    const i = keyAt(e.clientX, e.clientY);
    pointerKey.set(e.pointerId, i);
    if (i >= 0) strike(i);
  });
  barsEl.addEventListener("pointermove", e => {
    if (!pointerKey.has(e.pointerId)) return;
    const i = keyAt(e.clientX, e.clientY);
    if (i !== pointerKey.get(e.pointerId)){
      pointerKey.set(e.pointerId, i);
      if (i >= 0 && mode === "free") strike(i);
    }
  });
  ["pointerup", "pointercancel", "lostpointercapture"].forEach(ev => barsEl.addEventListener(ev, e => pointerKey.delete(e.pointerId)));
  barsEl.addEventListener("contextmenu", e => e.preventDefault());
  // klavye ile odaklanıp Enter/Boşluk
  keys.forEach((k, i) => k.addEventListener("click", e => { if (e.detail === 0) strike(i); }));

  window.addEventListener("keydown", e => {
    if (e.repeat || e.ctrlKey || e.metaKey || e.altKey) return;
    const k = e.key.toLowerCase();
    let i = NOTES.findIndex(n => n.key === k);
    if (i < 0 && /^[1-8]$/.test(k)) i = +k - 1;
    if (i >= 0){ e.preventDefault(); audio(); strike(i); }
  });

  /* ---------- modlar ---------- */
  function setMode(m){
    stopPlayback(); endMemory(true);
    mode = m;
    document.querySelectorAll(".mode").forEach(b => b.setAttribute("aria-selected", String(b.dataset.mode === m)));
    ["free", "song", "memory"].forEach(x => { $("panel-" + x).hidden = x !== m; });
    clearMarks();
    if (m === "song") resetSong();
    if (m === "memory") renderMem();
  }
  document.querySelectorAll(".mode").forEach(b => b.addEventListener("click", () => setMode(b.dataset.mode)));
  document.querySelectorAll('input[name="timbre"]').forEach(r => r.addEventListener("change", () => { timbre = r.value; audio(); playNote(4); }));

  function clearMarks(){ keys.forEach(k => k.classList.remove("next", "lit", "off")); }

  function stopPlayback(){
    if (!playing) return;
    playing.timers.forEach(clearTimeout);
    playing = null;
    keys.forEach(k => k.classList.remove("lit"));
    $("song-listen").disabled = false; $("song-play").disabled = false;
  }

  // ezgiyi çalar ve tuşları yakar
  function playMelody(notes, durs, beat, onDone){
    stopPlayback();
    audio();
    const timers = [];
    let t = 0;
    notes.forEach((n, k) => {
      const d = (durs ? durs[k] : 1)*beat;
      timers.push(setTimeout(() => {
        playNote(n);
        keys[n].classList.add("lit");
        timers.push(setTimeout(() => keys[n].classList.remove("lit"), Math.max(120, d*1000*.75)));
      }, t*1000));
      t += d;
    });
    timers.push(setTimeout(() => { playing = null; if (onDone) onDone(); }, t*1000 + 200));
    playing = {timers};
  }

  /* ---------- şarkı öğren ---------- */
  function renderSongList(){
    const box = $("song-list");
    box.innerHTML = "";
    SONGS.forEach((s, i) => {
      const lab = document.createElement("label");
      lab.className = "chip";
      lab.innerHTML = `<input type="radio" name="song" id="song-${s.id}" value="${i}" ${i === song.idx ? "checked" : ""}><span>${s.emoji} ${s.title}${store.songsDone[s.id] ? " ✓" : ""}</span>`;
      lab.querySelector("input").addEventListener("change", () => { song.idx = i; resetSong(); });
      box.appendChild(lab);
    });
  }
  function setSongStatus(text, cls){ const el = $("song-status"); el.textContent = text; el.className = "status" + (cls ? " " + cls : ""); }
  function resetSong(){
    stopPlayback();
    song.pos = 0; song.active = false;
    clearMarks(); renderSongList(); updateSongBar();
    setSongStatus("Önce dinle, sonra “Sen çal” de ve parlayan tuşlara sırayla bas.");
  }
  function updateSongBar(){ $("song-bar").style.width = (song.pos/SONGS[song.idx].n.length*100) + "%"; }
  function markNext(){
    keys.forEach(k => k.classList.remove("next"));
    if (song.active && song.pos < SONGS[song.idx].n.length) keys[SONGS[song.idx].n[song.pos]].classList.add("next");
  }
  $("song-listen").addEventListener("click", () => {
    const s = SONGS[song.idx];
    song.active = false; markNext();
    $("song-listen").disabled = true; $("song-play").disabled = true;
    setSongStatus(`${s.emoji} ${s.title} çalıyor…`);
    playMelody(s.n, s.d, BEAT, () => {
      $("song-listen").disabled = false; $("song-play").disabled = false;
      setSongStatus("Şimdi sıra sende. “Sen çal” düğmesine bas.");
    });
  });
  $("song-play").addEventListener("click", () => {
    stopPlayback();
    song.pos = 0; song.active = true;
    updateSongBar(); markNext();
    setSongStatus("Parlayan tuşa bas.");
    say("Parlayan tuşa bas.");
  });
  function songInput(i){
    if (!song.active) return;
    const s = SONGS[song.idx], want = s.n[song.pos];
    if (i !== want){ flash(want, "shake", 380); return; }
    song.pos++; updateSongBar(); markNext();
    if (song.pos >= s.n.length){
      song.active = false;
      store.songsDone[s.id] = true; persist(); renderSongList();
      setSongStatus(`Harika! ${s.title} şarkısını çaldın. Şimdi hepsini birden dinle.`, "good");
      say("Harika! Şarkıyı çaldın!");
      celebrate();
      setTimeout(() => { if (mode === "song" && !song.active) playMelody(s.n, s.d, BEAT); }, 1400);
    }
  }
  function celebrate(){
    if (RM) return;
    keys.forEach((_, i) => setTimeout(() => floatNote(i), i*60));
  }

  /* ---------- hafıza ---------- */
  function setMemStatus(text, cls){ const el = $("mem-status"); el.textContent = text; el.className = "status" + (cls ? " " + cls : ""); }
  function renderMem(){
    mem.keys = +(document.querySelector('input[name="memkeys"]:checked') || {value:4}).value;
    $("mem-score").textContent = Math.max(0, mem.seq.length - (mem.phase === "idle" ? 0 : 1));
    $("mem-best").textContent = store.best[mem.keys] || 0;
    const allowed = MEM_KEYS[mem.keys];
    keys.forEach((k, i) => k.classList.toggle("off", mode === "memory" && !allowed.includes(i)));
    $("mem-start").textContent = mem.phase === "idle" ? "Başla" : "Baştan başla";
  }
  document.querySelectorAll('input[name="memkeys"]').forEach(r => r.addEventListener("change", () => { endMemory(true); renderMem(); }));

  function endMemory(silent){
    if (mem.phase === "idle") return;
    stopPlayback();
    mem.phase = "idle"; mem.seq = []; mem.pos = 0;
    if (!silent) renderMem();
  }
  $("mem-start").addEventListener("click", () => {
    audio();
    stopPlayback();
    mem.seq = []; mem.phase = "show";
    renderMem();
    nextRound();
  });
  function nextRound(){
    const allowed = MEM_KEYS[mem.keys];
    mem.seq.push(allowed[Math.random()*allowed.length | 0]);
    mem.pos = 0; mem.phase = "show";
    $("mem-score").textContent = mem.seq.length - 1;
    setMemStatus(`Dinle ve izle… (${mem.seq.length} nota)`);
    const beat = Math.max(.26, .55 - mem.seq.length*.02);
    setTimeout(() => {
      if (mode !== "memory" || mem.phase !== "show") return;
      playMelody(mem.seq, null, beat, () => {
        if (mode !== "memory" || mem.phase !== "show") return;
        mem.phase = "input";
        setMemStatus("Sıra sende, aynı sırayla bas.");
      });
    }, 600);
  }
  function memInput(i){
    if (mem.phase !== "input") return;
    if (i !== mem.seq[mem.pos]){
      mem.phase = "over";
      const score = mem.seq.length - 1, best = store.best[mem.keys] || 0;
      tone(220, .5, "sawtooth", .08, .15);
      flash(mem.seq[mem.pos], "shake", 380);
      keys[mem.seq[mem.pos]].classList.add("lit");
      setTimeout(() => keys.forEach(k => k.classList.remove("lit")), 900);
      if (score > best){ store.best[mem.keys] = score; persist(); }
      setMemStatus(score > best ? `Yeni rekor! ${score} notalık diziyi hatırladın.` : `Olmadı. ${score} notalık diziyi hatırladın. Rekor: ${Math.max(best, score)}.`, score > best ? "good" : "bad");
      $("mem-best").textContent = store.best[mem.keys] || 0;
      $("mem-score").textContent = score;
      $("mem-start").textContent = "Tekrar oyna";
      mem.phase = "idle"; mem.seq = [];
      return;
    }
    mem.pos++;
    if (mem.pos >= mem.seq.length){
      mem.phase = "show";
      $("mem-score").textContent = mem.seq.length;
      tone(1046.5, .15, "triangle", .08, .15); tone(1318.5, .2, "triangle", .08, .27);
      setMemStatus("Doğru! Bir nota daha ekleniyor…", "good");
      setTimeout(() => { if (mode === "memory" && mem.phase === "show") nextRound(); }, 900);
    }
  }

  renderSongList();
  setMode("free");
})();
