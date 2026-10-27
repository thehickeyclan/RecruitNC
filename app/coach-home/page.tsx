/**
 * Coach Home folded into My Recruits (Matt, 27 Oct 2026): a coach's home is the board with its
 * funnel, then what needs him (app/my-recruits, components/coach/my-recruits-home.tsx). Old links
 * and bookmarks land there, keeping any query (?view=coach). Its sections live on in
 * ./coach-home-client.tsx and ./load-coach-home.ts, which My Recruits uses.
 */
import { redirect } from "next/navigation"

export const dynamic = "force-dynamic"

export default async function CoachHomePage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const q = new URLSearchParams()
  for (const [k, v] of Object.entries(await searchParams)) if (typeof v === "string") q.set(k, v)
  redirect(q.toString() ? `/my-recruits?${q}` : "/my-recruits")
}
