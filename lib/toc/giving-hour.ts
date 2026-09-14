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
  "Every paid spectator received a free raffle ticket today. Hold on to it — we are about to thank the sponsors who made this weekend possible, and draw a winner for every prize they are giving away."

export const GIVING_HOUR_SPONSORS: GivingHourSponsor[] = [
  {
    id: "adidas",
    name: "adidas Wrestling",
    logo: "/images/giving-hour/adidas-wrestling-logo.png",
    prizes: [
      {
        item: "adidas headgear, backpack and socks — Black and blue",
        detail: "Black headgear · black backpack · white and navy cross socks",
        image: "/images/giving-hour/adidas-black-blue.png",
      },
      {
        item: "adidas headgear, backpack and socks — Black and red",
        detail: "Black headgear · black backpack · white and red “Just Pray” socks",
        image: "/images/giving-hour/adidas-black-red.png",
      },
      {
        item: "adidas headgear, backpack and socks — White and brown",
        detail: "White headgear · black backpack · tan “Amen Grind” socks",
        image: "/images/giving-hour/adidas-white-brown.png",
      },
    ],
  },
  {
    id: "pathos",
    name: "Pathos",
    prizes: [],
    note: "Pathos is giving a pair of socks to every Giving Hour winner.",
  },
  {
    id: "wegmans",
    name: "Wegmans",
    prizes: [{ item: "Gift card", detail: "Toward food and drink" }],
  },
  {
    id: "costco",
    name: "Costco Wholesale",
    prizes: [{ item: "Gift card", detail: "Toward food and drink" }],
  },
  {
    id: "food-lion",
    name: "Food Lion",
    prizes: [{ item: "Gift card", detail: "Toward food and drink" }],
  },
  {
    id: "cove",
    name: "Cove",
    prizes: [{ item: "Twelve cases of probiotic soda" }],
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
]

/** Thanked from the microphone, but not drawn for. */
export const GIVING_HOUR_THANKS: { name: string; for: string }[] = [
  { name: "Farina", for: "VIP lounge food" },
  { name: "New York Bagel & Deli", for: "VIP lounge food" },
  { name: "Chad Richards State Farm", for: "VIP lounge food" },
  { name: "Defense Soap", for: "Mat and athlete supplies" },
  { name: "Submission Solutions", for: "Event support" },
  { name: "The Hickey family", for: "The two Resilite competition mats — a $24,000 gift, and the mats this tournament is wrestled on" },
]

export const GIVING_HOUR_CLOSING =
  "The Caden Perry Warrior Scholarship — a $1,300 wrestling-support award for one North Carolina wrestler whose response to genuine adversity reflects Caden's warrior spirit. The future is bright for those who refuse to quit."

export function givingHourDrawCount(sponsors: readonly GivingHourSponsor[] = GIVING_HOUR_SPONSORS): number {
  return sponsors.reduce((sum, sponsor) => sum + sponsor.prizes.length, 0)
}
