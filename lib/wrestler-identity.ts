/**
 * One wrestler, however many ways the sources spell him.
 *
 * `athlete_identities` holds a row per real person and `identity_aliases` maps each (name, team)
 * a result store publishes to that person. Reading through them is what makes a record whole:
 * William Clanton and Will Clanton of New York are one wrestler with one record, and Nick Meza in
 * the brackets is Nicholas Meza in Arizona's placer list.
 *
 * Every function here degrades to null rather than throwing. An identity miss must look like "we
 * have no identity", never like "this wrestler has no record" — that confusion is what turned a
 * two-time NHSCA All-American into "I couldn't find any records" earlier.
 */
import type { SupabaseClient } from "@supabase/supabase-js"

export type WrestlerIdentity = {
  id: string
  canonicalName: string
  /** The spelling the placer store uses, which may be lower case. */
  placerName: string
  normalizedName: string
  state: string | null
  gender: "Male" | "Female" | null
  gradYear: number | null
  /** Our own recruiting profile, when this person has one. */
  athleteId: string | null
  confirmed: boolean
  /** Every (name, team) a result store publishes for this person, including the one asked for. */
  aliases: Array<{ name: string; team: string | null; source: string; status: string }>
}

const ALIAS_SELECT = "alias_name_raw, alias_team, source, status, identity_id"
const IDENTITY_SELECT =
  "id, canonical_name, normalized_name, state, gender, graduation_year, athlete_id, identity_confirmed"

/**
 * A name fit to print.
 *
 * The registry's canonical name is whichever spelling a source used most, and some sources are
 * lower case: Arizona's placer list says "nicholas meza", so a report built from the identity
 * would have printed the state champion's name in lower case. A spelling that carries capitals is
 * preferred, and failing that the words are capitalised.
 */
export function displayName(canonical: string, aliases: Array<{ name: string }>): string {
  const hasCaps = (s: string) => /[A-Z]/.test(s)
  if (hasCaps(canonical)) return canonical
  const cased = aliases.map((a) => a.name).find(hasCaps)
  if (cased) return cased
  return canonical
    .split(/\s+/)
    .map((w) => (w ? w[0].toUpperCase() + w.slice(1) : w))
    .join(" ")
}

function toIdentity(
  row: Record<string, unknown>,
  aliases: WrestlerIdentity["aliases"],
): WrestlerIdentity {
  const gender = row.gender === "Male" || row.gender === "Female" ? row.gender : null
  return {
    id: String(row.id),
    canonicalName: displayName(String(row.canonical_name ?? "").trim(), aliases),
    /** Exactly as the placer store spells it, for looking a placement back up. */
    placerName: String(row.canonical_name ?? "").trim(),
    normalizedName: String(row.normalized_name ?? "").trim(),
    state: row.state ? String(row.state) : null,
    gender,
    gradYear: row.graduation_year == null ? null : Number(row.graduation_year),
    athleteId: row.athlete_id ? String(row.athlete_id) : null,
    confirmed: Boolean(row.identity_confirmed),
    aliases,
  }
}

async function loadIdentityById(
  supabase: SupabaseClient,
  identityId: string,
): Promise<WrestlerIdentity | null> {
  const [identity, aliases] = await Promise.all([
    supabase.from("athlete_identities").select(IDENTITY_SELECT).eq("id", identityId).limit(1),
    supabase.from("identity_aliases").select(ALIAS_SELECT).eq("identity_id", identityId),
  ])
  if (identity.error || !identity.data?.length) return null
  const rows = (aliases.error ? [] : aliases.data ?? []) as Array<Record<string, unknown>>
  return toIdentity(identity.data[0] as Record<string, unknown>, rows.map((a) => ({
    name: String(a.alias_name_raw ?? "").trim(),
    team: a.alias_team ? String(a.alias_team) : null,
    source: String(a.source ?? ""),
    status: String(a.status ?? ""),
  })))
}

/**
 * The person a published (name, team) refers to.
 *
 * Tried in order of how much it proves: the exact alias with its team, the alias under any team,
 * then the registry's own name key. A `review` alias resolves too — it is a best guess the matcher
 * declined to confirm, and the caller is told via `confirmed` rather than left with nothing.
 */
export async function resolveWrestlerIdentity(
  supabase: SupabaseClient,
  name: string,
  team?: string | null,
): Promise<WrestlerIdentity | null> {
  const wanted = String(name ?? "").trim()
  if (wanted.length < 2) return null
  const teamCode = String(team ?? "").trim().toUpperCase()

  if (teamCode) {
    const { data } = await supabase
      .from("identity_aliases")
      .select(ALIAS_SELECT)
      .ilike("alias_name_raw", wanted)
      .eq("alias_team", teamCode)
      .limit(1)
    if (data?.length) return loadIdentityById(supabase, String(data[0].identity_id))
  }

  const { data: anyTeam } = await supabase
    .from("identity_aliases")
    .select(ALIAS_SELECT)
    .ilike("alias_name_raw", wanted)
    .limit(2)
  /* Two people share that spelling under different teams — resolving would pick one at random. */
  if (anyTeam?.length === 1) return loadIdentityById(supabase, String(anyTeam[0].identity_id))

  /* No alias: the registry may still know the name, from the placer side. */
  let byName = supabase.from("athlete_identities").select(IDENTITY_SELECT).ilike("canonical_name", wanted)
  if (teamCode.length === 2) byName = byName.eq("state", teamCode)
  const { data: ids } = await byName.limit(2)
  if (ids?.length === 1) return loadIdentityById(supabase, String(ids[0].id))
  return null
}

/** Every spelling to search a result store under, the one asked for included. */
export function aliasNamesFor(identity: WrestlerIdentity | null, fallback: string): string[] {
  const names = new Set<string>()
  const add = (n: string) => {
    const t = String(n ?? "").trim()
    if (t) names.add(t)
  }
  add(fallback)
  if (identity) {
    add(identity.canonicalName)
    for (const a of identity.aliases) add(a.name)
  }
  return [...names]
}
