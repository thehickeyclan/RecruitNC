/**
 * The Giving Hour, as the MC reads it: sponsors in draw order, what each is giving away, and a
 * line or two about them to say out loud.
 *
 * One list for the public Giving Hour page. A sponsor appears only once their gift is confirmed —
 * a card reading "to confirm" in front of a full building helps nobody. Add the next sponsor here
 * as their details arrive; `about` is optional until they send it.
 */

export type GivingHourPrize = {
  /** What the winner takes home, as the MC would say it. */
  item: string
  /** Size, flavour, value — the detail read after the item. */
  detail?: string
  /** A small photo of the prize, under /public. Shown as a thumbnail so the MC can hold it up by eye. */
  image?: string
}

export type GivingHourSponsor = {
  id: string
  name: string
  /** The sponsor's logo, under /public, shown at the head of their card. */
  logo?: string
  /** One or two sentences, written to be read aloud. */
  about?: string
  /** Each entry is its own draw. A sponsor giving four pairs of shoes is four winners. */
  prizes: GivingHourPrize[]
  /** Said once, instead of a draw — e.g. socks that go to every winner. */
  note?: string
}

export const GIVING_HOUR_TIME = "Saturday, September 19 · 2:30–3:30 PM"
export const GIVING_HOUR_MC = "Jason Gore"

export const GIVING_HOUR_OPENING =
  "Every paid spectator received five raffle tickets today, to drop in the box of any vendor whose prize they want. We are about to thank the sponsors who made this weekend possible, and draw a winner for every prize they are giving away."

export const GIVING_HOUR_SPONSORS: GivingHourSponsor[] = [
  {
    id: "adidas",
    name: "adidas Wrestling",
    about: "adidas Wrestling makes the shoes, headgear and gear worn on wrestling mats around the world.",
    logo: "/images/giving-hour/adidas-wrestling-logo.png",
    prizes: [
      {
        item: "adidas headgear and backpack (Black and blue)",
        detail: "Black headgear · black backpack · white and navy cross socks",
        image: "/images/giving-hour/adidas-black-blue.png",
      },
      {
        item: "adidas headgear and backpack (Black and red)",
        detail: "Black headgear · black backpack · white and red “Just Pray” socks",
        image: "/images/giving-hour/adidas-black-red.png",
      },
      {
        item: "adidas headgear and backpack (White and brown)",
        detail: "White headgear · black backpack · tan “Amen Grind” socks",
        image: "/images/giving-hour/adidas-white-brown.png",
      },
    ],
  },
  {
    id: "the-guild",
    name: "The Guild",
    about: "The Guild connects youth and high school wrestlers with elite coaches in their own communities — private sessions and small groups led by current and former college wrestlers from programs like UNC and NC State.",
    logo: "/images/sponsors/the-guild-logo.png",
    prizes: [1, 2, 3, 4].map((n) => ({
      item: `$250 toward Guild privates and small groups (${n} of 4)`,
      detail: "Training with current and former college athletes throughout the state",
    })),
  },
  {
    id: "cronin-customs",
    name: "Cronin Customs",
    logo: "/images/giving-hour/cronin-customs-logo.png",
    about: "At Cronin Customs, we specialize in creating one-of-a-kind handcrafted wrestling shoes.",
    prizes: [
      {
        item: "VTG1 “Creamsicle” wrestling shoes",
        detail: "Size 13",
        image: "/images/giving-hour/cronin-vtg1-creamsicle.webp",
      },
      { item: "VTG1 “Glacier” wrestling shoes", detail: "Size 11", image: "/images/giving-hour/cronin-vtg1-glacier.webp" },
      { item: "VTG1 “Illini” wrestling shoes", detail: "Size 9", image: "/images/giving-hour/cronin-vtg1-illini.webp" },
      { item: "VTG1 “Flux” wrestling shoes", detail: "Size 9", image: "/images/giving-hour/cronin-vtg1-flux.webp" },
    ],
  },
  {
    id: "funky-flickr-boyz",
    name: "Funky Flickr Boyz",
    about: "Funky Flickr Boyz makes performance wrestling gear — shoes, headgear, bags and clothing — inspired by movement, culture, and individuality.",
    logo: "/images/giving-hour/funky-flickr-logo.png",
    prizes: [
      {
        item: "“Aero” wrestling shoes",
        detail: "Winner picks size and color, based on availability on the Funky Flickr Boyz website",
        image: "/images/giving-hour/funky-flickr-aero.png",
      },
      {
        item: "“Postlude” wrestling shoes",
        detail: "Winner picks size and color, based on availability on the Funky Flickr Boyz website",
        image: "/images/giving-hour/funky-flickr-postlude.png",
      },
    ],
  },
  {
    id: "wrestling-mindset",
    name: "Wrestling Mindset",
    about: "Wrestling Mindset is a mental performance program for wrestlers, founded by Gene Zannetti and built by All-Ivy League wrestlers, with 1-on-1 coaching and team training.",
    logo: "/images/giving-hour/wrestling-mindset-logo.png",
    prizes: [{ item: "A free month of 1-on-1 mindset sessions" }],
  },
  {
    id: "triangle-wrestling-academy",
    name: "Triangle Wrestling Academy",
    about: "Triangle Wrestling Academy — TWA — is an elite wrestling club located right here in Apex, NC. Their coaches are here today to meet families, answer questions, and talk wrestling.",
    logo: "/images/giving-hour/triangle-wrestling-academy-logo.png",
    prizes: [1, 2, 3, 4, 5].map((n) => ({
      item: `Free monthly unlimited training membership (${n} of 5)`,
      detail: "For new TWA members",
    })),
  },
  {
    id: "v1g1l",
    name: "V1G1L Wrestling",
    prizes: [
      {
        item: "V1G1L package",
        detail: "Two “Guardian” short sleeve shirts, a “Legacy” long sleeve shirt, and a pair of V1G1L Hammers",
        image: "/images/giving-hour/v1g1l.jpeg",
      },
    ],
  },
  {
    id: "coldwell-banker",
    name: "Coldwell Banker",
    about: "Coldwell Banker is a real estate brokerage, helping families buy and sell homes.",
    prizes: [{ item: "Summer gift package" }],
  },
]

