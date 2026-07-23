import {
  TOC_GOFAN_TICKETS_URL,
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
  registrationPaymentDueDisplay,
  TOC_CONFIRM_WITHIN_DAYS,
  TOC_REGISTRATION_FEE_COVERS,
} from "@/lib/toc/registration-policy"
import { getTocEventConfig } from "@/lib/toc/event-config"

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

function hasAny(text: string, words: string[]): boolean {
  return words.some((word) => text.includes(word))
}

function bulletList(items: readonly string[]): string {
  return items.map((item) => `- ${item}`).join("\n")
}

function section(title: string, body: string): string {
  return `**${title}**\n${body}`
}

export async function answerTournamentOfChampionsQuestion(message: string): Promise<string> {
  const config = await getTocEventConfig()
  const text = normalize(message)
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
    !wantsRegistration

  if (general) {
    sections.push(
      section(
        "Tournament of Champions",
        `${TOC_HERO.tagline}\n\n${TOC_HERO.lead}\n\n- Dates: ${TOC_EVENT_DATES_RANGE}\n- Venue: ${config.venue_name ?? TOC_VENUE.name}, ${config.venue_address ?? TOC_VENUE.address}\n- Format: invite-only, eight wrestlers per weight, true double-elimination, top-three placement\n- Weights: ${TOC_WEIGHT_CLASSES.join(", ")} lbs\n- Tickets: ${tocTicketsOnSale() ? `on sale now — [GoFan](${TOC_GOFAN_TICKETS_URL})` : `on sale ${TOC_TICKET_SALE_TIMING} (sold via GoFan)`}\n- Full page: [Tournament of Champions](${TOC_PAGE_URL})`,
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
          `Invite-only: eight wrestlers per weight class, 88 total spots.`,
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

  if (wantsTickets || general) {
    sections.push(
      section(
        "Tickets",
        [
          `${TOC_SPECTATORS.ticketProviderLabel}.`,
          tocTicketsOnSale()
            ? `Tickets are on sale now: [Buy on GoFan](${TOC_GOFAN_TICKETS_URL})`
            : `Tickets are not on sale yet — they go on sale ${TOC_TICKET_SALE_TIMING}, sold via GoFan. Do not share a purchase link until then.`,
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
        `Invited athletes pay a ${formatTocRegistrationFee()} registration fee due by ${registrationPaymentDueDisplay()}. It supports ${TOC_REGISTRATION_FEE_COVERS}. Athletes should confirm within ${TOC_CONFIRM_WITHIN_DAYS} days of the invite; payment instructions follow after confirmation.`,
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
