import { PUBLIC_TOP_75_COLLEGE_RELEASED, rankedClassYears, releasedClassYears } from "@/lib/public-rankings-cap"

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
  gender = "Male",
}: {
  /** Whose boards these tabs switch between. The other set is one link away, never mixed in. */
  gender?: "Male" | "Female"
  /** The board being viewed: a class year, or "prospects" for the ranked list. */
  current: number | "prospects" | "top-100"
  isAdmin?: boolean
}) {
  const womens = gender === "Female"
  const years = isAdmin ? rankedClassYears(gender) : releasedClassYears(gender)
  const otherYears = isAdmin ? rankedClassYears(womens ? "Male" : "Female") : releasedClassYears(womens ? "Male" : "Female")

  const tabs: Array<{ href: string; label: string; key: number | "prospects" | "top-100" | "other" }> = [
    ...years.map((y) => ({
      href: womens ? `/public-rankings/women/${y}` : `/public-rankings/${y}`,
      label: womens ? `Women's ${y}` : `Class of ${y}`,
      key: y as number,
    })),
    // Classes of 2027 and 2028, reaching past each class's published cut. A men's board.
    ...(!womens && (isAdmin || PUBLIC_TOP_75_COLLEGE_RELEASED)
      ? [{ href: "/public-rankings/college-prospects", label: "Top 75 College Prospects", key: "top-100" as const }]
      : []),
    // The other set of boards, as one door: never a women's tab among the men's classes.
    ...(otherYears.length
      ? [{ href: "/public-rankings", label: womens ? "Men's rankings →" : "Women's rankings →", key: "other" as const }]
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
