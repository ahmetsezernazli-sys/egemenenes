/* Yörünge — Enes için yerçekimi bulmacası */
(() => {
  "use strict";
  const $ = (id) => document.getElementById(id);
  const SAVE_KEY = "yorunge", W = 900, H = 600, VMAX = 9, PULL = 150, SR = 6, GR = 26;
  // 20 bölüm: s başlangıç, g hedef, p gezegenler [x,y,r,tür] (0 gezegen, 1 itici, 2 kara delik), st yıldızlar, h ipucu [açı, güç]
  // tarayıcıda üretildi: düz atış olmaz, en az bir atış yıldızların hepsini toplayıp hedefe varır
  const LEVELS = [{"s":[107,246],"g":[786,345],"p":[[344,311,35,0],[526,339,45,0]],"st":[[270,383],[465,449],[640,431]],"h":[-45,0.86]},{"s":[101,205],"g":[787,343],"p":[[431,105,27,0],[573,300,43,0]],"st":[[264,303],[423,374],[598,401]],"h":[-33,0.72]},{"s":[75,352],"g":[759,115],"p":[[595,129,40,0]],"st":[[227,232],[375,126],[562,42]],"h":[39,0.545]},{"s":[103,296],"g":[758,211],"p":[[618,304,38,0]],"st":[[267,342],[421,377],[604,382]],"h":[-16.5,0.475]},{"s":[76,409],"g":[742,230],"p":[[325,372,48,0]],"st":[[294,470],[495,414],[629,332]],"h":[-22.5,0.86]},{"s":[87,182],"g":[794,504],"p":[[267,268,28,0],[230,475,31,0]],"st":[[344,219],[516,323],[652,422]],"h":[1.5,0.825]},{"s":[95,380],"g":[780,115],"p":[[231,498,37,1],[401,176,44,0]],"st":[[214,235],[392,85],[598,76]],"h":[40.5,0.51]},{"s":[107,396],"g":[819,210],"p":[[537,160,29,1],[435,366,52,0]],"st":[[332,465],[567,409],[696,293]],"h":[-21,0.755]},{"s":[71,404],"g":[830,305],"p":[[591,438,29,1],[536,266,48,0]],"st":[[253,294],[428,205],[658,220]],"h":[31.5,0.685]},{"s":[87,354],"g":[804,171],"p":[[442,274,29,1],[355,202,38,0],[649,244,53,0]],"st":[[278,396],[458,398],[657,368]],"h":[-18,0.545]},{"s":[86,201],"g":[798,385],"p":[[247,420,32,0],[550,371,50,0],[337,235,36,0]],"st":[[288,364],[502,536],[689,515]],"h":[-49.5,0.37]},{"s":[106,231],"g":[839,205],"p":[[374,415,50,0],[260,473,31,0],[581,155,34,0]],"st":[[311,204],[499,222],[686,219]],"h":[13.5,0.825]},{"s":[76,276],"g":[777,453],"p":[[522,312,36,0],[454,443,44,0],[314,228,53,0]],"st":[[429,274],[708,266],[798,352]],"h":[-31.5,0.475]},{"s":[91,457],"g":[832,162],"p":[[378,349,38,1],[422,476,52,0],[453,81,37,0]],"st":[[236,260],[378,68],[647,81]],"h":[58.5,0.545]},{"s":[93,320],"g":[823,395],"p":[[585,235,39,1],[418,415,47,0],[300,173,30,0]],"st":[[292,456],[521,480],[680,416]],"h":[-39,0.825]},{"s":[103,366],"g":[750,340],"p":[[592,288,29,0],[641,404,26,0],[526,231,16,2]],"st":[[243,455],[401,498],[580,479]],"h":[-40.5,0.58]},{"s":[108,376],"g":[800,385],"p":[[665,341,41,0],[480,463,43,0],[341,121,16,2]],"st":[[249,387],[435,333],[639,276]],"h":[-24,0.37]},{"s":[96,204],"g":[785,414],"p":[[619,100,32,1],[553,422,52,0],[249,369,31,0],[455,161,16,2]],"st":[[383,301],[725,319],[826,380]],"h":[-24,0.335]},{"s":[84,129],"g":[829,355],"p":[[368,136,47,1],[393,481,32,0],[376,372,36,0],[500,401,16,2]],"st":[[164,346],[361,559],[667,532]],"h":[-70.5,0.545]},{"s":[90,305],"g":[826,501],"p":[[252,419,47,1],[635,297,36,0],[543,187,32,0],[670,126,16,2]],"st":[[276,266],[479,138],[778,255]],"h":[-6,0.755]}];
  const PAL = [["#6C8CFF", "#2B3FA8"], ["#FF9F6B", "#B5532A"], ["#5FD3A8", "#1F7A5C"], ["#FFD166", "#B8860B"], ["#E879F9", "#86198F"], ["#7DD3FC", "#0369A1"]];
  const mass = (p) => p[3] === 2 ? 9000 : (p[3] === 1 ? -1 : 1) * p[2] * p[2] * 1.6;

  let save = { stars: [], cur: 0 };
  try { save = Object.assign(save, JSON.parse(localStorage.getItem(SAVE_KEY) || "{}")); } catch (e) {}
  const persist = () => { try { localStorage.setItem(SAVE_KEY, JSON.stringify(save)); } catch (e) {} };

  /* ---------- fizik ---------- */
  function newShip(lv, ang, pow) { const a = ang * Math.PI / 180; return { x: lv.s[0], y: lv.s[1], vx: Math.cos(a) * VMAX * pow, vy: -Math.sin(a) * VMAX * pow, f: 0, got: [] }; }
  // bir kare: null | "win" | "crash" | "lost"
  function phys(lv, sh) {
    sh.f++;
    for (let k = 0; k < 3; k++) {
      let ax = 0, ay = 0;
      for (const p of lv.p) {
        const dx = p[0] - sh.x, dy = p[1] - sh.y, d2 = dx * dx + dy * dy, d = Math.sqrt(d2);
        if (d < p[2] + SR) return "crash";
        const a = mass(p) / (d2 + 400); ax += a * dx / d; ay += a * dy / d;
      }
      sh.vx += ax / 3; sh.vy += ay / 3; sh.x += sh.vx / 3; sh.y += sh.vy / 3;
    }
    (lv.st || []).forEach((s, i) => { if (!sh.got.includes(i) && Math.hypot(s[0] - sh.x, s[1] - sh.y) < 18) sh.got.push(i); });
    if (Math.hypot(lv.g[0] - sh.x, lv.g[1] - sh.y) < GR) return "win";
    if (sh.x < -30 || sh.x > W + 30 || sh.y < -30 || sh.y > H + 30 || sh.f > 1400) return "lost";
    return null;
  }
  function simulate(lv, ang, pow, path) { const sh = newShip(lv, ang, pow); let r; while (!(r = phys(lv, sh))) if (path) path.push([sh.x, sh.y]); return { r, got: sh.got.length, f: sh.f }; }

  /* ---------- ses ---------- */
  let AC = null;
  function audio() { try { AC = AC || new (window.AudioContext || window.webkitAudioContext)(); if (AC.state === "suspended") AC.resume(); } catch (e) {} }
  function tone(f, d, type, vol, delay, f2) {
    if (!AC) return;
    const t = AC.currentTime + (delay || 0), o = AC.createOscillator(), g = AC.createGain();
    o.type = type || "sine"; o.frequency.setValueAtTime(f, t); if (f2) o.frequency.exponentialRampToValueAtTime(f2, t + d);
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol || 0.05, t + 0.01); g.gain.exponentialRampToValueAtTime(0.0001, t + d);
    o.connect(g).connect(AC.destination); o.start(t); o.stop(t + d + 0.02);
  }
  const SND = { launch: () => tone(200, 0.5, "sawtooth", 0.05, 0, 900), star: (n) => [0, 1].forEach(i => tone(1000 + n * 200 + i * 300, 0.12, "triangle", 0.06, i * 0.07)), crash: () => tone(140, 0.6, "sawtooth", 0.08, 0, 40), win: () => [523, 659, 784, 1046, 1318].forEach((f, i) => tone(f, 0.2, "triangle", 0.07, i * 0.1)), lost: () => tone(500, 0.6, "sine", 0.05, 0, 120) };

  /* ---------- durum ---------- */
  const cv = $("cv"), ctx = cv.getContext("2d");
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  cv.width = W * dpr; cv.height = H * dpr; ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  const BG = []; { let s = 7; const r = () => (s = (s * 16807) % 2147483647) / 2147483647; for (let i = 0; i < 170; i++) BG.push([r() * W, r() * H, r() * 1.6 + 0.3, r() * 6]); }
  let L = 0, lv = null, ship = null, flying = false, trail = [], parts = [], tries = 0, aim = null, hinted = false, hintT = 0, fast = false, won = false, t = 0, kbd = { ang: 0, pow: 0.6 };
  function startLevel(i) {
    L = Math.max(0, Math.min(LEVELS.length - 1, i)); save.cur = L; persist();
    lv = LEVELS[L]; tries = 0; hinted = false; won = false; parts = []; resetShip();
    const d = lv.g[0] - lv.s[0], e = lv.s[1] - lv.g[1]; kbd = { ang: Math.round(Math.atan2(e, d) * 180 / Math.PI), pow: 0.6 };
    $("menu").hidden = true; $("win").hidden = true; hud();
    msg(L === 0 ? "Ekrana dokun, geri çek ve bırak: araç çektiğin yönün tersine fırlar!" : "");
  }
  function resetShip() { ship = { x: lv.s[0], y: lv.s[1], vx: 0, vy: 0, f: 0, got: [] }; flying = false; trail = []; aim = null; }
  function hud() { $("lv").textContent = L + 1; $("mv").textContent = tries; $("par").textContent = `${ship ? ship.got.length : 0}/${(lv.st || []).length}`; }
  function msg(s) { $("msg").textContent = s; }
  function launch(ang, pow) {
    if (flying || won || pow < 0.08) return false;
    ship = newShip(lv, ang, pow); flying = true; trail = []; aim = null; tries++; hud(); SND.launch(); msg("");
    return true;
  }
  function stepSim() {
    if (!flying) return;
    const before = ship.got.length, r = phys(lv, ship);
    trail.push([ship.x, ship.y]); if (trail.length > 160) trail.shift();
    if (ship.got.length > before) { SND.star(ship.got.length); const s = lv.st[ship.got[ship.got.length - 1]]; burst(s[0], s[1], "#FFD166", 18); hud(); }
    if (r === "win") { flying = false; won = true; SND.win(); burst(ship.x, ship.y, "#B18CFF", 30); setTimeout(win, 700); }
    else if (r === "crash") { flying = false; SND.crash(); burst(ship.x, ship.y, "#FF7A59", 40); msg("Gezegene çarptın! Bir daha dene."); setTimeout(() => { if (!flying && !won) resetShip(); hud(); }, 900); }
    else if (r === "lost") { flying = false; SND.lost(); msg("Araç uzayda kayboldu. Bir daha dene!"); setTimeout(() => { if (!flying && !won) resetShip(); hud(); }, 500); }
  }
  function burst(x, y, c, n) { for (let i = 0; i < n; i++) { const a = Math.random() * 7, v = 1 + Math.random() * 4; parts.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, c, t: 1 }); } }
  function win() {
    const got = ship.got.length, n = (lv.st || []).length;
    let s = n ? Math.max(1, got) : 3; if (hinted) s = Math.min(s, 2);
    save.stars[L] = Math.max(save.stars[L] || 0, s); persist(); renderLevels();
    $("stars").textContent = "⭐".repeat(s) + "☆".repeat(3 - s);
    $("w-title").textContent = L === LEVELS.length - 1 ? "Galaksinin en iyi pilotu! 🏆" : "Hedefe ulaştın!";
    $("w-tx").textContent = `${tries}. denemede, ${got}/${n} yıldızla.${got < n ? " Hepsini tek atışta toplamayı dene!" : hinted ? " İpucusuz dene: üç yıldız!" : " Kusursuz uçuş!"}`;
    $("next").hidden = L === LEVELS.length - 1;
    $("win").hidden = false; ($("next").hidden ? $("replay") : $("next")).focus();
  }

  /* ---------- çizim ---------- */
  function draw() {
    t += 1 / 60;
    const g = ctx.createRadialGradient(W * 0.3, H * 0.2, 40, W * 0.5, H * 0.5, W * 0.8);
    g.addColorStop(0, "#1A2558"); g.addColorStop(1, "#050817");
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = "rgba(177,140,255,.08)"; ctx.beginPath(); ctx.ellipse(W * 0.72, H * 0.7, 260, 120, -0.4, 0, 7); ctx.fill();
    for (const [x, y, r, ph] of BG) { ctx.globalAlpha = 0.4 + 0.4 * Math.sin(t * 1.5 + ph); ctx.fillStyle = "#fff"; ctx.fillRect(x, y, r, r); } ctx.globalAlpha = 1;
    if (!lv) return;
    // hedef solucan deliği
    for (let k = 0; k < 4; k++) { ctx.strokeStyle = `rgba(177,140,255,${0.8 - k * 0.18})`; ctx.lineWidth = 3; ctx.beginPath(); ctx.ellipse(lv.g[0], lv.g[1], GR - k * 5, (GR - k * 5) * 0.9, t * (k % 2 ? -1.5 : 2), 0.3, 5.6); ctx.stroke(); }
    ctx.fillStyle = "rgba(255,255,255,.85)"; ctx.beginPath(); ctx.arc(lv.g[0], lv.g[1], 4, 0, 7); ctx.fill();
    // gezegenler
    lv.p.forEach((p, i) => {
      const [x, y, r, k] = p;
      if (k === 2) {
        ctx.strokeStyle = "rgba(255,170,80,.7)"; ctx.lineWidth = 5; ctx.beginPath(); ctx.ellipse(x, y, r * 2.4, r * 0.8, t * 0.6, 0, 7); ctx.stroke();
        ctx.fillStyle = "#000"; ctx.beginPath(); ctx.arc(x, y, r, 0, 7); ctx.fill(); ctx.strokeStyle = "rgba(255,200,120,.8)"; ctx.lineWidth = 2; ctx.stroke(); return;
      }
      if (k === 1) { for (let j = 0; j < 3; j++) { const rr = r + ((t * 30 + j * 20) % 60); ctx.strokeStyle = `rgba(232,121,249,${0.5 * (1 - (rr - r) / 60)})`; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(x, y, rr, 0, 7); ctx.stroke(); } }
      const [c1, c2] = k === 1 ? ["#E879F9", "#6B21A8"] : PAL[i % PAL.length];
      const glow = ctx.createRadialGradient(x, y, r * 0.8, x, y, r * 1.8); glow.addColorStop(0, c1 + "55"); glow.addColorStop(1, c1 + "00");
      ctx.fillStyle = glow; ctx.beginPath(); ctx.arc(x, y, r * 1.8, 0, 7); ctx.fill();
      const pg = ctx.createRadialGradient(x - r * 0.4, y - r * 0.4, r * 0.1, x, y, r); pg.addColorStop(0, "#fff"); pg.addColorStop(0.15, c1); pg.addColorStop(1, c2);
      ctx.fillStyle = pg; ctx.beginPath(); ctx.arc(x, y, r, 0, 7); ctx.fill();
      ctx.strokeStyle = "rgba(255,255,255,.15)"; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(x, y, r * 0.65, 0.2, 1.4); ctx.stroke();
      if (k === 0 && i % 3 === 1) { ctx.strokeStyle = c1 + "AA"; ctx.lineWidth = 3; ctx.beginPath(); ctx.ellipse(x, y, r * 1.7, r * 0.45, -0.35, 0, 7); ctx.stroke(); }
    });
    // yıldızlar
    (lv.st || []).forEach((s, i) => {
      if (ship && ship.got.includes(i)) return;
      ctx.save(); ctx.translate(s[0], s[1]); ctx.rotate(t * 0.8); ctx.fillStyle = "#FFD166"; ctx.beginPath();
      for (let k = 0; k < 10; k++) { const rr = k % 2 ? 5 : 12, a = k * Math.PI / 5; ctx.lineTo(Math.cos(a) * rr, Math.sin(a) * rr); }
      ctx.closePath(); ctx.fill(); ctx.restore();
    });
    // iz
    for (let i = 1; i < trail.length; i++) { ctx.strokeStyle = `rgba(255,209,102,${i / trail.length * 0.8})`; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(trail[i - 1][0], trail[i - 1][1]); ctx.lineTo(trail[i][0], trail[i][1]); ctx.stroke(); }
    // nişan
    const show = aim || (hintT > 0 ? { ang: lv.h[0], pow: lv.h[1], hint: true } : null);
    if (show && !flying) {
      const pts = []; const sh = newShip(lv, show.ang, show.pow); const n = show.hint ? 70 : 34;
      for (let i = 0; i < n; i++) { if (phys(lv, sh)) break; if (i % 3 === 0) pts.push([sh.x, sh.y]); }
      ctx.fillStyle = show.hint ? "#5FD3A8" : "rgba(255,255,255,.85)";
      pts.forEach(([x, y], i) => { ctx.globalAlpha = 1 - i / pts.length * 0.8; ctx.beginPath(); ctx.arc(x, y, 3, 0, 7); ctx.fill(); }); ctx.globalAlpha = 1;
      if (!show.hint) { ctx.fillStyle = "rgba(255,255,255,.2)"; ctx.fillRect(lv.s[0] - 30, lv.s[1] + 26, 60, 7); ctx.fillStyle = show.pow > 0.85 ? "#FF7A59" : "#5FD3A8"; ctx.fillRect(lv.s[0] - 30, lv.s[1] + 26, 60 * show.pow, 7); }
    }
    // araç
    if (ship) {
      const a = flying ? Math.atan2(ship.vy, ship.vx) : (aim ? -aim.ang * Math.PI / 180 : -kbd.ang * Math.PI / 180);
      ctx.save(); ctx.translate(ship.x, ship.y); ctx.rotate(a);
      if (flying) { ctx.fillStyle = `rgba(255,${120 + Math.random() * 80},60,.9)`; ctx.beginPath(); ctx.moveTo(-8, -4); ctx.lineTo(-18 - Math.random() * 8, 0); ctx.lineTo(-8, 4); ctx.fill(); }
      ctx.fillStyle = "#E8EDFF"; ctx.beginPath(); ctx.moveTo(14, 0); ctx.lineTo(-9, -9); ctx.lineTo(-5, 0); ctx.lineTo(-9, 9); ctx.closePath(); ctx.fill();
      ctx.fillStyle = "#5FD3A8"; ctx.beginPath(); ctx.arc(3, 0, 3.5, 0, 7); ctx.fill();
      ctx.restore();
    }
    for (const p of parts) { ctx.globalAlpha = Math.max(0, p.t); ctx.fillStyle = p.c; ctx.beginPath(); ctx.arc(p.x, p.y, 2.5, 0, 7); ctx.fill(); } ctx.globalAlpha = 1;
  }
  let last = 0, acc = 0;
  function loop(ts) {
    const dt = Math.min(100, ts - (last || ts)); last = ts; acc += dt;
    while (acc >= 1000 / 60) { for (let k = 0; k < (fast ? 3 : 1); k++) stepSim(); for (const p of parts) { p.x += p.vx; p.y += p.vy; p.vx *= 0.96; p.vy *= 0.96; p.t -= 0.02; } parts = parts.filter(p => p.t > 0); if (hintT > 0) hintT -= 1 / 60; acc -= 1000 / 60; }
    draw(); requestAnimationFrame(loop);
  }

  /* ---------- girdi ---------- */
  let drag = null;
  function pt(e) { const r = cv.getBoundingClientRect(); return { x: (e.clientX - r.left) * W / r.width, y: (e.clientY - r.top) * H / r.height }; }
  cv.addEventListener("pointerdown", (e) => { audio(); if (flying || won) return; drag = pt(e); cv.setPointerCapture(e.pointerId); e.preventDefault(); });
  cv.addEventListener("pointermove", (e) => {
    if (!drag) return; const p = pt(e), dx = drag.x - p.x, dy = drag.y - p.y, len = Math.hypot(dx, dy);
    aim = len < 8 ? null : { ang: Math.atan2(-dy, dx) * 180 / Math.PI, pow: Math.min(1, len / PULL) };
  });
  const up = () => { if (!drag) return; drag = null; if (aim) { const a = aim; launch(a.ang, a.pow); } };
  cv.addEventListener("pointerup", up); cv.addEventListener("pointercancel", () => { drag = null; aim = null; });
  document.addEventListener("keydown", (e) => {
    if (!$("menu").hidden || !$("win").hidden || flying) return;
    let k = true;
    if (e.key === "ArrowLeft") kbd.ang += 1; else if (e.key === "ArrowRight") kbd.ang -= 1;
    else if (e.key === "ArrowUp") kbd.pow = Math.min(1, kbd.pow + 0.02); else if (e.key === "ArrowDown") kbd.pow = Math.max(0.1, kbd.pow - 0.02);
    else if (e.key === " " || e.key === "Enter") { audio(); launch(kbd.ang, kbd.pow); aim = null; e.preventDefault(); return; }
    else k = false;
    if (k) { e.preventDefault(); aim = { ang: kbd.ang, pow: kbd.pow }; }
  });

  /* ---------- menü ---------- */
  function renderLevels() {
    const box = $("levels"); box.textContent = "";
    LEVELS.forEach((x, i) => {
      const b = document.createElement("button"); b.type = "button";
      const open = i < 4 || save.stars[i - 1] || save.stars[i];
      b.disabled = !open; if (i === L) b.className = "cur";
      b.innerHTML = `${i + 1}<small>${save.stars[i] ? "★".repeat(save.stars[i]) : ""}</small>`;
      b.setAttribute("aria-label", `Bölüm ${i + 1}${save.stars[i] ? ", " + save.stars[i] + " yıldız" : ""}${open ? "" : ", kilitli"}`);
      b.addEventListener("click", () => { audio(); startLevel(i); });
      box.appendChild(b);
    });
  }
  $("open-menu").addEventListener("click", () => { renderLevels(); $("menu").hidden = false; });
  $("start").addEventListener("click", () => { audio(); startLevel(save.cur || 0); });
  $("next").addEventListener("click", () => { audio(); startLevel(L + 1); });
  $("replay").addEventListener("click", () => { audio(); startLevel(L); });
  $("reset").addEventListener("click", () => { if (!won) { resetShip(); hud(); } });
  $("undo").addEventListener("click", () => { fast = !fast; $("undo").textContent = fast ? "⏩ Hızlı: açık" : "⏩ Hızlandır"; });
  $("hint").addEventListener("click", () => { audio(); if (flying || won) return; hinted = true; hintT = 4; msg("İpucu: yeşil noktalar doğru atışın başlangıcı. Aynı yöne, aynı uzunlukta çek!"); });

  if (LEVELS.length) { L = Math.min(save.cur || 0, LEVELS.length - 1); lv = LEVELS[L]; resetShip(); hud(); renderLevels(); }
  requestAnimationFrame(loop);
  window.__yr = { LEVELS, simulate, phys, newShip, startLevel, launch, stepSim, get ship() { return ship; }, get won() { return won; }, get flying() { return flying; }, setLevels(l) { LEVELS.length = 0; LEVELS.push(...l); } };
})();
