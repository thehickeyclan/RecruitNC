import { normalizeWeightClassLabel } from "@/lib/last-competed-weight"

/**
 * What an athlete may change about their own profile, from the phone.
 *
 * An allowlist, like the read payload beside it: the athletes row is a hundred columns wide and
 * carries a ranking, a claim, moderation flags and somebody's payout handle. A write route that
 * takes whatever it is handed would let an athlete rank themselves. Anything not named here
 * cannot be written by this route, whoever is holding the phone.
 *
 * Every value is validated rather than trusted — a GPA of 400 or a highlight link pointing at
 * someone's Instagram login is the sort of thing that reaches a college coach on a report with
 * our name on it.
 */

export type AthleteEditInput = Record<string, unknown>

export type AthleteEditResult =
  | {
      ok: true
      patch: Record<string, unknown>
      /**
       * Instagram lives inside the `socialMedia` jsonb rather than a column of its own, so it
       * cannot be set by a flat patch — the route merges it into whatever is already there.
       * Undefined when the field was not sent; null clears it.
       */
      instagram?: string | null
    }
  | { ok: false; field: string; error: string }

/** Weighted scales exist, so this is not capped at 4.0 — but 6.0 is nobody's GPA. */
const GPA_MAX = 6

function str(value: unknown): string {
  return typeof value === "string" ? value.trim() : value == null ? "" : String(value).trim()
}

/** A handle, however it was pasted: "@matt", a profile URL, or the bare name. */
export function normalizeInstagramHandle(raw: unknown): string | null {
  const text = str(raw).replace(/^@+/, "")
  if (!text) return null
  const fromUrl = text.match(/instagram\.com\/([A-Za-z0-9._]+)/i)?.[1]
  const handle = (fromUrl ?? text).replace(/\/+$/, "")
  if (!/^[A-Za-z0-9._]{1,30}$/.test(handle)) return null
  return handle
}

/** Film has to be a link a coach can open, not a file path or a login page. */
export function normalizeVideoUrl(raw: unknown): string | null | undefined {
  const text = str(raw)
  if (!text) return null
  try {
    const url = new URL(text)
    if (url.protocol !== "http:" && url.protocol !== "https:") return undefined
    return url.toString()
  } catch {
    return undefined
  }
}

/**
 * Turn what the phone sent into the columns to write.
 *
 * Absent keys are left alone; a key present and empty clears the field, because "I typed a GPA
 * last year and it is wrong now" has to be fixable from the same screen that set it.
 */
export function buildAthleteEditPatch(input: AthleteEditInput): AthleteEditResult {
  const patch: Record<string, unknown> = {}
  const has = (key: string) => Object.prototype.hasOwnProperty.call(input, key)

  if (has("gpa")) {
    const text = str(input.gpa)
    if (!text) patch.academic_gpa = null
    else {
      const n = Number(text)
      if (!Number.isFinite(n) || n <= 0 || n > GPA_MAX) {
        return { ok: false, field: "gpa", error: `GPA should be a number up to ${GPA_MAX}.` }
      }
      patch.academic_gpa = n
    }
  }

  if (has("sat")) {
    const text = str(input.sat)
    if (!text) patch.academic_sat = null
    else {
      const n = Number(text)
      if (!Number.isInteger(n) || n < 400 || n > 1600) {
        return { ok: false, field: "sat", error: "SAT should be between 400 and 1600." }
      }
      patch.academic_sat = n
    }
  }

  if (has("act")) {
    const text = str(input.act)
    if (!text) patch.academic_act = null
    else {
      const n = Number(text)
      if (!Number.isInteger(n) || n < 1 || n > 36) {
        return { ok: false, field: "act", error: "ACT should be between 1 and 36." }
      }
      patch.academic_act = n
    }
  }

  if (has("intendedMajor")) {
    const text = str(input.intendedMajor)
    if (text.length > 80) return { ok: false, field: "intendedMajor", error: "Keep the major under 80 characters." }
    patch.academic_interest = text || null
  }

  if (has("collegeWeightClass")) {
    const text = str(input.collegeWeightClass)
    if (!text) patch.college_weight_class = null
    else {
      const weight = normalizeWeightClassLabel(text)
      if (!weight) return { ok: false, field: "collegeWeightClass", error: "Use a weight class like 141." }
      patch.college_weight_class = weight
    }
  }

  if (has("weightClass")) {
    const text = str(input.weightClass)
    if (!text) patch.weightclass = null
    else {
      const weight = normalizeWeightClassLabel(text)
      if (!weight) return { ok: false, field: "weightClass", error: "Use a weight class like 138." }
      patch.weightclass = weight
    }
  }

  if (has("highlightVideoUrl")) {
    const url = normalizeVideoUrl(input.highlightVideoUrl)
    if (url === undefined) {
      return { ok: false, field: "highlightVideoUrl", error: "That does not look like a link. Paste the whole URL." }
    }
    patch.highlight_video_url = url
  }

  if (has("bio")) {
    const text = str(input.bio)
    if (text.length > 1200) return { ok: false, field: "bio", error: "Keep the bio under 1200 characters." }
    patch.bio = text || null
  }

  let instagram: string | null | undefined
  if (has("instagram")) {
    const text = str(input.instagram)
    if (!text) instagram = null
    else {
      const handle = normalizeInstagramHandle(text)
      if (!handle) return { ok: false, field: "instagram", error: "Use your Instagram handle, like ncunited." }
      instagram = handle
    }
  }

  if (Object.keys(patch).length === 0 && instagram === undefined) {
    return { ok: false, field: "", error: "Nothing to change." }
  }
  return instagram === undefined ? { ok: true, patch } : { ok: true, patch, instagram }
}

/**
 * Merge a handle into the `socialMedia` jsonb without disturbing the other networks.
 *
 * There is no `instagram` column on `athletes` — the flat spellings the profile reads
 * (`instagram`, `instagram_handle`, `instagram_username`) do not exist, which a write found out
 * the hard way. The object is the only real home.
 */
export function mergeInstagram(current: unknown, handle: string | null): Record<string, unknown> {
  const base = current && typeof current === "object" && !Array.isArray(current) ? { ...(current as object) } : {}
  const next = base as Record<string, unknown>
  if (handle) next.instagram = handle
  else delete next.instagram
  return next
}

/** The fields the edit screen shows, so the app and the route agree on one list. */
export const EDITABLE_FIELDS = [
  "gpa",
  "sat",
  "act",
  "intendedMajor",
  "collegeWeightClass",
  "weightClass",
  "highlightVideoUrl",
  "bio",
  "instagram",
] as const
