import { getStartingPrice, normalizeScentToken } from "@/lib/qoxunu-engine";
import type { SiteWeatherSettings, WeatherConditionRule, WeatherTemperatureRule } from "@/lib/site-branding";
import type { Perfume } from "@/types/catalog";

export type WeatherCity = {
  name: string;
  latitude: number;
  longitude: number;
  timezone: string;
  countryCode: string;
};

export type WeatherSnapshot = {
  city: string;
  temperature: number;
  humidity: number;
  precipitation: number;
  weatherCode: number;
  windSpeed: number;
  timezone: string;
  isNight: boolean;
  season: "spring" | "summer" | "autumn" | "winter";
  mood: string;
  advice: string;
};

export type WeatherPerfumeMatch = {
  perfume: Perfume;
  score: number;
  matchPercent: number;
  reason: string;
};

export const WEATHER_CITIES: WeatherCity[] = [
  { name: "Bakı", latitude: 40.4093, longitude: 49.8671, timezone: "Asia/Baku", countryCode: "AZ" },
  { name: "Sumqayıt", latitude: 40.5897, longitude: 49.6686, timezone: "Asia/Baku", countryCode: "AZ" },
  { name: "Gəncə", latitude: 40.6828, longitude: 46.3606, timezone: "Asia/Baku", countryCode: "AZ" },
  { name: "Leipzig", latitude: 51.3397, longitude: 12.3731, timezone: "Europe/Berlin", countryCode: "DE" },
  { name: "Berlin", latitude: 52.52, longitude: 13.405, timezone: "Europe/Berlin", countryCode: "DE" },
  { name: "Munich", latitude: 48.1374, longitude: 11.5755, timezone: "Europe/Berlin", countryCode: "DE" },
  { name: "Istanbul", latitude: 41.0082, longitude: 28.9784, timezone: "Europe/Istanbul", countryCode: "TR" },
  { name: "Ankara", latitude: 39.9334, longitude: 32.8597, timezone: "Europe/Istanbul", countryCode: "TR" },
  { name: "New York", latitude: 40.7128, longitude: -74.006, timezone: "America/New_York", countryCode: "US" },
  { name: "Los Angeles", latitude: 34.0522, longitude: -118.2437, timezone: "America/Los_Angeles", countryCode: "US" },
  { name: "Chicago", latitude: 41.8781, longitude: -87.6298, timezone: "America/Chicago", countryCode: "US" },
];

export function resolveWeatherCity(value: string | undefined) {
  const normalized = normalizeScentToken(value || "");
  return WEATHER_CITIES.find((city) => normalizeScentToken(city.name) === normalized) ?? WEATHER_CITIES[0];
}

export function getWeatherCitiesForCountry(countryCode: string | undefined, fallbackCityName = "Bakı") {
  const normalizedCountry = (countryCode || "").trim().toUpperCase();
  const countryCities = WEATHER_CITIES.filter((city) => city.countryCode === normalizedCountry);
  if (countryCities.length) return countryCities;

  const fallbackCity = resolveWeatherCity(fallbackCityName);
  return WEATHER_CITIES.filter((city) => city.countryCode === fallbackCity.countryCode);
}

export function nearestWeatherCity(latitude: number, longitude: number) {
  return WEATHER_CITIES
    .map((city) => ({
      city,
      distance: Math.hypot(city.latitude - latitude, city.longitude - longitude),
    }))
    .sort((a, b) => a.distance - b.distance)[0]?.city ?? WEATHER_CITIES[0];
}

export function weatherMoodFromCode(code: number) {
  if ([0, 1].includes(code)) return "Günəşli";
  if ([2, 3].includes(code)) return "Buludlu";
  if ([45, 48].includes(code)) return "Dumanlı";
  if ((code >= 51 && code <= 67) || (code >= 80 && code <= 82)) return "Yağışlı";
  if (code >= 71 && code <= 77) return "Qarlı";
  if (code >= 95) return "Fırtınalı";
  return "Mülayim";
}

export function seasonFromDate(date = new Date()): WeatherSnapshot["season"] {
  const month = date.getMonth() + 1;
  if (month >= 3 && month <= 5) return "spring";
  if (month >= 6 && month <= 8) return "summer";
  if (month >= 9 && month <= 11) return "autumn";
  return "winter";
}

function noteTokens(perfume: Perfume) {
  return [
    ...perfume.noteSlugs.top,
    ...perfume.noteSlugs.heart,
    ...perfume.noteSlugs.base,
    perfume.name,
    perfume.brand,
  ]
    .flatMap((item) => String(item).split(/[\s,/&]+/))
    .map(normalizeScentToken)
    .filter(Boolean);
}

function tokenSet(perfume: Perfume) {
  return new Set(noteTokens(perfume));
}

