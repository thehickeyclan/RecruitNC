export type ExpenseRequestStatus = "pending" | "under_review" | "approved" | "rejected" | "paid"

export type ExpensePaymentMethod = "zelle" | "venmo"

export const EXPENSE_TYPE_OPTIONS: { value: string; label: string }[] = [
  { value: "tournament_fees", label: "Tournament / entry fees" },
  { value: "travel", label: "Travel (lodging, transport)" },
  { value: "equipment", label: "Equipment" },
  { value: "camp_clinic", label: "Camp or clinic" },
  { value: "the_guild", label: "The Guild" },
  { value: "private_instruction", label: "Private Instruction" },
  { value: "membership_dues", label: "Membership / dues" },
  { value: "other", label: "Other (describe in notes)" },
]

export const EXPENSE_STATUS_LABELS: Record<ExpenseRequestStatus, string> = {
  pending: "Pending",
  under_review: "Under review",
  approved: "Approved (awaiting payout)",
  /** Parent-facing; staff may still use “rejected” in internal notes. */
  rejected: "Not approved",
  paid: "Paid",
}

/** Short descriptions for the profile “status” tab legend. */
export const EXPENSE_STATUS_PARENT_DESCRIPTIONS: Record<ExpenseRequestStatus, string> = {
  pending: "We received your request and will review it soon.",
  under_review: "Staff is reviewing your request.",
  approved: "Approved — we will send payment to your Zelle or Venmo when processed.",
  rejected: "This request was not approved. See staff note if provided.",
  paid: "Reimbursement has been sent.",
}

export function displayExpenseType(value: string): string {
  const o = EXPENSE_TYPE_OPTIONS.find((x) => x.value === value)
  return o?.label ?? value
}
