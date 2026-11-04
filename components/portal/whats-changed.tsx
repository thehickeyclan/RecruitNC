"use client"

import { useState } from "react"
import { ArrowRight, CalendarDays, Eye, Info, MailOpen, MessageSquare, Scale } from "lucide-react"

import type { Feed } from "@/lib/recruiting/whats-changed"

/**
 * "What changed for you" (Matt, 2 Nov 2026): five numbers, each opening its list on a tap, and
 * the next two moves. Built in lib/recruiting/whats-changed.ts; nothing here decides anything.
 */
type TileKey = "viewed" | "needs" | "contact" | "messages" | "coming"

const levelChip = (level: string | null, colors: Record<string, string>) =>
  level ? (
    <span className="shrink-0 rounded px-1 text-[10px] font-black text-[#071427]" style={{ backgroundColor: colors[level] ?? "#94a3b8" }}>
      {level}
    </span>
  ) : null

const day = (d: string) => new Date(`${d.slice(0, 10)}T12:00:00Z`).toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" })

export function WhatsChanged({ feed, firstName, weight, levelColors }: { feed: Feed; firstName: string; weight: number | null; levelColors: Record<string, string> }) {
  const [open, setOpen] = useState<TileKey | null>(null)
  const [why, setWhy] = useState(false)
  const span = feed.window === "week" ? "this week" : "this month"
  const coming = feed.visits.length + feed.reminders.length
  const confirmed = feed.needs.some((n) => n.source === "coach")
  const tiles: Array<{ key: TileKey; n: number; label: string; icon: typeof Eye; hidden?: boolean }> = [
    { key: "viewed", n: feed.viewed.length, label: `Programs viewed ${span}`, icon: Eye },
    { key: "needs", n: feed.needs.length, label: weight ? `On your list may need ${weight}` : "Weight not on record yet", icon: Scale },
    { key: "contact", n: feed.notContacted.length, label: "On your list, coach not emailed", icon: MailOpen },
    { key: "messages", n: feed.threads.length, label: feed.threads.length === 1 ? "Coach message waiting" : "Coach messages waiting", icon: MessageSquare },
    { key: "coming", n: coming, label: "Visits and reminders soon", icon: CalendarDays },
  ]

  return (
    <section aria-labelledby="cc-changed" className="mt-6 rounded-xl border border-[#D3B574]/40 bg-[#0f1c2e] p-5" data-tour="changed">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 id="cc-changed" className="text-lg font-black text-white sm:text-xl">
          What changed for {firstName}
        </h2>
        <span className="text-xs font-bold text-white/50">{feed.window === "week" ? "Last 7 days" : "Last 30 days"}</span>
      </div>

      <ul className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
        {tiles.map(({ key, n, label, icon: Icon }) => (
          <li key={key}>
            <button
              type="button"
              onClick={() => setOpen(open === key ? null : key)}
              aria-expanded={open === key}
              className={`flex h-full w-full flex-col rounded-lg border p-3 text-left ${open === key ? "border-[#D3B574] bg-[#D3B574]/10" : "border-white/10 bg-white/[0.03] hover:border-[#D3B574]/60"}`}
            >
              <span className="flex items-center justify-between">
                <span className="text-3xl font-black text-white">{n}</span>
                <Icon className="h-5 w-5 text-[#D3B574]" aria-hidden />
              </span>
              <span className="mt-1 text-xs leading-4 text-white/70">{label}</span>
            </button>
          </li>
        ))}
      </ul>

      {open ? (
        <div className="mt-3 rounded-lg border border-white/10 bg-white/[0.03] p-3">
          {open === "viewed" ? (
            feed.viewed.length ? (
              <ul className="divide-y divide-white/5">
                {feed.viewed.map((v) => (
                  <li key={v.schoolId ?? v.school} className="flex items-center gap-2 py-2 text-sm">
                    {levelChip(v.level, levelColors)}
                    <span className="min-w-0 flex-1 truncate font-bold text-white">{v.school}</span>
                    {v.onList ? <span className="shrink-0 rounded-full bg-emerald-500/20 px-2 py-0.5 text-[10px] font-black uppercase text-emerald-200">On your list</span> : null}
                    <span className="shrink-0 text-xs text-white/45">{day(v.lastAt)}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-white/60">No college program viewed {firstName}&apos;s profile in the last 30 days. A new result or the next event on the schedule brings coaches back.</p>
            )
          ) : null}

          {open === "needs" ? (
            <>
              {feed.needs.length ? (
                <ul className="divide-y divide-white/5">
                  {feed.needs.map((n) => (
                    <li key={n.schoolId} className="py-2 text-sm">
                      <span className="flex items-center gap-2">
                        {levelChip(n.level, levelColors)}
                        <span className="min-w-0 flex-1 truncate font-bold text-white">{n.name}</span>
                        <span
                          className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-black uppercase ${n.source === "coach" ? "bg-emerald-500/20 text-emerald-200" : "border border-white/25 text-white/70"}`}
                        >
                          {n.source === "coach" ? "Coach-confirmed" : "Inferred"}
                        </span>
                      </span>
                      <span className="mt-0.5 block text-xs text-white/55">{n.line}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-white/60">
                  {weight ? `No college on your list shows room at ${weight} on its roster yet.` : `No result records ${firstName}'s weight yet. It fills in after the next tournament.`}
                </p>
              )}
              <button type="button" onClick={() => setWhy(!why)} className="mt-2 inline-flex items-center gap-1 text-xs font-bold text-[#D3B574]" aria-expanded={why}>
                <Info className="h-3.5 w-3.5" aria-hidden /> How this is worked out
              </button>
              {why ? (
                <p className="mt-1 text-xs text-white/55">
                  {confirmed ? "Coach-confirmed: the college's coach posted this weight. " : ""}
                  Inferred: from the college&apos;s published roster, at the college weights nearest {firstName}&apos;s last competed weight, counting who will have finished by the fall {firstName}
                  would arrive. It is a direction, not an opening or a scholarship. Redshirts, transfers and each coach&apos;s own recruiting change every room.
                </p>
              ) : null}
            </>
          ) : null}

          {open === "contact" ? (
            feed.notContacted.length ? (
              <ul className="divide-y divide-white/5">
                {feed.notContacted.slice(0, 8).map((s) => (
                  <li key={s.id} className="flex items-center gap-2 py-2 text-sm">
                    {levelChip(s.level, levelColors)}
                    <span className="min-w-0 flex-1 truncate font-bold text-white">{s.name}</span>
                    <a href={`/my-recruiting/colleges?email=${encodeURIComponent(s.id)}`} className="shrink-0 text-xs font-bold text-[#D3B574] hover:underline">
                      Email →
                    </a>
                  </li>
                ))}
                {feed.notContacted.length > 8 ? (
                  <li className="pt-2 text-xs">
                    <a href="/my-recruiting/reach-out" className="font-bold text-[#D3B574] hover:underline">
                      All {feed.notContacted.length} on the reach-out checklist →
                    </a>
                  </li>
                ) : null}
              </ul>
            ) : (
              <p className="text-sm text-white/60">Every college on your list has an email from you.</p>
            )
          ) : null}

          {open === "messages" ? (
            feed.threads.length ? (
              <ul className="divide-y divide-white/5">
                {feed.threads.map((t) => (
                  <li key={t.id} className="flex items-center gap-2 py-2 text-sm">
                    <span className="min-w-0 flex-1 truncate font-bold text-white">{t.program ?? "A college coach"}</span>
                    <a href={`/inbox/${t.id}`} className="shrink-0 text-xs font-bold text-[#D3B574] hover:underline">
                      Reply →
                    </a>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-white/60">No coach is waiting on a reply.</p>
            )
          ) : null}

          {open === "coming" ? (
            coming ? (
              <ul className="divide-y divide-white/5">
                {feed.visits.map((v) => (
                  <li key={v.id} className="flex items-center gap-2 py-2 text-sm">
                    <span className="min-w-0 flex-1 truncate font-bold text-white">{v.schoolName}</span>
                    <span className="shrink-0 text-xs text-white/55">
                      {v.needsConfirm ? "Did it happen?" : `${v.kind === "official" ? "Official" : "Unofficial"} visit · ${day(v.startsOn)}`}
                    </span>
                  </li>
                ))}
                {feed.reminders.map((r) => (
                  <li key={r.id} className="flex items-center gap-2 py-2 text-sm">
                    <span className="min-w-0 flex-1 truncate text-white/85">{r.note}</span>
                    <span className="shrink-0 text-xs text-white/55">{day(r.remindAt)}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-white/60">No visit in the next 30 days and no reminder this week.</p>
            )
          ) : null}
        </div>
      ) : null}

      <NextMoves actions={feed.actions} title="Your next two moves" />
    </section>
  )
}

export function NextMoves({ actions, title }: { actions: Array<{ key: string; label: string; why: string; href: string }>; title: string }) {
  return (
    <>
      <h3 className="mt-5 text-sm font-black uppercase tracking-wider text-white/70">{title}</h3>
      <ol className={`mt-2 grid gap-2 ${actions.length > 2 ? "sm:grid-cols-3" : "sm:grid-cols-2"}`}>
        {actions.map((a, i) => (
          <li key={a.key}>
            <a href={a.href} className="flex h-full items-start gap-3 rounded-lg border border-white/10 bg-white/[0.03] p-3 hover:border-[#D3B574]">
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#D3B574] text-sm font-black text-[#0A1628]">{i + 1}</span>
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-bold text-white">{a.label}</span>
                <span className="block text-xs text-white/55">{a.why}</span>
              </span>
              <ArrowRight className="mt-1 h-4 w-4 shrink-0 text-[#D3B574]" aria-hidden />
            </a>
          </li>
        ))}
      </ol>
    </>
  )
}
