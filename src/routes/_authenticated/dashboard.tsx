import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, Legend, Line, LineChart, Pie, PieChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Activity, AlertTriangle, Boxes, CheckCircle2, ClipboardList, Clock, Cog, DollarSign, Gauge, PackageX, Radio, ShieldAlert, Thermometer, Timer, Vibrate, Wrench, Zap } from "lucide-react";
import { useRows } from "@/lib/data";
import { availability, fmt, mtbf, mttr, oee, riskLevel, riskScore, stockState, THRESHOLDS } from "@/lib/kpi";
import { telemetryLevel, useLiveTelemetry, type LiveReading } from "@/lib/telemetry";
import { AiInsightBox } from "@/components/ai-insight";
import { Empty, KpiCard, PageHeader, Panel, StatusBadge } from "@/components/common";
import { useLang } from "@/lib/i18n";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({ meta: [{ title: "Smart Maintenance Overview — Maintenix" }, { name: "description", content: "Live maintenance KPIs, reliability and alerts." }, { property: "og:title", content: "Smart Maintenance Overview — Maintenix" }, { property: "og:description", content: "Live maintenance KPIs." }] }),
  component: Dashboard,
});

const C = ["var(--chart-1)", "var(--chart-2)", "var(--chart-3)", "var(--chart-4)", "var(--chart-5)"];
const tip = { contentStyle: { background: "var(--popover)", border: "1px solid var(--border)", borderRadius: 8, fontSize: 12 } };

