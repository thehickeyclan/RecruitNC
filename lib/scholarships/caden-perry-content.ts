/**
 * Public scholarship page copy for The Caden Perry Scholarship (approved narrative blocks).
 * Story/description body remains in Supabase `scholarships.description` until family signs off.
 */

/** PRD standalone headline tagline — also mirrored from scholarships.tagline when seeded. */
export const CADEN_CLOSING_TAGLINE_FULLWIDTH = "The future is bright for those who refuse to quit."

/**
 * Placeholder until Perry family approves final wording — swap / augment via Supabase description later if preferred.
 */
export const CADEN_ABOUT_PLACEHOLDER_BODY = `This scholarship was established in memory of Caden Perry — a North Carolina wrestler who began competing at age six, faced a terminal diagnosis at thirteen, and spent three more years proving that the mat builds something medicine cannot measure.`

/** Signals fuller biography is forthcoming — keep until family approves expanded story. */
export const CADEN_ABOUT_COMING_SOON_LINE =
  "More about Caden's story coming soon — shared with the blessing of his family."

/**
 * When Supabase row fields are empty, show these on the public page so deadlines and award amount are never blank for Year 1.
 * Update seed data when possible so CMS stays source of truth.
 */
export const CADEN_PUBLIC_PAGE_FALLBACKS = {
  award_amount_cents: 100_000,
  applications_open_date: "2026-05-15",
  applications_close_date: "2026-05-31",
  award_announcement_date: "2026-06-15",
} as const

/**
 * Non-voting advisor for this fund only. Shared voting committee lives on `/fundraising/scholarships#selection-committee`.
 */
export const CADEN_FAMILY_ADVISORY_MEMBER = {
  name: "Justin Perry",
  seatTitle: "Family representative (this scholarship only)",
  connection: "Caden's father — commentary on finalists; does not score blind applications",
} as const

export const CADEN_ELIGIBILITY_BODY = `Eligible nominees are North Carolina wrestlers who are actively competing or training — middle school, high school, or club; any gender; any program or affiliation. NC United membership is not required. There is no minimum record, ranking, or academic threshold.

Athletes may not nominate themselves. The nominator and the athlete must be different people.

Explicitly not used in selection: win–loss record, state or national ranking, recruiting attention, school or club affiliation, financial need, or NC United membership.`

export const CADEN_NOMINATORS_BODY = `Anyone in the wrestling community may nominate a worthy athlete: coaches, parents or guardians, teachers, counselors, administrators, teammates, or community members (nominators under 18 should partner with an adult).

If a parent nominates their own child, a second adult reference outside the immediate household is required (coach, teacher, counselor, or community member) who can independently validate the nomination.`

export const CADEN_APPLICATION_ESSAY_SUMMARY = `The application includes athlete and nominator details, a supporting reference, and one essay (400–600 words) answering a single prompt — written so reviewers see concrete moments, not a list of accolades.

Prompt: "Describe a specific moment or period when this athlete faced genuine adversity — on or off the mat — and what their response revealed about their character. Use concrete examples. Tell us what you saw."

Optional: up to 200 words of additional context for the committee. References are contacted only if an applicant reaches the finalist stage.`

export const CADEN_REVIEW_PROCESS_STAGES: { title: string; body: string }[] = [
  {
    title: "Intake",
    body: "After applications close, NC United checks each submission for completeness. Eligible nominations receive a blind-review identifier; athlete names and schools are stripped from materials voting members see.",
  },
  {
    title: "Blind scoring",
    body: "Each voting member scores independently on the five weighted criteria (1–5 each). Scores stay private until every voting member has submitted — then totals are revealed together for deliberation.",
  },
  {
    title: "Finalists & family advisory",
    body: "Top applications by combined score advance. Names are then visible to the full panel. The Perry family representative (advisory) may provide written commentary on finalists before the final vote.",
  },
  {
    title: "Recipient selection",
    body: "The voting members — three independent community voices plus one NC United vote — select one recipient by majority vote among ballots cast. NC United documents the outcome for the board record. Notifications respect confidentiality — applicants do not receive raw scores.",
  },
]

/** Justin Perry — award intent (verbatim; do not edit). */
export const CADEN_AWARD_DESCRIPTION_VERBATIM = `This scholarship is awarded to a student-athlete who embodies the true spirit of scholastic wrestling — someone who has faced adversity head-on and refused to be defined by it. Wrestling is not just a sport; it is a test of character, resilience, and inner strength. The recipient of this award has demonstrated an unwavering commitment to growth, even in the face of hardship, setbacks, and challenging circumstances.

Through long practices, tough losses, and demanding expectations, this individual has shown the mental toughness required to push forward when others might step back. They understand that success is not measured solely by victories on the mat, but by the courage to continue when things are difficult and the discipline to improve every single day.

This athlete has embraced adversity as an opportunity — not an obstacle — using it as fuel to grow stronger, more focused, and more determined. Their willingness to persevere through trying times reflects a maturity beyond their years and a mindset that will carry them far beyond the sport of wrestling.

This award recognizes not only athletic effort, but personal development — the ability to rise, adapt, and thrive in even the toughest conditions. It honors a young individual who represents resilience, grit, and the relentless pursuit of excellence.`

export type SelectionCriterionCard = {
  title: string
  weightLabel: string
  body: string
}

export const CADEN_SELECTION_CRITERIA_CARDS: SelectionCriterionCard[] = [
  {
    title: "Resilience",
    weightLabel: "30%",
    body: "Evidence of facing real adversity — on or off the mat — and continuing forward.",
  },
  {
    title: "Character",
    weightLabel: "25%",
    body: "How coaches, teammates, and community members describe this athlete when no one is watching.",
  },
  {
    title: "Perseverance",
    weightLabel: "20%",
    body: "A consistent pattern of showing up when circumstances were difficult.",
  },
  {
    title: "Heart",
    weightLabel: "15%",
    body: "Competing for something bigger than themselves. Lifting others. Representing their program and community with integrity.",
  },
  {
    title: "Mindset",
    weightLabel: "10%",
    body: "Evidence that wrestling is building something lasting — in the classroom, the community, and life beyond the sport.",
  },
]

export const CADEN_SELECTION_FOOTNOTE =
  "Academic record, win-loss record, ranking, and school or club affiliation are not selection criteria."
