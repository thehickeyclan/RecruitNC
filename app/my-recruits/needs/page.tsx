/**
 * Recruiting needs: the weights and class years this staff is recruiting, posted in a few taps,
 * each with the wrestlers who fit it (lib/recruiting/needs.ts).
 *
 * ?as=<coach user id>: an admin sees that coach's needs, read-only, like My Recruits.
 */
import { viewSubject } from "@/lib/view-as/subject"
import { createAdminClient } from "@/lib/supabase/admin"
import { createClient } from "@/lib/supabase/server"
import { AuthGuard } from "@/components/auth-guard"
import { NeedsBoard } from "@/components/coach/needs-board"

export const dynamic = "force-dynamic"
export const metadata = { title: "Recruiting Needs" }

export default async function NeedsPage({ searchParams }: { searchParams: Promise<{ as?: string }> }) {
  // ?as=, or the coach kept for this visit, when an admin or business account may view as them.
  const { data: { user } } = await (await createClient()).auth.getUser()
  const subject = user ? await viewSubject(createAdminClient(), user, (await searchParams).as) : null
  const as = subject && subject.viewer !== "self" ? subject.subjectId : null
  return (
    <AuthGuard>
      <NeedsBoard asUserId={as} />
    </AuthGuard>
  )
}
