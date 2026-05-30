"use client";

import { useMemo, useRef, useState } from "react";
import { ArrowClockwise, CheckCircle, Image, PaperPlaneRight, Sparkle, X } from "@phosphor-icons/react";

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

function renderQuestionInput(
  question: AssistantQuestion,
  value: string,
  onChange: (value: string) => void,
  locale: AdminLocale,
) {
  const base =
    "w-full rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-sm text-zinc-900 outline-none transition placeholder:text-zinc-400 focus:border-zinc-500 focus:ring-4 focus:ring-zinc-100";

  if (question.type === "select") {
    return (
      <select className={base} value={value} onChange={(event) => onChange(event.target.value)}>
        <option value="">{locale === "az" ? "Seçin" : "Select"}</option>
        {question.options?.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    );
  }

  if (question.type === "textarea") {
    return (
      <textarea
        rows={4}
        className={base}
        value={value}
        placeholder={question.placeholder}
        onChange={(event) => onChange(event.target.value)}
      />
    );
  }

  if (question.type === "toggle") {
    return (
      <button
        type="button"
        className={cx(
          "inline-flex h-11 items-center gap-2 rounded-full border px-4 text-sm font-semibold transition",
          value === "true"
            ? "border-emerald-300 bg-emerald-50 text-emerald-800"
            : "border-zinc-200 bg-white text-zinc-600 hover:border-zinc-300",
        )}
        onClick={() => onChange(value === "true" ? "false" : "true")}
      >
        <span className="inline-flex h-5 w-9 items-center rounded-full bg-zinc-900 px-1">
          <span className={cx("h-3.5 w-3.5 rounded-full bg-white transition", value === "true" ? "translate-x-3.5" : "")}></span>
        </span>
        {value === "true" ? (locale === "az" ? "Açıq" : "On") : locale === "az" ? "Söndürülüb" : "Off"}
      </button>
    );
  }

  return (
    <input
      className={base}
      value={value}
      type={question.type === "number" ? "number" : "text"}
      placeholder={question.placeholder}
      onChange={(event) => onChange(event.target.value)}
    />
  );
}

function ActionPreview({ plan, locale }: { plan: AssistantPlan; locale: AdminLocale }) {
  const text = copy[locale];

  if (!plan.preview) {
    return (
      <div className="rounded-[1.6rem] border border-zinc-200 bg-white p-5 shadow-[0_14px_40px_rgba(0,0,0,0.04)]">
        <div className="flex items-center gap-2 text-sm font-semibold text-zinc-900">
          <Sparkle size={16} weight="bold" />
          {text.noPlan}
        </div>
        <p className="mt-2 text-sm leading-6 text-zinc-500">{text.description}</p>
      </div>
    );
  }

  const { preview } = plan;

  return (
    <div className="rounded-[1.6rem] border border-zinc-200 bg-white p-5 shadow-[0_14px_40px_rgba(0,0,0,0.04)]">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-zinc-400">{text.previewTitle}</p>
          <h3 className="mt-2 text-xl font-semibold tracking-[-0.04em] text-zinc-950">{preview.title}</h3>
        </div>
        <span
          className={cx(
            "inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-[0.12em]",
            plan.mode === "ready"
              ? "border-emerald-200 bg-emerald-50 text-emerald-700"
              : "border-amber-200 bg-amber-50 text-amber-700",
          )}
        >
          <CheckCircle size={14} weight="fill" />
          {plan.mode === "ready" ? text.ready : text.clarify}
        </span>
      </div>

      <p className="mt-3 text-sm leading-7 text-zinc-600">{preview.description}</p>

      {preview.imageUrl ? (
        <div className="mt-4 overflow-hidden rounded-[1.2rem] border border-zinc-200 bg-zinc-50">
          <img src={preview.imageUrl} alt={preview.title} className="h-48 w-full object-cover" />
        </div>
      ) : null}

      {preview.meta?.length ? (
        <dl className="mt-4 grid gap-3 sm:grid-cols-2">
          {preview.meta.map((item) => (
            <div key={item.label} className="rounded-2xl border border-zinc-200 bg-zinc-50 p-3">
              <dt className="text-[0.7rem] font-semibold uppercase tracking-[0.14em] text-zinc-400">{item.label}</dt>
              <dd className="mt-1 text-sm font-medium text-zinc-900">{item.value}</dd>
            </div>
          ))}
        </dl>
      ) : null}

      <div className="mt-4 grid gap-3 rounded-[1.2rem] border border-zinc-200 bg-zinc-50 p-4 sm:grid-cols-2">
        <div>
          <p className="text-[0.7rem] font-semibold uppercase tracking-[0.14em] text-zinc-400">Intent</p>
          <p className="mt-1 text-sm font-medium text-zinc-900">{plan.intent}</p>
        </div>
        <div>
          <p className="text-[0.7rem] font-semibold uppercase tracking-[0.14em] text-zinc-400">Confidence</p>
          <p className="mt-1 text-sm font-medium text-zinc-900">{formatConfidence(plan.confidence)}</p>
        </div>
      </div>
    </div>
  );
}

export function AdminCommandCenter({
  locale = "en",
  onRefresh,
  onOpenView,
}: {
  locale?: AdminLocale;
  onRefresh: () => void;
  onOpenView?: (view: "perfumes" | "promotions" | "header") => void;
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
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const resolvedAction = useMemo(
    () => mergeActionWithAnswers(plan?.action ?? null, plan?.questions ?? [], answers),
    [answers, plan?.action, plan?.questions],
  );

  const canApply = Boolean(
    resolvedAction && (plan?.questions ?? []).every((question) => !question.required || hasAnswer(answers[question.key])),
  );

  const questionCount = plan?.questions?.length ?? 0;

  const appendMessage = (role: AssistantMessage["role"], textValue: string) => {
    setHistory((current) => [...current, { role, text: textValue }].slice(-12));
  };

  const handleAttach = async (file?: File | null) => {
    if (!file) return;
    const dataUrl = await toBase64(file);
    setAttachment({ file, dataUrl, mimeType: file.type, name: file.name });
  };

  const handleAnalyze = async () => {
    const trimmed = prompt.trim();
    if (!trimmed && !attachment) {
      setStatus({ tone: "error", message: text.noPlan });
      return;
    }

    const userText = trimmed || (locale === "az" ? "Şəkil əlavə edildi" : "Image attached");
    const requestHistory = [...history, { role: "user" as const, text: userText }].slice(-12);

    setIsThinking(true);
    setStatus(null);
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

      setPlan(body);
      setAnswers((current) =>
        Object.fromEntries(
          body.questions.map((question) => [question.key, current[question.key] ?? (question.type === "toggle" ? "false" : "")]),
        ) as Record<string, string>,
      );
      appendMessage("assistant", body.reply);
      if (body.suggestedReplies.length) {
        setStatus({ tone: "neutral", message: body.suggestedReplies[0] });
      }
    } catch (error) {
      setStatus({ tone: "error", message: error instanceof Error ? error.message : text.error });
    } finally {
      setIsThinking(false);
    }
  };

  const handleApply = async () => {
    if (!plan?.action) return;

    setIsApplying(true);
    setStatus({ tone: "neutral", message: text.thinking });

    try {
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
        body: JSON.stringify({ action: resolvedAction, answers, imageUrl }),
      });

      const body = (await response.json()) as { error?: string };
      if (!response.ok) {
        throw new Error(body.error || text.error);
      }

      setStatus({ tone: "success", message: text.success });
      appendMessage("assistant", text.success);
      onRefresh();

      if (plan.intent.includes("discount") || plan.intent.includes("price") || plan.intent.includes("perfume")) {
        onOpenView?.("perfumes");
      } else if (plan.intent.includes("banner")) {
        onOpenView?.("promotions");
      } else if (plan.intent.includes("header")) {
        onOpenView?.("header");
      }

      setPlan(null);
      setPrompt("");
      setAttachment(null);
      setAnswers({});
    } catch (error) {
      setStatus({ tone: "error", message: error instanceof Error ? error.message : text.error });
    } finally {
      setIsApplying(false);
    }
  };

  return (
    <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
      <div className="space-y-6 rounded-[1.8rem] border border-zinc-200 bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.98),rgba(247,247,245,0.96))] p-5 shadow-[0_16px_50px_rgba(0,0,0,0.04)]">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-zinc-200 bg-white px-3 py-1 text-xs font-semibold uppercase tracking-[0.12em] text-zinc-500">
              <Sparkle size={14} weight="bold" />
              {text.title}
            </div>
            <h2 className="mt-4 text-[1.9rem] font-semibold tracking-[-0.05em] text-zinc-950">{text.title}</h2>
            <p className="mt-2 max-w-2xl text-sm leading-7 text-zinc-600">{text.description}</p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              className="inline-flex h-10 items-center gap-2 rounded-full border border-zinc-300 bg-white px-4 text-sm font-semibold text-zinc-700 transition hover:border-zinc-400 hover:bg-zinc-50"
              onClick={() => fileInputRef.current?.click()}
            >
              <Image size={16} weight="bold" />
              {text.upload}
            </button>
            <button
              type="button"
              className="inline-flex h-10 items-center gap-2 rounded-full border border-zinc-300 bg-white px-4 text-sm font-semibold text-zinc-700 transition hover:border-zinc-400 hover:bg-zinc-50"
              onClick={() => {
                setPlan(null);
                setHistory([]);
                setAnswers({});
                setPrompt("");
                setAttachment(null);
                setStatus(null);
              }}
            >
              <ArrowClockwise size={16} weight="bold" />
              {text.reset}
            </button>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          {text.quickActions.map((item) => (
            <button
              key={item}
              type="button"
              className="rounded-full border border-zinc-200 bg-white px-3 py-1.5 text-xs font-semibold text-zinc-600 transition hover:border-zinc-300 hover:text-zinc-900"
              onClick={() => setPrompt(item)}
            >
              {item}
            </button>
          ))}
        </div>

        <div className="grid gap-4 lg:grid-cols-[1fr_auto] lg:items-end">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-[0.14em] text-zinc-400">{text.promptLabel}</label>
            <textarea
              rows={4}
              value={prompt}
              onChange={(event) => setPrompt(event.target.value)}
              placeholder={text.promptPlaceholder}
              className="mt-2 w-full rounded-[1.35rem] border border-zinc-200 bg-white px-4 py-4 text-sm text-zinc-900 outline-none transition placeholder:text-zinc-400 focus:border-zinc-500 focus:ring-4 focus:ring-zinc-100"
            />
          </div>

          <div className="flex gap-2">
            <button
              type="button"
              className="inline-flex h-12 items-center gap-2 rounded-full border border-zinc-300 bg-white px-4 text-sm font-semibold text-zinc-700 transition hover:border-zinc-400 hover:bg-zinc-50"
              onClick={() => setPrompt("")}
            >
              <X size={16} weight="bold" />
              {text.clear}
            </button>
            <button
              type="button"
              className="inline-flex h-12 items-center gap-2 rounded-full border border-zinc-900 bg-zinc-900 px-5 text-sm font-semibold text-white transition hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-60"
              onClick={() => void handleAnalyze()}
              disabled={isThinking || isApplying}
            >
              <PaperPlaneRight size={16} weight="bold" />
              {isThinking ? text.thinking : text.send}
            </button>
          </div>
        </div>

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

        {attachment ? (
          <div className="overflow-hidden rounded-[1.35rem] border border-zinc-200 bg-white">
            <div className="flex items-center justify-between gap-3 border-b border-zinc-100 px-4 py-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-zinc-400">{text.attached}</p>
                <p className="mt-1 text-sm font-medium text-zinc-900">{attachment.name}</p>
              </div>
              <button
                type="button"
                className="inline-flex h-9 items-center gap-2 rounded-full border border-zinc-200 bg-white px-3 text-sm font-semibold text-zinc-600 transition hover:border-zinc-300"
                onClick={() => setAttachment(null)}
              >
                <X size={14} weight="bold" />
                {text.clear}
              </button>
            </div>
            <div className="grid gap-4 p-4 lg:grid-cols-[220px_1fr]">
              <img src={attachment.dataUrl} alt={attachment.name} className="h-44 w-full rounded-[1rem] object-cover lg:h-36" />
              <div className="flex items-start">
                <p className="max-w-xl text-sm leading-7 text-zinc-600">{text.uploadHint}</p>
              </div>
            </div>
          </div>
        ) : (
          <div className="rounded-[1.35rem] border border-dashed border-zinc-200 bg-white p-4 text-sm leading-7 text-zinc-500">
            {text.uploadHint}
          </div>
        )}

        {status ? (
          <div
            className={cx(
              "inline-flex items-center gap-2 rounded-full border px-3 py-2 text-sm font-medium",
              status.tone === "success"
                ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                : status.tone === "error"
                  ? "border-rose-200 bg-rose-50 text-rose-700"
                  : "border-zinc-200 bg-zinc-50 text-zinc-600",
            )}
          >
            {status.tone === "success" ? <CheckCircle size={16} weight="fill" /> : null}
            {status.message}
          </div>
        ) : null}

        <div className="grid gap-4 md:grid-cols-2">
          <div className="rounded-[1.35rem] border border-zinc-200 bg-white p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-zinc-400">{text.historyTitle}</p>
            <div className="mt-3 space-y-3">
              {history.length ? history.map((item, index) => (
                <div key={`${item.role}-${index}`} className={cx("rounded-2xl px-3 py-2 text-sm leading-6", item.role === "user" ? "bg-zinc-900 text-white" : "bg-zinc-100 text-zinc-800")}>
                  {item.text}
                </div>
              )) : <p className="text-sm leading-7 text-zinc-500">{text.noPlan}</p>}
            </div>
          </div>

          <div className="rounded-[1.35rem] border border-zinc-200 bg-white p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-zinc-400">{text.questionsTitle}</p>
            <div className="mt-3 space-y-4">
              {questionCount ? plan?.questions.map((question) => (
                <div key={question.key} className="rounded-[1.2rem] border border-zinc-200 bg-zinc-50 p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-sm font-semibold text-zinc-900">{question.label}</p>
                      <p className="mt-1 text-sm leading-6 text-zinc-600">{question.question}</p>
                    </div>
                    <span className="rounded-full border border-zinc-200 bg-white px-2.5 py-1 text-[0.65rem] font-semibold uppercase tracking-[0.14em] text-zinc-500">
                      {question.type}
                    </span>
                  </div>
                  <div className="mt-3">
                    {renderQuestionInput(question, answers[question.key] ?? "", (value) => {
                      setAnswers((current) => ({ ...current, [question.key]: value }));
                    }, locale)}
                  </div>
                  {question.helper ? <p className="mt-2 text-xs leading-6 text-zinc-500">{question.helper}</p> : null}
                </div>
              )) : <p className="text-sm leading-7 text-zinc-500">{text.noPlan}</p>}
            </div>
          </div>
        </div>
      </div>

      <div className="space-y-6">
        <ActionPreview plan={plan ?? { mode: "clarify", title: text.title, summary: text.noPlan, reply: text.noPlan, intent: "idle", confidence: 0, needsMoreContext: true, questions: [], action: null, preview: null, suggestedReplies: [] }} locale={locale} />

        <div className="rounded-[1.6rem] border border-zinc-200 bg-white p-5 shadow-[0_14px_40px_rgba(0,0,0,0.04)]">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-zinc-400">{text.examples[0] ? text.promptLabel : text.title}</p>
          <div className="mt-3 space-y-3">
            {text.examples.map((item) => (
              <button
                key={item}
                type="button"
                className="block w-full rounded-2xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-left text-sm leading-6 text-zinc-700 transition hover:border-zinc-300 hover:bg-white"
                onClick={() => setPrompt(item)}
              >
                {item}
              </button>
            ))}
          </div>

          <button
            type="button"
            className="mt-4 inline-flex h-11 w-full items-center justify-center gap-2 rounded-full border border-zinc-900 bg-zinc-900 px-4 text-sm font-semibold text-white transition hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-60"
            onClick={() => void handleApply()}
            disabled={!canApply || isApplying}
          >
            {isApplying ? text.thinking : text.apply}
          </button>
        </div>
      </div>
    </div>
  );
}
