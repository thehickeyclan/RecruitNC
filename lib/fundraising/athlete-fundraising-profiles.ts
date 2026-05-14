import { cache } from "react"
import type { SupabaseClient } from "@supabase/supabase-js"
import { createAdminClient } from "@/lib/supabase/admin"
import type { FundraisingAthleteEntry } from "@/lib/spartan-fundraising-code"
import { getFundraisingAthleteEntries, scoreSpartanPublicDisplayRichness } from "@/lib/spartan-fundraising-code"
import { fundraisingCodeFromSlug } from "@/lib/fundraising/athlete-fundraising-slug"
import { recruitingProfilePhotoFromRow } from "@/lib/recruiting-profile-photo"
import { normalizeFundraisingSchoolDisplay } from "@/lib/fundraising/normalize-fundraising-school-display"

const NCU_CODE_RE = /^NCU-[A-Za-z0-9]+-\d{2}$/i

/** PostgREST `.in("id", …)` with hundreds of UUIDs can overflow URL length — batch fetches. */
const ATHLETE_PHOTO_FETCH_BATCH = 100

const ATHLETE_UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

async function fetchRecruitingPhotosByAthleteId(
  admin: SupabaseClient,
  candidateIds: string[],
): Promise<Map<string, string | null>> {
  const uuidIds = [...new Set(candidateIds.filter((id) => ATHLETE_UUID_RE.test(id)))]
  const recruitingPhotoByAthleteId = new Map<string, string | null>()
  for (let i = 0; i < uuidIds.length; i += ATHLETE_PHOTO_FETCH_BATCH) {
    const slice = uuidIds.slice(i, i + ATHLETE_PHOTO_FETCH_BATCH)
    const { data: athPhotoRows, error: pe } = await admin.from("athletes").select("*").in("id", slice)
    if (pe) {
      console.warn("[athlete-fundraising-profiles] athlete recruiting photos batch", pe.message)
      continue
    }
    for (const row of athPhotoRows ?? []) {
      const id = typeof row.id === "string" ? row.id : ""
      if (!id) continue
      recruitingPhotoByAthleteId.set(id, recruitingProfilePhotoFromRow(row as Record<string, unknown>))
    }
  }
  return recruitingPhotoByAthleteId
}

export type AthleteFundraisingProfileRow = {
  id: string
  created_at: string
  updated_at: string
  athlete_id: string
  slug: string
  bio: string | null
  photo_url: string | null
  is_active: boolean
  campaign_goal_cents: number | null
  total_raised_cents: number | null
  primary_fundraising_code: string | null
  /** When true, public athlete page may embed Stripe checkout (staff sets after activation approval). */
  checkout_live: boolean
}

export type ResolvedFundraisingAthletePublic = {
  profile: AthleteFundraisingProfileRow | null
  code: string | null
  entry: FundraisingAthleteEntry | null
  /** When the athlete is not on the computed fundraising roster but has a profile row. */
  fallbackDisplayName: string | null
  /**
   * Valid NCU codes to sum for public totals (URL slug + primary + roster). Stripe may credit any one of these
   * when checkout metadata differs from profile primary.
   */
  ledgerCodes: string[]
  /**
   * All `athletes.id` values from the directory that carry an NCU code in {@link ledgerCodes}, plus the profile’s
   * athlete_id. Guild transfers in `guild_credit_allocations` sometimes sit under a sibling roster row UUID; the
   * family wallet sums Guild across **these** ids so transfers still show on this gift page.
   */
  guildLookupAthleteIds: string[]
}

function coerceProfileRow(raw: unknown): AthleteFundraisingProfileRow {
  const r = raw as Record<string, unknown>
  return {
    ...(r as unknown as AthleteFundraisingProfileRow),
    checkout_live: r.checkout_live === true,
  }
}

export function normalizeFundraisingProfileSlug(raw: string): string {
  return raw.trim().toLowerCase()
}

function coerceNcuCode(raw: string | null | undefined): string | null {
  const c = (raw ?? "").trim().toUpperCase()
  if (!NCU_CODE_RE.test(c)) return null
  return c
}

