"use client"

import { BoardSwitch } from "@/components/recruiting/board-switch"
import type { CoachProgram, ViewGender } from "@/lib/recruiting/coach-program"
import { useMemo, useState } from "react"
import Link from "next/link"
import { CoachTabs } from "@/components/coach-tabs"
import { RECRUITING_BRAND, recruitingCoverage } from "@/lib/recruiting/brand"
import { FitBadge, type FitBadgeFlag } from "@/components/fit-badge"
import { StaffActivityList } from "@/components/recruiting/staff-activity-list"
import type { StaffActivityItem } from "@/lib/recruiting/staff-activity"
import type { EventWithRecruits } from "@/lib/college-programs/competing-next"
import { eventDates } from "@/lib/college-programs/outreach-results"
import { ArrowRight, BarChart3, CalendarDays, History, FileText, GitCompareArrows, Lock, MessageSquare, Search, Star, Target, Users } from "lucide-react"

export type CoachHomeData = {
  coachName: string | null
  /** Staff looking at the page: they read conversations but do not start them. */
  isAdmin: boolean
  program: string | null
  programLogo: string | null
  schoolId: string | null
  athletes: Array<{ id: string; name: string; highschool: string | null; graduationyear: number | null; weightclass: string | null }>
  recruits: {
    /** False when the board could not be read - shown as "could not load", never as an empty board. */
    loaded: boolean
    total: number
    latest: Array<{ id: string; name: string; classYear: number | null; weight: string | null; highSchool: string | null; lastCompeted: string | null; fit: FitBadgeFlag | null }>
    competedRecently: Array<{ id: string; name: string; label: string; event: string | null }>
  }
  messages: {
    loaded: boolean
    canStart: boolean
    unread: number
    latest: Array<{ id: string; athleteName: string; preview: string; unread: boolean; yourTurn: boolean }>
  }
  /**
   * Where the board's wrestlers are competing next, grouped by event, as their families entered it.
   * Empty for a coach staff have not approved yet: a minor's schedule is for reviewed coaches only.
   */
  competingNext: EventWithRecruits[]
  /** Top-ranked uncommitted wrestlers not on the board yet, to star from here. */
  suggested: Array<{ id: string; name: string; classYear: number; rank: number; weight: string | null; highSchool: string | null }>
  /** The latest changes on the staff's shared board, and who made them. */
  activity: StaffActivityItem[]
  rankingYears: number[]
  top75: boolean
  /** Which board this home was built from, and the program the coach gave at sign-up (null: never asked). */
  viewGender: ViewGender
  coachProgram: CoachProgram | null
}

const GOLD = "text-[#D3B574]"
const PANEL = "rounded-xl border border-white/10 bg-[#0f1c2e]"
const TITLE = "flex items-center gap-2 text-[11px] font-black uppercase tracking-widest text-white/40"
const ROW = "flex items-center justify-between gap-3 rounded-lg px-3 py-2.5 text-sm text-white/80 hover:bg-white/[0.05] hover:text-white"
const MORE = `inline-flex items-center gap-1 text-xs font-bold ${GOLD} hover:underline`

function AccessPanel({ signedOut }: { signedOut: boolean }) {
  return (
    <main className="min-h-screen bg-[#0A1628] px-4 py-16 text-white">
      <div className={`${PANEL} mx-auto max-w-xl border-[#D3B574]/30 p-6 text-center sm:p-8`}>
        <div className="mx-auto mb-4 inline-flex rounded-full bg-[#D3B574]/10 p-3">
          <Lock className={`h-6 w-6 ${GOLD}`} />
        </div>
        <h1 className="text-xl font-black">{signedOut ? "Sign in to your Coach Home" : "Coach Home is for college coaches"}</h1>
        <p className="mx-auto mt-2 max-w-md text-sm text-white/60">
          Rankings, profiles, scouting reports, the comparison, your recruits and your messages in one place. Free for
          verified college coaching staff.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          {signedOut ? (
            <Link href="/auth/signin?returnTo=%2Fcoach-home" className="rounded-lg bg-[#D3B574] px-5 py-2.5 text-sm font-bold text-[#0A1628] hover:bg-[#c4a665]">
              Sign in
            </Link>
          ) : null}
          <Link
            href="/auth/signup?type=college-coach&returnTo=%2Fcoach-home"
            className="rounded-lg border border-white/20 px-5 py-2.5 text-sm font-bold text-white hover:border-[#D3B574] hover:text-[#D3B574]"
          >
            College coach sign-up
          </Link>
        </div>
      </div>
    </main>
  )
}

