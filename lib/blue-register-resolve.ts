import type { SupabaseClient } from "@supabase/supabase-js"
import { normalizePhoneForStorage } from "@/lib/phone-format"

async function collectLinkedAthleteIdsForParentUser(admin: SupabaseClient, userId: string): Promise<string[]> {
  const { data: profileRow } = await admin.from("user_profiles").select("athlete_id").eq("user_id", userId).maybeSingle()
  const { data: linkRows, error: linkError } = await admin
    .from("parent_athlete_links")
    .select("athlete_id")
    .eq("user_id", userId)
  if (linkError && linkError.code !== "42P01") throw new Error(linkError.message)

  const ids = new Set<string>()
  const aid = (profileRow as { athlete_id?: string | null } | null)?.athlete_id
  if (aid?.trim()) ids.add(aid.trim())
  for (const r of linkRows ?? []) {
    const x = (r as { athlete_id?: string }).athlete_id
    if (x?.trim()) ids.add(x.trim())
  }
  return [...ids]
}

export const BLUE_SIGNUP_ACHIEVEMENTS = [
  "All American",
  "State Champion",
  "State Placer",
  "State Qualifier",
  "None",
] as const

export type BlueResolvedParent = {
  email: string
  firstName: string
  lastName: string
  phone: string
  relationship: string
}

export type BlueResolvedAthlete = {
  athleteId: string | null
  firstName: string
  lastName: string
  graduationYear: number
  highSchool: string
  wrestlingClub: string
  weightClass: string
  cellPhone: string
  email: string
  gpa: string
  highestAchievement: string
  interestWrestlingCollege: boolean
}

export type BlueRegisterAthleteOption = {
  id: string
  name: string
  firstName: string
  lastName: string
  graduationYear: number | null
  highSchool: string
  weightClass: string
  wrestlingClub: string
  cellPhone: string
  email: string
  gpa: string
  highestAchievement: string
  alreadyInBlue: boolean
  missingFields: string[]
}

export type BlueInviteAthletePrefill = {
  firstName: string
  lastName: string
  graduationYear: number | null
  highSchool: string
  weightClass: string
  wrestlingClub: string
  cellPhone: string
  email: string
  gpa: string
  highestAchievement: string
  missingFields: string[]
}

export type BlueRegisterContext = {
  parent: BlueResolvedParent
  parentMissingFields: string[]
  athletes: BlueRegisterAthleteOption[]
  /** Wrestler info from the Blue interest application tied to this invite (when not linked on Profile). */
  invitePrefill: BlueInviteAthletePrefill | null
  canRegisterNewAthlete: boolean
}

type ProfileRow = {
  first_name?: string | null
  last_name?: string | null
  full_name?: string | null
  email?: string | null
  cell_phone?: string | null
}

type AthleteRow = Record<string, unknown>

function trimStr(v: unknown): string {
  return typeof v === "string" ? v.trim() : v != null ? String(v).trim() : ""
}

function splitName(row: AthleteRow): { firstName: string; lastName: string } {
  const firstName = trimStr(row.firstname ?? row.firstName)
  const lastName = trimStr(row.lastname ?? row.lastName)
  if (firstName && lastName) return { firstName, lastName }
  const name = trimStr(row.name)
  if (!name) return { firstName: "", lastName: "" }
  const parts = name.split(/\s+/).filter(Boolean)
  if (parts.length === 1) return { firstName: parts[0], lastName: "" }
  return { firstName: parts[0], lastName: parts.slice(1).join(" ") }
}

function athletePhone(row: AthleteRow): string {
  return trimStr(row.phone ?? row.cell ?? row.cell_number)
}

function athleteEmail(row: AthleteRow): string {
  return trimStr(row.contact_email ?? row.contactEmail ?? row.email)
}

function athleteGpa(row: AthleteRow): string {
  const raw = row.gpa ?? row.academic_gpa
  if (raw == null || raw === "") return ""
  const n = typeof raw === "number" ? raw : parseFloat(String(raw))
  return Number.isFinite(n) ? String(n) : trimStr(raw)
}

function parseHighestAchievement(raw: string | null | undefined): string | null {
  const text = (raw ?? "").trim()
  if (!text) return null
  for (const opt of BLUE_SIGNUP_ACHIEVEMENTS) {
    if (text.includes(opt)) return opt
  }
  return null
}

