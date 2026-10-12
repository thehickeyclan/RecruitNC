/**
 * Coach Home exactly as one named coach sees it, on a developer's machine.
 *
 * /dev/coach-preview?coach=coachgarland@virginia.edu
 *
 * Built the morning Virginia's head coach was greeted with Ohio University's logo and nobody
 * could say what he had seen, because seeing it took his password. This runs the same load the
 * real page runs, for any coach, with no session - so a coach's first screen can be looked at
 * before he looks at it.
 *
 * Local development only: it shows one person's account to whoever asks, so it does not exist in
 * a production or preview build at all.
 */
import { notFound } from "next/navigation"
import { createAdminClient } from "@/lib/supabase/admin"
import CoachHomeClient from "@/app/coach-home/coach-home-client"
import { loadCoachHome } from "@/app/coach-home/load-coach-home"

export const dynamic = "force-dynamic"

export default async function CoachPreviewPage({ searchParams }: { searchParams: Promise<{ coach?: string }> }) {
  if (process.env.NODE_ENV === "production") notFound()

  const coach = String((await searchParams).coach ?? "").trim()
  if (!coach) return <p style={{ padding: 24 }}>Add ?coach=email or ?coach=user-id</p>

  const admin = createAdminClient()
  const { data: profile } = await admin
    .from("user_profiles")
    .select("user_id")
    .or(coach.includes("@") ? `email.ilike.${coach}` : `user_id.eq.${coach}`)
    .maybeSingle()
  if (!profile) return <p style={{ padding: 24 }}>No account for {coach}</p>

  const loaded = await loadCoachHome(admin, String(profile.user_id))
  return <CoachHomeClient access={loaded.access} data={loaded.data} />
}
