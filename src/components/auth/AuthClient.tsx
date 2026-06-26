"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState, type FormEvent } from "react";

import { useSiteSettings } from "@/components/site-settings/SiteSettingsProvider";
import { applySiteBranding } from "@/lib/site-branding";
import { toLocalePath, type Locale } from "@/lib/i18n";
import { getSupabaseBrowserClient, isSupabaseConfigured } from "@/lib/supabase/client";
import type { SupabasePublicConfig } from "@/lib/supabase/client";

type AuthClientProps = {
  locale: Locale;
  nextPath: string;
  supabase: SupabasePublicConfig | null;
};

type Copy = {
  eyebrow: string;
  title: string;
  body: string;
  email: string;
  password: string;
  signIn: string;
  signUp: string;
  switchToSignIn: string;
  switchToSignUp: string;
  submitSignIn: string;
  submitSignUp: string;
  loading: string;
  hint: string;
  backHome: string;
  configMissing: string;
};

const copyByLocale: Record<Locale, Copy> = {
  az: {
    eyebrow: "Perfoumer Auth",
    title: "Xoş gəlmisən",
    body: "Email ilə daxil ol və şəxsi wishlist, rating və rəyləri aktiv et.",
    email: "Email",
    password: "Şifrə",
    signIn: "Giriş",
    signUp: "Qeydiyyat",
    switchToSignIn: "Hesabın var? Giriş et",
    switchToSignUp: "Hesabın yoxdur? Qeydiyyat et",
    submitSignIn: "Daxil ol",
    submitSignUp: "Hesab yarat",
    loading: "Yüklənir...",
    hint: "Qeydiyyatdan sonra təsdiq email-i göndəriləcək.",
    backHome: "Ana səhifə",
    configMissing:
      "Supabase konfiqurasiyası yoxdur. .env faylında NEXT_PUBLIC_SUPABASE_URL və NEXT_PUBLIC_SUPABASE_ANON_KEY əlavə edin.",
  },
  en: {
    eyebrow: "Perfoumer Auth",
    title: "Welcome back",
    body: "Sign in with email to unlock wishlist, ratings, and comments.",
    email: "Email",
    password: "Password",
    signIn: "Sign in",
    signUp: "Sign up",
    switchToSignIn: "Already have an account? Sign in",
    switchToSignUp: "No account yet? Sign up",
    submitSignIn: "Sign in",
    submitSignUp: "Create account",
    loading: "Loading...",
    hint: "A verification email will be sent after sign up.",
    backHome: "Back home",
    configMissing:
      "Supabase is not configured. Add NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY to your .env file.",
  },
  ru: {
    eyebrow: "Perfoumer Auth",
    title: "С возвращением",
    body: "Войдите по email, чтобы открыть wishlist, рейтинг и комментарии.",
    email: "Email",
    password: "Пароль",
    signIn: "Вход",
    signUp: "Регистрация",
    switchToSignIn: "Уже есть аккаунт? Войти",
    switchToSignUp: "Нет аккаунта? Зарегистрироваться",
    submitSignIn: "Войти",
    submitSignUp: "Создать аккаунт",
    loading: "Загрузка...",
    hint: "После регистрации придет письмо для подтверждения.",
    backHome: "На главную",
    configMissing:
      "Supabase не настроен. Добавьте NEXT_PUBLIC_SUPABASE_URL и NEXT_PUBLIC_SUPABASE_ANON_KEY в .env.",
  },
};

const normalizeNextPath = (input: string) => (input.startsWith("/") ? input : "/wishlist");

