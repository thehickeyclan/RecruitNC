import { TOC_EVENT_DATES_DISPLAY, TOC_SATURDAY_COMPETITION_DATE } from "@/lib/toc/constants"
import { firstNameFromAthleteName } from "@/lib/toc/invitations"
import { confirmPageUrl } from "@/lib/toc/invitation-service"

export type TocInviteMessage = {
  subject: string
  confirmUrl: string
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
  const subject = "You're invited — NC United Tournament of Champions"

  const emailBody = [
    `${firstName} —`,
    "",
    "This isn't a registration link. It's an invitation.",
    "",
    `The NC United Tournament of Champions is invite-only — eight wrestlers per weight, the best this state has at ${payload.weightClass} lbs. We built the field by hand, and your name is on it.`,
    "",
    `${TOC_EVENT_DATES_DISPLAY} · Hope Community Church, Apex · Weigh-in Friday, brackets finish ${TOC_SATURDAY_COMPETITION_DATE}.`,
    "",
    "Confirm your spot:",
    confirmUrl,
    "",
    "You'll look up your RecruitNC profile to verify your info — no re-entering school, grad year, or club.",
    "",
    "— NC United Wrestling",
  ].join("\n")

  const smsBody = `${firstName} — you're invited to the NC United Tournament of Champions (${payload.weightClass} lbs). ${TOC_EVENT_DATES_DISPLAY}, Apex. Confirm: ${confirmUrl}`

  return { subject, confirmUrl, emailBody, smsBody }
}
