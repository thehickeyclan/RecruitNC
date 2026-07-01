import { confirmPageUrl, registrationPayPageUrl } from "@/lib/toc/invitation-service"
import { firstNameFromAthleteName } from "@/lib/toc/invitations"
import {
  formatTocRegistrationFee,
  registrationPaymentDueDisplay,
  TOC_CONFIRM_WITHIN_DAYS,
} from "@/lib/toc/registration-policy"

export function buildTocDefaultReminderMessage(params: {
  athleteName: string
  athleteId: string
  weightClass: number
  status: string
  paymentStatus?: string | null
}): string {
  const firstName = firstNameFromAthleteName(params.athleteName)
  const confirmUrl = confirmPageUrl(params.athleteId)

  if (params.status === "confirmed") {
    if (params.paymentStatus === "paid") {
      return `${firstName} — quick reminder: you're confirmed for NC United Tournament of Champions at ${params.weightClass} lbs. We look forward to seeing you in Apex.`
    }
    const payUrl = registrationPayPageUrl(params.athleteId)
    return `${firstName} — you're confirmed for Tournament of Champions (${params.weightClass} lbs). Registration (${formatTocRegistrationFee()} by ${registrationPaymentDueDisplay()}) is optional until then: ${payUrl}`
  }

  return `${firstName} — friendly reminder to confirm your NC United Tournament of Champions invite (${params.weightClass} lbs). No payment required today — confirm within ${TOC_CONFIRM_WITHIN_DAYS} days: ${confirmUrl}`
}

export function formatRecruitNcSmsBody(message: string): string {
  const trimmed = message.trim()
  if (!trimmed) return "RecruitNC:"
  return trimmed.startsWith("RecruitNC:") ? trimmed : `RecruitNC: ${trimmed}`
}
