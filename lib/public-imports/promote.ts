import type { SupabaseClient } from "@supabase/supabase-js"
import type { DualTeamProposed, PlacerProposed } from "./types"
import { DATASET_DUAL_TEAM, DATASET_PLACERS } from "./types"
import { dualNaturalKey, placerNaturalKey } from "./normalize"

export async function promoteDualRow(
  admin: SupabaseClient,
  proposed: DualTeamProposed,
): Promise<void> {
  const payload = {
    year: proposed.year,
    division: proposed.division,
    champion_school: proposed.champion_school,
    runner_up_school: proposed.runner_up_school ?? null,
    champion_score: proposed.champion_score ?? null,
    runner_up_score: proposed.runner_up_score ?? null,
    is_vacated: proposed.is_vacated ?? false,
    held: proposed.held ?? true,
    notes: proposed.notes ?? null,
  }

  const { data: existing, error: selErr } = await admin
    .from("dual_team_champions")
    .select("id")
    .eq("year", proposed.year)
    .eq("division", proposed.division)
    .limit(1)

  if (selErr) throw new Error(selErr.message)

  if (existing?.[0]?.id) {
    const { error } = await admin
      .from("dual_team_champions")
      .update(payload)
      .eq("id", existing[0].id)
    if (error) throw new Error(error.message)
    return
  }

  const { error } = await admin.from("dual_team_champions").insert(payload)
  if (error) throw new Error(error.message)
}

export async function promotePlacerRow(
  admin: SupabaseClient,
  proposed: PlacerProposed,
): Promise<void> {
  const payload = {
    year: proposed.year,
    classification: proposed.classification,
    weight_class: proposed.weight_class,
    place: proposed.place,
    wrestler_name: proposed.wrestler_name,
    school: proposed.school,
  }

  const { data: existing, error: selErr } = await admin
    .from("wrestling_nchsaa_results")
    .select("id")
    .eq("year", proposed.year)
    .eq("classification", proposed.classification)
    .eq("weight_class", proposed.weight_class)
    .eq("place", proposed.place)
    .limit(5)

  if (selErr) throw new Error(selErr.message)

  if (existing && existing.length === 1) {
    const { error } = await admin
      .from("wrestling_nchsaa_results")
      .update(payload)
      .eq("id", existing[0].id)
    if (error) throw new Error(error.message)
    return
  }

  if (existing && existing.length > 1) {
    throw new Error(
      `Multiple existing placer rows for ${placerNaturalKey(
        proposed.year,
        proposed.classification,
        proposed.weight_class,
        proposed.place,
      )}`,
    )
  }

  const { error } = await admin.from("wrestling_nchsaa_results").insert(payload)
  if (error) throw new Error(error.message)
}

export async function promoteStagedRow(
  admin: SupabaseClient,
  datasetKey: string,
  proposed: DualTeamProposed | PlacerProposed,
): Promise<void> {
  if (datasetKey === DATASET_DUAL_TEAM) {
    await promoteDualRow(admin, proposed as DualTeamProposed)
    return
  }
  if (datasetKey === DATASET_PLACERS) {
    await promotePlacerRow(admin, proposed as PlacerProposed)
    return
  }
  throw new Error(`Unknown dataset_key: ${datasetKey}`)
}

export { dualNaturalKey, placerNaturalKey }
