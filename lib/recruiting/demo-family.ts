import "server-only"

import { cookies } from "next/headers"
import type { FamilyFitProfile } from "@/lib/recruiting/family-fit"

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
