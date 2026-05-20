"use client"

import { useCallback, useEffect, useState } from "react"
import { useAuth } from "@/contexts/auth-context"
import { Button } from "@/components/ui/button"
import { Loader2, Lock } from "lucide-react"
import { NhscaHubHero } from "@/components/national-team/nhsca-hub-hero"
import { NhscaHubTabs } from "@/components/national-team/nhsca-hub-tabs"
import type { HubResponse, HubEvent } from "@/app/api/national-team/hub/route"
import { HardLink } from "@/components/hard-link"
import { cn } from "@/lib/utils"
import { getHubGroupForEvent, HUB_EVENT_GROUPS } from "@/lib/national-team-events"
import {
  getDualsHubContactRoster,
  isNationalTeamEventSlug,
  isSelectTeamEventSlug,
} from "@/lib/nhsca-duals-2026-hub-contact-roster"
import { TeamContactRoster } from "@/components/national-team/team-contact-roster"
import { NationalTeamWrestlerCards } from "@/components/national-team/national-team-wrestler-cards"
import { SelectTeamWrestlerCards } from "@/components/national-team/select-team-wrestler-cards"
import {
  hubInfoBannerClass,
  hubMainClass,
  hubPageClass,
  hubPanelClass,
  hubPanelDescClass,
  hubPanelHeaderClass,
  hubPanelTitleClass,
  hubSubteamLabelClass,
} from "@/components/national-team/nhsca-hub-theme"

const REG_PAGE_PATH = "/national-team/register/nhsca-2026"
const HUB_API = "/api/national-team/hub"

