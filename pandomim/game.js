/* Pandomim — aile parti oyunu: kelimeyi hareketle anlat */
(() => {
  "use strict";
  const $ = (id) => document.getElementById(id);
  const SAVE_KEY = "pandomim", MAX_PASS = 3;
  // kartlar: [resim, kelime, kategori]
  const CARDS = [
    ["🐶", "Köpek", "Hayvan"], ["🐱", "Kedi", "Hayvan"], ["🐸", "Kurbağa", "Hayvan"], ["🐍", "Yılan", "Hayvan"], ["🐘", "Fil", "Hayvan"],
    ["🐒", "Maymun", "Hayvan"], ["🐧", "Penguen", "Hayvan"], ["🐔", "Tavuk", "Hayvan"], ["🐰", "Tavşan", "Hayvan"], ["🦁", "Aslan", "Hayvan"],
    ["🐟", "Balık", "Hayvan"], ["🦋", "Kelebek", "Hayvan"], ["🐢", "Kaplumbağa", "Hayvan"], ["🦆", "Ördek", "Hayvan"], ["🐄", "İnek", "Hayvan"],
    ["🦀", "Yengeç", "Hayvan"], ["🐝", "Arı", "Hayvan"], ["🦒", "Zürafa", "Hayvan"], ["🐻", "Ayı", "Hayvan"], ["🦅", "Kartal", "Hayvan"],
    ["🏊", "Yüzmek", "Hareket"], ["😴", "Uyumak", "Hareket"], ["🦷", "Diş fırçalamak", "Hareket"], ["🍝", "Makarna yemek", "Hareket"], ["💃", "Dans etmek", "Hareket"],
    ["🚴", "Bisiklet sürmek", "Hareket"], ["🧗", "Tırmanmak", "Hareket"], ["🎣", "Balık tutmak", "Hareket"], ["😭", "Ağlamak", "Hareket"], ["🤧", "Hapşırmak", "Hareket"],
    ["🧹", "Süpürmek", "Hareket"], ["🎤", "Şarkı söylemek", "Hareket"], ["🤾", "Top atmak", "Hareket"], ["🛁", "Banyo yapmak", "Hareket"], ["👕", "Giyinmek", "Hareket"],
    ["📞", "Telefonla konuşmak", "Hareket"], ["🍦", "Dondurma yalamak", "Hareket"], ["🎈", "Balon şişirmek", "Hareket"], ["⛸️", "Paten kaymak", "Hareket"], ["🥱", "Esnemek", "Hareket"],
    ["👨‍🍳", "Aşçı", "Meslek"], ["👮", "Polis", "Meslek"], ["👨‍🚒", "İtfaiyeci", "Meslek"], ["👩‍⚕️", "Doktor", "Meslek"], ["👨‍🏫", "Öğretmen", "Meslek"],
    ["👨‍🚀", "Astronot", "Meslek"], ["💇", "Berber", "Meslek"], ["👨‍🌾", "Çiftçi", "Meslek"], ["🧙", "Sihirbaz", "Meslek"], ["🤡", "Palyaço", "Meslek"],
    ["👨‍✈️", "Pilot", "Meslek"], ["🦸", "Süper kahraman", "Meslek"], ["🎨", "Ressam", "Meslek"], ["⚽", "Futbolcu", "Meslek"], ["🎻", "Kemancı", "Meslek"],
    ["✈️", "Uçak", "Eşya"], ["🚗", "Araba", "Eşya"], ["☂️", "Şemsiye", "Eşya"], ["🔨", "Çekiç", "Eşya"], ["✂️", "Makas", "Eşya"],
    ["🧦", "Çorap", "Eşya"], ["🎸", "Gitar", "Eşya"], ["📷", "Fotoğraf makinesi", "Eşya"], ["🧸", "Oyuncak ayı", "Eşya"], ["⏰", "Çalar saat", "Eşya"],
    ["🚲", "Bisiklet", "Eşya"], ["🎒", "Okul çantası", "Eşya"], ["🪁", "Uçurtma", "Eşya"], ["🔑", "Anahtar", "Eşya"], ["🛏️", "Yatak", "Eşya"],
    ["🍕", "Pizza", "Yiyecek"], ["🍌", "Muz", "Yiyecek"], ["🍉", "Karpuz", "Yiyecek"], ["🌽", "Mısır", "Yiyecek"], ["🍿", "Patlamış mısır", "Yiyecek"],
    ["🍋", "Limon", "Yiyecek"], ["🥚", "Yumurta", "Yiyecek"], ["🍔", "Hamburger", "Yiyecek"], ["🍰", "Pasta", "Yiyecek"], ["🧁", "Kek", "Yiyecek"],
    ["⛄", "Kardan adam", "Doğa"], ["🌧️", "Yağmur", "Doğa"], ["🌋", "Yanardağ", "Doğa"], ["🌊", "Dalga", "Doğa"], ["⚡", "Şimşek", "Doğa"],
    ["🌻", "Ayçiçeği", "Doğa"], ["🌙", "Ay", "Doğa"], ["🌈", "Gökkuşağı", "Doğa"], ["🌪️", "Kasırga", "Doğa"], ["🌳", "Ağaç", "Doğa"],
    ["🏀", "Basketbol", "Spor"], ["🏓", "Masa tenisi", "Spor"], ["🥊", "Boks", "Spor"], ["⛷️", "Kayak", "Spor"], ["🏹", "Okçuluk", "Spor"],
    ["🧘", "Yoga", "Spor"], ["🤸", "Takla atmak", "Spor"], ["🏋️", "Ağırlık kaldırmak", "Spor"], ["🎳", "Bowling", "Spor"], ["🏄", "Sörf", "Spor"]
  ];

  /* ---------- ses ---------- */
  let AC = null;
  function audio() { try { AC = AC || new (window.AudioContext || window.webkitAudioContext)(); if (AC.state === "suspended") AC.resume(); } catch (e) {} }
  function snd(f, d, type, vol, delay) {
    if (!AC) return;
    const t = AC.currentTime + (delay || 0), o = AC.createOscillator(), g = AC.createGain();
    o.type = type || "triangle"; o.frequency.setValueAtTime(f, t);
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol || 0.07, t + 0.01); g.gain.exponentialRampToValueAtTime(0.0001, t + d);
    o.connect(g).connect(AC.destination); o.start(t); o.stop(t + d + 0.02);
  }
  const SND = { ok: () => { snd(784, 0.1); snd(1046, 0.15, "triangle", 0.07, 0.08); }, pass: () => snd(330, 0.15, "sine", 0.06), tick: () => snd(1200, 0.04, "square", 0.03), end: () => { snd(220, 0.5, "sawtooth", 0.08); snd(165, 0.6, "sawtooth", 0.06, 0.1); }, win: () => [523, 659, 784, 1046, 1318].forEach((f, i) => snd(f, 0.25, "triangle", 0.08, i * 0.12)) };

  /* ---------- durum ---------- */
  let CFG = { names: ["Mor takım", "Turuncu takım"], how: "act", time: 60, rounds: 3 };
  try { const s = JSON.parse(localStorage.getItem(SAVE_KEY) || "null"); if (s) CFG = Object.assign(CFG, s); } catch (e) {}
  let G = null, tick = null;
  const shuffle = (a) => { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };

  function newGame() {
    clearInterval(tick);
    G = { score: [0, 0], team: 0, turn: 0, deck: shuffle(CARDS.slice()), di: 0, got: [], passed: [], left: 0, passes: 0, card: null };
    $("setup").hidden = true; $("over").hidden = true;
    hud(); handOver();
  }
  function nextCard() {
    if (G.di >= G.deck.length) { G.deck = shuffle(CARDS.slice()); G.di = 0; }
    G.card = G.deck[G.di++];
  }
  function hud() {
    $("na").textContent = CFG.names[0]; $("nb").textContent = CFG.names[1];
    $("sa").textContent = G ? G.score[0] : 0; $("sb").textContent = G ? G.score[1] : 0;
    $("ta").classList.toggle("cur", !!G && G.team === 0); $("tb").classList.toggle("cur", !!G && G.team === 1);
  }
  const roundNo = () => Math.floor(G.turn / 2) + 1;
  function handOver() {
    const tn = CFG.names[G.team];
    $("panel").innerHTML = `<div class="cover-msg" aria-hidden="true">🙈</div><h2>Sıra: ${esc(tn)}</h2>
      <p>${roundNo()}. tur · Anlatıcı telefonu alsın, ekranı takımına <b>göstermesin</b>. ${CFG.how === "act" ? '<span class="mode-tag">Konuşmak yok!</span>' : '<span class="mode-tag">Kelimeyi söylemek yok!</span>'}</p>
      <button class="btn primary big" id="ready" type="button">Hazırım, başlat!</button>`;
    $("ready").addEventListener("click", () => { audio(); startTurn(); });
    hud();
  }
  function startTurn() {
    G.got = []; G.passed = []; G.passes = 0; G.left = CFG.time; G.endAt = performance.now() + CFG.time * 1000;
    nextCard(); showCard();
    clearInterval(tick);
    tick = setInterval(() => {
      const left = Math.max(0, (G.endAt - performance.now()) / 1000);
      const sec = Math.ceil(left);
      if (sec !== G.left) { G.left = sec; if (sec <= 5 && sec > 0) SND.tick(); }
      const bar = document.querySelector(".bar-t"), s = document.querySelector(".secs");
      if (bar) { bar.firstChild.style.width = (100 * left / CFG.time) + "%"; bar.classList.toggle("low", left < 10); }
      if (s) s.textContent = sec;
      if (left <= 0) endTurn();
    }, 200);
  }
  function showCard() {
    const [e, w, c] = G.card;
    $("panel").innerHTML = `<div class="bar-t"><i></i></div><span class="secs">${G.left}</span>
      <span class="cat">${c}</span><div class="big-e" aria-hidden="true">${e}</div><p class="word">${w}</p>
      <div class="acts"><button class="btn pass" id="pass" type="button">⏭ Pas (${MAX_PASS - G.passes})</button><button class="btn ok" id="ok" type="button">✔ Bildi!</button></div>`;
    $("ok").addEventListener("click", () => { audio(); hit(true); });
    $("pass").addEventListener("click", () => { audio(); hit(false); });
    $("pass").disabled = G.passes >= MAX_PASS;
    const bar = document.querySelector(".bar-t"); bar.firstChild.style.width = (100 * Math.max(0, (G.endAt - performance.now()) / 1000) / CFG.time) + "%";
  }
  function hit(ok) {
    if (!G.card) return;
    if (ok) { G.score[G.team]++; G.got.push(G.card); SND.ok(); }
    else { if (G.passes >= MAX_PASS) return; G.passes++; G.passed.push(G.card); SND.pass(); }
    hud(); nextCard(); showCard();
  }
  function endTurn() {
    clearInterval(tick); SND.end();
    const n = G.got.length;
    $("panel").innerHTML = `<h2>Süre bitti! ⏰</h2><p>${esc(CFG.names[G.team])} bu turda <b>${n}</b> kelime bildi.</p>
      <div class="list">${G.got.map(c => `<span class="y">${c[0]} ${c[1]}</span>`).join("")}${G.passed.map(c => `<span class="n">${c[0]} ${c[1]}</span>`).join("")}</div>
      <p class="help">Son kart: ${G.card[0]} ${G.card[1]}. Bilindiyse ekleyebilirsiniz.</p>
      <div class="acts"><button class="btn" id="last" type="button">＋ Son kart bilindi</button><button class="btn primary" id="cont" type="button">Devam ▶</button></div>`;
    $("last").addEventListener("click", (e) => { G.score[G.team]++; hud(); e.currentTarget.disabled = true; e.currentTarget.textContent = "✔ Eklendi"; SND.ok(); });
    $("cont").addEventListener("click", () => { audio(); nextTeam(); });
    G.card = null; hud();
  }
  function nextTeam() {
    G.turn++;
    if (G.turn >= CFG.rounds * 2) return finish();
    G.team = G.turn % 2; handOver();
  }
  function finish() {
    const [a, b] = G.score;
    $("over-title").textContent = a === b ? "Berabere! 🤝" : `${CFG.names[a > b ? 0 : 1]} kazandı!`;
    $("res").innerHTML = [0, 1].sort((x, y) => G.score[y] - G.score[x]).map(i => `<div class="${G.score[i] === Math.max(a, b) ? "win" : ""}"><span>${esc(CFG.names[i])}</span><b>${G.score[i]} kelime</b></div>`).join("");
    SND.win(); $("over").hidden = false;
  }
  const esc = (s) => s.replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

  /* ---------- ayarlar ---------- */
  const form = $("form");
  function syncHow() { $("how-help").innerHTML = form.how.value === "act" ? "<b>Sadece hareket:</b> konuşmak, ses çıkarmak ve parmakla harf yazmak yok!" : "<b>Konuşarak:</b> kelimeyi ve parçalarını söylemeden anlat (büyükler için)."; }
  form.how.value = CFG.how; form.time.value = String(CFG.time); form.rounds.value = String(CFG.rounds); $("in-a").value = CFG.names[0]; $("in-b").value = CFG.names[1]; syncHow();
  form.addEventListener("change", (e) => { if (e.target.name === "how") syncHow(); });
  form.addEventListener("submit", (e) => {
    e.preventDefault(); audio();
    CFG = { names: [$("in-a").value.trim() || "Mor takım", $("in-b").value.trim() || "Turuncu takım"], how: form.how.value, time: +form.time.value, rounds: +form.rounds.value };
    try { localStorage.setItem(SAVE_KEY, JSON.stringify(CFG)); } catch (_) {}
    newGame();
  });
  $("settings").addEventListener("click", () => { clearInterval(tick); $("over").hidden = true; $("setup").hidden = false; });
  $("again").addEventListener("click", () => { audio(); newGame(); });
  $("to-setup").addEventListener("click", () => { $("over").hidden = true; $("setup").hidden = false; });
  hud();
  $("panel").innerHTML = `<div class="big-e" aria-hidden="true">🎭</div><h2>Hazır mısınız?</h2><p>İki takım olun, ayarlardan başlayın.</p>`;

  // test kancası
  window.__pm = { CARDS, newGame, hit, endTurn, nextTeam, startTurn, get G() { return G; } };
})();
