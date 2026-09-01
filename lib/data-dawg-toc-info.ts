import {
  TOC_GOFAN_TICKETS_URL,
  TOC_CADEN_PERRY_WARRIOR_SCHOLARSHIP,
  TOC_CONFIRMED_COLLEGES,
  TOC_CONTACT_EMAIL,
  TOC_COMPETITION_MATS,
  TOC_ELITE_OFFICIALS,
  TOC_EVENT_DATES_RANGE,
  TOC_FINALS_MAT,
  TOC_FOUNDING_PARTNERS,
  TOC_MATS_LINE,
  TOC_SCHEDULE,
  TOC_SPECTATORS,
  TOC_SPONSORSHIP,
  TOC_STREAMING,
  TOC_TICKET_SALE_TIMING,
  TOC_TROPHIES_AND_AWARDS,
  TOC_VENUE,
  TOC_VENUE_FEATURES,
  TOC_VENUE_LOUNGES,
  TOC_VOLUNTEER,
  TOC_VOLUNTEER_AVAILABILITY,
  TOC_VOLUNTEER_ROLES,
  TOC_WEIGH_IN,
  TOC_WEIGHT_CLASSES,
} from "@/lib/toc/constants"
import { tocTicketsOnSale } from "@/lib/toc/ticket-sale"
import { TOC_HERO } from "@/lib/toc/marketing-copy"
import {
  formatTocRegistrationFee,
  TOC_CONFIRM_WITHIN_DAYS,
  TOC_REGISTRATION_FEE_COVERS,
} from "@/lib/toc/registration-policy"
import { getTocEventConfig } from "@/lib/toc/event-config"
import { getPublicAnnouncedWeight, listPublicWeightTiles } from "@/lib/toc/public-announced-field"

const TOC_PAGE_URL = "https://app.ncwrestlingunited.com/tournament-of-champions"

function normalize(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
}

export function isTournamentOfChampionsQuery(message: string): boolean {
  const text = normalize(message)
  if (!text) return false

  return (
    /\b(tournament of champions|toc|champions invitational)\b/i.test(message) ||
    /\b(champion jacket|single mat finals|gofan|invite only|invitation only)\b/i.test(message) ||
    (/\b(champions|champion)\b/.test(text) && /\b(nc united|north carolina wrestling)\b/.test(text))
  )
}

/**
 * Whole-word match against the normalised text.
 *
 * This used to be `text.includes(word)`, which made "weigh" match inside "weight" — so
 * "who is in the 117lb weight class" was read as a weigh-in question and answered with the Friday
 * schedule. Normalisation has already reduced the text to lowercase words separated by single
 * spaces, so padding both sides is enough to anchor a term, and multi-word terms still work.
 */
function hasAny(text: string, words: string[]): boolean {
  const padded = ` ${text} `
  return words.some((word) => padded.includes(` ${word} `))
}

function bulletList(items: readonly string[]): string {
  return items.map((item) => `- ${item}`).join("\n")
}

function section(title: string, body: string): string {
  return `**${title}**\n${body}`
}

const TOC_FIELD_HUB_URL = "https://app.ncwrestlingunited.com/tournament-of-champions/field"

/** Words that mean "tell me who is entered", as opposed to "how does the bracket work". */
const FIELD_INTENT_TERMS = [
  "who is in",
  "who s in",
  "whos in",
  "who is wrestling",
  "who is entered",
  "who is competing",
  "who made",
  "field",
  "roster",
  "lineup",
  "entries",
  "entrants",
  "entered",
  "competing",
  "wrestlers in",
  "athletes in",
  "list of",
]

/**
 * The weight the question is about, or null. Only real TOC weights count.
 *
 * The trailing boundary is a negative lookahead rather than `\b` because people write "117lb" with
 * no space, and `\b` will not match between a digit and a letter.
 */
function weightFromQuestion(text: string): number | null {
  for (const m of text.matchAll(/\b(\d{2,3})(?!\d)/g)) {
    const n = Number(m[1])
    if (TOC_WEIGHT_CLASSES.includes(n)) return n
  }
  return null
}

function announcedWeightsLine(tiles: { weightClass: number; announced: boolean }[]): string {
  const out = tiles.filter((t) => t.announced).map((t) => t.weightClass)
  if (!out.length) return "No weight classes have been released publicly yet."
  return `Released so far: ${out.join(", ")} lbs.`
}

