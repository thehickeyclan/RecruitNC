import type { SupabaseClient } from "@supabase/supabase-js"

/**
 * Recruiting-ready (Matt, 2 Nov 2026): a GPA, a cell to reach the family - the athlete's or a
 * parent's - and an intended major. It is the database's measure as much as the family's: a
 * profile a coach can judge and act on, whether or not anyone ever subscribes.
 */
export type ReadinessFields = {
  gpa: unknown
  athleteCell: unknown
  parentCells: readonly unknown[]
  major: unknown
}

const filled = (v: unknown) => (typeof v === "number" ? Number.isFinite(v) : String(v ?? "").trim().length > 0)

export function readinessParts(f: ReadinessFields): { gpa: boolean; cell: boolean; major: boolean } {
  return { gpa: filled(f.gpa), cell: filled(f.athleteCell) || f.parentCells.some(filled), major: filled(f.major) }
}

export function isRecruitingReady(f: ReadinessFields): boolean {
  const p = readinessParts(f)
  return p.gpa && p.cell && p.major
}

/**
 * Writes one "recruiting_ready" analytics row the first time a save completes the three, so the
 * dashboard can time claim-to-ready. Profiles that were ready before 2 Nov 2026 have no row and
 * are counted as ready with no time. Never throws: a lost row must not fail a save.
 */
export async function recordRecruitingReadyIfNew(admin: SupabaseClient, athleteId: string, userId: string | null): Promise<void> {
  try {
    const [{ data: a }, { data: links }] = await Promise.all([
      admin.from("athletes").select("academic_gpa, phone, academic_interest, claimed_by_user_id").eq("id", athleteId).maybeSingle(),
      admin.from("parent_athlete_links").select("user_id").eq("athlete_id", athleteId),
    ])
    if (!a) return
    const owners = [a.claimed_by_user_id, ...(links ?? []).map((l) => l.user_id)].filter((v): v is string => typeof v === "string" && v.length > 0)
    const { data: people } = owners.length ? await admin.from("user_profiles").select("cell_phone").in("user_id", owners) : { data: [] }
    const ready = isRecruitingReady({
      gpa: a.academic_gpa,
      athleteCell: a.phone,
      parentCells: (people ?? []).map((p) => (p as { cell_phone?: unknown }).cell_phone),
      major: a.academic_interest,
    })
    if (!ready) return
    const { count } = await admin
      .from("user_analytics")
      .select("id", { count: "exact", head: true })
      .eq("event_type", "recruiting_ready")
      .contains("event_data", { athlete_id: athleteId })
    if ((count ?? 0) > 0) return
    await admin.from("user_analytics").insert({
      user_id: userId,
      event_type: "recruiting_ready",
      event_data: { athlete_id: athleteId, timestamp: new Date().toISOString() },
      created_at: new Date().toISOString(),
    })
  } catch (error) {
    console.warn("[funnel] recruiting_ready:", error)
  }
}
