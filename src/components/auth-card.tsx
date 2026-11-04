import { useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Wordmark } from "@/components/brand";
import { useLang } from "@/lib/i18n";
import { LangSwitch } from "@/components/lang-switch";
import { Activity, Gauge, ShieldCheck, Wrench } from "lucide-react";

export function AuthScreen() {
  const [mode, setMode] = useState<"in" | "up" | "forgot">("in");
  const [busy, setBusy] = useState(false);
  const navigate = useNavigate();
  const { t } = useLang();

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const email = String(fd.get("email"));
    const password = String(fd.get("password") ?? "");
    setBusy(true);
    try {
      if (mode === "in") {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        navigate({ to: "/dashboard" });
      } else if (mode === "up") {
        const { error } = await supabase.auth.signUp({
          email, password,
          options: { emailRedirectTo: window.location.origin, data: { full_name: String(fd.get("name")) } },
        });
        if (error) throw error;
        toast.success("Check your email to confirm your account.");
        setMode("in");
      } else {
        const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: `${window.location.origin}/reset-password` });
        if (error) throw error;
        toast.success("Password reset link sent.");
        setMode("in");
      }
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function google() {
    const r = await lovable.auth.signInWithOAuth("google", { redirect_uri: window.location.origin });
    if (r.error) { toast.error(r.error.message); return; }
    if (r.redirected) return;
    navigate({ to: "/dashboard" });
  }

  return (
    <div className="grid min-h-screen lg:grid-cols-[1.1fr_1fr]">
      <aside className="blueprint relative hidden flex-col justify-between bg-sidebar p-10 text-sidebar-foreground lg:flex">
        <Wordmark />
        <div>
          <p className="font-mono text-xs tracking-[0.3em] text-sidebar-primary">INDUSTRY 4.0 · CMMS</p>
          <h1 className="mt-3 max-w-lg text-4xl font-bold leading-tight text-sidebar-accent-foreground">{t("Keep every machine running. Know before it fails.")}</h1>
          <div className="mt-10 grid max-w-lg grid-cols-2 gap-4 text-sm">
            {[[Gauge, "Live MTBF, MTTR & availability"], [Activity, "Predictive sensor risk"], [Wrench, "Work orders & preventive plans"], [ShieldCheck, "Role-based access, 8 roles"]].map(([I, label]: any) => (
              <div key={label} className="flex items-center gap-2"><I className="h-4 w-4 text-sidebar-primary" />{t(label)}</div>
            ))}
          </div>
        </div>
        <p className="text-xs opacity-60">© {new Date().getFullYear()} Maintenix Intelligent</p>
      </aside>
      <main className="flex items-center justify-center p-6">
        <div className="w-full max-w-sm">
          <LangSwitch className="mb-6 justify-end text-muted-foreground" />
          <div className="mb-8 lg:hidden"><Wordmark /></div>
          <h2 className="text-2xl font-bold">{mode === "in" ? t("Sign in") : mode === "up" ? t("Request an account") : t("Reset password")}</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {mode === "up" ? t("New accounts start as Viewer until an administrator assigns a role.") : mode === "forgot" ? t("We'll email you a reset link.") : t("Access your maintenance workspace.")}
          </p>
          <form onSubmit={submit} className="mt-6 space-y-4">
            {mode === "up" && <div><Label htmlFor="name">{t("Full name")}</Label><Input id="name" name="name" required className="mt-1.5" /></div>}
            <div><Label htmlFor="email">{t("Email")}</Label><Input id="email" name="email" type="email" required className="mt-1.5" /></div>
            {mode !== "forgot" && <div><Label htmlFor="password">{t("Password")}</Label><Input id="password" name="password" type="password" minLength={6} required className="mt-1.5" /></div>}
            <Button type="submit" className="w-full" disabled={busy}>{busy ? t("Please wait…") : mode === "in" ? t("Sign in") : mode === "up" ? t("Create account") : t("Send link")}</Button>
          </form>
          {mode !== "forgot" && (
            <>
              <div className="my-4 flex items-center gap-3 text-xs text-muted-foreground"><div className="h-px flex-1 bg-border" />{t("or")}<div className="h-px flex-1 bg-border" /></div>
              <Button variant="outline" className="w-full" onClick={google}>{t("Continue with Google")}</Button>
            </>
          )}
          <div className="mt-6 flex justify-between text-sm">
            <button className="text-primary hover:underline" onClick={() => setMode(mode === "in" ? "up" : "in")}>{mode === "in" ? t("Create account") : t("Back to sign in")}</button>
            {mode === "in" && <button className="text-muted-foreground hover:underline" onClick={() => setMode("forgot")}>{t("Forgot password?")}</button>}
          </div>
        </div>
      </main>
    </div>
  );
}