function expandToken(value: string) {
  const token = normalizeScentToken(value);
  const expansions: Record<string, string[]> = {
    fresh: ["citrus", "bergamot", "lemon", "grapefruit", "neroli", "green", "tea", "marine", "aquatic", "musk"],
    citrus: ["citrus", "bergamot", "lemon", "mandarin", "grapefruit", "neroli"],
    aquatic: ["aquatic", "marine"],
    green: ["green", "tea", "vetiver"],
    "clean-musk": ["musk", "tea", "iris"],
    musk: ["musk"],
    floral: ["rose", "jasmine", "iris", "peony", "lily", "magnolia", "violet"],
    "soft-woody": ["cedar", "sandalwood", "vetiver", "woody"],
    woody: ["cedar", "sandalwood", "vetiver", "patchouli", "woody"],
    amber: ["amber", "benzoin", "labdanum"],
    "soft-amber": ["amber", "benzoin", "musk"],
    vanilla: ["vanilla", "tonka"],
    oud: ["oud"],
    tobacco: ["tobacco"],
    leather: ["leather"],
    incense: ["incense"],
    spicy: ["spice", "pepper", "cardamom", "saffron", "cinnamon"],
    "warm-spicy": ["spice", "pepper", "cardamom", "saffron", "cinnamon", "amber"],
    "light-citrus": ["bergamot", "lemon", "grapefruit", "neroli"],
    "fresh-green": ["green", "tea", "vetiver", "citrus"],
    "heavy-sweet": ["vanilla", "tonka", "caramel", "amber"],
    "heavy-vanilla": ["vanilla", "tonka", "caramel"],
    "very-sweet": ["vanilla", "tonka", "caramel"],
    "date-night": ["amber", "vanilla", "musk", "rose", "jasmine", "oud"],
    clean: ["musk", "citrus", "tea", "iris"],
    "office-safe": ["bergamot", "neroli", "tea", "musk", "iris"],
  };

  return expansions[token] ?? [token];
}

function matchesAny(perfumeTokens: Set<string>, values: string[]) {
  let count = 0;
  for (const value of values.flatMap(expandToken)) {
    if (perfumeTokens.has(value)) count += 1;
  }
  return count;
}

function activeTemperatureRule(weather: WeatherSnapshot, settings: SiteWeatherSettings): WeatherTemperatureRule {
  return settings.temperatureRules.find((rule) => {
    const aboveMin = rule.min === null || weather.temperature >= rule.min;
    const belowMax = rule.max === null || weather.temperature <= rule.max;
    return aboveMin && belowMax;
  }) ?? settings.temperatureRules[0];
}

function activeConditionRules(weather: WeatherSnapshot, settings: SiteWeatherSettings): WeatherConditionRule[] {
  return settings.conditionRules.filter((rule) => {
    if (rule.condition === "rainy") return weather.precipitation > 0 || weather.weatherCode >= 51;
    if (rule.condition === "windy") return weather.windSpeed >= 22;
    if (rule.condition === "humid") return weather.humidity >= 70;
    if (rule.condition === "night") return weather.isNight;
    if (rule.condition === "day") return !weather.isNight;
    return false;
  });
}

function seasonMatch(perfume: Perfume, weather: WeatherSnapshot) {
  const attrs = perfume.attributes;
  if (!attrs?.season?.length) return 0.55;
  return attrs.season.map(normalizeScentToken).includes(weather.season) ? 1 : 0.35;
}

function projectionWeatherScore(perfume: Perfume, weather: WeatherSnapshot) {
  const projection = normalizeScentToken(perfume.attributes?.projection || "");
  const longevity = normalizeScentToken(perfume.attributes?.longevity || "");
  if (weather.windSpeed >= 22) {
    return ["strong", "bold", "beast", "long"].includes(projection) || ["long", "beast"].includes(longevity) ? 1 : 0.55;
  }
  if (weather.temperature >= 28 || weather.humidity >= 70) {
    return ["skin", "close", "moderate", ""].includes(projection) ? 0.85 : 0.5;
  }
  return 0.7;
}

function scoreToPercent(score: number) {
  return Math.max(0, Math.min(100, Math.round(score * 100)));
}

