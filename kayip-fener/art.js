/* Kayıp Fener — piksel sanatı: karakterler, karolar ve nesneler kodla çizilir */
(function () {
  "use strict";
  const T = 16;
  // karakter piksel şablonları (16×16): k dış çizgi, h saç, H koyu saç, s ten, e göz, g giysi, G koyu giysi, b kemer, p pantolon, o çizme
  const HERO = {
    down0: ["................", ".....kkkkkk.....", "....khhhhhhk....", "...khhhhhhhhk...", "...khsssssshk...", "...ksessssesk...", "...ksssSSsssk...", "....kssssssk....", "...kggggggggk...", "..ksgggggggggsk.", "..ksGgggggggGsk.", "...kbbbbbbbbk...", "...kGggggggGk...", "...kppkkkkppk...", "...kppk..kppk...", "...kook..kook..."],
    down1: ["................", ".....kkkkkk.....", "....khhhhhhk....", "...khhhhhhhhk...", "...khsssssshk...", "...ksessssesk...", "...ksssSSsssk...", "....kssssssk....", "...kggggggggk...", "..ksgggggggggsk.", "..ksGgggggggGsk.", "...kbbbbbbbbk...", "...kGggggggGk...", "...kppkkkkppk...", "...kook..kppk...", ".........kook..."],
    up0: ["................", ".....kkkkkk.....", "....khhhhhhk....", "...khhhhhhhhk...", "...khhhhhhhhk...", "...khhhhhhhhk...", "...kHhhhhhhHk...", "....kHHHHHHk....", "...kggggggggk...", "..ksgggggggggsk.", "..ksGgggggggGsk.", "...kbbbbbbbbk...", "...kGggggggGk...", "...kppkkkkppk...", "...kppk..kppk...", "...kook..kook..."],
    up1: ["................", ".....kkkkkk.....", "....khhhhhhk....", "...khhhhhhhhk...", "...khhhhhhhhk...", "...khhhhhhhhk...", "...kHhhhhhhHk...", "....kHHHHHHk....", "...kggggggggk...", "..ksgggggggggsk.", "..ksGgggggggGsk.", "...kbbbbbbbbk...", "...kGggggggGk...", "...kppkkkkppk...", "...kppk..kook...", "...kook........."],
    side0: ["................", ".....kkkkk......", "....khhhhhk.....", "...khhhhhhhk....", "...khhhhssssk...", "...khhhssesk....", "...khhssssssk...", "....kHsssssk....", "....kggggggk....", "...kgggsgggk....", "...kGggsgggk....", "....kbbbbbbk....", "....kGgggggk....", "....kppkppk.....", "....kppkppk.....", "....kookook....."],
    side1: ["................", ".....kkkkk......", "....khhhhhk.....", "...khhhhhhhk....", "...khhhhssssk...", "...khhhssesk....", "...khhssssssk...", "....kHsssssk....", "....kggggggk....", "...kgggsgggk....", "...kGggsgggk....", "....kbbbbbbk....", "....kGgggggk....", "...kppk.kppk....", "..kppk...kppk...", "..kook...kook..."]
  };
  const PAL = {
    hero: { k: "#1B1730", h: "#7A4A26", H: "#4E2C14", s: "#F3C49B", S: "#D99A70", e: "#1B1730", g: "#3FA34D", G: "#26743A", b: "#8A5A2B", p: "#3D5A99", o: "#5A3A1E" },
    elder: { k: "#1B1730", h: "#E9E4F2", H: "#B9B2CC", s: "#F3C49B", S: "#D99A70", e: "#1B1730", g: "#7B5CC9", G: "#563D96", b: "#E0B040", p: "#563D96", o: "#3A2A5A" },
    girl: { k: "#1B1730", h: "#D9573A", H: "#A23A22", s: "#F3C49B", S: "#D99A70", e: "#1B1730", g: "#E86FA0", G: "#B8487A", b: "#FFD166", p: "#4A7BD0", o: "#5A3A1E" },
    smith: { k: "#1B1730", h: "#2B2B2B", H: "#111", s: "#C98A5B", S: "#A06A40", e: "#1B1730", g: "#8E8E9A", G: "#62626E", b: "#5A3A1E", p: "#3A3A44", o: "#2A1A10" },
    kid: { k: "#1B1730", h: "#F2C14E", H: "#C9962A", s: "#F3C49B", S: "#D99A70", e: "#1B1730", g: "#4DA3FF", G: "#2A6FC0", b: "#8A5A2B", p: "#3D5A99", o: "#5A3A1E" }
  };
  const cache = {};
  function sprite(name, pal) {
    const key = name + ":" + pal;
    if (cache[key]) return cache[key];
    const c = document.createElement("canvas"); c.width = c.height = 16;
    const x = c.getContext("2d"), P = PAL[pal], rows = HERO[name];
    rows.forEach((r, y) => { for (let i = 0; i < 16; i++) { const ch = r[i]; if (ch === "." || !P[ch]) continue; x.fillStyle = P[ch]; x.fillRect(i, y, 1, 1); } });
    return (cache[key] = c);
  }
  // kişi çiz: yön 0 aşağı 1 yukarı 2 sağ 3 sol
  function person(ctx, px, py, dir, frame, pal) {
    const n = dir === 0 ? "down" : dir === 1 ? "up" : "side";
    const s = sprite(n + (frame & 1), pal);
    ctx.fillStyle = "rgba(0,0,0,.28)"; ctx.beginPath(); ctx.ellipse(px + 8, py + 15, 6, 2.5, 0, 0, 7); ctx.fill();
    if (dir === 3) { ctx.save(); ctx.translate(px + 16, py); ctx.scale(-1, 1); ctx.drawImage(s, 0, 0); ctx.restore(); }
    else ctx.drawImage(s, px, py);
  }

  /* ---------- karolar ---------- */
  function hash(a, b, c) { let h = (a * 374761393 + b * 668265263 + (c || 0) * 2147483647) | 0; h = (h ^ (h >>> 13)) * 1274126177; return ((h ^ (h >>> 16)) >>> 0) / 4294967295; }
  const THEMES = {
    village: { g1: "#5DB34A", g2: "#4E9E3E", g3: "#78C95E", path: "#D8B57A", path2: "#C49A5E" },
    forest: { g1: "#3E8E44", g2: "#327A38", g3: "#55A85A", path: "#A88B5A", path2: "#8E7244" },
    cave: { g1: "#4A4560", g2: "#3D3852", g3: "#5A5574", path: "#5E5873", path2: "#4E4862" },
    tower: { g1: "#4B3B6B", g2: "#3E305A", g3: "#5C4A80", path: "#6A5A8C", path2: "#56487A" }
  };
  function px(ctx, x, y, w, h, c) { ctx.fillStyle = c; ctx.fillRect(x, y, w, h); }
  function ground(ctx, x, y, tx, ty, th) {
    px(ctx, x, y, T, T, th.g1);
    for (let i = 0; i < 6; i++) { const r = hash(tx, ty, i); px(ctx, x + Math.floor(r * 15), y + Math.floor(hash(ty, tx, i + 9) * 15), 1, 2, i % 2 ? th.g2 : th.g3); }
  }
  function drawTile(ctx, ch, tx, ty, th, t) {
    const x = tx * T, y = ty * T, r = hash(tx, ty, 3);
    const indoor = th === THEMES.cave || th === THEMES.tower;
    switch (ch) {
      case ".": if (indoor) { floor(ctx, x, y, tx, ty, th); } else ground(ctx, x, y, tx, ty, th); break;
      case ",": ground(ctx, x, y, tx, ty, th); { const cols = ["#FFD166", "#FF7AA2", "#FFFFFF", "#9AD0FF"]; const c = cols[Math.floor(r * 4)]; px(ctx, x + 4, y + 5, 2, 2, c); px(ctx, x + 10, y + 10, 2, 2, cols[Math.floor(hash(ty, tx, 7) * 4)]); px(ctx, x + 5, y + 7, 1, 2, "#2E7A30"); px(ctx, x + 11, y + 12, 1, 2, "#2E7A30"); } break;
      case "=": px(ctx, x, y, T, T, th.path); for (let i = 0; i < 5; i++) px(ctx, x + Math.floor(hash(tx, ty, i) * 14), y + Math.floor(hash(ty, tx, i) * 14), 2, 1, th.path2); break;
      case "s": px(ctx, x, y, T, T, "#E9D29A"); for (let i = 0; i < 4; i++) px(ctx, x + Math.floor(hash(tx, ty, i) * 14), y + Math.floor(hash(ty, tx, i) * 14), 1, 1, "#C9AE70"); break;
      case "T": ground(ctx, x, y, tx, ty, th); tree(ctx, x, y, th, r); break;
      case "B": ground(ctx, x, y, tx, ty, th); bush(ctx, x, y); break;
      case "~": water(ctx, x, y, tx, ty, t); break;
      case "P": water(ctx, x, y, tx, ty, t); px(ctx, x, y + 2, T, 12, "#9A6B3A"); for (let i = 0; i < 4; i++) px(ctx, x + i * 4, y + 2, 1, 12, "#6E4A26"); px(ctx, x, y + 2, T, 1, "#C08A50"); px(ctx, x, y + 13, T, 1, "#5A3A1E"); break;
      case "R": ground(ctx, x, y, tx, ty, th); rock(ctx, x, y); break;
      case "F": ground(ctx, x, y, tx, ty, th); px(ctx, x + 1, y + 4, 2, 11, "#8A5A2B"); px(ctx, x + 13, y + 4, 2, 11, "#8A5A2B"); px(ctx, x, y + 6, T, 2, "#B07A40"); px(ctx, x, y + 11, T, 2, "#B07A40"); px(ctx, x, y + 8, T, 1, "#6E4A26"); break;
      case "S": ground(ctx, x, y, tx, ty, th); px(ctx, x + 7, y + 8, 2, 7, "#6E4A26"); px(ctx, x + 2, y + 2, 12, 8, "#B07A40"); px(ctx, x + 2, y + 9, 12, 1, "#6E4A26"); px(ctx, x + 4, y + 4, 8, 1, "#6E4A26"); px(ctx, x + 4, y + 6, 6, 1, "#6E4A26"); break;
      case "H": px(ctx, x, y, T, T, "#E8D2A6"); px(ctx, x, y + 15, T, 1, "#B89A68"); px(ctx, x + (tx % 2 ? 0 : 8), y + 7, 1, 8, "#C9AE80"); if (r < .3) { px(ctx, x + 4, y + 4, 8, 7, "#6E4A26"); px(ctx, x + 5, y + 5, 6, 5, "#8FD3FF"); px(ctx, x + 7, y + 5, 1, 5, "#6E4A26"); px(ctx, x + 5, y + 7, 6, 1, "#6E4A26"); } break;
      case "r": px(ctx, x, y, T, T, "#C8463F"); for (let j = 0; j < 4; j++) { px(ctx, x, y + j * 4 + 3, T, 1, "#8E2A26"); for (let i = 0; i < 4; i++) px(ctx, x + i * 4 + (j % 2 ? 2 : 0), y + j * 4, 1, 3, "#A8352F"); } break;
      case "D": px(ctx, x, y, T, T, "#E8D2A6"); px(ctx, x + 3, y + 2, 10, 14, "#6E4A26"); px(ctx, x + 4, y + 3, 8, 13, "#8A5A2B"); px(ctx, x + 10, y + 9, 1, 2, "#FFD166"); break;
      case "W": wall(ctx, x, y, th, tx, ty); break;
      case "_": floor(ctx, x, y, tx, ty, th); break;
      case "L": wall(ctx, x, y, th, tx, ty); px(ctx, x + 2, y + 1, 12, 15, "#6E4A26"); px(ctx, x + 3, y + 2, 10, 14, "#8A5A2B"); for (let i = 0; i < 3; i++) px(ctx, x + 3, y + 4 + i * 4, 10, 1, "#5A3A1E"); px(ctx, x + 6, y + 7, 4, 4, "#FFD166"); px(ctx, x + 7, y + 8, 2, 3, "#3A2400"); break;
      case "E": px(ctx, x, y, T, T, indoor ? th.g2 : "#7A7A86"); ctx.fillStyle = "#0B0816"; ctx.beginPath(); ctx.ellipse(x + 8, y + 12, 7, 9, 0, Math.PI, 0); ctx.lineTo(x + 15, y + 16); ctx.lineTo(x + 1, y + 16); ctx.fill(); px(ctx, x + 1, y + 2, 2, 2, "#9A9AA6"); break;
      case "U": floor(ctx, x, y, tx, ty, th); for (let i = 0; i < 4; i++) { px(ctx, x + 2, y + 2 + i * 3, 12, 2, i % 2 ? "#3D3852" : "#7A7494"); } break;
      case "t": wall(ctx, x, y, th, tx, ty); { const f = Math.floor((t || 0) * 8 + tx) % 2; px(ctx, x + 6, y + 8, 4, 6, "#6E4A26"); px(ctx, x + 5, y + 4 - f, 6, 5 + f, "#FF9F1C"); px(ctx, x + 7, y + 5, 2, 3, "#FFE680"); } break;
      case "C": case "c": floorOr(ctx, x, y, tx, ty, th, indoor); chest(ctx, x, y, ch === "c"); break;
      case "X": floorOr(ctx, x, y, tx, ty, th, indoor); px(ctx, x + 2, y + 10, 12, 5, "#8A8AA0"); px(ctx, x + 3, y + 9, 10, 1, "#B0B0C8"); px(ctx, x + 2, y + 14, 12, 1, "#5A5A70"); break;
      case "V": floorOr(ctx, x, y, tx, ty, th, indoor); px(ctx, x + 2, y + 2, 12, 12, "#2A2440"); px(ctx, x + 3, y + 3, 10, 10, "#13101F"); break; // çukur
      case "G": ground(ctx, x, y, tx, ty, th); px(ctx, x + 1, y, 3, 16, "#5A5A6A"); px(ctx, x + 6, y, 3, 16, "#5A5A6A"); px(ctx, x + 11, y, 3, 16, "#5A5A6A"); px(ctx, x, y + 4, T, 2, "#7A7A8A"); px(ctx, x, y + 11, T, 2, "#7A7A8A"); break; // kapalı parmaklık
      case "M": ground(ctx, x, y, tx, ty, th); { ctx.fillStyle = "rgba(0,0,0,.25)"; ctx.beginPath(); ctx.ellipse(x + 8, y + 13, 8, 3, 0, 0, 7); ctx.fill(); ctx.fillStyle = "#8A8AA0"; ctx.beginPath(); ctx.ellipse(x + 8, y + 10, 8, 5, 0, 0, 7); ctx.fill(); ctx.fillStyle = "#B0B0C8"; ctx.beginPath(); ctx.ellipse(x + 8, y + 9, 7, 4, 0, 0, 7); ctx.fill(); ctx.fillStyle = "#4F9FE8"; ctx.beginPath(); ctx.ellipse(x + 8, y + 9.5, 5.5, 2.8, 0, 0, 7); ctx.fill(); px(ctx, x + 7, y + 2, 2, 7, "#8A8AA0"); px(ctx, x + 6, y + 2, 4, 1, "#B0B0C8"); const f = (t || 0) * 6; for (let i = 0; i < 3; i++) { const k = (f + i / 3) % 1; px(ctx, x + 8 + (i - 1) * (2 + k * 3), y + 1 + k * k * 8 - Math.sin(k * 3) * 3, 1, 1, "#BFE6FF"); } px(ctx, x + 5, y + 9, 2, 1, "#BFE6FF"); } break; // çeşme
      case "Y": px(ctx, x, y, T, T, "#0B0816"); break;
      default: px(ctx, x, y, T, T, "#000");
    }
  }
  function floorOr(ctx, x, y, tx, ty, th, indoor) { if (indoor) floor(ctx, x, y, tx, ty, th); else ground(ctx, x, y, tx, ty, th); }
  function floor(ctx, x, y, tx, ty, th) { px(ctx, x, y, T, T, th.g1); px(ctx, x, y, T, 1, th.g3); px(ctx, x, y, 1, T, th.g3); px(ctx, x + 15, y, 1, T, th.g2); px(ctx, x, y + 15, T, 1, th.g2); if (hash(tx, ty, 4) < .2) px(ctx, x + 5, y + 7, 4, 1, th.g2); }
  function wall(ctx, x, y, th, tx, ty) {
    const base = th === THEMES.tower ? "#6A5592" : th === THEMES.cave ? "#5E5878" : "#8A8A96", dark = th === THEMES.tower ? "#45366A" : th === THEMES.cave ? "#3B3650" : "#5E5E6A", lite = th === THEMES.tower ? "#8A74B4" : th === THEMES.cave ? "#7E78A0" : "#AEAEBA";
    px(ctx, x, y, T, T, base);
    for (let j = 0; j < 4; j++) { px(ctx, x, y + j * 4, T, 1, dark); const o = (j + ty) % 2 ? 0 : 6; px(ctx, x + o, y + j * 4, 1, 4, dark); px(ctx, x + o + 8, y + j * 4, 1, 4, dark); px(ctx, x + o + 1, y + j * 4 + 1, 4, 1, lite); }
  }
  function tree(ctx, x, y, th, r) {
    const dark = th === THEMES.forest ? "#1F5A2A" : "#2E7A30", mid = th === THEMES.forest ? "#2E7A36" : "#3E9A40", lite = th === THEMES.forest ? "#4FA855" : "#64BE58";
    ctx.fillStyle = "rgba(0,0,0,.25)"; ctx.beginPath(); ctx.ellipse(x + 8, y + 14, 7, 2.5, 0, 0, 7); ctx.fill();
    px(ctx, x + 6, y + 10, 4, 5, "#6E4A26"); px(ctx, x + 6, y + 10, 1, 5, "#8A5A2B");
    ctx.fillStyle = dark; ctx.beginPath(); ctx.arc(x + 8, y + 7, 7.5, 0, 7); ctx.fill();
    ctx.fillStyle = mid; ctx.beginPath(); ctx.arc(x + 7, y + 6, 6, 0, 7); ctx.fill();
    ctx.fillStyle = lite; ctx.beginPath(); ctx.arc(x + 5.5, y + 4.5, 2.5, 0, 7); ctx.fill();
    if (r > .7) { px(ctx, x + 10, y + 7, 2, 2, "#E8463F"); px(ctx, x + 6, y + 9, 2, 2, "#E8463F"); }
  }
  function bush(ctx, x, y) {
    ctx.fillStyle = "rgba(0,0,0,.2)"; ctx.beginPath(); ctx.ellipse(x + 8, y + 13, 7, 2.5, 0, 0, 7); ctx.fill();
    ctx.fillStyle = "#2E8A3A"; ctx.beginPath(); ctx.arc(x + 5, y + 9, 5, 0, 7); ctx.arc(x + 11, y + 9, 5, 0, 7); ctx.arc(x + 8, y + 6, 5, 0, 7); ctx.fill();
    ctx.fillStyle = "#57C05E"; ctx.beginPath(); ctx.arc(x + 6, y + 6, 2, 0, 7); ctx.arc(x + 10, y + 8, 1.5, 0, 7); ctx.fill();
  }
  function rock(ctx, x, y) {
    ctx.fillStyle = "rgba(0,0,0,.25)"; ctx.beginPath(); ctx.ellipse(x + 8, y + 13, 7, 2.5, 0, 0, 7); ctx.fill();
    ctx.fillStyle = "#7A7A86"; ctx.beginPath(); ctx.moveTo(x + 2, y + 13); ctx.lineTo(x + 3, y + 5); ctx.lineTo(x + 8, y + 2); ctx.lineTo(x + 13, y + 5); ctx.lineTo(x + 14, y + 13); ctx.fill();
    px(ctx, x + 5, y + 5, 3, 2, "#A8A8B4"); px(ctx, x + 9, y + 9, 3, 1, "#5E5E6A");
  }
  function water(ctx, x, y, tx, ty, t) {
    px(ctx, x, y, T, T, "#2F6FC0");
    const f = Math.floor((t || 0) * 3 + tx + ty) % 4;
    px(ctx, x + ((f * 4 + tx * 3) % 12), y + 4, 4, 1, "#6FB2F5"); px(ctx, x + ((f * 4 + 6) % 12), y + 11, 3, 1, "#6FB2F5");
    px(ctx, x, y, T, 1, "#245BA0");
  }
  function chest(ctx, x, y, open) {
    ctx.fillStyle = "rgba(0,0,0,.25)"; ctx.fillRect(x + 2, y + 13, 12, 2);
    px(ctx, x + 2, y + 6, 12, 8, "#8A5A2B"); px(ctx, x + 2, y + 6, 12, 1, "#B07A40"); px(ctx, x + 2, y + 13, 12, 1, "#5A3A1E");
    if (open) { px(ctx, x + 2, y + 2, 12, 4, "#5A3A1E"); px(ctx, x + 3, y + 6, 10, 2, "#2A1A0E"); }
    else { px(ctx, x + 2, y + 3, 12, 4, "#A06A34"); px(ctx, x + 2, y + 3, 12, 1, "#C88A4A"); px(ctx, x + 7, y + 6, 2, 3, "#FFD166"); }
    px(ctx, x + 2, y + 9, 12, 1, "#C9A24A");
  }

  /* ---------- nesneler ve yaratıklar ---------- */
  function heart(ctx, x, y, fill) { // 7×6
    const c = fill === 1 ? "#E8463F" : fill === .5 ? "#E8463F" : "#3B3470";
    const rows = [".XX.XX.", "XXXXXXX", "XXXXXXX", ".XXXXX.", "..XXX..", "...X..."];
    rows.forEach((r, j) => { for (let i = 0; i < 7; i++) if (r[i] === "X") { ctx.fillStyle = fill === .5 && i > 3 ? "#3B3470" : c; ctx.fillRect(x + i, y + j, 1, 1); } });
    if (fill) { ctx.fillStyle = "#FF9C96"; ctx.fillRect(x + 1, y + 1, 1, 1); }
  }
  function coin(ctx, x, y, t) { const w = Math.abs(Math.cos((t || 0) * 4)) * 3 + 1; ctx.fillStyle = "#C98F00"; ctx.fillRect(x + 4 - w, y + 1, w * 2, 6); ctx.fillStyle = "#FFD166"; ctx.fillRect(x + 4 - w + .5, y + 1, Math.max(1, w * 2 - 1.5), 5); }
  function key(ctx, x, y) { px(ctx, x + 1, y, 4, 4, "#FFD166"); px(ctx, x + 2, y + 1, 2, 2, "#3A2400"); px(ctx, x + 2, y + 4, 2, 7, "#FFD166"); px(ctx, x + 4, y + 8, 2, 1, "#FFD166"); px(ctx, x + 4, y + 10, 2, 1, "#FFD166"); }
  function crystal(ctx, x, y, t, col) {
    const c = col || "#7DF9FF", b = Math.sin((t || 0) * 3) * 1.5;
    ctx.save(); ctx.translate(x + 8, y + 8 + b);
    const g = ctx.createRadialGradient(0, 0, 1, 0, 0, 12); g.addColorStop(0, c + "AA"); g.addColorStop(1, c + "00"); ctx.fillStyle = g; ctx.beginPath(); ctx.arc(0, 0, 12, 0, 7); ctx.fill();
    ctx.fillStyle = c; ctx.beginPath(); ctx.moveTo(0, -7); ctx.lineTo(5, -1); ctx.lineTo(0, 7); ctx.lineTo(-5, -1); ctx.closePath(); ctx.fill();
    ctx.fillStyle = "#fff"; ctx.beginPath(); ctx.moveTo(0, -6); ctx.lineTo(2, -1); ctx.lineTo(0, 2); ctx.lineTo(-1.5, -1); ctx.closePath(); ctx.fill();
    ctx.restore();
  }
  function lantern(ctx, x, y, lit) { px(ctx, x + 6, y + 1, 4, 2, "#C9A24A"); px(ctx, x + 4, y + 3, 8, 9, "#C9A24A"); px(ctx, x + 5, y + 4, 6, 7, lit ? "#FFE680" : "#8FD3FF"); if (lit) px(ctx, x + 7, y + 6, 2, 3, "#fff"); px(ctx, x + 4, y + 12, 8, 2, "#8A6A20"); }
  function swordIcon(ctx, x, y) { px(ctx, x + 7, y + 1, 2, 9, "#DDE6F2"); px(ctx, x + 7, y + 1, 1, 9, "#fff"); px(ctx, x + 4, y + 10, 8, 2, "#C9A24A"); px(ctx, x + 7, y + 12, 2, 3, "#8A5A2B"); }
  function slime(ctx, x, y, t, col, hurt) {
    const sq = Math.sin(t * 8) * 1.2, c = hurt ? "#FFFFFF" : (col || "#5FD068"), d = hurt ? "#ddd" : "#2E8A3A";
    ctx.fillStyle = "rgba(0,0,0,.25)"; ctx.beginPath(); ctx.ellipse(x + 8, y + 14, 6, 2, 0, 0, 7); ctx.fill();
    ctx.fillStyle = d; ctx.beginPath(); ctx.ellipse(x + 8, y + 10 - sq / 2, 7 + sq / 2, 5 - sq / 2, 0, Math.PI, 0); ctx.lineTo(x + 15, y + 14); ctx.lineTo(x + 1, y + 14); ctx.fill();
    ctx.fillStyle = c; ctx.beginPath(); ctx.ellipse(x + 8, y + 10 - sq / 2, 6 + sq / 2, 4.5 - sq / 2, 0, Math.PI, 0); ctx.lineTo(x + 14, y + 13); ctx.lineTo(x + 2, y + 13); ctx.fill();
    px(ctx, x + 5, y + 9, 2, 2, "#1B1730"); px(ctx, x + 9, y + 9, 2, 2, "#1B1730"); px(ctx, x + 5, y + 6, 2, 1, "#fff");
  }
  function bat(ctx, x, y, t, hurt) {
    const f = Math.sin(t * 20) > 0, c = hurt ? "#fff" : "#5B3F8C";
    ctx.fillStyle = "rgba(0,0,0,.2)"; ctx.beginPath(); ctx.ellipse(x + 8, y + 15, 4, 1.5, 0, 0, 7); ctx.fill();
    ctx.fillStyle = c; ctx.beginPath(); ctx.arc(x + 8, y + 7, 3.5, 0, 7); ctx.fill();
    ctx.beginPath(); if (f) { ctx.moveTo(x + 5, y + 6); ctx.lineTo(x, y + 2); ctx.lineTo(x + 2, y + 8); ctx.moveTo(x + 11, y + 6); ctx.lineTo(x + 16, y + 2); ctx.lineTo(x + 14, y + 8); } else { ctx.moveTo(x + 5, y + 7); ctx.lineTo(x, y + 11); ctx.lineTo(x + 3, y + 9); ctx.moveTo(x + 11, y + 7); ctx.lineTo(x + 16, y + 11); ctx.lineTo(x + 13, y + 9); } ctx.fill();
    px(ctx, x + 6, y + 6, 1, 1, "#FFD166"); px(ctx, x + 9, y + 6, 1, 1, "#FFD166");
  }
  function ghost(ctx, x, y, t, hurt) {
    const b = Math.sin(t * 3) * 1.5; ctx.globalAlpha = .85;
    ctx.fillStyle = hurt ? "#fff" : "#C9C2F2"; ctx.beginPath(); ctx.arc(x + 8, y + 6 + b, 6, Math.PI, 0); ctx.lineTo(x + 14, y + 14 + b);
    for (let i = 0; i < 4; i++) ctx.lineTo(x + 14 - i * 3 - 1.5, y + (i % 2 ? 14 : 12) + b); ctx.lineTo(x + 2, y + 14 + b); ctx.fill();
    ctx.globalAlpha = 1; px(ctx, x + 5, y + 6 + b, 2, 3, "#2A2050"); px(ctx, x + 9, y + 6 + b, 2, 3, "#2A2050");
  }
  function spark(ctx, x, y, t, col) { ctx.fillStyle = col; ctx.beginPath(); ctx.arc(x, y, 3 + Math.sin(t * 20), 0, 7); ctx.fill(); ctx.fillStyle = "#fff"; ctx.beginPath(); ctx.arc(x, y, 1.5, 0, 7); ctx.fill(); }

  window.ART = { T, THEMES, drawTile, person, sprite, heart, coin, key, crystal, lantern, swordIcon, slime, bat, ghost, spark, chest, hash, px };
})();