const INTEREST_ACHIEVEMENT_MAP: Record<string, (typeof BLUE_SIGNUP_ACHIEVEMENTS)[number]> = {
  all_american: "All American",
  state_champion: "State Champion",
  state_placer: "State Placer",
  state_qualifier: "State Qualifier",
  na: "None",
}

export function mapInterestAchievement(raw: string | null | undefined): string {
  const key = (raw ?? "").trim().toLowerCase()
  if (key && INTEREST_ACHIEVEMENT_MAP[key]) return INTEREST_ACHIEVEMENT_MAP[key]
  return parseHighestAchievement(raw) ?? "None"
}

type InterestRow = {
  first_name?: string | null
  last_name?: string | null
  cell_phone?: string | null
  graduation_year?: string | number | null
  highest_achievement?: string | null
  high_school?: string | null
  club?: string | null
  weight_class?: string | null
  parent_email?: string | null
}

export function athletePrefillFromInterestRow(row: InterestRow): Omit<BlueInviteAthletePrefill, "missingFields"> {
  const gradRaw = row.graduation_year
  const gradNum = typeof gradRaw === "number" ? gradRaw : parseInt(String(gradRaw ?? ""), 10)
  return {
    firstName: trimStr(row.first_name),
    lastName: trimStr(row.last_name),
    graduationYear: Number.isFinite(gradNum) ? gradNum : null,
    highSchool: trimStr(row.high_school),
    weightClass: trimStr(row.weight_class),
    wrestlingClub: trimStr(row.club),
    cellPhone: trimStr(row.cell_phone),
    email: "",
    gpa: "",
    highestAchievement: mapInterestAchievement(row.highest_achievement),
  }
}

export async function loadInviteInterestPrefill(
  admin: SupabaseClient,
  inviteToken: string | null | undefined,
): Promise<BlueInviteAthletePrefill | null> {
  const token = trimStr(inviteToken)
  if (!token) return null

  const { data: invite, error: inviteErr } = await admin
    .from("blue_invites")
    .select("interest_id, expires_at, used_at")
    .eq("token", token)
    .maybeSingle()

  if (inviteErr || !invite?.interest_id) return null
  if (invite.used_at) return null
  if (new Date(invite.expires_at as string) < new Date()) return null

  const { data: interest, error: interestErr } = await admin
    .from("blue_express_interest")
    .select(
      "first_name, last_name, cell_phone, graduation_year, highest_achievement, high_school, club, weight_class, parent_email",
    )
    .eq("id", invite.interest_id)
    .maybeSingle()

  if (interestErr || !interest) return null

  const parsed = athletePrefillFromInterestRow(interest as InterestRow)
  if (!parsed.firstName && !parsed.lastName) return null

  return {
    ...parsed,
    missingFields: missingAthleteFields(parsed),
  }
}

function athleteFromRow(row: AthleteRow): Omit<BlueRegisterAthleteOption, "id" | "name" | "alreadyInBlue" | "missingFields"> {
  const { firstName, lastName } = splitName(row)
  const gradRaw = row.graduationyear ?? row.graduation_year
  const gradNum = typeof gradRaw === "number" ? gradRaw : parseInt(String(gradRaw ?? ""), 10)
  return {
    firstName,
    lastName,
    graduationYear: Number.isFinite(gradNum) ? gradNum : null,
    highSchool: trimStr(row.highschool ?? row.high_school),
    weightClass: trimStr(row.weightclass ?? row.weight_class),
    wrestlingClub: trimStr(row.wrestlingclub ?? row.wrestling_club),
    cellPhone: athletePhone(row),
    email: athleteEmail(row),
    gpa: athleteGpa(row),
    highestAchievement: parseHighestAchievement(trimStr(row.additional_achievements)) ?? "",
  }
}

export function missingAthleteFields(
  a: Omit<BlueRegisterAthleteOption, "id" | "name" | "alreadyInBlue" | "missingFields">,
): string[] {
  const missing: string[] = []
  if (!a.firstName) missing.push("firstName")
  if (!a.lastName) missing.push("lastName")
  if (!a.graduationYear) missing.push("graduationYear")
  if (!a.highSchool) missing.push("highSchool")
  if (!a.weightClass) missing.push("weightClass")
  if (!a.wrestlingClub) missing.push("wrestlingClub")
  if (!a.cellPhone) missing.push("cellPhone")
  if (!a.email) missing.push("email")
  if (!a.gpa) missing.push("gpa")
  return missing
}

