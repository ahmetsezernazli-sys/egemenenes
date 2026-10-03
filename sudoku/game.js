(() => {
  "use strict";
  const $ = id => document.getElementById(id);

  const LEVELS = [
    {id:"kolay", nm:"Kolay", clues:42, note:"yeni başlayan"},
    {id:"orta",  nm:"Orta",  clues:34, note:"biraz düşündürür"},
    {id:"zor",   nm:"Zor",   clues:29, note:"sabır ister"},
    {id:"usta",  nm:"Usta",  clues:25, note:"en az ipucu"}
  ];
  const SAVE_KEY = "sudoku";
  let save = {best: {}};
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
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + .01); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(a.destination); o.start(t); o.stop(t + dur + .05);
  }
  const sPut = () => tone(620, 760, "sine", .08, .12);
  const sBad = () => tone(260, 150, "square", .22, .1);
  const sNote = () => tone(420, 440, "sine", .05, .07);
  const sDone9 = () => [660, 880].forEach((f, k) => tone(f, f, "triangle", .14, .12, k * .08));
  const sWin = () => [523, 659, 784, 1047, 1319].forEach((f, k) => tone(f, f, "triangle", .22, .15, k * .1));
  function renderSound(){
    $("ic-on").hidden = !soundOn; $("ic-off").hidden = soundOn;
    $("sound").setAttribute("aria-label", soundOn ? "Sesi kapat" : "Sesi aç");
    $("sound").setAttribute("aria-pressed", String(soundOn));
  }
  $("sound").addEventListener("click", () => { soundOn = !soundOn; renderSound(); });
  renderSound();

  /* ---------- çözücü ve üretici ---------- */
  const ROW = i => (i / 9) | 0, COL = i => i % 9, BOX = i => ((i / 27) | 0) * 3 + ((i % 9) / 3 | 0);
  const PEERS = Array.from({length: 81}, (_, i) =>
    Array.from({length: 81}, (_, j) => j).filter(j => j !== i && (ROW(j) === ROW(i) || COL(j) === COL(i) || BOX(j) === BOX(i))));

  function okAt(b, i, v){ return !PEERS[i].some(j => b[j] === v); }
  const shuffle = a => { for (let i = a.length - 1; i > 0; i--){ const j = Math.random() * (i + 1) | 0; [a[i], a[j]] = [a[j], a[i]]; } return a; };

  function solve(b, want, rnd){                 // çözüm sayısını en fazla `want` olacak şekilde sayar
    const i = b.indexOf(0);
    if (i < 0) return 1;
    let n = 0;
    const vals = rnd ? shuffle([1,2,3,4,5,6,7,8,9]) : [1,2,3,4,5,6,7,8,9];
    for (const v of vals){
      if (!okAt(b, i, v)) continue;
      b[i] = v;
      n += solve(b, want - n, rnd);
      b[i] = 0;
      if (n >= want) break;
    }
    return n;
  }
  function solved(b){                           // tek çözümü döndürür (varsa)
    const c = b.slice();
    const rec = () => {
      const i = c.indexOf(0);
      if (i < 0) return true;
      for (let v = 1; v <= 9; v++){
        if (!okAt(c, i, v)) continue;
        c[i] = v;
        if (rec()) return true;
        c[i] = 0;
      }
      return false;
    };
    return rec() ? c : null;
  }
  function fullBoard(){
    const b = new Array(81).fill(0);
    const rec = () => {
      const i = b.indexOf(0);
      if (i < 0) return true;
      for (const v of shuffle([1,2,3,4,5,6,7,8,9])){
        if (!okAt(b, i, v)) continue;
        b[i] = v;
        if (rec()) return true;
        b[i] = 0;
      }
      return false;
    };
    rec();
    return b;
  }
  function makePuzzle(clues){
    const full = fullBoard();
    const puz = full.slice();
    let left = 81;
    for (const i of shuffle([...Array(81).keys()])){
      if (left <= clues) break;
      const keep = puz[i];
      puz[i] = 0;
      const t = puz.slice();
      if (solve(t, 2, false) !== 1){ puz[i] = keep; }   // tek çözüm bozulduysa geri koy
      else left--;
    }
    return {puzzle: puz, solution: full, clues: left};
  }

  /* ---------- durum ---------- */
  let G = null, tick = 0;
  const fmt = s => `${(s / 60) | 0}:${String(s % 60).padStart(2, "0")}`;

  function newGame(levelIdx){
    const lv = LEVELS[levelIdx];
    const {puzzle, solution} = makePuzzle(lv.clues);
    G = {lv, levelIdx, puzzle, solution, val: puzzle.slice(),
      notes: Array.from({length: 81}, () => new Set()),
      sel: puzzle.findIndex(v => v === 0), noting: false, errs: 0, hints: 0, time: 0, undo: [], over: false};
    ["menu", "win"].forEach(id => $(id).hidden = true);
    buildBoard();
    render();
    hud();
  }

  /* ---------- tahta ---------- */
  const boardEl = $("board");
  let cells = [];
  function buildBoard(){
    boardEl.innerHTML = "";
    cells = [];
    for (let i = 0; i < 81; i++){
      const b = document.createElement("button");
      b.type = "button";
      b.className = "sq" + (G.puzzle[i] ? " given" : "") + (COL(i) % 3 === 2 && COL(i) !== 8 ? " b-r" : "") + (ROW(i) % 3 === 2 && ROW(i) !== 8 ? " b-b" : "");
      b.setAttribute("role", "gridcell");
      b.addEventListener("click", () => { audio(); G.sel = i; render(); });
      boardEl.appendChild(b);
      cells.push(b);
    }
  }
  function render(){
    const sel = G.sel, sv = sel >= 0 ? G.val[sel] : 0;
    for (let i = 0; i < 81; i++){
      const el = cells[i], v = G.val[i];
      el.classList.toggle("sel", i === sel);
      el.classList.toggle("peer", sel >= 0 && i !== sel && PEERS[sel].includes(i));
      el.classList.toggle("same", sv > 0 && v === sv && i !== sel);
      const wrong = v > 0 && !G.puzzle[i] && v !== G.solution[i];
      el.classList.toggle("bad", wrong);
      el.setAttribute("aria-label", `${ROW(i) + 1}. satır ${COL(i) + 1}. sütun: ${v || "boş"}`);
      if (v){ el.textContent = v; }
      else if (G.notes[i].size){
        el.innerHTML = '<span class="notes">' + [1,2,3,4,5,6,7,8,9].map(n => `<i>${G.notes[i].has(n) ? n : ""}</i>`).join("") + "</span>";
      } else el.textContent = "";
    }
    // tuş takımı: tamamlanan rakamlar sönük
    [...$("pad").children].forEach((k, n) => {
      const used = G.val.filter(v => v === n + 1).length;
      k.classList.toggle("full", used >= 9 && !G.noting);
      k.classList.toggle("noting", G.noting);
      k.querySelector("small").textContent = 9 - used > 0 ? 9 - used : "";
    });
    $("undo").disabled = !G.undo.length;
    $("hint").disabled = G.over;
  }
  function hud(){
    $("lv").textContent = G.lv.nm;
    $("time").textContent = fmt(G.time | 0);
    $("errs").textContent = G.errs;
    const b = save.best[G.lv.id];
    $("best").textContent = b ? fmt(b) : "—";
  }

  /* ---------- hamleler ---------- */
  function put(n){
    if (!G || G.over) return;
    const i = G.sel;
    if (i < 0 || G.puzzle[i]) return;
    audio();
    if (G.noting){
      if (G.val[i]) return;
      G.undo.push({i, val: G.val[i], notes: new Set(G.notes[i])});
      G.notes[i].has(n) ? G.notes[i].delete(n) : G.notes[i].add(n);
      sNote(); render();
      return;
    }
    G.undo.push({i, val: G.val[i], notes: new Set(G.notes[i])});
    G.val[i] = G.val[i] === n ? 0 : n;
    G.notes[i].clear();
    if (G.val[i]){
      if (G.val[i] === G.solution[i]){
        sPut();
        // aynı rakamla ilgili notları temizle
        for (const j of PEERS[i]) G.notes[j].delete(n);
        if (G.val.filter(v => v === n).length === 9) sDone9();
      } else { G.errs++; sBad(); flash(i); }
    }
    render(); hud();
    check();
  }
  function flash(i){
    cells[i].classList.remove("flash"); void cells[i].offsetWidth; cells[i].classList.add("flash");
  }
  function erase(){
    if (!G || G.over) return;
    const i = G.sel;
    if (i < 0 || G.puzzle[i]) return;
    G.undo.push({i, val: G.val[i], notes: new Set(G.notes[i])});
    G.val[i] = 0; G.notes[i].clear();
    render(); hud();
  }
  function undo(){
    if (!G || !G.undo.length) return;
    const u = G.undo.pop();
    G.val[u.i] = u.val; G.notes[u.i] = new Set(u.notes); G.sel = u.i;
    render(); hud();
  }
  function hint(){
    if (!G || G.over) return;
    const empty = [...Array(81).keys()].filter(i => !G.val[i]);
    if (!empty.length) return;
    const i = empty.includes(G.sel) ? G.sel : empty[Math.random() * empty.length | 0];
    G.undo.push({i, val: G.val[i], notes: new Set(G.notes[i])});
    G.val[i] = G.solution[i]; G.notes[i].clear(); G.hints++; G.sel = i;
    for (const j of PEERS[i]) G.notes[j].delete(G.val[i]);
    cells[i].classList.remove("done"); void cells[i].offsetWidth; cells[i].classList.add("done");
    sPut(); render(); hud(); check();
  }
  function check(){
    if (G.val.some((v, i) => v !== G.solution[i])) return;
    G.over = true;
    sWin();
    const t = G.time | 0, id = G.lv.id;
    const prev = save.best[id];
    const rec = G.hints === 0 && G.errs === 0 && (!prev || t < prev);
    if (rec){ save.best[id] = t; store(); }
    $("win-title").textContent = rec ? "Yeni rekor!" : "Bulmaca bitti!";
    $("win-time").textContent = fmt(t);
    $("win-errs").textContent = G.errs;
    $("win-note").textContent = G.hints
      ? `${G.hints} ipucu kullandın — rekor için ipucusuz ve hatasız bitirmelisin.`
      : G.errs ? "Hatasız bitirince rekora yazılır." : prev && !rec ? `Rekorun: ${fmt(prev)}` : "İpucusuz ve hatasız!";
    hud();
    setTimeout(() => { $("win").hidden = false; $("again").focus(); }, 700);
  }

  /* ---------- tuş takımı ---------- */
  const pad = $("pad");
  for (let n = 1; n <= 9; n++){
    const b = document.createElement("button");
    b.type = "button"; b.className = "key";
    b.innerHTML = `${n}<small></small>`;
    b.setAttribute("aria-label", `${n} yaz`);
    b.addEventListener("click", () => put(n));
    pad.appendChild(b);
  }
  $("note").addEventListener("click", () => {
    G.noting = !G.noting;
    $("note").setAttribute("aria-pressed", String(G.noting));
    sNote(); render();
  });
  $("erase").addEventListener("click", erase);
  $("undo").addEventListener("click", undo);
  $("hint").addEventListener("click", hint);
  document.addEventListener("keydown", e => {
    if (!G || e.target.closest("input")) return;
    const k = e.key;
    if (k >= "1" && k <= "9"){ put(+k); e.preventDefault(); return; }
    if (k === "Backspace" || k === "Delete" || k === "0"){ erase(); e.preventDefault(); return; }
    if (k === "n" || k === "N"){ $("note").click(); return; }
    if (k === "h" || k === "H"){ hint(); return; }
    if (k === "z" && (e.ctrlKey || e.metaKey)){ undo(); e.preventDefault(); return; }
    const d = {ArrowLeft: -1, ArrowRight: 1, ArrowUp: -9, ArrowDown: 9}[k];
    if (d !== undefined){
      e.preventDefault();
      let i = G.sel < 0 ? 0 : G.sel + d;
      if (d === -1 && COL(G.sel) === 0) i = G.sel + 8;
      if (d === 1 && COL(G.sel) === 8) i = G.sel - 8;
      G.sel = (i + 81) % 81;
      render();
    }
  });

  /* ---------- menü ---------- */
  function buildMenu(){
    const box = $("levels"); box.innerHTML = "";
    LEVELS.forEach((lv, i) => {
      const b = document.createElement("button");
      b.type = "button";
      const best = save.best[lv.id];
      b.innerHTML = `<b>${lv.nm}</b><small>${lv.clues} ipucu · ${best ? "rekor " + fmt(best) : lv.note}</small>`;
      b.addEventListener("click", () => {
        audio();
        $("menu-note").textContent = "Bulmaca hazırlanıyor…";
        setTimeout(() => newGame(i), 30);
      });
      box.appendChild(b);
    });
    $("menu-note").textContent = "Her bulmaca yeniden üretilir, aynısı iki kez çıkmaz.";
  }
  $("open-menu").addEventListener("click", () => { buildMenu(); $("win").hidden = true; $("menu").hidden = false; });
  $("win-menu").addEventListener("click", () => { buildMenu(); $("win").hidden = true; $("menu").hidden = false; });
  $("again").addEventListener("click", () => { $("win").hidden = true; newGame(G.levelIdx); });

  /* ---------- saat ---------- */
  setInterval(() => {
    if (!G || G.over || document.hidden || !$("menu").hidden) return;
    G.time++; hud();
  }, 1000);

  buildMenu();
})();
