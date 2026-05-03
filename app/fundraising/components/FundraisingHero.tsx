import type { FundraisingHubHeroStats } from "@/lib/fundraising/hub-data"

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
  return (
    <section
      className="relative overflow-hidden border-b border-white/[0.08] px-4 pb-20 pt-12 sm:pb-28 sm:pt-16"
      style={{ backgroundColor: NAVY }}
    >
      {/* Tactical grid + wash */}
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

      <div className="relative mx-auto max-w-6xl">
        <div className="flex flex-wrap items-center gap-3">
          <span
            className={`${displayFont("inline-flex items-center rounded border border-[#CC0000]/50 bg-[#CC0000]/15 px-3 py-1 text-[10px] font-extrabold uppercase tracking-[0.22em] text-[#ffb3b3]")}`}
          >
            Live ops
          </span>
          <span className={`${displayFont("text-[11px] font-bold uppercase tracking-[0.32em]")}`} style={{ color: GOLD }}>
            501(c)(3) central command
          </span>
        </div>

        <h1
          className={`${displayFont("mt-6 max-w-[20ch] text-[clamp(2.5rem,7vw,4.25rem)] font-black uppercase leading-[0.95] tracking-[-0.02em] text-white")}`}
        >
          NC United <span className="text-[#C8A94A]">×</span> Fundraising
        </h1>

        <p className="mt-6 max-w-2xl text-lg font-medium leading-relaxed text-white/88 sm:text-xl">
          Every gift is tax-deductible and goes directly to NC wrestler development — pool or athlete credit at checkout.
        </p>

        <dl className="mt-14 grid gap-4 sm:grid-cols-3">
          {[
            { label: "Total raised", value: formatUsdWhole(hero.totalRaisedCents) },
            { label: "Total donors", value: hero.totalDonors.toLocaleString("en-US") },
            { label: "Athletes funded", value: hero.athletesFunded.toLocaleString("en-US") },
          ].map((s) => (
            <div
              key={s.label}
              className="relative overflow-hidden rounded-lg border border-white/12 bg-black/30 pl-5 pr-4 py-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.06),0_20px_50px_-24px_rgba(0,0,0,0.9)] backdrop-blur-sm before:absolute before:left-0 before:top-0 before:h-full before:w-1 before:bg-[#CC0000]"
            >
              <dt className={`${displayFont("text-[10px] font-bold uppercase tracking-[0.24em] text-white/45")}`}>
                {s.label}
              </dt>
              <dd
                className={`${displayFont("mt-3 text-[clamp(1.75rem,4vw,2.35rem)] font-black tabular-nums tracking-tight text-white")}`}
              >
                {s.value}
              </dd>
            </div>
          ))}
        </dl>

        <div className="mt-12 flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-center">
          <a
            href="#fundraising-active-campaigns"
            className={`${displayFont("inline-flex min-h-[54px] items-center justify-center rounded-sm bg-[#CC0000] px-12 text-[15px] font-extrabold uppercase tracking-[0.16em] text-white shadow-[0_18px_52px_-12px_rgba(204,0,0,0.65)] transition hover:bg-[#a80000] active:scale-[0.99]")}`}
          >
            Support an Athlete
          </a>
          <div
            className={`${displayFont("flex items-center gap-2 rounded border border-white/20 bg-white/[0.06] px-4 py-3 text-[11px] font-bold uppercase tracking-wider text-white/75")}`}
          >
            <span className="inline-block h-2 w-2 animate-pulse rounded-full bg-[#C8A94A]" aria-hidden />
            <span>
              EIN <span className="tabular-nums text-white">99-3757238</span>
            </span>
          </div>
        </div>
      </div>
    </section>
  )
}