export function missingParentFields(parent: BlueResolvedParent): string[] {
  const missing: string[] = []
  if (!parent.firstName) missing.push("firstName")
  if (!parent.lastName) missing.push("lastName")
  if (!parent.email) missing.push("email")
  if (!parent.phone) missing.push("phone")
  return missing
}

function parentFromProfile(profile: ProfileRow | null, userEmail: string): BlueResolvedParent {
  let firstName = trimStr(profile?.first_name)
  let lastName = trimStr(profile?.last_name)
  if (!firstName && !lastName) {
    const full = trimStr(profile?.full_name)
    if (full) {
      const parts = full.split(/\s+/).filter(Boolean)
      firstName = parts[0] ?? ""
      lastName = parts.slice(1).join(" ")
    }
  }
  return {
    email: trimStr(profile?.email) || userEmail.trim().toLowerCase(),
    firstName,
    lastName,
    phone: trimStr(profile?.cell_phone),
    relationship: "Guardian",
  }
}

export async function loadBlueRegisterContext(
  admin: SupabaseClient,
  userId: string,
  userEmail: string,
  opts?: { inviteToken?: string | null },
): Promise<BlueRegisterContext> {
  const { data: profile } = await admin.from("user_profiles").select("*").eq("user_id", userId).maybeSingle()
  const parent = parentFromProfile((profile ?? null) as ProfileRow | null, userEmail)

  const invitePrefillRaw = await loadInviteInterestPrefill(admin, opts?.inviteToken)
  let invitePrefill = invitePrefillRaw

  const athleteIds = await collectLinkedAthleteIdsForParentUser(admin, userId)
  let athletes: BlueRegisterAthleteOption[] = []

  if (athleteIds.length > 0) {
    const { data: rows } = await admin.from("athletes").select("*").in("id", athleteIds)
    const blueByAthlete = new Map<string, boolean>()
    const { data: memberships } = await admin
      .from("blue_memberships")
      .select("athlete_id, status")
      .in("athlete_id", athleteIds)
      .in("status", ["active", "paused", "pending_payment"])

    for (const m of memberships ?? []) {
      const aid = trimStr((m as { athlete_id?: string }).athlete_id)
      if (aid) blueByAthlete.set(aid, true)
    }

    athletes = (rows ?? []).map((row) => {
      const parsed = athleteFromRow(row as AthleteRow)
      const id = trimStr((row as { id?: string }).id)
      const name =
        trimStr((row as { name?: string }).name) ||
        [parsed.firstName, parsed.lastName].filter(Boolean).join(" ").trim() ||
        "Athlete"
      const missingFields = missingAthleteFields(parsed)
      return {
        id,
        name,
        ...parsed,
        alreadyInBlue: blueByAthlete.has(id),
        missingFields,
      }
    })
    athletes.sort((a, b) => a.name.localeCompare(b.name))
  }

  if (athletes.length > 0) {
    invitePrefill = null
  }

  return {
    parent,
    parentMissingFields: missingParentFields(parent),
    athletes,
    invitePrefill,
    canRegisterNewAthlete: true,
  }
}

export type BlueSignupRequestBody = {
  token?: string | null
  waiverAccepted?: boolean
  tshirtSize?: string
  promoCode?: string
  athleteId?: string | null
  parent?: Partial<BlueResolvedParent>
  athlete?: Partial<BlueResolvedAthlete> & { graduationYear?: number | string }
}

