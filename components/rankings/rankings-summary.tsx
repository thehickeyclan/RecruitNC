import type { PublicRankedAthlete, PublicRankingCredentialKind } from "@/lib/rankings/public-rankings-view"

/**
 * What the board is made of, in one line above it.
 *
 * A reader landing on a top thirty has no way to judge the depth of it without scrolling the
 * whole page and counting pills. These are counts of *wrestlers*, not of honours: "11 state
 * champions" means eleven of the wrestlers below have won a state title, not that eleven
 * titles were won between them. A wrestler with two is still one wrestler, which is the
 * number that describes how strong the board is.
 *
 * The placer counts exclude champions for the same reason the pills do - somebody who won it
 * is counted under champions, and counting them twice would inflate the board.
 */
const ROWS: Array<{ kind: PublicRankingCredentialKind; label: string; plural: string }> = [
  { kind: "toc-champion", label: "TOC champion", plural: "TOC champions" },
  { kind: "toc-placer", label: "TOC placer", plural: "TOC placers" },
  { kind: "all-american", label: "All-American", plural: "All-Americans" },
  { kind: "state-champion", label: "State champion", plural: "State champions" },
  { kind: "state-placer", label: "State placer", plural: "State placers" },
]

export function RankingsSummary({ athletes }: { athletes: PublicRankedAthlete[] }) {
  if (athletes.length === 0) return null

  const counts = new Map<PublicRankingCredentialKind, number>()
  for (const athlete of athletes) {
    // A kind can only appear once per card, but count distinctly in case that ever changes.
    for (const kind of new Set(athlete.credentials.map((c) => c.kind))) {
      counts.set(kind, (counts.get(kind) ?? 0) + 1)
    }
  }

  const shown = ROWS.map((row) => ({ ...row, n: counts.get(row.kind) ?? 0 })).filter((row) => row.n > 0)
  if (shown.length === 0) return null

  return (
    <dl className="mx-auto mt-8 flex max-w-4xl flex-wrap justify-center gap-2 sm:gap-3">
      {shown.map(({ kind, label, plural, n }) => (
        <div
          key={kind}
          className="flex min-w-[104px] flex-1 basis-[104px] flex-col items-center rounded-sm border border-white/10 bg-white/[0.03] px-3 py-2.5 sm:basis-0"
        >
          <dt className="sr-only">{n === 1 ? label : plural}</dt>
          <dd className="text-2xl font-black leading-none text-[#D7B95A]">{n}</dd>
          <dd
            aria-hidden
            className="mt-1 text-center text-[10px] font-bold uppercase leading-tight tracking-[0.08em] text-white/55"
          >
            {n === 1 ? label : plural}
          </dd>
        </div>
      ))}
    </dl>
  )
}
