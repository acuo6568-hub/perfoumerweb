import { NextResponse } from "next/server";
import { cookies } from "next/headers";

import { getAdminData } from "@/lib/admin-data";
import { ADMIN_SESSION_COOKIE, isAdminConfigured, validateAdminSessionToken } from "@/lib/admin-auth";
import type { Perfume } from "@/types/catalog";

type AssistantLocale = "az" | "en" | "ru";

type AssistantRequest = {
  prompt?: string;
  locale?: AssistantLocale;
  history?: Array<{ role: "user" | "assistant"; text: string }>;
  answers?: Record<string, string>;
  imageDataUrl?: string;
  imageName?: string;
  imageMimeType?: string;
};

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

function normalizeText(value: unknown, fallback = "", maxLength = 1200) {
  if (typeof value !== "string") return fallback;
  const trimmed = value.trim();
  if (!trimmed) return fallback;
  return trimmed.slice(0, maxLength);
}

function sanitizeDataUrl(value: unknown, maxLength = 4_000_000): string {
  if (typeof value !== "string") return "";
  const trimmed = value.trim();
  if (!/^data:image\/(png|jpe?g|webp|gif);base64,/i.test(trimmed)) return "";
  return trimmed.slice(0, maxLength);
}

function sanitizeAnswers(value: unknown) {
  if (!value || typeof value !== "object") return {} as Record<string, string>;

  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>).map(([key, item]) => [key, normalizeText(item, "", 300)]),
  ) as Record<string, string>;
}

function sanitizeHistory(value: unknown) {
  if (!Array.isArray(value)) return [] as Array<{ role: "user" | "assistant"; text: string }>;

  return value
    .map((entry) => {
      if (!entry || typeof entry !== "object") return null;
      const raw = entry as Record<string, unknown>;
      const role = raw.role === "assistant" ? "assistant" : raw.role === "user" ? "user" : null;
      const text = normalizeText(raw.text, "", 500);
      if (!role || !text) return null;
      return { role, text };
    })
    .filter((entry): entry is { role: "user" | "assistant"; text: string } => entry !== null)
    .slice(-8);
}

function normalizeSlug(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9а-яөүşıəğç.-]+/gi, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

function scorePerfume(prompt: string, perfume: Perfume) {
  const haystack = `${perfume.slug} ${perfume.name} ${perfume.brand}`.toLowerCase();
  const tokens = prompt
    .toLowerCase()
    .split(/[^a-z0-9а-яөүşıəğç]+/i)
    .map((item) => item.trim())
    .filter(Boolean)
    .filter((item) => item.length > 2);

  let score = 0;
  if (prompt.toLowerCase().includes(perfume.slug.toLowerCase())) score += 20;
  if (prompt.toLowerCase().includes(perfume.name.toLowerCase())) score += 14;
  if (prompt.toLowerCase().includes(perfume.brand.toLowerCase())) score += 10;

  for (const token of tokens) {
    if (haystack.includes(token)) {
      score += 2;
    }
  }

  return score;
}

