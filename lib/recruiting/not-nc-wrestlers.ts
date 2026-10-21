/**
 * Wrestlers we do not present as North Carolina's (Matt, 21 Oct 2026): a North Carolina hometown or
 * an "NC" registration is not a North Carolina wrestler. The test is where he or she goes to high
 * school. Their results stay on record as they were entered; they are left out of what we claim -
 * the "From North Carolina" map, NC counts and NC lists.
 *
 * Jaclyn Bouzakis registers as NC at events and her family lives here, but she attends Wyoming
 * Seminary (PA) and competes outside the state; her profile carries state PA, which keeps her off
 * every NC list. Her brother Vince is on Pitt's roster with a Charlotte hometown, also from Wyoming
 * Seminary.
 */
export const NOT_NC_ROSTER_WRESTLERS: Array<{ name: string; reason: string }> = [
  { name: "Vince Bouzakis", reason: "Wyoming Seminary (PA); NC hometown only" },
]

const key = (name: string) => name.toLowerCase().replace(/[^a-z]/g, "")
const NOT_NC = new Set(NOT_NC_ROSTER_WRESTLERS.map((w) => key(w.name)))

/** True for a roster name we do not count as a North Carolina wrestler. */
export function isNotNcRosterWrestler(name: string): boolean {
  return NOT_NC.has(key(name))
}
