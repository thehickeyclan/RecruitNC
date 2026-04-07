export function HowItWorksSection() {
  const steps = [
    {
      n: "01",
      title: "Donate to NC United",
      body: "Make a tax-deductible gift through our secure checkout. Your receipt comes from NC United (EIN on file).",
    },
    {
      n: "02",
      title: "We compile emails",
      body: "We maintain the list of donor emails (and your preferred race distance if you tell us) for Spartan’s team.",
    },
    {
      n: "03",
      title: "Spartan sends your code",
      body: "Spartan Race emails your Fayetteville entry code directly — same flow Joe outlined for NC United.",
    },
  ]

  return (
    <section className="border-b border-[#2A2A2A] bg-[#0A0A0A] py-14 md:py-20">
      <div className="mx-auto max-w-5xl px-4">
        <h2 className="text-center font-[family-name:var(--font-barlow-spartan)] text-2xl font-bold uppercase tracking-tight text-white md:text-3xl">
          How it works
        </h2>
        <p className="mx-auto mt-3 max-w-2xl text-center text-sm text-[#888]">
          Open to anyone — wrestlers or not. Partner process: give through NC United first, then Spartan emails your
          code.
        </p>
        <div className="mt-12 grid gap-8 md:grid-cols-3">
          {steps.map((s) => (
            <div
              key={s.n}
              className="border border-[#2A2A2A] bg-[#141414] p-6"
              style={{ borderLeftWidth: "4px", borderLeftColor: "#CC0000" }}
            >
              <p className="font-[family-name:var(--font-barlow-spartan)] text-4xl font-black text-[#CC0000]/40">{s.n}</p>
              <h3 className="mt-2 font-[family-name:var(--font-barlow-spartan)] text-lg font-bold uppercase text-white">{s.title}</h3>
              <p className="mt-3 text-sm leading-relaxed text-[#aaa]">{s.body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
