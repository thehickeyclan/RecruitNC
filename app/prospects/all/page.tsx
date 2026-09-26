import { createAdminClient } from "@/lib/supabase/admin"
import { fetchProspectDirectoryAll, yearFilterToApiParams } from "@/lib/prospects-directory"
import { highestAchievement, loadAchievements } from "@/lib/prospect-achievements"
import ProspectsAllClient from "./prospects-all-client"

export const revalidate = 120

export default async function ProspectsAllPage() {
  let initialProspects: Awaited<ReturnType<typeof fetchProspectDirectoryAll>> = []

  try {
    const supabase = createAdminClient()
    initialProspects = await fetchProspectDirectoryAll(supabase, yearFilterToApiParams("active"))

    /*
     * Achievements come from the tables that hold them, not from JSON on the athlete row.
     * The client used to derive these itself from `state_results` — a column that does not
     * exist — so filtering by "State Champion" returned two wrestlers out of 261. It is 37.
     */
    const facts = await loadAchievements(
      supabase,
      (initialProspects as Array<{ id: string; name?: string | null }>).map((p) => ({ id: p.id, name: p.name })),
    )
    initialProspects = (initialProspects as Array<Record<string, unknown>>).map((p) => ({
      ...p,
      achievement_facts: facts.get(String(p.id)) ?? {},
      achievement_level: highestAchievement(facts.get(String(p.id)) ?? {}).level,
    })) as unknown as typeof initialProspects
  } catch (error) {
    console.error("[prospects/all] SSR prefetch failed:", error)
  }

  return <ProspectsAllClient initialProspects={initialProspects as never[]} />
}
