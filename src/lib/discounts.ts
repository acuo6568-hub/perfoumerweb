import type {
  Perfume,
  PerfumeDiscount,
  PerfumeDiscountDeadline,
  PerfumeDiscountScope,
  PerfumeSize,
} from "@/types/catalog";

type ResolvedPerfumePrice = {
  originalPrice: number;
  finalPrice: number;
  savingsAmount: number;
  savingsPercent: number;
  discount: PerfumeDiscount | null;
};

const roundPrice = (value: number) => Math.round(value * 100) / 100;

const parseNumber = (value: unknown) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

export function toDateInputValue(date = new Date()) {
  return date.toISOString().slice(0, 10);
}

export function addDiscountDuration(
  amount: number,
  unit: "days" | "weeks" | "months",
  start = new Date(),
) {
  const normalizedAmount = Math.max(1, Math.floor(amount));
  const next = new Date(start);

  if (unit === "months") {
    next.setMonth(next.getMonth() + normalizedAmount);
  } else {
    next.setDate(next.getDate() + normalizedAmount * (unit === "weeks" ? 7 : 1));
  }

  return toDateInputValue(next);
}

function normalizeScope(value: unknown): PerfumeDiscountScope | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  const scope = value as {
    kind?: unknown;
    ml?: unknown;
    mls?: unknown;
  };

  const kind = typeof scope.kind === "string" ? scope.kind.trim() : "";
  if (kind === "all") {
    return { kind: "all" };
  }

  if (kind === "size") {
    const ml = parseNumber(scope.ml);
    return ml !== null ? { kind: "size", ml } : null;
  }

  if (kind === "custom") {
    const mls = Array.isArray(scope.mls)
      ? scope.mls
          .map((item) => parseNumber(item))
          .filter((item): item is number => item !== null)
      : [];

    return mls.length ? { kind: "custom", mls: Array.from(new Set(mls)).sort((a, b) => a - b) } : null;
  }

  return null;
}

function normalizeDeadline(value: unknown): PerfumeDiscountDeadline | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  const deadline = value as {
    kind?: unknown;
    endsOn?: unknown;
    unit?: unknown;
    amount?: unknown;
    startsOn?: unknown;
  };

  const kind = typeof deadline.kind === "string" ? deadline.kind.trim() : "";
  if (kind === "none") {
    return { kind: "none" };
  }

  if (kind === "endOfMonth") {
    return { kind: "endOfMonth" };
  }

  if (kind === "date") {
    const endsOn = typeof deadline.endsOn === "string" ? deadline.endsOn.trim() : "";
    return endsOn ? { kind: "date", endsOn } : null;
  }

  if (kind === "duration") {
    const unitRaw = typeof deadline.unit === "string" ? deadline.unit.trim() : "";
    const unit =
      unitRaw === "weeks" || unitRaw === "months" || unitRaw === "days" ? unitRaw : null;
    const amount = parseNumber(deadline.amount);
    const startsOn =
      typeof deadline.startsOn === "string" && deadline.startsOn.trim()
        ? deadline.startsOn.trim()
        : toDateInputValue();
    const endsOn = typeof deadline.endsOn === "string" ? deadline.endsOn.trim() : "";

    if (!unit || amount === null) {
      return null;
    }

    return {
      kind: "duration",
      unit,
      amount: Math.max(1, Math.floor(amount)),
      startsOn,
      endsOn: endsOn || addDiscountDuration(amount, unit, new Date(`${startsOn}T00:00:00`)),
    };
  }

  return null;
}

export function normalizePerfumeDiscount(value: unknown): PerfumeDiscount | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  const discount = value as {
    enabled?: unknown;
    mode?: unknown;
    value?: unknown;
    scope?: unknown;
    deadline?: unknown;
    showDeadline?: unknown;
  };

  const mode = typeof discount.mode === "string" ? discount.mode.trim() : "";
  const numericValue = parseNumber(discount.value);
  const scope = normalizeScope(discount.scope);
  const deadline = normalizeDeadline(discount.deadline);

  if ((mode !== "percent" && mode !== "fixed") || numericValue === null || !scope || !deadline) {
    return null;
  }

  return {
    enabled: Boolean(discount.enabled),
    mode,
    value: mode === "percent" ? Math.min(95, Math.max(0, numericValue)) : Math.max(0, numericValue),
    scope,
    deadline,
    showDeadline: Boolean(discount.showDeadline),
  };
}

export function getDiscountDeadlineEndDate(
  discount: PerfumeDiscount | null | undefined,
  now = new Date(),
) {
  if (!discount?.enabled || discount.deadline.kind === "none") {
    return null;
  }

  if (discount.deadline.kind === "endOfMonth") {
    return new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
  }

  const endDate = new Date(`${discount.deadline.endsOn}T23:59:59.999`);
  return Number.isFinite(endDate.getTime()) ? endDate : null;
}

