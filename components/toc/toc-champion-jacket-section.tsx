import Image from "next/image"
import { TocPatrioticBar, TocVarsityHeading, tocDisplayClass } from "@/components/toc/toc-theme"
import { TOC_BRAND, TOC_CHAMPION_JACKET } from "@/lib/toc/constants"

function JacketProductShot({
  side,
  label,
}: {
  side: keyof typeof TOC_CHAMPION_JACKET
  label: string
}) {
  const img = TOC_CHAMPION_JACKET[side]

  return (
    <div className="flex flex-col">
      <div
        className="relative overflow-hidden rounded-sm border-2 border-white/15 shadow-2xl"
        style={{ backgroundColor: TOC_BRAND.navyDeep }}
      >
        <Image
          src={img.src}
          alt={img.alt}
          width={img.width}
          height={img.height}
          className="h-auto w-full object-contain"
          sizes="(min-width: 1024px) 20vw, 45vw"
          priority={side === "front"}
        />
      </div>
      <p className={`mt-3 text-center text-white/50 text-xs ${tocDisplayClass()} tracking-widest uppercase`}>
        {label}
      </p>
    </div>
  )
}

export function TocChampionJacketSection() {
  return (
    <section id="champion-jacket" className="relative bg-[#0B1D3A] text-white overflow-hidden">
      <TocPatrioticBar />
      <div
        className="absolute inset-0 opacity-[0.07] pointer-events-none"
        style={{
          backgroundImage: `repeating-linear-gradient(
            90deg,
            transparent,
            transparent 48px,
            rgba(255,255,255,0.15) 48px,
            rgba(255,255,255,0.15) 49px
          )`,
        }}
        aria-hidden
      />

      <div className="container relative mx-auto w-full px-4 sm:px-6 py-12 sm:py-16 md:py-24 max-w-6xl">
        <div className="grid lg:grid-cols-2 gap-10 sm:gap-12 lg:gap-16 items-center">
          <div className="order-2 lg:order-1">
            <p className={`text-[#CC0000] text-base sm:text-lg mb-2 ${tocDisplayClass()}`}>Earned, not bought</p>
            <TocVarsityHeading as="h2" className="text-white leading-none mb-4 sm:mb-6 lg:text-6xl">
              The Champion Jacket
            </TocVarsityHeading>

            <div className="space-y-4 text-white/90 text-base sm:text-lg leading-relaxed">
              <p>
                One wrestler per weight earns the NC United Tournament of Champions jacket — navy with{" "}
                <strong className="text-white">NORTH CAROLINA</strong> across the chest and{" "}
                <strong className="text-white">CHAMPION</strong> across the back. Top three place on the podium; only
                the bracket winner wears it.
              </p>
              <p>
                Not merchandise — a keepsake you cannot buy. Red, white, and navy sleeve stripes with{" "}
                <strong className="text-white">2026</strong> and <strong className="text-white">CHAMPION</strong> on
                the back for the year you proved it.
              </p>
            </div>
          </div>

          <div className="order-1 lg:order-2">
            <div className="relative">
              <div className="absolute -inset-3 bg-gradient-to-br from-[#CC0000]/30 via-transparent to-white/10 rounded-2xl blur-sm" />
              <div
                className="relative grid grid-cols-2 gap-3 sm:gap-4 rounded-xl border-4 border-white/20 p-3 sm:p-4 shadow-2xl"
                style={{ backgroundColor: TOC_BRAND.navy }}
              >
                <JacketProductShot side="front" label="Front" />
                <JacketProductShot side="back" label="Back" />
              </div>
            </div>
            <p className={`mt-4 text-center text-white/50 text-xs ${tocDisplayClass()} tracking-widest`}>
              One champion · Each weight · 2026
            </p>
          </div>
        </div>
      </div>

      <TocPatrioticBar />
    </section>
  )
}
