/* Dokuz Taş — iki kişilik değirmen oyunu */
(() => {
  "use strict";
  const $ = (id) => document.getElementById(id);
  const SAVE_KEY = "dokuz-tas", SOUND_KEY = "dokuz-tas-ses";
  const NS = "http://www.w3.org/2000/svg";

  /* ---------- tahta ---------- */
  // 3 iç içe kare, her birinde 8 nokta: köşe ve kenar ortaları (saat yönünde, sol üstten)
  const PT = [];
  for (let ring = 0; ring < 3; ring++) {
    const o = 50 + ring * 100, e = 700 - o, m = 350;
    PT.push([o, o], [m, o], [e, o], [e, m], [e, e], [m, e], [o, e], [o, m]);
  }
  const ADJ = PT.map(() => []);
  const link = (a, b) => { ADJ[a].push(b); ADJ[b].push(a); };
  for (let r = 0; r < 3; r++) for (let k = 0; k < 8; k++) link(r * 8 + k, r * 8 + (k + 1) % 8);
  for (let r = 0; r < 2; r++) for (const k of [1, 3, 5, 7]) link(r * 8 + k, (r + 1) * 8 + k);
  const MILLS = [];
  for (let r = 0; r < 3; r++) for (const k of [0, 2, 4, 6]) MILLS.push([r * 8 + k, r * 8 + k + 1, r * 8 + (k + 2) % 8]);
  for (const k of [1, 3, 5, 7]) MILLS.push([k, 8 + k, 16 + k]);
  const MILLS_OF = PT.map((_, i) => MILLS.filter((m) => m.includes(i)));

  /* ---------- ses ---------- */
  let AC = null, soundOn = true, fast = false;
  try { soundOn = localStorage.getItem(SOUND_KEY) !== "0"; } catch (e) {}
  function audio() { try { AC = AC || new (window.AudioContext || window.webkitAudioContext)(); if (AC.state === "suspended") AC.resume(); } catch (e) {} }
  function tone(f, d = 0.1, type = "triangle", vol = 0.06, delay = 0) {
    if (!AC || !soundOn || fast) return;
    const t = AC.currentTime + delay, o = AC.createOscillator(), g = AC.createGain();
    o.type = type; o.frequency.setValueAtTime(f, t);
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + 0.01); g.gain.exponentialRampToValueAtTime(0.0001, t + d);
    o.connect(g).connect(AC.destination); o.start(t); o.stop(t + d + 0.02);
  }
  const SND = {
    put: () => tone(220, 0.08, "square", 0.05),
    slide: () => tone(330, 0.1, "triangle", 0.05),
    mill: () => [523, 659, 784].forEach((f, i) => tone(f, 0.16, "triangle", 0.07, i * 0.08)),
    take: () => tone(160, 0.2, "sawtooth", 0.05),
    no: () => tone(200, 0.12, "sine", 0.05),
    win: () => [523, 659, 784, 1046].forEach((f, i) => tone(f, 0.22, "triangle", 0.08, i * 0.13)),
  };
  function renderSound() {
    $("ic-on").hidden = !soundOn; $("ic-off").hidden = soundOn;
    $("sound").setAttribute("aria-label", soundOn ? "Sesi kapat" : "Sesi aç"); $("sound").setAttribute("aria-pressed", String(soundOn));
  }
  $("sound").addEventListener("click", () => { soundOn = !soundOn; try { localStorage.setItem(SOUND_KEY, soundOn ? "1" : "0"); } catch (e) {} renderSound(); });
  renderSound();

  /* ---------- kurallar ---------- */
  // durum: b[24] (-1 boş, 0/1), hand[2] eldeki taş, n[2] tahtadaki taş, turn, quiet (taş alınmadan geçen hamle)
  const fresh = () => ({ b: new Array(24).fill(-1), hand: [9, 9], n: [0, 0], turn: 0, quiet: 0 });
  const clone = (s) => ({ b: s.b.slice(), hand: s.hand.slice(), n: s.n.slice(), turn: s.turn, quiet: s.quiet });
  const inMill = (b, i) => b[i] >= 0 && MILLS_OF[i].some((m) => m.every((j) => b[j] === b[i]));
  function removable(b, p) { // p'nin alınabilecek taşları
    const own = []; for (let i = 0; i < 24; i++) if (b[i] === p) own.push(i);
    const free = own.filter((i) => !inMill(b, i));
    return free.length ? free : own;
  }
  const canFly = (s, p) => FLY && s.hand[p] === 0 && s.n[p] === 3;
  function steps(s, p) { // [from, to] çiftleri; from -1 = yerleştirme
    const out = [];
    if (s.hand[p] > 0) { for (let i = 0; i < 24; i++) if (s.b[i] < 0) out.push([-1, i]); return out; }
    const fly = canFly(s, p);
    for (let i = 0; i < 24; i++) {
      if (s.b[i] !== p) continue;
      if (fly) { for (let j = 0; j < 24; j++) if (s.b[j] < 0) out.push([i, j]); }
      else for (const j of ADJ[i]) if (s.b[j] < 0) out.push([i, j]);
    }
    return out;
  }
  function moves(s) { // tam hamleler: {f, t, x} x = alınan taş ya da -1
    const p = s.turn, out = [];
    for (const [f, t] of steps(s, p)) {
      const b = s.b.slice(); if (f >= 0) b[f] = -1; b[t] = p;
      if (MILLS_OF[t].some((m) => m.every((j) => b[j] === p))) for (const x of removable(b, 1 - p)) out.push({ f, t, x });
      else out.push({ f, t, x: -1 });
    }
    return out;
  }
  function apply(s, m) {
    const n = clone(s), p = s.turn;
    if (m.f >= 0) n.b[m.f] = -1; else { n.hand[p]--; n.n[p]++; }
    n.b[m.t] = p;
    if (m.x >= 0) { n.b[m.x] = -1; n.n[1 - p]--; n.quiet = 0; } else if (n.hand[0] + n.hand[1] === 0) n.quiet++;
    n.turn = 1 - p;
    return n;
  }
  // kazanan: 0/1, berabere: 2, sürüyor: -1
  function result(s) {
    for (const p of [0, 1]) if (s.hand[p] === 0 && s.n[p] < 3) return 1 - p;
    if (!steps(s, s.turn).length) return 1 - s.turn;
    if (s.quiet >= 50) return 2;
    return -1;
  }

  /* ---------- yapay zekâ ---------- */
  function evalState(s, me) {
    const op = 1 - me;
    let v = (s.n[me] + s.hand[me] - s.n[op] - s.hand[op]) * 40;
    for (const m of MILLS) {
      let a = 0, c = 0, e = 0;
      for (const j of m) { if (s.b[j] === me) a++; else if (s.b[j] === op) c++; else e++; }
      if (a === 3) v += 6; else if (c === 3) v -= 6;
      else if (a === 2 && e === 1) v += 7; else if (c === 2 && e === 1) v -= 7;
    }
    if (s.hand[me] === 0 && s.hand[op] === 0) {
      const mv = (p) => { let k = 0; for (let i = 0; i < 24; i++) if (s.b[i] === p) for (const j of ADJ[i]) if (s.b[j] < 0) k++; return k; };
      if (!canFly(s, me)) v += mv(me) * 2; if (!canFly(s, op)) v -= mv(op) * 2;
    }
    return v;
  }
  function search(s, depth, alpha, beta, me) {
    const r = result(s);
    if (r === me) return 100000 + depth; if (r === 1 - me) return -100000 - depth; if (r === 2) return 0;
    if (depth === 0) return evalState(s, me);
    const ms = moves(s); ms.sort((a, b) => (b.x >= 0) - (a.x >= 0));
    if (s.turn === me) {
      let best = -Infinity;
      for (const m of ms) { best = Math.max(best, search(apply(s, m), depth - 1, alpha, beta, me)); alpha = Math.max(alpha, best); if (alpha >= beta) break; }
      return best;
    }
    let best = Infinity;
    for (const m of ms) { best = Math.min(best, search(apply(s, m), depth - 1, alpha, beta, me)); beta = Math.min(beta, best); if (alpha >= beta) break; }
    return best;
  }
  function bestMove(s, depth, noise) {
    const me = s.turn, ms = moves(s);
    let best = ms[0], bv = -Infinity;
    for (const m of ms) {
      const v = search(apply(s, m), depth - 1, -Infinity, Infinity, me) + Math.random() * (noise || 0.5);
      if (v > bv) { bv = v; best = m; }
    }
    return best;
  }
  function aiMove(s, lvl) {
    if (lvl === 0) {
      const ms = moves(s);
      if (Math.random() < 0.35) return ms[Math.floor(Math.random() * ms.length)];
      return bestMove(s, 1, 8);
    }
    if (lvl === 1) return bestMove(s, 2, 3);
    const placing = s.hand[0] + s.hand[1] > 0;
    return bestMove(s, placing ? 4 : 5, 1);
  }

  /* ---------- oyun durumu ---------- */
  let CFG = { mode: "2p", ai: 0, names: ["Enes", "Egemen"], help: [false, true], fly: true };
  try { const s = JSON.parse(localStorage.getItem(SAVE_KEY) || "null"); if (s) CFG = Object.assign(CFG, s); } catch (e) {}
  let FLY = CFG.fly;
  let S = fresh(), over = true, sel = -1, pend = null, last = null, aiTimer = null, millLine = null;
  const isCpu = (p) => CFG.mode === "ai" && p === 1;

  function newGame() {
    clearTimeout(aiTimer); FLY = CFG.fly;
    S = fresh(); over = false; sel = -1; pend = null; last = null; millLine = null;
    $("setup").hidden = true; $("end").hidden = true;
    nextTurn();
  }
  function later(ms, fn) { if (fast) fn(); else aiTimer = setTimeout(fn, ms); }
  function nextTurn() {
    const r = result(S);
    if (r >= 0) return finish(r);
    render();
    const p = S.turn, nm = CFG.names[p];
    if (isCpu(p)) {
      setHint(`${nm} düşünüyor…`);
      later(fast ? 0 : 600, () => {
        const m = aiMove(S, CFG.ai);
        // önce taşı koy/kaydır, sonra (varsa) taş al: görünür olsun
        doStep(m.f, m.t, true);
        if (m.x >= 0) later(fast ? 0 : 800, () => doTake(m.x));
      });
      return;
    }
    if (S.hand[p] > 0) setHint(`Sıra ${nm}${sfx(nm)}: boş bir noktaya taş koy (elde ${S.hand[p]}).`);
    else if (canFly(S, p)) setHint(`${nm}, üç taşın kaldı: bir taşını seç, istediğin boş noktaya uçur!`);
    else setHint(`Sıra ${nm}${sfx(nm)}: bir taşını seç, komşu boş noktaya kaydır.`);
  }
  // insan ya da bilgisayar bir adım atar; değirmen kurulduysa pend = alma bekleniyor
  function doStep(f, t, cpu) {
    const p = S.turn;
    if (f >= 0) S.b[f] = -1; else { S.hand[p]--; S.n[p]++; }
    S.b[t] = p; last = [f, t]; sel = -1;
    const mill = MILLS_OF[t].find((m) => m.every((j) => S.b[j] === p));
    if (mill) {
      millLine = mill; SND.mill();
      pend = { p };
      render();
      if (!cpu) setHint(`Değirmen! ${CFG.names[p]}, ${CFG.names[1 - p]} adlı oyuncunun kırmızı halkalı taşlarından birini al.`);
      else setHint(`${CFG.names[p]} değirmen kurdu!`);
      return true;
    }
    f >= 0 ? SND.slide() : SND.put();
    if (S.hand[0] + S.hand[1] === 0) S.quiet++; S.turn = 1 - p; millLine = null;
    nextTurn();
    return true;
  }
  function doTake(x) {
    if (!pend) return false;
    const p = pend.p;
    if (!removable(S.b, 1 - p).includes(x)) { SND.no(); setHint("Bu taş alınamaz: değirmendeki taşlar korunur. Halkalı taşlardan birini seç."); return false; }
    S.b[x] = -1; S.n[1 - p]--; S.quiet = 0; pend = null; SND.take();
    S.turn = 1 - p; millLine = null;
    nextTurn();
    return true;
  }
  function tap(i) {
    if (over || isCpu(S.turn)) return false;
    const p = S.turn;
    if (pend) return doTake(i);
    if (S.hand[p] > 0) {
      if (S.b[i] >= 0) { SND.no(); return false; }
      return doStep(-1, i);
    }
    if (S.b[i] === p) {
      const can = steps(S, p).some(([f]) => f === i);
      if (!can) { SND.no(); setHint("Bu taşın gidebileceği boş komşu nokta yok, başka bir taş seç."); sel = -1; render(); return false; }
      sel = i; tone(440, 0.05, "sine", 0.05); render(); return true;
    }
    if (sel >= 0 && S.b[i] < 0) {
      if (steps(S, p).some(([f, t]) => f === sel && t === i)) return doStep(sel, i);
      SND.no(); setHint("Oraya gidemez: taşlar yalnızca çizgi boyunca komşu boş noktaya kayar."); return false;
    }
    SND.no(); return false;
  }
  function finish(r) {
    over = true; render();
    let title, note;
    if (r === 2) { title = "Berabere!"; note = "50 hamledir kimse taş alamadı."; }
    else {
      title = `${CFG.names[r]} kazandı!`;
      const lp = 1 - r;
      note = S.hand[lp] === 0 && S.n[lp] < 3 ? `${CFG.names[lp]} adlı oyuncunun iki taşı kaldı.` : `${CFG.names[lp]} hamle yapamadı, sıkıştı!`;
    }
    $("end-title").textContent = title; $("end-note").textContent = note; setHint(title);
    if (fast) return;
    SND.win();
    setTimeout(() => { $("end").hidden = false; $("again").focus(); }, 1000);
  }
  function sfx(name) {
    const l = name.toLocaleLowerCase("tr-TR"), v = (l.match(/[aıoueiöü]/g) || ["e"]).pop(), back = "aıou".includes(v);
    const hard = "fstkçşhp".includes(l.slice(-1));
    return `'${hard ? (back ? "ta" : "te") : (back ? "da" : "de")}`;
  }

  /* ---------- çizim ---------- */
  const svg = $("board");
  const el = (tag, attrs, parent) => { const e = document.createElementNS(NS, tag); for (const k in attrs) e.setAttribute(k, attrs[k]); (parent || svg).appendChild(e); return e; };
  for (let r = 0; r < 3; r++) { const o = 50 + r * 100; el("rect", { class: "ln", x: o, y: o, width: 700 - 2 * o, height: 700 - 2 * o, rx: 4 }); }
  el("path", { class: "ln", d: "M350 50V250M350 450V650M50 350H250M450 350H650" });
  PT.forEach(([x, y]) => el("circle", { class: "pt", cx: x, cy: y, r: 11 }));
  const layer = el("g", {});
  const hits = PT.map(([x, y], i) => {
    const h = el("circle", { class: "hit", cx: x, cy: y, r: 44, tabindex: "0", role: "button" });
    h.addEventListener("click", () => { audio(); tap(i); });
    h.addEventListener("keydown", (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); audio(); tap(i); } });
    return h;
  });
  function setHint(t) { $("hintline").textContent = t; }
  function render() {
    if (fast) return;
    layer.textContent = "";
    const p = S.turn, mine = !over && !isCpu(p);
    const st = mine && !pend ? steps(S, p) : [];
    const targets = new Set(), sources = new Set();
    for (const [f, t] of st) { if (f < 0) targets.add(t); else { sources.add(f); if (f === sel) targets.add(t); } }
    const remSet = new Set(pend ? removable(S.b, 1 - pend.p) : []);
    let hm = null;
    if (mine && CFG.help[p] && !pend) hm = bestMove(S, 2, 0.3);
    if (millLine) { const [a, , c] = millLine; el("line", { class: "mill", x1: PT[a][0], y1: PT[a][1], x2: PT[c][0], y2: PT[c][1] }, layer); }
    if (last) el("circle", { class: "lastm", cx: PT[last[1]][0], cy: PT[last[1]][1], r: 40 }, layer);
    for (let i = 0; i < 24; i++) {
      const [x, y] = PT[i], v = S.b[i];
      if (v >= 0) {
        el("circle", { class: "pc", cx: x, cy: y + 4, r: 30, fill: "rgba(0,0,0,.25)" }, layer);
        el("circle", { class: "pc", cx: x, cy: y, r: 30, fill: v === 0 ? "url(#ga)" : "url(#gz)", stroke: v === 0 ? "#B9620F" : "#1A5C9E", "stroke-width": 3 }, layer);
        if (i === sel) el("circle", { class: "sel", cx: x, cy: y, r: 38 }, layer);
        if (remSet.has(i)) el("circle", { class: "rem", cx: x, cy: y, r: 38 }, layer);
      } else if (targets.has(i) && (S.hand[p] === 0 || st.length < 24)) el("circle", { class: "dot", cx: x, cy: y, r: 12 }, layer);
      if (hm && (hm.t === i && (hm.f < 0 || hm.f === sel)) ) el("circle", { class: "best", cx: x, cy: y, r: 14 }, layer);
      if (hm && hm.f === i && sel !== i) el("circle", { class: "sel", cx: x, cy: y, r: 38, stroke: "#FFD166" }, layer);
      const can = mine && (pend ? remSet.has(i) : (S.hand[p] > 0 ? v < 0 : (v === p && sources.has(i)) || targets.has(i)));
      hits[i].setAttribute("class", "hit" + (can ? " can" : ""));
      hits[i].setAttribute("aria-label", `Nokta ${i + 1}: ${v === 0 ? CFG.names[0] + " taşı" : v === 1 ? CFG.names[1] + " taşı" : "boş"}${remSet.has(i) ? ", alınabilir" : ""}${i === sel ? ", seçili" : ""}`);
    }
    for (const q of [0, 1]) {
      $("n" + q).textContent = CFG.names[q];
      $("c" + q).textContent = S.n[q];
      $("h-" + q).innerHTML = "<i></i>".repeat(S.hand[q]);
      $("h-" + q).setAttribute("aria-label", `Elde ${S.hand[q]} taş`);
      $("s" + q).classList.toggle("cur", !over && S.turn === q);
    }
  }
  // degrade tanımları
  const defs = el("defs", {});
  defs.innerHTML = `<radialGradient id="ga" cx=".35" cy=".3" r=".75"><stop offset="0" stop-color="#FFE2B5"/><stop offset=".7" stop-color="#F08A24"/></radialGradient>
    <radialGradient id="gz" cx=".35" cy=".3" r=".75"><stop offset="0" stop-color="#CBEBFF"/><stop offset=".7" stop-color="#2A7FD4"/></radialGradient>`;
  svg.appendChild(layer);

  /* ---------- ayarlar ---------- */
  const form = $("setup-form");
  function sync() {
    const ai = form.mode.value === "ai";
    $("f-ai").hidden = !ai;
    if (ai) { if ($("in1").value === "Egemen") $("in1").value = "Bilgisayar"; $("h1").checked = false; $("h1").disabled = true; }
    else { if ($("in1").value === "Bilgisayar") $("in1").value = "Egemen"; $("h1").disabled = false; }
  }
  function fill() { form.mode.value = CFG.mode; form.ai.value = String(CFG.ai); $("in0").value = CFG.names[0]; $("in1").value = CFG.names[1]; $("h0").checked = CFG.help[0]; $("h1").checked = CFG.help[1]; $("fly").checked = CFG.fly; sync(); }
  form.addEventListener("change", (e) => { if (e.target.name === "mode") sync(); });
  form.addEventListener("submit", (e) => {
    e.preventDefault(); audio();
    const ai = form.mode.value === "ai";
    CFG = { mode: form.mode.value, ai: +form.ai.value, names: [$("in0").value.trim() || "Turuncu", $("in1").value.trim() || (ai ? "Bilgisayar" : "Mavi")], help: [$("h0").checked, ai ? false : $("h1").checked], fly: $("fly").checked };
    try { localStorage.setItem(SAVE_KEY, JSON.stringify(CFG)); } catch (_) {}
    newGame();
  });
  $("open-setup").addEventListener("click", () => { clearTimeout(aiTimer); fill(); $("end").hidden = true; $("setup").hidden = false; });
  $("again").addEventListener("click", () => { audio(); newGame(); });
  $("end-setup").addEventListener("click", () => { fill(); $("end").hidden = true; $("setup").hidden = false; });
  fill(); render(); setHint("");

  window.__dt = {
    PT, ADJ, MILLS, fresh, moves, apply, result, aiMove, bestMove, evalState, tap, newGame,
    setFast: (f) => { fast = f; }, setCFG: (c) => { CFG = Object.assign(CFG, c); FLY = CFG.fly; },
    get S() { return S; }, get over() { return over; }, get pend() { return pend; }
  };
})();
