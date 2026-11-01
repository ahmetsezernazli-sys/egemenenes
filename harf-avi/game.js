/* Harf Avı — aile kelime oyunu: gizli kelimeyi sırayla harf seçerek bul */
(() => {
  "use strict";
  const $ = (id) => document.getElementById(id);
  const SAVE_KEY = "harf-avi";
  const ABC = "ABCÇDEFGĞHIİJKLMNOÖPRSŞTUÜVYZ".split("");
  const FREQ = "AEİNRLIKDMYUTSBOÜŞZGÇHĞVCÖPFJ";   // Türkçede harf sıklığı (yaklaşık)
  const TOKENS = ["🦊", "🐼", "🐸", "🦁", "🐧", "🐙"];
  const DEF = [{ n: "Enes", cpu: false, help: false }, { n: "Egemen", cpu: false, help: true }, { n: "Anne", cpu: false, help: false }, { n: "Baba", cpu: false, help: false }, { n: "", cpu: true, help: false }, { n: "", cpu: true, help: false }];
  const BCOL = ["#FF6B6B", "#FFB547", "#FFE14D", "#6BD48A", "#4CC9F0", "#7B8CFF", "#C77DFF", "#FF8FB1"];

  // kategoriler: kolay (kısa, bilinen) ve zor kelimeler
  const CATS = [
    { ad: "Hayvanlar", ic: "🐾",
      k: ["KEDİ", "KÖPEK", "AYI", "ASLAN", "İNEK", "KOYUN", "BALIK", "KUŞ", "TAVŞAN", "ÖRDEK", "FİL", "ARI", "KAZ", "TİLKİ", "KURT", "FARE", "KEÇİ", "MAYMUN", "ZEBRA", "TAVUK"],
      z: ["ZÜRAFA", "PENGUEN", "TİMSAH", "KAPLUMBAĞA", "KANGURU", "YUNUS", "BAYKUŞ", "KARINCA", "KELEBEK", "SİNCAP", "PAPAĞAN", "DEVEKUŞU", "KİRPİ", "GERGEDAN", "AHTAPOT", "LEOPAR", "FLAMİNGO", "ÇEKİRGE", "ÖRÜMCEK", "YENGEÇ"] },
    { ad: "Meyve ve sebze", ic: "🍎",
      k: ["ELMA", "ARMUT", "MUZ", "ÜZÜM", "ÇİLEK", "KİRAZ", "ERİK", "NAR", "KAVUN", "LİMON", "HAVUÇ", "BİBER", "SOĞAN", "MISIR", "PATATES", "DOMATES", "İNCİR", "AYVA"],
      z: ["KARPUZ", "PORTAKAL", "MANDALİNA", "ŞEFTALİ", "KAYISI", "ANANAS", "BROKOLİ", "PATLICAN", "SALATALIK", "ISPANAK", "KABAK", "MANTAR", "ENGİNAR", "BEZELYE", "PIRASA", "KARNABAHAR", "MARUL", "AHUDUDU"] },
    { ad: "Evdeki eşyalar", ic: "🏠",
      k: ["MASA", "KAPI", "TOP", "SAAT", "KALEM", "KİTAP", "YATAK", "LAMBA", "BARDAK", "KAŞIK", "TABAK", "ÇANTA", "AYNA", "HALI", "PERDE", "SANDALYE"],
      z: ["BUZDOLABI", "TELEVİZYON", "ŞEMSİYE", "MAKAS", "TENCERE", "YASTIK", "BATTANİYE", "BİLGİSAYAR", "KUMANDA", "SÜPÜRGE", "DOLAP", "ÇEKMECE", "MERDİVEN", "ANAHTAR", "TERMOMETRE", "ÇAMAŞIR"] },
    { ad: "Yiyecekler", ic: "🍽️",
      k: ["EKMEK", "SÜT", "ÇORBA", "PİLAV", "PEYNİR", "YUMURTA", "BAL", "ÇAY", "KEK", "PİZZA", "MAKARNA", "SİMİT", "AYRAN", "DONDURMA"],
      z: ["KÖFTE", "BAKLAVA", "MANTI", "LAHMACUN", "BÖREK", "DOLMA", "KUMPİR", "SUCUK", "MENEMEN", "PİŞMANİYE", "LOKUM", "AŞURE", "GÖZLEME", "KÜNEFE", "HELVA", "KURABİYE"] },
    { ad: "Şehirler", ic: "🏙️",
      k: ["İZMİR", "ANKARA", "BURSA", "RİZE", "VAN", "MUŞ", "SİVAS", "ORDU", "KARS", "BOLU", "MUĞLA", "ADANA"],
      z: ["İSTANBUL", "ANTALYA", "TRABZON", "ESKİŞEHİR", "GAZİANTEP", "ERZURUM", "DİYARBAKIR", "KAYSERİ", "SAMSUN", "MALATYA", "KASTAMONU", "ÇANAKKALE", "EDİRNE", "NEVŞEHİR", "ŞANLIURFA", "KONYA"] },
    { ad: "Meslekler", ic: "👷",
      k: ["DOKTOR", "AŞÇI", "POLİS", "ÖĞRETMEN", "PİLOT", "ÇİFTÇİ", "BERBER", "TERZİ", "FIRINCI", "BALIKÇI"],
      z: ["İTFAİYECİ", "HEMŞİRE", "MÜHENDİS", "ASTRONOT", "VETERİNER", "MİMAR", "AVUKAT", "RESSAM", "MARANGOZ", "KAPTAN", "GAZETECİ", "ECZACI", "POSTACI", "BAHÇIVAN"] },
    { ad: "Spor", ic: "⚽",
      k: ["FUTBOL", "YÜZME", "GÜREŞ", "KOŞU", "TENİS", "KAYAK", "BOKS", "KARATE", "PATEN"],
      z: ["BASKETBOL", "VOLEYBOL", "HENTBOL", "JİMNASTİK", "BİSİKLET", "OKÇULUK", "MARATON", "SÖRF", "KÜREK", "ESKRİM", "HALTER", "TEKVANDO", "BİLARDO"] },
    { ad: "Doğa", ic: "🌳",
      k: ["AĞAÇ", "ÇİÇEK", "DENİZ", "GÖL", "DAĞ", "BULUT", "GÜNEŞ", "YILDIZ", "YAĞMUR", "KAR", "RÜZGAR", "TOPRAK", "NEHİR"],
      z: ["GÖKKUŞAĞI", "ŞELALE", "VOLKAN", "ORMAN", "ÇÖL", "MAĞARA", "YILDIRIM", "DEPREM", "BUZDAĞI", "KASIRGA", "OKYANUS", "PAPATYA", "LALE", "YANARDAĞ"] }
  ];

  /* ---------- ses ---------- */
  let AC = null;
  function audio() { try { AC = AC || new (window.AudioContext || window.webkitAudioContext)(); if (AC.state === "suspended") AC.resume(); } catch (e) {} }
  function tone(f, d = 0.1, type = "triangle", vol = 0.06, slide = 0, delay = 0) {
    if (!AC || fast) return;
    const t = AC.currentTime + delay, o = AC.createOscillator(), g = AC.createGain();
    o.type = type; o.frequency.setValueAtTime(f, t); if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(30, f + slide), t + d);
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + 0.01); g.gain.exponentialRampToValueAtTime(0.0001, t + d);
    o.connect(g).connect(AC.destination); o.start(t); o.stop(t + d + 0.02);
  }
  const SND = {
    ok: (n) => { for (let i = 0; i < n; i++) tone(660 + i * 120, 0.12, "triangle", 0.07, 0, i * 0.1); },
    pop: () => { tone(900, 0.08, "square", 0.05, -700); },
    solve: () => [523, 659, 784, 1047, 1319].forEach((f, i) => tone(f, 0.22, "triangle", 0.08, 0, i * 0.1)),
    lose: () => [392, 330, 262].forEach((f, i) => tone(f, 0.25, "sine", 0.07, 0, i * 0.15)),
  };
  const canSpeak = "speechSynthesis" in window;
  let trVoice = null;
  function pickVoice() { if (canSpeak) trVoice = speechSynthesis.getVoices().find(v => /^tr(-|_|$)/i.test(v.lang)) || null; }
  if (canSpeak) { pickVoice(); if (speechSynthesis.addEventListener) speechSynthesis.addEventListener("voiceschanged", pickVoice); }
  function say(t) {
    if (!canSpeak || !trVoice || fast) return;
    speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(t); u.voice = trVoice; u.lang = trVoice.lang; u.rate = 1; speechSynthesis.speak(u);
  }

  /* ---------- durum ---------- */
  let G = null, CFG = null, fast = false, timers = [], Q = [];
  const later = (ms, fn) => { if (fast) Q.push(fn); else timers.push(setTimeout(fn, ms)); };
  function drain() { let n = 0; while (Q.length && n++ < 100000) Q.shift()(); }
  const lower = (s) => s.toLocaleLowerCase("tr-TR");

  function pool() {
    const out = [];
    for (const c of CATS) {
      const list = CFG.lvl === 0 ? c.k : CFG.lvl === 2 ? c.z : c.k.concat(c.z);
      for (const w of list) out.push({ w, c });
    }
    return out;
  }
  function newGame(cfg) {
    CFG = cfg;
    timers.forEach(clearTimeout); timers = []; Q = [];
    const words = pool().sort(() => Math.random() - 0.5);
    G = { pl: cfg.players.map((p, i) => ({ i, n: p.name, cpu: p.cpu, help: p.help, tk: TOKENS[i], sc: 0 })),
      words, wi: -1, turn: 0, starter: -1, over: false };
    $("setup").hidden = true; $("over").hidden = true;
    nextWord();
  }
  function nextWord() {
    G.wi++;
    if (G.wi >= CFG.len) return finish();
    const { w, c } = G.words[G.wi % G.words.length];
    G.word = w; G.cat = c; G.used = new Set(); G.wrong = 0; G.maxWrong = CFG.lvl === 0 ? 8 : 7; G.done = false;
    G.starter = (G.starter + 1) % G.pl.length; G.turn = G.starter;
    G.hint = null;
    render(true);
    const p = G.pl[G.turn];
    setMsg(`${G.wi + 1}. kelime: ${c.ad}. ${p.n} başlıyor.`);
    say(`${c.ad}. ${G.word.length} harfli bir kelime. Sıra ${p.n}'de.`.replace(/'de\./, sfx(p.n)));
    startTurn();
  }
  // Türkçe -de/-da eki (kesmeli)
  function sfx(name) {
    const l = lower(name), v = (l.match(/[aıoueiöü]/g) || ["e"]).pop(), back = "aıou".includes(v);
    const hard = "fstkçşhp".includes(l.slice(-1));
    return `'${hard ? (back ? "ta" : "te") : (back ? "da" : "de")}.`;
  }
  const hidden = () => [...new Set(G.word.split(""))].filter(ch => !G.used.has(ch));
  function startTurn() {
    if (G.over || G.done) return;
    const p = G.pl[G.turn];
    G.hint = null;
    if (p.help && !p.cpu) {
      // 2 doğru (varsa) + 2 yanlış harf parlar
      const good = hidden().sort(() => Math.random() - 0.5).slice(0, 2);
      const bad = ABC.filter(ch => !G.used.has(ch) && !G.word.includes(ch)).sort(() => Math.random() - 0.5).slice(0, 4 - good.length);
      G.hint = new Set(good.concat(bad));
    }
    render();
    if (p.cpu) later(900, () => guess(cpuPick(p)));
  }
  function cpuPick() {
    const pattern = G.word.split("").map(ch => G.used.has(ch) ? ch : null);
    const wrong = [...G.used].filter(ch => !G.word.includes(ch));
    const cands = G.cat.k.concat(G.cat.z).filter(w => w.length === G.word.length &&
      w.split("").every((ch, i) => pattern[i] ? ch === pattern[i] : !G.used.has(ch)) && !wrong.some(ch => w.includes(ch)));
    if (cands.length && Math.random() < 0.8) {
      const cnt = {};
      for (const w of cands) for (const ch of new Set(w)) if (!G.used.has(ch)) cnt[ch] = (cnt[ch] || 0) + 1;
      const best = Object.entries(cnt).sort((a, b) => b[1] - a[1]);
      if (best.length) return best[0][0];
    }
    return FREQ.split("").find(ch => !G.used.has(ch) && Math.random() < 0.7) || FREQ.split("").find(ch => !G.used.has(ch));
  }
  function guess(ch) {
    if (!G || G.over || G.done || G.used.has(ch) || !ABC.includes(ch)) return false;
    const p = G.pl[G.turn];
    G.used.add(ch); G.hint = null;
    const n = G.word.split("").filter(x => x === ch).length;
    if (n) {
      p.sc += 10 * n; SND.ok(n);
      if (!hidden().length) {
        p.sc += 30; G.done = true; SND.solve();
        setMsg(`🎉 ${p.n} kelimeyi buldu: ${G.word}! (+${10 * n + 30})`);
        say(`Aferin ${p.n}! Kelime ${lower(G.word)}.`);
        render(); later(2600, nextWord); return true;
      }
      setMsg(`✔ ${ch} var${n > 1 ? ` (${n} tane)` : ""}! +${10 * n} · ${p.n} devam ediyor.`);
      say(`${lower(ch)} var! Devam et.`);
      render(); startTurn(); return true;
    }
    G.wrong++; SND.pop();
    if (G.wrong >= G.maxWrong) {
      G.done = true; SND.lose();
      setMsg(`💥 Balonlar bitti! Kelime: ${G.word}`);
      say(`Balonlar bitti. Kelime ${lower(G.word)} idi.`);
      render(); later(2800, nextWord); return true;
    }
    G.turn = (G.turn + 1) % G.pl.length;
    const nx = G.pl[G.turn];
    setMsg(`✘ ${ch} yok. Bir balon patladı. Sıra ${nx.n}${sfx(nx.n).slice(0, -1)}.`);
    say(`${lower(ch)} yok. Sıra ${nx.n}${sfx(nx.n)}`);
    render(); startTurn(); return true;
  }
  function finish() {
    G.over = true;
    const sorted = [...G.pl].sort((a, b) => b.sc - a.sc), top = sorted[0].sc;
    const winners = sorted.filter(p => p.sc === top);
    $("over-title").textContent = winners.length > 1 ? `Berabere: ${winners.map(p => p.n).join(" ve ")}!` : `${winners[0].n} kazandı!`;
    $("results").innerHTML = "";
    for (const p of sorted) {
      const d = document.createElement("div"); if (p.sc === top) d.className = "win";
      d.innerHTML = `<span>${p.tk} ${escapeHtml(p.n)}</span><b>${p.sc} puan</b>`;
      $("results").appendChild(d);
    }
    if (!fast) { SND.solve(); say($("over-title").textContent); }
    $("over").hidden = false;
  }
  const escapeHtml = (s) => s.replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

  /* ---------- çizim ---------- */
  function setMsg(t) { $("msg").textContent = t; }
  function render(fresh) {
    if (!G || fast) return;
    const pls = $("players"); pls.innerHTML = "";
    G.pl.forEach((p, i) => {
      const d = document.createElement("div"); d.className = "pl" + (i === G.turn && !G.done ? " cur" : "");
      d.innerHTML = `<span aria-hidden="true">${p.tk}</span>${escapeHtml(p.n)}${p.cpu ? " 🤖" : ""} <span class="sc">${p.sc}</span>`;
      pls.appendChild(d);
    });
    $("cat").innerHTML = `<span class="ic" aria-hidden="true">${G.cat.ic}</span>${G.cat.ad} · ${G.word.length} harf`;
    const wd = $("word");
    if (fresh) { wd.innerHTML = ""; for (let i = 0; i < G.word.length; i++) { const t = document.createElement("div"); t.className = "tile"; wd.appendChild(t); } }
    [...wd.children].forEach((t, i) => {
      const ch = G.word[i], open = G.used.has(ch);
      if (open && !t.classList.contains("open")) { t.className = "tile open"; t.textContent = ch; }
      else if (!open && G.done) { t.className = "tile lost"; t.textContent = ch; }
      else if (!open) { t.className = "tile"; t.textContent = ""; }
    });
    wd.setAttribute("aria-label", G.word.split("").map(ch => G.used.has(ch) || G.done ? ch : "boş").join(" "));
    const bl = $("balloons");
    if (fresh || bl.children.length !== G.maxWrong) {
      bl.innerHTML = "";
      for (let i = 0; i < G.maxWrong; i++) { const b = document.createElement("div"); b.className = "bl"; b.style.setProperty("--c", BCOL[i % BCOL.length]); b.innerHTML = "<i></i><b></b>"; bl.appendChild(b); }
    }
    [...bl.children].forEach((b, i) => {
      const gone = i >= G.maxWrong - G.wrong;
      if (gone && !b.classList.contains("gone")) { b.classList.add("pop"); setTimeout(() => { b.classList.remove("pop"); b.classList.add("gone"); }, 350); }
    });
    bl.setAttribute("aria-label", `${G.maxWrong - G.wrong} balon kaldı`);
    const p = G.pl[G.turn], canPlay = !G.done && !p.cpu;
    $("keys").classList.toggle("wait", !canPlay);
    [...$("keys").children].forEach(k => {
      const ch = k.dataset.ch, used = G.used.has(ch);
      k.className = "key" + (used ? (G.word.includes(ch) ? " ok" : " no") : "") + (G.hint && G.hint.has(ch) ? " glow" : "");
      k.disabled = used || !canPlay;
    });
  }
  // klavye düğmeleri
  for (const ch of ABC) {
    const b = document.createElement("button"); b.type = "button"; b.className = "key"; b.textContent = ch; b.dataset.ch = ch;
    b.setAttribute("aria-label", ch + " harfi");
    b.addEventListener("click", () => { audio(); if (G && !G.pl[G.turn].cpu) guess(ch); });
    $("keys").appendChild(b);
  }
  document.addEventListener("keydown", (e) => {
    if (!G || G.over || !$("setup").hidden || e.ctrlKey || e.metaKey || e.altKey || e.key.length !== 1) return;
    const ch = e.key.toLocaleUpperCase("tr-TR");
    if (!ABC.includes(ch) || G.pl[G.turn].cpu) return;
    audio(); guess(ch);
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
    const cfg = { players, lvl: +form.lvl.value, len: +form.len.value };
    try { localStorage.setItem(SAVE_KEY, JSON.stringify({ count: players.length, lvl: cfg.lvl, len: cfg.len })); } catch (_) {}
    newGame(cfg);
  });
  try { const s = JSON.parse(localStorage.getItem(SAVE_KEY) || "null"); if (s) { form.count.value = String(s.count); form.lvl.value = String(s.lvl); form.len.value = String(s.len); } } catch (_) {}
  buildRows();
  $("settings").addEventListener("click", () => { timers.forEach(clearTimeout); timers = []; if (canSpeak) speechSynthesis.cancel(); $("over").hidden = true; $("setup").hidden = false; });
  $("again").addEventListener("click", () => newGame(CFG));
  $("to-setup").addEventListener("click", () => { $("over").hidden = true; $("setup").hidden = false; });

  // test kancası
  window.__ha = { CATS, ABC, newGame, guess, drain, setFast: (f) => { fast = f; }, get G() { return G; }, cpuPick, render, sfx };
})();
