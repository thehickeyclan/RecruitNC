/**
 * My Recruits: the coach's home (Matt, 27 Oct 2026). The board and its funnel first
 * (components/my-recruits-board.tsx), then what needs the coach and who to add
 * (components/coach/my-recruits-home.tsx), from Coach Home's loader.
 *
 * ?as=<coach user id>: an admin sees exactly that coach's page, read-only (/admin/view-as-coach).
 */
import { cookies } from "next/headers"
import { AuthGuard } from "@/components/auth-guard"
import { MyRecruitsHome } from "@/components/coach/my-recruits-home"
import { loadCoachHome } from "@/app/coach-home/load-coach-home"
import { VIEW_GENDER_COOKIE } from "@/lib/recruiting/coach-program"
import { createAdminClient } from "@/lib/supabase/admin"
import { createClient } from "@/lib/supabase/server"

export const dynamic = "force-dynamic"

export default async function MyRecruitsPage({ searchParams }: { searchParams: Promise<{ as?: string }> }) {
  const { data: { user } } = await (await createClient()).auth.getUser()
  const admin = createAdminClient()
  let subjectId = user?.id ?? null
  let viewingAs: { userId: string; label: string } | null = null
  const asId = (await searchParams).as?.trim()
  if (user && asId && asId !== user.id) {
    const { data: me } = await admin.from("user_profiles").select("is_admin, role").eq("user_id", user.id).maybeSingle()
    if (me?.is_admin === true || me?.role === "admin") {
      const { data: coach } = await admin.from("user_profiles").select("full_name, email, institution, school_id").eq("user_id", asId).maybeSingle()
      const { data: school } = coach?.school_id ? await admin.from("schools").select("name").eq("id", coach.school_id).maybeSingle() : { data: null }
      subjectId = asId
      viewingAs = {
        userId: asId,
        label: [coach?.full_name || coach?.email || "coach", (school?.name as string | undefined) ?? (coach?.institution as string | undefined)].filter(Boolean).join(" · "),
      }
    }
  }
  const loaded = subjectId ? await loadCoachHome(admin, subjectId, (await cookies()).get(VIEW_GENDER_COOKIE)?.value).catch(() => null) : null
  return (
    <AuthGuard>
      <MyRecruitsHome data={loaded?.access === "ok" ? loaded.data : null} viewingAs={viewingAs} />
    </AuthGuard>
  )
}
