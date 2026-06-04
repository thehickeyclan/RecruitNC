import type { BlueSubscriptionRow } from "@/app/api/admin/blue/subscriptions/route"

function memberKey(row: BlueSubscriptionRow): string {
  return `${row.athlete_name.trim().toLowerCase()}|${(row.payer_email ?? "").trim().toLowerCase()}`
}

/** One row per Stripe sub; drop orphan duplicates when a live Stripe row exists for same member. */
export function dedupeBlueSubscriptionRows(rows: BlueSubscriptionRow[]): BlueSubscriptionRow[] {
  const byStripe = new Map<string, BlueSubscriptionRow>()
  const orphans: BlueSubscriptionRow[] = []

  for (const row of rows) {
    const subId = row.stripe_subscription_id?.trim()
    if (subId) {
      const existing = byStripe.get(subId)
      if (!existing || (row.source === "live" && existing.source !== "live")) {
        byStripe.set(subId, row)
      }
      continue
    }
    orphans.push(row)
  }

  const stripeRows = [...byStripe.values()]
  const covered = new Set(stripeRows.map(memberKey))
  const orphanFiltered = orphans.filter((row) => !covered.has(memberKey(row)))

  return [...stripeRows, ...orphanFiltered]
}

export function isRecruitncActiveRow(row: BlueSubscriptionRow): boolean {
  return row.status === "active" && !row.cancel_at_period_end && !row.collection_paused
}

export function isRecruitncPausedRow(row: BlueSubscriptionRow): boolean {
  return row.status === "paused" || !!row.collection_paused
}

export function isRecruitncChurnedRow(row: BlueSubscriptionRow): boolean {
  return (
    row.status === "cancelled" ||
    row.status === "alumni" ||
    (row.status === "active" && row.cancel_at_period_end)
  )
}
