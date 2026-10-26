/**
 * Super 32 2026 — North Carolina Boys Recap. The top (through "How the Grades Work") and the top
 * grade awarded are free; below that, names, grades and details are locked (never sent in the HTML) for anyone without premium
 * access (Insider, Command Center, Blue, verified college coaches, admins). A family linked to a
 * wrestler sees that wrestler's grade free. Members are never shown a sales panel.
 *
 * The words come from content/news/*.md untouched; the page dresses them: a hero with the headline
 * numbers, the three-year table as stat cards, a grade legend, and a card per wrestler whose record,
 * school, class year and seeded wins are read from the published Super 32 results, not retyped.
 *
 * Draft until SUPER32_RECAP_PUBLIC=1: admins only, everyone else gets a 404 (Matt, 25 Oct).
 */
import type { Metadata } from "next"
import Link from "next/link"
import { notFound } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { resolveRankingViewer } from "@/lib/ranking-access"
import { hasPortalAccess, hasPremiumAccess } from "@/lib/ranking-visibility"
import { GRADES, loadRecap, nameKey, SUPER32_2026_BOYS_RECAP, type GradedWrestler } from "@/lib/news-recaps/recap"
import { markdownToHtml } from "@/lib/news-recaps/markdown"
import { linkNames } from "@/lib/news-recaps/link-names"
import { latestSnapshot, type SnapshotEntrant } from "@/lib/super32-live/snapshot"

export const dynamic = "force-dynamic"

const PUBLIC = process.env.SUPER32_RECAP_PUBLIC === "1"
const IMG = "/images/news/super32-2026-boys-recap"
/**
 * Approved photos (Matt, 25 Oct) break up the article between sections, each with the context
 * beneath it, rather than sitting beside a few wrestlers' cards. No photo credits (Matt, 25 Oct).
 */
type Photo = { src: string; alt: string; caption: string }
const BREAKS: Record<"intro" | "A" | "A-", Photo[]> = {
  intro: [{ src: `${IMG}/mason-brown.jpg`, alt: "Mason Brown", caption: "Mason Brown (120) beat three top-15 seeds, #6, #13 and #14, as many as any North Carolinian, and reached the blood round." }],
  A: [{ src: `${IMG}/braylen-yates.jpg`, alt: "Braylen Yates", caption: "Braylen Yates (East Rowan, 175), seeded 20th, beat three seeds on the mat and finished 8th, North Carolina's lone boys All-American." }],
  "A-": [
    { src: `${IMG}/campbell-tufts.jpg`, alt: "Campbell Tufts", caption: "Campbell Tufts (165) won four straight in the consolations, every one over a state champion or runner-up." },
    { src: `${IMG}/drew-teeter.jpg`, alt: "Drew Teeter", caption: "Drew Teeter (190) majored the #10 seed, Maximus Purdy, 15-4." },
  ],
}

function PhotoBreak({ photos }: { photos: Photo[] }) {
  return (
    <div className={`mt-10 grid gap-4 ${photos.length > 1 ? "sm:grid-cols-2" : ""}`}>
      {photos.map((ph) => (
        <figure key={ph.src}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={ph.src} alt={ph.alt} className={`w-full rounded-xl object-cover object-top ${photos.length > 1 ? "h-72" : "h-80 md:h-[26rem]"}`} />
          <figcaption className="mt-2 border-l-2 border-[#d4af55] pl-3 text-sm leading-snug text-gray-600">{ph.caption}</figcaption>
        </figure>
      ))}
    </div>
  )
}

const GRADE_STYLE: Record<string, { badge: string; label: string; blurb: string }> = {
  "A+": { badge: "bg-[#e5372c] text-white", label: "A+", blurb: "Top-four finish on the podium" },
  A: { badge: "bg-[#d4af55] text-[#0b1730]", label: "A", blurb: "Beat two or more top-15 seeds, reached the blood round or better" },
  "A-": { badge: "bg-[#e9cf86] text-[#0b1730]", label: "A-", blurb: "Beat a seeded wrestler" },
  "B+": { badge: "bg-[#3b5ba5] text-white", label: "B+", blurb: "Beat a nationally ranked wrestler, or won five with every loss to a seed" },
  B: { badge: "bg-[#5a76b8] text-white", label: "B", blurb: "Winning record with a win over a state champion or placer" },
  "B-": { badge: "bg-[#8195bd] text-white", label: "B-", blurb: "2-2 with a win over a state champion or runner-up" },
}

