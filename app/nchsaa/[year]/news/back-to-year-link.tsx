import Link from "next/link"
import { ArrowLeft } from "lucide-react"

/**
 * Same pattern as First Flight "← All News" link: Next.js Link with href.
 * Kept as server-friendly so navigation matches the working news back button.
 */
export function BackToYearLink({ year }: { year: string }) {
  const href = `/nchsaa/${year}`

  return (
    <Link
      href={href}
      className="inline-flex items-center gap-2 rounded-md border-2 border-[#C20017] bg-transparent px-4 py-2 text-sm font-medium text-[#C20017] hover:bg-[#C20017] hover:text-white transition-colors"
      aria-label={`Back to ${year} results`}
    >
      <ArrowLeft className="w-4 h-4 shrink-0" aria-hidden />
      Back to {year} Results
    </Link>
  )
}
