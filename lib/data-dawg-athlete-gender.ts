export type AthleteGender = "Male" | "Female" | null

export type AthletePronouns = {
  subject: "he" | "she" | "they"
  object: "him" | "her" | "them"
  possessive: "his" | "her" | "their"
}

export function normalizeAthleteGender(value: unknown): AthleteGender {
  const gender = String(value ?? "").trim().toLowerCase()
  if (["male", "m", "man", "men", "boy", "boys"].includes(gender)) return "Male"
  if (["female", "f", "woman", "women", "girl", "girls"].includes(gender)) return "Female"
  return null
}

export function athletePronouns(gender: AthleteGender): AthletePronouns {
  if (gender === "Male") return { subject: "he", object: "him", possessive: "his" }
  if (gender === "Female") return { subject: "she", object: "her", possessive: "her" }
  return { subject: "they", object: "them", possessive: "their" }
}

export function athleteGenderWritingNote(name: string, gender: AthleteGender): string {
  if (gender === "Male") {
    return `${name}'s recorded gender is Male. Use he/him/his pronouns. Never infer gender from a name.`
  }
  if (gender === "Female") {
    return `${name}'s recorded gender is Female. Use she/her pronouns. Never infer gender from a name.`
  }
  return `No gender is recorded for ${name}. Never infer gender from a name; repeat the athlete's name or use they/them/their pronouns.`
}
