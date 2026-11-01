/* Yılan — Enes için klasik yılan oyunu */
(() => {
  "use strict";
  const $ = (id) => document.getElementById(id);
  const cv = $("cv"), ctx = cv.getContext("2d"), stage = $("stage");
  const GW = 24, GH = 16, SAVE_KEY = "yilan", SOUND_KEY = "yilan-ses";
  const SPEEDS = [7, 9.5, 12.5];   // saniyedeki adım (başlangıç)
  const DIRS = { u: [0, -1], d: [0, 1], l: [-1, 0], r: [1, 0] };

  let soundOn = true, best = {};
  try { soundOn = localStorage.getItem(SOUND_KEY) !== "0"; } catch (e) {}
  try { best = JSON.parse(localStorage.getItem(SAVE_KEY) || "{}"); } catch (e) {}

  /* ---------- ses ---------- */
  let AC = null;
  function audio() { try { AC = AC || new (window.AudioContext || window.webkitAudioContext)(); if (AC.state === "suspended") AC.resume(); } catch (e) {} }
  function snd(f, d, type, vol, slide, delay) {
    if (!AC || !soundOn) return;
    const t = AC.currentTime + (delay || 0), o = AC.createOscillator(), g = AC.createGain();
    o.type = type || "square"; o.frequency.setValueAtTime(f, t); if (slide) o.frequency.exponentialRampToValueAtTime(slide, t + d);
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol || 0.04, t + 0.01); g.gain.exponentialRampToValueAtTime(0.0001, t + d);
    o.connect(g).connect(AC.destination); o.start(t); o.stop(t + d + 0.02);
  }
  const SND = { eat: () => snd(660, 0.08, "square", 0.04, 990), gold: () => [880, 1175, 1568].forEach((f, i) => snd(f, 0.1, "triangle", 0.06, null, i * 0.06)), die: () => snd(300, 0.6, "sawtooth", 0.06, 60), turn: () => snd(200, 0.02, "sine", 0.015) };
  function renderSound() { $("ic-on").hidden = !soundOn; $("ic-off").hidden = soundOn; $("sound").setAttribute("aria-label", soundOn ? "Sesi kapat" : "Sesi aç"); }
  $("sound").addEventListener("click", () => { soundOn = !soundOn; try { localStorage.setItem(SOUND_KEY, soundOn ? "1" : "0"); } catch (e) {} renderSound(); });
  renderSound();

  /* ---------- durum ---------- */
  let S = null, CFG = { wall: 0, spd: 1 };
  const bestKey = () => `w${CFG.wall}s${CFG.spd}`;
  function newGame() {
    const y = GH >> 1;
    S = { snake: [[6, y], [5, y], [4, y]], dir: "r", queue: [], grow: 0, score: 0, apple: null, gold: null, goldT: 0, acc: 0, over: false, paused: false, eaten: 0, flash: 0 };
    placeApple();
    $("menu").hidden = true; $("ov").textContent = "";
    hud();
  }
  const occupied = (x, y) => S.snake.some(([a, b]) => a === x && b === y);
  function freeCell() {
    for (let t = 0; t < 500; t++) { const x = Math.floor(Math.random() * GW), y = Math.floor(Math.random() * GH); if (!occupied(x, y) && !(S.apple && S.apple[0] === x && S.apple[1] === y)) return [x, y]; }
    return null;
  }
  function placeApple() { S.apple = freeCell(); }
  const speed = () => SPEEDS[CFG.spd] + Math.min(8, S.eaten * 0.18);
  function turn(d) {
    if (!S || S.over) return;
    const last = S.queue.length ? S.queue[S.queue.length - 1] : S.dir;
    const [a, b] = DIRS[last], [c, e] = DIRS[d];
    if (a + c === 0 && b + e === 0) return;   // geri dönüş yok
    if (d === last) return;
    if (S.queue.length < 3) { S.queue.push(d); SND.turn(); }
  }
  function step() {
    if (S.queue.length) S.dir = S.queue.shift();
    const [dx, dy] = DIRS[S.dir], [hx, hy] = S.snake[0];
    let nx = hx + dx, ny = hy + dy;
    if (CFG.wall) { if (nx < 0 || ny < 0 || nx >= GW || ny >= GH) return die(); }
    else { nx = (nx + GW) % GW; ny = (ny + GH) % GH; }
    // kuyruk bu adımda kayacaksa kuyruğun yerine girilebilir
    const tailFree = S.grow === 0;
    for (let i = 0; i < S.snake.length - (tailFree ? 1 : 0); i++) if (S.snake[i][0] === nx && S.snake[i][1] === ny) return die();
    S.snake.unshift([nx, ny]);
    if (S.grow > 0) S.grow--; else S.snake.pop();
    if (S.apple && nx === S.apple[0] && ny === S.apple[1]) {
      S.score += 10; S.grow += 1; S.eaten++; SND.eat(); placeApple();
      if (!S.gold && S.eaten % 5 === 0) { S.gold = freeCell(); S.goldT = 6; }
    }
    if (S.gold && nx === S.gold[0] && ny === S.gold[1]) { S.score += 50; S.grow += 2; S.gold = null; SND.gold(); S.flash = 0.4; }
    hud();
  }
  function die() {
    S.over = true; SND.die();
    const k = bestKey(), nb = S.score > (best[k] || 0);
    if (nb) { best[k] = S.score; try { localStorage.setItem(SAVE_KEY, JSON.stringify(best)); } catch (e) {} }
    $("ov").textContent = nb ? `Yeni rekor: ${S.score}! 🎉\nYeniden başlamak için bir yöne bas` : `Oyun bitti: ${S.score}\nYeniden başlamak için bir yöne bas`;
    $("ov").style.whiteSpace = "pre-line";
    hud();
  }
  function hud() {
    $("score").textContent = S ? S.score : 0; $("len").textContent = S ? S.snake.length : 3; $("best").textContent = best[bestKey()] || 0;
  }
  function update(dt) {
    if (!S || S.over || S.paused || !$("menu").hidden) return;
    S.acc += dt;
    const iv = 1 / speed();
    while (S.acc >= iv && !S.over) { S.acc -= iv; step(); }
    if (S.gold) { S.goldT -= dt; if (S.goldT <= 0) S.gold = null; }
    S.flash = Math.max(0, S.flash - dt);
  }

  /* ---------- çizim ---------- */
  let cs = 24;
  function resize() {
    const r = stage.getBoundingClientRect(); if (!r.width || !r.height) return;
    cs = Math.max(10, Math.floor(Math.min(r.width / GW, r.height / GH)));
    const d = Math.min(2, devicePixelRatio || 1);
    cv.width = GW * cs * d; cv.height = GH * cs * d; cv.style.width = GW * cs + "px"; cv.style.height = GH * cs + "px";
    ctx.setTransform(d, 0, 0, d, 0, 0);
  }
  function draw() {
    ctx.fillStyle = "#13261A"; ctx.fillRect(0, 0, GW * cs, GH * cs);
    ctx.fillStyle = "#162C1E";
    for (let y = 0; y < GH; y++) for (let x = 0; x < GW; x++) if ((x + y) % 2) ctx.fillRect(x * cs, y * cs, cs, cs);
    if (CFG.wall) { ctx.strokeStyle = "#9BE15D"; ctx.lineWidth = 3; ctx.strokeRect(1.5, 1.5, GW * cs - 3, GH * cs - 3); }
    if (!S) return;
    const t = performance.now() / 1000;
    if (S.apple) { const [x, y] = S.apple; ctx.fillStyle = "#E5484D"; ctx.beginPath(); ctx.arc(x * cs + cs / 2, y * cs + cs / 2 + 1, cs * 0.38, 0, 7); ctx.fill(); ctx.fillStyle = "#5BBF4A"; ctx.fillRect(x * cs + cs / 2, y * cs + cs * 0.1, cs * 0.12, cs * 0.22); }
    if (S.gold) { const [x, y] = S.gold, s = 1 + Math.sin(t * 10) * 0.12; ctx.save(); ctx.translate(x * cs + cs / 2, y * cs + cs / 2); ctx.scale(s, s); ctx.fillStyle = "#FFD166"; ctx.beginPath(); for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5, rr = i % 2 ? cs * 0.2 : cs * 0.45; ctx.lineTo(Math.cos(a) * rr, Math.sin(a) * rr); } ctx.closePath(); ctx.fill(); ctx.restore(); }
    const n = S.snake.length;
    S.snake.forEach(([x, y], i) => {
      const k = 1 - i / Math.max(n, 8) * 0.5;
      ctx.fillStyle = S.over ? `rgba(160,160,160,${k})` : `hsl(${95 - i * 0.6},${70 * k + 20}%,${50 * k + 10}%)`;
      const p = i === 0 ? 1 : 2;
      ctx.beginPath(); ctx.roundRect(x * cs + p, y * cs + p, cs - p * 2, cs - p * 2, cs * 0.3); ctx.fill();
    });
    // göz
    const [hx, hy] = S.snake[0], [dx, dy] = DIRS[S.dir];
    ctx.fillStyle = "#fff";
    for (const s of [-1, 1]) { const ex = hx * cs + cs / 2 + dx * cs * 0.18 + dy * s * cs * 0.2, ey = hy * cs + cs / 2 + dy * cs * 0.18 + dx * s * cs * 0.2; ctx.beginPath(); ctx.arc(ex, ey, cs * 0.12, 0, 7); ctx.fill(); ctx.fillStyle = "#111"; ctx.beginPath(); ctx.arc(ex + dx * 2, ey + dy * 2, cs * 0.06, 0, 7); ctx.fill(); ctx.fillStyle = "#fff"; }
    if (S.flash > 0) { ctx.fillStyle = `rgba(255,209,102,${S.flash * 0.5})`; ctx.fillRect(0, 0, GW * cs, GH * cs); }
    if (S.paused) { ctx.fillStyle = "rgba(0,0,0,.5)"; ctx.fillRect(0, 0, GW * cs, GH * cs); ctx.fillStyle = "#fff"; ctx.font = `800 ${cs * 1.4}px Rubik, sans-serif`; ctx.textAlign = "center"; ctx.fillText("Duraklatıldı", GW * cs / 2, GH * cs / 2); }
  }

  /* ---------- giriş ---------- */
  const KEYS = { ArrowUp: "u", w: "u", W: "u", ArrowDown: "d", s: "d", S: "d", ArrowLeft: "l", a: "l", A: "l", ArrowRight: "r", d: "r", D: "r" };
  function dirInput(d) { audio(); if (S && S.over) { newGame(); S.queue = []; } turn(d); }
  window.addEventListener("keydown", (e) => {
    if (!$("menu").hidden) return;
    if (e.key === " " || e.key === "p" || e.key === "P") { e.preventDefault(); togglePause(); return; }
    const d = KEYS[e.key]; if (!d) return;
    e.preventDefault(); dirInput(d);
  });
  let sw = null;
  cv.addEventListener("pointerdown", (e) => { sw = { x: e.clientX, y: e.clientY }; audio(); });
  cv.addEventListener("pointermove", (e) => {
    if (!sw) return;
    const dx = e.clientX - sw.x, dy = e.clientY - sw.y;
    if (Math.hypot(dx, dy) < 24) return;
    dirInput(Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? "r" : "l") : (dy > 0 ? "d" : "u"));
    sw = { x: e.clientX, y: e.clientY };
  });
  cv.addEventListener("pointerup", () => { sw = null; });
  cv.style.touchAction = "none";
  document.querySelectorAll("#dpad button").forEach(b => b.addEventListener("pointerdown", (e) => { e.preventDefault(); dirInput(b.dataset.d); }));
  function togglePause() { if (!S || S.over) return; S.paused = !S.paused; $("pause").textContent = S.paused ? "▶" : "⏸"; }
  $("pause").addEventListener("click", () => { audio(); togglePause(); });
  $("start").addEventListener("click", () => { audio(); CFG = { wall: +document.querySelector('input[name="wall"]:checked').value, spd: +document.querySelector('input[name="spd"]:checked').value }; newGame(); });
  $("open-menu").addEventListener("click", () => { if (S) S.paused = true; $("best-line").textContent = Object.keys(best).length ? `Rekorlar: ${Object.entries(best).map(([k, v]) => `${k[1] === "1" ? "duvarlı" : "duvarsız"} ${["yavaş", "orta", "hızlı"][+k[3]]} ${v}`).join(" · ")}` : ""; $("menu").hidden = false; });
  document.addEventListener("visibilitychange", () => { if (document.hidden && S && !S.over) S.paused = true; });

  if (!CanvasRenderingContext2D.prototype.roundRect) {
    CanvasRenderingContext2D.prototype.roundRect = function (x, y, w, h, r) { r = Math.min(r, w / 2, h / 2); this.moveTo(x + r, y); this.arcTo(x + w, y, x + w, y + h, r); this.arcTo(x + w, y + h, x, y + h, r); this.arcTo(x, y + h, x, y, r); this.arcTo(x, y, x + w, y, r); this.closePath(); };
  }
  let last = performance.now();
  function loop(now) { const dt = Math.min(0.1, (now - last) / 1000); last = now; update(dt); draw(); requestAnimationFrame(loop); }
  if ("ResizeObserver" in window) new ResizeObserver(resize).observe(stage); else window.addEventListener("resize", resize);
  resize(); hud(); requestAnimationFrame(loop);

  // test kancası
  window.__yl = { newGame, step, turn, update, get S() { return S; }, setCFG: (c) => { CFG = Object.assign(CFG, c); } };
})();
