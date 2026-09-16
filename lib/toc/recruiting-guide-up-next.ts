/**
 * Where a wrestler competes next, for the printed recruiting guide.
 *
 * Hand-collected from families in the TOC group chat, so it lives here as a curated map keyed by
 * athlete id rather than being derived from anything — the same shape as
 * `lib/curated-significant-wins.ts`, and for the same reason: there is no table behind it.
 *
 * Keyed by id, never by name. The chat gave us "Joe Shook", "Danny McDermott" and "Alex
 * Thompson" for wrestlers the roster calls Joseph, Daniel and Charles, and a name-keyed map
 * would have quietly attached one boy's schedule to another. Every id below was resolved against
 * the confirmed field first.
 *
 * Event names are normalised on the way in — the chat has "S32", "Super32", "I64", "I-64" and
 * "journeyman" for four events — so the guide prints one spelling.
 */

export const UP_NEXT_EVENTS = {
  superThirtyTwo: "Super 32",
  iSixtyFour: "I-64 Duals",
  journeymen: "Journeymen",
  beast: "Beast of the East",
  columbusDay: "Columbus Day Duals",
  cosmicClash: "Cosmic Clash Duals",
  southeastOpen: "Southeast Open",
  pembrokeOpen: "Pembroke Open",
  cougarOpen: "Cougar Open",
  southernSlam: "Southern Slam",
  powerade: "Powerade",
  appStateOpen: "App State Open",
  ironman: "Ironman",
  grapplerFallClassic: "Grappler Fall Classic",
} as const

const E = UP_NEXT_EVENTS

