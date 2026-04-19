import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

import { hashUnsubscribeToken } from "@/lib/newsletter-email";
import { getSupabaseServiceConfigFromServer } from "@/lib/supabase/env.server";

export const runtime = "nodejs";

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function renderHtml(options: {
  title: string;
  description: string;
  showMissedOpportunities?: boolean;
  removedEmail?: string;
}) {
  const missedSection = options.showMissedOpportunities
    ? `
        <div class="divider"></div>
        <h2>Nələri qaçıra bilərsiniz</h2>
        <ul>
          <li>Yalnız abunəçilərə açıq erkən endirim kampaniyaları</li>
          <li>Yeni gələn premium ətirlər haqqında ilk bildirişlər</li>
          <li>Mövsümə uyğun seçilmiş qoxu təklifləri və şəxsi seçimlər</li>
        </ul>
      `
    : "";

  const emailConfirmation = options.removedEmail
    ? `<p class="meta">Silinən email: <strong>${escapeHtml(options.removedEmail)}</strong></p>`
    : "";

  return `<!doctype html>
<html lang="az">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${escapeHtml(options.title)}</title>
    <style>
      body { margin: 0; font-family: Arial, sans-serif; background: #f3f3f2; color: #1f2937; }
      .wrap { min-height: 100vh; display: grid; place-items: center; padding: 24px; }
      .card { width: 100%; max-width: 680px; background: #fff; border: 1px solid #e7e5e0; border-radius: 16px; padding: 30px; box-shadow: 0 12px 26px rgba(17, 24, 39, 0.06); }
      .badge { display: inline-flex; align-items: center; gap: 8px; margin-bottom: 14px; padding: 6px 12px; border: 1px solid #d6d3ce; border-radius: 999px; font-size: 12px; letter-spacing: 0.08em; text-transform: uppercase; color: #374151; }
      h1 { margin: 0 0 10px; font-size: 31px; line-height: 1.08; color: #111827; }
      p { margin: 0; font-size: 17px; line-height: 1.72; color: #4b5563; }
      .meta { margin-top: 10px; font-size: 14px; color: #6b7280; }
      .divider { height: 1px; background: #ece9e4; margin: 20px 0 16px; }
      h2 { margin: 0 0 10px; font-size: 18px; line-height: 1.3; color: #111827; }
      ul { margin: 0; padding-left: 20px; color: #4b5563; }
      li { margin: 0 0 9px; line-height: 1.6; }
      .actions { margin-top: 22px; display: flex; gap: 14px; flex-wrap: wrap; }
      .btn { display: inline-block; border-radius: 999px; padding: 10px 16px; text-decoration: none; font-size: 14px; }
      .btn-primary { background: #111827; color: #fff; }
      .btn-secondary { border: 1px solid #d1d5db; color: #111827; }
    </style>
  </head>
  <body>
    <main class="wrap">
      <section class="card">
        <span class="badge">Perfoumer Newsletter</span>
        <h1>${escapeHtml(options.title)}</h1>
        <p>${escapeHtml(options.description)}</p>
        ${emailConfirmation}
        ${missedSection}
        <div class="actions">
          <a href="/" class="btn btn-primary">Ana səhifəyə qayıt</a>
          <a href="/catalog" class="btn btn-secondary">Kataloqa bax</a>
        </div>
      </section>
    </main>
  </body>
</html>`;
}

function htmlResponse(
  title: string,
  description: string,
  status = 200,
  options?: { showMissedOpportunities?: boolean; removedEmail?: string },
) {
  return new NextResponse(renderHtml({ title, description, ...options }), {
    status,
    headers: {
      "content-type": "text/html; charset=utf-8",
    },
  });
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const rawToken = url.searchParams.get("token")?.trim() ?? "";

  if (!rawToken || rawToken.length < 32) {
    return htmlResponse(
      "Keçid etibarsızdır",
      "Bu abunəlik linki etibarlı deyil və ya artıq istifadə olunub.",
      400,
    );
  }

  const config = getSupabaseServiceConfigFromServer();
  if (!config) {
    return htmlResponse(
      "Xidmət əlçatan deyil",
      "Hazırda əməliyyatı tamamlamaq mümkün deyil. Zəhmət olmasa bir az sonra yenidən yoxlayın.",
      503,
    );
  }

  const supabase = createClient(config.url, config.serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const tokenHash = hashUnsubscribeToken(rawToken);

  // Atomically consume token once. If used already, no row is returned.
  const { data: consumed, error: consumeError } = await supabase
    .from("newsletter_unsubscribe_tokens")
    .update({ used_at: new Date().toISOString() })
    .eq("token_hash", tokenHash)
    .is("used_at", null)
    .select("subscriber_email")
    .maybeSingle();

  if (consumeError) {
    return htmlResponse(
      "Əməliyyat alınmadı",
      "Abunəlik ləğvi zamanı xəta baş verdi. Zəhmət olmasa dəstəyə yazın.",
      500,
    );
  }

  if (!consumed?.subscriber_email) {
    return htmlResponse(
      "Link artıq istifadə olunub",
      "Bu abunəlik linki artıq istifadə edilib və bir daha işləmir.",
      410,
    );
  }

  const { error: deleteError } = await supabase
    .from("newsletter_subscribers")
    .delete()
    .eq("email", consumed.subscriber_email);

  if (deleteError) {
    return htmlResponse(
      "Əməliyyat alınmadı",
      "Abunəlik siyahısından silinmə zamanı xəta baş verdi. Dəstəyə müraciət edin.",
      500,
    );
  }

  return htmlResponse(
    "Abunəlik ləğv edildi",
    "Email ünvanınız newsletter siyahısından çıxarıldı və artıq sizə kampaniya məktubları göndərilməyəcək.",
    200,
    {
      showMissedOpportunities: true,
      removedEmail: consumed.subscriber_email,
    },
  );
}
