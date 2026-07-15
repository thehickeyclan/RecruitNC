import type { SupabaseClient } from "@supabase/supabase-js"
import type {
  ClassificationProposed,
  DualTeamProposed,
  FargoBoutProposed,
  FargoProposed,
  PlacerProposed,
} from "./types"
import {
  DATASET_CLASSIFICATIONS,
  DATASET_DUAL_TEAM,
  DATASET_FARGO,
  DATASET_FARGO_BOUTS,
  DATASET_PLACERS,
} from "./types"
import {
  canonicalizeWrestlerName,
  classificationSchoolsEqual,
  dualNaturalKey,
  fargoBoutNaturalKey,
  fargoNaturalKey,
  namesLooselyEqual,
  placerNaturalKey,
  uniqueClassificationLastTokens,
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

function normalizePromoteWeight(weight: string): string {
  const digits = String(weight ?? "")
    .trim()
    .match(/(\d{2,3})/)
  return digits?.[1] ?? String(weight ?? "").trim()
}

export async function promotePlacerRow(
  admin: SupabaseClient,
  proposed: PlacerProposed,
): Promise<void> {
  const canonicalName = canonicalizeWrestlerName(proposed.wrestler_name)
  const weightClass = normalizePromoteWeight(proposed.weight_class)

  const { data: byPlace, error: selErr } = await admin
    .from("wrestling_nchsaa_results")
    .select("id, wrestler_name, school, place")
    .eq("year", proposed.year)
    .eq("classification", proposed.classification)
    .eq("weight_class", weightClass)
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
    .eq("weight_class", weightClass)
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

  // Wrong athlete already occupies this place slot (legacy lbs / bad import) — replace.
  const soleOccupant = (byPlace ?? []).length === 1 ? byPlace![0] : null
  if (soleOccupant?.id) {
    const { error } = await admin
      .from("wrestling_nchsaa_results")
      .update({
        place: proposed.place,
        wrestler_name: canonicalName,
        school: proposed.school,
      })
      .eq("id", soleOccupant.id)
    if (error) throw new Error(error.message)
    return
  }

  const { error } = await admin.from("wrestling_nchsaa_results").insert({
    year: proposed.year,
    classification: proposed.classification,
    weight_class: weightClass,
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

  const { data: yearAll, error: yearSelErr } = await admin
    .from("school_classification_years")
    .select("id, school_name")
    .eq("effective_year", proposed.effective_year)

  if (yearSelErr) {
    if (/does not exist|schema cache|42P01/i.test(yearSelErr.message)) {
      throw new Error(
        "Run scripts/school-classification-years-setup.sql in Supabase SQL Editor, then retry.",
      )
    }
    throw new Error(yearSelErr.message)
  }

  const yearUnique = uniqueClassificationLastTokens([
    proposed.school_name,
    ...(yearAll ?? []).map((r) => String(r.school_name ?? "")),
  ])
  const yearTarget =
    (yearAll ?? []).find((r) =>
      classificationSchoolsEqual(r.school_name, proposed.school_name, yearUnique),
    ) ?? null

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

  const { data: currentAll, error: curSelErr } = await admin
    .from("school_classifications")
    .select("id, school_name")

  if (curSelErr) throw new Error(curSelErr.message)

  const currentUnique = uniqueClassificationLastTokens([
    proposed.school_name,
    ...(currentAll ?? []).map((r) => String(r.school_name ?? "")),
  ])
  const currentTarget =
    (currentAll ?? []).find((r) =>
      classificationSchoolsEqual(r.school_name, proposed.school_name, currentUnique),
    ) ?? null

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

export async function promoteFargoRow(
  admin: SupabaseClient,
  proposed: FargoProposed,
): Promise<void> {
  const athlete_name = canonicalizeWrestlerName(proposed.athlete_name)
  const payload = {
    year: proposed.year,
    athlete_name,
    first_name: proposed.first_name ?? null,
    last_name: proposed.last_name ?? null,
    division: proposed.division,
    style: proposed.style,
    gender: proposed.gender,
    age_division: proposed.age_division,
    weight_class: proposed.weight_class,
    wins: proposed.wins,
    losses: proposed.losses,
    record: proposed.record ?? `${proposed.wins}-${proposed.losses}`,
    placement: proposed.placement ?? null,
    is_all_american: proposed.is_all_american,
    high_school: proposed.high_school ?? null,
    state: proposed.state ?? "NC",
    club: proposed.club ?? null,
    notes: proposed.notes ?? null,
    event_name: proposed.event_name ?? "US Marine Corps National Championships (Fargo)",
    source_url: proposed.source_url ?? null,
    source_label: proposed.source_label ?? null,
    athlete_id: proposed.athlete_id ?? null,
    verification_status: "staged",
    retrieved_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }

  const { data: existing, error: selErr } = await admin
    .from("fargo_results")
    .select(
      "id, athlete_name, verification_status, wins, losses, placement, is_all_american, high_school",
    )
    .eq("year", proposed.year)
    .eq("style", proposed.style)
    .eq("age_division", proposed.age_division)
    .eq("gender", proposed.gender)
    .eq("weight_class", proposed.weight_class)
    .ilike("athlete_name", athlete_name)
    .limit(5)

  if (selErr) {
    if (/column .* does not exist|42703|schema cache/i.test(selErr.message)) {
      throw new Error(
        "Run scripts/fargo-results-harden-setup.sql in Supabase SQL Editor (adds style/gender/age_division), then retry.",
      )
    }
    throw new Error(selErr.message)
  }

  const target =
    (existing ?? []).find((r) => namesLooselyEqual(r.athlete_name, athlete_name)) ?? null

  if (target?.id) {
    if (String(target.verification_status ?? "") === "verified") {
      throw new Error(
        `Refusing to overwrite verified Fargo row (${fargoNaturalKey(
          proposed.year,
          proposed.style,
          proposed.age_division,
          proposed.gender,
          proposed.weight_class,
          athlete_name,
        )}). Clear verification_status first if correction is intended.`,
      )
    }
    const { error } = await admin.from("fargo_results").update(payload).eq("id", target.id)
    if (error) throw new Error(error.message)
    return
  }

  const { error } = await admin.from("fargo_results").insert(payload)
  if (error) {
    if (/column .* does not exist|42703|schema cache/i.test(error.message)) {
      throw new Error(
        "Run scripts/fargo-results-harden-setup.sql in Supabase SQL Editor (adds style/gender/age_division), then retry.",
      )
    }
    throw new Error(error.message)
  }
}

export async function promoteFargoBoutRow(
  admin: SupabaseClient,
  proposed: FargoBoutProposed,
): Promise<void> {
  const athlete_name = canonicalizeWrestlerName(proposed.athlete_name)
  const opponent_name = proposed.opponent_name
    ? canonicalizeWrestlerName(proposed.opponent_name)
    : null
  const payload = {
    year: proposed.year,
    style: proposed.style,
    gender: proposed.gender,
    age_division: proposed.age_division,
    weight_class: proposed.weight_class,
    athlete_name,
    athlete_id: proposed.athlete_id ?? null,
    athlete_state: proposed.athlete_state ?? null,
    athlete_club: proposed.athlete_club ?? null,
    opponent_name,
    opponent_state: proposed.opponent_state ?? null,
    opponent_club: proposed.opponent_club ?? null,
    round: proposed.round ?? null,
    result_type: proposed.result_type ?? null,
    score: proposed.score ?? null,
    win: proposed.win,
    match_order: proposed.match_order ?? null,
    source_event_id: proposed.source_event_id ?? null,
    source_bracket_id: proposed.source_bracket_id ?? null,
    source_match_id: proposed.source_match_id ?? null,
    source_url: proposed.source_url ?? null,
    source_adapter: proposed.source_adapter ?? null,
    source_payload: proposed.source_payload ?? null,
    verification_status: "staged",
    retrieved_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }

  let q = admin
    .from("fargo_bouts")
    .select("id, athlete_name, verification_status")
    .eq("year", proposed.year)
    .eq("style", proposed.style)
    .eq("age_division", proposed.age_division)
    .eq("gender", proposed.gender)
    .eq("weight_class", proposed.weight_class)
    .ilike("athlete_name", athlete_name)
    .limit(20)

  if (proposed.source_match_id) {
    q = q.eq("source_match_id", proposed.source_match_id)
  } else if (opponent_name) {
    q = q.ilike("opponent_name", opponent_name)
  }

  const { data: existing, error: selErr } = await q
  if (selErr) {
    if (/does not exist|42P01|42703|schema cache/i.test(selErr.message)) {
      throw new Error(
        "Run scripts/fargo-results-harden-setup.sql and scripts/fargo-bouts-full-setup.sql in Supabase, then retry.",
      )
    }
    throw new Error(selErr.message)
  }

  const target =
    (existing ?? []).find((r) => namesLooselyEqual(r.athlete_name, athlete_name)) ?? null

  if (target?.id) {
    if (String(target.verification_status ?? "") === "verified") {
      throw new Error(
        `Refusing to overwrite verified Fargo bout (${fargoBoutNaturalKey(
          proposed.year,
          proposed.style,
          proposed.age_division,
          proposed.gender,
          proposed.weight_class,
          athlete_name,
          proposed.source_match_id,
          proposed.match_order ?? null,
          opponent_name,
        )})`,
      )
    }
    const { error } = await admin.from("fargo_bouts").update(payload).eq("id", target.id)
    if (error) throw new Error(error.message)
    return
  }

  const { error } = await admin.from("fargo_bouts").insert(payload)
  if (error) {
    if (/does not exist|42P01|42703|schema cache/i.test(error.message)) {
      throw new Error(
        "Run scripts/fargo-results-harden-setup.sql and scripts/fargo-bouts-full-setup.sql in Supabase, then retry.",
      )
    }
    throw new Error(error.message)
  }
}

export async function promoteStagedRow(
  admin: SupabaseClient,
  datasetKey: string,
  proposed:
    | DualTeamProposed
    | PlacerProposed
    | ClassificationProposed
    | FargoProposed
    | FargoBoutProposed,
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
  if (datasetKey === DATASET_FARGO) {
    await promoteFargoRow(admin, proposed as FargoProposed)
    return
  }
  if (datasetKey === DATASET_FARGO_BOUTS) {
    await promoteFargoBoutRow(admin, proposed as FargoBoutProposed)
    return
  }
  throw new Error(`Unknown dataset_key: ${datasetKey}`)
}

export { dualNaturalKey, placerNaturalKey, fargoNaturalKey, fargoBoutNaturalKey }
