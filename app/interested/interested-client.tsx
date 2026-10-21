"use client"

import Link from "next/link"
import { useMemo, useState } from "react"
import { ArrowRight, Star } from "lucide-react"

import { FitBadge } from "@/components/fit-badge"
import type { InterestedCard } from "@/lib/college-programs/interested-for-coach"

const ROOM_TONE = { likely: "bg-emerald-400/15 text-emerald-300 ring-emerald-400/30", some: "bg-sky-400/15 text-sky-200 ring-sky-400/30", crowded: "bg-amber-400/15 text-amber-200 ring-amber-400/30" } as const
const chip = (on: boolean) => `rounded-full px-3 py-1.5 text-xs font-bold ring-1 ${on ? "bg-[#D3B574] text-[#0A1628] ring-transparent" : "text-white/70 ring-white/15 hover:ring-white/35"}`

export default function InterestedClient({ wrestlers, program, seenAt, hasStandard }: { wrestlers: InterestedCard[]; program: string | null; seenAt: string | null; hasStandard: boolean }) {
  const [year, setYear] = useState<number | null>(null)
  const [roomOnly, setRoomOnly] = useState(false)
  const [fitOnly, setFitOnly] = useState(false)
  const years = useMemo(() => [...new Set(wrestlers.map((w) => w.classYear).filter((y): y is number => y != null))].sort(), [wrestlers])
  const shown = wrestlers.filter((w) => (!year || w.classYear === year) && (!roomOnly || (w.room && w.room.need !== "crowded")) && (!fitOnly || w.fit?.verdict === "meets"))
  const ago = (iso: string) => {
    const d = Math.floor((Date.now() - Date.parse(iso)) / 864e5)
    return d <= 0 ? "today" : d === 1 ? "yesterday" : `${d} days ago`
  }

  return (
    <div className="mx-auto max-w-5xl text-white">
      <h1 className="text-2xl font-black sm:text-3xl">Interested in {program ?? "your program"}</h1>
      <p className="mt-1 text-sm text-white/55">
        {wrestlers.length} wrestler{wrestlers.length === 1 ? "" : "s"} whose families told you, from the Command Center.
      </p>

      {wrestlers.length ? (
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <button type="button" className={chip(year == null)} onClick={() => setYear(null)}>
            All classes
          </button>
          {years.map((y) => (
            <button key={y} type="button" className={chip(year === y)} onClick={() => setYear(y)}>
              {y}
            </button>
          ))}
          <span className="mx-1 h-5 w-px bg-white/15" aria-hidden />
          <button type="button" className={chip(roomOnly)} onClick={() => setRoomOnly(!roomOnly)}>
            Room at his weight
          </button>
          {hasStandard ? (
            <button type="button" className={chip(fitOnly)} onClick={() => setFitOnly(!fitOnly)}>
              Meets your Perfect Recruit
            </button>
          ) : null}
        </div>
      ) : null}

      {!wrestlers.length ? (
        <div className="mt-8 rounded-xl border border-white/10 bg-[#0f1c2e] p-8 text-center">
          <p className="font-bold">No wrestlers yet</p>
          <p className="mx-auto mt-1 max-w-md text-sm text-white/55">
            Families tell a program they are interested from its college page in the Command Center. When one does, the wrestler appears here and on Coach Home.
          </p>
        </div>
      ) : (
        <ul className="mt-4 grid gap-2 md:grid-cols-2">
          {shown.map((w) => {
            const fresh = !seenAt || w.at > seenAt
            return (
              <li key={w.id}>
                <Link href={`/athletes/${w.id}`} className="flex items-center gap-3 rounded-xl border border-white/10 bg-[#0f1c2e] p-3 hover:border-[#D3B574]/50 hover:bg-white/[0.06]">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={w.photo || "/wrestler-silhouette.png"} alt="" className="h-14 w-14 shrink-0 rounded-full bg-[#13294B] object-cover" />
                  <span className="min-w-0 flex-1">
                    <span className="flex flex-wrap items-center gap-2">
                      <span className="truncate font-black">{w.name}</span>
                      {w.classYear ? <span className="rounded bg-white/90 px-1.5 py-0.5 text-[11px] font-black text-[#0A1628]">{w.classYear}</span> : null}
                      {w.onBoard ? <Star className="h-3.5 w-3.5 fill-current text-[#D3B574]" aria-label="On your board" /> : null}
                      {fresh ? <span className="rounded bg-[#CC0000] px-1.5 py-0.5 text-[10px] font-black uppercase text-white">New</span> : null}
                    </span>
                    <span className="block truncate text-xs text-white/55">{[w.weight ? `${w.weight} lbs` : null, w.highSchool].filter(Boolean).join(" · ")}</span>
                    <span className="mt-1 flex flex-wrap items-center gap-1.5">
                      <span className="text-[11px] font-bold text-emerald-300">✓ Interested in you · {ago(w.at)}</span>
                      {w.room ? (
                        <span className={`rounded px-1.5 py-0.5 text-[10px] font-bold ring-1 ${ROOM_TONE[w.room.need]}`} title={`${w.room.staying} on your roster at ${w.room.weight} in fall ${w.room.fall}`}>
                          {w.room.weight}: {w.room.label} ({w.room.fall})
                        </span>
                      ) : null}
                    </span>
                    {w.fit ? <FitBadge flag={w.fit} className="mt-1" /> : null}
                  </span>
                  <ArrowRight className="h-4 w-4 shrink-0 text-white/30" aria-hidden />
                </Link>
              </li>
            )
          })}
          {!shown.length ? <li className="text-sm text-white/55">No one matches these filters.</li> : null}
        </ul>
      )}
      <p className="mt-4 text-xs text-white/35">Room at his weight is from your published roster for the fall he would arrive: a direction, not an open spot.</p>
    </div>
  )
}
