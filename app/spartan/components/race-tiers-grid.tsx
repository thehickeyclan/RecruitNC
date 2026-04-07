import { SPARTAN_RACE_TIERS } from "../data"
import { JustDonateCard } from "./just-donate-card"
import { RaceTierCard } from "./race-tier-card"

export function RaceTiersGrid() {
  return (
    <section id="races" className="scroll-mt-4 bg-black py-16 md:py-24">
      <div className="mx-auto max-w-6xl px-4">
        <div className="mx-auto max-w-3xl text-center">
          <p className="font-[family-name:var(--font-barlow-spartan)] text-[11px] font-semibold uppercase tracking-[0.22em] text-[#C8A94A]">
            Choose your challenge
          </p>
          <h2 className="mt-3 font-[family-name:var(--font-barlow-spartan)] text-[clamp(1.75rem,5vw,2.75rem)] font-extrabold uppercase leading-tight tracking-tight text-white">
            Pick your distance
          </h2>
          <p className="mt-4 text-base text-[#a3a3a3]">
            Donate to NC United. Get your Spartan entry code. Every dollar funds NC wrestlers.
          </p>
        </div>

        <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {SPARTAN_RACE_TIERS.map((tier) => (
            <RaceTierCard key={tier.id} tier={tier} />
          ))}
          <JustDonateCard />
        </div>

        <p className="mx-auto mt-10 max-w-3xl text-center font-[family-name:var(--font-barlow-spartan)] text-[11px] font-medium uppercase leading-relaxed tracking-[0.12em] text-[#C8A94A]/90 md:text-xs">
          All donations are fully tax-deductible. NC United is a registered 501(c)(3) nonprofit. Race entry codes arrive
          within 48 hours of donation.
        </p>
      </div>
    </section>
  )
}
