/**
 * RecruitWrestlers copy of NC United's NC girls recap (Matt, 26 Oct 2026: "RecruitWrestlers should have NC
 * and SC now"). Same article, rules and data as news/super32-2026-nc-girls-recap; RecruitWrestlers
 * wording, Insider/Command Center links, no Super 32 HQ (an NC United product). Served only on
 * recruitwrestlers.com addresses; NC United's address gets a generic "not found".
 */
import type { Metadata } from "next"
import Link from "next/link"
import { headers } from "next/headers"
import { notFound } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { resolveRankingViewer } from "@/lib/ranking-access"
import { hasPortalAccess, hasPremiumAccess } from "@/lib/ranking-visibility"
import { GRADES, loadRecap, nameKey, type GradedWrestler } from "@/lib/news-recaps/recap"
import { markdownToHtml } from "@/lib/news-recaps/markdown"
import { NchsaaArticleReactions } from "@/components/nchsaa-article-reactions"
import { linkNames } from "@/lib/news-recaps/link-names"
import { latestSnapshot, type SnapshotEntrant } from "@/lib/super32-live/snapshot"
import { Chip, MatchList, ordinal, RW_ACCENT, schoolAndClass, super32GirlsPlacings, ThreeYear, ViewProfilePill } from "@/components/news/super32-report-parts"
import { isPlaceholderAthletePhoto } from "@/lib/recruiting-profile-photo"
import { COACH_REPORTS, loadCoachReportFile } from "@/lib/coach-reports"
import { rankingsUpdateNoticeActive, rankingsUpdateSentence } from "@/lib/rankings-update-notice"

export const dynamic = "force-dynamic"

// Published: NC United published this recap on 26 Oct 2026, and RecruitWrestlers' copy follows it
// without a switch of its own on the recruitwrestlers Vercel project. SUPER32_GIRLS_RECAP_PUBLIC=0 pulls it.
const PUBLIC = process.env.SUPER32_GIRLS_RECAP_PUBLIC !== "0"
const IMG = "/images/news/super32-2026-girls-recap"
/**
 * Approved photos (Matt, 25 Oct) break up the article between sections, each with the context
 * beneath it, rather than sitting beside a few wrestlers' cards. No photo credits (Matt, 25 Oct).
 */
type Photo = { src: string; alt: string; caption: string }
// One approved photo so far (Ella Taylor, the hero); in-article breaks wait for more.
const BREAKS: Record<"intro" | "A" | "A-", Photo[]> = { intro: [], A: [], "A-": [] }

function PhotoBreak({ photos }: { photos: Photo[] }) {
  if (!photos.length) return null
  return (
    <div className={`mt-10 grid gap-4 ${photos.length > 1 ? "sm:grid-cols-2" : ""}`}>
      {photos.map((ph) => (
        <figure key={ph.src}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={ph.src} alt={ph.alt} className={`w-full rounded-xl object-cover object-top ${photos.length > 1 ? "h-72" : "h-80 md:h-[26rem]"}`} />
          <figcaption className="mt-2 border-l-2 border-[#A3E635] pl-3 text-sm leading-snug text-gray-600">{ph.caption}</figcaption>
        </figure>
      ))}
    </div>
  )
}

const GRADE_STYLE: Record<string, { badge: string; label: string; blurb: string }> = {
  "A+": { badge: "bg-[#e5372c] text-white", label: "A+", blurb: "Top-four finish on the podium" },
  A: { badge: "bg-[#A3E635] text-[#0b1730]", label: "A", blurb: "Beat two or more top-15 seeds, reached the blood round or better" },
  "A-": { badge: "bg-[#D9F99D] text-[#0b1730]", label: "A-", blurb: "Beat a seeded wrestler" },
  "B+": { badge: "bg-[#3b5ba5] text-white", label: "B+", blurb: "Beat a nationally ranked wrestler, or won five with every loss to a seed" },
  B: { badge: "bg-[#5a76b8] text-white", label: "B", blurb: "Winning record with a win over a state champion or placer" },
  "B-": { badge: "bg-[#8195bd] text-white", label: "B-", blurb: "2-2 with a win over a state champion or runner-up" },
}

