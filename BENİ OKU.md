# Egemen ve Enes'in Oyunları

Site adresi: **www.egemenenes.com** (15.09.2026'da kontrol edildi: kayıtlı değildi, alınabilir durumdaydı)

Tarayıcıda çalışan oyunlar. Hepsi düz HTML, CSS ve JavaScript. Derleme, sunucu ya da kurulum gerekmez.

## Klasör yapısı

```
Oyunlar/
├── index.html          ← ana sayfa (oyun listesi)
├── BENİ OKU.md
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
└── gokdelen/           ← Gökdelen, ikisi birlikte kule yapma (takım ya da yarış)
    ├── index.html
    ├── style.css
    └── game.js
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
3. Ana `index.html` içinde "Sıradaki oyun yakında" kutusunun hemen üstüne Tavşan Kanı kartını kopyalayıp adını, açıklamasını ve bağlantısını değiştirin.

## Tavşan Kanı ayarları

`tavsan-kani/game.js` dosyasının başında:
- `CUSTOMERS`: müşteri adları, sözleri, siparişleri ve sabır süreleri (saniye)
- `TYPES`: açık / tavşan kanı / koyu için hedef dem oranı ve tarif
- `TOL`: dem ölçerdeki hedef aralığın genişliği (büyütmek oyunu kolaylaştırır)
