/** Optional bout score/time line stored alongside admin note tags in `notes`. */

const NOTE_TAGS = ["Big win", "Ranked win", "Ranked loss"] as const
const SCORE_TAG_SEP = " | "

export function notesFromTags(tags: readonly string[]): string | null {
  const parts = tags.map((t) => t.trim()).filter(Boolean)
  return parts.length ? parts.join(" · ") : null
}

function tagsFromTagPart(tagPart: string | null | undefined): string[] {
  if (!tagPart?.trim()) return []
  const parts = tagPart.split("·").map((s) => s.trim())
  return NOTE_TAGS.filter((tag) => parts.includes(tag))
}

/** True when the whole string is only known admin tags (no score line). */
function tagsOnlyString(notes: string): string | null {
  const trimmed = notes.trim()
  const matched = tagsFromTagPart(trimmed)
  if (!matched.length) return null
  return notesFromTags(matched) === trimmed ? trimmed : null
}

export function parseNoteTags(notes: string | null | undefined): string[] {
  if (!notes?.trim()) return []
  const idx = notes.indexOf(SCORE_TAG_SEP)
  if (idx === -1) {
    const tagOnly = tagsOnlyString(notes)
    return tagOnly ? tagsFromTagPart(tagOnly) : []
  }
  const tagPart = notes.slice(idx + SCORE_TAG_SEP.length).trim() || null
  return tagsFromTagPart(tagPart)
}

export function splitMatchNotes(notes: string | null | undefined): {
  scoreLine: string | null
  tagPart: string | null
} {
  if (!notes?.trim()) return { scoreLine: null, tagPart: null }
  const idx = notes.indexOf(SCORE_TAG_SEP)
  if (idx === -1) {
    const tagOnly = tagsOnlyString(notes)
    if (tagOnly) return { scoreLine: null, tagPart: tagOnly }
    return { scoreLine: notes.trim(), tagPart: null }
  }
  const scoreLine = notes.slice(0, idx).trim() || null
  const tagPart = notes.slice(idx + SCORE_TAG_SEP.length).trim() || null
  return { scoreLine, tagPart }
}

export function composeMatchNotes(scoreLine: string | null | undefined, tags: readonly string[]): string | null {
  const score = scoreLine?.trim() || null
  const tagStr = notesFromTags(tags)
  if (score && tagStr) return `${score}${SCORE_TAG_SEP}${tagStr}`
  if (score) return score
  if (tagStr) return tagStr
  return null
}

/** Display tags only (excludes score/time line). */
export function displayNoteTags(notes: string | null | undefined): string | null {
  const tags = parseNoteTags(notes)
  return notesFromTags(tags)
}
