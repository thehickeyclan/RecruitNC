import type { SupabaseClient } from "@supabase/supabase-js"
import type { ClassificationProposed, DualTeamProposed, PlacerProposed } from "./types"
import { DATASET_CLASSIFICATIONS, DATASET_DUAL_TEAM, DATASET_PLACERS } from "./types"
import {
  canonicalizeWrestlerName,
  dualNaturalKey,
  namesLooselyEqual,
  placerNaturalKey,
  schoolsLooselyEqual,
} from "./normalize"

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
  const canonicalName = canonicalizeWrestlerName(proposed.wrestler_name)

  const { data: byPlace, error: selErr } = await admin
    .from("wrestling_nchsaa_results")
    .select("id, wrestler_name, school, place")
    .eq("year", proposed.year)
    .eq("classification", proposed.classification)
    .eq("weight_class", proposed.weight_class)
    .eq("place", proposed.place)
    .limit(20)

  if (selErr) throw new Error(selErr.message)

  // Never update a different athlete in the same class/weight/place (men vs women).
  const target = (byPlace ?? []).find((r) => namesLooselyEqual(r.wrestler_name, canonicalName))

  if (target?.id) {
    const keepName = namesLooselyEqual(target.wrestler_name, canonicalName)
      ? String(target.wrestler_name)
      : canonicalName
    const { error } = await admin
      .from("wrestling_nchsaa_results")
      .update({
        place: proposed.place,
        wrestler_name: keepName,
        school: proposed.school,
      })
      .eq("id", target.id)
    if (error) throw new Error(error.message)
    return
  }

  // Athlete may already exist as SQ (place 0) under a name / apostrophe variant.
  const { data: sameWeight, error: swErr } = await admin
    .from("wrestling_nchsaa_results")
    .select("id, wrestler_name, school, place")
    .eq("year", proposed.year)
    .eq("classification", proposed.classification)
    .eq("weight_class", proposed.weight_class)
    .limit(120)

  if (swErr) throw new Error(swErr.message)

  const sqOrNameHit = (sameWeight ?? []).find((r) =>
    namesLooselyEqual(r.wrestler_name, canonicalName),
  )
  if (sqOrNameHit?.id) {
    const { error } = await admin
      .from("wrestling_nchsaa_results")
      .update({
        place: proposed.place,
        wrestler_name: String(sqOrNameHit.wrestler_name),
        school: proposed.school || sqOrNameHit.school,
      })
      .eq("id", sqOrNameHit.id)
    if (error) throw new Error(error.message)
    return
  }

  const { error } = await admin.from("wrestling_nchsaa_results").insert({
    year: proposed.year,
    classification: proposed.classification,
    weight_class: proposed.weight_class,
    place: proposed.place,
    wrestler_name: canonicalName,
    school: proposed.school,
  })
  if (error) throw new Error(error.message)
}

export async function promoteClassificationRow(
  admin: SupabaseClient,
  proposed: ClassificationProposed,
): Promise<void> {
  const yearPayload = {
    school_name: proposed.school_name,
    classification: proposed.classification,
    region: proposed.region ?? null,
    conference: proposed.conference ?? null,
    enrollment: proposed.enrollment ?? null,
    effective_year: proposed.effective_year,
    cycle_label: proposed.cycle_label ?? null,
    updated_at: new Date().toISOString(),
  }

  const { data: yearHits, error: yearSelErr } = await admin
    .from("school_classification_years")
    .select("id, school_name")
    .eq("effective_year", proposed.effective_year)
    .ilike("school_name", `%${proposed.school_name.replace(/\s+(high\s+school|hs)$/i, "").trim()}%`)
    .limit(20)

  if (yearSelErr) {
    if (/does not exist|schema cache|42P01/i.test(yearSelErr.message)) {
      throw new Error(
        "Run scripts/school-classification-years-setup.sql in Supabase SQL Editor, then retry.",
      )
    }
    throw new Error(yearSelErr.message)
  }

  const yearTarget =
    (yearHits ?? []).find((r) => schoolsLooselyEqual(r.school_name, proposed.school_name)) ?? null

  if (yearTarget?.id) {
    const { error } = await admin
      .from("school_classification_years")
      .update(yearPayload)
      .eq("id", yearTarget.id)
    if (error) throw new Error(error.message)
  } else {
    const { error } = await admin.from("school_classification_years").insert(yearPayload)
    if (error) throw new Error(error.message)
  }

  const currentPayload = {
    school_name: proposed.school_name,
    classification: proposed.classification,
    region: proposed.region ?? null,
    conference: proposed.conference ?? null,
    enrollment: proposed.enrollment ?? null,
    effective_year: proposed.effective_year,
  }

  const clean = proposed.school_name.replace(/\s+(high\s+school|hs)$/i, "").trim()
  const { data: currentHits, error: curSelErr } = await admin
    .from("school_classifications")
    .select("id, school_name")
    .ilike("school_name", `%${clean}%`)
    .limit(20)

  if (curSelErr) throw new Error(curSelErr.message)

  const currentTarget =
    (currentHits ?? []).find((r) => schoolsLooselyEqual(r.school_name, proposed.school_name)) ??
    null

  if (currentTarget?.id) {
    const { error } = await admin
      .from("school_classifications")
      .update({
        ...currentPayload,
        school_name: String(currentTarget.school_name || proposed.school_name),
      })
      .eq("id", currentTarget.id)
    if (error) throw new Error(error.message)
    return
  }

  const { error } = await admin.from("school_classifications").upsert(currentPayload, {
    onConflict: "school_name",
  })
  if (error) throw new Error(error.message)
}

export async function promoteStagedRow(
  admin: SupabaseClient,
  datasetKey: string,
  proposed: DualTeamProposed | PlacerProposed | ClassificationProposed,
): Promise<void> {
  if (datasetKey === DATASET_DUAL_TEAM) {
    await promoteDualRow(admin, proposed as DualTeamProposed)
    return
  }
  if (datasetKey === DATASET_PLACERS) {
    await promotePlacerRow(admin, proposed as PlacerProposed)
    return
  }
  if (datasetKey === DATASET_CLASSIFICATIONS) {
    await promoteClassificationRow(admin, proposed as ClassificationProposed)
    return
  }
  throw new Error(`Unknown dataset_key: ${datasetKey}`)
}

export { dualNaturalKey, placerNaturalKey }
