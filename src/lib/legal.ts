import type { Metadata } from "next";

import type { Locale } from "@/lib/i18n";
import { applySiteBranding, normalizeSiteSettings, type SiteSettings } from "@/lib/site-branding";
import { SITE_NAME, absoluteUrl, absoluteUrlForLocale, buildAzeriPageKeywords, buildLocaleAlternates } from "@/lib/seo";

export const LEGAL_CONTACT_EMAIL = "info@perfoumer.az";

export const LEGAL_PAGE_ORDER = [
  "refund-policy",
  "terms-and-conditions",
  "privacy-policy",
] as const;

export type LegalPageSlug = (typeof LEGAL_PAGE_ORDER)[number];

type LegalSection = {
  title: string;
  paragraphs?: string[];
  bullets?: string[];
};

type LegalHighlight = {
  label: string;
  value: string;
};

export type LegalPageContent = {
  slug: LegalPageSlug;
  navLabel: string;
  eyebrow: string;
  title: string;
  description: string;
  updatedLabel: string;
  updatedValue: string;
  navigationTitle: string;
  contactTitle: string;
  contactText: string;
  metadataTitle: string;
  metadataDescription: string;
  metadataKeywords: string[];
  highlights: LegalHighlight[];
  sections: LegalSection[];
};

const legalPages: Record<Locale, Record<LegalPageSlug, LegalPageContent>> = {
  az: {
    "refund-policy": {
      slug: "refund-policy",
      navLabel: "Qaytarılma siyasəti",
      eyebrow: "Qaytarılma və geri ödəniş",
      title: "Qaytarılma siyasəti",
      description:
        "Perfoumer sifarişinizdən razı qalmağınızı istəyir. Bu səhifə hansı məhsulların qaytarıla bildiyini, müraciətin necə edildiyini və geri ödəniş prosesinin necə işlədiyini aydın şəkildə izah edir.",
      updatedLabel: "Son yenilənmə",
      updatedValue: "13 aprel 2026",
      navigationTitle: "Hüquqi səhifələr",
      contactTitle: "Qaytarılma ilə bağlı dəstək",
      contactText:
        "Məhsul zədəlidirsə, səhv göndərilibsə və ya qaytarılma prosesində dəstəyə ehtiyacınız varsa, komandamız sizə kömək edəcək.",
      metadataTitle: "Qaytarılma Siyasəti",
      metadataDescription:
        "Perfoumer qaytarılma siyasəti: qaytarılma şərtləri, 30 günlük pəncərə, geri ödəniş mərhələləri və dəstək məlumatları.",
      metadataKeywords: buildAzeriPageKeywords([
        "qaytarılma siyasəti",
        "geri ödəniş",
        "ətir qaytarılması",
        "sifariş qaytarılması",
        "qaytarılma şərtləri",
      ], 60),
      highlights: [
        { label: "Qaytarılma pəncərəsi", value: "Çatdırılmadan sonra 30 gün" },
        { label: "Əsas şərt", value: "İstifadə olunmamış və tam qablaşdırma" },
        { label: "Yoxlama sonrası", value: "Təsdiqdən sonra geri ödəniş" },
      ],
      sections: [
        {
          title: "Hansı məhsullar qaytarıla bilər",
          paragraphs: [
            "Qaytarılma üçün məhsul istifadə olunmamış, satışa yararlı vəziyyətdə və mümkün olduqda orijinal qutusu ilə birlikdə olmalıdır. Məhsul üzərində açıq istifadə izi, zədələnmə və ya tam olmayan komplektasiya olduqda müraciət əlavə yoxlamaya yönləndirilə bilər.",
          ],
          bullets: [
            "Çatdırılmadan sonra 30 gün ərzində müraciət edilməlidir.",
            "Qutu, aksesuar və varsa qoruyucu paket birlikdə təqdim olunmalıdır.",
            "Məhsulun sifariş nömrəsi və əlaqə məlumatı qeyd edilməlidir.",
            "Məhsulun orijinallığını və alış faktını təsdiqləyən məlumatlar təqdim olunmalıdır.",
          ],
        },
        {
          title: "Qaytarılması qəbul olunmayan hallar",
          paragraphs: [
            "Gigiyena, təhlükəsizlik və məhsul bütövlüyü səbəbilə bəzi hallarda qaytarılma mümkün olmaya bilər. Məqsəd həm alıcını, həm də məhsul keyfiyyətini qorumaqdır.",
          ],
          bullets: [
            "Açılmış, istifadə edilmiş və ya test edilmiş maye məhsullar.",
            "Alıcının müdaxiləsi ilə zədələnmiş qablaşdırma və ya aksesuarlar.",
            "Fərdi sifariş, xüsusi kampaniya və açıq şəkildə son satış kimi qeyd olunan məhsullar.",
            "Qanunla geri qaytarılması məhdudlaşdırılmış məhsul kateqoriyaları.",
          ],
        },
        {
          title: "Səhv və ya qüsurlu məhsul",
          paragraphs: [
            "Sizə səhv məhsul göndərilibsə və ya məhsul qüsurlu vəziyyətdə çatıbsa, məsələ prioritet qaydada həll edilir. Belə hallarda əlavə foto və qısa izah istənilə bilər ki, proses sürətli tamamlansın.",
          ],
          bullets: [
            "Müraciəti məhsulu aldıqdan sonra mümkün qədər tez göndərin.",
            "Qutu, etiket və məhsulun vəziyyətini göstərən fotolar əlavə edin.",
            "Təsdiqdən sonra dəyişdirmə və ya geri ödəniş variantı təqdim olunur.",
          ],
        },
        {
          title: "Qaytarılma prosesi necə işləyir",
          paragraphs: [
            "Qaytarılma sorğusu qəbul edildikdən sonra komanda müraciəti yoxlayır, lazım olduqda əlavə məlumat istəyir və növbəti addımları sizə yazılı şəkildə göndərir. Məhsul geri alındıqdan sonra vəziyyəti yenidən yoxlanılır.",
          ],
          bullets: [
            "1. Bizimlə e-poçt vasitəsilə əlaqə saxlayın.",
            "2. Sifariş nömrəsini və səbəbi paylaşın.",
            "3. Təsdiqlənmiş ünvan və yönləndirmə ilə məhsulu geri göndərin.",
            "4. Müraciətin nəticəsi sizə yazılı şəkildə bildirilir.",
          ],
        },
        {
          title: "Geri ödəniş müddəti",
          paragraphs: [
            "Qaytarılan məhsul yoxlamadan uğurla keçdikdən sonra geri ödəniş eyni ödəniş üsulu ilə emal edilir. Bank və ödəniş sistemindən asılı olaraq məbləğin hesabınıza düşməsi əlavə vaxt ala bilər.",
          ],
          bullets: [
            "Yoxlama tamamlandıqdan sonra geri ödəniş başlanır.",
            "Bank emalı müddəti ödəniş provayderindən asılıdır.",
            "Çatdırılma xərcləri yalnız səhv və ya qüsurlu məhsul hallarında tam qarşılanır.",
            "Geri ödəniş, texniki olaraq mümkün olduqda, ilkin ödəniş üsuluna qaytarılır.",
          ],
        },
        {
          title: "Hüquqi istisnalar və yekun qərar",
          paragraphs: [
            "Bu siyasət tətbiq olunan istehlakçı qanunvericiliyində nəzərdə tutulan məcburi hüquqları məhdudlaşdırmır. Qaytarılma müraciətləri təqdim edilmiş məlumatlar, məhsulun faktiki vəziyyəti və sifariş tarixçəsi əsasında qiymətləndirilir.",
          ],
          bullets: [
            "Saxtakarlıq və ya sui-istifadə şübhəsi olduqda müraciət əlavə araşdırmaya yönləndirilə bilər.",
            "Natamam və ya ziddiyyətli məlumat təqdim edildikdə baxılma müddəti uzana bilər.",
            "Yekun nəticə və əsaslandırma, mümkün olduqda, yazılı formada paylaşılır.",
          ],
        },
      ],
    },
    "terms-and-conditions": {
      slug: "terms-and-conditions",
      navLabel: "Şərtlər və qaydalar",
      eyebrow: "Sayt şərtləri",
      title: "Şərtlər və qaydalar",
      description:
        "Bu şərtlər Perfoumer.az saytından istifadəni, məhsul sifarişini və hesab funksiyalarından yararlanma qaydalarını tənzimləyir. Saytdan istifadə etməklə aşağıdakı şərtlərlə razılaşmış olursunuz.",
      updatedLabel: "Son yenilənmə",
      updatedValue: "13 aprel 2026",
      navigationTitle: "Hüquqi səhifələr",
      contactTitle: "Şərtlərlə bağlı sualınız var?",
      contactText:
        "Sifariş, hesab, ödəniş və ya məhsul qaydaları ilə bağlı açıqlamaya ehtiyacınız olduqda birbaşa bizimlə əlaqə saxlaya bilərsiniz.",
      metadataTitle: "Şərtlər və Qaydalar",
      metadataDescription:
        "Perfoumer saytının şərtlər və qaydalar səhifəsi: sifariş, ödəniş, hesab istifadəsi, məhsul məlumatı və hüquqi məsuliyyət çərçivəsi.",
      metadataKeywords: buildAzeriPageKeywords([
        "şərtlər və qaydalar",
        "istifadə şərtləri",
        "sifariş qaydaları",
        "ödəniş şərtləri",
        "perfoumer hüquqi",
      ], 60),
      highlights: [
        { label: "Tətbiq sahəsi", value: "Sayt istifadəsi və sifarişlər" },
        { label: "Ödəniş", value: "Checkout təsdiqi ilə qüvvəyə minir" },
        { label: "Məhsul məlumatı", value: "Qiymət, ölçü və mövcudluq dəyişə bilər" },
      ],
      sections: [
        {
          title: "Saytdan istifadə",
          paragraphs: [
            "Perfoumer.az saytından istifadə edərkən təqdim olunan məlumatların dürüst, aktual və qanuni məqsədlər üçün istifadə olunması vacibdir. Saytın xidmətlərini pozan, zərər verən və ya digər istifadəçilərin təcrübəsinə mənfi təsir göstərən fəaliyyətlər qəbul edilmir.",
          ],
          bullets: [
            "Yanlış və ya saxta hesab məlumatı təqdim etməyin.",
            "Sayta müdaxilə, avtomatlaşdırılmış sui-istifadə və ya icazəsiz toplama aparmayın.",
            "İcma funksiyalarında hörmətli və qanuni davranış qorunmalıdır.",
          ],
        },
        {
          title: "Sifariş və ödəniş",
          paragraphs: [
            "Saytda yerləşdirilən məhsulu sifariş edərkən bütün seçimlər, ölçü və qiymət məlumatları yoxlanmalıdır. Sifariş checkout mərhələsində təsdiqləndikdən sonra emala alınır və stok vəziyyəti əsasında yekun təsdiq edilir.",
          ],
          bullets: [
            "Qiymətlər və mövcudluq əvvəlcədən xəbərdarlıq edilmədən yenilənə bilər.",
            "Ödəniş uğurla tamamlanmadıqda sifariş rezerv olunmaya bilər.",
            "Sifariş təsdiqindən sonra dəqiqləşdirmə üçün sizinlə əlaqə saxlaya bilərik.",
            "Risk yoxlaması və texniki doğrulama səbəbi ilə sifarişin emalı müvəqqəti dayandırıla bilər.",
          ],
        },
        {
          title: "Məhsul təsviri və təqdimat",
          paragraphs: [
            "Perfoumer məhsul adı, not strukturu, ölçü və qiymət məlumatını mümkün qədər dəqiq göstərməyə çalışır. Buna baxmayaraq ekran rəngi, qablaşdırma partiyası və istehsalçı yeniləmələri səbəbilə kiçik fərqlər yarana bilər.",
          ],
          bullets: [
            "Məhsul şəkilləri tanıtım xarakteri daşıya bilər.",
            "Ölçü, stok və kampaniya məlumatı real vaxtda dəyişə bilər.",
            "Aydın uyğunsuzluq olduqda komanda düzəliş və ya həll təklif edir.",
            "Aşkar texniki qiymət xətası olduqda sifariş təsdiqdən əvvəl yenidən yoxlanıla bilər.",
          ],
        },
        {
          title: "Hesab və istifadəçi məzmunu",
          paragraphs: [
            "Hesab sahibi giriş məlumatlarının təhlükəsiz saxlanmasına cavabdehdir. Şərh, seçilmişlər və digər hesab funksiyaları saytdakı qaydalara uyğun istifadə edilməlidir.",
          ],
          bullets: [
            "Hesab fəaliyyətinə görə əsas məsuliyyət istifadəçiyə aiddir.",
            "Qaydaları pozan məzmun silinə və ya məhdudlaşdırıla bilər.",
            "Şübhəli fəaliyyət olduqda hesab müvəqqəti yoxlamaya yönləndirilə bilər.",
            "İcma və xidmət təhlükəsizliyi üçün qayda pozuntuları arxivləşdirilə və audit edilə bilər.",
          ],
        },
        {
          title: "Xidmət monitorinqi və analitika",
          paragraphs: [
            "Saytın sabitliyi, təhlükəsizliyi və performansının izlənməsi üçün məhdud texniki analitika qeydləri aparıla bilər. Bu qeydlər daxili statistika və xidmət keyfiyyətinin artırılması məqsədilə aqreqasiya edilə bilər.",
          ],
          bullets: [
            "Sessiya, cihaz, səhifə baxışı və istinad mənbəyi kimi texniki məlumatlar emal oluna bilər.",
            "IP əsaslı təxmini geolokasiya (ölkə, region, şəhər, vaxt zonası) təhlükəsizlik və monitorinq məqsədi ilə istifadə oluna bilər.",
            "Bu emal üzrə ətraflı qaydalar Məxfilik siyasətində göstərilir.",
          ],
        },
        {
          title: "Əqli mülkiyyət və məsuliyyət çərçivəsi",
          paragraphs: [
            "Saytdakı dizayn, mətn, vizual, loqo və proqram hissələri Perfoumer və ya müvafiq hüquq sahiblərinə məxsusdur. Sayt qanunla icazə verilməyən formada köçürülə, yayıla və ya kommersiya məqsədi ilə istifadə edilə bilməz.",
            "Perfoumer xidmətin fasiləsiz olmasına çalışsa da, texniki səbəblərdən müvəqqəti dəyişiklik, gecikmə və ya xidmət dayanmaları baş verə bilər. Hüquqi məsuliyyət tətbiq olunan istehlakçı hüquqları çərçivəsində qiymətləndirilir.",
          ],
          bullets: [
            "Qanunla yol verilən həddə dolayı zərərlərə görə məsuliyyət məhdudlaşdırıla bilər.",
            "Mübahisəli hallarda elektron yazışmalar və sifariş qeydləri sübut kimi istifadə oluna bilər.",
            "Sayt materiallarının icazəsiz istifadəsi hüquqi tədbirlərə səbəb ola bilər.",
          ],
        },
        {
          title: "Mübahisələrin həlli və tətbiq olunan hüquq",
          paragraphs: [
            "Şərhlərin tətbiqindən irəli gələn mübahisələr ilk növbədə tərəflər arasında yazılı müraciət və danışıqlar yolu ilə həll olunmağa çalışılır. Barışıq əldə olunmadıqda məsələ tətbiq olunan milli qanunvericiliyə uyğun qaydada araşdırılır.",
          ],
          bullets: [
            "Mübahisə barədə ilkin bildiriş yazılı formada təqdim edilməlidir.",
            "Tətbiq olunan hüquq kimi Azərbaycan Respublikasının qanunvericiliyi əsas götürülür.",
            "Şərtlərin bir hissəsi etibarsız sayılsa da, qalan müddəalar qüvvədə qalır.",
          ],
        },
      ],
    },
    "privacy-policy": {
      slug: "privacy-policy",
      navLabel: "Məxfilik siyasəti",
      eyebrow: "Məxfilik və məlumatlar",
      title: "Məxfilik siyasəti",
      description:
        "Perfoumer şəxsi məlumatların toplanması və istifadəsi mövzusunda şəffaf olmağa çalışır. Bu siyasət sayt ziyarətləri, sifarişlər və hesab funksiyalarından istifadə zamanı məlumatların necə idarə olunduğunu açıqlayır.",
      updatedLabel: "Son yenilənmə",
      updatedValue: "13 aprel 2026",
      navigationTitle: "Hüquqi səhifələr",
      contactTitle: "Məxfiliklə bağlı sorğular",
      contactText:
        "Şəxsi məlumatlarınız, hesabınız və ya məxfilik hüquqlarınızla bağlı sualınız varsa, komandamız sizə cavab verməyə hazırdır.",
      metadataTitle: "Məxfilik Siyasəti",
      metadataDescription:
        "Perfoumer məxfilik siyasəti: hansı məlumatların toplandığı, necə istifadə edildiyi, cookies, saxlanma və istifadəçi hüquqları.",
      metadataKeywords: buildAzeriPageKeywords([
        "məxfilik siyasəti",
        "şəxsi məlumatlar",
        "cookies",
        "məlumat təhlükəsizliyi",
        "sayt məxfiliyi",
      ], 60),
      highlights: [
        { label: "Toplanan məlumat", value: "Əlaqə, sifariş və hesab detalları" },
        { label: "İstifadə məqsədi", value: "Sifariş, dəstək və təkmilləşdirmə" },
        { label: "Nəzarət", value: "Məlumat sorğusu və yeniləmə hüquqları" },
      ],
      sections: [
        {
          title: "Hansı məlumatları toplayırıq",
          paragraphs: [
            "Sayt üzərindən sifariş, hesab açılışı, əlaqə forması və interaktiv funksiyalar istifadə edildikdə müəyyən məlumatlar toplanır. Məqsəd sifarişin icrası, dəstəyin göstərilməsi və təcrübənin sabit şəkildə işləməsidir.",
          ],
          bullets: [
            "Ad, soyad, e-poçt ünvanı və telefon kimi əlaqə məlumatları.",
            "Sifariş detalları, çatdırılma ünvanı və ödənişlə bağlı texniki status məlumatı.",
            "Hesab fəaliyyəti, seçilmişlər, səbət və saytdakı seçim davranışları.",
            "Qanuni tələblər əsasında tələb olunduqda təsdiqləyici əməliyyat qeydləri.",
          ],
        },
        {
          title: "Məlumatlardan necə istifadə edirik",
          paragraphs: [
            "Toplanan məlumat yalnız biznes proseslərini yerinə yetirmək, xidmət keyfiyyətini yüksəltmək və istifadəçi sorğularına cavab vermək üçün istifadə olunur. Məlumatı ehtiyac olmayan məqsədlər üçün genişləndirmirik.",
          ],
          bullets: [
            "Sifarişi qəbul etmək, təsdiqləmək və çatdırmaq.",
            "Dəstək sorğularını cavablandırmaq və problem həll etmək.",
            "Sayt performansını, təhlükəsizliyini və istifadəçi təcrübəsini yaxşılaşdırmaq.",
            "Qanuni öhdəliklərin, mühasibat uçotunun və dələduzluğun qarşısının alınması proseslərinin icrası.",
          ],
        },
        {
          title: "Cookies və analitika",
          paragraphs: [
            "Saytın sabit işləməsi və performansın ölçülməsi üçün cookies və bənzər texnologiyalardan istifadə oluna bilər. Bu texnologiyalar sessiyanın saxlanması, üstünlüklərin xatırlanması və ümumi istifadə meyllərinin anlaşılmasına kömək edir.",
            "Statistika paneli üçün sessiya texniki məlumatları (sessiya identifikatoru, anonim identifikator, cihaz növü, brauzer, əməliyyat sistemi, baxılan səhifə, istinad mənbəyi və vaxt) emal oluna bilər.",
          ],
          bullets: [
            "Əsas funksiyalar üçün zəruri cookies.",
            "Dil seçimi və bəzi rahatlıq seçimlərini yadda saxlayan cookies.",
            "Ümumi davranış analizi üçün anonim və ya məhdud analitika məlumatı.",
            "IP əsaslı təxmini geolokasiya məlumatı (ölkə, region, şəhər, vaxt zonası) xidmət monitorinqi və təhlükəsizlik məqsədi ilə istifadə oluna bilər.",
            "Dəqiq GPS geolokasiyası toplamırıq.",
          ],
        },
        {
          title: "Analitika məqsədi, hüquqi əsas və istifadəçi nəzarəti",
          paragraphs: [
            "Analitika məlumatları saytın performansını, təhlükəsizliyini və xidmət keyfiyyətini ölçmək üçün istifadə olunur. Toplanmış məlumatlar daxili statistika (məsələn, aktiv səhifələr, cihaz bölgüsü, ölkələr üzrə ziyarətçi sayı) şəklində aqreqasiya edilə bilər.",
            "Məlumat emalı tətbiq olunan qanunvericiliyə uyğun olaraq müqavilə öhdəliyinin icrası, qanuni maraq və zəruri hallarda razılıq kimi hüquqi əsaslara söykənə bilər.",
          ],
          bullets: [
            "Analitika məlumatı reklam məqsədli üçüncü tərəf satışına yönəldilmir.",
            "Müraciət etdikdə məlumatlarınız barədə izah, düzəliş və uyğun hallarda silinmə tələbi verə bilərsiniz.",
            "Qanuni öhdəliklər və təhlükəsizlik auditləri səbəbilə bəzi qeydlər müəyyən müddət saxlanıla bilər.",
          ],
        },
        {
          title: "Məlumatın paylaşılması və saxlanması",
          paragraphs: [
            "Şəxsi məlumatlar yalnız xidmətin göstərilməsi üçün lazım olduqda etibarlı tərəfdaşlarla məhdud çərçivədə paylaşılır. Buraya ödəniş, çatdırılma və texniki infrastruktur təminatçıları daxil ola bilər. Məlumatlar yalnız zəruri olduğu müddət ərzində saxlanılır.",
          ],
          bullets: [
            "Ödəniş emalı və sifariş logistikası üçün texniki tərəfdaşlar.",
            "Qanuni öhdəlik tələb etdikdə müvafiq paylaşım.",
            "Gereksiz olduqda məlumatın silinməsi və ya anonimləşdirilməsi.",
            "Xidmət müqaviləsi çərçivəsində məlumatlara yalnız səlahiyyətli tərəflərin çıxışı.",
          ],
        },
        {
          title: "Sizin hüquqlarınız",
          paragraphs: [
            "Məlumatlarınızla bağlı sorğu göndərmək, yeniləmə istəmək və müəyyən hallarda silinmə tələb etmək hüququnuz var. Hüquqi öhdəliklər və aktiv sifariş prosesləri bu hüquqların tətbiqinə təsir göstərə bilər.",
          ],
          bullets: [
            "Məlumat nüsxəsi və emal məqsədi barədə sorğu.",
            "Dəqiq olmayan məlumatların düzəldilməsi.",
            "Uyğun hallarda silinmə və ya istifadənin məhdudlaşdırılması tələbi.",
            "Marketinq bildirişlərindən imtina və razılığın geri götürülməsi hüququ.",
          ],
        },
        {
          title: "Təhlükəsizlik və saxlanma müddəti",
          paragraphs: [
            "Məlumatların qorunması üçün texniki və təşkilati təhlükəsizlik tədbirləri tətbiq olunur. Məlumatlar yalnız əməliyyat, hüquqi və xidmət ehtiyacları üçün zəruri olan müddətdə saxlanılır və artıq tələb olunmadıqda silinir və ya anonimləşdirilir.",
          ],
          bullets: [
            "Sistemlərdə rol əsaslı giriş nəzarəti və jurnal qeydləri tətbiq oluna bilər.",
            "Məlumatların saxlanma müddəti hüquqi öhdəliklər və əməliyyat ehtiyaclarına görə müəyyən edilir.",
            "Mümkün təhlükəsizlik insidentləri daxili prosedurlara uyğun qiymətləndirilir və idarə olunur.",
          ],
        },
      ],
    },
  },
  en: {
    "refund-policy": {
      slug: "refund-policy",
      navLabel: "Refund Policy",
      eyebrow: "Returns & Refunds",
      title: "Refund policy",
      description:
        "We want every Perfoumer order to arrive exactly as expected. This page explains which items may be returned, how the request is reviewed, and what to expect during the refund process.",
      updatedLabel: "Last updated",
      updatedValue: "April 13, 2026",
      navigationTitle: "Legal pages",
      contactTitle: "Need help with a return?",
      contactText:
        "If your order arrived damaged, incorrect, or you need guidance through the return flow, our support team can help you directly.",
      metadataTitle: "Refund Policy",
      metadataDescription:
        "Perfoumer refund policy covering return eligibility, the 30-day return window, review steps, and refund timing.",
      metadataKeywords: [
        "perfoumer refund policy",
        "returns",
        "refunds",
        "return eligibility",
        "order return",
      ],
      highlights: [
        { label: "Return window", value: "Within 30 days of delivery" },
        { label: "Primary condition", value: "Unused product with complete packaging" },
        { label: "Refund flow", value: "Processed after product inspection" },
      ],
      sections: [
        {
          title: "Eligible returns",
          paragraphs: [
            "Returned products should be unused, resalable, and ideally sent back with their original box and included accessories. If packaging or contents are incomplete, the return may require a manual review before approval.",
          ],
          bullets: [
            "Submit your request within 30 days of delivery.",
            "Include the original box, accessories, and order reference when available.",
            "Share the order number and the reason for the request.",
          ],
        },
        {
          title: "Items we may not accept",
          paragraphs: [
            "For hygiene, safety, and product-integrity reasons, some items may not qualify for a standard return. This helps protect both product quality and customer trust.",
          ],
          bullets: [
            "Opened, used, or tested liquid products.",
            "Items damaged after delivery through customer handling.",
            "Custom, final-sale, or clearly marked non-returnable purchases.",
          ],
        },
        {
          title: "Incorrect or damaged products",
          paragraphs: [
            "If you received the wrong item or your order arrived damaged, we prioritize that case. We may ask for photos and a short description so we can resolve it as quickly as possible.",
          ],
          bullets: [
            "Contact us as soon as you notice the issue.",
            "Include photos of the product, packaging, and shipping label when possible.",
            "Once confirmed, we may offer a replacement or refund path.",
          ],
        },
        {
          title: "How the return flow works",
          paragraphs: [
            "After we receive your request, our team reviews the details, confirms next steps, and shares return instructions. Once the item arrives back, we inspect its condition before the refund is finalized.",
          ],
          bullets: [
            "1. Email our team with your order details.",
            "2. Wait for confirmation and return instructions.",
            "3. Send the approved return to the provided address.",
          ],
        },
        {
          title: "Refund timing",
          paragraphs: [
            "Approved refunds are issued to the original payment method after inspection. Depending on your bank or payment provider, it may take additional time for the amount to appear on your statement.",
          ],
          bullets: [
            "Inspection must be completed before the refund is released.",
            "Bank processing times may vary by payment provider.",
            "Shipping costs are generally refunded only for damaged or incorrect deliveries.",
          ],
        },
      ],
    },
    "terms-and-conditions": {
      slug: "terms-and-conditions",
      navLabel: "Terms & Conditions",
      eyebrow: "Site Terms",
      title: "Terms & conditions",
      description:
        "These terms explain how Perfoumer.az may be used, how orders are handled, and what rules apply when customers interact with accounts, content, and purchasing features on the site.",
      updatedLabel: "Last updated",
      updatedValue: "April 13, 2026",
      navigationTitle: "Legal pages",
      contactTitle: "Questions about the terms?",
      contactText:
        "If you need clarification around ordering, payments, or account usage, our team can explain the relevant policy directly.",
      metadataTitle: "Terms and Conditions",
      metadataDescription:
        "Perfoumer terms and conditions covering website use, orders, payments, product information, account behavior, and responsibility limits.",
      metadataKeywords: [
        "perfoumer terms",
        "terms and conditions",
        "website terms",
        "order terms",
        "payment terms",
      ],
      highlights: [
        { label: "Scope", value: "Website use and customer orders" },
        { label: "Checkout effect", value: "Applies once an order is confirmed" },
        { label: "Product data", value: "Pricing and availability may change" },
      ],
      sections: [
        {
          title: "Using the website",
          paragraphs: [
            "You agree to use Perfoumer.az lawfully, respectfully, and without disrupting the site, its systems, or other customers. Any use that harms service stability or misrepresents your identity may be restricted.",
          ],
          bullets: [
            "Do not provide false or misleading account information.",
            "Do not abuse the platform through scraping, interference, or unauthorized automation.",
            "Use community-facing features in a respectful and lawful way.",
          ],
        },
        {
          title: "Orders and payments",
          paragraphs: [
            "Before checkout, customers should review the selected size, price, and order details carefully. Orders are processed after submission and may still be subject to stock confirmation, fraud review, or payment verification.",
          ],
          bullets: [
            "Prices and availability may change without prior notice.",
            "An incomplete payment does not guarantee item reservation.",
            "We may contact you to confirm or clarify an order before dispatch.",
          ],
        },
        {
          title: "Product information",
          paragraphs: [
            "We aim to keep product names, notes, sizes, and imagery accurate. Minor differences in packaging, image tone, or manufacturer presentation may occur due to batch updates or display variations.",
          ],
          bullets: [
            "Product imagery may be illustrative.",
            "Stock, sizes, and campaign details may update in real time.",
            "If a material listing error occurs, we reserve the right to correct it before fulfillment.",
          ],
        },
        {
          title: "Accounts and customer content",
          paragraphs: [
            "Customers are responsible for maintaining the confidentiality of their account access and for activities that occur under their profile. Wishlist, comments, and other features should be used in line with site rules.",
          ],
          bullets: [
            "You are responsible for account security on your side.",
            "Content that breaks policy may be moderated or removed.",
            "Suspicious activity may trigger a temporary account review.",
          ],
        },
        {
          title: "Service monitoring and analytics",
          paragraphs: [
            "To keep the platform stable and secure, we may process limited technical analytics records and produce aggregated internal metrics used for service quality improvements.",
          ],
          bullets: [
            "Technical records may include session, device, path, timing, and referrer data.",
            "Approximate IP-based location metadata (country, region, city, timezone) may be used for security and operations monitoring.",
            "Detailed data-processing rules are described in the Privacy Policy.",
          ],
        },
        {
          title: "Intellectual property and liability",
          paragraphs: [
            "Website copy, design, logos, photography, and software components belong to Perfoumer or the relevant rights holders and may not be reused beyond what the law permits.",
            "While we work to keep the website available and accurate, temporary interruptions, delays, or technical issues can happen. Liability is interpreted within the limits allowed by applicable consumer and commercial rules.",
          ],
        },
      ],
    },
    "privacy-policy": {
      slug: "privacy-policy",
      navLabel: "Privacy Policy",
      eyebrow: "Privacy & Data",
      title: "Privacy policy",
      description:
        "Perfoumer aims to be clear about the personal information collected through site visits, orders, and account features. This policy explains how that information is handled and protected.",
      updatedLabel: "Last updated",
      updatedValue: "April 13, 2026",
      navigationTitle: "Legal pages",
      contactTitle: "Privacy questions",
      contactText:
        "If you need help with your personal data, account records, or privacy-related requests, you can contact our team directly.",
      metadataTitle: "Privacy Policy",
      metadataDescription:
        "Perfoumer privacy policy covering collected data, usage purposes, cookies, storage, and user privacy rights.",
      metadataKeywords: [
        "perfoumer privacy policy",
        "personal data",
        "cookies",
        "data usage",
        "privacy rights",
      ],
      highlights: [
        { label: "Collected data", value: "Contact, order, and account details" },
        { label: "Used for", value: "Orders, support, and site improvement" },
        { label: "Your control", value: "Request, correct, or review data" },
      ],
      sections: [
        {
          title: "What we collect",
          paragraphs: [
            "We collect limited information when you place an order, create an account, contact support, or use interactive features on the website. The goal is to operate the service, complete purchases, and maintain a stable experience.",
          ],
          bullets: [
            "Contact details such as name, email, phone number, and delivery address.",
            "Order information, transaction status, and fulfillment details.",
            "Account activity such as wishlist, cart, and preference selections.",
          ],
        },
        {
          title: "How we use information",
          paragraphs: [
            "Collected data is used to process orders, respond to support requests, improve site performance, and maintain security. We do not extend the use of personal information beyond operational needs without a valid basis.",
          ],
          bullets: [
            "To confirm, fulfill, and support orders.",
            "To answer customer messages and resolve issues.",
            "To improve site reliability, usability, and fraud prevention.",
          ],
        },
        {
          title: "Cookies and analytics",
          paragraphs: [
            "Cookies and similar tools may be used to keep sessions active, remember preferences, and understand general site usage. These tools help us maintain continuity and improve the customer experience.",
            "To operate live analytics, we may process technical session data such as session identifiers, anonymous identifiers, device type, browser, operating system, visited path, referrer, and timing information.",
          ],
          bullets: [
            "Essential cookies needed for site functionality.",
            "Preference cookies such as selected language or convenience settings.",
            "Anonymous or limited analytics to understand performance trends.",
            "Approximate IP-based geolocation (country, region, city, timezone) may be used for security and service monitoring.",
            "We do not collect precise GPS location from your device.",
          ],
        },
        {
          title: "Analytics purpose and legal basis",
          paragraphs: [
            "Analytics data is used to measure platform performance, detect abuse, and improve service quality. We may display aggregated internal statistics such as active paths, device split, and top countries by visitors.",
            "Processing is based on applicable legal grounds, including contract performance, legitimate interest, and consent where required by law.",
          ],
          bullets: [
            "We do not sell analytics personal data to advertising data brokers.",
            "You may request access, correction, or deletion where applicable and legally permitted.",
            "Some records may be retained for security, fraud prevention, and legal compliance periods.",
          ],
        },
        {
          title: "Sharing and retention",
          paragraphs: [
            "Personal data is shared only when necessary with trusted service providers involved in payments, logistics, hosting, or security. Information is retained only for as long as needed for operations, legal obligations, or legitimate support history.",
          ],
          bullets: [
            "Payment and shipping providers may receive the data needed to complete your order.",
            "Data may be disclosed when required by law or a valid legal request.",
            "Information is deleted or anonymized when it is no longer necessary.",
          ],
        },
        {
          title: "Your rights",
          paragraphs: [
            "Depending on the request and legal context, you may ask to review, correct, or delete certain personal information. Active orders, fraud prevention needs, or legal duties may affect how quickly a request can be fully completed.",
          ],
          bullets: [
            "Request a copy or summary of the personal data we hold.",
            "Ask for inaccurate information to be corrected.",
            "Request deletion or restriction where applicable.",
          ],
        },
      ],
    },
  },
  ru: {
    "refund-policy": {
      slug: "refund-policy",
      navLabel: "Политика возврата",
      eyebrow: "Returns & Refunds",
      title: "Политика возврата",
      description:
        "Мы хотим, чтобы заказ Perfoumer соответствовал ожиданиям. На этой странице описано, какие товары можно вернуть, как проходит проверка заявки и как работает возврат средств.",
      updatedLabel: "Последнее обновление",
      updatedValue: "13 апреля 2026",
      navigationTitle: "Юридические страницы",
      contactTitle: "Нужна помощь с возвратом?",
      contactText:
        "Если товар пришел поврежденным, ошибочным или вам нужна помощь по процедуре возврата, команда поддержки поможет напрямую.",
      metadataTitle: "Политика Возврата",
      metadataDescription:
        "Политика возврата Perfoumer: условия возврата, 30-дневное окно, этапы проверки и сроки возврата средств.",
      metadataKeywords: [
        "perfoumer возврат",
        "политика возврата",
        "возврат средств",
        "условия возврата",
        "возврат заказа",
      ],
      highlights: [
        { label: "Окно возврата", value: "В течение 30 дней после доставки" },
        { label: "Основное условие", value: "Товар без использования и с полной упаковкой" },
        { label: "Возврат средств", value: "После проверки товара" },
      ],
      sections: [
        {
          title: "Какие товары подходят для возврата",
          paragraphs: [
            "Возвращаемый товар должен быть неиспользованным, пригодным для перепродажи и по возможности возвращен вместе с оригинальной коробкой и комплектом. Если упаковка или содержимое неполные, заявка может перейти на дополнительную проверку.",
          ],
          bullets: [
            "Подайте заявку в течение 30 дней после доставки.",
            "По возможности приложите коробку, аксессуары и номер заказа.",
            "Укажите причину возврата и контактные данные.",
          ],
        },
        {
          title: "Что мы можем не принять",
          paragraphs: [
            "По причинам гигиены, безопасности и сохранности продукции некоторые категории не подпадают под стандартный возврат. Это помогает защитить качество товара и доверие покупателей.",
          ],
          bullets: [
            "Открытые, использованные или протестированные жидкие продукты.",
            "Товары, поврежденные после получения по вине покупателя.",
            "Индивидуальные заказы, финальная распродажа и явно отмеченные невозвратные позиции.",
          ],
        },
        {
          title: "Ошибочный или поврежденный товар",
          paragraphs: [
            "Если вы получили не тот товар или заказ пришел поврежденным, мы рассматриваем такую ситуацию в приоритетном порядке. Для ускорения решения могут потребоваться фотографии и краткое описание проблемы.",
          ],
          bullets: [
            "Свяжитесь с нами сразу после обнаружения проблемы.",
            "Приложите фото товара, упаковки и транспортной этикетки.",
            "После подтверждения мы предложим замену или возврат средств.",
          ],
        },
        {
          title: "Как проходит возврат",
          paragraphs: [
            "После получения обращения команда проверяет детали, отправляет дальнейшие шаги и подтверждает адрес возврата. Когда товар поступает обратно, мы оцениваем его состояние перед финальным подтверждением возврата средств.",
          ],
          bullets: [
            "1. Напишите нам на электронную почту.",
            "2. Дождитесь подтверждения и инструкции.",
            "3. Отправьте согласованный возврат по указанному адресу.",
          ],
        },
        {
          title: "Сроки возврата средств",
          paragraphs: [
            "После успешной проверки возврат средств оформляется тем же способом оплаты. В зависимости от банка или платежного сервиса зачисление может занять дополнительное время.",
          ],
          bullets: [
            "Сначала должна завершиться проверка возврата.",
            "Скорость зачисления зависит от вашего платежного провайдера.",
            "Стоимость доставки обычно компенсируется только при ошибке или повреждении заказа.",
          ],
        },
      ],
    },
    "terms-and-conditions": {
      slug: "terms-and-conditions",
      navLabel: "Условия использования",
      eyebrow: "Site Terms",
      title: "Условия и правила",
      description:
        "Эти условия регулируют использование сайта Perfoumer.az, оформление заказов и правила работы с аккаунтом, комментариями и пользовательскими функциями.",
      updatedLabel: "Последнее обновление",
      updatedValue: "13 апреля 2026",
      navigationTitle: "Юридические страницы",
      contactTitle: "Есть вопрос по условиям?",
      contactText:
        "Если вам нужно уточнение по заказам, оплате или правилам использования аккаунта, команда может объяснить нужный пункт напрямую.",
      metadataTitle: "Условия и Правила",
      metadataDescription:
        "Условия и правила Perfoumer: использование сайта, оформление заказов, оплата, описание товаров, аккаунты и пределы ответственности.",
      metadataKeywords: [
        "perfoumer условия",
        "условия использования",
        "правила сайта",
        "условия заказа",
        "условия оплаты",
      ],
      highlights: [
        { label: "Сфера", value: "Использование сайта и оформление заказов" },
        { label: "Оплата", value: "Действует после подтверждения заказа" },
        { label: "Информация о товаре", value: "Цена и наличие могут обновляться" },
      ],
      sections: [
        {
          title: "Использование сайта",
          paragraphs: [
            "Используя Perfoumer.az, вы соглашаетесь действовать законно, добросовестно и без вмешательства в работу сайта, его систем или пользовательского опыта других клиентов.",
          ],
          bullets: [
            "Не предоставляйте ложные или вводящие в заблуждение данные.",
            "Не злоупотребляйте сайтом через несанкционированный сбор, вмешательство или автоматизацию.",
            "Используйте пользовательские функции уважительно и в рамках закона.",
          ],
        },
        {
          title: "Заказы и оплата",
          paragraphs: [
            "Перед оформлением заказа необходимо внимательно проверить выбранный объем, цену и детали заказа. После подтверждения заказ может дополнительно проверяться по наличию, платежному статусу и безопасности.",
          ],
          bullets: [
            "Цены и наличие могут изменяться без предварительного уведомления.",
            "Неуспешная оплата не гарантирует резерв товара.",
            "Мы можем связаться с вами для уточнения заказа до отправки.",
          ],
        },
        {
          title: "Информация о товаре",
          paragraphs: [
            "Мы стремимся поддерживать точность данных о названиях, нотах, объеме и изображениях товаров. При этом возможны небольшие различия из-за обновлений партий, упаковки или особенностей отображения на экране.",
          ],
          bullets: [
            "Изображения товаров могут носить иллюстративный характер.",
            "Наличие, объемы и условия акций могут меняться в реальном времени.",
            "Если обнаружена существенная ошибка в карточке товара, мы можем скорректировать ее до выполнения заказа.",
          ],
        },
        {
          title: "Аккаунты и пользовательский контент",
          paragraphs: [
            "Пользователь отвечает за сохранность доступа к своему аккаунту и действия, совершаемые под ним. Wishlist, комментарии и другие функции должны использоваться в рамках правил сайта.",
          ],
          bullets: [
            "Ответственность за безопасность аккаунта лежит на пользователе.",
            "Контент, нарушающий правила, может быть удален или ограничен.",
            "Подозрительная активность может привести к временной проверке аккаунта.",
          ],
        },
        {
          title: "Мониторинг сервиса и аналитика",
          paragraphs: [
            "Для поддержания стабильности и безопасности платформы мы можем обрабатывать ограниченные технические аналитические записи и формировать агрегированную внутреннюю статистику для улучшения качества сервиса.",
          ],
          bullets: [
            "Технические записи могут включать данные сессии, устройства, пути страницы, времени и referrer.",
            "Приблизительная IP-геолокация (страна, регион, город, часовой пояс) может использоваться для безопасности и операционного мониторинга.",
            "Подробные правила обработки указаны в Политике конфиденциальности.",
          ],
        },
        {
          title: "Интеллектуальная собственность и ответственность",
          paragraphs: [
            "Дизайн, тексты, изображения, логотипы и программные элементы сайта принадлежат Perfoumer или соответствующим правообладателям и не могут использоваться вне рамок закона.",
            "Мы стараемся поддерживать бесперебойную работу сайта, однако временные задержки, технические ограничения и перебои возможны. Ответственность оценивается в пределах, допускаемых применимыми нормами.",
          ],
        },
      ],
    },
    "privacy-policy": {
      slug: "privacy-policy",
      navLabel: "Политика конфиденциальности",
      eyebrow: "Privacy & Data",
      title: "Политика конфиденциальности",
      description:
        "Perfoumer стремится прозрачно объяснять, какие персональные данные собираются при посещении сайта, оформлении заказов и использовании аккаунта, а также как эти данные защищаются.",
      updatedLabel: "Последнее обновление",
      updatedValue: "13 апреля 2026",
      navigationTitle: "Юридические страницы",
      contactTitle: "Вопросы по конфиденциальности",
      contactText:
        "Если вам нужна помощь по персональным данным, истории аккаунта или запросам по конфиденциальности, вы можете связаться с нами напрямую.",
      metadataTitle: "Политика Конфиденциальности",
      metadataDescription:
        "Политика конфиденциальности Perfoumer: какие данные собираются, как используются, как работают cookies и какие права есть у пользователя.",
      metadataKeywords: [
        "perfoumer privacy",
        "конфиденциальность",
        "персональные данные",
        "cookies",
        "права пользователя",
      ],
      highlights: [
        { label: "Собираемые данные", value: "Контактные, заказные и аккаунт-данные" },
        { label: "Использование", value: "Заказы, поддержка и улучшение сервиса" },
        { label: "Контроль", value: "Запрос, исправление и просмотр данных" },
      ],
      sections: [
        {
          title: "Какие данные мы собираем",
          paragraphs: [
            "Мы собираем ограниченный набор данных, когда вы оформляете заказ, создаете аккаунт, обращаетесь в поддержку или используете интерактивные функции сайта. Это необходимо для работы сервиса и выполнения покупок.",
          ],
          bullets: [
            "Имя, email, телефон и адрес доставки.",
            "Информация о заказе, статусе оплаты и выполнении.",
            "Активность аккаунта: wishlist, корзина и пользовательские предпочтения.",
          ],
        },
        {
          title: "Как используются данные",
          paragraphs: [
            "Собранная информация используется для обработки заказов, ответа на обращения, улучшения стабильности сайта и обеспечения безопасности. Мы не расширяем использование данных за пределы обоснованных операционных задач.",
          ],
          bullets: [
            "Подтверждение, выполнение и сопровождение заказов.",
            "Ответы на обращения клиентов и решение проблем.",
            "Оптимизация производительности, удобства и защиты сайта.",
          ],
        },
        {
          title: "Cookies и аналитика",
          paragraphs: [
            "Для сохранения сессии, предпочтений и общего понимания работы сайта могут использоваться cookies и похожие технологии. Это помогает поддерживать непрерывный и удобный пользовательский опыт.",
            "Для live-статистики могут обрабатываться технические данные сессии: идентификатор сессии, анонимный идентификатор, тип устройства, браузер, ОС, путь страницы, referrer и время события.",
          ],
          bullets: [
            "Необходимые cookies для базовой работы сайта.",
            "Cookies предпочтений, включая выбранный язык и удобство использования.",
            "Ограниченная аналитика для понимания общих показателей работы.",
            "Для мониторинга сервиса и безопасности может использоваться приблизительная IP-геолокация (страна, регион, город, часовой пояс).",
            "Точная GPS-геолокация устройства не собирается.",
          ],
        },
        {
          title: "Цель аналитики и правовые основания",
          paragraphs: [
            "Аналитические данные используются для контроля производительности, обнаружения злоупотреблений и улучшения качества сервиса. Внутренние отчеты могут формироваться в агрегированном виде (например, активные страницы, устройства, топ стран по посетителям).",
            "Обработка выполняется на применимых правовых основаниях: исполнение договора, законный интерес и, где требуется, согласие пользователя.",
          ],
          bullets: [
            "Мы не продаем персональные аналитические данные рекламным брокерам.",
            "Вы можете запросить доступ, исправление или удаление данных в применимых случаях.",
            "Часть журналов может храниться в течение сроков, необходимых для безопасности, антифрода и соблюдения закона.",
          ],
        },
        {
          title: "Передача и хранение данных",
          paragraphs: [
            "Личные данные передаются только тогда, когда это нужно для платежей, доставки, хостинга или безопасности, и только надежным поставщикам услуг. Данные хранятся столько, сколько необходимо для операций, поддержки или законных обязательств.",
          ],
          bullets: [
            "Платежные и логистические партнеры получают только нужные данные.",
            "Раскрытие возможно при законном и обязательном запросе.",
            "Ненужные данные удаляются или обезличиваются.",
          ],
        },
        {
          title: "Ваши права",
          paragraphs: [
            "В зависимости от запроса и правовой ситуации вы можете запросить просмотр, исправление или удаление части персональных данных. На исполнение запроса могут влиять активные заказы, проверки безопасности и юридические требования.",
          ],
          bullets: [
            "Запрос копии или сводки ваших данных.",
            "Исправление неточной информации.",
            "Запрос на удаление или ограничение обработки там, где это применимо.",
          ],
        },
      ],
    },
  },
};

