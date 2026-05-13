import { redirect } from "next/navigation"

import { HardLink } from "@/components/hard-link"
import { ScholarshipReviewPanel } from "@/components/scholarships/scholarship-review-panel"
import {
  getApplicationById,
  getScholarshipAdminById,
  listReviewsForApplication,
} from "@/lib/scholarships/admin-queries"
import { userMayViewApplication, userReviewerRoleForScholarship } from "@/lib/scholarships/access"
import type { ScholarshipApplicationStatus } from "@/lib/scholarships/types"
import { createClient } from "@/lib/supabase/server"

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

function committeeIdentityReleased(status: ScholarshipApplicationStatus): boolean {
  return status === "finalist" || status === "awarded"
}

/** Parent secondary-reference lines are appended to wrestling_moment server-side — strip for committee blind scoring. */
function committeeSafeAdditionalContext(raw: string | null): string | null {
  if (!raw) return null
  const marker = "---\nSecond reference"
  const idx = raw.indexOf(marker)
  if (idx === -1) return raw
  const head = raw.slice(0, idx).trim()
  return head.length ? head : null
}

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

  const committeeBlind = role === "committee" && !committeeIdentityReleased(app.status)

  const isVideoSubmission =
    app.submission_format === "video" || Boolean(app.video_url?.trim() || app.video_blob_url?.trim())

  const blindAdditionalContext = committeeBlind ? committeeSafeAdditionalContext(app.wrestling_moment) : app.wrestling_moment

  const displayTitle =
    committeeBlind && app.anonymous_id
      ? app.anonymous_id
      : committeeBlind
        ? "Blind review application"
        : app.athlete_name

  const showAthleteIdentityBlock = !committeeBlind || role === "family" || role === "admin"

  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6 sm:py-14">
      <HardLink href="/scholarships/review" className="text-sm font-semibold text-[#C8A94A] underline-offset-4 hover:underline">
        ← All applications
      </HardLink>

      {role === "family" ? (
        <p className="mt-10 rounded-xl border border-[#C8A94A]/22 bg-[#0B2545]/35 px-4 py-5 text-sm leading-relaxed text-white/78">
          Thank you for being part of this. Your voice matters to every decision we make.
        </p>
      ) : null}

      <p className="font-[family-name:var(--font-fundraising-display)] mt-10 text-[10px] font-bold uppercase tracking-[0.28em] text-[#CC0000]">
        Scholarship review
      </p>
      <h1 className="font-[family-name:var(--font-fundraising-display)] mt-3 text-2xl font-black uppercase text-white">{displayTitle}</h1>
      <p className="mt-2 text-sm text-white/65">
        {scholarship?.name ?? "Scholarship"} · <span className="uppercase tracking-wide text-[#C8A94A]/90">{app.status}</span>
      </p>

      {committeeBlind ? (
        <p className="mt-6 rounded-lg border border-emerald-500/25 bg-emerald-950/20 px-4 py-3 text-sm leading-relaxed text-emerald-100/90">
          Blind review: written essay or video (link / file) and optional context only. Athlete name, school, and nominator identity stay
          hidden until finalists are named.
        </p>
      ) : null}

      {showAthleteIdentityBlock ? (
        <section className="mt-10 rounded-xl border border-white/10 bg-[#0B2545]/45 p-4 sm:p-6">
          <h2 className="font-[family-name:var(--font-fundraising-display)] text-xs font-bold uppercase tracking-[0.2em] text-[#C8A94A]">
            Athlete
          </h2>
          <dl className="mt-4 space-y-2 text-sm text-white/78">
            <div>
              <dt className="text-[11px] font-semibold uppercase tracking-wide text-white/45">Name</dt>
              <dd>{app.athlete_name}</dd>
            </div>
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
      ) : null}

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
            {typeof app.nominator_known_duration === "string" && app.nominator_known_duration.trim() ? (
              <div>
                <dt className="text-[11px] font-semibold uppercase tracking-wide text-white/45">Known athlete</dt>
                <dd>{app.nominator_known_duration}</dd>
              </div>
            ) : null}
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
          {isVideoSubmission ? "Video submission" : "Written essay"}
        </h2>
        {isVideoSubmission ? (
          <div className="mt-4 space-y-3 text-sm leading-relaxed text-white/82">
            {app.video_url ? (
              <p>
                <span className="text-white/55">Hosted link: </span>
                <a
                  href={app.video_url}
                  className="font-semibold text-[#C8A94A] underline-offset-4 hover:underline"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {app.video_url}
                </a>
              </p>
            ) : null}
            {app.video_blob_url ? (
              <p>
                <span className="text-white/55">Uploaded file: </span>
                <a
                  href={app.video_blob_url}
                  className="font-semibold text-[#C8A94A] underline-offset-4 hover:underline"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Open video
                </a>
              </p>
            ) : null}
            {!app.video_url && !app.video_blob_url ? (
              <p className="text-white/55">No video URL on file.</p>
            ) : null}
          </div>
        ) : (
          <div className="mt-4 whitespace-pre-wrap text-sm leading-relaxed text-white/82">{app.written_statement}</div>
        )}
      </section>

      {blindAdditionalContext ? (
        <section className="mt-6 rounded-xl border border-white/10 bg-[#0B2545]/45 p-4 sm:p-6">
          <h2 className="font-[family-name:var(--font-fundraising-display)] text-xs font-bold uppercase tracking-[0.2em] text-[#C8A94A]">
            Additional context
          </h2>
          <div className="mt-4 whitespace-pre-wrap text-sm leading-relaxed text-white/82">{blindAdditionalContext}</div>
        </section>
      ) : null}

      {!committeeBlind ? (
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
      ) : (
        <section className="mt-10 rounded-xl border border-white/[0.07] bg-black/15 px-4 py-5">
          <p className="text-sm leading-relaxed text-white/55">
            Committee blind phase: other reviewers' scores and comments stay hidden here until finalists are named — score independently using your own form below.
          </p>
        </section>
      )}

      <div className="mt-10">
        <ScholarshipReviewPanel applicationId={app.id} scholarshipId={app.scholarship_id} role={panelRole} />
      </div>
    </div>
  )
}
