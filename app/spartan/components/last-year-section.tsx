import Image from "next/image"

export function LastYearSection() {
  return (
    <section className="border-b border-[#2A2A2A] bg-[#0A0A0A] py-14 md:py-20">
      <div className="mx-auto max-w-4xl px-4">
        <p className="text-center font-[family-name:var(--font-barlow-spartan)] text-[11px] font-semibold uppercase tracking-[0.22em] text-[#C8A94A]">
          Last year&apos;s race
        </p>
        <div className="mt-2 text-center">
          <p className="font-[family-name:var(--font-barlow-spartan)] text-sm font-semibold uppercase tracking-[0.18em] text-[#C8A94A] md:text-base">
            On course in 2025
          </p>
          <h2 className="mt-2 font-[family-name:var(--font-barlow-spartan)] text-2xl font-bold uppercase tracking-tight text-white md:text-3xl">
            Same mud. Same grit.
          </h2>
        </div>
        <p className="mx-auto mt-3 max-w-xl text-center text-sm text-[#888]">
          NC United athletes on course — we&apos;re back May 2–3 in Fayetteville to fund the next season of training and
          competition.
        </p>
        {/* Full photo at intrinsic 768x1024; object-contain only — no cover crop */}
        <div className="mt-10 rounded-sm border border-[#2A2A2A] bg-[#141414] p-2 sm:p-4 shadow-[inset_4px_0_0_0_#CC0000]">
          <Image
            src="/images/spartan-last-year-team.png"
            alt="NC United wrestlers at the Spartan Race, team photo on course"
            width={768}
            height={1024}
            className="mx-auto h-auto w-full max-w-[min(100%,768px)] object-contain"
            sizes="(max-width: 768px) 100vw, 768px"
          />
        </div>
      </div>
    </section>
  )
}
