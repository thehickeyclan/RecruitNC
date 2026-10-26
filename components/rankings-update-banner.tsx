import { rankingsUpdateNoticeActive, RANKINGS_UPDATE } from "@/lib/rankings-update-notice"

/**
 * "New rankings by Friday" (Matt, 26 Oct 2026), on the home page and the rankings pages. Same dates
 * and events as the recaps and coach emails (lib/rankings-update-notice.ts); gone after the 31st.
 */
export function RankingsUpdateBanner({ className = "" }: { className?: string }) {
  if (!rankingsUpdateNoticeActive()) return null
  return (
    <div className={`border-b border-[#D3B574]/40 bg-[#D3B574] text-[#0A1628] ${className}`}>
      <div className="mx-auto max-w-5xl px-4 py-2.5 text-center text-sm font-semibold">
        📊 New North Carolina rankings by <strong>{RANKINGS_UPDATE.by}</strong>, updated with {RANKINGS_UPDATE.events} results.
      </div>
    </div>
  )
}
