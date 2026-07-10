import Image from "next/image"
import { PullQuote } from "@/components/news/pull-quote"

const JUMPS_CHART = "/images/jumping-levels-jumps-assessment-chart.png"

/**
 * JUMPS Assessment feature — Jim Bernthal, Ph.D.
 * Hero: /images/jumping-levels-hero.png in lib/news.ts
 */
export function JumpingLevelsWhatDrivesRapidImprovementContent() {
  return (
    <article className="max-w-none text-slate-700 [&_h2]:text-xl [&_h2]:mt-8 [&_h2]:mb-4 [&_h2]:font-bold [&_h2]:text-[#003366] [&_h3]:text-lg [&_h3]:mt-6 [&_h3]:mb-3 [&_h3]:font-bold [&_p]:my-3 [&_ul]:my-3 [&_ul]:list-disc [&_ul]:pl-6 [&_li]:my-1.5 [&_hr]:my-8 [&_hr]:border-slate-200">
      <h2>What Helps Wrestlers Jump Levels?</h2>
      <p>
        In one of the toughest wrestling states in the country, Pennsylvania wrestler AJ Schopp finished fifth in the
        state as an eighth grader in the PJW&apos;s (junior division). That is a strong accomplishment in its own right,
        but one year later, as just a freshman competing against older high school wrestlers, he finished second. When
        asked what had changed, Schopp pointed to a summer spent attending nine weeks of wrestling camps and training
        multiple times a day, nearly every day. He eventually went on to win a Pennsylvania state championship, earn a
        scholarship to Edinboro University, become a four-time NCAA qualifier, and a three-time All-American.
      </p>
      <p>
        Stories like this are common in wrestling. A wrestler who appeared to be developing at a steady pace suddenly
        breaks through. The athlete who struggled to score consistently begins finishing shots. The wrestler who faded
        late in matches starts winning difficult third periods. The wrestling community has a phrase for it:{" "}
        <strong>&ldquo;jumping levels.&rdquo;</strong>
      </p>
      <p>
        The term is common, but it raises an important question: What actually causes these developmental breakthroughs?
        Are the factors that contribute to long-term wrestling success the same factors that help athletes improve
        rapidly, or is accelerated development driven by something different?
      </p>
      <p>
        That question became the foundation of the <strong>JUMPS Assessment</strong>, which stands for Jumping Levels:
        Understanding and Measuring Performance Enhancement and Speed of Improvement. The project asked athletes,
        parents, and coaches what they believe contributes to wrestling success and compared those perceptions to the
        factors they believe accelerate improvement. Participants evaluated developmental factors and answered
        open-ended questions about enjoyment, performance, accelerated improvement, barriers, and the experiences they
        believed contributed most to rapid growth.
      </p>

      <h2>What the Numbers Tell Us</h2>
      <p>
        The quantitative results showed that many of the same factors associated with long-term wrestling success were
        also associated with accelerated improvement. Across athletes, parents, and coaches, respondents generally
        viewed performance and speed of improvement as closely related concepts rather than entirely separate
        developmental pathways.
      </p>
      <p>
        The more interesting distinction emerged in the open-ended responses. When participants discussed performance
        gains, they referenced a broad collection of influences, including competition, nutrition, strength training,
        film study, mental preparation, coaching, training partners, and club culture. When they discussed rapid
        improvement, however, their attention narrowed considerably. Again and again, athletes, parents, and coaches
        returned to the same handful of developmental accelerators: quality coaching, quality training partners,
        consistency, individualized instruction, and strong developmental environments.
      </p>
      <p>
        In other words, respondents viewed wrestling success as the product of many contributing factors, but they
        viewed rapid improvement as being driven by a smaller and more focused set of developmental experiences.
      </p>

      <figure className="my-6 overflow-hidden rounded-xl border border-slate-200 bg-white p-2 shadow-sm sm:p-4">
        <Image
          src={JUMPS_CHART}
          alt="JUMPS Assessment ratings for performance gains and speed of improvement by athletes, parents, and coaches — each panel ranked highest to lowest within that group."
          width={2048}
          height={1213}
          className="h-auto w-full object-contain"
          sizes="(max-width: 768px) 100vw, 48rem"
        />
        <figcaption className="border-t border-slate-200 bg-white px-2 py-2.5 text-center text-sm text-slate-600 sm:px-3">
          Figure 1. JUMPS Assessment ratings for performance gains and speed of improvement by group. Each panel is ranked
          highest to lowest within that group.
        </figcaption>
      </figure>

      <h2>Consistency Is Key</h2>
      <p>
        One of the more interesting findings was that consistency was the only factor in the aggregate ratings where
        speed of improvement slightly exceeded performance. It suggests that respondents viewed consistency not simply
        as something that contributes to success, but as something that may actively accelerate development by allowing
        the other factors to compound.
      </p>
      <p>
        Athletes talked about constant training and frequent competition. Parents described school practices layered on
        top of club practices and repeated exposure to challenging opponents. Coaches emphasized consistency almost
        relentlessly. One coach summarized the idea in three words: &ldquo;Consistency is king. Period.&rdquo; Another
        wrote, &ldquo;Frequency is king when it comes to developing athletes.&rdquo;
      </p>
      <p>
        Those comments were not isolated. They reflected a broader pattern throughout the responses. Great coaching only
        helps if athletes consistently show up. Strong training partners only matter if athletes consistently train with
        them. A strong club environment only matters if athletes consistently participate in it. Even private lessons
        appear to create their greatest value when athletes consistently attend them and apply what they learn.
      </p>

      <PullQuote attribution="Coach response">
        Consistency is king. Period. Give me 5-6 days a week of structured/injury free training, and we can expedite
        performance improvements.
      </PullQuote>

      <p>
        This may help explain why developmental breakthroughs often seem to happen quickly. A parent, coach, or teammate
        who has not seen a wrestler in several months may suddenly notice a dramatic difference in performance. In
        reality, the breakthrough is rarely immediate. The visible jump is often the result of months of consistent
        training, quality feedback, competition, recovery, and adjustment quietly accumulating beneath the surface until
        the improvement can no longer be missed.
      </p>

      <h2>The Power of Training Partners</h2>
      <p>
        Another factor that emerged repeatedly throughout the study was the importance of training partners. Across
        athletes, parents, and coaches, the importance of quality training partners surfaced repeatedly. Whether
        discussing enjoyment, performance gains, or rapid improvement, respondents consistently pointed to the value of
        having strong partners in the room.
      </p>
      <p>
        One athlete wrote, &ldquo;I enjoy the high level practice partners the most because that&apos;s where I feel I
        make the most growth.&rdquo; Another pointed simply to &ldquo;the amount of high level partners in the wrestling
        room.&rdquo; Others described the value of getting different looks from different high-level wrestlers and
        learning how to solve problems against a variety of styles.
      </p>

      <PullQuote attribution="Athlete response">
        I enjoy the high level practice partners the most because that&apos;s where I feel I make the most growth.
      </PullQuote>

      <p>
        Parents echoed this sentiment. One parent explained that practicing with higher-level wrestlers consistently
        pushed their athlete to improve. Another described training with top talent and traveling to compete against the
        nation&apos;s best as one of the most beneficial developmental experiences available. A third parent wrote that
        exposure to high-caliber training partners challenged decision-making and rapidly developed sports IQ and
        situational awareness.
      </p>
      <p>
        Coaches were equally emphatic about the importance of training partners. In fact, many identified quality
        partners as one of the most powerful accelerators of development in the entire study. Where coaches added insight
        was not in whether training partners mattered, but in what makes a training partner valuable. Several pointed out
        that a high-level wrestler is not automatically a great practice partner. One coach observed that a dedicated
        mid-level partner who provides accountability, effort, and quality looks may contribute more to development than
        a talented wrestler who simply goes through the motions. Another noted that some athletes who have jumped levels
        fail to provide quality looks to others, limiting the developmental value they bring to the room.
      </p>
      <p>
        The message was remarkably consistent across all three groups. Athletes improve fastest when they are surrounded
        by training partners who challenge them, expose weaknesses, provide feedback, and create accountability every
        day.
      </p>

      <h2>Coaching and the Power of Individualized Development</h2>
      <p>
        Another major theme involved coaching, particularly individualized coaching. Athletes repeatedly referenced
        private lessons, small-group instruction, and high-quality coaches. One athlete identified &ldquo;high quality
        coaches in small groups&rdquo; as the factor that helped him jump levels. Another pointed to &ldquo;working with
        high quality coaches in small groups.&rdquo;
      </p>
      <p>
        Parents often described coaching in terms of direct feedback and mentorship. One parent explained that
        small-group instruction allowed technical flaws to be diagnosed and corrected immediately while engagement,
        confidence, and wrestling IQ increased rapidly. Another described private and small-group training as a
        high-accountability environment where an athlete can fail, adjust, and learn without the pressure of a large
        crowd.
      </p>
      <p>
        Coaches agreed and often reinforced what athletes and parents were already describing. Several emphasized the
        importance of individualized instruction and adapting coaching to the needs of the athlete. One coach warned
        against &ldquo;cookie cutter&rdquo; coaching, while another highlighted the value of tailoring drills and
        techniques to an athlete&apos;s style, strengths, and developmental needs. One coach answered, &ldquo;I say
        private lessons, because it allows athletes to get one on one time to work on their craft.&rdquo;
      </p>
      <p>
        Taken together, the responses suggest that coaching is about much more than showing moves. Great coaching creates
        an environment where learning becomes more efficient because feedback is targeted to the athlete&apos;s most
        immediate developmental needs.
      </p>

      <PullQuote attribution="Coach response">
        I say private lessons, because it allows athletes to get one on one time to work on their craft.
      </PullQuote>

      <h2>Live Wrestling</h2>
      <p>
        Few topics generated as much discussion as live wrestling. Athletes loved it. They wrote &ldquo;live during
        practice,&rdquo; &ldquo;live go&apos;s,&rdquo; and &ldquo;I enjoy live wrestling the most.&rdquo; One athlete
        offered perhaps the most memorable explanation in the entire study: &ldquo;Wrestling is half feel and half
        technique and you get that feel wrestling with good kids live.&rdquo;
      </p>

      <PullQuote attribution="Athlete response">
        Wrestling is half feel and half technique and you get that feel wrestling with good kids live.
      </PullQuote>

      <p>
        Parents echoed the same general idea. Many viewed live wrestling as motivating and valuable because it exposes
        athletes to pressure, resistance, and different styles. For athletes especially, live wrestling is where
        wrestling feels most real. It is where technique meets reaction.
      </p>
      <p>
        The coaches, however, introduced one of the most sophisticated insights in the study. Several argued that not all
        live wrestling produces the same developmental outcomes. One coach described &ldquo;high IQ play wrestling&rdquo;
        as the most valuable version of live wrestling, explaining that athletes continue solving positional problems
        rather than focusing exclusively on winning exchanges. Another coach described situational live wrestling as the
        place where self-correcting habits are formed. Others cautioned that poorly controlled live wrestling can
        increase injury risk and reduce the consistency that ultimately drives development.
      </p>
      <p>
        The coaches were not dismissing live wrestling. They were refining it. Their responses suggest that live
        wrestling is most valuable when it functions as a learning exercise rather than simply a way to determine who
        wins and loses. In that sense, developmental live wrestling may be the bridge between drilling and competition,
        allowing wrestlers to build feel, creativity, and problem-solving ability under realistic pressure.
      </p>

      <h2>What the Assessment Missed</h2>
      <p>
        The final question asked participants to identify factors that had helped improve or accelerate performance but
        were not included in the survey. Their responses revealed several themes that may help explain why some athletes
        improve more rapidly than others.
      </p>
      <p>
        Athletes frequently mentioned camps, open mats, extra practice opportunities, online instructional content,
        curiosity, and a willingness to ask questions. Parents highlighted mentorship, recovery, exposure to different
        coaching styles, and training with a variety of partners and programs. Coaches expanded the conversation even
        further. While many reinforced the importance of coaching, training partners, and developmental environments,
        several pointed to factors that were not directly measured by the assessment. Personal drive, accountability,
        leadership, discipline, recovery, spirituality, goal setting, and self-preparation appeared repeatedly throughout
        their responses.
      </p>

      <PullQuote attribution="Coach response">Personal drive is the only factor I would give a 10/10.</PullQuote>

      <p>
        Collectively, they suggest that accelerated development may be influenced not only by coaching, training
        partners, and competition, but also by personal character and the choices athletes make when nobody is directing
        them.
      </p>

      <h2>Key Takeaways</h2>
      <p>
        Taken together, the findings from the JUMPS Assessment paint a remarkably consistent picture of how wrestlers
        improve and, perhaps more importantly, how they improve rapidly. Rather than pointing to different developmental
        pathways, athletes, parents, and coaches repeatedly emphasized the same core factors: consistency, quality
        training partners, high-quality coaching, individualized instruction, strong developmental environments, and
        challenging competition.
      </p>
      <p>
        The findings suggest that rapid improvement occurs when multiple developmental advantages begin working together
        and compounding over time. Coaching builds skill, training partners provide challenge, consistency creates
        repetition, and competition exposes weaknesses. Individually, each contributes to development. Together, they
        create a developmental system whose effects become progressively more powerful over time.
      </p>
      <p>
        The wrestling community often talks about athletes who suddenly &ldquo;jump levels,&rdquo; but the findings from
        this study suggest those jumps are rarely sudden at all. More often, they are the visible result of countless
        practices, thousands of repetitions, meaningful feedback, strong coaching, challenging partners, and a
        developmental environment that consistently pushes athletes beyond their comfort zones. Long before anyone
        recognizes the breakthrough, its foundation has already been built. The jump-level moment is simply the point at
        which months, and sometimes years, of accumulated growth finally become impossible to miss.
      </p>
    </article>
  )
}
