import "server-only"

import type { SupabaseClient } from "@supabase/supabase-js"
import { resolveEntityLogoUrlWithSource } from "@/lib/entity-logo-resolve"

/**
 * The logo a coach is greeted with on Coach Home, and where it came from.
 *
 * One function for the page and for the staff check (/admin/coach-logos), so the check shows
 * exactly what a coach sees. On 11 October 2026 Virginia's head coach was shown Ohio University's
 * logo the day an email went to every Division I program; nobody had looked at any school's logo
 * but our own. The check exists so every program can be looked at before the next send.
 *
 * - "uploaded": the program's own `schools.logo_url`. Trusted as given - which is how two
 *   programs came to show a wrestler's commitment graphic. Only eyes catch that.
 * - "matched": the site's college logo for a name that is the same school (entity-logo-resolve).
 * - "none": no logo. Always the answer when unsure.
 */
export type ProgramLogo = { url: string | null; source: "uploaded" | "matched" | "none" }

export async function programLogo(school: { name: string | null; logo_url?: string | null } | null): Promise<ProgramLogo> {
  if (!school) return { url: null, source: "none" }
  const uploaded = String(school.logo_url ?? "").trim()
  if (uploaded) return { url: uploaded, source: "uploaded" }
  if (!school.name) return { url: null, source: "none" }
  const matched = await resolveEntityLogoUrlWithSource("college", school.name).catch(() => null)
  return matched ? { url: matched.url, source: "matched" } : { url: null, source: "none" }
}

export type ProgramLogoRow = {
  schoolId: string
  name: string
  coaches: Array<{ name: string; email: string | null; joined: string }>
  logo: ProgramLogo
}

/** Every program a college coach account belongs to, with the logo its coaches see. */
export async function loadCoachProgramLogos(admin: SupabaseClient): Promise<{ programs: ProgramLogoRow[]; unattached: ProgramLogoRow["coaches"] }> {
  const { data: coaches } = await admin
    .from("user_profiles")
    .select("school_id, full_name, email, created_at")
    .eq("role", "college_coach")
    .order("created_at", { ascending: false })
  const person = (c: { full_name: string | null; email: string | null; created_at: string }) => ({
    name: c.full_name || "(no name)",
    email: c.email,
    joined: c.created_at,
  })
  const ids = [...new Set((coaches ?? []).map((c) => c.school_id as string | null).filter((id): id is string => Boolean(id)))]
  const { data: schools } = ids.length ? await admin.from("schools").select("id, name, logo_url").in("id", ids) : { data: [] }
  const programs = await Promise.all(
    (schools ?? []).map(async (s) => ({
      schoolId: String(s.id),
      name: String(s.name ?? ""),
      coaches: (coaches ?? []).filter((c) => c.school_id === s.id).map(person),
      logo: await programLogo({ name: s.name as string | null, logo_url: s.logo_url as string | null }),
    })),
  )
  programs.sort((a, b) => a.name.localeCompare(b.name))
  return { programs, unattached: (coaches ?? []).filter((c) => !c.school_id).map(person) }
}
