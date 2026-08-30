import { redirect } from "next/navigation"

/**
 * Retired. The ranking board is the one place rankings are worked on.
 *
 * This screen listed a class and linked out to per-athlete edits, and it had been broken for a
 * while: `params` is a promise in Next 15 and this page read `params.year` directly, so every
 * visit rendered "Class of NaN" against an empty list.
 *
 * Kept as a redirect rather than deleted, because the URL is in bookmarks and in the rankings
 * hub, and a 404 teaches nobody where the work moved to.
 */
export default async function RetiredYearRankingsPage({ params }: { params: Promise<{ year: string }> }) {
  const { year } = await params
  const requested = Number.parseInt(year, 10)
  redirect(Number.isFinite(requested) ? `/admin/rankings/board?year=${requested}` : "/admin/rankings/board")
}
