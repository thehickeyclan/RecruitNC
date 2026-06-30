/** Athlete registration fee and invite/confirm deadlines — single source for copy + API checks. */

export const TOC_REGISTRATION_FEE_USD = 100 as const
export const TOC_CONFIRM_WITHIN_DAYS = 7 as const
/** Fixed payment deadline for all invited athletes (Year 1). */
export const TOC_REGISTRATION_PAYMENT_DUE_ISO = "2026-08-01" as const
export const TOC_REGISTRATION_PAYMENT_DUE_DISPLAY = "August 1, 2026" as const

export const TOC_REGISTRATION_FEE_COVERS =
  "top-four placement awards at each weight and the champion jacket program" as const

export function formatTocRegistrationFee(): string {
  return `$${TOC_REGISTRATION_FEE_USD}`
}

export function formatTocLongDate(date: Date): string {
  return date.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })
}

export function registrationPaymentDueDate(): Date {
  const [year, month, day] = TOC_REGISTRATION_PAYMENT_DUE_ISO.split("-").map(Number)
  return new Date(year, month - 1, day, 23, 59, 59, 999)
}

export function registrationPaymentDueDisplay(): string {
  return TOC_REGISTRATION_PAYMENT_DUE_DISPLAY
}

export function isRegistrationPaymentPastDue(now = new Date()): boolean {
  return now.getTime() > registrationPaymentDueDate().getTime()
}

export function confirmDeadlineFromInvitedAt(invitedAt: string | Date): Date {
  const base = typeof invitedAt === "string" ? new Date(invitedAt) : new Date(invitedAt.getTime())
  base.setDate(base.getDate() + TOC_CONFIRM_WITHIN_DAYS)
  base.setHours(23, 59, 59, 999)
  return base
}

export function isConfirmPastDeadline(invitedAt: string | null | undefined, now = new Date()): boolean {
  if (!invitedAt) return false
  const invited = new Date(invitedAt)
  if (Number.isNaN(invited.getTime())) return false
  return now.getTime() > confirmDeadlineFromInvitedAt(invited).getTime()
}

export function confirmDeadlineMessage(invitedAt: string | null | undefined): string | null {
  if (!invitedAt) return null
  const deadline = confirmDeadlineFromInvitedAt(invitedAt)
  if (Number.isNaN(deadline.getTime())) return null
  return formatTocLongDate(deadline)
}

/** Invite email / SMS — before athlete confirms. */
export function tocInviteRegistrationLines(): string[] {
  return [
    `Please confirm within ${TOC_CONFIRM_WITHIN_DAYS} days of this invite.`,
    `${formatTocRegistrationFee()} registration is due by ${registrationPaymentDueDisplay()} (payment link follows confirmation). Fee supports tournament entry, ${TOC_REGISTRATION_FEE_COVERS}.`,
  ]
}

/** Confirm page + checkbox. */
export function tocConfirmRegistrationDisclosure(): string {
  return `${formatTocRegistrationFee()} registration is due by ${registrationPaymentDueDisplay()}. That supports tournament entry, ${TOC_REGISTRATION_FEE_COVERS}. Payment instructions follow by email.`
}

export function tocConfirmRegistrationCheckboxLabel(): string {
  return `I understand a ${formatTocRegistrationFee()} registration fee is due by ${registrationPaymentDueDisplay()}.`
}
