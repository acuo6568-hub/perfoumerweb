import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { revalidatePath, revalidateTag } from "next/cache";

import { ADMIN_SESSION_COOKIE, isAdminConfigured, validateAdminSessionToken } from "@/lib/admin-auth";
import { getAdminData, saveAdminData } from "@/lib/admin-data";
import { normalizePerfumeDiscount } from "@/lib/discounts";
import type { Perfume } from "@/types/catalog";

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

type ExecuteRequest = {
  action?: AssistantAction;
  answers?: Record<string, unknown>;
  imageUrl?: string;
};

function normalizeText(value: unknown, fallback = "", maxLength = 200) {
  if (typeof value !== "string") return fallback;
  const trimmed = value.trim();
  if (!trimmed) return fallback;
  return trimmed.slice(0, maxLength);
}

function normalizeBoolean(value: unknown) {
  if (typeof value === "boolean") return value;
  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    if (["true", "1", "yes", "on", "enable", "enabled"].includes(normalized)) return true;
    if (["false", "0", "no", "off", "disable", "disabled"].includes(normalized)) return false;
  }
  return Boolean(value);
}

function normalizeSlug(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9а-яөүşıəğç.-]+/gi, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

function ensureAuthorized() {
  return (async () => {
    if (!isAdminConfigured()) {
      return NextResponse.json({ error: "Admin login is not configured. Set ADMIN_PASSWORD in env." }, { status: 500 });
    }

    const cookieStore = await cookies();
    const token = cookieStore.get(ADMIN_SESSION_COOKIE)?.value;
    if (!validateAdminSessionToken(token)) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }

    return null;
  })();
}

function defaultSizes(price: number) {
  return [
    { label: "15ML", ml: 15, price },
    { label: "30ML", ml: 30, price },
    { label: "50ML", ml: 50, price },
  ];
}

function uniqueSlug(slug: string, perfumes: Perfume[]) {
  const existing = new Set(perfumes.map((item) => item.slug));
  let current = slug || `perfume-${Date.now().toString(36)}`;
  let index = 1;

  while (existing.has(current)) {
    current = `${slug}-${index++}`;
  }

  return current;
}

function findPerfumeIndex(perfumes: Perfume[], rawSlug: string, rawName: string) {
  const parentheticalSlug = rawSlug.match(/\(([^)]+)\)/)?.[1] || rawName.match(/\(([^)]+)\)/)?.[1] || "";
  const slug = normalizeSlug(parentheticalSlug || rawSlug);
  const name = normalizeSlug(rawName || rawSlug);

  return perfumes.findIndex((item) => {
    if (slug && item.slug === slug) return true;
    const itemSlug = normalizeSlug(item.slug);
    const itemName = normalizeSlug(item.name);
    return Boolean(name && (itemSlug === name || itemName === name));
  });
}

function findPerfumeTargets(perfumes: Perfume[], payload: Record<string, unknown>) {
  const scope = typeof payload.scope === "string" ? payload.scope : "single";
  const target = normalizeText(payload.target, "", 120);
  const source = normalizeText(payload.sourcePerfumeSlug, "", 120);
  const normalizedTarget = normalizeSlug(target);
  const normalizedSource = normalizeSlug(source);

  if (scope === "brand" && normalizedTarget) {
    return perfumes.filter((item) => normalizeSlug(item.brand) === normalizedTarget);
  }

  if (scope === "matched") {
    return perfumes.filter((item) => {
      const haystack = `${item.slug} ${item.name} ${item.brand}`.toLowerCase();
      return Boolean(
        normalizedTarget && haystack.includes(normalizedTarget),
      ) || Boolean(normalizedSource && (item.slug === normalizedSource || normalizeSlug(item.name) === normalizedSource));
    });
  }

  const index = findPerfumeIndex(perfumes, normalizedTarget, target);
  return index >= 0 ? [perfumes[index]] : [];
}

