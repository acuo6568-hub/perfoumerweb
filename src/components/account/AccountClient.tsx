"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import {
  CaretRight,
  Camera,
  ChatCircleDots,
  CircleNotch,
  CheckCircle,
  DotsThreeOutlineVertical,
  EnvelopeSimple,
  Heart,
  Info,
  PencilSimple,
  SignOut,
  Trash,
  UserCircle,
  WarningCircle,
  X,
} from "@phosphor-icons/react";

import { toLocalePath, type Locale } from "@/lib/i18n";
import { AccountAddressesClient } from "@/components/account/AccountAddressesClient";
import { AccountOrdersClient } from "@/components/account/AccountOrdersClient";
import { getSupabaseBrowserClient, isSupabaseConfigured } from "@/lib/supabase/client";
import type { SupabasePublicConfig } from "@/lib/supabase/client";

type AccountClientProps = {
  locale: Locale;
  supabase: SupabasePublicConfig | null;
  focusSection?: "all" | "profile" | "email" | "comments" | "addresses" | "orders";
};

type NoticeTone = "success" | "error" | "info";
type ActionPhase = "idle" | "loading" | "success" | "error";
const ACCOUNT_NOTICE_KEY = "account.notice";

type Copy = {
  title: string;
  subtitle: string;
  profile: string;
  username: string;
  saveProfile: string;
  emailSection: string;
  currentEmail: string;
  newEmail: string;
  sendCode: string;
  verifyCode: string;
  codeLabel: string;
  codeHint: string;
  codeExpires: string;
  loading: string;
  loginRequiredTitle: string;
  loginRequiredBody: string;
  loginCta: string;
  signedOut: string;
  signOut: string;
  logoutConfirmTitle: string;
  logoutConfirmBody: string;
  logoutCancel: string;
  logoutConfirm: string;
  settings: string;
  cancelEdit: string;
  editUsername: string;
  editEmail: string;
  noChanges: string;
  invalidUsername: string;
  configMissing: string;
  profileSaved: string;
  avatarSection: string;
  addressesSection: string;
  ordersSection: string;
  uploadAvatar: string;
  avatarHint: string;
  avatarUploading: string;
  avatarModerating: string;
  avatarSaved: string;
  avatarRejected: string;
  avatarRejectedReasonPrefix: string;
  avatarRejectedReasonUnknown: string;
  avatarScanFailed: string;
  avatarTooLarge: string;
  avatarInvalidType: string;
  emailCodeSent: string;
  emailVerified: string;
  emailPendingSecondVerification: string;
  sameEmailError: string;
  genericError: string;
  commentsSection: string;
  commentsSubtitle: string;
  commentsLoading: string;
  commentsEmpty: string;
  commentsLoadFailed: string;
  commentsCountLabel: string;
  commentsOnPerfumeLabel: string;
  commentsPostedLabel: string;
  commentsRatingLabel: string;
  commentsDelete: string;
  commentsDeleting: string;
  commentsDeleteTitle: string;
  commentsDeleteAction: string;
  commentsDeleteConfirm: string;
  commentsDeleteSuccess: string;
  commentsDeleteFailed: string;
};

const OTP_LENGTH = 8;
const OTP_EXPIRES_SECONDS = 3600;
const MAX_AVATAR_BYTES = 4 * 1024 * 1024;

const getAvatarUrlFromMetadata = (metadata: unknown) => {
  if (!metadata || typeof metadata !== "object") {
    return "";
  }

  const value = (metadata as Record<string, unknown>).avatar_url;
  return typeof value === "string" ? value.trim() : "";
};

const extractAvatarStoragePath = (publicUrl: string, supabaseUrl: string) => {
  const prefix = `${supabaseUrl.replace(/\/$/, "")}/storage/v1/object/public/avatars/`;
  if (!publicUrl.startsWith(prefix)) {
    return "";
  }

  return decodeURIComponent(publicUrl.slice(prefix.length));
};

const MODERATION_REASON_LABELS: Record<string, string> = {
  sexual: "sexual content",
  "sexual/minors": "sexual content involving minors",
  "violence/graphic": "graphic violence",
  "self-harm/intent": "self-harm intent",
  "self-harm/instructions": "self-harm instructions",
};

const formatModerationReason = (reason: string) => {
  const normalized = reason.trim().toLowerCase();
  if (!normalized) {
    return "";
  }

  return MODERATION_REASON_LABELS[normalized] ?? normalized.replaceAll("/", " / ").replaceAll("_", " ");
};

type AccountCommentHistoryItem = {
  id: string;
  perfume_slug: string;
  rating: number;
  comment: string;
  created_at: string;
};

const LOCALE_DATE_FORMAT = {
  az: "az-AZ",
  en: "en-US",
  ru: "ru-RU",
} as const;

const formatPerfumeSlugLabel = (value: string) =>
  value
    .split("-")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");

