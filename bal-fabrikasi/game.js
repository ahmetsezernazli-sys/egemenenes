/* Bal Fabrikası — Enes için tıklamalı üretim (idle) oyunu */
(() => {
  "use strict";
  const $ = (id) => document.getElementById(id);
  const SAVE_KEY = "bal-fabrikasi", GROW = 1.13, OFFLINE_MAX = 2 * 3600, OFFLINE_RATE = 0.5;
  // üreticiler: resim, ad, açıklama, ilk fiyat, saniyelik üretim
  const BLD = [
    ["🐝", "İşçi arı", "Çiçekten çiçeğe uçar", 15, 0.2],
    ["🏠", "Kovan", "Arılara yuva", 100, 1],
    ["🌻", "Çiçek tarlası", "Bol bol nektar", 1100, 8],
    ["🏭", "Bal makinesi", "Balı süzer ve kavanozlar", 12000, 47],
    ["🚚", "Bal kamyonu", "Şehir şehir dağıtır", 130000, 260],
    ["🏰", "Arı krallığı", "Kraliçe yönetiyor", 1.4e6, 1400],
    ["🚀", "Uzay kovanı", "Yıldızlarda çiçek var mı?", 2e7, 7800],
    ["🪐", "Bal gezegeni", "Her yer bal!", 3.3e8, 44000]
  ];
  // güçlendirmeler: resim, ad, fiyat, açılma şartı, etki
  const UPS = [
    ["👆", "Güçlü parmak: tıklama ×2", 100, s => s.clicks >= 30, s => { s.clickMul *= 2; }],
    ["🍯", "Tatlı tıklama: tıklama saniyelik üretimin %5'i kadar artar", 5000, s => s.total >= 2000, s => { s.clickPct += 0.05; }],
    ["🐝", "Hızlı kanat: işçi arılar ×2", 300, s => s.b[0] >= 10, s => { s.mul[0] *= 2; }],
    ["🏠", "Büyük kovan: kovanlar ×2", 2000, s => s.b[1] >= 10, s => { s.mul[1] *= 2; }],
    ["🌻", "Gübre: tarlalar ×2", 20000, s => s.b[2] >= 10, s => { s.mul[2] *= 2; }],
    ["🏭", "Yeni motor: makineler ×2", 200000, s => s.b[3] >= 10, s => { s.mul[3] *= 2; }],
    ["🚚", "Otoyol: kamyonlar ×2", 2e6, s => s.b[4] >= 10, s => { s.mul[4] *= 2; }],
    ["👑", "Altın taç: krallık ×2", 2e7, s => s.b[5] >= 10, s => { s.mul[5] *= 2; }],
    ["✨", "Altın arı daha sık gelir", 50000, s => s.golds >= 3, s => { s.goldFreq *= 0.6; }],
    ["🌈", "Gökkuşağı balı: her şey ×1.5", 5e6, s => s.total >= 2e6, s => { s.all *= 1.5; }]
  ];
  const ACH = [[100, "İlk 100 bal!"], [1000, "Bin bal!"], [1e5, "Yüz bin bal!"], [1e6, "Milyoner arıcı!"], [1e9, "Milyarder arıcı!"]];

  let AC = null;
  function audio() { try { AC = AC || new (window.AudioContext || window.webkitAudioContext)(); if (AC.state === "suspended") AC.resume(); } catch (e) {} }
  function snd(f, d, type, vol, delay) {
    if (!AC) return;
    const t = AC.currentTime + (delay || 0), o = AC.createOscillator(), g = AC.createGain();
    o.type = type || "triangle"; o.frequency.setValueAtTime(f, t);
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol || 0.04, t + 0.01); g.gain.exponentialRampToValueAtTime(0.0001, t + d);
    o.connect(g).connect(AC.destination); o.start(t); o.stop(t + d + 0.02);
  }

  const fresh = () => ({ honey: 0, total: 0, clicks: 0, b: BLD.map(() => 0), mul: BLD.map(() => 1), ups: [], clickMul: 1, clickPct: 0, all: 1, goldFreq: 1, golds: 0, ach: 0, boostT: 0, saved: Date.now() });
  let S = fresh();
  try { const s = JSON.parse(localStorage.getItem(SAVE_KEY) || "null"); if (s) S = Object.assign(fresh(), s); } catch (e) {}
  // eski güçlendirmelerin etkisini yeniden uygula
  (() => { const ids = S.ups.slice(); const base = fresh(); S.mul = base.mul; S.clickMul = 1; S.clickPct = 0; S.all = 1; S.goldFreq = 1; ids.forEach(i => UPS[i][4](S)); })();
  const persist = () => { S.saved = Date.now(); try { localStorage.setItem(SAVE_KEY, JSON.stringify(S)); } catch (e) {} };

  const fmt = (n) => {
    if (n < 1000) return n < 10 && n % 1 ? n.toFixed(1).replace(".", ",") : Math.floor(n).toLocaleString("tr-TR");
    const u = [[1e12, "trilyon"], [1e9, "milyar"], [1e6, "milyon"], [1e3, "bin"]];
    for (const [v, w] of u) if (n >= v) return (n / v).toFixed(n / v < 10 ? 2 : n / v < 100 ? 1 : 0).replace(".", ",") + " " + w;
    return String(n);
  };
  const cost = (i) => Math.ceil(BLD[i][3] * Math.pow(GROW, S.b[i]));
  const boostMul = () => S.boostT > 0 ? 7 : 1;
  const perSec = () => BLD.reduce((s, b, i) => s + b[4] * S.b[i] * S.mul[i], 0) * S.all * boostMul();
  const perClick = () => (1 * S.clickMul + perSec() * S.clickPct) * (S.boostT > 0 ? 1 : 1);

  function gain(n) { S.honey += n; S.total += n; }
  function click(e) {
    const n = perClick(); gain(n); S.clicks++; snd(500 + Math.random() * 200, 0.05, "sine", 0.03);
    if (e && e.clientX) {
      const r = $("left").getBoundingClientRect(), p = document.createElement("div");
      p.className = "pop"; p.textContent = "+" + fmt(n); p.style.left = (e.clientX - r.left - 10) + "px"; p.style.top = (e.clientY - r.top - 20) + "px";
      $("left").appendChild(p); setTimeout(() => p.remove(), 900);
    }
    render();
  }
  function buy(i) {
    const c = cost(i); if (S.honey < c) return false;
    S.honey -= c; S.b[i]++; snd(700, 0.08); snd(940, 0.1, "triangle", 0.04, 0.06);
    renderShop(); render(); return true;
  }
  function buyUp(i) {
    const u = UPS[i]; if (S.ups.includes(i) || S.honey < u[2] || !u[3](S)) return false;
    S.honey -= u[2]; S.ups.push(i); u[4](S); snd(880, 0.1); snd(1320, 0.14, "triangle", 0.05, 0.08);
    toast(`${u[0]} ${u[1]}`); renderShop(); render(); return true;
  }
  let toastT = null;
  function toast(t) { const el = $("toast"); el.textContent = t; el.hidden = false; clearTimeout(toastT); toastT = setTimeout(() => { el.hidden = true; }, 2500); }

  /* ---------- altın arı ---------- */
  let goldT = 40 + Math.random() * 40, goldEl = null;
  function spawnGold() {
    const left = $("left"), b = document.createElement("button");
    b.type = "button"; b.className = "gold-bee"; b.textContent = "🐝"; b.setAttribute("aria-label", "Altın arı! Yakala");
    b.style.filter = "drop-shadow(0 0 10px gold) saturate(2)";
    b.style.left = (10 + Math.random() * 70) + "%"; b.style.top = (20 + Math.random() * 60) + "%";
    b.addEventListener("click", () => { audio(); S.golds++; if (Math.random() < 0.5) { S.boostT = 20; toast("⚡ Altın arı! 20 saniye boyunca üretim ×7"); } else { const bonus = Math.max(50, perSec() * 60); gain(bonus); toast(`🍯 Altın arı! +${fmt(bonus)} bal`); } [784, 988, 1175, 1568].forEach((f, i) => snd(f, 0.12, "triangle", 0.06, i * 0.07)); b.remove(); goldEl = null; render(); });
    left.appendChild(b); goldEl = b;
    setTimeout(() => { if (goldEl === b) { b.remove(); goldEl = null; } }, 9000);
  }

  /* ---------- çizim ---------- */
  function renderShop() {
    const bl = $("blds"); bl.textContent = "";
    BLD.forEach((b, i) => {
      if (i > 0 && S.b[i - 1] === 0 && S.total < b[3] * 0.5) return;   // henüz gizli
      const btn = document.createElement("button"); btn.type = "button"; btn.className = "b"; btn.dataset.i = i;
      btn.innerHTML = `<span class="e" aria-hidden="true">${b[0]}</span><span class="nm">${b[1]}<small>${b[2]} · saniyede ${fmt(b[4] * S.mul[i] * S.all)} · fiyat <b data-c>${fmt(cost(i))}</b></small></span><span class="cnt">${S.b[i]}</span>`;
      btn.addEventListener("click", () => { audio(); buy(i); });
      bl.appendChild(btn);
    });
    const up = $("ups"); up.textContent = "";
    UPS.forEach((u, i) => {
      if (S.ups.includes(i) || !u[3](S)) return;
      const btn = document.createElement("button"); btn.type = "button"; btn.className = "up"; btn.dataset.i = i; btn.textContent = u[0];
      btn.title = `${u[1]} — ${fmt(u[2])} bal`; btn.setAttribute("aria-label", btn.title);
      btn.addEventListener("click", () => { audio(); buyUp(i); });
      up.appendChild(btn);
    });
    if (!up.children.length) up.innerHTML = '<span class="ach">Daha çok bal üret, yeni güçlendirmeler açılsın.</span>';
  }
  let shownUps = "";
  function render() {
    $("honey").textContent = fmt(S.honey) + " bal";
    $("rate").textContent = `saniyede ${fmt(perSec())} · tıklama ${fmt(perClick())}`;
    $("boost").textContent = S.boostT > 0 ? `⚡ Altın güç: ×7 (${Math.ceil(S.boostT)} sn)` : "";
    document.querySelectorAll("#blds .b").forEach(b => { const i = +b.dataset.i, c = cost(i); b.disabled = S.honey < c; b.classList.toggle("can", S.honey >= c); });
    document.querySelectorAll("#ups .up").forEach(b => { const i = +b.dataset.i; b.disabled = S.honey < UPS[i][2]; b.classList.toggle("can", S.honey >= UPS[i][2]); });
    // yeni üretici ya da güçlendirme açıldıysa dükkanı yenile
    const sig = UPS.map((u, i) => !S.ups.includes(i) && u[3](S) ? 1 : 0).join("") + BLD.map((b, i) => (i === 0 || S.b[i - 1] > 0 || S.total >= b[3] * 0.5) ? 1 : 0).join("");
    if (sig !== shownUps) { shownUps = sig; renderShop(); }
    while (S.ach < ACH.length && S.total >= ACH[S.ach][0]) { toast("🏆 " + ACH[S.ach][1]); S.ach++; }
    $("ach").textContent = `Toplam üretilen: ${fmt(S.total)} bal · Başarı: ${S.ach}/${ACH.length}`;
  }

  /* ---------- döngü ---------- */
  let last = performance.now(), saveT = 0;
  function loop(now) {
    const dt = Math.min(1, (now - last) / 1000); last = now;
    gain(perSec() * dt);
    if (S.boostT > 0) S.boostT = Math.max(0, S.boostT - dt);
    goldT -= dt; if (goldT <= 0 && !goldEl) { spawnGold(); goldT = (60 + Math.random() * 60) * S.goldFreq; }
    saveT += dt; if (saveT > 5) { saveT = 0; persist(); }
    render();
    requestAnimationFrame(loop);
  }
  $("hive").addEventListener("click", (e) => { audio(); click(e); });
  $("reset").addEventListener("click", () => { if (confirm("Bütün ilerleme silinsin mi?")) { S = fresh(); persist(); shownUps = ""; render(); } });
  document.addEventListener("visibilitychange", () => { if (document.hidden) persist(); else { last = performance.now(); } });
  window.addEventListener("pagehide", persist);
  // kapalıyken biriken bal
  const away = Math.min(OFFLINE_MAX, (Date.now() - (S.saved || Date.now())) / 1000);
  if (away > 30 && S.total > 0) { S.boostT = 0; const g = perSec() * away * OFFLINE_RATE; if (g > 0) { gain(g); setTimeout(() => toast(`💤 Sen yokken arılar ${fmt(g)} bal yaptı!`), 400); } }
  renderShop(); render(); requestAnimationFrame(loop);

  window.__bf = { get S() { return S; }, click, buy, buyUp, perSec, cost, fmt, gain };
})();
