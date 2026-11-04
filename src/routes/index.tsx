import { createFileRoute, redirect } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { AuthScreen } from "@/components/auth-card";

export const Route = createFileRoute("/")({
  ssr: false,
  beforeLoad: async () => {
    const { data } = await supabase.auth.getSession();
    if (data.session) throw redirect({ to: "/dashboard" });
  },
  head: () => ({
    meta: [
      { title: "Maintenix Intelligent — Smart Maintenance Platform" },
      { name: "description", content: "Sign in to Maintenix Intelligent, the GMAO 4.0 platform for industrial maintenance teams." },
      { property: "og:title", content: "Maintenix Intelligent — Smart Maintenance Platform" },
      { property: "og:description", content: "GMAO 4.0: equipment, breakdowns, work orders, inventory and predictive maintenance." },
    ],
  }),
  component: AuthScreen,
});
