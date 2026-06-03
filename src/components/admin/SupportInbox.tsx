"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type ChangeEvent } from "react";
import Image from "next/image";
import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowUpRight,
  CheckCircle,
  Headset,
  ImageIcon,
  MessageSquareText,
  Paperclip,
  PencilLine,
  RefreshCw,
  UserCircle,
  X,
} from "lucide-react";

type AdminLocale = "az" | "en";
type SupportStatus = "new" | "waiting" | "active" | "closed";
type SupportAction = "reply" | "assign" | "close" | "reopen" | "note";

type SupportMessage = {
  id: string;
  conversation_id: string;
  sender_type: "user" | "admin" | "system" | "ai";
  sender_id: string | null;
  message: string;
  attachment_url: string | null;
  attachment_type: string | null;
  created_at: string;
  read_at: string | null;
};

type SupportThread = {
  id: string;
  user_id: string | null;
  guest_id: string | null;
  status: SupportStatus;
  assigned_admin_id: string | null;
  source_page: string;
  user_name: string | null;
  user_email: string | null;
  user_agent: string | null;
  device: string | null;
  browser: string | null;
  is_online: boolean;
  created_at: string;
  updated_at: string;
  last_message_at: string;
  closed_at: string | null;
  messages: SupportMessage[];
  latestMessage: SupportMessage | null;
  unreadCount: number;
};

type SupportResponse = {
  summary?: {
    total: number;
    unread: number;
    waitingCount: number;
    activeCount: number;
    closedCount: number;
  };
  conversations?: SupportThread[];
  thread?: SupportThread | null;
  error?: string;
};

type PendingAttachment = {
  dataUrl: string;
  fileName: string;
  mimeType: string;
};

const INTERNAL_NOTE_PREFIX = "[internal-note]";

const statusCopy: Record<SupportStatus, { az: string; en: string; className: string; dot: string }> = {
  new: { az: "Yeni", en: "New", className: "bg-violet-50 text-violet-700 ring-violet-100", dot: "bg-violet-500" },
  waiting: { az: "Gözləyir", en: "Waiting", className: "bg-amber-50 text-amber-700 ring-amber-100", dot: "bg-amber-500" },
  active: { az: "Aktiv", en: "Active", className: "bg-emerald-50 text-emerald-700 ring-emerald-100", dot: "bg-emerald-500" },
  closed: { az: "Bağlanıb", en: "Closed", className: "bg-zinc-100 text-zinc-600 ring-zinc-200", dot: "bg-zinc-400" },
};

function formatTime(value: string, locale: AdminLocale) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleTimeString(locale === "az" ? "az-AZ" : "en-US", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: locale === "en",
  });
}

function formatDateTime(value: string, locale: AdminLocale) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleString(locale === "az" ? "az-AZ" : "en-US", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: locale === "en",
  });
}

function getCustomerLabel(thread: SupportThread) {
  return thread.user_name || thread.user_email || (thread.guest_id ? `Guest #${thread.guest_id.slice(-4)}` : "Guest");
}

function truncate(value: string, max = 90) {
  return value.length > max ? `${value.slice(0, max - 3)}...` : value;
}

function isInternalNote(message: SupportMessage) {
  return message.sender_type === "system" && message.sender_id === "__internal_note";
}

function cleanInternalNote(value: string) {
  return value.startsWith(INTERNAL_NOTE_PREFIX) ? value.slice(INTERNAL_NOTE_PREFIX.length).trim() : value;
}

function messageStatus(message: SupportMessage, thread: SupportThread) {
  if (message.sender_type !== "admin") return null;
  if (message.read_at) return { mark: "✓✓", className: "text-indigo-600" };
  if (thread.status === "active") return { mark: "✓✓", className: "text-indigo-400" };
  return { mark: "✓", className: "text-zinc-400" };
}

async function readImageAsDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") resolve(reader.result);
      else reject(new Error("Unable to read image."));
    };
    reader.onerror = () => reject(reader.error || new Error("Unable to read image."));
    reader.readAsDataURL(file);
  });
}

