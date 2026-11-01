/* Ritim Ustası — 4 şeritli ritim oyunu (Enes için) */
(() => {
  "use strict";
  const $ = (id) => document.getElementById(id);
  const cv = $("cv"), ctx = cv.getContext("2d"), stage = $("stage");
  const SAVE_KEY = "ritim-ustasi";

  /* ---------- şarkılar (telifsiz ezgiler) ----------
     "nota:vuruş" — vuruş = dörtlük sayısı; R = sus */
  const SONGS = [
    { id: "dun", nm: "Daha Dün Annemizin", ic: "⭐", by: "Halk ezgisi", bpm: 112,
      seq: "C4:1 C4:1 G4:1 G4:1 A4:1 A4:1 G4:2 F4:1 F4:1 E4:1 E4:1 D4:1 D4:1 C4:2 G4:1 G4:1 F4:1 F4:1 E4:1 E4:1 D4:2 G4:1 G4:1 F4:1 F4:1 E4:1 E4:1 D4:2 C4:1 C4:1 G4:1 G4:1 A4:1 A4:1 G4:2 F4:1 F4:1 E4:1 E4:1 D4:1 D4:1 C4:2" },
    { id: "nese", nm: "Neşeye Övgü", ic: "🎻", by: "Beethoven", bpm: 120,
      seq: "E4:1 E4:1 F4:1 G4:1 G4:1 F4:1 E4:1 D4:1 C4:1 C4:1 D4:1 E4:1 E4:1.5 D4:0.5 D4:2 " +
           "E4:1 E4:1 F4:1 G4:1 G4:1 F4:1 E4:1 D4:1 C4:1 C4:1 D4:1 E4:1 D4:1.5 C4:0.5 C4:2 " +
           "D4:1 D4:1 E4:1 C4:1 D4:1 E4:0.5 F4:0.5 E4:1 C4:1 D4:1 E4:0.5 F4:0.5 E4:1 D4:1 C4:1 D4:1 G3:2 " +
           "E4:1 E4:1 F4:1 G4:1 G4:1 F4:1 E4:1 D4:1 C4:1 C4:1 D4:1 E4:1 D4:1.5 C4:0.5 C4:2" },
    { id: "elise", nm: "Für Elise", ic: "🎹", by: "Beethoven", bpm: 84,
      seq: "E5:0.5 D#5:0.5 E5:0.5 D#5:0.5 E5:0.5 B4:0.5 D5:0.5 C5:0.5 A4:1 R:0.5 C4:0.5 E4:0.5 A4:0.5 B4:1 R:0.5 E4:0.5 G#4:0.5 B4:0.5 C5:1 R:0.5 " +
           "E4:0.5 E5:0.5 D#5:0.5 E5:0.5 D#5:0.5 E5:0.5 B4:0.5 D5:0.5 C5:0.5 A4:1 R:0.5 C4:0.5 E4:0.5 A4:0.5 B4:1 R:0.5 E4:0.5 C5:0.5 B4:0.5 A4:2" },
    { id: "kral", nm: "Dağ Kralının Salonu", ic: "👑", by: "Grieg · giderek hızlanır!", bpm: 96, accel: 0.9,
      seq: ("A3:0.5 B3:0.5 C4:0.5 D4:0.5 E4:0.5 C4:0.5 E4:1 D#4:0.5 B3:0.5 D#4:1 D4:0.5 A#3:0.5 D4:1 " +
            "A3:0.5 B3:0.5 C4:0.5 D4:0.5 E4:0.5 C4:0.5 E4:0.5 A4:0.5 G4:0.5 E4:0.5 C4:0.5 E4:0.5 G4:2 ").repeat(3) },
    { id: "turk", nm: "Türk Marşı", ic: "🥁", by: "Mozart · zor!", bpm: 100,
      seq: ("B4:0.25 A4:0.25 G#4:0.25 A4:0.25 C5:1 D5:0.25 C5:0.25 B4:0.25 C5:0.25 E5:1 " +
            "F5:0.25 E5:0.25 D#5:0.25 E5:0.25 B5:0.25 A5:0.25 G#5:0.25 A5:0.25 B5:0.25 A5:0.25 G#5:0.25 A5:0.25 C6:2 ").repeat(3) },
  ];
  const DIFFS = [
    { id: "kolay", nm: "Kolay", grid: 1, gap: 1, lead: 1.7 },
    { id: "normal", nm: "Normal", grid: 0.5, gap: 0.5, lead: 1.35 },
    { id: "zor", nm: "Zor", grid: 0, gap: 0, lead: 1.1 },
  ];
  const LANES = [{ col: "#FF4D6D", key: "D" }, { col: "#FFD166", key: "F" }, { col: "#06D6A0", key: "J" }, { col: "#4CC9F0", key: "K" }];
  const KEYS = { d: 0, f: 1, j: 2, k: 3, arrowleft: 0, arrowdown: 1, arrowup: 2, arrowright: 3 };

  const NOTE_IX = { C: 0, "C#": 1, Db: 1, D: 2, "D#": 3, Eb: 3, E: 4, F: 5, "F#": 6, Gb: 6, G: 7, "G#": 8, Ab: 8, A: 9, "A#": 10, Bb: 10, B: 11 };
  const freqOf = (n) => { const m = n.match(/^([A-G][#b]?)(\d)$/); const midi = (+m[2] + 1) * 12 + NOTE_IX[m[1]]; return 440 * Math.pow(2, (midi - 69) / 12); };

  // şarkıyı zamanlanmış notalara çevir (zorluğa göre seyrelt)
  function build(song, diff) {
    const raw = song.seq.trim().split(/\s+/).map(t => { const [n, d] = t.split(":"); return { n, d: +d }; });
    let beat = 0, time = 0, bpm = song.bpm;
    const notes = [], beats = [];
    let nextBeat = 0;
    for (const r of raw) {
      // vuruş zamanlarını da çıkar (davul için)
      while (nextBeat < beat + r.d - 1e-9) {
        const into = nextBeat - beat;
        beats.push(time + into * 60 / bpm);
        nextBeat += 1;
      }
      if (r.n !== "R") notes.push({ beat, t: time, dur: r.d * 60 / bpm, f: freqOf(r.n), name: r.n });
      time += r.d * 60 / bpm; beat += r.d;
      if (song.accel) bpm += song.accel * r.d;
    }
    const pitches = [...new Set(notes.map(n => n.f))].sort((a, b) => a - b);
    for (const n of notes) n.lane = Math.min(3, Math.floor(pitches.indexOf(n.f) / pitches.length * 4));
    // zorluk: kolayda yalnız vuruş başları, araları geniş
    let kept = notes;
    if (diff.grid) {
      kept = []; let lastBeat = -99;
      for (const n of notes) {
        const onGrid = Math.abs(n.beat / diff.grid - Math.round(n.beat / diff.grid)) < 1e-6;
        if (onGrid && n.beat - lastBeat >= diff.gap - 1e-6) { kept.push(n); lastBeat = n.beat; }
      }
    }
    return { notes: kept.map(n => Object.assign({}, n, { hit: null })), all: notes, beats, length: time };
  }

  /* ---------- kayıt ---------- */
  let SAVE = { diff: 0, best: {} };
  try { SAVE = Object.assign(SAVE, JSON.parse(localStorage.getItem(SAVE_KEY) || "{}")); } catch (e) {}
  const store = () => { try { localStorage.setItem(SAVE_KEY, JSON.stringify(SAVE)); } catch (e) {} };

  /* ---------- ses ---------- */
  let AC = null, master = null;
  function audio() {
    try {
      if (!AC) { AC = new (window.AudioContext || window.webkitAudioContext)(); master = AC.createGain(); master.gain.value = 0.8; master.connect(AC.destination); }
      if (AC.state === "suspended") AC.resume();
    } catch (e) {}
  }
  function playNote(f, dur, when) {
    const t = when ?? AC.currentTime, d = Math.min(0.9, Math.max(0.15, dur));
    for (const [type, mul, vol] of [["triangle", 1, 0.16], ["sine", 2, 0.05]]) {
      const o = AC.createOscillator(), g = AC.createGain();
      o.type = type; o.frequency.value = f * mul;
      g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + 0.01); g.gain.exponentialRampToValueAtTime(0.0001, t + d);
      o.connect(g).connect(master); o.start(t); o.stop(t + d + 0.05);
    }
  }
  function kick(t, strong) {
    const o = AC.createOscillator(), g = AC.createGain();
    o.frequency.setValueAtTime(strong ? 140 : 110, t); o.frequency.exponentialRampToValueAtTime(45, t + 0.12);
    g.gain.setValueAtTime(strong ? 0.35 : 0.22, t); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.15);
    o.connect(g).connect(master); o.start(t); o.stop(t + 0.17);
  }
  let noiseBuf = null;
  function hat(t) {
    if (!noiseBuf) { noiseBuf = AC.createBuffer(1, AC.sampleRate * 0.05, AC.sampleRate); const ch = noiseBuf.getChannelData(0); for (let i = 0; i < ch.length; i++) ch[i] = Math.random() * 2 - 1; }
    const s = AC.createBufferSource(), f = AC.createBiquadFilter(), g = AC.createGain();
    s.buffer = noiseBuf; f.type = "highpass"; f.frequency.value = 7000; g.gain.setValueAtTime(0.08, t); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.04);
    s.connect(f).connect(g).connect(master); s.start(t);
  }
  function blip(f, d = 0.08, vol = 0.08) { const t = AC.currentTime, o = AC.createOscillator(), g = AC.createGain(); o.type = "square"; o.frequency.value = f; g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + d); o.connect(g).connect(master); o.start(t); o.stop(t + d + 0.02); }

  /* ---------- oyun ---------- */
  const WIN = { perfect: 0.06, good: 0.12, miss: 0.16 };
  let G = null, songIdx = 0;
  const now = () => (G ? AC.currentTime - G.t0 : 0);
  function start(i) {
    audio(); songIdx = i;
    const song = SONGS[i], diff = DIFFS[SAVE.diff], b = build(song, diff);
    G = { song, diff, notes: b.notes, beats: b.beats, length: b.length, t0: AC.currentTime + 2.2, schedIx: 0, countIx: -4,
          score: 0, combo: 0, maxCombo: 0, perfect: 0, good: 0, miss: 0, judge: null, flash: [0, 0, 0, 0], press: [false, false, false, false], fx: [], over: false };
    $("menu").hidden = true; $("result").hidden = true;
  }
  function schedule() {
    // davul: önden 0.25 sn planla
    const ahead = AC.currentTime + 0.25;
    // giriş sayımı
    while (G.countIx < 0) {
      const t = G.t0 + (G.countIx) * (60 / G.song.bpm);
      if (t > ahead) return;
      if (t >= AC.currentTime - 0.05) { const o = AC.createOscillator(), g = AC.createGain(); o.frequency.value = G.countIx === -1 ? 1320 : 880; g.gain.setValueAtTime(0.1, t); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.06); o.connect(g).connect(master); o.start(t); o.stop(t + 0.08); }
      G.countIx++;
    }
    while (G.schedIx < G.beats.length) {
      const bt = G.beats[G.schedIx], t = G.t0 + bt;
      if (t > ahead) break;
      if (t >= AC.currentTime - 0.05) {
        kick(t, G.schedIx % 4 === 0);
        const nb = G.beats[G.schedIx + 1] ?? bt + 60 / G.song.bpm;
        hat(G.t0 + (bt + nb) / 2);
      }
      G.schedIx++;
    }
  }
  function judge(lane) {
    if (!G || G.over) return;
    G.press[lane] = true; G.flash[lane] = 0.12;
    const t = now();
    let best = null, bd = 1e9;
    for (const n of G.notes) {
      if (n.hit || n.lane !== lane) continue;
      const d = Math.abs(n.t - t);
      if (d < bd) { bd = d; best = n; }
      if (n.t - t > WIN.miss) break;
    }
    if (!best || bd > WIN.miss) return; // boş basış cezasız
    if (bd <= WIN.perfect) { best.hit = "perfect"; G.perfect++; G.combo++; add(300); G.judge = { s: "MÜKEMMEL", col: "#FFD166", t: 0 }; }
    else if (bd <= WIN.good) { best.hit = "good"; G.good++; G.combo++; add(100); G.judge = { s: "İYİ", col: "#06D6A0", t: 0 }; }
    else { best.hit = "miss"; G.miss++; G.combo = 0; G.judge = { s: "ERKEN/GEÇ", col: "#FF4D6D", t: 0 }; blip(160); return; }
    G.maxCombo = Math.max(G.maxCombo, G.combo);
    playNote(best.f, best.dur);
    for (let i = 0; i < 8; i++) { const a = Math.random() * Math.PI, v = 80 + Math.random() * 160; G.fx.push({ lane, x: Math.cos(a) * v, y: -Math.sin(a) * v, t: 0, life: 0.45 }); }
  }
  const mult = () => (G.combo >= 30 ? 4 : G.combo >= 20 ? 3 : G.combo >= 10 ? 2 : 1);
  function add(p) { G.score += p * mult(); }
  function update(dt) {
    if (!G || G.over) return;
    schedule();
    const t = now();
    for (const n of G.notes) {
      if (n.hit) continue;
      if (t - n.t > WIN.miss) { n.hit = "miss"; G.miss++; G.combo = 0; G.judge = { s: "KAÇTI", col: "#FF4D6D", t: 0 }; }
      else if (n.t > t) break;
    }
    for (let i = 0; i < 4; i++) G.flash[i] = Math.max(0, G.flash[i] - dt);
    if (G.judge) G.judge.t += dt;
    for (const f of G.fx) f.t += dt;
    G.fx = G.fx.filter(f => f.t < f.life);
    if (t > G.length + 1.2 && G.notes.every(n => n.hit)) finish();
  }
  function finish() {
    G.over = true;
    const n = G.notes.length, acc = n ? (G.perfect + G.good * 0.6) / n : 0;
    const grade = acc >= 0.95 && G.miss === 0 ? "S" : acc >= 0.88 ? "A" : acc >= 0.75 ? "B" : acc >= 0.55 ? "C" : "D";
    const key = G.song.id + "." + G.diff.id, prev = SAVE.best[key];
    const better = !prev || G.score > prev.score;
    if (better) SAVE.best[key] = { score: G.score, grade };
    store();
    $("r-grade").textContent = grade;
    $("r-title").textContent = `${G.song.nm} · ${G.diff.nm}`;
    $("r-stats").innerHTML = [["Puan", G.score], ["İsabet", Math.round(acc * 100) + "%"], ["En uzun kombo", G.maxCombo], ["Kaçan", G.miss]]
      .map(([a, b]) => `<div><small>${a}</small><b>${b}</b></div>`).join("");
    $("r-text").textContent = better && prev ? "🎉 Yeni rekor!" : prev ? `Rekor: ${prev.score} (${prev.grade})` : "";
    [523, 659, 784, 1046].forEach((f, i) => setTimeout(() => playNote(f, 0.25), i * 120));
    setTimeout(() => { $("result").hidden = false; $("r-again").focus(); }, 500);
  }

  /* ---------- çizim ---------- */
  let W = 0, H = 0, dpr = 1;
  function resize() { const r = stage.getBoundingClientRect(); dpr = Math.min(2, window.devicePixelRatio || 1); W = r.width; H = r.height; cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr); }
  function geom() {
    const lw = Math.min(110, (W - 20) / 4), x0 = (W - lw * 4) / 2, hitY = H - Math.max(70, H * 0.13);
    return { lw, x0, hitY };
  }
  function draw() {
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, W, H);
    const { lw, x0, hitY } = geom();
    // şeritler
    for (let i = 0; i < 4; i++) {
      const x = x0 + i * lw;
      const g = ctx.createLinearGradient(0, 0, 0, H);
      g.addColorStop(0, "rgba(255,255,255,0)"); g.addColorStop(1, G && G.flash[i] > 0 ? LANES[i].col + "55" : "rgba(255,255,255,.05)");
      ctx.fillStyle = g; ctx.fillRect(x + 2, 0, lw - 4, H);
      ctx.strokeStyle = "rgba(255,255,255,.06)"; ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke();
    }
    ctx.strokeStyle = "rgba(255,255,255,.06)"; ctx.beginPath(); ctx.moveTo(x0 + 4 * lw, 0); ctx.lineTo(x0 + 4 * lw, H); ctx.stroke();
    // vuruş çizgisi ve tuşlar
    ctx.fillStyle = "rgba(255,255,255,.85)"; ctx.fillRect(x0, hitY - 2, lw * 4, 4);
    for (let i = 0; i < 4; i++) {
      const cx = x0 + i * lw + lw / 2, on = G && G.flash[i] > 0;
      ctx.fillStyle = on ? LANES[i].col : "rgba(255,255,255,.1)"; ctx.strokeStyle = LANES[i].col; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.arc(cx, hitY, Math.min(26, lw * 0.3), 0, 7); ctx.fill(); ctx.stroke();
      ctx.fillStyle = on ? "#0D0B1E" : "#fff"; ctx.font = "800 16px Rubik, sans-serif"; ctx.textAlign = "center"; ctx.textBaseline = "middle";
      ctx.fillText(LANES[i].key, cx, hitY + 1);
    }
    if (!G) return;
    const t = now(), speed = (hitY + 30) / G.diff.lead;
    // notalar
    for (const n of G.notes) {
      if (n.hit && n.hit !== "miss") continue;
      const y = hitY - (n.t - t) * speed;
      if (y < -30) break;
      if (y > H + 30) continue;
      const x = x0 + n.lane * lw + 8, w = lw - 16, h = 18;
      ctx.globalAlpha = n.hit === "miss" ? 0.25 : 1;
      ctx.fillStyle = LANES[n.lane].col; ctx.shadowColor = LANES[n.lane].col; ctx.shadowBlur = 12;
      ctx.beginPath(); ctx.roundRect ? ctx.roundRect(x, y - h / 2, w, h, 8) : ctx.rect(x, y - h / 2, w, h); ctx.fill();
      ctx.shadowBlur = 0; ctx.fillStyle = "rgba(255,255,255,.55)"; ctx.fillRect(x + 6, y - h / 2 + 3, w - 12, 3);
      ctx.globalAlpha = 1;
    }
    // kıvılcımlar
    for (const f of G.fx) {
      const k = f.t / f.life;
      ctx.globalAlpha = 1 - k; ctx.fillStyle = LANES[f.lane].col;
      ctx.beginPath(); ctx.arc(x0 + f.lane * lw + lw / 2 + f.x * k, hitY + f.y * k, 3.5, 0, 7); ctx.fill();
    }
    ctx.globalAlpha = 1;
    // üst bilgi
    ctx.textAlign = "left"; ctx.textBaseline = "top"; ctx.fillStyle = "#fff"; ctx.font = "800 22px Rubik, sans-serif";
    ctx.fillText(G.score.toLocaleString("tr-TR"), 12, 10);
    ctx.font = "600 13px Rubik, sans-serif"; ctx.fillStyle = "#9A94C2";
    ctx.fillText(`${G.song.nm} · ${G.diff.nm}`, 12, 38);
    if (G.combo >= 2) {
      ctx.textAlign = "right"; ctx.fillStyle = "#FFD166"; ctx.font = "800 22px Rubik, sans-serif";
      ctx.fillText(`${G.combo} kombo`, W - 12, 10);
      if (mult() > 1) { ctx.font = "800 14px Rubik, sans-serif"; ctx.fillStyle = "#06D6A0"; ctx.fillText(`×${mult()} puan`, W - 12, 38); }
    }
    // ilerleme
    const p = Math.max(0, Math.min(1, t / G.length));
    ctx.fillStyle = "rgba(255,255,255,.1)"; ctx.fillRect(12, 58, W - 24, 4); ctx.fillStyle = "#7B5CFF"; ctx.fillRect(12, 58, (W - 24) * p, 4);
    // değerlendirme yazısı
    if (G.judge && G.judge.t < 0.6) {
      const k = G.judge.t / 0.6;
      ctx.globalAlpha = 1 - k; ctx.textAlign = "center"; ctx.textBaseline = "middle";
      ctx.font = `800 ${Math.round(30 + 8 * (1 - k))}px Rubik, sans-serif`; ctx.fillStyle = G.judge.col;
      ctx.fillText(G.judge.s, W / 2, hitY - 120 - k * 20);
      ctx.globalAlpha = 1;
    }
    // giriş sayımı
    if (t < 0) {
      const beat = 60 / G.song.bpm, k = Math.ceil(-t / beat);
      if (k <= 4) { ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.fillStyle = "#fff"; ctx.font = "800 64px Rubik, sans-serif"; ctx.fillText(k, W / 2, H * 0.4); }
    }
  }

  /* ---------- girdi ---------- */
  document.addEventListener("keydown", (e) => {
    if (e.repeat) return;
    const k = KEYS[e.key.toLowerCase()];
    if (k === undefined || !G || G.over || !$("menu").hidden) return;
    e.preventDefault(); judge(k);
  });
  document.addEventListener("keyup", (e) => { const k = KEYS[e.key.toLowerCase()]; if (k !== undefined && G) G.press[k] = false; });
  cv.addEventListener("pointerdown", (e) => {
    if (!G || G.over) return;
    audio();
    const r = cv.getBoundingClientRect(), { lw, x0 } = geom(), lane = Math.floor((e.clientX - r.left - x0) / lw);
    if (lane >= 0 && lane < 4) judge(lane);
  });

  /* ---------- menü ---------- */
  function renderMenu() {
    $("diffs").innerHTML = DIFFS.map((d, i) => `<button type="button" role="radio" aria-checked="${i === SAVE.diff}" data-i="${i}">${d.nm}</button>`).join("");
    $("diffs").querySelectorAll("button").forEach(b => b.addEventListener("click", () => { SAVE.diff = +b.dataset.i; store(); renderMenu(); }));
    const d = DIFFS[SAVE.diff];
    $("songs").innerHTML = SONGS.map((s, i) => {
      const b = SAVE.best[s.id + "." + d.id], n = build(s, d).notes.length;
      return `<button class="song" type="button" data-i="${i}"><span class="ic" aria-hidden="true">${s.ic}</span><span><b>${s.nm}</b><small>${s.by} · ${n} nota${b ? ` · rekor ${b.score}` : ""}</small></span><span class="best">${b ? b.grade : ""}</span></button>`;
    }).join("");
    $("songs").querySelectorAll(".song").forEach(b => b.addEventListener("click", () => start(+b.dataset.i)));
  }
  $("songs-btn").addEventListener("click", () => { if (G) G.over = true; G = null; renderMenu(); $("result").hidden = true; $("menu").hidden = false; });
  $("r-again").addEventListener("click", () => start(songIdx));
  $("r-menu").addEventListener("click", () => { G = null; renderMenu(); $("result").hidden = true; $("menu").hidden = false; });

  /* ---------- döngü ---------- */
  let last = performance.now();
  function loop(nowMs) {
    const dt = Math.min(0.05, (nowMs - last) / 1000); last = nowMs;
    const sr = stage.getBoundingClientRect();
    if (Math.abs(sr.width - W) > 0.5 || Math.abs(sr.height - H) > 0.5) resize();
    if (G && AC) update(dt);
    draw();
    requestAnimationFrame(loop);
  }
  resize(); renderMenu();
  requestAnimationFrame(loop);

  // test kancası
  window.__ritim = { SONGS, DIFFS, build, get G() { return G; }, start, judge, update, now, WIN, finish };
})();
