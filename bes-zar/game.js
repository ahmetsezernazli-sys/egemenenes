(() => {
  "use strict";
  const $ = id => document.getElementById(id);

  const SLOTS = [
    {av:"🚀", bg:"#3D8BFD"}, {av:"🎈", bg:"#FF7A2F"}, {av:"🦋", bg:"#9B5DE5"},
    {av:"🐢", bg:"#2EB872"}, {av:"🦊", bg:"#E5484D"}, {av:"🐧", bg:"#1CC7B1"}
  ];
  const DEF = [{n:"Enes", cpu:false, help:false}, {n:"Egemen", cpu:false, help:true}, {n:"Anne", cpu:false, help:false}, {n:"Baba", cpu:false, help:false}, {n:"", cpu:false, help:false}, {n:"", cpu:false, help:false}];

  const count = (d, f) => d.filter(v => v === f).length;
  const sum = d => d.reduce((a, b) => a + b, 0);
  const counts = d => [1,2,3,4,5,6].map(f => count(d, f));
  const hasRun = (d, n) => {
    const u = [...new Set(d)].sort((a, b) => a - b);
    let run = 1, best = 1;
    for (let i = 1; i < u.length; i++){ run = u[i] === u[i-1] + 1 ? run + 1 : 1; best = Math.max(best, run); }
    return best >= n;
  };

  const CATS = [
    {id:"1", nm:"Birler",     up:true, face:1, sc:d => count(d, 1) * 1},
    {id:"2", nm:"İkiler",     up:true, face:2, sc:d => count(d, 2) * 2},
    {id:"3", nm:"Üçler",      up:true, face:3, sc:d => count(d, 3) * 3},
    {id:"4", nm:"Dörtler",    up:true, face:4, sc:d => count(d, 4) * 4},
    {id:"5", nm:"Beşler",     up:true, face:5, sc:d => count(d, 5) * 5},
    {id:"6", nm:"Altılar",    up:true, face:6, sc:d => count(d, 6) * 6},
    {id:"3k", nm:"Üç aynı",   ic:"🎯", sc:d => counts(d).some(c => c >= 3) ? sum(d) : 0},
    {id:"4k", nm:"Dört aynı", ic:"💥", sc:d => counts(d).some(c => c >= 4) ? sum(d) : 0},
    {id:"fh", nm:"Full ev",   ic:"🏠", sc:d => { const c = counts(d); return (c.includes(3) && c.includes(2)) || c.includes(5) ? 25 : 0; }},
    {id:"kk", nm:"Küçük kent", ic:"🚶", sc:d => hasRun(d, 4) ? 30 : 0},
    {id:"bk", nm:"Büyük kent", ic:"🏃", sc:d => hasRun(d, 5) ? 40 : 0},
    {id:"5k", nm:"Beş aynı",  ic:"⭐", sc:d => counts(d).some(c => c === 5) ? 50 : 0},
    {id:"sa", nm:"Şans",      ic:"🍀", sc:d => sum(d)}
  ];
  const UPPER = CATS.filter(c => c.up).map(c => c.id);
  const BONUS = 35, BONUS_AT = 63;

  function totals(sheet){
    const up = UPPER.reduce((a, id) => a + (sheet[id] || 0), 0);
    const bonus = up >= BONUS_AT ? BONUS : 0;
    const low = CATS.filter(c => !c.up).reduce((a, c) => a + (sheet[c.id] || 0), 0);
    return {up, bonus, low, total: up + bonus + low};
  }
  const full = sheet => CATS.every(c => sheet[c.id] !== null && sheet[c.id] !== undefined);

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
  const sRoll = () => { for (let k = 0; k < 7; k++) tone(180 + Math.random() * 400, 150, "square", .05, .05, k * .045); };
  const sHold = on => tone(on ? 700 : 420, on ? 900 : 360, "sine", .07, .1);
  const sWrite = v => v > 0 ? [520, 700].forEach((f, k) => tone(f, f * 1.2, "triangle", .13, .12, k * .07)) : tone(300, 180, "square", .22, .08);
  const sBig = () => [523, 659, 784, 1047, 1319].forEach((f, k) => tone(f, f, "triangle", .2, .14, k * .09));

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

  /* ---------- durum ---------- */
  let G = null, timers = [];
  const later = (sec, fn) => timers.push({t: sec, fn});

  function newGame(cfg){
    timers = [];
    G = {cfg, players: cfg.players.map(p => ({...p, sheet: Object.fromEntries(CATS.map(c => [c.id, null]))})),
      cur: 0, dice: [1,1,1,1,1], held: [false,false,false,false,false], rolls: 0, rolled: false, over: false, busy: false};
    ["setup", "end"].forEach(id => $(id).hidden = true);
    buildCard();
    turnStart();
  }
  const P = () => G.players[G.cur];

  function turnStart(){
    G.dice = [1,1,1,1,1]; G.held = [false,false,false,false,false]; G.rolls = 0; G.rolled = false; G.busy = false;
    render();
    const p = P();
    if (p.cpu){ $("hintline").textContent = `${p.name} oynuyor…`; later(.7, cpuTurn); return; }
    $("hintline").textContent = "Zarları at.";
    if (p.help) say(`Sıra ${p.name}'de`);
  }

  function roll(){
    if (!G || G.over || G.busy || G.rolls >= 3) return;
    audio();
    G.busy = true;
    G.rolls++; G.rolled = true;
    for (let i = 0; i < 5; i++) if (!G.held[i]) G.dice[i] = 1 + (Math.random() * 6 | 0);
    sRoll();
    [...$("dice").children].forEach((el, i) => { if (!G.held[i]){ el.classList.remove("rolling"); void el.offsetWidth; el.classList.add("rolling"); } });
    render();
    later(.45, () => { G.busy = false; render(); if (P().help && !P().cpu) sayBest(); });
  }
  function sayBest(){
    const open = CATS.filter(c => P().sheet[c.id] === null);
    const best = open.map(c => ({c, v: c.sc(G.dice)})).sort((a, b) => b.v - a.v)[0];
    if (best && best.v > 0) say(`${best.c.nm}: ${best.v} puan`);
  }
  function hold(i){
    if (!G || G.over || G.busy || !G.rolled || P().cpu) return;
    audio();
    G.held[i] = !G.held[i];
    sHold(G.held[i]);
    render();
  }
  function pick(catId){
    if (!G || G.over || G.busy || !G.rolled || P().cpu) return;
    audio();
    write(catId);
  }
  function write(catId){
    const p = P(), cat = CATS.find(c => c.id === catId);
    if (!cat || p.sheet[catId] !== null) return;
    const v = cat.sc(G.dice);
    p.sheet[catId] = v;
    sWrite(v);
    if (v >= 40) sBig();
    if (p.help && !p.cpu) say(v > 0 ? `${cat.nm}, ${v} puan` : `${cat.nm}, sıfır`);
    G.busy = true;
    render(catId);
    later(.9, () => {
      if (G.players.every(q => full(q.sheet))){ finish(); return; }
      let k = G.cur;
      do { k = (k + 1) % G.players.length; } while (full(G.players[k].sheet));
      G.cur = k;
      turnStart();
    });
  }

  /* ---------- bilgisayar ---------- */
  function cpuTurn(){
    const p = P();
    const step = () => {
      roll();
      later(.6, () => {
        if (G.rolls < 3){
          // en çok tekrar eden yüzü tut, kent şansı varsa diziyi tut
          const c = counts(G.dice);
          const bestFace = c.indexOf(Math.max(...c)) + 1;
          const seq = [...new Set(G.dice)].sort((a, b) => a - b);
          let runKeep = null;
          for (let s = 1; s <= 3; s++){
            const want = [s, s+1, s+2, s+3].filter(v => seq.includes(v));
            if (want.length >= 3) runKeep = want;
          }
          const keepRun = runKeep && Math.max(...c) < 3;
          G.held = G.dice.map(v => keepRun ? runKeep.includes(v) : v === bestFace);
          if (keepRun){                       // aynı sayıdan iki tane tutmasın
            const seen = {};
            G.held = G.dice.map(v => { if (!runKeep.includes(v) || seen[v]) return false; seen[v] = 1; return true; });
          }
          render();
          later(.5, step);
        } else {
          const open = CATS.filter(c => p.sheet[c.id] === null)
            .map(c => ({c, v: c.sc(G.dice)}))
            .sort((a, b) => b.v - a.v || (a.c.up ? -1 : 1));
          // hepsi sıfırsa en az değerli kutuyu feda et
          const choice = open[0].v > 0 ? open[0] : open.sort((a, b) => (a.c.up ? a.c.face : 20) - (b.c.up ? b.c.face : 20))[0];
          later(.4, () => write(choice.c.id));
        }
      });
    };
    step();
  }

  /* ---------- çizim ---------- */
  const PIP = {
    1:[4], 2:[0,8], 3:[0,4,8], 4:[0,2,6,8], 5:[0,2,4,6,8], 6:[0,2,3,5,6,8]
  };
  function buildDice(){
    const box = $("dice"); box.innerHTML = "";
    for (let i = 0; i < 5; i++){
      const b = document.createElement("button");
      b.type = "button"; b.className = "die";
      b.innerHTML = `<span class="pips"></span>`;
      b.addEventListener("click", () => hold(i));
      box.appendChild(b);
    }
  }
  function drawDie(el, v, held){
    el.classList.toggle("held", held);
    el.setAttribute("aria-label", `${v}${held ? ", tutuluyor" : ""}`);
    const pips = el.querySelector(".pips");
    const want = PIP[v];
    pips.innerHTML = "";
    for (let k = 0; k < 9; k++){
      const i = document.createElement("i");
      if (!want.includes(k)) i.style.visibility = "hidden";
      pips.appendChild(i);
    }
  }
  function buildCard(){
    const box = $("card"); box.innerHTML = "";
    for (const c of CATS){
      const b = document.createElement("button");
      b.type = "button"; b.className = "box"; b.dataset.cat = c.id;
      const ic = c.up ? `<span class="ic">${"<i></i>".repeat(Math.min(c.face, 3))}${c.face > 3 ? "+" : ""}</span>` : `<span class="ic">${c.ic}</span>`;
      b.innerHTML = `${ic}<span class="nm">${c.nm}</span><span class="val"></span>`;
      b.addEventListener("click", () => pick(c.id));
      box.appendChild(b);
    }
    const t = document.createElement("div");
    t.className = "box total"; t.id = "totbox";
    t.innerHTML = `<span class="ic">🏅</span><span class="nm">Toplam</span><span class="val">0</span>`;
    box.appendChild(t);
  }
  function render(justCat){
    if (!G) return;
    // oyuncular
    const ul = $("players"); ul.innerHTML = "";
    G.players.forEach((p, i) => {
      const li = document.createElement("li");
      li.className = "pl" + (i === G.cur && !G.over ? " on" : "");
      li.innerHTML = `<span class="av" style="background:${p.bg}">${p.av}</span><span class="nm"></span><b>${totals(p.sheet).total}</b>`;
      li.querySelector(".nm").textContent = p.name + (p.cpu ? " 🤖" : "");
      ul.appendChild(li);
    });
    // zarlar
    [...$("dice").children].forEach((el, i) => {
      drawDie(el, G.dice[i], G.held[i]);
      el.disabled = !G.rolled || G.busy || G.over || P().cpu;
      el.style.opacity = G.rolled ? 1 : .45;
    });
    const r = $("roll");
    r.disabled = G.over || G.busy || G.rolls >= 3 || P().cpu;
    r.textContent = G.rolls === 0 ? "Zarları at" : G.rolls < 3 ? `Tekrar at (${3 - G.rolls})` : "Bir kutu seç";
    // puan kâğıdı
    const p = P(), open = CATS.filter(c => p.sheet[c.id] === null);
    const bestV = G.rolled ? Math.max(...open.map(c => c.sc(G.dice)), 0) : -1;
    for (const c of CATS){
      const el = $("card").querySelector(`[data-cat="${c.id}"]`);
      const v = p.sheet[c.id];
      el.classList.remove("filled", "open", "best", "zero", "just");
      if (v !== null){
        el.classList.add("filled");
        el.querySelector(".val").textContent = v;
        el.disabled = true;
      } else {
        el.disabled = !G.rolled || G.busy || G.over || p.cpu;
        const pv = G.rolled ? c.sc(G.dice) : null;
        el.querySelector(".val").textContent = pv === null ? "" : pv;
        if (G.rolled && !p.cpu && !G.busy){
          el.classList.add("open");
          if (pv === 0) el.classList.add("zero");
          if (p.help && pv === bestV && bestV > 0) el.classList.add("best");
        }
      }
      if (justCat === c.id) el.classList.add("just");
    }
    const t = totals(p.sheet);
    $("totbox").querySelector(".val").textContent = t.total + (t.bonus ? " ⭐" : "");
    $("totbox").querySelector(".nm").textContent = `Toplam${t.up >= BONUS_AT ? " (bonus +35)" : ` · üst ${t.up}/63`}`;
    if (!G.over && !P().cpu && G.rolled && !G.busy) $("hintline").textContent = G.rolls < 3 ? "Tutmak istediğin zarlara dokun, sonra tekrar at ya da kutu seç." : "Puan yazmak için bir kutu seç.";
  }

  function finish(){
    G.over = true;
    const tots = G.players.map(p => totals(p.sheet).total);
    const best = Math.max(...tots);
    const box = $("results"); box.innerHTML = "";
    G.players.forEach((p, i) => {
      const d = document.createElement("div");
      if (tots[i] === best) d.className = "win";
      const t = totals(p.sheet);
      d.innerHTML = `<span></span><b>${tots[i]}${t.bonus ? " ⭐" : ""}</b>`;
      d.querySelector("span").textContent = `${p.av} ${p.name}`;
      box.appendChild(d);
    });
    const wins = G.players.filter((_, i) => tots[i] === best);
    $("end-title").textContent = wins.length > 1 ? "Berabere!" : `${wins[0].name} kazandı!`;
    sBig();
    say(wins.length > 1 ? "Berabere!" : `${wins[0].name} kazandı!`);
    render();
    later(.6, () => { $("end").hidden = false; $("again").focus(); });
  }

  $("roll").addEventListener("click", roll);
  document.addEventListener("keydown", e => {
    if (!G || e.target.closest("input")) return;
    if (e.key === " " || e.key === "Enter"){ e.preventDefault(); roll(); }
    if (e.key >= "1" && e.key <= "5") hold(+e.key - 1);
  });

  /* ---------- kurulum ---------- */
  const form = $("setup-form");
  function buildRows(){
    const n = +form.count.value, box = $("rows");
    const old = [...box.querySelectorAll(".p-row")].map(r => ({
      n: r.querySelector("input[type=text]").value,
      cpu: r.querySelector(".cpu").checked, help: r.querySelector(".help").checked
    }));
    box.innerHTML = "";
    for (let i = 0; i < n; i++){
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
    newGame({players});
  });
  $("open-setup").addEventListener("click", () => { timers = []; if (G) G.over = true; $("end").hidden = true; $("setup").hidden = false; });
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
  buildDice();
  buildRows();
  requestAnimationFrame(frame);
})();
