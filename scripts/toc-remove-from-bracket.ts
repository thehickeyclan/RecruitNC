/**
 * Take a wrestler out of a locked bracket after weigh-ins, move everyone below him up a seed,
 * rebuild the draw, and repair TOC Madness picks the change made impossible.
 *
 *   NODE_PATH=$PWD/node_modules npx tsx --env-file=.env.local scripts/toc-remove-from-bracket.ts <weight> <athleteId> "<reason>"
 *
 * Written for Abdul-Jamil Zaggout missing weight at 133 on Friday: the 4 seed out, 5–8 up to 4–7,
 * and the 1 seed takes the bye the eight-man builder gives a seven-man field.
 *
 * Picks are repaired, not wiped. A pick is dropped only when it can no longer happen — the removed
 * wrestler anywhere, or a first-round pick naming someone no longer in that bout. Later-round picks
 * naming wrestlers still in the field stand; scoring already treats a pick of someone who never
 * reached that bout as simply wrong. Any entry that lost a pick is reopened so the app asks for it.
 */
import { createClient } from "@supabase/supabase-js"
import { lockBracketDraw } from "@/lib/toc/bracket-service"

const [weightArg, athleteId, reason] = process.argv.slice(2)
const weight = Number(weightArg)
if (!weight || !athleteId) throw new Error("usage: <weight> <athleteId> <reason>")

void (async () => {
  const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

  const { data: field } = await admin
    .from("toc_invitations")
    .select("id,athlete_id,seed")
    .eq("weight_class", weight)
    .eq("status", "confirmed")
  const out = (field ?? []).find((row) => row.athlete_id === athleteId)
  if (!out) throw new Error("That wrestler is not confirmed at this weight.")

  // 1. Withdraw.
  const now = new Date().toISOString()
  const withdrawn = await admin
    .from("toc_invitations")
    .update({ status: "withdrew", status_reason: "other", status_reason_other: reason || "Did not make weight", seed: null, updated_at: now })
    .eq("id", out.id)
  if (withdrawn.error) throw new Error(`withdraw: ${withdrawn.error.message}`)

  // 2. Everyone seeded below moves up one, lowest first so no two share a seed mid-way.
  const below = (field ?? [])
    .filter((row) => row.id !== out.id && (row.seed ?? 0) > (out.seed ?? 99))
    .sort((a, b) => a.seed - b.seed)
  for (const row of below) {
    const moved = await admin.from("toc_invitations").update({ seed: row.seed - 1, updated_at: now }).eq("id", row.id)
    if (moved.error) throw new Error(`reseed ${row.athlete_id}: ${moved.error.message}`)
  }

  // 3. Rebuild the locked draw exactly the way locking builds it.
  const locked = await lockBracketDraw(admin, weight)
  if ("error" in locked) throw new Error(`lock: ${locked.error}`)
  const draw = locked.draw
  const byId = new Map(draw.participants.map((p) => [p.athleteId, p]))
  const label = (slot: any) => (slot.kind === "athlete" ? `${byId.get(slot.athleteId)?.seed} ${byId.get(slot.athleteId)?.name}` : slot.kind)
  const firstRound = draw.bouts.filter((b) => b.side === "winners" && /round 1/i.test(b.roundLabel))
  for (const b of firstRound) console.log(`bout ${b.boutNumber}: ${label(b.top)} vs ${label(b.bottom)}`)

  // 4. Repair Madness picks.
  const roundOne = new Map<number, Set<string>>()
  for (const b of firstRound) {
    roundOne.set(
      b.boutNumber,
      new Set([b.top, b.bottom].filter((s: any) => s.kind === "athlete").map((s: any) => s.athleteId)),
    )
  }
  const inField = new Set(draw.participants.map((p) => p.athleteId))
  const { data: entries } = await admin.from("toc_pool_entries").select("id,picks,submitted").eq("weight_class", weight)
  let touched = 0
  let dropped = 0
  for (const entry of entries ?? []) {
    const picks = { ...(entry.picks as Record<string, string>) }
    let changed = false
    for (const [bout, pick] of Object.entries(picks)) {
      const r1 = roundOne.get(Number(bout))
      if (!inField.has(pick) || (r1 && !r1.has(pick))) {
        delete picks[bout]
        changed = true
        dropped++
      }
    }
    if (!changed) continue
    touched++
    const updated = await admin
      .from("toc_pool_entries")
      .update({ picks, submitted: false, submitted_at: null, updated_at: now })
      .eq("id", entry.id)
    if (updated.error) throw new Error(`entry ${entry.id}: ${updated.error.message}`)
  }
  console.log(`madness: ${touched} of ${(entries ?? []).length} entries reopened, ${dropped} impossible picks dropped`)
})()
