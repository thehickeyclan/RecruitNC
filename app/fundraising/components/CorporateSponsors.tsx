import Image from "next/image"
import { CORPORATE_SPONSORS } from "@/lib/fundraising/corporate-sponsors"

function displayFont(c: string) {
  return `font-[family-name:var(--font-fundraising-display)] ${c}`
}

export function CorporateSponsors() {
  if (CORPORATE_SPONSORS.length === 0) return null

  return (
    <section
      id="fundraising-corporate-sponsors"
      className="scroll-mt-28 border-b border-white/[0.07] bg-[#061224] px-4 py-12 sm:py-14"
      aria-labelledby="fundraising-sponsors-heading"
    >
      <div className="mx-auto max-w-6xl">
        <div className="text-center">
          <p className={`${displayFont("text-[10px] font-extrabold uppercase tracking-[0.28em] text-[#C8A94A]")}`}>
            Corporate partners
          </p>
          <h2
            id="fundraising-sponsors-heading"
            className={`${displayFont("mt-2 text-lg font-black uppercase tracking-wide text-white sm:text-xl")}`}
          >
            Thank you to our sponsors
          </h2>
          <p className="mx-auto mt-2 max-w-xl text-sm text-white/55">
            Organizations backing NC United athletes and year-round training. Visit their sites to learn more.
          </p>
        </div>

        <ul className="mt-10 flex flex-wrap items-center justify-center gap-6 sm:gap-10">
          {CORPORATE_SPONSORS.map((s) => (
            <li key={s.id}>
              <a
                href={s.href}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={`${s.name} — visit website (opens in new tab)`}
                title={s.logoAlt}
                className="group flex min-h-[140px] min-w-[min(100%,280px)] max-w-md flex-col items-center justify-center rounded-xl border border-white/10 bg-gradient-to-b from-black/75 to-black/90 px-6 py-6 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] transition hover:border-[#C8A94A]/35 hover:shadow-[0_20px_60px_-24px_rgba(0,0,0,0.85)] sm:min-h-[160px] sm:min-w-[320px] sm:px-8 sm:py-7"
              >
                <span className="relative block h-40 w-full max-w-[min(100%,420px)] sm:h-44">
                  <Image
                    src={s.logoSrc}
                    alt=""
                    fill
                    sizes="(max-width: 640px) 100vw, 420px"
                    className="object-contain object-center"
                  />
                </span>
                <span
                  className={`${displayFont("mt-3 text-[10px] font-bold uppercase tracking-[0.2em] text-[#C8A94A]/80 opacity-0 transition group-hover:opacity-100")}`}
                >
                  Visit partner site →
                </span>
              </a>
            </li>
          ))}
        </ul>
      </div>
    </section>
  )
}
