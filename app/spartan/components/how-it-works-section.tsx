export function HowItWorksSection() {
  const steps = [
    {
      n: "01",
      title: "Give securely",
      body: "Make a tax-deductible gift through checkout. You’ll get a receipt from NC United.",
    },
    {
      n: "02",
      title: "Race, align, or fund training",
      body: "At checkout, search for the wrestler by name and select them—whether they’re racing Spartan or not. That’s how your gift counts toward their tally and NC United summer training; no race required.",
    },
    {
      n: "03",
      title: "Only if you’re racing",
      body: "Spartan sends your Fayetteville Super 10K entry code when you’re the one registering for the race. Supporting a wrestler without racing yourself? You’re done after checkout—no code.",
    },
  ]

  return (
    <section className="border-b border-[#2A2A2A] bg-[#0A0A0A] py-14 md:py-20">
      <div className="mx-auto max-w-5xl px-4">
        <h2 className="text-center font-[family-name:var(--font-barlow-spartan)] text-2xl font-bold uppercase tracking-tight text-white md:text-3xl">
          How it works
        </h2>
        <p className="mx-auto mt-3 max-w-2xl text-center text-sm text-[#888]">
          You can run with Team NC, give alongside someone who is—or donate to a wrestler’s training even when they’re
          not on the Spartan course. You always pick the athlete by <strong className="text-[#aaa]">name search</strong> at
          checkout. Step 3 is only for people registering themselves for the Super 10K.
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
