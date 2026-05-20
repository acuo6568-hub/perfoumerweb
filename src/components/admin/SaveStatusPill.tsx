import { CheckCircle, FloppyDisk, Spinner } from "@phosphor-icons/react";
import cx from "classnames";

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
  if (status === "idle" && !isDirty) {
    return null;
  }

  return (
    <div
      className={cx(
        "fixed bottom-6 left-1/2 -translate-x-1/2 z-50 transition-all duration-300 ease-out",
        (isDirty || status !== "idle") ? "opacity-100 translate-y-0" : "opacity-0 translate-y-2 pointer-events-none",
      )}
    >
      <div
        className={cx(
          "rounded-full px-6 py-3 shadow-lg backdrop-blur-md border transition-all duration-300",
          status === "success"
            ? "bg-emerald-50/95 border-emerald-200/50 text-emerald-900"
            : status === "error"
              ? "bg-red-50/95 border-red-200/50 text-red-900"
              : status === "saving"
                ? "bg-blue-50/95 border-blue-200/50 text-blue-900"
                : "bg-zinc-50/95 border-zinc-200/50 text-zinc-900",
        )}
      >
        <div className="flex items-center gap-3">
          <div
            className={cx(
              "transition-opacity duration-300",
              status === "saving" ? "opacity-100" : "opacity-0",
            )}
          >
            <Spinner size={16} weight="bold" className="animate-spin" />
          </div>

          <div
            className={cx(
              "transition-opacity duration-300",
              status === "success" ? "opacity-100" : "opacity-0",
            )}
          >
            <CheckCircle size={16} weight="bold" />
          </div>

          <span className="text-sm font-medium whitespace-nowrap max-w-xs truncate">
            {message || (isDirty ? "Unsaved changes" : "")}
          </span>

          {isDirty && status === "idle" ? (
            <button
              onClick={onSave}
              disabled={isSaving}
              className={cx(
                "ml-2 flex items-center gap-2 rounded-full bg-zinc-900 px-4 py-1.5 text-sm font-semibold text-white transition-all hover:bg-zinc-800 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed",
                "whitespace-nowrap",
              )}
            >
              <FloppyDisk size={14} weight="bold" />
              Save
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
}
