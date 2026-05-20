import type { SupabaseClient } from "@supabase/supabase-js"
import {
  NHSCA_DUALS_EVENT_KEY,
  type NhscaDualsDualRow,
  type NhscaDualsMatchRow,
  type NhscaDualsMatchWinner,
  type NhscaDualsResultType,
  type NhscaDualsResultsSnapshot,
  type NhscaDualsTeamType,
} from "./types"
import { NHSCA_DUALS_WEIGHTS, computeMatchPoints, sumDualScores, toDisplayWeight } from "./scoring"
import { buildTeamSummary } from "./summaries"
import {
  NHSCA_DUALS_DAY_1_NAME,
  NHSCA_DUALS_NATIONAL_INITIAL_DUALS,
  NHSCA_DUALS_NATIONAL_POOL,
  NHSCA_DUALS_NATIONAL_ROSTER,
  NHSCA_DUALS_NATIONAL_TEAM_LABEL,
  NHSCA_DUALS_SELECT_INITIAL_DUALS,
  NHSCA_DUALS_SELECT_POOL,
  NHSCA_DUALS_SELECT_ROSTER,
  NHSCA_DUALS_SELECT_TEAM_LABEL,
} from "./rosters"

const TABLES_MISSING = "nhsca_duals_tables_missing"

function isMissingTableError(err: { message?: string; code?: string } | null): boolean {
  if (!err) return false
  const msg = (err.message ?? "").toLowerCase()
  return err.code === "42P01" || msg.includes("does not exist") || msg.includes("relation")
}

export async function fetchNhscaDualsSnapshot(
  admin: SupabaseClient
): Promise<{ ok: true; data: NhscaDualsResultsSnapshot } | { ok: false; code: typeof TABLES_MISSING }> {
  const [teamsRes, wrestlersRes, daysRes, poolsRes, dualsRes, matchesRes] = await Promise.all([
    admin.from("nhsca_duals_teams").select("id, name, team_type").eq("event_key", NHSCA_DUALS_EVENT_KEY),
    admin.from("nhsca_duals_wrestlers").select("id, team_id, name, weight_class, display_weight, active"),
    admin.from("nhsca_duals_event_days").select("id, name, event_date, sort_order").eq("event_key", NHSCA_DUALS_EVENT_KEY).order("sort_order"),
    admin.from("nhsca_duals_pools").select("id, day_id, team_id, pool_number"),
    admin
      .from("nhsca_duals_duals")
      .select(
        "id, team_id, day_id, pool_id, round_name, opponent_team_name, status, nc_score, opponent_score, sort_order, published"
      )
      .order("sort_order"),
    admin.from("nhsca_duals_matches").select("*"),
  ])

  const err =
    teamsRes.error ?? wrestlersRes.error ?? daysRes.error ?? poolsRes.error ?? dualsRes.error ?? matchesRes.error
  if (isMissingTableError(err)) return { ok: false, code: TABLES_MISSING }

  const teams = (teamsRes.data ?? []) as NhscaDualsResultsSnapshot["teams"]
  const wrestlers = (wrestlersRes.data ?? []) as NhscaDualsResultsSnapshot["wrestlers"]
  const days = (daysRes.data ?? []).map((d) => ({
    ...d,
    event_date: d.event_date as string | null,
  })) as NhscaDualsResultsSnapshot["days"]
  const pools = (poolsRes.data ?? []) as NhscaDualsResultsSnapshot["pools"]
  const duals = (dualsRes.data ?? []) as NhscaDualsDualRow[]
  const matches = (matchesRes.data ?? []) as NhscaDualsMatchRow[]

  const nationalTeam = teams.find((t) => t.team_type === "national")
  const selectTeam = teams.find((t) => t.team_type === "select")

  const summaries = {
    national: nationalTeam
      ? buildTeamSummary(nationalTeam.id, duals, matches, wrestlers)
      : buildTeamSummary("", [], [], []),
    select: selectTeam
      ? buildTeamSummary(selectTeam.id, duals, matches, wrestlers)
      : buildTeamSummary("", [], [], []),
  }

  return {
    ok: true,
    data: { teams, wrestlers, days, pools, duals, matches, summaries },
  }
}

