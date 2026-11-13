/* Hikaye Zarları — aile hikâye oyunu: resimli zarlarla sırayla hikâye anlat */
(() => {
  "use strict";
  const $ = (id) => document.getElementById(id);
  const SAVE_KEY = "hikaye-zarlari";
  const TOKENS = ["🦊", "🐼", "🐸", "🦁", "🐧", "🐙"];
  const DEF = [{ n: "Enes" }, { n: "Egemen" }, { n: "Anne" }, { n: "Baba" }, { n: "" }, { n: "" }];
  // zar yüzleri: herkesin tanıyacağı resimler
  const FACES = ["🐻", "🐱", "🐶", "🐸", "🐢", "🦁", "🐘", "🦊", "🐧", "🐟", "🦋", "🐝", "🐉", "🦄", "🤖", "👻", "🧙", "👑",
    "🏠", "🏰", "🌳", "🌋", "🏝️", "🌙", "⭐", "☀️", "🌈", "⛈️", "❄️", "🌊", "🚀", "🚗", "🚂", "⛵", "✈️", "🚲",
    "🎁", "🔑", "🗺️", "🎈", "📦", "🕯️", "🔦", "🍎", "🍰", "🍕", "🥕", "⚽", "🎸", "📚", "⏰", "💎", "🧸", "🪄", "🛸", "🌻", "🍄", "🦖"];
  const OPEN = ["Bir zamanlar, çok uzak bir yerde…", "Bir sabah uyandığında…", "Ormanın derinliklerinde…", "Bir gün okuldan dönerken…", "Gökyüzünde garip bir ışık belirdi…", "Denizin ortasındaki bir adada…"];

  let AC = null;
  function audio() { try { AC = AC || new (window.AudioContext || window.webkitAudioContext)(); if (AC.state === "suspended") AC.resume(); } catch (e) {} }
  function snd(f, d, type, vol, delay) {
    if (!AC) return;
    const t = AC.currentTime + (delay || 0), o = AC.createOscillator(), g = AC.createGain();
    o.type = type || "triangle"; o.frequency.setValueAtTime(f, t);
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol || 0.05, t + 0.01); g.gain.exponentialRampToValueAtTime(0.0001, t + d);
    o.connect(g).connect(AC.destination); o.start(t); o.stop(t + d + 0.02);
  }
  const canSpeak = "speechSynthesis" in window;
  let trVoice = null;
  function pickVoice() { if (canSpeak) trVoice = speechSynthesis.getVoices().find(v => /^tr(-|_|$)/i.test(v.lang)) || null; }
  if (canSpeak) { pickVoice(); if (speechSynthesis.addEventListener) speechSynthesis.addEventListener("voiceschanged", pickVoice); }
  function say(t) { if (!canSpeak || !trVoice) return; speechSynthesis.cancel(); const u = new SpeechSynthesisUtterance(t); u.voice = trVoice; u.lang = trVoice.lang; u.rate = 0.95; speechSynthesis.speak(u); }

  let G = null, CFG = null, tick = null;
  const esc = (s) => s.replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  function sfx(name) { const l = name.toLocaleLowerCase("tr-TR"), v = (l.match(/[aıoueiöü]/g) || ["e"]).pop(), back = "aıou".includes(v), hard = "fstkçşhp".includes(l.slice(-1)); return `'${hard ? (back ? "ta" : "te") : (back ? "da" : "de")}`; }

  function newGame(cfg) {
    CFG = cfg; clearInterval(tick);
    const pool = FACES.slice().sort(() => Math.random() - 0.5);
    G = { pl: cfg.players, faces: pool.slice(0, cfg.dn), used: [], turn: 0, open: OPEN[Math.floor(Math.random() * OPEN.length)], done: false };
    $("setup").hidden = true; $("over").hidden = true;
    render(true);
    [0, 0.1, 0.2, 0.3].forEach((d, i) => snd(300 + i * 80, 0.08, "square", 0.03, d));
    say(G.open);
    startTimer();
  }
  function startTimer() {
    clearInterval(tick);
    if (!CFG.len || G.done) return;
    G.t0 = performance.now();
    tick = setInterval(() => {
      const left = CFG.len - (performance.now() - G.t0) / 1000, bar = document.querySelector(".tbar i");
      if (bar) bar.style.width = Math.max(0, left / CFG.len * 100) + "%";
      if (left <= 0) { clearInterval(tick); snd(220, 0.3, "sine", 0.06); const m = $("msg"); if (m) m.textContent = "⏰ Süre doldu! Cümleyi bitir, bir zara dokun."; }
    }, 200);
  }
  function render(rolling) {
    const p = G.pl[G.turn % G.pl.length];
    const first = G.used.length === 0;
    $("players").innerHTML = G.pl.map((q, i) => `<div class="pl${i === G.turn % G.pl.length && !G.done ? " cur" : ""}"><span aria-hidden="true">${TOKENS[i]}</span>${esc(q)}</div>`).join("");
    $("table").innerHTML = `
      <p class="prompt">${first ? `<span style="color:var(--accent-d)">${esc(G.open)}</span><br>` : ""}Sıra <b>${esc(p)}</b>${sfx(p)}: bir resim seç, hikâyeye bir cümle ekle!</p>
      ${CFG.len ? '<div class="tbar"><i></i></div>' : ""}
      <div class="dice">${G.faces.map((f, i) => `<button type="button" class="die${G.used.includes(i) ? " used" : ""}${rolling ? " roll" : ""}" data-i="${i}" aria-label="Zar ${i + 1}${G.used.includes(i) ? ", kullanıldı" : ""}">${f}</button>`).join("")}</div>
      <p class="msg" id="msg">${G.used.length}/${G.faces.length} resim kullanıldı</p>
      <div class="row-b"><button class="btn" id="skip" type="button">Sırayı geç</button><button class="btn" id="reroll" type="button">🎲 Kalanları yeniden at</button></div>`;
    $("table").querySelectorAll(".die").forEach(b => b.addEventListener("click", () => { audio(); use(+b.dataset.i); }));
    $("skip").addEventListener("click", () => { audio(); G.turn++; render(); startTimer(); });
    $("reroll").addEventListener("click", () => { audio(); reroll(); });
  }
  function use(i) {
    if (!G || G.done || G.used.includes(i)) return false;
    G.used.push(i); snd(660 + G.used.length * 30, 0.1);
    if (G.used.length >= G.faces.length) return finish();
    G.turn++; render(); startTimer();
    return true;
  }
  function reroll() {
    const keep = new Set(G.used.map(i => G.faces[i]));
    const pool = FACES.filter(f => !keep.has(f)).sort(() => Math.random() - 0.5);
    let k = 0; G.faces = G.faces.map((f, i) => G.used.includes(i) ? f : pool[k++]);
    render(true); [0, 0.1, 0.2].forEach((d, i) => snd(300 + i * 80, 0.08, "square", 0.03, d));
  }
  function finish() {
    G.done = true; clearInterval(tick);
    [523, 659, 784, 1046].forEach((f, i) => snd(f, 0.22, "triangle", 0.07, i * 0.12));
    say("Hikâye bitti! Şimdi ona güzel bir isim koyun.");
    $("over-title").textContent = "Hikâye bitti! 📖";
    $("over-tx").textContent = "Şimdi hikâyenize birlikte bir isim koyun. Kim hikâyeyi baştan kısaca anlatabilir?";
    $("results").innerHTML = `<div style="justify-content:center;font-size:2rem;font-family:'Segoe UI Emoji','Apple Color Emoji',sans-serif">${G.used.map(i => G.faces[i]).join(" ")}</div>`;
    $("again").textContent = "Yeni hikâye";
    setTimeout(() => { $("over").hidden = false; }, 500);
  }

  const form = $("setup-form");
  function buildRows() {
    const n = +form.count.value, box = $("rows");
    const old = [...box.querySelectorAll(".p-row input")].map(i => i.value);
    box.innerHTML = "";
    for (let i = 0; i < n; i++) {
      const row = document.createElement("div"); row.className = "p-row"; row.style.gridTemplateColumns = "34px minmax(0,1fr)";
      row.innerHTML = `<span class="tk">${TOKENS[i]}</span><input type="text" maxlength="12" aria-label="${i + 1}. oyuncunun adı" placeholder="Oyuncu ${i + 1}">`;
      row.querySelector("input").value = old[i] !== undefined ? old[i] : DEF[i].n;
      box.appendChild(row);
    }
  }
  form.addEventListener("change", (e) => { if (e.target.name === "count") buildRows(); });
  form.addEventListener("submit", (e) => {
    e.preventDefault(); audio(); pickVoice();
    const players = [...$("rows").querySelectorAll(".p-row input")].map((inp, i) => inp.value.trim() || ["Tilki", "Panda", "Kurbağa", "Aslan", "Penguen", "Ahtapot"][i]);
    const cfg = { players, dn: +form.dn.value, len: +form.len.value };
    try { localStorage.setItem(SAVE_KEY, JSON.stringify({ count: players.length, dn: cfg.dn, len: cfg.len })); } catch (_) {}
    newGame(cfg);
  });
  try { const s = JSON.parse(localStorage.getItem(SAVE_KEY) || "null"); if (s) { form.count.value = String(s.count); form.dn.value = String(s.dn); form.len.value = String(s.len); } } catch (_) {}
  buildRows();
  $("settings").addEventListener("click", () => { clearInterval(tick); $("over").hidden = true; $("setup").hidden = false; });
  $("again").addEventListener("click", () => newGame(CFG));
  $("to-setup").addEventListener("click", () => { $("over").hidden = true; $("setup").hidden = false; });

  window.__hz = { FACES, newGame, use, reroll, get G() { return G; } };
})();
