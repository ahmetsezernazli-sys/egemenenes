/* Müzik Düeti — iki kişilik ritim ve müzik oyunu */
(() => {
  "use strict";
  const $ = (id) => document.getElementById(id);
  const cv = $("cv"), ctx = cv.getContext("2d"), stage = $("stage");
  const SAVE_KEY = "muzik-dueti";
  const VW = 1000, VH = 600, HIT = 520, SPEED = 300;
  const LANE_X = [[130, 300], [560, 730]], LANE_W = 160;
  const COL = ["#38BDF8", "#F472B6"];
  // melodiler: [perde (Do4'e göre yarım ton), vuruş]; bas: yarım ölçü kökleri
  const SONGS = [
    { ad: "Daha Dün Annemizin", mel: "0 0 7 7 9 9 7:2 5 5 4 4 2 2 0:2 7 7 5 5 4 4 2:2 7 7 5 5 4 4 2:2 0 0 7 7 9 9 7:2 5 5 4 4 2 2 0:2", bas: "-12 -12 -7 -12 -7 -12 -5 -12 -12 -7 -12 -5 -12 -7 -12 -5 -12 -12 -7 -12 -7 -12 -5 -12" },
    { ad: "Uyuyor musun?", mel: "0 2 4 0 0 2 4 0 4 5 7:2 4 5 7:2 7:.5 9:.5 7:.5 5:.5 4 0 7:.5 9:.5 7:.5 5:.5 4 0 0 -5 0:2 0 -5 0:2", bas: "-12 -5 -12 -5 -12 -5 -12 -5 -12 -5 -12 -5 -12 -5 -12 -5" },
    { ad: "Neşeye Övgü", mel: "4 4 5 7 7 5 4 2 0 0 2 4 4:1.5 2:.5 2:2 4 4 5 7 7 5 4 2 0 0 2 4 2:1.5 0:.5 0:2", bas: "-12 -12 -17 -17 -12 -12 -12 -17 -12 -12 -17 -17 -12 -12 -17 -12" },
    { ad: "Ali Babanın Çiftliği", mel: "7 7 7 2 4 4 2:2 11 11 9 9 7:3 2 7 7 7 2 4 4 2:2 11 11 9 9 7:4", bas: "-17 -17 -12 -17 -17 -10 -17 -17 -17 -17 -12 -17 -17 -10 -17 -17" }
  ];
  const parse = (s) => s.split(" ").map(x => { const [p, d] = x.split(":"); return [+p, d ? +d : 1]; });

  /* ---------- ses ---------- */
  let AC = null, headless = false, master = null;
  function audio() { try { if (!AC) { AC = new (window.AudioContext || window.webkitAudioContext)(); master = AC.createGain(); master.gain.value = 0.8; master.connect(AC.destination); } if (AC.state === "suspended") AC.resume(); } catch (e) {} }
  const hz = (p) => 261.63 * Math.pow(2, p / 12);
  function note(part, p, dur, when) {
    if (!AC || headless) return;
    const t = when || AC.currentTime, d = Math.min(1.2, Math.max(0.25, dur));
    const g = AC.createGain(); g.connect(master);
    if (part === 0) {
      const o1 = AC.createOscillator(), o2 = AC.createOscillator(), g2 = AC.createGain();
      o1.type = "triangle"; o1.frequency.value = hz(p); o2.type = "sine"; o2.frequency.value = hz(p) * 2; g2.gain.value = 0.25;
      o1.connect(g); o2.connect(g2).connect(g);
      g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.22, t + 0.01); g.gain.exponentialRampToValueAtTime(0.0001, t + d);
      o1.start(t); o2.start(t); o1.stop(t + d + 0.05); o2.stop(t + d + 0.05);
    } else {
      const o = AC.createOscillator(), f = AC.createBiquadFilter(), s = AC.createOscillator();
      o.type = "sawtooth"; o.frequency.value = hz(p); f.type = "lowpass"; f.frequency.value = 700; s.type = "sine"; s.frequency.value = hz(p);
      o.connect(f).connect(g); s.connect(g);
      g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.18, t + 0.01); g.gain.exponentialRampToValueAtTime(0.0001, t + d);
      o.start(t); s.start(t); o.stop(t + d + 0.05); s.stop(t + d + 0.05);
    }
  }
  let nbuf = null;
  function hat(when, vol) {
    if (!AC || headless) return;
    if (!nbuf) { nbuf = AC.createBuffer(1, AC.sampleRate * 0.1, AC.sampleRate); const a = nbuf.getChannelData(0); for (let i = 0; i < a.length; i++) a[i] = Math.random() * 2 - 1; }
    const s = AC.createBufferSource(), f = AC.createBiquadFilter(), g = AC.createGain();
    s.buffer = nbuf; f.type = "highpass"; f.frequency.value = 7000; g.gain.setValueAtTime(vol, when); g.gain.exponentialRampToValueAtTime(0.0001, when + 0.05);
    s.connect(f).connect(g).connect(master); s.start(when); s.stop(when + 0.06);
  }

  /* ---------- durum ---------- */
  let CFG = { mode: "2p", ai: 0, song: 0, sp: 0, names: ["Enes", "Egemen"], help: [false, true] };
  let BEST = {};
  try { const s = JSON.parse(localStorage.getItem(SAVE_KEY) || "null"); if (s) { if (s.cfg) CFG = Object.assign(CFG, s.cfg); BEST = s.best || {}; } } catch (e) {}
  const store = () => { try { localStorage.setItem(SAVE_KEY, JSON.stringify({ cfg: CFG, best: BEST })); } catch (e) {} };
  let G = null, simT = 0;
  const isCpu = (p) => CFG.mode === "ai" && p === 1;
  function chart() {
    const S = SONGS[CFG.song], mel = parse(S.mel), bas = S.bas.split(" ").map(Number);
    const ps = mel.map(m => m[0]).slice().sort((a, b) => a - b), med = ps[Math.floor(ps.length / 2)];
    const parts = [[], []]; let t = 0;
    for (const [p, d] of mel) { parts[0].push({ t, p, d, lane: p < med ? 0 : 1 }); t += d; }
    const total = t;
    bas.forEach((p, i) => parts[1].push({ t: i * 2, p, d: 2, lane: i % 2 }));
    // küçüklere kolaylık: melodide yarım vuruşları at, basta yalnız ölçü başları
    if (CFG.help[0] && !isCpu(0)) parts[0] = parts[0].filter(n => Math.abs(n.t - Math.round(n.t)) < 0.01);
    if (CFG.help[1] && !isCpu(1)) parts[1] = parts[1].filter(n => n.t % 4 === 0);
    return { parts, total };
  }
  function now() { return AC && !headless ? AC.currentTime : simT; }
  function newGame() {
    audio();
    const c = chart(), bpm = CFG.sp ? 108 : 82, spb = 60 / bpm;
    G = { parts: c.parts.map(arr => arr.map(n => Object.assign({}, n, { time: n.t * spb, done: 0 }))), total: c.total, spb, start: now() + 1.2 + 4 * spb, score: 0, combo: 0, best: 0, flashes: [], eq: [0, 0], over: false, nextBeat: 0, hits: [[0, 0], [0, 0]] };
    renderHud();
    // sayım vuruşları
    for (let b = 0; b < 4; b++) hat(G.start - (4 - b) * spb, b === 0 ? 0.25 : 0.15);
  }
  const songT = () => now() - G.start;
  function judge(p, lane) {
    if (!G || G.over) return;
    const T = songT(), win = CFG.help[p] && !isCpu(p) ? 0.22 : 0.13;
    let best = null, bd = 9;
    for (const n of G.parts[p]) { if (n.done) continue; if (!(CFG.help[p] && !isCpu(p)) && n.lane !== lane) continue; const d = Math.abs(n.time - T); if (d < bd) { bd = d; best = n; } if (n.time - T > 1) break; }
    if (!best || bd > win) { G.combo = 0; flash(p, lane, "", "#666"); return; }
    best.done = bd < 0.06 ? 2 : 1;
    note(p, best.p, best.d * G.spb);
    G.score += best.done === 2 ? 100 : 60; G.combo++; G.best = Math.max(G.best, G.combo);
    G.hits[p][0]++; if (best.done === 2) G.hits[p][1]++;
    G.eq[p] = 1;
    flash(p, (CFG.help[p] && !isCpu(p)) ? -1 : best.lane, best.done === 2 ? "Harika!" : "İyi!", COL[p]);
    renderHud();
  }
  function flash(p, lane, txt, c) { G.flashes.push({ p, lane, txt, c, t: 0.6 }); }
  function update(dt) {
    if (!G || G.over) return;
    if (headless) simT += dt;
    const T = songT();
    // metronom
    while (G.nextBeat * G.spb < T + 0.2 && G.nextBeat * G.spb <= G.total * G.spb) { if (AC && !headless) hat(G.start + G.nextBeat * G.spb, G.nextBeat % 4 === 0 ? 0.12 : 0.06); G.nextBeat++; }
    for (const p of [0, 1]) {
      for (const n of G.parts[p]) {
        if (n.done) continue;
        if (isCpu(p) && T >= n.time - 0.005) { n.done = 2; note(p, n.p, n.d * G.spb, AC ? G.start + n.time : 0); G.hits[p][0]++; G.hits[p][1]++; G.eq[p] = 1; flash(p, n.lane, "", COL[p]); renderHud(); continue; }
        const win = CFG.help[p] && !isCpu(p) ? 0.22 : 0.13;
        if (T > n.time + win) { n.done = -1; G.combo = 0; }
        if (n.time > T + 0.3) break;
      }
      G.eq[p] = Math.max(0, G.eq[p] - dt * 2.5);
    }
    for (const f of G.flashes) f.t -= dt; G.flashes = G.flashes.filter(f => f.t > 0);
    if (T > G.total * G.spb + 1.5) finish();
  }
  function finish() {
    G.over = true;
    const acc = [0, 1].map(p => { const n = G.parts[p].length; return n ? G.hits[p][0] / n : 1; });
    const team = (acc[0] + acc[1]) / 2, stars = team >= 0.9 ? 3 : team >= 0.7 ? 2 : 1;
    const key = CFG.song + ":" + CFG.sp, rec = G.score > (BEST[key] || 0); if (rec) { BEST[key] = G.score; store(); }
    $("end-icon").textContent = "⭐".repeat(stars) + "☆".repeat(3 - stars);
    $("end-title").textContent = stars === 3 ? "Muhteşem düet!" : stars === 2 ? "Güzel çaldınız!" : "Bir daha çalalım!";
    $("end-text").textContent = `${SONGS[CFG.song].ad} · Puan ${G.score}${rec ? " (rekor!)" : ""} · En uzun seri ${G.best} · ${CFG.names[0]} %${Math.round(acc[0] * 100)} · ${CFG.names[1]} %${Math.round(acc[1] * 100)}`;
    $("end-next").textContent = "Tekrar çal";
    if (headless) return;
    setTimeout(() => { $("end").hidden = false; $("end-next").focus(); }, 300);
  }

  /* ---------- çizim ---------- */
  let W = 0, H = 0, dpr = 1, sc = 1, ox = 0, oy = 0;
  function resize() {
    const r = stage.getBoundingClientRect(); dpr = Math.min(2, window.devicePixelRatio || 1);
    W = r.width; H = r.height; cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr);
    sc = Math.min(W / VW, H / VH); ox = (W - VW * sc) / 2; oy = (H - VH * sc) / 2;
  }
  function pill(x, y, w, h, c, glow) {
    ctx.shadowColor = c; ctx.shadowBlur = glow; ctx.fillStyle = c; ctx.beginPath(); ctx.roundRect(x, y, w, h, h / 2); ctx.fill(); ctx.shadowBlur = 0;
    ctx.fillStyle = "rgba(255,255,255,.55)"; ctx.beginPath(); ctx.roundRect(x + 8, y + 4, w - 16, 5, 3); ctx.fill();
  }
  function draw() {
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.clearRect(0, 0, W, H);
    ctx.save(); ctx.translate(ox, oy); ctx.scale(sc, sc);
    ctx.beginPath(); ctx.roundRect(0, 0, VW, VH, 20); ctx.clip();
    const bg = ctx.createLinearGradient(0, 0, 0, VH); bg.addColorStop(0, "#160C3A"); bg.addColorStop(1, "#0B0620"); ctx.fillStyle = bg; ctx.fillRect(0, 0, VW, VH);
    const T = G ? songT() : 0;
    // hareketli ızgara
    ctx.strokeStyle = "rgba(167,139,250,.12)"; ctx.lineWidth = 1;
    const off = G ? ((T / (G.spb || 1)) % 1) * 75 : 0;
    for (let y = -75 + off; y < VH; y += 75) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(VW, y); ctx.stroke(); }
    // ekolayzer
    for (let i = 0; i < 24; i++) { const p = i < 12 ? 0 : 1, e = G ? G.eq[p] : 0, h = 20 + e * (40 + 60 * Math.abs(Math.sin(i * 1.7 + T * 6))); ctx.fillStyle = (i < 12 ? "rgba(56,189,248," : "rgba(244,114,182,") + (0.12 + e * 0.3) + ")"; ctx.fillRect(i < 12 ? 10 + i * 9 : VW - 10 - (i - 12) * 9 - 6, VH - h, 6, h); }
    // yollar
    for (const p of [0, 1]) {
      for (let l = 0; l < 2; l++) { const x = LANE_X[p][l]; const g = ctx.createLinearGradient(0, 0, 0, VH); g.addColorStop(0, "rgba(255,255,255,0)"); g.addColorStop(1, "rgba(255,255,255,.06)"); ctx.fillStyle = g; ctx.fillRect(x, 0, LANE_W, VH); }
      ctx.fillStyle = COL[p]; ctx.font = "800 22px Rubik, sans-serif"; ctx.textAlign = "center";
      ctx.fillText(`${p ? "🎸" : "🎹"} ${CFG.names[p]}${CFG.help[p] && !isCpu(p) ? " ✨" : ""}${isCpu(p) ? " 🤖" : ""}`, (LANE_X[p][0] + LANE_X[p][1] + LANE_W) / 2, 34);
      // vuruş çizgisi
      ctx.shadowColor = COL[p]; ctx.shadowBlur = 16; ctx.strokeStyle = "#fff"; ctx.lineWidth = 4;
      ctx.beginPath(); ctx.moveTo(LANE_X[p][0], HIT); ctx.lineTo(LANE_X[p][1] + LANE_W, HIT); ctx.stroke(); ctx.shadowBlur = 0;
      const keys = p ? ["K", "L"] : ["A", "S"], single = CFG.help[p] && !isCpu(p);
      ctx.fillStyle = "rgba(255,255,255,.35)"; ctx.font = "800 18px Rubik, sans-serif";
      if (single) ctx.fillText(`${keys[0]} / ${keys[1]}`, (LANE_X[p][0] + LANE_X[p][1] + LANE_W) / 2, HIT + 40);
      else keys.forEach((k, l) => ctx.fillText(k, LANE_X[p][l] + LANE_W / 2, HIT + 40));
      if (!G) continue;
      for (const n of G.parts[p]) {
        const y = HIT - (n.time - T) * SPEED; if (y < -40) break; if (n.done > 0 || y > VH + 30) continue;
        const len = Math.max(26, Math.min(n.d * G.spb * SPEED * 0.35, 90));
        const x = single ? LANE_X[p][0] : LANE_X[p][n.lane], w = single ? LANE_X[p][1] + LANE_W - LANE_X[p][0] : LANE_W;
        ctx.globalAlpha = n.done < 0 ? 0.25 : 1;
        pill(x + 10, y - len, w - 20, len, COL[p], 18);
        ctx.globalAlpha = 1;
      }
    }
    if (G) {
      for (const f of G.flashes) {
        const single = f.lane < 0, x = single ? (LANE_X[f.p][0] + LANE_X[f.p][1] + LANE_W) / 2 : LANE_X[f.p][f.lane] + LANE_W / 2;
        ctx.globalAlpha = f.t / 0.6; ctx.fillStyle = f.c; ctx.beginPath(); ctx.ellipse(x, HIT, (single ? 200 : 90) * (1.3 - f.t), 22 * (1.3 - f.t), 0, 0, 7); ctx.fill();
        if (f.txt) { ctx.fillStyle = "#fff"; ctx.font = "800 26px Rubik, sans-serif"; ctx.textAlign = "center"; ctx.fillText(f.txt, x, HIT - 60 - (0.6 - f.t) * 60); }
        ctx.globalAlpha = 1;
      }
      if (G.combo >= 5) { ctx.fillStyle = "#FFD166"; ctx.font = "800 30px Rubik, sans-serif"; ctx.textAlign = "center"; ctx.fillText(`${G.combo} seri!`, VW / 2, 90); }
      if (T < 0) { ctx.fillStyle = "#fff"; ctx.font = "800 90px Rubik, sans-serif"; ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.shadowColor = "#A78BFA"; ctx.shadowBlur = 30; ctx.fillText(String(Math.min(4, Math.ceil(-T / G.spb))), VW / 2, VH / 2 - 40); ctx.shadowBlur = 0; ctx.textBaseline = "alphabetic"; }
    }
    ctx.restore();
  }
  function renderHud() {
    for (const i of [0, 1]) $("n" + i).textContent = CFG.names[i];
    $("p0").textContent = G ? G.hits[0][0] : 0; $("p1").textContent = G ? G.hits[1][0] : 0;
    $("round").textContent = `${SONGS[CFG.song].ad}${G ? " · " + G.score + " puan" : ""}`;
    $("pad1").hidden = CFG.mode === "ai";
  }

  /* ---------- girdi ---------- */
  const KM = { a: [0, 0], s: [0, 1], k: [1, 0], l: [1, 1] };
  document.addEventListener("keydown", (e) => {
    const k = KM[e.key.toLowerCase()]; if (!k || !$("menu").hidden || !$("end").hidden || e.repeat) return;
    let p = k[0]; if (isCpu(p)) return;
    e.preventDefault(); audio(); judge(p, k[1]);
  });
  document.querySelectorAll(".pad button").forEach(btn => {
    const p = +btn.dataset.p, l = +btn.dataset.l;
    btn.addEventListener("pointerdown", (e) => { e.preventDefault(); audio(); btn.classList.add("on"); judge(p, l); });
    const off = () => btn.classList.remove("on"); btn.addEventListener("pointerup", off); btn.addEventListener("pointercancel", off); btn.addEventListener("pointerleave", off);
  });

  /* ---------- menü ---------- */
  const form = $("form");
  $("songs").innerHTML = SONGS.map((s, i) => `<label><input type="radio" name="song" value="${i}"${i === 0 ? " checked" : ""}><span>${s.ad}</span></label>`).join("");
  $("songs").style.flexWrap = "wrap";
  function syncForm() { $("f-ai").hidden = form.mode.value !== "ai"; if (form.mode.value === "ai") { if ($("in1").value === "Egemen") $("in1").value = "Bilgisayar"; $("h1").checked = false; } else if ($("in1").value === "Bilgisayar") $("in1").value = "Egemen"; }
  function fillForm() { form.mode.value = CFG.mode; form.song.value = String(CFG.song); form.sp.value = String(CFG.sp); $("in0").value = CFG.names[0]; $("in1").value = CFG.names[1]; $("h0").checked = CFG.help[0]; $("h1").checked = CFG.help[1]; syncForm(); }
  form.addEventListener("change", (e) => { if (e.target.name === "mode") syncForm(); });
  form.addEventListener("submit", (e) => {
    e.preventDefault(); audio();
    const ai = form.mode.value === "ai";
    CFG = { mode: form.mode.value, ai: 0, song: +form.song.value, sp: +form.sp.value, names: [$("in0").value.trim() || "Melodi", $("in1").value.trim() || (ai ? "Bilgisayar" : "Bas")], help: [$("h0").checked, ai ? false : $("h1").checked] };
    store(); $("menu").hidden = true; newGame();
  });
  $("menu-btn").addEventListener("click", () => { fillForm(); $("end").hidden = true; $("menu").hidden = false; if (G) G.over = true; });
  $("end-next").addEventListener("click", () => { $("end").hidden = true; newGame(); });
  $("end-menu").addEventListener("click", () => { fillForm(); $("end").hidden = true; $("menu").hidden = false; });
  fillForm();

  if (!CanvasRenderingContext2D.prototype.roundRect) {
    CanvasRenderingContext2D.prototype.roundRect = function (x, y, w, h, r) { r = Math.min(r, w / 2, h / 2); this.moveTo(x + r, y); this.arcTo(x + w, y, x + w, y + h, r); this.arcTo(x + w, y + h, x, y + h, r); this.arcTo(x, y + h, x, y, r); this.arcTo(x, y, x + w, y, r); this.closePath(); };
  }
  let last = performance.now();
  function loop(t) {
    const dt = Math.min(0.05, (t - last) / 1000); last = t;
    const r = stage.getBoundingClientRect(); if (Math.abs(r.width - W) > 0.5 || Math.abs(r.height - H) > 0.5) resize();
    if ($("menu").hidden && $("end").hidden && !headless) update(dt);
    draw(); requestAnimationFrame(loop);
  }
  resize(); renderHud();
  requestAnimationFrame(loop);

  window.__md = { SONGS, chart, newGame, update, judge, songT, setHeadless: (h) => { headless = h; simT = 0; }, setCFG: (c) => { CFG = Object.assign(CFG, c); }, get G() { return G; } };
})();
