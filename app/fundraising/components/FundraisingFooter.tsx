import Image from "next/image"
import { HardLink } from "@/components/hard-link"

function displayFont(c: string) {
  return `font-[family-name:var(--font-fundraising-display)] ${c}`
}

const FOOTER_LINK_CLASS = displayFont(
  "flex min-h-[48px] touch-manipulation items-center justify-center rounded-lg px-4 py-2 text-center text-white/90 transition hover:bg-white/[0.06] hover:text-[#C8A94A] sm:min-h-0 sm:inline-flex sm:justify-start sm:px-2 sm:py-1",
)

export function FundraisingFooter() {
  return (
    <footer className="border-t border-white/10 bg-[#020812] px-4 pb-[max(2rem,env(safe-area-inset-bottom))] pt-14 text-white">
      <div className="mx-auto flex max-w-6xl flex-col items-center gap-10 text-center">
        <Image
          src="/images/nc-united-stacked-logo-white.png"
          alt="NC United Wrestling"
          width={180}
          height={72}
          className="h-14 w-auto opacity-95"
        />
        <div className="max-w-xl space-y-3 text-sm leading-relaxed text-white/90">
          <p>
            NC United Wrestling is a registered 501(c)(3) nonprofit.
            <br />
            EIN: <span className="tabular-nums text-white">99-3757238</span> · Contributions may be deductible to the
            extent permitted by IRC rules and each donor&apos;s situation — confirm with your tax advisor.
          </p>
          <p>
            <a
              href="mailto:info@ncwrestlingunited.com"
              className="inline-flex min-h-[48px] touch-manipulation items-center justify-center rounded-lg px-2 font-semibold text-[#C8A94A] underline-offset-4 hover:underline sm:min-h-0 sm:inline"
            >
              info@ncwrestlingunited.com
            </a>
          </p>
        </div>

        <nav aria-label="Giving hub links" className={`${displayFont("w-full max-w-2xl space-y-4 text-sm")}`}>
          <div className="grid grid-cols-1 gap-1 sm:flex sm:flex-wrap sm:items-center sm:justify-center sm:gap-x-2 sm:gap-y-2">
            <HardLink href="/fundraising/scholarships" className={FOOTER_LINK_CLASS}>
              Scholarships
            </HardLink>
            <span className="hidden text-white/25 sm:inline" aria-hidden>
              ·
            </span>
            <HardLink href="/fundraising/training-fund" className={FOOTER_LINK_CLASS}>
              Give to NC United
            </HardLink>
          </div>
        </nav>
      </div>
    </footer>
  )
}