async function ensureMatchRows(
  admin: SupabaseClient,
  dualId: string,
  teamId: string,
  wrestlers: { id: string; display_weight: string; team_id: string }[]
) {
  const { data: existing } = await admin.from("nhsca_duals_matches").select("weight").eq("dual_id", dualId)
  const have = new Set((existing ?? []).map((r) => r.weight))
  const teamWrestlers = wrestlers.filter((w) => w.team_id === teamId)

  const defaultByWeight = new Map<string, string>()
  for (const w of teamWrestlers) {
    if (!defaultByWeight.has(w.display_weight)) defaultByWeight.set(w.display_weight, w.id)
  }

  const inserts = NHSCA_DUALS_WEIGHTS.filter((wt) => !have.has(wt)).map((weight) => ({
    dual_id: dualId,
    weight,
    nc_wrestler_id: defaultByWeight.get(weight) ?? null,
    opponent_wrestler_name: "",
  }))
  if (inserts.length) await admin.from("nhsca_duals_matches").insert(inserts)
}

async function ensureTeamRosters(
  admin: SupabaseClient,
  natTeamId: string,
  selTeamId: string
): Promise<{ id: string; team_id: string; display_weight: string }[]> {
  const { data: existing } = await admin
    .from("nhsca_duals_wrestlers")
    .select("id, team_id, display_weight")
    .in("team_id", [natTeamId, selTeamId])

  if ((existing ?? []).length > 0) {
    return existing as { id: string; team_id: string; display_weight: string }[]
  }

  const wrestlerInserts: { team_id: string; name: string; weight_class: string; display_weight: string }[] = []
  for (const r of NHSCA_DUALS_NATIONAL_ROSTER) {
    wrestlerInserts.push({
      team_id: natTeamId,
      name: r.name,
      weight_class: r.weightClass,
      display_weight: toDisplayWeight(r.weightClass),
    })
  }
  for (const r of NHSCA_DUALS_SELECT_ROSTER) {
    wrestlerInserts.push({
      team_id: selTeamId,
      name: r.name,
      weight_class: r.weightClass,
      display_weight: toDisplayWeight(r.weightClass),
    })
  }
  const { data: inserted } = await admin.from("nhsca_duals_wrestlers").insert(wrestlerInserts).select("id, team_id, display_weight")
  return (inserted ?? []) as { id: string; team_id: string; display_weight: string }[]
}

async function ensureDay1Pool(
  admin: SupabaseClient,
  dayId: string,
  teamId: string,
  poolNumber: number
): Promise<string | null> {
  const { data: existing } = await admin
    .from("nhsca_duals_pools")
    .select("id")
    .eq("day_id", dayId)
    .eq("team_id", teamId)
    .eq("pool_number", poolNumber)
    .maybeSingle()
  if (existing?.id) return existing.id as string

  const { data: created } = await admin
    .from("nhsca_duals_pools")
    .insert({ day_id: dayId, team_id: teamId, pool_number: poolNumber })
    .select("id")
    .single()
  return (created?.id as string) ?? null
}

async function ensureScheduledDual(
  admin: SupabaseClient,
  input: {
    team_id: string
    day_id: string
    pool_id: string
    round_name: string
    opponent_team_name: string
    sort_order: number
    wrestlers: { id: string; team_id: string; display_weight: string }[]
  }
): Promise<void> {
  const { data: existing } = await admin
    .from("nhsca_duals_duals")
    .select("id")
    .eq("team_id", input.team_id)
    .eq("day_id", input.day_id)
    .eq("round_name", input.round_name)
    .eq("opponent_team_name", input.opponent_team_name)
    .maybeSingle()

  let dualId = existing?.id as string | undefined
  if (!dualId) {
    const { data: dual } = await admin
      .from("nhsca_duals_duals")
      .insert({
        team_id: input.team_id,
        day_id: input.day_id,
        pool_id: input.pool_id,
        round_name: input.round_name,
        opponent_team_name: input.opponent_team_name,
        sort_order: input.sort_order,
      })
      .select("id")
      .single()
    dualId = dual?.id as string | undefined
  }
  if (dualId) {
    await ensureMatchRows(
      admin,
      dualId,
      input.team_id,
      input.wrestlers.filter((w) => w.team_id === input.team_id)
    )
  }
}

