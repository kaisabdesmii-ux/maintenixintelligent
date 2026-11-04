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
- KPI formulas (MTBF, MTTR, availability, RPN, risk score) live in `src/lib/kpi.ts` with tests in `src/test/kpi.test.ts`.
