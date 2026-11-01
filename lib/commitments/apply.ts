import "server-only"
import type { SupabaseClient } from "@supabase/supabase-js"
import { normalizeCollegeToCanonical } from "@/lib/canonical-college"
import { sendToSubscribers } from "@/lib/push-send"
import { sendSms, toE164 } from "@/lib/sms"
import { contactKind } from "@/lib/commitments/intake"
import { siteUrl } from "@/lib/commitments/approval-link"
import { findExistingAthlete } from "@/lib/athlete-duplicate-check"
import { PROFILE_CLASS_YEARS } from "@/lib/commitments/intake"

/**
 * Approving a reported commitment: the one step that makes it real.
 *
 * Before 26 October 2026 approving a submission flipped its status and nothing else - the college
 * never reached the wrestler's profile, so an approved commitment appeared nowhere. Approval now
 * writes the profile the way the admin commitment wizard does, announces it to every phone that
 * asked for commitment alerts at once (not on the hourly cron, which skips a commitment whose date
 * is more than a few weeks old), and tells the person who reported it that it is live.
 *
 * `push_sent_commits` is still the guard on the announcement: a wrestler is announced once, ever.
 */
export type Submission = {
  id: string
  status: string | null
  first_name: string | null
  last_name: string | null
  graduation_year: number | null
  high_school: string | null
  gender: string | null
  athlete_id: string | null
  college: string | null
  college_id: string | null
  division: string | null
  commitment_date: string | null
  college_weight_class: string | null
  intended_major: string | null
  commit_picture_url: string | null
  commitment_announcement_url: string | null
  submitter_name: string | null
  submitter_role: string | null
  submitter_contact: string | null
  submitted_at: string | null
  reviewed_at: string | null
  applied_athlete_id: string | null
  announced_at: string | null
}

export const SUBMISSION_COLUMNS =
  "id, status, first_name, last_name, graduation_year, high_school, gender, athlete_id, college, college_id, division, commitment_date, college_weight_class, intended_major, commit_picture_url, commitment_announcement_url, submitter_name, submitter_role, submitter_contact, submitted_at, reviewed_at, applied_athlete_id, announced_at"

export async function loadSubmission(admin: SupabaseClient, id: string): Promise<Submission | null> {
  const { data } = await admin.from("commitment_submissions").select(SUBMISSION_COLUMNS).eq("id", id).maybeSingle()
  return (data as Submission | null) ?? null
}

export type ApproveOutcome =
  | {
      ok: true
      athleteName: string
      college: string
      /** Phones the alert reached; null when the wrestler had been announced before. */
      announced: { sent: number } | null
      /** The profile already said this college: nothing new to announce. */
      unchanged: boolean
      submitterTold: boolean
    }
  | { ok: false; status: number; error: string }

export async function approveSubmission(
  admin: SupabaseClient,
  submissionId: string,
  choice: { athleteId?: string | null; collegeId?: string | null; announce?: boolean; createProfile?: boolean } = {},
): Promise<ApproveOutcome> {
  const sub = await loadSubmission(admin, submissionId)
  if (!sub) return { ok: false, status: 404, error: "That submission no longer exists." }
  if (sub.status === "approved") return { ok: false, status: 409, error: "This commitment was already approved." }

  let athleteId = choice.athleteId || sub.athlete_id
  if (!athleteId && choice.createProfile) {
    const made = await profileFor(admin, sub)
    if (!made.ok) return { ok: false, status: 400, error: made.error }
    athleteId = made.id
  }
  if (!athleteId) return { ok: false, status: 400, error: "Choose the wrestler's profile first." }

  const collegeId = choice.collegeId === undefined ? sub.college_id : choice.collegeId
  let college = normalizeCollegeToCanonical(sub.college)
  if (collegeId) {
    const { data: row } = await admin.from("colleges").select("id, name").eq("id", collegeId).maybeSingle()
    if (!row) return { ok: false, status: 400, error: "That college is not in the list." }
    college = String(row.name)
  }
  if (!college) return { ok: false, status: 400, error: "The submission has no college." }

  const { data: athlete } = await admin
    .from("athletes")
    .select("id, name, college, college_id, college_set_at")
    .eq("id", athleteId)
    .maybeSingle()
  if (!athlete) return { ok: false, status: 404, error: "That profile no longer exists." }

  const previous = String(athlete.college ?? "").trim()
  const unchanged = previous.toLowerCase() === college.toLowerCase()
  const update: Record<string, unknown> = {
    college,
    college_id: collegeId ?? null,
    commitmentdate: sub.commitment_date ?? new Date().toISOString().slice(0, 10),
    recruiting_status: "Committed",
    is_prospect: false,
    updated_at: new Date().toISOString(),
  }
  // The moment we learned of it, set once: the hourly alert and "new commitment" read this.
  if (!previous) update.college_set_at = new Date().toISOString()
  if (sub.college_weight_class) update.college_weight_class = sub.college_weight_class
  if (sub.commit_picture_url) update.commitmentPhotoUrl = sub.commit_picture_url
  const { error: writeError } = await admin.from("athletes").update(update).eq("id", athlete.id)
  if (writeError) return { ok: false, status: 500, error: `The profile could not be updated: ${writeError.message}` }

  const now = new Date().toISOString()
  await admin
    .from("commitment_submissions")
    .update({ status: "approved", reviewed_at: now, updated_at: now, applied_athlete_id: athlete.id, college_id: collegeId ?? null })
    .eq("id", sub.id)

  let announced: { sent: number } | null = null
  // Phones are alerted only when Matt chooses to (1 Nov 2026): a South Carolina commitment must not
  // buzz North Carolina phones. Announce from the approval page or the athlete's admin page.
  if (choice.announce === true && !unchanged) {
    // Claim before sending: a missed alert is recoverable, a second blast to every phone is not.
    const { error: claimError } = await admin.from("push_sent_commits").insert({ athlete_id: athlete.id })
    if (!claimError) {
      try {
        const outcome = await sendToSubscribers("alert_commits", {
          title: "New commitment",
          body: `${athlete.name} commits to ${college}`,
          data: { type: "commit", athleteId: athlete.id, path: `/athlete/${athlete.id}` },
        })
        announced = { sent: outcome.sent }
        await admin.from("commitment_submissions").update({ announced_at: new Date().toISOString() }).eq("id", sub.id)
      } catch (e) {
        console.error("[commitments] announce failed", e instanceof Error ? e.message : e)
      }
    }
  }

  const submitterTold = await tellSubmitter(sub, String(athlete.name), college, athlete.id)
  return { ok: true, athleteName: String(athlete.name), college, announced, unchanged, submitterTold }
}

