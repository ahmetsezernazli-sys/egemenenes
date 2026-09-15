/* Yapboz — çocuklar için resimli yapboz */
(function(){
  "use strict";

  const SIZE = 600;   // resimler 600 × 600 çizilir
  const EMOJI = '"Segoe UI Emoji","Apple Color Emoji","Noto Color Emoji",sans-serif';
  // Her sahne: arka plan çizimi + emoji listesi [emoji, x, y, boyut]
  const SCENES = [
    {id:"ciftlik", name:"Çiftlik", bg(c){ sky(c, "#8FD3F7", "#DFF4FF"); ground(c, 380, "#7CC96A", "#5DAF4E"); sun(c, 500, 90); fence(c, 400); },
      items:[["🏠", 170, 290, 190], ["🌳", 470, 300, 170], ["🐄", 300, 470, 150], ["🐓", 110, 500, 110], ["🐑", 490, 500, 120]]},
    {id:"deniz", name:"Deniz", bg(c){ sky(c, "#1E88C7", "#6BD0F0", true); ground(c, 520, "#F2D38A", "#E0BC6A"); bubbles(c); },
      items:[["🐳", 190, 170, 200], ["🐠", 450, 150, 120], ["🐙", 440, 360, 150], ["🦀", 150, 520, 100], ["🌿", 520, 500, 120], ["🐡", 180, 380, 110]]},
    {id:"uzay", name:"Uzay", bg(c){ sky(c, "#0F1540", "#2E2A6E"); stars(c); },
      items:[["🚀", 180, 380, 200], ["🪐", 440, 170, 180], ["🌙", 120, 110, 110], ["⭐", 470, 430, 90], ["👽", 450, 520, 100]]},
    {id:"orman", name:"Orman", bg(c){ sky(c, "#9FE0B0", "#E4F7D9"); ground(c, 420, "#4FA85A", "#3C8C47"); },
      items:[["🌴", 110, 280, 210], ["🦁", 330, 400, 190], ["🐒", 500, 200, 130], ["🦜", 330, 130, 110], ["🦒", 520, 420, 170]]},
    {id:"sehir", name:"Şehir", bg(c){ sky(c, "#FFB88A", "#FFE7C7"); buildings(c); ground(c, 470, "#6D7A87", "#5A6572"); road(c, 470); },
      items:[["🚗", 170, 520, 130], ["🚌", 440, 510, 150], ["☁️", 140, 90, 110], ["☀️", 480, 90, 110]]},
    {id:"bahce", name:"Bahçe", bg(c){ sky(c, "#BDE8FF", "#F2FBFF"); ground(c, 400, "#8BD46E", "#6FBE55"); },
      items:[["🌻", 130, 330, 190], ["🌷", 300, 440, 130], ["🦋", 440, 160, 140], ["🐝", 220, 150, 100], ["🐞", 490, 470, 110], ["🌸", 520, 330, 100]]},
    {id:"kutup", name:"Kutup", bg(c){ sky(c, "#A9D8F5", "#E8F6FF"); ground(c, 420, "#FFFFFF", "#DCEBF5"); snow(c); },
      items:[["🐧", 170, 440, 170], ["⛄", 430, 400, 190], ["🏔️", 300, 230, 220], ["❄️", 90, 110, 80], ["🐧", 290, 500, 110]]},
    {id:"parti", name:"Doğum Günü", bg(c){ sky(c, "#FFC2DE", "#FFF0F7"); confettiBg(c); ground(c, 450, "#C58B5A", "#A8703F"); },
      items:[["🎂", 300, 360, 210], ["🎈", 110, 160, 150], ["🎁", 490, 480, 130], ["🎉", 480, 150, 130], ["🧸", 120, 470, 130]]}
  ];

  function sky(c, top, bottom, water){ const g = c.createLinearGradient(0, 0, 0, SIZE); g.addColorStop(0, water ? bottom : top); g.addColorStop(1, water ? top : bottom); c.fillStyle = g; c.fillRect(0, 0, SIZE, SIZE); }
  function ground(c, y, col, dark){ c.fillStyle = col; c.beginPath(); c.moveTo(0, y); c.quadraticCurveTo(SIZE*.5, y - 40, SIZE, y + 10); c.lineTo(SIZE, SIZE); c.lineTo(0, SIZE); c.fill(); c.fillStyle = dark; c.fillRect(0, SIZE - 30, SIZE, 30); }
  function sun(c, x, y){ c.fillStyle = "#FFD23F"; c.beginPath(); c.arc(x, y, 50, 0, Math.PI*2); c.fill(); }
  function fence(c, y){ c.fillStyle = "#FFFFFF"; for (let x = 20; x < SIZE; x += 44){ c.fillRect(x, y - 40, 12, 50); } c.fillRect(0, y - 25, SIZE, 8); }
  function bubbles(c){ c.strokeStyle = "rgba(255,255,255,.6)"; c.lineWidth = 4; [[80, 80, 14], [520, 280, 18], [300, 60, 10], [60, 300, 12], [560, 60, 9]].forEach(([x, y, r]) => { c.beginPath(); c.arc(x, y, r, 0, Math.PI*2); c.stroke(); }); }
  function stars(c){ c.fillStyle = "#FFFFFF"; for (let i = 0; i < 70; i++){ const x = (i*97) % SIZE, y = (i*57 + i*i*3) % SIZE, r = (i % 3) + 1; c.beginPath(); c.arc(x, y, r, 0, Math.PI*2); c.fill(); } }
  function buildings(c){ const cols = ["#7B8FB8", "#95A6C9", "#6A7EA6", "#8799C0"]; [[20, 200, 110], [140, 150, 90], [240, 230, 120], [370, 170, 100], [480, 210, 110]].forEach(([x, top, w], i) => { c.fillStyle = cols[i % 4]; c.fillRect(x, top, w, 470 - top); c.fillStyle = "rgba(255,240,180,.8)"; for (let wy = top + 20; wy < 440; wy += 36) for (let wx = x + 14; wx < x + w - 20; wx += 30) c.fillRect(wx, wy, 14, 18); }); }
  function road(c, y){ c.fillStyle = "#FFFFFF"; for (let x = 10; x < SIZE; x += 80) c.fillRect(x, y + 60, 44, 8); }
  function snow(c){ c.fillStyle = "rgba(255,255,255,.9)"; for (let i = 0; i < 50; i++){ const x = (i*131) % SIZE, y = (i*71) % 400, r = (i % 4) + 2; c.beginPath(); c.arc(x, y, r, 0, Math.PI*2); c.fill(); } }
  function confettiBg(c){ const cols = ["#FF6B8B", "#FFD23F", "#3DA5F5", "#2DB75A", "#9B7BF5"]; for (let i = 0; i < 60; i++){ c.fillStyle = cols[i % 5]; c.save(); c.translate((i*89) % SIZE, (i*53) % 430); c.rotate(i); c.fillRect(-6, -3, 12, 6); c.restore(); } }

  const STORE_KEY = "yapboz", SOUND_KEY = "yapboz-ses";
  const RM = window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches;
  const $ = id => document.getElementById(id);
  const shuffle = a => { a = a.slice(); for (let i = a.length - 1; i > 0; i--){ const j = Math.random()*(i + 1) | 0; [a[i], a[j]] = [a[j], a[i]]; } return a; };

  let store = {scene:0, n:4, hint:true, done:{}};
  try { const s = JSON.parse(localStorage.getItem(STORE_KEY) || "null"); if (s) store = Object.assign(store, s); } catch(e) {}
  const persist = () => { try { localStorage.setItem(STORE_KEY, JSON.stringify(store)); } catch(e) {} };
  let soundOn = true;
  try { soundOn = localStorage.getItem(SOUND_KEY) !== "0"; } catch(e) {}

  /* ---------- ses ---------- */
  let ac = null;
  function audio(){
    if (!ac){ try { ac = new (window.AudioContext || window.webkitAudioContext)(); } catch(e) { ac = null; } }
    if (ac && ac.state === "suspended") ac.resume();
    return ac;
  }
  function tone(freq, dur, type, vol, slide, delay){
    const a = audio(); if (!a || !soundOn) return;
    const n = a.currentTime + (delay || 0), o = a.createOscillator(), g = a.createGain();
    o.type = type || "sine"; o.frequency.setValueAtTime(freq, n);
    if (slide) o.frequency.exponentialRampToValueAtTime(slide, n + dur);
    g.gain.setValueAtTime(.0001, n); g.gain.exponentialRampToValueAtTime(vol || .1, n + .01); g.gain.exponentialRampToValueAtTime(.0001, n + dur);
    o.connect(g).connect(a.destination); o.start(n); o.stop(n + dur + .05);
  }
  const sfx = {
    pick(){ tone(520, .06, "triangle", .07, 700); },
    snap(k){ tone(660 + k*40, .12, "triangle", .14); tone(990 + k*60, .16, "sine", .08, null, .06); },
    drop(){ tone(260, .08, "sine", .06); },
    win(){ [523.25, 659.25, 783.99, 1046.5, 1318.5].forEach((f, i) => tone(f, .28, "triangle", .14, null, i*.12)); }
  };
  const canSpeak = "speechSynthesis" in window;
  let trVoice = null;
  function pickVoice(){ trVoice = speechSynthesis.getVoices().find(v => /^tr(-|_|$)/i.test(v.lang)) || null; }
  if (canSpeak){ pickVoice(); if (speechSynthesis.addEventListener) speechSynthesis.addEventListener("voiceschanged", pickVoice); }
  function say(text){
    if (!canSpeak || !soundOn || !trVoice) return;
    speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text); u.voice = trVoice; u.lang = trVoice.lang; u.pitch = 1.15;
    speechSynthesis.speak(u);
  }
  function renderSound(){
    $("ic-on").hidden = !soundOn; $("ic-off").hidden = soundOn;
    $("sound").setAttribute("aria-label", soundOn ? "Sesi kapat" : "Sesi aç");
    $("sound").setAttribute("aria-pressed", String(soundOn));
  }
  $("sound").addEventListener("click", () => {
    soundOn = !soundOn;
    try { localStorage.setItem(SOUND_KEY, soundOn ? "1" : "0"); } catch(e) {}
    if (!soundOn && canSpeak) speechSynthesis.cancel();
    renderSound();
  });
  renderSound();

  /* ---------- resim üretimi ---------- */
  const images = {};
  function sceneImage(i){
    if (images[i]) return images[i];
    const cvs = document.createElement("canvas");
    cvs.width = cvs.height = SIZE;
    const c = cvs.getContext("2d");
    const s = SCENES[i];
    s.bg(c);
    c.textAlign = "center"; c.textBaseline = "middle";
    s.items.forEach(([e, x, y, size]) => {
      c.fillStyle = "rgba(0,0,0,.12)"; c.beginPath(); c.ellipse(x, y + size*.45, size*.35, size*.08, 0, 0, Math.PI*2); c.fill();
      c.fillStyle = "#000"; c.font = `${size}px ${EMOJI}`; c.fillText(e, x, y);
    });
    images[i] = cvs.toDataURL("image/png");
    return images[i];
  }

  /* ---------- düzen ---------- */
  const table = $("table"), board = $("board");
  let pieces = [], layout = null, drag = null, placedCount = 0;

  function gridOf(n){ return n === 4 ? [2, 2] : n === 6 ? [3, 2] : n === 9 ? [3, 3] : [4, 3]; }

  function computeLayout(){
    const W = table.clientWidth, H = table.clientHeight;
    const landscape = W > H;
    const pad = 10;
    let bs;
    if (landscape) bs = Math.min(H - 30, W*.56);
    else bs = Math.min(W - 20, H*.58);
    bs = Math.max(160, Math.floor(bs));
    const bx = landscape ? 16 : Math.round((W - bs)/2), by = landscape ? Math.round((H - bs)/2) : 8;
    const tray = landscape ? {x:bx + bs + 24, y:10, w:W - (bx + bs + 24) - 10, h:H - 20} : {x:10, y:by + bs + 20, w:W - 20, h:H - (by + bs + 20) - 10};
    return {W, H, bs, bx, by, inner:bs - pad*2, pad, tray};
  }

  function newPuzzle(){
    const [cols, rows] = gridOf(store.n);
    layout = computeLayout();
    const L = layout, img = sceneImage(store.scene);
    board.style.left = L.bx + "px"; board.style.top = L.by + "px";
    board.style.width = L.bs + "px"; board.style.height = L.bs + "px";
    $("ghost").style.backgroundImage = `url(${img})`;
    $("ghost").classList.toggle("off", !store.hint);
    const slots = $("slots");
    slots.style.gridTemplateColumns = `repeat(${cols}, 1fr)`; slots.style.gridTemplateRows = `repeat(${rows}, 1fr)`;
    slots.innerHTML = Array.from({length:cols*rows}, (_, k) => `<div class="slot" data-k="${k}"></div>`).join("");
    pieces.forEach(p => p.el.remove());
    pieces = []; placedCount = 0;
    const cw = L.inner/cols, ch = L.inner/rows;
    for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++){
      const el = document.createElement("div");
      el.className = "piece"; el.tabIndex = 0;
      el.setAttribute("role", "button"); el.setAttribute("aria-label", `Parça ${r*cols + c + 1}`);
      el.style.width = cw + "px"; el.style.height = ch + "px";
      el.style.backgroundImage = `url(${img})`;
      el.style.backgroundSize = `${L.inner}px ${L.inner}px`;
      el.style.backgroundPosition = `${-c*cw}px ${-r*ch}px`;
      table.appendChild(el);
      const p = {el, r, c, k:r*cols + c, x:0, y:0, placed:false, cw, ch, cols, rows};
      pieces.push(p);
      bindPiece(p);
    }
    scatter();
    $("title").textContent = `🧩 ${SCENES[store.scene].name}`;
    renderToolbar();
  }

  function targetOf(p){ return {x:layout.bx + layout.pad + p.c*p.cw, y:layout.by + layout.pad + p.r*p.ch}; }

  function scatter(){
    const T = layout.tray, order = shuffle(pieces.filter(p => !p.placed));
    const n = order.length;
    if (!n) return;
    const cw = order[0].cw, ch = order[0].ch;
    // tepsiye ızgara gibi yerleştir, sığmazsa üst üste bindir
    const perRow = Math.max(1, Math.floor((T.w + 8)/(cw + 8)));
    const rowsNeeded = Math.ceil(n/perRow);
    const stepY = rowsNeeded > 1 ? Math.min(ch + 8, (T.h - ch)/(rowsNeeded - 1)) : 0;
    const stepX = perRow > 1 ? Math.min(cw + 8, (T.w - cw)/(Math.min(n, perRow) - 1 || 1)) : 0;
    order.forEach((p, i) => {
      const col = i % perRow, row = Math.floor(i/perRow);
      const jx = (Math.random() - .5)*10, jy = (Math.random() - .5)*10;
      setPos(p, T.x + col*stepX + jx, T.y + row*Math.max(0, stepY) + jy);
      p.el.style.zIndex = 10 + i;
    });
  }

  function setPos(p, x, y){
    p.x = Math.max(0, Math.min(layout.W - p.cw, x));
    p.y = Math.max(0, Math.min(layout.H - p.ch, y));
    p.el.style.left = p.x + "px"; p.el.style.top = p.y + "px";
  }

  function bindPiece(p){
    p.el.addEventListener("pointerdown", e => {
      if (p.placed || drag) return;
      e.preventDefault(); audio();
      const rect = table.getBoundingClientRect();
      drag = {p, id:e.pointerId, ox:e.clientX - rect.left - p.x, oy:e.clientY - rect.top - p.y};
      try { p.el.setPointerCapture(e.pointerId); } catch(_) {}
      p.el.classList.add("drag");
      sfx.pick();
      if (store.hint) highlight(p.k);
    });
    p.el.addEventListener("pointermove", e => {
      if (!drag || drag.p !== p || drag.id !== e.pointerId) return;
      const rect = table.getBoundingClientRect();
      setPos(p, e.clientX - rect.left - drag.ox, e.clientY - rect.top - drag.oy);
    });
    const end = e => {
      if (!drag || drag.p !== p || drag.id !== e.pointerId) return;
      drag = null;
      p.el.classList.remove("drag");
      highlight(-1);
      tryPlace(p);
    };
    p.el.addEventListener("pointerup", end);
    p.el.addEventListener("pointercancel", end);
    // klavye: Enter ile parçayı yerine koy (erişilebilirlik)
    p.el.addEventListener("keydown", e => { if ((e.key === "Enter" || e.key === " ") && !p.placed){ e.preventDefault(); const t = targetOf(p); setPos(p, t.x, t.y); tryPlace(p); } });
  }

  function highlight(k){
    [...$("slots").children].forEach((s, i) => s.classList.toggle("glow", i === k));
  }

  function tryPlace(p){
    const t = targetOf(p);
    const snap = Math.min(p.cw, p.ch)*(store.n <= 6 ? .45 : .35);
    if (Math.hypot(p.x - t.x, p.y - t.y) <= snap){
      p.placed = true; placedCount++;
      setPos(p, t.x, t.y);
      p.el.classList.add("placed");
      p.el.style.zIndex = 1;
      p.el.tabIndex = -1;
      if (!RM){ p.el.classList.remove("pop"); void p.el.offsetWidth; p.el.classList.add("pop"); }
      sfx.snap(placedCount);
      if (placedCount === pieces.length) win();
    } else {
      sfx.drop();
      p.el.style.zIndex = 40;
    }
  }

  function win(){
    const s = SCENES[store.scene];
    store.done[`${s.id}-${store.n}`] = true; persist();
    sfx.win(); confetti();
    $("ghost").classList.add("off");
    $("done-title").textContent = "Aferin!";
    say(`Aferin! ${s.name} tamam!`);
    setTimeout(() => { $("done").hidden = false; $("next-pic").focus({preventScroll:true}); }, 700);
  }

  function confetti(){
    if (RM) return;
    const layer = $("confetti"), colors = ["#FF8A3D", "#FFD23F", "#3DA5F5", "#2DB75A", "#FF6B8B", "#9B7BF5"];
    for (let i = 0; i < 90; i++){
      const el = document.createElement("i");
      el.style.left = Math.random()*100 + "%"; el.style.background = colors[i % colors.length];
      el.style.animationDelay = Math.random()*.6 + "s"; el.style.animationDuration = 2 + Math.random()*1.5 + "s";
      el.style.setProperty("--dx", (Math.random()*160 - 80) + "px"); el.style.setProperty("--r", (Math.random()*720 - 360) + "deg");
      layer.appendChild(el);
      setTimeout(() => el.remove(), 4000);
    }
  }

  /* ---------- araç çubuğu ---------- */
  function renderToolbar(){
    document.querySelectorAll(".cnt").forEach(b => b.setAttribute("aria-checked", String(+b.dataset.n === store.n)));
    $("hint").setAttribute("aria-pressed", String(store.hint));
  }
  document.querySelectorAll(".cnt").forEach(b => b.addEventListener("click", () => { audio(); store.n = +b.dataset.n; persist(); $("done").hidden = true; newPuzzle(); }));
  $("hint").addEventListener("click", () => { store.hint = !store.hint; persist(); $("ghost").classList.toggle("off", !store.hint || placedCount === pieces.length); renderToolbar(); });
  $("shuffle").addEventListener("click", () => { audio(); scatter(); });
  $("next-pic").addEventListener("click", () => { $("done").hidden = true; store.scene = (store.scene + 1) % SCENES.length; persist(); newPuzzle(); say(SCENES[store.scene].name); });

  function openPics(){
    const grid = $("pic-grid");
    grid.innerHTML = "";
    SCENES.forEach((s, i) => {
      const b = document.createElement("button");
      b.type = "button"; b.className = "pic" + (i === store.scene ? " current" : "");
      const done = [4, 6, 9, 12].filter(n => store.done[`${s.id}-${n}`]);
      b.innerHTML = `<img src="${sceneImage(i)}" alt=""><b>${s.name}</b>${done.length ? `<span class="ok">✓ ${Math.max(...done)}</span>` : ""}`;
      b.setAttribute("aria-label", s.name);
      b.addEventListener("click", () => { $("pics").hidden = true; $("done").hidden = true; store.scene = i; persist(); newPuzzle(); say(s.name); });
      grid.appendChild(b);
    });
    $("pics").hidden = false;
  }
  $("open-pics").addEventListener("click", openPics);
  $("close-pics").addEventListener("click", () => { $("pics").hidden = true; });
  $("pics").addEventListener("click", e => { if (e.target === $("pics")) $("pics").hidden = true; });

  // ekran boyutu değişince yerleşimi koru: yerleşmiş parçalar yerinde, diğerleri tepsiye
  let resizeTimer = null;
  function onResize(){
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => {
      if (!layout) return;
      const placed = pieces.filter(p => p.placed).map(p => p.k);
      newPuzzle();
      pieces.forEach(p => { if (placed.includes(p.k)){ p.placed = true; placedCount++; const t = targetOf(p); setPos(p, t.x, t.y); p.el.classList.add("placed"); p.el.style.zIndex = 1; } });
      scatter();
    }, 150);
  }
  if ("ResizeObserver" in window) new ResizeObserver(onResize).observe(table);
  else window.addEventListener("resize", onResize);

  store.scene = Math.min(store.scene, SCENES.length - 1);
  if (![4, 6, 9, 12].includes(store.n)) store.n = 4;
  requestAnimationFrame(newPuzzle);
})();
