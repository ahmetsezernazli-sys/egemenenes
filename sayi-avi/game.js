/* Sayı Avı — aile sayı tahmin oyunu: daha büyük mü küçük mü? */
(() => {
  "use strict";
  const $ = (id) => document.getElementById(id);
  const SAVE_KEY = "sayi-avi";
  const TOKENS = ["🦊", "🐼", "🐸", "🦁", "🐧", "🐙"];
  const DEF = [{ n: "Enes", cpu: false, help: false }, { n: "Egemen", cpu: false, help: true }, { n: "Anne", cpu: false, help: false }, { n: "Baba", cpu: false, help: false }, { n: "", cpu: true, help: false }, { n: "", cpu: true, help: false }];

  /* ---------- ses ---------- */
  let AC = null;
  function audio() { try { AC = AC || new (window.AudioContext || window.webkitAudioContext)(); if (AC.state === "suspended") AC.resume(); } catch (e) {} }
  function snd(f, d, type, vol, delay) {
    if (!AC || fast) return;
    const t = AC.currentTime + (delay || 0), o = AC.createOscillator(), g = AC.createGain();
    o.type = type || "triangle"; o.frequency.setValueAtTime(f, t);
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol || 0.06, t + 0.01); g.gain.exponentialRampToValueAtTime(0.0001, t + d);
    o.connect(g).connect(AC.destination); o.start(t); o.stop(t + d + 0.02);
  }
  const SND = { up: () => snd(500, 0.12, "triangle", 0.06), down: () => snd(300, 0.12, "triangle", 0.06), key: () => snd(800, 0.03, "square", 0.02), win: () => [523, 659, 784, 1046, 1318].forEach((f, i) => snd(f, 0.22, "triangle", 0.08, i * 0.1)) };
  const canSpeak = "speechSynthesis" in window;
  let trVoice = null;
  function pickVoice() { if (canSpeak) trVoice = speechSynthesis.getVoices().find(v => /^tr(-|_|$)/i.test(v.lang)) || null; }
  if (canSpeak) { pickVoice(); if (speechSynthesis.addEventListener) speechSynthesis.addEventListener("voiceschanged", pickVoice); }
  function say(t) { if (!canSpeak || !trVoice || fast) return; speechSynthesis.cancel(); const u = new SpeechSynthesisUtterance(t); u.voice = trVoice; u.lang = trVoice.lang; u.rate = 1; speechSynthesis.speak(u); }

  /* ---------- durum ---------- */
  let G = null, CFG = null, fast = false, timers = [], Q = [], entry = "";
  const later = (ms, fn) => { if (fast) Q.push(fn); else timers.push(setTimeout(fn, ms)); };
  function drain() { let n = 0; while (Q.length && n++ < 100000) Q.shift()(); }
  function sfx(name) { const l = name.toLocaleLowerCase("tr-TR"), v = (l.match(/[aıoueiöü]/g) || ["e"]).pop(), back = "aıou".includes(v), hard = "fstkçşhp".includes(l.slice(-1)); return `'${hard ? (back ? "ta" : "te") : (back ? "da" : "de")}`; }
  const esc = (s) => s.replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

  function newGame(cfg) {
    CFG = cfg; timers.forEach(clearTimeout); timers = []; Q = [];
    G = { pl: cfg.players.map((p, i) => ({ i, n: p.name, cpu: p.cpu, help: p.help, tk: TOKENS[i], sc: 0 })), round: 0, starter: -1, over: false };
    $("setup").hidden = true; $("over").hidden = true;
    newRound();
  }
  function newRound() {
    G.round++;
    if (G.round > CFG.len) return finish();
    G.secret = 1 + Math.floor(Math.random() * CFG.max); G.lo = 1; G.hi = CFG.max; G.tries = []; G.busy = false;
    G.starter = (G.starter + 1) % G.pl.length; G.turn = G.starter;
    startTurn(`${G.round}. tur: 1 ile ${CFG.max} arasında bir sayı tuttum!`);
  }
  function startTurn(pre) {
    entry = ""; G.busy = false;
    const p = G.pl[G.turn];
    const tip = p.help && !p.cpu ? ` Öneri: ${Math.floor((G.lo + G.hi) / 2)}.` : "";
    setMsg(`${pre ? pre + " " : ""}Sıra ${p.n}${sfx(p.n)}.${tip}`);
    if (!pre && p.help && !p.cpu) say(`Sıra ${p.n}${sfx(p.n)}. ${Math.floor((G.lo + G.hi) / 2)} dene.`);
    render();
    if (p.cpu) later(1000, () => guess(cpuPick(p)));
  }
  function cpuPick() {
    // bilgisayar bazen tam ortayı, bazen aralıktan rastgele seçer
    return Math.random() < 0.6 ? Math.floor((G.lo + G.hi) / 2) : G.lo + Math.floor(Math.random() * (G.hi - G.lo + 1));
  }
  function guess(v) {
    if (!G || G.over || G.busy) return false;
    v = Math.round(v);
    if (!(v >= 1 && v <= CFG.max)) { setMsg(`1 ile ${CFG.max} arasında bir sayı yaz.`); return false; }
    const p = G.pl[G.turn];
    G.tries.push(v);
    if (v === G.secret) {
      p.sc++; G.busy = true; SND.win();
      setMsg(`🎉 ${p.n} buldu! Gizli sayı ${v} idi.`); say(`${p.n} buldu! Sayı ${v}.`);
      G.lo = G.hi = v; render();
      later(2200, newRound);
      return true;
    }
    if (v < G.secret) { G.lo = Math.max(G.lo, v + 1); SND.up(); }
    else { G.hi = Math.min(G.hi, v - 1); SND.down(); }
    const big = v < G.secret;
    G.turn = (G.turn + 1) % G.pl.length; G.busy = true;
    const nx = G.pl[G.turn];
    setMsg(`${v}: daha ${big ? "BÜYÜK ⬆" : "KÜÇÜK ⬇"}! Sıra ${nx.n}${sfx(nx.n)}.`);
    say(`Daha ${big ? "büyük" : "küçük"}.`);
    render();
    later(1100, () => startTurn(`${v}: daha ${big ? "büyük ⬆" : "küçük ⬇"}.`));
    return true;
  }
  function finish() {
    G.over = true;
    const sorted = [...G.pl].sort((a, b) => b.sc - a.sc), top = sorted[0].sc, wins = sorted.filter(p => p.sc === top);
    $("over-title").textContent = wins.length > 1 ? `Berabere: ${wins.map(p => p.n).join(" ve ")}!` : `${wins[0].n} kazandı!`;
    $("results").innerHTML = sorted.map(p => `<div class="${p.sc === top ? "win" : ""}"><span>${p.tk} ${esc(p.n)}</span><b>${p.sc} sayı</b></div>`).join("");
    SND.win(); $("over").hidden = false;
  }

  /* ---------- çizim ---------- */
  function setMsg(t) { if (!fast) $("msg").textContent = t; }
  function render() {
    if (fast || !G) return;
    $("players").innerHTML = G.pl.map((p, i) => `<div class="pl${i === G.turn && !G.over ? " cur" : ""}"><span aria-hidden="true">${p.tk}</span>${esc(p.n)}${p.cpu ? " 🤖" : ""} <span class="sc">${p.sc}</span></div>`).join("");
    $("range").textContent = G.lo === G.hi ? String(G.lo) : `${G.lo} – ${G.hi}`;
    const ok = $("ok"); ok.style.left = ((G.lo - 1) / CFG.max * 100) + "%"; ok.style.width = ((G.hi - G.lo + 1) / CFG.max * 100) + "%";
    $("lo-end").textContent = 1; $("hi-end").textContent = CFG.max;
    $("entry").textContent = entry || " ";
    $("hist").innerHTML = G.tries.map(v => `<span>${v}${v < G.secret ? " ⬆" : v > G.secret ? " ⬇" : " ✔"}</span>`).join("");
    const human = !G.pl[G.turn].cpu && !G.busy && !G.over;
    [...$("pad").children].forEach(b => b.disabled = !human);
  }
  // sayı tuşları
  const labels = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "0", "⌫", "Tahmin et ✔"];
  for (const l of labels) {
    const b = document.createElement("button"); b.type = "button"; b.className = "btn key" + (l === "⌫" ? " del" : l.startsWith("Tahmin") ? " go" : ""); b.textContent = l;
    b.addEventListener("click", () => { audio(); press(l); });
    $("pad").appendChild(b);
  }
  function press(l) {
    if (!G || G.over || G.busy || G.pl[G.turn].cpu) return;
    if (l === "⌫") entry = entry.slice(0, -1);
    else if (l.startsWith("Tahmin")) { if (entry) guess(+entry); return; }
    else if (entry.length < String(CFG.max).length) { entry += l; SND.key(); }
    $("entry").textContent = entry || " ";
  }
  document.addEventListener("keydown", (e) => {
    if (!$("setup").hidden || !$("over").hidden) return;
    if (/^[0-9]$/.test(e.key)) press(e.key);
    else if (e.key === "Backspace") { e.preventDefault(); press("⌫"); }
    else if (e.key === "Enter") { e.preventDefault(); audio(); press("Tahmin et ✔"); }
  });

  /* ---------- kurulum ---------- */
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
    const cfg = { players, max: +form.max.value, len: +form.len.value };
    try { localStorage.setItem(SAVE_KEY, JSON.stringify({ count: players.length, max: cfg.max, len: cfg.len })); } catch (_) {}
    newGame(cfg);
  });
  try { const s = JSON.parse(localStorage.getItem(SAVE_KEY) || "null"); if (s) { form.count.value = String(s.count); form.max.value = String(s.max); form.len.value = String(s.len); } } catch (_) {}
  buildRows();
  $("settings").addEventListener("click", () => { timers.forEach(clearTimeout); timers = []; $("over").hidden = true; $("setup").hidden = false; });
  $("again").addEventListener("click", () => newGame(CFG));
  $("to-setup").addEventListener("click", () => { $("over").hidden = true; $("setup").hidden = false; });

  // test kancası
  window.__sa = { newGame, guess, drain, setFast: (f) => { fast = f; }, get G() { return G; } };
})();
