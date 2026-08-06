import { confirmPageUrl, registrationPayPageUrl } from "@/lib/toc/invitation-service"
import { firstNameFromAthleteName } from "@/lib/toc/invitations"
import {
  formatTocRegistrationFee,
  registrationPaymentDueDisplay,
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
    return `${firstName} — you're confirmed for Tournament of Champions (${params.weightClass} lbs), but registration payment is still needed to keep the spot locked. Complete the ${formatTocRegistrationFee()} secure checkout here: ${payUrl}`
  }

  return `${firstName} — friendly reminder to confirm your NC United Tournament of Champions invite (${params.weightClass} lbs) by ${registrationPaymentDueDisplay()}; your spot is locked only after the ${formatTocRegistrationFee()} secure checkout is completed: ${confirmUrl}`
}

export function formatRecruitNcSmsBody(message: string): string {
  const trimmed = message.trim()
  if (!trimmed) return "RecruitNC:"
  return trimmed.startsWith("RecruitNC:") ? trimmed : `RecruitNC: ${trimmed}`
}
