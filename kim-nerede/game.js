/* Kim Nerede? — sınıflandırma oyunu (Egemen için) */
(() => {
  "use strict";
  const $ = (id) => document.getElementById(id);
  const SAVE_KEY = "kim-nerede";

  /* ---------- veriler ----------
     yer: nm (ad), loc (-de hâli), dat (-e hâli), bg (arka plan), deco (süs) */
  const MODES = {
    hayvan: {
      q: (it) => `${it.nm} nerede yaşar?`,
      yes: (it, z) => `Evet! ${it.nm} ${z.loc} yaşar.`,
      no: (it, z) => `Hımm, ${it.lc} ${z.loc} yaşamaz. Bir daha dene!`,
      zones: [
        { id: "ciftlik", nm: "Çiftlik", loc: "çiftlikte", bg: "linear-gradient(180deg,#9FD8FF 0 38%,#7CC46A 38%)", deco: "🏡🌾" },
        { id: "deniz", nm: "Deniz", loc: "denizde", bg: "linear-gradient(180deg,#7FC8F8 0 20%,#2F7FD8 20%,#1D5FB0)", deco: "🌊💧" },
        { id: "orman", nm: "Orman", loc: "ormanda", bg: "linear-gradient(180deg,#A8E0A0 0 25%,#3E8A40 25%,#2D6B30)", deco: "🌲🍄🌳" },
        { id: "kutup", nm: "Kutup", loc: "kutupta", bg: "linear-gradient(180deg,#CFE8FF 0 35%,#F4FBFF 35%)", deco: "❄️🧊", dark: true },
        { id: "sicak", nm: "Sıcak ülkeler", loc: "sıcak ülkelerde", bg: "linear-gradient(180deg,#FFD58A 0 35%,#E8B04A 35%,#C98F2E)", deco: "🌴☀️🌵" },
      ],
      items: [
        ["🐄", "İnek", "ciftlik"], ["🐑", "Koyun", "ciftlik"], ["🐴", "At", "ciftlik"], ["🐐", "Keçi", "ciftlik"], ["🐔", "Tavuk", "ciftlik"], ["🐓", "Horoz", "ciftlik"], ["🦃", "Hindi", "ciftlik"],
        ["🐟", "Balık", "deniz"], ["🐙", "Ahtapot", "deniz"], ["🐬", "Yunus", "deniz"], ["🐳", "Balina", "deniz"], ["🦀", "Yengeç", "deniz"], ["🦈", "Köpek balığı", "deniz"], ["🐠", "Renkli balık", "deniz"],
        ["🐻", "Ayı", "orman"], ["🦊", "Tilki", "orman"], ["🐺", "Kurt", "orman"], ["🦌", "Geyik", "orman"], ["🐿️", "Sincap", "orman"], ["🦉", "Baykuş", "orman"], ["🦔", "Kirpi", "orman"],
        ["🐧", "Penguen", "kutup"], ["🦭", "Fok", "kutup"],
        ["🐪", "Deve", "sicak"], ["🦁", "Aslan", "sicak"], ["🦒", "Zürafa", "sicak"], ["🐘", "Fil", "sicak"], ["🦓", "Zebra", "sicak"], ["🐒", "Maymun", "sicak"],
      ],
    },
    esya: {
      q: (it) => `${it.nm} nereye konur?`,
      yes: (it, z) => `Evet! ${it.nm} ${z.dat} konur.`,
      no: (it, z) => `Hımm, ${it.lc} ${z.dat} konmaz. Bir daha dene!`,
      zones: [
        { id: "mutfak", nm: "Mutfak", dat: "mutfağa", bg: "linear-gradient(180deg,#FFE0B5,#F5B971)", deco: "🍳🥘", dark: true },
        { id: "banyo", nm: "Banyo", dat: "banyoya", bg: "linear-gradient(180deg,#D6F1FF,#8ED1F5)", deco: "🛁🚿", dark: true },
        { id: "oyuncak", nm: "Oyuncak kutusu", dat: "oyuncak kutusuna", bg: "linear-gradient(180deg,#FFD1E8,#F58CC0)", deco: "🎁🧩" },
        { id: "dolap", nm: "Elbise dolabı", dat: "elbise dolabına", bg: "linear-gradient(180deg,#E6D2FF,#A97BE8)", deco: "🚪🧥" },
        { id: "bahce", nm: "Bahçe", dat: "bahçeye", bg: "linear-gradient(180deg,#B9F0A8,#5DB548)", deco: "🌻🌷" },
      ],
      items: [
        ["🥄", "Kaşık", "mutfak"], ["🍴", "Çatal", "mutfak"], ["🍳", "Tava", "mutfak"], ["🥛", "Süt bardağı", "mutfak"], ["🍽️", "Tabak", "mutfak"],
        ["🧼", "Sabun", "banyo"], ["🧽", "Sünger", "banyo"], ["🧻", "Tuvalet kâğıdı", "banyo"], ["🛁", "Küvet oyuncağı ördek", "banyo", "🦆"],
        ["⚽", "Top", "oyuncak"], ["🧸", "Oyuncak ayı", "oyuncak"], ["🚗", "Oyuncak araba", "oyuncak"], ["🪀", "Yoyo", "oyuncak"], ["🎲", "Zar", "oyuncak"],
        ["👕", "Tişört", "dolap"], ["👖", "Pantolon", "dolap"], ["🧦", "Çorap", "dolap"], ["👗", "Elbise", "dolap"], ["🧢", "Şapka", "dolap"],
        ["🪣", "Kova", "bahce"], ["🪴", "Saksı", "bahce"], ["🚲", "Bisiklet", "bahce"], ["🪁", "Uçurtma", "bahce"],
      ],
    },
  };
  // kolay → zor: hangi yerler açık
  const LEVELS = [2, 3, 4, 5];
  const PER_ROUND = 8, ROUNDS_PER_LEVEL = 2;

  /* ---------- kayıt ---------- */
  let SAVE = { mode: "hayvan", lv: { hayvan: 0, esya: 0 }, rounds: { hayvan: 0, esya: 0 }, stars: 0 };
  try { SAVE = Object.assign(SAVE, JSON.parse(localStorage.getItem(SAVE_KEY) || "{}")); } catch (e) {}
  const store = () => { try { localStorage.setItem(SAVE_KEY, JSON.stringify(SAVE)); } catch (e) {} };

  /* ---------- ses ---------- */
  let soundOn = true, AC = null, trVoice = null;
  function audio() { try { AC = AC || new (window.AudioContext || window.webkitAudioContext)(); if (AC.state === "suspended") AC.resume(); } catch (e) {} }
  function tone(f, d = 0.15, type = "triangle", vol = 0.07, slide = 0) {
    if (!soundOn || !AC) return;
    const t = AC.currentTime, o = AC.createOscillator(), g = AC.createGain();
    o.type = type; o.frequency.setValueAtTime(f, t); if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(40, f + slide), t + d);
    g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + d);
    o.connect(g).connect(AC.destination); o.start(t); o.stop(t + d + 0.02);
  }
  const sYes = () => { tone(660, 0.12); setTimeout(() => tone(990, 0.16), 90); };
  const sNo = () => tone(260, 0.25, "triangle", 0.07, -100);
  const sWin = () => [523, 659, 784, 1046, 1318].forEach((f, i) => setTimeout(() => tone(f, 0.2), i * 120));
  const pickVoice = () => { try { trVoice = speechSynthesis.getVoices().find(v => v.lang && v.lang.toLowerCase().startsWith("tr")) || trVoice; } catch (e) {} };
  if ("speechSynthesis" in window) { pickVoice(); speechSynthesis.onvoiceschanged = pickVoice; }
  function say(text) {
    if (!soundOn || !("speechSynthesis" in window)) return;
    try { speechSynthesis.cancel(); const u = new SpeechSynthesisUtterance(text); u.lang = "tr-TR"; u.rate = 0.95; u.pitch = 1.1; if (trVoice) u.voice = trVoice; speechSynthesis.speak(u); } catch (e) {}
  }

  /* ---------- tur ---------- */
  let R = null;
  const shuffle = (a) => { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
  function newRound() {
    const M = MODES[SAVE.mode], n = LEVELS[Math.min(SAVE.lv[SAVE.mode], LEVELS.length - 1)];
    const zones = M.zones.slice(0, n);
    const ids = zones.map(z => z.id);
    const pool = shuffle(M.items.filter(it => ids.includes(it[2])).map(([e, nm, z, show]) => ({ e: show || e, nm, lc: nm.toLocaleLowerCase("tr-TR"), z })));
    // her yerden en az bir tane gelsin
    const pick = [];
    for (const id of ids) { const i = pool.findIndex(p => p.z === id); if (i >= 0) pick.push(pool.splice(i, 1)[0]); }
    while (pick.length < PER_ROUND && pool.length) pick.push(pool.shift());
    R = { M, zones: shuffle(zones.slice()), queue: shuffle(pick), placed: {}, cur: null, wrong: 0, done: 0, total: pick.length };
    zones.forEach(z => (R.placed[z.id] = []));
    renderZones(); renderInfo();
    $("next").hidden = true;
    nextItem();
  }
  function nextItem() {
    R.cur = R.queue.shift() || null; R.wrong = 0;
    document.querySelectorAll(".zone").forEach(z => z.classList.remove("hint"));
    const el = $("item");
    el.textContent = R.cur ? R.cur.e : ""; el.setAttribute("aria-label", R.cur ? R.cur.nm : "");
    const asked = R.cur; if (asked) setTimeout(() => { if (R.cur === asked) say(R.M.q(asked)); }, 250);
    else finishRound();
  }
  function choose(zid) {
    if (!R || !R.cur) return;
    const z = R.zones.find(q => q.id === zid), it = R.cur;
    if (it.z === zid) {
      sYes(); say(R.M.yes(it, z));
      R.placed[zid].push(it.e); R.done++;
      burstAt($("zone-" + zid), ["⭐", "✨", "💛"]);
      const zel = $("zone-" + zid); zel.classList.add("ok"); setTimeout(() => zel.classList.remove("ok"), 300);
      renderZones(); renderInfo();
      R.cur = null; $("item").textContent = "";
      setTimeout(nextItem, 1700);
    } else {
      R.wrong++; sNo(); say(R.M.no(it, z));
      const el = $("item"); el.classList.remove("shake"); void el.offsetWidth; el.classList.add("shake");
      if (R.wrong >= 2) $("zone-" + it.z).classList.add("hint");
    }
  }
  function finishRound() {
    sWin();
    const mode = SAVE.mode;
    SAVE.stars++; SAVE.rounds[mode]++;
    let up = false;
    if (SAVE.rounds[mode] % ROUNDS_PER_LEVEL === 0 && SAVE.lv[mode] < LEVELS.length - 1) { SAVE.lv[mode]++; up = true; }
    store(); renderInfo();
    say(mode === "hayvan" ? "Harika! Bütün hayvanlar evine yerleşti!" + (up ? " Şimdi yeni bir yer açıldı!" : "") : "Harika! Her şey yerli yerinde!" + (up ? " Şimdi yeni bir yer açıldı!" : ""));
    document.querySelectorAll(".zone").forEach(z => burstAt(z, ["🎉", "⭐", "💖"]));
    $("next").hidden = false; $("next").focus();
  }

  /* ---------- çizim ---------- */
  function renderZones() {
    const box = $("zones"), n = R.zones.length;
    box.style.setProperty("--n", n <= 3 ? n : n === 4 ? 4 : 5);
    box.style.setProperty("--m", n <= 2 ? 2 : n === 3 ? 3 : 2);
    box.innerHTML = R.zones.map(z => `<button class="zone" type="button" id="zone-${z.id}" data-z="${z.id}" style="background:${z.bg};${z.dark ? "color:#24364A;text-shadow:none" : ""}" aria-label="${z.nm}">
      <span class="nm">${z.nm}</span><span class="deco" aria-hidden="true">${z.deco}</span><span class="live" aria-hidden="true">${R.placed[z.id].map(e => `<span>${e}</span>`).join("")}</span></button>`).join("");
    box.querySelectorAll(".zone").forEach(b => b.addEventListener("click", () => { audio(); if (!dragging) choose(b.dataset.z); }));
  }
  function renderInfo() {
    const mode = SAVE.mode, lv = SAVE.lv[mode];
    $("level").textContent = (mode === "hayvan" ? "🐾 Hayvanlar" : "🧸 Eşyalar") + ` · ${LEVELS[lv]} yer`;
    $("dots").innerHTML = R ? Array.from({ length: R.total }, (_, i) => `<i class="${i < R.done ? "on" : ""}"></i>`).join("") : "";
    $("stars").textContent = `⭐ ${SAVE.stars}`;
    $("mode").textContent = mode === "hayvan" ? "🧸" : "🐾";
    $("mode").setAttribute("aria-label", mode === "hayvan" ? "Eşyalar moduna geç" : "Hayvanlar moduna geç");
  }
  function burstAt(el, set) {
    const r = el.getBoundingClientRect();
    for (let i = 0; i < 6; i++) {
      const s = document.createElement("span"); s.className = "burst"; s.textContent = set[i % set.length];
      s.style.left = r.left + r.width * (0.15 + Math.random() * 0.7) + "px"; s.style.top = r.top + r.height * (0.3 + Math.random() * 0.5) + "px";
      s.style.animationDelay = i * 0.06 + "s";
      document.body.appendChild(s); setTimeout(() => s.remove(), 1500);
    }
  }

  /* ---------- sürükleme ---------- */
  let dragging = false, ghost = null, start = null;
  $("item").addEventListener("pointerdown", (e) => {
    audio(); if (!R || !R.cur) return;
    start = { x: e.clientX, y: e.clientY }; dragging = false;
    try { $("item").setPointerCapture(e.pointerId); } catch (_) {}
  });
  $("item").addEventListener("pointermove", (e) => {
    if (!start || !R.cur) return;
    if (!dragging && Math.hypot(e.clientX - start.x, e.clientY - start.y) > 10) {
      dragging = true; ghost = document.createElement("div"); ghost.className = "drag"; ghost.textContent = R.cur.e; document.body.appendChild(ghost);
    }
    if (ghost) {
      ghost.style.left = e.clientX + "px"; ghost.style.top = e.clientY + "px";
      const z = zoneAt(e.clientX, e.clientY);
      document.querySelectorAll(".zone").forEach(el => el.classList.toggle("over", el === z));
    }
  });
  const zoneAt = (x, y) => document.elementsFromPoint(x, y).map(el => el.closest && el.closest(".zone")).find(Boolean) || null;
  $("item").addEventListener("pointerup", (e) => {
    if (!start) return;
    start = null;
    if (ghost) { ghost.remove(); ghost = null; }
    document.querySelectorAll(".zone").forEach(el => el.classList.remove("over"));
    if (dragging) { const z = zoneAt(e.clientX, e.clientY); if (z) choose(z.dataset.z); setTimeout(() => (dragging = false), 0); }
    else if (R && R.cur) say(R.M.q(R.cur));
  });

  /* ---------- düğmeler ---------- */
  $("say").addEventListener("click", () => { audio(); if (R && R.cur) say(R.M.q(R.cur)); });
  $("next").addEventListener("click", () => { audio(); newRound(); });
  $("mode").addEventListener("click", () => { audio(); SAVE.mode = SAVE.mode === "hayvan" ? "esya" : "hayvan"; store(); $("start").hidden = true; newRound(); });
  $("go").addEventListener("click", () => { audio(); pickVoice(); $("start").hidden = true; newRound(); });
  $("sound").addEventListener("click", () => {
    soundOn = !soundOn; $("ic-on").hidden = !soundOn; $("ic-off").hidden = soundOn;
    $("sound").setAttribute("aria-pressed", soundOn); $("sound").setAttribute("aria-label", soundOn ? "Sesi kapat" : "Sesi aç");
    if (!soundOn && "speechSynthesis" in window) speechSynthesis.cancel();
  });
  renderInfo();

  // test kancası
  window.__kn = { MODES, get R() { return R; }, choose, newRound, save: () => SAVE };
})();
