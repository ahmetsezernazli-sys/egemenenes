/* Ay'a İniş — Enes için uzay aracı iniş oyunu */
(function(){
  "use strict";

  const W = 1000, H = 620, SAVE = "ay-inisi", SOUND_KEY = "ay-inisi-ses";
  const SAFE_VY = 42, SAFE_VX = 22, SAFE_ANG = 0.22, ROT = 2.6;
  // bölümler: yerçekimi, yakıt, rüzgâr, pist genişlikleri, arazi pürüzü
  const LEVELS = [
    {g:22, fuel:100, wind:0,  pads:[140, 110], rough:70},
    {g:24, fuel:100, wind:0,  pads:[110, 80],  rough:90},
    {g:26, fuel:95, wind:3,  pads:[100, 70],  rough:110},
    {g:28, fuel:95, wind:4,  pads:[90, 60],   rough:130},
    {g:30, fuel:90, wind:6,  pads:[80, 56],   rough:150},
    {g:32, fuel:90, wind:7,  pads:[70, 52],   rough:170},
    {g:34, fuel:88, wind:9,  pads:[64, 48],   rough:190},
    {g:36, fuel:86, wind:10, pads:[60, 46],   rough:210},
    {g:36, fuel:90, wind:11, pads:[56, 44],   rough:220},
    {g:38, fuel:92, wind:12, pads:[52, 42],   rough:230}
  ];

  const $ = id => document.getElementById(id);
  const cv = $("cv"), ctx = cv.getContext("2d"), stage = $("stage");
  const rand = (a, b) => a + Math.random()*(b - a);
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

  let soundOn = true, save = {stars:[], score:[], assist:false, lv:0};
  try { soundOn = localStorage.getItem(SOUND_KEY) !== "0"; } catch(e) {}
  try { save = Object.assign(save, JSON.parse(localStorage.getItem(SAVE) || "{}")); } catch(e) {}
  const persist = () => { try { localStorage.setItem(SAVE, JSON.stringify(save)); } catch(e) {} };

  /* ---------- ses ---------- */
  let ac = null, eng = null;
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
  // itici sesi: sürekli gürültü, kazancı değişir
  function engine(on){
    const a = ac; if (!a) return;
    if (!eng){
      const len = a.sampleRate*2, buf = a.createBuffer(1, len, a.sampleRate), d = buf.getChannelData(0);
      for (let i = 0; i < len; i++) d[i] = Math.random()*2 - 1;
      const s = a.createBufferSource(); s.buffer = buf; s.loop = true;
      const f = a.createBiquadFilter(); f.type = "lowpass"; f.frequency.value = 500;
      const g = a.createGain(); g.gain.value = 0;
      s.connect(f).connect(g).connect(a.destination); s.start();
      eng = g;
    }
    eng.gain.setTargetAtTime(on && soundOn ? .22 : 0, a.currentTime, .05);
  }
  const sfx = {
    land(){ [523, 659, 784, 1047].forEach((f, i) => tone(f, .2, "triangle", .1, null, i*.1)); },
    crash(){ const a = audio(); if (!a || !soundOn) return;
      const len = a.sampleRate*.8, buf = a.createBuffer(1, len, a.sampleRate), d = buf.getChannelData(0);
      for (let i = 0; i < len; i++) d[i] = (Math.random()*2 - 1)*Math.pow(1 - i/len, 2);
      const s = a.createBufferSource(); s.buffer = buf; const f = a.createBiquadFilter(); f.type = "lowpass"; f.frequency.value = 600;
      const g = a.createGain(); g.gain.value = .6; s.connect(f).connect(g).connect(a.destination); s.start(); },
    warn(){ tone(880, .08, "square", .04); },
    star(){ tone(1319, .12, "triangle", .08); }
  };
  function renderSound(){
    $("ic-on").hidden = !soundOn; $("ic-off").hidden = soundOn;
    $("sound").setAttribute("aria-label", soundOn ? "Sesi kapat" : "Sesi aç");
    $("sound").setAttribute("aria-pressed", String(soundOn));
  }
  $("sound").addEventListener("click", () => {
    soundOn = !soundOn;
    try { localStorage.setItem(SOUND_KEY, soundOn ? "1" : "0"); } catch(e) {}
    if (!soundOn) engine(false);
    renderSound();
  });
  renderSound();

  /* ---------- arazi ---------- */
  let S = null;    // {lv, terrain:[{x,y}], pads:[{x0,x1,y,mul}], ship, state, t, stars:[]}
  const STEP = 20;
  function genTerrain(L){
    const n = W/STEP + 1, ys = new Array(n);
    // orta nokta kaydırma
    const size = 64; let arr = new Array(size + 1);
    arr[0] = rand(420, 540); arr[size] = rand(420, 540);
    for (let step = size, amp = L.rough; step > 1; step >>= 1, amp *= .55)
      for (let i = step/2; i < size; i += step) arr[i] = (arr[i - step/2] + arr[i + step/2])/2 + rand(-amp, amp);
    for (let i = 0; i < n; i++){ const t = i/(n - 1)*size, a = Math.floor(t), b = Math.min(size, a + 1); ys[i] = arr[a] + (arr[b] - arr[a])*(t - a); }
    for (let i = 0; i < n; i++) ys[i] = clamp(ys[i], 300, H - 30);
    // pistler: üst üste binmeyen düz bölgeler
    const pads = [];
    for (const wpx of L.pads){
      const cells = Math.ceil(wpx/STEP);
      for (let tries = 0; tries < 100; tries++){
        const i0 = 2 + Math.floor(Math.random()*(n - cells - 4));
        if (pads.some(p => !(i0 + cells < p.i0 - 3 || i0 > p.i1 + 3))) continue;
        let y = 0; for (let i = i0; i <= i0 + cells; i++) y += ys[i]; y /= cells + 1;
        y = clamp(y, 330, H - 40);
        for (let i = i0; i <= i0 + cells; i++) ys[i] = y;
        pads.push({i0, i1:i0 + cells, x0:i0*STEP, x1:(i0 + cells)*STEP, y, mul:wpx >= 100 ? 1 : wpx >= 70 ? 2 : wpx >= 50 ? 3 : 4});
        break;
      }
    }
    return {pts:ys.map((y, i) => ({x:i*STEP, y})), pads};
  }
  function groundY(x){
    const i = clamp(Math.floor(x/STEP), 0, S.pts.length - 2), a = S.pts[i], b = S.pts[i + 1];
    return a.y + (b.y - a.y)*clamp((x - a.x)/STEP, 0, 1);
  }

  function startLevel(lv){
    const L = LEVELS[lv];
    const t = genTerrain(L);
    S = {lv, L, pts:t.pts, pads:t.pads, state:"fly", t:0, wind:0, parts:[], msgT:0,
      ship:{x:rand(140, W - 140), y:70, vx:rand(-30, 30), vy:0, a:0, fuel:L.fuel, thr:false}};
    if (!S.stars) S.stars = Array.from({length:90}, () => ({x:Math.random()*W, y:Math.random()*300, r:Math.random()*1.4 + .3}));
    save.lv = lv; persist();
    $("menu").hidden = true; $("over").hidden = true;
    $("lv").textContent = lv + 1;
  }

  /* ---------- güncelle ---------- */
  const keys = {};
  function update(dt){
    if (!S || S.state !== "fly") { if (S) stepParts(dt); engine(false); return; }
    const sh = S.ship, L = S.L;
    S.t += dt;
    S.wind = L.wind*Math.sin(S.t*.35 + S.lv);
    const rot = (keys.r ? 1 : 0) - (keys.l ? 1 : 0);
    if (rot) sh.a += rot*ROT*dt;
    else if (save.assist) sh.a -= sh.a*Math.min(1, 3*dt);
    sh.a = clamp(sh.a, -Math.PI*.6, Math.PI*.6);
    sh.thr = !!keys.t && sh.fuel > 0;
    let ax = S.wind, ay = L.g;
    if (sh.thr){
      const acc = L.g*2.3;
      ax += Math.sin(sh.a)*acc; ay -= Math.cos(sh.a)*acc;
      sh.fuel = Math.max(0, sh.fuel - 5.5*dt);
      if (Math.random() < .8) S.parts.push({x:sh.x - Math.sin(sh.a)*16, y:sh.y + Math.cos(sh.a)*16, vx:-Math.sin(sh.a)*120 + rand(-30, 30), vy:Math.cos(sh.a)*120 + rand(-20, 20), life:.4, max:.4, c:Math.random() < .5 ? "#FFC93C" : "#FF7A3C", r:rand(2, 4)});
    }
    engine(sh.thr);
    sh.vx += ax*dt; sh.vy += ay*dt;
    sh.x += sh.vx*dt; sh.y += sh.vy*dt;
    if (sh.x < 10){ sh.x = 10; sh.vx = Math.abs(sh.vx)*.3; }
    if (sh.x > W - 10){ sh.x = W - 10; sh.vx = -Math.abs(sh.vx)*.3; }
    if (sh.y < 20){ sh.y = 20; sh.vy = Math.max(0, sh.vy); }
    // ayaklar ve gövde çarpışması
    const ca = Math.cos(sh.a), sa = Math.sin(sh.a);
    const pts = [[-13, 14], [13, 14], [-10, -8], [10, -8], [0, -16]].map(([px, py]) => [sh.x + px*ca - py*sa, sh.y + px*sa + py*ca]);
    const hit = pts.some(([px, py]) => py >= groundY(px));
    if (hit) land(pts);
    stepParts(dt);
  }
  function stepParts(dt){
    for (let i = S.parts.length - 1; i >= 0; i--){
      const p = S.parts[i]; p.life -= dt; p.x += p.vx*dt; p.y += p.vy*dt; p.vy += (p.g || 0)*dt;
      if (p.life <= 0) S.parts.splice(i, 1);
    }
  }
  function land(pts){
    const sh = S.ship;
    const legsDown = pts[0][1] >= groundY(pts[0][0]) - 2 || pts[1][1] >= groundY(pts[1][0]) - 2;
    const pad = S.pads.find(p => pts[0][0] >= p.x0 - 2 && pts[1][0] <= p.x1 + 2);
    const ok = pad && legsDown && sh.vy < SAFE_VY && Math.abs(sh.vx) < SAFE_VX && Math.abs(sh.a) < SAFE_ANG;
    engine(false);
    if (ok){
      S.state = "landed"; sh.y = pad.y - 14; sh.vx = sh.vy = 0;
      const fuelPct = sh.fuel/S.L.fuel;
      const soft = 1 - sh.vy/SAFE_VY;
      const score = Math.round((50 + fuelPct*100 + Math.max(0, soft)*30)*pad.mul);
      const stars = fuelPct > .45 ? 3 : fuelPct > .2 ? 2 : 1;
      save.stars[S.lv] = Math.max(save.stars[S.lv] || 0, stars);
      save.score[S.lv] = Math.max(save.score[S.lv] || 0, score);
      persist(); sfx.land();
      showOver(true, `${"⭐".repeat(stars)} ${score} puan`, `Pist ×${pad.mul} · kalan yakıt %${Math.round(fuelPct*100)} · düşüş ${Math.round(sh.vy)}. Bölüm rekoru: ${save.score[S.lv]}`);
    } else {
      S.state = "crash"; sfx.crash();
      for (let i = 0; i < 50; i++){ const a = rand(0, Math.PI*2), s = rand(40, 260); S.parts.push({x:sh.x, y:sh.y, vx:Math.cos(a)*s, vy:Math.sin(a)*s - 60, g:S.L.g*2, life:rand(.6, 1.4), max:1.4, c:["#FFC93C", "#FF7A3C", "#E9EEF5", "#888"][i % 4], r:rand(2, 5)}); }
      let why = "Pistin dışına indin.";
      if (pad && legsDown){
        if (sh.vy >= SAFE_VY) why = `Çok hızlı düştün (${Math.round(sh.vy)}, en çok ${SAFE_VY - 1}).`;
        else if (Math.abs(sh.vx) >= SAFE_VX) why = `Yan hızın çok fazlaydı (${Math.round(Math.abs(sh.vx))}).`;
        else why = "Araç eğikti, dik inmelisin.";
      } else if (pad) why = "Araç yan yattı, dik inmelisin.";
      showOver(false, "Kaza!", why);
    }
  }
  function showOver(win, title, tx){
    if (fastMode) return;
    setTimeout(() => {
      $("over-ic").textContent = win ? (S.lv === LEVELS.length - 1 ? "🏆" : "🏁") : "💥";
      $("over-title").textContent = win && S.lv === LEVELS.length - 1 ? "Bütün bölümler bitti! " + title : title;
      $("over-tx").textContent = tx;
      $("next").hidden = !win || S.lv === LEVELS.length - 1;
      $("retry").textContent = win ? "Bölümü tekrar oyna" : "Tekrar dene";
      $("over").hidden = false; ($("next").hidden ? $("retry") : $("next")).focus();
      renderMenu();
    }, win ? 700 : 1100);
  }

  /* ---------- çizim ---------- */
  const view = {w:0, h:0, dpr:1, s:1, ox:0, oy:0};
  function resize(){
    const r = stage.getBoundingClientRect(); if (!r.width || !r.height) return;
    view.dpr = Math.min(window.devicePixelRatio || 1, 2); view.w = r.width; view.h = r.height;
    cv.width = Math.round(r.width*view.dpr); cv.height = Math.round(r.height*view.dpr);
    view.s = Math.min(r.width/W, r.height/H); view.ox = (r.width - W*view.s)/2; view.oy = (r.height - H*view.s)/2;
  }
  function draw(){
    const d = view.dpr;
    ctx.setTransform(d, 0, 0, d, 0, 0); ctx.fillStyle = "#05060D"; ctx.fillRect(0, 0, view.w, view.h);
    if (!S) return;
    ctx.setTransform(d*view.s, 0, 0, d*view.s, d*view.ox, d*view.oy);
    ctx.save(); ctx.beginPath(); ctx.rect(0, 0, W, H); ctx.clip();
    const sky = ctx.createLinearGradient(0, 0, 0, H); sky.addColorStop(0, "#05060D"); sky.addColorStop(1, "#141A33");
    ctx.fillStyle = sky; ctx.fillRect(0, 0, W, H);
    for (const st of S.stars){ ctx.fillStyle = `rgba(255,255,255,${.4 + st.r*.3})`; ctx.fillRect(st.x, st.y, st.r, st.r); }
    // Dünya
    ctx.fillStyle = "#2A64C0"; ctx.beginPath(); ctx.arc(860, 90, 34, 0, Math.PI*2); ctx.fill();
    ctx.fillStyle = "#3DAA5A"; ctx.beginPath(); ctx.ellipse(850, 82, 14, 9, .4, 0, Math.PI*2); ctx.fill(); ctx.beginPath(); ctx.ellipse(874, 104, 9, 6, -.3, 0, Math.PI*2); ctx.fill();
    // arazi
    ctx.fillStyle = "#8D8D9C"; ctx.beginPath(); ctx.moveTo(0, H);
    for (const p of S.pts) ctx.lineTo(p.x, p.y);
    ctx.lineTo(W, H); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = "#C9C9D6"; ctx.lineWidth = 2; ctx.beginPath();
    S.pts.forEach((p, i) => i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)); ctx.stroke();
    ctx.fillStyle = "rgba(0,0,0,.12)";
    for (let i = 0; i < 18; i++){ const x = (i*157) % W, y = groundY(x) + 30 + (i*37) % 80; ctx.beginPath(); ctx.ellipse(x, y, 16 + i % 3*6, 5, 0, 0, Math.PI*2); ctx.fill(); }
    // pistler
    for (const p of S.pads){
      ctx.fillStyle = "#FFC93C"; ctx.fillRect(p.x0, p.y - 2, p.x1 - p.x0, 5);
      const blink = Math.sin(performance.now()/200) > 0;
      ctx.fillStyle = blink ? "#3DDC97" : "#1F6B4A"; ctx.beginPath(); ctx.arc(p.x0 + 3, p.y - 6, 3, 0, 7); ctx.arc(p.x1 - 3, p.y - 6, 3, 0, 7); ctx.fill();
      ctx.fillStyle = "#FFC93C"; ctx.font = "700 15px Rubik, sans-serif"; ctx.textAlign = "center";
      ctx.fillText(`×${p.mul}`, (p.x0 + p.x1)/2, p.y + 22);
    }
    // parçacıklar
    for (const p of S.parts){ ctx.globalAlpha = clamp(p.life/p.max*1.4, 0, 1); ctx.fillStyle = p.c; ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, 7); ctx.fill(); }
    ctx.globalAlpha = 1;
    // araç
    const sh = S.ship;
    if (S.state !== "crash"){
      ctx.save(); ctx.translate(sh.x, sh.y); ctx.rotate(sh.a);
      if (sh.thr){ const fl = 14 + Math.random()*10; ctx.fillStyle = "#FF8A3C"; ctx.beginPath(); ctx.moveTo(-6, 10); ctx.lineTo(0, 10 + fl); ctx.lineTo(6, 10); ctx.fill(); ctx.fillStyle = "#FFE680"; ctx.beginPath(); ctx.moveTo(-3, 10); ctx.lineTo(0, 10 + fl*.6); ctx.lineTo(3, 10); ctx.fill(); }
      ctx.strokeStyle = "#C9CED6"; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.moveTo(-8, 4); ctx.lineTo(-13, 14); ctx.moveTo(8, 4); ctx.lineTo(13, 14); ctx.moveTo(-16, 14); ctx.lineTo(-10, 14); ctx.moveTo(10, 14); ctx.lineTo(16, 14); ctx.stroke();
      ctx.fillStyle = "#B8902A"; ctx.fillRect(-11, -2, 22, 10);
      ctx.fillStyle = "#555"; ctx.beginPath(); ctx.moveTo(-5, 8); ctx.lineTo(5, 8); ctx.lineTo(7, 12); ctx.lineTo(-7, 12); ctx.fill();
      ctx.fillStyle = "#E9EEF5"; ctx.beginPath(); ctx.arc(0, -8, 10, 0, Math.PI*2); ctx.fill();
      ctx.fillStyle = "#3D8BFD"; ctx.beginPath(); ctx.arc(1, -9, 4.5, 0, Math.PI*2); ctx.fill();
      ctx.restore();
    }
    // rüzgâr göstergesi
    if (S.L.wind){
      const w = S.wind; ctx.fillStyle = "rgba(255,255,255,.75)"; ctx.font = "600 14px Rubik, sans-serif"; ctx.textAlign = "left";
      ctx.fillText(`Rüzgâr ${w > 0 ? "→" : "←"} ${Math.abs(w).toFixed(1)}`, 14, 24);
    }
    // araç ekran dışına yakınsa yükseklik oku
    ctx.restore();
  }
  function hud(){
    if (!S) return;
    const sh = S.ship, alt = Math.max(0, Math.round(groundY(sh.x) - sh.y - 14));
    $("vy").textContent = Math.round(sh.vy); $("vx").textContent = Math.round(sh.vx);
    $("ang").textContent = Math.round(sh.a*180/Math.PI) + "°"; $("alt").textContent = alt;
    $("c-vy").className = "chip " + (sh.vy < SAFE_VY ? "ok" : "bad");
    $("c-vx").className = "chip " + (Math.abs(sh.vx) < SAFE_VX ? "ok" : "bad");
    $("c-ang").className = "chip " + (Math.abs(sh.a) < SAFE_ANG ? "ok" : "bad");
    $("fuel").style.width = (100*sh.fuel/S.L.fuel) + "%";
  }

  /* ---------- giriş ---------- */
  const KEYS = {ArrowLeft:"l", a:"l", A:"l", ArrowRight:"r", d:"r", D:"r", ArrowUp:"t", w:"t", W:"t", " ":"t"};
  window.addEventListener("keydown", e => {
    if (!$("over").hidden && (e.key === "Enter" || e.key === " ")) return;
    const k = KEYS[e.key]; if (!k || !$("menu").hidden) return;
    e.preventDefault(); audio(); keys[k] = true;
  });
  window.addEventListener("keyup", e => { const k = KEYS[e.key]; if (k) keys[k] = false; });
  window.addEventListener("blur", () => { for (const k in keys) keys[k] = false; });
  document.querySelectorAll("#thr button").forEach(b => {
    const k = b.dataset.k;
    b.addEventListener("pointerdown", e => { e.preventDefault(); audio(); keys[k] = true; b.classList.add("on"); try { b.setPointerCapture(e.pointerId); } catch(_) {} });
    const off = () => { keys[k] = false; b.classList.remove("on"); };
    b.addEventListener("pointerup", off); b.addEventListener("pointercancel", off); b.addEventListener("lostpointercapture", off);
    b.addEventListener("contextmenu", e => e.preventDefault());
  });

  /* ---------- menü ---------- */
  let pickLv = save.lv || 0;
  function renderMenu(){
    const g = $("lv-grid"); g.textContent = "";
    LEVELS.forEach((_, i) => {
      const b = document.createElement("button"); b.type = "button";
      const open = i === 0 || save.stars[i - 1];
      b.disabled = !open; b.className = i === pickLv ? "cur" : "";
      b.innerHTML = `${open ? i + 1 : "🔒"}<small>${"★".repeat(save.stars[i] || 0)}</small>`;
      b.setAttribute("aria-label", `Bölüm ${i + 1}${open ? "" : ", kilitli"}${save.stars[i] ? ", " + save.stars[i] + " yıldız" : ""}`);
      b.addEventListener("click", () => { pickLv = i; renderMenu(); });
      g.appendChild(b);
    });
    const tot = save.score.reduce((s, v) => s + (v || 0), 0);
    $("best").textContent = tot ? `Toplam rekor puan: ${tot}` : "";
    $("assist").checked = !!save.assist;
  }
  $("assist").addEventListener("change", () => { save.assist = $("assist").checked; persist(); });
  $("start").addEventListener("click", () => { audio(); startLevel(pickLv); });
  $("open-menu").addEventListener("click", () => { pickLv = S ? S.lv : pickLv; renderMenu(); $("over").hidden = true; $("menu").hidden = false; engine(false); });
  $("next").addEventListener("click", () => { audio(); pickLv = Math.min(LEVELS.length - 1, S.lv + 1); startLevel(pickLv); });
  $("retry").addEventListener("click", () => { audio(); startLevel(S.lv); });
  renderMenu();

  /* ---------- döngü ---------- */
  let last = performance.now(), fastMode = false;
  function frame(now){
    const dt = Math.min(.05, (now - last)/1000); last = now;
    if ($("menu").hidden) update(dt);
    draw(); hud();
    requestAnimationFrame(frame);
  }
  if ("ResizeObserver" in window) new ResizeObserver(resize).observe(stage);
  else window.addEventListener("resize", resize);
  resize();
  startLevel(save.lv || 0); $("menu").hidden = false;
  requestAnimationFrame(frame);

  // test kancası
  window.__ay = { LEVELS, startLevel, update, keys, groundY, setFast: f => { fastMode = f; }, get S(){ return S; }, SAFE_VY, SAFE_VX, SAFE_ANG };
})();
