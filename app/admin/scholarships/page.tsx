import { HardLink } from "@/components/hard-link"
import { listScholarshipsAdmin } from "@/lib/scholarships/admin-queries"

export default async function AdminScholarshipsPage() {
  const rows = await listScholarshipsAdmin()

  return (
    <div className="max-w-4xl text-gray-900">
      <h1 className="text-2xl font-bold">Scholarships</h1>
      <p className="mt-2 text-sm text-gray-600">
        Registry + applications live in Supabase. Run{" "}
        <code className="rounded bg-gray-100 px-1 py-0.5 text-xs">scripts/supabase-scholarships-portal.sql</code> once, then manage rows and reviewer assignments here (expand this hub as workflows firm up).
      </p>

      <div className="mt-6">
        <HardLink href="/admin/scholarships/new" className="text-sm font-semibold text-blue-700 underline">
          New scholarship (stub)
        </HardLink>
        {" · "}
        <HardLink href="/scholarships/review" className="text-sm font-semibold text-blue-700 underline">
          Review portal
        </HardLink>
        {" · "}
        <HardLink href="/fundraising/scholarships" className="text-sm font-semibold text-blue-700 underline">
          Public hub
        </HardLink>
      </div>

      {rows.length === 0 ? (
        <p className="mt-8 text-sm text-gray-600">No scholarships found (table missing or empty).</p>
      ) : (
        <ul className="mt-8 divide-y divide-gray-200 rounded-md border border-gray-200 bg-white">
          {rows.map((s) => (
            <li key={s.id} className="flex flex-wrap items-center justify-between gap-2 px-4 py-3">
              <div>
                <p className="font-medium">{s.name}</p>
                <p className="text-xs text-gray-500">
                  {s.slug} · {s.status}
                </p>
              </div>
              <HardLink href={`/admin/scholarships/${encodeURIComponent(s.slug)}`} className="text-sm text-blue-700 underline">
                Manage
              </HardLink>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