function TypingDots({ label }: { label: string }) {
  return (
    <div className="flex w-fit items-center gap-2 rounded-full bg-zinc-100 px-3 py-2 text-xs text-zinc-500">
      <span>{label}</span>
      <span className="flex items-center gap-1">
        {[0, 1, 2].map((index) => (
          <span
            key={index}
            className="h-1.5 w-1.5 rounded-full bg-zinc-400 support-typing-dot"
            style={{ animationDelay: `${index * 120}ms` }}
          />
        ))}
      </span>
    </div>
  );
}

function StatCard({ label, value, accent }: { label: string; value: number; accent: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-[16px] border border-black/[0.06] bg-white p-4 shadow-[0_8px_32px_rgba(0,0,0,.05)]"
    >
      <div className={`mb-3 h-1 w-8 rounded-full ${accent}`} />
      <p className="text-xs font-medium text-zinc-500">{label}</p>
      <p className="mt-1 text-2xl font-semibold tracking-[-0.04em] text-zinc-950">{value}</p>
    </motion.div>
  );
}

export function SupportInbox({ locale }: { locale: AdminLocale }) {
  const [threads, setThreads] = useState<SupportThread[]>([]);
  const [selectedId, setSelectedId] = useState("");
  const [filter, setFilter] = useState<"all" | SupportStatus>("all");
  const [reply, setReply] = useState("");
  const [note, setNote] = useState("");
  const [pendingAttachment, setPendingAttachment] = useState<PendingAttachment | null>(null);
  const [toast, setToast] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [composerMode, setComposerMode] = useState<"reply" | "note">("reply");
  const previousUnreadRef = useRef(0);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const selectedThread = useMemo(
    () => threads.find((thread) => thread.id === selectedId) || threads[0] || null,
    [selectedId, threads],
  );

  const filteredThreads = useMemo(
    () => (filter === "all" ? threads : threads.filter((thread) => thread.status === filter)),
    [filter, threads],
  );

  const summary = useMemo(
    () => ({
      total: threads.length,
      unread: threads.reduce((sum, thread) => sum + thread.unreadCount, 0),
      waiting: threads.filter((thread) => thread.status === "waiting").length,
      active: threads.filter((thread) => thread.status === "active").length,
      closed: threads.filter((thread) => thread.status === "closed").length,
    }),
    [threads],
  );

  const loadThreads = useCallback(async (silent = false) => {
    if (!silent) setIsLoading(true);
    try {
      const response = await fetch("/api/admin/support", { cache: "no-store" });
      const data = (await response.json()) as SupportResponse;
      if (!response.ok) throw new Error(data.error || "Support inbox failed.");
      const nextThreads = data.conversations || [];
      const nextUnread = nextThreads.reduce((sum, thread) => sum + thread.unreadCount, 0);
      if (previousUnreadRef.current && nextUnread > previousUnreadRef.current) {
        setToast(locale === "az" ? "Yeni dəstək mesajı gəldi." : "New support message received.");
        window.setTimeout(() => setToast(""), 2600);
      }
      previousUnreadRef.current = nextUnread;
      setThreads(nextThreads);
      setSelectedId((current) => current || nextThreads[0]?.id || "");
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Support inbox failed.");
    } finally {
      setIsLoading(false);
    }
  }, [locale]);

  useEffect(() => {
    void loadThreads();
    const intervalId = window.setInterval(() => {
      void loadThreads(true);
    }, 4000);
    return () => window.clearInterval(intervalId);
  }, [loadThreads]);

  const submitAction = async (
    action: SupportAction,
    options: { message?: string; attachment?: PendingAttachment | null } = {},
  ) => {
    if (!selectedThread) return;
    setIsSending(true);
    setError("");

    try {
      const response = await fetch("/api/admin/support", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action,
          conversationId: selectedThread.id,
          message: options.message,
          attachmentDataUrl: options.attachment?.dataUrl,
          attachmentName: options.attachment?.fileName,
          attachmentMimeType: options.attachment?.mimeType,
        }),
      });
      const data = (await response.json()) as SupportResponse;
      if (!response.ok) throw new Error(data.error || "Support action failed.");
      if (data.thread) {
        setThreads((current) =>
          current
            .map((thread) => (thread.id === data.thread?.id ? data.thread : thread))
            .sort((left, right) => right.last_message_at.localeCompare(left.last_message_at)),
        );
        setSelectedId(data.thread.id);
      }
      setReply("");
      setNote("");
      setPendingAttachment(null);
      await loadThreads(true);
    } catch (actionError) {
      setError(actionError instanceof Error ? actionError.message : "Support action failed.");
    } finally {
      setIsSending(false);
    }
  };

  const handleFileChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    if (!["image/jpeg", "image/jpg", "image/png", "image/webp"].includes(file.type) || file.size > 5 * 1024 * 1024) {
      setError(locale === "az" ? "JPG, PNG və WebP, maksimum 5MB." : "JPG, PNG, WebP only, max 5MB.");
      return;
    }
    const dataUrl = await readImageAsDataUrl(file);
    setPendingAttachment({ dataUrl, fileName: file.name, mimeType: file.type });
  };

  const sendReply = () => {
    if ((!reply.trim() && !pendingAttachment) || isSending) return;
    void submitAction("reply", { message: reply.trim() || "Şəkil əlavə edildi", attachment: pendingAttachment });
  };

  const sendNote = () => {
    if (!note.trim() || isSending) return;
    void submitAction("note", { message: `${INTERNAL_NOTE_PREFIX} ${note.trim()}` });
  };

  const filters: Array<{ value: "all" | SupportStatus; label: string; count: number }> = [
    { value: "all", label: locale === "az" ? "Hamısı" : "All", count: summary.total },
    { value: "waiting", label: locale === "az" ? "Gözləyən" : "Waiting", count: summary.waiting },
    { value: "active", label: locale === "az" ? "Aktiv" : "Active", count: summary.active },
    { value: "closed", label: locale === "az" ? "Bağlanmış" : "Closed", count: summary.closed },
  ];

  const visibleMessages = selectedThread?.messages ?? [];
  const isOperatorTyping = selectedThread?.status === "active" && isSending;

  return (
    <section className="min-h-[calc(100dvh-120px)] rounded-[28px] bg-[#F8F8FA] p-4 text-zinc-950 sm:p-5">
      <AnimatePresence>
        {toast ? (
          <motion.div
            initial={{ opacity: 0, y: -10, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.98 }}
            className="fixed right-6 top-6 z-50 rounded-2xl border border-black/[0.06] bg-white px-4 py-3 text-sm font-medium text-zinc-900 shadow-[0_16px_48px_rgba(0,0,0,.10)]"
          >
            {toast}
          </motion.div>
        ) : null}
      </AnimatePresence>

      <div className="mb-5 flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-indigo-600">Support</p>
          <h2 className="mt-1 text-2xl font-semibold tracking-[-0.04em] text-zinc-950">
            {locale === "az" ? "Canlı dəstək söhbətləri" : "Human support conversations"}
          </h2>
          <p className="mt-1 text-sm text-zinc-500">
            {locale === "az" ? "Müştərilərə real vaxtda cavab verin və statusları göstərin." : "Reply to customers and manage support state in real time."}
          </p>
        </div>
        <button
          type="button"
          onClick={() => void loadThreads()}
          className="inline-flex h-10 items-center gap-2 rounded-xl border border-black/[0.06] bg-white px-3 text-sm font-medium text-zinc-700 shadow-[0_8px_32px_rgba(0,0,0,.05)] transition hover:-translate-y-0.5 hover:bg-zinc-50"
        >
          <RefreshCw size={16} strokeWidth={1.8} />
          {locale === "az" ? "Yenilə" : "Refresh"}
        </button>
      </div>

      <div className="mb-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label={locale === "az" ? "Total" : "Total"} value={summary.total} accent="bg-indigo-500" />
        <StatCard label={locale === "az" ? "Waiting" : "Waiting"} value={summary.waiting} accent="bg-amber-500" />
        <StatCard label={locale === "az" ? "Active" : "Active"} value={summary.active} accent="bg-emerald-500" />
        <StatCard label={locale === "az" ? "Closed" : "Closed"} value={summary.closed} accent="bg-zinc-400" />
      </div>

      {error ? (
        <div className="mb-4 rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      ) : null}

      <div className="grid min-h-[680px] overflow-hidden rounded-[24px] border border-black/[0.06] bg-white shadow-[0_8px_32px_rgba(0,0,0,.05)] lg:grid-cols-[340px_minmax(0,1fr)_300px]">
        <aside className="border-b border-black/[0.06] bg-white lg:border-b-0 lg:border-r">
          <div className="flex gap-2 overflow-x-auto border-b border-black/[0.06] px-3 py-3">
            {filters.map((item) => (
              <button
                key={item.value}
                type="button"
                onClick={() => setFilter(item.value)}
                className={[
                  "shrink-0 rounded-full px-3 py-1.5 text-xs font-medium transition",
                  filter === item.value ? "bg-indigo-50 text-indigo-700" : "bg-zinc-50 text-zinc-500 hover:bg-zinc-100",
                ].join(" ")}
              >
                {item.label} <span className="opacity-70">{item.count}</span>
              </button>
            ))}
          </div>

          <div className="max-h-[620px] overflow-y-auto p-2">
            {isLoading ? (
              <p className="p-4 text-sm text-zinc-400">{locale === "az" ? "Yüklənir..." : "Loading..."}</p>
            ) : filteredThreads.length === 0 ? (
              <p className="p-4 text-sm text-zinc-400">{locale === "az" ? "Söhbət yoxdur." : "No conversations."}</p>
            ) : (
              filteredThreads.map((thread, index) => {
                const selected = selectedThread?.id === thread.id;
                const status = statusCopy[thread.status];
                return (
                  <motion.button
                    key={thread.id}
                    type="button"
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: Math.min(index * 0.035, 0.2), type: "spring", stiffness: 260, damping: 24 }}
                    onClick={() => setSelectedId(thread.id)}
                    className={[
                      "mb-2 w-full rounded-[18px] border p-3 text-left transition",
                      selected
                        ? "border-indigo-100 bg-indigo-50/70 shadow-[0_8px_24px_rgba(79,70,229,.08)]"
                        : "border-transparent bg-white hover:border-black/[0.06] hover:bg-zinc-50",
                    ].join(" ")}
                  >
                    <div className="flex items-start gap-3">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-zinc-100 text-zinc-500">
                        <UserCircle size={22} strokeWidth={1.8} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-2">
                          <p className="truncate text-sm font-semibold text-zinc-950">{getCustomerLabel(thread)}</p>
                          <span className="text-[11px] text-zinc-400">{formatTime(thread.last_message_at, locale)}</span>
                        </div>
                        <p className="mt-1 line-clamp-2 text-xs leading-5 text-zinc-500">
                          {truncate(thread.latestMessage?.message || (locale === "az" ? "Yeni dəstək sorğusu" : "New support request"))}
                        </p>
                        <div className="mt-2 flex items-center gap-2">
                          <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ring-1 ${status.className}`}>
                            {status[locale]}
                          </span>
                          {thread.unreadCount ? (
                            <span className="rounded-full bg-indigo-600 px-2 py-0.5 text-[10px] font-semibold text-white">
                              {thread.unreadCount}
                            </span>
                          ) : null}
                        </div>
                      </div>
                    </div>
                  </motion.button>
                );
              })
            )}
          </div>
        </aside>

        <main className="flex min-h-[620px] flex-col border-b border-black/[0.06] bg-[#FCFCFD] lg:border-b-0 lg:border-r">
          {selectedThread ? (
            <>
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-black/[0.06] bg-white px-4 py-4">
                <div className="min-w-0">
                  <p className="truncate text-lg font-semibold tracking-[-0.03em] text-zinc-950">{getCustomerLabel(selectedThread)}</p>
                  <p className="mt-1 flex items-center gap-2 truncate text-xs text-zinc-500">
                    <span className={`h-1.5 w-1.5 rounded-full ${selectedThread.is_online ? "bg-emerald-500" : "bg-zinc-300"}`} />
                    {selectedThread.is_online
                      ? "Online"
                      : `${locale === "az" ? "Son görülmə" : "Last seen"} ${formatTime(selectedThread.updated_at, locale)}`}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button type="button" onClick={() => void submitAction("assign")} disabled={isSending} className="rounded-xl border border-black/[0.06] bg-white px-3 py-2 text-xs font-medium text-zinc-700 shadow-sm transition hover:bg-zinc-50 disabled:opacity-50">
                    {locale === "az" ? "Mənə təyin et" : "Assign to me"}
                  </button>
                  <button type="button" onClick={() => void submitAction("assign")} disabled={isSending} className="rounded-xl border border-black/[0.06] bg-white px-3 py-2 text-xs font-medium text-zinc-700 shadow-sm transition hover:bg-zinc-50 disabled:opacity-50">
                    {locale === "az" ? "Operatoru dəyiş" : "Change operator"}
                  </button>
                  <button type="button" onClick={() => void submitAction(selectedThread.status === "closed" ? "reopen" : "close")} disabled={isSending} className="rounded-xl bg-zinc-950 px-3 py-2 text-xs font-medium text-white shadow-sm transition hover:bg-zinc-800 disabled:opacity-50">
                    {selectedThread.status === "closed"
                      ? locale === "az" ? "Yenidən aç" : "Reopen"
                      : locale === "az" ? "Bağla" : "Close"}
                  </button>
                </div>
              </div>

              <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-4 py-5">
                <AnimatePresence>
                  {selectedThread.status === "active" ? (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.94, y: -4 }}
                      animate={{ opacity: 1, scale: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.94 }}
                      className="mx-auto flex w-fit items-center gap-2 rounded-full border border-emerald-100 bg-emerald-50 px-3 py-1 text-xs text-emerald-700"
                    >
                      ✨ {locale === "az" ? "Operator qoşuldu" : "Operator joined"}
                    </motion.div>
                  ) : null}
                </AnimatePresence>

                {visibleMessages.map((message) => {
                  const isAdmin = message.sender_type === "admin";
                  const isSystem = message.sender_type === "system" || message.sender_type === "ai";
                  const internal = isInternalNote(message);
                  const status = messageStatus(message, selectedThread);
                  return (
                    <motion.div
                      key={message.id}
                      initial={{ opacity: 0, y: 8, scale: 0.98 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      transition={{ type: "spring", stiffness: 280, damping: 26 }}
                      className={["flex", internal || isSystem ? "justify-center" : isAdmin ? "justify-end" : "justify-start"].join(" ")}
                    >
                      <div
                        className={[
                          "max-w-[82%] rounded-[18px] px-4 py-3 text-sm leading-6 shadow-sm",
                          internal
                            ? "border border-violet-100 bg-violet-50 text-violet-800"
                            : isSystem
                              ? "border border-[#E9DDC8] bg-[#FBF6ED] text-xs text-[#80684A]"
                              : isAdmin
                                ? "bg-indigo-600 text-white"
                                : "bg-zinc-100 text-zinc-800",
                        ].join(" ")}
                      >
                        {message.attachment_url ? (
                          <a href={message.attachment_url} target="_blank" rel="noreferrer" className="mb-2 block overflow-hidden rounded-xl">
                            <Image
                              src={message.attachment_url}
                              alt={message.message || "Support attachment"}
                              width={420}
                              height={280}
                              unoptimized
                              className="max-h-72 w-full object-cover"
                            />
                          </a>
                        ) : null}
                        {internal ? <p className="mb-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-violet-500">Internal note</p> : null}
                        <p>{internal ? cleanInternalNote(message.message) : message.message}</p>
                        <p className={["mt-1 flex items-center justify-end gap-1 text-[10px]", isAdmin ? "text-white/70" : "text-zinc-400"].join(" ")}>
                          {formatTime(message.created_at, locale)}
                          {status ? <span className={status.className}>{status.mark}</span> : null}
                        </p>
                      </div>
                    </motion.div>
                  );
                })}

                {isOperatorTyping ? <TypingDots label={locale === "az" ? "Operator yazır..." : "Operator typing..."} /> : null}
              </div>

              <div className="border-t border-black/[0.06] bg-white p-3">
                <div className="mb-2 flex gap-2">
                  <button
                    type="button"
                    onClick={() => setComposerMode("reply")}
                    className={`rounded-full px-3 py-1.5 text-xs font-medium transition ${composerMode === "reply" ? "bg-indigo-50 text-indigo-700" : "bg-zinc-50 text-zinc-500 hover:bg-zinc-100"}`}
                  >
                    {locale === "az" ? "Cavab" : "Reply"}
                  </button>
                  <button
                    type="button"
                    onClick={() => setComposerMode("note")}
                    className={`rounded-full px-3 py-1.5 text-xs font-medium transition ${composerMode === "note" ? "bg-violet-50 text-violet-700" : "bg-zinc-50 text-zinc-500 hover:bg-zinc-100"}`}
                  >
                    {locale === "az" ? "Daxili qeyd" : "Internal note"}
                  </button>
                </div>

                {pendingAttachment && composerMode === "reply" ? (
                  <div className="mb-2 flex items-center gap-3 rounded-2xl border border-black/[0.06] bg-zinc-50 p-2">
                    <Image src={pendingAttachment.dataUrl} alt={pendingAttachment.fileName} width={54} height={54} unoptimized className="h-14 w-14 rounded-xl object-cover" />
                    <p className="min-w-0 flex-1 truncate text-xs text-zinc-600">{pendingAttachment.fileName}</p>
                    <button type="button" onClick={() => setPendingAttachment(null)} className="rounded-full bg-white p-1 text-zinc-400">
                      <X size={14} strokeWidth={1.8} />
                    </button>
                  </div>
                ) : null}

                {composerMode === "reply" ? (
                  <div className="flex items-center gap-2 rounded-2xl border border-black/[0.06] bg-white p-2 shadow-sm">
                    <button type="button" onClick={() => fileInputRef.current?.click()} className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-zinc-50 text-zinc-500 transition hover:bg-zinc-100" aria-label={locale === "az" ? "Şəkil əlavə et" : "Attach image"}>
                      <Paperclip size={18} strokeWidth={1.8} />
                    </button>
                    <input ref={fileInputRef} type="file" accept="image/png,image/jpeg,image/webp" className="hidden" onChange={handleFileChange} />
                    <input
                      value={reply}
                      onChange={(event) => setReply(event.target.value)}
                      onKeyDown={(event) => {
                        if (event.key === "Enter" && !event.shiftKey) {
                          event.preventDefault();
                          sendReply();
                        }
                      }}
                      placeholder={locale === "az" ? "Mesaj yazın..." : "Write a reply..."}
                      className="min-w-0 flex-1 bg-transparent text-sm text-zinc-800 outline-none placeholder:text-zinc-400"
                    />
                    <button type="button" onClick={sendReply} disabled={isSending || (!reply.trim() && !pendingAttachment)} className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-zinc-950 text-white transition hover:bg-zinc-800 disabled:opacity-40" aria-label={locale === "az" ? "Göndər" : "Send"}>
                      <ArrowUpRight size={18} strokeWidth={1.8} className="-rotate-45" />
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 rounded-2xl border border-violet-100 bg-violet-50 p-2">
                    <PencilLine size={18} strokeWidth={1.8} className="ml-2 text-violet-500" />
                    <input
                      value={note}
                      onChange={(event) => setNote(event.target.value)}
                      onKeyDown={(event) => {
                        if (event.key === "Enter" && !event.shiftKey) {
                          event.preventDefault();
                          sendNote();
                        }
                      }}
                      placeholder={locale === "az" ? "Komanda üçün daxili qeyd..." : "Internal note for staff..."}
                      className="min-w-0 flex-1 bg-transparent text-sm text-violet-900 outline-none placeholder:text-violet-300"
                    />
                    <button type="button" onClick={sendNote} disabled={isSending || !note.trim()} className="rounded-full bg-violet-600 px-3 py-2 text-xs font-medium text-white transition hover:bg-violet-500 disabled:opacity-40">
                      {locale === "az" ? "Qeyd et" : "Save"}
                    </button>
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="flex flex-1 items-center justify-center text-sm text-zinc-500">
              {locale === "az" ? "Söhbət seçin." : "Select a conversation."}
            </div>
          )}
        </main>

        <aside className="bg-white p-4">
          {selectedThread ? (
            <div className="space-y-5">
              <div className="rounded-2xl border border-black/[0.06] bg-white p-4 shadow-[0_8px_32px_rgba(0,0,0,.04)]">
                <p className="flex items-center gap-2 text-sm font-semibold text-zinc-950">
                  <Headset size={16} strokeWidth={1.8} />
                  {locale === "az" ? "Müştəri məlumatı" : "Customer info"}
                </p>
                <div className="mt-4 space-y-3 text-sm text-zinc-700">
                  <p><span className="text-zinc-400">{locale === "az" ? "Ad" : "Name"}:</span> {getCustomerLabel(selectedThread)}</p>
                  <p><span className="text-zinc-400">E-mail:</span> {selectedThread.user_email || "-"}</p>
                  <p><span className="text-zinc-400">{locale === "az" ? "Status" : "Status"}:</span> {statusCopy[selectedThread.status][locale]}</p>
                  <p><span className="text-zinc-400">Presence:</span> {selectedThread.is_online ? "Online" : "Offline"}</p>
                  <p><span className="text-zinc-400">{locale === "az" ? "Operator" : "Operator"}:</span> {selectedThread.assigned_admin_id || "-"}</p>
                </div>
              </div>

              <div className="rounded-2xl border border-black/[0.06] bg-white p-4 shadow-[0_8px_32px_rgba(0,0,0,.04)]">
                <p className="flex items-center gap-2 text-sm font-semibold text-zinc-950">
                  <CheckCircle size={16} strokeWidth={1.8} />
                  {locale === "az" ? "Səhifə və cihaz" : "Page and device"}
                </p>
                <div className="mt-3 space-y-2 text-xs leading-5 text-zinc-500">
                  <p>{locale === "az" ? "Səhifə" : "Page"}: {selectedThread.source_page || "-"}</p>
                  <p>{locale === "az" ? "Cihaz" : "Device"}: {selectedThread.device || "-"}</p>
                  <p>{locale === "az" ? "Brauzer" : "Browser"}: {selectedThread.browser || "-"}</p>
                  <p>User agent: {truncate(selectedThread.user_agent || "-", 120)}</p>
                </div>
              </div>

              <div className="rounded-2xl border border-black/[0.06] bg-white p-4 shadow-[0_8px_32px_rgba(0,0,0,.04)]">
                <p className="flex items-center gap-2 text-sm font-semibold text-zinc-950">
                  <ImageIcon size={16} strokeWidth={1.8} />
                  {locale === "az" ? "Vaxt" : "Timeline"}
                </p>
                <div className="mt-3 space-y-2 text-xs leading-5 text-zinc-500">
                  <p>{locale === "az" ? "Yaradılıb" : "Created"}: {formatDateTime(selectedThread.created_at, locale)}</p>
                  <p>{locale === "az" ? "Son aktivlik" : "Last activity"}: {formatDateTime(selectedThread.last_message_at, locale)}</p>
                  <p>{locale === "az" ? "Bağlanıb" : "Closed"}: {selectedThread.closed_at ? formatDateTime(selectedThread.closed_at, locale) : "-"}</p>
                </div>
              </div>

              <div className="rounded-2xl border border-black/[0.06] bg-[#FBF6ED] p-4 text-xs leading-5 text-[#80684A]">
                <p className="mb-2 flex items-center gap-2 font-semibold text-[#6E5638]">
                  <MessageSquareText size={16} strokeWidth={1.8} />
                  {locale === "az" ? "Daxili qeydlər" : "Internal notes"}
                </p>
                {visibleMessages.filter(isInternalNote).length ? (
                  visibleMessages.filter(isInternalNote).slice(-3).map((message) => (
                    <p key={message.id} className="border-t border-[#E9DDC8] py-2 first:border-t-0">
                      {cleanInternalNote(message.message)}
                    </p>
                  ))
                ) : (
                  <p>{locale === "az" ? "Hələ daxili qeyd yoxdur." : "No internal notes yet."}</p>
                )}
              </div>
            </div>
          ) : null}
        </aside>
      </div>
    </section>
  );
}
