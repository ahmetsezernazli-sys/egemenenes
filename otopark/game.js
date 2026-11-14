/* Otopark Kaçışı — Enes için kaydırmalı araba bulmacası */
(() => {
  "use strict";
  const $ = (id) => document.getElementById(id);
  const SAVE_KEY = "otopark", N = 6, EXIT = 2;
  // 40 bölüm: 36 karakterlik tahta (o = boş, A = kırmızı araba) : en az hamle — hepsi BFS ile doğrulandı
  const RAW = "EEooHHDFFBBBDAAoICDoJJICGGGooCoooooo:3,JIDDCCJIoKKoAAoHFGoooHFGoEoooooEooBB:4,ooGGEEooooFooAAoFoDDHoooCoHoBoCoooBo:4,CGGEEoCooooooAAoFoDDHoFoooHoBoooooBo:5,IBooEEIBoCoooAACKDoHGGKDoHoJJDoFFooo:5,IMDEEEIMDNNHAAooBHFFFJBLCGGJBLCKKooo:6,oIIHHHDDooFCAAooFCoGoBBEoGoooEoGoooE:6,GGHoEEooHoFoCAAoFoCDDoooooooBoooooBo:7,IMDEEEIMDNNoAAoJBHFFFJBHCGGoBLCKKooL:7,CGGEEoCoHoooAAHoFoooDDFoooooBoooooBo:8,IMoEEEIMDNNHAADJoHFFFJBoCoGGBLCoKKBL:8,LoooBBLKKKFooAAoFIJHHoFIJECCCGJEDDDG:9,oJJIIoMMoEEHAABFLHooBFLDGCCoLDGoKKNN:9,ooDDIoCCooIooAAoIHGGGBoHFFJBEEooJooo:10,ooHHDJFFooDJIoAADoIEEBBoooKCCoooKoGG:10,IoHHooIFFoDJoAAoDJEEBBDoooKoCCooKoGG:11,JJIIooMMEELHAAoFLHGoBFLDGoBCCDooKKNN:11,JJIILHMMEELHGAAFLDGooFoDooBCCoKKBoNN:12,EEooKooBooKDIBAAoDIHGGoDoHoCJJoooCFF:12,IMEEEoIMDJNNAADJBHCFFFBHCGGoBLKKoooL:13,LGCCCNLGDDoNAAMEFJHoMEFJHoKKooIIIBBo:13,LGCCCNLGDDFNoAAEFoHoMEoJHoMKKJIIIoBB:14,IMEEEoIMDJNNAADJBHCFFFBHCoGGBLoooKKL:14,EELLHoNNoBHIJAABoIJoDBCCooDKKMGGGFFM:15,EDDKKoEoBoFCAABoFCJJooooGGGIoooLLIHH:15,JEEBLLJNNBHIAADBHIooDoCCoooKKMGGGFFM:16,EDDIKKEooIooAABoooJJBooCoGGGFCLLHHFo:16,oEELLIJNNBHIJAABHoooDBCCooDKKMGGGFFM:17,EDDKKoEoBoooAABoFooJJoFCGGGIoCLLoIHH:17,JEELLoJNNBHIAADBHIooDBCCoooKKMGGGFFM:18,EDDoKKEooIooAABIooooBJJooGGGFCLLHHFC:18,JEELLoJNNoHIAADBHIooDBCCKKoBoMGGGFFM:19,EoDDKKEoooooAABIooooBIJJoGGGFCLLHHFC:19,JEEoLLJNNoHIoAABHIooDBCCKKDBoMGGGFFM:20,oGGoooDDDooKAAJIoKLLJIooECCHFFEBBHoo:20,EEoBLLNNoBHIJAABHIJoDCCMKKDooMoGGGFF:21,oEEoLLJoNNHIJAABHIooDBCCKKDBoMGGGFFM:22,EELLoooNNoHIJAABHIJoDBCCKKDBoMGGGFFM:23,EELLooNNoBHIJAABHIJoDBCCKKDooMGGGFFM:24,EELLHINNoBHIJAABooJoDBCCKKDooMGGGFFM:26";
  const LEVELS = RAW.split(",").map((x) => { const [b, p] = x.split(":"); return { b, par: +p }; });
  const COLORS = ["#4DA3FF", "#FFC529", "#3DDC84", "#B57CFF", "#FF9F43", "#2EC4B6", "#F15BB5", "#8D99AE", "#A3E635", "#FF7A90", "#60A5FA", "#FACC15", "#34D399"];

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
  function parse(s) { // harf -> {r, c, len, h}
    const v = {};
    for (let i = 0; i < 36; i++) { const ch = s[i]; if (ch === "o") continue; (v[ch] = v[ch] || []).push(i); }
    const out = {};
    for (const ch in v) { const cells = v[ch]; const h = cells.length > 1 && cells[1] - cells[0] === 1; out[ch] = { r: Math.floor(cells[0] / N), c: cells[0] % N, len: cells.length, h }; }
    return out;
  }
  function range(s, ch) { // aracın gidebileceği [geri, ileri] hücre sayısı
    const v = parse(s)[ch]; let back = 0, fwd = 0;
    if (v.h) {
      while (v.c - back - 1 >= 0 && s[v.r * N + v.c - back - 1] === "o") back++;
      while (v.c + v.len + fwd < N && s[v.r * N + v.c + v.len + fwd] === "o") fwd++;
    } else {
      while (v.r - back - 1 >= 0 && s[(v.r - back - 1) * N + v.c] === "o") back++;
      while (v.r + v.len + fwd < N && s[(v.r + v.len + fwd) * N + v.c] === "o") fwd++;
    }
    return [back, fwd];
  }
  function slide(s, ch, k) {
    const v = parse(s)[ch], a = s.split("");
    for (let i = 0; i < v.len; i++) a[v.h ? v.r * N + v.c + i : (v.r + i) * N + v.c] = "o";
    for (let i = 0; i < v.len; i++) a[v.h ? v.r * N + v.c + i + k : (v.r + i + k) * N + v.c] = ch;
    return a.join("");
  }
  const solved = (s) => s[EXIT * N + 5] === "A";
  function neighbors(s) {
    const out = [];
    for (const ch in parse(s)) { const [b, f] = range(s, ch); for (let k = 1; k <= b; k++) out.push([slide(s, ch, -k), ch, -k]); for (let k = 1; k <= f; k++) out.push([slide(s, ch, k), ch, k]); }
    return out;
  }
  function solve(s) { // en kısa çözüm: [ch, k] listesi
    if (solved(s)) return [];
    const prev = new Map([[s, null]]); let fr = [s];
    while (fr.length) {
      const nx = [];
      for (const x of fr) for (const [n, ch, k] of neighbors(x)) {
        if (prev.has(n)) continue;
        prev.set(n, [x, ch, k]);
        if (solved(n)) { const path = []; let cur = n; while (prev.get(cur)) { const [p, c2, k2] = prev.get(cur); path.unshift([c2, k2]); cur = p; } return path; }
        nx.push(n);
      }
      fr = nx;
      if (prev.size > 200000) return null;
    }
    return null;
  }

  /* ---------- durum ---------- */
  let L = 0, S = "", moves = 0, hist = [], lastCh = null, hinted = false, won = false, sel = null;
  const lot = $("lot");
  function startLevel(i) {
    L = Math.max(0, Math.min(LEVELS.length - 1, i)); save.cur = L; persist();
    S = LEVELS[L].b; moves = 0; hist = []; lastCh = null; hinted = false; won = false; sel = null;
    $("menu").hidden = true; $("win").hidden = true;
    build(); hud(); msg(L === 0 ? "Bir aracı sürükle: kırmızı arabanın önünü aç!" : "");
  }
  function hud() { $("lv").textContent = L + 1; $("mv").textContent = moves; $("par").textContent = LEVELS[L].par; }
  function msg(t) { $("msg").textContent = t; }
  const colorOf = (ch) => ch === "A" ? "#E5484D" : COLORS[(ch.charCodeAt(0) - 66) % COLORS.length];

  function build() {
    lot.textContent = "";
    const ex = document.createElement("div"); ex.className = "exit"; ex.setAttribute("aria-hidden", "true"); lot.appendChild(ex);
    const P = parse(S);
    for (const ch of Object.keys(P).sort()) {
      const v = P[ch], b = document.createElement("button");
      b.type = "button"; b.dataset.ch = ch;
      b.className = `car ${v.h ? "h" : "v"}${v.len === 3 ? " t" : ""}`;
      b.style.setProperty("--c", colorOf(ch));
      b.setAttribute("aria-label", `${ch === "A" ? "Kırmızı araba" : v.len === 3 ? "Kamyon" : "Araba"}, ${v.h ? "yatay" : "dikey"}`);
      b.addEventListener("pointerdown", (e) => down(e, b));
      b.addEventListener("keydown", (e) => key(e, ch));
      b.addEventListener("focus", () => { sel = ch; mark(); });
      lot.appendChild(b);
    }
    place();
  }
  function place() {
    const P = parse(S);
    lot.querySelectorAll(".car").forEach((b) => {
      const v = P[b.dataset.ch]; if (!v) return;
      b.style.left = `calc(var(--cs) * ${v.c} + 4px)`; b.style.top = `calc(var(--cs) * ${v.r} + 4px)`;
      b.style.width = `calc(var(--cs) * ${v.h ? v.len : 1} - 8px)`; b.style.height = `calc(var(--cs) * ${v.h ? 1 : v.len} - 8px)`;
      b.style.transform = "";
    });
    mark();
  }
  function mark() { lot.querySelectorAll(".car").forEach((b) => b.classList.toggle("sel", b.dataset.ch === sel && !won)); }
  function clearHint() { lot.querySelectorAll(".hint").forEach((e) => e.classList.remove("hint")); lot.querySelectorAll(".ghost").forEach((e) => e.remove()); }

  function move(ch, k) {
    if (won || !k) return false;
    const [b, f] = range(S, ch);
    if (k < -b || k > f) return false;
    hist.push({ s: S, moves, lastCh });
    S = slide(S, ch, k);
    if (ch !== lastCh) moves++;
    lastCh = ch; clearHint();
    tone(300 + Math.abs(k) * 40, 0.06, "triangle", 0.05);
    place(); hud();
    if (solved(S)) win();
    return true;
  }

  /* sürükleme */
  let drag = null;
  function down(e, b) {
    if (won) return;
    audio(); e.preventDefault();
    const ch = b.dataset.ch, v = parse(S)[ch], [bk, fw] = range(S, ch);
    const cs = lot.getBoundingClientRect().width / N;
    drag = { b, ch, h: v.h, x0: e.clientX, y0: e.clientY, cs, min: -bk * cs, max: fw * cs, off: 0, id: e.pointerId };
    sel = ch; mark(); b.classList.add("drag"); b.setPointerCapture(e.pointerId);
  }
  lot.addEventListener("pointermove", (e) => {
    if (!drag || e.pointerId !== drag.id) return;
    const d = drag.h ? e.clientX - drag.x0 : e.clientY - drag.y0;
    drag.off = Math.max(drag.min, Math.min(drag.max, d));
    drag.b.style.transform = drag.h ? `translateX(${drag.off}px)` : `translateY(${drag.off}px)`;
  });
  function up() {
    if (!drag) return;
    const { b, ch, off, cs } = drag; drag = null;
    b.classList.remove("drag");
    const k = Math.round(off / cs);
    // geçişi yumuşat: transform'u konuma çevir
    b.style.transform = "";
    if (!move(ch, k)) place();
  }
  lot.addEventListener("pointerup", up);
  lot.addEventListener("pointercancel", up);
  lot.addEventListener("lostpointercapture", up);
  function key(e, ch) {
    const v = parse(S)[ch]; if (!v) return;
    let k = 0;
    if (v.h && e.key === "ArrowLeft") k = -1; else if (v.h && e.key === "ArrowRight") k = 1;
    else if (!v.h && e.key === "ArrowUp") k = -1; else if (!v.h && e.key === "ArrowDown") k = 1;
    if (!k) return;
    e.preventDefault(); audio();
    if (!move(ch, k)) tone(160, 0.08, "sine", 0.05);
    const b = lot.querySelector(`.car[data-ch="${ch}"]`); if (b && !won) b.focus();
  }

  function win() {
    won = true; mark();
    const a = lot.querySelector('.car[data-ch="A"]');
    if (a) { a.classList.add("out"); requestAnimationFrame(() => { a.style.left = `calc(var(--cs) * 7.5)`; }); }
    const par = LEVELS[L].par;
    let st = moves <= par ? 3 : moves <= par + Math.ceil(par / 2) ? 2 : 1;
    if (hinted) st = Math.min(st, 2);
    save.stars[L] = Math.max(save.stars[L] || 0, st); persist(); renderLevels();
    [523, 659, 784, 1046].forEach((f, i) => tone(f, 0.18, "triangle", 0.07, 0.3 + i * 0.1));
    $("stars").textContent = "⭐".repeat(st) + "☆".repeat(3 - st);
    $("w-title").textContent = L === LEVELS.length - 1 ? "Bütün otoparklar boşaldı! 🏆" : "Çıkış!";
    $("w-tx").textContent = `${moves} hamlede çıktın (en az ${par}).${st < 3 ? (hinted ? " İpucu kullanmadan dene: üç yıldız!" : ` ${par} hamlede çıkarsan üç yıldız!`) : " Mükemmel!"}`;
    $("next").hidden = L === LEVELS.length - 1;
    setTimeout(() => { $("win").hidden = false; ($("next").hidden ? $("replay") : $("next")).focus(); }, 900);
  }
  function hint() {
    if (won) return;
    clearHint();
    const p = solve(S);
    if (!p || !p.length) return;
    hinted = true;
    const [ch, k] = p[0], v = parse(S)[ch], b = lot.querySelector(`.car[data-ch="${ch}"]`);
    b.classList.add("hint");
    const g = document.createElement("div"); g.className = "ghost";
    const r = v.h ? v.r : v.r + k, c = v.h ? v.c + k : v.c;
    g.style.left = `calc(var(--cs) * ${c} + 4px)`; g.style.top = `calc(var(--cs) * ${r} + 4px)`;
    g.style.width = `calc(var(--cs) * ${v.h ? v.len : 1} - 8px)`; g.style.height = `calc(var(--cs) * ${v.h ? 1 : v.len} - 8px)`;
    lot.appendChild(g);
    msg(`İpucu: parlayan aracı kesikli çizgiye kaydır. Buradan çıkış ${p.length} hamle.`);
  }

  /* ---------- menü ---------- */
  function renderLevels() {
    const box = $("levels"); box.textContent = "";
    LEVELS.forEach((lv, i) => {
      const b = document.createElement("button"); b.type = "button";
      const open = i < 5 || save.stars[i - 1] || save.stars[i];
      b.disabled = !open; if (i === L) b.className = "cur";
      b.innerHTML = `${i + 1}<small>${save.stars[i] ? "★".repeat(save.stars[i]) : ""}</small>`;
      b.setAttribute("aria-label", `Bölüm ${i + 1}, en az ${lv.par} hamle${save.stars[i] ? ", " + save.stars[i] + " yıldız" : ""}${open ? "" : ", kilitli"}`);
      b.addEventListener("click", () => { audio(); startLevel(i); });
      box.appendChild(b);
    });
  }
  $("open-menu").addEventListener("click", () => { renderLevels(); $("menu").hidden = false; });
  $("start").addEventListener("click", () => { audio(); startLevel(save.cur || 0); });
  $("next").addEventListener("click", () => { audio(); startLevel(L + 1); });
  $("replay").addEventListener("click", () => { audio(); startLevel(L); });
  $("undo").addEventListener("click", () => { if (won || !hist.length) return; const h = hist.pop(); S = h.s; moves = h.moves; lastCh = h.lastCh; clearHint(); place(); hud(); tone(250, 0.06, "sine", 0.05); });
  $("reset").addEventListener("click", () => { if (!won) startLevel(L); });
  $("hint").addEventListener("click", () => { audio(); hint(); });

  L = save.cur || 0; S = LEVELS[L].b; build(); hud(); renderLevels();
  window.__op = { LEVELS, parse, range, slide, solve, solved, move, startLevel, hint, get S() { return S; }, get moves() { return moves; }, get won() { return won; } };
})();
