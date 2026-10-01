export type CuratedSignificantWin = {
  opponent: string
  opponentSchool: string | null
  event: string
  date: string
  result: string
  weight: number
  credential: string
}

const BY_ATHLETE_ID: Readonly<Record<string, readonly CuratedSignificantWin[]>> = {
  // Aidan Gore. The NC United duals sheet records this opponent as "M. Kilgore" of Team Gotcha,
  // which no automatic match can tie to anyone; he is Marcus Killgore of Sahuarita, the 2026 AZ
  // D3 157 champion and #9 at 150 in Sports Illustrated's September 2026 rankings.
  "58aaa26d-f206-4bb1-aee3-7d465b64ff39": [
    {
      opponent: "Marcus Killgore",
      opponentSchool: "Team Gotcha",
      event: "2026 NHSCA National Duals",
      date: "5/23/2026",
      result: "DEC 4-1",
      weight: 152,
      credential: "#9 Sports Illustrated · 2026 AZ D3 State Champion",
    },
  ],
  "ddea34af-ae6a-4880-8a1c-687576bef1fe": [
    {
      opponent: "Jin Davis",
      opponentSchool: "Teknique Wrestling",
      event: "2026 GA Super 32 Early Entry",
      date: "9/5/2026",
      result: "DEC 3-1",
      weight: 157,
      credential: "GA State Champion · 2x GA State Placer",
    },
    {
      opponent: "Braelyn Nelson",
      opponentSchool: "Terry Style Wrestling",
      event: "2026 GA Super 32 Early Entry",
      date: "9/5/2026",
      result: "DEC 6-5",
      weight: 157,
      credential: "GA State Runner-up · 2x GA State Placer",
    },
  ],
}

export function getCuratedSignificantWins(athleteId: string): readonly CuratedSignificantWin[] {
  return BY_ATHLETE_ID[athleteId] ?? []
}
