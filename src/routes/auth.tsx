import { createFileRoute } from "@tanstack/react-router";
import { AuthScreen } from "@/components/auth-card";

export const Route = createFileRoute("/auth")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Sign in — Maintenix Intelligent" },
      { name: "description", content: "Sign in to your Maintenix Intelligent maintenance workspace." },
      { property: "og:title", content: "Sign in — Maintenix Intelligent" },
      { property: "og:description", content: "Access your maintenance workspace." },
    ],
  }),
  component: AuthScreen,
});
