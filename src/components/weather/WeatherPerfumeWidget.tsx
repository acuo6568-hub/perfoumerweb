"use client";

import Image from "next/image";
import Link from "next/link";
import { CloudRain, Compass, MapPin, Sparkle, Wind } from "@phosphor-icons/react";
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
        : "Havanın temperaturuna, mövsümə və günün vaxtına görə ən uyğun qoxular.";
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

  return (
    <section
      className={[
        compact
          ? "mt-4 rounded-[1.25rem] border border-zinc-200 bg-white/88 p-4 shadow-[0_16px_36px_rgba(24,24,24,0.07)]"
          : "mt-12 overflow-hidden rounded-[2rem] border border-zinc-200/85 bg-[#fbfaf7] p-4 shadow-[0_22px_58px_rgba(24,24,24,0.08)] sm:p-5 md:p-6",
        "weather-widget-fade",
        className,
      ].join(" ")}
    >
      <div className={compact ? "grid gap-4" : "grid gap-5 lg:grid-cols-[0.9fr_1.4fr] lg:items-stretch"}>
        <aside className="rounded-[1.35rem] border border-zinc-200 bg-white p-4 shadow-[0_12px_34px_rgba(24,24,24,0.05)] sm:p-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-[0.68rem] font-semibold tracking-[0.2em] text-zinc-500 uppercase">Perfoumer Weather</p>
              <h2 className={compact ? "mt-2 text-xl font-semibold text-zinc-950" : "mt-2 max-w-[13ch] text-4xl leading-[0.98] text-zinc-950 md:text-5xl"}>{title}</h2>
              <p className="mt-3 max-w-md text-sm leading-6 text-zinc-500">{subtitle}</p>
            </div>
            <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-zinc-200 bg-zinc-50 text-zinc-800">
              {weather?.precipitation ? <CloudRain size={18} weight="duotone" /> : weather?.windSpeed && weather.windSpeed >= 22 ? <Wind size={18} weight="duotone" /> : <Sparkle size={18} weight="duotone" />}
            </span>
          </div>

          <div className="mt-5 rounded-[1.1rem] border border-zinc-200 bg-[#f6f3ed] p-4">
            <div className="flex flex-wrap items-center gap-2 text-sm font-semibold text-zinc-900">
              <MapPin size={15} weight="bold" />
              <span>{weather?.city ?? selectedCity}</span>
              <span className="text-zinc-400">·</span>
              <span>{isLoading ? "..." : <AnimatedNumber value={weather?.temperature ?? 0} suffix="°C" />}</span>
              <span className="text-zinc-400">·</span>
              <span>{weather?.mood ?? "Hava"}</span>
            </div>
            <p className="mt-3 text-[0.95rem] leading-6 text-zinc-700">
              {weather?.advice ?? "Bugünkü hava üçün uyğun qoxular hazırlanır..."}
            </p>
            <p className="mt-3 text-[0.68rem] tracking-[0.16em] text-zinc-400 uppercase">
              {payload?.attribution ?? "Weather data by Open-Meteo.com"}
            </p>
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            {cityChoices.map((city) => (
              <button
                key={city}
                type="button"
                onClick={() => setSelectedCity(city)}
                className={[
                  "rounded-full border px-3 py-1.5 text-[0.75rem] font-semibold transition",
                  selectedCity === city ? "border-zinc-900 bg-zinc-900 text-white" : "border-zinc-200 bg-white text-zinc-600 hover:border-zinc-300",
                ].join(" ")}
              >
                {city}
              </button>
            ))}
            <button
              type="button"
              onClick={useNearestCity}
              className="inline-flex items-center gap-1.5 rounded-full border border-zinc-200 bg-white px-3 py-1.5 text-[0.75rem] font-semibold text-zinc-600 transition hover:border-zinc-300"
            >
              <Compass size={13} weight="bold" />
              {isLocating ? "..." : locale === "az" ? "Yaxın şəhər" : "Nearby"}
            </button>
          </div>
        </aside>

        <div className={compact ? "flex gap-3 overflow-x-auto pb-1" : "flex gap-3 overflow-x-auto pb-2 lg:grid lg:grid-cols-3 lg:overflow-visible"}>
          {(isLoading ? [] : products).slice(0, compact ? 3 : 6).map((perfume, index) => (
            <Link
              key={perfume.slug}
              href={toLocalePath(`/perfumes/${perfume.slug}`, locale)}
              className="weather-product-card group min-w-[13.5rem] rounded-[1.25rem] border border-zinc-200 bg-white p-3 shadow-[0_12px_30px_rgba(24,24,24,0.05)] transition duration-300 hover:-translate-y-1 hover:shadow-[0_18px_42px_rgba(24,24,24,0.1)]"
              style={{ animationDelay: `${index * 80}ms` }}
            >
              <div className="relative aspect-[4/3] rounded-[1rem] bg-zinc-50">
                <Image
                  src={perfume.image || "/perfoumerlogo.png"}
                  alt={perfume.imageAlt || `${perfume.brand} ${perfume.name}`}
                  fill
                  sizes="220px"
                  className="object-contain p-3 transition duration-500 group-hover:scale-[1.035]"
                />
              </div>
              <div className="mt-3 flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate text-[0.66rem] font-semibold tracking-[0.16em] text-zinc-500 uppercase">{perfume.brand}</p>
                  <h3 className="mt-1 line-clamp-2 text-sm font-semibold leading-5 text-zinc-950">{perfume.name}</h3>
                </div>
                <span className="shrink-0 rounded-full border border-zinc-200 bg-[#f6f3ed] px-2 py-1 text-[0.7rem] font-bold text-zinc-900">
                  <AnimatedNumber value={perfume.matchPercent} suffix="%" />
                </span>
              </div>
              <p className="mt-2 text-xs font-semibold text-zinc-900">{formatPrice(perfume.sizes)}</p>
              <p className="mt-2 line-clamp-3 text-xs leading-5 text-zinc-500">{perfume.reason}</p>
            </Link>
          ))}

          {!isLoading && !products.length ? (
            <div className="rounded-[1.2rem] border border-zinc-200 bg-white p-5 text-sm text-zinc-500">
              Hava əsaslı seçim hazırda yüklənmədi. Bakı üçün standart qoxular göstəriləcək.
            </div>
          ) : null}
        </div>
      </div>
    </section>
  );
}
