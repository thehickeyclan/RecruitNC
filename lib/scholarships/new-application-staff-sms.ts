import { sendSms, toE164 } from "@/lib/sms"

const DEFAULT_NOTIFY_PHONE = "6316625409"

export async function sendScholarshipApplicationStaffSms(params: {
  scholarshipName: string
  scholarshipSlug: string
  athleteName: string
  nominatorName: string
}): Promise<boolean> {
  const rawPhone = process.env.SCHOLARSHIP_NEW_APPLICATION_SMS_TO?.trim() || DEFAULT_NOTIFY_PHONE
  const phone = toE164(rawPhone)
  if (!phone) {
    console.error("[scholarships] Invalid SCHOLARSHIP_NEW_APPLICATION_SMS_TO")
    return false
  }

  const site = process.env.NEXT_PUBLIC_APP_URL || process.env.NEXT_PUBLIC_SITE_URL || "https://app.ncwrestlingunited.com"
  const reviewUrl = `${site.replace(/\/$/, "")}/admin/scholarships/${encodeURIComponent(params.scholarshipSlug)}`
  const body = [
    `NC United: New ${params.scholarshipName} nomination.`,
    `Athlete: ${params.athleteName}.`,
    `Submitted by: ${params.nominatorName}.`,
    `Review: ${reviewUrl}`,
  ].join(" ")

  return sendSms(phone, body)
}
