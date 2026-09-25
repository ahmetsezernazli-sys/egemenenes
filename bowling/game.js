(() => {
  "use strict";
  const $ = id => document.getElementById(id);

  /* ---------- pist ölçüleri (mantıksal birim) ---------- */
  const W = 360, H = 760;
  const LANE_L = 60, LANE_R = 300, FOUL = 690, PIN_Y = 150;
  const BR = 15, PR = 9;                       // top ve labut yarıçapı
  const SLOTS = [
    {av:"🚀", bg:"#3D8BFD"}, {av:"🎈", bg:"#FF7A2F"}, {av:"🦋", bg:"#9B5DE5"},
    {av:"🐢", bg:"#2EB872"}, {av:"🦊", bg:"#E5484D"}, {av:"🐧", bg:"#1CC7B1"}
  ];
  const DEF = [{n:"Enes", b:false, s:false}, {n:"Egemen", b:true, s:true}, {n:"Anne", b:false, s:false}, {n:"Baba", b:false, s:false}, {n:"", b:false, s:false}, {n:"", b:false, s:false}];
  // labut düzeni: 1 ön, sonra 2, 3, 4
  const PINS = [];
  (() => {
    const gap = 26, cx = (LANE_L + LANE_R) / 2;
    for (let row = 0; row < 4; row++)
      for (let k = 0; k <= row; k++)
        PINS.push({x: cx + (k - row / 2) * gap, y: PIN_Y - row * gap * .87});
  })();

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
  const sRoll = () => tone(90, 70, "sawtooth", .8, .06);
  const sPin = () => tone(600 + Math.random() * 500, 300, "triangle", .12, .08);
  const sTick = () => tone(600, 620, "square", .04, .04);
  const sGutter = () => tone(200, 90, "sine", .5, .08);
  const sStrike = () => [523, 659, 784, 1047, 1319].forEach((f, k) => tone(f, f, "triangle", .2, .14, k * .09));

  const canSpeak = "speechSynthesis" in window;
  let trVoice = null;
  function pickVoice(){ trVoice = speechSynthesis.getVoices().find(v => /^tr(-|_|$)/i.test(v.lang)) || null; }
  if (canSpeak){ pickVoice(); if (speechSynthesis.addEventListener) speechSynthesis.addEventListener("voiceschanged", pickVoice); }
  function say(text){
    if (!canSpeak || !soundOn || !trVoice) return;
    speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text); u.voice = trVoice; u.lang = trVoice.lang; u.rate = .97; u.pitch = 1.1;
    speechSynthesis.speak(u);
  }
  function renderSound(){
    $("ic-on").hidden = !soundOn; $("ic-off").hidden = soundOn;
    $("sound").setAttribute("aria-label", soundOn ? "Sesi kapat" : "Sesi aç");
    $("sound").setAttribute("aria-pressed", String(soundOn));
  }
  $("sound").addEventListener("click", () => { soundOn = !soundOn; if (!soundOn && canSpeak) speechSynthesis.cancel(); renderSound(); });
  renderSound();

  /* ---------- puanlama (klasik bowling) ---------- */
  function frameScores(rolls){
    const out = []; let i = 0, total = 0;
    for (let f = 0; f < 10; f++){
      if (rolls[i] === undefined){ out.push(null); continue; }
      let s;
      if (rolls[i] === 10){                                   // strike
        if (rolls[i+1] === undefined || rolls[i+2] === undefined){ out.push(null); i += 1; continue; }
        s = 10 + rolls[i+1] + rolls[i+2]; i += 1;
      } else if (rolls[i+1] === undefined){ out.push(null); continue; }
      else if (rolls[i] + rolls[i+1] === 10){                 // spare
        if (rolls[i+2] === undefined){ out.push(null); i += 2; continue; }
        s = 10 + rolls[i+2]; i += 2;
      } else { s = rolls[i] + rolls[i+1]; i += 2; }
      total += s; out.push(total);
    }
    return out;
  }
  function marks(rolls){                                      // her çerçevenin işaretleri
    const out = []; let i = 0;
    for (let f = 0; f < 10; f++){
      const m = [];
      if (f < 9){
        if (rolls[i] === undefined){ out.push(m); continue; }
        if (rolls[i] === 10){ m.push("X"); i += 1; }
        else {
          m.push(rolls[i] === 0 ? "-" : String(rolls[i]));
          if (rolls[i+1] !== undefined) m.push(rolls[i] + rolls[i+1] === 10 ? "/" : rolls[i+1] === 0 ? "-" : String(rolls[i+1]));
          i += 2;
        }
      } else {
        for (let k = 0; k < 3; k++){
          const r = rolls[i + k];
          if (r === undefined) break;
          const prev = rolls[i + k - 1];
          if (r === 10) m.push("X");
          else if (k > 0 && prev !== 10 && prev + r === 10) m.push("/");
          else m.push(r === 0 ? "-" : String(r));
        }
      }
      out.push(m);
    }
    return out;
  }
  function frameOf(rolls){                                    // kaçıncı çerçeve, kaçıncı atış
    let i = 0;
    for (let f = 0; f < 9; f++){
      if (rolls[i] === undefined) return [f, 0];
      if (rolls[i] === 10) i += 1;
      else { if (rolls[i+1] === undefined) return [f, 1]; i += 2; }
    }
    return [9, Math.min(rolls.length - i, 2)];
  }
  function done(rolls){                                       // oyuncu 10. çerçeveyi bitirdi mi
    let i = 0;
    for (let f = 0; f < 9; f++){
      if (rolls[i] === undefined) return false;
      i += rolls[i] === 10 ? 1 : (rolls[i+1] === undefined ? 99 : 2);
    }
    const t = rolls.slice(i);
    if (t.length < 2) return false;
    if (t[0] === 10 || t[0] + t[1] === 10) return t.length >= 3;
    return true;
  }

  /* ---------- durum ---------- */
  let G = null, timers = [];
  const later = (sec, fn) => timers.push({t: sec, fn});

  function newGame(cfg){
    timers = [];
    G = {cfg, players: cfg.players.map(p => ({...p, rolls: []})), cur: 0,
      phase: "aim", aim: 0, aimDir: 1, power: 0, powDir: 1, ball: null, pins: [], standing: null, shot: 0, msg: ""};
    ["setup", "end"].forEach(id => $(id).hidden = true);
    setupRack(true);
    hud();
  }

  function setupRack(all){
    G.pins = PINS.map((p, i) => ({...p, vx: 0, vy: 0, i, down: false}))
      .filter(p => all || !G.standing || G.standing.includes(p.i));
    G.ball = null;
    G.phase = "aim"; G.aim = 0; G.aimDir = 1; G.power = 0;
    $("throw").hidden = false;
    $("throw").textContent = "Nişan al";
  }

  const P = () => G.players[G.cur];
  const speedOf = () => (P().slow ? .55 : 1);

  function press(){
    if (!G) return;
    audio();
    if (G.phase === "aim"){ G.phase = "power"; G.power = 0; G.powDir = 1; $("throw").textContent = "Gücü ayarla"; sTick(); return; }
    if (G.phase === "power"){ roll(); return; }
  }
  $("throw").addEventListener("click", press);
  document.addEventListener("keydown", e => {
    if (!G || e.target.closest("input")) return;
    if (e.key === " " || e.key === "Enter"){ e.preventDefault(); press(); }
  });

  function roll(){
    const pw = .35 + G.power * .65;                 // 0.35 - 1.0
    const ang = G.aim * .17;                        // en fazla ~17°
    G.ball = {x: (LANE_L + LANE_R) / 2, y: FOUL, vx: Math.sin(ang) * 520 * pw, vy: -Math.cos(ang) * 520 * pw, gutter: false};
    G.phase = "roll";
    G.settle = 0;
    $("throw").hidden = true;
    sRoll();
  }

  /* ---------- fizik ---------- */
  function update(dt){
    for (const tm of timers) tm.t -= dt;
    const due = timers.filter(tm => tm.t <= 0); timers = timers.filter(tm => tm.t > 0); due.forEach(tm => tm.fn());

    if (G.phase === "aim"){
      G.aim += G.aimDir * dt * 1.35 * speedOf();
      if (G.aim > 1){ G.aim = 1; G.aimDir = -1; } if (G.aim < -1){ G.aim = -1; G.aimDir = 1; }
      return;
    }
    if (G.phase === "power"){
      G.power += G.powDir * dt * 1.15 * speedOf();
      if (G.power > 1){ G.power = 1; G.powDir = -1; } if (G.power < 0){ G.power = 0; G.powDir = 1; }
      return;
    }
    if (G.phase !== "roll") return;

    const steps = 4, h = dt / steps;
    for (let s = 0; s < steps; s++) physics(h);

    const b = G.ball;
    const moving = (b && b.y > -40 && Math.hypot(b.vx, b.vy) > 30) || G.pins.some(p => Math.hypot(p.vx, p.vy) > 20);
    if (!moving){
      G.settle += dt;
      if (G.settle > .7) finishShot();
    } else G.settle = 0;
  }

  function physics(h){
    const b = G.ball;
    if (b){
      b.x += b.vx * h; b.y += b.vy * h;
      b.vx *= 1 - .25 * h; b.vy *= 1 - .25 * h;
      if (b.x - BR < LANE_L || b.x + BR > LANE_R){
        if (P().bumper && !b.gutter){
          b.x = b.x - BR < LANE_L ? LANE_L + BR : LANE_R - BR;
          b.vx = -b.vx * .8;
          sTick();
        } else if (!b.gutter){
          b.gutter = true;
          b.vx = 0;
          b.x = b.x < W / 2 ? LANE_L - 14 : LANE_R + 14;
          sGutter();
        }
      }
      if (!b.gutter) for (const p of G.pins){
        if (p.down) continue;
        const dx = p.x - b.x, dy = p.y - b.y, d = Math.hypot(dx, dy);
        if (d > BR + PR || d === 0) continue;
        const nx = dx / d, ny = dy / d, rel = b.vx * nx + b.vy * ny;
        if (rel <= 0) continue;
        p.vx += nx * rel * 1.35; p.vy += ny * rel * 1.35;
        b.vx -= nx * rel * .22; b.vy -= ny * rel * .22;
        p.x = b.x + nx * (BR + PR); p.y = b.y + ny * (BR + PR);
        knock(p);
      }
    }
    // labut - labut
    for (let i = 0; i < G.pins.length; i++) for (let j = i + 1; j < G.pins.length; j++){
      const a = G.pins[i], c = G.pins[j];
      if (a.down && c.down) continue;
      const dx = c.x - a.x, dy = c.y - a.y, d = Math.hypot(dx, dy);
      if (d > PR * 2 || d === 0) continue;
      const nx = dx / d, ny = dy / d, rel = (a.vx - c.vx) * nx + (a.vy - c.vy) * ny;
      const push = (PR * 2 - d) / 2;
      a.x -= nx * push; a.y -= ny * push; c.x += nx * push; c.y += ny * push;
      if (rel <= 0) continue;
      a.vx -= nx * rel * .8; a.vy -= ny * rel * .8;
      c.vx += nx * rel * .8; c.vy += ny * rel * .8;
      if (Math.abs(rel) > 25){ knock(a); knock(c); }
    }
    for (const p of G.pins){
      p.x += p.vx * h; p.y += p.vy * h;
      p.vx *= 1 - 1.6 * h; p.vy *= 1 - 1.6 * h;
      if (Math.hypot(p.vx, p.vy) < 12){ p.vx = 0; p.vy = 0; }
    }
  }
  function knock(p){
    if (p.down) return;
    p.down = true;
    p.spin = (Math.random() - .5) * 3;
    sPin();
  }

  /* ---------- atış sonucu ---------- */
  function finishShot(){
    G.phase = "count";
    const pl = P();
    const before = G.pins.length;                 // bu atışta dikilen labut sayısı
    const downNow = G.pins.filter(p => p.down).length;
    const left = G.pins.filter(p => !p.down);
    pl.rolls.push(downNow);
    const [fr, shot] = frameOf(pl.rolls.slice(0, -1));
    const tenth = fr === 9;
    let msg = "";
    if (downNow === before && before === 10) msg = "STRIKE!";
    else if (downNow === before) msg = "SPARE!";
    else if (downNow === 0) msg = G.ball && G.ball.gutter ? "Oluk!" : "Boş...";
    else msg = `${downNow} labut`;
    if (msg === "STRIKE!" || msg === "SPARE!") sStrike();
    toast(msg);
    say(msg === "STRIKE!" ? "Strike!" : msg === "SPARE!" ? "Spare!" : msg === "Oluk!" ? "Oluğa gitti" : `${downNow} labut`);
    hud();

    later(1.4, () => {
      if (done(pl.rolls)){ nextPlayer(true); return; }
      const [nf, ns] = frameOf(pl.rolls);
      if (nf !== fr || (tenth && downNow === before)){      // çerçeve bitti ya da 10.'da yeni dizi
        if (nf === fr && tenth){ G.standing = null; setupRack(true); hud(); return; }   // 10. çerçevede yenilensin
        nextPlayer(false); return;
      }
      // aynı çerçevede ikinci atış: devrilenler kalksın, dikilenler kalsın
      G.standing = left.map(p => p.i);
      G.pins = G.pins.filter(p => !p.down);
      G.ball = null;
      G.phase = "aim"; G.aim = 0; G.power = 0;
      $("throw").hidden = false; $("throw").textContent = "Nişan al";
      hud();
    });
  }
  function nextPlayer(){
    const n = G.players.length;
    let k = G.cur, found = -1;
    for (let i = 1; i <= n; i++){
      const j = (k + i) % n;
      if (!done(G.players[j].rolls)){ found = j; break; }
    }
    if (found < 0){ gameOver(); return; }
    G.cur = found;
    G.standing = null;
    setupRack(true);
    hud();
    const [f] = frameOf(P().rolls);
    toast(`${P().name} · ${f + 1}. çerçeve`);
    say(`Sıra ${P().name}'de`);
  }
  function gameOver(){
    G.phase = "over";
    $("throw").hidden = true;
    const totals = G.players.map(p => { const s = frameScores(p.rolls).filter(v => v !== null); return s.length ? s[s.length - 1] : 0; });
    const best = Math.max(...totals);
    const board = $("board"); board.innerHTML = "";
    G.players.forEach((p, i) => {
      const d = document.createElement("div");
      if (totals[i] === best) d.className = "win";
      d.innerHTML = `<span></span><b>${totals[i]}</b>`;
      d.querySelector("span").textContent = `${p.av} ${p.name}`;
      board.appendChild(d);
    });
    const winners = G.players.filter((_, i) => totals[i] === best);
    $("end-title").textContent = winners.length > 1 ? "Berabere!" : `${winners[0].name} kazandı!`;
    sStrike();
    say(winners.length > 1 ? "Berabere!" : `${winners[0].name} kazandı!`);
    later(.8, () => { $("end").hidden = false; $("again").focus(); });
  }

  /* ---------- arayüz ---------- */
  let toastT = 0;
  function toast(t){
    const el = $("toast");
    el.textContent = t; el.hidden = false;
    el.style.animation = "none"; void el.offsetWidth; el.style.animation = "";
    clearTimeout(toastT); toastT = setTimeout(() => el.hidden = true, 1300);
  }
  function hud(){
    const ul = $("players"); ul.innerHTML = "";
    G.players.forEach((p, i) => {
      const s = frameScores(p.rolls).filter(v => v !== null);
      const li = document.createElement("li");
      li.className = "pl" + (i === G.cur ? " on" : "");
      li.innerHTML = `<span class="av" style="background:${p.bg}">${p.av}</span><span class="nm"></span><b>${s.length ? s[s.length - 1] : 0}</b>`;
      li.querySelector(".nm").textContent = p.name;
      ul.appendChild(li);
    });
    const box = $("frames"); box.innerHTML = "";
    const pl = P(), sc = frameScores(pl.rolls), mk = marks(pl.rolls), [cf] = frameOf(pl.rolls);
    for (let f = 0; f < 10; f++){
      const d = document.createElement("div");
      d.className = "fr" + (f === cf && G.phase !== "over" ? " on" : "");
      d.innerHTML = `<div class="no">${f + 1}</div><div class="rolls">${mk[f].map(m => m === "X" || m === "/" ? `<i>${m}</i>` : m).join("")}</div><div class="tot">${sc[f] === null ? "" : sc[f]}</div>`;
      box.appendChild(d);
    }
  }

  /* ---------- çizim ---------- */
  const cv = $("cv"), stage = $("stage"), ctx = cv.getContext("2d");
  let view = {s: 1, ox: 0, oy: 0, dpr: 1};
  function resize(){
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const cw = stage.clientWidth, ch = stage.clientHeight;
    cv.width = Math.round(cw * dpr); cv.height = Math.round(ch * dpr);
    const s = Math.min(cw / W, ch / H);
    view = {s, ox: (cw - W * s) / 2, oy: (ch - H * s) / 2, dpr};
  }
  function pin(x, y, down, spin){
    ctx.save();
    ctx.translate(x, y);
    if (down){ ctx.rotate(spin || .6); ctx.globalAlpha = .5; }
    ctx.fillStyle = "#F7FAFF";
    ctx.beginPath(); ctx.ellipse(0, 0, PR, PR * 1.25, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "#E5484D";
    ctx.fillRect(-PR * .75, -PR * .35, PR * 1.5, 2.6);
    ctx.fillStyle = "#D7DEE8";
    ctx.beginPath(); ctx.ellipse(PR * .35, PR * .2, PR * .35, PR * .8, 0, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  }
  function draw(){
    const {s, ox, oy, dpr} = view;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.fillStyle = "#101725"; ctx.fillRect(0, 0, cv.width, cv.height);
    ctx.setTransform(dpr * s, 0, 0, dpr * s, dpr * ox, dpr * oy);
    // oluklar ve pist
    ctx.fillStyle = "#151D2E"; ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = "#0D1420"; ctx.fillRect(LANE_L - 22, 0, 22, H); ctx.fillRect(LANE_R, 0, 22, H);
    const g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, "#C08B43"); g.addColorStop(.5, "#D9A257"); g.addColorStop(1, "#E8B972");
    ctx.fillStyle = g; ctx.fillRect(LANE_L, 0, LANE_R - LANE_L, FOUL + 40);
    ctx.strokeStyle = "rgba(0,0,0,.08)"; ctx.lineWidth = 1;
    for (let x = LANE_L + 12; x < LANE_R; x += 12){ ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, FOUL + 40); ctx.stroke(); }
    ctx.fillStyle = "rgba(0,0,0,.25)";
    for (const d of [0, 1, 2, 3, 4, 5, 6]) ctx.fillRect(LANE_L + 24 + d * 32, 520, 3, 14);   // nişan okları
    ctx.fillStyle = "#8B2D31"; ctx.fillRect(LANE_L, FOUL + 40, LANE_R - LANE_L, 5);
    ctx.fillStyle = "#1E2A3E"; ctx.fillRect(LANE_L - 22, 0, (LANE_R - LANE_L) + 44, PIN_Y - 100);
    if (!G) return;
    // labutlar
    for (const p of G.pins) if (p.down) pin(p.x, p.y, true, p.spin);
    for (const p of G.pins) if (!p.down) pin(p.x, p.y, false);
    // nişan çizgisi / güç
    const pl = P();
    if (G.phase === "aim" || G.phase === "power"){
      const ang = G.aim * .17, len = 250;
      ctx.strokeStyle = "rgba(255,255,255,.75)"; ctx.lineWidth = 3; ctx.setLineDash([10, 8]);
      ctx.beginPath(); ctx.moveTo(W / 2, FOUL); ctx.lineTo(W / 2 + Math.sin(ang) * len, FOUL - Math.cos(ang) * len); ctx.stroke();
      ctx.setLineDash([]);
    }
    if (G.phase === "power"){
      const bw = 210, bx = (W - bw) / 2, by = FOUL - 92;
      ctx.fillStyle = "rgba(255,255,255,.2)"; ctx.fillRect(bx, by, bw, 18);
      const pg = ctx.createLinearGradient(bx, 0, bx + bw, 0);
      pg.addColorStop(0, "#22C55E"); pg.addColorStop(.6, "#FACC15"); pg.addColorStop(1, "#E5484D");
      ctx.fillStyle = pg; ctx.fillRect(bx, by, bw * G.power, 18);
      ctx.strokeStyle = "#fff"; ctx.lineWidth = 3; ctx.strokeRect(bx, by, bw, 18);
    }
    // top
    const bx = G.ball ? G.ball.x : W / 2, by = G.ball ? G.ball.y : FOUL;
    ctx.save();
    ctx.shadowColor = "rgba(0,0,0,.4)"; ctx.shadowBlur = 10; ctx.shadowOffsetY = 4;
    ctx.fillStyle = pl.bg;
    ctx.beginPath(); ctx.arc(bx, by, BR, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
    ctx.fillStyle = "rgba(255,255,255,.35)";
    ctx.beginPath(); ctx.arc(bx - 5, by - 5, 4.5, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "rgba(0,0,0,.35)";
    for (const d of [[-4, 4], [3, 6], [6, 1]]){ ctx.beginPath(); ctx.arc(bx + d[0], by + d[1], 2, 0, Math.PI * 2); ctx.fill(); }
  }

  /* ---------- kurulum ---------- */
  const form = $("setup-form");
  function buildRows(){
    const count = +form.count.value, box = $("rows");
    const old = [...box.querySelectorAll(".p-row")].map(r => ({
      n: r.querySelector("input[type=text]").value,
      b: r.querySelector(".b").checked, s: r.querySelector(".s").checked
    }));
    box.innerHTML = "";
    for (let i = 0; i < count; i++){
      const d = DEF[i], prev = old[i], row = document.createElement("div");
      row.className = "p-row";
      row.innerHTML = `<span class="av" style="background:${SLOTS[i].bg}">${SLOTS[i].av}</span>
        <input type="text" maxlength="12" aria-label="${i + 1}. oyuncunun adı" placeholder="Oyuncu ${i + 1}">
        <label class="toggle"><input type="checkbox" class="b"><span>🚧</span></label>
        <label class="toggle"><input type="checkbox" class="s"><span>🐢</span></label>`;
      row.querySelector("input[type=text]").value = prev ? prev.n : d.n;
      row.querySelector(".b").checked = prev ? prev.b : d.b;
      row.querySelector(".s").checked = prev ? prev.s : d.s;
      box.appendChild(row);
    }
  }
  form.addEventListener("change", e => { if (e.target.name === "count") buildRows(); });
  form.addEventListener("submit", e => {
    e.preventDefault();
    audio();
    const rows = [...$("rows").querySelectorAll(".p-row")];
    const players = rows.map((r, i) => ({
      name: r.querySelector("input[type=text]").value.trim() || `Oyuncu ${i + 1}`,
      av: SLOTS[i].av, bg: SLOTS[i].bg,
      bumper: r.querySelector(".b").checked, slow: r.querySelector(".s").checked
    }));
    newGame({players});
  });
  $("open-setup").addEventListener("click", () => { timers = []; if (G) G.phase = "idle"; $("end").hidden = true; $("setup").hidden = false; });
  $("end-setup").addEventListener("click", () => { $("end").hidden = true; $("setup").hidden = false; });
  $("again").addEventListener("click", () => { audio(); newGame(G.cfg); });

  /* ---------- döngü ---------- */
  let last = performance.now();
  function frame(now){
    const dt = Math.min(.04, (now - last) / 1000); last = now;
    if (G) update(dt);
    draw();
    requestAnimationFrame(frame);
  }
  document.addEventListener("visibilitychange", () => { last = performance.now(); if (document.hidden && canSpeak) speechSynthesis.cancel(); });
  if ("ResizeObserver" in window) new ResizeObserver(resize).observe(stage); else window.addEventListener("resize", resize);
  resize();
  buildRows();
  requestAnimationFrame(frame);
})();