/** Creates teams + rosters when missing (first-time setup). */
export async function seedNhscaDualsIfEmpty(admin: SupabaseClient): Promise<void> {
  const { count } = await admin
    .from("nhsca_duals_teams")
    .select("id", { count: "exact", head: true })
    .eq("event_key", NHSCA_DUALS_EVENT_KEY)
  if ((count ?? 0) > 0) return

  const { data: natTeam } = await admin
    .from("nhsca_duals_teams")
    .insert({ name: NHSCA_DUALS_NATIONAL_TEAM_LABEL, team_type: "national", event_key: NHSCA_DUALS_EVENT_KEY })
    .select("id")
    .single()
  const { data: selTeam } = await admin
    .from("nhsca_duals_teams")
    .insert({ name: NHSCA_DUALS_SELECT_TEAM_LABEL, team_type: "select", event_key: NHSCA_DUALS_EVENT_KEY })
    .select("id")
    .single()
  if (!natTeam?.id || !selTeam?.id) return

  await ensureTeamRosters(admin, natTeam.id, selTeam.id)
}

/**
 * Idempotent Day 1 schedule from lib/nhsca-duals-live-results/rosters.ts.
 * Admins do not add days/pools/duals in the UI — Day 2+ is added in code.
 */
export async function ensureNhscaDualsDay1Schedule(admin: SupabaseClient): Promise<void> {
  const { data: teams } = await admin
    .from("nhsca_duals_teams")
    .select("id, team_type")
    .eq("event_key", NHSCA_DUALS_EVENT_KEY)
  const natTeam = teams?.find((t) => t.team_type === "national")
  const selTeam = teams?.find((t) => t.team_type === "select")
  if (!natTeam?.id || !selTeam?.id) return

  const wrestlers = await ensureTeamRosters(admin, natTeam.id, selTeam.id)

  let dayId: string | null = null
  const { data: dayRow } = await admin
    .from("nhsca_duals_event_days")
    .select("id")
    .eq("event_key", NHSCA_DUALS_EVENT_KEY)
    .eq("name", NHSCA_DUALS_DAY_1_NAME)
    .maybeSingle()
  dayId = (dayRow?.id as string) ?? null
  if (!dayId) {
    const { data: day } = await admin
      .from("nhsca_duals_event_days")
      .insert({ event_key: NHSCA_DUALS_EVENT_KEY, name: NHSCA_DUALS_DAY_1_NAME, sort_order: 1 })
      .select("id")
      .single()
    dayId = (day?.id as string) ?? null
  }
  if (!dayId) return

  const natPoolId = await ensureDay1Pool(admin, dayId, natTeam.id, NHSCA_DUALS_NATIONAL_POOL)
  const selPoolId = await ensureDay1Pool(admin, dayId, selTeam.id, NHSCA_DUALS_SELECT_POOL)
  if (!natPoolId || !selPoolId) return

  for (let i = 0; i < NHSCA_DUALS_NATIONAL_INITIAL_DUALS.length; i++) {
    const d = NHSCA_DUALS_NATIONAL_INITIAL_DUALS[i]
    await ensureScheduledDual(admin, {
      team_id: natTeam.id,
      day_id: dayId,
      pool_id: natPoolId,
      round_name: d.round,
      opponent_team_name: d.opponent,
      sort_order: i + 1,
      wrestlers,
    })
  }

  for (let i = 0; i < NHSCA_DUALS_SELECT_INITIAL_DUALS.length; i++) {
    const d = NHSCA_DUALS_SELECT_INITIAL_DUALS[i]
    await ensureScheduledDual(admin, {
      team_id: selTeam.id,
      day_id: dayId,
      pool_id: selPoolId,
      round_name: d.round,
      opponent_team_name: d.opponent,
      sort_order: i + 1,
      wrestlers,
    })
  }
}

export async function bootstrapNhscaDualsEvent(admin: SupabaseClient): Promise<void> {
  await seedNhscaDualsIfEmpty(admin)
  await ensureNhscaDualsDay1Schedule(admin)
}

