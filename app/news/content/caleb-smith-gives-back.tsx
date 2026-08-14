import Image from "next/image"

export function CalebSmithGivesBackContent() {
  return (
    <div className="space-y-10">
      <section>
        <p>
          For Caleb Smith, coming home provides a rare opportunity to recharge.
        </p>
        <p>
          The schedule of an elite college wrestler leaves little downtime. Training, competition, travel and the
          constant pursuit of improvement consume most of the year. Time back in North Carolina offers an opportunity
          to see family and friends, recover and reset.
        </p>
        <p>
          On Thursday night, August 13, Smith chose to spend part of that time in the wrestling room at Greensboro
          College, volunteering to lead Greensboro RTC practice.
        </p>
        <p>Once he arrived, he was all in.</p>
        <p>
          Smith was among the first wrestlers with his shoes laced and among the first running. When practice started,
          he found his way to nearly every kid in the room—often more than once.
        </p>
        <p>
          He didn&apos;t carry himself like a two-time NCAA Division I All-American making a guest appearance. He worked.
        </p>
        <p>More importantly, he connected.</p>
        <p>
          Wrestlers of different ages and experience levels received his attention. He wrestled with them, encouraged
          them and made each athlete feel like his or her development mattered.
        </p>
        <blockquote>
          <p><strong>“Everyone wants to quit. You just need to give them a reason to.”</strong></p>
        </blockquote>

        <div className="not-prose mt-8 grid gap-4 sm:grid-cols-2">
          <figure className="relative aspect-[3/4] overflow-hidden rounded-2xl border border-slate-200 bg-slate-100">
            <Image
              src="/images/news/caleb-smith-gives-back/caleb-smith-live-wrestling.jpg"
              alt="Caleb Smith wrestling with an athlete during Greensboro RTC practice"
              fill
              className="object-cover"
              sizes="(min-width: 640px) 50vw, 100vw"
            />
          </figure>
          <figure className="relative aspect-[3/4] overflow-hidden rounded-2xl border border-slate-200 bg-slate-100">
            <Image
              src="/images/news/caleb-smith-gives-back/caleb-smith-technique.jpg"
              alt="Caleb Smith demonstrating technique at Greensboro College"
              fill
              className="object-cover"
              sizes="(min-width: 640px) 50vw, 100vw"
            />
          </figure>
        </div>
      </section>

      <section>
        <h2>A North Carolina Wrestling Story</h2>
        <p>Smith&apos;s wrestling journey began in North Carolina and carried him to some of the sport&apos;s biggest stages.</p>
        <p>
          He developed through the <strong>School of Hard Knocks</strong> wrestling community and competed at{" "}
          <strong>Southwest Guilford High School</strong> before continuing his career at Appalachian State and Nebraska.
        </p>
        <p>
          Along the way, wrestling created relationships that lasted beyond individual matches. Some came through
          competition, including his relationship with fellow North Carolina standout <strong>Ethan Oakley</strong>.
          Others developed inside a college wrestling room, including his connection with North Carolina native and
          Appalachian State All-American <strong>Jon Jon Millner</strong>.
        </p>
        <p>
          Those relationships are part of what makes wrestling unique. Today&apos;s opponent can become tomorrow&apos;s
          training partner, teammate or lifelong friend.
        </p>
        <p>
          At Nebraska, Smith became a <strong>two-time NCAA Division I All-American</strong>, establishing himself among
          the country&apos;s best at 125 pounds. His competitive goals continue beyond the college season, with
          opportunities to compete on major stages such as <strong>Real American Freestyle</strong>.
        </p>
        <p>
          Faith also plays an important role in Smith&apos;s life and perspective. He appreciates where wrestling has
          taken him, but there is a clear sense that he believes much more remains ahead.
        </p>
        <p>
          Long term, North Carolina remains home. Smith can envision eventually returning to the state and settling
          down here. That chapter can wait. Right now, there are still big stages left to chase.
        </p>
      </section>

      <section>
        <h2>Momentum in Greensboro</h2>
        <p>There is also something building at Greensboro College.</p>
        <p>
          The program believes it can make a significant jump, and that momentum is visible in its roster and an
          increasingly strong Greensboro RTC room. Smith&apos;s presence Thursday night added another layer to that energy.
        </p>
        <p>
          An accomplished North Carolina wrestler who left the state, reached the NCAA podium and competed nationally
          returned to a local college room to work directly with the next generation.
        </p>
        <p>That kind of interaction can have an impact far beyond one practice.</p>

        <div className="not-prose mt-8 grid gap-4 sm:grid-cols-2">
          <figure className="relative aspect-[3/4] overflow-hidden rounded-2xl border border-slate-200 bg-slate-100">
            <Image
              src="/images/news/caleb-smith-gives-back/caleb-smith-addresses-room.jpg"
              alt="Caleb Smith speaking to wrestlers gathered at Greensboro RTC practice"
              fill
              className="object-cover"
              sizes="(min-width: 640px) 50vw, 100vw"
            />
          </figure>
          <figure className="relative aspect-[3/4] overflow-hidden rounded-2xl border border-slate-200 bg-slate-100">
            <Image
              src="/images/news/caleb-smith-gives-back/greensboro-rtc-huddle.jpg"
              alt="Greensboro RTC wrestlers closing practice in a team huddle"
              fill
              className="object-cover"
              sizes="(min-width: 640px) 50vw, 100vw"
            />
          </figure>
        </div>
      </section>

      <section>
        <h2>More Than the Résumé</h2>
        <p>
          Smith&apos;s accomplishments are what make young wrestlers recognize his name. They aren&apos;t necessarily what
          made Thursday night meaningful.
        </p>
        <p>
          A kid in that room may not remember every technique Smith demonstrated or every detail of the practice plan.
        </p>
        <p>He may remember that a two-time NCAA All-American got down on the mat with him.</p>
        <p>That Smith paid attention to him.</p>
        <p>That someone competing at a level he dreams of reaching treated his goals like they mattered.</p>
        <p>
          Smith still has plenty he wants to accomplish. His competitive story is still being written, and some of its
          biggest chapters may remain ahead.
        </p>
        <p>
          But Thursday night offered a glimpse of something that won&apos;t appear on an NCAA podium or wrestling résumé.
        </p>
        <p>
          During time that could have been entirely his own, <strong>Caleb Smith chose to give some of it back.</strong>
        </p>
        <p>And a room full of young North Carolina wrestlers was better for it.</p>
      </section>
    </div>
  )
}
