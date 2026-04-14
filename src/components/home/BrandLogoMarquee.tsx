"use client";

import Link from "next/link";
import Image from "next/image";
import { useState } from "react";

const BRAND_DOMAIN_OVERRIDES: Record<string, string> = {
  "abdul samad al qurashi": "abdulsamadalqurashi.com",
  "acqua di parma": "acquadiparma.com",
  "agent provocateur": "agentprovocateur.com",
  amouage: "amouage.com",
  "armaf": "armafperfume.com",
  atkinsons: "atkinsons1799.com",
  "bond no 9": "bondno9.com",
  bvlgari: "bulgari.com",
  "c dior": "dior.com",
  "c herrera": "carolinaherrera.com",
  "c louboutin": "christianlouboutin.com",
  "carolina herrera": "carolinaherrera.com",
  chanel: "chanel.com",
  "christian dior": "dior.com",
  creed: "creedboutique.com",
  "dolce gabbana": "dolcegabbana.com",
  "dsquared2": "dsquared2.com",
  "estee lauder": "esteelauder.com",
  "ex nihilo": "ex-nihilo-paris.com",
  givenchy: "givenchybeauty.com",
  gucci: "gucci.com",
  hermes: "hermes.com",
  "hugo boss": "hugoboss.com",
  "initio": "initioparfums.com",
  "issey miyake": "isseymiyake.com",
  "jean paul gaultier": "jeanpaulgaultier.com",
  "jo malone": "jomalone.com",
  "joop": "joop.com",
  kayali: "hudabeauty.com",
  kenzo: "kenzoparfums.com",
  kilian: "kilianparis.com",
  lancome: "lancome.com",
  "le labo": "lelabofragrances.com",
  "louis vuitton": "louisvuitton.com",
  "m micallef": "mmicallef.com",
  mancera: "manceraparfums.com",
  "marc jacobs": "marcjacobs.com",
  "maison martin margiela": "maisonmargiela.com",
  "mercedes benz": "mercedes-benz.com",
  mfk: "maisonfranciskurkdjian.com",
  moncler: "moncler.com",
  montale: "montaleparfums.com",
  "narciso rodriguez": "narcisorodriguezparfums.com",
  "nina ricci": "ninaricci.com",
  "paco rabanne": "rabanne.com",
  "parfums de marly": "parfums-de-marly.com",
  "penhaligon s": "penhaligons.com",
  "prada": "prada.com",
  rasasi: "rasasi.com",
  "roja": "rojaparfums.com",
  "s t dupont": "st-dupont.com",
  "tom ford": "tomford.com",
  "tommy hilfiger": "tommy.com",
  "viktor rolf": "viktor-rolf.com",
  xerjoff: "xerjoff.com",
  ysl: "yslbeauty.com",
};

function normalizeBrandForDomain(brand: string) {
  return brand
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function buildDomainFromBrand(brand: string) {
  const normalized = normalizeBrandForDomain(brand);
  if (!normalized) {
    return "";
  }

  const override = BRAND_DOMAIN_OVERRIDES[normalized];
  return override ?? "";
}

function buildLogoUrl(brand: string) {
  const domain = buildDomainFromBrand(brand);
  if (!domain) {
    return "";
  }

  return `https://t2.gstatic.com/faviconV2?client=SOCIAL&type=FAVICON&fallback_opts=TYPE,SIZE,URL&url=${encodeURIComponent(`http://${domain}`)}&size=128`;
}

type BrandLogoMarqueeProps = {
  brands: string[];
};

export function BrandLogoMarquee({ brands }: BrandLogoMarqueeProps) {
  const [failedBrands, setFailedBrands] = useState<Set<string>>(new Set());

  const uniqueBrands = Array.from(new Set(brands.map((item) => item.trim()).filter(Boolean))).sort((a, b) =>
    a.localeCompare(b),
  );

  const logoItems = uniqueBrands.map((brand) => ({
    brand,
    src: buildLogoUrl(brand),
  }));

  if (!logoItems.length) {
    return null;
  }

  const repeated = [...logoItems, ...logoItems];

  const markBrandLogoAsFailed = (brand: string) => {
    setFailedBrands((current) => {
      if (current.has(brand)) {
        return current;
      }

      const next = new Set(current);
      next.add(brand);
      return next;
    });
  };

  return (
    <section className="mx-auto mt-2 mb-8 max-w-[1540px] px-6 md:px-10">
      <div className="border-y border-zinc-300/55 bg-transparent py-5 md:py-6">
        <p className="mb-4 text-center text-[0.63rem] font-medium tracking-[0.28em] text-zinc-500 uppercase">
          Our brand selection
        </p>
        <div className="brand-marquee-mask">
          <div className="brand-marquee-track">
            {repeated.map((item, index) => (
              index < logoItems.length ? (
                <Link
                  key={`${item.brand}-${index}`}
                  href={`/catalog?brand=${encodeURIComponent(item.brand)}`}
                  className="brand-logo-chip brand-logo-chip-link"
                  aria-label={`${item.brand} products`}
                >
                  {item.src && !failedBrands.has(item.brand) ? (
                    <Image
                      src={item.src}
                      alt={item.brand}
                      width={42}
                      height={42}
                      className="brand-logo-image"
                      onError={() => markBrandLogoAsFailed(item.brand)}
                    />
                  ) : (
                    <span className="brand-logo-wordmark">{item.brand}</span>
                  )}
                </Link>
              ) : (
                <div key={`${item.brand}-${index}`} className="brand-logo-chip" aria-hidden>
                  {item.src && !failedBrands.has(item.brand) ? (
                    <Image
                      src={item.src}
                      alt=""
                      width={42}
                      height={42}
                      className="brand-logo-image"
                      onError={() => markBrandLogoAsFailed(item.brand)}
                    />
                  ) : (
                    <span className="brand-logo-wordmark">{item.brand}</span>
                  )}
                </div>
              )
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
