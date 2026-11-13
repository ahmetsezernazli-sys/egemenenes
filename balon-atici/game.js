/* Balon Atıcı — Enes için nişan ve eşleştirme oyunu */
(() => {
  "use strict";
  const $ = (id) => document.getElementById(id);
  const SAVE_KEY = "balon-atici";
  const R = 18, COLS = 11, W = 396, H = 600, D = R * Math.sqrt(3);
  const LX = W / 2, LY = H - 42, DEAD = H - 92, SPEED = 15, BOMB = 9;
  const COLORS = ["#FF5A5F", "#FFD166", "#3DDC84", "#4DA3FF", "#B57CFF", "#FF9F43"];
  const DARK = ["#B8323A", "#C99A2E", "#1F9E5A", "#2A6FC0", "#7B45C8", "#C26A1C"];
  const NAMES = ["kırmızı", "sarı", "yeşil", "mavi", "mor", "turuncu"];
  const DIFF = [ // renk sayısı, ıska sınırı, kılavuz uzunluğu, başlangıç sırası
    { col: 4, miss: 7, guide: 900, rows: 5 },
    { col: 5, miss: 6, guide: 520, rows: 6 },
    { col: 6, miss: 5, guide: 200, rows: 7 }
  ];
  const cv = $("cv"), ctx = cv.getContext("2d");
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  cv.width = W * dpr; cv.height = H * dpr; ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

  let save = { hi: 0, df: 0 };
  try { save = Object.assign(save, JSON.parse(localStorage.getItem(SAVE_KEY) || "{}")); } catch (e) {}
  const persist = () => { try { localStorage.setItem(SAVE_KEY, JSON.stringify(save)); } catch (e) {} };

  /* ---------- ses ---------- */
  let AC = null;
  function audio() { try { AC = AC || new (window.AudioContext || window.webkitAudioContext)(); if (AC.state === "suspended") AC.resume(); } catch (e) {} }
  function tone(f, d, type, vol, delay, f2) {
    if (!AC) return;
    const t = AC.currentTime + (delay || 0), o = AC.createOscillator(), g = AC.createGain();
    o.type = type || "sine"; o.frequency.setValueAtTime(f, t); if (f2) o.frequency.exponentialRampToValueAtTime(f2, t + d);
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol || 0.06, t + 0.01); g.gain.exponentialRampToValueAtTime(0.0001, t + d);
    o.connect(g).connect(AC.destination); o.start(t); o.stop(t + d + 0.02);
  }
  const sfx = {
    shoot() { tone(500, 0.12, "triangle", 0.05, 0, 900); },
    stick() { tone(180, 0.08, "sine", 0.06); },
    pop(n) { for (let i = 0; i < Math.min(n, 8); i++) tone(600 + i * 90, 0.07, "square", 0.025, i * 0.035); },
    drop(n) { for (let i = 0; i < Math.min(n, 6); i++) tone(700 - i * 70, 0.12, "triangle", 0.04, 0.2 + i * 0.05); },
    bomb() { tone(120, 0.5, "sawtooth", 0.08, 0, 40); },
    row() { tone(140, 0.25, "square", 0.05, 0, 90); },
    win() { [523, 659, 784, 1046].forEach((f, i) => tone(f, 0.2, "triangle", 0.07, i * 0.1)); },
    over() { [392, 330, 262, 196].forEach((f, i) => tone(f, 0.25, "triangle", 0.07, i * 0.15)); }
  };

  /* ---------- ızgara ---------- */
  let G = [], par = 0;
  const shifted = (r) => ((r + par) & 1) === 1;
  const rowLen = (r) => shifted(r) ? COLS - 1 : COLS;
  const pos = (r, c) => ({ x: R + c * 2 * R + (shifted(r) ? R : 0), y: R + r * D });
  const get = (r, c) => (r >= 0 && r < G.length && c >= 0 && c < rowLen(r)) ? G[r][c] : null;
  function neighbors(r, c) {
    const s = shifted(r), out = [[r, c - 1], [r, c + 1]];
    const a = s ? [c, c + 1] : [c - 1, c];
    for (const cc of a) { out.push([r - 1, cc]); out.push([r + 1, cc]); }
    return out.filter(([rr, cc]) => rr >= 0 && cc >= 0 && cc < rowLen(rr));
  }
  function present() {
    const s = new Set();
    for (const row of G) for (const v of row) if (v != null) s.add(v);
    return [...s];
  }
  const rnd = (n) => Math.floor(Math.random() * n);

  /* ---------- durum ---------- */
  let S = null, aim = Math.PI / 2, paused = true, fx = [], falls = [], texts = [];
  function makeRow(r, ncol) {
    const row = new Array(rowLen(r)).fill(null);
    for (let c = 0; c < row.length; c++) {
      // komşu rengi kopyalayarak küçük kümeler oluştur
      const left = c > 0 ? row[c - 1] : null, up = get(r - 1, c);
      if (left != null && Math.random() < 0.4) row[c] = left;
      else if (up != null && Math.random() < 0.3) row[c] = up;
      else row[c] = rnd(ncol);
    }
    return row;
  }
  function newGame(df) {
    S = { df, lv: 0, score: 0, over: false, shot: null, cur: 0, next: 0, misses: 0, bombAt: 1500, shots: 0, combo: 0 };
    startLevel(1);
  }
  function levelCfg() {
    const d = DIFF[S.df];
    return { col: Math.min(6, d.col + Math.floor((S.lv - 1) / 3)), rows: Math.min(10, d.rows + S.lv - 1), miss: Math.max(3, d.miss - Math.floor((S.lv - 1) / 2)) };
  }
  function startLevel(lv) {
    S.lv = lv; S.misses = 0; S.shot = null; S.clearing = 0;
    const cfg = levelCfg(); S.ncol = cfg.col; S.missLimit = cfg.miss;
    G = []; par = 0;
    for (let r = 0; r < cfg.rows; r++) G.push(makeRow(r, cfg.col));
    S.cur = pickColor(); S.next = pickColor();
    fx = []; falls = []; texts = [];
    paused = false; hud(); msg(`Bölüm ${lv}: ${cfg.col} renk. ${S.missLimit} ıskada bir yeni sıra iner.`);
  }
  function pickColor() {
    const p = present();
    return p.length ? p[rnd(p.length)] : rnd(S.ncol);
  }
  function hud() {
    $("lv").textContent = S ? S.lv : 1; $("sc").textContent = S ? S.score : 0; $("hi").textContent = save.hi;
  }
  function msg(t) { $("msg").textContent = t; }

  /* ---------- atış ---------- */
  function clampAim(a) { return Math.max(0.13, Math.min(Math.PI - 0.13, a)); }
  function shoot() {
    if (!S || S.over || paused || S.shot || S.clearing) return false;
    S.shot = { x: LX, y: LY, vx: Math.cos(aim) * SPEED, vy: -Math.sin(aim) * SPEED, col: S.cur };
    S.cur = S.next; S.next = S.bombAt <= S.score ? (S.bombAt += 1500, BOMB) : pickColor();
    S.shots++; sfx.shoot();
    return true;
  }
  function swap() {
    if (!S || S.over || paused || S.shot) return false;
    [S.cur, S.next] = [S.next, S.cur]; tone(420, 0.06, "sine", 0.05);
    return true;
  }
  function hitTest(x, y) {
    if (y <= R) return true;
    const lim = (2 * R * 0.84) ** 2;
    const r0 = Math.max(0, Math.floor((y - R) / D) - 1), r1 = Math.min(G.length - 1, r0 + 3);
    for (let r = r0; r <= r1; r++) for (let c = 0; c < rowLen(r); c++) {
      if (G[r][c] == null) continue;
      const p = pos(r, c);
      if ((p.x - x) ** 2 + (p.y - y) ** 2 < lim) return true;
    }
    return false;
  }
  function moveShot() {
    const s = S.shot, n = 5;
    for (let k = 0; k < n; k++) {
      s.x += s.vx / n; s.y += s.vy / n;
      if (s.x < R) { s.x = 2 * R - s.x; s.vx = -s.vx; tone(300, 0.03, "sine", 0.03); }
      if (s.x > W - R) { s.x = 2 * (W - R) - s.x; s.vx = -s.vx; tone(300, 0.03, "sine", 0.03); }
      if (hitTest(s.x, s.y)) { attach(s); return; }
    }
  }
  function bestCell(x, y) {
    let best = null, bd = Infinity;
    const rMax = G.length;
    for (let r = Math.max(0, Math.floor((y - R) / D) - 1); r <= Math.min(rMax, Math.floor((y - R) / D) + 2); r++) {
      for (let c = 0; c < rowLen(r); c++) {
        if (get(r, c) != null) continue;
        if (r > 0 && !neighbors(r, c).some(([rr, cc]) => get(rr, cc) != null)) continue;
        const p = pos(r, c), d = (p.x - x) ** 2 + (p.y - y) ** 2;
        if (d < bd) { bd = d; best = [r, c]; }
      }
    }
    return best;
  }
  function ensureRow(r) { while (G.length <= r) G.push(new Array(rowLen(G.length)).fill(null)); }
  function attach(s) {
    S.shot = null;
    let popped = 0, dropped = 0;
    if (s.col === BOMB) {
      sfx.bomb();
      for (let r = 0; r < G.length; r++) for (let c = 0; c < rowLen(r); c++) {
        if (G[r][c] == null) continue;
        const p = pos(r, c);
        if ((p.x - s.x) ** 2 + (p.y - s.y) ** 2 < (R * 4.3) ** 2) { burst(p.x, p.y, G[r][c]); G[r][c] = null; popped++; }
      }
      fx.push({ ring: true, x: s.x, y: s.y, t: 0 });
    } else {
      const cell = bestCell(s.x, s.y);
      if (!cell) { S.misses++; afterShot(0, 0); return; }
      const [r, c] = cell; ensureRow(r); G[r][c] = s.col; sfx.stick();
      const group = flood(r, c, (v) => v === s.col);
      if (group.length >= 3) {
        for (const [rr, cc] of group) { const p = pos(rr, cc); burst(p.x, p.y, G[rr][cc]); G[rr][cc] = null; }
        popped = group.length; sfx.pop(popped);
      }
    }
    if (popped) dropped = dropFloating();
    afterShot(popped, dropped);
  }
  function flood(r, c, ok) {
    const seen = new Set([r + "," + c]), out = [[r, c]], st = [[r, c]];
    while (st.length) {
      const [a, b] = st.pop();
      for (const [rr, cc] of neighbors(a, b)) {
        const k = rr + "," + cc, v = get(rr, cc);
        if (seen.has(k) || v == null || !ok(v)) continue;
        seen.add(k); out.push([rr, cc]); st.push([rr, cc]);
      }
    }
    return out;
  }
  function dropFloating() {
    const keep = new Set();
    const st = [];
    if (G.length) for (let c = 0; c < rowLen(0); c++) if (G[0][c] != null) { keep.add("0," + c); st.push([0, c]); }
    while (st.length) {
      const [a, b] = st.pop();
      for (const [rr, cc] of neighbors(a, b)) {
        const k = rr + "," + cc;
        if (keep.has(k) || get(rr, cc) == null) continue;
        keep.add(k); st.push([rr, cc]);
      }
    }
    let n = 0;
    for (let r = 0; r < G.length; r++) for (let c = 0; c < rowLen(r); c++) {
      if (G[r][c] != null && !keep.has(r + "," + c)) {
        const p = pos(r, c); falls.push({ x: p.x, y: p.y, vy: -1 - Math.random() * 2, vx: (Math.random() - 0.5) * 2, col: G[r][c] });
        G[r][c] = null; n++;
      }
    }
    if (n) sfx.drop(n);
    return n;
  }
  function afterShot(popped, dropped) {
    while (G.length && G[G.length - 1].every((v) => v == null)) G.pop();
    if (popped) {
      S.combo++;
      const pts = popped * 10 + dropped * 30 + (S.combo > 1 ? (S.combo - 1) * 20 : 0);
      S.score += pts;
      const sy = Math.min(DEAD - 20, R + (G.length) * D);
      texts.push({ x: W / 2, y: sy, t: 0, s: `+${pts}${dropped ? `  (${dropped} düştü)` : ""}${S.combo > 1 ? `  seri ×${S.combo}` : ""}` });
    } else {
      S.combo = 0; S.misses++;
      if (S.misses >= S.missLimit) { S.misses = 0; pushRow(); }
    }
    // eldeki renkler tahtada yoksa değiştir
    const p = present();
    if (p.length) {
      if (S.cur !== BOMB && !p.includes(S.cur)) S.cur = pickColor();
      if (S.next !== BOMB && !p.includes(S.next)) S.next = pickColor();
    }
    if (S.score > save.hi) { save.hi = S.score; persist(); }
    hud();
    if (!G.length || G.every((row) => row.every((v) => v == null))) return levelClear();
    if (lowest() > DEAD) return gameOver();
    const left = S.missLimit - S.misses;
    msg(left <= 2 ? `Dikkat! ${left} ıska sonra yeni sıra iniyor.` : "");
  }
  function lowest() {
    for (let r = G.length - 1; r >= 0; r--) if (G[r].some((v) => v != null)) return pos(r, 0).y + R;
    return 0;
  }
  function pushRow() {
    par ^= 1; G.unshift(null); G[0] = makeRow(0, S.ncol);
    sfx.row(); fx.push({ shake: true, t: 0 });
  }
  function levelClear() {
    const bonus = 300 + S.lv * 100 + Math.max(0, 40 - S.shots) * 10;
    S.score += bonus; if (S.score > save.hi) { save.hi = S.score; persist(); }
    hud(); sfx.win(); S.clearing = 1;
    msg(`Tahta temizlendi! +${bonus} bonus. Sonraki bölüm geliyor…`);
    texts.push({ x: W / 2, y: H / 2, t: 0, s: `Bölüm ${S.lv} tamam! +${bonus}`, big: true });
    setTimeout(() => { if (S && S.clearing) { S.shots = 0; startLevel(S.lv + 1); } }, 1800);
  }
  function gameOver() {
    S.over = true; sfx.over();
    const rec = S.score >= save.hi && S.score > 0;
    msg("Balonlar çizgiye ulaştı!");
    setTimeout(() => {
      $("m-title").textContent = rec ? "🏆 Yeni rekor!" : "Oyun bitti";
      $("m-tx").innerHTML = `Bölüm <b>${S.lv}</b>, puan <b>${S.score}</b>. Rekor: <b>${save.hi}</b>. Bir daha dene: düşürmek, patlatmaktan çok daha fazla puan getirir!`;
      $("start").textContent = "Yeniden oyna"; $("resume").hidden = true; $("menu").hidden = false;
    }, 900);
  }
  function burst(x, y, col) {
    for (let i = 0; i < 6; i++) { const a = Math.random() * Math.PI * 2, v = 1 + Math.random() * 2.5; fx.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, col, t: 0 }); }
  }

  /* ---------- güncelleme ---------- */
  function step() {
    if (S && !paused && S.shot) moveShot();
    for (const f of fx) { f.t++; if (f.vx != null) { f.x += f.vx; f.y += f.vy; } }
    fx = fx.filter((f) => f.t < (f.ring ? 22 : f.shake ? 14 : 26));
    for (const f of falls) { f.vy += 0.35; f.y += f.vy; f.x += f.vx; }
    falls = falls.filter((f) => f.y < H + R);
    for (const t of texts) t.t++;
    texts = texts.filter((t) => t.t < (t.big ? 100 : 60));
  }
  function guide() {
    const pts = [], max = DIFF[S.df].guide;
    let x = LX, y = LY, vx = Math.cos(aim) * 4, vy = -Math.sin(aim) * 4, len = 0;
    while (len < max) {
      x += vx; y += vy; len += 4;
      if (x < R) { x = 2 * R - x; vx = -vx; }
      if (x > W - R) { x = 2 * (W - R) - x; vx = -vx; }
      if (hitTest(x, y)) break;
      if (len % 16 === 0) pts.push([x, y]);
    }
    return pts;
  }

  /* ---------- çizim ---------- */
  function bubble(x, y, col, r, alpha) {
    ctx.globalAlpha = alpha == null ? 1 : alpha;
    if (col === BOMB) {
      ctx.fillStyle = "#2B2B3A"; ctx.beginPath(); ctx.arc(x, y, r, 0, 7); ctx.fill();
      ctx.strokeStyle = "#FFD166"; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(x + r * .4, y - r * .7); ctx.quadraticCurveTo(x + r * .9, y - r * 1.3, x + r * 1.1, y - r * .9); ctx.stroke();
      ctx.fillStyle = "#FF9F43"; ctx.beginPath(); ctx.arc(x + r * 1.1, y - r * .9, 3.5, 0, 7); ctx.fill();
      ctx.fillStyle = "rgba(255,255,255,.35)"; ctx.beginPath(); ctx.arc(x - r * .35, y - r * .35, r * .3, 0, 7); ctx.fill();
      ctx.globalAlpha = 1; return;
    }
    const g = ctx.createRadialGradient(x - r * .35, y - r * .4, r * .15, x, y, r);
    g.addColorStop(0, "#fff"); g.addColorStop(0.25, COLORS[col]); g.addColorStop(1, DARK[col]);
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, r - 0.5, 0, 7); ctx.fill();
    // renk körlüğü için küçük işaret
    ctx.fillStyle = "rgba(255,255,255,.55)"; ctx.strokeStyle = "rgba(255,255,255,.55)"; ctx.lineWidth = 2.2;
    const k = r * 0.32; ctx.beginPath();
    switch (col) {
      case 0: ctx.arc(x, y + 2, k * .8, 0, 7); ctx.fill(); break;
      case 1: ctx.moveTo(x, y - k + 2); ctx.lineTo(x + k, y + k + 2); ctx.lineTo(x - k, y + k + 2); ctx.closePath(); ctx.fill(); break;
      case 2: ctx.rect(x - k * .8, y - k * .8 + 2, k * 1.6, k * 1.6); ctx.fill(); break;
      case 3: ctx.moveTo(x, y - k + 2); ctx.lineTo(x + k, y + 2); ctx.lineTo(x, y + k + 2); ctx.lineTo(x - k, y + 2); ctx.closePath(); ctx.fill(); break;
      case 4: ctx.moveTo(x - k, y + 2); ctx.lineTo(x + k, y + 2); ctx.moveTo(x, y - k + 2); ctx.lineTo(x, y + k + 2); ctx.stroke(); break;
      default: ctx.arc(x, y + 2, k * .85, 0, 7); ctx.stroke();
    }
    ctx.globalAlpha = 1;
  }
  function draw() {
    ctx.save();
    const sh = fx.find((f) => f.shake);
    if (sh) ctx.translate(0, Math.sin(sh.t * 1.6) * (14 - sh.t) * 0.4);
    ctx.fillStyle = "#1A1440"; ctx.fillRect(0, 0, W, H);
    // yıldızlar
    ctx.fillStyle = "rgba(255,255,255,.08)";
    for (let i = 0; i < 30; i++) ctx.fillRect((i * 97) % W, (i * 53) % H, 2, 2);
    // ölüm çizgisi
    ctx.strokeStyle = "rgba(255,90,95,.55)"; ctx.setLineDash([8, 8]); ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(0, DEAD); ctx.lineTo(W, DEAD); ctx.stroke(); ctx.setLineDash([]);
    if (!S) { ctx.restore(); return; }
    for (let r = 0; r < G.length; r++) for (let c = 0; c < rowLen(r); c++) if (G[r][c] != null) { const p = pos(r, c); bubble(p.x, p.y, G[r][c], R); }
    // kılavuz
    if (!S.over && !S.shot && !paused && !S.clearing) {
      ctx.fillStyle = "rgba(255,255,255,.55)";
      for (const [x, y] of guide()) { ctx.beginPath(); ctx.arc(x, y, 2.4, 0, 7); ctx.fill(); }
    }
    // fırlatıcı
    ctx.save(); ctx.translate(LX, LY); ctx.rotate(-aim + Math.PI / 2);
    ctx.fillStyle = "#3A2F7A"; ctx.beginPath(); ctx.moveTo(-9, 0); ctx.lineTo(-6, -40); ctx.lineTo(6, -40); ctx.lineTo(9, 0); ctx.fill();
    ctx.restore();
    ctx.fillStyle = "#2C2266"; ctx.beginPath(); ctx.arc(LX, LY, R + 8, 0, 7); ctx.fill();
    if (!S.shot || true) bubble(LX, LY, S.cur, R);
    // sıradaki
    const nx = LX - 92, ny = LY - 4;
    ctx.fillStyle = "rgba(255,255,255,.12)"; ctx.beginPath(); ctx.arc(nx, ny, R + 3, 0, 7); ctx.fill();
    bubble(nx, ny, S.next, R * .78);
    ctx.fillStyle = "rgba(232,237,255,.6)"; ctx.font = "600 11px Rubik, sans-serif"; ctx.textAlign = "center";
    ctx.fillText("sıradaki ⇄", nx, ny + R + 12);
    // ıska göstergesi
    ctx.textAlign = "right"; ctx.fillText("yeni sıra", W - 14, LY - 14);
    for (let i = 0; i < S.missLimit; i++) {
      ctx.fillStyle = i < S.missLimit - S.misses ? "#FFD166" : "rgba(255,255,255,.15)";
      ctx.beginPath(); ctx.arc(W - 18 - i * 12, LY + 2, 4, 0, 7); ctx.fill();
    }
    if (S.shot) bubble(S.shot.x, S.shot.y, S.shot.col, R);
    for (const f of falls) bubble(f.x, f.y, f.col, R, 0.9);
    for (const f of fx) {
      if (f.ring) { ctx.strokeStyle = `rgba(255,209,102,${1 - f.t / 22})`; ctx.lineWidth = 5; ctx.beginPath(); ctx.arc(f.x, f.y, 10 + f.t * 4, 0, 7); ctx.stroke(); }
      else if (f.vx != null) { ctx.globalAlpha = 1 - f.t / 26; ctx.fillStyle = COLORS[f.col] || "#fff"; ctx.beginPath(); ctx.arc(f.x, f.y, 4, 0, 7); ctx.fill(); ctx.globalAlpha = 1; }
    }
    for (const t of texts) {
      ctx.globalAlpha = Math.max(0, 1 - t.t / (t.big ? 100 : 60)); ctx.fillStyle = t.big ? "#FFD166" : "#fff";
      ctx.font = `800 ${t.big ? 26 : 16}px Rubik, sans-serif`; ctx.textAlign = "center";
      ctx.fillText(t.s, t.x, t.y - t.t * 0.6); ctx.globalAlpha = 1;
    }
    ctx.restore();
  }
  let last = 0, acc = 0;
  function loop(ts) {
    const dt = Math.min(100, ts - (last || ts)); last = ts; acc += dt;
    while (acc >= 1000 / 60) { step(); acc -= 1000 / 60; }
    draw(); requestAnimationFrame(loop);
  }

  /* ---------- giriş ---------- */
  function toCanvas(e) { const b = cv.getBoundingClientRect(); return { x: (e.clientX - b.left) * W / b.width, y: (e.clientY - b.top) * H / b.height }; }
  let downSwap = false, aiming = false;
  cv.addEventListener("pointerdown", (e) => {
    audio(); const p = toCanvas(e);
    if (S && Math.hypot(p.x - (LX - 92), p.y - (LY - 4)) < R + 14) { downSwap = true; return; }
    aiming = true; cv.setPointerCapture(e.pointerId);
    if (p.y < LY - 8) aim = clampAim(Math.atan2(LY - p.y, p.x - LX));
  });
  cv.addEventListener("pointermove", (e) => {
    const p = toCanvas(e);
    if ((aiming || e.pointerType === "mouse") && p.y < LY - 8) aim = clampAim(Math.atan2(LY - p.y, p.x - LX));
  });
  cv.addEventListener("pointerup", (e) => {
    const p = toCanvas(e);
    if (downSwap) { downSwap = false; if (Math.hypot(p.x - (LX - 92), p.y - (LY - 4)) < R + 14) swap(); return; }
    if (aiming) { aiming = false; if (p.y < LY - 8) shoot(); }
  });
  cv.addEventListener("pointercancel", () => { aiming = false; downSwap = false; });
  document.addEventListener("keydown", (e) => {
    if (!$("menu").hidden) return;
    if (e.key === "ArrowLeft") { aim = clampAim(aim + 0.04); e.preventDefault(); }
    else if (e.key === "ArrowRight") { aim = clampAim(aim - 0.04); e.preventDefault(); }
    else if (e.key === " " || e.key === "ArrowUp") { audio(); shoot(); e.preventDefault(); }
    else if (e.key === "c" || e.key === "C") swap();
    else if (e.key === "Escape") openMenu();
  });
  function openMenu() {
    if (S && !S.over) { paused = true; $("resume").hidden = false; $("m-title").textContent = "⏸ Ara"; }
    $("menu").hidden = false;
  }
  $("open-menu").addEventListener("click", openMenu);
  $("resume").addEventListener("click", () => { $("menu").hidden = true; paused = false; });
  const form = document.querySelectorAll('input[name="df"]');
  form.forEach((i) => { if (+i.value === save.df) i.checked = true; });
  $("start").addEventListener("click", () => {
    audio();
    const df = +document.querySelector('input[name="df"]:checked').value;
    save.df = df; persist();
    $("menu").hidden = true; $("start").textContent = "Yeni oyun";
    newGame(df);
  });
  document.addEventListener("visibilitychange", () => { if (document.hidden && S && !S.over && !paused) openMenu(); });

  hud(); requestAnimationFrame(loop);

  window.__ba = {
    newGame, shoot, swap, step, pushRow, startLevel,
    setAim(a) { aim = clampAim(a); }, get aim() { return aim; },
    get S() { return S; }, get G() { return G; }, set G(v) { G = v; }, get par() { return par; },
    pos, neighbors, present, lowest, flood,
    land(a) { // atış yapmadan balonun konacağı hücre
      let x = LX, y = LY, vx = Math.cos(a) * SPEED / 5, vy = -Math.sin(a) * SPEED / 5;
      for (let i = 0; i < 4000; i++) {
        x += vx; y += vy;
        if (x < R) { x = 2 * R - x; vx = -vx; }
        if (x > W - R) { x = 2 * (W - R) - x; vx = -vx; }
        if (hitTest(x, y)) return bestCell(x, y);
      }
      return null;
    },
    fire(a) { aim = clampAim(a); if (!shoot()) return false; let n = 0; while (S.shot && n++ < 400) step(); return true; }
  };
})();