function Dashboard() {
  const eq = useRows("equipment", { order: "code", asc: true });
  const bd = useRows("breakdowns", { order: "occurred_at" });
  const wo = useRows("work_orders", { order: "created_at" });
  const pp = useRows("preventive_plans");
  const sp = useRows("spare_parts");
  const sr = useRows("sensor_readings", { order: "recorded_at" });
  const [days, setDays] = useState(180);
  const [dept, setDept] = useState("");

  const d = useMemo(() => {
    const since = Date.now() - days * 864e5;
    const equipment = (eq.data ?? []).filter((e) => !dept || e.department === dept || e.workshop === dept);
    const ids = new Set(equipment.map((e) => e.id));
    const breakdowns = (bd.data ?? []).filter((b) => ids.has(b.equipment_id) && new Date(b.occurred_at).getTime() >= since);
    const orders = (wo.data ?? []).filter((w) => ids.has(w.equipment_id));
    const plans = (pp.data ?? []).filter((p) => ids.has(p.equipment_id));
    const periodHours = days * 24 * Math.max(1, equipment.length);
    const MTBF = mtbf(breakdowns, periodHours), MTTR = mttr(breakdowns);
    const latest = new Map<string, any>();
    for (const r of sr.data ?? []) if (!latest.has(r.equipment_id) || latest.get(r.equipment_id).recorded_at < r.recorded_at) latest.set(r.equipment_id, r);
    const risks = equipment.map((e) => ({ e, score: latest.get(e.id) ? riskScore(latest.get(e.id)) : 0 }));
    const today = new Date().toISOString().slice(0, 10);
    const prevDone = orders.filter((w) => w.type === "preventive");
    const prevRate = prevDone.length ? prevDone.filter((w) => ["completed", "validated"].includes(w.status)).length / prevDone.length : 0;
    const cost = orders.reduce((s, w) => s + Number(w.total_cost ?? 0), 0) + breakdowns.reduce((s, b) => s + Number(b.repair_cost), 0);

    const months: Record<string, { m: string; breakdowns: number; downtime: number; cost: number; wo: number }> = {};
    for (let i = Math.ceil(days / 30) - 1; i >= 0; i--) {
      const dt = new Date(); dt.setMonth(dt.getMonth() - i);
      const k = dt.toISOString().slice(0, 7);
      months[k] = { m: dt.toLocaleString("en", { month: "short" }), breakdowns: 0, downtime: 0, cost: 0, wo: 0 };
    }
    for (const b of breakdowns) { const k = b.occurred_at.slice(0, 7); if (months[k]) { months[k].breakdowns++; months[k].downtime += Number(b.downtime_hours); months[k].cost += Number(b.repair_cost); } }
    for (const w of orders) { const k = w.created_at.slice(0, 7); if (months[k]) { months[k].wo++; months[k].cost += Number(w.total_cost ?? 0); } }
    const trend = Object.values(months).map((m) => ({ ...m, mttr: m.breakdowns ? +(m.downtime / m.breakdowns).toFixed(1) : 0, mtbf: m.breakdowns ? Math.round((30 * 24 * equipment.length - m.downtime) / m.breakdowns) : 30 * 24 * equipment.length }));

    const statusDist = ["operational", "under_maintenance", "failure"].map((s) => ({ name: s.replace("_", " "), value: equipment.filter((e) => e.status === s).length }));
    const techMap: Record<string, { name: string; done: number; hours: number }> = {};
    for (const w of orders) if (w.assigned_technician) { const t = (techMap[w.assigned_technician] ??= { name: w.assigned_technician, done: 0, hours: 0 }); if (["completed", "validated"].includes(w.status)) t.done++; t.hours += Number(w.actual_hours); }
    const riskDist = ["low", "medium", "high"].map((l) => ({ name: l, value: risks.filter((r) => riskLevel(r.score) === l).length }));
    const parts = sp.data ?? [];

    const alerts = [
      ...risks.filter((r) => riskLevel(r.score) === "high").map((r) => ({ tone: "critical", text: `${r.e.name}: predictive risk ${r.score}/100`, to: `/equipment/${r.e.id}` })),
      ...plans.filter((p) => p.active && p.next_due < today).map((p) => ({ tone: "overdue", text: `Preventive overdue: ${p.title}`, to: "/preventive" })),
      ...parts.filter((p) => stockState(p) !== "ok").map((p) => ({ tone: stockState(p), text: `${stockState(p) === "out" ? "Out of stock" : "Low stock"}: ${p.designation} (${p.quantity})`, to: "/inventory" })),
    ];
    return {
      equipment, breakdowns, orders, MTBF, MTTR, avail: availability(MTBF, MTTR), prevRate, cost, trend, statusDist, tech: Object.values(techMap), riskDist, alerts, latest, risks,
      atRisk: risks.filter((r) => riskLevel(r.score) !== "low").length,
      highRisk: risks.filter((r) => riskLevel(r.score) === "high"),
      parts, low: parts.filter((p) => stockState(p) !== "ok").length,
      recent: [...breakdowns.slice(0, 4).map((b) => ({ t: b.occurred_at, ref: b.reference, txt: b.description, s: b.status })), ...orders.slice(0, 4).map((w) => ({ t: w.created_at, ref: w.number, txt: w.description, s: w.status }))].sort((a, b) => b.t.localeCompare(a.t)).slice(0, 7),
    };
  }, [eq.data, bd.data, wo.data, pp.data, sp.data, sr.data, days, dept]);

  const depts = [...new Set((eq.data ?? []).flatMap((e) => [e.workshop]).filter(Boolean))];
  const cnt = (s: string) => d.equipment.filter((e) => e.status === s).length;
  const { t } = useLang();

  // Live IoT simulation: drifts around the latest stored readings (client-side only).
  const baseReadings = useMemo<LiveReading[]>(() => d.equipment.map((e) => {
    const r = d.latest.get(e.id);
    return { equipment_id: e.id, temperature: Number(r?.temperature ?? 45), vibration: Number(r?.vibration ?? 1), pressure: Number(r?.pressure ?? 6), hours: Number(e.operating_hours ?? 0), at: new Date().toISOString() };
  }), [d.equipment, d.latest]);
  const live = useLiveTelemetry(baseReadings);

  const topRisk = useMemo(() => [...d.risks].sort((a, b) => b.score - a.score), [d.risks]);
  const focusId = topRisk[0]?.e.id;
  const [series, setSeries] = useState<{ t: string; temperature: number; vibration: number }[]>([]);
  useEffect(() => { setSeries([]); }, [focusId]);
  useEffect(() => {
    const r = live.find((l) => l.equipment_id === focusId);
    if (!r) return;
    setSeries((s) => [...s.slice(-29), { t: new Date().toLocaleTimeString(), temperature: r.temperature, vibration: r.vibration }]);
  }, [live, focusId]);

  const OEE = oee(d.avail);
  const woOpen = d.orders.filter((w) => ["draft", "pending_approval", "scheduled"].includes(w.status)).length;
  const woProg = d.orders.filter((w) => ["in_progress", "waiting_parts"].includes(w.status)).length;
  const woDone = d.orders.filter((w) => ["completed", "validated"].includes(w.status)).length;
  const technicians = [...new Set(d.orders.map((w) => w.assigned_technician).filter(Boolean) as string[])];
  const focusEq = topRisk[0]?.e;
  const focusLive = live.find((l) => l.equipment_id === focusId);

  return (
    <div>
      <PageHeader title="Smart Maintenance Overview" subtitle="All indicators are calculated live from your maintenance records."
        actions={<>
          <select value={dept} onChange={(e) => setDept(e.target.value)} className="h-9 rounded-md border bg-card px-3 text-sm"><option value="">All workshops</option>{depts.map((x) => <option key={x}>{x}</option>)}</select>
          <select value={days} onChange={(e) => setDays(+e.target.value)} className="h-9 rounded-md border bg-card px-3 text-sm"><option value={30}>Last 30 days</option><option value={90}>Last 90 days</option><option value={180}>Last 6 months</option><option value={365}>Last 12 months</option></select>
        </>} />

      {/* Enterprise KPI row */}
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <div className="glass flex items-center gap-4 rounded-lg p-4">
          <div className="relative h-24 w-24 shrink-0">
            <svg viewBox="0 0 84 84" className="h-24 w-24 -rotate-90">
              <circle cx="42" cy="42" r="34" fill="none" stroke="var(--muted)" strokeWidth="8" />
              <circle cx="42" cy="42" r="34" fill="none" stroke="var(--primary)" strokeWidth="8" strokeLinecap="round"
                strokeDasharray={2 * Math.PI * 34} strokeDashoffset={2 * Math.PI * 34 * (1 - OEE)}
                style={{ filter: "drop-shadow(0 0 6px var(--primary))", transition: "stroke-dashoffset 0.6s" }} />
            </svg>
            <span className="absolute inset-0 flex items-center justify-center font-display text-lg font-bold tabular-nums">{fmt.pct(OEE)}</span>
          </div>
          <div>
            <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{t("Overall Equipment Effectiveness")}</div>
            <div className="mt-1 text-xs text-muted-foreground">{t("Availability × performance × quality")}</div>
          </div>
        </div>
        <div className="glass rounded-lg p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{t("Active Work Orders")}</span>
            <ClipboardList className="h-4 w-4 text-info" />
          </div>
          <div className="mt-2 font-display text-2xl font-bold tabular-nums">{woOpen + woProg}</div>
          <div className="mt-2 flex gap-3 font-mono text-[11px]">
            <span className="text-warning">{t("Pending")}: {woOpen}</span>
            <span className="text-info">{t("In progress")}: {woProg}</span>
            <span className="text-success">{t("Completed")}: {woDone}</span>
          </div>
        </div>
        <div className="glass rounded-lg p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{t("Predictive Risk Level")}</span>
            <ShieldAlert className="h-4 w-4 text-destructive" />
          </div>
          <div className="mt-2 font-display text-2xl font-bold tabular-nums">{d.highRisk.length}</div>
          <div className="mt-2 text-xs text-muted-foreground">{t("high-risk machines predicted to fail within 72 h")}</div>
        </div>
        <div className="glass rounded-lg p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">MTTR / MTBF</span>
            <Timer className="h-4 w-4 text-primary" />
          </div>
          <div className="mt-2 flex items-baseline gap-4">
            <span className="font-display text-2xl font-bold tabular-nums">{fmt.num(d.MTTR, 1)}<span className="text-sm font-normal text-muted-foreground"> h</span></span>
            <span className="font-display text-2xl font-bold tabular-nums text-primary">{fmt.num(d.MTBF)}<span className="text-sm font-normal text-muted-foreground"> h</span></span>
          </div>
          <div className="mt-2 text-xs text-muted-foreground">{t("Mean time to repair / between failures")}</div>
        </div>
      </div>

      {/* Live IoT telemetry */}
      <div className="mt-6 grid gap-4 lg:grid-cols-3">
        <Panel title={t("Live IoT Telemetry")} className="lg:col-span-1" action={<span className="flex items-center gap-1.5 font-mono text-[10px] uppercase text-success"><span className="h-1.5 w-1.5 rounded-full bg-success pulse-dot" />LIVE</span>}>
          <div className="space-y-3">
            {topRisk.slice(0, 4).map(({ e }) => {
              const r = live.find((l) => l.equipment_id === e.id);
              if (!r) return null;
              const lvl = (k: "temperature" | "vibration" | "pressure", v: number) => telemetryLevel(k, v);
              const cls = { normal: "text-success", warning: "text-warning", critical: "text-destructive" };
              return (
                <div key={e.id} className="rounded-md border bg-background/40 p-3">
                  <div className="mb-2 flex items-center justify-between">
                    <span className="text-sm font-medium">{e.name}</span>
                    <span className="font-mono text-[10px] text-muted-foreground">{fmt.num(r.hours)} h</span>
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-center">
                    <div><Thermometer className={cn("mx-auto h-3.5 w-3.5", cls[lvl("temperature", r.temperature)])} /><div className={cn("font-mono text-sm tabular-nums", cls[lvl("temperature", r.temperature)])}>{r.temperature.toFixed(1)}°</div></div>
                    <div><Vibrate className={cn("mx-auto h-3.5 w-3.5", cls[lvl("vibration", r.vibration)])} /><div className={cn("font-mono text-sm tabular-nums", cls[lvl("vibration", r.vibration)])}>{r.vibration.toFixed(2)}</div></div>
                    <div><Radio className={cn("mx-auto h-3.5 w-3.5", cls[lvl("pressure", r.pressure)])} /><div className={cn("font-mono text-sm tabular-nums", cls[lvl("pressure", r.pressure)])}>{Number(r.pressure).toFixed(1)}</div></div>
                  </div>
                </div>
              );
            })}
            {topRisk.length === 0 && <Empty text={t("No machines in the selected scope.")} />}
          </div>
        </Panel>
        <Panel title={`${t("Live Vibration vs Temperature")}${focusEq ? ` — ${focusEq.name}` : ""}`} className="lg:col-span-2">
          <ResponsiveContainer width="100%" height={260}>
            <LineChart data={series}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="t" fontSize={10} tickMargin={6} />
              <YAxis yAxisId="t" fontSize={11} domain={[0, 100]} />
              <YAxis yAxisId="v" orientation="right" fontSize={11} domain={[0, 6]} />
              <Tooltip {...tip} /><Legend />
              <ReferenceLine yAxisId="t" y={THRESHOLDS.temperature} stroke="var(--destructive)" strokeDasharray="4 4" label={{ value: `${THRESHOLDS.temperature}°C`, fill: "var(--destructive)", fontSize: 10 }} />
              <ReferenceLine yAxisId="v" y={THRESHOLDS.vibration} stroke="var(--warning)" strokeDasharray="4 4" />
              <Line yAxisId="t" dataKey="temperature" stroke={C[4]} dot={false} strokeWidth={2} name={t("Temperature (°C)")} isAnimationActive={false} />
              <Line yAxisId="v" dataKey="vibration" stroke={C[0]} dot={false} strokeWidth={2} name={t("Vibration (mm/s)")} isAnimationActive={false} />
            </LineChart>
          </ResponsiveContainer>
          {focusEq && topRisk[0] && riskLevel(topRisk[0].score) !== "low" && (
            <AiInsightBox className="mt-3" input={{ equipment: focusEq, score: topRisk[0].score, level: riskLevel(topRisk[0].score), last: focusLive, technicians }} />
          )}
        </Panel>
      </div>

      <div className="mt-6 grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-5">
        <KpiCard label="Total machines" value={d.equipment.length} icon={Cog} />
        <KpiCard label="Operational" value={cnt("operational")} icon={CheckCircle2} tone="success" />
        <KpiCard label="Under maintenance" value={cnt("under_maintenance")} icon={Wrench} tone="info" />
        <KpiCard label="In failure" value={cnt("failure")} icon={AlertTriangle} tone="destructive" />
        <KpiCard label="At risk" value={d.atRisk} icon={ShieldAlert} tone="warning" hint="Predictive score ≥ 40" />
        <KpiCard label="Open work orders" value={d.orders.filter((w) => !["completed", "validated", "cancelled"].includes(w.status)).length} icon={ClipboardList} />
        <KpiCard label="Completed interventions" value={d.orders.filter((w) => ["completed", "validated"].includes(w.status)).length} icon={CheckCircle2} tone="success" />
        <KpiCard label="Preventive completion" value={fmt.pct(d.prevRate)} icon={Gauge} />
        <KpiCard label="Breakdowns" value={d.breakdowns.length} icon={Zap} tone="destructive" />
        <KpiCard label="MTBF" value={fmt.num(d.MTBF) + " h"} icon={Timer} hint="Mean time between failures" />
        <KpiCard label="MTTR" value={fmt.num(d.MTTR, 1) + " h"} icon={Clock} hint="Mean time to repair" />
        <KpiCard label="Availability" value={fmt.pct(d.avail)} icon={Activity} tone="success" />
        <KpiCard label="Spare part refs" value={d.parts.length} icon={Boxes} />
        <KpiCard label="Low stock alerts" value={d.low} icon={PackageX} tone="warning" />
        <KpiCard label="Maintenance costs" value={fmt.money(d.cost)} icon={DollarSign} />
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-3">
        <Panel title="Breakdown evolution & downtime" className="lg:col-span-2">
          <ResponsiveContainer width="100%" height={240}>
            <AreaChart data={d.trend}><CartesianGrid strokeDasharray="3 3" stroke="var(--border)" /><XAxis dataKey="m" fontSize={12} /><YAxis fontSize={12} /><Tooltip {...tip} /><Legend />
              <Area dataKey="breakdowns" stroke={C[4]} fill={C[4]} fillOpacity={0.15} name="Breakdowns" />
              <Area dataKey="downtime" stroke={C[0]} fill={C[0]} fillOpacity={0.15} name="Downtime (h)" />
            </AreaChart>
          </ResponsiveContainer>
        </Panel>
        <Panel title="Machine status distribution">
          <ResponsiveContainer width="100%" height={240}>
            <PieChart><Pie data={d.statusDist} dataKey="value" nameKey="name" innerRadius={55} outerRadius={85} paddingAngle={3}>{d.statusDist.map((_, i) => <Cell key={i} fill={[C[1], C[0], C[4]][i]} />)}</Pie><Tooltip {...tip} /><Legend /></PieChart>
          </ResponsiveContainer>
        </Panel>
        <Panel title="MTBF & MTTR evolution">
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={d.trend}><CartesianGrid strokeDasharray="3 3" stroke="var(--border)" /><XAxis dataKey="m" fontSize={12} /><YAxis yAxisId="a" fontSize={12} /><YAxis yAxisId="b" orientation="right" fontSize={12} /><Tooltip {...tip} /><Legend />
              <Line yAxisId="a" dataKey="mtbf" stroke={C[0]} strokeWidth={2} name="MTBF (h)" /><Line yAxisId="b" dataKey="mttr" stroke={C[3]} strokeWidth={2} name="MTTR (h)" />
            </LineChart>
          </ResponsiveContainer>
        </Panel>
        <Panel title="Maintenance costs & activity">
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={d.trend}><CartesianGrid strokeDasharray="3 3" stroke="var(--border)" /><XAxis dataKey="m" fontSize={12} /><YAxis fontSize={12} /><Tooltip {...tip} /><Bar dataKey="cost" fill={C[2]} radius={[4, 4, 0, 0]} name="Cost ($)" /></BarChart>
          </ResponsiveContainer>
        </Panel>
        <Panel title="Predictive risk distribution">
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={d.riskDist}><CartesianGrid strokeDasharray="3 3" stroke="var(--border)" /><XAxis dataKey="name" fontSize={12} /><YAxis allowDecimals={false} fontSize={12} /><Tooltip {...tip} /><Bar dataKey="value" radius={[4, 4, 0, 0]} name="Machines">{d.riskDist.map((_, i) => <Cell key={i} fill={[C[1], C[3], C[4]][i]} />)}</Bar></BarChart>
          </ResponsiveContainer>
        </Panel>
        <Panel title="Technician performance">
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={d.tech} layout="vertical"><CartesianGrid strokeDasharray="3 3" stroke="var(--border)" /><XAxis type="number" fontSize={12} /><YAxis type="category" dataKey="name" width={80} fontSize={11} /><Tooltip {...tip} /><Legend /><Bar dataKey="done" fill={C[1]} name="Completed" /><Bar dataKey="hours" fill={C[0]} name="Hours" /></BarChart>
          </ResponsiveContainer>
        </Panel>
        <Panel title={`Intelligent alerts (${d.alerts.length})`}>
          <ul className="max-h-[220px] space-y-2 overflow-y-auto">
            {d.alerts.length === 0 && <Empty text="No active alerts." />}
            {d.alerts.map((a, i) => (
              <li key={i}><Link to={a.to as any} className="flex items-center gap-2 rounded-md border p-2 text-sm hover:bg-muted"><StatusBadge value={a.tone} /><span className="truncate">{a.text}</span></Link></li>
            ))}
          </ul>
        </Panel>
        <Panel title="Recent activity" className="lg:col-span-2">
          <ul className="divide-y">
            {d.recent.map((r) => (
              <li key={r.ref} className="flex items-center gap-3 py-2 text-sm">
                <span className="w-20 shrink-0 font-mono text-xs text-primary">{r.ref}</span>
                <span className="flex-1 truncate">{r.txt}</span>
                <StatusBadge value={r.s} />
                <span className="hidden w-24 text-right text-xs text-muted-foreground sm:block">{new Date(r.t).toLocaleDateString()}</span>
              </li>
            ))}
          </ul>
        </Panel>
      </div>
    </div>
  );
}
