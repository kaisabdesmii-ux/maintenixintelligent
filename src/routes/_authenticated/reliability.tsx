import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Pencil, Plus, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageHeader, Panel, StatusBadge } from "@/components/common";
import { DataTable } from "@/components/data-table";
import { FormDialog, type Field } from "@/components/form-dialog";
import { useRows, useSave } from "@/lib/data";
import { PERMS, useMe } from "@/lib/auth";
import { availability, fmt, mtbf, mttr } from "@/lib/kpi";
import { useLang } from "@/lib/i18n";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/reliability")({
  head: () => ({ meta: [{ title: "Reliability & AMDEC — Maintenix" }, { name: "description", content: "MTBF ranking and AMDEC (GOD) risk analysis." }, { property: "og:title", content: "Reliability & AMDEC — Maintenix" }, { property: "og:description", content: "Reliability engineering." }] }),
  component: Reliability,
});

const ACTION_STATUS = ["open", "in_progress", "done"];

function useThresholds() {
  const read = (k: string, d: number) => { const v = Number(localStorage.getItem(k)); return v > 0 ? v : d; };
  const [crit, setCrit] = useState(() => read("god_crit", 200));
  const [high, setHigh] = useState(() => read("god_high", 120));
  const save = (c: number, h: number) => {
    setCrit(c); setHigh(h);
    try { localStorage.setItem("god_crit", String(c)); localStorage.setItem("god_high", String(h)); } catch {}
  };
  return { crit, high, save };
}