export function isDiscountActive(discount: PerfumeDiscount | null | undefined, now = new Date()) {
  if (!discount?.enabled) {
    return false;
  }

  if (discount.deadline.kind === "none") {
    return true;
  }

  const endDate = getDiscountDeadlineEndDate(discount, now);
  return endDate !== null && now.getTime() <= endDate.getTime();
}

export function discountAppliesToSize(discount: PerfumeDiscount | null | undefined, size: PerfumeSize) {
  if (!discount) {
    return false;
  }

  if (discount.scope.kind === "all") {
    return true;
  }

  if (discount.scope.kind === "size") {
    return discount.scope.ml === size.ml;
  }

  return discount.scope.mls.includes(size.ml);
}

export function getDiscountedPrice(basePrice: number, discount: PerfumeDiscount | null | undefined) {
  if (!discount || basePrice <= 0) {
    return basePrice;
  }

  if (discount.mode === "percent") {
    const percent = Math.min(95, Math.max(0, discount.value));
    return roundPrice(basePrice * (1 - percent / 100));
  }

  return roundPrice(Math.max(0, Math.min(basePrice, discount.value)));
}

export function resolveDiscountedSizePrice(
  size: PerfumeSize,
  discount: PerfumeDiscount | null | undefined,
  now = new Date(),
) {
  const activeDiscount = isDiscountActive(discount, now) && discountAppliesToSize(discount, size) ? discount ?? null : null;
  const originalPrice = roundPrice(size.price);
  const finalPrice = activeDiscount ? getDiscountedPrice(originalPrice, activeDiscount) : originalPrice;
  const savingsAmount = roundPrice(Math.max(0, originalPrice - finalPrice));
  const savingsPercent = originalPrice > 0 ? roundPrice((savingsAmount / originalPrice) * 100) : 0;

  return {
    originalPrice,
    finalPrice,
    savingsAmount,
    savingsPercent,
    discount: activeDiscount,
  };
}

export function resolvePerfumeSizePrice(
  perfume: Perfume,
  size: PerfumeSize,
  now = new Date(),
): ResolvedPerfumePrice {
  const resolved = resolveDiscountedSizePrice(size, perfume.discount, now);

  return {
    ...resolved,
  };
}

export function formatDiscountBadgePercent(savingsPercent: number) {
  if (!Number.isFinite(savingsPercent) || savingsPercent <= 0) {
    return null;
  }

  const rounded = Math.round(savingsPercent);
  return `-${rounded}%`;
}

export function formatDiscountDeadlineLabel(
  discount: PerfumeDiscount | null | undefined,
  locale: "az" | "en" | "ru" = "az",
  now = new Date(),
) {
  if (!discount?.showDeadline || !isDiscountActive(discount, now)) {
    return null;
  }

  const endDate = getDiscountDeadlineEndDate(discount, now);
  if (!endDate) {
    return null;
  }

  if (discount.deadline.kind === "endOfMonth") {
    if (locale === "en") return "Discount until the end of this month";
    if (locale === "ru") return "Скидка до конца месяца";
    return "Endirim ayın sonuna kimidir";
  }

  const formatted = new Intl.DateTimeFormat(
    locale === "az" ? "az-AZ" : locale === "ru" ? "ru-RU" : "en-US",
    { day: "numeric", month: "long", year: "numeric" },
  ).format(endDate);

  if (locale === "en") return `Discount until ${formatted}`;
  if (locale === "ru") return `Скидка до ${formatted}`;
  return `Endirim ${formatted} tarixinə kimidir`;
}

export function resolvePerfumeCardPrice(perfume: Perfume, now = new Date()) {
  const resolvedSizes = perfume.sizes.map((size) => ({
    size,
    ...resolvePerfumeSizePrice(perfume, size, now),
  }));

  const originalPrice = resolvedSizes.length
    ? Math.min(...resolvedSizes.map((item) => item.originalPrice))
    : Number.POSITIVE_INFINITY;
  const discountedSizes = resolvedSizes.filter((item) => item.discount && item.finalPrice < item.originalPrice);
  const finalPrice = discountedSizes.length
    ? Math.min(...discountedSizes.map((item) => item.finalPrice))
    : originalPrice;
  const bestDiscountItem = discountedSizes.sort((left, right) => right.savingsPercent - left.savingsPercent)[0] ?? null;
  const bestDiscount = bestDiscountItem?.discount ?? null;

  return {
    originalPrice: Number.isFinite(originalPrice) ? originalPrice : null,
    finalPrice: Number.isFinite(finalPrice) ? finalPrice : null,
    hasActiveDiscount: Boolean(bestDiscount),
    bestDiscount,
    bestSavingsPercent: bestDiscountItem?.savingsPercent ?? null,
    hasVisibleSavings:
      Number.isFinite(originalPrice) && Number.isFinite(finalPrice) && finalPrice < originalPrice,
  };
}
