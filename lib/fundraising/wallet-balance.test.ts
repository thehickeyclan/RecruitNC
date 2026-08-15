import { describe, expect, it } from "vitest"
import { walletBalanceFromRow } from "./wallet-balance"

describe("walletBalanceFromRow", () => {
  it("nets gifts against reimbursements and Guild holds", () => {
    const b = walletBalanceFromRow({
      totalCents: 112500,
      reimbursementsPaidCents: 0,
      guildAllocationsCents: 15000,
      netAfterReimbursementsCents: 112500,
    })
    expect(b.raisedCents).toBe(112500)
    expect(b.spentCents).toBe(15000)
    expect(b.availableCents).toBe(97500)
    expect(b.overdrawnCents).toBe(0)
  })

  it("never reports a negative balance to a family", () => {
    // Kynzee Roberts, 2026-08-15: $2,158.97 reimbursed against $1,790 raised.
    const b = walletBalanceFromRow({
      totalCents: 179000,
      reimbursementsPaidCents: 215897,
      guildAllocationsCents: 0,
      netAfterReimbursementsCents: 179000 - 215897,
    })
    expect(b.availableCents).toBe(0)
    // Raised and Spent stay truthful, so the card still shows spend exceeding gifts.
    expect(b.raisedCents).toBe(179000)
    expect(b.spentCents).toBe(215897)
    expect(b.overdrawnCents).toBe(36897)
  })

  it("floors a wallet whose gifts have not landed yet rather than showing the Guild hold as a debt", () => {
    // The shape that started this: gifts stranded on a retired NCU code, Guild hold keyed by athlete uuid.
    const b = walletBalanceFromRow({
      totalCents: 0,
      reimbursementsPaidCents: 0,
      guildAllocationsCents: 15000,
      netAfterReimbursementsCents: 0,
    })
    expect(b.availableCents).toBe(0)
    expect(b.overdrawnCents).toBe(15000)
  })

  it("derives net when the server did not send it", () => {
    const b = walletBalanceFromRow({ totalCents: 50000, reimbursementsPaidCents: 20000 })
    expect(b.availableCents).toBe(30000)
  })

  it("treats missing spend fields as zero", () => {
    const b = walletBalanceFromRow({ totalCents: 25000 })
    expect(b.availableCents).toBe(25000)
    expect(b.spentCents).toBe(0)
  })
})
