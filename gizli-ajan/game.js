/* Gizli Ajan — Enes için sıra tabanlı gizlilik bulmacası (kurallar core.js'de) */
(() => {
  "use strict";
  const $ = (id) => document.getElementById(id);
  const SAVE_KEY = "gizli-ajan", W = 8, H = 10;
  // 23 bölüm: harita | robotlar (r xy yönler: dönen, p xy xy..: devriye) | en az adım — hepsi BFS ile doğrulandı
  const RAW = [
    "E..##..#......#.#.#.##.#....#..#.##...##..#...F#..*.....#...#....#.....#..#.S..#|r23LDRU|18",
    "...E##.#..##...*..#.......#...#......F##......#.............#.#.....##.##..*S...|r17LDRU|19",
    ".E.........*#....#.#....#.##.#..##.....*..#.F...*.#.......#........##..#.#.S....|r43LR|19",
    "##...E*..*#.#.#....##.#...........F#..............###......#...##...........#.S.|p12131415,p031323|18",
    "*..#E.#...#..#.........#.....#.*...#..#..F.####.......#.#.....#...###.#.....*S..|p0102,p374757|19",
    "..E......#....#.#.#......#....F......#.#..#.....#.....#...##.............#S.....|p4243444546,r45URDL|20",
    ".#.....E.........##..............#..##...#...F..*.#..##.#.......#..*.*..S......#|p6474,p2425|20",
    "..E#...#.....#..#..#......#....#.....#........F..........###...#..........S.#...|p465666,p3646566676|21",
    ".E.......##.........#....F#..*....#...#......#..##......##......#..#.#.........S|r37DU,p4647|21",
    ".E.#..#........#............#.F...#.....#.....###.*........#.........#....#.S...|r47URDL,p46566676|21",
    "#..E...#...#....#......###...##..#..##........#......*F#......#.###........S..#.|r55UD,p3233343536,p516171|22",
    "....###E##..........#....#.F.#...#...#.###.......##.#..#.........#.#..#..#.##.S.|p2425,p434445,r47URDL|22",
    "..#.E..#.....##...*.....#*..#...#.##..F.###..#...#......#...........##..S#......|r26RL,r71RL,r66LDRU|23",
    "...E......#.##..###..*..#....#....#....#....F...#..##....#..#.....#..#.#S.....#.|r25LDRU,r62UD,p6676|23",
    "..*..*E....##.........##......F....##............##.........#..#..#..#.##S#.*#..|p54555657,p060708,p1121|23",
    "..E#.............*...#......*.*.........#...F..#....#.#...##.###....#..##.S.....|r65UD,p5455,p2526|23",
    ".##*E..#...#...##...#..#..##.....#*..*.#.F.................#..#....#.#.....S....|p4445464748,r75LDRU,r65UD,p36465666|24",
    "..E....#.........#...........#.#.#.........##F.#...#...............#.#.##.S.....|r52RL,p04050607,r66LR|24",
    "E........##.#.....##.........#.*###.....#..F..#*.#...#.....#........#....#.#S...|r46RL,r01DU,p2627,r67LDRU|25",
    "...E......#..#.#....#...#......#.......#..##.#...#F..#..#.#...#....#...#..##S#..|p0506,p313233,r22UD,p33435363|25",
    "E.......#........##.....#**.#...#..F..#...#...###..#..###..##..#...##.#..S......|r17LR,p516171,p32425262|25",
    "..E...#..##..##........#...#..#...*.....#...F............#.##.....##........S#..|p5556,r23URDL,r52RL,r64LR|26",
    "..E..#..##...................#....#.#.....F.#........#.####.#.....#.....#.S.....|p2636,p6171,r12LDRU,p0405|26"
  ];
  const LEVELS = RAW.map((s) => {
    const [map, gs, par] = s.split("|");
    const guards = gs.split(",").map((g) => g[0] === "r" ? { t: "r", x: +g[1], y: +g[2], dirs: g.slice(3) } : { t: "p", path: g.slice(1).match(/../g).map((q) => [+q[0], +q[1]]) });
    return { lv: { w: W, h: H, map, guards }, par: +par };
  });

  let save = { stars: [], cur: 0 };
  try { save = Object.assign(save, JSON.parse(localStorage.getItem(SAVE_KEY) || "{}")); } catch (e) {}
  const persist = () => { try { localStorage.setItem(SAVE_KEY, JSON.stringify(save)); } catch (e) {} };

  /* ---------- ses ---------- */
  let AC = null;
  function audio() { try { AC = AC || new (window.AudioContext || window.webkitAudioContext)(); if (AC.state === "suspended") AC.resume(); } catch (e) {} }
  function tone(f, d, type, vol, delay) {
    if (!AC) return;
    const t = AC.currentTime + (delay || 0), o = AC.createOscillator(), g = AC.createGain();
    o.type = type || "triangle"; o.frequency.setValueAtTime(f, t);
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol || 0.05, t + 0.01); g.gain.exponentialRampToValueAtTime(0.0001, t + d);
    o.connect(g).connect(AC.destination); o.start(t); o.stop(t + d + 0.02);
  }

  /* ---------- durum ---------- */
  let L = 0, P = null, st = null, hist = [], over = false, won = false, hinted = false, peek = false, hintMove = null;
  const map = $("map"), cells = [];
  let agent = null, file = null, bots = [];
  function startLevel(i) {
    L = Math.max(0, Math.min(LEVELS.length - 1, i)); save.cur = L; persist();
    P = GA.parse(LEVELS[L].lv);
    st = { x: P.S[0], y: P.S[1], f: P.F ? 0 : 1, t: 0 };
    hist = []; over = false; won = false; hinted = false; hintMove = null;
    $("menu").hidden = true; $("win").hidden = true;
    build(); render();
    msg(L === 0 ? "Robotun kırmızı görüş alanına girme. Dosyayı al, kapıya git!" : "");
  }
  const pos = (x, y) => `translate(calc(var(--cs) * ${x}), calc(var(--cs) * ${y}))`;
  function build() {
    map.textContent = ""; cells.length = 0;
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const c = document.createElement("div"), v = P.cells[y * W + x];
      c.className = "cell " + (v === "#" ? "wall" : v === "*" ? "bush fl" : "fl");
      c.style.left = `calc(var(--cs) * ${x})`; c.style.top = `calc(var(--cs) * ${y})`;
      if (v === "*") c.textContent = "🌿";
      if (P.E[0] === x && P.E[1] === y) c.textContent = "🚪";
      c.addEventListener("click", () => { audio(); tapCell(x, y); });
      map.appendChild(c); cells.push(c);
    }
    file = null;
    if (P.F) { file = sprite("📁"); file.style.transform = pos(P.F[0], P.F[1]); }
    bots = P.guards.map(() => { const b = sprite("🤖"); const e = document.createElement("i"); e.className = "eye"; b.appendChild(e); return b; });
    agent = sprite("🕵️"); agent.classList.add("agent");
  }
  function sprite(e) { const s = document.createElement("div"); s.className = "sp"; s.textContent = e; map.appendChild(s); return s; }
  function render() {
    const cone = GA.cone(P, st.t), nxt = peek ? GA.cone(P, st.t + 1) : new Set();
    const adj = new Set();
    if (!over && !won) for (const m of ["U", "R", "D", "L"]) { const [dx, dy] = GA.DIRS[m]; if (!GA.wall(P, st.x + dx, st.y + dy)) adj.add((st.y + dy) * W + st.x + dx); }
    cells.forEach((c, i) => {
      c.classList.toggle("cone", cone.has(i)); c.classList.toggle("next", nxt.has(i)); c.classList.toggle("tgt", adj.has(i));
      c.classList.remove("hintc");
    });
    if (hintMove && !over && !won) { if (hintMove === "W") cells[st.y * W + st.x].classList.add("hintc"); else { const [dx, dy] = GA.DIRS[hintMove]; cells[(st.y + dy) * W + st.x + dx].classList.add("hintc"); } }
    P.guards.forEach((g, i) => {
      const s = GA.gstate(g, st.t), b = bots[i], [dx, dy] = GA.DIRS[s.d];
      b.style.transform = pos(s.x, s.y);
      const e = b.firstElementChild; e.style.left = `${35 + dx * 34}%`; e.style.top = `${35 + dy * 34}%`;
    });
    agent.style.transform = pos(st.x, st.y);
    agent.classList.toggle("hidden", P.cells[st.y * W + st.x] === "*");
    if (file) file.style.display = st.f ? "none" : "";
    $("lv").textContent = L + 1; $("mv").textContent = hist.length; $("par").textContent = LEVELS[L].par;
    $("fl").textContent = st.f ? "✔" : "yok"; $("filechip").hidden = !P.F;
  }
  function msg(t) { $("msg").textContent = t; }
  function move(m) {
    if (!P || over || won || !$("menu").hidden) return false;
    const r = GA.step(P, st, m);
    if (!r) { tone(150, 0.06, "sine", 0.04); return false; }
    hist.push(st); hintMove = null;
    const hadFile = st.f;
    st = { x: r.x, y: r.y, f: r.f, t: r.t };
    if (r.caught) {
      over = true; render();
      agent.classList.remove("caught"); void agent.offsetWidth; agent.classList.add("caught");
      tone(220, 0.25, "sawtooth", 0.06); tone(160, 0.35, "sawtooth", 0.06, 0.15);
      msg("Yakalandın! ↶ Geri al ya da ↺ baştan başla.");
      return true;
    }
    if (!hadFile && r.f) { tone(880, 0.08, "square", 0.04); tone(1175, 0.1, "square", 0.04, 0.07); msg("Dosya alındı! Şimdi çıkışa 🚪"); }
    else tone(m === "W" ? 300 : 420, 0.05, "triangle", 0.04);
    if (r.win) { won = true; render(); return win(), true; }
    if (P.E[0] === st.x && P.E[1] === st.y && !st.f) msg("Önce gizli dosyayı 📁 almalısın!");
    render();
    return true;
  }
  function tapCell(x, y) {
    if (x === st.x && y === st.y) return move("W");
    const dx = x - st.x, dy = y - st.y;
    if (Math.abs(dx) + Math.abs(dy) !== 1) return false;
    return move(dx === 1 ? "R" : dx === -1 ? "L" : dy === 1 ? "D" : "U");
  }
  function undo() {
    if (!hist.length || won) return;
    st = hist.pop(); over = false; hintMove = null; agent.classList.remove("caught");
    msg(""); render(); tone(250, 0.06, "sine", 0.05);
  }
  function hint() {
    if (over || won) { msg("Önce ↶ geri al."); return; }
    const p = GA.solve(P, st);
    if (!p) { msg("Buradan çıkış yok gibi, ↶ geri al ya da ↺ baştan başla."); return; }
    hinted = true; hintMove = p[0]; render();
    msg(hintMove === "W" ? "İpucu: bir adım bekle ⏳" : `İpucu: parlayan kareye git. Buradan ${p.length} adım.`);
  }
  function win() {
    const par = LEVELS[L].par, n = hist.length;
    let s = n <= par ? 3 : n <= par + 4 ? 2 : 1; if (hinted) s = Math.min(s, 2);
    save.stars[L] = Math.max(save.stars[L] || 0, s); persist(); renderLevels();
    [523, 659, 784, 1046].forEach((f, i) => tone(f, 0.18, "triangle", 0.07, i * 0.1));
    $("stars").textContent = "⭐".repeat(s) + "☆".repeat(3 - s);
    $("w-title").textContent = L === LEVELS.length - 1 ? "Bütün görevler tamam, Ajan! 🏆" : "Görev tamam!";
    $("w-tx").textContent = `${n} adımda kaçtın (en az ${par}).${s < 3 ? (hinted ? " İpucusuz dene: üç yıldız!" : ` ${par} adımda bitirirsen üç yıldız!`) : " Kusursuz!"}`;
    $("next").hidden = L === LEVELS.length - 1;
    setTimeout(() => { $("win").hidden = false; ($("next").hidden ? $("replay") : $("next")).focus(); }, 700);
  }

  /* ---------- girdi ---------- */
  const KEYS = { arrowup: "U", w: "U", arrowdown: "D", s: "D", arrowleft: "L", a: "L", arrowright: "R", d: "R", " ": "W" };
  document.addEventListener("keydown", (e) => {
    if (!$("menu").hidden || !$("win").hidden) return;
    const k = e.key.toLowerCase();
    if (k === "z") { e.preventDefault(); undo(); return; }
    const m = KEYS[k]; if (!m) return;
    e.preventDefault(); audio(); move(m);
  });
  document.querySelectorAll(".pad .k").forEach((b) => b.addEventListener("click", () => { audio(); move(b.dataset.m); }));
  let sw = null;
  map.addEventListener("pointerdown", (e) => { sw = { x: e.clientX, y: e.clientY }; });
  map.addEventListener("pointerup", (e) => {
    if (!sw) return; const dx = e.clientX - sw.x, dy = e.clientY - sw.y; sw = null;
    if (Math.max(Math.abs(dx), Math.abs(dy)) < 28) return; // dokunma, hücre tıklamasına bırak
    audio(); move(Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? "R" : "L") : (dy > 0 ? "D" : "U"));
    map.dataset.swiped = "1"; setTimeout(() => { delete map.dataset.swiped; }, 50);
  });
  map.addEventListener("click", (e) => { if (map.dataset.swiped) e.stopPropagation(); }, true);

  /* ---------- menü ---------- */
  function renderLevels() {
    const box = $("levels"); box.textContent = "";
    LEVELS.forEach((lv, i) => {
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
  $("undo").addEventListener("click", undo);
  $("reset").addEventListener("click", () => startLevel(L));
  $("hint").addEventListener("click", () => { audio(); hint(); });
  $("peek").addEventListener("click", () => { peek = !peek; $("peek").setAttribute("aria-pressed", String(peek)); render(); });

  L = save.cur || 0; P = GA.parse(LEVELS[L].lv); st = { x: P.S[0], y: P.S[1], f: P.F ? 0 : 1, t: 0 }; build(); render(); renderLevels();
  window.__ga = { LEVELS, startLevel, move, undo, hint, get st() { return st; }, get won() { return won; }, get over() { return over; }, get P() { return P; } };
})();
