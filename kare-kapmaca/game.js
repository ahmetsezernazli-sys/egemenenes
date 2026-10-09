(() => {
  "use strict";
  const $ = id => document.getElementById(id);
  const SVGNS = "http://www.w3.org/2000/svg";

  const PL = [{av:"🚀", col:"#3D8BFD", fill:"rgba(61,139,253,.22)"}, {av:"🎈", col:"#FF7A2F", fill:"rgba(255,122,47,.22)"}];

  /* ---------- tahta geometrisi ---------- */
  // N×N kare; yatay çizgi (r,c): r 0..N, c 0..N-1 ; dikey çizgi (r,c): r 0..N-1, c 0..N
  function makeGeo(N){
    const H = (N + 1) * N, L = H + N * (N + 1);
    const hId = (r, c) => r * N + c, vId = (r, c) => H + r * (N + 1) + c;
    const boxLines = [], lineBoxes = Array.from({length: L}, () => []), ends = [];
    for (let r = 0; r < N; r++) for (let c = 0; c < N; c++){
      const b = r * N + c, ls = [hId(r, c), hId(r + 1, c), vId(r, c), vId(r, c + 1)];
      boxLines.push(ls);
      for (const l of ls) lineBoxes[l].push(b);
    }
    for (let id = 0; id < L; id++){
      if (id < H){ const r = Math.floor(id / N), c = id % N; ends.push([r, c, r, c + 1]); }
      else { const k = id - H, r = Math.floor(k / (N + 1)), c = k % (N + 1); ends.push([r, c, r + 1, c]); }
    }
    return {N, L, boxLines, lineBoxes, ends};
  }

  /* ---------- kurallar (saf fonksiyonlar) ---------- */
  const sides = (geo, lines, b) => geo.boxLines[b].reduce((a, l) => a + (lines[l] >= 0 ? 1 : 0), 0);
  // çizgiyi çiz, tamamlanan kareleri sahibine ver, kaç kare kapandığını döndür
  function apply(geo, lines, boxes, id, p){
    lines[id] = p;
    let got = 0;
    for (const b of geo.lineBoxes[id]) if (boxes[b] < 0 && sides(geo, lines, b) === 4){ boxes[b] = p; got++; }
    return got;
  }
  const open = lines => { const o = []; for (let i = 0; i < lines.length; i++) if (lines[i] < 0) o.push(i); return o; };
  const closes = (geo, lines, id) => geo.lineBoxes[id].some(b => sides(geo, lines, b) === 3);
  // güvenli: kare kapatmaz ve hiçbir kareyi üç kenara getirmez
  const isSafe = (geo, lines, id) => geo.lineBoxes[id].every(b => sides(geo, lines, b) <= 1);
  // bu çizgiden sonra rakip açgözlüce kaç kare toplar?
  function giveaway(geo, lines, boxes, id){
    const L = lines.slice(), B = boxes.slice();
    let n = apply(geo, L, B, id, 1);
    if (n) return -n;                                  // zaten kare kapatıyor
    let total = 0, again = true;
    while (again){
      again = false;
      for (let i = 0; i < L.length; i++) if (L[i] < 0 && closes(geo, L, i)){ total += apply(geo, L, B, i, 0); again = true; break; }
    }
    return total;
  }
  const pickRand = a => a[Math.random() * a.length | 0];
  function cpuChoice(geo, lines, boxes, level){
    const all = open(lines);
    const caps = all.filter(id => closes(geo, lines, id));
    if (level === 0){
      if (caps.length && Math.random() < .6) return pickRand(caps);
      return pickRand(all);
    }
    if (caps.length) return pickRand(caps);
    const safe = all.filter(id => isSafe(geo, lines, id));
    if (safe.length) return pickRand(safe);
    if (level === 1) return pickRand(all);
    // zor: en az kare veren çizgiyi seç
    let best = Infinity, pool = [];
    for (const id of all){
      const g = giveaway(geo, lines, boxes, id);
      if (g < best){ best = g; pool = [id]; } else if (g === best) pool.push(id);
    }
    return pickRand(pool);
  }

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
  const sLine = p => tone(p ? 460 : 560, p ? 520 : 640, "triangle", .09, .1);
  const sBox = n => [660, 880, 1100].slice(0, 1 + n).forEach((f, k) => tone(f, f * 1.05, "triangle", .16, .13, k * .08));
  const sWin = () => [523, 659, 784, 1047, 1319].forEach((f, k) => tone(f, f, "triangle", .22, .13, k * .09));

  const canSpeak = "speechSynthesis" in window;
  let trVoice = null;
  function pickVoice(){ trVoice = speechSynthesis.getVoices().find(v => /^tr(-|_|$)/i.test(v.lang)) || null; }
  if (canSpeak){ pickVoice(); if (speechSynthesis.addEventListener) speechSynthesis.addEventListener("voiceschanged", pickVoice); }
  function say(text){
    if (!canSpeak || !soundOn || !trVoice) return;
    speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text); u.voice = trVoice; u.lang = trVoice.lang; u.rate = .98; u.pitch = 1.12;
    speechSynthesis.speak(u);
  }
  // "Sıra Enes'te", "Sıra Egemen'de"
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
  let G = null, timers = [], starter = 0;
  const later = (sec, fn) => timers.push({t: sec, fn});

  function newGame(cfg, first){
    timers = [];
    const geo = makeGeo(cfg.size);
    G = {cfg, geo, players: cfg.players, lines: new Array(geo.L).fill(-1), boxes: new Array(cfg.size * cfg.size).fill(-1),
      cur: first, score: [0, 0], last: -1, over: false, busy: false, newBoxes: []};
    ["setup", "end"].forEach(id => $(id).hidden = true);
    build();
    turnStart(true);
  }
  const P = () => G.players[G.cur];

  function turnStart(fresh){
    G.busy = false;
    render();
    const p = P();
    if (p.cpu){ setHint(`${p.name} düşünüyor…`); G.busy = true; later(.65, cpuMove); return; }
    setHint(fresh ? `${p.name} başlıyor. İki nokta arasına dokun.` : `Sıra ${p.name}${suffix(p.name)}.`);
    if (p.help) say(`Sıra ${p.name}${suffix(p.name)}`);
  }

  function play(id){
    if (!G || G.over || G.lines[id] >= 0) return;
    audio();
    const p = G.cur, got = apply(G.geo, G.lines, G.boxes, id, p);
    G.last = id;
    G.newBoxes = [];
    if (got){
      G.score[p] += got;
      G.geo.lineBoxes[id].forEach(b => { if (G.boxes[b] === p) G.newBoxes.push(b); });
      sBox(got);
    } else sLine(p);
    const done = G.lines.every(v => v >= 0);
    if (done){ G.over = true; render(p); later(.8, finish); return; }
    if (got){
      const pl = P();
      setHint(`${pl.name} ${got > 1 ? "iki kare" : "bir kare"} kaptı, bir daha oynuyor!`);
      if (pl.help && !pl.cpu) say(got > 1 ? "İki kare senin! Bir daha oyna." : "Kare senin! Bir daha oyna.");
      render(p);
      if (pl.cpu){ G.busy = true; later(.6, cpuMove); }
      return;
    }
    G.cur = 1 - G.cur;
    turnStart(false);
  }

  function cpuMove(){
    if (!G || G.over || !P().cpu) return;
    const id = cpuChoice(G.geo, G.lines, G.boxes, P().level);
    G.busy = false;
    play(id);
  }

  /* ---------- çizim ---------- */
  const S = 100, M = 34;
  const px = (r, c) => [M + c * S, M + r * S];
  let lnEls = [], hitEls = [], boxEls = [], emoEls = [];
  function el(tag, attrs, parent){
    const e = document.createElementNS(SVGNS, tag);
    for (const k in attrs) e.setAttribute(k, attrs[k]);
    if (parent) parent.appendChild(e);
    return e;
  }
  function build(){
    const svg = $("board"), N = G.geo.N, size = N * S + 2 * M;
    svg.innerHTML = ""; lnEls = []; hitEls = []; boxEls = []; emoEls = [];
    svg.setAttribute("viewBox", `0 0 ${size} ${size}`);
    const gBox = el("g", {}, svg), gLine = el("g", {}, svg), gDot = el("g", {}, svg);
    for (let b = 0; b < N * N; b++){
      const r = Math.floor(b / N), c = b % N, [x, y] = px(r, c);
      boxEls.push(el("rect", {x: x + 5, y: y + 5, width: S - 10, height: S - 10, rx: 10, fill: "transparent", class: "box"}, gBox));
      const t = el("text", {x: x + S / 2, y: y + S / 2 + 2, class: "emo"}, gBox); emoEls.push(t);
    }
    G.geo.ends.forEach((e, id) => {
      const [x1, y1] = px(e[0], e[1]), [x2, y2] = px(e[2], e[3]);
      const pad = 14, dx = Math.sign(x2 - x1) * pad, dy = Math.sign(y2 - y1) * pad;
      const hit = el("line", {x1: x1 + dx, y1: y1 + dy, x2: x2 - dx, y2: y2 - dy, class: "hit"}, gLine);
      const ln = el("line", {x1: x1 + dx * .6, y1: y1 + dy * .6, x2: x2 - dx * .6, y2: y2 - dy * .6, class: "ln"}, gLine);
      const label = e[0] === e[2] ? `Yatay çizgi, ${e[0] + 1}. sıra, ${e[1] + 1}. aralık` : `Dikey çizgi, ${e[0] + 1}. sıra, ${e[1] + 1}. nokta`;
      hit.setAttribute("aria-label", label);
      hit.addEventListener("click", () => { if (!G.busy && !P().cpu) play(id); });
      hitEls.push(hit); lnEls.push(ln);
    });
    for (let r = 0; r <= N; r++) for (let c = 0; c <= N; c++){ const [x, y] = px(r, c); el("circle", {cx: x, cy: y, r: 9, class: "dot"}, gDot); }
  }

  function setHint(t){ $("hintline").textContent = t; }

  function render(gainP){
    if (!G) return;
    // skor
    const box = $("score"); box.innerHTML = "";
    G.players.forEach((p, i) => {
      const d = document.createElement("div");
      d.className = `pl p${i}` + (i === G.cur && !G.over ? " on" : "") + (i === gainP && G.newBoxes.length ? " gain" : "");
      d.innerHTML = `<span class="av" style="background:${PL[i].fill.replace(".22", ".35")}">${PL[i].av}</span><span class="nm"></span><b>${G.score[i]}</b>`;
      d.querySelector(".nm").textContent = p.name;
      box.appendChild(d);
    });
    // çizgiler ve yardım
    const me = P(), help = !G.over && !G.busy && me.help && !me.cpu;
    G.lines.forEach((v, id) => {
      const ln = lnEls[id];
      let cls = "ln";
      if (v >= 0) cls += ` on p${v}` + (id === G.last ? " last" : "");
      else if (help){
        if (closes(G.geo, G.lines, id)) cls += " good";
        else if (!isSafe(G.geo, G.lines, id)) cls += " bad";
      }
      if (ln.getAttribute("class") !== cls) ln.setAttribute("class", cls);
      hitEls[id].style.display = v >= 0 ? "none" : "";
    });
    G.boxes.forEach((o, b) => {
      boxEls[b].setAttribute("fill", o >= 0 ? PL[o].fill : "transparent");
      boxEls[b].setAttribute("class", "box" + (G.newBoxes.includes(b) ? " new" : ""));
      emoEls[b].textContent = o >= 0 ? PL[o].av : "";
    });
    $("board").classList.toggle("locked", G.over || G.busy || me.cpu);
  }

  function finish(){
    const [a, b] = G.score;
    const title = a === b ? "Berabere!" : `${G.players[a > b ? 0 : 1].name} kazandı!`;
    $("end-title").textContent = title;
    $("end-note").textContent = `${PL[0].av} ${G.players[0].name} ${a} · ${b} ${G.players[1].name} ${PL[1].av}`;
    sWin(); say(title);
    render();
    $("end").hidden = false; $("again").focus();
  }

  /* ---------- kurulum ---------- */
  const form = $("setup-form");
  function syncMode(){
    const cpu = form.mode.value === "cpu";
    $("cpu-level").hidden = !cpu;
    $("help-1").closest(".toggle").hidden = cpu;
    $("pn-1").disabled = cpu;
    $("pn-1").value = cpu ? "Bilgisayar" : ($("pn-1").dataset.name || "Egemen");
  }
  form.addEventListener("change", e => { if (e.target.name === "mode") syncMode(); });
  $("pn-1").addEventListener("input", e => { if (!e.target.disabled) e.target.dataset.name = e.target.value; });
  form.addEventListener("submit", e => {
    e.preventDefault();
    audio();
    const cpu = form.mode.value === "cpu";
    const players = [
      {name: $("pn-0").value.trim() || "Mavi", help: $("help-0").checked, cpu: false},
      {name: $("pn-1").value.trim() || "Turuncu", help: $("help-1").checked && !cpu, cpu, level: +form.cpu.value}
    ];
    starter = 0;
    newGame({players, size: +form.size.value}, starter);
  });
  $("open-setup").addEventListener("click", () => { timers = []; if (G) G.over = true; $("end").hidden = true; $("setup").hidden = false; });
  $("end-setup").addEventListener("click", () => { $("end").hidden = true; $("setup").hidden = false; });
  $("again").addEventListener("click", () => { audio(); starter = 1 - starter; newGame(G.cfg, starter); });  // başlayan sırayla değişir

  /* ---------- döngü ---------- */
  let last = performance.now();
  function tick(dt){
    for (const tm of timers) tm.t -= dt;
    const due = timers.filter(tm => tm.t <= 0); timers = timers.filter(tm => tm.t > 0); due.forEach(tm => tm.fn());
  }
  function frame(now){
    const dt = Math.min(.05, (now - last) / 1000); last = now;
    tick(dt);
    requestAnimationFrame(frame);
  }
  document.addEventListener("visibilitychange", () => { last = performance.now(); if (document.hidden && canSpeak) speechSynthesis.cancel(); });
  $("pn-0").value = "Enes"; $("pn-1").value = "Egemen"; $("pn-1").dataset.name = "Egemen";
  syncMode();
  requestAnimationFrame(frame);

  // testler için: kurallar ve durum
  window.__kare = {makeGeo, apply, sides, closes, isSafe, giveaway, cpuChoice, open, state: () => G, newGame, play, tick};
})();
