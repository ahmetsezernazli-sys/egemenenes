/* Limonata Tezgahı — Enes için 14 günlük işletme oyunu */
(() => {
  "use strict";
  const $ = (id) => document.getElementById(id);
  const SAVE_KEY = "limonata", DAYS = 14, PITCHER = 10;
  // malzemeler: paket boyu ve fiyatı (kuruş)
  const ITEMS = [
    { k: "lemon", e: "🍋", ad: "Limon", pack: 12, price: 400 },
    { k: "sugar", e: "🍬", ad: "Şeker (ölçek)", pack: 20, price: 300 },
    { k: "cup", e: "🥤", ad: "Bardak", pack: 25, price: 250 },
    { k: "ice", e: "🧊", ad: "Buz küpü", pack: 60, price: 200 }
  ];
  const WEATHER = [
    { k: "sun", ic: "☀️", ad: "Güneşli", base: 1, t: [27, 36] },
    { k: "part", ic: "⛅", ad: "Parçalı bulutlu", base: 0.75, t: [22, 30] },
    { k: "cloud", ic: "☁️", ad: "Bulutlu", base: 0.5, t: [18, 25] },
    { k: "rain", ic: "🌧️", ad: "Yağmurlu", base: 0.22, t: [15, 22] }
  ];
  const PEOPLE = ["🧒", "👧", "👦", "👩", "👨", "👵", "👴", "🧑", "👱", "🧔"];
  const rnd = (a, b) => a + Math.random() * (b - a);
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const tl = (k) => (k / 100).toLocaleString("tr-TR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  let best = 0;
  try { best = JSON.parse(localStorage.getItem(SAVE_KEY) || "{}").best || 0; } catch (e) {}

  /* ---------- ses ---------- */
  let AC = null;
  function audio() { try { AC = AC || new (window.AudioContext || window.webkitAudioContext)(); if (AC.state === "suspended") AC.resume(); } catch (e) {} }
  function snd(f, d, type, vol, delay) {
    if (!AC || fast) return;
    const t = AC.currentTime + (delay || 0), o = AC.createOscillator(), g = AC.createGain();
    o.type = type || "triangle"; o.frequency.setValueAtTime(f, t);
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol || 0.05, t + 0.01); g.gain.exponentialRampToValueAtTime(0.0001, t + d);
    o.connect(g).connect(AC.destination); o.start(t); o.stop(t + d + 0.02);
  }
  const SND = { coin: () => { snd(1320, 0.06, "square", 0.03); snd(1760, 0.08, "square", 0.03, 0.05); }, buy: () => snd(600, 0.08), no: () => snd(200, 0.12, "sine", 0.05), end: () => [523, 659, 784].forEach((f, i) => snd(f, 0.18, "triangle", 0.06, i * 0.1)) };

  /* ---------- durum ---------- */
  let G = null, fast = false;
  function newGame() {
    G = { day: 1, money: 2000, rep: 0.45, inv: { lemon: 0, sugar: 0, cup: 0, ice: 0 }, rec: { lemon: 4, sugar: 4, ice: 3, price: 150 }, history: [] };
    rollWeather();
    $("intro").hidden = true; $("over").hidden = true; $("report").hidden = true;
    showPlan();
  }
  function rollWeather() {
    const r = Math.random(), w = r < 0.4 ? WEATHER[0] : r < 0.68 ? WEATHER[1] : r < 0.86 ? WEATHER[2] : WEATHER[3];
    G.w = w; G.temp = Math.round(rnd(w.t[0], w.t[1]));
  }
  const idealIce = () => clamp(Math.round((G.temp - 16) / 4), 0, 6);
  const maxPrice = () => 50 + G.temp * 4.5 + G.rep * 90;   // kuruş

  function cupsPossible() {
    const r = G.rec, inv = G.inv;
    const pitchers = Math.min(r.lemon ? Math.floor(inv.lemon / r.lemon) : Infinity, r.sugar ? Math.floor(inv.sugar / r.sugar) : Infinity);
    let cups = Math.min(pitchers * PITCHER, inv.cup);
    if (r.ice) cups = Math.min(cups, Math.floor(inv.ice / r.ice));
    return Number.isFinite(cups) ? cups : inv.cup;
  }

  /* ---------- planlama ekranı ---------- */
  function hud() {
    $("day").textContent = G.day; $("money").textContent = tl(G.money);
    $("rep").style.width = Math.round(G.rep * 100) + "%";
  }
  function showPlan() {
    $("plan").hidden = false; $("sim").hidden = true;
    $("w-ic").textContent = G.w.ic; $("w-tx").textContent = G.w.ad; $("w-temp").textContent = `${G.temp} °C`;
    const tips = { sun: "Sıcak ve güneşli: bol müşteri gelir, buzlu limonata çok sevilir!", part: "Güzel bir gün: müşteriler gelir, fazla abartma.", cloud: "Serin bir gün: daha az müşteri, buzu az tut.", rain: "Yağmur var: çok az kişi uğrar. Az malzeme al!" };
    $("w-note").textContent = tips[G.w.k];
    renderShop(); renderRecipe(); hud();
  }
  function renderShop() {
    const box = $("shop"); box.textContent = "";
    for (const it of ITEMS) {
      const row = document.createElement("div"); row.className = "row";
      row.innerHTML = `<span class="em" aria-hidden="true">${it.e}</span><span class="nm">${it.ad}<small>${it.pack} adet: ${tl(it.price)} ₺</small></span>
        <span class="buy"><b class="stock" aria-label="Elde">${G.inv[it.k]}</b><button class="btn small yellow" type="button">Al</button></span>`;
      row.querySelector("button").addEventListener("click", () => { audio(); buy(it.k); });
      row.querySelector("button").disabled = G.money < it.price;
      row.querySelector("button").setAttribute("aria-label", `${it.pack} ${it.ad} al, ${tl(it.price)} lira`);
      box.appendChild(row);
    }
  }
  function buy(k) {
    const it = ITEMS.find(i => i.k === k);
    if (G.money < it.price) { SND.no(); return false; }
    G.money -= it.price; G.inv[k] += it.pack; G.spent = (G.spent || 0) + it.price; SND.buy();
    renderShop(); renderRecipe(); hud();
    return true;
  }
  const REC = [
    { k: "lemon", ad: "Limon", sub: "sürahi başına", min: 1, max: 10, step: 1, f: (v) => v },
    { k: "sugar", ad: "Şeker", sub: "sürahi başına (ölçek)", min: 0, max: 10, step: 1, f: (v) => v },
    { k: "ice", ad: "Buz", sub: "bardak başına", min: 0, max: 8, step: 1, f: (v) => v },
    { k: "price", ad: "Fiyat", sub: "bardak başına", min: 25, max: 1000, step: 25, f: (v) => tl(v) + " ₺" }
  ];
  function renderRecipe() {
    const box = $("recipe"); box.textContent = "";
    for (const r of REC) {
      const row = document.createElement("div"); row.className = "step";
      row.innerHTML = `<span class="lbl">${r.ad}<small>${r.sub}</small></span><button type="button" aria-label="${r.ad} azalt">−</button><span class="val">${r.f(G.rec[r.k])}</span><button type="button" aria-label="${r.ad} artır">+</button>`;
      const [m, p] = row.querySelectorAll("button");
      m.addEventListener("click", () => { G.rec[r.k] = clamp(G.rec[r.k] - r.step, r.min, r.max); renderRecipe(); });
      p.addEventListener("click", () => { G.rec[r.k] = clamp(G.rec[r.k] + r.step, r.min, r.max); renderRecipe(); });
      box.appendChild(row);
    }
    const c = cupsPossible();
    $("can-make").innerHTML = c > 0 ? `Elindeki malzemeyle <b>${c} bardak</b> yapabilirsin.` : "Henüz limonata yapamazsın: limon, şeker, bardak (ve buz kullanacaksan buz) al.";
    $("open").textContent = c > 0 ? "Tezgahı aç!" : "Bugün kapalı kal (günü geç)";
  }

  /* ---------- gün simülasyonu ---------- */
  function taste() {
    const r = G.rec;
    const ls = 1 - Math.abs(r.lemon - 4) / 5, ss = 1 - Math.abs(r.sugar - 4) / 5, is = 1 - Math.abs(r.ice - idealIce()) / 6;
    return clamp((ls * 0.4 + ss * 0.35 + is * 0.25), 0, 1);
  }
  function planDay() {
    const pot = Math.round(110 * G.w.base * (0.55 + G.temp / 60) * (0.55 + G.rep * 0.9) * rnd(0.85, 1.15));
    const tq = taste(), mp = maxPrice();
    const cust = [];
    for (let i = 0; i < pot; i++) {
      const willing = mp * rnd(0.5, 1.25) * (0.6 + tq * 0.5);
      cust.push({ buy: G.rec.price <= willing, p: PEOPLE[Math.floor(Math.random() * PEOPLE.length)] });
    }
    return { cust, tq, mp };
  }
  let sim = null;
  function openStand() {
    if (cupsPossible() <= 0) { skipDay(); return false; }
    const plan = planDay();
    sim = { plan, i: 0, sold: 0, missed: 0, soldOut: 0, revenue: 0, sat: 0, t: 0, dur: 14, speed: 1, walkers: [], pitcher: 0, startMoney: G.money, spent: G.spent || 0 };
    G.spent = 0;
    $("plan").hidden = true; $("sim").hidden = false; $("feed").textContent = "";
    $("speed").textContent = "⏩ Hızlandır";
    if (fast) { while (sim) step(1); return true; }
    requestAnimationFrame(loop);
    return true;
  }
  function serve(c) {
    // sürahi boşsa yenisini yap
    const r = G.rec;
    if (sim.pitcher <= 0) {
      if (G.inv.lemon < r.lemon || G.inv.sugar < r.sugar) return false;
      G.inv.lemon -= r.lemon; G.inv.sugar -= r.sugar; sim.pitcher = PITCHER;
    }
    if (G.inv.cup < 1 || G.inv.ice < r.ice) return false;
    G.inv.cup--; G.inv.ice -= r.ice; sim.pitcher--;
    G.money += r.price; sim.revenue += r.price; sim.sold++;
    sim.sat += clamp(sim.plan.tq * 0.75 + (r.price <= sim.plan.mp * 0.75 ? 0.25 : r.price <= sim.plan.mp ? 0.12 : 0), 0, 1);
    return true;
  }
  // limonata yapılamıyorsa gün boşa geçer (oyun kilitlenmesin)
  function skipDay() {
    G.rep = clamp(G.rep - 0.04, 0.05, 1); G.inv.ice = 0;
    G.history.push({ day: G.day, sold: 0, revenue: 0, profit: -(G.spent || 0) }); G.spent = 0;
    if (fast) { nextDay(); return; }
    $("r-title").textContent = `${G.day}. gün: tezgah kapalı`;
    $("r-table").innerHTML = "<tr><td>Satılan bardak</td><td>0</td></tr>";
    $("r-quotes").innerHTML = "<li>🙁 Müşteriler kapalı tezgahı görüp gitti. Ünün biraz düştü.</li><li>💡 Bir sürahi için limon ve şeker, her bardak için bir bardak (ve buz) gerekir.</li>";
    $("r-next").textContent = G.day >= DAYS ? "Sonuçları gör" : "Ertesi güne geç";
    $("report").hidden = false;
  }
  function feed(t, cls) {
    if (fast) return;
    const li = document.createElement("li"); li.textContent = t; if (cls) li.className = cls;
    const f = $("feed"); f.prepend(li); while (f.children.length > 30) f.lastChild.remove();
  }
  const NO_BUY = ["“Bu fiyata almam.”", "“Çok pahalı!”", "“Belki yarın…”"];
  const YES = ["“Mmm, nefis!”", "“Tam kıvamında!”", "“Serinletti!”"];
  function step(dt) {
    sim.t += dt * sim.speed;
    const n = sim.plan.cust.length, due = Math.min(n, Math.floor(sim.t / sim.dur * n));
    while (sim.i < due) {
      const c = sim.plan.cust[sim.i++];
      let ok = false;
      if (c.buy) { ok = serve(c); if (ok) { SND.coin(); if (Math.random() < 0.3) feed(`${c.p} ${YES[Math.floor(Math.random() * 3)]} +${tl(G.rec.price)} ₺`, "y"); } else { sim.soldOut++; if (sim.soldOut === 1) feed("🚫 Limonata bitti! Müşteriler eli boş dönüyor.", "n"); } }
      else { sim.missed++; if (Math.random() < 0.2) feed(`${c.p} ${NO_BUY[Math.floor(Math.random() * 3)]}`, "n"); }
      if (!fast) sim.walkers.push({ p: c.p, x: -0.05, buy: c.buy && ok, t: 0, stopped: 0 });
    }
    if (!fast) {
      for (const w of sim.walkers) { if (w.buy && w.x > 0.48 && w.stopped < 0.6) { w.stopped += dt * sim.speed; } else w.x += dt * sim.speed * 0.24; }
      sim.walkers = sim.walkers.filter(w => w.x < 1.1);
      $("prog").style.width = Math.min(100, sim.t / sim.dur * 100) + "%";
      hud();
    }
    if (sim.t >= sim.dur && sim.i >= n) endDay();
  }
  function endDay() {
    const s = sim; sim = null;
    const melted = G.inv.ice; G.inv.ice = 0;
    const avgSat = s.sold ? s.sat / s.sold : 0.4;
    const unhappy = s.soldOut > 0 ? Math.min(0.15, s.soldOut / 200) : 0;
    G.rep = clamp(G.rep * 0.65 + avgSat * 0.35 - unhappy + (s.sold === 0 ? -0.03 : 0), 0.05, 1);
    const profit = s.revenue - s.spent;
    G.history.push({ day: G.day, sold: s.sold, revenue: s.revenue, profit });
    SND.end();
    if (fast) { nextDay(); return; }
    $("r-title").textContent = `${G.day}. gün bitti`;
    const rows = [
      ["Gelen müşteri", s.plan.cust.length], ["Satılan bardak", s.sold], ["Fiyatı beğenmeyen", s.missed],
      ...(s.soldOut ? [["Limonata bitince dönen", s.soldOut]] : []),
      ["Gelir", tl(s.revenue) + " ₺"], ["Bugün harcanan", tl(s.spent) + " ₺"],
      ["Günün kârı", `<span class="${profit >= 0 ? "pos" : "neg"}">${profit >= 0 ? "+" : ""}${tl(profit)} ₺</span>`]
    ];
    if (melted) rows.push(["Eriyen buz", melted]);
    $("r-table").innerHTML = rows.map(([a, b]) => `<tr><td>${a}</td><td>${b}</td></tr>`).join("");
    const q = [];
    const r = G.rec, ii = idealIce();
    if (r.lemon > 5) q.push("🍋 “Biraz fazla ekşi.”"); else if (r.lemon < 3) q.push("🍋 “Limon tadı az gelmiş.”");
    if (r.sugar > 5) q.push("🍬 “Çok tatlı!”"); else if (r.sugar < 3) q.push("🍬 “Biraz şekersiz.”");
    if (r.ice < ii - 1) q.push("🧊 “Bu sıcakta daha soğuk olsa…”"); else if (r.ice > ii + 2) q.push("🧊 “Buz çok fazla, dişlerim üşüdü.”");
    if (s.missed > s.plan.cust.length * 0.5) q.push("💸 “Fiyat biraz yüksek.”");
    if (!q.length && s.sold) q.push("😋 “Harika limonata, yarın yine geleceğim!”");
    $("r-quotes").innerHTML = q.map(x => `<li>${x}</li>`).join("");
    $("r-next").textContent = G.day >= DAYS ? "Sonuçları gör" : "Ertesi güne geç";
    $("report").hidden = false; $("r-next").focus();
    hud();
  }
  function nextDay() {
    $("report").hidden = true;
    if (G.day >= DAYS) return finish();
    G.day++; rollWeather(); if (!fast) showPlan();
  }
  function finish() {
    const total = G.money, newBest = total > best;
    if (newBest) { best = total; try { localStorage.setItem(SAVE_KEY, JSON.stringify({ best })); } catch (e) {} }
    if (fast) return;
    const bestDay = G.history.reduce((a, h) => h.profit > a.profit ? h : a, G.history[0]);
    $("o-title").textContent = total >= 2000 ? `${tl(total)} ₺ ile bitirdin!` : `${tl(total)} ₺ kaldı`;
    $("o-tx").textContent = `Başlangıçta 20 ₺ vardı. ${total > 2000 ? `${tl(total - 2000)} ₺ kâr ettin!` : "Bu sefer zarar ettin, tarifi ve fiyatı değiştirerek tekrar dene."} En iyi gün: ${bestDay.day}. gün (${bestDay.profit >= 0 ? "+" : ""}${tl(bestDay.profit)} ₺). ${newBest ? "Yeni rekor!" : `Rekor: ${tl(best)} ₺`}`;
    $("over").hidden = false;
  }

  /* ---------- çizim ---------- */
  const cv = $("cv"), ctx = cv.getContext("2d");
  let last = 0;
  function loop(now) {
    if (!sim) return;
    const dt = last ? Math.min(0.05, (now - last) / 1000) : 0; last = now;
    step(dt); draw();
    if (sim) requestAnimationFrame(loop); else last = 0;
  }
  function draw() {
    const r = cv.getBoundingClientRect(), d = Math.min(2, devicePixelRatio || 1);
    if (cv.width !== Math.round(r.width * d)) { cv.width = Math.round(r.width * d); cv.height = Math.round(r.height * d); }
    const W = r.width, H = r.height;
    ctx.setTransform(d, 0, 0, d, 0, 0); ctx.clearRect(0, 0, W, H);
    if (!sim && !G) return;
    // güneş / yağmur
    ctx.font = `${H * 0.18}px "Segoe UI Emoji","Apple Color Emoji",sans-serif`; ctx.textAlign = "center"; ctx.textBaseline = "middle";
    ctx.fillText(G.w.ic, W * 0.86, H * 0.17);
    if (G.w.k === "rain") { ctx.strokeStyle = "rgba(80,120,200,.5)"; ctx.lineWidth = 2; const t = performance.now() / 300; for (let i = 0; i < 40; i++) { const x = (i * 53 + t * 40) % W, y = ((i * 37) + t * 120) % (H * 0.55); ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x - 3, y + 10); ctx.stroke(); } }
    // tezgah
    const sx = W * 0.5, sy = H * 0.62;
    ctx.fillStyle = "#C98B54"; ctx.fillRect(sx - 70, sy - 10, 140, 50);
    ctx.fillStyle = "#FFD93B"; ctx.fillRect(sx - 80, sy - 70, 160, 14);
    for (let i = 0; i < 8; i++) { ctx.fillStyle = i % 2 ? "#FFF" : "#FFD93B"; ctx.fillRect(sx - 80 + i * 20, sy - 70, 20, 14); }
    ctx.fillStyle = "#8E5A2B"; ctx.fillRect(sx - 74, sy - 56, 6, 46); ctx.fillRect(sx + 68, sy - 56, 6, 46);
    ctx.fillStyle = "#3A2E12"; ctx.font = `800 ${Math.max(12, H * 0.06)}px Rubik, sans-serif`; ctx.fillText(`LİMONATA ${tl(G.rec.price)} ₺`, sx, sy + 15);
    ctx.font = `${H * 0.13}px "Segoe UI Emoji","Apple Color Emoji",sans-serif`; ctx.fillText("🍋", sx - 40, sy - 26); ctx.fillText("🥤", sx + 40, sy - 26);
    // müşteriler
    ctx.font = `${H * 0.16}px "Segoe UI Emoji","Apple Color Emoji",sans-serif`;
    if (sim) for (const w of sim.walkers) {
      const x = w.x * W, y = H * 0.78 + Math.sin(w.x * 60) * 2;
      ctx.fillText(w.p, x, y);
      if (w.buy && w.x > 0.48) { ctx.font = `${H * 0.09}px "Segoe UI Emoji",sans-serif`; ctx.fillText("🥤", x + 16, y - 8); ctx.font = `${H * 0.16}px "Segoe UI Emoji","Apple Color Emoji",sans-serif`; }
    }
  }

  /* ---------- düğmeler ---------- */
  $("open").addEventListener("click", () => { audio(); openStand(); });
  $("speed").addEventListener("click", () => { if (!sim) return; sim.speed = sim.speed === 1 ? 4 : 1; $("speed").textContent = sim.speed === 1 ? "⏩ Hızlandır" : "▶ Normal hız"; });
  $("r-next").addEventListener("click", () => { audio(); nextDay(); });
  $("start").addEventListener("click", () => { audio(); newGame(); });
  $("again").addEventListener("click", () => { audio(); newGame(); });
  $("restart").addEventListener("click", () => { sim = null; $("best").textContent = best ? `Rekor: ${tl(best)} ₺` : ""; $("intro").hidden = false; });
  $("best").textContent = best ? `Rekor: ${tl(best)} ₺` : "";
  G = { day: 1, money: 2000, rep: 0.45, inv: { lemon: 0, sugar: 0, cup: 0, ice: 0 }, rec: { lemon: 4, sugar: 4, ice: 3, price: 150 }, history: [] };
  rollWeather(); showPlan();

  // test kancası
  window.__lm = { newGame, buy, openStand, nextDay, cupsPossible, taste, idealIce, setFast: (f) => { fast = f; }, get G() { return G; }, get best() { return best; } };
})();
