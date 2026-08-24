import { TocVarsityHeading } from "@/components/toc/toc-theme"

export function TocStorySection() {
  return (
    <section className="py-12 sm:py-16 md:py-20 bg-white">
      <div className="container mx-auto w-full px-4 sm:px-6 max-w-3xl">
        <TocVarsityHeading as="h2" className="mb-4 sm:mb-6">
          Who&apos;s actually the best at each weight?
        </TocVarsityHeading>
        <div className="space-y-4 text-[#0B1D3A]/90 text-base sm:text-lg leading-relaxed">
          <p>
            North Carolina has always debated it. The Tournament of Champions settles it — eight hand-picked wrestlers
            per weight, up to twelve where the state is deep enough to earn it. NCAA collegiate classes plus 117 lbs.
            Every wrestler in the bracket was invited. Nobody is filling a slot.
          </p>
          <p>
            Other tournaments are something you compete in.{" "}
            <strong>This is something you come to watch.</strong> College coaches in the building, top-three placement,
            and a championship jacket that only goes to the bracket winner.
          </p>
        </div>
      </div>
    </section>
  )
}
