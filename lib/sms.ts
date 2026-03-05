/**
 * Send SMS via Twilio. Used for new-message notifications.
 * Set TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_PHONE_NUMBER in env.
 * If any are missing, sendSms no-ops and returns false.
 */

const TWILIO_ACCOUNT_SID = process.env.TWILIO_ACCOUNT_SID
const TWILIO_AUTH_TOKEN = process.env.TWILIO_AUTH_TOKEN
const TWILIO_PHONE_NUMBER = process.env.TWILIO_PHONE_NUMBER

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
  if (!TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN || !TWILIO_PHONE_NUMBER) {
    console.warn(
      "[RecruitNC SMS] Skipped — Twilio not configured. Set TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_PHONE_NUMBER in Vercel (or .env) and redeploy."
    )
    return false
  }
  const from = TWILIO_PHONE_NUMBER.trim()
  const to = toE164.startsWith("+") ? toE164 : `+${toE164}`
  const url = `https://api.twilio.com/2010-04-01/Accounts/${TWILIO_ACCOUNT_SID}/Messages.json`
  const auth = Buffer.from(`${TWILIO_ACCOUNT_SID}:${TWILIO_AUTH_TOKEN}`).toString("base64")
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Authorization: `Basic ${auth}`,
      },
      body: new URLSearchParams({ To: to, From: from, Body: body }),
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
