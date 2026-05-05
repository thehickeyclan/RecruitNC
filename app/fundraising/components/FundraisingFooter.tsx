import Image from "next/image"
import { HardLink } from "@/components/hard-link"

function displayFont(c: string) {
  return `font-[family-name:var(--font-fundraising-display)] ${c}`
}

export function FundraisingFooter() {
  return (
    <footer className="border-t border-white/10 bg-[#020812] px-4 py-14 text-white">
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
            EIN: <span className="tabular-nums text-white">99-3757238</span> · All donations are fully tax-deductible to
            the extent allowed by law.
          </p>
          <p>
            <a
              href="mailto:info@ncwrestlingunited.com"
              className="font-semibold text-[#C8A94A] underline-offset-4 hover:underline"
            >
              info@ncwrestlingunited.com
            </a>
          </p>
        </div>

        <nav aria-label="Fundraising hub links" className="flex w-full max-w-2xl flex-col gap-6 text-sm">
          <div className={`${displayFont("flex flex-wrap items-center justify-center gap-x-4 gap-y-2")}`}>
            <HardLink href="/fundraising/athletes" className="text-white/90 hover:text-[#C8A94A]">
              Athlete profiles
            </HardLink>
            <span className="text-white/25" aria-hidden>
              ·
            </span>
            <HardLink href="/fundraising#fundraising-active-campaigns" className="text-white/90 hover:text-[#C8A94A]">
              Active campaigns
            </HardLink>
            <span className="text-white/25" aria-hidden>
              ·
            </span>
            <HardLink href="/fundraising/leaderboard" className="text-white/90 hover:text-[#C8A94A]">
              Leaderboard
            </HardLink>
            <span className="text-white/25" aria-hidden>
              ·
            </span>
            <HardLink href="/fundraising#fundraising-live-donor-stream" className="text-white/90 hover:text-[#C8A94A]">
              Live feed
            </HardLink>
          </div>
          <div className={`${displayFont("flex flex-wrap items-center justify-center gap-x-4 gap-y-2")}`}>
            <HardLink href="/fundraising/honor-roll" className="text-white/90 hover:text-[#C8A94A]">
              Honor roll
            </HardLink>
            <span className="text-white/25" aria-hidden>
              ·
            </span>
            <HardLink href="/fundraising/corporate" className="text-white/90 hover:text-[#C8A94A]">
              Corporate partners
            </HardLink>
            <span className="text-white/25" aria-hidden>
              ·
            </span>
            <HardLink href="/fundraising/playbook/guide" className="text-white/90 hover:text-[#C8A94A]">
              Fundraising playbook
            </HardLink>
            <span className="text-white/25" aria-hidden>
              ·
            </span>
            <HardLink href="/fundraising/playbook" className="text-white/90 hover:text-[#C8A94A]">
              Staff sign-in
            </HardLink>
          </div>
        </nav>
      </div>
    </footer>
  )
}
