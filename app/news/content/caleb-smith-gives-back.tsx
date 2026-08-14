import Image from "next/image"

function PracticeGallery() {
  return (
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
  )
}

function ClosingGallery() {
  return (
    <div className="not-prose mt-8 grid gap-4 sm:grid-cols-2">
      <figure className="relative aspect-[3/4] overflow-hidden rounded-2xl border border-slate-200 bg-slate-100">
        <Image
          src="/images/news/caleb-smith-gives-back/caleb-smith-addresses-room.jpg"
          alt="Caleb Smith sharing closing remarks with wrestlers at Greensboro RTC practice"
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
  )
}

export function CalebSmithGivesBackContent() {
  return (
    <div className="space-y-10">
      <section>
        <p>For Caleb Smith, time home in North Carolina is an opportunity to recharge.</p>
        <p>
          The schedule of an elite wrestler leaves little downtime. Training, competition and travel consume much of
          the year, making trips home a chance to reconnect with family and friends, recover and reset.
        </p>
        <p>
          On Thursday night, August 13, Smith chose to spend part of that time in the wrestling room at Greensboro
          College, volunteering to lead Greensboro RTC practice.
        </p>
        <p>Once he arrived, he was all in.</p>
        <p>
          Smith was among the first with his shoes laced and among the first running. When practice started, he worked
          his way around the room, wrestling with athletes of different ages and experience levels—many of them more
          than once.
        </p>
        <p>
          There was no separation between the two-time NCAA All-American and the young wrestlers there to learn from
          him. Smith demonstrated, drilled, wrestled and encouraged. He gave kids his attention and made their
          development feel important.
        </p>
        <p>
          For the wrestlers in the room, it was an opportunity to experience up close the pace, work ethic and approach
          required to compete at one of the highest levels of the sport.
        </p>
        <PracticeGallery />
      </section>

      <section>
        <h2>A North Carolina Wrestling Story</h2>
        <p>Smith&apos;s path to the national stage began in North Carolina.</p>
        <p>
          He developed through the <strong>School of Hard Knocks</strong> wrestling community and competed at{" "}
          <strong>Southwest Guilford High School</strong> before continuing his career at Appalachian State and eventually
          Nebraska.
        </p>
        <p>The journey also produced relationships that extend well beyond competition.</p>
        <p>
          Smith&apos;s relationship with fellow North Carolina standout <strong>Ethan Oakley</strong> grew through the sport,
          while his connection with <strong>Jon Jon Millner</strong> reaches back to their days at School of Hard Knocks.
          Smith and Millner later became teammates at Appalachian State, where Millner earned All-America honors.
        </p>
        <p>
          It&apos;s one of wrestling&apos;s enduring qualities: competitors become training partners, teammates become lifelong
          friends, and relationships formed in wrestling rooms often remain long after the matches are over.
        </p>
        <p>
          Smith&apos;s own career eventually took him from Appalachian State to Nebraska, where he became a{" "}
          <strong>two-time NCAA Division I All-American</strong> at 125 pounds and established himself among the nation&apos;s
          best.
        </p>
        <p>
          His ambitions continue beyond his college career, including opportunities to compete on major stages such as{" "}
          <strong>Real American Freestyle</strong>.
        </p>
        <p>There is still plenty ahead.</p>
        <p>
          Smith can envision North Carolina eventually becoming home again long term, but for now his attention remains
          on competing, improving and pursuing opportunities at the highest levels available to him.
        </p>
      </section>

      <section>
        <h2>Momentum in Greensboro</h2>
        <p>
          There is also something very real happening at Greensboro College. The energy around the program feels
          different—a group that isn&apos;t satisfied with incremental progress and genuinely believes it can jump levels.
          That momentum is showing up in the room and in the roster, including recent transfers{" "}
          <strong>Sammy Aponte</strong>, a three-time North Carolina state champion from Roanoke;{" "}
          <strong>Eli Pendergrass</strong>, a state champion and two-time state finalist transferring from Mount Olive;
          and <strong>Cayden Glass</strong>, a two-time state finalist transferring from King University. Add an
          increasingly strong Greensboro RTC room and a program eager to become a bigger part of the statewide
          wrestling community, and the trajectory is worth watching.
        </p>
        <p>Smith&apos;s visit fit naturally into that environment.</p>
        <p>
          Here was one of North Carolina&apos;s most accomplished active wrestlers, back in a college room in his home state,
          sharing what he has learned with athletes trying to take their own next step.
        </p>
        <p>
          It was another example of the connections beginning to form across North Carolina wrestling—between
          generations, programs and athletes at different stages of their careers.
        </p>
      </section>

      <section>
        <h2>Back to the Room</h2>
        <p>As practice ended, the wrestlers gathered around Smith.</p>
        <p>The conversation moved beyond takedowns, drilling and competition.</p>
        <p>
          Smith spoke about his faith, the experiences wrestling has provided him and the importance of remembering the
          people and communities that helped make those opportunities possible.
        </p>
        <p>The setting made the message especially meaningful.</p>
        <p>
          Smith wasn&apos;t speaking as someone looking back on a completed career. His own competitive journey is still
          unfolding. There are goals left to pursue and bigger stages he still wants to reach.
        </p>
        <p>
          That gave the young wrestlers in front of him something different from a retrospective about past
          accomplishments.
        </p>
        <p>They were hearing from someone still doing the work.</p>
        <ClosingGallery />
      </section>

      <section>
        <h2>More Than the Résumé</h2>
        <p>The All-America honors may be what initially make a young wrestler recognize Caleb Smith.</p>
        <p>Thursday night offered something more personal.</p>
        <p>
          Years from now, a wrestler in that room may not remember every technique Smith demonstrated or every drill
          from practice.
        </p>
        <p>He may remember getting to wrestle with him.</p>
        <p>He may remember Smith taking the time to help him.</p>
        <p>
          He may remember looking across the mat at someone from North Carolina who had reached a level he hopes to
          reach himself—and realizing that the distance between where he is and where he wants to go might not feel
          quite as far.
        </p>
        <p>That&apos;s an impact no result or wrestling résumé can fully capture.</p>
        <p>
          During time home that could have been entirely his own, <strong>Caleb Smith chose to give some of it back.</strong>
        </p>
        <p>And a room full of young North Carolina wrestlers was better for it.</p>
      </section>
    </div>
  )
}
