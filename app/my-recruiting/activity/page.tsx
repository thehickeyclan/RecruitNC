/**
 * Activity: everything happening in the wrestler's recruiting, as one timeline (15 Oct 2026, from
 * the mock-up Matt had ChatGPT draw).
 *
 * Only what really happened, from our own records: college programs viewing the profile, coaches'
 * messages and the family's replies, and the family's own moves on their list. A view names the
 * program, never the coach (lib/coach-profile-views.ts), and only for a subscriber; a coach's
 * private board is never shown to a family. The mock's "added you to their target list" and video
 * uploads are left out until they exist.
 */
import type { LucideIcon } from "lucide-react"
import { ArrowRight, BarChart3, Bookmark, CalendarDays, CheckCircle2, Eye, MessageSquare, PhoneCall, Send, UserRound } from "lucide-react"

import { PortalShell } from "@/components/portal/portal-shell"
import { getCoachViewsForAthlete } from "@/lib/coach-profile-views"
import { listThreads } from "@/lib/coach-messages"
import { unsentIds } from "@/lib/coach-messages-extras"
import { COLLEGE_LIST_STATUSES, COLLEGE_LIST_STATUS_LABEL } from "@/lib/college-programs/list"
import { ROADMAP, cleanDone } from "@/lib/recruiting/learn/roadmap"
import { adaptRoadmap } from "@/lib/recruiting/roadmap-adapt"
import { loadRoadmapSignals } from "@/lib/recruiting/roadmap-signals"
import { gradeFromLabel } from "@/lib/recruiting/learn/timeline"
import { createAdminClient } from "@/lib/supabase/admin"
import { loadCommandCenter } from "../load"
import { CONTACT_LABEL } from "@/lib/college-programs/contacts"
import { loadCollegeContacts } from "@/lib/college-programs/contacts-server"
import { ANNOUNCED_PROGRAMS as CONTACT_ANNOUNCED } from "@/lib/college-programs/announced"
import contactData from "@/lib/college-programs/programs-2026-27.json"

export const dynamic = "force-dynamic"
export const metadata = { title: "Activity | Recruiting Command Center" }

// The recruiting accent: blue in recruiting areas, gold elsewhere (app/recruit-brand.css).
const GOLD = "var(--recruit-accent)"
const card = "rounded-2xl border border-white/10 bg-[#0d1d36]/80"

const CONTACT_SCHOOLS = new Map([...(contactData.schools as Array<{ id: string; name: string }>), ...CONTACT_ANNOUNCED].map((s) => [s.id, s]))

type Kind = "view" | "message" | "sent" | "action" | "contact"
type Item = { at: string; kind: Kind; title: string; sub: string | null; logo: string | null; href: string | null }

const KIND: Record<Kind, { label: string; chip: string; icon: LucideIcon; dot: string }> = {
  view: { label: "Profile view", chip: "border-white/20 text-white/80", icon: Eye, dot: "bg-sky-400" },
  message: { label: "Message", chip: "border-sky-400/50 text-sky-200", icon: MessageSquare, dot: "bg-sky-400" },
  sent: { label: "My action", chip: "border-emerald-400/50 text-emerald-200", icon: Send, dot: "bg-emerald-400" },
  action: { label: "My action", chip: "border-emerald-400/50 text-emerald-200", icon: Bookmark, dot: "bg-emerald-400" },
  contact: { label: "Reached out", chip: "border-amber-300/60 text-amber-100", icon: PhoneCall, dot: "bg-amber-300" },
}

const FILTERS = [
  { key: "all", label: "All activity", kinds: ["view", "message", "sent", "action", "contact"] },
  { key: "coach", label: "Coach activity", kinds: ["view", "message", "contact"] },
  { key: "reached", label: "Reached out", kinds: ["contact"] },
  { key: "views", label: "Profile views", kinds: ["view"] },
  { key: "messages", label: "Messages", kinds: ["message", "sent"] },
  { key: "mine", label: "My actions", kinds: ["sent", "action"] },
] as const
const RANGES = [
  { key: "30", label: "Last 30 days", days: 30 },
  { key: "90", label: "Last 90 days", days: 90 },
  { key: "all", label: "All time", days: null },
] as const

