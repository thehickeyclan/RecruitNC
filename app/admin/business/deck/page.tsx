/**
 * The family deck, to present or to download (Matt, 4 November 2026).
 *
 * The twelve approved slides come from lib/business/deck/slides.ts and never change here. A
 * per-state slide can be added with ?state=XX, read live when the page opens: it goes in at the
 * end and is marked on screen. It cannot reach the PDF, because the PDF is a file built from the
 * twelve at /public/deck and served as it is - there is no path from this page into it. Rebuild
 * it with scripts/build-deck-pdf.cjs when a slide changes.
 *
 * Open to full admins and to the business grant, so Rhett can present without an account on
 * Matt's Claude.
 */
import Link from "next/link"
import { redirect } from "next/navigation"

import { DeckViewer, type ViewerSlide } from "@/components/admin/deck-viewer"
import { businessData } from "@/lib/business/cache"
import { DECK_AS_OF, DECK_SLIDES } from "@/lib/business/deck/slides"
import { stateSlideHtml, stateSlideNotes, stateSlideReady } from "@/lib/business/deck/state-slide"
import { requireBusinessViewer } from "@/lib/business/require-business-viewer"
import { type Gender, stateSummary, statesPresent } from "@/lib/business/metrics"

export const dynamic = "force-dynamic"
export const maxDuration = 60
export const metadata = { title: "Family deck | Business" }

const PAGE = "/admin/business/deck"

export default async function DeckPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const auth = await requireBusinessViewer(PAGE)
  if (!auth.ok) redirect(auth.status === 401 ? `/auth/signin?returnTo=${encodeURIComponent(PAGE)}` : "/")

  const sp = await searchParams
  const slides: ViewerSlide[] = DECK_SLIDES.map((s) => ({ id: s.id, html: s.html, notes: s.notes }))

  let refused: string | null = null
  const wanted = sp.state ? sp.state.toUpperCase() : null
  if (wanted) {
    const data = await businessData()
    if (!statesPresent(data.dims).includes(wanted)) {
      refused = `There are no ${wanted} profiles, so there is no slide to add.`
    } else {
      const gender: Gender | "all" = sp.gender === "Male" || sp.gender === "Female" ? sp.gender : "all"
      const summary = stateSummary(wanted, gender, data.dims, data.events)
      if (!stateSlideReady(summary)) {
        refused = `No ${wanted} family has claimed a profile and no college coach has opened one, so that slide would argue against you. The deck is here without it.`
      } else {
        const split = {
          boys: stateSummary(wanted, "Male", data.dims, data.events).profiles,
          girls: stateSummary(wanted, "Female", data.dims, data.events).profiles,
        }
        slides.push({ id: "state-live", html: stateSlideHtml(summary, split), notes: stateSlideNotes(summary), live: true })
      }
    }
  }

  // admin-dark-page opts out of the light admin background in app/globals.css.
  return (
    <div className="admin-dark-page min-h-screen bg-[#060f1f] text-white">
      <div className="flex flex-wrap items-center gap-3 px-4 pt-3 text-sm text-white/55">
        <Link href="/admin/business" className="font-bold text-[#A3E635] hover:underline">
          ← Business
        </Link>
        <span>
          The twelve slides as approved, dated{" "}
          {new Date(`${DECK_AS_OF}T12:00:00Z`).toLocaleDateString("en-US", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" })}.
        </span>
        {!wanted ? (
          <span>
            Add a state from{" "}
            <Link href="/admin/business" className="underline hover:text-white">
              its page
            </Link>
            .
          </span>
        ) : null}
        {refused ? <span className="rounded-full bg-amber-400/15 px-3 py-1 text-xs font-semibold text-amber-200">{refused}</span> : null}
      </div>
      {/* A file holding the twelve and nothing else: the live slide cannot reach it. */}
      <DeckViewer slides={slides} pdfHref="/deck/RecruitWrestlers-for-Families.pdf" />
    </div>
  )
}
