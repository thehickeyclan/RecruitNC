/**
 * Shared copy: NC United named funds are training-support stipends, not college scholarships.
 * Used on individual scholarship pages (all slugs).
 */

export const TRAINING_AWARD_TYPICAL_USES: string[] = [
  "Club or school wrestling dues and team fees tied to participation",
  "Tournament entry, weigh-in, or dual fees",
  "Wrestling camps, clinics, or coaching focused on skills and technique",
  "Season gear and equipment (shoes, headgear, singlet, necessary training gear)",
  "Travel or lodging when it is directly tied to scholastic or club competition — within reason and documented if requested",
]

export const TRAINING_AWARD_NOT_COLLEGE_PARAGRAPH =
  "This is a training support stipend for wrestling — not a college tuition scholarship, academic scholarship, financial aid package, or NCAA / NJCAA athletic scholarship. It does not guarantee admission or roster placement at any college or university. Recipients use the award for costs that keep them training and competing on their current pathway."

export function trainingAwardOpeningSentenceUsd(amountFormatted: string): string {
  return `One athlete selected by the committee receives ${amountFormatted} as a direct training support stipend — cash assistance meant for wrestling-related expenses so the recipient can keep training and competing.`
}

export const TRAINING_AWARD_OPENING_NO_AMOUNT =
  "One athlete selected by the committee receives a cash training support stipend — assistance meant for wrestling-related expenses so the recipient can keep training and competing. The fund summary below lists the award amount when it is set."