/**
 * The My Recruits card on Coach Home, as two tabs (Matt, 12 October 2026): "Your recruits" is the
 * coach's own board and nothing else; "Top uncommitted" is a list to pick from. They are kept
 * apart so a suggestion is never mistaken for someone already on the board - nothing reaches a
 * board until the coach stars him.
 *
 * A coach with an empty board opens on the suggestions, because that is where the first action is.
 */
/** The coach's own board: his starred wrestlers and nothing else. */
function RecruitsCard({ total, children }: { total: number; children: React.ReactNode }) {
  return (
    <section className={`${PANEL} p-4 sm:p-5`} aria-labelledby="ch-recruits">
      <div className="flex items-center justify-between gap-3">
        <h2 id="ch-recruits" className={TITLE}>
          <Star className={`h-3.5 w-3.5 ${GOLD}`} /> Your recruits{total ? ` (${total})` : ""}
        </h2>
        <Link href="/my-recruits" className={MORE}>
          Open board <ArrowRight className="h-3 w-3" />
        </Link>
      </div>
      {children}
    </section>
  )
}

/**
 * Top uncommitted, on its own and always open: the ranked wrestlers in the two classes a coach is
 * recruiting, side by side, every name a link to the profile (Matt, 14 October 2026).
 *
 * It was a second tab inside My Recruits. In its first two days coaches loaded Coach Home eight
 * times and opened eight profiles - three from the rankings, four from the athlete list, none from
 * here. A list a coach can see is a list he clicks.
 */
function TopUncommitted({ wrestlers, poolSize }: { wrestlers: CoachHomeData["suggested"]; poolSize: number }) {
  const years = [...new Set(wrestlers.map((w) => w.classYear))].sort((x, y) => x - y)
  return (
    <section className={`${PANEL} mt-4 p-4 sm:p-5`} aria-labelledby="ch-top">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 id="ch-top" className={TITLE}>
          <BarChart3 className={`h-3.5 w-3.5 ${GOLD}`} /> Top uncommitted · Classes of {years.join(" and ")}
        </h2>
        <Link href="/prospects/all" className={MORE}>
          All {poolSize.toLocaleString()} athletes <ArrowRight className="h-3 w-3" />
        </Link>
      </div>
      <p className="mt-2 text-sm text-white/55">
        Ranked and not yet committed. Tap a name to open the profile; tap <Star className={`mx-0.5 inline h-3.5 w-3.5 ${GOLD}`} aria-label="the star" /> to add him to your recruits.
      </p>
      <div className="mt-2 grid gap-x-6 md:grid-cols-2">
        {years.map((year) => (
          <div key={year}>
            <div className="mt-3 flex items-center justify-between gap-2 border-b border-white/10 pb-1">
              <p className="text-xs font-black uppercase tracking-widest text-white/70">Class of {year}</p>
              <Link href={`/public-rankings/${year}`} className={MORE}>
                Full {year} rankings <ArrowRight className="h-3 w-3" />
              </Link>
            </div>
            <SuggestedList wrestlers={wrestlers.filter((w) => w.classYear === year)} />
          </div>
        ))}
      </div>
    </section>
  )
}

