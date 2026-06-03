import { resolveEntityLogoUrl } from "@/lib/entity-logo-resolve"

export type TocConfirmedCollege = {
  name: string
  logoUrl: string
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

/** Resolve logos for admin-confirmed programs only; skip entries without a logo. */
export async function resolveTocConfirmedColleges(names: string[]): Promise<TocConfirmedCollege[]> {
  if (names.length === 0) return []

  const resolved = await Promise.all(
    names.map(async (name) => {
      const logoUrl = await resolveEntityLogoUrl("college", name)
      return logoUrl ? { name, logoUrl } : null
    }),
  )

  return resolved.filter((entry): entry is TocConfirmedCollege => entry !== null)
}
