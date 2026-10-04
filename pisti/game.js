(() => {
  "use strict";
  const $ = id => document.getElementById(id);

  const SUIT = ["♠", "♥", "♦", "♣"];
  const RANK = {1:"A", 11:"J", 12:"Q", 13:"K"};
  const SLOTS = [
    {av:"🚀", bg:"#3D8BFD"}, {av:"🎈", bg:"#FF7A2F"}, {av:"🦋", bg:"#9B5DE5"}, {av:"🐢", bg:"#2EB872"}
  ];
  const DEF = [{n:"Enes", cpu:false, help:false}, {n:"Egemen", cpu:false, help:true}, {n:"Anne", cpu:false, help:false}, {n:"Baba", cpu:false, help:false}];
  const PISTI = 10, PISTI_J = 20;

  const label = c => (RANK[c.r] || c.r) + SUIT[c.s];
  const isRed = c => c.s === 1 || c.s === 2;
  // kart puanı: As 1, Vale 1, ♣2 = 2, ♦10 = 3
  const pts = c => (c.r === 1 || c.r === 11) ? 1 : (c.r === 2 && c.s === 3) ? 2 : (c.r === 10 && c.s === 2) ? 3 : 0;

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
  const sPlay = () => tone(420, 300, "triangle", .1, .1);
  const sTake = () => [520, 700].forEach((f, k) => tone(f, f * 1.3, "triangle", .14, .13, k * .07));
  const sPisti = () => [659, 784, 988, 1319].forEach((f, k) => tone(f, f, "triangle", .2, .16, k * .1));
  const sDeal = () => tone(300, 500, "sine", .06, .07);
  const sWin = () => [523, 659, 784, 1047, 1319].forEach((f, k) => tone(f, f, "triangle", .24, .15, k * .11));

  const canSpeak = "speechSynthesis" in window;
  let trVoice = null;
  function pickVoice(){ trVoice = speechSynthesis.getVoices().find(v => /^tr(-|_|$)/i.test(v.lang)) || null; }
  if (canSpeak){ pickVoice(); if (speechSynthesis.addEventListener) speechSynthesis.addEventListener("voiceschanged", pickVoice); }
  function say(text){
    if (!canSpeak || !soundOn || !trVoice) return;
    speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text); u.voice = trVoice; u.lang = trVoice.lang; u.rate = .98; u.pitch = 1.12;
    speechSynthesis.speak(u);
  }
  function renderSound(){
    $("ic-on").hidden = !soundOn; $("ic-off").hidden = soundOn;
    $("sound").setAttribute("aria-label", soundOn ? "Sesi kapat" : "Sesi aç");
    $("sound").setAttribute("aria-pressed", String(soundOn));
  }
  $("sound").addEventListener("click", () => { soundOn = !soundOn; if (!soundOn && canSpeak) speechSynthesis.cancel(); renderSound(); });
  renderSound();

  /* ---------- oyun ---------- */
  let G = null, timers = [];
  const later = (sec, fn) => timers.push({t: sec, fn});
  const shuffle = a => { for (let i = a.length - 1; i > 0; i--){ const j = Math.random() * (i + 1) | 0; [a[i], a[j]] = [a[j], a[i]]; } return a; };
  const P = () => G.players[G.cur];

  function newGame(cfg){
    timers = [];
    G = {cfg, players: cfg.players.map((p, i) => ({...p, i, hand: [], won: [], score: 0, pisti: 0, dealPts: 0})),
      deck: [], table: [], cur: 0, dealer: 0, last: -1, phase: "idle", deal: 0};
    ["setup", "end", "score", "curtain"].forEach(id => $(id).hidden = true);
    newDeal();
  }

  function newDeal(){
    G.deal++;
    G.deck = shuffle([].concat(...[1,2,3,4,5,6,7,8,9,10,11,12,13].map(r => [0,1,2,3].map(s => ({r, s})))));
    for (const p of G.players){ p.hand = []; p.won = []; p.pisti = 0; p.dealPts = 0; }
    G.table = G.deck.splice(0, 4);
    // açık kart vale olmasın
    let guard = 0;
    while (G.table[3].r === 11 && guard++ < 20) G.deck.push(G.table.splice(3, 1)[0]), G.table.push(G.deck.shift());
    G.last = -1;
    G.cur = (G.dealer + 1) % G.players.length;
    dealHands();
    G.phase = "play";
    G.hide = true;                           // perde açılana kadar el kapalı dursun
    msg(`${G.deal}. deste`, true);
    render();
    later(.6, turnStart);
  }
  function dealHands(){
    for (let k = 0; k < 4; k++) for (let i = 0; i < G.players.length; i++){
      const p = G.players[(G.cur + i) % G.players.length];
      if (G.deck.length) p.hand.push(G.deck.pop());
    }
    sDeal();
  }

  const canTake = c => G.table.length > 0 && (c.r === 11 || c.r === G.table[G.table.length - 1].r);

  function turnStart(){
    if (G.phase !== "play") return;
    const p = P();
    const humans = G.players.filter(q => !q.cpu).length;
    G.hide = !p.cpu && humans > 1;          // perde açılmadan önce el kapalı çizilsin
    render();
    if (p.cpu){ $("turn").textContent = `${p.name} düşünüyor…`; later(.9, () => play(p, cpuPick(p))); return; }
    if (humans > 1){
      $("curtain-av").textContent = p.av;
      $("curtain-av").style.background = p.bg;
      $("curtain-name").textContent = `${p.name}'in sırası`;
      $("curtain").hidden = false;
      $("curtain-go").focus();
      if (p.help) say(`Sıra ${p.name}'de`);
    } else if (p.help) say(`Sıra sende`);
    $("turn").textContent = `Sıra: ${p.name}`;
  }
  $("curtain-go").addEventListener("click", () => { audio(); $("curtain").hidden = true; G.hide = false; render(); });

  function play(p, card){
    if (G.phase !== "play") return;
    const idx = p.hand.findIndex(c => c.r === card.r && c.s === card.s);
    if (idx < 0) return;
    p.hand.splice(idx, 1);
    const take = canTake(card);
    const single = G.table.length === 1;
    G.table.push(card);
    sPlay();
    render();
    if (take){
      const pistiJ = single && card.r === 11 && G.table[0].r === 11;
      const pisti = single && card.r === G.table[0].r;
      p.won.push(...G.table);
      if (pisti){ p.pisti += pistiJ ? PISTI_J : PISTI; p.dealPts += pistiJ ? PISTI_J : PISTI; }
      G.table = [];
      G.last = p.i;
      if (pisti){ sPisti(); msg(pistiJ ? "VALE PİŞTİ! +20" : "PİŞTİ! +10", true); say(pistiJ ? "Vale pişti!" : "Pişti!"); }
      else { sTake(); msg(`${p.name} topladı`, true); if (p.help) say("Topladın!"); }
    } else msg("", false);
    later(take ? .9 : .5, next);
  }

  function next(){
    if (G.phase !== "play") return;
    G.cur = (G.cur + 1) % G.players.length;
    if (G.players.every(q => !q.hand.length)){
      if (G.deck.length){ dealHands(); render(); later(.5, turnStart); return; }
      endDeal();
      return;
    }
    turnStart();
  }

  function cpuPick(p){
    const top = G.table[G.table.length - 1];
    const takers = p.hand.filter(canTake);
    if (takers.length){
      const single = G.table.length === 1;
      const val = G.table.reduce((a, c) => a + pts(c), 0);
      // pişti şansı varsa aynı sayıyı oyna, vale saklanır
      const same = takers.filter(c => top && c.r === top.r);
      if (single && same.length) return same.sort((a, b) => pts(b) - pts(a))[0];
      if (!single && (val > 0 || G.table.length >= 3)){
        const nonJ = takers.filter(c => c.r !== 11);
        return (nonJ.length ? nonJ : takers).sort((a, b) => pts(a) - pts(b))[0];
      }
      if (same.length) return same[0];
      if (val > 0) return takers.sort((a, b) => pts(a) - pts(b))[0];
    }
    // atacak kart: tek kart bırakmamaya çalış, değerliyi sakla
    const safe = p.hand.filter(c => c.r !== 11);
    const pool = safe.length ? safe : p.hand;
    return pool.sort((a, b) => pts(a) - pts(b) || a.r - b.r)[0];
  }

  /* ---------- deste sonu ---------- */
  function endDeal(){
    G.phase = "count";
    if (G.last >= 0 && G.table.length){ G.players[G.last].won.push(...G.table); G.table = []; }
    const counts = G.players.map(p => p.won.length);
    const most = Math.max(...counts);
    const soleMost = counts.filter(c => c === most).length === 1;
    G.players.forEach(p => {
      const cardPts = p.won.reduce((a, c) => a + pts(c), 0);
      const extra = (soleMost && p.won.length === most) ? 3 : 0;
      p.dealPts = cardPts + extra + p.pisti;
      p.score += p.dealPts;
      p.lastCards = p.won.length;
      p.lastExtra = extra;
    });
    const target = G.cfg.target;
    const done = target === 1 || G.players.some(p => p.score >= target);
    showBoard($("board"), p => `${p.dealPts} puan`, true);
    $("score-title").textContent = `${G.deal}. deste bitti`;
    $("score-note").textContent = soleMost ? "En çok kartı toplayan 3 puan aldı." : "Kart sayısı eşit, 3 puan kimseye gitmedi.";
    $("score-go").textContent = done ? "Sonuç" : "Sıradaki deste";
    $("score").hidden = false;
    $("score-go").focus();
    G.doneAfterScore = done;
  }
  $("score-go").addEventListener("click", () => {
    $("score").hidden = true;
    if (G.doneAfterScore) gameOver();
    else { G.dealer = (G.dealer + 1) % G.players.length; newDeal(); }
  });
  function showBoard(box, detail, deal){
    box.innerHTML = "";
    const best = Math.max(...G.players.map(p => p.score));
    G.players.forEach(p => {
      const d = document.createElement("div");
      if (p.score === best) d.className = "win";
      d.innerHTML = `<span><span class="nm"></span> <small></small></span><small class="dt"></small><b>${p.score}</b>`;
      d.querySelector(".nm").textContent = `${p.av} ${p.name}`;
      d.querySelector("small").textContent = deal ? `${p.lastCards} kart${p.lastExtra ? " · +3" : ""}${p.pisti ? ` · pişti +${p.pisti}` : ""}` : "";
      d.querySelector(".dt").textContent = detail(p);
      box.appendChild(d);
    });
  }
  function gameOver(){
    G.phase = "over";
    const best = Math.max(...G.players.map(p => p.score));
    const wins = G.players.filter(p => p.score === best);
    showBoard($("end-board"), () => "", false);
    $("end-title").textContent = wins.length > 1 ? "Berabere!" : `${wins[0].name} kazandı!`;
    sWin();
    say(wins.length > 1 ? "Berabere!" : `${wins[0].name} kazandı!`);
    $("end").hidden = false;
    $("again").focus();
  }

  /* ---------- çizim ---------- */
  function cardEl(c, cls){
    const d = document.createElement(cls === "hand" ? "button" : "div");
    if (cls === "hand") d.type = "button";
    d.className = "card" + (isRed(c) ? " red" : "");
    d.innerHTML = `<span class="corner">${RANK[c.r] || c.r}<span>${SUIT[c.s]}</span></span><span class="r">${RANK[c.r] || c.r}</span><span class="s">${SUIT[c.s]}</span><span class="corner br">${RANK[c.r] || c.r}<span>${SUIT[c.s]}</span></span>`;
    d.setAttribute("aria-label", label(c));
    return d;
  }
  function render(){
    if (!G) return;
    // oyuncular
    const ul = $("players"); ul.innerHTML = "";
    G.players.forEach((p, i) => {
      const li = document.createElement("li");
      li.className = "pl" + (i === G.cur && G.phase === "play" ? " on" : "");
      li.innerHTML = `<span class="av" style="background:${p.bg}">${p.av}</span><span class="nm"></span><b>${p.score}</b><span class="cards">${p.won.length} kart</span>`;
      li.querySelector(".nm").textContent = p.name + (p.cpu ? " 🤖" : "");
      ul.appendChild(li);
    });
    // yer
    const pile = $("pile"); pile.innerHTML = "";
    const show = G.table.slice(-3);
    show.forEach((c, k) => {
      const el = cardEl(c, "pile");
      el.style.translate = `${(k - show.length + 1) * 16}px ${(k - show.length + 1) * -6}px`;
      el.style.rotate = `${(k - 1) * 4}deg`;
      pile.appendChild(el);
    });
    if (G.table.length > 3){
      const b = document.createElement("div");
      b.className = "card";
      b.style.translate = "-70px 10px";
      b.innerHTML = `<span class="r">${G.table.length}</span><span class="s">kart</span>`;
      pile.appendChild(b);
    }
    $("deck-left").textContent = G.deck.length;
    // el
    const hand = $("hand"); hand.innerHTML = "";
    const p = P(), hidden = G.hide || p.cpu || G.phase !== "play";
    hand.classList.toggle("locked", hidden);
    if (!hidden){
      for (const c of p.hand){
        const el = cardEl(c, "hand");
        if (p.help){
          const take = canTake(c);
          el.classList.add(take ? "can" : "dim");
        }
        el.addEventListener("click", () => { audio(); play(p, c); });
        hand.appendChild(el);
      }
    } else {
      const n = p.hand.length;
      for (let k = 0; k < n; k++){
        const b = document.createElement("div");
        b.className = "card";
        b.style.background = "repeating-linear-gradient(135deg,#1F6B46 0 6px,#175436 6px 12px)";
        hand.appendChild(b);
      }
    }
    $("turn").textContent = G.phase === "play" ? `Sıra: ${p.name}${p.cpu ? " 🤖" : ""}` : "";
  }
  let msgT = 0;
  function msg(text, show){
    const el = $("msg");
    el.textContent = text;
    el.classList.toggle("hide", !show || !text);
    if (show && text){ el.classList.remove("pop"); void el.offsetWidth; el.classList.add("pop"); }
    clearTimeout(msgT);
    if (show && text) msgT = setTimeout(() => el.classList.add("hide"), 1400);
  }

  /* ---------- kurulum ---------- */
  const form = $("setup-form");
  function buildRows(){
    const count = +form.count.value, box = $("rows");
    const old = [...box.querySelectorAll(".p-row")].map(r => ({
      n: r.querySelector("input[type=text]").value,
      cpu: r.querySelector(".cpu").checked, help: r.querySelector(".help").checked
    }));
    box.innerHTML = "";
    for (let i = 0; i < count; i++){
      const d = DEF[i], prev = old[i], row = document.createElement("div");
      row.className = "p-row";
      row.innerHTML = `<span class="av" style="background:${SLOTS[i].bg}">${SLOTS[i].av}</span>
        <input type="text" maxlength="12" aria-label="${i + 1}. oyuncunun adı" placeholder="Oyuncu ${i + 1}">
        <label class="toggle"><input type="checkbox" class="cpu"><span>🤖</span></label>
        <label class="toggle"><input type="checkbox" class="help"><span>✨</span></label>`;
      row.querySelector("input[type=text]").value = prev ? prev.n : d.n;
      row.querySelector(".cpu").checked = prev ? prev.cpu : d.cpu;
      row.querySelector(".help").checked = prev ? prev.help : d.help;
      box.appendChild(row);
    }
  }
  form.addEventListener("change", e => { if (e.target.name === "count") buildRows(); });
  form.addEventListener("submit", e => {
    e.preventDefault();
    audio();
    const rows = [...$("rows").querySelectorAll(".p-row")];
    const players = rows.map((r, i) => ({
      name: r.querySelector("input[type=text]").value.trim() || `Oyuncu ${i + 1}`,
      av: SLOTS[i].av, bg: SLOTS[i].bg,
      cpu: r.querySelector(".cpu").checked,
      help: r.querySelector(".help").checked
    }));
    newGame({players, target: +form.target.value});
  });
  $("open-setup").addEventListener("click", () => { timers = []; if (G) G.phase = "idle"; ["end","score","curtain"].forEach(id => $(id).hidden = true); $("setup").hidden = false; });
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
  buildRows();
  requestAnimationFrame(frame);
})();