/**
 * Directory `buildFundraisingEntries` and `spartan_fundraising_athletes` (same `athlete_id`) can disagree on the
 * collision suffix — e.g. `NCU-APONTE-31` vs `NCU-APONTEJ-31`. Stripe credits whatever was on checkout; public totals
 * must sum **all** codes for this profile.
 */
function allCoercedLedgerCodesForAthleteId(entries: FundraisingAthleteEntry[], athleteId: string): string[] {
  const out = new Set<string>()
  for (const e of entries) {
    if (e.id !== athleteId) continue
    const c = coerceNcuCode(e.code)
    if (c) out.add(c)
  }
  return [...out]
}

function pickPreferredFundraisingEntryForAthlete(
  entries: FundraisingAthleteEntry[],
  athleteId: string,
): FundraisingAthleteEntry | null {
  const list = entries.filter((e) => e.id === athleteId)
  if (list.length === 0) return null
  if (list.length === 1) return list[0]!
  return [...list].reduce((a, b) =>
    scoreSpartanPublicDisplayRichness(b.fullName) > scoreSpartanPublicDisplayRichness(a.fullName) ? b : a,
  )
}

function uniqueCoercedCodes(parts: (string | null | undefined)[]): string[] {
  const out = new Set<string>()
  for (const p of parts) {
    const c = coerceNcuCode(p)
    if (c) out.add(c)
  }
  return [...out]
}

/**
 * UUIDs to use when summing `guild_credit_allocations` for this gift page — profile id, preferred entry id, and
 * any roster row id whose NCU code appears in `ledgerCodes` (collision / duplicate roster safety).
 */
function collectGuildLookupAthleteIds(
  entries: FundraisingAthleteEntry[],
  ledgerCodes: string[],
  profileAthleteId: string | null | undefined,
  preferredEntryId: string | null | undefined,
): string[] {
  const ids = new Set<string>()
  if (profileAthleteId && ATHLETE_UUID_RE.test(profileAthleteId)) ids.add(profileAthleteId)
  if (preferredEntryId && ATHLETE_UUID_RE.test(preferredEntryId)) ids.add(preferredEntryId)
  const codeSet = new Set<string>()
  for (const lc of ledgerCodes) {
    const c = coerceNcuCode(lc)
    if (c) codeSet.add(c)
  }
  for (const e of entries) {
    if (e.id.startsWith("spartan-fundraising:")) continue
    const c = coerceNcuCode(e.code)
    if (c && codeSet.has(c)) ids.add(e.id)
  }
  return [...ids]
}

/**
 * Map URL slug → profile (if any) + NCU code for Stripe-linked stats / checkout.
 * Legacy URLs without a profile row still work when slug is the lowercase NCU code.
 */
