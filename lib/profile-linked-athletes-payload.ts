/**
 * Builds the `/api/profile/linked-athletes` list — same athlete-id scope as the digital wallet
 * ({@link getWalletAthleteIdsForParentUser}). Kept pure for tests and to avoid RLS/user-client
 * drift from admin-backed wallet totals.
 */
export type ProfileLinkedAthleteItem = {
  id: string
  name: string
  profileVerified: boolean
  updatedAt: string | null
  claimedByUserId: string | null
  canUnlink: boolean
  isProfilePrimaryAthlete: boolean
}

export type ProfileLinkedAthleteDbRow = {
  id: string
  name: string | null
  profile_verified?: boolean | null
  updated_at?: string | null
  claimed_by_user_id?: string | null
}

export function buildLinkedAthletesPayloadForWallet(input: {
  walletAthleteIds: string[]
  athleteRows: ProfileLinkedAthleteDbRow[] | null | undefined
  parentLinkAthleteIds: Set<string>
  profileAthleteId: string | null
}): ProfileLinkedAthleteItem[] {
  const { walletAthleteIds, athleteRows, parentLinkAthleteIds, profileAthleteId } = input
  const linkedViaFamilyTable = parentLinkAthleteIds
  const profId = profileAthleteId?.trim() || null

  const byId = new Map<string, ProfileLinkedAthleteItem>(
    (athleteRows ?? []).map((row) => {
      const id = String(row.id).trim()
      return [
        id,
        {
          id,
          name: row.name?.trim() ? row.name : "—",
          profileVerified: !!row.profile_verified,
          updatedAt: row.updated_at ?? null,
          claimedByUserId: row.claimed_by_user_id ?? null,
          canUnlink: linkedViaFamilyTable.has(id),
          isProfilePrimaryAthlete: profId != null && id === profId,
        },
      ]
    }),
  )

  const list: ProfileLinkedAthleteItem[] = walletAthleteIds.map((rawId) => {
    const id = String(rawId).trim()
    const found = byId.get(id)
    if (found) return { ...found }
    return {
      id,
      name: "Athlete",
      profileVerified: false,
      updatedAt: null,
      claimedByUserId: null,
      canUnlink: linkedViaFamilyTable.has(id),
      isProfilePrimaryAthlete: profId != null && id === profId,
    }
  })

  list.sort((a, b) => a.name.localeCompare(b.name))
  return list
}
