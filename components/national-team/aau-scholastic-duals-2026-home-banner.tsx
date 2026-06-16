import Image from "next/image"
import { ArrowRight } from "lucide-react"
import { HardLink } from "@/components/hard-link"
import {
  AAU_SCHOLASTIC_DUALS_2026_BANNER,
} from "@/lib/aau-scholastic-duals-2026-content"
import { cn } from "@/lib/utils"

type AauScholasticDuals2026HomeBannerProps = {
  className?: string
}

/** Homepage promo — AAU Scholastic Duals 2026 National Team banner. */
export function AauScholasticDuals2026HomeBanner({ className }: AauScholasticDuals2026HomeBannerProps) {
  return (
    <section
      className={cn("relative overflow-hidden border-b border-[#B31B1B]/30 bg-[#0A1628]", className)}
      aria-label="AAU Scholastic Duals 2026 — NC United National Team"
    >
      <div className="container mx-auto px-4 py-6 md:py-8">
        <HardLink
          href="/news/aau-scholastic-duals-2026-florida"
          className="group block overflow-hidden rounded-xl border border-white/10 bg-[#0A1628] shadow-lg transition-shadow hover:shadow-xl"
        >
          <Image
            src={AAU_SCHOLASTIC_DUALS_2026_BANNER}
            alt="North Carolina National Team — AAU Wrestling Scholastic Duals, Fort Lauderdale, June 24–26, 2026"
            width={1200}
            height={675}
            className="block h-auto w-full"
            sizes="100vw"
            priority
          />
        </HardLink>

        <div className="mt-4 flex justify-center">
          <HardLink
            href="/news/aau-scholastic-duals-2026-florida"
            className="inline-flex min-h-[48px] items-center justify-center rounded-xl bg-[#B31B1B] px-5 py-2.5 text-sm sm:text-base font-bold text-white shadow-lg transition hover:bg-[#9a1616]"
          >
            Read the story
            <ArrowRight className="ml-2 h-5 w-5" aria-hidden />
          </HardLink>
        </div>
      </div>
    </section>
  )
}
