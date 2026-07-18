/** Public, athlete-entered competitive details that supplement structured result tables. */

function cleanText(value: unknown): string {
  return String(value ?? "")
    .replace(/\r\n?/g, "\n")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim()
    .slice(0, 3000)
}

function achievementLines(value: unknown): string[] {
  const raw = Array.isArray(value) ? value : value ? [value] : []
  const seen = new Set<string>()
  const lines: string[] = []
  for (const item of raw) {
    const text = cleanText(item)
    if (!text || /^(none|n\/a|na|-)$/i.test(text)) continue
    const key = text.toLowerCase()
    if (seen.has(key)) continue
    seen.add(key)
    lines.push(text)
  }
  return lines.slice(0, 20)
}

export function formatAthleteProfileDetailsMarkdown(athlete: Record<string, unknown>): string {
  const collegeOpens = cleanText(athlete.college_opens_experience)
  const rankedWins = cleanText(athlete.nationally_ranked_wins)
  const additional = cleanText(athlete.additional_achievements)
  const achievements = achievementLines(athlete.achievements)
  if (!collegeOpens && !rankedWins && !additional && achievements.length === 0) return ""

  const lines = ["Athlete profile details (profile-reported):"]
  if (collegeOpens) lines.push("", "College open experience:", collegeOpens)
  if (rankedWins) lines.push("", "Nationally ranked wins:", rankedWins)
  if (additional) lines.push("", "Additional achievements:", additional)
  if (achievements.length > 0) {
    lines.push("", "Other listed achievements:")
    lines.push(...achievements.map((item) => `- ${item}`))
  }
  return lines.join("\n")
}
