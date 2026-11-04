import { useState, type ReactNode } from "react";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Empty } from "@/components/common";

export type Col<T> = { key: string; label: string; render?: (r: T) => ReactNode; className?: string };

export function DataTable<T extends Record<string, any>>({ rows, cols, loading, searchKeys, onRowClick, toolbar }: { rows: T[] | undefined; cols: Col<T>[]; loading?: boolean; searchKeys?: string[]; onRowClick?: (r: T) => void; toolbar?: ReactNode }) {
  const [q, setQ] = useState("");
  const list = (rows ?? []).filter((r) => !q || (searchKeys ?? cols.map((c) => c.key)).some((k) => String(k.split(".").reduce((o: any, p) => o?.[p], r) ?? "").toLowerCase().includes(q.toLowerCase())));
  return (
    <div className="rounded-lg border bg-card">
      <div className="flex flex-wrap items-center gap-2 border-b p-3">
        <div className="relative w-full max-w-xs">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search…" className="pl-8" />
        </div>
        {toolbar}
        <span className="ml-auto font-mono text-xs text-muted-foreground">{list.length} records</span>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/50 text-left text-xs uppercase tracking-wide text-muted-foreground">
              {cols.map((c) => <th key={c.key} className={"px-3 py-2.5 font-medium whitespace-nowrap " + (c.className ?? "")}>{c.label}</th>)}
            </tr>
          </thead>
          <tbody>
            {list.map((r, i) => (
              <tr key={r["id"] ?? i} onClick={() => onRowClick?.(r)} className={"border-b last:border-0 hover:bg-muted/40 " + (onRowClick ? "cursor-pointer" : "")}>
                {cols.map((c) => <td key={c.key} className={"px-3 py-2.5 " + (c.className ?? "")}>{c.render ? c.render(r) : String(r[c.key] ?? "—")}</td>)}
              </tr>
            ))}
          </tbody>
        </table>
        {loading && <Empty text="Loading…" />}
        {!loading && list.length === 0 && <Empty text="No records found." />}
      </div>
    </div>
  );
}