const BY_ATHLETE_ID: Readonly<Record<string, readonly string[]>> = {
  // Campbell Tufts · 165 · seed 2
  "f6510005-cba5-47fd-9d7f-12ec2c7c6cb4": [E.journeymen, E.superThirtyTwo],
  // Aiden Campbell · 149 · seed 4
  "ff5337d6-4c77-4988-b767-ad4fe1a4ee75": [E.superThirtyTwo, E.iSixtyFour, E.journeymen],
  // Tobin McNair · 174 · seed 1
  "63ea613d-0886-4af0-b64b-1c3d80fe0332": [E.journeymen, E.superThirtyTwo, E.iSixtyFour, E.beast],
  // Brieon Mayfield · 197 · seed 2
  "3ed5884e-12cc-4b43-a976-93790161569e": [E.iSixtyFour, E.superThirtyTwo],
  // Amanuel (Manny) Kahsai · 197 · seed 6
  "1ae6b10a-eeb9-4751-8453-ff0ab511c428": [E.iSixtyFour, E.superThirtyTwo],
  // Travis Nobles · 157 · seed 4
  "1d29adb9-ba7e-49c7-9194-f680bc7a4d09": [E.columbusDay, E.journeymen, E.cosmicClash, E.superThirtyTwo],
  // Caleb Edwards · 133 · seed 5
  "8713c36d-940d-4be0-bc02-a0bccf927ec3": [E.iSixtyFour, E.superThirtyTwo],
  // Gavin Lopez · 285 · seed 1
  "da7e32d2-bbdc-4b0e-ac70-ecb6ac67ed10": [E.journeymen, E.iSixtyFour, E.superThirtyTwo],
  // Joseph ("Joe") Shook · 149 · seed 5
  "92d9d56f-3268-45c8-896c-5c3801b29041": [E.iSixtyFour, E.superThirtyTwo],
  // Daniel ("Danny") McDermott · 125 · seed 5
  "41dabe17-6cb5-40d1-84e6-ea07e1df5cb4": [E.iSixtyFour, E.superThirtyTwo],
  // Jacob Campos · 165 · seed 3
  "5e0207fa-2930-4583-b221-d8f15e9ed973": [E.iSixtyFour, E.superThirtyTwo],
  // Matthew Akins · 117 · seed 5
  "9a5d50a8-89a9-4579-83c2-2152cea84efc": [E.iSixtyFour, E.superThirtyTwo],
  // Stephen Cross · 133 · seed 7
  /*
   * Stephen Cross · 133 · seed 7 · Trinity.
   *
   * Entered from Michael Cross as "Journeyman overflow and super 32", then sent by Stephen
   * himself as plain "Journeymen, Super 32". Matt's call: print Journeymen, do not name the
   * overflow bracket.
   */
  "f5dfa7b9-49b3-4296-94a2-b6f587d03b5c": [E.journeymen, E.superThirtyTwo],
  // Jeshurun Mills · 174 · seed 6
  "838f0bd1-fd71-44f1-a98a-c21deea0412e": [E.superThirtyTwo],

  // Charles Thompson · 141 · seed 6. Sent in as "Alex Thompson" by Chuck Thompson and confirmed
  // by Matt as the same wrestler: Charles goes by Alex.
  "088074e4-0171-4f3b-8fe3-8d6f3edd0991": [E.superThirtyTwo, E.iSixtyFour],
  /*
   * Jacob Perry · 157 · seed 2 · New Bern.
   *
   * Not Jaycob Perez (141) and not John Perez (285). Three names this close in one field is the
   * reason this map is keyed by id.
   */
  "ddea34af-ae6a-4880-8a1c-687576bef1fe": [
    // A parenthetical is allowed after a normalised name: he is in the Journeymen main event.
    `${E.journeymen} (main event, 160)`,
    E.iSixtyFour,
    E.superThirtyTwo,
    E.southeastOpen,
  ],
  // Lukas Allman · 149 · seed 7 · Mount Pleasant.
  "31ee331c-024f-4e61-8f62-3477acb937f3": [E.iSixtyFour],
  // Simeon Hammett · 165 · seed 6 · Trinity. Sent in by first name only; the one Simeon in the field.
  "73ad572d-45ae-4fc1-8666-4e7c6543a865": [E.superThirtyTwo],
  /*
   * Jaxon Thomas · 117 · seed 2 · Piedmont.
   *
   * Not Cory Thomas (285) and not Charles Thompson (141) — the third near-identical surname in
   * this field, after the Perry/Perez pair.
   */
  "ca4cdc62-99ac-4951-bab6-6577885aad3e": [E.journeymen, E.iSixtyFour, E.superThirtyTwo, E.pembrokeOpen],
  // Liam Myles · 117 · seed 4 · Union Pines. The one Myles in the field.
  "d5a61e49-a014-4123-86f1-816bb5c05fd6": [E.iSixtyFour, E.superThirtyTwo],
  /*
   * Aiden White · 141 · seed 2 · Weddington · committed to Appalachian State.
   *
   * Four Aiden/Aidan names wrestle this tournament — Burkholder at 125, Campbell at 149 and
   * Szewczyk at 133 — and exactly one White, which is what makes this one safe.
   */
  "a95c204d-785c-427a-98cf-1930410b0dc7": [E.superThirtyTwo, E.southeastOpen],
  /*
   * Holt Quincy · 133 · seed 2 · North East Carolina Prep.
   *
   * Eight events, the longest schedule in the field. The line wraps to two, and 133 is already
   * the tightest page in the book — if any weight spills onto a second sheet, it is this one.
   */
  "fb4f10b4-30f7-4bcc-871e-73930909f3c0": [
    E.columbusDay,
    E.journeymen,
    E.iSixtyFour,
    E.superThirtyTwo,
    E.southeastOpen,
    E.cougarOpen,
    E.southernSlam,
    E.powerade,
  ],
  // Cade Gehris · 149 · seed 6 · First Flight.
  "c1849e65-a453-4506-b6d3-96f7423a25c9": [E.superThirtyTwo],
  // Tyton Kostoff · 149 · seed 1 · Hough. Sent in by first name; the one Kostoff in the field.
  "b57cc0b2-ae3d-4f58-be43-d1493b37732a": [E.superThirtyTwo, E.southeastOpen],
  /*
   * Ayden Sumners · 133 · seed 1 · Wheatmore.
   *
   * On the same page as Holt Quincy's eight-event line, which makes 133 the weight most likely
   * to run past the bottom of the sheet.
   */
  "f4236c5d-90cf-4249-afb8-755e3604702c": [E.superThirtyTwo, E.southeastOpen, E.cougarOpen, E.appStateOpen],
  // Alexander Moody · 117 · seed 6 · Lumberton.
  "9ec33b90-2c53-4f24-9513-6ca2ff937b43": [E.superThirtyTwo],
  /*
   * Aaron Ellison · 149 · seed 2 · Lumberton.
   *
   * Sent as a bare "Super 32" by Natasha Ellison and attached on the sender's surname: he is the
   * only Ellison in the field. That is an inference, not a confirmation — it was flagged to Matt
   * when it went in, and should be corrected here if it was meant for somebody else.
   */
  "a31bf725-32b8-4550-aff5-c74c59d97311": [E.superThirtyTwo],
  // Tripp Sullivan · 174 · seed 5 · Union Pines. Sent in as "South East Open", which is the
  // Southeast Open — the fifth spelling this list has normalised away.
  "85eb411c-ea51-4381-827d-13e5efa0e299": [E.superThirtyTwo, E.southeastOpen],
  // Coy Deel · 141 · seed 7 · West Craven. The only Deel in the field.
  "ef9c0bc5-0898-408a-86d0-740bef7e4888": [E.journeymen, E.iSixtyFour, E.superThirtyTwo, E.cougarOpen],
  // Carson Raper · 117 · seed 1 · South Rowan. Sent his own schedule to the chat.
  "68696afb-0b22-465c-b22e-82e84913144e": [E.journeymen, E.superThirtyTwo, E.ironman],
  /*
   * Ben Mccaleb · 197 · seed 7 · Topsail.
   *
   * This is the schedule that arrived in the chat as a bare "Super 32 and I64 Duals" with the
   * name on the line below it. It sat unattached until the full chat was re-shared rather than
   * being guessed at.
   */
  "ab15038e-c51f-4d0f-947e-bcdfdc75e85b": [E.superThirtyTwo, E.iSixtyFour],
  /*
   * Carson Owens · 197 · seed 4 · Leesville Road.
   *
   * Sent with events and no athlete name, like Carson Raper's. Three Carsons wrestle this
   * tournament — Raper at 117, Worrick at 165 — and exactly one Owens, which is what settles it.
   */
  "05fe2bf5-f027-400f-8654-f1293b4e9691": [E.superThirtyTwo, E.iSixtyFour],
  // Joshua Lemke · 285 · seed 4 · Rosewood. Sent in as "Josh", the one Lemke in the field.
  "05b7c94b-3aba-48a9-9c5a-a99a14e9cd61": [E.superThirtyTwo],
  // Nash Mullis · 285 · seed 2 · North Stanly. The one Mullis in the field.
  "7a95dcfc-b3e2-4abb-921c-c8e98f0901b3": [E.superThirtyTwo, E.iSixtyFour],
  // Adam Walker · 125 · seed 3 · Holly Springs. Class of 2029, so his entry prints no contact
  // details — a schedule is not personal data and belongs there either way.
  "c55d5eec-e7af-4ee5-a44f-3d7829462f3d": [E.grapplerFallClassic, E.iSixtyFour, E.superThirtyTwo],
  // Luke Padgett · 197 · seed 1 · Croatan. Two Lukes wrestle here — Richards at 125 — but one Padgett.
  "c30deea8-6e11-4bbd-b95c-6a5bc4d72692": [E.superThirtyTwo, E.journeymen],
  // Landon Logan · 141 · seed 5 · A.L. Brown. The one Logan in the field.
  "e5077d85-f82e-4e21-9558-f52c2d252230": [E.iSixtyFour, E.superThirtyTwo],
  // Micah Howard · 157 · seed 3 · Tuscola.
  "dbb30d81-60a5-439c-b698-96433f4f030e": [E.superThirtyTwo],
  // Luke Richards · 125 · seed 4 · Cardinal Gibbons. Two Lukes here — Padgett at 197.
  "1a2d638e-5978-45d4-b6c8-bc95ba754367": [E.iSixtyFour, E.journeymen, E.southeastOpen],
  // Jordan Barbee · 197 · seed 8 · Orange. Had no results on file at all, so this is his only line.
  "9815ad12-2e75-4b6e-afd1-7dd65564e90d": [E.superThirtyTwo],
  // Carson Worrick · 165 · seed 1 · Davie. Three Carsons here — Raper 117, Owens 197 — one Worrick.
  "2608f74c-1262-44dd-9097-c990ed3c0166": [E.journeymen, E.superThirtyTwo],
  /*
   * Abdul-Jamil Zaggout · 133 · seed 4 · West Forsyth.
   *
   * Not his brother Ahmet, who wrestles 157 out of the same school. A surname match here would
   * have been a coin flip between two real wrestlers in this field.
   */
  "a91dea56-f982-4527-83e1-6fe9834d16a1": [E.powerade],
}

/** The events a wrestler competes at next, or an empty list when none were sent in. */
export function getUpNextEvents(athleteId: string): readonly string[] {
  return BY_ATHLETE_ID[athleteId] ?? []
}

/** Every id carrying a schedule — used by the tests to guard against a typo'd key. */
export function upNextAthleteIds(): string[] {
  return Object.keys(BY_ATHLETE_ID)
}