/** Ranked, uncommitted wrestlers who are not on the board. A star adds one; nothing is added otherwise. */
function SuggestedList({ wrestlers }: { wrestlers: CoachHomeData["suggested"] }) {
  const [starred, setStarred] = useState<Set<string>>(new Set())
  const [busy, setBusy] = useState<string | null>(null)
  const star = async (id: string) => {
    if (busy || starred.has(id)) return
    setBusy(id)
    try {
      const res = await fetch("/api/coach-portal/star", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ athleteId: id, action: "add" }),
      })
      if (res.ok) setStarred((prev) => new Set(prev).add(id))
    } finally {
      setBusy(null)
    }
  }
  return (
    <>
      <ul className="mt-2">
        {wrestlers.map((w) => {
          const on = starred.has(w.id)
          return (
            <li key={w.id} className="flex items-center gap-3 border-b border-white/5 py-2 last:border-0">
              <button
                type="button"
                onClick={() => star(w.id)}
                disabled={busy === w.id || on}
                aria-pressed={on}
                aria-label={on ? `${w.name} is on your recruits` : `Add ${w.name} to your recruits`}
                title={on ? "On your recruits" : "Add to your recruits"}
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border border-[#D3B574]/40 hover:bg-[#D3B574]/10 disabled:opacity-100"
              >
                <Star className={`h-5 w-5 ${GOLD} ${on ? "fill-[#D3B574]" : ""}`} />
              </button>
              <Link href={`/athletes/${w.id}`} className="min-w-0 flex-1 hover:text-white">
                <span className="block truncate font-bold text-white">
                  <span className={`mr-1.5 ${GOLD}`}>#{w.rank}</span>
                  {w.name}
                </span>
                <span className="block truncate text-xs text-white/45">
                  {[`Class of ${w.classYear}`, w.weight ? `${w.weight} lbs` : null, w.highSchool].filter(Boolean).join(" · ")}
                </span>
              </Link>
              {on ? <span className={`shrink-0 text-xs font-bold ${GOLD}`}>Added</span> : null}
            </li>
          )
        })}
      </ul>
    </>
  )
}

