(() => {
  "use strict";
  const $ = id => document.getElementById(id);

  /* ---------- tahta ----------
     64 kare, 0 boş. +1 beyaz taş, +2 beyaz dama, -1 siyah taş, -2 siyah dama.
     Beyaz (alt oyuncu, 0) yukarı gider; siyah (üst oyuncu, 1) aşağı.            */
  const N = 8;
  const rc = i => [(i / N) | 0, i % N];
  const at = (r, c) => r * N + c;
  const inside = (r, c) => r >= 0 && c >= 0 && r < N && c < N;
  const sideOf = v => v > 0 ? 0 : v < 0 ? 1 : -1;
  const isKing = v => Math.abs(v) === 2;
  const DIRS = [[-1,0],[0,1],[1,0],[0,-1]];          // yukarı, sağ, aşağı, sol

  function startBoard(){
    const b = new Array(64).fill(0);
    for (let c = 0; c < N; c++){ b[at(1, c)] = -1; b[at(2, c)] = -1; b[at(5, c)] = 1; b[at(6, c)] = 1; }
    return b;
  }
  const forwardOf = side => side === 0 ? -1 : 1;     // beyaz yukarı (r azalır)

  // bir taşın yapabileceği bütün vuruş zincirleri (taşlar anında kalkar)
  function captureSeqs(b, i){
    const v = b[i];
    if (!v) return [];
    const side = sideOf(v), king = isKing(v);
    const out = [];
    const walk = (board, pos, path) => {
      const moves = [];
      const [r, c] = rc(pos);
      for (const [dr, dc] of DIRS){
        if (!king && dr === forwardOf(side) * -1) continue;        // taş geri vuramaz
        if (king){
          let rr = r + dr, cc = c + dc;
          while (inside(rr, cc) && board[at(rr, cc)] === 0){ rr += dr; cc += dc; }
          if (!inside(rr, cc)) continue;
          const target = board[at(rr, cc)];
          if (target === 0 || sideOf(target) === side) continue;
          let lr = rr + dr, lc = cc + dc;
          while (inside(lr, lc) && board[at(lr, lc)] === 0){
            moves.push({to: at(lr, lc), over: at(rr, cc)});
            lr += dr; lc += dc;
          }
        } else {
          const mr = r + dr, mc = c + dc, tr = r + dr * 2, tc = c + dc * 2;
          if (!inside(tr, tc)) continue;
          const mid = board[at(mr, mc)];
          if (mid === 0 || sideOf(mid) === side) continue;
          if (board[at(tr, tc)] !== 0) continue;
          moves.push({to: at(tr, tc), over: at(mr, mc)});
        }
      }
      if (!moves.length){
        if (path.length) out.push(path.slice());
        return;
      }
      for (const m of moves){
        const nb = board.slice();
        nb[m.over] = 0;
        nb[m.to] = nb[pos]; nb[pos] = 0;
        path.push(m);
        walk(nb, m.to, path);
        path.pop();
      }
    };
    walk(b, i, []);
    return out;
  }
  function quietMoves(b, i){
    const v = b[i];
    if (!v) return [];
    const side = sideOf(v), king = isKing(v), [r, c] = rc(i), out = [];
    for (const [dr, dc] of DIRS){
      if (!king && dr === forwardOf(side) * -1) continue;          // taş geri gitmez
      if (king){
        let rr = r + dr, cc = c + dc;
        while (inside(rr, cc) && b[at(rr, cc)] === 0){ out.push({to: at(rr, cc)}); rr += dr; cc += dc; }
      } else {
        const rr = r + dr, cc = c + dc;
        if (inside(rr, cc) && b[at(rr, cc)] === 0) out.push({to: at(rr, cc)});
      }
    }
    return out;
  }
  // sıradaki oyuncunun oynayabileceği bütün hamleler (vuruş varsa sadece en uzun vuruşlar)
  function legalMoves(b, side){
    const caps = [];
    for (let i = 0; i < 64; i++){
      if (b[i] === 0 || sideOf(b[i]) !== side) continue;
      for (const seq of captureSeqs(b, i)) caps.push({from: i, seq});
    }
    if (caps.length){
      const max = Math.max(...caps.map(c => c.seq.length));
      return caps.filter(c => c.seq.length === max);
    }
    const out = [];
    for (let i = 0; i < 64; i++){
      if (b[i] === 0 || sideOf(b[i]) !== side) continue;
      for (const m of quietMoves(b, i)) out.push({from: i, seq: [{to: m.to}]});
    }
    return out;
  }
  function applyMove(b, mv){
    const nb = b.slice();
    let pos = mv.from;
    const v = nb[pos];
    nb[pos] = 0;
    for (const step of mv.seq){
      if (step.over !== undefined) nb[step.over] = 0;
      pos = step.to;
    }
    nb[pos] = v;
    // terfi: hamle karşı sırada bittiyse
    const [r] = rc(pos);
    const side = sideOf(v);
    if (!isKing(v) && ((side === 0 && r === 0) || (side === 1 && r === N - 1))) nb[pos] = side === 0 ? 2 : -2;
    return {b: nb, end: pos, taken: mv.seq.filter(s => s.over !== undefined).length,
            promoted: !isKing(v) && ((side === 0 && r === 0) || (side === 1 && r === N - 1))};
  }
  const pieces = (b, side) => b.filter(v => v !== 0 && sideOf(v) === side).length;

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
  const sTap = () => tone(520, 560, "sine", .06, .09);
  const sMove = () => tone(300, 240, "triangle", .09, .1);
  const sTake = k => tone(420 + k * 90, 700 + k * 90, "triangle", .14, .14);
  const sKing = () => [660, 880, 1100].forEach((f, k) => tone(f, f, "triangle", .16, .14, k * .08));
  const sWin = () => [523, 659, 784, 1047, 1319].forEach((f, k) => tone(f, f, "triangle", .22, .15, k * .1));

  const canSpeak = "speechSynthesis" in window;
  let trVoice = null;
  function pickVoice(){ trVoice = speechSynthesis.getVoices().find(v => /^tr(-|_|$)/i.test(v.lang)) || null; }
  if (canSpeak){ pickVoice(); if (speechSynthesis.addEventListener) speechSynthesis.addEventListener("voiceschanged", pickVoice); }
  function say(text){
    if (!canSpeak || !soundOn || !trVoice) return;
    speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text); u.voice = trVoice; u.lang = trVoice.lang; u.rate = .98; u.pitch = 1.1;
    speechSynthesis.speak(u);
  }
  function renderSound(){
    $("ic-on").hidden = !soundOn; $("ic-off").hidden = soundOn;
    $("sound").setAttribute("aria-label", soundOn ? "Sesi kapat" : "Sesi aç");
    $("sound").setAttribute("aria-pressed", String(soundOn));
  }
  $("sound").addEventListener("click", () => { soundOn = !soundOn; if (!soundOn && canSpeak) speechSynthesis.cancel(); renderSound(); });
  renderSound();

  /* ---------- bilgisayar ---------- */
  function evalBoard(b, me){
    let s = 0;
    for (let i = 0; i < 64; i++){
      const v = b[i];
      if (!v) continue;
      const side = sideOf(v);
      const [r] = rc(i);
      const adv = side === 0 ? (7 - r) : r;                 // ileri gitmek iyi
      const val = (isKing(v) ? 7 : 1.6 + adv * .06);
      s += side === me ? val : -val;
    }
    return s;
  }
  function search(b, side, me, depth){
    const moves = legalMoves(b, side);
    if (!moves.length) return {score: side === me ? -999 : 999};
    if (depth <= 0) return {score: evalBoard(b, me)};
    let bestMv = moves[0], bestSc = side === me ? -1e9 : 1e9;
    for (const mv of moves){
      const r = applyMove(b, mv);
      const sc = search(r.b, 1 - side, me, depth - 1).score;
      if (side === me ? sc > bestSc : sc < bestSc){ bestSc = sc; bestMv = mv; }
    }
    return {score: bestSc, mv: bestMv};
  }
  function cpuPick(b, side, level){
    const moves = legalMoves(b, side);
    if (!moves.length) return null;
    if (level === 0) return moves[Math.random() * moves.length | 0];
    return search(b, side, side, level === 1 ? 2 : 4).mv || moves[0];
  }

  /* ---------- durum ---------- */
  let G = null, timers = [];
  const later = (sec, fn) => timers.push({t: sec, fn});

  function newGame(cfg){
    timers = [];
    G = {cfg, b: startBoard(), cur: 0, sel: -1, over: false, busy: false, last: [], plies: 0, quiet: 0};
    ["setup", "end"].forEach(id => $(id).hidden = true);
    buildBoard();
    render();
    turnStart();
  }
  const P = () => G.cfg.players[G.cur];

  function turnStart(){
    if (G.over) return;
    const moves = legalMoves(G.b, G.cur);
    if (!moves.length || pieces(G.b, G.cur) === 0){ finish(1 - G.cur, moves.length ? "taş" : "hamle"); return; }
    G.sel = -1;
    render();
    const p = P();
    if (p.cpu){
      $("hintline").textContent = `${p.name} düşünüyor…`;
      later(.6, () => {
        const mv = cpuPick(G.b, G.cur, G.cfg.cpu);
        if (mv) play(mv);
      });
      return;
    }
    const caps = moves[0].seq.some(s => s.over !== undefined);
    $("hintline").textContent = caps ? "Vuruş var! En çok taş alan hamleyi oyna." : "Taşına dokun, sonra gideceği kareye dokun.";
    if (p.help) say(caps ? "Vuruş var!" : `Sıra ${p.name}'de`);
  }

  function play(mv){
    G.busy = true;
    const r = applyMove(G.b, mv);
    const taken = mv.seq.filter(s => s.over !== undefined).map(s => s.over);
    // vurulan taşları önce göster, sonra kaldır
    for (const t of taken){ const el = cells[t]; if (el) el.classList.add("gone"); }
    taken.forEach((_, k) => later(.06 * k, () => sTake(k)));
    if (!taken.length) sMove();
    G.last = [mv.from, r.end];
    later(taken.length ? .34 : .1, () => {
      G.b = r.b;
      G.plies++;
      G.quiet = taken.length || r.promoted ? 0 : G.quiet + 1;
      if (r.promoted){ sKing(); if (P().help) say("Dama oldun!"); }
      if (taken.length && P().help) say(taken.length > 1 ? `${taken.length} taş aldın!` : "Taş aldın!");
      render();
      if (pieces(G.b, 1 - G.cur) === 0){ finish(G.cur, "taş"); return; }
      if (G.quiet >= 60){ finish(-1, "berabere"); return; }
      G.cur = 1 - G.cur;
      G.busy = false;
      turnStart();
    });
  }

  function finish(winner, why){
    G.over = true; G.busy = false;
    render();
    const nm = winner >= 0 ? G.cfg.players[winner].name : "";
    $("end-title").textContent = winner < 0 ? "Berabere!" : `${nm} kazandı!`;
    $("end-note").textContent = winner < 0 ? "Uzun süre vuruş olmadı." :
      why === "taş" ? "Rakibin taşı kalmadı." : "Rakibin oynayacak hamlesi kalmadı.";
    sWin();
    say(winner < 0 ? "Berabere" : `${nm} kazandı!`);
    later(.7, () => { $("end").hidden = false; $("again").focus(); });
  }

  /* ---------- tahta çizimi ---------- */
  const cells = [];
  function buildBoard(){
    const box = $("board");
    box.innerHTML = ""; cells.length = 0;
    for (let i = 0; i < 64; i++){
      const [r, c] = rc(i);
      const b = document.createElement("button");
      b.type = "button";
      b.className = "sq" + ((r + c) % 2 ? " d" : "");
      b.setAttribute("role", "gridcell");
      b.setAttribute("aria-label", `${String.fromCharCode(97 + c)}${8 - r}`);
      b.addEventListener("click", () => tap(i));
      box.appendChild(b);
      cells.push(b);
    }
  }
  function render(){
    const moves = G.over ? [] : legalMoves(G.b, G.cur);
    const p = G.over ? null : P();
    const fromSet = new Set(moves.map(m => m.from));
    // seçili taşın gidebileceği ilk adımlar
    const steps = new Map();
    if (G.sel >= 0) for (const m of moves){
      if (m.from !== G.sel) continue;
      const s0 = m.seq[0];
      const cur = steps.get(s0.to) || {take: false, moves: []};
      cur.take = cur.take || s0.over !== undefined;
      cur.moves.push(m);
      steps.set(s0.to, cur);
    }
    for (let i = 0; i < 64; i++){
      const el = cells[i], v = G.b[i];
      el.className = "sq" + ((rc(i)[0] + rc(i)[1]) % 2 ? " d" : "")
        + (G.last.includes(i) ? " last" : "")
        + (i === G.sel ? " sel" : "")
        + (!G.over && !G.busy && p && !p.cpu && fromSet.has(i) ? " live" : "")
        + (!G.over && !G.busy && p && !p.cpu && p.help && fromSet.has(i) && G.sel < 0 ? " can" : "")
        + (steps.has(i) ? (steps.get(i).take ? " take" : " move") : "");
      el.innerHTML = "";
      if (v){
        const pc = document.createElement("div");
        pc.className = "pc " + (sideOf(v) === 0 ? "w" : "b");
        if (isKing(v)) pc.innerHTML = `<span class="crown">♛</span>`;
        el.appendChild(pc);
      }
    }
    G.steps = steps;
    // skor şeridi
    const box = $("score"); box.innerHTML = "";
    G.cfg.players.forEach((pl, k) => {
      const d = document.createElement("div");
      d.className = "sc" + (k === G.cur && !G.over ? " on" : "");
      const kings = G.b.filter(v => v !== 0 && sideOf(v) === k && isKing(v)).length;
      d.innerHTML = `<i style="background:${k === 0 ? "#F5F1E8" : "#2F2F38"}"></i><span class="nm"></span><b>${pieces(G.b, k)}</b>${kings ? `<span>♛${kings}</span>` : ""}`;
      d.querySelector(".nm").textContent = pl.name + (pl.cpu ? " 🤖" : "");
      box.appendChild(d);
    });
  }

  function tap(i){
    if (!G || G.over || G.busy) return;
    const p = P();
    if (p.cpu) return;
    audio();
    const moves = legalMoves(G.b, G.cur);
    if (G.sel >= 0 && G.steps && G.steps.has(i)){
      const opts = G.steps.get(i).moves;
      // aynı ilk adımı paylaşan birden çok zincir varsa en uzununu oyna
      const mv = opts.sort((a, b) => b.seq.length - a.seq.length)[0];
      play(mv);
      return;
    }
    if (moves.some(m => m.from === i)){ G.sel = i; sTap(); render(); return; }
    if (G.b[i] !== 0 && sideOf(G.b[i]) === G.cur){
      $("hintline").textContent = moves[0] && moves[0].seq.some(s => s.over !== undefined)
        ? "Vuruş mecburi: parlayan taşlardan birini oyna." : "Bu taş şu an oynayamıyor.";
      sTap();
      return;
    }
    G.sel = -1; render();
  }

  /* ---------- kurulum ---------- */
  const form = $("setup-form");
  function syncMode(){
    const cpu = form.mode.value === "cpu";
    $("cpu-level").hidden = !cpu;
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
      {name: $("pn-0").value.trim() || "Beyaz", help: $("help-0").checked, cpu: false},
      {name: ($("pn-1").value.trim() || "Siyah"), help: $("help-1").checked && !cpu, cpu}
    ];
    newGame({players, cpu: cpu ? +form.cpu.value : null});
  });
  $("open-setup").addEventListener("click", () => { timers = []; if (G) G.over = true; $("end").hidden = true; $("setup").hidden = false; });
  $("end-setup").addEventListener("click", () => { $("end").hidden = true; $("setup").hidden = false; });
  $("again").addEventListener("click", () => { audio(); newGame(G.cfg); });

  /* ---------- döngü ---------- */
  let last = performance.now();
  function frame(now){
    const dt = Math.min(.05, (now - last) / 1000); last = now;
    for (const tm of timers) tm.t -= dt;
    const due = timers.filter(tm => tm.t <= 0); timers = timers.filter(tm => tm.t > 0); due.forEach(tm => tm.fn());
    requestAnimationFrame(frame);
  }
  document.addEventListener("visibilitychange", () => { last = performance.now(); if (document.hidden && canSpeak) speechSynthesis.cancel(); });
  $("pn-0").value = "Enes"; $("pn-1").value = "Egemen"; $("pn-1").dataset.name = "Egemen";
  requestAnimationFrame(frame);
})();