function buildPerfumeCandidates(prompt: string, perfumes: Perfume[]) {
  const scored = perfumes
    .map((perfume) => ({ perfume, score: scorePerfume(prompt, perfume) }))
    .filter((item) => item.score > 0)
    .sort((left, right) => right.score - left.score)
    .slice(0, 12)
    .map(({ perfume }) => ({
      slug: perfume.slug,
      name: perfume.name,
      brand: perfume.brand,
      gender: perfume.gender,
      image: perfume.image,
      sizes: perfume.sizes.slice(0, 3).map((size) => ({ ml: size.ml, price: size.price })),
      hasDiscount: Boolean(perfume.discount?.enabled),
    }));

  return scored.length
    ? scored
    : perfumes.slice(0, 8).map((perfume) => ({
        slug: perfume.slug,
        name: perfume.name,
        brand: perfume.brand,
        gender: perfume.gender,
        image: perfume.image,
        sizes: perfume.sizes.slice(0, 3).map((size) => ({ ml: size.ml, price: size.price })),
        hasDiscount: Boolean(perfume.discount?.enabled),
      }));
}

  function buildCatalogCountPlan(count: number): AssistantPlan {
    return {
      mode: "ready",
      title: "Catalog count",
      summary: `You currently have ${count} perfumes in the catalog.`,
      reply: `We currently have ${count} perfumes in total.`,
      intent: "catalog_count",
      confidence: 1,
      needsMoreContext: false,
      questions: [],
      action: null,
      preview: {
        kind: "product",
        title: "Catalog count",
        description: `There are ${count} perfumes in the current catalog.`,
        meta: [{ label: "Perfumes", value: String(count) }],
      },
      suggestedReplies: ["How many notes do we have?", "Show me the top brands"],
    };
  }

  function buildBannerTogglePlan(enabled: boolean): AssistantPlan {
    return {
      mode: "ready",
      title: enabled ? "Promo banner on" : "Promo banner off",
      summary: enabled ? "Prepare to turn the promo banner on." : "Prepare to turn the promo banner off.",
      reply: enabled ? "I can switch the promo banner on right away." : "I can switch the promo banner off right away.",
      intent: "toggle_promo_banner",
      confidence: 1,
      needsMoreContext: false,
      questions: [],
      action: { type: "toggle_promo_banner", payload: { enabled } },
      preview: {
        kind: "banner",
        title: enabled ? "Promo banner on" : "Promo banner off",
        description: enabled ? "Banner visibility will be enabled." : "Banner visibility will be disabled.",
      },
      suggestedReplies: enabled ? ["Turn it off", "Update the banner copy"] : ["Turn it on", "Update the banner copy"],
    };
  }

  function inferActionFromIntent(intent: string): AssistantAction | null {
    if (intent === "toggle_promo_banner") {
      return { type: "toggle_promo_banner", payload: {} };
    }

    if (intent === "update_promo_copy") {
      return { type: "update_promo_copy", payload: {} };
    }

    if (intent === "set_perfume_discount") {
      return { type: "set_perfume_discount", payload: {} };
    }

    if (intent === "bulk_update_prices") {
      return { type: "bulk_update_prices", payload: {} };
    }

    if (intent === "create_perfume_draft") {
      return { type: "create_perfume_draft", payload: {} };
    }

    if (intent === "update_home_header") {
      return { type: "update_home_header", payload: {} };
    }

    return null;
  }

function buildSystemPrompt(locale: AssistantLocale) {
  const language = locale === "az" ? "Azerbaijani" : locale === "ru" ? "Russian" : "English";

  return [
    `You are a high-end admin command assistant for a perfume e-commerce panel. Reply in ${language}.`,
    "Your job is to turn natural-language admin requests into structured plans.",
    "Support these actions only: set_perfume_discount, bulk_update_prices, toggle_promo_banner, update_promo_copy, create_perfume_draft, update_home_header.",
    "If the user did not provide enough context, ask concise follow-up questions and do not invent missing values.",
    "If the user provided enough information, produce one executable action and mark the plan as ready.",
    "When a photo is attached, analyze it for perfume packaging / vibe / likely draft details, but do not claim facts you cannot verify.",
    "Return strict JSON with keys: mode, title, summary, reply, intent, confidence, needsMoreContext, questions, action, preview, suggestedReplies.",
    "questions must be an array of objects with: key, label, question, type, placeholder, helper, required, options, uiHint.",
    "type can be text, textarea, number, select, or toggle.",
    "action must be null when missing context. When ready, action needs type and payload.",
    "preview should describe the main thing being changed, such as a product card, banner, perfume draft, or header copy.",
  ].join(" ");
}

