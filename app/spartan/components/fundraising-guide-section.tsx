export function FundraisingGuideSection() {
  const items = [
    {
      q: "How does a gift show for the right wrestler?",
      a: "At checkout, search and tap the wrestler — your charitable gift stays with NC United Wrestling for the NC United Training Fund noted in connection with them. Who pays by card isn't always the same person cheering from the sidelines; that payer name drives the emailed acknowledgement.",
    },
    {
      q: "Is there a minimum gift? Can I enter any amount?",
      a: "$5 minimum everywhere. After that, any dollar amount — race suggestions in the dropdown are guidelines, not requirements.",
    },
    {
      q: "What if I’m paying for two wrestlers?",
      a: "One athlete per checkout. Finish payment, then start again. Same parent name and email are fine.",
    },
    {
      q: "Can I sign up for any race distance and still align to an athlete?",
      a: "Yes. Pick any distance from the menu at checkout, then search and select the wrestler to document on your Training Fund gift. You can also sponsor or donate without racing — sponsoring (Training Fund notation for one wrestler) or donating to the NC United Training Fund pool.",
    },
    {
      q: "Are gifts charitable / deductible?",
      a: "Gifts complete as charitable contributions to NC United Wrestling — you'll receive an IRC-style acknowledgment email. Whether you may deduct on your taxes depends on your situation (AGI floors, filing status, QCD rules, etc.) — confirm with your tax advisor.",
    },
    {
      q: "What can money be used for?",
      a: "Training and competition costs: tournaments, travel, camps, membership, and similar wrestling expenses.",
    },
  ]

  return (
    <section className="border-b border-[#2A2A2A] bg-[#141414] py-14 md:py-20">
      <div className="mx-auto max-w-2xl px-4">
        <h2 className="font-[family-name:var(--font-barlow-spartan)] text-2xl font-bold uppercase tracking-tight text-white md:text-3xl">
          Common questions
        </h2>
        <p className="mt-3 text-sm leading-relaxed text-[#999]">
          One topic at a time — the checkout form is still where you pay.
        </p>

        <ul className="mt-10 space-y-8 text-[#bbb]">
          {items.map((item) => (
            <li key={item.q}>
              <h3 className="font-[family-name:var(--font-barlow-spartan)] text-base font-bold text-white md:text-lg">
                {item.q}
              </h3>
              <p className="mt-2 text-sm leading-relaxed md:text-base">{item.a}</p>
            </li>
          ))}
        </ul>

        <h3 className="mt-14 font-[family-name:var(--font-barlow-spartan)] text-lg font-bold uppercase tracking-tight text-[#C8A94A] md:text-xl">
          Sharing the page
        </h3>
        <p className="mt-3 text-sm leading-relaxed text-[#bbb]">
          Athletes: text family, teammates, and coaches with your link and ask them to search your name at checkout. Short
          and personal beats a long post.
        </p>
      </div>
    </section>
  )
}
