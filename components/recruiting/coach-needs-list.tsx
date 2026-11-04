/**
 * "Programs recruiting your weight and class": coach-confirmed needs that fit a wrestler
 * (lib/recruiting/needs-server.ts loadNeedsForAthlete). Free to see: school, division, weight,
 * class. Evaluating and acting on them - My List, compare, cost, reach out - is the Command Center,
 * one tap away on each school's page.
 *
 * Every row says "Coach-confirmed": a college staff posted it. It is never a roster gap we worked
 * out, and never a roster spot or a scholarship.
 */
import Link from "next/link"
import { BadgeCheck, ChevronRight } from "lucide-react"

import type { FamilyNeed } from "@/lib/recruiting/needs-server"

const classes = (ys: number[]) => (ys.length === 1 ? `Class of ${ys[0]}` : `Classes of ${ys.join(", ")}`)

type ProgramRow = { key: string; program: string; mapSchoolId: string | null; division: string | null; weights: number[]; classYears: number[]; lookingFor: string[] }

/** One row per program: "Campbell University · D1 · 149 and 157 lbs · Classes of 2027, 2028". */
function byProgram(needs: FamilyNeed[]): ProgramRow[] {
  const rows = new Map<string, ProgramRow>()
  for (const n of needs) {
    const key = n.mapSchoolId ?? n.program
    const row = rows.get(key) ?? { key, program: n.program, mapSchoolId: n.mapSchoolId, division: n.division, weights: [], classYears: [], lookingFor: [] }
    row.weights = [...new Set([...row.weights, n.weight])].sort((a, b) => a - b)
    row.classYears = [...new Set([...row.classYears, ...n.classYears])].sort((a, b) => a - b)
    row.lookingFor = [...new Set([...row.lookingFor, ...n.lookingFor])]
    rows.set(key, row)
  }
  return [...rows.values()]
}

export function programCount(needs: FamilyNeed[]): number {
  return byProgram(needs).length
}

export function CoachNeedsList({ needs, compact = false }: { needs: FamilyNeed[]; compact?: boolean }) {
  return (
    <div>
      <ul>
        {byProgram(needs).map((n) => {
          const body = (
            <>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[14px] font-extrabold text-white">{n.program}</span>
                <span className="mt-0.5 block text-xs text-[#A8BBD1]">
                  {[n.division, `${n.weights.join(" and ")} lbs`, classes(n.classYears), ...(compact ? [] : n.lookingFor)].filter(Boolean).join(" · ")}
                </span>
              </span>
              <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] font-black uppercase tracking-wide text-emerald-300">
                <BadgeCheck className="h-3 w-3" aria-hidden /> Coach-confirmed
              </span>
              {n.mapSchoolId ? <ChevronRight className="h-4 w-4 shrink-0 text-white/40" aria-hidden /> : null}
            </>
          )
          return (
            <li key={n.key} className="border-b border-[#1a3a5f] last:border-b-0">
              {n.mapSchoolId ? (
                <Link href={`/recruiting/schools/${n.mapSchoolId}`} className="flex items-center gap-3 py-2.5 hover:bg-white/[0.03]">
                  {body}
                </Link>
              ) : (
                <div className="flex items-center gap-3 py-2.5">{body}</div>
              )}
            </li>
          )
        })}
      </ul>
      <p className="mt-2 text-[11px] leading-4 text-white/45">
        Coach-confirmed: the program&apos;s own staff posted that it is recruiting this weight and class. It is not an offer, a roster spot or a scholarship.
      </p>
    </div>
  )
}
