"use client"

import { useEffect, useState } from "react"
import { CalendarDays } from "lucide-react"

import { AppRow } from "@/components/profile/app-profile-rows"
import { eventDates } from "@/lib/college-programs/outreach-results"

type Event = { id: string; title: string; startDate: string; endDate: string | null; location: string | null }

/**
 * "Competing next" on a wrestler's profile.
 *
 * Asks its own private route, which answers only the family, admins and approved college coaches
 * (app/api/athletes/[id]/upcoming-events). For anyone else, and for a wrestler with nothing coming
 * up, there is no row at all - except the family, who are shown where to add events.
 */
export function CompetingNextBlock({ athleteId, firstName, className }: { athleteId: string; firstName: string; className?: string }) {
  const [state, setState] = useState<{ events: Event[]; family: boolean } | null>(null)

  useEffect(() => {
    let cancelled = false
    setState(null)
    fetch(`/api/athletes/${athleteId}/upcoming-events`, { credentials: "include", cache: "no-store" })
      .then(async (res) => {
        if (!res.ok) return
        const body = (await res.json()) as { visible?: boolean; family?: boolean; events?: Event[] }
        if (!cancelled && body.visible) setState({ events: body.events ?? [], family: body.family === true })
      })
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [athleteId])

  if (!state) return null
  if (state.events.length === 0 && !state.family) return null

  const next = state.events[0]
  return (
    <AppRow
      icon={CalendarDays}
      title="Competing Next"
      subtitle={next ? `${next.title} · ${eventDates(next.startDate, next.endDate)}` : "Nothing added yet"}
      defaultOpen={state.events.length > 0}
      className={className}
    >
      {state.events.length === 0 ? (
        <p className="text-[13px] leading-5 text-[#A8BBD1]">
          Add where {firstName} is wrestling next in the{" "}
          <a href="/my-recruiting#plan" className="font-bold text-[#D3B574] hover:underline">
            Recruiting War Room
          </a>
          . Approved college coaches see it here.
        </p>
      ) : (
        <>
          {state.events.map((e) => (
            <div key={e.id} className="flex justify-between gap-3 border-b border-[#1a3a5f] py-2 last:border-b-0">
              <p className="min-w-0 text-[13px] font-bold text-white">
                {e.title}
                {e.location ? <span className="block text-xs font-normal text-[#A8BBD1]">{e.location}</span> : null}
              </p>
              <p className="shrink-0 text-right text-[13px] text-[#A8BBD1]">{eventDates(e.startDate, e.endDate)}</p>
            </div>
          ))}
          <p className="pt-2 text-[11px] leading-4 text-[#6B829D]">
            Entered by the family. Visible to approved college coaches, not to the public.
          </p>
        </>
      )}
    </AppRow>
  )
}
