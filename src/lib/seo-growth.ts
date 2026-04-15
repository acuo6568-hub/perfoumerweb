import type { Perfume } from "@/types/catalog";

export type ClusterFaq = {
  question: string;
  answer: string;
};

export type ClusterDefinition = {
  key: "men" | "women" | "unisex" | "oud" | "gift" | "long-lasting" | "summer" | "winter";
  href: string;
  eyebrow: string;
  title: string;
  metaTitle: string;
  description: string;
  intro: string;
  bullets: string[];
  faq: ClusterFaq[];
  keywords: string[];
};

export type ArticleEntry = {
  slug: string;
  title: string;
  description: string;
  intent: string;
  category: "guide" | "campaign" | "comparison";
  publishedAt: string;
  relatedClusterHrefs: string[];
  sections: Array<{
    heading: string;
    content: string;
  }>;
  faq: ClusterFaq[];
};

const CLUSTER_CATALOG: ClusterDefinition[] = [
  {
    key: "men",
    href: "/kisi-etirleri",
    eyebrow: "Core Cluster",
    title: "Kişi ətirləri",
    metaTitle: "Kişi ətirləri - Orijinal və premium seçimlər",
    description: "Gündəlik, ofis və axşam istifadəsi üçün kişi ətirləri. Uzunömürlü və balanslı notlarla seçilmiş kolleksiya.",
    intro: "Kişi ətirləri səhifəsi gündəlik istifadə, iş mühiti və xüsusi görüşlər üçün fərqli xarakterdə qoxuları bir yerdə toplamaq üçün hazırlanıb.",
    bullets: [
      "Ofis, gündəlik və axşam istifadə ssenarilərinə görə seçmə.",
      "Sitrus, odunsu, ədviyyatlı və aromatik profil balansı.",
      "Qiymət və nota görə daha dəqiq seçim üçün daxili keçidlər.",
    ],
    keywords: ["kişi ətirləri", "kişi parfum", "ofis üçün kişi ətri", "uzunömürlü kişi ətri"],
    faq: [
      {
        question: "Kişi ətri seçərkən ilk olaraq nəyə baxmalıyam?",
        answer: "İstifadə vaxtına baxın: gündüz üçün daha təmiz və sitrus profil, axşam üçün daha dərin odunsu və ədviyyatlı profillər daha uyğun olur.",
      },
      {
        question: "Qalıcılığı artırmaq üçün nə etmək lazımdır?",
        answer: "Nəbz nöqtələrinə tətbiq edin, qoxunu sürtməyin və eyni not ailəsində duş geli və bədən kremi ilə qatlayın.",
      },
    ],
  },
  {
    key: "women",
    href: "/qadin-etirleri",
    eyebrow: "Core Cluster",
    title: "Qadın ətirləri",
    metaTitle: "Qadın ətirləri - Çiçəkli, meyvəli və zərif seçimlər",
    description: "Qadınlar üçün gündəlik və gecə istifadə ssenarilərinə uyğun premium ətir seçimi. Çiçəkli, meyvəli və pudralı profillər.",
    intro: "Qadın ətirləri kolleksiyası not xarakterinə, mövsümə və istifadə məqsədinə görə daha sürətli seçim etməyə kömək edir.",
    bullets: [
      "Çiçəkli, meyvəli, pudralı və gourmand istiqamətlər.",
      "Yaz-yay və payız-qış üçün ayrıca yönləndirmə.",
      "Hədiyyə və xüsusi gün üçün uyğun seçim kartları.",
    ],
    keywords: ["qadın ətirləri", "qadın parfum", "çiçəkli qadın ətri", "gündəlik qadın ətri"],
    faq: [
      {
        question: "Qadın ətri üçün universal seçim hansıdır?",
        answer: "Təmiz çiçəkli-sitrus istiqamət daha çox istifadə mühitinə uyğun gəlir və gündəlik istifadə üçün risksiz seçim sayılır.",
      },
      {
        question: "Şirin qoxular hər mövsüm uyğun olurmu?",
        answer: "Yayda daha yüngül, qışda isə daha zəngin şirin notlar daha balanslı hiss olunur.",
      },
    ],
  },
  {
    key: "unisex",
    href: "/uniseks-etirler",
    eyebrow: "Core Cluster",
    title: "Uniseks ətirlər",
    metaTitle: "Uniseks ətirlər - Hamıya uyğun balanslı qoxular",
    description: "Gender sərhədi olmadan seçilən uniseks ətirlər. Təmiz, odunsu, yaşıl və minimalist notlara üstünlük verənlər üçün.",
    intro: "Uniseks ətirlər fərdi üsluba fokuslanan, daha neytral və çevik qoxu profilləri axtaran istifadəçilər üçün uyğundur.",
    bullets: [
      "Neytral profil: ofis, gündəlik və səfər üçün rahat uyğunlaşma.",
      "Ağır şirinlikdən uzaq, təmiz və balanslı kompozisiyalar.",
      "Cütlük üçün ortaq istifadəyə uyğun alternativlər.",
    ],
    keywords: ["uniseks ətirlər", "unisex parfum", "neytral qoxu", "minimalist ətir"],
    faq: [
      {
        question: "Uniseks ətiri kişi və qadın eyni rahatlıqla istifadə edə bilər?",
        answer: "Bəli. Uniseks kompozisiyalar məhz bu çeviklik üçün dizayn edilir və istifadəçiyə fərdi dəri reaksiyasına görə fərqli açılır.",
      },
      {
        question: "Uniseks qoxular daha zəif olur?",
        answer: "Mütləq deyil. Qalıcılıq not bazasına və konsentrasiyaya bağlıdır, uniseks kateqoriya buna mane olmur.",
      },
    ],
  },
  {
    key: "oud",
    href: "/oud-etirler",
    eyebrow: "Core Cluster",
    title: "Oud ətirlər",
    metaTitle: "Oud ətirlər - Güclü və xarakterli qoxular",
    description: "Oud notu ilə dərin və fərqli xarakter təqdim edən premium ətirlər. Axşam, tədbir və xüsusi günlər üçün seçimlər.",
    intro: "Oud ətirlər daha güclü iz buraxmaq istəyən istifadəçilər üçün ideal kateqoriyadır və əsasən odunsu-isti ailədə yerləşir.",
    bullets: [
      "Güclü aura üçün axşam və tədbir fokuslu seçimlər.",
      "Amber, dəri, paçuli və müşk notları ilə uyğunluq.",
      "Başlanğıc səviyyə və daha intensiv oud variantlarının ayrılması.",
    ],
    keywords: ["oud ətir", "oud parfum", "ərəb ətiri", "güclü qoxu"],
    faq: [
      {
        question: "Oud ətiri gündəlik istifadə etmək olar?",
        answer: "Bəli, amma gündəlik üçün daha yumşaq və sitrusla balanslanan oud kompozisiyalarını seçmək daha rahat olur.",
      },
      {
        question: "Oud notu çox ağırdırsa nə etməliyəm?",
        answer: "Bir püskürtmə ilə başlayın və daha açıq notlu alternativlərlə müqayisə edin. İsti havada dozanı azaltmaq məsləhətdir.",
      },
    ],
  },
  {
    key: "gift",
    href: "/hediyye-etirler",
    eyebrow: "Core Cluster",
    title: "Hədiyyə üçün ətirlər",
    metaTitle: "Hədiyyə üçün ətirlər - Riski az, zövqlü seçimlər",
    description: "Ad günü, ildönümü və xüsusi günlər üçün hədiyyə ətir təklifləri. Universal və yüksək bəyənmə alan kompozisiyalar.",
    intro: "Hədiyyə üçün ətir seçərkən alıcının zövqü tam bilinmədikdə daha balanslı və risksiz kompozisiyalara üstünlük vermək vacibdir.",
    bullets: [
      "Universal bəyənilən not ailələrinə əsaslanan seçimlər.",
      "Qiymət intervalına görə sürətli filtrləmə.",
      "Hədiyyə ssenarisi üçün hazır məqalə və bələdçi keçidləri.",
    ],
    keywords: ["hədiyyə üçün ətir", "sevgiliyə ətir", "ad günü ətiri", "hədiyyə parfum"],
    faq: [
      {
        question: "Hədiyyə üçün ən təhlükəsiz not ailəsi hansıdır?",
        answer: "Təmiz sitrus-çiçəkli və yüngül odunsu ailə adətən daha geniş zövq dairəsinə uyğun olur.",
      },
      {
        question: "Hədiyyədə qalıcılıq daha vacibdir, yoxsa yüngüllük?",
        answer: "İstifadə məqsədindən asılıdır. Gündəlik üçün yüngül balans, gecə istifadə üçün daha qalıcı baza notları uyğun olur.",
      },
    ],
  },
  {
    key: "long-lasting",
    href: "/uzunomurlu-etirler",
    eyebrow: "Core Cluster",
    title: "Uzunömürlü ətirlər",
    metaTitle: "Uzunömürlü ətirlər - Gün boyu qalan seçimlər",
    description: "Daha uzun qalıcı effekt verən ətirlər. Müşk, amber, paçuli, oud və vanil bazalı kompozisiyalarla seçilmiş kolleksiya.",
    intro: "Uzunömürlü ətirlər səhifəsi gün boyu qoxunun stabil qalmasını prioritet edən istifadəçilər üçün hazırlanıb.",
    bullets: [
      "Baza notları güclü olan variantların ayrıca seçimi.",
      "İstifadə texnikası ilə qalıcılığı artıran məsləhətlər.",
      "Mövsümə görə performans fərqi üçün yönləndirmə.",
    ],
    keywords: ["uzunömürlü ətir", "qalıcı ətir", "gün boyu qalan ətr", "performanslı parfum"],
    faq: [
      {
        question: "Qalıcı ətirlər hər dəridə eyni performans verir?",
        answer: "Xeyr. Dəri tipi, temperatur və tətbiq nöqtəsi qalıcılığa təsir edir, amma baza notu güclü kompozisiyalar daha stabil nəticə verir.",
      },
      {
        question: "Qalıcılığı artırmaq üçün necə tətbiq etməliyəm?",
        answer: "Nəmli dəriyə, nəbz nöqtələrinə və geyim üzərinə məsafə saxlayaraq tətbiq edin. Bir neçə qatlama üsulu da kömək edir.",
      },
    ],
  },
  {
    key: "summer",
    href: "/yay-etirleri",
    eyebrow: "Core Cluster",
    title: "Yay ətirləri",
    metaTitle: "Yay ətirləri - Yüngül və təravətli seçimlər",
    description: "İsti havaya uyğun yüngül, təmiz və təravətli yay ətirləri. Sitrus, dəniz və yaşıl notlara fokuslanan seçimlər.",
    intro: "Yay aylarında daha yüngül yayılım və təmiz hiss verən notlar seçmək qoxunun həm rahat, həm də estetik qalmasına kömək edir.",
    bullets: [
      "Sitrus, dəniz və yaşıl notların ön planda olduğu kompozisiyalar.",
      "İsti hava üçün doza və tətbiq məsləhətləri.",
      "Gündəlik, ofis və səyahət üçün ayrıca seçim məntiqi.",
    ],
    keywords: ["yay ətirləri", "təravətli ətir", "isti hava üçün ətir", "sitrus parfum"],
    faq: [
      {
        question: "Yay üçün qalıcı amma ağır olmayan ətir varmı?",
        answer: "Bəli. Sitrus açılışlı, lakin baza hissəsində yüngül müşk və odunsu tonlar olan ətirlər bu balansı yaxşı verir.",
      },
      {
        question: "Yayda neçə dəfə tətbiq etmək lazımdır?",
        answer: "Temperatur yüksək olduqda bir dəfə yüngül tətbiq edin, lazım olduqda gün ərzində 1 dəfə yeniləmə edin.",
      },
    ],
  },
  {
    key: "winter",
    href: "/qis-etirleri",
    eyebrow: "Core Cluster",
    title: "Qış ətirləri",
    metaTitle: "Qış ətirləri - İsti və dərin notlar",
    description: "Soyuq hava üçün isti, dərin və daha zəngin qoxu profilləri. Vanil, amber, oud və ədviyyat notlu qış ətirləri.",
    intro: "Qış ətirləri soyuq havada daha stabil açılan, isti və dolğun hiss yaradan kompozisiyalara fokuslanır.",
    bullets: [
      "Vanil, amber, oud, dəri və ədviyyat istiqamətli seçimlər.",
      "Axşam tədbiri və gündəlik istifadə üçün ayrıca təkliflər.",
      "Mövsümi kampaniya məqalələrinə və hədiyyə seçimlərinə keçid.",
    ],
    keywords: ["qış ətirləri", "isti ətir", "vanilli ətir", "axşam üçün ətir"],
    faq: [
      {
        question: "Qışda hansı notlar daha yaxşı işləyir?",
        answer: "Amber, vanil, oud, dəri və tütün kimi isti notlar soyuq havada daha balanslı və qalıcı hiss olunur.",
      },
      {
        question: "Qış ətiri ofis üçün ağır ola bilər?",
        answer: "Doza və məsafə ilə idarə edildikdə ofisdə də istifadə mümkündür. Daha yumşaq yayılımı olan alternativ seçmək məsləhətdir.",
      },
    ],
  },
];

