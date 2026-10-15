"use client"

import { useEffect, useState } from "react"

import { mostRecentGraduatedClassYear } from "@/lib/class-years"
import { rosterNameKey } from "@/lib/college-programs/roster-name"
import type { SchoolRosterView } from "@/lib/college-programs/rosters"
import type { WentHere } from "@/lib/college-programs/went-here"

type Response = { locked: false; roster: SchoolRosterView; wentHere: WentHere | null } | { locked: true } | { error: string }

const gpa = (n: number) => n.toFixed(2)

/**
 * "Where you stand" on a school's page: the North Carolina wrestlers on its roster now, the ones
 * committed and on their way, what they had won, and the family's own wrestler beside it.
 *
 * It sets the facts out. It never says whether he is good enough - that is the coach's call, on
 * things we cannot see.
 */
export function WentHereSection({ schoolId, schoolName, focus }: { schoolId: string; schoolName: string; focus?: "mens" | "womens" | null }) {
  const [data, setData] = useState<{ roster: SchoolRosterView; wentHere: WentHere | null } | null>(null)
  const [showAll, setShowAll] = useState(false)

  useEffect(() => {
    let cancelled = false
    setData(null)
    setShowAll(false)
    fetch(`/api/college-map/went-here?school=${encodeURIComponent(schoolId)}`, { cache: "no-store" })
      .then(async (res) => {
        if (!res.ok) return
        const body = (await res.json()) as Response
        // Locked or failed: the page simply has no such section.
        if (!cancelled && "locked" in body && body.locked === false) setData({ roster: body.roster, wentHere: body.wentHere })
      })
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [schoolId])

  if (!data) return null
  const { wentHere } = data
  // The family's own team first: a daughter is compared with the women on the roster, not the men.
  const theirWord = focus === "womens" ? "women's" : "men's"
  const roster = focus
    ? {
        ...data.roster,
        wrestlers: [...data.roster.wrestlers].sort((x, y) => Number(y.team === focus) - Number(x.team === focus)),
        teamLines: [...data.roster.teamLines].sort((x, y) => Number(y.includes(` ${theirWord} `)) - Number(x.includes(` ${theirWord} `))),
      }
    : data.roster

  // A commitment we hold results for, by name: so a wrestler on the roster carries what he won,
  // and is not then listed a second time as a commit.
  const commits = new Map((wentHere?.wrestlers ?? []).map((w) => [rosterNameKey(w.name), w]))
  const onRoster = new Set(roster.wrestlers.map((w) => rosterNameKey(w.name)))
  const offRoster = (wentHere?.wrestlers ?? []).filter((w) => !onRoster.has(rosterNameKey(w.name)))
  // Still in high school: on his way. Already graduated and not on the roster: he committed here
  // and is not listed now - a transfer, a redshirt the roster omits, or a roster we could not read.
  const graduated = mostRecentGraduatedClassYear()
  const arriving = offRoster.filter((w) => w.classYear != null && w.classYear > graduated)
  const notListed = offRoster.filter((w) => w.classYear == null || w.classYear <= graduated)
  const both = new Set(roster.wrestlers.map((w) => w.team)).size > 1
  const shown = showAll ? roster.wrestlers : roster.wrestlers.slice(0, 6)

  return (
    <div className="mt-4 space-y-6">
      {/* The family's own wrestler beside the people who went here: the comparison, first. */}
      {wentHere && (wentHere.yours.length > 0 || wentHere.schoolSentence || wentHere.level.sentence || wentHere.gpa) ? (
        <div className="grid gap-3 md:grid-cols-2">
          {wentHere.yours.map((y) => (
            <div key={y.firstName} className="rounded-xl border border-[#D3B574]/50 bg-[#D3B574]/[0.08] p-4">
              <p className="text-[10px] font-black uppercase tracking-widest text-[#D3B574]">{y.firstName} so far</p>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {y.results.length > 0 ? y.results.map((r) => <Chip key={r} text={r} gold />) : <span className="text-sm text-white/60">No state or national placing on our records yet</span>}
              </div>
              <p className="mt-3 text-sm">
                <span className="text-white/55">GPA </span>
                <b>{y.gpa != null ? gpa(y.gpa) : "not on the profile"}</b>
              </p>
            </div>
          ))}
          <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
            <p className="text-[10px] font-black uppercase tracking-widest text-white/50">
              {wentHere.schoolSentence ? `NC ${wentHere.among ?? "wrestlers"} who committed here` : `NC ${wentHere.among ?? "wrestlers"} who went ${wentHere.level.short}`}
            </p>
            <p className="mt-2 text-sm leading-6 text-white/85">{wentHere.schoolSentence ?? wentHere.level.sentence}</p>
            {wentHere.gpa ? (
              <p className="mt-3 flex items-baseline gap-2 text-sm">
                <span className="text-2xl font-black">{gpa(wentHere.gpa.average)}</span>
                <span className="text-white/55">
                  average GPA, {gpa(wentHere.gpa.low)}–{gpa(wentHere.gpa.high)} ({wentHere.gpa.count}, as reported)
                </span>
              </p>
            ) : null}
          </div>
        </div>
      ) : null}

      <div>
        <Heading text="On the roster now" count={roster.wrestlers.length} />
        {roster.wrestlers.length === 0 ? (
          roster.teamLines.map((line) => (
            <p key={line} className="mt-2 text-sm text-white/60">
              {line}
            </p>
          ))
        ) : (
          <>
            <ul className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {shown.map((w) => {
                const commit = commits.get(rosterNameKey(w.name))
                return (
                  <Card
                    key={`${w.team}-${w.name}`}
                    name={w.name}
                    href={commit ? `/view-profile?id=${commit.athleteId}` : null}
                    line={[w.class, w.weight ? `${w.weight} lbs` : null, both ? (w.team === "womens" ? "Women's" : "Men's") : null].filter(Boolean).join(" · ")}
                    place={[w.highSchool, w.hometown].filter(Boolean).join(" · ") || "Hometown not listed"}
                    results={commit?.results ?? []}
                  />
                )
              })}
            </ul>
            {!showAll && roster.wrestlers.length > shown.length ? (
              <button type="button" onClick={() => setShowAll(true)} className="mt-3 text-sm font-semibold text-[#F5D985] hover:underline">
                Show all {roster.wrestlers.length}
              </button>
            ) : null}
          </>
        )}
      </div>

      {arriving.length > 0 ? (
        <div>
          <Heading text="Committed, arriving" count={arriving.length} />
          <ul className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {arriving.map((w) => (
              <Card key={w.athleteId} name={w.name} href={`/view-profile?id=${w.athleteId}`} line={w.classYear ? `Class of ${w.classYear}` : ""} place={w.highSchool ?? ""} results={w.results} />
            ))}
          </ul>
        </div>
      ) : null}

      {notListed.length > 0 ? (
        <div>
          <Heading text="Committed here, not on the roster we read" count={notListed.length} />
          <ul className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {notListed.map((w) => (
              <Card key={w.athleteId} name={w.name} href={`/view-profile?id=${w.athleteId}`} line={w.classYear ? `Class of ${w.classYear}` : ""} place={w.highSchool ?? ""} results={w.results} />
            ))}
          </ul>
        </div>
      ) : null}

      <p className="text-xs leading-4 text-white/40">
        Rosters as each school published them on 12 October 2026. North Carolina wrestlers only: programs also recruit from other states, and a coach weighs what the team needs at each weight.
      </p>
    </div>
  )
}

function Heading({ text, count }: { text: string; count: number }) {
  return (
    <p className="flex items-center gap-2 text-sm font-bold text-white">
      {text}
      <span className="rounded-full bg-white/10 px-2 py-0.5 text-xs text-white/70">{count}</span>
    </p>
  )
}

/** One result, as a chip. */
function Chip({ text, gold = false }: { text: string; gold?: boolean }) {
  return <span className={`rounded-md px-2 py-0.5 text-[11px] font-semibold ${gold ? "bg-[#D3B574]/20 text-[#f0dcae]" : "bg-white/10 text-white/80"}`}>{text}</span>
}

function Card({ name, href, line, place, results }: { name: string; href: string | null; line: string; place: string; results: string[] }) {
  const initials = name
    .split(/\s+/)
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase()
  return (
    <li className="rounded-xl border border-white/10 bg-white/[0.03] p-3">
      <div className="flex items-center gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white/10 text-xs font-black">{initials}</span>
        <div className="min-w-0">
          {href ? (
            <a href={href} className="block truncate font-semibold text-white hover:underline">
              {name}
            </a>
          ) : (
            <span className="block truncate font-semibold text-white">{name}</span>
          )}
          {line ? <span className="block text-xs text-white/55">{line}</span> : null}
        </div>
      </div>
      {place ? <p className="mt-2 truncate text-xs text-white/50">{place}</p> : null}
      {results.length > 0 ? (
        <div className="mt-2 flex flex-wrap gap-1">
          {results.map((r) => (
            <Chip key={r} text={r} />
          ))}
        </div>
      ) : null}
    </li>
  )
}
