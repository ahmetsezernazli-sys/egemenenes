/* Gizli Ajan — ortak kurallar (oyun ve bölüm üretici kullanır) */
(function (root) {
  "use strict";
  const DIRS = { U: [0, -1], R: [1, 0], D: [0, 1], L: [-1, 0] };
  const ROT = ["U", "R", "D", "L"];
  const RANGE = 4;
  // seviye: {w, h, map: string (# duvar, . yol, * çalı, S başlangıç, E çıkış, F dosya), guards:[{t:"p", path:[[x,y],...]} | {t:"r", x, y, dirs:"URDL"}]}
  function parse(lv) {
    const cells = [], w = lv.w, h = lv.h; let S, E, F = null;
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const ch = lv.map[y * w + x]; cells.push(ch === "#" ? "#" : ch === "*" ? "*" : ".");
      if (ch === "S") S = [x, y]; if (ch === "E") E = [x, y]; if (ch === "F") F = [x, y];
    }
    return { w, h, cells, S, E, F, guards: lv.guards };
  }
  const wall = (P, x, y) => x < 0 || y < 0 || x >= P.w || y >= P.h || P.cells[y * P.w + x] === "#";
  function period(g) { return g.t === "p" ? Math.max(1, 2 * (g.path.length - 1)) : g.dirs.length; }
  function gstate(g, t) { // {x, y, d}
    if (g.t === "r") { const d = g.dirs[t % g.dirs.length]; return { x: g.x, y: g.y, d }; }
    const n = g.path.length; if (n === 1) return { x: g.path[0][0], y: g.path[0][1], d: g.d || "D" };
    const per = 2 * (n - 1), k = t % per, i = k < n ? k : per - k, j = k < n - 1 ? i + 1 : i - 1;
    const [x, y] = g.path[i], [nx, ny] = g.path[j];
    const d = nx > x ? "R" : nx < x ? "L" : ny > y ? "D" : "U";
    return { x, y, d };
  }
  function seen(P, t, px, py) { // oyuncu (px,py) bu anda görülüyor mu
    if (P.cells[py * P.w + px] === "*") return false;
    for (const g of P.guards) {
      const s = gstate(g, t);
      if (s.x === px && s.y === py) return true;
      const [dx, dy] = DIRS[s.d];
      for (let k = 1; k <= RANGE; k++) { const x = s.x + dx * k, y = s.y + dy * k; if (wall(P, x, y)) break; if (x === px && y === py) return true; }
    }
    return false;
  }
  function cone(P, t) { // görüş alanı hücreleri
    const out = new Set();
    for (const g of P.guards) {
      const s = gstate(g, t), [dx, dy] = DIRS[s.d];
      for (let k = 1; k <= RANGE; k++) { const x = s.x + dx * k, y = s.y + dy * k; if (wall(P, x, y)) break; out.add(y * P.w + x); }
    }
    return out;
  }
  // bir adım: oyuncu (x,y,f) zamanda t; m = "U","R","D","L","W" -> {x,y,f,t,caught,win}
  function step(P, st, m) {
    let { x, y, f, t } = st;
    if (m !== "W") { const [dx, dy] = DIRS[m]; if (wall(P, x + dx, y + dy)) return null; x += dx; y += dy; }
    if (seen(P, t, x, y)) return { x, y, f, t, caught: true };
    if (P.F && x === P.F[0] && y === P.F[1]) f = 1;
    if (x === P.E[0] && y === P.E[1] && (f || !P.F)) return { x, y, f, t: t + 1, win: true };
    t += 1;
    if (seen(P, t, x, y)) return { x, y, f, t, caught: true };
    return { x, y, f, t };
  }
  function lcm(a, b) { const g = (p, q) => q ? g(q, p % q) : p; return a / g(a, b) * b; }
  function solve(P, from) { // en kısa çözüm (hamle listesi) ya da null
    const L = P.guards.reduce((a, g) => lcm(a, period(g)), 1);
    const st0 = from || { x: P.S[0], y: P.S[1], f: P.F ? 0 : 1, t: 0 };
    const key = (s) => ((s.y * P.w + s.x) * 2 + s.f) * L + (s.t % L);
    const prev = new Map([[key(st0), null]]); let fr = [st0];
    while (fr.length) {
      const nx = [];
      for (const s of fr) for (const m of ["U", "R", "D", "L", "W"]) {
        const r = step(P, s, m); if (!r || r.caught) continue;
        const k = key(r);
        if (r.win) { const path = [m]; let c = key(s); while (prev.get(c)) { const [pk, pm] = prev.get(c); path.unshift(pm); c = pk; } return path; }
        if (prev.has(k)) continue;
        prev.set(k, [key(s), m]); nx.push(r);
      }
      fr = nx;
      if (prev.size > 400000) return null;
    }
    return null;
  }
  root.GA = { DIRS, ROT, RANGE, parse, wall, period, gstate, seen, cone, step, solve };
})(typeof window !== "undefined" ? window : globalThis);
