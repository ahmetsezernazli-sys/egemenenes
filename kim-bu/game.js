/* Kim Bu? — aile tahmin oyunu */
(() => {
  "use strict";
  const $ = (id) => document.getElementById(id);
  const REC_KEY = "kim-bu-rekor";

  const SLOTS = [
    { av: "🚀", bg: "#3D8BFD" }, { av: "🎈", bg: "#FF7A2F" }, { av: "🦋", bg: "#9B5DE5" },
    { av: "🐢", bg: "#2EB872" }, { av: "🦊", bg: "#E5484D" }, { av: "🐧", bg: "#1CC7B1" },
  ];
  const DEF = [
    { n: "Enes", cpu: false, help: false }, { n: "Egemen", cpu: false, help: true },
    { n: "Anne", cpu: false, help: false }, { n: "Baba", cpu: false, help: false },
    { n: "", cpu: true, help: false }, { n: "", cpu: true, help: false },
  ];
  const NAMES = ["Ali", "Ayşe", "Can", "Deniz", "Elif", "Emre", "Zeynep", "Mert", "Selin", "Burak", "Ece", "Kerem",
    "Defne", "Arda", "Yusuf", "Nil", "Kaan", "Ada", "Ömer", "Derya", "Murat", "Cem", "İpek", "Hakan",
    "Seda", "Oya", "Tolga", "Melis", "Tuna", "Bora", "Leyla", "Rıza", "Nur", "Sinan", "Gül", "Efe", "Lale", "Hasan", "Pınar", "Barış"];

  /* ---------- özellikler ---------- */
  const HAIR = [
    { c: "#F2C94C", d: "#C9A12E", nm: "sarı" }, { c: "#8B5A2B", d: "#6B4220", nm: "kahverengi" },
    { c: "#2B2B2B", d: "#151515", nm: "siyah" }, { c: "#D9542B", d: "#A93C1C", nm: "kızıl" },
    { c: "#E9E9E9", d: "#BDBDBD", nm: "beyaz" },
  ];
  const EYES = [{ c: "#3D8BFD", nm: "mavi" }, { c: "#7A4A22", nm: "kahverengi" }, { c: "#2EAA5C", nm: "yeşil" }];
  const SKIN = ["#F6D2B4", "#EBB98F", "#D69E6E", "#A86F45"];
  const SHIRT = ["#E5484D", "#3D8BFD", "#2EB872", "#9B5DE5", "#FF7A2F", "#1CC7B1", "#F2B705"];
  const HATC = ["#E5484D", "#3D8BFD", "#2EB872", "#9B5DE5", "#333C4A", "#FF7A2F"];

  const QUESTIONS = [
    ...HAIR.map((h, i) => ({ id: "h" + i, t: `Saçı ${h.nm} mı?`, y: `Evet, saçı ${h.nm}.`, n: `Hayır, saçı ${h.nm} değil.`, test: f => f.hair === i, icon: { hair: i } })),
    ...EYES.map((e, i) => ({ id: "e" + i, t: `Gözleri ${e.nm} mi?`, y: `Evet, gözleri ${e.nm}.`, n: `Hayır, gözleri ${e.nm} değil.`, test: f => f.eyes === i, icon: { eye: i } })),
    { id: "hat", t: "Şapkası var mı?", y: "Evet, şapkası var.", n: "Hayır, şapkası yok.", test: f => f.hat, icon: { hat: true } },
    { id: "gl", t: "Gözlüğü var mı?", y: "Evet, gözlüğü var.", n: "Hayır, gözlüğü yok.", test: f => f.glasses, icon: { glasses: true } },
    { id: "be", t: "Sakalı ya da bıyığı var mı?", y: "Evet, sakalı var.", n: "Hayır, sakalı yok.", test: f => f.beard, icon: { beard: true } },
    { id: "lo", t: "Saçı uzun mu?", y: "Evet, saçı uzun.", n: "Hayır, saçı kısa.", test: f => f.long, icon: { long: true } },
    { id: "fr", t: "Çilleri var mı?", y: "Evet, çilleri var.", n: "Hayır, çili yok.", test: f => f.freckles, icon: { freckles: true } },
    { id: "ea", t: "Küpesi var mı?", y: "Evet, küpesi var.", n: "Hayır, küpesi yok.", test: f => f.earrings, icon: { earrings: true } },
  ];

  function rnd(n) { return Math.floor(Math.random() * n); }
  function shuffle(a) { for (let i = a.length - 1; i > 0; i--) { const j = rnd(i + 1); [a[i], a[j]] = [a[j], a[i]]; } return a; }
  // 24 farklı kişi; her soru en az 3 kişiyi ayırsın
  function makeFaces() {
    for (let tries = 0; tries < 500; tries++) {
      const seen = new Set(), out = [], names = shuffle(NAMES.slice());
      while (out.length < 24) {
        const f = {
          hair: rnd(5), eyes: rnd(3), hat: Math.random() < 0.3, glasses: Math.random() < 0.33, beard: Math.random() < 0.28,
          long: Math.random() < 0.38, freckles: Math.random() < 0.28, earrings: Math.random() < 0.28,
        };
        const key = [f.hair, f.eyes, f.hat, f.glasses, f.beard, f.long, f.freckles, f.earrings].join();
        if (seen.has(key)) continue;
        seen.add(key);
        f.skin = SKIN[rnd(SKIN.length)]; f.shirt = SHIRT[rnd(SHIRT.length)]; f.hatC = HATC[rnd(HATC.length)];
        f.name = names[out.length];
        out.push(f);
      }
      if (QUESTIONS.every(q => { const y = out.filter(q.test).length; return y >= 3 && y <= 21; })) return out;
    }
  }

  /* ---------- yüz çizimi ---------- */
  function drawFace(c, W, H, f, bg = "#FFF8EA") {
    const s = Math.min(W, H * 0.9) / 100, cx = W / 2, cy = H * 0.46;
    const hair = HAIR[f.hair], hc = hair.c;
    c.clearRect(0, 0, W, H);
    if (bg) { c.fillStyle = bg; c.fillRect(0, 0, W, H); }
    // omuzlar
    c.fillStyle = f.shirt; c.beginPath(); c.ellipse(cx, H * 0.99 + 6 * s, 40 * s, 26 * s, 0, Math.PI, 0); c.fill();
    c.fillStyle = f.skin; c.fillRect(cx - 7 * s, cy + 22 * s, 14 * s, 14 * s);
    // uzun saç (arka)
    if (f.long) { c.fillStyle = hc; c.beginPath(); c.roundRect ? c.roundRect(cx - 31 * s, cy - 24 * s, 62 * s, 64 * s, 16 * s) : c.rect(cx - 31 * s, cy - 24 * s, 62 * s, 64 * s); c.fill(); }
    // kulaklar
    c.fillStyle = f.skin;
    for (const d of [-1, 1]) { c.beginPath(); c.arc(cx + d * 25 * s, cy + 2 * s, 5.5 * s, 0, 7); c.fill(); }
    // baş
    c.beginPath(); c.ellipse(cx, cy, 25 * s, 29 * s, 0, 0, 7); c.fill();
    // küpe
    if (f.earrings) {
      c.fillStyle = "#F2B705"; c.strokeStyle = "#B88300"; c.lineWidth = s;
      for (const d of [-1, 1]) { c.beginPath(); c.arc(cx + d * 26 * s, cy + 10 * s, 3.4 * s, 0, 7); c.fill(); c.stroke(); }
    }
    // saç (üst)
    c.fillStyle = hc;
    if (!f.hat) {
      c.beginPath(); c.ellipse(cx, cy - 9 * s, 27 * s, 23 * s, 0, Math.PI * 1.02, Math.PI * 1.98); c.lineTo(cx + 26 * s, cy - 4 * s);
      for (let i = 0; i <= 5; i++) c.lineTo(cx + 26 * s - i * 10.4 * s, cy - (i % 2 ? 11 : 6) * s);
      c.closePath(); c.fill();
    }
    // favoriler (şapkalı olsa da saç rengi görünür)
    for (const d of [-1, 1]) c.fillRect(cx + d * 24.5 * s - 3.5 * s, cy - 14 * s, 7 * s, (f.long ? 30 : 13) * s);
    // şapka
    if (f.hat) {
      c.fillStyle = f.hatC;
      c.beginPath(); c.roundRect ? c.roundRect(cx - 22 * s, cy - 46 * s, 44 * s, 32 * s, 8 * s) : c.rect(cx - 22 * s, cy - 46 * s, 44 * s, 32 * s); c.fill();
      c.beginPath(); c.ellipse(cx, cy - 15 * s, 35 * s, 6.5 * s, 0, 0, 7); c.fill();
      c.fillStyle = "rgba(255,255,255,.45)"; c.fillRect(cx - 22 * s, cy - 24 * s, 44 * s, 5 * s);
    }
    // kaşlar
    c.strokeStyle = f.hair === 4 ? "#9A9A9A" : hair.d; c.lineWidth = 2.6 * s; c.lineCap = "round";
    for (const d of [-1, 1]) { c.beginPath(); c.moveTo(cx + d * 5 * s, cy - 8 * s); c.lineTo(cx + d * 15 * s, cy - 9.5 * s); c.stroke(); }
    // gözler
    for (const d of [-1, 1]) {
      const ex = cx + d * 10 * s, ey = cy + 1 * s;
      c.fillStyle = "#fff"; c.beginPath(); c.ellipse(ex, ey, 6.4 * s, 5.4 * s, 0, 0, 7); c.fill();
      c.fillStyle = EYES[f.eyes].c; c.beginPath(); c.arc(ex, ey, 3.9 * s, 0, 7); c.fill();
      c.fillStyle = "#111"; c.beginPath(); c.arc(ex, ey, 1.7 * s, 0, 7); c.fill();
      c.fillStyle = "#fff"; c.beginPath(); c.arc(ex + 1.3 * s, ey - 1.3 * s, 0.9 * s, 0, 7); c.fill();
    }
    // gözlük
    if (f.glasses) {
      c.strokeStyle = "#2B2B2B"; c.lineWidth = 2.2 * s;
      for (const d of [-1, 1]) { c.beginPath(); c.arc(cx + d * 10 * s, cy + 1 * s, 8.6 * s, 0, 7); c.stroke(); }
      c.beginPath(); c.moveTo(cx - 1.6 * s, cy); c.lineTo(cx + 1.6 * s, cy); c.stroke();
      c.beginPath(); c.moveTo(cx - 18.5 * s, cy); c.lineTo(cx - 24 * s, cy - 2 * s); c.moveTo(cx + 18.5 * s, cy); c.lineTo(cx + 24 * s, cy - 2 * s); c.stroke();
    }
    // yanaklar, çiller
    c.fillStyle = "rgba(255,120,120,.22)";
    for (const d of [-1, 1]) { c.beginPath(); c.arc(cx + d * 15 * s, cy + 11 * s, 4.5 * s, 0, 7); c.fill(); }
    if (f.freckles) {
      c.fillStyle = "#B8683C";
      for (const d of [-1, 1]) for (const [dx, dy] of [[11, 8], [15, 10], [13, 13], [17, 7]]) { c.beginPath(); c.arc(cx + d * dx * s, cy + dy * s, 1.1 * s, 0, 7); c.fill(); }
    }
    // burun
    c.strokeStyle = "rgba(0,0,0,.28)"; c.lineWidth = 1.6 * s;
    c.beginPath(); c.moveTo(cx, cy + 3 * s); c.quadraticCurveTo(cx + 3.5 * s, cy + 9 * s, cx - 1 * s, cy + 9.5 * s); c.stroke();
    // sakal
    if (f.beard) {
      c.fillStyle = hc;
      c.beginPath(); c.moveTo(cx - 23 * s, cy + 4 * s);
      c.quadraticCurveTo(cx - 22 * s, cy + 32 * s, cx, cy + 34 * s); c.quadraticCurveTo(cx + 22 * s, cy + 32 * s, cx + 23 * s, cy + 4 * s);
      c.quadraticCurveTo(cx + 14 * s, cy + 22 * s, cx, cy + 20 * s); c.quadraticCurveTo(cx - 14 * s, cy + 22 * s, cx - 23 * s, cy + 4 * s); c.fill();
      c.beginPath(); c.ellipse(cx - 5 * s, cy + 12.5 * s, 6.5 * s, 2.8 * s, -0.2, 0, 7); c.ellipse(cx + 5 * s, cy + 12.5 * s, 6.5 * s, 2.8 * s, 0.2, 0, 7); c.fill();
    }
    // ağız
    c.strokeStyle = "#8A3B2B"; c.lineWidth = 2.2 * s;
    c.beginPath(); c.arc(cx, cy + 13 * s, 6 * s, 0.2 * Math.PI, 0.8 * Math.PI); c.stroke();
  }
  // soru simgesi
  function drawIcon(c, W, H, ic) {
    if (ic.eye !== undefined) {
      c.clearRect(0, 0, W, H); c.fillStyle = "#FFF8EA"; c.fillRect(0, 0, W, H);
      c.fillStyle = "#fff"; c.strokeStyle = "#333"; c.lineWidth = W * 0.04;
      c.beginPath(); c.ellipse(W / 2, H / 2, W * 0.42, H * 0.28, 0, 0, 7); c.fill(); c.stroke();
      c.fillStyle = EYES[ic.eye].c; c.beginPath(); c.arc(W / 2, H / 2, W * 0.2, 0, 7); c.fill();
      c.fillStyle = "#111"; c.beginPath(); c.arc(W / 2, H / 2, W * 0.09, 0, 7); c.fill();
      c.fillStyle = "#fff"; c.beginPath(); c.arc(W * 0.56, H * 0.44, W * 0.04, 0, 7); c.fill();
      return;
    }
    const f = { hair: 1, eyes: 1, hat: false, glasses: false, beard: false, long: false, freckles: false, earrings: false, skin: SKIN[0], shirt: "#B9C7C5", hatC: "#E5484D" };
    Object.assign(f, ic);
    drawFace(c, W, H, f);
  }

  /* ---------- ses ---------- */
  let soundOn = true, AC = null;
  function audio() { try { AC = AC || new (window.AudioContext || window.webkitAudioContext)(); if (AC.state === "suspended") AC.resume(); } catch (e) {} }
  function tone(f, d = 0.12, type = "triangle", vol = 0.06) {
    if (!soundOn || !AC) return;
    const t = AC.currentTime, o = AC.createOscillator(), g = AC.createGain();
    o.type = type; o.frequency.setValueAtTime(f, t);
    g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + d);
    o.connect(g).connect(AC.destination); o.start(t); o.stop(t + d + 0.02);
  }
  const sYes = () => { tone(660); setTimeout(() => tone(880), 90); };
  const sNo = () => { tone(330, 0.16, "square", 0.04); setTimeout(() => tone(250, 0.18, "square", 0.04), 110); };
  const sFlip = () => tone(500 + Math.random() * 200, 0.05, "sine", 0.03);
  const sWin = () => [523, 659, 784, 1046].forEach((f, i) => setTimeout(() => tone(f, 0.2), i * 130));
  let trVoice = null;
  function say(text) {
    if (!soundOn || !("speechSynthesis" in window)) return;
    try {
      const u = new SpeechSynthesisUtterance(text); u.lang = "tr-TR"; u.rate = 1;
      trVoice = trVoice || speechSynthesis.getVoices().find(v => v.lang && v.lang.toLowerCase().startsWith("tr"));
      if (trVoice) u.voice = trVoice;
      speechSynthesis.speak(u);
    } catch (e) {}
  }
  const hush = () => { try { speechSynthesis.cancel(); } catch (e) {} };

  /* ---------- oyun ---------- */
  let G = null, timers = [];
  const later = (sec, fn) => { const id = setTimeout(fn, sec * 1000); timers.push(id); return id; };
  const clearTimers = () => { timers.forEach(clearTimeout); timers = []; };
  const P = () => G.players[G.cur];
  const openIdx = () => G.open.map((o, i) => (o ? i : -1)).filter(i => i >= 0);

  function newGame(cfg) {
    clearTimers(); hush();
    G = { cfg, players: cfg.players.map(p => Object.assign({ score: 0, qs: 0 }, p)), rounds: cfg.rounds, round: 0, starter: 0, solo: cfg.players.length === 1 };
    $("setup").hidden = true; $("end").hidden = true; $("reveal").hidden = true; $("guess").hidden = true;
    startRound();
  }
  function startRound() {
    clearTimers(); hush();
    G.round++;
    G.faces = makeFaces(); G.secret = rnd(24); G.open = Array(24).fill(true); G.asked = new Set();
    G.cur = G.starter; G.busy = false; G.roundQs = 0;
    buildBoard(); buildQs(); renderPlayers();
    $("answer").hidden = true;
    say(`${G.round}. tur. Gizli kişi seçildi.`);
    turn();
  }
  function turn() {
    G.busy = false;
    renderPlayers(); renderQs();
    const p = P();
    $("status").textContent = G.solo ? `${G.round}. tur · Soru sor ya da tahmin et (${G.roundQs} soru)` : `Sıra: ${p.av} ${p.name}`;
    if (!G.solo) say(`Sıra ${p.name}'de.`);
    if (p.cpu) { G.busy = true; renderQs(); later(1.6, cpuMove); }
  }
  function nextTurn() {
    G.cur = (G.cur + 1) % G.players.length;
    later(0.4, turn);
  }

  function bestQuestion() {
    const idx = openIdx(); let best = null, bv = 1e9;
    for (const q of QUESTIONS) {
      if (G.asked.has(q.id)) continue;
      const y = idx.filter(i => q.test(G.faces[i])).length, n = idx.length - y;
      if (!y || !n) continue;
      const v = Math.abs(y - n) + Math.random() * 0.5;
      if (v < bv) { bv = v; best = q; }
    }
    return best;
  }
  function cpuMove() {
    const idx = openIdx(), q = bestQuestion();
    if (idx.length <= 2 || !q || (idx.length === 3 && Math.random() < 0.3)) {
      const i = idx[rnd(idx.length)];
      $("status").textContent = `${P().av} ${P().name} tahmin ediyor: ${G.faces[i].name}`;
      flashCard(i);
      later(1.2, () => doGuess(i));
    } else ask(q);
  }

  function ask(q) {
    if (G.asked.has(q.id)) return;
    G.busy = true; G.asked.add(q.id); G.roundQs++; P().qs++;
    renderQs();
    const p = P();
    $("status").textContent = G.solo ? `“${q.t}”` : `${p.av} ${p.name} soruyor: “${q.t}”`;
    hush(); say(q.t);
    later(1.5, () => {
      const yes = q.test(G.faces[G.secret]);
      showAnswer(q, yes);
      $("status").textContent = `${yes ? "✔" : "✖"} ${yes ? q.y : q.n}`;
      yes ? sYes() : sNo();
      say(yes ? q.y : q.n);
      const close = openIdx().filter(i => q.test(G.faces[i]) !== yes);
      close.forEach((i, k) => later(0.7 + k * 0.07, () => flip(i)));
      later(0.9 + close.length * 0.07 + 0.5, () => {
        if (openIdx().length === 1) roundWon(G.cur, false);
        else if (G.solo) turn();
        else nextTurn();
      });
    });
  }
  function doGuess(i) {
    G.busy = true;
    const p = P(), f = G.faces[i];
    if (i === G.secret) { roundWon(G.cur, true); return; }
    hush(); sNo(); say(`Hayır, gizli kişi ${f.name} değil.`);
    $("status").textContent = `Hayır, ${f.name} değil!`;
    if (G.solo) { G.roundQs++; p.qs++; }
    later(0.6, () => flip(i));
    later(1.4, () => { if (openIdx().length === 1) roundWon(G.cur, false); else if (G.solo) turn(); else nextTurn(); });
  }
  function roundWon(pi, byGuess) {
    G.busy = true;
    const p = G.players[pi], f = G.faces[G.secret];
    if (!G.solo) p.score++;
    renderPlayers();
    sWin();
    hush();
    const who = G.solo ? "Buldun!" : `${p.name} buldu!`;
    say(`${who} Gizli kişi ${f.name}.`);
    G.open.forEach((o, i) => { if (i !== G.secret && o) flip(i); });
    later(0.9, () => {
      const c = $("reveal-face"); drawFace(c.getContext("2d"), c.width, c.height, f);
      $("reveal-top").textContent = "Gizli kişi:";
      $("reveal-title").textContent = f.name;
      $("reveal-text").textContent = G.solo
        ? `${G.roundQs} soruda buldun.`
        : `${p.av} ${p.name} ${byGuess ? "doğru tahmin etti" : "son soruyla buldu"}! ⭐`;
      $("reveal-next").textContent = G.round >= G.rounds ? "Sonuçlar" : "Sonraki tur";
      $("reveal").hidden = false; $("reveal-next").focus();
    });
  }
  $("reveal-next").addEventListener("click", () => {
    $("reveal").hidden = true;
    if (G.round >= G.rounds) return finish();
    G.starter = (G.starter + 1) % G.players.length;
    startRound();
  });

  function finish() {
    hush();
    const box = $("results"); box.innerHTML = "";
    if (G.solo) {
      const p = G.players[0], total = p.qs;
      let rec = {}; try { rec = JSON.parse(localStorage.getItem(REC_KEY) || "{}"); } catch (e) {}
      const k = "r" + G.rounds, prev = rec[k], isRec = !prev || total < prev;
      if (isRec) { rec[k] = total; try { localStorage.setItem(REC_KEY, JSON.stringify(rec)); } catch (e) {} }
      $("end-title").textContent = `${G.rounds} gizli kişiyi ${total} soruda buldun!`;
      box.innerHTML = `<div class="win"><span>Tur başına</span><b>${(total / G.rounds).toFixed(1)} soru</b></div>`;
      $("end-text").textContent = isRec ? "Yeni rekor! 🎉" : `Rekor: ${prev} soru`;
      say(`${total} soruda buldun.` + (isRec ? " Yeni rekor!" : ""));
    } else {
      const sorted = G.players.slice().sort((a, b) => b.score - a.score);
      const top = sorted[0].score, winners = sorted.filter(p => p.score === top);
      $("end-title").textContent = winners.length > 1 ? `Berabere: ${winners.map(p => p.name).join(" ve ")}!` : `${winners[0].name} kazandı!`;
      for (const p of sorted) {
        const d = document.createElement("div"); if (p.score === top) d.className = "win";
        d.innerHTML = `<span>${p.av} ${p.name}</span><b>${"⭐".repeat(p.score) || "0"}</b>`;
        box.appendChild(d);
      }
      $("end-text").textContent = "";
      say($("end-title").textContent);
    }
    sWin();
    $("end").hidden = false; $("again").focus();
  }

  /* ---------- çizim / arayüz ---------- */
  function buildBoard() {
    const box = $("board"); box.innerHTML = "";
    G.faces.forEach((f, i) => {
      const b = document.createElement("button");
      b.type = "button"; b.className = "card"; b.dataset.i = i;
      b.setAttribute("aria-label", f.name);
      b.innerHTML = `<span class="in"><span class="front"><canvas width="200" height="210"></canvas><span>${f.name}</span></span><span class="back">?</span></span>`;
      const c = b.querySelector("canvas");
      drawFace(c.getContext("2d"), 200, 210, f);
      b.addEventListener("click", () => onCard(i));
      box.appendChild(b);
    });
  }
  function flip(i) {
    if (!G.open[i]) return;
    G.open[i] = false;
    const b = $("board").children[i];
    b.classList.add("down"); b.setAttribute("aria-label", `${G.faces[i].name} (kapalı)`); b.disabled = true;
    sFlip();
  }
  function flashCard(i) { const b = $("board").children[i]; b.classList.add("flash"); later(1.2, () => b.classList.remove("flash")); }
  function onCard(i) {
    if (!G || G.busy || P().cpu || !G.open[i]) return;
    audio();
    const f = G.faces[i], c = $("guess-face");
    drawFace(c.getContext("2d"), c.width, c.height, f);
    $("guess-title").textContent = `Gizli kişi ${f.name} mi?`;
    say(`Gizli kişi ${f.name} mi?`);
    $("guess").hidden = false; $("guess-yes").focus();
    $("guess-yes").onclick = () => { $("guess").hidden = true; doGuess(i); };
  }
  $("guess-no").addEventListener("click", () => { $("guess").hidden = true; hush(); });

  function buildQs() {
    const box = $("qs");
    if (box.children.length) return;
    QUESTIONS.forEach(q => {
      const b = document.createElement("button");
      b.type = "button"; b.className = "q"; b.dataset.id = q.id;
      b.innerHTML = `<canvas width="80" height="80" aria-hidden="true"></canvas><span>${q.t}</span>`;
      drawIcon(b.querySelector("canvas").getContext("2d"), 80, 80, q.icon);
      b.addEventListener("click", () => { if (!G || G.busy || P().cpu) return; audio(); ask(q); });
      box.appendChild(b);
    });
  }
  function renderQs() {
    const p = G && P(), hintQ = p && p.help && !p.cpu && !G.busy ? bestQuestion() : null;
    $("qs").querySelectorAll(".q").forEach(b => {
      b.disabled = !G || G.asked.has(b.dataset.id) || G.busy || (p && p.cpu);
      b.classList.toggle("hint", !!hintQ && hintQ.id === b.dataset.id);
    });
  }
  function showAnswer(q, yes) {
    const el = $("answer");
    el.className = "answer " + (yes ? "yes" : "no");
    el.innerHTML = `<canvas width="96" height="96" aria-hidden="true"></canvas><span><big>${yes ? "✔ Evet!" : "✖ Hayır!"}</big>${yes ? q.y : q.n}</span>`;
    drawIcon(el.querySelector("canvas").getContext("2d"), 96, 96, q.icon);
    el.hidden = false;
  }
  function renderPlayers() {
    const box = $("players"); box.innerHTML = "";
    G.players.forEach((p, i) => {
      const d = document.createElement("span");
      d.className = "pl" + (i === G.cur && !G.solo ? " cur" : "");
      d.innerHTML = `<span class="av" style="background:${p.bg}">${p.av}</span>${p.name}${p.cpu ? " 🤖" : ""}${G.solo ? ` · <b>${p.qs} soru</b>` : ` <b>${p.score ? "⭐".repeat(p.score) : "0"}</b>`}`;
      box.appendChild(d);
    });
    const tr = document.createElement("span"); tr.className = "pl"; tr.innerHTML = `🔍 Tur <b>${G.round}/${G.rounds}</b>`;
    box.appendChild(tr);
  }

  /* ---------- kurulum ---------- */
  const form = $("setup-form");
  function buildRows() {
    const n = +form.count.value, box = $("rows");
    const old = [...box.querySelectorAll(".p-row")].map(r => ({ n: r.querySelector("input[type=text]").value, cpu: r.querySelector(".cpu").checked, help: r.querySelector(".help").checked }));
    box.innerHTML = "";
    for (let i = 0; i < n; i++) {
      const src = old[i] || DEF[i], row = document.createElement("div");
      row.className = "p-row";
      row.innerHTML = `<span class="av" style="background:${SLOTS[i].bg}">${SLOTS[i].av}</span>
        <input type="text" maxlength="12" aria-label="${i + 1}. oyuncunun adı" placeholder="Oyuncu ${i + 1}">
        <label class="toggle" title="Bilgisayar oynasın"><input type="checkbox" class="cpu"><span>🤖</span></label>
        <label class="toggle" title="Yardım: iyi soru parlar"><input type="checkbox" class="help"><span>✨</span></label>`;
      row.querySelector("input[type=text]").value = src.n;
      row.querySelector(".cpu").checked = n > 1 && src.cpu;
      row.querySelector(".cpu").disabled = n === 1;
      row.querySelector(".help").checked = src.help;
      box.appendChild(row);
    }
  }
  form.addEventListener("change", e => { if (e.target.name === "count") buildRows(); });
  form.addEventListener("submit", e => {
    e.preventDefault(); audio();
    const players = [...$("rows").querySelectorAll(".p-row")].map((r, i) => ({
      name: r.querySelector("input[type=text]").value.trim() || (r.querySelector(".cpu").checked ? `Robot ${i + 1}` : `Oyuncu ${i + 1}`),
      av: SLOTS[i].av, bg: SLOTS[i].bg, cpu: r.querySelector(".cpu").checked, help: r.querySelector(".help").checked,
    }));
    newGame({ players, rounds: +form.rounds.value });
  });
  $("open-setup").addEventListener("click", () => { clearTimers(); hush(); $("end").hidden = true; $("reveal").hidden = true; $("guess").hidden = true; $("setup").hidden = false; });
  $("end-setup").addEventListener("click", () => { $("end").hidden = true; $("setup").hidden = false; });
  $("again").addEventListener("click", () => { audio(); newGame(G.cfg); });
  $("sound").addEventListener("click", () => {
    soundOn = !soundOn; $("ic-on").hidden = !soundOn; $("ic-off").hidden = soundOn;
    $("sound").setAttribute("aria-pressed", soundOn); $("sound").setAttribute("aria-label", soundOn ? "Sesi kapat" : "Sesi aç");
    if (!soundOn) hush();
  });
  document.addEventListener("keydown", e => {
    if (e.key === "Escape") { if (!$("guess").hidden) { $("guess").hidden = true; hush(); } }
  });
  buildRows();

  // arka planda boş bir tahta görünsün
  G = { players: [], rounds: 0, round: 0, faces: makeFaces(), open: Array(24).fill(true), asked: new Set(), busy: true, cur: 0 };
  buildBoard(); buildQs(); renderQs();

  // test kancası
  window.__kim = { get G() { return G; }, QUESTIONS, makeFaces, ask, doGuess, bestQuestion, newGame, openIdx };
})();
