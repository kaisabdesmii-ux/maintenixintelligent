import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageHeader, StatusBadge } from "@/components/common";
import { DataTable } from "@/components/data-table";
import { FormDialog } from "@/components/form-dialog";
import { EQ_FIELDS } from "@/lib/fields";
import { useRows, useSave } from "@/lib/data";
import { PERMS, useMe } from "@/lib/auth";

export const Route = createFileRoute("/_authenticated/equipment/")({
  head: () => ({ meta: [{ title: "Equipment — Maintenix" }, { name: "description", content: "Industrial equipment registry and technical records." }, { property: "og:title", content: "Equipment — Maintenix" }, { property: "og:description", content: "Equipment registry." }] }),
  component: EquipmentList,
});



function EquipmentList() {
  const { data, isLoading } = useRows("equipment", { order: "code", asc: true });
  const save = useSave("equipment");
  const { data: me } = useMe();
  const navigate = useNavigate();
  return (
    <div>
      <PageHeader title="Equipment" subtitle="Technical records for every machine on site."
        actions={me?.can(PERMS.equipment) && <FormDialog title="New equipment" fields={EQ_FIELDS} initial={{ status: "operational", criticality: "medium", category: "Pumps" }} onSubmit={(v) => save.mutateAsync({ values: v })} trigger={<Button><Plus className="h-4 w-4" />Add equipment</Button>} />} />
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
    </div>
  );
}
