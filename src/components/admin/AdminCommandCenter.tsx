"use client";

import { useEffect, useMemo, useRef, useState, type ReactNode, type RefObject } from "react";
import {
  ArrowClockwise,
  CaretRight,
  CheckCircle,
  CircleNotch,
  Image,
  PaperPlaneRight,
  Sparkle,
  Trash,
  UploadSimple,
  X,
} from "@phosphor-icons/react";

type AdminLocale = "az" | "en";

type AssistantQuestion = {
  key: string;
  label: string;
  question: string;
  type: "text" | "textarea" | "number" | "select" | "toggle";
  placeholder?: string;
  helper?: string;
  required?: boolean;
  options?: string[];
  uiHint?: "product" | "banner" | "perfume" | "header" | "image";
};

type AssistantAction = {
  type:
    | "set_perfume_discount"
    | "bulk_update_prices"
    | "toggle_promo_banner"
    | "update_promo_copy"
    | "create_perfume_draft"
    | "update_home_header";
  payload: Record<string, unknown>;
};

type AssistantPreview = {
  kind: "product" | "banner" | "perfume" | "header";
  title: string;
  description: string;
  imageUrl?: string;
  meta?: Array<{ label: string; value: string }>;
};

type AssistantPlan = {
  mode: "clarify" | "ready";
  title: string;
  summary: string;
  reply: string;
  intent: string;
  confidence: number;
  needsMoreContext: boolean;
  questions: AssistantQuestion[];
  action: AssistantAction | null;
  preview: AssistantPreview | null;
  suggestedReplies: string[];
};

type AssistantMessage = {
  role: "user" | "assistant";
  text: string;
};

type FlowState = "idle" | "sending" | "ready" | "applying" | "applied" | "error";

type AttachmentState = {
  file: File;
  dataUrl: string;
  mimeType: string;
  name: string;
};

type Copy = {
  title: string;
  description: string;
  promptLabel: string;
  promptPlaceholder: string;
  send: string;
  thinking: string;
  apply: string;
  ready: string;
  clarify: string;
  upload: string;
  clear: string;
  noPlan: string;
  quickActions: string[];
  examples: string[];
  turnOn: string;
  turnOff: string;
  reset: string;
  uploadHint: string;
  attached: string;
  questionsTitle: string;
  previewTitle: string;
  historyTitle: string;
  success: string;
  error: string;
};

const copy: Record<AdminLocale, Copy> = {
  az: {
    title: "AI əmrlər mərkəzi",
    description:
      "Sadə cümlə yazın, sistem onu əməli planına çevirsin. Yetərli məlumat yoxdursa, gözəl sorğu kartları ilə əlavə suallar verəcək.",
    promptLabel: "Nə etmək istəyirsiniz?",
    promptPlaceholder: "Məsələn: X məhsuluna 20% endirim qoy, promo banneri söndür, ya da şəkildən yeni ətir draftı hazırla.",
    send: "Göndər",
    thinking: "Düşünür...",
    apply: "Tətbiq et",
    ready: "Hazırdır",
    clarify: "Aydınlaşdırma lazımdır",
    upload: "Şəkil əlavə et",
    clear: "Təmizlə",
    noPlan: "Hələ plan yoxdur. Bir əmrlə başla.",
    quickActions: ["Promo banneri söndür", "20% endirim təyin et", "Yeni ətir draftı yarat", "Başlıq mətnini dəyiş"],
    examples: ["CHANEL No.5 üçün 15% endirim qoy", "Promo banneri söndür", "Bu şəkildən yeni ətir draftı hazırla"],
    turnOn: "Aç",
    turnOff: "Söndür",
    reset: "Sıfırla",
    uploadHint: "Şəkil analiz üçün istifadə olunur. Yükləyərkən məhsul kartı və ya etiket daha dəqiq nəticə verir.",
    attached: "Əlavə edilmiş şəkil",
    questionsTitle: "Qarşıdakı suallar",
    previewTitle: "Canlı önizləmə",
    historyTitle: "Söhbət axını",
    success: "Əməliyyat uğurla tətbiq olundu.",
    error: "Əməliyyat alınmadı.",
  },
  en: {
    title: "AI command center",
    description:
      "Type one sentence and the assistant turns it into an admin plan. If context is missing, it asks polished follow-up questions in custom cards.",
    promptLabel: "What do you want to do?",
    promptPlaceholder:
      "For example: set product X to 20% off, turn off the promo banner, or create a new perfume draft from this image.",
    send: "Send",
    thinking: "Thinking...",
    apply: "Apply",
    ready: "Ready",
    clarify: "Needs clarification",
    upload: "Attach image",
    clear: "Clear",
    noPlan: "No plan yet. Start with a command.",
    quickActions: ["Turn off promo banner", "Set a 20% discount", "Raise prices by 10%", "Create a new perfume draft"],
    examples: ["Set CHANEL No.5 to 15% off", "Raise all Dior prices by 10%", "Create a new perfume draft from this image"],
    turnOn: "On",
    turnOff: "Off",
    reset: "Reset",
    uploadHint: "Images are used for analysis. A product card or label gives the best result.",
    attached: "Attached image",
    questionsTitle: "Follow-up questions",
    previewTitle: "Live preview",
    historyTitle: "Conversation",
    success: "The action was applied successfully.",
    error: "The action could not be applied.",
  },
};

function cx(...values: Array<string | false | null | undefined>) {
  return values.filter(Boolean).join(" ");
}

function toBase64(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

function formatConfidence(value: number) {
  return `${Math.round(Math.max(0, Math.min(1, value)) * 100)}%`;
}

function hasAnswer(value: string | undefined) {
  return Boolean(value && value.trim());
}

function useOutsideDismiss(
  refs: Array<RefObject<HTMLElement | null>>,
  onDismiss: () => void,
  active: boolean,
) {
  useEffect(() => {
    if (!active) return;

    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target as Node | null;
      if (!target) return;
      if (refs.some((ref) => ref.current?.contains(target))) return;
      onDismiss();
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onDismiss();
      }
    };

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [active, onDismiss, refs]);
}