async function applyAction(action: AssistantAction, imageUrl: string | undefined) {
  const data = await getAdminData();
  const perfumes = [...data.perfumes];
  const notes = [...data.notes];
  const settings = { ...data.settings };

  if (action.type === "set_perfume_discount") {
    const payload = action.payload as Record<string, unknown>;
    const updates = Array.isArray(payload.discountUpdates) ? payload.discountUpdates : [payload];
    let appliedCount = 0;

    for (const rawUpdate of updates) {
      if (!rawUpdate || typeof rawUpdate !== "object") continue;

      const update = rawUpdate as Record<string, unknown>;
      const targetSlug = normalizeText(
        update.targetSlug ?? update.perfumeSlug ?? update.productId ?? update.targetPerfume,
        "",
        120,
      );
      const targetName = normalizeText(update.targetName ?? update.targetPerfume, "", 120);
      const index = findPerfumeIndex(perfumes, targetSlug, targetName);

      if (index < 0) {
        if (payload.skipMissing) continue;
        throw new Error("target_perfume_not_found");
      }

      const discount = normalizePerfumeDiscount({
        enabled: Boolean(update.enabled ?? true),
        mode: update.mode === "fixed" ? "fixed" : "percent",
        value: Number(update.value) || 0,
        scope: update.scope ?? { kind: "all" },
        deadline: update.deadline ?? { kind: "none" },
        showDeadline: Boolean(update.showDeadline ?? true),
      });

      perfumes[index] = {
        ...perfumes[index],
        discount: discount ?? perfumes[index].discount,
      };
      appliedCount += 1;
    }

    if (!appliedCount) {
      throw new Error("target_perfume_not_found");
    }
  }

  if (action.type === "bulk_update_prices") {
    const payload = action.payload as Record<string, unknown>;
    const targets = findPerfumeTargets(perfumes, payload);
    if (!targets.length) {
      throw new Error("target_perfume_not_found");
    }

    const changeMode = payload.changeMode === "percent_up" || payload.changeMode === "percent_down" || payload.changeMode === "set_price"
      ? payload.changeMode
      : "set_price";
    const value = Number(payload.value);
    if (!Number.isFinite(value)) {
      throw new Error("invalid_price_value");
    }

    for (const target of targets) {
      const index = perfumes.findIndex((item) => item.slug === target.slug);
      if (index < 0) continue;

      const nextSizes = perfumes[index].sizes.map((size) => {
        if (changeMode === "set_price") {
          return { ...size, price: Math.max(0, value) };
        }

        const delta = size.price * (value / 100);
        const nextPrice = changeMode === "percent_up" ? size.price + delta : size.price - delta;
        return { ...size, price: Math.max(0, Math.round(nextPrice * 100) / 100) };
      });

      perfumes[index] = {
        ...perfumes[index],
        sizes: nextSizes,
      };
    }
  }

  if (action.type === "toggle_promo_banner") {
    settings.promotions.enabled = normalizeBoolean((action.payload as Record<string, unknown>).enabled);
  }

  if (action.type === "update_promo_copy") {
    const payload = action.payload as Record<string, unknown>;
    if (payload.enabled !== undefined) {
      settings.promotions.enabled = normalizeBoolean(payload.enabled);
    }

    if (typeof payload.text === "string") {
      settings.promotions.text = payload.text.trim();
      settings.promotions.textByLocale = {
        ...settings.promotions.textByLocale,
        az: payload.text.trim(),
        en: payload.text.trim(),
        ru: payload.text.trim(),
      };
    }

    if (typeof payload.linkLabel === "string") {
      settings.promotions.linkLabel = payload.linkLabel.trim();
      settings.promotions.linkLabelByLocale = {
        ...settings.promotions.linkLabelByLocale,
        az: payload.linkLabel.trim(),
        en: payload.linkLabel.trim(),
        ru: payload.linkLabel.trim(),
      };
    }

    if (typeof payload.linkHref === "string") {
      settings.promotions.linkHref = payload.linkHref.trim();
    }

    if (payload.mode === "discount" || payload.mode === "manual") {
      settings.promotions.mode = payload.mode;
    }

    if (typeof payload.backgroundMode === "string") {
      settings.promotions.backgroundMode = payload.backgroundMode === "gradient" ? "gradient" : "solid";
    }

    if (typeof payload.backgroundColor === "string") settings.promotions.backgroundColor = payload.backgroundColor.trim();
    if (typeof payload.gradientFrom === "string") settings.promotions.gradientFrom = payload.gradientFrom.trim();
    if (typeof payload.gradientTo === "string") settings.promotions.gradientTo = payload.gradientTo.trim();
    if (typeof payload.textColor === "string") settings.promotions.textColor = payload.textColor.trim();
    if (typeof payload.speed === "number" && Number.isFinite(payload.speed)) settings.promotions.speed = payload.speed;
    if (typeof payload.closable === "boolean") settings.promotions.closable = payload.closable;
    if (typeof payload.countdownEnabled === "boolean") settings.promotions.countdownEnabled = payload.countdownEnabled;
    if (typeof payload.scheduleStartAt === "string") settings.promotions.scheduleStartAt = payload.scheduleStartAt.trim();
    if (typeof payload.scheduleEndAt === "string") settings.promotions.scheduleEndAt = payload.scheduleEndAt.trim();
    if (typeof payload.mobileHeight === "number" && Number.isFinite(payload.mobileHeight)) settings.promotions.mobileHeight = payload.mobileHeight;
    if (typeof payload.mobileTextScale === "number" && Number.isFinite(payload.mobileTextScale)) settings.promotions.mobileTextScale = payload.mobileTextScale;
    if (typeof payload.mobilePaddingX === "number" && Number.isFinite(payload.mobilePaddingX)) settings.promotions.mobilePaddingX = payload.mobilePaddingX;
    if (typeof payload.sourcePerfumeSlug === "string") settings.promotions.sourcePerfumeSlug = normalizeSlug(payload.sourcePerfumeSlug);
    if (Array.isArray(payload.sourcePerfumeSlugs)) {
      settings.promotions.sourcePerfumeSlugs = payload.sourcePerfumeSlugs
        .map((item) => normalizeText(item, "", 120))
        .map((item) => normalizeSlug(item))
        .filter(Boolean);
    }
  }

  if (action.type === "update_home_header") {
    const payload = action.payload as Record<string, unknown>;
    if (payload.mode === "video" || payload.mode === "rotating") {
      settings.homeHeader.mode = payload.mode;
    }
    if (typeof payload.videoUrl === "string") settings.homeHeader.videoUrl = payload.videoUrl.trim();
    if (typeof payload.videoTitle === "string") settings.homeHeader.videoTitle = payload.videoTitle.trim();
    if (typeof payload.videoDescription === "string") settings.homeHeader.videoDescription = payload.videoDescription.trim();
    if (typeof payload.videoCtaLabel === "string") settings.homeHeader.videoCtaLabel = payload.videoCtaLabel.trim();
    if (typeof payload.videoCtaHref === "string") settings.homeHeader.videoCtaHref = payload.videoCtaHref.trim();
    if (payload.rotationMode === "random" || payload.rotationMode === "selected") {
      settings.homeHeader.rotationMode = payload.rotationMode;
    }
    if (Array.isArray(payload.slides)) {
      settings.homeHeader.slides = payload.slides
        .map((item) => {
          if (!item || typeof item !== "object") return null;
          const raw = item as Record<string, unknown>;
          const perfumeSlug = normalizeSlug(normalizeText(raw.perfumeSlug, "", 120));
          if (!perfumeSlug) return null;
          return {
            perfumeSlug,
            buttonLabel: normalizeText(raw.buttonLabel, "", 80) || perfumeSlug,
            description: normalizeText(raw.description, "", 180),
          };
        })
        .filter((item): item is { perfumeSlug: string; buttonLabel: string; description: string } => item !== null);
    }
  }

  if (action.type === "create_perfume_draft") {
    const payload = action.payload as Record<string, unknown>;
    const name = normalizeText(payload.name, "", 120) || "New perfume";
    const brand = normalizeText(payload.brand, "", 80);
    const slug = uniqueSlug(normalizeSlug(normalizeText(payload.slug, "", 120) || name), perfumes);
    const price = Number(payload.price);
    const sizes = Array.isArray(payload.sizes)
      ? payload.sizes
          .map((item) => {
            if (!item || typeof item !== "object") return null;
            const raw = item as Record<string, unknown>;
            const ml = Number(raw.ml);
            const sizePrice = Number(raw.price);
            if (!Number.isFinite(ml) || !Number.isFinite(sizePrice)) return null;
            return {
              label: normalizeText(raw.label, "", 20) || `${Math.round(ml)}ML`,
              ml: Math.round(ml),
              price: sizePrice,
            };
          })
          .filter((item): item is { label: string; ml: number; price: number } => item !== null)
      : Number.isFinite(price)
        ? defaultSizes(price)
        : defaultSizes(0);

    const draft = {
      id: slug,
      slug,
      name,
      brand,
      gender: normalizeText(payload.gender, "", 40) || "Unisex",
      image: typeof payload.imageUrl === "string" ? payload.imageUrl.trim() : imageUrl || "",
      imageAlt: normalizeText(payload.imageAlt, "", 160) || name,
      stockStatus: normalizeText(payload.stockStatus, "", 60) || "Available",
      inStock: typeof payload.inStock === "boolean" ? payload.inStock : true,
      externalLink: normalizeText(payload.externalLink, "", 240),
      sizes,
      discount: payload.discount ? normalizePerfumeDiscount(payload.discount) ?? undefined : undefined,
      noteSlugs: {
        top: Array.isArray(payload.topNotes) ? payload.topNotes.map((item) => normalizeSlug(normalizeText(item, "", 60))).filter(Boolean) : [],
        heart: Array.isArray(payload.heartNotes) ? payload.heartNotes.map((item) => normalizeSlug(normalizeText(item, "", 60))).filter(Boolean) : [],
        base: Array.isArray(payload.baseNotes) ? payload.baseNotes.map((item) => normalizeSlug(normalizeText(item, "", 60))).filter(Boolean) : [],
      },
    } satisfies Perfume;

    perfumes.unshift(draft);
  }

  const result = await saveAdminData({ perfumes, notes, settings });
  revalidateTag("catalog", { expire: 0 });
  revalidateTag("perfumes", { expire: 0 });
  revalidateTag("notes", { expire: 0 });
  revalidatePath("/", "layout");

  return NextResponse.json({
    ok: true,
    action: action.type,
    perfumes: result.perfumes,
    notes: result.notes,
    settings: result.settings,
  });
}

export async function POST(request: Request) {
  const authError = await ensureAuthorized();
  if (authError) return authError;

  let body: ExecuteRequest;
  try {
    body = (await request.json()) as ExecuteRequest;
  } catch {
    return NextResponse.json({ error: "Invalid JSON payload." }, { status: 400 });
  }

  if (!body.action || typeof body.action !== "object" || !body.action.type) {
    return NextResponse.json({ error: "Missing action." }, { status: 400 });
  }

  try {
    const mergedAction: AssistantAction = {
      ...body.action,
      payload: {
        ...body.action.payload,
        ...(body.answers ?? {}),
      },
    };
    const payload = await applyAction(mergedAction, typeof body.imageUrl === "string" ? body.imageUrl : undefined);
    return payload;
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to execute assistant action.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
