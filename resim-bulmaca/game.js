(() => {
  "use strict";
  const $ = id => document.getElementById(id);

  /* ---------- resimler ---------- */
  // '.' boş, harf = boyalı kare ve resmin rengi
  const COLORS = {r:"#E5484D", y:"#F5C542", g:"#2EB872", b:"#3D8BFD", k:"#2B2D42", w:"#C9D3E3", o:"#FF8A3D", p:"#FF8FB1", n:"#8B5A2B"};
  const PICS = [
    {id:"kalp", nm:"Kalp", rows:[
      ".r.r.",
      "rrrrr",
      "rrrrr",
      ".rrr.",
      "..r.."]},
    {id:"ev", nm:"Ev", rows:[
      "..r..",
      ".rrr.",
      "rrrrr",
      ".yny.",
      ".yny."]},
    {id:"agac", nm:"Ağaç", rows:[
      "..g..",
      ".ggg.",
      "ggggg",
      "..n..",
      ".nnn."]},
    {id:"mantar5", nm:"Mantar", rows:[
      ".rrr.",
      "rrwrr",
      "rrrrr",
      ".yyy.",
      ".yyy."]},
    {id:"roket", nm:"Roket", rows:[
      "....rr....",
      "...rwwr...",
      "...wbbw...",
      "...wbbw...",
      "...wwww...",
      "..rwwwwr..",
      ".rrwwwwrr.",
      ".r.wwww.r.",
      "...oyyo...",
      "....oo...."]},
    {id:"kedi", nm:"Kedi", rows:[
      "kk......kk",
      "kkk....kkk",
      ".kkkkkkkk.",
      ".kgkkkkgk.",
      ".kkkkkkkk.",
      ".kkkppkkk.",
      "..kkkkkk..",
      "...kkkk...",
      "..kkkkkk..",
      ".kkkkkkkk."]},
    {id:"balik", nm:"Balık", rows:[
      "..........",
      "....bb....",
      "...bbbb..b",
      "..bbbbbbbb",
      ".bkbbbbbb.",
      ".bbbbbbbb.",
      "..bbbbbbbb",
      "...bbbb..b",
      "....bb....",
      ".........."]},
    {id:"kupa", nm:"Kupa", rows:[
      "yyyyyyyyyy",
      "y.yyyyyy.y",
      "y.yyyyyy.y",
      ".yyyyyyyy.",
      "..yyyyyy..",
      "...yyyy...",
      "....yy....",
      "....yy....",
      "...oooo...",
      "..oooooo.."]},
    {id:"mantar", nm:"Mantar", rows:[
      "...rrrr...",
      "..rrwwrr..",
      ".rwwrrrrr.",
      ".rrrrrwwr.",
      "rrwwrrrrrr",
      "rrwwrrrrrr",
      "...yyyy...",
      "...yyyy...",
      "...yyyy...",
      "..yyyyyy.."]},
    {id:"robot", nm:"Robot", rows:[
      ".......r.......",
      ".......k.......",
      "...kkkkkkkkk...",
      "...kwwwwwwwk...",
      "...kwbwwwbwk...",
      "...kwwwwwwwk...",
      "...kwrrrrrwk...",
      "...kkkkkkkkk...",
      ".....kkkkk.....",
      ".kkkkkkkkkkkkk.",
      ".k.kgggggggk.k.",
      ".k.kgyyyyygk.k.",
      ".k.kgggggggk.k.",
      "...kk.....kk...",
      "..kkk.....kkk.."]},
    {id:"dino", nm:"Dinozor", rows:[
      "........ggggg..",
      ".......gggkggg.",
      ".......ggggggg.",
      ".......gggg....",
      ".......ggggggg.",
      "g.....gggg.....",
      "g....ggggggg...",
      "gg..gggggg.g...",
      "ggggggggggg....",
      ".gggggggggg....",
      "..ggggggggg....",
      "...ggggggg.....",
      "....ggg.gg.....",
      "....gg...g.....",
      "....ggg..gg...."]}
  ];
  const SIZES = [5, 10, 15];
  const SAVE_KEY = "resim-bulmaca";

  /* ---------- ipuçları ve çözücü ---------- */
  const UNK = 0, FILL = 1, EMPTY = 2;
  function lineClue(line){                     // line: dizi, boyalı = true
    const out = []; let run = 0;
    for (const v of line){ if (v) run++; else if (run){ out.push(run); run = 0; } }
    if (run) out.push(run);
    return out;
  }
  function cluesOf(sol){
    const n = sol.length;
    return {
      rows: sol.map(r => lineClue(r)),
      cols: sol[0].map((_, c) => lineClue(sol.map(r => r[c])))
    };
  }

  // tek satır mantığı: ipucuyla uyumlu tüm yerleşimlerin ortak sonucunu bulur
  function solveLine(clue, cells){
    const n = cells.length, k = clue.length;
    const memo = new Map();
    function ok(i, j){
      const key = i * 32 + j;
      if (memo.has(key)) return memo.get(key);
      let res = false;
      if (j === k){
        res = true;
        for (let x = i; x < n; x++) if (cells[x] === FILL){ res = false; break; }
      } else if (i < n){
        if (cells[i] !== FILL && ok(i + 1, j)) res = true;
        if (!res){
          const L = clue[j];
          if (i + L <= n){
            let fits = true;
            for (let x = i; x < i + L; x++) if (cells[x] === EMPTY){ fits = false; break; }
            if (fits && i + L < n && cells[i + L] === FILL) fits = false;
            if (fits) res = ok(Math.min(n, i + L + 1), j + 1);
          }
        }
      }
      memo.set(key, res);
      return res;
    }
    if (!ok(0, 0)) return null;
    const canF = new Array(n).fill(false), canE = new Array(n).fill(false);
    const seen = new Set();
    (function walk(i, j){
      const key = i * 32 + j;
      if (seen.has(key)) return;
      seen.add(key);
      if (j === k){ for (let x = i; x < n; x++) canE[x] = true; return; }
      if (i >= n) return;
      if (cells[i] !== FILL && ok(i + 1, j)){ canE[i] = true; walk(i + 1, j); }
      const L = clue[j];
      if (i + L <= n){
        let fits = true;
        for (let x = i; x < i + L; x++) if (cells[x] === EMPTY){ fits = false; break; }
        if (fits && i + L < n && cells[i + L] === FILL) fits = false;
        if (fits && ok(Math.min(n, i + L + 1), j + 1)){
          for (let x = i; x < i + L; x++) canF[x] = true;
          if (i + L < n) canE[i + L] = true;
          walk(Math.min(n, i + L + 1), j + 1);
        }
      }
    })(0, 0);
    return cells.map((v, x) => canF[x] && !canE[x] ? FILL : !canF[x] && canE[x] ? EMPTY : v);
  }

  // satır/sütun mantığını tekrar tekrar uygular; tahmin yapmaz
  function solveGrid(clues, start){
    const n = clues.rows.length;
    const g = start ? start.map(r => r.slice()) : Array.from({length: n}, () => new Array(n).fill(UNK));
    let changed = true, passes = 0;
    while (changed){
      changed = false; passes++;
      for (let r = 0; r < n; r++){
        const res = solveLine(clues.rows[r], g[r]);
        if (!res) return {ok: false};
        for (let c = 0; c < n; c++) if (res[c] !== g[r][c]){ g[r][c] = res[c]; changed = true; }
      }
      for (let c = 0; c < n; c++){
        const col = g.map(row => row[c]);
        const res = solveLine(clues.cols[c], col);
        if (!res) return {ok: false};
        for (let r = 0; r < n; r++) if (res[r] !== g[r][c]){ g[r][c] = res[r]; changed = true; }
      }
    }
    const solved = g.every(row => row.every(v => v !== UNK));
    return {ok: true, solved, grid: g, passes};
  }

  function picSolution(p){ return p.rows.map(row => [...row].map(ch => ch !== ".")); }

  // rastgele bulmaca: mantıkla çözülene kadar yeniden üret
  function randomPuzzle(n){
    const dens = n === 5 ? .6 : n === 10 ? .58 : .56;
    for (let tries = 1; tries < 400; tries++){
      const sol = Array.from({length: n}, () => Array.from({length: n}, () => Math.random() < dens));
      if (sol.some(r => !r.some(Boolean))) continue;
      const res = solveGrid(cluesOf(sol));
      if (res.ok && res.solved) return {sol, tries};
    }
    return null;
  }

  /* ---------- kayıt ---------- */
  let save = {best: {}, solved: {}, rand: {}};
  try { save = Object.assign(save, JSON.parse(localStorage.getItem(SAVE_KEY)) || {}); } catch (e) {}
  const store = () => { try { localStorage.setItem(SAVE_KEY, JSON.stringify(save)); } catch (e) {} };

  /* ---------- ses ---------- */
  let ac = null;
  function audio(){
    if (!ac){ try { ac = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { ac = null; } }
    if (ac && ac.state === "suspended") ac.resume();
    return ac;
  }
  function tone(f1, f2, type, dur, vol, delay){
    const a = audio(); if (!a) return;
    const t = a.currentTime + (delay || 0), o = a.createOscillator(), g = a.createGain();
    o.type = type; o.frequency.setValueAtTime(f1, t); o.frequency.exponentialRampToValueAtTime(Math.max(20, f2), t + dur * .9);
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + .01); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(a.destination); o.start(t); o.stop(t + dur + .05);
  }
  const sTick = f => tone(f ? 520 : 380, f ? 560 : 340, "sine", .05, .05);
  const sLine = () => tone(880, 1180, "triangle", .12, .07);
  const sWin = () => [523, 659, 784, 1047, 1319].forEach((f, k) => tone(f, f, "triangle", .22, .12, k * .09));

  /* ---------- liste ---------- */
  function thumb(sol, rows, size){
    const c = document.createElement("canvas"), n = sol.length;
    c.width = c.height = n; const x = c.getContext("2d");
    for (let r = 0; r < n; r++) for (let q = 0; q < n; q++) if (sol[r][q]){
      x.fillStyle = rows ? COLORS[rows[r][q]] : "#F5C542"; x.fillRect(q, r, 1, 1);
    }
    if (size) c.style.width = c.style.height = size + "px";
    return c;
  }
  const fmt = s => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;

  function showList(){
    stopTimer();
    $("play").hidden = true; $("list").hidden = false; $("win").hidden = true;
    $("to-list").hidden = true;
    const box = $("packs"); box.innerHTML = "";
    for (const n of SIZES){
      const pics = PICS.filter(p => p.rows.length === n);
      const done = pics.filter(p => save.solved[p.id]).length;
      const sec = document.createElement("section"); sec.className = "pack";
      sec.innerHTML = `<h2>${n}×${n} <small>${done}/${pics.length} çözüldü${save.rand[n] ? ` · ${save.rand[n]} rastgele` : ""}</small></h2><div class="cards"></div>`;
      const cards = sec.querySelector(".cards");
      pics.forEach((p, idx) => {
        const b = document.createElement("button");
        b.type = "button"; b.className = "pz" + (save.solved[p.id] ? " done" : "");
        if (save.solved[p.id]) b.appendChild(thumb(picSolution(p), p.rows));
        else { const q = document.createElement("span"); q.className = "q"; q.textContent = "?"; b.appendChild(q); }
        const lab = document.createElement("span"); lab.textContent = save.solved[p.id] ? p.nm : `Bulmaca ${idx + 1}`; b.appendChild(lab);
        const sm = document.createElement("small"); sm.textContent = save.best[p.id] != null ? `🏆 ${fmt(save.best[p.id])}` : "—"; b.appendChild(sm);
        b.addEventListener("click", () => start({pic: p}));
        cards.appendChild(b);
      });
      const rb = document.createElement("button");
      rb.type = "button"; rb.className = "pz rand";
      rb.innerHTML = `<span class="q">🎲</span><span>Rastgele</span><small>${save.best["rand" + n] != null ? "🏆 " + fmt(save.best["rand" + n]) : "sonsuz"}</small>`;
      rb.addEventListener("click", () => start({rand: n}));
      cards.appendChild(rb);
      box.appendChild(sec);
    }
  }

  /* ---------- oyun durumu ---------- */
  let P = null;                                // aktif bulmaca
  let mode = FILL, timerId = null;

  function start(opt){
    audio();
    let sol, rows = null, id, nm;
    if (opt.pic){ sol = picSolution(opt.pic); rows = opt.pic.rows; id = opt.pic.id; nm = opt.pic.nm; }
    else { const r = randomPuzzle(opt.rand); sol = r.sol; id = "rand" + opt.rand; nm = "Rastgele"; }
    const n = sol.length;
    P = {opt, sol, rows, id, nm, n, clues: cluesOf(sol), g: Array.from({length: n}, () => new Array(n).fill(UNK)),
      undo: [], hints: 0, t0: 0, sec: 0, won: false, cur: {r: 0, c: 0}, drag: null, okRows: [], okCols: []};
    $("list").hidden = true; $("play").hidden = false; $("win").hidden = true; $("to-list").hidden = false;
    $("p-name").textContent = `${n}×${n}${opt.rand ? " · rastgele" : ""}`;
    $("p-best").textContent = save.best[id] != null ? `🏆 ${fmt(save.best[id])}` : "";
    $("p-time").textContent = "0:00";
    $("board").classList.remove("won");
    setHint("Kareye dokun ya da parmağını sürükle. Boş olduğunu bildiğin karelere ✕ koy.");
    stopTimer();
    build();
    layout();
    render();
  }
  function startTimer(){
    if (P.t0) return;
    P.t0 = performance.now();
    timerId = setInterval(() => { if (!P || P.won) return; P.sec = Math.floor((performance.now() - P.t0) / 1000); $("p-time").textContent = fmt(P.sec); }, 250);
  }
  function stopTimer(){ if (timerId){ clearInterval(timerId); timerId = null; } }
  function setHint(t){ $("hintline").textContent = t; }

  /* ---------- tahta ---------- */
  let cellEls = [], rcEls = [], ccEls = [];
  function build(){
    const b = $("board"), n = P.n;
    b.innerHTML = ""; cellEls = []; rcEls = []; ccEls = [];
    b.style.setProperty("--n", n);
    const corner = document.createElement("div"); corner.className = "corner"; b.appendChild(corner);
    for (let c = 0; c < n; c++){
      const d = document.createElement("div"); d.className = "cc";
      d.innerHTML = (P.clues.cols[c].length ? P.clues.cols[c] : [0]).map(v => `<span>${v}</span>`).join("");
      d.style.gridRow = 1; d.style.gridColumn = c + 2;
      b.appendChild(d); ccEls.push(d);
    }
    for (let r = 0; r < n; r++){
      const d = document.createElement("div"); d.className = "rc";
      d.innerHTML = (P.clues.rows[r].length ? P.clues.rows[r] : [0]).map(v => `<span>${v}</span>`).join("");
      d.style.gridRow = r + 2; d.style.gridColumn = 1;
      b.appendChild(d); rcEls.push(d);
      const row = [];
      for (let c = 0; c < n; c++){
        const e = document.createElement("div");
        let cls = "cell";
        if (c === 0) cls += " c0"; if (r === 0) cls += " r0";
        if (c % 5 === 4 && c < n - 1) cls += " c5"; if (r % 5 === 4 && r < n - 1) cls += " r5";
        e.className = cls; e.style.gridRow = r + 2; e.style.gridColumn = c + 2;
        e.setAttribute("role", "gridcell");
        b.appendChild(e); row.push(e);
      }
      cellEls.push(row);
    }
  }

  function layout(){
    if (!P || $("play").hidden) return;
    const n = P.n, wrap = $("board-wrap");
    const maxR = Math.max(1, ...P.clues.rows.map(c => c.length)), maxC = Math.max(1, ...P.clues.cols.map(c => c.length));
    const W = Math.min(wrap.clientWidth, 740) - 14, Hh = wrap.clientHeight - 14;
    // ipucu alanı hücre boyuna bağlı: sayı başına ~0.62 hücre
    let cell = Math.floor(Math.min(W / (n + maxR * .62 + .3), Hh / (n + maxC * .56 + .3), 46));
    cell = Math.max(16, cell);
    const b = $("board");
    b.style.setProperty("--cell", cell + "px");
    b.style.setProperty("--clue-w", Math.ceil(maxR * cell * .62 + 6) + "px");
    b.style.setProperty("--clue-h", Math.ceil(maxC * cell * .56 + 6) + "px");
  }
  window.addEventListener("resize", layout);

  function lineOk(r, isCol){
    const n = P.n, line = [];
    for (let i = 0; i < n; i++) line.push((isCol ? P.g[i][r] : P.g[r][i]) === FILL);
    const want = isCol ? P.clues.cols[r] : P.clues.rows[r];
    const got = lineClue(line);
    return got.length === want.length && got.every((v, i) => v === want[i]);
  }

  function render(){
    const n = P.n, cur = P.cur;
    for (let r = 0; r < n; r++) for (let c = 0; c < n; c++){
      const e = cellEls[r][c], v = P.g[r][c];
      e.classList.toggle("f", v === FILL);
      e.classList.toggle("x", v === EMPTY);
      e.classList.toggle("hl", !P.won && v !== FILL && (r === cur.r || c === cur.c));
      e.classList.toggle("cur", !P.won && kbd && r === cur.r && c === cur.c);
    }
    for (let i = 0; i < n; i++){
      const ro = lineOk(i, false), co = lineOk(i, true);
      rcEls[i].classList.toggle("ok", ro); ccEls[i].classList.toggle("ok", co);
      rcEls[i].classList.toggle("hl", !P.won && i === cur.r);
      ccEls[i].classList.toggle("hl", !P.won && i === cur.c);
      if (ro && !P.okRows[i]) sLine();
      if (co && !P.okCols[i]) sLine();
      P.okRows[i] = ro; P.okCols[i] = co;
    }
    $("undo").disabled = !P.undo.length || P.won;
    $("hint").disabled = P.won;
    $("hint-n").textContent = P.hints ? P.hints : "";
  }

  /* ---------- işaretleme ---------- */
  function setCell(r, c, v, stroke){
    if (P.g[r][c] === v) return false;
    stroke.push({r, c, from: P.g[r][c]});
    P.g[r][c] = v;
    return true;
  }
  function cellAt(x, y){
    const r0 = cellEls[0][0].getBoundingClientRect(), cs = r0.width;
    const c = Math.floor((x - r0.left) / cs), r = Math.floor((y - r0.top) / cs);
    return r >= 0 && c >= 0 && r < P.n && c < P.n ? {r, c} : null;
  }
  function begin(r, c, useMode){
    if (!P || P.won) return;
    startTimer();
    const now = P.g[r][c];
    const action = now === useMode ? UNK : useMode;    // aynı kalemle tekrar dokunmak siler
    P.drag = {r, c, action, orig: now, axis: null, stroke: []};
    P.cur = {r, c};
    if (setCell(r, c, action, P.drag.stroke)) sTick(action === FILL);
    render();
  }
  function extend(r, c){
    const d = P.drag; if (!d) return;
    if (!d.axis){ if (r !== d.r) d.axis = "col"; else if (c !== d.c) d.axis = "row"; else return; }
    if (d.axis === "row") r = d.r; else c = d.c;
    // başlangıçtan bu kareye kadar olan çizgiyi doldur
    const r1 = Math.min(r, d.r), r2 = Math.max(r, d.r), c1 = Math.min(c, d.c), c2 = Math.max(c, d.c);
    let any = false;
    for (let y = r1; y <= r2; y++) for (let x = c1; x <= c2; x++){
      // silme sürüklemesi sadece başladığı türdeki kareleri siler; boyama, X'lerin üstüne yazmaz
      const v = P.g[y][x];
      if (d.action === UNK && v !== d.orig) continue;
      if (d.action !== UNK && v !== UNK && v !== d.action) continue;
      if (setCell(y, x, d.action, d.stroke)) any = true;
    }
    if (any) sTick(d.action === FILL);
    P.cur = {r, c};
    render();
  }
  function finish(){
    const d = P && P.drag; if (!d) return;
    P.drag = null;
    if (d.stroke.length) P.undo.push(d.stroke);
    checkWin();
  }
  function undo(){
    if (!P || P.won || !P.undo.length) return;
    const st = P.undo.pop();
    for (let i = st.length - 1; i >= 0; i--) P.g[st[i].r][st[i].c] = st[i].from;
    render();
  }

  function checkWin(){
    for (let i = 0; i < P.n; i++) if (!lineOk(i, false) || !lineOk(i, true)) return false;
    P.won = true; stopTimer();
    P.sec = P.t0 ? Math.floor((performance.now() - P.t0) / 1000) : 0;
    const isPic = !!P.opt.pic, prevBest = save.best[P.id];
    if (isPic) save.solved[P.id] = true; else save.rand[P.n] = (save.rand[P.n] || 0) + 1;
    let rec = false;
    if (!P.hints && (prevBest == null || P.sec < prevBest)){ save.best[P.id] = P.sec; rec = true; }
    store();
    // resmi renklendir
    $("board").classList.add("won");
    for (let r = 0; r < P.n; r++) for (let c = 0; c < P.n; c++){
      const e = cellEls[r][c];
      e.classList.remove("x", "hl", "cur");
      e.style.background = P.sol[r][c] ? (P.rows ? COLORS[P.rows[r][c]] : "#F5C542") : "#FFFFFF";
    }
    render();
    sWin();
    const pic = $("win-pic"), cx = pic.getContext("2d");
    cx.clearRect(0, 0, 240, 240);
    const s = 240 / P.n;
    for (let r = 0; r < P.n; r++) for (let c = 0; c < P.n; c++) if (P.sol[r][c]){
      cx.fillStyle = P.rows ? COLORS[P.rows[r][c]] : "#F5C542"; cx.fillRect(c * s, r * s, Math.ceil(s), Math.ceil(s));
    }
    $("win-title").textContent = isPic ? `${P.nm}!` : "Çözdün!";
    $("win-sub").textContent = `${fmt(P.sec)}${P.hints ? ` · ${P.hints} ipucu (rekor sayılmaz)` : rec ? " · yeni rekor! 🏆" : prevBest != null ? ` · rekor ${fmt(prevBest)}` : ""}`;
    setTimeout(() => { if (P && P.won){ $("win").hidden = false; $("win-next").focus(); } }, 900);
    return true;
  }

  // ipucu: önce yanlış bir kareyi gösterir, yoksa mantıkla bulunabilecek bir kareyi açar
  function hint(){
    if (!P || P.won) return;
    startTimer();
    const n = P.n, wrong = [];
    for (let r = 0; r < n; r++) for (let c = 0; c < n; c++){
      const v = P.g[r][c];
      if ((v === FILL && !P.sol[r][c]) || (v === EMPTY && P.sol[r][c])) wrong.push({r, c});
    }
    P.hints++;
    if (wrong.length){
      const w = wrong[0], st = [];
      setCell(w.r, w.c, UNK, st); P.undo.push(st);
      const e = cellEls[w.r][w.c]; e.classList.remove("bad"); void e.offsetWidth; e.classList.add("bad");
      setHint(`Bu kare yanlıştı, sildim. (${wrong.length > 1 ? `${wrong.length - 1} yanlış daha var` : "başka yanlış yok"})`);
      P.cur = w; render(); return;
    }
    // doğru işaretlerden yola çıkıp bir adım mantık yürüt
    const res = solveGrid(P.clues, P.g);
    let pick = null;
    if (res.ok){
      outer: for (let r = 0; r < n; r++) for (let c = 0; c < n; c++){
        if (P.g[r][c] === UNK && res.grid[r][c] !== UNK && P.sol[r][c] === (res.grid[r][c] === FILL)){
          // satırı ya da sütunu tek başına bunu söylüyorsa onu tercih et
          const rowRes = solveLine(P.clues.rows[r], P.g[r]);
          const colRes = solveLine(P.clues.cols[c], P.g.map(q => q[c]));
          if ((rowRes && rowRes[c] !== UNK) || (colRes && colRes[r] !== UNK)){ pick = {r, c}; break outer; }
          if (!pick) pick = {r, c};
        }
      }
    }
    if (!pick){ outer2: for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) if (P.g[r][c] === UNK){ pick = {r, c}; break outer2; } }
    if (!pick){ render(); return; }
    const st = [];
    setCell(pick.r, pick.c, P.sol[pick.r][pick.c] ? FILL : EMPTY, st); P.undo.push(st);
    const e = cellEls[pick.r][pick.c]; e.classList.remove("hint"); void e.offsetWidth; e.classList.add("hint");
    setHint(P.sol[pick.r][pick.c] ? "Bu kare boyalı olmalı." : "Bu kare boş olmalı.");
    P.cur = pick; render(); checkWin();
  }

  /* ---------- olaylar ---------- */
  let kbd = false;
  const board = $("board");
  board.addEventListener("pointerdown", e => {
    if (!P || P.won) return;
    const at = cellAt(e.clientX, e.clientY); if (!at) return;
    e.preventDefault(); kbd = false;
    try { board.setPointerCapture(e.pointerId); } catch (err) {}
    begin(at.r, at.c, e.button === 2 ? EMPTY : mode);
  });
  board.addEventListener("pointermove", e => {
    if (!P || !P.drag) return;
    const at = cellAt(e.clientX, e.clientY); if (at) extend(at.r, at.c);
  });
  ["pointerup", "pointercancel", "lostpointercapture"].forEach(ev => board.addEventListener(ev, finish));
  board.addEventListener("contextmenu", e => e.preventDefault());

  function setMode(m){
    mode = m;
    $("m-fill").classList.toggle("on", m === FILL); $("m-fill").setAttribute("aria-pressed", String(m === FILL));
    $("m-x").classList.toggle("on", m === EMPTY); $("m-x").setAttribute("aria-pressed", String(m === EMPTY));
  }
  $("m-fill").addEventListener("click", () => setMode(FILL));
  $("m-x").addEventListener("click", () => setMode(EMPTY));
  $("undo").addEventListener("click", undo);
  $("hint").addEventListener("click", hint);
  $("restart").addEventListener("click", () => { if (P && confirm("Bu bulmacayı baştan başlatmak istiyor musun?")) start(P.opt.pic ? {pic: P.opt.pic} : {rand: P.n}); });
  $("to-list").addEventListener("click", showList);
  $("win-list").addEventListener("click", showList);
  $("win-next").addEventListener("click", () => {
    if (!P) return;
    if (P.opt.rand){ start({rand: P.n}); return; }
    const next = PICS.find(p => !save.solved[p.id] && p.rows.length >= P.n) || PICS.find(p => !save.solved[p.id]);
    if (next) start({pic: next}); else start({rand: P.n});
  });

  document.addEventListener("keydown", e => {
    if (!P || P.won || $("play").hidden || !(e.target instanceof Element) || e.target.closest("input")) return;
    const k = e.key, cur = P.cur;
    const mv = {ArrowUp:[-1, 0], ArrowDown:[1, 0], ArrowLeft:[0, -1], ArrowRight:[0, 1]}[k];
    if (mv){
      e.preventDefault(); kbd = true;
      const r = Math.max(0, Math.min(P.n - 1, cur.r + mv[0])), c = Math.max(0, Math.min(P.n - 1, cur.c + mv[1]));
      if (P.drag) extend(r, c); else { P.cur = {r, c}; render(); }
      return;
    }
    if ((k === " " || k === "Enter" || k.toLowerCase() === "x") && !e.repeat && !e.target.closest("button")){
      e.preventDefault(); kbd = true;
      begin(cur.r, cur.c, k.toLowerCase() === "x" ? EMPTY : FILL);
    }
    if (k.toLowerCase() === "z" && (e.ctrlKey || e.metaKey)){ e.preventDefault(); undo(); }
  });
  document.addEventListener("keyup", e => {
    if (P && P.drag && (e.key === " " || e.key === "Enter" || e.key.toLowerCase() === "x")) finish();
  });

  if ("ResizeObserver" in window) new ResizeObserver(layout).observe($("board-wrap"));
  showList();

  // testler için: çözücü ve durum
  window.__resim = {PICS, cluesOf, solveLine, solveGrid, picSolution, randomPuzzle, state: () => P, start, begin, extend, finish, hint, undo, checkWin};
})();
