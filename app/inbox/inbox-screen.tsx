import { AuthGuard } from "@/components/auth-guard"
import { viewSubject } from "@/lib/view-as/subject"
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
  /*
   * Not a family when an admin or business account is viewing a coach's portal: that page already
   * has the coach menu, and the family one drew a second menu beside it (Matt, 4 Nov 2026).
   */
  const viewing = data.user ? (await viewSubject(createAdminClient(), data.user)).viewer !== "self" : false
  const family = Boolean(data.user) && !viewing && !isCollegeCoachRole(profile?.role as string | null)
  const panes = (
    <AuthGuard>
      <InboxPanes initialThreadId={threadId} embedded={family} />
    </AuthGuard>
  )
  return family ? <PortalShell active="messages">{panes}</PortalShell> : panes
}
