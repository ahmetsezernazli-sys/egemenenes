/* Boyama Defteri — dokunarak boyama */
(function(){
  "use strict";

  const PICS = window.BOYAMA_RESIMLER || [];
  const COLORS = [
    {n:"kırmızı", c:"#E5484D"}, {n:"turuncu", c:"#FF8A3D"},
    {n:"sarı", c:"#FFD23F"}, {n:"açık yeşil", c:"#9BD65A"},
    {n:"yeşil", c:"#2DB75A"}, {n:"turkuaz", c:"#2EC4C9"},
    {n:"mavi", c:"#3D8BFD"}, {n:"lacivert", c:"#3440A8"},
    {n:"mor", c:"#8E5CF5"}, {n:"pembe", c:"#FF7EB6"},
    {n:"kahverengi", c:"#9A6A44"}, {n:"gri", c:"#9AA3B2"},
    {n:"siyah", c:"#3A3550"}, {n:"silgi", c:"#FFFFFF"}
  ];
  const STICKERS = ["⭐", "❤️", "🌸", "🦋", "☀️", "🎈"];
  const STORE_KEY = "boyama-defteri", SOUND_KEY = "boyama-defteri-ses";
  const ART_STYLE = `<style>[data-r]{stroke:#2B2350;stroke-width:4;stroke-linejoin:round;stroke-linecap:round}.deco.line{fill:none;stroke:#2B2350;stroke-width:4;stroke-linecap:round;stroke-linejoin:round}.deco.dark{fill:#2B2350}.deco.white{fill:#FFFFFF}.deco{pointer-events:none}text{pointer-events:none}</style>`;
  const RM = window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches;

  const $ = id => document.getElementById(id);
  let store = {current:PICS.length ? PICS[0].id : null, pics:{}};
  try { const s = JSON.parse(localStorage.getItem(STORE_KEY) || "null"); if (s && s.pics) store = Object.assign(store, s); } catch(e) {}
  const persist = () => { try { localStorage.setItem(STORE_KEY, JSON.stringify(store)); } catch(e) {} };
  let soundOn = true;
  try { soundOn = localStorage.getItem(SOUND_KEY) !== "0"; } catch(e) {}

  let color = 0, tool = "paint", sticker = 0, history = [];

  const picById = id => PICS.find(p => p.id === id) || PICS[0];
  function stateOf(id){
    if (!store.pics[id]) store.pics[id] = {fills:{}, stickers:[]};
    return store.pics[id];
  }

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
    fill(){ tone(520 + Math.random()*260, .16, "sine", .12, 900); },
    stick(){ tone(880, .08, "triangle", .1); tone(1320, .12, "triangle", .08, null, .06); },
    pick(i){ tone(392 + i*30, .1, "triangle", .08); },
    undo(){ tone(600, .1, "sine", .07, 380); },
    save(){ [523.25, 659.25, 783.99].forEach((f, i) => tone(f, .18, "triangle", .1, null, i*.08)); }
  };
  const canSpeak = "speechSynthesis" in window;
  let trVoice = null;
  function pickVoice(){ trVoice = speechSynthesis.getVoices().find(v => /^tr(-|_|$)/i.test(v.lang)) || null; }
  if (canSpeak){ pickVoice(); if (speechSynthesis.addEventListener) speechSynthesis.addEventListener("voiceschanged", pickVoice); }
  function say(text){
    if (!canSpeak || !soundOn || !trVoice) return;
    speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text); u.voice = trVoice; u.lang = trVoice.lang; u.pitch = 1.15;
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

  /* ---------- palet ve araçlar ---------- */
  COLORS.forEach((col, i) => {
    const b = document.createElement("button");
    b.type = "button"; b.className = "swatch" + (col.c === "#FFFFFF" ? " white" : "");
    b.style.setProperty("--c", col.c);
    b.setAttribute("role", "radio"); b.setAttribute("aria-label", col.n);
    if (col.c === "#FFFFFF") b.textContent = "🧽";
    b.addEventListener("click", () => selectColor(i));
    $("palette").appendChild(b);
  });
  function selectColor(i){
    color = i; audio();
    [...$("palette").children].forEach((b, k) => b.setAttribute("aria-checked", String(k === i)));
    if (tool !== "paint") setTool("paint");
    sfx.pick(i);
    say(i === COLORS.length - 1 ? "Silgi" : COLORS[i].n.charAt(0).toLocaleUpperCase("tr") + COLORS[i].n.slice(1));
  }

  STICKERS.forEach((e, i) => {
    const b = document.createElement("button");
    b.type = "button"; b.className = "stk"; b.textContent = e;
    b.setAttribute("role", "radio"); b.setAttribute("aria-label", "Çıkartma " + (i + 1));
    b.addEventListener("click", () => { sticker = i; renderStickers(); sfx.pick(i + 3); });
    $("stickers").appendChild(b);
  });
  function renderStickers(){ [...$("stickers").children].forEach((b, k) => b.setAttribute("aria-checked", String(k === sticker))); }

  function setTool(t){
    tool = t;
    $("tool-paint").setAttribute("aria-checked", String(t === "paint"));
    $("tool-sticker").setAttribute("aria-checked", String(t === "sticker"));
    $("stickers").hidden = t !== "sticker";
    renderStickers();
  }
  $("tool-paint").addEventListener("click", () => setTool("paint"));
  $("tool-sticker").addEventListener("click", () => setTool("sticker"));

  /* ---------- resim ---------- */
  function svgMarkup(pic, st, withSize){
    const size = withSize ? ` width="${withSize}" height="${withSize}"` : "";
    const stickers = st.stickers.map(s => `<text x="${s.x}" y="${s.y}" font-size="44" text-anchor="middle" dominant-baseline="central" font-family="Segoe UI Emoji, Apple Color Emoji, Noto Color Emoji, sans-serif">${s.e}</text>`).join("");
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 400"${size} class="art">${ART_STYLE}${pic.svg}<g class="stk-layer">${stickers}</g></svg>`;
  }
  function applyFills(root, st){
    root.querySelectorAll("[data-r]").forEach(el => {
      const f = st.fills[el.getAttribute("data-r")];
      el.style.fill = f || "#FFFFFF";
    });
  }

  function load(id){
    const pic = picById(id);
    if (!pic) return;
    store.current = pic.id; persist();
    history = [];
    const st = stateOf(pic.id);
    $("paper").innerHTML = svgMarkup(pic, st);
    applyFills($("paper"), st);
    $("pic-title").textContent = `${pic.emoji} ${pic.name}`;
    renderUndo();
  }

  function renderUndo(){ $("undo").disabled = !history.length; }

  function svgPoint(svg, e){
    const pt = svg.createSVGPoint(); pt.x = e.clientX; pt.y = e.clientY;
    const m = svg.getScreenCTM();
    return m ? pt.matrixTransform(m.inverse()) : {x:200, y:200};
  }

  function sparkle(e, c){
    if (RM) return;
    for (let i = 0; i < 10; i++){
      const s = document.createElement("i"), a = Math.random()*Math.PI*2, d = 30 + Math.random()*40;
      s.style.left = e.clientX + "px"; s.style.top = e.clientY + "px";
      s.style.background = c === "#FFFFFF" ? "#C9CEDA" : c;
      s.style.setProperty("--dx", Math.cos(a)*d + "px"); s.style.setProperty("--dy", Math.sin(a)*d + "px");
      $("sparkles").appendChild(s);
      setTimeout(() => s.remove(), 700);
    }
  }

  $("paper").addEventListener("pointerdown", e => {
    const svg = $("paper").querySelector("svg");
    if (!svg) return;
    audio();
    const pic = picById(store.current), st = stateOf(pic.id);
    if (tool === "sticker"){
      const p = svgPoint(svg, e);
      if (p.x < 0 || p.y < 0 || p.x > 400 || p.y > 400) return;
      const s = {x:Math.round(p.x), y:Math.round(p.y), e:STICKERS[sticker]};
      st.stickers.push(s);
      history.push({type:"sticker"});
      svg.querySelector(".stk-layer").insertAdjacentHTML("beforeend",
        `<text x="${s.x}" y="${s.y}" font-size="44" text-anchor="middle" dominant-baseline="central" font-family="Segoe UI Emoji, Apple Color Emoji, Noto Color Emoji, sans-serif">${s.e}</text>`);
      sfx.stick(); sparkle(e, "#FFD23F");
    } else {
      const el = e.target.closest ? e.target.closest("[data-r]") : null;
      if (!el) return;
      const r = el.getAttribute("data-r"), c = COLORS[color].c, prev = st.fills[r];
      if ((prev || "#FFFFFF") === c) return;
      history.push({type:"fill", r, prev});
      if (c === "#FFFFFF") delete st.fills[r]; else st.fills[r] = c;
      el.style.fill = c;
      sfx.fill(); sparkle(e, c);
    }
    persist(); renderUndo();
  });

  $("undo").addEventListener("click", () => {
    const h = history.pop();
    if (!h) return;
    const pic = picById(store.current), st = stateOf(pic.id);
    if (h.type === "fill"){ if (h.prev) st.fills[h.r] = h.prev; else delete st.fills[h.r]; }
    else if (h.type === "sticker") st.stickers.pop();
    else if (h.type === "clear"){ st.fills = h.fills; st.stickers = h.stickers; }
    const keep = history;
    load(pic.id); history = keep;
    persist(); renderUndo(); sfx.undo();
  });

  $("clear").addEventListener("click", () => {
    const pic = picById(store.current), st = stateOf(pic.id);
    if (!Object.keys(st.fills).length && !st.stickers.length) return;
    history.push({type:"clear", fills:Object.assign({}, st.fills), stickers:st.stickers.slice()});
    st.fills = {}; st.stickers = [];
    const keep = history;
    load(pic.id); history = keep;
    persist(); renderUndo(); sfx.undo();
    say("Temizlendi. Geri almak için geri al düğmesine bas.");
  });

  /* ---------- resim seçimi ---------- */
  function openPics(){
    const grid = $("pic-grid");
    grid.innerHTML = "";
    PICS.forEach(pic => {
      const st = stateOf(pic.id);
      const b = document.createElement("button");
      b.type = "button"; b.className = "pic" + (pic.id === store.current ? " current" : "");
      b.innerHTML = svgMarkup(pic, st) + `<span>${pic.emoji} ${pic.name}</span>`;
      applyFills(b, st);
      b.addEventListener("click", () => { $("pics").hidden = true; load(pic.id); say(pic.name); });
      grid.appendChild(b);
    });
    $("pics").hidden = false;
  }
  $("open-pics").addEventListener("click", openPics);
  $("close-pics").addEventListener("click", () => { $("pics").hidden = true; });
  $("pics").addEventListener("click", e => { if (e.target === $("pics")) $("pics").hidden = true; });
  window.addEventListener("keydown", e => {
    if (e.key === "Escape") $("pics").hidden = true;
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "z"){ e.preventDefault(); $("undo").click(); }
  });

  /* ---------- kaydet ---------- */
  $("save").addEventListener("click", () => {
    const pic = picById(store.current), st = stateOf(pic.id);
    const holder = document.createElement("div");
    holder.innerHTML = svgMarkup(pic, st, 1200);
    const svg = holder.firstChild;
    applyFills(svg, st);
    svg.querySelectorAll("[data-r]").forEach(el => el.setAttribute("fill", el.style.fill));
    const data = new XMLSerializer().serializeToString(svg);
    const img = new Image();
    img.onload = () => {
      const cvs = document.createElement("canvas");
      cvs.width = 1200; cvs.height = 1200;
      const c = cvs.getContext("2d");
      c.fillStyle = "#FFFFFF"; c.fillRect(0, 0, 1200, 1200);
      c.drawImage(img, 0, 0, 1200, 1200);
      cvs.toBlob(blob => {
        if (!blob) return;
        const url = URL.createObjectURL(blob), a = document.createElement("a");
        a.href = url; a.download = `boyama-${pic.id}.png`;
        document.body.appendChild(a); a.click(); a.remove();
        setTimeout(() => URL.revokeObjectURL(url), 4000);
        sfx.save(); say("Resmin kaydedildi!");
      }, "image/png");
    };
    img.onerror = () => say("Kaydedilemedi.");
    img.src = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(data);
  });

  selectColor(0);
  setTool("paint");
  if (PICS.length) load(store.current);
})();