function buildFallbackPlan(prompt: string, candidates: ReturnType<typeof buildPerfumeCandidates>): AssistantPlan {
  const lower = prompt.toLowerCase();
  const isBanner = /promo|banner|announcement|promo banner/.test(lower);
  const isDiscount = /discount|sale|promo|endirim/.test(lower);
  const isPerfume = /perfume|ətir|fragrance|new product|new perfume/.test(lower);
  const isHeader = /header|hero|top banner|home header/.test(lower);

  if (isBanner && /off|disable|hide|turn off/.test(lower)) {
    return {
      mode: "ready",
      title: "Promo banner",
      summary: "Prepare to turn the site promo banner off.",
      reply: "I can switch the promo banner off right away.",
      intent: "toggle_promo_banner",
      confidence: 0.75,
      needsMoreContext: false,
      questions: [],
      action: { type: "toggle_promo_banner", payload: { enabled: false } },
      preview: { kind: "banner", title: "Promo banner", description: "Banner visibility will be disabled." },
      suggestedReplies: ["Turn it on", "Update the banner copy"],
    };
  }

  if (isBanner && /on|enable|show|turn on/.test(lower)) {
    return {
      mode: "ready",
      title: "Promo banner",
      summary: "Prepare to turn the site promo banner on.",
      reply: "I can switch the promo banner on right away.",
      intent: "toggle_promo_banner",
      confidence: 0.75,
      needsMoreContext: false,
      questions: [],
      action: { type: "toggle_promo_banner", payload: { enabled: true } },
      preview: { kind: "banner", title: "Promo banner", description: "Banner visibility will be enabled." },
      suggestedReplies: ["Turn it off", "Update the banner copy"],
    };
  }

  if (isBanner) {
    return {
      mode: "clarify",
      title: "Promo banner",
      summary: "Banner changes need a short confirmation.",
      reply: "I can update the promo banner, but I need the text or the on/off state first.",
      intent: "update_promo_copy",
      confidence: 0.62,
      needsMoreContext: true,
      questions: [
        {
          key: "enabled",
          label: "Banner state",
          question: "Should the banner be on or off?",
          type: "toggle",
          required: true,
          uiHint: "banner",
        },
        {
          key: "text",
          label: "Banner text",
          question: "What should the banner say?",
          type: "textarea",
          placeholder: "Example: 20% off selected perfumes for 48 hours.",
          uiHint: "banner",
        },
      ],
      action: { type: "toggle_promo_banner", payload: {} },
      preview: { kind: "banner", title: "Promo banner", description: "Waiting for the final banner text or state." },
      suggestedReplies: ["Turn off the banner", "Make a 20% off announcement"],
    };
  }

  if (isPerfume && isDiscount) {
    return {
      mode: "clarify",
      title: "Product discount",
      summary: "I found a discount request, but the product or amount is missing.",
      reply: `I can set a discount. Please choose the product and the discount details. I found ${candidates.length} possible products.`,
      intent: "set_perfume_discount",
      confidence: 0.64,
      needsMoreContext: true,
      questions: [
        {
          key: "targetSlug",
          label: "Product",
          question: "Which perfume should get the discount?",
          type: candidates.length ? "select" : "text",
          options: candidates.map((item) => `${item.brand} ${item.name} (${item.slug})`),
          placeholder: "Product name or slug",
          required: true,
          uiHint: "product",
        },
        {
          key: "mode",
          label: "Discount type",
          question: "Do you want a percent discount or a fixed amount?",
          type: "select",
          options: ["percent", "fixed"],
          required: true,
          uiHint: "product",
        },
        {
          key: "value",
          label: "Discount value",
          question: "How big should the discount be?",
          type: "number",
          placeholder: "20",
          required: true,
          uiHint: "product",
        },
      ],
      action: { type: "set_perfume_discount", payload: {} },
      preview: candidates[0]
        ? {
            kind: "product",
            title: `${candidates[0].brand} ${candidates[0].name}`.trim(),
            description: "This is the best match from the current catalog.",
            imageUrl: candidates[0].image || undefined,
            meta: [
              { label: "Slug", value: candidates[0].slug },
              { label: "Gender", value: candidates[0].gender },
            ],
          }
        : null,
      suggestedReplies: ["Set a 20% discount", "Use a fixed discount instead"],
    };
  }

  if (isPerfume && /price|prices|increase|decrease|raise|lower|adjust/.test(lower)) {
    return {
      mode: "clarify",
      title: "Bulk pricing",
      summary: "I can change prices for one perfume or a whole group, but I need the target and change rule.",
      reply: `I can update one product or a group of products. I found ${candidates.length} likely matches, but I need the exact rule before applying it.`,
      intent: "bulk_update_prices",
      confidence: 0.67,
      needsMoreContext: true,
      questions: [
        {
          key: "scope",
          label: "Scope",
          question: "Should I update one product, a brand, or all matching perfumes?",
          type: "select",
          options: ["single", "brand", "matched"],
          required: true,
          uiHint: "product",
        },
        {
          key: "target",
          label: "Target",
          question: "Which product or brand should I use?",
          type: candidates.length ? "select" : "text",
          options: candidates.map((item) => `${item.brand} ${item.name} (${item.slug})`),
          placeholder: "Product name, slug, or brand",
          required: true,
          uiHint: "product",
        },
        {
          key: "changeMode",
          label: "Change mode",
          question: "Do you want to set a new price or change it by a percentage?",
          type: "select",
          options: ["set_price", "percent_up", "percent_down"],
          required: true,
          uiHint: "product",
        },
        {
          key: "value",
          label: "Value",
          question: "What is the number for that change?",
          type: "number",
          placeholder: "20",
          required: true,
          uiHint: "product",
        },
      ],
      action: { type: "bulk_update_prices", payload: {} },
      preview: candidates[0]
        ? {
            kind: "product",
            title: `${candidates[0].brand} ${candidates[0].name}`.trim(),
            description: "This is the closest product preview for the price update.",
            imageUrl: candidates[0].image || undefined,
            meta: [{ label: "Slug", value: candidates[0].slug }],
          }
        : null,
      suggestedReplies: ["Set the price to 49", "خفض الأسعار by 10%", "Raise all products from this brand by 5%"],
    };
  }

  if (isPerfume && /new|create|draft|add/.test(lower)) {
    return {
      mode: "clarify",
      title: "New perfume draft",
      summary: "I can create a perfume draft, but I need the product details first.",
      reply: "Send me the perfume details and I will prepare a draft card for you.",
      intent: "create_perfume_draft",
      confidence: 0.66,
      needsMoreContext: true,
      questions: [
        { key: "name", label: "Name", question: "What is the perfume name?", type: "text", placeholder: "Example: Amber Night", required: true, uiHint: "perfume" },
        { key: "brand", label: "Brand", question: "Which brand should it belong to?", type: "text", placeholder: "Example: Perfoumer", required: true, uiHint: "perfume" },
        { key: "price", label: "Price", question: "What is the price for the draft?", type: "number", placeholder: "45", required: true, uiHint: "perfume" },
        { key: "gender", label: "Gender", question: "Who is it for?", type: "select", options: ["Men", "Women", "Unisex"], required: true, uiHint: "perfume" },
      ],
      action: { type: "create_perfume_draft", payload: {} },
      preview: { kind: "perfume", title: "New perfume draft", description: "Waiting for the draft details." },
      suggestedReplies: ["Use this photo and make a draft", "Create a unisex perfume"],
    };
  }

  if (isHeader) {
    return {
      mode: "clarify",
      title: "Home header",
      summary: "I can rewrite the homepage hero, but I need the target content.",
      reply: "Tell me the hero text or the type of change you want, and I will prepare it.",
      intent: "update_home_header",
      confidence: 0.54,
      needsMoreContext: true,
      questions: [
        { key: "videoTitle", label: "Title", question: "What should the hero title say?", type: "text", placeholder: "Example: Discover your signature scent", required: true, uiHint: "header" },
        { key: "videoDescription", label: "Description", question: "What should the description say?", type: "textarea", placeholder: "Short supporting copy...", required: true, uiHint: "header" },
        { key: "videoCtaLabel", label: "CTA", question: "What should the CTA button say?", type: "text", placeholder: "Shop now", required: true, uiHint: "header" },
      ],
      action: { type: "update_home_header", payload: {} },
      preview: { kind: "header", title: "Homepage hero", description: "Waiting for the new hero copy." },
      suggestedReplies: ["Switch it to rotating perfumes", "Make the CTA say View collection"],
    };
  }

  return {
    mode: "clarify",
    title: "Admin command center",
    summary: "I need a bit more detail to know which admin action to prepare.",
    reply: "I can handle discounts, banners, new perfume drafts, and homepage copy. Tell me what you want to change.",
    intent: "general_help",
    confidence: 0.4,
    needsMoreContext: true,
    questions: [
      {
        key: "task",
        label: "Task",
        question: "What would you like me to change?",
        type: "textarea",
        placeholder: "Example: Set CHANEL No.5 to 15% off for 7 days",
        required: true,
        uiHint: "banner",
      },
    ],
    action: null,
    preview: null,
    suggestedReplies: ["Set a product discount", "Update product prices", "Turn off the promo banner", "Create a new perfume draft"],
  };
}

