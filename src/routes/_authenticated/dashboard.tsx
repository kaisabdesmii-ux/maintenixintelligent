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

  return (
    <div>
      <PageHeader title="Smart Maintenance Overview" subtitle="All indicators are calculated live from your maintenance records."
        actions={<>
          <select value={dept} onChange={(e) => setDept(e.target.value)} className="h-9 rounded-md border bg-card px-3 text-sm"><option value="">All workshops</option>{depts.map((x) => <option key={x}>{x}</option>)}</select>
          <select value={days} onChange={(e) => setDays(+e.target.value)} className="h-9 rounded-md border bg-card px-3 text-sm"><option value={30}>Last 30 days</option><option value={90}>Last 90 days</option><option value={180}>Last 6 months</option><option value={365}>Last 12 months</option></select>
        </>} />

      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-5">
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
