import { CheckCircle, FloppyDisk, Spinner } from "@phosphor-icons/react";
import cx from "classnames";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

interface SaveStatusPillProps {
  status: "idle" | "saving" | "success" | "error";
  message: string;
  onSave: () => void;
  isDirty: boolean;
  isSaving: boolean;
}

export function SaveStatusPill({
  status,
  message,
  onSave,
  isDirty,
  isSaving,
}: SaveStatusPillProps) {
  const [showPill, setShowPill] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);

    if (isDirty || status !== "idle") {
      setShowPill(true);
    } else {
      const timer = setTimeout(() => setShowPill(false), 500);
      return () => clearTimeout(timer);
    }
  }, [isDirty, status]);

  if (!mounted || (!showPill && status === "idle" && !isDirty)) {
    return null;
  }

  const isVisible = isDirty || status !== "idle";

  return createPortal(
    <div className="fixed inset-x-0 bottom-0 z-[9999] pointer-events-none flex justify-center px-4 pb-[calc(1.5rem+env(safe-area-inset-bottom))]">
      <div
        className={cx(
          "pointer-events-auto max-w-[calc(100vw-2rem)] rounded-2xl px-6 py-4 shadow-2xl backdrop-blur-xl border transition-all duration-300 transform",
          isVisible ? "opacity-100 scale-100 translate-y-0" : "opacity-0 scale-95 translate-y-4",
          status === "success"
            ? "bg-gradient-to-r from-emerald-50 to-green-50/80 border-emerald-200/60 text-emerald-900"
            : status === "error"
              ? "bg-gradient-to-r from-red-50 to-rose-50/80 border-red-200/60 text-red-900"
              : status === "saving"
                ? "bg-gradient-to-r from-blue-50 to-cyan-50/80 border-blue-200/60 text-blue-900"
                : "bg-gradient-to-r from-zinc-50 to-neutral-50/80 border-zinc-200/60 text-zinc-900",
        )}
      >
        <div className="flex items-center justify-between gap-4 min-w-0">
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
              {message || (isDirty ? "Unsaved changes" : "")}
            </span>
          </div>

          {isDirty && status === "idle" ? (
            <button
              onClick={onSave}
              disabled={isSaving}
              className={cx(
                "flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold transition-all whitespace-nowrap flex-shrink-0",
                isSaving
                  ? "bg-zinc-200 text-zinc-500 cursor-not-allowed"
                  : "bg-zinc-900 text-white hover:bg-zinc-800 active:scale-95",
              )}
            >
              <FloppyDisk size={16} weight="bold" />
              Save
            </button>
          ) : null}
        </div>
      </div>
    </div>,
    document.body,
  );
}
