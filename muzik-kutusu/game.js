/* Müzik Kutusu — Egemen için ritim ve nota tablosu */
(function(){
  "use strict";

  const SAVE = "muzik-kutusu", SOUND_KEY = "muzik-kutusu-ses", COLS = 8;
  const RAINBOW = ["#E4483B", "#C98F00", "#2A64C0", "#1E8A41", "#6E36B8"];
  // satırlar yukarıdan aşağı: tiz notalar üstte, davul en altta
  const ROWS = [
    { e:"🐤", ad:"civciv", k:"note", f:1046.5, c:"#FFD84D" },
    { e:"🐰", ad:"tavşan", k:"note", f:880.0, c:"#FF9F43" },
    { e:"🐶", ad:"köpek", k:"note", f:784.0, c:"#FF6B6B" },
    { e:"🐱", ad:"kedi", k:"note", f:659.3, c:"#F15BB5" },
    { e:"🐸", ad:"kurbağa", k:"note", f:523.3, c:"#9B5DE5" },
    { e:"🐭", ad:"fare", k:"hat", c:"#4DA3FF" },
    { e:"🦆", ad:"ördek", k:"clap", c:"#00B8A9" },
    { e:"🐘", ad:"fil", k:"kick", c:"#2DB75A" }
  ];
  const R = (name) => ROWS.findIndex(r => r.ad === name);
  // taklit bölümleri: [satır adı, sütunlar]
  const LEVELS = [
    { say:"Fil davul çalıyor. Bum, bum!", pat:[["fil", [0, 4]]] },
    { say:"Fil ve ördek birlikte: bum, şak!", pat:[["fil", [0, 4]], ["ördek", [2, 6]]] },
    { say:"Merdiven şarkısı: notalar yukarı çıkıyor!", pat:[["kurbağa", [0]], ["kedi", [2]], ["köpek", [4]], ["civciv", [6]]] },
    { say:"Fare zil çalıyor, fil davul!", pat:[["fil", [0, 4]], ["fare", [0, 2, 4, 6]]] },
    { say:"İniş çıkış şarkısı!", pat:[["kurbağa", [0, 7]], ["kedi", [1, 6]], ["köpek", [2, 5]], ["tavşan", [3, 4]]] },
    { say:"Büyük orkestra! Herkes çalıyor.", pat:[["fil", [0, 3, 4]], ["ördek", [2, 6]], ["fare", [1, 3, 5, 7]], ["köpek", [0]], ["tavşan", [4]]] },
    { free:true }
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

  /* ---------- sesler ---------- */
  let noiseBuf = null;
  function noise(){
    const a = audio(); if (!a) return null;
    if (!noiseBuf){ noiseBuf = a.createBuffer(1, a.sampleRate * 0.5, a.sampleRate); const d = noiseBuf.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1; }
    return noiseBuf;
  }
  function play(row, when){
    const a = audio(); if (!a || !soundOn) return;
    const t = Math.max(a.currentTime, when || a.currentTime), r = ROWS[row];
    if (r.k === "note"){
      const o = a.createOscillator(), o2 = a.createOscillator(), g = a.createGain();
      o.type = "triangle"; o.frequency.setValueAtTime(r.f, t); o2.type = "sine"; o2.frequency.setValueAtTime(r.f * 2, t);
      g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.16, t + 0.01); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.45);
      const g2 = a.createGain(); g2.gain.value = 0.25; o2.connect(g2).connect(g);
      o.connect(g).connect(a.destination); o.start(t); o2.start(t); o.stop(t + 0.5); o2.stop(t + 0.5);
    } else if (r.k === "kick"){
      const o = a.createOscillator(), g = a.createGain();
      o.type = "sine"; o.frequency.setValueAtTime(150, t); o.frequency.exponentialRampToValueAtTime(45, t + 0.25);
      g.gain.setValueAtTime(0.5, t); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.3);
      o.connect(g).connect(a.destination); o.start(t); o.stop(t + 0.32);
    } else {
      const s = a.createBufferSource(), f = a.createBiquadFilter(), g = a.createGain();
      s.buffer = noise();
      if (r.k === "hat"){ f.type = "highpass"; f.frequency.value = 7000; g.gain.setValueAtTime(0.18, t); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.06); }
      else { f.type = "bandpass"; f.frequency.value = 1500; f.Q.value = 0.8; g.gain.setValueAtTime(0.45, t); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.16); }
      s.connect(f).connect(g).connect(a.destination); s.start(t); s.stop(t + 0.2);
    }
  }

  /* ---------- durum ---------- */
  let level = 0, grid = [], target = null, mistakes = 0, playing = false, col = -1, timer = null, slow = true, mode = "", done = false, loops = 0, idleT = null;
  let freeSong = null;
  try { freeSong = JSON.parse(localStorage.getItem(SAVE + "-sarki") || "null"); } catch(e) {}
  const empty = () => ROWS.map(() => new Array(COLS).fill(false));
  const seqEl = $("seq");

  function build(){
    seqEl.textContent = "";
    ROWS.forEach((r, ri) => {
      const a = document.createElement("div"); a.className = "ani"; a.textContent = r.e; a.setAttribute("aria-hidden", "true"); a.id = "ani" + ri;
      seqEl.appendChild(a);
      for (let c = 0; c < COLS; c++){
        const b = document.createElement("button"); b.type = "button"; b.className = "sq" + (c % 4 === 0 ? " beat" : "");
        b.style.setProperty("--c", r.c); b.dataset.r = ri; b.dataset.c = c;
        b.setAttribute("aria-label", `${r.ad}, ${c + 1}. vuruş`);
        b.addEventListener("click", () => { audio(); tap(ri, c); });
        seqEl.appendChild(b);
      }
    });
  }
  function cellEl(r, c){ return seqEl.querySelector(`.sq[data-r="${r}"][data-c="${c}"]`); }
  function render(){
    seqEl.querySelectorAll(".sq").forEach(b => {
      const r = +b.dataset.r, c = +b.dataset.c;
      b.classList.toggle("on", grid[r][c]);
      b.classList.toggle("ghost", !!(target && target[r][c]));
      b.classList.toggle("col", c === col);
      b.setAttribute("aria-pressed", String(grid[r][c]));
    });
  }
  function startLevel(i){
    level = Math.max(0, Math.min(LEVELS.length - 1, i)); mistakes = 0; done = false;
    $("intro").hidden = true; $("done").hidden = true; $("party").hidden = true;
    stop();
    const L = LEVELS[level];
    if (L.free){
      mode = "free"; target = null; grid = freeSong && freeSong.length === ROWS.length ? freeSong : empty();
      $("listen").hidden = true; $("clear").hidden = false;
      task("Serbest müzik! Karelere dokun, sonra yeşil düğmeyle çal.");
    } else {
      mode = "copy"; grid = empty(); target = empty();
      for (const [nm, cs] of L.pat) for (const c of cs) target[R(nm)][c] = true;
      $("listen").hidden = false; $("clear").hidden = true;
      task(L.say + " Dinle, sonra kesikli kareleri doldur.");
      setTimeout(() => { if (mode === "copy" && level === i && !done) listen(); }, 1800);
    }
    renderDots(); render(); armIdle();
  }
  function task(t, speak){ $("task").textContent = t; if (speak !== false) say(t); }
  function renderDots(){
    const d = $("dots"); d.textContent = "";
    if (mode === "free") return;
    const need = target ? target.flat().filter(Boolean).length : 0, have = target ? target.flat().filter((v, k) => v && grid[Math.floor(k / COLS)][k % COLS]).length : 0;
    for (let k = 0; k < need; k++){ const e = document.createElement("i"); if (k < have) e.className = "on"; d.appendChild(e); }
  }
  function armIdle(){
    clearTimeout(idleT);
    document.querySelectorAll(".cb.hint").forEach(b => b.classList.remove("hint"));
    if (mode !== "copy" || done) return;
    idleT = setTimeout(() => { if (!done && !playing){ $("listen").classList.add("hint"); say("Kesikli çizgili karelere dokun."); } }, 10000);
  }
  function tap(r, c){
    if (done) return false;
    grid[r][c] = !grid[r][c];
    if (grid[r][c]){ play(r); bop(r); }
    if (mode === "copy" && grid[r][c] && !target[r][c]){
      mistakes++; const b = cellEl(r, c); b.classList.add("no"); setTimeout(() => b.classList.remove("no"), 400);
      task("Bu kare kesikli değil. Ona tekrar dokunup kapatabilirsin.", true);
    }
    render(); renderDots(); armIdle();
    if (mode === "free"){ try { localStorage.setItem(SAVE + "-sarki", JSON.stringify(grid)); } catch(e) {} }
    if (mode === "copy" && matches()) win();
    return true;
  }
  const matches = () => grid.every((row, r) => row.every((v, c) => v === target[r][c]));
  function bop(r){ const a = $("ani" + r); if (!a) return; a.classList.add("bop"); setTimeout(() => a.classList.remove("bop"), 140); }

  /* ---------- çalma ---------- */
  const stepMs = () => slow ? 330 : 220;
  function startLoop(src, times, onEnd){
    stop(); playing = true; loops = 0; col = -1; setPlayIcon();
    const a = audio();
    let next = a ? a.currentTime + 0.05 : 0;
    const tick = () => {
      col = (col + 1) % COLS;
      if (col === 0 && loops++ >= times && times > 0){ stop(); if (onEnd) onEnd(); return; }
      ROWS.forEach((_, r) => { if (src()[r][col]){ play(r, next); bop(r); } });
      next = (a ? Math.max(a.currentTime, next) : 0) + stepMs() / 1000;
      render();
      timer = setTimeout(tick, stepMs());
    };
    tick();
  }
  function stop(){ clearTimeout(timer); timer = null; playing = false; col = -1; setPlayIcon(); if (grid.length) render(); }
  function setPlayIcon(){ $("ic-play").hidden = playing; $("ic-stop").hidden = !playing; $("playb").setAttribute("aria-label", playing ? "Durdur" : "Çal"); }
  function listen(){
    if (!target) return;
    task("Dinle…", false);
    startLoop(() => target, 2, () => task("Şimdi sen! Kesikli karelere dokun."));
  }
  function win(){
    done = true; clearTimeout(idleT); sfx.ok();
    task("Harika! Şarkın tam oldu. Dinleyelim!");
    const lv = level; setTimeout(() => { if (done && level === lv && $("intro").hidden) startLoop(() => grid, 2, finishLevel); }, 900);
  }
  function starsNow(){ return mistakes <= 1 ? 3 : mistakes <= 3 ? 2 : 1; }
  function finishLevel(){
    const s = starsNow();
    best[level] = Math.max(best[level] || 0, s); persist(); renderLevels();
    if (level === LEVELS.length - 2){ $("party").hidden = false; sfx.party(); say("Süper müzisyen Egemen! Şimdi serbest müzik kutusunda kendi şarkını yap!"); return; }
    [...$("stars").children].forEach((el, i) => { el.className = ""; void el.offsetWidth; if (i < s) el.className = "on"; });
    $("stars").setAttribute("aria-label", s + " yıldız");
    $("done").hidden = false; sfx.party();
  }

  $("playb").addEventListener("click", () => { audio(); if (playing) stop(); else startLoop(() => grid, 0); });
  $("listen").addEventListener("click", () => { audio(); armIdle(); listen(); });
  $("tempo").addEventListener("click", () => { slow = !slow; $("tempo-ic").textContent = slow ? "🐢" : "🐇"; $("tempo").setAttribute("aria-label", slow ? "Hız: yavaş" : "Hız: hızlı"); });
  $("clear").addEventListener("click", () => { audio(); grid = empty(); render(); try { localStorage.removeItem(SAVE + "-sarki"); } catch(e) {} tone(300, .2, "sine", .08); });

  /* ---------- menüler ---------- */
  function renderLevels(){
    const box = $("levels"); box.textContent = "";
    const IC = ["🐘", "🦆", "🐱", "🐭", "🐰", "🎺", "🎵"];
    LEVELS.forEach((lv, i) => {
      const b = document.createElement("button");
      b.type = "button"; b.className = "lvl";
      b.setAttribute("aria-label", lv.free ? "Serbest müzik kutusu" : `Bölüm ${i + 1}${best[i] ? ", " + best[i] + " yıldız" : ""}`);
      b.innerHTML = `<span class="ic" aria-hidden="true">${IC[i]}</span>${lv.free ? "♪" : i + 1}<small aria-hidden="true">${"★".repeat(best[i] || 0)}</small>`;
      b.addEventListener("click", () => { audio(); startLevel(i); });
      box.appendChild(b);
    });
  }
  function showIntro(){ stop(); clearTimeout(idleT); if (canSpeak) speechSynthesis.cancel(); $("intro").hidden = false; $("done").hidden = true; $("party").hidden = true; }
  $("play").addEventListener("click", () => { audio(); const i = LEVELS.findIndex((l, k) => !l.free && !best[k]); startLevel(i < 0 ? LEVELS.length - 1 : i); });
  $("next").addEventListener("click", () => { audio(); startLevel(level + 1); });
  $("replay").addEventListener("click", () => { audio(); startLevel(level); });
  $("again").addEventListener("click", () => { audio(); startLevel(LEVELS.length - 1); });
  $("menu").addEventListener("click", () => { audio(); showIntro(); });
  document.addEventListener("visibilitychange", () => { if (document.hidden){ stop(); if (canSpeak) speechSynthesis.cancel(); } });

  build(); renderLevels();
  grid = empty(); render();
  $("intro").hidden = false;

  window.__mk = { ROWS, LEVELS, startLevel, tap, listen, stop, matches, get st(){ return { level, mode, mistakes, done, grid, target, playing }; } };
})();
