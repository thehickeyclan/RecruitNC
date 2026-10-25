/**
 * Super 32 2026 — North Carolina Boys Recap. The top (through "How the Grades Work") and the top
 * grade awarded are free; below that, names show and grades are locked for anyone without premium
 * access (Rankings, Command Center, Blue, verified college coaches, admins). A family linked to a
 * wrestler sees that wrestler's grade free.
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
import { latestSnapshot } from "@/lib/super32-live/snapshot"

export const dynamic = "force-dynamic"

const IMG = "/images/news/super32-2026-boys-recap"
/** Approved photos (Matt, 25 Oct). Shown with a wrestler only when his paragraph is open. */
const PHOTOS: Record<string, { src: string; credit: string }> = {
  "mason brown": { src: `${IMG}/mason-brown.jpg`, credit: "Darkhorse" },
  "braylen yates": { src: `${IMG}/braylen-yates.jpg`, credit: "Darkhorse" },
  "drew teeter": { src: `${IMG}/drew-teeter.jpg`, credit: "Darkhorse" },
  "campbell tufts": { src: `${IMG}/campbell-tufts.jpg`, credit: "Shannon Tufts" },
}

const PUBLIC = process.env.SUPER32_RECAP_PUBLIC === "1"

// While a draft, the page title and description say nothing: a signed-out visitor gets the
// not-found page, and the title must not name the article either.
export const metadata: Metadata = PUBLIC
  ? { title: "Super 32 2026 — North Carolina Boys Recap", description: "Every NC boy at Super 32, graded on the strength of his tournament." }
  : { title: "News", robots: { index: false, follow: false } }

/** Names of the wrestlers this account owns or is a parent of, for the free own-grade unlock. */
async function ownWrestlerNames(userId: string | null): Promise<Set<string>> {
  if (!userId) return new Set()
  const admin = createAdminClient()
  const [claimed, linked, snap] = await Promise.all([
    admin.from("athletes").select("id").eq("claimed_by_user_id", userId),
    admin.from("parent_athlete_links").select("athlete_id").eq("user_id", userId),
    latestSnapshot(admin, "super32-2026", true),
  ])
  const ids = new Set([...(claimed.data ?? []).map((r) => r.id), ...(linked.data ?? []).map((r) => r.athlete_id)])
  if (!ids.size || !snap) return new Set()
  return new Set(snap.data.entrants.filter((e) => e.athleteId && ids.has(e.athleteId)).map((e) => nameKey(e.name)))
}

function Wrestler({ w, open }: { w: GradedWrestler; open: boolean }) {
  if (open) {
    const photo = PHOTOS[nameKey(w.name)]
    return (
      <div className="mt-4">
        {photo && (
          <figure className="float-right mb-2 ml-4 w-32 sm:w-40">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={photo.src} alt={w.name} className="w-full rounded-lg object-cover" />
            <figcaption className="mt-1 text-[10px] text-gray-500">Photo: {photo.credit}</figcaption>
          </figure>
        )}
        <p className="leading-relaxed text-gray-800" dangerouslySetInnerHTML={{ __html: markdownToHtml(`**${w.heading}.** ${w.paragraph}`).replace(/^<p[^>]*>|<\/p>$/g, "") }} />
        <div className="clear-both" />
      </div>
    )
  }
  return (
    <div className="mt-3 flex items-center justify-between gap-3 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2.5">
      <span className="font-semibold text-gray-900">{w.name} <span className="font-normal text-gray-500">({w.weight})</span></span>
      <span className="select-none rounded bg-gray-200 px-2 py-0.5 text-xs font-bold text-transparent blur-[3px]">{w.grade}</span>
    </div>
  )
}

