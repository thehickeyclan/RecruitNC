export interface WrestlingClub {
  name: string
  abbreviation?: string
  location?: string
  variations: string[]
}

export const POPULAR_WRESTLING_CLUBS: WrestlingClub[] = [
  {
    name: "Raleigh Area Wrestling",
    abbreviation: "RAW",
    location: "Raleigh, NC",
    variations: ["RAW", "Raleigh Area Wrestling", "Raleigh Wrestling"],
  },
  {
    name: "Triangle Wrestling Club",
    abbreviation: "TWC",
    location: "Triangle Area, NC",
    variations: ["TWC", "Triangle Wrestling", "Triangle Wrestling Club"],
  },
  {
    name: "Charlotte Wrestling Club",
    abbreviation: "CWC",
    location: "Charlotte, NC",
    variations: ["CWC", "Charlotte Wrestling", "Charlotte Wrestling Club"],
  },
  {
    name: "Greensboro Wrestling Club",
    abbreviation: "GWC",
    location: "Greensboro, NC",
    variations: ["GWC", "Greensboro Wrestling", "Greensboro Wrestling Club"],
  },
  {
    name: "Wilmington Wrestling Club",
    abbreviation: "WWC",
    location: "Wilmington, NC",
    variations: ["WWC", "Wilmington Wrestling", "Wilmington Wrestling Club"],
  },
  {
    name: "Asheville Wrestling Club",
    abbreviation: "AWC",
    location: "Asheville, NC",
    variations: ["AWC", "Asheville Wrestling", "Asheville Wrestling Club"],
  },
]

export function findWrestlingClub(input: string): WrestlingClub | null {
  const normalizedInput = input.toLowerCase().trim()

  return (
    POPULAR_WRESTLING_CLUBS.find((club) =>
      club.variations.some(
        (variation) =>
          variation.toLowerCase() === normalizedInput ||
          variation.toLowerCase().includes(normalizedInput) ||
          normalizedInput.includes(variation.toLowerCase()),
      ),
    ) || null
  )
}

export function getWrestlingClubSuggestions(input: string): WrestlingClub[] {
  if (!input || input.length < 2) return []

  const normalizedInput = input.toLowerCase().trim()

  return POPULAR_WRESTLING_CLUBS.filter(
    (club) =>
      club.variations.some((variation) => variation.toLowerCase().includes(normalizedInput)) ||
      club.name.toLowerCase().includes(normalizedInput),
  )
}
