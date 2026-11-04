import { createFileRoute } from "@tanstack/react-router";
import { ArrowDownUp, Boxes, DollarSign, PackageMinus, PackageX, Pencil, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { KpiCard, PageHeader, StatusBadge } from "@/components/common";
import { DataTable } from "@/components/data-table";
import { FormDialog, type Field } from "@/components/form-dialog";
import { useRows, useSave } from "@/lib/data";
import { PERMS, useMe } from "@/lib/auth";
import { fmt, stockState } from "@/lib/kpi";

export const Route = createFileRoute("/_authenticated/inventory")({
  head: () => ({ meta: [{ title: "Spare Parts & Inventory — Maintenix" }, { name: "description", content: "Spare parts catalogue, stock levels and movements." }, { property: "og:title", content: "Spare Parts & Inventory — Maintenix" }, { property: "og:description", content: "Inventory management." }] }),
  component: Inventory,
});

const PART_FIELDS: Field[] = [
  { name: "reference", label: "Part reference", required: true }, { name: "designation", label: "Designation", required: true },
  { name: "category", label: "Category" }, { name: "manufacturer", label: "Manufacturer" }, { name: "supplier", label: "Supplier" },
  { name: "unit_price", label: "Unit price ($)", type: "number" }, { name: "min_stock", label: "Minimum stock", type: "number" },
  { name: "max_stock", label: "Maximum stock", type: "number" }, { name: "location", label: "Warehouse location" },
  { name: "lead_time_days", label: "Lead time (days)", type: "number" }, { name: "description", label: "Technical description", type: "textarea" },
];

function Inventory() {
  const parts = useRows("spare_parts", { order: "reference", asc: true });
  const moves = useRows("stock_movements", { select: "*, spare_parts(reference,designation), work_orders(number)", order: "created_at" });
  const wo = useRows("work_orders", { order: "created_at" });
  const savePart = useSave("spare_parts");
  const saveMove = useSave("stock_movements", ["spare_parts"]);
  const { data: me } = useMe();
  const p = parts.data ?? [];
  const value = p.reduce((s, x) => s + Number(x.quantity) * Number(x.unit_price), 0);
  const moveFields: Field[] = [
    { name: "part_id", label: "Part", type: "select", options: p.map((x) => ({ value: x.id, label: `${x.reference} — ${x.designation} (stock ${x.quantity})` })), required: true, full: true },
    { name: "movement_type", label: "Movement type", type: "select", options: [{ value: "entry", label: "Entry" }, { value: "exit", label: "Exit" }, { value: "return", label: "Return" }, { value: "correction", label: "Correction (±)" }], required: true },
    { name: "quantity", label: "Quantity", type: "number", required: true },
    { name: "work_order_id", label: "Related work order", type: "select", options: (wo.data ?? []).map((w) => ({ value: w.id, label: w.number })) },
    { name: "note", label: "Note", full: true },
  ];

  return (
    <div>
      <PageHeader title="Spare Parts & Inventory" subtitle="Stock balances update automatically with every movement."
        actions={<>
          {me?.can(PERMS.stockMove) && <FormDialog title="Record stock movement" fields={moveFields} initial={{ movement_type: "exit" }} onSubmit={(v) => saveMove.mutateAsync({ values: v })} trigger={<Button variant="outline"><ArrowDownUp className="h-4 w-4" />Stock movement</Button>} />}
          {me?.can(PERMS.parts) && <FormDialog title="New spare part" fields={PART_FIELDS} onSubmit={(v) => savePart.mutateAsync({ values: v })} trigger={<Button><Plus className="h-4 w-4" />Add part</Button>} />}
        </>} />
      <div className="mb-4 grid grid-cols-2 gap-3 md:grid-cols-4">
        <KpiCard label="References" value={p.length} icon={Boxes} />
        <KpiCard label="Low stock" value={p.filter((x) => stockState(x) === "low").length} icon={PackageMinus} tone="warning" />
        <KpiCard label="Out of stock" value={p.filter((x) => stockState(x) === "out").length} icon={PackageX} tone="destructive" />
        <KpiCard label="Inventory value" value={fmt.money(value)} icon={DollarSign} />
      </div>
      <Tabs defaultValue="parts">
        <TabsList><TabsTrigger value="parts">Catalogue</TabsTrigger><TabsTrigger value="moves">Movements</TabsTrigger></TabsList>
        <TabsContent value="parts">
          <DataTable rows={p} loading={parts.isLoading} searchKeys={["reference", "designation", "category", "supplier"]}
            cols={[
              { key: "reference", label: "Ref", render: (r) => <span className="font-mono text-xs text-primary">{r.reference}</span> },
              { key: "designation", label: "Designation", render: (r) => <span className="font-medium">{r.designation}</span> },
              { key: "category", label: "Category" }, { key: "supplier", label: "Supplier" }, { key: "location", label: "Location" },
              { key: "quantity", label: "Qty", className: "text-right tabular-nums" },
              { key: "minmax", label: "Min / Max", className: "tabular-nums", render: (r) => `${r.min_stock} / ${r.max_stock}` },
              { key: "unit_price", label: "Unit price", className: "text-right tabular-nums", render: (r) => fmt.money(Number(r.unit_price)) },
              { key: "state", label: "Stock", render: (r) => <StatusBadge value={stockState(r)} /> },
              { key: "act", label: "", render: (r) => me?.can(PERMS.parts) && <FormDialog title={`Edit ${r.reference}`} fields={PART_FIELDS} initial={r} onSubmit={(v) => savePart.mutateAsync({ id: r.id, values: v })} trigger={<Button size="icon" variant="ghost" aria-label="Edit"><Pencil className="h-4 w-4" /></Button>} /> },
            ]} />
        </TabsContent>
        <TabsContent value="moves">
          <DataTable rows={moves.data} loading={moves.isLoading} searchKeys={["spare_parts.designation", "movement_type", "note"]}
            cols={[
              { key: "created_at", label: "Date", render: (r) => new Date(r.created_at).toLocaleString() },
              { key: "part", label: "Part", render: (r) => r.spare_parts?.designation },
              { key: "movement_type", label: "Type", render: (r) => <span className="capitalize">{r.movement_type}</span> },
              { key: "quantity", label: "Qty", className: "tabular-nums" },
              { key: "bal", label: "Balance", className: "tabular-nums", render: (r) => `${r.previous_balance} → ${r.new_balance}` },
              { key: "wo", label: "Work order", render: (r) => r.work_orders?.number ?? "—" },
              { key: "note", label: "Note" },
            ]} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
