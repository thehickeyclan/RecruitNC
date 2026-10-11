import { RECRUITING_BRAND } from "@/lib/recruiting/brand"

/** The product name as the header and footer draw it: two tones, no image, so a rename is lib/recruiting/brand.ts. */
export function RecruitingWordmark({ className = "" }: { className?: string }) {
  const [lead, accent] = RECRUITING_BRAND.wordmark
  return (
    <span className={`font-black uppercase italic tracking-tight ${className}`}>
      <span className="text-white">{lead}</span>
      <span className="text-[#D3B574]">{accent}</span>
    </span>
  )
}
