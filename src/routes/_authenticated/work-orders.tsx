import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Pencil, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageHeader, StatusBadge } from "@/components/common";
import { DataTable } from "@/components/data-table";
import { FormDialog, type Field } from "@/components/form-dialog";
import { useRows, useSave } from "@/lib/data";
import { PERMS, useMe } from "@/lib/auth";
import { LEVELS, WO_STATUS, WO_TYPES } from "@/lib/options";
import { fmt } from "@/lib/kpi";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/work-orders")({
  head: () => ({ meta: [{ title: "Work Orders — Maintenix" }, { name: "description", content: "Plan, execute and validate maintenance work orders." }, { property: "og:title", content: "Work Orders — Maintenix" }, { property: "og:description", content: "Work order management." }] }),
  component: WorkOrders,
});

function WorkOrders() {
  const { data, isLoading } = useRows("work_orders", { select: "*, equipment(code,name)", order: "created_at" });
  const eq = useRows("equipment", { order: "code", asc: true });
  const bd = useRows("breakdowns", { order: "occurred_at" });
  const save = useSave("work_orders");
  const { data: me } = useMe();
  const [status, setStatus] = useState("");
  const fields: Field[] = [
    { name: "equipment_id", label: "Machine", type: "select", options: (eq.data ?? []).map((e) => ({ value: e.id, label: `${e.code} — ${e.name}` })), required: true, full: true },
    { name: "breakdown_id", label: "Related breakdown", type: "select", options: (bd.data ?? []).filter((b) => b.status !== "closed").map((b) => ({ value: b.id, label: `${b.reference} — ${b.description}` })), full: true },
    { name: "description", label: "Work description", type: "textarea", required: true },
    { name: "type", label: "Type", type: "select", options: WO_TYPES, required: true },
    { name: "priority", label: "Priority", type: "select", options: LEVELS, required: true },
    { name: "status", label: "Status", type: "select", options: WO_STATUS, required: true },
    { name: "assigned_technician", label: "Assigned technician" },
    { name: "planned_date", label: "Planned date", type: "date" },
    { name: "estimated_hours", label: "Estimated duration (h)", type: "number" },
    { name: "actual_hours", label: "Actual duration (h)", type: "number" },
    { name: "labor_cost", label: "Labor cost ($)", type: "number" }, { name: "parts_cost", label: "Spare parts cost ($)", type: "number" },
    { name: "work_performed", label: "Work performed", type: "textarea" }, { name: "comments", label: "Technician comments", type: "textarea" },
  ];
  const canEdit = me?.can(PERMS.workOrders);
  const onSave = (id?: string) => async (v: any) => {
    const values: any = { ...v };
    if (v.status === "in_progress") values.start_date = new Date().toISOString();
    if (v.status === "completed") values.end_date = new Date().toISOString();
    await save.mutateAsync({ id, values });
  };
  const counts = Object.fromEntries(WO_STATUS.map((s) => [s, (data ?? []).filter((w) => w.status === s).length]));

  return (
    <div>
      <PageHeader title="Work Orders" subtitle="Draft → approval → scheduled → in progress → completed → validated."
        actions={canEdit && <FormDialog title="New work order" fields={fields} initial={{ type: "corrective", priority: "medium", status: "draft" }} onSubmit={onSave()} trigger={<Button><Plus className="h-4 w-4" />New work order</Button>} />} />
      <DataTable rows={(data ?? []).filter((w) => !status || w.status === status)} loading={isLoading} searchKeys={["number", "description", "equipment.name", "assigned_technician"]}
        toolbar={<div className="flex flex-wrap gap-1">{["", ...WO_STATUS].map((s) => (
          <button key={s} onClick={() => setStatus(s)} className={cn("rounded-md px-2.5 py-1 text-xs capitalize", status === s ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-accent")}>{s ? `${s.replace(/_/g, " ")} (${counts[s]})` : "All"}</button>
        ))}</div>}
        cols={[
          { key: "number", label: "No.", render: (r) => <span className="font-mono text-xs text-primary">{r.number}</span> },
          { key: "equipment", label: "Machine", render: (r) => r.equipment?.name },
          { key: "description", label: "Work", render: (r) => <span className="line-clamp-1 max-w-xs">{r.description}</span> },
          { key: "type", label: "Type", render: (r) => <span className="capitalize">{r.type}</span> },
          { key: "priority", label: "Priority", render: (r) => <StatusBadge value={r.priority} /> },
          { key: "assigned_technician", label: "Technician" },
          { key: "planned_date", label: "Planned" },
          { key: "hours", label: "Est/Act h", className: "tabular-nums", render: (r) => `${r.estimated_hours} / ${r.actual_hours}` },
          { key: "total_cost", label: "Total", className: "text-right tabular-nums", render: (r) => fmt.money(Number(r.total_cost)) },
          { key: "status", label: "Status", render: (r) => <StatusBadge value={r.status} /> },
          { key: "act", label: "", render: (r) => canEdit && <FormDialog title={`Edit ${r.number}`} fields={fields} initial={r} onSubmit={onSave(r.id)} trigger={<Button size="icon" variant="ghost" aria-label="Edit"><Pencil className="h-4 w-4" /></Button>} /> },
        ]} />
    </div>
  );
}
