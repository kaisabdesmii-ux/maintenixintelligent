import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader, Empty } from "@/components/common";
import { ROLE_LABELS, useMe, type AppRole } from "@/lib/auth";

export const Route = createFileRoute("/_authenticated/users")({
  head: () => ({ meta: [{ title: "Users & Roles — Maintenix" }, { name: "description", content: "Assign roles and permissions to users." }, { property: "og:title", content: "Users & Roles — Maintenix" }, { property: "og:description", content: "User management." }] }),
  component: Users,
});

function Users() {
  const { data: me } = useMe();
  const qc = useQueryClient();
  const { data } = useQuery({
    queryKey: ["users-admin"],
    queryFn: async () => {
      const [{ data: profiles }, { data: roles }] = await Promise.all([supabase.from("profiles").select("*").order("created_at"), supabase.from("user_roles").select("*")]);
      return (profiles ?? []).map((p) => ({ ...p, roles: (roles ?? []).filter((r) => r.user_id === p.id) }));
    },
  });
  if (!me?.roles.includes("admin")) return <Empty text="Only administrators can manage users." />;

  async function add(userId: string, role: AppRole) {
    const { error } = await supabase.from("user_roles").insert({ user_id: userId, role });
    if (error) return void toast.error(error.message);
    qc.invalidateQueries({ queryKey: ["users-admin"] });
  }
  async function remove(id: string) {
    const { error } = await supabase.from("user_roles").delete().eq("id", id);
    if (error) return void toast.error(error.message);
    qc.invalidateQueries({ queryKey: ["users-admin"] });
  }

  return (
    <div>
      <PageHeader title="Users & Roles" subtitle="New sign-ups start as Viewer. Assign roles to grant access — permissions are enforced by the database." />
      <div className="divide-y rounded-lg border bg-card">
        {(data ?? []).map((u) => (
          <div key={u.id} className="flex flex-wrap items-center gap-3 p-4">
            <div className="min-w-48 flex-1"><div className="font-medium">{u.full_name}</div><div className="text-xs text-muted-foreground">{u.email}</div></div>
            <div className="flex flex-wrap gap-1.5">
              {u.roles.map((r) => (
                <span key={r.id} className="inline-flex items-center gap-1 rounded bg-accent px-2 py-0.5 text-xs text-accent-foreground">{ROLE_LABELS[r.role]}
                  <button aria-label="Remove role" onClick={() => remove(r.id)}><X className="h-3 w-3" /></button></span>
              ))}
            </div>
            <select value="" onChange={(e) => e.target.value && add(u.id, e.target.value as AppRole)} className="h-8 rounded-md border bg-background px-2 text-xs">
              <option value="">+ Add role</option>
              {(Object.keys(ROLE_LABELS) as AppRole[]).filter((r) => !u.roles.some((x) => x.role === r)).map((r) => <option key={r} value={r}>{ROLE_LABELS[r]}</option>)}
            </select>
          </div>
        ))}
      </div>
    </div>
  );
}
