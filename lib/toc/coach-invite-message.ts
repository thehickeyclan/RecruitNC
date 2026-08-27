import { TOC_EVENT_DATES_RANGE } from "@/lib/toc/constants"

/**
 * What a corner coach is told when they are credentialed.
 *
 * Kept out of the route so the wording can be read and tested without sending anything. The
 * same facts go by email and by text; the text is shorter because it is read on a lock screen,
 * not because it says less.
 */

export const TOC_COACH_TICKET_URL = "https://gofan.co/p/EDF09270AA12FC6751AB2286A4A69A91"

/** "Miller", "Miller and Jones", "Miller, Jones and Perry" — a list a person would say aloud. */
export function namesSentence(names: string[]): string {
  const unique = [...new Set(names.filter(Boolean))]
  if (unique.length === 0) return "your wrestler"
  if (unique.length === 1) return unique[0]
  if (unique.length === 2) return `${unique[0]} and ${unique[1]}`
  return `${unique.slice(0, -1).join(", ")} and ${unique[unique.length - 1]}`
}

export function coachInviteSubject(): string {
  return "You have been named a corner coach — NC United Tournament of Champions"
}

export function coachInviteText(input: { coachName: string; athleteNames: string[] }): string {
  const who = namesSentence(input.athleteNames)
  const first = input.coachName.trim().split(/\s+/)[0] || input.coachName
  return [
    `${first},`,
    "",
    `You have been named by ${who} as a corner coach for the NC United Tournament of Champions, ${TOC_EVENT_DATES_RANGE}.`,
    "",
    `Get your ticket here: ${TOC_COACH_TICKET_URL}`,
    "",
    "At check-in you will be given a coaching bracelet. It permits floor access for both days, and floor seating.",
    "",
    "NC Wrestling United",
  ].join("\n")
}

/** The same thing on a lock screen. One link, one reason, nothing to scroll past. */
export function coachInviteSms(input: { coachName: string; athleteNames: string[] }): string {
  const who = namesSentence(input.athleteNames)
  return [
    `NC United: you have been named by ${who} as a corner coach for the Tournament of Champions, ${TOC_EVENT_DATES_RANGE}.`,
    `Tickets: ${TOC_COACH_TICKET_URL}`,
    "Collect your coaching bracelet at check-in — floor access both days.",
  ].join(" ")
}

export function coachInviteHtml(input: { coachName: string; athleteNames: string[] }): string {
  const who = namesSentence(input.athleteNames)
  const first = input.coachName.trim().split(/\s+/)[0] || input.coachName
  return `
<div style="font-family:-apple-system,Segoe UI,Roboto,sans-serif;max-width:520px;color:#0A1628">
  <p style="font-size:16px">${first},</p>
  <p style="font-size:16px;line-height:1.6">
    You have been named by <strong>${who}</strong> as a corner coach for the
    <strong>NC United Tournament of Champions</strong>, ${TOC_EVENT_DATES_RANGE}.
  </p>
  <p style="margin:28px 0">
    <a href="${TOC_COACH_TICKET_URL}"
       style="background:#D3B574;color:#0A1628;padding:14px 24px;border-radius:10px;
              text-decoration:none;font-weight:700;display:inline-block">Get your ticket</a>
  </p>
  <p style="font-size:16px;line-height:1.6">
    At check-in you will be given a <strong>coaching bracelet</strong>. It permits floor access
    for both days, and floor seating.
  </p>
  <p style="font-size:14px;color:#6B829D;margin-top:28px">NC Wrestling United</p>
</div>`.trim()
}
