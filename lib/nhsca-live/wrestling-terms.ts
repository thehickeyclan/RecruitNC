export function getWinTypeDisplay(winType: string | null | undefined): string {
  if (!winType) return ""
  const upperType = winType.toUpperCase()

  switch (upperType) {
    case "F":
      return "Pin"
    case "MD":
      return "Major Decision"
    case "TF":
      return "Tech Fall"
    case "DEC":
      return "Decision"
    case "FOR":
      return "Forfeit"
    case "INJ":
      return "Injury"
    case "DQ":
      return "Disqualification"
    default:
      return winType
  }
}
