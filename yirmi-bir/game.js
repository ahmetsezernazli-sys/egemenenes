/* 21 Demeyen Kazanır — aile sayma oyunu: sırayla 1-3 sayı söyle, 21 diyen kaybeder */
(() => {
  "use strict";
  const $ = (id) => document.getElementById(id);
  const SAVE_KEY = "yirmi-bir", END = 21;
  const TOKENS = ["🦊", "🐼", "🐸", "🦁", "🐧", "🐙"];
  const DEF = [{ n: "Enes", cpu: false, help: false }, { n: "Egemen", cpu: false, help: true }, { n: "Anne", cpu: false, help: false }, { n: "Baba", cpu: false, help: false }, { n: "", cpu: true, help: false }, { n: "", cpu: true, help: false }];
  const NUM = ["sıfır", "bir", "iki", "üç", "dört", "beş", "altı", "yedi", "sekiz", "dokuz", "on", "on bir", "on iki", "on üç", "on dört", "on beş", "on altı", "on yedi", "on sekiz", "on dokuz", "yirmi", "yirmi bir"];

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
  function say(t) { if (!canSpeak || !trVoice || fast) return; speechSynthesis.cancel(); const u = new SpeechSynthesisUtterance(t); u.voice = trVoice; u.lang = trVoice.lang; u.rate = 1.05; speechSynthesis.speak(u); }

  let G = null, CFG = null, fast = false, timers = [], Q = [];
  const later = (ms, fn) => { if (fast) Q.push(fn); else timers.push(setTimeout(fn, ms)); };
  function drain() { let n = 0; while (Q.length && n++ < 100000) Q.shift()(); }
  const esc = (s) => s.replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  function sfx(name) { const l = name.toLocaleLowerCase("tr-TR"), v = (l.match(/[aıoueiöü]/g) || ["e"]).pop(), back = "aıou".includes(v), hard = "fstkçşhp".includes(l.slice(-1)); return `'${hard ? (back ? "ta" : "te") : (back ? "da" : "de")}`; }

  // iyi hamle: 20'yi (ve 16, 12, 8, 4'ü) söylemeye çalış
  function bestStep(cur) { for (let k = 1; k <= 3; k++) if ((cur + k) % 4 === 0 && cur + k < END) return k; return null; }

  function newGame(cfg) {
    CFG = cfg; timers.forEach(clearTimeout); timers = []; Q = [];
    G = { pl: cfg.players.map((p, i) => ({ i, n: p.name, cpu: p.cpu, help: p.help, tk: TOKENS[i], pen: 0 })), hand: 0, starter: -1, over: false };
    $("setup").hidden = true; $("over").hidden = true;
    newHand();
  }
  function newHand() {
    G.hand++;
    if (G.hand > CFG.len) return finish();
    G.cur = 0; G.busy = false; G.starter = (G.starter + 1) % G.pl.length; G.turn = G.starter;
    startTurn(`${G.hand}. el başlıyor.`);
  }
  function startTurn(pre) {
    G.busy = false;
    const p = G.pl[G.turn];
    setMsg(`${pre ? pre + " " : ""}Sıra ${p.n}${sfx(p.n)}: kaç sayı söyleyeceksin?`);
    render();
    if (p.cpu) later(900, () => step(cpuStep()));
  }
  function cpuStep() { const b = bestStep(G.cur); return b && Math.random() < 0.8 ? b : 1 + Math.floor(Math.random() * Math.min(3, END - G.cur)); }
  function step(k) {
    if (!G || G.over || G.busy || k < 1 || k > 3 || G.cur + k > END) return false;
    const p = G.pl[G.turn], from = G.cur + 1;
    G.cur += k; G.busy = true;
    const said = []; for (let n = from; n <= G.cur; n++) said.push(n);
    said.forEach((n, i) => snd(500 + n * 15, 0.1, "triangle", 0.06, i * 0.15));
    say(said.map(n => NUM[n]).join(", "));
    if (G.cur >= END) {
      p.pen++;
      setMsg(`😬 ${p.n} 21 demek zorunda kaldı! Bir ceza puanı.`);
      render(); snd(200, 0.4, "sawtooth", 0.06, 0.5);
      later(2200, newHand); return true;
    }
    G.turn = (G.turn + 1) % G.pl.length;
    render();
    later(900, () => startTurn(`${p.n}: ${said.join(", ")}.`));
    return true;
  }
  function finish() {
    G.over = true;
    const sorted = [...G.pl].sort((a, b) => a.pen - b.pen), low = sorted[0].pen, wins = sorted.filter(p => p.pen === low);
    $("over-title").textContent = wins.length > 1 ? `Berabere: ${wins.map(p => p.n).join(" ve ")}!` : `${wins[0].n} kazandı!`;
    $("results").innerHTML = sorted.map(p => `<div class="${p.pen === low ? "win" : ""}"><span>${p.tk} ${esc(p.n)}</span><b>${p.pen} ceza</b></div>`).join("");
    [523, 659, 784, 1046].forEach((f, i) => snd(f, 0.22, "triangle", 0.08, i * 0.12)); $("over").hidden = false;
  }
  function setMsg(t) { if (!fast) $("msg").textContent = t; }
  function render() {
    if (fast || !G) return;
    $("players").innerHTML = G.pl.map((p, i) => `<div class="pl${i === G.turn && !G.over ? " cur" : ""}"><span aria-hidden="true">${p.tk}</span>${esc(p.n)}${p.cpu ? " 🤖" : ""} <span class="sc">${p.pen ? "❌".repeat(p.pen) : "0"}</span></div>`).join("");
    $("cur").textContent = G.cur;
    $("nums").innerHTML = Array.from({ length: END }, (_, i) => `<span class="${i + 1 <= G.cur ? (i + 1 === END ? "last" : "said") : ""}">${i + 1}</span>`).join("");
    const p = G.pl[G.turn], human = !p.cpu && !G.busy && !G.over, good = p.help ? bestStep(G.cur) : null;
    const box = $("picks"); box.innerHTML = "";
    for (let k = 1; k <= 3; k++) {
      const b = document.createElement("button"); b.type = "button"; b.className = "btn" + (human && good === k ? " glow" : "");
      const nums = []; for (let n = G.cur + 1; n <= Math.min(END, G.cur + k); n++) nums.push(n);
      b.textContent = nums.join(", ") || "—"; b.disabled = !human || G.cur + k > END;
      b.setAttribute("aria-label", `${k} sayı söyle: ${nums.join(", ")}`);
      b.addEventListener("click", () => { audio(); step(k); });
      box.appendChild(b);
    }
  }
  document.addEventListener("keydown", (e) => { if (!G || G.over || !$("setup").hidden || G.pl[G.turn].cpu) return; if (["1", "2", "3"].includes(e.key)) { audio(); step(+e.key); } });

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
    const cfg = { players, len: +form.len.value };
    try { localStorage.setItem(SAVE_KEY, JSON.stringify({ count: players.length, len: cfg.len })); } catch (_) {}
    newGame(cfg);
  });
  try { const s = JSON.parse(localStorage.getItem(SAVE_KEY) || "null"); if (s) { form.count.value = String(s.count); form.len.value = String(s.len); } } catch (_) {}
  buildRows();
  $("settings").addEventListener("click", () => { timers.forEach(clearTimeout); timers = []; $("over").hidden = true; $("setup").hidden = false; });
  $("again").addEventListener("click", () => newGame(CFG));
  $("to-setup").addEventListener("click", () => { $("over").hidden = true; $("setup").hidden = false; });

  window.__yb = { newGame, step, drain, bestStep, setFast: (f) => { fast = f; }, get G() { return G; } };
})();
