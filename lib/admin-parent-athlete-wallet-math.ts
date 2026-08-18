export type AdminParentAthleteWalletInput = {
  athleteId: string
  name: string
  fundraisingCode: string | null
  totalCents: number
  giftCount: number
  raceSignupCount: number
  reimbursementsPaidCents: number
  guildAllocationsCents: number
  hubWindowRaisedCents?: number
  codeUnavailable?: boolean
}

export type AdminParentAthleteFundRow = {
  athleteId: string
  name: string
  fundraisingCode: string | null
  /** Lifetime credited gifts — the wallet basis. */
  raisedCents: number
  /** Stripe gifts in the campaign lookback window, reporting only. */
  hubWindowRaisedCents: number
  giftCount: number
  raceSignupCount: number
  /** Reimbursements marked paid, all time (per athlete). */
  reimbursementsPaidAllTimeCents: number
  guildAllocationsCents: number
  /** Lifetime raised − lifetime paid reimbursements, before Guild. */
  netAfterReimbursementsCents: number
  /** Wallet balance: lifetime raised − lifetime paid reimbursements − Guild allocations. */
  remainingNotionalCents: number
  codeUnavailable?: boolean
}

/**
 * Convert the canonical lifetime wallet row into the admin expense-request rollup.
 * Keeping this pure makes it difficult to accidentally mix a rolling fundraising window
 * with lifetime reimbursements or Guild allocations again.
 */
export function toAdminParentAthleteFundRow(
  wallet: AdminParentAthleteWalletInput,
): AdminParentAthleteFundRow {
  const raisedCents = wallet.totalCents
  const reimbursementsPaidAllTimeCents = wallet.reimbursementsPaidCents
  const guildAllocationsCents = wallet.guildAllocationsCents
  const netAfterReimbursementsCents = raisedCents - reimbursementsPaidAllTimeCents
  const balance = walletBalanceFromRow({
    totalCents: raisedCents,
    reimbursementsPaidCents: reimbursementsPaidAllTimeCents,
    guildAllocationsCents,
    netAfterReimbursementsCents,
  })

  return {
    athleteId: wallet.athleteId,
    name: wallet.name,
    fundraisingCode: wallet.fundraisingCode,
    raisedCents,
    hubWindowRaisedCents: wallet.hubWindowRaisedCents ?? 0,
    giftCount: wallet.giftCount,
    raceSignupCount: wallet.raceSignupCount,
    reimbursementsPaidAllTimeCents,
    guildAllocationsCents,
    netAfterReimbursementsCents,
    // Admin reconciliation keeps the signed result; family-facing wallet cards floor at zero.
    remainingNotionalCents: balance.availableCents - balance.overdrawnCents,
    codeUnavailable: wallet.codeUnavailable,
  }
}
import { walletBalanceFromRow } from "@/lib/fundraising/wallet-balance"
