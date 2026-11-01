/* Kelime Avı — Enes için Türkçe kelime bulmaca */
(() => {
  "use strict";
  const $ = (id) => document.getElementById(id);
  const SAVE_KEY = "kelime-avi";
  const ABC = "ABCÇDEFGĞHIİJKLMNOÖPRSŞTUÜVYZ";
  const THEMES = [
    ["Hayvanlar", ["KEDİ", "KÖPEK", "ASLAN", "ZÜRAFA", "PENGUEN", "TİMSAH", "KARTAL", "YUNUS", "TAVŞAN", "KAPLAN", "SİNCAP", "BAYKUŞ", "KURT", "AYI"]],
    ["Uzay", ["GÜNEŞ", "DÜNYA", "MARS", "AY", "YILDIZ", "ROKET", "UYDU", "GEZEGEN", "ASTRONOT", "JÜPİTER", "SATÜRN", "KUYRUKLU", "TELESKOP", "UZAY"]],
    ["Spor", ["FUTBOL", "BASKETBOL", "VOLEYBOL", "TENİS", "YÜZME", "GÜREŞ", "KOŞU", "KAYAK", "BOKS", "HENTBOL", "OKÇULUK", "GOL", "TOP", "HAKEM"]],
    ["Okul", ["KALEM", "SİLGİ", "DEFTER", "KİTAP", "ÇANTA", "TAHTA", "SINIF", "ÖDEV", "SINAV", "CETVEL", "MÜDÜR", "TENEFÜS", "KANTİN", "ÖĞRETMEN"]],
    ["Yiyecekler", ["ELMA", "EKMEK", "PİZZA", "MAKARNA", "ÇORBA", "PİLAV", "KÖFTE", "BÖREK", "BAKLAVA", "SİMİT", "PEYNİR", "ZEYTİN", "MANTI", "AYRAN"]],
    ["Doğa", ["DENİZ", "ORMAN", "DAĞ", "NEHİR", "ŞELALE", "VOLKAN", "ÇÖL", "MAĞARA", "BULUT", "YAĞMUR", "KAR", "RÜZGAR", "GÖL", "ADA"]],
    ["Teknoloji", ["BİLGİSAYAR", "TELEFON", "ROBOT", "KLAVYE", "FARE", "EKRAN", "OYUN", "KOD", "İNTERNET", "TABLET", "KAMERA", "PİL", "ŞARJ", "UYGULAMA"]],
    ["Türkiye", ["İSTANBUL", "ANKARA", "İZMİR", "BURSA", "ANTALYA", "KONYA", "TRABZON", "RİZE", "VAN", "KARS", "EDİRNE", "BOLU", "ADANA", "SAMSUN"]]
  ];
  const LV = [{ n: 8, words: 6, dirs: [[1, 0], [0, 1]] }, { n: 10, words: 8, dirs: [[1, 0], [0, 1], [1, 1], [1, -1]] }, { n: 12, words: 10, dirs: [[1, 0], [0, 1], [1, 1], [1, -1], [-1, 0], [0, -1], [-1, -1], [-1, 1]] }];
  const HUES = [200, 140, 30, 280, 0, 60, 320, 170, 100, 240];

  let save = { best: {} };
  try { save = Object.assign(save, JSON.parse(localStorage.getItem(SAVE_KEY) || "{}")); } catch (e) {}
  const persist = () => { try { localStorage.setItem(SAVE_KEY, JSON.stringify(save)); } catch (e) {} };

  let AC = null;
  function audio() { try { AC = AC || new (window.AudioContext || window.webkitAudioContext)(); if (AC.state === "suspended") AC.resume(); } catch (e) {} }
  function snd(f, d, type, vol, delay) {
    if (!AC) return;
    const t = AC.currentTime + (delay || 0), o = AC.createOscillator(), g = AC.createGain();
    o.type = type || "triangle"; o.frequency.setValueAtTime(f, t);
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol || 0.05, t + 0.01); g.gain.exponentialRampToValueAtTime(0.0001, t + d);
    o.connect(g).connect(AC.destination); o.start(t); o.stop(t + d + 0.02);
  }

  let G = null, lv = 1, timer = null;
  function build(l) {
    const L = LV[l];
    for (let attempt = 0; attempt < 50; attempt++) {
      const [tname, pool] = THEMES[Math.floor(Math.random() * THEMES.length)];
      const words = pool.filter(w => w.length <= L.n).sort(() => Math.random() - 0.5).slice(0, L.words).sort((a, b) => b.length - a.length);
      const grid = Array.from({ length: L.n }, () => new Array(L.n).fill(null)), placed = [];
      let ok = true;
      for (const w of words) {
        let done = false;
        for (let t = 0; t < 300 && !done; t++) {
          const [dx, dy] = L.dirs[Math.floor(Math.random() * L.dirs.length)];
          const x0 = Math.floor(Math.random() * L.n), y0 = Math.floor(Math.random() * L.n);
          const x1 = x0 + dx * (w.length - 1), y1 = y0 + dy * (w.length - 1);
          if (x1 < 0 || y1 < 0 || x1 >= L.n || y1 >= L.n) continue;
          let fits = true;
          for (let i = 0; i < w.length; i++) { const c = grid[y0 + dy * i][x0 + dx * i]; if (c && c !== w[i]) { fits = false; break; } }
          if (!fits) continue;
          for (let i = 0; i < w.length; i++) grid[y0 + dy * i][x0 + dx * i] = w[i];
          placed.push({ w, x0, y0, x1, y1, got: false }); done = true;
        }
        if (!done) { ok = false; break; }
      }
      if (!ok) continue;
      for (let y = 0; y < L.n; y++) for (let x = 0; x < L.n; x++) if (!grid[y][x]) grid[y][x] = ABC[Math.floor(Math.random() * ABC.length)];
      return { theme: tname, grid, words: placed };
    }
    return null;
  }
  function newGame(l) {
    lv = l; let b = null; while (!b) b = build(l);
    G = Object.assign(b, { n: LV[l].n, t0: performance.now(), sec: 0, over: false, sel: null, hl: [] });
    $("menu").hidden = true; $("over").hidden = true; $("msg").textContent = "";
    clearInterval(timer); timer = setInterval(tick, 500);
    render();
  }
  const fmt = (s) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}`;
  function tick() { if (!G || G.over) return; G.sec = (performance.now() - G.t0) / 1000; $("time").textContent = fmt(G.sec); }

  function render() {
    const gr = $("grid"); gr.textContent = ""; gr.style.setProperty("--n", G.n);
    for (let y = 0; y < G.n; y++) for (let x = 0; x < G.n; x++) {
      const c = document.createElement("div"); c.className = "cell"; c.textContent = G.grid[y][x]; c.dataset.x = x; c.dataset.y = y;
      gr.appendChild(c);
    }
    G.words.forEach((w, i) => { if (w.got) drawHl(w.x0, w.y0, w.x1, w.y1, `hsla(${HUES[i % HUES.length]},80%,55%,.55)`); });
    $("theme").textContent = G.theme;
    $("wl").innerHTML = G.words.map(w => `<span class="${w.got ? "got" : ""}">${w.w}</span>`).join("");
    $("found").textContent = `${G.words.filter(w => w.got).length}/${G.words.length}`;
    $("best").textContent = save.best["l" + lv] ? fmt(save.best["l" + lv]) : "—";
  }
  function cellEl(x, y) { return $("grid").children[y * G.n + x]; }
  function drawHl(x0, y0, x1, y1, color, cls) {
    const a = cellEl(x0, y0), b = cellEl(x1, y1); if (!a || !b) return null;
    const ax = a.offsetLeft + a.offsetWidth / 2, ay = a.offsetTop + a.offsetHeight / 2, bx = b.offsetLeft + b.offsetWidth / 2, by = b.offsetTop + b.offsetHeight / 2;
    const len = Math.hypot(bx - ax, by - ay), h = a.offsetHeight * 0.78;
    const d = document.createElement("div"); d.className = "hl" + (cls ? " " + cls : "");
    if (color) d.style.background = color;
    Object.assign(d.style, { left: ax - h / 2 + "px", top: ay - h / 2 + "px", width: len + h + "px", height: h + "px", transformOrigin: `${h / 2}px 50%`, transform: `rotate(${Math.atan2(by - ay, bx - ax)}rad)` });
    $("grid").appendChild(d);
    return d;
  }
  // seçim: aynı çizgide (yatay/dikey/çapraz) mı
  function line(x0, y0, x1, y1) {
    const dx = x1 - x0, dy = y1 - y0;
    if (dx === 0 && dy === 0) return [[x0, y0]];
    if (!(dx === 0 || dy === 0 || Math.abs(dx) === Math.abs(dy))) return null;
    const n = Math.max(Math.abs(dx), Math.abs(dy)), sx = Math.sign(dx), sy = Math.sign(dy), out = [];
    for (let i = 0; i <= n; i++) out.push([x0 + sx * i, y0 + sy * i]);
    return out;
  }
  function check(x0, y0, x1, y1) {
    if (!G || G.over) return false;
    const pts = line(x0, y0, x1, y1); if (!pts || pts.length < 2) return false;
    const s = pts.map(([x, y]) => G.grid[y][x]).join("");
    const w = G.words.find(w => !w.got && ((w.x0 === x0 && w.y0 === y0 && w.x1 === x1 && w.y1 === y1) || (w.x0 === x1 && w.y0 === y1 && w.x1 === x0 && w.y1 === y0) || (s === w.w || [...s].reverse().join("") === w.w)));
    if (!w) { snd(200, 0.12, "sine"); $("msg").textContent = `“${s}” listede yok.`; return false; }
    w.got = true; w.x0 = x0; w.y0 = y0; w.x1 = x1; w.y1 = y1;
    if ([...s].reverse().join("") === w.w && s !== w.w) { w.x0 = x1; w.y0 = y1; w.x1 = x0; w.y1 = y0; }
    snd(660, 0.08); snd(990, 0.12, "triangle", 0.05, 0.07);
    $("msg").textContent = `✔ ${w.w}`;
    render();
    if (G.words.every(w => w.got)) finish();
    return true;
  }
  function finish() {
    G.over = true; clearInterval(timer); tick();
    const k = "l" + lv, sec = Math.round(G.sec), nb = !save.best[k] || sec < save.best[k];
    if (nb) { save.best[k] = sec; persist(); }
    [523, 659, 784, 1046].forEach((f, i) => snd(f, 0.2, "triangle", 0.06, i * 0.1));
    $("o-title").textContent = `Hepsini ${fmt(sec)} sürede buldun!`;
    $("o-tx").textContent = nb ? "Yeni rekor! 🎉" : `Rekor: ${fmt(save.best[k])}`;
    setTimeout(() => { $("over").hidden = false; }, 600);
  }

  /* ---------- sürükleme ve dokunma ---------- */
  let drag = null, tapStart = null;
  const cellAt = (e) => { const el = document.elementFromPoint(e.clientX, e.clientY); return el && el.classList && el.classList.contains("cell") ? [+el.dataset.x, +el.dataset.y] : null; };
  $("grid").addEventListener("pointerdown", (e) => {
    const c = cellAt(e); if (!c || !G || G.over) return; audio();
    drag = { x0: c[0], y0: c[1], x1: c[0], y1: c[1], el: null };
    try { $("grid").setPointerCapture(e.pointerId); } catch (_) {}
    show();
  });
  $("grid").addEventListener("pointermove", (e) => { if (!drag) return; const c = cellAt(e); if (!c) return; if (line(drag.x0, drag.y0, c[0], c[1])) { drag.x1 = c[0]; drag.y1 = c[1]; show(); } });
  $("grid").addEventListener("pointerup", () => {
    if (!drag) return;
    const d = drag; drag = null; if (d.el) d.el.remove();
    if (d.x0 === d.x1 && d.y0 === d.y1) {
      // iki dokunuşla seçim
      if (tapStart && line(tapStart[0], tapStart[1], d.x0, d.y0)) { const t = tapStart; tapStart = null; clearTap(); check(t[0], t[1], d.x0, d.y0); }
      else { tapStart = [d.x0, d.y0]; clearTap(); cellEl(d.x0, d.y0).classList.add("sel"); tapEl = drawHl(d.x0, d.y0, d.x0, d.y0, null, "cur"); }
      return;
    }
    tapStart = null; clearTap(); check(d.x0, d.y0, d.x1, d.y1);
  });
  let tapEl = null;
  function clearTap() { if (tapEl) { tapEl.remove(); tapEl = null; } document.querySelectorAll(".cell.sel").forEach(c => c.classList.remove("sel")); }
  function show() { if (drag.el) drag.el.remove(); drag.el = drawHl(drag.x0, drag.y0, drag.x1, drag.y1, null, "cur"); }

  $("start").addEventListener("click", () => { audio(); newGame(+document.querySelector('input[name="lv"]:checked').value); });
  $("again").addEventListener("click", () => { audio(); newGame(lv); });
  $("new").addEventListener("click", () => { $("best-line").textContent = Object.keys(save.best).length ? "Rekorlar: " + ["Kolay", "Normal", "Zor"].map((n, i) => save.best["l" + i] ? `${n} ${fmt(save.best["l" + i])}` : null).filter(Boolean).join(" · ") : ""; $("menu").hidden = false; });
  window.addEventListener("resize", () => { if (G) render(); });
  newGame(1); $("menu").hidden = false;

  window.__ka = { build, check, newGame, line, get G() { return G; } };
})();
