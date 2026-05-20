import {
  applySiteBranding,
  normalizeSiteSettings,
  type SiteSettings,
} from "@/lib/site-branding";

export const locales = ["az", "en", "ru"] as const;

export type Locale = (typeof locales)[number];

export const defaultLocale: Locale = "az";
export const localeRequestHeader = "x-perfoumer-locale";

export function isLocale(value?: string | null): value is Locale {
  return value === "az" || value === "en" || value === "ru";
}

export function stripLocalePrefix(pathname: string): { locale?: Locale; pathname: string } {
  const normalized = pathname.startsWith("/") ? pathname : `/${pathname}`;
  const [_, maybeLocale, ...rest] = normalized.split("/");

  if (isLocale(maybeLocale)) {
    const stripped = `/${rest.join("/")}`.replace(/\/$/, "");
    return {
      locale: maybeLocale,
      pathname: stripped === "" ? "/" : stripped,
    };
  }

  return { pathname: normalized };
}

export function toLocalePath(pathname: string, locale: Locale): string {
  const { pathname: stripped } = stripLocalePrefix(pathname || "/");
  if (locale === defaultLocale) {
    return stripped || "/";
  }
  if (stripped === "/") {
    return `/${locale}`;
  }
  return `/${locale}${stripped}`;
}

export function toLocaleHref(href: string, locale: Locale): string {
  if (!href.startsWith("/")) {
    return href;
  }

  const url = new URL(href, "https://perfoumer.local");
  return `${toLocalePath(url.pathname, locale)}${url.search}${url.hash}`;
}

export function normalizeLocale(value?: string | null): Locale {
  if (value === "en" || value === "ru") {
    return value;
  }

  return defaultLocale;
}

export function formatMessage(
  template: string,
  values: Record<string, string | number>,
) {
  return template.replace(/\{(\w+)\}/g, (_, key) => String(values[key] ?? ""));
}

