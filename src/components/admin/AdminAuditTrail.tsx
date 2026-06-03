"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ArrowsClockwise,
  CheckCircle,
  ClockCounterClockwise,
  Database,
  FunnelSimple,
  MagnifyingGlass,
  NotePencil,
  UserCircle,
  WarningCircle,
} from "@/components/admin/lucide-admin-icons";

type AdminLocale = "az" | "en";

type AdminAuditChange = {
  path: string;
  before: string;
  after: string;
};

type AdminAuditEntry = {
  id: string;
  createdAt: string;
  actor: string;
  action: string;
  section: string;
  targetType: string;
  targetId: string;
  targetLabel: string;
  summary: string;
  changes: AdminAuditChange[];
  metadata?: Record<string, string | number | boolean>;
  ip?: string;
  userAgent?: string;
};

const copy = {
  az: {
    title: "Audit",
    eyebrow: "Admin dəyişiklikləri",
    description: "Admin paneldə kim nəyi dəyişib, sadə şəkildə görün.",
    refresh: "Yenilə",
    loading: "Audit log yüklənir...",
    empty: "Hələ audit qeydi yoxdur.",
    search: "Audit loglarında axtar...",
    allSections: "Bütün bölmələr",
    actor: "İcra edən",
    target: "Hədəf",
    changes: "Dəyişikliklər",
    before: "Əvvəl",
    after: "Sonra",
    latest: "Son dəyişikliklər",
    selected: "Nə dəyişdi",
    total: "Cəmi qeydlər",
    today: "Bu gün",
    dataSaves: "Saxlamalar",
    from: "Köhnə",
    to: "Yeni",
    changedBy: "Dəyişən",
    changedAt: "Vaxt",
    item: "Növ",
    singleChange: "1 dəyişiklik",
    manyChanges: "{count} dəyişiklik",
    noSelection: "Detalları görmək üçün audit qeydi seçin.",
    error: "Audit log yüklənmədi.",
  },
  en: {
    title: "Audit",
    eyebrow: "Admin changes",
    description: "See who changed what in the admin panel, in simple words.",
    refresh: "Refresh",
    loading: "Loading audit log...",
    empty: "No audit entries yet.",
    search: "Search audit log...",
    allSections: "All sections",
    actor: "Actor",
    target: "Target",
    changes: "Changes",
    before: "Before",
    after: "After",
    latest: "Latest changes",
    selected: "What changed",
    total: "Total entries",
    today: "Today",
    dataSaves: "Saves",
    from: "Old",
    to: "New",
    changedBy: "Changed by",
    changedAt: "Time",
    item: "Type",
    singleChange: "1 change",
    manyChanges: "{count} changes",
    noSelection: "Select an audit entry to inspect the details.",
    error: "Audit log could not be loaded.",
  },
} satisfies Record<AdminLocale, Record<string, string>>;

function cx(...values: Array<string | false | null | undefined>) {
  return values.filter(Boolean).join(" ");
}

function formatDateTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString();
}

const actionLabels: Record<AdminLocale, Record<string, string>> = {
  az: {
    admin_data_save: "Saxlandı",
    admin_csv_import_perfumes: "Ətirlər import edildi",
    admin_csv_import_notes: "Notlar import edildi",
    admin_image_upload: "Şəkil yükləndi",
    admin_remove_background: "Fon silindi",
    admin_newsletter_send: "Newsletter göndərildi",
    admin_user_delete: "İstifadəçi silindi",
    admin_assistant_execute: "AI köməkçisi",
  },
  en: {
    admin_data_save: "Saved",
    admin_csv_import_perfumes: "Imported perfumes",
    admin_csv_import_notes: "Imported notes",
    admin_image_upload: "Uploaded image",
    admin_remove_background: "Removed background",
    admin_newsletter_send: "Sent newsletter",
    admin_user_delete: "Deleted user",
    admin_assistant_execute: "AI assistant",
  },
};

