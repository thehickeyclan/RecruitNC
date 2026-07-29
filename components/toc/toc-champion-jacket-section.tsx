import Image from "next/image"
import { TocPatrioticBar, TocVarsityHeading, tocDisplayClass } from "@/components/toc/toc-theme"
import { TOC_BRAND, TOC_CHAMPION_JACKET, TOC_OFFICIAL_TEE, TOC_TROPHIES_AND_AWARDS } from "@/lib/toc/constants"
import { TocApparelCarousel } from "@/components/toc/toc-apparel-carousel"

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
                the bracket winner wears the jacket.
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

        <div
          id="trophies-awards"
          className="mt-10 sm:mt-14 rounded-2xl border border-white/15 bg-white/[0.06] p-4 sm:p-6"
        >
          <div className="grid gap-6 lg:grid-cols-[0.8fr_1.2fr] lg:items-end">
            <div>
              <p className={`text-[#D7B95A] text-sm sm:text-base mb-2 ${tocDisplayClass()} tracking-[0.18em] uppercase`}>
                Trophies & awards
              </p>
              <h3 className={`text-3xl sm:text-4xl text-white leading-none ${tocDisplayClass()}`}>
                A stage built around what wrestlers earn.
              </h3>
            </div>

            <ul className="grid gap-3 text-white/85 text-base leading-relaxed sm:text-lg md:grid-cols-3">
              {TOC_TROPHIES_AND_AWARDS.items.map((item) => (
                <li key={item} className="flex gap-3">
                  <span className="mt-2 h-2 w-2 shrink-0 rounded-full bg-[#D7B95A]" aria-hidden />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {TOC_TROPHIES_AND_AWARDS.featuredAwards.map((award) => (
              <article
                key={award.title}
                className="overflow-hidden rounded-xl border border-white/15 bg-[#06152c] shadow-2xl"
              >
                <div className="relative overflow-hidden border-b border-white/10 bg-white">
                  <Image
                    src={award.image.src}
                    alt={award.image.alt}
                    width={award.image.width}
                    height={award.image.height}
                    className="h-auto w-full object-cover"
                    sizes="(min-width: 1280px) 30vw, (min-width: 768px) 45vw, 100vw"
                  />
                </div>
                <div className="p-4 sm:p-5">
                  <p className={`text-xs text-[#D7B95A] ${tocDisplayClass()} tracking-[0.18em] uppercase`}>
                    {award.eyebrow}
                  </p>
                  <h4 className="mt-2 text-xl font-black text-white sm:text-2xl">{award.title}</h4>
                  <p className="mt-3 text-sm leading-relaxed text-white/78 sm:text-base">{award.description}</p>
                  {"highlight" in award && award.highlight ? (
                    <p className="mt-3 text-sm font-black leading-relaxed text-white sm:text-base">
                      {award.highlight}
                    </p>
                  ) : null}
                  <ul className="mt-4 grid gap-2 text-sm leading-relaxed text-white/78">
                    {award.bullets.map((bullet) => (
                      <li key={bullet} className="flex gap-2">
                        <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-[#CC0000]" aria-hidden />
                        <span>{bullet}</span>
                      </li>
                    ))}
                  </ul>
                  {"note" in award && award.note ? (
                    <p className="mt-4 rounded-lg border border-[#D7B95A]/30 bg-[#D7B95A]/10 p-3 text-xs leading-relaxed text-[#f1df9b] sm:text-sm">
                      {award.note}
                    </p>
                  ) : null}
                  {"closing" in award && award.closing ? (
                    <p className={`mt-4 text-[#D7B95A] ${tocDisplayClass()} tracking-[0.14em] uppercase`}>
                      {award.closing}
                    </p>
                  ) : null}
                </div>
              </article>
            ))}
          </div>
        </div>

        <div
          id="official-tee"
          className="mt-6 sm:mt-8 rounded-2xl border border-white/15 bg-[#06152c] p-4 shadow-2xl sm:p-6 lg:p-7 scroll-mt-24"
        >
          <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
            <TocApparelCarousel />

            <div>
              <p className={`text-[#D7B95A] text-sm sm:text-base mb-2 ${tocDisplayClass()} tracking-[0.18em] uppercase`}>
                {TOC_OFFICIAL_TEE.eyebrow}
              </p>
              <h3 className={`text-3xl sm:text-4xl text-white leading-none ${tocDisplayClass()}`}>
                {TOC_OFFICIAL_TEE.headline}
              </h3>
              <p className="mt-4 text-base leading-relaxed text-white/80 sm:text-lg">
                Navy, gold, and white — built to match the stage. The official tee and crewneck of the first-ever
                NC United Tournament of Champions.
              </p>
              <ul className="mt-5 space-y-3 text-sm leading-relaxed text-white/80 sm:text-base">
                {TOC_OFFICIAL_TEE.items.map((item) => (
                  <li key={item} className="flex gap-3">
                    <span className="mt-2 h-2 w-2 shrink-0 rounded-full bg-[#CC0000]" aria-hidden />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </div>

      <TocPatrioticBar />
    </section>
  )
}
