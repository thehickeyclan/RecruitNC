/**
 * Public scholarship page copy for The Caden Perry Scholarship (final page spec).
 * Story/description body may still be overridden via Supabase `scholarships.description` for non-Caden fields.
 */

/** PRD standalone headline tagline — also mirrored from scholarships.tagline when seeded. */
export const CADEN_CLOSING_TAGLINE_FULLWIDTH = "The future is bright for those who refuse to quit."

/** “About Caden” — main biography on the public scholarship page. */
export const CADEN_ABOUT_PLACEHOLDER_BODY = `Caden Perry was the definition of a warrior. From the wrestling rooms of New Jersey, all the way to Eastern Europe in Estonia, to the deserts of Arizona, and finally the mats of North Carolina, Caden carried himself with grit, toughness, and heart far beyond his years. Wrestling was never just a sport to him — it was the foundation that built his character, his discipline, and his relentless mindset.

At just 13 years old, Caden was faced with the fight of his life when he was diagnosed with terminal brain cancer. A diagnosis that would break most people only revealed the incredible strength that lived inside of him. For more than three years, Caden battled every single day with courage that inspired everyone around him. Through surgeries, treatments, pain, and uncertainty, he refused to quit. He fought with the same mentality he learned on the wrestling mat — never back down, never surrender, and keep battling no matter how tough the situation becomes.

Wrestling taught Caden how to embrace adversity. It taught him that toughness is not about never feeling pain, but about continuing to move forward despite it. That warrior mentality became the driving force behind his fight. Even in the hardest moments, Caden showed unbelievable resilience, determination, and heart. He inspired teammates, coaches, family members, and entire communities with the way he carried himself through unimaginable hardship.

Though Caden's life was far too short, his legacy will live forever. His story is a reminder that true strength is measured not by victories on a scoreboard, but by the courage to keep fighting when life becomes unfair. Caden Perry showed the world what it means to be mentally tough, fearless, and selfless. He proved that a warrior's spirit can never be defeated.

At just 16 years old, Caden gained his eternal peace, but the impact he left behind will continue to motivate generations of wrestlers and young athletes to face adversity head on, embrace the struggle, and never stop fighting.`

/**
 * When Supabase row fields are empty, show these on the public page so deadlines and award amount are never blank for Year 1.
 */
export const CADEN_PUBLIC_PAGE_FALLBACKS = {
  award_amount_cents: 100_000,
  applications_open_date: "2026-08-01",
  applications_close_date: "2026-08-30",
  award_announcement_date: "2026-09-19",
} as const

/** Intent of the award — written to match the “About Caden” story on this page. Edit with family approval when copy changes. */
export const CADEN_AWARD_SPIRIT = `This award honors a North Carolina wrestler who carries the kind of warrior spirit Caden lived — grit, heart, and discipline forged on the mat and carried into life. For Caden, wrestling was never only wins and losses; it was the foundation that built his character and his relentless mindset. The recipient we seek has faced genuine adversity — on or off the mat — and refused to be defined by it.

They push forward when others might step back: through grueling practices, setbacks, pain, or uncertainty outside the gym. Caden showed us that toughness is not pretending hurt does not exist — it is choosing to keep moving anyway. That is the same mat mentality he carried into the hardest fight of his life: never back down, never surrender, keep battling when the situation is unbearably tough.

True strength, in the spirit of this award, is not measured by trophies alone. It shows in courage when life is unfair; in resilience teammates, coaches, and communities can see; and in the selfless way a young person carries hardship without losing heart.

This scholarship recognizes an athlete who embodies that mindset — who faces adversity head on, embraces the struggle, and never stops fighting — and who reminds us that a warrior spirit is defined by how you show up when it matters most.`

export const CADEN_WHO_CAN_BE_NOMINATED = `Any NC wrestler who is actively competing or training — middle school, high school, or club level. Any gender. Any program or affiliation. NC United membership is not required. There is no minimum record, ranking, or academic threshold.

Athletes cannot nominate themselves.`

export const CADEN_WHO_CAN_NOMINATE = `Coaches, parents, guardians, teachers, counselors, administrators, teammates, or community members. Nominators under 18 should partner with an adult.

If a parent is nominating their own child, a supporting reference from outside the immediate family is required — a coach, teacher, or community member who can independently validate the nomination.`

export const CADEN_APPLICATION_INTRO =
  "One submission. One question. Video is encouraged, but written nominations are welcome."

export const CADEN_APPLICATION_WRITTEN =
  "Written: 250–500 words responding to the question below."

export const CADEN_APPLICATION_VIDEO =
  "Video: 2–4 minutes. A simple phone video is perfect. What matters is authenticity, not production quality."

export const CADEN_APPLICATION_PROMPT_LABEL = "The question:"

export const CADEN_APPLICATION_PROMPT_QUOTE =
  "Describe a specific moment or period when this athlete faced genuine adversity — on or off the mat — and what their response revealed about their character. Use concrete examples. Tell us what you saw."

export const CADEN_APPLICATION_DETAILS = `The nomination also includes athlete and nominator contact details and one supporting reference. References are contacted only if the nomination reaches the finalist stage.

An optional 200-word field allows nominators to share any additional context the committee should know.`

export const CADEN_APPLICATION_AI_NOTE =
  "Authenticity matters more than polish. Generic nominations are less helpful than real details: what happened, who saw it, how the athlete responded, and why it mattered."

export const CADEN_REVIEW_PROCESS_STAGES: { title: string; body: string }[] = [
  {
    title: "Intake",
    body: "After nominations close on August 30, NC United reviews each submission for completeness. Eligible nominations move into review.",
  },
  {
    title: "Review",
    body: "The committee looks for a documented response to genuine adversity, character, impact on others, and a wrestling-forged mindset.",
  },
  {
    title: "Finalists",
    body: "Finalists are reviewed with the Perry family so the award stays true to Caden's legacy.",
  },
  {
    title: "Recipient",
    body: "The inaugural recipient is honored September 19 during the NC United Tournament of Champions in Apex.",
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
    title: "Response to adversity",
    body: "Evidence of facing real adversity — on or off the mat — and continuing forward.",
  },
  {
    title: "Character and integrity",
    body: "How coaches, teammates, and community members describe this athlete when no one is watching.",
  },
  {
    title: "Impact on others",
    body: "Competing for something bigger than themselves. Lifting others. Representing their program and community with integrity.",
  },
  {
    title: "Wrestling-forged mindset",
    body: "Evidence that wrestling is building something lasting — in the classroom, the community, and life beyond the sport.",
  },
]

export const CADEN_SELECTION_INTRO =
  "The award is not based on rankings, records, championships, recruiting status, or academic achievement. We are looking for the way a wrestler responds when life gets hard."

export const CADEN_SELECTION_FOOTNOTE =
  "Academic record, win-loss record, ranking, and school or club affiliation are not selection criteria."
