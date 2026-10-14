/**
 * The tournaments college coaches want to see: men's folkstyle, men's freestyle and Greco, and
 * women's (lib/recruiting/learn/tournaments.ts). Open to everyone - it tells a family where to
 * wrestle, which is the portal's best argument for itself. A girl's family sees the women's list
 * first.
 */
import type { Metadata } from "next"
import { AlertTriangle, Calendar, MapPin, Users } from "lucide-react"

import { listsFor, type Tournament } from "@/lib/recruiting/learn/tournaments"
import { familyFocus } from "@/lib/recruiting/family-focus"
import { resolvePortalViewer } from "@/lib/recruiting/portal-viewer"
import { createAdminClient } from "@/lib/supabase/admin"
import { createClient } from "@/lib/supabase/server"

export const dynamic = "force-dynamic"

export const metadata: Metadata = {
  title: "The tournaments college wrestling coaches watch | RecruitNC",
  description: "Where college coaches want to see a wrestler compete: men's folkstyle, men's freestyle and Greco, and women's wrestling, with when and where each is held.",
}

const TIER_LABEL: Record<Tournament["tier"], string> = { national: "National", regional: "Regional", state: "In North Carolina" }

function EventCard({ event }: { event: Tournament }) {
  return (
    <li className="rounded-xl border border-white/10 bg-[#0f1c2e] p-4">
      <div className="flex flex-wrap items-center gap-2">
        <h3 className="text-base font-bold text-white">{event.name}</h3>
        <span className="rounded-full border border-white/15 px-2 py-0.5 text-[11px] font-semibold text-white/70">{event.style}</span>
        <span className="rounded-full bg-[#D3B574]/15 px-2 py-0.5 text-[11px] font-semibold text-[#D3B574]">{TIER_LABEL[event.tier]}</span>
      </div>
      <p className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-white/60">
        {event.when ? (
          <span className="inline-flex items-center gap-1">
            <Calendar className="h-3.5 w-3.5" aria-hidden /> {event.when}
          </span>
        ) : null}
        {event.where ? (
          <span className="inline-flex items-center gap-1">
            <MapPin className="h-3.5 w-3.5" aria-hidden /> {event.where}
          </span>
        ) : null}
        <span className="inline-flex items-center gap-1">
          <Users className="h-3.5 w-3.5" aria-hidden /> {event.who}
        </span>
      </p>
      <p className="mt-2 text-sm leading-6 text-white/80">{event.why}</p>
      {event.caution ? (
        <p className="mt-2 flex items-start gap-2 rounded-lg border border-amber-300/30 bg-amber-300/10 px-3 py-2 text-xs leading-5 text-amber-100">
          <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden /> {event.caution}
        </p>
      ) : null}
    </li>
  )
}

export default async function TournamentsPage() {
  const admin = createAdminClient()
  const { userId } = await resolvePortalViewer({ supabase: await createClient(), admin })
  const focus = await familyFocus(admin, userId)
  const lists = listsFor(focus?.gender ?? null)

  return (
    <main className="min-h-screen bg-[#0A1628] px-4 py-8 text-white sm:px-6">
      <div className="mx-auto max-w-3xl">
        <a href="/my-recruiting#learn" className="text-xs font-semibold text-white/55 hover:text-white">
          ← Recruiting Command Center
        </a>
        <p className="mt-4 text-[11px] font-black uppercase tracking-widest text-[#D3B574]">RecruitNC · Recruiting Portal</p>
        <h1 className="mt-1 text-3xl font-black tracking-tight sm:text-4xl">The tournaments college coaches watch</h1>
        <p className="mt-2 text-sm leading-6 text-white/65">
          Where college coaches want to see a wrestler compete, most valuable first. Men&apos;s and women&apos;s are listed
          separately: a women&apos;s college coach is recruiting a freestyle wrestler.
        </p>
        <nav className="mt-4 flex flex-wrap gap-2" aria-label="Lists">
          {lists.map((l) => (
            <a key={l.key} href={`#${l.key}`} className="rounded-full border border-white/15 px-3 py-1.5 text-xs font-bold text-white/85 hover:border-[#D3B574]/60">
              {l.title}
            </a>
          ))}
        </nav>

        {lists.map((list) => (
          <section key={list.key} id={list.key} className="mt-8 scroll-mt-24">
            <h2 className="text-xl font-black tracking-tight">
              {list.title}
              {focus && list.key === "womens" && focus.gender === "womens" ? <span className="ml-2 text-sm font-semibold text-[#D3B574]">for {focus.names.join(" and ")}</span> : null}
            </h2>
            <p className="mt-1 text-sm leading-6 text-white/60">{list.intro}</p>
            <ul className="mt-3 space-y-3">
              {list.events.map((event) => (
                <EventCard key={`${list.key}-${event.name}`} event={event} />
              ))}
            </ul>
          </section>
        ))}

        <p className="mt-8 text-xs leading-5 text-white/45">
          The order and the reasons are our view, from what college staffs recruit from and what North Carolina commits wrestled.
          Dates and places come from the events we hold results for; where we hold none, no month is given. Check each event&apos;s
          own site for this year&apos;s dates and entry rules.{" "}
          <a href="/recruiting/tournaments" className="underline hover:text-white/70">
            Which tournaments 87 NC college commits wrestled
          </a>
        </p>
      </div>
    </main>
  )
}
