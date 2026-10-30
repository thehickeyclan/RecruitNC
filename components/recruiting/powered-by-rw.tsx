import { RwLogo } from "@/components/recruiting/rw-mark"

/**
 * "Powered by RecruitWrestlers" on NC United's recruiting pages, linking to recruitwrestlers.com
 * (Matt, 30 Oct 2026): RecruitNC stays NC United's, and the national name grows beside it. NC United
 * only (ncu-only); on RecruitWrestlers it would be the site naming itself.
 */
export function PoweredByRw({ className = "" }: { className?: string }) {
  return (
    <a
      href="https://www.recruitwrestlers.com"
      target="_blank"
      rel="noopener"
      className={`ncu-only group inline-flex items-center gap-2 text-xs font-semibold text-white/50 hover:text-white ${className}`}
    >
      <span>Powered by</span>
      <RwLogo className="h-4 w-auto opacity-80 transition group-hover:opacity-100" />
    </a>
  )
}