function Reliability() {
  const eq = useRows("equipment", { order: "code", asc: true });
  const bd = useRows("breakdowns", { order: "occurred_at" });
  const fm = useRows("fmea_items", { select: "*, equipment(name)" });
  const save = useSave("fmea_items");
  const { data: me } = useMe();
  const { t } = useLang();
  const { crit, high, save: saveThresholds } = useThresholds();
  const [eqFilter, setEqFilter] = useState("");

  const godLevel = (v: number): "low" | "medium" | "high" | "critical" =>
    v >= crit ? "critical" : v >= high ? "high" : v >= high / 2 ? "medium" : "low";

  const ranking = useMemo(() => (eq.data ?? []).map((e) => {
    const b = (bd.data ?? []).filter((x) => x.equipment_id === e.id && Date.now() - new Date(x.occurred_at).getTime() < 365 * 864e5);
    const M = mtbf(b, 8760), R = mttr(b);
    return { id: e.id, name: e.name, failures: b.length, mtbf: M, mttr: R, avail: availability(M, R), rate: b.length / 8760 * 1000 };
  }).sort((a, b) => b.failures - a.failures), [eq.data, bd.data]);

  const fmeaRows = useMemo(() =>
    [...(fm.data ?? [])]
      .filter((r) => !eqFilter || r.equipment_id === eqFilter)
      .map((r) => ({ ...r, god: r.severity * r.occurrence * r.detection }))
      .sort((a, b) => b.god - a.god),
    [fm.data, eqFilter]);

  const fields: Field[] = [
    { name: "equipment_id", label: "Machine", type: "select", options: (eq.data ?? []).map((e) => ({ value: e.id, label: e.name })), required: true, full: true },
    { name: "function_name", label: "Function", required: true }, { name: "failure_mode", label: "Failure mode", required: true },
    { name: "effects", label: "Failure effects" }, { name: "causes", label: "Potential causes" },
    { name: "severity", label: "Severity G (1-10)", type: "number", required: true }, { name: "occurrence", label: "Occurrence O (1-10)", type: "number", required: true },
    { name: "detection", label: "Detection D (1-10) — high = hard to detect", type: "number", required: true }, { name: "owner", label: "Action owner" },
    { name: "deadline", label: "Deadline", type: "date" }, { name: "action", label: "Recommended action", type: "textarea" },
    { name: "action_status", label: "Action status", type: "select", options: ACTION_STATUS },
  ];

  const canEdit = me?.can(PERMS.fmea);

  /** Rules-based action proposal (not ML) for high-GOD lines, to be validated by a manager. */
  function proposeAction(r: any) {
    const parts: string[] = [];
    if (r.severity >= 8) parts.push("Critical impact: plan an immediate inspection and a risk-reduction action.");
    if (r.occurrence >= 7) parts.push("Frequent mode: add a periodic preventive task and monitor the trend.");
    if (r.detection >= 7) parts.push("Hard to detect: install a sensor/indicator or add an inspection point to catch it earlier.");
    if (!parts.length) parts.push("Apply the standard corrective action and review at the next maintenance meeting.");
    parts.push(`Suggested owner: maintenance manager. Suggested deadline: ${new Date(Date.now() + 14 * 864e5).toISOString().slice(0, 10)}.`);
    return parts.join(" ");
  }

  return (
    <div>
      <PageHeader title="Reliability & AMDEC" subtitle="Indicators over the last 12 months (8 760 h per machine)." />
      <Panel title="Equipment reliability ranking" className="mb-6">
        <div className="overflow-x-auto"><table className="w-full text-sm">
          <thead><tr className="border-b text-left text-xs uppercase text-muted-foreground"><th className="py-2">Machine</th><th>Failures</th><th>MTBF</th><th>MTTR</th><th>Avail.</th><th>λ /1000h</th></tr></thead>
          <tbody>{ranking.map((r) => (
            <tr key={r.id} className="border-b last:border-0 tabular-nums">
              <td className="py-2 font-medium"><Link to="/equipment/$id" params={{ id: r.id }} className="hover:text-primary hover:underline">{r.name}</Link></td>
              <td>{r.failures}</td><td>{fmt.num(r.mtbf)} h</td><td>{fmt.num(r.mttr, 1)} h</td><td>{fmt.pct(r.avail)}</td><td>{r.rate.toFixed(2)}</td>
            </tr>))}
          </tbody>
        </table></div>
      </Panel>

      <PageHeader title="AMDEC / FMEA" subtitle="GOD = G × O × D (1-10 each). A high D means the failure is hard to detect."
        actions={canEdit && <FormDialog title="New AMDEC line" fields={fields} initial={{ severity: 5, occurrence: 5, detection: 5, action_status: "open" }} onSubmit={(v) => save.mutateAsync({ values: { ...v, rpn: v.severity * v.occurrence * v.detection } })} trigger={<Button><Plus className="h-4 w-4" />{t("Add failure mode")}</Button>} />} />

      <div className="mb-4 flex flex-wrap items-center gap-3 rounded-lg border bg-card p-3 text-sm">
        <span className="text-xs uppercase tracking-wide text-muted-foreground">{t("Thresholds")}</span>
        <label className="flex items-center gap-1 text-xs">{t("Critical ≥")} <input type="number" defaultValue={crit} onBlur={(e) => saveThresholds(+e.target.value || 200, high)} className="h-8 w-20 rounded-md border bg-background px-2" /></label>
        <label className="flex items-center gap-1 text-xs">{t("High ≥")} <input type="number" defaultValue={high} onBlur={(e) => saveThresholds(crit, +e.target.value || 120)} className="h-8 w-20 rounded-md border bg-background px-2" /></label>
        <span className="mx-1 h-4 w-px bg-border" />
        <select value={eqFilter} onChange={(e) => setEqFilter(e.target.value)} className="h-8 rounded-md border bg-background px-2 text-xs">
          <option value="">{t("All machines")}</option>
          {(eq.data ?? []).map((e) => <option key={e.id} value={e.id}>{e.name}</option>)}
        </select>
      </div>

      <DataTable rows={fmeaRows} loading={fm.isLoading} searchKeys={["failure_mode", "function_name", "equipment.name"]}
        cols={[
          { key: "equipment", label: "Machine", render: (r) => r.equipment?.name },
          { key: "function_name", label: "Function" },
          { key: "failure_mode", label: "Failure mode", render: (r) => <span className="font-medium">{r.failure_mode}</span> },
          { key: "effects", label: "Effects" }, { key: "causes", label: "Causes" },
          { key: "god3", label: "G·O·D", className: "font-mono", render: (r) => `${r.severity}·${r.occurrence}·${r.detection}` },
          { key: "god", label: "GOD", render: (r) => (
            <span className={cn("flex items-center gap-2 font-mono font-bold", godLevel(r.god) === "critical" && "text-destructive", godLevel(r.god) === "high" && "text-warning", godLevel(r.god) === "low" && "text-success")}>
              {r.god}<StatusBadge value={godLevel(r.god)} />
            </span>
          ) },
          { key: "action", label: "Action", render: (r) => <span className="line-clamp-2 max-w-xs text-xs">{r.action}</span> },
          { key: "owner", label: "Owner" }, { key: "deadline", label: "Deadline" },
          { key: "action_status", label: "Action status", render: (r) => <StatusBadge value={r.action_status} /> },
          { key: "act", label: "", render: (r) => canEdit && (
            <div className="flex gap-1">
              <Button size="icon" variant="ghost" aria-label="Propose action" title={t("Generate action plan (rules-based proposal)")}
                onClick={() => save.mutate({ id: r.id, values: { action: proposeAction(r), action_status: r.action_status === "done" ? "done" : "open" } })}>
                <Sparkles className="h-4 w-4 text-primary" />
              </Button>
              <FormDialog title={`Edit AMDEC — ${r.failure_mode}`} fields={fields} initial={r} onSubmit={(v) => save.mutateAsync({ id: r.id, values: { ...v, rpn: v.severity * v.occurrence * v.detection } })} trigger={<Button size="icon" variant="ghost" aria-label="Edit"><Pencil className="h-4 w-4" /></Button>} />
            </div>
          ) },
        ]} />
    </div>
  );
}
