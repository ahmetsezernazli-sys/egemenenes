(() => {
  "use strict";
  const $ = id => document.getElementById(id);
  const VIEW = $("view");
  const SUBJ = window.DERS || [];
  const L = ["A", "B", "C", "D"];
  const SAVE_KEY = "ders-calisma";

  /* ---------- kayıt ---------- */
  // units: {"mat.u1": {best, tries}}, wrong: {qid: true}, deneme: {mat: [{t, d, y, b, net, n}]}, read: {"mat.u1": true}, solved, correct
  let save = {units: {}, wrong: {}, deneme: {}, read: {}, solved: 0, correct: 0};
  try { save = Object.assign(save, JSON.parse(localStorage.getItem(SAVE_KEY)) || {}); } catch (e) {}
  const store = () => { try { localStorage.setItem(SAVE_KEY, JSON.stringify(save)); } catch (e) {} };

  /* ---------- yardımcılar ---------- */
  const esc = s => String(s).replace(/[&<>"]/g, c => ({"&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;"}[c]));
  // **kalın**, satır sonu; "metin§soru" biçiminde okuma parçası
  const fmt = s => esc(s).replace(/\*\*(.+?)\*\*/g, "<b>$1</b>").replace(/\n/g, "<br>");
  function stemHTML(s){
    const k = s.indexOf("§");
    return k < 0 ? fmt(s) : `<span class="passage">${fmt(s.slice(0, k).trim())}</span>${fmt(s.slice(k + 1).trim())}`;
  }
  const shuffle = a => { for (let i = a.length - 1; i > 0; i--){ const j = Math.random() * (i + 1) | 0; [a[i], a[j]] = [a[j], a[i]]; } return a; };
  const subj = id => SUBJ.find(s => s.id === id);
  const unitOf = (s, uid) => s.uniteler.find(u => u.id === uid);
  const pct = x => Math.round(x * 100);
  function setTheme(s){ document.documentElement.style.setProperty("--c", s ? s.renk : "#3D8BFD"); }
  function setBar(title, backHref, backText){
    $("title").innerHTML = title;
    $("back").href = backHref; $("back-tx").textContent = backText;
    const plain = title.replace(/<[^>]+>/g, "");
    document.title = plain === "Çalışma Köşesi" ? "Çalışma Köşesi · 7. Sınıf" : `${plain} · Çalışma Köşesi`;
  }
  function makeItem(s, u, i){
    const [stem, opts, c, e, fixed] = u.s[i];
    const order = fixed ? opts.map((_, k) => k) : shuffle(opts.map((_, k) => k));
    return {qid: `${s.id}.${u.id}.${i}`, sid: s.id, uid: u.id, unit: u.nm, stem, opts: order.map(k => opts[k]), correct: order.indexOf(c), expl: e};
  }
  function findQ(qid){
    const [sid, uid, i] = qid.split(".");
    const s = subj(sid), u = s && unitOf(s, uid);
    return u && u.s[+i] ? makeItem(s, u, +i) : null;
  }
  const wrongOf = sid => Object.keys(save.wrong).filter(q => q.startsWith(sid + ".") && findQ(q));
  function unitScore(s){
    const vals = s.uniteler.map(u => (save.units[`${s.id}.${u.id}`] || {}).best || 0);
    return vals.reduce((a, b) => a + b, 0) / vals.length;
  }
  const denemeN = s => Math.min(s.deneme, s.uniteler.reduce((a, u) => a + u.s.length, 0));

  /* ---------- sayfalar ---------- */
  let Q = null, timerId = null;
  function stopTimer(){ if (timerId){ clearInterval(timerId); timerId = null; } }

  function home(){
    setTheme(null); setBar("Çalışma <span>Köşesi</span>", "../index.html", "Oyunlar");
    const total = SUBJ.reduce((a, s) => a + s.uniteler.reduce((b, u) => b + u.s.length, 0), 0);
    const acc = save.solved ? pct(save.correct / save.solved) : 0;
    VIEW.innerHTML = `
      <section class="card hello">
        <h2>Merhaba Enes! 👋</h2>
        <p>Bir ders seç: önce <b>konu özetini</b> oku, sonra <b>alıştırmayla</b> kendini dene, hazır hissedince <b>deneme sınavına</b> gir. Yanlış yaptığın sorular “Yanlışlarım” bölümünde seni bekler.</p>
        <div class="stats">
          <span class="stat">📚 <b>${SUBJ.length}</b> ders · <b>${total}</b> soru</span>
          <span class="stat">✍️ Çözdüğün: <b>${save.solved}</b></span>
          <span class="stat">🎯 Doğru oranı: <b>%${acc}</b></span>
        </div>
      </section>
      <section class="subjects">${SUBJ.map(s => {
        const sc = unitScore(s), wr = wrongOf(s.id).length, dn = (save.deneme[s.id] || []);
        const bestNet = dn.length ? Math.max(...dn.map(d => d.net)) : null;
        return `<a class="subj" href="#/d/${s.id}" style="--c:${s.renk}">
          <span class="ic" aria-hidden="true">${s.ikon}</span>
          <h3>${esc(s.nm)}</h3>
          <small>${s.uniteler.length} ünite${bestNet !== null ? ` · en iyi deneme ${bestNet.toFixed(2)} net` : ""}${wr ? ` · ${wr} yanlış` : ""}</small>
          <span class="bar-prog" aria-label="İlerleme yüzde ${pct(sc)}"><i style="width:${pct(sc)}%"></i></span>
        </a>`;
      }).join("")}</section>`;
  }

  function subjectPage(sid){
    const s = subj(sid); if (!s) return go("#/");
    setTheme(s); setBar(esc(s.nm), "#/", "Dersler");
    const wr = wrongOf(sid).length, dn = save.deneme[sid] || [], n = denemeN(s);
    VIEW.innerHTML = `
      <section class="card subj-head"><span class="ic" aria-hidden="true">${s.ikon}</span><div><h2>${esc(s.nm)}</h2><p>1. dönem · ${s.uniteler.length} ünite · ${s.uniteler.reduce((a, u) => a + u.s.length, 0)} soru</p></div></section>
      <section class="actions">
        <a class="btn main" href="#/deneme/${sid}"><span class="bi">📝</span><span>Deneme sınavı<small>${n} soru · ${Math.round(n * s.dk)} dakika · LGS gibi</small></span></a>
        <a class="btn" href="#/yanlis/${sid}"${wr ? "" : ' aria-disabled="true"'}><span class="bi">🔁</span><span>Yanlışlarım<small>${wr ? `${wr} soruyu tekrar çöz` : "Henüz yanlışın yok"}</small></span></a>
      </section>
      <section class="units">${s.uniteler.map((u, k) => {
        const st = save.units[`${sid}.${u.id}`], read = save.read[`${sid}.${u.id}`];
        const b = st ? `<span class="badge ${st.best >= .8 ? "ok" : "mid"}">en iyi %${pct(st.best)}</span>` : `<span class="badge">denenmedi</span>`;
        return `<article class="card unit">
          <div><h3>${k + 1}. ${esc(u.nm)}</h3><div class="meta">${esc(u.alt || "")}</div></div>${b}
          <div class="row">
            <a class="chip" href="#/ozet/${sid}/${u.id}">📖 Konu özeti${read ? " ✓" : ""}</a>
            <a class="chip fill" href="#/q/${sid}/${u.id}">✏️ Alıştırma · ${u.s.length} soru</a>
          </div></article>`;
      }).join("")}</section>
      ${dn.length ? `<section class="card"><h3 style="margin:0 0 8px">Deneme geçmişi</h3><div class="history">${dn.slice().reverse().slice(0, 8).map(d =>
        `<div><span>${new Date(d.t).toLocaleDateString("tr-TR", {day: "numeric", month: "long"})}</span><span>${d.d} D · ${d.y} Y · ${d.b} B</span><b>${d.net.toFixed(2)} net</b></div>`).join("")}</div></section>` : ""}`;
    const w = VIEW.querySelector('[aria-disabled="true"]');
    if (w) w.addEventListener("click", e => e.preventDefault());
  }

  function notesPage(sid, uid){
    const s = subj(sid), u = s && unitOf(s, uid); if (!u) return go("#/");
    setTheme(s); setBar(esc(u.nm), `#/d/${sid}`, s.nm);
    save.read[`${sid}.${uid}`] = true; store();
    VIEW.innerHTML = `
      <section class="card subj-head"><span class="ic" aria-hidden="true">📖</span><div><h2>${esc(u.nm)}</h2><p>${esc(s.nm)} · konu özeti</p></div></section>
      <section class="notes">${u.ozet.map(n => `<article class="card note">
        <h3>${esc(n.b)}</h3>
        ${n.m ? `<ul>${n.m.map(x => `<li>${fmt(x)}</li>`).join("")}</ul>` : ""}
        ${n.o ? `<div class="ex">${fmt(n.o)}</div>` : ""}
      </article>`).join("")}
      ${u.ipucu ? `<div class="tip">💡 ${fmt(u.ipucu)}</div>` : ""}</section>
      <div class="nav"><a class="btn" href="#/d/${sid}">← ${esc(s.nm)}</a><a class="btn main" href="#/q/${sid}/${uid}">✏️ Alıştırmaya geç</a></div>`;
    window.scrollTo(0, 0);
  }

  /* ---------- soru motoru ---------- */
  function startPractice(sid, uid){
    const s = subj(sid), u = s && unitOf(s, uid); if (!u) return go("#/");
    Q = {mode: "practice", sid, uid, items: shuffle(u.s.map((_, i) => makeItem(s, u, i))), i: 0, ans: [], title: u.nm, back: `#/d/${sid}`};
    quizView();
  }
  function startWrong(sid){
    const ids = wrongOf(sid); if (!ids.length) return go(`#/d/${sid}`);
    Q = {mode: "wrong", sid, items: shuffle(ids.map(findQ)), i: 0, ans: [], title: "Yanlışlarım", back: `#/d/${sid}`};
    quizView();
  }
  function startDeneme(sid){
    const s = subj(sid); if (!s) return go("#/");
    const n = denemeN(s), pools = s.uniteler.map(u => shuffle(u.s.map((_, i) => i)).map(i => makeItem(s, u, i)));
    // üniteler arasında sırayla dağıt, sonra ünite sırasına diz (gerçek sınavlardaki gibi)
    const take = pools.map(() => 0); let k = 0, got = 0;
    while (got < n){ const p = k % pools.length; if (take[p] < pools[p].length){ take[p]++; got++; } k++; }
    const items = pools.flatMap((p, j) => p.slice(0, take[j]));
    Q = {mode: "deneme", sid, items, i: 0, ans: new Array(items.length).fill(null), mark: new Array(items.length).fill(false),
      title: "Deneme sınavı", back: `#/d/${sid}`, end: Date.now() + Math.round(n * s.dk * 60) * 1000};
    stopTimer(); timerId = setInterval(tick, 500);
    quizView();
  }
  function tick(){
    if (!Q || Q.mode !== "deneme" || Q.done) return stopTimer();
    const left = Math.max(0, Math.round((Q.end - Date.now()) / 1000)), el = document.querySelector(".timer");
    if (el){ el.textContent = `⏱ ${Math.floor(left / 60)}:${String(left % 60).padStart(2, "0")}`; el.classList.toggle("low", left < 120); }
    if (left <= 0){ stopTimer(); finishQuiz(true); }
  }

  function quizView(){
    const s = subj(Q.sid), it = Q.items[Q.i], n = Q.items.length, den = Q.mode === "deneme";
    setTheme(s); setBar(esc(Q.title), Q.back, s.nm);
    const a = Q.ans[Q.i], locked = !den && a !== undefined && a !== null;
    VIEW.innerHTML = `
      <div class="qhead"><span>${Q.i + 1} / ${n}</span>${den ? `<span class="timer">⏱</span>` : `<span>${Q.ans.filter((x, k) => x === Q.items[k].correct).length} doğru</span>`}</div>
      <div class="progress"><i style="width:${(Q.i + (locked ? 1 : 0)) / n * 100}%"></i></div>
      <section class="card q">
        ${Q.mode !== "practice" ? `<div class="unit-tag">${esc(it.unit)}</div>` : ""}
        <div class="stem">${stemHTML(it.stem)}</div>
        <div class="opts">${it.opts.map((o, k) => {
          let cls = "opt";
          if (den && a === k) cls += " sel";
          if (locked){ if (k === it.correct) cls += " right"; else if (k === a) cls += " wrong"; }
          return `<button type="button" class="${cls}" data-k="${k}"${locked ? " disabled" : ""}><span class="L">${L[k]}</span><span>${fmt(o)}</span></button>`;
        }).join("")}</div>
        ${locked ? `<div class="expl ${a === it.correct ? "ok" : "no"}"><b>${a === it.correct ? "✅ Doğru!" : `❌ Doğru cevap ${L[it.correct]}`}</b>${fmt(it.expl)}</div>` : ""}
      </section>
      ${den ? `<div class="grid-nav" aria-label="Sorular">${Q.items.map((_, k) => `<button type="button" data-go="${k}" class="${Q.ans[k] !== null ? "ans" : ""}${k === Q.i ? " cur" : ""}${Q.mark[k] ? " mark" : ""}" aria-label="${k + 1}. soru">${k + 1}</button>`).join("")}</div>` : ""}
      <div class="nav">
        ${den ? `<button type="button" class="btn" id="prev"${Q.i ? "" : " disabled"}>← Önceki</button>
                 <button type="button" class="btn" id="mark">${Q.mark[Q.i] ? "★ İşareti kaldır" : "☆ Sonra bak"}</button>
                 <button type="button" class="btn${Q.i === n - 1 ? " main" : ""}" id="${Q.i === n - 1 ? "finish" : "next"}">${Q.i === n - 1 ? "Sınavı bitir" : "Sonraki →"}</button>`
              : locked ? `<button type="button" class="btn main" id="${Q.i === n - 1 ? "finish" : "next"}">${Q.i === n - 1 ? "Sonucu gör" : "Sonraki soru →"}</button>` : ""}
      </div>
      ${den ? `<div class="nav"><button type="button" class="btn" id="finish2">🏁 Sınavı bitir</button></div>` : ""}`;
    VIEW.querySelectorAll(".opt").forEach(b => b.addEventListener("click", () => answer(+b.dataset.k)));
    VIEW.querySelectorAll("[data-go]").forEach(b => b.addEventListener("click", () => { Q.i = +b.dataset.go; quizView(); }));
    const on = (id, fn) => { const e = $(id); if (e) e.addEventListener("click", fn); };
    on("next", () => { Q.i++; quizView(); window.scrollTo(0, 0); });
    on("prev", () => { Q.i--; quizView(); });
    on("mark", () => { Q.mark[Q.i] = !Q.mark[Q.i]; quizView(); });
    on("finish", () => finishQuiz(false));
    on("finish2", () => finishQuiz(false));
    if (den) tick();
  }
  function answer(k){
    const it = Q.items[Q.i];
    if (Q.mode === "deneme"){ Q.ans[Q.i] = Q.ans[Q.i] === k ? null : k; quizView(); return; }
    if (Q.ans[Q.i] !== undefined && Q.ans[Q.i] !== null) return;
    Q.ans[Q.i] = k;
    save.solved++; if (k === it.correct){ save.correct++; delete save.wrong[it.qid]; } else save.wrong[it.qid] = true;
    store();
    quizView();
    const ex = VIEW.querySelector(".expl"); if (ex) ex.scrollIntoView({block: "nearest", behavior: "smooth"});
  }

  function finishQuiz(timeUp){
    const s = subj(Q.sid), n = Q.items.length;
    if (Q.mode === "deneme" && !timeUp){
      const blank = Q.ans.filter(a => a === null).length;
      if (blank && !confirm(`${blank} soru boş. Sınavı bitirmek istiyor musun?`)) return;
    }
    stopTimer(); Q.done = true;
    const d = Q.items.filter((it, k) => Q.ans[k] === it.correct).length;
    const b = Q.items.filter((it, k) => Q.ans[k] === null || Q.ans[k] === undefined).length, y = n - d - b;
    let head;
    if (Q.mode === "deneme"){
      const net = Math.max(0, d - y / 3);
      Q.items.forEach((it, k) => { if (Q.ans[k] !== null){ save.solved++; if (Q.ans[k] === it.correct){ save.correct++; delete save.wrong[it.qid]; } else save.wrong[it.qid] = true; } });
      (save.deneme[Q.sid] = save.deneme[Q.sid] || []).push({t: Date.now(), d, y, b, net: +net.toFixed(2), n});
      if (save.deneme[Q.sid].length > 30) save.deneme[Q.sid].shift();
      head = `<div class="big">${net.toFixed(2)}</div><p>net (${n} soruda) · 3 yanlış 1 doğruyu götürür${timeUp ? " · ⏱ süre doldu" : ""}</p>`;
    } else {
      if (Q.mode === "practice"){
        const key = `${Q.sid}.${Q.uid}`, st = save.units[key] || {best: 0, tries: 0};
        st.best = Math.max(st.best, d / n); st.tries++; save.units[key] = st;
      }
      head = `<div class="big">%${pct(d / n)}</div><p>${d >= n * .8 ? "Harika gidiyorsun! 🌟" : d >= n * .5 ? "İyi! Yanlışlarına bir göz at. 👍" : "Konu özetini bir daha okuyup tekrar dene. 💪"}</p>`;
    }
    store();
    // ünite ünite döküm
    const units = [...new Set(Q.items.map(it => it.unit))];
    const bd = units.map(u => { const its = Q.items.map((it, k) => [it, k]).filter(([it]) => it.unit === u); const c = its.filter(([it, k]) => Q.ans[k] === it.correct).length; return {u, c, t: its.length}; });
    setBar(Q.mode === "deneme" ? "Deneme <span>sonucu</span>" : "Sonuç", Q.back, s.nm);
    VIEW.innerHTML = `
      <section class="card result">${head}
        <div class="scores"><span class="d">✅ ${d} doğru</span><span class="y">❌ ${y} yanlış</span>${b ? `<span>⬜ ${b} boş</span>` : ""}</div>
        ${units.length > 1 ? `<div class="breakdown">${bd.map(x => `<div><span>${esc(x.u)}</span><b>${x.c}/${x.t}</b><span class="bar-prog"><i style="width:${x.c / x.t * 100}%"></i></span></div>`).join("")}</div>` : ""}
      </section>
      <div class="nav">
        <a class="btn" href="${Q.back}">← ${esc(s.nm)}</a>
        <button type="button" class="btn main" id="again">${Q.mode === "deneme" ? "📝 Yeni deneme" : Q.mode === "wrong" ? "🔁 Kalan yanlışlar" : "🔁 Tekrar çöz"}</button>
      </div>
      <section class="card"><h3 style="margin:0 0 10px">Cevaplar</h3><div class="review">${Q.items.map((it, k) => {
        const a = Q.ans[k], cls = a === null || a === undefined ? "b" : a === it.correct ? "r" : "w";
        return `<div class="rv ${cls}"><p><b>${k + 1}.</b> ${stemHTML(it.stem)}</p>
          <p class="ans">${cls === "r" ? "✅" : cls === "w" ? `❌ Senin cevabın: ${L[a]}) ${fmt(it.opts[a])} ·` : "⬜ Boş ·"} Doğru: ${L[it.correct]}) ${fmt(it.opts[it.correct])}</p>
          <p>${fmt(it.expl)}</p></div>`;
      }).join("")}</div></section>`;
    const again = $("again"), mode = Q.mode, sid = Q.sid, uid = Q.uid;
    again.addEventListener("click", () => { if (mode === "deneme") startDeneme(sid); else if (mode === "wrong") { if (wrongOf(sid).length) startWrong(sid); else go(`#/d/${sid}`); } else startPractice(sid, uid); });
    window.scrollTo(0, 0);
  }

  /* ---------- yönlendirme ---------- */
  function go(h){ if (location.hash === h) route(); else location.hash = h; }
  function route(){
    const p = location.hash.replace(/^#\/?/, "").split("/").filter(Boolean);
    if (Q && Q.mode === "deneme" && !Q.done && p[0] !== "deneme"){
      if (!confirm("Deneme sınavı yarıda kalacak. Çıkmak istiyor musun?")){ history.pushState(null, "", `#/deneme/${Q.sid}`); return; }
    }
    if (p[0] !== "deneme" && p[0] !== "q" && p[0] !== "yanlis"){ stopTimer(); Q = null; }
    window.scrollTo(0, 0);
    if (!p.length) return home();
    if (p[0] === "d") return subjectPage(p[1]);
    if (p[0] === "ozet") return notesPage(p[1], p[2]);
    if (p[0] === "q") return startPractice(p[1], p[2]);
    if (p[0] === "yanlis") return startWrong(p[1]);
    if (p[0] === "deneme") return Q && Q.mode === "deneme" && !Q.done && Q.sid === p[1] ? quizView() : startDeneme(p[1]);
    home();
  }
  window.addEventListener("hashchange", route);
  window.addEventListener("beforeunload", e => { if (Q && Q.mode === "deneme" && !Q.done){ e.preventDefault(); e.returnValue = ""; } });
  route();

  // testler için
  window.__ders = {SUBJ, save: () => save, state: () => Q, answer, finishQuiz, startDeneme, startPractice, makeItem, findQ};
})();
