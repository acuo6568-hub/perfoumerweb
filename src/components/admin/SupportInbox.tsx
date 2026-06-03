"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type ChangeEvent } from "react";
import Image from "next/image";
import {
  ArrowUpRight,
  CheckCircle,
  ImageSquare,
  Paperclip,
  UserCircle,
  X,
} from "@phosphor-icons/react";

type AdminLocale = "az" | "en";
type SupportStatus = "new" | "waiting" | "active" | "closed";

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

const statusCopy: Record<SupportStatus, { az: string; en: string; className: string }> = {
  new: { az: "Yeni", en: "New", className: "bg-amber-100 text-amber-800" },
  waiting: { az: "Gözləyir", en: "Waiting", className: "bg-zinc-100 text-zinc-700" },
  active: { az: "Aktiv", en: "Active", className: "bg-emerald-100 text-emerald-800" },
  closed: { az: "Bağlanıb", en: "Closed", className: "bg-zinc-900 text-white" },
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

export function SupportInbox({ locale }: { locale: AdminLocale }) {
  const [threads, setThreads] = useState<SupportThread[]>([]);
  const [selectedId, setSelectedId] = useState("");
  const [filter, setFilter] = useState<"all" | SupportStatus>("all");
  const [reply, setReply] = useState("");
  const [pendingAttachment, setPendingAttachment] = useState<PendingAttachment | null>(null);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
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
        setError(locale === "az" ? "Yeni dəstək mesajı gəldi." : "New support message received.");
        window.setTimeout(() => setError(""), 2200);
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
    action: "reply" | "assign" | "close" | "reopen",
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

  const filters: Array<{ value: "all" | SupportStatus; label: string; count: number }> = [
    { value: "all", label: locale === "az" ? "Hamısı" : "All", count: summary.total },
    { value: "waiting", label: locale === "az" ? "Gözləyən" : "Waiting", count: summary.waiting },
    { value: "active", label: locale === "az" ? "Aktiv" : "Active", count: summary.active },
    { value: "closed", label: locale === "az" ? "Bağlanmış" : "Closed", count: summary.closed },
  ];

  return (
    <section className="rounded-[28px] border border-zinc-200 bg-[#0d0d0d] p-3 text-white shadow-[0_24px_80px_rgba(0,0,0,0.18)] sm:p-4">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3 px-1">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-[#d8b889]">Support Inbox</p>
          <h2 className="mt-1 text-2xl font-semibold tracking-[-0.04em] text-white">
            {locale === "az" ? "Canlı dəstək söhbətləri" : "Human support conversations"}
          </h2>
        </div>
        <div className="rounded-full border border-white/10 bg-white/[0.06] px-3 py-1.5 text-sm text-zinc-200">
          {summary.unread} {locale === "az" ? "oxunmamış" : "unread"}
        </div>
      </div>

      {error ? (
        <div className="mb-3 rounded-2xl border border-[#d8b889]/25 bg-[#d8b889]/10 px-4 py-3 text-sm text-[#f2d6a8]">
          {error}
        </div>
      ) : null}

      <div className="grid min-h-[680px] overflow-hidden rounded-[24px] border border-white/10 bg-black/30 lg:grid-cols-[360px_minmax(0,1fr)_300px]">
        <aside className="border-b border-white/10 bg-white/[0.03] lg:border-b-0 lg:border-r">
          <div className="flex gap-2 overflow-x-auto border-b border-white/10 px-3 py-3">
            {filters.map((item) => (
              <button
                key={item.value}
                type="button"
                onClick={() => setFilter(item.value)}
                className={[
                  "shrink-0 rounded-full px-3 py-1.5 text-xs font-medium transition",
                  filter === item.value ? "bg-[#d8b889] text-black" : "bg-white/[0.06] text-zinc-300 hover:bg-white/[0.1]",
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
              filteredThreads.map((thread) => {
                const selected = selectedThread?.id === thread.id;
                const status = statusCopy[thread.status];
                return (
                  <button
                    key={thread.id}
                    type="button"
                    onClick={() => setSelectedId(thread.id)}
                    className={[
                      "mb-2 w-full rounded-2xl border p-3 text-left transition",
                      selected ? "border-[#d8b889]/60 bg-white/[0.1]" : "border-white/5 bg-white/[0.04] hover:bg-white/[0.07]",
                    ].join(" ")}
                  >
                    <div className="flex items-start gap-3">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#d8b889]/18 text-[#f1d8ad]">
                        <UserCircle size={22} weight="fill" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-2">
                          <p className="truncate text-sm font-semibold text-white">{getCustomerLabel(thread)}</p>
                          <span className="text-[11px] text-zinc-500">{formatTime(thread.last_message_at, locale)}</span>
                        </div>
                        <p className="mt-1 line-clamp-2 text-xs leading-5 text-zinc-400">
                          {truncate(thread.latestMessage?.message || (locale === "az" ? "Yeni dəstək sorğusu" : "New support request"))}
                        </p>
                        <div className="mt-2 flex items-center gap-2">
                          <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${status.className}`}>
                            {status[locale]}
                          </span>
                          {thread.unreadCount ? (
                            <span className="rounded-full bg-[#d8b889] px-2 py-0.5 text-[10px] font-semibold text-black">
                              {thread.unreadCount}
                            </span>
                          ) : null}
                        </div>
                      </div>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </aside>

        <main className="flex min-h-[620px] flex-col border-b border-white/10 lg:border-b-0 lg:border-r">
          {selectedThread ? (
            <>
              <div className="flex items-center justify-between gap-3 border-b border-white/10 px-4 py-4">
                <div className="min-w-0">
                  <p className="truncate text-lg font-semibold tracking-[-0.03em] text-white">{getCustomerLabel(selectedThread)}</p>
                  <p className="mt-1 truncate text-xs text-zinc-500">{selectedThread.user_email || selectedThread.guest_id || selectedThread.id}</p>
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => void submitAction("assign")}
                    disabled={isSending}
                    className="rounded-full border border-white/10 bg-white/[0.06] px-3 py-1.5 text-xs font-medium text-zinc-200 transition hover:bg-white/[0.1] disabled:opacity-50"
                  >
                    {locale === "az" ? "Mənə təyin et" : "Assign to me"}
                  </button>
                  <button
                    type="button"
                    onClick={() => void submitAction(selectedThread.status === "closed" ? "reopen" : "close")}
                    disabled={isSending}
                    className="rounded-full border border-white/10 bg-white/[0.06] px-3 py-1.5 text-xs font-medium text-zinc-200 transition hover:bg-white/[0.1] disabled:opacity-50"
                  >
                    {selectedThread.status === "closed"
                      ? locale === "az" ? "Yenidən aç" : "Reopen"
                      : locale === "az" ? "Bağla" : "Close"}
                  </button>
                </div>
              </div>

              <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-4 py-5">
                {selectedThread.status === "active" ? (
                  <div className="mx-auto flex w-fit items-center gap-2 rounded-full border border-emerald-400/20 bg-emerald-400/10 px-3 py-1 text-xs text-emerald-200">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                    {locale === "az" ? "Operator söhbətə qoşuldu" : "Operator joined the chat"}
                  </div>
                ) : null}

                {selectedThread.messages.map((message) => {
                  const isAdmin = message.sender_type === "admin";
                  const isSystem = message.sender_type === "system" || message.sender_type === "ai";
                  return (
                    <div
                      key={message.id}
                      className={["flex", isSystem ? "justify-center" : isAdmin ? "justify-end" : "justify-start"].join(" ")}
                    >
                      <div
                        className={[
                          "max-w-[82%] rounded-2xl px-4 py-3 text-sm leading-6",
                          isSystem
                            ? "border border-white/10 bg-white/[0.04] text-xs text-zinc-400"
                            : isAdmin
                              ? "bg-[#d8b889] text-black"
                              : "bg-white/[0.08] text-zinc-100",
                        ].join(" ")}
                      >
                        {message.attachment_url ? (
                          <a href={message.attachment_url} target="_blank" rel="noreferrer" className="mb-2 block overflow-hidden rounded-xl">
                            <Image
                              src={message.attachment_url}
                              alt={message.message || "Support attachment"}
                              width={320}
                              height={220}
                              unoptimized
                              className="max-h-56 w-full object-cover"
                            />
                          </a>
                        ) : null}
                        <p>{message.message}</p>
                        <p className={["mt-1 text-[10px]", isAdmin ? "text-black/55" : "text-zinc-500"].join(" ")}>
                          {formatTime(message.created_at, locale)}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="border-t border-white/10 p-3">
                {pendingAttachment ? (
                  <div className="mb-2 flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.05] p-2">
                    <Image src={pendingAttachment.dataUrl} alt={pendingAttachment.fileName} width={54} height={54} unoptimized className="h-14 w-14 rounded-xl object-cover" />
                    <p className="min-w-0 flex-1 truncate text-xs text-zinc-300">{pendingAttachment.fileName}</p>
                    <button type="button" onClick={() => setPendingAttachment(null)} className="rounded-full bg-white/10 p-1 text-zinc-300">
                      <X size={14} weight="bold" />
                    </button>
                  </div>
                ) : null}
                <div className="flex items-center gap-2 rounded-2xl border border-white/10 bg-white/[0.04] p-2">
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white/[0.06] text-zinc-300 transition hover:bg-white/[0.1]"
                    aria-label={locale === "az" ? "Şəkil əlavə et" : "Attach image"}
                  >
                    <Paperclip size={18} weight="bold" />
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
                    className="min-w-0 flex-1 bg-transparent text-sm text-zinc-100 outline-none placeholder:text-zinc-500"
                  />
                  <button
                    type="button"
                    onClick={sendReply}
                    disabled={isSending || (!reply.trim() && !pendingAttachment)}
                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#d8b889] text-black transition hover:bg-[#e7c89a] disabled:opacity-40"
                    aria-label={locale === "az" ? "Göndər" : "Send"}
                  >
                    <ArrowUpRight size={18} weight="bold" className="-rotate-45" />
                  </button>
                </div>
              </div>
            </>
          ) : (
            <div className="flex flex-1 items-center justify-center text-sm text-zinc-500">
              {locale === "az" ? "Söhbət seçin." : "Select a conversation."}
            </div>
          )}
        </main>

        <aside className="bg-white/[0.03] p-4">
          {selectedThread ? (
            <div className="space-y-5">
              <div>
                <p className="text-xs uppercase tracking-[0.18em] text-zinc-500">
                  {locale === "az" ? "Müştəri məlumatı" : "Customer info"}
                </p>
                <div className="mt-3 space-y-3 text-sm">
                  <p><span className="text-zinc-500">{locale === "az" ? "Ad" : "Name"}:</span> {getCustomerLabel(selectedThread)}</p>
                  <p><span className="text-zinc-500">E-mail:</span> {selectedThread.user_email || "-"}</p>
                  <p><span className="text-zinc-500">{locale === "az" ? "Status" : "Status"}:</span> {statusCopy[selectedThread.status][locale]}</p>
                  <p><span className="text-zinc-500">{locale === "az" ? "Online" : "Online"}:</span> {selectedThread.is_online ? "Online" : "-"}</p>
                  <p><span className="text-zinc-500">{locale === "az" ? "Təyin edilib" : "Assigned"}:</span> {selectedThread.assigned_admin_id || "-"}</p>
                </div>
              </div>

              <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
                <p className="flex items-center gap-2 text-sm font-semibold text-white">
                  <CheckCircle size={16} weight="bold" />
                  {locale === "az" ? "Səhifə və cihaz" : "Page and device"}
                </p>
                <div className="mt-3 space-y-2 text-xs leading-5 text-zinc-400">
                  <p>{locale === "az" ? "Səhifə" : "Page"}: {selectedThread.source_page || "-"}</p>
                  <p>{locale === "az" ? "Cihaz" : "Device"}: {selectedThread.device || "-"}</p>
                  <p>{locale === "az" ? "Brauzer" : "Browser"}: {selectedThread.browser || "-"}</p>
                  <p>User agent: {truncate(selectedThread.user_agent || "-", 120)}</p>
                </div>
              </div>

              <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
                <p className="flex items-center gap-2 text-sm font-semibold text-white">
                  <ImageSquare size={16} weight="bold" />
                  {locale === "az" ? "Vaxt" : "Timeline"}
                </p>
                <div className="mt-3 space-y-2 text-xs leading-5 text-zinc-400">
                  <p>{locale === "az" ? "Yaradılıb" : "Created"}: {formatDateTime(selectedThread.created_at, locale)}</p>
                  <p>{locale === "az" ? "Son aktivlik" : "Last activity"}: {formatDateTime(selectedThread.last_message_at, locale)}</p>
                  <p>{locale === "az" ? "Bağlanıb" : "Closed"}: {selectedThread.closed_at ? formatDateTime(selectedThread.closed_at, locale) : "-"}</p>
                </div>
              </div>
            </div>
          ) : null}
        </aside>
      </div>
    </section>
  );
}
