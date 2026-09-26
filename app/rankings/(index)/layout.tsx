export const dynamic = "force-dynamic"

/**
 * Deliberately open to signed-out visitors.
 *
 * This layout used to bounce anybody without an account straight to /auth/signin, which made
 * sense when a free account was the only thing standing between a visitor and the rankings.
 * Now that the board is sold, the people who most need to read what it is — an out-of-state
 * parent, a recruiting service, a coach following a link — were the exact people never allowed
 * to see the page describing it. They got a generic sign-in wall instead of the pitch.
 *
 * Nothing leaks by opening it: `/api/public-rankings` answers 401 to a signed-out request and
 * 403 to an account without a membership or subscription, so the page renders its locked state
 * and no ranking is ever in the payload.
 */
export default function RankingsIndexLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
