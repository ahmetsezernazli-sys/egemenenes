/* Yılan Merdiven — 2-4 kişilik aile oyunu */
(function(){
  "use strict";

  const LADDERS = [[1, 38], [4, 14], [9, 31], [21, 42], [28, 84], [36, 44], [51, 67], [71, 91], [80, 100]];
  const SNAKES = [[16, 6], [47, 26], [49, 11], [56, 53], [62, 19], [64, 60], [87, 24], [93, 73], [95, 75], [98, 78]];
  const SNAKE_COLORS = ["#8E5CF5", "#E5484D", "#F2A541", "#2EC4C9", "#E4508F", "#6FBF3E", "#3D8BFD", "#FF7A2F", "#9A6A44", "#B84AD6"];
  const SEATS = [{c:"#3D6BF2", av:"🚀"}, {c:"#FF7A2F", av:"🎈"}, {c:"#E4508F", av:"🌸"}, {c:"#12A594", av:"⭐"}];
  const SQUARE_COLORS = ["#FFE9A8", "#FFD0B5", "#C9EBD9", "#C8E3FA", "#E6D6FA"];
  const NUMS = ["bir", "iki", "üç", "dört", "beş", "altı"];
  const DICE_DOTS = {1:[4], 2:[0, 8], 3:[0, 4, 8], 4:[0, 2, 6, 8], 5:[0, 2, 4, 6, 8], 6:[0, 2, 3, 5, 6, 8]};
  const SETTINGS_KEY = "yilan-merdiven-ayar", SOUND_KEY = "yilan-merdiven-ses";
  const RM = window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches;
  const EMOJI = '"Segoe UI Emoji","Apple Color Emoji","Noto Color Emoji",sans-serif';
  const FONT = '"Titan One", "Arial Rounded MT Bold", sans-serif';

  const $ = id => document.getElementById(id);
  const cv = $("cv"), ctx = cv.getContext("2d");
  const esc = s => String(s).replace(/[&<>"']/g, ch => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[ch]));

  let settings = {players:[{name:"Enes", bot:false}, {name:"Egemen", bot:false}], shortSnakes:true, exact:false, sixAgain:true};
  try { const s = JSON.parse(localStorage.getItem(SETTINGS_KEY) || "null"); if (s && Array.isArray(s.players) && s.players.length >= 2) settings = Object.assign(settings, s); } catch(e) {}
  let soundOn = true;
  try { soundOn = localStorage.getItem(SOUND_KEY) !== "0"; } catch(e) {}

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
    hop(k){ tone(440 + k*60, .08, "triangle", .1); },
    ladder(){ [523.25, 587.33, 659.25, 698.46, 783.99, 880, 987.77, 1046.5].forEach((f, i) => tone(f, .1, "triangle", .08, null, i*.08)); },
    snake(){ tone(900, .7, "sawtooth", .05, 150); },
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

  /* ---------- tahta ---------- */
  let size = 600, cell = 60, dpr = 1;
  function center(n){
    const idx = n - 1, row = Math.floor(idx/10), col = row % 2 === 0 ? idx % 10 : 9 - idx % 10;
    return [col*cell + cell/2, (9 - row)*cell + cell/2];
  }
  const snakeTo = (from, to) => settings.shortSnakes ? Math.max(to, from - 10) : to;

  function resize(){
    const wrap = $("boardWrap").getBoundingClientRect();
    size = Math.max(240, Math.floor(Math.min(wrap.width, wrap.height) - 16));
    cell = size/10;
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    cv.style.width = size + "px"; cv.style.height = size + "px";
    cv.width = Math.round(size*dpr); cv.height = Math.round(size*dpr);
    buildBoard();
  }

  const boardCanvas = document.createElement("canvas");
  function snakePoints(from, to){
    const [x1, y1] = center(from), [x2, y2] = center(to);
    const pts = [], dx = x2 - x1, dy = y2 - y1, len = Math.hypot(dx, dy), nx = -dy/len, ny = dx/len;
    const waves = Math.max(1.5, len/(cell*1.6)), amp = cell*.28;
    for (let i = 0; i <= 40; i++){
      const t = i/40, s = Math.sin(t*Math.PI*waves)*amp*Math.sin(Math.PI*t);
      pts.push([x1 + dx*t + nx*s, y1 + dy*t + ny*s]);
    }
    return pts;
  }
  function buildBoard(){
    boardCanvas.width = Math.round(size*dpr); boardCanvas.height = Math.round(size*dpr);
    const c = boardCanvas.getContext("2d");
    c.setTransform(dpr, 0, 0, dpr, 0, 0);
    for (let n = 1; n <= 100; n++){
      const [x, y] = center(n);
      c.fillStyle = SQUARE_COLORS[(Math.floor((n - 1)/10) + ((n - 1) % 10)) % SQUARE_COLORS.length];
      c.fillRect(x - cell/2, y - cell/2, cell, cell);
      c.fillStyle = "rgba(34,54,44,.55)"; c.font = `${Math.round(cell*.22)}px ${FONT}`; c.textAlign = "left"; c.textBaseline = "top";
      c.fillText(String(n), x - cell/2 + cell*.08, y - cell/2 + cell*.06);
    }
    c.strokeStyle = "rgba(34,54,44,.12)"; c.lineWidth = 1;
    for (let i = 1; i < 10; i++){ c.beginPath(); c.moveTo(i*cell, 0); c.lineTo(i*cell, size); c.moveTo(0, i*cell); c.lineTo(size, i*cell); c.stroke(); }
    // bitiş
    const [fx, fy] = center(100);
    c.font = `${Math.round(cell*.5)}px ${EMOJI}`; c.textAlign = "center"; c.textBaseline = "middle"; c.fillStyle = "#000";
    c.fillText("🏆", fx, fy + cell*.08);

    // merdivenler
    for (const [a, b] of LADDERS){
      const [x1, y1] = center(a), [x2, y2] = center(b);
      const dx = x2 - x1, dy = y2 - y1, len = Math.hypot(dx, dy), nx = -dy/len*cell*.16, ny = dx/len*cell*.16;
      c.strokeStyle = "rgba(0,0,0,.18)"; c.lineWidth = cell*.1; c.lineCap = "round";
      c.beginPath(); c.moveTo(x1 + nx + 3, y1 + ny + 4); c.lineTo(x2 + nx + 3, y2 + ny + 4); c.moveTo(x1 - nx + 3, y1 - ny + 4); c.lineTo(x2 - nx + 3, y2 - ny + 4); c.stroke();
      c.strokeStyle = "#A8703F"; c.lineWidth = cell*.09;
      c.beginPath(); c.moveTo(x1 + nx, y1 + ny); c.lineTo(x2 + nx, y2 + ny); c.moveTo(x1 - nx, y1 - ny); c.lineTo(x2 - nx, y2 - ny); c.stroke();
      const rungs = Math.max(2, Math.round(len/(cell*.45)));
      c.lineWidth = cell*.06; c.strokeStyle = "#C58B5A";
      c.beginPath();
      for (let i = 1; i < rungs; i++){ const t = i/rungs; c.moveTo(x1 + dx*t + nx, y1 + dy*t + ny); c.lineTo(x1 + dx*t - nx, y1 + dy*t - ny); }
      c.stroke();
    }
    // yılanlar
    SNAKES.forEach(([a, b0], k) => {
      const b = snakeTo(a, b0);
      if (b >= a) return;
      const pts = snakePoints(a, b), col = SNAKE_COLORS[k % SNAKE_COLORS.length];
      c.lineCap = "round"; c.lineJoin = "round";
      c.strokeStyle = "rgba(0,0,0,.2)"; c.lineWidth = cell*.24;
      c.beginPath(); pts.forEach(([x, y], i) => i ? c.lineTo(x + 3, y + 4) : c.moveTo(x + 3, y + 4)); c.stroke();
      c.strokeStyle = col; c.lineWidth = cell*.22;
      c.beginPath(); pts.forEach(([x, y], i) => i ? c.lineTo(x, y) : c.moveTo(x, y)); c.stroke();
      c.strokeStyle = "rgba(255,255,255,.35)"; c.lineWidth = cell*.06; c.setLineDash([cell*.12, cell*.14]);
      c.beginPath(); pts.forEach(([x, y], i) => i ? c.lineTo(x, y) : c.moveTo(x, y)); c.stroke(); c.setLineDash([]);
      const [hx, hy] = pts[0], [nx2, ny2] = pts[2], ang = Math.atan2(hy - ny2, hx - nx2);
      c.save(); c.translate(hx, hy); c.rotate(ang);
      c.fillStyle = col; c.beginPath(); c.ellipse(0, 0, cell*.2, cell*.16, 0, 0, Math.PI*2); c.fill();
      c.strokeStyle = "#E5484D"; c.lineWidth = cell*.03; c.beginPath(); c.moveTo(cell*.18, 0); c.lineTo(cell*.3, 0); c.lineTo(cell*.34, -cell*.04); c.moveTo(cell*.3, 0); c.lineTo(cell*.34, cell*.04); c.stroke();
      c.fillStyle = "#fff"; c.beginPath(); c.arc(cell*.06, -cell*.07, cell*.05, 0, Math.PI*2); c.arc(cell*.06, cell*.07, cell*.05, 0, Math.PI*2); c.fill();
      c.fillStyle = "#22362C"; c.beginPath(); c.arc(cell*.08, -cell*.07, cell*.025, 0, Math.PI*2); c.arc(cell*.08, cell*.07, cell*.025, 0, Math.PI*2); c.fill();
      c.restore();
    });
  }

  /* ---------- oyun ---------- */
  let G = null, anim = null, time = 0;

  function newGame(){
    G = {
      players:settings.players.map((p, i) => ({name:(p.name || "").trim() || (p.bot ? "Bilgisayar" : `Oyuncu ${i + 1}`), bot:!!p.bot, pos:0, x:null, y:null, c:SEATS[i].c, av:SEATS[i].av, finished:0})),
      turn:0, state:"idle", rank:0, lastRoll:null
    };
    $("setup").hidden = true; $("end").hidden = true;
    resize();
    renderPlayers(); renderDice(1);
    promptTurn();
  }

  function tokenXY(p, i){
    if (p.pos === 0){ return [-cell*.1 + i*cell*.28 + cell*.25, size + cell*.35]; }
    const [x, y] = center(p.pos);
    const same = G.players.filter(q => q.pos === p.pos && !q.moving);
    const k = same.indexOf(p);
    if (same.length <= 1 || k < 0) return [x, y];
    const off = cell*.18;
    return [x + (k % 2 ? off : -off), y + (k > 1 ? off : -off*.3)];
  }

  function renderPlayers(){
    $("players").innerHTML = G.players.map((p, i) => `<div class="pl${i === G.turn && G.state !== "over" ? " active" : ""}" style="--c:${p.c}"><span class="av">${p.av}</span><span class="nm">${esc(p.name)}${p.bot ? "<small>bilgisayar</small>" : ""}</span><b class="pos">${p.pos}</b></div>`).join("");
  }
  function renderDice(n){
    $("face").innerHTML = Array.from({length:9}, (_, k) => `<i class="${DICE_DOTS[n].includes(k) ? "on" : ""}"></i>`).join("");
  }
  function setMsg(t){ $("msg").textContent = t; }

  function promptTurn(){
    const p = G.players[G.turn];
    G.state = "idle";
    $("dice").disabled = p.bot;
    renderPlayers();
    setMsg(p.bot ? `${p.name} atıyor…` : `Sıra ${locative(p.name)}! Zarı at.`);
    if (p.bot) setTimeout(() => { if (G && G.state === "idle" && G.players[G.turn] === p) roll(); }, 900);
    else say(`Sıra ${locative(p.name)}.`);
  }

  function roll(){
    if (!G || G.state !== "idle") return;
    audio();
    G.state = "rolling";
    $("dice").disabled = true;
    const n = 1 + Math.floor(Math.random()*6);
    G.lastRoll = n;
    sfx.dice();
    const d = $("dice");
    if (!RM){ d.classList.remove("roll"); void d.offsetWidth; d.classList.add("roll"); }
    let flips = 0;
    const flipper = setInterval(() => { renderDice(1 + Math.floor(Math.random()*6)); if (++flips > 6){ clearInterval(flipper); renderDice(n); } }, 70);
    setTimeout(() => move(n), RM ? 150 : 650);
  }

  function move(n){
    const p = G.players[G.turn];
    let target = p.pos + n;
    if (target > 100){
      if (settings.exact){
        setMsg(`${n} attın ama 100'ü geçiyor. Tam ${100 - p.pos} lazım.`);
        say(`${NUMS[n - 1]}. Tam ${100 - p.pos} lazım.`);
        setTimeout(nextTurn, 1400);
        return;
      }
      target = 100;
    }
    say(`${NUMS[n - 1].charAt(0).toLocaleUpperCase("tr") + NUMS[n - 1].slice(1)}!`);
    setMsg(`${p.name} ${n} attı.`);
    const steps = [];
    for (let s = p.pos + 1; s <= target; s++) steps.push(s);
    G.state = "moving";
    p.moving = true;
    anim = {p, kind:"hop", steps, i:0, t:0, from:tokenXY(p, G.turn), count:0};
  }

  function afterSteps(p){
    const ladder = LADDERS.find(([a]) => a === p.pos);
    const snake = SNAKES.find(([a]) => a === p.pos);
    if (ladder){
      const [a, b] = ladder;
      sfx.ladder();
      setMsg(`🪜 Merdiven! ${a} karesinden ${b} karesine çıktın.`);
      say("Merdiven! Yukarı!");
      anim = {p, kind:"slide", path:[center(a), center(b)], t:0, dur:.9, to:b};
      return;
    }
    if (snake){
      const [a, b0] = snake, b = snakeTo(a, b0);
      if (b < a){
        sfx.snake();
        setMsg(`🐍 Yılan! ${a} karesinden ${b} karesine kaydın.`);
        say("Eyvah, yılan!");
        anim = {p, kind:"slide", path:snakePoints(a, b), t:0, dur:1.1, to:b};
        return;
      }
    }
    finishMove(p);
  }

  function finishMove(p){
    p.moving = false; anim = null;
    renderPlayers();
    if (p.pos >= 100){ win(p); return; }
    if (settings.sixAgain && G.lastRoll === 6){
      setMsg(`${p.name} 6 attı, bir daha atıyor!`);
      say("Altı! Bir daha at!", true);
      setTimeout(() => promptTurnSame(), 900);
      return;
    }
    setTimeout(nextTurn, 500);
  }
  function promptTurnSame(){ if (G && G.state !== "over") promptTurn(); }
  function nextTurn(){
    if (!G || G.state === "over") return;
    G.turn = (G.turn + 1) % G.players.length;
    promptTurn();
  }

  function win(p){
    G.state = "over";
    $("dice").disabled = true;
    sfx.win(); confetti();
    setMsg(`🏆 ${p.name} kazandı!`);
    say(`${p.name} kazandı! Tebrikler!`);
    const ranked = G.players.slice().sort((a, b) => b.pos - a.pos);
    $("end-title").textContent = `${p.name} kazandı!`;
    $("podium").innerHTML = ranked.map((q, k) => `<li><span>${k + 1}.</span><span class="av" style="background:${q.c}">${q.av}</span><span>${esc(q.name)}</span><span>${q.pos}. kare</span></li>`).join("");
    renderPlayers();
    setTimeout(() => { $("end").hidden = false; $("again").focus({preventScroll:true}); }, 1300);
  }

  function confetti(){
    if (RM) return;
    const layer = $("confetti"), colors = ["#FFD23F", "#3D6BF2", "#FF7A2F", "#E4508F", "#12A594", "#8E5CF5"];
    for (let i = 0; i < 90; i++){
      const el = document.createElement("i");
      el.style.left = Math.random()*100 + "%"; el.style.background = colors[i % colors.length];
      el.style.animationDelay = Math.random()*.6 + "s"; el.style.animationDuration = 2 + Math.random()*1.5 + "s";
      el.style.setProperty("--dx", (Math.random()*160 - 80) + "px"); el.style.setProperty("--r", (Math.random()*720 - 360) + "deg");
      layer.appendChild(el);
      setTimeout(() => el.remove(), 4000);
    }
  }

  /* ---------- animasyon ve çizim ---------- */
  function update(dt){
    time += dt;
    if (!anim) return;
    const p = anim.p;
    if (anim.kind === "hop"){
      const hopDur = RM ? .05 : .26;
      anim.t += dt;
      if (anim.t >= hopDur){
        anim.t = 0;
        p.pos = anim.steps[anim.i];
        anim.count++;
        sfx.hop(anim.count);
        anim.from = center(p.pos);
        anim.i++;
        if (anim.i >= anim.steps.length){ anim = null; setTimeout(() => afterSteps(p), 250); }
      }
    } else if (anim.kind === "slide"){
      anim.t += dt;
      if (anim.t >= anim.dur){ p.pos = anim.to; finishMove(p); }
    }
  }

  function samplePath(path, u){
    const segs = path.length - 1, f = Math.min(segs - 1e-6, u*segs), i = Math.floor(f), t = f - i;
    return [path[i][0] + (path[i + 1][0] - path[i][0])*t, path[i][1] + (path[i + 1][1] - path[i][1])*t];
  }

  function drawToken(p, x, y, lift){
    const r = cell*.3;
    ctx.fillStyle = "rgba(0,0,0,.25)"; ctx.beginPath(); ctx.ellipse(x, y + r*.9, r*.8, r*.3, 0, 0, Math.PI*2); ctx.fill();
    ctx.fillStyle = p.c; ctx.beginPath(); ctx.arc(x, y - lift, r, 0, Math.PI*2); ctx.fill();
    ctx.strokeStyle = "#fff"; ctx.lineWidth = Math.max(2, cell*.05); ctx.stroke();
    ctx.fillStyle = "#000"; ctx.font = `${Math.round(r*1.15)}px ${EMOJI}`; ctx.textAlign = "center"; ctx.textBaseline = "middle";
    ctx.fillText(p.av, x, y - lift + r*.05);
  }

  function draw(){
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, cv.width, cv.height);
    ctx.drawImage(boardCanvas, 0, 0);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    if (!G) return;
    G.players.forEach((p, i) => {
      if (anim && anim.p === p) return;
      if (p.pos === 0) return;
      const [x, y] = tokenXY(p, i);
      drawToken(p, x, y, 0);
    });
    if (anim){
      const p = anim.p;
      if (anim.kind === "hop"){
        const next = anim.steps[anim.i], a = anim.from[0] != null && p.pos ? center(p.pos) : [cell*.5, size - cell*.5];
        const b = center(next), u = Math.min(1, anim.t/(RM ? .05 : .26));
        const x = a[0] + (b[0] - a[0])*u, y = a[1] + (b[1] - a[1])*u;
        drawToken(p, x, y, Math.sin(Math.PI*u)*cell*.35);
        // adım sayacı
        ctx.fillStyle = "#22362C"; ctx.beginPath(); ctx.arc(x, y - cell*.85, cell*.22, 0, Math.PI*2); ctx.fill();
        ctx.fillStyle = "#FFD23F"; ctx.font = `${Math.round(cell*.28)}px ${FONT}`; ctx.textAlign = "center"; ctx.textBaseline = "middle";
        ctx.fillText(String(anim.count + (u > .5 ? 1 : 0) || 1), x, y - cell*.84);
      } else {
        const u = anim.t/anim.dur, e = u < .5 ? 2*u*u : 1 - Math.pow(-2*u + 2, 2)/2;
        const [x, y] = samplePath(anim.path, e);
        drawToken(p, x, y, cell*.1);
      }
    }
    // başlangıçtaki piyonlar tahtanın altında değil, 1. karenin yanında bekler
    const waiting = G.players.filter(p => p.pos === 0 && !(anim && anim.p === p));
    waiting.forEach((p, k) => {
      const [x, y] = center(1);
      drawToken(p, x - cell*.22 + k*cell*.15, y + cell*.05 - k*cell*.08, 0);
    });
  }

  let last = performance.now();
  function frame(now){
    const dt = Math.min(.05, (now - last)/1000); last = now;
    update(dt); draw();
    requestAnimationFrame(frame);
  }

  $("dice").addEventListener("click", roll);
  window.addEventListener("keydown", e => {
    if (!$("setup").hidden || (e.target && e.target.tagName === "INPUT")) return;
    if (!$("end").hidden){ if (e.key === "Enter"){ e.preventDefault(); newGame(); } return; }
    if (e.key === " " || e.key === "Enter"){ e.preventDefault(); if (G && !G.players[G.turn].bot) roll(); }
  });

  /* ---------- ayarlar ---------- */
  function renderSetup(){
    const box = $("p-rows");
    box.innerHTML = "";
    settings.players.forEach((p, i) => {
      const row = document.createElement("div");
      row.className = "p-row";
      row.innerHTML = `<span class="av" style="background:${SEATS[i].c}">${SEATS[i].av}</span>
        <input type="text" id="pn-${i}" maxlength="12" value="${esc(p.name)}" placeholder="Adı" aria-label="${i + 1}. oyuncunun adı" autocomplete="off">
        <div class="seg" role="radiogroup" aria-label="${i + 1}. oyuncu kim">
          <label><input type="radio" name="kind-${i}" id="kind-${i}-h" value="h" ${p.bot ? "" : "checked"}><span>İnsan</span></label>
          <label><input type="radio" name="kind-${i}" id="kind-${i}-b" value="b" ${p.bot ? "checked" : ""}><span>Bilgisayar</span></label>
        </div>`;
      box.appendChild(row);
    });
    $("add-player").disabled = settings.players.length >= 4;
    $("remove-player").disabled = settings.players.length <= 2;
    $("short-snakes").checked = settings.shortSnakes;
    $("exact").checked = settings.exact;
    $("six-again").checked = settings.sixAgain;
  }
  function readSetup(){
    settings.players = settings.players.map((_, i) => ({name:$("pn-" + i).value.trim(), bot:$(`kind-${i}-b`).checked}));
    settings.shortSnakes = $("short-snakes").checked;
    settings.exact = $("exact").checked;
    settings.sixAgain = $("six-again").checked;
  }
  $("add-player").addEventListener("click", () => { readSetup(); if (settings.players.length < 4) settings.players.push({name:"", bot:true}); renderSetup(); });
  $("remove-player").addEventListener("click", () => { readSetup(); if (settings.players.length > 2) settings.players.pop(); renderSetup(); });
  $("setup-form").addEventListener("submit", e => {
    e.preventDefault();
    readSetup();
    settings.players.forEach((p, i) => { if (!p.name) p.name = p.bot ? (settings.players.filter(q => q.bot).length > 1 ? `Robot ${i + 1}` : "Bilgisayar") : `Oyuncu ${i + 1}`; });
    try { localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings)); } catch(err) {}
    audio();
    newGame();
  });
  function openSetup(){ renderSetup(); $("end").hidden = true; $("setup").hidden = false; if (G) G.state = "over"; }
  $("open-setup").addEventListener("click", openSetup);
  $("end-setup").addEventListener("click", openSetup);
  $("again").addEventListener("click", newGame);

  if ("ResizeObserver" in window) new ResizeObserver(resize).observe($("boardWrap"));
  else window.addEventListener("resize", resize);
  renderSetup();
  renderDice(6);
  resize();
  requestAnimationFrame(frame);
})();
