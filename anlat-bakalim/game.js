/* Anlat Bakalım — aile takım kelime anlatma oyunu */
(() => {
  "use strict";
  const $ = (id) => document.getElementById(id);
  const SAVE_KEY = "anlat-bakalim";
  const TOKENS = ["🦊", "🐼", "🐸", "🦁", "🐧", "🐙", "🐰", "🐻"];
  const DEF = ["Enes", "Egemen", "Anne", "Baba", "", "", "", ""];
  const TEAM = [{ ad: "Mavi takım", c: "tA" }, { ad: "Turuncu takım", c: "tB" }];
  // kelime: yasaklar
  const RAW = "Okul:öğretmen,ders,sınıf,öğrenci|Doktor:hastane,hasta,ilaç,muayene|Futbol:top,gol,maç,oyuncu|Deniz:su,mavi,dalga,yüzmek|Kitap:okumak,sayfa,yazar,kütüphane|Telefon:aramak,konuşmak,ekran,mesaj|Pizza:İtalyan,peynir,dilim,hamur|Güneş:sıcak,gökyüzü,ışık,sarı|Kar:kış,beyaz,soğuk,kardan adam|Tren:ray,istasyon,vagon,yolculuk|Uçak:uçmak,pilot,havalimanı,kanat|Diş fırçası:diş,macun,fırçalamak,ağız|Doğum günü:pasta,mum,hediye,yaş|Yağmur:su,bulut,şemsiye,ıslak|Bisiklet:pedal,tekerlek,sürmek,kask|Kedi:miyav,hayvan,tüy,fare|Köpek:hav,hayvan,kemik,kulübe|Saat:zaman,dakika,kol,akrep|Ayakkabı:ayak,bağcık,giymek,çorap|Buzdolabı:soğuk,mutfak,yiyecek,dondurucu|Ayna:yansıma,bakmak,yüz,cam|Şemsiye:yağmur,açmak,ıslak,sap|Gözlük:göz,görmek,cam,takmak|Yastık:uyumak,yatak,baş,yumuşak|Dondurma:soğuk,külah,tatlı,yaz|Balık:deniz,yüzmek,olta,pul|Ağaç:yaprak,dal,orman,kök|Çikolata:tatlı,kakao,kahverengi,şeker|Bebek:küçük,ağlamak,emzik,anne|Masa:sandalye,yemek,ayak,tahta|Pencere:cam,ev,açmak,perde|Ekmek:fırın,un,dilim,kahvaltı|Çay:bardak,demlik,içmek,şeker|Ay:gece,gökyüzü,dolunay,yıldız|Robot:makine,metal,pil,insan|Dinozor:eski,büyük,fosil,soyu|Korsan:gemi,hazine,deniz,göz bandı|Kral:taç,saray,kraliçe,ülke|Sihirbaz:büyü,şapka,tavşan,değnek|Market:alışveriş,kasa,sepet,para|Park:salıncak,kaydırak,çocuk,oyun|Uzay:astronot,roket,gezegen,yıldız|Kamp:çadır,ateş,orman,uyku tulumu|Plaj:deniz,kum,güneş,havlu|Sinema:film,perde,mısır,bilet|Müze:eski,tablo,sergi,gezmek|Hayvanat bahçesi:hayvan,aslan,kafes,gezmek|Mutfak:yemek,ocak,tencere,pişirmek|Banyo:duş,küvet,yıkanmak,havlu|Bahçe:çiçek,ağaç,çim,sulamak|Gökkuşağı:renk,yağmur,yedi,güneş|Yanardağ:lav,patlamak,dağ,ateş|Çöl:kum,sıcak,deve,vaha|Ada:deniz,su,kara,etraf|Şelale:su,akmak,yüksek,düşmek|Orman:ağaç,hayvan,yeşil,ayı|Kutup:buz,soğuk,penguen,ayı|Fil:hortum,büyük,gri,kulak|Zürafa:boyun,uzun,benek,Afrika|Arı:bal,vızıldamak,iğne,kovan|Kelebek:kanat,uçmak,renkli,tırtıl|Penguen:buz,kuş,siyah,yüzmek|Yılan:sürünmek,zehir,uzun,tıslamak|Tavşan:havuç,kulak,zıplamak,beyaz|Maymun:muz,ağaç,tırmanmak,şempanze|Aslan:kral,yele,kükremek,orman|Kaplumbağa:kabuk,yavaş,sürünmek,deniz|Kurabiye:tatlı,fırın,un,çikolata|Makarna:İtalyan,haşlamak,sos,spagetti|Çorba:kaşık,sıcak,mercimek,kase|Yumurta:tavuk,kahvaltı,sarı,kabuk|Elma:meyve,kırmızı,yeşil,ağaç|Muz:sarı,meyve,maymun,soymak|Karpuz:yaz,kırmızı,çekirdek,yeşil|Limon:ekşi,sarı,meyve,limonata|Patates:kızartma,kumpir,toprak,sebze|Peynir:beyaz,süt,kahvaltı,kaşar|Gitar:tel,çalmak,müzik,akor|Piyano:tuş,çalmak,siyah,müzik|Davul:vurmak,ses,tokmak,müzik|Şarkı:söylemek,müzik,şarkıcı,söz|Dans:müzik,oynamak,adım,hareket|Resim:boya,çizmek,tablo,fırça|Fotoğraf:makine,çekmek,kare,poz|Oyuncak:oynamak,çocuk,bebek,araba|Balon:şişirmek,patlamak,hava,uçan|Uçurtma:uçmak,ip,rüzgâr,gökyüzü|Pusula:yön,kuzey,iğne,harita|Harita:yol,ülke,kâğıt,bulmak|Anahtar:kapı,kilit,açmak,cep|Mum:ateş,yakmak,ışık,erimek|Fener:ışık,karanlık,pil,deniz|Çanta:taşımak,okul,sırt,kol|Şapka:baş,takmak,güneş,kasket|Eldiven:el,kış,parmak,soğuk|Atkı:boyun,kış,sarmak,yün|Rüya:uyku,gece,görmek,kâbus|Tatil:yaz,gezmek,otel,dinlenmek|Bayram:şeker,el öpmek,harçlık,kurban|Düğün:gelin,damat,evlenmek,nikâh|Yüzmek:havuz,su,deniz,kulaç|Satranç:şah,piyon,tahta,oyun|Saklambaç:saklanmak,ebe,saymak,bulmak|Bilgisayar:ekran,klavye,fare,internet|Televizyon:izlemek,kumanda,kanal,ekran|Kamyon:büyük,yük,araba,şoför|İtfaiye:yangın,su,hortum,kırmızı|Polis:hırsız,düdük,karakol,üniforma|Astronot:uzay,roket,ay,kask|Aşçı:yemek,mutfak,şef,pişirmek|Berber:saç,kesmek,makas,tıraş|Çiftçi:tarla,traktör,hayvan,ekmek|Ressam:resim,boya,fırça,tablo|Öğretmen:okul,ders,sınıf,öğrenci|Hemşire:hastane,doktor,iğne,hasta|Kalem:yazmak,kâğıt,uç,silgi|Saksı:çiçek,toprak,bitki,su";
  const ADULT = RAW.split("|").map(s => { const [w, f] = s.split(":"); return { w, f: f.split(",") }; });
  const KID = "🐶 Köpek|🐱 Kedi|🐮 İnek|🐔 Tavuk|🐸 Kurbağa|🐘 Fil|🦁 Aslan|🐵 Maymun|🐟 Balık|🐝 Arı|🦋 Kelebek|🐍 Yılan|🐢 Kaplumbağa|🐰 Tavşan|🐴 At|🐷 Domuz|🐑 Koyun|🦆 Ördek|🐧 Penguen|🐻 Ayı|🍎 Elma|🍌 Muz|🍉 Karpuz|🍓 Çilek|🥕 Havuç|🍞 Ekmek|🍕 Pizza|🍦 Dondurma|🎂 Pasta|🥚 Yumurta|🚗 Araba|🚌 Otobüs|✈️ Uçak|🚂 Tren|🚲 Bisiklet|🚀 Roket|⛵ Gemi|🚒 İtfaiye|⚽ Top|🎈 Balon|🧸 Oyuncak ayı|🎁 Hediye|📚 Kitap|✏️ Kalem|⏰ Saat|☂️ Şemsiye|👟 Ayakkabı|🧢 Şapka|🛏️ Yatak|🌞 Güneş|🌙 Ay|⭐ Yıldız|🌧️ Yağmur|❄️ Kar|🌳 Ağaç|🌸 Çiçek|🏠 Ev|🏫 Okul|👶 Bebek|🤖 Robot|🦖 Dinozor|🐳 Balina|🦒 Zürafa|🍪 Kurabiye".split("|").map(s => { const i = s.indexOf(" "); return { e: s.slice(0, i), w: s.slice(i + 1) }; });

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
  const canSpeak = "speechSynthesis" in window;
  let trVoice = null;
  function pickVoice() { if (canSpeak) trVoice = speechSynthesis.getVoices().find(v => /^tr(-|_|$)/i.test(v.lang)) || null; }
  if (canSpeak) { pickVoice(); if (speechSynthesis.addEventListener) speechSynthesis.addEventListener("voiceschanged", pickVoice); }
  function say(t) { if (!canSpeak || !trVoice) return; speechSynthesis.cancel(); const u = new SpeechSynthesisUtterance(t); u.voice = trVoice; u.lang = trVoice.lang; speechSynthesis.speak(u); }
  const esc = (s) => s.replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  const shuffle = (a) => { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };

  /* ---------- durum ---------- */
  let CFG = null, G = null, tick = null;
  function newGame(cfg) {
    CFG = cfg; clearInterval(tick);
    G = { score: [0, 0], turn: 0, played: [0, 0], ptr: [0, 0], deckA: shuffle(ADULT.slice()), deckK: shuffle(KID.slice()), phase: "", card: null, log: [], passes: 0, t0: 0 };
    $("setup").hidden = true; $("over").hidden = true;
    ready();
  }
  const members = (t) => CFG.players.map((p, i) => ({ p, i })).filter(o => CFG.team[o.i] === t);
  function explainer() { const m = members(G.turn); return m[G.ptr[G.turn] % m.length]; }
  function teams() {
    return `<div class="teams">${[0, 1].map(t => `<span class="tm ${TEAM[t].c}${t === G.turn && G.phase ? " cur" : ""}">${TEAM[t].ad} <b>${G.score[t]}</b></span>`).join("")}</div>`;
  }
  function renderPlayers() {
    $("players").innerHTML = CFG.players.map((q, i) => `<div class="pl ${TEAM[CFG.team[i]].c}"><span aria-hidden="true">${TOKENS[i]}</span>${esc(q)}${CFG.help[i] ? " ✨" : ""}</div>`).join("");
  }
  function ready() {
    G.phase = "ready"; clearInterval(tick);
    const ex = explainer(), opp = TEAM[1 - G.turn].ad;
    renderPlayers();
    $("table").innerHTML = `${teams()}
      <p class="who"><span class="${TEAM[G.turn].c}">${TEAM[G.turn].ad}</span><br>${TOKENS[ex.i]} Anlatan: ${esc(ex.p)}</p>
      <p class="small-note" style="margin:0;font-weight:700;color:var(--muted)">Telefonu ${esc(ex.p)} alsın. ${opp} yasak kelimeleri kontrol etsin!${CFG.help[ex.i] ? " ✨ Resimli kolay kartlar." : ""}</p>
      <button class="btn primary big" id="go" type="button" style="max-width:420px">▶ Süreyi başlat</button>`;
    $("go").addEventListener("click", () => { audio(); start(); });
    say(`${TEAM[G.turn].ad}, anlatan ${ex.p}.`);
  }
  function start() {
    G.phase = "play"; G.log = []; G.passes = 0; G.t0 = performance.now();
    nextCard();
    tick = setInterval(() => {
      const left = Math.max(0, CFG.len - (performance.now() - G.t0) / 1000);
      const c = $("clock"); if (c) c.textContent = Math.ceil(left);
      const b = $("tb"); if (b) b.style.width = (left / CFG.len * 100) + "%";
      if (left <= 5 && left > 0 && Math.ceil(left) !== G.lastBeep) { G.lastBeep = Math.ceil(left); tone(880, 0.06, "square", 0.04); }
      if (left <= 0) endTurn();
    }, 200);
  }
  function draw() {
    const ex = explainer();
    if (CFG.help[ex.i]) { if (!G.deckK.length) G.deckK = shuffle(KID.slice()); const k = G.deckK.pop(); return { w: k.w, e: k.e, f: [] }; }
    if (!G.deckA.length) G.deckA = shuffle(ADULT.slice());
    return G.deckA.pop();
  }
  function nextCard() {
    G.card = draw();
    const c = G.card, left = Math.max(0, CFG.len - (performance.now() - G.t0) / 1000);
    $("table").innerHTML = `${teams()}
      <p class="clock" id="clock">${Math.ceil(left)}</p><div class="tbar"><i id="tb" style="width:${left / CFG.len * 100}%"></i></div>
      <div class="card in"><div class="w">${c.e ? `<span class="pic" aria-hidden="true">${c.e}</span>` : ""}${esc(c.w)}</div>${c.f.length ? `<ul>${c.f.map(f => `<li>${esc(f)}</li>`).join("")}</ul>` : `<p class="free">Yasak kelime yok! Anlat ya da sesini taklit et.</p>`}</div>
      <div class="btns"><button class="btn no" id="bx" type="button">✗ Yasak</button><button class="btn" id="bp" type="button" ${G.passes >= 3 ? "disabled" : ""}>Pas (${3 - G.passes})</button><button class="btn ok" id="bo" type="button">✓ Bildiler</button></div>`;
    $("bo").addEventListener("click", () => { audio(); mark("g"); });
    $("bx").addEventListener("click", () => { audio(); mark("x"); });
    $("bp").addEventListener("click", () => { audio(); mark("p"); });
  }
  function mark(k) {
    if (!G || G.phase !== "play") return false;
    if (k === "p" && G.passes >= 3) return false;
    if (k === "g") { G.score[G.turn]++; tone(660, 0.08, "triangle", 0.07); tone(990, 0.1, "triangle", 0.07, 0.07); }
    if (k === "x") { G.score[G.turn]--; tone(180, 0.25, "sawtooth", 0.06); }
    if (k === "p") { G.passes++; tone(400, 0.06, "sine", 0.05); }
    G.log.push({ w: G.card.w, k });
    nextCard();
    return true;
  }
  function endTurn() {
    clearInterval(tick); G.phase = "sum";
    [880, 660, 440].forEach((f, i) => tone(f, 0.15, "square", 0.05, i * 0.12));
    const g = G.log.filter(l => l.k === "g").length, x = G.log.filter(l => l.k === "x").length;
    G.played[G.turn]++; G.ptr[G.turn]++;
    const lastTurn = G.played[0] >= CFG.rounds && G.played[1] >= CFG.rounds;
    $("table").innerHTML = `${teams()}
      <p class="who">Süre bitti!</p>
      <p style="margin:0;font-weight:800">${TEAM[G.turn].ad}: ${g} bildi${x ? `, ${x} yasak` : ""} → ${g - x >= 0 ? "+" : ""}${g - x} puan</p>
      <div class="sum">${G.log.map(l => `<span class="${l.k}">${esc(l.w)}</span>`).join("") || "<span>kart yok</span>"}</div>
      <button class="btn primary big" id="nx" type="button" style="max-width:420px">${lastTurn ? "Sonuçları gör" : "Sıradaki takım ➜"}</button>`;
    say(`Süre bitti! ${TEAM[G.turn].ad} ${g - x} puan aldı.`);
    $("nx").addEventListener("click", () => { audio(); if (lastTurn) finish(); else { G.turn = 1 - G.turn; ready(); } });
  }
  function finish() {
    G.phase = "";
    const [a, b] = G.score, t = a === b ? "Berabere!" : `${TEAM[a > b ? 0 : 1].ad} kazandı!`;
    [523, 659, 784, 1046].forEach((f, i) => tone(f, 0.22, "triangle", 0.07, i * 0.12)); say(t);
    $("over-title").textContent = t;
    $("over-tx").textContent = "Herkes harika anlattı!";
    $("results").innerHTML = [0, 1].map(k => `<div class="${(a === b || (k === 0) === (a > b)) ? "win" : ""}"><span>${TEAM[k].ad}: ${members(k).map(m => esc(m.p)).join(", ")}</span><b>${G.score[k]}</b></div>`).join("");
    $("over").hidden = false;
  }

  /* ---------- ayarlar ---------- */
  const form = $("setup-form");
  let saved = null;
  try { saved = JSON.parse(localStorage.getItem(SAVE_KEY) || "null"); } catch (_) {}
  function buildRows() {
    const n = +form.count.value, box = $("rows");
    const old = [...box.querySelectorAll(".p-row")].map(r => [r.querySelector("input[type=text]").value, +r.querySelector(".tg").dataset.t, r.querySelector("input[type=checkbox]").checked]);
    box.innerHTML = "";
    for (let i = 0; i < n; i++) {
      const row = document.createElement("div"); row.className = "p-row";
      const d = old[i] || [saved && saved.names && saved.names[i] != null ? saved.names[i] : DEF[i], saved && saved.team && saved.team[i] != null ? saved.team[i] : (i % 2), saved && saved.help ? !!saved.help[i] : DEF[i] === "Egemen"];
      row.innerHTML = `<span class="tk">${TOKENS[i]}</span><input type="text" maxlength="12" aria-label="${i + 1}. oyuncunun adı" placeholder="Oyuncu ${i + 1}"><button type="button" class="tg"></button><label class="toggle" title="Küçüklere kolay kart"><input type="checkbox" aria-label="${i + 1}. oyuncuya kolay kart"> ✨</label>`;
      row.querySelector("input[type=text]").value = d[0]; row.querySelector("input[type=checkbox]").checked = d[2];
      const tg = row.querySelector(".tg"); const setT = (t) => { tg.dataset.t = t; tg.className = "tg " + (t ? "B" : "A"); tg.textContent = t ? "Turuncu" : "Mavi"; tg.setAttribute("aria-label", `${i + 1}. oyuncunun takımı: ${t ? "turuncu" : "mavi"}`); };
      setT(d[1]); tg.addEventListener("click", () => setT(+tg.dataset.t ? 0 : 1));
      box.appendChild(row);
    }
  }
  form.addEventListener("change", (e) => { if (e.target.name === "count") buildRows(); });
  form.addEventListener("submit", (e) => {
    e.preventDefault(); audio(); pickVoice();
    const rows = [...$("rows").querySelectorAll(".p-row")];
    const players = rows.map((r, i) => r.querySelector("input[type=text]").value.trim() || ["Tilki", "Panda", "Kurbağa", "Aslan", "Penguen", "Ahtapot", "Tavşan", "Ayı"][i]);
    const team = rows.map(r => +r.querySelector(".tg").dataset.t), help = rows.map(r => r.querySelector("input[type=checkbox]").checked);
    if (!team.includes(0) || !team.includes(1)) { alert("Her takımda en az bir oyuncu olmalı. Takım düğmesine dokunarak değiştir."); return; }
    const cfg = { players, team, help, rounds: +form.rn.value, len: +form.len.value };
    try { localStorage.setItem(SAVE_KEY, JSON.stringify({ count: players.length, names: rows.map(r => r.querySelector("input[type=text]").value), team, help, rn: cfg.rounds, len: cfg.len })); } catch (_) {}
    newGame(cfg);
  });
  if (saved) { try { form.count.value = String(saved.count); form.rn.value = String(saved.rn); form.len.value = String(saved.len); } catch (_) {} }
  buildRows();
  $("settings").addEventListener("click", () => { clearInterval(tick); if (G) G.phase = ""; $("over").hidden = true; $("setup").hidden = false; });
  $("again").addEventListener("click", () => { audio(); newGame(CFG); });
  $("to-setup").addEventListener("click", () => { $("over").hidden = true; $("setup").hidden = false; });

  window.__ab = { ADULT, KID, newGame, start, mark, endTurn, get G() { return G; } };
})();
