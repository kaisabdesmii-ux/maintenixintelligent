<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

## Architecture rules
- Signed-in pages live under `src/routes/_authenticated/` (client-only gate + app shell); data is read/written from the browser client with RLS as the real permission gate — keep `PERMS` in `src/lib/auth.tsx` mirroring the database policies.
- Roles live in `public.user_roles` checked via `has_role`/`has_any_role` (admin always passes); first signup becomes admin, later ones viewer.
- Stock balances are only changed by inserting `stock_movements` (a trigger updates `spare_parts.quantity`) — never update quantity directly.
- KPI formulas (MTBF, MTTR, availability, RPN, risk score, OEE, health score) live in `src/lib/kpi.ts` with tests in `src/test/kpi.test.ts`.
- Live sensor "streaming" is a client-side simulation (`useLiveTelemetry` in `src/lib/telemetry.ts`) drifting around the latest stored readings — never persist simulated values to the database.
- The UI is dark-only industrial theme; all colors are tokens in `src/styles.css` (`glass`, `glow-*`, `pulse-dot` utilities). New UI strings must be added to the FR/AR dictionary in `src/lib/i18n.tsx`.
- Weibull estimation (median-rank regression on times-between-failures) and Pareto computation live in `src/lib/weibull.ts` with tests in `src/test/kpi.test.ts`; Weibull output is always labeled "statistical model", never shown as measured data, and needs ≥3 intervals (else show the insufficient-data state).
- Critical work orders (priority or machine criticality high/critical) follow submit → awaiting_validation → supervisor validate/reject; validated reports are not editable in the UI.
