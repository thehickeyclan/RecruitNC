export type ExpenseRequestStatus = "pending" | "under_review" | "approved" | "rejected" | "paid"

export type ExpensePaymentMethod = "zelle" | "venmo"

export const EXPENSE_TYPE_OPTIONS: { value: string; label: string }[] = [
  { value: "tournament_fees", label: "Tournament / entry fees" },
  { value: "travel", label: "Travel (lodging, transport)" },
  { value: "equipment", label: "Equipment" },
  { value: "camp_clinic", label: "Camp or clinic" },
  { value: "membership_dues", label: "Membership / dues" },
  { value: "other", label: "Other (describe in notes)" },
]

export const EXPENSE_STATUS_LABELS: Record<ExpenseRequestStatus, string> = {
  pending: "Pending",
  under_review: "Under review",
  approved: "Approved (awaiting payout)",
  rejected: "Rejected",
  paid: "Paid",
}

export function displayExpenseType(value: string): string {
  const o = EXPENSE_TYPE_OPTIONS.find((x) => x.value === value)
  return o?.label ?? value
}
