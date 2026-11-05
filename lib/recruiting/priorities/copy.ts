/**
 * Approved words for the parts still to build (Muse, 5 Nov 2026), kept here so Parts 3 and 5 use
 * them as written. No question marks, by rule (coach emails and invites close with a statement).
 */

/** Part 5: what a parent sends to bring their wrestler in to answer their own set. */
export function athleteInviteText(name: string, link: string): string {
  return `${name}, I finished my part in the Command Center. You have your own short set to answer. It takes a few minutes, and it helps build a college list that fits you. You control what gets shared, and coaches never see your answers. Start here: ${link}`
}

export type ShortListReason = "no_results" | "out_of_state" | "womens"

/** Part 3: the line under a list that is short on purpose. Never padded; more surfaces from named events. */
export function shortListLine(reason: ShortListReason, name: string): string {
  if (reason === "no_results") return `A short list on purpose. There is not much on record for ${name} yet, so we only show colleges we can back up. More will surface as results come in and coaches view the profile.`
  if (reason === "out_of_state") return `A short list on purpose. Our deepest data is still North Carolina, so we only show what we can back up for ${name} today. More will surface as coaches view the profile and new results land.`
  return `A short list on purpose. There are fewer women's programs, and we only show the ones we can back up for ${name}. More will surface as rosters update and coaches view the profile.`
}
