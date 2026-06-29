"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";

import { useSiteSettings } from "@/components/site-settings/SiteSettingsProvider";
import { sendFallbackSignupEmail } from "@/lib/auth-email";
import { applySiteBranding } from "@/lib/site-branding";
import { toLocalePath, type Locale } from "@/lib/i18n";
import { getSupabaseBrowserClient, isSupabaseConfigured } from "@/lib/supabase/client";
import type { SupabasePublicConfig } from "@/lib/supabase/client";

type LoginReason = "account_exists" | "invalid_credentials" | "email_unverified" | "weak_password";

type LoginClientProps = {
  locale: Locale;
  nextPath: string;
  supabase: SupabasePublicConfig | null;
  initialMode: "login" | "signup";
  initialEmail: string;
  initialReason?: LoginReason;
};

type Copy = {
  badge: string;
  title: string;
  subtitle: string;
  feature1: string;
  feature2: string;
  feature3: string;
  username: string;
  usernameHint: string;
  email: string;
  password: string;
  loginTab: string;
  signupTab: string;
  submitLogin: string;
  submitSignup: string;
  switchToSignup: string;
  switchToLogin: string;
  hint: string;
  backHome: string;
  loading: string;
  configMissing: string;
  accountExists: string;
  invalidCredentials: string;
  emailUnverified: string;
  weakPassword: string;
  invalidUsername: string;
  verifyTitle: string;
  verifySubtitle: string;
  codeLabel: string;
  codeHint: string;
  verifyButton: string;
  resendCode: string;
  changeEmail: string;
  codeSent: string;
  invalidCode: string;
  codeExpired: string;
  codeValidity: string;
  verifyingFlow: string;
  successTitle: string;
  successBody: string;
  successFeature1: string;
  successFeature2: string;
  successFeature3: string;
  continueToApp: string;
  genericError: string;
};

