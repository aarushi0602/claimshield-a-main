import { type ButtonHTMLAttributes, type ReactNode, type InputHTMLAttributes, type SelectHTMLAttributes, type TextareaHTMLAttributes, useState } from "react";
import { AlertTriangle, CheckCircle2, Clock, Copy, Info, Loader2, Lock, XCircle } from "lucide-react";

export function cx(...parts: (string | false | null | undefined)[]): string {
  return parts.filter(Boolean).join(" ");
}

// --------------------------------------------------------------------------- buttons

type Variant = "primary" | "secondary" | "ghost" | "danger" | "navy";

const VARIANT: Record<Variant, string> = {
  primary: "bg-action text-white hover:bg-action-hover active:bg-action-active shadow-z1",
  navy: "bg-navy text-white hover:bg-navy-deep shadow-z1",
  secondary: "bg-surface text-ink border border-line hover:bg-neutral-bg hover:border-line-strong",
  ghost: "text-action hover:bg-neutral-bg",
  danger: "border border-danger text-danger hover:bg-danger-bg",
};

export function Button({
  variant = "primary",
  size = "md",
  busy = false,
  className,
  children,
  disabled,
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; size?: "sm" | "md" | "lg"; busy?: boolean }) {
  return (
    <button
      type="button"
      {...rest}
      disabled={disabled || busy}
      className={cx(
        "inline-flex items-center justify-center gap-2 rounded-lg font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-55",
        size === "sm" && "px-3 py-1.5 text-label-md",
        size === "md" && "px-4 py-2 text-body-md",
        size === "lg" && "px-6 py-3 text-body-lg",
        VARIANT[variant],
        className,
      )}
    >
      {busy && <Loader2 className="size-4 animate-spin" aria-hidden />}
      {children}
    </button>
  );
}

export function LinkButton({ variant = "secondary", className, children, ...rest }: React.AnchorHTMLAttributes<HTMLAnchorElement> & { variant?: Variant }) {
  return (
    <a
      {...rest}
      className={cx("inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2 text-body-md font-semibold transition-colors", VARIANT[variant], className)}
    >
      {children}
    </a>
  );
}

export function CopyButton({ text, label = "Copy" }: { text: string; label?: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <Button
      variant="secondary"
      size="sm"
      onClick={() =>
        navigator.clipboard?.writeText(text).then(() => {
          setCopied(true);
          setTimeout(() => setCopied(false), 1200);
        })
      }
    >
      <Copy className="size-3.5" aria-hidden /> {copied ? "Copied" : label}
    </Button>
  );
}

// --------------------------------------------------------------------------- badges

export type Tone = "success" | "warning" | "danger" | "neutral" | "info" | "teal";

const TONE: Record<Tone, string> = {
  success: "bg-success-bg text-success",
  warning: "bg-warning-bg text-warning",
  danger: "bg-danger-bg text-danger",
  neutral: "bg-neutral-bg text-neutral",
  info: "bg-action-soft text-action",
  teal: "bg-teal-soft text-teal",
};

const TONE_ICON: Record<Tone, typeof CheckCircle2> = {
  success: CheckCircle2,
  warning: AlertTriangle,
  danger: XCircle,
  neutral: Clock,
  info: Info,
  teal: CheckCircle2,
};

/** Status badge with a dual cue (icon + label) so meaning never relies on colour alone. */
export function Badge({ tone = "neutral", children, icon = true, className }: { tone?: Tone; children: ReactNode; icon?: boolean; className?: string }) {
  const Icon = TONE_ICON[tone];
  return (
    <span className={cx("inline-flex items-center gap-1 whitespace-nowrap rounded px-2 py-0.5 text-label-sm uppercase", TONE[tone], className)}>
      {icon && <Icon className="size-3" aria-hidden />}
      {children}
    </span>
  );
}

export function ConfidenceBadge({ confidence }: { confidence: string }) {
  return confidence === "High" ? <Badge tone="teal">High</Badge> : <Badge tone="warning">Worth reviewing</Badge>;
}

