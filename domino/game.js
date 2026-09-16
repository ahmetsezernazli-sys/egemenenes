/* Domino — 2-4 kişilik klasik domino (çift-altı takımı, 28 taş) */
(function(){
  "use strict";

  const PIP = [[], [4], [0, 8], [0, 4, 8], [0, 2, 6, 8], [0, 2, 4, 6, 8], [0, 2, 3, 5, 6, 8]];
  const NUMS = ["sıfır", "bir", "iki", "üç", "dört", "beş", "altı"];
  const AVATARS = ["🚀", "🎈", "🌸", "⭐"];
  const HAND_SIZE = {2:7, 3:6, 4:5};
  const SETTINGS_KEY = "domino-ayar", SOUND_KEY = "domino-ses";
  const RM = window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches;

  const $ = id => document.getElementById(id);
  const esc = s => String(s).replace(/[&<>"']/g, ch => ({"&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#39;"}[ch]));
  const rnd = n => Math.floor(Math.random()*n);
  function shuffle(a){ for (let i = a.length - 1; i > 0; i--){ const j = rnd(i + 1), t = a[i]; a[i] = a[j]; a[j] = t; } return a; }

  let settings = {players:[{name:"Enes", bot:false}, {name:"Egemen", bot:false}], target:50, hint:true, curtain:true};
  try {
    const s = JSON.parse(localStorage.getItem(SETTINGS_KEY) || "null");
    if (s && Array.isArray(s.players) && s.players.length >= 2)
      settings = Object.assign(settings, s, {players:s.players.slice(0, 4)});
  } catch(e) {}
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
  function noise(dur, freq, vol, type){
    const a = audio(); if (!a || !soundOn) return;
    const len = Math.floor(a.sampleRate*dur), buf = a.createBuffer(1, len, a.sampleRate), d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = (Math.random()*2 - 1)*Math.pow(1 - i/len, 2);
    const s = a.createBufferSource(); s.buffer = buf;
    const f = a.createBiquadFilter(); f.type = type || "bandpass"; f.frequency.value = freq;
    const g = a.createGain(); g.gain.value = vol;
    s.connect(f).connect(g).connect(a.destination); s.start();
  }
  const sfx = {
    play(){ noise(.09, 900, .3, "lowpass"); tone(260, .07, "triangle", .05); },
    draw(){ noise(.12, 1400, .18); },
    pass(){ tone(300, .18, "sine", .05, 200); },
    last(){ [880, 1175].forEach((f, i) => tone(f, .18, "triangle", .1, null, i*.12)); },
    turn(){ tone(680, .07, "sine", .05); },
    win(){ [523.25, 659.25, 784, 1046.5, 1318.5].forEach((f, i) => tone(f, .28, "triangle", .12, null, i*.12)); }
  };
  const canSpeak = "speechSynthesis" in window;
  let trVoice = null;
  function pickVoice(){ trVoice = speechSynthesis.getVoices().find(v => /^tr(-|_|$)/i.test(v.lang)) || null; }
  if (canSpeak){ pickVoice(); if (speechSynthesis.addEventListener) speechSynthesis.addEventListener("voiceschanged", pickVoice); }
  function say(text){
    if (!canSpeak || !soundOn || !trVoice) return;
    speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text); u.voice = trVoice; u.lang = trVoice.lang; u.rate = 1; u.pitch = 1.1;
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

  // "Sıra Enes'te" / "Sıra Egemen'de"
  function locative(name){
    const low = name.toLocaleLowerCase("tr"), vowels = "aeıioöuü";
    let v = "e";
    for (let i = low.length - 1; i >= 0; i--){ if (vowels.includes(low[i])){ v = low[i]; break; } }
    const hard = "çfhkpsşt".includes(low[low.length - 1]);
    return `${name}'${hard ? "t" : "d"}${"aıou".includes(v) ? "a" : "e"}`;
  }

  /* ---------- oyun ---------- */
  let G = null, timers = [];
  const later = (s, fn) => timers.push({t:s, fn});
  const clearTimers = () => { timers = []; };
  function tick(dt){
    if (!timers.length) return;
    const due = [];
    for (const t of timers) if ((t.t -= dt) <= 0) due.push(t);
    if (due.length){ timers = timers.filter(t => t.t > 0); due.forEach(t => t.fn()); }
  }
  setInterval(() => tick(.1), 100);

  function newDeck(){
    const d = [];
    for (let a = 0; a <= 6; a++) for (let b = a; b <= 6; b++) d.push({a, b});
    return d;
  }
  const pips = h => h.reduce((s, t) => s + t.a + t.b, 0);

  function newMatch(){
    clearTimers();
    G = {
      players:settings.players.map((p, i) => ({name:p.name, bot:!!p.bot, av:AVATARS[i % 4], hand:[], score:0})),
      chain:[], left:null, right:null, pile:[], turn:0, passes:0, round:1, state:"play", pending:null
    };
    G.players.forEach((p, i) => { if (p.bot) p.name = p.name || `Bilgisayar ${i + 1}`; });
    newRound();
  }

  function newRound(){
    clearTimers();
    const deck = shuffle(newDeck()), n = G.players.length, size = HAND_SIZE[n] || 5;
    G.players.forEach(p => { p.hand = deck.splice(0, size); });
    G.pile = deck;
    G.chain = []; G.left = null; G.right = null; G.passes = 0; G.state = "play"; G.pending = null;
    $("curtain").hidden = true; $("side").hidden = true;      // yeni raunda temiz başla
    // en büyük çifti olan başlar, çift yoksa en büyük taş
    let best = -1, who = 0, tile = null;
    G.players.forEach((p, i) => {
      p.hand.forEach(t => {
        const val = (t.a === t.b ? 100 : 0) + t.a + t.b;
        if (val > best){ best = val; who = i; tile = t; }
      });
    });
    G.turn = who;
    placeTile(who, G.players[who].hand.indexOf(tile), "r", true);
    msg(`${G.players[who].name} ${tile.a}-${tile.b} ile başladı`);
    render();
    afterMove();
  }

  const legalSide = (t, side) => {
    if (!G.chain.length) return true;
    const end = side === "l" ? G.left : G.right;
    return t.a === end || t.b === end;
  };
  const legal = t => legalSide(t, "l") || legalSide(t, "r");
  const canPlay = p => p.hand.some(legal);

  function placeTile(pi, idx, side, first){
    const p = G.players[pi], t = p.hand[idx];
    if (!t) return false;
    if (!first && !legalSide(t, side)) return false;
    p.hand.splice(idx, 1);
    if (!G.chain.length){
      G.chain.push({a:t.a, b:t.b, fresh:true});
      G.left = t.a; G.right = t.b;
    } else if (side === "l"){
      const tile = t.b === G.left ? {a:t.a, b:t.b} : {a:t.b, b:t.a};
      G.chain.unshift(Object.assign(tile, {fresh:true}));
      G.left = tile.a;
    } else {
      const tile = t.a === G.right ? {a:t.a, b:t.b} : {a:t.b, b:t.a};
      G.chain.push(Object.assign(tile, {fresh:true}));
      G.right = tile.b;
    }
    G.passes = 0;
    if (!first) sfx.play();
    return true;
  }

  function msg(text){ $("msg").textContent = text; }

  function humanPlay(idx, side){
    const p = G.players[G.turn];
    if (G.state !== "play" || p.bot) return false;
    const t = p.hand[idx];
    if (!t || !legal(t)) return false;
    if (!side){
      const l = legalSide(t, "l"), r = legalSide(t, "r");
      if (l && r && G.chain.length){ G.pending = idx; $("side").hidden = false; return true; }
      side = l ? "l" : "r";
    }
    placeTile(G.turn, idx, side);
    render();
    afterMove();
    return true;
  }

  function drawTile(pi){
    const p = G.players[pi];
    if (!G.pile.length) return false;
    p.hand.push(G.pile.pop());
    sfx.draw();
    render();
    return true;
  }

  function passTurn(){
    G.passes++;
    sfx.pass();
    msg(`${G.players[G.turn].name} pas geçti`);
    if (G.passes >= G.players.length){ endRound(-1); return; }
    nextTurn();
  }

  function afterMove(){
    const p = G.players[G.turn];
    if (!p.hand.length){ endRound(G.turn); return; }
    if (p.hand.length === 1) sfx.last();
    nextTurn();
  }

  function nextTurn(){
    if (G.state !== "play") return;
    G.turn = (G.turn + 1) % G.players.length;
    const p = G.players[G.turn];
    render();
    if (p.bot){ later(.9, botMove); return; }
    if (settings.curtain && G.players.filter(q => !q.bot).length > 1){
      $("curtain-av").textContent = p.av;
      $("curtain-name").textContent = `${locative(p.name)} sıra`;
      $("curtain").hidden = false;
    } else turnSpeech();
  }

  function turnSpeech(){
    const p = G.players[G.turn];
    sfx.turn();
    if (G.chain.length) say(`Sıra ${locative(p.name)}. Uçlar ${NUMS[G.left]} ve ${NUMS[G.right]}.`);
    else say(`Sıra ${locative(p.name)}`);
    msg(canPlay(p) ? `Sıra ${locative(p.name)} — oynanabilir taşın var`
                   : (G.pile.length ? `Sıra ${locative(p.name)} — taşın yok, desteden çek` : `Sıra ${locative(p.name)} — pas geçmelisin`));
  }

  function botMove(){
    if (G.state !== "play") return;
    const p = G.players[G.turn];
    if (!p.bot) return;
    if (!canPlay(p)){
      if (G.pile.length){ drawTile(G.turn); later(.5, botMove); return; }
      passTurn(); return;
    }
    // en çok noktayı elden çıkaran taşı oyna, çiftlere küçük bir öncelik
    let best = null;
    p.hand.forEach((t, i) => {
      ["l", "r"].forEach(side => {
        if (!legalSide(t, side)) return;
        const val = t.a + t.b + (t.a === t.b ? 1.5 : 0);
        if (!best || val > best.val) best = {i, side, val};
      });
    });
    placeTile(G.turn, best.i, best.side);
    msg(`${p.name} taşını koydu`);
    render();
    afterMove();
  }

  function endRound(winner){
    G.state = "over";
    clearTimers();
    let title, note;
    if (winner < 0){                                   // kapalı oyun: eli en hafif olan kazanır
      let low = 1e9;
      G.players.forEach((p, i) => { const v = pips(p.hand); if (v < low){ low = v; winner = i; } });
      title = `Oyun kapandı — ${G.players[winner].name} kazandı`;
      note = "Kimse taş koyamadı. Elinde en az nokta kalan kazanır.";
    } else {
      title = `${G.players[winner].name} taşlarını bitirdi!`;
      note = "Ötekilerin elinde kalan noktalar puan olarak yazıldı.";
    }
    let pts = 0;
    G.players.forEach((p, i) => { if (i !== winner) pts += pips(p.hand); });
    G.players[winner].score += pts;
    sfx.win();
    say(`${G.players[winner].name} kazandı`);
    render();
    const target = settings.target;
    const matchOver = target > 0 && G.players[winner].score >= target;
    later(RM ? .3 : 1, () => {
      const list = G.players.map((p, i) => ({p, i})).sort((a, b) => b.p.score - a.p.score);
      $("end-emoji").textContent = matchOver ? "🏆" : "🁫";
      $("end-title").textContent = matchOver ? `${G.players[winner].name} oyunu kazandı!` : title;
      $("end-note").textContent = matchOver ? `${target} puana ilk ulaşan o oldu.` : `${note} (+${pts} puan)`;
      $("podium").innerHTML = list.map((e, k) =>
        `<li><span>${k + 1}.</span><span class="av">${e.p.av}</span><span class="nm">${esc(e.p.name)}</span>` +
        `<span class="res">${e.p.score} puan</span></li>`).join("");
      $("again").textContent = matchOver ? "Yeni oyun" : "Sıradaki raunt";
      $("again").dataset.match = matchOver ? "1" : "0";
      $("end").hidden = false;
      $("again").focus();
    });
  }

  /* ---------- çizim ---------- */
  function tileHTML(t, cls){
    const half = v => `<span class="half">${[0,1,2,3,4,5,6,7,8].map(i => `<i class="${PIP[v].indexOf(i) >= 0 ? "on" : ""}"></i>`).join("")}</span>`;
    return `<span class="tile ${t.a === t.b ? "v " : ""}${cls || ""}" aria-label="${t.a} ${t.b}">${half(t.a)}${half(t.b)}</span>`;
  }

  function render(){
    const cur = G.players[G.turn];
    $("seats").innerHTML = G.players.map((p, i) =>
      `<div class="seat${G.state === "play" && i === G.turn ? " turn" : ""}${p.hand.length === 1 ? " last" : ""}">
        <span class="av">${p.av}</span>
        <span class="nm">${esc(p.name)}<small>${p.hand.length} taş${p.bot ? " · bilgisayar" : ""}</small></span>
        <b class="sc">${p.score}</b>
      </div>`).join("");

    $("chain").innerHTML = G.chain.map(t => tileHTML(t, t.fresh ? "fresh" : "")).join("");
    G.chain.forEach(t => { t.fresh = false; });
    const ch = $("chain");
    if (ch.scrollWidth > ch.clientWidth) ch.scrollLeft = ch.scrollWidth;
    $("tag-l").hidden = !G.chain.length; $("tag-r").hidden = !G.chain.length;
    if (G.chain.length){ $("tag-l-n").textContent = G.left; $("tag-r-n").textContent = G.right; }

    $("pile").textContent = G.pile.length;
    const human = G.state === "play" && !cur.bot;
    $("draw").disabled = !human || !G.pile.length || canPlay(cur);
    $("pass").disabled = !human || !!G.pile.length || canPlay(cur);

    $("hand-who").textContent = cur.name;
    $("hand-count").textContent = cur.hand.length + " taş";
    const hide = cur.bot || !$("curtain").hidden;
    $("hand").innerHTML = cur.hand.map((t, i) => {
      if (hide) return `<span class="tile back"></span>`;
      const ok = G.state === "play" && legal(t);
      return `<button class="tile ${t.a === t.b ? "v " : ""}${ok ? "ok" : "no"}${ok && settings.hint ? " hint" : ""}" data-i="${i}" aria-label="${t.a} ${t.b}">` +
             [t.a, t.b].map(v => `<span class="half">${[0,1,2,3,4,5,6,7,8].map(k => `<i class="${PIP[v].indexOf(k) >= 0 ? "on" : ""}"></i>`).join("")}</span>`).join("") +
             `</button>`;
    }).join("");
  }

  /* ---------- olaylar ---------- */
  $("hand").addEventListener("click", e => {
    const b = e.target.closest(".tile[data-i]");
    if (!b || !b.classList.contains("ok")) return;
    audio();
    humanPlay(+b.dataset.i);
  });
  $("side-l").addEventListener("click", () => { $("side").hidden = true; const i = G.pending; G.pending = null; if (i != null) humanPlay(i, "l"); });
  $("side-r").addEventListener("click", () => { $("side").hidden = true; const i = G.pending; G.pending = null; if (i != null) humanPlay(i, "r"); });
  $("side-cancel").addEventListener("click", () => { $("side").hidden = true; G.pending = null; });
  $("draw").addEventListener("click", () => {
    audio();
    if ($("draw").disabled) return;
    drawTile(G.turn);
    const p = G.players[G.turn];
    msg(canPlay(p) ? "Çektiğin taş oynanıyor!" : (G.pile.length ? "Yine olmadı, bir daha çek" : "Deste bitti, pas geçmelisin"));
    render();
  });
  $("pass").addEventListener("click", () => { audio(); if (!$("pass").disabled) passTurn(); });
  $("curtain-go").addEventListener("click", () => { audio(); $("curtain").hidden = true; render(); turnSpeech(); });
  $("again").addEventListener("click", () => {
    audio(); $("end").hidden = true;
    if ($("again").dataset.match === "1"){ G.players.forEach(p => { p.score = 0; }); G.round = 1; }
    else G.round++;
    newRound();
  });

  /* ---------- ayarlar ---------- */
  function drawSetupRows(){
    $("p-rows").innerHTML = settings.players.map((p, i) => `
      <div class="p-row">
        <span class="av">${AVATARS[i % 4]}</span>
        <input type="text" id="nm-${i}" value="${esc(p.name)}" maxlength="12" aria-label="${i + 1}. oyuncunun adı">
        <label class="toggle"><input type="checkbox" id="bot-${i}" ${p.bot ? "checked" : ""}><span>🤖</span></label>
      </div>`).join("");
    $("add-player").disabled = settings.players.length >= 4;
    $("remove-player").disabled = settings.players.length <= 2;
  }
  function readSetupRows(){
    settings.players.forEach((p, i) => {
      const nm = $("nm-" + i); if (nm) p.name = nm.value.trim().slice(0, 12) || `Oyuncu ${i + 1}`;
      const bot = $("bot-" + i); if (bot) p.bot = bot.checked;
    });
  }
  $("add-player").addEventListener("click", () => {
    if (settings.players.length >= 4) return;
    readSetupRows();
    settings.players.push({name:`Oyuncu ${settings.players.length + 1}`, bot:true});
    drawSetupRows();
  });
  $("remove-player").addEventListener("click", () => {
    if (settings.players.length <= 2) return;
    readSetupRows(); settings.players.pop(); drawSetupRows();
  });
  function openSetup(){
    drawSetupRows();
    const t = document.querySelector(`input[name="target"][value="${settings.target}"]`);
    if (t) t.checked = true;
    $("hint").checked = !!settings.hint;
    $("curtain-on").checked = !!settings.curtain;
    $("end").hidden = true; $("curtain").hidden = true; $("side").hidden = true;
    $("setup").hidden = false;
  }
  $("open-setup").addEventListener("click", openSetup);
  $("end-setup").addEventListener("click", openSetup);
  $("setup-form").addEventListener("submit", e => {
    e.preventDefault(); audio();
    readSetupRows();
    const t = document.querySelector('input[name="target"]:checked');
    settings.target = t ? +t.value : 50;
    settings.hint = $("hint").checked;
    settings.curtain = $("curtain-on").checked;
    try { localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings)); } catch(e) {}
    $("setup").hidden = true;
    newMatch();
  });

  drawSetupRows();
  newMatch();
  $("setup").hidden = false;
})();
