import { NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { requireAdmin } from "@/lib/admin-auth"
import { normalizeClubName } from "@/lib/clubs/club-normalize"

export const dynamic = "force-dynamic"
export const revalidate = 0

/**
 * Every club record, with the RecruitNC profile count attached so the editor can lead with
 * the clubs that matter. Clubs missing coordinates sort first — those are the ones costing
 * the map a pin.
 */
export async function GET() {
  const auth = await requireAdmin()
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status })

  const admin = createAdminClient()

  const { data: clubs, error } = await admin
    .from("wrestling_clubs")
    .select("*")
    .order("name", { ascending: true })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const { data: aliasRows } = await admin.from("wrestling_club_aliases").select("club_id,alias,normalized_alias")
  const aliasesByClub = new Map<string, string[]>()
  for (const row of aliasRows ?? []) {
    const id = String((row as { club_id?: unknown }).club_id)
    const alias = String((row as { alias?: unknown }).alias ?? "")
    if (!id || !alias) continue
    aliasesByClub.set(id, [...(aliasesByClub.get(id) ?? []), alias])
  }

  // Profile counts come from athlete free text, resolved the same way the public map does.
  const { data: athletes } = await admin.from("athletes").select("*").limit(2000)
  const normalizedToClub = new Map<string, string>()
  for (const club of clubs ?? []) {
    const row = club as Record<string, unknown>
    const id = String(row.id)
    normalizedToClub.set(String(row.normalized_name ?? normalizeClubName(String(row.name ?? ""))), id)
    for (const alias of aliasesByClub.get(id) ?? []) normalizedToClub.set(normalizeClubName(alias), id)
  }

  const counts = new Map<string, number>()
  for (const athlete of athletes ?? []) {
    const raw = String((athlete as Record<string, unknown>).wrestlingClub ?? "").trim()
    if (!raw) continue
    const clubId = normalizedToClub.get(normalizeClubName(raw))
    if (!clubId) continue
    counts.set(clubId, (counts.get(clubId) ?? 0) + 1)
  }

  const rows = (clubs ?? []).map((club) => {
    const row = club as Record<string, unknown>
    const id = String(row.id)
    const latitude = row.latitude === null || row.latitude === undefined ? null : Number(row.latitude)
    const longitude = row.longitude === null || row.longitude === undefined ? null : Number(row.longitude)
    return {
      id,
      name: String(row.name ?? ""),
      address: (row.address as string | null) ?? null,
      city: (row.city as string | null) ?? null,
      state: (row.state as string | null) ?? "NC",
      zipCode: (row.zip_code as string | null) ?? null,
      website: (row.website as string | null) ?? null,
      instagramUrl: (row.instagram_url as string | null) ?? null,
      facebookUrl: (row.facebook_url as string | null) ?? null,
      contactPhone: (row.contact_phone as string | null) ?? null,
      contactEmail: (row.contact_email as string | null) ?? null,
      logoUrl: (row.logo_url as string | null) ?? null,
      latitude: Number.isFinite(latitude) ? latitude : null,
      longitude: Number.isFinite(longitude) ? longitude : null,
      verified: Boolean(row.verified),
      status: String(row.status ?? "active"),
      programs: {
        youth: Boolean(row.youth_program),
        middleSchool: Boolean(row.middle_school_program),
        highSchool: Boolean(row.high_school_program),
        boys: Boolean(row.boys_program),
        girls: Boolean(row.girls_program),
        freestyleGreco: Boolean(row.freestyle_greco),
      },
      aliases: aliasesByClub.get(id) ?? [],
      profileCount: counts.get(id) ?? 0,
      needsLocation: !Number.isFinite(latitude) || !Number.isFinite(longitude),
      // A club can have a full address and still have no pin, when the address does not
      // geocode. Labelling that "needs an address" sends you looking for something that is
      // already there, so the two cases are reported separately.
      hasLocationText: Boolean(
        String(row.address ?? "").trim() || String(row.city ?? "").trim() || String(row.zip_code ?? "").trim(),
      ),
    }
  })

  rows.sort((a, b) => {
    // Closed clubs sink to the bottom — they are not part of the address work.
    const aClosed = a.status !== "active"
    const bClosed = b.status !== "active"
    if (aClosed !== bClosed) return aClosed ? 1 : -1
    if (a.needsLocation !== b.needsLocation) return a.needsLocation ? -1 : 1
    if (b.profileCount !== a.profileCount) return b.profileCount - a.profileCount
    return a.name.localeCompare(b.name)
  })

  return NextResponse.json({
    clubs: rows,
    summary: {
      total: rows.length,
      needLocation: rows.filter((r) => r.needsLocation).length,
      verified: rows.filter((r) => r.verified).length,
    },
  })
}
