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

      <div className="container relative mx-auto px-4 py-16 md:py-24 max-w-6xl">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
          <div className="order-2 lg:order-1">
            <p className={`text-[#CC0000] text-lg mb-2 ${tocDisplayClass()}`}>Earned, not bought</p>
            <TocVarsityHeading as="h2" className="text-4xl md:text-5xl lg:text-6xl text-white leading-none mb-6">
              The Champion Jacket
            </TocVarsityHeading>

            <div className="space-y-4 text-white/90 text-lg leading-relaxed">
              <p>
                At each of eleven weight classes, <strong className="text-white">one wrestler</strong> earns the{" "}
                <strong className="text-white">NC United Tournament of Champions jacket</strong> — the bracket
                champion. Navy blue with arched <strong className="text-white">NORTH CAROLINA</strong> across the
                chest and <strong className="text-white">CHAMPION</strong> across the back.
              </p>
              <p>
                This is not merchandise. It is a{" "}
                <strong className="text-white">patriotic symbol of North Carolina wrestling</strong> — the same red,
                white, and navy you see on the sleeves, the NC silhouette on the arm, and{" "}
                <strong className="text-white">2026</strong> marking the year you proved it on the mat.
              </p>
              <p>
                Eight wrestlers per bracket. True double-elimination. Top four place on the podium — but only the
                champion wears the jacket. When you wear it, you are telling every coach and every fan in the
                building:{" "}
                <em className="text-white not-italic font-semibold">
                  I am the best in my weight in the state of North Carolina.
                </em>
              </p>
            </div>

            <ul className="mt-8 space-y-3 border-l-4 border-[#CC0000] pl-5">
              {[
                "Awarded to the champion at each college weight class — one per bracket",
                "Varsity-style NC branding — chest and back",
                "Red · white · navy sleeve stripes — classic patriotic athletic look",
                "A keepsake that outlasts any medal on a shelf",
              ].map((line) => (
                <li key={line} className="text-white/85 text-sm md:text-base">
                  {line}
                </li>
              ))}
            </ul>
          </div>

          <div className="order-1 lg:order-2 space-y-6">
            <div>
              <div className="relative overflow-hidden rounded-sm border-2 border-white/15 shadow-2xl">
                <Image
                  src="/images/toc/champion-jacket-presentation.png"
                  alt="Championship jacket presentation on the mat — spotlight, crowd, and NC United Tournament of Champions branding"
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