// While a draft, the page title and description say nothing: a signed-out visitor gets the
// not-found page, and the title must not name the article either.
const isRwHost = (host: string) => /recruitwrestlers\.com$|^localhost|\.vercel\.app$/.test(host.toLowerCase())
export async function generateMetadata(): Promise<Metadata> {
  const host = (await headers()).get("host") ?? ""
  if (!isRwHost(host)) return { title: { absolute: "Page not found" }, robots: { index: false, follow: false } }
  return PUBLIC
  ? (() => {
      // Link previews (GroupMe, texts, social) show the headline and the Ella Taylor photo, not the site card.
      const title = "Super 32 2026 — North Carolina Girls Recap"
      const description = "Lauren Samuel and Ella Taylor finished 3rd, North Carolina's best finishes of the weekend. Every NC girl graded on the strength of her tournament."
      const image = { url: `${IMG}/share-card.jpg`, width: 1200, height: 630, alt: "Ella Taylor at Super 32" }
      return {
        title: { absolute: `${title} | RecruitWrestlers` },
        description,
        openGraph: { title, description, url: "/recaps/super32-2026-nc-girls", siteName: "RecruitWrestlers", type: "article", images: [image] },
        twitter: { card: "summary_large_image", title, description, images: [image.url] },
      } satisfies Metadata
    })()
  : { title: "News", robots: { index: false, follow: false } }
}

/** Names of the wrestlers this account owns or is a parent of, for the free own-grade unlock. */
async function ownWrestlerNames(userId: string | null, entrants: SnapshotEntrant[]): Promise<Set<string>> {
  if (!userId) return new Set()
  const admin = createAdminClient()
  const [claimed, linked] = await Promise.all([
    admin.from("athletes").select("id").eq("claimed_by_user_id", userId),
    admin.from("parent_athlete_links").select("athlete_id").eq("user_id", userId),
  ])
  const ids = new Set([...(claimed.data ?? []).map((r) => r.id), ...(linked.data ?? []).map((r) => r.athlete_id)])
  return new Set(entrants.filter((e) => e.athleteId && ids.has(e.athleteId)).map((e) => nameKey(e.name)))
}

/** Splits markdown into its "## " sections, keyed by heading. */
function sections(md: string): Array<{ head: string; body: string }> {
  return md.split(/^## /m).filter((s) => s.trim()).map((s) => {
    const nl = s.indexOf("\n")
    return { head: (nl < 0 ? s : s.slice(0, nl)).trim(), body: nl < 0 ? "" : s.slice(nl + 1).trim() }
  })
}

const html = (md: string) => ({ __html: markdownToHtml(md) })
const inlineHtml = (md: string) => ({ __html: markdownToHtml(md).replace(/^<p[^>]*>|<\/p>$/g, "") })

/**
 * Every NC wrestler with a profile: full name -> profile path, from the published results. Set at
 * the top of each render; every request sets the same list (one published snapshot).
 */
let PROFILE_LINKS: Array<[string, string]> = []
const LINK_CLASS = "font-semibold text-[#003366] underline decoration-[#A3E635] decoration-2 underline-offset-2"
const linkedInline = (md: string) => ({ __html: linkNames(markdownToHtml(md).replace(/^<p[^>]*>|<\/p>$/g, ""), PROFILE_LINKS, LINK_CLASS) })
const linkedHtml = (md: string) => ({ __html: linkNames(markdownToHtml(md), PROFILE_LINKS, LINK_CLASS) })

function Hero({ title }: { title: string }) {
  return (
    <header className="relative overflow-hidden rounded-2xl bg-[#0b1730]">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={`${IMG}/share-card.jpg`} alt="Ella Taylor at Super 32" className="h-72 w-full object-cover object-center opacity-80 md:h-96" />
      <div className="absolute inset-0 bg-gradient-to-t from-[#0b1730] via-[#0b1730]/60 to-transparent" />
      <div className="absolute inset-x-0 bottom-0 p-5 md:p-8">
        <div className="text-[11px] font-bold uppercase tracking-[0.2em] text-[#A3E635]">RecruitWrestlers · Super 32 · Greensboro</div>
        <h1 className="mt-1 text-3xl font-black leading-tight text-white md:text-5xl">{title.replace(/^Super 32 2026 — /, "")}</h1>
        <div className="mt-1 text-sm text-[#c9d4ea]">Super 32 2026</div>
      </div>
          </header>
  )
}

