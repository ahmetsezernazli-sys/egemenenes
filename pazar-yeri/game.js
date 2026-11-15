/* Pazar Yeri — aile ticaret masa oyunu */
(() => {
  "use strict";
  const $ = (id) => document.getElementById(id);
  const SAVE_KEY = "pazar-yeri";
  const TOKENS = ["🦊", "🐼", "🐸", "🦁"];
  const PCOL = ["#E8590C", "#3D8BFD", "#2E9F5A", "#9B5DE5"];
  const DEF = ["Enes", "Egemen", "Anne", "Baba"];
  // 16 kare: saat yönünde sol üstten
  const POS = [[0, 0], [0, 1], [0, 2], [0, 3], [0, 4], [1, 4], [2, 4], [3, 4], [4, 4], [4, 3], [4, 2], [4, 1], [4, 0], [3, 0], [2, 0], [1, 0]];
  const GROUPS = { k: "#E5484D", t: "#FF9F43", s: "#FFC529", y: "#2DB75A", m: "#9B5DE5", h: "#8A5A2B" };
  const SQ = [
    { t: "start", e: "🏁", ad: "Başla" },
    { t: "stall", e: "🍎", ad: "Elma", g: "k", p: 3 }, { t: "stall", e: "🍒", ad: "Kiraz", g: "k", p: 3 }, { t: "stall", e: "🍊", ad: "Portakal", g: "t", p: 4 },
    { t: "chance", e: "❓", ad: "Şans" },
    { t: "stall", e: "🥕", ad: "Havuç", g: "t", p: 4 }, { t: "stall", e: "🍋", ad: "Limon", g: "s", p: 5 }, { t: "stall", e: "🍌", ad: "Muz", g: "s", p: 5 },
    { t: "park", e: "⛲", ad: "Çeşme" },
    { t: "stall", e: "🥦", ad: "Brokoli", g: "y", p: 6 }, { t: "stall", e: "🥒", ad: "Salatalık", g: "y", p: 6 }, { t: "stall", e: "🍇", ad: "Üzüm", g: "m", p: 7 },
    { t: "chance", e: "❓", ad: "Şans" },
    { t: "stall", e: "🍆", ad: "Patlıcan", g: "m", p: 7 }, { t: "stall", e: "🍞", ad: "Ekmek", g: "h", p: 8 }, { t: "stall", e: "🧀", ad: "Peynir", g: "h", p: 8 }
  ];
  const CARDS = [
    { tx: "Yerde 2 altın buldun!", f: (p) => gain(p, 2) },
    { tx: "Pazar şenliği! 3 altın kazandın.", f: (p) => gain(p, 3) },
    { tx: "Tezgah tentesi yırtıldı, tamir için 1 altın öde.", f: (p) => gain(p, -1) },
    { tx: "Herkes sana 1 altın verir!", f: (p) => G.pl.forEach((q, i) => { if (i !== p) { const x = Math.min(1, q.c); q.c -= x; G.pl[p].c += x; } }) },
    { tx: "Bayram! Herkese 1 altın şeker parası ver.", f: (p) => G.pl.forEach((q, i) => { if (i !== p && G.pl[p].c > 0) { G.pl[p].c--; q.c++; } }) },
    { tx: "Başla'ya git ve 3 altın al!", f: (p) => { G.pl[p].pos = 0; gain(p, 3); } },
    { tx: "Çeşmede dinlen, 1 altın al.", f: (p) => { G.pl[p].pos = 8; gain(p, 1); } }
  ];
  const rentOf = (i) => { const s = SQ[i], o = G.own[i]; if (o == null) return 0; const both = SQ.every((q, j) => q.g !== s.g || G.own[j] === o); return Math.ceil(s.p / 2) * (both ? 2 : 1); };
  function gain(p, n) { G.pl[p].c = Math.max(0, G.pl[p].c + n); }

  /* ---------- ses ---------- */
  let AC = null;
  function audio() { try { AC = AC || new (window.AudioContext || window.webkitAudioContext)(); if (AC.state === "suspended") AC.resume(); } catch (e) {} }
  function tone(f, d, type, vol, delay) {
    if (!AC || fast) return;
    const t = AC.currentTime + (delay || 0), o = AC.createOscillator(), g = AC.createGain();
    o.type = type || "triangle"; o.frequency.setValueAtTime(f, t);
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol || 0.05, t + 0.01); g.gain.exponentialRampToValueAtTime(0.0001, t + d);
    o.connect(g).connect(AC.destination); o.start(t); o.stop(t + d + 0.02);
  }
  const coinSnd = () => { tone(1200, 0.06, "square", 0.04); tone(1600, 0.08, "square", 0.04, 0.06); };
  const canSpeak = "speechSynthesis" in window;
  let trVoice = null;
  function pickVoice() { if (canSpeak) trVoice = speechSynthesis.getVoices().find(v => /^tr(-|_|$)/i.test(v.lang)) || null; }
  if (canSpeak) { pickVoice(); if (speechSynthesis.addEventListener) speechSynthesis.addEventListener("voiceschanged", pickVoice); }
  function say(t) { if (fast || !canSpeak || !trVoice) return; speechSynthesis.cancel(); const u = new SpeechSynthesisUtterance(t); u.voice = trVoice; u.lang = trVoice.lang; u.rate = 0.98; speechSynthesis.speak(u); }
  const esc = (s) => s.replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  function sfx(name) { const l = name.toLocaleLowerCase("tr-TR"), v = (l.match(/[aıoueiöü]/g) || ["e"]).pop(), back = "aıou".includes(v), hard = "fstkçşhp".includes(l.slice(-1)); return `'${hard ? (back ? "ta" : "te") : (back ? "da" : "de")}`; }

  /* ---------- durum ---------- */
  let CFG = null, G = null, fast = false, timer = null;
  function later(ms, fn) { if (fast) fn(); else timer = setTimeout(fn, ms); }
  function newGame(cfg) {
    CFG = cfg; clearTimeout(timer);
    G = { pl: cfg.players.map(() => ({ c: 15, pos: 0 })), own: SQ.map(() => null), turn: 0, round: 1, phase: "roll", die: 1, over: false, last: -1 };
    $("setup").hidden = true; $("over").hidden = true;
    buildBoard(); startTurn();
  }
  const isCpu = (p) => CFG.cpu[p];
  const worth = (p) => G.pl[p].c + SQ.reduce((a, s, i) => a + (G.own[i] === p ? s.p : 0), 0);
  function startTurn() {
    G.phase = "roll"; render();
    const p = G.turn, nm = CFG.players[p];
    if (isCpu(p)) { mid(`${TOKENS[p]} ${esc(nm)} zar atıyor…`, ""); later(700, roll); return; }
    mid(`${TOKENS[p]} Sıra ${esc(nm)}${sfx(nm)}`, "", [["🎲 Zar at", roll, CFG.help[p]]]);
    if (CFG.help[p]) say(`${nm}, zar at!`);
  }
  function roll() {
    if (G.phase !== "roll") return;
    G.phase = "move"; G.die = 1 + Math.floor(Math.random() * 6);
    tone(500, 0.05, "square", 0.04); tone(700, 0.05, "square", 0.04, 0.08);
    mid(`${TOKENS[G.turn]} ${esc(CFG.players[G.turn])}`, `${G.die} geldi!`, null, true);
    let n = G.die;
    const stepOne = () => {
      const pl = G.pl[G.turn]; pl.pos = (pl.pos + 1) % 16;
      if (pl.pos === 0) { gain(G.turn, 3); coinSnd(); }
      tone(400 + n * 40, 0.04, "triangle", 0.04); render();
      if (--n > 0) later(220, stepOne); else later(350, land);
    };
    later(500, stepOne);
  }
  function land() {
    const p = G.turn, pl = G.pl[p], s = SQ[pl.pos], nm = CFG.players[p];
    G.phase = "act"; G.last = pl.pos; render(true);
    if (s.t === "stall") {
      const o = G.own[pl.pos];
      if (o == null) {
        if (pl.c >= s.p) {
          const good = cpuBuys(p, pl.pos);
          if (isCpu(p)) { later(800, () => good ? buy() : pass(`${nm} almadı.`)); mid(`${TOKENS[p]} ${esc(nm)}`, `${s.e} ${s.ad} tezgahı ${s.p} altın.`); return; }
          mid(`${TOKENS[p]} ${esc(nm)}`, `${s.e} ${s.ad} tezgahı boş! ${s.p} altına alır mısın? (Kirası ${Math.ceil(s.p / 2)})`, [["✅ Al", buy, CFG.help[p] && good], ["Geç", () => pass(""), CFG.help[p] && !good]]);
          if (CFG.help[p]) say(good ? `${s.ad} tezgahını alabilirsin. Almak iyi olur!` : `${s.ad} tezgahı pahalı, geçebilirsin.`);
          return;
        }
        return done(`${s.e} ${s.ad} tezgahı ${s.p} altın, paran yetmedi.`);
      }
      if (o === p) return done(`${s.e} Kendi tezgahın! Mallarını kontrol ettin.`);
      const r = Math.min(rentOf(pl.pos), pl.c); pl.c -= r; G.pl[o].c += r; coinSnd();
      return done(`${s.e} ${s.ad} tezgahı ${CFG.players[o]} adlı oyuncunun. ${r} altın kira ödedin.`);
    }
    if (s.t === "chance") {
      const c = CARDS[Math.floor(Math.random() * CARDS.length)]; const before = pl.pos;
      c.f(p); coinSnd(); render(true);
      return done(`❓ Şans kartı: ${c.tx}`, pl.pos !== before && pl.pos !== 0 && pl.pos !== 8);
    }
    if (s.t === "park") { gain(p, 1); coinSnd(); return done("⛲ Çeşmede dinlendin, 1 altın buldun."); }
    return done("🏁 Başla karesindesin.");
  }
  function cpuBuys(p, i) {
    const s = SQ[i], c = G.pl[p].c;
    const pair = SQ.some((q, j) => j !== i && q.g === s.g && G.own[j] === p);
    return c >= s.p && (c - s.p >= 2 || pair);
  }
  function buy() {
    const p = G.turn, i = G.pl[p].pos, s = SQ[i];
    if (G.phase !== "act" || G.own[i] != null || G.pl[p].c < s.p) return;
    G.pl[p].c -= s.p; G.own[i] = p; coinSnd(); tone(880, 0.12, "triangle", 0.06, 0.1);
    done(`${s.e} ${CFG.players[p]} ${s.ad} tezgahını aldı!`);
  }
  function pass(msg) { if (G.phase !== "act") return; done(msg || "Tezgahı almadın."); }
  function done(text, again) {
    G.phase = "done"; render(true);
    const p = G.turn, nm = CFG.players[p];
    if (again) { mid(`${TOKENS[p]} ${esc(nm)}`, esc(text)); return later(1400, land); }
    if (isCpu(p)) { mid(`${TOKENS[p]} ${esc(nm)}`, esc(text)); later(1500, next); return; }
    mid(`${TOKENS[p]} ${esc(nm)}`, esc(text), [["Tamam ➜", next, CFG.help[p]]]);
    if (CFG.help[p]) say(text);
  }
  function next() {
    if (G.phase !== "done") return;
    G.turn = (G.turn + 1) % CFG.players.length;
    if (G.turn === 0) { G.round++; if (G.round > CFG.rounds) return finish(); }
    startTurn();
  }
  function finish() {
    G.over = true; G.phase = ""; render();
    const order = CFG.players.map((n, i) => ({ n, i, w: worth(i), c: G.pl[i].c })).sort((a, b) => b.w - a.w);
    const top = order[0].w, wins = order.filter(o => o.w === top).map(o => o.n);
    const t = wins.length > 1 ? `Berabere: ${wins.join(", ")}!` : `${wins[0]} kazandı!`;
    say(t); [523, 659, 784, 1046].forEach((f, i) => tone(f, 0.22, "triangle", 0.07, i * 0.12));
    $("over-title").textContent = t;
    $("over-tx").textContent = "Zenginlik = altın + sahip olunan tezgahların değeri.";
    $("results").innerHTML = order.map(o => `<div class="${o.w === top ? "win" : ""}"><span>${TOKENS[o.i]} ${esc(o.n)}</span><b>${o.w} (${o.c} altın)</b></div>`).join("");
    if (!fast) $("over").hidden = false;
  }

  /* ---------- çizim ---------- */
  const board = $("board"), sqEls = [];
  function buildBoard() {
    sqEls.forEach(e => e.remove()); sqEls.length = 0;
    SQ.forEach((s, i) => {
      const d = document.createElement("div"), [r, c] = POS[i];
      d.className = "sq" + (s.t === "stall" ? "" : " corner"); d.style.gridRow = r + 1; d.style.gridColumn = c + 1;
      if (s.g) d.style.setProperty("--c", GROUPS[s.g]);
      d.innerHTML = `<span class="band"></span><span class="e" aria-hidden="true">${s.e}</span><span class="pr">${s.t === "stall" ? s.p + " altın" : s.ad}</span><span class="toks"></span>`;
      board.appendChild(d); sqEls.push(d);
    });
  }
  function render(landAnim) {
    if (fast || !G) return;
    SQ.forEach((s, i) => {
      const d = sqEls[i], o = G.own[i];
      d.style.setProperty("--own", o == null ? "transparent" : PCOL[o]);
      d.querySelector(".pr").textContent = s.t === "stall" ? (o == null ? `${s.p} altın` : `kira ${rentOf(i)}`) : s.ad;
      d.querySelector(".toks").innerHTML = G.pl.map((p, k) => p.pos === i ? `<i>${TOKENS[k]}</i>` : "").join("");
      d.setAttribute("aria-label", `${s.ad}${s.t === "stall" ? `, ${s.p} altın${o != null ? ", sahibi " + CFG.players[o] : ", boş"}` : ""}`);
      d.classList.toggle("glow", G.phase === "act" && i === G.pl[G.turn].pos);
      if (landAnim && i === G.last) { d.classList.remove("land"); void d.offsetWidth; d.classList.add("land"); }
    });
    $("players").innerHTML = CFG.players.map((q, i) => `<div class="pl${i === G.turn && !G.over ? " cur" : ""}${isCpu(i) ? " cpu" : ""}" style="border-color:${i === G.turn && !G.over ? PCOL[i] : "transparent"}"><span aria-hidden="true">${TOKENS[i]}</span>${esc(q)}${isCpu(i) ? " 🤖" : CFG.help[i] ? " ✨" : ""} <span class="coins">${G.pl[i].c} altın</span></div>`).join("");
  }
  function mid(who, info, btns, rolling) {
    if (fast) return;
    const pips = [[], [4], [0, 8], [0, 4, 8], [0, 2, 6, 8], [0, 2, 4, 6, 8], [0, 2, 3, 5, 6, 8]][G.die];
    $("mid").innerHTML = `<p class="who">${who}</p>
      <div class="die${rolling ? " roll" : ""}" aria-label="Zar: ${G.die}">${Array.from({ length: 9 }, (_, k) => `<i class="${pips.includes(k) ? "on" : ""}"></i>`).join("")}</div>
      ${info ? `<p class="info">${info}</p>` : ""}
      <p class="small-note" style="margin:0;font-size:12px;color:var(--muted);font-weight:700">Tur ${Math.min(G.round, CFG.rounds)}/${CFG.rounds}</p>
      <div class="acts2" id="acts2"></div>`;
    (btns || []).forEach(([t, fn, glow], k) => {
      const b = document.createElement("button"); b.type = "button"; b.className = "btn" + (k === 0 ? " primary" : "") + (glow ? " glow" : ""); b.textContent = t;
      b.addEventListener("click", () => { audio(); fn(); }); $("acts2").appendChild(b);
      if (k === 0) setTimeout(() => b.focus(), 50);
    });
  }

  /* ---------- ayarlar ---------- */
  const form = $("setup-form");
  let saved = null;
  try { saved = JSON.parse(localStorage.getItem(SAVE_KEY) || "null"); } catch (_) {}
  function buildRows() {
    const n = +form.count.value, box = $("rows");
    const old = [...box.querySelectorAll(".p-row")].map(r => [r.querySelector("input[type=text]").value, r.querySelector(".cb-cpu").checked, r.querySelector(".cb-help").checked]);
    box.innerHTML = "";
    for (let i = 0; i < n; i++) {
      const row = document.createElement("div"); row.className = "p-row";
      row.innerHTML = `<span class="tk">${TOKENS[i]}</span><input type="text" maxlength="12" aria-label="${i + 1}. oyuncunun adı" placeholder="Oyuncu ${i + 1}"><label class="toggle" title="Bilgisayar oynasın"><input type="checkbox" class="cb-cpu" aria-label="${i + 1}. oyuncu bilgisayar"> 🤖</label><label class="toggle" title="Küçüklere yardım"><input type="checkbox" class="cb-help" aria-label="${i + 1}. oyuncuya yardım"> ✨</label>`;
      const d = old[i] || [saved && saved.names && saved.names[i] != null ? saved.names[i] : DEF[i], saved && saved.cpu ? !!saved.cpu[i] : i >= 2, saved && saved.help ? !!saved.help[i] : DEF[i] === "Egemen"];
      row.querySelector("input[type=text]").value = d[0]; row.querySelector(".cb-cpu").checked = d[1]; row.querySelector(".cb-help").checked = d[2];
      box.appendChild(row);
    }
  }
  form.addEventListener("change", (e) => { if (e.target.name === "count") buildRows(); });
  form.addEventListener("submit", (e) => {
    e.preventDefault(); audio(); pickVoice();
    const rows = [...$("rows").querySelectorAll(".p-row")];
    const cpu = rows.map(r => r.querySelector(".cb-cpu").checked);
    const players = rows.map((r, i) => r.querySelector("input[type=text]").value.trim() || (cpu[i] ? "Bilgisayar " + (i + 1) : ["Tilki", "Panda", "Kurbağa", "Aslan"][i]));
    const help = rows.map((r, i) => !cpu[i] && r.querySelector(".cb-help").checked);
    if (cpu.every(Boolean)) cpu[0] = false;
    const cfg = { players, cpu, help, rounds: +form.rn.value };
    try { localStorage.setItem(SAVE_KEY, JSON.stringify({ count: players.length, names: rows.map(r => r.querySelector("input[type=text]").value), cpu, help, rn: cfg.rounds })); } catch (_) {}
    newGame(cfg);
  });
  if (saved) { try { form.count.value = String(saved.count); form.rn.value = String(saved.rn); } catch (_) {} }
  buildRows();
  $("settings").addEventListener("click", () => { clearTimeout(timer); $("over").hidden = true; $("setup").hidden = false; });
  $("again").addEventListener("click", () => { audio(); newGame(CFG); });
  $("to-setup").addEventListener("click", () => { $("over").hidden = true; $("setup").hidden = false; });

  window.__pz = { SQ, newGame, roll, buy, pass, next, worth, rentOf, setFast: (f) => { fast = f; }, get G() { return G; }, get CFG() { return CFG; } };
})();
