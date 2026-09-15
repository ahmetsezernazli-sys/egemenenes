/* Tavşan Kanı — çay ocağı oyunu */
(function(){
  const TYPES = {
    acik:   {label:"Açık",        target:.20, recipe:"1 ölçü dem, 4 ölçü su"},
    tavsan: {label:"Tavşan kanı", target:.33, recipe:"1 ölçü dem, 2 ölçü su"},
    koyu:   {label:"Koyu",        target:.48, recipe:"1 ölçü dem, 1 ölçü su"}
  };
  const CUSTOMERS = [
    {name:"Kaptan Rıza",        note:"“Tavşan kanı, her zamanki.”",          type:"tavsan", patience:14},
    {name:"Selin Hanım",        note:"“Açık alayım, uykum kaçmasın.”",        type:"acik",   patience:14},
    {name:"Hacı Emin",          note:"“Koyu olsun evladım, demli.”",          type:"koyu",   patience:16},
    {name:"Muhasebeden Burak",  note:"“Tavşan kanı ama çabuk, toplantı var!”", type:"tavsan", patience:8},
    {name:"Nermin Teyze",       note:"“Açık olsun kuzum.”",                   type:"acik",   patience:16},
    {name:"Tavla masası",       note:"“Bir koyu… yok iki. Neyse bir.”",       type:"koyu",   patience:12},
    {name:"Yeni stajyer",       note:"“Bilmiyorum, siz nasıl içiyorsanız.”",  type:"tavsan", patience:18},
    {name:"Hafız Ali",          note:"“Demli olsun, kapkara.”",               type:"koyu",   patience:14},
    {name:"Güneş Hanım",        note:"“Açık lütfen, limon istemez.”",         type:"acik",   patience:12},
    {name:"Postacı Kemal",      note:"“Tavşan kanı, ayakta içeceğim.”",       type:"tavsan", patience:9}
  ];
  const ROUNDS = CUSTOMERS.length;
  const BEST_KEY = "tavsan-kani-rekor";
  const GMAX = .6, TOL = .05; // dem ölçer aralığı ve hedef bandının yarı genişliği
  const RM = window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches;

  const $ = id => document.getElementById(id);
  const cv = $("cv"), ctx = cv.getContext("2d");
  const W = 360, H = 420, CX = 180, YT = 96, YB = 352, YLB = 342;

  let S, order, glass, best = null;
  const active = {tea:false, water:false}, hold = {tea:0, water:0};
  let time = 0, last = performance.now(), toastTimer = 0;

  try { const b = localStorage.getItem(BEST_KEY); if (b !== null) best = +b; } catch(e) {}

  /* ---------- renk ---------- */
  const STOPS = [
    [0,   [226,214,186,.30]],
    [.10, [228,160,70,.78]],
    [.20, [214,112,36,.90]],
    [.33, [170,50,22,.95]],
    [.48, [98,24,10,.97]],
    [.70, [42,10,4,1]]
  ];
  function mix(r){
    r = Math.max(0, Math.min(.7, r));
    for (let i = 0; i < STOPS.length-1; i++){
      const [a, ca] = STOPS[i], [b, cb] = STOPS[i+1];
      if (r <= b){
        const u = (r-a)/(b-a);
        return ca.map((v,k) => v + (cb[k]-v)*u);
      }
    }
    return STOPS[STOPS.length-1][1];
  }
  const rgba = (c, aMul=1) => `rgba(${c[0]|0},${c[1]|0},${c[2]|0},${(c[3]*aMul).toFixed(3)})`;
  const solid = r => { const c = mix(r); return `rgb(${c[0]|0},${c[1]|0},${c[2]|0})`; };

  /* ---------- ince belli bardak profili ---------- */
  const KNOTS = [[0,34],[.12,46],[.3,50],[.5,38],[.62,36],[.8,46],[1,56]];
  function hw(t){
    t = Math.max(0, Math.min(1, t));
    let i = 0; while (i < KNOTS.length-2 && t > KNOTS[i+1][0]) i++;
    const p0 = KNOTS[Math.max(0,i-1)][1], p1 = KNOTS[i][1], p2 = KNOTS[i+1][1], p3 = KNOTS[Math.min(KNOTS.length-1,i+2)][1];
    const u = (t-KNOTS[i][0])/(KNOTS[i+1][0]-KNOTS[i][0]);
    return .5*((2*p1) + (-p0+p2)*u + (2*p0-5*p1+4*p2-p3)*u*u + (-p0+3*p1-3*p2+p3)*u*u*u);
  }
  const tAt = y => (YB - y)/(YB - YT);
  const yForLevel = L => YLB - L*(YLB - YT);

  function glassPath(inset){
    ctx.beginPath();
    const N = 48;
    for (let i = 0; i <= N; i++){ const t = i/N, y = YB - t*(YB-YT); const x = CX - hw(t) + inset; i ? ctx.lineTo(x,y) : ctx.moveTo(x,y); }
    for (let i = N; i >= 0; i--){ const t = i/N, y = YB - t*(YB-YT); ctx.lineTo(CX + hw(t) - inset, y); }
    ctx.closePath();
  }

  /* ---------- dem ölçer ---------- */
  (function paintStrip(){
    const stops = [];
    for (let i = 0; i <= 12; i++){ stops.push(`${solid(i/12*GMAX)} ${(i/12*100).toFixed(1)}%`); }
    $("strip").style.background = `linear-gradient(90deg, ${stops.join(",")})`;
  })();

  function renderGauge(){
    const L = glass.tea + glass.water, r = L > 0 ? glass.tea/L : 0;
    const target = TYPES[cust().type].target;
    $("ro-ratio").textContent = "%" + Math.round(r*100);
    $("ro-level").textContent = "%" + Math.min(100, Math.round(L*100));
    $("needle").style.left = (Math.min(r, GMAX)/GMAX*100) + "%";
    const adv = $("advice");
    let msg, cls = "warn";
    if (L < .03) msg = "Demlikle başla, sonra suyla aç.";
    else if (r > target + TOL) msg = L > .8 ? "Fazla demli ama bardak dolu. Az su ekleyip hemen servis et." : "Fazla demli, biraz su ekle.";
    else if (r < target - TOL) msg = L > .8 ? "Açık kaldı ama bardak dolu. Bir damla dem koyup servis et." : "Açık kaldı, biraz dem ekle.";
    else if (L < .78){ msg = "Renk tamam. Çizgiye kadar dem ve suyu sırayla azar azar ekle."; cls = "ok"; }
    else if (L > .92) msg = "Renk tamam ama dudak payı azaldı, hemen servis et!";
    else { msg = "Renk de doluluk da tamam, servis et!"; cls = "ok"; }
    if (adv.textContent !== msg) adv.textContent = msg;
    adv.className = "advice " + cls;
  }

  /* ---------- oyun durumu ---------- */
  function shuffle(a){ a = a.slice(); for (let i = a.length-1; i > 0; i--){ const j = Math.random()*(i+1)|0; [a[i],a[j]] = [a[j],a[i]]; } return a; }
  const cust = () => order[S.idx];

  function newGlass(){
    glass = {tea:0, water:0, phase:"pour", spilled:false, patience:1, touched:false};
    active.tea = active.water = false;
    $("btn-tea").classList.remove("on"); $("btn-water").classList.remove("on");
    $("result").hidden = true;
    $("btn-serve").disabled = false;
    $("patience").style.transform = "scaleX(1)";
    $("patience").classList.remove("low");
    renderSlip(); renderStats();
  }
  function renderSlip(){
    const c = cust(), t = TYPES[c.type];
    $("slip-no").textContent = "No. " + String(S.idx+1).padStart(2,"0");
    $("who").textContent = c.name;
    $("note").textContent = c.note;
    $("order-label").textContent = t.label;
    $("recipe").textContent = t.recipe;
    $("target-swatch").style.background = solid(t.target);
    $("ro-target").textContent = "%" + Math.round(t.target*100);
    $("band").style.left = ((t.target - TOL)/GMAX*100) + "%";
    $("band").style.width = (2*TOL/GMAX*100) + "%";
    renderGauge();
  }
  function renderStats(){
    $("st-round").textContent = Math.min(S.idx+1, ROUNDS) + "/" + ROUNDS;
    $("st-score").textContent = S.total;
    $("st-best").textContent = best === null ? "—" : best;
  }
  function toast(msg){ $("toast").textContent = msg; toastTimer = 2.2; }

  function serve(){
    if (glass.phase !== "pour") return;
    const L = glass.tea + glass.water;
    if (L < .05 && !glass.spilled){ toast("Bardak boş. Önce demlikten biraz koy."); return; }
    active.tea = active.water = false;
    $("btn-tea").classList.remove("on"); $("btn-water").classList.remove("on");

    const target = TYPES[cust().type].target;
    const r = L > 0 ? glass.tea / L : 0;
    let fill = 0, color = 0, tip = 0;
    if (!glass.spilled){
      fill = Math.max(0, 50*(1 - Math.abs(L - .85)/.25));
      color = Math.max(0, 50*(1 - Math.abs(r - target)/.18)) * Math.min(1, L/.5);
      fill = Math.round(fill); color = Math.round(color);
      if (fill + color >= 60) tip = Math.round(15*glass.patience);
    }
    const score = fill + color + tip;
    S.total += score;
    S.history.push({score, r, spilled:glass.spilled});
    glass.phase = "result";
    $("btn-serve").disabled = true;
    renderStats();

    let say;
    if (glass.spilled) say = "Taşırdın, tepsi göle döndü!";
    else if (score >= 85) say = "Eline sağlık, tam kıvamında.";
    else if (score >= 65) say = "Olmuş, olmuş.";
    else if (score >= 40) say = "İçilir… herhalde.";
    else say = "Bunu kim içer?";

    const tips = [];
    if (!glass.spilled){
      if (L < .75) tips.push("Bardak az doldu");
      else if (L > .93) tips.push("Dudak payı kalmadı");
      if (r < target - .06) tips.push("çay açık kaçmış");
      else if (r > target + .06) tips.push("fazla demli olmuş");
    }
    const hint = tips.length ? tips.join(", ").replace(/^./, s => s.toUpperCase()) + "." : (glass.spilled ? "Suyu çizgiye yaklaşınca yavaş ver." : "Müşteri memnun ayrıldı.");
    const lastRound = S.idx === ROUNDS - 1;

    $("result").innerHTML = `
      <div class="big">${score}</div>
      <p class="say">${say}</p>
      <dl class="breakdown">
        <dt>Doluluk</dt><dd>${fill}/50</dd>
        <dt>Renk</dt><dd>${color}/50</dd>
        <dt>Çabukluk tüyosu</dt><dd>+${tip}</dd>
      </dl>
      <div class="compare">
        <span><i class="swatch" style="background:${solid(target)}"></i>İstenen · dem %${Math.round(target*100)}</span>
        <span><i class="swatch" style="background:${glass.spilled ? "transparent" : solid(r)}"></i>Seninki · dem %${Math.round(r*100)}</span>
      </div>
      <p class="hint">${hint}</p>
      <button class="next" id="btn-next" type="button">${lastRound ? "Mesaiyi bitir" : "Sıradaki müşteri"} <kbd>Boşluk</kbd></button>`;
    $("result").hidden = false;
    $("btn-next").addEventListener("click", next);
    $("btn-next").focus({preventScroll:true});
  }

  function next(){
    if (glass.phase === "done"){ restart(); return; }
    if (glass.phase !== "result") return;
    if (S.idx >= ROUNDS - 1){ finish(); return; }
    S.idx++;
    newGlass();
    $("btn-tea").focus({preventScroll:true});
  }

  function finish(){
    glass.phase = "done";
    const isBest = best === null || S.total > best;
    if (isBest){ best = S.total; try { localStorage.setItem(BEST_KEY, String(best)); } catch(e) {} }
    renderStats();
    const t = S.total;
    const rank = t >= 900 ? "Çay ocağının ustası" : t >= 700 ? "Kalfa oldun" : t >= 450 ? "Hâlâ çıraksın" : "Bugünlük çaylar bizden";
    $("result").innerHTML = `
      <p class="hint">Mesai bitti · ${ROUNDS} müşteri</p>
      <div class="big">${t}</div>
      <p class="say">${rank}${isBest ? " · yeni rekor!" : ""}</p>
      <div class="glasses">${S.history.map(h => `<span><i class="swatch" style="background:${h.spilled ? "transparent;box-shadow:inset 0 0 0 2px #E0613F" : solid(h.r)}"></i>${h.score}</span>`).join("")}</div>
      <button class="next" id="btn-next" type="button">Yeni mesai <kbd>Boşluk</kbd></button>`;
    $("result").hidden = false;
    $("btn-next").addEventListener("click", restart);
    $("btn-next").focus({preventScroll:true});
  }

  function restart(){
    S = {idx:0, total:0, history:[]};
    order = shuffle(CUSTOMERS);
    newGlass();
  }

  /* ---------- kontroller ---------- */
  function setPour(src, on){
    if (on && glass.phase !== "pour") return;
    active[src] = on;
    if (!on) hold[src] = 0;
    $(src === "tea" ? "btn-tea" : "btn-water").classList.toggle("on", on);
  }
  [["btn-tea","tea"],["btn-water","water"]].forEach(([id, src]) => {
    const b = $(id);
    b.addEventListener("pointerdown", e => { e.preventDefault(); try { b.setPointerCapture(e.pointerId); } catch(_){} setPour(src, true); });
    ["pointerup","pointercancel","lostpointercapture"].forEach(ev => b.addEventListener(ev, () => setPour(src, false)));
    b.addEventListener("contextmenu", e => e.preventDefault());
  });
  $("btn-serve").addEventListener("click", serve);

  window.addEventListener("keydown", e => {
    const k = e.key.toLowerCase();
    if (k === "d" || e.key === "ArrowLeft"){ e.preventDefault(); if (!e.repeat) setPour("tea", true); }
    else if (k === "s" || e.key === "ArrowRight"){ e.preventDefault(); if (!e.repeat) setPour("water", true); }
    else if (e.key === " " || e.key === "Enter"){
      e.preventDefault(); if (e.repeat) return;
      glass.phase === "pour" ? serve() : next();
    }
  });
  window.addEventListener("keyup", e => {
    const k = e.key.toLowerCase();
    if (k === "d" || e.key === "ArrowLeft") setPour("tea", false);
    if (k === "s" || e.key === "ArrowRight") setPour("water", false);
  });
  window.addEventListener("blur", () => { setPour("tea", false); setPour("water", false); });

  /* ---------- döngü ---------- */
  function update(dt){
    time += dt;
    if (toastTimer > 0){ toastTimer -= dt; if (toastTimer <= 0) $("toast").textContent = ""; }
    if (glass.phase !== "pour") return;
    for (const src of ["tea","water"]){
      if (!active[src]) continue;
      hold[src] += dt;
      // kısa dokunuş = bir damla, basılı tuttukça hızlanır
      const rate = .07 + .23*Math.min(hold[src]/1.8, 1);
      glass[src] += rate*dt;
      glass.touched = true;
    }
    if (glass.touched) glass.patience = Math.max(0, glass.patience - dt/cust().patience);
    const L = glass.tea + glass.water;
    renderGauge();
    const bar = $("patience");
    bar.style.transform = `scaleX(${glass.patience})`;
    bar.classList.toggle("low", glass.patience < .3);
    if (L > 1.01){ glass.spilled = true; serve(); }
  }

  function draw(){
    const scale = cv.width / W;
    ctx.setTransform(scale, 0, 0, scale, 0, 0);
    ctx.clearRect(0, 0, W, H);

    const L = Math.min(1, glass.tea + glass.water);
    const r = L > 0 ? glass.tea/(glass.tea + glass.water) : 0;
    const liquid = mix(r);

    // lamba ışığı
    const g = ctx.createRadialGradient(CX, 230, 10, CX, 230, 190);
    g.addColorStop(0, "rgba(217,164,65,.10)"); g.addColorStop(1, "rgba(217,164,65,0)");
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);

    // tabak
    ctx.fillStyle = "rgba(0,0,0,.28)";
    ctx.beginPath(); ctx.ellipse(CX, YB+22, 122, 22, 0, 0, Math.PI*2); ctx.fill();
    ctx.fillStyle = "#EDE5D6";
    ctx.beginPath(); ctx.ellipse(CX, YB+12, 118, 24, 0, 0, Math.PI*2); ctx.fill();
    ctx.strokeStyle = "#B8321A"; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.ellipse(CX, YB+12, 112, 21, 0, 0, Math.PI*2); ctx.stroke();
    ctx.fillStyle = "#D8CDB9";
    ctx.beginPath(); ctx.ellipse(CX, YB+10, 60, 11, 0, 0, Math.PI*2); ctx.fill();

    // taşma birikintisi
    if (glass.spilled){
      ctx.fillStyle = rgba(liquid, .85);
      ctx.beginPath(); ctx.ellipse(CX+10, YB+14, 96, 17, 0, 0, Math.PI*2); ctx.fill();
    }

    // bardak gövdesi
    glassPath(0);
    ctx.fillStyle = "rgba(241,230,210,.06)"; ctx.fill();

    // çay
    if (L > 0){
      const ys = yForLevel(L);
      ctx.save(); glassPath(3.5); ctx.clip();
      ctx.fillStyle = rgba(liquid);
      ctx.fillRect(0, ys, W, YLB - ys);
      const sh = ctx.createLinearGradient(CX-60, 0, CX+60, 0);
      sh.addColorStop(0, "rgba(0,0,0,.22)"); sh.addColorStop(.35, "rgba(0,0,0,0)"); sh.addColorStop(1, "rgba(0,0,0,.18)");
      ctx.fillStyle = sh; ctx.fillRect(0, ys, W, YLB - ys);
      ctx.restore();
      const sw = Math.max(0, hw(tAt(ys)) - 3.5);
      ctx.fillStyle = "rgba(255,226,176,.28)";
      ctx.beginPath(); ctx.ellipse(CX, ys, sw, 3.2, 0, 0, Math.PI*2); ctx.fill();
    }

    // kalın dip
    ctx.fillStyle = "rgba(241,230,210,.16)";
    ctx.beginPath(); ctx.ellipse(CX, YB-4, hw(0)-2, 6, 0, 0, Math.PI*2); ctx.fill();

    // hatlar ve parlama
    glassPath(0);
    ctx.strokeStyle = "rgba(241,230,210,.55)"; ctx.lineWidth = 1.6; ctx.stroke();
    ctx.beginPath(); ctx.ellipse(CX, YT, hw(1), 5, 0, 0, Math.PI*2); ctx.stroke();
    ctx.strokeStyle = "rgba(255,255,255,.28)"; ctx.lineWidth = 3; ctx.lineCap = "round";
    ctx.beginPath();
    for (let t = .64; t <= .94; t += .02){ const y = YB - t*(YB-YT); const x = CX - hw(t) + 9; t === .64 ? ctx.moveTo(x,y) : ctx.lineTo(x,y); }
    ctx.stroke();

    // hedef çizgisi
    const yt = yForLevel(.85), wt = hw(tAt(yt));
    ctx.strokeStyle = "#D9A441"; ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(CX - wt - 18, yt); ctx.lineTo(CX - wt - 6, yt);
    ctx.moveTo(CX + wt + 6, yt);  ctx.lineTo(CX + wt + 18, yt);
    ctx.stroke();
    ctx.fillStyle = "#D9A441"; ctx.font = "500 11px Onest, 'Segoe UI', sans-serif"; ctx.textBaseline = "middle";
    ctx.fillText("çizgi", CX + wt + 23, yt);

    // döküm
    const pouring = glass.phase === "pour" && (active.tea || active.water);
    if (pouring){
      const ys = L > 0 ? yForLevel(L) : YLB;
      const wob = RM ? 0 : Math.sin(time*28)*.9;
      const src = active.tea ? "tea" : "water";
      const col = src === "tea" ? "rgba(74,18,8,.96)" : "rgba(220,236,234,.6)";
      const lw = src === "tea" ? 4.5 : 6.5;
      const x0 = CX + 14;
      ctx.strokeStyle = src === "tea" ? "#B98A3A" : "#AFC2C0"; ctx.lineWidth = 10; ctx.lineCap = "round";
      ctx.beginPath(); ctx.moveTo(x0 + 70, -6); ctx.lineTo(x0 + 6, 14); ctx.stroke();
      ctx.strokeStyle = col; ctx.lineWidth = lw;
      ctx.beginPath(); ctx.moveTo(x0, 16); ctx.quadraticCurveTo(x0 - 6 + wob, 60, x0 - 8 + wob, ys); ctx.stroke();
      if (active.tea && active.water){
        ctx.strokeStyle = "rgba(220,236,234,.6)"; ctx.lineWidth = 6;
        ctx.beginPath(); ctx.moveTo(CX - 30, -4); ctx.quadraticCurveTo(CX - 16 - wob, 60, CX - 12 - wob, ys); ctx.stroke();
      }
      if (!RM){
        ctx.strokeStyle = "rgba(255,230,190,.35)"; ctx.lineWidth = 1.2;
        const rr = (time*40) % 14;
        ctx.beginPath(); ctx.ellipse(x0 - 8, ys, 6 + rr, 2 + rr*.15, 0, 0, Math.PI*2); ctx.stroke();
      }
    }

    // buhar
    if (!RM && L > .25 && !pouring && !glass.spilled){
      ctx.lineWidth = 2; ctx.lineCap = "round";
      for (let i = 0; i < 3; i++){
        const ph = time*.9 + i*2.1, a = .10 + .06*Math.sin(ph*1.3);
        ctx.strokeStyle = `rgba(241,230,210,${a.toFixed(3)})`;
        const x = CX - 22 + i*22, drift = Math.sin(ph)*8;
        ctx.beginPath(); ctx.moveTo(x, YT - 8);
        ctx.bezierCurveTo(x + drift, YT - 30, x - drift, YT - 48, x + drift*.6, YT - 70);
        ctx.stroke();
      }
    }
  }

  function resize(){
    const box = cv.parentElement.getBoundingClientRect();
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    cv.width = Math.round(box.width * dpr);
    cv.height = Math.round(box.width * dpr * H / W);
  }
  window.addEventListener("resize", resize);

  function frame(now){
    const dt = Math.min(.05, (now - last)/1000); last = now;
    update(dt); draw();
    requestAnimationFrame(frame);
  }

  restart();
  resize();
  requestAnimationFrame(frame);
})();
