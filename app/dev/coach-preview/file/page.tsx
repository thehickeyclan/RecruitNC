/**
 * A recruiting file exactly as one coach sees it, on a developer's machine, with no session (as
 * /dev/coach-preview does for Coach Home):
 *
 * /dev/coach-preview/file?coach=coach@school.edu&athlete=<athlete id>
 *
 * Read-only; &edit=1 draws the editing controls instead (nothing saves without a session). Local development only: it does not exist in a production or preview build.
 */
import { notFound } from "next/navigation"
import { RecruitFileView } from "@/components/coach/recruit-file"
import { fileViewer, loadRecruitFile } from "@/lib/recruiting/recruit-file"
import { createAdminClient } from "@/lib/supabase/admin"

export const dynamic = "force-dynamic"

export default async function RecruitFilePreview({ searchParams }: { searchParams: Promise<{ coach?: string; athlete?: string; edit?: string }> }) {
  if (process.env.NODE_ENV === "production") notFound()
  const sp = await searchParams
  const coach = String(sp.coach ?? "").trim()
  const athlete = String(sp.athlete ?? "").trim()
  if (!coach || !athlete) return <p style={{ padding: 24 }}>Add ?coach=email-or-user-id&athlete=id</p>
  const admin = createAdminClient()
  const { data: profile } = await admin
    .from("user_profiles")
    .select("user_id, full_name")
    .or(coach.includes("@") ? `email.ilike.${coach}` : `user_id.eq.${coach}`)
    .maybeSingle()
  if (!profile) return <p style={{ padding: 24 }}>No account for {coach}</p>
  const file = await loadRecruitFile(admin, await fileViewer(admin, String(profile.user_id)), athlete)
  return <RecruitFileView file={file} viewingAs={sp.edit ? null : { userId: String(profile.user_id), label: `${profile.full_name ?? coach} (dev preview)` }} />
}
