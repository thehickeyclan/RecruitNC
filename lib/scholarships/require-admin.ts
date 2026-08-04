import { redirect } from "next/navigation"

import { getScholarshipPortalAccess } from "@/lib/scholarships/access"
import { createClient } from "@/lib/supabase/server"

/** Authorize before an admin page starts any scholarship data query. */
export async function requireScholarshipAdmin(returnTo: string): Promise<void> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user?.id) {
    redirect(`/auth/signin?returnTo=${encodeURIComponent(returnTo)}`)
  }

  const access = await getScholarshipPortalAccess(user.id)
  if (!access.ok || !access.isRecruitNcAdmin) {
    redirect("/")
  }
}