export async function saveNhscaDualsMatch(
  admin: SupabaseClient,
  input: {
    matchId: string
    nc_wrestler_id?: string | null
    opponent_wrestler_name?: string
    notes?: string | null
    winner?: NhscaDualsMatchWinner | null
    result_type?: NhscaDualsResultType | null
  }
): Promise<{ ok: boolean; error?: string }> {
  const { data: match, error: fetchErr } = await admin
    .from("nhsca_duals_matches")
    .select("id, dual_id, winner, result_type")
    .eq("id", input.matchId)
    .single()
  if (fetchErr || !match) return { ok: false, error: fetchErr?.message ?? "Match not found" }

  const winner = (input.winner ?? match.winner) as NhscaDualsMatchWinner | null
  const result_type = (input.result_type ?? match.result_type) as NhscaDualsResultType | null
  const { nc_points, opponent_points } = computeMatchPoints(winner, result_type)

  const patch: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
    nc_points,
    opponent_points,
  }
  if (input.nc_wrestler_id !== undefined) patch.nc_wrestler_id = input.nc_wrestler_id
  if (input.opponent_wrestler_name !== undefined) patch.opponent_wrestler_name = input.opponent_wrestler_name
  if (input.notes !== undefined) patch.notes = input.notes
  if (input.winner !== undefined) patch.winner = input.winner
  if (input.result_type !== undefined) patch.result_type = input.result_type

  const { error: updErr } = await admin.from("nhsca_duals_matches").update(patch).eq("id", input.matchId)
  if (updErr) return { ok: false, error: updErr.message }

  await refreshDualScores(admin, match.dual_id)
  return { ok: true }
}

export async function refreshDualScores(admin: SupabaseClient, dualId: string): Promise<void> {
  const { data: dual } = await admin.from("nhsca_duals_duals").select("status").eq("id", dualId).single()
  const { data: matches } = await admin.from("nhsca_duals_matches").select("nc_points, opponent_points").eq("dual_id", dualId)
  const scores = sumDualScores((matches ?? []) as { nc_points: number; opponent_points: number }[])
  const hasAny = (matches ?? []).some((m) => (m.nc_points ?? 0) + (m.opponent_points ?? 0) > 0)
  const keepFinal = dual?.status === "final"
  const status = keepFinal ? "final" : hasAny ? "in_progress" : "not_started"
  await admin
    .from("nhsca_duals_duals")
    .update({
      nc_score: scores.nc_score,
      opponent_score: scores.opponent_score,
      status,
      updated_at: new Date().toISOString(),
    })
    .eq("id", dualId)
}

export async function setDualStatus(
  admin: SupabaseClient,
  dualId: string,
  status: "not_started" | "in_progress" | "final"
): Promise<{ ok: boolean; error?: string }> {
  const { error } = await admin
    .from("nhsca_duals_duals")
    .update({ status, updated_at: new Date().toISOString() })
    .eq("id", dualId)
  return error ? { ok: false, error: error.message } : { ok: true }
}

export async function createEventDay(admin: SupabaseClient, name: string): Promise<{ ok: boolean; id?: string; error?: string }> {
  const { data: max } = await admin
    .from("nhsca_duals_event_days")
    .select("sort_order")
    .eq("event_key", NHSCA_DUALS_EVENT_KEY)
    .order("sort_order", { ascending: false })
    .limit(1)
    .maybeSingle()
  const sort_order = ((max?.sort_order as number) ?? 0) + 1
  const { data, error } = await admin
    .from("nhsca_duals_event_days")
    .insert({ event_key: NHSCA_DUALS_EVENT_KEY, name, sort_order })
    .select("id")
    .single()
  return error ? { ok: false, error: error.message } : { ok: true, id: data?.id }
}

export async function createPool(
  admin: SupabaseClient,
  dayId: string,
  teamId: string,
  poolNumber: number
): Promise<{ ok: boolean; id?: string; error?: string }> {
  const { data, error } = await admin
    .from("nhsca_duals_pools")
    .insert({ day_id: dayId, team_id: teamId, pool_number: poolNumber })
    .select("id")
    .single()
  return error ? { ok: false, error: error.message } : { ok: true, id: data?.id }
}