export function Eyebrow({ children, className }: { children: ReactNode; className?: string }) {
  return <p className={cx("text-label-sm uppercase text-action", className)}>{children}</p>;
}

// --------------------------------------------------------------------------- surfaces

export function Card({ children, className, as: As = "section", ...rest }: { children: ReactNode; className?: string; as?: "section" | "div" | "article" } & React.HTMLAttributes<HTMLElement>) {
  return (
    <As {...rest} className={cx("min-w-0 rounded-xl border border-line bg-surface shadow-z1", className)}>
      {children}
    </As>
  );
}

export function CardHeader({ title, subtitle, icon, actions, className }: { title: ReactNode; subtitle?: ReactNode; icon?: ReactNode; actions?: ReactNode; className?: string }) {
  return (
    <div className={cx("flex flex-wrap items-start justify-between gap-3 border-b border-line px-6 py-4", className)}>
      <div className="flex min-w-0 items-start gap-3">
        {icon && <span className="mt-0.5 text-action">{icon}</span>}
        <div className="min-w-0">
          <h3 className="text-headline-sm text-ink">{title}</h3>
          {subtitle && <p className="mt-0.5 text-body-sm text-muted">{subtitle}</p>}
        </div>
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

export function PageHeader({ eyebrow, title, description, actions }: { eyebrow?: ReactNode; title: ReactNode; description?: ReactNode; actions?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div className="max-w-3xl">
        {eyebrow && <div className="mb-2">{eyebrow}</div>}
        <h1 className="text-headline-xl-mobile font-bold tracking-tight text-ink md:text-headline-xl">{title}</h1>
        {description && <p className="mt-2 text-body-lg text-muted">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
}

export function Pill({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <span className={cx("inline-flex items-center gap-1.5 rounded-full bg-container px-3 py-1 text-label-sm uppercase text-navy", className)}>
      {children}
    </span>
  );
}

export function StatCard({ label, value, sub, hero = false, icon }: { label: string; value: ReactNode; sub?: ReactNode; hero?: boolean; icon?: ReactNode }) {
  return (
    <div className={cx("relative overflow-hidden rounded-xl border p-5 shadow-z1", hero ? "border-teal/40 bg-teal text-white" : "border-line bg-surface")}>
      <div className="flex items-start justify-between gap-2">
        <p className={cx("text-label-sm uppercase", hero ? "text-white/85" : "text-muted")}>{label}</p>
        {icon && <span className={hero ? "text-white/85" : "text-muted"}>{icon}</span>}
      </div>
      <p className="tnum mt-2 text-headline-lg font-bold tracking-tight">{value}</p>
      {sub && <p className={cx("mt-1 text-body-sm", hero ? "text-white/85" : "text-muted")}>{sub}</p>}
    </div>
  );
}

// --------------------------------------------------------------------------- feedback

export function Notice({ children, tone = "neutral", className }: { children: ReactNode; tone?: "neutral" | "info" | "warning"; className?: string }) {
  const style = tone === "warning" ? "border-warning/30 bg-warning-bg text-warning" : tone === "info" ? "border-action/20 bg-action-soft text-navy" : "border-line-strong bg-neutral-bg text-neutral";
  return (
    <div className={cx("flex items-start gap-2 rounded-lg border px-3 py-2 text-body-sm", style, className)}>
      <Info className="mt-0.5 size-3.5 shrink-0" aria-hidden />
      <div>{children}</div>
    </div>
  );
}

export function ErrorBanner({ message }: { message?: string | null }) {
  if (!message) return null;
  return (
    <div role="alert" className="flex items-start gap-2 rounded-lg border border-danger/30 bg-danger-bg px-3 py-2 text-body-md text-danger">
      <XCircle className="mt-0.5 size-4 shrink-0" aria-hidden />
      <span>{message}</span>
    </div>
  );
}

export function Verdict({ tone, children }: { tone: "good" | "money" | "fail"; children: ReactNode }) {
  const style = tone === "good" ? "border-success/30 bg-success-bg text-success" : tone === "fail" ? "border-danger/30 bg-danger-bg text-danger" : "border-teal/30 bg-teal-soft/60 text-ink";
  const Icon = tone === "good" ? CheckCircle2 : tone === "fail" ? XCircle : AlertTriangle;
  return (
    <div className={cx("flex items-start gap-3 rounded-xl border px-4 py-3 text-body-md", style)}>
      <Icon className={cx("mt-0.5 size-5 shrink-0", tone === "money" && "text-teal")} aria-hidden />
      <div>{children}</div>
    </div>
  );
}

export function SyntheticNotice({ className }: { className?: string }) {
  return (
    <div className={cx("flex items-center gap-2 rounded-lg border border-line-strong bg-neutral-bg px-3 py-2 text-body-sm text-neutral", className)}>
      <Lock className="size-3.5 shrink-0" aria-hidden />
      Sample cases use synthetic data: the patients, hospitals, bills and policies are fictional.
    </div>
  );
}

export function EmptyState({ children }: { children: ReactNode }) {
  return <p className="px-6 py-8 text-center text-body-md text-muted">{children}</p>;
}

export function Spinner({ label }: { label?: string }) {
  return (
    <span className="inline-flex items-center gap-2 text-muted">
      <Loader2 className="size-4 animate-spin" aria-hidden /> {label}
    </span>
  );
}

// --------------------------------------------------------------------------- forms

const control = "w-full rounded-lg border border-line bg-surface px-3 py-2 text-body-md text-ink placeholder:text-muted/70 focus:border-action focus:outline-none focus:ring-2 focus:ring-action/15";

export function Field({ label, hint, children, className }: { label: ReactNode; hint?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <label className={cx("flex flex-col gap-1.5", className)}>
      <span className="text-label-md text-ink">{label}</span>
      {children}
      {hint && <span className="text-body-sm text-muted">{hint}</span>}
    </label>
  );
}

export function Input(props: InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={cx(control, props.type === "file" && "file:mr-3 file:rounded-md file:border-0 file:bg-action-soft file:px-3 file:py-1 file:text-label-md file:text-action", props.className)} />;
}

export function Select(props: SelectHTMLAttributes<HTMLSelectElement>) {
  return <select {...props} className={cx(control, props.className)} />;
}

export function Textarea(props: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea {...props} className={cx(control, props.className)} />;
}

export function Disclosure({ summary, children, defaultOpen = false, className }: { summary: ReactNode; children: ReactNode; defaultOpen?: boolean; className?: string }) {
  return (
    <details open={defaultOpen} className={cx("group rounded-lg border border-line bg-surface", className)}>
      <summary className="flex items-center justify-between gap-2 px-4 py-3 text-label-md text-ink marker:hidden [&::-webkit-details-marker]:hidden">
        <span>{summary}</span>
        <span className="text-muted transition-transform group-open:rotate-90">›</span>
      </summary>
      <div className="border-t border-line px-4 py-3">{children}</div>
    </details>
  );
}

export function Quote({ children, className }: { children: ReactNode; className?: string }) {
  return <blockquote className={cx("rounded-r-lg border-l-[3px] border-navy bg-container-low px-3 py-2 text-body-sm italic text-ink", className)}>{children}</blockquote>;
}

export function Table({ head, children, className }: { head: ReactNode[]; children: ReactNode; className?: string }) {
  return (
    <div className={cx("overflow-x-auto", className)}>
      <table className="w-full border-collapse text-left text-body-md">
        <thead>
          <tr className="border-b border-line bg-subtle">
            {head.map((h, i) => (
              <th key={i} scope="col" className="px-4 py-2.5 text-label-sm uppercase text-muted">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="[&>tr]:border-b [&>tr]:border-neutral-bg">{children}</tbody>
      </table>
    </div>
  );
}