const sectionLabels: Record<AdminLocale, Record<string, string>> = {
  az: {
    perfumes: "Ətirlər",
    notes: "Notlar",
    settings: "Sayt ayarları",
    newsletter: "Newsletter",
    users: "İstifadəçilər",
    perfume: "Ətir",
    note: "Not",
    images: "Şəkillər",
    uploads: "Yükləmələr",
  },
  en: {
    perfumes: "Perfumes",
    notes: "Notes",
    settings: "Site settings",
    newsletter: "Newsletter",
    users: "Users",
    perfume: "Perfume",
    note: "Note",
    images: "Images",
    uploads: "Uploads",
  },
};

const targetTypeLabels: Record<AdminLocale, Record<string, string>> = {
  az: {
    site_settings: "Sayt ayarları",
    perfume: "Ətir",
    note: "Not",
    image: "Şəkil",
    campaign: "Newsletter kampaniyası",
    user: "İstifadəçi",
    settings: "Sayt ayarları",
  },
  en: {
    site_settings: "Site settings",
    perfume: "Perfume",
    note: "Note",
    image: "Image",
    campaign: "Newsletter campaign",
    user: "User",
    settings: "Site settings",
  },
};

const fieldLabels: Record<AdminLocale, Record<string, string>> = {
  az: {
    name: "Ad",
    brand: "Brend",
    gender: "Cins",
    image: "Şəkil",
    imageAlt: "Şəkil alt mətni",
    stockStatus: "Stok statusu",
    inStock: "Mövcudluq",
    externalLink: "Xarici link",
    slug: "Slug",
    sourcePerfumeSlug: "Promosiya ətri",
    sourcePerfumeSlugs: "Promosiya ətirləri",
    enabled: "Status",
    mode: "Rejim",
    text: "Mətn",
    closable: "Bağlana bilər",
    "Home header mode": "Ana səhifə başlığı rejimi",
    "User is deleted": "Silinmə statusu",
    "User deleted at": "Silinmə vaxtı",
  },
  en: {
    name: "Name",
    brand: "Brand",
    gender: "Gender",
    image: "Image",
    imageAlt: "Image alt text",
    stockStatus: "Stock status",
    inStock: "Availability",
    externalLink: "External link",
    slug: "Slug",
    sourcePerfumeSlug: "Promotion perfume",
    sourcePerfumeSlugs: "Promotion perfumes",
    enabled: "Status",
    mode: "Mode",
    text: "Text",
    closable: "Can be closed",
    "Home header mode": "Home header mode",
    "User is deleted": "Deleted status",
    "User deleted at": "Deleted time",
  },
};

const valueLabels: Record<AdminLocale, Record<string, string>> = {
  az: {
    video: "Video",
    rotating: "Dönən şəkillər",
    true: "Bəli",
    false: "Xeyr",
    null: "Boş",
    "(empty)": "Boş",
  },
  en: {
    video: "Video",
    rotating: "Rotating images",
    true: "Yes",
    false: "No",
    null: "Empty",
    "(empty)": "Empty",
  },
};