const copyByLocale: Record<Locale, Copy> = {
  az: {
    badge: "Perfoumer",
    title: "Perfoumer hesabına xoş gəlmisən",
    subtitle: "Sevdiyin ətirləri yadda saxla, şəxsi seçimlərini rahat idarə et və təcrübəni paylaş.",
    feature1: "Sevdiyin ətirləri bir kliklə yadda saxla",
    feature2: "Müqayisə et və zövqünə uyğun variantı tez tap",
    feature3: "Seçimlərini və tarixçəni profilində topla",
    username: "İstifadəçi adı",
    usernameHint: "3-24 simvol, hərf/rəqəm və . _ - işarələri",
    email: "Email",
    password: "Şifrə",
    loginTab: "Giriş",
    signupTab: "Qeydiyyat",
    submitLogin: "Daxil ol",
    submitSignup: "Hesab yarat",
    switchToSignup: "Hesabın yoxdur? Qeydiyyat et",
    switchToLogin: "Hesabın var? Giriş et",
    hint: "Qeydiyyatdan sonra email təsdiqi tələb oluna bilər.",
    backHome: "Ana səhifə",
    loading: "Yüklənir...",
    configMissing: "Supabase konfiqurasiyası tapılmadı.",
    accountExists: "Bu email üçün hesab artıq mövcuddur. Giriş et.",
    invalidCredentials: "Email və ya şifrə yanlışdır.",
    emailUnverified: "Email təsdiqlənməyib. Inbox-u yoxla və təsdiqlə.",
    weakPassword: "Şifrə daha güclü olmalıdır (ən azı 6 simvol).",
    invalidUsername: "İstifadəçi adı düzgün deyil. 3-24 simvol istifadə et.",
    verifyTitle: "Email təsdiq kodunu daxil et",
    verifySubtitle: "Gələnlər qutusuna göndərilən 8 rəqəmli kodu yaz.",
    codeLabel: "Təsdiq kodu",
    codeHint: "Kodu emaildən daxil et.",
    verifyButton: "Kodu təsdiqlə",
    resendCode: "Kodu yenidən göndər",
    changeEmail: "Emaili dəyiş",
    codeSent: "Təsdiq kodu emailə göndərildi.",
    invalidCode: "Kod yanlışdır və ya vaxtı bitib.",
    codeExpired: "Kodun vaxtı bitdi. Yenidən göndər düyməsinə klik et.",
    codeValidity: "Kod etibarlılığı",
    verifyingFlow: "Yoxlanılır, təsdiq ekranı hazırlanır...",
    successTitle: "Hesab uğurla təsdiqləndi",
    successBody: "Hesabın hazırdır. İndi şəxsi seçimlərini idarə edə bilərsən.",
    successFeature1: "Wishlist yarat və sevdiyin ətirləri saxla",
    successFeature2: "Rəy və reytinqlərlə zövq profilini qur",
    successFeature3: "Sifariş axınında daha sürətli checkout istifadə et",
    continueToApp: "Perfoumer-ə davam et",
    genericError: "Problem yarandı. Yenidən cəhd et.",
  },
  en: {
    badge: "Perfoumer",
    title: "Welcome to your Perfoumer account",
    subtitle: "Save the perfumes you love, manage your personal picks, and share your experience.",
    feature1: "Save favorite perfumes in one click",
    feature2: "Compare options and find your best match faster",
    feature3: "Keep your picks and history organized in one profile",
    username: "Username",
    usernameHint: "3-24 chars, letters/numbers and . _ -",
    email: "Email",
    password: "Password",
    loginTab: "Login",
    signupTab: "Sign up",
    submitLogin: "Sign in",
    submitSignup: "Create account",
    switchToSignup: "No account yet? Sign up",
    switchToLogin: "Already have an account? Sign in",
    hint: "Email verification may be required after sign up.",
    backHome: "Back home",
    loading: "Loading...",
    configMissing: "Supabase configuration is missing.",
    accountExists: "An account already exists for this email. Please sign in.",
    invalidCredentials: "Incorrect email or password.",
    emailUnverified: "Your email is not verified yet. Please check your inbox.",
    weakPassword: "Password is too weak. Use at least 6 characters.",
    invalidUsername: "Invalid username. Use 3-24 allowed characters.",
    verifyTitle: "Enter your email verification code",
    verifySubtitle: "Type the 8-digit code sent to your inbox.",
    codeLabel: "Verification code",
    codeHint: "Enter the code from your email.",
    verifyButton: "Verify code",
    resendCode: "Resend code",
    changeEmail: "Change email",
    codeSent: "Verification code sent to email.",
    invalidCode: "The code is invalid or expired.",
    codeExpired: "Code has expired. Please resend a new one.",
    codeValidity: "Code validity",
    verifyingFlow: "Preparing verification screen...",
    successTitle: "Welcome to Perfoumer",
    successBody: "Your account is ready. You can now personalize your fragrance journey.",
    successFeature1: "Save favorites in your wishlist",
    successFeature2: "Rate and review perfumes you try",
    successFeature3: "Get faster checkout experience",
    continueToApp: "Continue to Perfoumer",
    genericError: "Something went wrong. Please try again.",
  },
  ru: {
    badge: "Perfoumer",
    title: "Добро пожаловать в аккаунт Perfoumer",
    subtitle: "Сохраняйте любимые ароматы, управляйте личной подборкой и делитесь впечатлениями.",
    feature1: "Сохраняйте любимые ароматы в один клик",
    feature2: "Сравнивайте варианты и быстрее находите свой аромат",
    feature3: "Храните подборки и историю в одном профиле",
    username: "Имя пользователя",
    usernameHint: "3-24 символа, буквы/цифры и . _ -",
    email: "Email",
    password: "Пароль",
    loginTab: "Вход",
    signupTab: "Регистрация",
    submitLogin: "Войти",
    submitSignup: "Создать аккаунт",
    switchToSignup: "Нет аккаунта? Регистрация",
    switchToLogin: "Уже есть аккаунт? Войти",
    hint: "После регистрации может потребоваться подтверждение email.",
    backHome: "На главную",
    loading: "Загрузка...",
    configMissing: "Отсутствует конфигурация Supabase.",
    accountExists: "Аккаунт с этим email уже существует. Выполните вход.",
    invalidCredentials: "Неверный email или пароль.",
    emailUnverified: "Email не подтвержден. Проверьте входящие письма.",
    weakPassword: "Слишком простой пароль. Минимум 6 символов.",
    invalidUsername: "Некорректное имя пользователя. Используйте 3-24 символа.",
    verifyTitle: "Введите код подтверждения email",
    verifySubtitle: "Введите 8-значный код из письма.",
    codeLabel: "Код подтверждения",
    codeHint: "Введите код из письма.",
    verifyButton: "Подтвердить код",
    resendCode: "Отправить код снова",
    changeEmail: "Сменить email",
    codeSent: "Код подтверждения отправлен на email.",
    invalidCode: "Код неверный или просрочен.",
    codeExpired: "Срок действия кода истек. Отправьте новый код.",
    codeValidity: "Срок действия кода",
    verifyingFlow: "Подготовка экрана подтверждения...",
    successTitle: "Добро пожаловать в Perfoumer",
    successBody: "Ваш аккаунт готов. Теперь можно персонализировать выбор ароматов.",
    successFeature1: "Сохраняйте избранное в wishlist",
    successFeature2: "Оставляйте оценки и отзывы",
    successFeature3: "Используйте более быстрый checkout",
    continueToApp: "Перейти в Perfoumer",
    genericError: "Произошла ошибка. Попробуйте снова.",
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
const usernamePattern = /^[\p{L}\p{N}][\p{L}\p{N}._-]{2,23}$/u;
const EMAIL_OTP_LENGTH = 8;
const OTP_EXPIRES_SECONDS = 3600;

const resolveReasonMessage = (reason: LoginReason | undefined, copy: Copy) => {
  if (reason === "account_exists") return copy.accountExists;
  if (reason === "invalid_credentials") return copy.invalidCredentials;
  if (reason === "email_unverified") return copy.emailUnverified;
  if (reason === "weak_password") return copy.weakPassword;
  return "";
};

export function LoginClient({
  locale,
  nextPath,
  supabase: supabaseConfig,
  initialMode,
  initialEmail,
  initialReason,
}: LoginClientProps) {
  const siteSettings = useSiteSettings();
  const copy = applySiteBranding(copyByLocale[locale], siteSettings);
  const router = useRouter();
  const supabase = getSupabaseBrowserClient(supabaseConfig ?? undefined);
  const pause = (ms: number) => new Promise<void>((resolve) => window.setTimeout(resolve, ms));

  const [mode, setMode] = useState<"login" | "signup">(initialMode);
  const [uiStage, setUiStage] = useState<"form" | "expanding" | "loading" | "verify" | "success">("form");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState(initialEmail);
  const [password, setPassword] = useState("");
  const [verificationCode, setVerificationCode] = useState("");
  const [pendingEmail, setPendingEmail] = useState(initialEmail.trim());
  const [pendingPassword, setPendingPassword] = useState("");
  const [expiresIn, setExpiresIn] = useState(OTP_EXPIRES_SECONDS);
  const [message, setMessage] = useState(() => resolveReasonMessage(initialReason, copy));
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isReady, setIsReady] = useState(false);
  const stagedTransitionRef = useRef<number | null>(null);
  const otpRefs = useRef<Array<HTMLInputElement | null>>([]);
  const passwordAutocomplete = mode === "login" ? "current-password" : "new-password";

  const safeNextPath = useMemo(() => normalizeNextPath(nextPath), [nextPath]);
  const isExpanded = uiStage === "loading" || uiStage === "verify" || uiStage === "success";
  const isExpanding = uiStage === "expanding";
  const hasCountdown = uiStage === "verify" && expiresIn > 0;
  const countdownText = `${String(Math.floor(expiresIn / 60)).padStart(2, "0")}:${String(expiresIn % 60).padStart(2, "0")}`;
  const otpDigits = useMemo(
    () => Array.from({ length: EMAIL_OTP_LENGTH }, (_, index) => verificationCode[index] ?? ""),
    [verificationCode],
  );

  useEffect(() => {
    const timer = window.setTimeout(() => setIsReady(true), 20);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    return () => {
      if (stagedTransitionRef.current) {
        window.clearTimeout(stagedTransitionRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (uiStage !== "verify" || expiresIn <= 0) return;

    const interval = window.setInterval(() => {
      setExpiresIn((prev) => {
        if (prev <= 1) return 0;
        return prev - 1;
      });
    }, 1000);

    return () => window.clearInterval(interval);
  }, [uiStage, expiresIn]);

  const transitionToVerification = async (targetEmail: string) => {
    setPendingEmail(targetEmail);
    setVerificationCode("");
    setMessage("");

    if (uiStage === "form") {
      setUiStage("expanding");
      await pause(360);
    }

    setUiStage("loading");
    await pause(620);

    setUiStage("verify");
    setExpiresIn(OTP_EXPIRES_SECONDS);
    setMessage(copy.codeSent);
  };

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!supabase) return;

    setIsSubmitting(true);
    setMessage("");

    if (mode === "login") {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        const normalized = error.message.toLowerCase();

        if (normalized.includes("invalid login credentials")) {
          setMessage(copy.invalidCredentials);
        } else if (normalized.includes("email not confirmed") || normalized.includes("email not verified")) {
          await transitionToVerification(email.trim());
          setIsSubmitting(false);
          return;
        } else {
          setMessage(error.message || copy.genericError);
        }

        setIsSubmitting(false);
        return;
      }

      router.push(safeNextPath);
      router.refresh();
      return;
    }

    const normalizedUsername = username.trim();

    if (mode === "signup") {
      setUiStage("expanding");
      if (stagedTransitionRef.current) {
        window.clearTimeout(stagedTransitionRef.current);
      }
      stagedTransitionRef.current = window.setTimeout(() => {
        setUiStage((prev) => (prev === "expanding" ? "loading" : prev));
      }, 320);
    }

    if (!usernamePattern.test(normalizedUsername)) {
      setMessage(copy.invalidUsername);
      setUiStage("form");
      setIsSubmitting(false);
      return;
    }

    setPendingPassword(password);

    try {
      await sendFallbackSignupEmail({
        email: email.trim(),
        password,
        redirectTo: `${window.location.origin}/login?next=${encodeURIComponent(safeNextPath)}`,
        data: { username: normalizedUsername },
      });

      await transitionToVerification(email.trim());
      setIsSubmitting(false);
      return;
    } catch (signupError) {
      const errorMessage = signupError instanceof Error ? signupError.message : String(signupError);
      console.error("Signup exception:", errorMessage);

      const normalized = errorMessage.toLowerCase();
      if (normalized.includes("user already registered") || normalized.includes("already registered")) {
        setMode("login");
        setMessage(copy.accountExists);
      } else if (normalized.includes("password") && (normalized.includes("weak") || normalized.includes("short"))) {
        setMessage(copy.weakPassword);
      } else {
        setMessage(errorMessage || copy.genericError);
      }

      setUiStage("form");
      setIsSubmitting(false);
      return;
    }
  };

  const verifyEmailCode = async () => {
    if (!supabase || !pendingEmail.trim()) return;

    if (expiresIn <= 0) {
      setMessage(copy.codeExpired);
      return;
    }

    setIsSubmitting(true);
    setMessage("");

    const { error } = await supabase.auth.verifyOtp({
      email: pendingEmail.trim(),
      token: verificationCode.trim(),
      type: "signup",
    });

    if (error) {
      setMessage(copy.invalidCode);
      setIsSubmitting(false);
      return;
    }

    setUiStage("success");
    setIsSubmitting(false);
  };

  const resendEmailCode = async () => {
    if (!supabase || !pendingEmail.trim()) {
      setMessage(copy.genericError);
      return;
    }

    setIsSubmitting(true);
    setMessage("");

    try {
      await sendFallbackSignupEmail({
        email: pendingEmail.trim(),
        password: pendingPassword,
        redirectTo: `${window.location.origin}/login?next=${encodeURIComponent(safeNextPath)}`,
      });

      setMessage(copy.codeSent);
      setExpiresIn(OTP_EXPIRES_SECONDS);
      setIsSubmitting(false);
      return;
    } catch (error) {
      setMessage(error instanceof Error ? error.message : copy.genericError);
      setIsSubmitting(false);
      return;
    }
  };

  const updateOtpAt = (index: number, value: string) => {
    const clean = value.replace(/\D/g, "");

    if (!clean) {
      const current = verificationCode.padEnd(EMAIL_OTP_LENGTH, " ").split("");
      current[index] = "";
      setVerificationCode(current.join("").trimEnd());
      return;
    }

    const nextChars = verificationCode.padEnd(EMAIL_OTP_LENGTH, " ").split("");
    if (clean.length > 1) {
      const pasted = clean.slice(0, EMAIL_OTP_LENGTH).split("");
      for (let i = 0; i < EMAIL_OTP_LENGTH; i += 1) {
        nextChars[i] = pasted[i] ?? "";
      }
      setVerificationCode(nextChars.join("").trimEnd());
      const nextFocusIndex = Math.min(clean.length, EMAIL_OTP_LENGTH - 1);
      otpRefs.current[nextFocusIndex]?.focus();
      return;
    }

    nextChars[index] = clean;
    setVerificationCode(nextChars.join("").trimEnd());
    if (index < EMAIL_OTP_LENGTH - 1) {
      otpRefs.current[index + 1]?.focus();
    }
  };

  const handleOtpBackspace = (index: number) => {
    const current = verificationCode.padEnd(EMAIL_OTP_LENGTH, " ").split("");
    if (current[index]) {
      current[index] = "";
      setVerificationCode(current.join("").trimEnd());
      return;
    }

    if (index > 0) {
      otpRefs.current[index - 1]?.focus();
      current[index - 1] = "";
      setVerificationCode(current.join("").trimEnd());
    }
  };

  if (!isSupabaseConfigured(supabaseConfig ?? undefined)) {
    return <p className="text-sm text-zinc-700">{copy.configMissing}</p>;
  }

  return (
    <div
      className={[
        "grid w-full gap-3 rounded-[1.35rem] border border-zinc-200 bg-[#f6f6f4] p-3 shadow-[0_20px_56px_rgba(12,12,12,0.08)] transition-all duration-700 ease-[cubic-bezier(0.22,1,0.36,1)] sm:gap-4 sm:rounded-[1.6rem] sm:p-4 lg:gap-6 lg:rounded-[2rem] lg:p-6",
        isExpanded ? "lg:grid-cols-1" : "lg:grid-cols-[1fr_1.08fr]",
        isReady ? "translate-y-0 opacity-100" : "translate-y-3 opacity-0",
      ].join(" ")}
    >
      {!isExpanded ? <section
        className={[
          "relative hidden min-h-[420px] flex-col justify-between overflow-hidden rounded-[1.6rem] bg-[#f7f7f6] p-6 transition-all duration-700 ease-[cubic-bezier(0.22,1,0.36,1)] lg:flex lg:p-8",
          isSubmitting ? "lg:translate-x-5 lg:scale-[0.98] lg:opacity-0 lg:blur-sm" : "lg:translate-x-0 lg:opacity-100 lg:blur-0",
        ].join(" ")}
      >
        <div>
          <p className="text-[0.72rem] font-semibold tracking-[0.18em] text-zinc-500 uppercase">{copy.badge}</p>
          <h1 className="mt-5 max-w-[14ch] text-[2.2rem] leading-[0.94] tracking-[-0.03em] text-zinc-900 sm:text-[2.6rem] lg:text-[3.1rem]">
            {copy.title}
          </h1>
          <p className="mt-4 max-w-md text-sm leading-7 text-zinc-600">
            {copy.subtitle}
          </p>
          <div className="mt-6 h-px w-24 bg-zinc-300" />
        </div>

        <ul className="space-y-2 text-xs leading-6 text-zinc-600">
          <li className="flex items-start gap-2">
            <span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-zinc-400" aria-hidden="true" />
            <span>{copy.feature1}</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-zinc-400" aria-hidden="true" />
            <span>{copy.feature2}</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-zinc-400" aria-hidden="true" />
            <span>{copy.feature3}</span>
          </li>
        </ul>
      </section> : null}

      <section className={[
        "relative overflow-hidden rounded-[1.6rem] border border-zinc-200 bg-zinc-900 transition-all duration-700 ease-[cubic-bezier(0.22,1,0.36,1)]",
        isExpanded ? "min-h-[500px] sm:min-h-[620px]" : "min-h-[430px] sm:min-h-[520px]",
      ].join(" ")}>
        <video
          autoPlay
          loop
          muted
          playsInline
          className="absolute inset-0 h-full w-full scale-[1.03] object-cover opacity-70 transition-transform duration-[6000ms] ease-out"
          src="/contactvideo.mp4"
        />
        <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(20,20,20,0.28)_0%,rgba(8,8,8,0.68)_72%,rgba(8,8,8,0.8)_100%)]" />
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_20%_16%,rgba(255,255,255,0.2),transparent_36%)]" />

        <div className="relative z-10 flex h-full items-center justify-center p-3 sm:p-5 lg:p-8">
          <div
            className={[
              "w-full rounded-[1.15rem] border border-white/70 bg-white/95 p-4 shadow-[0_14px_34px_rgba(12,12,12,0.26)] backdrop-blur transition-all duration-700 ease-[cubic-bezier(0.22,1,0.36,1)] sm:rounded-[1.3rem] sm:p-5",
              isExpanded ? "max-w-[680px]" : "max-w-[430px]",
              isReady ? "translate-y-0 scale-100 opacity-100" : "translate-y-5 scale-[0.985] opacity-0",
            ].join(" ")}
          >
            {uiStage === "form" ? <div className="relative mb-5 grid grid-cols-2 rounded-full bg-zinc-100 p-1">
              <>
              <span
                aria-hidden="true"
                className={[
                  "pointer-events-none absolute top-1 bottom-1 left-1 w-[calc(50%-0.25rem)] rounded-full bg-zinc-900 shadow-[0_8px_20px_rgba(12,12,12,0.22)] transition-transform duration-500 ease-[cubic-bezier(0.22,1,0.36,1)]",
                  mode === "signup" ? "translate-x-full" : "translate-x-0",
                ].join(" ")}
              />
              <button
                type="button"
                onClick={() => setMode("login")}
                className={[
                  "relative z-10 rounded-full px-3 py-2 text-xs font-medium transition-colors duration-300 sm:px-4 sm:text-sm",
                  mode === "login" ? "text-white" : "text-zinc-600",
                ].join(" ")}
              >
                {copy.loginTab}
              </button>
              <button
                type="button"
                onClick={() => setMode("signup")}
                className={[
                  "relative z-10 rounded-full px-3 py-2 text-xs font-medium transition-colors duration-300 sm:px-4 sm:text-sm",
                  mode === "signup" ? "text-white" : "text-zinc-600",
                ].join(" ")}
              >
                {copy.signupTab}
              </button>
              </>
            </div> : null}

            {uiStage === "form" ? <form className="space-y-3" onSubmit={onSubmit}>
              {mode === "signup" ? (
                <label className="block">
                  <span className="mb-1.5 block text-[0.8rem] text-zinc-500">{copy.username}</span>
                  <input
                    type="text"
                    required
                    minLength={3}
                    maxLength={24}
                    name="display_name"
                    autoComplete="off"
                    autoCapitalize="none"
                    autoCorrect="off"
                    spellCheck={false}
                    value={username}
                    onChange={(event) => setUsername(event.target.value)}
                    className="w-full rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2.5 text-sm text-zinc-900 outline-none transition duration-300 focus:border-zinc-400 focus:bg-white focus:shadow-[0_0_0_3px_rgba(24,24,27,0.06)]"
                  />
                  <span className="mt-1 block text-[0.7rem] text-zinc-400">{copy.usernameHint}</span>
                </label>
              ) : null}

              <label className="block">
                <span className="mb-1.5 block text-[0.8rem] text-zinc-500">{copy.email}</span>
                <input
                  type="email"
                  name="email"
                  autoComplete="email"
                  autoCapitalize="none"
                  autoCorrect="off"
                  required
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  className="w-full rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2.5 text-sm text-zinc-900 outline-none transition duration-300 focus:border-zinc-400 focus:bg-white focus:shadow-[0_0_0_3px_rgba(24,24,27,0.06)]"
                />
              </label>

              <label className="block">
                <span className="mb-1.5 block text-[0.8rem] text-zinc-500">{copy.password}</span>
                <input
                  type="password"
                  name="password"
                  autoComplete={passwordAutocomplete}
                  required
                  minLength={6}
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  className="w-full rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2.5 text-sm text-zinc-900 outline-none transition duration-300 focus:border-zinc-400 focus:bg-white focus:shadow-[0_0_0_3px_rgba(24,24,27,0.06)]"
                />
              </label>

              <button
                type="submit"
                disabled={isSubmitting}
                className="group relative inline-flex min-h-11 w-full items-center justify-center overflow-hidden rounded-full bg-zinc-900 px-5 text-sm font-medium text-white transition duration-300 hover:bg-zinc-800 hover:shadow-[0_12px_28px_rgba(12,12,12,0.28)] disabled:cursor-not-allowed disabled:opacity-60"
              >
                <span className="pointer-events-none absolute -left-14 top-0 h-full w-12 -skew-x-12 bg-white/20 opacity-0 transition-all duration-700 group-hover:left-[calc(100%+3.5rem)] group-hover:opacity-100" />
                {isSubmitting ? copy.loading : mode === "login" ? copy.submitLogin : copy.submitSignup}
              </button>

              <button
                type="button"
                onClick={() => setMode((prev) => (prev === "login" ? "signup" : "login"))}
                className="text-xs text-zinc-500 underline-offset-2 transition hover:text-zinc-800 hover:underline"
              >
                {mode === "login" ? copy.switchToSignup : copy.switchToLogin}
              </button>

              <p className="text-[0.68rem] leading-5 text-zinc-400">{copy.hint}</p>
              {message ? (
                <p className="animate-[fadeIn_280ms_ease] rounded-xl bg-zinc-100 px-3 py-2 text-sm text-zinc-700 ring-1 ring-zinc-200">
                  {message}
                </p>
              ) : null}
            </form>
            : null}

            {uiStage === "expanding" || uiStage === "loading" ? (
              <div className={[
                "flex min-h-[320px] flex-col items-center justify-center gap-4 transition-all duration-500",
                isExpanding ? "opacity-70" : "opacity-100",
              ].join(" ")}>
                <div className="h-10 w-10 animate-spin rounded-full border-2 border-zinc-300 border-t-zinc-900" />
                <p className="text-sm text-zinc-600">{copy.verifyingFlow}</p>
              </div>
            ) : null}

            {uiStage === "verify" ? (
              <div className="space-y-4">
                <h2 className="text-[1.7rem] leading-[0.95] tracking-[-0.02em] text-zinc-900">{copy.verifyTitle}</h2>
                <p className="text-sm leading-6 text-zinc-600">{copy.verifySubtitle}</p>
                <p className="text-xs text-zinc-500">{pendingEmail}</p>

                <label className="block">
                  <span className="mb-1.5 block text-[0.8rem] text-zinc-500">{copy.codeLabel}</span>
                  <div className="flex flex-wrap gap-2">
                    {otpDigits.map((digit, index) => (
                      <input
                        key={`login-email-otp-${index}`}
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
                          } else if (event.key === "ArrowRight" && index < EMAIL_OTP_LENGTH - 1) {
                            event.preventDefault();
                            otpRefs.current[index + 1]?.focus();
                          }
                        }}
                        onPaste={(event) => {
                          event.preventDefault();
                          updateOtpAt(index, event.clipboardData.getData("text"));
                        }}
                        className="h-12 w-11 rounded-xl bg-zinc-50 text-center text-lg font-semibold text-zinc-800 outline-none ring-1 ring-zinc-200 transition-all duration-300 focus:-translate-y-[1px] focus:ring-zinc-400"
                      />
                    ))}
                  </div>
                  <span className="mt-2 block text-[0.72rem] text-zinc-500">{copy.codeHint}</span>
                  <span className="mt-1 block text-[0.72rem] font-medium text-zinc-600">
                    {copy.codeValidity}: {hasCountdown ? countdownText : "00:00"}
                  </span>
                </label>

                <div className="grid gap-2 sm:grid-cols-3">
                  <button
                    type="button"
                    onClick={verifyEmailCode}
                    disabled={isSubmitting || expiresIn <= 0 || verificationCode.trim().length !== EMAIL_OTP_LENGTH}
                    className="inline-flex min-h-11 items-center justify-center rounded-full bg-zinc-900 px-4 text-sm font-medium text-white transition hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {isSubmitting ? copy.loading : copy.verifyButton}
                  </button>

                  <button
                    type="button"
                    onClick={resendEmailCode}
                    disabled={isSubmitting}
                    className="inline-flex min-h-11 items-center justify-center rounded-full border border-zinc-200 bg-white px-4 text-sm font-medium text-zinc-700 transition hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {copy.resendCode}
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setUiStage("form");
                      setVerificationCode("");
                      setMessage("");
                    }}
                    disabled={isSubmitting}
                    className="inline-flex min-h-11 items-center justify-center rounded-full border border-zinc-200 bg-white px-4 text-sm font-medium text-zinc-700 transition hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {copy.changeEmail}
                  </button>
                </div>

                {message ? (
                  <p className="animate-[fadeIn_280ms_ease] rounded-xl bg-zinc-100 px-3 py-2 text-sm text-zinc-700 ring-1 ring-zinc-200">
                    {message}
                  </p>
                ) : null}
              </div>
            ) : null}

            {uiStage === "success" ? (
              <div className="animate-[successIn_560ms_cubic-bezier(0.22,1,0.36,1)_both] space-y-3.5">
                <div className="inline-flex h-11 w-11 items-center justify-center rounded-full bg-zinc-900 text-white shadow-[0_10px_26px_rgba(12,12,12,0.24)]">
                  <svg viewBox="0 0 20 20" className="h-5 w-5" fill="currentColor" aria-hidden="true">
                    <path fillRule="evenodd" d="M16.704 5.29a1 1 0 010 1.415l-7.2 7.2a1 1 0 01-1.415 0l-3-3a1 1 0 111.415-1.415l2.292 2.292 6.492-6.492a1 1 0 011.416 0z" clipRule="evenodd" />
                  </svg>
                </div>
                <h2 className="text-[1.55rem] leading-[0.95] tracking-[-0.02em] text-zinc-900 sm:text-[1.9rem]">{copy.successTitle}</h2>
                <p className="text-sm leading-6 text-zinc-600">{copy.successBody}</p>
                <ul className="space-y-1 text-sm text-zinc-700">
                  <li>- {copy.successFeature1}</li>
                  <li>- {copy.successFeature2}</li>
                  <li>- {copy.successFeature3}</li>
                </ul>
                <button
                  type="button"
                  onClick={() => {
                    router.push(safeNextPath);
                    router.refresh();
                  }}
                  className="inline-flex min-h-11 w-full items-center justify-center rounded-full bg-zinc-900 px-4 text-sm font-medium text-white transition hover:bg-zinc-800"
                >
                  {copy.continueToApp}
                </button>
              </div>
            ) : null}

            <div className="mt-5 border-t border-zinc-200 pt-4">
              <Link href={toLocalePath("/", locale)} className="text-sm text-zinc-500 underline-offset-2 hover:text-zinc-800 hover:underline">
                {copy.backHome}
              </Link>
            </div>
          </div>
        </div>
      </section>

      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(3px); }
          to { opacity: 1; transform: translateY(0); }
        }

        @keyframes successIn {
          0% { opacity: 0; transform: translateY(10px) scale(0.98); }
          100% { opacity: 1; transform: translateY(0) scale(1); }
        }
      `}</style>
    </div>
  );
}