function QuestionCard({ children }: { children: ReactNode }) {
  return (
    <div className="rounded-[20px] border border-zinc-200 bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(248,250,252,0.96))] p-4 shadow-[0_12px_30px_rgba(15,23,42,0.05)]">
      {children}
    </div>
  );
}

function CustomSelectQuestion({
  question,
  value,
  onChange,
  locale,
}: {
  question: AssistantQuestion;
  value: string;
  onChange: (value: string) => void;
  locale: AdminLocale;
}) {
  const [open, setOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const triggerRef = useRef<HTMLButtonElement | null>(null);

  useOutsideDismiss([wrapperRef], () => setOpen(false), open);

  const selectedLabel = value || (locale === "az" ? "Seçin" : "Select");

  return (
    <div ref={wrapperRef} className="relative">
      <button
        ref={triggerRef}
        type="button"
        className={cx(
          "group flex h-12 w-full items-center justify-between gap-3 rounded-[16px] border px-4 text-left text-sm transition-all duration-200",
          open
            ? "border-violet-300 bg-white shadow-[0_10px_24px_rgba(124,58,237,0.12)] ring-4 ring-violet-100"
            : "border-zinc-200 bg-white hover:border-zinc-300 hover:shadow-[0_8px_18px_rgba(15,23,42,0.04)]",
        )}
        onClick={() => setOpen((current) => !current)}
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        <span className={cx("truncate", value ? "text-zinc-900" : "text-zinc-400")}>{selectedLabel}</span>
        <span className={cx("inline-flex h-7 w-7 items-center justify-center rounded-full border transition", open ? "border-violet-200 bg-violet-50 text-violet-700" : "border-zinc-200 bg-zinc-50 text-zinc-500 group-hover:bg-white")}>
          <CaretRight size={14} weight="bold" className={cx("transition-transform duration-200", open ? "rotate-90" : "")} />
        </span>
      </button>

      {open ? (
        <div className="absolute left-0 top-[calc(100%+10px)] z-20 w-full overflow-hidden rounded-[16px] border border-zinc-200 bg-white shadow-[0_22px_48px_rgba(15,23,42,0.12)]">
          <div className="border-b border-zinc-100 bg-zinc-50 px-4 py-3">
            <p className="text-[0.68rem] font-semibold uppercase tracking-[0.14em] text-zinc-400">{question.label}</p>
            <p className="mt-1 text-xs leading-5 text-zinc-500">{question.question}</p>
          </div>
          <div className="max-h-64 overflow-y-auto p-2">
            <button
              type="button"
              className={cx(
                "flex h-11 w-full items-center justify-between rounded-[12px] px-3 text-left text-sm transition",
                !value ? "bg-violet-50 text-violet-700" : "text-zinc-700 hover:bg-zinc-50 hover:text-zinc-950",
              )}
              onClick={() => {
                onChange("");
                setOpen(false);
              }}
            >
              <span>{locale === "az" ? "Seçin" : "Select"}</span>
              {!value ? <CheckCircle size={16} weight="fill" /> : null}
            </button>
            {question.options?.map((option) => (
              <button
                key={option}
                type="button"
                className={cx(
                  "flex h-11 w-full items-center justify-between rounded-[12px] px-3 text-left text-sm transition",
                  value === option ? "bg-violet-50 text-violet-700" : "text-zinc-700 hover:bg-zinc-50 hover:text-zinc-950",
                )}
                onClick={() => {
                  onChange(option);
                  setOpen(false);
                }}
              >
                <span>{option}</span>
                {value === option ? <CheckCircle size={16} weight="fill" /> : null}
              </button>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}

function QuestionInput({
  question,
  value,
  onChange,
  locale,
}: {
  question: AssistantQuestion;
  value: string;
  onChange: (value: string) => void;
  locale: AdminLocale;
}) {
  const shell =
    "w-full rounded-[16px] border border-zinc-200 bg-white px-4 py-3 text-sm text-zinc-900 outline-none transition placeholder:text-zinc-400 focus:border-violet-400 focus:ring-4 focus:ring-violet-100";

  if (question.type === "select") {
    return <CustomSelectQuestion question={question} value={value} onChange={onChange} locale={locale} />;
  }

  if (question.type === "textarea") {
    return (
      <textarea
        rows={4}
        className={cx(shell, "min-h-[120px] resize-y")}
        value={value}
        placeholder={question.placeholder}
        onChange={(event) => onChange(event.target.value)}
      />
    );
  }

  if (question.type === "toggle") {
    const isOn = value === "true";
    return (
      <button
        type="button"
        className={cx(
          "inline-flex h-12 items-center gap-3 rounded-[16px] border px-4 text-sm font-semibold transition-all duration-200",
          isOn
            ? "border-emerald-200 bg-emerald-50 text-emerald-800 shadow-[0_8px_18px_rgba(16,185,129,0.12)]"
            : "border-zinc-200 bg-white text-zinc-600 hover:border-zinc-300 hover:bg-zinc-50",
        )}
        onClick={() => onChange(isOn ? "false" : "true")}
      >
        <span className={cx("inline-flex h-7 w-12 items-center rounded-full px-1 transition", isOn ? "bg-emerald-500" : "bg-zinc-200") }>
          <span className={cx("h-5 w-5 rounded-full bg-white shadow transition-transform", isOn ? "translate-x-5" : "translate-x-0")} />
        </span>
        {isOn ? (locale === "az" ? "Açıq" : "On") : locale === "az" ? "Söndürülüb" : "Off"}
      </button>
    );
  }

  return (
    <input
      className={shell}
      value={value}
      type={question.type === "number" ? "number" : "text"}
      placeholder={question.placeholder}
      onChange={(event) => onChange(event.target.value)}
    />
  );
}

function coerceAnswer(question: AssistantQuestion, value: string) {
  if (question.type === "number") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : value;
  }

  if (question.type === "toggle") {
    return value === "true";
  }

  return value.trim();
}

function mergeActionWithAnswers(
  action: AssistantAction | null,
  questions: AssistantQuestion[],
  answers: Record<string, string>,
) {
  if (!action) return null;

  const payload = { ...action.payload };
  for (const question of questions) {
    const value = answers[question.key];
    if (value === undefined || value === null || value === "") continue;
    payload[question.key] = coerceAnswer(question, String(value));
  }

  return { ...action, payload };
}

function hasDiscountTarget(payload: Record<string, unknown>) {
  return Boolean(
    payload.perfumeId ||
      payload.perfumeSlug ||
      payload.perfumeSlugs ||
      payload.productId ||
      payload.targetPerfume ||
      payload.targetSlug ||
      payload.targetName ||
      payload.discountUpdates,
  );
}

function buildProductClarificationQuestion(locale: AdminLocale): AssistantQuestion {
  return {
    key: "targetName",
    label: locale === "az" ? "Məhsulu təsdiqləyin" : "Confirm product",
    question:
      locale === "az"
        ? "AI məhsulu tam müəyyən edə bilmədi. Endirim tətbiq olunacaq ətirin kataloqdakı adını yazın."
        : "AI could not identify the exact product. Type the catalog product name that should receive the discount.",
    type: "text",
    placeholder: locale === "az" ? "Məsələn: Trussardi Uomo" : "Example: Trussardi Uomo",
    helper:
      locale === "az"
        ? "Məhsul adı kifayətdir. Texniki açar və ya xüsusi kod yazmağa ehtiyac yoxdur."
        : "A product name is enough. No technical key or special code is needed.",
    required: true,
    uiHint: "perfume",
  };
}

function polishQuestionForAdmin(question: AssistantQuestion, locale: AdminLocale): AssistantQuestion {
  const combinedText = `${question.label} ${question.question} ${question.placeholder ?? ""} ${question.helper ?? ""}`.toLowerCase();
  const isTechnicalProductTarget =
    ["targetSlug", "targetPerfume", "perfumeSlug", "productId"].includes(question.key) ||
    (question.uiHint === "perfume" && (combinedText.includes("slug") || combinedText.includes("'all'") || combinedText.includes(" all ")));

  if (!isTechnicalProductTarget) {
    return question;
  }

  return {
    ...question,
    key: "targetName",
    label: locale === "az" ? "Məhsulu təsdiqləyin" : "Confirm product",
    question:
      locale === "az"
        ? "Endirim hansı ətirə tətbiq olunsun? Kataloqdakı məhsul adını seçin və ya yazın."
        : "Which perfume should get this discount? Choose or type the catalog product name.",
    placeholder: locale === "az" ? "Məsələn: Trussardi Uomo" : "Example: Trussardi Uomo",
    helper:
      locale === "az"
        ? "Məhsul adı kifayətdir. Texniki açar və ya xüsusi kod yazmağa ehtiyac yoxdur."
        : "A product name is enough. No technical key or special code is needed.",
    uiHint: "perfume",
  };
}

function ActionPreview({ plan, locale }: { plan: AssistantPlan; locale: AdminLocale }) {
  const text = copy[locale];

  if (!plan.preview) {
    return (
      <div className="rounded-[16px] border border-zinc-200 bg-white p-4">
        <p className="text-[0.68rem] font-semibold uppercase tracking-[0.16em] text-zinc-400">{text.previewTitle}</p>
        <div className="mt-3 flex items-start gap-3">
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-[10px] border border-violet-100 bg-violet-50 text-violet-600">
            <Sparkle size={16} weight="bold" />
          </span>
          <div>
            <p className="text-sm font-semibold text-zinc-900">{text.noPlan}</p>
            <p className="mt-1 text-sm leading-6 text-zinc-500">{text.description}</p>
          </div>
        </div>
      </div>
    );
  }

  const { preview } = plan;

  return (
    <div className="rounded-[16px] border border-zinc-200 bg-white p-4">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-[0.68rem] font-semibold uppercase tracking-[0.16em] text-zinc-400">{text.previewTitle}</p>
          <h3 className="mt-2 text-base font-semibold text-zinc-950">{preview.title}</h3>
        </div>
        <span
          className={cx(
            "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[0.68rem] font-semibold",
            plan.mode === "ready"
              ? "border-emerald-200 bg-emerald-50 text-emerald-700"
              : "border-amber-200 bg-amber-50 text-amber-700",
          )}
        >
          <CheckCircle size={14} weight="fill" />
          {plan.mode === "ready" ? text.ready : text.clarify}
        </span>
      </div>

      <p className="mt-3 text-sm leading-6 text-zinc-600">{preview.description}</p>

      {preview.imageUrl ? (
        <div className="mt-4 overflow-hidden rounded-[12px] border border-zinc-200 bg-zinc-50">
          <img src={preview.imageUrl} alt={preview.title} className="h-40 w-full object-cover" />
        </div>
      ) : null}

      {preview.meta?.length ? (
        <dl className="mt-4 grid gap-3 sm:grid-cols-2">
          {preview.meta.map((item) => (
            <div key={item.label} className="rounded-[12px] border border-zinc-200 bg-zinc-50 p-3">
              <dt className="text-[0.68rem] font-semibold uppercase tracking-[0.14em] text-zinc-400">{item.label}</dt>
              <dd className="mt-1 text-sm font-medium text-zinc-900">{item.value}</dd>
            </div>
          ))}
        </dl>
      ) : null}

      <div className="mt-4 grid gap-3 rounded-[12px] border border-zinc-200 bg-zinc-50 p-3 sm:grid-cols-2">
        <div>
          <p className="text-[0.68rem] font-semibold uppercase tracking-[0.14em] text-zinc-400">Intent</p>
          <p className="mt-1 text-sm font-medium text-zinc-900">{plan.intent}</p>
        </div>
        <div>
          <p className="text-[0.68rem] font-semibold uppercase tracking-[0.14em] text-zinc-400">Confidence</p>
          <p className="mt-1 text-sm font-medium text-zinc-900">{formatConfidence(plan.confidence)}</p>
        </div>
      </div>
    </div>
  );
}

export function AdminCommandCenter({
  locale = "en",
  onRefresh,
}: {
  locale?: AdminLocale;
  onRefresh: () => Promise<void> | void;
}) {
  const text = copy[locale];
  const [prompt, setPrompt] = useState("");
  const [plan, setPlan] = useState<AssistantPlan | null>(null);
  const [history, setHistory] = useState<AssistantMessage[]>([]);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [isThinking, setIsThinking] = useState(false);
  const [isApplying, setIsApplying] = useState(false);
  const [status, setStatus] = useState<{ tone: "success" | "error" | "neutral"; message: string } | null>(null);
  const [attachment, setAttachment] = useState<AttachmentState | null>(null);
  const [flowState, setFlowState] = useState<FlowState>("idle");
  const [lastCommand, setLastCommand] = useState("");
  const [lastAssistantReply, setLastAssistantReply] = useState("");
  const [motionKey, setMotionKey] = useState(0);
  const [showQuestionModal, setShowQuestionModal] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const resolvedAction = useMemo(
    () => mergeActionWithAnswers(plan?.action ?? null, plan?.questions ?? [], answers),
    [answers, plan?.action, plan?.questions],
  );

  const canApply = Boolean(
    resolvedAction && (plan?.questions ?? []).every((question) => !question.required || hasAnswer(answers[question.key])),
  );

  const questionCount = plan?.questions?.length ?? 0;
  const statusCopy = {
    idle: locale === "az" ? "Əmr gözləyir" : "Waiting for a command",
    sending: locale === "az" ? "AI plan hazırlayır" : "AI is preparing a plan",
    ready: locale === "az" ? "Plan hazırdır" : "Plan is ready",
    applying: locale === "az" ? "Dəyişiklik tətbiq olunur" : "Applying changes",
    applied: locale === "az" ? "Dəyişiklik tətbiq olundu" : "Changes applied",
    error: locale === "az" ? "Yoxlama lazımdır" : "Needs attention",
  } satisfies Record<FlowState, string>;
  const statusDetail = {
    idle: locale === "az" ? "Komanda yazın və göndərin. AI əvvəlcə plan hazırlayacaq." : "Send a command. AI will prepare the plan first.",
    sending: locale === "az" ? "Komanda analiz olunur. Bu kart plan gələndə yenilənəcək." : "Your command is being analyzed. This card updates when the plan arrives.",
    ready: locale === "az" ? "Plan hazırdır. Tətbiq et düyməsi faktiki dəyişiklikləri edəcək." : "The plan is ready. Apply will make the actual changes.",
    applying: locale === "az" ? "Admin məlumatları yenilənir. Pəncərəni bağlamayın." : "Admin data is being updated. Keep this window open.",
    applied: locale === "az" ? "AI əmri icra etdi. Lazımdırsa aşağıdakı saxla statusunu yoxlayın." : "The AI command has been executed. Check the save status below if needed.",
    error: locale === "az" ? "Əməliyyat tamamlanmadı. Mesajı yoxlayıb yenidən cəhd edin." : "The operation did not finish. Review the message and try again.",
  } satisfies Record<FlowState, string>;
  const flowToneClass =
    flowState === "applied"
      ? "border-emerald-200 bg-emerald-50 text-emerald-700"
      : flowState === "error"
        ? "border-rose-200 bg-rose-50 text-rose-700"
        : flowState === "sending" || flowState === "applying"
          ? "border-violet-200 bg-violet-50 text-violet-700"
          : flowState === "ready"
            ? "border-amber-200 bg-amber-50 text-amber-700"
            : "border-zinc-200 bg-zinc-50 text-zinc-600";
  const emptyPlan: AssistantPlan = {
    mode: "clarify",
    title: text.title,
    summary: text.noPlan,
    reply: text.noPlan,
    intent: "idle",
    confidence: 0,
    needsMoreContext: true,
    questions: [],
    action: null,
    preview: null,
    suggestedReplies: [],
  };

  const appendMessage = (role: AssistantMessage["role"], textValue: string) => {
    setHistory((current) => [...current, { role, text: textValue }].slice(-12));
  };

  const handleAttach = async (file?: File | null) => {
    if (!file) return;
    const dataUrl = await toBase64(file);
    setAttachment({ file, dataUrl, mimeType: file.type, name: file.name });
  };

  const handleAnalyze = async (promptOverride?: string) => {
    const trimmed = (promptOverride ?? prompt).trim();
    if (!trimmed && !attachment) {
      setStatus({ tone: "error", message: text.noPlan });
      return;
    }

    const userText = trimmed || (locale === "az" ? "Şəkil əlavə edildi" : "Image attached");
    const requestHistory = [...history, { role: "user" as const, text: userText }].slice(-12);

    setIsThinking(true);
    setStatus(null);
    setFlowState("sending");
    setLastCommand(userText);
    setLastAssistantReply("");
    setMotionKey((current) => current + 1);
    appendMessage("user", userText);

    try {
      const response = await fetch("/api/admin/assistant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: trimmed,
          locale,
          history: requestHistory,
          answers,
          imageDataUrl: attachment?.dataUrl,
          imageName: attachment?.name,
          imageMimeType: attachment?.mimeType,
        }),
      });

      const body = (await response.json()) as AssistantPlan & { error?: string };
      if (!response.ok) {
        throw new Error(body.error || text.error);
      }

      // If assistant suggests setting a perfume discount but did not include explicit targets,
      // add a clarifying question so the user can specify a catalog product in plain language.
      let nextPlan: AssistantPlan = {
        ...body,
        questions: (body.questions ?? []).map((question) => polishQuestionForAdmin(question, locale)),
      };
      try {
        const action = nextPlan.action;
        const hasTargets = Boolean(action?.payload && hasDiscountTarget(action.payload));
        if (action?.type === "set_perfume_discount" && !hasTargets) {
          const clarifyingQuestion = buildProductClarificationQuestion(locale);
          const hasExistingProductQuestion = (nextPlan.questions ?? []).some((question) =>
            ["targetName", "targetSlug", "targetPerfume"].includes(question.key),
          );
          nextPlan = {
            ...nextPlan,
            mode: "clarify",
            questions: hasExistingProductQuestion ? nextPlan.questions ?? [] : [...(nextPlan.questions ?? []), clarifyingQuestion],
            needsMoreContext: true,
          };
        }
      } catch {
        // noop
      }
      setPlan(nextPlan);
      setShowQuestionModal(nextPlan.questions.length > 0);
      setFlowState(nextPlan.mode === "ready" ? "ready" : "idle");
      setLastAssistantReply(body.reply);
      setMotionKey((current) => current + 1);
      setAnswers((current) =>
        Object.fromEntries(
          nextPlan.questions.map((question) => [question.key, current[question.key] ?? (question.type === "toggle" ? "false" : "")]),
        ) as Record<string, string>,
      );
      appendMessage("assistant", body.reply);
      if (body.suggestedReplies.length) {
        setStatus({ tone: "neutral", message: body.suggestedReplies[0] });
      }
    } catch (error) {
      setFlowState("error");
      setStatus({ tone: "error", message: error instanceof Error ? error.message : text.error });
    } finally {
      setIsThinking(false);
    }
  };

  const handleApply = async () => {
    if (!plan?.action) return;

    setIsApplying(true);
    setFlowState("applying");
    setMotionKey((current) => current + 1);
    setStatus({ tone: "neutral", message: text.thinking });

    try {
      // Safety: if discount action has no explicit targets, open a confirmation modal
      const actionToApply = resolvedAction ?? plan.action;
      const payload = (actionToApply && (actionToApply as AssistantAction).payload) || {};
      if (actionToApply?.type === "set_perfume_discount") {
        const hasTarget = hasDiscountTarget(payload);
        if (!hasTarget) {
          const clarifyingQuestion = buildProductClarificationQuestion(locale);
          setPlan((current) => {
            const base = current ?? plan;
            const hasExistingProductQuestion = (base.questions ?? []).some((question) =>
              ["targetName", "targetSlug", "targetPerfume"].includes(question.key),
            );
            return {
              ...base,
              mode: "clarify",
              needsMoreContext: true,
              questions: hasExistingProductQuestion ? base.questions : [...(base.questions ?? []), clarifyingQuestion],
            };
          });
          setAnswers((current) => ({ ...current, [clarifyingQuestion.key]: current[clarifyingQuestion.key] ?? "" }));
          setShowQuestionModal(true);
          setFlowState("idle");
          setStatus({
            tone: "neutral",
            message:
              locale === "az"
                ? "Tətbiqdən əvvəl məhsulu təsdiqləyin."
                : "Confirm the product before applying.",
          });
          setIsApplying(false);
          return;
        }
      }
      let imageUrl = "";
      if (attachment && plan.action.type === "create_perfume_draft") {
        const uploadFormData = new FormData();
        uploadFormData.append("file", attachment.file);
        uploadFormData.append("folder", "perfumes");

        const uploadResponse = await fetch("/api/admin/upload", {
          method: "POST",
          body: uploadFormData,
        });

        const uploadBody = (await uploadResponse.json()) as { url?: string; error?: string };
        if (!uploadResponse.ok || !uploadBody.url) {
          throw new Error(uploadBody.error || text.error);
        }

        imageUrl = uploadBody.url;
      }

      const response = await fetch("/api/admin/assistant/execute", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: resolvedAction, answers, imageUrl, forceApplyAll: false }),
      });

      const body = (await response.json()) as { error?: string };
      if (!response.ok) {
        throw new Error(body.error || text.error);
      }

      setStatus({ tone: "success", message: text.success });
      setFlowState("applied");
      setLastAssistantReply(text.success);
      setMotionKey((current) => current + 1);
      appendMessage("assistant", text.success);
      await onRefresh();

      setPlan(null);
      setPrompt("");
      setAttachment(null);
      setAnswers({});
    } catch (error) {
      setFlowState("error");
      setStatus({ tone: "error", message: error instanceof Error ? error.message : text.error });
    } finally {
      setIsApplying(false);
    }
  };

  return (
    <>
    <section className="rounded-[24px] border border-zinc-200 bg-white p-5 shadow-[0_18px_54px_rgba(15,23,42,0.05)] lg:p-6">
      <input
        ref={fileInputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp,image/gif"
        className="hidden"
        onChange={(event) => {
          const file = event.target.files?.[0] || null;
          event.target.value = "";
          void handleAttach(file);
        }}
      />

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.45fr)_minmax(330px,0.8fr)]">
        <div className="min-w-0 space-y-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <div className="flex flex-wrap items-center gap-2 text-xs font-medium text-zinc-400">
                <span>Settings</span>
                <CaretRight size={12} weight="bold" />
                <span className="text-zinc-500">{text.title}</span>
              </div>
              <div className="mt-3 flex flex-wrap items-center gap-3">
                <h2 className="text-3xl font-semibold tracking-[-0.03em] text-zinc-950">{text.title}</h2>
                <span
                  className={cx(
                    "inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold",
                    plan?.mode === "ready" ? "bg-emerald-50 text-emerald-700" : "bg-zinc-100 text-zinc-600",
                  )}
                >
                  <span className={cx("h-2 w-2 rounded-full", plan?.mode === "ready" ? "bg-emerald-500" : "bg-zinc-400")} />
                  {plan?.mode === "ready" ? text.ready : text.clarify}
                </span>
              </div>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-zinc-500">{text.description}</p>
            </div>

            <div className="flex shrink-0 flex-wrap items-center gap-2">
              <button
                type="button"
                className="inline-flex h-10 items-center gap-2 rounded-[12px] border border-zinc-200 bg-white px-4 text-sm font-semibold text-zinc-700 transition hover:border-zinc-300 hover:bg-zinc-50"
                onClick={() => fileInputRef.current?.click()}
              >
                <Image size={16} weight="bold" />
                {text.upload}
              </button>
              <button
                type="button"
                className="inline-flex h-10 items-center gap-2 rounded-[12px] border border-zinc-200 bg-white px-4 text-sm font-semibold text-zinc-700 transition hover:border-zinc-300 hover:bg-zinc-50"
                onClick={() => {
                  setPlan(null);
                  setHistory([]);
                  setAnswers({});
                  setPrompt("");
                  setAttachment(null);
                  setStatus(null);
                  setFlowState("idle");
                  setLastCommand("");
                  setLastAssistantReply("");
                  setShowQuestionModal(false);
                  setMotionKey((current) => current + 1);
                }}
              >
                <ArrowClockwise size={16} weight="bold" />
                {text.reset}
              </button>
            </div>
          </div>

          <div>
            <p className="text-[0.68rem] font-semibold uppercase tracking-[0.16em] text-zinc-400">
              {locale === "az" ? "Sürətli əmrlər" : "Quick commands"}
            </p>
            <div className="mt-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              {text.quickActions.map((item, index) => (
                <button
                  key={`${item}-${index}`}
                  type="button"
                  className="group min-h-[86px] rounded-[12px] border border-zinc-200 bg-white p-3 text-left transition hover:-translate-y-0.5 hover:border-violet-200 hover:shadow-[0_12px_26px_rgba(15,23,42,0.06)]"
                  onClick={() => {
                    setPrompt(item);
                    void handleAnalyze(item);
                  }}
                >
                  <span className="grid h-8 w-8 place-items-center rounded-[9px] bg-violet-50 text-violet-600 transition group-hover:bg-violet-600 group-hover:text-white">
                    <Sparkle size={15} weight="bold" />
                  </span>
                  <span className="mt-3 block text-sm font-semibold leading-5 text-zinc-900">{item}</span>
                  <span className="mt-1 block text-xs leading-5 text-zinc-500">{text.examples[index] ?? text.promptLabel}</span>
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-[0.68rem] font-semibold uppercase tracking-[0.16em] text-zinc-400">{text.promptLabel}</label>
            <div className="mt-3 rounded-[16px] border border-zinc-200 bg-white p-3 shadow-[0_8px_28px_rgba(15,23,42,0.04)]">
              <textarea
                rows={5}
                value={prompt}
                onChange={(event) => setPrompt(event.target.value)}
                placeholder={text.promptPlaceholder}
                className="min-h-[126px] w-full resize-y border-none bg-transparent px-1 py-1 text-sm leading-6 text-zinc-900 outline-none placeholder:text-zinc-400"
              />
              <div className="mt-3 flex flex-col gap-3 border-t border-zinc-100 pt-3 sm:flex-row sm:items-center sm:justify-between">
                <button
                  type="button"
                  className="inline-flex h-10 items-center justify-center gap-2 rounded-[10px] border border-zinc-200 bg-white px-4 text-sm font-semibold text-zinc-700 transition hover:border-zinc-300 hover:bg-zinc-50"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <UploadSimple size={16} weight="bold" />
                  {text.upload}
                </button>
                <div className="flex gap-2">
                  <button
                    type="button"
                    className="inline-flex h-10 items-center justify-center gap-2 rounded-[10px] border border-zinc-200 bg-white px-4 text-sm font-semibold text-zinc-700 transition hover:border-zinc-300 hover:bg-zinc-50"
                    onClick={() => setPrompt("")}
                  >
                    <X size={15} weight="bold" />
                    {text.clear}
                  </button>
                  <button
                    type="button"
                    className={cx(
                      "inline-flex h-10 items-center justify-center gap-2 rounded-[10px] bg-violet-600 px-5 text-sm font-semibold text-white shadow-[0_12px_24px_rgba(124,58,237,0.22)] transition-all duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] hover:-translate-y-0.5 hover:bg-violet-500 disabled:cursor-not-allowed disabled:opacity-60",
                      isThinking ? "scale-[0.98] shadow-[0_6px_16px_rgba(124,58,237,0.18)]" : "",
                    )}
                    onClick={() => void handleAnalyze()}
                    disabled={isThinking || isApplying}
                  >
                    {isThinking ? <CircleNotch className="animate-spin" size={16} weight="bold" /> : <PaperPlaneRight size={16} weight="bold" />}
                    {isThinking ? text.thinking : text.send}
                  </button>
                </div>
              </div>
            </div>
            <p className="mt-3 flex items-start gap-2 text-xs leading-6 text-zinc-500">
              <Sparkle className="mt-1 shrink-0 text-violet-500" size={14} weight="fill" />
              {text.uploadHint}
            </p>
          </div>

          {status ? (
            <div
              className={cx(
                "inline-flex max-w-full items-center gap-2 rounded-[12px] border px-3 py-2 text-sm font-medium",
                status.tone === "success"
                  ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                  : status.tone === "error"
                    ? "border-rose-200 bg-rose-50 text-rose-700"
                    : "border-zinc-200 bg-zinc-50 text-zinc-600",
              )}
            >
              {status.tone === "success" ? <CheckCircle size={16} weight="fill" /> : null}
              <span className="min-w-0 truncate">{status.message}</span>
            </div>
          ) : null}

          <div className="grid gap-4 md:grid-cols-2">
            <div key={`flow-${motionKey}`} className="admin-ios-rise rounded-[16px] border border-zinc-200 bg-white p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-[0.68rem] font-semibold uppercase tracking-[0.16em] text-zinc-400">
                    {locale === "az" ? "İcra statusu" : "Execution status"}
                  </p>
                  <h3 className="mt-2 text-base font-semibold text-zinc-950">{statusCopy[flowState]}</h3>
                </div>
                <span className={cx("inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full border", flowToneClass)}>
                  {flowState === "sending" || flowState === "applying" ? (
                    <CircleNotch className="animate-spin" size={16} weight="bold" />
                  ) : (
                    <CheckCircle size={16} weight="fill" />
                  )}
                </span>
              </div>
              <p className="mt-2 text-sm leading-6 text-zinc-500">{statusDetail[flowState]}</p>

              <div className="mt-4 space-y-3">
                <div className="rounded-[12px] border border-zinc-100 bg-zinc-50 px-3 py-2">
                  <p className="text-[0.65rem] font-semibold uppercase tracking-[0.14em] text-zinc-400">
                    {locale === "az" ? "Son əmr" : "Last command"}
                  </p>
                  <p className="mt-1 text-sm leading-6 text-zinc-800">{lastCommand || text.noPlan}</p>
                </div>
                <div className="rounded-[12px] border border-zinc-100 bg-zinc-50 px-3 py-2">
                  <p className="text-[0.65rem] font-semibold uppercase tracking-[0.14em] text-zinc-400">
                    {locale === "az" ? "AI cavabı" : "AI response"}
                  </p>
                  <p className="mt-1 text-sm leading-6 text-zinc-800">
                    {lastAssistantReply || (locale === "az" ? "Plan gələndə burada görünəcək." : "The plan response will appear here.")}
                  </p>
                </div>
              </div>
            </div>

            <div className="rounded-[16px] border border-zinc-200 bg-white p-4">
              <p className="text-[0.68rem] font-semibold uppercase tracking-[0.16em] text-zinc-400">{text.questionsTitle}</p>
              <div className="mt-3 space-y-3">
                {questionCount ? (
                  <QuestionCard>
                    <div className="flex items-start gap-3">
                      <span className="grid h-9 w-9 shrink-0 place-items-center rounded-[10px] border border-amber-100 bg-amber-50 text-amber-700">
                        <Sparkle size={16} weight="bold" />
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold text-zinc-950">
                          {locale === "az" ? "Təsdiq lazımdır" : "Confirmation needed"}
                        </p>
                        <p className="mt-1 text-sm leading-6 text-zinc-600">
                          {locale === "az"
                            ? "AI planı hazırlayıb, amma tətbiqdən əvvəl bəzi detalları sizinlə dəqiqləşdirməlidir."
                            : "AI prepared the plan, but a few details need confirmation before anything changes."}
                        </p>
                        <div className="mt-3 flex flex-wrap gap-2">
                          {plan?.questions.map((question) => (
                            <span
                              key={question.key}
                              className="rounded-full border border-zinc-200 bg-white px-2.5 py-1 text-xs font-semibold text-zinc-600"
                            >
                              {question.label}
                            </span>
                          ))}
                        </div>
                        <button
                          type="button"
                          className="mt-4 inline-flex h-10 items-center justify-center gap-2 rounded-[12px] bg-zinc-900 px-4 text-sm font-semibold text-white transition hover:bg-zinc-800"
                          onClick={() => setShowQuestionModal(true)}
                        >
                          <CheckCircle size={16} weight="bold" />
                          {locale === "az" ? "Detalları təsdiqlə" : "Confirm details"}
                        </button>
                      </div>
                    </div>
                  </QuestionCard>
                ) : (
                  <QuestionCard>
                    <p className="text-sm leading-6 text-zinc-500">{text.noPlan}</p>
                  </QuestionCard>
                )}
              </div>
            </div>
          </div>
        </div>

        <aside className="space-y-4">
          <div className="rounded-[16px] border border-zinc-200 bg-white p-4">
            <div className="flex items-center justify-between gap-3">
              <p className="text-[0.68rem] font-semibold uppercase tracking-[0.16em] text-zinc-400">{text.attached}</p>
              {attachment ? (
                <button
                  type="button"
                  aria-label={text.clear}
                  className="grid h-8 w-8 place-items-center rounded-[10px] bg-zinc-50 text-zinc-600 transition hover:bg-zinc-100 hover:text-zinc-950"
                  onClick={() => setAttachment(null)}
                >
                  <X size={15} weight="bold" />
                </button>
              ) : null}
            </div>

            <button
              type="button"
              className={cx(
                "mt-3 block w-full overflow-hidden rounded-[14px] border bg-zinc-50 text-left transition hover:border-zinc-300",
                attachment ? "border-zinc-200" : "border-dashed border-zinc-300",
              )}
              onClick={() => fileInputRef.current?.click()}
            >
              {attachment ? (
                <img src={attachment.dataUrl} alt={attachment.name} className="h-56 w-full object-cover" />
              ) : (
                <span className="grid h-56 place-items-center px-6 text-center">
                  <span>
                    <span className="mx-auto grid h-11 w-11 place-items-center rounded-[12px] border border-zinc-200 bg-white text-violet-600">
                      <Image size={20} weight="bold" />
                    </span>
                    <span className="mt-3 block text-sm font-semibold text-zinc-900">{text.upload}</span>
                    <span className="mt-1 block text-xs leading-5 text-zinc-500">JPG, PNG, WEBP, GIF</span>
                  </span>
                </span>
              )}
            </button>

            <div className="mt-3 flex items-center justify-between gap-2">
              <button
                type="button"
                className="inline-flex h-10 flex-1 items-center justify-center gap-2 rounded-[10px] border border-zinc-200 bg-white px-3 text-sm font-semibold text-zinc-700 transition hover:border-zinc-300 hover:bg-zinc-50"
                onClick={() => fileInputRef.current?.click()}
              >
                <UploadSimple size={15} weight="bold" />
                {text.upload}
              </button>
              <button
                type="button"
                aria-label={text.clear}
                className="grid h-10 w-10 place-items-center rounded-[10px] border border-zinc-200 bg-white text-zinc-600 transition hover:border-rose-200 hover:bg-rose-50 hover:text-rose-600 disabled:cursor-not-allowed disabled:opacity-40"
                onClick={() => setAttachment(null)}
                disabled={!attachment}
              >
                <Trash size={15} weight="bold" />
              </button>
            </div>
            <p className="mt-3 text-xs leading-5 text-zinc-500">{text.uploadHint}</p>
          </div>

          <ActionPreview plan={plan ?? emptyPlan} locale={locale} />

          <div className="rounded-[16px] border border-zinc-200 bg-white p-4">
            <p className="text-[0.68rem] font-semibold uppercase tracking-[0.16em] text-zinc-400">
              {locale === "az" ? "Nə etməyi təklif edirik?" : "Suggested actions"}
            </p>
            <div className="mt-3 space-y-2">
              {(plan?.suggestedReplies.length ? plan.suggestedReplies : text.examples).map((item, index) => (
                <button
                  key={`${item}-${index}`}
                  type="button"
                  className="flex min-h-11 w-full items-center justify-between gap-3 rounded-[10px] border border-zinc-200 bg-white px-3 py-2 text-left text-sm leading-5 text-zinc-700 transition hover:border-zinc-300 hover:bg-zinc-50"
                  onClick={() => {
                    setPrompt(item);
                    void handleAnalyze(item);
                  }}
                >
                  <span>{item}</span>
                  <CaretRight className="shrink-0 text-zinc-400" size={14} weight="bold" />
                </button>
              ))}
            </div>

            <button
              type="button"
              className={cx(
                "mt-4 inline-flex h-11 w-full items-center justify-center gap-2 rounded-[14px] bg-zinc-800 px-4 text-sm font-semibold text-white shadow-[0_12px_24px_rgba(15,23,42,0.14)] transition-all duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] hover:-translate-y-0.5 hover:bg-zinc-700 disabled:cursor-not-allowed disabled:opacity-50",
                isApplying ? "scale-[0.98] bg-violet-700" : "",
              )}
              onClick={() => void handleApply()}
              disabled={!canApply || isApplying}
            >
              {isApplying ? <CircleNotch className="animate-spin" size={16} weight="bold" /> : <CheckCircle size={16} weight="bold" />}
              {isApplying ? text.thinking : text.apply}
            </button>
          </div>
        </aside>
      </div>
    </section>
    {showQuestionModal && plan?.questions.length ? (
      <div className="fixed inset-0 z-[60] flex items-center justify-center bg-zinc-950/35 px-4 py-6 backdrop-blur-sm">
        <div className="max-h-[92vh] w-[min(720px,100%)] overflow-hidden rounded-[20px] border border-zinc-200 bg-white shadow-[0_24px_80px_rgba(2,6,23,0.28)]">
          <div className="border-b border-zinc-100 bg-[linear-gradient(180deg,#FFFFFF_0%,#FAFAFB_100%)] px-5 py-4 sm:px-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-[0.68rem] font-semibold uppercase tracking-[0.16em] text-zinc-400">
                  {locale === "az" ? "AI təsdiqi" : "AI confirmation"}
                </p>
                <h3 className="mt-2 text-lg font-semibold text-zinc-950">
                  {locale === "az" ? "Tətbiqdən əvvəl bunu dəqiqləşdirək" : "Confirm this before applying"}
                </h3>
                <p className="mt-2 max-w-2xl text-sm leading-6 text-zinc-600">
                  {locale === "az"
                    ? "AI əmrinizdən plan çıxardı, amma səhv məhsula və ya səhv qiymətə toxunmamaq üçün aşağıdakı məlumatı təsdiqləməlidir."
                    : "AI understood the command, but needs this detail confirmed so it does not edit the wrong product or price."}
                </p>
              </div>
              <button
                type="button"
                aria-label={text.clear}
                className="grid h-9 w-9 shrink-0 place-items-center rounded-[10px] border border-zinc-200 bg-white text-zinc-600 transition hover:border-zinc-300 hover:bg-zinc-50 hover:text-zinc-950"
                onClick={() => setShowQuestionModal(false)}
              >
                <X size={16} weight="bold" />
              </button>
            </div>
          </div>

          <div className="max-h-[58vh] space-y-4 overflow-y-auto px-5 py-5 sm:px-6">
            {plan.questions.map((question) => (
              <div key={question.key} className="rounded-[16px] border border-zinc-200 bg-zinc-50/70 p-4">
                <div>
                  <p className="text-sm font-semibold text-zinc-950">{question.label}</p>
                  <p className="mt-1 text-sm leading-6 text-zinc-600">{question.question}</p>
                </div>
                <div className="mt-4">
                  <QuestionInput
                    question={question}
                    value={answers[question.key] ?? ""}
                    onChange={(value) => {
                      setAnswers((current) => ({ ...current, [question.key]: value }));
                    }}
                    locale={locale}
                  />
                </div>
                {question.helper ? <p className="mt-3 text-xs leading-5 text-zinc-500">{question.helper}</p> : null}
              </div>
            ))}
          </div>

          <div className="flex flex-col gap-2 border-t border-zinc-100 bg-white px-5 py-4 sm:flex-row sm:justify-end sm:px-6">
            <button
              type="button"
              className="inline-flex h-10 items-center justify-center gap-2 rounded-[10px] border border-zinc-200 bg-white px-4 text-sm font-semibold text-zinc-700 transition hover:border-zinc-300 hover:bg-zinc-50"
              onClick={() => setShowQuestionModal(false)}
            >
              {locale === "az" ? "Hələ tətbiq etmə" : "Not yet"}
            </button>
            <button
              type="button"
              className="inline-flex h-10 items-center justify-center gap-2 rounded-[10px] bg-zinc-900 px-4 text-sm font-semibold text-white transition hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-50"
              disabled={!canApply || isApplying}
              onClick={() => {
                setShowQuestionModal(false);
                void handleApply();
              }}
            >
              {isApplying ? <CircleNotch className="animate-spin" size={16} weight="bold" /> : <CheckCircle size={16} weight="bold" />}
              {locale === "az" ? "Təsdiqlə və tətbiq et" : "Confirm and apply"}
            </button>
          </div>
        </div>
      </div>
    ) : null}
    </>
  );
}
