import { notFound } from "next/navigation"

import { HardLink } from "@/components/hard-link"
import { listApplicationsForScholarships } from "@/lib/scholarships/admin-queries"
import { getScholarshipBySlug } from "@/lib/scholarships/public-queries"

export default async function AdminScholarshipDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const s = await getScholarshipBySlug(slug)
  if (!s) notFound()

  const apps = await listApplicationsForScholarships([s.id])

  return (
    <div className="max-w-4xl text-gray-900">
      <HardLink href="/admin/scholarships" className="text-sm font-semibold text-blue-700 underline">
        ← All scholarships
      </HardLink>
      <h1 className="mt-6 text-2xl font-bold">{s.name}</h1>
      <p className="mt-1 text-sm text-gray-600">
        {s.slug} · status <span className="font-medium">{s.status}</span>
      </p>

      <section className="mt-8">
        <h2 className="text-lg font-semibold">Applications ({apps.length})</h2>
        {apps.length === 0 ? (
          <p className="mt-3 text-sm text-gray-600">None yet.</p>
        ) : (
          <ul className="mt-4 divide-y divide-gray-200 rounded-md border border-gray-200 bg-white">
            {apps.map((a) => (
              <li key={a.id} className="flex flex-wrap items-center justify-between gap-2 px-4 py-3">
                <div>
                  <p className="font-medium">{a.athlete_name}</p>
                  <p className="text-xs text-gray-500">{a.athlete_school}</p>
                </div>
                <HardLink href={`/scholarships/review/${a.id}`} className="text-sm text-blue-700 underline">
                  Open in review portal
                </HardLink>
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
