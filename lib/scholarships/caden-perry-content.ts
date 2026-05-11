/**
 * Public scholarship page copy for The Caden Perry Scholarship (final page spec).
 * Story/description body may still be overridden via Supabase `scholarships.description` for non-Caden fields.
 */

/** PRD standalone headline tagline — also mirrored from scholarships.tagline when seeded. */
export const CADEN_CLOSING_TAGLINE_FULLWIDTH = "The future is bright for those who refuse to quit."

/** “About Caden” — main biography on the public scholarship page. */
export const CADEN_ABOUT_PLACEHOLDER_BODY = `Caden Perry was the definition of a warrior. From the wrestling rooms of New Jersey, to the deserts of Arizona, and finally the mats of North Carolina, Caden carried himself with grit, toughness, and heart far beyond his years. Wrestling was never just a sport to him — it was the foundation that built his character, his discipline, and his relentless mindset.

At just 13 years old, Caden was faced with the fight of his life when he was diagnosed with terminal brain cancer. A diagnosis that would break most people only revealed the incredible strength that lived inside of him. For more than three years, Caden battled every single day with courage that inspired everyone around him. Through surgeries, treatments, pain, and uncertainty, he refused to quit. He fought with the same mentality he learned on the wrestling mat — never back down, never surrender, and keep battling no matter how tough the situation becomes.

Wrestling taught Caden how to embrace adversity. It taught him that toughness is not about never feeling pain, but about continuing to move forward despite it. That warrior mentality became the driving force behind his fight. Even in the hardest moments, Caden showed unbelievable resilience, determination, and heart. He inspired teammates, coaches, family members, and entire communities with the way he carried himself through unimaginable hardship.

Though Caden's life was far too short, his legacy will live forever. His story is a reminder that true strength is measured not by victories on a scoreboard, but by the courage to keep fighting when life becomes unfair. Caden Perry showed the world what it means to be mentally tough, fearless, and selfless. He proved that a warrior's spirit can never be defeated.

At just 16 years old, Caden gained his eternal peace, but the impact he left behind will continue to motivate generations of wrestlers and young athletes to face adversity head on, embrace the struggle, and never stop fighting.`

/**
 * When Supabase row fields are empty, show these on the public page so deadlines and award amount are never blank for Year 1.
 */
export const CADEN_PUBLIC_PAGE_FALLBACKS = {
  award_amount_cents: 100_000,
  applications_open_date: "2026-05-15",
  applications_close_date: "2026-05-31",
  award_announcement_date: "2026-06-15",
} as const

/** Shown above the spirit-of-the-award body (not labeled “verbatim”). */
export const CADEN_SPIRIT_ATTRIBUTION = "Words from Justin Perry"

/** Intent of the award — Perry family voice (edit only with family approval). */
export const CADEN_AWARD_SPIRIT = `This scholarship is awarded to a student-athlete who embodies the true spirit of scholastic wrestling — someone who has faced adversity head-on and refused to be defined by it. Wrestling is not just a sport; it is a test of character, resilience, and inner strength. The recipient of this award has demonstrated an unwavering commitment to growth, even in the face of hardship, setbacks, and challenging circumstances.

Through long practices, tough losses, and demanding expectations, this individual has shown the mental toughness required to push forward when others might step back. They understand that success is not measured solely by victories on the mat, but by the courage to continue when things are difficult and the discipline to improve every single day.

This athlete has embraced adversity as an opportunity — not an obstacle — using it as fuel to grow stronger, more focused, and more determined. Their willingness to persevere through trying times reflects a maturity beyond their years and a mindset that will carry them far beyond the sport of wrestling.

This award recognizes not only athletic effort, but personal development — the ability to rise, adapt, and thrive in even the toughest conditions. It honors a young individual who represents resilience, grit, and the relentless pursuit of excellence.`

export const CADEN_WHO_CAN_BE_NOMINATED = `Any NC wrestler who is actively competing or training — middle school, high school, or club level. Any gender. Any program or affiliation. NC United membership is not required. There is no minimum record, ranking, or academic threshold.

Athletes cannot nominate themselves.`

export const CADEN_WHO_CAN_NOMINATE = `Coaches, parents, guardians, teachers, counselors, administrators, teammates, or community members. Nominators under 18 should partner with an adult.

If a parent is nominating their own child, a supporting reference from outside the immediate family is required — a coach, teacher, or community member who can independently validate the nomination.`

