import { redirect } from "next/navigation"

import { HardLink } from "@/components/hard-link"
import { ScholarshipReviewPanel } from "@/components/scholarships/scholarship-review-panel"
import {
  getApplicationById,
  getScholarshipAdminById,
  listReviewsForApplication,
} from "@/lib/scholarships/admin-queries"
import { userMayViewApplication, userReviewerRoleForScholarship } from "@/lib/scholarships/access"
import { createClient } from "@/lib/supabase/server"

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

export default async function ScholarshipApplicationReviewPage({
  params,
}: {
  params: Promise<{ applicationId: string }>
}) {
  const { applicationId } = await params
  if (!UUID_RE.test(applicationId)) {
    redirect("/scholarships/review")
  }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user?.id) redirect("/auth/signin?returnTo=/scholarships/review")

  const app = await getApplicationById(applicationId)
  if (!app) {
    redirect("/scholarships/review")
  }

  const ok = await userMayViewApplication(user.id, app.scholarship_id)
  if (!ok) {
    redirect("/fundraising/scholarships")
  }

  const role = await userReviewerRoleForScholarship(user.id, app.scholarship_id)
  const scholarship = await getScholarshipAdminById(app.scholarship_id)
  const reviews = await listReviewsForApplication(applicationId)

  const showContacts = role === "admin"
  const panelRole = role === "family" ? "family" : role === "committee" ? "committee" : "admin"

  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6 sm:py-14">
      <HardLink href="/scholarships/review" className="text-sm font-semibold text-[#C8A94A] underline-offset-4 hover:underline">
        ← All applications
      </HardLink>

      <p className="font-[family-name:var(--font-fundraising-display)] mt-10 text-[10px] font-bold uppercase tracking-[0.28em] text-[#CC0000]">
        Scholarship review
      </p>
      <h1 className="font-[family-name:var(--font-fundraising-display)] mt-3 text-2xl font-black uppercase text-white">
        {app.athlete_name}
      </h1>
      <p className="mt-2 text-sm text-white/65">
        {scholarship?.name ?? "Scholarship"} · <span className="uppercase tracking-wide text-[#C8A94A]/90">{app.status}</span>
      </p>

      <section className="mt-10 rounded-xl border border-white/10 bg-[#0B2545]/45 p-4 sm:p-6">
        <h2 className="font-[family-name:var(--font-fundraising-display)] text-xs font-bold uppercase tracking-[0.2em] text-[#C8A94A]">
          Athlete
        </h2>
        <dl className="mt-4 space-y-2 text-sm text-white/78">
          <div>
            <dt className="text-[11px] font-semibold uppercase tracking-wide text-white/45">School</dt>
            <dd>{app.athlete_school}</dd>
          </div>
          {app.athlete_grad_year ? (
            <div>
              <dt className="text-[11px] font-semibold uppercase tracking-wide text-white/45">Grad year</dt>
              <dd className="tabular-nums">{app.athlete_grad_year}</dd>
            </div>
          ) : null}
          {showContacts ? (
            <>
              <div>
                <dt className="text-[11px] font-semibold uppercase tracking-wide text-white/45">Athlete email</dt>
                <dd>{app.athlete_email ?? "—"}</dd>
              </div>
              <div>
                <dt className="text-[11px] font-semibold uppercase tracking-wide text-white/45">Athlete phone</dt>
                <dd>{app.athlete_phone ?? "—"}</dd>
              </div>
            </>
          ) : null}
        </dl>
      </section>

      {showContacts ? (
        <section className="mt-6 rounded-xl border border-white/10 bg-[#0B2545]/45 p-4 sm:p-6">
          <h2 className="font-[family-name:var(--font-fundraising-display)] text-xs font-bold uppercase tracking-[0.2em] text-[#C8A94A]">
            Nominator & reference
          </h2>
          <dl className="mt-4 space-y-2 text-sm text-white/78">
            <div>
              <dt className="text-[11px] font-semibold uppercase tracking-wide text-white/45">Nominator</dt>
              <dd>
                {app.nominator_name} ({app.nominator_relationship}) · {app.nominator_email}
                {app.nominator_phone ? ` · ${app.nominator_phone}` : ""}
              </dd>
            </div>
            {app.reference_name ? (
              <div>
                <dt className="text-[11px] font-semibold uppercase tracking-wide text-white/45">Reference</dt>
                <dd>
                  {app.reference_name}
                  {app.reference_relationship ? ` · ${app.reference_relationship}` : ""}
                  {app.reference_email ? ` · ${app.reference_email}` : ""}
                  {app.reference_phone ? ` · ${app.reference_phone}` : ""}
                </dd>
              </div>
            ) : null}
          </dl>
        </section>
      ) : null}

      <section className="mt-6 rounded-xl border border-white/10 bg-[#0B2545]/45 p-4 sm:p-6">
        <h2 className="font-[family-name:var(--font-fundraising-display)] text-xs font-bold uppercase tracking-[0.2em] text-[#C8A94A]">
          Written statement
        </h2>
        <div className="mt-4 whitespace-pre-wrap text-sm leading-relaxed text-white/82">{app.written_statement}</div>
      </section>

      {app.wrestling_moment ? (
        <section className="mt-6 rounded-xl border border-white/10 bg-[#0B2545]/45 p-4 sm:p-6">
          <h2 className="font-[family-name:var(--font-fundraising-display)] text-xs font-bold uppercase tracking-[0.2em] text-[#C8A94A]">
            Wrestling moment
          </h2>
          <div className="mt-4 whitespace-pre-wrap text-sm leading-relaxed text-white/82">{app.wrestling_moment}</div>
        </section>
      ) : null}

      <section className="mt-10">
        <h2 className="font-[family-name:var(--font-fundraising-display)] text-xs font-bold uppercase tracking-[0.2em] text-[#C8A94A]">
          Reviews
        </h2>
        {reviews.length === 0 ? (
          <p className="mt-4 text-sm text-white/50">No notes yet.</p>
        ) : (
          <ul className="mt-4 space-y-4">
            {reviews.map((r) => (
              <li key={r.id} className="rounded-lg border border-white/[0.07] bg-black/20 px-4 py-3">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-white/45">
                  {r.reviewer_name ?? "Reviewer"} · {r.reviewer_role ?? "—"}
                  {r.score != null ? ` · score ${r.score}` : ""}
                  {r.is_finalist_vote ? " · finalist pick" : ""}
                </p>
                {r.comment ? <p className="mt-2 text-sm leading-relaxed text-white/78">{r.comment}</p> : null}
              </li>
            ))}
          </ul>
        )}
      </section>

      <div className="mt-10">
        <ScholarshipReviewPanel applicationId={app.id} scholarshipId={app.scholarship_id} role={panelRole} />
      </div>
    </div>
  )
}
