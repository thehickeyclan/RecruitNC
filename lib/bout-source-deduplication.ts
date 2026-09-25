import type { Bout } from "@/lib/significant-wins"

function normalized(value: unknown): string {
  return String(value ?? "")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "")
}

function eventIdentity(value: unknown): string {
  const event = normalized(value)
  if (!event) return ""
  if (/^(?:interstate)?i?64/.test(event) || event.includes("i64springduals")) return "i64"
  if (event.includes("nchsaa") && event.includes("statechampionship") && !event.includes("dual")) return "nchsaa-states"
  return event
}

function outcomeIdentity(bout: Bout): string {
  const value = String(bout.win_loss ?? bout.result ?? "").trim().toUpperCase()
  if (value === "W" || value.startsWith("W ") || value.includes("WIN")) return "W"
  if (value === "L" || value.startsWith("L ") || value.includes("LOSS")) return "L"
  return value
}

/**
 * The same bout can arrive twice: once in RankWrestler's season history and once in an event CSV.
 * Merge the two sources as a multiset, preferring the structured event row (exact score/date).
 *
 * A multiset matters: if an athlete genuinely wrestled the same opponent twice at one event,
 * two preferred rows remain two rows; only the matching copies from the fallback source disappear.
 */
export function mergeBoutSources(preferred: readonly Bout[], fallback: readonly Bout[]): Bout[] {
  const keyOf = (bout: Bout) => {
    const event = eventIdentity(bout.venue)
    const opponent = normalized(bout.opponent ?? bout.opponent_name)
    const outcome = outcomeIdentity(bout)
    const weight = normalized(bout.weight)
    if (!event || !opponent || !outcome) return ""
    return `${event}|${opponent}|${outcome}|${weight}`
  }

  const preferredCounts = new Map<string, number>()
  for (const bout of preferred) {
    const key = keyOf(bout)
    if (key) preferredCounts.set(key, (preferredCounts.get(key) ?? 0) + 1)
  }

  const consumed = new Map<string, number>()
  const merged = [...preferred]
  for (const bout of fallback) {
    const key = keyOf(bout)
    const available = key ? preferredCounts.get(key) ?? 0 : 0
    const used = key ? consumed.get(key) ?? 0 : 0
    if (key && used < available) {
      consumed.set(key, used + 1)
      continue
    }
    merged.push(bout)
  }
  return merged
}

