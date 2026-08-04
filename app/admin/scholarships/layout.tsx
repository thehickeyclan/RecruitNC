import type { ReactNode } from "react"
import { redirect } from "next/navigation"

import { getScholarshipPortalAccess } from "@/lib/scholarships/access"
import { createClient } from "@/lib/supabase/server"

/**
 * Scholarship applications contain sensitive information about minors.
 * Enforce admin access on the server before any page or RSC payload is rendered.
 */
export default async function AdminScholarshipsLayout({ children }: { children: ReactNode }) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user?.id) {
    redirect(`/auth/signin?returnTo=${encodeURIComponent("/admin/scholarships")}`)
  }

  const access = await getScholarshipPortalAccess(user.id)
  if (!access.ok || !access.isRecruitNcAdmin) {
    redirect("/")
  }

  return children
}