export const CADEN_APPLICATION_INTRO =
  "One submission. One prompt. Written or video — whichever best captures this athlete's story."

export const CADEN_APPLICATION_WRITTEN =
  "Written: 400–600 words responding to the prompt below."

export const CADEN_APPLICATION_VIDEO =
  "Video: 3–5 minutes. Film yourself speaking directly to the committee. No production required — a phone video is fine. What matters is authenticity, not quality."

export const CADEN_APPLICATION_PROMPT_LABEL = "The prompt:"

export const CADEN_APPLICATION_PROMPT_QUOTE =
  "Describe a specific moment or period when this athlete faced genuine adversity — on or off the mat — and what their response revealed about their character. Use concrete examples. Tell us what you saw."

export const CADEN_APPLICATION_DETAILS = `The application also includes athlete and nominator contact details and one supporting reference. References are contacted only if the nomination reaches the finalist stage.

An optional 200-word field allows nominators to share any additional context the committee should know.`

export const CADEN_APPLICATION_AI_NOTE = `A note on AI:
We strongly encourage nominators to write or record in their own voice. AI-generated essays are easy to identify and difficult to feel. The committee is looking for real moments told by real people who witnessed them. The most powerful nominations will be imperfect, specific, and true. Please write your own words.`

export const CADEN_REVIEW_PROCESS_STAGES: { title: string; body: string }[] = [
  {
    title: "Intake",
    body: "After applications close on May 31, NC United reviews each submission for completeness. Every eligible nomination receives a blind-review ID. Athlete names and school affiliations are removed before voting members see any application.",
  },
  {
    title: "Blind scoring",
    body: "Each voting member scores independently on the five weighted criteria (1–5 per criterion). Scores remain private until every voting member has submitted — then all scores are revealed simultaneously for deliberation.",
  },
  {
    title: "Finalists",
    body: "The top applications by combined score advance to the finalist stage. At this point names are revealed to the full panel. The Perry family representative reviews finalists and provides written commentary before the final vote.",
  },
  {
    title: "Recipient selection",
    body: "Voting members select one recipient by majority vote. All applicants are notified with respect and care. Raw scores are never shared.",
  },
]

/** Standing committee as listed on the Caden Perry scholarship page (may differ from hub until roster is unified). */
export const CADEN_PAGE_STANDING_COMMITTEE: { name: string; role: string; seat: string }[] = [
  { name: "Matt Hickey", role: "NC United Co-Founder", seat: "Voting" },
  { name: "Jonathan Sutton", role: "NC Wrestling Official · Diversity & Inclusion", seat: "Voting" },
  { name: "LaTasha Robinson Stinson", role: "Educator · Wrestling Family", seat: "Voting" },
  { name: "Dave Pyper", role: "Educator · Athens Drive", seat: "Voting" },
]

export const CADEN_PAGE_FAMILY_REPRESENTATIVE: { name: string; role: string; seat: string } = {
  name: "Justin Perry",
  role: "Caden's father",
  seat: "Advisory",
}

export const CADEN_COMMITTEE_NOTE_JUSTIN = `Justin Perry reviews finalist applications and provides written commentary before the final vote. He does not score blind applications. His voice carries the spirit of this award.`

export const CADEN_COMMITTEE_NOTE_BLIND =
  "All voting members score applications blind — names and school affiliations removed before review begins."

export type SelectionCriterionCard = {
  title: string
  body: string
}

export const CADEN_SELECTION_CRITERIA_CARDS: SelectionCriterionCard[] = [
  {
    title: "Resilience",
    body: "Evidence of facing real adversity — on or off the mat — and continuing forward.",
  },
  {
    title: "Character",
    body: "How coaches, teammates, and community members describe this athlete when no one is watching.",
  },
  {
    title: "Perseverance",
    body: "A consistent pattern of showing up when circumstances were difficult.",
  },
  {
    title: "Heart",
    body: "Competing for something bigger than themselves. Lifting others. Representing their program and community with integrity.",
  },
  {
    title: "Mindset",
    body: "Evidence that wrestling is building something lasting — in the classroom, the community, and life beyond the sport.",
  },
]

export const CADEN_SELECTION_INTRO =
  "Applications are scored on five criteria. Athletic record and win-loss are not factors."

export const CADEN_SELECTION_FOOTNOTE =
  "Academic record, win-loss record, ranking, and school or club affiliation are not selection criteria."
