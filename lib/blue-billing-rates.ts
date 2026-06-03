/** RecruitNC Stripe Blue subscription (new signups). */
export const RECRUITNC_BLUE_MONTHLY_CENTS = 5500

/** WrestlingIQ Blue standard monthly rate (legacy billing; export may show $51 with fees). */
export const WIQ_BLUE_MONTHLY_CENTS = 5000

export function wiqStandardMrrCentsFromAmount(amountCents: number | null | undefined): number {
  const c = amountCents ?? 0
  if (c === 0) return 0
  if (c >= WIQ_BLUE_MONTHLY_CENTS) return WIQ_BLUE_MONTHLY_CENTS
  return c
}

export function sumWiqStandardMrrCents(
  rows: Array<{ amount_cents: number | null | undefined }>,
): number {
  return rows.reduce((s, r) => s + wiqStandardMrrCentsFromAmount(r.amount_cents), 0)
}