const time = (iso: string) => new Date(iso).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", timeZone: "America/New_York" })
const dayKey = (iso: string) => new Date(iso).toLocaleDateString("en-CA", { timeZone: "America/New_York" })
const dayLabel = (key: string) => {
  const today = dayKey(new Date().toISOString())
  const yesterday = dayKey(new Date(Date.now() - 864e5).toISOString())
  const d = new Date(`${key}T12:00:00Z`).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" })
  return key === today ? { top: "Today", date: d } : key === yesterday ? { top: "Yesterday", date: d } : { top: d, date: null }
}

function Logo({ src, icon: Icon }: { src: string | null; icon: LucideIcon }) {
  return src ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={src} alt="" className="h-11 w-11 shrink-0 rounded-lg bg-white object-contain p-1" />
  ) : (
    <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-white/[0.06]">
      <Icon className="h-5 w-5" style={{ color: GOLD }} aria-hidden />
    </span>
  )
}

export default async function CommandCenterActivity({ searchParams }: { searchParams?: Promise<Record<string, string | undefined>> }) {
  const params = (await searchParams) ?? {}
  const cc = await loadCommandCenter("/my-recruiting/activity")
  const admin = createAdminClient()
  const filter = FILTERS.find((f) => f.key === params.f) ?? FILTERS[0]
  const range = RANGES.find((r) => r.key === params.d) ?? RANGES[0]
  const since = range.days ? new Date(Date.now() - range.days * 864e5).toISOString() : ""
  const first = cc.athletes[0] ?? null
  const name = first?.firstName ?? "your wrestler"

  const [views, threads, account] = await Promise.all([
    Promise.all(cc.athletes.map((a) => getCoachViewsForAthlete(admin, a.id).catch(() => null))),
    cc.viewerId ? listThreads(admin, cc.viewerId).catch(() => []) : Promise.resolve([]),
    cc.viewerId ? admin.auth.admin.getUserById(cc.viewerId).then((r) => r.data) : Promise.resolve(null),
  ])
  const threadById = new Map(threads.map((t) => [t.id, t]))
  const { data: msgRows } = threads.length
    ? await admin.from("coach_messages").select("id, thread_id, body, sender_role, sender_user_id, created_at").in("thread_id", threads.map((t) => t.id)).order("created_at", { ascending: false }).limit(200)
    : { data: [] }
  const hidden = await unsentIds(admin, (msgRows ?? []).map((m) => String(m.id)))

  const items: Item[] = []
  // Views: the program for a subscriber, a count for everyone else.
  views.forEach((v) => {
    for (const visit of v?.visits ?? []) {
      const school = cc.premium ? visit.school : null
      const logo = school ? (v?.schools.find((s) => s.school === school)?.logo ?? null) : null
      items.push({
        at: visit.at,
        kind: "view",
        title: school ? `${school} viewed ${name}'s profile` : "A college coach viewed the profile",
        sub: school ? null : cc.premium ? "From an address we cannot place" : "Blue shows which program",
        logo,
        href: null,
      })
    }
  })
  for (const m of msgRows ?? []) {
    const t = threadById.get(String(m.thread_id))
    if (!t || hidden.has(String(m.id))) continue
    const coach = m.sender_role === "coach"
    const mine = m.sender_user_id === cc.viewerId
    items.push({
      at: String(m.created_at),
      kind: coach ? "message" : "sent",
      title: coach ? `New message from ${t.coachName}${t.program ? ` (${t.program})` : ""}` : `${mine ? "You" : "Your family"} replied to ${t.coachName}${t.program ? ` (${t.program})` : ""}`,
      sub: `“${String(m.body).slice(0, 110)}${String(m.body).length > 110 ? "…" : ""}”`,
      logo: t.programLogo,
      href: `/inbox/${t.id}`,
    })
  }
  for (const s of cc.schools) {
    if (!s.savedAt) continue
    items.push({
      at: s.savedAt,
      kind: "action",
      title: s.status === "interested" ? `You added ${s.name} to your list` : `You moved ${s.name} to ${COLLEGE_LIST_STATUS_LABEL[s.status]}`,
      sub: [s.level, s.place].filter(Boolean).join(" · "),
      logo: s.logo,
      href: `/recruiting/schools/${s.id}`,
    })
  }
  // What the family logged: calls, texts, visits and offers that happen off the site.
  for (const c of await loadCollegeContacts(admin, cc.athletes.map((a) => a.id))) {
    const school = CONTACT_SCHOOLS.get(c.schoolId)
    const who = cc.athletes.length > 1 ? cc.athletes.find((a) => a.id === c.athleteId)?.firstName : null
    items.push({
      at: `${c.happenedOn}T12:00:00.000Z`,
      kind: "contact",
      title: `${school ? school.name.replace(/\s*\([^)]*\)\s*/g, " ").trim() : "A college"}: ${CONTACT_LABEL[c.kind].toLowerCase()}${who ? ` (${who})` : ""}`,
      sub: c.note,
      logo: null,
      href: `/recruiting/schools/${c.schoolId}`,
    })
  }
  const inRange = items.filter((i) => !since || i.at >= since)
  const shown = inRange.filter((i) => (filter.kinds as readonly string[]).includes(i.kind)).sort((a, b) => b.at.localeCompare(a.at)).slice(0, 80)
  const days = [...new Set(shown.map((i) => dayKey(i.at)))]

  // The summary, for the chosen period.
  const contacted = cc.schools.filter((s) => COLLEGE_LIST_STATUSES.indexOf(s.status) >= COLLEGE_LIST_STATUSES.indexOf("contacted")).length
  const done = cleanDone(account?.user?.user_metadata?.roadmap_done)
  const grade = gradeFromLabel(cc.wrestlers[0]?.grade ?? null)
  // The wrestler's own roadmap: steps added for him lead, steps the data proves are done drop out.
  const signals = grade && first ? await loadRoadmapSignals(admin, { athleteId: first.id, userId: cc.viewerId, grade }).catch(() => null) : null
  const adapted = signals ? adaptRoadmap(signals, done) : null
  const tiles = [
    { value: inRange.filter((i) => i.kind === "view").length, label: "Profile views" },
    { value: inRange.filter((i) => i.kind === "message").length, label: "Coach messages" },
    { value: contacted, label: "Colleges contacted" },
    { value: (adapted?.done ?? done).length, label: "Roadmap steps done" },
  ]

  // What to do next: replies owed first, then the profile, the schedule and this year's roadmap.
  const year = (adapted?.years ?? ROADMAP).find((y) => y.grade === grade)
  const doneNow = adapted?.done ?? done
  const todo: Array<{ title: string; sub: string; href: string; logo: string | null; icon: LucideIcon }> = [
    ...threads.filter((t) => t.yourTurn).slice(0, 3).map((t) => ({ title: `Reply to ${t.coachName}`, sub: t.program ?? "College coach", href: `/inbox/${t.id}`, logo: t.programLogo, icon: MessageSquare })),
    ...cc.wrestlers.flatMap((w) => (w.profileTodo ? [{ title: w.profileTodo.todo, sub: `${w.profilePercent}% complete`, href: "/my-recruiting", logo: null, icon: UserRound }] : [])),
    ...cc.wrestlers.flatMap((w) => (w.events.length === 0 ? [{ title: "Add upcoming tournaments", sub: "Coaches see where to watch", href: "/my-recruiting/plan", logo: null, icon: CalendarDays }] : [])),
    ...(year?.items.filter((i) => !doneNow.includes(i.id)).slice(0, 2).map((i) => ({ title: i.text, sub: String(("because" in i && i.because) || "This year's roadmap"), href: i.href ?? "/recruiting/learn/timeline", logo: null, icon: CheckCircle2 })) ?? []),
  ].slice(0, 5)

  const recent = cc.premium ? views.flatMap((v) => v?.schools ?? []).sort((a, b) => b.lastViewedAt.localeCompare(a.lastViewedAt)).slice(0, 5) : []
  const link = (next: { f?: string; d?: string }) => {
    const q = new URLSearchParams()
    const f = next.f ?? filter.key
    const d = next.d ?? range.key
    if (f !== "all") q.set("f", f)
    if (d !== "30") q.set("d", d)
    const s = q.toString()
    return `/my-recruiting/activity${s ? `?${s}` : ""}`
  }

  return (
    <PortalShell active="activity">
      <div className="mx-auto max-w-7xl text-white">
        <section className="relative overflow-hidden rounded-2xl border border-white/10 bg-[#0B1D3A]">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/focused-grappler.png" alt="" aria-hidden className="absolute inset-y-0 right-0 h-full w-2/3 object-cover opacity-35" />
          <div className="absolute inset-0 bg-gradient-to-r from-[#0B1D3A] via-[#0B1D3A]/90 to-[#0B1D3A]/20" aria-hidden />
          <div className="relative p-6 sm:p-8">
            <p className="text-xs font-black uppercase tracking-[0.25em]" style={{ color: GOLD }}>Activity</p>
            <h1 className="mt-2 text-3xl font-black tracking-tight sm:text-5xl">Activity</h1>
            <p className="mt-2 text-sm text-white/70 sm:text-base">Everything happening in {name}&apos;s recruiting.</p>
            <div className="-mx-6 mt-5 flex items-center gap-2 overflow-x-auto whitespace-nowrap px-6 [scrollbar-width:none] sm:mx-0 sm:flex-wrap sm:px-0 [&::-webkit-scrollbar]:hidden">
              {FILTERS.map((f) => (
                <a
                  key={f.key}
                  href={link({ f: f.key })}
                  aria-current={f.key === filter.key ? "true" : undefined}
                  className={`shrink-0 rounded-lg border px-3 py-1.5 text-sm font-semibold ${f.key === filter.key ? "border-[#D3B574] text-[#D3B574]" : "border-white/15 text-white/75 hover:text-white"}`}
                >
                  {f.label}
                </a>
              ))}
              <span className="mx-1 hidden h-5 w-px bg-white/15 sm:block" aria-hidden />
              {RANGES.map((r) => (
                <a key={r.key} href={link({ d: r.key })} className={`shrink-0 rounded-lg px-2.5 py-1.5 text-xs font-semibold ${r.key === range.key ? "bg-white/10 text-white" : "text-white/55 hover:text-white"}`}>
                  {r.label}
                </a>
              ))}
            </div>
          </div>
        </section>

        <div className="mt-6 grid gap-5 lg:grid-cols-[1fr_360px]">
          {/* Timeline */}
          <section>
            {shown.length === 0 ? (
              <div className={`${card} p-8 text-center`}>
                <p className="text-lg font-bold">Nothing here yet for this period</p>
                <p className="mt-1 text-sm text-white/55">Views, coach messages and your own moves show up here as they happen.</p>
              </div>
            ) : (
              <ol className="space-y-5">
                {days.map((key) => {
                  const label = dayLabel(key)
                  const today = shown.filter((i) => dayKey(i.at) === key)
                  return (
                    <li key={key} className="sm:grid sm:grid-cols-[7rem_1fr] sm:gap-3">
                      <div className="mb-2 flex items-baseline gap-2 sm:mb-0 sm:block sm:pt-3 sm:text-right">
                        <p className="text-sm font-bold">{label.top}</p>
                        {label.date ? <p className="text-xs text-white/45">{label.date}</p> : null}
                      </div>
                      <ul className={`${card} divide-y divide-white/5`}>
                        {today.map((item, n) => {
                          const k = KIND[item.kind]
                          const body = (
                            <>
                              <Logo src={item.logo} icon={k.icon} />
                              <span className="min-w-0 flex-1">
                                <span className="block text-sm font-semibold text-white">{item.title}</span>
                                {item.sub ? <span className="mt-0.5 line-clamp-1 block text-xs text-white/55">{item.sub}</span> : null}
                              </span>
                              <span className={`hidden shrink-0 rounded-md border px-2 py-0.5 text-[11px] font-semibold sm:inline ${k.chip}`}>{k.label}</span>
                              <span className="w-14 shrink-0 text-right text-[11px] text-white/45 sm:w-16 sm:text-xs">{time(item.at)}</span>
                            </>
                          )
                          return (
                            <li key={`${item.at}-${n}`} className="relative">
                              <span className={`absolute -left-[1.4rem] top-1/2 hidden h-2.5 w-2.5 -translate-y-1/2 rounded-full sm:block ${k.dot} ring-4 ring-[#060f1f]`} aria-hidden />
                              {item.href ? (
                                <a href={item.href} className="flex items-center gap-3 p-3 hover:bg-white/[0.03]">{body}</a>
                              ) : (
                                <div className="flex items-center gap-3 p-3">{body}</div>
                              )}
                            </li>
                          )
                        })}
                      </ul>
                    </li>
                  )
                })}
              </ol>
            )}
          </section>

          {/* Right column */}
          <div className="space-y-5">
            <section className={`${card} p-5`}>
              <div className="flex items-baseline justify-between">
                <h2 className="text-base font-bold">Summary</h2>
                <span className="text-xs font-semibold" style={{ color: GOLD }}>{range.label}</span>
              </div>
              <div className="mt-4 grid grid-cols-2 gap-4">
                {tiles.map((t) => (
                  <div key={t.label}>
                    <p className="text-3xl font-black tracking-tight">{t.value}</p>
                    <p className="text-xs text-white/55">{t.label}</p>
                  </div>
                ))}
              </div>
            </section>

            <section className={`${card} p-5`}>
              <h2 className="text-base font-bold">Up next</h2>
              {todo.length ? (
                <ul className="mt-3 divide-y divide-white/5">
                  {todo.map((t) => (
                    <li key={t.title}>
                      <a href={t.href} className="flex items-center gap-3 py-2.5 hover:opacity-90">
                        <span className="h-4 w-4 shrink-0 rounded border border-white/35" aria-hidden />
                        <span className="min-w-0 flex-1">
                          <span className="block text-sm font-semibold">{t.title}</span>
                          <span className="block text-xs text-white/50">{t.sub}</span>
                        </span>
                        {t.logo ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={t.logo} alt="" className="h-7 w-7 shrink-0 rounded bg-white object-contain p-0.5" />
                        ) : (
                          <t.icon className="h-5 w-5 shrink-0 text-white/40" aria-hidden />
                        )}
                      </a>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="mt-2 text-sm text-white/55">All caught up.</p>
              )}
            </section>

            <section className={`${card} p-5`}>
              <h2 className="text-base font-bold">Recent profile views</h2>
              {recent.length ? (
                <ul className="mt-3 space-y-3">
                  {recent.map((s) => (
                    <li key={s.school} className="flex items-center gap-3">
                      <Logo src={s.logo ?? null} icon={Eye} />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-semibold">{s.school}</span>
                        <span className="block text-xs text-white/50">{s.views} {s.views === 1 ? "view" : "views"}</span>
                      </span>
                      <span className="text-xs text-white/45">{new Date(s.lastViewedAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}</span>
                    </li>
                  ))}
                </ul>
              ) : null}
              {recent.length ? (
                <p className="mt-3 text-xs text-white/45">A view means a program looked, not an offer. A short note to the coach works; chasing doesn&apos;t.</p>
              ) : cc.premium ? (
                <p className="mt-2 text-sm text-white/55">No college program has viewed the profile yet.</p>
              ) : (
                <p className="mt-2 text-sm text-white/55">
                  {views.reduce((n, v) => n + (v?.totalViews ?? 0), 0)} views by college coaches.{" "}
                  <a href="/blue" className="ncu-only font-semibold underline" style={{ color: GOLD }}>Blue shows which programs</a>
                  <span className="guild-only">Program names: coming soon.</span>
                </p>
              )}
            </section>

            <a href="/recruiting/learn/timeline" className="flex items-center gap-3 rounded-2xl border border-[#D3B574]/50 bg-[#D3B574]/[0.08] p-5 hover:bg-[#D3B574]/[0.12]">
              <BarChart3 className="h-7 w-7 shrink-0" style={{ color: GOLD }} aria-hidden />
              <span className="flex-1">
                <span className="block text-base font-bold" style={{ color: GOLD }}>Keep building momentum</span>
                <span className="block text-sm text-white/65">Keep results current and answer coaches within a day.</span>
              </span>
              <ArrowRight className="h-5 w-5 text-white/50" aria-hidden />
            </a>
          </div>
        </div>
      </div>
    </PortalShell>
  )
}
