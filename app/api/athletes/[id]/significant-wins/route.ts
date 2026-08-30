import { NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { buildTocFieldBoard } from "@/lib/toc/field-board"
import { findSignificantWins, type Bout, type RankedOpponent } from "@/lib/significant-wins"

/**
 * The wins on a profile worth a reader's attention: over the TOC field, or over a ranked prospect.
 *
 * Ranked opponents include classes that are not published yet. The 2029 rankings are private, but
 * a win over one of those wrestlers is no less real — and only the fact of the ranking leaves this
 * endpoint, never the number, so nothing unpublished is disclosed by it.
 */

export const dynamic = "force-dynamic"

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const admin = createAdminClient()

  const [{ data: rows }, { data: invitations }] = await Promise.all([
    admin.from("matches").select("season,matches").eq("athlete_id", id),
    admin.from("toc_invitations").select("*, athletes(id,name)"),
  ])

  const bouts: Bout[] = (rows ?? []).flatMap((row) => {
    try {
      return Array.isArray(row.matches) ? row.matches : JSON.parse(String(row.matches ?? "[]"))
    } catch {
      return []
    }
  })
  if (bouts.length === 0) return NextResponse.json({ wins: [] })

  const tocField = buildTocFieldBoard(invitations ?? []).weights
    .flatMap((weight) => weight.athletes.filter((a) => a.status === "confirmed").map((a) => a.name))
    .filter(Boolean)

  // Paginated: PostgREST caps a request at 1000 rows and there are more ranked athletes than that
  // across every class once the unpublished ones are included.
  const ranked: RankedOpponent[] = []
  for (let from = 0; ; from += 1000) {
    const { data } = await admin
      .from("athletes")
      .select("name,prospect_ranking,graduationyear")
      .not("prospect_ranking", "is", null)
      .range(from, from + 999)
    if (!data?.length) break
    for (const row of data) {
      if (row.name) {
        ranked.push({
          name: String(row.name),
          ranking: row.prospect_ranking == null ? null : Number(row.prospect_ranking),
          graduationYear: row.graduationyear == null ? null : Number(row.graduationyear),
        })
      }
    }
    if (data.length < 1000) break
  }

  const wins = findSignificantWins(bouts, { tocField, ranked }).map((win) => ({
    opponent: win.opponent,
    opponentSchool: win.opponentSchool,
    event: win.event,
    date: win.date,
    result: win.result,
    weight: win.weight,
    reason: win.reason,
  }))

  return NextResponse.json({ wins })
}
