import type { FundraisingHubHeroStats } from "@/lib/fundraising/hub-data"
import { HardLink } from "@/components/hard-link"
import { AthleteSearchBar } from "./AthleteSearchBar"

const NAVY = "#0B2545"
const RED = "#CC0000"
const GOLD = "#C8A94A"

function displayFont(className: string) {
  return `font-[family-name:var(--font-fundraising-display)] ${className}`
}

/** Order = importance for donors: give first, then learn, activity, community. */
const HUB_JUMP_LINKS: ReadonlyArray<{ href: string; label: string; primary?: true }> = [
  { href: "#fundraising-two-ways-give", label: "Give now", primary: true },
  { href: "#fundraising-how-it-works", label: "How it works" },
  /** Full page — scholarships hub (named funds, applications); not only the in-page teaser block below. */
  { href: "/fundraising/scholarships", label: "Scholarships" },
  { href: "#fundraising-corporate-partners", label: "Sponsors" },
  { href: "#fundraising-why-nc-united", label: "Why NC United" },
  { href: "#fundraising-leaderboard-preview", label: "Leaderboard" },
  { href: "#fundraising-live-donor-stream", label: "Live feed" },
  { href: "#fundraising-active-campaigns", label: "Campaigns" },
  { href: "#fundraising-top-donors", label: "Top donors" },
]

export function formatUsdWhole(cents: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(cents / 100)
}

