"use client"

import { useEffect, useState } from "react"

import { mostRecentGraduatedClassYear } from "@/lib/class-years"
import { rosterNameKey } from "@/lib/college-programs/roster-name"
import type { SchoolRosterView } from "@/lib/college-programs/rosters"
import type { WentHere } from "@/lib/college-programs/went-here"

type Response = { locked: false; roster: SchoolRosterView; wentHere: WentHere | null } | { locked: true } | { error: string }

const gpa = (n: number) => n.toFixed(2)
const SUB = "text-xs font-bold uppercase tracking-wider text-white/45"

/**
 * "Where you stand" on a school's page: the North Carolina wrestlers on its roster now, the ones
 * committed and on their way, what they had won, and the family's own wrestler beside it.
 *
 * It sets the facts out. It never says whether he is good enough - that is the coach's call, on
 * things we cannot see.
 */
export function WentHereSection({ schoolId, schoolName }: { schoolId: string; schoolName: string }) {
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
  const { roster, wentHere } = data

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
  const shown = showAll ? roster.wrestlers : roster.wrestlers.slice(0, 5)

  return (
    <div className="mt-3 border-t border-white/10 pt-3">
      <p className={SUB}>North Carolina wrestlers on the roster</p>
      {roster.teamLines.map((line) => (
        <p key={line} className="mt-2 text-sm leading-5 text-white/80">
          {line}
        </p>
      ))}

      {roster.wrestlers.length > 0 ? (
        <>
          <ul className="mt-2 space-y-2">
            {shown.map((w) => {
              const commit = commits.get(rosterNameKey(w.name))
              return (
                <li key={`${w.team}-${w.name}`} className="text-sm leading-5">
                  {commit ? (
                    <a href={`/view-profile?id=${commit.athleteId}`} className="font-semibold text-white hover:underline">
                      {w.name}
                    </a>
                  ) : (
                    <span className="font-semibold text-white">{w.name}</span>
                  )}
                  <span className="text-white/50">
                    {[w.class, w.weight ? `${w.weight} lbs` : null, both ? (w.team === "womens" ? "women's" : "men's") : null]
                      .filter(Boolean)
                      .map((part) => ` · ${part}`)
                      .join("")}
                  </span>
                  <span className="block text-xs text-white/65">
                    {[w.highSchool, w.hometown].filter(Boolean).join(" · ") || "Hometown not listed"}
                    {commit && commit.results.length > 0 ? ` · ${commit.results.join(" · ")}` : ""}
                  </span>
                </li>
              )
            })}
          </ul>
          {!showAll && roster.wrestlers.length > shown.length ? (
            <button type="button" onClick={() => setShowAll(true)} className="mt-2 text-xs font-semibold text-[#F5D985] hover:underline">
              Show all {roster.wrestlers.length}
            </button>
          ) : null}
        </>
      ) : null}

      {arriving.length > 0 ? (
        <>
          <p className={`${SUB} mt-4`}>Committed, arriving</p>
          <ul className="mt-2 space-y-2">
            {arriving.map((w) => (
              <li key={w.athleteId} className="text-sm leading-5">
                <a href={`/view-profile?id=${w.athleteId}`} className="font-semibold text-white hover:underline">
                  {w.name}
                </a>
                <span className="text-white/50">
                  {w.classYear ? ` · Class of ${w.classYear}` : ""}
                  {w.highSchool ? ` · ${w.highSchool}` : ""}
                </span>
                <span className="block text-xs text-white/65">
                  {w.results.length > 0 ? w.results.join(" · ") : "No state or national placing on our records"}
                </span>
              </li>
            ))}
          </ul>
        </>
      ) : null}

      {notListed.length > 0 ? (
        <>
          <p className={`${SUB} mt-4`}>Committed here, not on the roster we read</p>
          <ul className="mt-2 space-y-2">
            {notListed.map((w) => (
              <li key={w.athleteId} className="text-sm leading-5">
                <a href={`/view-profile?id=${w.athleteId}`} className="font-semibold text-white hover:underline">
                  {w.name}
                </a>
                <span className="text-white/50">
                  {w.classYear ? ` · Class of ${w.classYear}` : ""}
                  {w.highSchool ? ` · ${w.highSchool}` : ""}
                </span>
                <span className="block text-xs text-white/65">
                  {w.results.length > 0 ? w.results.join(" · ") : "No state or national placing on our records"}
                </span>
              </li>
            ))}
          </ul>
        </>
      ) : null}

      {wentHere?.schoolSentence ? (
        <p className="mt-3 text-sm leading-5 text-white/80">
          Of the North Carolina wrestlers who committed to {schoolName} in the last four classes, {wentHere.schoolSentence}
        </p>
      ) : wentHere?.level.sentence ? (
        <p className="mt-3 text-sm leading-5 text-white/80">
          Across NC wrestlers who went {wentHere.level.short}: {wentHere.level.sentence}
        </p>
      ) : null}

      {wentHere?.gpa ? (
        <p className="mt-2 text-sm leading-5 text-white/80">
          {wentHere.gpa.label}: average GPA {gpa(wentHere.gpa.average)}, from {gpa(wentHere.gpa.low)} to {gpa(wentHere.gpa.high)}{" "}
          <span className="text-white/45">({wentHere.gpa.count} wrestlers, as reported)</span>
        </p>
      ) : null}

      {wentHere && wentHere.yours.length > 0 ? (
        <ul className="mt-2 space-y-1 rounded-sm bg-white/[0.06] p-2.5">
          {wentHere.yours.map((y) => (
            <li key={y.firstName} className="text-sm leading-5 text-white">
              <span className="font-semibold">{y.firstName}:</span>{" "}
              {y.results.length > 0 ? y.results.join(" · ") : "no state or national placing on our records yet"}
              {y.gpa != null ? ` · GPA ${gpa(y.gpa)}` : " · no GPA on the profile"}
            </li>
          ))}
        </ul>
      ) : null}

      <p className="mt-2 text-xs leading-4 text-white/40">
        Rosters as each school published them on 12 October 2026. North Carolina wrestlers only: programs also recruit
        from other states, and a coach weighs what he needs at each weight.
      </p>
    </div>
  )
}
