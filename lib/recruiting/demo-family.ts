import "server-only"

import { cookies } from "next/headers"
import type { FamilyFitProfile } from "@/lib/recruiting/family-fit"
import type { FamilySets } from "@/lib/recruiting/priorities/sharing"

/**
 * An invented family for product screenshots (Matt, 29 Oct 2026: the Command Center sales page
 * should show the real screens, as the coach page does). Only on a developer's machine: a
 * production build never reads the cookie, so no visitor can turn it on. The pages that use it
 * (college compare, a college's page, My Colleges) compute everything - fit, net price, roster
 * room, distance - from these facts instead of a real family's.
 */
export async function isDemoFamily(): Promise<boolean> {
  if (process.env.NODE_ENV === "production") return false
  try {
    return (await cookies()).get("demo-family")?.value === "1"
  } catch {
    return false
  }
}

/** Jordan: class of 2028, last competed at 157, an NC state placer, 3.7 GPA, 1240 SAT, engineering, Raleigh. */
export const DEMO_FAMILY = {
  first: "Jordan",
  sat: 1240,
  act: null as number | null,
  weight: 157,
  classYear: 2028,
  gpa: 3.7,
  homeState: "NC",
  standing: { tier: "state-placer" as const, national: false },
  profile: {
    majors: ["14"],
    budget: 30000,
    homeZip: "27609",
    maxMiles: 400,
    size: "medium",
    settings: ["suburb", "town"],
  } satisfies FamilyFitProfile,
}

/** Jordan's parent's answers to What matters to your family, for the college page's fit lines. No major: the sales page leaves majors out (Matt, 6 Nov 2026). */
export const DEMO_SURVEY: FamilySets = {
  parent: {
    id: "example-parent",
    respondent: "parent",
    version: 1,
    completedAt: "2026-11-01",
    answers: [
      { key: "divisions", value: { D1: "interested", D2: "interested", D3: "open", NAIA: "open" }, sharing: "shared", marker: null },
      { key: "distance", value: "day", sharing: "shared", marker: null },
      { key: "home_zip", value: DEMO_FAMILY.profile.homeZip, sharing: "private", marker: null },
      { key: "school_feel", value: ["medium", "suburb", "town"], sharing: "shared", marker: null },
      { key: "budget", value: "20_35", sharing: "constraint", marker: null },
    ],
  },
  athlete: null,
}
