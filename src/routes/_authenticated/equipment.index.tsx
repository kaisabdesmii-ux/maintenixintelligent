import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageHeader, StatusBadge } from "@/components/common";
import { DataTable } from "@/components/data-table";
import { FormDialog, type Field } from "@/components/form-dialog";
import { useRows, useSave } from "@/lib/data";
import { PERMS, useMe } from "@/lib/auth";
import { EQ_CATEGORIES, EQ_STATUS, LEVELS } from "@/lib/options";

export const Route = createFileRoute("/_authenticated/equipment/")({
  head: () => ({ meta: [{ title: "Equipment — Maintenix" }, { name: "description", content: "Industrial equipment registry and technical records." }, { property: "og:title", content: "Equipment — Maintenix" }, { property: "og:description", content: "Equipment registry." }] }),
  component: EquipmentList,
});

export const EQ_FIELDS: Field[] = [
  { name: "code", label: "Equipment code", required: true }, { name: "name", label: "Machine name", required: true },
  { name: "category", label: "Category", type: "select", options: EQ_CATEGORIES, required: true }, { name: "status", label: "Status", type: "select", options: EQ_STATUS, required: true },
  { name: "manufacturer", label: "Manufacturer" }, { name: "brand", label: "Brand" }, { name: "model", label: "Model" }, { name: "serial_number", label: "Serial number" },
  { name: "year_manufactured", label: "Year of manufacture", type: "number" }, { name: "commissioning_date", label: "Commissioning date", type: "date" },
  { name: "location", label: "Location" }, { name: "workshop", label: "Workshop" }, { name: "department", label: "Department" },
  { name: "criticality", label: "Criticality", type: "select", options: LEVELS, required: true }, { name: "responsible_operator", label: "Responsible operator" },
  { name: "operating_hours", label: "Operating hours", type: "number" }, { name: "image_url", label: "Image URL", full: true },
  { name: "specifications", label: "Technical specifications", type: "textarea" },
];

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
