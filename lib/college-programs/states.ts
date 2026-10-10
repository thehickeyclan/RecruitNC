/** So "Iowa" finds every school in IA, not only the ones with Iowa in the name. */
export const STATE_NAMES: Record<string, string> = {
  AL: "Alabama", AR: "Arkansas", AZ: "Arizona", BC: "British Columbia", CA: "California", CO: "Colorado",
  CT: "Connecticut", DC: "District of Columbia", DE: "Delaware", FL: "Florida", GA: "Georgia", IA: "Iowa",
  ID: "Idaho", IL: "Illinois", IN: "Indiana", KS: "Kansas", KY: "Kentucky", MA: "Massachusetts", MD: "Maryland",
  ME: "Maine", MI: "Michigan", MN: "Minnesota", MO: "Missouri", MT: "Montana", NC: "North Carolina",
  ND: "North Dakota", NE: "Nebraska", NH: "New Hampshire", NJ: "New Jersey", NM: "New Mexico", NY: "New York",
  OH: "Ohio", OK: "Oklahoma", OR: "Oregon", PA: "Pennsylvania", PR: "Puerto Rico", RI: "Rhode Island",
  SC: "South Carolina", SD: "South Dakota", TN: "Tennessee", TX: "Texas", UT: "Utah", VA: "Virginia",
  VT: "Vermont", WA: "Washington", WI: "Wisconsin", WV: "West Virginia", WY: "Wyoming",
}

/** "NC", "nc" or "North Carolina" → "NC"; anything else → null. */
export function stateCode(input: string | null | undefined): string | null {
  const value = String(input ?? "").trim()
  if (!value) return null
  const upper = value.toUpperCase()
  if (STATE_NAMES[upper]) return upper
  const lower = value.toLowerCase()
  for (const [code, name] of Object.entries(STATE_NAMES)) if (name.toLowerCase() === lower) return code
  return null
}
