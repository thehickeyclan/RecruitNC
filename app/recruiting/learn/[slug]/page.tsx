/**
 * One page of the rules library. The North Carolina page is open to everyone; the rest is part of
 * NC United Blue (admins and verified coaches read it too). A locked page says what it holds and
 * how to get it - it does not redirect, so a shared link still lands somewhere that makes sense.
 */
import type { Metadata } from "next"
import { notFound } from "next/navigation"
import { Lock } from "lucide-react"

import { D1Contact } from "@/components/recruiting/learn/d1-contact"
import { LearnSectionCard } from "@/components/recruiting/learn/learn-section"
import { mostRecentGraduatedClassYear } from "@/lib/class-years"
import { familyAthleteIds } from "@/lib/coach-messages"
import { CHECKED, d1TrackFor, learnPage, type D1Track } from "@/lib/recruiting/learn/content"
import { resolveRankingViewer } from "@/lib/ranking-access"
import { createAdminClient } from "@/lib/supabase/admin"
import { createClient } from "@/lib/supabase/server"

export const dynamic = "force-dynamic"

type Params = { params: Promise<{ slug: string }> }

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const page = learnPage((await params).slug)
  if (!page) return { title: "Recruiting rules | RecruitNC" }
  return { title: `${page.title}: wrestling recruiting rules | RecruitNC`, description: page.summary }
}

const checkedLabel = new Date(`${CHECKED}T12:00:00Z`).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric", timeZone: "UTC" })

export default async function LearnPage({ params }: Params) {
  const page = learnPage((await params).slug)
  if (!page) notFound()

  const admin = createAdminClient()
  const { viewer, userId } = await resolveRankingViewer({ supabase: await createClient(), admin })
  const open = page.free || Boolean(viewer.isBlueMember || viewer.isAdmin || viewer.isVerifiedCoach)

  // Division I dates differ by class and by boys or girls: open on the family's own wrestler.
  let track: D1Track = "men-2028"
  let forName: string | null = null
  if (open && page.slug === "division-1" && userId) {
    const ids = await familyAthleteIds(admin, userId).catch(() => [])
    if (ids.length > 0) {
      const { data: rows } = await admin.from("athletes").select('"firstName", name, gender, graduationyear').in("id", ids)
      const graduated = mostRecentGraduatedClassYear()
      const wrestler = (rows ?? [])
        .filter((a) => !a.graduationyear || Number(a.graduationyear) > graduated)
        .sort((a, b) => Number(a.graduationyear ?? 9999) - Number(b.graduationyear ?? 9999))[0]
      if (wrestler) {
        track = d1TrackFor(wrestler.gender as string | null, wrestler.graduationyear ? Number(wrestler.graduationyear) : null)
        forName = String(wrestler.firstName ?? "").trim() || String(wrestler.name ?? "").trim().split(" ")[0] || null
      }
    }
  }

  return (
    <main className="min-h-screen bg-[#0A1628] px-4 py-8 text-white sm:px-6">
      <div className="mx-auto max-w-3xl">
        <a href="/recruiting/learn" className="text-xs font-semibold text-white/55 hover:text-white">
          ← The rules, level by level
        </a>
        <h1 className="mt-4 text-3xl font-black tracking-tight sm:text-4xl">{page.title}</h1>
        <p className="mt-2 text-sm leading-6 text-white/65">{page.summary}</p>
        <p className="mt-2 text-xs text-white/40">Men&apos;s and women&apos;s wrestling only, 2026-27. Last checked {checkedLabel}. Source links open the governing body&apos;s full document; what is written here is the wrestling rule from it.</p>

        {open ? (
          <div className="mt-6 space-y-4">
            {page.slug === "division-1" ? <D1Contact initial={track} forName={forName} /> : null}
            {page.sections.map((section) => (
              <LearnSectionCard key={section.heading} section={section} />
            ))}
          </div>
        ) : (
          <div className="mt-6 rounded-xl border border-[#D3B574]/40 bg-[#D3B574]/10 p-5 sm:p-6">
            <p className="flex items-center gap-2 text-base font-bold">
              <Lock className="h-4 w-4 text-[#D3B574]" aria-hidden /> This page is part of NC United Blue
            </p>
            <p className="mt-2 text-sm leading-6 text-white/75">It covers, with the source under each:</p>
            <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-white/75 marker:text-[#D3B574]">
              {(page.slug === "division-1" ? [{ heading: "When a Division I coach can contact you, by class" }, ...page.sections] : page.sections).map((s) => (
                <li key={s.heading}>{s.heading}</li>
              ))}
            </ul>
            <div className="mt-4 flex flex-wrap gap-2">
              <a href="/blue" className="rounded-lg bg-[#D3B574] px-5 py-2.5 text-sm font-bold text-[#0A1628] hover:bg-[#e2c98d]">
                Learn about Blue
              </a>
              <a
                href="/recruiting/learn/staying-eligible-in-north-carolina"
                className="rounded-lg border border-white/20 px-5 py-2.5 text-sm font-bold text-white hover:bg-white/5"
              >
                Read the free North Carolina page
              </a>
            </div>
          </div>
        )}

        <p className="mt-8 text-xs leading-5 text-white/40">
          This is education, not eligibility or legal advice. Rules change every year and a college&apos;s compliance
          office has the final word on its own program. If something here looks out of date,{" "}
          <a href="/contact" className="underline hover:text-white/70">
            tell us
          </a>
          .
        </p>
      </div>
    </main>
  )
}
