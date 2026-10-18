/**
 * The Division I eligibility clock (Matt, 18 Oct 2026): how many seasons a wrestler has, worked
 * out from the birth month and year, the class and the plan after high school. The rule and its
 * sources: lib/recruiting/learn/eligibility-clock.ts. Open to everyone; a signed-in family sees
 * its own wrestler's name and class filled in.
 */
import type { Metadata } from "next"
import { ExternalLink, ShieldCheck } from "lucide-react"

import { PortalShell } from "@/components/portal/portal-shell"
import { mostRecentGraduatedClassYear, seniorClassYear } from "@/lib/class-years"
import { familyAthleteIds } from "@/lib/coach-messages"
import { resolvePortalViewer } from "@/lib/recruiting/portal-viewer"
import { createAdminClient } from "@/lib/supabase/admin"
import { createClient } from "@/lib/supabase/server"
import { ClockCalculator } from "./clock-calculator"

export const dynamic = "force-dynamic"
export const metadata: Metadata = {
  title: "Division I eligibility clock calculator | RecruitNC",
  description: "How many seasons of Division I eligibility your wrestler has under the NCAA's five-year, age-based model, from birth month, class and plans after high school.",
}

const GOLD = "var(--recruit-accent)"
const card = "rounded-2xl border border-white/10 bg-[#0d1d36]/80 p-5"
const SOURCES = [
  { label: "NCAA: Division I adopts age-based eligibility model, June 23, 2026", url: "https://www.ncaa.org/news/2026/6/23/media-center-division-i-adopts-age-based-eligibility-model.aspx" },
  { label: "NCAA: DI Cabinet modifies age-based eligibility concept, June 5, 2026", url: "https://www.ncaa.org/news/2026/6/5/media-center-di-cabinet-modifies-age-based-eligibility-concept.aspx" },
]

export default async function EligibilityClockPage() {
  const admin = createAdminClient()
  const { userId } = await resolvePortalViewer({ supabase: await createClient(), admin }).catch(() => ({ userId: null as string | null }))
  const senior = seniorClassYear()
  const classes = Array.from({ length: 6 }, (_, i) => senior + i)
  let firstName: string | null = null
  let classYear = senior + 1
  if (userId) {
    const ids = await familyAthleteIds(admin, userId).catch(() => [] as string[])
    const { data } = ids.length ? await admin.from("athletes").select('"firstName", name, graduationyear').in("id", ids) : { data: [] }
    const w = (data ?? [])
      .filter((a) => a.graduationyear && Number(a.graduationyear) > mostRecentGraduatedClassYear())
      .sort((a, b) => Number(a.graduationyear) - Number(b.graduationyear))[0]
    if (w) {
      firstName = String(w.firstName ?? "").trim() || String(w.name ?? "").split(" ")[0] || null
      if (classes.includes(Number(w.graduationyear))) classYear = Number(w.graduationyear)
    }
  }

  return (
    <PortalShell active="learn">
      <div className="mx-auto max-w-6xl text-white">
        <p className="text-xs font-black uppercase tracking-[0.25em]" style={{ color: GOLD }}>
          <a href="/my-recruiting/learn" className="hover:underline">Learn</a> › Eligibility clock
        </p>
        <h1 className="mt-2 text-3xl font-black tracking-tight sm:text-5xl">The eligibility clock</h1>
        <p className="mt-2 max-w-2xl text-sm text-white/65 sm:text-base">How many Division I seasons {firstName ?? "your wrestler"} has under the NCAA&apos;s five-year rule, and what changes it.</p>

        <section className={`${card} mt-6`}>
          <p className="text-[15px] leading-6 text-white/85">
            The five years start at <b>first full-time enrollment in college</b> or the <b>academic year after the 19th birthday</b>, whichever comes first. Junior college is college: the clock starts there. A year off or a prep year doesn&apos;t stop the age trigger.
          </p>
          <p className="mt-2 text-xs text-white/50">For wrestlers first enrolling full time in fall 2027 or later. Division I; the other levels have their own rules.</p>
        </section>

        <div className="mt-4">
          <ClockCalculator firstName={firstName} defaultClass={classYear} classes={classes} />
        </div>

        <section className={`${card} mt-4`}>
          <p className="flex items-center gap-2 text-sm font-bold">
            <ShieldCheck className="h-4 w-4" style={{ color: GOLD }} aria-hidden /> What can pause the clock
          </p>
          <p className="mt-1 text-sm leading-6 text-white/75">
            Only pregnancy, active-duty military service and official religious missions, and only if the athlete does not compete in organized competition during them. The NCAA Eligibility Center decides. The old eligibility waivers no longer exist.
          </p>
          <p className="mt-3 flex flex-wrap gap-1.5">
            {SOURCES.map((s) => (
              <a key={s.url} href={s.url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 rounded-full border border-white/15 px-2 py-0.5 text-[11px] text-white/55 hover:border-white/30 hover:text-white">
                {s.label} <ExternalLink className="h-3 w-3" aria-hidden />
              </a>
            ))}
          </p>
        </section>
        <p className="mt-4 text-xs text-white/45">A planning estimate, not an eligibility decision. The college&apos;s compliance office and the NCAA Eligibility Center decide every case. Rules checked October 18, 2026.</p>
      </div>
    </PortalShell>
  )
}
