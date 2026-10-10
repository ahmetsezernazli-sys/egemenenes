(() => {
  "use strict";
  const $ = id => document.getElementById(id);

  /* ---------- tahta ---------- */
  const S = 480, CX = 240, CY = 240, R = 188;          // R: dış ikili halkanın dış kenarı
  const ORDER = [20, 1, 18, 4, 13, 6, 10, 15, 2, 17, 3, 19, 7, 16, 8, 11, 14, 9, 12, 5];
  const RING = {bullIn: .055, bullOut: .12, trebleIn: .56, trebleOut: .63, doubleIn: .92};
  const ROUNDS = 5;
  const SAVE_KEY = "dart";
  const SLOTS = [
    {av:"🚀", bg:"#3D8BFD"}, {av:"🎈", bg:"#FF7A2F"}, {av:"🦋", bg:"#9B5DE5"},
    {av:"🐢", bg:"#2EB872"}, {av:"🦊", bg:"#E5484D"}, {av:"🐧", bg:"#1CC7B1"}
  ];
  const DEF = [{n:"Enes", cpu:false, help:false}, {n:"Egemen", cpu:false, help:true}, {n:"Anne", cpu:false, help:false}, {n:"Baba", cpu:false, help:false}, {n:"", cpu:false, help:false}, {n:"", cpu:false, help:false}];
  const BOT_SIGMA = [42, 26, 15];
  const WOBBLE = [8, 4];                                // normal, yardımlı (mantıksal piksel)
  const SPEED = [[2.4, 2.8], [1.3, 1.5]];               // süpürme hızı (rad/sn): normal, yardımlı

  // (x, y) noktasının puanı
  function scoreAt(x, y){
    const dx = x - CX, dy = y - CY, r = Math.hypot(dx, dy) / R;
    if (r <= RING.bullIn) return {pts: 50, label: "Göz! 50", n: 50, m: 1};
    if (r <= RING.bullOut) return {pts: 25, label: "25", n: 25, m: 1};
    if (r > 1) return {pts: 0, label: "Iska", n: 0, m: 0};
    let deg = Math.atan2(dx, -dy) * 180 / Math.PI;      // tepeden saat yönünde
    deg = (deg + 9 + 360) % 360;
    const n = ORDER[Math.floor(deg / 18)];
    if (r >= RING.trebleIn && r <= RING.trebleOut) return {pts: 3 * n, label: `Üçlü ${n}`, n, m: 3};
    if (r >= RING.doubleIn) return {pts: 2 * n, label: `İkili ${n}`, n, m: 2};
    return {pts: n, label: `${n}`, n, m: 1};
  }
  function pointFor(n, r){                              // n sayısının dilimindeki bir nokta
    const th = ORDER.indexOf(n) * 18 * Math.PI / 180;
    return {x: CX + Math.sin(th) * r * R, y: CY - Math.cos(th) * r * R};
  }
  function gauss(){ let u = 0, v = 0; while (!u) u = Math.random(); while (!v) v = Math.random(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); }

  let save = {bestTurn: 0, bestTotal: 0};
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
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + .005); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(a.destination); o.start(t); o.stop(t + dur + .05);
  }
  const sTap = () => tone(700, 760, "sine", .05, .08);
  const sWhoosh = () => tone(900, 300, "sawtooth", .16, .03);
  const sThunk = good => { tone(160, 80, "triangle", .1, .3); if (good) [784, 988, 1175].forEach((f, k) => tone(f, f, "triangle", .14, .1, .08 + k * .07)); };
  const sMiss = () => tone(200, 120, "square", .2, .06);
  const sWin = () => [523, 659, 784, 1047, 1319].forEach((f, k) => tone(f, f, "triangle", .22, .13, k * .09));

  const canSpeak = "speechSynthesis" in window;
  let trVoice = null;
  function pickVoice(){ trVoice = speechSynthesis.getVoices().find(v => /^tr(-|_|$)/i.test(v.lang)) || null; }
  if (canSpeak){ pickVoice(); if (speechSynthesis.addEventListener) speechSynthesis.addEventListener("voiceschanged", pickVoice); }
  function say(text){
    if (!canSpeak || !soundOn || !trVoice) return;
    speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text); u.voice = trVoice; u.lang = trVoice.lang; u.rate = 1; u.pitch = 1.1;
    speechSynthesis.speak(u);
  }
  function suffix(name){
    const dig = {"1":"'de","2":"'de","3":"'te","4":"'te","5":"'te","6":"'da","7":"'de","8":"'de","9":"'da","0":"'da"}[name.slice(-1)];
    if (dig) return dig;
    const low = name.toLocaleLowerCase("tr");
    const vowels = low.match(/[aeıioöuü]/g);
    const v = vowels ? vowels[vowels.length - 1] : "e";
    const back = "aıou".includes(v);
    const hard = /[fstkçşhp]$/.test(low);
    return "'" + (hard ? "t" : "d") + (back ? "a" : "e");
  }
  function renderSound(){
    $("ic-on").hidden = !soundOn; $("ic-off").hidden = soundOn;
    $("sound").setAttribute("aria-label", soundOn ? "Sesi kapat" : "Sesi aç");
    $("sound").setAttribute("aria-pressed", String(soundOn));
  }
  $("sound").addEventListener("click", () => { soundOn = !soundOn; if (!soundOn && canSpeak) speechSynthesis.cancel(); renderSound(); });
  renderSound();

  /* ---------- durum ---------- */
  let G = null, timers = [];
  const later = (sec, fn) => timers.push({t: sec, fn});

  function newGame(cfg){
    timers = [];
    G = {cfg, players: cfg.players.map(p => ({...p, total: 0, rem: 301, turnStart: 301, turns: 0, bust: false})),
      cur: 0, round: 1, throws: [], stuck: [], phase: "wait", t: 0, ax: CX, ay: CY, ph: 0, fly: null, pops: [], over: false, botPlan: null};
    ["setup", "end"].forEach(id => $(id).hidden = true);
    turnStart();
  }
  const P = () => G.players[G.cur];
  const is301 = () => G.cfg.game === "301";

  function turnStart(){
    const p = P();
    G.throws = []; G.stuck = []; p.turnStart = p.rem; p.bust = false;
    render();
    nextDart();
    if (p.help && !p.cpu) say(`Sıra ${p.name}${suffix(p.name)}`);
  }
  function nextDart(){
    const p = P();
    G.ph = Math.random() * Math.PI * 2;
    if (p.cpu){ G.phase = "bot"; planBot(); setHint(`${p.name} nişan alıyor…`); }
    else { G.phase = "x"; setHint("Dokun: dikey çizgiyi durdur."); }
    renderDarts();
  }

  function planBot(){
    const p = P(), sig = BOT_SIGMA[G.cfg.bot];
    let tgt;
    if (!is301() || p.rem > 60) tgt = pointFor(20, .595);
    else if (p.rem > 20) tgt = pointFor(20, .78);
    else if (p.rem > 0) tgt = pointFor(p.rem, .78);
    else tgt = {x: CX, y: CY};
    const fx = tgt.x + gauss() * sig, fy = tgt.y + gauss() * sig;
    G.botPlan = {tx: tgt.x, ty: tgt.y, fx, fy, t: 0};
    G.ax = CX + (Math.random() - .5) * 200; G.ay = CY + (Math.random() - .5) * 200;
  }

  function tap(){
    if (!G || G.over) return;
    const p = P(); if (p.cpu) return;
    audio();
    if (G.phase === "x"){ G.phase = "y"; G.ph = Math.random() * Math.PI * 2; sTap(); setHint("Dokun: yatay çizgiyi durdur."); return; }
    if (G.phase === "y"){
      sTap();
      const w = WOBBLE[p.help ? 1 : 0];
      throwAt(G.ax + gauss() * w, G.ay + gauss() * w);
    }
  }

  function throwAt(x, y){
    G.phase = "fly"; sWhoosh();
    G.fly = {x, y, t: 0};
  }

  function landed(){
    const f = G.fly, p = P(), sc = scoreAt(f.x, f.y);
    G.fly = null;
    G.stuck.push({x: f.x, y: f.y, col: p.bg});
    G.throws.push(sc);
    G.pops.push({x: f.x, y: f.y - 14, text: sc.pts ? sc.label.replace(/^(\d+)$/, "$1") : "Iska", life: 1.2, big: sc.m === 3 || sc.pts >= 50});
    if (sc.pts) sThunk(sc.m === 3 || sc.pts >= 50); else sMiss();
    let endTurn = G.throws.length >= 3, msg = null;
    if (is301()){
      const after = p.rem - sc.pts;
      if (after < 0){ p.bust = true; p.rem = p.turnStart; endTurn = true; msg = "Fazla! Bu turun puanı geri alındı."; }
      else { p.rem = after; if (after === 0){ renderDarts(); render(); speak(p, sc, " Sıfır! Kazandın!"); later(.9, () => finish(p)); G.phase = "wait"; return; } }
    } else p.total += sc.pts;
    speak(p, sc, msg ? " Fazla!" : "");
    renderDarts(); render();
    if (msg) setHint(msg);
    G.phase = "wait";
    if (endTurn) later(1.3, endOfTurn);
    else later(.55, nextDart);
  }
  function speak(p, sc, extra){
    const turnSum = G.throws.reduce((a, t) => a + t.pts, 0);
    if (G.throws.length === 3 && turnSum === 180){ say("Yüz seksen!"); return; }
    if (p.help && !p.cpu) say((sc.pts ? sc.label.replace("Göz! 50", "Göz! Elli") : "Iska") + (extra || ""));
    else if (extra) say(extra.trim());
  }

  function endOfTurn(){
    const p = P(), sum = G.throws.reduce((a, t) => a + t.pts, 0);
    p.turns++;
    if (!p.cpu && !p.bust && sum > save.bestTurn){ save.bestTurn = sum; store(); }
    const n = G.players.length;
    let next = (G.cur + 1) % n;
    if (next === 0){
      G.round++;
      if (!is301() && G.round > ROUNDS){ finish(); return; }
    }
    G.cur = next;
    turnStart();
  }

  function finish(winner301){
    G.over = true; G.phase = "wait";
    const box = $("results"); box.innerHTML = "";
    let title, note = "";
    if (is301()){
      const w = winner301;
      title = `${w.name} kazandı!`;
      [...G.players].sort((a, b) => a.rem - b.rem).forEach(q => {
        const d = document.createElement("div"); if (q === w) d.className = "win";
        d.innerHTML = `<span></span><b>${q.rem === 0 ? "0 ✓" : q.rem + " kaldı"}</b>`;
        d.querySelector("span").textContent = `${q.av} ${q.name}`; box.appendChild(d);
      });
      note = `${w.turns + 1}. turda bitirdi.`;
    } else {
      const best = Math.max(...G.players.map(q => q.total));
      [...G.players].sort((a, b) => b.total - a.total).forEach(q => {
        const d = document.createElement("div"); if (q.total === best) d.className = "win";
        d.innerHTML = `<span></span><b>${q.total}</b>`;
        d.querySelector("span").textContent = `${q.av} ${q.name}`; box.appendChild(d);
      });
      const wins = G.players.filter(q => q.total === best);
      title = G.players.length === 1 ? `${best} puan!` : wins.length > 1 ? "Berabere!" : `${wins[0].name} kazandı!`;
      const humanBest = Math.max(0, ...G.players.filter(q => !q.cpu).map(q => q.total));
      if (humanBest > save.bestTotal){ save.bestTotal = humanBest; store(); note = "Yeni puan avı rekoru! 🏆"; }
    }
    note += `${note ? " " : ""}En iyi 3 ok: ${save.bestTurn} · Puan avı rekoru: ${save.bestTotal}`;
    $("end-title").textContent = title; $("end-note").textContent = note;
    sWin(); say(title);
    render();
    later(.6, () => { $("end").hidden = false; $("again").focus(); });
  }

  /* ---------- güncelle ---------- */
  function update(dt){
    for (const tm of timers) tm.t -= dt;
    const due = timers.filter(tm => tm.t <= 0); timers = timers.filter(tm => tm.t > 0); due.forEach(tm => tm.fn());
    if (!G) return;
    G.t += dt;
    for (const pp of G.pops){ pp.life -= dt; pp.y -= 24 * dt; }
    G.pops = G.pops.filter(pp => pp.life > 0);
    const p = P(), sp = SPEED[p.help && !p.cpu ? 1 : 0];
    if (G.phase === "x"){ G.ph += dt * sp[0]; G.ax = CX + Math.sin(G.ph) * R * 1.08; G.ay = CY; }
    else if (G.phase === "y"){ G.ph += dt * sp[1]; G.ay = CY + Math.sin(G.ph) * R * 1.08; }
    else if (G.phase === "bot"){
      const b = G.botPlan; b.t += dt;
      G.ax += (b.tx - G.ax) * Math.min(1, dt * 4); G.ay += (b.ty - G.ay) * Math.min(1, dt * 4);
      if (b.t > .9) throwAt(b.fx, b.fy);
    } else if (G.phase === "fly"){
      G.fly.t += dt;
      if (G.fly.t >= .22) landed();
    }
  }

  /* ---------- çizim ---------- */
  const cv = $("cv"), stage = $("stage"), ctx = cv.getContext("2d");
  let view = {s: 1, ox: 0, oy: 0, dpr: 1};
  function resize(){
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const cw = stage.clientWidth, ch = stage.clientHeight;
    cv.width = Math.round(cw * dpr); cv.height = Math.round(ch * dpr);
    const s = Math.min(cw / S, ch / S);
    view = {s, ox: (cw - S * s) / 2, oy: (ch - S * s) / 2, dpr};
  }
  function wedge(r0, r1, a0, a1, col){
    ctx.fillStyle = col; ctx.beginPath();
    ctx.arc(CX, CY, r1, a0, a1); ctx.arc(CX, CY, r0, a1, a0, true); ctx.closePath(); ctx.fill();
  }
  function drawBoard(){
    ctx.fillStyle = "#151515"; ctx.beginPath(); ctx.arc(CX, CY, R * 1.24, 0, Math.PI * 2); ctx.fill();
    for (let i = 0; i < 20; i++){
      const a0 = (i * 18 - 9 - 90) * Math.PI / 180, a1 = a0 + 18 * Math.PI / 180, even = i % 2 === 0;
      wedge(RING.bullOut * R, RING.trebleIn * R, a0, a1, even ? "#1B1B1B" : "#F3E7C9");
      wedge(RING.trebleIn * R, RING.trebleOut * R, a0, a1, even ? "#E5484D" : "#2EB872");
      wedge(RING.trebleOut * R, RING.doubleIn * R, a0, a1, even ? "#1B1B1B" : "#F3E7C9");
      wedge(RING.doubleIn * R, R, a0, a1, even ? "#E5484D" : "#2EB872");
    }
    ctx.fillStyle = "#2EB872"; ctx.beginPath(); ctx.arc(CX, CY, RING.bullOut * R, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "#E5484D"; ctx.beginPath(); ctx.arc(CX, CY, RING.bullIn * R, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = "rgba(200,200,200,.55)"; ctx.lineWidth = 1;
    for (const r of [RING.bullIn, RING.bullOut, RING.trebleIn, RING.trebleOut, RING.doubleIn, 1]){ ctx.beginPath(); ctx.arc(CX, CY, r * R, 0, Math.PI * 2); ctx.stroke(); }
    for (let i = 0; i < 20; i++){
      const a = (i * 18 - 9 - 90) * Math.PI / 180;
      ctx.beginPath(); ctx.moveTo(CX + Math.cos(a) * RING.bullOut * R, CY + Math.sin(a) * RING.bullOut * R); ctx.lineTo(CX + Math.cos(a) * R, CY + Math.sin(a) * R); ctx.stroke();
    }
    ctx.fillStyle = "#FFFFFF"; ctx.font = "700 20px Rubik, sans-serif"; ctx.textAlign = "center"; ctx.textBaseline = "middle";
    ORDER.forEach((n, i) => { const a = (i * 18 - 90) * Math.PI / 180; ctx.fillText(n, CX + Math.cos(a) * R * 1.12, CY + Math.sin(a) * R * 1.12); });
  }
  function drawDart(x, y, col, lift){
    // ucu (x,y)'de, gövdesi sağ alta doğru
    const k = 1 + (lift || 0);
    ctx.save(); ctx.translate(x, y); ctx.scale(k, k);
    ctx.strokeStyle = "#C9CED6"; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(9, 9); ctx.stroke();
    ctx.strokeStyle = "#3A3F47"; ctx.lineWidth = 5; ctx.lineCap = "round"; ctx.beginPath(); ctx.moveTo(8, 8); ctx.lineTo(24, 24); ctx.stroke();
    ctx.fillStyle = col;
    ctx.beginPath(); ctx.moveTo(22, 22); ctx.lineTo(38, 26); ctx.lineTo(32, 32); ctx.closePath(); ctx.fill();
    ctx.beginPath(); ctx.moveTo(22, 22); ctx.lineTo(26, 38); ctx.lineTo(32, 32); ctx.closePath(); ctx.fill();
    ctx.restore();
    ctx.fillStyle = "rgba(0,0,0,.6)"; ctx.beginPath(); ctx.arc(x, y, 2.2, 0, Math.PI * 2); ctx.fill();
  }
  function draw(){
    const {s, ox, oy, dpr} = view;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, cv.width, cv.height);
    ctx.setTransform(dpr * s, 0, 0, dpr * s, dpr * ox, dpr * oy);
    drawBoard();
    if (!G) return;
    for (const d of G.stuck) drawDart(d.x, d.y, d.col);
    // nişan çizgileri
    const p = P();
    if (!G.over && (G.phase === "x" || G.phase === "y" || G.phase === "bot")){
      ctx.lineWidth = 3; ctx.setLineDash([10, 6]);
      ctx.strokeStyle = G.phase === "x" ? "rgba(245,197,66,.95)" : "rgba(245,197,66,.55)";
      ctx.beginPath(); ctx.moveTo(G.ax, 4); ctx.lineTo(G.ax, S - 4); ctx.stroke();
      if (G.phase !== "x"){
        ctx.strokeStyle = "rgba(245,197,66,.95)";
        ctx.beginPath(); ctx.moveTo(4, G.ay); ctx.lineTo(S - 4, G.ay); ctx.stroke();
      }
      ctx.setLineDash([]);
      if (G.phase !== "x"){
        ctx.strokeStyle = "#fff"; ctx.lineWidth = 2.5;
        ctx.beginPath(); ctx.arc(G.ax, G.ay, 11, 0, Math.PI * 2); ctx.stroke();
      }
    }
    if (G.fly){
      const k = 1 - G.fly.t / .22;
      drawDart(G.fly.x + k * 60, G.fly.y + k * 140, p.bg, k * .8);
    }
    for (const pp of G.pops){
      ctx.globalAlpha = Math.min(1, pp.life * 1.5);
      ctx.font = `800 ${pp.big ? 30 : 24}px Rubik, sans-serif`; ctx.textAlign = "center"; ctx.textBaseline = "middle";
      ctx.lineWidth = 6; ctx.strokeStyle = "#0D1B14"; ctx.strokeText(pp.text, pp.x, pp.y);
      ctx.fillStyle = pp.big ? "#F5C542" : "#FFFFFF"; ctx.fillText(pp.text, pp.x, pp.y);
    }
    ctx.globalAlpha = 1;
  }

  function setHint(t){ $("hintline").textContent = t; }
  function render(){
    if (!G) return;
    const ul = $("players"); ul.innerHTML = "";
    G.players.forEach((q, i) => {
      const li = document.createElement("li");
      li.className = "pl" + (i === G.cur && !G.over ? " on" : "") + (q.bust ? " bust" : "");
      li.innerHTML = `<span class="av" style="background:${q.bg}">${q.av}</span><span class="nm"></span><b>${is301() ? q.rem : q.total}</b>`;
      li.querySelector(".nm").textContent = q.name + (q.cpu ? " 🤖" : "");
      ul.appendChild(li);
    });
  }
  function renderDarts(){
    const box = $("darts"); box.innerHTML = "";
    for (let i = 0; i < 3; i++){
      const t = G.throws[i], d = document.createElement("div");
      d.className = "dslot" + (t ? " done" + (t.m === 3 || t.pts >= 50 ? " hi" : "") + (t.pts === 0 ? " zero" : "") : "");
      d.textContent = t ? (t.pts ? (t.m === 3 ? `3×${t.n}` : t.m === 2 ? `2×${t.n}` : t.pts) : "✕") : "🎯";
      box.appendChild(d);
    }
    const sum = document.createElement("div"); sum.className = "dslot sum";
    const tot = G.throws.reduce((a, t) => a + t.pts, 0);
    sum.textContent = `= ${tot}` + (is301() ? "" : ` · ${G.round > ROUNDS ? ROUNDS : G.round}/${ROUNDS}. tur`);
    box.appendChild(sum);
  }

  cv.addEventListener("pointerdown", e => { e.preventDefault(); tap(); });
  document.addEventListener("keydown", e => {
    if (!G || (e.target instanceof Element && e.target.closest("input, button, form"))) return;
    if (e.key === " " || e.key === "Enter"){ e.preventDefault(); if (!e.repeat) tap(); }
  });

  /* ---------- kurulum ---------- */
  const form = $("setup-form");
  function buildRows(){
    const n = +form.count.value, box = $("rows");
    const old = [...box.querySelectorAll(".p-row")].map(r => ({n: r.querySelector("input[type=text]").value, cpu: r.querySelector(".cpu").checked, help: r.querySelector(".help").checked}));
    box.innerHTML = "";
    for (let i = 0; i < n; i++){
      const src = old[i] || DEF[i], row = document.createElement("div");
      row.className = "p-row";
      row.innerHTML = `<span class="av" style="background:${SLOTS[i].bg}">${SLOTS[i].av}</span>
        <input type="text" maxlength="12" aria-label="${i + 1}. oyuncunun adı" placeholder="Oyuncu ${i + 1}">
        <label class="toggle" title="Bilgisayar oynasın"><input type="checkbox" class="cpu"><span>🤖</span></label>
        <label class="toggle" title="Yardım"><input type="checkbox" class="help"><span>✨</span></label>`;
      row.querySelector("input[type=text]").value = src.n;
      row.querySelector(".cpu").checked = src.cpu;
      row.querySelector(".help").checked = src.help;
      box.appendChild(row);
    }
  }
  function modeHelp(){
    $("mode-help").innerHTML = form.game.value === "301"
      ? "<b>301:</b> herkes 301'den başlar, attığı puan düşülür. <b>Tam sıfıra</b> inen kazanır; sıfırın altına düşen turun puanını kaybeder."
      : `<b>Puan avı:</b> herkes ${ROUNDS} tur, her turda 3 ok atar. En çok puanı toplayan kazanır.`;
  }
  form.addEventListener("change", e => { if (e.target.name === "count") buildRows(); if (e.target.name === "game") modeHelp(); });
  form.addEventListener("submit", e => {
    e.preventDefault(); audio();
    const rows = [...$("rows").querySelectorAll(".p-row")];
    const players = rows.map((r, i) => ({
      name: r.querySelector("input[type=text]").value.trim() || `Oyuncu ${i + 1}`,
      av: SLOTS[i].av, bg: SLOTS[i].bg,
      cpu: r.querySelector(".cpu").checked, help: r.querySelector(".help").checked
    }));
    newGame({players, game: form.game.value, bot: +form.bot.value});
  });
  $("open-setup").addEventListener("click", () => { timers = []; if (G){ G.over = true; G.phase = "wait"; } $("end").hidden = true; $("setup").hidden = false; });
  $("end-setup").addEventListener("click", () => { $("end").hidden = true; $("setup").hidden = false; });
  $("again").addEventListener("click", () => { audio(); newGame(G.cfg); });

  let last = performance.now();
  function frame(now){
    const dt = Math.min(.05, (now - last) / 1000); last = now;
    update(dt); draw();
    requestAnimationFrame(frame);
  }
  document.addEventListener("visibilitychange", () => { last = performance.now(); if (document.hidden && canSpeak) speechSynthesis.cancel(); });
  if ("ResizeObserver" in window) new ResizeObserver(resize).observe(stage); else window.addEventListener("resize", resize);
  resize(); buildRows(); modeHelp();
  requestAnimationFrame(frame);

  // testler için
  window.__dart = {scoreAt, pointFor, state: () => G, newGame, update, tap, throwAt, R, CX, CY, ORDER, RING};
})();