export default function NationalTeamHubPage() {
  const { user, session, isLoading: authLoading } = useAuth()
  const [data, setData] = useState<HubResponse | null>(null)
  const [loading, setLoading] = useState(true)

  const hubFetchOptions = useCallback((): RequestInit => {
    const opts: RequestInit = { credentials: "include" }
    if (session?.access_token) {
      (opts as RequestInit & { headers?: Record<string, string> }).headers = {
        Authorization: `Bearer ${session.access_token}`,
      }
    }
    return opts
  }, [session?.access_token])

  const refetchHub = useCallback(() => {
    fetch(HUB_API, hubFetchOptions())
      .then((r) => r.json())
      .then(setData)
      .catch(() => {})
  }, [hubFetchOptions])

  useEffect(() => {
    if (authLoading) return
    let cancelled = false
    setLoading(true)
    fetch(HUB_API, hubFetchOptions())
      .then((r) => r.json())
      .then((json) => {
        if (!cancelled) setData(json as HubResponse)
      })
      .catch(() => {
        if (!cancelled) setData({ allowed: false, reason: "signed_out" })
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [authLoading, hubFetchOptions])

  if (loading) {
    return (
      <div className={cn(hubPageClass, "flex items-center justify-center")}>
        <Loader2 className="h-8 w-8 animate-spin text-[#CBAF5D]" aria-label="Loading" />
      </div>
    )
  }

  if (!data?.allowed) {
    return (
      <div className={hubPageClass}>
        <section className="pt-10 pb-6 px-4 sm:px-6">
          <div className="container mx-auto max-w-md text-center">
            <Lock className="h-10 w-10 mx-auto mb-4 text-[#CBAF5D]" />
            <h1 className="text-xl font-bold">NHSCA Team Hub</h1>
          </div>
        </section>
        <div className="container mx-auto px-4 sm:px-6 pb-12 max-w-md">
          <article className={hubPanelClass}>
            <header className={hubPanelHeaderClass}>
              <h2 className={hubPanelTitleClass}>Sign in required</h2>
              <p className={hubPanelDescClass}>
                {data?.reason === "signed_out"
                  ? "Use your RecruitNC parent account to view schedules, team contacts, and watch links."
                  : "We couldn’t load hub data. Try again after signing in."}
              </p>
            </header>
            <div className="p-5 space-y-3">
              <HardLink
                href="/auth/signin?returnTo=/national-team/hub"
                className="flex w-full min-h-[44px] items-center justify-center rounded-xl bg-[#B31B1B] px-4 py-3 font-semibold text-white hover:bg-[#9a1616]"
              >
                Sign in
              </HardLink>
              <HardLink
                href="/national-team"
                className="flex w-full min-h-[44px] items-center justify-center rounded-xl border border-white/25 px-4 py-3 font-semibold text-white hover:bg-white/10"
              >
                National Team
              </HardLink>
            </div>
          </article>
        </div>
      </div>
    )
  }

  const nhscaInfoOnly = data.nhscaInfoOnly ?? false
  const events = data.events ?? []

  const rosterSections = (() => {
    if (events.length === 0) return null
    type Section =
      | { type: "single"; event: HubEvent }
      | { type: "group"; groupKey: string; groupName: string; eventsWithLabels: { event: HubEvent; label: string }[] }
    const eventBySlug = new Map(events.map((e) => [e.eventSlug, e]))
    const groupKeyToEvents = new Map<string, HubEvent[]>()
    const standalone: HubEvent[] = []
    for (const event of events) {
      const group = getHubGroupForEvent(event.eventSlug)
      if (!group) {
        standalone.push(event)
        continue
      }
      const list = groupKeyToEvents.get(group.groupKey) ?? []
      list.push(event)
      groupKeyToEvents.set(group.groupKey, list)
    }
    const sections: Section[] = []
    for (const [groupKey, groupEvents] of groupKeyToEvents) {
      if (groupEvents.length >= 2) {
        const members = HUB_EVENT_GROUPS[groupKey] ?? []
        const ordered = members
          .map((m) => {
            const ev = eventBySlug.get(m.eventSlug)
            return ev ? { event: ev, label: m.label } as const : null
          })
          .filter((x): x is { event: HubEvent; label: string } => !!x)
        if (ordered.length >= 2) {
          sections.push({
            type: "group",
            groupKey,
            groupName: getHubGroupForEvent(ordered[0].event.eventSlug)!.groupName,
            eventsWithLabels: ordered,
          })
          continue
        }
      }
      for (const e of groupEvents) standalone.push(e)
    }
    for (const event of standalone) sections.push({ type: "single", event })
    return sections
  })()

  return (
    <div className={hubPageClass}>
      <NhscaHubHero />

      <main className={hubMainClass}>
        {nhscaInfoOnly && (
          <div className={hubInfoBannerClass}>
            No roster is linked to this account yet — everything below is still available. After registration and payment, your athlete&apos;s roster row appears automatically for your parent email.
          </div>
        )}

        <NhscaHubTabs
          rosterContent={
            rosterSections && rosterSections.length > 0 ? (
              <div className="space-y-6 md:space-y-8">
                {rosterSections.map((s, i) =>
                  s.type === "single" ? (
                    <EventHubSection
                      key={s.event.eventSlug}
                      event={s.event}
                      onRefetch={refetchHub}
                      sectionId={i === 0 ? "roster" : undefined}
                    />
                  ) : (
                    <GroupedEventHubSection
                      key={s.groupKey}
                      groupName={s.groupName}
                      eventsWithLabels={s.eventsWithLabels}
                      onRefetch={refetchHub}
                      sectionId={i === 0 ? "roster" : undefined}
                    />
                  )
                )}
              </div>
            ) : null
          }
          registrationFallback={
            events.length === 0 && !nhscaInfoOnly ? (
              <>
                <p className="mb-4">Complete invite-only registration to see team rosters and contacts.</p>
                <div className="flex flex-wrap justify-center gap-3">
                  <Button asChild className="bg-[#B31B1B] hover:bg-[#9a1616] min-h-[44px]">
                    <a href={REG_PAGE_PATH}>Registration page</a>
                  </Button>
                  <Button asChild variant="outline" className="border-white/25 text-white hover:bg-white/10 min-h-[44px]">
                    <a href="/national-team">National Team</a>
                  </Button>
                </div>
              </>
            ) : (
              "No roster linked to this account yet."
            )
          }
          adminBlock={
            data.isAdmin && events.length === 0 && !nhscaInfoOnly ? (
              <article className={cn(hubPanelClass, "border-[#CBAF5D]/40")}>
                <header className={hubPanelHeaderClass}>
                  <h3 className={hubPanelTitleClass}>Admin: send to families</h3>
                  <p className={hubPanelDescClass}>Share registration URL and create invite codes.</p>
                </header>
                <div className="p-5 space-y-3">
                  <p className="text-sm font-mono bg-black/20 border border-white/10 rounded-lg px-3 py-2 break-all text-white/90">
                    {REG_PAGE_PATH}
                  </p>
                  <div className="flex flex-wrap gap-2">
                    <Button asChild size="sm" className="bg-[#CBAF5D] text-[#002147] hover:bg-[#D3B574]">
                      <a href={REG_PAGE_PATH}>Open registration</a>
                    </Button>
                    <Button asChild size="sm" variant="outline" className="border-white/25 text-white hover:bg-white/10">
                      <a href="/admin/national-team/invite-codes">Invite codes</a>
                    </Button>
                  </div>
                </div>
              </article>
            ) : undefined
          }
        />

      </main>
    </div>
  )
}


function hubContactRowCount(eventSlug: string): number | null {
  const rows = getDualsHubContactRoster(eventSlug)
  return rows ? rows.length : null
}

function HubRosterTable({ event }: { event: HubEvent }) {
  const contactRows = getDualsHubContactRoster(event.eventSlug)
  const showNationalCards = isNationalTeamEventSlug(event.eventSlug)
  const showSelectCards = isSelectTeamEventSlug(event.eventSlug)
  if (contactRows) {
    return (
      <>
        {showNationalCards && <NationalTeamWrestlerCards />}
        {showSelectCards && <SelectTeamWrestlerCards />}
        <p className="md:hidden text-xs text-white/60 font-medium px-5 py-2 border-b border-white/10" role="status">
          Scroll right → for parent contact column
        </p>
        <TeamContactRoster rows={contactRows} variant="dark" />
      </>
    )
  }

  return (
    <div className="py-10 px-4 text-center text-sm text-white/50">No roster available for this event.</div>
  )
}

function EventHubSection({
  event,
  onRefetch,
  sectionId,
}: {
  event: HubEvent
  onRefetch?: () => void
  sectionId?: string
}) {
  return (
    <article id={sectionId} className={cn(hubPanelClass, sectionId && "scroll-mt-8")}>
      <header className={hubPanelHeaderClass}>
        <h3 className={hubPanelTitleClass}>{event.eventName}</h3>
        <p className={hubPanelDescClass}>
          {hubContactRowCount(event.eventSlug) != null
            ? `${hubContactRowCount(event.eventSlug)} wrestlers`
            : `${event.roster.length} athletes`}
        </p>
      </header>
      <HubRosterTable event={event} />
    </article>
  )
}

function GroupedEventHubSection({
  groupName,
  eventsWithLabels,
  onRefetch,
  sectionId,
}: {
  groupName: string
  eventsWithLabels: { event: HubEvent; label: string }[]
  onRefetch?: () => void
  sectionId?: string
}) {
  return (
    <article id={sectionId} className={cn(hubPanelClass, sectionId && "scroll-mt-8")}>
      <header className={hubPanelHeaderClass}>
        <h3 className={hubPanelTitleClass}>{groupName}</h3>
        <p className={hubPanelDescClass}>National &amp; Select rosters</p>
      </header>
      <div className="divide-y divide-white/10">
        {eventsWithLabels.map(({ event: ev, label }) => (
          <div key={ev.eventSlug}>
            <p className={hubSubteamLabelClass}>{label} team</p>
            <HubRosterTable event={ev} />
          </div>
        ))}
      </div>
    </article>
  )
}
