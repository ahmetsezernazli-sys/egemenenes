/* Zindan Kaşifi — Enes için sıra tabanlı zindan macerası */
(function(){
  "use strict";

  const MW = 46, MH = 30, FLOORS = 8;
  const SAVE = "zindan-kasifi", SOUND_KEY = "zindan-kasifi-ses";
  const EMOJI = '"Segoe UI Emoji","Apple Color Emoji","Noto Color Emoji",sans-serif';
  const DIRS = {u:[0, -1], d:[0, 1], l:[-1, 0], r:[1, 0]};
  const N4 = [[1, 0], [-1, 0], [0, 1], [0, -1]];

  // canavarlar: ilk göründüğü kat, can, saldırı, savunma, deneyim; wild = rastgele dolaşma olasılığı
  const MONSTERS = {
    rat:     {ic:"🐀", ad:"Fare",     from:1, to:3, hp:4,  atk:2, def:0, xp:2},
    bat:     {ic:"🦇", ad:"Yarasa",   from:1, to:4, hp:3,  atk:2, def:0, xp:2, wild:.5},
    spider:  {ic:"🕷️", ad:"Örümcek",  from:2, to:5, hp:6,  atk:3, def:0, xp:4},
    snake:   {ic:"🐍", ad:"Yılan",    from:3, to:6, hp:9,  atk:4, def:1, xp:5},
    skel:    {ic:"💀", ad:"İskelet",  from:4, to:8, hp:12, atk:4, def:1, xp:7},
    ghost:   {ic:"👻", ad:"Hayalet",  from:5, to:8, hp:11, atk:5, def:1, xp:9, wild:.25},
    zombie:  {ic:"🧟", ad:"Zombi",    from:6, to:8, hp:18, atk:6, def:2, xp:11},
    ogre:    {ic:"👹", ad:"Dev",      from:7, to:8, hp:22, atk:7, def:2, xp:16},
    dragon:  {ic:"🐉", ad:"Ejderha",  from:9, to:9, hp:60, atk:9, def:3, xp:50, boss:true}
  };
  // eşyalar ve ağırlıkları
  const ITEMS = {
    gold:   {ic:"💰", w:5},
    potion: {ic:"🧪", w:4},
    food:   {ic:"🍖", w:3},
    sword:  {ic:"⚔️", w:1.6},
    shield: {ic:"🛡️", w:1.4},
    bomb:   {ic:"💣", w:1.6},
    scroll: {ic:"📜", w:1.2}
  };

  const $ = id => document.getElementById(id);
  const cv = $("cv"), ctx = cv.getContext("2d"), stage = $("stage");
  const rnd = n => Math.floor(Math.random()*n);
  const rint = (a, b) => a + rnd(b - a + 1);
  const key = (x, y) => y*MW + x;

  let soundOn = true, best = {floor:0, wins:0};
  try { soundOn = localStorage.getItem(SOUND_KEY) !== "0"; } catch(e) {}
  try { best = Object.assign(best, JSON.parse(localStorage.getItem(SAVE) || "{}")); } catch(e) {}
  function persist(){ try { localStorage.setItem(SAVE, JSON.stringify(best)); } catch(e) {} }

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
    step(){ tone(140, .05, "triangle", .04); },
    hit(){ tone(320, .08, "square", .05, 160); },
    hurt(){ tone(180, .16, "sawtooth", .06, 90); },
    kill(){ tone(440, .08, "square", .05, 880); tone(660, .1, "triangle", .05, null, .07); },
    pick(){ tone(880, .07, "sine", .07, 1320); },
    gold(){ tone(1320, .06, "square", .04); tone(1760, .08, "square", .04, null, .06); },
    drink(){ tone(500, .25, "sine", .08, 900); },
    boom(){ tone(90, .5, "sawtooth", .12, 40); },
    stairs(){ [392, 330, 262, 196].forEach((f, i) => tone(f, .14, "triangle", .08, null, i*.09)); },
    level(){ [523, 659, 784, 1047].forEach((f, i) => tone(f, .14, "triangle", .08, null, i*.08)); },
    win(){ [523, 659, 784, 1047, 1319].forEach((f, i) => tone(f, .3, "triangle", .1, null, i*.12)); },
    die(){ [330, 262, 196, 131].forEach((f, i) => tone(f, .3, "sawtooth", .06, null, i*.16)); }
  };
  function renderSound(){
    $("ic-on").hidden = !soundOn; $("ic-off").hidden = soundOn;
    $("sound").setAttribute("aria-label", soundOn ? "Sesi kapat" : "Sesi aç");
    $("sound").setAttribute("aria-pressed", String(soundOn));
  }
  $("sound").addEventListener("click", () => {
    soundOn = !soundOn;
    try { localStorage.setItem(SOUND_KEY, soundOn ? "1" : "0"); } catch(e) {}
    renderSound();
  });
  renderSound();

  /* ---------- oyun durumu ---------- */
  let G = null;           // {diff, floor, map, seen, vis, mons, items, stairs, p, over, turn}
  let logLines = [];

  function log(text, cls){
    logLines.push({text, cls: cls || ""});
    if (logLines.length > 3) logLines.shift();
    const ol = $("log"); ol.textContent = "";
    logLines.forEach((l, i) => {
      const li = document.createElement("li"); li.textContent = l.text;
      li.className = (l.cls || "") + (i < logLines.length - 1 ? " old" : "");
      ol.appendChild(li);
    });
  }

  function pickWeighted(obj, filter){
    const ent = Object.entries(obj).filter(filter || (() => true));
    let tot = 0; for (const [, v] of ent) tot += v.w;
    let r = Math.random()*tot;
    for (const [k, v] of ent){ r -= v.w; if (r <= 0) return k; }
    return ent[0][0];
  }

  function genFloor(){
    const n = G.floor;
    const map = new Uint8Array(MW*MH).fill(1);   // 1 duvar, 0 zemin
    const rooms = [];
    for (let tries = 0; tries < 300 && rooms.length < 11; tries++){
      const w = rint(4, 9), h = rint(4, 7), x = rint(1, MW - w - 2), y = rint(1, MH - h - 2);
      if (rooms.some(r => x <= r.x + r.w + 1 && x + w + 1 >= r.x && y <= r.y + r.h + 1 && y + h + 1 >= r.y)) continue;
      rooms.push({x, y, w, h, cx:x + (w >> 1), cy:y + (h >> 1)});
    }
    for (const r of rooms) for (let yy = r.y; yy < r.y + r.h; yy++) for (let xx = r.x; xx < r.x + r.w; xx++) map[key(xx, yy)] = 0;
    const carve = (x, y) => { map[key(x, y)] = 0; };
    for (let i = 1; i < rooms.length; i++){
      const a = rooms[i - 1], b = rooms[i];
      if (Math.random() < .5){
        for (let x = Math.min(a.cx, b.cx); x <= Math.max(a.cx, b.cx); x++) carve(x, a.cy);
        for (let y = Math.min(a.cy, b.cy); y <= Math.max(a.cy, b.cy); y++) carve(b.cx, y);
      } else {
        for (let y = Math.min(a.cy, b.cy); y <= Math.max(a.cy, b.cy); y++) carve(a.cx, y);
        for (let x = Math.min(a.cx, b.cx); x <= Math.max(a.cx, b.cx); x++) carve(x, b.cy);
      }
    }
    // birkaç ek koridor döngü oluştursun
    for (let k = 0; k < 2 && rooms.length > 4; k++){
      const a = rooms[rnd(rooms.length)], b = rooms[rnd(rooms.length)];
      for (let x = Math.min(a.cx, b.cx); x <= Math.max(a.cx, b.cx); x++) carve(x, a.cy);
      for (let y = Math.min(a.cy, b.cy); y <= Math.max(a.cy, b.cy); y++) carve(b.cx, y);
    }
    G.map = map; G.rooms = rooms;
    G.seen = new Uint8Array(MW*MH); G.vis = new Uint8Array(MW*MH);
    G.mons = []; G.items = [];
    const start = rooms[0];
    G.p.x = start.cx; G.p.y = start.cy;
    // merdiven başlangıca en uzak odada
    const dist = bfs(start.cx, start.cy, 999);
    let far = rooms[rooms.length - 1], fd = -1;
    for (const r of rooms){ const d = dist[key(r.cx, r.cy)]; if (d > fd && d < 9999){ fd = d; far = r; } }
    G.stairs = n < FLOORS ? {x:far.cx, y:far.cy} : null;
    const free = (x, y) => map[key(x, y)] === 0 && !(x === G.p.x && y === G.p.y) && !G.mons.some(m => m.x === x && m.y === y) && !G.items.some(it => it.x === x && it.y === y) && !(G.stairs && G.stairs.x === x && G.stairs.y === y);
    const spot = (avoidStart) => {
      for (let t = 0; t < 200; t++){
        const r = rooms[avoidStart ? 1 + rnd(rooms.length - 1) : rnd(rooms.length)];
        const x = rint(r.x, r.x + r.w - 1), y = rint(r.y, r.y + r.h - 1);
        if (free(x, y) && (!avoidStart || Math.abs(x - G.p.x) + Math.abs(y - G.p.y) > 6)) return [x, y];
      }
      return null;
    };
    const easy = G.diff === 0;
    const count = Math.round((easy ? 4 : 5) + n*(easy ? 1.1 : 1.5));
    const pool = Object.keys(MONSTERS).filter(k => MONSTERS[k].from <= n && MONSTERS[k].to >= n && !MONSTERS[k].boss);
    for (let i = 0; i < count; i++){ const s = spot(true); if (s) addMonster(pool[rnd(pool.length)], s[0], s[1]); }
    if (n === FLOORS){
      const r = far, d = MONSTERS.dragon;
      addMonster("dragon", r.cx, r.cy);
      G.mons[G.mons.length - 1].hp = G.mons[G.mons.length - 1].maxHp = easy ? 45 : d.hp;
    }
    const nItems = rint(4, 6) + (easy ? 2 : 0);
    for (let i = 0; i < nItems; i++){
      const s = spot(false); if (!s) continue;
      const t = pickWeighted(ITEMS, ([k]) => !(easy && k === "gold" && Math.random() < .3));
      G.items.push({t, x:s[0], y:s[1], v:t === "gold" ? rint(3, 6) + n*2 : 0});
    }
    // her katta en az bir iksir
    if (!G.items.some(it => it.t === "potion")){ const s = spot(false); if (s) G.items.push({t:"potion", x:s[0], y:s[1], v:0}); }
    computeFov();
  }
  function addMonster(t, x, y){
    const d = MONSTERS[t], easy = G.diff === 0;
    const hp = Math.max(1, Math.round(d.hp*(easy ? .8 : 1)));
    G.mons.push({t, x, y, hp, maxHp:hp, atk:d.atk - (easy ? 1 : 0), def:d.def, awake:false, flash:0});
  }

  function bfs(sx, sy, limit){
    const dist = new Int16Array(MW*MH).fill(9999);
    const q = [sx, sy]; dist[key(sx, sy)] = 0;
    for (let i = 0; i < q.length; i += 2){
      const x = q[i], y = q[i + 1], d = dist[key(x, y)];
      if (d >= limit) continue;
      for (const [dx, dy] of N4){
        const nx = x + dx, ny = y + dy;
        if (nx < 0 || ny < 0 || nx >= MW || ny >= MH) continue;
        const k = key(nx, ny);
        if (G.map[k] === 1 || dist[k] <= d + 1) continue;
        dist[k] = d + 1; q.push(nx, ny);
      }
    }
    return dist;
  }

  function computeFov(){
    const R = G.diff === 0 ? 8 : 7, px = G.p.x, py = G.p.y;
    G.vis.fill(0);
    for (let y = py - R; y <= py + R; y++) for (let x = px - R; x <= px + R; x++){
      if (x < 0 || y < 0 || x >= MW || y >= MH) continue;
      if ((x - px)*(x - px) + (y - py)*(y - py) > R*R + 1) continue;
      // Bresenham ile görüş çizgisi
      let x0 = px, y0 = py; const dx = Math.abs(x - x0), dy = -Math.abs(y - y0), sx = x0 < x ? 1 : -1, sy = y0 < y ? 1 : -1;
      let err = dx + dy, ok = true;
      while (!(x0 === x && y0 === y)){
        if (!(x0 === px && y0 === py) && G.map[key(x0, y0)] === 1){ ok = false; break; }
        const e2 = 2*err;
        if (e2 >= dy){ err += dy; x0 += sx; }
        if (e2 <= dx){ err += dx; y0 += sy; }
      }
      if (ok){ G.vis[key(x, y)] = 1; G.seen[key(x, y)] = 1; }
    }
  }

  const monAt = (x, y) => G.mons.find(m => m.x === x && m.y === y);
  const needXp = lvl => 8 + lvl*8;

  function newGame(diff){
    G = {diff, floor:1, turn:0, over:false, kills:0,
      p:{x:0, y:0, hp:diff === 0 ? 26 : 20, maxHp:diff === 0 ? 26 : 20, atk:3, def:0, lvl:1, xp:0, gold:0, potion:diff === 0 ? 2 : 1, bomb:0, scroll:0}};
    logLines = []; $("log").textContent = "";
    genFloor();
    log("Zindana girdin. ▼ merdiveni bul!");
    $("menu").hidden = true; $("over").hidden = true; $("resume").hidden = false;
    hud(); draw();
  }

  function damage(atk, def){
    let d = Math.max(1, atk + rint(-1, 1) - def), crit = false;
    if (Math.random() < .1){ d *= 2; crit = true; }
    return [d, crit];
  }
  function gainXp(n){
    const p = G.p; p.xp += n;
    while (p.xp >= needXp(p.lvl)){
      p.xp -= needXp(p.lvl); p.lvl++;
      p.maxHp += 4; p.hp = Math.min(p.maxHp, p.hp + 6);
      const up = p.lvl % 2 === 0 ? "atk" : "def";
      if (up === "atk" || p.lvl % 4 === 1) p[up] += 1;
      log(`Seviye ${p.lvl}! Can${up === "atk" ? ", saldırı" : p.lvl % 4 === 1 ? ", savunma" : ""} arttı.`, "good"); sfx.level();
    }
  }
  function killMonster(m){
    const d = MONSTERS[m.t];
    G.mons.splice(G.mons.indexOf(m), 1); G.kills++;
    log(`${d.ad} yenildi! +${d.xp} deneyim`, "good"); sfx.kill();
    gainXp(d.xp);
    if (d.boss){
      G.items.push({t:"crown", x:m.x, y:m.y, v:0});
      log("Ejderha yenildi! 👑 Tacı al!", "gold");
    } else if (Math.random() < .18){
      G.items.push({t:Math.random() < .6 ? "gold" : "potion", x:m.x, y:m.y, v:rint(3, 6) + G.floor*2});
    }
  }
  function attack(m){
    const [d, crit] = damage(G.p.atk, m.def);
    m.hp -= d; m.flash = 1; m.awake = true; sfx.hit();
    if (m.hp <= 0) killMonster(m);
    else log(`${MONSTERS[m.t].ad}: -${d}${crit ? " (kritik!)" : ""}`);
  }
  function pickup(){
    const p = G.p;
    for (let i = G.items.length - 1; i >= 0; i--){
      const it = G.items[i];
      if (it.x !== p.x || it.y !== p.y) continue;
      G.items.splice(i, 1);
      switch (it.t){
        case "gold": p.gold += it.v; log(`💰 ${it.v} altın`, "gold"); sfx.gold(); break;
        case "potion": p.potion++; log("🧪 İksir aldın (Q ile iç)", "good"); sfx.pick(); break;
        case "food": { const h = Math.min(p.maxHp - p.hp, 7); p.hp += h; log(`🍖 Yedin, +${h} can`, "good"); sfx.pick(); break; }
        case "sword": p.atk++; log("⚔️ Daha iyi kılıç! Saldırı +1", "good"); sfx.pick(); break;
        case "shield": p.def++; log("🛡️ Daha iyi kalkan! Savunma +1", "good"); sfx.pick(); break;
        case "bomb": p.bomb++; log("💣 Bomba aldın (B ile at)", "good"); sfx.pick(); break;
        case "scroll": p.scroll++; log("📜 Harita parşömeni (R ile oku)", "good"); sfx.pick(); break;
        case "crown": finish(true); return;
      }
    }
  }

  function playerTurn(action){
    if (!G || G.over) return false;
    const p = G.p;
    if (action === "wait"){ endTurn(); return true; }
    if (action === "potion"){
      if (!p.potion){ log("İksirin yok."); return false; }
      if (p.hp >= p.maxHp){ log("Canın zaten dolu."); return false; }
      p.potion--; const h = Math.min(p.maxHp - p.hp, 12 + p.lvl); p.hp += h;
      log(`🧪 İksir içtin, +${h} can`, "good"); sfx.drink(); endTurn(); return true;
    }
    if (action === "bomb"){
      if (!p.bomb){ log("Bomban yok."); return false; }
      p.bomb--; sfx.boom(); G.boom = {x:p.x, y:p.y, t:1};
      let n = 0;
      for (const m of [...G.mons]){
        if (Math.max(Math.abs(m.x - p.x), Math.abs(m.y - p.y)) <= 2 && G.vis[key(m.x, m.y)]){
          m.hp -= 10 + G.floor; m.flash = 1; m.awake = true; n++;
          if (m.hp <= 0) killMonster(m);
        }
      }
      log(n ? `💣 Bomba patladı! ${n} canavar vuruldu.` : "💣 Bomba patladı ama yakında canavar yoktu.", n ? "good" : "");
      endTurn(); return true;
    }
    if (action === "scroll"){
      if (!p.scroll){ log("Parşömenin yok."); return false; }
      p.scroll--;
      for (let i = 0; i < MW*MH; i++) if (G.map[i] === 0) G.seen[i] = 1;
      G.mapShown = true;
      log("📜 Katın haritası açıldı!", "good"); sfx.pick(); hud(); draw(); return true;
    }
    const d = DIRS[action]; if (!d) return false;
    const nx = p.x + d[0], ny = p.y + d[1];
    const m = monAt(nx, ny);
    if (m){ attack(m); endTurn(); return true; }
    if (G.map[key(nx, ny)] === 1) return false;
    p.x = nx; p.y = ny; sfx.step();
    pickup();
    if (G.over) return true;
    if (G.stairs && p.x === G.stairs.x && p.y === G.stairs.y){
      G.floor++; G.mapShown = false;
      if (G.floor > best.floor){ best.floor = G.floor; persist(); }
      sfx.stairs();
      genFloor();
      log(G.floor === FLOORS ? `Kat ${G.floor}: ejderhanın inine geldin!` : `Kat ${G.floor}'e indin.`, G.floor === FLOORS ? "bad" : "");
      hud(); draw(); return true;
    }
    endTurn(); return true;
  }

  function endTurn(){
    G.turn++;
    computeFov();
    monstersAct();
    computeFov();
    if (G.p.hp <= 0){ G.p.hp = 0; finish(false); }
    hud(); draw();
  }

  function monstersAct(){
    const p = G.p, dist = bfs(p.x, p.y, 24);
    for (const m of [...G.mons]){
      if (G.over) return;
      const d = MONSTERS[m.t];
      if (!m.awake && G.vis[key(m.x, m.y)]) m.awake = true;
      if (!m.awake) continue;
      if (Math.abs(m.x - p.x) + Math.abs(m.y - p.y) === 1 && !(d.wild && Math.random() < d.wild*.5)){
        const [dmg, crit] = damage(m.atk, p.def);
        p.hp -= dmg; sfx.hurt(); G.hurt = 1;
        log(`${d.ic} ${d.ad} vurdu: -${dmg}${crit ? " (kritik!)" : ""}`, "bad");
        if (p.hp <= 0){ G.killer = d.ad; return; }
        continue;
      }
      // patron yerinden ayrılmaz, oyuncu yaklaşınca saldırır
      if (d.boss && dist[key(m.x, m.y)] > 3) continue;
      let opts = N4.map(([dx, dy]) => [m.x + dx, m.y + dy])
        .filter(([x, y]) => G.map[key(x, y)] === 0 && !monAt(x, y) && !(x === p.x && y === p.y));
      if (!opts.length) continue;
      let to;
      if (d.wild && Math.random() < d.wild) to = opts[rnd(opts.length)];
      else {
        const cur = dist[key(m.x, m.y)];
        opts.sort((a, b) => dist[key(a[0], a[1])] - dist[key(b[0], b[1])]);
        if (dist[key(opts[0][0], opts[0][1])] >= cur){ if (cur > 20) m.awake = false; continue; }
        to = opts[0];
      }
      m.x = to[0]; m.y = to[1];
    }
  }

  function finish(win){
    G.over = true; $("resume").hidden = true;
    if (win){ best.wins++; sfx.win(); }
    else sfx.die();
    persist();
    $("over-ic").textContent = win ? "👑" : "🪦";
    $("over-title").textContent = win ? "Zindanın kralı sensin!" : "Yenildin…";
    $("over-tx").textContent = win
      ? `Ejderhayı yendin ve tacı aldın! Seviye ${G.p.lvl}, ${G.kills} canavar, ${G.p.gold} altın, ${G.turn} hamle.`
      : `Kat ${G.floor}'de ${G.killer || "bir canavar"} seni yendi. Seviye ${G.p.lvl}, ${G.kills} canavar, ${G.p.gold} altın. En derin kat: ${best.floor}.`;
    setTimeout(() => { $("over").hidden = false; }, 600);
    renderBest();
  }

  /* ---------- arayüz ---------- */
  function hud(){
    const p = G.p;
    $("hp-fill").style.width = (100*p.hp/p.maxHp) + "%";
    $("hp-tx").textContent = `${p.hp}/${p.maxHp}`;
    $("floor").textContent = G.floor; $("lvl").textContent = p.lvl;
    $("atk").textContent = p.atk; $("def").textContent = p.def; $("gold").textContent = p.gold;
    $("n-potion").textContent = p.potion; $("n-bomb").textContent = p.bomb; $("n-scroll").textContent = p.scroll;
    $("b-potion").disabled = !p.potion; $("b-bomb").disabled = !p.bomb; $("b-scroll").disabled = !p.scroll;
  }
  function renderBest(){
    $("best").textContent = best.floor || best.wins ? `En derin kat: ${best.floor} · Kazanma: ${best.wins}` : "";
  }

  /* ---------- çizim ---------- */
  const view = {w:0, h:0, dpr:1, ts:32};
  function resize(){
    const r = stage.getBoundingClientRect();
    if (!r.width || !r.height) return;
    view.dpr = Math.min(window.devicePixelRatio || 1, 2);
    view.w = r.width; view.h = r.height;
    cv.width = Math.round(r.width*view.dpr); cv.height = Math.round(r.height*view.dpr);
    // kısa kenarda yaklaşık 11 kare görünsün
    view.ts = Math.max(22, Math.min(48, Math.floor(Math.min(r.width/(r.width > r.height ? 19 : 11), r.height/11))));
    draw();
  }
  function draw(){
    const d = view.dpr, ts = view.ts;
    ctx.setTransform(d, 0, 0, d, 0, 0);
    ctx.fillStyle = "#000"; ctx.fillRect(0, 0, view.w, view.h);
    if (!G) return;
    const p = G.p;
    const camX = p.x*ts + ts/2 - view.w/2, camY = p.y*ts + ts/2 - view.h/2 + 18;
    const x0 = Math.max(0, Math.floor(camX/ts)), y0 = Math.max(0, Math.floor(camY/ts));
    const x1 = Math.min(MW - 1, Math.ceil((camX + view.w)/ts)), y1 = Math.min(MH - 1, Math.ceil((camY + view.h)/ts));
    ctx.save(); ctx.translate(-camX, -camY);
    for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++){
      const k = key(x, y);
      if (!G.seen[k]) continue;
      const sx = x*ts, sy = y*ts, wall = G.map[k] === 1;
      if (wall){
        ctx.fillStyle = "#3B3355"; ctx.fillRect(sx, sy, ts, ts);
        ctx.fillStyle = "#4D4470"; ctx.fillRect(sx, sy, ts, ts*.28);
        ctx.strokeStyle = "rgba(0,0,0,.35)"; ctx.lineWidth = 1; ctx.strokeRect(sx + .5, sy + .5, ts - 1, ts - 1);
      } else {
        ctx.fillStyle = (x + y) % 2 ? "#2A2440" : "#27213B"; ctx.fillRect(sx, sy, ts, ts);
      }
      if (!G.vis[k]){ ctx.fillStyle = "rgba(0,0,0,.55)"; ctx.fillRect(sx, sy, ts, ts); }
    }
    ctx.textAlign = "center"; ctx.textBaseline = "middle";
    ctx.font = `${Math.round(ts*.72)}px ${EMOJI}`;
    if (G.stairs && G.seen[key(G.stairs.x, G.stairs.y)]){
      const sx = G.stairs.x*ts, sy = G.stairs.y*ts;
      ctx.fillStyle = "#1A1528"; ctx.fillRect(sx + 2, sy + 2, ts - 4, ts - 4);
      ctx.fillStyle = "#FFC93C";
      for (let i = 0; i < 4; i++) ctx.fillRect(sx + ts*.2 + i*ts*.05, sy + ts*.2 + i*ts*.16, ts*.6 - i*ts*.1, ts*.1);
    }
    for (const it of G.items){
      if (!G.vis[key(it.x, it.y)] && !(G.mapShown && G.seen[key(it.x, it.y)])) continue;
      ctx.fillText(it.t === "crown" ? "👑" : ITEMS[it.t].ic, it.x*ts + ts/2, it.y*ts + ts/2 + 1);
    }
    for (const m of G.mons){
      if (!G.vis[key(m.x, m.y)]) continue;
      const cx = m.x*ts + ts/2, cy = m.y*ts + ts/2;
      if (m.flash > 0){ ctx.fillStyle = `rgba(255,90,95,${m.flash*.6})`; ctx.fillRect(m.x*ts, m.y*ts, ts, ts); m.flash = Math.max(0, m.flash - .5); }
      ctx.font = `${Math.round(ts*(MONSTERS[m.t].boss ? .95 : .76))}px ${EMOJI}`;
      ctx.fillText(MONSTERS[m.t].ic, cx, cy + 1);
      if (m.hp < m.maxHp){
        ctx.fillStyle = "#3A2030"; ctx.fillRect(m.x*ts + 3, m.y*ts + 1, ts - 6, 4);
        ctx.fillStyle = "#FF5A5F"; ctx.fillRect(m.x*ts + 3, m.y*ts + 1, (ts - 6)*m.hp/m.maxHp, 4);
      }
    }
    // kahraman: çizilen küçük şövalye
    const hx = p.x*ts + ts/2, hy = p.y*ts + ts/2, s = ts/32;
    ctx.save(); ctx.translate(hx, hy); ctx.scale(s, s);
    ctx.fillStyle = "rgba(255,201,60,.18)"; ctx.beginPath(); ctx.arc(0, 0, 15, 0, Math.PI*2); ctx.fill();
    ctx.fillStyle = "#3D8BFD"; ctx.beginPath(); ctx.roundRect(-8, -2, 16, 14, 4); ctx.fill();
    ctx.fillStyle = "#FFD7B0"; ctx.beginPath(); ctx.arc(0, -7, 6.5, 0, Math.PI*2); ctx.fill();
    ctx.fillStyle = "#C9CED6"; ctx.beginPath(); ctx.arc(0, -9, 7, Math.PI, 0); ctx.fill(); ctx.fillRect(-7, -10, 14, 3);
    ctx.fillStyle = "#222"; ctx.fillRect(-3, -7, 2, 2); ctx.fillRect(2, -7, 2, 2);
    ctx.fillStyle = "#E9EEF5"; ctx.fillRect(10, -12, 2.5, 18); ctx.fillStyle = "#B8902A"; ctx.fillRect(7.5, 4, 8, 2.5);
    ctx.fillStyle = "#FFC93C"; ctx.beginPath(); ctx.arc(-10, 4, 5, 0, Math.PI*2); ctx.fill();
    ctx.restore();
    if (G.boom){
      ctx.fillStyle = `rgba(255,160,60,${G.boom.t*.45})`;
      ctx.fillRect((G.boom.x - 2)*ts, (G.boom.y - 2)*ts, ts*5, ts*5);
      G.boom.t -= .5; if (G.boom.t <= 0) G.boom = null;
    }
    ctx.restore();
    if (G.hurt){ ctx.fillStyle = `rgba(255,40,60,${G.hurt*.25})`; ctx.fillRect(0, 0, view.w, view.h); G.hurt = Math.max(0, G.hurt - .5); }
    // sönümlenen efektler bir sonraki karede temizlensin
    if (G.boom || G.hurt || G.mons.some(m => m.flash > 0)) requestAnimationFrame(draw);
  }

  /* ---------- giriş ---------- */
  const KEYS = {ArrowUp:"u", w:"u", W:"u", ArrowDown:"d", s:"d", S:"d", ArrowLeft:"l", a:"l", A:"l", ArrowRight:"r", d:"r", D:"r",
    " ":"wait", ".":"wait", q:"potion", Q:"potion", b:"bomb", B:"bomb", r:"scroll", R:"scroll"};
  window.addEventListener("keydown", e => {
    if (!$("menu").hidden || !$("over").hidden) return;
    const a = KEYS[e.key]; if (!a) return;
    e.preventDefault(); audio(); playerTurn(a);
  });
  // dokunarak: tıklanan yöne bir adım
  cv.addEventListener("pointerdown", e => {
    if (!G || G.over) return;
    audio();
    const r = cv.getBoundingClientRect(), ts = view.ts;
    const camX = G.p.x*ts + ts/2 - view.w/2, camY = G.p.y*ts + ts/2 - view.h/2 + 18;
    const tx = Math.floor((e.clientX - r.left + camX)/ts), ty = Math.floor((e.clientY - r.top + camY)/ts);
    const dx = tx - G.p.x, dy = ty - G.p.y;
    if (!dx && !dy){ playerTurn("wait"); return; }
    playerTurn(Math.abs(dx) >= Math.abs(dy) ? (dx > 0 ? "r" : "l") : (dy > 0 ? "d" : "u"));
  });
  // basılı tutunca tekrar eden yön düğmeleri
  let holdT = null;
  document.querySelectorAll("#dpad button").forEach(b => {
    const go = () => { audio(); playerTurn(b.dataset.d); };
    b.addEventListener("pointerdown", e => { e.preventDefault(); go(); clearInterval(holdT); holdT = setInterval(go, 170); });
    ["pointerup", "pointerleave", "pointercancel"].forEach(ev => b.addEventListener(ev, () => clearInterval(holdT)));
  });
  $("b-potion").addEventListener("click", () => { audio(); playerTurn("potion"); });
  $("b-bomb").addEventListener("click", () => { audio(); playerTurn("bomb"); });
  $("b-scroll").addEventListener("click", () => { audio(); playerTurn("scroll"); });
  $("b-wait").addEventListener("click", () => { audio(); playerTurn("wait"); });
  const diffNow = () => +document.querySelector('input[name="diff"]:checked').value;
  $("start").addEventListener("click", () => { audio(); newGame(diffNow()); });
  $("resume").addEventListener("click", () => { $("menu").hidden = true; });
  $("open-menu").addEventListener("click", () => { $("menu").hidden = false; renderBest(); });
  $("again").addEventListener("click", () => { audio(); newGame(G ? G.diff : diffNow()); });

  if (!CanvasRenderingContext2D.prototype.roundRect){
    CanvasRenderingContext2D.prototype.roundRect = function(x, y, w, h, r){
      r = Math.min(r, w/2, h/2);
      this.moveTo(x + r, y); this.arcTo(x + w, y, x + w, y + h, r); this.arcTo(x + w, y + h, x, y + h, r);
      this.arcTo(x, y + h, x, y, r); this.arcTo(x, y, x + w, y, r); this.closePath();
    };
  }

  // test kancası
  window.__zk = {newGame, playerTurn, bfs, MONSTERS, get G(){ return G; }, key, MW, MH};

  if ("ResizeObserver" in window) new ResizeObserver(resize).observe(stage);
  else window.addEventListener("resize", resize);
  resize(); renderBest();
})();
