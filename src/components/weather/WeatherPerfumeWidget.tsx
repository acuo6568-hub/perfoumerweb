"use client";

import Image from "next/image";
import Link from "next/link";
import { Cloud, CloudRain, Compass, MapPin, Sparkle, Wind } from "@phosphor-icons/react";
import { useEffect, useState } from "react";

import { toLocalePath, type Locale } from "@/lib/i18n";
import { nearestWeatherCity, type WeatherSnapshot } from "@/lib/weather-perfume";
import type { PerfumeSize } from "@/types/catalog";

type WeatherProduct = {
  slug: string;
  name: string;
  brand: string;
  image: string;
  imageAlt: string;
  sizes: PerfumeSize[];
  matchPercent: number;
  reason: string;
};

type WeatherResponse = {
  weather?: WeatherSnapshot;
  recommendations?: WeatherProduct[];
  availableCities?: Array<{ name: string; countryCode: string }>;
  attribution?: string;
  error?: string;
};

type WeatherPerfumeWidgetProps = {
  locale: Locale;
  variant?: "home" | "catalog" | "qoxunu";
  className?: string;
};

function formatPrice(sizes: PerfumeSize[]) {
  const min = sizes.reduce((value, size) => Math.min(value, size.price), Number.POSITIVE_INFINITY);
  return Number.isFinite(min) ? `${min} ₼-dən` : "Qiymət sorğu ilə";
}

function weatherReason(locale: Locale) {
  if (locale === "ru") return "Для мягкой погоды подходят цветочные, чистые мускусные и мягкие древесные ароматы.";
  if (locale === "en") return "Mild weather pairs well with florals, clean musk, and soft woods.";
  return "Mülayim hava üçün çiçəkli, təmiz müşk və yumşaq odunsu qoxular uyğundur.";
}

function weatherMoodLabel(locale: Locale) {
  if (locale === "ru") return "Погода";
  if (locale === "en") return "Weather";
  return "Hava";
}

function nearbyLabel(locale: Locale) {
  if (locale === "ru") return "Рядом";
  if (locale === "en") return "Nearby";
  return "Yaxın şəhər";
}

function fallbackTags(locale: Locale) {
  if (locale === "ru") return ["Чистый", "Дневной", "Легкий"];
  if (locale === "en") return ["Clean", "Daily", "Light"];
  return ["Təmiz", "Gündəlik", "Yüngül"];
}

function buildProductTags(product: WeatherProduct, locale: Locale) {
  const lower = `${product.reason} ${product.name} ${product.brand}`.toLowerCase();
  const dictionary =
    locale === "ru"
      ? [
          { label: "Мускус", tokens: ["musk", "муск"] },
          { label: "Цветочный", tokens: ["floral", "flower", "rose", "çiç", "цвет"] },
          { label: "Древесный", tokens: ["wood", "oud", "odun", "древ"] },
          { label: "Свежий", tokens: ["fresh", "clean", "təmiz", "свеж"] },
          { label: "Легкий", tokens: ["light", "yüngül", "лег"] },
        ]
      : locale === "en"
        ? [
            { label: "Musk", tokens: ["musk"] },
            { label: "Floral", tokens: ["floral", "flower", "rose", "çiç"] },
            { label: "Woody", tokens: ["wood", "oud", "odun"] },
            { label: "Clean", tokens: ["fresh", "clean", "təmiz"] },
            { label: "Light", tokens: ["light", "yüngül"] },
          ]
        : [
            { label: "Müşk", tokens: ["musk", "müşk"] },
            { label: "Çiçəkli", tokens: ["floral", "flower", "rose", "çiç"] },
            { label: "Odunsu", tokens: ["wood", "oud", "odun"] },
            { label: "Təmiz", tokens: ["fresh", "clean", "təmiz"] },
            { label: "Yüngül", tokens: ["light", "yüngül"] },
          ];

  const matches = dictionary
    .filter((entry) => entry.tokens.some((token) => lower.includes(token)))
    .map((entry) => entry.label);

  return Array.from(new Set([...matches, ...fallbackTags(locale)])).slice(0, 3);
}

