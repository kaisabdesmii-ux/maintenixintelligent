import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

export type AppRole = Database["public"]["Enums"]["app_role"];

export const ROLE_LABELS: Record<AppRole, string> = {
  admin: "Administrator",
  maintenance_manager: "Maintenance Manager",
  technician: "Maintenance Technician",
  operator: "Machine Operator",
  warehouse_manager: "Warehouse Manager",
  purchasing_manager: "Purchasing Manager",
  production_manager: "Production Manager",
  viewer: "Viewer",
};

/** UI mirror of the database write policies (the database is the real gate). */
export const PERMS = {
  equipment: ["maintenance_manager"],
  breakdownReport: ["maintenance_manager", "technician", "operator", "production_manager"],
  breakdownUpdate: ["maintenance_manager", "technician"],
  workOrders: ["maintenance_manager", "technician"],
  preventive: ["maintenance_manager"],
  parts: ["warehouse_manager", "purchasing_manager"],
  stockMove: ["warehouse_manager", "technician", "maintenance_manager"],
  sensors: ["maintenance_manager", "technician", "operator"],
  fmea: ["maintenance_manager"],
  validate: ["maintenance_manager"],
} satisfies Record<string, AppRole[]>;

export function useMe() {
  return useQuery({
    queryKey: ["me"],
    queryFn: async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) return null;
      const [{ data: profile }, { data: roles }] = await Promise.all([
        supabase.from("profiles").select("*").eq("id", u.user.id).maybeSingle(),
        supabase.from("user_roles").select("role").eq("user_id", u.user.id),
      ]);
      const r = (roles ?? []).map((x) => x.role);
      return {
        user: u.user,
        profile,
        roles: r,
        can: (allowed: AppRole[]) => r.includes("admin") || allowed.some((a) => r.includes(a)),
      };
    },
  });
}
