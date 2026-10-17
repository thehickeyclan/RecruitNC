/**
 * The "Strength of Competition" grade a wrestler's public profile shows today, computed on the
 * server from the same reads and the same assembly the profile page uses:
 *
 *   - significant wins: lib/athlete-significant-wins.ts, the body of
 *     /api/athletes/[id]/significant-wins that the profile fetches (every style counted);
 *   - national events and national event-years: lib/profile/profile-competition.ts over the
 *     payload loadPublicAthleteProfile returns, which is what the profile page renders from.
 *
 * Null when either read fails: a grade is never guessed.
 */
import type { SupabaseClient } from "@supabase/supabase-js"
import type { CompetitionGrade } from "@/lib/competition-grade"
import type { OpponentIndex } from "@/lib/significant-wins"
import { loadAthleteSignificantWins } from "@/lib/athlete-significant-wins"
import { loadPublicAthleteProfile } from "@/lib/load-public-athlete-profile"
import { buildProfileRecord, profileStrengthOfCompetition } from "@/lib/profile/profile-competition"

export async function loadProfileStrengthOfCompetition(
  admin: SupabaseClient,
  athleteId: string,
  options?: { index?: OpponentIndex },
): Promise<CompetitionGrade | null> {
  try {
    const [profile, significant] = await Promise.all([
      loadPublicAthleteProfile(athleteId, admin),
      // Losses play no part in the grade; the wins list does not depend on who is looking.
      loadAthleteSignificantWins(admin, athleteId, { lossesVisible: false, index: options?.index }),
    ])
    if (!profile.ok) return null
    const { competition, summaryFacts } = buildProfileRecord(profile.athlete)
    return profileStrengthOfCompetition({ significantWins: significant.wins.length, competition, summaryFacts })
  } catch {
    return null
  }
}
