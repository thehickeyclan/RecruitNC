/**
 * Working the process: the practical side of recruiting, step by step (Matt, 15 Oct 2026, from a
 * parent's guide shared on Reddit, rewritten our way). This is advice, not rules, and the page
 * says so; the rules live in content.ts with their sources. Where a step is something the
 * Command Center does for you, it links there.
 */
export type WorkingStep = { heading: string; points: string[]; tool?: { label: string; href: string } }

export const WORKING_STEPS: WorkingStep[] = [
  {
    heading: "Be honest about the level",
    points: [
      "Ask your high school and club coaches, especially ones who have sent wrestlers to college, which levels they see you at.",
      "Compare your results with the NC wrestlers who went to each level. Your comparison does this with real data.",
      "Watch college matches at different levels, in person or online. Most wrestlers who compete in college do it outside Division I.",
    ],
    tool: { label: "Compare your colleges", href: "/recruiting/compare" },
  },
  {
    heading: "Set up before you start",
    points: [
      "Use one email address just for recruiting, so nothing from a coach gets lost among everything else.",
      "Check the spam and junk folders every few days. Coach emails land there more often than you would think.",
      "Keep one info sheet with everything a college asks for: weight, results, grades, test scores, contact details and links.",
      "Get the profile complete and the video current before you write to anyone. A coach opens the profile before replying.",
    ],
    tool: { label: "Copy your info sheet", href: "/my-recruiting" },
  },
  {
    heading: "Fill out the questionnaires",
    points: [
      "Almost every program has a recruiting questionnaire on its athletics website. It puts you in their recruiting database.",
      "Fill it out before you email, and say in the email that you have.",
      "They all ask the same things, so paste from your info sheet.",
    ],
    tool: { label: "Questionnaires for your colleges", href: "/recruiting/college-map?list=1" },
  },
  {
    heading: "Write to coaches",
    points: [
      "Say who you are, your school and club, your weight, your best results, what you are working toward, and why that college.",
      "Copy every coach on the staff. You often won't know who runs recruiting, and they will tell you.",
      "Ask for one thing: a call, or what the coach would want to see from you this season.",
      "Follow up once, after a new result. If there is still no reply, that is usually the answer. Coaches also go quiet in the middle of a conversation; it is rarely personal.",
    ],
    tool: { label: "Email a coach", href: "/my-recruiting" },
  },
  {
    heading: "Keep track of everything",
    points: [
      "Note every call and email: who, when, what was said, what happens next. When a coach calls again, you will remember.",
      "Note which coaches were at the events you wrestled.",
      "Move each college along your board as things happen, so you can see at a glance where you stand.",
    ],
    tool: { label: "Your college board", href: "/my-recruiting#plan" },
  },
  {
    heading: "Camps",
    points: [
      "Many camp invitations are sent to everyone: camps raise money for programs. A personal invitation from a coach means much more.",
      "A college's own camp shows you to that staff only. A camp run by another organization may bring several colleges' coaches.",
      "One camp early is worth it just to learn how they work and how you compare.",
    ],
  },
  {
    heading: "Social media",
    points: [
      "Clean it up. A coach will look.",
      "Put your class, weight, school and a link to the profile in your bio.",
      "Follow the programs you like, and watch who follows you back. A new program following you is a reason to fill out their questionnaire and write.",
    ],
  },
  {
    heading: "When a coach calls",
    points: [
      "Practise a call with a parent or coach first. It gets easier quickly.",
      "Have a few notes on the college and three or four questions ready.",
      "Take calls even from programs you are unsure about. It is good practice, and you may be surprised.",
      "Write down what was said straight after.",
    ],
  },
]

/** Good questions to ask a college coach. */
export const COACH_QUESTIONS = [
  "Where do you see me fitting in your lineup, and when?",
  "How many wrestlers do you have at my weight, and how many are in their last year?",
  "Did your college opt in to the House settlement? Does the 30-man roster limit apply?",
  "Is this a roster spot, and is there aid? How much, and for how many years?",
  "What do your wrestlers study, and how do they balance class and practice?",
  "What would you want to see from me this season?",
  "What is the next step, and when should I visit?",
]
