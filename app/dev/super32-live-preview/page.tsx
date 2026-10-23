/**
 * Rehearsal: the Command Center rendered from the 2025 Flo export. 2025 has no seeds, so each
 * bracket's 2025 finishers stand in as seeds 1-8. Never in production.
 *   /dev/super32-live-preview            the finished 2025 event
 *   /dev/super32-live-preview?empty=1    before any results (seeds only)
 */
import fs from "node:fs"
import path from "node:path"
import { notFound } from "next/navigation"
import { createAdminClient } from "@/lib/supabase/admin"
import { parseFloExport, splitDivisions, summarizeEntrants, type SeedRow } from "@/lib/super32-live/engine"
import { computeSnapshot } from "@/lib/super32-live/snapshot"
import { CommandCenter } from "@/app/super32/live/command-center"

export const dynamic = "force-dynamic"

export default async function Super32LivePreview({ searchParams }: { searchParams: Promise<{ empty?: string }> }) {
  if (process.env.NODE_ENV === "production") notFound()
  const { empty } = await searchParams
  const supabase = createAdminClient()
  const csv = fs.readFileSync(path.join(process.cwd(), "scripts/data/super32-2025-flo-export.csv"), "utf8")

  const { data: girls } = await supabase.from("other_tournament_bouts").select("athlete_name, weight_class").eq("event_key", "super32-2025").eq("gender", "F").limit(1000)
  const hints = (girls ?? []).map((r) => ({ gender: "girls" as const, weight: String(r.weight_class), name: String(r.athlete_name), state: "NC" }))

  const split = splitDivisions(parseFloExport(csv), hints)
  const everyone = summarizeEntrants(split.bouts, { seeds: [], credentials: [], seedsFinal: false }, () => true)
  const seeds: SeedRow[] = everyone.filter((e) => e.placement).map((e) => ({ gender: e.gender, weight: e.weight, seed: e.placement!, name: e.name, state: e.team }))

  const { data } = await computeSnapshot(supabase, "super32-2025-rehearsal", { floContent: empty ? null : csv, seeds, seedsFinal: true, prev: null, hints })
  const { boutSeenAt: _a, unresolved: _b, unmatched: _c, brackets: _d, ...pub } = data
  return <CommandCenter initial={{ ...pub, publishedAt: data.generatedAt }} />
}