/**
 * "Who is in the 117 lb class?" and friends.
 *
 * Every weight is answerable: a released one returns its athletes, an unreleased one says so
 * plainly. Returns null when the question is not about the field, so the normal keyword sections
 * take over.
 *
 * The released/unreleased split comes from {@link getPublicAnnouncedWeight}, the same call the
 * public field page uses — an unreleased weight must never leak its entrants here after the page
 * itself 404s them.
 */
async function answerFieldQuestion(text: string): Promise<string | null> {
  const weight = weightFromQuestion(text)
  /**
   * "Which weights have been announced?" is a field question, but only when it is about weights —
   * "when do tickets get announced" must still fall through to the ticketing copy.
   */
  const wantsRelease =
    hasAny(text, ["announced", "released", "revealed", "public", "out yet", "dropped"]) &&
    hasAny(text, ["weight", "weights", "class", "classes", "field", "fields", "bracket", "brackets"])
  const wantsField = hasAny(text, FIELD_INTENT_TERMS) || wantsRelease
  if (!wantsField && weight == null) return null
  if (!wantsField && weight != null && !hasAny(text, ["weight", "weights", "class", "lb", "lbs", "pound", "pounds"])) {
    return null
  }

  const tiles = await listPublicWeightTiles()

  if (weight == null) {
    if (!wantsField) return null
    return section(
      "The field",
      [
        "The NC Mat releases each weight class as its field is finalised.",
        announcedWeightsLine(tiles),
        `Browse them all: [The Field](${TOC_FIELD_HUB_URL})`,
      ].join("\n\n"),
    )
  }

  const field = await getPublicAnnouncedWeight(weight)
  if (!field) {
    return section(
      `${weight} lbs has not been released yet`,
      [
        `The ${weight} lb field is still being finalised, and The NC Mat announces each weight only once it is set. Nothing about it is public yet.`,
        announcedWeightsLine(tiles),
        `Watch for it here: [The Field](${TOC_FIELD_HUB_URL}) — or turn on alerts in the NC United app and you will get the announcement as it lands.`,
      ].join("\n\n"),
    )
  }

  const lines = field.athletes.map((a) => {
    const bits = [a.club || "Unaffiliated"]
    if (a.graduationYear) bits.push(`class of ${a.graduationYear}`)
    const top = a.credentials[0]
    if (top) bits.push(top.label)
    if (a.collegeCommit) bits.push(`committed to ${a.collegeCommit}`)
    return `${a.name} — ${bits.join(" · ")}`
  })

  const r = field.rollup
  const rollupBits: string[] = [`${field.athletes.length} athletes`]
  if (r.allAmericans) rollupBits.push(`${r.allAmericans} All-American${r.allAmericans === 1 ? "" : "s"}`)
  if (r.stateChampions) rollupBits.push(`${r.stateChampions} state title${r.stateChampions === 1 ? "" : "s"}`)

  return section(
    `${weight} lbs — the field`,
    [
      `${rollupBits.join(" · ")}. Listed alphabetically; the field is not seeded, and brackets are not public.`,
      bulletList(lines),
      `Full profiles: [${weight} lbs](${TOC_FIELD_HUB_URL}/${weight})`,
    ].join("\n\n"),
  )
}