function WrestlerSearch({ athletes }: { athletes: CoachHomeData["athletes"] }) {
  const [query, setQuery] = useState("")
  const matches = useMemo(() => {
    const words = query.trim().toLowerCase().split(/\s+/).filter(Boolean)
    if (!words.length) return []
    return athletes
      .filter((a) => {
        const hay = `${a.name} ${a.highschool ?? ""}`.toLowerCase()
        return words.every((w) => hay.includes(w))
      })
      .slice(0, 8)
  }, [athletes, query])
  return (
    <div className={`${PANEL} p-4 sm:p-5`}>
      <label htmlFor="coach-search" className={TITLE}>
        <Search className={`h-3.5 w-3.5 ${GOLD}`} /> Find a wrestler
      </label>
      <input
        id="coach-search"
        type="search"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Name or high school"
        autoComplete="off"
        className="mt-3 w-full rounded-lg border border-white/15 bg-[#0A1628] px-4 py-3 text-base text-white placeholder:text-white/30 focus:border-[#D3B574] focus:outline-none"
      />
      {query.trim() ? (
        matches.length ? (
          <ul className="mt-2 divide-y divide-white/5">
            {matches.map((a) => (
              <li key={a.id} className="flex items-center justify-between gap-3 py-2">
                <Link href={`/athletes/${a.id}`} className="min-w-0 flex-1 text-sm text-white hover:text-[#D3B574]">
                  <span className="font-bold">{a.name}</span>
                  <span className="block truncate text-xs text-white/50">
                    {[a.graduationyear ? `Class of ${a.graduationyear}` : null, a.weightclass ? `${a.weightclass} lbs` : null, a.highschool].filter(Boolean).join(" · ")}
                  </span>
                </Link>
                <Link href={`/compare?left=${a.id}&src=coach-home`} className="shrink-0 rounded-md border border-white/15 px-2.5 py-1.5 text-xs font-bold text-white/70 hover:border-[#D3B574] hover:text-[#D3B574]">
                  Compare
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-3 text-sm text-white/50">
            No {recruitingCoverage()} wrestler in the current classes matches that.{" "}
            <Link href="/prospects/all" className={`${GOLD} hover:underline`}>
              Browse all profiles
            </Link>
          </p>
        )
      ) : (
        <p className="mt-2 text-xs text-white/40">{athletes.length.toLocaleString()} {recruitingCoverage()} wrestlers in the current classes.</p>
      )}
    </div>
  )
}

function Tool({ href, icon: Icon, title, body }: { href: string; icon: typeof Search; title: string; body: string }) {
  return (
    <Link href={href} className={`${PANEL} group flex items-start gap-3 p-4 transition-colors hover:border-[#D3B574]/50`}>
      <span className="mt-0.5 rounded-lg bg-[#D3B574]/10 p-2">
        <Icon className={`h-4 w-4 ${GOLD}`} />
      </span>
      <span className="min-w-0">
        <span className="flex items-center gap-1 text-sm font-black text-white group-hover:text-[#D3B574]">
          {title} <ArrowRight className="h-3.5 w-3.5 opacity-0 transition-opacity group-hover:opacity-100" />
        </span>
        <span className="mt-0.5 block text-xs leading-snug text-white/55">{body}</span>
      </span>
    </Link>
  )
}

export default function CoachHomeClient({ access, data }: { access: "ok" | "signed-out" | "not-coach"; data: CoachHomeData | null }) {
  if (access !== "ok" || !data) return <AccessPanel signedOut={access === "signed-out"} />
  const { recruits, messages } = data
  const hasWork = recruits.total > 0 || messages.unread > 0 || messages.latest.length > 0
  const womens = data.viewGender === "Female"
  const profilesHref = womens ? "/prospects/all?gender=female" : "/prospects/all"
  return (
    <main className="min-h-screen bg-[#0A1628] text-white">
      <div className="mx-auto max-w-5xl px-4 py-6 sm:py-8">
        <CoachTabs active="home" className="mb-6" />
        <header className="flex items-center gap-4">
          {data.programLogo ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={data.programLogo}
              alt={data.program ? `${data.program} logo` : "Program logo"}
              className="h-16 w-16 shrink-0 rounded-xl bg-white object-contain p-1.5 sm:h-20 sm:w-20"
            />
          ) : null}
          <div className="min-w-0 flex-1">
            <p className={`text-[11px] font-black uppercase tracking-widest ${GOLD}`}>{RECRUITING_BRAND.name} · Coach Home</p>
            <h1 className="mt-1 text-3xl font-black tracking-tight sm:text-4xl">{data.coachName ? `Welcome, Coach ${data.coachName}` : "Welcome, Coach"}</h1>
            <p className="mt-1 text-sm text-white/55">
              {data.program ? `${data.program} · ` : ""}Everything you use to recruit {recruitingCoverage()}, in one place.
            </p>
          </div>
          <BoardSwitch value={data.viewGender} className="hidden shrink-0 self-start sm:inline-flex" />
        </header>
        <BoardSwitch value={data.viewGender} className="mt-4 sm:hidden" />

        <div className="mt-6">
          <WrestlerSearch athletes={data.athletes} />
        </div>

        {/*
         * A coach with recruits on the board or messages waiting comes back to that work, so it leads
         * and the top uncommitted list follows. A coach with an empty board has no work yet, so the
         * list of who to look at leads (Matt, 14 October 2026). In the two weeks before, 26 of 93
         * coaches had starred anyone.
         */}
        {data.suggested?.length && !hasWork ? <TopUncommitted wrestlers={data.suggested} poolSize={data.athletes.length} /> : null}

        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <RecruitsCard total={recruits.total}>
            {!recruits.loaded ? (
              <p className="mt-4 text-sm text-white/55">Your board could not be loaded just now. Open it directly to try again.</p>
            ) : recruits.total === 0 ? (
              <div className="mt-4 rounded-lg border border-dashed border-white/15 p-4">
                <p className="text-base font-bold text-white">Start your recruiting board</p>
                <p className="mt-1 text-sm text-white/60">
                  Tap the <Star className={`mx-0.5 inline h-3.5 w-3.5 ${GOLD}`} aria-label="star" /> on any wrestler&apos;s profile to add him to My Recruits. From
                  there you track his stage, log calls and texts, and message him. Your staff shares one board.
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <Link href="/prospects/all" className="rounded-lg bg-[#D3B574] px-4 py-2 text-sm font-bold text-[#0A1628] hover:bg-[#e2c98d]">
                    Browse athletes
                  </Link>
                  <Link href="/public-rankings" className="rounded-lg border border-white/20 px-4 py-2 text-sm font-bold text-white hover:border-[#D3B574] hover:text-[#D3B574]">
                    Open rankings
                  </Link>
                </div>
              </div>
            ) : (
              <>
                <p className="mt-3 text-3xl font-black">
                  {recruits.total} <span className="text-sm font-medium text-white/50">{recruits.total === 1 ? "wrestler" : "wrestlers"} on your board</span>
                </p>
                <ul className="mt-2">
                  {recruits.latest.map((r) => (
                    <li key={r.id}>
                      <Link href={`/athletes/${r.id}`} className={ROW}>
                        <span className="min-w-0">
                          <span className="font-bold text-white">{r.name}</span>
                          <span className="block truncate text-xs text-white/45">
                            {[r.classYear ? `’${String(r.classYear).slice(-2)}` : null, r.weight ? `${r.weight} lbs` : null, r.highSchool].filter(Boolean).join(" · ")}
                          </span>
                          {r.fit ? <FitBadge flag={r.fit} className="mt-1" /> : null}
                        </span>
                        {r.lastCompeted ? <span className="shrink-0 text-xs text-white/40">{r.lastCompeted}</span> : null}
                      </Link>
                    </li>
                  ))}
                </ul>
              </>
            )}
          </RecruitsCard>

          <section className={`${PANEL} p-4 sm:p-5`} aria-labelledby="ch-messages">
            <div className="flex items-center justify-between gap-3">
              <h2 id="ch-messages" className={TITLE}>
                <MessageSquare className={`h-3.5 w-3.5 ${GOLD}`} /> Messages
                {messages.unread > 0 ? <span className="rounded-full bg-[#B31B1B] px-2 py-0.5 text-[10px] font-black text-white">{messages.unread} unread</span> : null}
              </h2>
              <Link href="/inbox" className={MORE}>
                Open inbox <ArrowRight className="h-3 w-3" />
              </Link>
            </div>
            {!messages.loaded ? (
              <p className="mt-4 text-sm text-white/55">Your messages could not be loaded just now. Open the inbox to try again.</p>
            ) : messages.latest.length === 0 ? (
              <p className="mt-4 text-sm text-white/55">
                {messages.canStart
                  ? "No conversations yet. Open a wrestler's profile, or your board, and choose Message; the family replies here and parents see every message."
                  : data.isAdmin
                    ? "No conversations yet. Coaches start them from a wrestler's profile or their board."
                    : "No conversations yet. Messaging a wrestler opens once your coaching account has been reviewed."}
              </p>
            ) : (
              <ul className="mt-3">
                {messages.latest.map((t) => (
                  <li key={t.id}>
                    <Link href={`/inbox/${t.id}`} className={ROW}>
                      <span className="min-w-0">
                        <span className={`font-bold ${t.unread ? "text-white" : "text-white/80"}`}>{t.athleteName}</span>
                        <span className="block truncate text-xs text-white/45">{t.preview}</span>
                      </span>
                      {t.unread ? (
                        <span className={`shrink-0 text-[10px] font-black uppercase ${GOLD}`}>New</span>
                      ) : t.yourTurn ? (
                        <span className="shrink-0 text-[10px] font-black uppercase text-white/40">Your turn</span>
                      ) : null}
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>

        {data.suggested?.length && hasWork ? <TopUncommitted wrestlers={data.suggested} poolSize={data.athletes.length} /> : null}

        {(data.competingNext ?? []).length ? (
          <section className={`${PANEL} mt-4 p-4 sm:p-5`} aria-labelledby="ch-next">
            <h2 id="ch-next" className={TITLE}>
              <CalendarDays className={`h-3.5 w-3.5 ${GOLD}`} /> Where your recruits are competing next
            </h2>
            <ul className="mt-2 space-y-3">
              {(data.competingNext ?? []).map((event) => (
                <li key={`${event.title}-${event.startDate}`}>
                  <p className="px-3 text-sm font-bold text-white">
                    {event.title}
                    <span className="font-normal text-white/50">
                      {" "}
                      · {eventDates(event.startDate, event.endDate)}
                      {event.location ? ` · ${event.location}` : ""}
                    </span>
                    <span className={`ml-2 text-xs font-bold ${GOLD}`}>
                      {event.recruits.length} {event.recruits.length === 1 ? "recruit" : "recruits"}
                    </span>
                  </p>
                  <ul className="grid gap-x-4 sm:grid-cols-2">
                    {event.recruits.map((r) => (
                      <li key={r.id}>
                        <Link href={`/athletes/${r.id}`} className={ROW}>
                          <span className="min-w-0 truncate font-bold text-white">{r.name}</span>
                          <span className="shrink-0 text-xs text-white/45">
                            {[r.classYear ? `\u2019${String(r.classYear).slice(-2)}` : null, r.weight ? `${r.weight} lbs` : null, r.highSchool].filter(Boolean).join(" · ")}
                          </span>
                        </Link>
                      </li>
                    ))}
                  </ul>
                </li>
              ))}
            </ul>
            <p className="mt-2 px-3 text-xs text-white/35">Entered by each wrestler&apos;s family.</p>
          </section>
        ) : null}

        {recruits.competedRecently.length ? (
          <section className={`${PANEL} mt-4 p-4 sm:p-5`} aria-labelledby="ch-new">
            <h2 id="ch-new" className={TITLE}>
              <Users className={`h-3.5 w-3.5 ${GOLD}`} /> Your recruits who competed in the last 30 days
            </h2>
            <ul className="mt-2 grid gap-x-4 sm:grid-cols-2">
              {recruits.competedRecently.map((r) => (
                <li key={r.id}>
                  <Link href={`/athletes/${r.id}`} className={ROW}>
                    <span className="min-w-0">
                      <span className="font-bold text-white">{r.name}</span>
                      {r.event ? <span className="block truncate text-xs text-white/45">{r.event}</span> : null}
                    </span>
                    <span className="shrink-0 text-xs text-white/40">{r.label}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        <section className={`${PANEL} mt-4 p-4 sm:p-5`} aria-labelledby="ch-activity">
          <div className="flex items-center justify-between gap-3">
            <h2 id="ch-activity" className={TITLE}>
              <History className={`h-3.5 w-3.5 ${GOLD}`} /> Staff activity
            </h2>
            {(data.activity ?? []).length ? (
              <Link href="/my-recruits/activity" className={MORE}>
                See all <ArrowRight className="h-3 w-3" />
              </Link>
            ) : null}
          </div>
          {(data.activity ?? []).length ? (
            <StaffActivityList items={data.activity} className="mt-2" />
          ) : (
            <p className="mt-3 text-sm text-white/55">
              Nothing yet. Every wrestler added, stage change, logged call and message by you or your staff is listed here, with who did it.
            </p>
          )}
        </section>

        <h2 className={`${TITLE} mt-8`}>Tools</h2>
        <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <Tool href="/compare?src=coach-home" icon={GitCompareArrows} title="Compare two wrestlers" body="Head to head, common opponents, national results and our read on who fits." />
          <Tool href="/perfect-recruit" icon={Target} title="Your perfect recruit" body="Set the weights, classes and grades you need once; every wrestler is flagged against it." />
          <Tool href="/prospects/all" icon={FileText} title="Scouting reports" body="Open any profile and choose Scouting Report. Free for college coaches." />
        </div>

        <h2 className={`${TITLE} mt-8`}>Rankings and profiles</h2>
        <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {/* The Top 75 is a men's board; the women's side lists its own classes and nothing else. */}
          {data.top75 && !womens ? (
            <Tool href="/public-rankings/college-prospects" icon={BarChart3} title="Top 75 College Ready Prospects" body="The deeper board across the classes you can recruit now." />
          ) : null}
          {data.rankingYears.map((year) => (
            <Tool
              key={year}
              href={womens ? `/public-rankings/women/${year}` : `/public-rankings/${year}`}
              icon={BarChart3}
              title={`${womens ? "Women's " : ""}Class of ${year} rankings`}
              body="The published class board, updated through the season."
            />
          ))}
          <Tool
            href={profilesHref}
            icon={Users}
            title={womens ? "All women's profiles" : "All athlete profiles"}
            body={`Every ${recruitingCoverage()} ${womens ? "women's " : ""}profile, with filters for class, weight and last competed.`}
          />
          <Tool href="/athletes" icon={Users} title="College commitments" body="Who has committed where, this class and last." />
        </div>

        <p className="mt-10 text-center text-xs text-white/35">
          Something missing from this page?{" "}
          <Link href="/contact" className="underline hover:text-white/60">
            Tell us
          </Link>
          .
        </p>
      </div>
    </main>
  )
}
