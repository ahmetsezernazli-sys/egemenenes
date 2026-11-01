/* Klavye Ninjası — Türkçe on parmak klavye oyunu (Enes için) */
(() => {
  "use strict";
  const $ = (id) => document.getElementById(id);
  const cv = $("cv"), ctx = cv.getContext("2d"), stage = $("stage");
  const SAVE_KEY = "klavye-ninjasi";
  const low = (s) => s.toLocaleLowerCase("tr-TR");

  /* ---------- kelimeler ---------- */
  const WORDS = ("arı ayı bal baş bir buz can çay çok dağ dal dil diş fil göl gök göz gül gün hız iki ilk iyi kar kış kız kol kum kuş mor oda pil ses süt taş tek tuz yağ yaz yol yüz zil ada " +
    "ağaç anne baba elma etek gece kalp kedi kuzu masa mavi okul oyun saat sarı uçak ateş kapı kutu gemi uzay muz roket dalga simit pide " +
    "bulut deniz ekmek kalem kitap köpek limon ödev renk sabah sokak şehir yeşil balon bahçe çiçek dünya fener güneş havuç liman nehir orman pazar resim sebze şarkı tahta yemek zaman akşam bilgi cevap dolap fırın sınıf şapka tavuk kiraz armut çilek üzüm köfte mantı börek ayran çorba biber soğan havlu sabun hazine macera kumsal futbol " +
    "toprak yıldız hayvan insan kardeş köprü müzik takvim kelebek arkadaş uçurtma dondurma bisiklet gezegen astronot okyanus rüzgar fırtına yağmur kartopu penguen zürafa timsah kanguru papağan karınca çikolata karpuz portakal peynir zeytin baklava salata makarna pilav domates patates " +
    "merdiven oyuncak pencere sandalye televizyon ayakkabı bilgisayar kaplumbağa öğretmen öğrenci matematik basketbol gökkuşağı yolculuk ejderha şövalye salatalık lahmacun").split(/\s+/);
  const SENTENCES = ["bugün hava çok güzel", "kedi bahçede uyuyor", "enes kitap okuyor", "egemen top oynuyor", "deniz mavi ve sakin", "ağaçta kuşlar ötüyor",
    "akşam yemeği hazır", "yarın okul var", "matematik dersi eğlenceli", "roket uzaya uçtu", "yağmur yağınca şemsiye aç", "pazar günü parka gideceğiz"];

  /* ---------- klavye ---------- */
  const ROWS = [["q", "w", "e", "r", "t", "y", "u", "ı", "o", "p", "ğ", "ü"], ["a", "s", "d", "f", "g", "h", "j", "k", "l", "ş", "i"], ["z", "x", "c", "v", "b", "n", "m", "ö", "ç", "."]];
  const FINGER = {};
  [["qaz", 0], ["wsx", 1], ["edc", 2], ["rfvtgb", 3], ["yhnujm", 4], ["ıkö", 5], ["olç", 6], ["pş.ğiü", 7]].forEach(([s, f]) => [...s].forEach(ch => (FINGER[ch] = f)));
  FINGER[" "] = 8;
  const FINGER_NM = ["sol serçe parmak", "sol yüzük parmağı", "sol orta parmak", "sol işaret parmağı", "sağ işaret parmağı", "sağ orta parmak", "sağ yüzük parmağı", "sağ serçe parmak", "başparmak"];
  const HOME = new Set(["a", "s", "d", "f", "j", "k", "l", "ş"]);
  const LESSONS = [
    { id: "ana", nm: "Ana sıra", ic: "🏠", keys: "asdfjklş" },
    { id: "ana2", nm: "Ana sıra + G H İ", ic: "🏡", keys: "asdfghjklşi" },
    { id: "ust", nm: "Üst sıra", ic: "⬆️", keys: "qwertyuıopğü", mix: "asdfjkl" },
    { id: "alt", nm: "Alt sıra", ic: "⬇️", keys: "zxcvbnmöç", mix: "asdfjkl" },
    { id: "kelime", nm: "Kelimeler", ic: "📝", words: true },
    { id: "cumle", nm: "Cümleler", ic: "💬", sentences: true },
  ];

  /* ---------- kayıt ---------- */
  let SAVE = { best: 0, bestWpm: 0, lessons: {} };
  try { SAVE = Object.assign(SAVE, JSON.parse(localStorage.getItem(SAVE_KEY) || "{}")); } catch (e) {}
  const store = () => { try { localStorage.setItem(SAVE_KEY, JSON.stringify(SAVE)); } catch (e) {} };

  /* ---------- ses ---------- */
  let AC = null;
  function audio() { try { AC = AC || new (window.AudioContext || window.webkitAudioContext)(); if (AC.state === "suspended") AC.resume(); } catch (e) {} }
  function tone(f, d = 0.06, type = "square", vol = 0.04, slide = 0) {
    if (!AC) return;
    const t = AC.currentTime, o = AC.createOscillator(), g = AC.createGain();
    o.type = type; o.frequency.setValueAtTime(f, t); if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(30, f + slide), t + d);
    g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + d);
    o.connect(g).connect(AC.destination); o.start(t); o.stop(t + d + 0.02);
  }
  const SND = { key: () => tone(900 + Math.random() * 200, 0.03, "square", 0.025), bad: () => tone(160, 0.12, "sawtooth", 0.04),
    boom: () => { tone(220, 0.25, "sawtooth", 0.05, -150); tone(880, 0.1, "triangle", 0.04, 400); }, hit: () => tone(120, 0.5, "sawtooth", 0.07, -80),
    level: () => [523, 659, 784].forEach((f, i) => setTimeout(() => tone(f, 0.15, "triangle", 0.06), i * 100)) };

  /* ---------- ninja modu ---------- */
  const LW = 800, LH = 600;
  let N = null;
  function startNinja() {
    N = { words: [], target: null, t: 0, spawn: 0.5, level: 1, lives: 3, score: 0, combo: 0, maxCombo: 0, killed: 0, typed: 0, errors: 0, fx: [], over: false, shake: 0, lvlMsg: 1.5, start: performance.now() };
    mode = "ninja"; $("lesson").hidden = true; $("menu").hidden = true; $("over").hidden = true;
    focusInput();
  }
  function pickWord() {
    const L = N.level, maxLen = L <= 2 ? 4 : L <= 4 ? 5 : L <= 6 ? 7 : 20, minLen = L <= 4 ? 3 : L <= 7 ? 4 : 5;
    const used = new Set(N.words.map(w => w.text[0]));
    const pool = WORDS.filter(w => w.length >= minLen && w.length <= maxLen && !used.has(w[0]) && !N.words.some(o => o.text === w));
    return pool.length ? pool[Math.floor(Math.random() * pool.length)] : null;
  }
  function ninjaUpdate(dt) {
    if (!N || N.over) return;
    N.t += dt; N.lvlMsg = Math.max(0, N.lvlMsg - dt); N.shake = Math.max(0, N.shake - dt);
    N.spawn -= dt;
    if (N.spawn <= 0) {
      const text = pickWord();
      if (text) {
        ctx.font = "700 24px 'JetBrains Mono', monospace";
        const w = ctx.measureText(text).width;
        N.words.push({ text, typed: 0, x: 40 + w / 2 + Math.random() * (LW - 80 - w), y: -20, v: (22 + N.level * 7) * (0.85 + Math.random() * 0.3) });
      }
      N.spawn = Math.max(0.85, 2.7 - N.level * 0.17);
    }
    for (const w of N.words) w.y += w.v * dt;
    const hitY = LH - 70;
    for (const w of N.words.filter(w => w.y > hitY)) {
      N.words = N.words.filter(o => o !== w); if (N.target === w) N.target = null;
      N.lives--; N.combo = 0; N.shake = 0.5; SND.hit();
      boom(w.x, hitY, "#FF6B8A", 26);
      if (N.lives <= 0) { endNinja(); return; }
    }
    for (const f of N.fx) { f.t += dt; f.x += f.vx * dt; f.y += f.vy * dt; f.vy += 300 * dt; }
    N.fx = N.fx.filter(f => f.t < f.life);
  }
  function boom(x, y, col, n) { for (let i = 0; i < n; i++) { const a = Math.random() * 6.28, v = 60 + Math.random() * 240; N.fx.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 80, t: 0, life: 0.6 + Math.random() * 0.4, col }); } }
  function ninjaKey(ch) {
    if (!N || N.over) return;
    if (!N.target) {
      const cand = N.words.filter(w => w.text[0] === ch).sort((a, b) => b.y - a.y)[0];
      if (!cand) { N.errors++; N.combo = 0; SND.bad(); return; }
      N.target = cand;
    }
    const w = N.target;
    if (w.text[w.typed] === ch) {
      w.typed++; N.typed++; SND.key();
      if (w.typed === w.text.length) {
        N.words = N.words.filter(o => o !== w); N.target = null;
        N.combo++; N.maxCombo = Math.max(N.maxCombo, N.combo); N.killed++;
        N.score += w.text.length * 10 * (1 + Math.floor(N.combo / 5));
        SND.boom(); boom(w.x, w.y, "#FFD166", 18);
        if (N.killed % 8 === 0) { N.level++; N.lvlMsg = 1.5; SND.level(); }
      }
    } else { N.errors++; N.combo = 0; SND.bad(); }
  }
  function endNinja() {
    N.over = true;
    const mins = Math.max(0.1, (performance.now() - N.start) / 60000), wpm = Math.round(N.typed / 5 / mins);
    const acc = N.typed + N.errors ? Math.round(N.typed / (N.typed + N.errors) * 100) : 0;
    const rec = N.score > SAVE.best; if (rec) SAVE.best = N.score; SAVE.bestWpm = Math.max(SAVE.bestWpm, wpm); store();
    showOver("☄️", `Seviye ${N.level}'e kadar dayandın!`, [["Puan", N.score], ["Kelime/dk", wpm], ["Doğruluk", acc + "%"]], rec ? "🎉 Yeni rekor!" : `Rekor: ${SAVE.best}`);
  }
  function drawNinja() {
    const W = cv.width / dpr, H = cv.height / dpr, s = Math.min(W / LW, H / LH), ox = (W - LW * s) / 2, oy = (H - LH * s) / 2;
    const sh = N.shake ? (Math.random() - 0.5) * 10 * N.shake : 0;
    ctx.setTransform(dpr * s, 0, 0, dpr * s, dpr * (ox + sh), dpr * oy);
    // gökyüzü ve yıldızlar
    const g = ctx.createLinearGradient(0, 0, 0, LH); g.addColorStop(0, "#0B1024"); g.addColorStop(1, "#2B1C4E");
    ctx.fillStyle = g; ctx.fillRect(0, 0, LW, LH);
    ctx.fillStyle = "rgba(255,255,255,.6)";
    for (let i = 0; i < 60; i++) ctx.fillRect((i * 137) % LW, (i * 71) % (LH - 150), 2, 2);
    // şehir
    for (let i = 0; i < 14; i++) {
      const bw = LW / 14, h = 40 + ((i * 53) % 60);
      ctx.fillStyle = "#1A2350"; ctx.fillRect(i * bw + 2, LH - 70 - h + 40, bw - 4, h + 30);
      ctx.fillStyle = "#FFD166";
      for (let y = LH - 70 - h + 50; y < LH - 40; y += 14) for (let x = i * bw + 8; x < (i + 1) * bw - 10; x += 12) if ((x * 7 + y) % 5) ctx.fillRect(x, y, 5, 6);
    }
    ctx.fillStyle = "#2F3A7A"; ctx.fillRect(0, LH - 30, LW, 30);
    // kalkan
    ctx.strokeStyle = `rgba(77,171,247,${0.25 + 0.15 * N.lives})`; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(0, LH - 70); ctx.lineTo(LW, LH - 70); ctx.stroke();
    // meteorlar
    ctx.font = "700 24px 'JetBrains Mono', monospace"; ctx.textAlign = "left"; ctx.textBaseline = "middle";
    for (const w of N.words) {
      const tw = ctx.measureText(w.text).width, x0 = w.x - tw / 2, tgt = w === N.target;
      ctx.fillStyle = "rgba(255,122,47,.35)"; ctx.beginPath(); ctx.moveTo(w.x - 12, w.y - 20); ctx.lineTo(w.x, w.y - 70); ctx.lineTo(w.x + 12, w.y - 20); ctx.fill();
      ctx.fillStyle = tgt ? "#FF7A2F" : "#8A4B2A"; ctx.beginPath(); ctx.arc(w.x, w.y - 22, 11, 0, 7); ctx.fill();
      ctx.fillStyle = tgt ? "rgba(255,209,102,.25)" : "rgba(10,14,36,.8)";
      ctx.beginPath(); ctx.roundRect ? ctx.roundRect(x0 - 8, w.y - 16, tw + 16, 32, 8) : ctx.rect(x0 - 8, w.y - 16, tw + 16, 32); ctx.fill();
      if (tgt) { ctx.strokeStyle = "#FFD166"; ctx.lineWidth = 2; ctx.stroke(); }
      const a = w.text.slice(0, w.typed), b = w.text.slice(w.typed);
      ctx.fillStyle = "#69DB7C"; ctx.fillText(a, x0, w.y);
      ctx.fillStyle = "#fff"; ctx.fillText(b, x0 + ctx.measureText(a).width, w.y);
    }
    for (const f of N.fx) { ctx.globalAlpha = Math.max(0, 1 - f.t / f.life); ctx.fillStyle = f.col; ctx.fillRect(f.x - 3, f.y - 3, 6, 6); }
    ctx.globalAlpha = 1;
    // üst bilgi
    ctx.font = "800 22px Rubik, sans-serif"; ctx.textBaseline = "top"; ctx.fillStyle = "#fff"; ctx.textAlign = "left";
    ctx.fillText(`${N.score}`, 14, 12);
    ctx.font = "700 14px Rubik, sans-serif"; ctx.fillStyle = "#8E96C2"; ctx.fillText(`Seviye ${N.level}`, 14, 40);
    ctx.textAlign = "right"; ctx.font = "22px sans-serif"; ctx.fillText("🛡️".repeat(N.lives), LW - 12, 12);
    if (N.combo >= 3) { ctx.font = "800 18px Rubik, sans-serif"; ctx.fillStyle = "#FFD166"; ctx.fillText(`${N.combo} kombo${N.combo >= 5 ? ` · ×${1 + Math.floor(N.combo / 5)}` : ""}`, LW - 12, 44); }
    if (N.lvlMsg > 0) { ctx.globalAlpha = Math.min(1, N.lvlMsg * 2); ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.font = "800 44px Rubik, sans-serif"; ctx.fillStyle = "#FFD166"; ctx.fillText(`Seviye ${N.level}`, LW / 2, LH / 2 - 40); ctx.globalAlpha = 1; }
    if (N.t < 4) { ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.font = "700 16px Rubik, sans-serif"; ctx.fillStyle = "#8E96C2"; ctx.fillText("Düşen kelimeyi yaz! (Tablette ekrana dokun, klavye açılsın)", LW / 2, LH - 15); }
  }

  /* ---------- dersler ---------- */
  let L = null;
  function startLesson(i) {
    const D = LESSONS[i];
    let text;
    if (D.sentences) text = shuffle(SENTENCES.slice()).slice(0, 3).join(" ");
    else if (D.words) text = shuffle(WORDS.filter(w => w.length <= 7).slice()).slice(0, 10).join(" ");
    else {
      const groups = [], pool = [...D.keys], mix = D.mix ? [...D.mix] : [];
      for (let g = 0; g < 10; g++) {
        const len = 3 + Math.floor(Math.random() * 3); let s = "";
        for (let k = 0; k < len; k++) s += Math.random() < 0.75 || !mix.length ? pool[Math.floor(Math.random() * pool.length)] : mix[Math.floor(Math.random() * mix.length)];
        groups.push(s);
      }
      text = groups.join(" ");
    }
    L = { i, D, text, pos: 0, errors: 0, errAt: new Set(), start: 0, done: false };
    mode = "lesson"; N = null;
    $("lesson").hidden = false; $("menu").hidden = true; $("over").hidden = true;
    $("l-title").textContent = `${D.ic} ${D.nm}`;
    renderKb(); renderLesson();
    focusInput();
  }
  function shuffle(a) { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }
  function renderKb() {
    $("kb").innerHTML = ROWS.map(r => `<div class="row">${r.map(k => `<div class="k f${FINGER[k]}${HOME.has(k) ? " home" : ""}" data-k="${k}">${k.toLocaleUpperCase("tr-TR")}</div>`).join("")}</div>`).join("") +
      `<div class="row" style="justify-content:center;padding-left:0"><div class="k space f8" data-k=" ">boşluk</div></div>`;
  }
  function renderLesson() {
    const t = L.text;
    let html = "";
    for (let i = 0; i < t.length; i++) {
      const ch = t[i] === " " ? "␣" : t[i];
      const cls = i < L.pos ? (L.errAt.has(i) ? "done err" : "done") : i === L.pos ? "cur" : "todo";
      html += `<span class="${cls}">${t[i] === " " && i !== L.pos ? " " : ch}</span>`;
    }
    $("l-text").innerHTML = html;
    const next = t[L.pos];
    document.querySelectorAll(".kb .k").forEach(k => k.classList.toggle("next", k.dataset.k === next));
    const mins = L.start ? (performance.now() - L.start) / 60000 : 0;
    const wpm = mins > 0.05 ? Math.round(L.pos / 5 / mins) : 0, acc = L.pos + L.errors ? Math.round(L.pos / (L.pos + L.errors) * 100) : 100;
    $("l-stats").textContent = `${L.pos}/${t.length} · ${wpm} kelime/dk · %${acc} doğru`;
    $("l-tip").textContent = next !== undefined ? `Sıradaki: ${next === " " ? "boşluk" : next.toLocaleUpperCase("tr-TR")} → ${FINGER_NM[FINGER[next] ?? 8]}` : "";
  }
  function lessonKey(ch) {
    if (!L || L.done) return;
    if (!L.start) L.start = performance.now();
    if (ch === L.text[L.pos]) { L.pos++; SND.key(); }
    else { L.errors++; L.errAt.add(L.pos); SND.bad(); }
    renderLesson();
    if (L.pos >= L.text.length) {
      L.done = true;
      const mins = Math.max(0.05, (performance.now() - L.start) / 60000), wpm = Math.round(L.text.length / 5 / mins);
      const acc = Math.round(L.text.length / (L.text.length + L.errors) * 100);
      const stars = acc >= 95 ? (wpm >= 20 ? 3 : 2) : acc >= 85 ? 1 : 0;
      const prev = SAVE.lessons[L.D.id] || { stars: 0, wpm: 0 };
      SAVE.lessons[L.D.id] = { stars: Math.max(prev.stars, stars), wpm: Math.max(prev.wpm, wpm) }; store();
      showOver(stars ? "⭐" : "💪", stars ? "Ders tamam!" : "Biraz daha pratik!", [["Kelime/dk", wpm], ["Doğruluk", acc + "%"], ["Hata", L.errors]],
        (stars ? "★".repeat(stars) + "☆".repeat(3 - stars) : "Doğruluk %85'i geçince yıldız kazanırsın.") + (stars < 3 && acc >= 95 ? " · 3 yıldız için dakikada 20 kelime!" : ""));
    }
  }

  /* ---------- ortak ---------- */
  let mode = "menu", dpr = 1;
  function showOver(icon, title, stats, text) {
    $("over-icon").textContent = icon; $("over-title").textContent = title;
    $("over-stats").innerHTML = stats.map(([a, b]) => `<div><small>${a}</small><b>${b}</b></div>`).join("");
    $("over-text").textContent = text;
    setTimeout(() => { $("over").hidden = false; $("over-again").focus(); }, 400);
  }
  function renderMenu() {
    $("best").textContent = SAVE.best ? `Rekor ${SAVE.best} · ${SAVE.bestWpm} k/dk` : "";
    $("lessons").innerHTML = LESSONS.map((D, i) => { const s = SAVE.lessons[D.id]; return `<button class="mode-btn" type="button" data-i="${i}"><span>${D.ic}</span><b>${D.nm}</b><small>${s ? "★".repeat(s.stars) || s.wpm + " k/dk" : ""}</small></button>`; }).join("");
    $("lessons").querySelectorAll(".mode-btn").forEach(b => b.addEventListener("click", () => { audio(); startLesson(+b.dataset.i); }));
  }
  function handleChar(raw) {
    if (!raw || raw.length !== 1) return false;
    const ch = low(raw);
    if (mode === "ninja") { if (ch === " ") return true; ninjaKey(ch); return true; }
    if (mode === "lesson") { lessonKey(ch); return true; }
    return false;
  }
  document.addEventListener("keydown", (e) => {
    if (!$("menu").hidden || !$("over").hidden || e.ctrlKey || e.metaKey || e.altKey) return;
    if (e.key === "Escape") { openMenu(); return; }
    if (e.key.length === 1 && handleChar(e.key)) e.preventDefault();
  });
  // dokunmatik klavyeler (keydown "Unidentified" gelebilir)
  $("hidden-input").addEventListener("input", (e) => { const v = e.target.value; e.target.value = ""; for (const ch of v) handleChar(ch); });
  function focusInput() { try { if (matchMedia("(pointer:coarse)").matches) $("hidden-input").focus({ preventScroll: true }); } catch (e) {} }
  stage.addEventListener("pointerdown", () => { audio(); if (mode !== "menu") $("hidden-input").focus({ preventScroll: true }); });
  function openMenu() { if (N) N.over = true; mode = "menu"; renderMenu(); $("over").hidden = true; $("menu").hidden = false; }
  $("menu-btn").addEventListener("click", openMenu);
  $("play").addEventListener("click", () => { audio(); startNinja(); });
  $("over-again").addEventListener("click", () => { audio(); if (L && mode === "lesson") startLesson(L.i); else startNinja(); });
  $("over-menu").addEventListener("click", openMenu);

  function resize() { const r = stage.getBoundingClientRect(); dpr = Math.min(2, window.devicePixelRatio || 1); cv.width = Math.round(r.width * dpr); cv.height = Math.round(r.height * dpr); }
  let last = performance.now(), W0 = 0, H0 = 0;
  function loop(now) {
    const dt = Math.min(0.05, (now - last) / 1000); last = now;
    const r = stage.getBoundingClientRect(); if (Math.abs(r.width - W0) > 0.5 || Math.abs(r.height - H0) > 0.5) { W0 = r.width; H0 = r.height; resize(); }
    ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.clearRect(0, 0, cv.width, cv.height);
    if (mode === "ninja" && N) { if ($("over").hidden) ninjaUpdate(dt); drawNinja(); }
    requestAnimationFrame(loop);
  }
  renderMenu();
  requestAnimationFrame(loop);

  // test kancası
  window.__kn2 = { get N() { return N; }, get L() { return L; }, startNinja, startLesson, ninjaKey, lessonKey, ninjaUpdate, WORDS, FINGER, ROWS, handleChar };
})();