export async function resolveFundraisingAthletePublic(
  admin: SupabaseClient,
  slugInput: string,
  entries: FundraisingAthleteEntry[],
): Promise<ResolvedFundraisingAthletePublic | null> {
  const slug = normalizeFundraisingProfileSlug(slugInput)
  if (slug.length < 2) return null

  const { data: profile, error } = await admin
    .from("athlete_fundraising_profiles")
    .select(
      "id, created_at, updated_at, athlete_id, slug, bio, photo_url, is_active, campaign_goal_cents, total_raised_cents, primary_fundraising_code, checkout_live",
    )
    .eq("slug", slug)
    .eq("is_active", true)
    .maybeSingle()

  if (error) {
    console.warn("[athlete-fundraising-profiles] load by slug", error.message)
  }

  const legacyCode = coerceNcuCode(fundraisingCodeFromSlug(slug))

  if (profile) {
    const row = coerceProfileRow(profile)
    const fromPrimary = coerceNcuCode(row.primary_fundraising_code)
    const entry = pickPreferredFundraisingEntryForAthlete(entries, row.athlete_id)
    const rosterCodes = allCoercedLedgerCodesForAthleteId(entries, row.athlete_id)
    /** `/fundraising/athletes/ncu-aponte-30` must ledger `NCU-APONTE-30` — URL slug wins when it is a valid NCU
     *  so bad `primary_fundraising_code` / roster `entry.code` cannot zero out totals while checkout still shows the athlete. */
    const code = legacyCode ?? fromPrimary ?? entry?.code?.toUpperCase() ?? null
    const ledgerCodes = uniqueCoercedCodes([legacyCode, fromPrimary, ...rosterCodes, code])
    const guildLookupAthleteIds = collectGuildLookupAthleteIds(entries, ledgerCodes, row.athlete_id, entry?.id ?? null)
    let fallbackDisplayName: string | null = null
    if (!entry) {
      const { data: ath } = await admin.from("athletes").select("name").eq("id", row.athlete_id).maybeSingle()
      const nm = typeof ath?.name === "string" ? ath.name.trim() : ""
      fallbackDisplayName = nm || null
    }
    return { profile: row, code, entry, fallbackDisplayName, ledgerCodes, guildLookupAthleteIds }
  }

  if (!legacyCode) return null
  const entry = entries.find((e) => e.code.toUpperCase() === legacyCode) ?? null
  const rosterCodes =
    entry && !entry.id.startsWith("spartan-fundraising:")
      ? allCoercedLedgerCodesForAthleteId(entries, entry.id)
      : []
  const ledgerCodes = uniqueCoercedCodes([legacyCode, ...rosterCodes])
  const guildLookupAthleteIds = collectGuildLookupAthleteIds(entries, ledgerCodes, entry?.id ?? null, entry?.id ?? null)
  return { profile: null, code: legacyCode, entry, fallbackDisplayName: null, ledgerCodes, guildLookupAthleteIds }
}

/**
 * Dedupes roster + slug resolution when both `generateMetadata` and the page load the same athlete (same request).
 */
export const resolveFundraisingAthletePublicBySlugForRequest = cache(async (slugInput: string) => {
  const admin = createAdminClient()
  const entries = await getFundraisingAthleteEntries(admin)
  return resolveFundraisingAthletePublic(admin, slugInput, entries)
})

export type FundraisingAthleteIndexRow = {
  athleteId: string
  code: string
  displayName: string
  sublabel: string | null
  hrefSlug: string
  photoUrl: string | null
  /** From `athlete_fundraising_profiles.total_raised_cents` when present. */
  totalRaisedCents: number | null
}

/**
 * Directory list for /fundraising/athletes — prefers custom profile slug when present.
 */
