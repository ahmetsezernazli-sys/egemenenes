/* Kutu Ustası — Enes için kutu itme zekâ oyunu */
(function(){
  "use strict";

  const LEVELS = window.KUTU_LEVELS || [];
  const SAVE_KEY = "kutu-ustasi-ilerleme", SOUND_KEY = "kutu-ustasi-ses";
  const DIRS = {u:[0, -1], d:[0, 1], l:[-1, 0], r:[1, 0]};
  const RM = window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches;
  const C = {floorA:"#2B3240", floorB:"#2F3746", wallTop:"#5A667C", wall:"#475166", wallShade:"#353D4D",
             pad:"#5BD68A", crate:"#F2A541", crateDark:"#A8651F", good:"#5BD68A", goodDark:"#23804A", alert:"#FF6B6B", alertDark:"#B03A3A",
             robot:"#E8EDF3", visor:"#1B2433", eye:"#5BE0E6"};

  const $ = id => document.getElementById(id);
  const wrap = $("boardWrap"), cv = $("cv"), ctx = cv.getContext("2d");
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

  let save = {best:{}, stars:{}, watched:{}, unlocked:0, last:0};
  try { const s = JSON.parse(localStorage.getItem(SAVE_KEY) || "null"); if (s) save = Object.assign(save, s); } catch(e) {}
  const persist = () => { try { localStorage.setItem(SAVE_KEY, JSON.stringify(save)); } catch(e) {} };
  let soundOn = true;
  try { soundOn = localStorage.getItem(SOUND_KEY) !== "0"; } catch(e) {}

  let L = null, anim = null, queued = null, playback = null, bumpT = 0, tile = 40, dpr = 1, time = 0;

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
    g.gain.setValueAtTime(.0001, n); g.gain.exponentialRampToValueAtTime(vol || .1, n + .008); g.gain.exponentialRampToValueAtTime(.0001, n + dur);
    o.connect(g).connect(a.destination); o.start(n); o.stop(n + dur + .05);
  }
  const sfx = {
    step(){ tone(210, .04, "sine", .035); },
    push(onGoal){ tone(150, .09, "triangle", .1, 110); if (onGoal){ tone(880, .12, "sine", .09, null, .05); tone(1318.5, .18, "sine", .08, null, .12); } },
    bump(){ tone(90, .08, "square", .04, 70); },
    undo(){ tone(520, .07, "sine", .05, 360); },
    win(){ [523.25, 659.25, 783.99, 1046.5, 1318.5].forEach((f, i) => tone(f, .22, "triangle", .12, null, i*.09)); }
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

  /* ---------- bölüm ---------- */
  function load(idx){
    idx = clamp(idx | 0, 0, LEVELS.length - 1);
    const m = LEVELS[idx].m, rows = m.length, cols = Math.max(...m.map(r => r.length));
    const walls = new Set(), goals = new Set(), boxes = new Set();
    let player = 0;
    for (let y = 0; y < rows; y++) for (let x = 0; x < cols; x++){
      const c = m[y][x] || "#", i = y*cols + x;
      if (c === "#") walls.add(i);
      if (c === "." || c === "*" || c === "+") goals.add(i);
      if (c === "$" || c === "*") boxes.add(i);
      if (c === "@" || c === "+") player = i;
    }
    const floor = new Set([player]), stack = [player];
    while (stack.length){
      const i = stack.pop(), x = i % cols, y = (i/cols) | 0;
      for (const [dx, dy] of Object.values(DIRS)){
        const nx = x + dx, ny = y + dy, n = ny*cols + nx;
        if (nx >= 0 && ny >= 0 && nx < cols && ny < rows && !walls.has(n) && !floor.has(n)){ floor.add(n); stack.push(n); }
      }
    }
    // sadece zemine komşu duvarlar çizilir, gerisi boşluk
    const shownWalls = new Set();
    for (const w of walls){
      const x = w % cols, y = (w/cols) | 0;
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++){
        const nx = x + dx, ny = y + dy;
        if (nx >= 0 && ny >= 0 && nx < cols && ny < rows && floor.has(ny*cols + nx)) shownWalls.add(w);
      }
    }
    L = {idx, cols, rows, walls, goals, floor, shownWalls, boxes, player, facing:"d", history:[], moves:0, won:false, watched:false,
         dead:new Set(), startBoxes:new Set(boxes), startPlayer:player};
    save.last = idx; persist();
    anim = null; queued = null; playback = null;
    $("win").hidden = true;
    layout(); renderHud();
    setStatus(idx === 0 ? "Robotu yürüt, turuncu kutuyu yeşil halkaya it." : "");
  }

  function restart(){
    if (!L) return;
    playback = null; anim = null; queued = null;
    L.boxes = new Set(L.startBoxes); L.player = L.startPlayer; L.history = []; L.moves = 0;
    L.won = false; L.watched = false; L.dead = new Set(); L.facing = "d";
    $("win").hidden = true;
    renderHud(); setStatus("");
  }

  function setStatus(text, cls){
    const el = $("status");
    el.textContent = text; el.className = "status" + (cls ? " " + cls : "");
  }

  function starsFor(moves, par){ return moves <= par ? 3 : moves <= Math.ceil(par*1.5) ? 2 : 1; }

  function starSvg(on, size){
    return `<svg viewBox="0 0 24 24" width="${size}" height="${size}"><path d="M12 2.5l2.9 6 6.6.9-4.8 4.6 1.2 6.5L12 17.4 6.1 20.5l1.2-6.5L2.5 9.4l6.6-.9z" fill="${on ? "#F2A541" : "none"}" stroke="${on ? "#F2A541" : "#5B6576"}" stroke-width="1.6" stroke-linejoin="round"/></svg>`;
  }

  function renderHud(){
    if (!L) return;
    const par = LEVELS[L.idx].par, best = save.best[L.idx];
    $("lvl-num").textContent = L.idx + 1;
    document.querySelector(".of").textContent = "/ " + LEVELS.length;
    $("moves").textContent = L.moves;
    $("par").textContent = "≤ " + par;
    $("best").textContent = best ? best : "—";
    const live = L.watched ? 0 : starsFor(Math.max(L.moves, 0), par);
    $("live-stars").innerHTML = [0, 1, 2].map(i => starSvg(i < live, 26)).join("");
    $("undo").disabled = !L.history.length || !!playback || L.won;
    $("restart").disabled = !!playback;
    $("watch").disabled = !!playback;
  }

  /* ---------- hareket ---------- */
  function inside(x, y){ return x >= 0 && y >= 0 && x < L.cols && y < L.rows; }
  function isWall(x, y){ return !inside(x, y) || L.walls.has(y*L.cols + x); }

  function tryMove(dir, fromPlayback){
    if (!L || L.won) return false;
    if (playback && !fromPlayback) return false;
    if (anim){ queued = dir; return false; }
    audio();
    const [dx, dy] = DIRS[dir], x = L.player % L.cols, y = (L.player/L.cols) | 0;
    const nx = x + dx, ny = y + dy;
    L.facing = dir;
    if (isWall(nx, ny)){ bump(); return false; }
    const n = ny*L.cols + nx;
    let pushed = null;
    if (L.boxes.has(n)){
      const mx = nx + dx, my = ny + dy, mi = my*L.cols + mx;
      if (isWall(mx, my) || L.boxes.has(mi)){ bump(); return false; }
      L.boxes.delete(n); L.boxes.add(mi); pushed = [n, mi];
    }
    L.history.push({player:L.player, pushed});
    anim = {t:0, dur:RM ? .001 : (fromPlayback ? .13 : .09), from:L.player, pushed};
    L.player = n; L.moves++;
    if (pushed) sfx.push(L.goals.has(pushed[1])); else sfx.step();
    renderHud(); checkState();
    return true;
  }

  function bump(){ bumpT = .18; sfx.bump(); }

  function undo(){
    if (!L || playback || L.won || !L.history.length) return;
    anim = null; queued = null;
    const h = L.history.pop();
    if (h.pushed){ L.boxes.delete(h.pushed[1]); L.boxes.add(h.pushed[0]); }
    L.player = h.player; L.moves--;
    sfx.undo(); renderHud(); checkState();
  }

  function checkState(){
    L.dead = new Set();
    for (const b of L.boxes){
      if (L.goals.has(b)) continue;
      const x = b % L.cols, y = (b/L.cols) | 0;
      if ((isWall(x - 1, y) || isWall(x + 1, y)) && (isWall(x, y - 1) || isWall(x, y + 1))) L.dead.add(b);
    }
    if (![...L.boxes].some(b => !L.goals.has(b))){ win(); return; }
    if (playback) return;
    if (L.dead.size) setStatus("Bir kutu köşeye sıkıştı, oradan çıkamaz. Geri al ile düzelt.", "warn");
    else if ($("status").classList.contains("warn")) setStatus("");
  }

  function win(){
    L.won = true; playback = null;
    const i = L.idx, par = LEVELS[i].par;
    const stars = L.watched ? 0 : starsFor(L.moves, par);
    let isBest = false;
    if (!L.watched){
      isBest = !save.best[i] || L.moves < save.best[i];
      if (isBest) save.best[i] = L.moves;
      save.stars[i] = Math.max(save.stars[i] || 0, stars);
    } else save.watched[i] = true;
    save.unlocked = Math.max(save.unlocked, Math.min(LEVELS.length - 1, i + 1));
    persist();
    sfx.win(); renderHud();
    setStatus(L.watched ? "Çözüm bitti." : "Bölüm tamam!", "good");
    setTimeout(() => showWin(stars, isBest), RM ? 0 : 450);
  }

  function showWin(stars, isBest){
    if (!L || !L.won) return;
    const i = L.idx, par = LEVELS[i].par, last = i === LEVELS.length - 1;
    $("win-title").textContent = last && !L.watched ? "Tüm bölümler bitti! Gerçek bir Kutu Ustasısın." : `Bölüm ${i + 1} tamam!`;
    $("win-stars").innerHTML = [0, 1, 2].map(k => starSvg(k < stars, 54)).join("");
    let sub;
    if (L.watched) sub = "Çözümü izledin. Yıldız kazanmak için kendin çöz, sonraki bölüm açıldı.";
    else if (stars === 3) sub = `${L.moves} hamle. Hedef ${par} idi, mükemmel!` + (isBest ? " Yeni rekor." : "");
    else sub = `${L.moves} hamle. 3 yıldız için ${par} hamle ya da daha azı gerekiyor.` + (isBest ? " Yeni rekor." : "");
    $("win-sub").textContent = sub;
    $("next").hidden = last;
    $("win").hidden = false;
    (last ? $("replay") : $("next")).focus({preventScroll:true});
  }

  function watchSolution(){
    if (!L) return;
    restart();
    L.watched = true;
    playback = {sol:LEVELS[L.idx].sol.toLowerCase(), k:0, wait:.35};
    renderHud();
    setStatus("Çözüm oynatılıyor. İzlenen bölümden yıldız alınmaz.", "good");
  }

  /* ---------- çizim ---------- */
  function layout(){
    if (!L) return;
    const W = wrap.clientWidth, H = wrap.clientHeight;
    if (!W || !H) return;
    tile = Math.max(18, Math.floor(Math.min(W/L.cols, H/L.rows, 88)));
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    const cw = tile*L.cols, ch = tile*L.rows;
    cv.style.width = cw + "px"; cv.style.height = ch + "px";
    cv.width = Math.round(cw*dpr); cv.height = Math.round(ch*dpr);
  }

  function rr(x, y, w, h, r){
    ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
  }
  const ease = t => 1 - Math.pow(1 - t, 3);
  function cellXY(i){ return [i % L.cols, (i/L.cols) | 0]; }

  function drawBox(px, py, state){
    const T = tile, inset = T*.12, s = T - inset*2;
    const fill = state === "good" ? C.good : state === "dead" ? C.alert : C.crate;
    const dark = state === "good" ? C.goodDark : state === "dead" ? C.alertDark : C.crateDark;
    ctx.save();
    if (state === "good" && !RM){ ctx.shadowColor = C.good; ctx.shadowBlur = T*.35; }
    rr(px + inset, py + inset, s, s, T*.1); ctx.fillStyle = fill; ctx.fill();
    ctx.restore();
    ctx.lineWidth = Math.max(1.5, T*.05); ctx.strokeStyle = dark;
    rr(px + inset, py + inset, s, s, T*.1); ctx.stroke();
    ctx.fillStyle = "rgba(255,255,255,.2)"; ctx.fillRect(px + inset + T*.06, py + inset + T*.05, s - T*.12, s*.14);
    ctx.globalAlpha = .55; ctx.beginPath();
    const a = T*.24, b = T - T*.24;
    ctx.moveTo(px + a, py + a); ctx.lineTo(px + b, py + b); ctx.moveTo(px + b, py + a); ctx.lineTo(px + a, py + b);
    ctx.stroke(); ctx.globalAlpha = 1;
  }

  function drawRobot(px, py){
    const T = tile, [fx, fy] = DIRS[L.facing];
    const shake = bumpT > 0 ? Math.sin(bumpT*80)*T*.04 : 0;
    const cx = px + T/2 + fx*shake, cy = py + T/2 + fy*shake;
    ctx.fillStyle = "rgba(0,0,0,.3)"; ctx.beginPath(); ctx.ellipse(cx, cy + T*.32, T*.3, T*.08, 0, 0, Math.PI*2); ctx.fill();
    ctx.strokeStyle = C.robot; ctx.lineWidth = Math.max(1.5, T*.04);
    ctx.beginPath(); ctx.moveTo(cx, cy - T*.3); ctx.lineTo(cx, cy - T*.42); ctx.stroke();
    ctx.fillStyle = C.eye; ctx.beginPath(); ctx.arc(cx, cy - T*.44, T*.05, 0, Math.PI*2); ctx.fill();
    ctx.fillStyle = C.robot; ctx.beginPath(); ctx.arc(cx, cy, T*.33, 0, Math.PI*2); ctx.fill();
    ctx.fillStyle = "rgba(0,0,0,.08)"; ctx.beginPath(); ctx.arc(cx + T*.08, cy + T*.08, T*.25, 0, Math.PI*2); ctx.fill();
    rr(cx - T*.22 + fx*T*.04, cy - T*.13 + fy*T*.05, T*.44, T*.2, T*.1); ctx.fillStyle = C.visor; ctx.fill();
    ctx.fillStyle = C.eye;
    for (const s of [-1, 1]){ ctx.beginPath(); ctx.arc(cx + s*T*.1 + fx*T*.06, cy - T*.03 + fy*T*.05, T*.045, 0, Math.PI*2); ctx.fill(); }
  }

  function draw(){
    if (!L) return;
    const T = tile;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, T*L.cols, T*L.rows);
    for (const i of L.floor){
      const [x, y] = cellXY(i);
      ctx.fillStyle = (x + y) % 2 ? C.floorA : C.floorB;
      ctx.fillRect(x*T, y*T, T, T);
    }
    for (const w of L.shownWalls){
      const [x, y] = cellXY(w);
      ctx.fillStyle = C.wall; ctx.fillRect(x*T, y*T, T, T);
      ctx.fillStyle = C.wallTop; ctx.fillRect(x*T, y*T, T, T*.2);
      ctx.fillStyle = C.wallShade; ctx.fillRect(x*T, y*T + T*.84, T, T*.16);
    }
    const pulse = RM ? 0 : Math.sin(time*3)*T*.02;
    for (const g of L.goals){
      const [x, y] = cellXY(g), cx = x*T + T/2, cy = y*T + T/2;
      ctx.fillStyle = "rgba(91,214,138,.12)"; ctx.beginPath(); ctx.arc(cx, cy, T*.3 + pulse, 0, Math.PI*2); ctx.fill();
      ctx.strokeStyle = C.pad; ctx.lineWidth = Math.max(1.5, T*.06); ctx.beginPath(); ctx.arc(cx, cy, T*.26 + pulse, 0, Math.PI*2); ctx.stroke();
    }
    const e = anim ? ease(clamp(anim.t/anim.dur, 0, 1)) : 1;
    for (const b of L.boxes){
      let [x, y] = cellXY(b);
      let moving = false;
      if (anim && anim.pushed && anim.pushed[1] === b){
        const [ox, oy] = cellXY(anim.pushed[0]);
        x = ox + (x - ox)*e; y = oy + (y - oy)*e; moving = e < 1;
      }
      const state = L.goals.has(b) && !moving ? "good" : L.dead.has(b) && !moving ? "dead" : "crate";
      drawBox(x*T, y*T, state);
    }
    let [px, py] = cellXY(L.player);
    if (anim){ const [ox, oy] = cellXY(anim.from); px = ox + (px - ox)*e; py = oy + (py - oy)*e; }
    drawRobot(px*T, py*T);
  }

  let last = performance.now();
  function frame(now){
    const dt = Math.min(.05, (now - last)/1000); last = now;
    time += dt;
    bumpT = Math.max(0, bumpT - dt);
    if (anim){
      anim.t += dt;
      if (anim.t >= anim.dur){
        anim = null;
        if (queued){ const q = queued; queued = null; tryMove(q); }
      }
    }
    if (playback && !anim && L && !L.won){
      playback.wait -= dt;
      if (playback.wait <= 0){
        if (playback.k < playback.sol.length) tryMove(playback.sol[playback.k++], true);
        else { playback = null; renderHud(); }
      }
    }
    draw();
    requestAnimationFrame(frame);
  }

  /* ---------- bölüm seçimi ---------- */
  function openLevels(){
    const grid = $("level-grid");
    grid.innerHTML = "";
    let total = 0;
    LEVELS.forEach((lv, i) => {
      const st = save.stars[i] || 0; total += st;
      const b = document.createElement("button");
      b.type = "button";
      b.className = "level" + (st || save.watched[i] ? " done" : "") + (L && L.idx === i ? " current" : "");
      b.disabled = i > save.unlocked;
      b.setAttribute("aria-label", `Bölüm ${i + 1}` + (b.disabled ? ", kilitli" : `, ${st} yıldız`));
      b.innerHTML = `<b>${i + 1}</b><span class="mini">${[0, 1, 2].map(k => `<span class="${k < st ? "on" : ""}">★</span>`).join("")}</span>`;
      b.addEventListener("click", () => { $("levels").hidden = true; load(i); });
      grid.appendChild(b);
    });
    $("total-stars").textContent = `Toplam yıldız: ${total} / ${LEVELS.length*3} · Bir bölümü bitirince sonraki açılır.`;
    $("win").hidden = true;
    $("levels").hidden = false;
    const cur = grid.querySelector(".current") || grid.querySelector(".level:not(:disabled)");
    if (cur) cur.focus({preventScroll:true});
  }

  /* ---------- kontroller ---------- */
  const KEYMAP = {arrowup:"u", w:"u", arrowdown:"d", s:"d", arrowleft:"l", a:"l", arrowright:"r", d:"r"};
  window.addEventListener("keydown", e => {
    const k = e.key.toLowerCase();
    if (!$("levels").hidden){ if (k === "escape") $("levels").hidden = true; return; }
    if (!$("win").hidden){
      if (k === "enter" || k === " "){ e.preventDefault(); if (!$("next").hidden) load(L.idx + 1); else restart(); }
      else if (k === "escape") $("win").hidden = true;
      return;
    }
    if (KEYMAP[k]){ e.preventDefault(); tryMove(KEYMAP[k]); }
    else if (k === "z" || k === "backspace"){ e.preventDefault(); undo(); }
    else if (k === "r" && !e.ctrlKey && !e.metaKey){ restart(); }
  });

  // kaydırma
  let swipe = null;
  wrap.addEventListener("pointerdown", e => {
    if (e.pointerType === "mouse") return;
    swipe = {id:e.pointerId, x:e.clientX, y:e.clientY};
    try { wrap.setPointerCapture(e.pointerId); } catch(_) {}
  });
  wrap.addEventListener("pointermove", e => {
    if (!swipe || e.pointerId !== swipe.id) return;
    const dx = e.clientX - swipe.x, dy = e.clientY - swipe.y, th = Math.max(24, tile*.6);
    if (Math.abs(dx) < th && Math.abs(dy) < th) return;
    tryMove(Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? "r" : "l") : (dy > 0 ? "d" : "u"));
    swipe.x = e.clientX; swipe.y = e.clientY;
  });
  ["pointerup", "pointercancel"].forEach(ev => wrap.addEventListener(ev, () => { swipe = null; }));

  // yön tuşları, basılı tutunca tekrarlar
  document.querySelectorAll("#dpad button").forEach(b => {
    let timer = null;
    const stop = () => { clearInterval(timer); timer = null; };
    b.addEventListener("pointerdown", e => {
      e.preventDefault(); stop();
      tryMove(b.dataset.dir);
      timer = setInterval(() => tryMove(b.dataset.dir), 180);
      try { b.setPointerCapture(e.pointerId); } catch(_) {}
    });
    ["pointerup", "pointercancel", "lostpointercapture"].forEach(ev => b.addEventListener(ev, stop));
    b.addEventListener("click", e => { if (e.detail === 0) tryMove(b.dataset.dir); });
  });

  $("undo").addEventListener("click", undo);
  $("restart").addEventListener("click", restart);
  $("watch").addEventListener("click", watchSolution);
  $("open-levels").addEventListener("click", openLevels);
  $("close-levels").addEventListener("click", () => { $("levels").hidden = true; });
  $("win-levels").addEventListener("click", openLevels);
  $("next").addEventListener("click", () => load(L.idx + 1));
  $("replay").addEventListener("click", restart);
  $("levels").addEventListener("click", e => { if (e.target === $("levels")) $("levels").hidden = true; });

  if ("ResizeObserver" in window) new ResizeObserver(layout).observe(wrap);
  else window.addEventListener("resize", layout);

  if (LEVELS.length){
    load(Math.min(save.last || 0, save.unlocked || 0));
    requestAnimationFrame(frame);
  } else {
    setStatus("Bölümler yüklenemedi. levels.js dosyası eksik olabilir.", "warn");
  }
})();
