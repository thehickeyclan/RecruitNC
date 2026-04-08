import Image from "next/image"

export function AboutSection() {
  return (
    <section className="border-b border-[#2A2A2A] bg-[#0A0A0A] py-16 md:py-24">
      <div className="mx-auto grid max-w-6xl gap-12 px-4 md:grid-cols-2 md:gap-16 md:items-start">
        <div>
          <p className="font-[family-name:var(--font-barlow-spartan)] text-xs font-semibold uppercase tracking-[0.2em] text-[#CC0000]">
            The mission
          </p>
          <h2 className="mt-3 font-[family-name:var(--font-barlow-spartan)] leading-tight tracking-tight text-white">
            <span className="block text-3xl font-extrabold uppercase md:text-4xl">Strength in unity</span>
            <span className="mt-2 block text-xl font-semibold normal-case md:text-2xl">
              Built by Wrestling. Proven by Spartans.
            </span>
          </h2>
          <p className="mt-6 text-base leading-relaxed text-[#bbb]">
            NC United is a 501(c)(3) nonprofit developing North Carolina&apos;s top high school wrestlers. Every dollar
            raised sends athletes to elite summer competitions and training.
          </p>
          <div className="relative mt-10 h-12 w-44 opacity-90">
            <Image
              src="/images/nc-united-logo-white.png"
              alt="NC United"
              fill
              className="object-contain object-left"
            />
          </div>
        </div>
        <div className="flex flex-col gap-10">
          <blockquote className="border-l-4 border-[#CC0000] bg-[#1A1A1A] py-6 pl-6 pr-4">
            <div className="space-y-4 text-lg leading-relaxed text-white md:text-xl">
              <p>
                &ldquo;I&apos;ve crossed Spartan finish lines with family and friends — mud, obstacles, exhaustion, and
                laughter all in the same hour.
              </p>
              <p>That&apos;s why this matters.</p>
              <p>To the NC wrestling community — everyone wins.</p>
              <p>
                A great race, with great people, and every step helps fund spring and summer training and competition for
                our athletes.&rdquo;
              </p>
            </div>
            <footer className="mt-4 text-sm text-[#999]">— Matt Hickey, founder, NC United Wrestling</footer>
          </blockquote>
          <blockquote className="border-l-4 border-[#C8A94A] bg-[#1A1A1A] py-6 pl-6 pr-4">
            <p className="text-lg leading-relaxed text-white md:text-xl">
              &ldquo;When Spartan backs NC United, they&apos;re backing North Carolina wrestlers and the training it takes
              to compete at the highest level — travel, camps, and opportunity for kids who earn it every day in the
              room. That support lifts our whole state.&rdquo;
            </p>
            <footer className="mt-4 text-sm text-[#999]">— Michael Macchiavello, NC United</footer>
          </blockquote>
        </div>
      </div>
    </section>
  )
}