function actionLabel(action: string, locale: AdminLocale) {
  const translated = actionLabels[locale][action];
  if (translated) return translated;

  return action
    .replace(/^admin_/, "")
    .replace(/_/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function shortValue(value: string, locale: AdminLocale) {
  const translated = valueLabels[locale][value] ?? value;
  return translated.length > 180 ? `${translated.slice(0, 177)}...` : translated;
}

function labelFromWords(value: string) {
  return value.replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function sectionLabel(section: string, locale: AdminLocale) {
  return sectionLabels[locale][section] ?? labelFromWords(section.replace(/[._-]+/g, " "));
}

function targetTypeLabel(targetType: string, locale: AdminLocale) {
  return targetTypeLabels[locale][targetType] ?? labelFromWords(targetType.replace(/[._-]+/g, " "));
}

function targetLabel(entry: AdminAuditEntry, locale: AdminLocale) {
  if (entry.targetType === "site_settings" || entry.targetId === "site-settings") {
    return targetTypeLabel("site_settings", locale);
  }

  return entry.targetLabel || entry.targetId || targetTypeLabel(entry.targetType, locale);
}

function fieldLabel(pathValue: string, locale: AdminLocale) {
  const normalized = pathValue
    .replace(/^site\.?/, "")
    .replace(/^settings\.?/, "")
    .replace(/^promotions\.?/, "Promotion ")
    .replace(/^homeHeader\.?/, "Home header ")
    .replace(/^user_metadata\.?/, "User ")
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/[._-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  const direct = fieldLabels[locale][pathValue] || fieldLabels[locale][normalized];
  if (direct) return direct;

  return normalized
    ? labelFromWords(normalized)
    : "Value";
}

function changeSentence(change: AdminAuditChange, locale: AdminLocale) {
  const label = fieldLabel(change.path, locale);
  return locale === "az" ? `${label} dəyişdirildi` : `${label} was changed`;
}

function changeCountLabel(count: number, text: Record<string, string>) {
  return count === 1 ? text.singleChange : text.manyChanges.replace("{count}", String(count));
}

function sameDay(value: string, date: Date) {
  const parsed = new Date(value);
  return (
    Number.isFinite(parsed.getTime()) &&
    parsed.getFullYear() === date.getFullYear() &&
    parsed.getMonth() === date.getMonth() &&
    parsed.getDate() === date.getDate()
  );
}

function actionTone(action: string) {
  if (action.includes("delete") || action.includes("removed")) {
    return {
      badge: "border-rose-100 bg-rose-50 text-rose-700",
      icon: "border-rose-100 bg-rose-50 text-rose-700",
    };
  }
  if (action.includes("upload") || action.includes("newsletter")) {
    return {
      badge: "border-emerald-100 bg-emerald-50 text-emerald-700",
      icon: "border-emerald-100 bg-emerald-50 text-emerald-700",
    };
  }
  if (action.includes("assistant")) {
    return {
      badge: "border-cyan-100 bg-cyan-50 text-cyan-700",
      icon: "border-cyan-100 bg-cyan-50 text-cyan-700",
    };
  }
  return {
    badge: "border-indigo-100 bg-indigo-50 text-indigo-700",
    icon: "border-indigo-100 bg-indigo-50 text-indigo-700",
  };
}

function MetricCard({
  label,
  value,
  icon,
  tone = "zinc",
}: {
  label: string;
  value: string | number;
  icon: React.ReactNode;
  tone?: "zinc" | "emerald" | "indigo" | "amber";
}) {
  const toneClass = {
    zinc: "border-zinc-200 bg-white text-zinc-600",
    emerald: "border-emerald-100 bg-emerald-50 text-emerald-700",
    indigo: "border-indigo-100 bg-indigo-50 text-indigo-700",
    amber: "border-amber-100 bg-amber-50 text-amber-700",
  };

  return (
    <div className="rounded-[20px] border border-zinc-200 bg-white p-4 shadow-[0_12px_32px_rgba(15,23,42,0.045)]">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-xs font-medium text-zinc-500">{label}</p>
          <p className="mt-2 text-xl font-semibold tracking-[-0.04em] text-zinc-950">{value}</p>
        </div>
        <span className={cx("inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-[14px] border", toneClass[tone])}>
          {icon}
        </span>
      </div>
    </div>
  );
}

export function AdminAuditTrail({ locale = "en" }: { locale?: AdminLocale }) {
  const text = copy[locale];
  const [entries, setEntries] = useState<AdminAuditEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [section, setSection] = useState("all");
  const [selectedEntryId, setSelectedEntryId] = useState<string | null>(null);

  const fetchAudit = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/admin/audit?limit=500", { cache: "no-store" });
      const data = (await response.json()) as { entries?: AdminAuditEntry[]; error?: string };

      if (!response.ok) {
        throw new Error(data.error || text.error);
      }

      setEntries(data.entries ?? []);
      setSelectedEntryId((current) => current ?? data.entries?.[0]?.id ?? null);
    } catch (err) {
      setError(err instanceof Error ? err.message : text.error);
    } finally {
      setIsLoading(false);
    }
  }, [text.error]);

  useEffect(() => {
    void fetchAudit();
  }, [fetchAudit]);

  const sections = useMemo(
    () => Array.from(new Set(entries.map((entry) => entry.section).filter(Boolean))).sort(),
    [entries],
  );

  const filteredEntries = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    return entries.filter((entry) => {
      if (section !== "all" && entry.section !== section) return false;
      if (!normalizedQuery) return true;

      const haystack = [
        entry.actor,
        entry.action,
        entry.section,
        entry.targetType,
        entry.targetId,
        entry.targetLabel,
        entry.summary,
        ...entry.changes.flatMap((change) => [change.path, change.before, change.after]),
      ].join(" ").toLowerCase();

      return haystack.includes(normalizedQuery);
    });
  }, [entries, query, section]);

  const selectedEntry = useMemo(
    () =>
      filteredEntries.find((entry) => entry.id === selectedEntryId) ||
      filteredEntries[0] ||
      null,
    [filteredEntries, selectedEntryId],
  );
  const totalChanges = useMemo(
    () => entries.reduce((total, entry) => total + entry.changes.length, 0),
    [entries],
  );
  const todayEntries = useMemo(() => {
    const today = new Date();
    return entries.filter((entry) => sameDay(entry.createdAt, today)).length;
  }, [entries]);
  const dataSaveEntries = useMemo(
    () => entries.filter((entry) => entry.action.includes("data_save") || entry.action.includes("csv_import")).length,
    [entries],
  );

  return (
    <div className="space-y-6">
      <div className="rounded-[28px] border border-zinc-200 bg-[linear-gradient(180deg,#FFFFFF_0%,#F7F7F5_100%)] p-5 shadow-[0_18px_50px_rgba(15,23,42,0.055)] sm:p-6">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-zinc-200 bg-white px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.14em] text-zinc-500 shadow-sm">
              <ClockCounterClockwise size={14} weight="bold" />
              {text.eyebrow}
            </div>
            <h2 className="mt-4 font-serif text-[2rem] font-semibold tracking-[-0.05em] text-zinc-950 sm:text-[2.4rem]">
              {text.title}
            </h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-zinc-500">{text.description}</p>
          </div>

          <button
            type="button"
            className="inline-flex h-11 items-center justify-center gap-2 rounded-full border border-zinc-200 bg-white px-4 text-sm font-semibold text-zinc-700 shadow-sm transition hover:-translate-y-0.5 hover:border-zinc-300 hover:bg-zinc-50 disabled:translate-y-0 disabled:opacity-60"
            onClick={() => void fetchAudit()}
            disabled={isLoading}
          >
            <ArrowsClockwise size={16} weight="bold" />
            {text.refresh}
          </button>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard label={text.total} value={entries.length} icon={<Database size={18} weight="bold" />} tone="indigo" />
        <MetricCard label={text.today} value={todayEntries} icon={<ClockCounterClockwise size={18} weight="bold" />} />
        <MetricCard label={text.changes} value={totalChanges} icon={<NotePencil size={18} weight="bold" />} tone="emerald" />
        <MetricCard label={text.dataSaves} value={dataSaveEntries} icon={<CheckCircle size={18} weight="bold" />} tone="amber" />
      </div>

      {error ? (
        <div className="rounded-[18px] border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700">
          {error}
        </div>
      ) : null}

      <div className="grid gap-5 xl:grid-cols-[390px_minmax(0,1fr)]">
        <div className="self-start rounded-[28px] border border-zinc-200 bg-white p-4 shadow-[0_18px_48px_rgba(15,23,42,0.05)]">
          <div className="rounded-[22px] border border-zinc-200 bg-[linear-gradient(180deg,#FFFFFF_0%,#FAFAFB_100%)] p-3 shadow-sm">
            <label className="relative block">
              <span className="sr-only">{text.search}</span>
              <MagnifyingGlass size={16} weight="bold" className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400" />
              <input
                className="h-12 w-full rounded-[16px] border border-zinc-200 bg-white px-4 pl-11 text-sm text-zinc-900 outline-none transition placeholder:text-zinc-400 focus:border-zinc-400 focus:ring-4 focus:ring-zinc-100"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder={text.search}
              />
            </label>

            <label className="relative mt-3 block">
              <span className="sr-only">{text.allSections}</span>
              <FunnelSimple size={16} weight="bold" className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400" />
              <select
                className="h-11 w-full appearance-none rounded-[15px] border border-zinc-200 bg-white px-4 pl-11 text-sm font-semibold text-zinc-700 outline-none transition focus:border-zinc-400 focus:ring-4 focus:ring-zinc-100"
                value={section}
                onChange={(event) => setSection(event.target.value)}
              >
                <option value="all">{text.allSections}</option>
                {sections.map((item) => (
                  <option key={item} value={item}>{sectionLabel(item, locale)}</option>
                ))}
              </select>
            </label>
          </div>

          <div className="mt-5">
            <div className="flex items-center justify-between px-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-zinc-400">
              <span>{text.latest}</span>
              <span className="rounded-full border border-zinc-200 bg-white px-2 py-0.5 text-[10px] text-zinc-500">{filteredEntries.length}</span>
            </div>

            <div className="mt-3 flex max-h-[min(62vh,43rem)] flex-col gap-2 overflow-y-auto pr-2">
              {isLoading ? (
                <div className="rounded-[18px] border border-zinc-200 bg-zinc-50 px-4 py-7 text-center text-sm font-medium text-zinc-500">
                  {text.loading}
                </div>
              ) : null}

              {!isLoading && filteredEntries.length === 0 ? (
                <div className="rounded-[18px] border border-zinc-200 bg-zinc-50 px-4 py-7 text-center text-sm font-medium text-zinc-500">
                  {text.empty}
                </div>
              ) : null}

              {filteredEntries.map((entry) => {
                const tone = actionTone(entry.action);
                const selected = selectedEntry?.id === entry.id;

                return (
                  <button
                    key={entry.id}
                    type="button"
                    onClick={() => setSelectedEntryId(entry.id)}
                    className={cx(
                      "group w-full rounded-[18px] border p-3 text-left transition duration-200",
                      selected
                        ? "border-zinc-950 bg-zinc-950 text-white shadow-[0_18px_34px_rgba(15,23,42,0.14)]"
                        : "border-zinc-200 bg-white shadow-sm hover:-translate-y-0.5 hover:border-zinc-300 hover:shadow-[0_14px_28px_rgba(15,23,42,0.06)]",
                    )}
                  >
                    <div className="flex items-start gap-3">
                      <span className={cx("inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-[14px] border", selected ? "border-white/15 bg-white/10 text-white" : tone.icon)}>
                        <ClockCounterClockwise size={17} weight="bold" />
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-2">
                          <span className={cx("truncate text-xs font-semibold", selected ? "text-white" : "text-zinc-950")}>{actionLabel(entry.action, locale)}</span>
                          <span className={cx("shrink-0 rounded-full px-2 py-1 text-[10px] font-semibold", selected ? "bg-white/10 text-white" : tone.badge)}>
                            {changeCountLabel(entry.changes.length, text)}
                          </span>
                        </div>
                        <p className={cx("mt-1 truncate text-sm font-semibold", selected ? "text-white" : "text-zinc-950")}>
                          {targetLabel(entry, locale)}
                        </p>
                        <p className={cx("mt-1 line-clamp-2 text-xs leading-5", selected ? "text-white/65" : "text-zinc-500")}>
                          {entry.changes[0] ? changeSentence(entry.changes[0], locale) : entry.summary}
                        </p>
                        <div className={cx("mt-2 flex flex-wrap items-center gap-1.5 text-[11px]", selected ? "text-white/55" : "text-zinc-400")}>
                          <span>{entry.actor}</span>
                          <span className={cx("h-1 w-1 rounded-full", selected ? "bg-white/30" : "bg-zinc-300")} />
                          <span>{formatDateTime(entry.createdAt)}</span>
                        </div>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        <div className="rounded-[28px] border border-zinc-200 bg-white p-5 shadow-[0_22px_58px_rgba(15,23,42,0.065)]">
          {selectedEntry ? (
            <article className="space-y-5">
              <div className="rounded-[24px] border border-zinc-200 bg-[linear-gradient(180deg,#FFFFFF_0%,#FAFAFB_100%)] p-4">
                <div className="flex flex-wrap items-center gap-2">
                  <span className={cx("rounded-full border px-2.5 py-1 text-[11px] font-semibold", actionTone(selectedEntry.action).badge)}>
                    {actionLabel(selectedEntry.action, locale)}
                  </span>
                  <span className="rounded-full border border-zinc-200 bg-white px-2.5 py-1 text-[11px] font-semibold text-zinc-600">
                    {sectionLabel(selectedEntry.section, locale)}
                  </span>
                  <span className="rounded-full border border-zinc-200 bg-white px-2.5 py-1 text-[11px] font-semibold text-zinc-600">
                    {formatDateTime(selectedEntry.createdAt)}
                  </span>
                </div>
                <p className="mt-4 text-xs font-semibold uppercase tracking-[0.16em] text-zinc-400">{text.selected}</p>
                <h3 className="mt-2 font-serif text-3xl font-semibold tracking-[-0.05em] text-zinc-950">
                  {targetLabel(selectedEntry, locale)}
                </h3>
                <p className="mt-2 text-sm leading-6 text-zinc-500">
                  {actionLabel(selectedEntry.action, locale)} · {changeCountLabel(selectedEntry.changes.length, text)}
                </p>
              </div>

              <div className="grid gap-3 md:grid-cols-3">
                <div className="rounded-[18px] border border-zinc-200 bg-zinc-50/80 p-3">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-zinc-400">{text.changedBy}</p>
                  <p className="mt-2 truncate text-sm font-semibold text-zinc-900">{selectedEntry.actor}</p>
                </div>
                <div className="rounded-[18px] border border-zinc-200 bg-zinc-50/80 p-3">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-zinc-400">{text.item}</p>
                  <p className="mt-2 truncate text-sm font-semibold text-zinc-900">{targetTypeLabel(selectedEntry.targetType, locale)}</p>
                </div>
                <div className="rounded-[18px] border border-zinc-200 bg-zinc-50/80 p-3">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-zinc-400">{text.changedAt}</p>
                  <p className="mt-2 truncate text-sm font-semibold text-zinc-900">{formatDateTime(selectedEntry.createdAt)}</p>
                </div>
              </div>

              {selectedEntry.changes.length ? (
                <div className="space-y-3">
                  {selectedEntry.changes.map((change, index) => (
                    <div
                      key={`${selectedEntry.id}-${change.path}-${index}`}
                      className="rounded-[20px] border border-zinc-200 bg-white p-4 shadow-[0_12px_28px_rgba(15,23,42,0.035)]"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <p className="text-sm font-semibold text-zinc-950">{changeSentence(change, locale)}</p>
                        <span className="rounded-full border border-zinc-200 bg-zinc-50 px-2.5 py-1 text-[11px] font-semibold text-zinc-500">
                          {fieldLabel(change.path, locale)}
                        </span>
                      </div>
                      <div className="mt-3 grid gap-3 md:grid-cols-2">
                        <div className="rounded-[16px] border border-zinc-200 bg-zinc-50 px-3 py-3">
                          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-zinc-400">{text.from}</p>
                          <p className="mt-2 break-words text-sm font-medium text-zinc-600">{shortValue(change.before, locale)}</p>
                        </div>
                        <div className="rounded-[16px] border border-emerald-100 bg-emerald-50 px-3 py-3">
                          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-emerald-500">{text.to}</p>
                          <p className="mt-2 break-words text-sm font-semibold text-emerald-900">{shortValue(change.after, locale)}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="rounded-[20px] border border-zinc-200 bg-zinc-50 px-4 py-6 text-center text-sm font-medium text-zinc-500">
                  {text.empty}
                </div>
              )}

            </article>
          ) : (
            <div className="flex min-h-[24rem] flex-col items-center justify-center rounded-[24px] border border-dashed border-zinc-300 bg-zinc-50/70 px-6 text-center">
              <WarningCircle size={32} weight="bold" className="text-zinc-300" />
              <p className="mt-3 text-sm font-semibold text-zinc-700">{text.noSelection}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
