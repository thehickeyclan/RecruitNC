import type { PublicRankingCredential, PublicRankingCredentialKind } from "@/lib/rankings/public-rankings-view"

/**
 * The same pill language as the Tournament of Champions field, so a family reading both pages
 * does not have to learn two visual systems.
 */
const PILL_CLASS: Record<PublicRankingCredentialKind, string> = {
  "all-american": "border-[#CC0000]/55 bg-[#CC0000]/20 text-red-200",
  "state-champion": "border-[#D7B95A]/55 bg-[#D7B95A] text-[#060f1f]",
  "state-placer": "border-sky-300/45 bg-sky-400/15 text-sky-200",
}

export function RankingCredentialPills({ credentials }: { credentials: PublicRankingCredential[] }) {
  if (credentials.length === 0) return null
  return (
    <div className="mt-2 flex flex-wrap gap-1">
      {credentials.map((c) => (
        <span
          key={c.kind}
          title={c.detail}
          className={`inline-flex items-center rounded border px-1.5 py-0.5 text-[9px] font-black uppercase leading-none tracking-[0.04em] ${PILL_CLASS[c.kind]}`}
        >
          {c.label}
        </span>
      ))}
    </div>
  )
}
