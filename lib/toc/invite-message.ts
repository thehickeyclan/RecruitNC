import { TOC_EVENT_DATES_DISPLAY, TOC_SATURDAY_COMPETITION_DATE } from "@/lib/toc/constants"
import { firstNameFromAthleteName } from "@/lib/toc/invitations"
import {
  formatTocRegistrationFee,
  registrationPaymentDueDisplay,
  TOC_CONFIRM_WITHIN_DAYS,
  tocInviteRegistrationLines,
} from "@/lib/toc/registration-policy"
import { confirmPageUrl, eventPageUrl } from "@/lib/toc/invitation-service"

export type TocInviteMessage = {
  subject: string
  confirmUrl: string
  eventPageUrl: string
  emailBody: string
  smsBody: string
}

export function buildTocAthleteInviteMessage(payload: {
  athleteName: string
  weightClass: number
  athleteId?: string
  confirmUrl?: string
}): TocInviteMessage {
  const firstName = firstNameFromAthleteName(payload.athleteName)
  const confirmUrl = payload.confirmUrl ?? confirmPageUrl(payload.athleteId)
  const learnMoreUrl = eventPageUrl()
  const subject = "You're invited — NC United Tournament of Champions"

  const registrationLines = tocInviteRegistrationLines()

  const emailBody = [
    `${firstName} —`,
    "",
    `You've been invited to the NC United Tournament of Champions — an invite-only event with eight wrestlers per weight. We built the field by hand, and your name is on it at ${payload.weightClass} lbs.`,
    "",
    `${TOC_EVENT_DATES_DISPLAY} · Hope Community Church, Apex · Weigh-in Friday, brackets finish ${TOC_SATURDAY_COMPETITION_DATE}.`,
    "",
    ...registrationLines,
    "",
    "Learn more about the tournament:",
    learnMoreUrl,
    "",
    "Confirm your spot:",
    confirmUrl,
    "",
    "If you're in, use the link above. We'll match you to your RecruitNC profile — school, grad year, and club are already on file.",
    "",
    "— NC United Wrestling",
  ].join("\n")

  const smsBody = `${firstName} — invited to NC United Tournament of Champions (${payload.weightClass} lbs). ${TOC_EVENT_DATES_DISPLAY}, Apex. Confirm within ${TOC_CONFIRM_WITHIN_DAYS} days: ${confirmUrl}. ${formatTocRegistrationFee()} due by ${registrationPaymentDueDisplay()}.`

  return { subject, confirmUrl, eventPageUrl: learnMoreUrl, emailBody, smsBody }
}
