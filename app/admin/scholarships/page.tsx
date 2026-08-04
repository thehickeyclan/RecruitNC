import { HardLink } from "@/components/hard-link"
import { listScholarshipsAdmin } from "@/lib/scholarships/admin-queries"
import { requireScholarshipAdmin } from "@/lib/scholarships/require-admin"

export default async function AdminScholarshipsPage() {
  await requireScholarshipAdmin("/admin/scholarships")
  const rows = await listScholarshipsAdmin()

  return (
    <div className="max-w-4xl text-gray-900">
      <h1 className="text-2xl font-bold">Scholarships</h1>
      <p className="mt-2 text-sm text-gray-600">
        Registry + applications live in Supabase. Run{" "}
        <code className="rounded bg-gray-100 px-1 py-0.5 text-xs">scripts/supabase-scholarships-portal.sql</code> once. To
        record dollars moved from the NC United Training Fund into a named scholarship, open a scholarship →{" "}
        <strong>Training fund → scholarship</strong>.         One-time SQL setup:{" "}
        <code className="rounded bg-gray-100 px-1 py-0.5 text-xs">lib/scholarships/sql/training-fund-allocation.sql</code>.
        Full fundraising audit log:{" "}
        <HardLink href="/admin/fundraising-ledger" className="font-semibold text-blue-700 underline">
          Fundraising ledger
        </HardLink>{" "}
        (<code className="rounded bg-gray-100 px-1 py-0.5 text-xs">lib/fundraising/sql/fundraising-ledger.sql</code>
        ).
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
                  {" · "}
                  <span className="tabular-nums">
                    raised {(s.total_donated_cents / 100).toLocaleString("en-US", { style: "currency", currency: "USD" })}
                  </span>
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
