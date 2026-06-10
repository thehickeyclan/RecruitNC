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

/** Resolve logos for admin-confirmed programs; uses TOC blob URLs first, then entity logos. */
export async function resolveTocConfirmedColleges(names: string[]): Promise<TocConfirmedCollege[]> {
  const list =
    names.length > 0 ? names : TOC_CONFIRMED_COLLEGES_DEFAULT.map((c) => c.name)

  const resolved = await Promise.all(
    list.map(async (name) => {
      const logoUrl = tocCollegeLogoUrl(name) ?? (await resolveEntityLogoUrl("college", name))
      return logoUrl ? { name, logoUrl } : null
    }),
  )

  return resolved.filter((entry): entry is TocConfirmedCollege => entry !== null)
}

/** Default confirmed colleges with logos (no DB). */
export function getDefaultTocConfirmedColleges(): TocConfirmedCollege[] {
  return TOC_CONFIRMED_COLLEGES_DEFAULT.map(({ name, logoUrl }) => ({ name, logoUrl }))
}
