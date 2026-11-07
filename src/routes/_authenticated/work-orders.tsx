import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { CheckCircle2, FileDown, Pencil, Plus, Send, XCircle } from "lucide-react";
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
  const { data, isLoading } = useRows("work_orders", { select: "*, equipment(code,name,criticality)", order: "created_at" });
  const eq = useRows("equipment", { order: "code", asc: true });
  const bd = useRows("breakdowns", { order: "occurred_at" });
  const save = useSave("work_orders");
  const { data: me } = useMe();
  const [status, setStatus] = useState("");
  const [priority, setPriority] = useState("");
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
  const canValidate = me?.can(PERMS.validate);
  const onSave = (id?: string) => async (v: any) => {
    const values: any = { ...v };
    if (v.status === "in_progress") values.start_date = new Date().toISOString();
    if (v.status === "completed") values.end_date = new Date().toISOString();
    await save.mutateAsync({ id, values });
  };
  /** Critical interventions (priority or machine criticality) require supervisor validation. */
  const isCritical = (w: any) => ["critical", "high"].includes(w.priority) || ["critical", "high"].includes(w.equipment?.criticality);
  const submitReport = (w: any) => async (v: any) => {
    await save.mutateAsync({
      id: w.id,
      values: {
        work_performed: v.work_performed, actual_hours: v.actual_hours, comments: v.comments,
        status: isCritical(w) ? "awaiting_validation" : "completed",
        submitted_at: new Date().toISOString(), end_date: new Date().toISOString(),
      },
    });
  };
  const validate = (w: any, ok: boolean) => async (v: any) => {
    await save.mutateAsync({
      id: w.id,
      values: ok
        ? { status: "validated", validation_comment: v.validation_comment, validated_by: me?.user.id, validated_at: new Date().toISOString() }
        : { status: "in_progress", validation_comment: v.validation_comment },
    });
  };
  const reportFields: Field[] = [
    { name: "work_performed", label: "Work performed", type: "textarea", required: true },
    { name: "actual_hours", label: "Actual duration (h)", type: "number", required: true },
    { name: "comments", label: "Technician comments", type: "textarea" },
  ];
  const commentField: Field[] = [{ name: "validation_comment", label: "Supervisor comment", type: "textarea", required: true }];
  const counts = Object.fromEntries(WO_STATUS.map((s) => [s, (data ?? []).filter((w) => w.status === s).length]));
  const filtered = (data ?? []).filter((w) => (!status || w.status === status) && (!priority || w.priority === priority));

  function exportPdf() {
    const rows = filtered.map((w) => `<tr><td>${w.number}</td><td>${w.equipment?.name ?? ""}</td><td>${w.description}</td><td>${w.priority}</td><td>${w.status.replace(/_/g, " ")}</td><td>${w.assigned_technician ?? "—"}</td><td>${w.planned_date ?? "—"}</td><td style="text-align:right">${fmt.money(Number(w.total_cost))}</td></tr>`).join("");
    const win = window.open("", "_blank");
    if (!win) return;
    win.document.write(`<html><head><title>Work Orders Report</title><style>body{font-family:system-ui;padding:24px;color:#111}h1{font-size:20px}table{width:100%;border-collapse:collapse;font-size:12px;margin-top:16px}th,td{border:1px solid #ccc;padding:6px 8px;text-align:left}th{background:#f0f0f0}</style></head><body><h1>Maintenix — Work Orders Report</h1><p>${new Date().toLocaleString()} — ${filtered.length} work orders</p><table><thead><tr><th>No.</th><th>Machine</th><th>Work</th><th>Priority</th><th>Status</th><th>Technician</th><th>Planned</th><th>Total</th></tr></thead><tbody>${rows}</tbody></table></body></html>`);
    win.document.close();
    win.print();
  }

  return (
    <div>
      <PageHeader title="Work Orders" subtitle="Draft → approval → scheduled → in progress → completed → validated."
        actions={<>
          <Button variant="outline" onClick={exportPdf}><FileDown className="h-4 w-4" />Export PDF</Button>
          {canEdit && <FormDialog title="New work order" fields={fields} initial={{ type: "corrective", priority: "medium", status: "draft" }} onSubmit={onSave()} trigger={<Button><Plus className="h-4 w-4" />New work order</Button>} />}
        </>} />
      <DataTable rows={filtered} loading={isLoading} searchKeys={["number", "description", "equipment.name", "assigned_technician"]}
        toolbar={<div className="flex flex-wrap items-center gap-1">
          <div className="flex flex-wrap gap-1">{["", ...WO_STATUS].map((s) => (
            <button key={s} onClick={() => setStatus(s)} className={cn("rounded-md px-2.5 py-1 text-xs capitalize", status === s ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-accent")}>{s ? `${s.replace(/_/g, " ")} (${counts[s]})` : "All"}</button>
          ))}</div>
          <span className="mx-1 h-4 w-px bg-border" />
          <div className="flex flex-wrap gap-1">{["", ...LEVELS].map((p) => (
            <button key={p} onClick={() => setPriority(p)} className={cn("rounded-md px-2.5 py-1 text-xs capitalize", priority === p ? "bg-warning text-warning-foreground" : "bg-muted text-muted-foreground hover:bg-accent")}>{p || "All urgencies"}</button>
          ))}</div>
        </div>}
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
          { key: "status", label: "Status", render: (r) => (
            <div className="flex flex-col gap-1">
              <StatusBadge value={r.status} />
              {r.validation_comment && r.status !== "validated" && <span className="max-w-[180px] truncate text-[10px] text-warning" title={r.validation_comment}>↩ {r.validation_comment}</span>}
            </div>
          ) },
          { key: "act", label: "", render: (r) => (
            <div className="flex gap-1">
              {canEdit && r.status === "in_progress" && (
                <FormDialog title={`Submit report — ${r.number}`} fields={reportFields} initial={r} onSubmit={submitReport(r)}
                  trigger={<Button size="sm" variant="outline" aria-label="Submit report"><Send className="h-3.5 w-3.5" />{isCritical(r) ? "Submit (validation)" : "Submit"}</Button>} />
              )}
              {canValidate && r.status === "awaiting_validation" && (
                <>
                  <FormDialog title={`Validate — ${r.number}`} fields={commentField} onSubmit={validate(r, true)}
                    trigger={<Button size="sm" aria-label="Validate"><CheckCircle2 className="h-3.5 w-3.5" />Validate</Button>} />
                  <FormDialog title={`Reject — ${r.number}`} fields={commentField} onSubmit={validate(r, false)}
                    trigger={<Button size="sm" variant="destructive" aria-label="Reject"><XCircle className="h-3.5 w-3.5" />Reject</Button>} />
                </>
              )}
              {canEdit && r.status !== "validated" && r.status !== "awaiting_validation" && (
                <FormDialog title={`Edit ${r.number}`} fields={fields} initial={r} onSubmit={onSave(r.id)} trigger={<Button size="icon" variant="ghost" aria-label="Edit"><Pencil className="h-4 w-4" /></Button>} />
              )}
            </div>
          ) },
        ]} />
    </div>
  );
}
