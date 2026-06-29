"use client"

import { useEffect, useMemo, useState } from "react"
import { HardLink } from "@/components/hard-link"
import { TocPatrioticBar, TocVarsityHeading, tocSectionClass } from "@/components/toc/toc-theme"
import { TOC_MAX_CONFIRMED_PER_WEIGHT } from "@/lib/toc/invitations"
import { TOC_WEIGHT_CLASSES } from "@/lib/toc/constants"

type FieldEntry = {
  weightClass: number
  athlete: { id: string; name: string; school: string | null; graduationYear: number | null } | null
}

export function TocConfirmedFieldSection() {
  const [field, setField] = useState<FieldEntry[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    void fetch("/api/toc/confirmed-field")
      .then((r) => r.json())
      .then((d) => setField(d.field ?? []))
      .finally(() => setLoading(false))
  }, [])

  const byWeight = useMemo(() => {
    const map = new Map<number, FieldEntry[]>()
    for (const w of TOC_WEIGHT_CLASSES) map.set(w, [])
    for (const entry of field) {
      const list = map.get(entry.weightClass) ?? []
      list.push(entry)
      map.set(entry.weightClass, list)
    }
    return map
  }, [field])

  const totalConfirmed = field.length

  return (
    <section id="field" className={`scroll-mt-20 bg-white border-y border-[#0B1D3A]/10 ${tocSectionClass()}`}>
      <TocPatrioticBar />
      <div className="container mx-auto w-full px-4 sm:px-6 max-w-6xl pt-4">
        <p className="text-[#CC0000] text-xs font-semibold uppercase tracking-[0.22em] mb-2">Confirmed field</p>
        <TocVarsityHeading as="h2" className="mb-3 sm:mb-4">
          Who&apos;s in
        </TocVarsityHeading>
        <p className="text-[#0B1D3A]/80 text-base sm:text-lg leading-relaxed mb-8 max-w-3xl">
          Invite-only — up to {TOC_MAX_CONFIRMED_PER_WEIGHT} confirmed wrestlers per weight. Updated as athletes lock
          in their spots.
        </p>

        {loading ? (
          <p className="text-muted-foreground text-sm">Loading field…</p>
        ) : totalConfirmed === 0 ? (
          <p className="text-muted-foreground text-sm">Confirmed wrestlers will appear here as invites are accepted.</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {TOC_WEIGHT_CLASSES.map((weight) => {
              const wrestlers = byWeight.get(weight) ?? []
              return (
                <div
                  key={weight}
                  className="rounded-sm border-2 border-[#0B1D3A]/10 bg-[#f8f9fb] p-4 border-t-4 border-t-[#CC0000]"
                >
                  <div className="flex items-baseline justify-between gap-2 mb-3">
                    <h3 className="font-bold text-[#0B1D3A] uppercase tracking-wide text-sm">{weight} lbs</h3>
                    <span className="text-xs text-muted-foreground tabular-nums">
                      {wrestlers.length}/{TOC_MAX_CONFIRMED_PER_WEIGHT}
                    </span>
                  </div>
                  <ul className="space-y-2">
                    {wrestlers.length === 0 ? (
                      <li className="text-xs text-muted-foreground">Open</li>
                    ) : (
                      wrestlers.map((entry, i) => (
                        <li key={`${weight}-${entry.athlete?.id ?? i}`} className="text-sm">
                          <HardLink
                            href={`/view-profile?id=${entry.athlete?.id}`}
                            className="font-semibold text-[#0B1D3A] hover:text-[#CC0000] hover:underline"
                          >
                            {entry.athlete?.name ?? "Athlete"}
                          </HardLink>
                          {entry.athlete?.school ? (
                            <span className="block text-xs text-muted-foreground">{entry.athlete.school}</span>
                          ) : null}
                        </li>
                      ))
                    )}
                  </ul>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </section>
  )
}