function AnimatedNumber({ value, suffix = "" }: { value: number; suffix?: string }) {
  const [displayValue, setDisplayValue] = useState(0);

  useEffect(() => {
    const startedAt = performance.now();
    let frameId = 0;

    const tick = (now: number) => {
      const progress = Math.min(1, (now - startedAt) / 650);
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplayValue(Math.round(value * eased));
      if (progress < 1) frameId = requestAnimationFrame(tick);
    };

    frameId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frameId);
  }, [value]);

  return <>{displayValue}{suffix}</>;
}

export function WeatherPerfumeWidget({ locale, variant = "home", className = "" }: WeatherPerfumeWidgetProps) {
  const [selectedCity, setSelectedCity] = useState("");
  const [payload, setPayload] = useState<WeatherResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isLocating, setIsLocating] = useState(false);

  const compact = variant === "qoxunu";
  const title =
    locale === "ru"
      ? "Ароматы для сегодняшней погоды"
      : locale === "en"
        ? "Scents for today’s weather"
        : "Bugünkü hava üçün seçilən ətirlər";
  const subtitle =
    locale === "ru"
      ? "Подбор по температуре, сезону и времени дня."
      : locale === "en"
        ? "Selected by temperature, season, and time of day."
        : "Havanın ritminə uyğun qısa, premium seçim.";
  const cityChoices = [
    ...(payload?.availableCities?.map((city) => city.name) ?? []),
    ...(selectedCity && !(payload?.availableCities ?? []).some((city) => city.name === selectedCity) ? [selectedCity] : []),
  ];

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
    const params = new URLSearchParams();
    const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    if (timezone) params.set("timezone", timezone);
    if (selectedCity) params.set("city", selectedCity);

    fetch(`/api/weather/recommend?${params.toString()}`, { cache: "no-store" })
      .then((response) => response.json())
      .then((data: WeatherResponse) => {
        if (!cancelled) {
          setPayload(data);
          if (!selectedCity && data.weather?.city) {
            setSelectedCity(data.weather.city);
          }
        }
      })
      .catch(() => {
        if (!cancelled) setPayload({ error: "weather_failed" });
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [selectedCity]);

  const useNearestCity = () => {
    if (!navigator.geolocation) return;
    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const city = nearestWeatherCity(position.coords.latitude, position.coords.longitude);
        setSelectedCity(city.name);
        setIsLocating(false);
      },
      () => setIsLocating(false),
      { enableHighAccuracy: false, timeout: 5500, maximumAge: 30 * 60 * 1000 },
    );
  };

  const weather = payload?.weather;
  const products = payload?.recommendations ?? [];
  const visibleProducts = products.slice(0, compact ? 5 : 8);
  const WeatherIcon = weather?.precipitation
    ? CloudRain
    : weather?.windSpeed && weather.windSpeed >= 22
      ? Wind
      : weather?.mood
        ? Cloud
        : Sparkle;
  const weatherCityLabel = weather?.city ?? selectedCity;

  return (
    <section
      className={[
        compact ? "mt-6" : "mt-10",
        "weather-widget-fade border-y border-zinc-200/70 bg-[#f8f6f1]/45 py-6 sm:py-7",
        className,
      ].join(" ")}
    >
      <div className="mx-auto max-w-[1540px] px-0">
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div className="min-w-0">
            <p className="text-[0.68rem] font-semibold tracking-[0.2em] text-[#a2844b] uppercase">Perfoumer Weather</p>
            <h2 className="mt-2 font-serif text-[2rem] leading-[1.02] text-zinc-950 sm:text-[2.45rem] md:text-[2.8rem]">
              {title}
            </h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-zinc-500">{weatherReason(locale)}</p>
            <p className="mt-1 text-xs leading-5 text-zinc-400">{subtitle}</p>
          </div>

          <div className="weather-pill-shimmer inline-flex w-fit max-w-full items-center gap-2 overflow-hidden rounded-full border border-zinc-200/90 bg-white/82 px-4 py-2 text-sm font-semibold text-zinc-900 shadow-[0_10px_28px_rgba(24,24,24,0.04)] backdrop-blur">
            <MapPin size={15} weight="bold" className="shrink-0 text-zinc-800" />
            <span className="truncate">{weatherCityLabel || "..."}</span>
            <span className="text-zinc-300">·</span>
            <span>{isLoading ? "..." : <AnimatedNumber value={weather?.temperature ?? 0} suffix="°C" />}</span>
            <span className="text-zinc-300">·</span>
            <WeatherIcon size={17} weight="duotone" className="shrink-0 text-zinc-800" />
            <span className="truncate">{weather?.mood ?? weatherMoodLabel(locale)}</span>
          </div>
        </div>

        <div className="mt-5 flex flex-wrap gap-2">
          {cityChoices.map((city) => (
            <button
              key={city}
              type="button"
              onClick={() => setSelectedCity(city)}
              className={[
                "h-8 rounded-full border px-3 text-xs font-semibold transition",
                selectedCity === city ? "border-zinc-950 bg-zinc-950 text-white shadow-[0_8px_18px_rgba(24,24,24,0.12)]" : "border-zinc-200 bg-white/80 text-zinc-600 hover:border-zinc-300 hover:bg-white",
              ].join(" ")}
            >
              {city}
            </button>
          ))}
          <button
            type="button"
            onClick={useNearestCity}
            className="inline-flex h-8 items-center gap-1.5 rounded-full border border-zinc-200 bg-white/80 px-3 text-xs font-semibold text-zinc-600 transition hover:border-zinc-300 hover:bg-white"
          >
            <Compass size={13} weight="bold" />
            {isLocating ? "..." : nearbyLabel(locale)}
          </button>
        </div>

        <div className="mt-6 flex snap-x gap-4 overflow-x-auto pb-3 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {(isLoading ? [] : visibleProducts).map((perfume, index) => (
            <Link
              key={perfume.slug}
              href={toLocalePath(`/perfumes/${perfume.slug}`, locale)}
              className="weather-product-card group min-w-[9.8rem] snap-start rounded-[0.95rem] border border-transparent bg-transparent p-1 transition duration-300 hover:-translate-y-1 sm:min-w-[11.2rem]"
              style={{ animationDelay: `${index * 80}ms` }}
            >
              <div className="relative aspect-[1.08] overflow-hidden rounded-[0.9rem] border border-zinc-100 bg-white/72 shadow-[0_12px_32px_rgba(24,24,24,0.04)]">
                <Image
                  src={perfume.image || "/perfoumerlogo.png"}
                  alt={perfume.imageAlt || `${perfume.brand} ${perfume.name}`}
                  fill
                  sizes="180px"
                  className="object-contain p-4 transition duration-500 group-hover:scale-[1.045]"
                />
                <span className="absolute bottom-2 right-2 rounded-full border border-zinc-200 bg-[#f4f1eb]/95 px-2 py-0.5 text-[0.68rem] font-bold text-zinc-900 shadow-sm">
                  <AnimatedNumber value={perfume.matchPercent} suffix="%" />
                </span>
              </div>
              <div className="mt-3 min-w-0">
                <p className="truncate text-[0.66rem] font-semibold tracking-[0.16em] text-zinc-500 uppercase">{perfume.brand}</p>
                <h3 className="mt-1 line-clamp-2 min-h-[2.25rem] text-sm font-semibold leading-[1.15] text-zinc-950">{perfume.name}</h3>
              </div>
              <p className="mt-2 text-xs font-semibold text-zinc-900">{formatPrice(perfume.sizes)}</p>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {buildProductTags(perfume, locale).map((tag) => (
                  <span key={tag} className="rounded-full bg-[#ebe7df] px-2 py-0.5 text-[0.68rem] font-medium text-zinc-600">
                    {tag}
                  </span>
                ))}
              </div>
            </Link>
          ))}

          {isLoading ? Array.from({ length: compact ? 4 : 6 }).map((_, index) => (
            <div key={index} className="weather-product-card min-w-[9.8rem] snap-start p-1 sm:min-w-[11.2rem]" style={{ animationDelay: `${index * 80}ms` }}>
              <div className="aspect-[1.08] rounded-[0.9rem] border border-zinc-100 bg-white/70" />
              <div className="mt-3 h-3 w-16 rounded-full bg-zinc-200/70" />
              <div className="mt-2 h-4 w-28 rounded-full bg-zinc-200/70" />
              <div className="mt-3 h-3 w-20 rounded-full bg-zinc-200/70" />
            </div>
          )) : null}

          {!isLoading && !products.length ? (
            <div className="rounded-[1rem] border border-zinc-200 bg-white/80 p-4 text-sm text-zinc-500">
              Hava əsaslı seçim hazırda yüklənmədi. Bakı üçün standart qoxular göstəriləcək.
            </div>
          ) : null}
        </div>
      </div>
    </section>
  );
}
