import type { Metadata } from "next"
import Link from "next/link"
import { ClubSubmissionForm } from "@/components/clubs/club-submission-form"
import { TocPatrioticBar, tocDisplayClass } from "@/components/toc/toc-theme"
import { createClient } from "@/lib/supabase/server"
import { createAdminClientFresh } from "@/lib/supabase/admin"

export const metadata: Metadata = {
  title: "Submit a Wrestling Club | RecruitNC",
  description: "Submit a North Carolina wrestling club for review and inclusion on the RecruitNC club map.",
}

async function getSubmitter() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { isSignedIn: false, userName: "", userEmail: "" }
  }

  const admin = createAdminClientFresh()
  const { data: profile } = await admin
    .from("user_profiles")
    .select("*")
    .or(`user_id.eq.${user.id},id.eq.${user.id},email.eq.${user.email ?? ""}`)
    .maybeSingle()

  const profileRecord = (profile ?? {}) as Record<string, unknown>
  const userName =
    String(profileRecord.full_name ?? "").trim() ||
    String(profileRecord.name ?? "").trim() ||
    [profileRecord.first_name, profileRecord.last_name].filter(Boolean).join(" ").trim() ||
    String(profileRecord.display_name ?? "").trim() ||
    user.email ||
    "RecruitNC user"

  return { isSignedIn: true, userName, userEmail: user.email ?? "" }
}

export default async function SubmitClubPage() {
  const submitter = await getSubmitter()

  return (
    <main className="min-h-screen bg-[#060f1f] text-white">
      <section className="relative overflow-hidden border-b border-white/10 bg-[#0B1D3A]">
        <TocPatrioticBar />
        <div className="absolute inset-0 opacity-[0.16] [background-image:linear-gradient(rgba(255,255,255,.08)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.08)_1px,transparent_1px)] [background-size:64px_64px]" />
        <div className="absolute -right-24 top-8 h-72 w-72 rounded-full bg-[#CC0000]/20 blur-3xl" />
        <div className="relative mx-auto max-w-5xl px-4 py-12 sm:px-6 lg:px-8">
          <Link href="/clubs" className="text-sm font-bold text-[#D7B968] hover:text-white">
            ← Back to club map
          </Link>
          <p className="mt-8 text-xs font-bold uppercase tracking-[0.32em] text-[#D7B968]">Club locator</p>
          <h1 className={`mt-4 text-5xl leading-[0.95] text-white sm:text-7xl ${tocDisplayClass()}`}>
            Submit a club
          </h1>
          <p className="mt-5 max-w-3xl text-lg leading-8 text-white/70">
            Help RecruitNC build the cleanest public map of North Carolina wrestling rooms. Club owners, coaches,
            parents, and community members can submit a club for review.
          </p>
        </div>
        <TocPatrioticBar />
      </section>

      <section className="mx-auto max-w-5xl px-4 py-10 sm:px-6 lg:px-8">
        <ClubSubmissionForm {...submitter} />
      </section>
    </main>
  )
}
