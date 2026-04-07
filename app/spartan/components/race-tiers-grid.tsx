import { SPARTAN_RACE_TIERS } from "../data"
import { RaceTierCard } from "./race-tier-card"

export function RaceTiersGrid() {
  return (
    <section id="races" className="scroll-mt-4 bg-[#0A0A0A] py-16 md:py-24">
      <div className="mx-auto max-w-6xl px-4">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="font-[family-name:var(--font-barlow-spartan)] text-3xl font-bold uppercase tracking-tight text-white md:text-4xl">
            Choose your challenge
          </h2>
          <p className="mt-3 text-[#999]">
            Every registration directly funds NC United athletes. Pick your distance — ticketing links will be updated as
            Spartan finalizes codes for Fayetteville.
          </p>
        </div>
        <div className="mt-12 grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
          {SPARTAN_RACE_TIERS.map((tier) => (
            <RaceTierCard key={tier.id} tier={tier} />
          ))}
        </div>
      </div>
    </section>
  )
}
