import { RECRUITING_BRAND, recruitingCoverage } from "@/lib/recruiting/brand"
import { BrandLockup } from "@/components/recruiting/brand-frames"
import { BrandName } from "@/components/recruiting/brand-name"
import { RecruitingWordmark } from "@/components/recruiting/recruiting-wordmark"

/**
 * The footer under a college coach's pages: recruiting links, how to reach us, and one line back
 * to the community site. None of the store, Blue or giving links components/footer.tsx carries.
 */
const LINKS = [
  { href: "/coach-home", label: "Coach Home" },
  { href: "/prospects/all", label: "Athletes" },
  { href: "/public-rankings", label: "Rankings" },
  { href: "/my-recruits", label: "My Recruits" },
  { href: "/perfect-recruit", label: "Perfect Recruit" },
  { href: "/compare?src=footer", label: "Compare" },
]

export function RecruitingFooter() {
  return (
    <footer className="border-t border-white/10 bg-[#0A1628] text-white print:hidden">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="flex flex-col gap-8 md:flex-row md:justify-between">
          <div className="max-w-sm">
            <span className="ncu-only">
              <RecruitingWordmark className="text-xl" />
            </span>
            <BrandLockup />
            <p className="mt-2 text-sm text-white/50">{RECRUITING_BRAND.tagline}</p>
            <p className="mt-1 text-sm text-white/50">Covering {recruitingCoverage()}. Free for college coaching staff.</p>
          </div>
          <ul className="grid grid-cols-2 gap-x-10 gap-y-3 text-sm">
            {LINKS.map((item) => (
              <li key={item.href}>
                <a href={item.href} className="text-white/70 transition-colors hover:text-white">{item.label}</a>
              </li>
            ))}
          </ul>
          <div className="text-sm">
            <p className="text-[11px] font-black uppercase tracking-widest text-[#D3B574]">Help</p>
            <a href={`mailto:${RECRUITING_BRAND.supportEmail}`} className="mt-3 block text-white/70 transition-colors hover:text-white">
              {RECRUITING_BRAND.supportEmail}
            </a>
            <a href="/contact" className="mt-2 block text-white/70 transition-colors hover:text-white">Contact form</a>
            <a href="/privacy" className="mt-2 block text-white/70 transition-colors hover:text-white">Privacy</a>
          </div>
        </div>
        <div className="mt-8 flex flex-col gap-2 border-t border-white/10 pt-5 text-xs text-white/40 sm:flex-row sm:justify-between">
          <p>
            &copy; {new Date().getFullYear()} <span className="ncu-only">{RECRUITING_BRAND.parent}</span>
            <BrandName ncu="" />. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  )
}
