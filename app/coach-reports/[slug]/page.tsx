/**
 * A college coach's tournament report (Matt, 26 Oct 2026): every NC wrestler of one gender at the event (men's and women's are separate reports), built
 * off NC United's recap of it, with the coach's program logo on top and a gold star on every
 * wrestler their staff has starred. "Starred only" filters to them; "Download PDF" prints the page.
 * No grades (Matt): the recap's write-ups appear with any grade talk taken out, in the recap's
 * strongest-first order.
 *
 * Verified college coaches and admins. An admin can add ?as=<coach user id> to see one coach's report.
 */
import type { Metadata } from "next"
import Link from "next/link"
import { notFound, redirect } from "next/navigation"
import { Star } from "lucide-react"
import { createAdminClient } from "@/lib/supabase/admin"
import { createClient } from "@/lib/supabase/server"
import { COACH_REPORTS, loadCoachReportFile, resolveCoachReportViewer, withoutGradeTalk } from "@/lib/coach-reports"
import { loadRecap, nameKey } from "@/lib/news-recaps/recap"
import { latestSnapshot, type SnapshotEntrant } from "@/lib/super32-live/snapshot"
import type { AthleteEventReport } from "@/lib/coach-event-report"
import { Chip, MatchList, ordinal, super32Placings, ThreeYear, ViewProfilePill } from "@/components/news/super32-report-parts"
import { PrintButton } from "../print-button"
import { ReportStarButton } from "../report-star-button"
import { ReportSearch } from "../report-search"

export const dynamic = "force-dynamic"
export const metadata: Metadata = { title: "Tournament report", robots: { index: false, follow: false } }

function sections(md: string): Array<{ head: string; body: string }> {
  return md.split(/^## /m).filter((s) => s.trim()).map((s) => {
    const nl = s.indexOf("\n")
    return { head: (nl < 0 ? s : s.slice(0, nl)).trim(), body: nl < 0 ? "" : s.slice(nl + 1).trim() }
  })
}

const genderOf = (r: AthleteEventReport, e: SnapshotEntrant | undefined): "Male" | "Female" =>
  e?.gender === "girls" || /^f/i.test(r.gender ?? "") ? "Female" : "Male"

