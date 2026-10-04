(() => {
  "use strict";
  const $ = id => document.getElementById(id);

  // 0-5 alt oyuncunun kuyuları, 6 alt hazine, 7-12 üst oyuncunun kuyuları, 13 üst hazine
  const STORE = [6, 13];
  const PITS = [[0,1,2,3,4,5], [7,8,9,10,11,12]];
  const opp = i => 12 - i;
  const mine = (p, i) => (p === 0 ? i >= 0 && i <= 5 : i >= 7 && i <= 12);

  function startBoard(){
    const b = new Array(14).fill(4);
    b[6] = b[13] = 0;
    return b;
  }
  const legal = (b, p) => PITS[p].filter(i => b[i] > 0);
  const over = b => legal(b, 0).length === 0 || legal(b, 1).length === 0;

  // bir hamleyi uygula: {b, again, got, path, last}
  function doMove(board, p, pit){
    const b = board.slice(), path = [];
    let n = b[pit], i = pit, got = 0;
    if (n === 1){ b[pit] = 0; }
    else { b[pit] = 1; n -= 1; }
    while (n > 0){
      i = (i + 1) % 14;
      if (i === STORE[1 - p]) continue;              // rakibin hazinesi atlanır
      b[i]++; n--; path.push(i);
    }
    let again = false, taken = 0, takenAt = -1;
    if (i === STORE[p]) again = true;
    else if (!mine(p, i) && b[i] % 2 === 0){         // rakip kuyusunu çift yaptı
      taken = b[i]; b[i] = 0; b[STORE[p]] += taken; takenAt = i;
    } else if (mine(p, i) && b[i] === 1 && b[opp(i)] > 0){   // kendi boş kuyusuna düştü
      taken = b[opp(i)] + 1;
      b[STORE[p]] += taken;
      b[opp(i)] = 0; b[i] = 0; takenAt = opp(i);
    }
    got = taken;
    // oyun bitti mi: kalan taşlar rakibin hazinesine
    let ended = false;
    if (legal(b, 0).length === 0 || legal(b, 1).length === 0){
      ended = true;
      for (const q of [0, 1]) for (const k of PITS[q]){ b[STORE[q]] += b[k]; b[k] = 0; }
    }
    return {b, again: again && !ended, got, path, last: i, takenAt, ended};
  }

  /* ---------- ses ---------- */
  let soundOn = true, ac = null;
  function audio(){
    if (!ac){ try { ac = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { ac = null; } }
    if (ac && ac.state === "suspended") ac.resume();
    return ac;
  }
  function tone(f1, f2, type, dur, vol, delay){
    if (!soundOn) return;
    const a = audio(); if (!a) return;
    const t = a.currentTime + (delay || 0), o = a.createOscillator(), g = a.createGain();
    o.type = type; o.frequency.setValueAtTime(f1, t); o.frequency.exponentialRampToValueAtTime(Math.max(20, f2), t + dur * .9);
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + .01); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(a.destination); o.start(t); o.stop(t + dur + .05);
  }
  const sDrop = k => tone(300 + (k % 6) * 40, 260, "triangle", .07, .07);
  const sStore = () => tone(620, 820, "sine", .12, .12);
  const sTake = () => [660, 880, 1100].forEach((f, k) => tone(f, f, "triangle", .14, .13, k * .07));
  const sAgain = () => [520, 700].forEach((f, k) => tone(f, f * 1.2, "triangle", .14, .12, k * .09));
  const sWin = () => [523, 659, 784, 1047, 1319].forEach((f, k) => tone(f, f, "triangle", .22, .15, k * .1));

  const canSpeak = "speechSynthesis" in window;
  let trVoice = null;
  function pickVoice(){ trVoice = speechSynthesis.getVoices().find(v => /^tr(-|_|$)/i.test(v.lang)) || null; }
  if (canSpeak){ pickVoice(); if (speechSynthesis.addEventListener) speechSynthesis.addEventListener("voiceschanged", pickVoice); }
  function say(text){
    if (!canSpeak || !soundOn || !trVoice) return;
    speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text); u.voice = trVoice; u.lang = trVoice.lang; u.rate = .98; u.pitch = 1.1;
    speechSynthesis.speak(u);
  }
  function renderSound(){
    $("ic-on").hidden = !soundOn; $("ic-off").hidden = soundOn;
    $("sound").setAttribute("aria-label", soundOn ? "Sesi kapat" : "Sesi aç");
    $("sound").setAttribute("aria-pressed", String(soundOn));
  }
  $("sound").addEventListener("click", () => { soundOn = !soundOn; if (!soundOn && canSpeak) speechSynthesis.cancel(); renderSound(); });
  renderSound();

  /* ---------- bilgisayar ---------- */
  function evalBoard(b, me){
    const them = 1 - me;
    return (b[STORE[me]] - b[STORE[them]]) + .18 * (PITS[me].reduce((a, i) => a + b[i], 0) - PITS[them].reduce((a, i) => a + b[i], 0));
  }
  function best(b, me, depth, turn){
    const moves = legal(b, turn);
    if (!moves.length || depth <= 0) return {score: evalBoard(b, me), pit: moves[0]};
    let bestPit = moves[0], bestScore = turn === me ? -1e9 : 1e9;
    for (const pit of moves){
      const r = doMove(b, turn, pit);
      const next = r.ended ? {score: evalBoard(r.b, me)} : best(r.b, me, depth - 1, r.again ? turn : 1 - turn);
      const sc = next.score;
      if (turn === me ? sc > bestScore : sc < bestScore){ bestScore = sc; bestPit = pit; }
    }
    return {score: bestScore, pit: bestPit};
  }
  function cpuPick(b, me, level){
    const moves = legal(b, me);
    if (level === 0) return moves[Math.random() * moves.length | 0];
    return best(b, me, level === 1 ? 2 : 5, me).pit;
  }

  /* ---------- durum ---------- */
  let G = null, timers = [];
  const later = (sec, fn) => timers.push({t: sec, fn});

  function newGame(cfg){
    timers = [];
    G = {cfg, b: startBoard(), cur: 0, busy: false, over: false, players: cfg.players};
    ["setup", "end"].forEach(id => $(id).hidden = true);
    $("nm-0").textContent = cfg.players[0].name;
    $("nm-1").textContent = cfg.players[1].name;
    buildBoard();
    render();
    turnStart();
  }

  const pitEls = [];
  function buildBoard(){
    pitEls.length = 0;
    for (const p of [0, 1]){
      const row = $("row-" + p);
      row.innerHTML = "";
      const order = p === 0 ? PITS[0] : PITS[1].slice().reverse();
      for (const i of order){
        const b = document.createElement("button");
        b.type = "button"; b.className = "pit";
        b.innerHTML = `<span class="stones"></span><b></b>`;
        b.setAttribute("aria-label", `${p === 0 ? "alt" : "üst"} ${order.indexOf(i) + 1}. kuyu`);
        b.addEventListener("click", () => human(i));
        row.appendChild(b);
        pitEls[i] = b;
      }
    }
  }

  function turnStart(){
    if (G.over) return;
    const p = G.players[G.cur];
    $("turn").innerHTML = `Sıra: <span class="p${G.cur}">${p.name}</span>`;
    render();
    if (p.cpu){
      $("hintline").textContent = "Bilgisayar düşünüyor…";
      later(.7, () => { const pit = cpuPick(G.b, G.cur, G.cfg.cpu); apply(pit); });
    } else {
      $("hintline").textContent = p.help ? "Yeşil: tekrar oynarsın · Sarı: taş kazanırsın" : "Bir kuyuna dokun.";
      if (p.help) say(`Sıra ${p.name}'de`);
    }
  }

  function human(pit){
    if (!G || G.busy || G.over) return;
    const p = G.players[G.cur];
    if (p.cpu || !mine(G.cur, pit) || G.b[pit] === 0) return;
    audio();
    apply(pit);
  }

  function apply(pit){
    if (G.busy || G.over) return;
    const who = G.cur, r = doMove(G.b, who, pit);
    G.busy = true;
    // taşları tek tek dağıt
    let k = 0;
    const b = G.b.slice();
    if (b[pit] === 1) b[pit] = 0; else b[pit] = 1;
    const sow = () => {
      if (k < r.path.length){
        const i = r.path[k];
        b[i]++;
        drawBoard(b);
        flash(i);
        if (i === STORE[who]) sStore(); else sDrop(k);
        k++;
        later(.11, sow);
        return;
      }
      G.b = r.b;
      drawBoard(G.b);
      if (r.got > 0){
        sTake();
        if (r.takenAt >= 0 && pitEls[r.takenAt]){ pitEls[r.takenAt].classList.remove("take"); void pitEls[r.takenAt].offsetWidth; pitEls[r.takenAt].classList.add("take"); }
        msg(`${r.got} taş!`);
        if (G.players[who].help) say(`${r.got} taş kazandın!`);
      } else if (r.again){
        sAgain(); msg("Tekrar oyna!");
        if (G.players[who].help) say("Tekrar oynuyorsun!");
      }
      later(r.got || r.again ? .75 : .35, () => {
        G.busy = false;
        if (r.ended){ finish(); return; }
        if (!r.again) G.cur = 1 - who;
        turnStart();
      });
    };
    sow();
  }

  function finish(){
    G.over = true;
    render();
    const s0 = G.b[STORE[0]], s1 = G.b[STORE[1]];
    const box = $("results"); box.innerHTML = "";
    G.players.forEach((p, i) => {
      const d = document.createElement("div");
      const sc = i === 0 ? s0 : s1;
      if (sc === Math.max(s0, s1)) d.className = "win";
      d.innerHTML = `<span></span><b>${sc} taş</b>`;
      d.querySelector("span").textContent = p.name;
      box.appendChild(d);
    });
    $("end-title").textContent = s0 === s1 ? "Berabere!" : `${G.players[s0 > s1 ? 0 : 1].name} kazandı!`;
    $("turn").textContent = "Oyun bitti";
    $("hintline").textContent = "";
    sWin();
    say(s0 === s1 ? "Berabere!" : `${G.players[s0 > s1 ? 0 : 1].name} kazandı!`);
    later(.8, () => { $("end").hidden = false; $("again").focus(); });
  }

  /* ---------- çizim ---------- */
  function drawBoard(b){
    for (let i = 0; i < 14; i++){
      if (i === 6 || i === 13) continue;
      const el = pitEls[i];
      el.querySelector("b").textContent = b[i] || "";
      const dots = el.querySelector(".stones");
      const n = Math.min(b[i], 12);
      if (dots.childElementCount !== n){
        dots.innerHTML = "";
        for (let k = 0; k < n; k++) dots.appendChild(document.createElement("i"));
      }
    }
    $("sc-0").textContent = b[6];
    $("sc-1").textContent = b[13];
    for (const s of [0, 1]){
      const box = $("pips-" + s), n = Math.min(b[STORE[s]], 24);
      if (box.childElementCount !== n){
        box.innerHTML = "";
        for (let k = 0; k < n; k++) box.appendChild(document.createElement("i"));
      }
    }
  }
  function render(){
    drawBoard(G.b);
    const p = G.players[G.cur], moves = legal(G.b, G.cur);
    for (let i = 0; i < 14; i++){
      if (i === 6 || i === 13) continue;
      const el = pitEls[i];
      el.classList.remove("live", "extra", "capture");
      if (G.over || G.busy || p.cpu) continue;
      if (!moves.includes(i)) continue;
      el.classList.add("live");
      if (p.help){
        const r = doMove(G.b, G.cur, i);
        if (r.again) el.classList.add("extra");
        else if (r.got > 0) el.classList.add("capture");
      }
    }
    $("store-0").classList.toggle("on", !G.over && G.cur === 0);
    $("store-1").classList.toggle("on", !G.over && G.cur === 1);
  }
  function flash(i){
    const el = pitEls[i];
    if (!el) return;
    el.classList.remove("drop"); void el.offsetWidth; el.classList.add("drop");
  }
  let msgT = 0;
  function msg(text){
    const el = $("msg");
    el.textContent = text; el.hidden = false;
    el.style.animation = "none"; void el.offsetWidth; el.style.animation = "";
    clearTimeout(msgT); msgT = setTimeout(() => el.hidden = true, 1300);
  }

  /* ---------- kurulum ---------- */
  const form = $("setup-form");
  function syncMode(){
    const cpu = form.mode.value === "cpu";
    $("cpu-level").hidden = !cpu;
    $("pn-1").disabled = cpu;
    $("pn-1").value = cpu ? "Bilgisayar" : ($("pn-1").dataset.name || "Egemen");
  }
  form.addEventListener("change", e => { if (e.target.name === "mode") syncMode(); });
  $("pn-1").addEventListener("input", e => { if (!e.target.disabled) e.target.dataset.name = e.target.value; });
  form.addEventListener("submit", e => {
    e.preventDefault();
    audio();
    const cpu = form.mode.value === "cpu";
    const players = [
      {name: $("pn-0").value.trim() || "Alt", help: $("help-0").checked, cpu: false},
      {name: ($("pn-1").value.trim() || "Üst"), help: $("help-1").checked && !cpu, cpu}
    ];
    newGame({players, cpu: cpu ? +form.cpu.value : null});
  });
  $("open-setup").addEventListener("click", () => { timers = []; if (G){ G.over = true; } $("end").hidden = true; $("setup").hidden = false; });
  $("end-setup").addEventListener("click", () => { $("end").hidden = true; $("setup").hidden = false; });
  $("again").addEventListener("click", () => { audio(); newGame(G.cfg); });

  /* ---------- döngü ---------- */
  let last = performance.now();
  function frame(now){
    const dt = Math.min(.05, (now - last) / 1000); last = now;
    for (const tm of timers) tm.t -= dt;
    const due = timers.filter(tm => tm.t <= 0); timers = timers.filter(tm => tm.t > 0); due.forEach(tm => tm.fn());
    requestAnimationFrame(frame);
  }
  document.addEventListener("visibilitychange", () => { last = performance.now(); if (document.hidden && canSpeak) speechSynthesis.cancel(); });
  $("pn-0").value = "Enes"; $("pn-1").value = "Egemen"; $("pn-1").dataset.name = "Egemen";
  requestAnimationFrame(frame);
})();
