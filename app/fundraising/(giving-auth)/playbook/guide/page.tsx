import type { Metadata } from "next"
import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"

export const metadata: Metadata = {
  title: "Fundraising playbook | NC United Wrestling",
  description: "Redirects to the family fundraising playbook (sign-in required).",
  robots: { index: false, follow: false },
}

/** Canonical playbook lives at `/fundraising/playbook/members`; this URL preserves old bookmarks and emails. */
export default async function FundraisingPlaybookGuideRedirectPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    redirect(`/auth/signin?returnTo=${encodeURIComponent("/fundraising/playbook/members")}`)
  }
  redirect("/fundraising/playbook/members")
}
