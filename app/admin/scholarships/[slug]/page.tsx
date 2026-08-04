import { notFound } from "next/navigation"

import { AdminTrainingFundAllocationForm } from "@/components/scholarships/admin-training-fund-allocation"
import { HardLink } from "@/components/hard-link"
import {
  listApplicationsForScholarships,
  listScholarshipDonationsAdmin,
} from "@/lib/scholarships/admin-queries"
import { getScholarshipBySlug } from "@/lib/scholarships/public-queries"
import { scholarshipSubmissionEditPath } from "@/lib/scholarships/submission-edit-link"

function formatUsd(cents: number): string {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(
    cents / 100,
  )
}

export default async function AdminScholarshipDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const s = await getScholarshipBySlug(slug)
  if (!s) notFound()

  const apps = await listApplicationsForScholarships([s.id])
  const donations = await listScholarshipDonationsAdmin(s.id)

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

      <p className="mt-8 text-xs text-gray-500">
        Reviewer roster: insert into <code>scholarship_reviewers</code> (links <code>auth.users.id</code>).
      </p>
    </div>
  )
}