export function getLegalPage(
  locale: Locale,
  slug: LegalPageSlug,
  settings?: SiteSettings,
): LegalPageContent {
  return applySiteBranding(legalPages[locale][slug], normalizeSiteSettings(settings));
}

export function getLegalPageLinks(locale: Locale, settings?: SiteSettings) {
  return LEGAL_PAGE_ORDER.map((slug) => {
    const page = getLegalPage(locale, slug, settings);
    return {
      href: `/${slug}`,
      label: page.navLabel,
      slug,
    };
  });
}

export function getLegalMetadata(
  locale: Locale,
  slug: LegalPageSlug,
  settings?: SiteSettings,
): Metadata {
  const normalizedSettings = normalizeSiteSettings(settings);
  const page = getLegalPage(locale, slug, normalizedSettings);
  const path = `/${slug}`;

  return {
    title: page.metadataTitle,
    description: page.metadataDescription,
    keywords: page.metadataKeywords,
    alternates: buildLocaleAlternates(path, locale),
    openGraph: {
      title: `${page.metadataTitle} | ${normalizedSettings.siteName || SITE_NAME}`,
      description: page.metadataDescription,
      url: absoluteUrlForLocale(path, locale),
      siteName: normalizedSettings.siteName || SITE_NAME,
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title: `${page.metadataTitle} | ${normalizedSettings.siteName || SITE_NAME}`,
      description: page.metadataDescription,
    },
  };
}
