/* Okey — aile oyunu */
(() => {
  "use strict";
  const $ = (id) => document.getElementById(id);
  const SAVE_KEY = "okey";
  const COLOR_NM = ["sarı", "mavi", "siyah", "kırmızı"];

  /* ---------- taşlar ---------- */
  let OK = { c: 0, n: 1 }; // okey taşının değeri
  function makeTiles() {
    const t = []; let id = 0;
    for (let k = 0; k < 2; k++) for (let c = 0; c < 4; c++) for (let n = 1; n <= 13; n++) t.push({ id: id++, c, n, fake: false });
    t.push({ id: id++, c: -1, n: 0, fake: true }, { id: id++, c: -1, n: 0, fake: true });
    return t;
  }
  const isWild = (t) => !t.fake && t.c === OK.c && t.n === OK.n;
  const ev = (t) => (t.fake ? { c: OK.c, n: OK.n } : { c: t.c, n: t.n });

  /* ---------- el çözümleme ----------
     cover(): joker dışındaki taşlardan en çok kaçının seri/per içine girebildiği (w joker serbest kullanılır) */
  const memo = new Map();
  function cover(list, w) {
    if (!list.length) return 0;
    const key = list.join(",") + "|" + w;
    if (memo.has(key)) return memo.get(key);
    const t = list[0], tc = Math.floor(t / 100), tn = t % 100, rest = list.slice(1);
    let best = cover(rest, w); // bu taşı dışarıda bırak
    const without = (idxs) => rest.filter((_, i) => !idxs.includes(i));
    // per: aynı sayı, farklı renkler
    const byColor = {};
    rest.forEach((v, i) => { const c = Math.floor(v / 100), n = v % 100; if (n === tn && c !== tc && byColor[c] === undefined) byColor[c] = i; });
    const others = Object.values(byColor);
    for (let mask = 0; mask < (1 << others.length); mask++) {
      const pick = others.filter((_, k) => mask & (1 << k)), size = 1 + pick.length;
      for (let w2 = 0; w2 <= w && size + w2 <= 4; w2++) {
        if (size + w2 < 3) continue;
        best = Math.max(best, size + cover(without(pick), w - w2));
      }
    }
    // seri: aynı renk ardışık (12-13-1 olur, 13-1-2 olmaz)
    const findIdx = (c, n, used) => rest.findIndex((v, i) => !used.includes(i) && v === c * 100 + n);
    const tryRun = (start, fixedPos) => {
      // fixedPos: t'nin serideki değeri (1 ise 14 olarak da kullanılabilir)
      let used = [], wl = w, real = 1;
      for (let p = start; p <= 14; p++) {
        if (p === fixedPos) { /* t */ }
        else {
          const n = p === 14 ? 1 : p;
          if (p === 14 && fixedPos !== 14 && tn === 1 && false) break;
          const i = p > fixedPos || p < fixedPos ? findIdx(tc, n, used) : -1;
          if (i >= 0 && p > fixedPos) { used = used.concat(i); real++; }
          else if (wl > 0) wl--;
          else break;
        }
        if (p >= fixedPos && p - start + 1 >= 3) best = Math.max(best, real + cover(without(used), wl));
        if (p === 14) break;
      }
    };
    for (let s = Math.max(1, tn - w); s <= tn; s++) tryRun(s, tn);
    if (tn === 1) for (let s = 12; s >= 2; s--) tryRunWrap(s);
    function tryRunWrap(start) {
      // start..13 başka taşlar ya da joker, 14 = bu 1
      let used = [], wl = w, real = 1, ok = true;
      for (let p = start; p <= 13; p++) {
        const i = findIdx(tc, p, used);
        if (i >= 0) { used = used.concat(i); real++; } else if (wl > 0) wl--; else { ok = false; break; }
      }
      if (ok && 14 - start + 1 >= 3) best = Math.max(best, real + cover(without(used), wl));
    }
    memo.set(key, best);
    return best;
  }
  function codes(tiles) { return tiles.filter(t => !isWild(t)).map(t => { const e = ev(t); return e.c * 100 + e.n; }).sort((a, b) => (a % 100) - (b % 100) || a - b); }
  function isPairsWin(tiles) {
    const w = tiles.filter(isWild).length, cnt = {};
    for (const v of codes(tiles)) cnt[v] = (cnt[v] || 0) + 1;
    let singles = 0;
    for (const k in cnt) { if (cnt[k] > 2) return false; if (cnt[k] === 1) singles++; }
    return singles <= w && (w - singles) % 2 === 0;
  }
  function isWin(tiles) {
    if (tiles.length !== 14) return false;
    const w = tiles.filter(isWild).length, c = codes(tiles);
    if (memo.size > 200000) memo.clear();
    return cover(c, w) === c.length || isPairsWin(tiles);
  }
  function evaluate(tiles) {
    const w = tiles.filter(isWild).length, c = codes(tiles);
    if (memo.size > 200000) memo.clear();
    const cov = cover(c, w);
    let partners = 0, pairs = 0;
    const cnt = {};
    for (const v of c) cnt[v] = (cnt[v] || 0) + 1;
    for (const v of c) {
      const vc = Math.floor(v / 100), vn = v % 100;
      if (c.some(o => o !== v && ((o % 100 === vn && Math.floor(o / 100) !== vc) || (Math.floor(o / 100) === vc && Math.abs(o % 100 - vn) <= 2 && o % 100 !== vn)))) partners++;
    }
    for (const k in cnt) if (cnt[k] >= 2) pairs++;
    return cov * 3 + w * 4 + partners * 0.6 + pairs * 0.4;
  }
  // 15 taştan atılacak en iyi taş
  function bestDiscard(tiles15) {
    let best = null;
    for (const t of tiles15) {
      const rest = tiles15.filter(x => x !== t);
      if (isWin(rest)) return { tile: t, win: true, v: 1e9 };
      const v = evaluate(rest) - (isWild(t) ? 50 : 0);
      if (!best || v > best.v) best = { tile: t, win: false, v };
    }
    return best;
  }

  /* ---------- ses ---------- */
  let AC = null;
  function audio() { try { AC = AC || new (window.AudioContext || window.webkitAudioContext)(); if (AC.state === "suspended") AC.resume(); } catch (e) {} }
  function clack() { if (!AC) return; const t = AC.currentTime, o = AC.createOscillator(), g = AC.createGain(); o.type = "square"; o.frequency.setValueAtTime(1400, t); o.frequency.exponentialRampToValueAtTime(500, t + 0.04); g.gain.setValueAtTime(0.06, t); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.06); o.connect(g).connect(AC.destination); o.start(t); o.stop(t + 0.08); }
  function fanfare() { if (!AC) return; [523, 659, 784, 1046].forEach((f, i) => setTimeout(() => { const t = AC.currentTime, o = AC.createOscillator(), g = AC.createGain(); o.type = "triangle"; o.frequency.value = f; g.gain.setValueAtTime(0.07, t); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.25); o.connect(g).connect(AC.destination); o.start(t); o.stop(t + 0.3); }, i * 130)); }

  /* ---------- oyun ---------- */
  const DEF = [{ n: "Enes", cpu: false }, { n: "Baba", cpu: true }, { n: "Anne", cpu: true }, { n: "Egemen", cpu: true }];
  const POS = ["altta (sen)", "sağda", "karşıda", "solda"];
  let CFG = { players: DEF.map(d => Object.assign({}, d)), lvl: 1 };
  try { const s = JSON.parse(localStorage.getItem(SAVE_KEY) || "null"); if (s && s.cfg) CFG = s.cfg; } catch (e) {}
  let WINS = [0, 0, 0, 0];
  const store = () => { try { localStorage.setItem(SAVE_KEY, JSON.stringify({ cfg: CFG })); } catch (e) {} };
  let G = null, dealer = Math.floor(Math.random() * 4), timers = [], viewer = 0;
  const later = (s, fn) => { const id = setTimeout(fn, s * 1000); timers.push(id); };

  function deal() {
    timers.forEach(clearTimeout); timers = []; memo.clear();
    const tiles = makeTiles();
    for (let i = tiles.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [tiles[i], tiles[j]] = [tiles[j], tiles[i]]; }
    // gösterge sahte okey olamaz
    let gi = tiles.findIndex(t => !t.fake);
    const ind = tiles.splice(gi, 1)[0];
    OK = { c: ind.c, n: ind.n % 13 + 1 };
    dealer = (dealer + 1) % 4;
    const hands = [[], [], [], []];
    for (let p = 0; p < 4; p++) for (let k = 0; k < (p === dealer ? 15 : 14); k++) hands[p].push(tiles.pop());
    G = { ind, pile: tiles, hands, disc: [[], [], [], []], turn: dealer, phase: "discard", over: false, racks: hands.map(h => layout(h)), sel: null, newId: null };
    viewer = firstHuman(dealer);
    $("over").hidden = true;
    render();
    startTurn(true);
  }
  const firstHuman = (from) => { for (let k = 0; k < 4; k++) { const p = (from + k) % 4; if (!CFG.players[p].cpu) return p; } return 0; };
  const humans = () => CFG.players.filter(p => !p.cpu).length;
  // ıstaka düzeni: 30 yuva (2 sıra × 15)
  function layout(hand) { const r = new Array(30).fill(null); sortRun(hand).forEach((t, i) => (r[i] = t)); return r; }
  function sortRun(tiles) { return tiles.slice().sort((a, b) => (isWild(a) - isWild(b)) || (ev(a).c - ev(b).c) || (ev(a).n - ev(b).n)); }
  function sortPair(tiles) { return tiles.slice().sort((a, b) => (isWild(a) - isWild(b)) || (ev(a).n - ev(b).n) || (ev(a).c - ev(b).c)); }

  function startTurn(first) {
    if (G.over) return;
    const p = G.turn;
    G.phase = first ? "discard" : "draw";
    G.sel = null;
    renderSeats();
    if (CFG.players[p].cpu) { setStatus(`${CFG.players[p].n} düşünüyor…`); later(0.9 + Math.random() * 0.5, () => aiTurn(p)); render(); return; }
    // başka bir insanın sırası geldiyse ıstakayı gizle
    if (humans() > 1 && viewer !== p) {
      viewer = p; render();
      $("pass-title").textContent = `Sıra ${CFG.players[p].n}'de`; $("pass").hidden = false;
    } else viewer = p;
    setStatus(G.phase === "draw" ? `${CFG.players[p].n}: ortadan ya da soldaki taştan çek.` : `${CFG.players[p].n}: bir taş seç ve at.`);
    render();
  }
  function drawTile(p, fromDiscard) {
    const prev = (p + 3) % 4;
    let t;
    if (fromDiscard) { t = G.disc[prev].pop(); if (!t) return false; }
    else { if (!G.pile.length) { endDraw(); return false; } t = G.pile.pop(); }
    G.hands[p].push(t);
    const r = G.racks[p], i = r.indexOf(null); r[i] = t;
    G.newId = t.id; G.phase = "discard";
    clack();
    return true;
  }
  function discard(p, t) {
    G.hands[p] = G.hands[p].filter(x => x !== t);
    const r = G.racks[p]; r[r.indexOf(t)] = null;
    G.disc[p].push(t); G.sel = null; G.newId = null;
    clack();
    if (isWin(G.hands[p])) { finish(p, t); return; }
    if (!G.pile.length) { endDraw(); return; }
    G.turn = (p + 1) % 4;
    render();
    startTurn(false);
  }
  function aiTurn(p) {
    if (G.over) return;
    const prev = (p + 3) % 4, top = G.disc[prev][G.disc[prev].length - 1], hand = G.hands[p];
    if (G.phase === "draw") {
      let take = false;
      if (top) {
        const withTop = bestDiscard(hand.concat([top]));
        if (withTop.win) take = true;
        else if (CFG.lvl) take = withTop.v > evaluate(hand) + 1.5 || isWild(top);
        else take = Math.random() < 0.25 && withTop.v > evaluate(hand);
      }
      drawTile(p, take);
      setStatus(`${CFG.players[p].n} ${take ? "yandan aldı" : "ortadan çekti"}.`);
      render();
      if (G.over) return;
    }
    later(0.7, () => {
      if (G.over) return;
      let d = bestDiscard(G.hands[p]);
      if (!CFG.lvl && !d.win && Math.random() < 0.35) { const pool = G.hands[p].filter(t => !isWild(t)); d = { tile: pool[Math.floor(Math.random() * pool.length)] }; }
      discard(p, d.tile);
    });
  }
  function endDraw() {
    G.over = true;
    setStatus("Ortada taş kalmadı: el berabere.");
    $("over-icon").textContent = "🤝"; $("over-title").textContent = "El berabere bitti";
    $("over-rack").innerHTML = ""; $("over-text").textContent = "Ortadaki taşlar tükendi.";
    later(0.8, () => { $("over").hidden = false; });
  }
  function finish(p, last) {
    G.over = true; WINS[p]++;
    fanfare();
    const okeyAt = isWild(last), pairs = isPairsWin(G.hands[p]);
    $("over-icon").textContent = "🏆";
    $("over-title").textContent = `${CFG.players[p].n} eli bitirdi!`;
    $("over-rack").innerHTML = sortRun(G.hands[p]).map(tileHTML).join("");
    $("over-text").textContent = (okeyAt ? "Okey atarak bitirdi! " : "") + (pairs ? "Çifte ile bitti! " : "") +
      "Kazanılan eller: " + CFG.players.map((pl, i) => `${pl.n} ${WINS[i]}`).join(" · ");
    render(); setStatus(`${CFG.players[p].n} kazandı!`);
    later(1, () => { $("over").hidden = false; $("over-next").focus(); });
  }

  /* ---------- çizim ---------- */
  function tileHTML(t, extra = "") {
    if (!t) return "";
    const wild = isWild(t);
    if (t.fake) return `<div class="tile fake ${extra}" data-id="${t.id}" aria-label="sahte okey">★</div>`;
    return `<div class="tile c${t.c} ${wild ? "wild" : ""} ${extra}" data-id="${t.id}" aria-label="${COLOR_NM[t.c]} ${t.n}${wild ? ", okey" : ""}">${wild ? '<span class="lbl">OKEY</span>' : ""}${t.n}</div>`;
  }
  function setStatus(s) { $("status").textContent = s; }
  function renderSeats() {
    const seatEl = { 1: "seat1", 2: "seat2", 3: "seat3" };
    for (const p of [1, 2, 3]) {
      const el = $(seatEl[p]), pl = CFG.players[p];
      el.className = el.className.replace(" cur", "") + (G && G.turn === p && !G.over ? " cur" : "");
      el.innerHTML = `<span class="nm">${pl.cpu ? "🤖 " : ""}${pl.n} · ${WINS[p]}</span><div class="backs">${G ? "<i></i>".repeat(Math.min(15, G.hands[p].length)) : ""}</div>`;
    }
  }
  function render() {
    if (!G) return;
    renderSeats();
    $("pile-n").textContent = G.pile.length;
    $("indicator").innerHTML = tileHTML(G.ind);
    $("okey-txt").textContent = `Okey: ${COLOR_NM[OK.c]} ${OK.n}`;
    for (let p = 0; p < 4; p++) { const d = G.disc[p]; $("disc" + p).innerHTML = d.length ? tileHTML(d[d.length - 1]) : ""; }
    const me = viewer, myTurn = G.turn === me && !CFG.players[me].cpu && !G.over;
    $("my-name").textContent = `${CFG.players[me].n}${humans() > 1 ? "" : ""}`;
    $("my-wins").textContent = `· ${WINS[me]} el`;
    // yuvaların sırası: oyuncu 0 dışında biri izliyorsa masa görünümü aynı kalır
    const prev = (me + 3) % 4;
    $("pile").classList.toggle("can", myTurn && G.phase === "draw");
    for (let p = 0; p < 4; p++) $("disc" + p).classList.toggle("can", myTurn && G.phase === "draw" && p === prev && G.disc[p].length > 0);
    $("disc" + me).classList.toggle("drop", myTurn && G.phase === "discard");
    const rack = $("rack");
    rack.innerHTML = G.racks[me].map((t, i) => t ? tileHTML(t, (G.sel === t ? "sel " : "") + (G.newId === t.id ? "new " : "") + (G.hintId === t.id ? "hint" : "")).replace('class="tile', `data-slot="${i}" class="tile`) : `<div class="slot" data-slot="${i}"></div>`).join("");
    $("discard").disabled = !(myTurn && G.phase === "discard" && G.sel);
    $("hint").disabled = !myTurn;
  }

  /* ---------- etkileşim: ıstaka sürükle / dokun ---------- */
  let drag = null;
  $("rack").addEventListener("pointerdown", (e) => {
    const el = e.target.closest(".tile"); if (!el || !G) return;
    audio();
    const t = G.racks[viewer][+el.dataset.slot];
    drag = { t, from: +el.dataset.slot, x: e.clientX, y: e.clientY, moved: false, ghost: null };
    try { el.setPointerCapture(e.pointerId); } catch (_) {}
  });
  document.addEventListener("pointermove", (e) => {
    if (!drag) return;
    if (!drag.moved && Math.hypot(e.clientX - drag.x, e.clientY - drag.y) > 8) {
      drag.moved = true;
      const g = document.createElement("div"); g.innerHTML = tileHTML(drag.t); drag.ghost = g.firstChild; drag.ghost.classList.add("drag"); document.body.appendChild(drag.ghost);
    }
    if (drag.ghost) { drag.ghost.style.left = e.clientX + "px"; drag.ghost.style.top = e.clientY + "px"; }
  });
  document.addEventListener("pointerup", (e) => {
    if (!drag) return;
    const d = drag; drag = null;
    if (d.ghost) d.ghost.remove();
    const myTurn = G && G.turn === viewer && !CFG.players[viewer].cpu && !G.over;
    if (!d.moved) { // dokunma: seç
      G.sel = G.sel === d.t ? null : d.t; G.hintId = null; render(); return;
    }
    const under = document.elementsFromPoint(e.clientX, e.clientY);
    const dz = under.find(x => x.id === "disc" + viewer);
    if (dz && myTurn && G.phase === "discard") { discard(viewer, d.t); return; }
    const slotEl = under.find(x => x.dataset && x.dataset.slot !== undefined && x.closest && x.closest("#rack"));
    if (slotEl) {
      const r = G.racks[viewer], to = +slotEl.dataset.slot;
      [r[d.from], r[to]] = [r[to], r[d.from]];
      render();
    }
  });
  $("pile").addEventListener("click", () => { audio(); if (G && G.turn === viewer && G.phase === "draw" && !CFG.players[viewer].cpu && !G.over) { drawTile(viewer, false); setStatus("Bir taş seç ve at (ya da sürükleyip kendi atma yerine bırak)."); render(); } });
  for (let p = 0; p < 4; p++) $("disc" + p).addEventListener("click", () => {
    audio();
    if (!G || G.over || G.turn !== viewer || CFG.players[viewer].cpu) return;
    if (G.phase === "draw" && p === (viewer + 3) % 4 && G.disc[p].length) { drawTile(viewer, true); setStatus("Yandan aldın. Şimdi bir taş at."); render(); }
    else if (G.phase === "discard" && p === viewer && G.sel) discard(viewer, G.sel);
  });
  $("discard").addEventListener("click", () => { if (G && G.sel && G.phase === "discard" && G.turn === viewer) discard(viewer, G.sel); });
  $("sort-run").addEventListener("click", () => { if (!G) return; const h = G.hands[viewer]; G.racks[viewer] = new Array(30).fill(null); sortRun(h).forEach((t, i) => (G.racks[viewer][i] = t)); render(); });
  $("sort-pair").addEventListener("click", () => { if (!G) return; const h = G.hands[viewer]; G.racks[viewer] = new Array(30).fill(null); sortPair(h).forEach((t, i) => (G.racks[viewer][i] = t)); render(); });
  $("hint").addEventListener("click", () => {
    if (!G || G.turn !== viewer || G.over) return;
    if (G.phase === "draw") {
      const prev = (viewer + 3) % 4, top = G.disc[prev][G.disc[prev].length - 1];
      const take = top && (bestDiscard(G.hands[viewer].concat([top])).v > evaluate(G.hands[viewer]) + 1.5 || isWild(top));
      setStatus(take ? "💡 Soldakinin attığı taş işine yarar, onu al!" : "💡 Ortadan çek.");
    } else {
      const d = bestDiscard(G.hands[viewer]);
      G.hintId = d.tile.id; G.sel = d.tile;
      setStatus(d.win ? "💡 Bu taşı atarsan eli BİTİRİRSİN!" : "💡 Parlayan taşı atabilirsin.");
      render();
    }
  });
  $("pass-go").addEventListener("click", () => { $("pass").hidden = true; render(); });

  /* ---------- kurulum ---------- */
  const form = $("setup-form");
  function buildRows() {
    $("rows").innerHTML = CFG.players.map((pl, i) => `<div class="p-row"><span class="pos">${POS[i]}</span><input type="text" maxlength="12" value="${pl.n}" aria-label="${POS[i]} oyuncunun adı"><label class="toggle" title="Bilgisayar oynasın"><input type="checkbox" class="cpu" ${pl.cpu ? "checked" : ""}> 🤖</label></div>`).join("");
    form.lvl.value = String(CFG.lvl);
  }
  form.addEventListener("submit", (e) => {
    e.preventDefault(); audio();
    const rows = [...$("rows").querySelectorAll(".p-row")];
    CFG = { players: rows.map((r, i) => ({ n: r.querySelector("input[type=text]").value.trim() || `Oyuncu ${i + 1}`, cpu: r.querySelector(".cpu").checked })), lvl: +form.lvl.value };
    if (CFG.players.every(p => p.cpu)) CFG.players[0].cpu = false;
    store(); WINS = [0, 0, 0, 0];
    $("setup").hidden = true; deal();
  });
  $("settings").addEventListener("click", () => { timers.forEach(clearTimeout); timers = []; buildRows(); $("over").hidden = true; $("setup").hidden = false; });
  $("over-next").addEventListener("click", () => { $("over").hidden = true; deal(); });
  $("over-setup").addEventListener("click", () => { buildRows(); $("over").hidden = true; $("setup").hidden = false; });
  buildRows();

  // test kancası
  window.__okey = { makeTiles, isWin, isPairsWin, cover, evaluate, bestDiscard, setOK: (o) => { OK = o; memo.clear(); }, get G() { return G; }, deal, aiTurn, discard, drawTile, CFG: () => CFG, setCFG: (c) => { CFG = c; }, isWild, memo };
})();
