"use client"

/**
 * One-tap comparisons against the wrestlers this one is most likely to be weighed against - same
 * class and weight, ranked first (lib/similar-wrestlers.ts). Renders nothing until there are some,
 * and nothing for a viewer the API refuses.
 */
import { useEffect, useState } from "react"
import type { SimilarWrestler } from "@/lib/similar-wrestlers"

export function SimilarComparisons({
  athleteId,
  label = "Compare with",
  source,
  hrefFor,
  className,
  tone = "profile",
}: {
  athleteId: string
  label?: string
  /** Recorded with the comparison, to see which way in coaches use. */
  source: string
  /** Defaults to opening the comparison; the compare page passes its own picker. */
  hrefFor?: (other: SimilarWrestler) => string
  className?: string
  /** "navy" on the comparison page; "profile" follows the profile's own theme tokens. */
  tone?: "profile" | "navy"
}) {
  const [similar, setSimilar] = useState<SimilarWrestler[] | null>(null)
  useEffect(() => {
    let cancelled = false
    fetch(`/api/compare/similar?id=${encodeURIComponent(athleteId)}`, { credentials: "include" })
      .then((r) => (r.ok ? r.json() : { similar: [] }))
      .then((d) => { if (!cancelled) setSimilar((d.similar ?? []) as SimilarWrestler[]) })
      .catch(() => { if (!cancelled) setSimilar([]) })
    return () => { cancelled = true }
  }, [athleteId])
  if (!similar?.length) return null
  return (
    <div className={className}>
      <p className={`mb-2 text-[11px] font-bold uppercase tracking-widest ${tone === "navy" ? "text-white/40" : "text-muted-foreground"}`}>{label}</p>
      <div className="flex flex-wrap gap-2">
        {similar.map((s) => (
          <a
            key={s.id}
            href={hrefFor ? hrefFor(s) : `/compare?left=${encodeURIComponent(athleteId)}&right=${encodeURIComponent(s.id)}&src=${encodeURIComponent(source)}`}
            className={`inline-flex items-center gap-1.5 rounded-full border border-[#D3B574]/50 px-3 py-1.5 text-xs font-semibold transition-colors hover:border-[#D3B574] hover:bg-[#D3B574]/10 ${tone === "navy" ? "text-white" : "text-foreground"}`}
          >
            <span className={tone === "navy" ? "text-white/50" : "text-muted-foreground"}>vs</span>
            {s.rank ? <span className="font-black text-[#D3B574]">#{s.rank}</span> : null}
            {s.name}
            {s.weight ? <span className={tone === "navy" ? "text-white/50" : "text-muted-foreground"}>· {s.weight}</span> : null}
          </a>
        ))}
      </div>
    </div>
  )
}
