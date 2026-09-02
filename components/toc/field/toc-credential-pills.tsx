import type { PublicCredential, PublicCredentialKind } from "@/lib/toc/public-announced-field"

/** Same visual language as the admin field board's credential badges, so staff and public read alike. */
const PILL_CLASS: Record<PublicCredentialKind, string> = {
  "all-american": "border-[#CC0000]/55 bg-[#CC0000]/20 text-red-200",
  "state-champion": "border-[#D7B95A]/55 bg-[#D7B95A] text-[#060f1f]",
  "state-placer": "border-sky-300/45 bg-sky-400/15 text-sky-200",
  "state-qualifier": "border-white/20 bg-white/5 text-white/70",
}

/**
 * `inline` renders only the strongest credential, sized to sit beside the athlete's name rather
 * than on its own row. The full set still shows wherever there is width for it.
 */
export function TocCredentialPills({
  credentials,
  inline = false,
}: {
  credentials: PublicCredential[]
  inline?: boolean
}) {
  if (credentials.length === 0) return null
  const shown = inline ? credentials.slice(0, 1) : credentials

  return (
    <div className={inline ? "flex shrink-0" : "mt-2 flex flex-wrap gap-1"}>
      {shown.map((c) => (
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
