/* Tahta Kule — aile için blok çekme oyunu */
(() => {
  "use strict";
  const $ = (id) => document.getElementById(id);
  const SAVE_KEY = "tahta-kule";
  const TOKENS = ["🦊", "🐼", "🐸", "🦁", "🐧", "🐙"];
  const DEF = ["Enes", "Egemen", "Anne", "Baba", "", ""];
  const cv = $("cv"), ctx = cv.getContext("2d");
  const VW = 600, VH = 800, BW = 62, BH = 22, GAP = 2, GROUND = 772, X0 = VW / 2 - (3 * BW + 2 * GAP) / 2;
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  cv.width = VW * dpr; cv.height = VH * dpr; ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

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
  function crash() { if (!AC) return; for (let i = 0; i < 14; i++) tone(90 + Math.random() * 260, 0.18, "square", 0.05, i * 0.05); }
  const canSpeak = "speechSynthesis" in window;
  let trVoice = null;
  function pickVoice() { if (canSpeak) trVoice = speechSynthesis.getVoices().find(v => /^tr(-|_|$)/i.test(v.lang)) || null; }
  if (canSpeak) { pickVoice(); if (speechSynthesis.addEventListener) speechSynthesis.addEventListener("voiceschanged", pickVoice); }
  function say(t) { if (!canSpeak || !trVoice) return; speechSynthesis.cancel(); const u = new SpeechSynthesisUtterance(t); u.voice = trVoice; u.lang = trVoice.lang; u.rate = 0.95; speechSynthesis.speak(u); }
  const esc = (s) => s.replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  function sfx(name) { const l = name.toLocaleLowerCase("tr-TR"), v = (l.match(/[aıoueiöü]/g) || ["e"]).pop(), back = "aıou".includes(v), hard = "fstkçşhp".includes(l.slice(-1)); return `'${hard ? (back ? "ta" : "te") : (back ? "da" : "de")}`; }

  /* ---------- kule ---------- */
  let CFG = null, T = null, rec = 0, Z = 1.5;
  const blk = () => ({ tight: Math.round((0.15 + Math.random() * 0.85) * 100) / 100, flash: 0 });
  function newGame(cfg) {
    CFG = cfg;
    T = { layers: Array.from({ length: 18 }, () => [blk(), blk(), blk()]), lean: 0, wob: 0, turn: 0, moves: CFG.players.map(() => 0), pull: null, fly: null, fall: null, over: false, cur: null, t: 0, frameMove: 0, keyPull: false };
    $("setup").hidden = true; $("over").hidden = true;
    nextTurn(true);
  }
  const helpK = () => CFG.help[T.turn] ? 0.6 : 1;
  function weakCount() { return T.layers.slice(0, -1).filter(l => !l[1] || l.filter(Boolean).length < 3).length; }
  function hf() { return Math.pow(1.05, T.layers.length - 18) * (1 + 0.12 * weakCount()); }
  function maxLayer() { const n = T.layers.length, topFull = T.layers[n - 1].every(Boolean); return topFull ? n - 2 : n - 3; }
  const can = (li, k) => !!(T.layers[li] && T.layers[li][k]) && li <= maxLayer();
  function collapses(li, k) { const l = T.layers[li].map((b, j) => j === k ? null : b); const c = l.filter(Boolean).length; return c === 0 || (c === 1 && !l[1]); }
  const safe = (li, k) => can(li, k) && !collapses(li, k) && T.layers[li][k].tight < 0.6;
  function cell(li, k) { return { x: X0 + k * (BW + GAP), y: GROUND - (li + 1) * (BH + 1) }; }

  function nextTurn(first) {
    if (!first) T.turn = (T.turn + 1) % CFG.players.length;
    T.pull = null; T.cur = null;
    renderPlayers();
    const nm = CFG.players[T.turn];
    prompt(`Sıra ${nm}${sfx(nm)}: bir blok seç ve yavaşça çek.`);
  }
  function prompt(t, speak) { $("prompt").textContent = t; if (speak !== false) say(t); }
  function renderPlayers() {
    $("players").innerHTML = CFG.players.map((q, i) => `<div class="pl${i === T.turn && !T.over ? " cur" : ""}"><span aria-hidden="true">${TOKENS[i]}</span>${esc(q)}${CFG.help[i] ? " ✨" : ""} <span class="sc">${T.moves[i]}</span></div>`).join("");
  }

  /* çekme */
  function startPull(li, k) {
    if (!T || T.over || T.fly || T.fall) return false;
    if (T.pull && T.pull.prog > 0.25 && (T.pull.li !== li || T.pull.k !== k)) { prompt("Bu bloğu çekmeye başladın, onu bitirmelisin!", false); tone(200, 0.1, "sine", 0.05); return false; }
    if (!can(li, k)) { prompt(li > maxLayer() && T.layers[li] && T.layers[li][k] ? "En üst katlardan blok alınmaz." : "Orada blok yok.", false); tone(200, 0.1, "sine", 0.05); return false; }
    if (!T.pull || T.pull.li !== li || T.pull.k !== k) T.pull = { li, k, prog: 0, moved: 0 };
    T.cur = [li, k];
    return true;
  }
  function addMove(d) { // d: bu karede çekme miktarı (piksel)
    const p = T.pull; if (!p) return;
    const b = T.layers[p.li][p.k], h = hf() * helpK();
    p.moved += d; p.prog += d / (BH * 5);
    T.wob += Math.max(0, d - 5) * 0.6 * b.tight * h + d / (BH * 5) * 6 * b.tight * h;
    if (Math.random() < d / 60) tone(140 + Math.random() * 60, 0.05, "sawtooth", 0.015);
    if (T.lean + T.wob >= 100) return topple();
    if (p.prog >= 1) finishPull();
  }
  function poke() {
    const p = T.pull; if (!p || p.prog > 0.08) return;
    const b = T.layers[p.li][p.k];
    b.flash = 1.2; T.wob += 4 * b.tight * hf() * helpK();
    tone(b.tight < 0.4 ? 700 : b.tight < 0.7 ? 450 : 250, 0.08, "triangle", 0.06);
    prompt(b.tight < 0.4 ? "Bu blok gevşek, kolay çıkar." : b.tight < 0.7 ? "Bu blok biraz sıkı." : "Bu blok çok sıkı, dikkat!", false);
    T.pull = null;
    if (T.lean + T.wob >= 100) topple();
  }
  function finishPull() {
    const { li, k } = T.pull, b = T.layers[li][k];
    T.pull = null; T.cur = null;
    if (collapses(li, k)) { T.layers[li][k] = null; return topple(); }
    T.layers[li][k] = null;
    T.lean += 3.5 * b.tight * hf() * helpK();
    T.moves[T.turn]++;
    // tepeye koy
    let top = T.layers[T.layers.length - 1];
    if (top.every(Boolean)) { top = [null, null, null]; T.layers.push(top); }
    const slot = top.findIndex(x => !x), dst = cell(T.layers.length - 1, slot), src = cell(li, k);
    T.fly = { b, x0: src.x, y0: src.y, x1: dst.x, y1: dst.y, t: 0, li: T.layers.length - 1, k: slot };
    tone(520, 0.08, "triangle", 0.06); tone(660, 0.1, "triangle", 0.06, 0.08);
  }
  function landFly() {
    const f = T.fly; T.fly = null;
    T.layers[f.li][f.k] = f.b; f.b.tight = Math.round((0.15 + Math.random() * 0.85) * 100) / 100;
    T.lean += 0.8 * hf();
    tone(300, 0.06, "square", 0.04);
    rec = Math.max(rec, T.layers.length); persist();
    if (T.lean + T.wob >= 100) return topple();
    nextTurn();
  }
  function topple() {
    if (T.fall) return;
    T.over = true; T.pull = null; T.fly = null;
    const parts = [];
    T.layers.forEach((l, li) => l.forEach((b, k) => { if (!b) return; const c = cell(li, k); parts.push({ x: c.x, y: c.y, vx: (Math.random() - 0.3) * 4 + li * 0.15, vy: -Math.random() * 2, r: 0, vr: (Math.random() - 0.5) * 0.2, li }); }));
    T.fall = parts; crash(); renderPlayers();
    const nm = CFG.players[T.turn];
    prompt(`Eyvah! ${nm} kuleyi yıktı!`);
    setTimeout(showEnd, 1800);
  }
  function showEnd() {
    const loser = T.turn, h = T.layers.length;
    $("over-title").textContent = `${CFG.players[loser]} kuleyi yıktı!`;
    $("over-tx").textContent = `Kule ${h} kata ulaştı (rekor ${rec} kat). Toplam ${T.moves.reduce((a, b) => a + b, 0)} blok çekildi.`;
    $("results").innerHTML = CFG.players.map((p, i) => `<div class="${i === loser ? "" : "win"}"><span>${TOKENS[i]} ${esc(p)}${i === loser ? " 💥" : " 🏆"}</span><b>${T.moves[i]} blok</b></div>`).join("");
    $("over").hidden = false; $("again").focus();
  }

  /* ---------- döngü ve çizim ---------- */
  function step() {
    if (!T) return;
    T.t += 1 / 60;
    if (T.keyPull && T.pull && !T.over) addMove(4);
    if (T.frameMove && T.pull && !T.over) { const d = T.frameMove; T.frameMove = 0; addMove(d); }
    T.wob *= T.pull ? 0.992 : 0.965;
    for (const l of T.layers) for (const b of l) if (b && b.flash > 0) b.flash -= 1 / 60;
    if (T.fly) { T.fly.t += 1 / 40; if (T.fly.t >= 1) landFly(); }
    if (T.fall) for (const p of T.fall) { p.vy += 0.5; p.x += p.vx; p.y += p.vy; p.r += p.vr; if (p.y > GROUND - BH) { p.y = GROUND - BH; p.vy *= -0.3; p.vx *= 0.8; p.vr *= 0.7; } }
    const zt = Math.min(1.6, (GROUND - 70) / (T.layers.length * (BH + 1) + 20)); Z += (zt - Z) * 0.05;
    const m = Math.min(100, T.lean + T.wob);
    $("mb").style.width = m + "%";
    $("ht").textContent = `${T.layers.length} kat`;
  }
  function wood(x, y, w, h, b, alt, hi) {
    const g = ctx.createLinearGradient(x, y, x, y + h);
    g.addColorStop(0, alt ? "#E7B57C" : "#DDA66A"); g.addColorStop(1, alt ? "#C98D50" : "#BE8046");
    ctx.fillStyle = g; ctx.fillRect(x, y, w, h);
    ctx.strokeStyle = "rgba(120,70,25,.35)"; ctx.lineWidth = 1;
    ctx.beginPath(); for (let i = 1; i < 3; i++) { ctx.moveTo(x + 3, y + h * i / 3); ctx.quadraticCurveTo(x + w / 2, y + h * i / 3 + (alt ? 2 : -2), x + w - 3, y + h * i / 3); } ctx.stroke();
    ctx.strokeStyle = "#8A5A2B"; ctx.lineWidth = 1.5; ctx.strokeRect(x + 0.75, y + 0.75, w - 1.5, h - 1.5);
    if (hi) { ctx.strokeStyle = hi; ctx.lineWidth = 3; ctx.strokeRect(x - 1, y - 1, w + 2, h + 2); }
    if (b && b.flash > 0) { ctx.globalAlpha = Math.min(1, b.flash); ctx.fillStyle = b.tight < 0.4 ? "rgba(45,183,90,.6)" : b.tight < 0.7 ? "rgba(255,197,41,.6)" : "rgba(229,72,77,.6)"; ctx.fillRect(x, y, w, h); ctx.globalAlpha = 1; }
  }
  function draw() {
    ctx.clearRect(0, 0, VW, VH);
    ctx.fillStyle = "#C9A27A"; ctx.fillRect(0, GROUND, VW, VH - GROUND);
    ctx.fillStyle = "#B08560"; ctx.fillRect(0, GROUND, VW, 4);
    if (!T) return;
    if (T.fall) {
      ctx.save(); ctx.translate(VW / 2, GROUND); ctx.scale(Z, Z); ctx.translate(-VW / 2, -GROUND);
      for (const p of T.fall) { ctx.save(); ctx.translate(p.x + BW / 2, p.y + BH / 2); ctx.rotate(p.r); wood(-BW / 2, -BH / 2, BW, BH, null, p.li % 2); ctx.restore(); }
      ctx.restore(); return;
    }
    const m = T.lean + T.wob, ang = (T.lean / 100) * 0.035 + (T.wob / 100) * 0.07 * Math.sin(T.t * 9);
    ctx.save(); ctx.translate(VW / 2, GROUND); ctx.scale(Z, Z); ctx.rotate(ang); ctx.translate(-VW / 2, -GROUND);
    const help = CFG.help[T.turn] && !T.over;
    T.layers.forEach((l, li) => l.forEach((b, k) => {
      if (!b) return;
      const c = cell(li, k);
      let x = c.x, y = c.y, hi = null;
      const pulling = T.pull && T.pull.li === li && T.pull.k === k;
      if (pulling) { const p = Math.min(1, T.pull.prog); x += (k === 0 ? -1 : k === 2 ? 1 : 0.4) * p * BW * 0.9; y += p * 6; }
      if (help && safe(li, k)) hi = "#2DB75A";
      if (T.cur && T.cur[0] === li && T.cur[1] === k) hi = "#1C7ED6";
      if (pulling) { ctx.fillStyle = "rgba(0,0,0,.18)"; ctx.fillRect(x + 4, y + 5, BW, BH); }
      wood(x, y, BW, BH, b, li % 2, hi);
    }));
    ctx.restore();
    ctx.save(); ctx.translate(VW / 2, GROUND); ctx.scale(Z, Z); ctx.translate(-VW / 2, -GROUND);
    if (T.fly) {
      const f = T.fly, k = f.t, x = f.x0 + (f.x1 - f.x0) * k, y = f.y0 + (f.y1 - f.y0) * k - Math.sin(k * Math.PI) * 80;
      wood(x, y, BW, BH, null, f.li % 2, null);
    }
    ctx.restore();
    if (m > 70 && !T.over) { ctx.fillStyle = `rgba(229,72,77,${(m - 70) / 100})`; ctx.font = "800 28px Rubik, sans-serif"; ctx.textAlign = "center"; ctx.fillText("Dikkat, kule sallanıyor!", VW / 2, 50); }
  }
  let last = 0, acc = 0;
  function loop(ts) {
    const dt = Math.min(100, ts - (last || ts)); last = ts; acc += dt;
    while (acc >= 1000 / 60) { step(); acc -= 1000 / 60; }
    draw(); requestAnimationFrame(loop);
  }

  /* ---------- girdi ---------- */
  function hit(e) {
    const r = cv.getBoundingClientRect(), x = VW / 2 + ((e.clientX - r.left) * VW / r.width - VW / 2) / Z, y = GROUND + ((e.clientY - r.top) * VH / r.height - GROUND) / Z;
    for (let li = T.layers.length - 1; li >= 0; li--) for (let k = 0; k < 3; k++) {
      const c = cell(li, k);
      if (T.layers[li][k] && x >= c.x - 2 && x <= c.x + BW + 2 && y >= c.y - 1 && y <= c.y + BH + 1) return [li, k];
    }
    return null;
  }
  let drag = null;
  cv.addEventListener("pointerdown", (e) => {
    audio(); if (!T || T.over) return;
    const h = hit(e); if (!h) return;
    if (!startPull(h[0], h[1])) return;
    drag = { x: e.clientX, y: e.clientY, id: e.pointerId, tot: 0 }; cv.setPointerCapture(e.pointerId); e.preventDefault();
  });
  cv.addEventListener("pointermove", (e) => {
    if (!drag || e.pointerId !== drag.id || !T.pull) return;
    const r = cv.getBoundingClientRect(), s = VW / r.width;
    const d = Math.hypot(e.clientX - drag.x, e.clientY - drag.y) * s / Z;
    drag.x = e.clientX; drag.y = e.clientY; drag.tot += d;
    T.frameMove += d;
  });
  const end = (e) => {
    if (!drag || e.pointerId !== drag.id) return;
    const tot = drag.tot; drag = null;
    if (T && T.pull && tot < 6 && T.pull.prog < 0.08) poke();
  };
  cv.addEventListener("pointerup", end); cv.addEventListener("pointercancel", end);
  // klavye: oklarla seç, boşluk basılı = yavaş çek, Enter = dürt
  document.addEventListener("keydown", (e) => {
    if (!T || T.over || !$("setup").hidden) return;
    const c = T.cur || [Math.min(maxLayer(), T.layers.length - 1), 1];
    let [li, k] = c;
    if (e.key === "ArrowUp") li = Math.min(T.layers.length - 1, li + 1);
    else if (e.key === "ArrowDown") li = Math.max(0, li - 1);
    else if (e.key === "ArrowLeft") k = Math.max(0, k - 1);
    else if (e.key === "ArrowRight") k = Math.min(2, k + 1);
    else if (e.key === " ") { e.preventDefault(); audio(); if (!e.repeat && startPull(li, k)) T.keyPull = true; return; }
    else if (e.key === "Enter") { e.preventDefault(); audio(); if (startPull(li, k)) poke(); return; }
    else return;
    e.preventDefault();
    if (!(T.pull && T.pull.prog > 0.25)) T.cur = [li, k];
  });
  document.addEventListener("keyup", (e) => { if (e.key === " " && T) T.keyPull = false; });

  /* ---------- ayarlar ---------- */
  const form = $("setup-form");
  let saved = null;
  try { saved = JSON.parse(localStorage.getItem(SAVE_KEY) || "null"); } catch (_) {}
  if (saved && saved.rec) rec = saved.rec;
  function persist() { try { const s = JSON.parse(localStorage.getItem(SAVE_KEY) || "{}"); s.rec = rec; localStorage.setItem(SAVE_KEY, JSON.stringify(s)); } catch (_) {} }
  function buildRows() {
    const n = +form.count.value, box = $("rows");
    const old = [...box.querySelectorAll(".p-row")].map(r => [r.querySelector("input[type=text]").value, r.querySelector("input[type=checkbox]").checked]);
    box.innerHTML = "";
    for (let i = 0; i < n; i++) {
      const row = document.createElement("div"); row.className = "p-row"; row.style.gridTemplateColumns = "34px minmax(0,1fr) auto";
      row.innerHTML = `<span class="tk">${TOKENS[i]}</span><input type="text" maxlength="12" aria-label="${i + 1}. oyuncunun adı" placeholder="Oyuncu ${i + 1}"><label class="toggle" title="Küçüklere yardım"><input type="checkbox" aria-label="${i + 1}. oyuncuya yardım"> ✨</label>`;
      const [nm, h] = old[i] || [saved && saved.names && saved.names[i] != null ? saved.names[i] : DEF[i], saved && saved.help ? !!saved.help[i] : DEF[i] === "Egemen"];
      row.querySelector("input[type=text]").value = nm; row.querySelector("input[type=checkbox]").checked = h;
      box.appendChild(row);
    }
  }
  form.addEventListener("change", (e) => { if (e.target.name === "count") buildRows(); });
  form.addEventListener("submit", (e) => {
    e.preventDefault(); audio(); pickVoice();
    const rows = [...$("rows").querySelectorAll(".p-row")];
    const players = rows.map((r, i) => r.querySelector("input[type=text]").value.trim() || ["Tilki", "Panda", "Kurbağa", "Aslan", "Penguen", "Ahtapot"][i]);
    const help = rows.map(r => r.querySelector("input[type=checkbox]").checked);
    try { localStorage.setItem(SAVE_KEY, JSON.stringify({ count: players.length, names: rows.map(r => r.querySelector("input[type=text]").value), help, rec })); } catch (_) {}
    newGame({ players, help });
  });
  if (saved && saved.count) { try { form.count.value = String(saved.count); } catch (_) {} }
  buildRows();
  $("settings").addEventListener("click", () => { $("over").hidden = true; $("setup").hidden = false; });
  $("again").addEventListener("click", () => { audio(); newGame(CFG); });
  $("to-setup").addEventListener("click", () => { $("over").hidden = true; $("setup").hidden = false; });
  requestAnimationFrame(loop);

  window.__tk = { newGame, startPull, addMove, poke, step, can, safe, collapses, maxLayer, hf, get T() { return T; } };
})();
