/**
 * Link the things we know have a page, after the model has written the answer.
 *
 * Asking the model to link a school name works most of the time, which is not good enough —
 * the same answer would link Cardinal Gibbons on one run and not the next. Tense and the college
 * line moved out of the prompt for the same reason; this is the rendering equivalent. The model
 * writes the prose, we guarantee the links.
 */

export type LinkableEntity = { name: string; url: string }

/** Private-use sentinels — see data-dawg-render-links.ts for why these and not brackets. */
const TOKEN_OPEN = "\uE000"
const TOKEN_CLOSE = "\uE001"

const MARKDOWN_LINK = /\[[^\]\n]*\]\([^)\s]+\)/g

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
}

/**
 * Link the first plain-text mention of each entity. Existing links are held aside first, so a
 * name already inside a link — as the label or in the href — is left alone and never doubled.
 */
export function linkifyKnownEntities(answer: string, entities: LinkableEntity[]): string {
  const usable = entities.filter((e) => e?.name?.trim() && e?.url?.trim())
  if (!usable.length) return answer

  const held: string[] = []
  let out = answer.replace(MARKDOWN_LINK, (match) => {
    held.push(match)
    return `${TOKEN_OPEN}${held.length - 1}${TOKEN_CLOSE}`
  })

  for (const { name, url } of usable) {
    const trimmed = name.trim()
    // Already linked somewhere in the answer — one link per thing.
    if (held.some((h) => h.includes(`[${trimmed}]`))) continue

    // Word boundaries so "Green Hope" does not match inside "Green Hopewell".
    const pattern = new RegExp(`(^|[^\\w[])(${escapeRegExp(trimmed)})(?![\\w\\]])`)
    const match = pattern.exec(out)
    if (!match) continue

    const replacement = `${match[1]}${TOKEN_OPEN}${held.length}${TOKEN_CLOSE}`
    held.push(`[${trimmed}](${url})`)
    out = out.slice(0, match.index) + replacement + out.slice(match.index + match[0].length)
  }

  return out.replace(
    new RegExp(`${TOKEN_OPEN}(\\d+)${TOKEN_CLOSE}`, "g"),
    (_m, i: string) => held[Number(i)] ?? "",
  )
}

/**
 * Pull the linkable entities out of a facts payload. Athlete facts carry the athlete's school;
 * school facts carry the school itself. Anything without a URL is skipped — we never guess one.
 */
export function linkableEntitiesFromFacts(facts: unknown): LinkableEntity[] {
  if (!facts || typeof facts !== "object") return []
  const f = facts as Record<string, unknown>
  const out: LinkableEntity[] = []

  const push = (name: unknown, url: unknown) => {
    if (typeof name === "string" && name.trim() && typeof url === "string" && url.trim()) {
      out.push({ name: name.trim(), url: url.trim() })
    }
  }

  push(f.high_school, f.high_school_url)
  push(f.name, f.page_url)

  return out
}
