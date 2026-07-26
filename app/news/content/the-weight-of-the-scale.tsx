const references = [
  "Alpay, M. R., Kovacs, R. E., Saadani, S., Wang, F., & Boros, S. (2025). Eating disorders and disordered eating on wrestling sport: A systematic review. BMC Nutrition, 11, Article 198.",
  "American Academy of Pediatrics. (2017). Promotion of healthy weight-control practices in young athletes. Pediatrics, 140(3), e20171871.",
  "Burroughs, J. (2012). Why cut? Move up. JB’s Blog.",
  "Centers for Disease Control and Prevention. (1998). Hyperthermia and dehydration-related deaths associated with intentional rapid weight loss in three collegiate wrestlers—North Carolina, Wisconsin, and Michigan, November–December 1997. Morbidity and Mortality Weekly Report.",
  "De Souza, M. J., Koltun, K. J., Southmayd, E. A., Williams, N. I., Mallinson, R. J., Strock, N. C. A., Ricker, E. A., Scheid, J. L., Allaway, H. C. M., & Mallinson, D. J. (2021). The Male Athlete Triad—A consensus statement from the Female and Male Athlete Triad Coalition. Part I: Definition and scientific basis. Clinical Journal of Sport Medicine, 31(4), 345–353.",
  "Hamilton, A. (2023, October 26). Why Trent Hidlay moved up to 197 pounds. FloWrestling.",
  "Keys, A., Brožek, J., Henschel, A., Mickelsen, O., & Taylor, H. L. (1950). The biology of human starvation. University of Minnesota Press.",
  "NCAA News. (1998). Wrestling weight-loss rule recommendation approved.",
  "Oppliger, R. A., Landry, G. L., Foster, S. W., & Lambrecht, A. C. (1993). Bulimic behaviors among interscholastic wrestlers: A statewide survey. Pediatrics, 91(4), 826–831.",
  "Roemmich, J. N., & Sinning, W. E. (1997a). Weight loss and wrestling training: Effects on nutrition, growth, maturation, body composition, and strength. Journal of Applied Physiology, 82(6), 1751–1759.",
  "Roemmich, J. N., & Sinning, W. E. (1997b). Weight loss and wrestling training: Effects on growth-related hormones. Journal of Applied Physiology, 82(6), 1760–1764.",
  "Tocci, A. (2017). The right way to make weight. USA Wrestling.",
  "Turocy, P. S., DePalma, B. F., Horswill, C. A., Laquale, K. M., Martin, T. J., Perry, A. C., Somova, M. J., & Utter, A. C. (2011). National Athletic Trainers’ Association position statement: Safe weight loss and maintenance practices in sport and exercise. Journal of Athletic Training, 46(3), 322–336.",
  "United States Conference of Catholic Bishops. (n.d.). Fast and abstinence.",
  "United States Conference of Catholic Bishops. (n.d.). What is Lent?",
  "USA Wrestling. (2003). World Team Trials press conference quotes, featuring Sanderson, Gardner, Downing, Williams, Montgomery.",
  "USA Wrestling. (2026). Hidlay’s late four-point move secures Final X victory; earns Senior Men’s Freestyle World Team spot.",
  "WIN Magazine. (2015). Move to 189 pounds will let Taylor focus more on wrestling, not weight cutting.",
  "Wrestling Mindset. (2024). Making adjustments: Yianni Diakomihalis.",
  "Wrestling Mindset. (2026). NJ State Champion Greyson Pettit—Wrestling Mindset Success Story.",
]

const sections = [
  ["match-before-the-match", "The Match Before the Match"],
  ["pressure-to-win", "The Pressure to Win"],
  ["two-stories", "Two Stories That Frame the Question"],
  ["elite-wrestlers", "A Recurring Theme Among Elite Wrestlers"],
  ["diminishing-returns", "The Point of Diminishing Returns"],
  ["critical-growth-years", "Cutting Weight During Critical Years of Growth"],
  ["physical-risks", "The Physical Risks Are Real"],
  ["mental-health", "Mental Health, Food, and Eating Disorders"],
  ["adults-in-the-room", "The Adults in the Room"],
  ["questions-worth-asking", "Questions Worth Asking"],
  ["closing-reflection", "Closing Reflection"],
] as const

