/* Parti Şenliği — tek tuşlu aile parti turnuvası */
(function () {
  "use strict";
  const W = 960, H = 600, TOP = 64;
  const $ = (id) => document.getElementById(id);
  const cv = $("cv"); let ctx = cv.getContext("2d");
  const SAVE = "parti-senligi";
  const rnd = (a, b) => a + Math.random() * (b - a);
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const pick = (a) => a[Math.floor(Math.random() * a.length)];
  const OL = "#2A1A40";
  const PC = ["#E8463F", "#2E86DE", "#3FA34D", "#F2A516"], PC2 = ["#FF8A80", "#8FC2FF", "#8BD96A", "#FFD27A"];
  const KEYS = ["KeyA", "KeyL", "Space", "ArrowUp"], KEYN = ["A", "L", "Boşluk", "↑"];

  /* ---------- ses ---------- */
  let ac = null, master = null, mg = null, muted = false;
  try { muted = localStorage.getItem(SAVE + ":mute") === "1"; } catch (e) {}
  function audio() { if (!ac) { const C = window.AudioContext || window.webkitAudioContext; if (!C) return; ac = new C(); master = ac.createGain(); master.gain.value = muted ? 0 : 1; master.connect(ac.destination); mg = ac.createGain(); mg.gain.value = .4; mg.connect(master); } if (ac.state === "suspended") ac.resume(); }
  let sfxN = 0; setInterval(() => sfxN = 0, 80);
  function tone(f, d, type, vol, when, slide, dest) { if (!ac || muted || fast || sfxN++ > 10) return; const t = when || ac.currentTime, o = ac.createOscillator(), g = ac.createGain(); o.type = type || "triangle"; o.frequency.setValueAtTime(f, t); if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(30, slide), t + d); g.gain.setValueAtTime(.0001, t); g.gain.linearRampToValueAtTime(vol || .1, t + .01); g.gain.exponentialRampToValueAtTime(.0008, t + d); o.connect(g); g.connect(dest || master); o.start(t); o.stop(t + d + .02); }
  let nb = null;
  function noise(d, vol, freq, q) { if (!ac || muted || fast) return; if (!nb) { nb = ac.createBuffer(1, ac.sampleRate, ac.sampleRate); const c = nb.getChannelData(0); for (let i = 0; i < c.length; i++) c[i] = Math.random() * 2 - 1; } const s = ac.createBufferSource(), f = ac.createBiquadFilter(), g = ac.createGain(), t = ac.currentTime; s.buffer = nb; f.type = "bandpass"; f.frequency.value = freq || 1500; f.Q.value = q || 1; g.gain.setValueAtTime(vol || .1, t); g.gain.exponentialRampToValueAtTime(.001, t + d); s.connect(f); f.connect(g); g.connect(master); s.start(t); s.stop(t + d); }
  const now = () => ac ? ac.currentTime : 0;
  const PITCH = [523, 659, 784, 988];
  const sfx = {
    tap(i) { tone(PITCH[i] * .5, .05, "square", .03); }, beep() { tone(660, .12, "square", .06); }, go() { tone(990, .3, "square", .07); },
    pop() { noise(.25, .25, 900); tone(200, .2, "square", .06, 0, 60); }, bonk() { tone(160, .2, "square", .08, 0, 80); noise(.1, .1, 500); },
    jump(i) { tone(PITCH[i], .12, "sine", .07, 0, PITCH[i] * 1.6); }, splash() { noise(.25, .1, 1800); }, coin() { const t = now(); tone(988, .06, "square", .04, t); tone(1319, .14, "square", .04, t + .06); },
    stack(i) { tone(PITCH[i] * .75, .1, "triangle", .1); }, miss() { tone(300, .2, "triangle", .08, 0, 150); }, dash() { noise(.15, .08, 2500); }, hit() { tone(180, .1, "square", .07); noise(.08, .12, 800); },
    fall() { tone(500, .6, "sine", .08, 0, 80); }, finish() { const t = now(); [784, 988, 1175].forEach((f, k) => tone(f, .12, "triangle", .08, t + k * .07)); },
    fanfare() { const t = now(); [[523, 0], [659, .14], [784, .28], [1047, .42], [880, .64], [1047, .78], [1319, .98]].forEach(([f, d]) => { tone(f, .3, "triangle", .12, t + d); tone(f / 2, .3, "sine", .06, t + d); }); }
  };
  const mf = (m) => 440 * Math.pow(2, (m - 69) / 12);
  const SONG = { bpm: 150, lead: [72, 76, 79, 76, 77, 74, 71, 74, 72, 76, 79, 84, 83, 79, 76, 0, 72, 76, 79, 76, 77, 81, 79, 77, 76, 74, 72, 71, 72, 0, 0, 0], bass: [48, 0, 55, 0, 50, 0, 55, 0, 48, 0, 55, 0, 52, 0, 55, 0, 53, 0, 57, 0, 50, 0, 55, 0, 48, 0, 55, 0, 48, 43, 48, 0] };
  let mStep = 0, mNext = 0;
  setInterval(() => {
    if (!ac || muted || mode !== "play") { if (ac) mNext = Math.max(mNext, ac.currentTime); return; }
    const d = 60 / SONG.bpm / 2; if (mNext < ac.currentTime) mNext = ac.currentTime + .05;
    while (mNext < ac.currentTime + .3) { const i = mStep % 32; if (SONG.lead[i]) tone(mf(SONG.lead[i]), d * .9, "square", .018, mNext, 0, mg); if (SONG.bass[i]) tone(mf(SONG.bass[i]), d * .9, "triangle", .06, mNext, 0, mg); if (i % 4 === 0) noise(.04, .05, 150); if (i % 4 === 2) noise(.03, .03, 7000); mStep++; mNext += d; }
  }, 90);

  /* ---------- oyuncular ve girdi ---------- */
  let P = []; // {name, ci, easy, cpu, score}
  const down = [false, false, false, false], pressed = [0, 0, 0, 0], released = [0, 0, 0, 0];
  function pressI(i) { if (!P[i] || P[i].cpu) return; if (!down[i]) { pressed[i]++; } down[i] = true; }
  function releaseI(i) { if (!P[i] || P[i].cpu) return; if (down[i]) released[i]++; down[i] = false; }
  addEventListener("keydown", (e) => { const i = KEYS.indexOf(e.code); if (i < 0 || (e.target && e.target.tagName === "INPUT")) return; if (mode === "play" || mode === "count") { e.preventDefault(); if (!e.repeat) pressI(i); } });
  addEventListener("keyup", (e) => { const i = KEYS.indexOf(e.code); if (i >= 0) releaseI(i); });
  addEventListener("blur", () => { for (let i = 0; i < 4; i++) releaseI(i); });
  function buildTouch() {
    const box = $("tbtns"); box.innerHTML = "";
    P.forEach((p, i) => { if (p.cpu) return; const b = document.createElement("div"); b.className = "tbtn p" + i; b.style.background = PC[p.ci]; b.textContent = p.name; b.setAttribute("aria-label", p.name + " düğmesi");
      b.addEventListener("pointerdown", (e) => { e.preventDefault(); audio(); b.classList.add("on"); pressI(i); try { b.setPointerCapture(e.pointerId); } catch (x) {} });
      const off = (e) => { e.preventDefault(); b.classList.remove("on"); releaseI(i); }; b.addEventListener("pointerup", off); b.addEventListener("pointercancel", off); b.addEventListener("lostpointercapture", off); b.addEventListener("contextmenu", (e) => e.preventDefault());
      box.appendChild(b); });
  }
  // bilgisayar oyuncusu için sanal tuş
  function cpuPress(i) { pressed[i]++; down[i] = true; cpuHold[i] = .08; }
  const cpuHold = [0, 0, 0, 0];

  /* ---------- çizim yardımcıları ---------- */
  function circle(c, x, y, r, fill, lw) { c.beginPath(); c.arc(x, y, Math.max(.1, r), 0, Math.PI * 2); if (fill) { c.fillStyle = fill; c.fill(); } if (lw) { c.strokeStyle = OL; c.lineWidth = lw; c.stroke(); } }
  function ell(c, x, y, rx, ry, rot, fill, lw) { c.beginPath(); c.ellipse(x, y, Math.max(.1, rx), Math.max(.1, ry), rot || 0, 0, Math.PI * 2); if (fill) { c.fillStyle = fill; c.fill(); } if (lw) { c.strokeStyle = OL; c.lineWidth = lw; c.stroke(); } }
  function rr(c, x, y, w, h, r) { c.beginPath(); c.moveTo(x + r, y); c.arcTo(x + w, y, x + w, y + h, r); c.arcTo(x + w, y + h, x, y + h, r); c.arcTo(x, y + h, x, y, r); c.arcTo(x, y, x + w, y, r); c.closePath(); }
  function txt(s, x, y, size, col, align) { ctx.font = "700 " + size + "px Fredoka, sans-serif"; ctx.textAlign = align || "center"; ctx.textBaseline = "middle"; ctx.lineWidth = Math.max(3, size * .18); ctx.strokeStyle = "rgba(30,10,50,.85)"; ctx.strokeText(s, x, y); ctx.fillStyle = col; ctx.fillText(s, x, y); }
  // Pofuduk karakter
  function blob(c, ci, x, y, r, o) {
    o = o || {}; const col = PC[ci], sq = o.sq || 0, run = o.run || 0, dir = o.dir || 1;
    c.save(); c.translate(x, y);
    if (!o.noShadow) { c.globalAlpha = .25; ell(c, 0, r * .95, r * .9, r * .25, 0, "#000"); c.globalAlpha = 1; }
    // ayaklar
    const lf = Math.sin(run) * r * .35;
    ell(c, -r * .4 + lf * .5, r * .85, r * .3, r * .16, 0, "#2A1A40"); ell(c, r * .4 - lf * .5, r * .85, r * .3, r * .16, 0, "#2A1A40");
    c.scale(1 + sq * .25, 1 - sq * .25);
    circle(c, 0, 0, r, col, Math.max(2, r * .09));
    ell(c, 0, r * .3, r * .6, r * .5, 0, "rgba(255,255,255,.35)");
    ell(c, -r * .35, -r * .4, r * .22, r * .14, -.6, "rgba(255,255,255,.5)");
    // yüz
    const ex = r * .32 * dir * .25, dizzy = o.dizzy;
    for (const s of [-1, 1]) { if (dizzy) { c.strokeStyle = OL; c.lineWidth = r * .08; c.beginPath(); c.moveTo(s * r * .3 + ex - r * .1, -r * .2 - r * .1); c.lineTo(s * r * .3 + ex + r * .1, -r * .2 + r * .1); c.moveTo(s * r * .3 + ex + r * .1, -r * .2 - r * .1); c.lineTo(s * r * .3 + ex - r * .1, -r * .2 + r * .1); c.stroke(); } else { circle(c, s * r * .3 + ex, -r * .18, r * .17, "#fff"); circle(c, s * r * .3 + ex + dir * r * .05, -r * .16, r * .09, OL); } }
    c.strokeStyle = OL; c.lineWidth = r * .08; c.beginPath();
    if (o.mood > 0) c.arc(ex, r * .1, r * .28, .15 * Math.PI, .85 * Math.PI); else if (o.mood < 0) c.arc(ex, r * .45, r * .22, 1.2 * Math.PI, 1.8 * Math.PI); else { c.moveTo(ex - r * .15, r * .22); c.lineTo(ex + r * .15, r * .22); }
    c.stroke();
    c.globalAlpha = .45; ell(c, -r * .55, r * .1, r * .14, r * .09, 0, "#FF7AA2"); ell(c, r * .55, r * .1, r * .14, r * .09, 0, "#FF7AA2"); c.globalAlpha = 1;
    // şapkalar
    if (ci === 0) { c.beginPath(); c.moveTo(-r * .45, -r * .8); c.lineTo(0, -r * 1.75); c.lineTo(r * .45, -r * .8); c.closePath(); c.fillStyle = "#FFD23F"; c.fill(); c.strokeStyle = OL; c.lineWidth = r * .07; c.stroke(); circle(c, 0, -r * 1.75, r * .14, "#FF5A8A"); for (let k = 0; k < 3; k++) circle(c, -r * .15 + k * r * .15, -r * 1.05 - k * r * .2, r * .06, "#E8463F"); }
    else if (ci === 1) { c.beginPath(); c.arc(0, -r * .7, r * .62, Math.PI, 0); c.closePath(); c.fillStyle = "#1E5A9E"; c.fill(); c.strokeStyle = OL; c.lineWidth = r * .07; c.stroke(); ell(c, r * .55 * dir, -r * .72, r * .45, r * .12, 0, "#1E5A9E", r * .07); }
    else if (ci === 2) { c.beginPath(); c.moveTo(-r * .5, -r * .75); c.lineTo(-r * .5, -r * 1.25); c.lineTo(-r * .25, -r * 1); c.lineTo(0, -r * 1.35); c.lineTo(r * .25, -r * 1); c.lineTo(r * .5, -r * 1.25); c.lineTo(r * .5, -r * .75); c.closePath(); c.fillStyle = "#FFD23F"; c.fill(); c.strokeStyle = OL; c.lineWidth = r * .07; c.stroke(); circle(c, 0, -r * .95, r * .08, "#E8463F"); }
    else { for (let k = 0; k < 5; k++) { const a = k / 5 * Math.PI * 2; circle(c, r * .35 + Math.cos(a) * r * .2, -r * .85 + Math.sin(a) * r * .2, r * .14, "#FF7AA2"); } circle(c, r * .35, -r * .85, r * .1, "#FFD23F"); }
    c.restore();
  }

  /* ---------- mini oyunlar ---------- */
  let G = null, mt = 0, fx = [], floaters = [];
  const n = () => P.length;
  const laneY = (i) => TOP + 20 + (H - TOP - 30) / n() * (i + .5);
  const laneH = () => (H - TOP - 30) / n();
  const colX = (i) => W / n() * (i + .5), colW = () => W / n();
  function seeded(s) { return () => { s = (s * 16807) % 2147483647; return (s - 1) / 2147483646; }; }
  const GAMES = {
    kosu: {
      name: "Koşu", icon: "🏃", desc: "Tuşuna olabildiğince hızlı bas, bitiş çizgisine ilk sen var!", time: 30,
      init() { this.x = P.map(() => 0); this.v = P.map(() => 0); this.fin = P.map(() => null); this.L = 740; this.run = P.map(() => 0); this.k = 0; },
      cpu(i, dt, sk) { if (Math.random() < dt * (4.5 + sk * 4)) cpuPress(i); },
      update(dt) { P.forEach((p, i) => { for (let k = 0; k < pressed[i]; k++) { this.v[i] += p.easy ? 28 : 18; sfx.tap(i); } this.v[i] *= Math.pow(.18, dt); if (this.fin[i] == null) { this.x[i] += this.v[i] * dt; if (this.x[i] >= this.L) { this.x[i] = this.L; this.fin[i] = mt; sfx.finish(); burst(110 + this.L, laneY(i), PC[P[i].ci]); } } this.run[i] += this.v[i] * dt * .12; }); if (this.fin.every((f) => f != null) || mt >= this.time) this.done = true; },
      rank() { return P.map((p, i) => i).map((i) => ({ i, v: this.fin[i] != null ? -this.fin[i] + 1e4 : this.x[i] })); },
      result(i) { return this.fin[i] != null ? this.fin[i].toFixed(1) + " sn" : Math.round(this.x[i] / this.L * 100) + "%"; },
      draw() {
        skyGrad("#8FD3FF", "#D6F1FF"); ctx.fillStyle = "#6CC157"; ctx.fillRect(0, TOP, W, H - TOP);
        for (let i = 0; i < 60; i++) circle(ctx, (i * 37) % W, TOP + 8 + (i % 3) * 6, 6, ["#FF7AA2", "#FFD23F", "#8FC2FF", "#fff"][i % 4]);
        P.forEach((p, i) => { const y = laneY(i), h = laneH(); ctx.fillStyle = i % 2 ? "#D86A48" : "#E07A55"; ctx.fillRect(0, y - h * .3, W, h * .6); ctx.fillStyle = "rgba(255,255,255,.6)"; ctx.fillRect(0, y + h * .3 - 2, W, 3);
          ctx.fillStyle = "#fff"; for (let k = 0; k < 8; k++) { ctx.fillStyle = k % 2 ? "#fff" : OL; ctx.fillRect(110 + this.L + 16, y - h * .3 + k * h * .6 / 8, 10, h * .6 / 8); ctx.fillStyle = k % 2 ? OL : "#fff"; ctx.fillRect(110 + this.L + 26, y - h * .3 + k * h * .6 / 8, 10, h * .6 / 8); }
          const r = Math.min(30, h * .28); blob(ctx, p.ci, 110 + this.x[i], y - r * .3 - Math.abs(Math.sin(this.run[i])) * 6, r, { run: this.run[i], mood: this.fin[i] != null ? 1 : 0, sq: Math.sin(this.run[i] * 2) * .1 });
          txt(p.name, 50, y, 16, PC2[p.ci]);
          if (this.fin[i] != null) txt(this.fin[i].toFixed(1) + " sn", 110 + this.L - 60, y - r - 10, 18, "#FFD23F"); });
      }
    },
    balon: {
      name: "Balon Şişir", icon: "🎈", desc: "Tuşunu BASILI TUT, balon şişsin. Patlamadan BIRAK!\nEn büyük balon kazanır. Ama nerede patlayacağı belli değil...", time: 11,
      init() { this.s = P.map(() => 0); this.st = P.map(() => "bekle"); this.pop = P.map((p) => rnd(p.easy ? .7 : .6, 1)); this.cpuT = P.map(() => rnd(.5, .85)); },
      cpu(i, dt) { if (mt > .4 && this.st[i] !== "dur" && this.st[i] !== "patladi") { if (this.s[i] < this.cpuT[i]) { if (!down[i]) cpuPress(i); cpuHold[i] = .2; } else { cpuHold[i] = 0; down[i] = false; released[i]++; } } },
      update(dt) { P.forEach((p, i) => { const st = this.st[i]; if ((st === "bekle" || st === "sis") && down[i]) { this.st[i] = "sis"; this.s[i] += dt * .15 * (1 + this.s[i] * .4); if (Math.random() < dt * 8) tone(200 + this.s[i] * 600, .05, "sine", .03); if (this.s[i] >= this.pop[i]) { this.st[i] = "patladi"; sfx.pop(); burst(colX(i), 300, PC[p.ci], 30); } } else if (st === "sis" && !down[i]) { this.st[i] = "dur"; sfx.finish(); } });
        if (mt > this.time - 1) P.forEach((p, i) => { if (this.st[i] === "sis" || this.st[i] === "bekle") this.st[i] = "dur"; });
        if (this.st.every((s) => s === "dur" || s === "patladi")) this.done = true; },
      rank() { return P.map((p, i) => ({ i, v: this.st[i] === "patladi" ? -1 : this.s[i] })); },
      result(i) { return this.st[i] === "patladi" ? "Patladı!" : Math.round(this.s[i] * 100) + " cm"; },
      draw() { skyGrad("#FFD6E8", "#FFF3D8"); ctx.fillStyle = "#8BD96A"; ctx.fillRect(0, 520, W, 80);
        P.forEach((p, i) => { const x = colX(i), s = this.s[i], st = this.st[i], r = 18 + s * Math.min(110, colW() * .42);
          ctx.strokeStyle = "#666"; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(x, 470); ctx.quadraticCurveTo(x + 10, 430 - r * .2, x, 420 - r * 1.1); ctx.stroke();
          if (st !== "patladi") { ell(ctx, x, 420 - r * 1.15, r * .92, r, 0, PC[p.ci], 3); ell(ctx, x - r * .35, 420 - r * 1.5, r * .18, r * .28, -.4, "rgba(255,255,255,.55)"); ctx.fillStyle = PC[p.ci]; ctx.beginPath(); ctx.moveTo(x - 6, 420 - r * .12); ctx.lineTo(x + 6, 420 - r * .12); ctx.lineTo(x, 420 - r * .28); ctx.fill(); }
          else { txt("PAT!", x, 300, 46, "#FFD23F"); }
          ctx.fillStyle = "#8E8E9E"; rr(ctx, x - 14, 470, 28, 50, 4); ctx.fill(); ctx.strokeStyle = OL; ctx.lineWidth = 2; ctx.stroke(); ctx.fillStyle = "#666"; ctx.fillRect(x - 3, 448 + (down[i] ? 18 : 0), 6, 24); ctx.fillStyle = PC[p.ci]; ctx.fillRect(x - 16, 444 + (down[i] ? 18 : 0), 32, 8);
          blob(ctx, p.ci, x + 44, 500, 22, { mood: st === "patladi" ? -1 : st === "dur" ? 1 : 0, dizzy: st === "patladi" });
          txt(p.name, x, 580, 18, PC2[p.ci]); if (st === "dur") txt(Math.round(s * 100) + " cm", x, 548, 18, "#fff"); });
      }
    },
    engel: {
      name: "Engel Atla", icon: "🚧", desc: "Koşucular kendi kendine koşuyor. Engel gelince tuşuna bas ve ZIPLA!\nTakılan yavaşlar. En uzağa giden kazanır.", time: 20,
      init() { this.s = P.map(() => 0); this.j = P.map(() => -1); this.slow = P.map(() => 0); this.hit = P.map(() => new Set()); const r = seeded(77 + Math.floor(Math.random() * 1000)); this.h = []; let d = 500; while (d < 7000) { this.h.push(d); d += 230 + r() * 230; } this.run = P.map(() => 0); },
      cpu(i, dt, sk) { const nx = this.h.find((d) => d > this.s[i] + 10); if (nx != null && this.j[i] < 0) { const dist = nx - this.s[i]; if (dist < 72 && dist > 40 && Math.random() < .25 + sk * .5) cpuPress(i); } },
      update(dt) { P.forEach((p, i) => { const jl = p.easy ? .78 : .6;
          if (pressed[i] && this.j[i] < 0) { this.j[i] = 0; sfx.jump(i); }
          if (this.j[i] >= 0) { this.j[i] += dt; if (this.j[i] >= jl) this.j[i] = -1; }
          this.slow[i] = Math.max(0, this.slow[i] - dt); const sp = this.slow[i] > 0 ? 120 : 240; this.s[i] += sp * dt; this.run[i] += sp * dt * .06;
          const hgt = this.j[i] >= 0 ? Math.sin(this.j[i] / jl * Math.PI) * 70 : 0;
          for (const d of this.h) { if (this.hit[i].has(d)) continue; if (Math.abs(d - this.s[i]) < 16 && hgt < 24) { this.hit[i].add(d); this.slow[i] = 1; sfx.bonk(); } } });
        if (mt >= this.time) this.done = true; },
      rank() { return P.map((p, i) => ({ i, v: this.s[i] })); },
      result(i) { return Math.round(this.s[i] / 10) + " m"; },
      draw() { skyGrad("#7EC8FF", "#D6F1FF");
        P.forEach((p, i) => { const y = laneY(i), h = laneH(); ctx.fillStyle = i % 2 ? "#5DB34A" : "#6CC157"; ctx.fillRect(0, y - h * .5, W, h); ctx.fillStyle = "#C9A066"; ctx.fillRect(0, y + h * .12, W, h * .16);
          const off = this.s[i] % 60; ctx.fillStyle = "rgba(0,0,0,.12)"; for (let x = -off; x < W; x += 60) ctx.fillRect(x, y + h * .12, 20, h * .16);
          const px = 170, r = Math.min(26, h * .26);
          for (const d of this.h) { const hx = px + d - this.s[i]; if (hx < -30 || hx > W + 30) continue; const hit = this.hit[i].has(d); ctx.save(); ctx.translate(hx, y + h * .2); if (hit) ctx.rotate(.6); ctx.fillStyle = "#fff"; ctx.fillRect(-14, -34, 6, 34); ctx.fillRect(8, -34, 6, 34); ctx.fillStyle = "#E8463F"; ctx.fillRect(-18, -34, 36, 9); ctx.fillStyle = "#fff"; ctx.fillRect(-8, -34, 8, 9); ctx.strokeStyle = OL; ctx.lineWidth = 2; ctx.strokeRect(-18, -34, 36, 9); ctx.restore(); }
          const jl = p.easy ? .78 : .6, hgt = this.j[i] >= 0 ? Math.sin(this.j[i] / jl * Math.PI) * 70 : 0;
          blob(ctx, p.ci, px, y + h * .2 - r * .9 - hgt, r, { run: this.j[i] >= 0 ? 0 : this.run[i], mood: this.slow[i] > 0 ? -1 : 1, dizzy: this.slow[i] > .5, sq: this.j[i] >= 0 ? -.2 : 0 });
          txt(p.name, 60, y - h * .3, 16, PC2[p.ci]); txt(Math.round(this.s[i] / 10) + " m", W - 70, y - h * .3, 18, "#fff"); });
      }
    },
    balik: {
      name: "Balık Tut", icon: "🎣", desc: "Teknen kendi kendine gidip geliyor. Balığın üstündeyken tuşuna bas, oltayı at!\nAltın balık 5 puan, mavi 2, turuncu 1. Eski çizme 0!", time: 25,
      init() { const seed = 1 + Math.floor(Math.random() * 5000); this.c = P.map((p, i) => { const r = seeded(seed); const fish = []; for (let k = 0; k < 6; k++) fish.push(newFish(r)); return { r, fish, hook: 0, hs: "bos", got: null, score: 0, ph: 0 }; }); },
      cpu(i, dt, sk) { const C = this.c[i]; if (C.hs !== "bos") return; const bx = this.boatX(i); if (C.fish.some((f) => Math.abs(this.fx(i, f) - bx) < 14 && f.v > 0) && Math.random() < .08 + sk * .15) cpuPress(i); },
      boatX(i) { return colX(i) + Math.sin(mt * 1.1 + i * .7) * (colW() * .5 - 40); },
      fx(i, f) { return colX(i) - colW() / 2 + 20 + f.x * (colW() - 40); },
      update(dt) { P.forEach((p, i) => { const C = this.c[i];
          for (const f of C.fish) { if (f === C.got) continue; f.x += f.sp * f.d * dt; if (f.x < 0) { f.x = 0; f.d = 1; } if (f.x > 1) { f.x = 1; f.d = -1; } }
          if (pressed[i] && C.hs === "bos") { C.hs = "in"; C.hx = this.boatX(i); C.hook = 0; sfx.splash(); }
          if (C.hs === "in") { C.hook += 420 * dt; const hy = 190 + C.hook; for (const f of C.fish) { if (Math.abs(this.fx(i, f) - C.hx) < (p.easy ? 34 : 22) && Math.abs(f.y - hy) < 18) { C.got = f; C.hs = "cik"; sfx.splash(); break; } } if (hy > 560) C.hs = "cik"; }
          else if (C.hs === "cik") { C.hook -= 520 * dt; if (C.got) { C.got.y = 190 + C.hook; } if (C.hook <= 0) { if (C.got) { C.score += C.got.v; if (C.got.v) { sfx.coin(); floaters.push({ x: C.hx, y: 150, text: "+" + C.got.v, col: "#FFD23F", t: 0 }); } else { sfx.miss(); floaters.push({ x: C.hx, y: 150, text: "Çizme!", col: "#fff", t: 0 }); } C.fish.splice(C.fish.indexOf(C.got), 1, newFish(C.r)); C.got = null; } C.hs = "bos"; } } });
        if (mt >= this.time) this.done = true; },
      rank() { return P.map((p, i) => ({ i, v: this.c[i].score })); },
      result(i) { return this.c[i].score + " puan"; },
      draw() { skyGrad("#FFB86A", "#FFE6B0"); const g = ctx.createLinearGradient(0, 180, 0, H); g.addColorStop(0, "#3AA0E0"); g.addColorStop(1, "#14568E"); ctx.fillStyle = g; ctx.fillRect(0, 180, W, H - 180);
        ctx.strokeStyle = "rgba(255,255,255,.4)"; ctx.lineWidth = 2; for (let x = 0; x < W; x += 30) { ctx.beginPath(); ctx.moveTo(x, 184 + Math.sin(mt * 2 + x) * 2); ctx.lineTo(x + 14, 184 + Math.sin(mt * 2 + x + 1) * 2); ctx.stroke(); }
        P.forEach((p, i) => { const C = this.c[i], bx = this.boatX(i);
          if (i > 0) { ctx.fillStyle = "rgba(20,60,30,.5)"; ctx.fillRect(colW() * i - 3, 180, 6, H - 180); for (let y = 200; y < H; y += 40) ell(ctx, colW() * i, y, 6, 16, 0, "#3E8E44"); }
          for (const f of C.fish) drawFish(this.fx(i, f) + (f === C.got ? C.hx - this.fx(i, f) : 0), f.y, f, f.d);
          const hx = C.hs === "bos" ? bx : C.hx, hy = 190 + (C.hs === "bos" ? 0 : C.hook);
          ctx.strokeStyle = "#333"; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(hx + 26, 150); ctx.lineTo(hx, hy); ctx.stroke(); ctx.strokeStyle = "#888"; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(hx, hy + 4, 6, 0, Math.PI); ctx.stroke();
          ctx.fillStyle = "#A0673A"; ctx.beginPath(); ctx.moveTo(bx - 40, 172); ctx.lineTo(bx + 40, 172); ctx.lineTo(bx + 30, 192); ctx.lineTo(bx - 30, 192); ctx.closePath(); ctx.fill(); ctx.strokeStyle = OL; ctx.lineWidth = 2.5; ctx.stroke();
          blob(ctx, p.ci, bx - 6, 150, 20, { mood: 1, noShadow: 1 }); ctx.strokeStyle = "#7A4A26"; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(bx + 4, 160); ctx.lineTo(hx + 26, 150 - 30); ctx.stroke();
          txt(p.name + ": " + C.score, colX(i), TOP + 16, 20, PC2[p.ci]); });
      }
    },
    bes: {
      name: "Tam 5 Saniye", icon: "⏱️", desc: "Saat 2 saniye sonra gizlenecek. İçinden say ve TAM 5. saniyede tuşuna bas!\nEn yakın tahmin kazanır.", time: 12,
      init() { this.at = P.map(() => null); this.cpuAt = P.map(() => 5 + (Math.random() + Math.random() + Math.random() - 1.5) * .55); },
      cpu(i) { if (this.at[i] == null && mt >= this.cpuAt[i]) cpuPress(i); },
      update() { P.forEach((p, i) => { if (pressed[i] && this.at[i] == null) { this.at[i] = mt; sfx.stack(i); } }); if (this.at.every((a) => a != null) || mt >= this.time) this.done = true; },
      rank() { return P.map((p, i) => ({ i, v: this.at[i] == null ? -99 : -Math.abs(this.at[i] - 5) })); },
      result(i) { return this.at[i] == null ? "Basmadı" : this.at[i].toFixed(2) + " sn"; },
      draw() { skyGrad("#2A1050", "#5A2A9A"); for (let i = 0; i < 40; i++) circle(ctx, (i * 97) % W, (i * 53) % 400 + TOP, 1.5, "rgba(255,255,255,.6)");
        const cx = W / 2, cy = 260, show = mt < 2 || this.done;
        circle(ctx, cx, cy, 130, "#FFF8FF", 6); for (let k = 0; k < 12; k++) { const a = k / 12 * Math.PI * 2; ctx.fillStyle = OL; ctx.fillRect(cx + Math.cos(a) * 112 - 3, cy + Math.sin(a) * 112 - 3, 6, 6); }
        if (show) { const a = -Math.PI / 2 + mt / 10 * Math.PI * 2; ctx.strokeStyle = "#E8463F"; ctx.lineWidth = 6; ctx.lineCap = "round"; ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(cx + Math.cos(a) * 100, cy + Math.sin(a) * 100); ctx.stroke(); txt(mt.toFixed(1), cx, cy + 50, 34, "#2A1A40"); } else { txt("?", cx, cy + 6, 120, "#7A3AB8"); }
        circle(ctx, cx, cy, 8, OL);
        P.forEach((p, i) => { const x = colX(i); blob(ctx, p.ci, x, 500, 34, { mood: this.at[i] != null ? 1 : 0, sq: this.at[i] != null && mt - this.at[i] < .2 ? .3 : 0 }); txt(p.name, x, 560, 18, PC2[p.ci]); if (this.at[i] != null) txt(this.done ? this.at[i].toFixed(2) + " sn" : "BASTI!", x, 440, 22, "#FFD23F"); });
      }
    },
    ceviz: {
      name: "Cevizden Kaç", icon: "🥥", desc: "Karakterin sağa sola koşuyor. Tuşuna basınca YÖN DEĞİŞTİRİR.\nDüşen hindistan cevizlerinden kaç! 3 canın var.", time: 25,
      init() { const seed = 1 + Math.floor(Math.random() * 5000); this.c = P.map((p, i) => ({ r: seeded(seed), x: .5, d: i % 2 ? 1 : -1, lives: 3, dz: 0, out: null, nuts: [], next: .8, run: 0 })); },
      cpu(i, dt, sk) { const C = this.c[i]; if (C.lives <= 0) return; const px = C.x, ahead = px + C.d * .12; for (const nut of C.nuts) if (nut.y > 300 && Math.abs(nut.x - ahead) < .14 && Math.random() < .1 + sk * .3) { cpuPress(i); break; } },
      update(dt) { P.forEach((p, i) => { const C = this.c[i]; if (C.lives <= 0) return;
          if (pressed[i]) { C.d *= -1; sfx.jump(i); }
          const w = colW(); C.x += C.d * 190 / w * dt; if (C.x < .08) { C.x = .08; C.d = 1; } if (C.x > .92) { C.x = .92; C.d = -1; } C.run += dt * 14; C.dz = Math.max(0, C.dz - dt);
          C.next -= dt; if (C.next <= 0) { C.next = Math.max(.35, .9 - mt * .02) * (.7 + C.r() * .6); C.nuts.push({ x: .06 + C.r() * .88, y: TOP, v: 0 }); }
          const g = p.easy ? 340 : 480; for (const nut of C.nuts) { nut.v += g * dt; nut.y += nut.v * dt; if (!nut.hit && C.dz <= 0 && nut.y > 490 && nut.y < 540 && Math.abs(nut.x - C.x) * w < 30) { nut.hit = 1; C.lives--; C.dz = 1.2; sfx.bonk(); if (C.lives <= 0) C.out = mt; } }
          C.nuts = C.nuts.filter((nut) => nut.y < H + 20 && !nut.hit); });
        if (mt >= this.time || this.c.every((C) => C.lives <= 0) || (n() > 1 && this.c.filter((C) => C.lives > 0).length === 0)) this.done = true; },
      rank() { return P.map((p, i) => ({ i, v: this.c[i].lives * 100 + (this.c[i].out != null ? this.c[i].out : 50) })); },
      result(i) { const C = this.c[i]; return C.lives > 0 ? C.lives + " can kaldı" : C.out.toFixed(1) + " sn dayandı"; },
      draw() { skyGrad("#7EC8FF", "#D6F1FF"); ctx.fillStyle = "#F2D58A"; ctx.fillRect(0, 540, W, 60);
        for (let x = 30; x < W; x += 120) { ctx.strokeStyle = "#7A4A26"; ctx.lineWidth = 10; ctx.beginPath(); ctx.moveTo(x, TOP); ctx.lineTo(x + 10, TOP + 40); ctx.stroke(); for (let k = 0; k < 5; k++) { ctx.save(); ctx.translate(x, TOP + 10); ctx.rotate(-.3 + k * .6); ctx.fillStyle = k % 2 ? "#2E8A3A" : "#3FA34D"; ctx.beginPath(); ctx.ellipse(40, 0, 44, 10, 0, 0, 7); ctx.fill(); ctx.restore(); } }
        P.forEach((p, i) => { const C = this.c[i], x0 = colX(i) - colW() / 2, w = colW();
          if (i > 0) { ctx.fillStyle = "rgba(255,255,255,.4)"; ctx.fillRect(x0 - 2, TOP, 4, H - TOP); }
          for (const nut of C.nuts) { const nx = x0 + nut.x * w; ctx.globalAlpha = .25; ell(ctx, nx, 548, 10 + nut.y / 60, 4, 0, "#000"); ctx.globalAlpha = 1; circle(ctx, nx, nut.y, 15, "#7A4A26", 2.5); circle(ctx, nx - 4, nut.y - 4, 3, "#5A3A1E"); circle(ctx, nx + 4, nut.y - 3, 3, "#5A3A1E"); }
          if (C.lives > 0 || Math.floor(mt * 6) % 2) blob(ctx, p.ci, x0 + C.x * w, 515, 24, { run: C.run, dir: C.d, dizzy: C.dz > 0, mood: C.lives > 0 ? 1 : -1 });
          for (let k = 0; k < 3; k++) heart(x0 + w / 2 - 30 + k * 30, TOP + 84, k < C.lives);
          txt(p.name, colX(i), TOP + 50, 18, PC2[p.ci]); if (C.lives <= 0) txt("ELENDİ", colX(i), 330, 30, "#fff"); });
      }
    },
    kule: {
      name: "Kule Yap", icon: "🧱", desc: "Üstte kayan bloğu tam kulenin üstüne gelince bırak (tuşuna bas)!\nKaçırırsan blok düşer. En yüksek kule kazanır.", time: 25,
      init() { this.c = P.map(() => ({ stack: [0], fall: null, miss: 0, ph: rnd(0, 6) })); },
      speed(i) { const C = this.c[i]; return (1.8 + C.stack.length * .22) * (P[i].easy ? .7 : 1); },
      bx(i) { const C = this.c[i]; return Math.sin(C.ph) * Math.min(colW() / 2 - 50, 140); },
      cpu(i, dt, sk) { const C = this.c[i]; if (C.fall || C.miss > 0) return; const top = C.stack[C.stack.length - 1]; if (Math.abs(this.bx(i) - top) < 10 && Math.random() < .06 + sk * .2) cpuPress(i); else if (Math.random() < dt * (1 - sk) * .8) cpuPress(i); },
      update(dt) { P.forEach((p, i) => { const C = this.c[i]; C.miss = Math.max(0, C.miss - dt); C.cool = Math.max(0, (C.cool || 0) - dt);
          if (!C.fall) C.ph += this.speed(i) * dt;
          if (pressed[i] && !C.fall && C.miss <= 0 && !(C.cool > 0)) C.fall = { x: this.bx(i), y: 0, v: 0 };
          if (C.fall) { C.fall.v += 1600 * dt; C.fall.y += C.fall.v * dt; if (C.fall.y >= 70) { const top = C.stack[C.stack.length - 1], tol = p.easy ? 44 : 32; if (Math.abs(C.fall.x - top) < tol) { C.stack.push(C.fall.x); sfx.stack(i); C.cool = .35; } else { C.miss = .6; sfx.miss(); } C.fall = null; } } });
        if (mt >= this.time) this.done = true; },
      rank() { return P.map((p, i) => ({ i, v: this.c[i].stack.length })); },
      result(i) { return (this.c[i].stack.length - 1) + " kat"; },
      draw() { skyGrad("#9FD8FF", "#EAF8FF"); ctx.fillStyle = "#6CC157"; ctx.fillRect(0, 560, W, 40);
        P.forEach((p, i) => { const C = this.c[i], cx = colX(i), bw = Math.min(90, colW() * .42), bh = 30, base = 560, k = C.stack.length, cam = Math.max(0, k - 11) * bh;
          if (i > 0) { ctx.fillStyle = "rgba(255,255,255,.5)"; ctx.fillRect(colW() * i - 2, TOP, 4, H - TOP); }
          C.stack.forEach((sx, j) => { const y = base - (j + 1) * bh + cam; if (y < TOP - bh) return; ctx.fillStyle = j === 0 ? "#8E8E9E" : j % 2 ? PC[p.ci] : PC2[p.ci]; rr(ctx, cx + sx - bw / 2, y, bw, bh - 2, 6); ctx.fill(); ctx.strokeStyle = OL; ctx.lineWidth = 2; ctx.stroke(); ctx.fillStyle = "rgba(255,255,255,.3)"; ctx.fillRect(cx + sx - bw / 2 + 4, y + 3, bw - 8, 4); });
          const topY = base - k * bh + cam, hy = Math.min(topY - 140, TOP + 90);
          const bx = C.fall ? C.fall.x : this.bx(i), by = C.fall ? hy + C.fall.y * ((topY - bh - hy) / 70) : hy;
          if (C.miss <= 0 || C.fall) { ctx.fillStyle = PC[p.ci]; rr(ctx, cx + bx - bw / 2, by, bw, bh - 2, 6); ctx.fill(); ctx.strokeStyle = OL; ctx.lineWidth = 2; ctx.stroke(); }
          if (!C.fall) { ctx.strokeStyle = "rgba(0,0,0,.25)"; ctx.setLineDash([4, 6]); ctx.beginPath(); ctx.moveTo(cx + bx, by + bh); ctx.lineTo(cx + bx, topY); ctx.stroke(); ctx.setLineDash([]); }
          blob(ctx, p.ci, cx + bw / 2 + 22, base - 22, 20, { mood: C.miss > 0 ? -1 : 1 });
          txt(p.name + ": " + (k - 1), cx, TOP + 20, 20, PC2[p.ci]); });
      }
    },
    sumo: {
      name: "Sumo Arabaları", icon: "🚗", desc: "Araban kendi etrafında dönüyor. Tuşuna basınca baktığı yöne FIRLAR!\nDiğerlerini halkadan dışarı it, sen düşme!", time: 35,
      init() { this.R = 235; this.cx = 480; this.cy = 340; this.c = P.map((p, i) => { const a = i / n() * Math.PI * 2 + .4; return { x: this.cx + Math.cos(a) * 140, y: this.cy + Math.sin(a) * 120, vx: 0, vy: 0, ang: a + Math.PI, spin: i % 2 ? 2.4 : -2.4, cd: 0, out: null, fallT: 0, m: p.easy ? 1.7 : 1 }; }); },
      cpu(i, dt, sk) { const C = this.c[i]; if (C.out != null || C.cd > 0) return; const fx = Math.cos(C.ang), fy = Math.sin(C.ang), dc = Math.hypot(C.x - this.cx, C.y - this.cy);
        if (dc > 150) { const tx = (this.cx - C.x) / dc, ty = (this.cy - C.y) / dc; if (fx * tx + fy * ty > .85 && Math.random() < .5 + sk * .4) cpuPress(i); return; }
        for (let j = 0; j < n(); j++) { if (j === i || this.c[j].out != null) continue; const dx = this.c[j].x - C.x, dy = this.c[j].y - C.y, d = Math.hypot(dx, dy); if (d < 260 && (fx * dx + fy * dy) / d > .9 && Math.random() < .1 + sk * .3) { cpuPress(i); return; } } },
      update(dt) { const cs = this.c; this.R = Math.max(140, 235 - Math.max(0, mt - 10) * 4.5);
        P.forEach((p, i) => { const C = cs[i]; if (C.out != null) { C.fallT += dt; return; } C.cd = Math.max(0, C.cd - dt); C.ang += C.spin * dt * (C.cd > 0 ? .3 : 1);
          if (pressed[i] && C.cd <= 0) { C.vx += Math.cos(C.ang) * 430; C.vy += Math.sin(C.ang) * 430; C.cd = .45; sfx.dash(); }
          C.vx *= Math.pow(.25, dt); C.vy *= Math.pow(.25, dt); C.x += C.vx * dt; C.y += C.vy * dt;
          if (Math.hypot(C.x - this.cx, C.y - this.cy) > this.R + 6) { C.out = mt; sfx.fall(); } });
        for (let i = 0; i < cs.length; i++) for (let j = i + 1; j < cs.length; j++) { const a = cs[i], b = cs[j]; if (a.out != null || b.out != null) continue; const dx = b.x - a.x, dy = b.y - a.y, d = Math.hypot(dx, dy), r = 56; if (d < r && d > .01) { const nx = dx / d, ny = dy / d, ov = r - d, tm = a.m + b.m; a.x -= nx * ov * b.m / tm; a.y -= ny * ov * b.m / tm; b.x += nx * ov * a.m / tm; b.y += ny * ov * a.m / tm; const rv = (b.vx - a.vx) * nx + (b.vy - a.vy) * ny; if (rv < 0) { const imp = -1.6 * rv / tm; a.vx -= imp * b.m * nx; a.vy -= imp * b.m * ny; b.vx += imp * a.m * nx; b.vy += imp * a.m * ny; if (rv < -120) sfx.hit(); } } }
        const alive = cs.filter((C) => C.out == null).length; if (mt >= this.time || alive <= (n() > 1 ? 1 : 0)) { if (!this.endT) this.endT = mt; if (mt - this.endT > 1) this.done = true; } },
      rank() { return P.map((p, i) => { const C = this.c[i]; return { i, v: C.out == null ? 1e4 - Math.hypot(C.x - this.cx, C.y - this.cy) : C.out }; }); },
      result(i) { const C = this.c[i]; return C.out == null ? "Ayakta kaldı!" : C.out.toFixed(1) + " sn'de düştü"; },
      draw() { const g = ctx.createRadialGradient(480, 340, 100, 480, 340, 600); g.addColorStop(0, "#3AA0E0"); g.addColorStop(1, "#14568E"); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
        ctx.globalAlpha = .25; ell(ctx, this.cx, this.cy + 22, this.R + 12, this.R * .85 + 12, 0, "#000"); ctx.globalAlpha = 1;
        ell(ctx, this.cx, this.cy + 14, this.R + 8, this.R * .85 + 8, 0, "#8A5A2B", 4); ell(ctx, this.cx, this.cy, this.R + 8, this.R * .85 + 8, 0, "#E8C88A", 4);
        ctx.strokeStyle = "#C8A060"; ctx.lineWidth = 2; for (let r = 60; r < this.R; r += 60) { ctx.beginPath(); ctx.ellipse(this.cx, this.cy, r, r * .85, 0, 0, 7); ctx.stroke(); }
        ctx.strokeStyle = "#E8463F"; ctx.lineWidth = 6; ctx.beginPath(); ctx.ellipse(this.cx, this.cy, this.R, this.R * .85, 0, 0, 7); ctx.stroke();
        const order = this.c.map((C, i) => i).sort((a, b) => this.c[a].y - this.c[b].y);
        for (const i of order) { const C = this.c[i], p = P[i]; let sc = 1, x = C.x, y = (C.y - this.cy) * .85 + this.cy; if (C.out != null) { sc = Math.max(0, 1 - C.fallT * 1.2); if (sc <= 0) continue; y += C.fallT * 120; }
          ctx.save(); ctx.translate(x, y); ctx.scale(sc, sc);
          ctx.globalAlpha = .3; ell(ctx, 0, 14, 30, 12, 0, "#000"); ctx.globalAlpha = 1;
          ell(ctx, 0, 6, 32, 20, 0, "#3A3A44", 3); ell(ctx, 0, 2, 30, 18, 0, PC2[p.ci]);
          const fx = Math.cos(C.ang), fy = Math.sin(C.ang) * .85; ctx.fillStyle = "#fff"; ctx.beginPath(); ctx.moveTo(fx * 42, fy * 42); ctx.lineTo(fx * 30 - fy * 9, fy * 30 + fx * 9); ctx.lineTo(fx * 30 + fy * 9, fy * 30 - fx * 9); ctx.closePath(); ctx.fill(); ctx.strokeStyle = OL; ctx.lineWidth = 2; ctx.stroke();
          blob(ctx, p.ci, 0, -10, 20, { noShadow: 1, mood: C.out != null ? -1 : 1, dir: fx > 0 ? 1 : -1, dizzy: C.out != null });
          ctx.restore();
          if (C.out == null) txt(p.name, x, y - 52, 15, PC2[p.ci]);
          if (C.cd > 0 && C.out == null) { ctx.strokeStyle = "rgba(255,255,255,.7)"; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(x, y + 6, 36, 0, (1 - C.cd / .45) * Math.PI * 2); ctx.stroke(); } }
      }
    }
  };
  function newFish(r) { const t = r(); const type = t < .1 ? "altin" : t < .35 ? "mavi" : t < .85 ? "turuncu" : "cizme"; return { x: r(), y: 240 + r() * 300, sp: (type === "altin" ? .5 : .18 + r() * .2), d: r() < .5 ? -1 : 1, type, v: { altin: 5, mavi: 2, turuncu: 1, cizme: 0 }[type] }; }
  function drawFish(x, y, f, d) { ctx.save(); ctx.translate(x, y); ctx.scale(d, 1);
    if (f.type === "cizme") { ctx.fillStyle = "#5A3A2A"; ctx.fillRect(-10, -14, 12, 22); ctx.fillRect(-10, 2, 24, 8); ctx.strokeStyle = OL; ctx.lineWidth = 2; ctx.strokeRect(-10, -14, 12, 22); ctx.restore(); return; }
    const col = { altin: "#FFD23F", mavi: "#4DA3FF", turuncu: "#FF8A3D" }[f.type]; ell(ctx, 0, 0, 18, 10, 0, col, 2); ctx.fillStyle = col; ctx.beginPath(); ctx.moveTo(-16, 0); ctx.lineTo(-28, -9); ctx.lineTo(-28, 9); ctx.closePath(); ctx.fill(); ctx.strokeStyle = OL; ctx.stroke(); circle(ctx, 9, -2, 2.5, OL); if (f.type === "altin") { ctx.globalAlpha = .5 + .5 * Math.sin(mt * 8); circle(ctx, -2, -8, 2, "#fff"); ctx.globalAlpha = 1; }
    ctx.restore(); }
  function heart(x, y, full) { ctx.save(); ctx.translate(x, y); ctx.fillStyle = full ? "#E8463F" : "rgba(0,0,0,.25)"; ctx.beginPath(); ctx.moveTo(0, 8); ctx.bezierCurveTo(-14, -2, -8, -12, 0, -5); ctx.bezierCurveTo(8, -12, 14, -2, 0, 8); ctx.fill(); ctx.strokeStyle = OL; ctx.lineWidth = 2; ctx.stroke(); ctx.restore(); }
  function skyGrad(a, b) { const g = ctx.createLinearGradient(0, 0, 0, H); g.addColorStop(0, a); g.addColorStop(1, b); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H); }
  function burst(x, y, col, k) { for (let i = 0; i < (k || 16); i++) { const a = rnd(0, 7), s = rnd(60, 220); fx.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s - 60, life: rnd(.5, 1), c: pick([col, "#FFD23F", "#fff"]), s: rnd(4, 8) }); } }

  /* ---------- akış ---------- */
  let mode = "setup", fast = false, playlist = [], gi = 0, countT = 0, endFinT = 0;
  function card(html, buttons, color, auto) {
    return new Promise((res) => {
      const c = $("card"), cin = $("cin"); cin.style.setProperty("--cc", color || "#FFD23F"); cin.innerHTML = html;
      const bx = document.createElement("div"); bx.className = "menu-btns";
      buttons.forEach((b, i) => { const e = document.createElement("button"); e.type = "button"; e.className = "btn" + (i === 0 ? " go" : " ghost"); e.textContent = b; e.onclick = () => { audio(); c.hidden = true; res(i); }; bx.appendChild(e); });
      cin.appendChild(bx); c.hidden = false; const f = bx.querySelector("button"); f && f.focus();
      if (fast || auto) setTimeout(() => { if (!c.hidden) { c.hidden = true; res(0); } }, fast ? 0 : auto);
    });
  }
  const sleep = (ms) => fast ? Promise.resolve() : new Promise((r) => setTimeout(r, ms));
  async function tournament() {
    gi = 0;
    while (gi < playlist.length) {
      const key = playlist[gi], g = GAMES[key];
      mode = "intro"; G = g; g.done = false; g.init(); mt = 0; fx = []; floaters = [];
      const keysTx = P.map((p, i) => "<b style='color:" + PC[p.ci] + "'>" + esc(p.name) + "</b>: " + (p.cpu ? "🤖" : KEYN[i])).join(" · ");
      await card("<h2>" + g.icon + " " + g.name + "</h2><p>" + g.desc + "</p><p style='font-size:.9em'>" + keysTx + "</p><p style='font-size:.85em;color:#7A3AB8'>Oyun " + (gi + 1) + " / " + playlist.length + "</p>", ["Hazırız!"], "#7A3AB8", P.every((p) => p.cpu) ? 1500 : 0);
      for (let i = 0; i < 4; i++) { pressed[i] = 0; released[i] = 0; down[i] = false; }
      mode = "count"; countT = 3; sfx.beep();
      await new Promise((r) => { G._go = r; if (fast) { countT = 0; r(); } });
      mode = "play"; mt = 0; sfx.go(); for (let i = 0; i < 4; i++) { pressed[i] = 0; released[i] = 0; }
      await new Promise((r) => { G._end = r; if (fast) { while (!G.done) step(1 / 30); r(); } });
      mode = "after"; await sleep(900);
      // sıralama ve puan
      const rk = G.rank().sort((a, b) => b.v - a.v); let pos = 0; const rows = [];
      rk.forEach((o, k) => { if (k > 0 && o.v < rk[k - 1].v - 1e-9) pos = k; const pts = Math.max(0, n() - pos - 1) + (pos === 0 ? 1 : 0); P[o.i].score += pts; rows.push({ i: o.i, pos, pts }); });
      sfx.fanfare();
      const html = "<h2>" + g.icon + " " + g.name + " bitti!</h2><div class='res'>" + rows.map((r) => "<div><span class='rk' style='background:" + PC[P[r.i].ci] + "'>" + (r.pos + 1) + "</span><span class='nm'>" + esc(P[r.i].name) + " <small>(" + G.result(r.i) + ")</small></span><span class='pt'>+" + r.pts + "</span><span class='tot'>★ " + P[r.i].score + "</span></div>").join("") + "</div>";
      await card(html, [gi + 1 < playlist.length ? "Sonraki oyun ▶" : "Kürsü töreni 🏆"], PC[P[rows[0].i].ci], P.every((p) => p.cpu) ? 2000 : 0);
      gi++;
    }
    await ceremony();
  }
  let podium = null;
  async function ceremony() {
    mode = "podium"; endFinT = 0; const order = P.map((p, i) => i).sort((a, b) => P[b].score - P[a].score); podium = order; sfx.fanfare();
    for (let k = 0; k < 8; k++) setTimeout(() => burst(rnd(200, 760), rnd(120, 300), pick(PC), 30), k * 300);
    await sleep(2500);
    const top = P[order[0]].score, winners = order.filter((i) => P[i].score === top).map((i) => P[i].name);
    const html = "<h2>🏆 " + esc(winners.join(" ve ")) + " kazandı!</h2><div class='res'>" + order.map((i, k) => "<div><span class='rk' style='background:" + PC[P[i].ci] + "'>" + (k + 1) + "</span><span class='nm'>" + esc(P[i].name) + "</span><span class='tot'>★ " + P[i].score + "</span></div>").join("") + "</div>";
    const k = await card(html, ["Aynı ekiple tekrar", "Ana menü"], "#FFD23F");
    if (k === 0) startTournament(); else showSetup();
  }
  function esc(s) { return String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;" })[c]); }
  function step(dt) {
    if (!G) return;
    if (mode === "play") {
      P.forEach((p, i) => { if (p.cpu) { cpuHold[i] -= dt; if (cpuHold[i] <= 0 && down[i] && G !== GAMES.balon) { down[i] = false; } G.cpu && G.cpu(i, dt, p.skill || .6); } });
      mt += dt; G.update(dt); for (let i = 0; i < 4; i++) { pressed[i] = 0; released[i] = 0; }
      if (G.done && G._end) { const e = G._end; G._end = null; e(); }
    }
    for (const f of fx) { f.life -= dt; f.x += f.vx * dt; f.y += f.vy * dt; f.vy += 400 * dt; } fx = fx.filter((f) => f.life > 0);
    for (const f of floaters) f.t += dt; floaters = floaters.filter((f) => f.t < 1.1);
  }
  function frameUpdate(dt) {
    if (mode === "count") { const before = Math.ceil(countT); countT -= dt; if (Math.ceil(countT) !== before && countT > 0) sfx.beep(); if (countT <= 0 && G._go) { const g = G._go; G._go = null; g(); } for (let i = 0; i < 4; i++) { pressed[i] = 0; released[i] = 0; } }
    step(dt); if (mode === "podium") endFinT += dt;
  }
  function draw() {
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    if (mode === "podium") { drawPodium(); drawFx(); return; }
    if (!G) { skyGrad("#8E4AD8", "#3A1A6A"); return; }
    G.draw();
    // üst çubuk
    ctx.fillStyle = "rgba(30,10,60,.7)"; ctx.fillRect(0, 0, W, 44); txt(G.icon + " " + G.name, 16, 23, 22, "#FFD23F", "left");
    const left = Math.max(0, G.time - mt); if (mode === "play") txt("⏱ " + Math.ceil(left), W - 60, 23, 22, left < 4 ? "#FF8A80" : "#fff");
    P.forEach((p, i) => { const x = 330 + i * 130; ctx.fillStyle = PC[p.ci]; rr(ctx, x - 58, 6, 116, 32, 16); ctx.fill(); txt(p.name.slice(0, 7) + " ★" + p.score, x, 23, 15, "#fff"); });
    drawFx();
    if (mode === "count") { ctx.fillStyle = "rgba(0,0,0,.3)"; ctx.fillRect(0, 0, W, H); const c = Math.ceil(countT); txt(c > 0 ? String(c) : "BAŞLA!", W / 2, H / 2, 160 - (countT % 1) * 40, "#FFD23F"); }
    if (mode === "after") { ctx.fillStyle = "rgba(0,0,0,.25)"; ctx.fillRect(0, 0, W, H); txt("BİTTİ!", W / 2, H / 2, 90, "#fff"); }
  }
  function drawFx() { for (const f of fx) { ctx.globalAlpha = Math.min(1, f.life * 2); ctx.fillStyle = f.c; ctx.fillRect(f.x - f.s / 2, f.y - f.s / 2, f.s, f.s * .6); } ctx.globalAlpha = 1; for (const f of floaters) { ctx.globalAlpha = 1 - f.t / 1.1; txt(f.text, f.x, f.y - f.t * 40, 26, f.col); } ctx.globalAlpha = 1; }
  function drawPodium() {
    skyGrad("#5A2A9A", "#FF9EC7"); for (let i = 0; i < 18; i++) { ctx.globalAlpha = .25; ctx.fillStyle = PC[i % 4]; ctx.beginPath(); ctx.moveTo(480, 600); ctx.lineTo(480 + Math.cos(i / 18 * Math.PI + endFinT * .2) * 900, 600 - Math.abs(Math.sin(i / 18 * Math.PI + endFinT * .2)) * 900); ctx.lineTo(480 + Math.cos((i + .5) / 18 * Math.PI + endFinT * .2) * 900, 600 - Math.abs(Math.sin((i + .5) / 18 * Math.PI + endFinT * .2)) * 900); ctx.fill(); } ctx.globalAlpha = 1;
    const hs = [190, 140, 100, 70], xs = [480, 290, 670, 820], cols = ["#FFD23F", "#D8DEE8", "#E8A060", "#A898C8"];
    podium.forEach((pi, k) => { if (k > 3) return; const p = P[pi], h = hs[k] * Math.min(1, endFinT * 1.4), x = xs[k]; ctx.fillStyle = cols[k]; rr(ctx, x - 80, 580 - h, 160, h + 30, 10); ctx.fill(); ctx.strokeStyle = OL; ctx.lineWidth = 4; ctx.stroke(); txt(String(k + 1), x, 580 - h + 40, 50, OL === "" ? "#000" : "#fff"); blob(ctx, p.ci, x, 580 - h - 48 - (k === 0 ? Math.abs(Math.sin(endFinT * 5)) * 24 : 0), k === 0 ? 52 : 42, { mood: 1, sq: k === 0 ? Math.sin(endFinT * 10) * .15 : 0 }); txt(p.name + "  ★" + p.score, x, 580 - h - 120, 22, "#fff"); });
    txt("ŞENLİĞİN ŞAMPİYONU!", W / 2, 70, 52, "#FFD23F");
    if (Math.random() < .3) burst(rnd(100, 860), rnd(80, 200), pick(PC), 6);
  }

  /* ---------- kurulum ---------- */
  let setup = [];
  try { const s = JSON.parse(localStorage.getItem(SAVE) || "null"); if (s && s.list) { setup = s.list; $("len").value = String(s.len || 8); } } catch (e) {}
  if (!setup.length) setup = [{ name: "Egemen", easy: true, cpu: false }, { name: "Enes", easy: false, cpu: false }, { name: "Annem", easy: false, cpu: false }];
  function avatar(ci) { const c = document.createElement("canvas"); c.width = c.height = 92; const x = c.getContext("2d"); x.scale(2, 2); const old = ctx; ctx = x; blob(x, ci, 23, 28, 14, { mood: 1, noShadow: 1 }); ctx = old; return c; }
  function renderSetup() {
    const box = $("rows"); box.innerHTML = "";
    setup.forEach((p, i) => {
      const r = document.createElement("div"); r.className = "prow"; r.style.setProperty("--pc", PC[i]);
      r.appendChild(avatar(i));
      const inp = document.createElement("input"); inp.value = p.name; inp.maxLength = 10; inp.setAttribute("aria-label", (i + 1) + ". oyuncu adı"); inp.oninput = () => { p.name = inp.value; }; r.appendChild(inp);
      const k = document.createElement("span"); k.className = "kchip"; k.textContent = p.cpu ? "🤖" : "Tuş: " + KEYN[i]; r.appendChild(k);
      const e = document.createElement("button"); e.type = "button"; e.className = "tg"; e.setAttribute("aria-pressed", p.easy ? "true" : "false"); e.textContent = p.easy ? "⭐ Kolay" : "Normal"; e.title = "Küçükler için kolaylık"; e.onclick = () => { p.easy = !p.easy; renderSetup(); }; r.appendChild(e);
      const c = document.createElement("button"); c.type = "button"; c.className = "tg"; c.setAttribute("aria-pressed", p.cpu ? "true" : "false"); c.textContent = p.cpu ? "🤖 Bilgisayar" : "🙂 İnsan"; c.onclick = () => { p.cpu = !p.cpu; if (p.cpu && /^(Oyuncu|$)/.test(p.name)) p.name = pick(["Robo", "Bip", "Zıpzıp"]); renderSetup(); }; r.appendChild(c);
      if (setup.length > 2) { const d = document.createElement("button"); d.type = "button"; d.className = "del"; d.textContent = "✕"; d.setAttribute("aria-label", "Oyuncuyu çıkar"); d.onclick = () => { setup.splice(i, 1); renderSetup(); }; r.appendChild(d); }
      box.appendChild(r);
    });
    $("addP").hidden = setup.length >= 4;
  }
  $("addP").onclick = () => { setup.push({ name: "Oyuncu " + (setup.length + 1), easy: false, cpu: false }); renderSetup(); };
  function startTournament() {
    P = setup.map((p, i) => ({ name: (p.name || "").trim() || "Oyuncu " + (i + 1), ci: i, easy: !!p.easy, cpu: !!p.cpu, score: 0, skill: rnd(.45, .8) }));
    try { localStorage.setItem(SAVE, JSON.stringify({ list: setup, len: +$("len").value })); } catch (e) {}
    const keys = Object.keys(GAMES).sort(() => Math.random() - .5); playlist = keys.slice(0, +$("len").value);
    $("setup").hidden = true; buildTouch(); tournament();
  }
  $("start").onclick = () => { audio(); startTournament(); };
  function showSetup() { mode = "setup"; G = null; podium = null; $("card").hidden = true; $("setup").hidden = false; renderSetup(); drawLogo(); }
  function drawLogo() { const c = $("logoCv"), x = c.getContext("2d"); x.clearRect(0, 0, 420, 140); const old = ctx; ctx = x; [0, 1, 2, 3].forEach((ci) => blob(x, ci, 70 + ci * 95, 80 + Math.sin(ci) * 8, 32, { mood: 1, sq: ci % 2 ? .1 : -.1 })); ctx = old; }
  $("menuBtn").onclick = () => { if ((mode === "play" || mode === "intro" || mode === "count" || mode === "after") && !confirm("Şenlik bitsin mi? Puanlar silinir.")) return; location.reload(); };
  const muteBtn = $("mute");
  function setMute(m) { muted = m; muteBtn.setAttribute("aria-pressed", m ? "true" : "false"); muteBtn.setAttribute("aria-label", m ? "Sesi aç" : "Sesi kapat"); if (master) master.gain.value = m ? 0 : 1; try { localStorage.setItem(SAVE + ":mute", m ? "1" : "0"); } catch (e) {} }
  setMute(muted); muteBtn.onclick = () => { audio(); setMute(!muted); };

  /* ---------- ölçek ve döngü ---------- */
  const stage = $("stage"), screen = $("screen");
  function fit() { const cs = getComputedStyle(screen), w = screen.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight), h = screen.clientHeight; if (!w || !h) return; let sw = w, sh = w * H / W; if (sh > h) { sh = h; sw = h * W / H; } stage.style.width = Math.floor(sw) + "px"; stage.style.height = Math.floor(sh) + "px"; stage.style.setProperty("--fs", clamp(sw / 50, 12, 19).toFixed(1) + "px"); }
  addEventListener("resize", fit); if (window.ResizeObserver) new ResizeObserver(fit).observe(screen); fit();
  let last = performance.now();
  function frame(t) { const dt = Math.min(.05, (t - last) / 1000); last = t; if (!fast) frameUpdate(dt); draw(); requestAnimationFrame(frame); }
  requestAnimationFrame(frame);
  showSetup();

  window.__ps = { GAMES, get P() { return P; }, set P(v) { P = v; }, get mode() { return mode; }, get G() { return G; }, setFast(v) { fast = v; }, step, startTournament, setup, get playlist() { return playlist; }, pressI, releaseI, frameUpdate,
    test(key, list) { P = list; G = GAMES[key]; G.done = false; G.init(); mt = 0; mode = "play"; } };
})();
