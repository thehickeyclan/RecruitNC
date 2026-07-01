import { resolveEntityLogoUrl } from "@/lib/entity-logo-resolve"
import { TOC_CONFIRMED_COLLEGES_DEFAULT } from "@/lib/toc/constants"

export type TocConfirmedCollege = {
  name: string
  logoUrl: string
}

/** Canonical TOC fair logos — overrides generic entity resolution on the landing page. */
const TOC_COLLEGE_LOGO_BY_KEY: Record<string, string> = Object.fromEntries(
  TOC_CONFIRMED_COLLEGES_DEFAULT.flatMap(({ name, logoUrl }) => {
    const key = name.trim().toLowerCase()
    const entries: [string, string][] = [[key, logoUrl]]
    if (key === "unc") {
      entries.push(["university of north carolina", logoUrl], ["unc chapel hill", logoUrl])
    }
    if (key === "nc state") {
      entries.push(["north carolina state", logoUrl], ["north carolina state university", logoUrl])
    }
    if (key === "roanoke") {
      entries.push(["roanoke college", logoUrl])
    }
    if (key.startsWith("greensboro")) {
      entries.push(["greensboro college", logoUrl], ["greensboro", logoUrl])
    }
    if (key === "montreat") {
      entries.push(["montreat college", logoUrl])
    }
    if (key === "umo") {
      entries.push(["university of mount olive", logoUrl], ["mount olive", logoUrl])
    }
    if (key === "lynchburg") {
      entries.push(["university of lynchburg", logoUrl], ["lynchburg college", logoUrl])
    }
    return entries
  }),
)

function tocCollegeLogoUrl(name: string): string | null {
  const key = name.trim().toLowerCase()
  if (!key) return null
  if (TOC_COLLEGE_LOGO_BY_KEY[key]) return TOC_COLLEGE_LOGO_BY_KEY[key]
  for (const [mappedKey, url] of Object.entries(TOC_COLLEGE_LOGO_BY_KEY)) {
    if (key.includes(mappedKey) || mappedKey.includes(key)) return url
  }
  return null
}

/** Parse `confirmed_colleges` jsonb from Supabase (array of program names). */
export function parseConfirmedCollegeNames(raw: unknown): string[] {
  if (Array.isArray(raw)) {
    return raw
      .filter((entry): entry is string => typeof entry === "string" && entry.trim().length > 0)
      .map((entry) => entry.trim())
  }
  if (typeof raw === "string" && raw.trim().startsWith("[")) {
    try {
      return parseConfirmedCollegeNames(JSON.parse(raw))
    } catch {
      return []
    }
  }
  return []
}

/**
 * Code defaults always display (name + logo from constants.ts).
 * Supabase `confirmed_colleges` may only ADD programs not yet in code — never hide or replace defaults.
 */
export function mergeTocConfirmedCollegeNames(dbNames: string[]): string[] {
  const defaultNames = TOC_CONFIRMED_COLLEGES_DEFAULT.map((c) => c.name)
  if (dbNames.length === 0) return defaultNames

  const seen = new Set<string>()
  const merged: string[] = []
  for (const name of defaultNames) {
    const key = name.toLowerCase()
    seen.add(key)
    merged.push(name)
  }
  for (const name of dbNames) {
    const trimmed = name.trim()
    const key = trimmed.toLowerCase()
    if (!key || seen.has(key)) continue
    seen.add(key)
    merged.push(trimmed)
  }
  return merged
}

/** Landing + confirm pages — code defaults first; DB extras appended. */
export async function resolveTocConfirmedColleges(dbNames: string[]): Promise<TocConfirmedCollege[]> {
  const defaults = getDefaultTocConfirmedColleges()
  const defaultKeys = new Set(defaults.map((c) => c.name.toLowerCase()))

  const extraNames = mergeTocConfirmedCollegeNames(dbNames).filter(
    (name) => !defaultKeys.has(name.toLowerCase()),
  )

  const extras = (
    await Promise.all(
      extraNames.map(async (name) => {
        const logoUrl = tocCollegeLogoUrl(name) ?? (await resolveEntityLogoUrl("college", name))
        return logoUrl ? { name, logoUrl } : null
      }),
    )
  ).filter((entry): entry is TocConfirmedCollege => entry !== null)

  return [...defaults, ...extras]
}

/** Default confirmed colleges with logos (no DB). */
export function getDefaultTocConfirmedColleges(): TocConfirmedCollege[] {
  return TOC_CONFIRMED_COLLEGES_DEFAULT.map(({ name, logoUrl }) => ({ name, logoUrl }))
}
