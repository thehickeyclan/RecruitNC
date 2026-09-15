/**
 * What families, athletes and coaches need on tournament day, in one place near the top of the TOC
 * page. Written by NC United staff; keep the wording close to what they sent families so the page
 * and the email agree.
 */

export type KnowBeforeYouGoSection = {
  id: string
  title: string
  items: string[]
  /** Optional in-page link shown under the list, e.g. to the full schedule. */
  link?: { href: string; label: string }
}

export const TOC_KNOW_BEFORE_YOU_GO_INTRO =
  "We can't wait to see everyone this weekend at Hope Community Church in Apex. Here's what you need to know."

export const TOC_KNOW_BEFORE_YOU_GO: KnowBeforeYouGoSection[] = [
  {
    id: "schedule",
    title: "Schedule",
    items: [
      "Friday: coaches and athletes can arrive at 3:30 PM, and doors open to the public at 4:30 PM. Opening ceremony at 5:30 PM, first whistle at 6:00 PM.",
      "Saturday: doors open at 7:30 AM for wrestlers and coaches, wrestling starts at 9:00 AM, the Giving Hour is at 2:30 PM, and championship finals start at 4:00 PM. If we are ahead of schedule, we will begin earlier.",
      "Parking is free.",
    ],
    link: { href: "#schedule", label: "Official timeline" },
  },
  {
    id: "weigh-ins",
    title: "Weigh-ins",
    items: [
      "Weigh-ins begin exactly at 4:00 PM Friday, and it is the only weigh-in. There is no Saturday weigh-in and no weight allowance.",
      "Singlets are required, and skin checks happen at the scale.",
      "We'll have multiple scales to get everyone weighed in quickly and leave plenty of time to rehydrate and recover.",
      "Every athlete receives an athlete lanyard after a successful weigh-in and skin check. Lanyards are required Friday and Saturday.",
    ],
  },
  {
    id: "bags-warm-up",
    title: "Athlete bags and warm-up",
    items: [
      "Please store all backpacks and bags in the Apex Room, where weigh-ins and the warm-up mat are. This keeps the gym floor open for athletes, corner coaches and college coaches.",
      "The warm-up area has two small locker rooms with lockers and restrooms. Both are for male athletes this weekend.",
      "A big thank you to Holly Springs High School for letting us use their brand-new mat in the warm-up room.",
    ],
  },
  {
    id: "restrooms",
    title: "Restrooms",
    items: [
      "Athletes: please use the locker room restrooms in the warm-up area.",
      "Spectators: please use the main lobby restrooms.",
      "There are plenty of restrooms for everyone. Please leave each one the way you found it, and let a volunteer know right away if something needs attention.",
    ],
  },
  {
    id: "respect-the-building",
    title: "Respect the building",
    items: [
      "Hope Community Church is our host, and this is their home. Our competition space is also where the church holds its Sunday services.",
      "It is our responsibility to leave this building cleaner than we found it. That goes for athletes, parents, coaches and fans alike: the gym, the restrooms, the locker rooms, the hallways and the parking lot.",
      "Throw away your trash, respect the space and treat our hosts, officials and volunteers with courtesy. How we care for this building is a reflection of NC United and North Carolina wrestling.",
    ],
  },
  {
    id: "food",
    title: "Food and the gym",
    items: [
      "No food is allowed in the gym. There are open spaces and plenty of areas to eat outside the gym. Please help us keep it clean and ready for Sunday services.",
      "Water is available on the floor for athletes.",
      "Concessions: bagels (peanut butter, honey, cream cheese), bars, trail mix, yogurt and granola, protein bars, fruit buckets, water, Gatorade and coffee. No soda or candy.",
      "Food trucks: Merritt's sandwiches Friday from 4:00 to 8:00 PM, plus Mediterranean and savory bowl trucks Saturday from 11:00 AM to 6:00 PM.",
    ],
  },
  {
    id: "wristbands",
    title: "Wristbands and floor access",
    items: [
      "There are three ticket types, each with its own wristband color: spectator, corner coach and college coach.",
      "Spectators do not have floor access. The floor is for college coaches, corner coaches, officials, table workers and volunteers only.",
      "The VIP lounge is for college coaches, officials and table workers only.",
    ],
  },
  {
    id: "media-volunteers",
    title: "Media and volunteers",
    items: [
      "We have three approved photographers, and each has been notified and credentialed.",
      "More than 30 volunteers will be there to help, wearing red shirts with \"Volunteer\" on the back.",
    ],
  },
  {
    id: "giving-hour",
    title: "The Giving Hour: Saturday at 2:30 PM",
    items: [
      "Every spectator receives 5 free raffle tickets. Visit the vendor tables and drop your tickets in the boxes for the prizes you want most.",
      "Winners are announced live during the Giving Hour, and we'll also present the Caden Perry Warrior Scholarship.",
    ],
  },
  {
    id: "watch",
    title: "Can't be there?",
    items: ["Every match streams live on FloWrestling, and brackets and results are in the NC United app."],
    link: { href: "#streaming", label: "Watch live" },
  },
]
