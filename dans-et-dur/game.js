/* Dans Et, Dur! — aile parti oyunu: müzik durunca heykel gibi don */
(() => {
  "use strict";
  const $ = (id) => document.getElementById(id);
  const SAVE_KEY = "dans-et-dur";
  const MOVES = [
    ["🐸", "Kurbağa gibi zıpla"], ["🤖", "Robot dansı yap"], ["🦩", "Tek ayak üstünde dans et"], ["🐍", "Yılan gibi kıvrıl"],
    ["✈️", "Uçak gibi kollarını aç"], ["🐧", "Penguen gibi yürü"], ["🦀", "Yengeç gibi yana yürü"], ["🌀", "Kendi etrafında dön"],
    ["👏", "Alkışla ve zıpla"], ["🐒", "Maymun gibi dans et"], ["🐘", "Kolunu fil hortumu yap"], ["🦋", "Kelebek gibi uç"],
    ["🕺", "Disko dansı yap"], ["🐻", "Ayı gibi yavaş dans et"], ["🐰", "Tavşan gibi zıpla"], ["🎸", "Hayali gitar çal"],
    ["🏃", "Yerinde koş"], ["🙌", "Ellerini havaya kaldır"], ["🐔", "Tavuk gibi kanat çırp"], ["🥁", "Hayali davul çal"]
  ];
  const FREEZE_TX = ["Heykel gibi don!", "Kıpırdama!", "Gülmek yok!", "Nefesini tut… şaka şaka 😉", "Taş kesil!", "Buz gibi don!"];
  const DANCERS = ["💃", "🕺", "🐻", "🐸", "🐧", "🤖"];
  const SPEEDS = [{ min: 8, max: 16, hold: 5 }, { min: 6, max: 12, hold: 4 }, { min: 4, max: 9, hold: 3 }];
  // şarkılar: tempo, kök nota (MIDI), akor dizisi (kökten yarım ses), gam
  const SONGS = [
    { bpm: 118, root: 60, prog: [0, 7, 9, 5], scale: [0, 2, 4, 7, 9] },
    { bpm: 128, root: 62, prog: [0, 5, 7, 5], scale: [0, 2, 4, 7, 9] },
    { bpm: 108, root: 57, prog: [0, 8, 3, 10], scale: [0, 3, 5, 7, 10] },
    { bpm: 136, root: 64, prog: [0, 9, 5, 7], scale: [0, 2, 4, 7, 9] },
    { bpm: 122, root: 55, prog: [0, 5, 0, 7], scale: [0, 2, 4, 5, 7, 9] }
  ];

  /* ---------- müzik ---------- */
  let AC = null, master = null, schedT = null, nextNote = 0, step = 0, song = null, melody = [];
  function audio() {
    try {
      if (!AC) { AC = new (window.AudioContext || window.webkitAudioContext)(); master = AC.createGain(); master.gain.value = 0; master.connect(AC.destination); }
      if (AC.state === "suspended") AC.resume();
    } catch (e) { AC = null; }
  }
  const mtof = (m) => 440 * Math.pow(2, (m - 69) / 12);
  function note(freq, t, dur, type, vol) {
    const o = AC.createOscillator(), g = AC.createGain();
    o.type = type; o.frequency.setValueAtTime(freq, t);
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + 0.01); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g).connect(master); o.start(t); o.stop(t + dur + 0.05);
  }
  let noiseBuf = null;
  function noise(t, dur, type, freq, vol) {
    if (!noiseBuf) { const n = AC.sampleRate; noiseBuf = AC.createBuffer(1, n, n); const d = noiseBuf.getChannelData(0); for (let i = 0; i < n; i++) d[i] = Math.random() * 2 - 1; }
    const s = AC.createBufferSource(); s.buffer = noiseBuf;
    const f = AC.createBiquadFilter(); f.type = type; f.frequency.value = freq;
    const g = AC.createGain(); g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    s.connect(f).connect(g).connect(master); s.start(t); s.stop(t + dur + 0.02);
  }
  function kick(t) {
    const o = AC.createOscillator(), g = AC.createGain();
    o.frequency.setValueAtTime(150, t); o.frequency.exponentialRampToValueAtTime(45, t + 0.15);
    g.gain.setValueAtTime(0.5, t); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.22);
    o.connect(g).connect(master); o.start(t); o.stop(t + 0.25);
  }
  function makeMelody() {
    // 4 ölçü × 8 sekizlik: gamdan basamak basamak gezinen ezgi (-1 = sus)
    const out = []; let deg = 2;
    for (let i = 0; i < 32; i++) {
      if (Math.random() < 0.22) { out.push(-1); continue; }
      deg = Math.max(0, Math.min(song.scale.length * 2 - 1, deg + [-2, -1, -1, 0, 1, 1, 2][Math.floor(Math.random() * 7)]));
      out.push(deg);
    }
    return out;
  }
  function schedule() {
    const spb = 60 / song.bpm / 2;  // sekizlik
    while (nextNote < AC.currentTime + 0.12) {
      const t = nextNote, s = step % 32, bar = Math.floor(s / 8), chord = song.root + song.prog[bar];
      if (s % 4 === 0) kick(t);
      if (s % 8 === 4) noise(t, 0.16, "bandpass", 1800, 0.35);
      noise(t, 0.04, "highpass", 7000, s % 2 ? 0.08 : 0.14);
      if (s % 2 === 0) note(mtof(chord - 24 + (s % 4 === 2 ? 7 : 0)), t, spb * 1.8, "triangle", 0.22);
      if (s % 4 === 2) [0, 4, 7].forEach(iv => note(mtof(chord + iv + (song.scale.includes(3) && iv === 4 ? -1 : 0)), t, spb * 0.9, "square", 0.025));
      const m = melody[s];
      if (m >= 0) { const sc = song.scale, oct = Math.floor(m / sc.length); note(mtof(song.root + 12 + sc[m % sc.length] + 12 * oct), t, spb * 0.9, "square", 0.045); }
      nextNote += spb; step++;
      if (step % 64 === 0) melody = makeMelody();
    }
  }
  function musicStart() {
    if (!AC) return;
    song = SONGS[Math.floor(Math.random() * SONGS.length)]; melody = makeMelody(); step = 0;
    nextNote = AC.currentTime + 0.05;
    master.gain.cancelScheduledValues(AC.currentTime); master.gain.setValueAtTime(0.0001, AC.currentTime); master.gain.exponentialRampToValueAtTime(0.7, AC.currentTime + 0.3);
    clearInterval(schedT); schedT = setInterval(schedule, 25); schedule();
  }
  function musicStop(hard) {
    clearInterval(schedT); schedT = null;
    if (!AC) return;
    master.gain.cancelScheduledValues(AC.currentTime);
    master.gain.setValueAtTime(master.gain.value, AC.currentTime);
    master.gain.linearRampToValueAtTime(0, AC.currentTime + (hard ? 0.03 : 0.4));
  }
  function sting(freqs, type) { if (!AC) return; const g = AC.createGain(); g.gain.value = 0.15; g.connect(AC.destination); freqs.forEach((f, i) => { const o = AC.createOscillator(), e = AC.createGain(), t = AC.currentTime + i * 0.12; o.type = type || "triangle"; o.frequency.value = f; e.gain.setValueAtTime(0.0001, t); e.gain.exponentialRampToValueAtTime(1, t + 0.01); e.gain.exponentialRampToValueAtTime(0.0001, t + 0.3); o.connect(e).connect(g); o.start(t); o.stop(t + 0.35); }); }

  const canSpeak = "speechSynthesis" in window;
  let trVoice = null;
  function pickVoice() { if (canSpeak) trVoice = speechSynthesis.getVoices().find(v => /^tr(-|_|$)/i.test(v.lang)) || null; }
  if (canSpeak) { pickVoice(); if (speechSynthesis.addEventListener) speechSynthesis.addEventListener("voiceschanged", pickVoice); }
  function say(t) { if (!canSpeak || !trVoice) return; speechSynthesis.cancel(); const u = new SpeechSynthesisUtterance(t); u.voice = trVoice; u.lang = trVoice.lang; u.rate = 1.05; u.pitch = 1.2; speechSynthesis.speak(u); }

  /* ---------- oyun ---------- */
  let CFG = { mode: "fun", speed: 1, names: ["Enes", "Egemen", "Anne", "Baba", "", "", "", ""] };
  try { const s = JSON.parse(localStorage.getItem(SAVE_KEY) || "null"); if (s) CFG = Object.assign(CFG, s); } catch (e) {}
  let st = "idle", players = [], outStack = [], timer = null, tick = null, paused = false, lastMove = -1, round = 0;

  function clearAll() { clearTimeout(timer); clearInterval(tick); }
  function startGame() {
    clearAll();
    players = CFG.mode === "out" ? CFG.names.map(n => n.trim()).filter(Boolean).map(n => ({ n, out: false })) : [];
    round = 0; paused = false;
    $("setup").hidden = true; $("over").hidden = true;
    dance();
  }
  function dance() {
    clearAll(); st = "dance"; round++;
    let mi; do { mi = Math.floor(Math.random() * MOVES.length); } while (mi === lastMove);
    lastMove = mi;
    const [e, tx] = MOVES[mi], sp = SPEEDS[CFG.speed];
    $("floor").className = "floor dancing";
    const d = DANCERS[Math.floor(Math.random() * DANCERS.length)];
    $("view").innerHTML = `<div class="meter" aria-hidden="true"><i></i><i></i><i></i><i></i></div><span class="dancer" aria-hidden="true">${d}</span><p class="big">Dans et!</p><div class="card"><span class="e" aria-hidden="true">${e}</span>${tx}</div>`;
    renderPlayers(); controls();
    say(`Dans et! ${tx}!`);
    setTimeout(musicStart, canSpeak && trVoice ? 900 : 0);
    const dur = (sp.min + Math.random() * (sp.max - sp.min)) * 1000;
    timer = setTimeout(freeze, dur + (canSpeak && trVoice ? 900 : 0));
  }
  function freeze() {
    clearAll(); st = "freeze";
    musicStop(true);
    $("floor").className = "floor freeze";
    let left = SPEEDS[CFG.speed].hold;
    const sub = FREEZE_TX[Math.floor(Math.random() * FREEZE_TX.length)];
    const show = () => { $("view").innerHTML = `<p class="big">DUR! ✋</p><p class="sub">${sub}</p><p class="count" aria-hidden="true">${left}</p>`; };
    show(); controls(); say("Dur!");
    tick = setInterval(() => {
      if (paused) return;
      left--;
      if (left > 0) { show(); return; }
      clearInterval(tick);
      if (CFG.mode === "out") judge();
      else { sting([523, 659, 784]); timer = setTimeout(dance, 900); $("view").innerHTML = `<p class="big">Harika! 👏</p><p class="sub">Herkes çok iyi dondu.</p>`; }
    }, 1000);
  }
  function judge() {
    st = "judge"; outStack = [];
    $("floor").className = "floor";
    $("view").innerHTML = `<p class="big" style="font-size:clamp(2rem,8vw,3.6rem)">Kim kıpırdadı?</p><p class="sub">Kıpırdayanın adına dokun, sonra “Devam” de. Kimse kıpırdamadıysa direkt devam.</p>`;
    say("Kim kıpırdadı?");
    renderPlayers(true); controls();
  }
  function cont() {
    const alive = players.filter(p => !p.out);
    if (CFG.mode === "out" && alive.length <= 1) return finish(alive[0]);
    sting([659, 784]);
    dance();
  }
  function finish(w) {
    clearAll(); st = "over"; musicStop(false);
    $("floor").className = "floor";
    sting([523, 659, 784, 1047, 1319]);
    $("over-title").textContent = w ? `${w.n} kazandı! 🎉` : "Herkes elendi!";
    $("over-tx").textContent = w ? `${round} tur boyunca hiç kıpırdamadan dondu. Tam bir heykel!` : "Bir dahaki sefere daha sıkı donun!";
    say(w ? `${w.n} kazandı!` : "Herkes elendi!");
    $("over").hidden = false; renderPlayers(); controls();
  }
  function togglePause() {
    paused = !paused;
    if (st === "dance") {
      if (paused) { clearTimeout(timer); musicStop(false); $("floor").classList.add("paused"); $("floor").classList.remove("dancing"); }
      else { $("floor").classList.remove("paused"); $("floor").classList.add("dancing"); musicStart(); timer = setTimeout(freeze, 3000 + Math.random() * 6000); }
    }
    controls();
  }

  /* ---------- arayüz ---------- */
  function renderPlayers(pick) {
    const box = $("players"); box.textContent = "";
    for (const p of players) {
      const b = document.createElement(pick && !p.out ? "button" : "span");
      b.className = "chip" + (p.out ? " out" : "") + (pick && !p.out ? " pickable" : "");
      b.textContent = (p.out ? "🪦 " : "🕺 ") + p.n;
      if (pick && !p.out) { b.type = "button"; b.setAttribute("aria-label", `${p.n} kıpırdadı, ele`); b.addEventListener("click", () => { p.out = true; outStack.push(p); sting([392, 294], "sine"); say(`${p.n} elendi`); renderPlayers(true); }); }
      box.appendChild(b);
    }
    if (pick && players.some(p => p.out)) {
      const u = document.createElement("button"); u.type = "button"; u.className = "chip"; u.textContent = "↩ Geri al";
      u.addEventListener("click", () => { const last = outStack.pop(); if (last) last.out = false; renderPlayers(true); });
      box.appendChild(u);
    }
  }
  function controls() {
    const c = $("controls"); c.textContent = "";
    const add = (tx, cls, fn) => { const b = document.createElement("button"); b.type = "button"; b.className = "btn " + (cls || ""); b.textContent = tx; b.addEventListener("click", () => { audio(); fn(); }); c.appendChild(b); return b; };
    if (st === "idle" || st === "over") add("▶ Başla", "primary", startGame);
    else if (st === "dance") add(paused ? "▶ Devam" : "⏸ Duraklat", "", togglePause);
    else if (st === "freeze") add(paused ? "▶ Devam" : "⏸ Duraklat", "", () => { paused = !paused; controls(); });
    else if (st === "judge") add("Devam ▶", "primary", cont);
    if (st !== "idle" && st !== "over") add("⏹ Bitir", "", () => { clearAll(); musicStop(false); st = "idle"; $("floor").className = "floor"; $("view").innerHTML = idleView(); controls(); });
  }
  const idleView = () => `<span class="dancer" aria-hidden="true">💃</span><p class="big">Hazır mısınız?</p><p class="sub">Sesi açın, “Başla”ya basın. Müzik durunca heykel gibi donun!</p>`;

  /* ---------- ayarlar ---------- */
  const form = $("setup-form");
  function buildNames() {
    const box = $("names"); box.textContent = "";
    CFG.names.forEach((n, i) => { const inp = document.createElement("input"); inp.type = "text"; inp.maxLength = 12; inp.value = n; inp.placeholder = `Dansçı ${i + 1}`; inp.setAttribute("aria-label", `${i + 1}. dansçının adı`); box.appendChild(inp); });
  }
  function syncMode() {
    const out = form.mode.value === "out";
    $("f-names").hidden = !out;
    $("mode-help").innerHTML = out ? "<b>Eleme:</b> müzik durunca kıpırdayanı seçin, o elenir. <b>Son kalan</b> kazanır." : "<b>Eğlence:</b> kimse elenmez, istediğiniz kadar dans edin.";
  }
  form.mode.value = CFG.mode; form.speed.value = String(CFG.speed); buildNames(); syncMode();
  form.addEventListener("change", (e) => { if (e.target.name === "mode") syncMode(); });
  form.addEventListener("submit", (e) => {
    e.preventDefault(); audio(); pickVoice();
    CFG = { mode: form.mode.value, speed: +form.speed.value, names: [...$("names").querySelectorAll("input")].map(i => i.value.trim()) };
    if (CFG.mode === "out" && CFG.names.filter(Boolean).length < 2) { $("mode-help").innerHTML = "<b>Eleme için en az 2 dansçı adı yazın.</b>"; return; }
    try { localStorage.setItem(SAVE_KEY, JSON.stringify(CFG)); } catch (_) {}
    startGame();
  });
  $("settings").addEventListener("click", () => { clearAll(); musicStop(false); paused = false; st = "idle"; $("floor").className = "floor"; $("view").innerHTML = idleView(); controls(); $("over").hidden = true; $("setup").hidden = false; });
  $("again").addEventListener("click", () => { audio(); startGame(); });
  $("to-setup").addEventListener("click", () => { $("over").hidden = true; $("setup").hidden = false; });
  document.addEventListener("visibilitychange", () => { if (document.hidden && st === "dance" && !paused) togglePause(); });
  $("view").innerHTML = idleView(); controls();

  // test kancası
  window.__dd = { get st() { return st; }, get players() { return players; }, freeze, judge, cont, dance, startGame, setCFG: (c) => { CFG = Object.assign(CFG, c); }, MOVES };
})();
