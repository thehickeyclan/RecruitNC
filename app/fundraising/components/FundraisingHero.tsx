import type { FundraisingHubHeroStats, FundraisingHubTransparencyMeta } from "@/lib/fundraising/hub-data"
import { HardLink } from "@/components/hard-link"
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

export function FundraisingHero({
  hero,
  hubTransparency,
}: {
  hero: FundraisingHubHeroStats
  hubTransparency: FundraisingHubTransparencyMeta
}) {
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
          className={`${displayFont("mx-auto mt-6 max-w-[22ch] text-[clamp(2.25rem,8vw,4.5rem)] font-black uppercase leading-[0.92] tracking-[-0.02em] text-white sm:mx-0")}`}
        >
          NC United <span className="text-[#C8A94A]">×</span> Fundraising
        </h1>

        <p className="mx-auto mt-6 max-w-2xl text-base font-medium leading-relaxed text-white sm:mx-0 sm:text-lg">
          NC wrestlers earn their development. Their community makes it possible. Every gift is tax-deductible to NC United and is
          credited to the athlete you choose at checkout—NC United absorbs card-processing fees so their campaign total reflects
          what you pay.
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
            <span className="text-[10px] font-extrabold uppercase tracking-[0.24em] text-[#C8A94A]">Race checkouts</span>
            <span className="mt-1 text-2xl font-black tabular-nums text-white sm:text-3xl">
              {hero.raceEntryCount.toLocaleString("en-US")}
            </span>
          </div>
        </div>

        {hero.ncUnitedCommunityFundCents > 0 ? (
          <p className="mx-auto mt-4 max-w-2xl text-xs leading-relaxed text-white/85 sm:mx-0">
            <span className="font-semibold text-white">NC United fund</span> — community programs, not tied to a single
            athlete: <span className="tabular-nums font-semibold text-white">{formatUsdWhole(hero.ncUnitedCommunityFundCents)}</span>
          </p>
        ) : null}

        <p className="mx-auto mt-4 max-w-2xl text-xs leading-relaxed text-white/90 sm:mx-0">
          <strong className="text-white">Raised</strong>, <strong className="text-white">Donations</strong>, and{" "}
          <strong className="text-white">Race checkouts</strong> summarize NC United hub fundraising for the last{" "}
          <span className="tabular-nums text-white">{hubTransparency.lookbackDays}</span> days — donations credited at
          checkout, plus paid event registrations run through hub campaigns. The{" "}
          <HardLink
            href={`/fundraising/leaderboard?campaign=all&days=${hubTransparency.lookbackDays}`}
            className="font-semibold text-[#C8A94A] underline-offset-4 hover:underline"
          >
            combined athlete leaderboard
          </HardLink>{" "}
          ranks athlete-credited gifts across every NC United hub campaign in that window.
        </p>

        <p className="mx-auto mt-2 max-w-2xl text-[11px] leading-relaxed text-white/55 sm:mx-0">
          When checkout uses the current timed race fundraiser ({hubTransparency.campaignDisplayName}), these headline figures
          reconcile with{" "}
          <HardLink href="/spartan" className="font-semibold text-[#C8A94A]/90 underline-offset-4 hover:underline">
            public Spartan totals
          </HardLink>{" "}
          on <span className="text-white/70">/spartan</span> for the same {hubTransparency.lookbackDays}-day window.
        </p>

        <p
          className={`${displayFont("mx-auto mt-4 max-w-2xl text-[11px] font-bold uppercase tracking-[0.2em] text-[#C8A94A] sm:mx-0")}`}
        >
          Raised in 16 days. Zero preparation. One community.
        </p>

        <div className="mx-auto mt-10 flex max-w-xl flex-col gap-4 sm:mx-0 sm:max-w-none sm:flex-row sm:flex-wrap sm:items-start">
          <HardLink
            href="/fundraising/athletes"
            className={`${displayFont("inline-flex min-h-[52px] flex-1 items-center justify-center rounded-sm bg-[#CC0000] px-8 text-sm font-extrabold uppercase tracking-[0.14em] text-white shadow-[0_18px_52px_-12px_rgba(204,0,0,0.65)] transition hover:bg-[#a80000] sm:flex-none sm:min-w-[240px]")}`}
          >
            Support an athlete →
          </HardLink>
          <HardLink
            href="/fundraising/training-fund"
            className={`${displayFont("inline-flex min-h-[52px] flex-1 items-center justify-center rounded-sm border-2 border-white/25 bg-transparent px-8 text-sm font-extrabold uppercase tracking-[0.14em] text-white transition hover:border-[#C8A94A]/60 hover:text-[#C8A94A] sm:flex-none sm:min-w-[240px]")}`}
          >
            Training fund →
          </HardLink>
          <div className="flex w-full flex-col items-center sm:w-auto sm:min-w-[200px] sm:items-start">
            <button
              type="button"
              disabled
              aria-disabled="true"
              aria-label="Scholarships — coming soon"
              className={`${displayFont(
                "inline-flex min-h-[52px] w-full cursor-not-allowed flex-col items-center justify-center rounded-sm border-2 border-white/15 bg-white/[0.04] px-8 py-2 text-sm font-extrabold uppercase tracking-[0.14em] text-white/45 sm:w-auto sm:min-w-[240px]",
              )}`}
            >
              Scholarships
            </button>
            <span
              className={`${displayFont("mt-2 text-center text-[10px] font-bold uppercase tracking-[0.18em] text-[#C8A94A]/75 sm:text-left")}`}
            >
              Coming soon
            </span>
          </div>
        </div>

        <p className="mx-auto mt-6 text-center text-xs text-white sm:mx-0 sm:text-left">
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
