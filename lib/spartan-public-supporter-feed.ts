import {
  aggregateSpartanByAthlete,
  buildStripeAthleteDisplayHintsByCode,
  publicSupporterDisplayName,
  resolveFundraisingAthleteRowName,
  resolvePublicAthleteCreditLabel,
  resolvePublicRunnerDisplay,
  type SpartanFayettevilleDonation,
} from "@/lib/spartan-fayetteville-stripe"

/**
 * Single pipeline for `/spartan` and admin fundraising so lists, labels, and rollups stay aligned.
 */
export type SpartanDonationWithPublicFields = SpartanFayettevilleDonation & {
  creditLabel: string | null
  publicDisplayName: string
  /** Same rules as public `raceParticipantName` (no admin-only donor fallback). */
  publicRaceParticipantName: string | null
}

export function attachPublicSupporterFields(
  rows: SpartanFayettevilleDonation[],
  codeToFullName: Map<string, string>,
): SpartanDonationWithPublicFields[] {
  const stripeHints = buildStripeAthleteDisplayHintsByCode(rows)
  return rows.map((r) => ({
    ...r,
    creditLabel: resolvePublicAthleteCreditLabel(r, codeToFullName, stripeHints),
    publicDisplayName: publicSupporterDisplayName(r),
    publicRaceParticipantName: resolvePublicRunnerDisplay(r),
  }))
}

export type SpartanPublicSupporterSummary = {
  totalRaisedCents: number
  giftCount: number
  raceEntryCount: number
  ncUnitedCommunityFundCents: number
  ncUnitedCommunityGiftCount: number
  ncUnitedCommunityRaceSignupCount: number
}

export function buildSpartanPublicSupporterSummary(rows: SpartanFayettevilleDonation[]): SpartanPublicSupporterSummary {
  const totalRaisedCents = rows.reduce((s, r) => s + r.amountCents, 0)
  const raceEntryCount = rows.filter((r) => r.raceParticipant).length
  const ncUnitedCommunityRows = rows.filter(
    (r) =>
      r.attribution === "general_nc_united" &&
      !r.athleteCode?.trim() &&
      !r.manualCreditName?.trim(),
  )
  return {
    totalRaisedCents,
    giftCount: rows.length,
    raceEntryCount,
    ncUnitedCommunityFundCents: ncUnitedCommunityRows.reduce((s, r) => s + r.amountCents, 0),
    ncUnitedCommunityGiftCount: ncUnitedCommunityRows.length,
    ncUnitedCommunityRaceSignupCount: ncUnitedCommunityRows.filter((r) => r.raceParticipant).length,
  }
}

export type SpartanPublicByAthleteRow = {
  athleteCode: string
  athleteName: string
  totalCents: number
  donationCount: number
  raceSignupCount: number
}

export function buildSpartanPublicByAthlete(
  rows: SpartanFayettevilleDonation[],
  codeToFullName: Map<string, string>,
): SpartanPublicByAthleteRow[] {
  const stripeHints = buildStripeAthleteDisplayHintsByCode(rows)
  const raw = aggregateSpartanByAthlete(rows)
  return raw.map((a) => ({
    athleteCode: a.athleteCode,
    athleteName: resolveFundraisingAthleteRowName(a.athleteCode, codeToFullName, stripeHints),
    totalCents: a.totalCents,
    donationCount: a.donationCount,
    raceSignupCount: a.raceSignupCount,
  }))
}
