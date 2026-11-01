/* Taş Kağıt Makas — iki kişilik gizli seçim düellosu */
(() => {
  "use strict";
  const $ = (id) => document.getElementById(id);
  const SAVE_KEY = "tas-kagit-makas", GOAL = 5;
  const H = [["✊", "Taş"], ["✋", "Kağıt"], ["✌️", "Makas"]];
  const WHY = ["Taş makası kırar", "Kağıt taşı sarar", "Makas kağıdı keser"];
  const beats = (a, b) => (a === 0 && b === 2) || (a === 2 && b === 1) || (a === 1 && b === 0);

  let AC = null;
  function audio() { try { AC = AC || new (window.AudioContext || window.webkitAudioContext)(); if (AC.state === "suspended") AC.resume(); } catch (e) {} }
  function snd(f, d, type, vol, delay) {
    if (!AC) return;
    const t = AC.currentTime + (delay || 0), o = AC.createOscillator(), g = AC.createGain();
    o.type = type || "triangle"; o.frequency.setValueAtTime(f, t);
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol || 0.06, t + 0.01); g.gain.exponentialRampToValueAtTime(0.0001, t + d);
    o.connect(g).connect(AC.destination); o.start(t); o.stop(t + d + 0.02);
  }

  let CFG = { opp: "2p", names: ["Enes", "Egemen"] };
  try { const s = JSON.parse(localStorage.getItem(SAVE_KEY) || "null"); if (s) CFG = Object.assign(CFG, s); } catch (e) {}
  let G = null;
  const isAi = (i) => CFG.opp === "ai" && i === 1;

  function newGame() {
    G = { sc: [0, 0], pick: [null, null], busy: false, over: false };
    $("setup").hidden = true; $("over").hidden = true;
    for (const i of [0, 1]) {
      $("n" + i).textContent = CFG.names[i];
      const o = $("o" + i); o.textContent = "";
      H.forEach(([e, ad], k) => {
        const b = document.createElement("button"); b.type = "button"; b.className = "opt e"; b.textContent = e; b.setAttribute("aria-label", ad);
        b.disabled = isAi(i);
        b.addEventListener("pointerdown", (ev) => { ev.preventDefault(); audio(); choose(i, k); });
        b.addEventListener("click", (ev) => { if (ev.detail === 0) { audio(); choose(i, k); } });
        o.appendChild(b);
      });
    }
    round();
  }
  function round() {
    G.pick = [null, null]; G.busy = false;
    $("side0").classList.remove("ready"); $("side1").classList.remove("ready");
    $("hands").innerHTML = `<div class="h">❔ ❔</div><div class="res">Seçin!</div>`;
    render();
    if (isAi(1)) setTimeout(() => choose(1, Math.floor(Math.random() * 3)), 400 + Math.random() * 900);
  }
  function choose(i, k) {
    if (!G || G.over || G.busy || G.pick[i] !== null) return false;
    G.pick[i] = k; snd(i ? 440 : 520, 0.08);
    $("side" + i).classList.add("ready");
    if (G.pick[0] !== null && G.pick[1] !== null) reveal();
    else $("hands").innerHTML = `<div class="h">${G.pick[0] !== null ? "✅" : "❔"} ${G.pick[1] !== null ? "✅" : "❔"}</div><div class="res">${CFG.names[i]} seçti, bekleniyor…</div>`;
    return true;
  }
  function reveal() {
    G.busy = true;
    const hs = $("hands");
    hs.className = "hands shake"; hs.innerHTML = `<div class="h">✊ ✊</div><div class="res">Taş… kağıt… makas!</div>`;
    [0, 0.45, 0.9].forEach(d => snd(300, 0.08, "square", 0.04, d));
    setTimeout(() => {
      hs.className = "hands";
      const [a, b] = G.pick, w = a === b ? -1 : beats(a, b) ? 0 : 1;
      if (w >= 0) G.sc[w]++;
      hs.innerHTML = `<div class="h">${H[a][0]} ${H[b][0]}</div><div class="res">${w < 0 ? "Berabere!" : `${CFG.names[w]} kazandı! (${WHY[w ? b : a]})`}</div>`;
      snd(w < 0 ? 400 : 700, 0.2);
      render();
      if (w >= 0 && G.sc[w] >= GOAL) {
        G.over = true;
        setTimeout(() => { $("over-title").textContent = `${CFG.names[w]} şampiyon!`; $("over-tx").textContent = `Skor: ${CFG.names[0]} ${G.sc[0]} – ${G.sc[1]} ${CFG.names[1]}`; [523, 659, 784, 1046].forEach((f, i) => snd(f, 0.2, "triangle", 0.07, i * 0.12)); $("over").hidden = false; }, 1200);
      } else setTimeout(round, 1700);
    }, 1350);
  }
  function render() { $("s0").textContent = G.sc[0]; $("s1").textContent = G.sc[1]; }

  document.addEventListener("keydown", (e) => {
    if (!G || !$("setup").hidden) return;
    const m = { "1": [0, 0], "2": [0, 1], "3": [0, 2], "8": [1, 0], "9": [1, 1], "0": [1, 2] }[e.key];
    if (!m) return;
    const i = CFG.opp === "ai" ? 0 : m[0];
    if (isAi(i)) return;
    audio(); choose(i, m[1]);
  });
  const form = $("form");
  form.opp.value = CFG.opp; $("in0").value = CFG.names[0]; $("in1").value = CFG.names[1];
  form.addEventListener("change", (e) => { if (e.target.name !== "opp") return; if (form.opp.value === "ai" && $("in1").value === "Egemen") $("in1").value = "Bilgisayar"; if (form.opp.value === "2p" && $("in1").value === "Bilgisayar") $("in1").value = "Egemen"; });
  form.addEventListener("submit", (e) => {
    e.preventDefault(); audio();
    CFG = { opp: form.opp.value, names: [$("in0").value.trim() || "Mavi", $("in1").value.trim() || "Kırmızı"] };
    try { localStorage.setItem(SAVE_KEY, JSON.stringify(CFG)); } catch (_) {}
    newGame();
  });
  $("settings").addEventListener("click", () => { $("over").hidden = true; $("setup").hidden = false; });
  $("again").addEventListener("click", () => { audio(); newGame(); });

  // test kancası
  window.__tkm = { beats, choose, newGame, get G() { return G; } };
})();
