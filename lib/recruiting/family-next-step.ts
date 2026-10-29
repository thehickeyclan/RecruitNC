/**
 * The family funnel on RecruitWrestlers, one step at a time (Matt, 29 Oct 2026): a free profile
 * with an account, then GPA and a cell so coaches can judge and reach him, then Insider to see the
 * rankings and which colleges looked, then the Recruiting Command Center.
 */
export type FamilyNextStep = {
  step: "claim" | "complete" | "insider" | "command_center" | null
  athleteId: string | null
  href?: string
  label?: string
}

export function familyNextStep(input: {
  signedIn: boolean
  athleteId?: string | null
  hasGpa?: boolean
  hasCell?: boolean
  insider?: boolean
  commandCenter?: boolean
}): FamilyNextStep {
  const athleteId = input.athleteId ?? null
  if (!input.signedIn || !athleteId) return { step: "claim", athleteId, href: "/create-profile", label: "Claim your free profile" }
  if (!input.hasGpa || !input.hasCell) {
    const what = !input.hasGpa && !input.hasCell ? "GPA and cell" : !input.hasGpa ? "GPA" : "cell"
    return { step: "complete", athleteId, href: `/profile-setup?id=${encodeURIComponent(athleteId)}`, label: `Add your ${what}` }
  }
  if (!input.insider) return { step: "insider", athleteId, href: "/membership#insider", label: "Get Insider" }
  if (!input.commandCenter) return { step: "command_center", athleteId, href: "/command-center", label: "Upgrade to Command Center" }
  return { step: null, athleteId }
}
