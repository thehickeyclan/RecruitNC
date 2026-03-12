"use client"

import { useCallback, useEffect, useState } from "react"
import { useAuth } from "@/contexts/auth-context"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { MessageCircle, Loader2, Lock, UserPlus, Phone, Calendar, Scale, Clock, History, ExternalLink, UsersRound, AlertCircle, MapPin, LayoutDashboard, Megaphone, Hotel } from "lucide-react"
import type { HubResponse, HubEvent } from "@/app/api/national-team/hub/route"
import { HubPresenceBubbles } from "@/components/hub-presence-bubbles"
import { HardLink } from "@/components/hard-link"
import { cn } from "@/lib/utils"
import Image from "next/image"
import { getHubGroupForEvent, HUB_EVENT_GROUPS } from "@/lib/national-team-events"

const REG_PAGE_PATH = "/national-team/register/nhsca-2026"

export default function NationalTeamHubPage() {
  const { user, profile } = useAuth()
  const [data, setData] = useState<HubResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [regPageUrl, setRegPageUrl] = useState("")

  useEffect(() => {
    setRegPageUrl(typeof window !== "undefined" ? `${window.location.origin}${REG_PAGE_PATH}` : "")
  }, [])

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

  const events = data.events ?? []
  const eventsWithChat = events.filter((e) => e.forumGroupId && e.forumChannelId)

  return (
    <div className="min-h-screen bg-gray-50/80 py-6 sm:py-8 px-4 sm:px-6">
      <div className="max-w-4xl mx-auto space-y-6 sm:space-y-8">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-[#002147] tracking-tight">National Team Hub</h1>
            <div className="flex items-center gap-3 mt-1.5 flex-wrap">
              {data.isAdmin && (
                <p className="text-sm text-amber-700">Admin: you see the full list of event workspaces.</p>
              )}
              {user?.id && (
                <HubPresenceBubbles
                  channelId="hub"
                  currentUserId={user.id}
                  displayName={profile?.full_name ?? null}
                  email={user.email ?? null}
                />
              )}
            </div>
          </div>
          <Button asChild variant="outline" size="sm">
            <a href="/national-team">Back to National Team</a>
          </Button>
        </div>

        {events.length > 0 && (
          <div className="rounded-xl border border-[#003366]/15 bg-amber-50/50 px-4 py-3 sm:px-5">
            <p className="text-sm font-medium text-[#002147] flex items-center gap-2">
              <Hotel className="h-4 w-4 text-[#003366] flex-shrink-0" />
              Hotel
            </p>
            <p className="text-sm text-gray-700 mt-1">
              Hotel info coming soon; we&apos;ll post in the Hub and in the team chat.
            </p>
          </div>
        )}

        {eventsWithChat.length > 0 && (
          <div className="rounded-xl border border-[#003366]/20 bg-[#003366]/5 px-4 py-3 sm:px-5">
            <p className="text-sm font-medium text-[#002147] flex items-center gap-2">
              <MessageCircle className="h-4 w-4 text-[#003366] flex-shrink-0" />
              We’ll be communicating and engaging via the Community chat.
            </p>
            <p className="text-sm text-gray-700 mt-1">
              Open your event’s chat below to join the conversation.
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              {eventsWithChat.map((e) => {
                const count = e.forumMessageCount ?? 0
                const forumHref = "/forum"
                return (
                  <HardLink
                    key={e.eventSlug}
                    href={forumHref}
                    className="inline-flex items-center gap-2 min-h-[44px] rounded-lg border border-[#003366]/30 bg-white px-4 py-3 text-sm font-medium text-[#003366] hover:bg-[#003366]/5 transition-colors touch-manipulation"
                  >
                    <MessageCircle className="h-4 w-4" />
                    {e.eventName}
                    {count > 0 && (
                      <span className="rounded-full bg-[#003366]/15 px-2 py-0.5 text-xs font-semibold">
                        {count} message{count !== 1 ? "s" : ""}
                      </span>
                    )}
                    <ExternalLink className="h-3.5 w-3.5 opacity-70" />
                  </HardLink>
                )
              })}
            </div>
          </div>
        )}

        {events.length === 0 ? (
          <>
            <Card className="border-[#003366]/20">
              <CardHeader>
                <CardTitle className="text-[#003366]">Your team hub</CardTitle>
                <CardDescription>
                  Once you register and pay for an event, this page will show your event roster, your registration details, and the team group chat — all in one place.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm text-gray-600">
                  If you have an invite to <strong>NHSCA Duals 2026</strong>, use your registration link to sign up. After payment, come back here to see the roster and team messaging.
                </p>
                <div className="flex flex-wrap gap-3">
                  <Button asChild className="bg-[#003366] hover:bg-[#003366]/90">
                    <a href="/national-team/nhsca-2026">NHSCA 2026 event page</a>
                  </Button>
                  <Button asChild variant="outline">
                    <a href={REG_PAGE_PATH}>Registration page</a>
                  </Button>
                  <Button asChild variant="outline">
                    <a href="/national-team">National Team overview</a>
                  </Button>
                </div>
                <p className="text-xs text-gray-500">
                  Already registered? Sign in with the parent email from your registration so your events appear here.
                </p>
              </CardContent>
            </Card>

            {data.isAdmin && (
              <Card className="border-amber-300 bg-amber-50/50">
                <CardHeader>
                  <CardTitle className="text-amber-900 text-base">Send to families</CardTitle>
                  <CardDescription>
                    As admin you can share the registration page and create invite codes. Recipients need an invite code to register.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div>
                    <p className="text-sm font-medium text-gray-700 mb-1">Registration page (copy and send)</p>
                    <p className="text-sm text-gray-600 font-mono bg-white border rounded px-2 py-1.5 break-all">
                      {regPageUrl || REG_PAGE_PATH}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button asChild size="sm" className="bg-[#003366] hover:bg-[#003366]/90">
                      <a href={REG_PAGE_PATH}>Open registration page</a>
                    </Button>
                    <Button asChild size="sm" variant="outline">
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
            return sections.map((s) =>
              s.type === "single" ? (
                <EventHubSection key={s.event.eventSlug} event={s.event} currentUserId={user?.id ?? ""} onRefetch={refetchHub} />
              ) : (
                <GroupedEventHubSection
                  key={s.groupKey}
                  groupName={s.groupName}
                  eventsWithLabels={s.eventsWithLabels}
                  currentUserId={user?.id ?? ""}
                  onRefetch={refetchHub}
                />
              )
            )
          })()
        )}

        {/* Single “what’s coming” note instead of three placeholder cards */}
        <Card className="rounded-2xl border-gray-200/80 bg-white/80 shadow-sm">
          <CardContent className="py-4 px-4 sm:px-6">
            <p className="text-sm text-gray-600">
              <strong className="text-gray-700">Apparel, schedule, and coaches:</strong> The organizer will add photos, sizing, daily agenda, and coach bios here before the event.
            </p>
          </CardContent>
        </Card>

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
            Official event & registration <ExternalLink className="h-4 w-4" />
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

function EventHubSection({ event, currentUserId, onRefetch }: { event: HubEvent; currentUserId: string; onRefetch?: () => void }) {
  const myRegs = event.myRegistrations ?? []
  const hasThread = !!event.threadId && !!currentUserId
  const [activeTab, setActiveTab] = useState<HubTab>("dashboard")
  const [addSearchQuery, setAddSearchQuery] = useState("")
  const [addSearchResults, setAddSearchResults] = useState<SearchUser[]>([])
  const [addSearching, setAddSearching] = useState(false)
  const [addingId, setAddingId] = useState<string | null>(null)
  const [addMessage, setAddMessage] = useState<{ type: "success" | "error"; text: string } | null>(null)
  const [sizeMessage, setSizeMessage] = useState<{ type: "success" | "error"; text: string } | null>(null)

  useEffect(() => {
    if (addSearchQuery.trim().length < 2) {
      setAddSearchResults([])
      return
    }
    const t = setTimeout(() => {
      setAddSearching(true)
      fetch(
        `/api/national-team/workspace/${encodeURIComponent(event.eventSlug)}/users/search?q=${encodeURIComponent(addSearchQuery.trim())}`,
        { credentials: "include" }
      )
        .then((r) => r.json())
        .then((data) => setAddSearchResults(data.users ?? []))
        .catch(() => setAddSearchResults([]))
        .finally(() => setAddSearching(false))
    }, 300)
    return () => clearTimeout(t)
  }, [addSearchQuery, event.eventSlug])

  const handleAddMember = async (userId: string) => {
    setAddMessage(null)
    setAddingId(userId)
    try {
      const res = await fetch(`/api/national-team/workspace/${encodeURIComponent(event.eventSlug)}/members`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ user_id: userId }),
      })
      const data = await res.json().catch(() => ({}))
      if (res.ok) {
        setAddMessage({ type: "success", text: "Added. They can now see this event and the group chat." })
        setAddSearchResults((prev) => prev.filter((u) => u.user_id !== userId))
      } else {
        setAddMessage({ type: "error", text: data?.error ?? "Could not add member." })
      }
    } catch {
      setAddMessage({ type: "error", text: "Request failed. Try again." })
    } finally {
      setAddingId(null)
    }
  }

  return (
    <Card className="overflow-hidden rounded-2xl border-[#003366]/15 shadow-sm">
      <CardHeader className="bg-gray-50/50 border-b border-gray-100 pb-4">
        <CardTitle className="text-[#002147] text-lg sm:text-xl tracking-tight">{event.eventName}</CardTitle>
        <CardDescription className="text-gray-600">Dashboard and updates</CardDescription>
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
        {(event.eventSlug === "nhsca-duals-2026" || event.eventName.toLowerCase().includes("nhsca")) && <NHSCA2026HubInfo />}
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
          <div className="rounded-md border border-[#003366]/15 bg-[#003366]/[0.03] p-4">
            <h3 className="text-sm font-medium text-gray-700 mb-2">Gear size</h3>
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
        <div>
          <h3 className="text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
            <UserPlus className="h-4 w-4" />
            Add RecruitNC user
          </h3>
          <p className="text-xs text-gray-500 mb-2">
            Search by name or email. Only people with an <strong>active RecruitNC account</strong> can be added — they’ll then see this event workspace and the group chat. Don’t have an account? <a href="/auth/signup" className="text-[#003366] hover:underline">Sign up free</a>.
          </p>
          <Input
            type="text"
            placeholder="Search by name or email…"
            value={addSearchQuery}
            onChange={(e) => setAddSearchQuery(e.target.value)}
            className="w-full max-w-sm mb-2"
          />
          <div className="max-h-48 overflow-y-auto border rounded-md p-2 space-y-1 bg-gray-50/50">
            {addSearching && <p className="text-sm text-gray-500 py-2 text-center">Searching…</p>}
            {!addSearching && addSearchQuery.trim().length >= 2 && addSearchResults.length === 0 && (
              <p className="text-sm text-gray-500 py-2 text-center">No users found. Try a different search.</p>
            )}
            {!addSearching &&
              addSearchResults.map((u) => (
                <button
                  key={u.user_id}
                  type="button"
                  onClick={() => handleAddMember(u.user_id)}
                  disabled={!!addingId}
                  className="w-full text-left px-3 py-2 rounded-md hover:bg-[#003366]/5 text-sm flex flex-col gap-0.5 border border-transparent hover:border-[#003366]/10"
                >
                  <span className="font-medium text-gray-900">{u.display_name}</span>
                  {u.email && <span className="text-xs text-gray-500">{u.email}</span>}
                  {addingId === u.user_id && <span className="text-xs text-[#003366]">Adding…</span>}
                </button>
              ))}
          </div>
          {addMessage && (
            <p className={`text-sm mt-2 ${addMessage.type === "success" ? "text-green-700" : "text-red-600"}`}>
              {addMessage.text}
            </p>
          )}
        </div>
        <div>
          <h3 className="text-sm font-medium text-gray-700 mb-2">Detailed roster ({event.roster.length})</h3>
          <div className="border rounded-md overflow-hidden overflow-x-auto">
            <table className="w-full text-sm min-w-[480px]">
              <thead className="bg-gray-100">
                <tr>
                  <th className="text-left p-2">Name</th>
                  <th className="text-left p-2">Weight</th>
                  <th className="text-left p-2">School</th>
                  <th className="text-left p-2">Grad</th>
                  <th className="text-left p-2">Singlet</th>
                  <th className="text-left p-2">Shorts</th>
                  <th className="text-left p-2">Shirt</th>
                </tr>
              </thead>
              <tbody>
                {event.roster.map((r) => (
                  <tr key={r.id} className="border-t">
                    <td className="p-2">
                      {r.athlete_first_name} {r.athlete_last_name}
                    </td>
                    <td className="p-2">{r.primary_weight}</td>
                    <td className="p-2">{r.high_school || "—"}</td>
                    <td className="p-2">{r.graduation_year}</td>
                    <td className="p-2">{r.singlet_size || "—"}</td>
                    <td className="p-2">{r.shorts_size || "—"}</td>
                    <td className="p-2">{r.shirt_size || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
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
}: {
  groupName: string
  eventsWithLabels: { event: HubEvent; label: string }[]
  currentUserId: string
  onRefetch?: () => void
}) {
  const events = eventsWithLabels.map((x) => x.event)
  const firstEvent = events[0]
  const myRegs = events.flatMap((e) => e.myRegistrations ?? [])
  const hasThread = !!firstEvent?.threadId && !!currentUserId
  const [activeTab, setActiveTab] = useState<HubTab>("dashboard")
  const [addSearchQuery, setAddSearchQuery] = useState("")
  const [addSearchResults, setAddSearchResults] = useState<SearchUser[]>([])
  const [addSearching, setAddSearching] = useState(false)
  const [addingId, setAddingId] = useState<string | null>(null)
  const [addMessage, setAddMessage] = useState<{ type: "success" | "error"; text: string } | null>(null)
  const [sizeMessage, setSizeMessage] = useState<{ type: "success" | "error"; text: string } | null>(null)

  useEffect(() => {
    if (addSearchQuery.trim().length < 2) {
      setAddSearchResults([])
      return
    }
    const t = setTimeout(() => {
      setAddSearching(true)
      fetch(
        `/api/national-team/workspace/${encodeURIComponent(firstEvent.eventSlug)}/users/search?q=${encodeURIComponent(addSearchQuery.trim())}`,
        { credentials: "include" }
      )
        .then((r) => r.json())
        .then((data) => setAddSearchResults(data.users ?? []))
        .catch(() => setAddSearchResults([]))
        .finally(() => setAddSearching(false))
    }, 300)
    return () => clearTimeout(t)
  }, [addSearchQuery, firstEvent.eventSlug])

  const handleAddMember = async (userId: string) => {
    setAddMessage(null)
    setAddingId(userId)
    try {
      let lastError: string | null = null
      for (const event of events) {
        const res = await fetch(`/api/national-team/workspace/${encodeURIComponent(event.eventSlug)}/members`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ user_id: userId }),
        })
        const data = await res.json().catch(() => ({}))
        if (!res.ok) lastError = data?.error ?? "Could not add member."
      }
      if (!lastError) {
        setAddMessage({ type: "success", text: "Added to all teams. They can now see this hub and the group chat." })
        setAddSearchResults((prev) => prev.filter((u) => u.user_id !== userId))
      } else {
        setAddMessage({ type: "error", text: lastError })
      }
    } catch {
      setAddMessage({ type: "error", text: "Request failed. Try again." })
    } finally {
      setAddingId(null)
    }
  }

  const isNHSCA = firstEvent.eventSlug === "nhsca-duals-2026" || firstEvent.eventName.toLowerCase().includes("nhsca")

  return (
    <Card className="overflow-hidden rounded-2xl border-[#003366]/15 shadow-sm">
      <CardHeader className="bg-gray-50/50 border-b border-gray-100 pb-4">
        <CardTitle className="text-[#002147] text-lg sm:text-xl tracking-tight">{groupName}</CardTitle>
        <CardDescription className="text-gray-600">Dashboard and updates — both teams</CardDescription>
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
            {isNHSCA && <NHSCA2026HubInfo />}
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
              <div className="rounded-md border border-[#003366]/15 bg-[#003366]/[0.03] p-4">
                <h3 className="text-sm font-medium text-gray-700 mb-2">Gear size</h3>
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
            <div>
              <h3 className="text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                <UserPlus className="h-4 w-4" />
                Add RecruitNC user
              </h3>
              <p className="text-xs text-gray-500 mb-2">
                Search by name or email. Added users will see this hub (both teams) and the group chat.
              </p>
              <Input
                type="text"
                placeholder="Search by name or email…"
                value={addSearchQuery}
                onChange={(e) => setAddSearchQuery(e.target.value)}
                className="w-full max-w-sm mb-2"
              />
              <div className="max-h-48 overflow-y-auto border rounded-md p-2 space-y-1 bg-gray-50/50">
                {addSearching && <p className="text-sm text-gray-500 py-2 text-center">Searching…</p>}
                {!addSearching && addSearchQuery.trim().length >= 2 && addSearchResults.length === 0 && (
                  <p className="text-sm text-gray-500 py-2 text-center">No users found. Try a different search.</p>
                )}
                {!addSearching &&
                  addSearchResults.map((u) => (
                    <button
                      key={u.user_id}
                      type="button"
                      onClick={() => handleAddMember(u.user_id)}
                      disabled={!!addingId}
                      className="w-full text-left px-3 py-2 rounded-md hover:bg-[#003366]/5 text-sm flex flex-col gap-0.5 border border-transparent hover:border-[#003366]/10"
                    >
                      <span className="font-medium text-gray-900">{u.display_name}</span>
                      {u.email && <span className="text-xs text-gray-500">{u.email}</span>}
                      {addingId === u.user_id && <span className="text-xs text-[#003366]">Adding…</span>}
                    </button>
                  ))}
              </div>
              {addMessage && (
                <p className={`text-sm mt-2 ${addMessage.type === "success" ? "text-green-700" : "text-red-600"}`}>
                  {addMessage.text}
                </p>
              )}
            </div>
            {eventsWithLabels.map(({ event: ev, label }) => (
              <div key={ev.eventSlug}>
                <h3 className="text-sm font-medium text-gray-700 mb-2">
                  {label} Roster ({ev.roster.length})
                </h3>
                <div className="border rounded-md overflow-hidden overflow-x-auto">
                  <table className="w-full text-sm min-w-[480px]">
                    <thead className="bg-gray-100">
                      <tr>
                        <th className="text-left p-2">Name</th>
                        <th className="text-left p-2">Weight</th>
                        <th className="text-left p-2">School</th>
                        <th className="text-left p-2">Grad</th>
                        <th className="text-left p-2">Singlet</th>
                        <th className="text-left p-2">Shorts</th>
                        <th className="text-left p-2">Shirt</th>
                      </tr>
                    </thead>
                    <tbody>
                      {ev.roster.map((r) => (
                        <tr key={r.id} className="border-t">
                          <td className="p-2">
                            {r.athlete_first_name} {r.athlete_last_name}
                          </td>
                          <td className="p-2">{r.primary_weight}</td>
                          <td className="p-2">{r.high_school || "—"}</td>
                          <td className="p-2">{r.graduation_year}</td>
                          <td className="p-2">{r.singlet_size || "—"}</td>
                          <td className="p-2">{r.shorts_size || "—"}</td>
                          <td className="p-2">{r.shirt_size || "—"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ))}
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