export function buildWeatherAdvice(weather: WeatherSnapshot, settings: SiteWeatherSettings) {
  const tempRule = activeTemperatureRule(weather, settings);
  const conditionRules = activeConditionRules(weather, settings);
  const recommended = [...tempRule.recommend, ...conditionRules.flatMap((rule) => rule.recommend), ...conditionRules.flatMap((rule) => rule.boost)];

  if (weather.temperature >= 28 || weather.humidity >= 70) {
    return "Bu gün yüngül, təmiz və sitrus notalı ətirlər daha uyğundur.";
  }
  if (weather.temperature < 10 || weather.isNight) {
    return "Bu hava üçün isti amber, vanil və daha dərin imza qoxuları daha yaxşı işləyir.";
  }
  if (weather.precipitation > 0 || weather.weatherCode >= 51) {
    return "Yağışlı havada təmiz müşk, iris, çay və yumşaq odunsu notalar daha səliqəli hiss olunur.";
  }
  if (recommended.includes("floral")) {
    return "Mülayim hava çiçəkli, təmiz müşk və yumşaq odunsu qoxular üçün idealdır.";
  }
  return "Havanın ritminə görə balanslı, rahat və gündəlik istifadə üçün seçilmiş qoxular önə çıxır.";
}

function buildReason(perfume: Perfume, weather: WeatherSnapshot, tempRule: WeatherTemperatureRule, conditionRules: WeatherConditionRule[]) {
  const tokens = tokenSet(perfume);
  if (weather.temperature >= 28 && matchesAny(tokens, ["citrus", "fresh", "musk"])) {
    return "İsti hava üçün yüngül sitrus və təmiz müşk notalarına görə uyğundur.";
  }
  if (weather.humidity >= 70 && matchesAny(tokens, ["aquatic", "green", "clean-musk"])) {
    return "Rütubətli havada yüngül, təmiz və yaşıl tonları daha rahat hiss olunur.";
  }
  if (conditionRules.some((rule) => rule.condition === "rainy") && matchesAny(tokens, ["woody", "iris", "tea", "soft-amber"])) {
    return "Yağışlı havada iris, çay və yumşaq odunsu notalar daha zərif oturur.";
  }
  if (weather.isNight && matchesAny(tokens, ["amber", "vanilla", "oud", "tobacco", "musk"])) {
    return "Axşam saatları üçün daha isti, dərin və yadda qalan iz yaradır.";
  }
  if (matchesAny(tokens, tempRule.recommend)) {
    return "Bugünkü temperatur üçün seçilən qoxu ailələri ilə yaxşı uyğunlaşır.";
  }
  return "Hava, mövsüm və istifadə ritminə görə balanslı alternativ kimi seçildi.";
}

export function rankWeatherPerfumes(perfumes: Perfume[], weather: WeatherSnapshot, settings: SiteWeatherSettings): WeatherPerfumeMatch[] {
  const tempRule = activeTemperatureRule(weather, settings);
  const conditionRules = activeConditionRules(weather, settings);
  const recommended = [...tempRule.recommend, ...conditionRules.flatMap((rule) => rule.recommend)];
  const boosted = [...conditionRules.flatMap((rule) => rule.boost), ...tempRule.goodFor];
  const avoided = [...tempRule.avoid, ...conditionRules.flatMap((rule) => rule.avoid)];

  return perfumes
    .map((perfume) => {
      const tokens = tokenSet(perfume);
      const temperatureMatch = Math.min(1, matchesAny(tokens, tempRule.recommend) / 3);
      const humidityMatch = weather.humidity >= 70 ? Math.min(1, matchesAny(tokens, ["light-citrus", "aquatic", "fresh-green", "clean-musk"]) / 2) : 0.75;
      const weatherConditionMatch = conditionRules.length ? Math.min(1, matchesAny(tokens, recommended) / 3) : 0.72;
      const timeOfDayMatch = Math.min(1, matchesAny(tokens, weather.isNight ? ["amber", "vanilla", "oud", "tobacco", "musk", "date-night"] : ["fresh", "citrus", "clean", "office-safe"]) / 2);
      const seasonScore = seasonMatch(perfume, weather);
      const stockBonus = perfume.inStock ? 1 : 0.25;
      const projectionScore = projectionWeatherScore(perfume, weather);
      const avoidPenalty = Math.min(0.24, matchesAny(tokens, avoided) * 0.08);
      const boostScore = Math.min(0.08, matchesAny(tokens, boosted) * 0.025);

      const score =
        temperatureMatch * 0.35 +
        humidityMatch * 0.15 +
        weatherConditionMatch * 0.2 +
        timeOfDayMatch * 0.15 +
        seasonScore * 0.1 +
        stockBonus * 0.05 +
        projectionScore * 0.08 +
        boostScore -
        avoidPenalty;

      return {
        perfume,
        score: Math.round(Math.max(0, score) * 1000) / 1000,
        matchPercent: scoreToPercent(Math.max(0, score)),
        reason: buildReason(perfume, weather, tempRule, conditionRules),
      };
    })
    .filter((item) => Number.isFinite(getStartingPrice(item.perfume)))
    .sort((a, b) => b.score - a.score)
    .slice(0, settings.productLimit);
}