const wrestlerQuestions = [
  "When has cutting weight helped me wrestle better?",
  "When has cutting weight hurt my energy, practice quality, mood, or joy in the sport?",
  "Have I ever moved up and performed better?",
  "Am I thinking more about wrestling or more about food, water, and the scale?",
]

const coachQuestions = [
  "How do we determine a proper weight class for each athlete?",
  "What warning signs tell us the cut is hurting performance, health, or development?",
  "Have we ever moved a wrestler up because the cut was costing more than it gave?",
  "Are our lineup decisions developing the wrestler or merely solving a short-term matchup problem?",
]

const parentQuestions = [
  "Do I feel confident helping my child manage weight safely?",
  "Have I ever felt uneasy about a cut but stayed quiet?",
  "Would my child feel comfortable telling me the cut is becoming too much?",
  "Do I know when to involve a physician, dietitian, athletic trainer, or mental-health professional?",
]

export function TheWeightOfTheScaleContent() {
  return (
    <article className="not-prose max-w-none text-slate-700">
      <p className="text-lg font-semibold text-slate-800">
        Wrestling’s scale can create opportunity, discipline, and tactical advantage. It can also become a hidden
        opponent — one that affects performance, development, health, and a young athlete’s relationship with the sport.
      </p>

      <div className="my-6 rounded-2xl border border-[#D3B574]/40 bg-[#FFF7DF] p-5 text-sm leading-relaxed text-slate-800 shadow-sm">
        <div className="mb-2 flex items-center gap-2 text-xs font-black uppercase tracking-[0.18em] text-[#8A6200]">
          <span aria-hidden="true">⚠️</span>
          Editor’s note
        </div>
        <p>
          This article is educational and should not replace individualized guidance from qualified medical, nutrition,
          or mental-health professionals. Wrestlers, parents, and coaches should follow applicable weight-management
          rules and seek professional support when weight loss, hydration, eating behaviors, or athlete health become a
          concern.
        </p>
      </div>

      <div className="my-6 rounded-2xl border border-slate-200 bg-slate-50 p-5">
        <h2 className="m-0 text-lg font-black text-[#13294B]">Key takeaways</h2>
        <ul className="mt-3 space-y-2 pl-5 text-sm leading-relaxed text-slate-700">
          <li>The lowest weight class is not automatically the best weight class.</li>
          <li>A cut only helps if the athlete can still train, recover, think clearly, and compete with energy.</li>
          <li>Adolescence is a limited growth window; chronic underfueling can cost long-term development.</li>
          <li>Adults should watch for behavioral warning signs, not just whether the wrestler makes weight.</li>
        </ul>
      </div>

      <div className="lg:grid lg:grid-cols-[220px_minmax(0,1fr)] lg:gap-8">
        <aside className="mb-8 lg:mb-0">
          <details className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm lg:hidden">
            <summary className="cursor-pointer rounded-xl bg-[#13294B] px-3 py-2 text-sm font-black text-white">
              In this article
            </summary>
            <ol className="mt-3 space-y-2 text-sm">
              {sections.map(([id, label]) => (
                <li key={id}>
                  <a
                    className="block rounded-lg px-2 py-1.5 text-slate-600 hover:bg-slate-100 hover:text-[#13294B]"
                    href={`#${id}`}
                  >
                    {label}
                  </a>
                </li>
              ))}
            </ol>
          </details>

          <nav className="sticky top-24 hidden rounded-2xl border border-slate-200 bg-white p-4 shadow-sm lg:block">
            <p className="mb-3 rounded-xl bg-[#13294B] px-3 py-2 text-left text-sm font-black text-white">
              In this article
            </p>
            <ol className="space-y-2 text-sm">
              {sections.map(([id, label]) => (
                <li key={id}>
                  <a
                    className="block rounded-lg px-2 py-1.5 text-slate-600 hover:bg-slate-100 hover:text-[#13294B]"
                    href={`#${id}`}
                  >
                    {label}
                  </a>
                </li>
              ))}
            </ol>
          </nav>
        </aside>

        <div className="min-w-0 [&_h2]:mt-10 [&_h2]:mb-4 [&_h2]:text-2xl [&_h2]:font-black [&_h2]:text-[#13294B] [&_p]:my-4 [&_p]:leading-7 [&_ul]:my-3 [&_ul]:list-disc [&_ul]:pl-6 [&_li]:my-1.5">
          <h2 id="match-before-the-match">The Match Before the Match</h2>
          <p>
            Wrestling is often called the toughest sport in the world, but it has also been described as one of the
            fairest. Its one-on-one nature leaves little room to hide. There is no specialized equipment to create an
            advantage, no teammate to compensate for a mistake, and no opponent who is dramatically larger or smaller.
            In theory, each wrestler steps onto the mat against someone of roughly the same size, and the outcome is
            determined by preparation, skill, conditioning, strategy, and effort.
          </p>
          <p>
            Yet, as human beings, we are always searching for a tactical advantage. In wrestling, that search has often
            led athletes to believe that weighing less, and therefore competing against a supposedly smaller opponent,
            will give them an edge. That belief is one reason the scale holds such power in the sport. It shapes
            lineups, rankings, matchups, strategy, confidence, and sometimes even a wrestler’s identity.
          </p>
          <p>
            There is no doubt that cutting weight can help. A wrestler who makes a lower weight may gain a real size,
            strength, or leverage advantage. The process can also build discipline, planning, restraint, and mental
            toughness. In a sport built on sacrifice and discomfort, cutting weight can feel like another test of
            commitment. For some wrestlers, it may even feel meaningful — almost spiritual — because it resembles
            fasting, self-denial, and giving something up for a greater purpose.
          </p>
          <p>
            But there is another side to the cut. At some point, the question changes from “Can I make this weight?” to
            “Is making this weight actually helping me wrestle better?” That is the point this story is meant to
            explore. When does cutting weight create an edge, when does it begin to steal that edge away, and when does
            it become too burdensome or even dangerous?
          </p>

          <h2 id="pressure-to-win">The Pressure to Win</h2>
          <p>
            Weight cutting is not only about seeking an edge. It is about winning. Wrestlers cut weight because they
            believe it may help them win the next match, earn the starting spot, make the lineup, qualify for the
            postseason, place at a major tournament, or help their team score points. Coaches may see a lower weight
            class as the best strategic move. Parents may see it as part of commitment. Athletes may see it as the price
            of chasing serious goals.
          </p>
          <p>
            That pressure can make the cut feel necessary, even when the wrestler is struggling. In a sport where
            toughness is valued, hunger, fatigue, irritability, dehydration, and misery can be mistaken for proof of
            dedication. The desire to win is not wrong; wrestling is a competitive sport. But when winning becomes tied
            too closely to making the lowest possible weight, the question becomes whether the wrestler is being
            developed or depleted.
          </p>

          <h2 id="two-stories">Two Stories That Frame the Question</h2>
          <p>Two stories help frame the issue: Greyson Pettit and Trent Hidlay.</p>
          <p>
            Greyson Pettit, a New Jersey state champion and University of Iowa commit, has spoken openly on Wrestling
            Mindset about the toll weight cutting took on him earlier in his career. Discussing a cut of more than 20
            pounds during his sophomore season, he said, “It made me hate the sport…I got to the state tournament and I
            didn’t want to wrestle anymore.” Even when a top seed failed to make weight, allowing Pettit to advance to
            the second day of the tournament, his reaction was not relief. He said he was angry because it meant he had
            to weigh in again. In his words, “I weighed in and gave up.”
          </p>
          <figure className="my-6 border-l-4 border-[#D3B574] bg-slate-50 px-5 py-4">
            <blockquote className="text-xl font-black leading-snug text-[#13294B]">
              “It made me hate the sport…I got to the state tournament and I didn’t want to wrestle anymore.”
            </blockquote>
            <figcaption className="mt-2 text-sm font-semibold text-slate-500">
              — Greyson Pettit, via Wrestling Mindset
            </figcaption>
          </figure>
          <p>
            After that season, Pettit wrestled closer to his natural weight at freestyle states and won, which made him
            think he should compete at a higher weight his junior year. But he was eventually talked out of it after
            being told he would not have a chance at that weight class. So he made the big cut again. Pettit described
            missing out on Christmas during both his sophomore and junior years, not wanting to be around anyone, and
            said the weight cut took him to a “really dark place.”
          </p>
          <p>
            That is what makes the end of his story so powerful. After years of fighting the scale, Pettit finally moved
            up to his natural weight of 132 pounds. Wrestling stronger, healthier, and freer, he won a New Jersey state
            championship as the 21 seed, which has been described as the lowest seed to ever win a New Jersey state
            title (Wrestling Mindset, 2026).
          </p>
          <p>
            Trent Hidlay’s story raises a similar question at the elite level. In a FloWrestling interview titled “Why
            Trent Hidlay Moved Up To 197 Pounds,” Hidlay discussed his move from 184 to 197 for his senior season after
            placing second, fifth, and fourth at the NCAA Championships at 184 pounds (Hamilton, 2023). His decision
            came after honest self-analysis. Hidlay explained that when he reviewed the matches he was losing, the
            problems were not simply about size or conditioning. They were technical and strategic. He was losing
            positions that needed to be fixed.
          </p>
          <p>
            That realization forced him to ask a difficult question: did he have enough time and energy to both make a
            hard weight cut and make the technical improvements needed to become a better wrestler? For Hidlay, the
            answer was no. Cutting weight, recovering from the cut, and managing his body were taking energy away from
            the work he actually needed to do on the mat. So he made the decision to move up a weight class.
          </p>
          <figure className="my-6 border-l-4 border-[#D3B574] bg-slate-50 px-5 py-4">
            <blockquote className="text-xl font-black leading-snug text-[#13294B]">
              The better question is not “Can I make this weight?” It is “Is making this weight helping me become a
              better wrestler?”
            </blockquote>
          </figure>
          <p>
            Instead of spending so much of his season fighting the scale, Hidlay gave himself more room to train,
            recover, improve positions, and focus on wrestling. The move paid off immediately, as he finished second at
            the NCAA Championships at 197 pounds. But the bigger payoff came after college. Wrestling internationally at
            92 kg, Hidlay did more than prove he could compete at a higher weight. He became a Senior World Champion and
            then made another World Team this past June (USA Wrestling, 2026).
          </p>
          <p>
            These stories challenge one of wrestling’s most common assumptions: that the best weight class is the lowest
            one an athlete can possibly make. For Hidlay and Pettit, and many other wrestlers, moving up allowed them to
            get better.
          </p>

          <h2 id="elite-wrestlers">A Recurring Theme Among Elite Wrestlers</h2>
          <p>
            Pettit and Hidlay are not isolated examples of those who oppose big weight cuts. Jordan Burroughs has
            written that he has never been a big fan of cutting weight and argued that the less time wrestlers spend
            worrying about weight, the more time they can spend developing skills (Burroughs, 2012). David Taylor’s move
            up in weight was discussed in similar terms, allowing him to focus more on wrestling than on cutting; Taylor
            specifically said he had been focusing more on the weight cut and recovery than on becoming a better
            wrestler (WIN Magazine, 2015). Yianni Diakomihalis has also discussed the idea that cutting weight is not
            always the answer, and Cael Sanderson has warned that for too many young wrestlers, the sport becomes more
            about cutting weight than wrestling (Wrestling Mindset, 2024; USA Wrestling, 2003).
          </p>
          <p>
            Together, these examples point to the same question: when does the cut stop helping the wrestler and start
            becoming the main opponent?
          </p>

          <h2 id="diminishing-returns">The Point of Diminishing Returns</h2>
          <p>
            One of the central questions in this story is whether the lowest possible weight is always the best weight.
            In many cases, cutting down can help. A wrestler may gain a size, strength, or leverage advantage by
            competing at a lower class. But that advantage only matters if the athlete can still train well, recover
            well, think clearly, and compete with energy.
          </p>
          <p>
            At some point, a wrestler may still be able to make the weight, but the cut begins to take more than it
            gives. He may be lighter, but weaker. He may be in the perceived “right” weight class, but unable to train
            with intensity, recover properly, or compete with energy. He may look disciplined from the outside, but
            inside he may be exhausted, irritable, anxious, or constantly thinking about food, water, and the scale.
          </p>
          <p>
            That obsessive focus is worth paying attention to. The Minnesota Starvation Experiment was conducted during
            World War II to better understand the physical and psychological effects of starvation and to help guide the
            rehabilitation of people suffering from famine and severe food deprivation after the war. In that study, men
            who underwent prolonged semi-starvation became obsessed with food, and their concentration, mood,
            personality, and emotional stability were affected (Keys et al., 1950). Wrestling weight cuts are not the
            same as that experiment, but the comparison raises an important question: what happens to a young athlete’s
            mind when food, water, and the scale begin to dominate his daily life?
          </p>
          <p>
            The goal is not to see how much suffering an athlete can tolerate. The goal is to help that athlete become
            the best wrestler he can become. The real question is not simply, “Can I make this weight?” The better
            question is, “Is making this weight helping me become a better wrestler?”
          </p>
          <p>
            The best version of a wrestler is not the lightest version; it’s the strongest, healthiest, clearest, most
            energized version.
          </p>

          <h2 id="critical-growth-years">Cutting Weight During Critical Years of Growth</h2>
          <p>
            Perhaps the greatest concern is not what repeated weight cutting does over the course of a single match or
            season, but what it may do during the critical years of growth and development. Many wrestlers begin cutting
            weight during adolescence, the very period when their bodies require energy, protein, vitamins, minerals,
            and healthy fats to support puberty, bone development, hormonal function, and lean muscle growth.
          </p>
          <p>
            A young athlete’s nutritional needs do not decrease simply because he wants to compete in a lower weight
            class. Wrestlers must fuel normal growth, intense training, and recovery at the same time. Research on
            adolescent wrestlers has examined how seasonal weight loss and wrestling training affect nutrition, growth,
            maturation, body composition, protein nutrition, strength, and growth-related hormones (Roemmich & Sinning,
            1997a, 1997b).
          </p>
          <p>
            This issue extends beyond calories alone. Restrictive diets may deprive developing athletes of calcium,
            vitamin D, iron, protein, carbohydrates, and other nutrients needed to build strong bones, develop muscle,
            regulate hormones, replenish energy stores, and recover from training. More broadly, the Male Athlete Triad
            literature identifies adolescent and young adult male weight-class athletes as a group at risk for low
            energy availability, hormonal disruption, and impaired bone health (De Souza et al., 2021).
          </p>
          <p>
            Adolescence provides a limited developmental window. Wrestlers do not get those years back. An athlete who
            chronically underfuels may be sacrificing the growth, strength, muscle development, and physical maturation
            that could make him a better wrestler in the future, all for the temporary advantage of competing at a
            lighter weight today.
          </p>
          <p>
            The goal should not simply be to make the lowest possible weight. It should be to help young wrestlers grow
            into strong, healthy, well-fueled athletes. The American Academy of Pediatrics recommends that athletes in
            weight-class sports compete at a weight appropriate for their age, height, physique, and stage of growth and
            development, and it emphasizes gradual, medically appropriate weight management rather than rapid weight
            loss (American Academy of Pediatrics, 2017).
          </p>

          <h2 id="physical-risks">The Physical Risks Are Real</h2>
          <p>
            The physical risks of weight cutting are not theoretical. In 1997, three healthy collegiate wrestlers died
            within a little more than a month of one another while attempting to make weight: Billy Saylor of Campbell
            University, Joseph LaRosa of the University of Wisconsin–La Crosse, and Jeff Reese of the University of
            Michigan. Their deaths became one of the most important turning points in the modern history of wrestling
            weight management (CDC, 1998; NCAA News, 1998).
          </p>
          <p>
            The broader pattern involved rapid weight loss, dehydration, overheating, and extreme physiological strain.
            The wrestlers were restricting food and fluid intake, wearing vapor-impermeable suits, and exercising
            intensely in hot environments in the hours before weigh-ins. The CDC described the cases as hyperthermia and
            dehydration-related deaths associated with intentional rapid weight loss, and the NCAA approved weight-loss
            rule changes in response (CDC, 1998; NCAA News, 1998). Their deaths forced wrestling to change its rules
            because the danger was not imaginary. Wrestlers had died trying to make weight.
          </p>
          <p>
            But the issue has not disappeared. Recent cases involving wrestlers and heat illness show that some athletes
            are still using dangerous methods such as sweat suits, extreme workouts, and training in hot conditions to
            lose weight. Not every tragedy around wrestling practice is automatically a weight-cutting death, and that
            distinction matters. But the larger warning remains: when athletes are pressured to make a number, some will
            still take risks that place their health and lives in danger.
          </p>

          <h2 id="mental-health">Mental Health, Food, and Eating Disorders</h2>
          <p>
            The mental side of weight cutting may be just as important as the physical side. Many wrestlers manage
            weight responsibly, but sports-medicine research has consistently identified weight-class sports such as
            wrestling as higher-risk environments for disordered eating behaviors. The National Athletic Trainers’
            Association reported that 11% of wrestlers have been found to have eating disorders or disordered eating,
            while as many as 45% may be at risk of developing an eating disorder (National Athletic Trainers’
            Association, 2011). A recent wrestling-specific systematic review also identified common weight-loss
            practices such as fasting, restricting food and fluids, sauna use, plastic suits, diet pills, vomiting, and
            excessive exercise (BMC Nutrition, 2025).
          </p>
          <div className="my-6 border-l-4 border-red-500 bg-red-50 px-5 py-4 text-slate-800">
            <p className="!my-0">
              Recently, at a national-level event, I witnessed a high school wrestler cut in front of a line of men
              waiting to use the restroom, lean over, and intentionally make himself vomit. He then hurried away to
              recheck his weight. It was a brief moment, but it captured something larger: when making weight becomes
              urgent enough, behaviors that would alarm us in any other setting can begin to look normal inside the
              culture of the sport.
            </p>
          </div>
          <p>
            The culture around the scale can create real psychological and behavioral risks. Repeated restriction,
            dehydration, binge eating after weigh-ins, shame around missing weight, and constant anxiety about the scale
            can shape the way wrestlers think about food, water, their bodies, and even themselves. A statewide survey
            of high school wrestlers found rapid weight loss, weekly weight cycling, fasting before weigh-ins, and
            bulimic behaviors, leading researchers to warn that the potential for eating disorders was apparent in
            interscholastic wrestling (Oppliger et al., 1993).
          </p>
          <p>
            This matters even more now because many wrestlers compete nearly year-round, leaving little time for their
            relationship with food, training, recovery, and body weight to reset. In wrestling, discipline around food
            is often praised, and sometimes rightly so. But there may also be a point where discipline becomes disorder,
            sacrifice becomes obsession, and making weight begins to matter more than the health and development of the
            wrestler.
          </p>

          <h2 id="adults-in-the-room">The Adults in the Room</h2>
          <p>
            Coaches and parents belong at the forefront of this conversation. Wrestlers do not make weight-class
            decisions alone. Coaches influence lineups, rankings, expectations, and team strategy. Parents influence
            meals, routines, travel, medical decisions, and the emotional climate around the athlete. In some cases,
            parents may also directly or indirectly pressure their children to make a certain weight.
          </p>
          <p>
            A coach may care and still push a cut that hurts performance. A parent may care and still miss the warning
            signs of dehydration, anxiety, disordered eating, or burnout. Some adults may still be repeating what they
            experienced when they wrestled: eat less, sweat more, tough it out, make the weight. Wrestling has changed.
            Nutrition science has changed. Awareness of hydration, eating disorders, mental health, and long-term
            athlete development has changed. But in some rooms, the culture may still sound the same.
          </p>
          <p>
            That raises a difficult but necessary question: do coaches and parents know how to help athletes manage
            weight safely, and do they know when to stop? USA Wrestling has published guidance emphasizing more natural
            weights, warning against drastic cuts, and encouraging parents to intervene when unhealthy weight cutting is
            encouraged (Tocci, 2017).
          </p>

          <h2 id="questions-worth-asking">Questions Worth Asking</h2>
          <p>
            This article is not meant to end the debate. It is meant to start a better one. These questions are the part
            worth bringing into wrestling rooms, car rides home, parent meetings, and honest coach-to-athlete
            conversations.
          </p>
          <div className="my-6 grid gap-4 md:grid-cols-3">
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <h3 className="m-0 text-base font-black text-[#13294B]">For wrestlers</h3>
              <ul className="mt-3 list-disc space-y-2 pl-5 text-sm leading-relaxed">
                {wrestlerQuestions.map((question) => (
                  <li key={question}>{question}</li>
                ))}
              </ul>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <h3 className="m-0 text-base font-black text-[#13294B]">For coaches</h3>
              <ul className="mt-3 list-disc space-y-2 pl-5 text-sm leading-relaxed">
                {coachQuestions.map((question) => (
                  <li key={question}>{question}</li>
                ))}
              </ul>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <h3 className="m-0 text-base font-black text-[#13294B]">For parents</h3>
              <ul className="mt-3 list-disc space-y-2 pl-5 text-sm leading-relaxed">
                {parentQuestions.map((question) => (
                  <li key={question}>{question}</li>
                ))}
              </ul>
            </div>
          </div>

          <h2 id="closing-reflection">Closing Reflection</h2>
          <p>
            Weight cutting in wrestling is not simply good or bad. At its best, it can be a tool. It can teach
            discipline, sacrifice, planning, restraint, and toughness. It can create a competitive advantage and help a
            wrestler commit to a goal.
          </p>
          <p>
            But at its worst, it can become physically dangerous, mentally consuming, spiritually distorted, and
            developmentally limiting. It can damage the athlete’s relationship with food, create anxiety around the
            scale, reduce practice quality, increase health risks, interfere with healthy growth, and steal joy from the
            sport.
          </p>
          <p>
            The real question is not whether wrestlers should ever cut weight. The real question is whether the cut is
            helping the wrestler become better. If the cut helps the athlete train, compete, and grow, it may have a
            place in the sport. But if it leaves the wrestler weaker, anxious, obsessed, depleted, underfueled, or
            miserable, then the scale is no longer serving the wrestler. It is controlling him.
          </p>

          <div className="mt-10 rounded-2xl border border-[#D3B574]/40 bg-[#FFF7DF] p-5 text-sm leading-relaxed text-slate-800">
            <div className="mb-2 flex items-center gap-2 text-xs font-black uppercase tracking-[0.18em] text-[#8A6200]">
              <span aria-hidden="true">❤️</span>
              If you are concerned
            </div>
            <p>
              If an athlete is fainting, confused, severely dehydrated, repeatedly vomiting, or in immediate danger,
              seek emergency medical help. For emotional distress or crisis support in the United States, call or text{" "}
              <a className="font-bold text-[#13294B] underline" href="tel:988?oai_link_source=model_response_hotline">
                988
              </a>
              . For eating-disorder information and referral support, contact the National Alliance for Eating Disorders
              at{" "}
              <a className="font-bold text-[#13294B] underline" href="tel:18666621235">
                1-866-662-1235
              </a>
              .
            </p>
          </div>

          <div className="mt-8 rounded-2xl border border-slate-200 bg-slate-50 p-5">
            <h2 className="!mt-0 !text-lg">About the author</h2>
            <p className="!mb-0 text-sm leading-relaxed">
              James Bernthal, PhD, writes on athlete development, wrestling culture, and the long-term factors that
              shape performance, health, and a wrestler’s relationship with the sport.
            </p>
          </div>

          <details className="mt-8 rounded-2xl border border-slate-200 bg-white p-5">
            <summary className="cursor-pointer text-lg font-black text-[#13294B]">
              References ({references.length})
            </summary>
            <ol className="mt-4 list-decimal space-y-3 pl-5 text-sm leading-relaxed text-slate-600">
              {references.map((reference) => (
                <li className="pl-1" key={reference}>
                  {reference}
                </li>
              ))}
            </ol>
          </details>
        </div>
      </div>
    </article>
  )
}
