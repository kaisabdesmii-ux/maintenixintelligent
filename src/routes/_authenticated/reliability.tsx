import { createFileRoute } from "@tanstack/react-router";
import { useMemo } from "react";
import { Plus } from "lucide-react";
import { Bar, CartesianGrid, ComposedChart, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Button } from "@/components/ui/button";
import { PageHeader, Panel, StatusBadge } from "@/components/common";
import { DataTable } from "@/components/data-table";
import { FormDialog, type Field } from "@/components/form-dialog";
import { useRows, useSave } from "@/lib/data";
import { PERMS, useMe } from "@/lib/auth";
import { availability, fmt, mtbf, mttr, rpnLevel } from "@/lib/kpi";

export const Route = createFileRoute("/_authenticated/reliability")({
  head: () => ({ meta: [{ title: "Reliability & AMDEC — Maintenix" }, { name: "description", content: "MTBF ranking, Pareto analysis and FMEA risk priority." }, { property: "og:title", content: "Reliability & AMDEC — Maintenix" }, { property: "og:description", content: "Reliability engineering." }] }),
  component: Reliability,
});

function Reliability() {
  const eq = useRows("equipment", { order: "code", asc: true });
  const bd = useRows("breakdowns", { order: "occurred_at" });
  const fm = useRows("fmea_items", { select: "*, equipment(name)" });
  const save = useSave("fmea_items");
  const { data: me } = useMe();

  const ranking = useMemo(() => (eq.data ?? []).map((e) => {
    const b = (bd.data ?? []).filter((x) => x.equipment_id === e.id && Date.now() - new Date(x.occurred_at).getTime() < 365 * 864e5);
    const M = mtbf(b, 8760), R = mttr(b);
    return { id: e.id, name: e.name, failures: b.length, mtbf: M, mttr: R, avail: availability(M, R), rate: b.length / 8760 * 1000 };
  }).sort((a, b) => b.failures - a.failures), [eq.data, bd.data]);

  const pareto = useMemo(() => {
    const m: Record<string, number> = {};
    for (const b of bd.data ?? []) m[b.failure_mode ?? b.failure_category] = (m[b.failure_mode ?? b.failure_category] ?? 0) + Number(b.downtime_hours);
    const arr = Object.entries(m).map(([k, v]) => ({ k, v })).sort((a, b) => b.v - a.v);
    const total = arr.reduce((s, x) => s + x.v, 0) || 1;
    let cum = 0;
    return arr.map((x) => ({ ...x, cum: +((cum += x.v) / total * 100).toFixed(1) }));
  }, [bd.data]);

  const fields: Field[] = [
    { name: "equipment_id", label: "Machine", type: "select", options: (eq.data ?? []).map((e) => ({ value: e.id, label: e.name })), required: true, full: true },
    { name: "function_name", label: "Function", required: true }, { name: "failure_mode", label: "Failure mode", required: true },
    { name: "effects", label: "Failure effects" }, { name: "causes", label: "Potential causes" },
    { name: "severity", label: "Severity G (1-10)", type: "number", required: true }, { name: "occurrence", label: "Occurrence F (1-10)", type: "number", required: true },
    { name: "detection", label: "Detection D (1-10)", type: "number", required: true }, { name: "owner", label: "Action owner" },
    { name: "deadline", label: "Deadline", type: "date" }, { name: "action", label: "Recommended action", type: "textarea" },
  ];

  return (
    <div>
      <PageHeader title="Reliability & AMDEC" subtitle="Indicators over the last 12 months (8 760 h per machine)." />
      <div className="grid gap-4 lg:grid-cols-2">
        <Panel title="Pareto — downtime by failure mode">
          <ResponsiveContainer width="100%" height={260}>
            <ComposedChart data={pareto}><CartesianGrid strokeDasharray="3 3" stroke="var(--border)" /><XAxis dataKey="k" fontSize={10} interval={0} angle={-30} textAnchor="end" height={60} /><YAxis yAxisId="a" fontSize={11} /><YAxis yAxisId="b" orientation="right" domain={[0, 100]} fontSize={11} /><Tooltip />
              <Bar yAxisId="a" dataKey="v" fill="var(--chart-1)" name="Downtime (h)" radius={[4, 4, 0, 0]} /><Line yAxisId="b" dataKey="cum" stroke="var(--chart-5)" name="Cumulative %" />
            </ComposedChart>
          </ResponsiveContainer>
        </Panel>
        <Panel title="Equipment reliability ranking">
          <div className="overflow-x-auto"><table className="w-full text-sm">
            <thead><tr className="border-b text-left text-xs uppercase text-muted-foreground"><th className="py-2">Machine</th><th>Failures</th><th>MTBF</th><th>MTTR</th><th>Avail.</th><th>λ /1000h</th></tr></thead>
            <tbody>{ranking.map((r) => <tr key={r.id} className="border-b last:border-0 tabular-nums"><td className="py-2 font-medium">{r.name}</td><td>{r.failures}</td><td>{fmt.num(r.mtbf)} h</td><td>{fmt.num(r.mttr, 1)} h</td><td>{fmt.pct(r.avail)}</td><td>{r.rate.toFixed(2)}</td></tr>)}</tbody>
          </table></div>
        </Panel>
      </div>
      <div className="mt-6">
        <PageHeader title="AMDEC / FMEA" subtitle="RPN (IPR) = G × F × D. Critical ≥ 200, high ≥ 120."
          actions={me?.can(PERMS.fmea) && <FormDialog title="New AMDEC line" fields={fields} initial={{ severity: 5, occurrence: 5, detection: 5 }} onSubmit={(v) => save.mutateAsync({ values: v })} trigger={<Button><Plus className="h-4 w-4" />Add failure mode</Button>} />} />
        <DataTable rows={[...(fm.data ?? [])].sort((a, b) => b.rpn - a.rpn)} loading={fm.isLoading} searchKeys={["failure_mode", "function_name", "equipment.name"]}
          cols={[
            { key: "equipment", label: "Machine", render: (r) => r.equipment?.name },
            { key: "function_name", label: "Function" }, { key: "failure_mode", label: "Failure mode", render: (r) => <span className="font-medium">{r.failure_mode}</span> },
            { key: "effects", label: "Effects" }, { key: "causes", label: "Causes" },
            { key: "gfd", label: "G·F·D", className: "font-mono", render: (r) => `${r.severity}·${r.occurrence}·${r.detection}` },
            { key: "rpn", label: "RPN", render: (r) => <span className="flex items-center gap-2 font-mono font-bold">{r.rpn}<StatusBadge value={rpnLevel(r.rpn)} /></span> },
            { key: "action", label: "Action" }, { key: "owner", label: "Owner" }, { key: "deadline", label: "Deadline" },
          ]} />
      </div>
    </div>
  );
}