export async function createDual(
  admin: SupabaseClient,
  input: {
    team_id: string
    day_id: string
    pool_id: string
    round_name: string
    opponent_team_name: string
  }
): Promise<{ ok: boolean; id?: string; error?: string }> {
  const { data: max } = await admin
    .from("nhsca_duals_duals")
    .select("sort_order")
    .eq("team_id", input.team_id)
    .order("sort_order", { ascending: false })
    .limit(1)
    .maybeSingle()
  const sort_order = ((max?.sort_order as number) ?? 0) + 1
  const { data, error } = await admin
    .from("nhsca_duals_duals")
    .insert({ ...input, sort_order })
    .select("id, team_id")
    .single()
  if (error || !data?.id) return { ok: false, error: error?.message ?? "Failed" }

  const { data: wrestlers } = await admin.from("nhsca_duals_wrestlers").select("id, team_id, display_weight").eq("team_id", data.team_id)
  await ensureMatchRows(admin, data.id, data.team_id, wrestlers ?? [])
  return { ok: true, id: data.id }
}

export async function updateDualMeta(
  admin: SupabaseClient,
  dualId: string,
  patch: { round_name?: string; opponent_team_name?: string; pool_id?: string; day_id?: string }
): Promise<{ ok: boolean; error?: string }> {
  const { error } = await admin
    .from("nhsca_duals_duals")
    .update({ ...patch, updated_at: new Date().toISOString() })
    .eq("id", dualId)
  return error ? { ok: false, error: error.message } : { ok: true }
}

const CLEARED_MATCH_PATCH = {
  winner: null,
  result_type: null,
  nc_points: 0,
  opponent_points: 0,
  opponent_wrestler_name: "",
  notes: null,
}

export async function clearMatchResult(
  admin: SupabaseClient,
  matchId: string
): Promise<{ ok: boolean; error?: string }> {
  const { data: match, error: fetchErr } = await admin
    .from("nhsca_duals_matches")
    .select("dual_id")
    .eq("id", matchId)
    .single()
  if (fetchErr || !match) return { ok: false, error: fetchErr?.message ?? "Match not found" }

  const { error } = await admin
    .from("nhsca_duals_matches")
    .update({ ...CLEARED_MATCH_PATCH, updated_at: new Date().toISOString() })
    .eq("id", matchId)
  if (error) return { ok: false, error: error.message }

  await refreshDualScores(admin, match.dual_id)
  return { ok: true }
}

export async function clearDualResults(
  admin: SupabaseClient,
  dualId: string
): Promise<{ ok: boolean; error?: string }> {
  const { error: matchErr } = await admin
    .from("nhsca_duals_matches")
    .update({ ...CLEARED_MATCH_PATCH, updated_at: new Date().toISOString() })
    .eq("dual_id", dualId)
  if (matchErr) return { ok: false, error: matchErr.message }

  const { error: dualErr } = await admin
    .from("nhsca_duals_duals")
    .update({
      nc_score: 0,
      opponent_score: 0,
      status: "not_started",
      updated_at: new Date().toISOString(),
    })
    .eq("id", dualId)
  return dualErr ? { ok: false, error: dualErr.message } : { ok: true }
}

export async function deleteDual(
  admin: SupabaseClient,
  dualId: string
): Promise<{ ok: boolean; error?: string }> {
  const { error } = await admin.from("nhsca_duals_duals").delete().eq("id", dualId)
  return error ? { ok: false, error: error.message } : { ok: true }
}

