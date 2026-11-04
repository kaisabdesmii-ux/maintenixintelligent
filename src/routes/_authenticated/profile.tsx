import { createFileRoute } from "@tanstack/react-router";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PageHeader, Panel } from "@/components/common";
import { ROLE_LABELS, useMe } from "@/lib/auth";

export const Route = createFileRoute("/_authenticated/profile")({
  head: () => ({ meta: [{ title: "My profile — Maintenix" }, { name: "description", content: "Your Maintenix profile and roles." }, { property: "og:title", content: "My profile — Maintenix" }, { property: "og:description", content: "User profile." }] }),
  component: Profile,
});

function Profile() {
  const { data: me } = useMe();
  const qc = useQueryClient();
  if (!me) return null;
  return (
    <div className="max-w-xl">
      <PageHeader title="My profile" subtitle={me.user.email} />
      <Panel title="Details">
        <form key={me.profile?.id} className="space-y-4" onSubmit={async (e) => {
          e.preventDefault();
          const fd = new FormData(e.currentTarget);
          const { error } = await supabase.from("profiles").update({ full_name: String(fd.get("full_name")), department: String(fd.get("department")), specialty: String(fd.get("specialty")) }).eq("id", me.user.id);
          if (error) return toast.error(error.message);
          toast.success("Profile updated"); qc.invalidateQueries({ queryKey: ["me"] });
        }}>
          <div><Label htmlFor="full_name">Full name</Label><Input id="full_name" name="full_name" defaultValue={me.profile?.full_name ?? ""} className="mt-1.5" /></div>
          <div><Label htmlFor="department">Department</Label><Input id="department" name="department" defaultValue={me.profile?.department ?? ""} className="mt-1.5" /></div>
          <div><Label htmlFor="specialty">Specialty</Label><Input id="specialty" name="specialty" defaultValue={me.profile?.specialty ?? ""} className="mt-1.5" /></div>
          <div className="text-sm"><span className="text-muted-foreground">Roles: </span>{me.roles.map((r) => ROLE_LABELS[r]).join(", ")}</div>
          <Button type="submit">Save</Button>
        </form>
      </Panel>
    </div>
  );
}
