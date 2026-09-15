"use client";

import * as React from "react";
import { createPortal } from "react-dom";
import { AlertTriangle, CheckCircle2, Info, X } from "lucide-react";
import { cn } from "@/lib/utils";

type ToastTone = "success" | "error" | "info";

type Toast = {
  id: string;
  title: string;
  description?: string;
  tone: ToastTone;
};

type ToastContextValue = {
  toast: (input: { title: string; description?: string; tone?: ToastTone }) => void;
};

type ToastInput = {
  title: string;
  description?: string;
  tone?: ToastTone;
};

let globalToast: ((input: ToastInput) => void) | null = null;

export function showToast(input: ToastInput) {
  globalToast?.(input);
}
const ToastContext = React.createContext<ToastContextValue | null>(null);

const icons = {
  success: CheckCircle2,
  error: AlertTriangle,
  info: Info,
};

const toneClasses: Record<ToastTone, string> = {
  success: "text-success",
  error: "text-danger",
  info: "text-info",
};

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = React.useState<Toast[]>([]);
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => setMounted(true), []);

  const dismiss = React.useCallback((id: string) => {
    setToasts((current) => current.filter((item) => item.id !== id));
  }, []);

  const toast = React.useCallback<ToastContextValue["toast"]>(
    ({ title, description, tone = "success" }) => {
      const id = Math.random().toString(36).slice(2);
      setToasts((current) => [...current.slice(-2), { id, title, description, tone }]);
      window.setTimeout(() => dismiss(id), 4500);
    },
    [dismiss],
  );

  React.useEffect(() => {
  globalToast = toast;

  return () => {
    globalToast = null;
  };
}, [toast]);
  const value = React.useMemo(() => ({ toast }), [toast]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      {mounted
        ? createPortal(
            <div className="no-print pointer-events-none fixed top-4 right-4 z-[60] flex w-[min(92vw,22rem)] flex-col gap-2">
              {toasts.map((item) => {
                const Icon = icons[item.tone];
                return (
                  <div
                    key={item.id}
                    role="status"
                    className="animate-slide-up pointer-events-auto flex items-start gap-3 rounded-lg border border-line bg-surface p-3 shadow-lg"
                  >
                    <Icon className={cn("mt-0.5 size-4 shrink-0", toneClasses[item.tone])} />
                    <div className="min-w-0 flex-1">
                      <p className="text-[13px] font-semibold text-ink">{item.title}</p>
                      {item.description ? (
                        <p className="mt-0.5 text-[12px] leading-snug text-ink-muted">
                          {item.description}
                        </p>
                      ) : null}
                    </div>
                    <button
                      onClick={() => dismiss(item.id)}
                      className="rounded p-0.5 text-ink-muted hover:text-ink"
                      aria-label="Dismiss"
                    >
                      <X className="size-3.5" />
                    </button>
                  </div>
                );
              })}
            </div>,
            document.body,
          )
        : null}
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = React.useContext(ToastContext);
  if (!context) throw new Error("useToast must be used inside <ToastProvider>.");
  return context;
}
