import "server-only"

import type { SupabaseClient } from "@supabase/supabase-js"

import { ANNOUNCED_PROGRAMS } from "@/lib/college-programs/announced"
import data from "@/lib/college-programs/programs-2026-27.json"
import { schoolLogoUrl } from "@/lib/college-programs/logo"
import { COLLEGE_DIVISIONS, DIVISION_SHORT, type CollegeMapSchool } from "@/lib/college-programs/types"
import { collegeFitFor, loadFamilyFitContext } from "@/lib/recruiting/college-fit"
import { fitScore, milesBetween } from "@/lib/recruiting/family-fit"

export type StarterSchool = { id: string; name: string; level: string; place: string; logo: string | null; why: string }

const ALL = [...(data.schools as CollegeMapSchool[]), ...ANNOUNCED_PROGRAMS]
/** Five colleges, one at each level (Matt, 5 Nov 2026: "Two at every level" beside "Start with 5" read as a contradiction). */
const SHORTLIST = 5

/**
 * Step 1's starter set: five colleges, one at each level, that fit the wrestler best on what we hold -
 * academic, cost, the family's own goals (lib/recruiting/college-fit.ts) and roster room at the
 * weight last competed (inferred, labelled "(roster)"), in-state ahead, and
 * nearer home first when scores tie. A starting point to look at, never a verdict; only for a family with almost
 * nothing saved.
 */
export async function starterSet(admin: SupabaseClient, userId: string, team: "mens" | "womens" | null, savedIds: string[]): Promise<StarterSchool[]> {
  const ctx = await loadFamilyFitContext(admin, userId, team)
  const saved = new Set(savedIds)
  const homeState = ctx.homeState
  // Without a home ZIP, "near" is measured from the middle of the family's state (its colleges' centre).
  const inState = ALL.filter((s) => s.state === homeState)
  const centre: [number, number] | null = ctx.home ?? (inState.length ? [inState.reduce((n, s) => n + s.latitude, 0) / inState.length, inState.reduce((n, s) => n + s.longitude, 0) / inState.length] : null)
  const picks: Array<{ s: CollegeMapSchool; level: string; why: string }> = []
  const spare: Array<{ s: CollegeMapSchool; level: string; why: string; score: number }> = []
  for (const division of COLLEGE_DIVISIONS) {
    const pool = ALL.filter((s) => !saved.has(s.id) && s.programs.some((p) => p.division === division && (!team || p[team])))
    const scored = pool.map((s) => {
      const fit = collegeFitFor(ctx, s, null)
      const miles = centre ? milesBetween(centre, [s.latitude, s.longitude]) : null
      const lines = [fit.lines.academic, fit.lines.cost, fit.lines.goals]
      // Room at the weight last wrestled in the arrival fall: nobody there still on the roster (the "what changed" rule). Inferred, and said so.
      const room = fit.room?.rows.find((r) => r.staying === 0) ?? null
      const why = room ? `Room at ${room.weight} (roster)` : fit.lines.academic.status === "fit" ? "Academic fit" : s.state === homeState ? "In your state" : fit.lines.cost.status === "fit" ? "Fits the budget" : "Worth a look"
      return { s, score: fitScore(lines) + (s.state === homeState ? 1 : 0) + (room ? 1 : 0), miles, why }
    })
    scored.sort((a, b) => b.score - a.score || (a.miles ?? 9e9) - (b.miles ?? 9e9) || a.s.name.localeCompare(b.s.name))
    const [best, ...rest] = scored
    if (best && !picks.some((p) => p.s.id === best.s.id)) picks.push({ s: best.s, level: DIVISION_SHORT[division], why: best.why })
    for (const x of rest.slice(0, 2)) spare.push({ s: x.s, level: DIVISION_SHORT[division], why: x.why, score: x.score })
  }
  // A level with no program for this team (a women's level, say): the next best anywhere, so it is always five.
  spare.sort((a, b) => b.score - a.score)
  for (const x of spare) {
    if (picks.length >= SHORTLIST) break
    if (!picks.some((p) => p.s.id === x.s.id)) picks.push(x)
  }
  picks.splice(SHORTLIST)
  const logos = await Promise.all(picks.map((p) => schoolLogoUrl({ id: p.s.id, name: p.s.name }).catch(() => null)))
  return picks.map((p, i) => ({ id: p.s.id, name: p.s.name.replace(/\s*\([^)]*\)\s*/g, " ").trim(), level: p.level, place: `${p.s.city}, ${p.s.state}`, logo: logos[i], why: p.why }))
}
