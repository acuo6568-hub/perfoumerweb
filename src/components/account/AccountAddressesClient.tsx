"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { toLocalePath, type Locale } from "@/lib/i18n";
import { getSupabaseBrowserClient, isSupabaseConfigured } from "@/lib/supabase/client";
import type { SupabasePublicConfig } from "@/lib/supabase/client";

type AccountAddressesClientProps = {
  locale: Locale;
  supabase: SupabasePublicConfig | null;
};

type AddressRow = {
  id: string;
  full_name: string;
  phone: string;
  line1: string;
  line2: string;
  city: string;
  postal_code: string;
  country: string;
  created_at: string;
};

export function AccountAddressesClient({ locale, supabase: supabaseConfig }: AccountAddressesClientProps) {
  const supabase = getSupabaseBrowserClient(supabaseConfig ?? undefined);
  const [isReady, setIsReady] = useState(false);
  const [userId, setUserId] = useState("");
  const [addresses, setAddresses] = useState<AddressRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const copy =
    locale === "az"
      ? {
          title: "Yadda saxlanmış ünvanlar",
          subtitle: "Checkout zamanı istifadə etdiyiniz ünvanlar burada görünür.",
          loginRequired: "Ünvanları görmək üçün hesabınıza daxil olun.",
          loginCta: "Giriş et",
          loading: "Yüklənir...",
          empty: "Hələ ünvan əlavə edilməyib.",
          loadError: "Ünvanları yükləmək mümkün olmadı.",
        }
      : locale === "ru"
        ? {
            title: "Сохраненные адреса",
            subtitle: "Здесь отображаются адреса, использованные при оформлении заказа.",
            loginRequired: "Войдите в аккаунт, чтобы увидеть адреса.",
            loginCta: "Войти",
            loading: "Загрузка...",
            empty: "Пока нет сохраненных адресов.",
            loadError: "Не удалось загрузить адреса.",
          }
        : {
            title: "Saved addresses",
            subtitle: "Addresses you used during checkout appear here.",
            loginRequired: "Sign in to view your addresses.",
            loginCta: "Login",
            loading: "Loading...",
            empty: "No saved addresses yet.",
            loadError: "Could not load addresses.",
          };

  useEffect(() => {
    if (!supabase) {
      setLoading(false);
      setIsReady(true);
      return;
    }

    let active = true;

    (async () => {
      const { data } = await supabase.auth.getSession();
      const uid = data.session?.user?.id ?? "";
      if (!active) return;
      setUserId(uid);

      if (!uid) {
        setLoading(false);
        setIsReady(true);
        return;
      }

      const { data: rows, error: queryError } = await supabase
        .from("checkout_addresses")
        .select("id,full_name,phone,line1,line2,city,postal_code,country,created_at")
        .order("created_at", { ascending: false })
        .limit(20);

      if (!active) return;

      if (queryError) {
        setError(copy.loadError);
      } else {
        setAddresses((rows as AddressRow[] | null) ?? []);
      }

      setLoading(false);
      setIsReady(true);
    })();

    return () => {
      active = false;
    };
  }, [copy.loadError, supabase]);

  if (!isSupabaseConfigured(supabaseConfig ?? undefined)) {
    return <p className="text-sm text-zinc-600">Supabase configuration is missing.</p>;
  }

  if (!isReady || loading) {
    return <p className="text-sm text-zinc-500">{copy.loading}</p>;
  }

  if (!userId) {
    return (
      <div className="rounded-[1.5rem] border border-zinc-200 bg-white p-5 shadow-[0_8px_22px_rgba(0,0,0,0.04)] sm:p-6">
        <h1 className="text-[1.35rem] tracking-[-0.02em] text-zinc-900 sm:text-[1.6rem]">{copy.title}</h1>
        <p className="mt-2 text-sm text-zinc-600">{copy.loginRequired}</p>
        <Link href={`${toLocalePath("/login", locale)}?next=${encodeURIComponent(toLocalePath("/account/addresses", locale))}`} className="mt-4 inline-flex min-h-10 items-center justify-center rounded-full bg-zinc-900 px-5 text-sm font-medium text-white">
          {copy.loginCta}
        </Link>
      </div>
    );
  }

  return (
    <div className="rounded-[1.5rem] border border-zinc-200 bg-white p-5 shadow-[0_8px_22px_rgba(0,0,0,0.04)] sm:p-6">
      <h1 className="text-[1.35rem] tracking-[-0.02em] text-zinc-900 sm:text-[1.6rem]">{copy.title}</h1>
      <p className="mt-1.5 text-sm text-zinc-500">{copy.subtitle}</p>

      {error ? <p className="mt-4 rounded-xl bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p> : null}

      {!error && addresses.length === 0 ? <p className="mt-4 text-sm text-zinc-600">{copy.empty}</p> : null}

      {!error && addresses.length > 0 ? (
        <div className="mt-4 space-y-3">
          {addresses.map((address) => (
            <article key={address.id} className="rounded-2xl border border-zinc-200 bg-zinc-50/70 px-4 py-3">
              <p className="text-sm font-semibold text-zinc-900">{address.full_name}</p>
              <p className="mt-1 text-xs text-zinc-600">{address.phone}</p>
              <p className="mt-2 text-sm leading-6 text-zinc-700">
                {address.line1}
                {address.line2 ? `, ${address.line2}` : ""}, {address.city}, {address.postal_code}, {address.country}
              </p>
            </article>
          ))}
        </div>
      ) : null}
    </div>
  );
}
