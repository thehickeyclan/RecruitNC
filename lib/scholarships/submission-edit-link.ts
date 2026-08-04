import { createHmac, timingSafeEqual } from "node:crypto"

const TOKEN_VERSION = "v1"

function signingKey(): string {
  const key =
    process.env.SCHOLARSHIP_EDIT_LINK_SECRET ||
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.SUPABASE_SERVICE_ROLE_KEY_OVERRIDE
  if (!key) throw new Error("Scholarship edit links are not configured.")
  return key
}

function payload(applicationId: string, nominatorEmail: string): string {
  return `scholarship-submission-edit:${TOKEN_VERSION}:${applicationId}:${nominatorEmail.trim().toLowerCase()}`
}

export function createScholarshipSubmissionEditToken(applicationId: string, nominatorEmail: string): string {
  return createHmac("sha256", signingKey()).update(payload(applicationId, nominatorEmail)).digest("base64url")
}

export function verifyScholarshipSubmissionEditToken(
  applicationId: string,
  nominatorEmail: string,
  token: string,
): boolean {
  const expected = createScholarshipSubmissionEditToken(applicationId, nominatorEmail)
  const actualBuffer = Buffer.from(token)
  const expectedBuffer = Buffer.from(expected)
  return actualBuffer.length === expectedBuffer.length && timingSafeEqual(actualBuffer, expectedBuffer)
}

export function scholarshipSubmissionEditPath(applicationId: string, nominatorEmail: string): string {
  const token = createScholarshipSubmissionEditToken(applicationId, nominatorEmail)
  return `/fundraising/scholarships/submission/${encodeURIComponent(applicationId)}?token=${encodeURIComponent(token)}`
}
