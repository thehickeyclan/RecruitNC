"use client"

import { useMemo, useState } from "react"
import Link from "next/link"
import { ArrowRight, BarChart3, FileText, GitCompareArrows, Lock, MessageSquare, Search, Star, Target, Users } from "lucide-react"

export type CoachHomeData = {
  coachName: string | null
  /** Staff looking at the page: they read conversations but do not start them. */
  isAdmin: boolean
  program: string | null
  schoolId: string | null
  athletes: Array<{ id: string; name: string; highschool: string | null; graduationyear: number | null; weightclass: string | null }>
  recruits: {
    /** False when the board could not be read - shown as "could not load", never as an empty board. */
    loaded: boolean
    total: number
    latest: Array<{ id: string; name: string; classYear: number | null; weight: string | null; highSchool: string | null; lastCompeted: string | null }>
    competedRecently: Array<{ id: string; name: string; label: string; event: string | null }>
  }
  messages: {
    loaded: boolean
    canStart: boolean
    unread: number
    latest: Array<{ id: string; athleteName: string; preview: string; unread: boolean; yourTurn: boolean }>
  }
  rankingYears: number[]
  top75: boolean
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
            No North Carolina wrestler in the current classes matches that.{" "}
            <Link href="/prospects/all" className={`${GOLD} hover:underline`}>
              Browse all profiles
            </Link>
          </p>
        )
      ) : (
        <p className="mt-2 text-xs text-white/40">{athletes.length.toLocaleString()} North Carolina wrestlers in the current classes.</p>
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
  return (
    <main className="min-h-screen bg-[#0A1628] text-white">
      <div className="mx-auto max-w-5xl px-4 py-8 sm:py-10">
        <header>
          <p className={`text-[11px] font-black uppercase tracking-widest ${GOLD}`}>RecruitNC · Coach Home</p>
          <h1 className="mt-1 text-3xl font-black tracking-tight sm:text-4xl">{data.coachName ? `Welcome, Coach ${data.coachName}` : "Welcome, Coach"}</h1>
          <p className="mt-1 text-sm text-white/55">
            {data.program ? `${data.program} · ` : ""}Everything you use to recruit North Carolina, in one place.
          </p>
        </header>

        <div className="mt-6">
          <WrestlerSearch athletes={data.athletes} />
        </div>

        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <section className={`${PANEL} p-4 sm:p-5`} aria-labelledby="ch-recruits">
            <div className="flex items-center justify-between gap-3">
              <h2 id="ch-recruits" className={TITLE}>
                <Star className={`h-3.5 w-3.5 ${GOLD}`} /> My Recruits
              </h2>
              <Link href="/my-recruits" className={MORE}>
                Open board <ArrowRight className="h-3 w-3" />
              </Link>
            </div>
            {!recruits.loaded ? (
              <p className="mt-4 text-sm text-white/55">Your board could not be loaded just now. Open it directly to try again.</p>
            ) : recruits.total === 0 ? (
              <p className="mt-4 text-sm text-white/55">
                No one on your board yet. Open any wrestler&apos;s profile and choose <span className="font-bold text-white">Add to Watch List</span>; your staff shares one board.
              </p>
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
                        </span>
                        {r.lastCompeted ? <span className="shrink-0 text-xs text-white/40">{r.lastCompeted}</span> : null}
                      </Link>
                    </li>
                  ))}
                </ul>
              </>
            )}
            {data.schoolId ? (
              <Link href={`/schools/${data.schoolId}/portal`} className={`${MORE} mt-3`}>
                {data.program ? `${data.program} recruiting portal` : "Program recruiting portal"} <ArrowRight className="h-3 w-3" />
              </Link>
            ) : null}
          </section>

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

        <h2 className={`${TITLE} mt-8`}>Tools</h2>
        <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <Tool href="/compare?src=coach-home" icon={GitCompareArrows} title="Compare two wrestlers" body="Head to head, common opponents, national results and our read on who fits." />
          <Tool href="/compare?src=coach-home-fit#compare" icon={Target} title="Your perfect recruit" body="Tell us the weights, classes and grades you need; comparisons are checked against it." />
          <Tool href="/prospects/all" icon={FileText} title="Scouting reports" body="Open any profile and choose Scouting Report. Free for college coaches." />
        </div>

        <h2 className={`${TITLE} mt-8`}>Rankings and profiles</h2>
        <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {data.top75 ? (
            <Tool href="/public-rankings/college-prospects" icon={BarChart3} title="Top 75 College Ready Prospects" body="The deeper board across the classes you can recruit now." />
          ) : null}
          {data.rankingYears.map((year) => (
            <Tool key={year} href={`/public-rankings/${year}`} icon={BarChart3} title={`Class of ${year} rankings`} body="The published class board, updated through the season." />
          ))}
          <Tool href="/prospects/all" icon={Users} title="All athlete profiles" body="Every North Carolina profile, with filters for class, weight and last competed." />
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
