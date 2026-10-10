import { Check, HelpCircle, X } from "lucide-react"

/** What the page needs of a flag (lib/program-fit-bulk.ts) - plain data, so it crosses to the browser. */
export type FitBadgeFlag = { verdict: "meets" | "possible" | "misses"; summary: string }

/**
 * Whether a wrestler meets the program's perfect recruit, said in a pill.
 *
 * Green meets every need; amber misses nothing but has something not on file; a miss is stated
 * quietly rather than hidden, so a coach sees why and can decide it does not matter.
 */
export function FitBadge({ flag, className = "" }: { flag: FitBadgeFlag | null | undefined; className?: string }) {
  if (!flag) return null
  const tone =
    flag.verdict === "meets"
      ? "border-emerald-400/40 bg-emerald-400/10 text-emerald-300"
      : flag.verdict === "possible"
        ? "border-amber-300/40 bg-amber-300/10 text-amber-200"
        : "border-white/10 bg-white/[0.03] text-white/45"
  const Icon = flag.verdict === "meets" ? Check : flag.verdict === "possible" ? HelpCircle : X
  const label = flag.verdict === "meets" ? "Meets your standard" : flag.verdict === "possible" ? "Possible fit" : flag.summary
  return (
    <span title={flag.summary} className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-bold ${tone} ${className}`}>
      <Icon className="h-3 w-3 shrink-0" aria-hidden />
      {label}
    </span>
  )
}
