/** Shown when Supabase returns 42501 on toc_invitations (missing service_role policy or wrong API key). */
export const TOC_INVITATIONS_RLS_SQL = `-- Fix TOC invitations admin writes (Supabase SQL Editor)
drop policy if exists "Service role full toc_invitations" on public.toc_invitations;
create policy "Service role full toc_invitations"
  on public.toc_invitations for all to service_role using (true) with check (true);`

export function tocInvitationsRlsHelp(error: { code?: string } | null | undefined): string | null {
  if (error?.code !== "42501") return null
  return [
    "Row-level security blocked toc_invitations.",
    "In Supabase SQL Editor run the policy in docs/sql/toc-fix-invitations-rls.sql.txt.",
    "In Vercel, confirm SUPABASE_SERVICE_ROLE_KEY is the service_role secret (not the anon key), then redeploy.",
  ].join(" ")
}
