import "server-only"

import type { SupabaseClient } from "@supabase/supabase-js"

import { ANNOUNCED_PROGRAMS } from "@/lib/college-programs/announced"
import data from "@/lib/college-programs/programs-2026-27.json"
import { schoolLogoUrl } from "@/lib/college-programs/logo"
import { COLLEGE_DIVISIONS, DIVISION_SHORT, type CollegeMapSchool } from "@/lib/college-programs/types"
import { collegeFitFor, loadFamilyFitContext } from "@/lib/recruiting/college-fit"
import { milesBetween } from "@/lib/recruiting/family-fit"
import { pickStarter, type StarterCandidate } from "@/lib/recruiting/starter-picks"

export type StarterSchool = { id: string; name: string; level: string; place: string; logo: string | null; why: string }

const ALL = [...(data.schools as CollegeMapSchool[]), ...ANNOUNCED_PROGRAMS]

/**
 * Step 1's starter set: at most one college per level, each earned (lib/recruiting/starter-picks.ts).
 * Fit is the four parts from lib/recruiting/college-fit.ts, athletic included, plus projected roster
 * opportunity at the weight last competed in the arrival fall; in-state ahead, nearer home first
 * when scores tie. A starting point to look at, never a verdict. Fewer than five is fine.
 */
export async function starterSet(admin: SupabaseClient, userId: string, team: "mens" | "womens" | null, savedIds: string[]): Promise<StarterSchool[]> {
  const ctx = await loadFamilyFitContext(admin, userId, team)
  const saved = new Set(savedIds)
  const homeState = ctx.homeState
  // Without a home ZIP, "near" is measured from the middle of the family's state (its colleges' centre).
  const inState = ALL.filter((s) => s.state === homeState)
  const centre: [number, number] | null = ctx.home ?? (inState.length ? [inState.reduce((n, s) => n + s.latitude, 0) / inState.length, inState.reduce((n, s) => n + s.longitude, 0) / inState.length] : null)
  const byId = new Map(ALL.map((s) => [s.id, s]))
  const levels = COLLEGE_DIVISIONS.map((division) => ({
    level: DIVISION_SHORT[division],
    candidates: ALL.filter((s) => !saved.has(s.id) && s.programs.some((p) => p.division === division && (!team || p[team]))).map((s): StarterCandidate => {
      const fit = collegeFitFor(ctx, s, null)
      // Projected opportunity: nobody at that weight still on the roster in the fall the wrestler arrives. Inferred, and said so on the college page.
      const room = fit.room?.rows.find((r) => r.staying === 0) ?? null
      return {
        id: s.id,
        name: s.name,
        inState: s.state === homeState,
        miles: centre ? milesBetween(centre, [s.latitude, s.longitude]) : null,
        roomWeight: room ? room.weight : null,
        athletic: fit.lines.athletic.status,
        academic: fit.lines.academic.status,
        cost: fit.lines.cost.status,
        goals: fit.lines.goals.status,
      }
    }),
  }))
  const picks = pickStarter(levels).map((p) => ({ ...p, s: byId.get(p.id)! }))
  const logos = await Promise.all(picks.map((p) => schoolLogoUrl({ id: p.s.id, name: p.s.name }).catch(() => null)))
  return picks.map((p, i) => ({ id: p.s.id, name: p.s.name.replace(/\s*\([^)]*\)\s*/g, " ").trim(), level: p.level, place: `${p.s.city}, ${p.s.state}`, logo: logos[i], why: p.why }))
}
