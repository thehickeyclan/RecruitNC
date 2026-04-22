/** Fayetteville weekend — Team NC crew + other Spartan distances. */
export function FayettevilleScheduleCallout() {
  return (
    <div className="mx-auto mt-8 max-w-3xl rounded border border-[#333] bg-[#0d0d0d] px-4 py-4 text-left md:px-5">
      <p className="font-[family-name:var(--font-barlow-spartan)] text-[10px] font-semibold uppercase tracking-[0.2em] text-[#C8A94A]">
        Fayetteville weekend · Team NC
      </p>
      <p className="mt-2 text-sm font-medium leading-relaxed text-white">
        <strong>Fayetteville</strong> · <strong>May 2–3, 2026</strong> · <strong>McCormick Farms · Fayetteville, NC</strong>.
        Many NC United athletes typically run the <strong className="text-[#CC0000]">Super 10K</strong>{" "}
        <strong>Sunday, May 3</strong> — <strong className="text-[#ccc]">any Spartan distance</strong> that weekend is fine;
        choose yours in <strong className="text-[#ccc]">checkout</strong>. After checkout, NC United passes names to Spartan;
        you get email to finish Spartan registration.{" "}
        <a
          href="https://www.spartan.com/en/races/fayetteville-north-carolina?index=0"
          target="_blank"
          rel="noopener noreferrer"
          className="text-[#C8A94A] underline-offset-2 hover:underline"
        >
          Full schedule on Spartan.com
        </a>
      </p>
    </div>
  )
}
