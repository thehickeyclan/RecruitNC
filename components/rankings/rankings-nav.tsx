import { PUBLIC_RANKINGS_MAX_BY_YEAR, PUBLISHED_PUBLIC_RANKINGS_YEARS, PUBLIC_TOP_PROSPECTS_RELEASED, RANKED_CLASS_YEARS } from "@/lib/public-rankings-cap"

/**
 * One switcher across every ranking board.
 *
 * Each board used to be a dead end: the only way from the Top 70 to the Class of 2028 was the
 * browser's back button, twice. The class pages did carry a year switcher, but it was built
 * from `PUBLISHED_PUBLIC_RANKINGS_YEARS` - empty until release - so in practice it rendered
 * nothing at all, and it never listed the Top 70 beside the classes.
 *
 * Reach follows what the viewer may open, so the tabs never advertise a board that answers
 * with a locked page: an admin previewing before release sees all four, a customer sees only
 * what has been released.
 */
export function RankingsNav({
  current,
  isAdmin = false,
}: {
  /** The board being viewed: a class year, or "prospects" for the Top 70. */
  current: number | "prospects"
  isAdmin?: boolean
}) {
  const years = (isAdmin ? RANKED_CLASS_YEARS : PUBLISHED_PUBLIC_RANKINGS_YEARS).filter(
    (y) => PUBLIC_RANKINGS_MAX_BY_YEAR[y] != null,
  )
  const showProspects = isAdmin || PUBLIC_TOP_PROSPECTS_RELEASED

  const tabs: Array<{ href: string; label: string; key: number | "prospects" }> = [
    ...years.map((y) => ({ href: `/public-rankings/${y}`, label: `Class of ${y}`, key: y as number })),
    ...(showProspects
      ? [{ href: "/public-rankings/prospects", label: "Top 75 Prospects", key: "prospects" as const }]
      : []),
  ]

  // A single tab is the page you are already on, which is not a choice worth drawing.
  if (tabs.length < 2) return null

  return (
    <nav className="mt-8 flex flex-wrap justify-center gap-2" aria-label="Rankings">
      {tabs.map(({ href, label, key }) => {
        const active = key === current
        return (
          <a
            key={href}
            href={href}
            aria-current={active ? "page" : undefined}
            className={
              active
                ? "rounded-sm border-2 border-[#D7B95A] bg-[#D7B95A]/20 px-4 py-1.5 text-sm font-bold text-[#D7B95A]"
                : "rounded-sm border border-white/15 bg-white/[0.03] px-4 py-1.5 text-sm font-bold text-white/70 transition hover:border-white/35 hover:text-white"
            }
          >
            {label}
          </a>
        )
      })}
    </nav>
  )
}
