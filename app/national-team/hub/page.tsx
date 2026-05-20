"use client"

import { useCallback, useEffect, useState } from "react"
import { useAuth } from "@/contexts/auth-context"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Loader2, Lock, UserPlus, Phone, Calendar, Scale, Clock, History, ExternalLink, UsersRound, AlertCircle, MapPin, LayoutDashboard, Megaphone, ChevronDown, ChevronRight } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { NHSCA2026EventBlock } from "@/components/national-team/nhsca-2026-event-block"
import { NHSCADuals2026TeamHubFaq } from "@/components/national-team/nhsca-duals-2026-team-hub-faq"
import { NHSCADuals2026HowToWatch } from "@/components/national-team/nhsca-duals-2026-how-to-watch"
import type { HubResponse, HubEvent } from "@/app/api/national-team/hub/route"
import { HubPresenceBubbles } from "@/components/hub-presence-bubbles"
import { HardLink } from "@/components/hard-link"
import { cn } from "@/lib/utils"
import Image from "next/image"
import { getHubGroupForEvent, getEventName, HUB_EVENT_GROUPS } from "@/lib/national-team-events"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"

const REG_PAGE_PATH = "/national-team/register/nhsca-2026"

const WEIGH_IN_START = new Date("2026-05-22T14:00:00-04:00").getTime()

const HUB_API = "/api/national-team/hub"
function HubCollapsibleSection({
  id,
  title,
  defaultOpen = false,
  dark = false,
  children,
  className = "",
}: {
  id?: string
  title: string
  defaultOpen?: boolean
  dark?: boolean
  children: React.ReactNode
  className?: string
}) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <section id={id} className={cn("rounded-2xl border-2 overflow-hidden", className)}>
        <CollapsibleTrigger
          className={cn(
            "w-full flex items-center justify-between gap-2 px-5 py-4 text-left font-semibold transition-colors",
            dark ? "text-white hover:bg-white/10" : "text-[#002147] hover:bg-black/[0.02]"
          )}
        >
          {title}
          <span className={cn("shrink-0", dark ? "text-[#D3B574]" : "text-[#003366]")} aria-hidden>
            {open ? <ChevronDown className="h-5 w-5" /> : <ChevronRight className="h-5 w-5" />}
          </span>
        </CollapsibleTrigger>
        <CollapsibleContent className={dark ? "text-white/90" : ""}>{children}</CollapsibleContent>
      </section>
    </Collapsible>
  )
}

