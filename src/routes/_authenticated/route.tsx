import { createFileRoute, Link, Outlet, redirect, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Activity, AlertTriangle, BarChart3, Boxes, CalendarClock, ClipboardList, Cog, LayoutDashboard, LogOut, Menu, ShieldCheck, User, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Wordmark } from "@/components/brand";
import { ROLE_LABELS, useMe } from "@/lib/auth";
import { cn } from "@/lib/utils";
import { useLang } from "@/lib/i18n";
import { LangSwitch } from "@/components/lang-switch";
import { Topbar } from "@/components/topbar";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async () => {
    const { data } = await supabase.auth.getUser();
    if (!data.user) throw redirect({ to: "/auth" });
  },
  component: Shell,
});

const NAV = [
  { to: "/dashboard", label: "Overview", icon: LayoutDashboard },
  { to: "/equipment", label: "Equipment", icon: Cog },
  { to: "/breakdowns", label: "Breakdowns", icon: AlertTriangle },
  { to: "/work-orders", label: "Work Orders", icon: ClipboardList },
  { to: "/preventive", label: "Preventive", icon: CalendarClock },
  { to: "/inventory", label: "Spare Parts", icon: Boxes },
  { to: "/predictive", label: "Predictive", icon: Activity },
  { to: "/reliability", label: "Reliability & AMDEC", icon: BarChart3 },
] as const;

function Shell() {
  const [open, setOpen] = useState(false);
  const { data: me } = useMe();
  const navigate = useNavigate();
  const { t } = useLang();
  const isAdmin = me?.roles.includes("admin");

  const nav = (
    <nav className="flex flex-1 flex-col gap-0.5 px-3">
      {NAV.map((n) => (
        <Link key={n.to} to={n.to} onClick={() => setOpen(false)}
          className="flex items-center gap-3 rounded-md px-3 py-2 text-sm text-sidebar-foreground/80 transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
          activeProps={{ className: "bg-sidebar-accent !text-sidebar-primary font-medium" }}>
          <n.icon className="h-4 w-4" />{t(n.label)}
        </Link>
      ))}
      {isAdmin && (
        <Link to="/users" onClick={() => setOpen(false)} className="flex items-center gap-3 rounded-md px-3 py-2 text-sm text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground" activeProps={{ className: "bg-sidebar-accent !text-sidebar-primary font-medium" }}>
          <ShieldCheck className="h-4 w-4" />{t("Users & Roles")}
        </Link>
      )}
    </nav>
  );

  const sidebar = (
    <div className="flex h-full flex-col bg-sidebar text-sidebar-foreground">
      <div className="px-5 py-5 text-sidebar-accent-foreground"><Wordmark /></div>
      {nav}
      <div className="border-t border-sidebar-border p-3">
        <Link to="/profile" onClick={() => setOpen(false)} className="flex items-center gap-3 rounded-md px-3 py-2 hover:bg-sidebar-accent">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-sidebar-primary text-sidebar-primary-foreground"><User className="h-4 w-4" /></div>
          <div className="min-w-0 flex-1">
            <div className="truncate text-sm text-sidebar-accent-foreground">{me?.profile?.full_name ?? "…"}</div>
            <div className="truncate font-mono text-[10px] uppercase tracking-wide text-sidebar-primary">{me?.roles.map((r) => ROLE_LABELS[r]).join(", ")}</div>
          </div>
        </Link>
        <button onClick={async () => { await supabase.auth.signOut(); navigate({ to: "/auth" }); }} className="mt-1 flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm text-sidebar-foreground/70 hover:bg-sidebar-accent">
          <LogOut className="h-4 w-4" />{t("Sign out")}
        </button>
        <LangSwitch className="mt-2 px-3 text-sidebar-foreground/80" />
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-background">
      <aside className="fixed inset-y-0 start-0 z-30 hidden w-64 lg:block">{sidebar}</aside>
      <div className={cn("fixed inset-0 z-40 lg:hidden", open ? "block" : "hidden")}>
        <div className="absolute inset-0 bg-foreground/40" onClick={() => setOpen(false)} />
        <div className="absolute inset-y-0 start-0 w-64">{sidebar}</div>
      </div>
      <header className="sticky top-0 z-20 flex h-14 items-center gap-3 border-b bg-card/90 px-4 backdrop-blur lg:hidden">
        <button onClick={() => setOpen(!open)} aria-label="Menu">{open ? <X /> : <Menu />}</button>
        <span className="font-display font-bold">MAINTENIX</span>
      </header>
      <main className="lg:ps-64">
        <Topbar />
        <div className="mx-auto max-w-[1500px] p-4 md:p-8"><Outlet /></div>
      </main>
    </div>
  );
}
