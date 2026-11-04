import { Languages } from "lucide-react";
import { LANGS, useLang, type Lang } from "@/lib/i18n";
import { cn } from "@/lib/utils";

export function LangSwitch({ className }: { className?: string }) {
  const { lang, setLang, t } = useLang();
  return (
    <label className={cn("flex items-center gap-2 text-sm", className)}>
      <Languages className="h-4 w-4" aria-hidden />
      <span className="sr-only">{t("Language")}</span>
      <select value={lang} onChange={(e) => setLang(e.target.value as Lang)} aria-label={t("Language")}
        className="rounded-md border border-input bg-background px-2 py-1 text-sm text-foreground">
        {LANGS.map((l) => <option key={l.code} value={l.code}>{l.label}</option>)}
      </select>
    </label>
  );
}
