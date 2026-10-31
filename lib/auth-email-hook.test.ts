import { createHmac } from "node:crypto"
import { beforeEach, describe, expect, it, vi } from "vitest"

const sent: any[] = []
vi.mock("resend", () => ({
  Resend: class {
    emails = { send: async (m: any) => (sent.push(m), { data: { id: "x" }, error: null }) }
  },
}))

import { POST } from "@/app/api/auth/email-hook/route"

const KEY = Buffer.from("test-secret-key-0123456789").toString("base64")

function signed(body: string, key = KEY) {
  const id = "msg_1"
  const ts = String(Math.floor(Date.now() / 1000))
  const sig = createHmac("sha256", Buffer.from(key, "base64")).update(`${id}.${ts}.${body}`).digest("base64")
  return new Request("http://x/api/auth/email-hook", { method: "POST", body, headers: { "webhook-id": id, "webhook-timestamp": ts, "webhook-signature": `v1,${sig}` } })
}

const body = JSON.stringify({
  user: { email: "fam@example.com", user_metadata: { signup_brand: "recruitwrestlers" } },
  email_data: { email_action_type: "signup", token_hash: "th", redirect_to: "https://www.recruitwrestlers.com/auth/callback" },
})

describe("email hook", () => {
  beforeEach(() => {
    sent.length = 0
    process.env.SUPABASE_EMAIL_HOOK_SECRET = `v1,whsec_${KEY}`
    process.env.RESEND_API_KEY = "re_test"
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://abc.supabase.co"
  })
  it("sends a signed request's email in the right brand", async () => {
    const res = await POST(signed(body))
    expect(res.status).toBe(200)
    expect(sent).toHaveLength(1)
    expect(sent[0].from).toContain("RecruitWrestlers")
    expect(sent[0].to).toEqual(["fam@example.com"])
  })
  it("refuses a bad signature and sends nothing", async () => {
    const res = await POST(signed(body, Buffer.from("wrong").toString("base64")))
    expect(res.status).toBe(401)
    expect(sent).toHaveLength(0)
  })
})
