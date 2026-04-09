/** Per-event drop-in counts for admin calendar (matches checkout capacity: pending + paid). */
export type EventDropInStats = {
  total: number
  /** Counts toward max_drop_ins — same rule as Stripe checkout. */
  towardCapacity: number
  paid: number
  awaitingPayment: number
  failed: number
  refunded: number
  unpaid: number
  denied: number
}

export function emptyEventDropInStats(): EventDropInStats {
  return {
    total: 0,
    towardCapacity: 0,
    paid: 0,
    awaitingPayment: 0,
    failed: 0,
    refunded: 0,
    unpaid: 0,
    denied: 0,
  }
}

export function aggregateDropInStats(
  rows: { event_id: string | number; status: string; payment_status: string }[],
): Record<string, EventDropInStats> {
  const out: Record<string, EventDropInStats> = {}
  for (const r of rows) {
    const id = String(r.event_id)
    if (!out[id]) out[id] = emptyEventDropInStats()
    const s = out[id]
    s.total += 1
    const ps = r.payment_status
    if (ps === "paid") {
      s.paid += 1
      s.towardCapacity += 1
    } else if (ps === "pending") {
      s.awaitingPayment += 1
      s.towardCapacity += 1
    } else if (ps === "failed") s.failed += 1
    else if (ps === "refunded") s.refunded += 1
    else if (ps === "unpaid") s.unpaid += 1

    if (r.status === "denied") s.denied += 1
  }
  return out
}
