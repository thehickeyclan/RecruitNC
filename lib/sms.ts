/**
 * Send SMS via Twilio. Used for new-message notifications.
 * Set TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, and either:
 * - TWILIO_PHONE_NUMBER (send from this number), or
 * - TWILIO_MESSAGING_SERVICE_SID (send via this A2P Messaging Service — recommended for 10DLC).
 * If using a Messaging Service, the From number in its Sender Pool is used and the message is tied to your A2P campaign.
 */

const TWILIO_ACCOUNT_SID = process.env.TWILIO_ACCOUNT_SID
const TWILIO_AUTH_TOKEN = process.env.TWILIO_AUTH_TOKEN
const TWILIO_PHONE_NUMBER = process.env.TWILIO_PHONE_NUMBER
const TWILIO_MESSAGING_SERVICE_SID = process.env.TWILIO_MESSAGING_SERVICE_SID?.trim()

/** Convert (xxx) xxx-xxxx or digits to E.164 +1xxxxxxxxxx for US. */
export function toE164(phone: string | null | undefined): string | null {
  if (phone == null) return null
  const digits = String(phone).replace(/\D/g, "")
  const ten = digits.length === 11 && digits[0] === "1" ? digits.slice(1) : digits.length === 10 ? digits : ""
  if (ten.length !== 10) return null
  return `+1${ten}`
}

/**
 * Send one SMS. Returns true if sent, false if skipped (no config or error).
 * Does not throw.
 */
export async function sendSms(toE164: string, body: string): Promise<boolean> {
  const useMessagingService = !!TWILIO_MESSAGING_SERVICE_SID
  const hasFrom = !!TWILIO_PHONE_NUMBER?.trim()
  if (!TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN || (!useMessagingService && !hasFrom)) {
    console.warn(
      "[RecruitNC SMS] Skipped — Twilio not configured. Set TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, and TWILIO_PHONE_NUMBER or TWILIO_MESSAGING_SERVICE_SID in Vercel (or .env) and redeploy."
    )
    return false
  }
  const to = toE164.startsWith("+") ? toE164 : `+${toE164}`
  const params: Record<string, string> = { To: to, Body: body }
  if (useMessagingService) {
    params.MessagingServiceSid = TWILIO_MESSAGING_SERVICE_SID
    console.log("[RecruitNC SMS] Sending via Messaging Service (10DLC)")
  } else {
    params.From = TWILIO_PHONE_NUMBER!.trim()
    console.log("[RecruitNC SMS] Sending from number (not Messaging Service — 30034 likely)")
  }
  const url = `https://api.twilio.com/2010-04-01/Accounts/${TWILIO_ACCOUNT_SID}/Messages.json`
  const auth = Buffer.from(`${TWILIO_ACCOUNT_SID}:${TWILIO_AUTH_TOKEN}`).toString("base64")
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Authorization: `Basic ${auth}`,
      },
      body: new URLSearchParams(params),
    })
    if (!res.ok) {
      const err = await res.text()
      console.error("[RecruitNC SMS] Twilio error:", res.status, err)
      return false
    }
    return true
  } catch (e) {
    console.error("[RecruitNC SMS] Send failed:", e)
    return false
  }
}
