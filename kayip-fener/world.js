/* Kayıp Fener — dünya: odalar (20×11 karo), kişiler, sandıklar, düşmanlar, geçitler
   Oda anahtarı "katman:x,y" — o: dış dünya, c: mağara, t: kule */
(function () {
  "use strict";
  const R = {};
  function room(id, o) { R[id] = o; }

  /* ---------------- KÖY ---------------- */
  room("o:0,0", { area: "village", name: "Köy Meydanı", map: [
    "TTTTTTTTTTTTTTTTTTTT",
    "TrrrrT.,.OOO.,.rrrrT",
    "THHHHT...OOO...HHHHT",
    "THDHHT,..OOO..,HHDHT",
    "T....===========....",
    "T.,..=....M....=.,..",
    "T....=====.=====....",
    "T.B.....,.=.,.....BT",
    "TFFFF..B..=..B.FFFFT",
    "T.,.......=.......,T",
    "TTTTTTTTT==TTTTTTTTT"],
    npcs: [{ id: "elder", x: 7, y: 5, pal: "elder", dir: 0 }] });

  room("o:1,0", { area: "village", name: "Köy Evleri", map: [
    "TTTTTTTTTTTTTTTTTTTT",
    "TrrrrrT..TT..rrrrrrT",
    "THHHHHT.,....HHHHHHT",
    "THHDHHT......HHHDHHT",
    "......===========..T",
    "..,..=.,.......=...T",
    "......====.======..T",
    "T.FFF...,=.,..FFF..T",
    "T.,B.....=......B,.T",
    "T........=.........T",
    "TTTTTTTTT==TTTTTTTTT"],
    npcs: [{ id: "smith", x: 3, y: 4, pal: "smith", dir: 0 }, { id: "ada", x: 13, y: 8, pal: "girl", dir: 3 }] });

  room("o:0,1", { area: "village", name: "Göl Kıyısı", map: [
    "TTTTTTTTT..TTTTTTTTT",
    "T,.......=.......,.T",
    "T..B....=.....~~~..T",
    "T.....===....~~~~~.T",
    "T..,..=...,..~~~~~..",
    "T.....=.......~~~...",
    "T.B...========......",
    "T.....,.........B..T",
    "T..~~~......C....,.T",
    "T.~~~~~..,......R..T",
    "TTTTTTTTTTTTTTTTTTTT"],
    npcs: [{ id: "can", x: 4, y: 4, pal: "kid", dir: 2 }],
    chests: { "12,8": { coins: 15 } } });

  room("o:1,1", { area: "village", name: "Köy Çıkışı", map: [
    "TTTTTTTTT..TTTTTTTTT",
    "T.,......=.....,...T",
    "T...B....=.....B...T",
    "TFFF.....=......FFFT",
    ".........=====..S...",
    "...,..===...====....",
    "......=..,.....=====",
    "T..B..=.........,..T",
    "T.....=..R...B.....T",
    "T,....=..........,.T",
    "TTTTTTTTTTTTTTTTTTTT"],
    signs: { "16,4": "→ Gizemli Orman   ← Köy\nDikkat: ormanda canavarlar var!" } });

  /* ---------------- ORMAN ---------------- */
  room("o:2,1", { area: "forest", name: "Orman Girişi", map: [
    "TTTTTTTTT..TTTTTTTTT",
    "TTT..,...=...B..TTTT",
    "TT..B....=..,....TTT",
    "T...TT...=.....T...T",
    "....T....====.......",
    ".........=..=.......",
    "....,....=..====....",
    "T..TT....=....B..TTT",
    "TT...B...=.,.......T",
    "TTT......=.....TTTTT",
    "TTTTTTTTT..TTTTTTTTT"],
    enemies: [["slime", 5, 5], ["slime", 15, 8]] });

  room("o:2,0", { area: "forest", name: "Lamba Korusu", map: [
    "TTTTTTTTTTTTTTTTTTTT",
    "TTTT,....TT....,TTTT",
    "TT....B........B..TT",
    "TT..............,.TT",
    "T...TT....,...TT...T",
    "T.,.T..........T...T",
    "T...TT........TT.,.T",
    "TT.......,........TT",
    "TT..B..........B..TT",
    "TTTT......,.....TTTT",
    "TTTTTTTTT..TTTTTTTTT"],
    enemies: [["slime", 4, 3], ["slime", 15, 3], ["beetle", 10, 6], ["slime", 9, 8]],
    clearChest: { x: 9, y: 5, item: "lamp" } });

  room("o:3,0", { area: "forest", name: "Mantar Çayırı", map: [
    "TTTTTTTTTTTTTTTTTTTT",
    "TTT,....,....,...TTT",
    "TT................TT",
    "T...B..........B...T",
    "T..................T",
    "T..,.............,.T",
    "T..................T",
    "T...B..........B...T",
    "TT................TT",
    "TTT.,....,....,..TTT",
    "TTTTTTTTT..TTTTTTTTT"],
    boss: "mantar" });

  room("o:3,1", { area: "forest", name: "Derin Orman", map: [
    "TTTTTTTTT..TTTTTTTTT",
    "TT.,.....=......B.TT",
    "T..~~~...=..TT....TT",
    "T.~~~~~..=..TT..C..T",
    "...~~~...=.........T",
    ".........==........T",
    "....B.....=.....B..T",
    "T.....TT..=.....,..T",
    "TT.,..TT..=.......TT",
    "TTT.......=.....TTTT",
    "TTTTTTTTT..TTTTTTTTT"],
    enemies: [["beetle", 5, 5], ["slime", 14, 8], ["beetle", 15, 6]],
    chests: { "16,3": { coins: 10 } } });

  room("o:2,2", { area: "forest", name: "Eski Kule Yolu", map: [
    "TTTTTTTTT..TTTTTTTTT",
    "TWWWWWWT.=.,....TTTT",
    "TWtWWtWT.=......B.TT",
    "TWWWEWWT.=........TT",
    "T...Q....=..........",
    "T.,.=====...,.......",
    "T..........B........",
    "TT.....,......TT...T",
    "TTT..B....,..TTT..TT",
    "TTTT.........TTTTTTT",
    "TTTTTTTTTTTTTTTTTTTT"],
    enemies: [["slime", 13, 6], ["beetle", 6, 7]],
    links: { "4,3": { to: "t:0,1", x: 8, y: 8, dir: 1, need: "tower" } } });

  room("o:3,2", { area: "forest", name: "Mağara Ağzı", map: [
    "TTTTTTTTT..TTTTTTTTT",
    "TT..,....=.....RWWWT",
    "T...B....=....RWWWWT",
    "T........=....WWEWWT",
    ".........=======...T",
    "...,.............,.T",
    ".....R.....B.......T",
    "T......,.......R...T",
    "TT..B.......,.....TT",
    "TTTR.......R....TTTT",
    "TTTTTTTTTTTTTTTTTTTT"],
    enemies: [["slime", 6, 5], ["beetle", 12, 7]],
    links: { "16,3": { to: "c:0,1", x: 4, y: 8, dir: 2, need: "lamp" } } });

  /* ---------------- MAĞARA ---------------- */
  room("c:0,1", { area: "cave", name: "Mağara Girişi", dark: true, map: [
    "WWWtWWWWW..WWWWWtWWW",
    "W..................W",
    "W..R...........R...W",
    "W..................W",
    "W.....WW......WW....",
    "W.....WW......WW....",
    "W...................",
    "W..R.............R.W",
    "W..U...............W",
    "W..................W",
    "WWWWWtWWWWWWWWtWWWWW"],
    enemies: [["bat", 6, 2], ["bat", 12, 7], ["bat", 15, 3]],
    links: { "3,8": { to: "o:3,2", x: 16, y: 4, dir: 0 } } });

  room("c:0,0", { area: "cave", name: "Yarasa Salonu", dark: true, map: [
    "WWWWWWtWWWWWWtWWWWWW",
    "W..................W",
    "W..~~~........~~~..W",
    "W..~~~........~~~..W",
    "W..................W",
    "W.......WWWW.......W",
    "W..................W",
    "W..~~~........~~~..W",
    "W..~~~........~~~..W",
    "W..................W",
    "WWWWWWWWW..WWWWWWWWW"],
    enemies: [["bat", 5, 4], ["bat", 14, 4], ["bat", 9, 8], ["rslime", 6, 1], ["rslime", 13, 9]],
    clearChest: { x: 9, y: 4, item: "key" } });

  room("c:1,1", { area: "cave", name: "Yeraltı Gölü", dark: true, map: [
    "WWWWWWWWWLWWWWWWWWWW",
    "W.......~...~......W",
    "W..C....~...~...R..W",
    "W.......~...~......W",
    "........~...~......W",
    "........PPPPP......W",
    "........~~~~~......W",
    "W..R....~~~~~...R..W",
    "W.......~~~~~......W",
    "W.......~~~~~......W",
    "WWWWWWWtWWWWtWWWWWWW"],
    enemies: [["rslime", 16, 4], ["bat", 4, 7], ["rslime", 15, 8]],
    chests: { "3,2": { coins: 20 } } });

  room("c:1,0", { area: "cave", name: "Taş Dev'in İni", map: [
    "WWWWtWWWWWWWWWWtWWWW",
    "W..................W",
    "W..................W",
    "W..................W",
    "W..................W",
    "W..................W",
    "W..................W",
    "W..................W",
    "W..................W",
    "W..................W",
    "WWWWWWWWW.WWWWWWWWWW"],
    boss: "golem" });

  /* ---------------- KULE ---------------- */
  room("t:0,1", { area: "tower", name: "Kule Kapısı", map: [
    "WWWWtWWWWWWWWtWWWWWW",
    "W..................W",
    "W..XX..........XX..W",
    "W..................W",
    "W...................",
    "W...................",
    "W...................",
    "W..................W",
    "W..XX..........XX..W",
    "W.......U..........W",
    "WWWWtWWWWWWWWtWWWWWW"],
    enemies: [["ghost", 6, 5], ["ghost", 14, 5]],
    links: { "8,9": { to: "o:2,2", x: 4, y: 5, dir: 0 } } });

  room("t:1,1", { area: "tower", name: "Hayalet Salonu", map: [
    "WWWWWWWWWLWWWWWWWWWW",
    "W..................W",
    "W...V..........V...W",
    "W..................W",
    "...................W",
    ".......VVVVV.......W",
    "...................W",
    "W..................W",
    "W...V..........V...W",
    "W..................W",
    "WWWWtWWWWWWWWtWWWWWW"],
    enemies: [["ghost", 4, 4], ["ghost", 15, 6], ["ghost", 9, 8], ["pslime", 12, 2]],
    clearChest: { x: 9, y: 3, item: "key" } });

  room("t:1,0", { area: "tower", name: "Meşale Odası", map: [
    "WWWWtWWWWWWWWtWWWWWW",
    "W..................W",
    "W..C...............W",
    "W.....XX....XX.....W",
    "...................W",
    "...................W",
    "...................W",
    "W.....XX....XX.....W",
    "W..................W",
    "W..................W",
    "WWWWWWWWW.WWWWWWWWWW"],
    enemies: [["ghost", 8, 5], ["ghost", 12, 5], ["pslime", 4, 8], ["pslime", 16, 8]],
    chests: { "3,2": { heart: 1 } } });

  room("t:0,0", { area: "tower", name: "Büyücünün Odası", map: [
    "WWWWtWWWWtWWWWtWWWWW",
    "W..................W",
    "W..................W",
    "W..................W",
    "W...................",
    "W...................",
    "W...................",
    "W..................W",
    "W..................W",
    "W..................W",
    "WWWWtWWWWtWWWWtWWWWW"],
    boss: "wizard" });

  window.WORLD = {
    rooms: R,
    areas: {
      village: { name: "Köy", theme: "village", music: "village" },
      forest: { name: "Gizemli Orman", theme: "forest", music: "forest" },
      cave: { name: "Kristal Mağarası", theme: "cave", music: "cave" },
      tower: { name: "Eski Kule", theme: "tower", music: "tower" }
    },
    start: { room: "o:0,0", x: 10, y: 7 }
  };
})();
