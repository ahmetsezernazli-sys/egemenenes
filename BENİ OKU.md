# Egemen ve Enes'in Oyunları

Site adresi: **https://egemenenes.com** (GitHub Pages: github.com/ahmetsezernazli-sys/egemenenes, alan adı ve DNS Netlify'da)

Tarayıcıda çalışan oyunlar. Hepsi düz HTML, CSS ve JavaScript. Derleme, sunucu ya da kurulum gerekmez.

## Klasör yapısı

```
Oyunlar/
├── index.html          ← ana sayfa (oyun listesi)
├── BENİ OKU.md
├── ders/               ← Enes'in Çalışma Köşesi (7. sınıf 1. dönem; oyun değil, sayaca girmez)
│   ├── index.html      ← konu özeti · alıştırma · deneme sınavı · yanlışlarım (#/ yolları)
│   ├── style.css
│   ├── app.js          ← uygulama; ilerleme localStorage "ders-calisma"
│   └── data/           ← matematik, fen, turkce, sosyal, ingilizce, din .js
│                         (soru: ["soru", ["doğru", "yanlış"…], 0, "açıklama"]; doğru cevap hep 0. sırada yazılır, uygulama karıştırır)
├── tavsan-kani/        ← her oyun kendi klasöründe (Tavşan Kanı)
│   ├── index.html
│   ├── style.css
│   └── game.js
├── balon-bahcesi/      ← Balon Bahçesi, Egemen için (5 yaş)
│   ├── index.html
│   ├── style.css
│   └── game.js
├── yildiz-devriyesi/   ← Yıldız Devriyesi, Enes için (12 yaş)
│   ├── index.html
│   ├── style.css
│   └── game.js
├── ciftini-bul/        ← Çiftini Bul, ikisi birlikte (2 kişilik hafıza oyunu)
│   ├── index.html
│   ├── style.css
│   └── game.js
├── hava-hokeyi/        ← Hava Hokeyi, ikisi birlikte ya da bilgisayara karşı
│   ├── index.html
│   ├── style.css
│   └── game.js
├── kutu-ustasi/        ← Kutu Ustası, Enes için zekâ oyunu (30 bölüm)
│   ├── index.html
│   ├── style.css
│   ├── levels.js       ← bölüm haritaları ve doğrulanmış çözümleri
│   └── game.js
├── hayvan-treni/       ← Hayvan Treni, Egemen için sayma oyunu (5 yaş)
│   ├── index.html
│   ├── style.css
│   └── game.js
├── bilgi-kupasi/       ← Bilgi Kupası, tüm aile için bilgi yarışması
│   ├── index.html
│   ├── style.css
│   ├── questions.js    ← sorular (yeni soru eklemek için bu dosyayı düzenleyin)
│   └── game.js
├── renkli-ksilofon/    ← Renkli Ksilofon: serbest çal, şarkı öğren, hafıza
│   ├── index.html
│   ├── style.css
│   └── game.js
├── boyama-defteri/     ← Boyama Defteri, Egemen için dokunarak boyama
│   ├── index.html
│   ├── style.css
│   ├── pictures.js     ← boyama resimleri (SVG)
│   └── game.js
├── cati-kosusu/        ← Çatı Koşusu, Enes için sonsuz koşu oyunu
│   ├── index.html
│   ├── style.css
│   └── game.js
├── dort-tas/           ← Dört Taş, iki kişi ya da bilgisayara karşı
│   ├── index.html
│   ├── style.css
│   └── game.js
├── cabuk-bas/          ← Çabuk Bas!, 2-4 kişilik aile hız oyunu
│   ├── index.html
│   ├── style.css
│   └── game.js
├── harf-bahcesi/       ← Harf Bahçesi, Egemen için alfabe öğrenme
│   ├── index.html
│   ├── style.css
│   └── game.js
├── blok-yagmuru/       ← Blok Yağmuru, Enes için düşen bloklar
│   ├── index.html
│   ├── style.css
│   └── game.js
├── ciz-bakalim/        ← Çiz Bakalım!, aile çizim ve pandomim tahmin oyunu
│   ├── index.html
│   ├── style.css
│   └── game.js
├── balik-tutma/        ← Balık Tutma, iki kişilik yarış ya da takım oyunu
│   ├── index.html
│   ├── style.css
│   └── game.js
├── yapboz/             ← Yapboz, Egemen için resimli yapboz
│   ├── index.html
│   ├── style.css
│   └── game.js
├── mars-ussu/          ← Mars Üssü, Enes için kule savunması (30 dalga)
│   ├── index.html
│   ├── style.css
│   └── game.js
├── yilan-merdiven/     ← Yılan Merdiven, 2-4 kişilik aile kutu oyunu
│   ├── index.html
│   ├── style.css
│   └── game.js
├── renk-kazani/        ← Renk Kazanı, Egemen için renk karıştırma
│   ├── index.html
│   ├── style.css
│   └── game.js
├── golf-adasi/         ← Golf Adası, Enes için 9 delikli mini golf (1-4 oyuncu)
│   ├── index.html
│   ├── style.css
│   └── game.js         ← delikler dosyanın başındaki HOLES listesinde
├── gokdelen/           ← Gökdelen, ikisi birlikte kule yapma (takım ya da yarış)
│   ├── index.html
│   ├── style.css
│   └── game.js
├── kizma-birader/      ← Kızma Birader, 2-4 kişilik aile kutu oyunu
│   ├── index.html
│   ├── style.css
│   └── game.js
├── oto-yikama/         ← Oto Yıkama, Egemen için dokunarak araç yıkama
│   ├── index.html
│   ├── style.css
│   └── game.js
├── tilki-macerasi/     ← Tilki Macerası, Enes için 8 bölümlük platform oyunu
│   ├── index.html
│   ├── style.css
│   ├── levels.js       ← bölüm haritaları (harf açıklamaları dosyanın başında)
│   └── game.js
├── ag-kahramani/       ← Ağ Kahramanı, Egemen için süper kahraman oyunu
│   ├── index.html
│   ├── style.css
│   └── game.js
├── dort-islem/         ← Dört İşlem, Enes için hız turu ve hedef sayı
│   ├── index.html
│   ├── style.css
│   └── game.js
├── penalti/            ← Penaltı Atışları, ikisi birlikte ya da bilgisayara karşı
│   ├── index.html
│   ├── style.css
│   └── game.js
├── kart-karnavali/     ← Kart Karnavalı, 2-4 kişilik aile kart oyunu
│   ├── index.html
│   ├── style.css
│   └── game.js
├── tombala/            ← Tombala, 2-6 kişilik aile tombalası
│   ├── index.html
│   ├── style.css
│   └── game.js
├── mancinik/           ← Mancınık Düellosu, ikisi birlikte ya da bilgisayara karşı
│   ├── index.html
│   ├── style.css
│   └── game.js
├── ne-degisti/         ← Ne Değişti?, 1-6 kişilik dikkat oyunu
│   ├── index.html
│   ├── style.css
│   └── game.js
├── kurabiye/           ← Kurabiye Dükkânı, Egemen için mutfak oyunu
│   ├── index.html
│   ├── style.css
│   └── game.js
├── mayin-tarlasi/      ← Mayın Tarlası, Enes için, tahmin gerektirmeyen tahtalar
│   ├── index.html
│   ├── style.css
│   └── game.js
├── el-ele/             ← El Ele Labirent, ikisi birlikte tek topu süren işbirliği oyunu
│   ├── index.html
│   ├── style.css
│   └── game.js
├── domino/             ← Domino, 2-4 kişilik klasik domino
│   ├── index.html
│   ├── style.css
│   └── game.js
├── roket/              ← Roket Atölyesi, Egemen için roket yapıp gezegene uçma
│   ├── index.html
│   ├── style.css
│   └── game.js
├── pist/               ← Pist Rekoru, Enes için tur rekoru ve hayalet araba
│   ├── index.html
│   ├── style.css
│   └── game.js
├── amiral-batti/       ← Amiral Battı, ikisi birlikte ya da bilgisayara karşı
│   ├── index.html
│   ├── style.css
│   └── game.js
├── hayvan-korosu/      ← Hayvan Korosu, tüm aile için sırayla şarkı hafıza oyunu
│   ├── index.html
│   ├── style.css
│   └── game.js
├── sekil-kutusu/       ← Şekil Kutusu, Egemen için şekilleri deliğe yerleştirme
│   ├── index.html
│   ├── style.css
│   └── game.js
├── tugla-kirici/       ← Tuğla Kırıcı, Enes için 8 bölümlük arcade, skor rekoru
│   ├── index.html
│   ├── style.css
│   └── game.js
├── isik-duvari/        ← Işık Duvarı, ikisi birlikte ışık motosikleti düellosu
│   ├── index.html
│   ├── style.css
│   └── game.js
├── bowling/            ← Bowling, tüm aile için 10 çerçevelik sıralı oyun
│   ├── index.html
│   ├── style.css
│   └── game.js
├── sebze-bahcesi/      ← Sebze Bahçesi, Egemen için ek-sula-büyüt-topla
│   ├── index.html
│   ├── style.css
│   └── game.js
├── sudoku/             ← Sudoku, Enes için 4 seviye, süre rekoru
│   ├── index.html
│   ├── style.css
│   └── game.js
├── ucurtma-yarisi/     ← Uçurtma Yarışı, ikisi birlikte gün batımı yarışı
│   ├── index.html
│   ├── style.css
│   └── game.js
├── pisti/              ← Pişti, tüm aile için klasik kart oyunu
│   ├── index.html
│   ├── style.css
│   └── game.js
├── kardan-adam/        ← Kardan Adam, Egemen için yuvarla-koy-süsle
│   ├── index.html
│   ├── style.css
│   └── game.js
├── su-yolu/            ← Su Yolu, Enes için boru çevirme bulmacası
│   ├── index.html
│   ├── style.css
│   └── game.js
├── mangala/            ← Mangala, ikisi birlikte ya da bilgisayara karşı
│   ├── index.html
│   ├── style.css
│   └── game.js
├── bes-zar/            ← Beş Zar, tüm aile için 13 elli zar oyunu
│   ├── index.html
│   ├── style.css
│   └── game.js
├── hayvan-doktoru/     ← Hayvan Doktoru, Egemen için alet seçip iyileştirme
│   ├── index.html
│   ├── style.css
│   └── game.js
├── birlestir/          ← 2048, Enes için kaydır-birleştir, skor rekoru
│   ├── index.html
│   ├── style.css
│   └── game.js
├── dama/               ← Dama, ikisi birlikte ya da bilgisayara karşı
│   ├── index.html
│   ├── style.css
│   └── game.js
├── bal-avi/            ← Bal Avı, tüm aile için şans oyunu (çek ya da dur)
│   ├── index.html
│   ├── style.css
│   └── game.js         ← kovanın içeriği dosyanın başındaki BAG listesinde
├── itfaiye/            ← İtfaiye, Egemen için yangın söndürme ve hayvan kurtarma
│   ├── index.html
│   ├── style.css
│   └── game.js         ← binalar dosyanın başındaki BUILDINGS listesinde
├── resim-bulmaca/      ← Resim Bulmaca, Enes için nonogram (5×5, 10×10, 15×15, rastgele)
│   ├── index.html
│   ├── style.css
│   └── game.js         ← resimler dosyanın başındaki PICS listesinde; yeni resim
│                         tahminsiz çözülebilmeli (solveGrid ile kontrol edin)
├── kare-kapmaca/       ← Kare Kapmaca, ikisi birlikte ya da bilgisayara karşı (noktalar ve kutular)
│   ├── index.html
│   ├── style.css
│   └── game.js
├── hizli-goz/          ← Hızlı Göz, tüm aile için ortak resim bulma yarışı (1-4 oyuncu)
│   ├── index.html
│   ├── style.css
│   └── game.js         ← resimler ve sesli adları dosyanın başındaki SYMBOLS listesinde (57 tane)
├── akvaryum/           ← Akvaryum, Egemen için renkli yemle balık besleme, yumurta ve yavrular
│   ├── index.html
│   ├── style.css
│   └── game.js         ← balıklar tarayıcıda saklanır (en çok 10 balık)
├── satranc/            ← Satranç, Enes için bilgisayara karşı (3 seviye) ya da iki kişi
│   ├── index.html
│   ├── style.css
│   └── game.js         ← üstte satranç motoru (hamle üretici perft ile doğrulandı), altta arayüz
├── sumo/               ← Sumo Topları, ikisi birlikte ya da bilgisayara karşı ring itişmesi
│   ├── index.html
│   ├── style.css
│   └── game.js         ← fizik ayarları ve top boyları dosyanın başında
├── dart/               ← Dart, tüm aile için puan avı ya da 301 (1-6 oyuncu)
│   ├── index.html
│   ├── style.css
│   └── game.js         ← halka genişlikleri RING, nişan hızları SPEED, titreme WOBBLE
├── saklambac/          ← Saklambaç, Egemen için saklanan hayvanları bulma (oda ve bahçe)
│   ├── index.html
│   ├── style.css
│   └── game.js         ← saklanma yerleri dosyanın başındaki SCENES listesinde
├── robo-labirent/      ← Robo Labirent, Enes için labirent kovalamacası (skor rekoru)
│   ├── index.html
│   ├── style.css
│   └── game.js         ← labirentler HALVES listesinde (sol yarı yazılır, sağ yarı aynalanır)
├── bilardo/            ← Bilardo, ikisi birlikte ya da bilgisayara karşı (çek-bırak, nişan çizgisi)
│   ├── index.html
│   ├── style.css
│   └── game.js         ← masa ölçüleri, sürtünme ve vuruş gücü dosyanın başında
├── hasat/              ← Hasat Zamanı, tüm aile birlikte karga gelmeden meyve toplar (1-6 oyuncu)
│   ├── index.html
│   ├── style.css
│   └── game.js         ← karga yolu uzunlukları STEPS (simülasyonla dengelendi)
├── ne-giysem/          ← Ne Giysem?, Egemen için hava durumuna göre giyinme
│   ├── index.html
│   ├── style.css
│   └── game.js         ← havalar WEATHERS, kıyafetler ve açıklamaları ITEMS listesinde
├── mucevher-madeni/    ← Mücevher Madeni, Enes için üçlü eşleştirme (20 bölüm, yıldız rekoru)
│   ├── index.html
│   ├── style.css
│   └── game.js         ← bölümler LEVELS listesinde (harita: "." kare, "#" delik, "1"/"2" buz;
│                         hedef: score / collect / ice); hamle sayıları otomatik oyuncuyla dengelendi
├── kafa-topu/          ← Kafa Topu, ikisi birlikte yandan futbol (bilgisayara karşı da; süper güç)
│   ├── index.html
│   ├── style.css
│   └── game.js         ← saha ölçüleri dosyanın başında (GOAL_H kale yüksekliği), şut gücü physics() içinde,
│                         bilgisayar seviyeleri aiInput()/setAi() içinde
├── kim-bu/             ← Kim Bu?, tüm aile tahmin oyunu (1-6 oyuncu, bilgisayar rakip, sesli)
│   ├── index.html
│   ├── style.css
│   └── game.js         ← sorular QUESTIONS, isimler NAMES; yüzler her turda makeFaces() ile rastgele üretilir
│                         (24 farklı kişi, her soru en az 3 kişiyi ayırır), yüz çizimi drawFace()
├── boncuk-dizisi/      ← Boncuk Dizisi, Egemen için örüntü (desen) oyunu + serbest kolye modu
│   ├── index.html
│   ├── style.css
│   └── game.js         ← seviyeler GENS listesinde (10 seviye, her biri 3 kolye; sonra karışık),
│                         renk adları COLORS, şekiller SHAPES, hayvanlar ANIMALS
├── korsan-pinball/     ← Korsan Pinball, Enes için pinball (3 top, çarpan, çoklu top, rekor)
│   ├── index.html
│   ├── style.css
│   └── game.js         ← masa duvarları wall(...) çağrılarıyla tanımlı; tamponlar BUMPERS, hedefler TARGETS,
│                         sandık CHEST, paletler FL; yerçekimi GRAV, top kurtarma süresi launch() içinde
├── kivilcim-damla/     ← Kıvılcım ve Damla, ikisi birlikte işbirliği platform oyunu (5 bölüm, kolay mod)
│   ├── index.html
│   ├── style.css
│   └── game.js         ← bölümler LEVELS listesinde, 30×17 karo haritalar: # duvar, L lav, W su, G balçık,
│                         r/b elmas, R/B kapı, 1/2 başlangıç, X Y Z K M geçit; plates/levers hangi harfin
│                         hangi geçidi açtığını söyler. Her satır tam 30 karakter olmalı.
├── tavla/              ← Tavla, tüm aile (bilgisayara karşı Kolay/Usta ya da iki kişi; mars; 1/3/5 sayılık maç)
│   ├── index.html
│   ├── style.css
│   └── game.js         ← kural motoru: target() tek adım, sequences() bütün yasal diziler (iki zarı kullanma ve
│                         büyük zar kuralı), bilgisayar evaluate()/aiChoose(); Kolay seviye rastgelelik payı aiChoose içinde
├── nokta-nokta/        ← Nokta Nokta, Egemen için noktaları birleştirme (10'a ve 20'ye kadar, çıkartma albümü)
│   ├── index.html
│   ├── style.css
│   └── game.js         ← resimler PICS listesinde: 0–100 koordinatlı dış çizgi noktaları, renk ve deco() süsleri;
│                         20 modunda subdivide() ara nokta ekler (noktalar arası en az 9 birim)
├── ritim-ustasi/       ← Ritim Ustası, Enes için 4 şeritli ritim oyunu (5 telifsiz eser, 3 zorluk, rekor)
│   ├── index.html
│   ├── style.css
│   └── game.js         ← şarkılar SONGS listesinde "nota:vuruş" dizisi olarak (R = sus, accel = hızlanma);
│                         zorluk DIFFS (grid/gap seyreltir, lead düşüş süresi); zamanlama WIN içinde
├── su-balonu/          ← Su Balonu Savaşı, ikisi birlikte arena (bomberman benzeri; bilgisayar rakip, kalkan)
│   ├── index.html
│   ├── style.css
│   └── game.js         ← arena 13×11 (newRound: sandık oranı 0.72, güçlendirici 0.32), FUSE balon süresi,
│                         bilgisayar aiDir(): tehlike haritası dangerMap() + bfs() ile kaçış/hedef seçimi
├── okey/               ← Okey, tüm aile (1-4 oyuncu, boş koltuğa bilgisayar; ıstakada sürükleyerek dizme)
│   ├── index.html
│   ├── style.css
│   └── game.js         ← cover(): seri/per arama (okey jokeri, 12-13-1 serisi), isWin() + isPairsWin() (çifte),
│                         bilgisayar evaluate()/bestDiscard(); gösterge deal() içinde seçilir
├── kim-nerede/         ← Kim Nerede?, Egemen için sınıflandırma (hayvanlar evine, eşyalar yerine; 2→5 yer)
│   ├── index.html
│   ├── style.css
│   └── game.js         ← MODES: yerler (ad, -de/-e hâlleri, arka plan) ve öğeler [emoji, ad, yer];
│                         seviyeler LEVELS (kaç yer açık), tur başına PER_ROUND öğe
├── klavye-ninjasi/     ← Klavye Ninjası, Enes için on parmak klavye (ninja modu + 6 ders, Türkçe Q)
│   ├── index.html
│   ├── style.css
│   └── game.js         ← kelimeler WORDS, cümleler SENTENCES, dersler LESSONS, klavye ROWS ve parmak eşlemesi FINGER;
│                         ninja zorluğu pickWord() ve ninjaUpdate() içinde (seviye başına hız ve kelime uzunluğu)
├── boya-kapmaca/       ← Boya Kapmaca, ikisi birlikte bölge boyama (60 sn raund, bilgisayar rakip, büyük fırça)
│   ├── index.html
│   ├── style.css
│   └── game.js         ← alan 24×14, engeller BLOCKS, raund süresi ROUND; güçlendiriciler update() içinde,
│                         bilgisayar aiDir() (BFS ile en değerli boyanmamış kareye gider)
├── turkiye-turu/       ← Türkiye Turu, tüm aile emlak oyunu (2-6 oyuncu, kira, otel, şans kartları, bilgisayar rakip)
│   ├── index.html
│   ├── style.css
│   └── game.js         ← tahta S (20 kare, fiyatlar), şans kartları CARDS, START_MONEY ve PASS;
│                         kira rentOf(), bilgisayar kararları aiWantsBuy() ve offerHotel() içinde, Türkçe ekler ek()
├── ordek-yolu/         ← Ördek Yolu, Egemen için trafik ve karşıdan karşıya geçme (6 bölüm, ışıklı ve ışıksız yollar)
│   ├── index.html
│   ├── style.css
│   └── game.js         ← bölümler LEVELS (şeritler alttan üste [yön, hız], "m" = refüj, araç aralığı gap), araçlar SPEC;
│                         ışık döngüsü lightTick(), güvenli mi laneSafe() / canGo(), çarpma hitCheck()
├── zindan-kasifi/      ← Zindan Kaşifi, Enes için sıra tabanlı zindan macerası (8 kat, rastgele harita, Kolay/Normal)
│   ├── index.html
│   ├── style.css
│   └── game.js         ← canavarlar MONSTERS (kat aralığı, can, saldırı, savunma, deneyim), eşyalar ITEMS (ağırlık);
│                         harita genFloor(), görüş computeFov(), canavar hamlesi monstersAct(), seviye eşiği needXp()
├── tank-duellosu/      ← Tank Düellosu, ikisi birlikte tank savaşı (seken mermiler, güçlendirici, bilgisayar rakip)
│   ├── index.html
│   ├── style.css
│   └── game.js         ← haritalar MAPS (sol yarı blokları, simetriği buildGrid() ekler), güçlendiriciler POWERS; hız SPEED, mermi BSPEED/BOUNCES;
│                         bilgisayar think() (BFS yol, mermiden kaçma, shotHits() sekme denemesi); yardım: 5 can + mermi kıvrılması update() içinde
├── harf-avi/           ← Harf Avı, tüm aile kelime oyunu (2-6 oyuncu, 8 kategori, bilgisayar rakip, harf yardımı)
│   ├── index.html
│   ├── style.css
│   └── game.js         ← kelimeler CATS içinde (k = kolay, z = zor), alfabe ABC; puan guess() içinde (harf başına 10, son harf +30);
│                         bilgisayar cpuPick() (kalıba uyan kelimelerdeki en sık harf), yardım startTurn() (2 doğru + 2 yanlış harf parlar)
├── minik-market/       ← Minik Market, Egemen için market oyunu (sayarak ürün toplama, bozuk para sayma, 6 bölüm)
│   ├── index.html
│   ├── style.css
│   └── game.js         ← ürünler GOODS (resim, ad, fiyat), müşteriler ANIMALS, bölümler LEVELS (raf, çeşit, en çok adet, ödeme ve toplam);
│                         sipariş makeOrder(), seçim pick(), para sayma startPay() / answerPay() / countAloud()
├── ay-inisi/           ← Ay'a İniş, Enes için uzay aracı iniş oyunu (10 bölüm, yerçekimi, rüzgâr, yakıt, dengeleyici yardım)
│   ├── index.html
│   ├── style.css
│   └── game.js         ← bölümler LEVELS (yerçekimi g, yakıt, rüzgâr, pist genişlikleri, arazi pürüzü), güvenli iniş SAFE_VY/SAFE_VX/SAFE_ANG;
│                         arazi genTerrain() (orta nokta kaydırma + düz pistler), fizik update(), iniş/kaza kararı land()
├── reversi/            ← Reversi, ikisi birlikte taş çevirme oyunu (bilgisayar rakip Kolay/Zor, en iyi hamle yardımı)
│   ├── index.html
│   ├── style.css
│   └── game.js         ← kurallar flipsFor() / moves() / apply(), kare ağırlıkları WEIGHT;
│                         bilgisayar: Kolay easyMove(), Zor bestMove() (alfa-beta minimax, derinlik 4); yardım render() içinde derinlik 2
├── dans-et-dur/        ← Dans Et, Dur!, tüm aile hareketli parti oyunu (müzik durunca don, eleme modu)
│   ├── index.html
│   ├── style.css
│   └── game.js         ← hareket kartları MOVES, hız SPEEDS (dans süresi aralığı, donma süresi), şarkılar SONGS (tempo, kök, akor dizisi, gam);
│                         müzik schedule() (davul, bas, akor, rastgele ezgi makeMelody()), akış dance() / freeze() / judge() / cont()
├── ari-viz/            ← Arı Vız, Egemen için yol çizme oyunu (çiçek topla, kovana dön, ağlardan kaçın; 10 bölüm)
│   ├── index.html
│   ├── style.css
│   └── game.js         ← bölümler LEVELS (çiçek, ağ sayısı, ipucu), yerleşim placeLevel() (ipucu yolu ağlara değmez), uçuş hızı SPEED;
│                         çizim pointer olayları, uçuş ve çiçek/ağ kontrolü update(), sonuç arrive()
├── solitaire/          ← Solitaire, Enes için Klondike sabır oyunu (1 ya da 3 kart çekme, geri al, ipucu, rekor)
│   ├── index.html
│   ├── style.css
│   └── game.js         ← kurallar canTab() / canFound() / legal(), hamle doMove() ve drawStock(); dokununca hedef autoTarget(), ipucu findHint();
│                         yerleşim layout() / offsets() (uzun sütunlar sıkıştırılır), sürükle-bırak pointer olayları, otomatik bitirme autoFinish()
└── halat-cekme/        ← Halat Çekme, ikisi birlikte soru çözme / hızlı basma yarışı (oyuncu başına seviye, bilgisayar rakip)
    ├── index.html
    ├── style.css
    └── game.js         ← sorular makeQ(seviye) (0 sayma, 1 toplama, 2 çarpım, 3 karışık), çekme adımı STEP_Q / STEP_TAP, yanlışta donma FREEZE;
                          akış newRound() / answer() / tap() / endRound(), bilgisayar update() içinde, dikey ekranda üst taraf 180° döner (style.css)
```

