import { HardLink } from "@/components/hard-link"
import { listEnrichedActivationRequestsAdmin } from "@/app/actions/fundraising/fundraising-activation-actions"
import { ActivationRequestsTable } from "./activation-requests-table"

export default async function AdminFundraisingActivationRequestsPage() {
  const rows = await listEnrichedActivationRequestsAdmin()

  return (
    <div className="mx-auto max-w-6xl space-y-8 pb-12">
      <div>
        <HardLink href="/admin/fundraising" className="text-sm font-medium text-blue-600 underline-offset-4 hover:underline">
          &larr; Fundraising admin
        </HardLink>
        <h1 className="mt-2 text-2xl font-bold tracking-tight text-gray-900">Activation Requests</h1>
        <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
          Review requests, approve to activate athlete pages, and ensure every family is fully wired
          (athlete resolved, profile active, checkout live, parent linked, notification sent).
          Click any row to expand wiring details and fix incomplete steps.
        </p>
      </div>

      <ActivationRequestsTable rows={rows} />
    </div>
  )
}
