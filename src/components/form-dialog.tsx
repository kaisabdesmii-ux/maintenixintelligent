import { useState, type ReactNode } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export type Field = {
  name: string;
  label: string;
  type?: "text" | "number" | "date" | "datetime-local" | "select" | "textarea";
  options?: { value: string; label: string }[] | string[];
  required?: boolean;
  full?: boolean;
};

export function FormDialog({ title, fields, initial = {}, onSubmit, trigger }: { title: string; fields: Field[]; initial?: Record<string, any>; onSubmit: (v: Record<string, any>) => Promise<void>; trigger: ReactNode }) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader><DialogTitle>{title}</DialogTitle></DialogHeader>
        <form
          className="grid grid-cols-1 gap-4 sm:grid-cols-2"
          onSubmit={async (e) => {
            e.preventDefault();
            const fd = new FormData(e.currentTarget);
            const values: Record<string, any> = {};
            for (const f of fields) {
              const raw = fd.get(f.name) as string;
              if (raw === "" || raw == null) { values[f.name] = f.type === "number" ? 0 : null; continue; }
              values[f.name] = f.type === "number" ? Number(raw) : raw;
            }
            setBusy(true);
            try { await onSubmit(values); setOpen(false); } catch { /* toast shown */ } finally { setBusy(false); }
          }}
        >
          {fields.map((f) => {
            const dv = initial[f.name] ?? "";
            const opts = (f.options ?? []).map((o) => (typeof o === "string" ? { value: o, label: o.replace(/_/g, " ") } : o));
            return (
              <div key={f.name} className={f.full || f.type === "textarea" ? "sm:col-span-2" : ""}>
                <Label htmlFor={f.name} className="mb-1.5 block text-xs">{f.label}{f.required && " *"}</Label>
                {f.type === "textarea" ? (
                  <Textarea id={f.name} name={f.name} defaultValue={dv} required={f.required} rows={3} />
                ) : f.type === "select" ? (
                  <select id={f.name} name={f.name} defaultValue={dv} required={f.required} className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm capitalize">
                    {!f.required && <option value="">—</option>}
                    {opts.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </select>
                ) : (
                  <Input id={f.name} name={f.name} type={f.type ?? "text"} step="any" defaultValue={dv} required={f.required} />
                )}
              </div>
            );
          })}
          <div className="flex justify-end gap-2 sm:col-span-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button type="submit" disabled={busy}>{busy ? "Saving…" : "Save"}</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
