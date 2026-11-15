/* Solo Test — Enes için klasik tek taş bulmacası */
(() => {
  "use strict";
  const $ = (id) => document.getElementById(id);
  const SAVE_KEY = "solo-test";
  // 7×7 haç tahtası: köşeler yok, 33 delik
  const HOLES = [];
  for (let r = 0; r < 7; r++) for (let c = 0; c < 7; c++) if (!((r < 2 || r > 4) && (c < 2 || c > 4))) HOLES.push([r, c]);
  const IDX = {}; HOLES.forEach(([r, c], i) => { IDX[r * 7 + c] = i; });
  const at = (r, c) => (r >= 0 && c >= 0 && r < 7 && c < 7 && IDX[r * 7 + c] !== undefined) ? IDX[r * 7 + c] : -1;
  const CENTER = at(3, 3);
  // atlama üçlüleri: [kalkış, atlanan, varış]
  const JUMPS = [];
  HOLES.forEach(([r, c], i) => { for (const [dr, dc] of [[0, 1], [0, -1], [1, 0], [-1, 0]]) { const m = at(r + dr, c + dc), t = at(r + 2 * dr, c + 2 * dc); if (m >= 0 && t >= 0) JUMPS.push([i, m, t]); } });
  // 24 bölüm tek taştan geriye oynanarak üretildi (hepsi çözülebilir), 25. bölüm klasik tam tahta
  const RAW = ["000000001000000100000000000100000","000000000010000001000000110000000","000000010110000010000000000010000","000001000000000001101101000000000","100001000100000010000110000100000","000100011000001001110000100000000","000001000110101111010000000000000","000000010000001110101011010001000","000000000000011100100111100010101","000110000000011010100101100001110","000001011111100110101001010000000","001001010000001111000111011001010","110010000011001111010010001110010","000000101011010011110010111111000","000101111110011010001111100010001","000111011110001000100101011110111","000111001111010101111001011101100","000111111110110000101101111001110","010111001011101111110010010011111","111100010100111011110111110111001","000110101111010111101110011111111","010110111101011111110011101111110","010110011101111010111011111111111","011111110101101110111101111111011"];
  RAW.push(HOLES.map((_, i) => i === CENTER ? "0" : "1").join(""));
  const LEVELS = RAW.map((s) => s.split("").map(Number));

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

  /* ---------- kurallar ---------- */
  const count = (b) => b.reduce((a, v) => a + v, 0);
  const legal = (b) => JUMPS.filter(([f, m, t]) => b[f] && b[m] && !b[t]);
  function solve(b0, budget) { // tek taşa giden hamleler ya da null
    // hızlı arama: tahta anahtarı sayı (2^i toplamı), simetrik eşler de başarısız sayılır
    const failed = new Set(); let nodes = 0;
    const b = b0.slice(), path = [], P2 = HOLES.map((_, i) => 2 ** i);
    let key = b.reduce((a, v, i) => a + (v ? P2[i] : 0), 0), n = count(b);
    const SYM = []; // 8 simetri için delik eşlemesi
    for (let s = 0; s < 8; s++) SYM.push(HOLES.map(([r, c]) => { let R = r, C = c; if (s & 1) C = 6 - C; if (s & 2) R = 6 - R; if (s & 4) { const t = R; R = C; C = t; } return at(R, C); }));
    const symKeys = () => SYM.map(m => b.reduce((a, v, i) => a + (v ? P2[m[i]] : 0), 0));
    const dfs = () => {
      if (n === 1) return true;
      if (failed.has(key)) return false;
      if (++nodes > budget) throw 0;
      for (let q = 0; q < JUMPS.length; q++) {
        const j = JUMPS[q], f = j[0], m = j[1], t = j[2];
        if (!b[f] || !b[m] || b[t]) continue;
        b[f] = 0; b[m] = 0; b[t] = 1; key += P2[t] - P2[f] - P2[m]; n--; path.push(j);
        if (dfs()) return true;
        path.pop(); b[f] = 1; b[m] = 1; b[t] = 0; key -= P2[t] - P2[f] - P2[m]; n++;
      }
      if (n > 12) for (const k of symKeys()) failed.add(k); else failed.add(key);
      return false;
    };
    try { return dfs() ? path.slice() : null; } catch (e) { return undefined; }
  }
  function generate(pegs) { // tek taştan geriye doğru rastgele oyna
    for (let tries = 0; tries < 200; tries++) {
      const b = HOLES.map(() => 0); b[Math.floor(Math.random() * HOLES.length)] = 1;
      let ok = true;
      while (count(b) < pegs) {
        const rev = JUMPS.filter(([f, m, t]) => b[t] && !b[m] && !b[f]);
        if (!rev.length) { ok = false; break; }
        const [f, m, t] = rev[Math.floor(Math.random() * rev.length)]; b[t] = 0; b[m] = 1; b[f] = 1;
      }
      if (ok) return b;
    }
    return null;
  }

  /* ---------- durum ---------- */
  let L = 0, B = null, hist = [], sel = -1, won = false, stuck = false, hinted = false, hintJ = null, focusI = CENTER;
  const brd = $("brd"), cells = [];
  for (let r = 0; r < 7; r++) for (let c = 0; c < 7; c++) {
    const i = at(r, c), b = document.createElement("button"); b.type = "button";
    b.className = "h" + (i < 0 ? " x" : ""); b.tabIndex = i === CENTER ? 0 : -1;
    if (i >= 0) { b.dataset.i = i; b.addEventListener("click", () => { audio(); tap(i); }); cells[i] = b; }
    brd.appendChild(b);
  }
  function startLevel(i) {
    L = Math.max(0, Math.min(LEVELS.length - 1, i)); save.cur = L; persist();
    B = LEVELS[L].slice(); hist = []; sel = -1; won = false; stuck = false; hinted = false; hintJ = null;
    $("menu").hidden = true; $("win").hidden = true;
    render(); msg(L === 0 ? "Bir taşa dokun, sonra parlayan boş deliğe dokun." : "");
  }
  function msg(t) { $("msg").textContent = t; }
  function render() {
    const lg = legal(B), movable = new Set(lg.map(j => j[0])), targets = new Set(lg.filter(j => j[0] === sel).map(j => j[2]));
    cells.forEach((b, i) => {
      b.classList.toggle("p", !!B[i]); b.classList.toggle("sel", i === sel);
      b.classList.toggle("t", targets.has(i)); b.classList.toggle("can", movable.has(i) && sel < 0);
      b.classList.toggle("hint", !!hintJ && hintJ[0] === i); b.classList.toggle("ht", !!hintJ && hintJ[2] === i);
      const [r, c] = HOLES[i];
      b.setAttribute("aria-label", `Satır ${r + 1}, sütun ${c + 1}: ${B[i] ? "taş" : "boş"}${i === sel ? ", seçili" : ""}${targets.has(i) ? ", atlanabilir" : ""}`);
    });
    $("lv").textContent = L + 1; $("mv").textContent = count(B); $("par").textContent = hist.length;
  }
  function tap(i) {
    if (won || !B) return false;
    if (B[i]) {
      if (!legal(B).some(j => j[0] === i)) { sel = -1; render(); tone(180, 0.06, "sine", 0.04); msg("Bu taş atlayamaz: yanında taş, onun ötesinde boş delik olmalı."); return false; }
      sel = sel === i ? -1 : i; tone(440, 0.05, "sine", 0.04); render(); return true;
    }
    if (sel >= 0) { const j = legal(B).find(([f, , t]) => f === sel && t === i); if (j) return jump(j); }
    tone(180, 0.06, "sine", 0.04); return false;
  }
  function jump(j) {
    const [f, m, t] = j;
    hist.push(B.slice()); B[f] = 0; B[m] = 0; B[t] = 1; sel = -1; hintJ = null;
    tone(520, 0.06, "triangle", 0.06); tone(300, 0.08, "square", 0.04, 0.06);
    render(); cells[m].classList.remove("gone"); void cells[m].offsetWidth; cells[m].classList.add("gone");
    const n = count(B);
    if (n === 1) return finish(), true;
    if (!legal(B).length) { stuck = true; msg(`Hamle kalmadı! ${n} taş kaldı. ↶ Geri al ya da ↺ baştan dene.`); finish(true); }
    else msg("");
    return true;
  }
  function finish(stuckEnd) {
    const n = count(B), center = n === 1 && B[CENTER] === 1;
    const s = n === 1 ? 3 : n === 2 ? 2 : n === 3 && count(LEVELS[L]) >= 10 ? 1 : 0;
    const st = hinted ? Math.min(s, 2) : s;
    if (st > 0) { save.stars[L] = Math.max(save.stars[L] || 0, st); persist(); renderLevels(); }
    if (stuckEnd && n > 1) {
      if (st === 0) return; // 4'ten fazla taş: sadece mesaj
    }
    won = n === 1;
    [523, 659, 784, 1046].forEach((f, i) => tone(f, 0.18, "triangle", 0.07, 0.2 + i * 0.1));
    $("stars").textContent = "⭐".repeat(st) + "☆".repeat(3 - st);
    $("w-title").textContent = n === 1 ? (center ? "Tek taş, tam ortada! 🎯" : "Tek taş kaldı!") : `${n} taş kaldı`;
    $("w-tx").textContent = n === 1 ? (L === LEVELS.length - 1 ? "Klasik tam tahtayı bitirdin, sen gerçek bir Solo Test ustasısın! 🏆" : hinted ? "İpucusuz dene: üç yıldız!" : "Mükemmel!") : "Tek taş bırakırsan üç yıldız. Geri alıp başka yol deneyebilirsin.";
    $("next").hidden = L === LEVELS.length - 1;
    $("replay").textContent = n === 1 ? "Tekrar oyna" : "↶ Geri al";
    $("replay").dataset.undo = n === 1 ? "" : "1";
    setTimeout(() => { $("win").hidden = false; ($("next").hidden ? $("replay") : $("next")).focus(); }, 600);
  }
  function undo() {
    if (!hist.length) return;
    B = hist.pop(); sel = -1; won = false; stuck = false; hintJ = null; $("win").hidden = true;
    msg(""); render(); tone(250, 0.06, "sine", 0.05);
  }
  function hint() {
    if (won) return;
    msg("Düşünüyorum…");
    setTimeout(() => {
      const p = solve(B, 6000000);
      if (p === undefined) { msg("Bu tahta çok büyük, ipucu bulamadım. Biraz daha oyna, sonra tekrar dene."); return; }
      if (!p) { msg("Buradan tek taşa inilemiyor. ↶ Geri al!"); return; }
      hinted = true; hintJ = p[0]; sel = -1; render();
      msg(`İpucu: yeşil halkalı taşı yeşil deliğe atlat. Tek taşa ${p.length} hamle var.`);
    }, 30);
  }

  /* ---------- klavye ---------- */
  brd.addEventListener("keydown", (e) => {
    const [r, c] = HOLES[focusI];
    let d = null;
    if (e.key === "ArrowUp") d = [-1, 0]; else if (e.key === "ArrowDown") d = [1, 0]; else if (e.key === "ArrowLeft") d = [0, -1]; else if (e.key === "ArrowRight") d = [0, 1];
    if (d) { e.preventDefault(); const n = at(r + d[0], c + d[1]); if (n >= 0) { cells[focusI].tabIndex = -1; focusI = n; cells[n].tabIndex = 0; cells[n].focus(); } }
  });
  brd.addEventListener("focusin", (e) => { const i = e.target.dataset && e.target.dataset.i; if (i != null) focusI = +i; });

  /* ---------- menü ---------- */
  function renderLevels() {
    const box = $("levels"); box.textContent = "";
    LEVELS.forEach((lv, i) => {
      const b = document.createElement("button"); b.type = "button";
      const open = i < 5 || save.stars[i - 1] || save.stars[i];
      b.disabled = !open; if (i === L) b.className = "cur";
      b.innerHTML = `${i === LEVELS.length - 1 ? "👑" : i + 1}<small>${save.stars[i] ? "★".repeat(save.stars[i]) : count(lv) + " taş"}</small>`;
      b.setAttribute("aria-label", `Bölüm ${i + 1}, ${count(lv)} taş${save.stars[i] ? ", " + save.stars[i] + " yıldız" : ""}${open ? "" : ", kilitli"}`);
      b.addEventListener("click", () => { audio(); startLevel(i); });
      box.appendChild(b);
    });
  }
  $("open-menu").addEventListener("click", () => { renderLevels(); $("menu").hidden = false; });
  $("start").addEventListener("click", () => { audio(); startLevel(save.cur || 0); });
  $("next").addEventListener("click", () => { audio(); startLevel(L + 1); });
  $("replay").addEventListener("click", () => { audio(); if ($("replay").dataset.undo) undo(); else startLevel(L); });
  $("undo").addEventListener("click", undo);
  $("reset").addEventListener("click", () => startLevel(L));
  $("hint").addEventListener("click", () => { audio(); hint(); });

  L = Math.min(save.cur || 0, LEVELS.length - 1); B = LEVELS[L].slice(); render(); renderLevels();
  window.__so = { HOLES, JUMPS, CENTER, LEVELS, legal, solve, generate, count, startLevel, tap, jump, undo, hint, get B() { return B; }, get won() { return won; } };
})();
