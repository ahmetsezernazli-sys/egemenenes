/* Robot Kodla — Egemen için ilk kodlama oyunu: okları diz, robotu yıldıza götür */
(function(){
  "use strict";

  const SAVE = "robot-kodla", SOUND_KEY = "robot-kodla-ses", PER_LEVEL = 3, STEP_MS = 480;
  const RAINBOW = ["#E4483B", "#C98F00", "#2A64C0", "#1E8A41", "#6E36B8"];
  const D = {u:[0, -1], d:[0, 1], l:[-1, 0], r:[1, 0]};
  const ARROW = {u:"▲", d:"▼", l:"◀", r:"▶"};
  const WORD = {u:"yukarı", d:"aşağı", l:"sola", r:"sağa"};
  // bölümler: ızgara, en kısa yol uzunluğu aralığı, ağaç sayısı
  const LEVELS = [
    {n:3, len:[2, 2], trees:0, straight:true}, {n:3, len:[2, 3], trees:0}, {n:4, len:[3, 4], trees:0}, {n:4, len:[4, 4], trees:1},
    {n:4, len:[4, 5], trees:2}, {n:5, len:[5, 5], trees:3}, {n:5, len:[5, 6], trees:4}, {n:5, len:[6, 7], trees:5},
    {n:6, len:[6, 7], trees:6}, {n:6, len:[7, 9], trees:8}
  ];

  const $ = id => document.getElementById(id);
  const rnd = n => Math.floor(Math.random()*n);

  let soundOn = true, best = [];
  try { soundOn = localStorage.getItem(SOUND_KEY) !== "0"; } catch(e) {}
  try { best = JSON.parse(localStorage.getItem(SAVE) || "{}").stars || []; } catch(e) { best = []; }
  const persist = () => { try { localStorage.setItem(SAVE, JSON.stringify({stars:best})); } catch(e) {} };

  document.querySelectorAll("[data-rainbow]").forEach(el => {
    const text = el.textContent.trim(); el.textContent = ""; el.setAttribute("aria-label", text);
    let k = 0;
    for (const ch of text){
      const s = document.createElement("span"); s.textContent = ch; s.setAttribute("aria-hidden", "true");
      if (ch.trim()) s.style.color = RAINBOW[k++ % RAINBOW.length];
      el.appendChild(s);
    }
  });

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
    g.gain.setValueAtTime(.0001, n); g.gain.exponentialRampToValueAtTime(vol || .1, n + .015); g.gain.exponentialRampToValueAtTime(.0001, n + dur);
    o.connect(g).connect(a.destination); o.start(n); o.stop(n + dur + .05);
  }
  const sfx = {
    add(d){ tone({u:660, d:440, l:520, r:590}[d], .09, "triangle", .1); },
    step(){ tone(330, .07, "square", .04, 500); },
    bump(){ tone(150, .25, "sawtooth", .07, 80); },
    star(){ [784, 988, 1175, 1568].forEach((f, i) => tone(f, .16, "triangle", .11, null, i*.08)); },
    no(){ tone(260, .18, "sine", .1, 200); },
    party(){ [523.25, 659.25, 783.99, 1046.5, 1318.5].forEach((f, i) => tone(f, .3, "triangle", .14, null, i*.12)); }
  };
  const canSpeak = "speechSynthesis" in window;
  let trVoice = null;
  function pickVoice(){ trVoice = speechSynthesis.getVoices().find(v => /^tr(-|_|$)/i.test(v.lang)) || null; }
  if (canSpeak){ pickVoice(); if (speechSynthesis.addEventListener) speechSynthesis.addEventListener("voiceschanged", pickVoice); }
  function say(text){
    if (!canSpeak || !soundOn || !trVoice || fast) return;
    speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text); u.voice = trVoice; u.lang = trVoice.lang; u.rate = .95; u.pitch = 1.15;
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

  /* ---------- bulmaca üretimi ---------- */
  function bfs(P, sx, sy){
    const n = P.n, dist = Array.from({length:n}, () => new Array(n).fill(-1)), q = [[sx, sy]]; dist[sy][sx] = 0;
    while (q.length){
      const [x, y] = q.shift();
      for (const [dx, dy] of Object.values(D)){
        const nx = x + dx, ny = y + dy;
        if (nx < 0 || ny < 0 || nx >= n || ny >= n || P.tree[ny][nx] || dist[ny][nx] >= 0) continue;
        dist[ny][nx] = dist[y][x] + 1; q.push([nx, ny]);
      }
    }
    return dist;
  }
  function makePuzzle(L){
    for (let tries = 0; tries < 500; tries++){
      const n = L.n, P = {n, tree:Array.from({length:n}, () => new Array(n).fill(false))};
      P.sx = rnd(n); P.sy = rnd(n);
      if (L.straight){
        const horiz = Math.random() < .5;
        if (horiz){ P.sx = Math.random() < .5 ? 0 : n - 1; P.tx = n - 1 - P.sx; P.ty = P.sy; }
        else { P.sy = Math.random() < .5 ? 0 : n - 1; P.ty = n - 1 - P.sy; P.tx = P.sx; }
      } else { P.tx = rnd(n); P.ty = rnd(n); }
      if (P.tx === P.sx && P.ty === P.sy) continue;
      let k = 0;
      while (k < L.trees){
        const x = rnd(n), y = rnd(n);
        if (P.tree[y][x] || (x === P.sx && y === P.sy) || (x === P.tx && y === P.ty)) continue;
        P.tree[y][x] = true; k++;
      }
      const d = bfs(P, P.sx, P.sy)[P.ty][P.tx];
      if (d >= L.len[0] && d <= L.len[1]){ P.best = d; P.max = d + 4; return P; }
    }
    return null;
  }
  // (x,y)'den yıldıza giden en kısa yolun ilk adımı
  function nextDir(P, x, y){
    const dist = bfs(P, P.tx, P.ty);
    if (dist[y][x] <= 0) return null;
    for (const [k, [dx, dy]] of Object.entries(D)){
      const nx = x + dx, ny = y + dy;
      if (nx >= 0 && ny >= 0 && nx < P.n && ny < P.n && dist[ny][nx] === dist[y][x] - 1) return k;
    }
    return null;
  }

  /* ---------- durum ---------- */
  let level = 0, L = LEVELS[0], P = null, prog = [], solved = 0, mistakes = 0, running = false, fast = false;
  let rx = 0, ry = 0, idleT = null, timers = [];
  const later = (ms, fn) => { if (fast) fn(); else timers.push(setTimeout(fn, ms)); };
  function clearTimers(){ timers.forEach(clearTimeout); timers = []; clearTimeout(idleT); }

  function startLevel(i){
    clearTimers();
    level = Math.max(0, Math.min(LEVELS.length - 1, i)); L = LEVELS[level];
    solved = 0; mistakes = 0;
    $("intro").hidden = true; $("done").hidden = true; $("party").hidden = true;
    newPuzzle(true);
  }
  function newPuzzle(first){
    P = null; while (!P) P = makePuzzle(L);
    prog = []; running = false; rx = P.sx; ry = P.sy;
    buildBoard(); renderProg(); renderDots(); armIdle();
    if (first && level === 0) say("Robotu yıldıza götür! Ok düğmesine bas, sonra yeşil düğmeye bas.");
    else if (first) say("Okları sırayla diz, robotu yıldıza götür!");
  }
  function buildBoard(){
    const b = $("board"); b.textContent = ""; b.style.setProperty("--n", P.n);
    for (let y = 0; y < P.n; y++) for (let x = 0; x < P.n; x++){
      const c = document.createElement("div"); c.className = "cell" + ((x + y) % 2 ? " alt" : "");
      c.textContent = P.tree[y][x] ? "🌳" : (x === P.tx && y === P.ty) ? "⭐" : "";
      c.setAttribute("aria-label", P.tree[y][x] ? "ağaç" : (x === P.tx && y === P.ty) ? "yıldız" : "çimen");
      b.appendChild(c);
    }
    const r = document.createElement("div"); r.className = "robot"; r.id = "robot"; r.textContent = "🤖"; r.setAttribute("aria-label", "robot");
    b.appendChild(r); placeRobot();
  }
  function placeRobot(){
    const r = $("robot"); if (!r) return;
    const cell = $("board").children[ry*P.n + rx];
    r.style.left = cell.offsetLeft + "px"; r.style.top = cell.offsetTop + "px";
  }
  function renderProg(cur, bad){
    const p = $("prog"); p.textContent = "";
    for (let i = 0; i < P.max; i++){
      const s = document.createElement("div");
      const d = prog[i];
      s.className = "slot" + (d ? " full d-" + d : "") + (i === cur ? " cur" : "") + (i === bad ? " bad" : "");
      s.textContent = d ? ARROW[d] : "";
      p.appendChild(s);
    }
    p.setAttribute("aria-label", prog.length ? "Program: " + prog.map(d => WORD[d]).join(", ") : "Program boş");
    $("run").disabled = !prog.length || running;
    $("del").disabled = !prog.length || running; $("clear").disabled = !prog.length || running;
  }
  function renderDots(){
    const d = $("dots"); d.textContent = "";
    for (let i = 0; i < PER_LEVEL; i++){ const e = document.createElement("i"); if (i < solved) e.className = "on"; d.appendChild(e); }
  }
  function clearGlow(){ document.querySelectorAll(".glow").forEach(e => e.classList.remove("glow")); }
  function armIdle(){
    clearTimeout(idleT); clearGlow();
    if (fast) return;
    idleT = setTimeout(hint, 9000);
  }
  // ipucu: programın sonundaki konumdan bir sonraki doğru ok
  function hint(){
    if (running) return;
    let x = P.sx, y = P.sy;
    for (const d of prog){
      const nx = x + D[d][0], ny = y + D[d][1];
      if (nx < 0 || ny < 0 || nx >= P.n || ny >= P.n || P.tree[ny][nx]){ say("Bir ok yanlış. Son oku silip tekrar dene."); $("del").classList.add("glow"); return; }
      x = nx; y = ny;
    }
    if (x === P.tx && y === P.ty){ $("run").classList.add("glow"); say("Yeşil düğmeye bas!"); return; }
    const nd = nextDir(P, x, y);
    if (nd){ document.querySelector(`.arrows [data-d="${nd}"]`).classList.add("glow"); say(`${WORD[nd]} oku dene.`); }
  }
  function add(d){
    if (running || !P) return false;
    if (prog.length >= P.max){ sfx.no(); say("Yer kalmadı. Yeşil düğmeye bas ya da sil."); return false; }
    prog.push(d); sfx.add(d); renderProg(); armIdle();
    return true;
  }
  function del(){ if (running || !prog.length) return; prog.pop(); renderProg(); armIdle(); }
  function clearProg(){ if (running) return; prog = []; renderProg(); armIdle(); }

  function run(){
    if (running || !prog.length) return;
    running = true; clearTimeout(idleT); clearGlow();
    rx = P.sx; ry = P.sy; placeRobot(); renderProg();
    let i = 0;
    const stepFn = () => {
      if (i >= prog.length){ return finishRun(); }
      const d = prog[i], nx = rx + D[d][0], ny = ry + D[d][1];
      renderProg(i);
      if (nx < 0 || ny < 0 || nx >= P.n || ny >= P.n || P.tree[ny][nx]){
        mistakes++; sfx.bump();
        const r = $("robot"); if (r){ r.style.setProperty("--bx", D[d][0]*12 + "px"); r.style.setProperty("--by", D[d][1]*12 + "px"); r.classList.remove("bump"); void r.offsetWidth; r.classList.add("bump"); }
        renderProg(-1, i);
        say(nx < 0 || ny < 0 || nx >= P.n || ny >= P.n ? "Oops, kenara çarptı! Bu oku değiştir." : "Oops, ağaca çarptı! Bu oku değiştir.");
        later(1200, () => { rx = P.sx; ry = P.sy; placeRobot(); running = false; renderProg(-1, i); armIdle(); });
        return;
      }
      rx = nx; ry = ny; placeRobot(); sfx.step();
      i++;
      if (rx === P.tx && ry === P.ty) return later(STEP_MS, finishRun);
      later(STEP_MS, stepFn);
    };
    later(250, stepFn);
  }
  function finishRun(){
    if (rx === P.tx && ry === P.ty){
      sfx.star(); solved++; renderDots();
      const r = $("robot"); if (r){ r.classList.add("happy"); }
      const star = $("board").children[P.ty*P.n + P.tx]; star.classList.add("star-get");
      say(pick(["Yaşasın! Yıldızı buldun!", "Harika kodladın!", "Süper! Robot yıldızda!"]));
      if (solved >= PER_LEVEL) later(1300, finishLevel);
      else later(1500, () => newPuzzle(false));
      return;
    }
    mistakes++; sfx.no();
    say("Robot yıldıza varamadı. Biraz daha ok ekle.");
    later(1100, () => { rx = P.sx; ry = P.sy; placeRobot(); running = false; renderProg(); armIdle(); });
  }
  const pick = a => a[rnd(a.length)];
  function starsNow(){ return mistakes <= 1 ? 3 : mistakes <= 4 ? 2 : 1; }
  function finishLevel(){
    running = false;
    const s = starsNow();
    best[level] = Math.max(best[level] || 0, s); persist(); renderLevels();
    if (level === LEVELS.length - 1){ $("party").hidden = false; sfx.party(); say("Aferin Egemen! Sen artık bir robot kodlayıcısın!"); return; }
    [...$("stars").children].forEach((el, i) => { el.className = ""; void el.offsetWidth; if (i < s) el.className = "on"; });
    $("stars").setAttribute("aria-label", s + " yıldız");
    $("done").hidden = false; sfx.party(); say("Aferin! Bölüm bitti.");
  }

  /* ---------- giriş ---------- */
  document.querySelectorAll(".arrows button").forEach(b => b.addEventListener("click", () => { audio(); add(b.dataset.d); }));
  $("del").addEventListener("click", () => { audio(); del(); });
  $("clear").addEventListener("click", () => { audio(); clearProg(); });
  $("run").addEventListener("click", () => { audio(); run(); });
  window.addEventListener("keydown", e => {
    if (!$("intro").hidden || !$("done").hidden || !$("party").hidden) return;
    const map = {ArrowUp:"u", ArrowDown:"d", ArrowLeft:"l", ArrowRight:"r"};
    if (map[e.key]){ e.preventDefault(); audio(); add(map[e.key]); }
    else if (e.key === "Enter"){ e.preventDefault(); audio(); run(); }
    else if (e.key === "Backspace"){ e.preventDefault(); del(); }
  });
  window.addEventListener("resize", () => { if (P) placeRobot(); });

  /* ---------- menüler ---------- */
  function renderLevels(){
    const box = $("levels"); box.textContent = "";
    LEVELS.forEach((lv, i) => {
      const b = document.createElement("button");
      b.type = "button"; b.className = "lvl";
      b.setAttribute("aria-label", `Bölüm ${i + 1}${best[i] ? ", " + best[i] + " yıldız" : ""}`);
      b.innerHTML = `<span class="ic" aria-hidden="true">${lv.trees ? "🌳" : "⭐"}</span>${i + 1}<small aria-hidden="true">${"★".repeat(best[i] || 0)}</small>`;
      b.addEventListener("click", () => { audio(); startLevel(i); });
      box.appendChild(b);
    });
  }
  function showIntro(){ clearTimers(); running = false; if (canSpeak) speechSynthesis.cancel(); $("intro").hidden = false; $("done").hidden = true; $("party").hidden = true; }
  $("play").addEventListener("click", () => { audio(); const i = LEVELS.findIndex((_, k) => !best[k]); startLevel(i < 0 ? 0 : i); });
  $("next").addEventListener("click", () => { audio(); startLevel(level + 1); });
  $("replay").addEventListener("click", () => { audio(); startLevel(level); });
  $("again").addEventListener("click", () => { audio(); showIntro(); });
  $("menu").addEventListener("click", () => { audio(); showIntro(); });
  document.addEventListener("visibilitychange", () => { if (document.hidden && canSpeak) speechSynthesis.cancel(); });

  renderLevels();
  startLevel(0); clearTimers(); $("intro").hidden = false; if (canSpeak) speechSynthesis.cancel();

  // test kancası
  window.__rk = { LEVELS, makePuzzle, bfs, nextDir, startLevel, add, run, del, setFast: f => { fast = f; },
    get st(){ return {level, solved, mistakes, running, prog:prog.slice(), rx, ry, P}; } };
})();
