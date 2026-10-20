/**
 * The RecruitWrestlers logo (Matt's final design, 20 October 2026): Scout's face in wrestling
 * headgear, lime ear guards and eyes on navy, beside the RECRUIT / WRESTLERS wordmark in white and
 * lime. Cut from his artwork to transparent PNGs in public/recruitwrestlers, so the page shows
 * exactly what he approved. Navy and lime, never gold: a gold W beside a white R is RankWrestlers'.
 */

/** The full lockup: symbol and wordmark. Drawn for navy backgrounds. */
export function RwLogo({ className = "", title = "RecruitWrestlers" }: { className?: string; title?: string }) {
  // eslint-disable-next-line @next/next/no-img-element -- a small static PNG, sized by the caller's height
  return <img src="/recruitwrestlers/logo.png" alt={title} width={1647} height={291} className={className} />
}

/** The symbol alone, for tight spaces and the holding page. Drawn for navy backgrounds. */
export function RwMark({ className = "", title = "RecruitWrestlers" }: { className?: string; title?: string }) {
  // eslint-disable-next-line @next/next/no-img-element -- a small static PNG, sized by the caller's height
  return <img src="/recruitwrestlers/mark.png" alt={title} width={512} height={512} className={className} />
}