const ARTICLES: ArticleEntry[] = [
  {
    slug: "2026-ucun-en-yaxsi-kisi-etirleri",
    title: "2026 üçün ən yaxşı kişi ətirləri: gündəlikdən axşama",
    description: "Gündəlik, ofis və axşam istifadə üçün kişi ətirlərini necə ayırmaq lazım olduğunu praktik nümunələrlə izah edən bələdçi.",
    intent: "ən yaxşı kişi ətirləri",
    category: "guide",
    publishedAt: "2026-01-08",
    relatedClusterHrefs: ["/kisi-etirleri", "/uzunomurlu-etirler"],
    sections: [
      { heading: "Gündəlik istifadə üçün profil", content: "Gündəlikdə təmiz sitrus və aromatik notlar daha rahat qəbul olunur və çox yüklənmiş hiss yaratmır." },
      { heading: "Ofis üçün təhlükəsiz seçim", content: "Ofis mühitində yumşaq yayılımı olan odunsu-sitrus balansı həm peşəkar, həm də estetik görünür." },
      { heading: "Axşam üçün daha dərin qoxular", content: "Axşam və tədbirlərdə amber, paçuli və ədviyyat tonları ilə daha dolğun kompozisiyalar ön plana çıxır." },
    ],
    faq: [
      { question: "Bir ətirlə bütün gün keçirmək olar?", answer: "Bəli, lakin tətbiq sayını mühitə görə tənzimləmək lazımdır." },
    ],
  },
  {
    slug: "qadin-etri-secimi-floral-ve-gourmand",
    title: "Qadın ətri seçimi: floral və gourmand arasında düzgün balans",
    description: "Qadın ətirlərində çiçəkli və şirin istiqamətlər arasında seçim etmək üçün sadə qərar modeli.",
    intent: "qadın ətri seçimi",
    category: "guide",
    publishedAt: "2026-01-12",
    relatedClusterHrefs: ["/qadin-etirleri", "/hediyye-etirler"],
    sections: [
      { heading: "Floral nə vaxt daha uyğundur", content: "İş və gündəlik rutin üçün floral istiqamət daha yüngül və universal seçim hesab olunur." },
      { heading: "Gourmand nə vaxt seçilməlidir", content: "Şam yeməyi, tədbir və gecə üçün şirin tonlu gourmand qoxular daha təsirli hiss yaradır." },
      { heading: "Mövsüm faktoru", content: "Yayda yüngül floral, qışda isə daha kremli və şirin baza notları yaxşı işləyir." },
    ],
    faq: [{ question: "Floral qoxular qalıcı olurmu?", answer: "Baza notuna görə dəyişir; müşk və odunsu baza qalıcılığı artırır." }],
  },
  {
    slug: "uniseks-etirlerin-ustunluyu",
    title: "Uniseks ətirlərin üstünlüyü: niyə daha çox seçilir?",
    description: "Uniseks qoxuların çevik istifadəsi, paylaşım rahatlığı və gündəlik uyğunluğu haqqında praktiki analiz.",
    intent: "uniseks ətirlər",
    category: "comparison",
    publishedAt: "2026-01-16",
    relatedClusterHrefs: ["/uniseks-etirler", "/yay-etirleri"],
    sections: [
      { heading: "Neytral profilin gücü", content: "Neytral not balansı bir neçə fərqli mühitdə eyni rahatlıqla istifadə imkanı verir." },
      { heading: "Cütlük üçün ortaq seçim", content: "Uniseks kateqoriya cütlüklər üçün ortaq istifadə və hədiyyə rahatlığı yaradır." },
      { heading: "Dəriyə görə fərqli açılma", content: "Eyni qoxu fərqli dərilərdə fərqli vurğu yarada bilər və bu, uniseks istiqaməti daha maraqlı edir." },
    ],
    faq: [{ question: "Uniseks qoxu çox sadə görünər?", answer: "Doğru nota sahib olduqda uniseks qoxular çox qatlı və xarakterli olur." }],
  },
  {
    slug: "oud-etri-nece-secilmelidir",
    title: "Oud ətri necə seçilməlidir: başlanğıc səviyyədən premiuma",
    description: "Oud ətirlərini ilk dəfə seçənlər üçün intensivlik, nota balansı və istifadə vaxtı üzrə istiqamət.",
    intent: "oud ətri",
    category: "guide",
    publishedAt: "2026-01-20",
    relatedClusterHrefs: ["/oud-etirler", "/qis-etirleri"],
    sections: [
      { heading: "Yüngül oud ilə başlamaq", content: "İlk təcrübə üçün sitrus və ya gül ilə balanslanan oud variantları daha rahat qəbul olunur." },
      { heading: "İntensivlik səviyyəsini anlamaq", content: "Kompozisiyada dəri, amber və paçuli artdıqca oud daha dərin və qalıcı hiss olunur." },
      { heading: "Tətbiq dozajı", content: "Oud qoxularda az dozaj daha yaxşı idarə olunur və mühitə uyğun qalır." },
    ],
    faq: [{ question: "Oud yalnız qış üçünmü?", answer: "Xeyr, yüngül qurulmuş oud variantları yaz və payızda da istifadə edilə bilər." }],
  },
  {
    slug: "hediyye-ucun-etir-secimi-7-qayda",
    title: "Hədiyyə üçün ətir seçimi: 7 praktik qayda",
    description: "Sevgili, dost və ailə üzvü üçün hədiyyə ətiri seçərkən səhv riskini azaldan sadə qaydalar.",
    intent: "hədiyyə üçün ətir",
    category: "guide",
    publishedAt: "2026-01-25",
    relatedClusterHrefs: ["/hediyye-etirler", "/qadin-etirleri", "/kisi-etirleri"],
    sections: [
      { heading: "Not ailəsini daralt", content: "Alıcının əvvəlki seçimlərindən not ailəsini müəyyənləşdirin və riskli ekstremallardan qaçın." },
      { heading: "İstifadə məqsədini soruş", content: "Gündəlik və ya xüsusi gün istifadəsi qoxu istiqamətini kəskin dəyişir." },
      { heading: "Təhlükəsiz performans balansı", content: "Çox ağır və ya çox zəif qoxular əvəzinə orta yayılım və stabil qalıcılıq seçin." },
    ],
    faq: [{ question: "Hədiyyə üçün uniseks daha risksizdir?", answer: "Çox vaxt bəli, xüsusən zövq dəqiq bilinmədikdə." }],
  },
  {
    slug: "uzunomurlu-etirlerde-baza-notlarinin-roli",
    title: "Uzunömürlü ətirlərdə baza notlarının rolu",
    description: "Qalıcılığı artıran əsas baza notları və onların real istifadə performansına təsiri.",
    intent: "uzunömürlü ətir",
    category: "guide",
    publishedAt: "2026-01-29",
    relatedClusterHrefs: ["/uzunomurlu-etirler", "/qis-etirleri"],
    sections: [
      { heading: "Müşk və amber təsiri", content: "Müşk və amber baza qatında qoxunun dəri üzərində daha uzun qalmasına kömək edir." },
      { heading: "Paçuli və oud kombinasiyası", content: "Bu kombinasiya dərinlik və performans verir, xüsusən axşam istifadə üçün uyğundur." },
      { heading: "Tətbiq texnikası", content: "Nəmli dəri, nəbz nöqtələri və geyim qatlama üsulu qalıcılığa ciddi təsir göstərir." },
    ],
    faq: [{ question: "Təkcə bahalı ətirlər qalıcı olur?", answer: "Xeyr, kompozisiya və tətbiq texnikası da ən az qiymət qədər vacibdir." }],
  },
  {
    slug: "yay-ucun-yungul-etir-rehberi",
    title: "Yay üçün yüngül ətir bələdçisi",
    description: "İsti havada boğucu olmayan, təravətli və təmiz hiss verən yay ətirləri seçimi.",
    intent: "yay ətirləri",
    category: "guide",
    publishedAt: "2026-02-03",
    relatedClusterHrefs: ["/yay-etirleri", "/uniseks-etirler"],
    sections: [
      { heading: "Sitrus və dəniz notları", content: "Yayda limon, bergamot və dəniz akkordları daha rahat qəbul edilir." },
      { heading: "Günorta tətbiqi", content: "Günorta saatlarında daha az dozaj və daha açıq profil üstünlük təşkil etməlidir." },
      { heading: "Səyahət üçün seçim", content: "Qısa rutin üçün yüngül və universal uniseks variantlar daha funksional olur." },
    ],
    faq: [{ question: "Yayda şirin qoxu istifadə etmək olar?", answer: "Bəli, amma daha yüngül doza və havadar kompozisiya seçmək yaxşıdır." }],
  },
  {
    slug: "qisda-istifade-ucun-isti-qoxular",
    title: "Qışda istifadə üçün isti qoxular",
    description: "Soyuq havada daha yaxşı açılan vanil, amber və odunsu qoxuları seçmək üçün praktiki istiqamət.",
    intent: "qış ətirləri",
    category: "guide",
    publishedAt: "2026-02-08",
    relatedClusterHrefs: ["/qis-etirleri", "/oud-etirler"],
    sections: [
      { heading: "İsti notların üstünlüyü", content: "Vanil, amber və ədviyyat tonları qışda daha sabit və dərin hiss olunur." },
      { heading: "Ofis üçün qış qoxusu", content: "Qışda belə ofis üçün daha ölçülü və təmiz yayılımlı variantlar seçilməlidir." },
      { heading: "Axşam üçün intensiv seçim", content: "Tədbirlərdə daha dolğun oud və dəri notlu variantlar daha güclü iz buraxır." },
    ],
    faq: [{ question: "Qış qoxusu yayda işləyər?", answer: "Adətən ağır hiss olunur, yaz-yayda daha yüngül alternativlər daha uyğundur." }],
  },
  {
    slug: "ofis-ucun-etir-secimi",
    title: "Ofis üçün ətir seçimi: peşəkar və balanslı yanaşma",
    description: "İş mühitində həm estetik, həm də ölçülü təsir yaradan ətir seçimi üçün qaydalar.",
    intent: "ofis üçün ətir",
    category: "guide",
    publishedAt: "2026-02-12",
    relatedClusterHrefs: ["/kisi-etirleri", "/qadin-etirleri", "/uniseks-etirler"],
    sections: [
      { heading: "Aşağı-orta yayılım", content: "Ofis üçün əsas prinsip digərlərinə narahatlıq yaratmayan orta yayılımlı qoxu seçməkdir." },
      { heading: "Səhər tətbiqi", content: "Səhər bir-iki püskürtmə ilə başlamaq və ehtiyac olduqda günortadan sonra yeniləmək kifayətdir." },
      { heading: "Not ailəsi seçimi", content: "Sitrus, yaşıl və yüngül odunsu notlar peşəkar mühitdə daha stabil nəticə verir." },
    ],
    faq: [{ question: "Ofisdə oud istifadə etmək olar?", answer: "Bəli, amma çox yumşaq oud kompozisiyası və minimal doza ilə." }],
  },
  {
    slug: "ilk-etirini-secenler-ucun-start",
    title: "İlk ətirini seçənlər üçün başlanğıc bələdçisi",
    description: "Ətir dünyasına yeni başlayanlar üçün notlar, qalıcılıq və istifadə qaydalarını sadə dildə izah edən giriş məqaləsi.",
    intent: "ilk ətir seçimi",
    category: "guide",
    publishedAt: "2026-02-17",
    relatedClusterHrefs: ["/uniseks-etirler", "/hediyye-etirler"],
    sections: [
      { heading: "Not quruluşu nədir", content: "Üst, ürək və baza notları qoxunun zamanla necə dəyişdiyini müəyyən edir." },
      { heading: "Qalıcılıq gözləntisi", content: "Qalıcılıq istifadə şəraiti və dəri tipinə görə fərqlənir, buna görə test və müşahidə vacibdir." },
      { heading: "İlk seçim üçün təhlükəsiz ailə", content: "Sitrus-çiçəkli və yüngül odunsu ailələr başlanğıc üçün ən risksiz variantlardır." },
    ],
    faq: [{ question: "Neçə ətirlə başlamaq idealdır?", answer: "2-3 fərqli istifadə ssenarisinə uyğun seçimlə başlamaq kifayətdir." }],
  },
  {
    slug: "ramazan-ve-bayram-ucun-etir-kampaniyalari",
    title: "Ramazan və bayram üçün ətir kampaniyaları",
    description: "Mövsümi kampaniya dövründə düzgün ətir seçimi və büdcə planlaması üçün qısa yol xəritəsi.",
    intent: "ətir kampaniyası",
    category: "campaign",
    publishedAt: "2026-02-22",
    relatedClusterHrefs: ["/hediyye-etirler", "/qis-etirleri"],
    sections: [
      { heading: "Kampaniya öncəsi siyahı", content: "İstifadə məqsədi və büdcə aralığını əvvəlcədən təyin etmək kampaniyada daha düzgün qərar verir." },
      { heading: "Hədiyyə və şəxsi istifadə balansı", content: "Kampaniya dövründə həm hədiyyə, həm şəxsi ehtiyac üçün fərqli kateqoriyalarda seçim etmək sərfəlidir." },
      { heading: "Sürətli qərar modeli", content: "Not ailəsi, mövsüm və qalıcılıq prioriteti ilə seçim çox daha sürətli tamamlanır." },
    ],
    faq: [{ question: "Kampaniyada keyfiyyət riskə düşür?", answer: "Etibarlı mağaza və məhsul məlumatı şəffaf olduqda risk azalır." }],
  },
  {
    slug: "sevgililer-gunu-ucun-hediyye-etirler",
    title: "Sevgililər günü üçün hədiyyə ətirlər",
    description: "Sevgililər günü üçün romantik və zərif ətir hədiyyəsi seçməkdə kömək edən təkliflər.",
    intent: "sevgililər günü ətir hədiyyəsi",
    category: "campaign",
    publishedAt: "2026-02-26",
    relatedClusterHrefs: ["/hediyye-etirler", "/qadin-etirleri", "/kisi-etirleri"],
    sections: [
      { heading: "Romantik not istiqaməti", content: "Gül, vanil və yumşaq müşk romantik hədiyyə ssenarisində tez-tez seçilir." },
      { heading: "Büdcəyə görə seçim", content: "Aşağı, orta və premium büdcə üçün ayrı qruplama daha rahat qərar verir." },
      { heading: "Riski azaltma", content: "Əgər zövq tam bilinmirsə daha universal profil seçmək daha uğurlu nəticə verir." },
    ],
    faq: [{ question: "Tək ətir hədiyyəsi kifayətdirmi?", answer: "Bəli, doğru nota yönəldikdə tək seçim də çox uğurlu ola bilər." }],
  },
  {
    slug: "yasemeni-sevenlere-etirler",
    title: "Yasəmən notunu sevənlər üçün ətirlər",
    description: "Yasəmən notuna üstünlük verənlər üçün müxtəlif üslubda ətir istiqamətləri və istifadə məsləhətləri.",
    intent: "yasəmən notlu ətirlər",
    category: "guide",
    publishedAt: "2026-03-02",
    relatedClusterHrefs: ["/qadin-etirleri", "/yay-etirleri"],
    sections: [
      { heading: "Yüngül yasəmən profili", content: "Gündəlik istifadə üçün daha təmiz və havadar yasəmən kompozisiyaları üstünlük təşkil edir." },
      { heading: "Axşam üçün zəngin quruluş", content: "Yasəmənin vanil və amber ilə qurulduğu kompozisiyalar daha dərin təsir yaradır." },
      { heading: "Mövsüm uyğunluğu", content: "Yaz-yay üçün floral təravət, payız-qış üçün isə daha kremli quruluş daha balanslıdır." },
    ],
    faq: [{ question: "Yasəmən yalnız qadın ətirlərində olur?", answer: "Xeyr, uniseks və bəzi kişi kompozisiyalarında da istifadə olunur." }],
  },
  {
    slug: "vanilli-etirler-ne-zaman-secilmelidir",
    title: "Vanilli ətirlər nə zaman seçilməlidir?",
    description: "Vanil notlu ətirlərin mövsüm, istifadə saatı və doza baxımından düzgün istifadəsi.",
    intent: "vanilli ətir",
    category: "guide",
    publishedAt: "2026-03-06",
    relatedClusterHrefs: ["/qis-etirleri", "/uzunomurlu-etirler"],
    sections: [
      { heading: "Vanilin xarakteri", content: "Vanil notu isti və rahat hiss yaratdığı üçün xüsusən axşam və sərin havada daha təsirlidir." },
      { heading: "Gündəlik istifadə dozajı", content: "Gündəlikdə vanilli qoxuları yüngül tətbiq etmək balansı qoruyur." },
      { heading: "Digər notlarla uyğunluq", content: "Vanil, tonka və odunsu baza birlikdə daha premium və qalıcı hiss verir." },
    ],
    faq: [{ question: "Vanilli ətir yay üçün ağırdır?", answer: "Çox zaman bəli, lakin yüngül citrus açılışlı variantlar istifadə oluna bilər." }],
  },
  {
    slug: "rose-note-etirlerin-xarakteri",
    title: "Rose note ətirlərin xarakteri və istifadə ssenarisi",
    description: "Gül notunun fərqli kompozisiyalarda necə dəyişdiyini və hansı mühitlər üçün uyğun olduğunu izah edən məqalə.",
    intent: "rose note ətir",
    category: "comparison",
    publishedAt: "2026-03-11",
    relatedClusterHrefs: ["/qadin-etirleri", "/hediyye-etirler"],
    sections: [
      { heading: "Təmiz gül profili", content: "Təmiz gül notu daha zərif və klassik hiss verir, gündüz istifadəsində rahatdır." },
      { heading: "Dəri və oud ilə gül", content: "Daha cəsarətli və axşam yönümlü nəticə üçün gül notu oud və dəri ilə birləşdirilir." },
      { heading: "Uniseks gül istiqaməti", content: "Yaşıl və odunsu əlavə ilə gül notu uniseks profilə yaxınlaşır." },
    ],
    faq: [{ question: "Gül notu yalnız romantik obraz üçündür?", answer: "Xeyr, kompozisiyadan asılı olaraq çox modern və minimal da ola bilər." }],
  },
  {
    slug: "bakida-etir-sifarisi-nece-edilir",
    title: "Bakıda ətir sifarişi necə edilir: addım-addım",
    description: "Onlayn ətir sifarişində ölçü, not və çatdırılma qərarlarını necə düzgün vermək lazım olduğunu göstərən praktik yazı.",
    intent: "bakıda ətir sifarişi",
    category: "guide",
    publishedAt: "2026-03-14",
    relatedClusterHrefs: ["/catalog", "/elaqe"],
    sections: [
      { heading: "Məhsul səhifəsini oxumaq", content: "Notlar, ölçülər və uyğunluq mətnlərini oxumaq yanlış seçimin qarşısını alır." },
      { heading: "Ölçü qərarı", content: "Yeni qoxuda əvvəlcə kiçik həcmdən başlamaq daha təhlükəsiz yanaşmadır." },
      { heading: "Dəstəkdən istifadə", content: "Qararsız qaldıqda qısa məlumatla dəstək komandası daha uyğun seçim təqdim edə bilər." },
    ],
    faq: [{ question: "Çatdırılma nə qədər çəkir?", answer: "Adətən 1-3 iş günü aralığında hazırlanır və göndərilir." }],
  },
  {
    slug: "etir-alarken-en-cox-edilen-sehvler",
    title: "Ətir alarkən ən çox edilən səhvlər",
    description: "Ətir alışı zamanı tez-tez edilən 10 səhv və onları necə minimuma endirmək olar.",
    intent: "ətir alarkən səhvlər",
    category: "guide",
    publishedAt: "2026-03-18",
    relatedClusterHrefs: ["/blog", "/catalog"],
    sections: [
      { heading: "Tələsik qərar", content: "Məhsul notlarını və istifadə ssenarisini nəzərə almadan qərar vermək çox zaman peşmanlıq yaradır." },
      { heading: "Mövsümü nəzərə almamaq", content: "Yay və qış üçün eyni gücdə qoxu seçmək balanssız nəticə verə bilər." },
      { heading: "Dozajı düzgün etməmək", content: "Ətirin keyfiyyəti qədər tətbiq texnikası da vacibdir." },
    ],
    faq: [{ question: "Bir qoxunu test etmədən almaq düzgündür?", answer: "Risklidir, amma doğru bələdçi və nota uyğunluqla risk azaldıla bilər." }],
  },
  {
    slug: "yaz-movsumu-ucun-top-10-etir",
    title: "Yaz mövsümü üçün top 10 ətir istiqaməti",
    description: "Yaz aylarında daha yaxşı işləyən yüngül və təmiz not ailələrinə əsaslanan seçim məqaləsi.",
    intent: "yaz üçün ətir",
    category: "campaign",
    publishedAt: "2026-03-22",
    relatedClusterHrefs: ["/yay-etirleri", "/qadin-etirleri", "/kisi-etirleri"],
    sections: [
      { heading: "Sitrus açılışlar", content: "Yazda daha canlı və enerjili təsir üçün sitrus notları tez-tez seçilir." },
      { heading: "Yüngül floral seçim", content: "Çiçəkli notlarda daha şəffaf quruluş gündəlik istifadə üçün ideal olur." },
      { heading: "Uniseks alternativ", content: "Yaz mövsümündə neytral qoxular həm şəxsi, həm hədiyyə seçimi üçün uyğundur." },
    ],
    faq: [{ question: "Yazda ağır qoxu istifadə etmək olar?", answer: "Mümkündür, amma doza və tətbiq nöqtələri çox diqqətlə seçilməlidir." }],
  },
  {
    slug: "payizda-uzunomurlu-etirler",
    title: "Payızda uzunömürlü ətirlər: nə seçmək lazımdır?",
    description: "Payız aylarında həm gündəlik, həm axşam üçün qalıcı qoxu seçimi strategiyası.",
    intent: "payız uzunömürlü ətir",
    category: "guide",
    publishedAt: "2026-03-27",
    relatedClusterHrefs: ["/uzunomurlu-etirler", "/qis-etirleri"],
    sections: [
      { heading: "Payız balansı", content: "Hava keçid dövründə nə çox yüngül, nə də çox ağır qoxu seçmək daha yaxşı nəticə verir." },
      { heading: "Baza notları", content: "Amber və paçuli payız üçün qalıcılıq və istilik balansını yaxşı təmin edir." },
      { heading: "Gündəlik və axşam fərqi", content: "Gündəlik üçün daha yüngül, axşam üçün daha dərin variant saxlamaq praktik yanaşmadır." },
    ],
    faq: [{ question: "Payız üçün uniseks seçim varmı?", answer: "Bəli, odunsu-uniseks ailədə çox uğurlu variantlar var." }],
  },
  {
    slug: "brend-vs-brisq-analizi",
    title: "Brend seçimi: populyar markalar arasında müqayisə modeli",
    description: "Brend reputasiyası, nota üslubu və qiymət aralığına görə düzgün marka seçimi üçün çərçivə.",
    intent: "ətir brend müqayisəsi",
    category: "comparison",
    publishedAt: "2026-03-31",
    relatedClusterHrefs: ["/brands", "/blog"],
    sections: [
      { heading: "Brend imzası", content: "Hər brendin dominant not istiqaməti olur və bu, seçim sürətini artırır." },
      { heading: "Qiymət-performans", content: "Eyni büdcədə fərqli marka strategiyası ilə daha yaxşı uyğunluq əldə etmək mümkündür." },
      { heading: "İstifadə məqsədi", content: "Gündəlik və xüsusi gün üçün marka seçimi ayrıca düşünülməlidir." },
    ],
    faq: [{ question: "Bahalı brend hər zaman daha yaxşıdır?", answer: "Xeyr, uyğunluq və istifadə məqsədi daha vacib meyardır." }],
  },
  {
    slug: "toy-ve-nisan-ucun-etir-secimi",
    title: "Toy və nişan üçün ətir seçimi",
    description: "Xüsusi günlər üçün yaddaqalan, balanslı və uzunömürlü ətir seçmək üçün peşəkar tövsiyələr.",
    intent: "toy üçün ətir",
    category: "campaign",
    publishedAt: "2026-04-04",
    relatedClusterHrefs: ["/hediyye-etirler", "/uzunomurlu-etirler", "/oud-etirler"],
    sections: [
      { heading: "Məkan faktoru", content: "Açıq və qapalı məkan üçün fərqli intensivlik lazımdır." },
      { heading: "Qalıcılıq prioriteti", content: "Xüsusi günlərdə daha uzun qalıcı baza notları seçimdə vacib rol oynayır." },
      { heading: "Foto və yaddaş effekti", content: "Qoxu yaddaşı güclü olduğundan xüsusi gün üçün fərqli imza qoxu seçmək dəyərlidir." },
    ],
    faq: [{ question: "Toy üçün qadın və kişi eyni qoxu ailəsi seçə bilər?", answer: "Bəli, uyğun uniseks ailə ilə harmonik cütlük effekti yaratmaq olar." }],
  },
  {
    slug: "minimalist-qoxu-sevenlere-toplanmis-rehber",
    title: "Minimalist qoxu sevənlərə toplanmış bələdçi",
    description: "Sakit, təmiz və aşırı diqqət çəkməyən qoxu istəyənlər üçün istiqamətləndirici yazı.",
    intent: "minimalist ətir",
    category: "guide",
    publishedAt: "2026-04-07",
    relatedClusterHrefs: ["/uniseks-etirler", "/yay-etirleri"],
    sections: [
      { heading: "Nəyi minimalist edir", content: "Minimalist qoxular adətən təmiz akkordlar və yumşaq yayılım ilə seçilir." },
      { heading: "İş və gündəlik uyğunluq", content: "Bu profil iş mühitində və uzun günlərdə daha rahat istifadə olunur." },
      { heading: "Az dozajla yüksək estetika", content: "Minimalist profil çox püskürtmə tələb etmir, balanslı tətbiq kifayətdir." },
    ],
    faq: [{ question: "Minimalist qoxu darıxdırıcı olar?", answer: "Doğru kompozisiyada əksinə, çox zərif və premium hiss yaradır." }],
  },
  {
    slug: "etirde-note-oxumaq-nece-olur",
    title: "Ətirdə not oxumaq necə olur?",
    description: "Ətir kartında top, heart, base notlarını necə anlamaq lazım olduğunu sadə nümunələrlə izah edir.",
    intent: "ətir notları necə oxunur",
    category: "guide",
    publishedAt: "2026-04-10",
    relatedClusterHrefs: ["/blog", "/catalog", "/notes/oud"],
    sections: [
      { heading: "Top notlar", content: "İlk təəssüratı verən və qısa müddətdə hiss olunan notlardır." },
      { heading: "Heart notlar", content: "Qoxunun əsas xarakterini formalaşdıran orta qatdır." },
      { heading: "Base notlar", content: "Qalıcılıq və dərinlik yaradan son qatdır, uzun müddət hiss olunur." },
    ],
    faq: [{ question: "Notlar siyahısı qoxunu tam izah edir?", answer: "Yox, amma seçim üçün ən vacib istiqaməti verir." }],
  },
  {
    slug: "azinfluencerlerle-qoxu-trendi-2026",
    title: "AZ influencer-lərlə qoxu trendi 2026",
    description: "Azərbaycanda social media trendinə uyğun qoxu istiqamətləri və istifadə davranışları.",
    intent: "ətir trendi 2026 azərbaycan",
    category: "campaign",
    publishedAt: "2026-04-12",
    relatedClusterHrefs: ["/blog", "/uniseks-etirler", "/qadin-etirleri"],
    sections: [
      { heading: "Trend istiqamətləri", content: "2026-da təmiz uniseks və yumşaq gourmand istiqamətləri ön plana çıxır." },
      { heading: "Platforma davranışı", content: "Qısa video formatında qoxu hekayəsi və nota izahı daha çox diqqət alır." },
      { heading: "Mikro-influencer təsiri", content: "Niş auditoriyaya sahib mikro-influencerlərlə daha yüksək etibar və dönüşüm əldə olunur." },
    ],
    faq: [{ question: "Trend qoxu hər kəsə uyğun olur?", answer: "Yox, trend yön verir, son seçim şəxsi uyğunluğa görə edilməlidir." }],
  },
  {
    slug: "kampaniya-teklifleri-nece-qiymetlendirilmeli",
    title: "Kampaniya təklifləri necə qiymətləndirilməlidir?",
    description: "Kampaniyalarda real dəyəri anlamaq və doğru məhsulu seçmək üçün ölçülə bilən meyarlar.",
    intent: "ətir kampaniya təklifləri",
    category: "campaign",
    publishedAt: "2026-04-14",
    relatedClusterHrefs: ["/blog", "/hediyye-etirler", "/catalog"],
    sections: [
      { heading: "Qiymət deyil, dəyər", content: "Təkcə endirim faizinə yox, məhsulun nota uyğunluğu və istifadə məqsədinə baxmaq lazımdır." },
      { heading: "Stock və ölçü amili", content: "İstədiyiniz ölçünün mövcudluğu kampaniya dəyərini birbaşa dəyişir." },
      { heading: "Yenidən alış potensialı", content: "Kampaniyada seçilən məhsulun sonradan da istifadə edilə bilməsi vacib meyardır." },
    ],
    faq: [{ question: "Kampaniyada premium seçim etməyə dəyərmi?", answer: "Bəli, uyğun seçim tapıldıqda uzunmüddətli istifadə üçün daha sərfəli ola bilər." }],
  },
];

