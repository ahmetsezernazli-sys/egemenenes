/* Dondurmacı — Egemen için dondurma dükkanı */
(function(){
  "use strict";

  const SAVE = "dondurmaci", SOUND_KEY = "dondurmaci-ses";
  const RAINBOW = ["#E4483B", "#C98F00", "#2A64C0", "#1E8A41", "#6E36B8"];
  const FLAV = {
    cilek: { c:"#FF8FB1", d:"#E0607F", ad:"çilekli" }, cikolata: { c:"#8B5A3C", d:"#64401F", ad:"çikolatalı" },
    vanilya: { c:"#FFF1C9", d:"#E8CF8E", ad:"vanilyalı" }, fistik: { c:"#9BD770", d:"#6FB040", ad:"fıstıklı" },
    bogurtlen: { c:"#B07CF0", d:"#8150C8", ad:"böğürtlenli" }
  };
  const FKEYS = Object.keys(FLAV);
  const TOPS = { visne:"vişne", seker:"renkli şeker", sos:"çikolata sos" };
  const CONT = { kulah:"külahta", kase:"kasede" };
  const ANIMALS = ["🐻", "🐰", "🐱", "🐶", "🐼", "🐸", "🦊", "🐨", "🐯", "🐷", "🐵", "🐧"];
  const LEVELS = [
    { cont:["kulah"], n:[1, 1], top:0, fl:3 },
    { cont:["kulah", "kase"], n:[1, 1], top:0, fl:4 },
    { cont:["kulah", "kase"], n:[2, 2], top:0, fl:4 },
    { cont:["kulah", "kase"], n:[2, 2], top:1, fl:5 },
    { cont:["kulah", "kase"], n:[3, 3], top:0, fl:5 },
    { cont:["kulah", "kase"], n:[2, 3], top:1, fl:5 }
  ];
  const PER = 4;
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

  /* ---------- dondurma çizimi (SVG) ---------- */
  function scoop(cx, cy, f){
    const F = FLAV[f];
    return `<g><path d="M${cx - 24} ${cy + 6} q0 -30 24 -30 q24 0 24 30 q-4 6 -8 2 q-4 6 -8 0 q-4 7 -8 1 q-4 6 -8 0 q-4 6 -8 0 q-4 4 -8 -3 z" fill="${F.c}" stroke="${F.d}" stroke-width="2"/>
      <ellipse cx="${cx - 9}" cy="${cy - 12}" rx="6" ry="4" fill="rgba(255,255,255,.55)"/></g>`;
  }
  function icSVG(o, opts){
    opts = opts || {};
    let s = "";
    if (o.c === "kulah") s += `<path d="M28 100 L72 100 L50 148 Z" fill="#E0A458" stroke="#B9813A" stroke-width="2"/><path d="M34 106 L62 134 M44 102 L66 124 M54 102 L68 116 M66 106 L38 134 M56 102 L34 124 M46 102 L32 116" stroke="#C98F4A" stroke-width="2"/>`;
    else if (o.c === "kase") s += `<path d="M20 98 L80 98 Q78 132 50 134 Q22 132 20 98 Z" fill="#7FD1FF" stroke="#3D9AD6" stroke-width="2"/><rect x="36" y="134" width="28" height="7" rx="3" fill="#3D9AD6"/><path d="M26 108 Q50 116 74 108" stroke="#fff" stroke-width="3" fill="none" opacity=".6"/>`;
    const base = o.c === "kase" ? 98 : 100;
    (o.s || []).forEach((f, k) => { s += scoop(50, base - 6 - k * 26, f).replace("<g>", `<g class="${opts.popLast && k === o.s.length - 1 ? "pop" : ""}" style="transform-origin:50px ${base - 20 - k * 26}px">`); });
    const topY = base - 6 - Math.max(0, (o.s || []).length - 1) * 26 - 24;
    if (o.t === "visne") s += `<g class="${opts.popTop ? "pop" : ""}"><path d="M50 ${topY - 8} q4 -12 12 -16" stroke="#3B7A2A" stroke-width="3" fill="none"/><circle cx="50" cy="${topY - 2}" r="8" fill="#E5484D"/><circle cx="47" cy="${topY - 5}" r="2.5" fill="#fff" opacity=".7"/></g>`;
    if (o.t === "seker") { const cs = ["#E5484D", "#FFC529", "#2DB75A", "#3D8BFD", "#fff"]; let g = ""; for (let i = 0; i < 12; i++){ const x = 32 + (i * 37) % 36, y = topY + 4 + (i * 13) % 14; g += `<rect x="${x}" y="${y}" width="6" height="2.5" rx="1.2" fill="${cs[i % 5]}" transform="rotate(${(i * 47) % 180} ${x + 3} ${y + 1})"/>`; } s += `<g class="${opts.popTop ? "pop" : ""}">${g}</g>`; }
    if (o.t === "sos") s += `<path class="${opts.popTop ? "pop" : ""}" d="M30 ${topY + 8} q20 -14 40 0 q-2 10 -5 4 q-3 12 -7 2 q-4 10 -8 1 q-4 12 -8 0 q-4 8 -7 1 q-3 6 -5 -8 z" fill="#5A3218"/>`;
    return `<svg viewBox="0 ${opts.vb || 0} 100 ${150 - (opts.vb || 0)}" aria-hidden="true">${s}</svg>`;
  }

  /* ---------- oyun ---------- */
  let level = 0, q = 0, mistakes = 0, order = null, build = null, busy = false, idleT = null, happy = 0, lastAni = "";
  function task(t, speak){ $("task").textContent = t; if (speak !== false) say(t); }
  function startLevel(i){
    level = Math.max(0, Math.min(LEVELS.length - 1, i)); q = 0; mistakes = 0;
    $("intro").hidden = true; $("done").hidden = true; $("party").hidden = true;
    renderPal(); nextCustomer();
  }
  function nextCustomer(){
    const L = LEVELS[level];
    const n = L.n[0] + rnd(L.n[1] - L.n[0] + 1), fl = FKEYS.slice(0, L.fl);
    const s = []; for (let k = 0; k < n; k++){ let f; do f = fl[rnd(fl.length)]; while (n > 1 && f === s[k - 1]); s.push(f); }
    order = { c: L.cont[rnd(L.cont.length)], s, t: L.top ? Object.keys(TOPS)[rnd(3)] : null };
    build = { c: null, s: [], t: null };
    let a; do a = ANIMALS[rnd(ANIMALS.length)]; while (a === lastAni); lastAni = a;
    const ani = $("ani"); ani.textContent = a; ani.className = "ani"; void ani.offsetWidth; ani.classList.add("in");
    const topY = 100 - 6 - (order.s.length - 1) * 26 - 24; $("bub").innerHTML = icSVG(order, { vb: Math.min(30, topY - 28) });
    renderBuild(); renderDots(); busy = false;
    setTimeout(() => task(orderText(order)), 500);
    armIdle();
  }
  function orderText(o){
    let t = `Merhaba! ${CONT[o.c][0].toLocaleUpperCase("tr-TR") + CONT[o.c].slice(1)} `;
    if (o.s.length === 1) t += `${FLAV[o.s[0]].ad} dondurma istiyorum.`;
    else if (o.s.length === 2) t += `altta ${FLAV[o.s[0]].ad}, üstte ${FLAV[o.s[1]].ad} istiyorum.`;
    else t += `altta ${FLAV[o.s[0]].ad}, ortada ${FLAV[o.s[1]].ad}, üstte ${FLAV[o.s[2]].ad} istiyorum.`;
    if (o.t) t += ` Üstüne ${TOPS[o.t]}!`;
    return t;
  }
  function renderBuild(opts){ $("build").innerHTML = build.c || build.s.length ? icSVG(build, Object.assign({ vb: -30 }, opts || {})) : `<svg viewBox="0 -30 100 180"><text x="50" y="100" text-anchor="middle" font-size="16" fill="#C9A27A" font-weight="800">?</text></svg>`; }
  function renderDots(){
    const d = $("dots"); d.textContent = "";
    for (let i = 0; i < PER; i++){ const e = document.createElement("i"); if (i < q) e.className = "on"; d.appendChild(e); }
  }
  function btn(html, label, fn, cls){
    const b = document.createElement("button"); b.type = "button"; b.className = "pb" + (cls ? " " + cls : ""); b.innerHTML = html; b.setAttribute("aria-label", label);
    b.addEventListener("click", () => { audio(); fn(); }); return b;
  }
  function renderPal(){
    const L = LEVELS[level], p = $("pal"); p.textContent = "";
    const r1 = document.createElement("div"); r1.className = "prow";
    for (const c of L.cont) { const b = btn(icSVG({ c }, { vb: 90 }), c === "kulah" ? "Külah" : "Kase", () => pick("c", c)); b.dataset.k = "c:" + c; r1.appendChild(b); }
    const r2 = document.createElement("div"); r2.className = "prow";
    for (const f of FKEYS.slice(0, L.fl)) { const b = btn(`<svg viewBox="20 64 60 44">${scoop(50, 94, f)}</svg>`, FLAV[f].ad, () => pick("s", f)); b.dataset.k = "s:" + f; r2.appendChild(b); }
    const r3 = document.createElement("div"); r3.className = "prow";
    if (L.top) for (const t of Object.keys(TOPS)) { const b = btn(icSVG({ c: null, s: ["vanilya"], t }, { vb: 40 }), TOPS[t], () => pick("t", t)); b.dataset.k = "t:" + t; r3.appendChild(b); }
    r3.appendChild(btn("↶ Geri", "Son ekleneni geri al", undo, "act"));
    r3.appendChild(btn("✓ Ver", "Dondurmayı müşteriye ver", give, "act give"));
    p.append(r1, r2, r3);
  }
  function pick(kind, v){
    if (busy) return;
    if (kind === "c"){ if (build.c){ say("Kap zaten seçildi. Değiştirmek için geri al."); return; } build.c = v; tone(500, .08, "triangle", .08); renderBuild(); }
    else if (kind === "s"){
      if (!build.c){ say("Önce külah ya da kase seç."); hintNext(); return; }
      if (build.t){ say("Süslemenin üstüne top konmaz. Geri alabilirsin."); return; }
      if (build.s.length >= 4){ say("Daha fazla sığmaz!"); return; }
      build.s.push(v); tone(600 + build.s.length * 80, .1, "triangle", .08); say(FLAV[v].ad); renderBuild({ popLast: true });
    } else {
      if (!build.s.length){ say("Önce dondurma topu koy."); return; }
      if (build.t){ say("Bir süsleme yeter!"); return; }
      build.t = v; tone(900, .1, "square", .05); say(TOPS[v]); renderBuild({ popTop: true });
    }
    armIdle();
  }
  function undo(){
    if (busy) return;
    if (build.t) build.t = null; else if (build.s.length) build.s.pop(); else build.c = null;
    tone(300, .08, "sine", .06); renderBuild(); armIdle();
  }
  function diff(){
    const o = order, b = build;
    if (b.c !== o.c) return b.c ? `Ben ${CONT[o.c]} istemiştim!` : "Külah ya da kase seçmedin!";
    if (b.s.length < o.s.length) return `${o.s.length} top istemiştim, ${o.s.length - b.s.length} top eksik!`;
    if (b.s.length > o.s.length) return `Bu çok fazla! ${o.s.length} top istemiştim.`;
    const pos = o.s.length === 1 ? [""] : o.s.length === 2 ? ["Alttaki", "Üstteki"] : ["Alttaki", "Ortadaki", "Üstteki"];
    for (let k = 0; k < o.s.length; k++) if (b.s[k] !== o.s[k]) return `${pos[k] ? pos[k] + " top" : "Top"} ${FLAV[o.s[k]].ad} olmalıydı.`;
    if (b.t !== o.t) return o.t ? (b.t ? `Üstüne ${TOPS[o.t]} istemiştim.` : `Üstüne ${TOPS[o.t]} unuttun!`) : "Ben süsleme istememiştim.";
    return null;
  }
  function give(){
    if (busy) return;
    const d = diff(), ani = $("ani");
    if (d){ mistakes++; ani.className = "ani"; void ani.offsetWidth; ani.classList.add("hmm"); tone(220, .2, "sine", .1); task(`Hmm… ${d}`); armIdle(); return; }
    busy = true; clearTimeout(idleT); happy++; q++;
    ani.className = "ani"; void ani.offsetWidth; ani.classList.add("happy"); sfx.ok();
    task(["Çok teşekkürler! Nefis!", "Harika, tam istediğim gibi!", "Mmm, çok lezzetli!", "Teşekkürler dondurmacı!"][rnd(4)]);
    renderDots(); $("coins").textContent = `😊 ${happy}`;
    setTimeout(() => { if (q >= PER) finishLevel(); else nextCustomer(); }, 2000);
  }
  function hintNext(){
    clearHints();
    const o = order, b = build; let k = null;
    if (b.c !== o.c) k = b.c ? null : "c:" + o.c;
    else { const i = b.s.findIndex((f, j) => f !== o.s[j]); if (i < 0 && b.s.length < o.s.length) k = "s:" + o.s[b.s.length]; else if (i < 0 && b.s.length === o.s.length && o.t && !b.t) k = "t:" + o.t; }
    if (k){ const el = $("pal").querySelector(`[data-k="${k}"]`); if (el) el.classList.add("hint"); }
    else { const g = $("pal").querySelector(diff() ? ".act:not(.give)" : ".give"); if (g) g.classList.add("hint"); }
  }
  function clearHints(){ $("pal").querySelectorAll(".hint").forEach(e => e.classList.remove("hint")); }
  function armIdle(){ clearTimeout(idleT); clearHints(); idleT = setTimeout(() => { if (!busy){ hintNext(); say("Parlayan düğmeye dokun."); } }, 11000); }
  function starsNow(){ return mistakes <= 1 ? 3 : mistakes <= 3 ? 2 : 1; }
  function finishLevel(){
    const s = starsNow();
    best[level] = Math.max(best[level] || 0, s); persist(); renderLevels();
    if (level === LEVELS.length - 1){ $("party").hidden = false; sfx.party(); say("Süper dondurmacı Egemen! Bütün müşteriler çok mutlu!"); return; }
    [...$("stars").children].forEach((el, i) => { el.className = ""; void el.offsetWidth; if (i < s) el.className = "on"; });
    $("stars").setAttribute("aria-label", s + " yıldız");
    $("done").hidden = false; sfx.party(); say("Bölüm bitti, aferin!");
  }

  /* ---------- menüler ---------- */
  function renderLevels(){
    const box = $("levels"); box.textContent = "";
    const IC = ["🍦", "🍨", "🍦", "🍒", "🍨", "⭐"];
    LEVELS.forEach((lv, i) => {
      const b = document.createElement("button");
      b.type = "button"; b.className = "lvl";
      b.setAttribute("aria-label", `Bölüm ${i + 1}${best[i] ? ", " + best[i] + " yıldız" : ""}`);
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

  const coins = document.createElement("span"); coins.className = "coins"; coins.id = "coins"; coins.textContent = "😊 0"; document.querySelector(".shop").appendChild(coins);
  renderLevels();
  startLevel(0); clearTimeout(idleT); $("intro").hidden = false; if (canSpeak) speechSynthesis.cancel();

  window.__dd = { startLevel, pick, undo, give, diff, get st(){ return { level, q, mistakes, order, build, busy }; } };
})();
