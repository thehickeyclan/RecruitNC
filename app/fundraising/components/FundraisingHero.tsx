import type { FundraisingHubHeroStats } from "@/lib/fundraising/hub-data"
import { AthleteSearchBar } from "./AthleteSearchBar"

const NAVY = "#0B2545"
const RED = "#CC0000"
const GOLD = "#C8A94A"

function displayFont(className: string) {
  return `font-[family-name:var(--font-fundraising-display)] ${className}`
}

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
        <div className="flex justify-center border-b border-white/20 pb-4 sm:justify-start">
          <a
            href="#fundraising-top-donors"
            className={`${displayFont(
              "inline-flex items-center text-[11px] font-black uppercase tracking-[0.28em] text-white underline decoration-white/50 underline-offset-[6px] transition hover:decoration-white",
            )}`}
          >
            Top donors
          </a>
        </div>
        <p
          className={`${displayFont("mt-5 text-[10px] font-extrabold uppercase tracking-[0.32em] text-[#C8A94A] sm:text-[11px]")}`}
        >
          Tax-deductible giving · 501(c)(3)
        </p>

        <h1
          className={`${displayFont("mx-auto mt-6 max-w-[22ch] text-[clamp(2.25rem,8vw,4.5rem)] font-black uppercase leading-[0.92] tracking-[-0.02em] text-white sm:mx-0")}`}
        >
          NC United <span className="text-[#C8A94A]">×</span> Giving
        </h1>

        <p className="mx-auto mt-6 max-w-2xl text-base font-medium leading-relaxed text-white sm:mx-0 sm:text-lg">
          Support NC wrestlers with a tax-deductible gift to NC United (501(c)(3)). Choose an athlete or the training fund at checkout — your
          receipt reflects the nonprofit, and credit follows the wrestler you select. NC United absorbs card-processing fees so their campaign
          total reflects what you pay.
        </p>

        <div
          className={`${displayFont("mx-auto mt-10 flex max-w-4xl flex-col gap-3 border-y border-white/10 py-6 text-white sm:mx-0 sm:flex-row sm:flex-wrap sm:items-center sm:justify-center sm:gap-6 sm:py-7 md:justify-start")}`}
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

        <p className="mx-auto mt-10 text-center text-xs leading-relaxed text-white/70 sm:mx-0 sm:text-left">
          <a href="#fundraising-how-it-works" className="font-semibold text-[#C8A94A] underline-offset-4 hover:underline">
            How giving works
          </a>{" "}
          covers the steps and your two checkout paths (wrestler or training fund).{" "}
          <a href="#fundraising-corporate-partners" className="font-semibold text-[#C8A94A] underline-offset-4 hover:underline">
            Corporate partners
          </a>{" "}
          and{" "}
          <a href="#fundraising-scholarships-soon" className="font-semibold text-[#C8A94A] underline-offset-4 hover:underline">
            scholarships
          </a>{" "}
          are farther down — not checkout lanes yet.
        </p>

        <p className="mx-auto mt-4 text-center text-xs text-white sm:mx-0 sm:text-left">
          <span className="font-semibold text-white">501(c)(3)</span> · EIN{" "}
          <span className="tabular-nums text-white">99-3757238</span>
        </p>

        <div className="mx-auto max-w-xl sm:mx-0">
          <AthleteSearchBar />
        </div>
      </div>
    </section>
  )
}
