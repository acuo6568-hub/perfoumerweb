export type SitePromotionMode = "manual" | "discount";

export type SitePromotionSettings = {
  enabled: boolean;
  mode: SitePromotionMode;
  text: string;
  linkHref: string;
  linkLabel: string;
  backgroundColor: string;
  textColor: string;
  speed: number;
  closable: boolean;
  sourcePerfumeSlug: string;
};

function normalizeString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function normalizeHexColor(value: unknown, fallback: string) {
  const normalized = normalizeString(value);
  return /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(normalized) ? normalized : fallback;
}

function normalizeSpeed(value: unknown, fallback: number) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    return fallback;
  }

  return Math.min(120, Math.max(8, Math.round(parsed)));
}

export const DEFAULT_PROMOTION_SETTINGS: SitePromotionSettings = {
  enabled: false,
  mode: "manual",
  text: "Limited-time offers are live now.",
  linkHref: "",
  linkLabel: "View offer",
  backgroundColor: "#111111",
  textColor: "#ffffff",
  speed: 28,
  closable: true,
  sourcePerfumeSlug: "",
};

export function normalizePromotionSettings(value: unknown): SitePromotionSettings {
  const settings = (value && typeof value === "object" ? value : {}) as {
    enabled?: unknown;
    mode?: unknown;
    text?: unknown;
    linkHref?: unknown;
    linkLabel?: unknown;
    backgroundColor?: unknown;
    textColor?: unknown;
    speed?: unknown;
    closable?: unknown;
    sourcePerfumeSlug?: unknown;
  };

  const mode = normalizeString(settings.mode) === "discount" ? "discount" : "manual";

  return {
    enabled: Boolean(settings.enabled),
    mode,
    text: normalizeString(settings.text) || DEFAULT_PROMOTION_SETTINGS.text,
    linkHref: normalizeString(settings.linkHref),
    linkLabel: normalizeString(settings.linkLabel) || DEFAULT_PROMOTION_SETTINGS.linkLabel,
    backgroundColor: normalizeHexColor(settings.backgroundColor, DEFAULT_PROMOTION_SETTINGS.backgroundColor),
    textColor: normalizeHexColor(settings.textColor, DEFAULT_PROMOTION_SETTINGS.textColor),
    speed: normalizeSpeed(settings.speed, DEFAULT_PROMOTION_SETTINGS.speed),
    closable: Boolean(settings.closable ?? DEFAULT_PROMOTION_SETTINGS.closable),
    sourcePerfumeSlug: normalizeString(settings.sourcePerfumeSlug).toLowerCase(),
  };
}

export function buildPromotionStorageKey(settings: SitePromotionSettings) {
  return [
    settings.mode,
    settings.enabled ? "1" : "0",
    settings.text,
    settings.linkHref,
    settings.linkLabel,
    settings.sourcePerfumeSlug,
    settings.backgroundColor,
    settings.textColor,
    String(settings.speed),
  ].join("|");
}
