/* Sıcak Patates — aile parti oyunu: söyle ve ver, patates patlamadan */
(() => {
  "use strict";
  const $ = (id) => document.getElementById(id);
  const SAVE_KEY = "sicak-patates";
  const TOKENS = ["🦊", "🐼", "🐸", "🦁", "🐧", "🐙", "🐰", "🐻"];
  const DEF = ["Enes", "Egemen", "Anne", "Baba", "", "", "", ""];
  const TIMES = [[8, 20], [14, 35], [22, 55]];
  // küçüklere: resimli kolay sorular
  const EASY = [
    ["🐾", "Bir hayvan söyle"], ["🎨", "Bir renk söyle"], ["🍎", "Bir meyve söyle"], ["🥕", "Bir sebze söyle"], ["🧸", "Bir oyuncak söyle"],
    ["🚗", "Bir taşıt söyle"], ["🍽️", "Mutfakta bir eşya söyle"], ["👃", "Vücudunda bir yer söyle"], ["🌊", "Denizde yaşayan bir şey söyle"],
    ["🍀", "Yeşil bir şey söyle"], ["🦋", "Uçan bir şey söyle"], ["🏫", "Okulda bir eşya söyle"], ["🛁", "Banyoda bir şey söyle"],
    ["🍰", "Tatlı bir yiyecek söyle"], ["👕", "Bir giysi söyle"], ["🌳", "Parkta ne var?"], ["🔢", "Bir sayı söyle"], ["🐶", "Bir hayvanın sesini yap"],
    ["🔴", "Kırmızı bir şey söyle"], ["❄️", "Soğuk bir şey söyle"]
  ];
  const NORMAL = [
    "Bir ülke söyle", "Bir şehir söyle", "Bir meslek söyle", "Bir spor dalı söyle", "Bir müzik aleti söyle", "Bir sıfat söyle (tatlı, büyük…)",
    "Bir fiil söyle (koşmak, uyumak…)", "Bir kıyafet söyle", "Dört harfli bir hayvan söyle", "İçinde “ar” geçen bir kelime söyle",
    "Sonu “-lık” ya da “-lik” ile biten bir kelime söyle", "Bir çizgi film kahramanı söyle", "Evde elektrikle çalışan bir şey söyle",
    "Bir kuş türü söyle", "Bir çiçek söyle", "Bir tatlı ya da pasta söyle", "Bir gezegen ya da gökcismi söyle", "Bir vücut organı söyle",
    "Bir dağ, nehir ya da göl söyle", "Bir okul dersi söyle", "Bir kahvaltılık söyle", "İki heceli bir meyve söyle", "Kışın kullanılan bir şey söyle",
    "Tekerleği olan bir şey söyle", "Bir masal kahramanı söyle"
  ];
  const LETTERS = "ABÇDEGHİKMOPSTY";

  /* ---------- ses ---------- */
  let AC = null;
  function audio() { try { AC = AC || new (window.AudioContext || window.webkitAudioContext)(); if (AC.state === "suspended") AC.resume(); } catch (e) {} }
  function tone(f, d, type, vol, delay) {
    if (!AC) return;
    const t = AC.currentTime + (delay || 0), o = AC.createOscillator(), g = AC.createGain();
    o.type = type || "triangle"; o.frequency.setValueAtTime(f, t);
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol || 0.05, t + 0.01); g.gain.exponentialRampToValueAtTime(0.0001, t + d);
    o.connect(g).connect(AC.destination); o.start(t); o.stop(t + d + 0.02);
  }
  function boomSnd() {
    if (!AC) return;
    const t = AC.currentTime, n = AC.createBuffer(1, AC.sampleRate * 0.8, AC.sampleRate), d = n.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / d.length, 2);
    const s = AC.createBufferSource(), f = AC.createBiquadFilter(), g = AC.createGain();
    s.buffer = n; f.type = "lowpass"; f.frequency.value = 900; g.gain.value = 0.8;
    s.connect(f).connect(g).connect(AC.destination); s.start(t);
    tone(90, 0.5, "sine", 0.3);
  }
  const canSpeak = "speechSynthesis" in window;
  let trVoice = null;
  function pickVoice() { if (canSpeak) trVoice = speechSynthesis.getVoices().find(v => /^tr(-|_|$)/i.test(v.lang)) || null; }
  if (canSpeak) { pickVoice(); if (speechSynthesis.addEventListener) speechSynthesis.addEventListener("voiceschanged", pickVoice); }
  function say(t) { if (!canSpeak || !trVoice) return; speechSynthesis.cancel(); const u = new SpeechSynthesisUtterance(t); u.voice = trVoice; u.lang = trVoice.lang; u.rate = 1.0; speechSynthesis.speak(u); }
  const esc = (s) => s.replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  const rnd = (n) => Math.floor(Math.random() * n);

  /* ---------- durum ---------- */
  let CFG = null, G = null, tickT = null;
  function newGame(cfg) {
    CFG = cfg; stopTick();
    G = { round: 0, pts: cfg.players.map(() => 0), holder: rnd(cfg.players.length), phase: "", fuse: 0, left: 0, held: 0, passes: 0, lastQ: "" };
    $("setup").hidden = true; $("over").hidden = true;
    readyRound();
  }
  function readyRound() {
    G.round++; G.phase = "ready"; stopTick();
    renderPlayers();
    const nm = CFG.players[G.holder];
    $("table").innerHTML = `
      <p class="small-note">Tur ${G.round}/${CFG.rounds}</p>
      <div class="potato" id="pot">${potatoSvg(0)}</div>
      <p class="holder"><span class="tk">${TOKENS[G.holder]}</span> Patates ${esc(nm)}${sfx(nm)}</p>
      <p class="small-note">Telefonu ${esc(nm)} alsın. Hazır olunca başlat!</p>
      <button class="btn primary pass" id="go" type="button">🔥 Başlat</button>`;
    $("go").addEventListener("click", () => { audio(); start(); });
  }
  function start() {
    const [a, b] = TIMES[CFG.tm];
    G.fuse = a + Math.random() * (b - a); G.left = G.fuse; G.phase = "hot"; G.held = 0; G.passes = 0; G.used = new Set();
    showTurn(); tick();
  }
  function question(p) {
    if (CFG.help[p]) { let q; do q = EASY[rnd(EASY.length)]; while (EASY.length > 1 && q[1] === G.lastQ); G.lastQ = q[1]; return { ic: q[0], tx: q[1] }; }
    if (Math.random() < 0.3) { const l = LETTERS[rnd(LETTERS.length)]; const tx = `“${l}” harfiyle başlayan bir kelime söyle`; G.lastQ = tx; return { ic: "🔤", tx, l }; }
    let q; do q = NORMAL[rnd(NORMAL.length)]; while (q === G.lastQ); G.lastQ = q; return { ic: "💬", tx: q };
  }
  function showTurn() {
    const nm = CFG.players[G.holder], q = question(G.holder);
    G.q = q; G.held = 0;
    renderPlayers();
    $("table").innerHTML = `
      <p class="holder"><span class="tk">${TOKENS[G.holder]}</span> ${esc(nm)}</p>
      <p class="q"><span class="ic" aria-hidden="true">${q.ic}</span>${esc(q.tx)}</p>
      <div class="potato hot" id="pot">${potatoSvg(1 - G.left / G.fuse)}</div>
      <button class="btn primary pass" id="pass" type="button">Söyledim! Sıradakine ver ➜</button>`;
    $("pass").addEventListener("click", () => { audio(); pass(); });
    say(`${nm}: ${q.tx}`);
  }
  function pass() {
    if (!G || G.phase !== "hot") return false;
    G.passes++; G.holder = (G.holder + 1) % CFG.players.length;
    tone(660, 0.06, "square", 0.04); tone(880, 0.06, "square", 0.04, 0.06);
    showTurn();
    return true;
  }
  let lastBeat = 0;
  function tick() {
    stopTick();
    let prev = performance.now();
    tickT = setInterval(() => {
      const now = performance.now(), dt = Math.min(0.5, (now - prev) / 1000); prev = now;
      if (!G || G.phase !== "hot") return;
      G.held += dt;
      // ✨ oyuncunun elinde ilk 4 saniye patlamaz
      const protectedNow = CFG.help[G.holder] && G.held < 4;
      if (!(protectedNow && G.left <= dt)) G.left -= dt;
      const heat = 1 - Math.max(0, G.left) / G.fuse;
      const beat = 0.75 - heat * 0.6;
      if (now - lastBeat > beat * 1000) { lastBeat = now; tone(heat > 0.75 ? 1100 : 800, 0.04, "square", 0.035); }
      const pot = $("pot");
      if (pot) { pot.classList.toggle("hotter", heat > 0.7); const f = pot.querySelector(".fl"); if (f) f.setAttribute("opacity", String(0.3 + heat * 0.7)); const b = pot.querySelector(".body"); if (b) b.setAttribute("fill", heatColor(heat)); }
      if (G.left <= 0) explode();
    }, 50);
  }
  function stopTick() { clearInterval(tickT); tickT = null; }
  function explode() {
    stopTick(); G.phase = "boom"; G.pts[G.holder]++;
    boomSnd(); if (navigator.vibrate) try { navigator.vibrate(400); } catch (e) {}
    const nm = CFG.players[G.holder], pot = $("pot");
    if (pot) { pot.classList.remove("hot", "hotter"); pot.classList.add("boom"); pot.insertAdjacentHTML("beforeend", `<div class="boomtx">PATLADI!</div>`); }
    const pb = $("pass"); if (pb) { pb.disabled = true; }
    say(`Patates ${nm} elinde patladı!`);
    renderPlayers();
    setTimeout(() => {
      if (!G || G.phase !== "boom") return;
      if (G.round >= CFG.rounds) return finish();
      $("table").insertAdjacentHTML("beforeend", `<p class="small-note">${esc(nm)} bir 🥔 aldı. Yeni tur ${esc(nm)} ile başlar.</p>`);
      const b = document.createElement("button"); b.className = "btn primary pass"; b.type = "button"; b.textContent = "Sonraki tur";
      b.addEventListener("click", () => { audio(); readyRound(); });
      $("table").appendChild(b); b.focus();
    }, 1400);
  }
  function finish() {
    G.phase = "";
    const order = CFG.players.map((p, i) => ({ p, s: G.pts[i], i })).sort((a, b) => a.s - b.s);
    const low = order[0].s, winners = order.filter(o => o.s === low).map(o => o.p);
    [523, 659, 784, 1046].forEach((f, i) => tone(f, 0.22, "triangle", 0.07, i * 0.12));
    const t = winners.length === CFG.players.length ? "Herkes berabere!" : winners.length > 1 ? `Kazananlar: ${winners.join(", ")}!` : `${winners[0]} kazandı!`;
    say(t);
    $("over-title").textContent = t;
    $("over-tx").textContent = "En az patatesi olan kazanır.";
    $("results").innerHTML = order.map(o => `<div class="${o.s === low ? "win" : ""}"><span>${TOKENS[o.i]} ${esc(o.p)}</span><b>${"🥔".repeat(o.s) || "—"}</b></div>`).join("");
    $("over").hidden = false;
  }
  function heatColor(h) { const r = Math.round(201 + 40 * h), g = Math.round(138 - 70 * h), b = Math.round(75 - 40 * h); return `rgb(${r},${g},${b})`; }
  function potatoSvg(h) {
    return `<svg viewBox="0 0 240 200" aria-hidden="true">
      <g class="fl" opacity="${0.3 + h * 0.7}" stroke="#E5484D" stroke-width="9" stroke-linecap="round" fill="none"><path d="M80 52q14-22 0-44"/><path d="M120 46q14-22 0-44"/><path d="M160 52q14-22 0-44"/></g>
      <ellipse cx="120" cy="190" rx="80" ry="8" fill="rgba(0,0,0,.12)"/>
      <path class="body" d="M30 120c0-46 38-66 92-66s88 22 88 62-34 70-92 70-88-22-88-66z" fill="${heatColor(h)}"/>
      <g fill="rgba(120,70,30,.45)"><circle cx="78" cy="104" r="5"/><circle cx="160" cy="96" r="4"/><circle cx="140" cy="150" r="5"/><circle cx="92" cy="152" r="4"/></g>
      <circle cx="98" cy="122" r="9" fill="#2A2540"/><circle cx="146" cy="122" r="9" fill="#2A2540"/><circle cx="101" cy="119" r="3" fill="#fff"/><circle cx="149" cy="119" r="3" fill="#fff"/>
      <path d="M104 148q18 14 36 0" stroke="#2A2540" stroke-width="6" fill="none" stroke-linecap="round"/>
      <g fill="#7FD4FF" opacity="${h > 0.5 ? 1 : 0}"><path d="M186 92q8 14 0 20q-8-6 0-20z"/></g>
    </svg>`;
  }
  function renderPlayers() {
    $("players").innerHTML = CFG.players.map((q, i) => `<div class="pl${G && i === G.holder && G.phase ? " cur" : ""}"><span aria-hidden="true">${TOKENS[i]}</span>${esc(q)}${CFG.help[i] ? " ✨" : ""} <span class="pt">${"🥔".repeat(G ? G.pts[i] : 0)}</span></div>`).join("");
  }
  function sfx(name) { const l = name.toLocaleLowerCase("tr-TR"), v = (l.match(/[aıoueiöü]/g) || ["e"]).pop(), back = "aıou".includes(v), hard = "fstkçşhp".includes(l.slice(-1)); return `'${hard ? (back ? "ta" : "te") : (back ? "da" : "de")}`; }

  /* ---------- ayarlar ---------- */
  const form = $("setup-form");
  let saved = null;
  try { saved = JSON.parse(localStorage.getItem(SAVE_KEY) || "null"); } catch (_) {}
  function buildRows() {
    const n = +form.count.value, box = $("rows");
    const old = [...box.querySelectorAll(".p-row")].map(r => [r.querySelector("input[type=text]").value, r.querySelector("input[type=checkbox]").checked]);
    box.innerHTML = "";
    for (let i = 0; i < n; i++) {
      const row = document.createElement("div"); row.className = "p-row"; row.style.gridTemplateColumns = "34px minmax(0,1fr) auto";
      row.innerHTML = `<span class="tk">${TOKENS[i]}</span><input type="text" maxlength="12" aria-label="${i + 1}. oyuncunun adı" placeholder="Oyuncu ${i + 1}"><label class="toggle" title="Küçüklere kolaylık"><input type="checkbox" aria-label="${i + 1}. oyuncuya kolaylık"> ✨</label>`;
      const [nm, h] = old[i] || [saved && saved.names && saved.names[i] != null ? saved.names[i] : DEF[i], saved && saved.help ? !!saved.help[i] : DEF[i] === "Egemen"];
      row.querySelector("input[type=text]").value = nm; row.querySelector("input[type=checkbox]").checked = h;
      box.appendChild(row);
    }
  }
  form.addEventListener("change", (e) => { if (e.target.name === "count") buildRows(); });
  form.addEventListener("submit", (e) => {
    e.preventDefault(); audio(); pickVoice();
    const rows = [...$("rows").querySelectorAll(".p-row")];
    const players = rows.map((r, i) => r.querySelector("input[type=text]").value.trim() || ["Tilki", "Panda", "Kurbağa", "Aslan", "Penguen", "Ahtapot", "Tavşan", "Ayı"][i]);
    const help = rows.map(r => r.querySelector("input[type=checkbox]").checked);
    const cfg = { players, help, tm: +form.tm.value, rounds: +form.rn.value };
    try { localStorage.setItem(SAVE_KEY, JSON.stringify({ count: players.length, names: rows.map(r => r.querySelector("input[type=text]").value), help, tm: cfg.tm, rn: cfg.rounds })); } catch (_) {}
    newGame(cfg);
  });
  if (saved) { try { form.count.value = String(saved.count); form.tm.value = String(saved.tm); form.rn.value = String(saved.rn); } catch (_) {} }
  buildRows();
  $("settings").addEventListener("click", () => { stopTick(); if (G) G.phase = ""; if (canSpeak) speechSynthesis.cancel(); $("over").hidden = true; $("setup").hidden = false; });
  $("again").addEventListener("click", () => { audio(); newGame(CFG); });
  $("to-setup").addEventListener("click", () => { $("over").hidden = true; $("setup").hidden = false; });
  document.addEventListener("visibilitychange", () => { if (document.hidden && canSpeak) speechSynthesis.cancel(); });

  window.__sp = { newGame, start, pass, explode, readyRound, get G() { return G; } };
})();
