"use client"

import { useCallback, useEffect, useState } from "react"
import { useAuth } from "@/contexts/auth-context"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { MessageCircle, Loader2, Lock, UserPlus, Phone, Calendar, Scale, Clock, History, ExternalLink, UsersRound, AlertCircle, MapPin, LayoutDashboard, Megaphone, Hotel, ChevronDown, ChevronRight } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { NHSCA2026EventBlock } from "@/components/national-team/nhsca-2026-event-block"
import type { HubResponse, HubEvent } from "@/app/api/national-team/hub/route"
import { HubPresenceBubbles } from "@/components/hub-presence-bubbles"
import { HardLink } from "@/components/hard-link"
import { cn } from "@/lib/utils"
import Image from "next/image"
import { getHubGroupForEvent, HUB_EVENT_GROUPS } from "@/lib/national-team-events"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"

const REG_PAGE_PATH = "/national-team/register/nhsca-2026"

const WEIGH_IN_START = new Date("2026-05-22T14:00:00-04:00").getTime()

/** Collapsible section for hub info blocks; keeps the page scannable and lets users jump to roster. */
function HubCollapsibleSection({
  id,
  title,
  defaultOpen = false,
  children,
  className = "",
}: {
  id?: string
  title: string
  defaultOpen?: boolean
  children: React.ReactNode
  className?: string
}) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <section id={id} className={cn("rounded-2xl border-2 overflow-hidden", className)}>
        <CollapsibleTrigger className="w-full flex items-center justify-between gap-2 px-5 py-4 text-left font-semibold text-[#002147] hover:bg-black/[0.02] transition-colors">
          {title}
          <span className="shrink-0 text-[#003366]" aria-hidden>
            {open ? <ChevronDown className="h-5 w-5" /> : <ChevronRight className="h-5 w-5" />}
          </span>
        </CollapsibleTrigger>
        <CollapsibleContent>{children}</CollapsibleContent>
      </section>
    </Collapsible>
  )
}

