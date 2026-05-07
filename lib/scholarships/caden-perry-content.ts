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
