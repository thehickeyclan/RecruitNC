import "server-only"

import { createAdminClient } from "@/lib/supabase/admin"
import { TOC_WEIGHT_CLASSES } from "@/lib/toc/constants"

/**
 * Public read model for announced TOC weight classes — the ONLY path that may feed a public page.
 *
 * Security rules, in order of importance:
 *
 * 1. A weight is public only when `toc_field_publication_status.announced_at` is set. Locking a field
 *    (`athlete_field_locked`) means staff finished it, NOT that media released it. Never gate on the lock.
 * 2. Every select here is an explicit allowlist. `toc_invitations` rows carry `seed`, `medical_notes`,
 *    `jacket_size` and acknowledgment flags on the same row, and {@link import("./field-board").TocFieldAthlete}
 *    additionally carries AI seeding and head-to-head scouting evidence. None of that may ever be serialized
 *    toward a browser — so no `select("*")`, and this module deliberately does not import the field-board types.
 * 3. Athletes are not identified by school. TOC wrestlers compete unattached; club and class year only.
 * 4. A photo is published only when the athlete accepted the photo release on their confirmation.
 * 5. Ordering is alphabetical, applied here on the server. The public field is not seeded, and seed order
 *    must not be inferable from row order.
 *
 * Callers are server components. There is intentionally no public API route wrapping this — an endpoint
 * would be enumerable by weight, and the drip release depends on unannounced weights being unreachable.
 */

/** Exactly what a visitor may see. Adding a field here makes it public — treat changes as a security review. */
export type PublicFieldAthlete = {
  athleteId: string
  name: string
  graduationYear: number | null
  club: string | null
  /** Null when the athlete has no photo or did not accept the photo release. */
  photoUrl: string | null
}

export type PublicAnnouncedWeight = {
  weightClass: number
  announcedAt: string
  athletes: PublicFieldAthlete[]
}

export type PublicWeightTile = {
  weightClass: number
  announced: boolean
  /** Null unless announced. */
  announcedAt: string | null
  /** Count of announced athletes; 0 unless announced. Never a capacity or "x of 12" figure. */
  athleteCount: number
}

/** Statuses that represent an athlete actually in the field. */
const PUBLIC_STATUSES = ["confirmed"] as const

function isValidWeight(weightClass: number): boolean {
  return (TOC_WEIGHT_CLASSES as readonly number[]).includes(weightClass)
}

/**
 * Weight classes with `announced_at` set. Returns an empty set rather than throwing when the column or
 * table is missing, so a migration gap keeps the public page empty instead of publishing everything.
 */
async function fetchAnnouncedAtByWeight(): Promise<Map<number, string>> {
  const admin = createAdminClient()
  const out = new Map<number, string>()

  const { data, error } = await admin
    .from("toc_field_publication_status")
    .select("weight_class, announced_at")
    .not("announced_at", "is", null)

  if (error) {
    console.warn("[toc-public-field] announced_at lookup failed — treating every weight as unannounced:", error.message)
    return out
  }

  for (const raw of data ?? []) {
    const row = raw as { weight_class?: number | null; announced_at?: string | null }
    const w = Number(row.weight_class)
    if (!Number.isFinite(w) || !isValidWeight(w)) continue
    if (!row.announced_at) continue
    out.set(w, row.announced_at)
  }
  return out
}

/** Suffixes that are not the surname — "Kristopher Kerr Jr" sorts under Kerr, not Jr. */
const NAME_SUFFIXES = new Set(["jr", "jr.", "sr", "sr.", "ii", "iii", "iv", "v"])

/**
 * Surname, then given name. Sorting the whole name string would order the field by first name, which does not
 * read as alphabetical on a roster — the page states the field is alphabetical, so this has to match a reader's
 * expectation of it.
 */
export function surnameSortKey(fullName: string): string {
  const parts = fullName.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return ""
  if (parts.length === 1) return parts[0]!.toLowerCase()

  let lastIdx = parts.length - 1
  while (lastIdx > 0 && NAME_SUFFIXES.has(parts[lastIdx]!.toLowerCase())) {
    lastIdx -= 1
  }
  const surname = parts[lastIdx]!.toLowerCase()
  const given = parts.slice(0, lastIdx).join(" ").toLowerCase()
  return `${surname} ${given}`.trim()
}

function comparePublicNames(a: PublicFieldAthlete, b: PublicFieldAthlete): number {
  return surnameSortKey(a.name).localeCompare(surnameSortKey(b.name), "en", { sensitivity: "base" })
}

