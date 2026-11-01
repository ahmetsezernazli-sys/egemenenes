/* Tank Düellosu — iki kişilik tank savaşı, duvardan seken mermiler */
(() => {
  "use strict";
  const $ = (id) => document.getElementById(id);
  const cv = $("cv"), ctx = cv.getContext("2d"), stage = $("stage");
  const SAVE_KEY = "tank-duellosu";
  const GW = 24, GH = 15, TS = 40, AW = GW * TS, AH = GH * TS;
  const R = 17, SPEED = 150, TURN = 9, BSPEED = 330, BOUNCES = 2, RELOAD = 0.4, MAXB = 3, ROUND_T = 120;
  const DIRS = { u: [0, -1], d: [0, 1], l: [-1, 0], r: [1, 0] };
  const POWERS = { shield: { ic: "🛡", c: "#7FD4FF" }, triple: { ic: "✳", c: "#FFB547" }, speed: { ic: "⚡", c: "#FFE14D" }, heal: { ic: "❤", c: "#FF6B7A" } };

  // engeller: sol yarıda [x, y, w, h]; merkeze göre simetriği otomatik eklenir
  const MAPS = [
    [[4, 3, 1, 3], [4, 3, 3, 1], [9, 6, 1, 3], [11, 1, 2, 2], [6, 10, 1, 2]],
    [[3, 0, 1, 5], [3, 10, 1, 2], [7, 4, 1, 7], [7, 4, 3, 1], [11, 7, 2, 1], [10, 11, 3, 1]],
    [[5, 5, 2, 2], [10, 2, 1, 2], [10, 11, 1, 2], [8, 8, 1, 1], [3, 11, 2, 1]],
    [[5, 2, 1, 4], [5, 9, 1, 4], [9, 4, 2, 1], [9, 10, 2, 1], [11, 6, 1, 3]]
  ];

  /* ---------- ses ---------- */
  let AC = null, headless = false;
  function audio() { try { AC = AC || new (window.AudioContext || window.webkitAudioContext)(); if (AC.state === "suspended") AC.resume(); } catch (e) {} }
  function tone(f, d = 0.1, type = "triangle", vol = 0.06, slide = 0) {
    if (!AC || headless) return;
    const t = AC.currentTime, o = AC.createOscillator(), g = AC.createGain();
    o.type = type; o.frequency.setValueAtTime(f, t); if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(30, f + slide), t + d);
    g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + d);
    o.connect(g).connect(AC.destination); o.start(t); o.stop(t + d + 0.02);
  }
  function boomSnd(len, vol) {
    if (!AC || headless) return;
    const n = AC.sampleRate * len, buf = AC.createBuffer(1, n, AC.sampleRate), ch = buf.getChannelData(0);
    for (let i = 0; i < n; i++) ch[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / n, 2);
    const s = AC.createBufferSource(), f = AC.createBiquadFilter(), g = AC.createGain();
    f.type = "lowpass"; f.frequency.value = 700; g.gain.value = vol;
    s.buffer = buf; s.connect(f).connect(g).connect(AC.destination); s.start();
  }
  const SND = {
    fire: () => { tone(220, 0.12, "square", 0.05, -120); boomSnd(0.08, 0.15); },
    bounce: () => tone(900, 0.04, "sine", 0.04),
    hit: () => { boomSnd(0.35, 0.4); tone(160, 0.3, "sawtooth", 0.05, -100); },
    shieldHit: () => tone(1200, 0.12, "triangle", 0.05, -400),
    item: () => [660, 880, 1100].forEach((f, i) => setTimeout(() => tone(f, 0.08, "square", 0.04), i * 60)),
    beep: (hi) => tone(hi ? 880 : 520, 0.15, "square", 0.05),
    win: () => [523, 659, 784, 1046].forEach((f, i) => setTimeout(() => tone(f, 0.2), i * 130)),
  };

  /* ---------- durum ---------- */
  let CFG = { mode: "2p", ai: 0, win: 3, names: ["Enes", "Egemen"], help: [false, true] };
  try { const s = JSON.parse(localStorage.getItem(SAVE_KEY) || "null"); if (s && s.cfg) CFG = Object.assign(CFG, s.cfg); } catch (e) {}
  const store = () => { try { localStorage.setItem(SAVE_KEY, JSON.stringify({ cfg: CFG })); } catch (e) {} };
  let G = null, M = null, paused = false, mapIdx = -1;
  const keys = [{}, {}];

  function buildGrid(blocks) {
    const g = Array.from({ length: GH }, () => new Uint8Array(GW));
    for (const [x, y, w, h] of blocks) {
      for (const [bx, by] of [[x, y], [GW - x - w, GH - y - h]])
        for (let yy = by; yy < by + h; yy++) for (let xx = bx; xx < bx + w; xx++) if (yy >= 0 && yy < GH && xx >= 0 && xx < GW) g[yy][xx] = 1;
    }
    return g;
  }
  function newMatch() { M = { pts: [0, 0], round: 0 }; newRound(); }
  function newRound() {
    M.round++;
    let m; do { m = Math.floor(Math.random() * MAPS.length); } while (m === mapIdx && MAPS.length > 1);
    mapIdx = m;
    const grid = buildGrid(MAPS[m]);
    const starts = [[1.5 * TS, 7.5 * TS, 0], [AW - 1.5 * TS, 7.5 * TS, Math.PI]];
    G = { grid, bullets: [], fx: [], items: [], itemT: 6, t: 0, over: false, msg: "", msgT: 0, count: 3,
      pl: starts.map(([x, y, a], i) => {
        const hp = CFG.help[i] ? 5 : 3;
        return { i, x, y, a, hp, maxHp: hp, reload: 0, held: false, inv: 0, shield: 0, triple: 0, speed: 0, help: CFG.help[i], tread: 0,
          ai: CFG.mode === "ai" && i === 1 ? { lvl: CFG.ai, think: 0, move: [0, 0], fire: false, path: [] } : null };
      }) };
    G.msg = "3"; G.msgT = 1;
    keys.forEach(k => { for (const n in k) k[n] = 0; });
    renderHud();
    if (!headless) SND.beep(false);
  }

  /* ---------- çarpışma ---------- */
  const wallAt = (cx, cy) => cx < 0 || cy < 0 || cx >= GW || cy >= GH || G.grid[cy][cx] === 1;
  function circleHitsWall(x, y, r) {
    const x0 = Math.floor((x - r) / TS), x1 = Math.floor((x + r) / TS), y0 = Math.floor((y - r) / TS), y1 = Math.floor((y + r) / TS);
    for (let cy = y0; cy <= y1; cy++) for (let cx = x0; cx <= x1; cx++) {
      if (!wallAt(cx, cy)) continue;
      const nx = Math.max(cx * TS, Math.min(x, cx * TS + TS)), ny = Math.max(cy * TS, Math.min(y, cy * TS + TS));
      if ((nx - x) ** 2 + (ny - y) ** 2 < r * r) return true;
    }
    return false;
  }
  const pointWall = (x, y) => wallAt(Math.floor(x / TS), Math.floor(y / TS));
  // iki nokta arası duvarsız mı (görüş)
  function clearLine(x0, y0, x1, y1) {
    const d = Math.hypot(x1 - x0, y1 - y0), n = Math.ceil(d / 10);
    for (let i = 1; i < n; i++) { const t = i / n; if (pointWall(x0 + (x1 - x0) * t, y0 + (y1 - y0) * t)) return false; }
    return true;
  }
  const angDiff = (a, b) => { let d = b - a; while (d > Math.PI) d -= 2 * Math.PI; while (d < -Math.PI) d += 2 * Math.PI; return d; };

  /* ---------- güncelle ---------- */
  function inputOf(p) {
    if (p.ai) return { mx: p.ai.move[0], my: p.ai.move[1], fire: p.ai.fire };
    const k = keys[p.i];
    let mx = (k.r ? 1 : 0) - (k.l ? 1 : 0), my = (k.d ? 1 : 0) - (k.u ? 1 : 0);
    return { mx, my, fire: !!k.f };
  }
  function fire(p) {
    const n = p.triple > 0 ? 3 : 1;
    if (G.bullets.filter(b => b.owner === p.i).length >= MAXB + (n - 1)) return;
    for (let k = 0; k < n; k++) {
      const a = p.a + (k - (n - 1) / 2) * 0.22;
      const bx = p.x + Math.cos(a) * (R + 8), by = p.y + Math.sin(a) * (R + 8);
      if (pointWall(bx, by)) continue;
      G.bullets.push({ x: bx, y: by, vx: Math.cos(a) * BSPEED, vy: Math.sin(a) * BSPEED, owner: p.i, bounces: 0, life: 3.2 });
    }
    p.reload = RELOAD; p.recoil = 1;
    SND.fire();
  }
  function hurt(p, b) {
    if (p.inv > 0) return;
    if (p.shield > 0) { p.shield = 0; p.inv = 0.4; SND.shieldHit(); fxBurst(p.x, p.y, "#7FD4FF", 10); return; }
    p.hp--; p.inv = 1; SND.hit(); fxBurst(p.x, p.y, "#FFB547", 18);
    p.x += b.vx * 0.04; p.y += b.vy * 0.04;
    if (circleHitsWall(p.x, p.y, R)) { p.x -= b.vx * 0.04; p.y -= b.vy * 0.04; }
    renderHud();
    if (p.hp <= 0) { fxBurst(p.x, p.y, "#FF6B3D", 40); endRound(1 - p.i); }
  }
  function fxBurst(x, y, c, n) {
    if (headless) return;
    for (let i = 0; i < n; i++) { const a = Math.random() * 6.28, s = 60 + Math.random() * 200; G.fx.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, t: 0, life: 0.4 + Math.random() * 0.4, c }); }
  }
  function update(dt) {
    if (!G || G.over) { if (G) stepFx(dt); return; }
    if (G.msgT > 0) G.msgT -= dt;
    if (G.count > 0) {
      if (G.msgT <= 0) { G.count--; if (G.count > 0) { G.msg = String(G.count); G.msgT = 1; SND.beep(false); } else { G.msg = "Ateş!"; G.msgT = 0.7; SND.beep(true); } }
      return;
    }
    G.t += dt;
    for (const p of G.pl) {
      if (p.ai) think(p, dt);
      const inp = inputOf(p);
      p.reload = Math.max(0, p.reload - dt); p.inv = Math.max(0, p.inv - dt);
      p.shield = Math.max(0, p.shield - dt); p.triple = Math.max(0, p.triple - dt); p.speed = Math.max(0, p.speed - dt);
      p.recoil = Math.max(0, (p.recoil || 0) - dt * 5);
      let { mx, my } = inp;
      if (mx || my) {
        const ta = Math.atan2(my, mx), d = angDiff(p.a, ta);
        p.a += Math.sign(d) * Math.min(Math.abs(d), TURN * dt);
        const len = Math.hypot(mx, my), sp = SPEED * (p.speed > 0 ? 1.45 : 1) * (Math.abs(d) > 1.2 ? 0.35 : 1);
        const vx = mx / len * sp * dt, vy = my / len * sp * dt;
        if (!circleHitsWall(p.x + vx, p.y, R)) p.x += vx;
        if (!circleHitsWall(p.x, p.y + vy, R)) p.y += vy;
        p.tread += sp * dt;
      }
      if (inp.fire && !p.held && p.reload <= 0) fire(p);
      p.held = inp.fire && !p.ai;
      if (p.ai && inp.fire) p.ai.fire = false;
    }
    // tanklar birbirini iter
    const [a, b] = G.pl, dx = b.x - a.x, dy = b.y - a.y, d = Math.hypot(dx, dy);
    if (d < R * 2 && d > 0) {
      const push = (R * 2 - d) / 2, ux = dx / d, uy = dy / d;
      if (!circleHitsWall(a.x - ux * push, a.y - uy * push, R)) { a.x -= ux * push; a.y -= uy * push; }
      if (!circleHitsWall(b.x + ux * push, b.y + uy * push, R)) { b.x += ux * push; b.y += uy * push; }
    }
    // mermiler
    for (let i = G.bullets.length - 1; i >= 0; i--) {
      const bl = G.bullets[i];
      bl.life -= dt;
      const shooter = G.pl[bl.owner], foe = G.pl[1 - bl.owner];
      // yardım: mermi rakibe doğru hafifçe kıvrılır
      if (shooter.help) {
        const want = Math.atan2(foe.y - bl.y, foe.x - bl.x), cur = Math.atan2(bl.vy, bl.vx), df = angDiff(cur, want);
        if (Math.abs(df) < 0.9 && Math.hypot(foe.x - bl.x, foe.y - bl.y) < 320) {
          const na = cur + Math.sign(df) * Math.min(Math.abs(df), 1.6 * dt);
          bl.vx = Math.cos(na) * BSPEED; bl.vy = Math.sin(na) * BSPEED;
        }
      }
      const steps = 3;
      let dead = bl.life <= 0;
      for (let s = 0; s < steps && !dead; s++) {
        const sx = bl.vx * dt / steps, sy = bl.vy * dt / steps;
        bl.x += sx;
        if (pointWall(bl.x, bl.y)) { bl.x -= sx; bl.vx = -bl.vx; bl.bounces++; if (bl.bounces > BOUNCES) dead = true; else SND.bounce(); }
        bl.y += sy;
        if (!dead && pointWall(bl.x, bl.y)) { bl.y -= sy; bl.vy = -bl.vy; bl.bounces++; if (bl.bounces > BOUNCES) dead = true; else SND.bounce(); }
        if (dead) break;
        // isabet: rakip her zaman, kendi tankı yalnızca sektikten sonra değil (kendine zarar yok)
        if (Math.hypot(foe.x - bl.x, foe.y - bl.y) < R + 3) { hurt(foe, bl); dead = true; }
      }
      if (dead) { fxBurst(bl.x, bl.y, "#FFE6A8", 5); G.bullets.splice(i, 1); }
      if (G.over) return;
    }
    // güçlendiriciler
    G.itemT -= dt;
    if (G.itemT <= 0 && G.items.length < 2) {
      G.itemT = 7 + Math.random() * 4;
      for (let tries = 0; tries < 50; tries++) {
        const cx = 2 + Math.floor(Math.random() * (GW - 4)), cy = 1 + Math.floor(Math.random() * (GH - 2));
        if (G.grid[cy][cx]) continue;
        const x = (cx + 0.5) * TS, y = (cy + 0.5) * TS;
        if (G.pl.some(p => Math.hypot(p.x - x, p.y - y) < 120)) continue;
        const ks = Object.keys(POWERS);
        G.items.push({ k: ks[Math.floor(Math.random() * ks.length)], x, y, t: 0 });
        break;
      }
    }
    for (let i = G.items.length - 1; i >= 0; i--) {
      const it = G.items[i]; it.t += dt;
      const p = G.pl.find(p => Math.hypot(p.x - it.x, p.y - it.y) < R + 14);
      if (!p) continue;
      G.items.splice(i, 1); SND.item();
      if (it.k === "shield") p.shield = 10;
      else if (it.k === "triple") p.triple = 8;
      else if (it.k === "speed") p.speed = 8;
      else { p.hp = Math.min(p.maxHp, p.hp + 1); renderHud(); }
      G.fx.push({ txt: POWERS[it.k].ic, x: it.x, y: it.y, t: 0, life: 0.8 });
    }
    if (G.t > ROUND_T) { const [h0, h1] = [G.pl[0].hp / G.pl[0].maxHp, G.pl[1].hp / G.pl[1].maxHp]; endRound(h0 === h1 ? -1 : h0 > h1 ? 0 : 1); }
    stepFx(dt);
  }
  function stepFx(dt) {
    for (let i = G.fx.length - 1; i >= 0; i--) {
      const f = G.fx[i]; f.t += dt;
      if (!f.txt) { f.x += f.vx * dt; f.y += f.vy * dt; f.vx *= 0.92; f.vy *= 0.92; }
      if (f.t > f.life) G.fx.splice(i, 1);
    }
  }
  function endRound(w) {
    G.over = true;
    if (w >= 0) M.pts[w]++;
    renderHud();
    const matchOver = w >= 0 && M.pts[w] >= CFG.win;
    if (headless) return;
    SND.win();
    setTimeout(() => {
      $("end-icon").textContent = w < 0 ? "🤝" : matchOver ? "🏆" : "💥";
      $("end-title").textContent = w < 0 ? "Berabere!" : matchOver ? `${CFG.names[w]} düelloyu kazandı!` : `${CFG.names[w]} raundu aldı!`;
      $("end-text").textContent = `Skor: ${CFG.names[0]} ${M.pts[0]} – ${M.pts[1]} ${CFG.names[1]}` + (G.t > ROUND_T ? " (süre doldu)" : "");
      $("end-next").textContent = matchOver ? "Yeni düello" : "Sonraki raund";
      $("end-next").dataset.new = matchOver ? "1" : "";
      $("end").hidden = false; $("end-next").focus();
    }, 1000);
  }

  /* ---------- bilgisayar ---------- */
  function bfsPath(p, tx, ty) {
    const sx = Math.floor(p.x / TS), sy = Math.floor(p.y / TS), gx = Math.floor(tx / TS), gy = Math.floor(ty / TS);
    const prev = new Int16Array(GW * GH).fill(-1), q = [sx + sy * GW]; prev[q[0]] = q[0];
    for (let i = 0; i < q.length; i++) {
      const c = q[i], cx = c % GW, cy = (c / GW) | 0;
      if (cx === gx && cy === gy) break;
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const nx = cx + dx, ny = cy + dy, n = nx + ny * GW;
        if (wallAt(nx, ny) || prev[n] !== -1) continue;
        prev[n] = c; q.push(n);
      }
    }
    const goal = gx + gy * GW; if (prev[goal] === -1) return [];
    const path = []; for (let c = goal; c !== sx + sy * GW; c = prev[c]) path.unshift(c);
    return path;
  }
  // yansıyan bir atışla vurulabilir mi (tek sekme denemesi)
  function shotHits(p, a, foe) {
    let x = p.x + Math.cos(a) * (R + 8), y = p.y + Math.sin(a) * (R + 8), vx = Math.cos(a) * 12, vy = Math.sin(a) * 12, b = 0;
    for (let i = 0; i < 90; i++) {
      x += vx; if (pointWall(x, y)) { x -= vx; vx = -vx; b++; }
      y += vy; if (pointWall(x, y)) { y -= vy; vy = -vy; b++; }
      if (b > 1) return false;
      if (Math.hypot(foe.x - x, foe.y - y) < R) return true;
      if (b > 0 && Math.hypot(p.x - x, p.y - y) < R) return false;
    }
    return false;
  }
  function think(p, dt) {
    const ai = p.ai, foe = G.pl[1 - p.i], hard = ai.lvl === 1;
    ai.think -= dt;
    // gelen mermiden kaç (zor)
    if (hard) {
      for (const bl of G.bullets) {
        if (bl.owner === p.i) continue;
        const rx = p.x - bl.x, ry = p.y - bl.y, sp = Math.hypot(bl.vx, bl.vy), along = (rx * bl.vx + ry * bl.vy) / sp;
        if (along < 0 || along > 180) continue;
        const perp = (rx * bl.vy - ry * bl.vx) / sp;
        if (Math.abs(perp) < R + 10) {
          const s = perp >= 0 ? 1 : -1; ai.move = [bl.vy / sp * s, -bl.vx / sp * s];
          ai.dodge = 0.25; break;
        }
      }
    }
    if (ai.dodge > 0) { ai.dodge -= dt; return; }
    if (ai.think > 0) return;
    ai.think = hard ? 0.12 : 0.3;
    const dist = Math.hypot(foe.x - p.x, foe.y - p.y), los = clearLine(p.x, p.y, foe.x, foe.y);
    const aimA = Math.atan2(foe.y - p.y, foe.x - p.x);
    // ateş: namlu rakibe dönükse ya da sekerek vuracaksa
    const err = hard ? 0.12 : 0.3;
    if (p.reload <= 0 && ((los && Math.abs(angDiff(p.a, aimA)) < err) || (hard && shotHits(p, p.a, foe))) && Math.random() < (hard ? 0.9 : 0.45)) ai.fire = true;
    // hedef: yakın güçlendirici ya da rakip
    let tx = foe.x, ty = foe.y;
    const it = G.items.find(it => Math.hypot(it.x - p.x, it.y - p.y) < (hard ? 260 : 160));
    if (it) { tx = it.x; ty = it.y; }
    if (!it && los && dist < (hard ? 330 : 260)) {
      // görüşte: namluyu çevirmek için rakibe doğru hafifçe, yan yana kayarak yaklaş
      const side = (Math.floor(G.t / 2) % 2 ? 1 : -1);
      const ax = Math.cos(aimA), ay = Math.sin(aimA);
      const back = dist < 130 ? -0.8 : 0.35;
      ai.move = [ax * back - ay * side * 0.6, ay * back + ax * side * 0.6];
      if (Math.abs(angDiff(p.a, aimA)) > 0.25) ai.move = [ax, ay];
      if (circleHitsWall(p.x + ai.move[0] * 8, p.y + ai.move[1] * 8, R)) ai.move = [ax, ay];
      return;
    }
    const path = bfsPath(p, tx, ty);
    if (path.length) {
      const c = path[Math.min(1, path.length - 1)], cx = (c % GW + 0.5) * TS, cy = (((c / GW) | 0) + 0.5) * TS;
      const vx = cx - p.x, vy = cy - p.y, l = Math.hypot(vx, vy) || 1;
      ai.move = [vx / l, vy / l];
    } else ai.move = [Math.cos(aimA), Math.sin(aimA)];
  }

  /* ---------- çizim ---------- */
  let W = 0, H = 0, dpr = 1, sc = 1, ox = 0, oy = 0;
  function resize() {
    const r = stage.getBoundingClientRect(); dpr = Math.min(2, window.devicePixelRatio || 1);
    W = r.width; H = r.height; cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr);
    sc = Math.min(W / AW, H / AH); ox = (W - AW * sc) / 2; oy = (H - AH * sc) / 2;
  }
  const COLORS = [{ c: "#3D8BFD", d: "#1F57B0", l: "#92BEFF" }, { c: "#E5484D", d: "#A3262B", l: "#FF9EA1" }];
  function drawTank(p, t) {
    if (p.hp <= 0) return;
    if (p.inv > 0 && Math.floor(t * 12) % 2) return;
    const C = COLORS[p.i];
    ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.a);
    ctx.fillStyle = "rgba(0,0,0,.3)"; ctx.beginPath(); ctx.ellipse(3, 4, 22, 19, 0, 0, 7); ctx.fill();
    // paletler
    ctx.fillStyle = "#26251C";
    ctx.beginPath(); ctx.roundRect(-20, -20, 40, 10, 4); ctx.roundRect(-20, 10, 40, 10, 4); ctx.fill();
    ctx.fillStyle = "#4A4836";
    for (let k = 0; k < 6; k++) { const xx = -18 + ((k * 7 + p.tread * 0.6) % 42); if (xx < 17) { ctx.fillRect(xx, -19, 3, 8); ctx.fillRect(xx, 11, 3, 8); } }
    // gövde
    ctx.fillStyle = C.c; ctx.beginPath(); ctx.roundRect(-16, -12, 32, 24, 6); ctx.fill();
    ctx.fillStyle = C.d; ctx.fillRect(-16, 6, 32, 6);
    // kule ve namlu
    const rc = (p.recoil || 0) * 5;
    ctx.fillStyle = C.l; ctx.beginPath(); ctx.roundRect(4 - rc, -3.5, 22, 7, 2); ctx.fill();
    ctx.fillStyle = C.d; ctx.fillRect(22 - rc, -4.5, 5, 9);
    ctx.fillStyle = C.l; ctx.beginPath(); ctx.arc(-1, 0, 10, 0, 7); ctx.fill();
    ctx.fillStyle = C.c; ctx.beginPath(); ctx.arc(-1, 0, 5, 0, 7); ctx.fill();
    ctx.restore();
    if (p.shield > 0) {
      ctx.strokeStyle = `rgba(127,212,255,${0.5 + 0.3 * Math.sin(t * 8)})`; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.arc(p.x, p.y, R + 9, 0, 7); ctx.stroke();
    }
    if (p.triple > 0 || p.speed > 0) {
      ctx.font = "16px sans-serif"; ctx.textAlign = "center"; ctx.textBaseline = "middle";
      ctx.fillText((p.triple > 0 ? "✳" : "") + (p.speed > 0 ? "⚡" : ""), p.x, p.y - R - 14);
    }
  }
  function draw() {
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, W, H);
    if (!G) return;
    const t = performance.now() / 1000;
    ctx.setTransform(dpr * sc, 0, 0, dpr * sc, dpr * ox, dpr * oy);
    // zemin
    ctx.fillStyle = "#6B7A45"; ctx.fillRect(0, 0, AW, AH);
    for (let y = 0; y < GH; y++) for (let x = 0; x < GW; x++) if ((x + y) % 2) { ctx.fillStyle = "#657341"; ctx.fillRect(x * TS, y * TS, TS, TS); }
    ctx.fillStyle = "rgba(255,255,255,.05)";
    for (let i = 0; i < 40; i++) { const x = (i * 97) % AW, y = (i * 61) % AH; ctx.beginPath(); ctx.arc(x, y, 6 + (i % 3) * 3, 0, 7); ctx.fill(); }
    // duvarlar
    for (let y = 0; y < GH; y++) for (let x = 0; x < GW; x++) {
      if (!G.grid[y][x]) continue;
      const X = x * TS, Y = y * TS;
      ctx.fillStyle = "#8C7B5E"; ctx.fillRect(X, Y, TS, TS);
      ctx.fillStyle = "#A6957A"; ctx.fillRect(X, Y, TS, 6);
      ctx.strokeStyle = "rgba(0,0,0,.25)"; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(X, Y + TS / 2); ctx.lineTo(X + TS, Y + TS / 2); ctx.moveTo(X + TS / 2, Y + 6); ctx.lineTo(X + TS / 2, Y + TS / 2); ctx.moveTo(X + TS / 4, Y + TS / 2); ctx.lineTo(X + TS / 4, Y + TS); ctx.stroke();
    }
    ctx.strokeStyle = "#3E3A28"; ctx.lineWidth = 6; ctx.strokeRect(3, 3, AW - 6, AH - 6);
    // güçlendiriciler
    for (const it of G.items) {
      const P = POWERS[it.k], s = 1 + Math.sin(it.t * 4) * 0.08;
      ctx.save(); ctx.translate(it.x, it.y); ctx.scale(s, s);
      ctx.fillStyle = "rgba(0,0,0,.35)"; ctx.beginPath(); ctx.arc(0, 0, 16, 0, 7); ctx.fill();
      ctx.strokeStyle = P.c; ctx.lineWidth = 3; ctx.stroke();
      ctx.font = "18px sans-serif"; ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.fillStyle = P.c; ctx.fillText(P.ic, 0, 1);
      ctx.restore();
    }
    for (const p of G.pl) drawTank(p, t);
    for (const b of G.bullets) {
      ctx.fillStyle = b.owner === 0 ? "#CFE2FF" : "#FFD0D2";
      ctx.beginPath(); ctx.arc(b.x, b.y, 5, 0, 7); ctx.fill();
      ctx.fillStyle = COLORS[b.owner].c; ctx.beginPath(); ctx.arc(b.x, b.y, 2.5, 0, 7); ctx.fill();
    }
    for (const f of G.fx) {
      const a = Math.max(0, 1 - f.t / f.life); ctx.globalAlpha = a;
      if (f.txt) { ctx.font = "26px sans-serif"; ctx.textAlign = "center"; ctx.fillText(f.txt, f.x, f.y - f.t * 40); }
      else { ctx.fillStyle = f.c; ctx.beginPath(); ctx.arc(f.x, f.y, 3 + a * 3, 0, 7); ctx.fill(); }
      ctx.globalAlpha = 1;
    }
    const left = Math.max(0, ROUND_T - G.t);
    if (left < 20 && !G.over && G.count <= 0) { ctx.fillStyle = "#fff"; ctx.font = "800 22px Rubik, sans-serif"; ctx.textAlign = "center"; ctx.fillText(`⏱ ${Math.ceil(left)}`, AW / 2, 30); }
    if (G.msgT > 0) {
      ctx.globalAlpha = Math.min(1, G.msgT * 2);
      ctx.font = "800 64px Rubik, sans-serif"; ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.lineWidth = 8; ctx.strokeStyle = "rgba(30,28,15,.8)"; ctx.fillStyle = "#fff";
      ctx.strokeText(G.msg, AW / 2, AH / 2); ctx.fillText(G.msg, AW / 2, AH / 2);
      ctx.globalAlpha = 1;
    }
    if (paused) { ctx.fillStyle = "rgba(0,0,0,.45)"; ctx.fillRect(0, 0, AW, AH); ctx.fillStyle = "#fff"; ctx.font = "800 40px Rubik, sans-serif"; ctx.textAlign = "center"; ctx.fillText("Duraklatıldı", AW / 2, AH / 2); }
  }
  function renderHud() {
    for (const i of [0, 1]) {
      $("n" + i).textContent = CFG.names[i]; $("p" + i).textContent = M ? M.pts[i] : 0;
      $("h" + i).textContent = G ? "❤".repeat(Math.max(0, G.pl[i].hp)) : "";
    }
    $("round").textContent = M ? `${M.round}. raund · ${CFG.win} kazanır` : "";
    $("pad1").hidden = CFG.mode === "ai";
  }

  /* ---------- girdi ---------- */
  const KM = { w: [0, "u"], s: [0, "d"], a: [0, "l"], d: [0, "r"], " ": [0, "f"], f: [0, "f"],
               arrowup: [1, "u"], arrowdown: [1, "d"], arrowleft: [1, "l"], arrowright: [1, "r"], enter: [1, "f"], "0": [1, "f"], shift: [1, "f"] };
  function setKey(e, on) {
    const m = KM[e.key.toLowerCase()];
    if (!m || !$("menu").hidden || !$("end").hidden) return;
    const pi = CFG.mode === "ai" ? 0 : m[0]; // tek oyunculu modda oklar da maviyi yönetsin
    e.preventDefault();
    keys[pi][m[1]] = on ? 1 : 0;
  }
  document.addEventListener("keydown", (e) => { if (e.key === "p" || e.key === "P" || e.key === "Escape") { togglePause(); return; } if (!e.repeat) { audio(); setKey(e, true); } });
  document.addEventListener("keyup", (e) => setKey(e, false));
  window.addEventListener("blur", () => keys.forEach(k => { for (const n in k) k[n] = 0; }));
  document.querySelectorAll(".pad button").forEach(btn => {
    const p = +btn.dataset.p, k = btn.dataset.k;
    btn.addEventListener("pointerdown", (e) => { e.preventDefault(); audio(); keys[p][k] = 1; btn.classList.add("on"); try { btn.setPointerCapture(e.pointerId); } catch (_) {} });
    const off = () => { keys[p][k] = 0; btn.classList.remove("on"); };
    btn.addEventListener("pointerup", off); btn.addEventListener("pointercancel", off); btn.addEventListener("lostpointercapture", off);
    btn.addEventListener("contextmenu", (e) => e.preventDefault());
  });
  function togglePause() { if (!G || G.over || !$("menu").hidden) return; paused = !paused; $("pause").textContent = paused ? "▶" : "⏸"; }
  $("pause").addEventListener("click", togglePause);

  /* ---------- menü ---------- */
  const form = $("form");
  function syncForm() { $("f-ai").hidden = form.mode.value !== "ai"; if (form.mode.value === "ai") { if ($("in1").value === "Egemen") $("in1").value = "Bilgisayar"; $("sh1").checked = false; } else if ($("in1").value === "Bilgisayar") $("in1").value = "Egemen"; }
  function fillForm() {
    form.mode.value = CFG.mode; form.ai.value = String(CFG.ai); form.win.value = String(CFG.win);
    $("in0").value = CFG.names[0]; $("in1").value = CFG.names[1]; $("sh0").checked = CFG.help[0]; $("sh1").checked = CFG.help[1];
    syncForm();
  }
  form.addEventListener("change", (e) => { if (e.target.name === "mode") syncForm(); });
  form.addEventListener("submit", (e) => {
    e.preventDefault(); audio();
    CFG = { mode: form.mode.value, ai: +form.ai.value, win: +form.win.value,
      names: [$("in0").value.trim() || "Mavi", $("in1").value.trim() || (form.mode.value === "ai" ? "Bilgisayar" : "Kırmızı")],
      help: [$("sh0").checked, $("sh1").checked] };
    store(); $("menu").hidden = true; paused = false; newMatch();
  });
  $("menu-btn").addEventListener("click", () => { fillForm(); $("end").hidden = true; $("menu").hidden = false; });
  $("end-next").addEventListener("click", () => { $("end").hidden = true; if ($("end-next").dataset.new) newMatch(); else newRound(); });
  $("end-menu").addEventListener("click", () => { fillForm(); $("end").hidden = true; $("menu").hidden = false; });
  fillForm();

  if (!CanvasRenderingContext2D.prototype.roundRect) {
    CanvasRenderingContext2D.prototype.roundRect = function (x, y, w, h, r) {
      r = Math.min(r, w / 2, h / 2);
      this.moveTo(x + r, y); this.arcTo(x + w, y, x + w, y + h, r); this.arcTo(x + w, y + h, x, y + h, r);
      this.arcTo(x, y + h, x, y, r); this.arcTo(x, y, x + w, y, r); this.closePath();
    };
  }

  /* ---------- döngü ---------- */
  let last = performance.now();
  function loop(now) {
    const dt = Math.min(0.05, (now - last) / 1000); last = now;
    const sr = stage.getBoundingClientRect();
    if (Math.abs(sr.width - W) > 0.5 || Math.abs(sr.height - H) > 0.5) resize();
    if (!paused && !headless && $("menu").hidden) update(dt);
    draw();
    requestAnimationFrame(loop);
  }
  resize();
  M = { pts: [0, 0], round: 0 }; newRound(); G.msgT = 0; G.msg = "";
  requestAnimationFrame(loop);

  // test kancası
  window.__tank = { get G() { return G; }, get M() { return M; }, update, newMatch, newRound, keys, MAPS, buildGrid, setHeadless: (h) => { headless = h; },
    setCFG: (c) => { CFG = Object.assign(CFG, c); }, aiOn: (i, lvl) => { G.pl[i].ai = { lvl, think: 0, move: [0, 0], fire: false, path: [] }; } };
})();
