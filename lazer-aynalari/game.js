/* Lazer Aynaları — Enes için ışık yönlendirme bulmacası */
(() => {
  "use strict";
  const $ = (id) => document.getElementById(id);
  const SAVE_KEY = "lazer-aynalari", LEVELS = 20;
  const D = { r: [1, 0], l: [-1, 0], u: [0, -1], d: [0, 1] };
  // ayna yansımaları: "/" ve "\"
  const REFLECT = { "/": { r: "u", u: "r", l: "d", d: "l" }, "\\": { r: "d", d: "r", l: "u", u: "l" } };

  let save = { stars: [] };
  try { save = Object.assign(save, JSON.parse(localStorage.getItem(SAVE_KEY) || "{}")); } catch (e) {}
  const persist = () => { try { localStorage.setItem(SAVE_KEY, JSON.stringify(save)); } catch (e) {} };

  let AC = null;
  function audio() { try { AC = AC || new (window.AudioContext || window.webkitAudioContext)(); if (AC.state === "suspended") AC.resume(); } catch (e) {} }
  function snd(f, d, type, vol, delay) {
    if (!AC) return;
    const t = AC.currentTime + (delay || 0), o = AC.createOscillator(), g = AC.createGain();
    o.type = type || "triangle"; o.frequency.setValueAtTime(f, t);
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol || 0.05, t + 0.01); g.gain.exponentialRampToValueAtTime(0.0001, t + d);
    o.connect(g).connect(AC.destination); o.start(t); o.stop(t + d + 0.02);
  }

  // her bölüm hep aynı olsun diye tohumlu rastgele
  function rng(seed) { let s = seed >>> 0; return () => { s = (s + 0x6D2B79F5) >>> 0; let t = s; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }

  function spec(lv) {
    const n = lv < 4 ? 5 : lv < 9 ? 6 : lv < 14 ? 7 : 8;
    return { n, turns: 2 + Math.min(7, Math.floor(lv / 2)), decoys: Math.floor(lv / 3), walls: Math.floor(lv / 2), crystals: 1 + Math.floor(lv / 5) };
  }
  // geçerli bir ışın yolu üret: yol üzerindeki dönüşlere ayna koy
  function generate(lv) {
    const S = spec(lv), R = rng(1000 + lv * 7919), ri = (k) => Math.floor(R() * k);
    for (let tries = 0; tries < 3000; tries++) {
      const n = S.n, grid = Array.from({ length: n }, () => new Array(n).fill(null));
      const sy = ri(n); let x = 0, y = sy, dir = "r";
      const used = new Set([`0,${sy}`]), mirrors = [], straight = [];
      grid[sy][0] = { t: "src" };
      let ok = true;
      for (let k = 0; k < S.turns && ok; k++) {
        const len = 1 + ri(3);
        for (let s = 0; s < len; s++) {
          const nx = x + D[dir][0], ny = y + D[dir][1], key = `${nx},${ny}`;
          if (nx < 0 || ny < 0 || nx >= n || ny >= n || used.has(key)) { ok = false; break; }
          x = nx; y = ny; used.add(key);
          if (s < len - 1) straight.push([x, y]);
        }
        if (!ok) break;
        const nd = dir === "r" || dir === "l" ? (R() < .5 ? "u" : "d") : (R() < .5 ? "l" : "r");
        const kind = REFLECT["/"][dir] === nd ? "/" : "\\";
        grid[y][x] = { t: "m", sol: kind, cur: kind, path: true };
        mirrors.push([x, y]); dir = nd;
      }
      if (!ok) continue;
      // son düz parça ve hedef
      const len = 1 + ri(3);
      for (let s = 0; s < len && ok; s++) {
        const nx = x + D[dir][0], ny = y + D[dir][1], key = `${nx},${ny}`;
        if (nx < 0 || ny < 0 || nx >= n || ny >= n || used.has(key)) { ok = false; break; }
        x = nx; y = ny; used.add(key);
        if (s < len - 1) straight.push([x, y]);
      }
      if (!ok) continue;
      grid[y][x] = { t: "goal" };
      if (straight.length < S.crystals) continue;
      // kristaller düz parçalara
      const pick = straight.slice().sort(() => R() - .5).slice(0, S.crystals);
      pick.forEach(([a, b]) => { grid[b][a] = { t: "gem" }; });
      // boş kareler: tuzak ayna ve duvar
      const free = [];
      for (let b = 0; b < n; b++) for (let a = 0; a < n; a++) if (!used.has(`${a},${b}`)) free.push([a, b]);
      free.sort(() => R() - .5);
      let fi = 0;
      for (let k = 0; k < S.decoys && fi < free.length; k++) { const [a, b] = free[fi++]; const sol = R() < .5 ? "/" : "\\"; grid[b][a] = { t: "m", sol, cur: sol, path: false }; }
      for (let k = 0; k < S.walls && fi < free.length; k++) { const [a, b] = free[fi++]; grid[b][a] = { t: "wall" }; }
      // karıştır: yol aynalarının en az yarısını çevir
      let wrong = 0;
      mirrors.forEach(([a, b]) => { if (R() < .65) { const c = grid[b][a]; c.cur = c.sol === "/" ? "\\" : "/"; wrong++; } });
      if (!wrong) { const [a, b] = mirrors[0], c = grid[b][a]; c.cur = c.sol === "/" ? "\\" : "/"; wrong = 1; }
      for (let b = 0; b < n; b++) for (let a = 0; a < n; a++) { const c = grid[b][a]; if (c && c.t === "m" && !c.path && R() < .5) c.cur = c.cur === "/" ? "\\" : "/"; }
      return { n, grid, sy, par: wrong, gems: S.crystals };
    }
    return null;
  }
  // ışını izle
  function trace(P) {
    let x = 0, y = P.sy, dir = "r"; const pts = [[x, y]], gems = new Set(); let goal = false, guard = 0;
    while (guard++ < 400) {
      const nx = x + D[dir][0], ny = y + D[dir][1];
      if (nx < 0 || ny < 0 || nx >= P.n || ny >= P.n) { pts.push([nx, ny, true]); break; }
      x = nx; y = ny;
      const c = P.grid[y][x];
      if (c && c.t === "wall") { pts.push([x, y, "w"]); break; }
      if (c && c.t === "src") { pts.push([x, y]); break; }
      if (c && c.t === "gem") gems.add(`${x},${y}`);
      if (c && c.t === "goal") { pts.push([x, y]); goal = true; break; }
      if (c && c.t === "m") { dir = REFLECT[c.cur][dir]; pts.push([x, y]); }
    }
    return { pts, gems: gems.size, goal };
  }

  /* ---------- oyun ---------- */
  let lv = 0, P = null, taps = 0, done = false, cur = 0;
  function startLevel(i) {
    lv = Math.max(0, Math.min(LEVELS - 1, i));
    P = generate(lv); taps = 0; done = false; cur = 0;
    $("menu").hidden = true; $("win").hidden = true; $("msg").textContent = lv === 0 ? "Bir aynaya dokun, ışın yön değiştirsin." : "";
    build(); update();
  }
  const mirrorSvg = (k) => k === "/" ? '<svg viewBox="0 0 100 100"><path d="M20 80L80 20" stroke="#E8EDFF" stroke-width="10" stroke-linecap="round"/><path d="M26 86L86 26" stroke="#7A87C0" stroke-width="4" stroke-linecap="round"/></svg>' : '<svg viewBox="0 0 100 100"><path d="M20 20L80 80" stroke="#E8EDFF" stroke-width="10" stroke-linecap="round"/><path d="M14 26L74 86" stroke="#7A87C0" stroke-width="4" stroke-linecap="round"/></svg>';
  const SRC = '<svg viewBox="0 0 100 100"><rect x="14" y="30" width="56" height="40" rx="8" fill="#FF4D6D"/><rect x="66" y="40" width="20" height="20" fill="#C9304E"/></svg>';
  const gemSvg = (on) => `<svg viewBox="0 0 100 100"><path d="M50 20L78 44L50 82L22 44Z" fill="${on ? "#4CC9F0" : "#2C4A66"}" stroke="#9BE7FF" stroke-width="4"/></svg>`;
  const goalSvg = (on) => `<svg viewBox="0 0 100 100"><circle cx="50" cy="50" r="30" fill="none" stroke="${on ? "#3DDC97" : "#FFD166"}" stroke-width="7"/><circle cx="50" cy="50" r="13" fill="${on ? "#3DDC97" : "#FFD166"}"/></svg>`;
  function build() {
    const b = $("board"); b.textContent = ""; b.style.setProperty("--n", P.n);
    for (let y = 0; y < P.n; y++) for (let x = 0; x < P.n; x++) {
      const c = P.grid[y][x], el = document.createElement(c && c.t === "m" ? "button" : "div");
      el.className = "c" + (c && c.t === "m" ? " m" : "") + (c && c.t === "wall" ? " wall" : "");
      el.dataset.x = x; el.dataset.y = y;
      if (c && c.t === "m") { el.type = "button"; el.setAttribute("aria-label", "Ayna"); el.addEventListener("click", () => { audio(); tap(x, y); }); }
      b.appendChild(el);
    }
    const ns = "http://www.w3.org/2000/svg", s = document.createElementNS(ns, "svg");
    s.setAttribute("class", "beam"); s.setAttribute("viewBox", `0 0 ${P.n} ${P.n}`); s.id = "beam";
    b.appendChild(s);
  }
  function tap(x, y) {
    if (done) return false;
    const c = P.grid[y][x]; if (!c || c.t !== "m") return false;
    c.cur = c.cur === "/" ? "\\" : "/"; taps++; snd(520, 0.05, "square", 0.03);
    update(); return true;
  }
  function update() {
    const T = trace(P), hit = new Set();
    // kristal durumu ve ışın çizgisi
    let x = 0, y = P.sy, dir = "r", guard = 0;
    while (guard++ < 400) { const nx = x + D[dir][0], ny = y + D[dir][1]; if (nx < 0 || ny < 0 || nx >= P.n || ny >= P.n) break; x = nx; y = ny; const c = P.grid[y][x]; if (!c) continue; if (c.t === "wall" || c.t === "src" || c.t === "goal") break; if (c.t === "gem") hit.add(`${x},${y}`); if (c.t === "m") dir = REFLECT[c.cur][dir]; }
    [...$("board").querySelectorAll(".c")].forEach(el => {
      const c = P.grid[+el.dataset.y][+el.dataset.x]; if (!c) return;
      if (c.t === "m") el.innerHTML = mirrorSvg(c.cur);
      else if (c.t === "src") el.innerHTML = SRC;
      else if (c.t === "gem") el.innerHTML = gemSvg(hit.has(`${el.dataset.x},${el.dataset.y}`));
      else if (c.t === "goal") el.innerHTML = goalSvg(T.goal && T.gems === P.gems);
    });
    const line = T.pts.map(([a, b]) => `${a + .5},${b + .5}`).join(" ");
    $("beam").innerHTML = `<polyline points="${line}" fill="none" stroke="#FF4D6D" stroke-opacity=".35" stroke-width=".22" stroke-linejoin="round"/><polyline points="${line}" fill="none" stroke="#FFB3C1" stroke-width=".07" stroke-linejoin="round"/>`;
    $("lv").textContent = lv + 1; $("taps").textContent = taps; $("cr").textContent = `${T.gems}/${P.gems}`;
    if (T.goal && T.gems < P.gems) $("msg").textContent = "Hedefe ulaştın ama bütün kristallerden geçmedin!";
    else if (!done && !T.goal && taps) $("msg").textContent = "";
    if (T.goal && T.gems === P.gems && !done) { done = true; win(); }
  }
  function win() {
    const extra = taps - P.par, s = extra <= 2 ? 3 : extra <= 6 ? 2 : 1;
    save.stars[lv] = Math.max(save.stars[lv] || 0, s); persist();
    [659, 784, 988, 1319].forEach((f, i) => snd(f, 0.18, "triangle", 0.06, i * 0.09));
    $("stars").textContent = "⭐".repeat(s);
    $("w-title").textContent = lv === LEVELS - 1 ? "Bütün bölümler bitti! 🎉" : `${lv + 1}. bölüm bitti!`;
    $("w-tx").textContent = `${taps} dokunuşla çözdün.`;
    $("next").hidden = lv === LEVELS - 1;
    setTimeout(() => { $("win").hidden = false; ($("next").hidden ? $("replay") : $("next")).focus(); renderLevels(); }, 700);
  }
  /* ---------- klavye ---------- */
  document.addEventListener("keydown", (e) => {
    if (!$("menu").hidden || !$("win").hidden || !P) return;
    const ms = [...$("board").querySelectorAll(".c.m")]; if (!ms.length) return;
    const act = document.activeElement, i = ms.indexOf(act);
    if (e.key.startsWith("Arrow")) {
      e.preventDefault();
      if (i < 0) { ms[0].focus(); return; }
      const ax = +act.dataset.x, ay = +act.dataset.y, [dx, dy] = { ArrowRight: [1, 0], ArrowLeft: [-1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] }[e.key];
      let best = null, bd = 1e9;
      for (const m of ms) { if (m === act) continue; const mx = +m.dataset.x - ax, my = +m.dataset.y - ay; if (mx * dx + my * dy <= 0) continue; const d = Math.abs(mx) + Math.abs(my) + 2 * Math.abs(mx * dy + my * dx); if (d < bd) { bd = d; best = m; } }
      if (best) best.focus();
    }
  });
  /* ---------- menü ---------- */
  let pick = 0;
  function renderLevels() {
    const g = $("levels"); g.textContent = "";
    for (let i = 0; i < LEVELS; i++) {
      const open = i === 0 || save.stars[i - 1], b = document.createElement("button"); b.type = "button"; b.disabled = !open; b.className = i === pick ? "cur" : "";
      b.innerHTML = `${open ? i + 1 : "🔒"}<small>${"★".repeat(save.stars[i] || 0)}</small>`;
      b.setAttribute("aria-label", `Bölüm ${i + 1}${open ? "" : ", kilitli"}`);
      b.addEventListener("click", () => { pick = i; renderLevels(); });
      g.appendChild(b);
    }
  }
  $("start").addEventListener("click", () => { audio(); startLevel(pick); });
  $("open-menu").addEventListener("click", () => { pick = lv; renderLevels(); $("menu").hidden = false; });
  $("next").addEventListener("click", () => { audio(); pick = lv + 1; startLevel(pick); });
  $("replay").addEventListener("click", () => { audio(); startLevel(lv); });
  $("reset").addEventListener("click", () => { audio(); startLevel(lv); });
  pick = Math.min(LEVELS - 1, save.stars.filter(Boolean).length);
  renderLevels(); startLevel(pick); $("menu").hidden = false;

  window.__lz = { generate, trace, startLevel, tap, get P() { return P; }, get taps() { return taps; }, LEVELS };
})();
