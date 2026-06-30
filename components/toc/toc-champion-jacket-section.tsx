import Image from "next/image"
import { TocAiRenderingCaption } from "@/components/toc/toc-ai-rendering-caption"
import { TocPatrioticBar, TocVarsityHeading, tocDisplayClass } from "@/components/toc/toc-theme"

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
                <strong className="text-white">CHAMPION</strong> across the back. Top four place on the podium; only
                the bracket winner wears it.
              </p>
              <p>
                Not merchandise — a keepsake you cannot buy. Red, white, and navy sleeve stripes, NC silhouette on the
                arm, and 2026 on the sleeve for the year you proved it.
              </p>
            </div>
          </div>

          <div className="order-1 lg:order-2 space-y-6">
            <div>
              <div className="relative overflow-hidden rounded-sm border-2 border-white/15 shadow-2xl">
                <Image
                  src="/images/toc/champion-jacket-presentation.png"
                  alt="Championship jacket presentation on the mat — crowd and NC United Tournament of Champions branding"
                  width={1536}
                  height={1024}
                  className="h-auto w-full"
                  sizes="(min-width: 1024px) 40vw, 100vw"
                  priority
                />
              </div>
              <TocAiRenderingCaption variant="dark" />
            </div>

            <div className="relative w-full max-w-sm mx-auto">
              <div className="absolute -inset-3 bg-gradient-to-br from-[#CC0000]/30 via-transparent to-white/10 rounded-2xl blur-sm" />
              <div className="relative rounded-xl overflow-hidden border-4 border-white/20 shadow-2xl bg-[#060f1f]">
                <Image
                  src="/images/toc/champion-jacket.png"
                  alt="NC United Tournament of Champions jacket — navy with NORTH CAROLINA on front and CHAMPION on back, red and white sleeve stripes, 2026 and NC state silhouette"
                  width={800}
                  height={900}
                  className="w-full h-auto object-contain"
                />
              </div>
              <TocAiRenderingCaption variant="dark" className="text-center" />
              <p className={`mt-3 text-center text-white/50 text-xs ${tocDisplayClass()} tracking-widest`}>
                One champion · Each weight · 2026
              </p>
            </div>
          </div>
        </div>
      </div>

      <TocPatrioticBar />
    </section>
  )
}