export default function NationalTeamHubPage() {
  const { user, profile } = useAuth()
  const [data, setData] = useState<HubResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [regPageUrl, setRegPageUrl] = useState("")
  const [countdown, setCountdown] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0, ready: false })
  const [addFamilySearchQuery, setAddFamilySearchQuery] = useState("")
  const [addFamilySearchResults, setAddFamilySearchResults] = useState<SearchUser[]>([])
  const [addFamilySearching, setAddFamilySearching] = useState(false)
  const [addFamilyAddingId, setAddFamilyAddingId] = useState<string | null>(null)
  const [addFamilyMessage, setAddFamilyMessage] = useState<{ type: "success" | "error"; text: string } | null>(null)

  const events = data?.events ?? []
  const eventSlugs = events.map((e) => e.eventSlug)

  const refetchHub = useCallback(() => {
    fetch("/api/national-team/hub", { credentials: "include" })
      .then((r) => r.json())
      .then(setData)
      .catch(() => {})
  }, [])

  useEffect(() => {
    fetch("/api/national-team/hub", { credentials: "include" })
      .then((r) => r.json())
      .then(setData)
      .catch(() => setData({ allowed: false, reason: "no_access" }))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    setRegPageUrl(typeof window !== "undefined" ? `${window.location.origin}${REG_PAGE_PATH}` : "")
  }, [])

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

  useEffect(() => {
    const query = addFamilySearchQuery.trim()
    if (query.length < 2 || eventSlugs.length === 0) {
      setAddFamilySearchResults([])
      return
    }
    setAddFamilySearching(true)
    fetch(`/api/national-team/workspace/${encodeURIComponent(eventSlugs[0])}/users/search?q=${encodeURIComponent(query)}`, { credentials: "include" })
      .then((r) => r.json())
      .then((res) => setAddFamilySearchResults(res.users ?? []))
      .catch(() => setAddFamilySearchResults([]))
      .finally(() => setAddFamilySearching(false))
  }, [addFamilySearchQuery, eventSlugs.join(",")])

  const handleAddFamilyMember = useCallback(
    async (userId: string) => {
      if (eventSlugs.length === 0) return
      setAddFamilyMessage(null)
      setAddFamilyAddingId(userId)
      try {
        for (const slug of eventSlugs) {
          const res = await fetch(`/api/national-team/workspace/${encodeURIComponent(slug)}/members`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
            body: JSON.stringify({ user_id: userId }),
          })
          const resData = await res.json().catch(() => ({}))
          if (!res.ok) throw new Error(resData?.error ?? "Could not add member.")
        }
        setAddFamilyMessage({ type: "success", text: "Added. They can now see this hub and the group chat." })
        setAddFamilySearchResults((prev) => prev.filter((u) => u.user_id !== userId))
        refetchHub()
      } catch (e) {
        setAddFamilyMessage({ type: "error", text: e instanceof Error ? e.message : "Could not add member." })
      } finally {
        setAddFamilyAddingId(null)
      }
    },
    [eventSlugs, refetchHub]
  )

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-[#003366]" />
      </div>
    )
  }

  if (!data?.allowed) {
    return (
      <div className="min-h-screen bg-gray-50 py-12 px-4 flex items-center justify-center">
        <Card className="max-w-md w-full border-amber-200">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Lock className="h-5 w-5" />
              Team hub
            </CardTitle>
            <CardDescription>
              {data?.reason === "signed_out"
                ? "Sign in with the same email you used to register to view the team hub."
                : "You don’t have access to the team hub. If you’ve already registered and paid, sign in with the parent email from your registration."}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {data?.reason === "signed_out" && (
              <Button asChild className="w-full bg-[#003366] hover:bg-[#003366]/90">
                <a href={`/auth/signin?returnTo=${encodeURIComponent("/national-team/hub")}`}>
                  Sign in
                </a>
              </Button>
            )}
            <Button asChild variant="outline" className="w-full">
              <a href="/national-team">Back to National Team</a>
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  const eventsWithChat = events.filter((e) => e.forumGroupId && e.forumChannelId)

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Same full-width banner as /national-team/nhsca-2026 */}
      <section className="w-full bg-gradient-to-br from-[#002147] via-[#003366] to-[#002147] text-white">
        <div className="relative w-full aspect-[21/9] min-h-[200px] md:min-h-[280px] max-h-[400px]">
          <Image
            src="/images/nhsca-virginia-beach-arena.png"
            alt=""
            fill
            className="object-cover opacity-40"
            sizes="100vw"
            priority
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#002147] via-[#002147]/80 to-transparent" />
          <div className="absolute inset-0 flex flex-col items-center justify-center px-4 text-center">
            <Image
              src="/images/nhsca-national-duals-logo.png"
              alt="NHSCA National Duals"
              width={180}
              height={72}
              className="mb-4 h-14 md:h-16 w-auto object-contain drop-shadow-lg"
              priority
            />
            <Badge className="mb-3 bg-[#D3B574] text-[#003366] hover:bg-[#D3B574] border-0 font-semibold">
              NC United National Team · Team Hub
            </Badge>
            <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-1 drop-shadow">27th Annual National Duals</h1>
            <p className="text-blue-100 text-lg md:text-xl font-medium">Memorial Day Weekend · May 23–25, 2026</p>
            <p className="text-[#D3B574] mt-2 text-base md:text-lg font-medium">Virginia Beach Sports Center</p>
          </div>
        </div>
        <div className="w-full bg-[#002147] px-4 py-4 flex flex-wrap items-center justify-center gap-3">
          <Button asChild variant="outline" size="sm" className="rounded-xl border-[#D3B574]/60 text-[#D3B574] hover:bg-[#D3B574]/20 hover:text-white font-medium">
            <a href="https://nhsca-events.com/national-duals/" target="_blank" rel="noopener noreferrer">
              NHSCA Official Page
              <ExternalLink className="ml-2 h-4 w-4" />
            </a>
          </Button>
          <a href="/national-team" className="inline-flex min-h-[36px] items-center justify-center rounded-xl border border-white/40 px-4 py-2 text-sm font-medium text-white/90 hover:bg-white/10 hover:text-white transition-colors">
            ← Back to National Team
          </a>
        </div>
      </section>

      <div className="max-w-3xl mx-auto px-4 py-8 space-y-8">
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

        {/* Key links — clear labels, no confusion */}
        <HubCollapsibleSection title="Key links" defaultOpen className="border-[#003366]/25 bg-white shadow-sm">
          <div className="px-5 pb-5 pt-0 flex flex-wrap justify-center gap-3">
            <Button asChild className="rounded-xl bg-[#003366] hover:bg-[#002147] text-white font-semibold">
              <a href="https://nhsca-events.com/national-duals/" target="_blank" rel="noopener noreferrer">
                NHSCA Official Page
                <ExternalLink className="ml-2 h-4 w-4" />
              </a>
            </Button>
            <Button asChild variant="outline" className="rounded-xl border-2 border-[#003366] text-[#003366] hover:bg-[#003366]/10 font-semibold">
              <a href="/forum">Forum · Discussions &amp; updates</a>
            </Button>
            <Button asChild variant="outline" className="rounded-xl border-2 border-[#CBAF5D] text-[#002147] hover:bg-[#CBAF5D]/20 font-semibold">
              <a href="/national-team#archives">Read about past teams</a>
            </Button>
          </div>
        </HubCollapsibleSection>

        {/* In-page nav */}
        <nav className="flex flex-wrap items-center justify-center gap-3 text-sm" aria-label="Jump to section">
          <a href="#coaches" className="rounded-full bg-[#003366]/10 px-4 py-2 text-[#003366] font-medium hover:bg-[#003366]/20">
            Coaches
          </a>
          <a href="#event-details" className="rounded-full bg-[#003366]/10 px-4 py-2 text-[#003366] font-medium hover:bg-[#003366]/20">
            Event details
          </a>
          <a href="#roster" className="rounded-full bg-[#B31B1B]/20 px-4 py-2 text-[#B31B1B] font-medium hover:bg-[#B31B1B]/30">
            Roster &amp; gear
          </a>
          <a href="#schedule" className="rounded-full bg-[#003366]/10 px-4 py-2 text-[#003366] font-medium hover:bg-[#003366]/20">
            Schedule
          </a>
          <a href="#qa" className="rounded-full bg-[#003366]/10 px-4 py-2 text-[#003366] font-medium hover:bg-[#003366]/20">
            Q&amp;A
          </a>
        </nav>

        {/* Hotel — gold tile */}
        {events.length > 0 && (
          <HubCollapsibleSection title="Hotel" className="border-[#CBAF5D]/50 bg-[#CBAF5D]/10">
            <div className="px-5 pb-5 pt-0">
              <p className="text-sm text-gray-700">
                Hotel info coming soon; we&apos;ll post in the Hub and in the team chat.
              </p>
            </div>
          </HubCollapsibleSection>
        )}

        {/* Team chat & comms — Forum for discussions and updates */}
        {eventsWithChat.length > 0 && (
          <HubCollapsibleSection title="Forum · Discussions & updates" className="border-[#003366]/40 bg-[#003366]/10">
            <div className="px-5 pb-5 pt-0">
              <p className="text-sm text-gray-700 mb-3">
                Team chat and announcements live in the <strong>Community forum</strong>. Open the link below to join.
              </p>
              <div className="flex flex-wrap gap-2">
                {eventsWithChat.map((e) => {
                  const count = e.forumMessageCount ?? 0
                  return (
                    <HardLink
                      key={e.eventSlug}
                      href="/forum"
                      className="inline-flex items-center gap-2 min-h-[44px] rounded-xl border-2 border-[#003366] bg-[#003366]/10 px-4 py-2.5 text-sm font-semibold text-[#003366] hover:bg-[#003366]/20 transition-colors touch-manipulation"
                    >
                      <MessageCircle className="h-4 w-4" />
                      {e.eventName}
                      {count > 0 && (
                        <span className="rounded-full bg-[#B31B1B] text-white px-2 py-0.5 text-xs font-semibold">
                          {count} message{count !== 1 ? "s" : ""}
                        </span>
                      )}
                      <ExternalLink className="h-3.5 w-3.5 opacity-70" />
                    </HardLink>
                  )
                })}
              </div>
            </div>
          </HubCollapsibleSection>
        )}

        {/* Add family members — registration link, invite code, and add-by-search (primary only) */}
        {events.length > 0 && (
          <HubCollapsibleSection title="Add family members" className="border-[#CBAF5D]/50 bg-[#CBAF5D]/10">
            <div className="px-5 pb-5 pt-0">
              {data?.isPrimaryRegistrant ? (
              <>
                <p className="text-sm text-gray-700 mt-1">
                  Share the <strong>registration link</strong> and your <strong>invite code</strong> so other parents can register and pay. After they complete registration, they’ll see this hub. Or add existing RecruitNC users below (search by name or email).
                </p>
                <div className="mt-3 flex flex-wrap items-center gap-3">
                  <span className="text-xs font-mono text-gray-600 bg-white/80 px-2 py-1.5 rounded border border-[#CBAF5D]/30 break-all">
                    {regPageUrl || REG_PAGE_PATH}
                  </span>
                  {data?.isAdmin && (
                    <Button asChild size="sm" variant="outline" className="rounded-xl border-[#003366] text-[#003366] hover:bg-[#003366]/10 font-medium">
                      <a href="/admin/national-team/invite-codes">Create invite codes</a>
                    </Button>
                  )}
                </div>
                <div className="mt-4 pt-3 border-t border-[#CBAF5D]/30">
                  <p className="text-xs text-gray-600 mb-2">Add existing RecruitNC user — they’ll see this hub and the group chat. No account? <a href="/auth/signup" className="text-[#003366] hover:underline">Sign up free</a>.</p>
                  <Input
                    type="text"
                    placeholder="Search by name or email…"
                    value={addFamilySearchQuery}
                    onChange={(e) => setAddFamilySearchQuery(e.target.value)}
                    className="w-full max-w-sm mb-2 bg-white/80 border-[#CBAF5D]/40"
                  />
                  <div className="max-h-40 overflow-y-auto border border-[#CBAF5D]/30 rounded-lg p-2 space-y-1 bg-white/60">
                    {addFamilySearching && <p className="text-sm text-gray-500 py-2 text-center">Searching…</p>}
                    {!addFamilySearching && addFamilySearchQuery.trim().length >= 2 && addFamilySearchResults.length === 0 && (
                      <p className="text-sm text-gray-500 py-2 text-center">No users found. Try a different search.</p>
                    )}
                    {!addFamilySearching &&
                      addFamilySearchResults.map((u) => (
                        <button
                          key={u.user_id}
                          type="button"
                          onClick={() => handleAddFamilyMember(u.user_id)}
                          disabled={!!addFamilyAddingId}
                          className="w-full text-left px-3 py-2 rounded-md hover:bg-[#003366]/5 text-sm flex flex-col gap-0.5 border border-transparent hover:border-[#003366]/10"
                        >
                          <span className="font-medium text-gray-900">{u.display_name}</span>
                          {u.email && <span className="text-xs text-gray-500">{u.email}</span>}
                          {addFamilyAddingId === u.user_id && <span className="text-xs text-[#003366]">Adding…</span>}
                        </button>
                      ))}
                  </div>
                  {addFamilyMessage && (
                    <p className={`text-sm mt-2 ${addFamilyMessage.type === "success" ? "text-green-700" : "text-red-600"}`}>
                      {addFamilyMessage.text}
                    </p>
                  )}
                </div>
              </>
            ) : (
              <p className="text-sm text-gray-700 mt-1">
                You’re viewing this hub as an <strong>added family member</strong>. To add another parent or guardian, ask the person who registered and paid (the primary registrant) to share the registration link and invite code with them, or to add existing RecruitNC users in this section (search by name or email).
              </p>
            )}
            </div>
          </HubCollapsibleSection>
        )}

        {/* Event content: coaches, details, venue, format, etc. — same as nhsca-2026 (use shared block) */}
        <HubCollapsibleSection id="event-details" title="Event details (coaches, schedule, venue)" className="border-[#003366]/20 bg-white shadow-sm">
          <div className="p-4 pt-0">
            <NHSCA2026EventBlock />
          </div>
        </HubCollapsibleSection>

        {events.length === 0 ? (
          <>
            <Card className="rounded-2xl border-[#003366]/20 bg-white shadow-sm overflow-hidden">
              <CardHeader className="bg-gradient-to-br from-[#003366]/5 to-transparent pb-6">
                <CardTitle className="text-[#002147] text-xl">Your team hub</CardTitle>
                <CardDescription className="text-gray-600 max-w-xl">
                  Once you register and pay for an event, this page will show your event roster, registration details, and the team group chat in one place.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-5">
                <p className="text-sm text-gray-700">
                  Have an invite to <strong>NHSCA Duals 2026</strong>? Use your registration link to sign up. After payment, return here to see the roster and team chat.
                </p>
                <div className="flex flex-wrap gap-3">
                  <Button asChild className="rounded-xl bg-[#003366] hover:bg-[#002147] text-white font-semibold shadow-sm">
                    <a href="/national-team/hub">Team Hub</a>
                  </Button>
                  <Button asChild variant="outline" className="rounded-xl border-2 border-[#003366]/40 text-[#003366] hover:bg-[#003366]/10 font-medium">
                    <a href={REG_PAGE_PATH}>Registration page</a>
                  </Button>
                  <Button asChild variant="outline" className="rounded-xl border-2 border-[#003366]/40 text-[#003366] hover:bg-[#003366]/10 font-medium">
                    <a href="/national-team">National Team overview</a>
                  </Button>
                </div>
                <p className="text-xs text-gray-500">
                  Already registered? Sign in with the parent email from your registration so your events appear here.
                </p>
              </CardContent>
            </Card>

            {data.isAdmin && (
              <Card className="rounded-2xl border-amber-200 bg-amber-50/60 shadow-sm">
                <CardHeader>
                  <CardTitle className="text-amber-900 text-base">Send to families</CardTitle>
                  <CardDescription>
                    Share the registration page and create invite codes. Recipients need an invite code to register.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div>
                    <p className="text-sm font-medium text-gray-700 mb-1">Registration URL</p>
                    <p className="text-sm text-gray-600 font-mono bg-white border border-amber-200 rounded-lg px-3 py-2 break-all">
                      {regPageUrl || REG_PAGE_PATH}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button asChild size="sm" className="bg-[#003366] hover:bg-[#002147] rounded-lg">
                      <a href={REG_PAGE_PATH}>Open registration page</a>
                    </Button>
                    <Button asChild size="sm" variant="outline" className="rounded-lg">
                      <a href="/admin/national-team/invite-codes">Create invite codes</a>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}
          </>
        ) : (
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
            return sections.map((s, i) =>
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
            )
          })()
        )}

        {/* Single “what’s coming” note instead of three placeholder cards */}
        {events.length > 0 && (
          <HubCollapsibleSection id="announcements" title="Announcements by weight" className="border-[#003366]/20 bg-white shadow-sm">
            <div className="px-5 pb-5 pt-0">
              <p className="text-sm text-gray-600">
                Posts and updates for each weight class will be added here. Check back before the event.
              </p>
            </div>
          </HubCollapsibleSection>
        )}

        <HubCollapsibleSection id="qa" title="Q&A" className="border-[#003366]/20 bg-white shadow-sm scroll-mt-24">
          <div className="px-5 pb-5 pt-0">
            <p className="text-sm text-gray-600">
              Common questions and answers will be added here. If you have a question now, post in the Forum or contact the staff.
            </p>
          </div>
        </HubCollapsibleSection>

        {events.length > 0 && (
          <HubCollapsibleSection title="Apparel, schedule & coaches" className="border-[#CBAF5D]/40 bg-[#CBAF5D]/10">
            <div className="px-5 pb-5 pt-0">
              <p className="text-sm text-gray-700">
                Photos, sizing, daily agenda, and coach bios will be added here before the event.
              </p>
            </div>
          </HubCollapsibleSection>
        )}

      </div>
    </div>
  )
}

