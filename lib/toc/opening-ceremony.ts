/**
 * Friday's opening ceremony, as Pastor Jason Gore runs it from the microphone.
 *
 * Athletes walk in in two weight-ordered lines from opposite sides and stand across the mats for
 * the whole ceremony. Prayer comes before the anthem. Logistics lines follow the Know Before You Go
 * section so families hear the same thing they read.
 */

export const OPENING_CEREMONY_WHEN = "Friday, September 18 · Hope Community Church, Apex"
export const OPENING_CEREMONY_MC = "Pastor Jason Gore"

export type CeremonyStep = { time: string; length: string; segment: string; athletes: string }

export const OPENING_CEREMONY_TIMELINE: CeremonyStep[] = [
  { time: "5:15 PM", length: "15 min", segment: "Athletes line up in two lines, in weight order", athletes: "Warm-up area, out of sight" },
  { time: "5:28 PM", length: "2 min", segment: "Crowd settles · walk-in music ready · mic to Jason", athletes: "Waiting at both entrances" },
  { time: "5:30 PM", length: "3 min", segment: "Walk-in — both lines enter from opposite sides, onto the mats", athletes: "Walking in, then standing across the mats" },
  { time: "5:33 PM", length: "2 min", segment: "Welcome", athletes: "Standing on the mats" },
  { time: "5:35 PM", length: "4 min", segment: "Message", athletes: "Standing on the mats" },
  { time: "5:39 PM", length: "2 min", segment: "Logistics", athletes: "Standing on the mats" },
  { time: "5:41 PM", length: "2 min", segment: "Prayer", athletes: "Standing, heads bowed" },
  { time: "5:43 PM", length: "3 min", segment: "National anthem", athletes: "Standing, facing the flag" },
  { time: "5:46 PM", length: "4 min", segment: "Send-off — athletes leave the mats", athletes: "Walking off to warm-up" },
  { time: "5:50 PM", length: "10 min", segment: "Mats wiped · Round 1 wrestlers called", athletes: "Round 1 wrestlers report" },
  { time: "6:00 PM", length: "", segment: "First whistle — Round 1 on two mats", athletes: "" },
]

export type CeremonySegment = {
  id: string
  time: string
  title: string
  /** Read aloud as written. */
  script?: string[]
  /** Talking points, in Jason's own words. */
  points?: string[]
  /** Stage direction for Jason and the crew. */
  cue?: string
}

export const OPENING_CEREMONY_SCRIPT: CeremonySegment[] = [
  {
    id: "walk-in",
    time: "5:30 PM",
    title: "Walk-in",
    cue: "Music up. Start once both lines are moving, then hold the mic until both lines are standing on the mats.",
    script: [
      "Ladies and gentlemen, please rise and welcome the athletes of the 2026 NC United Tournament of Champions! Eighty wrestlers. Ten weight classes. The best in North Carolina — every one of them invited to be here.",
    ],
  },
  {
    id: "welcome",
    time: "5:33 PM",
    title: "Welcome",
    script: [
      "Good evening, and welcome to Hope Community Church. My name is Jason Gore, and I'm the pastor here. It is an honor for our church to host the very first Tournament of Champions.",
      "Parents, grandparents, coaches, brothers and sisters — you are the reason these athletes are standing here. Welcome.",
    ],
  },
  {
    id: "message",
    time: "5:35 PM",
    title: "Message",
    points: [
      "Why tonight matters: these athletes earned their invitation through years of early mornings, hard practices and no shortcuts.",
      "The theme of the weekend: tomorrow NC United presents the Caden Perry Warrior Scholarship, built on one line — “The future is bright for those who refuse to quit.” That's what wrestling teaches, win or lose.",
      "To the athletes: wrestle hard, respect your opponent, respect the officials, and carry yourselves in a way your families are proud of.",
      "To the crowd: cheer loud, and cheer for every kid on the mat. Every one of them belongs here.",
    ],
  },
  {
    id: "logistics",
    time: "5:39 PM",
    title: "Logistics",
    script: [
      "A few things so everyone has a great weekend:",
      "This is a family event, and this building is our church's home. Please throw away your trash and help us leave it cleaner than we found it.",
      "There is no food in the gym. Please enjoy concessions and the food trucks outside the gym.",
      "Spectators, please use the main lobby restrooms. Athletes, please use the locker rooms in the warm-up area.",
      "Only coaches, officials, table workers and volunteers are on the floor. Our volunteers are in red shirts if you need anything.",
      "Round one starts at six on both mats and runs until about nine tonight.",
      "Can't be here, or family watching at home? Every match streams live on FloWrestling, and brackets and results are in the NC United app.",
      "Tomorrow: wrestling starts at 9:00, the Giving Hour and the Caden Perry Warrior Scholarship are at 2:30, and championship finals on one mat start at 4:00.",
      "And a special thank-you to the Hickey family, who donated these two mats — a $24,000 gift to North Carolina wrestling.",
    ],
  },
  {
    id: "prayer",
    time: "5:41 PM",
    title: "Prayer",
    cue: "A starting point — Jason's own words are best.",
    script: [
      "Please join me in prayer, or in a moment of reflection.",
      "Lord, thank You for this night, for these young people, and for the families who sacrifice so much for them. Keep every athlete safe on these mats. Give them strength, courage and good sportsmanship, in victory and in loss. Give our officials wisdom and our coaches patience. Bless every family travelling here and home again. Let this weekend build character that lasts far longer than any match. In Your name we pray. Amen.",
    ],
  },
  {
    id: "anthem",
    time: "5:43 PM",
    title: "National anthem",
    script: ["Please remain standing, face the flag, remove your hats, and join us for our national anthem."],
  },
  {
    id: "send-off",
    time: "5:46 PM",
    title: "Send-off",
    script: ["Athletes, thank you — and good luck this weekend. Please head back to the warm-up area. Round one begins in just a few minutes. Let's wrestle!"],
  },
]

export const OPENING_CEREMONY_NOTES: string[] = [
  "Clubs, never schools, on the microphone. If he names a wrestler, it is club and class year only — or unaffiliated.",
  "Keep it moving: welcome through prayer is about ten minutes. The 6:00 first whistle protects the 9:00 finish.",
  "Jason does not announce matches. The table calls Round 1; Ryan Mitchell announces the finals Saturday.",
]
