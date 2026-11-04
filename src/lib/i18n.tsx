import { useEffect, useSyncExternalStore } from "react";

export type Lang = "en" | "fr" | "ar";
export const LANGS: { code: Lang; label: string }[] = [
  { code: "fr", label: "Français" },
  { code: "ar", label: "العربية" },
  { code: "en", label: "English" },
];

// English text is the key; missing entries fall back to English.
const DICT: Record<string, { fr: string; ar: string }> = {
  "Overview": { fr: "Vue d'ensemble", ar: "نظرة عامة" },
  "Equipment": { fr: "Équipements", ar: "المعدات" },
  "Breakdowns": { fr: "Pannes", ar: "الأعطال" },
  "Work Orders": { fr: "Ordres de travail", ar: "أوامر العمل" },
  "Preventive": { fr: "Préventif", ar: "الصيانة الوقائية" },
  "Spare Parts": { fr: "Pièces de rechange", ar: "قطع الغيار" },
  "Predictive": { fr: "Prédictif", ar: "الصيانة التنبؤية" },
  "Reliability & AMDEC": { fr: "Fiabilité & AMDEC", ar: "الموثوقية و AMDEC" },
  "Users & Roles": { fr: "Utilisateurs & rôles", ar: "المستخدمون والأدوار" },
  "Sign out": { fr: "Se déconnecter", ar: "تسجيل الخروج" },
  "Language": { fr: "Langue", ar: "اللغة" },
  // Auth
  "Sign in": { fr: "Se connecter", ar: "تسجيل الدخول" },
  "Request an account": { fr: "Demander un compte", ar: "طلب حساب" },
  "Reset password": { fr: "Réinitialiser le mot de passe", ar: "إعادة تعيين كلمة المرور" },
  "New accounts start as Viewer until an administrator assigns a role.": { fr: "Les nouveaux comptes sont Lecteurs jusqu'à ce qu'un administrateur attribue un rôle.", ar: "تبدأ الحسابات الجديدة كمشاهد حتى يعيّن المسؤول دورًا." },
  "We'll email you a reset link.": { fr: "Nous vous enverrons un lien par e-mail.", ar: "سنرسل لك رابط إعادة التعيين عبر البريد." },
  "Access your maintenance workspace.": { fr: "Accédez à votre espace de maintenance.", ar: "ادخل إلى مساحة الصيانة الخاصة بك." },
  "Full name": { fr: "Nom complet", ar: "الاسم الكامل" },
  "Email": { fr: "E-mail", ar: "البريد الإلكتروني" },
  "Password": { fr: "Mot de passe", ar: "كلمة المرور" },
  "Please wait…": { fr: "Veuillez patienter…", ar: "يرجى الانتظار…" },
  "Create account": { fr: "Créer un compte", ar: "إنشاء حساب" },
  "Send link": { fr: "Envoyer le lien", ar: "إرسال الرابط" },
  "or": { fr: "ou", ar: "أو" },
  "Continue with Google": { fr: "Continuer avec Google", ar: "المتابعة باستخدام Google" },
  "Back to sign in": { fr: "Retour à la connexion", ar: "العودة لتسجيل الدخول" },
  "Forgot password?": { fr: "Mot de passe oublié ?", ar: "نسيت كلمة المرور؟" },
  "Keep every machine running. Know before it fails.": { fr: "Gardez chaque machine en marche. Anticipez les pannes.", ar: "حافظ على تشغيل كل آلة. اعرف قبل أن تتعطل." },
  "Live MTBF, MTTR & availability": { fr: "MTBF, MTTR et disponibilité en direct", ar: "MTBF و MTTR والتوافر مباشرة" },
  "Predictive sensor risk": { fr: "Risque prédictif des capteurs", ar: "مخاطر تنبؤية من المستشعرات" },
  "Work orders & preventive plans": { fr: "OT et plans préventifs", ar: "أوامر العمل والخطط الوقائية" },
  "Role-based access, 8 roles": { fr: "Accès par rôle, 8 rôles", ar: "صلاحيات حسب الدور، 8 أدوار" },
  // Page headers
  "Smart Maintenance Overview": { fr: "Tableau de bord maintenance intelligente", ar: "لوحة الصيانة الذكية" },
  "All indicators are calculated live from your maintenance records.": { fr: "Tous les indicateurs sont calculés en direct à partir de vos données.", ar: "تُحسب جميع المؤشرات مباشرة من سجلات الصيانة." },
  "Technical records for every machine on site.": { fr: "Fiches techniques de chaque machine du site.", ar: "السجلات التقنية لكل آلة في الموقع." },
  "Every report is linked to the machine's history automatically.": { fr: "Chaque déclaration est liée automatiquement à l'historique de la machine.", ar: "يُربط كل بلاغ تلقائيًا بسجل الآلة." },
  "Draft → approval → scheduled → in progress → completed → validated.": { fr: "Brouillon → approbation → planifié → en cours → terminé → validé.", ar: "مسودة ← موافقة ← مجدول ← قيد التنفيذ ← مكتمل ← مُعتمد." },
  "Preventive Maintenance": { fr: "Maintenance préventive", ar: "الصيانة الوقائية" },
  "Generate work orders from plans; the next due date rolls forward automatically.": { fr: "Générez des OT depuis les plans ; la prochaine échéance avance automatiquement.", ar: "أنشئ أوامر العمل من الخطط؛ يتقدم الموعد التالي تلقائيًا." },
  "Spare Parts & Inventory": { fr: "Pièces de rechange & stock", ar: "قطع الغيار والمخزون" },
  "Stock balances update automatically with every movement.": { fr: "Les stocks se mettent à jour à chaque mouvement.", ar: "يتحدّث المخزون تلقائيًا مع كل حركة." },
  "Predictive Maintenance": { fr: "Maintenance prédictive", ar: "الصيانة التنبؤية" },
  "Indicators over the last 12 months (8 760 h per machine).": { fr: "Indicateurs sur les 12 derniers mois (8 760 h par machine).", ar: "المؤشرات خلال آخر 12 شهرًا (8760 ساعة لكل آلة)." },
  "AMDEC / FMEA": { fr: "AMDEC", ar: "AMDEC / FMEA" },
  "RPN (IPR) = G × F × D. Critical ≥ 200, high ≥ 120.": { fr: "IPR = G × F × D. Critique ≥ 200, élevé ≥ 120.", ar: "RPN = G × F × D. حرج ≥ 200، مرتفع ≥ 120." },
  "New sign-ups start as Viewer. Assign roles to grant access — permissions are enforced by the database.": { fr: "Les nouveaux inscrits sont Lecteurs. Attribuez des rôles pour donner accès.", ar: "يبدأ المسجلون الجدد كمشاهدين. عيّن الأدوار لمنح الصلاحيات." },
  "My profile": { fr: "Mon profil", ar: "ملفي الشخصي" },
  "Details": { fr: "Détails", ar: "التفاصيل" },
  "Department": { fr: "Service", ar: "القسم" },
  "Specialty": { fr: "Spécialité", ar: "التخصص" },
  "Roles: ": { fr: "Rôles : ", ar: "الأدوار: " },
  "Save": { fr: "Enregistrer", ar: "حفظ" },
  // Panels
  "Recurring failures (last 12 months)": { fr: "Pannes récurrentes (12 derniers mois)", ar: "الأعطال المتكررة (آخر 12 شهرًا)" },
  "Technical information": { fr: "Informations techniques", ar: "المعلومات التقنية" },
  "Chronological history": { fr: "Historique chronologique", ar: "السجل الزمني" },
  "Sensor measurements": { fr: "Mesures capteurs", ar: "قياسات المستشعرات" },
  "Temperature trend": { fr: "Évolution de la température", ar: "اتجاه الحرارة" },
  "Vibration trend": { fr: "Évolution des vibrations", ar: "اتجاه الاهتزاز" },
  "Breakdown evolution & downtime": { fr: "Évolution des pannes & arrêts", ar: "تطور الأعطال ووقت التوقف" },
  "Machine status distribution": { fr: "Répartition des états machines", ar: "توزيع حالة الآلات" },
  "MTBF & MTTR evolution": { fr: "Évolution MTBF & MTTR", ar: "تطور MTBF و MTTR" },
  "Maintenance costs & activity": { fr: "Coûts & activité de maintenance", ar: "تكاليف ونشاط الصيانة" },
  "Predictive risk distribution": { fr: "Répartition du risque prédictif", ar: "توزيع المخاطر التنبؤية" },
  "Technician performance": { fr: "Performance des techniciens", ar: "أداء الفنيين" },
  "Recent activity": { fr: "Activité récente", ar: "النشاط الأخير" },
  "Pareto — downtime by failure mode": { fr: "Pareto — arrêts par mode de défaillance", ar: "باريتو — التوقف حسب نمط العطل" },
  "Equipment reliability ranking": { fr: "Classement de fiabilité", ar: "ترتيب موثوقية المعدات" },
  // Statuses / levels
  "operational": { fr: "opérationnel", ar: "يعمل" },
  "under maintenance": { fr: "en maintenance", ar: "قيد الصيانة" },
  "failure": { fr: "en panne", ar: "معطّل" },
  "low": { fr: "faible", ar: "منخفض" },
  "medium": { fr: "moyen", ar: "متوسط" },
  "high": { fr: "élevé", ar: "مرتفع" },
  "critical": { fr: "critique", ar: "حرج" },
  "reported": { fr: "déclarée", ar: "مُبلغ عنه" },
  "under diagnosis": { fr: "en diagnostic", ar: "قيد التشخيص" },
  "in progress": { fr: "en cours", ar: "قيد التنفيذ" },
  "waiting for parts": { fr: "attente pièces", ar: "بانتظار القطع" },
  "waiting parts": { fr: "attente pièces", ar: "بانتظار القطع" },
  "resolved": { fr: "résolue", ar: "تم الحل" },
  "closed": { fr: "clôturée", ar: "مغلق" },
  "draft": { fr: "brouillon", ar: "مسودة" },
  "pending approval": { fr: "en attente", ar: "بانتظار الموافقة" },
  "scheduled": { fr: "planifié", ar: "مجدول" },
  "completed": { fr: "terminé", ar: "مكتمل" },
  "validated": { fr: "validé", ar: "مُعتمد" },
  "cancelled": { fr: "annulé", ar: "ملغى" },
  "overdue": { fr: "en retard", ar: "متأخر" },
  "ok": { fr: "ok", ar: "جيد" },
  "out": { fr: "rupture", ar: "نفد" },
};

let current: Lang = "en";
const listeners = new Set<() => void>();
function apply(l: Lang) {
  document.documentElement.lang = l;
  document.documentElement.dir = l === "ar" ? "rtl" : "ltr";
}
export function setLang(l: Lang) {
  current = l;
  try { localStorage.setItem("lang", l); } catch {}
  apply(l);
  listeners.forEach((f) => f());
}
export function syncClientLang() {
  const saved = (typeof localStorage !== "undefined" && localStorage.getItem("lang")) as Lang | null;
  if (saved && saved !== current && ["en", "fr", "ar"].includes(saved)) setLang(saved);
}
export function translate(s: string, l: Lang = current) {
  if (l === "en") return s;
  return DICT[s]?.[l] ?? s;
}
export function useLang() {
  const lang = useSyncExternalStore((f) => { listeners.add(f); return () => listeners.delete(f); }, () => current, () => "en" as Lang);
  useEffect(() => { syncClientLang(); }, []);
  return { lang, setLang, t: (s: string) => translate(s, lang) };
}
