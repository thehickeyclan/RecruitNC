import { AuthGuard } from "@/components/auth-guard"
import { InboxPanes } from "@/components/coach-messages/inbox-panes"
import { PortalShell } from "@/components/portal/portal-shell"
import { isCollegeCoachRole } from "@/lib/coach-auto-approve"
import { createAdminClient } from "@/lib/supabase/admin"
import { createClient } from "@/lib/supabase/server"

/**
 * Messages for a family sit inside the Recruiting Command Center, with its menu; a college coach's
 * inbox never does (the coach portal is separate). Signed out, the guard asks them to sign in.
 */
export async function InboxScreen({ threadId }: { threadId: string | null }) {
  const { data } = await (await createClient()).auth.getUser()
  const { data: profile } = data.user
    ? await createAdminClient().from("user_profiles").select("role").eq("user_id", data.user.id).maybeSingle()
    : { data: null }
  const family = Boolean(data.user) && !isCollegeCoachRole(profile?.role as string | null)
  const panes = (
    <AuthGuard>
      <InboxPanes initialThreadId={threadId} embedded={family} />
    </AuthGuard>
  )
  return family ? <PortalShell active="messages">{panes}</PortalShell> : panes
}