export const translations = {
  az: {
    languages: {
      az: "AZ",
      en: "EN",
      ru: "RU",
    },
    header: {
      home: "Ana Səhifə",
      about: "Haqqımızda",
      products: "Məhsullar",
      cart: "Səbət",
      compare: "Müqayisə",
      scentQuiz: "Qoxunu Tap",
      brands: "Brendlər",
      contact: "Əlaqə",
      tagline: "Sənə aid olan qoxunu seç",
      openMenu: "Menyunu aç",
      closeMenu: "Menyunu bağla",
    },
    hero: {
      eyebrow: "Perfoumer",
      title: "Orijinal və Premium Ətirlər Onlayn.",
      description: "Ruhunuzu oyandıran incə və unudulmaz qoxularla tanış olun.",
      discover: "Yeni Ətirləri Kəşf Et",
      viewAll: "Bütün Məhsulları Gör",
    },
    home: {
      bestSelling: "Ən Çox Satılan",
      selectedTitle: "Sizin üçün Seçilmiş Ətirlər",
      selectedDescription:
        "Ən sevilən qoxularımızla gündəlik zövqünüzü tamamlayın.",
      showMore: "Daha Çox Göstər",
      statsEyebrow: "Statistika",
      statsTitle: "Niyə Məhz Biz?",
      statsDescription:
        "Ətir sənətinə olan ehtirasımızın necə minlərlə sevənlərin qəlbinə yol tapdığını kəşf edin",
      stats: [
        {
          title: "Müştəri Məmnuniyyəti",
          description:
            "Müştərilərimizin 97%-i imza ətirini bizdə tapır və təkrar geri qayıdır",
        },
        {
          title: "Yeni Yaradılanlar",
          description:
            "Son onillikdə 900-dən çox eksklüziv ətir diqqətlə təqdim olunub",
        },
        {
          title: "Xoşbəxt Müştərilər",
          description:
            "15,000-dən çox ətirsevər gündəlik rituallarını zənginləşdirmək üçün bizə güvənir",
        },
        {
          title: "Mükəmməllik Qiyməti",
          description:
            "Ətirlərimiz keyfiyyət, qalıcılıq və incəlik baxımından 4.9/5 ulduzla dəyərləndirilir",
        },
      ],
    },
    footer: {
      contact: "Bizimlə Əlaqə",
      pages: "Lazımlı Səhifələr",
      social: "Social Media",
      about: "Haqqımızda",
      products: "Məhsullar",
      brands: "Brendlər",
      blog: "Blog",
      contactLink: "Əlaqə",
      securePayment: "Güvənli ödəniş üsulları",
      fastDelivery: "Sürətli çatdırılma",
      easyReturns: "Sifarişin sürətli və asan qaytarılması",
      styleHandle: "@PERFOUMERAZ",
      styleTitle: "Perfoumer yeniliklərindən geri qalma",
      styleDescription:
        "Eksklüziv endirimlər, yeni gələn ətirlər və seçilmiş kampaniyalar barədə ilk məlumatı e-poçtuna göndərək.",
      styleEmailPlaceholder: "Email ünvanınızı daxil edin",
      styleSubscribe: "Abunə olun",
      styleInvalidEmail: "Zəhmət olmasa düzgün email daxil edin.",
      styleSubmitting: "Göndərilir...",
      styleSuccessTitle: "Abunəlik tamamlandı",
      styleSuccess: "Abunəliyiniz təsdiqləndi. Tezliklə ilk yeniliyi paylaşacağıq.",
      styleFailed: "Abunəlik alınmadı. Zəhmət olmasa yenidən cəhd edin.",
    },
    productCard: {
      starting: "Başlayan",
      quote: "Qiymət sorğu ilə",
      variantBadge: "{count} versiya",
      discountBadge: "{percent}% endirim",
    },
    offersPage: {
      eyebrow: "Təkliflər",
      title: "Endirimdə olan ətirlər",
      description: "Aktiv endirimli bütün ətirləri bir yerdə görün və ən yaxşı təklifləri seçin.",
      empty: "Hazırda aktiv endirim yoxdur.",
    },
    catalogPage: {
      title: "Hər Zaman Sevilən Məhsullar",
      description:
        "Məhsullarımızı kəşf edin - qonaqlarımızın yenidən və yenidən seçdiyi seçimlər.",
    },
    catalog: {
      filters: "Kataloq Filtrləri",
      signature: "İmza qoxunuzu incə filtrlərlə tapın",
      noteDiscovery: "{note} üçün uyğun ətirləri kəşf edin",
      choices: "seçim",
      reset: "Təmizlə",
      mobileFilter: "Mobil Filtr",
        activeChoices: "{count} seçim aktivdir",
        refine: "Dəqiqləşdir",
        close: "Bağla",
      showFilters: "Filtrləri göstər",
      showFiltersForNote: "{note} üçün filtrləri göstər",
      searchPlaceholder: "Ətir və ya brend axtarın",
      searchSuggestionsTitle: "Ağıllı təkliflər",
      searchSuggestionBrand: "Brend",
      searchSuggestionPerfume: "Ətir",
      variantCountLabel: "{count} versiya",
      brand: "Brend",
      allBrands: "Bütün Brendlər",
      sort: "Sıralama",
      featured: "Seçilmiş",
      nameAsc: "A-Z",
      priceAsc: "Qiymət: Ucuzdan Bahaya",
      priceDesc: "Qiymət: Bahadan Ucuza",
      all: "Hamısı",
      topNote: "Üst Not",
      topNotes: "Üst Notlar",
      heartNote: "Ürək Not",
      heartNotes: "Ürək Notlar",
      baseNote: "Baza Not",
      baseNotes: "Baza Notlar",
      found: "{count} məhsul tapıldı",
      clickMore: "Daha çox göstərmək üçün klikləyin",
      loadMore: "Daha Çox Göstər",
      noResults: "Bu filtrlərlə uyğun məhsul tapılmadı.",
    },
    brandsPage: {
      eyebrow: "Brendlər",
      title: "Bütün ətir evləri əlifba ilə",
      description:
        "İstədiyiniz brendi seçin və həmin brendə aid bütün ətirləri kataloqda hazır filtr ilə görün.",
      cardHint: "Bu brendin ətirlərini göstər",
    },
    notePage: {
      eyebrow: "Not Kataloqu",
      title: "{note} ilə seçilən ətirlər",
      description:
        "Bu səhifə yalnız {note} notasına sahib ətirləri göstərir. Aşağıdan notun hansı mərhələdə görünəcəyini seçə bilərsiniz.",
      top: "Üst notları",
      heart: "Ürək notları",
      base: "Baza notları",
    },
    detail: {
      store: "Mağaza",
      perfume: "ətiri",
      sizePrice: "Ölçü və qiymət",
      choose: "Seçiminizi müəyyən edin",
      premiumSize: "Premium ölçü",
      readyPrice: "Hazır qiymət",
      variants: "Versiyalar",
      variantsAvailable: "{count} versiya mövcuddur",
      currentVariant: "Cari",
      variantInfoButton: "Nədir?",
      variantInfoEyebrow: "Variantlar",
      variantInfoTitle: "Bu nə üçündür?",
      variantInfoBody:
        "Eyni ətirin bir neçə versiyası ola bilər: fərqli partiya, miqdar, qiymət və ya alış bağlantısı ilə. Bu düymələr sizə versiyaları yan-yana görməyə və ən uyğun olanı tez seçməyə kömək edir.",
      close: "Bağla",
      topNotes: "Üst notları",
      heartNotes: "Ürək notları",
      baseNotes: "Baza notları",
      more: "Daha Çoxu",
      order: "Sifariş Et",
      back: "Geri qayıt",
      backToHome: "Ana səhifəyə qayıt",
      backToCatalog: "Kataloqa qayıt",
      similarProducts: "Bənzər ətirlər",
      similarProductsHint: "Notlar, qoxu ailəsi, brend tonu və qiymət yaxınlığına əsasən seçildi.",
      moreProducts: "Sizə uyğun premium seçimlər",
      moreProductsHint: "Bu seçimlər not, brend və ümumi üslub uyğunluğuna görə sıralanıb.",
      otherProducts: "Digər Məhsullar",
      noPrice: "Qiymət məlumatı hazırda yoxdur.",
      about: "Haqqımızda",
      aboutText:
        "Perfoumer sizə hər zövqə uyğun 5000-dən çox premium ətri təqdim edir. Qadın, kişi və uniseks seçimlərimizlə öz üslubunuza ən uyğun qoxunu tapmaq indi daha asandır. Keyfiyyətli, original və hər kəs üçün əlçatan qiymətlərlə təqdim etdiyimiz ətirlər gündəlik həyatınıza xüsusi bir zəriflik qatır.",
      delivery: "Çatdırılma",
      deliveryText:
        "Perfoumer sifarişlərinizi 1-3 iş günü ərzində hazırlayır. Standart çatdırılma (5-7 gün) və ekspress çatdırılma (2-3 gün) mövcuddur. Beynəlxalq sifarişlər üçün çatdırılma müddəti 7-14 gün ola bilər. Hər bağlama sığortalanır və izləmə nömrəsi ilə təqdim olunur.",
      returns: "Qaytarılma",
      returnsText:
        "Perfoumer alışınızdan razı qalmağınızı istəyir. Əgər tam razı qalmadınızsa, məhsulu çatdırıldıqdan sonra 30 gün ərzində qaytara bilərsiniz. Qaytarılan məhsul istifadə olunmamış, orijinal vəziyyətdə və qutusu ilə birlikdə olmalıdır. Qüsurlu və ya səhv məhsul olduqda geri ödəniş Perfoumer tərəfindən təmin edilir.",
    },
    modal: {
      info: "Məlumat",
      title: "Şəkil tanıtım xarakteri daşıyır",
      body: "Ətir şəkli yalnız tanıtım məqsədi daşıyır. Məhsullarımız öz brendimizə məxsus yüksək keyfiyyətli qablaşdırmada göndərilir.",
    },
    notFound: {
      title: "Məhsul tapılmadı",
      description: "Link köhnə və ya səhv ola bilər.",
      back: "Ana səhifəyə qayıt",
    },
    admin: {
      removeBg: "Fonu Sil",
      removeBgTooltip: "Şəkillərdən (adətən çəhrayı) fonu qaldırın",
      removeBgProcessing: "Fon silinir...",
      removeBgSuccess: "Fon uğurla silindi",
      removeBgError: "Fon silmə xətası",
      removeBgUnavailable: "Fon silmə xidməti konfiqurasiya edilməyib",
    },
  },
  en: {
    languages: {
      az: "AZ",
      en: "EN",
      ru: "RU",
    },
    header: {
      home: "Home",
      about: "About",
      products: "Products",
      cart: "Cart",
      compare: "Compare",
      scentQuiz: "Find Your Scent",
      brands: "Brands",
      contact: "Contact",
      tagline: "Choose the scent that defines you",
      openMenu: "Open menu",
      closeMenu: "Close menu",
    },
    hero: {
      eyebrow: "Perfoumer",
      title: "We curate original and premium fragrances for you.",
      description: "Discover subtle and unforgettable scents that elevate your spirit.",
      discover: "Discover New Perfumes",
      viewAll: "View All Products",
    },
    home: {
      bestSelling: "Best Sellers",
      selectedTitle: "Selected Perfumes For You",
      selectedDescription: "Complete your daily taste with our most loved scents.",
      showMore: "Show More",
      statsEyebrow: "Statistics",
      statsTitle: "Why Us?",
      statsDescription:
        "Discover how our passion for perfume artistry has found its way into thousands of hearts.",
      stats: [
        {
          title: "Customer Satisfaction",
          description:
            "97% of our customers find their signature scent with us and come back again.",
        },
        {
          title: "New Creations",
          description:
            "More than 900 exclusive perfumes have been carefully presented over the last decade.",
        },
        {
          title: "Happy Customers",
          description:
            "Over 15,000 fragrance lovers trust us to enrich their daily rituals.",
        },
        {
          title: "Excellence Rating",
          description:
            "Our perfumes are rated 4.9/5 for quality, longevity, and refinement.",
        },
      ],
    },
    footer: {
      contact: "Contact Us",
      pages: "Useful Pages",
      social: "Social Media",
      about: "About",
      products: "Products",
      brands: "Brands",
      blog: "Blog",
      contactLink: "Contact",
      securePayment: "Secure payment methods",
      fastDelivery: "Fast delivery",
      easyReturns: "Quick and easy returns",
      styleHandle: "@PERFOUMERAZ",
      styleTitle: "Stay in the Perfoumer loop",
      styleDescription:
        "Get first access to exclusive offers, newly arrived scents, and selected campaign updates.",
      styleEmailPlaceholder: "Enter your email",
      styleSubscribe: "Subscribe",
      styleInvalidEmail: "Please enter a valid email address.",
      styleSubmitting: "Submitting...",
      styleSuccessTitle: "Subscription complete",
      styleSuccess: "Subscription confirmed. We will send your first update soon.",
      styleFailed: "Could not complete subscription. Please try again.",
    },
    productCard: {
      starting: "Starting",
      quote: "Price on request",
      variantBadge: "{count} variants",
      discountBadge: "{percent}% off",
    },
    offersPage: {
      eyebrow: "Offers",
      title: "Discounted perfumes",
      description: "See all perfumes with active discounts in one place and choose the best deal.",
      empty: "There are no active offers right now.",
    },
    catalogPage: {
      title: "Always Loved Products",
      description: "Discover the selections our customers keep coming back for.",
    },
    catalog: {
      filters: "Catalog Filters",
      signature: "Find your signature scent with refined filters",
      noteDiscovery: "Discover perfumes matched to {note}",
      choices: "active",
      reset: "Reset",
      mobileFilter: "Mobile Filter",
        activeChoices: "{count} filters active",
        refine: "Refine",
        close: "Close",
      showFilters: "Show filters",
      showFiltersForNote: "Show filters for {note}",
      searchPlaceholder: "Search perfume or brand",
      searchSuggestionsTitle: "Smart suggestions",
      searchSuggestionBrand: "Brand",
      searchSuggestionPerfume: "Perfume",
      variantCountLabel: "{count} variants",
      brand: "Brand",
      allBrands: "All Brands",
      sort: "Sort",
      featured: "Featured",
      nameAsc: "A-Z",
      priceAsc: "Price: Low to High",
      priceDesc: "Price: High to Low",
      all: "All",
      topNote: "Top Note",
      topNotes: "Top Notes",
      heartNote: "Heart Note",
      heartNotes: "Heart Notes",
      baseNote: "Base Note",
      baseNotes: "Base Notes",
      found: "{count} products found",
      clickMore: "Click to see more",
      loadMore: "Load More",
      noResults: "No products found with these filters.",
    },
    brandsPage: {
      eyebrow: "Brands",
      title: "All perfume houses in alphabetical order",
      description:
        "Choose a brand and open the catalog with that brand already filtered.",
      cardHint: "View perfumes from this brand",
    },
    notePage: {
      eyebrow: "Note Catalog",
      title: "Perfumes featuring {note}",
      description:
        "This page shows perfumes that contain the note {note}. Choose whether it appears in the top, heart, or base accord.",
      top: "Top notes",
      heart: "Heart notes",
      base: "Base notes",
    },
    detail: {
      store: "Store",
      perfume: "perfume",
      sizePrice: "Size and price",
      choose: "Choose your format",
      premiumSize: "Premium size",
      readyPrice: "Current price",
      variants: "Variants",
      variantsAvailable: "{count} variants available",
      currentVariant: "Current",
      variantInfoButton: "What is this?",
      variantInfoEyebrow: "Variants",
      variantInfoTitle: "What are variants for?",
      variantInfoBody:
        "The same perfume can appear in multiple versions, such as different listings, prices, or package sizes. These buttons help you compare versions side by side and open the one you want faster.",
      close: "Close",
      topNotes: "Top notes",
      heartNotes: "Heart notes",
      baseNotes: "Base notes",
      more: "Learn More",
      order: "Order",
      back: "Go back",
      backToHome: "Back to home",
      backToCatalog: "Back to catalog",
      similarProducts: "Similar perfumes",
      similarProductsHint: "Matched by note structure, scent family, brand profile, and price proximity.",
      moreProducts: "Smart premium matches for you",
      moreProductsHint: "Ranked by note overlap, brand similarity, and style compatibility.",
      otherProducts: "More Products",
      noPrice: "Price information is currently unavailable.",
      about: "About",
      aboutText:
        "Perfoumer offers more than 5000 premium perfumes for every taste. With selections for women, men, and unisex styles, finding the fragrance that suits you is easier than ever. Our curated perfumes bring elegance to your daily life with quality, originality, and accessible pricing.",
      delivery: "Delivery",
      deliveryText:
        "Perfoumer prepares your orders within 1-3 business days. Standard delivery (5-7 days) and express delivery (2-3 days) are available. International orders may take 7-14 days. Every package is insured and provided with a tracking number.",
      returns: "Returns",
      returnsText:
        "We want you to love your purchase. If you are not fully satisfied, you may return the product within 30 days of delivery. Returned items must be unused, in original condition, and include the box. Refunds for faulty or incorrect products are covered by Perfoumer.",
    },
    modal: {
      info: "Info",
      title: "The image is for presentation purposes",
      body: "The image of the perfume is for illustrative purposes only. Our products come in our own branded high quality packages.",
    },
    notFound: {
      title: "Product not found",
      description: "The link may be outdated or incorrect.",
      back: "Back to home",
    },
    admin: {
      removeBg: "Remove Background",
      removeBgTooltip: "Remove background from images (typically pink backgrounds)",
      removeBgProcessing: "Removing background...",
      removeBgSuccess: "Background removed successfully",
      removeBgError: "Error removing background",
      removeBgUnavailable: "Background removal service is not configured",
    },
  },
  ru: {
    languages: {
      az: "AZ",
      en: "EN",
      ru: "RU",
    },
    header: {
      home: "Главная",
      about: "О нас",
      products: "Товары",
      cart: "Корзина",
      compare: "Сравнение",
      scentQuiz: "Подбор аромата",
      brands: "Бренды",
      contact: "Контакты",
      tagline: "Выбери аромат, который отражает тебя",
      openMenu: "Открыть меню",
      closeMenu: "Закрыть меню",
    },
    hero: {
      eyebrow: "Perfoumer",
      title: "Мы подбираем для вас оригинальные и премиальные ароматы.",
      description: "Откройте для себя тонкие и незабываемые ароматы.",
      discover: "Открыть новинки",
      viewAll: "Смотреть каталог",
    },
    home: {
      bestSelling: "Бестселлеры",
      selectedTitle: "Ароматы, выбранные для вас",
      selectedDescription: "Дополните свой ежедневный ритуал нашими любимыми ароматами.",
      showMore: "Показать больше",
      statsEyebrow: "Статистика",
      statsTitle: "Почему именно мы?",
      statsDescription:
        "Узнайте, как наша страсть к парфюмерному искусству нашла путь к тысячам сердец.",
      stats: [
        {
          title: "Удовлетворенность клиентов",
          description:
            "97% наших клиентов находят у нас свой фирменный аромат и возвращаются снова.",
        },
        {
          title: "Новые коллекции",
          description:
            "За последнее десятилетие мы тщательно представили более 900 эксклюзивных ароматов.",
        },
        {
          title: "Счастливые клиенты",
          description:
            "Более 15 000 любителей ароматов доверяют нам свои ежедневные ритуалы.",
        },
        {
          title: "Оценка качества",
          description:
            "Наши ароматы имеют рейтинг 4.9/5 за качество, стойкость и утонченность.",
        },
      ],
    },
    footer: {
      contact: "Связаться с нами",
      pages: "Полезные страницы",
      social: "Соцсети",
      about: "О нас",
      products: "Товары",
      brands: "Бренды",
      blog: "Блог",
      contactLink: "Контакты",
      securePayment: "Безопасные способы оплаты",
      fastDelivery: "Быстрая доставка",
      easyReturns: "Быстрый и удобный возврат заказа",
      styleHandle: "@PERFOUMERAZ",
      styleTitle: "Будьте в курсе новинок Perfoumer",
      styleDescription:
        "Подпишитесь, чтобы первыми получать новости о специальных предложениях, новых ароматах и актуальных акциях.",
      styleEmailPlaceholder: "Введите ваш email",
      styleSubscribe: "Подписаться",
      styleInvalidEmail: "Пожалуйста, введите корректный email.",
      styleSubmitting: "Отправка...",
      styleSuccessTitle: "Подписка оформлена",
      styleSuccess: "Подписка подтверждена. Скоро отправим первое обновление.",
      styleFailed: "Не удалось оформить подписку. Попробуйте еще раз.",
    },
    productCard: {
      starting: "от",
      quote: "Цена по запросу",
      variantBadge: "{count} вариантов",
      discountBadge: "Скидка {percent}%",
    },
    offersPage: {
      eyebrow: "Предложения",
      title: "Ароматы со скидкой",
      description: "Все активные скидки собраны на одной странице, чтобы было проще выбрать лучшее предложение.",
      empty: "Сейчас нет активных скидок.",
    },
    catalogPage: {
      title: "Всегда любимые товары",
      description: "Откройте для себя подборку, к которой наши гости возвращаются снова и снова.",
    },
    catalog: {
      filters: "Фильтры каталога",
      signature: "Найдите свой фирменный аромат с помощью точных фильтров",
      noteDiscovery: "Откройте ароматы с нотой {note}",
      choices: "активно",
      reset: "Сбросить",
      mobileFilter: "Мобильный фильтр",
        activeChoices: "Активно фильтров: {count}",
        refine: "Уточнить",
        close: "Закрыть",
      showFilters: "Показать фильтры",
      showFiltersForNote: "Показать фильтры для {note}",
      searchPlaceholder: "Поиск по аромату или бренду",
      searchSuggestionsTitle: "Умные подсказки",
      searchSuggestionBrand: "Бренд",
      searchSuggestionPerfume: "Аромат",
      variantCountLabel: "{count} вариантов",
      brand: "Бренд",
      allBrands: "Все бренды",
      sort: "Сортировка",
      featured: "Избранное",
      nameAsc: "A-Z",
      priceAsc: "Цена: по возрастанию",
      priceDesc: "Цена: по убыванию",
      all: "Все",
      topNote: "Верхняя нота",
      topNotes: "Верхние ноты",
      heartNote: "Сердечная нота",
      heartNotes: "Ноты сердца",
      baseNote: "Базовая нота",
      baseNotes: "Базовые ноты",
      found: "Найдено товаров: {count}",
      clickMore: "Нажмите, чтобы показать больше",
      loadMore: "Показать больше",
      noResults: "По этим фильтрам ничего не найдено.",
    },
    brandsPage: {
      eyebrow: "Бренды",
      title: "Все парфюмерные дома в алфавитном порядке",
      description:
        "Выберите бренд и откройте каталог уже с включенным фильтром по нему.",
      cardHint: "Показать ароматы бренда",
    },
    notePage: {
      eyebrow: "Каталог нот",
      title: "Ароматы с нотой {note}",
      description:
        "На этой странице показаны ароматы с нотой {note}. Выберите, появляется ли она в верхних, сердечных или базовых нотах.",
      top: "Верхние ноты",
      heart: "Ноты сердца",
      base: "Базовые ноты",
    },
    detail: {
      store: "Бутик",
      perfume: "аромат",
      sizePrice: "Объем и цена",
      choose: "Выберите формат",
      premiumSize: "Премиум объем",
      readyPrice: "Текущая цена",
      variants: "Варианты",
      variantsAvailable: "Доступно {count} вариантов",
      currentVariant: "Текущий",
      variantInfoButton: "Что это?",
      variantInfoEyebrow: "Варианты",
      variantInfoTitle: "Для чего нужны варианты?",
      variantInfoBody:
        "Один и тот же аромат может быть представлен в нескольких версиях: с разными ценами, объемами или карточками товара. Эти кнопки помогают сравнить версии рядом и быстрее открыть нужную.",
      close: "Закрыть",
      topNotes: "Верхние ноты",
      heartNotes: "Ноты сердца",
      baseNotes: "Базовые ноты",
      more: "Подробнее",
      order: "Заказать",
      back: "Назад",
      backToHome: "Назад на главную",
      backToCatalog: "Назад в каталог",
      similarProducts: "Похожие ароматы",
      similarProductsHint: "Подбор по структуре нот, ароматическому профилю, бренду и близости цены.",
      moreProducts: "Умные премиальные рекомендации",
      moreProductsHint: "Подбор с учетом совпадения нот, бренда и общего стиля.",
      otherProducts: "Другие товары",
      noPrice: "Информация о цене сейчас недоступна.",
      about: "О нас",
      aboutText:
        "Perfoumer предлагает более 5000 премиальных ароматов на любой вкус. Женские, мужские и унисекс варианты помогают легко найти аромат, который подходит именно вам. Мы привносим элегантность в повседневную жизнь благодаря качеству, оригинальности и доступной цене.",
      delivery: "Доставка",
      deliveryText:
        "Perfoumer подготавливает заказы в течение 1-3 рабочих дней. Доступна стандартная доставка (5-7 дней) и экспресс-доставка (2-3 дня). Международные заказы могут занять 7-14 дней. Каждая посылка застрахована и отправляется с трек-номером.",
      returns: "Возврат",
      returnsText:
        "Мы хотим, чтобы вы остались довольны покупкой. Если вы не полностью удовлетворены, товар можно вернуть в течение 30 дней после доставки. Возвращаемые товары должны быть неиспользованными, в оригинальном состоянии и с коробкой. Возврат средств за бракованный или неверно отправленный товар покрывается Perfoumer.",
    },
    modal: {
      info: "Информация",
      title: "Изображение носит ознакомительный характер",
      body: "Изображение аромата носит только иллюстративный характер. Наши товары отправляются в фирменной высококачественной упаковке.",
    },
    notFound: {
      title: "Товар не найден",
      description: "Ссылка может быть устаревшей или неверной.",
      back: "Вернуться на главную",
    },
    admin: {
      removeBg: "Удалить фон",
      removeBgTooltip: "Удалить фон изображения (обычно розовый фон)",
      removeBgProcessing: "Удаление фона...",
      removeBgSuccess: "Фон успешно удален",
      removeBgError: "Ошибка при удалении фона",
      removeBgUnavailable: "Сервис удаления фона не настроен",
    },
  },
} as const;

export function getDictionary(locale: Locale, settings?: SiteSettings) {
  return applySiteBranding(translations[locale], normalizeSiteSettings(settings));
}
