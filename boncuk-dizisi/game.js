/* Boncuk Dizisi — örüntü (desen) oyunu, Egemen için */
(() => {
  "use strict";
  const $ = (id) => document.getElementById(id);
  const SAVE_KEY = "boncuk-dizisi";
  const stage = $("stage");

  /* ---------- boncuklar ---------- */
  const COLORS = [
    { f: "#E5484D", l: "#FF9A9C", d: "#A3262B", nm: "kırmızı" },
    { f: "#3D8BFD", l: "#9CC5FF", d: "#1F57B0", nm: "mavi" },
    { f: "#F7C933", l: "#FFE891", d: "#B88E0E", nm: "sarı" },
    { f: "#2EB872", l: "#8EE6B6", d: "#1A7A49", nm: "yeşil" },
    { f: "#9B5DE5", l: "#D3B4FF", d: "#6232A3", nm: "mor" },
    { f: "#FF8A2F", l: "#FFC58F", d: "#B85512", nm: "turuncu" },
    { f: "#FF6FB5", l: "#FFC0DF", d: "#B83A78", nm: "pembe" },
  ];
  const SHAPES = { o: "yuvarlak", sq: "kare", st: "yıldız", he: "kalp", tr: "üçgen" };
  const SH = Object.keys(SHAPES);
  const SIZE_NM = ["küçük", "orta", "büyük"];
  const ANIMALS = [["🐱", "Kedi"], ["🐰", "Tavşan"], ["🐻", "Ayı"], ["🐼", "Panda"], ["🦊", "Tilki"], ["🐸", "Kurbağa"], ["🐨", "Koala"],
    ["🐵", "Maymun"], ["🦁", "Aslan"], ["🐯", "Kaplan"], ["🐮", "İnek"], ["🐶", "Köpek"], ["🐹", "Hamster"]];

  const B = (c, s = "o", z = 1) => ({ c, s, z });
  const same = (a, b) => a && b && a.c === b.c && a.s === b.s && a.z === b.z;
  const rnd = (n) => Math.floor(Math.random() * n);
  const shuffle = (a) => { for (let i = a.length - 1; i > 0; i--) { const j = rnd(i + 1); [a[i], a[j]] = [a[j], a[i]]; } return a; };
  const pick = (arr, k) => shuffle(arr.slice()).slice(0, k);
  const cols = (k) => pick([0, 1, 2, 3, 4, 5, 6], k);

  let gid = 0;
  function shapePath(s, k) {
    const r = 44 * k;
    if (s === "o") return `<circle r="${r}"/>`;
    if (s === "sq") return `<rect x="${-r * 0.88}" y="${-r * 0.88}" width="${r * 1.76}" height="${r * 1.76}" rx="${r * 0.32}"/>`;
    if (s === "st") {
      let p = ""; for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5, rr = i % 2 ? r * 0.5 : r * 1.08; p += (i ? "L" : "M") + (Math.cos(a) * rr).toFixed(1) + " " + (Math.sin(a) * rr + r * 0.08).toFixed(1); }
      return `<path d="${p}Z" stroke-linejoin="round"/>`;
    }
    if (s === "he") return `<path d="M0 ${r * 0.95} C ${-r * 1.4} ${r * 0.05} ${-r * 0.95} ${-r * 1.05} 0 ${-r * 0.42} C ${r * 0.95} ${-r * 1.05} ${r * 1.4} ${r * 0.05} 0 ${r * 0.95}Z"/>`;
    return `<path d="M0 ${-r * 1.0} L${r * 1.02} ${r * 0.78} L${-r * 1.02} ${r * 0.78}Z" stroke-linejoin="round"/>`;
  }
  function beadSVG(b) {
    const C = COLORS[b.c], k = [0.6, 0.86, 1.0][b.z], id = "g" + (++gid);
    return `<svg viewBox="-50 -50 100 100" aria-hidden="true"><defs><radialGradient id="${id}" cx="35%" cy="30%" r="80%"><stop offset="0" stop-color="${C.l}"/><stop offset=".55" stop-color="${C.f}"/><stop offset="1" stop-color="${C.d}"/></radialGradient></defs>
      <g fill="url(#${id})" stroke="${C.d}" stroke-width="3">${shapePath(b.s, k)}</g>
      <circle r="${5 * k + 1}" fill="rgba(60,30,10,.35)"/><ellipse cx="${-14 * k}" cy="${-17 * k}" rx="${11 * k}" ry="${6 * k}" fill="rgba(255,255,255,.55)" transform="rotate(-30 ${-14 * k} ${-17 * k})"/></svg>`;
  }

  /* ---------- desen seviyeleri ---------- */
  const GENS = [
    () => { const [a, b] = cols(2); return { kind: "color", unit: [B(a), B(b)], n: 8, miss: [7], extra: [] }; },
    () => { const [a, b, c] = cols(3); return { kind: "color", unit: [B(a), B(b)], n: 10, miss: [8, 9], extra: [B(c)] }; },
    () => { const [a, b, c] = cols(3); return { kind: "color", unit: [B(a), B(a), B(b)], n: 9, miss: [8], extra: [B(c)] }; },
    () => { const [a, b, c, d] = cols(4); return { kind: "color", unit: [B(a), B(b), B(c)], n: 9, miss: [7, 8], extra: [B(d)] }; },
    () => { const [c] = cols(1), [s0, s1, s2] = pick(SH.filter(s => s !== "o"), 3); return { kind: "shape", unit: [B(c, s0), B(c, s1)], n: 8, miss: [7], extra: [B(c, s2)] }; },
    () => { const [a, b, c] = cols(3); return Math.random() < 0.5
      ? { kind: "color", unit: [B(a), B(b), B(b)], n: 9, miss: [8], extra: [B(c)] }
      : { kind: "color", unit: [B(a), B(a), B(b), B(b)], n: 12, miss: [10, 11], extra: [B(c)] }; },
    () => { const [a, b] = cols(2); return { kind: "size", unit: [B(a, "o", 2), B(a, "o", 0)], n: 8, miss: [7], extra: [B(b, "o", 2)] }; },
    () => { const [a, b, c, d] = cols(4); return { kind: "color", unit: [B(a), B(b), B(c)], n: 9, miss: [3 + rnd(5)], extra: [B(d)], middle: true }; },
    () => { const [a, b] = cols(2), [s0, s1] = pick(SH, 2); return { kind: "combo", unit: [B(a, s0), B(b, s1)], n: 8, miss: [6, 7], extra: [B(a, s1), B(b, s0)] }; },
    () => { const [a, b, c, d, e] = cols(5); return { kind: "color", unit: [B(a), B(b), B(c), B(d)], n: 12, miss: [10, 11], extra: [B(e)] }; },
  ];
  const PER_LEVEL = 3;
  function nameOf(b, kind) {
    if (kind === "shape") return SHAPES[b.s];
    if (kind === "size") return SIZE_NM[b.z];
    if (kind === "combo") return `${COLORS[b.c].nm} ${SHAPES[b.s]}`;
    return COLORS[b.c].nm;
  }

  /* ---------- kayıt ---------- */
  let SAVE = { lv: 0, prog: 0, stars: 0 };
  try { SAVE = Object.assign(SAVE, JSON.parse(localStorage.getItem(SAVE_KEY) || "{}")); } catch (e) {}
  const store = () => { try { localStorage.setItem(SAVE_KEY, JSON.stringify(SAVE)); } catch (e) {} };

  /* ---------- ses ---------- */
  let soundOn = true, AC = null, trVoice = null;
  function audio() { try { AC = AC || new (window.AudioContext || window.webkitAudioContext)(); if (AC.state === "suspended") AC.resume(); } catch (e) {} }
  function tone(f, d = 0.14, type = "triangle", vol = 0.07, slide = 0) {
    if (!soundOn || !AC) return;
    const t = AC.currentTime, o = AC.createOscillator(), g = AC.createGain();
    o.type = type; o.frequency.setValueAtTime(f, t);
    if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(40, f + slide), t + d);
    g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + d);
    o.connect(g).connect(AC.destination); o.start(t); o.stop(t + d + 0.02);
  }
  const sClick = (i) => tone(520 + i * 45, 0.12, "sine", 0.08);
  const sNo = () => tone(260, 0.25, "triangle", 0.07, -120);
  const sWin = () => [523, 659, 784, 1046, 1318].forEach((f, i) => setTimeout(() => tone(f, 0.22, "triangle", 0.07), i * 120));
  function pickVoice() { try { trVoice = speechSynthesis.getVoices().find(v => v.lang && v.lang.toLowerCase().startsWith("tr")) || trVoice; } catch (e) {} }
  if ("speechSynthesis" in window) { pickVoice(); speechSynthesis.onvoiceschanged = pickVoice; }
  function say(text, cancel = true) {
    if (!soundOn || !("speechSynthesis" in window)) return;
    try {
      if (cancel) speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(text); u.lang = "tr-TR"; u.rate = 0.92; u.pitch = 1.1;
      if (trVoice) u.voice = trVoice;
      speechSynthesis.speak(u);
    } catch (e) {}
  }

  /* ---------- durum ---------- */
  let S = null, mode = "pattern", freeColor = 0;

  function newNecklace() {
    const ai = S && S.animalIdx !== undefined ? (S.animalIdx + 1 + rnd(ANIMALS.length - 1)) % ANIMALS.length : rnd(ANIMALS.length);
    if (mode === "free") {
      S = { free: true, n: 10, pattern: [], fill: Array(10).fill(null), miss: [], tray: [], done: false, wrongs: 0, animalIdx: ai };
    } else {
      const lv = SAVE.lv, g = lv < GENS.length ? GENS[lv]() : GENS[2 + rnd(GENS.length - 2)]();
      const pattern = Array.from({ length: g.n }, (_, i) => g.unit[i % g.unit.length]);
      const fill = pattern.map((b, i) => (g.miss.includes(i) ? null : b));
      const tray = shuffle([...uniq(g.unit), ...g.extra]);
      S = { free: false, kind: g.kind, middle: !!g.middle, unitLen: g.unit.length, n: g.n, pattern, fill, miss: g.miss.slice().sort((a, b) => a - b), tray, done: false, wrongs: 0, animalIdx: ai };
    }
    $("string").classList.remove("done");
    $("animal").classList.remove("happy");
    $("animal").textContent = ANIMALS[S.animalIdx][0];
    $("next").hidden = true;
    $("done").hidden = mode !== "free"; $("undo").hidden = mode !== "free";
    $("repeat").hidden = mode === "free";
    layout(); renderTray(); renderInfo();
    setTimeout(intro, 350);
  }
  function uniq(arr) { const out = []; for (const b of arr) if (!out.some(x => same(x, b))) out.push(b); return out; }

  function intro() {
    if (!S) return;
    if (S.free) { say(`Kendi kolyeni yap! Renk seç, boncuklara dokun. ${ANIMALS[S.animalIdx][1]} bekliyor.`); return; }
    say(patternText());
  }
  function patternText() {
    const firstMiss = S.miss[0];
    // ortada boşluk varsa boşluğa kadar ve biraz sonrası; yoksa desenin ilk iki tekrarı
    const show = S.middle ? S.pattern.slice(0, Math.min(S.n, firstMiss + 2)).map((b, i) => (S.fill[i] ? nameOf(b, S.kind) : "boşluk"))
                          : S.pattern.slice(0, Math.min(firstMiss, Math.max(4, S.unitLen * 2))).map(b => nameOf(b, S.kind));
    return show.join(", ") + (S.middle ? "... Boşluğa hangisi gelir?" : "... Sırada hangisi var?");
  }

  /* ---------- geometri ---------- */
  let geo = null;
  function layout() {
    const r = stage.getBoundingClientRect(), W = r.width, H = r.height;
    if (!W || !H || !S) return;
    const A = Math.min(H * 0.3, W * 0.32, 160);
    const animal = $("animal"); animal.style.fontSize = A + "px"; animal.style.top = "0px";
    const ey = A * 0.98, cx = W / 2, nw = A * 0.26;
    let d = Math.min(W, H) * 0.12;
    let pts = [], total = 0;
    for (let iter = 0; iter < 3; iter++) {
      const by = H - d / 2 - 6, h = by - ey;
      const a = Math.min(W / 2 - d / 2 - 8, h * 1.25);
      const half = [], N = 60;
      const P0 = [cx - nw, ey], P1 = [cx - a * 1.08, ey + h * 0.12], P2 = [cx - a * 0.8, by], P3 = [cx, by];
      for (let i = 0; i <= N; i++) {
        const t = i / N, u = 1 - t;
        half.push([u * u * u * P0[0] + 3 * u * u * t * P1[0] + 3 * u * t * t * P2[0] + t * t * t * P3[0],
                   u * u * u * P0[1] + 3 * u * u * t * P1[1] + 3 * u * t * t * P2[1] + t * t * t * P3[1]]);
      }
      pts = half.concat(half.slice(0, -1).reverse().map(([x, y]) => [2 * cx - x, y]));
      total = 0; for (let i = 1; i < pts.length; i++) total += Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]);
      d = Math.min(total / (S.n + 0.8) * 0.94, Math.min(W, H) * 0.17, 88);
    }
    // boncuk yerleri: yay boyunca eşit aralık
    const pos = [], step = total / (S.n + 1);
    let acc = 0, k = 1;
    for (let i = 1; i < pts.length && pos.length < S.n; i++) {
      const seg = Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]);
      while (pos.length < S.n && acc + seg >= step * k) {
        const t = (step * k - acc) / seg;
        pos.push([pts[i - 1][0] + (pts[i][0] - pts[i - 1][0]) * t, pts[i - 1][1] + (pts[i][1] - pts[i - 1][1]) * t]);
        k++;
      }
      acc += seg;
    }
    geo = { W, H, d, pos };
    $("string-path").setAttribute("d", "M" + pts.map(p => p[0].toFixed(1) + " " + p[1].toFixed(1)).join(" L"));
    renderSlots();
  }

  function renderSlots() {
    const box = $("slots"); box.innerHTML = "";
    const nextIdx = nextTarget();
    S.fill.forEach((b, i) => {
      if (!b && S.done) return; // biten serbest kolyede boş halka kalmasın
      const el = document.createElement("div"), [x, y] = geo.pos[i];
      el.className = "slot" + (b ? "" : " empty") + (i === nextIdx && !S.done ? " next" : "");
      el.style.cssText = `left:${x - geo.d / 2}px;top:${y - geo.d / 2}px;width:${geo.d}px;height:${geo.d}px;--q:${Math.round(geo.d * 0.42)}px`;
      el.dataset.i = i;
      if (b) el.innerHTML = beadSVG(b);
      el.setAttribute("aria-label", b ? nameOf(b, S.kind || "combo") : "boş");
      box.appendChild(el);
    });
  }
  function nextTarget() { return S.free ? S.fill.indexOf(null) : S.miss.find(i => !S.fill[i]); }

  function renderTray() {
    const box = $("tray"); box.innerHTML = ""; box.classList.toggle("free", S.free);
    let beads = S.tray;
    if (S.free) {
      COLORS.forEach((c, i) => {
        const sw = document.createElement("button");
        sw.type = "button"; sw.className = "swatch" + (i === freeColor ? " on" : ""); sw.style.background = c.f;
        sw.setAttribute("aria-label", c.nm);
        sw.addEventListener("click", () => { freeColor = i; say(c.nm); renderTray(); });
        box.appendChild(sw);
      });
      const br = document.createElement("span"); br.className = "break"; box.appendChild(br);
      beads = SH.map(s => B(freeColor, s));
    }
    beads.forEach(b => {
      const el = document.createElement("button");
      el.type = "button"; el.className = "bead"; el.innerHTML = beadSVG(b);
      el.setAttribute("aria-label", nameOf(b, S.free ? "combo" : S.kind));
      el._bead = b;
      bindDrag(el, b);
      box.appendChild(el);
    });
  }
  function renderInfo() {
    const lv = SAVE.lv;
    $("level").textContent = mode === "free" ? "🎨 Serbest" : (lv < GENS.length ? `Seviye ${lv + 1}` : "🏅 Usta");
    $("dots").innerHTML = mode === "free" ? "" : Array.from({ length: PER_LEVEL }, (_, i) => `<i class="${i < SAVE.prog ? "on" : ""}"></i>`).join("");
    $("stars").textContent = `⭐ ${SAVE.stars}`;
    $("mode").textContent = mode === "free" ? "🎯" : "🎨";
    $("mode").setAttribute("aria-label", mode === "free" ? "Desen moduna dön" : "Serbest moda geç");
  }

  /* ---------- yerleştirme ---------- */
  function place(b, i) {
    if (!S || S.done) return false;
    if (i === undefined || i < 0) i = nextTarget();
    if (i === undefined || i < 0 || S.fill[i]) return false;
    if (!S.free && !S.miss.includes(i)) return false;
    if (!S.free && !same(b, S.pattern[i])) { wrong(i, b); return false; }
    S.fill[i] = b;
    const filled = S.fill.filter(Boolean).length;
    sClick(filled);
    renderSlots();
    const el = $("slots").children[i]; el.classList.add("pop");
    if (S.free) { if (S.fill.every(Boolean)) finishNecklace(); return true; }
    S.wrongs = 0;
    $("tray").querySelectorAll(".bead").forEach(x => x.classList.remove("hint"));
    if (S.miss.every(k => S.fill[k])) finishNecklace();
    else say(["Evet!", "Aferin!", "Doğru!"][rnd(3)] + " Bir tane daha.");
    return true;
  }
  let lastHint = 0;
  function wrong(i, b) {
    S.wrongs++;
    sNo();
    const el = $("slots").children[i]; el.classList.remove("shake"); void el.offsetWidth; el.classList.add("shake");
    const now = performance.now();
    if (now - lastHint > 1200) {
      lastHint = now;
      say(`Bu ${nameOf(b, S.kind)}. Bir daha bak: ` + patternText());
    }
    if (S.wrongs >= 2) {
      const want = S.pattern[i];
      $("tray").querySelectorAll(".bead").forEach(x => x.classList.toggle("hint", same(x._bead, want)));
    }
  }
  function finishNecklace() {
    S.done = true;
    renderSlots();
    $("string").classList.add("done");
    $("animal").classList.add("happy");
    hearts();
    sWin();
    const nm = ANIMALS[S.animalIdx][1];
    if (S.free) {
      say(`Ne güzel bir kolye! ${nm} bayıldı!`);
    } else {
      SAVE.stars++; SAVE.prog++;
      let up = false;
      if (SAVE.prog >= PER_LEVEL) { SAVE.prog = 0; SAVE.lv++; up = true; }
      store(); renderInfo();
      say(`Harika! Kolye tamam. ${nm} çok sevindi!` + (up ? " Yeni seviyeye geçtin!" : ""));
    }
    $("done").hidden = true; $("undo").hidden = true; $("repeat").hidden = true;
    $("next").hidden = false; setTimeout(() => $("next").focus(), 50);
  }
  function hearts() {
    const fx = $("fx"), a = $("animal").getBoundingClientRect(), s = stage.getBoundingClientRect();
    for (let i = 0; i < 10; i++) {
      const h = document.createElement("span"); h.className = "heart";
      h.textContent = ["💖", "⭐", "💛", "✨"][i % 4];
      h.style.left = (a.left - s.left + a.width * (0.1 + Math.random() * 0.8)) + "px";
      h.style.top = (a.top - s.top + a.height * (0.3 + Math.random() * 0.5)) + "px";
      h.style.animationDelay = (i * 0.08) + "s";
      fx.appendChild(h); setTimeout(() => h.remove(), 2400);
    }
  }

  /* ---------- dokunma / sürükleme ---------- */
  function bindDrag(el, b) {
    let st = null, ghost = null;
    el.addEventListener("pointerdown", (e) => {
      audio(); e.preventDefault();
      st = { x: e.clientX, y: e.clientY, moved: false };
      try { el.setPointerCapture(e.pointerId); } catch (_) {}
    });
    el.addEventListener("pointermove", (e) => {
      if (!st) return;
      if (!st.moved && Math.hypot(e.clientX - st.x, e.clientY - st.y) > 12) {
        st.moved = true;
        ghost = document.createElement("div"); ghost.className = "ghost"; ghost.innerHTML = beadSVG(b);
        ghost.style.width = ghost.style.height = (geo ? geo.d * 1.1 : 70) + "px";
        document.body.appendChild(ghost);
      }
      if (ghost) { ghost.style.left = e.clientX + "px"; ghost.style.top = e.clientY + "px"; }
    });
    const end = (e) => {
      if (!st) return;
      const wasMoved = st.moved; st = null;
      if (ghost) { ghost.remove(); ghost = null; }
      if (!wasMoved) { place(b); return; }
      // bırakılan yere en yakın boş yuva
      const r = stage.getBoundingClientRect(), x = e.clientX - r.left, y = e.clientY - r.top;
      let best = -1, bd = geo.d * 0.9;
      geo.pos.forEach(([px, py], i) => { const dd = Math.hypot(px - x, py - y); if (!S.fill[i] && dd < bd) { bd = dd; best = i; } });
      if (best >= 0) place(b, best);
    };
    el.addEventListener("pointerup", end);
    el.addEventListener("pointercancel", () => { st = null; if (ghost) { ghost.remove(); ghost = null; } });
    el.addEventListener("keydown", (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); audio(); place(b); } });
  }

  /* ---------- düğmeler ---------- */
  $("repeat").addEventListener("click", () => { audio(); if (S && !S.done) say(patternText()); });
  $("next").addEventListener("click", () => { audio(); newNecklace(); });
  $("undo").addEventListener("click", () => {
    if (!S || !S.free || S.done) return;
    const last = S.fill.map((b, i) => (b ? i : -1)).filter(i => i >= 0).pop();
    if (last !== undefined) { S.fill[last] = null; renderSlots(); tone(400, 0.1, "sine", 0.05, -100); }
  });
  $("done").addEventListener("click", () => {
    if (!S || !S.free || S.done) return;
    if (S.fill.filter(Boolean).length < 3) { say("Biraz daha boncuk tak!"); return; }
    finishNecklace();
  });
  $("mode").addEventListener("click", () => { audio(); mode = mode === "free" ? "pattern" : "free"; $("start").hidden = true; newNecklace(); });
  $("sound").addEventListener("click", () => {
    soundOn = !soundOn; $("ic-on").hidden = !soundOn; $("ic-off").hidden = soundOn;
    $("sound").setAttribute("aria-pressed", soundOn); $("sound").setAttribute("aria-label", soundOn ? "Sesi kapat" : "Sesi aç");
    if (!soundOn && "speechSynthesis" in window) speechSynthesis.cancel();
  });
  $("go").addEventListener("click", () => { audio(); pickVoice(); $("start").hidden = true; newNecklace(); });

  let rz = 0;
  new ResizeObserver(() => { cancelAnimationFrame(rz); rz = requestAnimationFrame(layout); }).observe(stage);
  window.addEventListener("resize", () => layout());

  // açılışta arka planda örnek bir kolye görünsün
  S = null; mode = "pattern";
  (function preview() {
    const g = GENS[Math.min(SAVE.lv, GENS.length - 1)]();
    const pattern = Array.from({ length: g.n }, (_, i) => g.unit[i % g.unit.length]);
    S = { free: false, kind: g.kind, n: g.n, pattern, fill: pattern.map((b, i) => (g.miss.includes(i) ? null : b)), miss: g.miss, tray: [], done: false, animalIdx: rnd(ANIMALS.length) };
    $("animal").textContent = ANIMALS[S.animalIdx][0];
    renderInfo(); requestAnimationFrame(layout);
  })();

  // test kancası
  window.__boncuk = { get S() { return S; }, place, GENS, SAVE: () => SAVE, newNecklace, same, nextTarget, setLevel: (l) => { SAVE.lv = l; SAVE.prog = 0; } };
})();
