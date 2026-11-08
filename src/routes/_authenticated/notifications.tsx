import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { AlertTriangle, Bell, CheckCheck, Cpu, FileCheck, PackageX, Wrench, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Empty, PageHeader } from "@/components/common";
import { PRIORITY_ORDER, sortNotifications, useNotifications, type AppNotification } from "@/lib/notifications";
import { useLang } from "@/lib/i18n";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/notifications")({
  head: () => ({ meta: [{ title: "Notifications — Maintenix" }, { name: "description", content: "Supervisor alerts: breakdowns, validations, stock and critical readings." }, { property: "og:title", content: "Notifications — Maintenix" }, { property: "og:description", content: "Supervisor alerts." }] }),
  component: NotificationsPage,
});

const TYPE_ICON: Record<string, typeof Bell> = {
  breakdown_new: AlertTriangle,
  wo_status: Wrench,
  validation_request: FileCheck,
  intervention_done: FileCheck,
  wo_validated: CheckCheck,
  critical_reading: Cpu,
  stock_out: PackageX,
  stock_low: PackageX,
  predictive_risk: Zap,
};

const PRIO_CLS: Record<string, string> = {
  critical: "bg-destructive/15 text-destructive",
  high: "bg-warning/20 text-warning",
  medium: "bg-info/15 text-info",
  low: "bg-muted text-muted-foreground",
};

function NotificationsPage() {
  const { data, isLoading, markRead, markAllRead } = useNotifications();
  const [prio, setPrio] = useState("");
  const [unreadOnly, setUnreadOnly] = useState(false);
  const { t } = useLang();
  const navigate = useNavigate();

  const list = useMemo(() => {
    let l = sortNotifications(data ?? []);
    if (prio) l = l.filter((n) => n.priority === prio);
    if (unreadOnly) l = l.filter((n) => !n.read_at);
    return l;
  }, [data, prio, unreadOnly]);

  const unread = (data ?? []).filter((n) => !n.read_at).length;

  const open = (n: AppNotification) => {
    if (!n.read_at) markRead.mutate(n.id);
    if (n.link) navigate({ to: n.link as any });
  };

  return (
    <div>
      <PageHeader title="Notifications" subtitle="Alerts triggered by real events: breakdowns, work order status, reports, validations, critical readings and stock."
        actions={unread > 0 && <Button variant="outline" onClick={() => markAllRead.mutate()} disabled={markAllRead.isPending}><CheckCheck className="h-4 w-4" />{t("Mark all read")} ({unread})</Button>} />

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <div className="flex gap-1">
          {["", "critical", "high", "medium", "low"].map((p) => (
            <button key={p} onClick={() => setPrio(p)} className={cn("rounded-md px-3 py-1.5 text-xs capitalize", prio === p ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-accent")}>
              {p ? t(p) : t("All priorities")}
            </button>
          ))}
        </div>
        <span className="mx-1 h-4 w-px bg-border" />
        <button onClick={() => setUnreadOnly(!unreadOnly)} className={cn("rounded-md px-3 py-1.5 text-xs", unreadOnly ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-accent")}>
          {t("Unread only")}
        </button>
      </div>

      <div className="rounded-lg border bg-card">
        {isLoading && <Empty text="Loading…" />}
        {!isLoading && list.length === 0 && <Empty text="No notifications yet. They appear when important events happen in the app." />}
        <ul className="divide-y">
          {list.map((n) => {
            const Icon = TYPE_ICON[n.type] ?? Bell;
            return (
              <li key={n.id}>
                <button onClick={() => open(n)} className={cn("flex w-full items-start gap-3 px-4 py-3 text-start hover:bg-muted/40", !n.read_at && "bg-primary/5")}>
                  <span className={cn("mt-0.5 rounded-md p-1.5", PRIO_CLS[n.priority] ?? PRIO_CLS.low)}><Icon className="h-4 w-4" /></span>
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-2">
                      <span className={cn("truncate text-sm", !n.read_at && "font-semibold")}>{n.title}</span>
                      {!n.read_at && <span className="h-2 w-2 shrink-0 rounded-full bg-primary" />}
                    </span>
                    {n.description && <span className="mt-0.5 block truncate text-xs text-muted-foreground">{n.description}</span>}
                    <span className="mt-1 flex flex-wrap gap-x-3 text-[11px] text-muted-foreground">
                      <span>{new Date(n.created_at).toLocaleString()}</span>
                      {n.actor_name && <span>{t("Technician")}: {n.actor_name}</span>}
                      <span className="font-mono uppercase">{n.type.replace(/_/g, " ")}</span>
                    </span>
                  </span>
                  <span className={cn("shrink-0 rounded px-2 py-0.5 font-mono text-[10px] uppercase", PRIO_CLS[n.priority] ?? PRIO_CLS.low)}>{t(n.priority)}</span>
                </button>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}
