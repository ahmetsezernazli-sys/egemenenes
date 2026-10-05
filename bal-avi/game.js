(() => {
  "use strict";
  const $ = id => document.getElementById(id);

  const SLOTS = [
    {av:"🚀", bg:"#3D8BFD"}, {av:"🎈", bg:"#FF7A2F"}, {av:"🦋", bg:"#9B5DE5"},
    {av:"🐢", bg:"#2EB872"}, {av:"🦊", bg:"#E5484D"}, {av:"🐧", bg:"#1CC7B1"}
  ];
  const DEF = [
    {n:"Enes", cpu:false, help:false, shield:false}, {n:"Egemen", cpu:false, help:true, shield:true},
    {n:"Anne", cpu:false, help:false, shield:false}, {n:"Baba", cpu:false, help:false, shield:false},
    {n:"", cpu:false, help:false, shield:false}, {n:"", cpu:false, help:false, shield:false}
  ];

  // kovanın içi: her tur dolu kovanla başlanır (20 parça)
  const BAG = [{k:"h", v:1, n:6}, {k:"h", v:2, n:5}, {k:"h", v:3, n:3}, {k:"g", v:5, n:1}, {k:"b", v:0, n:5}];
  const REC_KEY = "bal-avi-rekor";

  function newBag(){
    const a = [];
    for (const t of BAG) for (let i = 0; i < t.n; i++) a.push({k:t.k, v:t.v});
    for (let i = a.length - 1; i > 0; i--){ const j = Math.random() * (i + 1) | 0; [a[i], a[j]] = [a[j], a[i]]; }
    return a;
  }
  const limitOf = p => p.shield ? 3 : 2;

  // bir çekişin beklenen kazancı: arı turu bitirecekse eldeki bal riske girer
  function drawValue(bag, bees, limit, haul){
    if (!bag.length) return -Infinity;
    let ev = 0;
    for (const t of bag) ev += t.k === "b" ? (bees + 1 >= limit ? -haul : 0) : t.v;
    return ev / bag.length;
  }
  const bustChance = (bag, bees, limit) => bees + 1 >= limit && bag.length ? bag.filter(t => t.k === "b").length / bag.length : 0;

  // devam mı dur mu? bilgisayar da, ✨ yardım da bunu kullanır
  function wantsDraw(g, p, cautious){
    if (g.haul === 0) return true;
    const others = g.players.filter(q => q !== p).map(q => q.score);
    const lead = others.length ? Math.max(...others) : -1;
    if (g.finalRound) return p.score + g.haul <= lead;        // son tur: öndekini geçene kadar çek
    if (p.score + g.haul >= g.target) return false;           // hedefe ulaştı, kavanoza koy
    return drawValue(g.bag, g.bees, limitOf(p), g.haul) > (cautious ? 0.3 : 0);
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
  function buzz(dur, vol){
    if (!soundOn) return;
    const a = audio(); if (!a) return;
    const t = a.currentTime, o = a.createOscillator(), lfo = a.createOscillator(), lg = a.createGain(), g = a.createGain();
    o.type = "sawtooth"; o.frequency.value = 210;
    lfo.frequency.value = 28; lg.gain.value = 40; lfo.connect(lg); lg.connect(o.frequency);
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + .05); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(a.destination); o.start(t); lfo.start(t); o.stop(t + dur + .05); lfo.stop(t + dur + .05);
  }
  const sHoney = v => [0, 1, 2].slice(0, Math.min(v, 3)).forEach(k => tone(620 + k * 160 + v * 40, 900 + k * 160, "triangle", .14, .12, k * .07));
  const sGold = () => [784, 988, 1175, 1568].forEach((f, k) => tone(f, f, "triangle", .18, .13, k * .07));
  const sBank = () => [523, 659, 784].forEach((f, k) => tone(f, f * 1.01, "sine", .2, .14, k * .08));
  const sWin = () => [523, 659, 784, 1047, 1319].forEach((f, k) => tone(f, f, "triangle", .2, .14, k * .09));

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
  // "Sıra Enes'te", "Sıra Egemen'de"
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
  function renderSound(){
    $("ic-on").hidden = !soundOn; $("ic-off").hidden = soundOn;
    $("sound").setAttribute("aria-label", soundOn ? "Sesi kapat" : "Sesi aç");
    $("sound").setAttribute("aria-pressed", String(soundOn));
  }
  $("sound").addEventListener("click", () => { soundOn = !soundOn; if (!soundOn && canSpeak) speechSynthesis.cancel(); renderSound(); });
  renderSound();

  /* ---------- rekor ---------- */
  function loadRec(){ try { return JSON.parse(localStorage.getItem(REC_KEY)) || null; } catch (e) { return null; } }
  function saveRec(r){ try { localStorage.setItem(REC_KEY, JSON.stringify(r)); } catch (e) {} }
  let rec = loadRec();

  /* ---------- durum ---------- */
  let G = null, timers = [];
  const later = (sec, fn) => timers.push({t: sec, fn});

  function newGame(cfg){
    timers = [];
    G = {cfg, target: cfg.target, players: cfg.players.map(p => ({...p, score: 0, turns: 0, busts: 0})),
      cur: 0, bag: [], drawn: [], bees: 0, haul: 0, busy: false, over: false, finalRound: false, lost: false, advised: false};
    ["setup", "end"].forEach(id => $(id).hidden = true);
    turnStart();
  }
  const P = () => G.players[G.cur];

  function turnStart(){
    G.bag = newBag(); G.drawn = []; G.bees = 0; G.haul = 0; G.busy = false; G.lost = false; G.advised = false;
    const p = P();
    render();
    if (p.cpu){ setHint(`${p.name} oynuyor…`); later(.8, cpuStep); return; }
    setHint(`${p.name}, kovana dokun!`);
    if (p.help) say(`Sıra ${p.name}${suffix(p.name)}`);
  }

  function draw(){
    if (!G || G.over || G.busy || !G.bag.length) return;
    audio();
    const p = P(), t = G.bag.pop();
    G.drawn.push(t);
    const hv = $("hive"); hv.classList.remove("shake"); void hv.offsetWidth; hv.classList.add("shake");
    if (t.k === "b"){
      G.bees++;
      if (G.bees >= limitOf(p)){ bust(); return; }
      buzz(.45, .07);
      if (p.help && !p.cpu) say(`Arı! Dikkat. ${limitOf(p) - G.bees === 1 ? "Bir arı daha gelirse bal kaçar." : ""}`);
      setHint(`Bir arı! ${limitOf(p) - G.bees === 1 ? "Bir tane daha gelirse bal kaçar." : "Henüz sorun yok."}`);
    } else {
      G.haul += t.v;
      t.k === "g" ? sGold() : sHoney(t.v);
      setHint(t.k === "g" ? "Altın petek! Beş bal birden." : "Devam mı, dur mu?");
      if (p.help && !p.cpu){
        const advise = !G.advised && !wantsDraw(G, p, false);
        if (advise) G.advised = true;
        say(`${t.k === "g" ? "Altın petek! " : ""}${G.haul}.${advise ? " Bence dur!" : ""}`);
      }
    }
    render(true);
  }

  function bust(){
    const p = P();
    G.busy = true; G.lost = true; p.busts++; p.turns++;
    buzz(1.2, .12);
    const hv = $("hive"); hv.classList.remove("shake", "angry"); void hv.offsetWidth; hv.classList.add("angry");
    swarm();
    setHint(G.haul ? `Arılar kızdı! ${G.haul} bal kaçtı.` : "Arılar kızdı!");
    say(G.haul ? `Arılar kızdı! Bal kaçtı.` : "Arılar kızdı!");
    render(true);
    later(1.9, nextTurn);
  }

  function bank(){
    if (!G || G.over || G.busy || G.haul === 0) return;
    audio();
    const p = P();
    G.busy = true;
    p.score += G.haul; p.turns++;
    sBank();
    if (!p.cpu && (!rec || G.haul > rec.v)){ rec = {v: G.haul, name: p.name}; saveRec(rec); }
    let msg = `${G.haul} bal kavanoza!`;
    if (!G.finalRound && p.score >= G.target && G.players.length > 1){
      G.finalRound = true;
      msg += " Son tur!";
    }
    setHint(msg);
    say(`${p.name}, ${G.haul} bal.${G.finalRound && p.score >= G.target ? " Son tur!" : ""}`);
    render(false, G.cur);
    later(1.1, nextTurn);
  }

  function nextTurn(){
    if (!G || G.over) return;
    const n = G.players.length;
    if (n === 1 && P().score >= G.target){ finish(); return; }
    const k = (G.cur + 1) % n;
    if (G.finalRound && k === 0){ finish(); return; }
    G.cur = k;
    turnStart();
  }

  /* ---------- bilgisayar ---------- */
  function cpuStep(){
    if (!G || G.over || G.busy || !P().cpu) return;
    if (wantsDraw(G, P(), true)){ draw(); if (!G.busy) later(.75, cpuStep); }
    else later(.4, bank);
  }

  /* ---------- çizim ---------- */
  function setHint(t){ $("hintline").textContent = t; }

  function tokenEl(t, fresh){
    const d = document.createElement("span");
    d.className = "tk " + t.k + (fresh ? " pop" : "");
    d.innerHTML = t.k === "b" ? "🐝" : `<small>${t.k === "g" ? "⭐" : "🍯"}</small><b>${t.v}</b>`;
    d.setAttribute("aria-label", t.k === "b" ? "arı" : `${t.v} bal`);
    return d;
  }

  function swarm(){
    const box = $("swarm");
    box.innerHTML = "";
    const r = $("hive").getBoundingClientRect(), cx = r.left + r.width / 2, cy = r.top + r.height * .65;
    for (let i = 0; i < 12; i++){
      const b = document.createElement("i");
      b.textContent = "🐝";
      const a = Math.random() * Math.PI * 2, d = 260 + Math.random() * 320;
      b.style.left = cx - 15 + "px"; b.style.top = cy - 15 + "px";
      b.style.setProperty("--dx", Math.cos(a) * d + "px");
      b.style.setProperty("--dy", Math.sin(a) * d + "px");
      b.style.setProperty("--r", (Math.random() * 120 - 60) + "deg");
      b.style.animationDelay = (i * .05) + "s";
      box.appendChild(b);
    }
    later(2.2, () => { box.innerHTML = ""; });
  }

  function render(fresh, gainIdx){
    if (!G) return;
    const p = P(), lim = limitOf(p);
    // oyuncular
    const ul = $("players"); ul.innerHTML = "";
    G.players.forEach((q, i) => {
      const li = document.createElement("li");
      li.className = "pl" + (i === G.cur && !G.over ? " on" : "") + (i === gainIdx ? " gain" : "");
      li.innerHTML = `<span class="av" style="background:${q.bg}">${q.av}</span><span class="nm"></span><b>${q.score}</b><span class="jar"><i style="width:${Math.min(100, q.score / G.target * 100)}%"></i></span>`;
      li.querySelector(".nm").textContent = q.name + (q.cpu ? " 🤖" : "") + (q.shield ? " 🛡" : "");
      ul.appendChild(li);
    });
    $("banner").hidden = !G.finalRound || G.over;
    // kovan içeriği
    const beesLeft = G.bag.filter(t => t.k === "b").length;
    const risk = bustChance(G.bag, G.bees, lim);
    const bag = $("bag");
    bag.innerHTML = `<span>Kovanda: 🐝 ${beesLeft} · 🍯 ${G.bag.length - beesLeft}</span>`;
    if (!G.lost && !G.over){
      const s = document.createElement("span");
      s.className = risk > 0 ? "risk" : "safe";
      s.textContent = risk > 0 ? `Arı ihtimali %${Math.round(risk * 100)}` : "Şimdilik güvenli";
      bag.appendChild(s);
    }
    // arı yuvaları
    const bees = $("bees"); bees.innerHTML = "";
    for (let i = 0; i < lim; i++){
      const b = document.createElement("i");
      if (i < G.bees) { b.className = "hit"; b.textContent = "🐝"; }
      else if (i === lim - 1) b.className = "last";
      bees.appendChild(b);
    }
    $("haul").textContent = G.haul;
    $("haul").parentElement.classList.toggle("lost", G.lost);
    // çekilenler
    const tray = $("tray"); tray.innerHTML = "";
    G.drawn.forEach((t, i) => tray.appendChild(tokenEl(t, fresh && i === G.drawn.length - 1)));
    // düğmeler
    const mine = !p.cpu && !G.busy && !G.over;
    $("draw").disabled = !mine || !G.bag.length;
    $("stop").disabled = !mine || G.haul === 0;
    $("hive").disabled = !mine;
    $("hive-tip").hidden = !mine || G.drawn.length > 0;
    const help = mine && p.help;
    const go = help && wantsDraw(G, p, false);
    $("draw").classList.toggle("glow", help && go);
    $("stop").classList.toggle("glow", help && !go);
    $("hive").classList.toggle("go", help && go);
    $("record").textContent = rec ? `Rekor tur: ${rec.v} 🍯 · ${rec.name}` : "";
  }

  function finish(){
    G.over = true; G.busy = true;
    const best = Math.max(...G.players.map(q => q.score));
    const box = $("results"); box.innerHTML = "";
    [...G.players].sort((a, b) => b.score - a.score).forEach(q => {
      const d = document.createElement("div");
      if (q.score === best) d.className = "win";
      d.innerHTML = `<span></span><b>${q.score} 🍯</b>`;
      d.querySelector("span").textContent = `${q.av} ${q.name}`;
      box.appendChild(d);
    });
    let title;
    if (G.players.length === 1) title = `${G.players[0].turns} turda doldurdun!`;
    else {
      const wins = G.players.filter(q => q.score === best);
      title = wins.length > 1 ? "Berabere!" : `${wins[0].name} kazandı!`;
    }
    $("end-title").textContent = title;
    sWin();
    say(title);
    render();
    later(.7, () => { $("end").hidden = false; $("again").focus(); });
  }

  $("hive").addEventListener("click", draw);
  $("draw").addEventListener("click", draw);
  $("stop").addEventListener("click", bank);
  document.addEventListener("keydown", e => {
    if (!G || (e.target instanceof Element && e.target.closest("input, button"))) return;
    if (e.key === " "){ e.preventDefault(); if (!P().cpu) draw(); }
    if (e.key === "Enter" || e.key.toLowerCase() === "d"){ e.preventDefault(); if (!P().cpu) bank(); }
  });

  /* ---------- kurulum ---------- */
  const form = $("setup-form");
  function buildRows(){
    const n = +form.count.value, box = $("rows");
    const old = [...box.querySelectorAll(".p-row")].map(r => ({
      n: r.querySelector("input[type=text]").value,
      cpu: r.querySelector(".cpu").checked, help: r.querySelector(".help").checked, shield: r.querySelector(".shield").checked
    }));
    box.innerHTML = "";
    for (let i = 0; i < n; i++){
      const d = DEF[i], prev = old[i], row = document.createElement("div");
      row.className = "p-row";
      row.innerHTML = `<span class="av" style="background:${SLOTS[i].bg}">${SLOTS[i].av}</span>
        <input type="text" maxlength="12" aria-label="${i + 1}. oyuncunun adı" placeholder="Oyuncu ${i + 1}">
        <label class="toggle" title="Bilgisayar oynasın"><input type="checkbox" class="cpu"><span>🤖</span></label>
        <label class="toggle" title="Yardım"><input type="checkbox" class="help"><span>✨</span></label>
        <label class="toggle" title="Kalkan: üç arıda biter"><input type="checkbox" class="shield"><span>🛡</span></label>`;
      const src = prev || d;
      row.querySelector("input[type=text]").value = src.n;
      row.querySelector(".cpu").checked = src.cpu;
      row.querySelector(".help").checked = src.help;
      row.querySelector(".shield").checked = src.shield;
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
      help: r.querySelector(".help").checked,
      shield: r.querySelector(".shield").checked
    }));
    newGame({players, target: +form.target.value});
  });
  $("open-setup").addEventListener("click", () => { timers = []; if (G) G.over = true; $("end").hidden = true; $("setup").hidden = false; });
  $("end-setup").addEventListener("click", () => { $("end").hidden = true; $("setup").hidden = false; });
  $("again").addEventListener("click", () => { audio(); newGame(G.cfg); });

  /* ---------- döngü ---------- */
  let last = performance.now();
  function tick(dt){
    for (const tm of timers) tm.t -= dt;
    const due = timers.filter(tm => tm.t <= 0); timers = timers.filter(tm => tm.t > 0); due.forEach(tm => tm.fn());
  }
  function frame(now){
    const dt = Math.min(.05, (now - last) / 1000); last = now;
    tick(dt);
    requestAnimationFrame(frame);
  }
  document.addEventListener("visibilitychange", () => { last = performance.now(); if (document.hidden && canSpeak) speechSynthesis.cancel(); });
  buildRows();
  requestAnimationFrame(frame);

  // testler için: oyun mantığına dışarıdan erişim
  window.__balAvi = {state: () => G, newGame, draw, bank, tick, newBag, drawValue, bustChance, wantsDraw, limitOf};
})();
