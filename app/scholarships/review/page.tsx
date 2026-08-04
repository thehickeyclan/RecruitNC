import { redirect } from "next/navigation"

import { HardLink } from "@/components/hard-link"
import { listApplicationsForScholarships, listScholarshipsAdmin } from "@/lib/scholarships/admin-queries"
import { getScholarshipPortalAccess } from "@/lib/scholarships/access"
import type { ScholarshipApplicationRow } from "@/lib/scholarships/types"
import { createClient } from "@/lib/supabase/server"

export default async function ScholarshipReviewHomePage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user?.id) redirect("/auth/signin?returnTo=/scholarships/review")

  const access = await getScholarshipPortalAccess(user.id)
  if (!access.ok) {
    redirect("/fundraising/scholarships")
  }

  const scholarshipIds = access.isRecruitNcAdmin
    ? null
    : access.reviewers.map((r) => r.scholarshipId)

  let applications: ScholarshipApplicationRow[] = []
  if (access.isRecruitNcAdmin) {
    const allScholarships = await listScholarshipsAdmin()
    applications = await listApplicationsForScholarships(allScholarships.map((s) => s.id))
  } else if (scholarshipIds && scholarshipIds.length > 0) {
    applications = await listApplicationsForScholarships(scholarshipIds)
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6 sm:py-14">
      <HardLink href="/fundraising/scholarships" className="text-sm font-semibold text-[#C8A94A] underline-offset-4 hover:underline">
        ← Scholarships hub
      </HardLink>

      <p className="font-[family-name:var(--font-fundraising-display)] mt-10 text-[10px] font-bold uppercase tracking-[0.28em] text-[#CC0000]">
        NC United · Review portal
      </p>
      <h1 className="font-[family-name:var(--font-fundraising-display)] mt-3 text-[clamp(1.75rem,4vw,2.35rem)] font-black uppercase leading-tight text-white">
        Applications
      </h1>
      <p className="mt-4 text-sm leading-relaxed text-white/65">
        Confidential admin workspace. Nomination details are not public and must not be shared without the required approvals.
      </p>

      {applications.length === 0 ? (
        <p className="mt-10 text-sm text-white/50">No applications yet.</p>
      ) : (
        <ul className="mt-10 space-y-3">
          {applications.map((a) => (
            <li key={a.id}>
              <HardLink
                href={`/scholarships/review/${a.id}`}
                className="block rounded-xl border border-white/10 bg-[#0B2545]/45 px-4 py-4 transition hover:border-[#C8A94A]/35 hover:bg-[#0B2545]/65"
              >
                <p className="font-semibold text-white">{a.athlete_name}</p>
                <p className="mt-1 text-sm text-white/60">{a.athlete_school}</p>
                <p className="mt-2 text-[11px] font-bold uppercase tracking-wide text-[#C8A94A]/85">{a.status}</p>
              </HardLink>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