const LONG_LASTING_NOTES = ["oud", "amber", "musk", "patchouli", "vanilla", "tonka", "sandalwood", "leather", "tobacco"];
const SUMMER_NOTES = ["citrus", "bergamot", "lemon", "marine", "aquatic", "grapefruit", "green", "mint"];
const WINTER_NOTES = ["amber", "vanilla", "oud", "patchouli", "leather", "cinnamon", "tobacco", "resin"];

function normalizedGender(value: string) {
  return value.trim().toLowerCase();
}

function hasNote(perfume: Perfume, terms: string[]) {
  const pool = [
    ...perfume.noteSlugs.top,
    ...perfume.noteSlugs.heart,
    ...perfume.noteSlugs.base,
  ]
    .join(" ")
    .toLowerCase();

  return terms.some((term) => pool.includes(term));
}

function startingPrice(perfume: Perfume) {
  const min = perfume.sizes.reduce((acc, item) => Math.min(acc, item.price), Number.POSITIVE_INFINITY);
  return Number.isFinite(min) ? min : 0;
}

function byCatalogPriority(a: Perfume, b: Perfume) {
  if (a.inStock !== b.inStock) {
    return a.inStock ? -1 : 1;
  }

  return startingPrice(a) - startingPrice(b);
}

function dedupeByBrand(perfumes: Perfume[], hardLimit: number) {
  const seenBrands = new Set<string>();
  const firstPass: Perfume[] = [];

  for (const perfume of perfumes) {
    const brandKey = perfume.brand.trim().toLowerCase();
    if (!seenBrands.has(brandKey)) {
      firstPass.push(perfume);
      seenBrands.add(brandKey);
    }

    if (firstPass.length >= hardLimit) {
      break;
    }
  }

  if (firstPass.length >= hardLimit) {
    return firstPass;
  }

  const selectedIds = new Set(firstPass.map((item) => item.id));
  for (const perfume of perfumes) {
    if (selectedIds.has(perfume.id)) {
      continue;
    }

    firstPass.push(perfume);
    if (firstPass.length >= hardLimit) {
      break;
    }
  }

  return firstPass;
}

