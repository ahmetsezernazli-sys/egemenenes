// 7. sınıf Türkçe · 1. dönem (TYMM 2026-2027: Hayat Boyu Gelişim, Bir Hilal Uğruna, İletişim ve Sosyal İlişkiler temaları)
// Program beceri temellidir: söz varlığı, söz sanatları, düşünceyi geliştirme yolları ve metin yapıları, derin anlam ve çıkarım, ikna, özetleme, yazım ve noktalama.
// Okuma parçaları bu site için yazılmıştır. "metin§soru" biçiminde parça ayrı kutuda gösterilir.
window.DERS = window.DERS || [];
window.DERS.push({
  id: "tur", nm: "Türkçe", ikon: "📖", renk: "#C0392B", deneme: 20, dk: 1.5,
  uniteler: [
    {
      id: "u1", nm: "Söz Varlığı ve Sözcükte Anlam", alt: "Bağlamdan anlam tahmini · gerçek, mecaz, terim anlam · eş ve zıt anlam · deyimler",
      ozet: [
        {b: "Bağlamdan anlam tahmini", m: [
          "Anlamını bilmediğin bir kelimeyle karşılaşınca **cümlenin ve paragrafın geri kalanından** ipucu topla.",
          "Kelimenin yerine tahmin ettiğin anlamı koyup cümleyi yeniden oku; anlam bozulmuyorsa tahminin büyük ihtimalle doğrudur."],
          o: "**Örnek:** \"Yağmurdan sonra bahçe **ferahladı**, her yer temiz kokuyordu.\" → ferahlamak: rahatlamak, açılmak, tazelenmek."},
        {b: "Gerçek, mecaz ve terim anlam", m: [
          "**Gerçek anlam:** kelimenin akla gelen ilk anlamı (\"Bıçak **keskin**di.\").",
          "**Mecaz anlam:** gerçek anlamından uzaklaşan anlam (\"**Keskin** bir zekâsı var.\").",
          "**Terim anlam:** bir bilim, sanat ya da meslek alanına özgü anlam (matematikte \"**açı**\", müzikte \"**nota**\")."]},
        {b: "Anlam ilişkileri", m: [
          "**Eş anlamlı:** yazılışı farklı, anlamı aynı kelimeler (cevap – yanıt, okul – mektep).",
          "**Zıt anlamlı:** anlamca karşıt kelimeler (cesur – korkak, eski – yeni).",
          "**Eş sesli (sesteş):** yazılışı aynı, anlamı farklı kelimeler (yüz: sayı / surat / yüzmek)."]},
        {b: "Deyimler ve atasözleri", m: [
          "**Deyim:** genellikle mecaz anlamlı, kalıplaşmış söz grubudur; bir durumu anlatır, öğüt vermez (\"göz atmak\", \"etekleri zil çalmak\").",
          "**Atasözü:** uzun deneyimlerle oluşmuş, öğüt ya da genel bir yargı bildiren kalıp sözdür (\"Damlaya damlaya göl olur.\")."]}
      ],
      ipucu: "Deyimler bir durumu anlatır, atasözleri ise ders verir. 'Ne demek istiyor?' sorusunu sor.",
      s: [
        ["\"Kar yağışından sonra köy yolları **kapandı**, ekipler sabaha kadar çalıştı.\" cümlesindeki altı çizili kelimenin anlamı hangisidir?", ["Geçilemez hâle gelmek", "Örtülmek, kapak takılmak", "Bir işi bitirmek", "Uykuya dalmak"], 0, "Bağlamdaki ipuçları (kar, ekipler çalıştı) yolların geçilemez hâle geldiğini gösterir."],
        ["Aşağıdaki cümlelerin hangisinde altı çizili kelime **mecaz** anlamda kullanılmıştır?", ["Bu konuda **soğuk** davrandı.", "**Soğuk** suyla elini yıkadı.", "Kışın hava çok **soğuk** olur.", "Buzdolabındaki süt **soğuk**tu."], 0, "\"Soğuk davranmak\" ilgisiz, mesafeli olmak anlamındadır; diğerlerinde sıcaklıkla ilgili gerçek anlam vardır."],
        ["Aşağıdaki kelimelerden hangisi bir **terim**dir?", ["Mıknatıs (fen bilimleri)", "Sevinç", "Kapı", "Güzel"], 0, "Mıknatıs fen bilimleri alanına ait bir terimdir; diğerleri günlük dilde kullanılan kelimelerdir."],
        ["Aşağıdakilerin hangisinde **eş anlamlı** kelimeler bir arada verilmiştir?", ["cevap – yanıt", "uzun – kısa", "yüz (sayı) – yüz (surat)", "kalem – defter"], 0, "Cevap ve yanıt aynı anlama gelir. Uzun–kısa zıt anlamlı, yüz–yüz eş seslidir."],
        ["\"Cesur\" kelimesinin **zıt** anlamlısı hangisidir?", ["Korkak", "Yiğit", "Kahraman", "Atılgan"], 0, "Cesurun karşıtı korkaktır. Yiğit, kahraman ve atılgan cesur ile yakın anlamlıdır."],
        ["Aşağıdakilerden hangisi bir **atasözü**dür?", ["Damlaya damlaya göl olur.", "Göz atmak", "Etekleri zil çalmak", "Burnu havada olmak"], 0, "Atasözü bir öğüt/genel yargı bildirir ve cümle hâlindedir. Diğerleri birer deyimdir."],
        ["\"**Etekleri zil çalmak**\" deyimi hangi anlamda kullanılır?", ["Çok sevinmek", "Çok korkmak", "Çok yorulmak", "Çok kızmak"], 0, "Bu deyim, sevincinden yerinde duramamak anlamındadır."],
        ["Kemal Bey bir haftadır **içi içine sığmıyordu**; torunu tatile geliyordu.§Bu cümlede altı çizili deyimle anlatılmak istenen nedir?", ["Sabırsızlıkla ve sevinçle beklemek", "Çok üzülmek", "Hastalanmak", "Sinirlenmek"], 0, "Torununun gelecek olması sevinç ve heyecan yaratıyor; deyim heyecanla sabırsızlanmayı anlatır."],
        ["\"Yaz tatilinde **atıl** kalmamak için her gün bir saat kitap okudu, yüzmeye gitti.\" cümlesinde \"atıl\" kelimesinin anlamı hangisidir?", ["Hareketsiz, işe yaramaz", "Hızlı, çevik", "Mutlu, neşeli", "Yalnız, kimsesiz"], 0, "Her gün kitap okumak ve yüzmek \"atıl kalmamak\" için yapılıyor; atıl: hareketsiz, çalışmayan demektir."],
        ["Aşağıdaki cümlelerin hangisinde \"**yüz**\" kelimesi farklı bir anlamda kullanılmıştır?", ["Denizde saatlerce **yüz**dük.", "Sınıfta **yüz** kitap var.", "Bu çiftlikte **yüz** koyun var.", "Kumbarada **yüz** lira birikti."], 0, "İlk cümlede \"yüzmek\" eylemi var; diğerlerinde \"yüz\" bir sayıdır. Bu kelimeler eş seslidir."],
        ["\"Bu haberi duyunca **küplere bindi**.\" cümlesindeki deyim hangi duyguyu anlatır?", ["Öfke", "Sevinç", "Korku", "Utanç"], 0, "Küplere binmek, çok öfkelenmek anlamındadır."],
        ["\"Onun **tatlı** dili herkesi yumuşatırdı.\" cümlesindeki \"tatlı\" kelimesinin anlamı hangisidir?", ["Hoşa giden, kibar", "Şekerli", "Ilık", "Hızlı"], 0, "Burada tatlı kelimesi mecaz anlamda \"hoşa giden, gönül alıcı\" demektir."]
      ]
    },
    {
      id: "u2", nm: "Söz Sanatları", alt: "Benzetme · kişileştirme · konuşturma · abartma · karşıtlık",
      ozet: [
        {b: "Benzetme (teşbih)", m: [
          "Bir varlığı, bir özellik bakımından daha güçlü bir varlığa benzetmektir.",
          "Genellikle **gibi, kadar, sanki, -ce** gibi sözcüklerle yapılır."],
          o: "**Örnek:** \"Kardeşimin yanakları **elma gibi** kırmızıydı.\""},
        {b: "Kişileştirme (teşhis)", m: [
          "İnsan dışındaki varlıklara **insana ait özellikler** vermektir (gülmek, ağlamak, düşünmek, kızmak…)."],
          o: "**Örnek:** \"Rüzgâr pencerenin önünde **ağlıyordu**.\""},
        {b: "Konuşturma (intak)", m: [
          "İnsan dışındaki varlıkları **konuşturmaktır**. Konuşturmada kişileştirme de vardır.",
          "Masallarda ve fabllarda sık görülür."],
          o: "**Örnek:** \"Yaşlı çınar, çocuklara '**Gölgemde dinlenin**.' dedi.\""},
        {b: "Abartma (mübalağa)", m: [
          "Bir durumu ya da özelliği **olduğundan çok büyük veya küçük** göstermektir."],
          o: "**Örnek:** \"O kadar çok güldük ki **gözyaşlarımız sel oldu**.\""},
        {b: "Karşıtlık (tezat)", m: [
          "Zıt anlamlı kelimeleri ya da kavramları bir arada kullanarak anlatımı güçlendirmektir."],
          o: "**Örnek:** \"**Gülerken ağladı**, sevinci de hüznü de aynı anda yaşadı.\""}
      ],
      ipucu: "Önce 'kim/ne' bir insan özelliği taşıyor mu bak (kişileştirme), sonra konuşuyor mu bak (konuşturma).",
      s: [
        ["\"Kardeşimin yanakları elma gibi kırmızıydı.\" cümlesinde hangi söz sanatı vardır?", ["Benzetme", "Kişileştirme", "Konuşturma", "Abartma"], 0, "Yanaklar kırmızılık yönünden elmaya benzetilmiş, \"gibi\" kullanılmış."],
        ["\"Rüzgâr bütün gece pencerenin önünde ağladı.\" cümlesinde hangi söz sanatı vardır?", ["Kişileştirme", "Benzetme", "Abartma", "Karşıtlık"], 0, "Ağlamak insana özgüdür; rüzgâra insan özelliği verilmiştir."],
        ["\"Yaşlı çınar, çocuklara 'Gölgemde dinlenin.' dedi.\" cümlesinde hangi söz sanatı vardır?", ["Konuşturma", "Benzetme", "Abartma", "Karşıtlık"], 0, "Çınar ağacı konuşturulmuştur. Konuşturmada kişileştirme de bulunur."],
        ["\"O kadar acıkmıştım ki bir fili bile yiyebilirdim.\" cümlesinde hangi söz sanatı vardır?", ["Abartma", "Konuşturma", "Benzetme", "Karşıtlık"], 0, "Açlık olduğundan çok büyük gösterilmiş; bu abartmadır."],
        ["Aşağıdaki cümlelerin hangisinde **kişileştirme** yapılmıştır?", ["Güneş bize gülümsüyordu.", "Deniz ayna gibi dümdüzdü.", "Okul yolu çok uzundu.", "Ağaçlar yeşillenmişti."], 0, "Gülümsemek insana özgüdür; güneşe insan özelliği verilmiştir. İkinci cümlede benzetme vardır."],
        ["Aşağıdaki cümlelerin hangisinde **benzetme** yapılmıştır?", ["Annemin sesi bir ninni kadar yumuşaktı.", "Kuşlar şarkı söylüyordu.", "Bin kere söyledim, dinlemedin.", "Hem güldü hem ağladı."], 0, "Ses, yumuşaklık bakımından ninniye benzetilmiş ve \"kadar\" kullanılmış."],
        ["\"Bin kere söyledim, yine de dinlemedin!\" cümlesindeki söz sanatı hangisidir?", ["Abartma", "Benzetme", "Kişileştirme", "Konuşturma"], 0, "\"Bin kere\" söylemek gerçek değildir; durum büyütülerek anlatılmıştır."],
        ["\"Sevinçten ağlarken bir yandan gülüyordu.\" cümlesinde ağlamak ile gülmenin bir arada kullanılması hangi söz sanatıdır?", ["Karşıtlık", "Benzetme", "Konuşturma", "Kişileştirme"], 0, "Zıt kavramlar (ağlamak–gülmek) bir arada kullanılarak anlatım güçlendirilmiştir."],
        ["Masal ve fabllarda hayvanların ve eşyaların konuşması hangi söz sanatına örnektir?", ["Konuşturma", "Abartma", "Benzetme", "Karşıtlık"], 0, "İnsan dışındaki varlıkların konuşturulmasına konuşturma (intak) denir."],
        ["Sınıfımız sabah çok sessizdi. Pencereden giren güneş, sıraların üstünde neşeyle dans ediyordu. Öğretmenimiz kapıdan girince bu sessizlik bir anda bozuldu.§Bu metinde hangi söz sanatına başvurulmuştur?", ["Kişileştirme", "Konuşturma", "Abartma", "Benzetme"], 0, "Güneşin \"neşeyle dans etmesi\" insana özgü bir davranıştır; güneş kişileştirilmiştir."],
        ["\"Kalbim kuş gibi çırpınıyordu.\" cümlesinde kalp neye, hangi yönden benzetilmiştir?", ["Kuşa, hızlı ve heyecanlı çarpması yönünden", "Kuşa, renk yönünden", "Kuşa, uçması yönünden", "Kuşa, küçüklüğü yönünden"], 0, "Heyecanla hızlı çarpan kalp, çırpınan bir kuşa benzetilmiştir."],
        ["Aşağıdaki cümlelerin hangisinde söz sanatı **yoktur**?", ["Kütüphaneden üç kitap aldım.", "Dağlar başını göğe kaldırmıştı.", "Gözleri yıldız gibi parlıyordu.", "Dünya kadar ödevim var."], 0, "Birinci cümlede kelimeler gerçek anlamında kullanılmıştır. Diğerlerinde sırasıyla kişileştirme, benzetme ve abartma vardır."]
      ]
    },
    {
      id: "u3", nm: "Düşünceyi Geliştirme Yolları ve Metin Yapıları", alt: "Tanımlama · örneklendirme · karşılaştırma · tanık gösterme · sayısal veriler · metin yapıları",
      ozet: [
        {b: "Düşünceyi geliştirme yolları", m: [
          "**Tanımlama:** bir kavramın ne olduğunu açıklamak (\"… denir\", \"… -dır\").",
          "**Örneklendirme:** düşünceyi somutlaştırmak için örnek vermek (\"örneğin\", \"mesela\").",
          "**Karşılaştırma:** iki ya da daha çok varlığın benzer ve farklı yönlerini ortaya koymak (\"-den daha\", \"oysa\", \"ise\").",
          "**Tanık gösterme:** düşünceyi güçlendirmek için tanınmış birinin sözünü aktarmak.",
          "**Sayısal verilerden yararlanma:** yüzde, oran, istatistik gibi sayılarla düşünceyi desteklemek.",
          "**Benzetme:** anlatılanı daha iyi kavratmak için bir şeyi başka bir şeye benzetmek."]},
        {b: "Bilgilendirici metin yapıları", m: [
          "**Tanımlama-betimleme:** bir varlığın özelliklerini sıralar.",
          "**Sıralama (zaman sırası):** olayları ya da adımları sırayla verir (önce, sonra, en son).",
          "**Karşılaştırma-karşıtlık:** benzerlik ve farklılıkları anlatır.",
          "**Sebep-sonuç:** bir olayın nedenini ve sonucunu açıklar (çünkü, bu yüzden, -dığı için).",
          "**Problem-çözüm:** bir sorunu ve önerilen çözümleri anlatır."]},
        {b: "Metnin bölümleri", m: [
          "Bilgilendirici metinlerde: **giriş – gelişme – sonuç**.",
          "Hikâye edici metinlerde: **serim** (kişiler, yer, zaman tanıtılır) – **düğüm** (olay/sorun gelişir) – **çözüm** (sorun çözülür, merak giderilir)."]}
      ],
      ipucu: "Metinde 'örneğin' görürsen örneklendirme, bir uzmanın sözü tırnak içinde verilmişse tanık gösterme vardır.",
      s: [
        ["\"Fotosentez, bitkilerin güneş ışığını kullanarak kendi besinlerini üretmesine denir.\" cümlesinde hangi düşünceyi geliştirme yoluna başvurulmuştur?", ["Tanımlama", "Örneklendirme", "Karşılaştırma", "Tanık gösterme"], 0, "Bir kavramın (fotosentez) ne olduğu açıklanmıştır."],
        ["Bisiklet, hem sağlığımıza hem de çevreye iyi gelir. Türkiye'de yapılan bir araştırmaya göre, şehir içinde 5 kilometreden kısa yolculukların yüzde 40'ı otomobille yapılıyor. Bu yolculukların bir kısmı bisikletle yapılsa hava kirliliği belirgin şekilde azalır.§Bu paragrafta hangi düşünceyi geliştirme yolu kullanılmıştır?", ["Sayısal verilerden yararlanma", "Tanımlama", "Tanık gösterme", "Benzetme"], 0, "\"Yüzde 40\" gibi istatistiksel bir bilgiyle düşünce desteklenmiştir."],
        ["Kitap okumak insanın hayal dünyasını genişletir. Ünlü bir yazarın dediği gibi: \"Bir kitap, cebinizde taşıdığınız bir bahçedir.\"§Bu paragrafta hangi düşünceyi geliştirme yolu kullanılmıştır?", ["Tanık gösterme", "Sayısal verilerden yararlanma", "Karşılaştırma", "Tanımlama"], 0, "Düşünceyi güçlendirmek için tanınmış birinin sözü aktarılmıştır."],
        ["Kedi ile köpek ev hayvanı olarak çok sevilir. Ancak kediler daha bağımsızdır ve yalnız kalmaya alışıktır; köpekler ise sahibiyle sürekli ilgi ve oyun ister.§Bu metinde hangi düşünceyi geliştirme yolu kullanılmıştır?", ["Karşılaştırma", "Tanık gösterme", "Sayısal verilerden yararlanma", "Tanımlama"], 0, "Kedi ve köpeğin farklı yönleri (\"ise\", \"daha\") ortaya konmuştur."],
        ["Geri dönüşüm için evde yapabileceğimiz pek çok şey var. Örneğin plastik şişeleri, kâğıtları ve camları ayrı kutularda toplayabiliriz.§Bu metinde hangi düşünceyi geliştirme yolu kullanılmıştır?", ["Örneklendirme", "Karşılaştırma", "Tanık gösterme", "Tanımlama"], 0, "\"Örneğin\" ifadesiyle düşünce somut örneklerle açıklanmıştır."],
        ["Önce kağıdı ortadan ikiye katlayın. Sonra köşeleri ortaya doğru kıvırın. En son kanatları açarak uçağınızı tamamlayın.§Bu metin hangi metin yapısıyla oluşturulmuştur?", ["Sıralama", "Problem-çözüm", "Karşılaştırma-karşıtlık", "Sebep-sonuç"], 0, "\"Önce, sonra, en son\" ifadeleri adımların sırayla verildiğini gösterir."],
        ["Şehrimizdeki parklar her hafta sonu çöplerle doluyor. Bu sorunun önüne geçmek için parklara daha fazla çöp kutusu konmalı, ziyaretçilere bilgilendirme yapılmalıdır.§Bu metin hangi metin yapısına örnektir?", ["Problem-çözüm", "Sıralama", "Tanımlama-betimleme", "Karşılaştırma-karşıtlık"], 0, "Önce bir sorun (çöpler) anlatılmış, ardından çözüm önerileri sunulmuştur."],
        ["Gece geç saatlere kadar telefona baktığı için sabah uyanamadı ve okul servisini kaçırdı.§Bu cümle hangi metin yapısına uygundur?", ["Sebep-sonuç", "Sıralama", "Problem-çözüm", "Tanımlama-betimleme"], 0, "Geç yatmak (sebep), servisi kaçırmak (sonuç) ile ilişkilendirilmiştir."],
        ["Hikâye edici metinlerde kişilerin, yerin ve zamanın tanıtıldığı bölüme ne ad verilir?", ["Serim", "Düğüm", "Çözüm", "Sonuç"], 0, "Serim hikâyenin giriş bölümüdür; kişiler, yer ve zaman tanıtılır."],
        ["Hikâyede olayların geliştiği ve merakın en yükseğe çıktığı bölüm hangisidir?", ["Düğüm", "Serim", "Çözüm", "Giriş"], 0, "Düğüm bölümünde sorun ya da çatışma gelişir, okurun merakı artar."],
        ["\"Gökkuşağı, yağmurdan sonra güneş ışığının su damlalarında kırılmasıyla oluşan renkli bir yaydır.\" cümlesiyle ilgili hangisi doğrudur?", ["Tanımlama yapılmıştır.", "Tanık gösterilmiştir.", "Sayısal veri kullanılmıştır.", "Karşılaştırma yapılmıştır."], 0, "Gökkuşağının ne olduğu açıklandığı için tanımlama yapılmıştır."],
        ["İnsan beyni bir bilgisayar gibidir; bilgileri alır, saklar ve gerektiğinde kullanır.§Bu cümlede hangi düşünceyi geliştirme yoluna başvurulmuştur?", ["Benzetme", "Sayısal verilerden yararlanma", "Tanık gösterme", "Örneklendirme"], 0, "Beyin, çalışma şekli yönünden bilgisayara benzetilerek anlatılmıştır."]
      ]
    },
    {
      id: "u4", nm: "Metinde Anlam: Ana Fikir, Çıkarım ve Özet", alt: "Konu · ana fikir · başlık · anahtar kelime · yüzey ve derin anlam · ikna · özetleme",
      ozet: [
        {b: "Konu, ana fikir, başlık", m: [
          "**Konu:** metnin neyi anlattığıdır (\"Ne anlatılıyor?\").",
          "**Ana fikir:** yazarın okura vermek istediği temel mesajdır (\"Yazar ne demek istiyor?\"). Genellikle giriş ya da sonuç cümlesindedir.",
          "**Yardımcı fikirler** ana fikri destekleyen ayrıntılardır.",
          "**Başlık:** metnin içeriğini kısa ve dikkat çekici biçimde yansıtmalıdır."]},
        {b: "Yüzey anlam ve derin anlam", m: [
          "**Yüzey anlam:** metinde açıkça yazılan bilgilerdir.",
          "**Derin anlam (çıkarım):** metinde doğrudan söylenmeyen ama ipuçlarından anlaşılan anlamdır. \"Metinden hangisi çıkarılabilir?\" sorularında metinde **kanıtı olan** seçeneği seç; metinde olmayan ya da çok genelleştirilmiş yargılardan kaçın."]},
        {b: "Anahtar kelimeler ve özetleme", m: [
          "**Anahtar kelimeler** metnin içeriğini en iyi yansıtan, sık tekrar eden önemli kelimelerdir.",
          "**Özetleme:** önemli bilgileri seç, ayrıntıları ve örnekleri çıkar, kendi cümlelerinle kısaca yaz. Özet metnin anlamını değiştirmemelidir."]},
        {b: "İkna etme teknikleri", m: [
          "**Kanıt ve sayısal veri sunma**, **uzman görüşü** ya da tanınmış kişinin sözü, **örnek verme**,",
          "**Duygulara seslenme** (\"Siz de çocuğunuzun mutlu olmasını istemez misiniz?\"), **çoğunluğa uyma** (\"Herkes bunu kullanıyor!\").",
          "Reklamları ve medya içeriklerini değerlendirirken hangi tekniğin kullanıldığını ve bilginin güvenilir olup olmadığını sorgula."]}
      ],
      ipucu: "'Metne göre' diye başlayan sorularda yalnızca metinde yazanlara güven; kendi bilgini katma.",
      s: [
        ["Kitap okumak sadece bilgi edinmek değildir; aynı zamanda başka hayatlara konuk olmaktır. Bir romanı okurken kahramanla birlikte sevinir, onunla birlikte üzülürüz. Böylece başkalarının duygularını anlamayı öğreniriz.§Bu paragrafın ana fikri nedir?", ["Kitap okumak, başkalarının duygularını anlamamızı sağlar.", "Romanlar her zaman mutlu biter.", "Kitaplar pahalıdır.", "Bilgi edinmenin tek yolu romanlardır."], 0, "Yazar, okumanın kahramanlarla duygu paylaşmayı ve başkalarını anlamayı öğrettiğini vurguluyor."],
        ["Arılar olmasaydı sofralarımız bu kadar zengin olmazdı. Çünkü arılar çiçekten çiçeğe konarak bitkilerin tozlaşmasını sağlar. Tozlaşma olmadan pek çok meyve ve sebze yetişmez. Bu yüzden arıların yaşadığı alanları korumak hepimizin görevidir.§Bu paragrafın konusu nedir?", ["Arıların tozlaşmadaki önemi", "Bal üretiminin aşamaları", "Meyvelerin vitamin değerleri", "Çiçeklerin renkleri"], 0, "Paragraf, arıların tozlaşma sayesinde meyve ve sebzelerin yetişmesindeki rolünü anlatıyor."],
        ["Arılar olmasaydı sofralarımız bu kadar zengin olmazdı. Çünkü arılar çiçekten çiçeğe konarak bitkilerin tozlaşmasını sağlar. Tozlaşma olmadan pek çok meyve ve sebze yetişmez. Bu yüzden arıların yaşadığı alanları korumak hepimizin görevidir.§Bu paragrafa en uygun başlık hangisidir?", ["Sofralarımızın Sessiz Kahramanları: Arılar", "Balın Faydaları", "Bahçede Çiçek Yetiştirme", "Böcekler Neden Korkutucudur?"], 0, "Başlık, metnin içeriğini (arıların besin üretimindeki kahramanlığı) yansıtmalıdır."],
        ["Elif, sınavdan önceki gece erkenden yattı. Sabah kahvaltısını yaptı, kalemlerini kontrol etti ve okula her zamankinden on dakika önce vardı. Sınav kâğıdını aldığında yüzünde sakin bir gülümseme vardı.§Bu metinden hangisi çıkarılabilir?", ["Elif sınava hazırlıklı ve rahat gitmiştir.", "Elif sınavdan en yüksek notu almıştır.", "Elif'in en sevdiği ders matematiktir.", "Elif sınava geç kalmıştır."], 0, "Erken yatması, erken gelmesi ve sakin gülümsemesi hazırlıklı ve rahat olduğunu gösterir. Notu ya da dersi metinde yazmaz."],
        ["Kuzey Kutbu'ndaki buzullar her yıl biraz daha eriyor. Bilim insanları bunun en önemli nedeninin insan kaynaklı iklim değişikliği olduğunu söylüyor. Buzulların erimesi deniz seviyesini yükseltiyor ve kutup ayılarının yaşam alanlarını daraltıyor.§Bu metne göre hangisi **söylenemez**?", ["Buzulların erimesinin hiçbir olumsuz etkisi yoktur.", "Buzullar her yıl erimektedir.", "Erime deniz seviyesini yükseltmektedir.", "Kutup ayılarının yaşam alanı daralmaktadır."], 0, "Metinde erimenin olumsuz etkileri (deniz seviyesi, kutup ayıları) anlatılıyor; \"hiçbir olumsuz etkisi yoktur\" yargısı metne terstir."],
        ["Kuzey Kutbu'ndaki buzullar her yıl biraz daha eriyor. Bilim insanları bunun en önemli nedeninin insan kaynaklı iklim değişikliği olduğunu söylüyor. Buzulların erimesi deniz seviyesini yükseltiyor ve kutup ayılarının yaşam alanlarını daraltıyor.§Bu metnin anahtar kelimeleri hangileridir?", ["buzul, erime, iklim değişikliği", "kutup, yıl, insan", "ayı, alan, bilim", "deniz, en, her"], 0, "Anahtar kelimeler metnin içeriğini en iyi yansıtan kelimelerdir: buzul, erime ve iklim değişikliği."],
        ["\"Türkiye'nin bir numaralı diş macunu! Diş hekimlerinin %90'ı bu macunu öneriyor.\" reklamında hangi ikna etme tekniğine başvurulmuştur?", ["Uzman görüşü ve sayısal veri", "Duygulara seslenme", "Mizah", "Karşılaştırma yapmadan soru sorma"], 0, "Diş hekimleri (uzmanlar) ve %90 (sayısal veri) inandırıcılığı artırmak için kullanılmıştır."],
        ["\"Sınıftaki herkes bu ayakkabıdan aldı, sen de geri kalma!\" ifadesinde hangi ikna tekniği kullanılmıştır?", ["Çoğunluğa uyma", "Uzman görüşü", "Sayısal veri", "Tanımlama"], 0, "\"Herkes aldı\" diyerek kişiyi çoğunluğa uymaya yönlendirmek bir ikna tekniğidir."],
        ["Özet yazarken aşağıdakilerden hangisine dikkat edilmelidir?", ["Önemli bilgiler seçilip kısa ve kendi cümlelerimizle yazılmalıdır.", "Metindeki bütün örnekler aynen yazılmalıdır.", "Metne yeni bilgiler eklenmelidir.", "Metin baştan sona kopyalanmalıdır."], 0, "Özet önemli bilgileri kısa ve öz biçimde, metnin anlamını değiştirmeden verir."],
        ["Mahallemizdeki kütüphane yıllardır kapalıydı. Gönüllü gençler bir araya geldi; rafları onardı, kitap bağışı topladı ve haftada üç gün açık tutmaya başladı. Artık çocuklar okuldan sonra burada ödev yapıp kitap okuyor.§Bu metinden hangisi çıkarılabilir?", ["Gönüllü çalışmalar topluma fayda sağlayabilir.", "Kütüphane her gün açıktır.", "Mahallede okul yoktur.", "Gençler kütüphaneden para kazanmaktadır."], 0, "Gençlerin gönüllü çalışmasıyla kütüphane yeniden açılmış ve çocuklara fayda sağlamıştır. Kütüphane haftada üç gün açıktır."],
        ["Metinde açıkça yazılmayan, ipuçlarından yola çıkarak ulaşılan anlama ne ad verilir?", ["Derin anlam (çıkarım)", "Yüzey anlam", "Gerçek anlam", "Terim anlam"], 0, "Doğrudan yazılmayan ama ipuçlarından anlaşılan anlama derin anlam denir."],
        ["Spor yapmak sadece bedenimizi değil zihnimizi de güçlendirir. Düzenli egzersiz yapan öğrencilerin derslerine daha iyi odaklandığı biliniyor. Üstelik takım sporları arkadaşlık ilişkilerini de geliştirir.§Bu paragrafta aşağıdakilerden hangisine değinilmemiştir?", ["Sporun sakatlık riskine", "Sporun odaklanmaya katkısına", "Sporun arkadaşlığa katkısına", "Sporun bedeni güçlendirmesine"], 0, "Paragrafta sakatlık riskinden söz edilmez; diğerleri metinde vardır."]
      ]
    },
    {
      id: "u5", nm: "Yazım Kuralları ve Noktalama", alt: "Büyük harf · de/da · ki · mi · sayılar · kesme işareti · noktalama",
      ozet: [
        {b: "Büyük harflerin kullanımı", m: [
          "Cümleler büyük harfle başlar.",
          "Kişi, ülke, şehir, kurum, gün ve ay adı **belirli bir tarih bildiriyorsa** büyük başlar: 29 Ekim 1923. Tarih bildirmiyorsa küçük: \"Ekim ayında yağmur yağar.\"",
          "Yer adlarında tür bildiren kelime de büyük yazılır: Van Gölü, Ağrı Dağı, Karadeniz."]},
        {b: "de/da, ki ve mi", m: [
          "Bağlaç olan **de/da** ayrı yazılır, çıkarılınca anlam bozulmaz: \"Ben **de** geleceğim.\"",
          "Hâl eki olan **-de/-da** bitişik yazılır, \"nerede?\" sorusuna cevap verir: \"Okul**da** bekliyorum.\"",
          "Bağlaç olan **ki** ayrı yazılır: \"Duydum **ki** unutmamışsın.\" Sıfat yapan **-ki** bitişik: \"evdeki\", \"yarınki\".",
          "Soru eki **mi** ayrı yazılır ve kendinden önceki kelimeye uyar: \"Geldin **mi**?\", \"Okulda **mı**?\""]},
        {b: "Sayıların ve kısaltmaların yazımı", m: [
          "Sayılar ayrı yazılır: on beş, yüz yirmi üç.",
          "Sıra sayıları rakamla yazılırsa nokta ya da kesme işaretiyle: 7. sınıf, 7'nci sınıf.",
          "Kısaltmalara gelen ekler kesme işaretiyle ve kısaltmanın okunuşuna göre yazılır: TBMM'ye, MEB'in."]},
        {b: "Noktalama işaretleri", m: [
          "**Nokta (.)** cümle sonunda, kısaltmalarda (Dr.), sıra sayılarında.",
          "**Virgül (,)** eş görevli kelimeleri ayırmak, sıralı cümleleri ayırmak, hitaplardan sonra için.",
          "**İki nokta (:)** açıklama ya da örnek verilecek cümleden sonra, konuşma çizgisinden önce.",
          "**Soru işareti (?)** soru cümlesinin sonunda; **ünlem (!)** coşku, korku, şaşırma bildiren cümlelerin sonunda.",
          "**Tırnak (\"\")** başkasının sözünü aynen aktarırken; **kesme (')** özel adlara gelen ekleri ayırırken: Ankara'ya, Ayşe'nin."]}
      ],
      ipucu: "de/da'yı ayırmak için çıkarıp oku: Anlam bozulmuyorsa bağlaçtır, ayrı yazılır.",
      s: [
        ["Aşağıdaki cümlelerin hangisinde \"de\" bağlacı doğru yazılmıştır?", ["Kardeşim de bizimle gelecek.", "Kardeşimde bizimle gelecek.", "Okul de bekliyorum.", "Evde de, bahçede de oynadık de."], 0, "Bağlaç olan \"de\" ayrı yazılır ve çıkarılınca anlam bozulmaz: \"Kardeşim bizimle gelecek.\""],
        ["Aşağıdaki cümlelerin hangisinde yazım yanlışı **vardır**?", ["Sende mi bu kitabı okudun?", "Kitabı sen de okudun mu?", "Kitap sende mi?", "Okulda kaldım."], 0, "\"Sen de mi\" olmalıydı; burada \"de\" bağlaçtır ve ayrı yazılmalıdır. \"Kitap sende mi?\" cümlesinde ise -de hâl ekidir."],
        ["Aşağıdaki cümlelerin hangisinde \"ki\" yanlış yazılmıştır?", ["Duydumki sınavı kazanmışsın.", "Duydum ki sınavı kazanmışsın.", "Masadaki kitabı al.", "Yarınki gezi iptal oldu."], 0, "Bağlaç olan \"ki\" ayrı yazılır: \"Duydum ki\". \"Masadaki\" ve \"yarınki\" kelimelerindeki -ki ise ektir ve bitişik yazılır."],
        ["Aşağıdaki cümlelerin hangisinde soru eki doğru yazılmıştır?", ["Ödevini bitirdin mi?", "Ödevini bitirdinmi?", "Ödevini bitirdin mu?", "Ödevini bitirdin-mi?"], 0, "Soru eki \"mi\" ayrı yazılır ve önceki kelimenin ünlüsüne uyar: bitirdin mi?"],
        ["Aşağıdaki cümlelerin hangisinde büyük harflerin kullanımıyla ilgili bir yanlışlık **vardır**?", ["Okullar Eylül ayında açılır.", "Cumhuriyet 29 Ekim 1923'te ilan edildi.", "Van Gölü Türkiye'nin en büyük gölüdür.", "Atatürk 1881'de Selanik'te doğdu."], 0, "Ay adları belirli bir tarih bildirmiyorsa küçük harfle başlar: \"eylül ayında\"."],
        ["Aşağıdakilerin hangisinde kesme işareti doğru kullanılmıştır?", ["Ankara'ya gittik.", "Okul'a geç kaldım.", "Kitap'ı okudum.", "Ev'de kaldık."], 0, "Kesme işareti özel adlara gelen ekleri ayırmak için kullanılır. Okul, kitap ve ev özel ad değildir."],
        ["\"Pazardan elma ( ) armut ( ) üzüm aldık.\" cümlesinde ayraçlarla belirtilen yerlere hangi noktalama işareti gelmelidir?", ["Virgül", "Nokta", "İki nokta", "Ünlem"], 0, "Eş görevli kelimeleri ayırmak için virgül kullanılır: elma, armut, üzüm."],
        ["\"Çantama şunları koydum ( ) kalem, defter, silgi.\" cümlesinde ayraçla belirtilen yere hangi işaret gelmelidir?", ["İki nokta", "Virgül", "Soru işareti", "Kesme işareti"], 0, "Açıklama ya da örnek verilecek cümleden sonra iki nokta konur."],
        ["Aşağıdaki cümlelerin hangisinin sonuna **ünlem işareti** konmalıdır?", ["Eyvah, otobüsü kaçırdık", "Yarın okula gidecek misin", "Bugün hava güneşli", "Kitabı masaya bıraktım"], 0, "Korku, şaşırma, coşku bildiren cümlelerin sonuna ünlem konur. \"Eyvah\" bir telaş bildirir."],
        ["Başkasının sözünü olduğu gibi aktarırken hangi noktalama işareti kullanılır?", ["Tırnak işareti", "Kesme işareti", "Noktalı virgül", "Kısa çizgi"], 0, "Aktarılan söz tırnak içine alınır: Atatürk \"Yurtta sulh, cihanda sulh.\" demiştir."],
        ["Aşağıdakilerden hangisinde sayının yazımı **yanlıştır**?", ["onbeş", "on beş", "yüz yirmi", "7. sınıf"], 0, "Sayılar ayrı yazılır: on beş."],
        ["\"TBMM\" kısaltmasına \"-e\" yönelme eki getirildiğinde doğru yazım hangisidir?", ["TBMM'ye", "TBMM'e", "TBMMye", "TBMM-ye"], 0, "Kısaltmanın okunuşu \"te be me me\" olduğundan ek okunuşa göre \"-ye\" olur ve kesmeyle ayrılır."]
      ]
    }
  ]
});
