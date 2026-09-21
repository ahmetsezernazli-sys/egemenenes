(() => {
  "use strict";
  const $ = id => document.getElementById(id);

  /* ---------- şekiller, renkler, oyuncaklar ---------- */
  function starPath(){
    let d = "";
    for (let k = 0; k < 10; k++){
      const r = k % 2 ? 19 : 45, a = -Math.PI / 2 + k * Math.PI / 5;
      d += (k ? "L" : "M") + (50 + r * Math.cos(a)).toFixed(1) + " " + (53 + r * Math.sin(a)).toFixed(1);
    }
    return d + "Z";
  }
  const SHAPES = [
    {id:"daire",  nm:"daire",  d:"M50 8A42 42 0 1 1 49.9 8Z"},
    {id:"kare",   nm:"kare",   d:"M18 12H82Q88 12 88 18V82Q88 88 82 88H18Q12 88 12 82V18Q12 12 18 12Z"},
    {id:"ucgen",  nm:"üçgen",  d:"M50 8L93 88H7Z"},
    {id:"yildiz", nm:"yıldız", d:starPath()},
    {id:"kalp",   nm:"kalp",   d:"M50 88C20 66 6 48 10 30C14 12 38 8 50 26C62 8 86 12 90 30C94 48 80 66 50 88Z"},
    {id:"bulut",  nm:"bulut",  d:"M26 80C13 80 6 71 6 61C6 50 15 42 26 43C28 29 39 20 52 20C65 20 76 29 78 42C89 42 95 51 95 61C95 72 87 80 76 80Z"}
  ];
  const COLORS = [
    ["kırmızı", "#EF4444"], ["mavi", "#3B82F6"], ["sarı", "#FACC15"],
    ["yeşil", "#22C55E"], ["mor", "#A855F7"], ["turuncu", "#F97316"]
  ];
  const TOYS = [
    ["🧸", "bir oyuncak ayı"], ["🚂", "bir tren"], ["🦖", "bir dinozor"], ["🚀", "bir roket"],
    ["⚽", "bir top"], ["🤖", "bir robot"], ["🦄", "bir tek boynuzlu at"], ["🚒", "bir itfaiye arabası"],
    ["🐢", "bir kaplumbağa"], ["🎺", "bir trompet"], ["🪁", "bir uçurtma"], ["🐥", "bir civciv"]
  ];
  const SAVE_KEY = "sekil-kutusu";

  /* ---------- kayıt ---------- */
  let save = {done: 0, toys: []};
  try { save = Object.assign(save, JSON.parse(localStorage.getItem(SAVE_KEY)) || {}); } catch (e) {}
  function store(){ try { localStorage.setItem(SAVE_KEY, JSON.stringify(save)); } catch (e) {} }

  /* ---------- ses ---------- */
  let soundOn = true, ac = null;
  function audio(){
    if (!ac){ try { ac = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { ac = null; } }
    if (ac && ac.state === "suspended") ac.resume();
    return ac;
  }
  function tone(f1, f2, type, dur, vol, delay){
    if (!soundOn) return;
    const a = audio(); if (!a) return;
    const t = a.currentTime + (delay || 0), o = a.createOscillator(), g = a.createGain();
    o.type = type; o.frequency.setValueAtTime(f1, t); o.frequency.exponentialRampToValueAtTime(f2, t + dur * .9);
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + .02); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(a.destination); o.start(t); o.stop(t + dur + .05);
  }
  const plop = () => { tone(300, 900, "sine", .18, .35); tone(900, 1300, "sine", .12, .15, .08); };
  const boing = () => tone(420, 160, "triangle", .45, .3);
  const tick = () => tone(700, 760, "sine", .08, .15);
  const fanfare = () => [523, 659, 784, 1047].forEach((f, k) => tone(f, f, "triangle", k === 3 ? .6 : .2, .28, k * .14));

  const canSpeak = "speechSynthesis" in window;
  let trVoice = null;
  function pickVoice(){ trVoice = speechSynthesis.getVoices().find(v => /^tr(-|_|$)/i.test(v.lang)) || null; }
  if (canSpeak){ pickVoice(); if (speechSynthesis.addEventListener) speechSynthesis.addEventListener("voiceschanged", pickVoice); }
  function say(text){
    if (!canSpeak || !soundOn || !trVoice) return;
    speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text); u.voice = trVoice; u.lang = trVoice.lang; u.rate = .95; u.pitch = 1.15;
    speechSynthesis.speak(u);
  }
  function renderSound(){
    $("ic-on").hidden = !soundOn; $("ic-off").hidden = soundOn;
    $("sound").setAttribute("aria-label", soundOn ? "Sesi kapat" : "Sesi aç");
    $("sound").setAttribute("aria-pressed", String(soundOn));
  }
  $("sound").addEventListener("click", () => { soundOn = !soundOn; if (!soundOn && canSpeak) speechSynthesis.cancel(); renderSound(); });
  renderSound();

  /* ---------- tur ---------- */
  const stage = $("stage"), box = $("box");
  const NS = "http://www.w3.org/2000/svg";
  let R = null, L = null, hintTimer = 0, winTimer = 0;

  const shuffle = a => { for (let i = a.length - 1; i > 0; i--){ const j = Math.random() * (i + 1) | 0; [a[i], a[j]] = [a[j], a[i]]; } return a; };
  const cap = s => s.charAt(0).toLocaleUpperCase("tr") + s.slice(1);

  function svgFor(shape, fill){
    const s = document.createElementNS(NS, "svg");
    s.setAttribute("viewBox", "0 0 100 100");
    const p = document.createElementNS(NS, "path");
    p.setAttribute("d", shape.d);
    if (fill) p.setAttribute("fill", fill);
    s.appendChild(p);
    return s;
  }

  function newRound(){
    clearTimeout(winTimer);
    stage.querySelectorAll(".hole,.shape,.confetti").forEach(e => e.remove());
    $("toy").hidden = true; $("next").hidden = true;
    box.classList.remove("open", "shake");
    const n = Math.min(6, 3 + Math.floor(save.done / 2));
    const kinds = shuffle(SHAPES.slice()).slice(0, n);
    const cols = shuffle(COLORS.slice());
    const holeOrder = shuffle(kinds.map((_, i) => i));
    const trayOrder = shuffle(kinds.map((_, i) => i));
    R = {n, items: kinds.map((k, i) => {
      const hole = svgFor(k); hole.classList.add("hole");
      const el = svgFor(k, cols[i][1]); el.classList.add("shape");
      el.setAttribute("role", "button");
      el.setAttribute("aria-label", `${cols[i][0]} ${k.nm}`);
      stage.appendChild(hole); stage.appendChild(el);
      const it = {k, color: cols[i], hole, el, holeSlot: holeOrder[i], traySlot: trayOrder[i], jx: Math.random() - .5, jy: Math.random() - .5,
        rot: (Math.random() - .5) * 24, in: false, free: null};
      bindDrag(it);
      return it;
    }), won: false};
    layout();
    armHint();
  }

  /* ---------- yerleşim ---------- */
  function gridPos(slot, n, cols){
    const rows = n <= 3 ? 1 : 2;
    const r = Math.floor(slot / cols), inRow = r < rows - 1 ? cols : n - cols * (rows - 1);
    return {c: slot - r * cols, r, inRow};
  }
  function layout(){
    if (!R) return;
    const W = stage.clientWidth, H = stage.clientHeight, n = R.n;
    const cols = n <= 3 ? n : Math.ceil(n / 2), rows = n <= 3 ? 1 : 2;
    const S = Math.max(40, Math.min(W * .92 / (cols * 1.28 + .4), H * .5 / (rows * 1.4 + .45), H * .4 / (rows * 1.3 + .1), 150));
    const bw = cols * S * 1.28 + S * .4, bh = rows * S * 1.4 + S * .4;
    const bx = (W - bw) / 2, by = Math.max(18, (H * .52 - bh) / 2 + 8);
    Object.assign(box.style, {left: bx + "px", top: by + "px", width: bw + "px", height: bh + "px"});
    const trayTop = Math.max(by + bh + 26, H * .56);
    L = {W, H, S, bx, by, bw, bh};
    R.items.forEach(it => {
      const h = gridPos(it.holeSlot, n, cols);
      it.hx = W / 2 + (h.c - (h.inRow - 1) / 2) * S * 1.28;
      it.hy = by + S * .2 + S * 1.4 * (h.r + .5);
      const t = gridPos(it.traySlot, n, cols);
      const gap = Math.min(S * 1.55, W / (t.inRow + .2));
      it.tx = W / 2 + (t.c - (t.inRow - 1) / 2) * gap + it.jx * S * .2;
      it.ty = Math.min(H - S * .6, trayTop + S * .6 + t.r * S * 1.3 + it.jy * S * .15);
      const hs = S * 1.1;
      Object.assign(it.hole.style, {left: it.hx - hs / 2 + "px", top: it.hy - hs / 2 + "px", width: hs + "px", height: hs + "px"});
      it.el.style.width = it.el.style.height = S + "px";
      if (it.in) place(it, it.hx, it.hy, 0);
      else if (it.free) place(it, Math.min(W - S / 2, it.free[0]), Math.min(H - S / 2, it.free[1]), it.rot);
      else place(it, it.tx, it.ty, it.rot);
    });
    if (!$("toy").hidden) placeToy();
  }
  function place(it, x, y, rot){
    it.x = x; it.y = y;
    it.el.style.left = x - L.S / 2 + "px";
    it.el.style.top = y - L.S / 2 + "px";
    it.el.style.rotate = (rot || 0) + "deg";
  }

  /* ---------- sürükleme ---------- */
  function bindDrag(it){
    let drag = null;
    it.el.addEventListener("pointerdown", e => {
      if (it.in || R.won) return;
      e.preventDefault(); audio(); armHint();
      it.el.setPointerCapture(e.pointerId);
      const r = stage.getBoundingClientRect();
      drag = {id: e.pointerId, ox: e.clientX - r.left - it.x, oy: e.clientY - r.top - it.y, sx: e.clientX, sy: e.clientY, moved: false};
      it.el.classList.add("drag");
      it.el.style.rotate = "0deg";
    });
    it.el.addEventListener("pointermove", e => {
      if (!drag || e.pointerId !== drag.id) return;
      if (Math.hypot(e.clientX - drag.sx, e.clientY - drag.sy) > 8) drag.moved = true;
      const r = stage.getBoundingClientRect(), h = L.S / 2;
      place(it, Math.max(h, Math.min(L.W - h, e.clientX - r.left - drag.ox)), Math.max(h, Math.min(L.H - h, e.clientY - r.top - drag.oy)), 0);
    });
    const up = e => {
      if (!drag || e.pointerId !== drag.id) return;
      const moved = drag.moved; drag = null;
      it.el.classList.remove("drag");
      if (!moved){ tick(); say(cap(`${it.color[0]} ${it.k.nm}`)); place(it, it.x, it.y, it.rot); return; }
      drop(it, it.x, it.y);
    };
    it.el.addEventListener("pointerup", up);
    it.el.addEventListener("pointercancel", up);
    it.el.addEventListener("keydown", e => { if (e.key === "Enter" || e.key === " "){ e.preventDefault(); drop(it, it.hx, it.hy); } });
    it.el.tabIndex = 0;
  }

  function drop(it, x, y){
    place(it, x, y, 0);
    const near = R.items.filter(o => !o.in && Math.hypot(o.hx - x, o.hy - y) < L.S * .6)
      .sort((a, b) => Math.hypot(a.hx - x, a.hy - y) - Math.hypot(b.hx - x, b.hy - y))[0];
    if (near === it){
      it.in = true; it.free = null;
      it.el.classList.add("in"); it.el.removeAttribute("tabindex");
      place(it, it.hx, it.hy, 0);
      plop();
      say(cap(it.k.nm) + "!");
      armHint();
      if (R.items.every(o => o.in)) win();
      return;
    }
    const overBox = x > L.bx && x < L.bx + L.bw && y > L.by && y < L.by + L.bh;
    if (near || overBox){
      boing();
      if (near) say(`Bu bir ${it.k.nm}. ${cap(it.k.nm)} deliğini bul.`);
      it.free = null;
      place(it, it.tx, it.ty, it.rot);
    } else {
      it.free = [x, y];
      place(it, x, y, it.rot);
    }
  }

  /* ---------- ipucu ---------- */
  function armHint(){
    clearTimeout(hintTimer);
    hintTimer = setTimeout(() => {
      if (!R || R.won) return;
      const left = R.items.filter(o => !o.in);
      if (!left.length) return;
      const it = left[Math.random() * left.length | 0];
      [it.el, it.hole].forEach(e => { e.classList.remove("hint"); void e.getBoundingClientRect(); e.classList.add("hint"); });
      setTimeout(() => { it.el.classList.remove("hint"); it.hole.classList.remove("hint"); }, 3200);
      armHint();
    }, 8000);
  }

  /* ---------- kutu açılıyor ---------- */
  function win(){
    R.won = true;
    clearTimeout(hintTimer);
    save.done++;
    const fresh = TOYS.map((_, i) => i).filter(i => !save.toys.includes(i));
    const pick = fresh.length ? fresh[Math.random() * fresh.length | 0] : Math.random() * TOYS.length | 0;
    if (!save.toys.includes(pick)) save.toys.push(pick);
    store();
    R.toy = pick;
    winTimer = setTimeout(() => {
      box.classList.add("shake");
      winTimer = setTimeout(() => {
        box.classList.add("open");
        $("toy").textContent = TOYS[pick][0];
        $("toy").hidden = false;
        placeToy();
        confetti();
        fanfare();
        say(`Yaşasın! Kutudan ${TOYS[pick][1]} çıktı!`);
        renderCount(true);
        winTimer = setTimeout(() => { $("next").hidden = false; }, 1600);
      }, 500);
    }, 350);
  }
  function placeToy(){
    const t = $("toy");
    t.style.left = L.W / 2 + "px";
    t.style.top = Math.max(L.S * .7, L.by + L.bh * .25) + "px";
  }
  function confetti(){
    const cx = L.W / 2, cy = L.by + L.bh / 2;
    for (let i = 0; i < 36; i++){
      const c = document.createElement("i");
      c.className = "confetti";
      c.style.left = cx + "px"; c.style.top = cy + "px";
      c.style.background = COLORS[i % COLORS.length][1];
      const a = Math.random() * Math.PI * 2, d = 120 + Math.random() * 220;
      c.style.setProperty("--dx", Math.cos(a) * d + "px");
      c.style.setProperty("--dy", Math.sin(a) * d - 60 + "px");
      c.style.setProperty("--r", (Math.random() * 720 - 360) + "deg");
      stage.appendChild(c);
      setTimeout(() => c.remove(), 1700);
    }
  }
  $("next").addEventListener("click", () => { audio(); newRound(); say("Yeni kutu geldi!"); });

  /* ---------- raf ---------- */
  function renderCount(bump){
    $("toy-count").textContent = save.toys.length;
    if (bump){ const b = $("shelf-btn"); b.classList.remove("bump"); void b.offsetWidth; b.classList.add("bump"); }
  }
  $("shelf-btn").addEventListener("click", () => {
    const box = $("toys"); box.innerHTML = "";
    TOYS.forEach((t, i) => {
      const b = document.createElement("button");
      b.type = "button";
      const have = save.toys.includes(i);
      b.textContent = t[0];
      b.className = have ? "" : "locked";
      b.setAttribute("aria-label", have ? t[1].replace(/^bir /, "") : "henüz yok");
      if (have) b.addEventListener("click", () => { tick(); say(cap(t[1].replace(/^bir /, ""))); });
      box.appendChild(b);
    });
    $("shelf").hidden = false;
  });
  $("shelf-close").addEventListener("click", () => { $("shelf").hidden = true; });
  $("shelf").addEventListener("click", e => { if (e.target.id === "shelf") $("shelf").hidden = true; });

  if ("ResizeObserver" in window) new ResizeObserver(layout).observe(stage);
  else window.addEventListener("resize", layout);
  renderCount(false);
  newRound();
})();