/**
 * Given with every raffle prize rather than drawn on its own.
 *
 * Pathos socks go out with each prize, so they sit on every prize row as a small badge instead of
 * a card of their own — the MC says "plus Pathos socks" as each winner is called.
 */
export const GIVING_HOUR_WITH_EVERY_PRIZE = {
  name: "Pathos",
  label: "+ Pathos socks",
  logo: "https://w8v0puzioqkz0xzh.public.blob.vercel-storage.com/logo/DCEzMmwaWr3rh4whHxE4R-Pathos.png",
} as const

/** Thanked from the microphone, but not drawn for. */
export const GIVING_HOUR_THANKS: { name: string; for: string; logo?: string }[] = [
  { name: "Pathos", for: "Pathos socks with every raffle prize — a faith-based sock company built on one idea: Live the Light" },
  { name: "Wegmans", for: "Gift cards toward food and drink for the tournament — the family-owned grocer helping fuel this weekend" },
  { name: "Costco Wholesale", for: "Gift cards toward food and drink for the tournament" },
  { name: "Food Lion", for: "Gift cards toward food and drink for the tournament — the grocer founded right here in Salisbury, North Carolina" },
  { name: "Sam's Club", for: "Food and drink for the tournament" },
  { name: "Cove", for: "Twelve cases of probiotic soda — a better-for-you drink for athletes and fans alike" },
  {
    name: "Jubala Coffee",
    for: "Coffee all weekend long — the Raleigh craft roaster our crew swears is the best coffee on the planet",
    logo: "/images/giving-hour/jubala-logo.png",
  },
  { name: "Farina", for: "VIP lounge food" },
  { name: "New York Bagel & Deli", for: "VIP lounge food" },
  { name: "Chad Richards State Farm", for: "VIP lounge food" },
  { name: "Defense Soap", for: "Mat and athlete supplies" },
  { name: "The Hickey family", for: "The two Resilite competition mats — a $24,000 gift, and the mats this tournament is wrestled on" },
]

/** Read first — the scholarship opens the Giving Hour. */
export const GIVING_HOUR_SCHOLARSHIP =
  "The Caden Perry Warrior Scholarship — a $1,300 wrestling-support award for one North Carolina wrestler whose response to genuine adversity reflects Caden's warrior spirit. The future is bright for those who refuse to quit."

export function givingHourDrawCount(sponsors: readonly GivingHourSponsor[] = GIVING_HOUR_SPONSORS): number {
  return sponsors.reduce((sum, sponsor) => sum + sponsor.prizes.length, 0)
}