export function pickClusterPerfumes(clusterKey: ClusterDefinition["key"], perfumes: Perfume[], hardLimit = 16) {
  const filtered = perfumes.filter((perfume) => {
    const gender = normalizedGender(perfume.gender);

    if (clusterKey === "men") {
      return /men|male|kis|kişi|man|muj|muzh|муж/u.test(gender);
    }

    if (clusterKey === "women") {
      return /women|female|qad|жен|lady|woman/u.test(gender);
    }

    if (clusterKey === "unisex") {
      return /unisex|uni/u.test(gender);
    }

    if (clusterKey === "oud") {
      return hasNote(perfume, ["oud", "agar", "ud"]);
    }

    if (clusterKey === "gift") {
      return perfume.inStock && perfume.sizes.length > 0;
    }

    if (clusterKey === "long-lasting") {
      return hasNote(perfume, LONG_LASTING_NOTES);
    }

    if (clusterKey === "summer") {
      return hasNote(perfume, SUMMER_NOTES);
    }

    if (clusterKey === "winter") {
      return hasNote(perfume, WINTER_NOTES);
    }

    return true;
  });

  return dedupeByBrand(filtered.sort(byCatalogPriority), hardLimit);
}

export const CORE_CLUSTER_PAGES = CLUSTER_CATALOG;

export const CORE_CLUSTER_PATHS = CORE_CLUSTER_PAGES.map((item) => item.href);

export function getClusterByPath(pathname: string) {
  return CORE_CLUSTER_PAGES.find((item) => item.href === pathname);
}

export const BLOG_ARTICLES = ARTICLES;

export function getBlogArticleBySlug(slug: string) {
  return BLOG_ARTICLES.find((item) => item.slug === slug);
}

export const TRUST_PAGES = [
  { href: "/haqqimizda", label: "Haqqımızda" },
  { href: "/elaqe", label: "Əlaqə" },
  { href: "/privacy-policy", label: "Məxfilik siyasəti" },
  { href: "/refund-policy", label: "Qaytarılma siyasəti" },
  { href: "/terms-and-conditions", label: "Şərtlər və qaydalar" },
] as const;
