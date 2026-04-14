import type { Metadata } from "next";
import { createClient } from "@supabase/supabase-js";

import { Footer } from "@/components/Footer";
import { SharedWishlistViewClient } from "@/components/community/SharedWishlistViewClient";
import { getPerfumes } from "@/lib/catalog";
import { getCurrentLocale } from "@/lib/i18n.server";
import type { Locale } from "@/lib/i18n";
import { getSupabaseServiceConfigFromServer } from "@/lib/supabase/env.server";

export const metadata: Metadata = {
  title: "Shared Wishlist",
  robots: {
    index: false,
    follow: false,
  },
};

type PageProps = {
  params: Promise<{ token: string }>;
};

const pageCopy: Record<
  Locale,
  {
    title: string;
    subtitle: string;
    empty: string;
    invalid: string;
    addTitle: string;
    addDescription: string;
    addAction: string;
    adding: string;
    addSuccess: string;
    addError: string;
  }
> = {
  az: {
    title: "Paylaşılan Wishlist",
    subtitle: "Bu siyahı yalnız baxış üçün açıqdır.",
    empty: "Bu wishlist hazırda boşdur.",
    invalid: "Bu paylaşım linki etibarsızdır və ya deaktiv edilib.",
    addTitle: "Bu siyahıya ətir əlavə et",
    addDescription: "Link sahibi icazə veribsə, buradan siyahıya ətir əlavə edə bilərsən.",
    addAction: "Əlavə et",
    adding: "Əlavə edilir...",
    addSuccess: "Siyahıya əlavə olundu.",
    addError: "Əlavə etmək mümkün olmadı.",
  },
  en: {
    title: "Shared Wishlist",
    subtitle: "This list is view-only.",
    empty: "This wishlist is currently empty.",
    invalid: "This share link is invalid or has been disabled.",
    addTitle: "Add perfume to this list",
    addDescription: "If the owner enabled it, you can add perfumes here.",
    addAction: "Add",
    adding: "Adding...",
    addSuccess: "Added to wishlist.",
    addError: "Could not add perfume.",
  },
  ru: {
    title: "Поделенный Wishlist",
    subtitle: "Этот список доступен только для просмотра.",
    empty: "Этот wishlist сейчас пуст.",
    invalid: "Ссылка недействительна или отключена.",
    addTitle: "Добавить аромат в список",
    addDescription: "Если владелец включил опцию, вы можете добавить аромат.",
    addAction: "Добавить",
    adding: "Добавление...",
    addSuccess: "Добавлено в wishlist.",
    addError: "Не удалось добавить аромат.",
  },
};

export default async function SharedWishlistPage({ params }: PageProps) {
  const { token } = await params;
  const locale = await getCurrentLocale();
  const copy = pageCopy[locale];

  const perfumes = await getPerfumes();
  const config = getSupabaseServiceConfigFromServer();

  if (!config) {
    return (
      <div className="bg-[#f3f3f2]">
        <div className="mx-auto max-w-[1540px] px-6 pb-14 md:px-10">
          <section className="pt-6 pb-8 md:pt-8">
            <h1 className="text-[3rem] leading-[0.95] tracking-[-0.04em] text-zinc-900 md:text-[4.4rem]">
              {copy.title}
            </h1>
            <p className="mt-3 max-w-2xl text-zinc-500">{copy.invalid}</p>
          </section>
        </div>
        <Footer locale={locale} />
      </div>
    );
  }

  const supabase = createClient(config.url, config.serviceRoleKey);

  const { data: shareRow } = await supabase
    .from("wishlist_shares")
    .select("user_id,allow_additions")
    .eq("token", token)
    .maybeSingle();

  if (!shareRow?.user_id) {
    return (
      <div className="bg-[#f3f3f2]">
        <div className="mx-auto max-w-[1540px] px-6 pb-14 md:px-10">
          <section className="pt-6 pb-8 md:pt-8">
            <h1 className="text-[3rem] leading-[0.95] tracking-[-0.04em] text-zinc-900 md:text-[4.4rem]">
              {copy.title}
            </h1>
            <p className="mt-3 max-w-2xl text-zinc-500">{copy.invalid}</p>
          </section>
        </div>
        <Footer locale={locale} />
      </div>
    );
  }

  const { data: rows } = await supabase
    .from("wishlists")
    .select("perfume_slug")
    .eq("user_id", shareRow.user_id)
    .order("created_at", { ascending: false });

  const slugs = new Set(
    ((rows as Array<{ perfume_slug?: string }> | null) ?? [])
      .map((row) => row.perfume_slug)
      .filter((slug): slug is string => typeof slug === "string" && slug.length > 0),
  );
  const sharedSlugs = perfumes
    .map((perfume) => perfume.slug)
    .filter((slug) => slugs.has(slug));

  return (
    <div className="bg-[#f3f3f2]">
      <div className="mx-auto max-w-[1540px] px-6 pb-14 md:px-10">
        <section className="pt-6 pb-8 md:pt-8">
          <h1 className="text-[3rem] leading-[0.95] tracking-[-0.04em] text-zinc-900 md:text-[4.4rem]">
            {copy.title}
          </h1>
          <p className="mt-3 max-w-2xl text-zinc-500">{copy.subtitle}</p>
        </section>

        <SharedWishlistViewClient
          locale={locale}
          token={token}
          allPerfumes={perfumes}
          initialSlugs={sharedSlugs}
          allowAdditions={Boolean(shareRow.allow_additions)}
          addTitle={copy.addTitle}
          addDescription={copy.addDescription}
          addAction={copy.addAction}
          adding={copy.adding}
          addSuccess={copy.addSuccess}
          addError={copy.addError}
          empty={copy.empty}
        />
      </div>

      <Footer locale={locale} />
    </div>
  );
}
