import { notFound } from "next/navigation"

import { AdminTrainingFundAllocationForm } from "@/components/scholarships/admin-training-fund-allocation"
import { HardLink } from "@/components/hard-link"
import {
  listApplicationsForScholarships,
  listScholarshipDonationsAdmin,
  listReviewsForApplications,
} from "@/lib/scholarships/admin-queries"
import { getScholarshipBySlug } from "@/lib/scholarships/public-queries"
import { requireScholarshipAdmin } from "@/lib/scholarships/require-admin"
import { scholarshipSubmissionEditPath } from "@/lib/scholarships/submission-edit-link"

function formatUsd(cents: number): string {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(
    cents / 100,
  )
}

export default async function AdminScholarshipDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  await requireScholarshipAdmin(`/admin/scholarships/${encodeURIComponent(slug)}`)
  const s = await getScholarshipBySlug(slug)
  if (!s) notFound()

  const apps = await listApplicationsForScholarships([s.id])
  const [donations, reviews] = await Promise.all([
    listScholarshipDonationsAdmin(s.id),
    listReviewsForApplications(apps.map((application) => application.id)),
  ])

  const applicationsById = new Map(apps.map((application) => [application.id, application]))
  const latestPanelReviews = new Map<string, (typeof reviews)[number]>()
  for (const review of reviews) {
    if (review.reviewer_role !== "committee" && review.reviewer_role !== "admin") continue
    const key = `${review.application_id}:${review.reviewer_id}`
    if (!latestPanelReviews.has(key)) latestPanelReviews.set(key, review)
  }

  const rankings = apps
    .map((application) => {
      const currentReviews = [...latestPanelReviews.values()].filter(
        (review) => review.application_id === application.id && review.score != null,
      )
      const scoreTotal = currentReviews.reduce((total, review) => total + (review.score ?? 0), 0)
      return {
        application,
        averageScore: currentReviews.length ? scoreTotal / currentReviews.length : null,
        reviewCount: currentReviews.length,
        finalistVotes: currentReviews.filter((review) => review.is_finalist_vote).length,
      }
    })
    .sort((a, b) => {
      if (a.averageScore == null && b.averageScore == null) return a.application.athlete_name.localeCompare(b.application.athlete_name)
      if (a.averageScore == null) return 1
      if (b.averageScore == null) return -1
      return (
        b.averageScore - a.averageScore ||
        b.finalistVotes - a.finalistVotes ||
        b.reviewCount - a.reviewCount ||
        a.application.athlete_name.localeCompare(b.application.athlete_name)
      )
    })

  return (
    <div className="max-w-4xl text-gray-900">
      <HardLink href="/admin/scholarships" className="text-sm font-semibold text-blue-700 underline">
        ← All scholarships
      </HardLink>
      <h1 className="mt-6 text-2xl font-bold">{s.name}</h1>
      <p className="mt-1 text-sm text-gray-600">
        {s.slug} · status <span className="font-medium">{s.status}</span>
      </p>
      <p className="mt-2 text-sm text-gray-800">
        Public raised total (hub): <span className="font-semibold tabular-nums">{formatUsd(s.total_donated_cents)}</span>
      </p>

      <section className="mt-8">
        <AdminTrainingFundAllocationForm
          scholarshipId={s.id}
          scholarshipSlug={s.slug}
          scholarshipName={s.name}
        />
      </section>

      <section className="mt-10">
        <h2 className="text-lg font-semibold">Gift / allocation log</h2>
        <p className="mt-1 text-xs text-gray-500">
          Rows from Stripe-linked gifts will appear here once wired; training fund allocations show as “Training fund allocation.”
        </p>
        {donations.length === 0 ? (
          <p className="mt-3 text-sm text-gray-600">No rows yet.</p>
        ) : (
          <div className="mt-4 overflow-x-auto rounded-md border border-gray-200 bg-white">
            <table className="min-w-full text-left text-sm">
              <thead className="border-b border-gray-200 bg-gray-50 text-xs uppercase tracking-wide text-gray-600">
                <tr>
                  <th className="px-3 py-2 font-medium">Date</th>
                  <th className="px-3 py-2 font-medium">Amount</th>
                  <th className="px-3 py-2 font-medium">Source</th>
                  <th className="px-3 py-2 font-medium">Detail</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {donations.map((d) => (
                  <tr key={d.id}>
                    <td className="whitespace-nowrap px-3 py-2 tabular-nums text-gray-700">
                      {new Date(d.created_at).toLocaleString()}
                    </td>
                    <td className="whitespace-nowrap px-3 py-2 font-medium tabular-nums">{formatUsd(d.amount_cents)}</td>
                    <td className="px-3 py-2 text-gray-700">
                      {d.source === "training_fund_allocation"
                        ? "Training fund"
                        : d.source === "donor_checkout"
                          ? "Donor checkout"
                          : (d.source ?? "—")}
                    </td>
                    <td className="px-3 py-2 text-gray-700">
                      <span className="font-medium">{d.donor_name ?? "—"}</span>
                      {d.admin_note ? (
                        <span className="mt-0.5 block text-xs text-gray-500">{d.admin_note}</span>
                      ) : null}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="mt-10">
        <h2 className="text-lg font-semibold">Applications ({apps.length})</h2>
        {apps.length === 0 ? (
          <p className="mt-3 text-sm text-gray-600">None yet.</p>
        ) : (
          <ul className="mt-4 divide-y divide-gray-200 rounded-md border border-gray-200 bg-white">
            {apps.map((a) => (
              <li key={a.id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
                <div>
                  <p className="font-medium">{a.athlete_name}</p>
                  <p className="text-xs text-gray-500">
                    {a.athlete_school} · submitted by {a.nominator_name}
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-3">
                  <HardLink href={`/scholarships/review/${a.id}`} className="text-sm text-blue-700 underline">
                    Open in review portal
                  </HardLink>
                  <HardLink
                    href={scholarshipSubmissionEditPath(a.id, a.nominator_email)}
                    className="text-sm text-blue-700 underline"
                  >
                    Open submitter edit page
                  </HardLink>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="mt-10">
        <h2 className="text-lg font-semibold">Panel stack ranking</h2>
        <p className="mt-1 text-xs text-gray-500">
          Average of each committee or admin panelist&apos;s latest 1–5 score. Repeat submissions do not receive extra weight.
        </p>
        {rankings.length === 0 ? (
          <p className="mt-3 text-sm text-gray-600">No applications to rank.</p>
        ) : (
          <div className="mt-4 overflow-x-auto rounded-md border border-gray-200 bg-white">
            <table className="min-w-full text-left text-sm">
              <thead className="border-b border-gray-200 bg-gray-50 text-xs uppercase tracking-wide text-gray-600">
                <tr>
                  <th className="px-3 py-2 font-medium">Rank</th>
                  <th className="px-3 py-2 font-medium">Applicant</th>
                  <th className="px-3 py-2 font-medium">Blind code</th>
                  <th className="px-3 py-2 text-right font-medium">Average</th>
                  <th className="px-3 py-2 text-right font-medium">Panelists</th>
                  <th className="px-3 py-2 text-right font-medium">Finalist votes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {rankings.map((row, index) => (
                  <tr key={row.application.id}>
                    <td className="px-3 py-2 font-semibold tabular-nums">{row.averageScore == null ? "—" : index + 1}</td>
                    <td className="px-3 py-2">
                      <HardLink href={`/scholarships/review/${row.application.id}`} className="font-medium text-blue-700 underline">
                        {row.application.athlete_name}
                      </HardLink>
                      <span className="block text-xs text-gray-500">{row.application.athlete_school}</span>
                    </td>
                    <td className="px-3 py-2 font-mono text-xs">{row.application.anonymous_id ?? "—"}</td>
                    <td className="px-3 py-2 text-right font-semibold tabular-nums">
                      {row.averageScore == null ? "Not scored" : row.averageScore.toFixed(2)}
                    </td>
                    <td className="px-3 py-2 text-right tabular-nums">{row.reviewCount}</td>
                    <td className="px-3 py-2 text-right tabular-nums">{row.finalistVotes}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="mt-10">
        <h2 className="text-lg font-semibold">Panel submissions ({reviews.length})</h2>
        <p className="mt-1 text-xs text-gray-500">Complete review history, newest first. Family comments appear here but do not affect ranking.</p>
        {reviews.length === 0 ? (
          <p className="mt-3 text-sm text-gray-600">No panel submissions yet.</p>
        ) : (
          <div className="mt-4 overflow-x-auto rounded-md border border-gray-200 bg-white">
            <table className="min-w-full text-left text-sm">
              <thead className="border-b border-gray-200 bg-gray-50 text-xs uppercase tracking-wide text-gray-600">
                <tr>
                  <th className="px-3 py-2 font-medium">Submitted</th>
                  <th className="px-3 py-2 font-medium">Applicant</th>
                  <th className="px-3 py-2 font-medium">Panelist</th>
                  <th className="px-3 py-2 font-medium">Score</th>
                  <th className="px-3 py-2 font-medium">Finalist</th>
                  <th className="px-3 py-2 font-medium">Comments</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {reviews.map((review) => {
                  const application = applicationsById.get(review.application_id)
                  return (
                    <tr key={review.id}>
                      <td className="whitespace-nowrap px-3 py-2 text-xs tabular-nums text-gray-600">
                        {new Date(review.created_at).toLocaleString()}
                      </td>
                      <td className="px-3 py-2">
                        <span className="font-medium">{application?.athlete_name ?? "Unknown"}</span>
                        <span className="block font-mono text-xs text-gray-500">{application?.anonymous_id ?? "—"}</span>
                      </td>
                      <td className="px-3 py-2">
                        <span>{review.reviewer_name ?? "Reviewer"}</span>
                        <span className="block text-xs capitalize text-gray-500">{review.reviewer_role ?? "—"}</span>
                      </td>
                      <td className="px-3 py-2 tabular-nums">{review.score ?? "—"}</td>
                      <td className="px-3 py-2">{review.is_finalist_vote ? "Yes" : "—"}</td>
                      <td className="max-w-md whitespace-pre-wrap px-3 py-2 text-gray-700">{review.comment ?? "—"}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <p className="mt-8 text-xs text-gray-500">
        Reviewer roster: insert into <code>scholarship_reviewers</code> (links <code>auth.users.id</code>).
      </p>
    </div>
  )
}
