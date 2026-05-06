import { Heart, Search } from "lucide-react"
import { HardLink } from "@/components/hard-link"
import { ScholarshipsInterestNotifyCard } from "./scholarships-interest-notify"

function displayFont(c: string) {
  return `font-[family-name:var(--font-fundraising-display)] ${c}`
}

const STEPS = [
  {
    n: "01",
    title: "Choose the beneficiary",
    body: "Pick a specific wrestler or the NC United Training Fund — gift credit follows your choice at checkout.",
  },
  {
    n: "02",
    title: "Secure checkout",
    body: "Complete payment through NC United&apos;s nonprofit Stripe checkout — encrypted like any major retailer.",
  },
  {
    n: "03",
    title: "Receipt & tax documentation",
    body: "When your gift qualifies as tax-deductible, documentation arrives by email — NC United is a 501(c)(3); ask your advisor about your return.",
  },
] as const

const GIVE_PATHS = [
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
] as const

export function HowItWorks() {
  return (
    <section
      id="fundraising-how-it-works"
      className="border-b border-white/[0.06] bg-[#061224] px-4 py-16 text-white sm:py-20"
      aria-labelledby="fundraising-how-it-works-heading"
    >
      <div className="mx-auto max-w-6xl">
        <div className="flex flex-col gap-2 text-center sm:text-left">
          <p className={`${displayFont("text-[10px] font-extrabold uppercase tracking-[0.28em] text-[#C8A94A]")}`}>New here</p>
          <h2
            id="fundraising-how-it-works-heading"
            className={`${displayFont("text-[clamp(1.35rem,3.5vw,2rem)] font-black uppercase tracking-tight text-white sm:text-[clamp(1.5rem,4vw,2.35rem)]")}`}
          >
            How giving works
          </h2>
          <p className="mx-auto max-w-2xl text-sm leading-relaxed text-white/70 sm:mx-0">
            Choose athlete or NC United Training Fund → secure nonprofit checkout → email receipt and tax documentation when your gift qualifies.
          </p>
        </div>

        <ol className="mt-8 grid list-none gap-5 sm:mt-10 sm:grid-cols-3 sm:gap-6">
          {STEPS.map((s) => (
            <li
              key={s.n}
              className="flex gap-4 rounded-xl border border-white/10 bg-[#0B2545]/45 px-4 py-5 sm:flex-col sm:gap-3 sm:px-5 sm:py-6"
            >
              <span
                className={`${displayFont("flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border border-[#C8A94A]/35 bg-[#CC0000]/12 text-sm font-black tabular-nums text-[#C8A94A]")}`}
                aria-hidden
              >
                {s.n}
              </span>
              <div className="min-w-0">
                <h3 className={`${displayFont("text-sm font-extrabold uppercase tracking-wide text-white sm:text-base")}`}>
                  {s.title}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-white/80">{s.body}</p>
              </div>
            </li>
          ))}
        </ol>

        <div
          id="fundraising-two-ways-give"
          className="mx-auto mt-14 border-t border-white/10 pt-14 text-center sm:mt-16 sm:text-left"
          aria-labelledby="fundraising-two-ways-heading"
        >
          <p className={`${displayFont("text-[10px] font-extrabold uppercase tracking-[0.28em] text-[#C8A94A]")}`}>Start here</p>
          <h3
            id="fundraising-two-ways-heading"
            className={`${displayFont("mt-3 text-[clamp(1.25rem,3.5vw,1.75rem)] font-black uppercase tracking-tight text-white")}`}
          >
            Two ways to give
          </h3>
          <p className="mx-auto mt-3 max-w-2xl text-sm leading-relaxed text-white/72 sm:mx-0">
            Pick a wrestler or give to the NC United Training Fund — email receipt and NC United credit either way. Scholarships are separate
            farther down; sponsors appear later on this page.
          </p>

          <ul className="mx-auto mt-10 grid max-w-4xl list-none gap-6 sm:grid-cols-2">
            {GIVE_PATHS.map((c) => {
              const Icon = c.icon
              return (
                <li
                  key={c.href}
                  className="flex h-full flex-col rounded-xl border border-white/10 bg-[#0B2545]/55 p-6 text-left shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]"
                >
                  <div className="flex flex-1 items-start gap-4">
                    <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg border border-[#CC0000]/35 bg-[#CC0000]/12 text-[#ffb4b4]">
                      <Icon className="h-5 w-5" aria-hidden />
                    </span>
                    <div className="min-w-0 flex-1">
                      <h4 className={`${displayFont("text-lg font-black uppercase leading-snug tracking-tight text-white")}`}>
                        {c.headline}
                      </h4>
                      <p className="mt-3 text-sm leading-relaxed text-white">{c.body}</p>
                    </div>
                  </div>
                  <HardLink
                    href={c.href}
                    className={`${displayFont(
                      "mt-8 inline-flex min-h-[52px] w-full touch-manipulation items-center justify-center rounded-sm bg-[#CC0000] px-6 text-sm font-extrabold uppercase tracking-[0.14em] text-white shadow-[0_18px_52px_-12px_rgba(204,0,0,0.65)] transition hover:bg-[#a80000]",
                    )}`}
                  >
                    {c.cta}
                  </HardLink>
                </li>
              )
            })}
          </ul>
        </div>

        <div
          id="fundraising-scholarships-soon"
          className="mx-auto mt-16 max-w-xl scroll-mt-28 border-t border-white/10 pt-14 text-center"
        >
          <p className={`${displayFont("text-[10px] font-extrabold uppercase tracking-[0.26em] text-[#C8A94A]/95")}`}>Coming soon</p>
          <h3 className={`${displayFont("mt-3 text-xl font-black uppercase tracking-tight text-white sm:text-2xl")}`}>
            Training scholarships
          </h3>
          <p className="mx-auto mt-3 max-w-lg text-sm leading-relaxed text-white/68">
            Not part of today&apos;s giving checkout — NC United will open need- and merit-based scholarships later. Leave your email to hear when
            applications and funding details go live.
          </p>
          <div className="mx-auto mt-8 text-left">
            <ScholarshipsInterestNotifyCard />
          </div>
        </div>
      </div>
    </section>
  )
}
