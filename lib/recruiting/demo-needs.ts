import "server-only"

import { cookies } from "next/headers"

import { mapSchoolIdFor } from "@/lib/college-programs/load"
import type { RecruitingNeed } from "@/lib/recruiting/needs"

/**
 * Product screenshots of recruiting needs on a developer's machine (like ./demo-family.ts): with
 * the `demo-needs=1` cookie, a coach's needs and the needs a family sees come from this fixture
 * instead of the table. Nothing is written, so no family is ever shown a need nobody posted. The
 * matching wrestlers underneath are real. Never in a production build.
 */
export async function isDemoNeeds(): Promise<boolean> {
  if (process.env.NODE_ENV === "production") return false
  try {
    return (await cookies()).get("demo-needs")?.value === "1"
  } catch {
    return false
  }
}

const ago = (days: number) => new Date(Date.now() - days * 86_400_000).toISOString()

function need(id: string, programName: string, n: Partial<RecruitingNeed>): RecruitingNeed {
  return {
    id,
    schoolId: null,
    programName,
    mapSchoolId: mapSchoolIdFor(programName),
    postedBy: "demo",
    gender: "Male",
    weight: 149,
    classYears: [2027, 2028],
    minGpa: null,
    maxMiles: null,
    resultsLevel: "any",
    confirmedAt: ago(3),
    clearedAt: null,
    createdAt: ago(3),
    ...n,
  }
}

/** The coach's own needs on the page: one live, one filtered, one going stale. */
export function demoProgramNeeds(programName: string): RecruitingNeed[] {
  return [
    need("00000000-0000-4000-8000-000000000149", programName, { weight: 149, classYears: [2027, 2028] }),
    need("00000000-0000-4000-8000-000000000157", programName, { weight: 157, classYears: [2027], minGpa: 3, maxMiles: 500, resultsLevel: "state_placer", confirmedAt: ago(12), createdAt: ago(40) }),
    need("00000000-0000-4000-8000-000000000285", programName, { weight: 285, classYears: [2027, 2028], confirmedAt: ago(66), createdAt: ago(66) }),
  ]
}

/** Needs from several programs, for the family side; the caller filters them to the wrestler. */
export function demoFamilyNeeds(): RecruitingNeed[] {
  const out: RecruitingNeed[] = []
  for (const [program, weights] of [
    ["Campbell University", [149, 157, 165]],
    ["University of Mount Olive", [141, 149, 157]],
    ["Ferrum College", [157, 165]],
    ["Belmont Abbey College", [149, 157]],
  ] as const) {
    for (const w of weights) out.push(need(`demo-${program}-${w}`, program, { weight: w, classYears: [2027, 2028, 2029], resultsLevel: w === 157 && program.startsWith("Campbell") ? "state_placer" : "any" }))
  }
  for (const [program, weights] of [["University of Mount Olive", [110, 117, 124]], ["Emmanuel University", [117, 124]]] as const) {
    for (const w of weights) out.push(need(`demo-${program}-w${w}`, program, { gender: "Female", weight: w, classYears: [2027, 2028, 2029] }))
  }
  return out
}
