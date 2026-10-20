import type { StarRating } from "@/lib/athlete-star-rating"

/**
 * What a star means, as a college level (Matt, 20 Oct 2026): the star is RecruitNC's projection of
 * the level a wrestler's results point to, and Scout says it honestly when a family asks what
 * division to consider ("Scout needs to be honest and transparent").
 *
 * Worked out here, never by the model: Scout is handed the finished sentence. Stars exist only for
 * the rated classes (boys, seniors and juniors; see isRatedClass), so a younger wrestler or a girl
 * gets "too early" / "not yet", never a guess.
 */
export const STAR_LEVEL: Record<number, string> = {
  5: "Division I, Tier 1",
  4: "Division I Tier 2, and the top Division II and Division III programs",
  3: "Division II and the top Division III programs",
  2: "Division III, NAIA and junior college",
  1: "Division III, NAIA and junior college",
}

/** The plain credentials that lift a wrestler to the next star (the rating's own floors). */
const NEXT_STEP: Record<number, string> = {
  1: "placing at the state tournament",
  2: "a top-10 class ranking, or placing at states while beating three or more state champions",
  3: "a winning record at Super 32, an NHSCA All-American finish, or a win over a nationally ranked opponent",
  4: "a national ranking together with a top-eight finish at Super 32",
}

export function projectedLevelFacts(
  first: string,
  rating: StarRating | null,
  why: { female: boolean },
): string {
  if (!rating) {
    if (why.female)
      return `${first}: RecruitNC does not project a college level for women's wrestling yet (our girls' national results are not complete enough to be fair). For "what division": give where wrestlers with the same standing went, and say that plainly.`
    return `${first}: too early for RecruitNC's projected college level; we project one for juniors and seniors, when the results that decide recruiting are in. For "what division": give where wrestlers with the same standing went, and what would open more levels.`
  }
  const stars = Math.max(1, Math.min(5, rating.stars))
  const thin = rating.provisional || stars === 1 ? " Results on file are still thin, so this can move quickly." : ""
  const next = NEXT_STEP[stars] ? ` What would raise it: ${NEXT_STEP[stars]}.` : " This is the top of our scale."
  return `RecruitNC's projected college level for ${first}, from the results on file: ${STAR_LEVEL[stars]}.${thin}${next} It is our assessment of results, not a coach's offer, and grades, growth and this season can change it.`
}

/*
 * Athletic admission (Matt, 20 Oct 2026): a college's published admission figures describe its
 * whole applicant pool. A recruited wrestler is admitted through athletic admissions, with the
 * coaching staff's support, often well below them: UNC's admitted students average above a 4.0,
 * yet recruited athletes are admitted with a 3.0 or above; NC State the same. Without this line
 * Scout read UNC's numbers and told a 3.3 wrestler he was out of range.
 *
 * Per-college guidance only where Matt has given it; every other college gets the general rule.
 */
const ATHLETIC_ADMISSION_GPA: Record<string, string> = {
  "university-of-north-carolina-at-chapel-hill-north-carolina": "a 3.0 GPA or higher",
  "north-carolina-state-university-nc-state": "a 3.0 GPA or higher",
}

export function athleticAdmissionFacts(schoolId: string, schoolName: string): string {
  const gpa = ATHLETIC_ADMISSION_GPA[schoolId]
  return (
    `Athletic admission: the admission figures describe all applicants. A recruited wrestler is admitted through athletic admissions, with the coaching staff's support, often well below them` +
    (gpa ? `; at ${schoolName}, recruited athletes are admitted with ${gpa} (RecruitNC's guidance).` : ".") +
    ` Without a coach's support, the published figures are what an applicant is measured against. The coach decides whether to support an applicant, so the way in is through the coach.`
  )
}
