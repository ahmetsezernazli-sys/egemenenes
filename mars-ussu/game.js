/* Mars Üssü — Enes için kule savunması */
(function(){
  "use strict";

  const COLS = 16, ROWS = 10, CELL = 60, W = COLS*CELL, H = ROWS*CELL;
  // yol köşe noktaları (hücre koordinatı); ilk nokta ekran dışından başlar, son nokta üstür
  const WAYPOINTS = [[-1, 2], [3, 2], [3, 7], [7, 7], [7, 1], [11, 1], [11, 8], [14, 8], [14, 4], [16, 4]];
  const TOWERS = {
    lazer:{name:"Lazer", color:"#FF4D5E", cost:50, range:2.6, rate:1.6, dmg:9, desc:"Hızlı, tek hedef"},
    buz:{name:"Buz", color:"#4FC3F7", cost:70, range:2.2, rate:1, dmg:4, slow:.5, slowT:1.6, desc:"Yavaşlatır"},
    roket:{name:"Roket", color:"#FF9A3D", cost:110, range:3.2, rate:.5, dmg:26, splash:1, desc:"Alan hasarı"}
  };
  const LEVEL_MULT = [{dmg:1, range:1, cost:0}, {dmg:1.6, range:1.1, cost:.8}, {dmg:2.5, range:1.22, cost:1.3}];
  const ENEMIES = {
    normal:{hp:32, speed:62, reward:5, color:"#7DDB6F", r:14},
    hizli:{hp:20, speed:112, reward:4, color:"#F4E04D", r:11},
    tank:{hp:130, speed:40, reward:12, color:"#B07CFF", r:18},
    ana:{hp:900, speed:34, reward:90, color:"#FF5AAE", r:26}
  };
  const WAVES = 30, START_COINS = 150, START_LIVES = 20;
  const BEST_KEY = "mars-ussu-rekor", SOUND_KEY = "mars-ussu-ses";
  const RM = window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches;
  const FONT = '"Audiowide", "Arial Black", sans-serif';

  const $ = id => document.getElementById(id);
  const stage = $("stage"), cv = $("cv"), ctx = cv.getContext("2d");
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const rand = (a, b) => a + Math.random()*(b - a);

  let best = 0;
  try { best = +localStorage.getItem(BEST_KEY) || 0; } catch(e) {}
  let soundOn = true;
  try { soundOn = localStorage.getItem(SOUND_KEY) !== "0"; } catch(e) {}

  /* ---------- yol ---------- */
  const pathPts = WAYPOINTS.map(([c, r]) => [c*CELL + CELL/2, r*CELL + CELL/2]);
  const segLens = [];
  let pathLen = 0;
  for (let i = 0; i < pathPts.length - 1; i++){ const l = Math.hypot(pathPts[i + 1][0] - pathPts[i][0], pathPts[i + 1][1] - pathPts[i][1]); segLens.push(l); pathLen += l; }
  const pathCells = new Set();
  for (let i = 0; i < WAYPOINTS.length - 1; i++){
    let [c, r] = WAYPOINTS[i]; const [c2, r2] = WAYPOINTS[i + 1];
    const dc = Math.sign(c2 - c), dr = Math.sign(r2 - r);
    while (c !== c2 || r !== r2){ if (c >= 0 && c < COLS) pathCells.add(`${c},${r}`); c += dc; r += dr; }
    if (c2 >= 0 && c2 < COLS) pathCells.add(`${c2},${r2}`);
  }
  function posAt(d){
    let acc = 0;
    for (let i = 0; i < segLens.length; i++){
      if (d <= acc + segLens[i]){ const u = (d - acc)/segLens[i]; return [pathPts[i][0] + (pathPts[i + 1][0] - pathPts[i][0])*u, pathPts[i][1] + (pathPts[i + 1][1] - pathPts[i][1])*u]; }
      acc += segLens[i];
    }
    return pathPts[pathPts.length - 1];
  }

  /* ---------- ses ---------- */
  let ac = null, lastShot = 0;
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
    g.gain.setValueAtTime(.0001, n); g.gain.exponentialRampToValueAtTime(vol || .1, n + .005); g.gain.exponentialRampToValueAtTime(.0001, n + dur);
    o.connect(g).connect(a.destination); o.start(n); o.stop(n + dur + .05);
  }
  const sfx = {
    shot(type){ const now = performance.now(); if (now - lastShot < 60) return; lastShot = now; if (type === "lazer") tone(1400, .05, "square", .015, 900); else if (type === "buz") tone(900, .08, "sine", .03, 1500); else tone(180, .2, "sawtooth", .04, 90); },
    boom(){ tone(120, .25, "sawtooth", .06, 50); },
    build(){ tone(440, .08, "triangle", .1); tone(660, .12, "triangle", .1, null, .07); },
    upgrade(){ [523.25, 659.25, 783.99].forEach((f, i) => tone(f, .1, "triangle", .1, null, i*.06)); },
    sell(){ tone(700, .1, "sine", .08, 400); },
    leak(){ tone(200, .3, "square", .06, 100); },
    wave(){ tone(330, .15, "square", .05); tone(440, .2, "square", .05, null, .15); },
    boss(){ for (let i = 0; i < 3; i++) tone(220, .25, "sawtooth", .06, 160, i*.3); },
    win(){ [523.25, 659.25, 783.99, 1046.5, 1318.5].forEach((f, i) => tone(f, .25, "triangle", .13, null, i*.12)); }
  };
  function renderSound(){
    $("ic-on").hidden = !soundOn; $("ic-off").hidden = soundOn;
    $("sound").setAttribute("aria-label", soundOn ? "Sesi kapat" : "Sesi aç");
    $("sound").setAttribute("aria-pressed", String(soundOn));
  }
  $("sound").addEventListener("click", () => {
    soundOn = !soundOn;
    try { localStorage.setItem(SOUND_KEY, soundOn ? "1" : "0"); } catch(e) {}
    renderSound();
  });
  renderSound();

  /* ---------- durum ---------- */
  let phase = "intro";   // intro | build | wave | paused | over | won
  let resumeTo = "build", speed = 1;
  let coins, lives, wave, towers, enemies, shots, fx, queue, spawnT, selected;

  function reset(){
    coins = START_COINS; lives = START_LIVES; wave = 0;
    towers = []; enemies = []; shots = []; fx = []; queue = []; spawnT = 0; selected = null;
    hidePopups();
    renderHud();
  }

  function waveList(w){
    const list = [];
    const count = Math.min(60, 6 + w*2);
    for (let i = 0; i < count; i++){
      let t = "normal";
      const r = Math.random();
      if (w >= 3 && r < Math.min(.35, w*.03)) t = "hizli";
      else if (w >= 5 && r > 1 - Math.min(.3, w*.022)) t = "tank";
      list.push(t);
    }
    if (w % 10 === 0) list.splice(Math.floor(list.length/2), 0, "ana");
    return list;
  }

  function startWave(){
    if (phase !== "build") return;
    audio();
    wave++;
    queue = waveList(wave);
    spawnT = .5;
    phase = "wave";
    hidePopups();
    if (wave % 10 === 0) sfx.boss(); else sfx.wave();
    renderHud();
  }

  function spawn(type){
    const base = ENEMIES[type], mult = 1 + (wave - 1)*.3 + Math.max(0, wave - 15)*.12;
    const hp = Math.round(base.hp*mult*(type === "ana" ? 1 + wave*.05 : 1));
    enemies.push({type, hp, max:hp, speed:base.speed, reward:base.reward, color:base.color, r:base.r, d:0, slowT:0, slow:1, x:pathPts[0][0], y:pathPts[0][1], hit:0});
  }

  function cellFree(c, r){
    if (c < 0 || r < 0 || c >= COLS || r >= ROWS) return false;
    if (pathCells.has(`${c},${r}`)) return false;
    if (c === 15 && r >= 3 && r <= 5) return false; // üs alanı
    return !towers.some(t => t.c === c && t.r === r);
  }

  function statsOf(t){
    const b = TOWERS[t.type], L = LEVEL_MULT[t.level];
    return {dmg:b.dmg*L.dmg, range:b.range*L.range*CELL, rate:b.rate, splash:b.splash ? b.splash*CELL*(1 + t.level*.2) : 0, slow:b.slow, slowT:b.slowT};
  }
  const upgradeCost = t => t.level >= 2 ? null : Math.round(TOWERS[t.type].cost*LEVEL_MULT[t.level + 1].cost);
  const sellValue = t => Math.round(t.spent*.6);

  function build(type, c, r){
    const cost = TOWERS[type].cost;
    if (coins < cost || !cellFree(c, r)) return false;
    coins -= cost;
    towers.push({type, c, r, x:c*CELL + CELL/2, y:r*CELL + CELL/2, level:0, cd:0, angle:0, spent:cost});
    sfx.build();
    renderHud();
    return true;
  }
  function upgrade(t){
    const cost = upgradeCost(t);
    if (cost == null || coins < cost) return false;
    coins -= cost; t.level++; t.spent += cost;
    sfx.upgrade(); renderHud();
    return true;
  }
  function sell(t){
    coins += sellValue(t);
    towers.splice(towers.indexOf(t), 1);
    sfx.sell(); renderHud();
  }

  /* ---------- güncelleme ---------- */
  function update(dt){
    if (phase === "wave"){
      spawnT -= dt;
      if (queue.length && spawnT <= 0){
        spawn(queue.shift());
        spawnT = Math.max(.32, .9 - wave*.02)*(queue[0] === "ana" ? 2 : 1);
      }
    }

    for (const e of enemies){
      e.slowT = Math.max(0, e.slowT - dt);
      const sp = e.speed*(e.slowT > 0 ? e.slow : 1);
      e.d += sp*dt;
      [e.x, e.y] = posAt(e.d);
      e.hit = Math.max(0, e.hit - dt);
      if (e.d >= pathLen){
        e.dead = true; e.leaked = true;
        lives -= e.type === "ana" ? 5 : 1;
        sfx.leak();
        fx.push({kind:"flash", life:.3, max:.3});
      }
    }

    for (const t of towers){
      const s = statsOf(t);
      t.cd -= dt;
      // en öndeki hedefi seç
      let target = null;
      for (const e of enemies){
        if (e.dead) continue;
        if (Math.hypot(e.x - t.x, e.y - t.y) <= s.range && (!target || e.d > target.d)) target = e;
      }
      if (target){
        t.angle = Math.atan2(target.y - t.y, target.x - t.x);
        if (t.cd <= 0){
          t.cd = 1/s.rate;
          sfx.shot(t.type);
          if (t.type === "roket"){
            shots.push({x:t.x, y:t.y, tx:target.x, ty:target.y, target, speed:420, dmg:s.dmg, splash:s.splash});
          } else {
            hurt(target, s.dmg);
            if (t.type === "buz"){ target.slowT = s.slowT; target.slow = s.slow; }
            fx.push({kind:"beam", x1:t.x, y1:t.y, x2:target.x, y2:target.y, color:TOWERS[t.type].color, life:.08, max:.08});
          }
        }
      }
    }

    for (const sh of shots){
      if (sh.target && !sh.target.dead){ sh.tx = sh.target.x; sh.ty = sh.target.y; }
      const dx = sh.tx - sh.x, dy = sh.ty - sh.y, d = Math.hypot(dx, dy), step = sh.speed*dt;
      if (d <= step){
        sh.done = true;
        for (const e of enemies){ if (!e.dead && Math.hypot(e.x - sh.tx, e.y - sh.ty) <= sh.splash) hurt(e, sh.dmg); }
        fx.push({kind:"boom", x:sh.tx, y:sh.ty, r:sh.splash, life:.35, max:.35});
        sfx.boom();
      } else { sh.x += dx/d*step; sh.y += dy/d*step; }
    }
    shots = shots.filter(s => !s.done);

    const before = enemies.length;
    enemies = enemies.filter(e => !e.dead);
    for (const f of fx) f.life -= dt;
    fx = fx.filter(f => f.life > 0);
    if (enemies.length !== before) renderHud();

    if (lives <= 0){ lives = 0; lose(); return; }
    if (phase === "wave" && !queue.length && !enemies.length){
      const bonus = 12 + wave*2;
      coins += bonus;
      fx.push({kind:"text", txt:`Dalga ${wave} tamam! +${bonus} 🪙`, life:1.6, max:1.6});
      if (wave > best){ best = wave; try { localStorage.setItem(BEST_KEY, String(best)); } catch(e) {} }
      if (wave >= WAVES){ win(); return; }
      phase = "build";
      renderHud();
    }
  }

  function hurt(e, dmg){
    if (e.dead) return;
    e.hp -= dmg; e.hit = .08;
    if (e.hp <= 0){
      e.dead = true;
      coins += e.reward;
      fx.push({kind:"pop", x:e.x, y:e.y, r:e.r, color:e.color, life:.3, max:.3});
    }
  }

  function lose(){
    phase = "over";
    hidePopups();
    $("over-title").textContent = "Üs düştü!";
    $("over-sub").textContent = `${wave}. dalgaya kadar dayandın. En uzak dalga: ${best}.`;
    $("over").hidden = false;
    renderHud();
  }
  function win(){
    phase = "won";
    hidePopups();
    sfx.win();
    $("over-title").textContent = "Üs kurtuldu! 🎉";
    $("over-sub").textContent = `30 dalganın hepsine dayandın, ${lives} can kaldı. Gerçek bir komutansın!`;
    $("again").textContent = "Yeniden oyna";
    $("over").hidden = false;
    renderHud();
  }

  /* ---------- arayüz ---------- */
  function renderHud(){
    $("lives").textContent = lives;
    $("coins").textContent = coins;
    $("wave").textContent = `${wave}/${WAVES}`;
    const nb = $("next-wave");
    nb.disabled = phase !== "build";
    nb.textContent = phase === "wave" ? `⚔ Dalga ${wave} sürüyor` : wave === 0 ? "▶ İlk dalgayı başlat" : `▶ Dalga ${wave + 1}`;
    $("best").textContent = best;
    // açık menüyü yeniden kurmadan sadece düğmelerin durumunu güncelle (dokunuş kaybolmasın)
    if (!$("build").hidden) $("build").querySelectorAll(".opt").forEach(b => { b.disabled = coins < TOWERS[b.dataset.type].cost; });
    if (!$("tower-panel").hidden && selected && selected.kind === "tower"){
      const up = $("tp-up"), cost = upgradeCost(selected.t);
      if (up) up.disabled = cost == null || coins < cost;
    }
  }
  $("next-wave").addEventListener("click", startWave);
  $("speed").addEventListener("click", () => { speed = speed === 1 ? 2 : 1; $("speed").textContent = `⏩ ${speed}×`; $("speed").setAttribute("aria-pressed", String(speed === 2)); });
  function togglePause(){
    if (phase === "build" || phase === "wave"){ resumeTo = phase; phase = "paused"; $("paused").hidden = false; hidePopups(); }
    else if (phase === "paused"){ phase = resumeTo; $("paused").hidden = true; last = performance.now(); }
  }
  $("pause").addEventListener("click", togglePause);
  $("resume").addEventListener("click", togglePause);
  $("start").addEventListener("click", () => { audio(); reset(); phase = "build"; $("intro").hidden = true; renderHud(); });
  $("again").addEventListener("click", () => { reset(); phase = "build"; $("over").hidden = true; $("again").textContent = "Tekrar dene"; renderHud(); });
  document.addEventListener("visibilitychange", () => { if (document.hidden && phase === "wave") togglePause(); });
  window.addEventListener("keydown", e => {
    const k = e.key.toLowerCase();
    if (k === "p" || k === "escape"){ if (!$("build").hidden || !$("tower-panel").hidden) hidePopups(); else togglePause(); }
    else if (k === " " || k === "enter"){ if (phase === "build" && $("build").hidden && $("tower-panel").hidden){ e.preventDefault(); startWave(); } }
    else if (k === "f") $("speed").click();
  });

  function hidePopups(){ $("build").hidden = true; $("tower-panel").hidden = true; selected = null; }

  function placePopup(el, x, y){
    const s = view.s, rect = stage.getBoundingClientRect();
    el.hidden = false;
    const pw = el.offsetWidth, ph = el.offsetHeight;
    let left = view.ox + (x + CELL*.6)*s, top = view.oy + (y - CELL*.5)*s;
    if (left + pw > rect.width - 6) left = view.ox + (x - CELL*.6)*s - pw;
    left = clamp(left, 6, rect.width - pw - 6);
    top = clamp(top, 6, rect.height - ph - 6);
    el.style.left = left + "px"; el.style.top = top + "px";
  }

  function showBuild(c, r){
    selected = {kind:"cell", c, r};
    const el = $("build");
    el.innerHTML = `<h3>Kule kur</h3>` + Object.entries(TOWERS).map(([k, t]) =>
      `<button type="button" class="opt" data-type="${k}" ${coins < t.cost ? "disabled" : ""}><i style="background:${t.color}"></i><span><b>${t.name}</b><small>${t.desc}</small></span><span class="cost">${t.cost}</span></button>`).join("");
    el.querySelectorAll(".opt").forEach(b => b.addEventListener("click", () => { if (build(b.dataset.type, c, r)) hidePopups(); }));
    $("tower-panel").hidden = true;
    placePopup(el, c*CELL + CELL/2, r*CELL + CELL/2);
  }
  function showTower(t){
    selected = {kind:"tower", t};
    const el = $("tower-panel"), b = TOWERS[t.type], s = statsOf(t), up = upgradeCost(t);
    el.innerHTML = `<h3>${b.name} · Seviye ${t.level + 1}</h3>
      <div class="opt" style="grid-template-columns:30px 1fr"><i style="background:${b.color}"></i><span><b>Hasar ${Math.round(s.dmg)} · Menzil ${(s.range/CELL).toFixed(1)}</b><small>${b.desc}</small></span></div>
      <div class="row">
        <button type="button" class="opt" id="tp-up" ${up == null || coins < up ? "disabled" : ""}><span><b>${up == null ? "En üst seviye" : "Geliştir"}</b></span><span class="cost">${up == null ? "" : up}</span></button>
        <button type="button" class="opt" id="tp-sell"><span><b>Sat</b></span><span class="cost">+${sellValue(t)}</span></button>
      </div>`;
    el.querySelector("#tp-up").addEventListener("click", () => { upgrade(t); showTower(t); });
    el.querySelector("#tp-sell").addEventListener("click", () => { sell(t); hidePopups(); });
    $("build").hidden = true;
    placePopup(el, t.x, t.y);
  }

  cv.addEventListener("pointerdown", e => {
    if (phase !== "build" && phase !== "wave") return;
    audio();
    const r = cv.getBoundingClientRect();
    const x = (e.clientX - r.left - view.ox)/view.s, y = (e.clientY - r.top - view.oy)/view.s;
    const c = Math.floor(x/CELL), row = Math.floor(y/CELL);
    if (c < 0 || row < 0 || c >= COLS || row >= ROWS){ hidePopups(); return; }
    const t = towers.find(t => t.c === c && t.r === row);
    if (t){ if (selected && selected.t === t) hidePopups(); else showTower(t); return; }
    if (cellFree(c, row)){ if (selected && selected.kind === "cell" && selected.c === c && selected.r === row) hidePopups(); else showBuild(c, row); return; }
    hidePopups();
  });
  let hover = null;
  cv.addEventListener("pointermove", e => {
    if (e.pointerType !== "mouse") return;
    const r = cv.getBoundingClientRect();
    hover = {c:Math.floor(((e.clientX - r.left - view.ox)/view.s)/CELL), r:Math.floor(((e.clientY - r.top - view.oy)/view.s)/CELL)};
  });
  cv.addEventListener("pointerleave", () => { hover = null; });

  /* ---------- çizim ---------- */
  const view = {s:1, ox:0, oy:0, dpr:1};
  function resize(){
    const r = stage.getBoundingClientRect();
    view.dpr = Math.min(window.devicePixelRatio || 1, 2);
    cv.width = Math.round(r.width*view.dpr); cv.height = Math.round(r.height*view.dpr);
    view.s = Math.min(r.width/W, r.height/H);
    view.ox = (r.width - W*view.s)/2; view.oy = (r.height - H*view.s)/2;
    buildMap();
  }
  const map = document.createElement("canvas");
  function buildMap(){
    map.width = W; map.height = H;
    const m = map.getContext("2d");
    for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++){
      m.fillStyle = (r + c) % 2 ? "#B85A34" : "#C0633B";
      m.fillRect(c*CELL, r*CELL, CELL, CELL);
    }
    // kraterler
    m.fillStyle = "rgba(90,30,20,.25)";
    [[1, 6], [5, 4], [9, 5], [13, 1], [12, 6], [1, 9], [9, 9]].forEach(([c, r]) => { m.beginPath(); m.ellipse(c*CELL + 30, r*CELL + 30, 20, 12, 0, 0, Math.PI*2); m.fill(); });
    // yol
    m.strokeStyle = "#5E2F22"; m.lineWidth = CELL*.86; m.lineJoin = "round"; m.lineCap = "square";
    m.beginPath(); pathPts.forEach(([x, y], i) => i ? m.lineTo(x, y) : m.moveTo(x, y)); m.stroke();
    m.strokeStyle = "rgba(255,200,160,.12)"; m.lineWidth = 3; m.setLineDash([14, 14]);
    m.beginPath(); pathPts.forEach(([x, y], i) => i ? m.lineTo(x, y) : m.moveTo(x, y)); m.stroke(); m.setLineDash([]);
    // üs
    const bx = 15*CELL + 30, by = 4*CELL + 30;
    m.fillStyle = "#3A2A3F"; m.fillRect(15*CELL, 3*CELL + 6, CELL, CELL*3 - 12);
    m.fillStyle = "rgba(159,227,255,.85)"; m.beginPath(); m.arc(bx, by + 18, 34, Math.PI, 0); m.fill();
    m.strokeStyle = "#E6F7FF"; m.lineWidth = 3; m.stroke();
    m.fillStyle = "#FFD25A"; m.fillRect(bx - 3, by - 44, 6, 26);
    m.fillStyle = "#FF8A3D"; m.beginPath(); m.moveTo(bx + 3, by - 44); m.lineTo(bx + 22, by - 38); m.lineTo(bx + 3, by - 32); m.fill();
  }

  function drawTower(t){
    const b = TOWERS[t.type], sel = selected && selected.t === t;
    if (sel){ const s = statsOf(t); ctx.fillStyle = "rgba(62,214,232,.1)"; ctx.strokeStyle = "rgba(62,214,232,.6)"; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(t.x, t.y, s.range, 0, Math.PI*2); ctx.fill(); ctx.stroke(); }
    ctx.fillStyle = "#2C1D2E"; ctx.beginPath(); ctx.arc(t.x, t.y, 24, 0, Math.PI*2); ctx.fill();
    ctx.strokeStyle = "rgba(255,241,230,.25)"; ctx.lineWidth = 2; ctx.stroke();
    ctx.save(); ctx.translate(t.x, t.y); ctx.rotate(t.angle);
    ctx.fillStyle = b.color;
    if (t.type === "roket"){ ctx.fillRect(0, -9, 26, 7); ctx.fillRect(0, 2, 26, 7); }
    else if (t.type === "buz"){ ctx.fillRect(0, -5, 22, 10); ctx.beginPath(); ctx.arc(22, 0, 7, 0, Math.PI*2); ctx.fill(); }
    else ctx.fillRect(0, -4, 28, 8);
    ctx.beginPath(); ctx.arc(0, 0, 13, 0, Math.PI*2); ctx.fill();
    ctx.restore();
    // seviye noktaları
    for (let i = 0; i <= t.level; i++){ ctx.fillStyle = "#FFD25A"; ctx.beginPath(); ctx.arc(t.x - 10 + i*10, t.y + 20, 3.5, 0, Math.PI*2); ctx.fill(); }
  }

  function drawEnemy(e){
    const wob = RM ? 0 : Math.sin(e.d*.15)*2;
    ctx.fillStyle = "rgba(0,0,0,.25)"; ctx.beginPath(); ctx.ellipse(e.x, e.y + e.r*.8, e.r, e.r*.35, 0, 0, Math.PI*2); ctx.fill();
    ctx.fillStyle = e.hit > 0 ? "#FFFFFF" : e.color;
    ctx.beginPath(); ctx.ellipse(e.x, e.y + wob*.3, e.r, e.r - wob*.3, 0, 0, Math.PI*2); ctx.fill();
    if (e.slowT > 0){ ctx.strokeStyle = "#9FE3FF"; ctx.lineWidth = 3; ctx.stroke(); }
    ctx.fillStyle = "#1E1320";
    ctx.beginPath(); ctx.arc(e.x - e.r*.35, e.y - e.r*.15, e.r*.2, 0, Math.PI*2); ctx.arc(e.x + e.r*.35, e.y - e.r*.15, e.r*.2, 0, Math.PI*2); ctx.fill();
    if (e.type === "ana"){ ctx.strokeStyle = "#FFD25A"; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(e.x - 14, e.y - e.r - 2); ctx.lineTo(e.x - 8, e.y - e.r - 12); ctx.lineTo(e.x, e.y - e.r - 4); ctx.lineTo(e.x + 8, e.y - e.r - 12); ctx.lineTo(e.x + 14, e.y - e.r - 2); ctx.stroke(); }
    if (e.hp < e.max){
      const w = e.r*2;
      ctx.fillStyle = "rgba(0,0,0,.5)"; ctx.fillRect(e.x - w/2, e.y - e.r - 10, w, 4);
      ctx.fillStyle = e.hp/e.max > .5 ? "#7DDB6F" : e.hp/e.max > .25 ? "#F4E04D" : "#FF4D5E";
      ctx.fillRect(e.x - w/2, e.y - e.r - 10, w*clamp(e.hp/e.max, 0, 1), 4);
    }
  }

  function draw(){
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = "#140C16"; ctx.fillRect(0, 0, cv.width, cv.height);
    ctx.setTransform(view.dpr*view.s, 0, 0, view.dpr*view.s, view.dpr*view.ox, view.dpr*view.oy);
    ctx.drawImage(map, 0, 0);

    if (hover && (phase === "build" || phase === "wave") && cellFree(hover.c, hover.r)){
      ctx.strokeStyle = "rgba(255,241,230,.5)"; ctx.lineWidth = 2; ctx.strokeRect(hover.c*CELL + 3, hover.r*CELL + 3, CELL - 6, CELL - 6);
    }
    if (selected && selected.kind === "cell"){
      ctx.strokeStyle = "#3ED6E8"; ctx.lineWidth = 3; ctx.strokeRect(selected.c*CELL + 3, selected.r*CELL + 3, CELL - 6, CELL - 6);
    }
    (towers || []).forEach(drawTower);
    (enemies || []).forEach(drawEnemy);
    for (const s of shots || []){ ctx.fillStyle = "#FFD25A"; ctx.beginPath(); ctx.arc(s.x, s.y, 6, 0, Math.PI*2); ctx.fill(); }
    for (const f of fx || []){
      const a = clamp(f.life/f.max, 0, 1);
      if (f.kind === "beam"){ ctx.strokeStyle = f.color; ctx.globalAlpha = a; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(f.x1, f.y1); ctx.lineTo(f.x2, f.y2); ctx.stroke(); ctx.globalAlpha = 1; }
      else if (f.kind === "boom"){ ctx.fillStyle = `rgba(255,154,61,${(a*.45).toFixed(2)})`; ctx.beginPath(); ctx.arc(f.x, f.y, f.r*(1.2 - a*.4), 0, Math.PI*2); ctx.fill(); }
      else if (f.kind === "pop"){ ctx.strokeStyle = f.color; ctx.globalAlpha = a; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(f.x, f.y, f.r*(2 - a), 0, Math.PI*2); ctx.stroke(); ctx.globalAlpha = 1; }
      else if (f.kind === "flash"){ ctx.fillStyle = `rgba(255,77,94,${(a*.25).toFixed(2)})`; ctx.fillRect(0, 0, W, H); }
      else if (f.kind === "text"){ ctx.globalAlpha = Math.min(1, a*2); ctx.font = `400 28px ${FONT}`; ctx.textAlign = "center"; ctx.lineWidth = 6; ctx.strokeStyle = "#1E1320"; ctx.strokeText(f.txt, W/2, 60); ctx.fillStyle = "#FFD25A"; ctx.fillText(f.txt, W/2, 60); ctx.globalAlpha = 1; }
    }
    if (phase === "build" && wave > 0 && wave < WAVES){
      ctx.font = `400 16px ${FONT}`; ctx.textAlign = "left"; ctx.fillStyle = "rgba(255,241,230,.8)";
      ctx.fillText(wave % 10 === 9 ? "⚠ Sıradaki dalgada ana gemi geliyor!" : "Hazır olunca dalgayı başlat.", 12, H - 14);
    }
  }

  let last = performance.now();
  function frame(now){
    const raw = Math.min(.05, (now - last)/1000); last = now;
    if (phase === "build" || phase === "wave"){
      // 2× hızda iki küçük adım: hızlı mermiler hedefi atlamasın
      for (let i = 0; i < speed; i++) update(raw);
    }
    draw();
    requestAnimationFrame(frame);
  }

  if ("ResizeObserver" in window) new ResizeObserver(resize).observe(stage);
  else window.addEventListener("resize", resize);
  reset();
  resize();
  requestAnimationFrame(frame);
})();