export async function answerTournamentOfChampionsQuestion(message: string): Promise<string> {
  const text = normalize(message)

  /** A "who is in X" question wants the field, not the tournament brochure. */
  const fieldAnswer = await answerFieldQuestion(text)
  if (fieldAnswer) return fieldAnswer

  const config = await getTocEventConfig()
  const colleges = config.confirmed_colleges?.length ? config.confirmed_colleges : [...TOC_CONFIRMED_COLLEGES]

  const sections: string[] = []

  const wantsTickets = hasAny(text, ["ticket", "gofan", "admission", "buy", "attend"])
  const wantsSchedule = hasAny(text, ["when", "date", "time", "schedule", "weigh", "weighin", "weigh in", "doors"])
  const wantsVenue = hasAny(text, ["where", "venue", "location", "address", "parking", "map", "apex", "hope"])
  const wantsWeights = hasAny(text, ["weight", "weights", "class", "classes", "bracket", "brackets", "format", "wrestlers"])
  const wantsAwards = hasAny(text, ["award", "awards", "trophy", "trophies", "medal", "medals", "jacket", "bracket"])
  const wantsOfficials = hasAny(text, ["official", "officials", "ref", "refs", "referee", "referees", "nwoa", "sutton"])
  const wantsMats = hasAny(text, ["mat", "mats", "resilite", "surface"])
  const wantsStreaming = hasAny(text, ["stream", "streaming", "watch", "live"])
  const wantsCoaches = hasAny(text, ["college coach", "college coaches", "coach", "coaches", "recruiting", "lounge"])
  const wantsVolunteer = hasAny(text, ["volunteer", "help", "worker", "workers"])
  const wantsSponsor = hasAny(text, ["sponsor", "sponsorship", "partner", "partners"])
  const wantsRegistration = hasAny(text, ["register", "registration", "fee", "cost", "pay", "payment", "confirm"])
  const wantsScholarship = hasAny(text, ["scholarship", "caden", "perry", "warrior", "award", "nomination", "nominations"])
  const general =
    !wantsTickets &&
    !wantsSchedule &&
    !wantsVenue &&
    !wantsWeights &&
    !wantsAwards &&
    !wantsOfficials &&
    !wantsMats &&
    !wantsStreaming &&
    !wantsCoaches &&
    !wantsVolunteer &&
    !wantsSponsor &&
    !wantsRegistration &&
    !wantsScholarship

  if (general) {
    sections.push(
      section(
        "Tournament of Champions",
        `${TOC_HERO.tagline}\n\n${TOC_HERO.lead}\n\n- Dates: ${TOC_EVENT_DATES_RANGE}\n- Venue: ${config.venue_name ?? TOC_VENUE.name}, ${config.venue_address ?? TOC_VENUE.address}\n- Format: invite-only; most weights have eight wrestlers, with select deep weights expanding to 10 or 12; true double-elimination and top-three placement\n- Weights: ${TOC_WEIGHT_CLASSES.join(", ")} lbs\n- Tickets: ${tocTicketsOnSale() ? `on sale now — [GoFan](${TOC_GOFAN_TICKETS_URL})` : `on sale ${TOC_TICKET_SALE_TIMING} (sold via GoFan)`}\n- Full page: [Tournament of Champions](${TOC_PAGE_URL})`,
      ),
    )
  }

  if (wantsSchedule || general) {
    sections.push(
      section(
        "Schedule",
        [
          `${TOC_WEIGH_IN.headline}: ${TOC_WEIGH_IN.time}. ${TOC_WEIGH_IN.detail}`,
          `Friday: ${TOC_SCHEDULE.friday.subtitle}. Key times: ${TOC_SCHEDULE.friday.rows.map((r) => `${r.time} — ${r.activity}`).join("; ")}.`,
          `Saturday: ${TOC_SCHEDULE.saturday.subtitle}. Key times: ${TOC_SCHEDULE.saturday.rows.map((r) => `${r.time} — ${r.activity}`).join("; ")}.`,
        ].join("\n\n"),
      ),
    )
  }

  if (wantsVenue || general) {
    sections.push(
      section(
        "Venue",
        [
          `${TOC_VENUE.name} (${TOC_VENUE.campus}) — ${TOC_VENUE.address}.`,
          `[Open in Google Maps](${TOC_VENUE.mapsUrl})`,
          bulletList(TOC_VENUE_FEATURES.map((item) => `${item.title}: ${item.description}`)),
          `Fan experience: ${TOC_SPECTATORS.expectations.join("; ")}.`,
        ].join("\n\n"),
      ),
    )
  }

  if (wantsWeights || general) {
    sections.push(
      section(
        "Format and weights",
        [
          `Invite-only: most weights use eight-person brackets; select deep weights may expand to 10 or 12.`,
          `College weights plus 117 lbs: ${TOC_WEIGHT_CLASSES.join(", ")}.`,
          `Bracket style: true double-elimination with top-three placement.`,
          TOC_MATS_LINE,
          `${TOC_FINALS_MAT.headline}: ${TOC_FINALS_MAT.lead}`,
        ].join("\n"),
      ),
    )
  }

  if (wantsAwards || general) {
    sections.push(
      section(
        "Awards",
        [
          bulletList(TOC_TROPHIES_AND_AWARDS.items),
          "Only the champion at each weight earns the NC United Tournament of Champions jacket. Top three place on the podium; the jacket is earned on the mat, not sold.",
        ].join("\n\n"),
      ),
    )
  }

  if (wantsScholarship || general) {
    const s = TOC_CADEN_PERRY_WARRIOR_SCHOLARSHIP
    sections.push(
      section(
        "Caden Perry Warrior Scholarship",
        [
          `${s.tagline}`,
          s.award,
          s.notAbout,
          s.eligibility,
          s.dates,
          `${s.fundUseIntro}\n${bulletList(s.fundUses)}`,
          `[Scholarship details](${s.href})`,
        ].join("\n\n"),
      ),
    )
  }

  if (wantsTickets || general) {
    sections.push(
      section(
        "Tickets",
        [
          `${TOC_SPECTATORS.ticketProviderLabel}.`,
          tocTicketsOnSale()
            ? `Tickets are on sale now: [Buy on GoFan](${TOC_GOFAN_TICKETS_URL})`
            : `Tickets are not on sale yet — public sale opens ${TOC_TICKET_SALE_TIMING}, sold via GoFan. Seating is limited and families of competing athletes get first access before the public sale. Do not share a purchase link until sales open.`,
          `Saturday admission covers the full tournament including single-mat championship finals.`,
        ].join("\n"),
      ),
    )
  }

  if (wantsOfficials || general) {
    sections.push(
      section(
        "Officials",
        [
          `${TOC_ELITE_OFFICIALS.headline}. ${TOC_ELITE_OFFICIALS.lead}`,
          bulletList([
            ...TOC_ELITE_OFFICIALS.confirmedCrew.map((official) => `${official.name} — ${official.credential}`),
            ...TOC_ELITE_OFFICIALS.bullets,
          ]),
        ].join("\n\n"),
      ),
    )
  }

  if (wantsMats || general) {
    sections.push(
      section(
        "Competition mats",
        [
          TOC_MATS_LINE,
          bulletList(TOC_COMPETITION_MATS.items),
        ].join("\n\n"),
      ),
    )
  }

  if (wantsCoaches || general) {
    sections.push(
      section(
        "College coaches and lounge",
        [
          `${TOC_VENUE_LOUNGES.headline}: ${TOC_VENUE_LOUNGES.lead}`,
          TOC_VENUE_LOUNGES.description,
          `Confirmed college programs listed on the page include: ${colleges.join(", ")}.`,
        ].join("\n\n"),
      ),
    )
  }

  if (wantsStreaming || general) {
    sections.push(
      section(
        "Streaming",
        config.watch_live_url
          ? `The event is streaming live: [Watch live](${config.watch_live_url})`
          : `${TOC_STREAMING.teaser} ${TOC_STREAMING.notifyHint}`,
      ),
    )
  }

  if (wantsRegistration || general) {
    sections.push(
      section(
        "Athlete registration",
        `Invited athletes pay a ${formatTocRegistrationFee()} registration fee during confirmation checkout. It supports ${TOC_REGISTRATION_FEE_COVERS}. Athletes should confirm within ${TOC_CONFIRM_WITHIN_DAYS} days of the invite; the spot is locked only after secure card payment is completed.`,
      ),
    )
  }

  if (wantsVolunteer || general) {
    sections.push(
      section(
        "Volunteers",
        [
          TOC_VOLUNTEER.lead,
          `Roles: ${TOC_VOLUNTEER_ROLES.map((role) => role.label).join(", ")}.`,
          `Availability options: ${TOC_VOLUNTEER_AVAILABILITY.map((slot) => slot.label).join(", ")}.`,
        ].join("\n\n"),
      ),
    )
  }

  if (wantsSponsor || general) {
    sections.push(
      section(
        "Sponsorship",
        [
          TOC_SPONSORSHIP.lead,
          `Founding partners shown on the page: ${TOC_FOUNDING_PARTNERS.partners.map((p) => p.name).join(", ")}.`,
          `For sponsorship: ${TOC_CONTACT_EMAIL}`,
        ].join("\n\n"),
      ),
    )
  }

  sections.push(`Source: [Tournament of Champions page](${TOC_PAGE_URL})`)
  sections.push(`Questions or corrections: ${TOC_CONTACT_EMAIL}`)

  return sections.join("\n\n")
}
