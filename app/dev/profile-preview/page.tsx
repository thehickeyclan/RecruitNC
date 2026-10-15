/**
 * The top of /profile exactly as one named account sees it, on a developer's machine.
 *
 * /dev/profile-preview?as=parent@example.com
 *
 * Everyone opens /profile - athletes, parents, fans and college coaches - and each gets a
 * different first screen. This runs the same loads the real page runs, for any account, with no
 * session. Local development only: it does not exist in a production or preview build.
 */
import { notFound } from "next/navigation"
import { createAdminClient } from "@/lib/supabase/admin"
import { MyWrestlers } from "@/app/profile/my-wrestlers"
import { loadMyWrestlers, loadProfileAudience } from "@/app/profile/load-my-wrestlers"

export const dynamic = "force-dynamic"

export default async function ProfilePreviewPage({ searchParams }: { searchParams: Promise<{ as?: string }> }) {
  if (process.env.NODE_ENV === "production") notFound()

  const who = String((await searchParams).as ?? "").trim()
  if (!who) return <p style={{ padding: 24 }}>Add ?as=email or ?as=user-id</p>

  const { data: profile } = await createAdminClient()
    .from("user_profiles")
    .select("user_id")
    .or(who.includes("@") ? `email.ilike.${who}` : `user_id.eq.${who}`)
    .maybeSingle()
  if (!profile) return <p style={{ padding: 24 }}>No account for {who}</p>

  const userId = String(profile.user_id)
  return <MyWrestlers wrestlers={await loadMyWrestlers(userId)} audience={await loadProfileAudience(userId)} />
}
