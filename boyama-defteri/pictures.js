/* Boyama Defteri resimleri. 400 × 400 alan.
   data-r olan her şekil boyanabilir bir parçadır; class="deco" olanlar sabit çizgiler ve süslerdir. */
(function(){
  function star(cx, cy, r){
    const p = [];
    for (let i = 0; i < 10; i++){
      const a = -Math.PI/2 + i*Math.PI/5, rr = i % 2 ? r*.45 : r;
      p.push((cx + Math.cos(a)*rr).toFixed(1) + "," + (cy + Math.sin(a)*rr).toFixed(1));
    }
    return p.join(" ");
  }
  const petals = [];
  for (let i = 0; i < 8; i++){
    const a = i*Math.PI/4, x = 200 + Math.cos(a)*60, y = 140 + Math.sin(a)*60, deg = i*45;
    petals.push(`<ellipse data-r="yaprak-${i + 1}" cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" rx="32" ry="19" transform="rotate(${deg} ${x.toFixed(1)} ${y.toFixed(1)})"/>`);
  }

  window.BOYAMA_RESIMLER = [
    {id:"balik", name:"Balık", emoji:"🐟", svg:`
      <rect data-r="deniz" x="0" y="0" width="400" height="400"/>
      <path data-r="kum" d="M0 330 Q100 300 200 330 T400 330 V400 H0 Z"/>
      <path data-r="yosun-1" d="M60 336 C40 290 80 270 60 225 C95 260 70 300 88 333 Z"/>
      <path data-r="yosun-2" d="M330 330 C315 285 350 265 335 215 C370 250 345 295 356 328 Z"/>
      <circle data-r="kabarcik-1" cx="330" cy="112" r="16"/>
      <circle data-r="kabarcik-2" cx="356" cy="68" r="11"/>
      <circle data-r="kabarcik-3" cx="322" cy="36" r="7"/>
      <polygon data-r="kuyruk" points="98,200 30,142 46,200 30,258"/>
      <path data-r="yuzgec" d="M175 140 Q205 78 255 140 Z"/>
      <ellipse data-r="govde" cx="200" cy="200" rx="115" ry="75"/>
      <ellipse data-r="benek-1" cx="168" cy="186" rx="22" ry="16"/>
      <ellipse data-r="benek-2" cx="132" cy="224" rx="16" ry="12"/>
      <ellipse data-r="benek-3" cx="196" cy="236" rx="14" ry="10"/>
      <path class="deco line" d="M250 158 Q232 200 250 242"/>
      <circle data-r="goz" cx="272" cy="184" r="19"/>
      <circle class="deco dark" cx="277" cy="184" r="8"/>
      <path class="deco line" d="M306 212 Q296 220 284 214"/>`},

    {id:"ev", name:"Ev", emoji:"🏠", svg:`
      <rect data-r="gokyuzu" x="0" y="0" width="400" height="400"/>
      <circle data-r="gunes" cx="330" cy="70" r="38"/>
      <ellipse data-r="bulut" cx="110" cy="72" rx="58" ry="24"/>
      <rect data-r="cimen" x="0" y="300" width="400" height="100"/>
      <path data-r="yol" d="M136 400 L150 310 H172 L196 400 Z"/>
      <rect data-r="agac-govde" x="318" y="220" width="28" height="92"/>
      <circle data-r="agac-tepe" cx="332" cy="200" r="50"/>
      <rect data-r="baca" x="203" y="112" width="30" height="60"/>
      <polygon data-r="cati" points="64,184 160,100 256,184"/>
      <rect data-r="duvar" x="84" y="182" width="152" height="128"/>
      <rect data-r="kapi" x="140" y="238" width="40" height="72"/>
      <circle class="deco dark" cx="171" cy="276" r="4"/>
      <rect data-r="pencere-1" x="100" y="200" width="32" height="32"/>
      <rect data-r="pencere-2" x="188" y="200" width="32" height="32"/>
      <path class="deco line" d="M116 200 V232 M100 216 H132 M204 200 V232 M188 216 H220"/>
      <circle data-r="cicek-1" cx="40" cy="330" r="12"/>
      <circle data-r="cicek-2" cx="70" cy="350" r="12"/>
      <circle data-r="cicek-3" cx="270" cy="345" r="12"/>`},

    {id:"roket", name:"Roket", emoji:"🚀", svg:`
      <rect data-r="uzay" x="0" y="0" width="400" height="400"/>
      <polygon data-r="yildiz-1" points="${star(70, 80, 24)}"/>
      <polygon data-r="yildiz-2" points="${star(340, 70, 17)}"/>
      <polygon data-r="yildiz-3" points="${star(60, 300, 15)}"/>
      <ellipse data-r="halka" cx="312" cy="300" rx="92" ry="22"/>
      <circle data-r="gezegen" cx="312" cy="300" r="58"/>
      <path data-r="alev" d="M172 318 Q200 398 228 318 Z"/>
      <polygon data-r="kanat-sol" points="166,245 118,322 166,302"/>
      <polygon data-r="kanat-sag" points="234,245 282,322 234,302"/>
      <rect data-r="govde" x="165" y="128" width="70" height="192" rx="18"/>
      <path data-r="burun" d="M165 150 Q200 36 235 150 Z"/>
      <circle data-r="pencere" cx="200" cy="200" r="23"/>
      <rect data-r="serit" x="165" y="262" width="70" height="18"/>`},

    {id:"kedi", name:"Kedi", emoji:"🐱", svg:`
      <rect data-r="duvar" x="0" y="0" width="400" height="400"/>
      <ellipse data-r="hali" cx="200" cy="352" rx="175" ry="34"/>
      <path data-r="kuyruk" d="M280 300 C365 300 362 200 322 178 C348 214 338 268 276 274 Z"/>
      <ellipse data-r="govde" cx="210" cy="286" rx="90" ry="68"/>
      <ellipse data-r="pati-1" cx="170" cy="346" rx="26" ry="14"/>
      <ellipse data-r="pati-2" cx="250" cy="346" rx="26" ry="14"/>
      <polygon data-r="kulak-1" points="126,122 140,48 188,96"/>
      <polygon data-r="kulak-2" points="274,122 260,48 212,96"/>
      <circle data-r="bas" cx="200" cy="150" r="74"/>
      <ellipse data-r="goz-1" cx="172" cy="140" rx="12" ry="16"/>
      <ellipse data-r="goz-2" cx="228" cy="140" rx="12" ry="16"/>
      <circle class="deco dark" cx="174" cy="143" r="5"/>
      <circle class="deco dark" cx="230" cy="143" r="5"/>
      <polygon data-r="burun" points="191,168 209,168 200,179"/>
      <path class="deco line" d="M200 179 Q190 193 180 187 M200 179 Q210 193 220 187 M150 172 H108 M150 182 L110 194 M250 172 H292 M250 182 L290 194"/>
      <circle data-r="yumak" cx="88" cy="318" r="38"/>
      <path class="deco line" d="M58 300 Q88 330 118 300 M60 334 Q90 306 116 338"/>`},

    {id:"araba", name:"Araba", emoji:"🚗", svg:`
      <rect data-r="gokyuzu" x="0" y="0" width="400" height="400"/>
      <circle data-r="gunes" cx="60" cy="62" r="32"/>
      <ellipse data-r="bulut" cx="300" cy="72" rx="62" ry="22"/>
      <rect data-r="yol" x="0" y="300" width="400" height="100"/>
      <rect class="deco white" x="20" y="346" width="50" height="10" rx="4"/>
      <rect class="deco white" x="130" y="346" width="50" height="10" rx="4"/>
      <rect class="deco white" x="240" y="346" width="50" height="10" rx="4"/>
      <rect class="deco white" x="350" y="346" width="50" height="10" rx="4"/>
      <path data-r="kabin" d="M118 202 L160 140 H270 L312 202 Z"/>
      <polygon data-r="cam-1" points="140,198 170,154 210,154 210,198"/>
      <polygon data-r="cam-2" points="222,154 262,154 290,198 222,198"/>
      <rect data-r="govde" x="58" y="196" width="292" height="80" rx="22"/>
      <ellipse data-r="far" cx="338" cy="222" rx="10" ry="14"/>
      <rect data-r="stop" x="58" y="212" width="14" height="22" rx="4"/>
      <path class="deco line" d="M216 204 V268 M180 232 H196"/>
      <circle data-r="teker-1" cx="125" cy="280" r="34"/>
      <circle data-r="jant-1" cx="125" cy="280" r="14"/>
      <circle data-r="teker-2" cx="285" cy="280" r="34"/>
      <circle data-r="jant-2" cx="285" cy="280" r="14"/>`},

    {id:"cicek", name:"Çiçek", emoji:"🌻", svg:`
      <rect data-r="arka" x="0" y="0" width="400" height="400"/>
      <rect data-r="sap" x="193" y="170" width="14" height="124"/>
      <ellipse data-r="yeşil-yaprak-1" cx="160" cy="240" rx="40" ry="16" transform="rotate(-30 160 240)"/>
      <ellipse data-r="yeşil-yaprak-2" cx="240" cy="222" rx="40" ry="16" transform="rotate(30 240 222)"/>
      ${petals.join("")}
      <circle data-r="merkez" cx="200" cy="140" r="36"/>
      <polygon data-r="saksi" points="146,300 254,300 238,388 162,388"/>
      <rect data-r="saksi-kenar" x="132" y="284" width="136" height="26" rx="6"/>
      <circle data-r="kelebek-kanat-1" cx="322" cy="80" r="22"/>
      <circle data-r="kelebek-kanat-2" cx="352" cy="80" r="22"/>
      <circle data-r="kelebek-kanat-3" cx="326" cy="110" r="14"/>
      <circle data-r="kelebek-kanat-4" cx="348" cy="110" r="14"/>
      <rect class="deco dark" x="333" y="66" width="8" height="56" rx="4"/>`},

    {id:"dinozor", name:"Dinozor", emoji:"🦕", svg:`
      <rect data-r="gokyuzu" x="0" y="0" width="400" height="400"/>
      <polygon data-r="volkan" points="18,322 82,190 128,190 186,322"/>
      <path data-r="lav" d="M82 190 Q105 142 128 190 Z"/>
      <path data-r="zemin" d="M0 318 Q200 288 400 318 V400 H0 Z"/>
      <polygon data-r="kuyruk" points="118,250 18,300 126,290"/>
      <polygon data-r="diken-1" points="146,212 162,176 180,206"/>
      <polygon data-r="diken-2" points="182,200 200,164 218,198"/>
      <polygon data-r="diken-3" points="222,200 240,168 256,206"/>
      <rect data-r="bacak-1" x="148" y="268" width="32" height="62" rx="8"/>
      <rect data-r="bacak-2" x="246" y="268" width="32" height="62" rx="8"/>
      <ellipse data-r="govde" cx="215" cy="250" rx="96" ry="56"/>
      <path data-r="boyun" d="M262 232 C282 172 292 124 300 102 L336 108 C326 142 312 190 302 252 Z"/>
      <ellipse data-r="bas" cx="326" cy="100" rx="42" ry="26"/>
      <circle class="deco dark" cx="338" cy="92" r="6"/>
      <circle data-r="benek-1" cx="188" cy="244" r="13"/>
      <circle data-r="benek-2" cx="236" cy="266" r="9"/>
      <circle data-r="benek-3" cx="222" cy="226" r="7"/>`},

    {id:"dondurma", name:"Dondurma", emoji:"🍦", svg:`
      <rect data-r="arka" x="0" y="0" width="400" height="400"/>
      <circle data-r="top-sol" cx="165" cy="195" r="50"/>
      <circle data-r="top-sag" cx="235" cy="195" r="50"/>
      <circle data-r="top-ust" cx="200" cy="130" r="48"/>
      <polygon data-r="kulah" points="145,230 255,230 200,380"/>
      <path class="deco line" d="M180 245 L228 300 M220 245 L172 300 M190 290 L214 325 M210 290 L186 325"/>
      <circle data-r="kiraz" cx="205" cy="74" r="17"/>
      <path class="deco line" d="M205 58 Q214 34 232 28"/>
      <rect class="deco" x="180" y="115" width="14" height="5" rx="2" fill="#E5484D" transform="rotate(30 187 117)"/>
      <rect class="deco" x="214" y="140" width="14" height="5" rx="2" fill="#3D8BFD" transform="rotate(-20 221 142)"/>
      <rect class="deco" x="150" y="185" width="14" height="5" rx="2" fill="#2DB75A" transform="rotate(60 157 187)"/>
      <rect class="deco" x="240" y="200" width="14" height="5" rx="2" fill="#FF8A3D" transform="rotate(10 247 202)"/>
      <circle data-r="balon-1" cx="70" cy="90" r="30"/>
      <circle data-r="balon-2" cx="330" cy="120" r="26"/>
      <path class="deco line" d="M70 120 Q60 170 78 220 M330 146 Q342 190 326 240"/>`}
  ];
})();
