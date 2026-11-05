import { useNavigate } from "@tanstack/react-router";
import { useLang } from "@/lib/i18n";
import { cn } from "@/lib/utils";

type Machine = { id: string; code: string; name: string; status: string; workshop?: string | null };

const MARKER: Record<string, string> = {
  operational: "bg-success glow-primary",
  under_maintenance: "bg-warning glow-warning",
  failure: "bg-destructive glow-destructive",
};

/** Interactive plant layout: machines placed in deterministic slots on a blueprint floor. */
export function FloorMap({ machines }: { machines: Machine[] }) {
  const navigate = useNavigate();
  const { t } = useLang();
  const cols = 3;
  return (
    <div className="blueprint relative overflow-hidden rounded-lg border bg-card p-4">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-semibold">{t("Plant layout")}</h3>
        <div className="flex gap-3 text-xs text-muted-foreground">
          <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-success" />{t("operational")}</span>
          <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-warning" />{t("under maintenance")}</span>
          <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-destructive" />{t("failure")}</span>
        </div>
      </div>
      <div className="grid gap-4" style={{ gridTemplateColumns: `repeat(${cols}, minmax(0,1fr))` }}>
        {machines.map((m) => (
          <button
            key={m.id}
            onClick={() => navigate({ to: "/equipment/$id", params: { id: m.id } })}
            className="group flex flex-col items-center gap-2 rounded-lg border border-dashed border-border/70 bg-background/40 p-4 transition-colors hover:border-primary"
          >
            <span className={cn("relative flex h-5 w-5")}>
              <span className={cn("absolute inline-flex h-full w-full rounded-full opacity-40 pulse-dot", MARKER[m.status] ?? "bg-muted")} />
              <span className={cn("relative inline-flex h-5 w-5 rounded-full border-2 border-background", MARKER[m.status] ?? "bg-muted")} />
            </span>
            <span className="font-mono text-xs text-primary">{m.code}</span>
            <span className="text-center text-xs text-muted-foreground group-hover:text-foreground">{m.name}</span>
            {m.workshop && <span className="rounded bg-muted px-1.5 py-0.5 font-mono text-[10px] uppercase text-muted-foreground">{m.workshop}</span>}
          </button>
        ))}
      </div>
    </div>
  );
}
