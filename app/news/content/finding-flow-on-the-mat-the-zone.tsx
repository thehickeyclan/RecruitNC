import Image from "next/image"

const FLOW_CHALLENGE_VS_SKILL = "/images/finding-flow-challenge-vs-skill.png"

/**
 * Flow, the zone, and wrestlers’ lived experience — Jim Bernthal.
 * Hero (brain + flow lines): /images/finding-flow-on-the-mat-hero.png in lib/news.ts
 */
export function FindingFlowOnTheMatTheZoneContent() {
  return (
    <article className="max-w-none text-slate-700 [&_h2]:text-xl [&_h2]:mt-8 [&_h2]:mb-4 [&_h2]:font-bold [&_h2]:text-[#003366] [&_h3]:text-lg [&_h3]:mt-6 [&_h3]:mb-3 [&_h3]:font-bold [&_p]:my-3 [&_ul]:my-3 [&_ul]:list-disc [&_ul]:pl-6 [&_li]:my-1.5 [&_hr]:my-8 [&_hr]:border-slate-200">
      <p className="text-slate-600 font-medium">
        If you have been competing long enough, chances are you have experienced it, even if you did not have a name for
        it.
      </p>
      <p>
        There are matches where everything just seems to click. Nothing feels forced. You are not overthinking things or
        worrying about the outcome. You are simply wrestling, and it feels effortless. Even in the middle of chaos, your
        movements feel precise, controlled, and instinctive.
      </p>
      <p>
        Psychologist <strong>Mihaly Csikszentmihalyi</strong> spent decades studying this exact experience. Through
        thousands of interviews across multiple disciplines, including athletes, artists, musicians, and surgeons, he
        found something remarkably consistent. When people were performing at their best, they described nearly identical
        psychological conditions. They reported deep focus, a loss of self-consciousness, immediate feedback, a sense of
        control, and a feeling that action unfolded naturally rather than being forced.
      </p>
      <p>
        He called this state of optimal experience <strong>flow</strong>. Athletes commonly refer to it as{' '}
        <strong>&ldquo;being in the zone.&rdquo;</strong>
      </p>
      <p>
        Perhaps unsurprisingly, wrestlers described this same phenomenon in their own words. After conducting six
        interviews with elite NC United high school wrestlers, clear and consistent patterns emerged.
      </p>
      <p>
        Their language and experiences were strikingly similar, with wrestlers consistently pointing to trust,
        anticipation, confidence, freedom from overthinking, and a strong sense of control.
      </p>
      <p>
        This article examines how flow theory aligns with wrestlers&apos; lived experiences and how athletes can more
        consistently create the conditions for flow.
      </p>

      <h2>Total Immersion and Instinctive Execution</h2>
      <p>
        At the core of flow is what Csikszentmihalyi described as the <strong>merging of action and awareness</strong>, a
        state in which thinking and doing are no longer separate and the athlete is fully engaged in the performance
        rather than consciously guiding each movement. This goes beyond simple focus and reflects complete task
        immersion.
      </p>
      <p>Wrestlers described it simply:</p>
      <ul className="list-none pl-0 [&_li]:my-2">
        <li className="border-l-4 border-[#003366]/30 pl-4 italic">
          &ldquo;I&apos;m not thinking anymore, it&apos;s just all coming natural.&rdquo;
        </li>
        <li className="border-l-4 border-[#003366]/30 pl-4 italic">
          &ldquo;I honestly don&apos;t remember what happened. I know I won but I don&apos;t know how.&rdquo;
        </li>
        <li className="border-l-4 border-[#003366]/30 pl-4 italic">
          &ldquo;You do not have to think about the move. You are just going.&rdquo;
        </li>
        <li className="border-l-4 border-[#003366]/30 pl-4 italic">
          &ldquo;I feel what my opponent is giving me, and I go.&rdquo;
        </li>
      </ul>
      <p>
        Psychologically, this reflects <strong>automaticity</strong>, which is the ability to execute without conscious
        thought due to repetition. The brain recognizes patterns instantly and responds without delay. From a wrestling
        standpoint, it feels like instinct. Movements happen without hesitation, as if the body is simply responding in
        real time.
      </p>
      <p>
        <strong>What breaks this?</strong> Overthinking. The moment an athlete starts over-analyzing mid-match, the smooth
        connection between perception and action gets disrupted.
      </p>

      <h2>Control Through Confidence and Trust</h2>
      <p>
        Flow is characterized by a strong sense of self-control grounded in preparation. Csikszentmihalyi observed that
        individuals in flow feel capable of handling whatever arises, which reduces anxiety and allows them to remain
        fully immersed in the moment.
      </p>
      <p>Wrestlers explained it this way:</p>
      <ul className="list-none pl-0 [&_li]:my-2">
        <li className="border-l-4 border-[#003366]/30 pl-4 italic">
          &ldquo;The work is already done. I just trust that my training will come through.&rdquo;
        </li>
        <li className="border-l-4 border-[#003366]/30 pl-4 italic">
          &ldquo;I have earned this. I can beat any of these guys on any given day. Why not today?&rdquo;
        </li>
        <li className="border-l-4 border-[#003366]/30 pl-4 italic">
          &ldquo;I knew it was over after I got the first takedown.&rdquo;
        </li>
      </ul>
      <p>
        This kind of confidence is built through preparation, repetition, and experience, and is reflected in trust in
        one&apos;s training and the ability to act without hesitation.
      </p>
      <p>
        <strong>What breaks this?</strong> Self-doubt. The moment an athlete begins to question himself, reaction slows,
        and thinking replaces action. Confidence does not only support performance; it helps sustain flow.
      </p>

      <h2>Competing Free of Outcome</h2>
      <p>
        Flow is driven by <strong>intrinsic motivation</strong>, meaning full engagement in the task itself rather than
        focus on results. Csikszentmihalyi described this as an <strong>autotelic experience</strong>, where the
        activity becomes rewarding in itself rather than a means to an outcome. This requires surrender.
      </p>
      <p>Wrestlers put it like this:</p>
      <ul className="list-none pl-0 [&_li]:my-2">
        <li className="border-l-4 border-[#003366]/30 pl-4 italic">
          &ldquo;I am not worried about the outcome. I just wrestle.&rdquo;
        </li>
        <li className="border-l-4 border-[#003366]/30 pl-4 italic">
          &ldquo;Win or lose, I am taking something away from each match.&rdquo;
        </li>
        <li className="border-l-4 border-[#003366]/30 pl-4 italic">
          &ldquo;I put my trust in God. Whether I win or lose does not define me.&rdquo;
        </li>
        <li className="border-l-4 border-[#003366]/30 pl-4 italic">
          &ldquo;I surprisingly was not nervous… I don&apos;t think anyone expected me to win. I just went in aggressive
          and shocked him.&rdquo;
        </li>
      </ul>
      <p>
        Surrender does not mean passivity or a lack of care. It means releasing attachment to the result while staying
        fully engaged in the process. When athletes become overly focused on outcomes, their attention shifts away from
        execution. This often leads to tension, hesitation, and overthinking. Instead of wrestling to perform, they begin
        wrestling in a way that avoids losing.
      </p>
      <p>
        When they release that pressure, their performance becomes more fluid. They respond more freely, more effectively,
        and with greater confidence.
      </p>
      <p>
        <strong>What breaks this?</strong> Fear. Fear of losing, fear of judgment, and fear of failure. Surrender removes
        interference.
      </p>

      <h2>Challenge That Elevates Performance</h2>
      <p>
        Flow exists where challenge meets skill. When a task is too easy, engagement decreases. When it is too difficult,
        performance begins to break down. Csikszentmihalyi described these two ends of the spectrum as boredom and
        anxiety, with flow existing between them.
      </p>
      <figure className="my-6 overflow-hidden rounded-xl border border-slate-200 bg-white p-2 shadow-sm sm:p-4">
        <Image
          src={FLOW_CHALLENGE_VS_SKILL}
          alt="A graph of Skill versus Difficulty: the Flow zone runs along the diagonal balance between them; high difficulty and low skill lead toward Anxiety, high skill and low difficulty toward Boredom."
          width={1200}
          height={675}
          className="h-auto w-full object-contain"
          sizes="(max-width: 768px) 100vw, 48rem"
        />
        <figcaption className="border-t border-slate-200 bg-white px-2 py-2.5 text-center text-sm text-slate-600 sm:px-3">
          The classic flow model: when challenge and skill are mismatched, you drift toward anxiety or boredom; flow lives
          in the channel where they line up.
        </figcaption>
      </figure>
      <p>Wrestlers described facing inexperienced opponents in this manner:</p>
      <ul className="list-none pl-0 [&_li]:my-2">
        <li className="border-l-4 border-[#003366]/30 pl-4 italic">
          &ldquo;It&apos;s awkward wrestling new guys. They don&apos;t react right.&rdquo;
        </li>
        <li className="border-l-4 border-[#003366]/30 pl-4 italic">
          &ldquo;You cannot get into a flow state just rushing someone.&rdquo;
        </li>
        <li className="border-l-4 border-[#003366]/30 pl-4 italic">
          &ldquo;That is not flow. I am just feeling good because I am winning.&rdquo;
        </li>
      </ul>
      <p>
        When challenge and skill are aligned, something different happens. Attention sharpens, effort becomes focused,
        and the athlete becomes fully immersed in the moment. Wrestlers consistently report performing at their best
        against tough opponents. Close matches demand complete engagement, leaving no space to drift.
      </p>
      <p>Wrestlers explained competing against great competition like this:</p>
      <ul className="list-none pl-0 [&_li]:my-2">
        <li className="border-l-4 border-[#003366]/30 pl-4 italic">
          &ldquo;That was the most fun I have had wrestling in a long time.&rdquo;
        </li>
        <li className="border-l-4 border-[#003366]/30 pl-4 italic">
          &ldquo;Me and a bunch of my teammates were all in the finals of that tournament. We were in the hallway pacing
          and listening to music and getting hyped for our matches. It was really indescribable.&rdquo;
        </li>
        <li className="border-l-4 border-[#003366]/30 pl-4 italic">
          &ldquo;That kid was better than me, but I was still kind of flowing.&rdquo;
        </li>
      </ul>
      <p>
        <strong>What breaks this?</strong> A mismatch in either direction. The highest level of performance tends to
        occur when athletes are pushed just enough to remain fully engaged.
      </p>

      <h2>Altered Awareness and Feel</h2>
      <p>
        Flow changes perception. Time feels different, often slowing down, while awareness sharpens and decision-making
        speeds up. Csikszentmihalyi observed that during flow, attention becomes fully absorbed in the task, filtering out
        distractions and allowing individuals to process information more efficiently. As a result, athletes are not
        simply reacting—they are anticipating and responding with a level of clarity that feels almost automatic.
      </p>
      <p>Wrestlers described it like this:</p>
      <ul className="list-none pl-0 [&_li]:my-2">
        <li className="border-l-4 border-[#003366]/30 pl-4 italic">
          &ldquo;Everything is lining up like pieces of a puzzle.&rdquo;
        </li>
        <li className="border-l-4 border-[#003366]/30 pl-4 italic">
          &ldquo;In scrambles, time slows down. I can feel the next move.&rdquo;
        </li>
        <li className="border-l-4 border-[#003366]/30 pl-4 italic">
          &ldquo;It feels like time speeds up because I am enjoying myself.&rdquo;
        </li>
      </ul>
      <p>
        This reflects faster processing and improved pattern recognition. Athletes feel ahead of the action rather than
        behind it, anticipating what is coming next instead of reacting. From a cognitive standpoint, the brain
        prioritizes relevant information, allowing the athlete to see the match more clearly.
      </p>
      <p>
        <strong>What breaks this?</strong> A breakdown in focus. When attention drifts, the state begins to fade.
      </p>

      <h2>Flow, Performance, and Outcome</h2>
      <p>
        Flow, performance, and outcome are closely related but distinct. Athletes can win without performing at their best,
        and they can perform at a high level and still lose. Flow represents a high-quality performance state, not a
        guarantee of victory. This distinction is often misunderstood, as winning tends to shape how performance is
        remembered. Wrestlers explained this concept in the following manner:
      </p>
      <ul className="list-none pl-0 [&_li]:my-2">
        <li className="border-l-4 border-[#003366]/30 pl-4 italic">
          &ldquo;It is easier to recognize flow when you win.&rdquo;
        </li>
        <li className="border-l-4 border-[#003366]/30 pl-4 italic">
          &ldquo;I have never been in a state of flow and lost - but I have enjoyed matches where I lost to a great
          opponent.&rdquo;
        </li>
        <li className="border-l-4 border-[#003366]/30 pl-4 italic">
          &ldquo;I didn&apos;t win, but I felt better than I ever wrestled.&rdquo;
        </li>
      </ul>
      <p>
        These responses reflect a nuanced understanding of the difference between performance and outcome. At the same
        time, they acknowledge how easily perception can be influenced by results. When attention shifts to outcomes,
        execution often suffers. When it remains on execution, flow becomes more accessible, and in many cases, results
        follow.
      </p>
      <p>
        <strong>What breaks this?</strong> An overemphasis on outcomes.
      </p>

      <h2>What Helps Wrestlers Get Into Flow Prior to Competition</h2>
      <p>
        Flow cannot be forced, but it can be prepared for. Csikszentmihalyi identified several conditions that support
        flow, including clear goals, immediate feedback, focused attention, confidence, and an appropriate level of
        challenge. Wrestlers work to create these conditions through their preparation, often relying on routines, music,
        staying loose, mental preparation, and prayer.
      </p>
      <p>Wrestlers described it like this:</p>
      <ul className="list-none pl-0 [&_li]:my-2">
        <li className="border-l-4 border-[#003366]/30 pl-4 italic">
          &ldquo;I did a lot of praying during that tournament.&rdquo;
        </li>
        <li className="border-l-4 border-[#003366]/30 pl-4 italic">
          &ldquo;I listen to music before every match. It gets my mind right.&rdquo;
        </li>
        <li className="border-l-4 border-[#003366]/30 pl-4 italic">
          &ldquo;Happy music makes me not think about pressure.&rdquo;
        </li>
        <li className="border-l-4 border-[#003366]/30 pl-4 italic">
          &ldquo;I try to stay loose and open-minded.&rdquo;
        </li>
      </ul>
      <p>
        These are not random habits. They serve a purpose. Routines create predictability, which reduces anxiety. When
        athletes know exactly what they are going to do before a match, they eliminate unnecessary decisions and conserve
        mental energy. Many pace, rehearse, and listen to music just prior to competition.
      </p>
      <p>
        Music helps regulate arousal. Some athletes need to increase energy, while others need to calm down, and music
        helps them reach the right emotional state. Prayer or mental centering helps narrow focus and reinforce surrender,
        removing distractions and anchoring the athlete in the present moment. Physical relaxation often reflects mental
        relaxation, and tension in one tends to show up in the other.
      </p>
      <p>
        <strong>What breaks this?</strong> Lack of routine, disruptions in routine, or inconsistent preparation.
      </p>

      <h2>Key Takeaways</h2>
      <p>
        Flow is not random, and it is not something athletes stumble into. It is a state that emerges when specific
        conditions are consistently in place. At its core, flow reflects a complete alignment between preparation, focus,
        confidence, surrender, and an appropriate level of challenge.
      </p>
      <p>Several patterns consistently appeared across wrestlers&apos; experiences:</p>
      <ul>
        <li>
          <strong>Flow is rooted in execution, not outcome.</strong> Athletes perform at their best when they are fully
          engaged in the process rather than focused on results. An overemphasis on winning often disrupts the very
          conditions that allow flow to occur.
        </li>
        <li>
          <strong>Flow is supported by confidence built through preparation.</strong> It comes from preparation,
          repetition, and experience. Athletes who trust their training are able to act without hesitation, allowing
          performance to unfold naturally.
        </li>
        <li>
          <strong>The right level of challenge is critical for flow.</strong> Flow tends to occur when athletes are pushed
          by meaningful competition. Too little challenge leads to disengagement, while too much creates anxiety. The best
          performances happen in the space between.
        </li>
        <li>
          <strong>Flow is characterized by clarity and anticipation.</strong> Athletes experience a shift in perception,
          where time feels different, attention sharpens, and they respond more quickly and effectively. They are not
          simply reacting—they are anticipating.
        </li>
        <li>
          <strong>Habits facilitate flow.</strong> Routines, mental preparation, rehearsal, emotional regulation, and
          practices like prayer help athletes enter competition focused, composed, and ready to perform.
        </li>
      </ul>
      <p>
        For wrestlers, this means staying grounded in execution and trusting the process. For coaches, it means creating
        environments that consistently challenge athletes while supporting their development and readiness.
      </p>
      <p>
        When these conditions are in place, flow becomes more accessible. When it shows up, it can define the performances
        athletes remember most clearly—win or lose.
      </p>

      <hr />
      <p className="text-sm text-slate-500">
        <strong className="text-slate-700">Jim Bernthal</strong> — author
      </p>
    </article>
  )
}
