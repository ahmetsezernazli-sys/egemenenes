/* Minik Market — Egemen için sayma ve para oyunu */
(function(){
  "use strict";

  const SAVE = "minik-market", SOUND_KEY = "minik-market-ses", PER_LEVEL = 5;
  const RAINBOW = ["#E4483B", "#C98F00", "#2A64C0", "#1E8A41", "#6E36B8"];
  const NUM = ["sıfır", "bir", "iki", "üç", "dört", "beş", "altı", "yedi", "sekiz", "dokuz", "on"];
  // ürünler: resim, ad, fiyat (bozuk para)
  const GOODS = [
    {e:"🍎", ad:"elma", p:1}, {e:"🍌", ad:"muz", p:1}, {e:"🍇", ad:"üzüm", p:2}, {e:"🍓", ad:"çilek", p:1},
    {e:"🥕", ad:"havuç", p:1}, {e:"🍅", ad:"domates", p:1}, {e:"🥚", ad:"yumurta", p:1}, {e:"🍞", ad:"ekmek", p:2},
    {e:"🥛", ad:"süt", p:2}, {e:"🧀", ad:"peynir", p:2}, {e:"🍉", ad:"karpuz", p:2}, {e:"🍐", ad:"armut", p:1},
    {e:"🍋", ad:"limon", p:1}, {e:"🍪", ad:"kurabiye", p:1}, {e:"🌽", ad:"mısır", p:1}, {e:"🍊", ad:"portakal", p:1}
  ];
  const ANIMALS = ["🐻", "🐰", "🐶", "🐱", "🐼", "🦊", "🐸", "🐵", "🐯", "🐷", "🐮", "🐨"];
  // bölümler: raf sayısı, ürün çeşidi, en çok adet, ödeme, en çok toplam
  const LEVELS = [
    {shelf:4, kinds:[1, 1], max:2, pay:false},
    {shelf:8, kinds:[1, 2], max:3, pay:false},
    {shelf:8, kinds:[2, 2], max:3, pay:false},
    {shelf:8, kinds:[1, 2], max:3, pay:true, total:5},
    {shelf:8, kinds:[2, 3], max:3, pay:true, total:8},
    {shelf:8, kinds:[2, 3], max:4, pay:true, total:10}
  ];

  const $ = id => document.getElementById(id);
  const rnd = n => Math.floor(Math.random()*n);
  const shuffle = a => { for (let i = a.length - 1; i > 0; i--){ const j = rnd(i + 1); [a[i], a[j]] = [a[j], a[i]]; } return a; };

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
  function tone(freq, dur, type, vol, slide, delay){
    const a = audio(); if (!a || !soundOn) return;
    const n = a.currentTime + (delay || 0), o = a.createOscillator(), g = a.createGain();
    o.type = type || "sine"; o.frequency.setValueAtTime(freq, n);
    if (slide) o.frequency.exponentialRampToValueAtTime(slide, n + dur);
    g.gain.setValueAtTime(.0001, n); g.gain.exponentialRampToValueAtTime(vol || .1, n + .015); g.gain.exponentialRampToValueAtTime(.0001, n + dur);
    o.connect(g).connect(a.destination); o.start(n); o.stop(n + dur + .05);
  }
  const sfx = {
    put(){ tone(520, .1, "triangle", .1, 880); },
    no(){ tone(260, .18, "sine", .12, 180); },
    done(){ [659.25, 783.99, 1046.5].forEach((f, i) => tone(f, .18, "triangle", .12, null, i*.09)); },
    coin(){ tone(1568, .08, "square", .04); tone(2093, .12, "square", .035, null, .07); },
    till(){ tone(1318, .1, "triangle", .1); tone(1760, .25, "triangle", .1, null, .1); },
    party(){ [523.25, 659.25, 783.99, 1046.5, 1318.5].forEach((f, i) => tone(f, .3, "triangle", .14, null, i*.12)); }
  };
  const canSpeak = "speechSynthesis" in window;
  let trVoice = null;
  function pickVoice(){ trVoice = speechSynthesis.getVoices().find(v => /^tr(-|_|$)/i.test(v.lang)) || null; }
  if (canSpeak){ pickVoice(); if (speechSynthesis.addEventListener) speechSynthesis.addEventListener("voiceschanged", pickVoice); }
  function say(text, queue){
    if (!canSpeak || !soundOn || !trVoice || fast) return;
    if (!queue) speechSynthesis.cancel();
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

  /* ---------- oyun ---------- */
  let level = 0, L = LEVELS[0], served = 0, mistakes = 0, order = null, shelf = [], busy = false, fast = false;
  let timers = [], idleT = null, payTries = 0, lastAnimal = "";
  const later = (ms, fn) => { if (fast) fn(); else timers.push(setTimeout(fn, ms)); };
  function clearTimers(){ timers.forEach(clearTimeout); timers = []; clearTimeout(idleT); }

  function startLevel(i){
    clearTimers();
    level = Math.max(0, Math.min(LEVELS.length - 1, i)); L = LEVELS[level];
    served = 0; mistakes = 0;
    $("intro").hidden = true; $("done").hidden = true; $("party").hidden = true;
    renderProgress();
    nextCustomer();
  }
  function makeOrder(){
    const kinds = L.kinds[0] + rnd(L.kinds[1] - L.kinds[0] + 1);
    for (let tries = 0; tries < 200; tries++){
      const goods = shuffle(GOODS.slice()).slice(0, kinds);
      const lines = goods.map(g => ({g, n:1 + rnd(L.max), got:0}));
      const total = lines.reduce((s, l) => s + l.n*l.g.p, 0);
      if (L.pay && total > L.total) continue;
      return {lines, total};
    }
    return {lines:[{g:GOODS[0], n:1, got:0}], total:1};
  }
  function nextCustomer(){
    order = makeOrder(); payTries = 0; busy = true;
    // raf: istenen ürünler + rastgele diğerleri
    const others = shuffle(GOODS.filter(g => !order.lines.some(l => l.g === g)));
    shelf = shuffle(order.lines.map(l => l.g).concat(others.slice(0, L.shelf - order.lines.length)));
    renderShelves(); $("basket").textContent = "";
    let a; do { a = ANIMALS[rnd(ANIMALS.length)]; } while (a === lastAnimal);
    lastAnimal = a;
    const an = $("animal"); an.textContent = a; an.classList.add("away");
    $("bubble").style.visibility = "hidden";
    later(fast ? 0 : 150, () => { an.classList.remove("away"); });
    later(700, () => {
      renderBubble(); $("bubble").style.visibility = "visible"; busy = false;
      say("Merhaba! " + orderText() + " istiyorum.");
      armIdle();
    });
  }
  const orderText = () => order.lines.map(l => `${NUM[l.n]} ${l.g.ad}`).join(order.lines.length > 2 ? ", " : " ve ").replace(/, ([^,]*)$/, " ve $1");

  function renderShelves(){
    const box = $("shelves"); box.textContent = "";
    box.style.gridTemplateColumns = `repeat(${Math.min(4, shelf.length)},minmax(0,1fr))`;
    shelf.forEach(g => {
      const b = document.createElement("button");
      b.type = "button"; b.className = "item"; b.textContent = g.e;
      b.setAttribute("aria-label", g.ad);
      if (L.pay){ const t = document.createElement("span"); t.className = "tag"; t.setAttribute("aria-hidden", "true"); t.innerHTML = '<i class="coin"></i>'.repeat(g.p); b.appendChild(t); }
      b.addEventListener("click", () => { audio(); pick(g, b); });
      box.appendChild(b);
    });
  }
  function renderBubble(){
    const bb = $("bubble"); bb.textContent = "";
    for (const l of order.lines){
      const row = document.createElement("div"); row.className = "need" + (l.got >= l.n ? " ok" : "");
      row.innerHTML = `<span class="e" aria-hidden="true">${l.g.e}</span><span>${l.n}</span><span class="dots" aria-hidden="true">${Array.from({length:l.n}, (_, i) => `<i class="${i < l.got ? "on" : ""}"></i>`).join("")}</span>`;
      row.setAttribute("aria-label", `${l.n} ${l.g.ad}, ${l.got} kondu`);
      bb.appendChild(row);
    }
  }
  function renderProgress(){
    const p = $("progress"); p.textContent = "";
    for (let i = 0; i < PER_LEVEL; i++){ const d = document.createElement("i"); if (i < served) d.className = "on"; p.appendChild(d); }
  }
  function armIdle(){
    clearTimeout(idleT);
    if (fast) return;
    idleT = setTimeout(() => {
      if (busy || !order) return;
      const need = order.lines.find(l => l.got < l.n);
      if (!need) return;
      const idx = shelf.indexOf(need.g), btn = $("shelves").children[idx];
      if (btn){ btn.classList.add("hint"); say(`${need.g.ad} nerede? Parlayana dokun.`); }
    }, 7000);
  }
  function flyTo(btn, emoji){
    if (fast || !btn) return;
    const a = btn.getBoundingClientRect(), b = $("basket").getBoundingClientRect();
    const f = document.createElement("span"); f.className = "fly"; f.textContent = emoji;
    f.style.left = (a.left + a.width/2 - 24) + "px"; f.style.top = (a.top + a.height/2 - 24) + "px";
    document.body.appendChild(f);
    requestAnimationFrame(() => {
      f.style.transform = `translate(${b.left + b.width/2 - a.left - a.width/2}px, ${b.top + b.height/2 - a.top - a.height/2}px) scale(.7)`;
    });
    setTimeout(() => f.remove(), 600);
  }
  function pick(g, btn){
    if (busy || !order || !$("pay").hidden) return false;
    document.querySelectorAll(".item.hint").forEach(b => b.classList.remove("hint"));
    armIdle();
    const line = order.lines.find(l => l.g === g);
    if (!line){
      mistakes++; sfx.no(); if (btn){ btn.classList.remove("no"); void btn.offsetWidth; btn.classList.add("no"); }
      say(`${g.ad} listede yok.`);
      return false;
    }
    if (line.got >= line.n){
      mistakes++; sfx.no(); if (btn){ btn.classList.remove("no"); void btn.offsetWidth; btn.classList.add("no"); }
      say(`Yeterince ${g.ad} var. ${NUM[line.n]} tane istedi.`);
      return false;
    }
    line.got++; sfx.put(); flyTo(btn, g.e);
    later(450, () => { const s = document.createElement("span"); s.textContent = g.e; $("basket").appendChild(s); });
    renderBubble();
    say(NUM[line.got]);
    if (order.lines.every(l => l.got >= l.n)){
      busy = true; clearTimeout(idleT);
      later(700, () => { sfx.done(); if (L.pay) startPay(); else thanks(); });
    }
    return true;
  }
  function startPay(){
    const total = order.total;
    const coins = $("coins"); coins.textContent = "";
    for (let i = 0; i < total; i++){ const c = document.createElement("span"); c.className = "coin"; c.textContent = "1"; coins.appendChild(c); }
    const opts = new Set([total]);
    while (opts.size < 3){ const v = total + (rnd(2) ? 1 : -1)*(1 + rnd(2)); if (v >= 1 && v <= 12) opts.add(v); }
    const ob = $("opts"); ob.textContent = "";
    [...opts].sort((a, b) => a - b).forEach(v => {
      const b = document.createElement("button"); b.type = "button"; b.textContent = v; b.setAttribute("aria-label", v + " lira");
      b.addEventListener("click", () => { audio(); answerPay(v, b); });
      ob.appendChild(b);
    });
    $("pay").hidden = false; busy = false;
    sfx.coin();
    say("Buyurun paranız! Kaç lira verdim? Paraları say.");
  }
  function answerPay(v, btn){
    if ($("pay").hidden) return false;
    if (v === order.total){
      sfx.till(); $("pay").hidden = true; busy = true;
      say(`Evet, ${NUM[v]} lira!`);
      later(400, thanks);
      return true;
    }
    mistakes++; payTries++; sfx.no();
    if (btn){ btn.classList.remove("no"); void btn.offsetWidth; btn.classList.add("no"); }
    if (payTries >= 2) countAloud(); else say("Bir daha say bakalım.");
    return false;
  }
  function countAloud(){
    const cs = [...$("coins").children];
    say("Birlikte sayalım.");
    cs.forEach((c, i) => later(900 + i*700, () => { c.style.transform = "scale(1.25)"; sfx.coin(); say(NUM[i + 1], true); later(350, () => { c.style.transform = ""; }); }));
  }
  function thanks(){
    served++; renderProgress();
    say(pick1(["Teşekkürler!", "Çok teşekkür ederim!", "Harika, sağ ol!", "Afiyet olsun bana!"]));
    $("animal").classList.add("away");
    $("bubble").style.visibility = "hidden";
    if (served >= PER_LEVEL) later(900, finishLevel);
    else later(1100, nextCustomer);
  }
  const pick1 = a => a[rnd(a.length)];
  function starsNow(){ return mistakes <= 1 ? 3 : mistakes <= 4 ? 2 : 1; }
  function finishLevel(){
    const s = starsNow();
    best[level] = Math.max(best[level] || 0, s); persist(); renderLevels();
    if (level === LEVELS.length - 1){
      $("party").hidden = false; sfx.party(); say("Aferin Egemen! Marketin en iyi satıcısı sensin!");
      return;
    }
    [...$("stars").children].forEach((el, i) => { el.className = ""; void el.offsetWidth; if (i < s) el.className = "on"; });
    $("stars").setAttribute("aria-label", s + " yıldız");
    $("done").hidden = false; sfx.party(); say("Aferin! Bütün müşteriler mutlu.");
  }

  /* ---------- menüler ---------- */
  function renderLevels(){
    const box = $("levels"); box.textContent = "";
    LEVELS.forEach((lv, i) => {
      const b = document.createElement("button");
      b.type = "button"; b.className = "lvl";
      b.setAttribute("aria-label", `Bölüm ${i + 1}${lv.pay ? ", para sayma" : ""}${best[i] ? ", " + best[i] + " yıldız" : ""}`);
      b.innerHTML = `<span class="ic" aria-hidden="true">${lv.pay ? "🪙" : "🧺"}</span>${i + 1}<small aria-hidden="true">${"★".repeat(best[i] || 0)}</small>`;
      b.addEventListener("click", () => { audio(); startLevel(i); });
      box.appendChild(b);
    });
  }
  function showIntro(){
    clearTimers(); if (canSpeak) speechSynthesis.cancel();
    $("pay").hidden = true;
    $("intro").hidden = false; $("done").hidden = true; $("party").hidden = true;
  }
  $("play").addEventListener("click", () => { audio(); const i = LEVELS.findIndex((_, k) => !best[k]); startLevel(i < 0 ? 0 : i); });
  $("next").addEventListener("click", () => { audio(); startLevel(level + 1); });
  $("replay").addEventListener("click", () => { audio(); startLevel(level); });
  $("again").addEventListener("click", () => { audio(); showIntro(); });
  $("menu").addEventListener("click", () => { audio(); showIntro(); });
  document.addEventListener("visibilitychange", () => { if (document.hidden && canSpeak) speechSynthesis.cancel(); });

  renderLevels(); renderProgress();

  // test kancası
  window.__mm = { GOODS, LEVELS, startLevel, pick, answerPay, setFast: f => { fast = f; },
    get st(){ return {level, served, mistakes, busy, pay:!$("pay").hidden, order:order && order.lines.map(l => [l.g.ad, l.n, l.got]), total:order && order.total, shelf:shelf.map(g => g.ad)}; } };
})();