export async function resolveBlueSignupPayload(
  admin: SupabaseClient,
  userId: string,
  userEmail: string,
  body: BlueSignupRequestBody,
): Promise<{ ok: true; parent: BlueResolvedParent; athlete: BlueResolvedAthlete } | { ok: false; error: string }> {
  const ctx = await loadBlueRegisterContext(admin, userId, userEmail, { inviteToken: body.token })
  const inviteBase = ctx.invitePrefill
  const parent: BlueResolvedParent = {
    email: ctx.parent.email,
    firstName: trimStr(body.parent?.firstName) || ctx.parent.firstName,
    lastName: trimStr(body.parent?.lastName) || ctx.parent.lastName,
    phone: body.parent?.phone?.trim()
      ? normalizePhoneForStorage(body.parent.phone)
      : ctx.parent.phone,
    relationship: trimStr(body.parent?.relationship) || ctx.parent.relationship || "Guardian",
  }

  const parentMissing = missingParentFields(parent)
  if (parentMissing.length > 0) {
    return { ok: false, error: `Please complete your profile: ${parentMissing.join(", ")}.` }
  }

  if (parent.email.toLowerCase() !== userEmail.trim().toLowerCase()) {
    return { ok: false, error: "Parent email must match your signed-in RecruitNC account." }
  }

  let athleteBase: Omit<BlueRegisterAthleteOption, "id" | "name" | "alreadyInBlue" | "missingFields"> | null =
    inviteBase
      ? {
          firstName: inviteBase.firstName,
          lastName: inviteBase.lastName,
          graduationYear: inviteBase.graduationYear,
          highSchool: inviteBase.highSchool,
          weightClass: inviteBase.weightClass,
          wrestlingClub: inviteBase.wrestlingClub,
          cellPhone: inviteBase.cellPhone,
          email: inviteBase.email,
          gpa: inviteBase.gpa,
          highestAchievement: inviteBase.highestAchievement,
        }
      : null
  let athleteId: string | null = trimStr(body.athleteId) || null

  if (athleteId) {
    const linked = ctx.athletes.find((a) => a.id === athleteId)
    if (!linked) {
      return { ok: false, error: "Select a wrestler linked to your account, or add one on Profile first." }
    }
    if (linked.alreadyInBlue) {
      return { ok: false, error: `${linked.name} already has an active Blue membership.` }
    }
    athleteBase = linked
  }

  const gradFromBody = body.athlete?.graduationYear
  const gradParsed =
    gradFromBody != null && gradFromBody !== "" ? Number(gradFromBody) : athleteBase?.graduationYear ?? NaN

  const merged = {
    firstName: trimStr(body.athlete?.firstName) || athleteBase?.firstName || "",
    lastName: trimStr(body.athlete?.lastName) || athleteBase?.lastName || "",
    graduationYear: Number.isFinite(gradParsed) ? gradParsed : null,
    highSchool: trimStr(body.athlete?.highSchool) || athleteBase?.highSchool || "",
    weightClass: trimStr(body.athlete?.weightClass) || athleteBase?.weightClass || "",
    wrestlingClub: trimStr(body.athlete?.wrestlingClub) || athleteBase?.wrestlingClub || "",
    cellPhone: body.athlete?.cellPhone?.trim()
      ? normalizePhoneForStorage(body.athlete.cellPhone)
      : athleteBase?.cellPhone || "",
    email: trimStr(body.athlete?.email) || athleteBase?.email || "",
    gpa: trimStr(body.athlete?.gpa) || athleteBase?.gpa || "",
    highestAchievement:
      trimStr(body.athlete?.highestAchievement) ||
      athleteBase?.highestAchievement ||
      "None",
    interestWrestlingCollege: body.athlete?.interestWrestlingCollege === true,
  }

  const athleteMissing = missingAthleteFields(merged)
  if (athleteMissing.length > 0) {
    return {
      ok: false,
      error: `Still need wrestler info: ${athleteMissing.map(fieldLabel).join(", ")}.`,
    }
  }

  if (!BLUE_SIGNUP_ACHIEVEMENTS.includes(merged.highestAchievement as (typeof BLUE_SIGNUP_ACHIEVEMENTS)[number])) {
    merged.highestAchievement = "None"
  }

  const gradYear = merged.graduationYear as number
  if (!Number.isFinite(gradYear) || gradYear < 2020 || gradYear > 2040) {
    return { ok: false, error: "Enter a valid graduation year." }
  }

  if (!athleteId && ctx.athletes.length > 0) {
    return { ok: false, error: "Select which wrestler is joining Blue." }
  }

  return {
    ok: true,
    parent,
    athlete: {
      athleteId,
      firstName: merged.firstName,
      lastName: merged.lastName,
      graduationYear: gradYear,
      highSchool: merged.highSchool,
      wrestlingClub: merged.wrestlingClub,
      weightClass: merged.weightClass,
      cellPhone: merged.cellPhone,
      email: merged.email.toLowerCase(),
      gpa: merged.gpa,
      highestAchievement: merged.highestAchievement,
      interestWrestlingCollege: merged.interestWrestlingCollege,
    },
  }
}

function fieldLabel(key: string): string {
  const labels: Record<string, string> = {
    firstName: "first name",
    lastName: "last name",
    graduationYear: "graduation year",
    highSchool: "high school",
    weightClass: "weight class",
    wrestlingClub: "club",
    cellPhone: "cell phone",
    email: "email",
    gpa: "GPA",
    phone: "cell phone",
  }
  return labels[key] ?? key
}