const copyByLocale: Record<Locale, Copy> = {
  az: {
    title: "Hesabım",
    subtitle: "Bu bölmədə profil məlumatlarınızı yeniləyə və email ünvanınızı təsdiqləyə bilərsiniz.",
    profile: "Profil məlumatları",
    username: "İstifadəçi adı",
    saveProfile: "Profili yadda saxla",
    emailSection: "Email ünvanını dəyiş",
    currentEmail: "Cari email",
    newEmail: "Yeni email",
    sendCode: "Təsdiq kodu göndər",
    verifyCode: "Kodu təsdiqlə",
    codeLabel: "Təsdiq kodu",
    codeHint: "Emailə gələn kodu daxil et.",
    codeExpires: "Kodun etibarlılıq müddəti: 3600 saniyə.",
    loading: "Yüklənir...",
    loginRequiredTitle: "Hesab bölməsi üçün giriş et",
    loginRequiredBody: "Hesab məlumatlarını idarə etmək üçün əvvəlcə daxil ol.",
    loginCta: "Giriş et",
    signedOut: "Hesabdan çıxış edildi.",
    signOut: "Çıxış",
    logoutConfirmTitle: "Çıxışı təsdiqlə",
    logoutConfirmBody: "Hesabdan çıxmaq istədiyinizə əminsiniz?",
    logoutCancel: "Ləğv et",
    logoutConfirm: "Bəli, çıxış et",
    settings: "Ayarlar",
    cancelEdit: "Redaktəni ləğv et",
    editUsername: "İstifadəçi adını redaktə et",
    editEmail: "Email redaktə et",
    noChanges: "Yadda saxlanacaq dəyişiklik yoxdur.",
    invalidUsername: "İstifadəçi adı ən azı 3 simvol olmalıdır.",
    configMissing: "Supabase konfiqurasiyası yoxdur.",
    profileSaved: "Profil məlumatları yeniləndi.",
    avatarSection: "Profil şəkli",
    addressesSection: "Yadda saxlanmış ünvanlar",
    ordersSection: "Keçmiş sifarişlər",
    uploadAvatar: "Şəkil yüklə",
    avatarHint: "PNG, JPG və WEBP. Maksimum 4MB.",
    avatarUploading: "Şəkil yüklənir...",
    avatarModerating: "Şəkil yoxlanılır...",
    avatarSaved: "Profil şəkli yeniləndi.",
    avatarRejected: "Profil şəkli uyğun deyil. Zəhmət olmasa başqa şəkil seçin.",
    avatarRejectedReasonPrefix: "Rədd edilmə səbəbi",
    avatarRejectedReasonUnknown: "Naməlum səbəb",
    avatarScanFailed: "Şəkil yoxlaması hazır deyil. Bir az sonra yenidən yoxlayın.",
    avatarTooLarge: "Şəkil 4MB-dan böyük ola bilməz.",
    avatarInvalidType: "Yalnız şəkil faylları yükləmək olar.",
    emailCodeSent: "Yeni email üçün təsdiq kodu göndərildi.",
    emailVerified: "Email ünvanı təsdiqləndi və yeniləndi.",
    emailPendingSecondVerification:
      "Kod qəbul edildi, amma email hələ dəyişməyib. Köhnə emailə gələn təsdiqi də tamamla və ya Auth ayarlarında “Secure email change” funksiyasını söndür.",
    sameEmailError: "Yeni email cari email ilə eyni ola bilməz.",
    genericError: "Xəta baş verdi. Yenidən cəhd edin.",
    commentsSection: "Şərh tarixçəm",
    commentsSubtitle: "Profilinizdən yazdığınız bütün rəylər bir yerdə.",
    commentsLoading: "Şərhlər yüklənir...",
    commentsEmpty: "Hələ şərh yazmamısınız.",
    commentsLoadFailed: "Şərhləri yükləmək olmadı. Bir az sonra yenidən cəhd edin.",
    commentsCountLabel: "şərh",
    commentsOnPerfumeLabel: "Ətir",
    commentsPostedLabel: "Tarix",
    commentsRatingLabel: "Reytinq",
    commentsDelete: "Sil",
    commentsDeleting: "Silinir...",
    commentsDeleteTitle: "Şərhi sil",
    commentsDeleteAction: "Bəli, sil",
    commentsDeleteConfirm: "Bu şərhi silmək istədiyinizə əminsiniz?",
    commentsDeleteSuccess: "Şərh silindi.",
    commentsDeleteFailed: "Şərhi silmək mümkün olmadı.",
  },
  en: {
    title: "My Account",
    subtitle: "Update profile details and verify your email changes.",
    profile: "Profile Details",
    username: "Username",
    saveProfile: "Save profile",
    emailSection: "Change Email",
    currentEmail: "Current email",
    newEmail: "New email",
    sendCode: "Send verification code",
    verifyCode: "Verify code",
    codeLabel: "Verification code",
    codeHint: "Type the code sent to your email.",
    codeExpires: "Code expiration: 3600 seconds.",
    loading: "Loading...",
    loginRequiredTitle: "Sign in to manage your account",
    loginRequiredBody: "You need to sign in first to edit profile details.",
    loginCta: "Login",
    signedOut: "Signed out.",
    signOut: "Sign out",
    logoutConfirmTitle: "Confirm sign out",
    logoutConfirmBody: "Are you sure you want to sign out of your account?",
    logoutCancel: "Cancel",
    logoutConfirm: "Yes, sign out",
    settings: "Settings",
    cancelEdit: "Cancel editing",
    editUsername: "Edit username",
    editEmail: "Edit email",
    noChanges: "There are no changes to save.",
    invalidUsername: "Username must be at least 3 characters.",
    configMissing: "Supabase configuration is missing.",
    profileSaved: "Profile details updated.",
    avatarSection: "Profile photo",
    addressesSection: "Saved addresses",
    ordersSection: "Past orders",
    uploadAvatar: "Upload photo",
    avatarHint: "PNG, JPG, or WEBP. Max 4MB.",
    avatarUploading: "Uploading photo...",
    avatarModerating: "Scanning photo...",
    avatarSaved: "Profile photo updated.",
    avatarRejected: "Photo is not allowed. Please choose a different one.",
    avatarRejectedReasonPrefix: "Denial reason",
    avatarRejectedReasonUnknown: "Unknown reason",
    avatarScanFailed: "Photo scan is unavailable right now. Please try again.",
    avatarTooLarge: "Photo must be 4MB or smaller.",
    avatarInvalidType: "Only image files are allowed.",
    emailCodeSent: "A verification code was sent to your new email.",
    emailVerified: "Email address verified and updated.",
    emailPendingSecondVerification:
      "Code accepted, but email is still unchanged. Confirm from the old email too, or disable “Secure email change” in Auth settings.",
    sameEmailError: "New email cannot be the same as your current email.",
    genericError: "Something went wrong. Please try again.",
    commentsSection: "My Comment History",
    commentsSubtitle: "All reviews you posted from your profile, in one place.",
    commentsLoading: "Loading your comments...",
    commentsEmpty: "You have not posted any comments yet.",
    commentsLoadFailed: "Could not load your comments right now. Please try again.",
    commentsCountLabel: "comments",
    commentsOnPerfumeLabel: "Perfume",
    commentsPostedLabel: "Posted",
    commentsRatingLabel: "Rating",
    commentsDelete: "Delete",
    commentsDeleting: "Deleting...",
    commentsDeleteTitle: "Delete comment",
    commentsDeleteAction: "Yes, delete",
    commentsDeleteConfirm: "Are you sure you want to delete this comment?",
    commentsDeleteSuccess: "Comment deleted.",
    commentsDeleteFailed: "Could not delete comment.",
  },
  ru: {
    title: "Мой аккаунт",
    subtitle: "Обновите профиль и подтвердите смену email.",
    profile: "Данные профиля",
    username: "Имя пользователя",
    saveProfile: "Сохранить профиль",
    emailSection: "Сменить email",
    currentEmail: "Текущий email",
    newEmail: "Новый email",
    sendCode: "Отправить код",
    verifyCode: "Подтвердить код",
    codeLabel: "Код подтверждения",
    codeHint: "Введите код из письма.",
    codeExpires: "Срок действия кода: 3600 секунд.",
    loading: "Загрузка...",
    loginRequiredTitle: "Войдите для управления аккаунтом",
    loginRequiredBody: "Чтобы редактировать данные аккаунта, сначала войдите.",
    loginCta: "Войти",
    signedOut: "Вы вышли из аккаунта.",
    signOut: "Выйти",
    logoutConfirmTitle: "Подтвердите выход",
    logoutConfirmBody: "Вы уверены, что хотите выйти из аккаунта?",
    logoutCancel: "Отмена",
    logoutConfirm: "Да, выйти",
    settings: "Настройки",
    cancelEdit: "Отменить редактирование",
    editUsername: "Редактировать имя пользователя",
    editEmail: "Редактировать email",
    noChanges: "Нет изменений для сохранения.",
    invalidUsername: "Имя пользователя должно быть не короче 3 символов.",
    configMissing: "Конфигурация Supabase отсутствует.",
    profileSaved: "Данные профиля обновлены.",
    avatarSection: "Фото профиля",
    addressesSection: "Сохраненные адреса",
    ordersSection: "История заказов",
    uploadAvatar: "Загрузить фото",
    avatarHint: "PNG, JPG или WEBP. Максимум 4MB.",
    avatarUploading: "Загрузка фото...",
    avatarModerating: "Проверка фото...",
    avatarSaved: "Фото профиля обновлено.",
    avatarRejected: "Фото не прошло проверку. Выберите другое изображение.",
    avatarRejectedReasonPrefix: "Причина отклонения",
    avatarRejectedReasonUnknown: "Неизвестная причина",
    avatarScanFailed: "Проверка фото сейчас недоступна. Попробуйте позже.",
    avatarTooLarge: "Фото должно быть не больше 4MB.",
    avatarInvalidType: "Разрешены только файлы изображений.",
    emailCodeSent: "Код подтверждения отправлен на новый email.",
    emailVerified: "Email подтвержден и обновлен.",
    emailPendingSecondVerification:
      "Код принят, но email пока не изменился. Подтвердите также через старый email или отключите “Secure email change” в настройках Auth.",
    sameEmailError: "Новый email не может совпадать с текущим.",
    genericError: "Произошла ошибка. Попробуйте снова.",
    commentsSection: "История моих комментариев",
    commentsSubtitle: "Все отзывы, которые вы оставили из своего профиля.",
    commentsLoading: "Загружаем ваши комментарии...",
    commentsEmpty: "Вы еще не оставили ни одного комментария.",
    commentsLoadFailed: "Не удалось загрузить комментарии. Попробуйте позже.",
    commentsCountLabel: "комментариев",
    commentsOnPerfumeLabel: "Аромат",
    commentsPostedLabel: "Дата",
    commentsRatingLabel: "Рейтинг",
    commentsDelete: "Удалить",
    commentsDeleting: "Удаление...",
    commentsDeleteTitle: "Удалить комментарий",
    commentsDeleteAction: "Да, удалить",
    commentsDeleteConfirm: "Вы уверены, что хотите удалить этот комментарий?",
    commentsDeleteSuccess: "Комментарий удален.",
    commentsDeleteFailed: "Не удалось удалить комментарий.",
  },
};

