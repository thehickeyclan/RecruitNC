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
