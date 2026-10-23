/* Kale Savunması — kule savunma (Enes için) */
(() => {
  "use strict";
  const $ = (id) => document.getElementById(id);
  const cv = $("cv"), ctx = cv.getContext("2d"), stage = $("stage");
  const SAVE_KEY = "kale-savunmasi";
  const GW = 16, GH = 10, WAVES = 20;

  /* ---------- haritalar (yol köşe noktaları, ızgara koordinatı) ---------- */
  const MAPS = [
    { id: "cayir", nm: "Çayır", grass: ["#5E9E4B", "#589546"], road: "#D8C08A", edge: "#B89E66", deco: "tree",
      pts: [[-1, 2], [4, 2], [4, 7], [9, 7], [9, 2], [13, 2], [13, 7], [16, 7]] },
    { id: "col", nm: "Çöl", grass: ["#E2C68A", "#DBBE80"], road: "#B98A57", edge: "#9A6E40", deco: "cactus",
      pts: [[-1, 5], [3, 5], [3, 1], [7, 1], [7, 8], [11, 8], [11, 4], [16, 4]] },
    { id: "kis", nm: "Kış", grass: ["#E9F1F7", "#DFE9F1"], road: "#A9B8C8", edge: "#8696A8", deco: "pine",
      pts: [[2, -1], [2, 4], [6, 4], [6, 1], [10, 1], [10, 7], [14, 7], [14, 3], [16, 3]] },
  ];
  const DIFFS = [
    { id: "kolay", nm: "Kolay", hp: 0.5, gold: 200 },
    { id: "normal", nm: "Normal", hp: 1, gold: 160 },
    { id: "zor", nm: "Zor", hp: 1.15, gold: 170 },
  ];

  /* ---------- kuleler ---------- */
  const TOWERS = {
    okcu:   { nm: "Okçu", ic: "🏹", col: "#8B5A2B", top: "#C98B4A", cost: [50, 40, 70],
              dmg: [9, 15, 25], rate: [0.6, 0.5, 0.4], rng: [2.6, 2.9, 3.2], air: true, desc: "hızlı, tek hedef" },
    top:    { nm: "Top", ic: "💣", col: "#4A4F57", top: "#2B2F35", cost: [80, 70, 110],
              dmg: [22, 38, 62], rate: [1.6, 1.45, 1.3], rng: [2.4, 2.6, 2.8], splash: [1.0, 1.15, 1.3], air: false, desc: "alan hasarı, uçanlara atamaz" },
    buz:    { nm: "Buz", ic: "❄️", col: "#5A8FB8", top: "#BFE6FF", cost: [70, 55, 90],
              dmg: [3, 6, 10], rate: [1.0, 0.85, 0.7], rng: [2.3, 2.5, 2.8], slow: [0.35, 0.45, 0.55], air: true, desc: "yavaşlatır" },
    simsek: { nm: "Şimşek", ic: "⚡", col: "#5B4A8C", top: "#FFE066", cost: [140, 110, 160],
              dmg: [30, 48, 75], rate: [1.4, 1.25, 1.1], rng: [2.8, 3.0, 3.3], chain: [3, 4, 5], air: true, pierce: true, desc: "zincirleme, zırh deler" },
  };
  const ORDER = ["okcu", "top", "buz", "simsek"];

  /* ---------- düşmanlar ---------- */
  const FOES = {
    g: { nm: "Goblin", hp: 30, spd: 1.6, armor: 0, gold: 4, lives: 1, r: 0.22, col: "#5FB34A" },
    k: { nm: "Kurt", hp: 22, spd: 2.8, armor: 0, gold: 4, lives: 1, r: 0.22, col: "#8D8F99" },
    o: { nm: "Ork", hp: 110, spd: 1.0, armor: 3, gold: 9, lives: 2, r: 0.3, col: "#3E7A3A" },
    y: { nm: "Yarasa", hp: 34, spd: 2.0, armor: 0, gold: 5, lives: 1, r: 0.22, col: "#6B3FA0", fly: true },
    D: { nm: "Dev", hp: 900, spd: 0.65, armor: 5, gold: 60, lives: 10, r: 0.42, col: "#A0522D", boss: true },
  };
  // dalga: [tür, adet, aralık(sn)]
  const WAVE_LIST = [
    [["g", 8, 1.0]],
    [["g", 12, 0.8]],
    [["g", 8, 0.8], ["k", 6, 0.6]],
    [["g", 10, 0.7], ["o", 2, 2.0]],
    [["k", 14, 0.5], ["o", 3, 1.6]],
    [["y", 6, 0.9], ["g", 12, 0.6]],
    [["o", 6, 1.2], ["k", 10, 0.5]],
    [["y", 10, 0.7], ["o", 4, 1.2]],
    [["g", 20, 0.4], ["k", 12, 0.4]],
    [["o", 4, 1.2], ["D", 1, 0], ["k", 8, 0.5]],
    [["y", 14, 0.6], ["o", 6, 1.0]],
    [["k", 24, 0.35], ["g", 14, 0.4]],
    [["o", 12, 0.9], ["y", 8, 0.6]],
    [["g", 25, 0.3], ["k", 20, 0.3], ["y", 10, 0.5]],
    [["o", 8, 0.9], ["D", 2, 4], ["y", 10, 0.5]],
    [["y", 22, 0.45], ["k", 20, 0.3]],
    [["o", 18, 0.7], ["g", 20, 0.3]],
    [["k", 35, 0.25], ["y", 16, 0.4]],
    [["o", 20, 0.6], ["y", 20, 0.4], ["k", 20, 0.25]],
    [["D", 3, 5], ["o", 14, 0.7], ["y", 16, 0.4]],
  ];
  const hpScale = (n) => 1 + 0.12 * (n - 1) + 0.006 * (n - 1) * (n - 1);

  /* ---------- kayıt ---------- */
  let SAVE = { stars: {}, best: {} };
  try { SAVE = Object.assign(SAVE, JSON.parse(localStorage.getItem(SAVE_KEY) || "{}")); } catch (e) {}
  const store = () => { try { localStorage.setItem(SAVE_KEY, JSON.stringify(SAVE)); } catch (e) {} };

  /* ---------- ses ---------- */
  let AC = null, soundOn = true, lastSnd = {};
  function tone(f, d = 0.08, type = "square", vol = 0.05, slide = 0, key = "") {
    if (!soundOn) return;
    const now = performance.now();
    if (key) { if (now - (lastSnd[key] || 0) < 70) return; lastSnd[key] = now; }
    try {
      AC = AC || new (window.AudioContext || window.webkitAudioContext)();
      const t = AC.currentTime, o = AC.createOscillator(), g = AC.createGain();
      o.type = type; o.frequency.setValueAtTime(f, t);
      if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(30, f + slide), t + d);
      g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + d);
      o.connect(g).connect(AC.destination); o.start(t); o.stop(t + d + 0.02);
    } catch (e) {}
  }
  const SND = {
    arrow: () => tone(900, 0.05, "triangle", 0.03, -300, "arrow"),
    boom: () => tone(140, 0.25, "sawtooth", 0.06, -90, "boom"),
    ice: () => tone(1500, 0.08, "sine", 0.03, 400, "ice"),
    zap: () => tone(600, 0.12, "sawtooth", 0.04, 900, "zap"),
    coin: () => tone(1300, 0.06, "square", 0.025, 300, "coin"),
    build: () => { tone(400, 0.08, "square", 0.05); setTimeout(() => tone(600, 0.1, "square", 0.05), 80); },
    up: () => [500, 650, 820].forEach((f, i) => setTimeout(() => tone(f, 0.09, "square", 0.05), i * 70)),
    sell: () => tone(700, 0.12, "triangle", 0.05, -300),
    leak: () => tone(220, 0.3, "square", 0.06, -120, "leak"),
    wave: () => [330, 440, 550].forEach((f, i) => setTimeout(() => tone(f, 0.14, "triangle", 0.06), i * 110)),
    win: () => [523, 659, 784, 1046].forEach((f, i) => setTimeout(() => tone(f, 0.2, "triangle", 0.07), i * 140)),
    lose: () => [400, 300, 200].forEach((f, i) => setTimeout(() => tone(f, 0.3, "sawtooth", 0.05), i * 200)),
    no: () => tone(160, 0.12, "square", 0.04),
  };

  /* ---------- durum ---------- */
  let S = null, mapIdx = 0, diffIdx = 1;
  let path = null;           // {pts, seg, L, tiles:Set}
  let buildMode = null, selTower = null, hover = null;
  let paused = false, speed = 1, nextId = 1;

  function buildPath(m) {
    const pts = m.pts.map(([x, y]) => [x + 0.5, y + 0.5]);
    const seg = []; let L = 0;
    for (let i = 0; i < pts.length - 1; i++) {
      const [ax, ay] = pts[i], [bx, by] = pts[i + 1], l = Math.hypot(bx - ax, by - ay);
      seg.push({ ax, ay, bx, by, l, s: L }); L += l;
    }
    const tiles = new Set();
    for (const s of seg) {
      const n = Math.ceil(s.l * 2);
      for (let k = 0; k <= n; k++) {
        const x = Math.floor(s.ax + (s.bx - s.ax) * k / n), y = Math.floor(s.ay + (s.by - s.ay) * k / n);
        if (x >= 0 && y >= 0 && x < GW && y < GH) tiles.add(x + "," + y);
      }
    }
    return { pts, seg, L, tiles };
  }
  function posAt(d) {
    const sg = path.seg;
    for (const s of sg) if (d <= s.s + s.l) { const t = (d - s.s) / s.l; return [s.ax + (s.bx - s.ax) * t, s.ay + (s.by - s.ay) * t]; }
    const s = sg[sg.length - 1]; return [s.bx, s.by];
  }
  // dekor: yoldan uzak, sabit yerlerde birkaç ağaç/kaya (kurulamaz)
  function makeDeco(m, tiles) {
    let seed = m.id.length * 97 + m.pts.length * 13;
    const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
    const deco = new Set();
    let tries = 0;
    while (deco.size < 9 && tries++ < 400) {
      const x = Math.floor(rnd() * GW), y = Math.floor(rnd() * GH), k = x + "," + y;
      if (tiles.has(k) || deco.has(k)) continue;
      let near = false;
      for (let dx = -1; dx <= 1; dx++) for (let dy = -1; dy <= 1; dy++) if (tiles.has((x + dx) + "," + (y + dy))) near = true;
      if (near && rnd() < 0.7) continue;
      deco.add(k);
    }
    return deco;
  }

  function newGame() {
    const m = MAPS[mapIdx], d = DIFFS[diffIdx];
    path = buildPath(m);
    S = { m, d, gold: d.gold, lives: 20, wave: 0, active: false, queue: [], qt: 0,
          foes: [], towers: [], shots: [], fx: [], over: false, kills: 0, auto: 0, deco: makeDeco(m, path.tiles), t: 0 };
    buildMode = null; selTower = null; paused = false;
    $("pause").textContent = "⏸";
    renderTools(); updHud(); hideSel(); resize();
  }

  /* ---------- dalga ---------- */
  function startWave() {
    if (!S || S.active || S.over || S.wave >= WAVES) return;
    const n = S.wave + 1, list = WAVE_LIST[n - 1];
    const q = []; let t = 0;
    for (const [type, count, gap] of list) {
      for (let i = 0; i < count; i++) { q.push({ type, t }); t += gap || 0.01; }
      t += 1.5;
    }
    S.queue = q; S.qt = 0; S.active = true; S.auto = 0;
    SND.wave(); toast(n === WAVES ? "Son dalga! 🐉" : `Dalga ${n}` + (list.some(g => g[0] === "D") ? " · Dev geliyor!" : ""));
    updHud();
  }
  function spawn(type) {
    const f = FOES[type], n = S.wave + 1, hp = Math.round(f.hp * hpScale(n) * S.d.hp);
    S.foes.push({ id: nextId++, type, f, hp, max: hp, d: -0.3, x: 0, y: 0, slowT: 0, slowF: 0, hitT: 0 });
  }
  function waveDone() {
    S.active = false; S.wave++;
    const bonus = 15 + S.wave * 3;
    S.gold += bonus;
    if (S.wave >= WAVES) return finish(true);
    toast(`Dalga bitti! +${bonus} 🪙`);
    SND.coin();
    updHud(); renderTools();
  }

  /* ---------- kule işlemleri ---------- */
  const keyOf = (x, y) => x + "," + y;
  const towerAt = (x, y) => S.towers.find(t => t.gx === x && t.gy === y);
  const canBuild = (x, y) => x >= 0 && y >= 0 && x < GW && y < GH && !path.tiles.has(keyOf(x, y)) && !S.deco.has(keyOf(x, y)) && !towerAt(x, y);
  function place(type, x, y) {
    const T = TOWERS[type];
    if (!canBuild(x, y)) { SND.no(); return false; }
    if (S.gold < T.cost[0]) { SND.no(); toast("Altın yetmiyor"); return false; }
    S.gold -= T.cost[0];
    const tw = { type, T, gx: x, gy: y, lvl: 0, cd: 0, spent: T.cost[0], ang: 0, kills: 0 };
    S.towers.push(tw);
    SND.build(); puff(x + 0.5, y + 0.5, "#fff");
    updHud(); renderTools();
    return tw;
  }
  function upgrade(tw) {
    if (tw.lvl >= 2) return false;
    const c = tw.T.cost[tw.lvl + 1];
    if (S.gold < c) { SND.no(); toast("Altın yetmiyor"); return false; }
    S.gold -= c; tw.spent += c; tw.lvl++;
    SND.up(); puff(tw.gx + 0.5, tw.gy + 0.5, "#FFD166");
    updHud(); renderTools(); showSel(tw);
    return true;
  }
  const sellValue = (tw) => Math.round(tw.spent * 0.7);
  function sell(tw) {
    S.gold += sellValue(tw);
    S.towers = S.towers.filter(t => t !== tw);
    SND.sell(); puff(tw.gx + 0.5, tw.gy + 0.5, "#FFD166");
    hideSel(); updHud(); renderTools();
  }

  /* ---------- savaş ---------- */
  function hurt(e, dmg, pierce) {
    if (e.hp <= 0) return;
    const a = e.f.armor;
    e.hp -= pierce || !a ? dmg : Math.max(dmg * 0.35, dmg - a);
    e.hitT = 0.1;
    if (e.hp <= 0) {
      S.gold += e.f.gold; S.kills++;
      S.fx.push({ k: "txt", x: e.x, y: e.y, t: 0, life: 0.8, s: "+" + e.f.gold });
      puff(e.x, e.y, e.f.col);
      SND.coin();
    }
  }
  function puff(x, y, col) { for (let i = 0; i < 6; i++) { const a = Math.random() * 6.28, v = 0.6 + Math.random(); S.fx.push({ k: "p", x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, t: 0, life: 0.45, col }); } }

  function pickTarget(tw, rng) {
    const cx = tw.gx + 0.5, cy = tw.gy + 0.5;
    let best = null;
    for (const e of S.foes) {
      if (e.hp <= 0 || e.d < 0) continue;
      if (e.f.fly && !tw.T.air) continue;
      if ((e.x - cx) ** 2 + (e.y - cy) ** 2 > rng * rng) continue;
      if (!best || e.d > best.d) best = e;
    }
    return best;
  }
  function fire(tw, e) {
    const T = tw.T, L = tw.lvl, cx = tw.gx + 0.5, cy = tw.gy + 0.5;
    tw.ang = Math.atan2(e.y - cy, e.x - cx);
    if (tw.type === "okcu") { S.shots.push({ k: "arrow", x: cx, y: cy, tgt: e, v: 11, dmg: T.dmg[L] }); SND.arrow(); }
    else if (tw.type === "buz") { S.shots.push({ k: "ice", x: cx, y: cy, tgt: e, v: 8, dmg: T.dmg[L], slow: T.slow[L] }); SND.ice(); }
    else if (tw.type === "top") {
      // biraz önüne nişan al
      const dist = Math.hypot(e.x - cx, e.y - cy), fl = dist / 6;
      const sp = e.f.spd * (e.slowT > 0 ? 1 - e.slowF : 1);
      const [tx, ty] = posAt(e.d + sp * fl);
      S.shots.push({ k: "ball", x: cx, y: cy, sx: cx, sy: cy, tx, ty, t: 0, fl, dmg: T.dmg[L], r: T.splash[L] });
      SND.arrow();
    } else if (tw.type === "simsek") {
      const hit = [e]; let cur = e, dmg = T.dmg[L];
      const pts = [[cx, cy - 0.2], [e.x, e.y]];
      for (let i = 1; i < T.chain[L]; i++) {
        let nb = null, nd = 1.9 * 1.9;
        for (const o of S.foes) {
          if (o.hp <= 0 || hit.includes(o) || o.d < 0) continue;
          const dd = (o.x - cur.x) ** 2 + (o.y - cur.y) ** 2;
          if (dd < nd) { nd = dd; nb = o; }
        }
        if (!nb) break;
        hit.push(nb); cur = nb; pts.push([nb.x, nb.y]);
      }
      hit.forEach((o, i) => hurt(o, dmg * Math.pow(0.8, i), true));
      S.fx.push({ k: "bolt", pts, t: 0, life: 0.18 });
      SND.zap();
    }
  }

  function update(dt) {
    if (!S || S.over) return;
    S.t += dt;
    // otomatik sonraki dalga geri sayımı yok; kullanıcı başlatır
    if (S.active) {
      S.qt += dt;
      while (S.queue.length && S.queue[0].t <= S.qt) spawn(S.queue.shift().type);
    }
    // düşmanlar
    for (const e of S.foes) {
      if (e.hp <= 0) continue;
      let sp = e.f.spd;
      if (e.slowT > 0) { e.slowT -= dt; sp *= 1 - e.slowF; }
      e.d += sp * dt; e.hitT = Math.max(0, e.hitT - dt);
      [e.x, e.y] = posAt(Math.max(0, e.d));
      if (e.d >= path.L) {
        e.hp = 0; e.leaked = true;
        S.lives -= e.f.lives; SND.leak(); flash();
        if (S.lives <= 0) { S.lives = 0; updHud(); return finish(false); }
      }
    }
    // kuleler
    for (const tw of S.towers) {
      tw.cd -= dt;
      if (tw.cd > 0) continue;
      const e = pickTarget(tw, tw.T.rng[tw.lvl]);
      if (e) { fire(tw, e); tw.cd = tw.T.rate[tw.lvl]; }
    }
    // mermiler
    for (const s of S.shots) {
      if (s.k === "ball") {
        s.t += dt;
        const k = Math.min(1, s.t / s.fl);
        s.x = s.sx + (s.tx - s.sx) * k; s.y = s.sy + (s.ty - s.sy) * k;
        if (k >= 1) {
          s.dead = true;
          for (const e of S.foes) if (e.hp > 0 && !e.f.fly && e.d >= 0 && (e.x - s.tx) ** 2 + (e.y - s.ty) ** 2 <= s.r * s.r) hurt(e, s.dmg, false);
          S.fx.push({ k: "ring", x: s.tx, y: s.ty, r: s.r, t: 0, life: 0.3 });
          SND.boom();
        }
        continue;
      }
      const e = s.tgt;
      const tx = e.x, ty = e.y, dx = tx - s.x, dy = ty - s.y, dist = Math.hypot(dx, dy), step = s.v * dt;
      s.ang = Math.atan2(dy, dx);
      if (e.hp <= 0 && !e.leaked && dist > 0.3) { /* hedef öldü: son noktaya gidip kaybol */ }
      if (dist <= step + 0.05) {
        s.dead = true;
        if (e.hp > 0) {
          hurt(e, s.dmg, false);
          if (s.k === "ice" && e.hp > 0) { e.slowF = Math.max(e.slowT > 0 ? e.slowF : 0, s.slow * (e.f.boss ? 0.6 : 1)); e.slowT = 1.6; }
        }
      } else { s.x += dx / dist * step; s.y += dy / dist * step; }
      if (e.hp <= 0 && dist <= step + 0.05) s.dead = true;
    }
    S.shots = S.shots.filter(s => !s.dead);
    S.foes = S.foes.filter(e => e.hp > 0);
    for (const f of S.fx) { f.t += dt; if (f.k === "p") { f.x += f.vx * dt; f.y += f.vy * dt; } if (f.k === "txt") f.y -= 0.6 * dt; }
    S.fx = S.fx.filter(f => f.t < f.life);
    if (S.active && !S.queue.length && !S.foes.length) waveDone();
  }

  function finish(won) {
    S.over = true; S.active = false;
    const key = S.m.id + "." + S.d.id;
    let stars = 0;
    if (won) stars = S.lives >= 18 ? 3 : S.lives >= 10 ? 2 : 1;
    const prevBest = SAVE.best[key] || 0, reached = won ? WAVES : S.wave;
    SAVE.best[key] = Math.max(prevBest, reached);
    if (won) SAVE.stars[key] = Math.max(SAVE.stars[key] || 0, stars);
    store();
    hideSel(); buildMode = null; renderTools();
    setTimeout(() => {
      $("end-icon").textContent = won ? "🏆" : "🏚️";
      $("end-title").textContent = won ? "Kale kurtuldu!" : "Kale düştü!";
      $("end-stars").textContent = won ? "★".repeat(stars) + "☆".repeat(3 - stars) : "";
      $("end-text").textContent = won
        ? `${S.m.nm} · ${S.d.nm} — ${S.lives} can kaldı, ${S.kills} canavar yenildi.` + (stars === 3 ? " Kusursuz savunma!" : "")
        : `${S.wave}. dalgaya kadar dayandın (${S.kills} canavar). En iyi: ${SAVE.best[key]}/${WAVES}.` + (reached > prevBest && prevBest ? " Yeni rekor!" : "");
      $("end").hidden = false;
      $("again").focus();
    }, 500);
    won ? SND.win() : SND.lose();
  }

  /* ---------- çizim ---------- */
  let W = 0, H = 0, T = 0, ox = 0, oy = 0, portrait = false, dpr = 1;
  const bg = document.createElement("canvas"), bctx = bg.getContext("2d");
  // ızgara → ekran
  const SX = (x, y) => portrait ? ox + y * T : ox + x * T;
  const SY = (x, y) => portrait ? oy + x * T : oy + y * T;

  function resize() {
    const r = stage.getBoundingClientRect();
    dpr = Math.min(2, window.devicePixelRatio || 1);
    W = r.width; H = r.height;
    cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr);
    portrait = H > W * 1.05;
    const cols = portrait ? GH : GW, rows = portrait ? GW : GH;
    T = Math.floor(Math.min(W / cols, H / rows));
    ox = Math.floor((W - cols * T) / 2); oy = Math.floor((H - rows * T) / 2);
    if (S) renderBg();
  }

  function drawDeco(c, kind, x, y, t) {
    if (kind === "tree") {
      c.fillStyle = "#6B4A2B"; c.fillRect(x - t * 0.06, y, t * 0.12, t * 0.3);
      c.fillStyle = "#2F6B33"; c.beginPath(); c.arc(x, y - t * 0.05, t * 0.3, 0, 7); c.fill();
      c.fillStyle = "#3E8A40"; c.beginPath(); c.arc(x - t * 0.08, y - t * 0.12, t * 0.17, 0, 7); c.fill();
    } else if (kind === "cactus") {
      c.fillStyle = "#3F8F4E";
      c.fillRect(x - t * 0.08, y - t * 0.32, t * 0.16, t * 0.62);
      c.fillRect(x - t * 0.28, y - t * 0.12, t * 0.12, t * 0.2); c.fillRect(x - t * 0.28, y + t * 0.0, t * 0.22, t * 0.08);
      c.fillRect(x + t * 0.16, y - t * 0.22, t * 0.12, t * 0.2); c.fillRect(x + t * 0.06, y - t * 0.08, t * 0.22, t * 0.08);
    } else {
      c.fillStyle = "#6B4A2B"; c.fillRect(x - t * 0.05, y + t * 0.18, t * 0.1, t * 0.14);
      c.fillStyle = "#2E5E4E";
      c.beginPath(); c.moveTo(x, y - t * 0.38); c.lineTo(x + t * 0.3, y + t * 0.2); c.lineTo(x - t * 0.3, y + t * 0.2); c.closePath(); c.fill();
      c.fillStyle = "#fff"; c.beginPath(); c.moveTo(x, y - t * 0.38); c.lineTo(x + t * 0.12, y - t * 0.15); c.lineTo(x - t * 0.12, y - t * 0.15); c.closePath(); c.fill();
    }
  }
  function drawCastle(c, x, y, t) {
    c.fillStyle = "#8C7A5B"; c.fillRect(x - t * 0.42, y - t * 0.25, t * 0.84, t * 0.6);
    c.fillStyle = "#C9B48A";
    c.fillRect(x - t * 0.38, y - t * 0.22, t * 0.76, t * 0.54);
    for (let i = 0; i < 4; i++) c.fillRect(x - t * 0.42 + i * t * 0.24, y - t * 0.38, t * 0.14, t * 0.18);
    c.fillStyle = "#3A2A1A"; c.beginPath(); c.arc(x, y + t * 0.12, t * 0.12, Math.PI, 0); c.fillRect(x - t * 0.12, y + t * 0.12, t * 0.24, t * 0.2); c.fill();
    c.strokeStyle = "#FFD166"; c.lineWidth = Math.max(1, t * 0.04); c.beginPath(); c.moveTo(x, y - t * 0.38); c.lineTo(x, y - t * 0.75); c.stroke();
    c.fillStyle = "#E5484D"; c.beginPath(); c.moveTo(x, y - t * 0.75); c.lineTo(x + t * 0.3, y - t * 0.65); c.lineTo(x, y - t * 0.55); c.fill();
  }

  // harita önizleme ve arka plan aynı çizici
  function paintMap(c, m, tiles, deco, t, sx, sy) {
    for (let y = 0; y < GH; y++) for (let x = 0; x < GW; x++) {
      c.fillStyle = m.grass[(x + y) % 2];
      c.fillRect(sx(x, y), sy(x, y), t + 0.5, t + 0.5);
    }
    // yol: kenar + iç
    const P = m.pts.map(([x, y]) => [x + 0.5, y + 0.5]);
    const line = (w, col) => {
      c.strokeStyle = col; c.lineWidth = w; c.lineJoin = "round"; c.lineCap = "butt";
      c.beginPath(); P.forEach(([x, y], i) => i ? c.lineTo(sx(x, y), sy(x, y)) : c.moveTo(sx(x, y), sy(x, y))); c.stroke();
    };
    line(t * 0.98, m.edge); line(t * 0.8, m.road);
    if (deco) for (const k of deco) { const [x, y] = k.split(",").map(Number); drawDeco(c, m.deco, sx(x + 0.5, y + 0.5), sy(x + 0.5, y + 0.5), t); }
    // başlangıç mağarası ve kale
    const [ax, ay] = P[1], [bx, by] = P[0];
    const inX = Math.max(0, Math.min(GW, bx)), inY = Math.max(0, Math.min(GH, by));
    c.fillStyle = "#3B2F2A"; c.beginPath(); c.arc(sx(inX, inY), sy(inX, inY), t * 0.48, 0, 7); c.fill();
    c.fillStyle = "#120C0A"; c.beginPath(); c.arc(sx(inX, inY), sy(inX, inY), t * 0.3, 0, 7); c.fill();
    const [ex, ey] = P[P.length - 2];
    const end = P[P.length - 1];
    const cx2 = Math.min(GW - 0.5, Math.max(0.5, end[0] - (end[0] - ex > 0 ? 1 : end[0] - ex < 0 ? -1 : 0)));
    const cy2 = Math.min(GH - 0.5, Math.max(0.5, end[1] - (end[1] - ey > 0 ? 1 : end[1] - ey < 0 ? -1 : 0)));
    drawCastle(c, sx(cx2, cy2), sy(cx2, cy2), t);
    void ax; void ay;
  }
  function renderBg() {
    bg.width = cv.width; bg.height = cv.height;
    bctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    bctx.clearRect(0, 0, W, H);
    paintMap(bctx, S.m, path.tiles, S.deco, T, SX, SY);
  }

  function drawFoe(e) {
    const x = SX(e.x, e.y), y = SY(e.x, e.y), r = e.f.r * T, t = S.t;
    ctx.save(); ctx.translate(x, y);
    const bob = Math.sin(t * 10 + e.id) * r * 0.08;
    if (e.f.fly) {
      ctx.fillStyle = "rgba(0,0,0,.18)"; ctx.beginPath(); ctx.ellipse(0, r * 1.3, r * 0.8, r * 0.3, 0, 0, 7); ctx.fill();
      const fl = Math.sin(t * 18 + e.id) * 0.5;
      ctx.fillStyle = e.f.col;
      ctx.beginPath(); ctx.moveTo(0, -r * 0.2); ctx.lineTo(-r * 1.6, -r * (0.5 + fl)); ctx.lineTo(-r * 0.9, r * 0.3); ctx.closePath(); ctx.fill();
      ctx.beginPath(); ctx.moveTo(0, -r * 0.2); ctx.lineTo(r * 1.6, -r * (0.5 + fl)); ctx.lineTo(r * 0.9, r * 0.3); ctx.closePath(); ctx.fill();
      ctx.beginPath(); ctx.arc(0, 0, r * 0.65, 0, 7); ctx.fill();
    } else {
      ctx.fillStyle = "rgba(0,0,0,.22)"; ctx.beginPath(); ctx.ellipse(0, r * 0.85, r, r * 0.35, 0, 0, 7); ctx.fill();
      ctx.fillStyle = e.f.col;
      ctx.beginPath(); ctx.arc(0, bob, r, 0, 7); ctx.fill();
      if (e.type === "o" || e.type === "D") { // zırh/kask
        ctx.fillStyle = e.type === "D" ? "#6E3A1E" : "#7A7F88";
        ctx.beginPath(); ctx.arc(0, bob - r * 0.15, r * 0.95, Math.PI * 1.05, Math.PI * 1.95); ctx.fill();
      }
      if (e.type === "k") { ctx.fillStyle = e.f.col; ctx.beginPath(); ctx.moveTo(-r * 0.8, -r * 0.5 + bob); ctx.lineTo(-r * 0.5, -r * 1.2 + bob); ctx.lineTo(-r * 0.2, -r * 0.7 + bob); ctx.moveTo(r * 0.8, -r * 0.5 + bob); ctx.lineTo(r * 0.5, -r * 1.2 + bob); ctx.lineTo(r * 0.2, -r * 0.7 + bob); ctx.fill(); }
      if (e.type === "g") { ctx.fillStyle = e.f.col; ctx.beginPath(); ctx.moveTo(-r * 0.7, -r * 0.2 + bob); ctx.lineTo(-r * 1.4, -r * 0.6 + bob); ctx.lineTo(-r * 0.8, r * 0.2 + bob); ctx.moveTo(r * 0.7, -r * 0.2 + bob); ctx.lineTo(r * 1.4, -r * 0.6 + bob); ctx.lineTo(r * 0.8, r * 0.2 + bob); ctx.fill(); }
      if (e.type === "D") { ctx.fillStyle = "#F2E6C8"; ctx.beginPath(); ctx.moveTo(-r * 0.6, -r * 0.7 + bob); ctx.lineTo(-r * 0.9, -r * 1.3 + bob); ctx.lineTo(-r * 0.3, -r * 0.85 + bob); ctx.moveTo(r * 0.6, -r * 0.7 + bob); ctx.lineTo(r * 0.9, -r * 1.3 + bob); ctx.lineTo(r * 0.3, -r * 0.85 + bob); ctx.fill(); }
    }
    // gözler
    ctx.fillStyle = e.type === "y" ? "#FFE066" : "#fff";
    const ey = e.f.fly ? -r * 0.1 : bob - r * 0.1;
    ctx.beginPath(); ctx.arc(-r * 0.32, ey, r * 0.2, 0, 7); ctx.arc(r * 0.32, ey, r * 0.2, 0, 7); ctx.fill();
    ctx.fillStyle = "#1A1A1A"; ctx.beginPath(); ctx.arc(-r * 0.3, ey + r * 0.03, r * 0.09, 0, 7); ctx.arc(r * 0.34, ey + r * 0.03, r * 0.09, 0, 7); ctx.fill();
    if (e.hitT > 0) { ctx.fillStyle = "rgba(255,255,255,.45)"; ctx.beginPath(); ctx.arc(0, e.f.fly ? 0 : bob, r, 0, 7); ctx.fill(); }
    if (e.slowT > 0) { ctx.strokeStyle = "#BFE6FF"; ctx.lineWidth = Math.max(1.5, T * 0.04); ctx.beginPath(); ctx.arc(0, e.f.fly ? 0 : bob, r * 1.12, 0, 7); ctx.stroke(); }
    // can çubuğu
    if (e.hp < e.max) {
      const w = Math.max(T * 0.55, r * 2), h = Math.max(3, T * 0.07), yy = -r - (e.f.fly ? r * 0.9 : r * 0.55) - h;
      ctx.fillStyle = "rgba(0,0,0,.55)"; ctx.fillRect(-w / 2, yy, w, h);
      const k = Math.max(0, e.hp / e.max);
      ctx.fillStyle = k > 0.5 ? "#6BD66B" : k > 0.25 ? "#FFD166" : "#E5484D"; ctx.fillRect(-w / 2, yy, w * k, h);
    }
    ctx.restore();
  }
  function drawTower(tw) {
    const x = SX(tw.gx + 0.5, tw.gy + 0.5), y = SY(tw.gx + 0.5, tw.gy + 0.5), t = T, T0 = tw.T;
    ctx.save(); ctx.translate(x, y);
    ctx.fillStyle = "rgba(0,0,0,.25)"; ctx.beginPath(); ctx.ellipse(0, t * 0.3, t * 0.4, t * 0.14, 0, 0, 7); ctx.fill();
    ctx.fillStyle = "#9A8F7E"; ctx.beginPath(); ctx.arc(0, t * 0.05, t * 0.4, 0, 7); ctx.fill();
    ctx.fillStyle = "#B8AD99"; ctx.beginPath(); ctx.arc(0, 0, t * 0.34, 0, 7); ctx.fill();
    ctx.fillStyle = T0.col; ctx.beginPath(); ctx.arc(0, 0, t * 0.26, 0, 7); ctx.fill();
    // ekran açısı (portrede eksenler yer değiştirir)
    const a = portrait ? Math.atan2(Math.cos(tw.ang), Math.sin(tw.ang)) : tw.ang;
    if (tw.type === "okcu") {
      ctx.rotate(a); ctx.strokeStyle = T0.top; ctx.lineWidth = t * 0.07; ctx.beginPath(); ctx.arc(t * 0.02, 0, t * 0.2, -1.2, 1.2); ctx.stroke();
      ctx.strokeStyle = "#EEE"; ctx.lineWidth = t * 0.025; ctx.beginPath(); ctx.moveTo(-t * 0.1, 0); ctx.lineTo(t * 0.26, 0); ctx.stroke();
    } else if (tw.type === "top") {
      ctx.rotate(a); ctx.fillStyle = T0.top; ctx.fillRect(0, -t * 0.09, t * 0.36, t * 0.18);
      ctx.beginPath(); ctx.arc(0, 0, t * 0.16, 0, 7); ctx.fill();
    } else if (tw.type === "buz") {
      ctx.fillStyle = T0.top; ctx.beginPath();
      for (let i = 0; i < 6; i++) { const q = i * Math.PI / 3 + S.t * 0.8; ctx.moveTo(0, 0); ctx.lineTo(Math.cos(q) * t * 0.22, Math.sin(q) * t * 0.22); }
      ctx.strokeStyle = T0.top; ctx.lineWidth = t * 0.06; ctx.stroke();
      ctx.beginPath(); ctx.arc(0, 0, t * 0.08, 0, 7); ctx.fill();
    } else {
      ctx.fillStyle = T0.top; ctx.beginPath(); ctx.moveTo(t * 0.04, -t * 0.22); ctx.lineTo(-t * 0.12, t * 0.03); ctx.lineTo(0, t * 0.03); ctx.lineTo(-t * 0.04, t * 0.22); ctx.lineTo(t * 0.12, -t * 0.03); ctx.lineTo(0, -t * 0.03); ctx.closePath(); ctx.fill();
    }
    ctx.restore();
    // seviye yıldızları
    for (let i = 0; i <= tw.lvl; i++) {
      ctx.fillStyle = "#FFD166"; ctx.strokeStyle = "#5A3E00"; ctx.lineWidth = 1;
      const sx = x - t * 0.18 + i * t * 0.18, sy = y + t * 0.36;
      ctx.beginPath(); ctx.arc(sx, sy, Math.max(2, t * 0.06), 0, 7); ctx.fill(); ctx.stroke();
    }
  }
  function ring(gx, gy, r, ok) {
    ctx.fillStyle = ok ? "rgba(255,255,255,.14)" : "rgba(229,72,77,.18)";
    ctx.strokeStyle = ok ? "rgba(255,255,255,.7)" : "rgba(229,72,77,.8)";
    ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(SX(gx + 0.5, gy + 0.5), SY(gx + 0.5, gy + 0.5), r * T, 0, 7); ctx.fill(); ctx.stroke();
  }

  function draw() {
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, cv.width, cv.height);
    if (!S) return;
    ctx.drawImage(bg, 0, 0);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    // kurulum önizlemesi
    if (buildMode && hover) {
      const ok = canBuild(hover[0], hover[1]) && S.gold >= TOWERS[buildMode].cost[0];
      ring(hover[0], hover[1], TOWERS[buildMode].rng[0], ok);
      ctx.fillStyle = ok ? "rgba(255,255,255,.35)" : "rgba(229,72,77,.4)";
      ctx.fillRect(SX(hover[0], hover[1]), SY(hover[0], hover[1]), T, T);
    }
    if (selTower) ring(selTower.gx, selTower.gy, selTower.T.rng[selTower.lvl], true);
    for (const tw of S.towers) drawTower(tw);
    const fo = S.foes.slice().sort((a, b) => (a.f.fly ? 1 : 0) - (b.f.fly ? 1 : 0));
    for (const e of fo) if (e.d >= 0) drawFoe(e);
    for (const s of S.shots) {
      const x = SX(s.x, s.y), y = SY(s.x, s.y);
      if (s.k === "arrow") {
        const a = portrait ? Math.atan2(Math.cos(s.ang || 0), Math.sin(s.ang || 0)) : (s.ang || 0);
        ctx.save(); ctx.translate(x, y); ctx.rotate(a);
        ctx.strokeStyle = "#5A3A1A"; ctx.lineWidth = Math.max(1.5, T * 0.04); ctx.beginPath(); ctx.moveTo(-T * 0.18, 0); ctx.lineTo(T * 0.12, 0); ctx.stroke();
        ctx.fillStyle = "#DDD"; ctx.beginPath(); ctx.moveTo(T * 0.16, 0); ctx.lineTo(T * 0.08, -T * 0.05); ctx.lineTo(T * 0.08, T * 0.05); ctx.fill();
        ctx.restore();
      } else if (s.k === "ice") {
        ctx.fillStyle = "#DFF4FF"; ctx.beginPath(); ctx.arc(x, y, T * 0.09, 0, 7); ctx.fill();
        ctx.strokeStyle = "#7CC7F2"; ctx.lineWidth = 1.5; ctx.stroke();
      } else {
        const k = Math.min(1, s.t / s.fl), lift = Math.sin(k * Math.PI) * T * 0.6;
        ctx.fillStyle = "rgba(0,0,0,.25)"; ctx.beginPath(); ctx.arc(x, y, T * 0.08, 0, 7); ctx.fill();
        ctx.fillStyle = "#222"; ctx.beginPath(); ctx.arc(x, y - lift, T * 0.11, 0, 7); ctx.fill();
      }
    }
    for (const f of S.fx) {
      const k = f.t / f.life;
      if (f.k === "p") { ctx.globalAlpha = 1 - k; ctx.fillStyle = f.col; ctx.beginPath(); ctx.arc(SX(f.x, f.y), SY(f.x, f.y), T * 0.07 * (1 - k * 0.5), 0, 7); ctx.fill(); }
      else if (f.k === "ring") { ctx.globalAlpha = 1 - k; ctx.strokeStyle = "#FF9A3C"; ctx.lineWidth = T * 0.12 * (1 - k) + 1; ctx.beginPath(); ctx.arc(SX(f.x, f.y), SY(f.x, f.y), f.r * T * (0.4 + k * 0.6), 0, 7); ctx.stroke(); }
      else if (f.k === "bolt") {
        ctx.globalAlpha = 1 - k; ctx.strokeStyle = "#FFF6A8"; ctx.lineWidth = Math.max(2, T * 0.06); ctx.lineJoin = "round";
        ctx.beginPath();
        f.pts.forEach(([px, py], i) => {
          const X = SX(px, py), Y = SY(px, py);
          if (!i) return ctx.moveTo(X, Y);
          const [qx, qy] = f.pts[i - 1], mx = (SX(qx, qy) + X) / 2 + (Math.random() - 0.5) * T * 0.3, my = (SY(qx, qy) + Y) / 2 + (Math.random() - 0.5) * T * 0.3;
          ctx.lineTo(mx, my); ctx.lineTo(X, Y);
        });
        ctx.stroke();
      } else if (f.k === "txt") {
        ctx.globalAlpha = 1 - k; ctx.fillStyle = "#FFD166"; ctx.strokeStyle = "rgba(0,0,0,.6)"; ctx.lineWidth = 3;
        ctx.font = `800 ${Math.max(11, T * 0.3)}px Rubik, sans-serif`; ctx.textAlign = "center";
        ctx.strokeText(f.s, SX(f.x, f.y), SY(f.x, f.y)); ctx.fillText(f.s, SX(f.x, f.y), SY(f.x, f.y));
      }
      ctx.globalAlpha = 1;
    }
    if (paused && !S.over) {
      ctx.fillStyle = "rgba(0,0,0,.45)"; ctx.fillRect(0, 0, W, H);
      ctx.fillStyle = "#fff"; ctx.font = "800 28px Rubik, sans-serif"; ctx.textAlign = "center"; ctx.fillText("Duraklatıldı", W / 2, H / 2);
    }
  }

  /* ---------- arayüz ---------- */
  let toastT = 0;
  function toast(s) { const el = $("toast"); el.textContent = s; el.hidden = false; clearTimeout(toastT); toastT = setTimeout(() => (el.hidden = true), 1800); }
  function flash() { const p = $("lives").parentElement; p.classList.add("flash"); setTimeout(() => p.classList.remove("flash"), 300); }
  function updHud() {
    $("gold").textContent = S.gold; $("lives").textContent = S.lives;
    $("wave").textContent = `${Math.min(WAVES, S.wave + (S.active ? 1 : 0))}/${WAVES}`;
    const nx = $("next");
    nx.disabled = S.active || S.over;
    nx.textContent = S.active ? "⚔️ Savaş sürüyor" : `▶ Dalga ${S.wave + 1}`;
  }
  let lastGold = -1;
  function renderTools() {
    const box = $("tools");
    if (!box.children.length) {
      box.innerHTML = ORDER.map((k, i) => `<button class="tool" type="button" data-t="${k}" aria-label="${TOWERS[k].nm} kulesi, ${TOWERS[k].cost[0]} altın (${i + 1})"><span class="ic" aria-hidden="true">${TOWERS[k].ic}</span><span class="nm">${TOWERS[k].nm}</span><span class="c">🪙 ${TOWERS[k].cost[0]}</span></button>`).join("");
      box.querySelectorAll(".tool").forEach(b => b.addEventListener("click", () => pickBuild(b.dataset.t)));
    }
    box.querySelectorAll(".tool").forEach(b => {
      b.classList.toggle("on", buildMode === b.dataset.t);
      b.setAttribute("aria-pressed", buildMode === b.dataset.t);
      b.disabled = !S || S.over || S.gold < TOWERS[b.dataset.t].cost[0];
    });
    if (selTower) showSel(selTower);
    lastGold = S ? S.gold : -1;
  }
  function pickBuild(t) {
    if (!S || S.over) return;
    if (S.gold < TOWERS[t].cost[0]) { SND.no(); toast("Altın yetmiyor"); return; }
    hideSel();
    buildMode = buildMode === t ? null : t;
    if (buildMode) toast(`${TOWERS[t].nm}: ${TOWERS[t].desc} — boş kareye dokun`);
    renderTools();
  }
  function showSel(tw) {
    selTower = tw;
    const T0 = tw.T, L = tw.lvl;
    $("sel-name").textContent = `${T0.ic} ${T0.nm} kulesi · Seviye ${L + 1}`;
    let st = `Hasar ${T0.dmg[L]} · Menzil ${T0.rng[L].toFixed(1)} · Atış ${(1 / T0.rate[L]).toFixed(1)}/sn`;
    if (T0.slow) st += ` · Yavaşlatma %${Math.round(T0.slow[L] * 100)}`;
    if (T0.chain) st += ` · Zincir ${T0.chain[L]}`;
    if (T0.splash) st += ` · Patlama ${T0.splash[L].toFixed(1)}`;
    $("sel-stats").textContent = st;
    const up = $("sel-up");
    if (L >= 2) { up.textContent = "En üst seviye"; up.disabled = true; }
    else { up.textContent = `⬆ Geliştir 🪙${T0.cost[L + 1]}`; up.disabled = S.gold < T0.cost[L + 1]; }
    $("sel-sell").textContent = `Sat +${sellValue(tw)}`;
    $("sel").hidden = false; $("tools").hidden = true;
  }
  function hideSel() { selTower = null; $("sel").hidden = true; $("tools").hidden = false; }

  function cellFromEvent(ev) {
    const r = cv.getBoundingClientRect(), px = ev.clientX - r.left, py = ev.clientY - r.top;
    if (Math.abs(r.width - W) > 0.5 || Math.abs(r.height - H) > 0.5) resize();
    const a = Math.floor((px - ox) / T), b = Math.floor((py - oy) / T);
    const gx = portrait ? b : a, gy = portrait ? a : b;
    if (gx < 0 || gy < 0 || gx >= GW || gy >= GH) return null;
    return [gx, gy];
  }
  cv.addEventListener("pointermove", (ev) => { hover = cellFromEvent(ev); });
  cv.addEventListener("pointerleave", () => { if (matchMedia("(hover:hover)").matches) hover = null; });
  cv.addEventListener("pointerdown", (ev) => {
    if (!S || S.over) return;
    const c = cellFromEvent(ev); hover = c;
    if (!c) return;
    const tw = towerAt(c[0], c[1]);
    if (tw) { buildMode = null; renderTools(); showSel(tw); return; }
    if (buildMode) {
      if (place(buildMode, c[0], c[1]) && S.gold < TOWERS[buildMode].cost[0]) buildMode = null;
      renderTools(); return;
    }
    hideSel();
  });
  $("sel-up").addEventListener("click", () => selTower && upgrade(selTower));
  $("sel-sell").addEventListener("click", () => selTower && sell(selTower));
  $("sel-x").addEventListener("click", hideSel);
  $("next").addEventListener("click", startWave);
  $("speed").addEventListener("click", () => { speed = speed === 1 ? 2 : 1; $("speed").textContent = `⏩ ${speed}x`; });
  $("pause").addEventListener("click", () => { if (!S || S.over) return; paused = !paused; $("pause").textContent = paused ? "▶" : "⏸"; $("pause").setAttribute("aria-label", paused ? "Devam et" : "Duraklat"); });
  $("sound").addEventListener("click", () => {
    soundOn = !soundOn; $("ic-on").hidden = !soundOn; $("ic-off").hidden = soundOn;
    $("sound").setAttribute("aria-pressed", soundOn); $("sound").setAttribute("aria-label", soundOn ? "Sesi kapat" : "Sesi aç");
  });
  document.addEventListener("keydown", (ev) => {
    if (!S || !$("start").hidden || !$("end").hidden) return;
    if (ev.key >= "1" && ev.key <= "4") pickBuild(ORDER[+ev.key - 1]);
    else if (ev.key === "Escape") { buildMode = null; hideSel(); renderTools(); }
    else if (ev.key === " ") { ev.preventDefault(); startWave(); }
    else if ((ev.key === "u" || ev.key === "U") && selTower) upgrade(selTower);
    else if (ev.key === "p" || ev.key === "P") $("pause").click();
  });

  /* ---------- başlangıç ekranı ---------- */
  function renderStart() {
    $("maps").innerHTML = MAPS.map((m, i) => {
      const st = SAVE.stars[m.id + "." + DIFFS[diffIdx].id] || 0, b = SAVE.best[m.id + "." + DIFFS[diffIdx].id] || 0;
      return `<button class="map" type="button" role="radio" aria-checked="${i === mapIdx}" data-i="${i}"><canvas width="160" height="100"></canvas><b>${m.nm}</b><small>${st ? "★".repeat(st) + "☆".repeat(3 - st) : b ? `${b}/${WAVES} dalga` : ""}</small></button>`;
    }).join("");
    $("maps").querySelectorAll(".map").forEach((b, i) => {
      const c = b.querySelector("canvas").getContext("2d"), m = MAPS[i], p = buildPath(m);
      paintMap(c, m, p.tiles, makeDeco(m, p.tiles), 10, (x) => x * 10, (x, y) => y * 10);
      b.addEventListener("click", () => { mapIdx = i; renderStart(); });
    });
    $("diffs").innerHTML = DIFFS.map((d, i) => `<button type="button" role="radio" aria-checked="${i === diffIdx}" data-i="${i}">${d.nm}</button>`).join("");
    $("diffs").querySelectorAll("button").forEach((b, i) => b.addEventListener("click", () => { diffIdx = i; renderStart(); }));
  }
  $("go").addEventListener("click", () => { $("start").hidden = true; newGame(); });
  $("again").addEventListener("click", () => { $("end").hidden = true; newGame(); });
  $("menu").addEventListener("click", () => { $("end").hidden = true; renderStart(); $("start").hidden = false; });

  /* ---------- döngü ---------- */
  let last = performance.now();
  function loop(now) {
    const dt = Math.min(0.05, (now - last) / 1000); last = now;
    const sr = stage.getBoundingClientRect();
    if (Math.abs(sr.width - W) > 0.5 || Math.abs(sr.height - H) > 0.5) resize();
    if (S && !paused && $("start").hidden) { for (let i = 0; i < speed; i++) update(dt); }
    if (S && S.gold !== lastGold) renderTools();
    draw();
    requestAnimationFrame(loop);
  }
  window.addEventListener("resize", resize);
  new ResizeObserver(resize).observe(stage);
  resize(); renderStart();
  requestAnimationFrame(loop);

  // test kancası
  window.__kale = {
    get S() { return S; }, MAPS, DIFFS, TOWERS, FOES, WAVE_LIST, hpScale,
    newGame: (m = 0, d = 1) => { mapIdx = m; diffIdx = d; $("start").hidden = true; $("end").hidden = true; newGame(); },
    update, place, upgrade, sell, startWave, canBuild, get path() { return path; },
    setPaused: (p) => { paused = p; },
    get geo() { return { T, ox, oy, portrait, W, H }; },
  };
})();
