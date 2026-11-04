import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { useLang } from "@/lib/i18n";

const TONES: Record<string, string> = {
  operational: "bg-success/15 text-success",
  resolved: "bg-success/15 text-success",
  closed: "bg-muted text-muted-foreground",
  completed: "bg-success/15 text-success",
  validated: "bg-success/15 text-success",
  ok: "bg-success/15 text-success",
  low: "bg-success/15 text-success",
  under_maintenance: "bg-info/15 text-info",
  in_progress: "bg-info/15 text-info",
  scheduled: "bg-info/15 text-info",
  under_diagnosis: "bg-warning/20 text-warning",
  waiting_parts: "bg-warning/20 text-warning",
  waiting_for_parts: "bg-warning/20 text-warning",
  pending_approval: "bg-warning/20 text-warning",
  medium: "bg-warning/20 text-warning",
  reported: "bg-warning/20 text-warning",
  draft: "bg-muted text-muted-foreground",
  cancelled: "bg-muted text-muted-foreground",
  high: "bg-destructive/15 text-destructive",
  failure: "bg-destructive/15 text-destructive",
  critical: "bg-destructive text-destructive-foreground",
  out: "bg-destructive/15 text-destructive",
  overdue: "bg-destructive/15 text-destructive",
};

export function StatusBadge({ value }: { value: string | null | undefined }) {
  const v = value ?? "—";
  const { t } = useLang();
  return (
    <span className={cn("inline-flex items-center rounded px-2 py-0.5 font-mono text-[11px] font-medium uppercase tracking-wide whitespace-nowrap", TONES[v] ?? "bg-muted text-muted-foreground")}>
      {t(v.replace(/_/g, " "))}
    </span>
  );
}

export function PageHeader({ title, subtitle, actions }: { title: string; subtitle?: string | undefined; actions?: ReactNode }) {
  const { t } = useLang();
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="text-2xl font-bold md:text-3xl">{t(title)}</h1>
        {subtitle && <p className="mt-1 text-sm text-muted-foreground">{t(subtitle)}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
}

export function KpiCard({ label, value, icon: Icon, hint, tone = "primary" }: { label: string; value: ReactNode; icon: LucideIcon; hint?: string; tone?: "primary" | "success" | "warning" | "destructive" | "info" }) {
  const toneCls = { primary: "text-primary bg-primary/10", success: "text-success bg-success/10", warning: "text-warning bg-warning/15", destructive: "text-destructive bg-destructive/10", info: "text-info bg-info/10" }[tone];
  return (
    <div className="rounded-lg border bg-card p-4 transition-shadow hover:shadow-md">
      <div className="flex items-start justify-between gap-2">
        <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</span>
        <span className={cn("rounded-md p-1.5", toneCls)}><Icon className="h-4 w-4" /></span>
      </div>
      <div className="mt-2 font-display text-2xl font-bold tabular-nums">{value}</div>
      {hint && <div className="mt-0.5 text-xs text-muted-foreground">{hint}</div>}
    </div>
  );
}

export function Panel({ title, children, className, action }: { title: string; children: ReactNode; className?: string; action?: ReactNode }) {
  const { t } = useLang();
  return (
    <section className={cn("rounded-lg border bg-card p-4", className)}>
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-semibold">{t(title)}</h3>
        {action}
      </div>
      {children}
    </section>
  );
}

export function Empty({ text }: { text: string }) {
  return <div className="py-10 text-center text-sm text-muted-foreground">{text}</div>;
}