export function AccountClient({ locale, supabase: supabaseConfig, focusSection = "all" }: AccountClientProps) {
  const copy = copyByLocale[locale];
  const router = useRouter();
  const supabase = getSupabaseBrowserClient(supabaseConfig ?? undefined);

  const [isReady, setIsReady] = useState(() => !supabase);
  const [userId, setUserId] = useState("");
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [initialUsername, setInitialUsername] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [code, setCode] = useState("");
  const [codeSent, setCodeSent] = useState(false);
  const [notice, setNotice] = useState<{ text: string; tone: NoticeTone } | null>(null);
  const [isBusy, setIsBusy] = useState(false);
  const [isAvatarBusy, setIsAvatarBusy] = useState(false);
  const [isAvatarScanning, setIsAvatarScanning] = useState(false);
  const [avatarModerationIssue, setAvatarModerationIssue] = useState("");
  const [commentHistory, setCommentHistory] = useState<AccountCommentHistoryItem[]>([]);
  const [isCommentHistoryLoading, setIsCommentHistoryLoading] = useState(false);
  const [commentHistoryError, setCommentHistoryError] = useState("");
  const [deletingHistoryCommentId, setDeletingHistoryCommentId] = useState("");
  const [pendingDeleteHistoryCommentId, setPendingDeleteHistoryCommentId] = useState("");
  const [profileAction, setProfileAction] = useState<{ phase: ActionPhase; text: string }>({
    phase: "idle",
    text: "",
  });
  const [emailAction, setEmailAction] = useState<{ phase: ActionPhase; text: string }>({
    phase: "idle",
    text: "",
  });
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const [isEmailMenuOpen, setIsEmailMenuOpen] = useState(false);
  const [isLogoutConfirmOpen, setIsLogoutConfirmOpen] = useState(false);
  const [isDomReady, setIsDomReady] = useState(false);
  const [editMode, setEditMode] = useState<"username" | "email" | null>(null);
  const [activeSection, setActiveSection] = useState<"profile" | "email" | "comments" | "addresses" | "orders" | null>(
    focusSection === "all" ? null : focusSection,
  );
  const otpRefs = useRef<Array<HTMLInputElement | null>>([]);
  const profileResetTimerRef = useRef<number | null>(null);
  const emailResetTimerRef = useRef<number | null>(null);
  const otpDigits = useMemo(
    () => Array.from({ length: OTP_LENGTH }, (_, index) => code[index] ?? ""),
    [code],
  );
  useEffect(() => {
    if (focusSection === "all") return;
    setActiveSection(focusSection);
  }, [focusSection]);

  const showProfileSection = focusSection === "all" ? activeSection === "profile" : focusSection === "profile";
  const showEmailSection = focusSection === "all" ? activeSection === "email" : focusSection === "email";
  const showCommentsSection = focusSection === "all" ? activeSection === "comments" : focusSection === "comments";
  const showAddressesSection = focusSection === "all" ? activeSection === "addresses" : focusSection === "addresses";
  const showOrdersSection = focusSection === "all" ? activeSection === "orders" : focusSection === "orders";
  const panelKey = focusSection === "all" ? activeSection ?? "menu" : focusSection;

  useEffect(() => {
    if (!supabase) {
      return;
    }

    supabase.auth.getSession().then(({ data }) => {
      const session = data.session;
      if (!session?.user) {
        setIsReady(true);
        return;
      }

      const metadataUsername =
        typeof session.user.user_metadata?.username === "string"
          ? session.user.user_metadata.username
          : "";
      const metadataAvatar = getAvatarUrlFromMetadata(session.user.user_metadata);
      const fallbackUsername = (session.user.email ?? "").split("@")[0] ?? "";

      setUserId(session.user.id);
      setEmail(session.user.email ?? "");
      setUsername(metadataUsername || fallbackUsername);
      setInitialUsername(metadataUsername || fallbackUsername);
      setAvatarUrl(metadataAvatar);
      setIsReady(true);
    });
  }, [supabase]);

  const loginTargetPath =
    focusSection === "profile"
      ? "/account/profile"
      : focusSection === "email"
        ? "/account/email"
        : focusSection === "comments"
          ? "/account/comments"
          : "/account";
  const loginHref = `/login?next=${encodeURIComponent(loginTargetPath)}`;
  const normalizedUsername = username.trim();
  const normalizedInitialUsername = initialUsername.trim();
  const normalizedCurrentEmail = email.trim().toLowerCase();
  const normalizedNewEmail = newEmail.trim().toLowerCase();
  const isUsernameChanged =
    normalizedUsername.length >= 3 && normalizedUsername !== normalizedInitialUsername;
  const isNewEmailChanged = !!normalizedNewEmail && normalizedNewEmail !== normalizedCurrentEmail;

  const showNotice = (text: string, tone: NoticeTone, persistAfterRefresh = false) => {
    if (persistAfterRefresh && typeof window !== "undefined") {
      window.sessionStorage.setItem(
        ACCOUNT_NOTICE_KEY,
        JSON.stringify({ text, tone, createdAt: Date.now() }),
      );
    }
    setNotice({ text, tone });
  };

  const scheduleProfileActionReset = (delayMs = 2800) => {
    if (profileResetTimerRef.current) {
      window.clearTimeout(profileResetTimerRef.current);
    }
    profileResetTimerRef.current = window.setTimeout(() => {
      setProfileAction({ phase: "idle", text: "" });
    }, delayMs);
  };

  const scheduleEmailActionReset = (delayMs = 2800) => {
    if (emailResetTimerRef.current) {
      window.clearTimeout(emailResetTimerRef.current);
    }
    emailResetTimerRef.current = window.setTimeout(() => {
      setEmailAction({ phase: "idle", text: "" });
    }, delayMs);
  };

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const raw = window.sessionStorage.getItem(ACCOUNT_NOTICE_KEY);
    if (!raw) {
      return;
    }

    try {
      const parsed = JSON.parse(raw) as {
        text?: string;
        tone?: NoticeTone;
        createdAt?: number;
      };

      const isFresh = typeof parsed.createdAt === "number" && Date.now() - parsed.createdAt < 12000;
      if (parsed.text && parsed.tone && isFresh) {
        setNotice({ text: parsed.text, tone: parsed.tone });
      }
    } catch {
      // Ignore malformed session data.
    } finally {
      window.sessionStorage.removeItem(ACCOUNT_NOTICE_KEY);
    }
  }, []);

  useEffect(() => {
    setIsDomReady(true);
  }, []);

  useEffect(() => {
    if (!isLogoutConfirmOpen && !pendingDeleteHistoryCommentId) {
      return;
    }

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        if (pendingDeleteHistoryCommentId) {
          setPendingDeleteHistoryCommentId("");
          return;
        }
        setIsLogoutConfirmOpen(false);
      }
    };

    window.addEventListener("keydown", handleEscape);
    return () => {
      window.removeEventListener("keydown", handleEscape);
    };
  }, [isLogoutConfirmOpen, pendingDeleteHistoryCommentId]);

  useEffect(() => {
    return () => {
      if (profileResetTimerRef.current) {
        window.clearTimeout(profileResetTimerRef.current);
      }
      if (emailResetTimerRef.current) {
        window.clearTimeout(emailResetTimerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (!supabase || !userId) {
      setCommentHistory([]);
      setCommentHistoryError("");
      setIsCommentHistoryLoading(false);
      return;
    }

    let isMounted = true;
    setIsCommentHistoryLoading(true);
    setCommentHistoryError("");

    supabase
      .from("comments")
      .select("id,perfume_slug,rating,comment,created_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(50)
      .then(({ data, error }) => {
        if (!isMounted) {
          return;
        }

        if (error) {
          setCommentHistoryError(copy.commentsLoadFailed);
          setCommentHistory([]);
          setIsCommentHistoryLoading(false);
          return;
        }

        const parsed = (data ?? [])
          .filter(
            (
              item,
            ): item is {
              id: unknown;
              perfume_slug: unknown;
              rating: unknown;
              comment: unknown;
              created_at: unknown;
            } => typeof item === "object" && item !== null,
          )
          .map((item) => ({
            id: String(item.id ?? ""),
            perfume_slug: String(item.perfume_slug ?? "").trim().toLowerCase(),
            rating: Number(item.rating ?? 0),
            comment: String(item.comment ?? "").trim(),
            created_at: String(item.created_at ?? ""),
          }))
          .filter((item) => item.id && item.perfume_slug && item.comment);

        setCommentHistory(parsed);
        setIsCommentHistoryLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [copy.commentsLoadFailed, supabase, userId]);

  const saveProfile = async () => {
    if (!supabase) return;

    if (!isUsernameChanged) {
      showNotice(copy.noChanges, "info");
      return;
    }

    if (normalizedUsername.length < 3) {
      showNotice(copy.invalidUsername, "error");
      return;
    }

    setIsBusy(true);
    setNotice(null);
    setProfileAction({ phase: "loading", text: copy.loading });

    const { data: sessionData } = await supabase.auth.getSession();
    const existingMetadata = sessionData.session?.user?.user_metadata ?? {};
    const { error } = await supabase.auth.updateUser({
      data: { ...existingMetadata, username: normalizedUsername },
    });

    if (error) {
      showNotice(error.message || copy.genericError, "error");
      setProfileAction({ phase: "error", text: error.message || copy.genericError });
      scheduleProfileActionReset(3600);
      setIsBusy(false);
      return;
    }

    // Keep historical comments in sync with the latest chosen username.
    const commentsUsernameSync = await supabase
      .from("comments")
      .update({ username: normalizedUsername })
      .eq("user_id", userId);

    if (commentsUsernameSync.error?.message.toLowerCase().includes("username")) {
      // Ignore environments where comments.username column is not present.
    }

    showNotice(copy.profileSaved, "success");
    setProfileAction({ phase: "success", text: copy.profileSaved });
    scheduleProfileActionReset(3200);
    setInitialUsername(normalizedUsername);
    setIsBusy(false);
  };

  const uploadAvatar = async (file: File) => {
    if (!supabase) {
      return;
    }

    if (!file.type.startsWith("image/")) {
      showNotice(copy.avatarInvalidType, "error");
      return;
    }

    if (file.size > MAX_AVATAR_BYTES) {
      showNotice(copy.avatarTooLarge, "error");
      return;
    }

    setIsAvatarBusy(true);
    setIsAvatarScanning(false);
    setAvatarModerationIssue("");
    setNotice(null);
    setProfileAction({ phase: "loading", text: copy.avatarUploading });

    const { data: sessionData } = await supabase.auth.getSession();
    const user = sessionData.session?.user;
    const accessToken = sessionData.session?.access_token;

    if (!user) {
      showNotice(copy.loginRequiredTitle, "error");
      setProfileAction({ phase: "error", text: copy.loginRequiredTitle });
      setIsAvatarBusy(false);
      setIsAvatarScanning(false);
      return;
    }

    const extension = (file.name.split(".").pop() || "jpg").toLowerCase();
    const safeExtension = /^[a-z0-9]{2,6}$/.test(extension) ? extension : "jpg";
    const filePath = `${user.id}/avatar-${Date.now()}.${safeExtension}`;

    const uploadResult = await supabase.storage
      .from("avatars")
      .upload(filePath, file, { upsert: true, contentType: file.type });

    if (uploadResult.error) {
      showNotice(uploadResult.error.message || copy.genericError, "error");
      setProfileAction({ phase: "error", text: uploadResult.error.message || copy.genericError });
      setIsAvatarBusy(false);
      setIsAvatarScanning(false);
      return;
    }

    const uploadedPublicUrl = supabase.storage.from("avatars").getPublicUrl(filePath).data.publicUrl;

    setProfileAction({ phase: "loading", text: copy.avatarModerating });
    setIsAvatarScanning(true);
    const moderationResponse = await fetch("/api/profile/avatar-moderate", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        ...(accessToken ? { authorization: `Bearer ${accessToken}` } : {}),
      },
      body: JSON.stringify({ imageUrl: uploadedPublicUrl }),
    });

    const moderationPayload = (await moderationResponse.json().catch(() => ({}))) as {
      allowed?: boolean;
      error?: string;
      reasons?: string[];
    };

    if (!moderationResponse.ok || moderationPayload.allowed !== true) {
      setIsAvatarScanning(false);
      await supabase.storage.from("avatars").remove([filePath]);

      const moderationError = moderationPayload.error || "";
      const isScanUnavailable = moderationError.includes("unavailable") || moderationError.includes("missing");
      const firstReason = moderationPayload.reasons?.[0] || "";
      const formattedReason = formatModerationReason(firstReason);
      const moderationMessage = isScanUnavailable
        ? copy.avatarScanFailed
        : copy.avatarRejected;

      showNotice(moderationMessage, "error");
      setProfileAction({ phase: "error", text: moderationMessage });
      if (isScanUnavailable) {
        setAvatarModerationIssue("");
      } else {
        const moderationDetail = formattedReason || copy.avatarRejectedReasonUnknown;
        setAvatarModerationIssue(`${copy.avatarRejectedReasonPrefix}: ${moderationDetail}`);
      }
      setIsAvatarBusy(false);
      return;
    }

    setIsAvatarScanning(false);

    const currentMetadata = user.user_metadata ?? {};
    const previousAvatarUrl = getAvatarUrlFromMetadata(currentMetadata);

    const { error: updateError } = await supabase.auth.updateUser({
      data: {
        ...currentMetadata,
        avatar_url: uploadedPublicUrl,
      },
    });

    if (updateError) {
      showNotice(updateError.message || copy.genericError, "error");
      setProfileAction({ phase: "error", text: updateError.message || copy.genericError });
      setIsAvatarBusy(false);
      setIsAvatarScanning(false);
      return;
    }

    const commentsAvatarSync = await supabase
      .from("comments")
      .update({ avatar_url: uploadedPublicUrl })
      .eq("user_id", user.id);

    if (commentsAvatarSync.error?.message.toLowerCase().includes("avatar_url")) {
      // Ignore environments where comments.avatar_url column is not present.
    }

    setAvatarUrl(uploadedPublicUrl);
    setAvatarModerationIssue("");

    if (supabaseConfig?.url && previousAvatarUrl && previousAvatarUrl !== uploadedPublicUrl) {
      const previousPath = extractAvatarStoragePath(previousAvatarUrl, supabaseConfig.url);
      if (previousPath) {
        await supabase.storage.from("avatars").remove([previousPath]);
      }
    }

    showNotice(copy.avatarSaved, "success");
    setProfileAction({ phase: "success", text: copy.avatarSaved });
    scheduleProfileActionReset(3200);
    setIsAvatarBusy(false);
    setIsAvatarScanning(false);
  };

  const sendEmailCode = async () => {
    if (!supabase) return;

    if (!normalizedNewEmail || normalizedNewEmail === normalizedCurrentEmail) {
      showNotice(copy.sameEmailError, "error");
      return;
    }

    setIsBusy(true);
    setNotice(null);
    setEmailAction({ phase: "loading", text: copy.loading });

    const { error } = await supabase.auth.updateUser({ email: normalizedNewEmail });
    if (error) {
      showNotice(error.message || copy.genericError, "error");
      setEmailAction({ phase: "error", text: error.message || copy.genericError });
      scheduleEmailActionReset(3600);
      setIsBusy(false);
      return;
    }

    setCodeSent(true);
    showNotice(copy.emailCodeSent, "success");
    setEmailAction({ phase: "success", text: copy.emailCodeSent });
    scheduleEmailActionReset(3200);
    setIsBusy(false);
  };

  const verifyEmailCode = async () => {
    if (!supabase) return;
    const normalizedNewEmail = newEmail.trim().toLowerCase();
    if (!normalizedNewEmail) return;

    setIsBusy(true);
    setNotice(null);

    const { error } = await supabase.auth.verifyOtp({
      email: normalizedNewEmail,
      token: code.trim(),
      type: "email_change",
    });

    if (error) {
      showNotice(error.message || copy.genericError, "error");
      setEmailAction({ phase: "error", text: error.message || copy.genericError });
      scheduleEmailActionReset(3600);
      setIsBusy(false);
      return;
    }

    const { data: userData } = await supabase.auth.getUser();
    const latestEmail = userData.user?.email?.trim().toLowerCase() ?? "";

    if (latestEmail && latestEmail === normalizedNewEmail) {
      setEmail(latestEmail);
      setCode("");
      setNewEmail("");
      setCodeSent(false);
      showNotice(copy.emailVerified, "success", true);
      setEmailAction({ phase: "success", text: copy.emailVerified });
      scheduleEmailActionReset(3200);
      setIsBusy(false);
      router.refresh();
      return;
    }

    showNotice(copy.emailPendingSecondVerification, "info", true);
    setEmailAction({ phase: "success", text: copy.emailPendingSecondVerification });
    scheduleEmailActionReset(3600);
    setCode("");
    setIsBusy(false);
    router.refresh();
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

  const signOut = async () => {
    if (!supabase) return;
    await supabase.auth.signOut();
    showNotice(copy.signedOut, "info", true);
    router.push(`${toLocalePath("/login", locale)}?next=${encodeURIComponent(toLocalePath("/account", locale))}`);
    router.refresh();
  };

  const requestDeleteHistoryComment = (commentId: string) => {
    if (!commentId) {
      return;
    }
    setPendingDeleteHistoryCommentId(commentId);
  };

  const confirmDeleteHistoryComment = async () => {
    const commentId = pendingDeleteHistoryCommentId;
    if (!supabase || !userId || !commentId) {
      setPendingDeleteHistoryCommentId("");
      return;
    }

    setDeletingHistoryCommentId(commentId);
    const { error } = await supabase
      .from("comments")
      .delete()
      .eq("id", commentId)
      .eq("user_id", userId);

    if (error) {
      showNotice(copy.commentsDeleteFailed, "error");
      setPendingDeleteHistoryCommentId("");
      setDeletingHistoryCommentId("");
      return;
    }

    setCommentHistory((prev) => prev.filter((item) => item.id !== commentId));
    showNotice(copy.commentsDeleteSuccess, "success");
    setPendingDeleteHistoryCommentId("");
    setDeletingHistoryCommentId("");
  };

  const activateEditMode = (mode: "username" | "email") => {
    setEditMode(mode);
    setIsProfileMenuOpen(false);
    setIsEmailMenuOpen(false);

    if (mode === "username") {
      setCodeSent(false);
      setCode("");
      setNewEmail("");
      setEmailAction({ phase: "idle", text: "" });
      if (emailResetTimerRef.current) {
        window.clearTimeout(emailResetTimerRef.current);
      }
    }

    if (mode === "email") {
      setProfileAction({ phase: "idle", text: "" });
      if (profileResetTimerRef.current) {
        window.clearTimeout(profileResetTimerRef.current);
      }
    }
  };

  const cancelEditMode = (mode: "username" | "email") => {
    if (mode === "username") {
      setUsername(initialUsername);
      setProfileAction({ phase: "idle", text: "" });
      if (profileResetTimerRef.current) {
        window.clearTimeout(profileResetTimerRef.current);
      }
    }

    if (mode === "email") {
      setNewEmail("");
      setCode("");
      setCodeSent(false);
      setEmailAction({ phase: "idle", text: "" });
      if (emailResetTimerRef.current) {
        window.clearTimeout(emailResetTimerRef.current);
      }
    }

    setIsProfileMenuOpen(false);
    setIsEmailMenuOpen(false);
    setEditMode(null);
  };

  if (!isSupabaseConfigured(supabaseConfig ?? undefined)) {
    return <p className="text-sm text-zinc-600">{copy.configMissing}</p>;
  }

  if (!isReady) {
    return <p className="text-sm text-zinc-500">{copy.loading}</p>;
  }

  if (!userId) {
    return (
      <div className="max-w-xl rounded-[1.8rem] bg-white p-7 shadow-[0_10px_32px_rgba(0,0,0,0.04)]">
        <h1 className="text-3xl tracking-[-0.02em] text-zinc-900">{copy.loginRequiredTitle}</h1>
        <p className="mt-3 text-sm leading-6 text-zinc-600">{copy.loginRequiredBody}</p>
        <Link
          href={loginHref}
          className="mt-5 inline-flex min-h-11 items-center justify-center rounded-full bg-zinc-900 px-5 text-sm font-medium text-white"
        >
          {copy.loginCta}
        </Link>
      </div>
    );
  }

  return (
    <div
      key={`settings-panel-${panelKey}`}
      className="mx-auto max-w-[880px] space-y-3.5 animate-[settingsPanelIn_420ms_cubic-bezier(0.22,1,0.36,1)]"
    >
      {focusSection === "all" && activeSection === null ? <section className="rounded-[1.5rem] border border-zinc-200 bg-white p-4 shadow-[0_8px_22px_rgba(0,0,0,0.04)] sm:p-5">
        <div className="flex items-center gap-3">
          {avatarUrl ? (
            <img
              src={avatarUrl}
              alt={copy.avatarSection}
              className="h-14 w-14 rounded-full object-cover ring-1 ring-zinc-200"
            />
          ) : (
            <div className="grid h-14 w-14 place-items-center rounded-full bg-zinc-200 text-base font-semibold text-zinc-700">
              {normalizedUsername.slice(0, 1).toUpperCase() || "U"}
            </div>
          )}
          <div className="min-w-0 flex-1">
            <h1 className="truncate text-[1.35rem] tracking-[-0.02em] text-zinc-900">{copy.title}</h1>
            <p className="truncate text-sm text-zinc-500">{email}</p>
          </div>
        </div>

        <div className="mt-4 overflow-hidden rounded-2xl border border-zinc-200 bg-zinc-50/70">
          <button
            type="button"
            onClick={() => setActiveSection("profile")}
            className={`group flex w-full items-center justify-between px-4 py-3 text-left text-sm transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] ${
              activeSection === "profile"
                ? "bg-zinc-100 text-zinc-900"
                : "text-zinc-800 hover:bg-gradient-to-r hover:from-zinc-100 hover:via-zinc-50 hover:to-white hover:pl-[1.15rem] hover:shadow-[inset_0_1px_0_rgba(255,255,255,0.95)] active:scale-[0.996]"
            }`}
          >
            <span className="inline-flex items-center gap-2"><UserCircle size={16} weight="duotone" />{copy.profile}</span>
            <CaretRight size={16} className="text-zinc-500 transition-transform duration-300 group-hover:translate-x-1 group-hover:text-zinc-700" />
          </button>
          <button
            type="button"
            onClick={() => setActiveSection("email")}
            className={`group flex w-full items-center justify-between border-t border-zinc-200 px-4 py-3 text-left text-sm transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] ${
              activeSection === "email"
                ? "bg-zinc-100 text-zinc-900"
                : "text-zinc-800 hover:bg-gradient-to-r hover:from-zinc-100 hover:via-zinc-50 hover:to-white hover:pl-[1.15rem] hover:shadow-[inset_0_1px_0_rgba(255,255,255,0.95)] active:scale-[0.996]"
            }`}
          >
            <span className="inline-flex items-center gap-2"><EnvelopeSimple size={16} weight="duotone" />{copy.emailSection}</span>
            <CaretRight size={16} className="text-zinc-500 transition-transform duration-300 group-hover:translate-x-1 group-hover:text-zinc-700" />
          </button>
          <button
            type="button"
            onClick={() => setActiveSection("comments")}
            className={`group flex w-full items-center justify-between border-t border-zinc-200 px-4 py-3 text-left text-sm transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] ${
              activeSection === "comments"
                ? "bg-zinc-100 text-zinc-900"
                : "text-zinc-800 hover:bg-gradient-to-r hover:from-zinc-100 hover:via-zinc-50 hover:to-white hover:pl-[1.15rem] hover:shadow-[inset_0_1px_0_rgba(255,255,255,0.95)] active:scale-[0.996]"
            }`}
          >
            <span className="inline-flex items-center gap-2"><ChatCircleDots size={16} weight="duotone" />{copy.commentsSection}</span>
            <CaretRight size={16} className="text-zinc-500 transition-transform duration-300 group-hover:translate-x-1 group-hover:text-zinc-700" />
          </button>
          <button
            type="button"
            onClick={() => setActiveSection("addresses")}
            className={`group flex w-full items-center justify-between border-t border-zinc-200 px-4 py-3 text-left text-sm transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] ${
              activeSection === "addresses"
                ? "bg-zinc-100 text-zinc-900"
                : "text-zinc-800 hover:bg-gradient-to-r hover:from-zinc-100 hover:via-zinc-50 hover:to-white hover:pl-[1.15rem] hover:shadow-[inset_0_1px_0_rgba(255,255,255,0.95)] active:scale-[0.996]"
            }`}
          >
            <span className="inline-flex items-center gap-2"><Info size={16} weight="duotone" />{copy.addressesSection}</span>
            <CaretRight size={16} className="text-zinc-500 transition-transform duration-300 group-hover:translate-x-1 group-hover:text-zinc-700" />
          </button>
          <button
            type="button"
            onClick={() => setActiveSection("orders")}
            className={`group flex w-full items-center justify-between border-t border-zinc-200 px-4 py-3 text-left text-sm transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] ${
              activeSection === "orders"
                ? "bg-zinc-100 text-zinc-900"
                : "text-zinc-800 hover:bg-gradient-to-r hover:from-zinc-100 hover:via-zinc-50 hover:to-white hover:pl-[1.15rem] hover:shadow-[inset_0_1px_0_rgba(255,255,255,0.95)] active:scale-[0.996]"
            }`}
          >
            <span className="inline-flex items-center gap-2"><Info size={16} weight="duotone" />{copy.ordersSection}</span>
            <CaretRight size={16} className="text-zinc-500 transition-transform duration-300 group-hover:translate-x-1 group-hover:text-zinc-700" />
          </button>
        </div>
      </section> : null}

      {focusSection === "all" && activeSection !== null ? (
        <div className="animate-[fadeIn_260ms_ease]">
          <button
            type="button"
            onClick={() => setActiveSection(null)}
            className="mb-3 inline-flex min-h-10 items-center justify-center gap-1.5 rounded-full border border-zinc-300 bg-white px-4 text-sm font-medium text-zinc-700 transition duration-300 hover:-translate-y-[1px] hover:bg-zinc-50"
          >
            <CaretRight size={14} className="rotate-180" />
            {copy.settings}
          </button>
        </div>
      ) : null}

      {showProfileSection ? <section id="account-profile" className="rounded-[1.5rem] border border-zinc-200 bg-white p-5 shadow-[0_8px_22px_rgba(0,0,0,0.04)] sm:p-6">
        <div className="flex items-center justify-between gap-3">
          <p className="text-sm font-semibold tracking-[0.12em] text-zinc-500 uppercase">{copy.profile}</p>
          <div className="flex items-center gap-2">
            <span className="rounded-full border border-zinc-300/90 bg-white px-3 py-1 text-[0.65rem] font-semibold tracking-[0.12em] text-zinc-500 uppercase">Account</span>
            <div className="relative">
              <button
                type="button"
                onClick={() => {
                  if (editMode === "username") {
                    cancelEditMode("username");
                    return;
                  }
                  setIsProfileMenuOpen((prev) => !prev);
                  setIsEmailMenuOpen(false);
                }}
                className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-zinc-200 bg-white text-zinc-700 shadow-sm transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] hover:-translate-y-[1px] hover:border-zinc-300 hover:bg-zinc-50 hover:shadow-[0_10px_18px_rgba(20,20,20,0.08)] active:scale-[0.96]"
                aria-label={editMode === "username" ? copy.cancelEdit : copy.settings}
                aria-expanded={editMode === "username" ? true : isProfileMenuOpen}
              >
                <span className="relative block h-4 w-4">
                  <DotsThreeOutlineVertical
                    size={16}
                    weight="bold"
                    className={`absolute inset-0 transition-all duration-300 ${
                      editMode === "username" ? "scale-75 rotate-90 opacity-0" : "scale-100 rotate-0 opacity-100"
                    }`}
                  />
                  <X
                    size={16}
                    weight="bold"
                    className={`absolute inset-0 transition-all duration-300 ${
                      editMode === "username" ? "scale-100 rotate-0 opacity-100" : "scale-75 -rotate-90 opacity-0"
                    }`}
                  />
                </span>
              </button>
              {isProfileMenuOpen && editMode !== "username" ? (
                <div className="absolute top-10 right-0 z-20 min-w-[220px] rounded-2xl border border-zinc-200 bg-white p-1.5 shadow-[0_18px_42px_rgba(20,20,20,0.16)]">
                  <button
                    type="button"
                    onClick={() => activateEditMode("username")}
                    className="group flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-left text-sm font-medium text-zinc-700 transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] hover:-translate-y-[1px] hover:bg-zinc-100 hover:text-zinc-900 hover:shadow-[0_10px_22px_rgba(20,20,20,0.08)]"
                  >
                    <PencilSimple size={15} className="transition-transform duration-300 group-hover:rotate-[-8deg] group-hover:scale-110" />
                    {copy.editUsername}
                  </button>
                </div>
              ) : null}
            </div>
          </div>
        </div>
        <div
          className={`relative mt-4 flex items-center gap-4 overflow-hidden rounded-2xl bg-zinc-50 px-4 py-3 ring-1 transition-colors duration-300 ${
            isAvatarScanning ? "ring-amber-300/90" : "ring-zinc-200/80"
          }`}
        >
          {isAvatarScanning ? <span className="avatar-scan-shimmer" aria-hidden="true" /> : null}
          {avatarUrl ? (
            <img
              src={avatarUrl}
              alt={copy.avatarSection}
              className={`relative z-[1] h-16 w-16 rounded-full object-cover ring-1 ring-zinc-200 ${
                isAvatarScanning ? "opacity-80" : ""
              }`}
            />
          ) : (
            <div
              className={`relative z-[1] grid h-16 w-16 place-items-center rounded-full bg-zinc-200 text-lg font-semibold text-zinc-700 ${
                isAvatarScanning ? "opacity-80" : ""
              }`}
            >
              {normalizedUsername.slice(0, 1).toUpperCase() || "U"}
            </div>
          )}
          <div className="relative z-[1] min-w-0 flex-1">
            <p className="text-sm font-medium text-zinc-700">{copy.avatarSection}</p>
            <p className="mt-1 text-xs text-zinc-500">
              {isAvatarScanning ? copy.avatarModerating : copy.avatarHint}
            </p>
            {avatarModerationIssue ? (
              <p className="mt-1.5 inline-flex items-start gap-1.5 text-xs font-medium text-amber-700">
                <WarningCircle size={14} weight="fill" className="mt-[1px] shrink-0 text-amber-500" />
                {avatarModerationIssue}
              </p>
            ) : null}
          </div>
          <label className="relative z-[1] inline-flex min-h-10 cursor-pointer items-center justify-center gap-2 rounded-full border border-zinc-300 bg-white px-4 text-sm font-medium text-zinc-700 transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] hover:-translate-y-[1px] hover:border-zinc-400 hover:bg-zinc-100 hover:shadow-[0_10px_22px_rgba(20,20,20,0.08)] active:scale-[0.985]">
            {isAvatarBusy ? <CircleNotch size={15} className="animate-spin" /> : <Camera size={15} />}
            {copy.uploadAvatar}
            <input
              type="file"
              accept="image/png,image/jpeg,image/webp"
              className="sr-only"
              disabled={isAvatarBusy || isBusy}
              onChange={async (event) => {
                const input = event.currentTarget;
                const file = input.files?.[0];
                if (!file) {
                  return;
                }
                try {
                  await uploadAvatar(file);
                } finally {
                  input.value = "";
                }
              }}
            />
          </label>
        </div>

        <label className="mt-4 block">
          <span className="mb-1.5 block text-sm font-medium text-zinc-700">{copy.username}</span>
          <input
            value={username}
            onChange={(event) => setUsername(event.target.value)}
            minLength={3}
            maxLength={24}
            readOnly={editMode !== "username"}
            className={`w-full rounded-xl bg-white px-4 py-3 text-sm text-zinc-800 outline-none ring-1 ring-zinc-300/80 transition-all duration-300 focus:-translate-y-[1px] focus:shadow-[0_10px_20px_rgba(24,24,24,0.08)] focus:ring-zinc-900/30 ${
              editMode !== "username" ? "cursor-not-allowed bg-zinc-50 text-zinc-500" : ""
            }`}
          />
        </label>
        {editMode === "username" ? (
          <div
            className={`mt-1 origin-top overflow-hidden transition-all duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] ${
              isUsernameChanged || profileAction.phase !== "idle"
                ? "max-h-24 translate-y-0 opacity-100"
                : "max-h-0 -translate-y-2 opacity-0"
            }`}
            aria-hidden={!(isUsernameChanged || profileAction.phase !== "idle")}
          >
            <button
              type="button"
              onClick={saveProfile}
              disabled={isBusy || (!isUsernameChanged && profileAction.phase !== "success" && profileAction.phase !== "error")}
              className={`mt-3 inline-flex min-h-11 items-center justify-center gap-2 rounded-full border px-6 text-sm font-semibold shadow-[0_10px_24px_rgba(24,24,24,0.2)] transition-all duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] ${
                profileAction.phase === "success"
                  ? "border-emerald-200 bg-emerald-500 text-white"
                  : profileAction.phase === "error"
                    ? "border-rose-200 bg-rose-500 text-white"
                    : "border-zinc-900 bg-zinc-900 text-white hover:-translate-y-[1px] hover:bg-zinc-800 hover:shadow-[0_14px_30px_rgba(24,24,24,0.24)]"
              } disabled:pointer-events-none`}
            >
              {profileAction.phase === "loading" ? (
                <CircleNotch size={16} className="animate-spin" />
              ) : profileAction.phase === "success" ? (
                <CheckCircle size={16} weight="fill" />
              ) : profileAction.phase === "error" ? (
                <X size={16} weight="bold" />
              ) : null}
              {profileAction.phase === "idle" ? copy.saveProfile : profileAction.text}
            </button>
          </div>
        ) : null}
      </section> : null}

      {showEmailSection ? <section id="account-email" className="rounded-[1.5rem] border border-zinc-200 bg-white p-5 shadow-[0_8px_22px_rgba(0,0,0,0.04)] sm:p-6">
        <div className="flex items-center justify-between gap-3">
          <p className="text-sm font-semibold tracking-[0.12em] text-zinc-500 uppercase">{copy.emailSection}</p>
          <div className="flex items-center gap-2">
            <span className="rounded-full border border-zinc-300/90 bg-white px-3 py-1 text-[0.65rem] font-semibold tracking-[0.12em] text-zinc-500 uppercase">Email</span>
            <div className="relative">
              <button
                type="button"
                onClick={() => {
                  if (editMode === "email") {
                    cancelEditMode("email");
                    return;
                  }
                  setIsEmailMenuOpen((prev) => !prev);
                  setIsProfileMenuOpen(false);
                }}
                className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-zinc-200 bg-white text-zinc-700 shadow-sm transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] hover:-translate-y-[1px] hover:border-zinc-300 hover:bg-zinc-50 hover:shadow-[0_10px_18px_rgba(20,20,20,0.08)] active:scale-[0.96]"
                aria-label={editMode === "email" ? copy.cancelEdit : copy.settings}
                aria-expanded={editMode === "email" ? true : isEmailMenuOpen}
              >
                <span className="relative block h-4 w-4">
                  <DotsThreeOutlineVertical
                    size={16}
                    weight="bold"
                    className={`absolute inset-0 transition-all duration-300 ${
                      editMode === "email" ? "scale-75 rotate-90 opacity-0" : "scale-100 rotate-0 opacity-100"
                    }`}
                  />
                  <X
                    size={16}
                    weight="bold"
                    className={`absolute inset-0 transition-all duration-300 ${
                      editMode === "email" ? "scale-100 rotate-0 opacity-100" : "scale-75 -rotate-90 opacity-0"
                    }`}
                  />
                </span>
              </button>
              {isEmailMenuOpen && editMode !== "email" ? (
                <div className="absolute top-10 right-0 z-20 min-w-[200px] rounded-2xl border border-zinc-200 bg-white p-1.5 shadow-[0_18px_42px_rgba(20,20,20,0.16)]">
                  <button
                    type="button"
                    onClick={() => activateEditMode("email")}
                    className="group flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-left text-sm font-medium text-zinc-700 transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] hover:-translate-y-[1px] hover:bg-zinc-100 hover:text-zinc-900 hover:shadow-[0_10px_22px_rgba(20,20,20,0.08)]"
                  >
                    <EnvelopeSimple size={15} className="transition-transform duration-300 group-hover:rotate-[-8deg] group-hover:scale-110" />
                    {copy.editEmail}
                  </button>
                </div>
              ) : null}
            </div>
          </div>
        </div>
        <p className="mt-3 text-sm text-zinc-600">
          {copy.currentEmail}: <span className="font-medium text-zinc-900">{email}</span>
        </p>

        <label className="mt-4 block">
          <span className="mb-1.5 block text-sm font-medium text-zinc-700">{copy.newEmail}</span>
          <input
            type="email"
            value={newEmail}
            onChange={(event) => setNewEmail(event.target.value)}
            readOnly={editMode !== "email"}
            className={`w-full rounded-xl bg-white px-4 py-3 text-sm text-zinc-800 outline-none ring-1 ring-zinc-300/80 transition-all duration-300 focus:-translate-y-[1px] focus:shadow-[0_10px_20px_rgba(24,24,24,0.08)] focus:ring-zinc-900/30 ${
              editMode !== "email" ? "cursor-not-allowed bg-zinc-50 text-zinc-500" : ""
            }`}
          />
        </label>

        {editMode === "email" ? (
          <div
            className={`mt-1 origin-top overflow-hidden transition-all duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] ${
              isNewEmailChanged || emailAction.phase !== "idle"
                ? "max-h-24 translate-y-0 opacity-100"
                : "max-h-0 -translate-y-2 opacity-0"
            }`}
            aria-hidden={!(isNewEmailChanged || emailAction.phase !== "idle")}
          >
            <button
              type="button"
              onClick={sendEmailCode}
              disabled={isBusy || (!isNewEmailChanged && emailAction.phase !== "success" && emailAction.phase !== "error")}
              className={`mt-3 inline-flex min-h-11 items-center justify-center gap-2 rounded-full border px-6 text-sm font-semibold shadow-[0_10px_24px_rgba(24,24,24,0.2)] transition-all duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] ${
                emailAction.phase === "success"
                  ? "border-emerald-200 bg-emerald-500 text-white"
                  : emailAction.phase === "error"
                    ? "border-rose-200 bg-rose-500 text-white"
                    : "border-zinc-900 bg-zinc-900 text-white hover:-translate-y-[1px] hover:bg-zinc-800 hover:shadow-[0_14px_30px_rgba(24,24,24,0.24)]"
              } disabled:pointer-events-none`}
            >
              {emailAction.phase === "loading" ? (
                <CircleNotch size={16} className="animate-spin" />
              ) : emailAction.phase === "success" ? (
                <CheckCircle size={16} weight="fill" />
              ) : emailAction.phase === "error" ? (
                <X size={16} weight="bold" />
              ) : null}
              {emailAction.phase === "idle" ? copy.sendCode : emailAction.text}
            </button>
          </div>
        ) : null}

        {codeSent ? (
          <div className="mt-5 rounded-2xl bg-zinc-50 p-4 ring-1 ring-zinc-200 transition-all duration-500 ease-[cubic-bezier(0.22,1,0.36,1)]">
            <label className="block">
              <span className="mb-1.5 block text-sm text-zinc-600">{copy.codeLabel}</span>
              <div className="flex flex-wrap gap-2">
                {otpDigits.map((digit, index) => (
                  <input
                    key={`account-otp-${index}`}
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
              onClick={verifyEmailCode}
              disabled={isBusy || code.trim().length !== OTP_LENGTH}
              className="mt-4 inline-flex min-h-11 items-center justify-center rounded-full bg-zinc-900 px-6 text-sm font-medium text-white shadow-[0_8px_20px_rgba(24,24,24,0.18)] transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] hover:-translate-y-[1px] hover:bg-zinc-800 disabled:opacity-60"
            >
              {copy.verifyCode}
            </button>
          </div>
        ) : null}
      </section> : null}

      {showCommentsSection ? <section id="account-comments" className="rounded-[1.5rem] border border-zinc-200 bg-white p-5 shadow-[0_8px_22px_rgba(0,0,0,0.04)] sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-sm font-semibold tracking-[0.12em] text-zinc-500 uppercase">{copy.commentsSection}</p>
            <p className="mt-2 text-sm text-zinc-600">{copy.commentsSubtitle}</p>
          </div>
          <span className="inline-flex items-center gap-1.5 rounded-full border border-zinc-300/80 bg-white px-3 py-1.5 text-xs font-semibold text-zinc-700">
            <ChatCircleDots size={14} weight="duotone" />
            {commentHistory.length} {copy.commentsCountLabel}
          </span>
        </div>

        {isCommentHistoryLoading ? (
          <div className="mt-5 space-y-3">
            <p className="text-xs font-medium tracking-[0.08em] text-zinc-500 uppercase">{copy.commentsLoading}</p>
            {[0, 1, 2].map((index) => (
              <div
                key={`comment-history-skeleton-${index}`}
                className="rounded-2xl border border-zinc-200/90 bg-white/80 p-4 animate-pulse"
              >
                <div className="h-3 w-36 rounded-full bg-zinc-200" />
                <div className="mt-3 h-3 w-full rounded-full bg-zinc-100" />
                <div className="mt-2 h-3 w-3/4 rounded-full bg-zinc-100" />
              </div>
            ))}
          </div>
        ) : null}

        {!isCommentHistoryLoading && commentHistoryError ? (
          <div className="mt-5 rounded-2xl border border-amber-200/90 bg-amber-50/90 px-4 py-3 text-sm font-medium text-amber-800">
            {commentHistoryError}
          </div>
        ) : null}

        {!isCommentHistoryLoading && !commentHistoryError && commentHistory.length === 0 ? (
          <div className="mt-5 rounded-2xl border border-zinc-200/90 bg-white/80 px-4 py-4 text-sm text-zinc-600">
            {copy.commentsEmpty}
          </div>
        ) : null}

        {!isCommentHistoryLoading && !commentHistoryError && commentHistory.length > 0 ? (
          <div className="mt-5 grid gap-3">
            {commentHistory.map((item) => {
              const safeRating = Math.max(0, Math.min(5, Math.round(item.rating)));
              const postedOn = item.created_at
                ? new Date(item.created_at).toLocaleDateString(LOCALE_DATE_FORMAT[locale], {
                    year: "numeric",
                    month: "short",
                    day: "numeric",
                  })
                : "-";

              return (
                <article
                  key={item.id}
                  className="group rounded-2xl border border-zinc-200/90 bg-white/90 px-4 py-4 transition-all duration-300 hover:-translate-y-[1px] hover:shadow-[0_12px_24px_rgba(20,20,20,0.08)]"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <Link
                      href={`/perfumes/${item.perfume_slug}`}
                      className="inline-flex items-center gap-2 text-sm font-semibold text-zinc-900 underline-offset-2 transition-colors duration-200 hover:text-zinc-700 hover:underline"
                    >
                      {copy.commentsOnPerfumeLabel}: {formatPerfumeSlugLabel(item.perfume_slug)}
                    </Link>
                    <span className="rounded-full bg-zinc-100 px-2.5 py-1 text-[11px] font-medium text-zinc-600">
                      {copy.commentsPostedLabel}: {postedOn}
                    </span>
                  </div>

                  <p className="mt-3 text-sm leading-6 text-zinc-700">{item.comment}</p>

                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    <span className="inline-flex items-center gap-1 rounded-full border border-rose-200 bg-rose-50 px-2.5 py-1 text-xs font-semibold text-rose-700">
                      <Heart size={13} weight="fill" />
                      {copy.commentsRatingLabel}: {safeRating}/5
                    </span>
                    <span className="rounded-full border border-zinc-200 bg-zinc-50 px-2.5 py-1 text-[11px] text-zinc-500">
                      {item.perfume_slug}
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        requestDeleteHistoryComment(item.id);
                      }}
                      disabled={deletingHistoryCommentId === item.id}
                      className="inline-flex items-center gap-1 rounded-full border border-zinc-200 bg-white px-2.5 py-1 text-[11px] font-medium text-zinc-600 transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] hover:-translate-y-[1px] hover:border-zinc-300 hover:bg-zinc-100 hover:text-zinc-800 hover:shadow-[0_10px_18px_rgba(20,20,20,0.08)] disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      <Trash size={12} />
                      {deletingHistoryCommentId === item.id ? copy.commentsDeleting : copy.commentsDelete}
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
        ) : null}
      </section> : null}

      {showAddressesSection ? <AccountAddressesClient locale={locale} supabase={supabaseConfig} /> : null}
      {showOrdersSection ? <AccountOrdersClient locale={locale} supabase={supabaseConfig} /> : null}

      <section className="rounded-[1.5rem] border border-zinc-200 bg-white p-5 shadow-[0_8px_22px_rgba(0,0,0,0.04)] sm:p-6">
        <button
          type="button"
          onClick={() => setIsLogoutConfirmOpen(true)}
          className="account-signout-btn group relative inline-flex min-h-12 items-center justify-center gap-2.5 overflow-hidden rounded-full border border-zinc-800/10 bg-[radial-gradient(circle_at_20%_0%,#faf8f8_0%,#f4f2f2_58%,#ece9e8_100%)] px-7 text-sm font-semibold text-zinc-800 shadow-[0_10px_24px_rgba(20,18,18,0.12)] ring-1 ring-white/80 transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] hover:-translate-y-[1px] hover:shadow-[0_14px_28px_rgba(20,18,18,0.18)]"
        >
          <SignOut size={16} className="account-signout-icon text-zinc-700 transition-transform duration-300 group-hover:-rotate-6 group-hover:scale-110" />
          {copy.signOut}
        </button>
      </section>

      {notice ? (
        <div className="pointer-events-none fixed right-0 bottom-[calc(1rem+env(safe-area-inset-bottom))] left-0 z-[120] flex px-4 sm:right-6 sm:bottom-6 sm:left-auto sm:block sm:px-0">
          <div
            className={`pointer-events-auto w-full rounded-2xl border px-4 py-3 shadow-[0_20px_40px_rgba(15,15,15,0.2)] backdrop-blur-sm transition-all duration-400 ease-[cubic-bezier(0.22,1,0.36,1)] sm:max-w-md ${
              notice.tone === "success"
                ? "border-emerald-200/80 bg-emerald-50/95 text-emerald-900"
                : notice.tone === "error"
                  ? "border-rose-200/80 bg-rose-50/95 text-rose-900"
                  : "border-zinc-300/80 bg-zinc-100/95 text-zinc-900"
            }`}
            role="status"
            aria-live="polite"
          >
            <div className="flex items-start gap-3">
              <span className="mt-0.5">
                {notice.tone === "success" ? (
                  <CheckCircle size={20} weight="fill" />
                ) : notice.tone === "error" ? (
                  <WarningCircle size={20} weight="fill" />
                ) : (
                  <Info size={20} weight="fill" />
                )}
              </span>
              <p className="flex-1 text-sm font-medium leading-6">{notice.text}</p>
              <button
                type="button"
                onClick={() => setNotice(null)}
                className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-white/70 text-zinc-700 transition-colors duration-200 hover:bg-white"
                aria-label="Close message"
              >
                <X size={14} weight="bold" />
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {isDomReady && isLogoutConfirmOpen
        ? createPortal(
        <div
          className="fixed inset-0 z-[130] flex items-end justify-center bg-zinc-900/35 px-0 backdrop-blur-[2px] sm:items-center sm:px-4"
          onClick={() => setIsLogoutConfirmOpen(false)}
        >
          <div
            className="w-full rounded-t-3xl border border-zinc-200 bg-white p-6 pb-[calc(1.25rem+env(safe-area-inset-bottom))] shadow-[0_28px_64px_rgba(18,18,18,0.24)] animate-[accountPopIn_320ms_cubic-bezier(0.22,1,0.36,1)] sm:max-w-md sm:rounded-3xl sm:pb-6"
            onClick={(event) => event.stopPropagation()}
          >
            <h3 className="text-xl font-semibold tracking-[-0.02em] text-zinc-900">{copy.logoutConfirmTitle}</h3>
            <p className="mt-2 text-sm leading-6 text-zinc-600">{copy.logoutConfirmBody}</p>
            <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:items-center sm:justify-end">
              <button
                type="button"
                onClick={() => setIsLogoutConfirmOpen(false)}
                className="inline-flex min-h-11 w-full items-center justify-center rounded-full border border-zinc-300 bg-white px-4 text-sm font-medium text-zinc-700 transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] hover:-translate-y-[1px] hover:bg-zinc-50 hover:shadow-[0_10px_20px_rgba(20,20,20,0.08)] sm:min-h-10 sm:w-auto"
              >
                {copy.logoutCancel}
              </button>
              <button
                type="button"
                onClick={async () => {
                  setIsLogoutConfirmOpen(false);
                  await signOut();
                }}
                className="inline-flex min-h-11 w-full items-center justify-center rounded-full bg-zinc-900 px-5 text-sm font-semibold text-white transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] hover:-translate-y-[1px] hover:bg-zinc-800 hover:shadow-[0_14px_28px_rgba(24,24,24,0.22)] sm:min-h-10 sm:w-auto"
              >
                {copy.logoutConfirm}
              </button>
            </div>
          </div>
        </div>,
        document.body,
      )
        : null}

      {isDomReady && pendingDeleteHistoryCommentId
        ? createPortal(
        <div
          className="fixed inset-0 z-[130] flex items-end justify-center bg-zinc-900/35 px-0 backdrop-blur-[2px] sm:items-center sm:px-4"
          onClick={() => setPendingDeleteHistoryCommentId("")}
        >
          <div
            className="w-full rounded-t-3xl border border-zinc-200 bg-white p-6 pb-[calc(1.25rem+env(safe-area-inset-bottom))] shadow-[0_28px_64px_rgba(18,18,18,0.24)] animate-[accountPopIn_320ms_cubic-bezier(0.22,1,0.36,1)] sm:max-w-md sm:rounded-3xl sm:pb-6"
            onClick={(event) => event.stopPropagation()}
          >
            <h3 className="text-xl font-semibold tracking-[-0.02em] text-zinc-900">{copy.commentsDeleteTitle}</h3>
            <p className="mt-2 text-sm leading-6 text-zinc-600">{copy.commentsDeleteConfirm}</p>
            <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:items-center sm:justify-end">
              <button
                type="button"
                onClick={() => setPendingDeleteHistoryCommentId("")}
                className="inline-flex min-h-11 w-full items-center justify-center rounded-full border border-zinc-300 bg-white px-4 text-sm font-medium text-zinc-700 transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] hover:-translate-y-[1px] hover:bg-zinc-50 hover:shadow-[0_10px_20px_rgba(20,20,20,0.08)] sm:min-h-10 sm:w-auto"
              >
                {copy.logoutCancel}
              </button>
              <button
                type="button"
                onClick={() => {
                  void confirmDeleteHistoryComment();
                }}
                disabled={deletingHistoryCommentId === pendingDeleteHistoryCommentId}
                className="inline-flex min-h-11 w-full items-center justify-center rounded-full bg-zinc-900 px-5 text-sm font-semibold text-white transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] hover:-translate-y-[1px] hover:bg-zinc-800 hover:shadow-[0_14px_28px_rgba(24,24,24,0.22)] disabled:cursor-not-allowed disabled:opacity-60 sm:min-h-10 sm:w-auto"
              >
                {deletingHistoryCommentId === pendingDeleteHistoryCommentId ? copy.commentsDeleting : copy.commentsDeleteAction}
              </button>
            </div>
          </div>
        </div>,
        document.body,
      )
        : null}

      <style>{`
        @keyframes settingsPanelIn {
          0% { opacity: 0; transform: translateY(10px) scale(0.992); }
          100% { opacity: 1; transform: translateY(0) scale(1); }
        }
      `}</style>
    </div>
  );
}
