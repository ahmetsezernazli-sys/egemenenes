/* Tahmin Ustası — aile tahmin yarışması: gizlice tahmin et, en yakın kazansın */
(() => {
  "use strict";
  const $ = (id) => document.getElementById(id);
  const SAVE_KEY = "tahmin-ustasi";
  const TOKENS = ["🦊", "🐼", "🐸", "🦁", "🐧", "🐙"];
  const DEF = [{ n: "Enes", cpu: false, help: false }, { n: "Egemen", cpu: false, help: true }, { n: "Anne", cpu: false, help: false }, { n: "Baba", cpu: false, help: false }, { n: "", cpu: true, help: false }, { n: "", cpu: true, help: false }];
  // sorular: [resim, soru, cevap, zorluk 0 kolay / 1 orta / 2 zor]
  const QS = [
    ["🕷️", "Bir örümceğin kaç bacağı var?", 8, 0], ["📅", "Bir haftada kaç gün var?", 7, 0], ["🐔", "Bir tavuğun kaç ayağı var?", 2, 0],
    ["🌈", "Gökkuşağında kaç renk var?", 7, 0], ["🐙", "Ahtapotun kaç kolu var?", 8, 0], ["🍂", "Bir yılda kaç mevsim var?", 4, 0],
    ["🖐️", "İki elimizde toplam kaç parmak var?", 10, 0], ["🐱", "Üç kedinin toplam kaç bacağı var?", 12, 0], ["⚽", "Bir futbol takımı sahada kaç oyuncuyla oynar?", 11, 0],
    ["🗓️", "Bir yılda kaç ay var?", 12, 0], ["🕐", "Bir günde kaç saat var?", 24, 0], ["⏱️", "Bir dakikada kaç saniye var?", 60, 0],
    ["🇹🇷", "Türkiye'de kaç il var?", 81, 1], ["📆", "Bir yılda kaç gün var (artık yıl değilse)?", 365, 1], ["♟️", "Satranç tahtasında kaç kare var?", 64, 1],
    ["🔤", "Türk alfabesinde kaç harf var?", 29, 1], ["⚽", "Bir futbol maçı uzatmasız kaç dakika sürer?", 90, 1], ["🪐", "Güneş sisteminde kaç gezegen var?", 8, 1],
    ["🏀", "Basketbolda bir takım sahada kaç oyuncuyla oynar?", 5, 1], ["🥚", "Bir düzine kaç tanedir?", 12, 1], ["💧", "Su deniz seviyesinde kaç derecede kaynar?", 100, 1],
    ["📏", "Bir kilometre kaç metredir?", 1000, 1], ["🎹", "Bir piyanoda kaç tuş vardır?", 88, 2], ["🦴", "Yetişkin bir insanın vücudunda kaç kemik vardır?", 206, 2],
    ["🏰", "İstanbul hangi yıl fethedildi?", 1453, 2], ["🇹🇷", "Cumhuriyet hangi yıl ilan edildi?", 1923, 2], ["🌙", "İnsan Ay'a ilk kez hangi yıl ayak bastı?", 1969, 2],
    ["⛰️", "Ağrı Dağı yaklaşık kaç metre yüksekliğindedir?", 5137, 2], ["🏔️", "Everest Dağı yaklaşık kaç metre yüksekliğindedir?", 8849, 2], ["👶", "Atatürk hangi yıl doğdu?", 1881, 2]
  ];

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

  let G = null, CFG = null, fast = false, timers = [], entry = "";
  const later = (ms, fn) => { if (fast) fn(); else timers.push(setTimeout(fn, ms)); };
  const esc = (s) => s.replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  const fmt = (n) => Number(n).toLocaleString("tr-TR");
  const T = () => $("table");

  function newGame(cfg) {
    CFG = cfg; timers.forEach(clearTimeout); timers = [];
    const pool = QS.filter(q => cfg.lvl === 0 ? q[3] === 0 : cfg.lvl === 2 ? q[3] >= 1 : true).sort(() => Math.random() - 0.5);
    G = { pl: cfg.players.map((p, i) => ({ i, n: p.name, cpu: p.cpu, help: p.help, tk: TOKENS[i], sc: 0 })), pool, qi: -1, over: false };
    $("setup").hidden = true; $("over").hidden = true;
    nextQ();
  }
  function nextQ() {
    G.qi++;
    if (G.qi >= CFG.len) return finish();
    // her üçüncü soru yıldız sayma
    const dotRound = G.qi % 3 === 2 || G.pool.length === 0;
    if (dotRound) {
      const n = CFG.lvl === 0 ? 6 + Math.floor(Math.random() * 10) : 12 + Math.floor(Math.random() * 28);
      G.q = { dots: n, text: "Yıldızlara iyi bak! Kaç tane?", ans: n };
    } else { const q = G.pool[G.qi % G.pool.length]; G.q = { em: q[0], text: q[1], ans: q[2] }; }
    G.guesses = []; G.who = 0;
    render(); hud();
    if (fast) return askNext();
    if (G.q.dots) { say("Yıldızlara iyi bak!"); later(3200, () => { const d = T().querySelector(".dots"); if (d) d.classList.add("hide"); say("Kaç tane vardı?"); later(900, askNext); }); }
    else { say(G.q.text); later(1500, askNext); }
  }
  function render() {
    if (fast) return;
    const q = G.q;
    let html = `<p class="q">${q.em ? `<span class="em" aria-hidden="true">${q.em}</span>` : ""}${esc(q.text)}</p>`;
    if (q.dots) {
      const pos = []; let tries = 0;
      while (pos.length < q.dots && tries++ < 3000) { const x = 5 + Math.random() * 90, y = 10 + Math.random() * 80; if (pos.every(([a, b]) => Math.hypot(a - x, (b - y) * 0.45) > 6)) pos.push([x, y]); }
      html += `<div class="dots">${pos.map(([x, y]) => `<span style="left:${x}%;top:${y}%">⭐</span>`).join("")}</div>`;
    }
    html += `<p class="msg" id="msg"></p><div id="act"></div>`;
    T().innerHTML = html;
  }
  function hud() {
    if (fast) return;
    $("players").innerHTML = G.pl.map((p, i) => `<div class="pl${!G.over && G.who === i && G.guesses.length < G.pl.length ? " cur" : ""}"><span aria-hidden="true">${p.tk}</span>${esc(p.n)}${p.cpu ? " 🤖" : ""} <span class="sc">${p.sc}</span></div>`).join("");
  }
  // sırayla herkesten gizli tahmin
  function askNext() {
    if (G.who >= G.pl.length) return reveal();
    const p = G.pl[G.who]; hud();
    if (p.cpu) {
      const noise = G.q.dots ? 0.25 : G.q.ans > 1000 ? 0.04 : 0.3;
      const g = Math.max(0, Math.round(G.q.ans * (1 + (Math.random() * 2 - 1) * noise)));
      G.guesses.push({ i: p.i, g }); G.who++;
      if (fast) return askNext();
      $("msg").textContent = `${p.n} tahminini yazdı 🤫`; return later(700, askNext);
    }
    if (fast) return;
    entry = "";
    const hint = p.help ? helpRange() : "";
    $("act").innerHTML = `<p class="msg">📱 Telefonu <b>${esc(p.n)}</b> alsın. Tahminini gizlice yaz.${hint}</p>
      <div class="entry secret" id="entry">&nbsp;</div><div class="pad" id="pad"></div>`;
    const labels = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "0", "⌫", "Tamam ✔"];
    for (const l of labels) {
      const b = document.createElement("button"); b.type = "button"; b.className = "btn key" + (l === "⌫" ? " del" : l.startsWith("Tamam") ? " go" : ""); b.textContent = l;
      b.addEventListener("click", () => { audio(); press(l); });
      $("pad").appendChild(b);
    }
  }
  function helpRange() {
    const a = G.q.ans, lo = Math.max(0, Math.floor(a * 0.6)), hi = Math.ceil(a * 1.4) + 1;
    return `<br>✨ İpucu: ${fmt(lo)} ile ${fmt(hi)} arasında.`;
  }
  function press(l) {
    if (!G || G.over || G.who >= G.pl.length) return;
    if (l === "⌫") entry = entry.slice(0, -1);
    else if (l.startsWith("Tamam")) { if (!entry) return; submit(+entry); return; }
    else if (entry.length < 5) { entry += l; snd(800, 0.03, "square", 0.02); }
    $("entry").textContent = entry ? "•".repeat(entry.length) : " ";
  }
  function submit(v) {
    const p = G.pl[G.who];
    G.guesses.push({ i: p.i, g: v }); G.who++;
    snd(660, 0.08);
    if (fast) return askNext();
    $("act").innerHTML = `<p class="msg">✔ ${esc(p.n)} yazdı. Sıradaki…</p>`;
    later(700, askNext);
  }
  function reveal() {
    const a = G.q.ans, ds = G.guesses.map(x => ({ ...x, d: Math.abs(x.g - a) })), best = Math.min(...ds.map(x => x.d));
    for (const x of ds) { if (x.d === best) G.pl[x.i].sc += 3; if (x.d === 0) G.pl[x.i].sc += 2; }
    hud();
    if (fast) { later(0, nextQ); return; }
    const d = T().querySelector(".dots"); if (d) d.classList.remove("hide");
    $("act").innerHTML = `<p class="ans">Cevap: ${fmt(a)}</p><div class="reveal">${ds.sort((x, y) => x.d - y.d).map(x => `<div class="${x.d === best ? "win" : ""}"><span>${G.pl[x.i].tk} ${esc(G.pl[x.i].n)}: <b>${fmt(x.g)}</b></span><span>${x.d === 0 ? "🎯 tam bildi! +5" : x.d === best ? "en yakın! +3" : "fark " + fmt(x.d)}</span></div>`).join("")}</div>
      <button class="btn primary" id="nq" type="button" style="margin-top:8px">${G.qi + 1 >= CFG.len ? "Sonuçlar" : "Sıradaki soru ▶"}</button>`;
    say(`Cevap ${a}.`); [523, 659, 784].forEach((f, i) => snd(f, 0.15, "triangle", 0.06, i * 0.1));
    $("nq").addEventListener("click", () => { audio(); nextQ(); });
  }
  function finish() {
    G.over = true;
    const sorted = [...G.pl].sort((a, b) => b.sc - a.sc), top = sorted[0].sc, wins = sorted.filter(p => p.sc === top);
    $("over-title").textContent = wins.length > 1 ? `Berabere: ${wins.map(p => p.n).join(" ve ")}!` : `${wins[0].n} tahmin ustası!`;
    $("results").innerHTML = sorted.map(p => `<div class="${p.sc === top ? "win" : ""}"><span>${p.tk} ${esc(p.n)}</span><b>${p.sc} puan</b></div>`).join("");
    if (!fast) [523, 659, 784, 1046].forEach((f, i) => snd(f, 0.22, "triangle", 0.08, i * 0.12));
    $("over").hidden = false;
  }
  document.addEventListener("keydown", (e) => {
    if (!G || G.over || !$("setup").hidden || !$("pad")) return;
    if (/^[0-9]$/.test(e.key)) press(e.key);
    else if (e.key === "Backspace") { e.preventDefault(); press("⌫"); }
    else if (e.key === "Enter") { e.preventDefault(); audio(); press("Tamam ✔"); }
  });

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
  $("settings").addEventListener("click", () => { timers.forEach(clearTimeout); timers = []; $("over").hidden = true; $("setup").hidden = false; });
  $("again").addEventListener("click", () => newGame(CFG));
  $("to-setup").addEventListener("click", () => { $("over").hidden = true; $("setup").hidden = false; });

  window.__tu = { QS, newGame, submit, setFast: (f) => { fast = f; }, get G() { return G; } };
})();
