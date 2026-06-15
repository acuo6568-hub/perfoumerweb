"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Session } from "@supabase/supabase-js";

import type { Locale } from "@/lib/i18n";
import { getSupabaseBrowserClient, isSupabaseConfigured } from "@/lib/supabase/client";
import type { SupabasePublicConfig } from "@/lib/supabase/client";

type LoginSuccessClientProps = {
  locale: Locale;
  nextPath: string;
  email: string;
  pending: boolean;
  flow: "signup" | "email_change";
  supabase: SupabasePublicConfig | null;
};

type Copy = {
  titlePending: string;
  descPending: string;
  titleDone: string;
  descDone: string;
  check: string;
  verify: string;
  codeLabel: string;
  codeHint: string;
  codeExpires: string;
  continue: string;
  backLogin: string;
  loading: string;
  configMissing: string;
};

const OTP_LENGTH = 8;
const OTP_EXPIRES_SECONDS = 3600;

const copyByLocale: Record<Locale, Copy> = {
  az: {
    titlePending: "Email təsdiqini tamamla",
    descPending: "Gələnlər qutusundan təsdiq linkinə klik et, sonra yenidən yoxla.",
    titleDone: "Hesab uğurla təsdiqləndi",
    descDone: "İndi sistemə tam giriş var. Davam edib məhsul səhifəsinə qayıda bilərsən.",
    check: "Yenidən yoxla",
    verify: "Kodu təsdiqlə",
    codeLabel: "Təsdiq kodu",
    codeHint: "Emailə gələn kodu daxil et.",
    codeExpires: "Kodun etibarlılıq müddəti: 3600 saniyə.",
    continue: "Davam et",
    backLogin: "Giriş səhifəsi",
    loading: "Yoxlanılır...",
    configMissing: "Supabase konfiqurasiyası yoxdur.",
  },
  en: {
    titlePending: "Complete email verification",
    descPending: "Open your inbox, click the verification link, then check again.",
    titleDone: "Account verified successfully",
    descDone: "You now have full access. Continue back to the product flow.",
    check: "Check again",
    verify: "Verify code",
    codeLabel: "Verification code",
    codeHint: "Enter the code sent to your email.",
    codeExpires: "Code expiration: 3600 seconds.",
    continue: "Continue",
    backLogin: "Login page",
    loading: "Checking...",
    configMissing: "Supabase configuration is missing.",
  },
  ru: {
    titlePending: "Завершите подтверждение email",
    descPending: "Откройте письмо, нажмите ссылку подтверждения и проверьте снова.",
    titleDone: "Аккаунт успешно подтвержден",
    descDone: "Теперь доступ открыт. Можно продолжить к страницам с отзывами и wishlist.",
    check: "Проверить снова",
    verify: "Подтвердить код",
    codeLabel: "Код подтверждения",
    codeHint: "Введите код из письма.",
    codeExpires: "Срок действия кода: 3600 секунд.",
    continue: "Продолжить",
    backLogin: "Страница входа",
    loading: "Проверка...",
    configMissing: "Отсутствует конфигурация Supabase.",
  },
};

const FALLBACK_NEXT_PATH = "/wishlist";

const normalizeNextPath = (input: string) => {
  const trimmed = input.trim();
  if (!trimmed) return FALLBACK_NEXT_PATH;

  try {
    const parsed = new URL(trimmed, "https://perfoumer.local");
    if (parsed.origin !== "https://perfoumer.local") return FALLBACK_NEXT_PATH;

    const normalized = `${parsed.pathname || "/"}${parsed.search}${parsed.hash}`;
    if (!normalized.startsWith("/") || normalized.startsWith("//")) return FALLBACK_NEXT_PATH;
    if (/[\u0000-\u001f\u007f\s]/.test(normalized)) return FALLBACK_NEXT_PATH;

    return normalized;
  } catch {
    return FALLBACK_NEXT_PATH;
  }
};

