/* Tilki Macerası bölümleri
   Her bölüm 14 satır yüksekliğinde bir kare ızgarası (bir kare 40 px).
   Harfler: # toprak, B taş, = tek yönlü tahta (alttan geçilir), ^ diken,
   o altın, * yıldız, E böcek, F yarasa, S zıplama yastığı, C kontrol noktası,
   P başlangıç, G bitiş bayrağı. Satır 13 en alt satırdır.
   g(x0, x1, üst) toprağı üst satırdan tabana kadar doldurur. */
window.TILKI_LEVELS = (function(){
  "use strict";
  const ROWS = 14;
  function build(width, fn){
    const grid = Array.from({length:ROWS}, () => Array(width).fill("."));
    const set = (x, r, ch) => { if (x >= 0 && x < width && r >= 0 && r < ROWS) grid[r][x] = ch; };
    const api = {
      g(x0, x1, top){ for (let x = x0; x <= x1; x++) for (let r = top; r < ROWS; r++) set(x, r, "#"); },
      block(x0, x1, r0, r1, ch){ for (let x = x0; x <= x1; x++) for (let r = r0; r <= r1; r++) set(x, r, ch || "B"); },
      row(x0, x1, r, ch){ for (let x = x0; x <= x1; x++) set(x, r, ch); },
      at(x, r, ch){ set(x, r, ch); }
    };
    fn(api);
    return grid.map(r => r.join(""));
  }

  return [
    {name:"Orman Girişi", theme:"forest", map:build(72, L => {
      L.g(0, 16, 11); L.at(2, 10, "P");
      L.row(5, 8, 9, "o");
      L.g(17, 19, 10);
      L.g(20, 26, 11); L.at(23, 7, "*");
      L.row(27, 28, 8, "o");
      L.g(29, 42, 11); L.at(34, 10, "E"); L.g(37, 39, 9);
      L.g(43, 46, 11); L.at(43, 10, "C");
      L.g(50, 71, 11);
      L.row(52, 55, 8, "="); L.row(52, 54, 7, "o"); L.at(55, 7, "*");
      L.at(60, 10, "E"); L.at(64, 6, "*");
      L.at(69, 10, "G");
    })},

    {name:"Çiçekli Tepeler", theme:"hills", map:build(92, L => {
      L.g(0, 10, 11); L.at(2, 10, "P");
      L.g(11, 16, 9);
      L.g(17, 22, 7); L.row(17, 22, 5, "o");
      L.g(23, 25, 11); L.row(23, 25, 10, "^"); L.at(24, 4, "*");
      L.g(26, 33, 8); L.at(30, 7, "E");
      L.g(34, 41, 11); L.at(38, 10, "S");
      L.row(35, 42, 3, "="); L.row(35, 37, 2, "o"); L.at(40, 2, "*");
      L.g(42, 51, 11); L.at(45, 10, "C");
      L.row(53, 55, 9, "="); L.row(57, 59, 7, "="); L.row(61, 63, 5, "="); L.at(62, 2, "*");
      L.g(67, 91, 11); L.row(70, 73, 9, "o");
      L.at(74, 10, "E"); L.at(81, 10, "E");
      L.at(89, 10, "G");
    })},

    {name:"Karanlık Mağara", theme:"cave", map:build(100, L => {
      L.row(0, 99, 0, "B"); L.row(0, 99, 1, "B");
      L.g(0, 20, 11); L.at(2, 10, "P");
      L.block(10, 20, 2, 6); L.at(14, 10, "^"); L.at(15, 10, "^");
      L.g(21, 30, 9); L.at(26, 5, "F");
      L.at(32, 5, "*");
      L.g(35, 45, 9); L.block(40, 41, 6, 8); L.at(44, 8, "C");
      L.g(46, 60, 11); L.row(50, 53, 10, "^"); L.row(49, 54, 8, "="); L.at(52, 7, "*");
      L.g(61, 75, 11); L.block(62, 75, 2, 7); L.at(68, 10, "E"); L.row(70, 73, 10, "o");
      L.g(76, 99, 11); L.at(80, 5, "F"); L.at(88, 6, "F");
      L.at(84, 10, "S"); L.at(84, 3, "*");
      L.at(97, 10, "G");
    })},

    {name:"Dikenli Vadi", theme:"canyon", map:build(100, L => {
      L.g(0, 8, 11); L.at(2, 10, "P");
      L.g(12, 14, 10); L.g(18, 19, 9); L.g(23, 24, 8); L.g(28, 30, 10);
      L.at(21, 5, "*"); L.row(12, 14, 8, "o");
      L.g(31, 45, 11); L.row(35, 37, 10, "^"); L.row(42, 43, 10, "^"); L.at(39, 10, "E");
      L.at(45, 10, "C");
      L.g(46, 60, 11); L.block(50, 51, 8, 10); L.row(52, 55, 10, "^"); L.block(56, 57, 8, 10); L.at(54, 5, "*");
      L.at(63, 9, "=");
      L.g(66, 80, 11); L.at(72, 6, "F"); L.at(78, 10, "S");
      L.g(81, 90, 4); L.at(86, 1, "*"); L.row(83, 85, 3, "o");
      L.g(91, 99, 11); L.at(97, 10, "G");
    })},

    {name:"Yarasa Kulesi", theme:"night", map:build(104, L => {
      L.g(0, 12, 11); L.at(2, 10, "P");
      L.row(6, 9, 8, "="); L.row(6, 9, 7, "o");
      L.g(13, 18, 9); L.at(16, 5, "F");
      L.g(19, 24, 7); L.at(22, 3, "F");
      L.g(25, 28, 11); L.row(25, 28, 10, "^"); L.at(26, 3, "*");
      L.g(29, 36, 7); L.at(33, 6, "E");
      L.g(37, 50, 11); L.row(40, 43, 8, "="); L.row(45, 48, 5, "="); L.at(47, 4, "*"); L.at(44, 7, "F");
      L.at(50, 10, "C");
      L.g(51, 53, 11);
      L.g(58, 60, 9); L.at(62, 5, "F");
      L.g(64, 66, 9); L.at(68, 5, "F");
      L.g(70, 85, 11); L.at(76, 10, "E"); L.at(80, 10, "E"); L.at(84, 10, "S");
      L.row(86, 92, 2, "="); L.at(90, 1, "*");
      L.g(86, 103, 11); L.at(101, 10, "G");
    })},

    {name:"Bulut Adaları", theme:"sky", map:build(110, L => {
      L.g(0, 8, 11); L.at(2, 10, "P");
      L.row(11, 14, 9, "="); L.row(17, 20, 7, "="); L.row(23, 26, 9, "="); L.at(22, 4, "*");
      L.row(29, 32, 10, "="); L.row(35, 38, 8, "="); L.at(40, 5, "F");
      L.row(41, 44, 6, "="); L.row(47, 50, 8, "=");
      L.g(51, 58, 10); L.at(54, 9, "C"); L.at(58, 9, "S");
      L.row(60, 66, 2, "="); L.at(64, 1, "*"); L.row(61, 63, 1, "o");
      L.row(62, 65, 9, "="); L.row(68, 71, 7, "="); L.row(74, 77, 9, "="); L.at(76, 5, "F");
      L.row(80, 83, 7, "="); L.row(86, 89, 5, "="); L.at(88, 3, "*"); L.row(92, 95, 8, "=");
      L.g(98, 109, 11); L.at(103, 10, "E");
      L.at(107, 10, "G");
    })},

    {name:"Taş Kale", theme:"castle", map:build(116, L => {
      L.g(0, 14, 11); L.at(2, 10, "P");
      L.block(8, 9, 9, 10); L.at(12, 10, "E");
      L.g(15, 17, 11); L.row(15, 17, 10, "^");
      L.g(18, 30, 11); L.block(20, 27, 2, 6); L.at(24, 10, "E"); L.at(28, 10, "E");
      L.g(31, 44, 11); L.block(31, 32, 8, 10); L.row(34, 40, 10, "^"); L.row(36, 38, 7, "="); L.at(37, 5, "*");
      L.at(43, 10, "C");
      L.g(45, 57, 11); L.block(48, 49, 8, 10); L.block(52, 53, 6, 10); L.block(56, 57, 4, 10); L.at(57, 1, "*");
      L.g(58, 70, 11); L.row(61, 63, 10, "^"); L.at(62, 4, "F"); L.at(67, 10, "E");
      L.g(75, 90, 11); L.row(78, 81, 8, "="); L.at(80, 5, "F"); L.block(85, 90, 2, 7); L.at(87, 10, "E");
      L.at(90, 10, "C");
      L.g(91, 94, 11); L.g(98, 100, 9); L.at(99, 5, "*"); L.g(104, 115, 11);
      L.at(113, 10, "G");
    })},

    {name:"Zirve", theme:"sunset", map:build(124, L => {
      L.g(0, 10, 11); L.at(2, 10, "P"); L.at(8, 10, "S");
      L.g(11, 20, 3); L.row(12, 16, 1, "o"); L.at(18, 0, "*");
      L.g(21, 30, 11); L.row(24, 26, 10, "^"); L.at(28, 10, "E"); L.row(23, 27, 8, "=");
      L.g(31, 33, 9); L.at(33, 6, "F");
      L.g(38, 40, 8); L.at(42, 4, "*");
      L.g(45, 47, 9); L.at(47, 8, "C");
      L.g(48, 62, 11); L.block(52, 62, 2, 6); L.row(54, 55, 10, "^"); L.row(59, 60, 10, "^"); L.at(57, 10, "E");
      L.g(63, 75, 11); L.row(66, 69, 8, "="); L.row(71, 74, 5, "="); L.at(73, 4, "*"); L.at(68, 4, "F");
      L.g(80, 84, 9); L.at(76, 6, "F"); L.at(84, 8, "S");
      L.row(86, 93, 1, "="); L.at(90, 0, "o");
      L.g(85, 95, 11); L.at(90, 10, "E");
      L.at(98, 9, "=");
      L.g(102, 123, 11); L.at(103, 10, "C"); L.at(106, 6, "F"); L.at(110, 10, "E"); L.at(115, 10, "E");
      L.at(121, 10, "G");
    })}
  ];
})();
