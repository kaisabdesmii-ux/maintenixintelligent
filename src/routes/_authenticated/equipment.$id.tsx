import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, Pencil } from "lucide-react";
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis, Legend } from "recharts";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Empty, KpiCard, Panel, StatusBadge } from "@/components/common";
import { FormDialog } from "@/components/form-dialog";
import { useRows, useSave } from "@/lib/data";
import { PERMS, useMe } from "@/lib/auth";
import { availability, fmt, mtbf, mttr, riskScore } from "@/lib/kpi";
import { empiricalReliability, timesBetweenFailures, weibullFit, weibullMedianTbf, weibullR } from "@/lib/weibull";
import { useLang } from "@/lib/i18n";
import { Activity, Clock, DollarSign, Timer } from "lucide-react";
import { EQ_FIELDS } from "@/lib/fields";

export const Route = createFileRoute("/_authenticated/equipment/$id")({
  head: () => ({ meta: [{ title: "Equipment record — Maintenix" }, { name: "description", content: "Machine technical record, history and reliability." }, { property: "og:title", content: "Equipment record — Maintenix" }, { property: "og:description", content: "Machine technical record." }] }),
  component: Detail,
});

function Detail() {
  const { id } = Route.useParams();
  const eq = useRows("equipment", { eq: ["id", id] });
  const bd = useRows("breakdowns", { eq: ["equipment_id", id], order: "occurred_at" });
  const wo = useRows("work_orders", { eq: ["equipment_id", id], order: "created_at" });
  const sr = useRows("sensor_readings", { eq: ["equipment_id", id], order: "recorded_at", asc: true });
  const fm = useRows("fmea_items", { eq: ["equipment_id", id] });
  const save = useSave("equipment");
  const { data: me } = useMe();
  const e = eq.data?.[0];
  if (!e) return <Empty text={eq.isLoading ? "Loading…" : "Equipment not found."} />;

  const b = bd.data ?? [];
  const since = e.commissioning_date ? (Date.now() - new Date(e.commissioning_date).getTime()) / 36e5 : 8760;
  const period = Math.min(since, 365 * 24);
  const yearB = b.filter((x) => Date.now() - new Date(x.occurred_at).getTime() < 365 * 864e5);
  const MTBF = mtbf(yearB, period), MTTR = mttr(yearB);
  const cost = b.reduce((s, x) => s + Number(x.repair_cost), 0) + (wo.data ?? []).reduce((s, x) => s + Number(x.total_cost ?? 0), 0);
  const readings = (sr.data ?? []).map((r) => ({ ...r, t: new Date(r.recorded_at).toLocaleDateString(undefined, { month: "short", day: "numeric" }) }));
  const risk = readings.length ? riskScore(readings[readings.length - 1]) : 0;
  const tbf = timesBetweenFailures(b.map((x) => x.occurred_at));
  const wb = weibullFit(tbf);
  const empirical = empiricalReliability(tbf);
  const tMax = wb ? Math.max(wb.eta * 1.5, ...tbf) : 0;
  const curve = wb
    ? Array.from({ length: 41 }, (_, i) => {
        const t = (tMax / 40) * i;
        const emp = empirical.filter((p) => p.t <= t).pop();
        return { t: Math.round(t), weibull: +weibullR(t, wb).toFixed(3), real: emp ? emp.r : i === 0 ? 1 : undefined };
      })
    : [];
  const history = [...b.map((x) => ({ t: x.occurred_at, k: "Breakdown", ref: x.reference, txt: x.description, s: x.status })), ...(wo.data ?? []).map((x) => ({ t: x.end_date ?? x.created_at, k: "Work order", ref: x.number, txt: x.description, s: x.status }))].sort((a, c) => c.t.localeCompare(a.t));

  const info: [string, any][] = [["Manufacturer", e.manufacturer], ["Brand", e.brand], ["Model", e.model], ["Serial number", e.serial_number], ["Year", e.year_manufactured], ["Commissioned", e.commissioning_date], ["Location", e.location], ["Workshop", e.workshop], ["Department", e.department], ["Category", e.category], ["Responsible operator", e.responsible_operator], ["Operating hours", Number(e.operating_hours).toLocaleString()]];

  return (
    <div>
      <Link to="/equipment" className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"><ArrowLeft className="h-4 w-4" />Equipment</Link>
      <div className="mb-6 flex flex-wrap items-start gap-5">
        {e.image_url ? <img src={e.image_url} alt={e.name} className="h-24 w-24 rounded-lg border object-cover" /> : <div className="blueprint flex h-24 w-24 items-center justify-center rounded-lg border bg-muted font-mono text-xs text-muted-foreground">{e.category.split(" ")[0]}</div>}
        <div className="flex-1">
          <div className="font-mono text-xs text-primary">{e.code}</div>
          <h1 className="text-2xl font-bold md:text-3xl">{e.name}</h1>
          <div className="mt-2 flex gap-2"><StatusBadge value={e.status} /><StatusBadge value={e.criticality} /></div>
        </div>
        {me?.can(PERMS.equipment) && <FormDialog title="Edit equipment" fields={EQ_FIELDS} initial={e} onSubmit={(v) => save.mutateAsync({ id: e.id, values: v })} trigger={<Button variant="outline"><Pencil className="h-4 w-4" />Edit</Button>} />}
      </div>

      <div className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-5">
        <KpiCard label="MTBF (12 mo)" value={fmt.num(MTBF) + " h"} icon={Timer} />
        <KpiCard label="MTTR" value={fmt.num(MTTR, 1) + " h"} icon={Clock} />
        <KpiCard label="Availability" value={fmt.pct(availability(MTBF, MTTR))} icon={Activity} tone="success" />
        <KpiCard label="Predictive risk" value={risk + "/100"} icon={Activity} tone={risk >= 70 ? "destructive" : risk >= 40 ? "warning" : "success"} />
        <KpiCard label="Maintenance cost" value={fmt.money(cost)} icon={DollarSign} />
      </div>

      <Tabs defaultValue="info">
        <TabsList className="flex-wrap">
          <TabsTrigger value="info">Technical</TabsTrigger><TabsTrigger value="history">History</TabsTrigger>
          <TabsTrigger value="bd">Breakdowns ({b.length})</TabsTrigger><TabsTrigger value="wo">Work orders ({wo.data?.length ?? 0})</TabsTrigger>
          <TabsTrigger value="sensors">Sensors</TabsTrigger><TabsTrigger value="reliability">Reliability</TabsTrigger><TabsTrigger value="fmea">AMDEC</TabsTrigger>
        </TabsList>
        <TabsContent value="info">
          <Panel title="Technical information">
            <dl className="grid gap-x-6 gap-y-3 sm:grid-cols-2 lg:grid-cols-3">{info.map(([k, v]) => <div key={k}><dt className="text-xs text-muted-foreground">{k}</dt><dd className="text-sm font-medium">{v ?? "—"}</dd></div>)}</dl>
            {e.specifications && <p className="mt-4 border-t pt-3 text-sm"><span className="text-xs text-muted-foreground">Specifications: </span>{e.specifications}</p>}
          </Panel>
        </TabsContent>
        <TabsContent value="history">
          <Panel title="Chronological history">
            <ol className="relative ml-2 border-l">
              {history.map((h) => (
                <li key={h.ref} className="mb-4 ml-4">
                  <span className="absolute -left-1.5 mt-1.5 h-3 w-3 rounded-full border-2 border-card bg-primary" />
                  <div className="text-xs text-muted-foreground">{new Date(h.t).toLocaleString()} · {h.k} · <span className="font-mono">{h.ref}</span></div>
                  <div className="flex items-center gap-2 text-sm">{h.txt} <StatusBadge value={h.s} /></div>
                </li>
              ))}
              {!history.length && <Empty text="No history yet." />}
            </ol>
          </Panel>
        </TabsContent>
        <TabsContent value="bd"><SimpleList rows={b} cols={["reference", "occurred_at", "description", "failure_mode", "downtime_hours", "status"]} /></TabsContent>
        <TabsContent value="wo"><SimpleList rows={wo.data ?? []} cols={["number", "type", "description", "assigned_technician", "total_cost", "status"]} /></TabsContent>
        <TabsContent value="sensors">
          <Panel title="Sensor measurements">
            {readings.length ? (
              <ResponsiveContainer width="100%" height={280}>
                <LineChart data={readings}><CartesianGrid strokeDasharray="3 3" stroke="var(--border)" /><XAxis dataKey="t" fontSize={11} /><YAxis yAxisId="a" fontSize={11} /><YAxis yAxisId="b" orientation="right" fontSize={11} /><Tooltip /><Legend />
                  <Line yAxisId="a" dataKey="temperature" stroke="var(--chart-5)" dot={false} name="Temp (°C)" /><Line yAxisId="b" dataKey="vibration" stroke="var(--chart-1)" dot={false} name="Vibration (mm/s)" />
                </LineChart>
              </ResponsiveContainer>
            ) : <Empty text="No readings." />}
          </Panel>
        </TabsContent>
        <TabsContent value="reliability">
          <Panel title="Failure curves — real history vs Weibull model">
            {!wb ? (
              <div className="py-6 text-center">
                <p className="text-sm text-muted-foreground">{b.length < 4 ? "Insufficient data: a Weibull estimate needs at least 4 recorded breakdowns (3 intervals)." : "Weibull estimation not possible on these intervals."}</p>
                <p className="mt-2 text-xs text-muted-foreground">Options: record more breakdowns, enter historical data manually, or use the industrial reference catalog (estimates are always labeled as such).</p>
              </div>
            ) : (
              <>
                <div className="mb-3 grid grid-cols-2 gap-3 md:grid-cols-4">
                  <KpiCard label="β (shape)" value={wb.beta} icon={Activity} hint={wb.beta < 1 ? "Infant mortality" : wb.beta > 1 ? "Wear-out failures" : "Random failures"} />
                  <KpiCard label="η (scale)" value={fmt.num(wb.eta) + " h"} icon={Timer} />
                  <KpiCard label="Median TBF" value={fmt.num(weibullMedianTbf(wb)) + " h"} icon={Clock} />
                  <KpiCard label="Next failure est." value={b.length ? new Date(new Date(b[b.length - 1].occurred_at).getTime() + weibullMedianTbf(wb) * 36e5).toLocaleDateString() : "—"} icon={Activity} tone="warning" hint="Statistical estimate, not a certainty" />
                </div>
                <ResponsiveContainer width="100%" height={280}>
                  <LineChart data={curve}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                    <XAxis dataKey="t" fontSize={11} label={{ value: "Operating hours since last failure", position: "insideBottom", offset: -2, fontSize: 11 }} />
                    <YAxis domain={[0, 1]} fontSize={11} />
                    <Tooltip contentStyle={{ background: "var(--popover)", border: "1px solid var(--border)", borderRadius: 8, fontSize: 12 }} formatter={(v: any) => (typeof v === "number" ? (v * 100).toFixed(0) + "%" : v)} />
                    <Legend />
                    <Line dataKey="real" stroke="var(--chart-1)" strokeWidth={2} dot={{ r: 3 }} connectNulls name="Real history (measured)" />
                    <Line dataKey="weibull" stroke="var(--chart-5)" strokeWidth={2} strokeDasharray="6 4" dot={false} name="Weibull R(t) — statistical model" />
                  </LineChart>
                </ResponsiveContainer>
                <p className="mt-2 text-xs text-muted-foreground">Solid line: real measured reliability from recorded breakdowns. Dashed line: Weibull statistical model fitted on {wb.n} intervals — an estimate, never a measured fact.</p>
              </>
            )}
          </Panel>
        </TabsContent>
        <TabsContent value="fmea"><SimpleList rows={fm.data ?? []} cols={["function_name", "failure_mode", "severity", "occurrence", "detection", "rpn", "action"]} /></TabsContent>
      </Tabs>
    </div>
  );
}

function SimpleList({ rows, cols }: { rows: any[]; cols: string[] }) {
  if (!rows.length) return <Empty text="No records." />;
  return (
    <div className="overflow-x-auto rounded-lg border bg-card">
      <table className="w-full text-sm">
        <thead><tr className="border-b bg-muted/50 text-left text-xs uppercase text-muted-foreground">{cols.map((c) => <th key={c} className="px-3 py-2 font-medium">{c.replace(/_/g, " ")}</th>)}</tr></thead>
        <tbody>{rows.map((r) => <tr key={r.id} className="border-b last:border-0">{cols.map((c) => <td key={c} className="px-3 py-2">{c === "status" ? <StatusBadge value={r[c]} /> : c.endsWith("_at") ? new Date(r[c]).toLocaleDateString() : String(r[c] ?? "—")}</td>)}</tr>)}</tbody>
      </table>
    </div>
  );
}
