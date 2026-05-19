export function HowItWorksSection() {
  const steps = [
    {
      n: "01",
      title: "Pay & receipt",
      body: "Secure checkout; NC United emails your charitable gift acknowledgement under IRC nonprofit standards.",
    },
    {
      n: "02",
      title: "Who gets documented at checkout",
      body: "Racing or sponsoring? Search the wrestler — nonprofit checkout ties your Training Fund gift to one athlete per checkout.",
    },
    {
      n: "03",
      title: "If you’re running",
      body: "Only racers need a Spartan registration code. Sponsors and training-fund gifts don’t — codes arrive by email after we send names to Spartan.",
    },
  ]

  return (
    <section className="border-b border-[#2A2A2A] bg-[#0A0A0A] py-14 md:py-20">
      <div className="mx-auto max-w-5xl px-4">
        <h2 className="text-center font-[family-name:var(--font-barlow-spartan)] text-2xl font-bold uppercase tracking-tight text-white md:text-3xl">
          What happens next
        </h2>
        <p className="mx-auto mt-3 max-w-xl text-center text-sm text-[#888]">
          After you complete checkout above.
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
