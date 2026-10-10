(() => {
  "use strict";
  const $ = id => document.getElementById(id);

  /* ---------- labirentler ----------
     Sol yarı (10 sütun, 9. sütun orta) yazılır, sağ yarı aynalanır.
     # duvar  . enerji  o kristal  boşluk = boş yol  - ev kapısı  H ev  P robotun başladığı yer
     Kenara değen boş yol satırı tüneldir (öbür taraftan çıkılır). */
  const HALVES = [
    ["##########",
     "#........#",
     "#o##.###.#",
     "#.........",
     "#.##.#.###",
     "#....#...#",
     "####.###.#",
     "####.#....",
     "####.#.##-",
     "     . #HH",
     "####.#.###",
     "####.#....",
     "####.#.###",
     "#........#",
     "#.##.###.#",
     "#o.#.....P",
     "##.#.#.###",
     "#....#...#",
     "#.######.#",
     "#.........",
     "##########"],
    ["##########",
     "#....#....",
     "#o##.#.##.",
     "#.........",
     "#.##.####.",
     "#....#....",
     "####.#.###",
     "####.#....",
     "####.#.##-",
     "     . #HH",
     "####.#.###",
     "####...#..",
     "####.###.#",
     "#.........",
     "#.##.#.###",
     "#o.#.#...P",
     "##.#.#.#.#",
     "#....#....",
     "#.######.#",
     "#.........",
     "##########"]
  ];
  const MAZES = HALVES.map(h => h.map(row => row + [...row.slice(0, 9)].reverse().join("")));
  const COLS = 19, ROWS = 21, TS = 24, HUD = 40;
  const W = COLS * TS, H = ROWS * TS + HUD;
  const DIRS = {up: {x: 0, y: -1}, down: {x: 0, y: 1}, left: {x: -1, y: 0}, right: {x: 1, y: 0}};
  const DLIST = [DIRS.up, DIRS.left, DIRS.down, DIRS.right];        // eşitlikte bu sıra
  const EXIT = {x: 9, y: 7}, HOME = {x: 9, y: 9};
  const ENEMIES = [
    {nm: "Kızıl", c: "#FF4D5E", corner: {x: 17, y: -2}},
    {nm: "Pembe", c: "#FF8FD6", corner: {x: 1, y: -2}},
    {nm: "Turkuaz", c: "#3DE0F0", corner: {x: 18, y: 22}},
    {nm: "Turuncu", c: "#FFA23D", corner: {x: 0, y: 22}}
  ];
  const MODES = [["scatter", 7], ["chase", 20], ["scatter", 7], ["chase", 20], ["scatter", 5], ["chase", Infinity]];
  const SAVE_KEY = "robo-labirent";

  let save = {best: 0, maxLevel: 1};
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
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + .005); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(a.destination); o.start(t); o.stop(t + dur + .05);
  }
  let chirp = 0;
  const sDot = () => { chirp = 1 - chirp; tone(chirp ? 660 : 520, chirp ? 700 : 560, "square", .045, .035); };
  const sPower = () => [300, 450, 600, 900].forEach((f, k) => tone(f, f, "triangle", .1, .1, k * .05));
  const sEat = n => tone(400 + n * 200, 1200 + n * 200, "sawtooth", .22, .08);
  const sDie = () => [700, 560, 440, 330, 220].forEach((f, k) => tone(f, f * .9, "square", .14, .07, k * .12));
  const sClear = () => [523, 659, 784, 1047, 1319].forEach((f, k) => tone(f, f, "triangle", .2, .12, k * .08));
  function renderSound(){
    $("ic-on").hidden = !soundOn; $("ic-off").hidden = soundOn;
    $("sound").setAttribute("aria-label", soundOn ? "Sesi kapat" : "Sesi aç");
    $("sound").setAttribute("aria-pressed", String(soundOn));
  }
  $("sound").addEventListener("click", () => { soundOn = !soundOn; renderSound(); });
  renderSound();

  /* ---------- ızgara ---------- */
  const wrapX = x => (x + COLS) % COLS;
  function cell(G, x, y){ if (y < 0 || y >= ROWS) return "#"; return G.grid[y][wrapX(x)]; }
  function open(G, x, y, special){
    const c = cell(G, x, y);
    if (c === "#") return false;
    if (c === "-" || c === "H") return !!special;
    return true;
  }
  // hedefe olan yol uzaklıkları (ev ve kapı dahil)
  function bfs(G, from){
    const d = Array.from({length: ROWS}, () => new Array(COLS).fill(Infinity));
    d[from.y][from.x] = 0; const q = [from];
    while (q.length){
      const p = q.shift();
      for (const v of DLIST){
        const nx = wrapX(p.x + v.x), ny = p.y + v.y;
        if (!open(G, nx, ny, true) || d[ny][nx] !== Infinity) continue;
        d[ny][nx] = d[p.y][p.x] + 1; q.push({x: nx, y: ny});
      }
    }
    return d;
  }

  /* ---------- durum ---------- */
  let G = null;
  function newGame(){
    G = {score: 0, lives: 3, level: 1, extra: false, paused: false, over: false};
    startLevel();
  }
  function startLevel(){
    const m = MAZES[(G.level - 1) % MAZES.length];
    G.grid = m.map(r => r.split(""));
    G.dots = 0;
    for (let y = 0; y < ROWS; y++) for (let x = 0; x < COLS; x++){
      if (G.grid[y][x] === "P"){ G.start = {x, y}; G.grid[y][x] = " "; }
      if (G.grid[y][x] === "." || G.grid[y][x] === "o") G.dots++;
    }
    G.toHome = bfs(G, HOME); G.toExit = bfs(G, EXIT);
    resetActors();
    G.flash = 0;
  }
  const speedP = () => Math.min(9, 7 + .3 * (G.level - 1));
  const speedE = () => Math.min(9, 6 + .4 * (G.level - 1));
  const frightTime = () => Math.max(2, 7 - (G.level - 1));

  function resetActors(){
    G.p = {x: G.start.x, y: G.start.y, d: {x: 0, y: 0}, p: 0, want: DIRS.left, dead: 0};
    const rel = [0, 2, 6, 10].map(t => Math.max(0, t - (G.level - 1)));
    G.e = ENEMIES.map((E, i) => ({
      i, x: i === 0 ? EXIT.x : 8 + (i - 1), y: i === 0 ? EXIT.y : HOME.y, d: i === 0 ? DIRS.left : {x: 0, y: 0}, p: 0,
      state: i === 0 ? "roam" : "house", release: rel[i], fright: 0, bob: i
    }));
    G.mode = 0; G.modeT = MODES[0][1]; G.chain = 0; G.ready = 2; G.t = 0; G.pops = [];
  }
  const modeName = () => MODES[G.mode][0];

  /* ---------- hareket ---------- */
  // varlık (x, y) karesinden d yönünde p kadar ilerlemiş durumda
  function posOf(a){ return {x: a.x + a.d.x * a.p, y: a.y + a.d.y * a.p}; }
  function stepActor(a, speed, dt, onCenter){
    if (a.d.x === 0 && a.d.y === 0){ onCenter(a); return; }
    a.p += speed * dt;
    while (a.p >= 1){
      a.p -= 1; a.x = wrapX(a.x + a.d.x); a.y += a.d.y;
      onCenter(a);
      if (a.d.x === 0 && a.d.y === 0){ a.p = 0; break; }
    }
  }
  const same = (u, v) => u.x === v.x && u.y === v.y;
  const rev = d => ({x: -d.x, y: -d.y});

  function playerCenter(a){
    // karenin ortasında: enerji topla, sonra istenen yöne dön
    const c = G.grid[a.y][a.x];
    if (c === "." || c === "o"){
      G.grid[a.y][a.x] = " "; G.dots--;
      if (c === "."){ addScore(10); sDot(); }
      else { addScore(50); sPower(); frighten(); }
      if (G.dots === 0){ levelClear(); return; }
    }
    if (a.want && open(G, a.x + a.want.x, a.y + a.want.y)) a.d = a.want;
    else if (!open(G, a.x + a.d.x, a.y + a.d.y)) a.d = {x: 0, y: 0};
  }
  function setWant(d){
    if (!G || G.over) return;
    const a = G.p; a.want = d;
    // geri dönüş anında olur
    if (a.d.x === -d.x && a.d.y === -d.y && (d.x || d.y) && a.p > 0){ a.x = wrapX(a.x + a.d.x); a.y += a.d.y; a.p = 1 - a.p; a.d = d; }
  }

  function enemyTarget(e){
    const P = G.p, pd = P.d.x || P.d.y ? P.d : (P.want || DIRS.left);
    if (modeName() === "scatter") return ENEMIES[e.i].corner;
    if (e.i === 0) return {x: P.x, y: P.y};
    if (e.i === 1) return {x: P.x + pd.x * 4, y: P.y + pd.y * 4};
    if (e.i === 2){ const a = G.e[0], px = P.x + pd.x * 2, py = P.y + pd.y * 2; return {x: px * 2 - a.x, y: py * 2 - a.y}; }
    const dd = Math.hypot(P.x - e.x, P.y - e.y);
    return dd > 8 ? {x: P.x, y: P.y} : ENEMIES[3].corner;
  }
  function enemyCenter(e){
    if (e.state === "leave"){
      if (same(e, EXIT)){ e.state = "roam"; e.d = DIRS.left; }
      else { e.d = downhill(e, G.toExit); return; }
    }
    if (e.state === "eyes"){
      if (same(e, HOME)){ e.state = "house"; e.release = 1.2; e.d = {x: 0, y: 0}; e.fright = 0; return; }
      e.d = downhill(e, G.toHome); return;
    }
    // serbest dolaşma: geri dönmeden, hedefe en yakın yön
    const opts = DLIST.filter(v => !(v.x === -e.d.x && v.y === -e.d.y) && open(G, e.x + v.x, e.y + v.y));
    if (!opts.length){ e.d = rev(e.d); return; }
    if (e.fright > 0){ e.d = opts[Math.random() * opts.length | 0]; return; }
    const t = enemyTarget(e);
    let best = opts[0], bd = Infinity;
    for (const v of opts){ const nx = e.x + v.x, ny = e.y + v.y, d = (nx - t.x) ** 2 + (ny - t.y) ** 2; if (d < bd){ bd = d; best = v; } }
    e.d = best;
  }
  function downhill(e, dist){
    let best = null, bd = dist[e.y][e.x];
    for (const v of DLIST){
      const nx = wrapX(e.x + v.x), ny = e.y + v.y;
      if (ny < 0 || ny >= ROWS || !open(G, nx, ny, true)) continue;
      if (dist[ny][nx] < bd){ bd = dist[ny][nx]; best = v; }
    }
    return best || {x: 0, y: 0};
  }

  function frighten(){
    G.chain = 0;
    for (const e of G.e) if (e.state === "roam"){ e.fright = frightTime(); e.d = rev(e.d.x || e.d.y ? e.d : DIRS.left); e.p = e.p ? 1 - e.p : 0; if (e.p){ e.x = wrapX(e.x - e.d.x); e.y -= e.d.y; } }
  }
  function addScore(n){
    G.score += n;
    if (!G.extra && G.score >= 10000){ G.extra = true; G.lives++; sClear(); }
    if (G.score > save.best){ save.best = G.score; }
  }
  function levelClear(){
    sClear(); G.flash = 1.6; G.ready = 99;
    if (G.level + 1 > save.maxLevel) save.maxLevel = G.level + 1;
    store();
  }
  function die(){
    sDie(); G.p.dead = 1.4; G.ready = 99;
  }

  /* ---------- güncelle ---------- */
  function update(dt){
    if (!G || G.paused || G.over) return;
    G.t += dt;
    for (const pp of G.pops) pp.life -= dt;
    G.pops = G.pops.filter(pp => pp.life > 0);
    if (G.flash > 0){ G.flash -= dt; if (G.flash <= 0){ G.level++; startLevel(); } return; }
    if (G.p.dead > 0){
      G.p.dead -= dt;
      if (G.p.dead <= 0){
        G.lives--;
        if (G.lives <= 0){ gameOver(); return; }
        resetActors();
      }
      return;
    }
    if (G.ready > 0){ G.ready -= dt; return; }
    // mod değişimi (korku sırasında saat durur)
    if (!G.e.some(e => e.fright > 0)){
      G.modeT -= dt;
      if (G.modeT <= 0 && G.mode < MODES.length - 1){
        G.mode++; G.modeT = MODES[G.mode][1];
        for (const e of G.e) if (e.state === "roam"){ e.d = rev(e.d); if (e.p){ e.x = wrapX(e.x - e.d.x); e.y -= e.d.y; e.p = 1 - e.p; } }
      }
    }
    stepActor(G.p, speedP(), dt, playerCenter);
    if (G.flash > 0) return;
    for (const e of G.e){
      if (e.state === "house"){
        e.release -= dt;
        if (e.release <= 0){ e.state = "leave"; e.p = 0; e.d = downhill(e, G.toExit); }
        continue;
      }
      if (e.fright > 0) e.fright = Math.max(0, e.fright - dt);
      const sp = e.state === "eyes" ? 14 : e.fright > 0 ? 4.4 : (e.state === "leave" ? 4 : (tunnel(e) ? speedE() * .55 : speedE()));
      stepActor(e, sp, dt, enemyCenter);
    }
    // çarpışma
    const pp = posOf(G.p);
    for (const e of G.e){
      if (e.state !== "roam") continue;
      const ep = posOf(e);
      let dx = Math.abs(pp.x - ep.x); dx = Math.min(dx, COLS - dx);
      if (dx < .6 && Math.abs(pp.y - ep.y) < .6){
        if (e.fright > 0){
          G.chain++; const pts = 200 * 2 ** (G.chain - 1);
          addScore(pts); sEat(G.chain);
          G.pops.push({x: ep.x, y: ep.y, text: pts, life: 1});
          e.state = "eyes"; e.fright = 0;
          e.x = Math.round(ep.x); e.y = Math.round(ep.y); e.p = 0; e.d = {x: 0, y: 0}; enemyCenter(e);
        } else { die(); return; }
      }
    }
  }
  const tunnel = e => e.y === 9 && (e.x <= 4 || e.x >= COLS - 5);

  function gameOver(){
    G.over = true; store();
    $("start-title").textContent = "Oyun bitti!";
    $("start-text").innerHTML = `Skorun: <b>${G.score}</b> · ${G.level}. bölüm.`;
    $("start-best").textContent = `🏆 En yüksek skor: ${save.best} · en uzak bölüm: ${save.maxLevel}`;
    $("go").textContent = "Tekrar oyna";
    $("start").hidden = false; $("go").focus();
  }

  /* ---------- çizim ---------- */
  const cv = $("cv"), stage = $("stage"), ctx = cv.getContext("2d");
  let view = {s: 1, ox: 0, oy: 0, dpr: 1};
  function resize(){
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const cw = stage.clientWidth, ch = stage.clientHeight;
    cv.width = Math.round(cw * dpr); cv.height = Math.round(ch * dpr);
    const s = Math.min(cw / W, ch / H);
    view = {s, ox: (cw - W * s) / 2, oy: (ch - H * s) / 2, dpr};
  }
  const cx = x => x * TS + TS / 2, cy = y => HUD + y * TS + TS / 2;
  function drawMaze(){
    const flash = G.flash > 0 && Math.floor(G.flash * 6) % 2 === 0;
    ctx.strokeStyle = flash ? "#FFFFFF" : "#3C6BFF"; ctx.lineWidth = 3; ctx.lineCap = "round";
    ctx.fillStyle = "rgba(60,107,255,.12)";
    for (let y = 0; y < ROWS; y++) for (let x = 0; x < COLS; x++){
      if (G.grid[y][x] !== "#") continue;
      ctx.fillRect(x * TS, HUD + y * TS, TS, TS);
      const wallAt = (dx, dy) => { const yy = y + dy, xx = x + dx; return yy < 0 || yy >= ROWS || xx < 0 || xx >= COLS || G.grid[yy][xx] === "#"; };
      const X = x * TS, Y = HUD + y * TS;
      ctx.beginPath();
      if (!wallAt(0, -1)){ ctx.moveTo(X, Y + 1); ctx.lineTo(X + TS, Y + 1); }
      if (!wallAt(0, 1)){ ctx.moveTo(X, Y + TS - 1); ctx.lineTo(X + TS, Y + TS - 1); }
      if (!wallAt(-1, 0)){ ctx.moveTo(X + 1, Y); ctx.lineTo(X + 1, Y + TS); }
      if (!wallAt(1, 0)){ ctx.moveTo(X + TS - 1, Y); ctx.lineTo(X + TS - 1, Y + TS); }
      ctx.stroke();
    }
    // ev kapısı
    for (let y = 0; y < ROWS; y++) for (let x = 0; x < COLS; x++) if (G.grid[y][x] === "-"){ ctx.fillStyle = "#FF8FD6"; ctx.fillRect(x * TS, HUD + y * TS + TS / 2 - 2, TS, 4); }
    // enerji ve kristaller
    for (let y = 0; y < ROWS; y++) for (let x = 0; x < COLS; x++){
      const c = G.grid[y][x];
      if (c === "."){ ctx.fillStyle = "#FFE7A8"; ctx.beginPath(); ctx.arc(cx(x), cy(y), 2.6, 0, Math.PI * 2); ctx.fill(); }
      if (c === "o" && Math.sin(G.t * 8) > -.4){
        ctx.fillStyle = "#7DF9FF"; ctx.beginPath();
        ctx.moveTo(cx(x), cy(y) - 9); ctx.lineTo(cx(x) + 7, cy(y)); ctx.lineTo(cx(x), cy(y) + 9); ctx.lineTo(cx(x) - 7, cy(y)); ctx.closePath(); ctx.fill();
      }
    }
  }
  function drawPlayer(){
    const a = G.p, p = posOf(a), x = cx(p.x), y = cy(p.y);
    const k = a.dead > 0 ? Math.max(0, a.dead / 1.4) : 1;
    ctx.save(); ctx.translate(x, y); ctx.scale(k, k); if (a.dead > 0) ctx.rotate((1 - k) * 8);
    ctx.fillStyle = "#37E2B4"; ctx.beginPath(); ctx.arc(0, 1, 10, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = "#FFD166"; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(0, -8); ctx.lineTo(0, -14); ctx.stroke();
    ctx.fillStyle = "#FFD166"; ctx.beginPath(); ctx.arc(0, -14, 2.6, 0, Math.PI * 2); ctx.fill();
    const d = a.d.x || a.d.y ? a.d : a.want || DIRS.left;
    ctx.fillStyle = "#0B1026"; ctx.beginPath(); ctx.roundRect(-7 + d.x * 3, -3 + d.y * 3, 14, 6, 3); ctx.fill();
    ctx.fillStyle = "#7DF9FF"; ctx.fillRect(-4 + d.x * 4, -1 + d.y * 3, 2.5, 2.5); ctx.fillRect(2 + d.x * 4, -1 + d.y * 3, 2.5, 2.5);
    ctx.restore();
  }
  function drawEnemy(e){
    const p = e.state === "house" ? {x: e.x, y: e.y + Math.sin(G.t * 5 + e.bob) * .2} : posOf(e), x = cx(p.x), y = cy(p.y);
    const fr = e.fright > 0, blink = fr && e.fright < 1.6 && Math.floor(G.t * 8) % 2 === 0;
    if (e.state !== "eyes"){
      ctx.fillStyle = fr ? (blink ? "#FFFFFF" : "#3C46FF") : ENEMIES[e.i].c;
      ctx.beginPath();
      for (let k = 0; k < 12; k++){                       // dikenli virüs gövdesi
        const a = k / 12 * Math.PI * 2 + G.t * 2, r = k % 2 ? 9 : 11.5;
        ctx.lineTo(x + Math.cos(a) * r, y + Math.sin(a) * r);
      }
      ctx.closePath(); ctx.fill();
    }
    const d = e.d.x || e.d.y ? e.d : {x: 0, y: 0};
    for (const s of [-1, 1]){
      ctx.fillStyle = "#fff"; ctx.beginPath(); ctx.arc(x + s * 4, y - 2, 3.4, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = fr && !blink ? "#FFD166" : "#0B1026"; ctx.beginPath(); ctx.arc(x + s * 4 + d.x * 1.4, y - 2 + d.y * 1.4, 1.7, 0, Math.PI * 2); ctx.fill();
    }
  }
  function drawHud(){
    ctx.fillStyle = "#EAF2FF"; ctx.font = "800 17px Rubik, sans-serif"; ctx.textBaseline = "middle";
    ctx.textAlign = "left"; ctx.fillText(`${G.score}`, 8, 20);
    ctx.textAlign = "center"; ctx.fillStyle = "#8E9CC4"; ctx.font = "700 14px Rubik, sans-serif";
    ctx.fillText(`🏆 ${save.best} · ${G.level}. bölüm`, W / 2, 20);
    ctx.textAlign = "right"; ctx.fillStyle = "#37E2B4";
    for (let i = 0; i < G.lives; i++){ ctx.beginPath(); ctx.arc(W - 12 - i * 22, 20, 7, 0, Math.PI * 2); ctx.fill(); }
  }
  function draw(){
    const {s, ox, oy, dpr} = view;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, cv.width, cv.height);
    ctx.setTransform(dpr * s, 0, 0, dpr * s, dpr * ox, dpr * oy);
    if (!G) return;
    drawHud(); drawMaze();
    for (const e of G.e) drawEnemy(e);
    drawPlayer();
    ctx.textAlign = "center"; ctx.textBaseline = "middle";
    for (const pp of G.pops){ ctx.globalAlpha = Math.min(1, pp.life * 2); ctx.fillStyle = "#7DF9FF"; ctx.font = "800 14px Rubik, sans-serif"; ctx.fillText(pp.text, cx(pp.x), cy(pp.y) - (1 - pp.life) * 14); }
    ctx.globalAlpha = 1;
    if (G.ready > 0 && G.ready < 50 && !G.over){ ctx.fillStyle = "#FFD166"; ctx.font = "800 22px Rubik, sans-serif"; ctx.fillText("HAZIR!", cx(9), cy(11) + 1); }
    if (G.paused){ ctx.fillStyle = "rgba(5,8,20,.6)"; ctx.fillRect(0, 0, W, H); ctx.fillStyle = "#fff"; ctx.font = "800 28px Rubik, sans-serif"; ctx.fillText("Duraklatıldı", W / 2, H / 2); }
  }

  /* ---------- kontroller ---------- */
  const KEYS = {ArrowUp: "up", ArrowDown: "down", ArrowLeft: "left", ArrowRight: "right", KeyW: "up", KeyS: "down", KeyA: "left", KeyD: "right"};
  document.addEventListener("keydown", e => {
    if (KEYS[e.code]){ e.preventDefault(); setWant(DIRS[KEYS[e.code]]); }
    if (e.code === "KeyP" || e.code === "Escape") togglePause();
  });
  let sw = null;
  stage.addEventListener("pointerdown", e => { sw = {x: e.clientX, y: e.clientY, id: e.pointerId}; });
  stage.addEventListener("pointermove", e => {
    if (!sw || e.pointerId !== sw.id) return;
    const dx = e.clientX - sw.x, dy = e.clientY - sw.y;
    if (Math.hypot(dx, dy) > 22){ setWant(Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? DIRS.right : DIRS.left) : (dy > 0 ? DIRS.down : DIRS.up)); sw = {x: e.clientX, y: e.clientY, id: e.pointerId}; }
  });
  ["pointerup", "pointercancel"].forEach(ev => stage.addEventListener(ev, () => { sw = null; }));
  $("pad").querySelectorAll("button").forEach(b => b.addEventListener("pointerdown", e => { e.preventDefault(); audio(); setWant(DIRS[b.dataset.d]); }));
  function togglePause(){ if (!G || G.over) return; G.paused = !G.paused; $("pause").textContent = G.paused ? "▶" : "⏸"; }
  $("pause").addEventListener("click", togglePause);
  $("go").addEventListener("click", () => { audio(); $("start").hidden = true; newGame(); });
  $("start-best").textContent = save.best ? `🏆 En yüksek skor: ${save.best} · en uzak bölüm: ${save.maxLevel}` : "";

  let last = performance.now();
  function frame(now){
    const dt = Math.min(.033, (now - last) / 1000); last = now;
    update(dt); draw();
    requestAnimationFrame(frame);
  }
  document.addEventListener("visibilitychange", () => { last = performance.now(); if (document.hidden && G && !G.over && !G.paused) togglePause(); });
  if ("ResizeObserver" in window) new ResizeObserver(resize).observe(stage); else window.addEventListener("resize", resize);
  resize();
  requestAnimationFrame(frame);

  // testler için
  window.__robo = {MAZES, state: () => G, newGame, update, setWant, DIRS, bfs, open, startLevel, posOf, COLS, ROWS, EXIT, HOME};
})();
