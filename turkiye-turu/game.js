/* Türkiye Turu — aile emlak oyunu */
(() => {
  "use strict";
  const $ = (id) => document.getElementById(id);
  const SAVE_KEY = "turkiye-turu";

  /* ---------- tahta ---------- */
  const COLORS = { kahve: "#8B5A2B", mavi: "#4DABF7", turuncu: "#FF922B", kirmizi: "#E5484D", yesil: "#2E9F5A", lacivert: "#3B5BDB" };
  const S = [
    { k: "start", nm: "BAŞLA", ic: "🚩" },
    { k: "prop", nm: "Safranbolu", c: "kahve", p: 60 },
    { k: "chance", nm: "Şans", ic: "❓" },
    { k: "prop", nm: "Amasra", c: "kahve", p: 60 },
    { k: "tax", nm: "Vergi", ic: "💸", amt: 50 },
    { k: "museum", nm: "Müze", ic: "🏛️" },
    { k: "prop", nm: "Kapadokya", c: "mavi", p: 100 },
    { k: "prop", nm: "Pamukkale", c: "mavi", p: 100 },
    { k: "chance", nm: "Şans", ic: "❓" },
    { k: "prop", nm: "Efes", c: "turuncu", p: 140 },
    { k: "picnic", nm: "Piknik", ic: "🧺" },
    { k: "prop", nm: "Nemrut", c: "turuncu", p: 140 },
    { k: "chance", nm: "Şans", ic: "❓" },
    { k: "prop", nm: "Uzungöl", c: "kirmizi", p: 180 },
    { k: "prop", nm: "Sümela", c: "kirmizi", p: 180 },
    { k: "plane", nm: "Uçak", ic: "✈️" },
    { k: "prop", nm: "Bodrum", c: "yesil", p: 220 },
    { k: "prop", nm: "Antalya", c: "yesil", p: 220 },
    { k: "prop", nm: "Galata", c: "lacivert", p: 260 },
    { k: "prop", nm: "Kız Kulesi", c: "lacivert", p: 260 },
  ];
  // ızgara konumu: alt sıra sağdan sola, sol sütun aşağıdan yukarı, üst sıra soldan sağa, sağ sütun yukarıdan aşağı
  const POS = [];
  for (let i = 0; i <= 5; i++) POS.push([6 - i, 6]);
  for (let i = 1; i <= 5; i++) POS.push([1, 6 - i]);
  for (let i = 1; i <= 5; i++) POS.push([1 + i, 1]);
  for (let i = 1; i <= 4; i++) POS.push([6, 1 + i]);
  const CARDS = [
    { t: "Doğum günün! Herkes sana 20 ₺ hediye veriyor.", f: (p) => { G.pl.forEach(o => { if (o !== p && !o.out) { pay(o, 20, p); } }); } },
    { t: "Resim yarışmasında birinci oldun: 100 ₺ ödül!", f: (p) => gain(p, 100) },
    { t: "Kumbaranı buldun: 50 ₺!", f: (p) => gain(p, 50) },
    { t: "Bisikletinin tekeri patladı: tamir 30 ₺.", f: (p) => pay(p, 30, null) },
    { t: "Başla'ya git ve 100 ₺ al!", f: (p) => moveTo(p, 0, true) },
    { t: "Kız Kulesi'ne git!", f: (p) => moveTo(p, 19, true) },
    { t: "Kapadokya'da balon turu! Kapadokya'ya git.", f: (p) => moveTo(p, 6, true) },
    { t: "Rüzgâr arkandan esti: 3 kare ilerle.", f: (p) => moveTo(p, (p.pos + 3) % 20, true) },
    { t: "Piknik için alışveriş yaptın: 40 ₺ kumbaraya.", f: (p) => { pay(p, 40, null); G.pot += 40; } },
    { t: "Kütüphaneye kitap bağışladın, herkes çok sevindi! 30 ₺ al.", f: (p) => gain(p, 30) },
    { t: "Uçağa bin! Başla'ya uç, 100 ₺ al.", f: (p) => moveTo(p, 0, true) },
    { t: "Otellerini boyattın: her otel için 25 ₺.", f: (p) => pay(p, 25 * G.hotel.filter((h, i) => h && G.owner[i] === p.i).length, null) },
  ];
  const TOKENS = ["🚗", "⛵", "🚲", "🎈", "🐢", "🚀"];
  const DEF = [{ n: "Enes", cpu: false, help: false }, { n: "Egemen", cpu: false, help: true }, { n: "Anne", cpu: false, help: false }, { n: "Baba", cpu: false, help: false }, { n: "", cpu: true, help: false }, { n: "", cpu: true, help: false }];
  const START_MONEY = 800, PASS = 100;

  // Türkçe ek: dat (-e), acc (-i), loc (-de), gen (-in); özel adlarda kesme işaretiyle
  function ek(w, kind) {
    const lw = w.toLocaleLowerCase("tr-TR"), vowels = lw.match(/[aıoueiöü]/g) || ["e"];
    const v = vowels[vowels.length - 1], back = "aıou".includes(v), endsV = "aıoueiöü".includes(lw.slice(-1));
    const hard = "fstkçşhp".includes(lw.slice(-1));
    const compound = /(si|sı|su|sü)$/.test(lw) && lw.includes(" "); // Kız Kulesi → Kulesi'ne
    const i4 = v === "a" || v === "ı" ? "ı" : v === "e" || v === "i" ? "i" : v === "o" || v === "u" ? "u" : "ü";
    let s;
    if (kind === "dat") s = (compound ? "n" : endsV ? "y" : "") + (back ? "a" : "e");
    else if (kind === "acc") s = (compound ? "n" : endsV ? "y" : "") + i4;
    else if (kind === "loc") s = (compound ? "n" : "") + (hard && !compound ? (back ? "ta" : "te") : (back ? "da" : "de"));
    else s = (endsV ? "n" : "") + i4 + "n";
    return `${w}'${s}`;
  }

  /* ---------- ses ---------- */
  let AC = null, voice = null, fast = false;
  function audio() { try { AC = AC || new (window.AudioContext || window.webkitAudioContext)(); if (AC.state === "suspended") AC.resume(); } catch (e) {} }
  function tone(f, d = 0.1, type = "triangle", vol = 0.06) {
    if (!AC || fast) return;
    const t = AC.currentTime, o = AC.createOscillator(), g = AC.createGain(); o.type = type; o.frequency.value = f;
    g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + d); o.connect(g).connect(AC.destination); o.start(t); o.stop(t + d + 0.02);
  }
  const coin = () => { tone(1320, 0.06, "square", 0.04); setTimeout(() => tone(1760, 0.08, "square", 0.04), 60); };
  const pickVoice = () => { try { voice = speechSynthesis.getVoices().find(v => v.lang && v.lang.toLowerCase().startsWith("tr")) || voice; } catch (e) {} };
  if ("speechSynthesis" in window) { pickVoice(); speechSynthesis.onvoiceschanged = pickVoice; }
  function say(text, force) {
    if (fast || !("speechSynthesis" in window)) return;
    const p = G && G.pl[G.turn];
    if (!force && !(p && p.help && !p.cpu)) return;
    try { speechSynthesis.cancel(); const u = new SpeechSynthesisUtterance(text); u.lang = "tr-TR"; if (voice) u.voice = voice; speechSynthesis.speak(u); } catch (e) {}
  }

  /* ---------- zamanlayıcı (testte anında çalışır) ---------- */
  let Q = [], timers = [];
  const later = (s, fn) => { if (fast) Q.push(fn); else timers.push(setTimeout(fn, s * 1000)); };
  function drain(limit = 200000) { let n = 0; while (Q.length && n++ < limit) Q.shift()(); return n; }

  /* ---------- oyun ---------- */
  let G = null, CFG = null;
  function newGame(cfg) {
    timers.forEach(clearTimeout); timers = []; Q = [];
    CFG = cfg;
    G = { pl: cfg.players.map((p, i) => ({ i, n: p.name, cpu: p.cpu, help: p.help, tk: TOKENS[i], money: START_MONEY, pos: 0, out: false })),
          owner: new Array(20).fill(-1), hotel: new Array(20).fill(false), turn: 0, round: 1, maxRound: cfg.len, pot: 0, phase: "roll", dice: [1, 1], over: false };
    $("over").hidden = true; $("setup").hidden = true;
    render(); startTurn();
  }
  const P = () => G.pl[G.turn];
  const rentOf = (i) => { const sq = S[i], pair = S.every((s, j) => s.c !== sq.c || G.owner[j] === G.owner[i]); return Math.round(sq.p / 10) * (pair ? 2 : 1) * (G.hotel[i] ? 5 : 1); };
  const hasPair = (pi, i) => S.every((s, j) => s.c !== S[i].c || G.owner[j] === pi);
  function gain(p, a) { p.money += a; coin(); }
  function pay(p, a, to) {
    if (a <= 0) return;
    p.money -= a; if (to) to.money += a;
    if (p.money < 0) raise(p);
  }
  // borcu ödemek için mülkleri yarı fiyatına bankaya sat; yetmezse oyundan çık
  function raise(p) {
    const mine = S.map((s, i) => i).filter(i => G.owner[i] === p.i).sort((a, b) => S[a].p - S[b].p);
    while (p.money < 0 && mine.length) {
      const i = mine.shift(); p.money += Math.round(S[i].p / 2) + (G.hotel[i] ? Math.round(S[i].p / 2) : 0);
      G.owner[i] = -1; G.hotel[i] = false;
      note(`${p.n}, ${ek(S[i].nm, "acc")} bankaya sattı.`);
    }
    if (p.money < 0) { p.out = true; p.money = 0; note(`${p.n} iflas etti!`); }
  }
  let notes = [];
  function note(s) { notes.push(s); }
  function setMsg(s) { $("msg").textContent = s; }

  function startTurn() {
    if (G.over) return;
    const alive = G.pl.filter(p => !p.out);
    if (alive.length <= 1) return finish();
    while (P().out) G.turn = (G.turn + 1) % G.pl.length;
    G.phase = "roll"; $("card").hidden = true;
    const p = P();
    render();
    setMsg(`${p.tk} ${p.n}: zar at!`);
    say(`${p.n}, zar at!`);
    if (p.cpu) later(0.8, roll); else actions([{ t: "🎲 Zar at", cls: "primary", f: roll, hint: true }]);
  }
  function roll() {
    if (G.phase !== "roll") return;
    audio(); actions([]);
    const a = 1 + Math.floor(Math.random() * 6), b = 1 + Math.floor(Math.random() * 6);
    G.dice = [a, b]; G.phase = "move";
    renderDice(true); tone(400, 0.05, "square", 0.04);
    const p = P();
    setMsg(`${p.tk} ${p.n}: ${a} + ${b} = ${a + b}`);
    stepMove(p, a + b);
  }
  function stepMove(p, n) {
    if (n <= 0) { later(0.35, () => land(p)); return; }
    later(0.22, () => {
      p.pos = (p.pos + 1) % 20;
      if (p.pos === 0) { gain(p, PASS); note(`${p.n} Başla'dan geçti: +${PASS} ₺`); }
      tone(600 + p.pos * 15, 0.04, "sine", 0.03); render();
      stepMove(p, n - 1);
    });
  }
  function moveTo(p, i, passBonus) {
    if (passBonus && i <= p.pos && i !== p.pos) { gain(p, PASS); note(`${p.n} Başla'dan geçti: +${PASS} ₺`); }
    else if (passBonus && i === 0) { gain(p, PASS); }
    p.pos = i; render();
    if (S[i].k !== "chance") later(0.4, () => land(p, true)); else later(0.4, endTurnSoon);
  }
  function land(p, fromCard) {
    const i = p.pos, sq = S[i];
    flushNotes();
    if (sq.k === "prop") {
      const o = G.owner[i];
      if (o === -1) {
        if (p.money >= sq.p) return offerBuy(p, i);
        setMsg(`${p.n} ${ek(sq.nm, "dat")} geldi ama parası yetmiyor.`); return endTurnSoon();
      }
      if (o === p.i) {
        if (!G.hotel[i] && hasPair(p.i, i) && p.money >= sq.p) return offerHotel(p, i);
        setMsg(`${p.n} kendi yeri ${ek(sq.nm, "loc")} dinleniyor. 😊`); return endTurnSoon();
      }
      const owner = G.pl[o], r = rentOf(i);
      pay(p, r, owner); coin();
      setMsg(`${p.n}, ${sq.nm} için ${ek(owner.n, "dat")} ${r} ₺ kira ödedi.`); say(`${ek(owner.n, "gen")} yeri! ${r} lira kira öde.`);
      return endTurnSoon(1.4);
    }
    if (sq.k === "chance" && !fromCard) return drawCard(p);
    if (sq.k === "tax") { pay(p, sq.amt, null); G.pot += sq.amt; setMsg(`${p.n} ${sq.amt} ₺ vergi ödedi. Para pikniğe gidiyor 🧺`); return endTurnSoon(); }
    if (sq.k === "picnic") { const a = G.pot; G.pot = 0; if (a) gain(p, a); setMsg(a ? `${p.n} piknik sepetini buldu: +${a} ₺! 🧺` : `${p.n} pikniğe geldi, sepet boş.`); say(a ? `Piknik sepeti! ${a} lira kazandın.` : "Piknik zamanı!"); return endTurnSoon(); }
    if (sq.k === "plane") { setMsg(`${p.n} uçağa bindi, Başla'ya uçuyor! ✈️`); say("Uçağa bin, Başla'ya uç!"); later(0.8, () => moveTo(p, 0, true)); return; }
    if (sq.k === "museum") { setMsg(`${p.n} müzeyi geziyor. 🏛️`); return endTurnSoon(); }
    setMsg(`${p.n} Başla'da.`); endTurnSoon();
  }
  function drawCard(p) {
    const c = CARDS[Math.floor(Math.random() * CARDS.length)];
    $("card").innerHTML = `<b>Şans kartı</b>${c.t}`; $("card").hidden = false;
    setMsg(`${p.tk} ${p.n} bir şans kartı çekti.`); say(c.t, p.help && !p.cpu);
    tone(880, 0.12, "triangle", 0.06);
    later(1.4, () => { c.f(p); flushNotes(); render(); if (![4, 5, 6, 7, 10].includes(CARDS.indexOf(c))) endTurnSoon(0.8); });
  }
  function aiWantsBuy(p, i) { const pairBonus = S.some((s, j) => j !== i && s.c === S[i].c && G.owner[j] === p.i); return p.money - S[i].p >= (pairBonus ? 40 : 150); }
  function offerBuy(p, i) {
    const sq = S[i];
    setMsg(`${p.n} ${ek(sq.nm, "dat")} geldi. Fiyatı ${sq.p} ₺. Satın alsın mı?`);
    const good = aiWantsBuy(p, i) || p.money - sq.p >= 100;
    say(`${sq.nm}! Fiyatı ${sq.p} lira. ${good ? "Almak iyi bir fikir!" : "Paran azalır, dikkat!"}`);
    if (p.cpu) { later(0.9, () => (aiWantsBuy(p, i) ? buy(p, i) : skip(p))); return; }
    actions([{ t: `🏠 Satın al (${sq.p} ₺)`, cls: "primary", f: () => buy(p, i), hint: good }, { t: "Geç", f: () => skip(p), hint: !good }]);
  }
  function buy(p, i) { p.money -= S[i].p; G.owner[i] = p.i; coin(); setMsg(`${p.n} ${ek(S[i].nm, "acc")} satın aldı! 🎉`); actions([]); render(); endTurnSoon(); }
  function skip(p) { actions([]); setMsg(`${p.n} almadı.`); endTurnSoon(0.5); }
  function offerHotel(p, i) {
    const sq = S[i];
    setMsg(`${p.n}, ${ek(sq.nm, "dat")} otel kurabilir: ${sq.p} ₺. Kira 5 katına çıkar!`);
    say(`Otel kurabilirsin! ${sq.p} lira.`);
    if (p.cpu) { later(0.9, () => (p.money - sq.p >= 120 ? hotel(p, i) : skip(p))); return; }
    actions([{ t: `🏨 Otel kur (${sq.p} ₺)`, cls: "gold", f: () => hotel(p, i), hint: p.money - sq.p >= 120 }, { t: "Geç", f: () => skip(p) }]);
  }
  function hotel(p, i) { p.money -= S[i].p; G.hotel[i] = true; coin(); tone(523, 0.2); setMsg(`${p.n} ${ek(S[i].nm, "dat")} otel kurdu! 🏨`); actions([]); render(); endTurnSoon(); }
  function flushNotes() { if (notes.length) { setMsg(notes.join(" ")); notes = []; } }
  function endTurnSoon(s = 1) {
    G.phase = "done"; render();
    later(s, () => {
      if (G.over) return;
      G.turn = (G.turn + 1) % G.pl.length;
      if (G.turn === 0) G.round++;
      if (G.round > G.maxRound) return finish();
      startTurn();
    });
  }
  const worth = (p) => p.money + S.reduce((a, s, i) => a + (G.owner[i] === p.i ? s.p + (G.hotel[i] ? s.p : 0) : 0), 0);
  function finish() {
    G.over = true; actions([]); render();
    const ranked = G.pl.slice().sort((a, b) => worth(b) - worth(a));
    const top = worth(ranked[0]), winners = ranked.filter(p => worth(p) === top && !p.out);
    $("over-title").textContent = winners.length > 1 ? `Berabere: ${winners.map(p => p.n).join(" ve ")}!` : `${winners[0].tk} ${winners[0].n} kazandı!`;
    $("results").innerHTML = ranked.map(p => `<div class="${worth(p) === top ? "win" : ""}"><span>${p.tk} ${p.n}${p.out ? " (iflas)" : ""}</span><b>${worth(p)} ₺</b></div>`).join("");
    say($("over-title").textContent, true);
    if (!fast) { [523, 659, 784, 1046].forEach((f, k) => setTimeout(() => tone(f, 0.2), k * 130)); later(0.6, () => { $("over").hidden = false; $("again").focus(); }); }
  }

  /* ---------- çizim ---------- */
  let built = false;
  function buildBoard() {
    const b = $("board");
    S.forEach((sq, i) => {
      const el = document.createElement("div"), [c, r] = POS[i];
      el.className = "cell" + (i % 5 === 0 ? " corner" : ""); el.id = "cell" + i;
      el.style.gridColumn = c; el.style.gridRow = r;
      el.innerHTML = sq.k === "prop"
        ? `<div class="band" style="background:${COLORS[sq.c]}"></div><div class="nm">${sq.nm}</div><div class="pr">${sq.p} ₺</div><span class="own" hidden></span><span class="hotel" hidden>🏨</span><div class="toks"></div>`
        : `<div></div><div class="ic">${sq.ic}</div><div class="nm">${sq.nm}</div><div class="toks"></div>`;
      el.setAttribute("aria-label", sq.nm);
      b.appendChild(el);
    });
    built = true;
  }
  const PCOL = ["#3D8BFD", "#FF7A2F", "#9B5DE5", "#2E9F5A", "#E5484D", "#1CC7B1"];
  function render() {
    if (fast || !G) return;
    if (!built) buildBoard();
    S.forEach((sq, i) => {
      const el = $("cell" + i);
      el.classList.toggle("here", !G.over && P().pos === i);
      el.querySelector(".toks").innerHTML = G.pl.filter(p => !p.out && p.pos === i).map(p => `<span title="${p.n}">${p.tk}</span>`).join("");
      if (sq.k === "prop") {
        const o = el.querySelector(".own"), h = el.querySelector(".hotel");
        o.hidden = G.owner[i] < 0; if (G.owner[i] >= 0) o.style.background = PCOL[G.owner[i]];
        h.hidden = !G.hotel[i];
      }
    });
    $("players").innerHTML = G.pl.map((p, i) => `<div class="pl${i === G.turn && !G.over ? " cur" : ""}${p.out ? " out" : ""}"><span class="tk" style="text-shadow:0 0 0 ${PCOL[i]}">${p.tk}</span><span style="color:${PCOL[i]}">●</span>${p.n}${p.cpu ? " 🤖" : ""}<span class="m">${p.money} ₺</span></div>`).join("");
    $("round").textContent = `Tur ${Math.min(G.round, G.maxRound)}/${G.maxRound} · Piknik sepeti: ${G.pot} ₺`;
    renderDice(false);
  }
  const FACES = ["⚀", "⚁", "⚂", "⚃", "⚄", "⚅"];
  function renderDice(anim) { $("dice").innerHTML = G.dice.map(d => `<span class="die${anim ? " roll" : ""}">${FACES[d - 1]}</span>`).join(""); }
  function actions(list) {
    if (fast) return;
    const box = $("actions"); box.innerHTML = "";
    const p = G && P();
    list.forEach(a => { const b = document.createElement("button"); b.type = "button"; b.className = "btn " + (a.cls || "") + (a.hint && p && p.help ? " hint" : ""); b.textContent = a.t; b.addEventListener("click", () => { audio(); a.f(); }); box.appendChild(b); });
    if (list.length) setTimeout(() => box.querySelector("button")?.focus(), 30);
  }

  /* ---------- kurulum ---------- */
  const form = $("setup-form");
  function buildRows() {
    const n = +form.count.value, box = $("rows");
    const old = [...box.querySelectorAll(".p-row")].map(r => ({ n: r.querySelector("input[type=text]").value, cpu: r.querySelector(".cpu").checked, help: r.querySelector(".help").checked }));
    box.innerHTML = "";
    for (let i = 0; i < n; i++) {
      const src = old[i] || DEF[i], row = document.createElement("div"); row.className = "p-row";
      row.innerHTML = `<span class="tk">${TOKENS[i]}</span><input type="text" maxlength="12" aria-label="${i + 1}. oyuncunun adı" placeholder="Oyuncu ${i + 1}">
        <label class="toggle" title="Bilgisayar oynasın"><input type="checkbox" class="cpu"> 🤖</label><label class="toggle" title="Yardım"><input type="checkbox" class="help"> ✨</label>`;
      row.querySelector("input[type=text]").value = src.n; row.querySelector(".cpu").checked = src.cpu; row.querySelector(".help").checked = src.help;
      box.appendChild(row);
    }
  }
  form.addEventListener("change", (e) => { if (e.target.name === "count") buildRows(); });
  form.addEventListener("submit", (e) => {
    e.preventDefault(); audio(); pickVoice();
    const players = [...$("rows").querySelectorAll(".p-row")].map((r, i) => ({ name: r.querySelector("input[type=text]").value.trim() || (r.querySelector(".cpu").checked ? ["Robi", "Zeki", "Bilge", "Pırıl", "Tonton", "Minik"][i] : ["Mavi", "Turuncu", "Mor", "Yeşil", "Kırmızı", "Turkuaz"][i]), cpu: r.querySelector(".cpu").checked, help: r.querySelector(".help").checked }));
    const cfg = { players, len: +form.len.value };
    try { localStorage.setItem(SAVE_KEY, JSON.stringify({ count: players.length, len: cfg.len })); } catch (_) {}
    newGame(cfg);
  });
  try { const s = JSON.parse(localStorage.getItem(SAVE_KEY) || "null"); if (s) { form.count.value = String(s.count); form.len.value = String(s.len); } } catch (_) {}
  buildRows();
  $("settings").addEventListener("click", () => { timers.forEach(clearTimeout); timers = []; $("over").hidden = true; $("setup").hidden = false; });
  $("again").addEventListener("click", () => newGame(CFG));
  $("to-setup").addEventListener("click", () => { $("over").hidden = true; $("setup").hidden = false; });
  // arka planda boş tahta
  G = { pl: [], owner: new Array(20).fill(-1), hotel: new Array(20).fill(false), turn: 0, round: 1, maxRound: 18, pot: 0, dice: [1, 1], over: true };
  buildBoard(); renderDice(false);

  // test kancası
  window.__tt = { S, get G() { return G; }, newGame, drain, setFast: (f) => { fast = f; }, worth, rentOf, ek };
})();