// While a draft, the page title and description say nothing: a signed-out visitor gets the
// not-found page, and the title must not name the article either.
export const metadata: Metadata = PUBLIC
  ? { title: "Super 32 2026 — North Carolina Boys Recap", description: "Every NC boy at Super 32, graded on the strength of his tournament." }
  : { title: "News", robots: { index: false, follow: false } }

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
const LINK_CLASS = "font-semibold text-[#003366] underline decoration-[#d4af55] decoration-2 underline-offset-2"
const linkedInline = (md: string) => ({ __html: linkNames(markdownToHtml(md).replace(/^<p[^>]*>|<\/p>$/g, ""), PROFILE_LINKS, LINK_CLASS) })
const linkedHtml = (md: string) => ({ __html: linkNames(markdownToHtml(md), PROFILE_LINKS, LINK_CLASS) })

function Hero({ title }: { title: string }) {
  return (
    <header className="relative overflow-hidden rounded-2xl bg-[#0b1730]">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={`${IMG}/yates-celebration-hd.jpg`} alt="Braylen Yates celebrates at Super 32" className="h-72 w-full object-cover object-[50%_30%] opacity-80 md:h-96" />
      <div className="absolute inset-0 bg-gradient-to-t from-[#0b1730] via-[#0b1730]/60 to-transparent" />
      <div className="absolute inset-x-0 bottom-0 p-5 md:p-8">
        <div className="text-[11px] font-bold uppercase tracking-[0.2em] text-[#d4af55]">NC United · Super 32 · Greensboro</div>
        <h1 className="mt-1 text-3xl font-black leading-tight text-white md:text-5xl">{title.replace(/^Super 32 2026 — /, "")}</h1>
        <div className="mt-1 text-sm text-[#c9d4ea]">Super 32 2026</div>
      </div>
    </header>
  )
}