/** Remove admin test duals (e.g. Day 2 vs "test") and empty non–Day 1 event days. */
export async function pruneNhscaDualsTestDuals(admin: SupabaseClient): Promise<void> {
  const { data: teams } = await admin
    .from("nhsca_duals_teams")
    .select("id")
    .eq("event_key", NHSCA_DUALS_EVENT_KEY)
  const teamIds = (teams ?? []).map((t) => t.id as string)
  if (!teamIds.length) return

  const { data: testDuals } = await admin
    .from("nhsca_duals_duals")
    .select("id")
    .in("team_id", teamIds)
    .ilike("opponent_team_name", "test")

  for (const d of testDuals ?? []) {
    await deleteDual(admin, d.id as string)
  }

  const { data: days } = await admin
    .from("nhsca_duals_event_days")
    .select("id, name")
    .eq("event_key", NHSCA_DUALS_EVENT_KEY)

  for (const day of days ?? []) {
    if (day.name === NHSCA_DUALS_DAY_1_NAME) continue
    const { count } = await admin
      .from("nhsca_duals_duals")
      .select("id", { count: "exact", head: true })
      .eq("day_id", day.id)
    if ((count ?? 0) > 0) continue
    await admin.from("nhsca_duals_pools").delete().eq("day_id", day.id)
    await admin.from("nhsca_duals_event_days").delete().eq("id", day.id)
  }
}

/** Testing: wipe scores on every dual for this event (keeps duals / structure). */
export async function resetAllEventMatchResults(admin: SupabaseClient): Promise<{ ok: boolean; error?: string }> {
  const { data: teams, error: teamErr } = await admin
    .from("nhsca_duals_teams")
    .select("id")
    .eq("event_key", NHSCA_DUALS_EVENT_KEY)
  if (teamErr) return { ok: false, error: teamErr.message }
  const teamIds = (teams ?? []).map((t) => t.id as string)
  if (!teamIds.length) return { ok: true }

  const { data: duals, error: dualErr } = await admin.from("nhsca_duals_duals").select("id").in("team_id", teamIds)
  if (dualErr) return { ok: false, error: dualErr.message }

  for (const d of duals ?? []) {
    const r = await clearDualResults(admin, d.id as string)
    if (!r.ok) return r
  }
  return { ok: true }
}

/** Testing: remove all dual meets (matches cascade); rosters/days/pools remain. */
export async function deleteAllEventDuals(admin: SupabaseClient): Promise<{ ok: boolean; error?: string }> {
  const { data: teams, error: teamErr } = await admin
    .from("nhsca_duals_teams")
    .select("id")
    .eq("event_key", NHSCA_DUALS_EVENT_KEY)
  if (teamErr) return { ok: false, error: teamErr.message }
  const teamIds = (teams ?? []).map((t) => t.id as string)
  if (!teamIds.length) return { ok: true }

  const { error } = await admin.from("nhsca_duals_duals").delete().in("team_id", teamIds)
  return error ? { ok: false, error: error.message } : { ok: true }
}

/** First pool for team+day, or create pool 1 on that day. */
export async function ensurePoolForTeamDay(
  admin: SupabaseClient,
  dayId: string,
  teamId: string,
  poolNumber = 1
): Promise<{ ok: boolean; id?: string; error?: string }> {
  const { data: existing } = await admin
    .from("nhsca_duals_pools")
    .select("id")
    .eq("day_id", dayId)
    .eq("team_id", teamId)
    .order("pool_number", { ascending: true })
    .limit(1)
    .maybeSingle()
  if (existing?.id) return { ok: true, id: existing.id as string }
  return createPool(admin, dayId, teamId, poolNumber)
}

export async function createDualForTeam(
  admin: SupabaseClient,
  input: {
    team_id: string
    day_id: string
    opponent_team_name: string
    round_name: string
    pool_number?: number
  }
): Promise<{ ok: boolean; id?: string; error?: string }> {
  const pool = await ensurePoolForTeamDay(admin, input.day_id, input.team_id, input.pool_number ?? 1)
  if (!pool.ok || !pool.id) return { ok: false, error: pool.error ?? "Could not resolve pool" }
  return createDual(admin, {
    team_id: input.team_id,
    day_id: input.day_id,
    pool_id: pool.id,
    round_name: input.round_name,
    opponent_team_name: input.opponent_team_name.trim() || "Opponent",
  })
}

export function teamTypeFromId(
  teams: { id: string; team_type: string }[],
  teamId: string
): NhscaDualsTeamType | null {
  const t = teams.find((x) => x.id === teamId)
  return (t?.team_type as NhscaDualsTeamType) ?? null
}

export { TABLES_MISSING }
