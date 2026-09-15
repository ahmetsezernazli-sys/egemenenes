/* Balık Tutma — iki kişilik göl oyunu */
(function(){
  "use strict";

  // Mantıksal alan: 1000 × 700. Alt iskele 0. oyuncu, üst iskele 1. oyuncu.
  const W = 1000, H = 700, DOCK = 110, MID = H/2, POND_TOP = DOCK, POND_BOT = H - DOCK;
  const FISH_TYPES = [
    {e:"🐟", n:"balık", pts:1, w:44, speed:70},
    {e:"🐠", n:"tropik balık", pts:2, w:24, speed:95},
    {e:"🐡", n:"balon balığı", pts:3, w:12, speed:55},
    {e:"🦀", n:"yengeç", pts:2, w:8, speed:45},
    {e:"🦑", n:"mürekkep balığı", pts:5, w:5, speed:120},
    {e:"🥾", n:"eski ayakkabı", pts:0, w:7, speed:30}
  ];
  const COLORS = [{c:"#3D6BF2", soft:"#E3EAFE"}, {c:"#FF7A2F", soft:"#FFEADF"}];
  const AVATARS = ["🚀", "🎈"], DEFAULT_NAMES = ["Enes", "Egemen"];
  const TEAM_GOAL = {60:15, 90:22, 120:30};
  const SETTINGS_KEY = "balik-tutma-ayar", SOUND_KEY = "balik-tutma-ses";
  const RM = window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches;
  const EMOJI = '"Segoe UI Emoji","Apple Color Emoji","Noto Color Emoji",sans-serif';
  const FONT = '"Fredoka", "Segoe UI", sans-serif';

  const $ = id => document.getElementById(id);
  const stage = $("stage"), cv = $("cv"), ctx = cv.getContext("2d");
  const rand = (a, b) => a + Math.random()*(b - a);
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

  let settings = {count:2, mode:"race", names:DEFAULT_NAMES.slice(), help:[false, true], time:60};
  try { const s = JSON.parse(localStorage.getItem(SETTINGS_KEY) || "null"); if (s) settings = Object.assign(settings, s); } catch(e) {}
  let soundOn = true;
  try { soundOn = localStorage.getItem(SOUND_KEY) !== "0"; } catch(e) {}

  let phase = "setup";           // setup | countdown | play | over
  let players = [], fish = [], reels = [], splashes = [], texts = [], time = 0, left = 0, cd = 0, lastBeep = 0;

  /* ---------- ses ---------- */
  let ac = null;
  function audio(){
    if (!ac){ try { ac = new (window.AudioContext || window.webkitAudioContext)(); } catch(e) { ac = null; } }
    if (ac && ac.state === "suspended") ac.resume();
    return ac;
  }
  function tone(freq, dur, type, vol, slide, delay){
    const a = audio(); if (!a || !soundOn) return;
    const n = a.currentTime + (delay || 0), o = a.createOscillator(), g = a.createGain();
    o.type = type || "sine"; o.frequency.setValueAtTime(freq, n);
    if (slide) o.frequency.exponentialRampToValueAtTime(slide, n + dur);
    g.gain.setValueAtTime(.0001, n); g.gain.exponentialRampToValueAtTime(vol || .1, n + .01); g.gain.exponentialRampToValueAtTime(.0001, n + dur);
    o.connect(g).connect(a.destination); o.start(n); o.stop(n + dur + .05);
  }
  function plop(){
    const a = audio(); if (!a || !soundOn) return;
    tone(700, .12, "sine", .12, 250);
  }
  const sfx = {
    cast(){ tone(1200, .15, "sine", .04, 500); setTimeout(plop, 140); },
    bite(){ tone(880, .08, "square", .06); tone(880, .08, "square", .06, null, .12); },
    catch(p){ const base = p ? 523.25 : 330; [1, 1.25, 1.5].forEach((m, i) => tone(base*m, .14, "triangle", .13, null, i*.08)); },
    boot(){ tone(200, .3, "sawtooth", .06, 120); },
    escape(){ tone(500, .2, "sine", .07, 260); },
    beep(high){ tone(high ? 1046.5 : 659.25, high ? .3 : .12, "sine", .12); },
    end(){ [523.25, 659.25, 783.99, 1046.5].forEach((f, i) => tone(f, .25, "triangle", .14, null, i*.12)); }
  };
  const canSpeak = "speechSynthesis" in window;
  let trVoice = null;
  function pickVoice(){ trVoice = speechSynthesis.getVoices().find(v => /^tr(-|_|$)/i.test(v.lang)) || null; }
  if (canSpeak){ pickVoice(); if (speechSynthesis.addEventListener) speechSynthesis.addEventListener("voiceschanged", pickVoice); }
  function say(text){
    if (!canSpeak || !soundOn || !trVoice) return;
    speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text); u.voice = trVoice; u.lang = trVoice.lang; u.pitch = 1.1;
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

  /* ---------- oyun kurulumu ---------- */
  function pickType(){
    const total = FISH_TYPES.reduce((s, t) => s + t.w, 0);
    let r = Math.random()*total;
    for (const t of FISH_TYPES){ if ((r -= t.w) < 0) return t; }
    return FISH_TYPES[0];
  }
  function spawnFish(edge){
    const t = pickType();
    const y = rand(POND_TOP + 40, POND_BOT - 40);
    const x = edge ? (Math.random() < .5 ? -40 : W + 40) : rand(60, W - 60);
    const a = rand(0, Math.PI*2);
    fish.push({t, x, y, vx:Math.cos(a)*t.speed, vy:Math.sin(a)*t.speed*.4, target:null, state:"swim", cool:rand(0, 1.5), wob:rand(0, 6)});
  }

  function laneOf(i){ return i === 0 ? {y0:MID + 20, y1:POND_BOT - 25} : {y0:POND_TOP + 25, y1:MID - 20}; }

  function newGame(){
    players = [];
    for (let i = 0; i < settings.count; i++){
      const lane = laneOf(i);
      players.push({
        name:(settings.names[i] || "").trim() || DEFAULT_NAMES[i], help:!!settings.help[i], score:0, catches:[],
        hook:null, aimX:W/2, aimY:(lane.y0 + lane.y1)/2, c:COLORS[i].c, soft:COLORS[i].soft, av:AVATARS[i]
      });
    }
    fish = []; reels = []; splashes = []; texts = [];
    for (let i = 0; i < 12; i++) spawnFish(false);
    left = settings.time;
    phase = "countdown"; cd = 3; lastBeep = 4;
    $("setup").hidden = true; $("end").hidden = true;
    say(settings.count === 2 && settings.mode === "team" ? "Takım olarak balık tutuyoruz. Hazır!" : "Oltalar hazır!");
  }

  /* ---------- olta ---------- */
  function cast(i, x, y){
    const p = players[i]; if (!p) return;
    const lane = laneOf(i);
    x = clamp(x, 40, W - 40); y = clamp(y, lane.y0, lane.y1);
    if (p.hook && p.hook.fish){ const f = p.hook.fish; f.state = "swim"; f.target = null; f.cool = 1.2; }
    p.hook = {x, y, fish:null, biteT:0, age:0};
    p.aimX = x; p.aimY = y;
    splashes.push({x, y, r:6, life:.6, max:.6});
    sfx.cast();
  }

  function action(i, x, y){
    if (phase !== "play") return;
    const p = players[i]; if (!p) return;
    audio();
    if (p.hook && p.hook.fish && p.hook.fish.state === "bite"){ reelIn(i); return; }
    cast(i, x == null ? p.aimX : x, y == null ? p.aimY : y);
  }

  function reelIn(i){
    const p = players[i], f = p.hook.fish, t = f.t;
    fish.splice(fish.indexOf(f), 1);
    const dockY = i === 0 ? H - DOCK/2 : DOCK/2;
    reels.push({e:t.e, x:f.x, y:f.y, tx:W/2, ty:dockY, u:0, i});
    p.score += t.pts; p.catches.push(t.e);
    texts.push({x:f.x, y:f.y, txt:t.pts ? `+${t.pts}` : "Ayakkabı! 😄", c:p.c, life:1.2, max:1.2, flip:i === 1});
    if (t.pts) sfx.catch(t.pts); else sfx.boot();
    splashes.push({x:f.x, y:f.y, r:10, life:.8, max:.8});
    p.hook = null;   // yerine yeni balık update içinde kenardan gelir
  }

  /* ---------- güncelleme ---------- */
  function update(dt){
    time += dt;
    if (phase === "countdown"){
      cd -= dt;
      const n = Math.ceil(cd);
      if (n !== lastBeep && n > 0){ lastBeep = n; sfx.beep(false); }
      if (cd <= 0){ phase = "play"; sfx.beep(true); }
    } else if (phase === "play"){
      left -= dt;
      if (settings.mode === "team" && settings.count === 2 && teamScore() >= TEAM_GOAL[settings.time]){ finish(); return; }
      if (left <= 0){ left = 0; finish(); return; }
    }

    for (const f of fish){
      f.wob += dt*4;
      f.cool = Math.max(0, f.cool - dt);
      if (f.state === "swim"){
        // yakındaki boş oltayı fark eder
        if (phase === "play" && f.cool <= 0 && !f.target){
          for (let i = 0; i < players.length; i++){
            const h = players[i].hook;
            if (!h || h.fish || h.age < .6) continue;
            const reach = players[i].help ? 260 : 190;
            if (Math.hypot(h.x - f.x, h.y - f.y) < reach && Math.random() < dt*(players[i].help ? 2.2 : 1.4)){ f.target = i; h.fish = f; f.state = "approach"; break; }
          }
        }
        f.x += f.vx*dt; f.y += f.vy*dt;
        if (f.x < 30 && f.vx < 0 || f.x > W - 30 && f.vx > 0) f.vx *= -1;
        if (f.y < POND_TOP + 30 && f.vy < 0 || f.y > POND_BOT - 30 && f.vy > 0) f.vy *= -1;
        if (Math.random() < dt*.4){ const a = rand(0, Math.PI*2); f.vx = Math.cos(a)*f.t.speed; f.vy = Math.sin(a)*f.t.speed*.4; }
      } else if (f.state === "approach"){
        const p = players[f.target], h = p && p.hook;
        if (!h || h.fish !== f){ f.state = "swim"; f.target = null; continue; }
        const dx = h.x - f.x, dy = h.y - f.y, d = Math.hypot(dx, dy);
        const sp = f.t.speed*1.4;
        if (d < 10){ f.state = "bite"; h.biteT = 0; sfx.bite(); }
        else { f.x += dx/d*sp*dt; f.y += dy/d*sp*dt; }
      } else if (f.state === "bite"){
        const p = players[f.target], h = p && p.hook;
        if (!h || h.fish !== f){ f.state = "swim"; f.target = null; continue; }
        h.biteT += dt;
        f.x = h.x + Math.sin(time*30)*3; f.y = h.y + 6;
        if (h.biteT > (p.help ? 1.7 : .95)){
          // kaçtı
          const who = f.target;
          h.fish = null; h.age = 0;
          f.state = "swim"; f.target = null; f.cool = 2;
          const a = rand(0, Math.PI*2); f.vx = Math.cos(a)*f.t.speed*2.2; f.vy = Math.sin(a)*f.t.speed;
          sfx.escape();
          texts.push({x:h.x, y:h.y + (who === 1 ? 30 : -30), txt:"Kaçtı!", c:"#FFFFFF", life:.9, max:.9, flip:who === 1});
        }
      }
    }
    players.forEach(p => { if (p.hook) p.hook.age += dt; });
    while (fish.length < 12) spawnFish(true);

    for (const r of reels) r.u += dt/.7;
    reels = reels.filter(r => r.u < 1);
    for (const s of splashes){ s.life -= dt; s.r += 60*dt; }
    splashes = splashes.filter(s => s.life > 0);
    for (const t of texts){ t.life -= dt; t.y += (t.flip ? 30 : -30)*dt; }
    texts = texts.filter(t => t.life > 0);
  }

  const teamScore = () => players.reduce((s, p) => s + p.score, 0);

  function finish(){
    phase = "over";
    players.forEach(p => { p.hook = null; });
    sfx.end();
    let title, sub, emo = "🏆";
    if (settings.count === 1){
      title = `${players[0].score} puan!`; sub = `${players[0].catches.filter(e => e !== "🥾").length} balık tuttun.`; emo = "🎣";
    } else if (settings.mode === "team"){
      const goal = TEAM_GOAL[settings.time], total = teamScore();
      if (total >= goal){ title = "Takım başardı!"; sub = `Hedef ${goal} puandı, ${total} puan topladınız.`; emo = "🤝"; }
      else { title = "Az kaldı!"; sub = `Hedef ${goal} puandı, ${total} puan topladınız. Bir daha deneyin!`; emo = "🎣"; }
    } else {
      const [a, b] = players;
      title = a.score === b.score ? "Berabere!" : `${(a.score > b.score ? a : b).name} kazandı!`;
      sub = "İkiniz de çok güzel balık tuttunuz.";
    }
    $("end-emo").textContent = emo;
    $("end-title").textContent = title;
    $("end-sub").textContent = sub;
    $("end-catches").innerHTML = players.map(p => `<div class="catch-row"><span>${p.av} ${p.name.replace(/[<>&]/g, "")}</span><span class="fish">${p.catches.join("") || "—"}</span><b>${p.score}</b></div>`).join("");
    say(title);
    setTimeout(() => { if (phase === "over"){ $("end").hidden = false; $("again").focus({preventScroll:true}); } }, 700);
  }

  /* ---------- çizim ---------- */
  const view = {s:1, ox:0, oy:0, dpr:1};
  function resize(){
    const r = stage.getBoundingClientRect();
    view.dpr = Math.min(window.devicePixelRatio || 1, 2);
    cv.width = Math.round(r.width*view.dpr); cv.height = Math.round(r.height*view.dpr);
    view.s = Math.min(r.width/W, r.height/H);
    view.ox = (r.width - W*view.s)/2; view.oy = (r.height - H*view.s)/2;
  }
  function toLogical(e){
    const r = cv.getBoundingClientRect();
    return {x:(e.clientX - r.left - view.ox)/view.s, y:(e.clientY - r.top - view.oy)/view.s};
  }
  function emoji(e, x, y, size, alpha){
    ctx.globalAlpha = alpha == null ? 1 : alpha;
    ctx.fillStyle = "#000"; ctx.font = `${Math.round(size)}px ${EMOJI}`; ctx.textAlign = "center"; ctx.textBaseline = "middle";
    ctx.fillText(e, x, y); ctx.globalAlpha = 1;
  }
  function textAt(txt, x, y, size, color, flip){
    ctx.save(); ctx.translate(x, y); if (flip) ctx.rotate(Math.PI);
    ctx.font = `700 ${size}px ${FONT}`; ctx.textAlign = "center"; ctx.textBaseline = "middle";
    ctx.lineWidth = size*.18; ctx.strokeStyle = "rgba(0,0,0,.35)"; ctx.strokeText(txt, 0, 0);
    ctx.fillStyle = color; ctx.fillText(txt, 0, 0);
    ctx.restore();
  }

  function drawDock(i){
    const top = i === 1, y = top ? 0 : H - DOCK;
    ctx.fillStyle = "#9B6B43"; ctx.fillRect(0, y, W, DOCK);
    ctx.fillStyle = "rgba(0,0,0,.12)";
    for (let x = 0; x < W; x += 80) ctx.fillRect(x, y, 3, DOCK);
    ctx.fillStyle = top ? "rgba(0,0,0,.2)" : "rgba(255,255,255,.12)"; ctx.fillRect(0, top ? DOCK - 8 : y, W, 8);
  }

  function drawPlayerHud(i){
    const p = players[i], top = i === 1, cy = top ? DOCK/2 : H - DOCK/2;
    ctx.save(); ctx.translate(W/2, cy); if (top) ctx.rotate(Math.PI);
    ctx.fillStyle = p.soft; ctx.beginPath(); ctx.roundRect ? ctx.roundRect(-300, -34, 600, 68, 34) : ctx.rect(-300, -34, 600, 68); ctx.fill();
    ctx.strokeStyle = p.c; ctx.lineWidth = 5; ctx.stroke();
    emoji(p.av, -255, 0, 38);
    ctx.fillStyle = "#173B45"; ctx.font = `700 30px ${FONT}`; ctx.textAlign = "left"; ctx.textBaseline = "middle";
    ctx.fillText(p.name, -220, 0);
    ctx.textAlign = "right"; ctx.fillStyle = p.c; ctx.font = `700 40px ${FONT}`;
    ctx.fillText(String(p.score), 280, 2);
    const last = p.catches.slice(-5).join("");
    if (last){ ctx.font = `26px ${EMOJI}`; ctx.fillStyle = "#000"; ctx.textAlign = "right"; ctx.fillText(last, 225, 2); }
    ctx.restore();
  }

  function drawHook(i){
    const p = players[i], h = p.hook;
    const top = i === 1, rodX = W/2 + (top ? 330 : -330), rodY = top ? DOCK - 10 : H - DOCK + 10;
    if (!h){
      // hedef göstergesi (klavye için)
      ctx.strokeStyle = p.c; ctx.globalAlpha = .35; ctx.lineWidth = 3; ctx.setLineDash([6, 6]);
      ctx.beginPath(); ctx.arc(p.aimX, p.aimY, 18, 0, Math.PI*2); ctx.stroke(); ctx.setLineDash([]); ctx.globalAlpha = 1;
      return;
    }
    const bite = h.fish && h.fish.state === "bite";
    const bob = bite ? Math.sin(time*40)*5 + 6 : Math.sin(time*3 + i)*2;
    ctx.strokeStyle = "rgba(255,255,255,.75)"; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(rodX, rodY); ctx.quadraticCurveTo((rodX + h.x)/2, (rodY + h.y)/2 + (top ? -40 : 40), h.x, h.y + bob); ctx.stroke();
    ctx.fillStyle = "#FFFFFF"; ctx.beginPath(); ctx.arc(h.x, h.y + bob, 11, 0, Math.PI*2); ctx.fill();
    ctx.fillStyle = "#E5484D"; ctx.beginPath(); ctx.arc(h.x, h.y + bob, 11, top ? 0 : Math.PI, top ? Math.PI : Math.PI*2); ctx.fill();
    ctx.strokeStyle = "rgba(0,0,0,.25)"; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(h.x, h.y + bob, 11, 0, Math.PI*2); ctx.stroke();
    if (bite){
      const s = 1 + Math.sin(time*16)*.12;
      ctx.save(); ctx.translate(h.x, h.y + (top ? 44 : -44)); if (top) ctx.rotate(Math.PI); ctx.scale(s, s);
      ctx.fillStyle = p.c; ctx.beginPath(); ctx.arc(0, 0, 26, 0, Math.PI*2); ctx.fill();
      ctx.strokeStyle = "#fff"; ctx.lineWidth = 4; ctx.stroke();
      ctx.fillStyle = "#fff"; ctx.font = `700 34px ${FONT}`; ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.fillText("!", 0, 2);
      ctx.restore();
    }
  }

  function draw(){
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = "#1F6F86"; ctx.fillRect(0, 0, cv.width, cv.height);
    ctx.setTransform(view.dpr*view.s, 0, 0, view.dpr*view.s, view.dpr*view.ox, view.dpr*view.oy);
    ctx.save(); ctx.beginPath(); ctx.rect(0, 0, W, H); ctx.clip();

    const g = ctx.createLinearGradient(0, POND_TOP, 0, POND_BOT);
    g.addColorStop(0, "#43B3C9"); g.addColorStop(.5, "#2E97B0"); g.addColorStop(1, "#43B3C9");
    ctx.fillStyle = g; ctx.fillRect(0, POND_TOP, W, POND_BOT - POND_TOP);
    // dalgacıklar
    ctx.strokeStyle = "rgba(255,255,255,.12)"; ctx.lineWidth = 3;
    for (let k = 0; k < 9; k++){
      const yy = POND_TOP + 30 + k*50, off = RM ? 0 : (time*20 + k*37) % 120;
      ctx.beginPath();
      for (let x = -120 + off; x < W; x += 120){ ctx.moveTo(x, yy); ctx.quadraticCurveTo(x + 30, yy - 6, x + 60, yy); }
      ctx.stroke();
    }
    // nilüferler
    [[90, 250], [900, 470], [820, 210], [150, 520]].forEach(([x, y], k) => {
      ctx.fillStyle = "#4FA85A"; ctx.beginPath(); ctx.arc(x, y, 30, .3 + k, Math.PI*1.8 + k); ctx.lineTo(x, y); ctx.fill();
    });
    if (settings.count === 2){
      ctx.strokeStyle = "rgba(255,255,255,.25)"; ctx.lineWidth = 3; ctx.setLineDash([14, 12]);
      ctx.beginPath(); ctx.moveTo(0, MID); ctx.lineTo(W, MID); ctx.stroke(); ctx.setLineDash([]);
    }

    for (const s of splashes){ ctx.strokeStyle = `rgba(255,255,255,${(s.life/s.max*.8).toFixed(2)})`; ctx.lineWidth = 3; ctx.beginPath(); ctx.ellipse(s.x, s.y, s.r, s.r*.5, 0, 0, Math.PI*2); ctx.stroke(); }

    for (const f of fish){
      const y = f.y + Math.sin(f.wob)*3;
      ctx.fillStyle = "rgba(0,40,60,.18)"; ctx.beginPath(); ctx.ellipse(f.x + 4, y + 16, 20, 6, 0, 0, Math.PI*2); ctx.fill();
      emoji(f.t.e, f.x, y, f.t.e === "🦑" ? 46 : 42);
    }

    drawDock(0); if (players.length > 1) drawDock(1); else { ctx.fillStyle = "#6FC2A0"; ctx.fillRect(0, 0, W, DOCK); }
    players.forEach((_, i) => drawHook(i));
    for (const r of reels){
      const e = r.u*r.u*(3 - 2*r.u);
      emoji(r.e, r.x + (r.tx - r.x)*e, r.y + (r.ty - r.y)*e - Math.sin(Math.PI*r.u)*60, 44 + e*10);
    }
    players.forEach((_, i) => drawPlayerHud(i));
    for (const t of texts) { ctx.globalAlpha = clamp(t.life/t.max*1.4, 0, 1); textAt(t.txt, t.x, t.y, 34, t.c, t.flip); ctx.globalAlpha = 1; }

    // süre ve takım hedefi
    if (phase !== "setup"){
      const secs = Math.ceil(left);
      const label = settings.mode === "team" && settings.count === 2 ? `⏱ ${secs}  ·  🤝 ${teamScore()}/${TEAM_GOAL[settings.time]}` : `⏱ ${secs}`;
      ctx.font = `700 26px ${FONT}`;
      const w = ctx.measureText(label).width + 40;
      const tx = settings.count === 2 ? W - w/2 - 16 : W/2, ty = settings.count === 2 ? MID : DOCK/2;
      ctx.fillStyle = "rgba(23,59,69,.75)"; ctx.beginPath(); ctx.roundRect ? ctx.roundRect(tx - w/2, ty - 22, w, 44, 22) : ctx.rect(tx - w/2, ty - 22, w, 44); ctx.fill();
      ctx.fillStyle = secs <= 10 && phase === "play" ? "#FFD25A" : "#FFFFFF"; ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.fillText(label, tx, ty + 1);
    }
    if (phase === "countdown"){
      textAt(String(Math.max(1, Math.ceil(cd))), W/2, MID, 120, "#FFFFFF", false);
    }
    ctx.restore();
  }

  let last = performance.now();
  function frame(now){
    const dt = Math.min(.05, (now - last)/1000); last = now;
    if (phase !== "setup") update(dt);
    draw();
    requestAnimationFrame(frame);
  }

  /* ---------- girişler ---------- */
  cv.addEventListener("pointerdown", e => {
    e.preventDefault(); audio();
    const q = toLogical(e);
    const i = settings.count === 1 ? 0 : (q.y > MID ? 0 : 1);
    if (!players[i]) return;
    // olta ısırıldıysa nereye dokunulursa dokunulsun çeker
    const p = players[i];
    if (p.hook && p.hook.fish && p.hook.fish.state === "bite") action(i);
    else action(i, q.x, q.y);
  });
  cv.addEventListener("contextmenu", e => e.preventDefault());

  const KEYS = [{l:"arrowleft", r:"arrowright", a:"arrowup"}, {l:"a", r:"d", a:"w"}];
  const held = {};
  window.addEventListener("keydown", e => {
    if (!$("setup").hidden || !$("end").hidden) return;
    const k = e.key.toLowerCase();
    held[k] = true;
    KEYS.forEach((set, i) => {
      if (!players[i]) return;
      if (k === set.a && !e.repeat){ e.preventDefault(); action(i); }
      if (k === set.l || k === set.r) e.preventDefault();
    });
    if (k === " " && players[0] && !e.repeat){ e.preventDefault(); action(0); }
  });
  window.addEventListener("keyup", e => { held[e.key.toLowerCase()] = false; });
  setInterval(() => {
    if (phase !== "play" && phase !== "countdown") return;
    KEYS.forEach((set, i) => {
      const p = players[i]; if (!p) return;
      const dir = (held[set.r] ? 1 : 0) - (held[set.l] ? 1 : 0);
      if (dir) p.aimX = clamp(p.aimX + dir*18*(i === 1 ? -1 : 1), 40, W - 40);
    });
  }, 30);

  /* ---------- ayarlar ---------- */
  function syncSetup(){
    const two = $("count-2").checked;
    $("row-1").hidden = !two;
    $("mode-set").hidden = !two;
    const team = $("mode-team").checked;
    const t = +(document.querySelector('input[name="time"]:checked') || {value:60}).value;
    $("mode-note").textContent = team ? `İkiniz birlikte süre bitmeden ${TEAM_GOAL[t]} puan toplamaya çalışırsınız.` : "Süre bitince en çok puanı toplayan kazanır.";
  }
  ["count-1", "count-2", "mode-race", "mode-team", "time-60", "time-90", "time-120"].forEach(id => $(id).addEventListener("change", syncSetup));
  function fillSetup(){
    $("count-" + settings.count).checked = true;
    $("mode-" + settings.mode).checked = true;
    const t = $("time-" + settings.time); if (t) t.checked = true;
    [0, 1].forEach(i => { $("name-" + i).value = settings.names[i] || DEFAULT_NAMES[i]; $("help-" + i).checked = !!settings.help[i]; });
    syncSetup();
  }
  $("setup-form").addEventListener("submit", e => {
    e.preventDefault();
    settings.count = $("count-1").checked ? 1 : 2;
    settings.mode = $("mode-team").checked ? "team" : "race";
    settings.time = +(document.querySelector('input[name="time"]:checked') || {value:60}).value;
    settings.names = [0, 1].map(i => $("name-" + i).value.trim() || DEFAULT_NAMES[i]);
    settings.help = [0, 1].map(i => $("help-" + i).checked);
    try { localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings)); } catch(err) {}
    audio();
    newGame();
  });
  function openSetup(){ phase = "setup"; fillSetup(); $("end").hidden = true; $("setup").hidden = false; }
  $("open-setup").addEventListener("click", openSetup);
  $("end-setup").addEventListener("click", openSetup);
  $("again").addEventListener("click", newGame);
  document.addEventListener("visibilitychange", () => { if (document.hidden && phase === "play") openSetup(); });

  if ("ResizeObserver" in window) new ResizeObserver(resize).observe(stage);
  else window.addEventListener("resize", resize);
  resize();
  fillSetup();
  for (let i = 0; i < 12; i++) spawnFish(false);
  requestAnimationFrame(frame);
})();
