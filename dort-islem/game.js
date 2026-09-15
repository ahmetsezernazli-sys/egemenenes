/* Dört İşlem — hız turu ve hedef sayı */
(function(){
  "use strict";

  const SPEED_TIME = 60, ROUNDS = 5;
  const SAVE_KEY = "dort-islem", SOUND_KEY = "dort-islem-ses";
  const LEVEL_NAMES = ["Kolay", "Orta", "Zor"];
  const OP_SIGN = {"+":"+", "-":"−", "*":"×", "/":"÷"};
  const OP_NAME = {"+":"Toplama", "-":"Çıkarma", "*":"Çarpma", "/":"Bölme"};
  const RM = window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches;

  const $ = id => document.getElementById(id);
  const ri = (a, b) => a + Math.floor(Math.random()*(b - a + 1));
  const pick = a => a[Math.floor(Math.random()*a.length)];
  const fmt = s => `${Math.floor(s/60)}:${String(Math.max(0, Math.ceil(s) % 60)).padStart(2, "0")}`;

  let save = {speed:{}, target:0, lvl:1, ops:["+", "-", "*", "/"], tlim:120};
  try { const s = JSON.parse(localStorage.getItem(SAVE_KEY)); if (s) save = Object.assign(save, s); } catch(e) {}
  const persist = () => { try { localStorage.setItem(SAVE_KEY, JSON.stringify(save)); } catch(e) {} };
  let soundOn = true;
  try { soundOn = localStorage.getItem(SOUND_KEY) !== "0"; } catch(e) {}

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
  const sfx = {
    key(){ tone(900, .03, "square", .02); },
    good(streak){ const f = 660*Math.pow(1.06, Math.min(streak, 12)); tone(f, .12, "triangle", .1); tone(f*1.5, .14, "triangle", .07, null, .06); },
    bad(){ tone(220, .25, "sawtooth", .06, 160); },
    tick(){ tone(1200, .04, "sine", .04); },
    make(){ tone(520, .08, "triangle", .08, 700); },
    hit(){ [523.25, 659.25, 783.99, 1046.5, 1318.5].forEach((f, i) => tone(f, .2, "triangle", .12, null, i*.08)); },
    end(){ [784, 659, 523].forEach((f, i) => tone(f, .2, "triangle", .1, null, i*.12)); }
  };
  function renderSound(){
    $("ic-on").hidden = !soundOn; $("ic-off").hidden = soundOn;
    $("sound").setAttribute("aria-label", soundOn ? "Sesi kapat" : "Sesi aç");
    $("sound").setAttribute("aria-pressed", String(soundOn));
  }
  $("sound").addEventListener("click", () => { soundOn = !soundOn; try { localStorage.setItem(SOUND_KEY, soundOn ? "1" : "0"); } catch(e) {} renderSound(); });
  renderSound();

  /* ---------- ekranlar ---------- */
  let screen = "home";
  function show(id){
    screen = id;
    ["home", "speed", "speed-end", "target", "target-end"].forEach(s => $(s).hidden = s !== id);
    $("home-btn").hidden = id === "home";
  }
  $("home-btn").addEventListener("click", goHome);
  function goHome(){ speed = null; tgt = null; renderHome(); show("home"); }

  function renderHome(){
    ["+", "-", "*", "/"].forEach((o, i) => { $(["op-add", "op-sub", "op-mul", "op-div"][i]).checked = save.ops.includes(o); });
    $("lvl-" + save.lvl).checked = true;
    const tl = $("tlim-" + save.tlim); if (tl) tl.checked = true;
    const best = save.speed[save.lvl];
    $("speed-record").textContent = best ? `${LEVEL_NAMES[save.lvl]} rekoru: ${best.score} puan (${best.correct} doğru)` : "";
    $("target-record").textContent = save.target ? `Rekor: ${save.target} / ${ROUNDS*10} puan` : "";
  }
  function readHome(){
    const ops = ["+", "-", "*", "/"].filter((o, i) => $(["op-add", "op-sub", "op-mul", "op-div"][i]).checked);
    save.ops = ops.length ? ops : ["+"];
    save.lvl = +document.querySelector('input[name="lvl"]:checked').value;
    save.tlim = +document.querySelector('input[name="tlim"]:checked').value;
    persist();
  }
  document.querySelectorAll('#home input').forEach(el => el.addEventListener("change", () => { readHome(); renderHome(); }));

  /* ---------- hız turu ---------- */
  function makeQuestion(op, lvl){
    let a, b, ans;
    if (op === "+"){
      const r = [[1, 20], [10, 99], [100, 999]][lvl]; a = ri(r[0], r[1]); b = ri(r[0], r[1]); ans = a + b;
    } else if (op === "-"){
      const r = [[2, 20], [20, 99], [100, 999]][lvl]; a = ri(r[0], r[1]); b = ri(lvl ? 10 : 1, a); ans = a - b;
    } else if (op === "*"){
      if (lvl === 0){ a = ri(2, 10); b = ri(2, 10); }
      else if (lvl === 1){ a = ri(3, 9); b = ri(12, 30); }
      else { a = ri(11, 25); b = ri(11, 25); }
      if (Math.random() < .5) [a, b] = [b, a];
      ans = a*b;
    } else {
      let q;
      if (lvl === 0){ b = ri(2, 10); q = ri(1, 10); }
      else if (lvl === 1){ b = ri(3, 12); q = ri(3, 15); }
      else { b = ri(6, 19); q = ri(11, 30); }
      a = b*q; ans = q;
    }
    return {op, a, b, ans, text:`${a} ${OP_SIGN[op]} ${b}`};
  }

  let speed = null;
  function startSpeed(){
    readHome(); audio();
    speed = {lvl:save.lvl, ops:save.ops.slice(), time:SPEED_TIME, score:0, streak:0, bestStreak:0, correct:0, wrong:0, input:"", q:null, per:{}, mistakes:[], lastTick:SPEED_TIME, lock:0, over:false};
    speed.ops.forEach(o => speed.per[o] = {c:0, w:0, t:0});
    nextQuestion();
    show("speed");
    renderSpeed();
  }
  function nextQuestion(){
    let q;
    do { q = makeQuestion(pick(speed.ops), speed.lvl); } while (speed.q && q.text === speed.q.text);
    speed.q = q; speed.qStart = speed.time; speed.input = "";
    $("sp-q").classList.remove("good", "bad");
  }
  const mult = () => 1 + Math.floor(speed.streak/5);
  function renderSpeed(){
    $("sp-score").textContent = speed.score;
    $("sp-streak").textContent = `×${mult()}`;
    $("sp-expr").textContent = speed.q.text;
    $("sp-answer").textContent = speed.input;
    const f = Math.max(0, speed.time/SPEED_TIME);
    const bar = $("sp-timer"); bar.style.width = (f*100) + "%"; bar.classList.toggle("low", speed.time <= 10);
    $("sp-time").textContent = Math.ceil(Math.max(0, speed.time));
  }
  function speedKey(k){
    if (!speed || speed.over || speed.lock > 0) return;
    if (/^\d$/.test(k)){
      if (speed.input.length >= 4) return;
      speed.input = (speed.input === "0" ? "" : speed.input) + k; sfx.key();
      if (+speed.input === speed.q.ans) answer(true);
    } else if (k === "del"){ speed.input = speed.input.slice(0, -1); }
    else if (k === "ok"){ if (speed.input === "") return; answer(+speed.input === speed.q.ans); }
    else if (k === "skip"){ answer(false, true); }
    renderSpeed();
  }
  function answer(ok, skipped){
    const q = speed.q, per = speed.per[q.op];
    per.t += Math.max(0, speed.qStart - speed.time);
    if (ok){
      speed.streak++; speed.bestStreak = Math.max(speed.bestStreak, speed.streak);
      const pts = 10*mult(); speed.score += pts; speed.correct++; per.c++;
      sfx.good(speed.streak);
      $("sp-q").classList.add("good");
      const fb = $("sp-feedback"); fb.className = "feedback good"; fb.textContent = speed.streak % 5 === 0 ? `+${pts} · ${speed.streak} seri! Çarpan ×${mult()}` : `+${pts}`;
      speed.lock = .18;
      speed.after = () => { nextQuestion(); renderSpeed(); };
    } else {
      speed.streak = 0; speed.wrong++; per.w++;
      speed.mistakes.push({text:q.text, ans:q.ans, given:skipped ? null : speed.input});
      sfx.bad();
      const el = $("sp-q"); el.classList.remove("bad"); void el.offsetWidth; el.classList.add("bad");
      const fb = $("sp-feedback"); fb.className = "feedback bad"; fb.textContent = `${q.text} = ${q.ans}`;
      speed.lock = .7;
      speed.after = () => { nextQuestion(); renderSpeed(); };
    }
  }
  function finishSpeed(){
    speed.over = true; sfx.end();
    const s = speed, total = s.correct + s.wrong, acc = total ? Math.round(s.correct/total*100) : 0;
    const prev = save.speed[s.lvl];
    const isNew = s.score > 0 && (!prev || s.score > prev.score);
    if (isNew){ save.speed[s.lvl] = {score:s.score, correct:s.correct}; persist(); }
    $("se-level").textContent = `${LEVEL_NAMES[s.lvl]} · ${s.ops.map(o => OP_SIGN[o]).join(" ")}`;
    $("se-score").textContent = `${s.score} puan`;
    $("se-note").textContent = isNew ? (prev ? `Yeni rekor! Önceki: ${prev.score}` : "İlk rekor kaydedildi!") : prev ? `Rekor: ${prev.score}` : "";
    $("se-note").style.color = isNew ? "var(--green)" : "var(--muted)";
    $("se-correct").textContent = s.correct; $("se-wrong").textContent = s.wrong; $("se-acc").textContent = acc + "%"; $("se-streak").textContent = s.bestStreak;
    let rows = `<tr><th>İşlem</th><th>Doğru</th><th>Yanlış</th><th>İsabet</th><th>Ort. süre</th></tr>`;
    for (const o of s.ops){
      const p = s.per[o], n = p.c + p.w, a = n ? Math.round(p.c/n*100) : 0;
      rows += `<tr><td>${OP_SIGN[o]}</td><td>${p.c}</td><td>${p.w}</td><td><span class="bar-cell"><i style="--p:${a}%"></i>${n ? a + "%" : "—"}</span></td><td>${n ? (p.t/n).toFixed(1) + " sn" : "—"}</td></tr>`;
    }
    $("se-ops").innerHTML = rows;
    const m = $("se-mistakes"); m.innerHTML = "";
    if (s.mistakes.length){
      const h = document.createElement("p"); h.className = "mistakes-title"; h.textContent = "Tekrar bakmaya değer:"; m.appendChild(h);
      const ul = document.createElement("ul"); ul.className = "mistakes";
      s.mistakes.slice(-12).forEach(x => { const li = document.createElement("li"); li.innerHTML = `${x.text} = <b>${x.ans}</b>${x.given ? ` <s>${x.given}</s>` : " (geçildi)"}`; ul.appendChild(li); });
      m.appendChild(ul);
    }
    show("speed-end"); $("se-again").focus();
  }
  $("speed-start").addEventListener("click", startSpeed);
  $("se-again").addEventListener("click", startSpeed);
  $("se-home").addEventListener("click", goHome);
  $("keypad").addEventListener("click", e => { const b = e.target.closest("button"); if (b){ audio(); speedKey(b.dataset.k); } });

  /* ---------- hedef sayı: çözücü ---------- */
  // Tüm ulaşılabilir değerleri ve her biri için en az sayı kullanan ifadeyi bulur
  function solveAll(nums){
    const best = new Map(), seen = new Set();
    function note(it){ const b = best.get(it.v); if (!b || it.n < b.n || (it.n === b.n && it.e.length < b.e.length)) best.set(it.v, it); }
    function rec(items){
      for (const it of items) note(it);
      if (items.length < 2) return;
      const key = items.map(i => i.v).sort((a, b) => a - b).join(",");
      if (seen.has(key)) return;
      seen.add(key);
      for (let i = 0; i < items.length; i++) for (let j = i + 1; j < items.length; j++){
        const A = items[i].v >= items[j].v ? items[i] : items[j], B = A === items[i] ? items[j] : items[i];
        const rest = items.filter((_, k) => k !== i && k !== j), n = A.n + B.n;
        const add = (v, op) => rec(rest.concat([{v, n, e:`(${A.e} ${op} ${B.e})`}]));
        add(A.v + B.v, "+");
        if (B.v !== 1) add(A.v*B.v, "×");
        if (A.v !== B.v) add(A.v - B.v, "−");
        if (B.v !== 1 && A.v % B.v === 0) add(A.v/B.v, "÷");
      }
    }
    rec(nums.map(v => ({v, n:1, e:String(v)})));
    return best;
  }
  const strip = e => e.startsWith("(") && e.endsWith(")") ? e.slice(1, -1) : e;
  function makeRound(){
    for (let tries = 0; tries < 30; tries++){
      const nums = [ri(1, 9), ri(1, 9), ri(1, 9), ri(1, 9), ri(1, 9), pick([10, 25, 50, 75, 100])];
      const best = solveAll(nums);
      const pool = [...best.values()].filter(x => x.v >= 101 && x.v <= 999 && x.n >= 3);
      if (pool.length < 20) continue;
      const hard = pool.filter(x => x.n >= 4);
      const t = pick(hard.length > 10 && Math.random() < .7 ? hard : pool);
      return {nums, target:t.v, best, solution:strip(t.e)};
    }
    return {nums:[3, 7, 5, 8, 2, 25], target:219, best:solveAll([3, 7, 5, 8, 2, 25]), solution:"(25 × 8) + (7 × 3) − 2"};
  }

  /* ---------- hedef sayı: oyun ---------- */
  let tgt = null;
  function startTarget(){
    readHome(); audio();
    tgt = {round:0, total:0, scores:[]};
    nextRound();
  }
  function nextRound(){
    const r = makeRound();
    Object.assign(tgt, {nums:r.nums, target:r.target, best:r.best, solution:r.solution, tiles:r.nums.map((v, i) => ({id:i, v, made:false})), steps:[], sel:null, op:null, time:save.tlim || 0, limited:!!save.tlim, done:false, closest:null, closestExpr:"", exprs:{}, lastTick:null});
    tgt.tiles.forEach(t => tgt.exprs[t.id] = String(t.v));
    tgt.nextId = 6;
    tgt.round++;
    show("target");
    $("tg-feedback").textContent = "Bir sayı seç, sonra işlem, sonra ikinci sayı.";
    $("tg-feedback").className = "feedback";
    renderTarget(true);
  }
  function renderTarget(pop){
    $("tg-round").textContent = `${tgt.round}/${ROUNDS}`;
    $("tg-target").textContent = tgt.target;
    $("tg-time").textContent = tgt.limited ? fmt(tgt.time) : "∞";
    const box = $("tg-tiles"); box.innerHTML = "";
    tgt.tiles.forEach((t, k) => {
      const b = document.createElement("button");
      b.type = "button"; b.className = "tile" + (t.made ? " made" : "") + (tgt.sel === t.id ? " sel" : "") + (t.v === tgt.target ? " hit" : "") + (pop && t.fresh ? " pop" : "");
      b.textContent = t.v; b.setAttribute("aria-label", `${t.v}${t.made ? ", ara sonuç" : ""}`);
      b.addEventListener("click", () => { audio(); tapTile(t.id); });
      box.appendChild(b);
      t.fresh = false;
    });
    document.querySelectorAll("#tg-ops button").forEach(b => { b.classList.toggle("sel", tgt.op === b.dataset.op); b.disabled = tgt.sel === null; });
    const st = $("tg-steps"); st.innerHTML = "";
    tgt.steps.forEach(s => { const li = document.createElement("li"); li.textContent = `${s.a} ${OP_SIGN[s.op]} ${s.b} = ${s.r}`; st.appendChild(li); });
    $("tg-closest").textContent = tgt.closest == null ? "En yakın: —" : `En yakın: ${tgt.closest} (fark ${Math.abs(tgt.closest - tgt.target)})`;
    $("tg-undo").disabled = !tgt.steps.length;
  }
  function tapTile(id){
    if (!tgt || tgt.done) return;
    if (tgt.sel === null){ tgt.sel = id; }
    else if (tgt.sel === id){ tgt.sel = null; tgt.op = null; }
    else if (tgt.op === null){ tgt.sel = id; }
    else combine(tgt.sel, tgt.op, id);
    renderTarget(true);
  }
  function combine(idA, op, idB){
    const A = tgt.tiles.find(t => t.id === idA), B = tgt.tiles.find(t => t.id === idB);
    let r;
    if (op === "+") r = A.v + B.v;
    else if (op === "-") r = A.v - B.v;
    else if (op === "*") r = A.v*B.v;
    else r = B.v === 0 ? NaN : A.v/B.v;
    const fb = $("tg-feedback");
    if (!(r > 0) || !Number.isInteger(r)){
      fb.className = "feedback bad";
      fb.textContent = op === "-" ? "Sonuç pozitif olmalı: büyük sayıdan küçüğü çıkar." : "Bölme tam çıkmalı.";
      sfx.bad(); tgt.op = null; return;
    }
    const id = tgt.nextId++;
    tgt.exprs[id] = `(${tgt.exprs[idA]} ${OP_SIGN[op]} ${tgt.exprs[idB]})`;
    const iA = tgt.tiles.indexOf(A), iB = tgt.tiles.indexOf(B), idx = Math.min(iA, iB);
    tgt.steps.push({a:A.v, b:B.v, op, r, removed:[[iA, A], [iB, B]].sort((x, y) => x[0] - y[0]), made:{id, v:r, made:true}, idx});
    tgt.tiles = tgt.tiles.filter(t => t !== A && t !== B);
    tgt.tiles.splice(idx, 0, {id, v:r, made:true, fresh:true});
    tgt.sel = id; tgt.op = null;
    sfx.make();
    trackClosest(r, tgt.exprs[id]);
    if (r === tgt.target){ fb.className = "feedback good"; fb.textContent = "Tam isabet!"; sfx.hit(); finishRound(); return; }
    fb.className = "feedback"; fb.textContent = `${A.v} ${OP_SIGN[op]} ${B.v} = ${r}`;
  }
  function trackClosest(v, expr){
    if (tgt.closest == null || Math.abs(v - tgt.target) < Math.abs(tgt.closest - tgt.target)){ tgt.closest = v; tgt.closestExpr = expr; }
  }
  function undo(){
    if (!tgt || tgt.done || !tgt.steps.length) return;
    const s = tgt.steps.pop();
    tgt.tiles = tgt.tiles.filter(t => t.id !== s.made.id);
    for (const [i, t] of s.removed) tgt.tiles.splice(i, 0, t);   // kartlar eski yerlerine döner
    tgt.sel = null; tgt.op = null;
    renderTarget(false);
  }
  function resetRound(){ while (tgt && tgt.steps.length) undo(); }
  function points(diff){ return diff === 0 ? 10 : diff <= 5 ? 7 : diff <= 10 ? 5 : diff <= 20 ? 2 : 0; }
  function finishRound(){
    if (tgt.done) return;
    // tek sayılar da "en yakın" sayılır
    tgt.nums.forEach(v => trackClosest(v, String(v)));
    tgt.done = true;
    const diff = Math.abs(tgt.closest - tgt.target), pts = points(diff);
    tgt.total += pts; tgt.scores.push(pts);
    const last = tgt.round >= ROUNDS;
    $("te-round").textContent = `${tgt.round}. tur · hedef ${tgt.target}`;
    $("te-title").textContent = diff === 0 ? "Tam isabet! +10" : `${diff} fark · +${pts}`;
    $("te-mine").textContent = `${strip(tgt.closestExpr)} = ${tgt.closest}`;
    $("te-solution").textContent = `${tgt.solution} = ${tgt.target}`;
    const note = $("te-note");
    if (last){
      const isNew = tgt.total > (save.target || 0);
      if (isNew){ save.target = tgt.total; persist(); }
      note.textContent = `Toplam: ${tgt.total} / ${ROUNDS*10}` + (isNew ? " · Yeni rekor!" : save.target ? ` · Rekor ${save.target}` : "");
      note.style.color = isNew ? "var(--green)" : "var(--ink)";
      $("te-next").textContent = "Yeniden oyna";
    } else {
      note.textContent = `Toplam: ${tgt.total} puan`; note.style.color = "var(--ink)";
      $("te-next").textContent = "Sonraki tur";
    }
    if (diff !== 0) sfx.end();
    setTimeout(() => { if (tgt && tgt.done){ show("target-end"); $("te-next").focus(); } }, diff === 0 ? 700 : 150);
  }
  $("target-start").addEventListener("click", startTarget);
  $("tg-ops").addEventListener("click", e => {
    const b = e.target.closest("button"); if (!b || !tgt || tgt.done || tgt.sel === null) return;
    tgt.op = tgt.op === b.dataset.op ? null : b.dataset.op; sfx.key(); renderTarget(false);
  });
  $("tg-undo").addEventListener("click", undo);
  $("tg-reset").addEventListener("click", resetRound);
  $("tg-done").addEventListener("click", () => { if (tgt && !tgt.done) finishRound(); });
  $("te-next").addEventListener("click", () => { if (tgt.round >= ROUNDS) startTarget(); else nextRound(); });
  $("te-home").addEventListener("click", goHome);

  /* ---------- klavye ---------- */
  window.addEventListener("keydown", e => {
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    if (screen === "speed"){
      if (/^\d$/.test(e.key)){ e.preventDefault(); audio(); speedKey(e.key); }
      else if (e.key === "Backspace"){ e.preventDefault(); speedKey("del"); }
      else if (e.key === "Enter"){ e.preventDefault(); speedKey("ok"); }
      else if (e.key === " "){ e.preventDefault(); speedKey("skip"); }
    } else if (screen === "target" && tgt && !tgt.done){
      const op = {"+":"+", "-":"-", "*":"*", "x":"*", "/":"/", ":":"/"}[e.key];
      if (op && tgt.sel !== null){ e.preventDefault(); tgt.op = op; renderTarget(false); }
      else if (/^[1-9]$/.test(e.key) && +e.key <= tgt.tiles.length){ e.preventDefault(); audio(); tapTile(tgt.tiles[+e.key - 1].id); }
      else if (e.key === "Backspace"){ e.preventDefault(); undo(); }
    } else if (e.key === "Escape" && screen !== "home"){ goHome(); }
  });

  /* ---------- zaman ---------- */
  function tick(dt){
    if (screen === "speed" && speed && !speed.over){
      if (speed.lock > 0){ speed.lock -= dt; if (speed.lock <= 0 && speed.after){ const f = speed.after; speed.after = null; f(); } }
      speed.time -= dt;
      if (speed.time <= 5 && Math.ceil(speed.time) !== speed.lastTick){ speed.lastTick = Math.ceil(speed.time); if (speed.time > 0) sfx.tick(); }
      if (speed.time <= 0){ speed.time = 0; finishSpeed(); return; }
      const bar = $("sp-timer"); bar.style.width = (speed.time/SPEED_TIME*100) + "%"; bar.classList.toggle("low", speed.time <= 10);
      $("sp-time").textContent = Math.ceil(speed.time);
    }
    if (screen === "target" && tgt && !tgt.done && tgt.limited){
      tgt.time -= dt;
      const s = Math.ceil(tgt.time);
      if (s !== tgt.lastTick){ tgt.lastTick = s; $("tg-time").textContent = fmt(Math.max(0, tgt.time)); if (tgt.time <= 10 && tgt.time > 0) sfx.tick(); }
      if (tgt.time <= 0){ $("tg-feedback").textContent = "Süre doldu!"; finishRound(); }
    }
  }
  let last = performance.now();
  function frame(now){ const dt = Math.min(.25, Math.max(0, (now - last)/1000)); last = now; tick(dt); requestAnimationFrame(frame); }
  document.addEventListener("visibilitychange", () => { last = performance.now(); });

  renderHome();
  requestAnimationFrame(frame);
})();
