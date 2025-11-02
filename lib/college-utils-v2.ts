export function getCollegeDivision(collegeName: string): string {
  // Handle null or undefined
  if (!collegeName) return "Unknown"

  // Convert to lowercase for case-insensitive matching
  const name = collegeName.toLowerCase()

  // UNC Campus-specific divisions
  if (name.includes("unc pembroke") || name.includes("university of north carolina at pembroke")) {
    return "Division II"
  }

  if (
    name.includes("unc chapel hill") ||
    name.includes("university of north carolina at chapel hill") ||
    name.includes("unc charlotte") ||
    name.includes("university of north carolina at charlotte") ||
    name.includes("unc greensboro") ||
    name.includes("university of north carolina at greensboro") ||
    name.includes("unc wilmington") ||
    name.includes("university of north carolina at wilmington") ||
    name.includes("unc asheville") ||
    name.includes("university of north carolina at asheville") ||
    // Generic UNC without campus specified is assumed to be Chapel Hill
    (name.includes("unc") &&
      !name.includes("pembroke") &&
      !name.includes("charlotte") &&
      !name.includes("greensboro") &&
      !name.includes("wilmington") &&
      !name.includes("asheville")) ||
    (name.includes("university of north carolina") &&
      !name.includes("pembroke") &&
      !name.includes("charlotte") &&
      !name.includes("greensboro") &&
      !name.includes("wilmington") &&
      !name.includes("asheville")) ||
    name.includes("nc state") ||
    name.includes("north carolina state")
  ) {
    return "Division I"
  }

  // Division I colleges
  const divisionIColleges = [
    "appalachian state",
    "app state",
    "duke",
    "wake forest",
    "east carolina",
    "north carolina a&t",
    "nc a&t",
    "campbell",
    "davidson",
    "elon",
    "gardner-webb",
    "high point",
    "north carolina central",
    "nc central",
    "queens university of charlotte",
  ]

  // Division II colleges
  const divisionIIColleges = [
    "barton",
    "belmont abbey",
    "catawba",
    "chowan",
    "fayetteville state",
    "johnson c. smith",
    "lenoir-rhyne",
    "livingstone",
    "mars hill",
    "mount olive", // Added Mount Olive as Division II
    "university of mount olive", // Added alternative name
    "shaw",
    "st. augustine's",
    "wingate",
    "winston-salem state",
    "elizabeth city state",
    "lees-mcrae",
    "limestone",
    "coker",
    "newberry",
    "converse",
    "erskine",
    "francis marion",
    "king",
    "north greenville",
    "usc aiken",
    "usc beaufort",
    "usc upstate",
    "augusta",
    "flagler",
    "young harris",
    "lander",
    "georgia college",
    "columbus state",
  ]

  // Division III colleges
  const divisionIIIColleges = [
    "guilford",
    "greensboro",
    "methodist",
    "north carolina wesleyan",
    "nc wesleyan",
    "william peace",
    "brevard",
    "pfeiffer",
    "salem",
    "averett",
    "ferrum",
    "hampden-sydney",
    "randolph",
    "randolph-macon",
    "roanoke",
    "shenandoah",
    "virginia wesleyan",
    "washington and lee",
    "emory & henry",
    "emory and henry",
    "lynchburg",
    "mary washington",
    "southern virginia",
    "bridgewater",
    "eastern mennonite",
  ]

  // NAIA colleges
  const naiaColleges = [
    "montreat",
    "st. andrews",
    "truett mcconnell",
    "bluefield",
    "allen",
    "columbia international",
    "columbia college",
    "southern wesleyan",
    "point university",
    "reinhardt",
    "tennessee wesleyan",
    "bryan",
    "milligan",
    "union college",
    "cumberlands",
    "georgetown college",
    "campbellsville",
    "lindsey wilson",
    "life university",
    "keiser",
    "southeastern",
    "warner",
    "webber international",
    "st. thomas",
    "florida memorial",
    "edward waters",
    "ave maria",
  ]

  // NJCAA colleges
  const njcaaColleges = [
    "caldwell community college",
    "cape fear community college",
    "central carolina community college",
    "cleveland community college",
    "davidson-davie community college",
    "forsyth tech",
    "guilford technical community college",
    "gtcc",
    "johnston community college",
    "louisburg",
    "pitt community college",
    "rockingham community college",
    "rowan-cabarrus community college",
    "southwestern community college",
    "surry community college",
    "vance-granville community college",
    "wake tech",
    "alamance community college",
    "beaufort county community college",
    "bladen community college",
    "blue ridge community college",
    "brunswick community college",
    "carteret community college",
    "catawba valley community college",
    "central piedmont community college",
    "coastal carolina community college",
    "college of the albemarle",
    "craven community college",
    "davidson county community college",
    "durham technical community college",
    "edgecombe community college",
    "fayetteville technical community college",
    "gaston college",
    "halifax community college",
    "haywood community college",
    "isothermal community college",
    "james sprunt community college",
    "lenoir community college",
    "martin community college",
    "mayland community college",
    "mcdowell technical community college",
    "mitchell community college",
    "montgomery community college",
    "nash community college",
    "pamlico community college",
    "piedmont community college",
    "randolph community college",
    "richmond community college",
    "roanoke-chowan community college",
    "robeson community college",
    "sampson community college",
    "sandhills community college",
    "south piedmont community college",
    "southeastern community college",
    "stanly community college",
    "tri-county community college",
    "wake technical community college",
    "wayne community college",
    "western piedmont community college",
    "wilkes community college",
    "wilson community college",
  ]

  // Check each list
  for (const college of divisionIColleges) {
    if (name.includes(college)) return "Division I"
  }

  for (const college of divisionIIColleges) {
    if (name.includes(college)) return "Division II"
  }

  for (const college of divisionIIIColleges) {
    if (name.includes(college)) return "Division III"
  }

  for (const college of naiaColleges) {
    if (name.includes(college)) return "NAIA"
  }

  for (const college of njcaaColleges) {
    if (name.includes(college)) return "NJCAA"
  }

  // Default if no match is found
  return "Unknown"
}

export function standardizeDivision(division: string | null | undefined): string {
  if (!division) return "Unknown"

  const d = division.trim().toLowerCase()

  if (
    d.includes("division i") ||
    d.includes("division 1") ||
    d.includes("d1") ||
    d.includes("di") ||
    d === "d-i" ||
    d === "ncaa i" ||
    d === "ncaa 1"
  ) {
    return "Division I"
  }

  if (
    d.includes("division ii") ||
    d.includes("division 2") ||
    d.includes("d2") ||
    d.includes("dii") ||
    d === "d-ii" ||
    d === "ncaa ii" ||
    d === "ncaa 2"
  ) {
    return "Division II"
  }

  if (
    d.includes("division iii") ||
    d.includes("division 3") ||
    d.includes("d3") ||
    d.includes("diii") ||
    d === "d-iii" ||
    d === "ncaa iii" ||
    d === "ncaa 3"
  ) {
    return "Division III"
  }

  if (d.includes("naia")) {
    return "NAIA"
  }

  if (d.includes("njcaa") || d.includes("juco") || d.includes("junior college")) {
    return "NJCAA"
  }

  return "Unknown"
}
