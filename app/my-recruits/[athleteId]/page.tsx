/**
 * A wrestler's recruiting file (Matt, 2 Nov 2026): this program and this wrestler, private to the
 * staff, inside the coach portal (components/coach/recruit-file.tsx). Opened from every row and
 * card on My Recruits, and from the "In your recruits" bar on the profile.
 *
 * ?as=<coach user id>: an admin sees exactly that coach's file, read-only, as on My Recruits.
 */
import type { Metadata } from "next"
import { AuthGuard } from "@/components/auth-guard"
import { RecruitFileView } from "@/components/coach/recruit-file"
import { fileViewer, loadRecruitFile } from "@/lib/recruiting/recruit-file"
import { createAdminClient } from "@/lib/supabase/admin"
import { createClient } from "@/lib/supabase/server"

export const dynamic = "force-dynamic"
export const metadata: Metadata = { title: "Recruiting file", robots: { index: false, follow: false } }

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

function Message({ text }: { text: string }) {
  return (
    <div className="mx-auto max-w-xl px-4 py-16 text-center text-white">
      <p className="text-base font-bold">{text}</p>
      <a href="/my-recruits" className="mt-3 inline-block text-sm font-bold text-[#D3B574] hover:underline">
        Back to My Recruits
      </a>
    </div>
  )
}

export default async function RecruitFilePage({ params, searchParams }: { params: Promise<{ athleteId: string }>; searchParams: Promise<{ as?: string }> }) {
  const { athleteId } = await params
  const {
    data: { user },
  } = await (await createClient()).auth.getUser()
  if (!user) return <AuthGuard>{null}</AuthGuard>
  if (!UUID.test(athleteId)) return <Message text="No wrestler found." />

  const admin = createAdminClient()
  const me = await fileViewer(admin, user.id)
  let viewer = me
  let viewingAs: { userId: string; label: string } | null = null
  const asId = (await searchParams).as?.trim()
  if (asId && asId !== user.id && me.isAdmin && UUID.test(asId)) {
    const { data: coach } = await admin.from("user_profiles").select("full_name, email, institution, school_id").eq("user_id", asId).maybeSingle()
    const { data: school } = coach?.school_id ? await admin.from("schools").select("name").eq("id", coach.school_id).maybeSingle() : { data: null }
    viewer = await fileViewer(admin, asId)
    viewingAs = {
      userId: asId,
      label: [coach?.full_name || coach?.email || "coach", (school?.name as string | undefined) ?? (coach?.institution as string | undefined)].filter(Boolean).join(" · "),
    }
  }
  if (!viewer.isCollegeCoach && !me.isAdmin) return <Message text="Recruiting files are for college coaches." />

  const file = await loadRecruitFile(admin, viewer, athleteId).catch((e: unknown) => {
    console.error("[recruit-file] load failed:", e)
    return null
  })
  if (!file || (!file.row && !file.basic)) return <Message text="No wrestler found." />
  return (
    <AuthGuard>
      <RecruitFileView file={file} viewingAs={viewingAs} />
    </AuthGuard>
  )
}