/** Full NHSCA Duals 2026 event info for the hub: logo, event pic, contacts, coaches, schedule, format, rules. */
function NHSCA2026HubInfo() {
  return (
    <div className="overflow-hidden rounded-2xl border border-[#003366]/15 bg-white shadow-md">
      {/* Hero: logo + event image */}
      <div className="relative bg-gradient-to-br from-[#002147] to-[#003366]">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 px-4 py-5 sm:px-6 sm:py-6">
          <div className="flex items-center justify-center sm:justify-start">
            <Image
              src="/images/nhsca-national-duals-logo.png"
              alt="NHSCA National Duals"
              width={140}
              height={56}
              className="h-12 w-auto sm:h-14 object-contain"
            />
          </div>
          <p className="text-center sm:text-right text-white/90 text-sm font-medium">27th Annual · May 23–25, 2026</p>
        </div>
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
        <a
          href="tel:+16316625409"
          className="flex min-h-[52px] flex-wrap items-center justify-center gap-2 rounded-xl bg-[#D3B574]/20 px-4 py-3 text-[#002147] transition-colors hover:bg-[#D3B574]/30 active:bg-[#D3B574]/40 border-2 border-[#D3B574]/40"
        >
          <Phone className="h-5 w-5 shrink-0 text-[#003366]" />
          <span className="font-semibold text-sm sm:text-base">Main contact:</span>
          <span className="font-medium text-sm sm:text-base">Matt Hickey (631) 662-5409</span>
        </a>

        {/* Two-column layout on desktop: left = when/where + schedule, right = coaches */}
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          <div className="lg:col-span-2 space-y-4">
            <div className="rounded-xl border border-[#003366]/10 bg-[#003366]/[0.03] p-4">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-[#003366] mb-2 flex items-center gap-2">
                <Calendar className="h-4 w-4" /> When & where
              </h4>
              <p className="text-sm text-gray-700 leading-relaxed">May 23–25, 2026 (Memorial Day weekend) · Virginia Beach Sports Center · 208 teams · Min 6 matches.</p>
            </div>
            <div className="rounded-xl border border-gray-100 bg-gray-50/50 p-4">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-[#003366] mb-1.5 flex items-center gap-2">
                <Clock className="h-4 w-4" /> Schedule
              </h4>
              <p className="text-xs text-amber-700/90 mb-2 flex items-center gap-1.5">
                <AlertCircle className="h-3.5 w-3.5 shrink-0" /> Tentative; subject to change.
              </p>
              <ul className="space-y-1.5 text-sm text-gray-700">
                <li><strong className="text-[#002147]">Fri May 22:</strong> Weigh-ins 2pm / 6pm · close 4pm / 7:30pm</li>
                <li><strong className="text-[#002147]">Sat–Mon:</strong> Day 1 · Day 2 · Day 3 (championship)</li>
              </ul>
            </div>
            <div className="rounded-xl border border-[#003366]/15 bg-[#003366]/5 p-4">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-[#003366] flex items-center gap-2">
                <Scale className="h-4 w-4" /> Early weigh-ins
              </h4>
              <p className="text-sm text-gray-700 mt-1">NC United has purchased. Teams need 7+ wrestlers.</p>
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
              <p className="text-gray-700 mt-0.5 text-xs">Day 1: pools, 3 matches. Day 2: champ/consi, min 3. Day 3: bracket, min 2.</p>
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

        {/* Primary actions: Add to Calendar, Open in Maps, Official site */}
        <div className="flex flex-wrap gap-3 pt-2">
          <a
            href="https://calendar.google.com/calendar/render?action=TEMPLATE&text=NHSCA+National+Duals+2026&dates=20260523/20260526&details=Virginia+Beach+Sports+Center&location=Virginia+Beach+Sports+Center,+VA"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex min-h-[44px] items-center gap-2 rounded-full bg-[#003366] px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-[#002147] focus:outline-none focus:ring-2 focus:ring-[#003366]/50 focus:ring-offset-2"
          >
            <Calendar className="h-4 w-4" /> Add to Calendar
          </a>
          <a
            href="https://www.google.com/maps/search/?api=1&query=Virginia+Beach+Sports+Center"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex min-h-[44px] items-center gap-2 rounded-full border-2 border-[#003366]/30 bg-white px-5 py-2.5 text-sm font-medium text-[#003366] transition-colors hover:bg-[#003366]/5 focus:outline-none focus:ring-2 focus:ring-[#003366]/30 focus:ring-offset-2"
          >
            <MapPin className="h-4 w-4" /> Open in Maps
          </a>
          <a
            href="https://nhsca-events.com/national-duals/"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex min-h-[44px] items-center gap-2 rounded-full border-2 border-[#003366]/30 bg-white px-5 py-2.5 text-sm font-medium text-[#003366] transition-colors hover:bg-[#003366]/5 focus:outline-none focus:ring-2 focus:ring-[#003366]/30 focus:ring-offset-2"
          >
            NHSCA Official Page <ExternalLink className="h-4 w-4" />
          </a>
          <a
            href="/national-team/nhsca-2025-results"
            className="inline-flex min-h-[44px] items-center gap-2 rounded-full border-2 border-[#003366]/30 bg-white px-5 py-2.5 text-sm font-medium text-[#003366] transition-colors hover:bg-[#003366]/5 focus:outline-none focus:ring-2 focus:ring-[#003366]/30 focus:ring-offset-2"
          >
            <History className="h-4 w-4" /> 2025 results
          </a>
        </div>
      </div>
    </div>
  )
}

type SearchUser = { user_id: string; email: string | null; display_name: string }

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
  const isInterestRow = !!registrationId && String(registrationId).startsWith("interest-")
  const editable = !!registrationId

  const handleChange = (newVal: string) => {
    if (!registrationId || !editable) return
    setSaving(true)
    const url = isInterestRow
      ? `/api/national-team/interest-forms/${registrationId.replace(/^interest-/, "")}/size`
      : `/api/national-team/registrations/${registrationId}/size`
    fetch(url, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ [field]: newVal || null }),
    })
      .then((r) => (r.ok ? Promise.resolve() : Promise.reject(new Error("Update failed"))))
      .then(() => onSave?.())
      .catch(() => {})
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
      <select
        value={value}
        onChange={(e) => handleChange(e.target.value)}
        disabled={saving}
        className="rounded border border-gray-300 bg-white px-1.5 py-1 text-sm text-gray-800 focus:border-[#003366] focus:outline-none focus:ring-1 focus:ring-[#003366] min-w-[52px] w-full max-w-[72px]"
        aria-label={field.replace("_", " ")}
      >
        <option value="">—</option>
        {sizes.map((s) => (
          <option key={s} value={s}>{s}</option>
        ))}
      </select>
      {saving && <Loader2 className="h-3 w-3 animate-spin inline-block ml-0.5 text-[#003366]" aria-hidden />}
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
        {myRegs.length > 0 && (
          <div>
            <h3 className="text-sm font-medium text-gray-700 mb-2">Your registration</h3>
            <div className="rounded-md border bg-gray-50/50 p-4 space-y-3">
              {myRegs.map((r) => (
                <div key={r.id} className="text-sm">
                  <p className="font-medium text-[#003366]">
                    {r.athlete_first_name} {r.athlete_last_name}
                  </p>
                  <p className="text-gray-600 mt-0.5">
                    Weight: {r.primary_weight} · School: {r.high_school || "—"} · Grad: {r.graduation_year}
                  </p>
                  <p className="text-gray-500 mt-0.5">Status: {r.status}</p>
                </div>
              ))}
            </div>
          </div>
        )}
        {(event.eventSlug === "nhsca-duals-2026" || event.eventName.toLowerCase().includes("nhsca")) && myRegs.length > 0 && (
          <div className="rounded-xl border-2 border-[#CBAF5D]/40 bg-[#CBAF5D]/10 p-4">
            <h3 className="text-sm font-semibold text-[#002147] mb-2">Gear &amp; apparel sizes</h3>
            <p className="text-xs text-gray-600 mb-3">Select Singlet, Shorts, and Shirt sizes for each athlete. Changes save automatically. Please submit by <strong>Sunday, March 15</strong>.</p>
            <div className="space-y-0">
              {myRegs.map((r) => (
                <HubGearSizeRow
                  key={r.id}
                  registrationId={r.id}
                  athleteName={`${r.athlete_first_name} ${r.athlete_last_name}`}
                  singletSize={r.singlet_size ?? ""}
                  shortsSize={r.shorts_size ?? ""}
                  shirtSize={r.shirt_size ?? ""}
                  sizes={TSHIRT_SIZES}
                  onUpdate={async (field, value) => {
                    setSizeMessage(null)
                    const res = await fetch(`/api/national-team/registrations/${r.id}/size`, {
                      method: "PATCH",
                      headers: { "Content-Type": "application/json" },
                      credentials: "include",
                      body: JSON.stringify({ [field]: value || "" }),
                    })
                    const data = await res.json().catch(() => ({}))
                    if (res.ok) {
                      onRefetch?.()
                    } else {
                      setSizeMessage({ type: "error", text: data?.error ?? "Could not save." })
                      throw new Error(data?.error)
                    }
                  }}
                />
              ))}
            </div>
            {sizeMessage && (
              <p className="text-sm mt-2 text-red-600">{sizeMessage.text}</p>
            )}
          </div>
        )}
        <div className="rounded-xl border-2 border-[#003366]/25 overflow-hidden bg-[#003366]/5">
          <h3 className="text-sm font-semibold text-[#002147] mb-1 px-4 pt-4">Roster &amp; gear ({event.roster.length})</h3>
          <p className="text-xs text-gray-600 px-4 pb-2">Enter gear sizes in the table below. Changes save automatically.</p>
          <div className="rounded-b-xl overflow-x-auto bg-white border-t border-[#003366]/10">
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
            {myRegs.length > 0 && (
              <div>
                <h3 className="text-sm font-medium text-gray-700 mb-2">Your registration</h3>
                <div className="rounded-md border bg-gray-50/50 p-4 space-y-3">
                  {myRegs.map((r) => (
                    <div key={r.id} className="text-sm">
                      <p className="font-medium text-[#003366]">
                        {r.athlete_first_name} {r.athlete_last_name}
                      </p>
                      <p className="text-gray-600 mt-0.5">
                        Weight: {r.primary_weight} · School: {r.high_school || "—"} · Grad: {r.graduation_year}
                      </p>
                      <p className="text-gray-500 mt-0.5">Status: {r.status}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {isNHSCA && myRegs.length > 0 && (
              <div className="rounded-xl border-2 border-[#CBAF5D]/40 bg-[#CBAF5D]/10 p-4">
                <h3 className="text-sm font-semibold text-[#002147] mb-2">Gear &amp; apparel sizes</h3>
                <p className="text-xs text-gray-600 mb-3">Select Singlet, Shorts, and Shirt sizes for each athlete. Changes save automatically. Please submit by <strong>Sunday, March 15</strong>.</p>
                <div className="space-y-0">
                  {myRegs.map((r) => (
                    <HubGearSizeRow
                      key={r.id}
                      registrationId={r.id}
                      athleteName={`${r.athlete_first_name} ${r.athlete_last_name}`}
                      singletSize={r.singlet_size ?? ""}
                      shortsSize={r.shorts_size ?? ""}
                      shirtSize={r.shirt_size ?? ""}
                      sizes={TSHIRT_SIZES}
                      onUpdate={async (field, value) => {
                        setSizeMessage(null)
                        const res = await fetch(`/api/national-team/registrations/${r.id}/size`, {
                          method: "PATCH",
                          headers: { "Content-Type": "application/json" },
                          credentials: "include",
                          body: JSON.stringify({ [field]: value || "" }),
                        })
                        const data = await res.json().catch(() => ({}))
                        if (res.ok) {
                          onRefetch?.()
                        } else {
                          setSizeMessage({ type: "error", text: data?.error ?? "Could not save." })
                          throw new Error(data?.error)
                        }
                      }}
                    />
                  ))}
                </div>
                {sizeMessage && (
                  <p className="text-sm mt-2 text-red-600">{sizeMessage.text}</p>
                )}
              </div>
            )}
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
                  <p className="text-xs text-gray-600 px-4 pb-2">Enter gear sizes in the table below. Changes save automatically.</p>
                  <div className="rounded-b-xl overflow-x-auto bg-white border-t border-gray-200">
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
