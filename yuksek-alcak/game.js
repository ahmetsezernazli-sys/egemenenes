/* Yüksek mi Alçak mı? — aile kart tahmin oyunu (riske gir ya da kasaya al) */
(() => {
  "use strict";
  const $ = (id) => document.getElementById(id);
  const SAVE_KEY = "yuksek-alcak", GOAL = 30;
  const RANKS = ["", "A", "2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K"], SUITS = ["♠", "♥", "♦", "♣"];
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
  const SND = { ok: (n) => snd(500 + n * 60, 0.12), bad: () => { snd(300, 0.2, "sawtooth", 0.05); snd(200, 0.3, "sawtooth", 0.05, 0.15); }, bank: () => [880, 1175].forEach((f, i) => snd(f, 0.1, "square", 0.04, i * 0.07)), flip: () => snd(420, 0.05, "sine", 0.05), win: () => [523, 659, 784, 1046, 1318].forEach((f, i) => snd(f, 0.25, "triangle", 0.08, i * 0.12)) };

  /* ---------- durum ---------- */
  let G = null, CFG = null, fast = false, timers = [], Q = [];
  const later = (ms, fn) => { if (fast) Q.push(fn); else timers.push(setTimeout(fn, ms)); };
  function drain() { let n = 0; while (Q.length && n++ < 100000) Q.shift()(); }
  function newDeck() {
    const d = []; for (let s = 0; s < 4; s++) for (let r = 1; r <= 13; r++) d.push({ r, s });
    for (let i = d.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [d[i], d[j]] = [d[j], d[i]]; }
    return d;
  }
  function draw() { if (!G.deck.length) { G.deck = newDeck(); G.seen = []; } return G.deck.pop(); }
  function newGame(cfg) {
    CFG = cfg; timers.forEach(clearTimeout); timers = []; Q = [];
    G = { pl: cfg.players.map((p, i) => ({ i, n: p.name, cpu: p.cpu, help: p.help, tk: TOKENS[i], sc: 0 })), turn: 0, pot: 0, streak: 0, deck: newDeck(), seen: [], hist: [], over: false, busy: false };
    G.cur = draw(); G.seen.push(G.cur);
    $("setup").hidden = true; $("over").hidden = true;
    startTurn();
  }
  // kalan destede yüksek/alçak/eşit kart sayısı
  function odds() {
    let hi = 0, lo = 0, eq = 0;
    for (const c of G.deck) { if (c.r > G.cur.r) hi++; else if (c.r < G.cur.r) lo++; else eq++; }
    const n = G.deck.length || 1;
    return { hi: hi / n, lo: lo / n, eq: eq / n };
  }
  function startTurn() {
    if (G.over) return;
    G.pot = 0; G.streak = 0; G.busy = false;
    const p = G.pl[G.turn];
    setMsg(`Sıra ${p.n}${sfx(p.n)}. Yüksek mi, alçak mı?`);
    render();
    if (p.cpu) later(900, cpuAct);
  }
  function cpuAct() {
    if (G.over) return;
    const o = odds(), risk = 1 - Math.max(o.hi, o.lo) - o.eq * 0;
    const p = G.pl[G.turn], need = GOAL - p.sc;
    // kasaya alma kararı: kasa büyükse ya da risk yüksekse
    if (G.pot > 0 && (G.pot >= need || (risk > 0.38 && G.pot >= 3) || G.pot >= 8)) return bank();
    guess(o.hi >= o.lo ? "hi" : "lo");
    if (!G.over && G.pl[G.turn] === p && !G.busy) later(900, cpuAct);
  }
  function guess(dir) {
    if (!G || G.over || G.busy) return false;
    const p = G.pl[G.turn];
    const prev = G.cur, next = draw(); G.seen.push(next);
    G.hist.push(prev); if (G.hist.length > 4) G.hist.shift();
    G.cur = next; SND.flip();
    const ok = dir === "hi" ? next.r > prev.r : next.r < prev.r;
    if (next.r === prev.r) { setMsg(`Aynı sayı geldi (${RANKS[next.r]})! Kasa korundu, devam.`); render(true); return true; }
    if (ok) {
      G.streak++; G.pot += G.streak; SND.ok(G.streak);
      setMsg(`Doğru! ${RANKS[next.r]} geldi. Kasa ${G.pot} puan. Devam mı, kasaya mı?`);
      if (p.sc + G.pot >= GOAL && p.cpu) { render(true); return true; }
      render(true); return true;
    }
    SND.bad(); const lost = G.pot; G.pot = 0; G.busy = true;
    setMsg(`Eyvah! ${RANKS[next.r]} geldi. ${lost ? lost + " puanlık kasa gitti." : ""} Sıra geçiyor.`);
    render(true);
    later(1500, nextTurn);
    return false;
  }
  function bank() {
    if (!G || G.over || G.busy || G.pot <= 0) return false;
    const p = G.pl[G.turn];
    p.sc += G.pot; SND.bank(); G.busy = true;
    setMsg(`💰 ${p.n} ${G.pot} puanı kasaya aldı!`);
    G.pot = 0; render();
    if (p.sc >= GOAL) { later(700, finish); return true; }
    later(1100, nextTurn);
    return true;
  }
  function nextTurn() { G.turn = (G.turn + 1) % G.pl.length; startTurn(); }
  function finish() {
    G.over = true;
    const sorted = [...G.pl].sort((a, b) => b.sc - a.sc);
    $("over-title").textContent = `${sorted[0].n} kazandı!`;
    $("results").innerHTML = sorted.map((p, k) => `<div class="${k === 0 ? "win" : ""}"><span>${p.tk} ${esc(p.n)}</span><b>${p.sc} puan</b></div>`).join("");
    SND.win(); $("over").hidden = false;
  }
  const esc = (s) => s.replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  function sfx(name) {
    const l = name.toLocaleLowerCase("tr-TR"), v = (l.match(/[aıoueiöü]/g) || ["e"]).pop(), back = "aıou".includes(v), hard = "fstkçşhp".includes(l.slice(-1));
    return `'${hard ? (back ? "ta" : "te") : (back ? "da" : "de")}`;
  }

  /* ---------- çizim ---------- */
  function setMsg(t) { if (!fast) $("msg").textContent = t; }
  const cardHtml = (c, cls) => `<div class="pc ${cls || ""} ${c.s === 1 || c.s === 2 ? "red" : ""}"><span class="r">${RANKS[c.r]}</span><span class="s">${SUITS[c.s]}</span></div>`;
  function render(flip) {
    if (fast || !G) return;
    $("players").innerHTML = G.pl.map((p, i) => `<div class="pl${i === G.turn && !G.over ? " cur" : ""}"><span aria-hidden="true">${p.tk}</span>${esc(p.n)}${p.cpu ? " 🤖" : ""} <span class="sc">${p.sc}</span></div>`).join("");
    $("cards").innerHTML = G.hist.slice(-2).map(c => cardHtml(c, "small")).join("") + cardHtml(G.cur, flip ? "flip" : "") + `<div class="pc back" aria-hidden="true"></div>`;
    $("pot").textContent = G.pot;
    const p = G.pl[G.turn], human = !p.cpu && !G.busy && !G.over;
    $("b-hi").disabled = $("b-lo").disabled = !human;
    $("b-bank").disabled = !human || G.pot <= 0;
    const o = odds();
    const showHelp = human && p.help;
    $("chance").hidden = !showHelp;
    ["b-hi", "b-lo", "b-bank"].forEach(id => $(id).classList.remove("glow"));
    if (showHelp) {
      $("ch-hi").style.width = (o.hi * 100) + "%"; $("ch-lo").style.width = (o.lo * 100) + "%";
      $("ch-tx").textContent = `Yüksek çıkma ihtimali %${Math.round(o.hi * 100)} · Alçak %${Math.round(o.lo * 100)}`;
      const risk = 1 - Math.max(o.hi, o.lo);
      if (G.pot >= 3 && risk > 0.35) $("b-bank").classList.add("glow"); else $(o.hi >= o.lo ? "b-hi" : "b-lo").classList.add("glow");
    }
  }
  $("b-hi").addEventListener("click", () => { audio(); guess("hi"); });
  $("b-lo").addEventListener("click", () => { audio(); guess("lo"); });
  $("b-bank").addEventListener("click", () => { audio(); bank(); });
  document.addEventListener("keydown", (e) => {
    if (!G || G.over || !$("setup").hidden || G.pl[G.turn].cpu) return;
    if (e.key === "ArrowUp") { e.preventDefault(); audio(); guess("hi"); }
    else if (e.key === "ArrowDown") { e.preventDefault(); audio(); guess("lo"); }
    else if (e.key === " " || e.key === "Enter") { e.preventDefault(); audio(); bank(); }
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
    e.preventDefault(); audio();
    const players = [...$("rows").querySelectorAll(".p-row")].map((r, i) => ({ name: r.querySelector("input[type=text]").value.trim() || (r.querySelector(".cpu").checked ? ["Robi", "Zeki", "Bilge", "Pırıl", "Tonton", "Minik"][i] : ["Tilki", "Panda", "Kurbağa", "Aslan", "Penguen", "Ahtapot"][i]), cpu: r.querySelector(".cpu").checked, help: r.querySelector(".hl").checked }));
    try { localStorage.setItem(SAVE_KEY, JSON.stringify({ count: players.length })); } catch (_) {}
    newGame({ players });
  });
  try { const s = JSON.parse(localStorage.getItem(SAVE_KEY) || "null"); if (s) form.count.value = String(s.count); } catch (_) {}
  buildRows();
  $("settings").addEventListener("click", () => { timers.forEach(clearTimeout); timers = []; $("over").hidden = true; $("setup").hidden = false; });
  $("again").addEventListener("click", () => newGame(CFG));
  $("to-setup").addEventListener("click", () => { $("over").hidden = true; $("setup").hidden = false; });

  // test kancası
  window.__ya = { newGame, guess, bank, odds, drain, setFast: (f) => { fast = f; }, get G() { return G; } };
})();
