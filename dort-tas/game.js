/* Dört Taş — iki kişilik ya da bilgisayara karşı */
(function(){
  "use strict";

  const COLS = 7, ROWS = 6;          // satır 0 en altta
  const ORDER = [3, 2, 4, 1, 5, 0, 6];
  const AVATARS = ["🚀", "🎈"], DEFAULT_NAMES = ["Enes", "Egemen"];
  const AI_DEPTH = {kolay:2, orta:4, zor:7};
  const SETTINGS_KEY = "dort-tas-ayar", SCORE_KEY = "dort-tas-skor", SOUND_KEY = "dort-tas-ses";
  const RM = window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches;

  const $ = id => document.getElementById(id);
  let settings = {mode:"pvp", ai:"orta", names:DEFAULT_NAMES.slice(), starter:1};
  try { const s = JSON.parse(localStorage.getItem(SETTINGS_KEY) || "null"); if (s) settings = Object.assign(settings, s); } catch(e) {}
  let scores = {pvp:[0, 0], ai:[0, 0]};
  try { const s = JSON.parse(localStorage.getItem(SCORE_KEY) || "null"); if (s) scores = Object.assign(scores, s); } catch(e) {}
  let soundOn = true;
  try { soundOn = localStorage.getItem(SOUND_KEY) !== "0"; } catch(e) {}
  const saveSettings = () => { try { localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings)); } catch(e) {} };
  const saveScores = () => { try { localStorage.setItem(SCORE_KEY, JSON.stringify(scores)); } catch(e) {} };

  // oyuncu 0 = mavi, oyuncu 1 = turuncu. Bilgisayara karşı modda bilgisayar mavidir.
  const isAI = p => settings.mode === "ai" && p === 0;
  const nameOf = p => isAI(p) ? "Bilgisayar" : ((settings.names[p] || "").trim() || DEFAULT_NAMES[p]);
  const avatarOf = p => isAI(p) ? "🤖" : AVATARS[p];

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
    g.gain.setValueAtTime(.0001, n); g.gain.exponentialRampToValueAtTime(vol || .1, n + .008); g.gain.exponentialRampToValueAtTime(.0001, n + dur);
    o.connect(g).connect(a.destination); o.start(n); o.stop(n + dur + .05);
  }
  const sfx = {
    drop(row, p){ tone(p ? 300 : 380, .09, "triangle", .14, (p ? 300 : 380)*.7, .08 + (ROWS - row)*.045); },
    win(){ [523.25, 659.25, 783.99, 1046.5].forEach((f, i) => tone(f, .25, "triangle", .14, null, .35 + i*.12)); },
    draw(){ tone(440, .3, "sine", .1, 330, .3); },
    hint(){ tone(1046.5, .1, "sine", .08); tone(1318.5, .14, "sine", .08, null, .08); },
    nope(){ tone(200, .12, "sine", .08, 150); }
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

  /* ---------- kurallar ---------- */
  const idx = (c, r) => c*ROWS + r;
  function newBoard(){ return {cells:new Int8Array(COLS*ROWS).fill(-1), heights:new Int8Array(COLS)}; }
  function winLine(b, c, r){
    const p = b.cells[idx(c, r)];
    for (const [dc, dr] of [[1, 0], [0, 1], [1, 1], [1, -1]]){
      const line = [[c, r]];
      for (const s of [1, -1]){
        let cc = c + dc*s, rr = r + dr*s;
        while (cc >= 0 && cc < COLS && rr >= 0 && rr < ROWS && b.cells[idx(cc, rr)] === p){ line.push([cc, rr]); cc += dc*s; rr += dr*s; }
      }
      if (line.length >= 4) return line;
    }
    return null;
  }

  /* ---------- bilgisayar (negamax + alfa-beta) ---------- */
  const WINDOWS = [];
  (function(){
    for (let c = 0; c < COLS; c++) for (let r = 0; r < ROWS; r++){
      for (const [dc, dr] of [[1, 0], [0, 1], [1, 1], [1, -1]]){
        const ec = c + dc*3, er = r + dr*3;
        if (ec < 0 || ec >= COLS || er < 0 || er >= ROWS) continue;
        WINDOWS.push([0, 1, 2, 3].map(k => idx(c + dc*k, r + dr*k)));
      }
    }
  })();
  function evaluate(b, me){
    let s = 0;
    for (let r = 0; r < ROWS; r++){ const v = b.cells[idx(3, r)]; if (v === me) s += 3; else if (v === 1 - me) s -= 3; }
    for (const w of WINDOWS){
      let mine = 0, theirs = 0, empty = 0;
      for (const i of w){ const v = b.cells[i]; if (v === me) mine++; else if (v === -1) empty++; else theirs++; }
      if (mine && theirs) continue;
      if (mine === 3 && empty === 1) s += 6; else if (mine === 2 && empty === 2) s += 2;
      if (theirs === 3 && empty === 1) s -= 8; else if (theirs === 2 && empty === 2) s -= 2;
    }
    return s;
  }
  function negamax(b, depth, alpha, beta, p, moves){
    if (moves >= COLS*ROWS) return 0;
    if (depth === 0) return evaluate(b, p);
    let best = -Infinity;
    for (const c of ORDER){
      if (b.heights[c] >= ROWS) continue;
      const r = b.heights[c];
      b.cells[idx(c, r)] = p; b.heights[c]++;
      let score;
      if (winLine(b, c, r)) score = 100000 + depth;
      else score = -negamax(b, depth - 1, -beta, -alpha, 1 - p, moves + 1);
      b.cells[idx(c, r)] = -1; b.heights[c]--;
      if (score > best) best = score;
      if (best > alpha) alpha = best;
      if (alpha >= beta) break;
    }
    return best;
  }
  function bestMove(b, p, depth, moves){
    let bestC = ORDER.find(c => b.heights[c] < ROWS), bestS = -Infinity;
    for (const c of ORDER){
      if (b.heights[c] >= ROWS) continue;
      const r = b.heights[c];
      b.cells[idx(c, r)] = p; b.heights[c]++;
      const s = winLine(b, c, r) ? 100000 + depth : -negamax(b, depth - 1, -Infinity, Infinity, 1 - p, moves + 1);
      b.cells[idx(c, r)] = -1; b.heights[c]--;
      if (s > bestS){ bestS = s; bestC = c; }
    }
    return bestC;
  }

  /* ---------- oyun durumu ---------- */
  let B = newBoard(), turn = 1, moves = 0, over = false, history = [], thinking = false, focusCol = 3;

  const boardEl = $("board"), colEls = [], cellEls = [];
  for (let c = 0; c < COLS; c++){
    const col = document.createElement("button");
    col.type = "button"; col.className = "col"; col.id = "col-" + c;
    col.setAttribute("aria-label", `${c + 1}. sütun`);
    const ghost = document.createElement("span"); ghost.className = "ghost"; col.appendChild(ghost);
    for (let rTop = ROWS - 1; rTop >= 0; rTop--){
      const cell = document.createElement("span");
      cell.className = "cell";
      cell.innerHTML = `<span class="hole"></span>`;
      col.appendChild(cell);
      cellEls[idx(c, rTop)] = cell;
    }
    col.addEventListener("click", () => humanDrop(c));
    col.addEventListener("pointerenter", () => { focusCol = c; });
    boardEl.appendChild(col); colEls.push(col);
  }

  function renderPlayers(){
    const sc = scores[settings.mode];
    [0, 1].forEach(p => {
      $("nm-" + p).textContent = nameOf(p);
      $("av-" + p).textContent = avatarOf(p);
      $("sc-" + p).textContent = sc[p];
      $("p" + p).classList.toggle("active", !over && turn === p);
    });
    colEls.forEach(col => {
      const g = col.querySelector(".ghost");
      g.className = "ghost g" + turn;
      col.disabled = over || thinking || isAI(turn);
    });
    colEls.forEach((col, c) => { if (B.heights[c] >= ROWS) col.disabled = true; });
    $("undo").disabled = !history.length || thinking || over && settings.mode === "ai" && false;
    $("hint").disabled = over || thinking || isAI(turn);
  }
  function setStatus(t){ $("status").textContent = t; }

  function newRound(){
    B = newBoard(); moves = 0; over = false; history = []; thinking = false;
    turn = settings.starter;
    cellEls.forEach(cell => { const d = cell.querySelector(".disc"); if (d) d.remove(); });
    $("result").hidden = true;
    renderPlayers();
    setStatus(`Sıra ${locative(nameOf(turn))}`);
    if (isAI(turn)) aiTurn();
    else say(`${nameOf(turn)} başlıyor.`);
  }

  function place(c, animate){
    if (over || B.heights[c] >= ROWS) return false;
    const r = B.heights[c], p = turn;
    B.cells[idx(c, r)] = p; B.heights[c]++; moves++;
    history.push(c);
    const disc = document.createElement("span");
    disc.className = "disc d" + p + (animate && !RM ? " drop" : "");
    disc.style.setProperty("--rows", ROWS - r);
    disc.style.setProperty("--dur", (.22 + (ROWS - r)*.06) + "s");
    cellEls[idx(c, r)].appendChild(disc);
    sfx.drop(r, p);
    const line = winLine(B, c, r);
    if (line){ finish(p, line); return true; }
    if (moves >= COLS*ROWS){ finish(-1, null); return true; }
    turn = 1 - turn;
    renderPlayers();
    setStatus(`Sıra ${locative(nameOf(turn))}`);
    return true;
  }

  function humanDrop(c){
    audio();
    if (over || thinking || isAI(turn)) return;
    if (B.heights[c] >= ROWS){ sfx.nope(); return; }
    colEls.forEach(col => col.classList.remove("hint"));
    place(c, true);
    if (!over && isAI(turn)) aiTurn();
  }

  function aiTurn(){
    thinking = true; renderPlayers();
    setStatus("Bilgisayar düşünüyor…");
    setTimeout(() => {
      let c;
      if (settings.ai === "kolay" && Math.random() < .45){
        const free = ORDER.filter(k => B.heights[k] < ROWS);
        c = free[Math.random()*free.length | 0];
      } else {
        c = bestMove(B, 0, AI_DEPTH[settings.ai] || 4, moves);
      }
      thinking = false;
      place(c, true);
    }, 450);
  }

  function finish(winner, line){
    over = true;
    if (winner >= 0){
      scores[settings.mode][winner]++; saveScores();
      line.forEach(([c, r]) => { const d = cellEls[idx(c, r)].querySelector(".disc"); if (d) d.classList.add("win"); });
      const nm = nameOf(winner);
      setStatus(`${nm} kazandı!`);
      $("res-title").textContent = isAI(winner) ? "Bilgisayar kazandı!" : `${nm} kazandı!`;
      $("res-sub").textContent = isAI(winner) ? "Bir daha dene, bu sefer yenersin!" : `Dört taş bir sırada. ${nameOf(0)} ${scores[settings.mode][0]} – ${scores[settings.mode][1]} ${nameOf(1)}`;
      sfx.win(); if (!isAI(winner)) confetti();
      say(isAI(winner) ? "Bilgisayar kazandı!" : `${nm} kazandı!`);
    } else {
      setStatus("Berabere!");
      $("res-title").textContent = "Berabere!";
      $("res-sub").textContent = "Tahta doldu, kimse dört taşı dizemedi.";
      sfx.draw(); say("Berabere!");
    }
    settings.starter = 1 - settings.starter; saveSettings();
    renderPlayers();
    setTimeout(() => { if (over){ $("result").hidden = false; $("res-again").focus({preventScroll:true}); } }, RM ? 100 : 1100);
  }

  function undo(){
    if (thinking || !history.length) return;
    const steps = settings.mode === "ai" ? (isAI(turn) && !over ? 1 : 2) : 1;
    for (let k = 0; k < steps && history.length; k++){
      const c = history.pop(), r = --B.heights[c], p = B.cells[idx(c, r)];
      B.cells[idx(c, r)] = -1; moves--;
      const d = cellEls[idx(c, r)].querySelector(".disc"); if (d) d.remove();
      if (over){
        // bitmiş turu geri alırken skoru da geri al
        const line = winLine(Object.assign(newBoard(), {cells:(() => { const t = B.cells.slice(); t[idx(c, r)] = p; return t; })(), heights:B.heights}), c, r);
        if (line){ scores[settings.mode][p] = Math.max(0, scores[settings.mode][p] - 1); saveScores(); }
        settings.starter = 1 - settings.starter; saveSettings();
        over = false;
        cellEls.forEach(cell => { const dd = cell.querySelector(".disc.win"); if (dd) dd.classList.remove("win"); });
      }
      turn = p;
    }
    $("result").hidden = true;
    renderPlayers();
    setStatus(`Sıra ${locative(nameOf(turn))}`);
    if (isAI(turn)) aiTurn();
  }

  function hint(){
    if (over || thinking || isAI(turn)) return;
    const c = bestMove(B, turn, 5, moves);
    colEls.forEach(col => col.classList.remove("hint"));
    void colEls[c].offsetWidth;
    colEls[c].classList.add("hint");
    setTimeout(() => colEls[c].classList.remove("hint"), 3200);
    sfx.hint();
    setStatus(`İpucu: ${c + 1}. sütun`);
  }

  function confetti(){
    if (RM) return;
    const layer = $("confetti"), colors = ["#3D6BF2", "#FF7A2F", "#FFD23F", "#2DB75A", "#9B5DE5"];
    for (let i = 0; i < 80; i++){
      const el = document.createElement("i");
      el.style.left = Math.random()*100 + "%"; el.style.background = colors[i % colors.length];
      el.style.animationDelay = Math.random()*.6 + "s"; el.style.animationDuration = 2 + Math.random()*1.5 + "s";
      el.style.setProperty("--dx", (Math.random()*160 - 80) + "px"); el.style.setProperty("--r", (Math.random()*720 - 360) + "deg");
      layer.appendChild(el);
      setTimeout(() => el.remove(), 4000);
    }
  }

  /* ---------- düğmeler ve klavye ---------- */
  $("undo").addEventListener("click", undo);
  $("hint").addEventListener("click", hint);
  $("new-round").addEventListener("click", newRound);
  $("res-again").addEventListener("click", newRound);
  $("res-look").addEventListener("click", () => { $("result").hidden = true; });

  window.addEventListener("keydown", e => {
    if (!$("setup").hidden || (e.target && e.target.tagName === "INPUT")) return;
    const k = e.key;
    if (!$("result").hidden){ if (k === "Enter" || k === " "){ e.preventDefault(); newRound(); } else if (k === "Escape") $("result").hidden = true; return; }
    if (/^[1-7]$/.test(k)){ e.preventDefault(); humanDrop(+k - 1); }
    else if (k === "ArrowLeft" || k === "ArrowRight"){
      e.preventDefault();
      focusCol = (focusCol + (k === "ArrowLeft" ? -1 : 1) + COLS) % COLS;
      colEls.forEach((col, c) => col.classList.toggle("focus", c === focusCol));
    } else if (k === "ArrowDown" || k === "Enter" || k === " "){
      e.preventDefault(); humanDrop(focusCol);
    } else if (k.toLowerCase() === "z"){ undo(); }
  });

  /* ---------- ayarlar ---------- */
  function syncMode(){
    const ai = $("mode-ai").checked;
    $("ai-level").hidden = !ai;
    $("name-0").disabled = ai;
    if (ai) $("name-0").value = "Bilgisayar";
    else if ($("name-0").value === "Bilgisayar") $("name-0").value = settings.names[0] || DEFAULT_NAMES[0];
  }
  function openSetup(){
    $("mode-" + settings.mode).checked = true;
    const a = $("ai-" + settings.ai); if (a) a.checked = true;
    $("name-0").value = settings.names[0] || DEFAULT_NAMES[0];
    $("name-1").value = settings.names[1] || DEFAULT_NAMES[1];
    syncMode();
    $("result").hidden = true;
    $("setup").hidden = false;
    $("start").focus({preventScroll:true});
  }
  $("mode-pvp").addEventListener("change", syncMode);
  $("mode-ai").addEventListener("change", syncMode);
  $("open-setup").addEventListener("click", openSetup);
  $("setup").addEventListener("click", e => { if (e.target === $("setup")) $("setup").hidden = true; });
  $("setup-form").addEventListener("submit", e => {
    e.preventDefault();
    const form = $("setup-form").elements;
    settings.mode = form.namedItem("mode").value === "ai" ? "ai" : "pvp";
    settings.ai = AI_DEPTH[form.namedItem("ai").value] ? form.namedItem("ai").value : "orta";
    if (settings.mode === "pvp") settings.names[0] = $("name-0").value.trim() || DEFAULT_NAMES[0];
    settings.names[1] = $("name-1").value.trim() || DEFAULT_NAMES[1];
    saveSettings();
    audio();
    $("setup").hidden = true;
    newRound();
  });
  $("reset-scores").addEventListener("click", () => {
    scores = {pvp:[0, 0], ai:[0, 0]}; saveScores(); renderPlayers();
    $("reset-scores").textContent = "Sıfırlandı ✓";
    setTimeout(() => { $("reset-scores").textContent = "Skorları sıfırla"; }, 1500);
  });

  newRound();
})();
