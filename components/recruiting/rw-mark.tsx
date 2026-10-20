/**
 * The RecruitWrestlers logo (Matt's final design, 20 October 2026): Scout's head in three-quarter
 * view, wearing wrestling headgear with his "S" on the lime ear guard and his eyes on the visor,
 * beside the RECRUIT / WRESTLERS wordmark in white and lime. Kept detailed at every size: a
 * simplified version lost the character and read no better at 16 px. Cut from his artwork to transparent PNGs in public/recruitwrestlers, so the page shows
 * exactly what he approved. Navy and lime, never gold: a gold W beside a white R is RankWrestlers'.
 */

/** The full lockup: symbol and wordmark. Drawn for navy backgrounds. */
export function RwLogo({ className = "", title = "RecruitWrestlers" }: { className?: string; title?: string }) {
  // eslint-disable-next-line @next/next/no-img-element -- a small static PNG, sized by the caller's height
  return <img src="/recruitwrestlers/logo.png" alt={title} width={1820} height={316} className={className} />
}

/** The symbol alone, for tight spaces and the holding page. Drawn for navy backgrounds. */
export function RwMark({ className = "", title = "RecruitWrestlers" }: { className?: string; title?: string }) {
  // eslint-disable-next-line @next/next/no-img-element -- a small static PNG, sized by the caller's height
  return <img src="/recruitwrestlers/mark.png" alt={title} width={817} height={700} className={className} />
}
