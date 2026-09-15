/* Kızma Birader — 2-4 oyuncu, bilgisayar rakip */
(function(){
  "use strict";

  /* ---------- tahta (11 x 11 ızgara, [sütun, satır]) ---------- */
  // 40 karelik yol saat yönünde; her rengin başlangıcı 10 kare arayla
  const TRACK = [
    [0, 4], [1, 4], [2, 4], [3, 4], [4, 4], [4, 3], [4, 2], [4, 1], [4, 0], [5, 0],
    [6, 0], [6, 1], [6, 2], [6, 3], [6, 4], [7, 4], [8, 4], [9, 4], [10, 4], [10, 5],
    [10, 6], [9, 6], [8, 6], [7, 6], [6, 6], [6, 7], [6, 8], [6, 9], [6, 10], [5, 10],
    [4, 10], [4, 9], [4, 8], [4, 7], [4, 6], [3, 6], [2, 6], [1, 6], [0, 6], [0, 5]
  ];
  const START = [0, 10, 20, 30];
  const HOME = [
    [[1, 5], [2, 5], [3, 5], [4, 5]],
    [[5, 1], [5, 2], [5, 3], [5, 4]],
    [[9, 5], [8, 5], [7, 5], [6, 5]],
    [[5, 9], [5, 8], [5, 7], [5, 6]]
  ];
  const YARD = [
    [[0, 0], [1, 0], [0, 1], [1, 1]],
    [[9, 0], [10, 0], [9, 1], [10, 1]],
    [[9, 9], [10, 9], [9, 10], [10, 10]],
    [[0, 9], [1, 9], [0, 10], [1, 10]]
  ];
  const SEAT_COLORS = [
    {c:"#E5484D", dark:"#A8272C", light:"#FAD3D4", name:"Kırmızı"},
    {c:"#3D6BF2", dark:"#1F45B5", light:"#D3DFFC", name:"Mavi"},
    {c:"#2EAA5C", dark:"#1A7A3E", light:"#CDEFD9", name:"Yeşil"},
    {c:"#F2B01E", dark:"#B57F00", light:"#FCEBC2", name:"Sarı"}
  ];
  const AVATARS = ["🚀", "🎈", "🌸", "⭐"];
  const SEATS_FOR = {2:[0, 2], 3:[0, 1, 2], 4:[0, 1, 2, 3]};
  const NUMS = ["bir", "iki", "üç", "dört", "beş", "altı"];
  const DICE_DOTS = {1:[4], 2:[0, 8], 3:[0, 4, 8], 4:[0, 2, 6, 8], 5:[0, 2, 4, 6, 8], 6:[0, 2, 3, 5, 6, 8]};
  const SETTINGS_KEY = "kizma-birader-ayar", SOUND_KEY = "kizma-birader-ses";
  const RM = window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches;
  const TAU = Math.PI*2;

  const $ = id => document.getElementById(id);
  const cv = $("cv"), ctx = cv.getContext("2d");
  const esc = s => String(s).replace(/[&<>"']/g, ch => ({"&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#39;"}[ch]));
  const cap = s => s.charAt(0).toLocaleUpperCase("tr") + s.slice(1);

  let settings = {players:[{name:"Enes", bot:false}, {name:"Egemen", bot:false}], sixAgain:true, threeTries:true, autoOne:true, shortGame:false};
  try { const s = JSON.parse(localStorage.getItem(SETTINGS_KEY) || "null"); if (s && Array.isArray(s.players) && s.players.length >= 2) settings = Object.assign(settings, s, {players:s.players.slice(0, 4)}); } catch(e) {}
  let soundOn = true;
  try { soundOn = localStorage.getItem(SOUND_KEY) !== "0"; } catch(e) {}

  // "Sıra Enes'te", "Sıra Anne'de"
  function locative(name){
    const low = name.toLocaleLowerCase("tr"), vowels = "aeıioöuü";
    let v = "e";
    for (let i = low.length - 1; i >= 0; i--){ if (vowels.includes(low[i])){ v = low[i]; break; } }
    const hard = "çfhkpsşt".includes(low[low.length - 1]);
    return `${name}'${hard ? "t" : "d"}${"aıou".includes(v) ? "a" : "e"}`;
  }

  /* ---------- ses ---------- */
  let ac = null;
  function audio(){
    if (!ac){ try { ac = new (window.AudioContext || window.webkitAudioContext)(); } catch(e) { ac = null; } }
    if (ac && ac.state === "suspended") ac.resume();
    return ac;
  }
  function tone(freq, dur, type, vol, slide, delay){
    const a = audio(); if (!a || !soundOn) return;
    const n = a.currentTime + (delay || 0), o = a.createOscillator(), g = a.createGain();
    o.type = type || "sine"; o.frequency.setValueAtTime(freq, n);
    if (slide) o.frequency.exponentialRampToValueAtTime(slide, n + dur);
    g.gain.setValueAtTime(.0001, n); g.gain.exponentialRampToValueAtTime(vol || .1, n + .01); g.gain.exponentialRampToValueAtTime(.0001, n + dur);
    o.connect(g).connect(a.destination); o.start(n); o.stop(n + dur + .05);
  }
  const sfx = {
    dice(){ for (let i = 0; i < 6; i++) tone(300 + Math.random()*400, .04, "square", .03, null, i*.07); },
    hop(k){ tone(460 + k*50, .07, "triangle", .1); },
    out(){ [392, 523.25, 659.25].forEach((f, i) => tone(f, .14, "triangle", .1, null, i*.07)); },
    capture(){ tone(880, .12, "square", .06, 440); tone(300, .5, "sawtooth", .05, 90, .1); },
    home(){ [659.25, 783.99, 1046.5].forEach((f, i) => tone(f, .18, "triangle", .12, null, i*.08)); },
    nope(){ tone(260, .2, "sine", .08, 200); },
    win(){ [523.25, 659.25, 783.99, 1046.5, 1318.5].forEach((f, i) => tone(f, .28, "triangle", .14, null, i*.12)); }
  };
  const canSpeak = "speechSynthesis" in window;
  let trVoice = null;
  function pickVoice(){ trVoice = speechSynthesis.getVoices().find(v => /^tr(-|_|$)/i.test(v.lang)) || null; }
  if (canSpeak){ pickVoice(); if (speechSynthesis.addEventListener) speechSynthesis.addEventListener("voiceschanged", pickVoice); }
  function say(text, queue){
    if (!canSpeak || !soundOn || !trVoice) return;
    if (!queue) speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text); u.voice = trVoice; u.lang = trVoice.lang; u.rate = 1.05; u.pitch = 1.1;
    speechSynthesis.speak(u);
  }
  function renderSound(){
    $("ic-on").hidden = !soundOn; $("ic-off").hidden = soundOn;
    $("sound").setAttribute("aria-label", soundOn ? "Sesi kapat" : "Sesi aç");
    $("sound").setAttribute("aria-pressed", String(soundOn));
  }
  $("sound").addEventListener("click", () => {
    soundOn = !soundOn;
    try { localStorage.setItem(SOUND_KEY, soundOn ? "1" : "0"); } catch(e) {}
    if (!soundOn && canSpeak) speechSynthesis.cancel();
    renderSound();
  });
  renderSound();

  /* ---------- zamanlayıcı (oyun döngüsüyle ilerler) ---------- */
  let timers = [];
  const later = (sec, fn) => timers.push({t:sec, fn});

  /* ---------- kurallar ---------- */
  let G = null, anim = null, time = 0;

  const absOf = (seat, p) => (START[seat] + p) % 40;
  function cellOf(pl, i){
    const p = pl.pieces[i].p;
    if (p < 0) return YARD[pl.seat][i];
    if (p < 40) return TRACK[absOf(pl.seat, p)];
    return HOME[pl.seat][p - 40];
  }
  function pieceAtAbs(abs){
    for (const pl of G.players) for (let i = 0; i < pl.pieces.length; i++){
      const p = pl.pieces[i].p;
      if (p >= 0 && p < 40 && absOf(pl.seat, p) === abs) return {pl, i};
    }
    return null;
  }
  function legalMoves(pl, n){
    const out = [];
    pl.pieces.forEach((pc, i) => {
      let to;
      if (pc.p < 0){
        if (n !== 6 || out.some(m => m.from < 0)) return;   // bahçedeki taşlar aynı hamle: yalnızca biri seçenek olur
        to = 0;
      } else {
        to = pc.p + n;
        if (to > 43) return;
        if (to >= 40){
          for (let k = Math.max(40, pc.p + 1); k <= to; k++) if (pl.pieces.some(o => o.p === k)) return;   // evde taş atlanmaz
        }
      }
      let capture = null;
      if (to < 40){
        const hit = pieceAtAbs(absOf(pl.seat, to));
        if (hit && hit.pl === pl) return;
        if (hit) capture = hit;
      }
      out.push({i, from:pc.p, to, capture});
    });
    return out;
  }
  const allHome = pl => pl.pieces.every(pc => pc.p >= 40);
  // Evdeki taşlar en uca dizilmişse ve yolda taş yoksa "3 hak" kuralı geçerli
  function nothingOnTrack(pl){
    if (pl.pieces.some(pc => pc.p >= 0 && pc.p < 40)) return false;
    const home = pl.pieces.filter(pc => pc.p >= 40).map(pc => pc.p).sort((a, b) => b - a);
    return home.every((p, k) => p === 43 - k);
  }

  // Bilgisayarın hamle seçimi
  function threatAt(pl, abs){
    for (const o of G.players){
      if (o === pl) continue;
      for (const pc of o.pieces){
        if (pc.p < 0 || pc.p >= 40) continue;
        const d = (abs - absOf(o.seat, pc.p) + 40) % 40;
        if (d >= 1 && d <= 6 && pc.p + d < 40) return true;
      }
    }
    return false;
  }
  function botPick(pl, moves){
    let best = null;
    for (const m of moves){
      let s = m.to*.6 + Math.random()*6;
      if (m.capture) s += 60;
      if (m.from < 0) s += 45;
      if (m.to >= 40) s += 35;
      if (m.to < 40 && threatAt(pl, absOf(pl.seat, m.to))) s -= 22;
      if (m.from >= 0 && m.from < 40 && threatAt(pl, absOf(pl.seat, m.from))) s += 14;
      if (!best || s > best.s) best = {m, s};
    }
    return best.m;
  }

  /* ---------- akış ---------- */
  function newGame(){
    const seats = SEATS_FOR[settings.players.length];
    const count = settings.shortGame ? 2 : 4;
    G = {
      players:settings.players.map((p, k) => ({name:(p.name || "").trim() || (p.bot ? "Bilgisayar" : `Oyuncu ${k + 1}`), bot:!!p.bot, seat:seats[k], av:AVATARS[k],
        pieces:Array.from({length:count}, () => ({p:-1})), tries:0, captures:0})),
      turn:0, state:"idle", roll:6, moves:[]
    };
    timers = []; anim = null;
    $("setup").hidden = true; $("end").hidden = true;
    resize(); renderPlayers(); renderDice(6);
    promptTurn();
  }

  function renderPlayers(){
    $("players").innerHTML = G.players.map((p, k) => {
      const home = p.pieces.filter(pc => pc.p >= 40).length;
      return `<div class="pl${k === G.turn && G.state !== "over" ? " active" : ""}" style="--c:${SEAT_COLORS[p.seat].c}"><span class="av">${p.av}</span><span class="nm">${esc(p.name)}<small>${p.bot ? "bilgisayar · " : ""}${SEAT_COLORS[p.seat].name}</small></span><b class="pos">${home}<small>/${p.pieces.length} 🏠</small></b></div>`;
    }).join("");
  }
  function renderDice(n){ $("face").innerHTML = Array.from({length:9}, (_, k) => `<i class="${DICE_DOTS[n].includes(k) ? "on" : ""}"></i>`).join(""); }
  function setMsg(t){ $("msg").textContent = t; }

  function promptTurn(again){
    const p = G.players[G.turn];
    G.state = "idle"; G.moves = [];
    $("dice").disabled = p.bot;
    renderPlayers();
    if (p.bot){ setMsg(`${p.name} atıyor…`); later(.9, () => { if (G && G.state === "idle" && G.players[G.turn] === p) roll(); }); }
    else if (!again){ setMsg(`Sıra ${locative(p.name)}! Zarı at.`); say(`Sıra ${locative(p.name)}.`); }
  }

  function roll(){
    if (!G || G.state !== "idle") return;
    audio();
    G.state = "rolling";
    $("dice").disabled = true;
    const n = 1 + Math.floor(Math.random()*6);
    sfx.dice();
    const d = $("dice");
    if (!RM){ d.classList.remove("roll"); void d.offsetWidth; d.classList.add("roll"); }
    for (let k = 0; k < 6; k++) later(k*.07, () => renderDice(1 + Math.floor(Math.random()*6)));
    later(RM ? .15 : .55, () => { renderDice(n); resolve(n); });
  }

  function resolve(n){
    const pl = G.players[G.turn];
    G.roll = n;
    const moves = legalMoves(pl, n);
    if (!moves.length){
      if (settings.threeTries && nothingOnTrack(pl) && pl.tries < 2){
        pl.tries++;
        G.state = "wait";
        setMsg(`${pl.name} ${n} attı. ${3 - pl.tries}. hak daha var, tekrar at!`);
        say(n === 6 ? "Altı!" : `${cap(NUMS[n - 1])}. Tekrar at.`);
        later(1, () => promptTurn(true));
        if (!pl.bot) later(1.05, () => setMsg(`Tekrar at! (${pl.tries + 1}. deneme)`));
        return;
      }
      pl.tries = 0;
      G.state = "wait";
      sfx.nope();
      setMsg(`${pl.name} ${n} attı, oynayacak taş yok.`);
      later(1.2, nextTurn);
      return;
    }
    pl.tries = 0;
    G.moves = moves;
    if (pl.bot){
      G.state = "wait";
      setMsg(`${pl.name} ${n} attı.`);
      const m = botPick(pl, moves);
      later(.6, () => doMove(m));
      return;
    }
    say(cap(NUMS[n - 1]) + "!");
    if (moves.length === 1 && settings.autoOne){
      G.state = "choose";
      setMsg(`${n} attın. Taş gidiyor…`);
      later(.8, () => { if (G.state === "choose" && G.moves[0] === moves[0]) doMove(moves[0]); });
      return;
    }
    G.state = "choose";
    setMsg(`${n} attın. Parlayan taşlardan birine dokun.`);
  }

  function doMove(m){
    if (!G || (G.state !== "choose" && G.state !== "wait")) return;
    const pl = G.players[G.turn];
    G.state = "moving"; G.moves = [];
    const steps = [];
    if (m.from < 0) steps.push(0);
    else for (let s = m.from + 1; s <= m.to; s++) steps.push(s);
    anim = {pl, m, steps, k:0, t:0, x:null, y:null};
    if (m.from < 0) sfx.out();
  }

  function afterMove(){
    const {pl, m} = anim;
    anim = null;
    pl.pieces[m.i].p = m.to;
    if (m.capture){
      const vic = m.capture.pl, vi = m.capture.i;
      const from = cellOf(vic, vi);
      vic.pieces[vi].p = -1;
      pl.captures++;
      sfx.capture();
      setMsg(`${pl.name}, ${vic.name} taşını yakaladı! Kızma birader!`);
      say("Yakalandın! Kızma birader!");
      flying.push({pl:vic, i:vi, from, t:0});
    } else if (m.to >= 40 && m.from < 40){
      sfx.home();
      setMsg(`${pl.name} bir taşını eve soktu!`);
    }
    renderPlayers();
    if (allHome(pl)){ later(m.capture ? .8 : .3, () => win(pl)); G.state = "wait"; return; }
    if (settings.sixAgain && m && G.roll === 6){
      G.state = "wait";
      later(.8, () => { if (!pl.bot) { setMsg(`6 attın, bir daha at!`); say("Altı! Bir daha at!", true); } promptTurn(true); });
      return;
    }
    G.state = "wait";
    later(m.capture ? 1.1 : .5, nextTurn);
  }

  function nextTurn(){
    if (!G || G.state === "over") return;
    G.turn = (G.turn + 1) % G.players.length;
    promptTurn();
  }

  function win(pl){
    G.state = "over";
    $("dice").disabled = true;
    sfx.win(); confetti();
    setMsg(`🏆 ${pl.name} kazandı!`);
    say(`${pl.name} kazandı! Tebrikler!`);
    const score = p => p.pieces.reduce((a, pc) => a + (pc.p < 0 ? 0 : pc.p + 1), 0);
    const ranked = G.players.slice().sort((a, b) => (b === pl) - (a === pl) || score(b) - score(a));
    $("end-title").textContent = `${pl.name} kazandı!`;
    $("podium").innerHTML = ranked.map((q, k) => `<li><span>${k + 1}.</span><span class="av" style="background:${SEAT_COLORS[q.seat].c}">${q.av}</span><span>${esc(q.name)}</span><span>${q.pieces.filter(pc => pc.p >= 40).length} 🏠 · ${q.captures} yakalama</span></li>`).join("");
    renderPlayers();
    later(1.3, () => { $("end").hidden = false; $("again").focus({preventScroll:true}); });
  }

  function confetti(){
    if (RM) return;
    const layer = $("confetti"), colors = SEAT_COLORS.map(s => s.c).concat(["#FFD23F", "#FFFFFF"]);
    for (let i = 0; i < 90; i++){
      const el = document.createElement("i");
      el.style.left = Math.random()*100 + "%"; el.style.background = colors[i % colors.length];
      el.style.animationDelay = Math.random()*.6 + "s"; el.style.animationDuration = 2 + Math.random()*1.5 + "s";
      el.style.setProperty("--dx", (Math.random()*160 - 80) + "px"); el.style.setProperty("--r", (Math.random()*720 - 360) + "deg");
      layer.appendChild(el);
      setTimeout(() => el.remove(), 4000);
    }
  }

  /* ---------- giriş ---------- */
  function choose(m){ if (G && G.state === "choose" && G.moves.includes(m)) doMove(m); }
  cv.addEventListener("pointerdown", e => {
    if (!G || G.state !== "choose") return;
    audio();
    const r = cv.getBoundingClientRect();
    const col = Math.floor((e.clientX - r.left)/cell), row = Math.floor((e.clientY - r.top)/cell);
    const pl = G.players[G.turn];
    const hit = G.moves.find(m => { const [c, rr] = cellOf(pl, m.i); return c === col && rr === row; })
      || G.moves.find(m => { const [c, rr] = destCell(pl, m); return c === col && rr === row; });
    if (hit) choose(hit);
    else if (G.moves.length === 1) choose(G.moves[0]);
  });
  $("dice").addEventListener("click", roll);
  window.addEventListener("keydown", e => {
    if (!$("setup").hidden || (e.target && e.target.tagName === "INPUT")) return;
    if (!$("end").hidden){ if (e.key === "Enter"){ e.preventDefault(); newGame(); } return; }
    if (!G) return;
    if ((e.key === " " || e.key === "Enter") && G.state === "idle" && !G.players[G.turn].bot){ e.preventDefault(); roll(); }
    const k = "1234".indexOf(e.key);
    if (k >= 0 && G.state === "choose"){
      const m = G.moves.find(mv => mv.i === k) || null;
      if (m){ e.preventDefault(); choose(m); } else sfx.nope();
    }
  });
  function destCell(pl, m){ return m.to < 40 ? TRACK[absOf(pl.seat, m.to)] : HOME[pl.seat][m.to - 40]; }

  /* ---------- çizim ---------- */
  let size = 600, cell = 600/11, dpr = 1;
  let flying = [];
  function resize(){
    const wrap = $("boardWrap").getBoundingClientRect();
    size = Math.max(260, Math.floor(Math.min(wrap.width, wrap.height) - 16));
    cell = size/11;
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    cv.style.width = size + "px"; cv.style.height = size + "px";
    cv.width = Math.round(size*dpr); cv.height = Math.round(size*dpr);
  }
  const cx = c => (c + .5)*cell;

  function update(dt){
    time += dt;
    for (let i = timers.length - 1; i >= 0; i--){ const tk = timers[i]; tk.t -= dt; if (tk.t <= 0){ timers.splice(i, 1); tk.fn(); } }
    if (anim){
      anim.t += dt;
      const stepDur = RM ? .06 : .17;
      while (anim && anim.t >= stepDur){
        anim.t -= stepDur;
        const s = anim.steps[anim.k];
        anim.pl.pieces[anim.m.i].p = s;
        if (anim.m.from >= 0) sfx.hop(anim.k);
        anim.k++;
        if (anim.k >= anim.steps.length){ anim.pl.pieces[anim.m.i].p = anim.m.from; afterMove(); }
      }
    }
    for (let i = flying.length - 1; i >= 0; i--){ flying[i].t += dt*1.6; if (flying[i].t >= 1) flying.splice(i, 1); }
  }

  function circle(x, y, r, fill, stroke, lw){
    ctx.beginPath(); ctx.arc(x, y, r, 0, TAU);
    if (fill){ ctx.fillStyle = fill; ctx.fill(); }
    if (stroke){ ctx.strokeStyle = stroke; ctx.lineWidth = lw || 2; ctx.stroke(); }
  }

  function drawBoard(){
    const r = cell*.4, lw = Math.max(1.5, cell*.045);
    ctx.fillStyle = "#F6E7C1"; ctx.beginPath(); ctx.roundRect(0, 0, size, size, cell*.5); ctx.fill();
    // köşe bahçeleri
    const corners = [[0, 0], [9, 0], [9, 9], [0, 9]];
    corners.forEach(([c, rr], s) => {
      ctx.fillStyle = SEAT_COLORS[s].light;
      ctx.beginPath(); ctx.roundRect(c*cell + cell*.08, rr*cell + cell*.08, cell*1.84, cell*1.84, cell*.45); ctx.fill();
    });
    // yol çizgisi
    ctx.strokeStyle = "rgba(59,58,54,.35)"; ctx.lineWidth = cell*.08; ctx.lineJoin = "round";
    ctx.beginPath(); TRACK.forEach(([c, rr], k) => k ? ctx.lineTo(cx(c), cx(rr)) : ctx.moveTo(cx(c), cx(rr))); ctx.closePath(); ctx.stroke();
    TRACK.forEach(([c, rr], k) => {
      const s = START.indexOf(k);
      circle(cx(c), cx(rr), r, s >= 0 ? SEAT_COLORS[s].c : "#FFFFFF", "#3B3A36", lw);
    });
    // başlangıç okları
    START.forEach((k, s) => {
      const [c, rr] = TRACK[k], [c2, r2] = TRACK[k + 1];
      const ax = cx(c), ay = cx(rr), ang = Math.atan2(r2 - rr, c2 - c);
      ctx.save(); ctx.translate(ax, ay); ctx.rotate(ang);
      ctx.fillStyle = "#FFFFFF"; ctx.beginPath(); ctx.moveTo(r*.55, 0); ctx.lineTo(-r*.3, -r*.4); ctx.lineTo(-r*.3, r*.4); ctx.closePath(); ctx.fill();
      ctx.restore();
    });
    HOME.forEach((cells, s) => cells.forEach(([c, rr]) => circle(cx(c), cx(rr), r, SEAT_COLORS[s].light, SEAT_COLORS[s].dark, lw)));
    YARD.forEach((cells, s) => cells.forEach(([c, rr]) => circle(cx(c), cx(rr), r, "#FFFFFF", SEAT_COLORS[s].dark, lw)));
    // orta: dört renkli yıldız
    const m = cx(5);
    for (let s = 0; s < 4; s++){
      const a = [Math.PI, -Math.PI/2, 0, Math.PI/2][s];
      ctx.fillStyle = SEAT_COLORS[s].c;
      ctx.beginPath(); ctx.moveTo(m, m); ctx.lineTo(m + Math.cos(a - .5)*r, m + Math.sin(a - .5)*r); ctx.lineTo(m + Math.cos(a)*r*1.15, m + Math.sin(a)*r*1.15); ctx.lineTo(m + Math.cos(a + .5)*r, m + Math.sin(a + .5)*r); ctx.closePath(); ctx.fill();
    }
    circle(m, m, r*.28, "#FFFFFF", "#3B3A36", lw*.8);
  }

  function drawPawn(x, y, seat, lift, glow){
    const s = cell*.36, col = SEAT_COLORS[seat];
    y -= lift || 0;
    if (glow){
      const pulse = RM ? .6 : .5 + .5*Math.sin(time*6);
      circle(x, y + (lift || 0), cell*.46 + pulse*cell*.05, `rgba(255,255,255,${.55 + pulse*.35})`);
      ctx.strokeStyle = col.dark; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(x, y + (lift || 0), cell*.46 + pulse*cell*.05, 0, TAU); ctx.stroke();
    }
    ctx.fillStyle = "rgba(0,0,0,.22)"; ctx.beginPath(); ctx.ellipse(x, y + (lift || 0) + s*.55, s*.62, s*.2, 0, 0, TAU); ctx.fill();
    ctx.fillStyle = col.c; ctx.strokeStyle = col.dark; ctx.lineWidth = Math.max(1.5, cell*.04);
    ctx.beginPath(); ctx.moveTo(x - s*.55, y + s*.5); ctx.quadraticCurveTo(x - s*.5, y - s*.05, x - s*.18, y - s*.3); ctx.lineTo(x + s*.18, y - s*.3); ctx.quadraticCurveTo(x + s*.5, y - s*.05, x + s*.55, y + s*.5); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.beginPath(); ctx.arc(x, y - s*.52, s*.32, 0, TAU); ctx.fill(); ctx.stroke();
    ctx.fillStyle = "rgba(255,255,255,.6)"; ctx.beginPath(); ctx.arc(x - s*.1, y - s*.62, s*.1, 0, TAU); ctx.fill();
  }

  function draw(){
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, size, size);
    drawBoard();
    if (!G) return;
    const cur = G.players[G.turn];
    // hedef önizlemesi
    if (G.state === "choose" && !cur.bot){
      for (const m of G.moves){
        const [c, rr] = destCell(cur, m);
        ctx.setLineDash([cell*.1, cell*.08]); ctx.lineWidth = 3; ctx.strokeStyle = SEAT_COLORS[cur.seat].dark;
        ctx.beginPath(); ctx.arc(cx(c), cx(rr), cell*.3, 0, TAU); ctx.stroke(); ctx.setLineDash([]);
        if (m.capture){ ctx.fillStyle = "rgba(229,72,77,.25)"; ctx.beginPath(); ctx.arc(cx(c), cx(rr), cell*.3, 0, TAU); ctx.fill(); }
      }
    }
    const list = [];
    for (const pl of G.players) pl.pieces.forEach((pc, i) => {
      if (flying.some(f => f.pl === pl && f.i === i)) return;
      const moving = anim && anim.pl === pl && anim.m.i === i;
      const [c, rr] = cellOf(pl, i);
      const lift = moving && !RM ? Math.sin(Math.min(1, anim.t/.17)*Math.PI)*cell*.25 : 0;
      const glow = G.state === "choose" && pl === cur && !cur.bot && G.moves.some(m => m.i === i);
      list.push({x:cx(c), y:cx(rr), seat:pl.seat, lift, glow, z:moving ? 2 : glow ? 1 : 0});
    });
    list.sort((a, b) => a.z - b.z || a.y - b.y);
    for (const p of list) drawPawn(p.x, p.y, p.seat, p.lift, p.glow);
    for (const f of flying){
      const [c1, r1] = f.from, [c2, r2] = YARD[f.pl.seat][f.i], t = f.t;
      const x = cx(c1) + (cx(c2) - cx(c1))*t, y = cx(r1) + (cx(r2) - cx(r1))*t;
      drawPawn(x, y, f.pl.seat, Math.sin(t*Math.PI)*cell*1.2, false);
    }
    // taş numaraları (klavye için), sadece seçim anında
    if (G.state === "choose" && !cur.bot && G.moves.length > 1){
      ctx.font = `900 ${Math.round(cell*.26)}px Nunito, sans-serif`; ctx.textAlign = "center"; ctx.textBaseline = "middle";
      for (const m of G.moves){
        const [c, rr] = cellOf(cur, m.i);
        circle(cx(c) + cell*.3, cx(rr) - cell*.34, cell*.16, "#1F2E40");
        ctx.fillStyle = "#FFFFFF"; ctx.fillText(String(m.i + 1), cx(c) + cell*.3, cx(rr) - cell*.33);
      }
    }
  }

  let last = performance.now();
  function frame(now){
    const dt = Math.min(.05, Math.max(0, (now - last)/1000)); last = now;
    update(dt); draw();
    requestAnimationFrame(frame);
  }

  /* ---------- ayarlar ---------- */
  function renderSetup(){
    const box = $("p-rows"), seats = SEATS_FOR[settings.players.length];
    box.innerHTML = "";
    settings.players.forEach((p, k) => {
      const row = document.createElement("div");
      row.className = "p-row";
      row.innerHTML = `<span class="av" style="background:${SEAT_COLORS[seats[k]].c}">${AVATARS[k]}</span>
        <input type="text" id="pn-${k}" maxlength="12" value="${esc(p.name)}" placeholder="Adı" aria-label="${k + 1}. oyuncunun adı" autocomplete="off">
        <div class="seg" role="radiogroup" aria-label="${k + 1}. oyuncu kim">
          <label><input type="radio" name="kind-${k}" id="kind-${k}-h" value="h" ${p.bot ? "" : "checked"}><span>İnsan</span></label>
          <label><input type="radio" name="kind-${k}" id="kind-${k}-b" value="b" ${p.bot ? "checked" : ""}><span>Bilgisayar</span></label>
        </div>`;
      box.appendChild(row);
    });
    $("add-player").disabled = settings.players.length >= 4;
    $("remove-player").disabled = settings.players.length <= 2;
    $("six-again").checked = settings.sixAgain;
    $("three-tries").checked = settings.threeTries;
    $("auto-one").checked = settings.autoOne;
    $("short-game").checked = settings.shortGame;
  }
  function readSetup(){
    settings.players = settings.players.map((_, k) => ({name:$("pn-" + k).value.trim(), bot:$(`kind-${k}-b`).checked}));
    settings.sixAgain = $("six-again").checked;
    settings.threeTries = $("three-tries").checked;
    settings.autoOne = $("auto-one").checked;
    settings.shortGame = $("short-game").checked;
  }
  $("add-player").addEventListener("click", () => { readSetup(); if (settings.players.length < 4) settings.players.push({name:"", bot:true}); renderSetup(); });
  $("remove-player").addEventListener("click", () => { readSetup(); if (settings.players.length > 2) settings.players.pop(); renderSetup(); });
  $("setup-form").addEventListener("submit", e => {
    e.preventDefault();
    readSetup();
    settings.players.forEach((p, k) => { if (!p.name) p.name = p.bot ? (settings.players.filter(q => q.bot).length > 1 ? `Robot ${k + 1}` : "Bilgisayar") : `Oyuncu ${k + 1}`; });
    try { localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings)); } catch(err) {}
    audio();
    newGame();
  });
  function openSetup(){ renderSetup(); $("end").hidden = true; $("setup").hidden = false; if (G) G.state = "over"; timers = []; anim = null; }
  $("open-setup").addEventListener("click", openSetup);
  $("end-setup").addEventListener("click", openSetup);
  $("again").addEventListener("click", newGame);

  if (!CanvasRenderingContext2D.prototype.roundRect){
    CanvasRenderingContext2D.prototype.roundRect = function(x, y, w, h, r){
      r = Math.min(r, w/2, h/2);
      this.moveTo(x + r, y); this.arcTo(x + w, y, x + w, y + h, r); this.arcTo(x + w, y + h, x, y + h, r);
      this.arcTo(x, y + h, x, y, r); this.arcTo(x, y, x + w, y, r); this.closePath();
    };
  }
  document.addEventListener("visibilitychange", () => { last = performance.now(); });
  if ("ResizeObserver" in window) new ResizeObserver(resize).observe($("boardWrap"));
  else window.addEventListener("resize", resize);
  renderSetup();
  renderDice(6);
  resize();
  requestAnimationFrame(frame);
})();
