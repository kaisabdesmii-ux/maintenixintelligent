import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { LayoutGrid, Map as MapIcon, Plus, Table2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageHeader, StatusBadge } from "@/components/common";
import { DataTable } from "@/components/data-table";
import { FormDialog } from "@/components/form-dialog";
import { FloorMap } from "@/components/floor-map";
import { EQ_FIELDS } from "@/lib/fields";
import { useRows, useSave } from "@/lib/data";
import { PERMS, useMe } from "@/lib/auth";
import { healthScore, riskLevel, riskScore } from "@/lib/kpi";
import { useLang } from "@/lib/i18n";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/equipment/")({
  head: () => ({ meta: [{ title: "Equipment — Maintenix" }, { name: "description", content: "Industrial equipment registry and technical records." }, { property: "og:title", content: "Equipment — Maintenix" }, { property: "og:description", content: "Equipment registry." }] }),
  component: EquipmentList,
});

type View = "grid" | "map" | "table";

function EquipmentList() {
  const { data, isLoading } = useRows("equipment", { order: "code", asc: true });
  const sr = useRows("sensor_readings", { order: "recorded_at" });
  const save = useSave("equipment");
  const { data: me } = useMe();
  const navigate = useNavigate();
  const { t } = useLang();
  const [view, setView] = useState<View>("grid");

  const health = useMemo(() => {
    const latest = new Map<string, any>();
    for (const r of sr.data ?? []) if (!latest.has(r.equipment_id) || latest.get(r.equipment_id).recorded_at < r.recorded_at) latest.set(r.equipment_id, r);
    const m = new Map<string, number>();
    for (const e of data ?? []) m.set(e.id, latest.has(e.id) ? healthScore(riskScore(latest.get(e.id))) : 100);
    return m;
  }, [data, sr.data]);

  const views: { v: View; icon: typeof LayoutGrid; label: string }[] = [
    { v: "grid", icon: LayoutGrid, label: "Grid" },
    { v: "map", icon: MapIcon, label: "Floor map" },
    { v: "table", icon: Table2, label: "Table" },
  ];

  return (
    <div>
      <PageHeader title="Equipment" subtitle="Technical records for every machine on site."
        actions={<>
          <div className="flex rounded-md border bg-card p-0.5">
            {views.map(({ v, icon: Icon, label }) => (
              <button key={v} onClick={() => setView(v)} aria-label={t(label)}
                className={cn("flex items-center gap-1.5 rounded px-2.5 py-1.5 text-xs", view === v ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted")}>
                <Icon className="h-3.5 w-3.5" />{t(label)}
              </button>
            ))}
          </div>
          {me?.can(PERMS.equipment) && <FormDialog title="New equipment" fields={EQ_FIELDS} initial={{ status: "operational", criticality: "medium", category: "Pumps" }} onSubmit={(v) => save.mutateAsync({ values: v })} trigger={<Button><Plus className="h-4 w-4" />Add equipment</Button>} />}
        </>} />

      {view === "map" && <FloorMap machines={data ?? []} />}

      {view === "grid" && (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {(data ?? []).map((e) => {
            const hp = health.get(e.id) ?? 100;
            const lvl = riskLevel(100 - hp);
            return (
              <button key={e.id} onClick={() => navigate({ to: "/equipment/$id", params: { id: e.id } })}
                className="glass rounded-lg p-4 text-start transition-transform hover:-translate-y-0.5 hover:glow-primary">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <span className="font-mono text-xs text-primary">{e.code}</span>
                    <div className="mt-0.5 font-medium">{e.name}</div>
                    <div className="text-xs text-muted-foreground">{e.category} · {e.workshop}</div>
                  </div>
                  <span className={cn("rounded-md px-2 py-1 font-mono text-xs font-bold", lvl === "high" ? "bg-destructive/15 text-destructive" : lvl === "medium" ? "bg-warning/20 text-warning" : "bg-success/15 text-success")}>{hp}% HP</span>
                </div>
                <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-muted">
                  <div className={cn("h-full", lvl === "high" ? "bg-destructive" : lvl === "medium" ? "bg-warning" : "bg-success")} style={{ width: `${hp}%` }} />
                </div>
                <div className="mt-3 flex items-center justify-between">
                  <StatusBadge value={e.status} />
                  <span className="font-mono text-xs text-muted-foreground">{Number(e.operating_hours).toLocaleString()} h</span>
                </div>
              </button>
            );
          })}
          {!isLoading && (data ?? []).length === 0 && <p className="col-span-full py-10 text-center text-sm text-muted-foreground">No records found.</p>}
        </div>
      )}

      {view === "table" && (
        <DataTable rows={data} loading={isLoading} onRowClick={(r) => navigate({ to: "/equipment/$id", params: { id: r.id } })}
          cols={[
            { key: "code", label: "Code", render: (r) => <span className="font-mono text-xs text-primary">{r.code}</span> },
            { key: "name", label: "Machine", render: (r) => <span className="font-medium">{r.name}</span> },
            { key: "category", label: "Category" }, { key: "workshop", label: "Workshop" },
            { key: "manufacturer", label: "Manufacturer" },
            { key: "criticality", label: "Criticality", render: (r) => <StatusBadge value={r.criticality} /> },
            { key: "status", label: "Status", render: (r) => <StatusBadge value={r.status} /> },
            { key: "operating_hours", label: "Hours", className: "text-right tabular-nums", render: (r) => Number(r.operating_hours).toLocaleString() },
          ]} />
      )}
    </div>
  );
}
