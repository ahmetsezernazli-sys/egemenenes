/* Halat Çekme — iki kişilik soru çözme / hızlı basma yarışı */
(() => {
  "use strict";
  const $ = (id) => document.getElementById(id);
  const SAVE_KEY = "halat-cekme";
  const FRUITS = ["🍎", "🍌", "🍓", "⭐", "🐟", "🎈", "🌸", "🚗"];
  const STEP_Q = 0.12, STEP_TAP = 0.022, WIN_ROUNDS = 2, FREEZE = 1.2;
  const TAP_POWER = [1.6, 1.25, 1, 1];
  const rnd = (a, b) => a + Math.floor(Math.random() * (b - a + 1));

  /* ---------- ses ---------- */
  let AC = null;
  function audio() { try { AC = AC || new (window.AudioContext || window.webkitAudioContext)(); if (AC.state === "suspended") AC.resume(); } catch (e) {} }
  function snd(f, d, type, vol, delay) {
    if (!AC || fast) return;
    const t = AC.currentTime + (delay || 0), o = AC.createOscillator(), g = AC.createGain();
    o.type = type || "triangle"; o.frequency.setValueAtTime(f, t);
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol || 0.06, t + 0.01); g.gain.exponentialRampToValueAtTime(0.0001, t + d);
    o.connect(g).connect(AC.destination); o.start(t); o.stop(t + d + 0.02);
  }
  const SND = { ok: (p) => snd(p ? 700 : 600, 0.1, "triangle", 0.07), no: () => snd(180, 0.2, "sine", 0.08), tap: (p) => snd(p ? 420 : 360, 0.04, "square", 0.03), beep: (h) => snd(h ? 880 : 520, 0.15, "square", 0.05), win: () => [523, 659, 784, 1046].forEach((f, i) => snd(f, 0.22, "triangle", 0.08, i * 0.13)) };

  /* ---------- sorular ---------- */
  function makeQ(lv) {
    let html, ans, kind = lv === 3 ? ["+", "-", "×", "÷"][rnd(0, 3)] : lv === 2 ? "×" : lv === 1 ? "+" : "n";
    if (kind === "n") {
      const n = rnd(1, 6), f = FRUITS[rnd(0, FRUITS.length - 1)];
      html = `<span><span class="em">${f.repeat(n)}</span><small>Kaç tane?</small></span>`; ans = n;
    } else if (kind === "+") { const a = rnd(1, lv === 3 ? 40 : 10), b = rnd(1, lv === 3 ? 40 : 10); html = `${a} + ${b}`; ans = a + b; }
    else if (kind === "-") { const a = rnd(10, 60), b = rnd(1, a); html = `${a} − ${b}`; ans = a - b; }
    else if (kind === "×") { const a = rnd(2, 9), b = rnd(2, 9); html = `${a} × ${b}`; ans = a * b; }
    else { const b = rnd(2, 9), c = rnd(2, 9); html = `${b * c} ÷ ${b}`; ans = c; }
    const opts = new Set([ans]);
    while (opts.size < 3) { const d = rnd(1, kind === "n" ? 2 : kind === "×" ? 6 : 4) * (Math.random() < 0.5 ? -1 : 1), v = ans + d; if (v >= (kind === "n" ? 1 : 0)) opts.add(v); }
    return { html, ans, opts: [...opts].sort(() => Math.random() - 0.5) };
  }

  /* ---------- durum ---------- */
  let CFG = { mode: "q", opp: "2p", names: ["Enes", "Egemen"], lv: [3, 0] };
  try { const s = JSON.parse(localStorage.getItem(SAVE_KEY) || "null"); if (s) CFG = Object.assign(CFG, s); } catch (e) {}
  let G = null, fast = false;

  function newMatch() { G = { wins: [0, 0], round: 0 }; newRound(); }
  function newRound() {
    G.round++; G.p = 0; G.vis = 0; G.state = "count"; G.count = 3; G.cT = 0.9; G.q = [null, null]; G.frozen = [0, 0]; G.ai = { t: 1.5 }; G.t = 0;
    $("setup").hidden = true; $("over").hidden = true;
    for (const i of [0, 1]) { buildSide(i); $("w" + i).textContent = "⭐".repeat(G.wins[i]); $("n" + i).textContent = CFG.names[i]; }
    banner("3"); SND.beep(false);
  }
  function banner(t) { $("banner").textContent = t; }
  const isAi = (i) => CFG.opp === "ai" && i === 1;

  function buildSide(i) {
    const q = $("q" + i), o = $("o" + i); o.textContent = "";
    if (CFG.mode === "tap") {
      q.innerHTML = `<span><small>${isAi(i) ? "Bilgisayar çekiyor…" : "Hızlı hızlı bas!"}</small></span>`;
      o.style.display = "contents";
      const b = document.createElement("button"); b.type = "button"; b.className = "mash"; b.textContent = isAi(i) ? "🤖" : "ÇEK!";
      b.disabled = isAi(i);
      b.addEventListener("pointerdown", (e) => { e.preventDefault(); audio(); tap(i); });
      o.appendChild(b);
      return;
    }
    o.style.display = "";
    for (let k = 0; k < 3; k++) {
      const b = document.createElement("button"); b.type = "button"; b.className = "opt";
      b.addEventListener("pointerdown", (e) => { e.preventDefault(); audio(); answer(i, k); });
      b.addEventListener("click", (e) => { if (e.detail === 0) { audio(); answer(i, k); } });
      o.appendChild(b);
    }
    q.textContent = "";
  }
  function newQ(i) {
    G.q[i] = makeQ(CFG.lv[i]);
    if (fast) return;
    $("q" + i).innerHTML = G.q[i].html;
    [...$("o" + i).children].forEach((b, k) => { b.textContent = G.q[i].opts[k]; b.className = "opt"; b.disabled = isAi(i); b.setAttribute("aria-label", `Cevap ${G.q[i].opts[k]}`); });
  }
  function answer(i, k) {
    if (!G || G.state !== "play" || G.frozen[i] > 0 || !G.q[i]) return false;
    const q = G.q[i], v = q.opts[k], btn = fast ? null : $("o" + i).children[k];
    if (v === q.ans) {
      pull(i, STEP_Q); SND.ok(i);
      if (btn) btn.className = "opt ok";
      G.q[i] = null;
      setTimeout(() => { if (G.state === "play") newQ(i); }, fast ? 0 : 220);
      if (fast && G.state === "play") newQ(i);
      return true;
    }
    G.frozen[i] = FREEZE; SND.no();
    if (btn) btn.className = "opt no";
    if (!fast) $("side" + i).classList.add("frozen");
    return false;
  }
  function tap(i) {
    if (!G || G.state !== "play" || CFG.mode !== "tap") return;
    pull(i, STEP_TAP * TAP_POWER[CFG.lv[i]]); SND.tap(i);
  }
  function pull(i, s) {
    G.p += i === 0 ? -s : s;
    if (Math.abs(G.p) >= 1) endRound(G.p < 0 ? 0 : 1);
  }
  function endRound(w) {
    G.state = "end"; G.p = Math.max(-1, Math.min(1, G.p));
    G.wins[w]++; $("w" + w).textContent = "⭐".repeat(G.wins[w]);
    for (const i of [0, 1]) $("side" + i).classList.remove("frozen");
    banner(`${CFG.names[w]}!`); SND.win();
    if (G.wins[w] >= WIN_ROUNDS) {
      setTimeout(() => {
        $("over-title").textContent = `${CFG.names[w]} kazandı!`;
        $("over-tx").textContent = `Skor: ${CFG.names[0]} ${G.wins[0]} – ${G.wins[1]} ${CFG.names[1]}`;
        $("over").hidden = false; $("again").focus();
      }, fast ? 0 : 1300);
    } else if (!fast) setTimeout(newRound, 1800);
  }

  /* ---------- güncelle ---------- */
  function update(dt) {
    if (!G) return;
    G.vis += (G.p - G.vis) * Math.min(1, dt * 10);
    G.t += dt;
    if (G.state === "count") {
      G.cT -= dt;
      if (G.cT <= 0) {
        G.count--; G.cT = 0.9;
        if (G.count > 0) { banner(String(G.count)); SND.beep(false); }
        else { banner("Çek!"); SND.beep(true); G.state = "play"; if (CFG.mode === "q") { newQ(0); newQ(1); } setTimeout(() => { if ($("banner").textContent === "Çek!") banner(""); }, 700); }
      }
      return;
    }
    if (G.state !== "play") return;
    for (const i of [0, 1]) if (G.frozen[i] > 0) {
      G.frozen[i] -= dt;
      if (G.frozen[i] <= 0) { G.frozen[i] = 0; if (!fast) $("side" + i).classList.remove("frozen"); newQ(i); }
    }
    if (CFG.opp === "ai") {
      G.ai.t -= dt;
      if (G.ai.t <= 0) {
        if (CFG.mode === "tap") { tap(1); G.ai.t = 1 / (5 + Math.random() * 2.5); }
        else if (G.q[1] && G.frozen[1] <= 0) {
          const k = Math.random() < 0.85 ? G.q[1].opts.indexOf(G.q[1].ans) : rnd(0, 2);
          answer(1, k); G.ai.t = [1.8, 2.4, 2.8, 3.2][CFG.lv[1]] * (0.75 + Math.random() * 0.6);
        } else G.ai.t = 0.3;
      }
    }
  }

  /* ---------- çizim ---------- */
  const cv = $("cv"), ctx = cv.getContext("2d");
  let W = 0, H = 0, dpr = 1;
  function resize() { const r = $("mid").getBoundingClientRect(); dpr = Math.min(2, window.devicePixelRatio || 1); W = r.width; H = r.height; cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr); }
  function kid(x, y, s, col, dir, lean, t) {
    ctx.save(); ctx.translate(x, y); ctx.scale(s * dir, s); ctx.rotate(-lean);
    ctx.strokeStyle = "#2A2540"; ctx.lineWidth = 5; ctx.lineCap = "round";
    const step = Math.sin(t * 14) * 4;
    ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(-10 + step, 26); ctx.moveTo(0, 0); ctx.lineTo(8 - step, 26); ctx.stroke();
    ctx.fillStyle = col; ctx.beginPath(); ctx.roundRect(-10, -34, 20, 36, 8); ctx.fill();
    ctx.strokeStyle = "#F2C29B"; ctx.beginPath(); ctx.moveTo(4, -24); ctx.lineTo(26, -14); ctx.stroke();
    ctx.fillStyle = "#F2C29B"; ctx.beginPath(); ctx.arc(0, -46, 11, 0, 7); ctx.fill();
    ctx.fillStyle = "#2A2540"; ctx.beginPath(); ctx.arc(4, -48, 1.8, 0, 7); ctx.fill();
    ctx.restore();
  }
  function draw() {
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.clearRect(0, 0, W, H);
    if (!G) return;
    const t = performance.now() / 1000, gy = H * 0.62, cx = W / 2, range = W * 0.28, k = cx + G.vis * range;
    // çizgiler ve çamur
    ctx.fillStyle = "#8A5A2B"; ctx.beginPath(); ctx.ellipse(cx, gy + 8, W * 0.08, 8, 0, 0, 7); ctx.fill();
    ctx.fillStyle = "rgba(255,255,255,.9)"; ctx.fillRect(cx - range - 2, gy - 4, 4, 22); ctx.fillRect(cx + range - 2, gy - 4, 4, 22);
    ctx.fillStyle = "#3D8BFD"; ctx.fillRect(cx - range - 2, gy + 18, 4, 6); ctx.fillStyle = "#E5484D"; ctx.fillRect(cx + range - 2, gy + 18, 4, 6);
    // halat
    const lx = k - W * 0.36, rx = k + W * 0.36, ry = gy - 26;
    ctx.strokeStyle = "#B5793A"; ctx.lineWidth = 6; ctx.beginPath(); ctx.moveTo(lx, ry); ctx.quadraticCurveTo(k, ry + 6, rx, ry); ctx.stroke();
    ctx.strokeStyle = "rgba(255,255,255,.35)"; ctx.lineWidth = 2; ctx.setLineDash([6, 8]); ctx.beginPath(); ctx.moveTo(lx, ry - 1); ctx.quadraticCurveTo(k, ry + 5, rx, ry - 1); ctx.stroke(); ctx.setLineDash([]);
    // bayrak
    ctx.fillStyle = "#E5484D"; ctx.fillRect(k - 2, ry - 2, 4, 24); ctx.beginPath(); ctx.moveTo(k + 2, ry + 2); ctx.lineTo(k + 18, ry + 8); ctx.lineTo(k + 2, ry + 14); ctx.fill();
    const s = Math.max(0.6, Math.min(1.3, H / 200));
    const pulling = G.state === "play";
    kid(lx - 6, gy, s, "#3D8BFD", 1, pulling ? 0.35 : 0.1, pulling ? t : 0);
    kid(lx + 26 * s, gy, s * 0.95, "#5FA2FF", 1, pulling ? 0.3 : 0.1, pulling ? t + 1 : 0);
    kid(rx + 6, gy, s, "#E5484D", -1, pulling ? 0.35 : 0.1, pulling ? t + 2 : 0);
    kid(rx - 26 * s, gy, s * 0.95, "#FF7A7E", -1, pulling ? 0.3 : 0.1, pulling ? t + 3 : 0);
  }

  /* ---------- giriş ---------- */
  const KEYMAP = { "1": [0, 0], "2": [0, 1], "3": [0, 2], "8": [1, 0], "9": [1, 1], "0": [1, 2], a: [0, -1], l: [1, -1] };
  document.addEventListener("keydown", (e) => {
    if (!G || e.repeat || !$("setup").hidden) return;
    const m = KEYMAP[e.key.toLowerCase()]; if (!m) return;
    const i = CFG.opp === "ai" ? 0 : m[0];
    if (isAi(i)) return;
    e.preventDefault(); audio();
    if (CFG.mode === "tap") tap(i); else if (m[1] >= 0) answer(i, m[1]);
  });

  /* ---------- ayarlar ---------- */
  const form = $("form");
  function fill() {
    form.mode.value = CFG.mode; form.opp.value = CFG.opp; form.lv0.value = String(CFG.lv[0]); form.lv1.value = String(CFG.lv[1]);
    $("in0").value = CFG.names[0]; $("in1").value = CFG.names[1];
  }
  form.addEventListener("change", (e) => {
    if (e.target.name !== "opp") return;
    if (form.opp.value === "ai" && $("in1").value === "Egemen") $("in1").value = "Bilgisayar";
    if (form.opp.value === "2p" && $("in1").value === "Bilgisayar") $("in1").value = "Egemen";
  });
  form.addEventListener("submit", (e) => {
    e.preventDefault(); audio();
    CFG = { mode: form.mode.value, opp: form.opp.value, names: [$("in0").value.trim() || "Mavi", $("in1").value.trim() || "Kırmızı"], lv: [+form.lv0.value, +form.lv1.value] };
    try { localStorage.setItem(SAVE_KEY, JSON.stringify(CFG)); } catch (_) {}
    newMatch();
  });
  $("settings").addEventListener("click", () => { if (G) G.state = "end"; fill(); $("over").hidden = true; $("setup").hidden = false; });
  $("again").addEventListener("click", () => { audio(); newMatch(); });
  $("to-setup").addEventListener("click", () => { fill(); $("over").hidden = true; $("setup").hidden = false; });
  fill();

  if (!CanvasRenderingContext2D.prototype.roundRect) {
    CanvasRenderingContext2D.prototype.roundRect = function (x, y, w, h, r) { r = Math.min(r, w / 2, h / 2); this.moveTo(x + r, y); this.arcTo(x + w, y, x + w, y + h, r); this.arcTo(x + w, y + h, x, y + h, r); this.arcTo(x, y + h, x, y, r); this.arcTo(x, y, x + w, y, r); this.closePath(); };
  }
  let last = performance.now();
  function loop(now) {
    const dt = Math.min(0.05, (now - last) / 1000); last = now;
    const r = $("mid").getBoundingClientRect(); if (Math.abs(r.width - W) > 0.5 || Math.abs(r.height - H) > 0.5) resize();
    if ($("setup").hidden) update(dt);
    draw(); requestAnimationFrame(loop);
  }
  resize();
  G = { wins: [0, 0], round: 0, p: 0, vis: 0, state: "idle", q: [null, null], frozen: [0, 0] };
  requestAnimationFrame(loop);

  // test kancası
  window.__hc = { makeQ, answer, tap, update, newMatch, get G() { return G; }, setFast: (f) => { fast = f; }, setCFG: (c) => { CFG = Object.assign(CFG, c); } };
})();
