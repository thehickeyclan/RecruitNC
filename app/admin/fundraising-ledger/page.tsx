import { HardLink } from "@/components/hard-link"
import { listFundraisingLedgerEntries } from "@/lib/fundraising/ledger"

function fmtCents(cents: number): string {
  return (cents / 100).toLocaleString("en-US", { style: "currency", currency: "USD" })
}

function dirLabel(d: string): string {
  if (d === "money_in") return "In"
  if (d === "money_out") return "Out"
  if (d === "internal_move") return "Move"
  return d
}

function kindLabel(k: string): string {
  switch (k) {
    case "stripe_spartan_checkout":
      return "Stripe (fundraising checkout)"
    case "reimbursement_paid":
      return "Reimbursement paid"
    case "training_fund_to_scholarship":
      return "Training fund → scholarship"
    case "guild_credit_allocation":
      return "Guild credit allocation"
    default:
      return k
  }
}

export default async function AdminFundraisingLedgerPage() {
  const rows = await listFundraisingLedgerEntries(350)

  return (
    <div className="max-w-[1100px] text-gray-900">
      <HardLink href="/admin" className="text-sm font-semibold text-blue-700 underline">
        ← Admin home
      </HardLink>
      <h1 className="mt-4 text-2xl font-bold">Fundraising audit ledger</h1>
      <p className="mt-2 max-w-3xl text-sm text-gray-600">
        Append-only log of fundraising-related flows: paid Spartan checkouts, reimbursements marked paid, training-fund
        allocations to scholarships, and Guild credit moves. Create the table with{" "}
        <code className="rounded bg-gray-100 px-1 py-0.5 text-xs">lib/fundraising/sql/fundraising-ledger.sql</code> in
        Supabase. New events appear automatically; historical Stripe rows are not backfilled unless you add a script later.
      </p>

      <p className="mt-4 text-sm text-gray-700">
        <HardLink
          href="/api/admin/fundraising-ledger/export"
          className="inline-flex items-center rounded-md bg-gray-900 px-4 py-2 text-sm font-semibold text-white hover:bg-gray-800"
        >
          Download full CSV (audit export)
        </HardLink>
        <span className="ml-3 text-xs text-gray-500">
          UTF-8 with BOM · oldest-first · includes metadata JSON and Stripe / expense / Guild ids · caps at 600k rows per
          export (contact dev if you hit the limit).
        </span>
      </p>

      <p className="mt-4 text-sm">
        <HardLink href="/admin/fundraising" className="font-semibold text-blue-700 underline">
          Fundraising console
        </HardLink>
        {" · "}
        <HardLink href="/admin/expense-requests" className="font-semibold text-blue-700 underline">
          Reimbursements
        </HardLink>
        {" · "}
        <HardLink href="/admin/scholarships" className="font-semibold text-blue-700 underline">
          Scholarships
        </HardLink>
      </p>

      {rows.length === 0 ? (
        <p className="mt-10 text-sm text-gray-600">
          No ledger rows yet — run the SQL migration above, then trigger a test event (e.g. mark a reimbursement paid or
          complete a small Stripe gift).
        </p>
      ) : (
        <div className="mt-8 overflow-x-auto rounded-md border border-gray-200 bg-white shadow-sm">
          <table className="min-w-full text-left text-sm">
            <thead className="border-b border-gray-200 bg-gray-50 text-xs uppercase tracking-wide text-gray-600">
              <tr>
                <th className="px-3 py-2 font-medium">When</th>
                <th className="px-3 py-2 font-medium">Dir</th>
                <th className="px-3 py-2 font-medium">Type</th>
                <th className="px-3 py-2 font-medium">Amount</th>
                <th className="px-3 py-2 font-medium">Summary</th>
                <th className="px-3 py-2 font-medium">Refs</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {rows.map((r) => (
                <tr key={r.id} className="align-top">
                  <td className="whitespace-nowrap px-3 py-2 tabular-nums text-gray-700">
                    {new Date(r.occurred_at).toLocaleString()}
                  </td>
                  <td className="whitespace-nowrap px-3 py-2 text-gray-800">{dirLabel(r.direction)}</td>
                  <td className="px-3 py-2 text-gray-800">{kindLabel(r.entry_kind)}</td>
                  <td className="whitespace-nowrap px-3 py-2 font-medium tabular-nums">{fmtCents(r.amount_cents)}</td>
                  <td className="max-w-md px-3 py-2 text-gray-800">
                    <span className="font-medium">{r.summary}</span>
                    {r.detail ? <span className="mt-0.5 block text-xs text-gray-500">{r.detail}</span> : null}
                  </td>
                  <td className="px-3 py-2 font-mono text-[11px] text-gray-600">
                    {r.stripe_checkout_session_id ? (
                      <span className="block">cs: {r.stripe_checkout_session_id.slice(0, 18)}…</span>
                    ) : null}
                    {r.athlete_expense_request_id ? (
                      <span className="block">expense: {r.athlete_expense_request_id.slice(0, 8)}…</span>
                    ) : null}
                    {r.guild_credit_allocation_id ? (
                      <span className="block">guild: {r.guild_credit_allocation_id.slice(0, 8)}…</span>
                    ) : null}
                    {r.scholarship_donation_id ? (
                      <span className="block">sch: {r.scholarship_donation_id.slice(0, 8)}…</span>
                    ) : null}
                    {r.athlete_code ? <span className="block">{r.athlete_code}</span> : null}
                    {r.bucket_from || r.bucket_to ? (
                      <span className="mt-1 block text-gray-500">
                        {r.bucket_from ?? "—"} → {r.bucket_to ?? "—"}
                      </span>
                    ) : null}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
