import "server-only"

import type { SupabaseClient } from "@supabase/supabase-js"

import { mostRecentGraduatedClassYear } from "@/lib/class-years"
import { familyAthleteIds } from "@/lib/coach-messages"

/**
 * Whose recruiting a family is looking at: a son's, a daughter's, or both.
 *
 * One Command Center serves men's and women's wrestling (Matt, 13 Oct 2026). It is not split in
 * two; it follows the wrestler. A family whose only wrestler is a girl opens the map on women's
 * programs, sees the women's coach first on a college's page, and reads the women's rule first.
 * A family with a son and a daughter gets no default - both stay in view.
 *
 * Read from the profile's own gender, and only from wrestlers still in school. A wrestler with no
 * gender on the profile sets nothing: a guess here would hide half the map from the wrong family.
 */
export type WrestlingFocus = { gender: "mens" | "womens"; names: string[] }

export function focusFrom(rows: Array<{ firstName?: unknown; name?: unknown; gender?: unknown; graduationyear?: unknown }>, graduated: number): WrestlingFocus | null {
  const current = rows.filter((a) => !a.graduationyear || Number(a.graduationyear) > graduated)
  const genders = new Set(
    current.map((a) => {
      const g = String(a.gender ?? "").trim().toLowerCase()
      return g.startsWith("f") ? "womens" : g.startsWith("m") ? "mens" : "unknown"
    }),
  )
  if (genders.size !== 1 || genders.has("unknown")) return null
  const gender = [...genders][0] as "mens" | "womens"
  const names = current.map((a) => String(a.firstName ?? "").trim() || String(a.name ?? "").trim().split(" ")[0]).filter(Boolean)
  return { gender, names }
}

export async function familyFocus(admin: SupabaseClient, userId: string | null | undefined): Promise<WrestlingFocus | null> {
  if (!userId) return null
  try {
    const ids = await familyAthleteIds(admin, userId)
    if (ids.length === 0) return null
    const { data } = await admin.from("athletes").select('"firstName", name, gender, graduationyear').in("id", ids)
    return focusFrom(data ?? [], mostRecentGraduatedClassYear())
  } catch {
    return null
  }
}
