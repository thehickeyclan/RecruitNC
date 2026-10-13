"use client"

import { useState } from "react"

import { LearnSectionCard } from "@/components/recruiting/learn/learn-section"
import { D1_CONTACT, D1_TRACK_LABEL, type D1Track } from "@/lib/recruiting/learn/content"

const TRACKS: D1Track[] = ["men-2028", "men-2027", "women"]

/**
 * Division I contact dates depend on who is asking: the NCAA changed them in April 2026 for boys
 * in the Class of 2028 and younger, and not for the Class of 2027 or for girls. The page opens on
 * the family's own wrestler when it knows him, and says which set it is showing.
 */
export function D1Contact({ initial, forName }: { initial: D1Track; forName: string | null }) {
  const [track, setTrack] = useState<D1Track>(initial)
  return (
    <div>
      <p className="text-sm text-white/60">
        {forName && track === initial ? `Showing the dates for ${forName}.` : "The dates depend on the wrestler."} Choose:
      </p>
      <div className="mt-2 flex flex-wrap gap-2" role="tablist" aria-label="Which wrestler">
        {TRACKS.map((t) => (
          <button
            key={t}
            type="button"
            role="tab"
            aria-selected={t === track}
            onClick={() => setTrack(t)}
            className={`rounded-lg border px-3 py-2 text-sm font-bold ${
              t === track ? "border-[#D3B574] bg-[#D3B574]/15 text-white" : "border-white/15 text-white/70 hover:text-white"
            }`}
          >
            {D1_TRACK_LABEL[t]}
          </button>
        ))}
      </div>
      <div className="mt-3">
        <LearnSectionCard section={D1_CONTACT[track]} />
      </div>
    </div>
  )
}
