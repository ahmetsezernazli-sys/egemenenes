/* Gözüm Bir Şey Görüyor — aile bulma oyunu: ipucuna uyan resmi bul */
(() => {
  "use strict";
  const $ = (id) => document.getElementById(id);
  const SAVE_KEY = "gozum-goruyor", TIME = 15, N = 30;
  const TOKENS = ["🦊", "🐼", "🐸", "🦁", "🐧", "🐙"];
  const DEF = [{ n: "Enes", cpu: false, help: false }, { n: "Egemen", cpu: false, help: true }, { n: "Anne", cpu: false, help: false }, { n: "Baba", cpu: false, help: false }, { n: "", cpu: true, help: false }, { n: "", cpu: true, help: false }];
  // nesneler: resim, ad, renk, tür, bilmece etiketleri
  const OBJ = [
    ["🐶", "köpek", "kahverengi", "hayvan", ["havlar"]], ["🐱", "kedi", "sarı", "hayvan", ["miyavlar"]], ["🐟", "balık", "mavi", "hayvan", ["yüzer"]],
    ["🐦", "kuş", "mavi", "hayvan", ["uçar"]], ["🦋", "kelebek", "mavi", "hayvan", ["uçar"]], ["🐸", "kurbağa", "yeşil", "hayvan", ["zıplar"]],
    ["🐢", "kaplumbağa", "yeşil", "hayvan", ["yavaş"]], ["🐘", "fil", "gri", "hayvan", ["hortumlu"]], ["🦁", "aslan", "sarı", "hayvan", ["kükrer"]],
    ["🐞", "uğur böceği", "kırmızı", "hayvan", ["uçar"]], ["🐝", "arı", "sarı", "hayvan", ["uçar", "bal"]], ["🐄", "inek", "beyaz", "hayvan", ["süt"]],
    ["🍎", "elma", "kırmızı", "meyve", ["yenir"]], ["🍌", "muz", "sarı", "meyve", ["yenir", "soyulur"]], ["🍇", "üzüm", "mor", "meyve", ["yenir"]],
    ["🍓", "çilek", "kırmızı", "meyve", ["yenir"]], ["🍊", "portakal", "turuncu", "meyve", ["yenir", "soyulur"]], ["🍉", "karpuz", "yeşil", "meyve", ["yenir"]],
    ["🥕", "havuç", "turuncu", "sebze", ["yenir"]], ["🌽", "mısır", "sarı", "sebze", ["yenir"]], ["🍆", "patlıcan", "mor", "sebze", ["yenir"]],
    ["🚗", "araba", "kırmızı", "araç", ["tekerlekli"]], ["🚌", "otobüs", "sarı", "araç", ["tekerlekli"]], ["🚲", "bisiklet", "yeşil", "araç", ["tekerlekli", "pedallı"]],
    ["✈️", "uçak", "beyaz", "araç", ["uçar"]], ["🚀", "roket", "beyaz", "araç", ["uçar", "uzay"]], ["⛵", "yelkenli", "beyaz", "araç", ["yüzer"]],
    ["🚂", "tren", "kırmızı", "araç", ["raylı"]], ["⚽", "top", "beyaz", "eşya", ["oyun"]], ["🎈", "balon", "kırmızı", "eşya", ["uçar", "oyun"]],
    ["🔑", "anahtar", "sarı", "eşya", ["kapı"]], ["☂️", "şemsiye", "mor", "eşya", ["yağmur"]], ["🎸", "gitar", "turuncu", "eşya", ["müzik"]],
    ["🥁", "davul", "kırmızı", "eşya", ["müzik"]], ["⏰", "saat", "kırmızı", "eşya", ["zaman"]], ["📚", "kitap", "mavi", "eşya", ["okunur"]],
    ["🌻", "ayçiçeği", "sarı", "bitki", ["çiçek"]], ["🌵", "kaktüs", "yeşil", "bitki", ["dikenli"]], ["🌳", "ağaç", "yeşil", "bitki", ["yaprak"]],
    ["⭐", "yıldız", "sarı", "gök", ["gece"]], ["🌙", "ay", "sarı", "gök", ["gece"]], ["☀️", "güneş", "sarı", "gök", ["sıcak"]]
  ];
  const CAT = { hayvan: "bir hayvan", meyve: "bir meyve", sebze: "bir sebze", "araç": "bir taşıt", "eşya": "bir eşya", bitki: "bir bitki", "gök": "gök cismi" };
  const RIDDLE = {
    havlar: "Havlayan bir hayvan", miyavlar: "Miyavlayan bir hayvan", "yüzer": "Suda yüzen bir şey", "uçar": "Uçabilen bir şey", "zıplar": "Zıplayan yeşil bir hayvan",
    yavaş: "Sırtında evi olan yavaş bir hayvan", hortumlu: "Hortumu olan bir hayvan", "kükrer": "Kükreyen bir hayvan", bal: "Bal yapan bir hayvan", "süt": "Bize süt veren bir hayvan",
    soyulur: "Kabuğu soyularak yenen bir meyve", tekerlekli: "Tekerlekli bir taşıt", pedallı: "Pedal çevirerek giden bir şey", uzay: "Uzaya giden bir şey", raylı: "Raylarda giden bir taşıt",
    oyun: "Oyunda kullanılan bir şey", "kapı": "Kapıyı açan bir şey", "yağmur": "Yağmurda bizi koruyan bir şey", "müzik": "Müzik yapan bir şey", zaman: "Saati gösteren bir şey",
    okunur: "Okunan bir şey", "çiçek": "Güneşe dönen bir çiçek", dikenli: "Dikenli bir bitki", yaprak: "Yaprakları olan büyük bir bitki", gece: "Gece gökyüzünde parlayan bir şey", "sıcak": "Bizi ısıtan bir şey"
  };

  let AC = null;
  function audio() { try { AC = AC || new (window.AudioContext || window.webkitAudioContext)(); if (AC.state === "suspended") AC.resume(); } catch (e) {} }
  function snd(f, d, type, vol, delay) {
    if (!AC || fast) return;
    const t = AC.currentTime + (delay || 0), o = AC.createOscillator(), g = AC.createGain();
    o.type = type || "triangle"; o.frequency.setValueAtTime(f, t);
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol || 0.06, t + 0.01); g.gain.exponentialRampToValueAtTime(0.0001, t + d);
    o.connect(g).connect(AC.destination); o.start(t); o.stop(t + d + 0.02);
  }
  const canSpeak = "speechSynthesis" in window;
  let trVoice = null;
  function pickVoice() { if (canSpeak) trVoice = speechSynthesis.getVoices().find(v => /^tr(-|_|$)/i.test(v.lang)) || null; }
  if (canSpeak) { pickVoice(); if (speechSynthesis.addEventListener) speechSynthesis.addEventListener("voiceschanged", pickVoice); }
  function say(t) { if (!canSpeak || !trVoice || fast) return; speechSynthesis.cancel(); const u = new SpeechSynthesisUtterance(t); u.voice = trVoice; u.lang = trVoice.lang; u.rate = 1; speechSynthesis.speak(u); }

  let G = null, CFG = null, fast = false, timers = [], Q = [], tick = null;
  const later = (ms, fn) => { if (fast) Q.push(fn); else timers.push(setTimeout(fn, ms)); };
  function drain() { let n = 0; while (Q.length && n++ < 100000) Q.shift()(); }
  const esc = (s) => s.replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  const cap = (s) => s.charAt(0).toLocaleUpperCase("tr-TR") + s.slice(1);
  function sfx(name) { const l = name.toLocaleLowerCase("tr-TR"), v = (l.match(/[aıoueiöü]/g) || ["e"]).pop(), back = "aıou".includes(v), hard = "fstkçşhp".includes(l.slice(-1)); return `'${hard ? (back ? "ta" : "te") : (back ? "da" : "de")}`; }

  function newGame(cfg) {
    CFG = cfg; timers.forEach(clearTimeout); timers = []; Q = []; clearInterval(tick);
    G = { pl: cfg.players.map((p, i) => ({ i, n: p.name, cpu: p.cpu, help: p.help, tk: TOKENS[i], sc: 0 })), turn: -1, done: 0, total: cfg.len * cfg.players.length, over: false };
    $("setup").hidden = true; $("over").hidden = true;
    nextTurn();
  }
  // sahne ve tek bir doğru cevabı olan ipucu
  function makeRound() {
    for (let t = 0; t < 200; t++) {
      const scene = OBJ.slice().sort(() => Math.random() - 0.5).slice(0, N);
      const target = scene[Math.floor(Math.random() * N)];
      let clue, match;
      if (CFG.lvl === 0) { clue = `${cap(target[1])} nerede?`; match = (o) => o === target; }
      else if (CFG.lvl === 1) { clue = `${cap(target[2])} ${CAT[target[3]]} bul!`; match = (o) => o[2] === target[2] && o[3] === target[3]; }
      else { const tags = target[4].filter(t => RIDDLE[t]); if (!tags.length) continue; const tag = tags[Math.floor(Math.random() * tags.length)]; clue = `${RIDDLE[tag]} bul!`; match = (o) => o[4].includes(tag) && (tag !== "zıplar" || o[2] === "yeşil"); }
      if (scene.filter(match).length === 1) return { scene, target, clue };
    }
    return null;
  }
  function nextTurn() {
    if (G.done >= G.total) return finish();
    G.turn = (G.turn + 1) % G.pl.length; G.done++;
    let r = null; while (!r) r = makeRound();
    Object.assign(G, r, { busy: false, t0: performance.now() });
    const p = G.pl[G.turn];
    renderScene(); render();
    setMsg(`Sıra ${p.n}${sfx(p.n)}!`);
    say(`${p.n}, ${G.clue}`);
    clearInterval(tick);
    if (!fast) tick = setInterval(timeTick, 200);
    if (p.cpu) later(2500 + Math.random() * 5500, () => { if (!G.busy) pick(G.scene.indexOf(G.target)); });
  }
  function timeTick() {
    if (!G || G.busy) return;
    const left = TIME - (performance.now() - G.t0) / 1000;
    $("tbar").style.width = Math.max(0, left / TIME * 100) + "%";
    const p = G.pl[G.turn];
    if (p.help && !p.cpu && left < TIME - 6) { const b = $("scene").children[G.scene.indexOf(G.target)]; if (b) b.classList.add("hint"); }
    if (left <= 0) timeUp();
  }
  function timeUp() {
    G.busy = true; clearInterval(tick);
    const b = $("scene").children[G.scene.indexOf(G.target)]; if (b) b.classList.add("ok");
    setMsg(`⏰ Süre bitti! Cevap: ${G.target[0]} ${G.target[1]}`); snd(220, 0.3, "sine");
    later(2000, nextTurn);
  }
  function pick(i) {
    if (!G || G.over || G.busy) return false;
    const o = G.scene[i], b = fast ? null : $("scene").children[i], p = G.pl[G.turn];
    if (o !== G.target) { snd(200, 0.12, "sine"); if (b) { b.classList.remove("no"); void b.offsetWidth; b.classList.add("no"); } return false; }
    G.busy = true; clearInterval(tick);
    const sec = (performance.now() - G.t0) / 1000, pts = Math.max(1, Math.round(10 - sec * 9 / TIME));
    p.sc += pts; if (b) b.classList.add("ok");
    snd(784, 0.1); snd(1046, 0.15, "triangle", 0.06, 0.08);
    setMsg(`✔ ${p.n} buldu: ${o[1]}! +${pts} puan`); say(`Aferin! ${o[1]}.`);
    render();
    later(1600, nextTurn);
    return true;
  }
  function finish() {
    G.over = true; clearInterval(tick);
    const sorted = [...G.pl].sort((a, b) => b.sc - a.sc), top = sorted[0].sc, wins = sorted.filter(p => p.sc === top);
    $("over-title").textContent = wins.length > 1 ? `Berabere: ${wins.map(p => p.n).join(" ve ")}!` : `${wins[0].n} kazandı!`;
    $("results").innerHTML = sorted.map(p => `<div class="${p.sc === top ? "win" : ""}"><span>${p.tk} ${esc(p.n)}</span><b>${p.sc} puan</b></div>`).join("");
    [523, 659, 784, 1046].forEach((f, i) => snd(f, 0.22, "triangle", 0.08, i * 0.12)); $("over").hidden = false;
  }
  function setMsg(t) { if (!fast) $("msg").textContent = t; }
  function renderScene() {
    if (fast) return;
    const s = $("scene"); s.textContent = "";
    const p = G.pl[G.turn];
    G.scene.forEach((o, i) => { const b = document.createElement("button"); b.type = "button"; b.className = "obj"; b.textContent = o[0]; b.setAttribute("aria-label", o[1]); b.disabled = p.cpu; b.addEventListener("click", () => { audio(); pick(i); }); s.appendChild(b); });
    $("clue").textContent = `🔍 ${G.clue}`; $("tbar").style.width = "100%";
  }
  function render() {
    if (fast || !G) return;
    $("players").innerHTML = G.pl.map((p, i) => `<div class="pl${i === G.turn && !G.over ? " cur" : ""}"><span aria-hidden="true">${p.tk}</span>${esc(p.n)}${p.cpu ? " 🤖" : ""} <span class="sc">${p.sc}</span></div>`).join("");
  }

  const form = $("setup-form");
  function buildRows() {
    const n = +form.count.value, box = $("rows");
    const old = [...box.querySelectorAll(".p-row")].map(r => ({ n: r.querySelector("input[type=text]").value, cpu: r.querySelector(".cpu").checked, help: r.querySelector(".hl").checked }));
    box.innerHTML = "";
    for (let i = 0; i < n; i++) {
      const src = old[i] || DEF[i], row = document.createElement("div"); row.className = "p-row";
      row.innerHTML = `<span class="tk">${TOKENS[i]}</span><input type="text" maxlength="12" aria-label="${i + 1}. oyuncunun adı" placeholder="Oyuncu ${i + 1}">
        <label class="toggle" title="Bilgisayar oynasın"><input type="checkbox" class="cpu"> 🤖</label><label class="toggle" title="Yardım"><input type="checkbox" class="hl"> ✨</label>`;
      row.querySelector("input[type=text]").value = src.n; row.querySelector(".cpu").checked = src.cpu; row.querySelector(".hl").checked = src.help;
      box.appendChild(row);
    }
  }
  form.addEventListener("change", (e) => { if (e.target.name === "count") buildRows(); });
  form.addEventListener("submit", (e) => {
    e.preventDefault(); audio(); pickVoice();
    const players = [...$("rows").querySelectorAll(".p-row")].map((r, i) => ({ name: r.querySelector("input[type=text]").value.trim() || (r.querySelector(".cpu").checked ? ["Robi", "Zeki", "Bilge", "Pırıl", "Tonton", "Minik"][i] : ["Tilki", "Panda", "Kurbağa", "Aslan", "Penguen", "Ahtapot"][i]), cpu: r.querySelector(".cpu").checked, help: r.querySelector(".hl").checked }));
    const cfg = { players, lvl: +form.lvl.value, len: +form.len.value };
    try { localStorage.setItem(SAVE_KEY, JSON.stringify({ count: players.length, lvl: cfg.lvl, len: cfg.len })); } catch (_) {}
    newGame(cfg);
  });
  try { const s = JSON.parse(localStorage.getItem(SAVE_KEY) || "null"); if (s) { form.count.value = String(s.count); form.lvl.value = String(s.lvl); form.len.value = String(s.len); } } catch (_) {}
  buildRows();
  $("settings").addEventListener("click", () => { timers.forEach(clearTimeout); timers = []; clearInterval(tick); $("over").hidden = true; $("setup").hidden = false; });
  $("again").addEventListener("click", () => newGame(CFG));
  $("to-setup").addEventListener("click", () => { $("over").hidden = true; $("setup").hidden = false; });

  window.__gg = { OBJ, RIDDLE, newGame, pick, drain, makeRound, setFast: (f) => { fast = f; }, setCFG: (c) => { CFG = c; }, get G() { return G; } };
})();