async function ensureAuthorized() {
  if (!isAdminConfigured()) {
    return NextResponse.json({ error: "Admin login is not configured. Set ADMIN_PASSWORD in env." }, { status: 500 });
  }

  const cookieStore = await cookies();
  const token = cookieStore.get(ADMIN_SESSION_COOKIE)?.value;
  if (!validateAdminSessionToken(token)) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  return null;
}

function safeJsonParse(value: string) {
  try {
    return JSON.parse(value) as Partial<AssistantPlan>;
  } catch {
    return null;
  }
}

export async function POST(request: Request) {
  const authError = await ensureAuthorized();
  if (authError) return authError;

  let body: AssistantRequest;
  try {
    body = (await request.json()) as AssistantRequest;
  } catch {
    return NextResponse.json({ error: "Invalid JSON payload." }, { status: 400 });
  }

  const prompt = normalizeText(body.prompt, "", 1500);
  const answers = sanitizeAnswers(body.answers);
  const history = sanitizeHistory(body.history);
  const imageDataUrl = sanitizeDataUrl(body.imageDataUrl, 2_500_000);
  const imageName = normalizeText(body.imageName, "", 120);
  const imageMimeType = normalizeText(body.imageMimeType, "", 80);
  const locale = body.locale === "ru" || body.locale === "az" ? body.locale : "en";

  if (!prompt && !imageDataUrl) {
    return NextResponse.json({ error: "Missing prompt." }, { status: 400 });
  }

  const { perfumes, settings } = await getAdminData();
  if (/\b(how many|count|total|number of)\b.*\b(perfumes?|fragrances?|products?)\b/i.test(prompt) || /\b(perfumes?|fragrances?|products?)\b.*\b(total|count|how many|number of)\b/i.test(prompt)) {
    return NextResponse.json(buildCatalogCountPlan(perfumes.length));
  }

  if (/\b(turn|switch|set)\b.*\b(off|disable|hide)\b.*\b(promo banner|banner)\b/i.test(prompt) || /\b(promo banner|banner)\b.*\b(off|disable|hide)\b/i.test(prompt)) {
    return NextResponse.json(buildBannerTogglePlan(false));
  }

  if (/\b(turn|switch|set)\b.*\b(on|enable|show)\b.*\b(promo banner|banner)\b/i.test(prompt) || /\b(promo banner|banner)\b.*\b(on|enable|show)\b/i.test(prompt)) {
    return NextResponse.json(buildBannerTogglePlan(true));
  }

  const candidates = buildPerfumeCandidates(`${prompt} ${Object.values(answers).join(" ")}`, perfumes);
  const apiKey = process.env.QOXUNU_OPENAI_API_KEY || process.env.OPENAI_API_KEY;

  if (!apiKey) {
    return NextResponse.json(buildFallbackPlan(prompt, candidates));
  }

  const model = process.env.OPENAI_MODEL || "gpt-4.1-mini";
  const catalogBrief = candidates.map((item) => ({
    slug: item.slug,
    name: item.name,
    brand: item.brand,
    gender: item.gender,
    hasImage: Boolean(item.image),
    hasDiscount: item.hasDiscount,
    sizes: item.sizes,
  }));

  const currentSettings = {
    promotions: {
      enabled: settings.promotions.enabled,
      mode: settings.promotions.mode,
      text: settings.promotions.text,
      linkLabel: settings.promotions.linkLabel,
      linkHref: settings.promotions.linkHref,
      backgroundMode: settings.promotions.backgroundMode,
      backgroundColor: settings.promotions.backgroundColor,
      gradientFrom: settings.promotions.gradientFrom,
      gradientTo: settings.promotions.gradientTo,
      textColor: settings.promotions.textColor,
      speed: settings.promotions.speed,
      closable: settings.promotions.closable,
    },
    homeHeader: {
      mode: settings.homeHeader.mode,
      videoTitle: settings.homeHeader.videoTitle,
      videoDescription: settings.homeHeader.videoDescription,
      videoCtaLabel: settings.homeHeader.videoCtaLabel,
      videoCtaHref: settings.homeHeader.videoCtaHref,
      rotationMode: settings.homeHeader.rotationMode,
      slidesCount: settings.homeHeader.slides.length,
    },
  };

  const promptPayload = {
    locale,
    prompt,
    answers,
    history,
    image: imageDataUrl ? { name: imageName, mimeType: imageMimeType } : null,
    catalogBrief,
    currentSettings,
  };

  const completionResponse = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${apiKey}`,
    },
    signal: AbortSignal.timeout(20_000),
    body: JSON.stringify({
      model,
      temperature: 0.25,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: buildSystemPrompt(locale) },
        imageDataUrl
          ? {
              role: "user",
              content: [
                { type: "text", text: JSON.stringify(promptPayload) },
                { type: "image_url", image_url: { url: imageDataUrl } },
              ],
            }
          : { role: "user", content: JSON.stringify(promptPayload) },
      ],
    }),
  }).catch(() => null);

  if (!completionResponse || !completionResponse.ok) {
    return NextResponse.json(buildFallbackPlan(prompt, candidates));
  }

  const completionJson = (await completionResponse.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };

  const parsed = safeJsonParse(completionJson.choices?.[0]?.message?.content ?? "{}");
  if (!parsed) {
    return NextResponse.json(buildFallbackPlan(prompt, candidates));
  }

  const questions = Array.isArray(parsed.questions)
    ? parsed.questions
        .map((item) => {
          if (!item || typeof item !== "object") return null;
          const raw = item as Record<string, unknown>;
          const type = raw.type === "textarea" || raw.type === "number" || raw.type === "select" || raw.type === "toggle" ? raw.type : "text";
          return {
            key: normalizeText(raw.key, "", 60) || `field-${Math.random().toString(36).slice(2, 8)}`,
            label: normalizeText(raw.label, "", 80) || "Field",
            question: normalizeText(raw.question, "", 240) || "What should I fill in?",
            type,
            placeholder: normalizeText(raw.placeholder, "", 120),
            helper: normalizeText(raw.helper, "", 160),
            required: Boolean(raw.required),
            options: Array.isArray(raw.options) ? raw.options.map((entry) => normalizeText(entry, "", 80)).filter(Boolean).slice(0, 8) : undefined,
            uiHint:
              raw.uiHint === "product" || raw.uiHint === "banner" || raw.uiHint === "perfume" || raw.uiHint === "header" || raw.uiHint === "image"
                ? raw.uiHint
                : undefined,
          };
        })
        .filter((item) => item !== null) as AssistantQuestion[]
    : [];

  const intent = normalizeText(parsed.intent, "general_help", 60) || "general_help";
  const action =
    parsed.action && typeof parsed.action === "object"
      ? (() => {
          const raw = parsed.action as Record<string, unknown>;
          const type =
            raw.type === "set_perfume_discount" ||
            raw.type === "toggle_promo_banner" ||
            raw.type === "update_promo_copy" ||
            raw.type === "create_perfume_draft" ||
            raw.type === "update_home_header"
              ? raw.type
              : null;

          if (!type) return null;

          return {
            type,
            payload: raw.payload && typeof raw.payload === "object" ? (raw.payload as Record<string, unknown>) : {},
          } satisfies AssistantAction;
        })()
      : null;

  const needsMoreContext = Boolean(parsed.needsMoreContext) || questions.length > 0 || !action?.type;

  const responsePayload: AssistantPlan = {
    mode: needsMoreContext ? "clarify" : "ready",
    title: normalizeText(parsed.title, "", 120) || (needsMoreContext ? "Need a few details" : "Ready to apply"),
    summary: normalizeText(parsed.summary, "", 260) || normalizeText(parsed.reply, "", 260),
    reply: normalizeText(parsed.reply, "", 400) || (needsMoreContext ? "I need a bit more context." : "I am ready to apply the change."),
    intent,
    confidence: Math.max(0, Math.min(1, Number(parsed.confidence) || 0.7)),
    needsMoreContext,
    questions,
    action: action ?? inferActionFromIntent(intent),
    preview:
      parsed.preview && typeof parsed.preview === "object"
        ? {
            kind:
              parsed.preview.kind === "product" ||
              parsed.preview.kind === "banner" ||
              parsed.preview.kind === "perfume" ||
              parsed.preview.kind === "header"
                ? parsed.preview.kind
                : "banner",
            title: normalizeText((parsed.preview as Record<string, unknown>).title, "", 140) || "Preview",
            description: normalizeText((parsed.preview as Record<string, unknown>).description, "", 280) || "",
            imageUrl: normalizeText((parsed.preview as Record<string, unknown>).imageUrl, "", 800) || undefined,
            meta: Array.isArray((parsed.preview as Record<string, unknown>).meta)
              ? ((parsed.preview as Record<string, unknown>).meta as Array<unknown>)
                  .map((entry) => {
                    if (!entry || typeof entry !== "object") return null;
                    const raw = entry as Record<string, unknown>;
                    const label = normalizeText(raw.label, "", 60);
                    const value = normalizeText(raw.value, "", 120);
                    if (!label || !value) return null;
                    return { label, value };
                  })
                  .filter((item): item is { label: string; value: string } => item !== null)
              : undefined,
          }
        : null,
    suggestedReplies: Array.isArray(parsed.suggestedReplies)
      ? parsed.suggestedReplies.map((item) => normalizeText(item, "", 90)).filter(Boolean).slice(0, 4)
      : [],
  };

  return NextResponse.json(responsePayload);
}
