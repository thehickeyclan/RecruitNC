/**
 * The Reports folder in a college coach's sidebar (Matt, 26 Oct 2026): every tournament report,
 * the coach's own program's report first, with how many of their staff's starred wrestlers are in it.
 */
import type { Metadata } from "next"
import Link from "next/link"
import { redirect } from "next/navigation"
import { FileText, Star } from "lucide-react"
import { createAdminClient } from "@/lib/supabase/admin"
import { createClient } from "@/lib/supabase/server"
import { COACH_REPORTS, loadCoachReportFile, resolveCoachReportViewer } from "@/lib/coach-reports"

export const dynamic = "force-dynamic"
export const metadata: Metadata = { title: "Reports", robots: { index: false, follow: false } }

export default async function CoachReportsIndex({ searchParams }: { searchParams: Promise<{ as?: string }> }) {
  const sp = await searchParams
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const viewer = await resolveCoachReportViewer(createAdminClient(), user?.id ?? null, sp.as)
  if (viewer.access === "signed-out") redirect("/auth/signin?returnTo=%2Fcoach-reports")
  if (viewer.access !== "ok") redirect("/coach-home")

  const reports = COACH_REPORTS.filter((d) => viewer.genders.includes(d.gender)).sort((a, b) =>
    b.date.localeCompare(a.date) || (viewer.viewGender === "Female" ? (a.gender === "Female" ? -1 : 1) : a.gender === "Male" ? -1 : 1))
  const asParam = sp.as && viewer.isAdmin ? `?as=${encodeURIComponent(sp.as)}` : ""

  return (
    <main className="mx-auto max-w-3xl px-4 py-6">
      <h1 className="text-2xl font-black text-white md:text-3xl">Reports</h1>
      <p className="mt-1 text-sm text-white/60">Tournament reports on every North Carolina wrestler. Your recruits (wrestlers you or your staff starred) are marked with a gold star.</p>
      <div className="mt-5 grid gap-3">
        {reports.map((def) => {
          const file = loadCoachReportFile(def)
          const mine = file.reports.filter((r) => r.competed && (def.gender === "Female" ? /^f/i.test(r.gender ?? "") : !/^f/i.test(r.gender ?? "")))
          const starred = mine.filter((r) => viewer.starred.has(r.athleteId)).length
          return (
            <Link key={def.slug} href={`/coach-reports/${def.slug}${asParam}`} className="flex items-center gap-4 rounded-xl border border-white/10 bg-white/5 p-4 hover:bg-white/10">
              <FileText className="h-8 w-8 shrink-0 text-[#d4af55]" />
              <div className="min-w-0 flex-1">
                <div className="font-bold text-white">{def.title}</div>
                <div className="text-sm text-white/60">{mine.length} wrestlers · {new Date(`${def.date}T12:00:00`).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}</div>
              </div>
              {starred > 0 && <span className="inline-flex items-center gap-1 rounded-full bg-[#f5c518]/15 px-2.5 py-1 text-xs font-bold text-[#f5c518]"><Star className="h-3.5 w-3.5 fill-[#f5c518]" /> {starred} of your recruits</span>}
            </Link>
          )
        })}
      </div>
    </main>
  )
}