export function AuthClient({ locale, nextPath, supabase: supabaseConfig }: AuthClientProps) {
  const siteSettings = useSiteSettings();
  const copy = applySiteBranding(copyByLocale[locale], siteSettings);
  const router = useRouter();
  const supabase = getSupabaseBrowserClient(supabaseConfig ?? undefined);
  const [mode, setMode] = useState<"signIn" | "signUp">("signIn");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const passwordAutocomplete = mode === "signIn" ? "current-password" : "new-password";

  const safeNextPath = useMemo(() => normalizeNextPath(nextPath), [nextPath]);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!supabase) {
      return;
    }

    setIsSubmitting(true);
    setMessage("");

    if (mode === "signIn") {
      const { error } = await supabase.auth.signInWithPassword({ email, password });

      if (error) {
        setMessage(error.message);
        setIsSubmitting(false);
        return;
      }

      router.push(safeNextPath);
      router.refresh();
      return;
    }

    try {
      const { data, error: signupError } = await supabase.auth.signUp({
        email,
        password,
      });

      if (signupError) {
        const normalized = signupError.message.toLowerCase();
        console.error("Supabase signup error:", signupError);
        
        if (normalized.includes("user already registered") || normalized.includes("already registered")) {
          setMode("signIn");
          setMessage("An account already exists for this email.");
        } else if (normalized.includes("password") && (normalized.includes("weak") || normalized.includes("short"))) {
          setMessage("Password is too weak. Use at least 6 characters.");
        } else {
          setMessage(signupError.message);
        }
        setIsSubmitting(false);
        return;
      }

      console.log("Signup successful");
      router.push(`/auth/success?pending=1&next=${encodeURIComponent(safeNextPath)}&email=${encodeURIComponent(email)}`);
      router.refresh();
      return;
    } catch (signupError) {
      const errorMessage = signupError instanceof Error ? signupError.message : "Something went wrong. Please try again.";
      console.error("Signup exception:", errorMessage);
      setMessage(errorMessage);
      setIsSubmitting(false);
      return;
    }
  };

  if (!isSupabaseConfigured(supabaseConfig ?? undefined)) {
    return <p className="text-sm text-zinc-600">{copy.configMissing}</p>;
  }

  return (
    <div className="mx-auto grid max-w-5xl gap-5 rounded-[2rem] border border-white/60 bg-[linear-gradient(140deg,rgba(255,255,255,0.95)_0%,rgba(245,244,242,0.92)_100%)] p-5 shadow-[0_28px_90px_rgba(24,24,24,0.08)] ring-1 ring-zinc-200/70 md:grid-cols-[1.1fr_0.9fr] md:p-8">
      <section className="rounded-[1.6rem] bg-[radial-gradient(circle_at_top_left,#ffffff_0%,#f1f1ef_70%)] p-6 ring-1 ring-zinc-200/70 md:p-8">
        <p className="text-[0.74rem] font-medium tracking-[0.22em] text-zinc-500 uppercase">{copy.eyebrow}</p>
        <h1 className="mt-3 text-[2.2rem] leading-[0.95] tracking-[-0.03em] text-zinc-900 md:text-[3.2rem]">{copy.title}</h1>
        <p className="mt-4 max-w-md text-sm leading-7 text-zinc-600 md:text-base">{copy.body}</p>

        <div className="mt-8 flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={() => setMode("signIn")}
            className={[
              "rounded-full px-4 py-2 text-sm font-medium transition",
              mode === "signIn" ? "bg-zinc-900 text-white" : "bg-white text-zinc-600 ring-1 ring-zinc-200",
            ].join(" ")}
          >
            {copy.signIn}
          </button>

          <button
            type="button"
            onClick={() => setMode("signUp")}
            className={[
              "rounded-full px-4 py-2 text-sm font-medium transition",
              mode === "signUp" ? "bg-zinc-900 text-white" : "bg-white text-zinc-600 ring-1 ring-zinc-200",
            ].join(" ")}
          >
            {copy.signUp}
          </button>
        </div>
      </section>

      <section className="rounded-[1.6rem] bg-white p-6 shadow-sm ring-1 ring-zinc-200/70 md:p-8">
        <form className="space-y-4" onSubmit={submit}>
          <label className="block">
            <span className="mb-1.5 block text-sm text-zinc-600">{copy.email}</span>
            <input
              type="email"
              name="email"
              autoComplete="email"
              autoCapitalize="none"
              autoCorrect="off"
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="w-full rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-3 text-sm text-zinc-800 outline-none transition focus:border-zinc-400 focus:bg-white"
            />
          </label>

          <label className="block">
            <span className="mb-1.5 block text-sm text-zinc-600">{copy.password}</span>
            <input
              type="password"
              name="password"
              autoComplete={passwordAutocomplete}
              required
              minLength={6}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="w-full rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-3 text-sm text-zinc-800 outline-none transition focus:border-zinc-400 focus:bg-white"
            />
          </label>

          <button
            type="submit"
            disabled={isSubmitting}
            className="inline-flex min-h-12 w-full items-center justify-center rounded-full bg-zinc-900 px-5 text-sm font-medium text-white transition disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isSubmitting ? copy.loading : mode === "signIn" ? copy.submitSignIn : copy.submitSignUp}
          </button>

          <button
            type="button"
            onClick={() => setMode((prev) => (prev === "signIn" ? "signUp" : "signIn"))}
            className="text-sm text-zinc-500 underline-offset-2 transition hover:text-zinc-800 hover:underline"
          >
            {mode === "signIn" ? copy.switchToSignUp : copy.switchToSignIn}
          </button>

          <p className="text-xs text-zinc-400">{copy.hint}</p>
          {message ? <p className="text-sm text-zinc-600">{message}</p> : null}
        </form>

        <div className="mt-5 pt-4">
          <Link href={toLocalePath("/", locale)} className="text-sm text-zinc-500 underline-offset-2 hover:underline">
            {copy.backHome}
          </Link>
        </div>
      </section>
    </div>
  );
}
