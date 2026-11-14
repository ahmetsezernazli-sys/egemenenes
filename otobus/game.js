/* Otobüs Şoförü — Egemen için sürüş oyunu */
(function(){
  "use strict";

  const SAVE = "otobus", SOUND_KEY = "otobus-ses", PER_LEVEL = 1;
  const RAINBOW = ["#E4483B", "#C98F00", "#2A64C0", "#1E8A41", "#6E36B8"];
  const ANIMALS = ["🐶", "🐱", "🐰", "🐻", "🐼", "🐸", "🐷", "🐨", "🦊", "🐯", "🐵", "🐧"];
  const COL = { kirmizi:{ad:"kırmızı", c:"#E4483B", d:"#A92F25"}, mavi:{ad:"mavi", c:"#2A64C0", d:"#1B4687"}, sari:{ad:"sarı", c:"#FFC529", d:"#C98F00"}, yesil:{ad:"yeşil", c:"#2DB75A", d:"#1E8A41"} };
  const NUM = ["sıfır", "bir", "iki", "üç", "dört", "beş", "altı", "yedi", "sekiz", "dokuz", "on", "on bir", "on iki"];
  // bölümler: s = durak (k yolcu, renk), h = ev (renk), l = ışık, son = bitiş
  const LEVELS = [
    { ev:[["s",1], ["s",1], ["s",1]], end:"okul" },
    { ev:[["s",2], ["s",3], ["s",2]], end:"park" },
    { ev:[["s",2,"kirmizi"], ["s",2,"mavi"], ["h","kirmizi"], ["h","mavi"]], end:"garaj" },
    { ev:[["s",2], ["l"], ["s",2], ["l"]], end:"okul" },
    { ev:[["s",2,"sari"], ["l"], ["s",2,"yesil"], ["h","sari"], ["l"], ["h","yesil"]], end:"garaj" }
  ];
  const END = { okul:"okula", park:"parka", garaj:"garaja" };
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

  /* ---------- dünya ---------- */
  const cv = $("cv"), ctx = cv.getContext("2d");
  let W = 900; const HH = 420, ROAD = 300, BUSL = 230, DOOR = 168, VMAX = 5.5, GAP = 820;
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  function fit(){
    cv.style.height = "";
    let r = cv.getBoundingClientRect();
    if (r.width && HH * r.width / r.height < 460){ cv.style.height = Math.round(r.width * HH / 460) + "px"; r = cv.getBoundingClientRect(); }
    if (r.width && r.height) W = Math.round(Math.max(460, Math.min(1100, HH * r.width / r.height)));
    cv.width = W * dpr; cv.height = HH * dpr; ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
  fit(); window.addEventListener("resize", fit);
  const EMO = '"Segoe UI Emoji","Apple Color Emoji","Noto Color Emoji",sans-serif';

  let level = 0, mistakes = 0, ents = [], bus = null, cam = 0, pedal = false, busy = false, anims = [], idle = 0, doneLv = false, frame = 0;
  const door = () => bus.x + DOOR;
  const front = () => bus.x + BUSL;

  function startLevel(i){
    level = Math.max(0, Math.min(LEVELS.length - 1, i)); mistakes = 0; doneLv = false;
    $("intro").hidden = true; $("done").hidden = true; $("party").hidden = true;
    const L = LEVELS[level]; let x = 900; ents = [];
    const pool = ANIMALS.slice().sort(() => Math.random() - .5); let k = 0;
    for (const e of L.ev){
      if (e[0] === "s") ents.push({ t:"s", x, riders:Array.from({length:e[1]}, () => ({ e:pool[k++ % pool.length], col:e[2] || null })) });
      else if (e[0] === "h") ents.push({ t:"h", x, col:e[1] });
      else ents.push({ t:"l", x: x + 60, red:true, wait:0 });
      x += GAP;
    }
    ents.push({ t:"end", x, kind:L.end });
    bus = { x:120, v:0, riders:[], back:null };
    cam = 0; pedal = false; busy = false; anims = []; idle = 0;
    $("pedal").disabled = false;
    renderDots();
    task("Yeşil pedala basılı tut, otobüs gitsin. Bırakınca durur.");
  }
  function task(t, speak){ $("task").textContent = t; if (speak !== false) say(t); }
  function renderDots(){
    const d = $("dots"); d.textContent = "";
    const goal = ents.filter(e => e.t !== "l");
    goal.forEach(e => { const i = document.createElement("i"); if (e.done) i.className = "on"; d.appendChild(i); });
  }
  const pending = (e) => !e.done && (e.t === "s" ? e.riders.length > 0 : e.t === "h" ? bus.riders.some(r => r.col === e.col) : e.t === "end");

  /* ---------- güncelleme ---------- */
  function step(){
    frame++;
    if (!bus || doneLv) { stepAnims(); return; }
    if (bus.back != null){ // kaçırılan durağa geri dön
      bus.x = Math.max(bus.x - 3.5, bus.back - DOOR); bus.v = 0;
      if (door() <= bus.back + 1){ const e = ents.find(z => z.x === bus.back); bus.back = null; if (e) handle(e); }
    } else if (!busy){
      if (pedal) bus.v = Math.min(VMAX, bus.v + .16); else bus.v = Math.max(0, bus.v - .32);
      bus.x += bus.v;
      // ışıklar
      for (const e of ents) if (e.t === "l" && e.red){
        if (front() > e.x - 4){ e.red = false; mistakes++; tone(220, .3, "sine", .1); task("Kırmızı ışıkta durmalıydık! Bir dahakine dikkat."); }
        else if (bus.v === 0 && front() > e.x - 260){ if (++e.wait > 80){ e.red = false; [660, 880].forEach((f, i) => tone(f, .12, "triangle", .1, i * .1)); task("Yeşil yandı, gidebiliriz!"); } }
      }
      // duyurular
      for (const e of ents){
        if (e.said || e.done) continue;
        const ref = e.t === "l" ? front() : door();
        if (e.x - ref < 470 && e.x - ref > 0){
          e.said = true;
          if (e.t === "s") task(e.riders[0].col ? `Durakta ${COL[e.riders[0].col].ad} yolcular var. Durağın önünde dur!` : "Durakta yolcular bekliyor. Durağın önünde dur!");
          else if (e.t === "h" && pending(e)) task(`${cap(COL[e.col].ad)} ev geliyor. ${cap(COL[e.col].ad)} yolcular orada inecek, dur!`);
          else if (e.t === "l") task("Kırmızı ışık! Çizgiden önce dur ve yeşili bekle.");
          else if (e.t === "end") task(`${cap(END[e.kind])} geldik. Kapının önünde dur!`);
        }
      }
      // durunca: yakında iş var mı?
      if (bus.v === 0){
        const e = ents.find(z => pending(z) && Math.abs(door() - z.x) <= 95);
        if (e){ bus.x = e.x - DOOR; handle(e); }
        else if (!pedal && ++idle === 420){ $("pedal").classList.add("hint"); task("Yeşil pedala basılı tut, otobüs gitsin."); }
      } else idle = 0;
      // kaçırılan durak
      const miss = ents.find(z => z.t !== "l" && pending(z) && door() > z.x + 95);
      if (miss){ mistakes++; bus.back = miss.x; bus.v = 0; pedal = false; $("pedal").classList.remove("down"); task(miss.t === "h" ? "Evi geçtik! Biraz geri gidelim." : "Durağı geçtik! Biraz geri gidelim."); }
    }
    cam = Math.max(0, Math.min(bus.x - Math.min(W * .2, Math.max(16, W - 480)), ents[ents.length - 1].x + 300 - W));
    stepAnims();
  }
  function stepAnims(){ for (const a of anims) a.t++; anims = anims.filter(a => a.t < a.dur); }
  function later(ms, fn){ setTimeout(fn, ms); }
  function handle(e){
    busy = true; idle = 0; $("pedal").classList.remove("hint"); $("pedal").disabled = true; pedal = false; $("pedal").classList.remove("down");
    tone(520, .08, "triangle", .08); tone(700, .1, "triangle", .08, .08);
    if (e.t === "s"){
      const n = e.riders.length; let i = 0;
      task("Kapılar açıldı. Yolcular biniyor!");
      const next = () => {
        if (!e.riders.length){
          e.done = true; renderDots();
          const tot = bus.riders.length;
          later(400, () => { task(`Otobüste ${NUM[tot] || tot} yolcu var. Hadi gidelim!`); finishHandle(); });
          return;
        }
        const r = e.riders.shift(); i++;
        anims.push({ e:r.e, col:r.col, x0:e.x - 20 - (n - i) * 26, y0:285, x1:e.x, y1:262, t:0, dur:22 });
        later(380, () => { bus.riders.push(r); tone(500 + bus.riders.length * 50, .12, "triangle", .1); say(cap(NUM[i])); });
        later(800, next);
      };
      later(300, next);
    } else if (e.t === "h"){
      task(`${cap(COL[e.col].ad)} yolcular evlerine iniyor.`);
      const next = () => {
        const j = bus.riders.findIndex(r => r.col === e.col);
        if (j < 0){ e.done = true; renderDots(); later(300, () => { task("Hepsi evine ulaştı. Teşekkürler şoför!"); finishHandle(); }); return; }
        const r = bus.riders.splice(j, 1)[0];
        anims.push({ e:r.e, col:r.col, x0:e.x, y0:262, x1:e.x + 10, y1:240, t:0, dur:26, fade:true });
        tone(700 - bus.riders.length * 30, .1, "triangle", .1);
        later(700, next);
      };
      later(300, next);
    } else {
      task(`${cap(END[e.kind])} vardık! Herkes iniyor.`);
      const next = () => {
        if (!bus.riders.length){ e.done = true; renderDots(); later(500, finishLevel); return; }
        const r = bus.riders.shift();
        anims.push({ e:r.e, col:r.col, x0:e.x, y0:262, x1:e.x + 40, y1:236, t:0, dur:26, fade:true });
        tone(600, .08, "triangle", .08);
        later(450, next);
      };
      later(300, next);
    }
  }
  function finishHandle(){ busy = false; $("pedal").disabled = false; }
  const cap = s => s.charAt(0).toLocaleUpperCase("tr-TR") + s.slice(1);
  function starsNow(){ return mistakes <= 1 ? 3 : mistakes <= 3 ? 2 : 1; }
  function finishLevel(){
    doneLv = true; busy = true;
    const s = starsNow();
    best[level] = Math.max(best[level] || 0, s); persist(); renderLevels();
    if (level === LEVELS.length - 1){ $("party").hidden = false; sfx.party(); say("Harika şoför Egemen! Bütün yolcular yerine ulaştı!"); return; }
    [...$("stars").children].forEach((el, i) => { el.className = ""; void el.offsetWidth; if (i < s) el.className = "on"; });
    $("stars").setAttribute("aria-label", s + " yıldız");
    $("done").hidden = false; sfx.party(); say("Aferin! Bölüm bitti.");
  }

  /* ---------- çizim ---------- */
  function rr(x, y, w, h, r, fill){ ctx.fillStyle = fill; ctx.beginPath(); ctx.roundRect ? ctx.roundRect(x, y, w, h, r) : ctx.rect(x, y, w, h); ctx.fill(); }
  function emoji(e, x, y, size){ ctx.font = `${size}px ${EMO}`; ctx.textAlign = "center"; ctx.textBaseline = "alphabetic"; ctx.fillText(e, x, y); }
  function rider(r, x, y, size){
    if (r.col){ ctx.fillStyle = COL[r.col].c; ctx.beginPath(); ctx.arc(x, y - size * .35, size * .62, 0, 7); ctx.fill(); }
    emoji(r.e, x, y, size);
  }
  function draw(){
    ctx.clearRect(0, 0, W, HH);
    // gökyüzü ve tepeler (paralaks)
    const sky = ctx.createLinearGradient(0, 0, 0, ROAD); sky.addColorStop(0, "#8ED1FF"); sky.addColorStop(1, "#D9F1FF");
    ctx.fillStyle = sky; ctx.fillRect(0, 0, W, ROAD);
    ctx.fillStyle = "#FFE27A"; ctx.beginPath(); ctx.arc(W - 100, 60, 34, 0, 7); ctx.fill();
    ctx.fillStyle = "#fff";
    for (let i = 0; i < 6; i++){ const cx = ((i * 260 - cam * .15) % 1560 + 1560) % 1560 - 200; ctx.beginPath(); ctx.arc(cx, 70 + (i % 3) * 22, 22, 0, 7); ctx.arc(cx + 26, 62 + (i % 3) * 22, 28, 0, 7); ctx.arc(cx + 54, 70 + (i % 3) * 22, 20, 0, 7); ctx.fill(); }
    ctx.fillStyle = "#A8DB8F";
    for (let i = 0; i < 8; i++){ const hx = ((i * 300 - cam * .35) % 2400 + 2400) % 2400 - 300; ctx.beginPath(); ctx.ellipse(hx, ROAD - 10, 210, 90, 0, Math.PI, 0); ctx.fill(); }
    // kaldırım ve yol
    ctx.fillStyle = "#CFC6B8"; ctx.fillRect(0, ROAD - 12, W, 14);
    ctx.fillStyle = "#4A4A58"; ctx.fillRect(0, ROAD + 2, W, 92);
    ctx.fillStyle = "#fff";
    for (let x = -((cam) % 80); x < W; x += 80) ctx.fillRect(x, ROAD + 46, 44, 6);
    ctx.fillStyle = "#7BC86C"; ctx.fillRect(0, ROAD + 94, W, HH - ROAD - 94);
    // varlıklar
    for (const e of ents){
      const sx = e.x - cam;
      if (sx < -260 || sx > W + 260) continue;
      if (e.t === "s"){
        rr(sx - 70, ROAD - 112, 140, 10, 4, "#2A64C0");
        ctx.fillStyle = "#2A64C0"; ctx.fillRect(sx - 64, ROAD - 104, 6, 92); ctx.fillRect(sx + 58, ROAD - 104, 6, 92);
        ctx.fillStyle = "rgba(255,255,255,.35)"; ctx.fillRect(sx - 58, ROAD - 102, 116, 70);
        rr(sx + 72, ROAD - 150, 34, 34, 17, "#fff"); ctx.fillStyle = "#2A64C0"; ctx.font = "800 22px Baloo 2, sans-serif"; ctx.textAlign = "center"; ctx.fillText("D", sx + 89, ROAD - 125);
        ctx.fillStyle = "#555"; ctx.fillRect(sx + 87, ROAD - 116, 4, 104);
        e.riders.forEach((r, i) => rider(r, sx - 20 - (e.riders.length - 1 - i) * 26 + (e.riders.length - 1) * 13, ROAD - 16 - (frame + i * 9) % 40 / 40 * 0, 30));
      } else if (e.t === "h"){
        const c = COL[e.col];
        rr(sx - 70, ROAD - 140, 140, 128, 6, "#FFF6E3");
        ctx.fillStyle = c.c; ctx.beginPath(); ctx.moveTo(sx - 86, ROAD - 136); ctx.lineTo(sx, ROAD - 200); ctx.lineTo(sx + 86, ROAD - 136); ctx.closePath(); ctx.fill();
        rr(sx - 18, ROAD - 72, 36, 60, 6, c.d);
        rr(sx - 58, ROAD - 118, 30, 28, 4, "#9ED8FF"); rr(sx + 28, ROAD - 118, 30, 28, 4, "#9ED8FF");
        if (e.done) emoji("❤️", sx, ROAD - 150, 22);
      } else if (e.t === "l"){
        ctx.fillStyle = "#fff"; ctx.fillRect(sx - 4, ROAD + 4, 8, 88);
        ctx.fillStyle = "#333"; ctx.fillRect(sx + 18, ROAD - 140, 6, 128);
        rr(sx + 6, ROAD - 196, 30, 62, 8, "#2A2540");
        ctx.fillStyle = e.red ? "#FF4D4D" : "#5A2A2A"; ctx.beginPath(); ctx.arc(sx + 21, ROAD - 181, 10, 0, 7); ctx.fill();
        ctx.fillStyle = e.red ? "#1F4A2B" : "#3DFF7A"; ctx.beginPath(); ctx.arc(sx + 21, ROAD - 151, 10, 0, 7); ctx.fill();
      } else {
        const col = e.kind === "okul" ? "#E4483B" : e.kind === "park" ? "#2DB75A" : "#6E36B8";
        rr(sx - 110, ROAD - 190, 260, 178, 10, "#FFF6E3");
        rr(sx - 120, ROAD - 206, 280, 26, 8, col);
        ctx.fillStyle = "#fff"; ctx.font = "800 20px Baloo 2, sans-serif"; ctx.textAlign = "center";
        ctx.fillText(e.kind === "okul" ? "OKUL" : e.kind === "park" ? "PARK" : "GARAJ", sx + 20, ROAD - 186);
        rr(sx - 22, ROAD - 84, 44, 72, 6, col);
        emoji(e.kind === "okul" ? "🏫" : e.kind === "park" ? "🎠" : "🚌", sx + 90, ROAD - 100, 46);
        emoji("🏁", sx - 80, ROAD - 100, 40);
      }
    }
    // otobüs
    const bx = bus.x - cam, by = ROAD - 70, bounce = bus.v > 0 ? Math.sin(frame * .5) * 1.2 : 0;
    ctx.save(); ctx.translate(0, bounce);
    rr(bx, by - 46, BUSL, 106, 18, "#FFC529");
    rr(bx, by + 34, BUSL, 18, 8, "#E0A100");
    // camlar ve yolcular
    for (let i = 0; i < 5; i++){
      const wx = bx + 12 + i * 30;
      rr(wx, by - 34, 24, 34, 5, "#CDEBFF");
      const r = bus.riders[i]; if (r) rider(r, wx + 12, by - 6, 20);
    }
    if (bus.riders.length > 5){ ctx.fillStyle = "#2A2540"; ctx.font = "800 16px Baloo 2, sans-serif"; ctx.textAlign = "center"; ctx.fillText(`+${bus.riders.length - 5}`, bx + 100, by + 26); }
    rr(bx + DOOR - 14, by - 34, 30, 72, 5, busy ? "#8FD3FF" : "#4AA3DF");
    rr(bx + BUSL - 32, by - 34, 28, 30, 6, "#CDEBFF");
    ctx.fillStyle = "#FFF4B0"; ctx.beginPath(); ctx.arc(bx + BUSL - 4, by + 26, 6, 0, 7); ctx.fill();
    ctx.restore();
    const wheel = (x) => { ctx.fillStyle = "#2A2540"; ctx.beginPath(); ctx.arc(x, by + 62, 20, 0, 7); ctx.fill(); ctx.fillStyle = "#9AA0B4"; ctx.beginPath(); ctx.arc(x, by + 62, 8, 0, 7); ctx.fill();
      ctx.strokeStyle = "#2A2540"; ctx.lineWidth = 3; const a = bus.x / 20; ctx.beginPath(); ctx.moveTo(x + Math.cos(a) * 8, by + 62 + Math.sin(a) * 8); ctx.lineTo(x - Math.cos(a) * 8, by + 62 - Math.sin(a) * 8); ctx.stroke(); };
    wheel(bx + 48); wheel(bx + BUSL - 48);
    // binen/inen animasyonları
    for (const a of anims){
      const k = a.t / a.dur, x = a.x0 + (a.x1 - a.x0) * k - cam, y = a.y0 + (a.y1 - a.y0) * k - Math.sin(k * Math.PI) * 30;
      ctx.globalAlpha = a.fade ? 1 - k : 1; rider(a, x, y, 28); ctx.globalAlpha = 1;
    }
  }
  let last = 0, acc = 0;
  function loop(ts){
    const dt = Math.min(100, ts - (last || ts)); last = ts; acc += dt;
    while (acc >= 1000 / 60){ step(); acc -= 1000 / 60; }
    if (bus) draw();
    requestAnimationFrame(loop);
  }

  /* ---------- kontrol ---------- */
  const pd = $("pedal");
  function press(on){
    if (busy || doneLv || !$("intro").hidden) on = false;
    pedal = on; pd.classList.toggle("down", on);
    if (on){ idle = 0; pd.classList.remove("hint"); audio(); }
  }
  pd.addEventListener("pointerdown", (e) => { e.preventDefault(); pd.setPointerCapture(e.pointerId); press(true); });
  pd.addEventListener("pointerup", () => press(false));
  pd.addEventListener("pointercancel", () => press(false));
  pd.addEventListener("lostpointercapture", () => press(false));
  pd.addEventListener("contextmenu", (e) => e.preventDefault());
  document.addEventListener("keydown", (e) => { if ((e.key === " " || e.key === "ArrowRight") && $("intro").hidden && $("done").hidden){ e.preventDefault(); if (!e.repeat) press(true); } });
  document.addEventListener("keyup", (e) => { if (e.key === " " || e.key === "ArrowRight") press(false); });
  window.addEventListener("blur", () => press(false));

  /* ---------- menüler ---------- */
  function renderLevels(){
    const box = $("levels"); box.textContent = "";
    const IC = ["🐶", "🔢", "🏠", "🚦", "⭐"];
    LEVELS.forEach((lv, i) => {
      const b = document.createElement("button");
      b.type = "button"; b.className = "lvl";
      b.setAttribute("aria-label", `Bölüm ${i + 1}${best[i] ? ", " + best[i] + " yıldız" : ""}`);
      b.innerHTML = `<span class="ic" aria-hidden="true">${IC[i]}</span>${i + 1}<small aria-hidden="true">${"★".repeat(best[i] || 0)}</small>`;
      b.addEventListener("click", () => { audio(); startLevel(i); });
      box.appendChild(b);
    });
  }
  function showIntro(){ press(false); if (canSpeak) speechSynthesis.cancel(); $("intro").hidden = false; $("done").hidden = true; $("party").hidden = true; }
  $("play").addEventListener("click", () => { audio(); const i = LEVELS.findIndex((_, k) => !best[k]); startLevel(i < 0 ? 0 : i); });
  $("next").addEventListener("click", () => { audio(); startLevel(level + 1); });
  $("replay").addEventListener("click", () => { audio(); startLevel(level); });
  $("again").addEventListener("click", () => { audio(); showIntro(); });
  $("menu").addEventListener("click", () => { audio(); showIntro(); });
  document.addEventListener("visibilitychange", () => { if (document.hidden){ press(false); if (canSpeak) speechSynthesis.cancel(); } });

  renderLevels();
  startLevel(0); $("intro").hidden = false; if (canSpeak) speechSynthesis.cancel();
  requestAnimationFrame(loop);

  window.__ob = { startLevel, step, press, LEVELS, run(n){ for (let i = 0; i < n; i++) step(); }, get st(){ return { level, mistakes, busy, doneLv, bus, ents, pedal }; } };
})();
