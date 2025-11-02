/**
 * Standardizes division names to a consistent format
 * @param division The division name to standardize
 * @returns Standardized division name
 */
export function standardizeDivision(division: string | null | undefined): string {
  if (!division) return "Unknown"

  const divLower = division.toLowerCase().trim()

  // Special case for Montreat College
  if (divLower.includes("montreat")) {
    return "NAIA"
  }

  // Division I variations
  if (
    divLower === "ncaa di" ||
    divLower === "ncaa d1" ||
    divLower === "ncaa division i" ||
    divLower === "ncaa division 1" ||
    divLower === "di" ||
    divLower === "d1" ||
    divLower === "division i" ||
    divLower === "division 1" ||
    divLower.includes("division i") ||
    divLower.includes("division 1") ||
    (divLower.includes("di") && !divLower.includes("dii") && !divLower.includes("diii")) ||
    (divLower.includes("d1") && !divLower.includes("d2") && !divLower.includes("d3")) ||
    divLower.includes("d-1") ||
    divLower.includes("d-i")
  ) {
    return "Division I"
  }

  // Division II variations
  if (
    divLower === "ncaa dii" ||
    divLower === "ncaa d2" ||
    divLower === "ncaa division ii" ||
    divLower === "ncaa division 2" ||
    divLower === "dii" ||
    divLower === "d2" ||
    divLower === "division ii" ||
    divLower === "division 2" ||
    divLower.includes("division ii") ||
    divLower.includes("division 2") ||
    divLower.includes("dii") ||
    divLower.includes("d2") ||
    divLower.includes("d-2") ||
    divLower.includes("d-ii")
  ) {
    return "Division II"
  }

  // Division III variations
  if (
    divLower === "ncaa diii" ||
    divLower === "ncaa d3" ||
    divLower === "ncaa division iii" ||
    divLower === "ncaa division 3" ||
    divLower === "diii" ||
    divLower === "d3" ||
    divLower === "division iii" ||
    divLower === "division 3" ||
    divLower.includes("division iii") ||
    divLower.includes("division 3") ||
    divLower.includes("diii") ||
    divLower.includes("d3") ||
    divLower.includes("d-3") ||
    divLower.includes("d-iii")
  ) {
    return "Division III"
  }

  // NAIA variations
  if (divLower.includes("naia")) {
    return "NAIA"
  }

  // NJCAA variations
  if (
    divLower.includes("njcaa") ||
    divLower.includes("juco") ||
    divLower.includes("junior college") ||
    divLower.includes("community college")
  ) {
    return "NJCAA"
  }

  return division // Return original if no match
}

/**
 * Maps a college name to its known division
 * @param collegeName The college name to look up
 * @returns The standardized division name
 */
export function getCollegeDivision(collegeName: string): string {
  if (!collegeName) return "Unknown"

  const normalizedName = collegeName.toLowerCase().trim()

  // Special case for Montreat
  if (normalizedName.includes("montreat")) {
    return "NAIA"
  }

  // Division I Schools
  const divisionIColleges = [
    "nc state",
    "north carolina state",
    "unc",
    "unc chapel hill",
    "north carolina",
    "university of north carolina",
    "appalachian state",
    "app state",
    "campbell",
    "campbell university",
    "davidson",
    "davidson college",
    "duke",
    "duke university",
    "elon",
    "elon university",
    "gardner-webb",
    "gardner webb",
    "high point",
    "high point university",
    "ohio university",
    "ohio",
    "utah valley",
    "utah valley university",
    "virginia tech",
    "virginia polytechnic institute",
    "old dominion",
    "old dominion university",
    "george mason",
    "george mason university",
  ]

  // Division II Schools
  const divisionIIColleges = [
    "belmont abbey",
    "belmont abbey college",
    "unc pembroke",
    "pembroke",
    "queens",
    "queens university",
    "limestone",
    "limestone university",
    "coker",
    "coker university",
    "newberry",
    "newberry college",
    "mars hill",
    "mars hill university",
    "king",
    "king university",
    "barton",
    "barton college",
    "emmanuel",
    "emmanuel college",
    "lees-mcrae",
    "lees mcrae",
    "lenoir-rhyne",
    "lenoir rhyne",
    "wingate",
    "wingate university",
  ]

  // Division III Schools
  const divisionIIIColleges = [
    "roanoke",
    "roanoke college",
    "ferrum",
    "ferrum college",
    "greensboro",
    "greensboro college",
    "guilford",
    "guilford college",
    "methodist",
    "methodist university",
    "nc wesleyan",
    "north carolina wesleyan",
    "averett",
    "averett university",
    "washington and lee",
    "washington & lee",
    "hampden-sydney",
    "hampden sydney",
    "randolph-macon",
    "bridgewater",
    "bridgewater college",
    "shenandoah",
    "shenandoah university",
  ]

  // NAIA Schools
  const naiaColleges = [
    "montreat",
    "montreat college",
    "st. andrews",
    "st andrews",
    "saint andrews",
    "bluefield",
    "bluefield college",
    "truett mcconnell",
    "truett-mcconnell",
    "reinhardt",
    "reinhardt university",
    "life university",
    "life",
  ]

  if (divisionIColleges.some((college) => normalizedName.includes(college))) {
    return "Division I"
  }

  if (divisionIIColleges.some((college) => normalizedName.includes(college))) {
    return "Division II"
  }

  if (divisionIIIColleges.some((college) => normalizedName.includes(college))) {
    return "Division III"
  }

  if (naiaColleges.some((college) => normalizedName.includes(college))) {
    return "NAIA"
  }

  return "Unknown"
}
