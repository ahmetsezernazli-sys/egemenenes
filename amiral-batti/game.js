/* Amiral Battı — iki kişi ya da bilgisayara karşı; küçüklere sıcak-soğuk ipucu */
(function(){
  "use strict";

  const FLEETS = {6:[3, 2, 2, 1], 8:[4, 3, 3, 2, 2]};
  const AVATARS = ["🚀", "🎈"], COLORS = ["#3D8BFD", "#FF7A2F"];
  const HEAT = ["#E5484D", "#FF8A3D", "#FFC53D", "#3D8BFD"];   // 1, 2, 3, 4+ kare uzak
  const SETTINGS_KEY = "amiral-ayar", SOUND_KEY = "amiral-ses";
  const RM = window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches;

  const $ = id => document.getElementById(id);
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const rnd = n => Math.floor(Math.random()*n);

  let settings = {mode:"2p", size:6, cpu:1, players:[{name:"Enes", heat:false}, {name:"Egemen", heat:true}]};
  try {
    const s = JSON.parse(localStorage.getItem(SETTINGS_KEY) || "null");
    if (s && Array.isArray(s.players) && s.players.length === 2)
      settings = {mode:s.mode === "cpu" ? "cpu" : "2p", size:s.size === 8 ? 8 : 6, cpu:clamp(s.cpu | 0, 0, 2),
                  players:s.players.map((p, i) => ({name:String(p.name || "").slice(0, 12) || ["Enes", "Egemen"][i], heat:!!p.heat}))};
  } catch(e) {}
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
  function noise(dur, freq, vol, type){
    const a = audio(); if (!a || !soundOn) return;
    const len = Math.floor(a.sampleRate*dur), buf = a.createBuffer(1, len, a.sampleRate), d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = (Math.random()*2 - 1)*Math.pow(1 - i/len, 2);
    const s = a.createBufferSource(); s.buffer = buf;
    const f = a.createBiquadFilter(); f.type = type || "bandpass"; f.frequency.value = freq;
    const g = a.createGain(); g.gain.value = vol;
    s.connect(f).connect(g).connect(a.destination); s.start();
  }
  const sfx = {
    fire(){ tone(520, .12, "square", .04, 260); },
    splash(){ noise(.35, 1400, .22); },
    boom(){ noise(.45, 180, .45, "lowpass"); tone(120, .3, "sine", .1, 60); },
    sink(){ [392, 330, 262, 196].forEach((f, i) => tone(f, .22, "triangle", .1, null, i*.12)); noise(.6, 200, .3, "lowpass"); },
    win(){ [523.25, 659.25, 784, 1046.5, 1318.5].forEach((f, i) => tone(f, .28, "triangle", .12, null, i*.12)); },
    turn(){ tone(680, .07, "sine", .05); }
  };
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

  function locative(name){
    const low = name.toLocaleLowerCase("tr"), vowels = "aeıioöuü";
    let v = "e";
    for (let i = low.length - 1; i >= 0; i--){ if (vowels.includes(low[i])){ v = low[i]; break; } }
    const hard = "çfhkpsşt".includes(low[low.length - 1]);
    return `${name}'${hard ? "t" : "d"}${"aıou".includes(v) ? "a" : "e"}`;
  }
  function genitive(name){
    const low = name.toLocaleLowerCase("tr"), last = low[low.length - 1], vowels = "aeıioöuü";
    let v = "e";
    for (let i = low.length - 1; i >= 0; i--){ if (vowels.includes(low[i])){ v = low[i]; break; } }
    const suf = "aı".includes(v) ? "ın" : "ei".includes(v) ? "in" : "ou".includes(v) ? "un" : "ün";
    return `${name}'${vowels.includes(last) ? "n" : ""}${suf}`;
  }

  /* ---------- tahta ---------- */
  function neighbours8(size, i){
    const x = i % size, y = (i/size) | 0, out = [];
    for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++){
      if (!dx && !dy) continue;
      const nx = x + dx, ny = y + dy;
      if (nx >= 0 && ny >= 0 && nx < size && ny < size) out.push(ny*size + nx);
    }
    return out;
  }
  // gemiler düz çizgide, üst üste binmeden ve çaprazdan bile birbirine değmeden
  function placeFleet(size){
    const fleet = FLEETS[size];
    for (let attempt = 0; attempt < 500; attempt++){
      const at = new Int8Array(size*size).fill(-1), ships = [];
      let ok = true;
      for (let s = 0; s < fleet.length && ok; s++){
        const len = fleet[s];
        let placed = false;
        for (let t = 0; t < 200 && !placed; t++){
          const horiz = Math.random() < .5;
          const x = rnd(horiz ? size - len + 1 : size), y = rnd(horiz ? size : size - len + 1);
          const cells = [];
          for (let k = 0; k < len; k++) cells.push((y + (horiz ? 0 : k))*size + x + (horiz ? k : 0));
          const clash = cells.some(c => at[c] >= 0 || neighbours8(size, c).some(n => at[n] >= 0));
          if (clash) continue;
          cells.forEach(c => { at[c] = s; });
          ships.push({len, cells, hits:0});
          placed = true;
        }
        if (!placed) ok = false;
      }
      if (ok) return {size, at, ships, recv:new Uint8Array(size*size)};   // recv: 0 yok, 1 ıska, 2 isabet, 3 boş olduğu kesin
    }
    throw new Error("filo dizilemedi");
  }

  // ıska karenin en yakın batmamış gemi karesine uzaklığı (satranç şahı adımıyla)
  function heatAt(board, i){
    const size = board.size, x = i % size, y = (i/size) | 0;
    let best = Infinity;
    board.ships.forEach(s => {
      if (s.hits >= s.len) return;
      s.cells.forEach(c => {
        if (board.recv[c] === 2) return;
        const d = Math.max(Math.abs(c % size - x), Math.abs(((c/size) | 0) - y));
        if (d < best) best = d;
      });
    });
    return best;
  }

  /* ---------- oyun ---------- */
  let G = null, timers = [], curtainThen = null;
  const later = (s, fn) => timers.push({t:s, fn});
  function tick(dt){
    if (!timers.length) return;
    const due = [];
    for (const t of timers) if ((t.t -= dt) <= 0) due.push(t);
    if (due.length){ timers = timers.filter(t => t.t > 0); due.forEach(t => t.fn()); }
  }
  setInterval(() => tick(.1), 100);

  function newGame(){
    timers = [];
    const cpuMode = settings.mode === "cpu";
    G = {
      size:settings.size, turn:0, state:"place", placeIdx:0, lastShot:-1, cpuLevel:settings.cpu,
      players:settings.players.map((p, i) => ({
        name:cpuMode && i === 1 ? "Bilgisayar" : p.name, av:AVATARS[i], heat:!!p.heat && !(cpuMode && i === 1),
        cpu:cpuMode && i === 1, board:placeFleet(settings.size), fired:0, hits:0
      }))
    };
    $("end").hidden = true; $("setup").hidden = true;
    $("curtain").hidden = true; $("place").hidden = true; curtainThen = null;   // önceki oyundan kalan perdeyi kapat
    render();
    askPlace(0);
  }

  function askPlace(i){
    G.placeIdx = i;
    const p = G.players[i];
    if (p.cpu){ startBattle(); return; }
    const humans = G.players.filter(q => !q.cpu).length;
    const show = () => {
      $("place-title").textContent = `${p.name}, filonu diz`;
      drawBoard($("place-sea"), p.board, "own");
      $("place").hidden = false;
    };
    if (humans > 1) curtain(p, `${genitive(p.name)} filosunu dizme sırası`, "Gemilerini başkası görmesin.", show);
    else show();
  }
  $("reshuffle").addEventListener("click", () => {
    audio(); sfx.turn();
    const p = G.players[G.placeIdx];
    p.board = placeFleet(G.size);
    drawBoard($("place-sea"), p.board, "own");
  });
  $("place-ok").addEventListener("click", () => {
    audio();
    $("place").hidden = true;
    if (G.placeIdx === 0) askPlace(1); else startBattle();
  });

  function startBattle(){
    G.state = "battle"; G.turn = 0;
    beginTurn();
  }

  function curtain(p, title, note, then){
    $("curtain-av").textContent = p.av;
    $("curtain-av").style.background = COLORS[G.players.indexOf(p)];
    $("curtain-name").textContent = title;
    $("curtain-note").textContent = note;
    $("curtain").hidden = false;
    curtainThen = then;
  }
  $("curtain-go").addEventListener("click", () => {
    audio();
    $("curtain").hidden = true;
    const f = curtainThen; curtainThen = null;
    if (f) f();
  });

  function beginTurn(){
    const p = G.players[G.turn];
    G.lastShot = -1;
    if (p.cpu){ render(); later(.9, cpuTurn); return; }
    const humans = G.players.filter(q => !q.cpu).length;
    const go = () => { render(); sfx.turn(); say(`Sıra ${locative(p.name)}`); };
    if (humans > 1){
      curtain(p, `Sıra ${locative(p.name)}`, "Rakibinin denizine ateş edeceksin. Hazırsan dokun.", go);
      render();                                  // perde açıkken tahtalar boş çizilir, arkadan görünmez
    } else go();
  }

  function fire(shooter, cell){
    if (!G || G.state !== "battle" || shooter !== G.turn) return null;
    const me = G.players[shooter], foe = G.players[1 - shooter], b = foe.board;
    if (cell < 0 || cell >= b.recv.length || b.recv[cell] !== 0) return null;
    me.fired++;
    G.lastShot = cell;
    const si = b.at[cell];
    let res;
    if (si >= 0){
      b.recv[cell] = 2; me.hits++;
      const ship = b.ships[si];
      ship.hits++;
      if (ship.hits >= ship.len){
        res = "sunk";
        ship.cells.forEach(c => neighbours8(b.size, c).forEach(n => { if (b.recv[n] === 0) b.recv[n] = 3; }));
      } else res = "hit";
    } else { b.recv[cell] = 1; res = "miss"; }
    const won = b.ships.every(s => s.hits >= s.len);
    if (won){ G.state = "over"; res = "win"; }
    return res;
  }

  function humanFire(cell){
    const p = G.players[G.turn];
    if (p.cpu || !$("curtain").hidden) return;
    audio();
    const res = fire(G.turn, cell);
    if (!res) return;
    react(res);
    render();
    if (res === "win") later(1.2, endGame);
    else if (res === "miss"){ G.state = "wait"; later(1.3, () => { G.state = "battle"; G.turn = 1 - G.turn; beginTurn(); }); }
  }

  function react(res){
    sfx.fire();
    if (res === "miss"){ later(.15, sfx.splash); banner("Iska", true); say("Iska"); }
    else if (res === "hit"){ later(.15, sfx.boom); banner("İsabet!"); say("İsabet! Bir daha at"); }
    else if (res === "sunk"){ later(.15, sfx.sink); banner("Gemi battı!"); say("Gemi battı! Bir daha at"); }
    else { later(.15, sfx.sink); banner("Filo battı!"); }
  }

  /* ---------- bilgisayar ---------- */
  function cpuPick(board, level){
    const size = board.size, n = size*size, free = [];
    for (let i = 0; i < n; i++) if (board.recv[i] === 0) free.push(i);
    if (level === 0) return free[rnd(free.length)];
    // batmamış isabetlerin çevresi
    const open = [];
    board.ships.forEach(s => { if (s.hits < s.len) s.cells.forEach(c => { if (board.recv[c] === 2) open.push(c); }); });
    if (open.length){
      const cand = new Set();
      const inLine = open.length >= 2;
      const horiz = inLine && open.every(c => ((c/size) | 0) === ((open[0]/size) | 0));
      open.forEach(c => {
        const x = c % size, y = (c/size) | 0;
        [[1, 0], [-1, 0], [0, 1], [0, -1]].forEach(([dx, dy]) => {
          if (inLine && (horiz ? dy : dx)) return;                 // iki isabet varsa aynı doğrultuda devam et
          const nx = x + dx, ny = y + dy;
          if (nx < 0 || ny < 0 || nx >= size || ny >= size) return;
          const k = ny*size + nx;
          if (board.recv[k] === 0) cand.add(k);
        });
      });
      const list = [...cand];
      if (list.length) return list[rnd(list.length)];
    }
    // av: zor seviyede satranç tahtası deseni (en küçük gemi 1'den büyükse)
    const smallest = Math.min.apply(null, board.ships.filter(s => s.hits < s.len).map(s => s.len));
    if (level === 2 && smallest > 1){
      const par = free.filter(i => ((i % size) + ((i/size) | 0)) % 2 === 0);
      if (par.length) return par[rnd(par.length)];
    }
    return free[rnd(free.length)];
  }

  function cpuTurn(){
    if (!G || G.state !== "battle") return;
    const me = G.players[G.turn];
    if (!me.cpu) return;
    const cell = cpuPick(G.players[1 - G.turn].board, G.cpuLevel);
    const res = fire(G.turn, cell);
    react(res);
    render();
    if (res === "win") later(1.4, endGame);
    else if (res === "miss") later(1.3, () => { G.turn = 1 - G.turn; beginTurn(); });
    else later(1.1, cpuTurn);
  }

  function endGame(){
    const w = G.players[G.turn], l = G.players[1 - G.turn];
    G.state = "over";
    sfx.win(); say(`${w.name} kazandı!`);
    $("end-title").textContent = w.cpu ? "Bilgisayar kazandı!" : `${w.name} kazandı!`;
    const acc = w.fired ? Math.round(100*w.hits/w.fired) : 0;
    $("end-note").textContent = `${w.fired} atışta ${w.hits} isabet (%${acc}). ${l.cpu ? "" : l.name + " " + l.fired + " atış yaptı."}`.trim();
    render();
    $("end").hidden = false;
    $("again").focus();
  }

  /* ---------- çizim ---------- */
  let bannerT = null;
  function banner(text, miss){
    const el = $("banner");
    el.textContent = text; el.className = "banner" + (miss ? " miss" : ""); el.hidden = false;
    el.style.animation = "none"; void el.offsetWidth; el.style.animation = "";
    clearTimeout(bannerT); bannerT = setTimeout(() => { el.hidden = true; }, 1000);
  }

  // mode: "own" gemiler görünür · "target" sadece atışlar görünür
  function drawBoard(el, board, mode, opts){
    opts = opts || {};
    const size = board.size;
    el.style.gridTemplateColumns = `repeat(${size}, 1fr)`;
    let html = "";
    for (let i = 0; i < size*size; i++){
      const r = board.recv[i], si = board.at[i];
      const sunk = si >= 0 && board.ships[si].hits >= board.ships[si].len;
      let cls = "cell", style = "", label = "";
      if (r === 2) cls += sunk ? " sunk" : " hit";
      else if (r === 1){
        cls += " miss";
        if (opts.heat){ const d = heatAt(board, i); if (d < Infinity) style = ` style="background:${HEAT[Math.min(d, 4) - 1]}"`; }
      } else if (r === 3) cls += " miss";
      else if (mode === "own" && si >= 0) cls += " ship";
      else if (mode === "target" && opts.active) cls += " open";
      if (i === opts.last) cls += " last shot";
      if (mode === "target") label = ` aria-label="${(i % size) + 1}. sütun ${((i/size) | 0) + 1}. satır"`;
      html += mode === "target" ? `<button type="button" class="${cls}" data-i="${i}"${style}${label}></button>`
                                : `<span class="${cls}"${style}></span>`;
    }
    el.innerHTML = html;
  }

  function render(){
    if (!G) return;
    const me = G.players[G.turn], foe = G.players[1 - G.turn];
    // bilgisayara karşı oynarken ekran hep insan oyuncunun gözünden
    const viewer = me.cpu ? foe : me, other = me.cpu ? me : foe;
    const hidden = !$("curtain").hidden || G.state === "place";
    const left = b => b.ships.filter(s => s.hits < s.len).length;
    $("target-name").textContent = `${genitive(other.name)} denizi`;
    $("own-name").textContent = `${genitive(viewer.name)} filosu`;
    $("target-left").textContent = `${left(other.board)}/${other.board.ships.length} gemi`;
    $("own-left").textContent = `${left(viewer.board)}/${viewer.board.ships.length} gemi`;
    $("heat-legend").hidden = !viewer.heat;
    if (hidden){
      drawBoard($("target"), {size:G.size, at:new Int8Array(G.size*G.size).fill(-1), ships:[], recv:new Uint8Array(G.size*G.size)}, "target");
      drawBoard($("own"), {size:G.size, at:new Int8Array(G.size*G.size).fill(-1), ships:[], recv:new Uint8Array(G.size*G.size)}, "own");
    } else {
      drawBoard($("target"), other.board, "target", {active:G.state === "battle" && !me.cpu, heat:viewer.heat, last:me.cpu ? -1 : G.lastShot});
      drawBoard($("own"), viewer.board, "own", {last:me.cpu ? G.lastShot : -1});
    }
    if (G.state === "over") $("turn").textContent = "Oyun bitti";
    else if (G.state === "place") $("turn").textContent = "Filolar diziliyor…";
    else if (me.cpu) $("turn").textContent = "Bilgisayar ateş ediyor…";
    else $("turn").textContent = `Sıra ${locative(me.name)} — ${genitive(foe.name)} denizine ateş et`;
  }

  $("target").addEventListener("click", e => {
    const b = e.target.closest(".cell[data-i]");
    if (!b || !b.classList.contains("open")) return;
    humanFire(+b.dataset.i);
  });

  /* ---------- ayarlar ---------- */
  function renderSetup(){
    $("mode-2p").checked = settings.mode !== "cpu";
    $("mode-cpu").checked = settings.mode === "cpu";
    [0, 1].forEach(i => { $("pn-" + i).value = settings.players[i].name; $("heat-" + i).checked = settings.players[i].heat; });
    const sz = document.querySelector(`input[name="size"][value="${settings.size}"]`); if (sz) sz.checked = true;
    const cl = document.querySelector(`input[name="cpu"][value="${settings.cpu}"]`); if (cl) cl.checked = true;
    syncMode();
  }
  function syncMode(){
    const cpu = $("mode-cpu").checked;
    $("pn-1").disabled = cpu; $("heat-1").disabled = cpu;
    $("cpu-level").hidden = !cpu;
  }
  document.querySelectorAll('input[name="mode"]').forEach(r => r.addEventListener("change", syncMode));
  $("setup-form").addEventListener("submit", e => {
    e.preventDefault(); audio();
    settings.mode = $("mode-cpu").checked ? "cpu" : "2p";
    settings.size = +((document.querySelector('input[name="size"]:checked') || {}).value || 6);
    settings.cpu = +((document.querySelector('input[name="cpu"]:checked') || {}).value || 1);
    settings.players = [0, 1].map(i => ({name:($("pn-" + i).value || "").trim().slice(0, 12) || ["Enes", "Egemen"][i], heat:$("heat-" + i).checked}));
    try { localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings)); } catch(e) {}
    newGame();
  });
  function openSetup(){ timers = []; $("end").hidden = true; $("curtain").hidden = true; $("place").hidden = true; renderSetup(); $("setup").hidden = false; }
  $("open-setup").addEventListener("click", openSetup);
  $("end-setup").addEventListener("click", openSetup);
  $("again").addEventListener("click", () => { audio(); newGame(); });

  renderSetup();
})();
