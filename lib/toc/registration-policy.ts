/** Athlete registration fee and invite/confirm deadlines — single source for copy + API checks. */

export const TOC_REGISTRATION_FEE_USD = 75 as const
export const TOC_CONFIRM_WITHIN_DAYS = 7 as const
/**
 * Legacy event-wide extension for invitations sent before individual deadlines were stored.
 * New and refreshed invitations always receive their own invited-at + 7 day deadline; this
 * date must never be used in new invite email/SMS copy.
 */
export const TOC_REGISTRATION_PAYMENT_DUE_ISO = "2026-08-14" as const
export const TOC_REGISTRATION_PAYMENT_DUE_DISPLAY = "August 14, 2026" as const

export const TOC_REGISTRATION_FEE_COVERS =
  "top-three placement awards at each weight and the champion jacket program" as const

export function formatTocRegistrationFee(): string {
  return `$${TOC_REGISTRATION_FEE_USD.toFixed(2)}`
}

export function formatTocLongDate(date: Date): string {
  return date.toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
    timeZone: "America/New_York",
  })
}

export function registrationPaymentDueDate(): Date {
  // Tournament deadlines are North Carolina deadlines. Production servers run
  // in UTC, so constructing a local Date would close the link at 8 p.m. ET.
  return new Date(`${TOC_REGISTRATION_PAYMENT_DUE_ISO}T23:59:59.999-04:00`)
}

export function registrationPaymentDueDisplay(): string {
  return TOC_REGISTRATION_PAYMENT_DUE_DISPLAY
}

export function isRegistrationPaymentPastDue(now = new Date()): boolean {
  return now.getTime() > registrationPaymentDueDate().getTime()
}

export function invitationOverrideDeadline(expiresAt: string | null | undefined): Date | null {
  if (!expiresAt) return null
  const deadline = new Date(expiresAt)
  return Number.isNaN(deadline.getTime()) ? null : deadline
}

export function isInvitationPaymentPastDue(
  expiresAt: string | null | undefined,
  invitedAt?: string | null,
  now = new Date(),
): boolean {
  const override = invitationOverrideDeadline(expiresAt)
  const deadline = override ?? (invitedAt ? confirmDeadlineFromInvitedAt(invitedAt) : registrationPaymentDueDate())
  return now.getTime() > deadline.getTime()
}

export function confirmDeadlineFromInvitedAt(invitedAt: string | Date): Date {
  const base = typeof invitedAt === "string" ? new Date(invitedAt) : new Date(invitedAt.getTime())
  base.setDate(base.getDate() + TOC_CONFIRM_WITHIN_DAYS)
  base.setHours(23, 59, 59, 999)
  const extendedDeadline = registrationPaymentDueDate()
  return base.getTime() > extendedDeadline.getTime() ? base : extendedDeadline
}

export function isConfirmPastDeadline(invitedAt: string | null | undefined, now = new Date(), expiresAt?: string | null): boolean {
  const override = invitationOverrideDeadline(expiresAt)
  if (override) return now.getTime() > override.getTime()
  if (!invitedAt) return false
  const invited = new Date(invitedAt)
  if (Number.isNaN(invited.getTime())) return false
  return now.getTime() > confirmDeadlineFromInvitedAt(invited).getTime()
}

export function confirmDeadlineMessage(
  invitedAt: string | Date | null | undefined,
  expiresAt?: string | null,
): string | null {
  const override = invitationOverrideDeadline(expiresAt)
  if (override) return formatTocLongDate(override)
  if (!invitedAt) return null
  const deadline = confirmDeadlineFromInvitedAt(invitedAt)
  if (Number.isNaN(deadline.getTime())) return null
  return formatTocLongDate(deadline)
}

/** Invite email / SMS / admin copy, always based on this invitation's deadline. */
export function tocInviteConfirmLines(
  invitedAt: string | Date = new Date(),
  expiresAt?: string | null,
): string[] {
  const deadline = confirmDeadlineMessage(invitedAt, expiresAt)
  return [
    deadline
      ? `Please confirm and complete secure card payment by ${deadline}.`
      : `Please confirm and complete secure card payment within ${TOC_CONFIRM_WITHIN_DAYS} days.`,
  ]
}

/** @deprecated use tocInviteConfirmLines */
export function tocInviteRegistrationLines(
  invitedAt: string | Date = new Date(),
  expiresAt?: string | null,
): string[] {
  return tocInviteConfirmLines(invitedAt, expiresAt)
}

/** Confirm page disclosure. */
export function tocConfirmRegistrationDisclosure(): string {
  return `Payment is required today to lock your spot. After you submit these details, you'll go to secure Stripe checkout for the ${formatTocRegistrationFee()} registration fee (${TOC_REGISTRATION_FEE_COVERS}).`
}

export function tocConfirmRegistrationCheckboxLabel(): string {
  return `I understand my spot is not locked until the ${formatTocRegistrationFee()} card payment is completed.`
}
