import { ArrowCounterClockwise, CheckCircle, FloppyDisk, Spinner } from "@/components/admin/lucide-admin-icons";
import cx from "classnames";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

interface SaveStatusPillProps {
  status: "idle" | "saving" | "success" | "error" | "warning";
  message: string;
  onSave: () => void;
  onReset: () => void;
  isDirty: boolean;
  isSaving: boolean;
  labels: {
    unsavedChanges: string;
    saveChanges: string;
    resetChanges: string;
  };
}

export function SaveStatusPill({
  status,
  message,
  onSave,
  onReset,
  isDirty,
  isSaving,
  labels,
}: SaveStatusPillProps) {
  const [mounted, setMounted] = useState(false);
  const [showPill, setShowPill] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (isDirty || status !== "idle") {
      setShowPill(true);
      return;
    }

    const timer = setTimeout(() => setShowPill(false), 180);
    return () => clearTimeout(timer);
  }, [isDirty, status]);

  if (!mounted || (!showPill && status === "idle" && !isDirty)) {
    return null;
  }

  const isVisible = isDirty || status !== "idle";

  return createPortal(
    <div className="fixed bottom-4 right-4 z-[9999] pointer-events-none flex justify-end px-4 pb-[calc(env(safe-area-inset-bottom))]">
      <div
        className={cx(
          "pointer-events-auto w-[min(100vw-2rem,26rem)] rounded-[18px] border px-4 py-3 shadow-[0_16px_40px_rgba(15,23,42,0.14)] backdrop-blur-xl transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] transform will-change-transform",
          isVisible ? "opacity-100 scale-100 translate-y-0" : "opacity-0 scale-95 translate-y-5",
          status === "success"
            ? "bg-white/95 border-emerald-200/70 text-emerald-900"
            : status === "error"
              ? "bg-white/95 border-red-200/70 text-red-900"
              : status === "saving"
                ? "bg-white/95 border-indigo-200/70 text-indigo-900"
                : "bg-white/95 border-[#E5E7EB] text-zinc-900",
        )}
      >
        <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex min-w-0 items-center gap-3">
            {status === "saving" && (
              <div className="flex-shrink-0">
                <Spinner size={18} weight="bold" className="animate-spin" />
              </div>
            )}

            {status === "success" && (
              <div className="flex-shrink-0">
                <CheckCircle size={18} weight="bold" />
              </div>
            )}

            <span className="min-w-0 truncate text-sm font-medium">
              {message || (isDirty ? labels.unsavedChanges : "")}
            </span>
          </div>

          {isDirty && status === "idle" ? (
            <div className="flex flex-shrink-0 items-center gap-2">
              <button
                type="button"
                onClick={onReset}
                disabled={isSaving}
                className={cx(
                  "flex items-center gap-2 rounded-[12px] border px-3 py-2 text-sm font-semibold transition-all whitespace-nowrap",
                  isSaving
                    ? "cursor-not-allowed border-zinc-200 bg-zinc-100 text-zinc-400"
                    : "border-zinc-200 bg-white text-zinc-600 hover:border-zinc-300 hover:bg-zinc-50 active:scale-95",
                )}
              >
                <ArrowCounterClockwise size={15} weight="bold" />
                {labels.resetChanges}
              </button>
              <button
                type="button"
                onClick={onSave}
                disabled={isSaving}
                className={cx(
                  "flex items-center gap-2 rounded-[12px] px-3.5 py-2 text-sm font-semibold transition-all whitespace-nowrap",
                  isSaving
                    ? "cursor-not-allowed bg-zinc-200 text-zinc-500"
                    : "bg-indigo-600 text-white hover:bg-indigo-500 active:scale-95",
                )}
              >
                <FloppyDisk size={16} weight="bold" />
                {labels.saveChanges}
              </button>
            </div>
          ) : null}
        </div>
      </div>
    </div>,
    document.body,
  );
}
