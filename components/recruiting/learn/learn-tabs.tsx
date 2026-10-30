"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"

/**
 * One set of Learn tabs on every Learn page (Matt, 29 Oct 2026: "the sub links terrible navigation..
 * you should be able to go back to where you were"). The hub and the roadmap each had their own
 * tabs, and the rules, costs, academics, FAQ and tournament pages had none and no Command Center
 * menu, so a tab click dropped the family out of the portal. Real links, so the browser's Back
 * returns to the page before.
 */
export const LEARN_TABS: Array<{ label: string; href: string; match: RegExp }> = [
  { label: "Overview", href: "/my-recruiting/learn", match: /^\/my-recruiting\/learn\/?$/ },
  { label: "Timeline", href: "/recruiting/learn/timeline", match: /^\/recruiting\/learn\/(timeline|eligibility-clock)/ },
  { label: "Rules", href: "/recruiting/learn/division-1", match: /^\/recruiting\/learn\/(division-|naia|njcaa|staying-eligible|nil|transfer-portal|womens-wrestling)/ },
  { label: "Academics", href: "/recruiting/learn/eligibility-center", match: /^\/recruiting\/learn\/eligibility-center/ },
  { label: "Costs & aid", href: "/recruiting/learn/paying-for-college", match: /^\/recruiting\/learn\/paying-for-college/ },
  { label: "Getting recruited", href: "/recruiting/learn/working-the-process", match: /^\/recruiting\/learn\/(working-the-process|what-coaches-look-for)/ },
  { label: "Tournaments", href: "/recruiting/learn/tournaments", match: /^\/recruiting\/learn\/tournaments/ },
  { label: "FAQs", href: "/recruiting/learn/questions-families-ask", match: /^\/recruiting\/learn\/questions-families-ask/ },
]

/** The rules pages, one per level, as a second row under Rules. */
const RULE_LEVELS = [
  { label: "Division I", href: "/recruiting/learn/division-1" },
  { label: "Division II", href: "/recruiting/learn/division-2" },
  { label: "Division III", href: "/recruiting/learn/division-3" },
  { label: "NAIA", href: "/recruiting/learn/naia" },
  { label: "Junior college", href: "/recruiting/learn/njcaa" },
  { label: "Women's", href: "/recruiting/learn/womens-wrestling" },
  { label: "NIL", href: "/recruiting/learn/nil" },
  { label: "Transfer portal", href: "/recruiting/learn/transfer-portal" },
]

export function LearnTabs({ className = "" }: { className?: string }) {
  const path = usePathname() ?? ""
  const active = LEARN_TABS.find((t) => t.match.test(path))?.label
  return (
    <div className={className}>
      <nav aria-label="Learn sections" className="-mx-4 overflow-x-auto border-b border-white/10 px-4 sm:mx-0 sm:px-0">
        <ul className="flex gap-6 whitespace-nowrap text-sm font-semibold">
          {LEARN_TABS.map((t) => (
            <li key={t.label}>
              <Link
                href={t.href}
                aria-current={t.label === active ? "page" : undefined}
                className={`block border-b-2 py-3 ${t.label === active ? "border-[#D3B574] text-[#D3B574]" : "border-transparent text-white/65 hover:text-white"}`}
              >
                {t.label}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
      {active === "Rules" ? (
        <nav aria-label="Rules by level" className="-mx-4 mt-3 overflow-x-auto px-4 sm:mx-0 sm:px-0">
          <ul className="flex gap-2 whitespace-nowrap text-xs font-bold">
            {RULE_LEVELS.map((l) => (
              <li key={l.href}>
                <Link
                  href={l.href}
                  aria-current={path.startsWith(l.href) ? "page" : undefined}
                  className={`block rounded-full border px-3 py-1.5 ${path.startsWith(l.href) ? "border-[#D3B574] bg-[#D3B574]/15 text-[#D3B574]" : "border-white/15 text-white/70 hover:text-white"}`}
                >
                  {l.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      ) : null}
    </div>
  )
}
