/* Gökdelen — katları üst üste diz; takım ya da yarış */
(function(){
  "use strict";

  const BH = 40, BASE_W = 240, SWING = 230, HOVER = BH*3.5, MIN_W = 10;
  const LEVELS = [
    {name:"Kolay",  speed:.55, tol:22, grow:12, magnet:.65},  // mıknatıs: kat, alttakinin üçte birine değiyorsa tam oturur
    {name:"Normal", speed:.85, tol:9,  grow:0},
    {name:"Zor",    speed:1.15, tol:4, grow:0}
  ];
  const AVATARS = ["🚀", "🎈", "🌟", "🐱"];
  const COLORS = ["#3D7BF2", "#FF8A1F", "#2DBE6C", "#D94FD5"];
  const DEFAULT_NAMES = ["Enes", "Egemen", "Anne", "Baba"];
  const SETTINGS_KEY = "gokdelen-ayar", RECORD_KEY = "gokdelen-rekor", SOUND_KEY = "gokdelen-ses";
  const NOTES = [523.25, 587.33, 659.25, 698.46, 783.99, 880, 987.77, 1046.5, 1174.66, 1318.5];
  const RM = window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches;
  const TAU = Math.PI*2;
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const lerp = (a, b, t) => a + (b - a)*t;
  const hash = n => { const x = Math.sin(n*127.1 + 311.7)*43758.5453; return x - Math.floor(x); };
  const $ = id => document.getElementById(id);

  /* ---------- ayarlar ---------- */
  let settings = {mode:"team", target:25, players:[{name:"Enes", lvl:1}, {name:"Egemen", lvl:0}]};
  try {
    const s = JSON.parse(localStorage.getItem(SETTINGS_KEY));
    if (s && Array.isArray(s.players) && s.players.length){
      settings.mode = s.mode === "race" ? "race" : "team";
      settings.target = [15, 25, 40].includes(s.target) ? s.target : 25;
      settings.players = s.players.slice(0, 4).map((p, i) => ({name:String(p.name || "").slice(0, 12) || DEFAULT_NAMES[i], lvl:clamp(p.lvl | 0, 0, 2)}));
    }
  } catch(e) {}
  let record = 0;
  try { record = (JSON.parse(localStorage.getItem(RECORD_KEY)) || {}).floors || 0; } catch(e) {}
  let soundOn = true;
  try { soundOn = localStorage.getItem(SOUND_KEY) !== "0"; } catch(e) {}

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
  function noise(dur, freq, vol, delay){
    const a = audio(); if (!a || !soundOn) return;
    const len = Math.floor(a.sampleRate*dur), buf = a.createBuffer(1, len, a.sampleRate), d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = (Math.random()*2 - 1)*Math.pow(1 - i/len, 2);
    const s = a.createBufferSource(); s.buffer = buf;
    const f = a.createBiquadFilter(); f.type = "lowpass"; f.frequency.value = freq;
    const g = a.createGain(); g.gain.value = vol;
    s.connect(f).connect(g).connect(a.destination); s.start(a.currentTime + (delay || 0));
  }
  const sfx = {
    drop(){ tone(420, .12, "sine", .06, 260); },
    place(){ noise(.12, 500, .45); tone(150, .12, "square", .06, 80); },
    cut(){ noise(.18, 1800, .25); tone(240, .1, "triangle", .08, 160); },
    perfect(c){ const f = NOTES[clamp(c - 1, 0, NOTES.length - 1)]; tone(f, .25, "triangle", .14); tone(f*2, .3, "sine", .05, null, .05); noise(.08, 500, .3); },
    miss(){ tone(700, .7, "sine", .1, 110); noise(.5, 700, .5, .55); },
    turn(){ tone(880, .08, "sine", .06); tone(1175, .12, "sine", .06, null, .07); },
    win(){ [523.25, 659.25, 783.99, 1046.5, 783.99, 1046.5, 1318.5].forEach((f, i) => tone(f, .3, "triangle", .13, null, i*.13)); },
    over(){ [392, 330, 262].forEach((f, i) => tone(f, .35, "triangle", .12, null, i*.18)); }
  };
  function renderSound(){
    $("ic-on").hidden = !soundOn; $("ic-off").hidden = soundOn;
    $("sound").setAttribute("aria-label", soundOn ? "Sesi kapat" : "Sesi aç");
    $("sound").setAttribute("aria-pressed", String(soundOn));
  }
  $("sound").addEventListener("click", () => {
    soundOn = !soundOn;
    try { localStorage.setItem(SOUND_KEY, soundOn ? "1" : "0"); } catch(e) {}
    renderSound();
  });
  renderSound();

  function gen(name){
    const m = name.toLocaleLowerCase("tr").match(/[aeıioöuü](?=[^aeıioöuü]*$)/), v = m ? m[0] : "e";
    const hv = {a:"ı", ı:"ı", e:"i", i:"i", o:"u", u:"u", ö:"ü", ü:"ü"}[v];
    return `${name}'${/[aeıioöuü]$/i.test(name) ? "n" : ""}${hv}n`;
  }

  /* ---------- oyun durumu ---------- */
  const stage = $("stage"), cv = $("cv"), ctx = cv.getContext("2d");
  let phase = "setup";          // setup | play | end
  let mode = "team", target = 25, players = [];
  let towers = [], time = 0, endT = 0;

  function newTower(owners){
    return {owners, turn:0, blocks:[{x:300, w:BASE_W, c:"#8E97AD", base:true}], cur:null, spawnT:.5,
      camY:-80, debris:[], pops:[], flash:[], combo:0, lives:3, stun:0, missStreak:0, helpNext:false,
      perfects:owners.map(() => 0), placed:owners.map(() => 0), done:false, shake:0, won:false};
  }
  const floors = t => t.blocks.length - 1;
  const topY = t => t.blocks.length*BH;
  const top = t => t.blocks[t.blocks.length - 1];

  function spawn(t){
    const owner = t.owners[t.turn % t.owners.length], lv = LEVELS[players[owner].lvl];
    const side = t.blocks.length % 2 ? 1 : -1, tp = top(t);
    t.cur = {x:300 + side*SWING, w:tp.w, dir:-side, y:topY(t) + HOVER, vy:0, state:"swing", owner,
      speed:Math.min(560, 240 + floors(t)*6)*lv.speed};
    if (mode === "team" && t.owners.length > 1) showTurn(owner);
  }
  function showTurn(owner){
    const el = $("turn"), p = players[owner];
    el.hidden = false; el.style.setProperty("--c", COLORS[owner]);
    $("turn-av").textContent = AVATARS[owner]; $("turn-name").textContent = `${gen(p.name)} sırası`;
    el.classList.remove("bump"); void el.offsetWidth; el.classList.add("bump");
    sfx.turn();
  }

  function drop(t){
    if (phase !== "play" || !t || t.done || !t.cur || t.cur.state !== "swing" || t.stun > 0) return;
    t.cur.state = "drop"; t.cur.vy = -200;
    sfx.drop();
  }

  function land(t){
    const c = t.cur, tp = top(t), owner = c.owner, lv = LEVELS[players[owner].lvl];
    const tol = Math.max(lv.tol, c.w*(lv.magnet || 0), t.helpNext ? 40 : 0);
    const dx = c.x - tp.x;
    t.cur = null;
    if (Math.abs(dx) <= tol){
      t.combo++; t.missStreak = 0; t.helpNext = false;
      let w = tp.w;
      if (lv.grow) w = Math.min(BASE_W, w + lv.grow);
      else if (t.combo % 3 === 0) w = Math.min(BASE_W, w + 10);
      t.blocks.push({x:tp.x, w, c:COLORS[owner]});
      t.perfects[owner]++; t.placed[owner]++;
      sfx.perfect(t.combo);
      pop(t, t.combo > 1 ? `Mükemmel ×${t.combo}` : "Mükemmel!", tp.x, topY(t) + 10, "#FFE45C");
      t.flash.push({x:tp.x, w, y:topY(t) - BH, life:.4});
    } else {
      const l = Math.max(c.x - c.w/2, tp.x - tp.w/2), r = Math.min(c.x + c.w/2, tp.x + tp.w/2), ov = r - l;
      t.combo = 0;
      if (ov < MIN_W){
        t.debris.push({x:c.x, y:c.y, w:c.w, vx:c.dir*c.speed*.4, vy:0, rot:0, vr:c.dir*1.5, c:COLORS[owner]});
        sfx.miss(); t.shake = .45; t.missStreak++;
        pop(t, "Kaçtı!", tp.x, topY(t) + 30, "#FFFFFF");
        if (mode === "team"){
          t.lives--;
          if (t.lives <= 0){ t.done = true; endT = 1.6; }
        } else {
          t.stun = .9;
          if (t.missStreak >= 2) t.helpNext = true;
        }
      } else {
        t.missStreak = 0; t.helpNext = false;
        const nx = (l + r)/2;
        t.blocks.push({x:nx, w:ov, c:COLORS[owner]});
        t.placed[owner]++;
        const cutW = c.w - ov, cutX = dx > 0 ? r + cutW/2 : l - cutW/2;
        t.debris.push({x:cutX, y:c.y, w:cutW, vx:Math.sign(dx)*90, vy:40, rot:0, vr:Math.sign(dx)*2.5, c:COLORS[owner]});
        sfx.place(); sfx.cut(); t.shake = .12;
      }
    }
    if (t.done) return;
    t.turn++;
    if (mode === "race" && floors(t) >= target){
      t.done = true; t.won = true;
      towers.forEach(o => { if (o !== t) o.done = true; });
      sfx.win(); endT = 1.8;
      return;
    }
    t.spawnT = mode === "team" && t.owners.length > 1 ? .45 : .22;
  }
  function pop(t, text, x, y, color){ t.pops.push({text, x, y, life:1.1, color}); }

  function startGame(){
    mode = settings.mode; target = settings.target;
    players = settings.players.map(p => ({...p}));
    if (mode === "race"){
      players = players.slice(0, 2);
      towers = [newTower([0]), newTower([1])];
    } else {
      towers = [newTower(players.map((_, i) => i))];
    }
    $("turn").hidden = true;
    phase = "play"; endT = 0;
  }

  function finish(){
    phase = "end"; $("turn").hidden = true;
    const stats = $("end-stats"); stats.innerHTML = "";
    if (mode === "team"){
      const t = towers[0], n = floors(t);
      const isNew = n > record;
      if (isNew){ record = n; try { localStorage.setItem(RECORD_KEY, JSON.stringify({floors:n})); } catch(e) {} }
      $("end-icon").textContent = n >= 60 ? "🚀" : n >= 30 ? "🌙" : "🏙️";
      $("end-title").textContent = `${n} kat!`;
      $("end-note").innerHTML = isNew && n > 0 ? "<strong>Yeni rekor!</strong>" : `Rekor: ${record} kat`;
      players.forEach((p, i) => stats.appendChild(statRow(i, p.name, `${t.placed[i]} kat koydu`, `${t.perfects[i]} ★`)));
      sfx.over();
    } else {
      const w = towers.findIndex(t => t.won);
      $("end-icon").textContent = "🏆";
      $("end-title").textContent = w >= 0 ? `Kazanan: ${players[w].name}!` : "Berabere!";
      $("end-note").textContent = `Hedef: ${target} kat`;
      players.forEach((p, i) => stats.appendChild(statRow(i, p.name, LEVELS[p.lvl].name, `${floors(towers[i])} kat`)));
    }
    $("end").hidden = false; $("again").focus();
  }
  function statRow(i, name, sub, val){
    const li = document.createElement("li");
    li.innerHTML = `<span class="av" style="background:${COLORS[i]}">${AVATARS[i]}</span><span></span><b></b>`;
    li.children[1].textContent = name;
    const sm = document.createElement("small"); sm.textContent = sub; li.children[1].appendChild(sm);
    li.children[2].textContent = val;
    return li;
  }
  $("again").addEventListener("click", () => { $("end").hidden = true; startGame(); });
  $("change").addEventListener("click", () => { $("end").hidden = true; openSetup(); });
  $("menu").addEventListener("click", openSetup);

  /* ---------- kurulum ---------- */
  function renderRows(){
    const box = $("p-rows"); box.innerHTML = "";
    const race = settings.mode === "race";
    if (race){
      while (settings.players.length < 2) settings.players.push({name:DEFAULT_NAMES[settings.players.length], lvl:1});
    }
    const list = race ? settings.players.slice(0, 2) : settings.players;
    list.forEach((p, i) => {
      const row = document.createElement("div"); row.className = "p-row";
      row.innerHTML = `<span class="av" style="background:${COLORS[i]}">${AVATARS[i]}</span>
        <input type="text" id="pn-${i}" maxlength="12" aria-label="${i + 1}. oyuncunun adı">
        <div class="seg" role="radiogroup" aria-label="${i + 1}. oyuncunun seviyesi">${LEVELS.map((L, k) => `<label><input type="radio" name="lvl-${i}" id="lvl-${i}-${k}" value="${k}"${p.lvl === k ? " checked" : ""}><span>${L.name}</span></label>`).join("")}</div>
        <button class="rm" type="button" aria-label="${i + 1}. oyuncuyu çıkar">×</button>`;
      const inp = row.querySelector("input[type=text]"); inp.value = p.name;
      inp.addEventListener("input", () => { p.name = inp.value; });
      row.querySelectorAll(`input[name="lvl-${i}"]`).forEach(r => r.addEventListener("change", () => { p.lvl = +r.value; }));
      const rm = row.querySelector(".rm"); rm.disabled = race || settings.players.length === 1;
      rm.addEventListener("click", () => { settings.players.splice(i, 1); renderRows(); });
      box.appendChild(row);
    });
    $("add-player").hidden = race;
    $("add-player").disabled = settings.players.length >= 4;
    $("target-set").hidden = !race;
    $("records").hidden = !record;
    $("records").innerHTML = `En yüksek kule: <b>${record} kat</b>`;
  }
  $("add-player").addEventListener("click", () => {
    const n = settings.players.length;
    settings.players.push({name:DEFAULT_NAMES.find(d => !settings.players.some(p => p.name === d)) || `Oyuncu ${n + 1}`, lvl:1});
    renderRows();
  });
  document.querySelectorAll('input[name="mode"]').forEach(r => r.addEventListener("change", () => { settings.mode = r.value; renderRows(); }));
  document.querySelectorAll('input[name="target"]').forEach(r => r.addEventListener("change", () => { settings.target = +r.value; }));
  function openSetup(){
    phase = "setup"; $("turn").hidden = true; $("end").hidden = true;
    $("mode-" + settings.mode).checked = true;
    const tg = $("target-" + settings.target); if (tg) tg.checked = true;
    renderRows(); $("setup").hidden = false;
  }
  $("setup-form").addEventListener("submit", e => {
    e.preventDefault(); audio();
    settings.players.forEach((p, i) => { p.name = p.name.trim().slice(0, 12) || DEFAULT_NAMES[i]; });
    try { localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings)); } catch(e) {}
    $("setup").hidden = true;
    startGame();
  });

  /* ---------- giriş ---------- */
  cv.addEventListener("pointerdown", e => {
    if (phase !== "play") return;
    e.preventDefault(); audio();
    if (mode === "team") drop(towers[0]);
    else { const r = cv.getBoundingClientRect(); drop(towers[e.clientX - r.left < r.width/2 ? 0 : 1]); }
  });
  window.addEventListener("keydown", e => {
    if (phase !== "play" || e.repeat || e.target.tagName === "INPUT") return;
    if (mode === "team" && (e.key === " " || e.key === "Enter" || e.key === "ArrowDown")){ e.preventDefault(); audio(); drop(towers[0]); }
    if (mode === "race"){
      if (e.code === "KeyA" || e.code === "KeyS"){ e.preventDefault(); audio(); drop(towers[0]); }
      if (e.code === "KeyL" || e.code === "KeyK" || e.key === "Enter"){ e.preventDefault(); audio(); drop(towers[1]); }
    }
  });

  /* ---------- güncelle ---------- */
  function updateTower(t, dt, VH){
    if (t.stun > 0) t.stun -= dt;
    if (!t.cur && !t.done && phase === "play"){ t.spawnT -= dt; if (t.spawnT <= 0 && t.stun <= 0) spawn(t); }
    const c = t.cur;
    if (c){
      if (c.state === "swing"){
        c.x += c.dir*c.speed*dt;
        if (c.x > 300 + SWING){ c.x = 300 + SWING; c.dir = -1; }
        if (c.x < 300 - SWING){ c.x = 300 - SWING; c.dir = 1; }
        c.y = topY(t) + HOVER + (RM ? 0 : Math.sin(time*3)*3);
      } else {
        c.vy -= 2600*dt; c.y += c.vy*dt;
        if (c.y <= topY(t)){ c.y = topY(t); land(t); }
      }
    }
    for (let i = t.debris.length - 1; i >= 0; i--){
      const d = t.debris[i]; d.vy -= 1500*dt; d.x += d.vx*dt; d.y += d.vy*dt; d.rot += d.vr*dt;
      if (d.y < t.camY - 300) t.debris.splice(i, 1);
    }
    for (let i = t.pops.length - 1; i >= 0; i--){ const p = t.pops[i]; p.life -= dt; p.y += 40*dt; if (p.life <= 0) t.pops.splice(i, 1); }
    for (let i = t.flash.length - 1; i >= 0; i--){ t.flash[i].life -= dt; if (t.flash[i].life <= 0) t.flash.splice(i, 1); }
    t.shake = Math.max(0, t.shake - dt);
    const want = Math.max(-80, topY(t) + HOVER + BH - VH*.7);
    t.camY += (want - t.camY)*Math.min(1, dt*3);
  }
  function update(dt){
    time += dt;
    const vs = viewports();
    towers.forEach((t, i) => updateTower(t, dt, vs[i] ? vs[i].vh/vs[i].s : 520));
    if (endT > 0 && phase === "play"){ endT -= dt; if (endT <= 0) finish(); }
  }

  /* ---------- çizim ---------- */
  const view = {w:1, h:1, dpr:1};
  function resize(){
    const r = stage.getBoundingClientRect();
    view.dpr = Math.min(window.devicePixelRatio || 1, 2);
    view.w = r.width; view.h = r.height;
    cv.width = Math.round(r.width*view.dpr); cv.height = Math.round(r.height*view.dpr);
  }
  function viewports(){
    const n = Math.max(1, towers.length), vw = view.w/n;
    return Array.from({length:n}, (_, i) => ({vx:i*vw, vy:0, vw, vh:view.h, s:Math.min(vw/620, view.h/560)}));
  }

  const SKY = [
    [0,  "#7CC8F7", "#D8F1FF"],
    [18, "#6FB6F0", "#CFEAFF"],
    [28, "#F5875E", "#FFD49A"],
    [40, "#23295C", "#5B4B8A"],
    [58, "#070A1E", "#1A2150"],
    [999, "#02030A", "#0B1030"]
  ];
  function hexToRgb(h){ return [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16)); }
  function mix(a, b, t){ const A = hexToRgb(a), B = hexToRgb(b); return `rgb(${A.map((v, i) => Math.round(lerp(v, B[i], t))).join(",")})`; }
  function skyAt(fl){
    for (let i = 0; i < SKY.length - 1; i++){
      const [f0, t0, b0] = SKY[i], [f1, t1, b1] = SKY[i + 1];
      if (fl <= f1){ const u = clamp((fl - f0)/(f1 - f0), 0, 1); return [mix(t0, t1, u), mix(b0, b1, u)]; }
    }
    return [SKY[SKY.length - 1][1], SKY[SKY.length - 1][2]];
  }
  const STARS = Array.from({length:90}, (_, i) => ({x:hash(i + 1), y:hash(i + 99), r:hash(i + 7)*1.6 + .4}));

  function drawSky(t, v){
    const VH = v.vh/v.s, mid = (t.camY + VH/2)/BH;
    const [c0, c1] = skyAt(mid);
    const g = ctx.createLinearGradient(0, v.vy, 0, v.vy + v.vh);
    g.addColorStop(0, c0); g.addColorStop(1, c1);
    ctx.fillStyle = g; ctx.fillRect(v.vx, v.vy, v.vw, v.vh);
    const sa = clamp((mid - 32)/14, 0, 1);
    if (sa > 0){
      ctx.fillStyle = "#FFFFFF";
      for (const s of STARS){
        const y = ((s.y*v.vh + t.camY*v.s*.15) % v.vh + v.vh) % v.vh;
        ctx.globalAlpha = sa*(.5 + .5*Math.sin(time*2 + s.x*40));
        ctx.beginPath(); ctx.arc(v.vx + s.x*v.vw, v.vy + v.vh - y, s.r, 0, TAU); ctx.fill();
      }
      ctx.globalAlpha = 1;
    }
  }

  // Dünya koordinatı: x 0..600, y yukarı doğru; çizimde y ters çevrilir
  function drawDecor(t, xl, xr, y0, y1){
    // bulutlar
    for (let k = 0; k < 40; k++){
      const y = 220 + k*150 + hash(k)*90;
      if (y > 36*BH) break;
      if (y < y0 - 60 || y > y1 + 60) continue;
      const span = xr - xl + 300, x = xl - 150 + ((hash(k + 50)*span + time*(8 + hash(k)*14)) % span);
      cloud(x, -y, .7 + hash(k + 3)*.7);
    }
    // kuşlar
    for (let k = 0; k < 8; k++){
      const y = (6 + k*2.2)*BH + hash(k + 20)*40;
      if (y < y0 || y > y1) continue;
      const x = ((hash(k + 30)*900 + time*40*(k % 2 ? 1 : -1)) % 1000 + 1000) % 1000 - 200;
      const f = Math.sin(time*8 + k)*6;
      ctx.strokeStyle = "#2B3560"; ctx.lineWidth = 3; ctx.lineCap = "round";
      ctx.beginPath(); ctx.moveTo(x - 12, -y - f); ctx.quadraticCurveTo(x - 5, -y - 6, x, -y); ctx.quadraticCurveTo(x + 5, -y - 6, x + 12, -y - f); ctx.stroke();
    }
    // sıcak hava balonu
    if (18*BH < y1 + 80 && 18*BH > y0 - 80) balloon(70 + Math.sin(time*.4)*20, -(18*BH + Math.sin(time*.7)*10));
    // uçak
    const py = 30*BH;
    if (py < y1 + 40 && py > y0 - 40){
      const px = ((time*120) % 1600) - 500;
      ctx.fillStyle = "#F5F7FF"; ctx.beginPath(); ctx.ellipse(px, -py, 44, 9, 0, 0, TAU); ctx.fill();
      ctx.beginPath(); ctx.moveTo(px - 4, -py); ctx.lineTo(px - 22, -py + 26); ctx.lineTo(px + 8, -py); ctx.fill();
      ctx.beginPath(); ctx.moveTo(px - 30, -py); ctx.lineTo(px - 44, -py - 18); ctx.lineTo(px - 24, -py - 4); ctx.fill();
      ctx.fillStyle = "#3D7BF2"; for (let k = 0; k < 5; k++) ctx.fillRect(px + 14 - k*10, -py - 3, 5, 4);
    }
    // ay
    const my = 48*BH;
    if (my < y1 + 80 && my > y0 - 80){
      ctx.fillStyle = "#FFF3C4"; ctx.beginPath(); ctx.arc(500, -my, 42, 0, TAU); ctx.fill();
      ctx.fillStyle = "rgba(200,180,120,.35)"; [[486, -my - 10, 9], [512, -my + 12, 7], [508, -my - 18, 5]].forEach(([x, y, r]) => { ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fill(); });
    }
    // uydu
    const sy = 64*BH;
    if (sy < y1 + 60 && sy > y0 - 60){
      const sx = 90 + Math.sin(time*.5)*30;
      ctx.save(); ctx.translate(sx, -sy); ctx.rotate(Math.sin(time*.3)*.3);
      ctx.fillStyle = "#4C7BD9"; ctx.fillRect(-46, -8, 30, 16); ctx.fillRect(16, -8, 30, 16);
      ctx.fillStyle = "#D9DEEA"; ctx.fillRect(-14, -12, 28, 24);
      ctx.strokeStyle = "#D9DEEA"; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(0, -12); ctx.lineTo(0, -26); ctx.stroke();
      ctx.restore();
    }
    // halkalı gezegen
    const gy = 82*BH;
    if (gy < y1 + 100 && gy > y0 - 100){
      ctx.fillStyle = "#E7A86B"; ctx.beginPath(); ctx.arc(470, -gy, 48, 0, TAU); ctx.fill();
      ctx.strokeStyle = "rgba(255,230,180,.8)"; ctx.lineWidth = 8; ctx.beginPath(); ctx.ellipse(470, -gy, 84, 18, -.3, 0, TAU); ctx.stroke();
    }
  }
  function cloud(x, y, s){
    ctx.fillStyle = "rgba(255,255,255,.85)";
    ctx.beginPath(); ctx.moveTo(x + 22*s, y); ctx.arc(x, y, 22*s, 0, TAU); ctx.moveTo(x + 54*s, y - 10*s); ctx.arc(x + 26*s, y - 10*s, 28*s, 0, TAU);
    ctx.moveTo(x + 78*s, y); ctx.arc(x + 56*s, y, 22*s, 0, TAU); ctx.rect(x, y - 2*s, 56*s, 24*s); ctx.fill("nonzero");
  }
  function balloon(x, y){
    ctx.strokeStyle = "#6B4A2B"; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(x - 16, y + 18); ctx.lineTo(x - 8, y + 44); ctx.moveTo(x + 16, y + 18); ctx.lineTo(x + 8, y + 44); ctx.stroke();
    ctx.fillStyle = "#E84A3C"; ctx.beginPath(); ctx.arc(x, y - 10, 32, 0, TAU); ctx.fill();
    ctx.fillStyle = "#FFC23D"; ctx.beginPath(); ctx.ellipse(x, y - 10, 12, 32, 0, 0, TAU); ctx.fill();
    ctx.fillStyle = "#8B5A2B"; ctx.fillRect(x - 10, y + 42, 20, 14);
  }

  function drawGround(xl, xr){
    // arka plandaki şehir
    for (let k = -8; k < 16; k++){
      const x = k*70 + 10, h = 60 + hash(k + 200)*120, w = 58;
      if (x + w < xl || x > xr) continue;
      if (x > 150 && x < 450) continue;
      ctx.fillStyle = "#9FB3D1"; ctx.fillRect(x, -h, w, h);
      ctx.fillStyle = "#C9D6EA";
      for (let wy = 14; wy < h - 10; wy += 22) for (let wx = 8; wx < w - 10; wx += 16) ctx.fillRect(x + wx, -h + wy, 8, 10);
    }
    ctx.fillStyle = "#5C6378"; ctx.fillRect(xl - 10, 0, xr - xl + 20, 60);
    ctx.fillStyle = "#B8BFCC"; ctx.fillRect(xl - 10, 0, xr - xl + 20, 10);
    ctx.fillStyle = "#F5F7FF";
    for (let x = Math.floor(xl/60)*60; x < xr; x += 60) ctx.fillRect(x, 32, 30, 5);
    ctx.fillStyle = "#3F4556"; ctx.fillRect(xl - 10, 60, xr - xl + 20, 400);
    // ağaçlar
    for (const tx of [120, 480, -40, 640]){
      if (tx < xl - 30 || tx > xr + 30) continue;
      ctx.fillStyle = "#7A5230"; ctx.fillRect(tx - 4, -30, 8, 30);
      ctx.fillStyle = "#3FA34D"; ctx.beginPath(); ctx.arc(tx, -40, 20, 0, TAU); ctx.fill();
    }
    // bariyer
    ctx.fillStyle = "#FFC23D"; ctx.fillRect(160, -16, 280, 6);
    ctx.fillStyle = "#1D2440"; for (let x = 170; x < 440; x += 28) ctx.fillRect(x, -16, 12, 6);
  }

  function drawBlock(b, y, night){
    const x0 = b.x - b.w/2, yt = -(y + BH);
    if (b.base){
      ctx.fillStyle = b.c; ctx.fillRect(x0, yt, b.w, BH);
      ctx.fillStyle = "#6E778D"; ctx.fillRect(x0, yt, b.w, 6);
      ctx.fillStyle = "#3F4556"; ctx.fillRect(b.x - 18, yt + 12, 36, BH - 12);
      ctx.fillStyle = "#FFC23D"; ctx.fillRect(b.x - 18, yt + 12, 36, 4);
      return;
    }
    ctx.fillStyle = b.c; ctx.fillRect(x0, yt, b.w, BH);
    ctx.fillStyle = "rgba(0,0,0,.18)"; ctx.fillRect(x0, yt + BH - 6, b.w, 6);
    ctx.fillStyle = "rgba(255,255,255,.22)"; ctx.fillRect(x0, yt, b.w, 4);
    ctx.save(); ctx.beginPath(); ctx.rect(x0 + 3, yt, b.w - 6, BH); ctx.clip();
    for (let wx = Math.floor((x0 - 8)/26)*26 + 8; wx < x0 + b.w; wx += 26){
      const lit = night && hash(wx*3 + y) > .35;
      ctx.fillStyle = lit ? "#FFE58A" : night ? "rgba(20,24,50,.55)" : "rgba(220,240,255,.85)";
      ctx.fillRect(wx, yt + 11, 12, 16);
    }
    ctx.restore();
  }

  function drawTower(t, v, label){
    const s = v.s, VH = v.vh/s;
    ctx.save();
    ctx.beginPath(); ctx.rect(v.vx, v.vy, v.vw, v.vh); ctx.clip();
    drawSky(t, v);
    const sx = t.shake > 0 && !RM ? Math.sin(time*60)*t.shake*14 : 0;
    ctx.translate(v.vx + v.vw/2 - 300*s + sx*s, v.vy + v.vh + t.camY*s);
    ctx.scale(s, s);
    const halfW = v.vw/2/s, xl = 300 - halfW, xr = 300 + halfW, y0 = t.camY, y1 = t.camY + VH;
    const night = (t.camY + VH/2)/BH > 34;
    drawDecor(t, xl, xr, y0, y1);
    if (y0 < 200) drawGround(xl, xr);
    const i0 = Math.max(0, Math.floor(y0/BH) - 1), i1 = Math.min(t.blocks.length - 1, Math.ceil(y1/BH));
    for (let i = i0; i <= i1; i++) drawBlock(t.blocks[i], i*BH, night);
    // kat işaretleri
    ctx.font = `16px Bungee, "Arial Black", sans-serif`; ctx.textAlign = "right"; ctx.textBaseline = "middle";
    for (let i = 5; i <= t.blocks.length - 1; i += 5){
      const y = i*BH + BH/2; if (y < y0 || y > y1) continue;
      const b = t.blocks[i], x = b.x - b.w/2 - 12;
      ctx.fillStyle = "rgba(29,36,64,.6)"; ctx.beginPath(); ctx.roundRect(x - 38, -y - 13, 40, 26, 8); ctx.fill();
      ctx.fillStyle = "#FFC23D"; ctx.fillText(String(i), x - 3, -y + 1);
    }
    // parlama
    for (const f of t.flash){ ctx.fillStyle = `rgba(255,255,255,${f.life*1.6})`; ctx.fillRect(f.x - f.w/2 - 6, -(f.y + BH) - 6, f.w + 12, BH + 12); }
    // vinç ve sallanan kat
    const c = t.cur;
    if (c){
      const lv = LEVELS[players[c.owner].lvl], hy = -(c.y + BH);
      if (c.state === "swing"){
        ctx.strokeStyle = "#2B2F3F"; ctx.lineWidth = 3;
        ctx.beginPath(); ctx.moveTo(c.x - 20, hy); ctx.lineTo(c.x, hy - 26); ctx.lineTo(c.x + 20, hy); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(c.x, hy - 26); ctx.lineTo(c.x, -y1 - 10); ctx.stroke();
        ctx.fillStyle = "#FFC23D"; ctx.fillRect(c.x - 22, -y1, 44, 16);
        ctx.fillStyle = "#1D2440"; for (let k = -22; k < 22; k += 11) ctx.fillRect(c.x + k, -y1 + 8, 6, 8);
        // hedef gölgesi: Kolay seviyede alttaki katın hizası gösterilir
        if (lv.grow){
          const tp = top(t);
          ctx.strokeStyle = "rgba(255,255,255,.75)"; ctx.setLineDash([8, 8]); ctx.lineWidth = 3;
          ctx.strokeRect(tp.x - c.w/2, -(topY(t) + BH), c.w, BH); ctx.setLineDash([]);
        }
      }
      drawBlock({x:c.x, w:c.w, c:COLORS[c.owner]}, c.y, night);
    }
    for (const d of t.debris){
      ctx.save(); ctx.translate(d.x, -(d.y + BH/2)); ctx.rotate(d.rot);
      ctx.fillStyle = d.c; ctx.fillRect(-d.w/2, -BH/2, d.w, BH);
      ctx.fillStyle = "rgba(0,0,0,.18)"; ctx.fillRect(-d.w/2, BH/2 - 6, d.w, 6);
      ctx.restore();
    }
    ctx.font = `22px Bungee, "Arial Black", sans-serif`; ctx.textAlign = "center";
    for (const p of t.pops){
      ctx.globalAlpha = clamp(p.life*1.5, 0, 1);
      ctx.lineWidth = 6; ctx.strokeStyle = "rgba(29,36,64,.8)"; ctx.strokeText(p.text, p.x, -p.y);
      ctx.fillStyle = p.color; ctx.fillText(p.text, p.x, -p.y);
    }
    ctx.globalAlpha = 1;
    ctx.restore();

    // üst bilgi (ekran koordinatı)
    ctx.save();
    ctx.font = `${Math.round(clamp(v.vw*.07, 22, 40))}px Bungee, "Arial Black", sans-serif`;
    ctx.textBaseline = "top"; ctx.textAlign = "left";
    const pad = 14, n = floors(t);
    ctx.lineWidth = 6; ctx.strokeStyle = "rgba(29,36,64,.55)"; ctx.fillStyle = "#FFFFFF";
    const floorText = mode === "race" ? `${n}/${target}` : String(n);
    ctx.strokeText(floorText, v.vx + pad, v.vy + pad); ctx.fillText(floorText, v.vx + pad, v.vy + pad);
    ctx.font = `800 13px Nunito, sans-serif`;
    const sub = mode === "race" ? "" : "KAT";
    if (sub){ ctx.fillStyle = "rgba(255,255,255,.9)"; ctx.fillText(sub, v.vx + pad + 2, v.vy + pad + clamp(v.vw*.07, 22, 40) + 2); }
    if (mode === "team"){
      ctx.textAlign = "right"; ctx.font = `26px "Segoe UI Emoji","Apple Color Emoji","Noto Color Emoji",sans-serif`;
      ctx.fillStyle = "#000";
      let hs = ""; for (let k = 0; k < 3; k++) hs += k < t.lives ? "❤️" : "🤍";
      ctx.fillText(hs, v.vx + v.vw - pad, v.vy + pad);
      if (record){ ctx.font = `800 13px Nunito, sans-serif`; ctx.fillStyle = "rgba(255,255,255,.9)"; ctx.fillText(`Rekor ${record}`, v.vx + v.vw - pad, v.vy + pad + 34); }
    }
    if (label){
      // yarışta oyuncu adı ve hedef çubuğu
      const p = players[t.owners[0]], col = COLORS[t.owners[0]];
      ctx.textAlign = "right"; ctx.font = `900 16px Nunito, sans-serif`;
      const txt = `${p.name}`, tw = ctx.measureText(txt).width;
      const bx = v.vx + v.vw - pad - tw - 44, by = v.vy + pad;
      ctx.fillStyle = col; ctx.beginPath(); ctx.roundRect(bx, by, tw + 44, 32, 16); ctx.fill();
      ctx.fillStyle = "#fff"; ctx.fillText(txt, v.vx + v.vw - pad - 12, by + 8);
      ctx.font = `18px "Segoe UI Emoji","Apple Color Emoji","Noto Color Emoji",sans-serif`; ctx.textAlign = "left"; ctx.fillStyle = "#000";
      ctx.fillText(AVATARS[t.owners[0]], bx + 6, by + 6);
      const barX = v.vx + v.vw - 16, barY = v.vy + 84, barH = v.vh - 140;
      ctx.fillStyle = "rgba(29,36,64,.4)"; ctx.beginPath(); ctx.roundRect(barX - 5, barY, 10, barH, 5); ctx.fill();
      const f = clamp(n/target, 0, 1);
      ctx.fillStyle = col; ctx.beginPath(); ctx.roundRect(barX - 5, barY + barH*(1 - f), 10, barH*f, 5); ctx.fill();
      ctx.font = `18px "Segoe UI Emoji","Apple Color Emoji","Noto Color Emoji",sans-serif`; ctx.textAlign = "center"; ctx.fillStyle = "#000";
      ctx.fillText("🏁", barX, barY - 26);
      if (t.stun > 0){ ctx.fillStyle = "rgba(29,36,64,.35)"; ctx.fillRect(v.vx, v.vy, v.vw, v.vh); }
      if (t.won){ ctx.font = `64px "Segoe UI Emoji","Apple Color Emoji","Noto Color Emoji",sans-serif`; ctx.fillStyle = "#000"; ctx.textBaseline = "middle"; ctx.fillText("🏆", v.vx + v.vw/2, v.vy + v.vh*.3); }
    }
    ctx.restore();
  }

  function draw(){
    const d = view.dpr;
    ctx.setTransform(d, 0, 0, d, 0, 0);
    ctx.clearRect(0, 0, view.w, view.h);
    if (!towers.length){ drawIdle(); return; }
    const vs = viewports();
    towers.forEach((t, i) => drawTower(t, vs[i], mode === "race"));
    if (towers.length > 1){ ctx.fillStyle = "#1D2440"; ctx.fillRect(view.w/2 - 3, 0, 6, view.h); }
  }
  function drawIdle(){
    const idle = newTower([0]);
    for (let i = 0; i < 9; i++) idle.blocks.push({x:300 + Math.sin(i*1.7)*10, w:BASE_W - i*8, c:COLORS[i % 2]});
    idle.camY = -80;
    players = [{name:"", lvl:1}];
    drawTower(idle, {vx:0, vy:0, vw:view.w, vh:view.h, s:Math.min(view.w/620, view.h/560)}, false);
  }

  let last = performance.now();
  function frame(now){
    const dt = Math.min(.05, Math.max(0, (now - last)/1000)); last = now;
    update(dt); draw();
    requestAnimationFrame(frame);
  }

  if (!CanvasRenderingContext2D.prototype.roundRect){
    CanvasRenderingContext2D.prototype.roundRect = function(x, y, w, h, r){
      r = Math.min(r, w/2, h/2);
      this.moveTo(x + r, y); this.arcTo(x + w, y, x + w, y + h, r); this.arcTo(x + w, y + h, x, y + h, r);
      this.arcTo(x, y + h, x, y, r); this.arcTo(x, y, x + w, y, r); this.closePath();
    };
  }
  document.addEventListener("visibilitychange", () => { last = performance.now(); });
  if ("ResizeObserver" in window) new ResizeObserver(resize).observe(stage);
  else window.addEventListener("resize", resize);
  resize();
  openSetup();
  requestAnimationFrame(frame);
})();
