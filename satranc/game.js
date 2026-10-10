(() => {
  "use strict";
  const $ = id => document.getElementById(id);

  /* =====================================================================
     Satranç motoru
     Kare: 0 = a8 … 7 = h8, 56 = a1 … 63 = h1. Taşlar: büyük harf beyaz,
     küçük harf siyah (P N B R Q K), boş kare null.
     ===================================================================== */
  const START = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";
  const isW = p => p < "a";                    // büyük harf = beyaz
  const colorOf = p => p === null ? null : (isW(p) ? "w" : "b");
  const lower = p => p.toLowerCase();
  const sqName = s => "abcdefgh"[s & 7] + (8 - (s >> 3));
  const sqOf = n => (8 - +n[1]) * 8 + "abcdefgh".indexOf(n[0]);

  // ön hesaplanmış atlayış ve ışın listeleri
  const KN = [[-2,-1],[-2,1],[-1,-2],[-1,2],[1,-2],[1,2],[2,-1],[2,1]];
  const KG = [[-1,-1],[-1,0],[-1,1],[0,-1],[0,1],[1,-1],[1,0],[1,1]];
  const DIAG = [[-1,-1],[-1,1],[1,-1],[1,1]], ORTH = [[-1,0],[1,0],[0,-1],[0,1]];
  const jumps = deltas => Array.from({length: 64}, (_, s) => {
    const r = s >> 3, f = s & 7, out = [];
    for (const [dr, df] of deltas){ const rr = r + dr, ff = f + df; if (rr >= 0 && rr < 8 && ff >= 0 && ff < 8) out.push(rr * 8 + ff); }
    return out;
  });
  const KNIGHT = jumps(KN), KING = jumps(KG);
  const rays = dirs => Array.from({length: 64}, (_, s) => dirs.map(([dr, df]) => {
    const out = []; let r = (s >> 3) + dr, f = (s & 7) + df;
    while (r >= 0 && r < 8 && f >= 0 && f < 8){ out.push(r * 8 + f); r += dr; f += df; }
    return out;
  }));
  const DRAYS = rays(DIAG), ORAYS = rays(ORTH);

  function parseFEN(fen){
    const [pos, turn, cas, ep, half, full] = fen.split(/\s+/);
    const b = []; for (const ch of pos){ if (ch === "/") continue; if (/\d/.test(ch)) for (let i = 0; i < +ch; i++) b.push(null); else b.push(ch); }
    return {b, turn, castle: {K: cas.includes("K"), Q: cas.includes("Q"), k: cas.includes("k"), q: cas.includes("q")},
      ep: ep === "-" ? -1 : sqOf(ep), half: +(half || 0), full: +(full || 1)};
  }
  function posKey(st){
    let s = "";
    for (let i = 0; i < 64; i++) s += st.b[i] || ".";
    const c = st.castle;
    return s + st.turn + (c.K ? "K" : "") + (c.Q ? "Q" : "") + (c.k ? "k" : "") + (c.q ? "q" : "") + st.ep;
  }

  // sq karesi "by" rengi tarafından tehdit ediliyor mu?
  function attacked(b, sq, by){
    const r = sq >> 3, f = sq & 7;
    if (by === "w"){
      if (r < 7){ if (f > 0 && b[sq + 7] === "P") return true; if (f < 7 && b[sq + 9] === "P") return true; }
    } else {
      if (r > 0){ if (f > 0 && b[sq - 9] === "p") return true; if (f < 7 && b[sq - 7] === "p") return true; }
    }
    const N = by === "w" ? "N" : "n", K = by === "w" ? "K" : "k";
    for (const t of KNIGHT[sq]) if (b[t] === N) return true;
    for (const t of KING[sq]) if (b[t] === K) return true;
    const B = by === "w" ? "B" : "b", R = by === "w" ? "R" : "r", Q = by === "w" ? "Q" : "q";
    for (const ray of DRAYS[sq]) for (const t of ray){ const p = b[t]; if (p){ if (p === B || p === Q) return true; break; } }
    for (const ray of ORAYS[sq]) for (const t of ray){ const p = b[t]; if (p){ if (p === R || p === Q) return true; break; } }
    return false;
  }
  const kingSq = (b, c) => b.indexOf(c === "w" ? "K" : "k");
  const inCheck = (st, c) => attacked(st.b, kingSq(st.b, c), c === "w" ? "b" : "w");

  function pseudo(st, capsOnly){
    const b = st.b, me = st.turn, them = me === "w" ? "b" : "w", out = [];
    const add = (from, to, extra) => out.push(Object.assign({from, to, piece: b[from], cap: b[to]}, extra));
    for (let s = 0; s < 64; s++){
      const p = b[s]; if (!p || colorOf(p) !== me) continue;
      const t = lower(p);
      if (t === "p"){
        const dir = me === "w" ? -8 : 8, startR = me === "w" ? 6 : 1, lastR = me === "w" ? 0 : 7, r = s >> 3, f = s & 7;
        const one = s + dir;
        const promos = to => (me === "w" ? ["Q", "R", "B", "N"] : ["q", "r", "b", "n"]).forEach(pr => add(s, to, {promo: pr}));
        if (!capsOnly && b[one] === null){
          if ((one >> 3) === lastR) promos(one); else add(s, one, {});
          if (r === startR && b[one + dir] === null) add(s, one + dir, {double: true});
        }
        for (const df of [-1, 1]){
          if (f + df < 0 || f + df > 7) continue;
          const to = one + df;
          if (b[to] && colorOf(b[to]) === them){ if ((to >> 3) === lastR) promos(to); else add(s, to, {}); }
          else if (to === st.ep) add(s, to, {ep: true, cap: me === "w" ? "p" : "P"});
        }
        continue;
      }
      if (t === "n" || t === "k"){
        for (const to of (t === "n" ? KNIGHT : KING)[s]){
          const q = b[to];
          if (q === null){ if (!capsOnly) add(s, to, {}); }
          else if (colorOf(q) === them) add(s, to, {});
        }
        if (t === "k" && !capsOnly){
          const c = st.castle, e = me === "w" ? 60 : 4;
          if (s === e && !attacked(b, e, them)){
            const R = me === "w" ? "R" : "r";
            if ((me === "w" ? c.K : c.k) && b[e + 1] === null && b[e + 2] === null && b[e + 3] === R && !attacked(b, e + 1, them) && !attacked(b, e + 2, them)) add(s, e + 2, {castle: "K"});
            if ((me === "w" ? c.Q : c.q) && b[e - 1] === null && b[e - 2] === null && b[e - 3] === null && b[e - 4] === R && !attacked(b, e - 1, them) && !attacked(b, e - 2, them)) add(s, e - 2, {castle: "Q"});
          }
        }
        continue;
      }
      const rs = t === "b" ? DRAYS[s] : t === "r" ? ORAYS[s] : DRAYS[s].concat(ORAYS[s]);
      for (const ray of rs) for (const to of ray){
        const q = b[to];
        if (q === null){ if (!capsOnly) add(s, to, {}); continue; }
        if (colorOf(q) === them) add(s, to, {});
        break;
      }
    }
    return out;
  }

  // hamleyi uygular, yeni durum döndürür (eski durum değişmez)
  function apply(st, m){
    const b = st.b.slice(), me = st.turn;
    b[m.to] = m.promo || m.piece; b[m.from] = null;
    if (m.ep) b[m.to + (me === "w" ? 8 : -8)] = null;
    if (m.castle){
      const e = m.from;
      if (m.castle === "K"){ b[e + 1] = b[e + 3]; b[e + 3] = null; } else { b[e - 1] = b[e - 4]; b[e - 4] = null; }
    }
    const c = Object.assign({}, st.castle);
    if (m.piece === "K"){ c.K = c.Q = false; } else if (m.piece === "k"){ c.k = c.q = false; }
    for (const s of [m.from, m.to]){ if (s === 63) c.K = false; if (s === 56) c.Q = false; if (s === 7) c.k = false; if (s === 0) c.q = false; }
    return {b, turn: me === "w" ? "b" : "w", castle: c, ep: m.double ? (m.from + m.to) / 2 : -1,
      half: (lower(m.piece) === "p" || m.cap) ? 0 : st.half + 1, full: st.full + (me === "b" ? 1 : 0)};
  }
  const legal = st => pseudo(st).filter(m => !inCheck(apply(st, m), st.turn));

  function perft(st, d){
    if (d === 0) return 1;
    const ms = legal(st);
    if (d === 1) return ms.length;
    let n = 0; for (const m of ms) n += perft(apply(st, m), d - 1);
    return n;
  }

  /* ---------- değerlendirme ---------- */
  const VAL = {p: 100, n: 320, b: 330, r: 500, q: 900, k: 0};
  const PST = {
    p:[0,0,0,0,0,0,0,0,50,50,50,50,50,50,50,50,10,10,20,30,30,20,10,10,5,5,10,25,25,10,5,5,0,0,0,20,20,0,0,0,5,-5,-10,0,0,-10,-5,5,5,10,10,-20,-20,10,10,5,0,0,0,0,0,0,0,0],
    n:[-50,-40,-30,-30,-30,-30,-40,-50,-40,-20,0,0,0,0,-20,-40,-30,0,10,15,15,10,0,-30,-30,5,15,20,20,15,5,-30,-30,0,15,20,20,15,0,-30,-30,5,10,15,15,10,5,-30,-40,-20,0,5,5,0,-20,-40,-50,-40,-30,-30,-30,-30,-40,-50],
    b:[-20,-10,-10,-10,-10,-10,-10,-20,-10,0,0,0,0,0,0,-10,-10,0,5,10,10,5,0,-10,-10,5,5,10,10,5,5,-10,-10,0,10,10,10,10,0,-10,-10,10,10,10,10,10,10,-10,-10,5,0,0,0,0,5,-10,-20,-10,-10,-10,-10,-10,-10,-20],
    r:[0,0,0,0,0,0,0,0,5,10,10,10,10,10,10,5,-5,0,0,0,0,0,0,-5,-5,0,0,0,0,0,0,-5,-5,0,0,0,0,0,0,-5,-5,0,0,0,0,0,0,-5,-5,0,0,0,0,0,0,-5,0,0,0,5,5,0,0,0],
    q:[-20,-10,-10,-5,-5,-10,-10,-20,-10,0,0,0,0,0,0,-10,-10,0,5,5,5,5,0,-10,-5,0,5,5,5,5,0,-5,0,0,5,5,5,5,0,-5,-10,5,5,5,5,5,0,-10,-10,0,5,0,0,0,0,-10,-20,-10,-10,-5,-5,-10,-10,-20],
    k:[-30,-40,-40,-50,-50,-40,-40,-30,-30,-40,-40,-50,-50,-40,-40,-30,-30,-40,-40,-50,-50,-40,-40,-30,-30,-40,-40,-50,-50,-40,-40,-30,-20,-30,-30,-40,-40,-30,-30,-20,-10,-20,-20,-20,-20,-20,-20,-10,20,20,0,0,0,0,20,20,20,30,10,0,0,10,30,20],
    ke:[-50,-40,-30,-20,-20,-30,-40,-50,-30,-20,-10,0,0,-10,-20,-30,-30,-10,20,30,30,20,-10,-30,-30,-10,30,40,40,30,-10,-30,-30,-10,30,40,40,30,-10,-30,-30,-10,20,30,30,20,-10,-30,-30,-30,0,0,0,0,-30,-30,-50,-30,-30,-30,-30,-30,-30,-50]
  };
  function evaluate(st){
    const b = st.b; let score = 0, heavy = 0;
    for (let s = 0; s < 64; s++){ const p = b[s]; if (p){ const t = lower(p); if (t !== "p" && t !== "k") heavy += VAL[t]; } }
    const endgame = heavy <= 1400;
    for (let s = 0; s < 64; s++){
      const p = b[s]; if (!p) continue;
      const t = lower(p), w = isW(p), idx = w ? s : (7 - (s >> 3)) * 8 + (s & 7);
      const v = VAL[t] + (t === "k" ? (endgame ? PST.ke : PST.k)[idx] : PST[t][idx]);
      score += w ? v : -v;
    }
    return st.turn === "w" ? score : -score;
  }

  /* ---------- arama ---------- */
  const MATE = 100000;
  let nodes = 0, deadline = Infinity, aborted = false;
  const order = ms => ms.sort((a, c) => ((c.cap ? VAL[lower(c.cap)] * 10 - VAL[lower(c.piece)] : 0) + (c.promo ? 800 : 0)) - ((a.cap ? VAL[lower(a.cap)] * 10 - VAL[lower(a.piece)] : 0) + (a.promo ? 800 : 0)));
  function quiesce(st, alpha, beta, qd){
    if ((++nodes & 1023) === 0 && performance.now() > deadline) aborted = true;
    const stand = evaluate(st);
    if (stand >= beta) return beta;
    if (stand > alpha) alpha = stand;
    if (qd > 6) return alpha;
    for (const m of order(pseudo(st, true))){
      const nx = apply(st, m);
      if (inCheck(nx, st.turn)) continue;
      const sc = -quiesce(nx, -beta, -alpha, qd + 1);
      if (aborted) return alpha;
      if (sc >= beta) return beta;
      if (sc > alpha) alpha = sc;
    }
    return alpha;
  }
  function negamax(st, depth, alpha, beta, ply, useQ){
    if ((++nodes & 1023) === 0 && performance.now() > deadline) aborted = true;
    if (aborted) return 0;
    if (st.half >= 100) return 0;
    const ms = legal(st);
    if (!ms.length) return inCheck(st, st.turn) ? -MATE + ply : 0;
    if (depth <= 0) return useQ ? quiesce(st, alpha, beta, 0) : evaluate(st);
    for (const m of order(ms)){
      const sc = -negamax(apply(st, m), depth - 1, -beta, -alpha, ply + 1, useQ);
      if (aborted) return 0;
      if (sc >= beta) return beta;
      if (sc > alpha) alpha = sc;
    }
    return alpha;
  }
  // seviye: 0 Kolay, 1 Normal, 2 Zor, 3 ipucu (Zor gibi ama gürültüsüz)
  function bestMove(st, level){
    const ms = order(legal(st));
    if (!ms.length) return null;
    const cfg = [{d: 1, q: false, noise: 140, ms: 400}, {d: 2, q: true, noise: 25, ms: 800}, {d: 5, q: true, noise: 0, ms: 1400}, {d: 4, q: true, noise: 0, ms: 900}][level];
    nodes = 0; aborted = false; deadline = performance.now() + cfg.ms;
    let best = ms[0], scores = null;
    for (let d = 1; d <= cfg.d; d++){
      const sc = [];
      let alpha = -Infinity;
      for (const m of ms){
        // rastgelelik eklenen seviyelerde her hamlenin gerçek puanı gerekir (tam pencere)
        const v = -negamax(apply(st, m), d - 1, -Infinity, cfg.noise ? Infinity : -alpha, 1, cfg.q);
        if (aborted) break;
        sc.push({m, v});
        if (v > alpha) alpha = v;
      }
      if (aborted && d > 1) break;
      scores = sc;
      // bir sonraki derinlikte en iyi hamleyi öne al
      sc.sort((a, c) => c.v - a.v);
      ms.sort((a, c) => (sc.findIndex(x => x.m === a) - sc.findIndex(x => x.m === c)));
      if (sc.length && sc[0].v > MATE - 100) break;    // mat bulundu
    }
    if (!scores || !scores.length) return best;
    const noisy = scores.map(x => ({m: x.m, v: x.v + (cfg.noise ? (Math.random() * 2 - 1) * cfg.noise : 0)}));
    noisy.sort((a, c) => c.v - a.v);
    return noisy[0].m;
  }

  /* =====================================================================
     Oyun ve arayüz
     ===================================================================== */
  const GLYPH = {k:"♚", q:"♛", r:"♜", b:"♝", n:"♞", p:"♟"};
  const TXT = "︎";                        // emoji değil, yazı biçimi
  const NAME = {k:"şah", q:"vezir", r:"kale", b:"fil", n:"at", p:"piyon"};
  const SAVE_KEY = "satranc";
  let save = {wins: [0, 0, 0], games: [0, 0, 0]};
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
  const sMove = () => tone(220, 160, "triangle", .07, .2);
  const sCap = () => { tone(300, 120, "square", .09, .08); tone(180, 90, "triangle", .12, .18, .02); };
  const sCheck = () => [880, 660].forEach((f, k) => tone(f, f, "sine", .14, .12, k * .1));
  const sEnd = win => (win ? [523, 659, 784, 1047] : [392, 349, 330, 262]).forEach((f, k) => tone(f, f, "triangle", .25, .13, k * .12));
  function renderSound(){
    $("ic-on").hidden = !soundOn; $("ic-off").hidden = soundOn;
    $("sound").setAttribute("aria-label", soundOn ? "Sesi kapat" : "Sesi aç");
    $("sound").setAttribute("aria-pressed", String(soundOn));
  }
  $("sound").addEventListener("click", () => { soundOn = !soundOn; renderSound(); });
  renderSound();

  /* ---------- durum ---------- */
  let G = null;
  function newGame(cfg){
    let me = cfg.color === "r" ? (Math.random() < .5 ? "w" : "b") : cfg.color;
    const st = parseFEN(START);
    G = {cfg, me, st, hist: [], reps: {[posKey(st)]: 1}, sel: -1, targets: [], last: null, hint: null, flip: cfg.mode === "cpu" && me === "b",
      over: false, thinking: false, caps: {w: [], b: []}};
    ["setup", "end", "promo"].forEach(id => $(id).hidden = true);
    if (cfg.mode === "cpu"){ save.games[cfg.level]++; store(); }
    build(); render();
    maybeCpu();
  }
  const cpuTurn = () => G && G.cfg.mode === "cpu" && G.st.turn !== G.me;
  const turnName = c => c === "w" ? "Beyaz" : "Siyah";
  function whoName(c){
    if (G.cfg.mode !== "cpu") return turnName(c);
    return c === G.me ? `Sen (${turnName(c).toLocaleLowerCase("tr")})` : `🤖 Bilgisayar · ${["Kolay", "Normal", "Zor"][G.cfg.level]}`;
  }

  function doMove(m){
    const st = G.st;
    G.hist.push({st, last: G.last, caps: {w: G.caps.w.slice(), b: G.caps.b.slice()}, reps: Object.assign({}, G.reps)});
    if (m.cap) G.caps[st.turn].push(m.cap);
    G.st = apply(st, m);
    const k = posKey(G.st); G.reps[k] = (G.reps[k] || 0) + 1;
    G.last = m; G.sel = -1; G.targets = []; G.hint = null;
    const chk = inCheck(G.st, G.st.turn);
    if (chk) sCheck(); else if (m.cap) sCap(); else sMove();
    render(true);
    if (checkEnd()) return;
    maybeCpu();
  }

  function insufficient(b){
    const ps = b.filter(Boolean).map(lower).filter(t => t !== "k");
    if (!ps.length) return true;
    if (ps.length === 1 && (ps[0] === "n" || ps[0] === "b")) return true;
    return false;
  }
  function checkEnd(){
    const st = G.st, ms = legal(st);
    let title = null, note = "", icon = "🤝", win = null;
    if (!ms.length){
      if (inCheck(st, st.turn)){ win = st.turn === "w" ? "b" : "w"; title = "Şah mat!"; icon = "🏆"; }
      else { title = "Pat! Berabere."; note = "Hamle sırası gelen oyuncunun hiç yasal hamlesi yok ama şah tehdit altında değil."; }
    } else if (st.half >= 100){ title = "Berabere"; note = "50 hamle boyunca taş alınmadı ve piyon oynanmadı."; }
    else if (G.reps[posKey(st)] >= 3){ title = "Berabere"; note = "Aynı pozisyon üç kez tekrarlandı."; }
    else if (insufficient(st.b)){ title = "Berabere"; note = "Mat edecek kadar taş kalmadı."; }
    if (!title) return false;
    G.over = true;
    if (win){
      if (G.cfg.mode === "cpu"){
        const youWon = win === G.me;
        note = youWon ? `Bilgisayarı (${["Kolay", "Normal", "Zor"][G.cfg.level]}) yendin!` : "Bilgisayar kazandı. Bir daha dene!";
        icon = youWon ? "🏆" : "🤖";
        if (youWon){ save.wins[G.cfg.level]++; store(); }
        sEnd(youWon);
      } else { note = `${turnName(win)} kazandı!`; sEnd(true); }
    } else sEnd(false);
    $("end-title").textContent = title; $("end-note").textContent = note; $("end-icon").textContent = icon;
    setStatus(title, false);
    setTimeout(() => { $("end").hidden = false; $("again").focus(); }, 700);
    render();
    return true;
  }

  function maybeCpu(){
    if (!cpuTurn() || G.over) return;
    G.thinking = true; setStatus("Bilgisayar düşünüyor", false, true); render();
    // arayüz önce çizilsin diye kısa bir bekleme
    setTimeout(() => {
      if (!G || G.over || !cpuTurn()) return;
      const t0 = performance.now(), m = bestMove(G.st, G.cfg.level);
      const wait = Math.max(0, 450 - (performance.now() - t0));
      setTimeout(() => { if (!G || G.over) return; G.thinking = false; if (m) doMove(m); }, wait);
    }, 60);
  }

  /* ---------- tıklama ---------- */
  function clickSq(s){
    if (!G || G.over || G.thinking || cpuTurn()) return;
    audio();
    const st = G.st, p = st.b[s];
    if (G.sel >= 0){
      const ms = G.targets.filter(m => m.to === s);
      if (ms.length){
        if (ms[0].promo){ askPromo(ms); return; }
        doMove(ms[0]); return;
      }
    }
    if (p && colorOf(p) === st.turn){
      G.sel = s; G.targets = legal(st).filter(m => m.from === s); G.hint = null;
      if (!G.targets.length) setStatus(`Bu ${NAME[lower(p)]} şu an oynayamıyor.`, false);
      render(); return;
    }
    G.sel = -1; G.targets = []; render();
  }
  function askPromo(ms){
    const row = $("promo-row"); row.innerHTML = "";
    const c = G.st.turn;
    for (const t of ["q", "r", "b", "n"]){
      const btn = document.createElement("button");
      btn.type = "button"; btn.className = c; btn.textContent = GLYPH[t] + TXT;
      btn.setAttribute("aria-label", NAME[t]);
      btn.addEventListener("click", () => { $("promo").hidden = true; doMove(ms.find(m => lower(m.promo) === t)); });
      row.appendChild(btn);
    }
    $("promo").hidden = false;
  }

  /* ---------- çizim ---------- */
  let sqEls = [];
  function build(){
    const bd = $("board"); bd.innerHTML = ""; sqEls = [];
    for (let i = 0; i < 64; i++){
      const btn = document.createElement("button");
      btn.type = "button"; btn.className = "sq";
      btn.addEventListener("click", () => clickSq(+btn.dataset.s));
      bd.appendChild(btn); sqEls.push(btn);
    }
  }
  function setStatus(t, alert, think){
    const el = $("status"); el.textContent = t; el.classList.toggle("alert", !!alert); el.classList.toggle("think", !!think);
  }
  function capsHTML(list, other){
    const val = l => l.reduce((a, p) => a + VAL[lower(p)], 0);
    const diff = (val(list) - val(other)) / 100;
    const sorted = list.slice().sort((a, c) => VAL[lower(c)] - VAL[lower(a)]);
    return sorted.map(p => GLYPH[lower(p)] + TXT).join("") + (diff > 0 ? `<b>+${diff}</b>` : "");
  }
  function render(animate){
    if (!G) return;
    const st = G.st, flip = G.flip;
    const chkSq = inCheck(st, st.turn) ? kingSq(st.b, st.turn) : -1;
    for (let i = 0; i < 64; i++){
      const s = flip ? 63 - i : i, el = sqEls[i], r = s >> 3, f = s & 7, p = st.b[s];
      el.dataset.s = s;
      let cls = "sq" + ((r + f) % 2 ? " d" : "");
      if (G.last && (G.last.from === s || G.last.to === s)) cls += " last";
      if (G.sel === s) cls += " sel";
      if (s === chkSq) cls += " check";
      if (G.hint && (G.hint.from === s || G.hint.to === s)) cls += " hint";
      el.className = cls;
      let html = p ? `<span class="pc ${isW(p) ? "w" : "b"}${animate && G.last && G.last.to === s ? " moved" : ""}">${GLYPH[lower(p)]}${TXT}</span>` : "";
      if (G.cfg.showMoves && G.targets.some(m => m.to === s)) html += p || G.targets.some(m => m.to === s && m.ep) ? `<i class="ring"></i>` : `<i class="dot"></i>`;
      const rowIdx = Math.floor(i / 8), colIdx = i % 8;
      if (rowIdx === 7) html += `<span class="cf">${"abcdefgh"[f]}</span>`;
      if (colIdx === 0) html += `<span class="cr">${8 - r}</span>`;
      el.innerHTML = html;
      el.setAttribute("aria-label", `${sqName(s)}${p ? ", " + (isW(p) ? "beyaz " : "siyah ") + NAME[lower(p)] : ""}`);
    }
    const bottom = flip ? "b" : "w", top = flip ? "w" : "b";
    $("who-bottom").textContent = whoName(bottom); $("who-top").textContent = whoName(top);
    $("who-bottom").classList.toggle("turn", !G.over && st.turn === bottom);
    $("who-top").classList.toggle("turn", !G.over && st.turn === top);
    // bir tarafın aldığı taşlar o tarafın satırında gösterilir
    $("caps-bottom").innerHTML = capsHTML(G.caps[bottom], G.caps[top]);
    $("caps-top").innerHTML = capsHTML(G.caps[top], G.caps[bottom]);
    $("undo").disabled = !G.hist.length || G.thinking;
    $("hint").disabled = G.over || G.thinking || cpuTurn();
    if (!G.over && !G.thinking){
      const chk = chkSq >= 0;
      if (G.cfg.mode === "cpu") setStatus(chk ? "Şah! Şahını kurtarmalısın." : G.sel >= 0 ? "Nereye gitsin?" : "Sıra sende.", chk);
      else setStatus(`${turnName(st.turn)} oynar.${chk ? " Şah!" : ""}`, chk);
    }
  }

  /* ---------- düğmeler ---------- */
  $("undo").addEventListener("click", () => {
    if (!G || !G.hist.length || G.thinking) return;
    // bilgisayara karşı: senin son hamlene kadar geri al
    let steps = 1;
    if (G.cfg.mode === "cpu") steps = G.st.turn === G.me ? 2 : 1;
    steps = Math.min(steps, G.hist.length);
    let h;
    for (let i = 0; i < steps; i++) h = G.hist.pop();
    G.st = h.st; G.last = h.last; G.caps = h.caps; G.reps = h.reps;
    G.sel = -1; G.targets = []; G.hint = null; G.over = false;
    $("end").hidden = true;
    render();
    maybeCpu();
  });
  $("hint").addEventListener("click", () => {
    if (!G || G.over || G.thinking || cpuTurn()) return;
    setStatus("Düşünüyorum", false, true);
    setTimeout(() => {
      const m = bestMove(G.st, 3);
      if (!m) return;
      G.hint = m; G.sel = -1; G.targets = [];
      render();
      setStatus(`İpucu: ${NAME[lower(m.piece)]} ${sqName(m.from)} → ${sqName(m.to)}`, false);
    }, 40);
  });
  $("flip").addEventListener("click", () => { if (G){ G.flip = !G.flip; render(); } });

  const form = $("setup-form");
  function syncSetup(){
    const cpu = form.mode.value === "cpu";
    $("cpu-opts").hidden = !cpu;
    const lv = ["Kolay", "Normal", "Zor"];
    const parts = lv.map((n, i) => save.games[i] ? `${n}: ${save.wins[i]}/${save.games[i]}` : null).filter(Boolean);
    $("wins").innerHTML = parts.length ? `<b>Kazandıkların:</b> ${parts.join(" · ")}` : "";
  }
  form.addEventListener("change", syncSetup);
  form.addEventListener("submit", e => {
    e.preventDefault(); audio();
    newGame({mode: form.mode.value, level: +form.level.value, color: form.color.value, showMoves: $("show-moves").checked});
  });
  $("open-setup").addEventListener("click", () => { syncSetup(); $("end").hidden = true; $("setup").hidden = false; });
  $("again").addEventListener("click", () => { audio(); newGame(G.cfg); });
  $("end-board").addEventListener("click", () => { $("end").hidden = true; });
  syncSetup();

  // testler için: motor
  window.__satranc = {parseFEN, legal, apply, perft, inCheck, bestMove, evaluate, posKey, sqName, sqOf, state: () => G, newGame, clickSq, doMove};
})();
