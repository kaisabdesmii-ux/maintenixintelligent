import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Plus, Upload } from "lucide-react";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { CartesianGrid, Line, LineChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Button } from "@/components/ui/button";
import { PageHeader, Panel, StatusBadge } from "@/components/common";
import { FormDialog, type Field } from "@/components/form-dialog";
import { useRows, useSave } from "@/lib/data";
import { PERMS, useMe } from "@/lib/auth";
import { riskLevel, riskScore, THRESHOLDS } from "@/lib/kpi";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/predictive")({
  head: () => ({ meta: [{ title: "Predictive Maintenance — Maintenix" }, { name: "description", content: "Sensor trends, anomaly detection and risk levels." }, { property: "og:title", content: "Predictive Maintenance — Maintenix" }, { property: "og:description", content: "Predictive maintenance." }] }),
  component: Predictive,
});

const ACTIONS: Record<string, string> = {
  high: "Schedule inspection within 24h; check bearings, lubrication and cooling.",
  medium: "Increase monitoring frequency; plan inspection at next preventive window.",
  low: "Normal condition. Continue routine monitoring.",
};

function Predictive() {
  const eq = useRows("equipment", { order: "code", asc: true });
  const sr = useRows("sensor_readings", { order: "recorded_at", asc: true });
  const save = useSave("sensor_readings");
  const qc = useQueryClient();
  const { data: me } = useMe();
  const [sel, setSel] = useState<string | null>(null);

  const cards = useMemo(() => (eq.data ?? []).map((e) => {
    const rs = (sr.data ?? []).filter((r) => r.equipment_id === e.id);
    const last = rs[rs.length - 1];
    const score = last ? riskScore(last) : 0;
    const anomalies = rs.filter((r) => Number(r.temperature) > THRESHOLDS.temperature || Number(r.vibration) > THRESHOLDS.vibration).length;
    return { e, rs, last, score, level: riskLevel(score), anomalies };
  }).sort((a, b) => b.score - a.score), [eq.data, sr.data]);

  const active = cards.find((c) => c.e.id === sel) ?? cards[0];
  const fields: Field[] = [
    { name: "equipment_id", label: "Machine", type: "select", options: (eq.data ?? []).map((e) => ({ value: e.id, label: `${e.code} — ${e.name}` })), required: true, full: true },
    { name: "temperature", label: "Temperature (°C)", type: "number" }, { name: "vibration", label: "Vibration (mm/s)", type: "number" },
    { name: "pressure", label: "Pressure (bar)", type: "number" }, { name: "current_a", label: "Current (A)", type: "number" },
  ];

  async function importCsv(file: File) {
    const text = await file.text();
    const [head, ...lines] = text.trim().split(/\r?\n/);
    const cols = head.split(",").map((c) => c.trim());
    const byCode = new Map((eq.data ?? []).map((e) => [e.code, e.id]));
    const rows = lines.map((l) => Object.fromEntries(l.split(",").map((v, i) => [cols[i], v.trim()]))).map((r: any) => ({
      equipment_id: byCode.get(r.equipment_code), recorded_at: r.recorded_at || new Date().toISOString(),
      temperature: r.temperature ? +r.temperature : null, vibration: r.vibration ? +r.vibration : null, pressure: r.pressure ? +r.pressure : null, current_a: r.current_a ? +r.current_a : null,
    })).filter((r) => r.equipment_id);
    if (!rows.length) return toast.error("No valid rows. Expected columns: equipment_code,recorded_at,temperature,vibration,pressure,current_a");
    const { error } = await supabase.from("sensor_readings").insert(rows as any);
    if (error) return toast.error(error.message);
    toast.success(`${rows.length} readings imported`);
    qc.invalidateQueries({ queryKey: ["sensor_readings"] });
  }

  return (
    <div>
      <PageHeader title="Predictive Maintenance" subtitle={`Risk combines temperature (limit ${THRESHOLDS.temperature}°C) and vibration (limit ${THRESHOLDS.vibration} mm/s).`}
        actions={me?.can(PERMS.sensors) && <>
          <label className="inline-flex h-9 cursor-pointer items-center gap-2 rounded-md border bg-card px-3 text-sm hover:bg-muted"><Upload className="h-4 w-4" />Import CSV
            <input type="file" accept=".csv" className="hidden" onChange={(e) => e.target.files?.[0] && importCsv(e.target.files[0])} /></label>
          <FormDialog title="Manual reading" fields={fields} onSubmit={(v) => save.mutateAsync({ values: v })} trigger={<Button><Plus className="h-4 w-4" />Add reading</Button>} />
        </>} />
      <div className="grid gap-4 lg:grid-cols-[320px_1fr]">
        <div className="space-y-2">
          {cards.map((c) => (
            <button key={c.e.id} onClick={() => setSel(c.e.id)} className={cn("w-full rounded-lg border bg-card p-3 text-left transition-colors hover:border-primary", active?.e.id === c.e.id && "border-primary ring-1 ring-primary")}>
              <div className="flex items-center justify-between"><span className="text-sm font-medium">{c.e.name}</span><StatusBadge value={c.level} /></div>
              <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-muted"><div className={cn("h-full", c.level === "high" ? "bg-destructive" : c.level === "medium" ? "bg-warning" : "bg-success")} style={{ width: `${c.score}%` }} /></div>
              <div className="mt-1 flex justify-between font-mono text-[11px] text-muted-foreground"><span>risk {c.score}/100</span><span>{c.anomalies} anomalies</span></div>
            </button>
          ))}
        </div>
        {active && (
          <div className="space-y-4">
            <Panel title={`${active.e.name} — current condition`} action={<Link to="/equipment/$id" params={{ id: active.e.id }} className="text-xs text-primary hover:underline">Open record →</Link>}>
              <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                {[["Temperature", active.last?.temperature, "°C"], ["Vibration", active.last?.vibration, "mm/s"], ["Pressure", active.last?.pressure, "bar"], ["Current", active.last?.current_a, "A"]].map(([l, v, u]) => (
                  <div key={l as string} className="rounded-md bg-muted p-3"><div className="text-xs text-muted-foreground">{l}</div><div className="font-display text-xl font-bold tabular-nums">{v != null ? Number(v).toFixed(1) : "—"} <span className="text-xs font-normal">{u}</span></div></div>
                ))}
              </div>
              <p className="mt-3 rounded-md border-l-4 border-primary bg-accent/50 p-3 text-sm"><b>Suggested action:</b> {ACTIONS[active.level]}</p>
            </Panel>
            <Panel title="Temperature trend">
              <ResponsiveContainer width="100%" height={200}><LineChart data={active.rs.map((r) => ({ ...r, t: new Date(r.recorded_at).toLocaleDateString(undefined, { month: "short", day: "numeric" }) }))}><CartesianGrid strokeDasharray="3 3" stroke="var(--border)" /><XAxis dataKey="t" fontSize={11} /><YAxis fontSize={11} /><Tooltip /><ReferenceLine y={THRESHOLDS.temperature} stroke="var(--destructive)" strokeDasharray="4 4" /><Line dataKey="temperature" stroke="var(--chart-5)" dot={false} /></LineChart></ResponsiveContainer>
            </Panel>
            <Panel title="Vibration trend">
              <ResponsiveContainer width="100%" height={200}><LineChart data={active.rs.map((r) => ({ ...r, t: new Date(r.recorded_at).toLocaleDateString(undefined, { month: "short", day: "numeric" }) }))}><CartesianGrid strokeDasharray="3 3" stroke="var(--border)" /><XAxis dataKey="t" fontSize={11} /><YAxis fontSize={11} /><Tooltip /><ReferenceLine y={THRESHOLDS.vibration} stroke="var(--destructive)" strokeDasharray="4 4" /><Line dataKey="vibration" stroke="var(--chart-1)" dot={false} /></LineChart></ResponsiveContainer>
            </Panel>
          </div>
        )}
      </div>
    </div>
  );
}