/**
 * Confirmed athletes for one announced weight, alphabetical. Reads invitations and athletes with explicit
 * column lists and drops anything the visitor may not see before returning.
 */
async function fetchPublicAthletesForWeight(weightClass: number): Promise<PublicFieldAthlete[]> {
  const admin = createAdminClient()

  const { data: invites, error } = await admin
    .from("toc_invitations")
    .select("athlete_id, status, photo_release_accepted")
    .eq("weight_class", weightClass)
    .in("status", PUBLIC_STATUSES as unknown as string[])

  if (error) {
    console.warn("[toc-public-field] invitation lookup failed:", error.message)
    return []
  }

  const releaseByAthleteId = new Map<string, boolean>()
  for (const raw of invites ?? []) {
    const row = raw as { athlete_id?: string | null; photo_release_accepted?: boolean | null }
    const id = typeof row.athlete_id === "string" ? row.athlete_id.trim() : ""
    if (!id) continue
    releaseByAthleteId.set(id, row.photo_release_accepted === true)
  }

  const athleteIds = [...releaseByAthleteId.keys()]
  if (athleteIds.length === 0) return []

  // No `highschool` in this select: the public field never identifies an athlete by school.
  // `wrestlingClub` is camelCase in Postgres and must stay quoted, otherwise it resolves lowercased and 404s.
  const { data: athletes, error: athleteError } = await admin
    .from("athletes")
    .select('id, name, graduationyear, "wrestlingClub", photourl, headshot_url')
    .in("id", athleteIds)

  if (athleteError) {
    console.warn("[toc-public-field] athlete lookup failed:", athleteError.message)
    return []
  }

  const out: PublicFieldAthlete[] = []
  for (const raw of athletes ?? []) {
    const row = raw as {
      id?: string | null
      name?: string | null
      graduationyear?: number | null
      wrestlingClub?: string | null
      photourl?: string | null
      headshot_url?: string | null
    }
    const id = typeof row.id === "string" ? row.id : ""
    const name = typeof row.name === "string" ? row.name.trim() : ""
    if (!id || !name) continue

    const photoReleased = releaseByAthleteId.get(id) === true
    const headshot = typeof row.headshot_url === "string" ? row.headshot_url.trim() : ""
    const profilePhoto = typeof row.photourl === "string" ? row.photourl.trim() : ""
    // Prefer a purpose-shot headshot when one exists; fall back to the profile photo.
    const rawPhoto = headshot || profilePhoto
    const club = typeof row.wrestlingClub === "string" ? row.wrestlingClub.trim() : ""

    out.push({
      athleteId: id,
      name,
      graduationYear: typeof row.graduationyear === "number" ? row.graduationyear : null,
      club: club || null,
      photoUrl: photoReleased && rawPhoto ? rawPhoto : null,
    })
  }

  return out.sort(comparePublicNames)
}

/**
 * One tile per weight class for the public hub — every weight is listed, but only announced weights
 * carry a date or a count. Unannounced tiles expose nothing about how the field is being built.
 */
export async function listPublicWeightTiles(): Promise<PublicWeightTile[]> {
  const announced = await fetchAnnouncedAtByWeight()

  const tiles = await Promise.all(
    TOC_WEIGHT_CLASSES.map(async (weightClass) => {
      const announcedAt = announced.get(weightClass) ?? null
      if (!announcedAt) {
        return { weightClass, announced: false, announcedAt: null, athleteCount: 0 }
      }
      const athletes = await fetchPublicAthletesForWeight(weightClass)
      return { weightClass, announced: true, announcedAt, athleteCount: athletes.length }
    }),
  )

  return tiles.sort((a, b) => a.weightClass - b.weightClass)
}

/**
 * Full public field for one weight, or null when the weight is invalid or has not been announced.
 * Callers must treat null as {@link import("next/navigation").notFound} — never as an empty field.
 */
export async function getPublicAnnouncedWeight(weightClassInput: number): Promise<PublicAnnouncedWeight | null> {
  const weightClass = Number(weightClassInput)
  if (!Number.isFinite(weightClass) || !isValidWeight(weightClass)) return null

  const announced = await fetchAnnouncedAtByWeight()
  const announcedAt = announced.get(weightClass)
  if (!announcedAt) return null

  return {
    weightClass,
    announcedAt,
    athletes: await fetchPublicAthletesForWeight(weightClass),
  }
}

/** True when at least one weight has been released — lets the hub show a pre-release state. */
export async function hasAnyAnnouncedWeight(): Promise<boolean> {
  const announced = await fetchAnnouncedAtByWeight()
  return announced.size > 0
}
