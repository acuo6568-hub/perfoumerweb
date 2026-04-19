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
        <ul class="opportunities">
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
      :root {
        --bg: #f2f2f0;
        --card: #fbfbfa;
        --line: #dfddd8;
        --line-soft: #e9e7e2;
        --text: #171717;
        --muted: #555a63;
      }

      * { box-sizing: border-box; }

      body {
        margin: 0;
        font-family: "Avenir Next", "Neue Haas Grotesk Text", "Helvetica Neue", Arial, sans-serif;
        background:
          radial-gradient(circle at 14% 10%, rgba(255,255,255,0.52) 0%, rgba(255,255,255,0) 42%),
          radial-gradient(circle at 87% 3%, rgba(255,255,255,0.45) 0%, rgba(255,255,255,0) 38%),
          var(--bg);
        color: var(--text);
      }

      .wrap {
        min-height: 100vh;
        display: grid;
        place-items: center;
        padding: clamp(18px, 4vw, 34px);
      }

      .card {
        width: 100%;
        max-width: 700px;
        background: linear-gradient(180deg, rgba(255,255,255,0.84) 0%, var(--card) 100%);
        border: 1px solid var(--line);
        border-radius: 18px;
        padding: clamp(20px, 4vw, 34px);
        box-shadow: 0 10px 24px rgba(20, 20, 20, 0.06);
      }

      .badge {
        display: inline-flex;
        align-items: center;
        gap: 8px;
        margin-bottom: 14px;
        padding: 6px 12px;
        border: 1px solid var(--line);
        border-radius: 999px;
        font-size: 11px;
        letter-spacing: 0.09em;
        text-transform: uppercase;
        color: #464b54;
        background: rgba(255,255,255,0.6);
      }

      h1 {
        margin: 0 0 10px;
        font-family: "Iowan Old Style", "Baskerville", "Times New Roman", serif;
        font-size: clamp(30px, 5.8vw, 44px);
        line-height: 1.04;
        letter-spacing: -0.02em;
        color: #101213;
      }

      p {
        margin: 0;
        font-size: clamp(15px, 2.5vw, 18px);
        line-height: 1.72;
        color: var(--muted);
      }

      .meta {
        margin-top: 10px;
        font-size: 13px;
        color: #6b7280;
        word-break: break-word;
      }

      .divider {
        height: 1px;
        background: var(--line-soft);
        margin: 22px 0 16px;
      }

      h2 {
        margin: 0 0 10px;
        font-size: clamp(17px, 3vw, 20px);
        line-height: 1.3;
        color: #161a1d;
      }

      .opportunities {
        margin: 0;
        padding: 0;
        list-style: none;
        color: #535963;
      }

      .opportunities li {
        position: relative;
        margin: 0 0 10px;
        padding-left: 18px;
        line-height: 1.62;
      }

      .opportunities li::before {
        content: "";
        position: absolute;
        left: 0;
        top: 0.72em;
        width: 6px;
        height: 6px;
        border-radius: 999px;
        background: #8b919d;
      }

      .actions {
        margin-top: 22px;
        display: flex;
        gap: 12px;
        flex-wrap: wrap;
      }

      .btn {
        display: inline-flex;
        justify-content: center;
        align-items: center;
        min-height: 44px;
        border-radius: 999px;
        padding: 10px 17px;
        text-decoration: none;
        font-size: 14px;
        letter-spacing: 0.01em;
        transition: background 160ms ease, color 160ms ease, border-color 160ms ease;
      }

      .btn-primary {
        background: #15181d;
        color: #ffffff;
      }

      .btn-secondary {
        border: 1px solid #ced3dc;
        color: #171a1f;
        background: rgba(255,255,255,0.68);
      }

      @media (max-width: 640px) {
        .actions {
          flex-direction: column;
        }

        .btn {
          width: 100%;
        }
      }
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
