// 7. sınıf Matematik · 1. dönem (TYMM 2026-2027 taslak çerçeve plan: Sayılar ve Nicelikler 1, Geometrik Nicelikler 1, İstatistiksel Araştırma Süreci, Dönüşüm)
// Soru biçimi: [soru, [A, B, C, D], doğru seçeneğin sırası (0-3), açıklama, (isteğe bağlı) seçenekler karıştırılmasın]
window.DERS = window.DERS || [];
window.DERS.push({
  id: "mat", nm: "Matematik", ikon: "📐", renk: "#3D7BE0", deneme: 20, dk: 2,
  uniteler: [
    {
      id: "u1", nm: "Tam Sayılar ve Rasyonel Sayılar", alt: "Sayı kümeleri · ondalık gösterim · karşılaştırma ve sıralama",
      ozet: [
        {b: "Sayı kümeleri", m: [
          "**Doğal sayılar:** 0, 1, 2, 3, …",
          "**Tam sayılar:** …, −3, −2, −1, 0, 1, 2, 3, … (negatifler, sıfır, pozitifler)",
          "**Rasyonel sayılar:** a ve b tam sayı, b ≠ 0 olmak üzere a/b biçiminde yazılabilen sayılar. Payda asla 0 olamaz!",
          "Her doğal sayı bir tam sayıdır, her tam sayı da bir rasyonel sayıdır (5 = 5/1). Ama her rasyonel sayı tam sayı değildir (1/2 gibi)."],
          o: "**Örnek:** −7, 0, 3/4, −2,5 ve 1,333… sayılarının hepsi rasyoneldir."},
        {b: "Gerçek hayatta rasyonel sayılar", m: [
          "Deniz seviyesinin altı, sıfırın altındaki sıcaklık, borç gibi durumlar **negatif** sayılarla gösterilir.",
          "Sayı doğrusunda sıfırın solundakiler negatif, sağındakiler pozitiftir.",
          "Bir sayının sıfıra olan uzaklığına **mutlak değer** denir: |−4,5| = 4,5 ve |3| = 3. Mutlak değer hiçbir zaman negatif olmaz."],
          o: "**Örnek:** Deniz seviyesinin 12,5 m altındaki dalgıcın konumu −12,5 m ile gösterilir."},
        {b: "Ondalık gösterim", m: [
          "Kesrin payını paydasına bölerek ondalık gösterim bulunur: 3/8 = 0,375.",
          "Bölme bir yerde biterse **sonlu ondalık** gösterim olur (1/4 = 0,25).",
          "Sadeleşmiş bir kesrin paydasında 2 ve 5'ten başka asal çarpan varsa ondalık kısım tekrar eder: **devirli ondalık** (2/3 = 0,666…, 6 devirli).",
          "Ondalık sayıyı kesre çevirmek: 0,75 = 75/100 = 3/4 ; −2,4 = −24/10 = −12/5."],
          o: "**Kısa yol:** 0,444… (4 devirli) = 4/9 ; 0,2727… (27 devirli) = 27/99 = 3/11."},
        {b: "Karşılaştırma ve sıralama", m: [
          "Pozitif sayılar her zaman negatif sayılardan büyüktür.",
          "İki negatif sayıdan sıfıra **yakın** olan (mutlak değeri küçük olan) daha büyüktür: −0,5 > −0,8.",
          "Kesirleri karşılaştırmak için paydaları eşitle ya da ondalık gösterime çevir: −3/4 = −0,75 ve −2/3 = −0,666… olduğundan −3/4 < −2/3."],
          o: "**Örnek sıralama (küçükten büyüğe):** −3/4 < −1/2 < 0 < 1/3 < 0,4"}
      ],
      ipucu: "Negatif sayıları sıralarken termometreyi düşün: −10 °C, −2 °C'den daha soğuktur, yani daha küçüktür.",
      s: [
        ["Aşağıdakilerden hangisi bir rasyonel sayı **değildir**?", ["5/0", "−3/4", "0,5", "7"], 0, "Rasyonel sayıda payda 0 olamaz. 5/0 tanımsızdır; diğerleri a/b biçiminde yazılabilir (7 = 7/1, 0,5 = 1/2)."],
        ["−2,75 sayısının kesir gösterimi hangisidir?", ["−11/4", "−27/5", "−2/75", "−275/10"], 0, "−2,75 = −275/100 = −11/4. (−275/10 ise −27,5 eder.)"],
        ["3/8 kesrinin ondalık gösterimi hangisidir?", ["0,375", "0,38", "0,3", "3,8"], 0, "3 ÷ 8 = 0,375."],
        ["Aşağıdaki kesirlerden hangisinin ondalık gösterimi **devirlidir**?", ["2/3", "1/4", "3/5", "7/8"], 0, "2/3 = 0,666… olur. Paydası 3 olduğu için (2 ve 5 dışında bir asal çarpan) devirlidir. Diğerlerinin paydası yalnızca 2 ve 5 çarpanlarından oluşur."],
        ["0,444… (4 devirli) sayısının kesir gösterimi hangisidir?", ["4/9", "2/5", "9/4", "1/4"], 0, "Tek basamak devreden ondalıkta devreden sayı 9'a bölünür: 0,444… = 4/9."],
        ["−1/2, −3/4 ve 1/3 sayılarının küçükten büyüğe sıralanışı hangisidir?", ["−3/4 < −1/2 < 1/3", "−1/2 < −3/4 < 1/3", "1/3 < −1/2 < −3/4", "−3/4 < 1/3 < −1/2"], 0, "−3/4 = −0,75 ve −1/2 = −0,5. Negatiflerden sıfıra uzak olan (−0,75) daha küçüktür. Pozitif olan 1/3 en büyüktür."],
        ["Aşağıdaki sayılardan hangisi −2 ile −1 arasındadır?", ["−3/2", "−5/2", "−1/2", "−9/4"], 0, "−3/2 = −1,5 olduğundan −2 ile −1 arasındadır. −5/2 = −2,5 ve −9/4 = −2,25 sayıları −2'den küçük, −1/2 ise −1'den büyüktür."],
        ["Sayı doğrusunda sıfıra en yakın sayı hangisidir?", ["0,25", "−0,3", "−1/3", "0,4"], 0, "Sıfıra uzaklık mutlak değerdir: |0,25| = 0,25 en küçüğüdür (|−0,3| = 0,3, |−1/3| ≈ 0,33, |0,4| = 0,4)."],
        ["Aşağıdaki ifadelerden hangisi **yanlıştır**?", ["Her rasyonel sayı bir tam sayıdır.", "Her tam sayı bir rasyonel sayıdır.", "Her doğal sayı bir tam sayıdır.", "0 bir rasyonel sayıdır."], 0, "1/2 rasyonel sayıdır ama tam sayı değildir. Bu yüzden 'her rasyonel sayı bir tam sayıdır' yanlıştır."],
        ["Deniz seviyesinin 12,5 metre altında yüzen bir dalgıcın konumu hangi sayıyla gösterilir?", ["−12,5", "12,5", "−125", "1/12,5"], 0, "Deniz seviyesi 0 kabul edilir; altı negatif yönle gösterilir: −12,5 m."],
        ["−5/6 ile −4/5 sayıları için hangisi doğrudur?", ["−5/6 < −4/5", "−5/6 > −4/5", "−5/6 = −4/5", "5/6 < 4/5"], 0, "Paydaları eşitle: −5/6 = −25/30, −4/5 = −24/30. Sıfıra daha uzak olan −25/30 daha küçüktür."],
        ["|−2,5| + |1,5| işleminin sonucu kaçtır?", ["4", "1", "−1", "−4"], 0, "Mutlak değer uzaklıktır ve negatif olmaz: 2,5 + 1,5 = 4."],
        ["Bir şehirde sabah sıcaklık −3,5 °C, öğlen 4,25 °C, akşam −1,75 °C ölçülüyor. En düşük sıcaklık hangisidir?", ["−3,5 °C (sabah)", "−1,75 °C (akşam)", "4,25 °C (öğlen)", "Hepsi eşit"], 0, "Negatiflerden sıfıra en uzak olan en küçüktür: −3,5 < −1,75 < 4,25."]
      ]
    },
    {
      id: "u2", nm: "Rasyonel Sayılarla İşlemler ve Problemler", alt: "Dört işlem · işlem önceliği · gerçek yaşam problemleri",
      ozet: [
        {b: "Toplama ve çıkarma", m: [
          "Paydaları eşitle, payları topla ya da çıkar: −3/4 + 5/8 = −6/8 + 5/8 = −1/8.",
          "Aynı işaretli sayılar toplanır ve işaret korunur; farklı işaretlilerde büyükten küçük çıkarılır, mutlak değeri büyük olanın işareti alınır.",
          "Çıkarma, çıkanın ters işaretlisini eklemektir: 2,4 − (−1,35) = 2,4 + 1,35 = 3,75."]},
        {b: "Çarpma ve bölme", m: [
          "Kesirlerde pay paya, payda paydaya çarpılır: (−2/3) · (9/4) = −18/12 = −3/2.",
          "Bölmede ikinci kesir ters çevrilip çarpılır: (−5/6) ÷ (−10/3) = (−5/6) · (−3/10) = 1/4.",
          "**İşaret kuralı:** (+)·(+) = +, (−)·(−) = +, (+)·(−) = −. Bölmede de aynısı geçerlidir."]},
        {b: "İşlem önceliği", m: [
          "1) Parantez içi  2) Çarpma ve bölme (soldan sağa)  3) Toplama ve çıkarma (soldan sağa).",
          "Ondalık sayılarla işlem yaparken virgülleri alt alta getirmeyi unutma."],
          o: "**Örnek:** −1/2 + 3/4 · (−2/3) = −1/2 + (−1/2) = −1"},
        {b: "Problem çözme", m: [
          "Bir bütünün kesri: 120 TL'nin 3/8'i = 120 · 3/8 = 45 TL.",
          "\"Kalanın\" kesri sorulursa önce kalanı bul: Kitabın 2/7'si okunursa kalan 5/7'dir; kalanın 1/5'i = 5/7 · 1/5 = 1/7.",
          "Artış (+) ve azalışları (−) sırayla topla: −4,5 °C'den 7,2 artıp 3,6 azalırsa −4,5 + 7,2 − 3,6 = −0,9 °C."]}
      ],
      ipucu: "Problemlerde 'kalan' kelimesi görünce önce bütünden ne kaldığını bulmalısın.",
      s: [
        ["(−3/4) + (5/8) işleminin sonucu kaçtır?", ["−1/8", "1/8", "−11/8", "2/4"], 0, "−3/4 = −6/8. −6/8 + 5/8 = −1/8."],
        ["(−2/3) · (9/4) işleminin sonucu kaçtır?", ["−3/2", "3/2", "−18/7", "−11/12"], 0, "(−2 · 9)/(3 · 4) = −18/12 = −3/2."],
        ["(−5/6) ÷ (−10/3) işleminin sonucu kaçtır?", ["1/4", "−1/4", "4", "25/9"], 0, "İkinci kesri ters çevirip çarp: (−5/6) · (−3/10) = 15/60 = 1/4. İki negatifin bölümü pozitiftir."],
        ["2,4 − (−1,35) işleminin sonucu kaçtır?", ["3,75", "1,05", "−3,75", "1,15"], 0, "Negatif sayıyı çıkarmak onun pozitifini eklemektir: 2,4 + 1,35 = 3,75."],
        ["Bir su deposunun 3/5'i doludur. Deponun tamamının 1/4'ü kadar su kullanılırsa deponun kaçta kaçı dolu kalır?", ["7/20", "3/20", "1/2", "11/20"], 0, "3/5 − 1/4 = 12/20 − 5/20 = 7/20."],
        ["Hava sıcaklığı −4,5 °C iken önce 7,2 °C artıyor, sonra 3,6 °C azalıyor. Son sıcaklık kaç °C olur?", ["−0,9", "0,9", "−15,3", "6,3"], 0, "−4,5 + 7,2 − 3,6 = 2,7 − 3,6 = −0,9 °C."],
        ["120 TL'nin 3/8'i kaç TL'dir?", ["45", "40", "36", "320"], 0, "120 ÷ 8 = 15, 15 · 3 = 45 TL."],
        ["Ece bir kitabın 2/7'sini birinci gün, kalan kısmının 1/5'ini ikinci gün okuyor. İkinci gün kitabın kaçta kaçını okumuştur?", ["1/7", "2/35", "1/5", "3/7"], 0, "Kalan: 1 − 2/7 = 5/7. Kalanın 1/5'i: 5/7 · 1/5 = 1/7."],
        ["(−0,6) · (−0,5) işleminin sonucu kaçtır?", ["0,3", "−0,3", "0,03", "3"], 0, "0,6 · 0,5 = 0,30. İki negatifin çarpımı pozitiftir: 0,3."],
        ["−1/2 + 3/4 · (−2/3) işleminin sonucu kaçtır?", ["−1", "−1/6", "1/6", "−1/3"], 0, "Önce çarpma: 3/4 · (−2/3) = −6/12 = −1/2. Sonra −1/2 + (−1/2) = −1."],
        ["1,2 kg peynir 0,15 kg'lık paketlere ayrılırsa kaç paket olur?", ["8", "18", "0,8", "80"], 0, "1,2 ÷ 0,15 = 120 ÷ 15 = 8 paket."],
        ["Bir dağcı 2450 m yükseklikteki kamptan sabah 125,5 m tırmanıyor, öğleden sonra 310,75 m iniyor. Kaç metre yükseklikte olur?", ["2264,75", "2886,25", "2635,25", "2575,5"], 0, "2450 + 125,5 − 310,75 = 2575,5 − 310,75 = 2264,75 m."],
        ["Bir sayının −2/3'ü 8 ise bu sayı kaçtır?", ["−12", "12", "−16/3", "16/3"], 0, "Sayı · (−2/3) = 8 → Sayı = 8 ÷ (−2/3) = 8 · (−3/2) = −12."]
      ]
    },
    {
      id: "u3", nm: "Cisimlerin Görünümleri, Prizmanın Alanı ve Hacmi", alt: "Farklı yönlerden görünüm · yüzey alanı · hacim · hacim birimleri",
      ozet: [
        {b: "Farklı yönlerden görünümler", m: [
          "Birim küplerden yapılmış bir yapıya **önden, üstten, sağdan ve soldan** bakınca farklı görünümler oluşur.",
          "Görünümde yalnızca bakılan yönden görülen kareler çizilir; arkada kalan küpler önündekilerle örtülür.",
          "Bir yapıyı oluşturan küp sayısını bulurken görünmeyen (arkada ya da altta kalan) küpleri de düşünmelisin."]},
        {b: "Dikdörtgenler prizmasının yüzey alanı", m: [
          "Dikdörtgenler prizmasının 6 yüzü vardır ve karşılıklı yüzler eştir.",
          "Ayrıtları a, b, c olan prizmanın yüzey alanı: **2 · (a·b + a·c + b·c)**",
          "Küpün tüm ayrıtları eşittir (a): yüzey alanı **6 · a · a**"],
          o: "**Örnek:** 5 cm, 4 cm, 3 cm → 2 · (20 + 15 + 12) = 2 · 47 = 94 cm²"},
        {b: "Hacim", m: [
          "Hacim, bir cismin uzayda kapladığı yerin ölçüsüdür. Birim küplerle sayılabilir.",
          "Dikdörtgenler prizmasının hacmi: **taban alanı × yükseklik = a · b · c**",
          "Küpün hacmi: **a · a · a**. Ayrıtlar 2 katına çıkarsa hacim 2·2·2 = 8 katına çıkar."],
          o: "**Örnek:** 5 cm × 4 cm × 3 cm = 60 cm³"},
        {b: "Hacim ölçme birimleri", m: [
          "Hacim birimleri biner biner büyür: **1 m³ = 1000 dm³**, **1 dm³ = 1000 cm³**.",
          "Sıvılarla bağlantı: **1 dm³ = 1 L** ve **1 cm³ = 1 mL**.",
          "Büyük birimden küçüğe geçerken 1000 ile çarp, küçükten büyüğe geçerken 1000'e böl."],
          o: "**Örnek:** 50 cm × 30 cm × 40 cm'lik akvaryum = 60 000 cm³ = 60 dm³ = 60 L su alır."}
      ],
      ipucu: "Yüzey alanı 'kaplamak/boyamak/sarmak' sorularında, hacim 'doldurmak/sığdırmak' sorularında kullanılır.",
      s: [
        ["Ayrıtları 5 cm, 4 cm ve 3 cm olan dikdörtgenler prizmasının hacmi kaç cm³'tür?", ["60", "47", "94", "12"], 0, "Hacim = 5 · 4 · 3 = 60 cm³."],
        ["Ayrıtları 5 cm, 4 cm ve 3 cm olan dikdörtgenler prizmasının yüzey alanı kaç cm²'dir?", ["94", "60", "47", "120"], 0, "2 · (5·4 + 5·3 + 4·3) = 2 · (20 + 15 + 12) = 94 cm²."],
        ["Bir ayrıtı 4 cm olan küpün hacmi kaç cm³'tür?", ["64", "16", "96", "48"], 0, "4 · 4 · 4 = 64 cm³. (96 ise küpün yüzey alanıdır: 6 · 16.)"],
        ["2,5 dm³ kaç cm³'tür?", ["2500", "250", "25", "25 000"], 0, "1 dm³ = 1000 cm³ olduğundan 2,5 · 1000 = 2500 cm³."],
        ["Hacmi 120 cm³ olan dikdörtgenler prizmasının taban ayrıtları 6 cm ve 5 cm'dir. Yüksekliği kaç cm'dir?", ["4", "5", "6", "20"], 0, "Taban alanı 6 · 5 = 30 cm². Yükseklik = 120 ÷ 30 = 4 cm."],
        ["3 litre su kaç cm³'tür?", ["3000", "300", "30", "30 000"], 0, "1 L = 1 dm³ = 1000 cm³. 3 L = 3000 cm³."],
        ["İç ölçüleri 50 cm, 30 cm ve 40 cm olan bir akvaryum tamamen doldurulursa kaç litre su alır?", ["60", "600", "6", "120"], 0, "50 · 30 · 40 = 60 000 cm³ = 60 dm³ = 60 L."],
        ["Bir kutunun tabanına 4 sıra hâlinde her sırada 3 birim küp diziliyor ve 2 kat oluşturuluyor. Kutuda kaç birim küp vardır?", ["24", "9", "12", "14"], 0, "Bir katta 4 · 3 = 12 küp, 2 katta 12 · 2 = 24 küp."],
        ["Yan yana tek sıra hâlinde dizilmiş 4 birim küpten oluşan yapının üstten görünümü kaç kareden oluşur?", ["4", "1", "8", "16"], 0, "Üstten bakınca her küpün üst yüzü görünür: 4 kare yan yana."],
        ["1 m³ kaç dm³'tür?", ["1000", "100", "10", "10 000"], 0, "Hacim birimleri biner biner büyür: 1 m³ = 1000 dm³."],
        ["Ayrıtları 2 m, 3 m ve 4 m olan bir kutunun bütün dış yüzeyi boyanacaktır. Her m² için 0,5 L boya gerekiyorsa kaç litre boya kullanılır?", ["26", "52", "12", "24"], 0, "Yüzey alanı: 2 · (6 + 8 + 12) = 52 m². 52 · 0,5 = 26 L."],
        ["4 cm × 3 cm × 2 cm'lik bir prizma ile aynı hacimde, taban ayrıtları 6 cm ve 2 cm olan prizmanın yüksekliği kaç cm'dir?", ["2", "3", "4", "1"], 0, "İlk hacim 24 cm³. 24 ÷ (6 · 2) = 2 cm."],
        ["Bir küpün bütün ayrıtları 2 katına çıkarılırsa hacmi kaç katına çıkar?", ["8", "2", "4", "6"], 0, "Yeni hacim = (2a) · (2a) · (2a) = 8 · a · a · a. Hacim 8 katına çıkar."],
        ["750 mL meyve suyu kaç cm³'tür?", ["750", "0,75", "7,5", "75 000"], 0, "1 mL = 1 cm³ olduğundan 750 mL = 750 cm³."]
      ]
    },
    {
      id: "u4", nm: "Veri Dağılımları", alt: "Kategorik ve nicel veri · grafikler · ortalama, ortanca, tepe değer, açıklık",
      ozet: [
        {b: "Veri türleri", m: [
          "**Kategorik veri:** sayıyla ölçülmeyen, gruplara ayrılan veridir (en sevilen meyve, göz rengi, ulaşım aracı).",
          "**Nicel veri:** sayıyla ifade edilen veridir. Sayılarak elde edilenler **kesikli** (kardeş sayısı), ölçülerek elde edilenler **sürekli** (boy, kütle, süre, sıcaklık) veridir.",
          "Kategorik veriler genelde **sütun grafiği** ya da **daire grafiği**, sürekli veriler gruplanarak **histogram** ile gösterilir."]},
        {b: "Histogram ve gruplama", m: [
          "Sürekli veri eşit genişlikte gruplara (aralıklara) ayrılır: 140-144, 145-149, …",
          "Histogramda sütunlar bitişik çizilir; çünkü aralıklar kesintisiz devam eder.",
          "Her sütunun yüksekliği o aralıktaki veri sayısını (frekansı) gösterir."]},
        {b: "Merkezi eğilim ve yayılım ölçüleri", m: [
          "**Aritmetik ortalama:** veriler toplamı ÷ veri sayısı.",
          "**Ortanca (medyan):** veriler sıralanınca ortadaki değer; veri sayısı çiftse ortadaki iki değerin ortalaması.",
          "**Tepe değer (mod):** en çok tekrar eden değer.",
          "**Açıklık:** en büyük değer − en küçük değer. Verilerin ne kadar yayıldığını gösterir.",
          "Uç değerler (diğerlerinden çok farklı değerler) en çok **ortalamayı** etkiler."],
          o: "**Örnek:** 3, 5, 7, 8, 12 → ortalama 7, ortanca 7, açıklık 12 − 3 = 9"},
        {b: "Veriye dayalı karar ve yanıltıcı grafikler", m: [
          "Karar verirken verinin nasıl toplandığına, kimden toplandığına ve yeterli olup olmadığına bak.",
          "Dikey ekseni 0'dan başlamayan grafikler küçük farkları büyük gösterebilir; bu yüzden yanıltıcı olabilir."]}
      ],
      ipucu: "Ortanca sorularında verileri sıralamayı unutma!",
      s: [
        ["Aşağıdakilerden hangisi **kategorik** bir veridir?", ["En sevilen meyve", "Boy uzunluğu", "Vücut kütlesi", "100 m koşu süresi"], 0, "Meyve türü sayıyla ölçülmez, gruplara ayrılır. Diğerleri ölçülerek elde edilen sürekli nicel verilerdir."],
        ["Aşağıdakilerden hangisi **sürekli** nicel veridir?", ["Öğrencilerin boy uzunlukları", "Öğrencilerin kardeş sayıları", "Öğrencilerin göz renkleri", "En sevilen spor dalı"], 0, "Boy ölçülerek elde edilir ve ara değerler alabilir (151,5 cm). Kardeş sayısı kesikli, diğer ikisi kategoriktir."],
        ["7, 9, 10, 6 ve 8 sayılarının aritmetik ortalaması kaçtır?", ["8", "9", "40", "7"], 0, "Toplam 40, veri sayısı 5. 40 ÷ 5 = 8."],
        ["3, 8, 5, 12, 7 veri grubunun ortancası kaçtır?", ["7", "5", "8", "12"], 0, "Sırala: 3, 5, 7, 8, 12. Ortadaki değer 7'dir."],
        ["4, 6, 4, 9, 6, 4, 2 veri grubunun tepe değeri kaçtır?", ["4", "6", "9", "5"], 0, "4 sayısı üç kez tekrar ediyor; en çok tekrar eden değer 4'tür."],
        ["12, 25, 18, 9, 30 veri grubunun açıklığı kaçtır?", ["21", "18", "30", "9"], 0, "En büyük 30, en küçük 9: 30 − 9 = 21."],
        ["Sürekli verileri eşit aralıklara gruplayarak gösteren, sütunları bitişik olan grafik hangisidir?", ["Histogram", "Daire grafiği", "Çizgi grafiği", "Resim grafiği"], 0, "Sürekli veriler gruplanır ve histogramla gösterilir; aralıklar kesintisiz olduğu için sütunlar bitişiktir."],
        ["Bir öğrencinin 4 sınavının ortalaması 75'tir. 5. sınavdan kaç alırsa ortalaması 78 olur?", ["90", "81", "78", "85"], 0, "Gereken toplam 5 · 78 = 390. Mevcut toplam 4 · 75 = 300. 390 − 300 = 90."],
        ["2, 4, 6, 8 veri grubunun ortancası kaçtır?", ["5", "4", "6", "20"], 0, "Veri sayısı çift; ortadaki iki değer 4 ve 6. (4 + 6) ÷ 2 = 5."],
        ["Bir veri grubuna diğerlerinden çok büyük bir değer (uç değer) eklenirse aşağıdakilerden en çok hangisi etkilenir?", ["Aritmetik ortalama", "Ortanca", "Tepe değer", "Veri türü"], 0, "Ortalama bütün değerlerin toplamıyla hesaplandığı için uç değerden en çok etkilenir."],
        ["Bir sınıftaki öğrencilerin boyları gruplanmıştır: 140-144 cm: 3 kişi, 145-149 cm: 7 kişi, 150-154 cm: 10 kişi, 155-159 cm: 5 kişi. Boyu 150 cm veya daha uzun olan kaç öğrenci vardır?", ["15", "10", "25", "5"], 0, "150-154 aralığında 10, 155-159 aralığında 5 öğrenci var: 10 + 5 = 15."],
        ["Dikey ekseni 0'dan değil 90'dan başlayan bir sütun grafiği hakkında hangisi doğrudur?", ["Küçük farkları olduğundan büyük gösterebilir.", "Verileri her zaman daha doğru gösterir.", "Ortalamayı değiştirir.", "Kategorik veriyi sürekli veriye çevirir."], 0, "Eksen 90'dan başlarsa 92 ile 96 arasındaki fark çok büyük görünür. Bu tür grafikler yanıltıcı olabilir."]
      ]
    },
    {
      id: "u5", nm: "Yansıma, Orta Dikme ve Açıortay", alt: "Yansıma dönüşümü · koordinat düzleminde yansıma · inşa",
      ozet: [
        {b: "Yansıma dönüşümü", m: [
          "Bir şeklin bir doğruya (yansıma doğrusu) göre ayna görüntüsüne **yansıma** denir.",
          "Şekil ile görüntüsü **eştir**: kenar uzunlukları ve açı ölçüleri değişmez, yalnızca yön ters döner.",
          "Her nokta ile görüntüsü yansıma doğrusuna **eşit uzaklıktadır** ve aralarındaki doğru parçası yansıma doğrusuna diktir."],
          o: "**Örnek:** Doğruya 4 birim uzaklıktaki noktanın görüntüsü de 4 birim uzaktadır; nokta ile görüntüsü arası 8 birimdir."},
        {b: "Koordinat düzleminde yansıma", m: [
          "**x eksenine göre** yansımada x aynı kalır, y'nin işareti değişir: (3, 2) → (3, −2).",
          "**y eksenine göre** yansımada y aynı kalır, x'in işareti değişir: (−4, 5) → (4, 5)."]},
        {b: "Orta dikme", m: [
          "Bir doğru parçasını **iki eş parçaya** ayıran ve ona **dik** (90°) olan doğruya orta dikme denir.",
          "Orta dikme üzerindeki her nokta, doğru parçasının iki ucuna **eşit uzaklıktadır**.",
          "**İnşa:** Pergeli uzunluğun yarısından fazla aç; iki uçtan da yaylar çiz; yayların kesiştiği iki noktayı cetvelle birleştir."]},
        {b: "Açıortay", m: [
          "Bir açıyı **iki eş açıya** bölen ışına açıortay denir: 70°'lik açının açıortayı onu 35° + 35° yapar.",
          "Açıortay üzerindeki her nokta açının **kollarına eşit uzaklıktadır**.",
          "**İnşa:** Köşeyi merkez alıp iki kolu kesen yay çiz; bu iki noktadan eşit yaylar çiz; kesişim noktasını köşeyle birleştir. Yalnızca **pergel ve cetvel** kullanılır."]}
      ],
      ipucu: "Yansımayı aynaya bakmak gibi düşün: sağ elini kaldırdığında aynadaki görüntün sol elini kaldırır.",
      s: [
        ["A(3, 2) noktasının x eksenine göre yansıması hangi noktadır?", ["(3, −2)", "(−3, 2)", "(−3, −2)", "(2, 3)"], 0, "x eksenine göre yansımada x aynı kalır, y'nin işareti değişir."],
        ["B(−4, 5) noktasının y eksenine göre yansıması hangi noktadır?", ["(4, 5)", "(−4, −5)", "(4, −5)", "(5, −4)"], 0, "y eksenine göre yansımada y aynı kalır, x'in işareti değişir."],
        ["Bir şeklin yansıma altındaki görüntüsü için hangisi doğrudur?", ["Kenar uzunlukları ve açı ölçüleri değişmez.", "Alanı iki katına çıkar.", "Bütün açıları 90° olur.", "Kenar uzunlukları yarıya iner."], 0, "Yansıma şekli bozmaz; şekil ile görüntüsü eştir, sadece yönü ters döner."],
        ["70°'lik bir açının açıortayı bu açıyı kaçar derecelik iki açıya ayırır?", ["35°", "70°", "140°", "20°"], 0, "Açıortay açıyı iki eş parçaya böler: 70 ÷ 2 = 35°."],
        ["10 cm uzunluğundaki bir doğru parçasının orta dikmesi bu doğru parçasını kaçar santimetrelik iki parçaya ayırır?", ["5", "10", "2,5", "20"], 0, "Orta dikme doğru parçasını iki eş parçaya böler: 10 ÷ 2 = 5 cm."],
        ["AB doğru parçasının orta dikmesi üzerindeki P noktası A noktasına 7 cm uzaklıktadır. P noktası B noktasına kaç cm uzaklıktadır?", ["7", "14", "3,5", "Bilinemez"], 0, "Orta dikme üzerindeki her nokta doğru parçasının iki ucuna eşit uzaklıktadır."],
        ["Bir açının açıortayı üzerindeki bir noktanın açının kollarına olan uzaklıkları için hangisi doğrudur?", ["Eşittir.", "Biri diğerinin iki katıdır.", "Her zaman 90 birimdir.", "Toplamları açının ölçüsüne eşittir."], 0, "Açıortay üzerindeki her nokta açının iki koluna eşit uzaklıktadır."],
        ["Bir doğru parçası ile orta dikmesi arasındaki açı kaç derecedir?", ["90°", "45°", "180°", "60°"], 0, "Orta dikme, adından da anlaşılacağı gibi doğru parçasına diktir (90°)."],
        ["Aşağıdaki büyük harflerden hangisinin dikey bir simetri doğrusu (yansıma doğrusu) vardır?", ["A", "F", "R", "G"], 0, "A harfinin ortasından geçen dikey doğru onu iki eş parçaya ayırır; F, R ve G harflerinde böyle bir doğru yoktur."],
        ["(2, 3) noktası önce y eksenine, sonra elde edilen nokta x eksenine göre yansıtılıyor. Son nokta hangisidir?", ["(−2, −3)", "(2, −3)", "(−2, 3)", "(3, 2)"], 0, "y eksenine göre: (−2, 3). Sonra x eksenine göre: (−2, −3)."],
        ["Orta dikme ve açıortay inşası yalnızca hangi araçlarla yapılır?", ["Pergel ve cetvel", "İletki ve gönye", "Hesap makinesi", "Yalnızca iletki"], 0, "İnşa (çizim) sadece pergel ve işaretsiz cetvelle yapılır; ölçü almak gerekmez."],
        ["Bir nokta yansıma doğrusuna 4 birim uzaklıktadır. Bu nokta ile yansıma görüntüsü arasındaki uzaklık kaç birimdir?", ["8", "4", "2", "16"], 0, "Görüntü de doğruya 4 birim uzaklıktadır ve doğrunun öbür tarafındadır: 4 + 4 = 8 birim."]
      ]
    }
  ]
});