export default async function Super32BoysRecapPage() {
  const supabase = await createClient()
  const admin = createAdminClient()
  const { viewer, userId } = await resolveRankingViewer({ supabase, admin })
  if (!PUBLIC && !viewer.isAdmin) notFound()

  const recap = loadRecap(SUPER32_2026_BOYS_RECAP)
  const unlocked = hasPremiumAccess(viewer) || hasPortalAccess(viewer)
  const own = unlocked ? new Set<string>() : await ownWrestlerNames(userId)
  // The top grade awarded is free (A+ is reserved and usually empty, so this is normally the A group).
  const topGrade = GRADES.find((g) => recap.graded.some((w) => w.grade === g))
  const locked = !unlocked && recap.graded.some((w) => w.grade !== topGrade && !own.has(nameKey(w.name)))

  return (
    <main className="mx-auto max-w-3xl px-4 py-8">
      {!PUBLIC && <div className="mb-4 rounded-md bg-amber-100 px-3 py-2 text-sm font-semibold text-amber-900">Draft — visible to admins only. Set SUPER32_RECAP_PUBLIC=1 to publish.</div>}
      <h1 className="text-3xl font-bold leading-tight text-[#0b1730]">{recap.title}</h1>
      <figure className="mt-4">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={`${IMG}/yates-celebration.jpg`} alt="Braylen Yates celebrates at Super 32" className="w-full rounded-xl object-cover" />
        <figcaption className="mt-1 text-xs text-gray-500">Braylen Yates, North Carolina&apos;s lone boys All-American. Photo: Rhett Hoy Photography</figcaption>
      </figure>
      <article dangerouslySetInnerHTML={{ __html: markdownToHtml(recap.intro) }} />

      {GRADES.map((g) => {
        const ws = recap.graded.filter((w) => w.grade === g)
        if (!ws.length) return null
        const isOpen = (w: GradedWrestler) => g === topGrade || unlocked || own.has(nameKey(w.name))
        const allOpen = ws.every(isOpen)
        return (
          <section key={g}>
            <h2 className="mt-8 text-xl font-bold text-[#0b1730]">{allOpen ? g : "Graded below"}</h2>
            {ws.map((w) => <Wrestler key={w.name} w={w} open={isOpen(w)} />)}
          </section>
        )
      })}

      {locked && (
        <div className="mt-8 rounded-xl border border-[#d4af55] bg-[#0b1730] p-5 text-white">
          <div className="text-[11px] font-bold uppercase tracking-wider text-[#d4af55]">Every grade, every paragraph</div>
          <div className="mt-1 text-xl font-bold">Unlock the full recap with Rankings.</div>
          <p className="mt-1 text-sm text-[#c9d4ea]">Rankings members, NC United Blue families and college coaches see every grade and the data file behind it. Is your wrestler here? Claim the profile free and see their grade.</p>
          <div className="mt-3 flex flex-col gap-2 sm:flex-row">
            <Link href="/rankings" className="rounded-lg bg-[#d4af55] px-4 py-2.5 text-center text-sm font-semibold text-[#0b1730]">See Rankings →</Link>
            <Link href="/create-profile" className="rounded-lg bg-white px-4 py-2.5 text-center text-sm font-semibold text-[#0b1730]">Claim a profile free</Link>
            <Link href="/auth/signup?type=college-coach" className="rounded-lg border border-white/40 px-4 py-2.5 text-center text-sm font-semibold">College coach? Free access</Link>
          </div>
        </div>
      )}

      <section>
        <h2 className="mt-8 text-xl font-bold text-[#0b1730]">Honorable Mention</h2>
        <p className="mt-3 leading-relaxed text-gray-800">
          {recap.honorableMention.map((h) => `${h.name} (${h.weight}${unlocked || own.has(nameKey(h.name)) ? `${h.note ? `, ${h.note}` : ""}` : ""})`).join(" · ")}
        </p>
      </section>
      {/* The markdown's own "Claim Your Profile" paragraph is replaced by the designed card below. */}
      <article dangerouslySetInnerHTML={{ __html: markdownToHtml(recap.outro.replace(/## Claim Your Profile[\s\S]*$/, "").trim()) }} />

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
              <div className="text-xs font-bold uppercase tracking-wider">Rankings · $9.99/mo</div>
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
    </main>
  )
}
