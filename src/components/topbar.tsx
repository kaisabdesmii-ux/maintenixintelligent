import { useMemo, useRef, useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { Bell, Cpu, Search } from "lucide-react";
import { useRows } from "@/lib/data";
import { riskLevel, riskScore, stockState } from "@/lib/kpi";
import { useLang } from "@/lib/i18n";
import { cn } from "@/lib/utils";

type Hit = { kind: string; label: string; sub: string; to: string; params?: Record<string, string> };

function GlobalSearch() {
  const eq = useRows("equipment");
  const wo = useRows("work_orders", { select: "*, equipment(code,name)" });
  const [q, setQ] = useState("");
  const [focus, setFocus] = useState(false);
  const navigate = useNavigate();
  const { t } = useLang();
  const boxRef = useRef<HTMLDivElement>(null);

  const hits = useMemo<Hit[]>(() => {
    const s = q.trim().toLowerCase();
    if (s.length < 2) return [];
    const machines: Hit[] = (eq.data ?? [])
      .filter((e) => e.code.toLowerCase().includes(s) || e.name.toLowerCase().includes(s))
      .slice(0, 4)
      .map((e) => ({ kind: t("Machine"), label: `${e.code} — ${e.name}`, sub: e.workshop ?? "", to: "/equipment/$id", params: { id: e.id } }));
    const orders: Hit[] = (wo.data ?? [])
      .filter((w) => w.number.toLowerCase().includes(s) || w.description.toLowerCase().includes(s))
      .slice(0, 4)
      .map((w) => ({ kind: t("Work order"), label: `${w.number} — ${w.equipment?.name ?? ""}`, sub: w.status.replace(/_/g, " "), to: "/work-orders" }));
    const techs: Hit[] = [...new Set((wo.data ?? []).map((w) => w.assigned_technician).filter(Boolean) as string[])]
      .filter((n) => n.toLowerCase().includes(s))
      .slice(0, 3)
      .map((n) => ({ kind: t("Technician"), label: n, sub: t("Work orders"), to: "/work-orders" }));
    return [...machines, ...orders, ...techs];
  }, [q, eq.data, wo.data, t]);

  return (
    <div ref={boxRef} className="relative w-full max-w-md">
      <Search className="pointer-events-none absolute start-3 top-2.5 h-4 w-4 text-muted-foreground" />
      <input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        onFocus={() => setFocus(true)}
        onBlur={() => setTimeout(() => setFocus(false), 150)}
        placeholder={t("Search machine, work order, technician…")}
        className="h-9 w-full rounded-md border bg-secondary/60 ps-9 pe-3 text-sm outline-none placeholder:text-muted-foreground focus:ring-1 focus:ring-ring"
      />
      {focus && hits.length > 0 && (
        <div className="absolute start-0 top-10 z-50 w-full overflow-hidden rounded-md border bg-popover shadow-xl">
          {hits.map((h, i) => (
            <button
              key={i}
              className="flex w-full items-center gap-3 px-3 py-2 text-start text-sm hover:bg-accent"
              onMouseDown={(e) => {
                e.preventDefault();
                setQ("");
                navigate({ to: h.to as any, params: h.params as any });
              }}
            >
              <span className="w-20 shrink-0 font-mono text-[10px] uppercase tracking-wide text-primary">{h.kind}</span>
              <span className="flex-1 truncate">{h.label}</span>
              <span className="truncate text-xs text-muted-foreground">{h.sub}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function IotStatus() {
  const eq = useRows("equipment");
  const sr = useRows("sensor_readings", { order: "recorded_at" });
  const { t } = useLang();
  const { online, total } = useMemo(() => {
    const total = (eq.data ?? []).length;
    const weekAgo = Date.now() - 7 * 864e5;
    const ids = new Set((sr.data ?? []).filter((r) => new Date(r.recorded_at).getTime() >= weekAgo).map((r) => r.equipment_id));
    return { online: ids.size, total };
  }, [eq.data, sr.data]);
  const all = total > 0 && online === total;
  return (
    <div className="hidden items-center gap-2 rounded-md border bg-secondary/60 px-3 py-1.5 font-mono text-xs md:flex" title={t("IoT Gateway")}>
      <span className={cn("inline-block h-2 w-2 rounded-full pulse-dot", all ? "bg-success" : "bg-warning")} />
      <Cpu className="h-3.5 w-3.5 text-muted-foreground" />
      <span className={all ? "text-success" : "text-warning"}>{online}/{total}</span>
      <span className="text-muted-foreground">{t("Sensors Online")}</span>
    </div>
  );
}

function NotificationBell() {
  const eq = useRows("equipment");
  const pp = useRows("preventive_plans");
  const sp = useRows("spare_parts");
  const sr = useRows("sensor_readings", { order: "recorded_at" });
  const [open, setOpen] = useState(false);
  const { t } = useLang();

  const alerts = useMemo(() => {
    const latest = new Map<string, any>();
    for (const r of sr.data ?? []) if (!latest.has(r.equipment_id) || latest.get(r.equipment_id).recorded_at < r.recorded_at) latest.set(r.equipment_id, r);
    const today = new Date().toISOString().slice(0, 10);
    return [
      ...(eq.data ?? [])
        .filter((e) => latest.get(e.id) && riskLevel(riskScore(latest.get(e.id))) === "high")
        .map((e) => ({ tone: "text-destructive", text: `${e.name}: ${t("high predictive risk")}`, to: `/equipment/${e.id}` })),
      ...(pp.data ?? []).filter((p) => p.active && p.next_due < today).map((p) => ({ tone: "text-warning", text: `${t("Preventive overdue")}: ${p.title}`, to: "/preventive" })),
      ...(sp.data ?? []).filter((p) => stockState(p) !== "ok").map((p) => ({ tone: "text-warning", text: `${stockState(p) === "out" ? t("Out of stock") : t("Low stock")}: ${p.designation}`, to: "/inventory" })),
    ];
  }, [eq.data, pp.data, sp.data, sr.data, t]);

  return (
    <div className="relative">
      <button onClick={() => setOpen(!open)} className="relative rounded-md border bg-secondary/60 p-2 hover:bg-accent" aria-label={t("Notifications")}>
        <Bell className="h-4 w-4" />
        {alerts.length > 0 && (
          <span className="absolute -end-1.5 -top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 font-mono text-[10px] font-bold text-destructive-foreground">
            {alerts.length}
          </span>
        )}
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute end-0 top-11 z-50 w-80 overflow-hidden rounded-md border bg-popover shadow-xl">
            <div className="border-b px-3 py-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">{t("Notifications")} ({alerts.length})</div>
            <ul className="max-h-72 overflow-y-auto">
              {alerts.length === 0 && <li className="px-3 py-6 text-center text-sm text-muted-foreground">{t("No active alerts.")}</li>}
              {alerts.map((a, i) => (
                <li key={i}>
                  <Link to={a.to as any} onClick={() => setOpen(false)} className="flex items-center gap-2 px-3 py-2 text-sm hover:bg-accent">
                    <span className={cn("inline-block h-2 w-2 shrink-0 rounded-full", a.tone.replace("text-", "bg-"))} />
                    <span className="truncate">{a.text}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </>
      )}
    </div>
  );
}

export function Topbar() {
  return (
    <header className="sticky top-0 z-20 hidden h-14 items-center gap-4 border-b glass px-6 lg:flex">
      <GlobalSearch />
      <div className="ms-auto flex items-center gap-3">
        <IotStatus />
        <NotificationBell />
      </div>
    </header>
  );
}
