import Image from "next/image"

export function LastYearSection() {
  return (
    <section className="border-b border-[#2A2A2A] bg-[#0A0A0A] py-14 md:py-20">
      <div className="mx-auto max-w-4xl px-4">
        <p className="text-center font-[family-name:var(--font-barlow-spartan)] text-[11px] font-semibold uppercase tracking-[0.22em] text-[#C8A94A]">
          Last year&apos;s race
        </p>
        <h2 className="mt-2 text-center font-[family-name:var(--font-barlow-spartan)] text-2xl font-bold uppercase tracking-tight text-white md:text-3xl">
          Same mud. Same grit.
        </h2>
        <p className="mx-auto mt-3 max-w-xl text-center text-sm text-[#888]">
          NC United athletes on course — we&apos;re back May 2–3 in Fayetteville to fund the next season of training and
          competition.
        </p>
        <div className="relative mt-10 overflow-hidden rounded-sm border border-[#2A2A2A] bg-[#1A1A1A] shadow-[inset_4px_0_0_0_#CC0000]">
          <div className="relative aspect-[3/4] w-full max-h-[min(85vh,900px)] mx-auto md:aspect-[4/5]">
            <Image
              src="/images/spartan-last-year-team.png"
              alt="NC United wrestlers at the Spartan Race, team photo on course"
              fill
              className="object-cover object-center"
              sizes="(max-width: 896px) 100vw, 896px"
            />
          </div>
        </div>
      </div>
    </section>
  )
}
