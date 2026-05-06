import { Building2, Heart, Search } from "lucide-react"
import { HardLink } from "@/components/hard-link"
import { ScholarshipsInterestNotifyCard } from "./scholarships-interest-notify"

function displayFont(c: string) {
  return `font-[family-name:var(--font-fundraising-display)] ${c}`
}

const CARDS = [
  {
    icon: Search,
    headline: "Support a Wrestler",
    body: "Search by name and donate directly to a specific athlete's training fund.",
    cta: "Search athletes →",
    href: "/fundraising/athletes",
  },
  {
    icon: Heart,
    headline: "Support the Training Fund",
    body: "Tax-deductible giving to the NC United Training Fund — supporting wrestlers who need help training and competing nationally, year-round.",
    cta: "Give now →",
    href: "/fundraising/training-fund",
  },
  {
    icon: Building2,
    headline: "Corporate Partners",
    body: "Businesses and foundations — tax-deductible giving with recognition tiers and matching gift support.",
    cta: "Partner with us →",
    href: "/fundraising/corporate",
  },
] as const

export function NavigationPaths() {
  return (
    <section className="border-b border-white/[0.06] bg-[#0F2D5A] px-4 py-16 text-white sm:py-20">
      <div className="mx-auto max-w-6xl">
        <p className={`${displayFont("text-center text-[10px] font-extrabold uppercase tracking-[0.28em] text-[#C8A94A]")}`}>
          Where to go
        </p>
        <h2
          className={`${displayFont("mt-3 text-center text-[clamp(1.65rem,4vw,2.35rem)] font-black uppercase tracking-tight text-white")}`}
        >
          Four paths
        </h2>
        <p className="mx-auto mt-4 max-w-2xl text-center text-sm leading-relaxed text-white/75">
          Three active ways to give — secure nonprofit checkout, email receipts, and clear credit to an athlete or the training fund. Training
          scholarships are coming soon; join the notify list to hear first.
        </p>
        <ul className="mt-12 grid list-none gap-5 sm:grid-cols-2 lg:grid-cols-4 lg:gap-6">
          {CARDS.map((c) => {
            const Icon = c.icon
            return (
              <li
                key={c.href}
                className="flex h-full flex-col rounded-xl border border-white/10 bg-[#0B2545]/55 p-6 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]"
              >
                <div className="flex flex-1 items-start gap-4">
                  <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg border border-[#CC0000]/35 bg-[#CC0000]/12 text-[#ffb4b4]">
                    <Icon className="h-5 w-5" aria-hidden />
                  </span>
                  <div className="min-w-0 flex-1">
                    <h3 className={`${displayFont("text-lg font-black uppercase leading-snug tracking-tight text-white")}`}>
                      {c.headline}
                    </h3>
                    <p className="mt-3 text-sm leading-relaxed text-white">{c.body}</p>
                  </div>
                </div>
                <HardLink
                  href={c.href}
                  className={`${displayFont("mt-6 inline-flex min-h-11 items-center text-xs font-extrabold uppercase tracking-[0.18em] text-[#C8A94A] underline-offset-4 hover:underline")}`}
                >
                  {c.cta}
                </HardLink>
              </li>
            )
          })}
          <ScholarshipsInterestNotifyCard />
        </ul>
      </div>
    </section>
  )
}
