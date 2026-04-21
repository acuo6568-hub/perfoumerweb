import Link from "next/link";
import { getCurrentLocale } from "@/lib/i18n.server";
import { getDictionary, toLocalePath } from "@/lib/i18n";

export default async function NotFound() {
  const locale = await getCurrentLocale();
  const t = getDictionary(locale);

  return (
    <main className="grid min-h-screen place-items-center bg-[#f3f3f2] px-6 text-center">
      <div>
        <p className="text-sm tracking-[0.2em] text-zinc-500 uppercase">404</p>
        <h1 className="mt-2 text-5xl font-semibold text-zinc-800">{t.notFound.title}</h1>
        <p className="mt-3 text-zinc-600">{t.notFound.description}</p>
        <Link
          href={toLocalePath("/", locale)}
          className="mt-6 inline-flex rounded-full bg-zinc-900 px-5 py-2 text-sm font-medium text-white"
        >
          {t.notFound.back}
        </Link>
      </div>
    </main>
  );
}
