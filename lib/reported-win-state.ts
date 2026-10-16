/**
 * The state a family named when they typed an opponent's credential: "Virginia State champion",
 * "Tennesee 4th Place", "VA State Champion" -> "VA".
 *
 * A family-added win is checked against our state results (app/api/athletes/[id]/significant-wins),
 * and a club bracket line cannot say which state a name placed in. The state the family typed can:
 * it is used exactly as NHSCA's printed state code is, to pick the right one of two namesakes and
 * to refuse the others. No state named, no guess - the win stays as the family typed it.
 */

const STATES: Record<string, string> = {
  alabama: "AL", alaska: "AK", arizona: "AZ", arkansas: "AR", california: "CA", colorado: "CO", connecticut: "CT",
  delaware: "DE", florida: "FL", georgia: "GA", hawaii: "HI", idaho: "ID", illinois: "IL", indiana: "IN", iowa: "IA",
  kansas: "KS", kentucky: "KY", louisiana: "LA", maine: "ME", maryland: "MD", massachusetts: "MA", michigan: "MI",
  minnesota: "MN", mississippi: "MS", missouri: "MO", montana: "MT", nebraska: "NE", nevada: "NV",
  "new hampshire": "NH", "new jersey": "NJ", "new mexico": "NM", "new york": "NY", "north carolina": "NC",
  "north dakota": "ND", ohio: "OH", oklahoma: "OK", oregon: "OR", pennsylvania: "PA", "rhode island": "RI",
  "south carolina": "SC", "south dakota": "SD", tennessee: "TN", texas: "TX", utah: "UT", vermont: "VT",
  "west virginia": "WV", virginia: "VA", washington: "WA", wisconsin: "WI", wyoming: "WY",
}
// Spellings families actually type.
const MISSPELLINGS: Record<string, string> = { tennesee: "TN", tenessee: "TN", tennessse: "TN", pennsilvania: "PA", missisippi: "MS" }
const CODES = new Set(Object.values(STATES))

export function stateNamedIn(credential: string | null | undefined): string | null {
  const text = ` ${String(credential ?? "").toLowerCase().replace(/[^a-z\s]/g, " ").replace(/\s+/g, " ")} `
  // Longest names first, so "west virginia" is not read as "virginia".
  for (const name of Object.keys(STATES).sort((a, b) => b.length - a.length)) {
    if (text.includes(` ${name} `)) return STATES[name]!
  }
  for (const [name, code] of Object.entries(MISSPELLINGS)) if (text.includes(` ${name} `)) return code
  // A two-letter code, as typed: "VA State Champion". Upper case only, so "in" or "me" in a sentence is not a state.
  const code = String(credential ?? "").match(/\b([A-Z]{2})\b/g)?.find((c) => CODES.has(c))
  if (code) return code
  if (/\bnchsaa\b|\bncisa\b/i.test(String(credential ?? ""))) return "NC"
  return null
}
