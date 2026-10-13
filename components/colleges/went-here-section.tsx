"use client"

import { useEffect, useState } from "react"

import type { WentHere } from "@/lib/college-programs/went-here"

type Response = ({ locked: false } & WentHere) | { locked: true } | { error: string }

const gpa = (n: number) => n.toFixed(2)

/**
 * "NC wrestlers who went here", on a school's card (lib/college-programs/went-here.ts).
 *
 * It sets out who went, what they had done and the family's own wrestler beside it. It never says
 * whether he is good enough - that is the coach's call, on things we cannot see.
 */
export function WentHereSection({ schoolId, schoolName }: { schoolId: string; schoolName: string }) {
  const [data, setData] = useState<WentHere | null>(null)
  const [showAll, setShowAll] = useState(false)

  useEffect(() => {
    let cancelled = false
    setData(null)
    setShowAll(false)
    fetch(`/api/college-map/went-here?school=${encodeURIComponent(schoolId)}`, { cache: "no-store" })
      .then(async (res) => {
        if (!res.ok) return
        const body = (await res.json()) as Response
        // Locked, not built yet, or failed: the card simply has no such section.
        if (!cancelled && "locked" in body && body.locked === false) setData(body)
      })
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [schoolId])

  if (!data) return null
  const shown = showAll ? data.wrestlers : data.wrestlers.slice(0, 3)

  return (
    <div className="mt-3 border-t border-white/10 pt-3">
      <p className="text-xs font-bold uppercase tracking-wider text-white/45">NC wrestlers who went here</p>

      {data.wrestlers.length === 0 ? (
        <p className="mt-2 text-sm leading-5 text-white/60">
          No North Carolina wrestler from the last four classes has committed to {schoolName} on our records.
        </p>
      ) : (
        <>
          <ul className="mt-2 space-y-2">
            {shown.map((w) => (
              <li key={w.athleteId} className="text-sm leading-5">
                <a href={`/view-profile?id=${w.athleteId}`} className="font-semibold text-white hover:underline">
                  {w.name}
                </a>
                <span className="text-white/50">
                  {w.classYear ? ` · ${w.classYear}` : ""}
                  {w.highSchool ? ` · ${w.highSchool}` : ""}
                </span>
                <span className="block text-xs text-white/65">
                  {w.results.length > 0 ? w.results.join(" · ") : "No state or national placing on our records"}
                </span>
              </li>
            ))}
          </ul>
          {!showAll && data.wrestlers.length > shown.length ? (
            <button type="button" onClick={() => setShowAll(true)} className="mt-2 text-xs font-semibold text-[#F5D985] hover:underline">
              Show all {data.wrestlers.length}
            </button>
          ) : null}
        </>
      )}

      {data.schoolSentence ? <p className="mt-2 text-sm leading-5 text-white/80">Of those, {data.schoolSentence}</p> : null}

      {data.level.sentence && !data.schoolSentence ? (
        <p className="mt-2 text-sm leading-5 text-white/80">
          Across NC wrestlers who went {data.level.short}: {data.level.sentence}
        </p>
      ) : null}

      {data.gpa ? (
        <p className="mt-2 text-sm leading-5 text-white/80">
          {data.gpa.label}: average GPA {gpa(data.gpa.average)}, from {gpa(data.gpa.low)} to {gpa(data.gpa.high)}{" "}
          <span className="text-white/45">({data.gpa.count} wrestlers, as reported)</span>
        </p>
      ) : null}

      {data.yours.length > 0 ? (
        <ul className="mt-2 space-y-1 rounded-sm bg-white/[0.06] p-2.5">
          {data.yours.map((y) => (
            <li key={y.firstName} className="text-sm leading-5 text-white">
              <span className="font-semibold">{y.firstName}:</span>{" "}
              {y.results.length > 0 ? y.results.join(" · ") : "no state or national placing on our records yet"}
              {y.gpa != null ? ` · GPA ${gpa(y.gpa)}` : " · no GPA on the profile"}
            </li>
          ))}
        </ul>
      ) : null}

      <p className="mt-2 text-xs leading-4 text-white/40">
        North Carolina wrestlers only, classes of the last four years. Programs also recruit from other states, and a
        coach weighs what he needs at each weight.
      </p>
    </div>
  )
}
