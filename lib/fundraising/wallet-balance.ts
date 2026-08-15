/**
 * Family-facing digital wallet arithmetic — one place, because a parent must never be shown a negative balance.
 *
 * Spend can legitimately exceed lifetime gifts (staff approve a reimbursement or a Guild transfer against money
 * raised outside the current ledger window, or the club fronts a cost), so `raised - spent` does go negative in
 * the data. That is a real number staff need for reconciliation, and admin views keep showing it — but on the
 * parent's wallet card it reads as "you owe us", which is neither true nor actionable for them. Available floors
 * at zero; Raised and Spent stay untouched, so an over-drawn wallet still shows Spent > Raised and tells the
 * whole story.
 *
 * New allocations are already capped separately by `allocatableToGuildFromNet`, so flooring here cannot let a
 * family spend money they don't have.
 */

export type WalletBalanceInput = {
  /** Lifetime credited gifts (gross). */
  totalCents: number
  reimbursementsPaidCents?: number | null
  guildAllocationsCents?: number | null
  /** Raised minus reimbursements, precomputed server-side; derived when absent. */
  netAfterReimbursementsCents?: number | null
}

export type WalletBalance = {
  raisedCents: number
  /** Reimbursements paid + Guild holds. */
  spentCents: number
  /** Never negative — what the family may still draw on. */
  availableCents: number
  /** How far spend exceeds gifts, 0 when the wallet is in the black. Staff/reconciliation only. */
  overdrawnCents: number
}

export function walletBalanceFromRow(row: WalletBalanceInput): WalletBalance {
  const raisedCents = Math.max(0, row.totalCents || 0)
  const reimb = Math.max(0, row.reimbursementsPaidCents ?? 0)
  const guild = Math.max(0, row.guildAllocationsCents ?? 0)
  const net = row.netAfterReimbursementsCents ?? raisedCents - reimb
  const remaining = net - guild
  return {
    raisedCents,
    spentCents: reimb + guild,
    availableCents: Math.max(0, remaining),
    overdrawnCents: remaining < 0 ? -remaining : 0,
  }
}
