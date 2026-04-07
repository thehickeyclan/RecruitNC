import { NCU_EIN } from "../data"

export function DonationSection() {
  return (
    <section id="donate" className="scroll-mt-4 border-t border-[#2A2A2A] bg-[#1A1A1A] py-16 md:py-20">
      <div className="mx-auto max-w-xl px-4 text-center">
        <h2 className="font-[family-name:var(--font-barlow-spartan)] text-3xl font-bold uppercase text-white">Donate directly</h2>
        <p className="mt-4 text-[#bbb]">
          Can&apos;t make the race? Make a tax-deductible donation to NC United. 100% goes to athlete competition and
          training costs. Stripe checkout — coming online this week.
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-2">
          {["$25", "$50", "$100", "$250"].map((amt) => (
            <span
              key={amt}
              className="inline-flex min-w-[4.5rem] items-center justify-center border border-[#444] px-4 py-2 font-[family-name:var(--font-barlow-spartan)] text-sm font-semibold uppercase tracking-wide text-[#999]"
            >
              {amt}
            </span>
          ))}
        </div>
        <p className="mt-8 text-xs leading-relaxed text-[#666]">
          Donations to NC United are tax-deductible. NC United is a registered 501(c)(3) nonprofit. EIN: {NCU_EIN}.
        </p>
        <p className="mt-4">
          <a href="/contact" className="text-sm font-medium text-[#C8A94A] underline-offset-4 hover:underline">
            Contact us to donate while we enable online checkout
          </a>
        </p>
      </div>
    </section>
  )
}
