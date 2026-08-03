export function normalizeClubName(value: string | null | undefined): string {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/\b(wrestling|wrestling club|club|wc|rtc|training center|academy)\b/g, " ")
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
}

export function firstNonEmpty(...values: Array<string | null | undefined>): string {
  for (const value of values) {
    const trimmed = String(value ?? "").trim()
    if (trimmed) return trimmed
  }
  return ""
}
