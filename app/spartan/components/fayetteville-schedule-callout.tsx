/** Super 10K only — Team NC. */
export function FayettevilleScheduleCallout() {
  return (
    <div className="mx-auto mt-8 max-w-3xl rounded border border-[#333] bg-[#0d0d0d] px-4 py-4 text-left md:px-5">
      <p className="font-[family-name:var(--font-barlow-spartan)] text-[10px] font-semibold uppercase tracking-[0.2em] text-[#C8A94A]">
        This page = Super 10K only
      </p>
      <p className="mt-2 text-sm font-medium leading-relaxed text-white">
        <strong>Team NC</strong> runs the <strong className="text-[#CC0000]">Super 10K</strong> on{" "}
        <strong>Sunday, May 3, 2026</strong> at <strong>McCormick Farms · Fayetteville, NC</strong> — same start window
        for the crew. Other Spartan distances happen the same weekend; if you need a different race, use{" "}
        <a
          href="https://www.spartan.com/en/races/fayetteville-north-carolina?index=0"
          target="_blank"
          rel="noopener noreferrer"
          className="text-[#C8A94A] underline-offset-2 hover:underline"
        >
          Spartan.com
        </a>{" "}
        — this checkout is for our 10K team race only.
      </p>
    </div>
  )
}
