/** NHSCA Duals 2026 — National & Select hub contact lists (static rosters). */
export const NHSCA_NATIONAL_EVENT_SLUG = "nhsca-duals-2026"
export const NHSCA_SELECT_EVENT_SLUG = "nhsca-duals-2026-select"

export type NhscaDualsContactRosterRow = {
  wrestler: string
  weightClass: string
  phone: string
  parentContact: string
}

export const NHSCA_DUALS_2026_NATIONAL_ROSTER: NhscaDualsContactRosterRow[] = [
  { wrestler: "Xan Moody", weightClass: "106", phone: "910-617-7799", parentContact: "Jackie Moody 910-734-9968" },
  { wrestler: "Jaxon Thomas", weightClass: "113", phone: "704-690-8257", parentContact: "Emily 704-219-2635" },
  { wrestler: "Jekai Sedgwick", weightClass: "120", phone: "915-731-5903", parentContact: "" },
  { wrestler: "Ayden Sumners", weightClass: "126", phone: "336-579-7639", parentContact: "" },
  { wrestler: "Mac Johnson", weightClass: "132", phone: "910-965-9236", parentContact: "Erin 910-689-5777" },
  { wrestler: "Tye Johnson", weightClass: "138", phone: "910-965-9235", parentContact: "Erin 910-689-5777" },
  { wrestler: "Sammy Gantt", weightClass: "145", phone: "910-882-3250", parentContact: "" },
  { wrestler: "Aidan Gore", weightClass: "152", phone: "919-448-7598", parentContact: "Jason 919-749-3606" },
  { wrestler: "Tobin McNair", weightClass: "160", phone: "201-213-3341", parentContact: "Keith 908-300-0340" },
  { wrestler: "Dom Blue", weightClass: "170", phone: "910-217-9041", parentContact: "Phillip 843-862-2874" },
  { wrestler: "Brieon Mayfield", weightClass: "182", phone: "757-533-2213", parentContact: "Trevor 757-633-0657" },
  { wrestler: "Fares Alkurdasi", weightClass: "195", phone: "919-519-2856", parentContact: "" },
  { wrestler: "Luke Padgett", weightClass: "195", phone: "", parentContact: "" },
  { wrestler: "Gavin Lopez", weightClass: "220", phone: "908-566-8816", parentContact: "" },
  { wrestler: "Keyshon Morrison", weightClass: "HWT", phone: "854-854-3078", parentContact: "" },
]

export const NHSCA_DUALS_2026_SELECT_ROSTER: NhscaDualsContactRosterRow[] = [
  { wrestler: "Mason Hocker", weightClass: "HWT", phone: "910-622-9642", parentContact: "" },
  { wrestler: "Cory Thomas", weightClass: "220", phone: "252-626-7637", parentContact: "Shamika Ushry 508-944-4066" },
  { wrestler: "Tillman Caskey", weightClass: "190", phone: "", parentContact: "Brian Caskey 252-670-9864" },
  { wrestler: "Manny Kahsai", weightClass: "183", phone: "252-269-8017", parentContact: "" },
  { wrestler: "John Bane", weightClass: "170", phone: "252-503-9192", parentContact: "Raymond 252-269-2264" },
  { wrestler: "Jon Burns", weightClass: "160", phone: "", parentContact: "" },
  { wrestler: "Vincent Valentino", weightClass: "160", phone: "", parentContact: "" },
  { wrestler: "Jacob Perry", weightClass: "152", phone: "856-638-8831", parentContact: "Justin 856-638-8831" },
  { wrestler: "Jack Kancler", weightClass: "144", phone: "910-548-8388", parentContact: "910-548-8388" },
  { wrestler: "Cole Shuster", weightClass: "138", phone: "646-992-1092", parentContact: "Cheryl 646-316-8062" },
  { wrestler: "Shane Shuster", weightClass: "132", phone: "646-992-1090", parentContact: "Cheryl 646-316-8062" },
  { wrestler: "Holt Quincy", weightClass: "126", phone: "252-886-0930", parentContact: "Hunter 252-266-6457" },
  { wrestler: "Danny McDermott", weightClass: "120", phone: "862-505-3009", parentContact: "Jackie 973-229-7608" },
  { wrestler: "Xavier Bernthal", weightClass: "113", phone: "252-259-3102", parentContact: "Jim 252-259-3416" },
  { wrestler: "Kristopher Kerr Jr.", weightClass: "106", phone: "609-667-3349", parentContact: "Heather 609-605-4801" },
]

export function isNationalTeamEventSlug(eventSlug: string): boolean {
  return eventSlug === NHSCA_NATIONAL_EVENT_SLUG
}

export function isSelectTeamEventSlug(eventSlug: string): boolean {
  return eventSlug === NHSCA_SELECT_EVENT_SLUG
}

export function isDualsHubContactRosterSlug(eventSlug: string): boolean {
  return isNationalTeamEventSlug(eventSlug) || isSelectTeamEventSlug(eventSlug)
}

export function getDualsHubContactRoster(eventSlug: string): NhscaDualsContactRosterRow[] | null {
  if (isNationalTeamEventSlug(eventSlug)) return NHSCA_DUALS_2026_NATIONAL_ROSTER
  if (isSelectTeamEventSlug(eventSlug)) return NHSCA_DUALS_2026_SELECT_ROSTER
  return null
}

/** Pull first phone-like segment for tel: link (digits only). */
export function phoneDigitsForTel(raw: string): string | null {
  const m = raw.replace(/\s/g, "").match(/\d{10,}/)
  if (!m) return null
  const d = m[0]
  if (d.length === 10) return `+1${d}`
  if (d.length === 11 && d.startsWith("1")) return `+${d}`
  return `+${d}`
}
