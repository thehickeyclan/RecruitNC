import { redirect } from "next/navigation"

import { HardLink } from "@/components/hard-link"
import { ScholarshipReviewPanel } from "@/components/scholarships/scholarship-review-panel"
import {
  getApplicationById,
  getScholarshipAdminById,
  listApplicationsForScholarships,
  listReviewsForApplication,
  listReviewsForApplications,
} from "@/lib/scholarships/admin-queries"
import { userMayViewApplication, userReviewerRoleForScholarship } from "@/lib/scholarships/access"
import { createClient } from "@/lib/supabase/server"
import { identityTokensForApplication, institutionTokens, redactApplicantIdentity } from "@/lib/scholarships/blind-redaction"
import { listRedactableInstitutionNames } from "@/lib/scholarships/institution-names"

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

/** Parent secondary-reference lines are appended to wrestling_moment server-side — strip for committee blind scoring. */
function committeeSafeAdditionalContext(raw: string | null): string | null {
  if (!raw) return null
  const marker = "---\nSecond reference"
  const idx = raw.indexOf(marker)
  if (idx === -1) return raw
  const head = raw.slice(0, idx).trim()
  return head.length ? head : null
}

/** Remove stored applicant identifiers from narrative fields before rendering them to a blind reviewer. */
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
  if (role !== "admin" && app.status !== "finalist") {
    redirect("/scholarships/review")
  }
  const scholarship = await getScholarshipAdminById(app.scholarship_id)
  const reviews = await listReviewsForApplication(applicationId)
  const latestOwnReview = reviews
    .filter((review) => review.reviewer_id === user.id)
    .sort((a, b) => Date.parse(b.created_at) - Date.parse(a.created_at))[0]

  const showContacts = role === "admin"
  const panelRole = role === "family" ? "family" : role === "committee" ? "committee" : "admin"

  // Only NC United administrators may resolve a blind application to its identity.
  // Committee and family panelists remain blind even after finalist/award status changes.
  const panelBlind = role !== "admin"

  const finalistApplications = panelBlind
    ? (await listApplicationsForScholarships([app.scholarship_id]))
        .filter((application) => application.status === "finalist")
        .sort((a, b) => (a.anonymous_id ?? a.id).localeCompare(b.anonymous_id ?? b.id))
    : []
  const finalistReviews = panelBlind
    ? await listReviewsForApplications(finalistApplications.map((application) => application.id))
    : []
  const latestOwnFinalistReviews = new Map<string, (typeof finalistReviews)[number]>()
  for (const review of finalistReviews) {
    if (review.reviewer_id === user.id && !latestOwnFinalistReviews.has(review.application_id)) {
      latestOwnFinalistReviews.set(review.application_id, review)
    }
  }

  const isVideoSubmission =
    app.submission_format === "video" || Boolean(app.video_url?.trim() || app.video_blob_url?.trim())

  /**
   * Everything the application knows about a person, including emails and phone numbers, which the
   * earlier version left in: an address like justin.usmc@yahoo.com names the nominator outright.
   */
  const identityTokens = [
    ...identityTokensForApplication(app),
    /**
     * Every school and club we hold, not just the one on the form. An essay naming a town's school
     * identifies the writer in a state this small, and the school on the application was often
     * somewhere else entirely.
     */
    ...(panelBlind ? institutionTokens(await listRedactableInstitutionNames()) : []),
  ]
  const safeWrittenStatement = panelBlind
    ? redactApplicantIdentity(app.written_statement, identityTokens)
    : app.written_statement
  const blindAdditionalContext = panelBlind
    ? redactApplicantIdentity(committeeSafeAdditionalContext(app.wrestling_moment), identityTokens)
    : app.wrestling_moment

  const displayTitle =
    panelBlind && app.anonymous_id
      ? app.anonymous_id
      : panelBlind
        ? `Application ${app.id.slice(0, 8).toUpperCase()}`
        : app.athlete_name

  const showAthleteIdentityBlock = role === "admin"

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

      {panelBlind ? (
        <p className="mt-6 rounded-lg border border-emerald-500/25 bg-emerald-950/20 px-4 py-3 text-sm leading-relaxed text-emerald-100/90">
          Blind review: the applicant, school, nominator, and reference identities are withheld, and their names, emails and phone numbers are removed from the written answers. Someone the application never named — a coach, a sibling — cannot be redacted automatically, so treat any name you do see as incidental and disregard it.
        </p>
      ) : null}

      {panelBlind && finalistApplications.length > 0 ? (
        <nav className="mt-5 rounded-xl border border-white/10 bg-[#0B2545]/45 p-3" aria-label="Finalist ballot navigation">
          <p className="px-1 text-[10px] font-bold uppercase tracking-[0.2em] text-white/45">Finalist ballot</p>
          <div className="mt-2 grid gap-2 sm:grid-cols-3">
            {finalistApplications.map((finalist, index) => {
              const active = finalist.id === app.id
              const savedRank = latestOwnFinalistReviews.get(finalist.id)?.score
              const label = finalist.anonymous_id?.trim() || `Application ${finalist.id.slice(0, 8).toUpperCase()}`
              return (
                <HardLink
                  key={finalist.id}
                  href={`/scholarships/review/${finalist.id}`}
                  aria-current={active ? "page" : undefined}
                  className={`rounded-lg border px-3 py-3 transition ${
                    active
                      ? "border-[#C8A94A] bg-[#C8A94A]/15 text-white"
                      : "border-white/10 bg-black/15 text-white/75 hover:border-[#C8A94A]/45"
                  }`}
                >
                  <span className="block text-[10px] font-bold uppercase tracking-wide text-white/45">Finalist {index + 1}</span>
                  <span className="mt-1 block font-semibold">{label}</span>
                  <span className={`mt-1 block text-xs ${savedRank ? "text-emerald-300" : "text-white/45"}`}>
                    {savedRank ? `Your rank: ${savedRank}` : "Not ranked yet"}
                  </span>
                </HardLink>
              )
            })}
          </div>
        </nav>
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
        {isVideoSubmission && panelBlind ? (
          <p className="mt-4 text-sm leading-relaxed text-white/65">
            The original video is withheld during blind review because it may reveal the applicant&apos;s identity. Administrators can provide an anonymized transcript for scoring.
          </p>
        ) : isVideoSubmission ? (
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
          <div className="mt-4 whitespace-pre-wrap text-sm leading-relaxed text-white/82">{safeWrittenStatement}</div>
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

      {!panelBlind ? (
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
                    {r.score != null ? ` · rank ${r.score}` : ""}
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
            Final ballot: other panelists&apos; rankings and comments stay hidden. Rank each anonymous finalist independently using your own form below.
          </p>
        </section>
      )}

      <div className="mt-10">
        <ScholarshipReviewPanel
          applicationId={app.id}
          scholarshipId={app.scholarship_id}
          role={panelRole}
          existingRank={latestOwnReview?.score}
          existingComment={latestOwnReview?.comment}
        />
      </div>
    </div>
  )
}
