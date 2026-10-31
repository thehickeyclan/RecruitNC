import type { Metadata } from "next"
import { createAdminClient } from "@/lib/supabase/admin"
import { requireAdmin } from "@/lib/admin-auth"
import { verifyApprovalToken } from "@/lib/commitments/approval-link"
import { loadSubmission } from "@/lib/commitments/apply"
import { SUBMITTER_ROLE_LABEL, type SubmitterRole } from "@/lib/commitments/intake"
import { buildCollegeNameLookup, getAllColleges, resolveCollegeByName } from "@/lib/colleges"
import { ApproveCommitmentClient, type ProfileOption } from "./approve-commitment-client"

export const dynamic = "force-dynamic"
export const metadata: Metadata = { title: "Approve commitment", robots: { index: false, follow: false } }

/**
 * The page behind the link in Matt's text: one reported commitment, everything needed to say yes,
 * and one button. Opening it changes nothing; approving is a POST (message apps fetch links to
 * draw previews). The token in the link is the permission, so it works signed out on his phone.
 */
export default async function ApproveCommitmentPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<{ t?: string }>
}) {
  const { id } = await params
  const { t } = await searchParams
  const allowed = verifyApprovalToken(id, t) || (await requireAdmin()).ok
  if (!allowed) {
    return (
      <Shell>
        <p className="text-white/70">This link has expired or is not valid. Open the submission from the admin page instead.</p>
      </Shell>
    )
  }

  const admin = createAdminClient()
  const sub = await loadSubmission(admin, id)
  if (!sub) {
    return (
      <Shell>
        <p className="text-white/70">That submission no longer exists.</p>
      </Shell>
    )
  }

  // The profile it points at, or the likeliest ones when the reporter could not find it.
  const profileSelect = 'id, name, highschool, graduationyear, "wrestlingClub", college, gender'
  let profiles: ProfileOption[] = []
  const toOption = (a: Record<string, unknown>): ProfileOption => ({
    id: String(a.id),
    name: String(a.name ?? ""),
    detail: [a.highschool, a.graduationyear ? `Class of ${a.graduationyear}` : null, a.wrestlingClub].filter(Boolean).join(" · "),
    college: String(a.college ?? "").trim() || null,
  })
  if (sub.athlete_id) {
    const { data } = await admin.from("athletes").select(profileSelect).eq("id", sub.athlete_id).maybeSingle()
    if (data) profiles = [toOption(data)]
  } else if (sub.last_name) {
    const { data } = await admin
      .from("athletes")
      .select(profileSelect)
      .ilike("lastName", String(sub.last_name).trim())
      .order("graduationyear", { ascending: false })
      .limit(8)
    profiles = (data ?? []).map(toOption)
  }

  const colleges = await getAllColleges(admin)
  const collegeMatch = sub.college_id
    ? (colleges.find((c) => c.id === sub.college_id) ?? null)
    : sub.college
      ? resolveCollegeByName(sub.college, buildCollegeNameLookup(colleges))
      : null

  const role = (sub.submitter_role ?? "other") as SubmitterRole
  return (
    <Shell>
      <ApproveCommitmentClient
        submissionId={sub.id}
        token={t ?? ""}
        status={sub.status ?? "pending"}
        athleteName={[sub.first_name, sub.last_name].filter(Boolean).join(" ")}
        reportedDetail={[sub.high_school, sub.graduation_year ? `Class of ${sub.graduation_year}` : null].filter(Boolean).join(" · ")}
        profiles={profiles}
        profileWasChosen={Boolean(sub.athlete_id)}
        collegeTyped={sub.college ?? ""}
        collegeMatchId={collegeMatch?.id ?? null}
        colleges={colleges
          .map((c) => ({ id: c.id, name: c.name, division: c.division ?? null }))
          .sort((a, b) => a.name.localeCompare(b.name))}
        facts={[
          ["Announced", sub.commitment_date ? new Date(`${sub.commitment_date}T12:00:00Z`).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" }) : null],
          ["College weight", sub.college_weight_class ? `${sub.college_weight_class} lbs` : null],
          ["Major", sub.intended_major],
          ["Sent by", [sub.submitter_name, SUBMITTER_ROLE_LABEL[role]?.toLowerCase()].filter(Boolean).join(", ")],
          ["Contact", sub.submitter_contact],
        ]}
        announcementUrl={sub.commitment_announcement_url}
        photoUrl={sub.commit_picture_url}
      />
    </Shell>
  )
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-[#0A1628] px-4 py-10 text-white">
      <div className="mx-auto max-w-lg">
        <p className="mb-2 text-xs font-bold uppercase tracking-[0.2em] text-[#D3B574]">Commitment report</p>
        {children}
      </div>
    </div>
  )
}
