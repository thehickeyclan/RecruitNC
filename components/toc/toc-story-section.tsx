import { TocVarsityHeading } from "@/components/toc/toc-theme"

const TAGLINES = [
  "You don't enter. You get the call.",
  "College weights. Stacked draws. Single-mat finals.",
  "One mat. One champion. No excuses.",
] as const

export function TocStorySection() {
  return (
    <section className="py-16 md:py-20 bg-white">
      <div className="container mx-auto px-4 max-w-3xl">
        <TocVarsityHeading as="h2" className="text-4xl md:text-5xl mb-6">
          Who&apos;s actually the best at each weight?
        </TocVarsityHeading>
        <div className="space-y-4 text-[#0B1D3A]/90 text-lg leading-relaxed">
          <p>
            The NC United Tournament of Champions is the answer — <strong>by invitation only</strong>, not open
            registration. Eighty-eight wrestlers, hand-picked at each weight.
          </p>
          <p>
            No byes to coast through, no soft early rounds — every match is a fight because every name earned its spot.
            We wrestle <strong>NCAA collegiate weight classes plus 117 lbs</strong> — eleven brackets total — because
            that&apos;s where these athletes are headed, and the lightest weights deserve a real stage too.
          </p>
          <p>
            True double-elimination. Top-four placement. <strong>Two mats</strong> from opening rounds through placement
            bouts — then the building narrows to <strong>one mat under the lights</strong> for championship finals. College
            coaches in the building. A championship jacket on the line
            and a title that only means something because of who you had to beat to get it.
          </p>
          <p>
            Other tournaments are something you compete in.{" "}
            <strong>This is something you come to watch.</strong> Great wrestling. Great entertainment. One building. The
            best in the state, in one weekend.
          </p>
        </div>

        <ul className="mt-10 flex flex-wrap gap-3 list-none p-0">
          {TAGLINES.map((line) => (
            <li
              key={line}
              className="rounded-sm border-2 border-[#0B1D3A]/15 bg-[#f8f9fb] px-4 py-2 text-sm font-semibold text-[#0B1D3A] border-l-4 border-l-[#CC0000]"
            >
              {line}
            </li>
          ))}
        </ul>

        <div className="mt-10 grid sm:grid-cols-3 gap-4">
          {[
            {
              title: "By invitation only",
              desc: "Eight per weight. The field is built by hand — you don't register your way in.",
            },
            {
              title: "Built like a show",
              desc: "Two mats all weekend — then one mat under the lights when the titles are on the line.",
            },
            {
              title: "Earn the jacket",
              desc: "One champion per weight. The most visible prize in NC high school wrestling.",
            },
          ].map((g) => (
            <div
              key={g.title}
              className="rounded-sm border-2 border-[#0B1D3A]/10 p-5 bg-[#f8f9fb] border-t-4 border-t-[#CC0000]"
            >
              <h3 className="font-bold text-[#0B1D3A] uppercase tracking-wide text-sm">{g.title}</h3>
              <p className="text-sm text-muted-foreground mt-2">{g.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