export default function NationalTeamHubPage() {
  const { user, session, profile, isLoading: authLoading } = useAuth()
  const [data, setData] = useState<HubResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [countdown, setCountdown] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0, ready: false })

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

  // Same-session auth as elsewhere: Bearer when available + cookies (`auth-from-request` on API).
  // Do not gate on session.access_token only — Safari/cookie quirks used to strand this page.
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

  useEffect(() => {
    const tick = () => {
      const now = Date.now()
      const d = Math.max(0, WEIGH_IN_START - now)
      if (d <= 0) {
        setCountdown({ days: 0, hours: 0, minutes: 0, seconds: 0, ready: true })
        return
      }
      setCountdown({
        days: Math.floor(d / 86400000),
        hours: Math.floor((d % 86400000) / 3600000),
        minutes: Math.floor((d % 3600000) / 60000),
        seconds: Math.floor((d % 60000) / 1000),
        ready: false,
      })
    }
    tick()
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [])

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0B2545] flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-[#D3B574]" />
      </div>
    )
  }

  if (!data?.allowed) {
    return (
      <div className="min-h-screen bg-[#0B2545] py-12 px-4 flex items-center justify-center">
        <Card className="max-w-md w-full border-white/20 bg-white/5 text-white">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-white">
              <Lock className="h-5 w-5 text-[#D3B574]" />
              National Team Hub
            </CardTitle>
            <CardDescription className="text-white/80">
              We couldn’t load NHSCA hub data yet. Reload usually fixes this after login (the rest of RecruitNC already knows you&apos;re signed in).
              {data?.reason === "no_access"
                ? " If this persists, the server returned no_access (e.g. database or env)."
                : null}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button
              type="button"
              className="flex w-full min-h-[44px] items-center justify-center rounded-xl bg-[#D3B574] px-4 py-3 font-semibold text-[#0B2545] hover:bg-[#E5C97A]"
              onClick={() => window.location.reload()}
            >
              Reload hub
            </Button>
            {user?.email ? null : (
              <HardLink
                href="/auth/signin?returnTo=/national-team/hub"
                className="flex w-full min-h-[44px] items-center justify-center rounded-xl border border-white/30 px-4 py-3 font-semibold text-white hover:bg-white/10"
              >
                Sign in
              </HardLink>
            )}
            <Button asChild variant="outline" className="w-full border-white/30 text-white hover:bg-white/10">
              <a href="/national-team">Back to National Team</a>
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  const nhscaInfoOnly = data.nhscaInfoOnly ?? false
  const events = data.events ?? []

  return (
    <div className="min-h-screen bg-[#0B2545]">
      {/* Banner + links + GroupMe — mobile: stack cleanly, extra right padding so floating widget doesn’t cover CTAs */}
      <section className="w-full bg-gradient-to-br from-[#002147] via-[#003366] to-[#002147] text-white">
        <div className="relative w-full aspect-[21/9] min-h-[180px] sm:min-h-[220px] md:min-h-[280px] max-h-[400px]">
          <Image
            src="/images/nhsca-virginia-beach-arena.png"
            alt=""
            fill
            className="object-cover opacity-40"
            sizes="100vw"
            priority
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#002147] via-[#002147]/80 to-transparent" />
          <div className="absolute inset-0 flex flex-col items-center justify-center px-4 py-4 text-center">
            <Image
              src="/images/nhsca-national-duals-logo.png"
              alt="NHSCA National Duals"
              width={180}
              height={72}
              className="mb-3 h-12 sm:h-14 md:h-16 w-auto object-contain drop-shadow-lg"
              priority
            />
            <Badge className="mb-2 sm:mb-3 bg-[#D3B574] text-[#003366] hover:bg-[#D3B574] border-0 font-semibold text-xs sm:text-sm">
              NHSCA Duals 2026 · National Team info hub
            </Badge>
            <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold mb-1 drop-shadow leading-tight">27th Annual National Duals</h1>
            <p className="text-blue-100 text-sm sm:text-lg md:text-xl font-medium">
              Fri May 22 – Mon May 25 · travel & weigh-ins Fri · wrestling Sat–Sun · Mon bracket (advancers)
            </p>
            <p className="text-[#D3B574] mt-1 sm:mt-2 text-sm sm:text-base md:text-lg font-medium">Virginia Beach Sports Center</p>
            <p className="text-white/85 text-xs sm:text-sm mt-3 max-w-lg mx-auto">
              One page for logistics, FAQs, roster &amp; gear, and where to watch (Flo + NHSCA).
            </p>
          </div>
        </div>
        <div className="w-full bg-[#002147] px-4 py-3 flex flex-wrap items-center justify-center gap-2 sm:gap-4">
          <a href="/national-team" className="inline-flex min-h-[36px] items-center justify-center rounded-lg border border-white/40 px-3 py-2 text-sm font-medium text-white/90 hover:bg-white/10 hover:text-white transition-colors shrink-0">
            ← Back
          </a>
          <a href="https://nhsca-events.com/national-duals/" target="_blank" rel="noopener noreferrer" className="inline-flex min-h-[36px] items-center justify-center rounded-lg border border-[#D3B574]/60 px-3 py-2 text-sm font-medium text-[#D3B574] hover:bg-[#D3B574]/20 transition-colors shrink-0">
            NHSCA Official <ExternalLink className="ml-1 h-3.5 w-3.5" />
          </a>
          <a href="https://groupme.com/join_group/113432813/Vdugtepr" target="_blank" rel="noopener noreferrer" className="inline-flex min-h-[36px] items-center justify-center rounded-lg bg-[#D3B574] px-3 py-2 text-sm font-semibold text-[#0B2545] hover:bg-[#E5C97A] transition-colors shrink-0">
            Join GroupMe <ExternalLink className="ml-1 h-3.5 w-3.5" />
          </a>
        </div>
        <div className="w-full bg-[#002147]/95 px-4 py-2.5 flex flex-wrap items-center justify-center gap-2 border-t border-white/10">
          <a href="#nhsca-event-info" className="rounded-md bg-white/10 px-3 py-1.5 text-xs font-semibold text-white hover:bg-[#D3B574] hover:text-[#0B2545] transition-colors">
            Event info
          </a>
          <a href="#roster" className="rounded-md bg-white/10 px-3 py-1.5 text-xs font-semibold text-white hover:bg-[#D3B574] hover:text-[#0B2545] transition-colors">
            Rosters &amp; gear
          </a>
          <a href="#how-to-watch" className="rounded-md bg-white/10 px-3 py-1.5 text-xs font-semibold text-white hover:bg-[#D3B574] hover:text-[#0B2545] transition-colors">
            How to watch
          </a>
          <a href="/national-team#archives" className="rounded-md bg-white/5 px-3 py-1.5 text-xs font-medium text-white/80 hover:bg-white/10">Past teams</a>
        </div>
      </section>

      <div className="max-w-3xl mx-auto px-4 py-6 sm:py-8 space-y-10 sm:space-y-8">
        {nhscaInfoOnly && (
          <p className="text-center text-sm text-amber-100/95 bg-[#78350f]/40 border border-amber-500/35 rounded-xl px-4 py-2">
            No NHSCA roster is linked to this account yet — you still have schedules, FAQs, and watch links on this page. After you&apos;re officially on the team and payment clears, the roster blocks below will populate automatically for the matching parent email.
          </p>
        )}

        <div id="nhsca-event-info" className="scroll-mt-28 space-y-10 sm:space-y-8">
        {/* Countdown to weigh-ins — big and bold */}
        <section className="rounded-2xl border-2 border-[#B31B1B]/40 bg-gradient-to-br from-[#002147] to-[#003366] px-6 py-8 text-white shadow-lg">
          <p className="text-center text-[#D3B574] font-bold uppercase tracking-wider text-sm mb-2">Weigh-ins open</p>
          <p className="text-center text-white/90 text-lg font-medium mb-6">Friday, May 22, 2026 · 2:00 PM · Virginia Beach Sports Center</p>
          {countdown.ready ? (
            <p className="text-center text-2xl md:text-3xl font-black text-[#D3B574]">We&apos;re here!</p>
          ) : (
            <div className="flex flex-wrap justify-center gap-4 md:gap-8">
              <div className="text-center">
                <div className="text-3xl md:text-5xl font-black tabular-nums text-[#D3B574]">{countdown.days}</div>
                <div className="text-xs md:text-sm font-semibold uppercase tracking-wider text-white/80">Days</div>
              </div>
              <div className="text-center">
                <div className="text-3xl md:text-5xl font-black tabular-nums text-[#D3B574]">{countdown.hours}</div>
                <div className="text-xs md:text-sm font-semibold uppercase tracking-wider text-white/80">Hours</div>
              </div>
              <div className="text-center">
                <div className="text-3xl md:text-5xl font-black tabular-nums text-[#D3B574]">{countdown.minutes}</div>
                <div className="text-xs md:text-sm font-semibold uppercase tracking-wider text-white/80">Min</div>
              </div>
              <div className="text-center">
                <div className="text-3xl md:text-5xl font-black tabular-nums text-[#D3B574]">{countdown.seconds}</div>
                <div className="text-xs md:text-sm font-semibold uppercase tracking-wider text-white/80">Sec</div>
              </div>
            </div>
          )}
        </section>

        {/* Hotel */}
        {data?.allowed && (
          <HubCollapsibleSection dark title="Hotel" className="border-white/20 bg-white/5">
            <div className="px-5 pb-5 pt-0 space-y-2 text-sm text-white/90">
              <p>
                <strong>Official NC United hotel:</strong>{" "}
                <a
                  href="https://www.google.com/maps/search/?api=1&query=SpringHill+Suites+Norfolk+Virginia+Beach"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[#D3B574] font-medium underline hover:text-[#E5C97A]"
                >
                  SpringHill Suites Norfolk Virginia Beach
                </a>{" "}
                (~20 minutes from VBSC).
              </p>
              <p>Athletes may stay with the team — coordinate with staff. Parents staying separately are fine.</p>
            </div>
          </HubCollapsibleSection>
        )}

        {/* Event details */}
        <HubCollapsibleSection dark id="event-details" title="Event details (coaches, schedule, venue)" className="border-white/20 bg-white/5">
          <div className="p-4 pt-0">
            <NHSCA2026EventBlock />
          </div>
        </HubCollapsibleSection>

        {events.length === 0 && !nhscaInfoOnly && (
          <>
            <Card className="rounded-2xl border-white/20 bg-white/5 overflow-hidden text-white">
              <CardHeader className="pb-6">
                <CardTitle className="text-xl text-white">Get on the hub</CardTitle>
                <CardDescription className="text-white/80 max-w-xl">
                  This NHSCA Duals 2026 page is our National Team info hub — schedule, FAQs, streams, plus roster &amp; gear farther down once you&apos;re registered. Register to unlock the roster blocks after payment clears.
                </CardDescription>

              </CardHeader>
              <CardContent className="space-y-5">
                <p className="text-sm text-white/90">
                  Have an invite to <strong>NHSCA Duals 2026</strong>? Use your registration link to sign up. After payment, return here to see the roster and join GroupMe.
                </p>
                <div className="flex flex-wrap gap-3">
                  <Button asChild className="rounded-xl bg-[#D3B574] hover:bg-[#E5C97A] text-[#0B2545] font-semibold">
                    <a href="/national-team/hub">Team Hub</a>
                  </Button>
                  <Button asChild variant="outline" className="rounded-xl border-2 border-[#D3B574] text-[#D3B574] hover:bg-[#D3B574]/20 font-medium">
                    <a href={REG_PAGE_PATH}>Registration page</a>
                  </Button>
                  <Button asChild variant="outline" className="rounded-xl border-2 border-white/40 text-white hover:bg-white/10 font-medium">
                    <a href="/national-team">National Team overview</a>
                  </Button>
                </div>
                <p className="text-xs text-white/60">
                  Use the same email you&apos;ll register with for NHSCA (parent/guardian) so roster tools match your account automatically.
                </p>
              </CardContent>
            </Card>

            {data.isAdmin && (
              <Card className="rounded-2xl border-[#D3B574]/40 bg-[#D3B574]/10 text-white">
                <CardHeader>
                  <CardTitle className="text-base text-white">Send to families</CardTitle>
                  <CardDescription className="text-white/80">
                    Share the registration page and create invite codes. Recipients need an invite code to register.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div>
                    <p className="text-sm font-medium text-white/80 mb-1">Registration URL</p>
                    <p className="text-sm text-white/70 font-mono bg-white/10 border border-white/20 rounded-lg px-3 py-2 break-all">
                      {REG_PAGE_PATH}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button asChild size="sm" className="bg-[#D3B574] hover:bg-[#E5C97A] text-[#0B2545] rounded-lg font-medium">
                      <a href={REG_PAGE_PATH}>Open registration page</a>
                    </Button>
                    <Button asChild size="sm" variant="outline" className="rounded-lg border-[#D3B574] text-[#D3B574] hover:bg-[#D3B574]/20">
                      <a href="/admin/national-team/invite-codes">Create invite codes</a>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}
          </>
        )}

        {events.length > 0 && (
          <HubCollapsibleSection dark id="announcements" title="Announcements by weight" className="border-white/20 bg-white/5">
            <div className="px-5 pb-5 pt-0">
              <p className="text-sm text-white/90">
                Posts and updates for each weight class will be added here. Check back before the event.
              </p>
            </div>
          </HubCollapsibleSection>
        )}

        <HubCollapsibleSection dark id="qa" title="Team hub FAQ" defaultOpen={false} className="border-white/20 bg-white/5 scroll-mt-24">
          <div className="px-5 pb-6 pt-0 max-h-[min(70vh,600px)] overflow-y-auto border-t border-white/10">
            <NHSCADuals2026TeamHubFaq />
          </div>
        </HubCollapsibleSection>

        {events.length > 0 && (
          <HubCollapsibleSection dark title="Apparel, schedule & coaches" className="border-white/20 bg-white/5">
            <div className="px-5 pb-5 pt-0">
              <p className="text-sm text-white/90">
                Photos, sizing, daily agenda, and coach bios will be added here before the event.
              </p>
            </div>
          </HubCollapsibleSection>
        )}
        </div>

        {/* Rosters — gear & dashboards when your account has NHSCA event access. */}
        {events.length > 0 &&
          (() => {
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
            for (const event of standalone) {
              sections.push({ type: "single", event })
            }
            return (
              <div className="space-y-10 sm:space-y-8">
                {sections.map((s, i) =>
                  s.type === "single" ? (
                    <EventHubSection
                      key={s.event.eventSlug}
                      event={s.event}
                      currentUserId={user?.id ?? ""}
                      onRefetch={refetchHub}
                      hideEventInfo
                      sectionId={i === 0 ? "roster" : undefined}
                    />
                  ) : (
                    <GroupedEventHubSection
                      key={s.groupKey}
                      groupName={s.groupName}
                      eventsWithLabels={s.eventsWithLabels}
                      currentUserId={user?.id ?? ""}
                      onRefetch={refetchHub}
                      hideEventInfo
                      sectionId={i === 0 ? "roster" : undefined}
                    />
                  )
                )}
              </div>
            )
          })()}

        <div className="mt-10 sm:mt-12 scroll-mt-28">
          <NHSCADuals2026HowToWatch />
        </div>

      </div>
    </div>
  )
}

/** Full NHSCA Duals 2026 event info for the hub: logo, event pic, contacts, coaches, schedule, format, rules. */
function NHSCA2026HubInfo() {
  return (
    <div className="overflow-hidden rounded-2xl border border-[#003366]/15 bg-white shadow-md">
      {/* Hero: logo on solid dark so it always reads well (asset is for dark bg); then event image */}
      <div className="relative bg-[#0B2545]">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 px-4 py-5 sm:px-6 sm:py-6">
          <div className="flex items-center justify-center sm:justify-start min-h-[52px]">
            <Image
              src="/images/nhsca-national-duals-logo.png"
              alt="NHSCA National Duals"
              width={140}
              height={56}
              className="h-12 w-auto sm:h-14 object-contain"
            />
          </div>
          <p className="text-center sm:text-right text-white/90 text-sm font-medium">27th Annual · Fri May 22 – Mon May 25</p>
        </div>
      </div>
      <div className="relative bg-gradient-to-br from-[#002147] to-[#003366]">
        <div className="aspect-video w-full max-h-[200px] sm:max-h-[240px] relative bg-[#002147]">
          <Image
            src="/images/nhsca-virginia-beach-arena.png"
            alt="Virginia Beach Sports Center — NHSCA National Duals venue"
            fill
            className="object-cover opacity-90"
            sizes="(max-width: 640px) 100vw, 672px"
            priority
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#002147]/80 via-transparent to-transparent" />
          <div className="absolute bottom-3 left-4 right-4">
            <p className="text-white text-sm font-semibold drop-shadow">Virginia Beach Sports Center</p>
            <p className="text-white/90 text-xs">The largest and most competitive duals event in the country</p>
          </div>
        </div>
      </div>

      <div className="p-4 sm:p-6 space-y-6">
        {/* Main contact — prominent, gold */}
        <div className="text-center px-4">
          <a
            href="tel:+16316625409"
            className="flex min-h-[52px] flex-wrap items-center justify-center gap-2 rounded-xl bg-[#D3B574]/20 px-4 py-3 text-[#002147] transition-colors hover:bg-[#D3B574]/30 active:bg-[#D3B574]/40 border-2 border-[#D3B574]/40"
          >
            <Phone className="h-5 w-5 shrink-0 text-[#003366]" />
            <span className="font-semibold text-sm sm:text-base">Main contact:</span>
            <span className="font-medium text-sm sm:text-base">Matt Hickey (631) 662-5409</span>
          </a>
          <p className="text-xs text-gray-600 mt-2">Operations · Lisa Hickey (see GroupMe for staff lines)</p>
        </div>

        {/* Two-column layout on desktop: left = when/where + schedule, right = coaches */}
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          <div className="lg:col-span-2 space-y-4">
            <div className="rounded-xl border border-[#003366]/10 bg-[#003366]/[0.03] p-4">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-[#003366] mb-2 flex items-center gap-2">
                <Calendar className="h-4 w-4" /> When & where
              </h4>
              <p className="text-sm text-gray-700 leading-relaxed">
                Fri May 22 – Mon May 25, 2026 · VBSC · 208-team field ·                 Minimum <strong>six duals</strong> guaranteed (three on Day 1, at least three on Day 2; Monday for advancing teams).
              </p>
            </div>
            <div className="rounded-xl border border-gray-100 bg-gray-50/50 p-4">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-[#003366] mb-1.5 flex items-center gap-2">
                <Clock className="h-4 w-4" /> Schedule
              </h4>
              <p className="text-xs text-amber-700/90 mb-2 flex items-center gap-1.5">
                <AlertCircle className="h-3.5 w-3.5 shrink-0" /> Tentative; subject to change.
              </p>
              <ul className="space-y-1.5 text-sm text-gray-700">
                <li><strong className="text-[#002147]">Fri May 22:</strong> Travel + weigh-ins · early NC United pre-paid 2–4 PM · regular 6–7:30 PM</li>
                <li><strong className="text-[#002147]">Sat May 23:</strong> Day 1 (3 duals) · late weigh-in only (assigned): Holt Quincy, Tillman Caskey — 7 AM</li>
                <li><strong className="text-[#002147]">Sun May 24:</strong> Day 2 (minimum 3 duals)</li>
                <li><strong className="text-[#002147]">Mon May 25:</strong> Championship bracket — advancing teams only</li>
              </ul>
            </div>
            <div className="rounded-xl border border-[#003366]/15 bg-[#003366]/5 p-4">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-[#003366] flex items-center gap-2">
                <Scale className="h-4 w-4" /> Early weigh-ins
              </h4>
              <p className="text-sm text-gray-700 mt-1">
                NC United <strong>prepaid early weigh-ins for both teams</strong>. Athletes may weigh individually Fri 2–4 PM at VBSC. Regular Fri 6–7:30 PM. Late assignments Sat 7 AM (see FAQ / schedule).
              </p>
              <a href="https://nhsca-events.com/national-duals/" target="_blank" rel="noopener noreferrer" className="mt-2 inline-flex items-center gap-1 text-sm font-medium text-[#003366] hover:underline">
                Directions (official site) <ExternalLink className="h-3.5 w-3.5" />
              </a>
            </div>
          </div>

          {/* Coaches — visual cards */}
          <div className="lg:col-span-3">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-[#003366] mb-3 flex items-center gap-2">
              <UsersRound className="h-4 w-4" /> Coaches
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {[
                { name: "Colton Palmer", tel: "+19194519864", display: "(919) 451-9864", bio: "NC State · 2x state champ · NC all-time wins", img: "/images/coach-palmer.png", alt: "Colton Palmer" },
                { name: "Michael Macchiavello", tel: "+17048917436", display: "(704) 891-7436", bio: "2018 NCAA Champion · Team USA · NC United founder", img: "/images/coach-macchiavello.png", alt: "Michael Macchiavello" },
                { name: "Araad Fischer", tel: "+19194508266", display: "(919) 450-8266", bio: "Duke · 4-year starter · State finalist", img: "/images/coach-araad-fischer.png", alt: "Araad Fischer" },
              ].map((c) => (
                <div key={c.name} className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm hover:shadow transition-shadow">
                  <div className="relative mx-auto h-20 w-20 overflow-hidden rounded-full bg-gray-100 ring-2 ring-[#003366]/10">
                    <Image src={c.img} alt={c.alt} fill className="object-cover" sizes="80px" />
                  </div>
                  <p className="mt-3 text-center font-semibold text-[#002147] text-sm">{c.name}</p>
                  <a href={`tel:${c.tel}`} className="mt-1 flex justify-center min-h-[44px] items-center py-1.5 text-sm font-medium text-[#003366] hover:underline">
                    {c.display}
                  </a>
                  <p className="text-center text-xs text-gray-600 mt-1 leading-snug">{c.bio}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Quick ref: format, weights, match times, awards, rules — compact row */}
        <div className="rounded-xl border border-gray-100 bg-gray-50/50 p-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
            <div>
              <p className="font-semibold text-[#002147] text-xs uppercase tracking-wider">Format</p>
              <p className="text-gray-700 mt-0.5 text-xs">Day 1: 4-team pools, 3 duals. Day 2: Champ vs Consi from Day 1; Consi exits. Mon: championship bracket, reseeded.</p>
            </div>
            <div>
              <p className="font-semibold text-[#002147] text-xs uppercase tracking-wider">Weights</p>
              <p className="text-gray-700 mt-0.5 text-xs">106–285 (+3 lb). Singlet weigh-in.</p>
            </div>
            <div>
              <p className="font-semibold text-[#002147] text-xs uppercase tracking-wider">Match times</p>
              <p className="text-gray-700 mt-0.5 text-xs">HS: 1:30–1:30–1:30</p>
            </div>
            <div>
              <p className="font-semibold text-[#002147] text-xs uppercase tracking-wider">Awards & rules</p>
              <p className="text-gray-700 mt-0.5 text-xs">Top 5: medals. Headgear optional · college OB · OT :60/:30/:30.</p>
            </div>
          </div>
        </div>

        {/* Links: one compact row */}
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm border-t border-gray-100 pt-4">
          <a href="https://calendar.google.com/calendar/render?action=TEMPLATE&text=NHSCA+National+Duals+2026&dates=20260522/20260526&details=Virginia+Beach+Sports+Center&location=Virginia+Beach+Sports+Center,+VA" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 font-medium text-[#003366] hover:underline">
            <Calendar className="h-3.5 w-3.5" /> Add to Calendar
          </a>
          <a href="https://www.google.com/maps/search/?api=1&query=Virginia+Beach+Sports+Center" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 font-medium text-[#003366] hover:underline">
            <MapPin className="h-3.5 w-3.5" /> Maps
          </a>
          <a href="https://nhsca-events.com/national-duals/" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 font-medium text-[#003366] hover:underline">
            Official site <ExternalLink className="h-3 w-3" />
          </a>
          <a href="/national-team/nhsca-2025-results" className="inline-flex items-center gap-1.5 font-medium text-[#003366] hover:underline">
            <History className="h-3.5 w-3.5" /> 2025 results
          </a>
        </div>
      </div>
    </div>
  )
}

type HubTab = "dashboard" | "updates" | "chat"

type GearField = "singlet_size" | "shorts_size" | "shirt_size"

/** Inline table cell: dropdown for gear size with live PATCH. Works for both paid registrations and lineup-only (interest-form) rows. */
function RosterSizeCell({
  registrationId,
  field,
  value,
  sizes,
  onSave,
}: {
  registrationId: string | null
  field: GearField
  value: string
  sizes: string[]
  onSave?: () => void
}) {
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState(false)
  const { session } = useAuth()
  const isInterestRow = !!registrationId && String(registrationId).startsWith("interest-")
  const editable = !!registrationId

  const handleChange = (newVal: string) => {
    if (!registrationId || !editable) return
    setSaving(true)
    setSaveError(false)
    const url = isInterestRow
      ? `/api/national-team/interest-forms/${registrationId.replace(/^interest-/, "")}/size`
      : `/api/national-team/registrations/${registrationId}/size`
    const headers: Record<string, string> = { "Content-Type": "application/json" }
    if (session?.access_token) headers.Authorization = `Bearer ${session.access_token}`
    const opts: RequestInit = {
      method: "PATCH",
      headers,
      credentials: "include",
      body: JSON.stringify({ [field]: newVal || null }),
    }
    fetch(url, opts)
      .then((r) => {
        if (!r.ok) {
          const msg = `PATCH ${url} ${r.status}`
          if (typeof console !== "undefined" && console.error) console.error("[RecruitNC]", msg)
          return Promise.reject(new Error(msg))
        }
        return Promise.resolve()
      })
      .then(() => onSave?.())
      .catch((err) => {
        setSaveError(true)
        if (typeof console !== "undefined" && console.error) console.error("[RecruitNC] Gear size save failed", err)
      })
      .finally(() => setSaving(false))
  }

  if (!editable) {
    return (
      <td className="py-2 px-2 text-center text-gray-700">
        {value || "—"}
      </td>
    )
  }
  return (
    <td className="py-2 px-2 text-center align-middle">
      <div className="flex flex-col items-center gap-0.5">
        <div className="flex items-center justify-center gap-0.5">
          <select
            value={value}
            onChange={(e) => handleChange(e.target.value)}
            onBlur={() => setSaveError(false)}
            disabled={saving}
            className="rounded border border-gray-300 bg-white px-1.5 py-1.5 text-base text-gray-800 focus:border-[#003366] focus:outline-none focus:ring-1 focus:ring-[#003366] min-w-[52px] w-full max-w-[80px] touch-manipulation"
            aria-label={field.replace("_", " ")}
            aria-invalid={saveError}
          >
            <option value="">—</option>
            {sizes.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
          {saving && <Loader2 className="h-3 w-3 animate-spin shrink-0 text-[#003366]" aria-hidden />}
        </div>
        {saveError && (
          <span className="text-[10px] text-red-600 font-medium" role="alert">Save failed. Try again.</span>
        )}
      </div>
    </td>
  )
}

function HubGearSizeRow({
  registrationId,
  athleteName,
  singletSize,
  shortsSize,
  shirtSize,
  sizes,
  onUpdate,
}: {
  registrationId: string
  athleteName: string
  singletSize: string
  shortsSize: string
  shirtSize: string
  sizes: string[]
  onUpdate: (field: GearField, value: string) => Promise<void>
}) {
  const [savingField, setSavingField] = useState<GearField | null>(null)
  const [savedField, setSavedField] = useState<GearField | null>(null)

  const handleChange = (field: GearField, value: string) => {
    setSavingField(field)
    setSavedField(null)
    onUpdate(field, value)
      .then(() => {
        setSavingField(null)
        setSavedField(field)
        setTimeout(() => setSavedField(null), 2000)
      })
      .catch(() => setSavingField(null))
  }

  const selectClass = "rounded-md border border-gray-300 bg-white px-2 py-1.5 text-sm text-gray-800 focus:border-[#003366] focus:outline-none focus:ring-1 focus:ring-[#003366] min-w-[72px]"
  return (
    <div className="flex flex-wrap items-center gap-3 py-2 border-b border-gray-100 last:border-0">
      <span className="font-medium text-[#002147] min-w-[120px]">{athleteName}</span>
      <div className="flex items-center gap-2">
        <label className="text-xs text-gray-500 whitespace-nowrap">Singlet</label>
        <select
          value={singletSize}
          onChange={(e) => handleChange("singlet_size", e.target.value)}
          disabled={savingField === "singlet_size"}
          className={selectClass}
        >
          <option value="">—</option>
          {sizes.map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
        {savingField === "singlet_size" && <Loader2 className="h-3.5 w-3.5 animate-spin text-[#003366]" />}
        {savedField === "singlet_size" && <span className="text-xs text-green-600">Saved</span>}
      </div>
      <div className="flex items-center gap-2">
        <label className="text-xs text-gray-500 whitespace-nowrap">Shorts</label>
        <select
          value={shortsSize}
          onChange={(e) => handleChange("shorts_size", e.target.value)}
          disabled={savingField === "shorts_size"}
          className={selectClass}
        >
          <option value="">—</option>
          {sizes.map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
        {savingField === "shorts_size" && <Loader2 className="h-3.5 w-3.5 animate-spin text-[#003366]" />}
        {savedField === "shorts_size" && <span className="text-xs text-green-600">Saved</span>}
      </div>
      <div className="flex items-center gap-2">
        <label className="text-xs text-gray-500 whitespace-nowrap">Shirt</label>
        <select
          value={shirtSize}
          onChange={(e) => handleChange("shirt_size", e.target.value)}
          disabled={savingField === "shirt_size"}
          className={selectClass}
        >
          <option value="">—</option>
          {sizes.map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
        {savingField === "shirt_size" && <Loader2 className="h-3.5 w-3.5 animate-spin text-[#003366]" />}
        {savedField === "shirt_size" && <span className="text-xs text-green-600">Saved</span>}
      </div>
    </div>
  )
}

function HubUpdatesList({ threadId }: { threadId: string }) {
  const [messages, setMessages] = useState<Array<{ id: string; body: string; created_at: string; sender_id: string }>>([])
  const [loading, setLoading] = useState(true)
  useEffect(() => {
    fetch(`/api/messaging/threads/${threadId}/messages?type=announcement&limit=50`, { credentials: "include" })
      .then((r) => r.json())
      .then((data) => setMessages(data.messages ?? []))
      .catch(() => setMessages([]))
      .finally(() => setLoading(false))
  }, [threadId])
  if (loading) return <p className="text-sm text-gray-500 py-4 text-center">Loading updates…</p>
  if (messages.length === 0) return <p className="text-sm text-gray-500 py-4 text-center">No announcements yet. Coaches and admins can post updates here.</p>
  return (
    <ul className="space-y-4">
      {messages.map((m) => (
        <li key={m.id} className="rounded-lg border border-[#003366]/10 bg-amber-50/50 p-4">
          <p className="text-sm text-gray-700 whitespace-pre-wrap">{m.body}</p>
          <p className="text-xs text-gray-500 mt-2">{new Date(m.created_at).toLocaleString()}</p>
        </li>
      ))}
    </ul>
  )
}

function HubDocumentsList({ contextType, contextId }: { contextType: string; contextId: string }) {
  const [documents, setDocuments] = useState<Array<{ id: string; file_url: string; name: string; content_type?: string | null; uploaded_at: string }>>([])
  const [loading, setLoading] = useState(true)
  useEffect(() => {
    fetch(
      `/api/communities/hub/documents?context_type=${encodeURIComponent(contextType)}&context_id=${encodeURIComponent(contextId)}`,
      { credentials: "include" }
    )
      .then((r) => r.json())
      .then((data) => setDocuments(data.documents ?? []))
      .catch(() => setDocuments([]))
      .finally(() => setLoading(false))
  }, [contextType, contextId])
  return (
    <div>
      <h3 className="text-sm font-medium text-gray-700 mb-2">Documents</h3>
      {loading && <p className="text-sm text-gray-500 py-2">Loading…</p>}
      {!loading && documents.length === 0 && <p className="text-sm text-gray-500 py-2">No documents yet.</p>}
      {!loading && documents.length > 0 && (
        <ul className="space-y-2">
          {documents.map((d) => (
            <li key={d.id}>
              <a
                href={d.file_url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm font-medium text-[#003366] hover:underline inline-flex items-center gap-1.5"
              >
                <ExternalLink className="w-4 h-4" />
                {d.name}
              </a>
              <span className="text-xs text-gray-500 ml-2">{new Date(d.uploaded_at).toLocaleDateString()}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

const TSHIRT_SIZES = ["YS", "YM", "YL", "S", "M", "L", "XL", "2XL", "3XL"]

function EventHubSection({
  event,
  currentUserId,
  onRefetch,
  hideEventInfo,
  sectionId,
}: {
  event: HubEvent
  currentUserId: string
  onRefetch?: () => void
  hideEventInfo?: boolean
  sectionId?: string
}) {
  const myRegs = event.myRegistrations ?? []
  const hasThread = !!event.threadId && !!currentUserId
  const [activeTab, setActiveTab] = useState<HubTab>("dashboard")
  const [sizeMessage, setSizeMessage] = useState<{ type: "success" | "error"; text: string } | null>(null)

  return (
    <Card id={sectionId} className={cn(sectionId && "scroll-mt-24", "overflow-hidden rounded-2xl border-2 border-[#003366]/30 bg-white shadow-lg")}>
      <CardHeader className="bg-gradient-to-b from-[#003366]/15 to-[#003366]/5 border-b-2 border-[#003366]/20 pb-4">
        <CardTitle className="text-[#002147] text-lg sm:text-xl tracking-tight">{event.eventName}</CardTitle>
        <CardDescription className="text-gray-600">Dashboard, roster with gear sizes, and updates</CardDescription>
        <div className="flex gap-1 mt-3 border-b border-gray-200 -mb-1">
          <button
            type="button"
            onClick={() => setActiveTab("dashboard")}
            className={cn(
              "min-h-[44px] px-4 py-2 text-sm font-medium rounded-t-lg border-b-2 -mb-px transition-colors",
              activeTab === "dashboard"
                ? "border-[#003366] text-[#003366] bg-white"
                : "border-transparent text-gray-600 hover:text-[#003366] hover:bg-white/50"
            )}
          >
            <LayoutDashboard className="inline-block w-4 h-4 mr-1.5 align-middle" />
            Dashboard
          </button>
          {hasThread && (
            <button
              type="button"
              onClick={() => setActiveTab("updates")}
              className={cn(
                "min-h-[44px] px-4 py-2 text-sm font-medium rounded-t-lg border-b-2 -mb-px transition-colors",
                activeTab === "updates"
                  ? "border-[#003366] text-[#003366] bg-white"
                  : "border-transparent text-gray-600 hover:text-[#003366] hover:bg-white/50"
              )}
            >
              <Megaphone className="inline-block w-4 h-4 mr-1.5 align-middle" />
              Updates
            </button>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {activeTab === "updates" && hasThread && (
          <div>
            <h3 className="text-sm font-medium text-gray-700 mb-3">Announcements</h3>
            <HubUpdatesList threadId={event.threadId!} />
          </div>
        )}
        {activeTab === "dashboard" && (
          <>
        {!hideEventInfo && (event.eventSlug === "nhsca-duals-2026" || event.eventName.toLowerCase().includes("nhsca")) && <NHSCA2026HubInfo />}
        <div className="rounded-xl border-2 border-[#003366]/25 overflow-hidden bg-[#003366]/5">
          <h3 className="text-sm font-semibold text-[#002147] mb-1 px-4 pt-4">Roster &amp; gear ({event.roster.length})</h3>
          <p className="text-xs text-gray-600 px-4 pb-1">Enter gear sizes in the table below. Changes save automatically.</p>
          <p className="md:hidden text-xs text-[#003366] font-medium px-4 pb-2 flex items-center gap-1" role="status">
            <span>Scroll right →</span>
            <span className="text-gray-600 font-normal">to see Singlet, Shorts, Shirt sizes.</span>
          </p>
          <div
            className="rounded-b-xl overflow-x-auto bg-white border-t border-[#003366]/10 touch-pan-x"
            style={{ WebkitOverflowScrolling: "touch" }}
          >
            {event.roster.length === 0 ? (
              <div className="py-10 px-4 text-center">
                <p className="text-sm text-gray-500">No athletes on the roster yet.</p>
                <p className="text-xs text-gray-400 mt-1">Assign athletes in Admin → National team submissions (Team 1 / Team 2), or paid registrations will appear here.</p>
              </div>
            ) : (
              <table className="w-full text-sm min-w-[560px] border-collapse">
                <thead>
                  <tr className="bg-[#003366] text-white">
                    <th className="text-left py-3 pl-3 pr-2 font-semibold w-[52px]">Photo</th>
                    <th className="text-left py-3 px-2 font-semibold">Name</th>
                    <th className="text-center py-3 px-2 font-semibold w-14">Class</th>
                    <th className="text-center py-3 px-2 font-semibold w-14">Weight</th>
                    <th className="text-left py-3 px-2 font-semibold">School</th>
                    <th className="text-center py-3 px-2 font-semibold w-16">Singlet</th>
                    <th className="text-center py-3 px-2 font-semibold w-16">Shorts</th>
                    <th className="text-center py-3 px-2 font-semibold w-16">Shirt</th>
                  </tr>
                </thead>
                <tbody>
                  {event.roster.map((r, i) => (
                    <tr key={r.id} className={cn("border-t border-gray-100", i % 2 === 1 && "bg-[#003366]/[0.03]")}>
                      <td className="py-2 pl-3 pr-2 align-middle">
                        {r.photo_url ? (
                          <div className="relative h-10 w-10 rounded-full overflow-hidden bg-gray-200 shrink-0">
                            <Image src={r.photo_url} alt="" fill className="object-cover" sizes="40px" />
                          </div>
                        ) : (
                          <div className="h-10 w-10 rounded-full bg-[#003366]/20 flex items-center justify-center shrink-0 text-[#002147] font-semibold text-sm">
                            {(r.athlete_first_name?.[0] ?? "").toUpperCase()}{(r.athlete_last_name?.[0] ?? "").toUpperCase()}
                          </div>
                        )}
                      </td>
                      <td className="py-2 px-2 text-gray-900">
                        <span className="font-medium">{r.athlete_first_name} {r.athlete_last_name}</span>
                        {r.updated_at && (
                          <p className="text-xs font-normal text-gray-500 mt-0.5">
                            Last edited {new Date(r.updated_at).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}
                            {r.updated_by_display_name ? ` by ${r.updated_by_display_name}` : ""}
                          </p>
                        )}
                      </td>
                      <td className="py-2 px-2 text-center text-gray-700 tabular-nums">{r.graduation_year || "—"}</td>
                      <td className="py-2 px-2 text-center text-gray-700 tabular-nums">{r.primary_weight}</td>
                      <td className="py-2 px-2 text-gray-700">{r.high_school || "—"}</td>
                      <RosterSizeCell registrationId={r.id} field="singlet_size" value={r.singlet_size ?? ""} sizes={TSHIRT_SIZES} onSave={onRefetch} />
                      <RosterSizeCell registrationId={r.id} field="shorts_size" value={r.shorts_size ?? ""} sizes={TSHIRT_SIZES} onSave={onRefetch} />
                      <RosterSizeCell registrationId={r.id} field="shirt_size" value={r.shirt_size ?? ""} sizes={TSHIRT_SIZES} onSave={onRefetch} />
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
        <HubDocumentsList contextType="event" contextId={event.eventSlug} />
        <div>
          <h3 className="text-sm font-medium text-gray-700 mb-2">Athlete cards (IG)</h3>
          <p className="text-sm text-gray-500">Individual cards for social announcements will be added here.</p>
        </div>
          </>
        )}
      </CardContent>
    </Card>
  )
}

/** Shared hub section when multiple teams (e.g. Main + Select) share one hub. */
function GroupedEventHubSection({
  groupName,
  eventsWithLabels,
  currentUserId,
  onRefetch,
  hideEventInfo,
  sectionId,
}: {
  groupName: string
  eventsWithLabels: { event: HubEvent; label: string }[]
  currentUserId: string
  onRefetch?: () => void
  hideEventInfo?: boolean
  sectionId?: string
}) {
  const events = eventsWithLabels.map((x) => x.event)
  const firstEvent = events[0]
  const myRegs = events.flatMap((e) => e.myRegistrations ?? [])
  const hasThread = !!firstEvent?.threadId && !!currentUserId
  const [activeTab, setActiveTab] = useState<HubTab>("dashboard")
  const [sizeMessage, setSizeMessage] = useState<{ type: "success" | "error"; text: string } | null>(null)

  const isNHSCA = firstEvent.eventSlug === "nhsca-duals-2026" || firstEvent.eventName.toLowerCase().includes("nhsca")

  return (
    <Card id={sectionId} className={cn(sectionId && "scroll-mt-24", "overflow-hidden rounded-2xl border-2 border-[#003366]/30 bg-white shadow-lg")}>
      <CardHeader className="bg-gradient-to-b from-[#003366]/15 to-[#003366]/5 border-b-2 border-[#003366]/20 pb-4">
        <CardTitle className="text-[#002147] text-lg sm:text-xl tracking-tight">{groupName}</CardTitle>
        <CardDescription className="text-gray-600">Both rosters with gear sizes, updates &amp; comms</CardDescription>
        <div className="flex gap-1 mt-3 border-b border-gray-200 -mb-1">
          <button
            type="button"
            onClick={() => setActiveTab("dashboard")}
            className={cn(
              "min-h-[44px] px-4 py-2 text-sm font-medium rounded-t-lg border-b-2 -mb-px transition-colors",
              activeTab === "dashboard"
                ? "border-[#003366] text-[#003366] bg-white"
                : "border-transparent text-gray-600 hover:text-[#003366] hover:bg-white/50"
            )}
          >
            <LayoutDashboard className="inline-block w-4 h-4 mr-1.5 align-middle" />
            Dashboard
          </button>
          {hasThread && (
            <button
              type="button"
              onClick={() => setActiveTab("updates")}
              className={cn(
                "min-h-[44px] px-4 py-2 text-sm font-medium rounded-t-lg border-b-2 -mb-px transition-colors",
                activeTab === "updates"
                  ? "border-[#003366] text-[#003366] bg-white"
                  : "border-transparent text-gray-600 hover:text-[#003366] hover:bg-white/50"
              )}
            >
              <Megaphone className="inline-block w-4 h-4 mr-1.5 align-middle" />
              Updates
            </button>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {activeTab === "updates" && hasThread && (
          <div>
            <h3 className="text-sm font-medium text-gray-700 mb-3">Announcements</h3>
            <HubUpdatesList threadId={firstEvent.threadId!} />
          </div>
        )}
        {activeTab === "dashboard" && (
          <>
            {!hideEventInfo && isNHSCA && <NHSCA2026HubInfo />}
            {eventsWithLabels.map(({ event: ev, label }) => {
              const isNational = label.toLowerCase() === "national"
              const tileBorder = isNational ? "border-[#003366]/30" : "border-[#CBAF5D]/50"
              const tileBg = isNational ? "bg-[#003366]/5" : "bg-[#CBAF5D]/10"
              const headerBg = isNational ? "bg-[#003366]" : "bg-[#CBAF5D]"
              return (
                <div key={ev.eventSlug} className={cn("rounded-xl border-2 overflow-hidden", tileBorder, tileBg)}>
                  <h3 className="text-sm font-semibold text-[#002147] mb-1 px-4 pt-4">
                    {label} Roster &amp; gear ({ev.roster.length})
                  </h3>
                  <p className="text-xs text-gray-600 px-4 pb-1">Enter gear sizes in the table below. Changes save automatically.</p>
                  <p className="md:hidden text-xs text-[#003366] font-medium px-4 pb-2 flex items-center gap-1" role="status">
                    <span>Scroll right →</span>
                    <span className="text-gray-600 font-normal">to see Singlet, Shorts, Shirt sizes.</span>
                  </p>
                  <div
                    className="rounded-b-xl overflow-x-auto bg-white border-t border-gray-200 touch-pan-x"
                    style={{ WebkitOverflowScrolling: "touch" }}
                  >
                    {ev.roster.length === 0 ? (
                      <div className="py-8 px-4 text-center">
                        <p className="text-sm text-gray-500">No athletes on the {label} roster yet.</p>
                        <p className="text-xs text-gray-400 mt-1">Assign in Admin → National team submissions (Team 1 = National, Team 2 = Select), or paid registrations will appear here.</p>
                      </div>
                    ) : (
                      <table className="w-full text-sm min-w-[560px] border-collapse">
                        <thead>
                          <tr className={cn(headerBg, isNational ? "text-white" : "text-[#002147]")}>
                            <th className="text-left py-3 pl-3 pr-2 font-semibold w-[52px]">Photo</th>
                            <th className="text-left py-3 px-2 font-semibold">Name</th>
                            <th className="text-center py-3 px-2 font-semibold w-14">Class</th>
                            <th className="text-center py-3 px-2 font-semibold w-14">Weight</th>
                            <th className="text-left py-3 px-2 font-semibold">School</th>
                            <th className="text-center py-3 px-2 font-semibold w-16">Singlet</th>
                            <th className="text-center py-3 px-2 font-semibold w-16">Shorts</th>
                            <th className="text-center py-3 px-2 font-semibold w-16">Shirt</th>
                          </tr>
                        </thead>
                        <tbody>
                          {ev.roster.map((r, i) => (
                            <tr key={r.id} className={cn("border-t border-gray-100", i % 2 === 1 && "bg-gray-50/50")}>
                              <td className="py-2 pl-3 pr-2 align-middle">
                                {r.photo_url ? (
                                  <div className="relative h-10 w-10 rounded-full overflow-hidden bg-gray-200 shrink-0">
                                    <Image src={r.photo_url} alt="" fill className="object-cover" sizes="40px" />
                                  </div>
                                ) : (
                                  <div className="h-10 w-10 rounded-full bg-[#003366]/20 flex items-center justify-center shrink-0 text-[#002147] font-semibold text-sm">
                                    {(r.athlete_first_name?.[0] ?? "").toUpperCase()}{(r.athlete_last_name?.[0] ?? "").toUpperCase()}
                                  </div>
                                )}
                              </td>
                              <td className="py-2 px-2 text-gray-900">
                                <span className="font-medium">{r.athlete_first_name} {r.athlete_last_name}</span>
                                {r.updated_at && (
                                  <p className="text-xs font-normal text-gray-500 mt-0.5">
                                    Last edited {new Date(r.updated_at).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}
                                    {r.updated_by_display_name ? ` by ${r.updated_by_display_name}` : ""}
                                  </p>
                                )}
                              </td>
                              <td className="py-2 px-2 text-center text-gray-700 tabular-nums">{r.graduation_year || "—"}</td>
                              <td className="py-2 px-2 text-center text-gray-700 tabular-nums">{r.primary_weight}</td>
                              <td className="py-2 px-2 text-gray-700">{r.high_school || "—"}</td>
                              <RosterSizeCell registrationId={r.id} field="singlet_size" value={r.singlet_size ?? ""} sizes={TSHIRT_SIZES} onSave={onRefetch} />
                              <RosterSizeCell registrationId={r.id} field="shorts_size" value={r.shorts_size ?? ""} sizes={TSHIRT_SIZES} onSave={onRefetch} />
                              <RosterSizeCell registrationId={r.id} field="shirt_size" value={r.shirt_size ?? ""} sizes={TSHIRT_SIZES} onSave={onRefetch} />
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}
                  </div>
                </div>
              )
            })}
            <HubDocumentsList contextType="event" contextId={firstEvent.eventSlug} />
            <div>
              <h3 className="text-sm font-medium text-gray-700 mb-2">Athlete cards (IG)</h3>
              <p className="text-sm text-gray-500">Individual cards for social announcements will be added here.</p>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  )
}
