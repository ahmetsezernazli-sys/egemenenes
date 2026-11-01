/* Şifre Kır — Enes için renkli şifre kırma bulmacası */
(() => {
  "use strict";
  const $ = (id) => document.getElementById(id);
  const SAVE_KEY = "sifre-kir", LEN = 4, TRIES = 10;
  const COLORS = [["#E5484D", "kırmızı"], ["#3D8BFD", "mavi"], ["#FFD166", "sarı"], ["#3DDC97", "yeşil"], ["#B77DFF", "mor"], ["#FF8C42", "turuncu"]];
  const LV = [{ n: 4, dup: false }, { n: 6, dup: false }, { n: 6, dup: true }];

  let save = { wins: 0, best: {} };
  try { save = Object.assign(save, JSON.parse(localStorage.getItem(SAVE_KEY) || "{}")); } catch (e) {}
  const persist = () => { try { localStorage.setItem(SAVE_KEY, JSON.stringify(save)); } catch (e) {} };

  let AC = null;
  function audio() { try { AC = AC || new (window.AudioContext || window.webkitAudioContext)(); if (AC.state === "suspended") AC.resume(); } catch (e) {} }
  function snd(f, d, type, vol, delay) {
    if (!AC) return;
    const t = AC.currentTime + (delay || 0), o = AC.createOscillator(), g = AC.createGain();
    o.type = type || "triangle"; o.frequency.setValueAtTime(f, t);
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol || 0.05, t + 0.01); g.gain.exponentialRampToValueAtTime(0.0001, t + d);
    o.connect(g).connect(AC.destination); o.start(t); o.stop(t + d + 0.02);
  }

  let G = null, lv = 1;
  function newGame(l) {
    lv = l; const L = LV[l];
    const pool = [...Array(L.n).keys()], code = [];
    while (code.length < LEN) { const c = pool[Math.floor(Math.random() * pool.length)]; if (L.dup || !code.includes(c)) code.push(c); }
    G = { code, rows: [], cur: [], sel: 0, over: false };
    $("menu").hidden = true; $("over").hidden = true;
    buildPalette(); render();
  }
  // ipucu: yeşil = doğru yer, beyaz = var ama yanlış yer
  function score(guess, code) {
    let b = 0; const cg = {}, cc = {};
    for (let i = 0; i < LEN; i++) { if (guess[i] === code[i]) b++; else { cg[guess[i]] = (cg[guess[i]] || 0) + 1; cc[code[i]] = (cc[code[i]] || 0) + 1; } }
    let w = 0; for (const k in cg) w += Math.min(cg[k], cc[k] || 0);
    return [b, w];
  }
  function put(c) {
    if (!G || G.over) return;
    if (!LV[lv].dup && G.cur.includes(c) && G.cur[G.sel] !== c) { snd(200, 0.1, "sine"); return; }
    G.cur[G.sel] = c; snd(500 + c * 60, 0.06);
    // bir sonraki boş yere geç
    let n = G.sel; for (let k = 1; k <= LEN; k++) { const j = (G.sel + k) % LEN; if (G.cur[j] === undefined) { n = j; break; } }
    G.sel = n; render();
  }
  function del() { if (!G || G.over) return; let i = G.sel; if (G.cur[i] === undefined) for (let k = LEN - 1; k >= 0; k--) if (G.cur[k] !== undefined) { i = k; break; } G.cur[i] = undefined; G.sel = i; render(); }
  function go() {
    if (!G || G.over) return false;
    if (G.cur.filter(c => c !== undefined).length < LEN) { snd(200, 0.12, "sine"); return false; }
    const g = G.cur.slice(), [b, w] = score(g, G.code);
    G.rows.push({ g, b, w }); G.cur = []; G.sel = 0;
    snd(b === LEN ? 880 : 420, 0.12);
    if (b === LEN) return finish(true);
    if (G.rows.length >= TRIES) return finish(false);
    render(); return true;
  }
  function finish(win) {
    G.over = true; render(true);
    const n = G.rows.length, k = "l" + lv;
    if (win) { save.wins++; const nb = !save.best[k] || n < save.best[k]; if (nb) save.best[k] = n; persist(); [523, 659, 784, 1046].forEach((f, i) => snd(f, 0.2, "triangle", 0.06, i * 0.1)); $("o-ic").textContent = "🏆"; $("o-title").textContent = `${n}. denemede kırdın!`; $("o-tx").textContent = nb ? "Yeni rekor!" : `Rekor: ${save.best[k]} deneme.`; }
    else { $("o-ic").textContent = "🔒"; $("o-title").textContent = "Şifre bu sefer kırılmadı"; $("o-tx").textContent = "Gizli şifre yukarıda açıldı. İpuçlarını birleştirerek tekrar dene!"; }
    setTimeout(() => { $("over").hidden = false; }, 700);
    return true;
  }
  function buildPalette() {
    const p = $("palette"); p.textContent = "";
    COLORS.slice(0, LV[lv].n).forEach(([c, ad], i) => { const b = document.createElement("button"); b.type = "button"; b.style.background = c; b.setAttribute("aria-label", ad); b.addEventListener("click", () => { audio(); put(i); }); p.appendChild(b); });
  }
  function render(reveal) {
    const bd = $("board"); bd.textContent = "";
    const sec = document.createElement("div"); sec.className = "row secret";
    sec.innerHTML = `<span class="no">🔐</span><div class="pegs">${G.code.map(c => reveal || G.over ? `<span class="peg f" style="background:${COLORS[c][0]}"></span>` : `<span class="peg">?</span>`).join("")}</div><span></span>`;
    bd.appendChild(sec);
    for (let r = 0; r < TRIES; r++) {
      const row = document.createElement("div"), done = G.rows[r], cur = r === G.rows.length && !G.over;
      row.className = "row" + (cur ? " cur" : "");
      const pegs = document.createElement("div"); pegs.className = "pegs";
      for (let i = 0; i < LEN; i++) {
        const c = done ? done.g[i] : cur ? G.cur[i] : undefined;
        const p = document.createElement(cur ? "button" : "span"); p.className = "peg" + (c !== undefined ? " f" : "") + (cur && i === G.sel ? " sel" : "");
        if (c !== undefined) p.style.background = COLORS[c][0];
        if (cur) { p.type = "button"; p.setAttribute("aria-label", `${i + 1}. yer${c !== undefined ? ", " + COLORS[c][1] : ", boş"}`); p.addEventListener("click", () => { G.sel = i; render(); }); }
        pegs.appendChild(p);
      }
      const keys = document.createElement("div"); keys.className = "keys";
      if (done) { keys.innerHTML = "<i class=\"b\"></i>".repeat(done.b) + "<i class=\"w\"></i>".repeat(done.w) + "<i></i>".repeat(LEN - done.b - done.w); keys.setAttribute("aria-label", `${done.b} doğru yerde, ${done.w} yanlış yerde`); }
      else keys.innerHTML = "<i></i>".repeat(LEN);
      const no = document.createElement("span"); no.className = "no"; no.textContent = r + 1;
      row.append(no, pegs, keys); bd.appendChild(row);
    }
    $("try").textContent = Math.min(TRIES, G.rows.length + 1); $("wins").textContent = save.wins;
    $("best").textContent = save.best["l" + lv] || "—";
    $("go").disabled = G.over; $("del").disabled = G.over;
  }
  $("go").addEventListener("click", () => { audio(); go(); });
  $("del").addEventListener("click", () => { audio(); del(); });
  document.addEventListener("keydown", (e) => {
    if (!$("menu").hidden || !$("over").hidden || !G) return;
    if (/^[1-6]$/.test(e.key) && +e.key <= LV[lv].n) { audio(); put(+e.key - 1); }
    else if (e.key === "Enter") { e.preventDefault(); audio(); go(); }
    else if (e.key === "Backspace") { e.preventDefault(); del(); }
    else if (e.key === "ArrowLeft") { G.sel = (G.sel + LEN - 1) % LEN; render(); }
    else if (e.key === "ArrowRight") { G.sel = (G.sel + 1) % LEN; render(); }
  });
  $("start").addEventListener("click", () => { audio(); newGame(+document.querySelector('input[name="lv"]:checked').value); });
  $("again").addEventListener("click", () => { audio(); newGame(lv); });
  $("new").addEventListener("click", () => { $("best-line").textContent = save.wins ? `Kazanma: ${save.wins}` : ""; $("menu").hidden = false; });
  newGame(1); $("menu").hidden = false;

  // test kancası
  window.__sk = { score, newGame, put, go, get G() { return G; } };
})();
