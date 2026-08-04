import type { Metadata } from "next"

import { ScholarshipSubmissionEditor } from "@/components/scholarships/scholarship-submission-editor"
import { verifyScholarshipSubmissionEditToken } from "@/lib/scholarships/submission-edit-link"
import { createAdminClient } from "@/lib/supabase/admin"

export const dynamic = "force-dynamic"

export const metadata: Metadata = {
  title: "View or edit your nomination | NC United",
  robots: { index: false, follow: false },
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

function PrivateLinkError() {
  return (
    <main className="min-h-screen bg-[#061224] px-4 py-16 text-white sm:px-6">
      <div className="mx-auto max-w-xl rounded-2xl border border-white/10 bg-[#0B2545]/45 p-6 sm:p-8">
        <p className="text-xs font-black uppercase tracking-[0.2em] text-[#C8A94A]">Private nomination</p>
        <h1 className="mt-4 text-2xl font-black">This private link is not valid.</h1>
        <p className="mt-4 text-sm leading-relaxed text-white/65">
          Use the complete link from your confirmation email. If you need a new link, email{" "}
          <a className="text-[#C8A94A] hover:underline" href="mailto:info@ncwrestlingunited.com">
            info@ncwrestlingunited.com
          </a>
          .
        </p>
      </div>
    </main>
  )
}

export default async function ScholarshipSubmissionPage({
  params,
  searchParams,
}: {
  params: Promise<{ applicationId: string }>
  searchParams: Promise<{ token?: string | string[] }>
}) {
  const { applicationId } = await params
  const query = await searchParams
  const token = typeof query.token === "string" ? query.token : ""

  if (!UUID_RE.test(applicationId) || !token) return <PrivateLinkError />

  const admin = createAdminClient()
  const { data, error } = await admin.from("scholarship_applications").select("*").eq("id", applicationId).maybeSingle()
  if (error || !data || typeof data.nominator_email !== "string") return <PrivateLinkError />
  if (!verifyScholarshipSubmissionEditToken(applicationId, data.nominator_email, token)) return <PrivateLinkError />

  const scholarshipResult = await admin
    .from("scholarships")
    .select("name, slug")
    .eq("id", data.scholarship_id)
    .maybeSingle()
  const scholarshipName = scholarshipResult.data?.name || "Scholarship nomination"
  const scholarshipSlug = scholarshipResult.data?.slug || "caden-perry"

  return (
    <main className="min-h-screen bg-[#061224] px-4 py-10 text-white sm:px-6 sm:py-14">
      <div className="mx-auto max-w-2xl">
        <a
          href={`/fundraising/scholarships/${encodeURIComponent(scholarshipSlug)}`}
          className="text-sm font-semibold text-[#C8A94A] underline-offset-4 hover:underline"
        >
          ← {scholarshipName}
        </a>
        <p className="mt-10 text-xs font-black uppercase tracking-[0.2em] text-[#C8A94A]">Private nomination</p>
        <h1 className="mt-3 text-3xl font-black tracking-tight sm:text-4xl">View or edit your submission</h1>
        <p className="mt-4 text-sm leading-relaxed text-white/65">
          Your nomination is private. Review the information below and save any corrections or additions.
        </p>

        <ScholarshipSubmissionEditor
          applicationId={applicationId}
          token={token}
          initial={{
            athlete_name: String(data.athlete_name ?? ""),
            athlete_school: String(data.athlete_school ?? ""),
            athlete_grad_year: typeof data.athlete_grad_year === "number" ? data.athlete_grad_year : null,
            athlete_weight_class: data.athlete_weight_class ?? null,
            athlete_email: data.athlete_email ?? null,
            athlete_phone: data.athlete_phone ?? null,
            nominator_name: String(data.nominator_name ?? ""),
            nominator_relationship: String(data.nominator_relationship ?? ""),
            nominator_email: data.nominator_email,
            nominator_phone: data.nominator_phone ?? null,
            nominator_known_duration: data.nominator_known_duration ?? null,
            submission_format: data.submission_format ?? "written",
            written_statement: String(data.written_statement ?? ""),
            video_url: data.video_url ?? null,
            video_blob_url: data.video_blob_url ?? null,
          }}
        />
      </div>
    </main>
  )
}
