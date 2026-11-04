import { createFileRoute } from "@tanstack/react-router";
import { CalendarCheck, Plus, Wand2 } from "lucide-react";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { KpiCard, PageHeader, StatusBadge } from "@/components/common";
import { DataTable } from "@/components/data-table";
import { FormDialog, type Field } from "@/components/form-dialog";
import { useRows, useSave } from "@/lib/data";
import { PERMS, useMe } from "@/lib/auth";
import { FREQ } from "@/lib/options";
import { supabase } from "@/integrations/supabase/client";
import { AlarmClock, CalendarClock, CheckCircle2 } from "lucide-react";

export const Route = createFileRoute("/_authenticated/preventive")({
  head: () => ({ meta: [{ title: "Preventive Maintenance — Maintenix" }, { name: "description", content: "Preventive plans, calendar and overdue alerts." }, { property: "og:title", content: "Preventive Maintenance — Maintenix" }, { property: "og:description", content: "Preventive maintenance plans." }] }),
  component: Preventive,
});

const addDays = (d: string, n: number) => { const x = new Date(d); x.setDate(x.getDate() + n); return x.toISOString().slice(0, 10); };

function Preventive() {
  const { data, isLoading } = useRows("preventive_plans", { select: "*, equipment(code,name)", order: "next_due", asc: true });
  const eq = useRows("equipment", { order: "code", asc: true });
  const save = useSave("preventive_plans");
  const qc = useQueryClient();
  const { data: me } = useMe();
  const today = new Date().toISOString().slice(0, 10);
  const soon = addDays(today, 7);
  const state = (p: any) => (p.next_due < today ? "overdue" : p.next_due <= soon ? "due_soon" : "scheduled");
  const fields: Field[] = [
    { name: "equipment_id", label: "Machine", type: "select", options: (eq.data ?? []).map((e) => ({ value: e.id, label: `${e.code} — ${e.name}` })), required: true, full: true },
    { name: "title", label: "Plan title", required: true, full: true },
    { name: "frequency", label: "Frequency", type: "select", options: FREQ.map(([f]) => f), required: true },
    { name: "next_due", label: "Next due date", type: "date", required: true },
    { name: "checklist", label: "Checklist (separate items with ;)", type: "textarea" },
  ];

  async function generate(p: any) {
    const { error } = await supabase.from("work_orders").insert({ equipment_id: p.equipment_id, plan_id: p.id, type: "preventive", description: `${p.title} — ${p.checklist ?? ""}`, status: "scheduled", planned_date: p.next_due, priority: state(p) === "overdue" ? "high" : "medium" });
    if (error) return void toast.error(error.message.includes("row-level") ? "Your role is not allowed to do this." : error.message);
    const { error: e2 } = await supabase.from("preventive_plans").update({ last_done: today, next_due: addDays(today, p.interval_days) }).eq("id", p.id);
    if (e2) return void toast.error(e2.message);
    toast.success("Work order generated, next due " + addDays(today, p.interval_days));
    qc.invalidateQueries({ queryKey: ["preventive_plans"] }); qc.invalidateQueries({ queryKey: ["work_orders"] });
  }

  const rows = data ?? [];
  return (
    <div>
      <PageHeader title="Preventive Maintenance" subtitle="Generate work orders from plans; the next due date rolls forward automatically."
        actions={me?.can(PERMS.preventive) && <FormDialog title="New preventive plan" fields={fields} initial={{ frequency: "monthly", next_due: today }}
          onSubmit={(v) => save.mutateAsync({ values: { ...v, interval_days: FREQ.find(([f]) => f === v["frequency"])?.[1] ?? 30 } })}
          trigger={<Button><Plus className="h-4 w-4" />New plan</Button>} />} />
      <div className="mb-4 grid grid-cols-2 gap-3 md:grid-cols-4">
        <KpiCard label="Active plans" value={rows.filter((p) => p.active).length} icon={CalendarClock} />
        <KpiCard label="Overdue" value={rows.filter((p) => state(p) === "overdue").length} icon={AlarmClock} tone="destructive" />
        <KpiCard label="Due in 7 days" value={rows.filter((p) => state(p) === "due_soon").length} icon={CalendarCheck} tone="warning" />
        <KpiCard label="On schedule" value={rows.filter((p) => state(p) === "scheduled").length} icon={CheckCircle2} tone="success" />
      </div>
      <DataTable rows={rows} loading={isLoading} searchKeys={["title", "equipment.name", "frequency"]}
        cols={[
          { key: "equipment", label: "Machine", render: (r) => <span><span className="font-mono text-xs text-primary">{r.equipment?.code}</span> {r.equipment?.name}</span> },
          { key: "title", label: "Plan", render: (r) => <span className="font-medium">{r.title}</span> },
          { key: "frequency", label: "Frequency", render: (r) => <span className="capitalize">{r.frequency}</span> },
          { key: "checklist", label: "Checklist", render: (r) => <span className="line-clamp-1 max-w-xs text-muted-foreground">{r.checklist}</span> },
          { key: "last_done", label: "Last done" }, { key: "next_due", label: "Next due" },
          { key: "state", label: "State", render: (r) => <StatusBadge value={state(r) === "due_soon" ? "medium" : state(r)} /> },
          { key: "act", label: "", render: (r) => me?.can(PERMS.preventive) && <Button size="sm" variant="outline" onClick={() => generate(r)}><Wand2 className="h-3.5 w-3.5" />Generate WO</Button> },
        ]} />
    </div>
  );
}