function ReportCard({ r, e, starred, mine, readOnly, text, photo, placings }: {
  r: AthleteEventReport; e: SnapshotEntrant | undefined; starred: boolean; mine: boolean; readOnly: boolean; text: string; photo: string | null; placings: Map<string, number>
}) {
  const seeded = (e?.bouts ?? []).filter((b) => b.win && b.opponentSeed && !/for/i.test(b.winType)).sort((a, b) => a.opponentSeed! - b.opponentSeed!)
  const place = r.place ?? e?.placement ?? null
  return (
    <article data-search={[r.name, r.school, r.weight, r.weight ? `${r.weight}lbs` : null, r.classYear].filter(Boolean).join(" ").toLowerCase()} className={`overflow-hidden rounded-xl border bg-white shadow-sm break-inside-avoid ${starred ? "border-[#d4af55] ring-1 ring-[#d4af55]" : "border-gray-200"}`}>
      <div className="flex gap-3 p-4">
        {photo
          // eslint-disable-next-line @next/next/no-img-element
          ? <img src={photo} alt="" className="h-14 w-14 shrink-0 rounded-lg object-cover object-top" />
          : <div className="h-14 w-14 shrink-0 rounded-lg bg-gray-100" />}
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-2">
            <h3 className="text-lg font-black text-[#0b1730]"><Link href={`/athletes/${r.athleteId}`} className="hover:underline">{r.name}</Link></h3>
            <ReportStarButton athleteId={r.athleteId} name={r.name} mine={mine} staff={starred && !mine} readOnly={readOnly} />
            <span className="text-sm text-gray-500">{[r.weight ? `${r.weight} lbs` : null, r.school, r.classYear ? `Class of ${r.classYear}` : null].filter(Boolean).join(" · ")}</span>
          </div>
          <div className="mt-1.5 flex flex-wrap gap-1.5">
            <Chip tone="navy">{r.record.wins}-{r.record.losses}</Chip>
            {place ? <Chip tone="gold">{place === 1 ? "Champion" : `${ordinal(place)} place${place <= 8 ? " · All-American" : ""}`}</Chip> : null}
            {e?.seed ? <Chip>#{e.seed} seed</Chip> : null}
            {seeded.map((b) => <Chip key={b.key} tone="gold">Beat #{b.opponentSeed}</Chip>)}
          </div>
        </div>
      </div>
      {text && <p className="px-4 pb-3 text-[15px] leading-relaxed text-gray-800">{text}</p>}
      {e && <MatchList bouts={e.bouts} weight={String(e.weight ?? r.weight ?? "")} placings={placings} />}
      <div className="pt-3"><ViewProfilePill athleteId={r.athleteId} /></div>
    </article>
  )
}

export default async function CoachReportPage({ params, searchParams }: {
  params: Promise<{ slug: string }>
  searchParams: Promise<{ starred?: string; as?: string; devcoach?: string }>
}) {
  const { slug } = await params
  const sp = await searchParams
  const def = COACH_REPORTS.find((d) => d.slug === slug)
  if (!def) notFound()

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const admin = createAdminClient()
  // Local development only (as /dev/coach-preview): ?devcoach=<email> renders one coach's report with no session.
  let viewerId = user?.id ?? null
  if (process.env.NODE_ENV !== "production" && sp.devcoach) {
    const { data: dev } = await admin.from("user_profiles").select("user_id").ilike("email", sp.devcoach.trim()).maybeSingle()
    viewerId = (dev?.user_id as string | undefined) ?? viewerId
  }
  const viewer = await resolveCoachReportViewer(admin, viewerId, sp.as)
  if (viewer.access === "signed-out") redirect(`/auth/signin?returnTo=${encodeURIComponent(`/coach-reports/${slug}`)}`)
  if (viewer.access !== "ok") redirect("/coach-home")
  // Men's coaches get the men's report, women's coaches the women's.
  if (!viewer.genders.includes(def.gender)) redirect("/coach-reports")

  const file = loadCoachReportFile(def)
  const [snap, placings] = await Promise.all([latestSnapshot(admin as never, def.eventKey, true), super32Placings()])
  const byAthlete = new Map((snap?.data.entrants ?? []).filter((e) => e.athleteId).map((e) => [e.athleteId!, e]))
  const recap = def.recapSlug ? loadRecap(def.recapSlug) : null
  const writeUps = new Map((recap?.graded ?? []).map((w) => [nameKey(w.name), withoutGradeTalk(w.paragraph.replace(/\*\*/g, ""))]))
  const introSections = recap ? sections(recap.intro) : []
  const overall = introSections.find((s) => /overall assessment/i.test(s.head))
  const table = introSections.find((s) => /three-year/i.test(s.head))

  const starredOnly = sp.starred === "1"
  const asParam = [sp.as && viewer.isAdmin ? `as=${encodeURIComponent(sp.as)}` : "", process.env.NODE_ENV !== "production" && sp.devcoach ? `devcoach=${encodeURIComponent(sp.devcoach)}` : ""].filter(Boolean).join("&")
  const href = (starred: boolean) => `/coach-reports/${slug}?${[starred ? "starred=1" : "", asParam].filter(Boolean).join("&")}`

  const mine = file.reports.filter((r) => r.competed && genderOf(r, byAthlete.get(r.athleteId)) === def.gender)
  const shown = mine.filter((r) => !starredOnly || viewer.starred.has(r.athleteId))
  const starredCount = mine.filter((r) => viewer.starred.has(r.athleteId)).length
  const textFor = (r: AthleteEventReport) => writeUps.get(nameKey(r.name)) || file.summaries[r.athleteId] || r.summary

  return (
    // A white page on the portal's navy frame: readable there, and what the PDF prints.
    // print-color-adjust keeps the charts' bars and the chips in the PDF (browsers drop backgrounds).
    <main style={{ WebkitPrintColorAdjust: "exact", printColorAdjust: "exact" }} className="mx-auto my-4 max-w-3xl rounded-2xl bg-[#f7f8fb] px-4 py-5 text-gray-900 md:px-6 print:my-0 print:max-w-none print:rounded-none print:bg-white print:px-0 print:py-0">
      <header className="rounded-2xl bg-[#0b1730] p-5 text-white print:rounded-none">
        <div className="flex items-center gap-4">
          {viewer.programLogo
            // eslint-disable-next-line @next/next/no-img-element
            ? <img src={viewer.programLogo} alt={viewer.program ?? ""} className="h-16 w-16 shrink-0 rounded-xl bg-white object-contain p-1.5" />
            : null}
          <div className="min-w-0">
            {viewer.program && <div className="text-[11px] font-bold uppercase tracking-[0.18em] text-[#d4af55]">Prepared for {viewer.program}</div>}
            <h1 className="mt-0.5 text-2xl font-black leading-tight md:text-3xl">{def.title}</h1>
            <div className="mt-0.5 text-sm text-[#c9d4ea]">
              {mine.length} North Carolina wrestlers · {starredCount} of your recruits
            </div>
          </div>
        </div>
      </header>

      <div className="mt-4 flex flex-wrap items-center gap-2 print:hidden">
        <div className="inline-flex rounded-lg border border-gray-200 bg-white p-0.5 text-sm font-semibold">
          <Link href={href(false)} className={`rounded-md px-3 py-1.5 ${!starredOnly ? "bg-[#0b1730] text-white" : "text-gray-600"}`}>Everyone</Link>
          <Link href={href(true)} className={`inline-flex items-center gap-1 rounded-md px-3 py-1.5 ${starredOnly ? "bg-[#0b1730] text-white" : "text-gray-600"}`}>
            <Star className="h-4 w-4 fill-[#f5c518] text-[#f5c518]" /> Your recruits ({starredCount})
          </Link>
        </div>
        <PrintButton filename={`${def.title}${viewer.program ? ` — ${viewer.program}` : ""}${starredOnly ? " (starred)" : ""}`} />
      </div>

      <ReportSearch />

      <p className="mt-3 flex items-center gap-1.5 text-sm text-gray-600">
        <Star className="h-4 w-4 shrink-0 fill-[#f5c518] text-[#f5c518]" aria-hidden />
        <span><span className="font-semibold text-gray-800">Gold star = your recruit:</span> a wrestler you or your staff starred on RecruitNC. Tap &ldquo;Add to my recruits&rdquo; on anyone else to add him.</span>
      </p>

      {!starredOnly && overall && (
        <section className="mt-6 space-y-3 text-[15px] leading-relaxed text-gray-800">
          {overall.body.split(/\n\s*\n/).filter((p) => p.trim() && !p.startsWith("*")).map((p, i) => <p key={i}>{p.replace(/\*\*/g, "")}</p>)}
        </section>
      )}
      {!starredOnly && table && <div className="break-inside-avoid"><ThreeYear body={table.body} /></div>}

      {starredOnly && starredCount === 0 && (
        <p className="mt-8 rounded-xl border border-gray-200 bg-white p-5 text-sm text-gray-600">
          None of your recruits wrestled at this event yet. Star a wrestler on any profile and he becomes your recruit: he shows in <Link href="/my-recruits" className="font-semibold text-[#003366] underline">My Recruits</Link> and here with a gold star.
        </p>
      )}

      {shown.length > 0 && (
        <section className="mt-8">
          <h2 className="text-xl font-black text-[#0b1730]">{starredOnly ? "Your recruits" : "Every North Carolina wrestler"} · {shown.length}</h2>
          <p className="text-xs text-gray-500">Strongest tournaments first.</p>
          <div className="mt-3 grid gap-3">
            {shown.map((r) => (
              <ReportCard key={r.athleteId} r={r} e={byAthlete.get(r.athleteId)} starred={viewer.starred.has(r.athleteId)}
                mine={viewer.mine.has(r.athleteId)} readOnly={viewer.readOnly}
                text={textFor(r)} photo={file.photos[r.athleteId] ?? null} placings={placings} />
            ))}
          </div>
        </section>
      )}

      <p className="mt-8 text-xs text-gray-400">Every result, credential and placing is computed from the event's brackets and our national results, never typed. NC United · RecruitNC.</p>
    </main>
  )
}
