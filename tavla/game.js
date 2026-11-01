/* Tavla — aile oyunu */
(() => {
  "use strict";
  const $ = (id) => document.getElementById(id);
  const cv = $("cv"), ctx = cv.getContext("2d"), stage = $("stage");
  const SAVE_KEY = "tavla";

  /* ---------- kural motoru ----------
     pos[i] > 0: oyuncu 0 (beyaz) pulları, < 0: oyuncu 1 (kırmızı) pulları
     Oyuncu 0: 23 → 0 yönünde yürür, evi 0..5. Oyuncu 1: 0 → 23 yönünde, evi 18..23. */
  const SGN = [1, -1], DIR = [-1, 1];
  function initial() {
    const pos = new Array(24).fill(0);
    pos[23] = 2; pos[12] = 5; pos[7] = 3; pos[5] = 5;
    pos[0] = -2; pos[11] = -5; pos[16] = -3; pos[18] = -5;
    return { pos, bar: [0, 0], off: [0, 0] };
  }
  const clone = (s) => ({ pos: s.pos.slice(), bar: s.bar.slice(), off: s.off.slice() });
  const own = (s, p, i) => (s.pos[i] * SGN[p] > 0 ? Math.abs(s.pos[i]) : 0);
  const opp = (s, p, i) => (s.pos[i] * SGN[p] < 0 ? Math.abs(s.pos[i]) : 0);
  function allHome(s, p) {
    if (s.bar[p]) return false;
    for (let i = 0; i < 24; i++) { if (own(s, p, i) && (p === 0 ? i > 5 : i < 18)) return false; }
    return true;
  }
  // tek adımın hedefi: sayı, "off" ya da null (yasak)
  function target(s, p, from, d) {
    if (s.bar[p] && from !== "bar") return null;
    let src;
    if (from === "bar") { if (!s.bar[p]) return null; src = p === 0 ? 24 : -1; }
    else { if (!own(s, p, from)) return null; src = from; }
    const t = src + DIR[p] * d;
    if (t >= 0 && t <= 23) return opp(s, p, t) >= 2 ? null : t;
    if (from === "bar" || !allHome(s, p)) return null;
    const dist = p === 0 ? src + 1 : 24 - src;
    if (d === dist) return "off";
    if (d > dist) {
      // daha geride pul varsa büyük zarla toplanamaz
      if (p === 0) { for (let i = src + 1; i <= 5; i++) if (own(s, p, i)) return null; }
      else { for (let i = 18; i < src; i++) if (own(s, p, i)) return null; }
      return "off";
    }
    return null;
  }
  function apply(s, p, st) {
    const n = clone(s), g = SGN[p];
    if (st.from === "bar") n.bar[p]--; else n.pos[st.from] -= g;
    if (st.to === "off") n.off[p]++;
    else {
      if (opp(n, p, st.to) === 1) { n.pos[st.to] = 0; n.bar[1 - p]++; }
      n.pos[st.to] += g;
    }
    return n;
  }
  // zarlarla yapılabilecek bütün yasal dizileri üret (en çok zar kullanma ve büyük zar kuralı dahil)
  function sequences(s, p, dice) {
    const out = [];
    const rec = (st, left, path) => {
      let moved = false;
      const tried = new Set();
      for (let k = 0; k < left.length; k++) {
        const d = left[k]; if (tried.has(d)) continue; tried.add(d);
        const rest = left.slice(0, k).concat(left.slice(k + 1));
        const sources = st.bar[p] ? ["bar"] : [];
        if (!st.bar[p]) for (let i = 0; i < 24; i++) if (own(st, p, i)) sources.push(i);
        for (const f of sources) {
          const t = target(st, p, f, d);
          if (t === null) continue;
          moved = true;
          const step = { from: f, to: t, d };
          rec(apply(st, p, step), rest, path.concat([step]));
        }
      }
      if (!moved) out.push({ path, end: st });
    };
    rec(s, dice.slice(), []);
    const maxLen = Math.max(...out.map(o => o.path.length));
    let res = out.filter(o => o.path.length === maxLen);
    if (maxLen === 1 && dice.length === 2 && dice[0] !== dice[1]) {
      const big = Math.max(dice[0], dice[1]);
      if (res.some(o => o.path[0].d === big)) res = res.filter(o => o.path[0].d === big);
    }
    return res;
  }
  const pip = (s, p) => { let n = s.bar[p] * 25; for (let i = 0; i < 24; i++) n += own(s, p, i) * (p === 0 ? i + 1 : 24 - i); return n; };

  /* ---------- bilgisayar ---------- */
  function evaluate(s, p) {
    const o = 1 - p;
    let v = (pip(s, o) - pip(s, p)) * 1.0 + s.bar[o] * 10 + s.off[p] * 4;
    const race = isRace(s);
    let run = 0, best = 0;
    for (let i = 0; i < 24; i++) {
      const n = own(s, p, i), home = p === 0 ? i <= 5 : i >= 18, oppHome = p === 0 ? i >= 18 : i <= 5;
      if (n >= 2) { v += 2.5 + (home ? 3 : 0) + (oppHome ? 1.5 : 0); run++; best = Math.max(best, run); } else run = 0;
      if (n === 1 && !race) {
        // bu tek pulu vurabilecek rakip pulları (1..12 uzaklıkta, rakibin yönünde arkada)
        let shots = 0;
        for (let k = 1; k <= 12; k++) {
          const src = i - DIR[o] * k;
          const has = src >= 0 && src <= 23 ? opp(s, p, src) > 0 : (src === (o === 0 ? 24 : -1) && s.bar[o] > 0);
          if (has) shots += k <= 6 ? 2 : 1;
        }
        v -= shots ? 4 + shots * 1.2 : 1;
      }
    }
    v += best >= 3 ? best * 2.5 : 0;
    return v;
  }
  function isRace(s) {
    // temas yoksa: beyazın en geri pulu kırmızının en ileri pulunun önünde
    let w = -1, r = 24;
    for (let i = 0; i < 24; i++) { if (s.pos[i] > 0) w = Math.max(w, i); if (s.pos[i] < 0) r = Math.min(r, i); }
    return !s.bar[0] && !s.bar[1] && w < r;
  }
  function aiChoose(s, p, dice, lvl) {
    const seqs = sequences(s, p, dice);
    if (!seqs[0].path.length) return [];
    const scored = seqs.map(q => ({ q, v: evaluate(q.end, p) + (lvl === 0 ? Math.random() * 45 : Math.random() * 0.3) }));
    scored.sort((a, b) => b.v - a.v);
    return scored[0].q.path;
  }

  /* ---------- ses ---------- */
  let AC = null, soundOn = true;
  function audio() { try { AC = AC || new (window.AudioContext || window.webkitAudioContext)(); if (AC.state === "suspended") AC.resume(); } catch (e) {} }
  function tone(f, d = 0.08, type = "triangle", vol = 0.06, slide = 0) {
    if (!soundOn || !AC) return;
    const t = AC.currentTime, o = AC.createOscillator(), g = AC.createGain();
    o.type = type; o.frequency.setValueAtTime(f, t);
    if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(30, f + slide), t + d);
    g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + d);
    o.connect(g).connect(AC.destination); o.start(t); o.stop(t + d + 0.02);
  }
  const SND = {
    dice: () => { for (let i = 0; i < 5; i++) setTimeout(() => tone(300 + Math.random() * 400, 0.04, "square", 0.04), i * 45); },
    move: () => tone(520, 0.06, "sine", 0.06, -120),
    hit: () => { tone(200, 0.15, "square", 0.06, -80); setTimeout(() => tone(150, 0.15, "square", 0.05), 80); },
    off: () => tone(880, 0.1, "sine", 0.06, 200),
    win: () => [523, 659, 784, 1046].forEach((f, i) => setTimeout(() => tone(f, 0.2), i * 130)),
    no: () => tone(160, 0.15, "square", 0.04),
  };

  /* ---------- oyun durumu ---------- */
  let CFG = { mode: "ai", level: 1, len: 3, names: ["Enes", "Baba"] };
  let SAVE = { wins: 0, losses: 0 };
  try { SAVE = Object.assign(SAVE, JSON.parse(localStorage.getItem(SAVE_KEY) || "{}")); } catch (e) {}
  const store = () => { try { localStorage.setItem(SAVE_KEY, JSON.stringify(SAVE)); } catch (e) {} };
  let G = null, M = null, timers = [];
  const later = (sec, fn) => { const id = setTimeout(fn, sec * 1000); timers.push(id); };
  const isAI = (p) => CFG.mode === "ai" && p === 1;

  function newMatch() { M = { pts: [0, 0], game: 0 }; newGame(); }
  function newGame() {
    timers.forEach(clearTimeout); timers = [];
    M.game++;
    G = { s: initial(), turn: M.game % 2 === 1 ? (Math.random() < 0.5 ? 0 : 1) : M.lastWinner ?? 0, dice: [], left: [], seqs: null, hist: [], sel: null, phase: "roll", over: false, anim: null, hintStep: null };
    if (M.game === 1) G.turn = Math.random() < 0.5 ? 0 : 1;
    $("over").hidden = true;
    renderTop();
    startTurn();
  }
  function startTurn() {
    G.phase = "roll"; G.dice = []; G.left = []; G.seqs = null; G.hist = []; G.sel = null; G.hintStep = null;
    renderTop();
    setStatus(isAI(G.turn) ? `${CFG.names[1]} zar atıyor…` : `${CFG.names[G.turn]}: zar at!`);
    updateButtons();
    if (isAI(G.turn)) later(0.9, roll);
  }
  function roll() {
    if (G.phase !== "roll" || G.over) return;
    audio(); SND.dice();
    const a = 1 + Math.floor(Math.random() * 6), b = 1 + Math.floor(Math.random() * 6);
    G.dice = a === b ? [a, a, a, a] : [a, b];
    G.rollAnim = 0.5;
    G.phase = "move";
    G.left = G.dice.slice();
    G.seqs = sequences(G.s, G.turn, G.dice);
    G.hist = [];
    const p = G.turn;
    if (!G.seqs[0].path.length) {
      setStatus(`${CFG.names[p]}: ${a}-${b} geldi, oynayacak hamle yok.`);
      SND.no(); updateButtons();
      later(1.6, endTurn);
      return;
    }
    if (isAI(p)) {
      setStatus(`${CFG.names[p]}: ${a}${a === b ? "-" + a + " (çift!)" : "-" + b}`);
      const path = aiChoose(G.s, p, G.dice, CFG.level);
      path.forEach((st, k) => later(0.7 + k * 0.6, () => doStep(st)));
      later(0.7 + path.length * 0.6 + 0.3, endTurn);
    } else {
      setStatus(`${CFG.names[p]}: ${a}${a === b ? "-" + a + " çift! Dört kez oyna." : "-" + b} · pula dokun, sonra hedefe.`);
      if (G.s.bar[p]) G.sel = "bar";
    }
    updateButtons();
  }
  const legalSteps = () => (G.seqs || []).filter(q => q.path.length).map(q => q.path[0]);
  function doStep(st) {
    const p = G.turn;
    G.hist.push({ s: clone(G.s), seqs: G.seqs, left: G.left.slice() });
    const hit = st.to !== "off" && opp(G.s, p, st.to) === 1;
    G.anim = { from: st.from, to: st.to, p, t: 0 };
    G.s = apply(G.s, p, st);
    G.seqs = G.seqs.filter(q => q.path.length && sameStep(q.path[0], st)).map(q => ({ path: q.path.slice(1), end: q.end }));
    const k = G.left.indexOf(st.d); if (k >= 0) G.left.splice(k, 1);
    hit ? SND.hit() : st.to === "off" ? SND.off() : SND.move();
    G.sel = G.s.bar[p] && legalSteps().length ? "bar" : null; G.hintStep = null;
    if (G.s.off[p] === 15) { finishGame(p); return; }
    if (!isAI(p) && !legalSteps().length) setStatus(`${CFG.names[p]}: hamleler bitti. ✔ Sırayı bitir ya da ↩ geri al.`);
    updateButtons();
  }
  const sameStep = (a, b) => a.from === b.from && a.to === b.to && a.d === b.d;
  function undo() {
    if (!G.hist.length || isAI(G.turn) || G.over) return;
    const h = G.hist.pop(); G.s = h.s; G.seqs = h.seqs; G.left = h.left; G.sel = G.s.bar[G.turn] ? "bar" : null;
    setStatus(`${CFG.names[G.turn]}: hamle geri alındı.`);
    updateButtons();
  }
  function endTurn() {
    if (G.over) return;
    if (!isAI(G.turn) && legalSteps().length && G.phase === "move") return;
    G.turn = 1 - G.turn;
    startTurn();
  }
  function finishGame(p) {
    G.over = true; G.phase = "over";
    const mars = G.s.off[1 - p] === 0;
    const pts = mars ? 2 : 1;
    M.pts[p] += pts; M.lastWinner = p;
    SND.win(); renderTop(); updateButtons();
    const matchOver = M.pts[p] >= CFG.len;
    if (matchOver && CFG.mode === "ai") { if (p === 0) SAVE.wins++; else SAVE.losses++; store(); }
    later(1.0, () => {
      $("over-title").textContent = matchOver ? `${CFG.names[p]} maçı kazandı! 🏆` : `${CFG.names[p]} oyunu kazandı!`;
      $("over-text").textContent = (mars ? "MARS! 2 sayı. " : "1 sayı. ") + `Skor: ${CFG.names[0]} ${M.pts[0]} – ${M.pts[1]} ${CFG.names[1]}` +
        (matchOver && CFG.mode === "ai" ? ` · Bilgisayara karşı: ${SAVE.wins} galibiyet, ${SAVE.losses} yenilgi` : "");
      $("over-next").hidden = matchOver;
      $("over").hidden = false; ($("over-next").hidden ? $("over-new") : $("over-next")).focus();
    });
  }

  /* ---------- arayüz ---------- */
  function setStatus(s) { $("status").textContent = s; }
  function renderTop() {
    $("name0").textContent = CFG.names[0]; $("name1").textContent = CFG.names[1];
    $("pts0").textContent = M ? M.pts[0] : 0; $("pts1").textContent = M ? M.pts[1] : 0;
    $("match").textContent = CFG.len === 1 ? "tek oyun" : `${CFG.len} sayılık maç`;
    document.querySelector(".s0").classList.toggle("cur", !!G && G.turn === 0 && !G.over);
    document.querySelector(".s1").classList.toggle("cur", !!G && G.turn === 1 && !G.over);
  }
  function updateButtons() {
    const human = G && !isAI(G.turn) && !G.over;
    $("roll").hidden = !(human && G.phase === "roll");
    $("undo").hidden = !(human && G.phase === "move");
    $("undo").disabled = !G.hist.length;
    $("hint").hidden = !(human && G.phase === "move" && legalSteps().length);
    $("end").hidden = !(human && G.phase === "move" && !legalSteps().length && G.seqs && G.hist.length);
    renderTop();
  }
  function hint() {
    if (!G || G.phase !== "move" || isAI(G.turn)) return;
    // kalan zarlar için en iyi dizinin ilk adımı
    const p = G.turn, best = aiChoose(G.s, p, G.left, 1);
    const ok = best.length && legalSteps().some(st => sameStep(st, best[0])) ? best[0] : legalSteps()[0];
    if (ok) { G.hintStep = ok; G.sel = ok.from; setStatus("💡 Parlayan pulu parlayan yere oyna."); }
  }

  /* ---------- çizim ---------- */
  const BW = 900, BH = 560, L0 = 20, MID = 395, BAR = 50, PW = 62.5, TRAY = 830, R = 26;
  let W = 0, H = 0, sc = 1, ox = 0, oy = 0, dpr = 1;
  function resize() {
    const r = stage.getBoundingClientRect(); dpr = Math.min(2, window.devicePixelRatio || 1);
    W = r.width; H = r.height; cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr);
    sc = Math.min(W / BW, H / BH); ox = (W - BW * sc) / 2; oy = (H - BH * sc) / 2;
  }
  function pointX(i) {
    if (i <= 5) return MID + BAR + (5 - i + 0.5) * PW;
    if (i <= 11) return L0 + (11 - i + 0.5) * PW;
    if (i <= 17) return L0 + (i - 12 + 0.5) * PW;
    return MID + BAR + (i - 18 + 0.5) * PW;
  }
  const isTop = (i) => i >= 12;
  function checkerPos(i, k, n) {
    const step = n > 5 ? Math.min(2 * R, (210 - 2 * R) / (n - 1)) : 2 * R;
    const x = pointX(i), y = isTop(i) ? 20 + R + k * step : BH - 20 - R - k * step;
    return [x, y];
  }
  function drawChecker(x, y, p, glow) {
    ctx.fillStyle = "rgba(0,0,0,.35)"; ctx.beginPath(); ctx.arc(x + 2, y + 3, R, 0, 7); ctx.fill();
    const g = ctx.createRadialGradient(x - 8, y - 8, 3, x, y, R);
    if (p === 0) { g.addColorStop(0, "#FFFFFF"); g.addColorStop(1, "#D8CDB8"); } else { g.addColorStop(0, "#F05A4F"); g.addColorStop(1, "#8E1E19"); }
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, R, 0, 7); ctx.fill();
    ctx.strokeStyle = p === 0 ? "#A89A80" : "#5E120E"; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(x, y, R - 6, 0, 7); ctx.stroke();
    if (glow) { ctx.strokeStyle = "#F2C14E"; ctx.lineWidth = 4; ctx.beginPath(); ctx.arc(x, y, R + 2, 0, 7); ctx.stroke(); }
  }
  function drawDie(x, y, v, used, p) {
    const s = 46;
    ctx.globalAlpha = used ? 0.3 : 1;
    ctx.fillStyle = p === 0 ? "#FBF6EC" : "#C6302A";
    ctx.beginPath(); ctx.roundRect ? ctx.roundRect(x - s / 2, y - s / 2, s, s, 9) : ctx.rect(x - s / 2, y - s / 2, s, s); ctx.fill();
    ctx.strokeStyle = "rgba(0,0,0,.3)"; ctx.lineWidth = 2; ctx.stroke();
    ctx.fillStyle = p === 0 ? "#2B1A0E" : "#fff";
    const P = { 1: [[0, 0]], 2: [[-1, -1], [1, 1]], 3: [[-1, -1], [0, 0], [1, 1]], 4: [[-1, -1], [1, -1], [-1, 1], [1, 1]], 5: [[-1, -1], [1, -1], [0, 0], [-1, 1], [1, 1]], 6: [[-1, -1], [1, -1], [-1, 0], [1, 0], [-1, 1], [1, 1]] }[v];
    for (const [a, b] of P) { ctx.beginPath(); ctx.arc(x + a * 12, y + b * 12, 4.6, 0, 7); ctx.fill(); }
    ctx.globalAlpha = 1;
  }
  function draw() {
    ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.clearRect(0, 0, cv.width, cv.height);
    if (!G) return;
    ctx.setTransform(sc * dpr, 0, 0, sc * dpr, ox * dpr, oy * dpr);
    const t = performance.now() / 1000;
    // çerçeve ve keçe
    ctx.fillStyle = "#5C3A1E"; ctx.beginPath(); ctx.roundRect ? ctx.roundRect(0, 0, BW, BH, 18) : ctx.rect(0, 0, BW, BH); ctx.fill();
    ctx.fillStyle = "#E3C89A"; ctx.fillRect(L0, 20, MID - L0, BH - 40); ctx.fillRect(MID + BAR, 20, TRAY - 10 - MID - BAR, BH - 40);
    ctx.fillStyle = "#4A2E16"; ctx.fillRect(MID, 10, BAR, BH - 20);
    ctx.fillStyle = "#3A2310"; ctx.fillRect(TRAY, 20, 50, BH / 2 - 30); ctx.fillRect(TRAY, BH / 2 + 10, 50, BH / 2 - 30);
    // üçgenler
    const legal = G.phase === "move" && !isAI(G.turn) ? legalSteps() : [];
    const sources = new Set(legal.map(s => s.from));
    const targets = G.sel !== null ? legal.filter(s => s.from === G.sel) : [];
    for (let i = 0; i < 24; i++) {
      const x = pointX(i), top = isTop(i);
      ctx.fillStyle = i % 2 ? "#8E2B1F" : "#2F2318";
      ctx.beginPath(); ctx.moveTo(x - PW / 2 + 2, top ? 20 : BH - 20); ctx.lineTo(x + PW / 2 - 2, top ? 20 : BH - 20); ctx.lineTo(x, top ? 235 : BH - 235); ctx.closePath(); ctx.fill();
      if (targets.some(s => s.to === i)) {
        ctx.fillStyle = `rgba(242,193,78,${0.45 + 0.25 * Math.sin(t * 6)})`;
        ctx.beginPath(); ctx.moveTo(x - PW / 2 + 2, top ? 20 : BH - 20); ctx.lineTo(x + PW / 2 - 2, top ? 20 : BH - 20); ctx.lineTo(x, top ? 235 : BH - 235); ctx.closePath(); ctx.fill();
      }
      // sayı etiketi (oynayan oyuncuya göre 1..24)
      ctx.fillStyle = "rgba(60,36,20,.45)"; ctx.font = "700 11px Rubik, sans-serif"; ctx.textAlign = "center";
      const num = (G.turn === 1 && CFG.mode === "2p") ? 24 - i : i + 1;
      ctx.fillText(num, x, top ? 14 : BH - 6);
    }
    // pullar
    const anim = G.anim && G.anim.t < 1 ? G.anim : null;
    for (let i = 0; i < 24; i++) {
      const n = Math.abs(G.s.pos[i]); if (!n) continue;
      const p = G.s.pos[i] > 0 ? 0 : 1;
      for (let k = 0; k < n; k++) {
        if (anim && anim.to === i && k === n - 1) continue;
        const [x, y] = checkerPos(i, k, n);
        const glow = k === n - 1 && (G.sel === i || (G.sel === null && sources.has(i)));
        drawChecker(x, y, p, glow);
      }
      if (n > 5) {
        const [x, y] = checkerPos(i, n - 1, n);
        ctx.fillStyle = p === 0 ? "#3B2414" : "#fff"; ctx.font = "800 16px Rubik, sans-serif"; ctx.textAlign = "center"; ctx.textBaseline = "middle";
        ctx.fillText(n, x, y); ctx.textBaseline = "alphabetic";
      }
    }
    // kırık pullar (bar)
    for (const p of [0, 1]) {
      for (let k = 0; k < G.s.bar[p]; k++) {
        const y = p === 0 ? BH / 2 + 40 + k * 20 : BH / 2 - 40 - k * 20;
        drawChecker(MID + BAR / 2, y, p, G.sel === "bar" && p === G.turn && k === G.s.bar[p] - 1);
      }
    }
    // toplanan pullar
    for (const p of [0, 1]) {
      for (let k = 0; k < G.s.off[p]; k++) {
        ctx.fillStyle = p === 0 ? "#EDE4D2" : "#B32A24";
        const y = p === 0 ? BH - 26 - k * 15 : 26 + k * 15 - 10;
        ctx.fillRect(TRAY + 6, y, 38, 11);
        ctx.strokeStyle = "rgba(0,0,0,.3)"; ctx.strokeRect(TRAY + 6, y, 38, 11);
      }
    }
    if (targets.some(s => s.to === "off")) {
      const p = G.turn;
      ctx.strokeStyle = `rgba(242,193,78,${0.6 + 0.3 * Math.sin(t * 6)})`; ctx.lineWidth = 5;
      ctx.strokeRect(TRAY + 2, p === 0 ? BH / 2 + 12 : 22, 46, BH / 2 - 34);
      ctx.fillStyle = "#F2C14E"; ctx.font = "800 13px Rubik, sans-serif"; ctx.textAlign = "center";
      ctx.fillText("TOPLA", TRAY + 25, p === 0 ? BH / 2 + 30 : BH / 2 - 26);
    }
    // ipucu
    if (G.hintStep) {
      const h = G.hintStep;
      ctx.strokeStyle = "#7CF29B"; ctx.lineWidth = 4; ctx.setLineDash([8, 6]);
      const fx = h.from === "bar" ? MID + BAR / 2 : pointX(h.from), fy = h.from === "bar" ? BH / 2 : (isTop(h.from) ? 120 : BH - 120);
      const tx = h.to === "off" ? TRAY + 25 : pointX(h.to), ty = h.to === "off" ? (G.turn === 0 ? BH - 80 : 80) : (isTop(h.to) ? 120 : BH - 120);
      ctx.beginPath(); ctx.moveTo(fx, fy); ctx.lineTo(tx, ty); ctx.stroke(); ctx.setLineDash([]);
    }
    // hareket animasyonu
    if (anim) {
      anim.t += 1 / 18;
      const k = Math.min(1, anim.t), e = k * k * (3 - 2 * k);
      const from = anim.from === "bar" ? [MID + BAR / 2, BH / 2] : checkerPos(anim.from, Math.max(0, Math.abs(G.s.pos[anim.from])), Math.abs(G.s.pos[anim.from]) + 1);
      const to = anim.to === "off" ? [TRAY + 25, anim.p === 0 ? BH - 60 : 60] : checkerPos(anim.to, Math.abs(G.s.pos[anim.to]) - 1, Math.abs(G.s.pos[anim.to]));
      drawChecker(from[0] + (to[0] - from[0]) * e, from[1] + (to[1] - from[1]) * e - Math.sin(k * Math.PI) * 40, anim.p, false);
    }
    // zarlar
    if (G.dice.length) {
      const cx = G.turn === 0 ? MID + BAR + 185 : L0 + 185, cy = BH / 2;
      const used = G.dice.map(() => false), left = G.left.slice();
      G.dice.forEach((d, i) => { const k = left.indexOf(d); if (k >= 0) left.splice(k, 1); else used[i] = true; });
      const jig = G.rollAnim > 0 ? (G.rollAnim -= 1 / 60, 1) : 0;
      G.dice.forEach((d, i) => {
        const x = cx + (i - (G.dice.length - 1) / 2) * 54 + (jig ? (Math.random() - 0.5) * 8 : 0);
        drawDie(x, cy + (jig ? (Math.random() - 0.5) * 8 : 0), jig ? 1 + Math.floor(Math.random() * 6) : d, used[i], G.turn);
      });
    }
  }

  /* ---------- tıklama ---------- */
  function hit(x, y) {
    if (x >= TRAY && x <= TRAY + 50) return "off";
    if (x >= MID && x <= MID + BAR) return "bar";
    const top = y < BH / 2;
    for (let i = 0; i < 24; i++) if (isTop(i) === top && Math.abs(pointX(i) - x) <= PW / 2) return i;
    return null;
  }
  cv.addEventListener("pointerdown", (e) => {
    audio();
    if (!G || G.over || isAI(G.turn)) return;
    if (G.phase === "roll") { roll(); return; }
    if (G.phase !== "move") return;
    const r = cv.getBoundingClientRect(), x = (e.clientX - r.left - ox) / sc, y = (e.clientY - r.top - oy) / sc;
    const h = hit(x, y); if (h === null) return;
    const legal = legalSteps();
    if (G.sel !== null) {
      const cand = legal.filter(s => s.from === G.sel && s.to === h).sort((a, b) => a.d - b.d);
      if (cand.length) { doStep(cand[0]); return; }
    }
    if (legal.some(s => s.from === h)) {
      G.sel = h; G.hintStep = null;
      // tek hedef varsa doğrudan oyna
      const tg = [...new Set(legal.filter(s => s.from === h).map(s => String(s.to)))];
      if (tg.length === 1 && e.detail >= 2) doStep(legal.find(s => s.from === h));
    } else if (G.sel !== null && h !== G.sel) { SND.no(); }
  });
  cv.addEventListener("dblclick", (e) => e.preventDefault());

  $("roll").addEventListener("click", () => { audio(); roll(); });
  $("undo").addEventListener("click", undo);
  $("hint").addEventListener("click", hint);
  $("end").addEventListener("click", () => { audio(); endTurn(); });
  $("sound").addEventListener("click", () => {
    soundOn = !soundOn; $("ic-on").hidden = !soundOn; $("ic-off").hidden = soundOn;
    $("sound").setAttribute("aria-pressed", soundOn); $("sound").setAttribute("aria-label", soundOn ? "Sesi kapat" : "Sesi aç");
  });
  document.addEventListener("keydown", (e) => {
    if (!$("setup").hidden || !$("over").hidden || !G) return;
    if (e.key === " " && G.phase === "roll" && !isAI(G.turn)) { e.preventDefault(); roll(); }
    else if ((e.key === "z" || e.key === "Z") && (e.ctrlKey || e.metaKey)) undo();
    else if (e.key === "Enter" && !$("end").hidden) endTurn();
  });

  /* ---------- kurulum ---------- */
  const form = $("setup-form");
  const syncForm = () => { $("f-level").hidden = form.mode.value !== "ai"; if (form.mode.value === "ai" && $("n1").value === "Baba") $("n1").value = "Bilgisayar"; if (form.mode.value === "2p" && $("n1").value === "Bilgisayar") $("n1").value = "Baba"; };
  form.addEventListener("change", syncForm);
  form.addEventListener("submit", (e) => {
    e.preventDefault(); audio();
    CFG = { mode: form.mode.value, level: +form.level.value, len: +form.len.value,
      names: [$("n0").value.trim() || "Beyaz", $("n1").value.trim() || (form.mode.value === "ai" ? "Bilgisayar" : "Kırmızı")] };
    $("setup").hidden = true;
    newMatch();
  });
  $("settings").addEventListener("click", () => { timers.forEach(clearTimeout); timers = []; $("over").hidden = true; $("setup").hidden = false; });
  $("over-next").addEventListener("click", () => { $("over").hidden = true; newGame(); });
  $("over-new").addEventListener("click", () => { $("over").hidden = true; $("setup").hidden = false; });
  syncForm();

  /* ---------- döngü ---------- */
  function loop() {
    const sr = stage.getBoundingClientRect();
    if (Math.abs(sr.width - W) > 0.5 || Math.abs(sr.height - H) > 0.5) resize();
    draw();
    requestAnimationFrame(loop);
  }
  resize();
  M = { pts: [0, 0], game: 0 }; G = { s: initial(), turn: 0, dice: [], left: [], seqs: null, hist: [], sel: null, phase: "idle", over: false };
  updateButtons(); $("roll").hidden = true; $("undo").hidden = true; $("hint").hidden = true;
  requestAnimationFrame(loop);

  // test kancası
  window.__tavla = { initial, sequences, target, apply, pip, aiChoose, evaluate, get G() { return G; }, get M() { return M; }, roll, doStep, endTurn, undo, legalSteps, CFG: () => CFG, setCFG: (c) => { CFG = Object.assign(CFG, c); }, newMatch };
})();
