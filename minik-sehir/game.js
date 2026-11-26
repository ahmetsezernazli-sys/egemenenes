/* Minik Şehir — izometrik şehir kurma */
(function () {
  "use strict";
  const W = 960, H = 600, N = 22, TW = 64, TH = 32;
  const $ = (id) => document.getElementById(id);
  const cv = $("cv"); let ctx = cv.getContext("2d");
  const SAVE = "minik-sehir";
  const rnd = (a, b) => a + Math.random() * (b - a);
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const OL = "rgba(30,30,45,.55)";
  const hash = (a, b) => { let h = (a * 374761393 + b * 668265263) | 0; h = (h ^ (h >>> 13)) * 1274126177; return ((h ^ (h >>> 16)) >>> 0) / 4294967295; };

  /* ---------- binalar ---------- */
  const B = {
    bak: { name: "İncele", cost: 0, desc: "Binaya dokun, durumunu gör." },
    yol: { name: "Yol", cost: 10, desc: "Binalar yola bitişik olmalı. Sürükleyerek çiz." },
    ev: { name: "Ev", cost: 20, desc: "Yol, elektrik ve su olunca insanlar taşınır. Mutlu olursa büyür." },
    dukkan: { name: "Dükkân", cost: 40, jobs: 11, desc: "İş verir, vergi getirir. Müşteri ister." },
    park: { name: "Park", cost: 30, up: 2, desc: "Çevresindeki evleri mutlu eder." },
    agac: { name: "Ağaç", cost: 5, desc: "Yanındaki evlere biraz mutluluk." },
    santral: { name: "Santral", cost: 150, up: 10, power: 30, desc: "30 binaya elektrik verir." },
    su: { name: "Su kulesi", cost: 100, up: 6, water: 30, desc: "30 binaya su verir." },
    fabrika: { name: "Fabrika", cost: 60, jobs: 26, unlock: 60, desc: "Çok iş ve vergi, ama çevresini kirletir." },
    okul: { name: "Okul", cost: 120, up: 8, unlock: 60, desc: "Yakındaki evleri mutlu eder." },
    hastane: { name: "Hastane", cost: 150, up: 12, unlock: 200, desc: "Yakındaki evleri mutlu eder." },
    itfaiye: { name: "İtfaiye", cost: 100, up: 8, unlock: 200, desc: "Çevresinde yangın çıkmaz." },
    stadyum: { name: "Stadyum", cost: 400, up: 15, unlock: 500, desc: "Tüm şehri coşturur!" },
    yik: { name: "Yık", cost: 0, desc: "Binayı ya da ağacı kaldır." }
  };
  const TOOL_ORDER = ["bak", "yol", "ev", "dukkan", "park", "agac", "santral", "su", "fabrika", "okul", "hastane", "itfaiye", "stadyum", "yik"];
  const RANGE = { park: 3, okul: 4, hastane: 5, itfaiye: 5, fabrika: 3 };
  const NEEDS = new Set(["ev", "dukkan", "fabrika", "okul", "hastane", "itfaiye", "stadyum"]);

  /* ---------- durum ---------- */
  let S = null;
  function freshCity() {
    const g = [];
    for (let y = 0; y < N; y++) { const row = []; for (let x = 0; x < N; x++) row.push({ t: "cim" }); g.push(row); }
    // nehir
    let rx = 15; for (let y = 0; y < N; y++) { rx += Math.round(rnd(-1, 1)); rx = clamp(rx, 13, 18); g[y][rx].t = "su_"; g[y][rx + 1].t = "su_"; if (y % 3 === 0 && rx > 13) g[y][rx - 1].t = "su_"; }
    // ağaç kümeleri
    for (let k = 0; k < 6; k++) { const cx = Math.floor(rnd(1, N - 2)), cy = Math.floor(rnd(1, N - 2)); for (let i = 0; i < 9; i++) { const x = clamp(cx + Math.round(rnd(-2, 2)), 0, N - 1), y = clamp(cy + Math.round(rnd(-2, 2)), 0, N - 1); if (g[y][x].t === "cim") g[y][x].t = "agac"; } }
    // başlangıç yolu
    for (let x = 0; x < 9; x++) g[10][x] = { t: "yol" };
    return { g, money: 1200, month: 0, pop: 0, happy: 50, milestone: 0, goal: 0, nid: 1, burned: 0 };
  }
  function save() { if (!S) return; try { localStorage.setItem(SAVE, JSON.stringify(S)); } catch (e) {} }
  function load() { try { const s = JSON.parse(localStorage.getItem(SAVE) || "null"); if (s && s.g) return s; } catch (e) {} return null; }
  const T = (x, y) => (!S || x < 0 || y < 0 || x >= N || y >= N) ? null : S.g[y][x];
  const isBld = (t) => !["cim", "su_", "yol", "agac", "enkaz"].includes(t);

  /* ---------- ses ---------- */
  let ac = null, master = null, mg = null, muted = false;
  try { muted = localStorage.getItem(SAVE + ":mute") === "1"; } catch (e) {}
  function audio() { if (!ac) { const C = window.AudioContext || window.webkitAudioContext; if (!C) return; ac = new C(); master = ac.createGain(); master.gain.value = muted ? 0 : 1; master.connect(ac.destination); mg = ac.createGain(); mg.gain.value = .3; mg.connect(master); } if (ac.state === "suspended") ac.resume(); }
  function tone(f, d, type, vol, when, slide, dest) { if (!ac || muted) return; const t = when || ac.currentTime, o = ac.createOscillator(), g = ac.createGain(); o.type = type || "triangle"; o.frequency.setValueAtTime(f, t); if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(30, slide), t + d); g.gain.setValueAtTime(.0001, t); g.gain.linearRampToValueAtTime(vol || .1, t + .01); g.gain.exponentialRampToValueAtTime(.0008, t + d); o.connect(g); g.connect(dest || master); o.start(t); o.stop(t + d + .02); }
  let nb = null;
  function noise(d, vol, freq, q) { if (!ac || muted) return; if (!nb) { nb = ac.createBuffer(1, ac.sampleRate, ac.sampleRate); const c = nb.getChannelData(0); for (let i = 0; i < c.length; i++) c[i] = Math.random() * 2 - 1; } const s = ac.createBufferSource(), f = ac.createBiquadFilter(), g = ac.createGain(), t = ac.currentTime; s.buffer = nb; f.type = "bandpass"; f.frequency.value = freq || 1500; f.Q.value = q || 1; g.gain.setValueAtTime(vol || .1, t); g.gain.exponentialRampToValueAtTime(.001, t + d); s.connect(f); f.connect(g); g.connect(master); s.start(t); s.stop(t + d); }
  const now = () => ac ? ac.currentTime : 0;
  const sfx = {
    build() { noise(.12, .12, 600); tone(330, .1, "square", .05); }, road() { noise(.06, .07, 1200); }, no() { tone(180, .15, "square", .06, 0, 130); },
    grow() { const t = now(); tone(784, .1, "triangle", .06, t); tone(1047, .15, "triangle", .06, t + .08); }, coin() { const t = now(); tone(988, .06, "square", .03, t); tone(1319, .12, "square", .03, t + .06); },
    bull() { noise(.3, .15, 300); }, fire() { noise(.4, .1, 900, .5); }, splash() { noise(.3, .12, 2500); },
    milestone() { const t = now(); [[523, 0], [659, .15], [784, .3], [1047, .45], [784, .65], [1047, .8], [1319, 1]].forEach(([f, d]) => { tone(f, .3, "triangle", .1, t + d); tone(f / 2, .3, "sine", .05, t + d); }); }
  };
  const mf = (m) => 440 * Math.pow(2, (m - 69) / 12);
  const SONG = { bpm: 92, lead: [76, 0, 79, 0, 81, 79, 76, 0, 74, 0, 72, 74, 76, 0, 0, 0, 72, 0, 76, 0, 79, 77, 76, 74, 72, 0, 71, 0, 72, 0, 0, 0], bass: [48, 0, 55, 0, 52, 0, 55, 0, 53, 0, 57, 0, 55, 0, 52, 0, 45, 0, 52, 0, 48, 0, 52, 0, 43, 0, 50, 0, 48, 0, 43, 0] };
  let mStep = 0, mNext = 0;
  setInterval(() => { if (!ac || muted || state !== "play") { if (ac) mNext = Math.max(mNext, ac.currentTime); return; } const d = 60 / SONG.bpm / 2; if (mNext < ac.currentTime) mNext = ac.currentTime + .05; while (mNext < ac.currentTime + .3) { const i = mStep % 32; if (SONG.lead[i]) tone(mf(SONG.lead[i]), d * 1.8, "sine", .035, mNext, 0, mg); if (SONG.bass[i]) tone(mf(SONG.bass[i]), d * 1.4, "triangle", .05, mNext, 0, mg); mStep++; mNext += d; } }, 90);

  /* ---------- simülasyon ---------- */
  let stats = { res: 0, jobs: 0, workers: 0, unemp: 0, powerCap: 0, powerUse: 0, waterCap: 0, waterUse: 0, income: 0, upkeep: 0, demR: 0, demC: 0, demI: 0 };
  function eachTile(f) { for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) f(S.g[y][x], x, y); }
  function hasRoad(x, y) { return [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => { const t = T(x + dx, y + dy); return t && t.t === "yol"; }); }
  function near(x, y, type, r) { let n = 0; for (let yy = y - r; yy <= y + r; yy++) for (let xx = x - r; xx <= x + r; xx++) { const t = T(xx, yy); if (t && t.t === type && !t.fire && Math.abs(xx - x) + Math.abs(yy - y) <= r + 1) n++; } return n; }
  const RES = [0, 5, 14, 32];
  function recompute() {
    let res = 0, jobs = 0, pcap = 0, wcap = 0, ids = [], shops = 0, facts = 0;
    eachTile((t, x, y) => { if (t.t === "santral" && !t.fire) pcap += B.santral.power; if (t.t === "su" && !t.fire) wcap += B.su.water; if (NEEDS.has(t.t)) ids.push(t); });
    ids.sort((a, b) => (a.id || 0) - (b.id || 0));
    let pu = 0, wu = 0;
    eachTile((t, x, y) => { if (NEEDS.has(t.t)) t.road = hasRoad(x, y); });
    for (const t of ids) { t.pow = pu < pcap; pu++; t.wat = wu < wcap; wu++; }
    eachTile((t, x, y) => {
      const ok = t.road && t.pow && t.wat && !t.fire;
      if (t.t === "ev" && ok) res += RES[t.lv || 1] * (t.fill || 0);
      if ((t.t === "dukkan" || t.t === "fabrika") && ok) { jobs += B[t.t].jobs; if (t.t === "dukkan") shops++; else facts++; }
    });
    const workers = res * .45, unemp = workers > 0 ? clamp((workers - jobs) / workers, 0, 1) : 0;
    let up = 0, roads = 0; eachTile((t) => { if (B[t.t] && B[t.t].up) up += B[t.t].up; if (t.t === "yol") roads++; }); up += roads * .3;
    const shopIncome = Math.min(shops * 10, res * .5), income = res * 1.1 + shopIncome + facts * 14;
    stats = { res: Math.round(res), jobs, workers, unemp, powerCap: pcap, powerUse: pu, waterCap: wcap, waterUse: wu, income: Math.round(income), upkeep: Math.round(up), shops, facts,
      demR: clamp((jobs * 1.6 - res + 20) / 40, -1, 1), demC: clamp((res / 22 - shops) / 3, -1, 1), demI: clamp((res / 40 - facts) / 2, -1, 1) };
    S.pop = stats.res;
  }
  function happyAt(x, y) {
    const t = T(x, y); let h = 55;
    h += Math.min(30, near(x, y, "park", 3) * 15) + Math.min(6, near(x, y, "agac", 1) * 2);
    if (near(x, y, "okul", 4)) h += 10; if (near(x, y, "hastane", 5)) h += 10; if (stadium()) h += 10;
    h -= near(x, y, "fabrika", 3) * 18;
    h -= stats.unemp * 22;
    if (!t.road || !t.pow || !t.wat) h -= 40;
    return clamp(Math.round(h), 0, 100);
  }
  let stadCache = 0; const stadium = () => stadCache;
  function monthTick() {
    S.month++; recompute(); stadCache = 0; eachTile((t) => { if (t.t === "stadyum" && t.road && t.pow && t.wat) stadCache = 1; });
    let hs = 0, hn = 0;
    eachTile((t, x, y) => {
      if (t.t !== "ev") return; t.h = happyAt(x, y); hs += t.h; hn++;
      const ok = t.road && t.pow && t.wat && !t.fire;
      if (ok) { t.fill = Math.min(1, (t.fill || 0) + (stats.demR > -0.5 ? .35 : .1)); } else t.fill = Math.max(0, (t.fill || 0) - .3);
      if (ok && t.fill >= 1 && t.h >= 62 && (t.lv || 1) < 3 && Math.random() < .3 && stats.demR > -0.3 && ((t.lv || 1) < 2 || S.pop >= 90)) { t.lv = (t.lv || 1) + 1; t.fill = .5; grew.push({ x, y, t: 0 }); sfx.grow(); }
      else if (t.h < 30 && (t.lv || 1) > 1 && Math.random() < .2) t.lv--;
    });
    S.happy = hn ? Math.round(hs / hn) : 50;
    recompute();
    const net = stats.income - stats.upkeep; S.money += net; if (net) floaters.push({ x: W / 2, y: 90, text: (net > 0 ? "+" : "") + net + " ₺", col: net > 0 ? "#9FE870" : "#FF9C8A", t: 0, screen: 1 }); if (net > 0) sfx.coin();
    // yangın
    if (S.pop >= 200 && Math.random() < .25) { const cand = []; eachTile((t, x, y) => { if (isBld(t.t) && !t.fire && !near(x, y, "itfaiye", 5) && t.t !== "itfaiye") cand.push(t); }); if (cand.length) { const f = cand[Math.floor(Math.random() * cand.length)]; f.fire = 22; sfx.fire(); toast("🔥 Yangın çıktı! Söndürmek için dokun. İtfaiye kurarsan çıkmaz."); } }
    checkGoals(); save(); renderTools();
  }
  const MILESTONES = [
    { pop: 60, name: "Kasaba", unlock: "Fabrika ve okul açıldı!", bonus: 300 },
    { pop: 200, name: "Küçük şehir", unlock: "Hastane ve itfaiye açıldı! Dikkat, artık yangın çıkabilir.", bonus: 600 },
    { pop: 500, name: "Şehir", unlock: "Stadyum açıldı!", bonus: 1000 },
    { pop: 1000, name: "Büyük şehir", unlock: "Harika belediye başkanısın!", bonus: 1500 },
    { pop: 2000, name: "Metropol", unlock: "Efsane! Şehrin bir metropol oldu!", bonus: 3000 }
  ];
  const GOALS = [
    { t: "Yola bitişik 4 ev kur.", ok: () => count("ev") >= 4 },
    { t: "Santral kur (elektrik).", ok: () => count("santral") >= 1 },
    { t: "Su kulesi kur.", ok: () => count("su") >= 1 },
    { t: "Bir dükkân aç (iş ve vergi).", ok: () => count("dukkan") >= 1 },
    { t: "Evlerin yanına park yap.", ok: () => count("park") >= 1 },
    { t: "Nüfusu 60'a çıkar.", ok: () => S.pop >= 60 },
    { t: "Bir fabrika kur, ama evlerden uzağa!", ok: () => count("fabrika") >= 1 },
    { t: "Okul kur.", ok: () => count("okul") >= 1 },
    { t: "Nüfusu 200'e çıkar.", ok: () => S.pop >= 200 },
    { t: "İtfaiye ve hastane kur.", ok: () => count("itfaiye") >= 1 && count("hastane") >= 1 },
    { t: "Bir gökdelen yükselt (3. seviye ev).", ok: () => { let n = 0; eachTile((t) => { if (t.t === "ev" && t.lv === 3) n++; }); return n > 0; } },
    { t: "Nüfusu 500'e çıkar.", ok: () => S.pop >= 500 },
    { t: "Stadyum kur.", ok: () => count("stadyum") >= 1 },
    { t: "Nüfusu 1000'e çıkar.", ok: () => S.pop >= 1000 },
    { t: "Metropol ol: 2000 nüfus!", ok: () => S.pop >= 2000 }
  ];
  function count(type) { let n = 0; eachTile((t) => { if (t.t === type) n++; }); return n; }
  function checkGoals() {
    while (S.goal < GOALS.length && GOALS[S.goal].ok()) { S.goal++; S.money += 50; sfx.coin(); toast("✅ Görev tamam! +50 ₺"); }
    while (S.milestone < MILESTONES.length && S.pop >= MILESTONES[S.milestone].pop) { const m = MILESTONES[S.milestone]; S.milestone++; S.money += m.bonus; sfx.milestone(); toast("🎉 " + m.name + "! " + m.unlock + " +" + m.bonus + " ₺", 7000); confetti(); }
    renderMission();
  }
  function renderMission() {
    const m = $("mission"); if (!S) { m.innerHTML = ""; return; }
    const g = GOALS[S.goal];
    m.innerHTML = "<b>Başkan Enes'in görevi</b><br>" + (g ? "▸ " + g.t : "<span class='done'>Bütün görevler bitti! 🏆</span>") + "<br><small>" + S.goal + " / " + GOALS.length + " görev</small>";
  }
  let toastT = null;
  function toast(text, ms) { floaters.push({ x: W / 2, y: 150, text, col: "#FFF3B0", t: 0, screen: 1, big: 1, life: (ms || 4500) / 1000 }); }

  /* ---------- kamera ---------- */
  const cam = { x: 0, y: 140, z: 1 };
  const iso = (gx, gy) => ({ x: (gx - gy) * TW / 2, y: (gx + gy) * TH / 2 });
  function toScreen(gx, gy) { const p = iso(gx, gy); return { x: W / 2 + (p.x - cam.x) * cam.z, y: H / 2 + (p.y - cam.y - N * TH / 2 + 140) * cam.z }; }
  function toGrid(sx, sy) { const wx = (sx - W / 2) / cam.z + cam.x, wy = (sy - H / 2) / cam.z + cam.y + N * TH / 2 - 140; const gx = (wy / (TH / 2) + wx / (TW / 2)) / 2, gy = (wy / (TH / 2) - wx / (TW / 2)) / 2; return { x: Math.floor(gx), y: Math.floor(gy) }; }

  /* ---------- girdi ---------- */
  let tool = "bak", pd = null, hover = null, selected = null, speed = 1;
  function canvasXY(e) { const r = cv.getBoundingClientRect(); return [(e.clientX - r.left) / r.width * W, (e.clientY - r.top) / r.height * H]; }
  cv.addEventListener("pointerdown", (e) => { audio(); if (state !== "play") return; e.preventDefault(); const [sx, sy] = canvasXY(e); pd = { sx, sy, cx: cam.x, cy: cam.y, moved: false, painted: new Set() }; try { cv.setPointerCapture(e.pointerId); } catch (x) {} if (tool === "yol" || tool === "yik") { const g = toGrid(sx, sy); paint(g.x, g.y); pd.painting = true; } });
  cv.addEventListener("pointermove", (e) => { const [sx, sy] = canvasXY(e); hover = toGrid(sx, sy); if (!pd) return; if (pd.painting) { paint(hover.x, hover.y); return; } if (Math.hypot(sx - pd.sx, sy - pd.sy) > 10) pd.moved = true; if (pd.moved) { cam.x = pd.cx - (sx - pd.sx) / cam.z; cam.y = pd.cy - (sy - pd.sy) / cam.z; clampCam(); } });
  cv.addEventListener("pointerup", (e) => { if (!pd) return; const [sx, sy] = canvasXY(e); if (!pd.moved && !pd.painting) { const g = toGrid(sx, sy); act(g.x, g.y); } pd = null; });
  cv.addEventListener("pointerleave", () => { hover = null; });
  cv.addEventListener("wheel", (e) => { e.preventDefault(); zoom(e.deltaY < 0 ? 1.1 : 1 / 1.1); }, { passive: false });
  addEventListener("keydown", (e) => { if (state !== "play") return; const k = e.code, s = 30 / cam.z; if (k === "ArrowLeft" || k === "KeyA") cam.x -= s; else if (k === "ArrowRight" || k === "KeyD") cam.x += s; else if (k === "ArrowUp" || k === "KeyW") cam.y -= s; else if (k === "ArrowDown" || k === "KeyS") cam.y += s; else if (k === "Escape") { setTool("bak"); } else return; e.preventDefault(); clampCam(); });
  function clampCam() { cam.x = clamp(cam.x, -N * TW / 2, N * TW / 2); cam.y = clamp(cam.y, -80, N * TH + 40); }
  function zoom(f) { cam.z = clamp(cam.z * f, .55, 1.8); }
  $("zin").onclick = () => zoom(1.2); $("zout").onclick = () => zoom(1 / 1.2);
  $("spd").onclick = () => { speed = speed === 1 ? 3 : speed === 3 ? 0 : 1; $("spd").textContent = speed ? speed + "×" : "❚❚"; };
  function paint(x, y) { const k = x + "," + y; if (pd.painted.has(k)) return; pd.painted.add(k); act(x, y, true); }
  function act(x, y, drag) {
    const t = T(x, y); if (!t) return;
    if (t.fire) { t.fire = 0; sfx.splash(); for (let i = 0; i < 14; i++) parts.push({ gx: x + .5, gy: y + .5, z: 30, vx: rnd(-1, 1), vy: rnd(-1, 1), vz: rnd(40, 90), life: .8, c: "#8FD3FF" }); floaters.push({ gx: x + .5, gy: y + .5, text: "Söndü!", col: "#8FD3FF", t: 0 }); return; }
    if (tool === "bak") { selected = isBld(t.t) || t.t === "yol" ? { x, y } : null; showInfo(); return; }
    if (tool === "yik") { if (t.t === "cim" || t.t === "su_") return; const old = t.t; S.g[y][x] = { t: "cim" }; sfx.bull(); dust(x, y); if (old === "yol") cars = cars.filter((c) => !(c.x === x && c.y === y)); recompute(); save(); return; }
    const b = B[tool]; if (!b) return;
    if (b.unlock && S.pop < b.unlock && !(S.unlocked || {})[tool]) { if (!drag) { sfx.no(); toast(b.name + " " + b.unlock + " nüfusta açılır."); } return; }
    if (t.t === "su_") { if (!drag) { sfx.no(); toast("Suya inşaat yapılamaz."); } return; }
    if (t.t !== "cim" && t.t !== "agac" && t.t !== "enkaz") { if (!drag) sfx.no(); return; }
    if (S.money < b.cost) { if (!drag) { sfx.no(); toast("Paran yetmiyor! Vergilerin gelmesini bekle."); } return; }
    S.money -= b.cost;
    S.g[y][x] = { t: tool, id: S.nid++, lv: tool === "ev" ? 1 : undefined, fill: 0 };
    if (tool === "yol") sfx.road(); else { sfx.build(); dust(x, y); }
    built.push({ x, y, t: 0 });
    recompute(); checkGoals(); save(); renderTools();
    if (NEEDS.has(tool) && !hasRoad(x, y) && !drag) toast("Bu bina yola bitişik değil. Yanına yol çek!");
  }
  function showInfo() {
    const box = $("info"); if (!selected) { box.hidden = true; return; }
    const { x, y } = selected, t = T(x, y); if (!t || (!isBld(t.t) && t.t !== "yol")) { box.hidden = true; selected = null; return; }
    const b = B[t.t] || { name: t.t };
    let h = "<h3>" + (t.t === "ev" ? ["", "Ev", "Apartman", "Gökdelen"][t.lv || 1] : b.name) + "</h3>";
    if (NEEDS.has(t.t)) h += "<div class='row'><span>Yol</span><span class='" + (t.road ? "ok'>✔" : "bad'>✖") + "</span></div><div class='row'><span>Elektrik</span><span class='" + (t.pow ? "ok'>✔" : "bad'>✖") + "</span></div><div class='row'><span>Su</span><span class='" + (t.wat ? "ok'>✔" : "bad'>✖") + "</span></div>";
    if (t.t === "ev") { const hp = happyAt(x, y); h += "<div class='row'><span>Sakin</span><span>" + Math.round(RES[t.lv || 1] * (t.fill || 0)) + " / " + RES[t.lv || 1] + "</span></div><div class='row'><span>Mutluluk</span><span class='" + (hp >= 60 ? "ok" : hp < 35 ? "bad" : "") + "'>" + hp + "%</span></div>"; h += "<small>" + (hp < 62 ? "Büyümesi için %62 mutluluk lazım: park, okul, hastane ekle; fabrikadan uzak tut." : "Mutlu! Yakında büyüyebilir.") + "</small>"; }
    else if (b.desc) h += "<small>" + b.desc + "</small>";
    if (b.jobs) h += "<div class='row'><span>İş</span><span>" + b.jobs + "</span></div>";
    if (b.up) h += "<div class='row'><span>Bakım</span><span>" + b.up + " ₺/ay</span></div>";
    h += "<button type='button' id='infoClose'>Kapat</button>";
    box.innerHTML = h; box.hidden = false; $("infoClose").onclick = () => { selected = null; box.hidden = true; };
  }

  /* ---------- araç çubuğu ---------- */
  function setTool(k) { tool = k; selected = null; $("info").hidden = true; document.querySelectorAll(".tool").forEach((b) => b.setAttribute("aria-pressed", b.dataset.k === k ? "true" : "false")); }
  function renderTools() {
    const nav = $("tools"); if (!nav.children.length) {
      TOOL_ORDER.forEach((k) => { const b = document.createElement("button"); b.type = "button"; b.className = "tool"; b.dataset.k = k; b.title = B[k].desc; const c = document.createElement("canvas"); c.width = 104; c.height = 80; b.appendChild(c); b.appendChild(document.createTextNode(B[k].name)); const p = document.createElement("span"); p.className = "pr"; b.appendChild(p); const l = document.createElement("span"); l.className = "lock"; b.appendChild(l); b.onclick = () => { audio(); setTool(k); }; nav.appendChild(b); toolIcon(c, k); });
    }
    nav.querySelectorAll(".tool").forEach((b) => { const k = b.dataset.k, bb = B[k], locked = bb.unlock && S && S.pop < bb.unlock && !(S.unlocked || {})[k]; if (S && bb.unlock && S.pop >= bb.unlock) { S.unlocked = S.unlocked || {}; S.unlocked[k] = 1; } b.querySelector(".pr").textContent = locked ? bb.unlock + " nüfus" : bb.cost ? bb.cost + " ₺" : ""; b.querySelector(".lock").textContent = locked ? "🔒" : ""; b.disabled = !!locked; b.setAttribute("aria-pressed", tool === k ? "true" : "false"); });
  }
  function toolIcon(c, k) {
    const x = c.getContext("2d"), old = ctx; ctx = x; x.clearRect(0, 0, c.width, c.height);
    if (k === "bak") { x.strokeStyle = "#fff"; x.lineWidth = 6; x.beginPath(); x.arc(46, 36, 18, 0, 7); x.stroke(); x.lineWidth = 9; x.beginPath(); x.moveTo(60, 50); x.lineTo(78, 68); x.stroke(); }
    else if (k === "yik") { x.fillStyle = "#FFB020"; x.fillRect(22, 38, 50, 22); x.fillStyle = "#3A3A44"; x.fillRect(20, 58, 56, 10); circle(x, 30, 68, 7, "#222"); circle(x, 66, 68, 7, "#222"); x.fillStyle = "#FFB020"; x.beginPath(); x.moveTo(72, 42); x.lineTo(92, 50); x.lineTo(92, 64); x.lineTo(76, 58); x.fill(); }
    else { const sc = .75; x.save(); x.translate(52, 58); x.scale(sc, sc); drawTileAt(x, { t: k, lv: k === "ev" ? 2 : undefined, road: 1, pow: 1, wat: 1 }, 0, 0, 0, 0, true); x.restore(); }
    ctx = old;
  }
  function circle(c, x, y, r, fill) { c.beginPath(); c.arc(x, y, r, 0, Math.PI * 2); c.fillStyle = fill; c.fill(); }

  /* ---------- çizim ---------- */
  function diamond(c, x, y, col, stroke) { c.beginPath(); c.moveTo(x, y - TH / 2); c.lineTo(x + TW / 2, y); c.lineTo(x, y + TH / 2); c.lineTo(x - TW / 2, y); c.closePath(); c.fillStyle = col; c.fill(); if (stroke) { c.strokeStyle = stroke; c.lineWidth = 1; c.stroke(); } }
  function shade(hex, k) { const n = parseInt(hex.slice(1), 16); let r = n >> 16, g = (n >> 8) & 255, b = n & 255; r = clamp(Math.round(r * k), 0, 255); g = clamp(Math.round(g * k), 0, 255); b = clamp(Math.round(b * k), 0, 255); return "rgb(" + r + "," + g + "," + b + ")"; }
  // kutu: taban merkezi (x,y), ayak izi w (0-1 karo), yükseklik h
  function box(c, x, y, w, h, col, opt) {
    opt = opt || {}; const hw = TW / 2 * w, hh = TH / 2 * w;
    // sol yüz
    c.beginPath(); c.moveTo(x - hw, y); c.lineTo(x, y + hh); c.lineTo(x, y + hh - h); c.lineTo(x - hw, y - h); c.closePath(); c.fillStyle = shade(col, .82); c.fill(); c.strokeStyle = OL; c.lineWidth = 1; c.stroke();
    // sağ yüz
    c.beginPath(); c.moveTo(x + hw, y); c.lineTo(x, y + hh); c.lineTo(x, y + hh - h); c.lineTo(x + hw, y - h); c.closePath(); c.fillStyle = shade(col, .66); c.fill(); c.stroke();
    // üst
    c.beginPath(); c.moveTo(x, y - hh - h); c.lineTo(x + hw, y - h); c.lineTo(x, y + hh - h); c.lineTo(x - hw, y - h); c.closePath(); c.fillStyle = opt.top || shade(col, 1.08); c.fill(); c.stroke();
    if (opt.win) windows(c, x, y, hw, hh, h, opt.win, opt.lit);
  }
  function windows(c, x, y, hw, hh, h, rows, lit) {
    const cols = 3;
    for (let r = 0; r < rows; r++) for (let k = 0; k < cols; k++) {
      const fy = (r + .6) / (rows + .4), fx = (k + .5) / cols;
      for (const side of [-1, 1]) {
        const px = x + side * hw * (1 - fx), py = y + hh * fx - h * fy + (side < 0 ? 0 : 0);
        const on = lit && hash(Math.round(px), Math.round(py)) > .35;
        c.fillStyle = on ? "#FFE680" : side < 0 ? "#A8D8F0" : "#7AB0D0";
        c.beginPath(); c.moveTo(px - side * 3, py - 2 + side * 0); c.lineTo(px + side * 3, py - 2 + 1.5); c.lineTo(px + side * 3, py + 3.5); c.lineTo(px - side * 3, py + 2); c.closePath(); c.fill();
      }
    }
  }
  function roof(c, x, y, w, h, col) { const hw = TW / 2 * w, hh = TH / 2 * w; c.strokeStyle = OL; c.lineWidth = 1;
    c.beginPath(); c.moveTo(x - hw, y - h); c.lineTo(x, y - h - 16 * w); c.lineTo(x, y + hh - h); c.closePath(); c.fillStyle = shade(col, .95); c.fill(); c.stroke();
    c.beginPath(); c.moveTo(x + hw, y - h); c.lineTo(x, y - h - 16 * w); c.lineTo(x, y + hh - h); c.closePath(); c.fillStyle = shade(col, .75); c.fill(); c.stroke();
    c.beginPath(); c.moveTo(x - hw, y - h); c.lineTo(x, y - hh - h); c.lineTo(x + hw, y - h); c.lineTo(x, y - h - 16 * w); c.closePath(); c.fillStyle = shade(col, 1.1); c.fill(); c.stroke(); }
  function treeAt(c, x, y, s, t) { const sw = Math.sin(t * 1.5 + x) * 1.2; c.fillStyle = "rgba(0,0,0,.2)"; c.beginPath(); c.ellipse(x, y + 2, 9 * s, 4 * s, 0, 0, 7); c.fill(); c.fillStyle = "#7A4A26"; c.fillRect(x - 1.5 * s, y - 10 * s, 3 * s, 10 * s); circle(c, x + sw, y - 16 * s, 9 * s, "#2E8A3A"); circle(c, x - 3 * s + sw, y - 19 * s, 5 * s, "#4FAA4A"); }
  function drawTileAt(c, t, x, y, gx, gy, icon) {
    const night = icon ? 0 : nightK, lit = night > .4, tt = t.t, cl = clock;
    if (tt === "cim" || tt === "agac" || tt === "enkaz") { if (!icon) diamond(c, x, y, (gx + gy) % 2 ? "#6CBF4F" : "#64B649"); if (tt === "agac") { treeAt(c, x - 8, y + 2, .9, cl); treeAt(c, x + 9, y - 3, .75, cl); } if (tt === "enkaz") { for (let i = 0; i < 6; i++) { c.fillStyle = i % 2 ? "#6A6A72" : "#4A4A52"; c.fillRect(x - 14 + hash(gx, i) * 26, y - 6 + hash(gy, i) * 10, 6, 4); } } return; }
    if (tt === "su_") { diamond(c, x, y, "#3A9FD8"); c.strokeStyle = "rgba(255,255,255,.45)"; c.lineWidth = 1.5; const o = Math.sin(cl * 2 + gx + gy) * 4; c.beginPath(); c.moveTo(x - 10 + o, y - 2); c.lineTo(x + o, y - 2); c.stroke(); return; }
    if (tt === "yol") { diamond(c, x, y, "#6A6A76"); if (!icon) { const n = [[1, 0], [0, 1], [-1, 0], [0, -1]].map(([dx, dy]) => { const q = T(gx + dx, gy + dy); return q && q.t === "yol"; }); c.strokeStyle = "#E8E8F0"; c.lineWidth = 1.5; c.setLineDash([4, 4]); const dirs = [[TW / 4, TH / 4], [-TW / 4, TH / 4], [-TW / 4, -TH / 4], [TW / 4, -TH / 4]]; n.forEach((on, i) => { if (on) { c.beginPath(); c.moveTo(x, y); c.lineTo(x + dirs[i][0], y + dirs[i][1]); c.stroke(); } }); c.setLineDash([]); if (!n.some(Boolean)) { circle(c, x, y, 2, "#E8E8F0"); } } else { c.strokeStyle = "#E8E8F0"; c.lineWidth = 2; c.setLineDash([5, 4]); c.beginPath(); c.moveTo(x - TW / 4, y - TH / 4); c.lineTo(x + TW / 4, y + TH / 4); c.stroke(); c.setLineDash([]); } return; }
    // bina tabanı
    if (!icon) diamond(c, x, y, tt === "park" || tt === "stadyum" ? "#5DAF45" : "#B8B8C0");
    const v = hash(gx * 7 + 1, gy * 3 + 2);
    if (tt === "ev") {
      const lv = t.lv || 1, cols = ["#E8D7B0", "#F2C8A0", "#D8E8F2", "#F2E6A0", "#E8C8D8"], col = cols[Math.floor(v * 5)];
      if (lv === 1) { box(c, x, y + 2, .62, 16, col, { win: 1, lit }); roof(c, x, y + 2, .62, 16, ["#C8463F", "#8E5A3A", "#3E6EB8"][Math.floor(v * 3)]); if ((t.fill || 0) < .5 && !icon) { c.fillStyle = "#fff"; c.font = "700 9px Rubik"; c.textAlign = "center"; c.fillText("Satılık", x, y - 30); } }
      else if (lv === 2) { box(c, x, y + 2, .72, 40, col, { win: 4, lit }); c.fillStyle = "#8E8E9E"; c.fillRect(x - 3, y - 54, 6, 8); }
      else { box(c, x, y + 2, .74, 84, ["#9AB8D8", "#B8C8D8", "#A8D0C8"][Math.floor(v * 3)], { win: 9, lit }); c.strokeStyle = "#E8463F"; c.lineWidth = 1.5; c.beginPath(); c.moveTo(x, y - 94); c.lineTo(x, y - 106); c.stroke(); if (Math.floor(cl * 2) % 2) circle(c, x, y - 107, 2, "#FF4A3A"); }
    }
    else if (tt === "dukkan") { box(c, x, y + 2, .74, 22, "#E8E0D0", { win: 1, lit }); const hw = TW / 2 * .74, hh = TH / 2 * .74; for (let k = 0; k < 4; k++) { c.fillStyle = k % 2 ? "#fff" : ["#E8463F", "#2E86DE", "#3FA34D"][Math.floor(v * 3)]; c.beginPath(); const f0 = k / 4, f1 = (k + 1) / 4; c.moveTo(x - hw * (1 - f0), y + 2 + hh * f0 - 16); c.lineTo(x - hw * (1 - f1), y + 2 + hh * f1 - 16); c.lineTo(x - hw * (1 - f1) - 3, y + 2 + hh * f1 - 10); c.lineTo(x - hw * (1 - f0) - 3, y + 2 + hh * f0 - 10); c.fill(); } c.fillStyle = "#FFD23F"; c.fillRect(x + 6, y - 30, 14, 6); }
    else if (tt === "fabrika") { box(c, x, y + 2, .8, 26, "#9A9AA6", { win: 1, lit }); for (let k = 0; k < 3; k++) { c.fillStyle = "#7A7A86"; c.beginPath(); const bx = x - 16 + k * 10, by = y - 22 - k * 5 + 4; c.moveTo(bx, by); c.lineTo(bx + 8, by - 8); c.lineTo(bx + 8, by); c.fill(); } c.fillStyle = "#6A5A5A"; c.fillRect(x + 8, y - 50, 7, 28); c.fillStyle = "#E8463F"; c.fillRect(x + 8, y - 50, 7, 4); if (!icon && t.pow && Math.random() < .08) parts.push({ gx: gx + .62, gy: gy + .3, z: 50, vx: rnd(-.05, .05), vy: rnd(-.05, .05), vz: 18, life: 2.5, c: "rgba(120,120,130,.5)", s: 6, smoke: 1 }); }
    else if (tt === "park") { for (const [dx, dy] of [[-12, -2], [12, 2], [0, 6]]) treeAt(c, x + dx, y + dy, .7, cl); c.fillStyle = "#8FD3FF"; c.beginPath(); c.ellipse(x - 2, y - 4, 7, 3.5, 0, 0, 7); c.fill(); c.fillStyle = "#8A5A2B"; c.fillRect(x + 4, y - 10, 10, 3); for (let i = 0; i < 4; i++) circle(c, x - 18 + i * 10, y + 8 - (i % 2) * 3, 1.8, ["#FF7AA2", "#FFD23F", "#fff", "#B98CFF"][i]); }
    else if (tt === "santral") { box(c, x - 6, y + 4, .5, 20, "#B8B0A8", { win: 1, lit }); c.fillStyle = "#C8C8D0"; c.strokeStyle = OL; c.beginPath(); c.moveTo(x + 4, y + 2); c.quadraticCurveTo(x + 9, y - 18, x + 6, y - 38); c.lineTo(x + 24, y - 38); c.quadraticCurveTo(x + 21, y - 18, x + 26, y + 2); c.closePath(); c.fill(); c.stroke(); c.fillStyle = "#A8A8B0"; c.beginPath(); c.ellipse(x + 15, y - 38, 9, 3, 0, 0, 7); c.fill(); c.stroke(); c.fillStyle = "#FFD23F"; c.font = "700 14px Rubik"; c.textAlign = "center"; c.fillText("⚡", x - 6, y - 26); if (!icon && Math.random() < .1) parts.push({ gx: gx + .55, gy: gy + .3, z: 62, vx: rnd(-.04, .04), vy: rnd(-.04, .04), vz: 16, life: 2.5, c: "rgba(255,255,255,.6)", s: 7, smoke: 1 }); }
    else if (tt === "su") { c.strokeStyle = "#6A6A76"; c.lineWidth = 3; for (const s of [-1, 1]) { c.beginPath(); c.moveTo(x + s * 12, y + 4); c.lineTo(x + s * 6, y - 26); c.stroke(); } c.beginPath(); c.moveTo(x, y + 8); c.lineTo(x, y - 26); c.stroke(); c.fillStyle = "#4D8DF0"; c.beginPath(); c.ellipse(x, y - 30, 15, 6, 0, 0, 7); c.fill(); c.fillRect(x - 15, y - 48, 30, 18); c.beginPath(); c.ellipse(x, y - 48, 15, 6, 0, 0, 7); c.fillStyle = "#7AB0F8"; c.fill(); c.strokeStyle = OL; c.lineWidth = 1; c.stroke(); c.fillStyle = "#fff"; c.font = "700 11px Rubik"; c.textAlign = "center"; c.fillText("💧", x, y - 35); }
    else if (tt === "okul") { box(c, x, y + 2, .78, 26, "#F2C14E", { win: 2, lit }); roof(c, x, y + 2, .78, 26, "#C8463F"); c.strokeStyle = "#555"; c.lineWidth = 1.5; c.beginPath(); c.moveTo(x + 14, y - 30); c.lineTo(x + 14, y - 52); c.stroke(); c.fillStyle = "#E8463F"; c.fillRect(x + 14, y - 52, 10, 6); circle(c, x - 8, y - 18, 4, "#fff"); }
    else if (tt === "hastane") { box(c, x, y + 2, .8, 40, "#F4F7FA", { win: 3, lit }); c.fillStyle = "#E8463F"; c.fillRect(x - 3, y - 58, 6, 14); c.fillRect(x - 7, y - 54, 14, 6); }
    else if (tt === "itfaiye") { box(c, x, y + 2, .78, 26, "#D8463F", { win: 1, lit }); const hw = TW / 2 * .78, hh = TH / 2 * .78; c.fillStyle = "#3A3A44"; c.beginPath(); c.moveTo(x - hw * .7, y + 2 + hh * .3); c.lineTo(x - hw * .2, y + 2 + hh * .8); c.lineTo(x - hw * .2, y + 2 + hh * .8 - 14); c.lineTo(x - hw * .7, y + 2 + hh * .3 - 14); c.fill(); c.fillStyle = "#fff"; c.font = "700 10px Rubik"; c.textAlign = "center"; c.fillText("🚒", x + 10, y - 22); }
    else if (tt === "stadyum") { c.fillStyle = "#C8C8D0"; c.strokeStyle = OL; c.beginPath(); c.ellipse(x, y - 6, 30, 15, 0, 0, 7); c.fill(); c.stroke(); c.fillStyle = "#3FA34D"; c.beginPath(); c.ellipse(x, y - 8, 22, 10, 0, 0, 7); c.fill(); c.strokeStyle = "#fff"; c.lineWidth = 1; c.beginPath(); c.moveTo(x - 10, y - 13); c.lineTo(x + 10, y - 3); c.stroke(); for (let k = 0; k < 4; k++) { c.fillStyle = "#555"; c.fillRect(x - 28 + k * 18, y - 26, 2, 14); circle(c, x - 27 + k * 18, y - 27, 3, lit ? "#FFF6B0" : "#ddd"); } }
    // uyarı simgeleri
    if (!icon && NEEDS.has(tt)) { const miss = !t.road ? "🛣" : !t.pow ? "⚡" : !t.wat ? "💧" : null; if (miss && Math.floor(cl * 2) % 2) { circle(c, x, y - 70, 10, "rgba(232,70,63,.9)"); c.font = "12px sans-serif"; c.textAlign = "center"; c.textBaseline = "middle"; c.fillText(miss, x, y - 69); c.textBaseline = "alphabetic"; } }
    if (!icon && t.fire) { for (let k = 0; k < 3; k++) { const fx = x - 10 + k * 10, fh = 14 + Math.sin(cl * 12 + k) * 5; c.fillStyle = "#FF6A1F"; c.beginPath(); c.moveTo(fx - 6, y - 10); c.quadraticCurveTo(fx, y - 10 - fh * 2, fx + 6, y - 10); c.fill(); c.fillStyle = "#FFD23F"; c.beginPath(); c.moveTo(fx - 3, y - 10); c.quadraticCurveTo(fx, y - 10 - fh, fx + 3, y - 10); c.fill(); } if (Math.random() < .2) parts.push({ gx: gx + .5, gy: gy + .5, z: 40, vx: 0, vy: 0, vz: 25, life: 2, c: "rgba(60,60,60,.5)", s: 8, smoke: 1 }); }
  }
  let nightK = 0, clock = 0, parts = [], floaters = [], cars = [], grew = [], built = [];
  function dust(x, y) { for (let i = 0; i < 12; i++) parts.push({ gx: x + .5, gy: y + .5, z: 4, vx: rnd(-1, 1), vy: rnd(-1, 1), vz: rnd(20, 60), life: .6, c: "#D8C8A8", s: 4 }); }
  function confetti() { for (let i = 0; i < 80; i++) floatersConf.push({ x: rnd(0, W), y: -10, vx: rnd(-40, 40), vy: rnd(60, 180), life: rnd(2, 4), c: ["#E8463F", "#FFD23F", "#2E86DE", "#3FA34D", "#FF7AA2"][i % 5], r: rnd(0, 6) }); }
  let floatersConf = [];
  function draw() {
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    const g = ctx.createLinearGradient(0, 0, 0, H); g.addColorStop(0, mixc("#7EC8FF", "#14183A", nightK)); g.addColorStop(1, mixc("#BFE8FF", "#2A2A5A", nightK)); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    if (!S) return;
    // kara tabanı (kalınlık)
    const pL = toScreen(0, N), pB = toScreen(N, N), pR = toScreen(N, 0); ctx.fillStyle = "#7A5A3A"; ctx.beginPath(); ctx.moveTo(pL.x, pL.y); ctx.lineTo(pB.x, pB.y); ctx.lineTo(pB.x, pB.y + 18 * cam.z); ctx.lineTo(pL.x, pL.y + 18 * cam.z); ctx.fill(); ctx.fillStyle = "#5A4028"; ctx.beginPath(); ctx.moveTo(pB.x, pB.y); ctx.lineTo(pR.x, pR.y); ctx.lineTo(pR.x, pR.y + 18 * cam.z); ctx.lineTo(pB.x, pB.y + 18 * cam.z); ctx.fill();
    ctx.save(); ctx.translate(W / 2, H / 2); ctx.scale(cam.z, cam.z); ctx.translate(-cam.x, -cam.y - N * TH / 2 + 140);
    // karolar arkadan öne
    for (let s = 0; s < N * 2 - 1; s++) for (let x = Math.max(0, s - N + 1); x <= Math.min(N - 1, s); x++) {
      const y = s - x, t = S.g[y][x], p = iso(x + .5, y + .5);
      if (p.x < cam.x - W / cam.z / 2 - 80 || p.x > cam.x + W / cam.z / 2 + 80) continue;
      const pop = built.find((b) => b.x === x && b.y === y); let sc = 1; if (pop) sc = .6 + Math.min(1, pop.t * 5) * .4 + Math.sin(Math.min(1, pop.t * 5) * Math.PI) * .15;
      if (sc !== 1) { ctx.save(); ctx.translate(p.x, p.y); ctx.scale(sc, sc); drawTileAt(ctx, t, 0, 0, x, y); ctx.restore(); } else drawTileAt(ctx, t, p.x, p.y, x, y);
      // arabalar bu karoda
      for (const car of cars) if (car.drawKey === x + "," + y) drawCar(car);
    }
    // vurgu
    if (hover && T(hover.x, hover.y) && tool !== "bak") { const p = iso(hover.x + .5, hover.y + .5), t = T(hover.x, hover.y), b = B[tool]; const ok = tool === "yik" ? (t.t !== "cim" && t.t !== "su_") : (t.t === "cim" || t.t === "agac" || t.t === "enkaz") && S.money >= (b ? b.cost : 0); ctx.globalAlpha = .5; diamond(ctx, p.x, p.y, ok ? "#FFF3B0" : "#FF6A5A"); ctx.globalAlpha = 1; if (RANGE[tool] && ok) { ctx.strokeStyle = tool === "fabrika" ? "rgba(255,90,60,.7)" : "rgba(255,255,255,.7)"; ctx.lineWidth = 2; ctx.setLineDash([6, 5]); const r = RANGE[tool] + .5; const a = iso(hover.x + .5 - r, hover.y + .5 - r), b2 = iso(hover.x + .5 + r, hover.y + .5 - r), c2 = iso(hover.x + .5 + r, hover.y + .5 + r), d2 = iso(hover.x + .5 - r, hover.y + .5 + r); ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b2.x, b2.y); ctx.lineTo(c2.x, c2.y); ctx.lineTo(d2.x, d2.y); ctx.closePath(); ctx.stroke(); ctx.setLineDash([]); } }
    if (selected) { const p = iso(selected.x + .5, selected.y + .5); ctx.strokeStyle = "#FFD23F"; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(p.x, p.y - TH / 2); ctx.lineTo(p.x + TW / 2, p.y); ctx.lineTo(p.x, p.y + TH / 2); ctx.lineTo(p.x - TW / 2, p.y); ctx.closePath(); ctx.stroke(); }
    for (const p of parts) { const s = iso(p.gx, p.gy); ctx.globalAlpha = Math.min(1, p.life); ctx.fillStyle = p.c; ctx.beginPath(); ctx.arc(s.x, s.y - p.z, p.s || 3, 0, 7); ctx.fill(); } ctx.globalAlpha = 1;
    for (const f of floaters) if (!f.screen) { const s = iso(f.gx, f.gy); ctx.globalAlpha = 1 - f.t / 1.4; txt(f.text, s.x, s.y - 50 - f.t * 30, 16, f.col); ctx.globalAlpha = 1; }
    ctx.restore();
    if (nightK > 0) { ctx.fillStyle = "rgba(10,12,40," + nightK * .35 + ")"; ctx.fillRect(0, 0, W, H); }
    for (const p of floatersConf) { ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.r); ctx.fillStyle = p.c; ctx.fillRect(-4, -2, 8, 4); ctx.restore(); }
    hud();
    for (const f of floaters) if (f.screen) { const life = f.life || 1.4; ctx.globalAlpha = Math.max(0, 1 - f.t / life); if (f.big) { ctx.font = "800 18px Rubik"; const w = ctx.measureText(f.text).width + 30; ctx.fillStyle = "rgba(15,35,25,.9)"; ctx.fillRect(W / 2 - w / 2, f.y - 18, w, 36); txt(f.text, W / 2, f.y, 18, f.col); } else txt(f.text, f.x, f.y - f.t * 20, 22, f.col); ctx.globalAlpha = 1; }
  }
  function mixc(a, b, k) { const pa = parseInt(a.slice(1), 16), pb = parseInt(b.slice(1), 16); const r = (pa >> 16) + ((pb >> 16) - (pa >> 16)) * k, g = ((pa >> 8) & 255) + (((pb >> 8) & 255) - ((pa >> 8) & 255)) * k, bl = (pa & 255) + ((pb & 255) - (pa & 255)) * k; return "rgb(" + (r | 0) + "," + (g | 0) + "," + (bl | 0) + ")"; }
  function txt(s, x, y, size, col, align) { ctx.font = "800 " + size + "px Rubik, sans-serif"; ctx.textAlign = align || "center"; ctx.textBaseline = "middle"; ctx.lineWidth = Math.max(3, size * .2); ctx.strokeStyle = "rgba(15,25,20,.85)"; ctx.strokeText(s, x, y); ctx.fillStyle = col; ctx.fillText(s, x, y); ctx.textBaseline = "alphabetic"; }
  function drawCar(car) { const s = iso(car.px, car.py); ctx.save(); ctx.translate(s.x, s.y - 4); const ang = Math.atan2((car.dy) * TH / 2 + car.dx * TH / 2, (car.dx - car.dy) * TW / 2); ctx.rotate(ang); ctx.fillStyle = "rgba(0,0,0,.25)"; ctx.fillRect(-7, -2, 14, 8); ctx.fillStyle = car.col; ctx.fillRect(-7, -5, 14, 8); ctx.fillStyle = "#BFE8FF"; ctx.fillRect(0, -4, 4, 6); if (nightK > .4) { ctx.fillStyle = "#FFF6B0"; ctx.fillRect(6, -4, 2, 2); ctx.fillRect(6, 1, 2, 2); } ctx.restore(); }
  function hud() {
    ctx.fillStyle = "rgba(15,35,25,.82)"; ctx.fillRect(0, 0, W, 58); ctx.fillStyle = "#6AA87A"; ctx.fillRect(0, 58, W, 2);
    txt("💰 " + Math.round(S.money) + " ₺", 20, 20, 19, S.money < 0 ? "#FF9C8A" : "#FFE9A0", "left");
    txt((stats.income - stats.upkeep >= 0 ? "+" : "") + (stats.income - stats.upkeep) + " ₺/ay", 20, 43, 13, "#C8D8E8", "left");
    txt("👥 " + S.pop, 200, 20, 19, "#fff", "left"); const nm = MILESTONES[S.milestone]; txt(nm ? "Hedef: " + nm.pop : "Metropol!", 200, 43, 13, "#C8D8E8", "left");
    txt((S.happy >= 60 ? "😊 " : S.happy >= 35 ? "😐 " : "😟 ") + S.happy + "%", 330, 20, 19, "#fff", "left"); txt("Mutluluk", 330, 43, 13, "#C8D8E8", "left");
    const pw = stats.powerUse > stats.powerCap, wt = stats.waterUse > stats.waterCap;
    txt("⚡ " + stats.powerUse + "/" + stats.powerCap, 470, 20, 16, pw ? "#FF9C8A" : "#FFE680", "left"); txt("💧 " + stats.waterUse + "/" + stats.waterCap, 470, 43, 16, wt ? "#FF9C8A" : "#9FD8FF", "left");
    txt("İş: " + stats.jobs + " · İşsiz %" + Math.round(stats.unemp * 100), 600, 20, 14, stats.unemp > .3 ? "#FF9C8A" : "#fff", "left");
    // talep çubukları
    [["K", stats.demR, "#5DD06A", "Konut"], ["T", stats.demC, "#4DA3FF", "Ticaret"], ["S", stats.demI, "#FFB020", "Sanayi"]].forEach(([l, v, col, nmx], i) => { const bx = 612 + i * 34, by = 46; ctx.fillStyle = "rgba(255,255,255,.15)"; ctx.fillRect(bx, by - 14, 10, 28); ctx.fillStyle = col; const hgt = Math.abs(v) * 14; ctx.fillRect(bx, v > 0 ? by - hgt : by, 10, hgt); txt(l, bx + 20, by, 11, col); });
    const yr = 2026 + Math.floor(S.month / 12), mo = ["Oca", "Şub", "Mar", "Nis", "May", "Haz", "Tem", "Ağu", "Eyl", "Eki", "Kas", "Ara"][S.month % 12]; txt("📅 " + mo + " " + yr, W - 20, 20, 16, "#fff", "right");
    const mk = monthT / 6; ctx.fillStyle = "rgba(255,255,255,.2)"; ctx.fillRect(W - 120, 38, 100, 6); ctx.fillStyle = "#FFD23F"; ctx.fillRect(W - 120, 38, 100 * mk, 6);
  }

  /* ---------- güncelleme ---------- */
  let state = "title", monthT = 0;
  function update(dt) {
    clock += dt;
    for (const p of parts) { p.life -= dt; p.gx += (p.vx || 0) * dt; p.gy += (p.vy || 0) * dt; p.z += (p.vz || 0) * dt; if (!p.smoke) p.vz -= 150 * dt; else p.s += dt * 3; } parts = parts.filter((p) => p.life > 0 && p.z >= 0);
    for (const f of floaters) f.t += dt; floaters = floaters.filter((f) => f.t < (f.life || 1.4));
    for (const p of floatersConf) { p.life -= dt; p.x += p.vx * dt; p.y += p.vy * dt; p.r += dt * 4; } floatersConf = floatersConf.filter((p) => p.life > 0);
    for (const b of built) b.t += dt; built = built.filter((b) => b.t < .4);
    if (state !== "play" || !S) return;
    nightK = Math.max(0, Math.sin((S.month % 12 + monthT / 6) / 12 * Math.PI * 4 - .5)) * .9; // gün döngüsü
    nightK = (Math.sin(clock / 40 * Math.PI * 2) + 1) / 2 > .78 ? Math.min(1, ((Math.sin(clock / 40 * Math.PI * 2) + 1) / 2 - .78) * 6) : 0;
    if (speed > 0) { monthT += dt * speed; if (monthT >= 6) { monthT = 0; monthTick(); if (selected) showInfo(); } }
    // yangınlar
    eachTile((t, x, y) => { if (t.fire > 0) { t.fire -= dt * Math.max(1, speed); if (t.fire <= 0) { S.g[y][x] = { t: "enkaz" }; S.burned++; toast("Bir bina yandı. Enkazı yıkıp yeniden kur."); recompute(); save(); } } });
    // arabalar
    const want = Math.min(40, Math.floor(S.pop / 12) + 2);
    if (cars.length < want && Math.random() < dt * 2) { const roads = []; eachTile((t, x, y) => { if (t.t === "yol") roads.push([x, y]); }); if (roads.length > 2) { const [x, y] = roads[Math.floor(Math.random() * roads.length)]; cars.push({ x, y, px: x + .5, py: y + .5, tx: x, ty: y, k: 1, dx: 1, dy: 0, col: ["#E8463F", "#2E86DE", "#FFD23F", "#F4F4F4", "#3FA34D", "#8E5AC8"][Math.floor(Math.random() * 6)], sp: rnd(1.2, 2) }); } }
    for (const c of cars) {
      c.k += dt * c.sp * Math.max(1, speed * .7);
      if (c.k >= 1) { c.x = c.tx; c.y = c.ty; const opts = [[1, 0], [-1, 0], [0, 1], [0, -1]].filter(([dx, dy]) => { const t = T(c.x + dx, c.y + dy); return t && t.t === "yol"; }); if (!T(c.x, c.y) || T(c.x, c.y).t !== "yol" || !opts.length) { c.dead = 1; continue; } let ch = opts.filter(([dx, dy]) => !(dx === -c.dx && dy === -c.dy)); if (!ch.length) ch = opts; const [dx, dy] = ch[Math.floor(Math.random() * ch.length)]; c.dx = dx; c.dy = dy; c.tx = c.x + dx; c.ty = c.y + dy; c.k = 0; }
      const lane = .14; c.px = c.x + .5 + (c.tx - c.x) * c.k + (-c.dy) * lane; c.py = c.y + .5 + (c.ty - c.y) * c.k + (c.dx) * lane;
      c.drawKey = (c.k < .5 ? c.x : c.tx) + "," + (c.k < .5 ? c.y : c.ty);
    }
    cars = cars.filter((c) => !c.dead);
  }

  /* ---------- başlık ---------- */
  function drawLogo() {
    const c = $("logoCv"), x = c.getContext("2d"); x.clearRect(0, 0, 420, 200); const old = ctx; ctx = x;
    const tiles = [[0, 0, { t: "ev", lv: 3 }], [1, 0, { t: "ev", lv: 2 }], [0, 1, { t: "park" }], [1, 1, { t: "yol" }], [2, 0, { t: "dukkan" }], [2, 1, { t: "ev", lv: 1, fill: 1 }], [0, 2, { t: "agac" }], [1, 2, { t: "santral" }], [2, 2, { t: "su" }]];
    x.save(); x.translate(210, 70); x.scale(1.2, 1.2);
    for (let s = 0; s < 5; s++) for (const [gx, gy, t] of tiles) if (gx + gy === s) { const p = iso(gx, gy); drawTileAt(x, Object.assign({ road: 1, pow: 1, wat: 1 }, t), p.x, p.y, gx, gy); }
    x.restore(); ctx = old;
  }
  function begin(fresh) {
    S = fresh ? freshCity() : load(); if (!S) S = freshCity();
    state = "play"; $("title").hidden = true; cars = []; { let sx = 0, sy = 0, n = 0; eachTile((t, x, y) => { if (t.t === "yol" || isBld(t.t)) { sx += x; sy += y; n++; } }); if (n) { const p = iso(sx / n + .5, sy / n + .5); cam.x = p.x; cam.y = p.y - N * TH / 2 + 140; cam.z = 1; } } recompute(); stadCache = 0; renderTools(); setTool("bak"); renderMission(); clampCam();
    if (fresh) toast("Hoş geldin Başkan Enes! Önce yola bitişik evler kur.", 6000);
  }
  $("newCity").onclick = () => { audio(); if (load() && !confirm("Kayıtlı şehir silinip yenisi kurulsun mu?")) return; begin(true); save(); };
  $("cont").onclick = () => { audio(); begin(false); };
  $("menuBtn").onclick = () => { save(); state = "title"; $("title").hidden = false; $("cont").hidden = !load(); drawLogo(); };
  const muteBtn = $("mute");
  function setMute(m) { muted = m; muteBtn.setAttribute("aria-pressed", m ? "true" : "false"); muteBtn.setAttribute("aria-label", m ? "Sesi aç" : "Sesi kapat"); if (master) master.gain.value = m ? 0 : 1; try { localStorage.setItem(SAVE + ":mute", m ? "1" : "0"); } catch (e) {} }
  setMute(muted); muteBtn.onclick = () => { audio(); setMute(!muted); };
  addEventListener("pagehide", save);

  /* ---------- ölçek ve döngü ---------- */
  const stage = $("stage"), screen = $("screen");
  function fit() { const w = screen.clientWidth, h = screen.clientHeight; if (!w || !h) return; let sw = w, sh = w * H / W; if (sh > h) { sh = h; sw = h * W / H; } stage.style.width = Math.floor(sw) + "px"; stage.style.height = Math.floor(sh) + "px"; stage.style.setProperty("--fs", clamp(sw / 56, 11, 17).toFixed(1) + "px"); }
  addEventListener("resize", fit); if (window.ResizeObserver) new ResizeObserver(fit).observe(screen); fit();
  let last = performance.now();
  function frame(t) { const dt = Math.min(.05, (t - last) / 1000); last = t; update(dt); draw(); requestAnimationFrame(frame); }
  requestAnimationFrame(frame);
  drawLogo(); $("cont").hidden = !load();

  window.__ms = { get S() { return S; }, set S(v) { S = v; }, stats: () => stats, monthTick, act, setTool, recompute, update, get cars() { return cars; }, cam, toGrid, toScreen, begin, B, happyAt, GOALS };
})();
