(() => {
  "use strict";
  const $ = id => document.getElementById(id);

  const SLOTS = [
    {av:"🚀", bg:"#3D8BFD"}, {av:"🎈", bg:"#FF7A2F"}, {av:"🦋", bg:"#9B5DE5"}, {av:"🐢", bg:"#2EB872"}
  ];
  const DEF = [
    {n:"Enes", cpu:false, help:false}, {n:"Egemen", cpu:false, help:true},
    {n:"Anne", cpu:false, help:false}, {n:"Baba", cpu:false, help:false}
  ];
  // 57 resim ve sesli söylenecek adları
  const SYMBOLS = [
    ["🍎","elma"],["🍌","muz"],["🍇","üzüm"],["🍓","çilek"],["🍉","karpuz"],["🥕","havuç"],["🌽","mısır"],["🍄","mantar"],
    ["🌻","ayçiçeği"],["🌳","ağaç"],["🌵","kaktüs"],["🍀","yonca"],["⭐","yıldız"],["🌙","ay"],["☀️","güneş"],["☁️","bulut"],
    ["⚡","şimşek"],["❄️","kar tanesi"],["🔥","ateş"],["💧","damla"],["🌈","gökkuşağı"],["🐶","köpek"],["🐱","kedi"],["🐭","fare"],
    ["🐰","tavşan"],["🦊","tilki"],["🐻","ayı"],["🐼","panda"],["🐸","kurbağa"],["🐵","maymun"],["🐔","tavuk"],["🐧","penguen"],
    ["🐢","kaplumbağa"],["🐟","balık"],["🐙","ahtapot"],["🦋","kelebek"],["🐞","uğur böceği"],["🦁","aslan"],["🐘","fil"],["🦒","zürafa"],
    ["🚗","araba"],["🚀","roket"],["✈️","uçak"],["🚲","bisiklet"],["⛵","yelkenli"],["🚂","tren"],["⚽","top"],["🎈","balon"],
    ["🎁","hediye"],["🔑","anahtar"],["⏰","saat"],["☂️","şemsiye"],["🎸","gitar"],["🥁","davul"],["👑","taç"],["❤️","kalp"],["🍦","dondurma"]
  ];
  const SOLO_SEC = 60;
  const SAVE_KEY = "hizli-goz";
  const BOT_SPEED = [[5.5, 2], [3.6, 1.3], [2.2, .7]];   // ortalama saniye, yayılım
  const HELP_AFTER = 4;

  /* ---------- deste: sonlu projektif düzlem ---------- */
  // n asal: n²+n+1 kart, her kartta n+1 resim, her iki kart tam bir resim paylaşır
  function makeDeck(n){
    const cards = [];
    for (let a = 0; a < n; a++) for (let b = 0; b < n; b++){
      const c = [];
      for (let x = 0; x < n; x++) c.push(x * n + ((a * x + b) % n));
      c.push(n * n + a);
      cards.push(c);
    }
    for (let x = 0; x < n; x++){
      const c = [];
      for (let y = 0; y < n; y++) c.push(x * n + y);
      c.push(n * n + n);
      cards.push(c);
    }
    const last = []; for (let i = 0; i <= n; i++) last.push(n * n + i);
    cards.push(last);
    return cards;
  }
  const shuffle = a => { for (let i = a.length - 1; i > 0; i--){ const j = Math.random() * (i + 1) | 0; [a[i], a[j]] = [a[j], a[i]]; } return a; };
  const common = (a, b) => a.find(s => b.includes(s));

  // karttaki resimlerin yerleşimi (kart çapına oranla): ortada bir, çevrede halka
  function layoutFor(k){
    const ring = k - 1, R = k === 6 ? .3 : .315, base = k === 6 ? .27 : .225;
    const off = Math.random() * Math.PI * 2, out = [{x: 0, y: 0, s: base * (.95 + Math.random() * .12)}];
    for (let i = 0; i < ring; i++){
      const a = off + i / ring * Math.PI * 2;
      out.push({x: Math.cos(a) * R, y: Math.sin(a) * R, s: base * (.82 + Math.random() * .22)});
    }
    return out;
  }

  /* ---------- kayıt ---------- */
  let save = {};
  try { save = JSON.parse(localStorage.getItem(SAVE_KEY)) || {}; } catch (e) {}
  const store = () => { try { localStorage.setItem(SAVE_KEY, JSON.stringify(save)); } catch (e) {} };

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
  const sGot = () => [660, 880, 1175].forEach((f, k) => tone(f, f * 1.03, "triangle", .14, .13, k * .06));
  const sMiss = () => tone(220, 140, "square", .3, .07);
  const sBeep = hi => tone(hi ? 880 : 520, hi ? 880 : 520, "sine", hi ? .3 : .15, .13);
  const sWin = () => [523, 659, 784, 1047, 1319].forEach((f, k) => tone(f, f, "triangle", .22, .13, k * .09));

  const canSpeak = "speechSynthesis" in window;
  let trVoice = null;
  function pickVoice(){ trVoice = speechSynthesis.getVoices().find(v => /^tr(-|_|$)/i.test(v.lang)) || null; }
  if (canSpeak){ pickVoice(); if (speechSynthesis.addEventListener) speechSynthesis.addEventListener("voiceschanged", pickVoice); }
  function say(text){
    if (!canSpeak || !soundOn || !trVoice) return;
    speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text); u.voice = trVoice; u.lang = trVoice.lang; u.rate = 1.02; u.pitch = 1.12;
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
    const n = cfg.sym === 6 ? 5 : 7;
    // her oyunda 57 resimden rastgele bir alt küme ve karışık deste
    const pickSyms = shuffle(SYMBOLS.map((s, i) => i)).slice(0, n * n + n + 1);
    const deck = shuffle(makeDeck(n).map(c => shuffle(c.map(i => pickSyms[i]))));
    const solo = cfg.players.length === 1;
    const players = cfg.players.map(p => ({...p, card: deck.pop(), won: 0, frozen: 0, wait: 0, botAt: 0, lay: null}));
    let pile = deck;
    if (!solo && cfg.len) pile = deck.slice(0, cfg.len);
    G = {cfg, n, syms: pickSyms, solo, players, pile, center: null, cLay: null, t: 0, busy: true, over: false, left: solo ? SOLO_SEC : 0, started: false};
    ["setup", "end"].forEach(id => $(id).hidden = true);
    buildTable();
    // 3-2-1 sayımı
    const cnt = $("count"); cnt.hidden = false; $("center").innerHTML = "";
    [3, 2, 1].forEach((k, i) => later(i * .8, () => { cnt.textContent = k; sBeep(false); }));
    later(2.4, () => { cnt.hidden = true; sBeep(true); G.started = true; nextCenter(); });
    say("Hazır olun!");
    renderAll();
  }

  function nextCenter(){
    if (G.solo){ if (!G.pile.length) G.pile = refill(); G.center = G.pile.pop(); }
    else {
      if (!G.pile.length){ finish(); return; }
      G.center = G.pile.pop();
    }
    G.cLay = layoutFor(G.center.length);
    G.busy = false;
    for (const p of G.players){
      p.wait = 0;
      if (p.cpu){ const [m, s] = BOT_SPEED[G.cfg.bot]; p.botAt = Math.max(1, m + (Math.random() * 2 - 1) * s); }
    }
    drawCard($("center"), G.center, G.cLay, null);
    const c = $("center"); c.classList.remove("flip"); void c.offsetWidth; c.classList.add("flip");
    renderAll();
  }
  // tek kişilik modda deste biterse aynı resimlerle yeniden karıştır; oyuncunun elindeki kart çıkarılır
  function refill(){
    const own = G.players[0].card.slice().sort().join(",");
    return shuffle(makeDeck(G.n).map(c => shuffle(c.map(i => G.syms[i])))).filter(c => c.slice().sort().join(",") !== own);
  }

  function tap(pi, sym, el){
    if (!G || G.over || G.busy || !G.started) return;
    const p = G.players[pi];
    if (p.frozen > 0) return;
    audio();
    if (G.center.includes(sym)){
      take(pi, sym, el);
    } else {
      p.frozen = 1.5; sMiss();
      if (el){ el.classList.add("miss"); later(.5, () => el.classList.remove("miss")); }
      renderZone(pi);
    }
  }

  function take(pi, sym, el){
    const p = G.players[pi];
    G.busy = true;
    p.won++;
    sGot();
    if (el) el.classList.add("hit");
    const cEl = [...$("center").children].find(b => +b.dataset.s === sym);
    if (cEl) cEl.classList.add("hit");
    const name = SYMBOLS[sym][1];
    if (G.solo || G.players.some(q => q.help && !q.cpu)) say(G.solo ? name : `${p.name}: ${name}!`);
    const zone = zoneEls[pi]; zone.classList.add("win");
    later(.75, () => {
      zone.classList.remove("win");
      p.card = G.center; p.lay = G.cLay;          // ortadaki kart oyuncunun yeni kartı olur
      nextCenter();
    });
    renderAll();
  }

  /* ---------- çizim ---------- */
  let zoneEls = [], cardEls = [];
  function drawCard(box, card, lay, pi){
    box.innerHTML = "";
    const D = box.offsetWidth || parseFloat(getComputedStyle(box).width) || 160;   // dönüşümden etkilenmeyen gerçek boy
    card.forEach((sym, i) => {
      const L = lay[i], b = document.createElement(pi === null ? "div" : "button");
      if (pi !== null){ b.type = "button"; b.setAttribute("aria-label", SYMBOLS[sym][1]); }
      b.className = "sym"; b.dataset.s = sym;
      const size = L.s * D;
      b.style.width = b.style.height = size + "px";
      b.style.left = (D / 2 + L.x * D - size / 2) + "px";
      b.style.top = (D / 2 + L.y * D - size / 2) + "px";
      b.style.fontSize = (size * .78) + "px";
      const sp = document.createElement("span"); sp.textContent = SYMBOLS[sym][0];
      sp.style.transform = `rotate(${(L.rot !== undefined ? L.rot : (L.rot = Math.random() * 90 - 45))}deg)`;
      b.appendChild(sp);
      if (pi !== null) b.addEventListener("pointerdown", e => { e.preventDefault(); tap(pi, sym, b); });
      box.appendChild(b);
    });
  }

  function buildTable(){
    const n = G.players.length, top = $("row-top"), bot = $("row-bottom");
    top.innerHTML = ""; bot.innerHTML = ""; zoneEls = []; cardEls = [];
    $("table").classList.toggle("solo", G.solo);
    // alttakiler: 1. ve (3-4 kişide) 3. oyuncu; üsttekiler: 2. ve 4. oyuncu
    const place = n === 1 ? ["b"] : n === 2 ? ["b", "t"] : n === 3 ? ["b", "t", "b"] : ["b", "t", "b", "t"];
    G.players.forEach((p, i) => {
      const z = document.createElement("div"); z.className = "zone";
      z.innerHTML = `<div class="tag"><span class="av" style="background:${p.bg}">${p.av}</span><span class="nm"></span><b>0</b></div><div class="card"></div>`;
      z.querySelector(".nm").textContent = p.name + (p.cpu ? " 🤖" : "");
      (place[i] === "t" ? top : bot).appendChild(z);
      zoneEls.push(z); cardEls.push(z.querySelector(".card"));
    });
    sizeTable();
  }

  function sizeTable(){
    if (!G) return;
    const t = $("table"), W = t.clientWidth, H = t.clientHeight, n = G.players.length;
    const perRow = n >= 3 ? 2 : 1;
    let cs, ccs;
    if (G.solo){
      ccs = Math.min(W * .78, (H - 40) * .44, 330);
      cs = Math.min(W * .78, (H - 40) * .46, 330);
    } else {
      const rowH = (H - 16) / (n === 2 ? 2.9 : 2.75);
      cs = Math.min(rowH - 26, (W - 20) / perRow - 16, 300);
      ccs = Math.min(H - 2 * (cs + 34) - 12, W * .7, cs * 1.2, 300);
      if (ccs < cs * .7){ cs = (H - 90) / 3.05 - 0; ccs = cs; cs = Math.min(cs, (W - 20) / perRow - 16); }
    }
    t.style.setProperty("--cs", Math.floor(cs) + "px");
    t.style.setProperty("--ccs", Math.floor(ccs) + "px");
    // kartları yeni boyda yeniden çiz
    G.players.forEach((p, i) => { if (p.card && p.lay) drawCard(cardEls[i], p.card, p.lay, i); });
    if (G.center && G.cLay) drawCard($("center"), G.center, G.cLay, null);
  }
  window.addEventListener("resize", () => { if (G) sizeTable(); });

  function renderZone(i){
    const p = G.players[i], z = zoneEls[i];
    z.classList.toggle("frozen", p.frozen > 0);
    z.querySelector(".tag b").textContent = p.won;
  }
  function renderAll(){
    G.players.forEach((p, i) => {
      if (!p.lay){ p.lay = layoutFor(p.card.length); }
      if (cardEls[i].dataset.key !== p.card.join(",")){ drawCard(cardEls[i], p.card, p.lay, i); cardEls[i].dataset.key = p.card.join(","); }
      renderZone(i);
    });
    $("pile").textContent = G.solo ? `⏱ ${Math.ceil(G.left)}` : `🂠 ${G.pile.length + (G.center && !G.over ? 1 : 0)}`;
  }

  function finish(){
    if (G.over) return;
    G.over = true; G.busy = true;
    const box = $("results"); box.innerHTML = "";
    let title;
    if (G.solo){
      const p = G.players[0], key = "solo" + G.cfg.sym, prev = save[key] || 0;
      if (p.won > prev){ save[key] = p.won; store(); }
      title = `${SOLO_SEC} saniyede ${p.won} kart!`;
      const d = document.createElement("div");
      d.innerHTML = `<span>🏆 Rekor (${G.cfg.sym} resim)</span><b>${Math.max(prev, p.won)}${p.won > prev && p.won ? " · yeni!" : ""}</b>`;
      box.appendChild(d);
    } else {
      const best = Math.max(...G.players.map(q => q.won));
      [...G.players].sort((a, b) => b.won - a.won).forEach(q => {
        const d = document.createElement("div");
        if (q.won === best) d.className = "win";
        d.innerHTML = `<span></span><b>${q.won} kart</b>`;
        d.querySelector("span").textContent = `${q.av} ${q.name}`;
        box.appendChild(d);
      });
      const wins = G.players.filter(q => q.won === best);
      title = wins.length > 1 ? "Berabere!" : `${wins[0].name} kazandı!`;
    }
    $("end-title").textContent = title;
    sWin(); say(title);
    renderAll();
    later(.8, () => { $("end").hidden = false; $("again").focus(); });
  }

  /* ---------- güncelle ---------- */
  function update(dt){
    for (const tm of timers) tm.t -= dt;
    const due = timers.filter(tm => tm.t <= 0); timers = timers.filter(tm => tm.t > 0); due.forEach(tm => tm.fn());
    if (!G || G.over || !G.started) return;
    if (G.solo){
      G.left -= dt;
      if (G.left <= 0){ G.left = 0; finish(); return; }
    }
    G.players.forEach((p, i) => {
      if (p.frozen > 0){ p.frozen = Math.max(0, p.frozen - dt); if (!p.frozen) renderZone(i); }
      if (G.busy) return;
      p.wait += dt;
      const sym = common(p.card, G.center);
      // yardım: bir süre bulamayana doğru resim parlar
      if (p.help && !p.cpu){
        const btn = cardEls[i].querySelector(`[data-s="${sym}"]`);
        if (btn) btn.classList.toggle("glow", p.wait > HELP_AFTER);
      }
      if (p.cpu && !p.frozen && p.wait >= p.botAt){
        take(i, sym, cardEls[i].querySelector(`[data-s="${sym}"]`));
      }
    });
    if (G.solo) $("pile").textContent = `⏱ ${Math.ceil(G.left)}`;
  }

  /* ---------- kurulum ---------- */
  const form = $("setup-form");
  function buildRows(){
    const n = +form.count.value, box = $("rows");
    const old = [...box.querySelectorAll(".p-row")].map(r => ({n: r.querySelector("input[type=text]").value, cpu: r.querySelector(".cpu").checked, help: r.querySelector(".help").checked}));
    box.innerHTML = "";
    for (let i = 0; i < n; i++){
      const src = old[i] || DEF[i], row = document.createElement("div");
      row.className = "p-row";
      row.innerHTML = `<span class="av" style="background:${SLOTS[i].bg}">${SLOTS[i].av}</span>
        <input type="text" maxlength="12" aria-label="${i + 1}. oyuncunun adı" placeholder="Oyuncu ${i + 1}">
        <label class="toggle" title="Bilgisayar oynasın"${i === 0 ? " hidden" : ""}><input type="checkbox" class="cpu"><span>🤖</span></label>
        <label class="toggle" title="Yardım"><input type="checkbox" class="help"><span>✨</span></label>`;
      row.querySelector("input[type=text]").value = src.n;
      row.querySelector(".cpu").checked = i > 0 && src.cpu;
      row.querySelector(".help").checked = src.help;
      box.appendChild(row);
    }
    const solo = n === 1;
    $("solo-note").hidden = !solo; $("seat-note").hidden = solo;
    $("len-seg").hidden = solo; $("bot-seg").hidden = solo;
  }
  form.addEventListener("change", e => { if (e.target.name === "count") buildRows(); });
  form.addEventListener("submit", e => {
    e.preventDefault();
    audio();
    const rows = [...$("rows").querySelectorAll(".p-row")];
    const players = rows.map((r, i) => ({
      name: r.querySelector("input[type=text]").value.trim() || `Oyuncu ${i + 1}`,
      av: SLOTS[i].av, bg: SLOTS[i].bg,
      cpu: i > 0 && r.querySelector(".cpu").checked,
      help: r.querySelector(".help").checked
    }));
    newGame({players, sym: +form.sym.value, len: +form.len.value, bot: +form.bot.value});
  });
  $("open-setup").addEventListener("click", () => { timers = []; if (G){ G.over = true; } $("end").hidden = true; $("setup").hidden = false; });
  $("end-setup").addEventListener("click", () => { $("end").hidden = true; $("setup").hidden = false; });
  $("again").addEventListener("click", () => { audio(); newGame(G.cfg); });

  /* ---------- döngü ---------- */
  let last = performance.now();
  function frame(now){
    const dt = Math.min(.05, (now - last) / 1000); last = now;
    update(dt);
    requestAnimationFrame(frame);
  }
  document.addEventListener("visibilitychange", () => { last = performance.now(); if (document.hidden && canSpeak) speechSynthesis.cancel(); });
  if ("ResizeObserver" in window) new ResizeObserver(() => { if (G) sizeTable(); }).observe($("table"));
  buildRows();
  requestAnimationFrame(frame);

  // testler için
  window.__goz = {makeDeck, common, SYMBOLS, layoutFor, state: () => G, newGame, update, tap};
})();
