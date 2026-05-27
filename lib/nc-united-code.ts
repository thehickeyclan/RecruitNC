export const NC_UNITED_CODE_ANCHOR = "nc-united-code"
export const NC_UNITED_CODE_HREF = `/national-team#${NC_UNITED_CODE_ANCHOR}`

export type NcUnitedCodePrinciple = {
  number: number
  title: string
  body: string
}

export const NC_UNITED_CODE = {
  title: "The NC United Code",
  tagline: "Represent North Carolina the right way.",
  intro: "Competing on an NC United National Team is earned, not guaranteed.",
  principles: [
    {
      number: 1,
      title: "Team Before Self",
      body: "Support teammates. Stay engaged. Win and lose together.",
    },
    {
      number: 2,
      title: "Earn the Singlet",
      body: "The NC United singlet represents effort, commitment, and responsibility.",
    },
    {
      number: 3,
      title: "Respect the Opportunity",
      body: "Compete against elite competition. Represent NC nationally. Learn, grow, and make the most of it.",
    },
    {
      number: 4,
      title: "Be All In",
      body: "No disappearing after matches. Support teammates and stay present.",
    },
    {
      number: 5,
      title: "Be Coachable",
      body: "Listen. Learn. Accept feedback. Grow.",
    },
    {
      number: 6,
      title: "Compete With Class",
      body: "Win humbly. Lose respectfully. Represent NC the right way.",
    },
    {
      number: 7,
      title: "Handle Free Time Like an Athlete",
      body: "Recover. Hydrate. Rest. Prepare. National events are not vacations.",
    },
    {
      number: 8,
      title: "Hotel & Travel Conduct",
      body: "Hotels, vans, restaurants, and venues are extensions of the team. Be respectful. No horseplay. No room hopping. Leave places better than you found them.",
    },
    {
      number: 9,
      title: "Stay Connected",
      body: "Stay with the team. Communicate with coaches. Do not leave team activities without parent / coach awareness.",
    },
    {
      number: 10,
      title: "Build Relationships",
      body: "The medals fade. The friendships remain.",
    },
    {
      number: 11,
      title: "Protect the Culture",
      body: "Bring energy. Avoid drama. Lift teammates up.",
    },
    {
      number: 12,
      title: "Mat-Side Conduct",
      body: "Use language and behavior that reflects NC United values. Support teammates. Encourage others. No profanity. No disrespect. No negative sideline behavior.",
    },
    {
      number: 13,
      title: "Social Media & Media Conduct",
      body: "You represent NC United online just like you do on the mat. Celebrate teammates. Share the experience. Support one another. Be respectful to opponents, officials, coaches, parents, and teams. No negative posts, arguments, or content that reflects poorly on the team. Remember: what you post represents more than yourself.",
    },
  ] satisfies NcUnitedCodePrinciple[],
  closingHeading: "The Question:",
  closingLines: [
    "Did we represent North Carolina the right way?",
    "On the mat.",
    "Mat-side.",
    "At the hotel.",
    "Online.",
    "Everywhere.",
  ],
  motto: "Strength in Unity",
} as const

/** Short bullets for event info pages — link to full Code on the national program page. */
export const NC_UNITED_CODE_EVENT_EXCERPT = [
  "Team before self — support teammates and stay engaged win or lose.",
  "Hotel & travel conduct — hotels, vans, and venues are extensions of the team.",
  "Mat-side conduct — encourage teammates; no profanity or negative sideline behavior.",
  "Social media — celebrate teammates; no negative posts or content that reflects poorly on the team.",
  "Handle free time like an athlete — national events are not vacations.",
] as const
