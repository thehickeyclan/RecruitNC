/** Normalize college athletic division strings to canonical labels (NCAA Division I–III, NAIA, NJCAA). */
export function normalizeDivision(division: string | null | undefined): string {
  if (!division) return "Unknown"

  const div = division.trim().toLowerCase()

  if (
    div === "diii" ||
    div === "d3" ||
    div === "division iii" ||
    div === "division 3" ||
    div === "ncaa division iii" ||
    div === "ncaa division 3" ||
    div === "ncaa diii" ||
    div === "ncaa d3"
  ) {
    return "NCAA Division III"
  }

  if (
    div === "dii" ||
    div === "d2" ||
    div === "division ii" ||
    div === "division 2" ||
    div === "ncaa division ii" ||
    div === "ncaa division 2" ||
    div === "ncaa dii" ||
    div === "ncaa d2"
  ) {
    return "NCAA Division II"
  }

  if (
    div === "di" ||
    div === "d1" ||
    div === "division i" ||
    div === "division 1" ||
    div === "ncaa division i" ||
    div === "ncaa division 1" ||
    div === "ncaa di" ||
    div === "ncaa d1"
  ) {
    return "NCAA Division I"
  }

  if (div.includes("naia")) return "NAIA"
  if (div.includes("njcaa")) return "NJCAA"
  if (div.includes("independent")) return "Independent"

  return division.trim()
}
