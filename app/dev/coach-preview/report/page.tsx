/**
 * A coach's tournament report exactly as that coach sees it, on a developer's machine, with no
 * session (as /dev/coach-preview does for Coach Home):
 *
 * /dev/coach-report-preview?slug=super32-2026-mens&coach=coach@school.edu[&starred=1]
 *
 * Local development only: it does not exist in a production or preview build.
 */
import { notFound } from "next/navigation"
import CoachReportPage from "@/app/coach-reports/[slug]/page"

export const dynamic = "force-dynamic"

export default async function CoachReportPreview({ searchParams }: { searchParams: Promise<{ slug?: string; coach?: string; starred?: string }> }) {
  if (process.env.NODE_ENV === "production") notFound()
  const sp = await searchParams
  return CoachReportPage({
    params: Promise.resolve({ slug: sp.slug ?? "super32-2026-mens" }),
    searchParams: Promise.resolve({ starred: sp.starred, devcoach: sp.coach }),
  })
}
