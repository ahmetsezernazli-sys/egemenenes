/* Bilye Yolu — Egemen için rampa ve bilye bulmacası */
(function(){
  "use strict";

  const SAVE = "bilye-yolu", SOUND_KEY = "bilye-yolu-ses";
  const RAINBOW = ["#E4483B", "#C98F00", "#2A64C0", "#1E8A41", "#6E36B8"];
  // bölümler: s = başlangıç [x, vx], c = sepet x, k = kutular [[x,y],...], f = sabit rampalar [[x,y,yön]] (1 = sağa iner, 2 = sola iner)
  // hepsi tarayıcıda simülasyonla üretildi: boş hâlde kaçar, doğru rampalarla sepete düşer
  const LEVELS = [{"s":[245,-0.56],"c":446,"k":[[192,170]],"f":[],"a":[1]},{"s":[120,-0.23],"c":498,"k":[[158,170]],"f":[],"a":[1]},{"s":[454,0.52],"c":180,"k":[[411,170],[322,290]],"f":[],"a":[2,1]},{"s":[240,0.51],"c":476,"k":[[288,170],[203,290]],"f":[],"a":[2,1]},{"s":[319,-0.31],"c":132,"k":[[307,170],[347,410]],"f":[[190,290,1]],"a":[2,2]},{"s":[140,-0.37],"c":276,"k":[[167,170],[278,290],[461,410]],"f":[],"a":[1,1,2]},{"s":[234,0.32],"c":341,"k":[[307,170],[445,290],[203,410]],"f":[[215,530,2]],"a":[1,2,1]},{"s":[126,-0.38],"c":288,"k":[[174,170],[381,290],[489,410]],"f":[[402,530,1]],"a":[1,1,2]},{"s":[161,-0.23],"c":309,"k":[[204,170],[326,290],[122,410],[192,530]],"f":[],"a":[1,2,1,1]},{"s":[179,0.37],"c":312,"k":[[241,170],[434,290],[191,530]],"f":[[165,410,1]],"a":[1,2,1]}];
  const $ = id => document.getElementById(id);
  const rnd = n => Math.floor(Math.random()*n);

  let soundOn = true, best = [];
  try { soundOn = localStorage.getItem(SOUND_KEY) !== "0"; } catch(e) {}
  try { best = JSON.parse(localStorage.getItem(SAVE) || "{}").stars || []; } catch(e) { best = []; }
  const persist = () => { try { localStorage.setItem(SAVE, JSON.stringify({stars:best})); } catch(e) {} };

  document.querySelectorAll("[data-rainbow]").forEach(el => {
    const text = el.textContent.trim(); el.textContent = ""; el.setAttribute("aria-label", text);
    let k = 0;
    for (const ch of text){
      const s = document.createElement("span"); s.textContent = ch; s.setAttribute("aria-hidden", "true");
      if (ch.trim()) s.style.color = RAINBOW[k++ % RAINBOW.length];
      el.appendChild(s);
    }
  });

  /* ---------- ses ---------- */
  let ac = null;
  function audio(){
    if (!ac){ try { ac = new (window.AudioContext || window.webkitAudioContext)(); } catch(e) { ac = null; } }
    if (ac && ac.state === "suspended") ac.resume();
    return ac;
  }
  function tone(freq, dur, type, vol, delay){
    const a = audio(); if (!a || !soundOn) return;
    const n = a.currentTime + (delay || 0), o = a.createOscillator(), g = a.createGain();
    o.type = type || "sine"; o.frequency.setValueAtTime(freq, n);
    g.gain.setValueAtTime(.0001, n); g.gain.exponentialRampToValueAtTime(vol || .1, n + .015); g.gain.exponentialRampToValueAtTime(.0001, n + dur);
    o.connect(g).connect(a.destination); o.start(n); o.stop(n + dur + .05);
  }
  const sfx = {
    ok(){ [659.25, 783.99, 1046.5].forEach((f, i) => tone(f, .16, "triangle", .11, i*.08)); },
    no(){ tone(240, .2, "sine", .1); },
    party(){ [523.25, 659.25, 783.99, 1046.5, 1318.5].forEach((f, i) => tone(f, .3, "triangle", .14, i*.12)); }
  };
  const canSpeak = "speechSynthesis" in window;
  let trVoice = null;
  function pickVoice(){ trVoice = speechSynthesis.getVoices().find(v => /^tr(-|_|$)/i.test(v.lang)) || null; }
  if (canSpeak){ pickVoice(); if (speechSynthesis.addEventListener) speechSynthesis.addEventListener("voiceschanged", pickVoice); }
  function say(text){
    if (!canSpeak || !soundOn || !trVoice) return;
    speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text); u.voice = trVoice; u.lang = trVoice.lang; u.rate = .92; u.pitch = 1.15;
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

  /* ---------- fizik ---------- */
  const W = 600, H = 760, R = 14, RL = 150, ANG = 0.42, CUPY = 640, CUPB = 712, CUPW = 64, FLOOR = 742;
  function segs(lv, cfg){
    const out = [[0, 0, 0, H], [W, 0, W, H]];
    const ramp = (x, y, d) => { const a = d === 1 ? ANG : -ANG, dx = Math.cos(a) * RL / 2, dy = Math.sin(a) * RL / 2; out.push([x - dx, y - dy, x + dx, y + dy]); };
    lv.k.forEach(([x, y], i) => { if (cfg[i]) ramp(x, y, cfg[i]); });
    (lv.f || []).forEach(([x, y, d]) => ramp(x, y, d));
    if (lv.c != null){ const c = lv.c; out.push([c - CUPW, CUPY, c - CUPW, CUPB], [c + CUPW, CUPY, c + CUPW, CUPB], [c - CUPW, CUPB, c + CUPW, CUPB]); }
    return out;
  }
  function newBall(lv){ return { x: lv.s[0], y: 30, vx: lv.s[1], vy: 0, still: 0, f: 0 }; }
  // bir kare ilerlet: "win" | "miss" | null
  function physStep(b, S, lv){
    b.f++; b.vy += 0.3;
    for (let k = 0; k < 4; k++){
      b.x += b.vx / 4; b.y += b.vy / 4;
      for (const [x1, y1, x2, y2] of S){
        const ex = x2 - x1, ey = y2 - y1, L2 = ex * ex + ey * ey;
        let t = ((b.x - x1) * ex + (b.y - y1) * ey) / L2; t = Math.max(0, Math.min(1, t));
        const px = x1 + ex * t, py = y1 + ey * t, dx = b.x - px, dy = b.y - py, d = Math.hypot(dx, dy), m = R + 5;
        if (d < m && d > 0.0001){
          const nx = dx / d, ny = dy / d; b.x += nx * (m - d); b.y += ny * (m - d);
          const vn = b.vx * nx + b.vy * ny;
          if (vn < 0){ b.vx -= 1.25 * vn * nx; b.vy -= 1.25 * vn * ny; b.vx *= 0.995; b.vy *= 0.995; }
        }
      }
    }
    if (lv.c != null && b.y > CUPY + 10 && Math.abs(b.x - lv.c) < CUPW - 4) return "win";
    if (b.y > FLOOR - R) return "miss";
    if (Math.hypot(b.vx, b.vy) < 0.08) { if (++b.still > 60) return "miss"; } else b.still = 0;
    if (b.f > 1200) return "miss";
    return null;
  }
  function simulate(lv, cfg, landing){
    const S = segs(lv, cfg), b = newBall(lv);
    for (;;){
      if (landing && b.y > CUPY) return b.x;
      const r = physStep(b, S, lv); if (r) return landing ? (r === "miss" && b.y < CUPY ? null : b.x) : r;
    }
  }

  /* ---------- durum ---------- */
  const cv = $("cv"), ctx = cv.getContext("2d");
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  cv.width = W * dpr; cv.height = H * dpr; ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  let level = 0, cfg = [], ball = null, rolling = false, tries = 0, done = false, trail = [], hintI = -1, frame = 0, result = null, idleT = null;

  function startLevel(i){
    level = Math.max(0, Math.min(LEVELS.length - 1, i)); tries = 0; done = false; hintI = -1; result = null;
    $("intro").hidden = true; $("done").hidden = true; $("party").hidden = true;
    const lv = LEVELS[level];
    cfg = lv.k.map(() => 0); ball = newBall(lv); rolling = false; trail = [];
    renderDots();
    task(level === 0 ? "Kesikli kutuya dokun, rampa koy. Sonra yeşil düğmeyle bilyeyi bırak!" : "Rampaları çevir, bilyeyi sepete düşür!");
    armIdle();
  }
  function task(t, speak){ $("task").textContent = t; if (speak !== false) say(t); }
  function renderDots(){ const d = $("dots"); d.textContent = ""; LEVELS.forEach((_, i) => { const e = document.createElement("i"); if (best[i]) e.className = "on"; d.appendChild(e); }); }
  function armIdle(){
    clearTimeout(idleT); $("drop").classList.remove("hint");
    idleT = setTimeout(() => { if (!rolling && !done){ $("drop").classList.add("hint"); say("Hazır olunca yeşil düğmeye bas."); } }, 12000);
  }
  function tapSlot(i){
    if (rolling || done) return false;
    cfg[i] = (cfg[i] + 1) % 3; ball = newBall(LEVELS[level]); trail = []; result = null;
    tone(cfg[i] ? 520 + cfg[i] * 80 : 300, .08, "triangle", .08); armIdle();
    return true;
  }
  function drop(){
    if (rolling || done) return false;
    const lv = LEVELS[level]; ball = newBall(lv); trail = []; result = null; rolling = true; tries++;
    tone(700, .1, "sine", .08); clearTimeout(idleT); $("drop").classList.remove("hint");
    return true;
  }
  function step(){
    frame++;
    if (!rolling) return;
    const lv = LEVELS[level];
    const r = physStep(ball, segsCache(), lv);
    if (frame % 3 === 0) { trail.push([ball.x, ball.y]); if (trail.length > 40) trail.shift(); }
    if (r){ rolling = false; result = r; r === "win" ? won() : missed(); }
  }
  let sc = null, scKey = "";
  function segsCache(){ const k = level + ":" + cfg.join(""); if (k !== scKey){ scKey = k; sc = segs(LEVELS[level], cfg); } return sc; }
  function won(){
    done = true; sfx.ok();
    const s = tries <= 1 ? 3 : tries <= 3 ? 2 : 1;
    best[level] = Math.max(best[level] || 0, s); persist(); renderLevels(); renderDots();
    task("Sepete düştü! Harika!");
    setTimeout(() => {
      if (level === LEVELS.length - 1){ $("party").hidden = false; sfx.party(); say("Bilye ustası Egemen! Bütün bölümleri bitirdin!"); return; }
      [...$("stars").children].forEach((el, i) => { el.className = ""; void el.offsetWidth; if (i < s) el.className = "on"; });
      $("stars").setAttribute("aria-label", s + " yıldız");
      $("done").hidden = false; sfx.party();
    }, 1000);
  }
  function missed(){
    tone(220, .25, "sine", .1);
    if (tries >= 2 && hintI < 0){
      // ilk yanlış kutuyu parlat
      const sol = LEVELS[level].a; hintI = sol.findIndex((v, i) => v !== cfg[i]);
      task(hintI >= 0 ? "Olmadı! Parlayan kutuya dokunmayı dene." : "Olmadı, bir daha dene!");
    } else task("Olmadı! Rampaları değiştirip yeniden dene.");
    setTimeout(() => { if (!rolling && !done){ ball = newBall(LEVELS[level]); trail = []; result = null; } }, 900);
    armIdle();
  }

  /* ---------- çizim ---------- */
  function rr(x, y, w, h, r){ ctx.beginPath(); ctx.roundRect ? ctx.roundRect(x, y, w, h, r) : ctx.rect(x, y, w, h); }
  function plank(x, y, d, fixed){
    const a = d === 1 ? ANG : -ANG;
    ctx.save(); ctx.translate(x, y); ctx.rotate(a);
    ctx.fillStyle = fixed ? "#9AA0AE" : "#C98A4B"; rr(-RL / 2, -7, RL, 14, 7); ctx.fill();
    ctx.fillStyle = fixed ? "#7A7F8C" : "#A86B32"; rr(-RL / 2, 3, RL, 4, 2); ctx.fill();
    ctx.restore();
  }
  function draw(){
    ctx.clearRect(0, 0, W, H);
    const lv = LEVELS[level]; if (!lv) return;
    ctx.fillStyle = "#FFFDF7"; ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = "#F0E6D2"; ctx.fillRect(0, FLOOR, W, H - FLOOR);
    // başlangıç oluğu
    ctx.fillStyle = "#E4483B"; rr(lv.s[0] - 30, 4, 60, 10, 5); ctx.fill();
    // sabit rampalar
    (lv.f || []).forEach(([x, y, d]) => plank(x, y, d, true));
    // kutular
    lv.k.forEach(([x, y], i) => {
      const glow = hintI >= 0 && !done && i === lv.a.findIndex((v, j) => v !== cfg[j]);
      ctx.save(); ctx.setLineDash([8, 7]); ctx.lineWidth = glow ? 5 : 3; ctx.strokeStyle = glow ? `rgba(255,197,41,${0.6 + 0.4 * Math.sin(frame / 6)})` : "rgba(42,37,64,.35)";
      rr(x - RL / 2 - 8, y - 46, RL + 16, 92, 16); ctx.stroke(); ctx.restore();
      if (cfg[i]) plank(x, y, cfg[i], false);
      else { ctx.fillStyle = "rgba(42,37,64,.25)"; ctx.font = "800 30px 'Baloo 2', sans-serif"; ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.fillText("?", x, y); ctx.textBaseline = "alphabetic"; }
    });
    // sepet
    const c = lv.c;
    ctx.fillStyle = "rgba(42,100,192,.12)"; ctx.fillRect(c - CUPW, CUPY, CUPW * 2, CUPB - CUPY);
    ctx.strokeStyle = "#2A64C0"; ctx.lineWidth = 10; ctx.lineCap = "round"; ctx.lineJoin = "round";
    ctx.beginPath(); ctx.moveTo(c - CUPW, CUPY); ctx.lineTo(c - CUPW, CUPB); ctx.lineTo(c + CUPW, CUPB); ctx.lineTo(c + CUPW, CUPY); ctx.stroke();
    if (done){ ctx.font = "40px 'Segoe UI Emoji','Apple Color Emoji',sans-serif"; ctx.textAlign = "center"; ctx.fillText("⭐", c, CUPY - 20 - Math.abs(Math.sin(frame / 8)) * 14); }
    // iz ve bilye
    ctx.fillStyle = "rgba(229,72,77,.18)"; for (const [x, y] of trail){ ctx.beginPath(); ctx.arc(x, y, 5, 0, 7); ctx.fill(); }
    const g = ctx.createRadialGradient(ball.x - 5, ball.y - 5, 2, ball.x, ball.y, R);
    g.addColorStop(0, "#FFB3B3"); g.addColorStop(1, "#C62F2F");
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(ball.x, ball.y, R, 0, 7); ctx.fill();
  }
  let last = 0, acc = 0;
  function loop(ts){
    const dt = Math.min(100, ts - (last || ts)); last = ts; acc += dt;
    while (acc >= 1000 / 60){ step(); acc -= 1000 / 60; }
    draw(); requestAnimationFrame(loop);
  }

  /* ---------- girdi ---------- */
  cv.addEventListener("click", (e) => {
    audio();
    const r = cv.getBoundingClientRect(), x = (e.clientX - r.left) * W / r.width, y = (e.clientY - r.top) * H / r.height;
    const lv = LEVELS[level];
    const i = lv.k.findIndex(([sx, sy]) => Math.abs(x - sx) < RL / 2 + 10 && Math.abs(y - sy) < 48);
    if (i >= 0) tapSlot(i);
    else if (Math.hypot(x - ball.x, y - ball.y) < 40) drop();
  });
  $("drop").addEventListener("click", () => { audio(); drop(); });
  document.addEventListener("keydown", (e) => { if ((e.key === " " || e.key === "Enter") && $("intro").hidden && $("done").hidden && document.activeElement === document.body){ e.preventDefault(); audio(); drop(); } });

  /* ---------- menüler ---------- */
  function renderLevels(){
    const box = $("levels"); box.textContent = "";
    LEVELS.forEach((lv, i) => {
      const b = document.createElement("button");
      b.type = "button"; b.className = "lvl";
      b.setAttribute("aria-label", `Bölüm ${i + 1}${best[i] ? ", " + best[i] + " yıldız" : ""}`);
      b.innerHTML = `<span class="ic" aria-hidden="true">🔴</span>${i + 1}<small aria-hidden="true">${"★".repeat(best[i] || 0)}</small>`;
      b.addEventListener("click", () => { audio(); startLevel(i); });
      box.appendChild(b);
    });
  }
  function showIntro(){ rolling = false; clearTimeout(idleT); if (canSpeak) speechSynthesis.cancel(); $("intro").hidden = false; $("done").hidden = true; $("party").hidden = true; }
  $("play").addEventListener("click", () => { audio(); const i = LEVELS.findIndex((_, k) => !best[k]); startLevel(i < 0 ? 0 : i); });
  $("next").addEventListener("click", () => { audio(); startLevel(level + 1); });
  $("replay").addEventListener("click", () => { audio(); startLevel(level); });
  $("again").addEventListener("click", () => { audio(); showIntro(); });
  $("menu").addEventListener("click", () => { audio(); showIntro(); });
  document.addEventListener("visibilitychange", () => { if (document.hidden && canSpeak) speechSynthesis.cancel(); });

  if (LEVELS.length){ renderLevels(); startLevel(0); }
  $("intro").hidden = false; if (canSpeak) speechSynthesis.cancel(); clearTimeout(idleT);
  requestAnimationFrame(loop);

  window.__by = { segs, simulate, physStep, newBall, startLevel, tapSlot, drop, step, get LEVELS(){ return LEVELS; }, get st(){ return { level, cfg, ball, rolling, tries, done, result, hintI }; } };
})();