function StatStrip({ entrants }: { entrants: SnapshotEntrant[] }) {
  const boys = entrants.filter((e) => e.gender === "boys")
  const top15 = boys.flatMap((e) => e.bouts.filter((b) => b.win && b.opponentSeed && b.opponentSeed <= 15 && !/for/i.test(b.winType))).length
  const tiles: Array<[string, string]> = [
    [String(boys.length), "NC boys in the brackets"],
    [String(top15), "wins over top-15 seeds"],
    [String(boys.filter((e) => e.wins > e.losses).length), "winning records"],
    [String(boys.filter((e) => e.aaClinched).length), "All-American"],
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

/** The three-year table as cards: each row a stat, 2026 called out. */
const YEARS = ["2024", "2025", "2026"] as const
const FEATURED = /top-15/i

/** Vertical columns, years left to right, so a row reads as progress over time; 2026 in gold. */
function Columns({ vals, height }: { vals: number[]; height: number }) {
  const max = Math.max(...vals, 1)
  // Bars live in their own fixed-height area, so a bar's height is exactly its share of the
  // largest value; the labels sit outside it and can never squeeze a bar.
  return (
    <div className="flex justify-around gap-3">
      {YEARS.map((yr, i) => {
        const now = i === YEARS.length - 1
        return (
          <div key={yr} className="flex flex-1 flex-col items-center">
            <div className="flex w-full flex-col items-center justify-end" style={{ height }}>
              <span className={`mb-1 ${now ? "text-lg font-black text-[#0b1730]" : "text-sm font-semibold text-gray-500"}`}>{vals[i]}</span>
              <div className={`w-full max-w-[56px] shrink-0 rounded-t-md ${now ? "bg-[#d4af55]" : "bg-[#c7d0e2]"}`} style={{ height: Math.max(3, Math.round(((height - 32) * vals[i]!) / max)) }} />
            </div>
            <span className={`mt-1.5 text-xs ${now ? "font-bold text-[#0b1730]" : "text-gray-400"}`}>{yr}</span>
          </div>
        )
      })}
    </div>
  )
}

function Change({ vals }: { vals: number[] }) {
  const d = vals[2]! - vals[1]!
  if (d === 0) return <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[11px] font-semibold text-gray-500">Same as 2025</span>
  return (
    <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${d > 0 ? "bg-[#fbf3dc] text-[#7a5d12]" : "bg-gray-100 text-gray-500"}`}>
      {d > 0 ? "+" : ""}{d} vs 2025
    </span>
  )
}

function ThreeYear({ body }: { body: string }) {
  const lines = body.split("\n").filter((l) => l.startsWith("|") && !/^\|\s*-/.test(l))
  const note = body.split("\n").filter((l) => !l.startsWith("|")).join(" ").trim()
  const rows = lines.slice(1).map((l) => l.replace(/^\||\|$/g, "").split("|").map((c) => c.trim()))
    .map(([label, ...ys]) => ({ label: label!, vals: ys.slice(0, 3).map(Number) }))
  const featured = rows.find((r) => FEATURED.test(r.label))
  const rest = rows.filter((r) => r !== featured)
  return (
    <section className="mt-10">
      <h2 className="text-2xl font-black text-[#0b1730]">Three years of progress</h2>
      {featured && (
        <div className="mt-4 rounded-2xl border border-[#e9cf86] bg-white p-5 shadow-sm">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <div className="text-lg font-black text-[#0b1730]">{featured.label}</div>
            <Change vals={featured.vals} />
          </div>
          <div className="mt-4"><Columns vals={featured.vals} height={220} /></div>
        </div>
      )}
      <div className="mt-3 grid grid-cols-2 gap-3 lg:grid-cols-3">
        {rest.map((r) => (
          <div key={r.label} className="rounded-xl border border-gray-200 bg-white p-3 shadow-sm">
            <div className="min-h-[2.5rem] text-[13px] font-semibold leading-tight text-gray-700">{r.label}</div>
            <div className="mt-2"><Columns vals={r.vals} height={120} /></div>
            <div className="mt-2 text-center"><Change vals={r.vals} /></div>
          </div>
        ))}
      </div>
      {note && <p className="mt-3 text-xs leading-relaxed text-gray-500" dangerouslySetInnerHTML={inlineHtml(note)} />}
    </section>
  )
}

function GradeLegend({ body, counts }: { body: string; counts: Record<string, number> }) {
  return (
    <section className="mt-10 rounded-2xl bg-[#f4f6fb] p-5">
      <h2 className="text-2xl font-black text-[#0b1730]">How the grades work</h2>
      <p className="mt-1 text-sm text-gray-600">Performance grades for this tournament, not rankings of the wrestlers. Each grade has one rule; a wrestler gets the highest one he meets.</p>
      <div className="mt-4 grid gap-2 sm:grid-cols-2">
        {GRADES.map((g) => {
          const st = GRADE_STYLE[g]!
          const n = counts[g] ?? 0
          return (
            <div key={g} className="flex items-center gap-3 rounded-lg bg-white p-2.5">
              <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-md text-sm font-black ${st.badge}`}>{st.label}</span>
              <span className="text-sm text-gray-700">{st.blurb}{g === "A+" ? <span className="text-gray-400"> · reserved, none this year</span> : <span className="text-gray-400"> · {n}</span>}</span>
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

function Chip({ children, tone = "gray" }: { children: React.ReactNode; tone?: "gold" | "gray" | "navy" }) {
  const c = tone === "gold" ? "bg-[#fbf3dc] text-[#7a5d12] border-[#e9cf86]" : tone === "navy" ? "bg-[#0b1730] text-white border-[#0b1730]" : "bg-gray-50 text-gray-700 border-gray-200"
  return <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-semibold ${c}`}>{children}</span>
}

const ordinal = (n: number) => `${n}${n === 1 ? "st" : n === 2 ? "nd" : n === 3 ? "rd" : "th"}`

/** Locked: no props at all, so nothing that identifies the wrestler reaches the page, even blurred (Matt, 25 Oct). */
function LockedCard() {
    return (
      <div className="relative overflow-hidden rounded-xl border border-gray-200 bg-white p-4 shadow-sm" aria-label="Locked: Insider members only">
        <div className="flex items-center gap-3" aria-hidden>
          <span className="h-11 w-11 shrink-0 rounded-lg bg-gray-200 blur-[2px]" />
          <div className="min-w-0 flex-1 space-y-2 blur-[3px]">
            <div className="h-3.5 w-40 rounded bg-gray-300" />
            <div className="h-2.5 w-28 rounded bg-gray-200" />
          </div>
        </div>
        <div className="mt-3 space-y-1.5 blur-[4px]" aria-hidden>
          <div className="h-2.5 w-11/12 rounded bg-gray-200" /><div className="h-2.5 w-10/12 rounded bg-gray-200" /><div className="h-2.5 w-8/12 rounded bg-gray-200" />
        </div>
      </div>
    )
}

function WrestlerCard({ w, e }: { w: GradedWrestler; e: SnapshotEntrant | undefined }) {
  const st = GRADE_STYLE[w.grade]!
  const record = e ? `${e.wins}-${e.losses}` : (w.heading.match(/(\d+-\d+)/)?.[1] ?? "")
  const seeded = (e?.bouts ?? []).filter((b) => b.win && b.opponentSeed && !/for/i.test(b.winType)).sort((a, b) => a.opponentSeed! - b.opponentSeed!)
  return (
    <article className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
      <div className="flex gap-4 p-4">
        <span className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-lg text-lg font-black ${st.badge}`}>{st.label}</span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-baseline gap-x-2">
            <h3 className="text-lg font-black text-[#0b1730]">{e?.athleteId ? <Link href={`/athletes/${e.athleteId}`} className="hover:underline">{w.name}</Link> : w.name}</h3>
            <span className="text-sm text-gray-500">{[`${w.weight} lbs`, e?.school && !/^n\/?a$/i.test(e.school) ? e.school : null, e?.classYear ? `Class of ${e.classYear}` : null].filter(Boolean).join(" · ")}</span>
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
    </article>
  )
}

function UnlockPanel() {
  return (
    <div className="mt-8 rounded-2xl border border-[#d4af55] bg-[#0b1730] p-5 text-white">
      <div className="text-[11px] font-bold uppercase tracking-wider text-[#d4af55]">Insider</div>
      <div className="mt-1 text-xl font-bold">Sign up for Insider and get full access.</div>
      <p className="mt-1 text-sm text-[#c9d4ea]">Tournament grade reports, rankings and college profile views. Is your wrestler here? Claim the profile free and see their grade.</p>
      <div className="mt-3 flex flex-col gap-2 sm:flex-row">
        <Link href="/rankings" className="rounded-lg bg-[#d4af55] px-4 py-2.5 text-center text-sm font-semibold text-[#0b1730]">Sign up for Insider →</Link>
        <Link href="/create-profile" className="rounded-lg bg-white px-4 py-2.5 text-center text-sm font-semibold text-[#0b1730]">Claim a profile free</Link>
        <Link href="/auth/signup?type=college-coach" className="rounded-lg border border-white/40 px-4 py-2.5 text-center text-sm font-semibold">College coach? Free access</Link>
      </div>
    </div>
  )
}

function ClaimCard() {
  return (
    <section className="mt-10 overflow-hidden rounded-2xl border border-[#d4af55]/60 bg-gradient-to-br from-[#13294b] to-[#0b1730] text-white">
      <div className="p-6">
        <div className="text-[11px] font-bold uppercase tracking-wider text-[#d4af55]">Every result in this recap lands on a profile</div>
        <h2 className="mt-1 text-2xl font-bold leading-tight md:text-3xl">Claim your wrestler&apos;s profile. It&apos;s free.</h2>
        <p className="mt-2 text-sm text-[#c9d4ea]">Almost every wrestler here already has an NC United profile, built from verified results. Claim it to check it, correct it and follow it.</p>
        <div className="mt-4 grid gap-3 md:grid-cols-3">
          <Link href="/create-profile" className="rounded-xl bg-white p-4 text-[#0b1730]">
            <div className="text-xs font-bold uppercase tracking-wider text-[#003366]">Families</div>
            <div className="mt-1 text-lg font-bold">Claim a profile free →</div>
            <div className="mt-1 text-xs text-gray-600">See your own wrestler&apos;s grade in this recap.</div>
          </Link>
          <Link href="/rankings" className="rounded-xl bg-[#d4af55] p-4 text-[#0b1730]">
            <div className="text-xs font-bold uppercase tracking-wider">Insider · $9.99/mo</div>
            <div className="mt-1 text-lg font-bold">Every grade + the data →</div>
            <div className="mt-1 text-xs text-[#0b1730]/80">Full rankings, the bout-by-bout file, and which college programs viewed your wrestler.</div>
          </Link>
          <Link href="/auth/signup?type=college-coach" className="rounded-xl border border-white/30 p-4">
            <div className="text-xs font-bold uppercase tracking-wider text-[#d4af55]">College coaches</div>
            <div className="mt-1 text-lg font-bold">Free access →</div>
            <div className="mt-1 text-xs text-[#c9d4ea]">Every profile, ranking and grade, built from verified results.</div>
          </Link>
        </div>
      </div>
    </section>
  )
}

export default async function Super32BoysRecapPage({ searchParams }: { searchParams: Promise<{ preview?: string }> }) {
  const supabase = await createClient()
  const admin = createAdminClient()
  const { viewer, userId } = await resolveRankingViewer({ supabase, admin })
  if (!PUBLIC && !viewer.isAdmin) notFound()

  const recap = loadRecap(SUPER32_2026_BOYS_RECAP)
  const snap = await latestSnapshot(admin, "super32-2026", true)
  const entrants = snap?.data.entrants ?? []
  const byName = new Map(entrants.filter((e) => e.gender === "boys").map((e) => [nameKey(e.name), e]))
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
  const table = intro.find((s) => /three-year/i.test(s.head))
  const method = intro.find((s) => /grades work/i.test(s.head))
  const outro = sections(recap.outro).filter((s) => !/claim your profile/i.test(s.head))
  const paras = (assessment?.body ?? "").split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean)

  return (
    <main className="mx-auto max-w-4xl px-4 py-6">
      {!PUBLIC && (
        <div className="mb-4 rounded-md bg-amber-100 px-3 py-2 text-sm font-semibold text-amber-900">
          Draft — visible to admins only. Set SUPER32_RECAP_PUBLIC=1 to publish.{" "}
          {previewFree ? <Link href="?" className="underline">Viewing as a free reader — show full</Link> : <Link href="?preview=free" className="underline">Preview as a free reader</Link>}
        </div>
      )}

      <Hero title={recap.title} />
      <StatStrip entrants={entrants} />

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
              {ws.map((w, i) => (isOpenFor(w) ? <WrestlerCard key={w.name} w={w} e={byName.get(nameKey(w.name))} /> : <LockedCard key={`locked-${g}-${i}`} />))}
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
              return <span key={i} className="h-8 w-36 rounded-lg border border-gray-200 bg-gray-100 blur-[2px]" aria-hidden />
            }
            const id = byName.get(nameKey(h.name))?.athleteId
            return (
              <span key={h.name} className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-sm shadow-sm">
                {id
                  ? <Link href={`/athletes/${id}`} className="font-semibold text-[#003366] hover:underline">{h.name}</Link>
                  : <span className="font-semibold text-gray-900">{h.name}</span>}
                <span className="text-gray-500"> · {h.weight}</span>
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
      {!unlocked && <ClaimCard />}
    </main>
  )
}