export function LoginSuccessClient({ locale, nextPath, email, pending, flow, supabase: supabaseConfig }: LoginSuccessClientProps) {
  const copy = copyByLocale[locale];
  const router = useRouter();
  const supabase = getSupabaseBrowserClient(supabaseConfig ?? undefined);

  const [session, setSession] = useState<Session | null>(null);
  const [isChecking, setIsChecking] = useState(() => Boolean(supabase));
  const [message, setMessage] = useState("");
  const [code, setCode] = useState("");
  const [isAnimatedIn, setIsAnimatedIn] = useState(false);
  const otpRefs = useRef<Array<HTMLInputElement | null>>([]);
  const otpDigits = useMemo(
    () => Array.from({ length: OTP_LENGTH }, (_, index) => code[index] ?? ""),
    [code],
  );

  const safeNextPath = useMemo(() => normalizeNextPath(nextPath), [nextPath]);

  const checkSession = useCallback(async () => {
    if (!supabase) return;

    setIsChecking(true);
    const { data, error } = await supabase.auth.getSession();

    if (error) {
      setMessage(error.message);
      setIsChecking(false);
      return;
    }

    setSession(data.session ?? null);
    setIsChecking(false);
  }, [supabase]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void checkSession();
    }, 0);

    return () => {
      window.clearTimeout(timer);
    };
  }, [checkSession]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setIsAnimatedIn(true);
    }, 30);
    return () => {
      window.clearTimeout(timer);
    };
  }, []);

  if (!isSupabaseConfigured(supabaseConfig ?? undefined)) {
    return <p className="text-sm text-zinc-600">{copy.configMissing}</p>;
  }

  const targetEmail = email.trim().toLowerCase();
  const sessionEmail = session?.user?.email?.toLowerCase() ?? "";
  const sameEmail = targetEmail ? sessionEmail === targetEmail : Boolean(session?.user);
  const emailConfirmedAt =
    (session?.user?.email_confirmed_at as string | null | undefined) ??
    ((session?.user as { confirmed_at?: string | null } | null)?.confirmed_at ?? null);
  const verified = Boolean(session?.user) && sameEmail && Boolean(emailConfirmedAt);

  const verifyCode = async () => {
    if (!supabase || !email.trim()) {
      return;
    }

    setIsChecking(true);
    setMessage("");

    const otpType = flow === "email_change" ? "email_change" : "signup";
    const { error } = await supabase.auth.verifyOtp({
      email: email.trim(),
      token: code.trim(),
      type: otpType,
    });

    if (error) {
      setMessage(error.message);
      setIsChecking(false);
      return;
    }

    await checkSession();
  };

  const updateOtpAt = (index: number, value: string) => {
    const clean = value.replace(/\D/g, "");
    if (!clean) {
      const current = code.padEnd(OTP_LENGTH, " ").split("");
      current[index] = "";
      setCode(current.join("").trimEnd());
      return;
    }

    const nextChars = code.padEnd(OTP_LENGTH, " ").split("");
    if (clean.length > 1) {
      const pasted = clean.slice(0, OTP_LENGTH).split("");
      for (let i = 0; i < OTP_LENGTH; i += 1) {
        nextChars[i] = pasted[i] ?? "";
      }
      setCode(nextChars.join("").trimEnd());
      const nextFocusIndex = Math.min(clean.length, OTP_LENGTH - 1);
      otpRefs.current[nextFocusIndex]?.focus();
      return;
    }

    nextChars[index] = clean;
    setCode(nextChars.join("").trimEnd());
    if (index < OTP_LENGTH - 1) {
      otpRefs.current[index + 1]?.focus();
    }
  };

  const handleOtpBackspace = (index: number) => {
    const current = code.padEnd(OTP_LENGTH, " ").split("");
    if (current[index]) {
      current[index] = "";
      setCode(current.join("").trimEnd());
      return;
    }
    if (index > 0) {
      otpRefs.current[index - 1]?.focus();
      current[index - 1] = "";
      setCode(current.join("").trimEnd());
    }
  };

  return (
    <div
      className={[
        "mx-auto max-w-4xl rounded-[2rem] border border-white/70 bg-[linear-gradient(145deg,rgba(255,255,255,0.95)_0%,rgba(243,242,240,0.92)_100%)] p-6 shadow-[0_30px_100px_rgba(20,20,20,0.1)] ring-1 ring-zinc-200/70 transition-all duration-700 ease-[cubic-bezier(0.22,1,0.36,1)] md:p-10",
        isAnimatedIn ? "translate-y-0 opacity-100" : "translate-y-4 opacity-0",
      ].join(" ")}
    >
      <div className="rounded-[1.6rem] bg-[radial-gradient(circle_at_top_left,#ffffff_0%,#f1f0ee_70%)] p-6 ring-1 ring-zinc-200/70 transition-all duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] md:p-8">
        <h1 className="text-[2.1rem] leading-[0.95] tracking-[-0.03em] text-zinc-900 md:text-[3rem]">
          {verified ? copy.titleDone : copy.titlePending}
        </h1>

        <p className="mt-4 max-w-2xl text-sm leading-7 text-zinc-600 md:text-base">
          {verified ? copy.descDone : copy.descPending}
        </p>

        {email ? <p className="mt-3 text-sm text-zinc-500">{email}</p> : null}

        <div className="mt-7 flex flex-wrap gap-3">
          {verified ? (
            <button
              type="button"
              onClick={() => {
                router.push(safeNextPath);
                router.refresh();
              }}
              className="inline-flex min-h-11 items-center justify-center rounded-full bg-zinc-900 px-6 text-sm font-medium text-white shadow-[0_8px_20px_rgba(24,24,24,0.18)] transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] hover:-translate-y-[1px] hover:bg-zinc-800"
            >
              {copy.continue}
            </button>
          ) : (
            <button
              type="button"
              onClick={checkSession}
              className="inline-flex min-h-11 items-center justify-center rounded-full bg-zinc-900 px-6 text-sm font-medium text-white shadow-[0_8px_20px_rgba(24,24,24,0.18)] transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] hover:-translate-y-[1px] hover:bg-zinc-800"
            >
              {isChecking ? copy.loading : copy.check}
            </button>
          )}

          <Link
            href={`/login?next=${encodeURIComponent(safeNextPath)}`}
            className="inline-flex min-h-11 items-center justify-center rounded-full border border-zinc-300 bg-white px-6 text-sm font-medium text-zinc-700 transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] hover:bg-zinc-50 hover:-translate-y-[1px]"
          >
            {copy.backLogin}
          </Link>
        </div>

        {!verified && pending && email ? (
          <div className="mt-5 rounded-2xl bg-zinc-50 p-4 ring-1 ring-zinc-200 transition-all duration-500 ease-[cubic-bezier(0.22,1,0.36,1)]">
            <label className="block">
              <span className="mb-1.5 block text-sm text-zinc-600">{copy.codeLabel}</span>
              <div className="flex flex-wrap gap-2">
                {otpDigits.map((digit, index) => (
                  <input
                    key={`success-otp-${index}`}
                    ref={(node) => {
                      otpRefs.current[index] = node;
                    }}
                    inputMode="numeric"
                    pattern="[0-9]*"
                    maxLength={1}
                    value={digit}
                    onChange={(event) => updateOtpAt(index, event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === "Backspace") {
                        event.preventDefault();
                        handleOtpBackspace(index);
                      } else if (event.key === "ArrowLeft" && index > 0) {
                        event.preventDefault();
                        otpRefs.current[index - 1]?.focus();
                      } else if (event.key === "ArrowRight" && index < OTP_LENGTH - 1) {
                        event.preventDefault();
                        otpRefs.current[index + 1]?.focus();
                      }
                    }}
                    onPaste={(event) => {
                      event.preventDefault();
                      const pasted = event.clipboardData.getData("text");
                      updateOtpAt(index, pasted);
                    }}
                    className="h-12 w-11 rounded-xl bg-white text-center text-lg font-semibold text-zinc-800 outline-none ring-1 ring-zinc-200 transition-all duration-300 focus:-translate-y-[1px] focus:ring-zinc-400"
                  />
                ))}
              </div>
            </label>
            <p className="mt-2 text-xs text-zinc-500">{copy.codeHint}</p>
            <p className="mt-1 text-xs text-zinc-500">{copy.codeExpires.replace("3600", String(OTP_EXPIRES_SECONDS))}</p>
            <button
              type="button"
              onClick={verifyCode}
              disabled={isChecking || code.trim().length !== OTP_LENGTH}
              className="mt-4 inline-flex min-h-11 items-center justify-center rounded-full bg-zinc-900 px-6 text-sm font-medium text-white shadow-[0_8px_20px_rgba(24,24,24,0.18)] transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] hover:-translate-y-[1px] hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {copy.verify}
            </button>
          </div>
        ) : null}

        {!verified && pending ? <p className="mt-4 text-xs text-zinc-500">{copy.loading}</p> : null}
        {message ? <p className="mt-3 text-sm text-zinc-600">{message}</p> : null}
      </div>
    </div>
  );
}