function StatStrip({ entrants }: { entrants: SnapshotEntrant[] }) {
  const girls = entrants.filter((e) => e.gender === "girls")
  const seeded = girls.flatMap((e) => e.bouts.filter((b) => b.win && b.opponentSeed && !/for|inj/i.test(b.winType))).length
  const tiles: Array<[string, string]> = [
    [String(girls.length), "NC girls in the brackets"],
    [String(seeded), "wins over seeded opponents"],
    [String(girls.filter((e) => e.wins > e.losses).length), "winning records"],
    [String(girls.filter((e) => e.placement && e.placement <= 8).length), "All-Americans"],
  ]
  return (
    <div className="mt-4 grid grid-cols-2 gap-2 md:grid-cols-4">
      {tiles.map(([n, l]) => (
        <div key={l} className="rounded-xl border border-gray-200 bg-white p-3 text-center shadow-sm">
          <div className="text-3xl font-black text-[#0b1730]">{n}</div>
          <div className="text-xs font-medium text-gray-500">{l}</div>
        </div>
      ))}
    </div>
  )
}

function GradeLegend({ body, counts }: { body: string; counts: Record<string, number> }) {
  return (
    <section className="mt-10 rounded-2xl bg-[#f4f6fb] p-5">
      <h2 className="text-2xl font-black text-[#0b1730]">How the grades work</h2>
      <p className="mt-1 text-sm text-gray-600">Performance grades for this tournament, not rankings of the wrestlers. Each grade has one rule; a wrestler gets the highest one she meets. The same rules as the boys' recap.</p>
      <div className="mt-4 grid gap-2 sm:grid-cols-2">
        {GRADES.map((g) => {
          const st = GRADE_STYLE[g]!
          const n = counts[g] ?? 0
          return (
            <div key={g} className="flex items-center gap-3 rounded-lg bg-white p-2.5">
              <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-md text-sm font-black ${st.badge}`}>{st.label}</span>
              <span className="text-sm text-gray-700">{st.blurb}<span className="text-gray-400"> · {n ? n : "none this year"}</span></span>
            </div>
          )
        })}
      </div>
      <details className="mt-3 text-sm">
        <summary className="cursor-pointer font-semibold text-[#003366]">The full method</summary>
        <div dangerouslySetInnerHTML={linkedHtml(body)} />
      </details>
    </section>
  )
}

/**
 * Locked card: shaped like a real one and blurred just enough to be unreadable. The text under the
 * blur is placeholder copy, never the wrestler's details, so un-blurring or view-source shows nothing.
 */
function LockedCard({ seed }: { seed: number }) {
  const name = ["Insider member", "Insider members only", "Insider wrestler", "Members only"][seed % 4]
  return (
    <div className="relative select-none overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm" aria-label="Locked: Insider members only">
      <div className="pointer-events-none blur-[5px]" aria-hidden>
        <div className="flex gap-4 p-4">
          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-[#5a76b8] text-lg font-black text-white">B</span>
          <div className="min-w-0 flex-1">
            <div className="whitespace-nowrap text-lg font-black text-[#0b1730]">{name}</div>
            <div className="text-sm text-gray-500">000 lbs · High School · Class of 20XX</div>
            <div className="mt-1.5 flex gap-1.5">
              <span className="rounded-full bg-[#0b1730] px-2 py-0.5 text-[11px] font-semibold text-white">0-0</span>
              <span className="rounded-full border border-gray-200 bg-gray-50 px-2 py-0.5 text-[11px] font-semibold text-gray-700">Unseeded</span>
            </div>
          </div>
        </div>
        <p className="px-4 pb-4 text-[15px] leading-relaxed text-gray-800">
          This wrestler&apos;s grade, the full write-up of her tournament and every opponent she faced are part of Insider, along with the rankings and the college programs viewing his profile.
        </p>
      </div>
    </div>
  )
}

function WrestlerCard({ w, e, placings, photo }: { w: GradedWrestler; e: SnapshotEntrant | undefined; placings: Map<string, number>; photo: string | null }) {
  const st = GRADE_STYLE[w.grade]!
  const record = e ? `${e.wins}-${e.losses}` : (w.heading.match(/(\d+-\d+)/)?.[1] ?? "")
  const seeded = (e?.bouts ?? []).filter((b) => b.win && b.opponentSeed && !/for/i.test(b.winType)).sort((a, b) => a.opponentSeed! - b.opponentSeed!)
  return (
    <article className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
      <div className="flex gap-4 p-4">
        {photo && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={photo} alt="" className="h-14 w-14 shrink-0 rounded-lg object-cover object-top" />
        )}
        <span className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-lg text-lg font-black ${st.badge}`}>{st.label}</span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-baseline gap-x-2">
            <h3 className="text-lg font-black text-[#0b1730]">{e?.athleteId ? <Link href={`/athletes/${e.athleteId}`} className="hover:underline">{w.name}</Link> : w.name}</h3>
            <span className="text-sm text-gray-500">{[`${w.weight} lbs`, schoolAndClass(e)].filter(Boolean).join(" · ")}</span>
          </div>
          <div className="mt-1.5 flex flex-wrap gap-1.5">
            <Chip tone="navy">{record}</Chip>
            {e?.placement ? <Chip tone="gold">{e.placement === 1 ? "Champion" : `${ordinal(e.placement)} place · All-American`}</Chip> : null}
            {e?.seed ? <Chip>#{e.seed} seed</Chip> : <Chip>Unseeded</Chip>}
            {seeded.map((b) => <Chip key={b.key} tone="gold">Beat #{b.opponentSeed}</Chip>)}
          </div>
        </div>
      </div>
      <p className="px-4 pb-4 pt-2 text-[15px] leading-relaxed text-gray-800" dangerouslySetInnerHTML={linkedInline(w.paragraph)} />
      {e && <MatchList bouts={e.bouts} weight={w.weight} placings={placings} />}
      {e?.athleteId && <div className="pt-3"><ViewProfilePill athleteId={e.athleteId} /></div>}
    </article>
  )
}

function UnlockPanel() {
  return (
    <div className="mt-8 rounded-2xl border border-[#A3E635] bg-[#0b1730] p-5 text-white">
      <div className="text-[11px] font-bold uppercase tracking-wider text-[#A3E635]">Insider</div>
      <div className="mt-1 text-xl font-bold">Sign up for Insider and get full access.</div>
      <p className="mt-1 text-sm text-[#c9d4ea]">Tournament grade reports, rankings and college profile views. Is your wrestler here? Claim the profile free and see their grade.</p>
      <div className="mt-3 flex flex-col gap-2 sm:flex-row">
        <Link href="/membership" className="rounded-lg bg-[#A3E635] px-4 py-2.5 text-center text-sm font-semibold text-[#0b1730]">Sign up for Insider →</Link>
        <Link href="/create-profile" className="rounded-lg bg-white px-4 py-2.5 text-center text-sm font-semibold text-[#0b1730]">Claim a profile free</Link>
        <Link href="/auth/signup?type=college-coach" className="rounded-lg border border-white/40 px-4 py-2.5 text-center text-sm font-semibold">College coach? Free access</Link>
      </div>
    </div>
  )
}

function ClaimCard() {
  return (
    <section className="mt-10 overflow-hidden rounded-2xl border border-[#A3E635]/60 bg-gradient-to-br from-[#13294b] to-[#0b1730] text-white">
      <div className="p-6">
        <div className="text-[11px] font-bold uppercase tracking-wider text-[#A3E635]">Every result in this recap lands on a profile</div>
        <h2 className="mt-1 text-2xl font-bold leading-tight md:text-3xl">Claim your wrestler&apos;s profile. It&apos;s free.</h2>
        <p className="mt-2 text-sm text-[#c9d4ea]">Almost every wrestler here already has a RecruitWrestlers profile, built from verified results. Claim it to check it, correct it and follow it.</p>
        <div className="mt-4 grid gap-3 md:grid-cols-3">
          <Link href="/create-profile" className="rounded-xl bg-white p-4 text-[#0b1730]">
            <div className="text-xs font-bold uppercase tracking-wider text-[#003366]">Families</div>
            <div className="mt-1 text-lg font-bold">Claim a profile free →</div>
            <div className="mt-1 text-xs text-gray-600">See your own wrestler&apos;s grade in this recap.</div>
          </Link>
          <Link href="/membership" className="rounded-xl bg-[#A3E635] p-4 text-[#0b1730]">
            <div className="text-xs font-bold uppercase tracking-wider">Insider · $9.99/mo</div>
            <div className="mt-1 text-lg font-bold">Every grade + the data →</div>
            <div className="mt-1 text-xs text-[#0b1730]/80">Full rankings, the bout-by-bout file, and which college programs viewed your wrestler.</div>
          </Link>
          <Link href="/auth/signup?type=college-coach" className="rounded-xl border border-white/30 p-4">
            <div className="text-xs font-bold uppercase tracking-wider text-[#A3E635]">College coaches</div>
            <div className="mt-1 text-lg font-bold">Free access →</div>
            <div className="mt-1 text-xs text-[#c9d4ea]">Every profile, ranking and grade, built from verified results.</div>
          </Link>
        </div>
      </div>
    </section>
  )
}

/** The article's NC United lines, in RecruitWrestlers' voice (the markdown is shared with NC United). */
function rwText<T extends { intro: string; outro: string }>(r: T): T {
  const fix = (t: string) => t
    .replace(/At NC United, our mission isn't only to celebrate individual results\. It's to raise wrestling across North Carolina and measure our progress against the best in the country\./g, "At RecruitWrestlers, our mission is to measure every state's wrestlers against the best in the country, with verified results.")
    .replace(/\n*\*\*North Carolina Wrestling\. All of It\.\*\*/g, "")
    .replace(/NC United profile/g, "RecruitWrestlers profile")
    .replace(/\(\/rankings\)/g, "(/membership)")
  return { ...r, intro: fix(r.intro), outro: fix(r.outro) }
}

export default async function Super32GirlsRecapPage({ searchParams }: { searchParams: Promise<{ preview?: string }> }) {
  const supabase = await createClient()
  const admin = createAdminClient()
  const { viewer, userId } = await resolveRankingViewer({ supabase, admin })
  if (!isRwHost((await headers()).get("host") ?? "")) notFound()
  if (!PUBLIC && !viewer.isAdmin) notFound()

  const recap = rwText(loadRecap("super32-2026-nc-girls-recap"))
  const snap = await latestSnapshot(admin, "super32-2026", true)
  const entrants = snap?.data.entrants ?? []
  const byName = new Map(entrants.filter((e) => e.gender === "girls").map((e) => [nameKey(e.name), e]))
  const placings = await super32GirlsPlacings()
  // Profile photos for the graded wrestlers (Matt, 26 Oct 2026); open cards only, never a placeholder.
  const gradedIds = recap.graded.map((w) => byName.get(nameKey(w.name))?.athleteId).filter((id): id is string => !!id)
  const { data: photoRows } = gradedIds.length ? await admin.from("athletes").select("id, photourl").in("id", gradedIds) : { data: [] }
  // Small thumbnails from the coach report's data where there is one (scripts/coach-report-thumbs.ts), else the profile photo.
  const thumbs = loadCoachReportFile(COACH_REPORTS.find((d) => d.eventKey === "super32-2026")!).photos
  const photos = new Map((photoRows ?? []).filter((p) => p.photourl && /^https:/.test(String(p.photourl)) && !isPlaceholderAthletePhoto(String(p.photourl))).map((p) => [String(p.id), thumbs[String(p.id)] ?? String(p.photourl)]))
  const photoFor = (w: GradedWrestler) => photos.get(byName.get(nameKey(w.name))?.athleteId ?? "") ?? null
  // Longest names first, so "Liam Myles" is linked before any shorter name inside it.
  PROFILE_LINKS = entrants.filter((e) => e.athleteId).map((e) => [e.name, `/athletes/${e.athleteId}`] as [string, string]).sort((a, b) => b[0].length - a[0].length)

  // Admins can see the page as a free reader would: ?preview=free.
  const previewFree = viewer.isAdmin === true && (await searchParams).preview === "free"
  const unlocked = !previewFree && (hasPremiumAccess(viewer) || hasPortalAccess(viewer))
  const own = unlocked || previewFree ? new Set<string>() : await ownWrestlerNames(userId, entrants)
  // The top grade awarded is free (A+ is reserved and usually empty, so this is normally the A group).
  const topGrade = GRADES.find((g) => recap.graded.some((w) => w.grade === g))
  const isOpenFor = (w: GradedWrestler) => w.grade === topGrade || unlocked || own.has(nameKey(w.name))
  const locked = !unlocked && recap.graded.some((w) => !isOpenFor(w))
  const firstLockedGrade = GRADES.find((g) => recap.graded.some((w) => w.grade === g && !isOpenFor(w)))

  const intro = sections(recap.intro)
  const assessment = intro.find((s) => /overall/i.test(s.head))
  const table = intro.find((s) => /year comparison/i.test(s.head))
  const method = intro.find((s) => /grades work/i.test(s.head))
  const outro = sections(recap.outro).filter((s) => !/claim your profile/i.test(s.head))
  const paras = (assessment?.body ?? "").split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean)

  return (
    <main style={{ WebkitPrintColorAdjust: "exact", printColorAdjust: "exact", ...RW_ACCENT }} className="mx-auto max-w-4xl px-4 py-6">
      {!PUBLIC && (
        <div className="mb-4 rounded-md bg-amber-100 px-3 py-2 text-sm font-semibold text-amber-900">
          Draft — visible to admins only. Set SUPER32_GIRLS_RECAP_PUBLIC=1 to publish.{" "}
          {previewFree ? <Link href="?" className="underline">Viewing as a free reader — show full</Link> : <Link href="?preview=free" className="underline">Preview as a free reader</Link>}
        </div>
      )}

      <Hero title={recap.title} />
      <StatStrip entrants={entrants} />
      {rankingsUpdateNoticeActive() && (
        <div className="mt-4 flex items-start gap-2 rounded-xl border border-[#A3E635]/60 bg-[#F7FEE7] px-4 py-3 text-sm text-[#365314] print:hidden">
          <span aria-hidden>📊</span>
          <span><strong>Rankings update:</strong> {rankingsUpdateSentence()}</span>
        </div>
      )}

      {paras.length > 0 && (
        <section className="mt-8">
          <p className="text-xl font-medium leading-relaxed text-[#0b1730] md:text-2xl" dangerouslySetInnerHTML={linkedInline(paras[0]!)} />
          {paras.slice(1).map((p, i) =>
            /^\*/.test(p)
              ? <p key={i} className="mt-4 rounded-lg bg-[#f4f6fb] px-4 py-2 text-sm text-gray-600" dangerouslySetInnerHTML={inlineHtml(p)} />
              : <p key={i} className="mt-4 text-[17px] leading-relaxed text-gray-800" dangerouslySetInnerHTML={linkedInline(p)} />,
          )}
        </section>
      )}

      {/* Early, for non-members (Matt, 26 Oct 2026): claim the profile free, or Insider for every grade. */}
      {!unlocked && (
        <div className="mt-6 grid gap-2 sm:grid-cols-2">
          <Link href="/create-profile" className="group rounded-xl border border-[#A3E635]/70 bg-[#F7FEE7] p-4 hover:border-[#A3E635]">
            <div className="text-[11px] font-bold uppercase tracking-wider text-[#3F6212]">Families · free</div>
            <div className="mt-0.5 font-black text-[#0b1730]">Claim your wrestler&apos;s profile →</div>
            <div className="text-xs text-gray-600">See her grade in this recap, every result, and how many college coaches viewed her.</div>
          </Link>
          <Link href="/membership" className="group rounded-xl bg-[#0b1730] p-4 text-white hover:bg-[#13294b]">
            <div className="text-[11px] font-bold uppercase tracking-wider text-[#A3E635]">Insider · $9.99/mo</div>
            <div className="mt-0.5 font-black">Sign up for Insider →</div>
            <div className="text-xs text-[#c9d4ea]">Every grade, the rankings and college profile views.</div>
          </Link>
        </div>
      )}
      {table && <ThreeYear body={table.body} />}
      <PhotoBreak photos={BREAKS.intro} />
      {method && <GradeLegend body={method.body} counts={Object.fromEntries(GRADES.map((g) => [g, recap.graded.filter((w) => w.grade === g).length]))} />}

      {GRADES.map((g) => {
        const ws = recap.graded.filter((w) => w.grade === g)
        if (!ws.length) return null
        const st = GRADE_STYLE[g]!
        const allOpen = ws.every(isOpenFor)
        return (
          <section key={g} className="mt-10">
            {locked && g === firstLockedGrade && <UnlockPanel />}
            <div className="mt-8 flex items-center gap-3">
              {allOpen
                ? <span className={`flex h-10 w-10 items-center justify-center rounded-lg text-base font-black ${st.badge}`}>{st.label}</span>
                : <span className="h-10 w-10 rounded-lg bg-gray-200 blur-[2px]" aria-hidden />}
              <div>
                <h2 className="text-xl font-black text-[#0b1730]">{allOpen ? `Grade ${st.label}` : "Graded below"}</h2>
                {allOpen && <div className="text-xs text-gray-500">{st.blurb}</div>}
              </div>
            </div>
            <div className="mt-3 grid gap-3">
              {ws.map((w, i) => (isOpenFor(w) ? <WrestlerCard key={w.name} w={w} e={byName.get(nameKey(w.name))} placings={placings} photo={photoFor(w)} /> : <LockedCard key={`locked-${g}-${i}`} seed={i} />))}
            </div>
            {(g === "A" || g === "A-") && allOpen && <PhotoBreak photos={BREAKS[g]} />}
          </section>
        )
      })}

      <section className="mt-10">
        <h2 className="text-xl font-black text-[#0b1730]">Honorable mention</h2>
        <div className="mt-3 flex flex-wrap gap-2">
          {recap.honorableMention.map((h, i) => {
            if (!unlocked && !own.has(nameKey(h.name))) {
              return <span key={i} className="pointer-events-none select-none rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-sm shadow-sm blur-[4px]" aria-hidden><span className="font-semibold text-[#003366]">Insider member</span><span className="text-gray-500"> · 000 · High School</span></span>
            }
            const he = byName.get(nameKey(h.name))
            const id = he?.athleteId
            const sc = schoolAndClass(he)
            return (
              <span key={h.name} className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-sm shadow-sm">
                {id
                  ? <Link href={`/athletes/${id}`} className="font-semibold text-[#003366] hover:underline">{h.name}</Link>
                  : <span className="font-semibold text-gray-900">{h.name}</span>}
                <span className="text-gray-500"> · {h.weight}{sc ? ` · ${sc}` : ""}</span>
                {h.note ? <span className="text-gray-500"> · {h.note}</span> : null}
              </span>
            )
          })}
        </div>
      </section>

      {outro.map((s) => (
        <section key={s.head} className="mt-10">
          <h2 className="text-xl font-black text-[#0b1730]">{s.head}</h2>
          <div dangerouslySetInnerHTML={linkedHtml(s.body)} />
        </section>
      ))}

      {/* Members, coaches and admins already have everything: no sales card for them. */}

      {/* Thumbs up/down, the same reactions every article uses (one per account or guest). */}
      <section className="mt-10 rounded-2xl border border-gray-200 bg-[#f4f6fb] px-5">
        <NchsaaArticleReactions articleSlug="super32-2026-nc-girls-recap" />
      </section>

      {!unlocked && <ClaimCard />}
    </main>
  )
}
