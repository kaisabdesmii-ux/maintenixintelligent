import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Bar, CartesianGrid, ComposedChart, Line, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis, Cell } from "recharts";
import { FileDown, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Empty, PageHeader, Panel, StatusBadge } from "@/components/common";
import { useRows } from "@/lib/data";
import { pareto } from "@/lib/weibull";
import { fmt } from "@/lib/kpi";
import { useLang } from "@/lib/i18n";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/pareto")({
  head: () => ({ meta: [{ title: "Pareto Analysis — Maintenix" }, { name: "description", content: "Pareto analysis of breakdowns by count and downtime." }, { property: "og:title", content: "Pareto Analysis — Maintenix" }, { property: "og:description", content: "Pareto breakdown analysis." }] }),
  component: ParetoPage,
});

const tip = { contentStyle: { background: "var(--popover)", border: "1px solid var(--border)", borderRadius: 8, fontSize: 12 } };
type Dimension = "machine" | "type" | "cause";
type Metric = "count" | "downtime";

function ParetoPage() {
  const bd = useRows("breakdowns", { select: "*, equipment(name,code)", order: "occurred_at" });
  const eq = useRows("equipment", { order: "code", asc: true });
  const { t } = useLang();
  const [dim, setDim] = useState<Dimension>("machine");
  const [metric, setMetric] = useState<Metric>("count");
  const [days, setDays] = useState(365);
  const [machine, setMachine] = useState("");
  const [selected, setSelected] = useState<string | null>(null);

  const d = useMemo(() => {
    const since = days > 0 ? Date.now() - days * 864e5 : 0;
    // Exclude cancelled/duplicate-prone rows; open breakdowns keep their recorded downtime only.
    const rows = (bd.data ?? []).filter((b) => b.status !== "cancelled" && new Date(b.occurred_at).getTime() >= since && (!machine || b.equipment_id === machine));
    const keyOf = (b: any): string =>
      dim === "machine" ? (b.equipment?.name ?? "—") : dim === "type" ? (b.failure_mode || b.failure_category || "—") : (b.suspected_cause || b.failure_category || "—");
    const values: Record<string, number> = {};
    for (const b of rows) {
      const k = keyOf(b);
      values[k] = (values[k] ?? 0) + (metric === "count" ? 1 : Number(b.downtime_hours ?? 0));
    }
    const rowsP = pareto(values);
    return { rows, rowsP, total: rowsP.reduce((s, r) => s + r.value, 0) };
  }, [bd.data, dim, metric, days, machine]);

  const matching = selected ? d.rows.filter((b) => {
    const k = dim === "machine" ? (b.equipment?.name ?? "—") : dim === "type" ? (b.failure_mode || b.failure_category || "—") : (b.suspected_cause || b.failure_category || "—");
    return k === selected;
  }) : [];

  function exportPdf() {
    const rows = d.rowsP.map((r) => `<tr><td>${r.key}</td><td style="text-align:right">${metric === "count" ? r.value : r.value.toFixed(1) + " h"}</td><td style="text-align:right">${r.pct}%</td><td style="text-align:right">${r.cum}%</td><td>${r.in80 ? "●" : ""}</td></tr>`).join("");
    const win = window.open("", "_blank");
    if (!win) return;
    win.document.write(`<html><head><title>Pareto Report</title><style>body{font-family:system-ui;padding:24px;color:#111}h1{font-size:20px}table{width:100%;border-collapse:collapse;font-size:12px;margin-top:16px}th,td{border:1px solid #ccc;padding:6px 8px;text-align:left}th{background:#f0f0f0}</style></head><body><h1>Maintenix — Pareto ${metric === "count" ? "breakdown count" : "downtime"} by ${dim}</h1><p>${new Date().toLocaleString()} — ${d.rows.length} breakdowns, period: ${days > 0 ? days + " days" : "all"}</p><table><thead><tr><th>Category</th><th>Value</th><th>%</th><th>Cumulative %</th><th>80% set</th></tr></thead><tbody>${rows}</tbody></table></body></html>`);
    win.document.close();
    win.print();
  }

  const dimBtn = (v: Dimension, label: string) => (
    <button key={v} onClick={() => { setDim(v); setSelected(null); }} className={cn("rounded-md px-3 py-1.5 text-xs", dim === v ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-accent")}>{t(label)}</button>
  );

  return (
    <div>
      <PageHeader title="Pareto Analysis" subtitle="80/20 breakdown analysis — real records only, cancelled events excluded."
        actions={<Button variant="outline" onClick={exportPdf}><FileDown className="h-4 w-4" />{t("Export PDF")}</Button>} />

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <div className="flex gap-1">{dimBtn("machine", "Machine")}{dimBtn("type", "Failure type")}{dimBtn("cause", "Cause")}</div>
        <span className="mx-1 h-4 w-px bg-border" />
        <div className="flex gap-1">
          <button onClick={() => setMetric("count")} className={cn("rounded-md px-3 py-1.5 text-xs", metric === "count" ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-accent")}>{t("By count")}</button>
          <button onClick={() => setMetric("downtime")} className={cn("rounded-md px-3 py-1.5 text-xs", metric === "downtime" ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-accent")}>{t("By downtime")}</button>
        </div>
        <span className="mx-1 h-4 w-px bg-border" />
        <select value={days} onChange={(e) => setDays(+e.target.value)} className="h-9 rounded-md border bg-card px-3 text-sm">
          <option value={30}>{t("Last 30 days")}</option><option value={90}>{t("Last 90 days")}</option><option value={180}>{t("Last 6 months")}</option><option value={365}>{t("Last 12 months")}</option><option value={0}>{t("All time")}</option>
        </select>
        <select value={machine} onChange={(e) => setMachine(e.target.value)} className="h-9 rounded-md border bg-card px-3 text-sm">
          <option value="">{t("All machines")}</option>
          {(eq.data ?? []).map((e) => <option key={e.id} value={e.id}>{e.name}</option>)}
        </select>
      </div>

      {bd.isLoading ? (
        <Panel title="Pareto"><Empty text="Loading…" /></Panel>
      ) : d.rowsP.length === 0 ? (
        <Panel title="Pareto"><Empty text="No breakdown data for this selection. Pareto requires real recorded events." /></Panel>
      ) : (
        <>
          <Panel title={metric === "count" ? "Pareto — number of breakdowns" : "Pareto — downtime hours"} action={<span className="text-xs text-muted-foreground">{d.rows.length} {t("breakdowns")} · {metric === "downtime" ? fmt.num(d.total, 1) + " h" : d.total}</span>}>
            <ResponsiveContainer width="100%" height={320}>
              <ComposedChart data={d.rowsP} onClick={(s: any) => s?.activeLabel && setSelected(s.activeLabel)}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="key" fontSize={10} interval={0} angle={-30} textAnchor="end" height={70} />
                <YAxis yAxisId="a" fontSize={11} label={{ value: metric === "count" ? t("Breakdowns") : t("Hours"), angle: -90, position: "insideLeft", fontSize: 11 }} />
                <YAxis yAxisId="b" orientation="right" domain={[0, 100]} fontSize={11} unit="%" />
                <Tooltip {...tip} formatter={(v: any, name: any) => [name === "cum" ? v + "%" : metric === "downtime" ? v + " h" : v, name === "cum" ? t("Cumulative %") : metric === "count" ? t("Breakdowns") : t("Downtime (h)")]} />
                <ReferenceLine yAxisId="b" y={80} stroke="var(--chart-4)" strokeDasharray="6 4" label={{ value: "80%", fill: "var(--chart-4)", fontSize: 11 }} />
                <Bar yAxisId="a" dataKey="value" radius={[4, 4, 0, 0]} cursor="pointer" onClick={(p: any) => p?.key && setSelected(p.key)}>
                  {d.rowsP.map((r, i) => <Cell key={i} fill={r.in80 ? "var(--chart-5)" : "var(--chart-1)"} opacity={selected && selected !== r.key ? 0.35 : 1} />)}
                </Bar>
                <Line yAxisId="b" dataKey="cum" stroke="var(--chart-2)" strokeWidth={2} dot={{ r: 3 }} />
              </ComposedChart>
            </ResponsiveContainer>
            <p className="mt-2 text-xs text-muted-foreground">{t("Red bars are the vital few categories reaching 80%. Click a bar to list its breakdowns.")}</p>
          </Panel>

          <div className="mt-4 grid gap-4 lg:grid-cols-2">
            <Panel title={t("Category detail")}>
              <div className="overflow-x-auto"><table className="w-full text-sm">
                <thead><tr className="border-b text-left text-xs uppercase text-muted-foreground"><th className="py-2">{t("Category")}</th><th className="text-right">{metric === "count" ? t("Count") : t("Downtime")}</th><th className="text-right">%</th><th className="text-right">{t("Cum. %")}</th><th>80%</th></tr></thead>
                <tbody>{d.rowsP.map((r) => (
                  <tr key={r.key} onClick={() => setSelected(r.key)} className={cn("cursor-pointer border-b last:border-0 tabular-nums hover:bg-muted/40", selected === r.key && "bg-muted/60")}>
                    <td className="py-2 font-medium">{r.key}</td><td className="text-right">{metric === "count" ? r.value : fmt.num(r.value, 1) + " h"}</td><td className="text-right">{r.pct}%</td><td className="text-right">{r.cum}%</td>
                    <td>{r.in80 && <span className="inline-block h-2 w-2 rounded-full bg-destructive" />}</td>
                  </tr>))}
                </tbody>
              </table></div>
            </Panel>
            <Panel title={selected ? `${t("Breakdowns")} — ${selected}` : t("Breakdowns")} action={selected && (dim === "machine" && matching[0]?.equipment_id
              ? <Button asChild size="sm" variant="outline"><Link to="/equipment/$id" params={{ id: matching[0].equipment_id }}><ExternalLink className="h-4 w-4" />{t("Open equipment sheet")}</Link></Button>
              : <Button asChild size="sm" variant="outline"><Link to="/breakdowns"><ExternalLink className="h-4 w-4" />{t("Open breakdowns")}</Link></Button>)}>
              {!selected ? <Empty text="Click a bar or a row to see the matching breakdowns." /> : (
                <ul className="max-h-[320px] divide-y overflow-y-auto">
                  {matching.map((b) => (
                    <li key={b.id}><Link to="/equipment/$id" params={{ id: b.equipment_id }} className="flex items-center gap-3 rounded py-2 text-sm hover:bg-muted/40">
                      <span className="w-20 shrink-0 font-mono text-xs text-primary">{b.reference}</span>
                      <span className="flex-1 truncate">{b.description}</span>
                      <span className="text-xs text-muted-foreground">{fmt.num(Number(b.downtime_hours), 1)} h</span>
                      <StatusBadge value={b.status} />
                    </Link></li>
                  ))}
                </ul>
              )}
            </Panel>
          </div>
        </>
      )}
    </div>
  );
}