export function FundraisingHero({ hero }: { hero: FundraisingHubHeroStats }) {
  const raised = formatUsdWhole(hero.totalRaisedCents).replace(/^\$/, "")

  return (
    <section
      className="relative overflow-hidden border-b border-white/[0.08] px-4 pb-16 pt-12 text-white sm:pb-24 sm:pt-16"
      style={{ backgroundColor: NAVY }}
    >
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.14]"
        aria-hidden
        style={{
          backgroundImage: `
            linear-gradient(rgba(255,255,255,0.04) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255,255,255,0.04) 1px, transparent 1px),
            linear-gradient(125deg, ${RED} 0%, transparent 38%),
            radial-gradient(ellipse 80% 60% at 100% -10%, ${GOLD}22 0%, transparent 55%)
          `,
          backgroundSize: "48px 48px, 48px 48px, auto, auto",
        }}
      />
      <div
        className="pointer-events-none absolute inset-0"
        aria-hidden
        style={{
          background: `linear-gradient(180deg, rgba(0,0,0,0.35) 0%, transparent 42%, rgba(0,0,0,0.25) 100%)`,
        }}
      />

      <div className="relative mx-auto max-w-6xl text-center sm:text-left">
        <p
          className={`${displayFont("text-[10px] font-extrabold uppercase tracking-[0.32em] text-[#C8A94A] sm:text-[11px]")}`}
        >
          Tax-deductible giving · 501(c)(3)
        </p>

        <h1
          className={`${displayFont("mx-auto mt-5 max-w-[22ch] text-[clamp(2.25rem,8vw,4.5rem)] font-black uppercase leading-[0.92] tracking-[-0.02em] text-white sm:mx-0")}`}
        >
          NC United <span className="text-[#C8A94A]">×</span> Giving
        </h1>

        <p className="mx-auto mt-6 max-w-2xl text-base font-medium leading-relaxed text-white sm:mx-0 sm:text-lg">
          Support NC wrestlers with a tax-deductible gift to NC United (501(c)(3)). Choose an athlete or the training fund at checkout — your
          receipt reflects the nonprofit, and credit follows the wrestler you select. NC United absorbs card-processing fees so their campaign
          total reflects what you pay.
        </p>

        <nav aria-label="Jump to section on this page" className="mt-8 border-y border-white/10 py-5">
          <p className={`${displayFont("mb-3 text-[10px] font-extrabold uppercase tracking-[0.26em] text-[#C8A94A]/95")}`}>
            Jump to section
          </p>
          <p className="mb-3 text-[11px] text-white/45 sm:hidden">Swipe sideways for more links</p>
          <ul
            className={`flex max-w-full snap-x snap-mandatory gap-2 overflow-x-auto overscroll-x-contain pb-2 [-ms-overflow-style:none] [scrollbar-width:none] sm:flex-wrap sm:justify-start sm:overflow-visible sm:pb-1 sm:snap-none [&::-webkit-scrollbar]:hidden`}
          >
            {HUB_JUMP_LINKS.map((item) => {
              const chipClass = item.primary
                ? `${displayFont(
                    "touch-manipulation inline-flex min-h-[44px] items-center justify-center rounded-full border border-[#CC0000]/70 bg-[#CC0000]/25 px-5 py-2 text-[11px] font-black uppercase tracking-[0.14em] text-white shadow-[0_12px_36px_-12px_rgba(204,0,0,0.75)] transition hover:bg-[#CC0000]/45 hover:shadow-[0_14px_40px_-10px_rgba(204,0,0,0.85)] active:scale-[0.98]",
                  )}`
                : `${displayFont(
                    "touch-manipulation inline-flex min-h-[44px] items-center justify-center rounded-full border border-white/20 bg-white/[0.07] px-4 py-2 text-[11px] font-black uppercase tracking-[0.12em] text-white/92 transition hover:border-white/40 hover:bg-white/14 active:scale-[0.98]",
                  )}`
              const inner = item.href.startsWith("#") ? (
                <a href={item.href} className={chipClass}>
                  {item.label}
                </a>
              ) : (
                <HardLink href={item.href} className={chipClass}>
                  {item.label}
                </HardLink>
              )
              return (
                <li key={item.href} className="shrink-0 snap-start">
                  {inner}
                </li>
              )
            })}
          </ul>
        </nav>

        <div
          className={`${displayFont("mx-auto mt-10 flex max-w-4xl flex-col gap-3 border-b border-white/10 pb-6 text-white sm:mx-0 sm:flex-row sm:flex-wrap sm:items-center sm:justify-center sm:gap-6 sm:pb-7 md:justify-start")}`}
        >
          <div className="flex min-w-0 flex-1 flex-col sm:flex-none">
            <span className="text-[10px] font-extrabold uppercase tracking-[0.24em] text-[#C8A94A]">Raised</span>
            <span className="mt-1 text-2xl font-black tabular-nums text-white sm:text-3xl">${raised}</span>
          </div>
          <span className="hidden text-[#C8A94A]/50 sm:block" aria-hidden>
            |
          </span>
          <div className="flex min-w-0 flex-1 flex-col sm:flex-none">
            <span className="text-[10px] font-extrabold uppercase tracking-[0.24em] text-[#C8A94A]">Donations</span>
            <span className="mt-1 text-2xl font-black tabular-nums text-white sm:text-3xl">
              {hero.giftCount.toLocaleString("en-US")}
            </span>
          </div>
          <span className="hidden text-[#C8A94A]/50 sm:block" aria-hidden>
            |
          </span>
          <div className="flex min-w-0 flex-1 flex-col sm:flex-none">
            <span className="text-[10px] font-extrabold uppercase tracking-[0.24em] text-[#C8A94A]">Event checkouts</span>
            <span className="mt-1 text-2xl font-black tabular-nums text-white sm:text-3xl">
              {hero.raceEntryCount.toLocaleString("en-US")}
            </span>
          </div>
        </div>

        <p className="mx-auto mt-8 text-center text-sm text-white/88 sm:mx-0 sm:text-left">
          Registered <span className="font-semibold text-white">501(c)(3)</span> public charity · EIN{" "}
          <span className="tabular-nums text-white">99-3757238</span>
        </p>

        <div className="mx-auto mt-8 max-w-xl sm:mx-0">
          <AthleteSearchBar />
        </div>
      </div>
    </section>
  )
}
