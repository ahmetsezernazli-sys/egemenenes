/* Ayna Resim — Egemen için simetri boyama oyunu */
(function(){
  "use strict";

  const SAVE = "ayna-resim", SOUND_KEY = "ayna-resim-ses";
  const RAINBOW = ["#E4483B", "#C98F00", "#2A64C0", "#1E8A41", "#6E36B8"];
  const COLORS = {
    R: { c:"#E5484D", ad:"kırmızı" }, P: { c:"#9B5DE5", ad:"mor" }, Y: { c:"#FFC529", ad:"sarı" }, B: { c:"#2A2540", ad:"siyah" },
    C: { c:"#4DA3FF", ad:"mavi" }, D: { c:"#8A5A2B", ad:"kahverengi" }, G: { c:"#2DB75A", ad:"yeşil" }, S: { c:"#9AA6B6", ad:"gri" },
    K: { c:"#F15BB5", ad:"pembe" }, O: { c:"#FF9F43", ad:"turuncu" }
  };
  // resimlerin sol yarısı; sağ yarı aynadaki görüntüsüdür
  const LEVELS = [
    { ad:"kalp", rows:[".RR.", "RRRR", "RRRR", ".RRR", "..RR", "...R"] },
    { ad:"kelebek", rows:["PP.B", "PYPB", "PPPB", ".PPB", "PYPB", "PP.B"] },
    { ad:"ağaç", rows:["..G", ".GG", "GGG", "GGG", ".GG", "..D", "..D", ".DD"] },
    { ad:"ev", rows:["...R", "..RR", ".RRR", "RRRR", ".YYY", ".YCY", ".YYD", ".YYD"] },
    { ad:"robot", rows:["...Y", "...S", "SSSS", "SCCS", "SCCS", "SSSS", "SRRR", "SSSS"] },
    { ad:"çiçek", rows:[".KK.", "KKKK", "KKKY", "KKKY", ".KKK", "...G", "GG.G", ".GGG", "...G"] },
    { ad:"roket", rows:["..R", ".RR", ".SS", ".SC", ".SS", ".SS", "RSS", "R.S", "..O", "..O"] },
    { ad:"kedi", rows:["O...", "OO..", "OOOO", "OBOO", "OOOK", ".OOO", "..OO"] }
  ];
  const $ = id => document.getElementById(id);
  const rnd = n => Math.floor(Math.random()*n);

  let soundOn = true, best = [];
  try { soundOn = localStorage.getItem(SOUND_KEY) !== "0"; } catch(e) {}
  try { best = JSON.parse(localStorage.getItem(SAVE) || "{}").stars || []; } catch(e) { best = []; }
  const persist = () => { try { localStorage.setItem(SAVE, JSON.stringify({stars:best})); } catch(e) {} };

  document.querySelectorAll("[data-rainbow]").forEach(el => {
    const text = el.textContent.trim(); el.textContent = ""; el.setAttribute("aria-label", text);
    let k = 0;
    for (const ch of text){
      const s = document.createElement("span"); s.textContent = ch; s.setAttribute("aria-hidden", "true");
      if (ch.trim()) s.style.color = RAINBOW[k++ % RAINBOW.length];
      el.appendChild(s);
    }
  });

  /* ---------- ses ---------- */
  let ac = null;
  function audio(){
    if (!ac){ try { ac = new (window.AudioContext || window.webkitAudioContext)(); } catch(e) { ac = null; } }
    if (ac && ac.state === "suspended") ac.resume();
    return ac;
  }
  function tone(freq, dur, type, vol, delay){
    const a = audio(); if (!a || !soundOn) return;
    const n = a.currentTime + (delay || 0), o = a.createOscillator(), g = a.createGain();
    o.type = type || "sine"; o.frequency.setValueAtTime(freq, n);
    g.gain.setValueAtTime(.0001, n); g.gain.exponentialRampToValueAtTime(vol || .1, n + .015); g.gain.exponentialRampToValueAtTime(.0001, n + dur);
    o.connect(g).connect(a.destination); o.start(n); o.stop(n + dur + .05);
  }
  const sfx = {
    ok(){ [659.25, 783.99, 1046.5].forEach((f, i) => tone(f, .16, "triangle", .11, i*.08)); },
    no(){ tone(240, .2, "sine", .1); },
    party(){ [523.25, 659.25, 783.99, 1046.5, 1318.5].forEach((f, i) => tone(f, .3, "triangle", .14, i*.12)); }
  };
  const canSpeak = "speechSynthesis" in window;
  let trVoice = null;
  function pickVoice(){ trVoice = speechSynthesis.getVoices().find(v => /^tr(-|_|$)/i.test(v.lang)) || null; }
  if (canSpeak){ pickVoice(); if (speechSynthesis.addEventListener) speechSynthesis.addEventListener("voiceschanged", pickVoice); }
  function say(text){
    if (!canSpeak || !soundOn || !trVoice) return;
    speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text); u.voice = trVoice; u.lang = trVoice.lang; u.rate = .92; u.pitch = 1.15;
    speechSynthesis.speak(u);
  }
  function renderSound(){
    $("ic-on").hidden = !soundOn; $("ic-off").hidden = soundOn;
    $("sound").setAttribute("aria-label", soundOn ? "Sesi kapat" : "Sesi aç");
    $("sound").setAttribute("aria-pressed", String(soundOn));
  }
  $("sound").addEventListener("click", () => {
    soundOn = !soundOn;
    try { localStorage.setItem(SOUND_KEY, soundOn ? "1" : "0"); } catch(e) {}
    if (!soundOn && canSpeak) speechSynthesis.cancel();
    renderSound();
  });
  renderSound();

  /* ---------- oyun ---------- */
  let level = 0, half = 0, H = 0, want = [], got = [], pal = [], col = null, mistakes = 0, done = false, idleT = null;
  const pic = $("pic");
  function task(t, speak){ $("task").textContent = t; if (speak !== false) say(t); }
  function startLevel(i){
    level = Math.max(0, Math.min(LEVELS.length - 1, i)); mistakes = 0; done = false;
    $("intro").hidden = true; $("done").hidden = true; $("party").hidden = true;
    const L = LEVELS[level]; half = L.rows[0].length; H = L.rows.length;
    // sağ yarı hedefi: satırın tersi
    want = L.rows.map(r => r.split("").reverse());
    got = L.rows.map(() => new Array(half).fill("."));
    pal = [...new Set(L.rows.join("").replace(/\./g, ""))];
    col = pal[0];
    build(); renderPal(); renderDots();
    task(level === 0 ? "Sol taraf hazır. Sağ tarafı aynadaki gibi boya!" : "Aynadaki gibi boya!");
    armIdle();
  }
  function build(){
    const W = half * 2;
    const cs = `min(calc((100vw - ${44 + W * 3}px) / ${W}), calc((100dvh - ${330 + H * 3}px) / ${H}), 58px)`;
    pic.style.setProperty("--cs", cs);
    pic.style.gridTemplateColumns = `repeat(${W}, var(--cs))`;
    pic.classList.remove("win"); pic.textContent = "";
    const L = LEVELS[level];
    for (let r = 0; r < H; r++) for (let c = 0; c < W; c++){
      const b = document.createElement("button"); b.type = "button";
      if (c < half){
        const k = L.rows[r][c]; b.className = "c l" + (k !== "." ? " f" : ""); if (k !== ".") b.style.setProperty("--c", COLORS[k].c);
        b.tabIndex = -1; b.setAttribute("aria-hidden", "true");
      } else {
        const j = c - half; b.className = "c r"; b.dataset.r = r; b.dataset.j = j;
        b.setAttribute("aria-label", `Satır ${r + 1}, sağ ${j + 1}`);
        b.addEventListener("click", () => { audio(); paint(r, j); });
      }
      pic.appendChild(b);
    }
    const m = document.createElement("div"); m.className = "mir"; m.style.left = `calc(10px + ${half} * (var(--cs) + 3px) - 1.5px)`; pic.appendChild(m);
  }
  function cellEl(r, j){ return pic.querySelector(`.c.r[data-r="${r}"][data-j="${j}"]`); }
  function renderPal(){
    const box = $("pal"); box.textContent = "";
    pal.forEach(k => {
      const b = document.createElement("button"); b.type = "button"; b.className = "sw" + (k === col ? " on" : "");
      b.style.setProperty("--c", COLORS[k].c); b.setAttribute("role", "radio"); b.setAttribute("aria-checked", String(k === col)); b.setAttribute("aria-label", COLORS[k].ad);
      b.addEventListener("click", () => { audio(); col = k; renderPal(); say(COLORS[k].ad); tone(500, .06, "triangle", .06); });
      box.appendChild(b);
    });
  }
  function renderDots(){
    const d = $("dots"); d.textContent = "";
    LEVELS.forEach((_, i) => { const e = document.createElement("i"); if (i < level || best[i]) e.className = "on"; d.appendChild(e); });
  }
  function paint(r, j){
    if (done) return false;
    const b = cellEl(r, j);
    if (got[r][j] === col) got[r][j] = "."; else got[r][j] = col;
    const k = got[r][j];
    b.classList.toggle("f", k !== "."); if (k !== ".") b.style.setProperty("--c", COLORS[k].c);
    if (k !== "." && want[r][j] !== k){
      mistakes++; b.classList.remove("no"); void b.offsetWidth; b.classList.add("no"); tone(220, .15, "sine", .08);
      if (want[r][j] === ".") say("Aynada orası boş. Silmek için tekrar dokun.");
      else say(`Aynada orası ${COLORS[want[r][j]].ad}.`);
    } else if (k !== ".") tone(600 + j * 60, .08, "triangle", .08);
    else tone(300, .05, "sine", .05);
    clearHint(); armIdle();
    if (got.every((row, rr) => row.every((v, jj) => v === want[rr][jj]))) win();
    return true;
  }
  function clearHint(){ pic.querySelectorAll(".hint").forEach(e => e.classList.remove("hint")); }
  function armIdle(){
    clearTimeout(idleT);
    idleT = setTimeout(() => {
      if (done) return;
      for (let r = 0; r < H; r++) for (let j = 0; j < half; j++) if (got[r][j] !== want[r][j]){
        cellEl(r, j).classList.add("hint");
        const w = want[r][j]; say(w === "." ? "Parlayan kareyi sil." : `Parlayan kareyi ${COLORS[w].ad} boya.`);
        if (w !== "." && w !== col){ col = w; renderPal(); }
        return;
      }
    }, 9000);
  }
  function win(){
    done = true; clearTimeout(idleT); clearHint();
    pic.classList.add("win"); sfx.ok();
    task(`Harika! Bir ${LEVELS[level].ad}!`);
    setTimeout(finishLevel, 1500);
  }
  function starsNow(){ return mistakes <= 1 ? 3 : mistakes <= 3 ? 2 : 1; }
  function finishLevel(){
    const s = starsNow();
    best[level] = Math.max(best[level] || 0, s); persist(); renderLevels();
    if (level === LEVELS.length - 1){ $("party").hidden = false; sfx.party(); say("Simetri ustası Egemen! Bütün resimleri tamamladın!"); return; }
    [...$("stars").children].forEach((el, i) => { el.className = ""; void el.offsetWidth; if (i < s) el.className = "on"; });
    $("stars").setAttribute("aria-label", s + " yıldız");
    $("done").hidden = false; sfx.party();
  }

  /* ---------- menüler ---------- */
  function renderLevels(){
    const box = $("levels"); box.textContent = "";
    const IC = ["❤️", "🦋", "🌳", "🏠", "🤖", "🌸", "🚀", "🐱"];
    LEVELS.forEach((lv, i) => {
      const b = document.createElement("button");
      b.type = "button"; b.className = "lvl";
      b.setAttribute("aria-label", `Bölüm ${i + 1}, ${lv.ad}${best[i] ? ", " + best[i] + " yıldız" : ""}`);
      b.innerHTML = `<span class="ic" aria-hidden="true">${IC[i]}</span>${i + 1}<small aria-hidden="true">${"★".repeat(best[i] || 0)}</small>`;
      b.addEventListener("click", () => { audio(); startLevel(i); });
      box.appendChild(b);
    });
  }
  function showIntro(){ clearTimeout(idleT); if (canSpeak) speechSynthesis.cancel(); $("intro").hidden = false; $("done").hidden = true; $("party").hidden = true; }
  $("play").addEventListener("click", () => { audio(); const i = LEVELS.findIndex((_, k) => !best[k]); startLevel(i < 0 ? 0 : i); });
  $("next").addEventListener("click", () => { audio(); startLevel(level + 1); });
  $("replay").addEventListener("click", () => { audio(); startLevel(level); });
  $("again").addEventListener("click", () => { audio(); showIntro(); });
  $("menu").addEventListener("click", () => { audio(); showIntro(); });
  document.addEventListener("visibilitychange", () => { if (document.hidden && canSpeak) speechSynthesis.cancel(); });

  renderLevels();
  startLevel(0); clearTimeout(idleT); $("intro").hidden = false; if (canSpeak) speechSynthesis.cancel();

  window.__ar = { LEVELS, startLevel, paint, setCol(k){ col = k; renderPal(); }, get st(){ return { level, want, got, mistakes, done, pal }; } };
})();
