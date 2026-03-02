"use client"

import Image from "next/image"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { ChevronRight } from "lucide-react"
import { CAMPAIGN_COPY } from "@/lib/campaign-shoe-2026-copy"
import { OPTION_DISPLAY } from "@/lib/campaign-shoe-2026"

const WINNING_SHOE_OPTION = "A" as const
const WINNING_SHOE_IMAGE = "/campaign/shoe-option-a.png"

export function ShoeRaffleHero() {
  const winningName = OPTION_DISPLAY[WINNING_SHOE_OPTION].name

  return (
    <section
      className="relative w-full bg-primary text-primary-foreground overflow-hidden"
      aria-label="First Flight — Official 2026 NC United Shoe"
    >
      <div className="container mx-auto px-4 py-10 md:py-14 lg:py-16">
        <div className="max-w-4xl mx-auto flex flex-col md:flex-row items-center gap-8 md:gap-12">
          {/* Lead: winning sneaker image */}
          <div className="flex-shrink-0 w-full max-w-[280px] md:max-w-[320px] mx-auto md:mx-0 order-2 md:order-1">
            <div className="relative w-full aspect-square rounded-2xl overflow-hidden bg-white border-2 border-white/40 shadow-xl">
              <Image
                src={WINNING_SHOE_IMAGE}
                alt={winningName}
                fill
                className="object-contain p-4"
                sizes="(max-width: 768px) 280px, 320px"
                priority
                unoptimized
              />
            </div>
            <p className="text-center md:text-left mt-2 text-sm font-medium text-primary-foreground/90">
              {winningName}
            </p>
          </div>

          {/* Copy + CTA */}
          <div className="flex-1 text-center md:text-left order-1 md:order-2">
            <div className="inline-flex items-center gap-2 rounded-full bg-primary-foreground/15 px-3 py-1 text-xs font-medium mb-3">
              <span>{CAMPAIGN_COPY.heroWinningLabel}</span>
            </div>
            <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight mb-3">
              {CAMPAIGN_COPY.heroHeadline}
            </h1>
            <p className="text-base md:text-lg text-primary-foreground/90 mb-4">
              {CAMPAIGN_COPY.heroCta}
            </p>
            {CAMPAIGN_COPY.heroUrgency ? (
              <p className="text-sm text-primary-foreground/80 mb-6">
                {CAMPAIGN_COPY.heroUrgency}
              </p>
            ) : null}
            <Button
              asChild
              size="lg"
              className="bg-accent hover:bg-accent/90 text-accent-foreground font-semibold text-base px-6 py-5 rounded-lg shadow-lg"
            >
              <Link
                href="https://v0-new-college-commits-l0vrkmn4p-matthickey-gyaanais-projects.vercel.app/news/first-flight-2026-nc-united-shoe"
                target="_blank"
                rel="noopener noreferrer"
              >
                See the shoe & story
                <ChevronRight className="ml-2 h-5 w-5" />
              </Link>
            </Button>
          </div>
        </div>
      </div>
    </section>
  )
}
