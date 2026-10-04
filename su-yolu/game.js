(() => {
  "use strict";
  const $ = id => document.getElementById(id);

  const LEVELS = [
    {id:"5", w:5, h:5, nm:"5×5", note:"ısınma"},
    {id:"7", w:7, h:7, nm:"7×7", note:"klasik"},
    {id:"9", w:9, h:9, nm:"9×9", note:"zorlu"},
    {id:"11", w:9, h:12, nm:"9×12", note:"usta"}
  ];
  const SAVE_KEY = "su-yolu";
  const UP = 1, RIGHT = 2, DOWN = 4, LEFT = 8;
  const DIRS = [[UP, 0, -1, DOWN], [RIGHT, 1, 0, LEFT], [DOWN, 0, 1, UP], [LEFT, -1, 0, RIGHT]];

  let save = {best: {}};
  try { save = Object.assign(save, JSON.parse(localStorage.getItem(SAVE_KEY)) || {}); } catch (e) {}
  const store = () => { try { localStorage.setItem(SAVE_KEY, JSON.stringify(save)); } catch (e) {} };

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
    o.type = type; o.frequency.setValueAtTime(f1, t); o.frequency.exponentialRampToValueAtTime(Math.max(20, f2), t + dur * .9);
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + .01); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(a.destination); o.start(t); o.stop(t + dur + .05);
  }
  const sTurn = () => tone(360, 300, "square", .05, .05);
  const sFlow = n => tone(520 + Math.min(n, 8) * 45, 700, "sine", .1, .09);
  const sHint = () => tone(880, 1100, "triangle", .14, .1);
  const sWin = () => [523, 659, 784, 1047, 1319].forEach((f, k) => tone(f, f, "triangle", .22, .15, k * .1));
  function renderSound(){
    $("ic-on").hidden = !soundOn; $("ic-off").hidden = soundOn;
    $("sound").setAttribute("aria-label", soundOn ? "Sesi kapat" : "Sesi aç");
    $("sound").setAttribute("aria-pressed", String(soundOn));
  }
  $("sound").addEventListener("click", () => { soundOn = !soundOn; renderSound(); });
  renderSound();

  /* ---------- bulmaca üretimi ---------- */
  const rotMask = (m, k) => { let r = m & 15; for (let i = 0; i < ((k % 4) + 4) % 4; i++) r = ((r << 1) | (r >> 3)) & 15; return r; };
  const shuffle = a => { for (let i = a.length - 1; i > 0; i--){ const j = Math.random() * (i + 1) | 0; [a[i], a[j]] = [a[j], a[i]]; } return a; };

  function makePuzzle(w, h){
    const n = w * h, sol = new Array(n).fill(0), seen = new Array(n).fill(false);
    const src = (Math.random() * h | 0) * w + (Math.random() * w | 0);
    // rastgele kapsayan ağaç (her kare bağlı olur, döngü olmaz)
    const stack = [src];
    seen[src] = true;
    while (stack.length){
      const i = stack[stack.length - 1];
      const x = i % w, y = (i / w) | 0;
      const opts = shuffle(DIRS.slice()).filter(([bit, dx, dy]) => {
        const nx = x + dx, ny = y + dy;
        return nx >= 0 && ny >= 0 && nx < w && ny < h && !seen[ny * w + nx];
      });
      if (!opts.length){ stack.pop(); continue; }
      const [bit, dx, dy, back] = opts[0];
      const j = (y + dy) * w + (x + dx);
      sol[i] |= bit; sol[j] |= back;
      seen[j] = true;
      stack.push(j);
    }
    // karıştır: her kareye rastgele dönüş ver
    const rot = sol.map(m => {
      const uniq = m === 5 || m === 10 ? 2 : m === 15 ? 1 : 4;   // düz boru 2'de, artı 1'de tekrar eder
      return uniq === 1 ? 0 : (Math.random() * uniq | 0);
    });
    // en az bir kare yerinden oynasın
    if (rot.every(r => r === 0)){ const i = sol.findIndex(m => m !== 15); if (i >= 0) rot[i] = 1; }
    return {sol, rot, src, w, h};
  }

  /* ---------- durum ---------- */
  let G = null, cells = [];

  function newGame(levelIdx){
    const lv = LEVELS[levelIdx];
    const p = makePuzzle(lv.w, lv.h);
    G = {lv, levelIdx, ...p, time: 0, turns: 0, hints: 0, over: false, wet: []};
    ["menu", "win"].forEach(id => $(id).hidden = true);
    $("hintline").textContent = "Borulara dokununca dönerler.";
    build();
    flow(true);
    hud();
  }
  const maskAt = i => rotMask(G.sol[i], G.rot[i]);

  function build(){
    const b = $("board");
    b.className = "board";
    b.style.gridTemplateColumns = `repeat(${G.w}, minmax(0,1fr))`;
    b.style.width = G.w > G.h ? "min(100%,520px)" : `min(100%, min(${Math.round(72 * G.w / G.h)}vh, 520px))`;
    b.innerHTML = "";
    cells = [];
    for (let i = 0; i < G.w * G.h; i++){
      const el = document.createElement("button");
      el.type = "button";
      el.className = "sq" + (i === G.src ? " src" : "");
      el.setAttribute("role", "gridcell");
      el.innerHTML = svgFor(G.sol[i], i === G.src);
      el.style.setProperty("--rot", `${G.rot[i] * 90}deg`);
      el.classList.add("spin");
      el.addEventListener("click", () => turn(i));
      b.appendChild(el);
      cells.push(el);
    }
  }
  function svgFor(mask, isSrc){
    let d = "";
    const C = 50;
    for (const [bit, dx, dy] of DIRS) if (mask & bit) d += `M${C} ${C}L${C + dx * 50} ${C + dy * 50}`;
    const deg = [1,2,4,8].filter(b => mask & b).length;
    const cap = deg === 1 ? `<circle cx="50" cy="50" r="13" class="pipe" style="fill:var(--tile);stroke-width:9"/>` : "";
    const tank = isSrc ? `<rect x="33" y="33" width="34" height="34" rx="8" class="tank"/>` : "";
    return `<svg viewBox="0 0 100 100" aria-hidden="true"><path class="pipe" d="${d}"/>${cap}${tank}</svg>`;
  }

  function turn(i){
    if (!G || G.over) return;
    audio();
    G.rot[i]++;
    G.turns++;
    cells[i].style.setProperty("--rot", `${G.rot[i] * 90}deg`);
    sTurn();
    flow();
    hud();
  }

  function flow(quiet){
    const n = G.w * G.h, wet = new Array(n).fill(false);
    const q = [G.src];
    wet[G.src] = true;
    while (q.length){
      const i = q.shift(), x = i % G.w, y = (i / G.w) | 0, m = maskAt(i);
      for (const [bit, dx, dy, back] of DIRS){
        if (!(m & bit)) continue;
        const nx = x + dx, ny = y + dy;
        if (nx < 0 || ny < 0 || nx >= G.w || ny >= G.h) continue;
        const j = ny * G.w + nx;
        if (wet[j] || !(maskAt(j) & back)) continue;
        wet[j] = true; q.push(j);
      }
    }
    const before = G.wet.filter(Boolean).length;
    G.wet = wet;
    for (let i = 0; i < n; i++) cells[i].classList.toggle("wet", wet[i]);
    const now = wet.filter(Boolean).length;
    if (!quiet && now > before) sFlow(now - before);
    if (wet.every(Boolean)) win();
  }

  function win(){
    G.over = true;
    $("board").classList.add("done");
    sWin();
    const id = G.lv.id, t = G.time;
    const prev = save.best[id];
    const clean = G.hints === 0;
    const rec = clean && (!prev || t < prev.t);
    if (rec){ save.best[id] = {t, turns: G.turns}; store(); }
    $("win-title").textContent = rec ? "Yeni rekor!" : "Su aktı!";
    $("win-time").textContent = fmt(t);
    $("win-turns").textContent = G.turns;
    $("win-note").textContent = !clean ? `${G.hints} ipucu kullandın — rekor için ipucusuz bitirmelisin.`
      : rec ? "En iyi süren!" : prev ? `Rekorun: ${fmt(prev.t)} · ${prev.turns} dönüş` : "";
    hud();
    setTimeout(() => { $("win").hidden = false; $("win-again").focus(); }, 650);
  }

  /* ---------- ipucu ---------- */
  $("hint").addEventListener("click", () => {
    if (!G || G.over) return;
    audio();
    const wrong = [];
    for (let i = 0; i < G.w * G.h; i++) if (maskAt(i) !== G.sol[i]) wrong.push(i);
    if (!wrong.length){ $("hintline").textContent = "Bütün borular yerinde!"; return; }
    // suya değen yanlış boruyu seç, yoksa rastgele
    const touching = wrong.filter(i => {
      const x = i % G.w, y = (i / G.w) | 0;
      return DIRS.some(([bit, dx, dy]) => {
        const nx = x + dx, ny = y + dy;
        return nx >= 0 && ny >= 0 && nx < G.w && ny < G.h && G.wet[ny * G.w + nx];
      });
    });
    const i = (touching.length ? touching : wrong)[Math.random() * (touching.length ? touching.length : wrong.length) | 0];
    while (maskAt(i) !== G.sol[i]){ G.rot[i]++; }
    cells[i].style.setProperty("--rot", `${G.rot[i] * 90}deg`);
    cells[i].classList.remove("hint"); void cells[i].offsetWidth; cells[i].classList.add("hint");
    G.hints++;
    sHint();
    $("hintline").textContent = `Bir boru yerine kondu (${G.hints} ipucu).`;
    flow();
    hud();
  });
  $("again").addEventListener("click", () => { if (G) newGame(G.levelIdx); });

  /* ---------- arayüz ---------- */
  const fmt = s => `${(s / 60) | 0}:${String(s % 60).padStart(2, "0")}`;
  function hud(){
    $("lv").textContent = G.lv.nm;
    $("time").textContent = fmt(G.time | 0);
    $("turns").textContent = G.turns;
    const b = save.best[G.lv.id];
    $("best").textContent = b ? fmt(b.t) : "—";
  }
  function buildMenu(){
    const box = $("levels"); box.innerHTML = "";
    LEVELS.forEach((lv, i) => {
      const b = document.createElement("button");
      b.type = "button";
      const best = save.best[lv.id];
      b.innerHTML = `<b>${lv.nm}</b><small>${best ? "rekor " + fmt(best.t) + " · " + best.turns + " dönüş" : lv.note}</small>`;
      b.addEventListener("click", () => { audio(); newGame(i); });
      box.appendChild(b);
    });
  }
  $("open-menu").addEventListener("click", () => { buildMenu(); $("win").hidden = true; $("menu").hidden = false; });
  $("win-menu").addEventListener("click", () => { buildMenu(); $("win").hidden = true; $("menu").hidden = false; });
  $("win-again").addEventListener("click", () => { $("win").hidden = true; newGame(G.levelIdx); });

  setInterval(() => {
    if (!G || G.over || document.hidden || !$("menu").hidden) return;
    G.time++; hud();
  }, 1000);

  buildMenu();
})();
