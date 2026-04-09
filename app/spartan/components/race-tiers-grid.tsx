import { SPARTAN_SUPER_10K } from "../data"
import { FayettevilleScheduleCallout } from "./fayetteville-schedule-callout"
import { RaceTierCard } from "./race-tier-card"
import { SpartanDonateMissionCard } from "./spartan-donate-mission-card"

export function RaceTiersGrid() {
  return (
    <section id="races" className="scroll-mt-4 bg-black py-16 md:py-24">
      <div className="mx-auto max-w-6xl px-4">
        <div className="mx-auto max-w-3xl text-center">
          <p className="font-[family-name:var(--font-barlow-spartan)] text-[11px] font-semibold uppercase tracking-[0.22em] text-[#C8A94A]">
            Team NC
          </p>
          <h2 className="mt-3 font-[family-name:var(--font-barlow-spartan)] text-[clamp(1.75rem,5vw,2.75rem)] font-extrabold uppercase leading-tight tracking-tight text-white">
            Come race with us
          </h2>
          <p className="mt-4 text-base text-[#a3a3a3]">
            The <strong className="text-[#ccc]">10K team race</strong> with Team NC (Spartan Super 10K)—or{" "}
            <strong className="text-[#ccc]">donate without racing</strong> and choose the general fund or a wrestler on
            the same secure form.
          </p>
        </div>

        <FayettevilleScheduleCallout />

        <div className="mx-auto mt-12 grid max-w-4xl gap-6 md:grid-cols-2">
          <RaceTierCard tier={SPARTAN_SUPER_10K} />
          <SpartanDonateMissionCard />
        </div>

        <p className="mx-auto mt-10 max-w-3xl text-center font-[family-name:var(--font-barlow-spartan)] text-[11px] font-medium uppercase leading-relaxed tracking-[0.12em] text-[#C8A94A]/90 md:text-xs">
          Gifts to NC United are fully tax-deductible. NC United is a registered 501(c)(3) nonprofit. Spartan sends race entry
          codes after NC United shares donor information with their team — timing follows their process.
        </p>
      </div>
    </section>
  )
}
