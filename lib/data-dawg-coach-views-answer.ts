import { SCOUTING_REPORT_PRICES } from "@/lib/scouting-report-entitlement"

/**
 * "Where do I see which coaches are looking at my profile?"
 *
 * Asked in the app and answered, until now, by the model with nothing to go on: "you would
 * typically need to check the platform or service where your account is hosted". The answer
 * is a place on this site and a price, both of which we know, so it is written here rather
 * than left to be guessed.
 *
 * Data Dawg does not know who is asking, so this never says what a particular wrestler's
 * views are - only where they are shown and what unlocks the names.
 */

/** Someone asking who has looked at their own profile - not a search for a coach or a college. */
export function isCoachViewsQuestion(message: string): boolean {
  const lower = String(message ?? "").toLowerCase()
  const aboutCoaches = /\bcoach(es)?\b|\bcolleges?\b|\bschools?\b|\bprograms?\b|\brecruiters?\b|\bscouts?\b|\bwho\b|\banyone\b|\banybody\b/.test(lower)
  const aboutLooking = /\blook(s|ed|ing)?\b|\bview(s|ed|ing|ers?)?\b|\bvisit(s|ed|ing|ors?)?\b|\bwatch(es|ed|ing)?\b|\bseen\b|\bsaw\b|\bcheck(s|ed|ing)?\s+(out\s+)?(me|my)\b|\binterested\s+in\s+me\b/.test(lower)
  const aboutMine = /\b(my|me|mine|our)\b|\bmy\s+(son|daughter|kid|child|wrestler)('s)?\b/.test(lower)
  return aboutCoaches && aboutLooking && aboutMine
}

export function answerCoachViewsQuestion(): string {
  const price = `$${(SCOUTING_REPORT_PRICES.subscription / 100).toFixed(2)}`
  return [
    "Open your athlete profile and look for **College coach views**. It shows when college coaches have looked at your profile and how many times.",
    `To see **which college programs** they are from, you need the RecruitNC subscription: ${price} a month. It also unlocks the full rankings.`,
    "[Subscribe on the Rankings page](/rankings?plan=subscription)",
    "The panel only appears on a profile you have claimed (or one you are linked to as a parent). NC United Blue members already have this included.",
  ].join("\n\n")
}
