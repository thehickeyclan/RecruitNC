/**
 * Shared copy: NC United named funds are training-support stipends, not college scholarships.
 * Used on individual scholarship pages (all slugs).
 */

export const TRAINING_AWARD_TYPICAL_USES: string[] = [
  "Club or school wrestling dues and team fees",
  "Private lessons and small-group training",
  "Tournament entry, weigh-in, or dual fees",
  "Wrestling camps, clinics, or coaching sessions",
  "Season gear and equipment (shoes, headgear, singlet, training gear)",
  "Competition travel and lodging — documented and tied directly to scholastic or club competition",
]

export const TRAINING_AWARD_NOT_COLLEGE_PARAGRAPH =
  "This is a wrestling development award. It is not a college tuition scholarship, academic scholarship, or NCAA athletic scholarship. It does not guarantee admission or roster placement at any institution."

export function trainingAwardOpeningSentenceUsd(amountFormatted: string): string {
  return `One athlete receives ${amountFormatted} as a wrestling-support award — applied directly to documented wrestling-related expenses so they can keep training and competing at their highest level.`
}

export const TRAINING_AWARD_OPENING_NO_AMOUNT =
  "One athlete selected by the committee receives a wrestling-support award — assistance meant for documented wrestling-related expenses so the recipient can keep training and competing. The fund summary below lists the award amount when it is set."
