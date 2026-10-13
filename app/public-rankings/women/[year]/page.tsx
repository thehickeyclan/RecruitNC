import type { Metadata } from "next"
import { notFound } from "next/navigation"

import { ClassRankingPage } from "@/components/rankings/class-ranking-page"
import { isRankedClassYear } from "@/lib/public-rankings-cap"
import { redirectIfSignedOut } from "@/lib/server-auth-redirect"

/**
 * A women's class board: /public-rankings/women/2027.
 *
 * Its own address, not a filter on the men's page (Matt, 13 October 2026): a women's coach has to
 * be able to find, bookmark and share the women's rankings without passing through the men's.
 * The same component draws both; only whose board it reads differs.
 */
export const dynamic = "force-dynamic"

type Params = { params: Promise<{ year: string }> }

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { year } = await params
  return {
    title: `Women's Class of ${year} Rankings | RecruitNC`,
    description: `North Carolina's top women's wrestling prospects in the Class of ${year}, ranked on results.`,
  }
}

export default async function WomensClassRankingPage({ params }: Params) {
  const { year: raw } = await params
  const year = Number(raw)
  if (!/^\d{4}$/.test(raw) || !isRankedClassYear(year, "Female")) notFound()
  await redirectIfSignedOut(`/public-rankings/women/${year}`)
  return <ClassRankingPage year={year} gender="Female" />
}
