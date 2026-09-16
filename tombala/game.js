/* Tombala — 2-6 kişilik aile tombalası */
(function(){
  "use strict";

  const AVATARS = ["🚀", "🎈", "🌸", "⭐", "🐼", "🦊"];
  const HUES = ["#E5484D", "#3D8BFD", "#3BB273", "#F2811D", "#A05BD6", "#0E8C9E"];
  const SETTINGS_KEY = "tombala-ayar", SOUND_KEY = "tombala-ses";
  const AUTO_EVERY = 5;                 // kendiliğinden çekilişte taş arası saniye
  const RM = window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches;

  const $ = id => document.getElementById(id);
  const esc = s => String(s).replace(/[&<>"']/g, ch => ({"&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#39;"}[ch]));
  const rnd = n => Math.floor(Math.random()*n);
  function shuffle(a){ for (let i = a.length - 1; i > 0; i--){ const j = rnd(i + 1); const t = a[i]; a[i] = a[j]; a[j] = t; } return a; }

  let settings = {players:[{name:"Enes", auto:false}, {name:"Egemen", auto:true}], hint:true, autodraw:false};
  try {
    const s = JSON.parse(localStorage.getItem(SETTINGS_KEY) || "null");
    if (s && Array.isArray(s.players) && s.players.length >= 2) settings = Object.assign(settings, s, {players:s.players.slice(0, 6)});
  } catch(e) {}
  let soundOn = true;
  try { soundOn = localStorage.getItem(SOUND_KEY) !== "0"; } catch(e) {}
  const saveSettings = () => { try { localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings)); } catch(e) {} };

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
  function noise(dur, freq, vol){
    const a = audio(); if (!a || !soundOn) return;
    const len = Math.floor(a.sampleRate*dur), buf = a.createBuffer(1, len, a.sampleRate), d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = (Math.random()*2 - 1)*Math.pow(1 - i/len, 2);
    const s = a.createBufferSource(); s.buffer = buf;
    const f = a.createBiquadFilter(); f.type = "bandpass"; f.frequency.value = freq;
    const g = a.createGain(); g.gain.value = vol;
    s.connect(f).connect(g).connect(a.destination); s.start();
  }
  const sfx = {
    draw(){ noise(.22, 900, .22); tone(420, .14, "triangle", .07, 760, .12); },
    mark(){ tone(680, .07, "triangle", .07, 900); noise(.06, 2600, .12); },
    miss(){ tone(180, .16, "sine", .05, 120); },
    cinko(){ [659.25, 783.99, 1046.5].forEach((f, i) => tone(f, .22, "triangle", .1, null, i*.11)); },
    tombala(){ [523.25, 659.25, 783.99, 1046.5, 1318.5].forEach((f, i) => tone(f, .3, "triangle", .12, null, i*.12)); }
  };
  const canSpeak = "speechSynthesis" in window;
  let trVoice = null;
  function pickVoice(){ trVoice = speechSynthesis.getVoices().find(v => /^tr(-|_|$)/i.test(v.lang)) || null; }
  if (canSpeak){ pickVoice(); if (speechSynthesis.addEventListener) speechSynthesis.addEventListener("voiceschanged", pickVoice); }
  function say(text, queue){
    if (!canSpeak || !soundOn || !trVoice) return;
    if (!queue) speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text); u.voice = trVoice; u.lang = trVoice.lang; u.rate = .98; u.pitch = 1.1;
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

  // "Enes çinko yaptı" / "Sıra Egemen'de" için ad çekimleri
  function lastVowel(name){
    const low = name.toLocaleLowerCase("tr"), vowels = "aeıioöuü";
    for (let i = low.length - 1; i >= 0; i--) if (vowels.includes(low[i])) return low[i];
    return "e";
  }
  function genitive(name){ // Enes'in
    const v = lastVowel(name), low = name.toLocaleLowerCase("tr"), vowelEnd = "aeıioöuü".includes(low[low.length - 1]);
    const suf = "aı".includes(v) ? "ı" : "ei".includes(v) ? "i" : "ou".includes(v) ? "u" : "ü";
    return `${name}'${vowelEnd ? "n" : ""}${suf}n`;
  }

  /* ---------- tombala kartı ---------- */
  // 3 sıra × 9 sütun, her sırada 5 sayı, her sütunda 1-3 sayı; sütunlar 1-9, 10-19 … 80-90
  function newCard(){
    for (let guard = 0; guard < 200; guard++){
      const counts = new Array(9).fill(1);
      for (let extra = 6; extra > 0; ){ const c = rnd(9); if (counts[c] < 3){ counts[c]++; extra--; } }
      const rowCols = [[], [], []], rowCount = [0, 0, 0];
      const order = shuffle([0, 1, 2, 3, 4, 5, 6, 7, 8]).sort((a, b) => counts[b] - counts[a]);
      let ok = true;
      for (const c of order){
        const free = shuffle([0, 1, 2]).filter(r => rowCount[r] < 5).sort((a, b) => rowCount[a] - rowCount[b]);
        if (free.length < counts[c]){ ok = false; break; }
        for (let i = 0; i < counts[c]; i++){ const r = free[i]; rowCols[r].push(c); rowCount[r]++; }
      }
      if (!ok || rowCount.some(n => n !== 5)) continue;
      const grid = new Array(27).fill(0);
      for (let c = 0; c < 9; c++){
        const lo = c === 0 ? 1 : c*10, hi = c === 8 ? 90 : c*10 + 9;
        const pool = []; for (let n = lo; n <= hi; n++) pool.push(n);
        shuffle(pool);
        const rs = [0, 1, 2].filter(r => rowCols[r].includes(c));
        const nums = pool.slice(0, rs.length).sort((a, b) => a - b);
        rs.forEach((r, i) => { grid[r*9 + c] = nums[i]; });
      }
      return grid;
    }
    return new Array(27).fill(0);
  }

  /* ---------- oyun durumu ---------- */
  let G = null, timers = [];
  const later = (s, fn) => timers.push({t:s, fn});
  const clearTimers = () => { timers = []; };
  function tick(dt){
    if (timers.length){
      const due = [];
      for (const t of timers) if ((t.t -= dt) <= 0) due.push(t);
      if (due.length){ timers = timers.filter(t => t.t > 0); due.forEach(t => t.fn()); }
    }
    if (G && !G.over && settings.autodraw && $("setup").hidden && G.bag.length){
      G.autoT -= dt;
      if (G.autoT <= 0) drawStone();
    }
  }

  function startGame(){
    clearTimers();
    G = {
      players: settings.players.map((p, i) => ({
        name:p.name || `Oyuncu ${i + 1}`, auto:!!p.auto, av:AVATARS[i % AVATARS.length], hue:HUES[i % HUES.length],
        card:newCard(), marks:new Set(), lines:0, ribbons:[]
      })),
      bag:shuffle(Array.from({length:90}, (_, i) => i + 1)),
      drawn:[], out:new Set(), last:null, over:false, cinko1:-1, cinko2:-1, winner:-1, autoT:AUTO_EVERY
    };
    $("end").hidden = true;
    $("banner").hidden = true;
    buildCards();
    message("Torbada 90 taş var. İlk taşı çek!");
    render();
  }

  function message(t){ $("msg").textContent = t; }

  function drawStone(){
    if (!G || G.over || !G.bag.length) return null;
    const n = G.bag.pop();
    G.drawn.push(n); G.out.add(n); G.last = n; G.autoT = AUTO_EVERY;
    sfx.draw(); say(String(n));
    message(`${n} çıktı — kartında var mı?`);
    G.players.forEach((p, i) => { if (p.auto) later(.7 + Math.random()*1.1, () => autoMark(i, n)); });
    if (!G.bag.length) later(3, () => { if (!G.over) endGame(-1); });
    render(true);
    return n;
  }

  function autoMark(pi, n){
    if (!G || G.over) return;
    const p = G.players[pi], idx = p.card.indexOf(n);
    if (idx >= 0) mark(pi, idx);
  }

  function mark(pi, idx){
    if (!G || G.over) return false;
    const p = G.players[pi], v = p.card[idx];
    if (!v || p.marks.has(idx) || !G.out.has(v)) return false;
    p.marks.add(idx);
    sfx.mark();
    const cell = document.querySelector(`.cell[data-p="${pi}"][data-i="${idx}"]`);
    if (cell && !RM){ cell.classList.remove("drop"); void cell.offsetWidth; cell.classList.add("drop"); }
    checkLines(pi);
    render();
    return true;
  }

  function rowsDone(p){
    let n = 0;
    for (let r = 0; r < 3; r++){
      let ok = true;
      for (let c = 0; c < 9; c++){ const i = r*9 + c; if (p.card[i] && !p.marks.has(i)){ ok = false; break; } }
      if (ok) n++;
    }
    return n;
  }

  function checkLines(pi){
    const p = G.players[pi], n = rowsDone(p);
    while (p.lines < n){
      p.lines++;
      if (p.lines === 3){ endGame(pi); return; }
      if (G.cinko1 < 0){ G.cinko1 = pi; award(pi, "1. Çinko", `${p.name} çinko yaptı!`); }
      else if (G.cinko2 < 0 && p.lines >= 2){ G.cinko2 = pi; award(pi, "2. Çinko", `${p.name} ikinci çinkoyu yaptı!`); }
    }
  }

  function award(pi, label, spoken){
    G.players[pi].ribbons.push(label);
    sfx.cinko(); say(spoken);
    banner(label.toUpperCase());
    message(spoken);
  }

  let bannerT = null;
  function banner(text){
    const b = $("banner");
    b.textContent = text; b.hidden = false;
    b.classList.remove("shout"); void b.offsetWidth;
    clearTimeout(bannerT); bannerT = setTimeout(() => { b.hidden = true; }, 1800);
  }

  function endGame(pi){
    if (G.over) return;
    G.over = true; G.winner = pi;
    if (pi >= 0){
      const p = G.players[pi];
      p.ribbons.push("Tombala");
      sfx.tombala(); banner("TOMBALA!");
      message(`${p.name} tombala yaptı!`);
      say(`Tombala! ${p.name} kazandı.`);
    } else {
      sfx.cinko();
      message("Torba bitti. En çok sırayı tamamlayan kazandı.");
    }
    render();
    later(RM ? .4 : 1.8, showEnd);
  }

  function ranked(){
    return G.players.map((p, i) => ({p, i}))
      .sort((a, b) => (b.i === G.winner) - (a.i === G.winner) || b.p.lines - a.p.lines || b.p.marks.size - a.p.marks.size);
  }

  function showEnd(){
    const list = ranked(), first = list[0];
    $("end-title").textContent = G.winner >= 0 ? `${first.p.name} tombala yaptı!` : `${first.p.name} en öndeydi!`;
    $("podium").innerHTML = list.map((e, k) => {
      const res = e.p.ribbons.length ? e.p.ribbons.join(" · ") : `${e.p.marks.size} sayı`;
      return `<li><span>${k + 1}.</span><span class="av" style="background:${e.p.hue}">${e.p.av}</span>` +
             `<span class="nm">${esc(e.p.name)}</span><span class="res">${esc(res)}</span></li>`;
    }).join("");
    $("end").hidden = false;
    $("again").focus();
  }

  /* ---------- çizim ---------- */
  function buildCards(){
    $("cards").innerHTML = G.players.map((p, pi) => {
      const cells = p.card.map((v, i) => v
        ? `<button class="cell" type="button" data-p="${pi}" data-i="${i}" aria-label="${v}">${v}</button>`
        : `<span class="cell blank"></span>`).join("");
      return `<section class="tcard${p.auto ? " auto" : ""}" data-p="${pi}" aria-label="${esc(p.name)} kartı">
        <div class="thead">
          <span class="av" style="background:${p.hue}">${p.av}</span>
          <span class="nm">${esc(p.name)}${p.auto ? "<small>kendiliğinden işaretler</small>" : ""}</span>
          <span class="score" id="sc-${pi}">0/15</span>
        </div>
        <div class="ribbons" id="rb-${pi}"></div>
        <div class="grid">${cells}</div>
      </section>`;
    }).join("");
  }

  function render(popStone){
    const st = $("last-stone"), nu = $("last-num");
    nu.textContent = G.last == null ? "?" : G.last;
    if (popStone && !RM){ st.classList.remove("pop"); void st.offsetWidth; st.classList.add("pop"); }
    $("count").textContent = G.drawn.length;
    $("recent").innerHTML = G.drawn.slice(-6).map(n => `<span class="stone">${n}</span>`).join("");
    $("draw").disabled = G.over || !G.bag.length;
    $("draw").querySelector(".sack-label").textContent = G.over ? "Oyun bitti" : (G.bag.length ? "Taş çek" : "Torba boş");

    G.players.forEach((p, pi) => {
      $("sc-" + pi).textContent = `${p.marks.size}/15`;
      const rb = $("rb-" + pi);
      const html = p.ribbons.map(r => `<span class="ribbon${r === "Tombala" ? " tb" : ""}">${r}</span>`).join("");
      if (rb.innerHTML !== html) rb.innerHTML = html;
      const card = document.querySelector(`.tcard[data-p="${pi}"]`);
      if (card) card.classList.toggle("win", G.winner === pi);
    });
    document.querySelectorAll(".cell[data-p]").forEach(el => {
      const pi = +el.dataset.p, idx = +el.dataset.i, v = G.players[pi].card[idx], has = G.players[pi].marks.has(idx);
      el.classList.toggle("hit", has);
      el.classList.toggle("hint", !!settings.hint && !has && !G.over && G.out.has(v));
    });
  }

  /* ---------- olaylar ---------- */
  $("draw").addEventListener("click", () => { audio(); drawStone(); });
  $("cards").addEventListener("click", e => {
    const el = e.target.closest(".cell[data-p]");
    if (!el || !G || G.over) return;
    const pi = +el.dataset.p, idx = +el.dataset.i;
    if (G.players[pi].auto) return;
    audio();
    if (!mark(pi, idx) && !G.players[pi].marks.has(idx)){
      sfx.miss();
      if (!RM){ el.classList.remove("miss"); void el.offsetWidth; el.classList.add("miss"); }
      message("Bu sayı henüz torbadan çıkmadı.");
    }
  });

  /* ---------- ayarlar ---------- */
  function drawSetupRows(){
    $("p-rows").innerHTML = settings.players.map((p, i) => `
      <div class="p-row">
        <span class="av" style="background:${HUES[i % HUES.length]}">${AVATARS[i % AVATARS.length]}</span>
        <input type="text" id="nm-${i}" value="${esc(p.name)}" maxlength="12" aria-label="${i + 1}. oyuncunun adı">
        <div class="seg">
          <label><input type="radio" name="md-${i}" value="me" ${p.auto ? "" : "checked"}><span>Kendim</span></label>
          <label><input type="radio" name="md-${i}" value="auto" ${p.auto ? "checked" : ""}><span>Otomatik</span></label>
        </div>
      </div>`).join("");
    $("add-player").disabled = settings.players.length >= 6;
    $("remove-player").disabled = settings.players.length <= 2;
  }
  function readSetupRows(){
    settings.players.forEach((p, i) => {
      const nm = $("nm-" + i); if (nm) p.name = nm.value.trim().slice(0, 12) || `Oyuncu ${i + 1}`;
      const md = document.querySelector(`input[name="md-${i}"]:checked`); if (md) p.auto = md.value === "auto";
    });
  }
  $("add-player").addEventListener("click", () => {
    if (settings.players.length >= 6) return;
    readSetupRows();
    settings.players.push({name:`Oyuncu ${settings.players.length + 1}`, auto:true});
    drawSetupRows();
  });
  $("remove-player").addEventListener("click", () => {
    if (settings.players.length <= 2) return;
    readSetupRows(); settings.players.pop(); drawSetupRows();
  });
  $("open-setup").addEventListener("click", () => { openSetup(); });
  $("end-setup").addEventListener("click", () => { $("end").hidden = true; openSetup(); });
  $("again").addEventListener("click", () => { audio(); startGame(); });
  function openSetup(){
    drawSetupRows();
    $("hint").checked = !!settings.hint;
    $("autodraw").checked = !!settings.autodraw;
    $("setup").hidden = false;
  }
  $("setup-form").addEventListener("submit", e => {
    e.preventDefault();
    audio();
    readSetupRows();
    settings.hint = $("hint").checked;
    settings.autodraw = $("autodraw").checked;
    saveSettings();
    $("setup").hidden = true;
    startGame();
  });

  drawSetupRows();
  $("hint").checked = !!settings.hint;
  $("autodraw").checked = !!settings.autodraw;
  startGame();
  $("setup").hidden = false;

  let last = 0;
  function frame(ts){
    const dt = last ? Math.min(.05, (ts - last)/1000) : 0;
    last = ts;
    tick(dt);
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
})();
