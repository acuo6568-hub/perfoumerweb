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
  return Number.isFinite(min) ? `${min} ₼` : "Qiymət sorğu ilə";
}

function startingLabel(locale: Locale) {
  if (locale === "ru") return "От";
  if (locale === "en") return "From";
  return "Başlayan qiymət";
}

function formatStartingPrice(sizes: PerfumeSize[], locale: Locale) {
  return `${formatPrice(sizes)} / ${startingLabel(locale)}`;
}

function matchLabel(locale: Locale) {
  if (locale === "ru") return "совпадение";
  if (locale === "en") return "match";
  return "uyğunluq";
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
  const visibleProducts = products.slice(0, compact ? 5 : 6);
  const featuredProduct = visibleProducts[0] ?? null;
  const secondaryProducts = visibleProducts.slice(1, compact ? 5 : 6);
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
        "weather-widget-fade border-y border-zinc-200/70 bg-[#f7f5ef]/55 py-5 sm:py-6",
        className,
      ].join(" ")}
    >
      <div className="mx-auto max-w-[1540px] px-0">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="min-w-0">
            <h2 className="font-serif text-[1.65rem] leading-[1.05] text-zinc-950 sm:text-[2rem] md:text-[2.25rem]">
              {title}
            </h2>
            <p className="mt-1.5 max-w-2xl text-sm leading-6 text-zinc-500">{weather?.advice || weatherReason(locale)}</p>
          </div>

          <div className="weather-pill-shimmer inline-flex w-fit max-w-full items-center gap-2 overflow-hidden rounded-full border border-zinc-200/90 bg-white/86 px-4 py-2 text-sm font-semibold text-zinc-900 shadow-[0_10px_28px_rgba(24,24,24,0.04)] backdrop-blur">
            <MapPin size={15} weight="bold" className="shrink-0 text-zinc-800" />
            <span className="truncate">{weatherCityLabel || "..."}</span>
            <span className="text-zinc-300">·</span>
            <span>{isLoading ? "..." : <AnimatedNumber value={weather?.temperature ?? 0} suffix="°C" />}</span>
            <span className="text-zinc-300">·</span>
            <WeatherIcon size={17} weight="duotone" className="shrink-0 text-zinc-800" />
            <span className="truncate">{weather?.mood ?? weatherMoodLabel(locale)}</span>
          </div>
        </div>

        <div className="mt-3 flex flex-col gap-3 border-t border-zinc-200/70 pt-3 lg:flex-row lg:items-center lg:justify-between">
          <p className="max-w-3xl text-xs leading-5 text-zinc-500">
            <span className="font-semibold text-zinc-900">{locale === "ru" ? "Настроение дня" : locale === "en" ? "Today’s mood" : "Bugünkü əhval"}:</span>{" "}
            {subtitle}
          </p>
          <div className="flex flex-wrap gap-2">
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
        </div>

        <div className="mt-5 grid gap-3 lg:grid-cols-[minmax(18rem,1.45fr)_minmax(0,3fr)] lg:items-stretch">
          {isLoading ? (
            <div className="weather-product-card min-h-[23rem] rounded-[1.45rem] border border-zinc-200/80 bg-white/70 p-4 sm:rounded-[1.9rem]" />
          ) : featuredProduct ? (
            <Link
              href={toLocalePath(`/perfumes/${featuredProduct.slug}`, locale)}
              className="weather-product-card group grid min-h-[23rem] overflow-hidden rounded-[1.45rem] border border-zinc-200/80 bg-white/86 shadow-[0_18px_55px_rgba(24,24,24,0.07)] transition duration-300 hover:-translate-y-1 sm:grid-cols-[1.05fr_0.95fr] sm:rounded-[1.9rem] lg:grid-cols-1"
            >
              <div className="relative m-2 min-h-[15rem] overflow-hidden rounded-[1.05rem] bg-[radial-gradient(circle_at_50%_20%,#ffffff_0%,#ede7dc_58%,#ddd2c3_100%)] sm:m-3 sm:rounded-[1.5rem]">
                <Image
                  src={featuredProduct.image || "/perfoumerlogo.png"}
                  alt={featuredProduct.imageAlt || `${featuredProduct.brand} ${featuredProduct.name}`}
                  fill
                  sizes="(min-width: 1024px) 370px, (min-width: 640px) 50vw, 100vw"
                  className="object-contain p-8 drop-shadow-[0_26px_32px_rgba(0,0,0,0.16)] transition duration-700 group-hover:scale-[1.055]"
                />
                <span className="absolute right-3 top-3 rounded-full border border-white/70 bg-white/82 px-3 py-1 text-[0.72rem] font-bold text-zinc-950 shadow-sm backdrop-blur">
                  ☀︎ <AnimatedNumber value={featuredProduct.matchPercent} suffix={`% ${matchLabel(locale)}`} />
                </span>
              </div>
              <div className="px-4 pb-4 pt-1 sm:px-5 sm:pb-5">
                <div>
                  <p className="text-[0.66rem] font-semibold tracking-[0.18em] text-zinc-500 uppercase">{featuredProduct.brand}</p>
                  <h3 className="mt-2 font-serif text-2xl leading-[1.05] text-zinc-950">{featuredProduct.name}</h3>
                  <p className="mt-1 text-sm font-semibold text-zinc-950">{formatStartingPrice(featuredProduct.sizes, locale)}</p>
                  <p className="mt-3 line-clamp-2 text-sm leading-6 text-zinc-500">{featuredProduct.reason}</p>
                </div>
                <div className="mt-3">
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {buildProductTags(featuredProduct, locale).map((tag) => (
                      <span key={tag} className="rounded-full bg-[#ebe7df] px-2 py-0.5 text-[0.68rem] font-medium text-zinc-600">
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </Link>
          ) : null}

          <div className="grid grid-cols-2 gap-3 md:grid-cols-4 lg:grid-cols-5">
            {(isLoading ? [] : secondaryProducts).map((perfume, index) => (
              <Link
                key={perfume.slug}
                href={toLocalePath(`/perfumes/${perfume.slug}`, locale)}
                className="weather-product-card group min-w-0 rounded-[1.45rem] border border-zinc-200/75 bg-white/78 p-2 shadow-[0_12px_30px_rgba(24,24,24,0.04)] transition duration-300 hover:-translate-y-1 hover:bg-white sm:rounded-[1.9rem] sm:p-3"
                style={{ animationDelay: `${(index + 1) * 80}ms` }}
              >
                <div className="relative aspect-[0.92] overflow-hidden rounded-[1.05rem] bg-[linear-gradient(145deg,#ffffff_0%,#eee9df_100%)] sm:rounded-[1.5rem]">
                  <Image
                    src={perfume.image || "/perfoumerlogo.png"}
                    alt={perfume.imageAlt || `${perfume.brand} ${perfume.name}`}
                    fill
                    sizes="180px"
                    className="object-contain p-4 drop-shadow-[0_16px_18px_rgba(0,0,0,0.12)] transition duration-500 group-hover:scale-[1.06]"
                  />
                  <span className="absolute bottom-2 right-2 rounded-full border border-white/70 bg-white/86 px-2 py-0.5 text-[0.65rem] font-bold text-zinc-950 shadow-sm">
                    ☀︎ <AnimatedNumber value={perfume.matchPercent} suffix="%" />
                  </span>
                </div>
                <div className="mt-3 min-w-0">
                  <p className="truncate text-[0.62rem] font-semibold tracking-[0.16em] text-zinc-500 uppercase">{perfume.brand}</p>
                  <h3 className="mt-1 line-clamp-2 text-sm font-semibold leading-[1.08] text-zinc-950">{perfume.name}</h3>
                </div>
                <p className="mt-1 text-xs font-medium text-zinc-500">{formatStartingPrice(perfume.sizes, locale)}</p>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {buildProductTags(perfume, locale).slice(0, 2).map((tag) => (
                    <span key={tag} className="rounded-full bg-[#ebe7df] px-2 py-0.5 text-[0.66rem] font-medium text-zinc-600">
                      {tag}
                    </span>
                  ))}
                </div>
              </Link>
            ))}

            {isLoading ? Array.from({ length: compact ? 4 : 5 }).map((_, index) => (
              <div key={index} className="weather-product-card rounded-[1.45rem] border border-zinc-200/75 bg-white/70 p-2 sm:rounded-[1.9rem] sm:p-3" style={{ animationDelay: `${index * 80}ms` }}>
                <div className="aspect-[0.92] rounded-[1.05rem] bg-zinc-100/80 sm:rounded-[1.5rem]" />
                <div className="mt-3 h-3 w-16 rounded-full bg-zinc-200/70" />
                <div className="mt-2 h-4 w-24 rounded-full bg-zinc-200/70" />
                <div className="mt-3 h-3 w-14 rounded-full bg-zinc-200/70" />
              </div>
            )) : null}
          </div>

          {!isLoading && !products.length ? (
            <div className="rounded-[0.5rem] border border-zinc-200 bg-white/80 p-4 text-sm text-zinc-500">
              Hava əsaslı seçim hazırda yüklənmədi. Bakı üçün standart qoxular göstəriləcək.
            </div>
          ) : null}
        </div>
      </div>
    </section>
  );
}
