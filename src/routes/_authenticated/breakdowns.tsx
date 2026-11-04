import { createFileRoute } from "@tanstack/react-router";
import { useMemo } from "react";
import { Pencil, Plus, Repeat } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageHeader, Panel, StatusBadge } from "@/components/common";
import { DataTable } from "@/components/data-table";
import { FormDialog, type Field } from "@/components/form-dialog";
import { useRows, useSave } from "@/lib/data";
import { PERMS, useMe } from "@/lib/auth";
import { BD_CATEGORIES, BD_STATUS, LEVELS } from "@/lib/options";
import { fmt } from "@/lib/kpi";

export const Route = createFileRoute("/_authenticated/breakdowns")({
  head: () => ({ meta: [{ title: "Breakdowns — Maintenix" }, { name: "description", content: "Report and track equipment breakdowns." }, { property: "og:title", content: "Breakdowns — Maintenix" }, { property: "og:description", content: "Breakdown reporting." }] }),
  component: Breakdowns,
});

function Breakdowns() {
  const { data, isLoading } = useRows("breakdowns", { select: "*, equipment(code,name)", order: "occurred_at" });
  const eq = useRows("equipment", { order: "code", asc: true });
  const save = useSave("breakdowns", ["equipment"]);
  const { data: me } = useMe();
  const eqOpts = (eq.data ?? []).map((e) => ({ value: e.id, label: `${e.code} — ${e.name}` }));

  const report: Field[] = [
    { name: "equipment_id", label: "Machine", type: "select", options: eqOpts, required: true, full: true },
    { name: "description", label: "Description", type: "textarea", required: true },
    { name: "occurred_at", label: "Date & time", type: "datetime-local", required: true },
    { name: "failure_category", label: "Failure category", type: "select", options: BD_CATEGORIES, required: true },
    { name: "failure_mode", label: "Failure mode" }, { name: "suspected_cause", label: "Suspected cause" },
    { name: "severity", label: "Severity", type: "select", options: LEVELS, required: true },
    { name: "priority", label: "Priority", type: "select", options: LEVELS, required: true },
    { name: "production_impact", label: "Production impact", full: true },
  ];
  const manage: Field[] = [
    ...report.slice(1),
    { name: "status", label: "Status", type: "select", options: BD_STATUS, required: true },
    { name: "assigned_technician", label: "Assigned technician" },
    { name: "downtime_hours", label: "Downtime (h)", type: "number" }, { name: "repair_cost", label: "Repair cost ($)", type: "number" },
    { name: "resolution", label: "Resolution", type: "textarea" },
  ];

  const recurring = useMemo(() => {
    const m: Record<string, { key: string; n: number; eq: string; mode: string }> = {};
    for (const b of data ?? []) {
      if (Date.now() - new Date(b.occurred_at).getTime() > 365 * 864e5) continue;
      const k = b.equipment_id + "|" + (b.failure_category);
      (m[k] ??= { key: k, n: 0, eq: b.equipment?.name, mode: b.failure_category }).n++;
    }
    return Object.values(m).filter((x) => x.n >= 2).sort((a, b) => b.n - a.n);
  }, [data]);

  return (
    <div>
      <PageHeader title="Breakdowns" subtitle="Every report is linked to the machine's history automatically."
        actions={me?.can(PERMS.breakdownReport) && <FormDialog title="Report a breakdown" fields={report}
          initial={{ occurred_at: new Date().toISOString().slice(0, 16), severity: "medium", priority: "medium", failure_category: "Mechanical" }}
          onSubmit={async (v) => {
            await save.mutateAsync({ values: { ...v, occurred_at: new Date(v["occurred_at"]).toISOString(), reported_by: me.user.id, reporter_name: me.profile?.full_name } });
          }}
          trigger={<Button variant="destructive"><Plus className="h-4 w-4" />Report breakdown</Button>} />} />

      {recurring.length > 0 && (
        <Panel title="Recurring failures (last 12 months)" className="mb-4" action={<Repeat className="h-4 w-4 text-warning" />}>
          <div className="flex flex-wrap gap-2">{recurring.map((r) => <span key={r.key} className="rounded-md border bg-warning/10 px-2.5 py-1 text-sm"><b>{r.eq}</b> · {r.mode} · {r.n}×</span>)}</div>
        </Panel>
      )}

      <DataTable rows={data} loading={isLoading} searchKeys={["reference", "description", "equipment.name", "status", "failure_category"]}
        cols={[
          { key: "reference", label: "Ref", render: (r) => <span className="font-mono text-xs text-primary">{r.reference}</span> },
          { key: "occurred_at", label: "Date", render: (r) => new Date(r.occurred_at).toLocaleString(undefined, { dateStyle: "short", timeStyle: "short" }) },
          { key: "equipment", label: "Machine", render: (r) => r.equipment?.name },
          { key: "description", label: "Description", render: (r) => <span className="line-clamp-1 max-w-xs">{r.description}</span> },
          { key: "failure_category", label: "Category" },
          { key: "severity", label: "Severity", render: (r) => <StatusBadge value={r.severity} /> },
          { key: "downtime_hours", label: "Downtime", className: "text-right tabular-nums", render: (r) => r.downtime_hours + " h" },
          { key: "repair_cost", label: "Cost", className: "text-right tabular-nums", render: (r) => fmt.money(Number(r.repair_cost)) },
          { key: "status", label: "Status", render: (r) => <StatusBadge value={r.status} /> },
          { key: "act", label: "", render: (r) => me?.can(PERMS.breakdownUpdate) && (
            <span onClick={(e) => e.stopPropagation()}>
              <FormDialog title={`Update ${r.reference}`} fields={manage} initial={{ ...r, occurred_at: r.occurred_at.slice(0, 16) }}
                onSubmit={async (v) => { const { equipment, ...rest } = v; await save.mutateAsync({ id: r.id, values: { ...rest, occurred_at: new Date(v["occurred_at"]).toISOString() } }); }}
                trigger={<Button size="icon" variant="ghost" aria-label="Edit"><Pencil className="h-4 w-4" /></Button>} />
            </span>) },
        ]} />
    </div>
  );
}