## Bilgisayarda oynamak

`index.html` dosyasına çift tıklayın. Tarayıcıda açılır. Yazı tipleri için internet gerekir, internet yoksa oyun yine çalışır ama yedek yazı tipleriyle görünür.

## Web sitesine koymak

`Oyunlar` klasörünün tamamını olduğu gibi yükleyin. Tüm bağlantılar göreli (`tavsan-kani/index.html`, `../index.html`) olduğu için site kökünde de, bir alt klasörde de (ör. `siteniz.com/oyunlar/`) değişiklik yapmadan çalışır.

Ücretsiz ve kolay seçenekler:
- **Netlify Drop** (app.netlify.com/drop): klasörü sürükleyip bırakın, bir adres verir.
- **GitHub Pages**: klasörü bir depoya yükleyin, Settings → Pages'ten açın.
- **Azure Static Web Apps**: şirket Microsoft altyapısını kullanıyorsa uygun seçenek.

## Yeni oyun eklemek

1. `Oyunlar` içinde yeni bir klasör açın (ör. `yeni-oyun/`), içine en az bir `index.html` koyun.
2. Oyunun başına ana sayfaya dönüş bağlantısı ekleyin: `<a href="../index.html">← Tüm oyunlar</a>`
3. Ana `index.html` dört gruba ayrılmıştır (Egemen, Enes, İkisi birlikte, Tüm aile). Yeni kartı ilgili grubun `<!-- …:yeni oyun buraya, en üste -->` işaretinin hemen altına koyun; "Yeni" etiketini son eklenen oyuna taşıyın ve grup sayılarını güncelleyin.

## Tavşan Kanı ayarları

`tavsan-kani/game.js` dosyasının başında:
- `CUSTOMERS`: müşteri adları, sözleri, siparişleri ve sabır süreleri (saniye)
- `TYPES`: açık / tavşan kanı / koyu için hedef dem oranı ve tarif
- `TOL`: dem ölçerdeki hedef aralığın genişliği (büyütmek oyunu kolaylaştırır)
