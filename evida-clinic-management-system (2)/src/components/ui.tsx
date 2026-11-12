"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { AlertTriangle, CheckCircle2, Info, X, XCircle } from "lucide-react";
import { avatarStyle, initials } from "@/lib/client";

/* ------------------------------- toasts ------------------------------- */

type Tone = "success" | "error" | "info";
type ToastItem = { id: number; message: string; tone: Tone };

const ToastContext = createContext<{ push: (message: string, tone?: Tone) => void }>({
  push: () => undefined,
});

export function useToast() {
  return useContext(ToastContext);
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);

  const push = useCallback((message: string, tone: Tone = "success") => {
    const id = Date.now() + Math.random();
    setItems((prev) => [...prev, { id, message, tone }]);
    setTimeout(() => setItems((prev) => prev.filter((t) => t.id !== id)), 4200);
  }, []);

  const value = useMemo(() => ({ push }), [push]);

  const icons: Record<Tone, ReactNode> = {
    success: <CheckCircle2 className="h-5 w-5 text-iris-500" />,
    error: <XCircle className="h-5 w-5 text-berry-500" />,
    info: <Info className="h-5 w-5 text-clay-600" />,
  };

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="pointer-events-none fixed bottom-5 left-5 z-[80] flex w-[min(92vw,26rem)] flex-col gap-2">
        {items.map((item) => (
          <div
            key={item.id}
            className="anim-pop pointer-events-auto flex items-start gap-3 rounded-xl border border-ink/10 bg-white/95 p-3 shadow-[0_18px_40px_-24px_rgba(23,18,38,0.6)] backdrop-blur"
          >
            {icons[item.tone]}
            <p className="flex-1 text-sm leading-6 text-ink/85">{item.message}</p>
            <button
              type="button"
              onClick={() => setItems((prev) => prev.filter((t) => t.id !== item.id))}
              className="rounded-md p-1 text-ink/40 transition hover:bg-sand-100 hover:text-ink"
              aria-label="Dismiss notification"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

/* ------------------------------- buttons ------------------------------ */

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "outline" | "ghost" | "danger" | "soft";
  size?: "sm" | "md";
  icon?: ReactNode;
  loading?: boolean;
};

export function Button({
  variant = "primary",
  size = "md",
  icon,
  loading,
  className = "",
  children,
  disabled,
  ...rest
}: ButtonProps) {
  const base =
    "inline-flex items-center justify-center gap-2 rounded-lg font-medium transition active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-55";
  const sizes = size === "sm" ? "px-3 py-1.5 text-[13px]" : "px-4 py-2.5 text-sm";
  const variants: Record<string, string> = {
    primary: "bg-iris-700 text-sand-50 hover:bg-iris-800 shadow-[0_10px_24px_-16px_rgba(23,18,38,0.9)]",
    outline: "border border-ink/15 bg-white/70 text-ink hover:border-iris-400 hover:text-iris-700",
    ghost: "text-ink/70 hover:bg-sand-100 hover:text-ink",
    danger: "bg-berry-500 text-white hover:bg-berry-600",
    soft: "bg-iris-50 text-iris-700 hover:bg-iris-100",
  };
  return (
    <button
      className={`${base} ${sizes} ${variants[variant]} ${className}`}
      disabled={disabled || loading}
      {...rest}
    >
      {loading ? (
        <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
      ) : (
        icon
      )}
      {children}
    </button>
  );
}

/* -------------------------------- cards ------------------------------- */

export function Card({
  className = "",
  children,
}: {
  className?: string;
  children: ReactNode;
}) {
  return (
    <section
      className={`rounded-2xl border border-ink/8 bg-white/85 shadow-[0_1px_0_rgba(255,255,255,0.7)_inset,0_18px_40px_-32px_rgba(23,18,38,0.5)] ${className}`}
    >
      {children}
    </section>
  );
}

export function SectionHeader({
  title,
  subtitle,
  icon,
  action,
}: {
  title: string;
  subtitle?: string;
  icon?: ReactNode;
  action?: ReactNode;
}) {
  return (
    <header className="flex flex-wrap items-center justify-between gap-3 border-b border-ink/8 px-5 py-4">
      <div className="flex items-center gap-3">
        {icon ? (
          <span className="grid h-9 w-9 place-items-center rounded-xl bg-iris-50 text-iris-600">{icon}</span>
        ) : null}
        <div>
          <h2 className="font-display text-[15px] font-bold text-ink">{title}</h2>
          {subtitle ? <p className="mt-0.5 text-xs text-ink/55">{subtitle}</p> : null}
        </div>
      </div>
      {action}
    </header>
  );
}

export function StatTile({
  label,
  value,
  hint,
  icon,
  tone = "pine",
}: {
  label: string;
  value: string | number;
  hint?: string;
  icon?: ReactNode;
  tone?: "pine" | "clay" | "berry" | "moss";
}) {
  const tones: Record<string, string> = {
    pine: "bg-iris-50 text-iris-600",
    clay: "bg-clay-100 text-clay-600",
    berry: "bg-berry-100 text-berry-600",
    moss: "bg-moss-100 text-moss-500",
  };
  return (
    <Card className="lift p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-medium text-ink/55">{label}</p>
          <p className="num mt-1.5 font-display text-2xl font-bold text-ink">{value}</p>
          {hint ? <p className="mt-1 text-[11px] text-ink/45">{hint}</p> : null}
        </div>
        {icon ? <span className={`grid h-10 w-10 place-items-center rounded-xl ${tones[tone]}`}>{icon}</span> : null}
      </div>
    </Card>
  );
}

/* -------------------------------- badge ------------------------------- */

const TONES: Record<string, string> = {
  neutral: "bg-sand-100 text-ink/70 border-ink/10",
  pine: "bg-iris-50 text-iris-700 border-iris-200",
  clay: "bg-clay-100 text-clay-600 border-clay-300/60",
  berry: "bg-berry-100 text-berry-600 border-berry-500/25",
  moss: "bg-moss-100 text-moss-500 border-moss-500/25",
};

export function Badge({
  tone = "neutral",
  children,
  className = "",
}: {
  tone?: keyof typeof TONES | string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-[11px] font-medium ${TONES[tone] ?? TONES.neutral} ${className}`}
    >
      {children}
    </span>
  );
}

export const STATUS_TONES: Record<string, string> = {
  scheduled: "clay",
  completed: "moss",
  cancelled: "berry",
  no_show: "neutral",
  active: "pine",
  paused: "clay",
  finished: "moss",
  draft: "neutral",
};

/* -------------------------------- avatar ------------------------------ */

export function Avatar({
  name,
  hue,
  size = 40,
}: {
  name: string;
  hue: number;
  size?: number;
}) {
  return (
    <span
      className="grid shrink-0 place-items-center rounded-full font-display font-bold"
      style={{ ...avatarStyle(hue), width: size, height: size, fontSize: size * 0.36 }}
      aria-hidden
    >
      {initials(name)}
    </span>
  );
}

/* -------------------------------- inputs ------------------------------ */

export function Field({
  label,
  hint,
  children,
  className = "",
}: {
  label: string;
  hint?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <label className={`block ${className}`}>
      <span className="mb-1.5 block text-xs font-medium text-ink/70">{label}</span>
      {children}
      {hint ? <span className="mt-1 block text-[11px] text-ink/45">{hint}</span> : null}
    </label>
  );
}

const controlBase =
  "w-full rounded-lg border border-ink/12 bg-white px-3 py-2.5 text-sm text-ink outline-none transition placeholder:text-ink/35 focus:border-iris-400 focus:ring-2 focus:ring-iris-200/60 disabled:bg-sand-100";

export function Input(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={`${controlBase} ${props.className ?? ""}`} />;
}

export function Textarea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea {...props} className={`${controlBase} min-h-[88px] resize-y ${props.className ?? ""}`} />;
}

export function Select(props: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return <select {...props} className={`${controlBase} appearance-none ${props.className ?? ""}`} />;
}

export function SearchInput(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={`${controlBase} ${props.className ?? ""}`} />;
}

/* -------------------------------- modal ------------------------------- */

export function Modal({
  open,
  onClose,
  title,
  subtitle,
  children,
  footer,
  wide,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  children: ReactNode;
  footer?: ReactNode;
  wide?: boolean;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[70] flex items-end justify-center p-0 sm:items-center sm:p-6">
      <div className="anim-fade absolute inset-0 bg-ink/45 backdrop-blur-[3px]" onClick={onClose} />
      <div
        role="dialog"
        aria-modal="true"
        className={`anim-pop relative flex max-h-[92vh] w-full flex-col overflow-hidden rounded-t-2xl border border-ink/10 bg-sand-50 shadow-2xl sm:rounded-2xl ${wide ? "sm:max-w-4xl" : "sm:max-w-xl"}`}
      >
        <header className="flex items-start justify-between gap-4 border-b border-ink/10 bg-white px-5 py-4">
          <div>
            <h3 className="font-display text-base font-bold text-ink">{title}</h3>
            {subtitle ? <p className="mt-1 text-xs text-ink/55">{subtitle}</p> : null}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-ink/45 transition hover:bg-sand-100 hover:text-ink"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </header>
        <div className="flex-1 overflow-y-auto px-5 py-4">{children}</div>
        {footer ? (
          <footer className="flex items-center justify-end gap-2 border-t border-ink/10 bg-white px-5 py-3">
            {footer}
          </footer>
        ) : null}
      </div>
    </div>
  );
}

/* ----------------------------- empty state ---------------------------- */

export function EmptyState({
  icon,
  title,
  hint,
  action,
}: {
  icon?: ReactNode;
  title: string;
  hint?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 px-6 py-12 text-center">
      {icon ? (
        <span className="grid h-12 w-12 place-items-center rounded-2xl bg-sand-100 text-ink/40">{icon}</span>
      ) : null}
      <div>
        <p className="font-display text-sm font-semibold text-ink/80">{title}</p>
        {hint ? <p className="mt-1 text-xs text-ink/50">{hint}</p> : null}
      </div>
      {action}
    </div>
  );
}

export function Warn({ children }: { children: ReactNode }) {
  return (
    <div className="flex items-start gap-2 rounded-xl border border-clay-300/50 bg-clay-100/60 px-3.5 py-3 text-xs text-clay-600">
      <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
      <span className="leading-5">{children}</span>
    </div>
  );
}

/* -------------------------------- misc -------------------------------- */

export function Progress({ value, total }: { value: number; total: number }) {
  const pct = total > 0 ? Math.min(100, Math.round((value / total) * 100)) : 0;
  return (
    <div className="flex items-center gap-3">
      <div className="h-2 flex-1 overflow-hidden rounded-full bg-sand-200">
        <div className="h-full rounded-full bg-iris-500 transition-all" style={{ width: `${pct}%` }} />
      </div>
      <span className="num text-[11px] font-semibold text-ink/60">{pct}%</span>
    </div>
  );
}

export function Bar({ value, max, tone = "bg-iris-500" }: { value: number; max: number; tone?: string }) {
  const pct = max > 0 ? Math.max(3, Math.round((value / max) * 100)) : 0;
  return (
    <div className="h-2.5 w-full overflow-hidden rounded-full bg-sand-200">
      <div className={`h-full rounded-full ${tone}`} style={{ width: `${pct}%` }} />
    </div>
  );
}
