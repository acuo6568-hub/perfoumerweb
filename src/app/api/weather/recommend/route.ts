import { NextResponse } from "next/server";

import { getPerfumes } from "@/lib/catalog";
import { getSiteSettings } from "@/lib/site-settings";
import {
  buildWeatherAdvice,
  getWeatherCitiesForCountry,
  rankWeatherPerfumes,
  resolveWeatherCity,
  seasonFromDate,
  weatherMoodFromCode,
  type WeatherSnapshot,
} from "@/lib/weather-perfume";

type OpenMeteoCurrent = {
  time?: string;
  temperature_2m?: number;
  relative_humidity_2m?: number;
  precipitation?: number;
  weather_code?: number;
  wind_speed_10m?: number;
};

type OpenMeteoResponse = {
  current?: OpenMeteoCurrent;
  timezone?: string;
};

const weatherCache = new Map<string, { expiresAt: number; payload: unknown }>();

function readCountryCode(request: Request) {
  const headers = request.headers;
  const fromHeader =
    headers.get("x-vercel-ip-country") ||
    headers.get("cf-ipcountry") ||
    headers.get("x-country-code") ||
    "";
  if (fromHeader.trim()) return fromHeader.trim().toUpperCase();

  const timezone = new URL(request.url).searchParams.get("timezone") || "";
  if (timezone === "Asia/Baku") return "AZ";
  if (timezone === "Europe/Berlin") return "DE";
  if (timezone === "Europe/Istanbul") return "TR";
  if (timezone.startsWith("America/")) return "US";
  return "";
}

function isNightForTimezone(timezone: string) {
  try {
    const hour = Number(
      new Intl.DateTimeFormat("en-US", {
        hour: "2-digit",
        hour12: false,
        timeZone: timezone,
      }).format(new Date()),
    );
    return hour < 7 || hour >= 19;
  } catch {
    const hour = new Date().getHours();
    return hour < 7 || hour >= 19;
  }
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const settings = await getSiteSettings();
  const weatherSettings = settings.weather;

  if (!weatherSettings.enabled) {
    return NextResponse.json({ error: "Weather recommendations are disabled." }, { status: 404 });
  }

  const countryCode = readCountryCode(request);
  const availableCities = getWeatherCitiesForCountry(countryCode, weatherSettings.defaultCity);
  const cityParam = url.searchParams.get("city") || "";
  const city = cityParam.trim() ? resolveWeatherCity(cityParam) : availableCities[0] ?? resolveWeatherCity(weatherSettings.defaultCity);
  const cacheKey = `${countryCode || "fallback"}:${city.name}:${weatherSettings.productLimit}:${weatherSettings.cacheMinutes}`;
  const cached = weatherCache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) {
    return NextResponse.json(cached.payload, {
      headers: {
        "Cache-Control": `public, max-age=${weatherSettings.cacheMinutes * 60}`,
      },
    });
  }

  const apiUrl = new URL("https://api.open-meteo.com/v1/forecast");
  apiUrl.searchParams.set("latitude", String(city.latitude));
  apiUrl.searchParams.set("longitude", String(city.longitude));
  apiUrl.searchParams.set("current", "temperature_2m,relative_humidity_2m,precipitation,weather_code,wind_speed_10m");
  apiUrl.searchParams.set("daily", "temperature_2m_max,temperature_2m_min,precipitation_probability_max");
  apiUrl.searchParams.set("timezone", city.timezone);

  const response = await fetch(apiUrl, {
    next: { revalidate: weatherSettings.cacheMinutes * 60 },
  });

  if (!response.ok) {
    return NextResponse.json({ error: "Weather provider unavailable." }, { status: 502 });
  }

  const data = (await response.json()) as OpenMeteoResponse;
  const current = data.current ?? {};
  const weather: WeatherSnapshot = {
    city: city.name,
    temperature: Math.round(Number(current.temperature_2m ?? 0)),
    humidity: Math.round(Number(current.relative_humidity_2m ?? 0)),
    precipitation: Number(current.precipitation ?? 0),
    weatherCode: Math.round(Number(current.weather_code ?? 0)),
    windSpeed: Math.round(Number(current.wind_speed_10m ?? 0)),
    timezone: data.timezone || city.timezone,
    isNight: isNightForTimezone(data.timezone || city.timezone),
    season: seasonFromDate(),
    mood: weatherMoodFromCode(Math.round(Number(current.weather_code ?? 0))),
    advice: "",
  };
  weather.advice = buildWeatherAdvice(weather, weatherSettings);

  const perfumes = await getPerfumes();
  const recommendations = rankWeatherPerfumes(perfumes, weather, weatherSettings).map((match) => ({
    slug: match.perfume.slug,
    name: match.perfume.name,
    brand: match.perfume.brand,
    image: match.perfume.image,
    imageAlt: match.perfume.imageAlt,
    gender: match.perfume.gender,
    sizes: match.perfume.sizes,
    noteSlugs: match.perfume.noteSlugs,
    matchPercent: match.matchPercent,
    reason: match.reason,
  }));

  const payload = {
    city: city.name,
    countryCode: countryCode || city.countryCode,
    availableCities: availableCities.map((item) => ({
      name: item.name,
      countryCode: item.countryCode,
    })),
    weather,
    recommendations,
    attribution: "Weather data by Open-Meteo.com",
    cachedForMinutes: weatherSettings.cacheMinutes,
  };

  weatherCache.set(cacheKey, {
    expiresAt: Date.now() + weatherSettings.cacheMinutes * 60 * 1000,
    payload,
  });

  return NextResponse.json(payload, {
    headers: {
      "Cache-Control": `public, max-age=${weatherSettings.cacheMinutes * 60}`,
    },
  });
}
