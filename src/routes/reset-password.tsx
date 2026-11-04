import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Wordmark } from "@/components/brand";

export const Route = createFileRoute("/reset-password")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Reset password — Maintenix Intelligent" },
      { name: "description", content: "Choose a new password for your Maintenix account." },
      { property: "og:title", content: "Reset password — Maintenix Intelligent" },
      { property: "og:description", content: "Choose a new password." },
    ],
  }),
  component: Reset,
});

function Reset() {
  const [busy, setBusy] = useState(false);
  const navigate = useNavigate();
  return (
    <div className="flex min-h-screen items-center justify-center p-6">
      <form
        className="w-full max-w-sm space-y-4"
        onSubmit={async (e) => {
          e.preventDefault();
          const password = String(new FormData(e.currentTarget).get("password"));
          setBusy(true);
          const { error } = await supabase.auth.updateUser({ password });
          setBusy(false);
          if (error) { toast.error(error.message); return; }
          toast.success("Password updated");
          navigate({ to: "/dashboard" });
        }}
      >
        <Wordmark />
        <h1 className="pt-4 text-2xl font-bold">Set a new password</h1>
        <div><Label htmlFor="password">New password</Label><Input id="password" name="password" type="password" minLength={6} required className="mt-1.5" /></div>
        <Button type="submit" className="w-full" disabled={busy}>Update password</Button>
      </form>
    </div>
  );
}
