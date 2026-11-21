/* Buz Taşı — aile curling oyunu */
(() => {
  "use strict";
  const $ = (id) => document.getElementById(id);
  const SAVE_KEY = "buz-tasi";
  const TOKENS = ["🦊", "🐼", "🐸", "🦁", "🐧", "🐙"];
  const DEF = ["Enes", "Egemen", "Anne", "Baba", "", ""];
  const TEAM = [{ ad: "Kırmızı", c: "#E5484D", d: "#A92F25" }, { ad: "Sarı", c: "#FFC529", d: "#C98F00" }];
  const VW = 1000, VH = 380, Y0 = 40, Y1 = 340, SX = 90, SY = 190, HCX = 840, HCY = 190, R = 13, HOG = 560, BACK = 975, RINGS = [90, 60, 30, 9];
  const DEC = 0.04, DEC_SW = 0.031, VMAX = 9.6, PULL = 180, PER = 3;
  const cv = $("cv"), ctx = cv.getContext("2d"), rink = document.querySelector(".rink");

  /* ---------- ses ---------- */
  let AC = null, fast = false, rumble = null;
  function audio() { try { AC = AC || new (window.AudioContext || window.webkitAudioContext)(); if (AC.state === "suspended") AC.resume(); } catch (e) {} }
  function tone(f, d, type, vol, delay) {
    if (!AC || fast) return;
    const t = AC.currentTime + (delay || 0), o = AC.createOscillator(), g = AC.createGain();
    o.type = type || "triangle"; o.frequency.setValueAtTime(f, t);
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol || 0.05, t + 0.01); g.gain.exponentialRampToValueAtTime(0.0001, t + d);
    o.connect(g).connect(AC.destination); o.start(t); o.stop(t + d + 0.02);
  }
  const clack = () => { tone(900, 0.05, "square", 0.08); tone(500, 0.08, "triangle", 0.06, 0.02); };
  const canSpeak = "speechSynthesis" in window;
  let trVoice = null;
  function pickVoice() { if (canSpeak) trVoice = speechSynthesis.getVoices().find(v => /^tr(-|_|$)/i.test(v.lang)) || null; }
  if (canSpeak) { pickVoice(); if (speechSynthesis.addEventListener) speechSynthesis.addEventListener("voiceschanged", pickVoice); }
  function say(t) { if (fast || !canSpeak || !trVoice) return; speechSynthesis.cancel(); const u = new SpeechSynthesisUtterance(t); u.voice = trVoice; u.lang = trVoice.lang; speechSynthesis.speak(u); }
  const esc = (s) => s.replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

  /* ---------- fizik ---------- */
  function stepStones(stones, sweep) {
    let moving = false, hit = false;
    for (let k = 0; k < 4; k++) {
      for (const s of stones) {
        if (s.out) continue;
        const v = Math.hypot(s.vx, s.vy); if (v <= 0) continue;
        moving = true;
        const dec = (s.live && sweep ? DEC_SW : DEC) / 4, nv = Math.max(0, v - dec);
        let vx = s.vx * nv / v, vy = s.vy * nv / v;
        if (s.spin && nv > 0) { const c = s.spin * 0.0019 / 4 * (nv < 3 ? 1.6 : 0.6); vx += -vy / nv * c * nv; vy += vx / nv * c * nv; const m = Math.hypot(vx, vy); vx *= nv / m; vy *= nv / m; }
        s.vx = vx; s.vy = vy; s.x += vx / 4; s.y += vy / 4; s.rot += (s.spin || 0.3) * nv * 0.01;
        if (s.x > HOG) s.past = true;
        if (s.y < Y0 + R - 2 || s.y > Y1 - R + 2 || s.x > BACK) { s.out = true; s.vx = s.vy = 0; }
      }
      for (let i = 0; i < stones.length; i++) for (let j = i + 1; j < stones.length; j++) {
        const a = stones[i], b = stones[j]; if (a.out || b.out) continue;
        const dx = b.x - a.x, dy = b.y - a.y, d = Math.hypot(dx, dy);
        if (d < 2 * R && d > 0) {
          const nx = dx / d, ny = dy / d, ov = 2 * R - d; a.x -= nx * ov / 2; a.y -= ny * ov / 2; b.x += nx * ov / 2; b.y += ny * ov / 2;
          const rv = (b.vx - a.vx) * nx + (b.vy - a.vy) * ny;
          if (rv < 0) { const j2 = -(1 + 0.9) * rv / 2; a.vx -= j2 * nx; a.vy -= j2 * ny; b.vx += j2 * nx; b.vy += j2 * ny; hit = true; }
        }
      }
    }
    return { moving, hit };
  }
  const dist = (s) => Math.hypot(s.x - HCX, s.y - HCY);
  function predict(ang, pow, spin) { // tek taşın yolu (çarpışmasız)
    const s = { x: SX, y: SY, vx: Math.cos(ang) * VMAX * pow, vy: Math.sin(ang) * VMAX * pow, spin, rot: 0, live: true }, pts = [];
    for (let i = 0; i < 1500 && Math.hypot(s.vx, s.vy) > 0 && !s.out; i++) { stepStones([s], false); if (i % 4 === 0) pts.push([s.x, s.y]); }
    return { pts, s };
  }

  /* ---------- durum ---------- */
  const later = (ms, fn) => fast ? fn() : setTimeout(fn, ms);
  let CFG = null, G = null;
  function newGame(cfg) {
    CFG = cfg;
    G = { end: 1, score: [0, 0], hammer: 1, stones: [], thrown: [0, 0], turnTeam: 0, ptr: [0, 0], phase: "aim", moving: false, sweep: false, aim: null, msg: "", ends: [] };
    $("setup").hidden = true; $("over").hidden = true;
    startEnd();
  }
  const members = (t) => CFG.players.map((p, i) => ({ p, i })).filter(o => CFG.team[o.i] === t);
  function thrower() { const m = members(G.turnTeam); return m[G.ptr[G.turnTeam] % m.length]; }
  function startEnd() {
    G.stones = []; G.thrown = [0, 0]; G.turnTeam = 1 - G.hammer; G.phase = "aim"; G.msg = "";
    nextThrow();
  }
  function nextThrow() {
    G.phase = "aim"; G.aim = null;
    const th = thrower();
    G.cur = { x: SX, y: SY, vx: 0, vy: 0, team: G.turnTeam, spin: 0, rot: 0, live: true, past: false };
    renderInfo();
    if (CFG.cpu[th.i]) { G.phase = "cpu"; later(900, cpuThrow); }
    else say(`${th.p}, sıra sende!`);
    setSweepBtn();
  }
  function renderInfo() {
    if (!G) return;
    const th = thrower();
    $("info").innerHTML = `<span style="color:${TEAM[0].d}">${TEAM[0].ad} ${G.score[0]}</span> – <span style="color:${TEAM[1].d}">${G.score[1]} ${TEAM[1].ad}</span> · El ${G.end}/${CFG.ends} · ${G.phase === "done" ? "" : `Atan: ${TOKENS[th.i]} ${esc(th.p)}`}`;
    $("players").innerHTML = CFG.players.map((q, i) => `<div class="pl t${CFG.team[i] ? "B" : "A"}${G.phase !== "done" && i === th.i ? " cur" : ""}"><span aria-hidden="true">${TOKENS[i]}</span>${esc(q)}${CFG.cpu[i] ? " 🤖" : CFG.help[i] ? " ✨" : ""}</div>`).join("");
  }
  function setSweepBtn() { $("sweep").disabled = !(G && G.phase === "run"); }
  function throwStone(ang, pow, spin) {
    if (!G || (G.phase !== "aim" && G.phase !== "cpu")) return false;
    const s = G.cur; s.vx = Math.cos(ang) * VMAX * pow; s.vy = Math.sin(ang) * VMAX * pow; s.spin = spin;
    G.stones.push(s); G.thrown[G.turnTeam]++; G.ptr[G.turnTeam]++; G.phase = "run"; G.aim = null; G.cur = null;
    tone(140, 0.4, "sine", 0.06); setSweepBtn(); renderInfo();
    return true;
  }
  function cpuThrow() {
    if (!G || G.phase !== "cpu") return;
    const opp = 1 - G.turnTeam, inHouse = G.stones.filter(s => !s.out && dist(s) < RINGS[0] + R).sort((a, b) => dist(a) - dist(b));
    let tx = HCX, ty = HCY, pow;
    if (inHouse.length && inHouse[0].team === opp && Math.random() < 0.7) { tx = inHouse[0].x; ty = inHouse[0].y; pow = 0.97; }
    else {
      // merkeze durmak için gücü ikili arama ile bul
      let lo = 0.4, hi = 1; const a0 = Math.atan2(ty - SY, tx - SX);
      for (let k = 0; k < 18; k++) { const m = (lo + hi) / 2, p = predict(a0, m, 0).s; if (p.out || p.x > tx) hi = m; else lo = m; }
      pow = (lo + hi) / 2;
    }
    const ang = Math.atan2(ty - SY, tx - SX) + (Math.random() - 0.5) * 0.02, p2 = pow * (1 + (Math.random() - 0.5) * 0.05);
    G.phase = "cpu"; throwStone(ang, Math.min(1, p2), 0);
  }
  function step() {
    if (!G) return;
    if (G.phase === "run") {
      const r = stepStones(G.stones, G.sweep);
      if (r.hit) clack();
      if (!r.moving) {
        // domuz çizgisini geçemeyen atılan taş çıkar
        const live = G.stones.find(s => s.live); if (live) { live.live = false; if (!live.past && !live.out) { live.out = true; G.msg = "Taş çizgiyi geçemedi, çıktı!"; } }
        G.sweep = false; $("sweep").classList.remove("on");
        if (G.thrown[0] >= PER && G.thrown[1] >= PER) return endEnd();
        G.turnTeam = 1 - G.turnTeam;
        if (G.thrown[G.turnTeam] >= PER) G.turnTeam = 1 - G.turnTeam;
        G.phase = "wait"; setSweepBtn();
        later(700, () => { if (G && G.phase === "wait") { G.msg = ""; nextThrow(); } });
      }
    }
  }
  function endEnd() {
    G.phase = "done"; setSweepBtn();
    const ins = G.stones.filter(s => !s.out && dist(s) < RINGS[0] + R).sort((a, b) => dist(a) - dist(b));
    let pts = 0, team = -1;
    if (ins.length) { team = ins[0].team; const oppBest = ins.find(s => s.team !== team); for (const s of ins) { if (s.team !== team) break; if (!oppBest || dist(s) < dist(oppBest)) { pts++; s.scored = true; } } }
    if (team >= 0) { G.score[team] += pts; G.hammer = 1 - team; } // puan alan bir sonraki elde önce atar
    G.ends.push([team, pts]);
    G.msg = team < 0 ? "Hedefte taş yok, puan çıkmadı." : `${TEAM[team].ad} takım ${pts} puan aldı!`;
    say(G.msg); if (team >= 0) [523, 659, 784].forEach((f, i) => tone(f, 0.18, "triangle", 0.07, i * 0.1));
    renderInfo();
    later(2600, () => {
      if (G.end >= CFG.ends) return finish();
      G.end++; startEnd();
    });
  }
  function finish() {
    const [a, b] = G.score, t = a === b ? "Berabere!" : `${TEAM[a > b ? 0 : 1].ad} takım kazandı!`;
    say(t); [523, 659, 784, 1046].forEach((f, i) => tone(f, 0.22, "triangle", 0.07, i * 0.12));
    $("over-title").textContent = t;
    $("over-tx").textContent = "Eller: " + G.ends.map((e, i) => `${i + 1}. el ${e[0] < 0 ? "0" : TEAM[e[0]].ad + " " + e[1]}`).join(" · ");
    $("results").innerHTML = [0, 1].map(k => `<div class="${(a === b || (k === 0) === (a > b)) ? "win" : ""}"><span>${TEAM[k].ad}: ${members(k).map(m => esc(m.p)).join(", ")}</span><b>${G.score[k]}</b></div>`).join("");
    if (!fast) $("over").hidden = false;
  }

  /* ---------- çizim ---------- */
  let W = 0, H = 0, dpr = 1, sc = 1, ox = 0, oy = 0, tt = 0;
  function resize() {
    const r = rink.getBoundingClientRect(); dpr = Math.min(2, window.devicePixelRatio || 1);
    W = r.width; H = r.height; cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr);
    sc = Math.min(W / VW, H / VH); ox = (W - VW * sc) / 2; oy = (H - VH * sc) / 2;
  }
  function stone(s, alpha) {
    const T = TEAM[s.team];
    ctx.globalAlpha = alpha == null ? 1 : alpha;
    ctx.fillStyle = "rgba(30,60,90,.25)"; ctx.beginPath(); ctx.arc(s.x + 2, s.y + 3, R, 0, 7); ctx.fill();
    const g = ctx.createRadialGradient(s.x - 4, s.y - 4, 2, s.x, s.y, R); g.addColorStop(0, "#C9CED6"); g.addColorStop(1, "#6B7280");
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(s.x, s.y, R, 0, 7); ctx.fill();
    ctx.fillStyle = T.c; ctx.beginPath(); ctx.arc(s.x, s.y, R * 0.62, 0, 7); ctx.fill();
    ctx.strokeStyle = T.d; ctx.lineWidth = 3; ctx.lineCap = "round";
    ctx.beginPath(); ctx.moveTo(s.x - Math.cos(s.rot) * 6, s.y - Math.sin(s.rot) * 6); ctx.lineTo(s.x + Math.cos(s.rot) * 6, s.y + Math.sin(s.rot) * 6); ctx.stroke();
    if (s.scored) { ctx.strokeStyle = "#2DB75A"; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(s.x, s.y, R + 4 + Math.sin(tt * 6) * 1.5, 0, 7); ctx.stroke(); }
    ctx.globalAlpha = 1;
  }
  function draw() {
    tt += 1 / 60;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.clearRect(0, 0, W, H);
    ctx.save(); ctx.translate(ox, oy); ctx.scale(sc, sc);
    // tribün ve pist
    ctx.fillStyle = "#C9D7E8"; ctx.beginPath(); ctx.roundRect(0, 0, VW, VH, 22); ctx.fill();
    const ice = ctx.createLinearGradient(0, Y0, 0, Y1); ice.addColorStop(0, "#F4FBFF"); ice.addColorStop(0.5, "#E6F3FC"); ice.addColorStop(1, "#F4FBFF");
    ctx.fillStyle = ice; ctx.fillRect(20, Y0, VW - 40, Y1 - Y0);
    ctx.strokeStyle = "rgba(150,190,220,.25)"; ctx.lineWidth = 1;
    for (let i = 0; i < 14; i++) { ctx.beginPath(); ctx.moveTo(20, Y0 + 10 + i * 21); ctx.bezierCurveTo(300, Y0 + 5 + i * 21, 600, Y0 + 18 + i * 21, VW - 20, Y0 + 10 + i * 21); ctx.stroke(); }
    ctx.strokeStyle = "#8EA9C1"; ctx.lineWidth = 4; ctx.strokeRect(20, Y0, VW - 40, Y1 - Y0);
    // hedef
    const cols = ["#2F80ED", "#fff", "#E5484D", "#fff"];
    RINGS.forEach((r, i) => { ctx.fillStyle = cols[i]; ctx.beginPath(); ctx.arc(HCX, HCY, r, 0, 7); ctx.fill(); });
    ctx.strokeStyle = "rgba(30,60,90,.35)"; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(HCX, Y0); ctx.lineTo(HCX, Y1); ctx.moveTo(20, HCY); ctx.lineTo(VW - 20, HCY); ctx.stroke();
    ctx.strokeStyle = "#E5484D"; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(HOG, Y0); ctx.lineTo(HOG, Y1); ctx.stroke();
    ctx.strokeStyle = "#2F80ED"; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(BACK - 30, Y0); ctx.lineTo(BACK - 30, Y1); ctx.stroke();
    ctx.fillStyle = "#8EA9C1"; ctx.fillRect(SX - 22, SY - 10, 6, 20);
    if (!G) { ctx.restore(); return; }
    // kalan taşlar
    for (const t of [0, 1]) for (let i = 0; i < PER; i++) { const used = i < G.thrown[t]; ctx.globalAlpha = used ? 0.2 : 1; ctx.fillStyle = TEAM[t].c; ctx.beginPath(); ctx.arc(40 + i * 22 + t * 90, 22, 8, 0, 7); ctx.fill(); ctx.globalAlpha = 1; }
    // nişan
    if (G.aim && G.phase === "aim") {
      const a = G.aim, th = thrower();
      if (CFG.help[th.i]) { ctx.fillStyle = "rgba(25,113,194,.5)"; predict(a.ang, a.pow, a.spin).pts.forEach(([x, y], i) => { if (i % 2 === 0) { ctx.beginPath(); ctx.arc(x, y, 2.5, 0, 7); ctx.fill(); } }); }
      const L = 40 + a.pow * 120;
      ctx.strokeStyle = "#1971C2"; ctx.lineWidth = 5; ctx.lineCap = "round";
      ctx.beginPath(); ctx.moveTo(SX, SY); ctx.lineTo(SX + Math.cos(a.ang) * L, SY + Math.sin(a.ang) * L); ctx.stroke();
      ctx.fillStyle = "rgba(25,113,194,.15)"; ctx.fillRect(SX - 40, SY + 26, 80, 8); ctx.fillStyle = a.pow > 0.9 ? "#E5484D" : "#1971C2"; ctx.fillRect(SX - 40, SY + 26, 80 * a.pow, 8);
    }
    for (const s of G.stones) if (!s.out) stone(s);
    if (G.cur) stone(G.cur);
    if (G.phase === "run" && G.sweep) { const l = G.stones.find(s => s.live); if (l) { ctx.fillStyle = "rgba(255,255,255,.8)"; for (let i = 0; i < 6; i++) ctx.fillRect(l.x + 20 + Math.random() * 20, l.y - 10 + Math.random() * 20, 3, 3); } }
    if (G.msg) { ctx.font = "800 26px Rubik, sans-serif"; ctx.textAlign = "center"; ctx.lineWidth = 6; ctx.strokeStyle = "rgba(255,255,255,.9)"; ctx.fillStyle = "#0F4C8A"; ctx.strokeText(G.msg, VW / 2, 30); ctx.fillText(G.msg, VW / 2, 30); }
    ctx.restore();
  }
  function loop() { const r = rink.getBoundingClientRect(); if (Math.abs(r.width - W) > 0.5 || Math.abs(r.height - H) > 0.5) resize(); step(); draw(); requestAnimationFrame(loop); }

  /* ---------- girdi ---------- */
  let drag = null;
  function pt(e) { const r = cv.getBoundingClientRect(); return { x: (e.clientX - r.left - ox) / sc, y: (e.clientY - r.top - oy) / sc }; }
  const spinVal = () => +document.querySelector('input[name="spin"]:checked').value;
  cv.addEventListener("pointerdown", (e) => { audio(); if (!G || G.phase !== "aim") return; drag = pt(e); cv.setPointerCapture(e.pointerId); e.preventDefault(); });
  cv.addEventListener("pointermove", (e) => {
    if (!drag || G.phase !== "aim") return; const p = pt(e), dx = drag.x - p.x, dy = drag.y - p.y, len = Math.hypot(dx, dy);
    G.aim = len < 10 ? null : { ang: Math.atan2(dy, dx), pow: Math.min(1, len / PULL), spin: spinVal() };
  });
  cv.addEventListener("pointerup", () => { if (!drag) return; drag = null; if (G.aim) { const a = G.aim; throwStone(a.ang, a.pow, a.spin); } });
  cv.addEventListener("pointercancel", () => { drag = null; if (G) G.aim = null; });
  const sw = $("sweep");
  const swOn = (e) => { if (e) e.preventDefault(); audio(); if (G && G.phase === "run") { G.sweep = true; sw.classList.add("on"); if (!rumble) rumble = setInterval(() => tone(2000 + Math.random() * 800, 0.04, "sawtooth", 0.01), 90); } };
  const swOff = () => { if (G) G.sweep = false; sw.classList.remove("on"); clearInterval(rumble); rumble = null; };
  sw.addEventListener("pointerdown", swOn); sw.addEventListener("pointerup", swOff); sw.addEventListener("pointercancel", swOff); sw.addEventListener("pointerleave", swOff);
  document.addEventListener("keydown", (e) => { if (e.key === " " && $("setup").hidden) { e.preventDefault(); if (!e.repeat) swOn(); } });
  document.addEventListener("keyup", (e) => { if (e.key === " ") swOff(); });
  document.querySelectorAll('input[name="spin"]').forEach(i => i.addEventListener("change", () => { if (G && G.aim) G.aim.spin = spinVal(); }));

  /* ---------- ayarlar ---------- */
  const form = $("setup-form");
  let saved = null;
  try { saved = JSON.parse(localStorage.getItem(SAVE_KEY) || "null"); } catch (_) {}
  function buildRows() {
    const n = +form.count.value, box = $("rows");
    const old = [...box.querySelectorAll(".p-row")].map(r => [r.querySelector("input[type=text]").value, +r.querySelector(".tg").dataset.t, r.querySelector(".cb-cpu").checked, r.querySelector(".cb-help").checked]);
    box.innerHTML = "";
    for (let i = 0; i < n; i++) {
      const row = document.createElement("div"); row.className = "p-row";
      const d = old[i] || [saved && saved.names && saved.names[i] != null ? saved.names[i] : DEF[i], saved && saved.team && saved.team[i] != null ? saved.team[i] : (i % 2), saved && saved.cpu ? !!saved.cpu[i] : false, saved && saved.help ? !!saved.help[i] : DEF[i] === "Egemen"];
      row.innerHTML = `<span class="tk">${TOKENS[i]}</span><input type="text" maxlength="12" aria-label="${i + 1}. oyuncunun adı" placeholder="Oyuncu ${i + 1}"><button type="button" class="tg"></button><label class="toggle" title="Bilgisayar oynasın"><input type="checkbox" class="cb-cpu" aria-label="${i + 1}. oyuncu bilgisayar"> 🤖</label><label class="toggle" title="Küçüklere yol çizgisi"><input type="checkbox" class="cb-help" aria-label="${i + 1}. oyuncuya yol çizgisi"> ✨</label>`;
      row.querySelector("input[type=text]").value = d[0]; row.querySelector(".cb-cpu").checked = d[2]; row.querySelector(".cb-help").checked = d[3];
      const tg = row.querySelector(".tg"); const setT = (t) => { tg.dataset.t = t; tg.className = "tg " + (t ? "B" : "A"); tg.textContent = t ? "Sarı" : "Kırmızı"; tg.setAttribute("aria-label", `${i + 1}. oyuncunun takımı: ${t ? "sarı" : "kırmızı"}`); };
      setT(d[1]); tg.addEventListener("click", () => setT(+tg.dataset.t ? 0 : 1));
      box.appendChild(row);
    }
  }
  form.addEventListener("change", (e) => { if (e.target.name === "count") buildRows(); });
  form.addEventListener("submit", (e) => {
    e.preventDefault(); audio(); pickVoice();
    const rows = [...$("rows").querySelectorAll(".p-row")];
    const cpu = rows.map(r => r.querySelector(".cb-cpu").checked);
    const players = rows.map((r, i) => r.querySelector("input[type=text]").value.trim() || (cpu[i] ? "Bilgisayar" : ["Tilki", "Panda", "Kurbağa", "Aslan", "Penguen", "Ahtapot"][i]));
    const team = rows.map(r => +r.querySelector(".tg").dataset.t), help = rows.map((r, i) => !cpu[i] && r.querySelector(".cb-help").checked);
    if (!team.includes(0) || !team.includes(1)) { alert("Her takımda en az bir oyuncu olmalı. Takım düğmesine dokunarak değiştir."); return; }
    if (cpu.every(Boolean)) cpu[0] = false;
    const cfg = { players, team, cpu, help, ends: +form.rn.value };
    try { localStorage.setItem(SAVE_KEY, JSON.stringify({ count: players.length, names: rows.map(r => r.querySelector("input[type=text]").value), team, cpu, help, rn: cfg.ends })); } catch (_) {}
    newGame(cfg);
  });
  if (saved) { try { form.count.value = String(saved.count); form.rn.value = String(saved.rn); } catch (_) {} }
  buildRows();
  $("settings").addEventListener("click", () => { $("over").hidden = true; $("setup").hidden = false; });
  $("again").addEventListener("click", () => { audio(); newGame(CFG); });
  $("to-setup").addEventListener("click", () => { $("over").hidden = true; $("setup").hidden = false; });

  if (!CanvasRenderingContext2D.prototype.roundRect) {
    CanvasRenderingContext2D.prototype.roundRect = function (x, y, w, h, r) { r = Math.min(r, w / 2, h / 2); this.moveTo(x + r, y); this.arcTo(x + w, y, x + w, y + h, r); this.arcTo(x + w, y + h, x, y + h, r); this.arcTo(x, y + h, x, y, r); this.arcTo(x, y, x + w, y, r); this.closePath(); };
  }
  resize(); requestAnimationFrame(loop);
  window.__bt = { newGame, throwStone, predict, step, cpuThrow, setFast: (f) => { fast = f; }, get G() { return G; }, dist };
})();