export async function getFundraisingAthletesIndexRows(
  admin: SupabaseClient,
  entries: FundraisingAthleteEntry[],
): Promise<FundraisingAthleteIndexRow[]> {
  const { data: profiles, error } = await admin
    .from("athlete_fundraising_profiles")
    .select(
      "athlete_id, slug, photo_url, is_active, id, created_at, updated_at, bio, campaign_goal_cents, total_raised_cents, primary_fundraising_code",
    )
    .eq("is_active", true)

  if (error) {
    console.warn("[athlete-fundraising-profiles] list active", error.message)
  }

  const byAthlete = new Map<string, AthleteFundraisingProfileRow>()
  for (const p of (profiles ?? []) as AthleteFundraisingProfileRow[]) {
    byAthlete.set(p.athlete_id, p)
  }

  const rosterAthleteIds = [...new Set(entries.map((e) => e.id).filter(Boolean))]
  const orphanIdsEarly = [...new Set((profiles ?? []).map((p) => (p as AthleteFundraisingProfileRow).athlete_id).filter(Boolean))]
  const allPhotoIds = [...new Set([...rosterAthleteIds, ...orphanIdsEarly])]
  const recruitingPhotoByAthleteId =
    allPhotoIds.length > 0 ? await fetchRecruitingPhotosByAthleteId(admin, allPhotoIds) : new Map<string, string | null>()

  const pickDirectoryPhotoUrl = (athleteId: string, profilePhotoRaw: string | null | undefined): string | null => {
    const fromProfile =
      typeof profilePhotoRaw === "string" && profilePhotoRaw.trim()
        ? recruitingProfilePhotoFromRow({ photo_url: profilePhotoRaw.trim() })
        : null
    const fromRecruiting = recruitingPhotoByAthleteId.get(athleteId) ?? null
    return fromProfile ?? fromRecruiting ?? null
  }

  const buildIndexRowFromEntry = (
    e: FundraisingAthleteEntry,
    profile: AthleteFundraisingProfileRow | undefined,
  ): FundraisingAthleteIndexRow => {
    const primary = profile ? coerceNcuCode(profile.primary_fundraising_code) : null
    const hrefSlug = profile?.slug ?? e.code.trim().toLowerCase()
    return {
      athleteId: e.id,
      code: primary ?? e.code,
      displayName: e.fullName || e.label,
      sublabel: e.label.includes("·")
        ? normalizeFundraisingSchoolDisplay(e.label.split("·").slice(1).join("·").trim()) || null
        : null,
      hrefSlug,
      photoUrl: pickDirectoryPhotoUrl(e.id, profile?.photo_url ?? null),
      totalRaisedCents: typeof profile?.total_raised_cents === "number" ? profile.total_raised_cents : null,
    }
  }

  /** One directory row per pinned `athletes.id` — multiple `spartan_fundraising_athletes` codes must not duplicate cards. */
  const rosterAthleteIdSet = new Set(
    entries.filter((e) => ATHLETE_UUID_RE.test(e.id)).map((e) => e.id),
  )
  const fromRosterPinned: FundraisingAthleteIndexRow[] = []
  for (const athleteId of rosterAthleteIdSet) {
    const win = pickPreferredFundraisingEntryForAthlete(entries, athleteId)
    if (!win) continue
    const p = byAthlete.get(athleteId)
    fromRosterPinned.push(buildIndexRowFromEntry(win, p))
  }

  const fromRosterRosterOnly: FundraisingAthleteIndexRow[] = entries
    .filter((e) => !ATHLETE_UUID_RE.test(e.id))
    .map((e) => buildIndexRowFromEntry(e, undefined))

  const fromRoster = [...fromRosterPinned, ...fromRosterRosterOnly]

  const orphanProfiles = [...byAthlete.values()].filter((p) => !rosterAthleteIdSet.has(p.athlete_id))
  const nameById = new Map<string, string>()
  if (orphanProfiles.length > 0) {
    const ids = [...new Set(orphanProfiles.map((p) => p.athlete_id))]
    const { data: athRows, error: ae } = await admin.from("athletes").select("id, name").in("id", ids)
    if (ae) console.warn("[athlete-fundraising-profiles] orphan athlete names", ae.message)
    for (const row of athRows ?? []) {
      const id = typeof row.id === "string" ? row.id : ""
      const nm = typeof row.name === "string" && row.name.trim() ? row.name.trim() : ""
      if (id) nameById.set(id, nm || "NC United athlete")
    }
  }

  const orphans: FundraisingAthleteIndexRow[] = orphanProfiles.map((p) => {
    const code = coerceNcuCode(p.primary_fundraising_code) ?? ""
    return {
      athleteId: p.athlete_id,
      code: code || "—",
      displayName: nameById.get(p.athlete_id) ?? "NC United athlete",
      sublabel: null,
      hrefSlug: p.slug,
      photoUrl: pickDirectoryPhotoUrl(p.athlete_id, p.photo_url),
      totalRaisedCents: typeof p.total_raised_cents === "number" ? p.total_raised_cents : null,
    }
  })

  const combined = [...fromRoster, ...orphans]
  combined.sort((a, b) =>
    a.displayName.localeCompare(b.displayName, undefined, { sensitivity: "base" }),
  )

  const seenSlug = new Set<string>()
  const seenPinnedAthlete = new Set<string>()
  const deduped: FundraisingAthleteIndexRow[] = []
  for (const row of combined) {
    const slugKey = row.hrefSlug.trim().toLowerCase()
    if (seenSlug.has(slugKey)) continue
    if (ATHLETE_UUID_RE.test(row.athleteId)) {
      if (seenPinnedAthlete.has(row.athleteId)) continue
      seenPinnedAthlete.add(row.athleteId)
    }
    seenSlug.add(slugKey)
    deduped.push(row)
  }
  return deduped
}
