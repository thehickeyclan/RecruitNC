import { NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { normalizeClubName } from "@/lib/clubs/club-normalize"

export const dynamic = "force-dynamic"

/**
 * Club typeahead for the athlete profile form.
 *
 * Searches the canonical name AND every alias, so a wrestler typing "RAW" finds
 * "Raleigh Area Wolfpack" — which is the entire point of replacing the free-text box.
 * Matching uses the same normaliser as the map, so "sly fox" finds "Slyfox" too.
 */
export async function GET(request: Request) {
  const query = (new URL(request.url).searchParams.get("q") ?? "").trim()

  const admin = createAdminClient()
  const { data: clubs, error } = await admin
    .from("wrestling_clubs")
    // `*` rather than a column list: naming a column that has not been migrated yet fails
    // the whole query and empties the typeahead, which is how instagram_url once broke the
    // map. Missing columns simply read as undefined here.
    .select("*")
    .order("name", { ascending: true })

  if (error) return NextResponse.json({ clubs: [] })

  const { data: aliasRows } = await admin.from("wrestling_club_aliases").select("club_id,alias,normalized_alias")
  const aliasesByClub = new Map<string, string[]>()
  for (const row of aliasRows ?? []) {
    const id = String((row as { club_id?: unknown }).club_id)
    const alias = String((row as { alias?: unknown }).alias ?? "")
    if (id && alias) aliasesByClub.set(id, [...(aliasesByClub.get(id) ?? []), alias])
  }

  const needle = normalizeClubName(query)
  const raw = query.toLowerCase()

  const scored = (clubs ?? [])
    .map((club) => {
      const row = club as Record<string, any>
      const id = String(row.id)
      const name = String(row.name ?? "")
      const aliases = aliasesByClub.get(id) ?? []
      const normalizedName = String(row.normalized_name ?? normalizeClubName(name))

      const closed = String(row.status ?? "active") !== "active"

      let score = -1
      if (!needle) {
        // Browsing the list is someone choosing where they train now, so a club that has
        // shut down is not offered. It stays findable by name for the wrestlers who were
        // there, and is labelled so nobody picks it by mistake.
        score = closed ? -1 : 0
      } else if (normalizedName === needle || aliases.some((a) => normalizeClubName(a) === needle)) {
        score = 3 // exact, including via an alias
      } else if (normalizedName.startsWith(needle)) {
        score = 2
      } else if (
        normalizedName.includes(needle) ||
        name.toLowerCase().includes(raw) ||
        String(row.city ?? "").toLowerCase().includes(raw) ||
        aliases.some((a) => normalizeClubName(a).includes(needle))
      ) {
        score = 1
      }

      return {
        score,
        club: {
          id,
          name,
          city: (row.city as string | null) ?? null,
          state: (row.state as string | null) ?? "NC",
          logoUrl: (row.logo_url as string | null) ?? null,
          verified: Boolean(row.verified),
          closed,
          aliases,
        },
      }
    })
    .filter((entry) => entry.score >= 0)
    .sort(
      (a, b) =>
        b.score - a.score ||
        Number(a.club.closed) - Number(b.club.closed) ||
        a.club.name.localeCompare(b.club.name),
    )
    .slice(0, 12)

  return NextResponse.json({ clubs: scored.map((entry) => entry.club) })
}
