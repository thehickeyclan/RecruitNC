import { NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { firstNonEmpty, normalizeClubName } from "@/lib/clubs/club-normalize"
import type { ClubMapPin, ClubMapResponse, UnlocatedClub } from "@/lib/clubs/club-map-types"

export const dynamic = "force-dynamic"
export const revalidate = 0

type AnyRecord = Record<string, any>

type CanonicalClub = {
  id: string
  name: string
  normalizedName: string
  address: string | null
  city: string | null
  state: string | null
  zipCode: string | null
  latitude: number | null
  longitude: number | null
  website: string | null
  logoUrl: string | null
  verified: boolean
}

type ClubStats = {
  athleteIds: Set<string>
  boysCount: number
  girlsCount: number
  commitCount: number
  recentCommits: Array<{ name: string; college: string; classYear: string | number | null }>
}

function zeroSummary(): ClubMapResponse["summary"] {
  return {
    mappedClubs: 0,
    unlocatedClubs: 0,
    athletesRepresented: 0,
    commitsRepresented: 0,
    verifiedClubs: 0,
  }
}

function asNullableString(value: unknown): string | null {
  const trimmed = String(value ?? "").trim()
  return trimmed || null
}

function asFiniteNumber(value: unknown): number | null {
  const numberValue = typeof value === "number" ? value : Number(value)
  return Number.isFinite(numberValue) ? numberValue : null
}

function athleteName(athlete: AnyRecord): string {
  const composed = [athlete.first_name, athlete.last_name].filter(Boolean).join(" ")
  return firstNonEmpty(athlete.name, athlete.athlete_name, athlete.full_name, composed, "RecruitNC athlete")
}

function athleteClubName(athlete: AnyRecord): string {
  return firstNonEmpty(
    athlete.wrestlingClub,
    athlete.wrestling_club,
    athlete.wrestlingclub,
    athlete.club,
    athlete.team_affiliation,
    athlete.team,
  )
}

function athleteGenderBucket(athlete: AnyRecord): "girls" | "boys" {
  const value = firstNonEmpty(athlete.gender, athlete.sex, athlete.division, athlete.category).toLowerCase()
  return /female|girl|women|woman/.test(value) ? "girls" : "boys"
}

function athleteCollege(athlete: AnyRecord): string {
  return firstNonEmpty(athlete.college, athlete.college_commit, athlete.collegeCommit, athlete.commitment_college)
}

function athleteClassYear(athlete: AnyRecord): string | number | null {
  return (
    athlete.graduationyear ??
    athlete.graduation_year ??
    athlete.class_year ??
    athlete.classYear ??
    athlete.year ??
    null
  )
}

function clubSearchHref(name: string): string {
  return `/athletes?search=${encodeURIComponent(name)}`
}

function createStats(): ClubStats {
  return {
    athleteIds: new Set<string>(),
    boysCount: 0,
    girlsCount: 0,
    commitCount: 0,
    recentCommits: [],
  }
}

function addAlias(map: Map<string, string>, alias: unknown, clubId: string) {
  const normalized = normalizeClubName(String(alias ?? ""))
  if (normalized && !map.has(normalized)) {
    map.set(normalized, clubId)
  }
}

function setupNeededResponse(error: string): ClubMapResponse {
  return {
    success: false,
    setupNeeded: true,
    error,
    pins: [],
    unlocatedClubs: [],
    summary: zeroSummary(),
  }
}

export async function GET() {
  try {
    const supabase = createAdminClient()

    const { data: clubRows, error: clubError } = await supabase
      .from("wrestling_clubs")
      .select(
        "id,name,normalized_name,location,logo_url,address,city,state,zip_code,latitude,longitude,website,verified",
      )
      .order("name", { ascending: true })

    if (clubError) {
      return NextResponse.json(
        setupNeededResponse(
          `Club map setup is not complete. Run docs/sql/wrestling-club-map.sql.txt in Supabase. ${clubError.message}`,
        ),
        { status: 200 },
      )
    }

    const canonicalClubs = new Map<string, CanonicalClub>()
    const normalizedToClubId = new Map<string, string>()

    for (const row of clubRows ?? []) {
      const id = String(row.id)
      const name = firstNonEmpty(row.name, row.location)
      if (!name) continue
      const normalizedName = firstNonEmpty(row.normalized_name, normalizeClubName(name))
      const club: CanonicalClub = {
        id,
        name,
        normalizedName,
        address: asNullableString(row.address),
        city: asNullableString(row.city || row.location),
        state: asNullableString(row.state) || "NC",
        zipCode: asNullableString(row.zip_code),
        latitude: asFiniteNumber(row.latitude),
        longitude: asFiniteNumber(row.longitude),
        website: asNullableString(row.website),
        logoUrl: asNullableString(row.logo_url),
        verified: Boolean(row.verified),
      }
      canonicalClubs.set(id, club)
      addAlias(normalizedToClubId, name, id)
      addAlias(normalizedToClubId, normalizedName, id)
    }

    const { data: aliasRows } = await supabase
      .from("wrestling_club_aliases")
      .select("club_id,alias,normalized_alias")

    for (const row of aliasRows ?? []) {
      const clubId = String(row.club_id)
      if (!canonicalClubs.has(clubId)) continue
      addAlias(normalizedToClubId, row.alias, clubId)
      addAlias(normalizedToClubId, row.normalized_alias, clubId)
    }

    const { data: logoRows } = await supabase
      .from("logo_mappings")
      .select("entity_name,logo_url,aliases,entity_type")
      .eq("entity_type", "club")

    for (const row of logoRows ?? []) {
      const matchedClubId = normalizedToClubId.get(normalizeClubName(row.entity_name))
      if (matchedClubId) {
        const club = canonicalClubs.get(matchedClubId)
        if (club && !club.logoUrl) {
          club.logoUrl = asNullableString(row.logo_url)
        }
      }

      if (Array.isArray(row.aliases)) {
        for (const alias of row.aliases) {
          const clubId = matchedClubId || normalizedToClubId.get(normalizeClubName(alias))
          if (clubId) addAlias(normalizedToClubId, alias, clubId)
        }
      }
    }

    const { data: athletes, error: athleteError } = await supabase.from("athletes").select("*")
    if (athleteError) {
      return NextResponse.json({
        success: false,
        error: athleteError.message,
        pins: [],
        unlocatedClubs: [],
        summary: zeroSummary(),
      } satisfies ClubMapResponse)
    }

    const statsByClubId = new Map<string, ClubStats>()
    const unlocatedByName = new Map<string, UnlocatedClub>()

    for (const athlete of athletes ?? []) {
      const rawClubName = athleteClubName(athlete)
      const normalizedClubName = normalizeClubName(rawClubName)
      if (!normalizedClubName) continue

      const idSource = firstNonEmpty(athlete.id, athlete.athlete_id, athleteName(athlete))
      const genderBucket = athleteGenderBucket(athlete)
      const college = athleteCollege(athlete)

      const clubId = normalizedToClubId.get(normalizedClubName)
      if (!clubId) {
        const displayName = rawClubName.trim()
        const current =
          unlocatedByName.get(normalizedClubName) ??
          ({
            name: displayName,
            normalizedName: normalizedClubName,
            athleteCount: 0,
            boysCount: 0,
            girlsCount: 0,
            commitCount: 0,
          } satisfies UnlocatedClub)

        current.athleteCount += 1
        if (genderBucket === "girls") current.girlsCount += 1
        else current.boysCount += 1
        if (college) current.commitCount += 1
        unlocatedByName.set(normalizedClubName, current)
        continue
      }

      const stats = statsByClubId.get(clubId) ?? createStats()
      const priorSize = stats.athleteIds.size
      stats.athleteIds.add(String(idSource))
      const isNewAthlete = stats.athleteIds.size > priorSize

      if (isNewAthlete) {
        if (genderBucket === "girls") stats.girlsCount += 1
        else stats.boysCount += 1
      }

      if (college) {
        stats.commitCount += 1
        if (stats.recentCommits.length < 4) {
          stats.recentCommits.push({
            name: athleteName(athlete),
            college,
            classYear: athleteClassYear(athlete),
          })
        }
      }

      statsByClubId.set(clubId, stats)
    }

    const pins: ClubMapPin[] = []

    for (const club of canonicalClubs.values()) {
      if (!Number.isFinite(club.latitude) || !Number.isFinite(club.longitude)) continue
      const stats = statsByClubId.get(club.id) ?? createStats()

      pins.push({
        id: club.id,
        name: club.name,
        normalizedName: club.normalizedName,
        address: club.address,
        city: club.city,
        state: club.state,
        zipCode: club.zipCode,
        latitude: club.latitude as number,
        longitude: club.longitude as number,
        website: club.website,
        logoUrl: club.logoUrl,
        verified: club.verified,
        athleteCount: stats.athleteIds.size,
        boysCount: stats.boysCount,
        girlsCount: stats.girlsCount,
        commitCount: stats.commitCount,
        recentCommits: stats.recentCommits,
        profileHref: clubSearchHref(club.name),
      })
    }

    pins.sort((a, b) => b.verified === a.verified ? b.athleteCount - a.athleteCount : Number(b.verified) - Number(a.verified))

    const unlocatedClubs = Array.from(unlocatedByName.values()).sort((a, b) => b.athleteCount - a.athleteCount)
    const summary = {
      mappedClubs: pins.length,
      unlocatedClubs: unlocatedClubs.length,
      athletesRepresented: pins.reduce((sum, pin) => sum + pin.athleteCount, 0),
      commitsRepresented: pins.reduce((sum, pin) => sum + pin.commitCount, 0),
      verifiedClubs: pins.filter((pin) => pin.verified).length,
    }

    return NextResponse.json({
      success: true,
      pins,
      unlocatedClubs,
      summary,
    } satisfies ClubMapResponse)
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Failed to load club map.",
        pins: [],
        unlocatedClubs: [],
        summary: zeroSummary(),
      } satisfies ClubMapResponse,
      { status: 500 },
    )
  }
}
