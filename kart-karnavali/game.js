/* Kart Karnavalı — 2-4 kişilik renk ve sayı eşleştirme oyunu */
(function(){
  "use strict";

  const COLORS = ["Kırmızı", "Sarı", "Yeşil", "Mavi"];
  const DOT = ["#E5484D", "#FFC53D", "#3BB273", "#3D8BFD"];
  const AVATARS = ["🚀", "🎈", "🌸", "⭐"];
  const FACE = {skip:"⊘", rev:"⇄", draw2:"+2", wild:"★", wild4:"+4"};
  const SPOKEN = {skip:"pas", rev:"yön değişti", draw2:"iki çek", wild:"renk seç", wild4:"dört çek"};
  const SETTINGS_KEY = "kart-karnavali-ayar", SOUND_KEY = "kart-karnavali-ses";
  const RM = window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches;

  const $ = id => document.getElementById(id);
  const esc = s => String(s).replace(/[&<>"']/g, ch => ({"&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#39;"}[ch]));

  let settings = {players:[{name:"Enes", bot:false}, {name:"Egemen", bot:false}], hint:true, stack:false, curtain:true};
  try { const s = JSON.parse(localStorage.getItem(SETTINGS_KEY) || "null"); if (s && Array.isArray(s.players) && s.players.length >= 2) settings = Object.assign(settings, s, {players:s.players.slice(0, 4)}); } catch(e) {}
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
  function noise(dur, freq, vol){
    const a = audio(); if (!a || !soundOn) return;
    const len = Math.floor(a.sampleRate*dur), buf = a.createBuffer(1, len, a.sampleRate), d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = (Math.random()*2 - 1)*Math.pow(1 - i/len, 2);
    const s = a.createBufferSource(); s.buffer = buf;
    const f = a.createBiquadFilter(); f.type = "bandpass"; f.frequency.value = freq;
    const g = a.createGain(); g.gain.value = vol;
    s.connect(f).connect(g).connect(a.destination); s.start();
  }
  const sfx = {
    play(){ noise(.12, 2200, .3); tone(520, .08, "triangle", .06, 700); },
    draw(){ noise(.16, 1200, .25); },
    special(){ tone(660, .12, "square", .06, 990); tone(880, .16, "triangle", .07, null, .08); },
    wild(){ [523.25, 659.25, 783.99].forEach((f, i) => tone(f, .12, "triangle", .08, null, i*.06)); },
    penalty(){ tone(300, .3, "sawtooth", .07, 140); },
    last(){ [880, 1175].forEach((f, i) => tone(f, .18, "triangle", .1, null, i*.12)); },
    turn(){ tone(700, .07, "sine", .05); },
    win(){ [523.25, 659.25, 783.99, 1046.5, 1318.5].forEach((f, i) => tone(f, .28, "triangle", .13, null, i*.12)); }
  };
  const canSpeak = "speechSynthesis" in window;
  let trVoice = null;
  function pickVoice(){ trVoice = speechSynthesis.getVoices().find(v => /^tr(-|_|$)/i.test(v.lang)) || null; }
  if (canSpeak){ pickVoice(); if (speechSynthesis.addEventListener) speechSynthesis.addEventListener("voiceschanged", pickVoice); }
  function say(text, queue){
    if (!canSpeak || !soundOn || !trVoice) return;
    if (!queue) speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text); u.voice = trVoice; u.lang = trVoice.lang; u.rate = 1.02; u.pitch = 1.1;
    speechSynthesis.speak(u);
  }
  function renderSound(){
    $("ic-on").hidden = !soundOn; $("ic-off").hidden = soundOn;
    $("sound").setAttribute("aria-label", soundOn ? "Sesi kapat" : "Sesi aç");
    $("sound").setAttribute("aria-pressed", String(soundOn));
  }
  $("sound").addEventListener("click", () => { soundOn = !soundOn; try { localStorage.setItem(SOUND_KEY, soundOn ? "1" : "0"); } catch(e) {} if (!soundOn && canSpeak) speechSynthesis.cancel(); renderSound(); });
  renderSound();

  // "Sıra Enes'te" / "Sıra Anne'de"
  function locative(name){
    const low = name.toLocaleLowerCase("tr"), vowels = "aeıioöuü";
    let v = "e";
    for (let i = low.length - 1; i >= 0; i--){ if (vowels.includes(low[i])){ v = low[i]; break; } }
    const hard = "çfhkpsşt".includes(low[low.length - 1]);
    return `${name}'${hard ? "t" : "d"}${"aıou".includes(v) ? "a" : "e"}`;
  }
  const cardName = c => c.c === 4 ? SPOKEN[c.v] : `${COLORS[c.c]} ${typeof c.v === "number" ? c.v : SPOKEN[c.v]}`;

  /* ---------- oyun ---------- */
  let G = null, timers = [];
  const later = (s, fn) => timers.push({t:s, fn});
  const clearTimers = () => { timers = []; };

  function newDeck(){
    const d = [];
    for (let c = 0; c < 4; c++){
      d.push({c, v:0});
      for (let v = 1; v <= 9; v++){ d.push({c, v}); d.push({c, v}); }
      for (const v of ["skip", "rev", "draw2"]){ d.push({c, v}); d.push({c, v}); }
    }
    for (let k = 0; k < 4; k++){ d.push({c:4, v:"wild"}); d.push({c:4, v:"wild4"}); }
    return shuffle(d);
  }
  function shuffle(a){ for (let i = a.length - 1; i > 0; i--){ const j = Math.random()*(i + 1) | 0; [a[i], a[j]] = [a[j], a[i]]; } return a; }

  function newGame(){
    clearTimers();
    const deck = newDeck();
    const players = settings.players.map((p, i) => ({name:(p.name || "").trim() || (p.bot ? "Bilgisayar" : `Oyuncu ${i + 1}`), bot:!!p.bot, hand:deck.splice(0, 7), av:AVATARS[i], i}));
    let first;
    do { first = deck.pop(); if (first.c === 4) deck.unshift(first); } while (first.c === 4);
    G = {players, deck, discard:[first], color:first.c, dir:1, turn:0, pending:0, state:"play", drawn:null, seen:false};
    $("setup").hidden = true; $("end").hidden = true; $("color-pick").hidden = true;
    applyFirstCard();
    render();
    beginTurn(true);
  }
  function applyFirstCard(){
    const f = G.discard[0];
    if (f.v === "skip"){ G.turn = next(0); }
    else if (f.v === "rev"){ G.dir = -1; G.turn = next(0); }
    else if (f.v === "draw2"){ drawCards(0, 2); G.turn = next(0); }
  }
  const top = () => G.discard[G.discard.length - 1];
  const next = (from, step) => ((from + G.dir*(step || 1)) % G.players.length + G.players.length) % G.players.length;
  const cur = () => G.players[G.turn];

  function playable(card){
    if (G.pending > 0 && settings.stack){
      const t = top();
      if (t.v === "draw2") return card.v === "draw2";
      return card.v === "wild4";
    }
    if (card.c === 4) return true;
    const t = top();
    return card.c === G.color || (t.c !== 4 && card.v === t.v) || (t.c === 4 && false);
  }
  const hasPlayable = p => p.hand.some(playable);

  function beginTurn(first){
    if (G.state === "over") return;
    const p = cur();
    G.drawn = null;
    render();
    if (G.pending > 0 && !(settings.stack && p.hand.some(playable))){
      // biriken cezayı çeker ve sırayı kaybeder
      const n = G.pending; G.pending = 0;
      msg(`${p.name} ${n} kart çekiyor.`);
      say(`${p.name} ${n} kart çekiyor.`);
      sfx.penalty(); drawCards(G.turn, n); render();
      later(1.1, () => { G.turn = next(G.turn); beginTurn(); });
      return;
    }
    if (p.bot){
      msg(`${p.name} düşünüyor…`);
      later(1, botMove);
      return;
    }
    if (settings.curtain && !first && G.players.filter(q => !q.bot).length > 1){
      G.state = "curtain";
      $("curtain-av").textContent = p.av; $("curtain-name").textContent = `${locative(p.name)} sırası`;
      $("curtain").hidden = false; $("curtain-go").focus();
      say(`Sıra ${locative(p.name)}.`);
      render();
      return;
    }
    G.state = "play";
    sfx.turn();
    msg(hasPlayable(p) ? `Sıra ${locative(p.name)}! Kart oyna.` : `Sıra ${locative(p.name)}! Oynayacak kart yok, desteden çek.`);
    say(`Sıra ${locative(p.name)}.`);
    render();
  }
  $("curtain-go").addEventListener("click", () => { $("curtain").hidden = true; G.state = "play"; beginTurnAfterCurtain(); });
  function beginTurnAfterCurtain(){
    const p = cur();
    sfx.turn();
    msg(hasPlayable(p) ? `Sıra ${locative(p.name)}! Kart oyna.` : `Oynayacak kart yok, desteden çek.`);
    render();
  }

  function drawCards(pi, n){
    for (let k = 0; k < n; k++){
      if (!G.deck.length){
        const t = G.discard.pop();
        if (!G.discard.length) { G.discard.push(t); break; }
        G.deck = shuffle(G.discard.map(c => c.c === 4 ? {c:4, v:c.v} : c));
        G.discard = [t];
      }
      G.players[pi].hand.push(G.deck.pop());
    }
  }

  function playCard(pi, idx, chosenColor){
    const p = G.players[pi], card = p.hand[idx];
    p.hand.splice(idx, 1);
    G.discard.push(card);
    G.color = card.c === 4 ? (chosenColor != null ? chosenColor : 0) : card.c;
    G.drawn = null;
    if (card.c === 4) sfx.wild(); else if (typeof card.v === "number") sfx.play(); else sfx.special();
    let line = cardName(card);
    if (card.c === 4 && chosenColor != null) line += `, ${COLORS[chosenColor]}`;
    say(line);
    // etki
    let skip = false;
    if (card.v === "rev"){
      if (G.players.length === 2) skip = true; else G.dir *= -1;
    } else if (card.v === "skip"){ skip = true; }
    else if (card.v === "draw2"){ G.pending += 2; if (!settings.stack){ drawCards(next(pi), 2); G.pending = 0; skip = true; sfx.penalty(); } }
    else if (card.v === "wild4"){ G.pending += 4; if (!settings.stack){ drawCards(next(pi), 4); G.pending = 0; skip = true; sfx.penalty(); } }
    render();
    if (!p.hand.length){ win(p); return; }
    if (p.hand.length === 1){ sfx.last(); msg(`${p.name}: tek kart kaldı!`); say(`${p.name}, tek kaldı!`, true); }
    const delay = p.hand.length === 1 ? 1.2 : .55;
    later(delay, () => { G.turn = next(pi, skip ? 2 : 1); beginTurn(); });
  }

  function humanPlay(idx){
    if (!G || G.state !== "play" || cur().bot) return;
    const card = cur().hand[idx];
    if (!card || !playable(card)) { sfx.penalty(); return; }
    if (card.c === 4){
      G.state = "choose"; G.pendingIdx = idx;
      $("color-pick").hidden = false;
      say("Renk seç!");
      return;
    }
    G.state = "wait";
    playCard(G.turn, idx);
  }
  document.querySelectorAll(".color-btn").forEach(b => b.addEventListener("click", () => {
    if (!G || G.state !== "choose") return;
    $("color-pick").hidden = true;
    const idx = G.pendingIdx; G.state = "wait";
    playCard(G.turn, idx, +b.dataset.c);
  }));

  function humanDraw(){
    if (!G || G.state !== "play" || cur().bot || G.drawn) return;
    const p = cur();
    sfx.draw(); drawCards(G.turn, 1);
    const card = p.hand[p.hand.length - 1];
    G.drawn = card;
    render();
    if (playable(card)){
      msg("Çektiğin kart oynanabilir! İstersen oyna.");
      say("Bu kartı oynayabilirsin.");
      later(6, () => { if (G.drawn === card && G.state === "play"){ pass(); } });
    } else {
      msg(`${p.name} kart çekti, sıra geçiyor.`);
      G.state = "wait";
      later(1.1, pass);
    }
  }
  function pass(){
    if (!G || G.state === "over") return;
    G.state = "wait"; G.drawn = null;
    G.turn = next(G.turn); beginTurn();
  }
  $("draw").addEventListener("click", () => { audio(); humanDraw(); });

  /* ---------- bilgisayar ---------- */
  function botMove(){
    const p = cur(), playables = p.hand.map((c, i) => ({c, i})).filter(x => playable(x.c));
    if (!playables.length){
      sfx.draw(); drawCards(G.turn, 1);
      const card = p.hand[p.hand.length - 1];
      render();
      if (playable(card)){
        later(.6, () => { const idx = p.hand.length - 1; G.state = "wait"; playCard(G.turn, idx, card.c === 4 ? bestColor(p) : null); });
      } else {
        msg(`${p.name} kart çekti.`);
        later(.8, pass);
      }
      return;
    }
    const nextP = G.players[next(G.turn)];
    const score = x => {
      const c = x.c;
      let s = typeof c.v === "number" ? c.v : 20;
      if (c.v === "draw2") s = 30; if (c.v === "skip" || c.v === "rev") s = 26;
      if (c.c === 4) s = c.v === "wild4" ? 5 : 8;                  // jokerleri sona sakla
      if (nextP.hand.length <= 2 && (c.v === "draw2" || c.v === "skip" || c.v === "wild4")) s += 40;
      const same = p.hand.filter(o => o.c === c.c).length;         // elindeki renkten devam et
      s += same*1.5;
      return s;
    };
    playables.sort((a, b) => score(b) - score(a));
    const pickIdx = playables[0].i, card = p.hand[pickIdx];
    G.state = "wait";
    playCard(G.turn, pickIdx, card.c === 4 ? bestColor(p) : null);
  }
  function bestColor(p){
    const cnt = [0, 0, 0, 0];
    p.hand.forEach(c => { if (c.c < 4) cnt[c.c]++; });
    let best = 0; for (let i = 1; i < 4; i++) if (cnt[i] > cnt[best]) best = i;
    return cnt[best] ? best : Math.random()*4 | 0;
  }

  function win(p){
    G.state = "over";
    clearTimers();
    sfx.win();
    msg(`🏆 ${p.name} kazandı!`);
    say(`${p.name} kazandı! Tebrikler!`);
    const ranked = G.players.slice().sort((a, b) => a.hand.length - b.hand.length);
    $("end-title").textContent = `${p.name} kazandı!`;
    $("podium").innerHTML = ranked.map((q, k) => `<li><span>${k + 1}.</span><span class="av" style="background:${DOT[q.i]}22">${q.av}</span><span>${esc(q.name)}</span><span>${q.hand.length} kart</span></li>`).join("");
    render();
    setTimeout(() => { $("end").hidden = false; $("again").focus({preventScroll:true}); }, 1200);
  }

  /* ---------- çizim ---------- */
  function msg(t){ $("msg").textContent = t; }
  function cardEl(card, opts){
    const b = document.createElement(opts && opts.button ? "button" : "div");
    b.className = `card c${card.c}` + (opts && opts.cls ? " " + opts.cls : "");
    if (opts && opts.button) b.type = "button";
    const face = typeof card.v === "number" ? String(card.v) : FACE[card.v];
    b.innerHTML = `<span class="oval"></span><span class="cnr tl">${face}</span><span class="big">${face}</span><span class="cnr br">${face}</span>`;
    b.setAttribute("aria-label", cardName(card));
    return b;
  }
  function render(){
    if (!G) return;
    // koltuklar
    $("seats").innerHTML = G.players.map((p, i) => {
      const mini = Array.from({length:Math.min(p.hand.length, 6)}, () => `<i class="mini"></i>`).join("");
      return `<div class="seat${i === G.turn && G.state !== "over" ? " turn" : ""}${p.hand.length === 1 ? " last" : ""}">
        <span class="av">${p.av}</span>
        <span class="nm">${esc(p.name)}${p.bot ? "<small>bilgisayar</small>" : ""}
          <span class="cards">${mini}<b>${p.hand.length}</b></span></span></div>`;
    }).join("");
    // orta
    $("draw-count").textContent = G.deck.length;
    const d = $("discard"); d.innerHTML = "";
    const t = top(); const el = cardEl(t, {cls:RM ? "" : "played"}); d.appendChild(el);
    if (t.c === 4){ el.style.boxShadow = `0 5px 0 rgba(0,0,0,.3), inset 0 0 0 6px ${DOT[G.color]}`; }
    $("cur-color").style.background = DOT[G.color];
    $("cur-color").setAttribute("aria-label", "Sıradaki renk: " + COLORS[G.color]);
    $("dir").textContent = G.dir === 1 ? "⟳" : "⟲";
    // el
    const p = cur(), human = p && !p.bot && (G.state === "play" || G.state === "choose" || G.state === "wait");
    const hide = G.state === "curtain" || !human;
    $("hand-who").textContent = hide ? "Kartlar kapalı" : p.name;
    $("hand-count").textContent = hide ? "" : `${p.hand.length} kart`;
    const hand = $("hand"); hand.innerHTML = "";
    if (hide){
      const n = p ? Math.min(p.hand.length, 10) : 7;
      for (let k = 0; k < n; k++){ const b = document.createElement("div"); b.className = "card"; b.style.background = "linear-gradient(135deg,#6C4BB6,#3D2A70)"; hand.appendChild(b); }
    } else {
      p.hand.forEach((c, i) => {
        const ok = playable(c) && G.state === "play";
        const b = cardEl(c, {button:true, cls:(ok ? "ok" : "no") + (ok && settings.hint ? " hint" : "")});
        b.disabled = !ok;
        b.addEventListener("click", () => { audio(); humanPlay(i); });
        hand.appendChild(b);
      });
    }
    $("draw").disabled = !(p && !p.bot && G.state === "play" && !G.drawn);
  }

  /* ---------- ayarlar ---------- */
  function renderSetup(){
    const box = $("p-rows");
    box.innerHTML = "";
    settings.players.forEach((p, i) => {
      const row = document.createElement("div");
      row.className = "p-row";
      row.innerHTML = `<span class="av" style="background:${DOT[i]}33">${AVATARS[i]}</span>
        <input type="text" id="pn-${i}" maxlength="12" value="${esc(p.name)}" placeholder="Adı" aria-label="${i + 1}. oyuncunun adı" autocomplete="off">
        <div class="seg" role="radiogroup" aria-label="${i + 1}. oyuncu kim">
          <label><input type="radio" name="kind-${i}" id="kind-${i}-h" value="h" ${p.bot ? "" : "checked"}><span>İnsan</span></label>
          <label><input type="radio" name="kind-${i}" id="kind-${i}-b" value="b" ${p.bot ? "checked" : ""}><span>Bilgisayar</span></label>
        </div>`;
      box.appendChild(row);
    });
    $("add-player").disabled = settings.players.length >= 4;
    $("remove-player").disabled = settings.players.length <= 2;
    $("hint").checked = settings.hint; $("stack").checked = settings.stack; $("curtain-on").checked = settings.curtain;
  }
  function readSetup(){
    settings.players = settings.players.map((_, i) => ({name:$("pn-" + i).value.trim(), bot:$(`kind-${i}-b`).checked}));
    settings.hint = $("hint").checked; settings.stack = $("stack").checked; settings.curtain = $("curtain-on").checked;
  }
  $("add-player").addEventListener("click", () => { readSetup(); if (settings.players.length < 4) settings.players.push({name:"", bot:true}); renderSetup(); });
  $("remove-player").addEventListener("click", () => { readSetup(); if (settings.players.length > 2) settings.players.pop(); renderSetup(); });
  $("setup-form").addEventListener("submit", e => {
    e.preventDefault(); audio(); readSetup();
    settings.players.forEach((p, i) => { if (!p.name) p.name = p.bot ? (settings.players.filter(q => q.bot).length > 1 ? `Robot ${i + 1}` : "Bilgisayar") : `Oyuncu ${i + 1}`; });
    try { localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings)); } catch(err) {}
    newGame();
  });
  function openSetup(){ clearTimers(); if (G) G.state = "over"; renderSetup(); $("end").hidden = true; $("curtain").hidden = true; $("color-pick").hidden = true; $("setup").hidden = false; if (canSpeak) speechSynthesis.cancel(); }
  $("open-setup").addEventListener("click", openSetup);
  $("end-setup").addEventListener("click", openSetup);
  $("again").addEventListener("click", () => { $("end").hidden = true; newGame(); });
  window.addEventListener("keydown", e => {
    if (!$("setup").hidden || e.target.tagName === "INPUT") return;
    if (!$("end").hidden && e.key === "Enter"){ e.preventDefault(); newGame(); return; }
    if (!$("curtain").hidden && (e.key === "Enter" || e.key === " ")){ e.preventDefault(); $("curtain-go").click(); return; }
    if (!G || G.state !== "play" || cur().bot) return;
    if (e.key === "d" || e.key === "D"){ e.preventDefault(); humanDraw(); }
    const n = parseInt(e.key, 10);
    if (n >= 1 && n <= 9){ e.preventDefault(); humanPlay(n - 1); }
  });

  /* ---------- döngü ---------- */
  let last = performance.now();
  function frame(now){
    const dt = Math.min(.25, Math.max(0, (now - last)/1000)); last = now;
    for (let i = timers.length - 1; i >= 0; i--){ const tk = timers[i]; tk.t -= dt; if (tk.t <= 0){ timers.splice(i, 1); tk.fn(); } }
    requestAnimationFrame(frame);
  }
  document.addEventListener("visibilitychange", () => { last = performance.now(); });
  renderSetup();
  requestAnimationFrame(frame);
})();