/**
 * A reported wrestler we had no profile for: approval makes the profile, so a new name is still
 * one tap. Only for a current class (profiles are for 2027 to 2030, never a graduate), and never a
 * second profile - a same-name, same-class match is used instead.
 */
async function profileFor(admin: SupabaseClient, sub: Submission): Promise<{ ok: true; id: string } | { ok: false; error: string }> {
  const first = String(sub.first_name ?? "").trim()
  const last = String(sub.last_name ?? "").trim()
  const year = Number(sub.graduation_year)
  if (!first || !last) return { ok: false, error: "The report has no full name to make a profile from." }
  if (!(PROFILE_CLASS_YEARS as readonly number[]).includes(year)) {
    return { ok: false, error: `Profiles are for the classes of ${PROFILE_CLASS_YEARS[0]} to ${PROFILE_CLASS_YEARS[PROFILE_CLASS_YEARS.length - 1]}.` }
  }
  const name = `${first} ${last}`
  const existing = await findExistingAthlete(admin, { name, graduationYear: year, school: sub.high_school ?? undefined })
  if (existing) return { ok: true, id: existing.id }
  const now = new Date().toISOString()
  const { data, error } = await admin
    .from("athletes")
    .insert({
      name,
      firstName: first,
      lastName: last,
      highschool: sub.high_school ?? "",
      graduationyear: year,
      gender: sub.gender ?? "Male",
      status: "active",
      state: "NC",
      is_nc_athlete: true,
      is_prospect: false,
      recruiting_status: "Committed",
      created_at: now,
      updated_at: now,
    })
    .select("id")
    .single()
  if (error || !data) return { ok: false, error: `The profile could not be made: ${error?.message ?? "unknown error"}` }
  return { ok: true, id: String(data.id) }
}

export async function rejectSubmission(admin: SupabaseClient, submissionId: string): Promise<{ ok: boolean; error?: string }> {
  const now = new Date().toISOString()
  const { error } = await admin
    .from("commitment_submissions")
    .update({ status: "rejected", reviewed_at: now, updated_at: now })
    .eq("id", submissionId)
    .neq("status", "approved")
  return error ? { ok: false, error: error.message } : { ok: true }
}

/** "It's live": the person who sent it hears back, by text or email, whichever they gave. */
async function tellSubmitter(sub: Submission, athleteName: string, college: string, athleteId: string): Promise<boolean> {
  const contact = String(sub.submitter_contact ?? "").trim()
  const kind = contactKind(contact)
  const profile = `${siteUrl()}/view-profile?id=${athleteId}`
  const line = `${athleteName}'s commitment to ${college} is now on NC United and was sent to the app.`
  try {
    if (kind === "phone") {
      const to = toE164(contact)
      return to ? await sendSms(to, `NC United: ${line} ${profile}`) : false
    }
    if (kind === "email" && process.env.RESEND_API_KEY) {
      const { Resend } = await import("resend")
      const resend = new Resend(process.env.RESEND_API_KEY)
      const { error } = await resend.emails.send({
        from: "NC United <info@ncwrestlingunited.com>",
        to: contact,
        subject: `${athleteName} to ${college} is live`,
        text: `${line}\n\nSee it on the profile: ${profile}\n\nThank you for sending it in.\n\nNC United`,
      })
      return !error
    }
  } catch (e) {
    console.error("[commitments] tell submitter", e instanceof Error ? e.message : e)
  }
  return false
}
