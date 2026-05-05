import Image from "next/image"
import { CORPORATE_SPONSORS } from "@/lib/fundraising/corporate-sponsors"
import { HardLink } from "@/components/hard-link"

function displayFont(c: string) {
  return `font-[family-name:var(--font-fundraising-display)] ${c}`
}

export function CorporatePartners() {
  if (CORPORATE_SPONSORS.length === 0) return null

  return (
    <section
      id="fundraising-corporate-partners"
      className="scroll-mt-28 border-b border-white/[0.06] bg-[#061224] px-4 py-16 text-white sm:py-20"
    >
      <div className="mx-auto max-w-6xl text-center">
        <p className={`${displayFont("text-[10px] font-extrabold uppercase tracking-[0.28em] text-[#C8A94A]")}`}>
          Corporate partners
        </p>
        <h2 className={`${displayFont("mt-3 text-2xl font-black uppercase tracking-tight text-white sm:text-3xl")}`}>
          Thank you to our sponsors
        </h2>
        <p className="mx-auto mt-3 max-w-2xl text-sm text-white">
          Organizations backing NC United athletes and year-round training.
        </p>

        <ul className="mt-12 flex flex-wrap items-center justify-center gap-8 sm:gap-12">
          {CORPORATE_SPONSORS.map((s) => (
            <li key={s.id}>
              <a
                href={s.href}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={`${s.name} — visit website (opens in new tab)`}
                className="group flex flex-col items-center"
              >
                <span className="relative block h-28 w-40 sm:h-32 sm:w-48">
                  <Image
                    src={s.logoSrc}
                    alt={s.logoAlt}
                    fill
                    className="object-contain object-center transition group-hover:opacity-90"
                    sizes="(max-width: 640px) 160px, 192px"
                  />
                </span>
              </a>
            </li>
          ))}
        </ul>

        <HardLink
          href="/fundraising/corporate"
          className={`${displayFont("mt-10 inline-flex min-h-12 items-center justify-center rounded-sm border-2 border-[#C8A94A]/50 px-8 text-xs font-extrabold uppercase tracking-[0.14em] text-[#C8A94A] hover:bg-[#C8A94A]/10")}`}
        >
          Become a corporate partner →
        </HardLink>
      </div>
    </section>
  )
}
