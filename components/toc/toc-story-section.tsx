import { TocVarsityHeading } from "@/components/toc/toc-theme"

export function TocStorySection() {
  return (
    <section className="py-16 md:py-20 bg-white">
      <div className="container mx-auto px-4 max-w-3xl">
        <TocVarsityHeading as="h2" className="text-4xl md:text-5xl mb-6">
          Built for college-bound wrestlers
        </TocVarsityHeading>
        <div className="space-y-4 text-[#0B1D3A]/90 text-lg leading-relaxed">
          <p>
            The NC United Tournament of Champions is a two-day invitational for North Carolina&apos;s top-ranked high
            school wrestlers — competing at <strong>college weight classes</strong> with an eight-person bracket and true
            double-elimination at each weight.
          </p>
          <p>
            This is not another open tournament. The field is capped at <strong>88 athletes</strong> (eight per weight).
            Wrestlers are nominated, reviewed, and invited based on results, ranking, and trajectory.
          </p>
          <p>
            The <strong>champion</strong> at each weight earns the <strong>Champion jacket</strong> — navy, red, and
            white NC pride you wear long after the brackets are closed. Alongside the competition, families connect with college programs through a recruiting
            fair and education sessions scheduled around the wrestling.
          </p>
        </div>

        <div className="mt-10 grid sm:grid-cols-3 gap-4">
          {[
            { title: "Fill the field", desc: "Identify and invite the best at each weight." },
            { title: "Prove it on the mat", desc: "College weights, real brackets — win it to earn the jacket." },
            { title: "Earn the jacket", desc: "One champion per weight. Chest and back." },
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
