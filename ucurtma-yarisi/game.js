(() => {
  "use strict";
  const $ = id => document.getElementById(id);

  /* ---------- ölçüler ---------- */
  const W = 720, H = 440;
  const LEN = 8600;                      // yarışın uzunluğu
  const SPEED = 210;                     // temel ilerleme hızı
  const TOP = 46, BOT = H - 40;          // uçurtmanın uçabileceği şerit
  const COL = ["#38BDF8", "#FF7A8A"];
  const COL2 = ["#0E7FB8", "#C94459"];
  const SAVE_KEY = "ucurtma-yarisi";

  let save = {coop: 0};
  try { save = Object.assign(save, JSON.parse(localStorage.getItem(SAVE_KEY)) || {}); } catch (e) {}
  const store = () => { try { localStorage.setItem(SAVE_KEY, JSON.stringify(save)); } catch (e) {} };

  /* ---------- ses ---------- */
  let soundOn = true, ac = null;
  function audio(){
    if (!ac){ try { ac = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { ac = null; } }
    if (ac && ac.state === "suspended") ac.resume();
    return ac;
  }
  function tone(f1, f2, type, dur, vol, delay){
    if (!soundOn) return;
    const a = audio(); if (!a) return;
    const t = a.currentTime + (delay || 0), o = a.createOscillator(), g = a.createGain();
    o.type = type; o.frequency.setValueAtTime(f1, t); o.frequency.exponentialRampToValueAtTime(Math.max(20, f2), t + dur * .9);
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + .01); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(a.destination); o.start(t); o.stop(t + dur + .05);
  }
  const sRing = n => tone(680 + (n % 8) * 60, 1020 + (n % 8) * 60, "triangle", .16, .16);
  const sBird = () => { tone(300, 120, "sawtooth", .3, .1); tone(900, 500, "square", .1, .05); };
  const sGust = () => tone(220, 420, "sine", .35, .05);
  const sGo = hi => tone(hi ? 880 : 620, hi ? 880 : 620, "square", .14, .1);
  const sWin = () => [523, 659, 784, 1047, 1319].forEach((f, k) => tone(f, f, "triangle", .22, .14, k * .1));
  function renderSound(){
    $("ic-on").hidden = !soundOn; $("ic-off").hidden = soundOn;
    $("sound").setAttribute("aria-label", soundOn ? "Sesi kapat" : "Sesi aç");
    $("sound").setAttribute("aria-pressed", String(soundOn));
  }
  $("sound").addEventListener("click", () => { soundOn = !soundOn; renderSound(); });
  renderSound();

  /* ---------- parkur ---------- */
  function buildCourse(){
    const rings = [], birds = [], gusts = [], clouds = [];
    let x = 700;
    while (x < LEN - 500){
      const pattern = Math.random();
      const base = 120 + Math.random() * 200;
      if (pattern < .35){                           // dalga dizisi
        const n = 5 + (Math.random() * 4 | 0), amp = 60 + Math.random() * 50, ph = Math.random() * 6;
        for (let k = 0; k < n; k++) rings.push({x: x + k * 92, y: base + Math.sin(ph + k * .8) * amp, t: [false, false]});
        x += n * 92 + 220;
      } else if (pattern < .62){                    // merdiven
        const n = 4 + (Math.random() * 3 | 0), dir = Math.random() < .5 ? 1 : -1;
        for (let k = 0; k < n; k++) rings.push({x: x + k * 100, y: base + dir * k * 42, t: [false, false]});
        x += n * 100 + 240;
      } else {                                      // yay
        const n = 6, r = 90 + Math.random() * 40;
        for (let k = 0; k < n; k++){ const a = -Math.PI * .5 + k * Math.PI / (n - 1) * .9; rings.push({x: x + k * 86, y: base + r - Math.cos(a) * r, t: [false, false]}); }
        x += n * 86 + 230;
      }
      if (Math.random() < .8) birds.push({x: x - 150 + Math.random() * 120, y: 90 + Math.random() * 240, ph: Math.random() * 6, dy: (Math.random() - .5) * 26});
      if (Math.random() < .45) gusts.push({x: x - 60, w: 220 + Math.random() * 160, dir: Math.random() < .5 ? -1 : 1});
    }
    for (const r of rings) r.y = Math.max(TOP + 36, Math.min(BOT - 36, r.y));
    for (let i = 0; i < 90; i++) clouds.push({x: Math.random() * LEN, y: 30 + Math.random() * 300, s: .5 + Math.random() * 1.2, d: .3 + Math.random() * .5});
    return {rings, birds, gusts, clouds};
  }

  /* ---------- durum ---------- */
  let G = null, timers = [];
  const later = (sec, fn) => timers.push({t: sec, fn});

  function newRace(cfg){
    timers = [];
    const course = buildCourse();
    G = {cfg, ...course, cam: 0, t: 0, phase: "count", bits: [],
      players: cfg.players.map((p, i) => ({
        ...p, i, x: 0, y: 150 + i * 120, vy: 0, sx: 180 + i * 56, rings: 0, slow: 0, up: false, dn: false,
        tail: Array.from({length: 14}, () => ({x: 0, y: 150 + i * 120})), done: false
      }))};
    ["setup", "end"].forEach(id => $(id).hidden = true);
    buildPads();
    renderScore();
    let n = 3;
    toast(String(n)); sGo(false);
    const step = () => {
      n--;
      if (n > 0){ toast(String(n)); sGo(false); later(.7, step); }
      else { toast("UÇUŞ!"); sGo(true); G.phase = "fly"; }
    };
    later(.7, step);
  }

  /* ---------- güncelleme ---------- */
  function update(dt){
    if (!G) return;
    G.t += dt;
    for (const tm of timers) tm.t -= dt;
    const due = timers.filter(tm => tm.t <= 0); timers = timers.filter(tm => tm.t > 0); due.forEach(tm => tm.fn());
    for (const b of G.bits){ b.x += b.vx * dt; b.y += b.vy * dt; b.vy += 240 * dt; b.life -= dt; }
    G.bits = G.bits.filter(b => b.life > 0);
    for (const bird of G.birds){ bird.y += bird.dy * dt; if (bird.y < 70 || bird.y > BOT - 30) bird.dy *= -1; }
    if (G.phase !== "fly") return;

    const lead = Math.max(...G.players.map(p => p.x));
    for (const p of G.players){
      if (p.done) continue;
      const help = p.help;                       // 0,1,2
      // dikey hareket
      const lift = 560 + help * 60;
      if (p.up) p.vy -= lift * dt;
      else if (p.dn && p.ctl === "two") p.vy += lift * .9 * dt;
      else p.vy += (p.ctl === "one" ? 300 : 120) * dt;        // tek tuşta bırakınca alçalır
      // rüzgâr
      for (const g of G.gusts){
        if (p.x > g.x && p.x < g.x + g.w){
          p.vy += g.dir * 300 * dt * (1 - help * .18);
          if (!p.inGust){ p.inGust = true; sGust(); }
        }
      }
      if (!G.gusts.some(g => p.x > g.x && p.x < g.x + g.w)) p.inGust = false;
      if (help) p.vy *= 1 - (help === 1 ? .55 : 1.1) * dt;    // yardım: sakinleştirir
      p.vy = Math.max(-330, Math.min(330, p.vy));
      p.y += p.vy * dt;
      if (p.y < TOP){ p.y = TOP; p.vy = Math.max(0, p.vy); }
      if (p.y > BOT){ p.y = BOT; p.vy = Math.min(0, p.vy); }
      // ilerleme (lastikli yarış: geride kalan biraz hızlanır)
      p.slow = Math.max(0, p.slow - dt);
      const behind = Math.max(0, lead - p.x);
      const sp = SPEED * (p.slow > 0 ? .55 : 1) * (1 + Math.min(.35, behind / 900));
      p.x += sp * dt;
      // kuyruk
      let px = p.x, py = p.y;
      for (const seg of p.tail){
        const dx = px - seg.x - 18, dy = py - seg.y;
        seg.x += dx * Math.min(1, dt * 11); seg.y += dy * Math.min(1, dt * 11);
        px = seg.x; py = seg.y;
      }
      // halkalar
      const pull = 26 + (help === 1 ? 16 : help === 2 ? 34 : 0);
      for (const r of G.rings){
        if (r.t[p.i] || Math.abs(r.x - p.x) > 120) continue;
        if (Math.hypot(r.x - p.x, r.y - p.y) < pull){
          r.t[p.i] = true; p.rings++;
          sRing(p.rings);
          burst(r.x, r.y, "#FFD166", 10);
          renderScore();
        }
      }
      // kuşlar
      for (const b of G.birds){
        if (Math.abs(b.x - p.x) > 60 || p.slow > 0) continue;
        if (Math.hypot(b.x - p.x, b.y - p.y) < 34){
          p.slow = 1.2; p.vy += 120;
          sBird(); burst(p.x, p.y, "#FFFFFF", 12);
        }
      }
      if (p.x >= LEN){ p.x = LEN; p.done = true; p.time = G.t; }
    }
    const aim = (G.players[0].x + G.players[1].x) / 2 - view.vw * .34;
    G.cam += (aim - G.cam) * Math.min(1, dt * 4);
    if (G.players.every(p => p.done)) finish();
  }
  function burst(x, y, c, n){
    for (let i = 0; i < n; i++){
      const a = Math.random() * Math.PI * 2, s = 40 + Math.random() * 150;
      G.bits.push({x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s - 60, life: .5 + Math.random() * .4, c});
    }
  }
  function finish(){
    G.phase = "over";
    sWin();
    const [a, b] = G.players, total = a.rings + b.rings;
    const box = $("results"); box.innerHTML = "";
    const coop = G.cfg.mode === "coop";
    if (coop){
      const rec = total > (save.coop || 0);
      if (rec){ save.coop = total; store(); }
      const d = document.createElement("div"); d.className = "win";
      d.innerHTML = `<span>🤝 Birlikte</span><b>${total} halka</b>`; box.appendChild(d);
      G.players.forEach(p => {
        const e = document.createElement("div");
        e.innerHTML = `<span></span><b>${p.rings}</b>`; e.querySelector("span").textContent = p.name; box.appendChild(e);
      });
      $("end-title").textContent = rec ? "Yeni rekor!" : "Uçuş bitti!";
      $("end-note").textContent = `Rekorunuz: ${save.coop} halka · toplam ${G.rings.length * 2} halka vardı`;
    } else {
      const best = Math.max(a.rings, b.rings);
      G.players.forEach(p => {
        const d = document.createElement("div");
        if (p.rings === best) d.className = "win";
        d.innerHTML = `<span></span><b>${p.rings} halka</b>`; d.querySelector("span").textContent = p.name; box.appendChild(d);
      });
      const wins = G.players.filter(p => p.rings === best);
      $("end-title").textContent = wins.length > 1 ? "Berabere!" : `${wins[0].name} kazandı!`;
      $("end-note").textContent = `Gökyüzünde ${G.rings.length} halka vardı.`;
    }
    later(.9, () => { $("end").hidden = false; $("again").focus(); });
  }

  /* ---------- arayüz ---------- */
  let toastT = 0;
  function toast(t){
    const el = $("toast");
    el.textContent = t; el.hidden = false;
    el.style.animation = "none"; void el.offsetWidth; el.style.animation = "";
    clearTimeout(toastT); toastT = setTimeout(() => el.hidden = true, 1100);
  }
  function renderScore(){
    const box = $("score"); box.innerHTML = "";
    const coop = G.cfg.mode === "coop";
    if (coop){
      const d = document.createElement("div"); d.className = "sc coop";
      d.innerHTML = `<span class="ring">🟡</span><b>${G.players[0].rings + G.players[1].rings}</b><span class="ring">· rekor ${save.coop || 0}</span>`;
      box.appendChild(d);
    }
    const best = Math.max(...G.players.map(p => p.rings));
    G.players.forEach((p, i) => {
      const d = document.createElement("div");
      d.className = `sc p${i}` + (!coop && p.rings === best && p.rings > 0 ? " lead" : "");
      d.innerHTML = `<span class="nm"></span><b>${p.rings}</b>`;
      d.querySelector(".nm").textContent = p.name;
      box.appendChild(d);
    });
  }
  function keyBtn(cls, label, aria, set){
    const b = document.createElement("button");
    b.type = "button"; b.className = "key " + cls; b.textContent = label; b.setAttribute("aria-label", aria);
    const on = e => { e.preventDefault(); audio(); b.classList.add("on"); set(true); };
    const off = () => { b.classList.remove("on"); set(false); };
    b.addEventListener("pointerdown", on);
    b.addEventListener("pointerup", off);
    b.addEventListener("pointercancel", off);
    b.addEventListener("pointerleave", off);
    return b;
  }
  function buildPads(){
    G.players.forEach((p, i) => {
      const pad = $("pad-" + i);
      pad.innerHTML = "";
      pad.className = "pad pad-" + i + (p.ctl === "one" ? " one" : "");
      if (p.ctl === "one"){
        pad.appendChild(keyBtn("wide", "⬆", `${p.name} yüksel`, v => p.up = v));
      } else {
        pad.appendChild(keyBtn("", "▲", `${p.name} yüksel`, v => p.up = v));
        pad.appendChild(keyBtn("", "▼", `${p.name} alçal`, v => p.dn = v));
      }
    });
  }
  const KEYS = {w: [0, "up"], s: [0, "dn"], arrowup: [1, "up"], arrowdown: [1, "dn"]};
  document.addEventListener("keydown", e => {
    if (!G || e.target.closest("input")) return;
    const m = KEYS[e.key.toLowerCase()];
    if (m){ e.preventDefault(); audio(); G.players[m[0]][m[1]] = true; }
  });
  document.addEventListener("keyup", e => {
    if (!G) return;
    const m = KEYS[e.key.toLowerCase()];
    if (m) G.players[m[0]][m[1]] = false;
  });

  /* ---------- çizim ---------- */
  const cv = $("cv"), stage = $("stage"), ctx = cv.getContext("2d");
  let view = {s: 1, ox: 0, oy: 0, dpr: 1};
  function resize(){
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const cw = stage.clientWidth, ch = stage.clientHeight;
    cv.width = Math.round(cw * dpr); cv.height = Math.round(ch * dpr);
    const s = Math.min(ch / H, cw / 360);       // dikeyi tam göster, dar ekranda en az 360 birim genişlik
    const vw = cw / s;                          // ekrana sığan dünya genişliği
    view = {s, vw, ox: 0, oy: (ch - H * s) / 2, dpr};
  }
  function kite(p){
    const x = p.x - G.cam, y = p.y;
    const tilt = Math.max(-.5, Math.min(.5, p.vy / 420));
    // ip ve kuyruk
    ctx.strokeStyle = "rgba(255,255,255,.35)"; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(x, y);
    for (const seg of p.tail) ctx.lineTo(seg.x - G.cam, seg.y);
    ctx.stroke();
    p.tail.forEach((seg, k) => {
      if (k % 3) return;
      ctx.fillStyle = k % 6 ? COL[p.i] : "#FFD166";
      ctx.save(); ctx.translate(seg.x - G.cam, seg.y); ctx.rotate(Math.sin(G.t * 6 + k) * .5);
      ctx.fillRect(-7, -3.5, 14, 7);
      ctx.restore();
    });
    ctx.save();
    ctx.translate(x, y); ctx.rotate(tilt);
    ctx.shadowColor = COL[p.i]; ctx.shadowBlur = p.slow > 0 ? 4 : 16;
    ctx.fillStyle = COL[p.i];
    ctx.beginPath(); ctx.moveTo(0, -26); ctx.lineTo(22, 0); ctx.lineTo(0, 30); ctx.lineTo(-22, 0); ctx.closePath(); ctx.fill();
    ctx.shadowBlur = 0;
    ctx.fillStyle = COL2[p.i];
    ctx.beginPath(); ctx.moveTo(0, -26); ctx.lineTo(22, 0); ctx.lineTo(0, 30); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = "rgba(255,255,255,.65)"; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(0, -26); ctx.lineTo(0, 30); ctx.moveTo(-22, 0); ctx.lineTo(22, 0); ctx.stroke();
    ctx.restore();
  }
  function draw(){
    const {s, ox, oy, dpr} = view;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.fillStyle = "#2B1B4D"; ctx.fillRect(0, 0, cv.width, cv.height);
    ctx.setTransform(dpr * s, 0, 0, dpr * s, dpr * ox, dpr * oy);
    const VW = view.vw, VH = H + Math.max(0, (oy / s) * 2);
    // gökyüzü
    const sky = ctx.createLinearGradient(0, -oy / s - 20, 0, H + oy / s + 20);
    sky.addColorStop(0, "#2B1B4D"); sky.addColorStop(.45, "#7A3B86"); sky.addColorStop(.75, "#E8705A"); sky.addColorStop(1, "#FFC478");
    ctx.fillStyle = sky; ctx.fillRect(-20, -VH, VW + 40, VH * 3);
    const cam = G ? G.cam : 0, t = G ? G.t : 0;
    // yıldızlar
    ctx.fillStyle = "rgba(255,255,255,.75)";
    for (let i = 0; i < 40; i++){
      const sxp = ((i * 173.7 - cam * .08) % (VW + 80) + VW + 80) % (VW + 80) - 40;
      const syp = (i * 37) % 150;
      const tw = .3 + .7 * Math.abs(Math.sin(t * 1.4 + i));
      ctx.globalAlpha = tw * (1 - syp / 190);
      ctx.fillRect(sxp, syp, 2.4, 2.4);
    }
    ctx.globalAlpha = 1;
    // güneş
    const sunX = ((-cam * .05) % (VW + 900) + VW + 900) % (VW + 900) - 200;
    const sg = ctx.createRadialGradient(sunX, 330, 10, sunX, 330, 150);
    sg.addColorStop(0, "rgba(255,236,170,.95)"); sg.addColorStop(1, "rgba(255,180,90,0)");
    ctx.fillStyle = sg; ctx.beginPath(); ctx.arc(sunX, 330, 150, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "#FFE6A3"; ctx.beginPath(); ctx.arc(sunX, 330, 46, 0, Math.PI * 2); ctx.fill();
    // uzak tepeler
    for (const [k, col, base] of [[.12, "#4B2A63", 352], [.22, "#3A2050", 388], [.34, "#2A1740", 418]]){
      ctx.fillStyle = col;
      ctx.beginPath(); ctx.moveTo(-40, H + VH);
      for (let x = -40; x <= VW + 40; x += 20){
        const w = (x + cam * k) * .006;
        ctx.lineTo(x, base + Math.sin(w) * 26 + Math.sin(w * 2.3) * 12);
      }
      ctx.lineTo(VW + 40, H + VH); ctx.closePath(); ctx.fill();
    }
    if (!G) return;
    // bulutlar
    for (const c of G.clouds){
      const x = c.x - cam * c.d;
      if (x < -200 || x > VW + 200) continue;
      ctx.globalAlpha = .18 + .2 * c.d;
      ctx.fillStyle = "#FFD9C0";
      const k = 26 * c.s;
      ctx.beginPath(); ctx.ellipse(x, c.y, k * 1.9, k * .62, 0, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.ellipse(x - k * .7, c.y + k * .22, k * 1.1, k * .46, 0, 0, Math.PI * 2); ctx.fill();
      ctx.globalAlpha = 1;
    }
    // rüzgâr bölgeleri
    for (const g of G.gusts){
      const x = g.x - cam;
      if (x > VW + 60 || x + g.w < -60) continue;
      ctx.globalAlpha = .4;
      ctx.strokeStyle = g.dir < 0 ? "#BFE9FF" : "#FFD1A8"; ctx.lineWidth = 3; ctx.lineCap = "round";
      for (let i = 0; i < 10; i++){
        const yy = TOP + 18 + i * 38 + Math.sin(t * 2 + i) * 6;
        const off = ((t * 170 + i * 61) % (g.w + 120)) - 60;
        ctx.beginPath();
        ctx.moveTo(x + off, yy);
        ctx.quadraticCurveTo(x + off + 34, yy + g.dir * 14, x + off + 68, yy + g.dir * 4);
        ctx.stroke();
      }
      ctx.globalAlpha = 1;
      ctx.fillStyle = g.dir < 0 ? "rgba(140,220,255,.07)" : "rgba(255,190,130,.07)";
      ctx.fillRect(x, TOP - 10, g.w, BOT - TOP + 40);
    }
    // halkalar
    for (const r of G.rings){
      const x = r.x - cam;
      if (x < -60 || x > VW + 60) continue;
      const both = r.t[0] && r.t[1];
      if (both) continue;
      const spin = Math.cos(t * 2.4 + r.x * .01);
      ctx.save(); ctx.translate(x, r.y);
      ctx.scale(Math.max(.22, Math.abs(spin)), 1);
      ctx.strokeStyle = "#FFD166"; ctx.lineWidth = 7;
      ctx.shadowColor = "rgba(255,209,102,.8)"; ctx.shadowBlur = 14;
      ctx.beginPath(); ctx.arc(0, 0, 24, 0, Math.PI * 2); ctx.stroke();
      ctx.shadowBlur = 0;
      ctx.strokeStyle = "rgba(255,255,255,.7)"; ctx.lineWidth = 2.5;
      ctx.beginPath(); ctx.arc(0, 0, 24, -2.2, -1.1); ctx.stroke();
      ctx.restore();
      // bir oyuncu almışsa onun renginde küçük iz kalsın
      if (r.t[0] || r.t[1]){
        ctx.fillStyle = r.t[0] ? COL[0] : COL[1];
        ctx.globalAlpha = .5;
        ctx.beginPath(); ctx.arc(x, r.y, 5, 0, Math.PI * 2); ctx.fill();
        ctx.globalAlpha = 1;
      }
    }
    // kuşlar
    for (const b of G.birds){
      const x = b.x - cam;
      if (x < -60 || x > VW + 60) continue;
      const f = Math.sin(t * 7 + b.ph) * 10;
      ctx.strokeStyle = "#2A1740"; ctx.lineWidth = 4; ctx.lineCap = "round";
      ctx.beginPath();
      ctx.moveTo(x - 20, b.y + f * .4);
      ctx.quadraticCurveTo(x - 9, b.y - f, x, b.y);
      ctx.quadraticCurveTo(x + 9, b.y - f, x + 20, b.y + f * .4);
      ctx.stroke();
      ctx.fillStyle = "#2A1740";
      ctx.beginPath(); ctx.ellipse(x, b.y + 2, 7, 5, 0, 0, Math.PI * 2); ctx.fill();
    }
    // bitiş kapısı
    const fx = LEN - cam;
    if (fx < VW + 120){
      ctx.fillStyle = "#FFD166";
      ctx.fillRect(fx - 4, TOP - 16, 8, BOT - TOP + 40);
      for (let i = 0; i < 9; i++){
        ctx.fillStyle = i % 2 ? "#FFFFFF" : "#FF7A8A";
        ctx.fillRect(fx + 6, TOP - 16 + i * ((BOT - TOP + 40) / 9), 26, (BOT - TOP + 40) / 9);
      }
      ctx.fillStyle = "#FFD166"; ctx.font = "800 22px Rubik, sans-serif"; ctx.textAlign = "center";
      ctx.fillText("BİTİŞ", fx + 46, TOP - 22);
    }
    // uçurtmalar
    for (const p of G.players) kite(p);
    // parçacıklar
    for (const b of G.bits){ ctx.globalAlpha = Math.max(0, b.life * 1.6); ctx.fillStyle = b.c; ctx.fillRect(b.x - cam - 3, b.y - 3, 6, 6); }
    ctx.globalAlpha = 1;
    // ilerleme şeridi
    const barW = VW - 110, barX = 55, barY = 18;
    ctx.fillStyle = "rgba(0,0,0,.28)"; ctx.beginPath(); ctx.roundRect(barX, barY, barW, 8, 4); ctx.fill();
    G.players.forEach(p => {
      ctx.fillStyle = COL[p.i];
      ctx.beginPath(); ctx.arc(barX + barW * Math.min(1, p.x / LEN), barY + 4, 7, 0, Math.PI * 2); ctx.fill();
    });
    ctx.fillStyle = "#FFD166"; ctx.beginPath(); ctx.arc(barX + barW, barY + 4, 4, 0, Math.PI * 2); ctx.fill();
  }

  /* ---------- kurulum ---------- */
  const form = $("setup-form");
  form.addEventListener("submit", e => {
    e.preventDefault();
    audio();
    const players = [0, 1].map(i => ({
      name: ($("pn-" + i).value.trim() || (i ? "Pembe" : "Mavi")),
      ctl: form["ctl" + i].value,
      help: +form["help" + i].value
    }));
    newRace({players, mode: form.mode.value});
  });
  $("open-setup").addEventListener("click", () => { timers = []; if (G) G.phase = "idle"; $("end").hidden = true; $("setup").hidden = false; });
  $("end-setup").addEventListener("click", () => { $("end").hidden = true; $("setup").hidden = false; });
  $("again").addEventListener("click", () => { audio(); newRace(G.cfg); });

  /* ---------- döngü ---------- */
  let last = performance.now();
  function frame(now){
    const dt = Math.min(.04, (now - last) / 1000); last = now;
    update(dt);
    draw();
    requestAnimationFrame(frame);
  }
  document.addEventListener("visibilitychange", () => { last = performance.now(); });
  if ("ResizeObserver" in window) new ResizeObserver(resize).observe(stage); else window.addEventListener("resize", resize);
  resize();
  $("pn-0").value = "Enes"; $("pn-1").value = "Egemen";
  requestAnimationFrame(frame);
})();
