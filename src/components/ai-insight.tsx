import { Sparkles, Wand2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { FormDialog, type Field } from "@/components/form-dialog";
import { useSave } from "@/lib/data";
import { PERMS, useMe } from "@/lib/auth";
import { useLang } from "@/lib/i18n";
import { cn } from "@/lib/utils";

export type InsightInput = {
  equipment: { id: string; code: string; name: string };
  score: number;
  level: "low" | "medium" | "high";
  last?: { temperature?: number | null; vibration?: number | null; pressure?: number | null } | null;
  technicians?: string[];
};

/** Rule-based AI-style insight text from the dominant anomaly. */
export function buildInsight({ equipment, score, level, last }: InsightInput): { text: string; action: string; part: string } {
  const tempHigh = Number(last?.temperature ?? 0) >= 75;
  const vibHigh = Number(last?.vibration ?? 0) >= 3.2;
  const days = level === "high" ? 3 : 7;
  if (vibHigh && (!tempHigh || Number(last?.vibration) / 4.5 > Number(last?.temperature) / 85)) {
    return {
      text: `Bearing degradation detected on ${equipment.name}. ${score}% probability of failure within ${days} days.`,
      action: "Lubricate or replace bearing; verify shaft alignment.",
      part: "Bearing kit + industrial lubricant",
    };
  }
  if (tempHigh) {
    return {
      text: `Thermal overload pattern on ${equipment.name}. ${score}% probability of failure within ${days} days.`,
      action: "Inspect cooling circuit, clean exchangers, check fan and coolant level.",
      part: "Coolant + air filters",
    };
  }
  return {
    text: `Early wear signature on ${equipment.name}. ${score}% probability of failure within ${days} days.`,
    action: "Schedule a full inspection at the next preventive window.",
    part: "Standard inspection kit",
  };
}

export function AiInsightBox({ input, className }: { input: InsightInput; className?: string }) {
  const { data: me } = useMe();
  const save = useSave("work_orders");
  const { t } = useLang();
  if (input.level === "low") return null;
  const insight = buildInsight(input);
  const canEdit = me?.can(PERMS.workOrders);

  const fields: Field[] = [
    { name: "equipment_id", label: "Machine", type: "select", options: [{ value: input.equipment.id, label: `${input.equipment.code} — ${input.equipment.name}` }], required: true, full: true },
    { name: "description", label: "Work description", type: "textarea", required: true },
    { name: "type", label: "Type", type: "select", options: ["corrective", "preventive", "inspection"], required: true },
    { name: "priority", label: "Priority", type: "select", options: ["low", "medium", "high", "critical"], required: true },
    { name: "status", label: "Status", type: "select", options: ["draft", "pending_approval", "scheduled"], required: true },
    { name: "assigned_technician", label: "Assigned technician", type: "select", options: (input.technicians ?? []).map((n) => ({ value: n, label: n })) },
    { name: "planned_date", label: "Planned date", type: "date" },
    { name: "estimated_hours", label: "Estimated duration (h)", type: "number" },
    { name: "comments", label: "Suggested spare parts", type: "textarea" },
  ];

  return (
    <div className={cn("rounded-lg border border-primary/40 bg-primary/5 p-4 glow-primary", className)}>
      <div className="flex items-center gap-2 text-sm font-semibold text-primary">
        <Sparkles className="h-4 w-4" />{t("AI Insight")}
      </div>
      <p className="mt-2 text-sm">{insight.text}</p>
      <p className="mt-1 text-sm text-muted-foreground"><b className="text-foreground">{t("Recommended Action")}:</b> {insight.action}</p>
      {canEdit && (
        <FormDialog
          title={`${t("AI Work Order")} — ${input.equipment.name}`}
          fields={fields}
          initial={{
            equipment_id: input.equipment.id,
            description: `[AI] ${insight.text} ${insight.action}`,
            type: "corrective",
            priority: input.level === "high" ? "critical" : "high",
            status: "draft",
            planned_date: new Date(Date.now() + 864e5).toISOString().slice(0, 10),
            estimated_hours: 2,
            comments: insight.part,
          }}
          onSubmit={(v) => save.mutateAsync({ values: v })}
          trigger={<Button size="sm" className="mt-3"><Wand2 className="h-4 w-4" />{t("Generate AI Work Order")}</Button>}
        />
      )}
    </div>
  );
}
