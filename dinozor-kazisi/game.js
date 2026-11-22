/* Dinozor Kazısı — Egemen için kazı, birleştirme ve canlandırma oyunu */
(function(){
  "use strict";

  const SAVE = "dinozor-kazisi", SOUND_KEY = "dinozor-kazisi-ses";
  const RAINBOW = ["#E4483B", "#C98F00", "#2A64C0", "#1E8A41", "#6E36B8"];
  const E = (cx, cy, rx, ry) => `M${cx - rx} ${cy} A${rx} ${ry} 0 1 0 ${cx + rx} ${cy} A${rx} ${ry} 0 1 0 ${cx - rx} ${cy} Z`;
  // her dinozor 420×250 kutusunda sağa bakar; parçalar mutlak koordinatlı
  const DINOS = [
    { ad:"Tiranozor", skin:"#6FAE4A", dark:"#3F7A25", belly:"#C9E2A0", eye:[300, 58], mouth:"M300 86 L340 84",
      fact:"Kocaman dişleri vardı ve çok güçlüydü. Ama kolları minicikti!", teeth:"M306 86 L310 94 L314 86 Z M318 86 L322 94 L326 86 Z M330 85 L334 93 L338 85 Z",
      parts:[
        { id:"kuyruk", ad:"kuyruk", d:"M20 112 C70 96 120 98 160 104 L162 136 C118 134 70 128 22 124 Z", wag:1 },
        { id:"bacak", ad:"bacaklar", d:"M176 146 L204 146 L214 196 L234 224 L234 234 L198 234 L196 222 L186 200 Z M216 150 L236 150 L244 192 L258 222 L258 232 L230 232 L230 222 L222 196 Z" },
        { id:"govde", ad:"gövde", d:E(200, 122, 58, 40), body:1 },
        { id:"boyun", ad:"boyun", d:"M236 102 L262 70 L286 84 L258 118 Z" },
        { id:"kol", ad:"kollar", d:"M244 136 L262 144 L272 156 L264 160 L254 150 L240 146 Z" },
        { id:"kafa", ad:"kafatası", d:"M258 44 C290 34 330 38 350 52 C358 58 356 72 348 78 L344 92 L320 90 L314 100 L298 96 L292 104 L268 96 C254 84 250 60 258 44 Z", head:1 }
      ]},
    { ad:"Brakiyozor", skin:"#6FA8DC", dark:"#3A6EA5", belly:"#C7DFF5", eye:[328, 14], mouth:"M318 26 L340 24",
      fact:"Upuzun boynuyla ağaçların en tepesindeki yaprakları yerdi.",
      parts:[
        { id:"kuyruk", ad:"kuyruk", d:"M150 150 C100 160 60 178 22 204 L30 212 C72 190 110 176 152 172 Z", wag:1 },
        { id:"bacak", ad:"bacaklar", d:"M160 176 L182 176 L184 236 L162 236 Z M190 180 L210 180 L210 236 L190 236 Z M236 176 L256 176 L258 236 L236 236 Z M260 170 L280 168 L284 236 L262 236 Z" },
        { id:"govde", ad:"gövde", d:E(210, 150, 72, 44), body:1 },
        { id:"boyun", ad:"boyun", d:"M246 122 C268 86 286 50 296 22 L316 28 C308 60 292 100 274 142 Z" },
        { id:"kafa", ad:"kafatası", d:"M292 14 C304 2 330 0 344 10 C352 16 350 28 340 30 L300 32 C292 28 288 20 292 14 Z", head:1 }
      ]},
    { ad:"Triseratops", skin:"#E59A3C", dark:"#A8641A", belly:"#F6D3A2", eye:[322, 116], mouth:"M338 132 L356 126",
      fact:"Başında üç boynuz ve kocaman bir yaka vardı. Ot yerdi.",
      parts:[
        { id:"kuyruk", ad:"kuyruk", d:"M126 136 C86 140 54 150 22 168 L28 176 C62 162 94 156 128 158 Z", wag:1 },
        { id:"bacak", ad:"bacaklar", d:"M140 168 L162 168 L164 232 L140 232 Z M170 172 L190 172 L190 232 L170 232 Z M214 172 L234 172 L236 232 L214 232 Z M238 166 L258 164 L262 232 L240 232 Z" },
        { id:"govde", ad:"gövde", d:E(190, 140, 72, 44), body:1 },
        { id:"kafa", ad:"kafatası ve yakası", d:"M252 92 C262 64 292 58 304 78 C316 92 328 104 350 112 L366 120 L352 130 L332 136 L312 150 L284 150 C262 140 248 118 252 92 Z", head:1 },
        { id:"boynuz", ad:"boynuzlar", d:"M318 98 L362 70 L328 106 Z M300 92 L340 60 L312 100 Z M352 116 L380 104 L358 126 Z" }
      ]},
    { ad:"Stegozor", skin:"#8E6BBF", dark:"#5B3E8A", belly:"#D9C9EE", eye:[316, 156], mouth:"M314 168 L332 166",
      fact:"Sırtında büyük plakalar, kuyruğunda sivri dikenler vardı.",
      parts:[
        { id:"kuyruk", ad:"dikenli kuyruk", d:"M128 156 C88 160 56 168 24 182 L28 190 C60 180 92 176 130 176 Z M40 178 L28 154 L50 176 Z M60 172 L52 148 L68 170 Z", wag:1 },
        { id:"bacak", ad:"bacaklar", d:"M146 176 L168 176 L168 232 L146 232 Z M176 180 L196 180 L196 232 L176 232 Z M214 180 L234 180 L234 232 L214 232 Z M240 174 L260 174 L262 232 L240 232 Z" },
        { id:"govde", ad:"gövde", d:E(200, 154, 78, 40), body:1 },
        { id:"plaka", ad:"sırt plakaları", d:"M140 130 L156 96 L174 124 Z M170 120 L190 80 L208 116 Z M206 116 L228 78 L244 118 Z M242 124 L260 92 L272 130 Z" },
        { id:"kafa", ad:"kafatası", d:"M268 160 C282 144 312 144 332 156 C338 160 336 170 328 172 L282 176 C270 174 264 168 268 160 Z", head:1 }
      ]},
    { ad:"Pteranodon", skin:"#E57373", dark:"#A93C3C", belly:"#F7C6C6", eye:[256, 100], mouth:"M272 108 L318 104",
      fact:"Dinozorların kuzeniydi ve kocaman kanatlarıyla gökyüzünde süzülürdü.",
      parts:[
        { id:"kanat", ad:"kanatlar", d:"M196 122 L40 72 L84 132 L196 142 Z M224 122 L380 72 L336 132 L224 142 Z", wing:1 },
        { id:"govde", ad:"gövde", d:E(210, 132, 30, 18), body:1 },
        { id:"boyun", ad:"boyun", d:"M222 118 L236 100 L246 108 L232 126 Z" },
        { id:"kafa", ad:"kafatası ve tepesi", d:"M236 104 C246 90 262 88 270 96 L330 104 L272 110 C262 118 248 116 236 104 Z M244 96 L224 68 L258 92 Z", head:1 },
        { id:"bacak", ad:"bacaklar", d:"M198 146 L192 176 L200 178 L206 148 Z M216 146 L220 176 L228 176 L222 146 Z" }
      ]},
    { ad:"Ankilozor", skin:"#A1887F", dark:"#6D4C41", belly:"#D7CCC8", eye:[294, 150], mouth:"M296 162 L308 160",
      fact:"Zırhlı bir tank gibiydi, kuyruğunun ucunda koca bir topuz vardı.",
      parts:[
        { id:"kuyruk", ad:"topuzlu kuyruk", d:"M120 160 C90 162 66 166 44 170 L44 180 C66 178 92 176 122 176 Z M20 162 C30 150 52 152 54 168 C52 186 30 188 20 176 Z", wag:1 },
        { id:"bacak", ad:"bacaklar", d:"M146 176 L164 176 L164 212 L146 212 Z M172 178 L190 178 L190 212 L172 212 Z M206 178 L224 178 L224 212 L206 212 Z M230 176 L248 176 L248 212 L230 212 Z" },
        { id:"govde", ad:"gövde", d:E(190, 160, 74, 30), body:1 },
        { id:"zirh", ad:"zırh", d:"M118 156 C134 112 246 112 262 156 C230 146 150 146 118 156 Z" },
        { id:"kafa", ad:"kafatası", d:"M258 152 C268 138 296 138 310 150 C316 156 312 166 304 168 L266 170 C258 166 254 160 258 152 Z", head:1 }
      ]}
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

  /* ---------- ölçüm ---------- */
  const NS = "http://www.w3.org/2000/svg";
  const meas = document.createElementNS(NS, "svg"); meas.setAttribute("style", "position:absolute;width:0;height:0;overflow:hidden"); document.body.appendChild(meas);
  const BB = {};
  function bbox(d){ if (BB[d]) return BB[d]; const p = document.createElementNS(NS, "path"); p.setAttribute("d", d); meas.appendChild(p); const b = p.getBBox(); p.remove(); return (BB[d] = { x:b.x, y:b.y, w:b.width, h:b.height, cx:b.x + b.width / 2, cy:b.y + b.height / 2 }); }
  function task(t, speak){ $("task").textContent = t; if (speak !== false) say(t); }

  /* ---------- dinozor çizimi ---------- */
  function ribs(p){ const b = bbox(p.d); let s = ""; for (let x = b.x + 14; x < b.x + b.w - 10; x += 13) s += `M${x} ${b.y + 8} Q${x - 6} ${b.cy} ${x} ${b.y + b.h - 8} `; return `<path class="ribs" d="${s}M${b.x + 6} ${b.cy - b.h * 0.18} L${b.x + b.w - 6} ${b.cy - b.h * 0.18}" clip-path="url(#cl-${p.id})"/>`; }
  function partSVG(dn, p){
    const cls = p.wag ? "wag" : p.body ? "breath" : "";
    let s = `<g class="${cls}"><path class="pt" d="${p.d}"/>`;
    if (p.body){ const b = bbox(p.d); s += `<clipPath id="cl-${p.id}"><path d="${p.d}"/></clipPath>${ribs(p)}<ellipse class="life" cx="${b.cx + b.w * 0.05}" cy="${b.cy + b.h * 0.22}" rx="${b.w * 0.36}" ry="${b.h * 0.2}" fill="${dn.belly}"/><g class="life" clip-path="url(#cl-${p.id})" fill="${dn.dark}" opacity=".35"><circle cx="${b.x + b.w * .3}" cy="${b.y + b.h * .3}" r="${b.h * .12}"/><circle cx="${b.x + b.w * .52}" cy="${b.y + b.h * .22}" r="${b.h * .09}"/><circle cx="${b.x + b.w * .72}" cy="${b.y + b.h * .32}" r="${b.h * .11}"/><circle cx="${b.x + b.w * .45}" cy="${b.y + b.h * .45}" r="${b.h * .07}"/></g>`; }
    if (p.head){ const [ex, ey] = dn.eye; s += `<g class="life"><circle cx="${ex}" cy="${ey}" r="7" fill="#fff"/><g class="blink"><circle cx="${ex + 1.5}" cy="${ey}" r="4" fill="#2A2540"/><circle cx="${ex + 3}" cy="${ey - 2}" r="1.4" fill="#fff"/></g><path d="${dn.mouth}" stroke="${dn.dark}" stroke-width="3" stroke-linecap="round" fill="none"/>${dn.teeth ? `<path d="${dn.teeth}" fill="#fff" stroke="${dn.dark}" stroke-width="1"/>` : ""}<circle cx="${ex - 10}" cy="${ey + 14}" r="5" fill="#FF8FA3" opacity=".5"/></g><circle class="ribs" cx="${ex}" cy="${ey}" r="6" stroke-width="3"/>`; }
    return s + "</g>";
  }
  function dinoSVG(dn, alive, extra){
    return `<svg viewBox="0 0 420 250" class="dino${alive ? " alive" : ""}" style="--skin:${dn.skin};--skin-d:${dn.dark}" aria-hidden="true"><ellipse cx="200" cy="238" rx="150" ry="9" fill="rgba(80,50,20,.15)"/>${extra || ""}${dn.parts.map(p => partSVG(dn, p)).join("")}</svg>`;
  }

  /* ---------- sesler ---------- */
  let nb = null;
  function noise(dur, f, vol, type){
    const a = audio(); if (!a || !soundOn) return;
    if (!nb){ nb = a.createBuffer(1, a.sampleRate, a.sampleRate); const d = nb.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1; }
    const s = a.createBufferSource(), fl = a.createBiquadFilter(), g = a.createGain(), t = a.currentTime;
    s.buffer = nb; fl.type = type || "bandpass"; fl.frequency.value = f; g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    s.connect(fl).connect(g).connect(a.destination); s.start(t, Math.random() * 0.5); s.stop(t + dur);
  }
  function roar(){
    const a = audio(); if (!a || !soundOn) return;
    const t = a.currentTime, o = a.createOscillator(), l = a.createOscillator(), lg = a.createGain(), f = a.createBiquadFilter(), g = a.createGain();
    o.type = "sawtooth"; o.frequency.setValueAtTime(120, t); o.frequency.linearRampToValueAtTime(70, t + 1.1);
    l.frequency.value = 18; lg.gain.value = 18; l.connect(lg).connect(o.frequency);
    f.type = "lowpass"; f.frequency.value = 900; g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.35, t + 0.1); g.gain.exponentialRampToValueAtTime(0.0001, t + 1.2);
    o.connect(f).connect(g).connect(a.destination); o.start(t); l.start(t); o.stop(t + 1.25); l.stop(t + 1.25);
    noise(1, 500, 0.25, "lowpass");
  }

  /* ---------- oyun ---------- */
  let level = 0, phase = "", idleT = null, area = $("area");
  function setDots(k){ const d = $("dots"); d.textContent = ""; ["Kazı", "Birleştir", "Canlandır"].forEach((n, i) => { const e = document.createElement("i"); if (i <= k) e.className = "on"; e.title = n; d.appendChild(e); }); }
  function startLevel(i){
    level = Math.max(0, Math.min(DINOS.length - 1, i));
    $("intro").hidden = true; $("done").hidden = true; $("party").hidden = true;
    startDig();
  }

  /* 1) KAZI */
  let D = null;
  function startDig(){
    phase = "dig"; setDots(0); clearTimeout(idleT); $("acts").textContent = "";
    const dn = DINOS[level], tall = area.clientWidth < area.clientHeight, W = tall ? 560 : 800, H = tall ? 700 : 500;
    area.innerHTML = `<canvas width="${W * 2}" height="${H * 2}" aria-label="Kazı alanı: parmağınla kumu fırçala"></canvas>`;
    const cv = area.querySelector("canvas"), ctx = cv.getContext("2d"); ctx.scale(2, 2);
    const sand = document.createElement("canvas"); sand.width = W; sand.height = H; const sc = sand.getContext("2d");
    // kum dokusu
    const g = sc.createLinearGradient(0, 0, 0, H); g.addColorStop(0, "#EBCB8B"); g.addColorStop(1, "#D9AE66"); sc.fillStyle = g; sc.fillRect(0, 0, W, H);
    for (let i = 0; i < 2200; i++){ sc.fillStyle = Math.random() < .5 ? "rgba(160,110,50,.18)" : "rgba(255,240,200,.25)"; sc.fillRect(Math.random() * W, Math.random() * H, 2, 2); }
    for (let i = 0; i < 14; i++){ sc.fillStyle = "rgba(140,110,80,.35)"; sc.beginPath(); sc.ellipse(Math.random() * W, Math.random() * H, 6 + Math.random() * 10, 4 + Math.random() * 6, Math.random(), 0, 7); sc.fill(); }
    // kemikleri yerleştir
    const slots = (tall ? [[150, 125], [410, 135], [150, 350], [410, 350], [150, 575], [410, 565]] : [[160, 140], [400, 125], [640, 145], [170, 360], [410, 370], [640, 355]]).sort(() => Math.random() - .5);
    const test = document.createElement("canvas").getContext("2d");
    const bones = dn.parts.map((p, i) => {
      const b = bbox(p.d), s = Math.min(1.1, 185 / Math.max(b.w, b.h)) * 0.95, [x, y] = slots[i], r = (Math.random() - .5) * 1.0, path = new Path2D(p.d);
      const pts = [];
      for (let k = 0; k < 400 && pts.length < 26; k++){ const px = b.x + Math.random() * b.w, py = b.y + Math.random() * b.h; if (test.isPointInPath(path, px, py)){ const dx = (px - b.cx) * s, dy = (py - b.cy) * s; pts.push([x + dx * Math.cos(r) - dy * Math.sin(r), y + dx * Math.sin(r) + dy * Math.cos(r)]); } }
      return { p, b, s, x, y, r, path, pts, found:false, t:0 };
    });
    D = { cv, ctx, sand, sc, bones, W, H, dug:new Uint8Array(Math.ceil(W / 16) * Math.ceil(H / 16)), brush:null, dust:[], hint:null, last:0 };
    task("Parmağınla kumu fırçala, dinozor kemiklerini bul!");
    armIdle(); drawDig();
    const pt = (e) => { const r = cv.getBoundingClientRect(); return [(e.clientX - r.left) * W / r.width, (e.clientY - r.top) * H / r.height]; };
    let down = false, prev = null;
    cv.addEventListener("pointerdown", (e) => { audio(); down = true; cv.setPointerCapture(e.pointerId); prev = pt(e); brush(prev, prev); e.preventDefault(); });
    cv.addEventListener("pointermove", (e) => { const p = pt(e); D.brush = p; if (down){ brush(prev, p); prev = p; } });
    const up = () => { down = false; prev = null; };
    cv.addEventListener("pointerup", up); cv.addEventListener("pointercancel", up); cv.addEventListener("pointerleave", () => { D.brush = null; });
  }
  function brush(a, b){
    if (phase !== "dig") return;
    const steps = Math.max(1, Math.ceil(Math.hypot(b[0] - a[0], b[1] - a[1]) / 8)), R = 40, sc = D.sc;
    sc.save(); sc.globalCompositeOperation = "destination-out";
    for (let i = 0; i <= steps; i++){
      const x = a[0] + (b[0] - a[0]) * i / steps, y = a[1] + (b[1] - a[1]) * i / steps;
      const g = sc.createRadialGradient(x, y, 4, x, y, R); g.addColorStop(0, "rgba(0,0,0,.9)"); g.addColorStop(1, "rgba(0,0,0,0)");
      sc.fillStyle = g; sc.beginPath(); sc.arc(x, y, R, 0, 7); sc.fill();
      const cw = Math.ceil(D.W / 16);
      for (let gx = Math.floor((x - R * .7) / 16); gx <= Math.floor((x + R * .7) / 16); gx++) for (let gy = Math.floor((y - R * .7) / 16); gy <= Math.floor((y + R * .7) / 16); gy++) if (gx >= 0 && gy >= 0 && gx < cw) { const k = gy * cw + gx; if (D.dug[k] < 3) D.dug[k]++; }
      if (Math.random() < .3) D.dust.push({ x, y, vx:(Math.random() - .5) * 3, vy:-Math.random() * 2, t:1 });
    }
    sc.restore();
    const now = performance.now(); if (now - D.last > 90){ D.last = now; noise(0.08, 2500, 0.05); }
    armIdle(); checkBones(); drawDig();
  }
  function checkBones(){
    const cw = Math.ceil(D.W / 16);
    for (const B of D.bones){
      if (B.found || !B.pts.length) continue;
      const open = B.pts.filter(([x, y]) => D.dug[Math.floor(y / 16) * cw + Math.floor(x / 16)] >= 2).length / B.pts.length;
      if (open >= 0.72){
        B.found = true; B.t = 1; D.hint = null;
        [784, 1046, 1318].forEach((f, i) => tone(f, .15, "triangle", .09, i * .08));
        say(`Bir kemik buldun: ${B.p.ad}!`);
        for (let i = 0; i < 20; i++) D.dust.push({ x:B.x, y:B.y, vx:(Math.random() - .5) * 6, vy:(Math.random() - .5) * 6, t:1, gold:true });
      }
    }
    const left = D.bones.filter(b => !b.found).length;
    if (!left && phase === "dig"){ phase = "dig-done"; clearTimeout(idleT); setTimeout(() => { task("Bütün kemikleri buldun! Şimdi müzeye götürelim."); }, 1300); setTimeout(startBuild, 3200); }
  }
  function drawDig(){
    if (!D) return;
    const { ctx, W, H } = D;
    // toprak katmanları
    const g = ctx.createLinearGradient(0, 0, 0, H); g.addColorStop(0, "#B9874A"); g.addColorStop(1, "#8F6232"); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    ctx.strokeStyle = "rgba(90,60,25,.25)"; ctx.lineWidth = 3; for (let y = 60; y < H; y += 70){ ctx.beginPath(); ctx.moveTo(0, y); for (let x = 0; x <= W; x += 40) ctx.lineTo(x, y + Math.sin(x * .03 + y) * 6); ctx.stroke(); }
    for (const B of D.bones){
      ctx.save(); ctx.translate(B.x, B.y); ctx.rotate(B.r); ctx.scale(B.s, B.s); ctx.translate(-B.b.cx, -B.b.cy);
      ctx.fillStyle = "#F4ECD8"; ctx.strokeStyle = B.found ? "#FFC529" : "#BBA77E"; ctx.lineWidth = (B.found ? 7 : 3) / B.s; ctx.lineJoin = "round";
      ctx.fill(B.path); ctx.stroke(B.path); ctx.restore();
    }
    ctx.drawImage(D.sand, 0, 0);
    for (const B of D.bones) if (B.found && B.t > 0){ ctx.strokeStyle = `rgba(255,209,102,${B.t})`; ctx.lineWidth = 6; ctx.beginPath(); ctx.arc(B.x, B.y, 90 * (1.3 - B.t), 0, 7); ctx.stroke(); }
    if (D.hint){ const B = D.hint, k = (performance.now() / 500) % 1; ctx.strokeStyle = `rgba(255,255,255,${1 - k})`; ctx.lineWidth = 5; ctx.beginPath(); ctx.arc(B.x, B.y, 40 + k * 40, 0, 7); ctx.stroke(); }
    for (const p of D.dust){ ctx.fillStyle = p.gold ? `rgba(255,209,102,${p.t})` : `rgba(230,195,130,${p.t})`; ctx.beginPath(); ctx.arc(p.x, p.y, p.gold ? 4 : 3, 0, 7); ctx.fill(); }
    if (D.brush && phase === "dig"){ const [x, y] = D.brush; ctx.save(); ctx.translate(x, y); ctx.rotate(-0.6); ctx.fillStyle = "#C98A4B"; ctx.fillRect(-6, -48, 12, 34); ctx.fillStyle = "#E5484D"; ctx.fillRect(-14, -16, 28, 10); ctx.fillStyle = "#4A3220"; for (let i = -12; i <= 12; i += 4) ctx.fillRect(i, -6, 2, 14); ctx.restore(); }
  }
  function animDig(){
    if (D && (phase === "dig" || phase === "dig-done")){
      let any = false;
      for (const p of D.dust){ p.x += p.vx; p.y += p.vy; p.vy += .15; p.t -= .03; } D.dust = D.dust.filter(p => p.t > 0); if (D.dust.length) any = true;
      for (const B of D.bones) if (B.t > 0){ B.t -= .02; any = true; }
      if (any || D.hint || D.brush) drawDig();
    }
    requestAnimationFrame(animDig);
  }
  requestAnimationFrame(animDig);

  /* 2) BİRLEŞTİR */
  let Bd = null;
  function startBuild(){
    if (phase !== "dig-done") return;
    phase = "build"; setDots(1); D = null;
    const dn = DINOS[level];
    const ghosts = dn.parts.map(p => `<path class="ghost" data-g="${p.id}" d="${p.d}"/>`).join("");
    const tall = area.clientWidth < area.clientHeight;
    area.innerHTML = `<svg viewBox="${tall ? "0 -70 420 520" : "0 -10 420 360"}" class="dino" style="--skin:${dn.skin};--skin-d:${dn.dark}" aria-label="Müze: kemikleri kesikli yerlerine sürükle">
      <defs><linearGradient id="wall" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#FFF3DD"/><stop offset="1" stop-color="#F3DDB4"/></linearGradient></defs>
      <rect x="-50" y="-200" width="520" height="900" fill="url(#wall)"/>
      <rect x="-50" y="244" width="520" height="16" fill="#B98A56"/><rect x="60" y="236" width="300" height="10" rx="4" fill="#8A5A2B"/>
      <rect x="-50" y="262" width="520" height="500" fill="#E2C99A"/>
      ${ghosts}<g id="placed"></g><g id="tray"></g></svg>`;
    const svg = area.querySelector("svg"), tray = svg.querySelector("#tray");
    const order = dn.parts.map((p, i) => i).sort(() => Math.random() - .5);
    Bd = { svg, items:[], dn };
    order.forEach((idx, k) => {
      const p = dn.parts[idx], b = bbox(p.d), st = Math.min(1, 92 / Math.max(b.w, b.h)), sx = tall ? 420 * ((k % 3) + .5) / 3 : 420 * (k + .5) / order.length, sy = tall ? 300 + Math.floor(k / 3) * 86 : 305;
      const g = document.createElementNS(NS, "g"); g.setAttribute("class", "drag"); g.innerHTML = `<rect x="${b.x - 16}" y="${b.y - 16}" width="${b.w + 32}" height="${b.h + 32}" fill="transparent"/>` + partSVG(dn, p); g.setAttribute("role", "button"); g.setAttribute("aria-label", p.ad);
      tray.appendChild(g);
      const it = { p, idx, b, st, home:[sx, sy], g, placed:false, x:sx, y:sy, s:st };
      place(it); Bd.items.push(it);
      g.addEventListener("pointerdown", (e) => grab(e, it));
    });
    task(`Kemikleri kesikli yerlerine koy!`); armIdle();
  }
  function place(it){ it.g.setAttribute("transform", `translate(${it.x - it.b.cx * it.s} ${it.y - it.b.cy * it.s}) scale(${it.s})`); }
  function svgPt(e){ const p = Bd.svg.createSVGPoint(); p.x = e.clientX; p.y = e.clientY; return p.matrixTransform(Bd.svg.getScreenCTM().inverse()); }
  let held = null;
  function grab(e, it){
    if (phase !== "build" || it.placed) return;
    audio(); e.preventDefault(); held = it; it.g.classList.add("held"); it.s = 1;
    Bd.svg.querySelector("#tray").appendChild(it.g);
    const p = svgPt(e); it.x = p.x; it.y = p.y - 20; place(it); say(it.p.ad); tone(500, .06, "triangle", .07);
    Bd.svg.setPointerCapture(e.pointerId);
  }
  function moveHeld(e){ if (!held) return; const p = svgPt(e); held.x = p.x; held.y = p.y - 20; place(held); }
  function drop(){
    if (!held) return;
    const it = held; held = null; it.g.classList.remove("held");
    if (Math.hypot(it.x - it.b.cx, it.y - it.b.cy) < 46){
      it.placed = true; it.x = it.b.cx; it.y = it.b.cy; it.s = 1; place(it);
      it.g.classList.add("snap"); it.g.classList.remove("drag");
      const placedG = Bd.svg.querySelector("#placed"), sib = [...placedG.children].find(c => +c.dataset.idx > it.idx);
      it.g.dataset.idx = it.idx; placedG.insertBefore(it.g, sib || null);
      const gh = Bd.svg.querySelector(`[data-g="${it.p.id}"]`); if (gh) gh.remove();
      tone(330, .08, "square", .06); tone(660, .12, "triangle", .07, .06);
      armIdle();
      if (Bd.items.every(i => i.placed)) { phase = "built"; clearTimeout(idleT); task("İskelet tamam! Bak bakalım ne olacak…"); setTimeout(startAlive, 1600); }
    } else { it.s = it.st; [it.x, it.y] = it.home; place(it); tone(220, .12, "sine", .07); say("Kesikli şekli bul, oraya koy."); }
  }
  area.addEventListener("pointermove", (e) => { if (phase === "build") moveHeld(e); });
  area.addEventListener("pointerup", () => { if (phase === "build") drop(); });
  area.addEventListener("pointercancel", () => { if (phase === "build") drop(); });

  /* 3) CANLANDIR */
  function startAlive(){
    phase = "alive"; setDots(2);
    const svg = Bd.svg; svg.querySelectorAll("#tray *").forEach(n => n.remove());
    svg.classList.add("alive"); roar(); svg.classList.add("roar");
    // konfeti
    for (let i = 0; i < 40; i++){
      const c = document.createElementNS(NS, "rect"), x = Math.random() * 420, col = ["#FFC529", "#E5484D", "#2DB75A", "#3D8BFD", "#9B5DE5"][i % 5];
      c.setAttribute("x", x); c.setAttribute("y", -10); c.setAttribute("width", 6); c.setAttribute("height", 10); c.setAttribute("fill", col);
      c.innerHTML = `<animate attributeName="y" from="-10" to="${260 + Math.random() * 80}" dur="${1.5 + Math.random() * 1.5}s" begin="${Math.random()}s" fill="freeze"/><animateTransform attributeName="transform" type="rotate" from="0 ${x} 0" to="${360} ${x} 200" dur="2s" repeatCount="indefinite"/>`;
      svg.appendChild(c);
    }
    const dn = DINOS[level];
    setTimeout(() => task(`Bu bir ${dn.ad}! ${dn.fact}`), 1300);
    $("acts").innerHTML = `<button class="bigbtn" id="roarb" type="button">🦖 Kükre!</button><button class="bigbtn" id="tomus" type="button" style="background:#C98A4B;box-shadow:0 7px 0 #8A5A2B">🏛️ Müzeye koy</button>`;
    $("roarb").addEventListener("click", () => { audio(); roar(); svg.classList.remove("roar"); void svg.getBBox(); svg.classList.add("roar"); });
    $("tomus").addEventListener("click", () => { audio(); finishLevel(); });
  }
  function finishLevel(){
    best[level] = 3; persist(); renderLevels();
    $("acts").textContent = "";
    if (best.filter(Boolean).length >= DINOS.length && DINOS.every((_, i) => best[i])){ $("party").hidden = false; sfx.party(); say("Müze tamamlandı! Bütün dinozorları buldun, Egemen!"); return; }
    const dn = DINOS[level];
    $("card").innerHTML = `${dinoSVG(dn, true)}<b>${dn.ad}</b><p>${dn.fact}</p>`;
    [...$("stars").children].forEach((el) => { el.className = "on"; });
    $("done").hidden = false; sfx.party(); say(`${dn.ad} müzede yerini aldı!`);
  }

  /* ---------- yardım ---------- */
  function armIdle(){
    clearTimeout(idleT);
    if (Bd && Bd.svg) Bd.svg.querySelectorAll(".ghost.hint").forEach(g => g.classList.remove("hint"));
    idleT = setTimeout(() => {
      if (phase === "dig" && D){ const B = D.bones.find(b => !b.found); if (B){ D.hint = B; say("Parlayan yeri fırçala!"); } }
      if (phase === "build" && Bd){ const it = Bd.items.find(i => !i.placed); if (it){ const gh = Bd.svg.querySelector(`[data-g="${it.p.id}"]`); if (gh) gh.classList.add("hint"); say(`${it.p.ad} parlayan yere gider.`); } }
    }, 9000);
  }

  /* ---------- müze (menü) ---------- */
  function renderLevels(){
    const box = $("levels"); box.textContent = "";
    DINOS.forEach((dn, i) => {
      const b = document.createElement("button"); b.type = "button"; b.className = "slot" + (best[i] ? "" : " locked");
      b.innerHTML = `${dinoSVG(dn, !!best[i])}<span>${best[i] ? dn.ad : "?"}</span><small>${best[i] ? "★ Müzede" : "Kazı " + (i + 1)}</small>`;
      b.setAttribute("aria-label", best[i] ? `${dn.ad}, müzede` : `Kazı ${i + 1}`);
      b.addEventListener("click", () => { audio(); startLevel(i); });
      box.appendChild(b);
    });
  }
  function showIntro(){ clearTimeout(idleT); phase = ""; if (canSpeak) speechSynthesis.cancel(); $("intro").hidden = false; $("done").hidden = true; $("party").hidden = true; }
  $("play").addEventListener("click", () => { audio(); const i = DINOS.findIndex((_, k) => !best[k]); startLevel(i < 0 ? 0 : i); });
  $("next").addEventListener("click", () => { audio(); const i = DINOS.findIndex((_, k) => !best[k]); startLevel(i < 0 ? (level + 1) % DINOS.length : i); });
  $("replay").addEventListener("click", () => { audio(); startLevel(level); });
  $("again").addEventListener("click", () => { audio(); showIntro(); });
  $("menu").addEventListener("click", () => { audio(); showIntro(); });
  document.addEventListener("visibilitychange", () => { if (document.hidden && canSpeak) speechSynthesis.cancel(); });

  renderLevels();
  $("intro").hidden = false;

  window.__dz = { DINOS, startLevel, brush, startBuild, drop, place, bbox, get D(){ return D; }, get Bd(){ return Bd; }, get phase(){ return phase; }, grabAt(it){ held = it; it.s = 1; }, startAlive };
})();
