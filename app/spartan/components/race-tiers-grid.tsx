import { SPARTAN_SUPER_10K } from "../data"
import { FayettevilleScheduleCallout } from "./fayetteville-schedule-callout"
import { RaceTierCard } from "./race-tier-card"

/** Info for runners — checkout (sponsor / fund / race) lives above; avoids a second “pick a path” decision. */
export function RaceTiersGrid() {
  return (
    <section id="races" className="scroll-mt-4 bg-black py-16 md:py-24">
      <div className="mx-auto max-w-6xl px-4">
        <div className="mx-auto max-w-3xl text-center">
          <p className="font-[family-name:var(--font-barlow-spartan)] text-[11px] font-semibold uppercase tracking-[0.22em] text-[#C8A94A]">
            For those racing with Team NC
          </p>
          <h2 className="mt-3 font-[family-name:var(--font-barlow-spartan)] text-[clamp(1.75rem,5vw,2.75rem)] font-extrabold uppercase leading-tight tracking-tight text-white">
            Super 10K &amp; Fayetteville
          </h2>
          <p className="mt-4 text-base text-[#a3a3a3]">
            Reference only — <strong className="text-[#ccc]">register, sponsor, or donate in checkout above.</strong> This is the
            crew race &amp; venue context.
          </p>
        </div>

        <FayettevilleScheduleCallout />

        <div className="mx-auto mt-12 max-w-md">
          <RaceTierCard tier={SPARTAN_SUPER_10K} />
        </div>
      </div>
    </section>
  )
}
