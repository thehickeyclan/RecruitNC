export function HowItWorksSection() {
  const steps = [
    {
      n: "01",
      title: "Checkout",
      body: "Pay safely; NC United emails your receipt (501(c)(3)).",
    },
    {
      n: "02",
      title: "Who gets credit",
      body: "Racing or sponsoring? Search and tap the wrestler — one athlete per checkout. Repeat for a second kid.",
    },
    {
      n: "03",
      title: "Race entry codes",
      body: "You only need a Spartan code if you’re registering yourself to run. Sponsor-only gifts don’t need one.",
    },
  ]

  return (
    <section className="border-b border-[#2A2A2A] bg-[#0A0A0A] py-14 md:py-20">
      <div className="mx-auto max-w-5xl px-4">
        <h2 className="text-center font-[family-name:var(--font-barlow-spartan)] text-2xl font-bold uppercase tracking-tight text-white md:text-3xl">
          How it works
        </h2>
        <p className="mx-auto mt-3 max-w-xl text-center text-sm text-[#888]">
          The form below walks through it — payer name first, then wrestler (if needed).
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
