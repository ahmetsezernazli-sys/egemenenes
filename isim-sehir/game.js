/* İsim Şehir Hayvan — aile kelime oyunu (kâğıt kalemle, site oyun yöneticisi) */
(() => {
  "use strict";
  const $ = (id) => document.getElementById(id);
  const SAVE_KEY = "isim-sehir";
  const TOKENS = ["🦊", "🐼", "🐸", "🦁", "🐧", "🐙"];
  const DEF = ["Enes", "Egemen", "Anne", "Baba", "", ""];
  const EASY = "ABÇDEGHİKMOPSTY";
  const ALL = "ABCÇDEFGHIİKLMNOÖPRSŞTUÜVYZ";

  // örnek cevaplar: harf:kelime,kelime|...
  const RAW = {
    "İsim": "A:Ahmet,Ayşe|B:Burak,Büşra|C:Cem,Ceren|Ç:Çağla,Çetin|D:Deniz,Duygu|E:Elif,Emre|F:Fatma,Furkan|G:Gül,Gökhan|H:Hasan,Hande|I:Işıl,Irmak|İ:İrem,İsmail|K:Kerem,Kübra|L:Leyla,Levent|M:Mehmet,Merve|N:Nur,Nihat|O:Oğuz,Oya|Ö:Ömer,Özge|P:Pınar,Polat|R:Rabia,Rıza|S:Selin,Serkan|Ş:Şule,Şahin|T:Tolga,Tuba|U:Umut,Ufuk|Ü:Ümit,Ülkü|V:Volkan,Vildan|Y:Yusuf,Yasemin|Z:Zeynep,Zafer",
    "Şehir": "A:Ankara,Antalya|B:Bursa,Bolu|C:Cenevre,Cidde|Ç:Çanakkale,Çorum|D:Denizli,Diyarbakır|E:Edirne,Erzurum|F:Frankfurt,Floransa|G:Giresun,Gaziantep|H:Hatay,Hamburg|I:Isparta,Iğdır|İ:İzmir,İstanbul|K:Konya,Kars|L:Londra,Lizbon|M:Mersin,Manisa|N:Niğde,Nevşehir|O:Ordu,Osmaniye|Ö:Ödemiş|P:Paris,Prag|R:Rize,Roma|S:Samsun,Sivas|Ş:Şanlıurfa,Şırnak|T:Trabzon,Tokat|U:Uşak|Ü:Ürgüp,Üsküdar|V:Van,Viyana|Y:Yozgat,Yalova|Z:Zonguldak",
    "Hayvan": "A:Arı,Aslan|B:Balık,Baykuş|C:Ceylan,Civciv|Ç:Çita,Çekirge|D:Deve,Dana|E:Eşek,Engerek|F:Fil,Fare|G:Geyik,Goril|H:Horoz,Hamster|I:Istakoz|İ:İnek,İguana|K:Kedi,Kartal|L:Leopar,Leylek|M:Maymun,Martı|N:Narval|O:Orangutan|Ö:Ördek,Örümcek|P:Panda,Penguen|R:Rakun,Ren geyiği|S:Sincap,Serçe|Ş:Şempanze|T:Tavşan,Tilki|U:Uğur böceği,Uskumru|Ü:Üveyik|V:Vaşak,Vatoz|Y:Yılan,Yunus|Z:Zürafa,Zebra",
    "Bitki": "A:Ayçiçeği,Ardıç|B:Begonya,Buğday|C:Ceviz|Ç:Çam,Çınar|D:Defne,Dut|E:Erik,Ebegümeci|F:Fesleğen,Fındık|G:Gül,Gelincik|H:Hanımeli,Havuç|I:Ihlamur,Isırgan|İ:İncir,İğde|K:Kaktüs,Kavak|L:Lale,Lavanta|M:Menekşe,Maydanoz|N:Nane,Nergis|O:Orkide|Ö:Ökse otu|P:Papatya,Pamuk|R:Reyhan|S:Sarmaşık,Söğüt|Ş:Şeftali|T:Tere,Turp|U:Unutmabeni|Ü:Üzüm|V:Vişne,Vanilya|Y:Yonca,Yasemin|Z:Zambak,Zeytin",
    "Eşya": "A:Ayna,Anahtar|B:Bardak,Battaniye|C:Cetvel,Cüzdan|Ç:Çanta,Çatal|D:Dolap,Defter|E:Eldiven,Etek|F:Fincan,Fırça|G:Gözlük,Gitar|H:Halı,Havlu|I:Izgara|İ:İğne,İp|K:Kalem,Kaşık|L:Lamba,Leğen|M:Masa,Makas|N:Nevresim|O:Oyuncak,Ocak|Ö:Önlük,Örtü|P:Perde,Priz|R:Radyo,Raf|S:Sandalye,Saat|Ş:Şemsiye,Şapka|T:Tabak,Telefon|U:Uçurtma|Ü:Ütü|V:Vazo,Valiz|Y:Yastık,Yorgan|Z:Zil,Zarf",
    "Yiyecek": "A:Ayran,Armut|B:Börek,Baklava|C:Cacık|Ç:Çorba,Çilek|D:Dondurma,Dolma|E:Ekmek,Elma|F:Fasulye,Fındık|G:Gözleme,Gofret|H:Helva,Havuç|I:Ispanak|İ:İncir,İrmik helvası|K:Kebap,Köfte|L:Lahmacun,Limon|M:Mantı,Makarna|N:Nohut,Nar|O:Omlet|Ö:Örgü peyniri|P:Pide,Peynir|R:Reçel,Revani|S:Simit,Sucuk|Ş:Şekerpare,Şeftali|T:Tost,Tavuk|U:Un helvası|Ü:Üzüm|V:Vişne|Y:Yoğurt,Yumurta|Z:Zeytin,Zerde",
    "Ülke": "A:Almanya,Azerbaycan|B:Brezilya,Belçika|C:Cezayir|Ç:Çin,Çad|D:Danimarka|E:Ekvador,Endonezya|F:Fransa,Finlandiya|G:Gürcistan,Gana|H:Hollanda,Hindistan|I:Irak|İ:İtalya,İspanya|K:Kanada,Kenya|L:Lübnan,Letonya|M:Mısır,Meksika|N:Norveç,Nijerya|Ö:Özbekistan|P:Pakistan,Portekiz|R:Rusya,Romanya|S:Suriye,Sırbistan|Ş:Şili|T:Türkiye,Tayland|U:Ukrayna,Uganda|Ü:Ürdün|V:Vietnam,Venezuela|Y:Yunanistan,Yemen|Z:Zambiya,Zimbabve",
    "Meslek": "A:Aşçı,Avukat|B:Bahçıvan,Berber|C:Cerrah|Ç:Çiftçi,Çoban|D:Doktor,Dişçi|E:Eczacı|F:Fırıncı,Fotoğrafçı|G:Gazeteci,Garson|H:Hemşire,Hakem|İ:İtfaiyeci|K:Kaptan,Kasap|L:Lokantacı|M:Mühendis,Marangoz|N:Nalbant|O:Oyuncu,Oduncu|Ö:Öğretmen|P:Pilot,Polis|R:Ressam,Rehber|S:Satıcı,Sanatçı|Ş:Şoför,Şef|T:Terzi,Tamirci|U:Uçuş görevlisi|Ü:Ütücü|V:Veteriner,Vali|Y:Yazar,Yüzücü|Z:Zabıta"
  };
  const CATS = Object.keys(RAW);
  const ICON = { "İsim": "🙂", "Şehir": "🏙️", "Hayvan": "🐾", "Bitki": "🌿", "Eşya": "🛋️", "Yiyecek": "🍎", "Ülke": "🌍", "Meslek": "👩‍🚒" };
  const EX = {};
  for (const c of CATS) { EX[c] = {}; for (const part of RAW[c].split("|")) { const [l, w] = part.split(":"); EX[c][l] = w.split(","); } }

  /* ---------- ses ---------- */
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

  const esc = (s) => s.replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  const lower = (s) => s.toLocaleLowerCase("tr-TR");

  /* ---------- durum ---------- */
  let CFG = null, G = null, tick = null, spinT = null;
  // işaret: 0 boş, 1 tek (10), 2 aynı (5)
  function newGame(cfg) {
    CFG = cfg; clearInterval(tick); clearInterval(spinT);
    G = { round: 0, total: cfg.players.map(() => 0), used: [], phase: "", letter: "", marks: null, hints: 0 };
    $("setup").hidden = true; $("over").hidden = true;
    nextRound();
  }
  function nextRound() {
    G.round++; G.phase = "spin"; G.hints = 0;
    const pool = [...(CFG.letters === "all" ? ALL : EASY)].filter(l => !G.used.includes(l));
    G.letter = pool[Math.floor(Math.random() * pool.length)]; G.used.push(G.letter);
    G.marks = CFG.players.map(() => CFG.cats.map(() => 0));
    renderPlayers();
    $("table").innerHTML = `
      <p class="prompt">Tur ${G.round}/${CFG.rounds}: kâğıtlarınıza kategorileri yazın, harf geliyor…</p>
      <div class="wheel spin" id="wheel"><b id="wl">A</b></div>
      <div class="chips">${CFG.cats.map(c => `<span>${ICON[c]} ${c}</span>`).join("")}</div>`;
    let k = 0; const src = CFG.letters === "all" ? ALL : EASY;
    spinT = setInterval(() => { $("wl").textContent = src[k++ % src.length]; snd(500 + (k % 5) * 60, 0.03, "square", 0.02); }, 90);
    setTimeout(land, 1800);
  }
  function land() {
    clearInterval(spinT);
    if (!G || G.phase !== "spin") return;
    $("wl").textContent = G.letter;
    const w = $("wheel"); w.classList.remove("spin"); w.classList.add("land");
    [523, 784].forEach((f, i) => snd(f, 0.18, "triangle", 0.07, i * 0.1));
    say(`Harfimiz ${G.letter}! Kalemler hazır, başla!`);
    setTimeout(startWriting, 900);
  }
  function startWriting() {
    if (!G || G.phase !== "spin") return;
    G.phase = "write"; G.t0 = performance.now();
    const kids = CFG.players.map((p, i) => CFG.help[i] ? i : -1).filter(i => i >= 0);
    $("table").innerHTML = `
      <div class="wheel"><b>${G.letter}</b></div>
      <p class="prompt"><b>${G.letter}</b> harfiyle başlayan: ${CFG.cats.join(", ")}</p>
      ${CFG.len ? `<p class="clock" id="clock">${CFG.len}</p><div class="tbar"><i id="tb"></i></div>` : ""}
      <button class="btn stop" id="stop" type="button">STOP!</button>
      ${kids.length ? `<div class="row-b"><button class="btn" id="hintb" type="button">💡 Küçüklere ipucu</button></div><p class="hint" id="hint" hidden></p>` : ""}`;
    $("stop").addEventListener("click", () => { audio(); stop(true); });
    if (kids.length) $("hintb").addEventListener("click", () => { audio(); hint(); });
    if (CFG.len) tick = setInterval(() => {
      const left = Math.max(0, CFG.len - (performance.now() - G.t0) / 1000), c = $("clock");
      if (!c) return;
      c.textContent = Math.ceil(left); $("tb").style.width = (left / CFG.len * 100) + "%";
      if (left <= 10 && !c.classList.contains("warn")) { c.classList.add("warn"); say("Son on saniye!"); }
      if (left <= 10) snd(880, 0.04, "sine", 0.03);
      if (left <= 0) stop(false);
    }, 1000);
  }
  function hint() {
    const ok = CFG.cats.filter(c => (EX[c][G.letter] || []).length);
    if (!ok.length) { $("hint").hidden = false; $("hint").textContent = "Bu harf için ipucum yok, birlikte düşünün!"; return; }
    const c = ok[G.hints++ % ok.length], w = EX[c][G.letter];
    $("hint").hidden = false;
    $("hint").textContent = `${ICON[c]} ${c}: ${w[0].charAt(0)}${"_".repeat(Math.max(2, w[0].length - 1))} (${w[0].length} harf)`;
    say(`${c} için ipucu: ${w[0].length} harfli, ${w[0].charAt(0)} ile başlıyor.`);
  }
  function stop(byPlayer) {
    if (!G || G.phase !== "write") return false;
    clearInterval(tick); G.phase = "score";
    [880, 660, 440].forEach((f, i) => snd(f, 0.14, "square", 0.05, i * 0.1));
    say(byPlayer ? "STOP! Kalemler bırakılsın." : "Süre bitti! Kalemler bırakılsın.");
    renderScore();
    return true;
  }
  // puanlar: tek 10, aynı 5, kategoride yalnız cevap veren 20; ✨ oyuncuda "aynı" da 10
  function roundPoints() {
    const pts = CFG.players.map(() => 0);
    CFG.cats.forEach((c, j) => {
      const filled = G.marks.map(m => m[j]).filter(v => v > 0).length;
      G.marks.forEach((m, i) => {
        const v = m[j]; if (!v) return;
        if (filled === 1) pts[i] += 20;
        else pts[i] += v === 1 || CFG.help[i] ? 10 : 5;
      });
    });
    return pts;
  }
  function renderScore() {
    const pts = roundPoints();
    const lab = ["—", "Tek", "Aynı"];
    $("table").innerHTML = `
      <p class="prompt">Harf <b>${G.letter}</b>: herkes cevabını okusun, tabloya dokunarak işaretleyin.</p>
      <div class="legend"><span><i></i>— yazmadı / yanlış</span><span><i class="s1"></i>Tek: 10</span><span><i class="s2"></i>Aynı: 5</span><span>Kategoride tek cevap: 20</span></div>
      <div class="grid-wrap"><table class="sgrid">
        <thead><tr><th></th>${CFG.cats.map(c => `<th>${ICON[c]}<br>${c}</th>`).join("")}<th>Tur</th></tr></thead>
        <tbody>${CFG.players.map((p, i) => `<tr><th class="pn" scope="row">${TOKENS[i]} ${esc(p)}${CFG.help[i] ? " ✨" : ""}</th>${CFG.cats.map((c, j) => {
          const v = G.marks[i][j];
          return `<td><button type="button" class="cell${v ? " s" + v : ""}" data-i="${i}" data-j="${j}" aria-label="${esc(p)}, ${c}: ${lab[v]}">${lab[v]}</button></td>`;
        }).join("")}<td class="tot">${pts[i]}</td></tr>`).join("")}</tbody>
      </table></div>
      <details class="ex"><summary class="btn ghost">📖 Örnek cevaplar (${G.letter})</summary>
        ${CFG.cats.map(c => `<div>${ICON[c]} <b>${c}:</b> ${(EX[c][G.letter] || ["(örnek yok)"]).join(", ")}</div>`).join("")}
      </details>
      <button class="btn primary" id="nextr" type="button">${G.round >= CFG.rounds ? "Sonuçları gör" : "Puanları ekle, sonraki tur"}</button>`;
    $("table").querySelectorAll(".cell").forEach(b => b.addEventListener("click", () => { audio(); mark(+b.dataset.i, +b.dataset.j); }));
    $("nextr").addEventListener("click", () => { audio(); commit(); });
  }
  function mark(i, j) {
    if (!G || G.phase !== "score") return false;
    G.marks[i][j] = (G.marks[i][j] + 1) % 3; snd(500 + G.marks[i][j] * 150, 0.06, "sine", 0.05);
    renderScore();
    const b = $("table").querySelector(`.cell[data-i="${i}"][data-j="${j}"]`); if (b) b.focus();
    return true;
  }
  function commit() {
    if (!G || G.phase !== "score") return false;
    const pts = roundPoints();
    pts.forEach((p, i) => G.total[i] += p);
    G.phase = "";
    if (G.round >= CFG.rounds) return finish();
    nextRound();
    return true;
  }
  function renderPlayers() {
    $("players").innerHTML = CFG.players.map((q, i) => `<div class="pl"><span aria-hidden="true">${TOKENS[i]}</span>${esc(q)} <span class="sc">${G.total[i]}</span></div>`).join("");
  }
  function finish() {
    renderPlayers();
    const order = CFG.players.map((p, i) => ({ p, s: G.total[i] })).sort((a, b) => b.s - a.s);
    const top = order[0].s, winners = order.filter(o => o.s === top).map(o => o.p);
    [523, 659, 784, 1046].forEach((f, i) => snd(f, 0.22, "triangle", 0.07, i * 0.12));
    const t = winners.length > 1 ? `Berabere: ${winners.join(" ve ")}!` : `${winners[0]} kazandı!`;
    say(t);
    $("over-title").textContent = t;
    $("over-tx").textContent = `${CFG.rounds} turda kullanılan harfler: ${G.used.join(", ")}`;
    $("results").innerHTML = order.map(o => `<div class="${o.s === top ? "win" : ""}"><span>${esc(o.p)}</span><b>${o.s}</b></div>`).join("");
    $("again").textContent = "Yeniden oyna";
    $("over").hidden = false;
  }

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
      row.querySelector("input[type=text]").value = nm;
      row.querySelector("input[type=checkbox]").checked = h;
      box.appendChild(row);
    }
  }
  $("cats").innerHTML = CATS.map((c, i) => `<label><input type="checkbox" value="${c}"${(saved && saved.cats ? saved.cats.includes(c) : i < 5) ? " checked" : ""}> ${ICON[c]} ${c}</label>`).join("");
  form.addEventListener("change", (e) => { if (e.target.name === "count") buildRows(); });
  form.addEventListener("submit", (e) => {
    e.preventDefault(); audio(); pickVoice();
    const rows = [...$("rows").querySelectorAll(".p-row")];
    const players = rows.map((r, i) => r.querySelector("input[type=text]").value.trim() || ["Tilki", "Panda", "Kurbağa", "Aslan", "Penguen", "Ahtapot"][i]);
    const help = rows.map(r => r.querySelector("input[type=checkbox]").checked);
    let cats = [...$("cats").querySelectorAll("input:checked")].map(i => i.value);
    if (cats.length < 2) cats = CATS.slice(0, 5);
    const cfg = { players, help, cats, letters: form.lt.value, rounds: +form.rn.value, len: +form.len.value };
    try { localStorage.setItem(SAVE_KEY, JSON.stringify({ count: players.length, names: rows.map(r => r.querySelector("input[type=text]").value), help, cats, lt: cfg.letters, rn: cfg.rounds, len: cfg.len })); } catch (_) {}
    newGame(cfg);
  });
  if (saved) { try { form.count.value = String(saved.count); form.lt.value = saved.lt; form.rn.value = String(saved.rn); form.len.value = String(saved.len); } catch (_) {} }
  buildRows();
  $("settings").addEventListener("click", () => { clearInterval(tick); clearInterval(spinT); if (G) G.phase = ""; $("over").hidden = true; $("setup").hidden = false; });
  $("again").addEventListener("click", () => { audio(); newGame(CFG); });
  $("to-setup").addEventListener("click", () => { $("over").hidden = true; $("setup").hidden = false; });

  window.__ish = { EX, CATS, newGame, land, startWriting, stop, mark, commit, roundPoints, get G() { return G; } };
})();
