import { createHmac } from "crypto"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { coachFrontDoor } from "./coach-front-door"

const SECRET = "test-secret-for-front-door"
const b64 = (o: unknown) => Buffer.from(JSON.stringify(o)).toString("base64url")
function token(sub: string, exp: number): string {
  const body = `${b64({ alg: "HS256", typ: "JWT" })}.${b64({ sub, exp, role: "authenticated" })}`
  return `${body}.${createHmac("sha256", SECRET).update(body).digest("base64url")}`
}
const session = (sub: string, exp: number) => ({
  name: "sb-abc123-auth-token",
  value: "base64-" + Buffer.from(JSON.stringify({ access_token: token(sub, exp) })).toString("base64url"),
})
const none = new Headers()
const expired = Math.floor(Date.now() / 1000) - 36 * 3600

function profileIs(row: Record<string, unknown> | null) {
  return vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response(JSON.stringify(row ? [row] : []), { status: 200 }))
}

beforeEach(() => {
  process.env.SUPABASE_JWT_SECRET = SECRET
  process.env.NEXT_PUBLIC_SUPABASE_URL = "https://example.supabase.co"
  process.env.SUPABASE_SERVICE_ROLE_KEY = "service"
})
afterEach(() => vi.restoreAllMocks())

describe("coachFrontDoor", () => {
  it("leaves a signed-out visitor on the front page, hint or no hint", async () => {
    const lookup = profileIs({ role: "college_coach" })
    expect(await coachFrontDoor(none, [])).toEqual({ redirect: false, setHint: false })
    expect(await coachFrontDoor(none, [{ name: "recruiting-shell", value: "1" }])).toEqual({ redirect: false, setHint: false })
    expect(lookup).not.toHaveBeenCalled()
  })

  it("sends a known coach on without looking anything up", async () => {
    const lookup = profileIs(null)
    expect(await coachFrontDoor(none, [session("u-hint", expired), { name: "recruiting-shell", value: "1" }])).toEqual({ redirect: true, setHint: false })
    expect(lookup).not.toHaveBeenCalled()
  })

  it("leaves a known non-coach alone without looking anything up", async () => {
    const lookup = profileIs({ role: "college_coach" })
    expect(await coachFrontDoor(none, [session("u-parent", expired), { name: "recruiting-shell", value: "0" }])).toEqual({ redirect: false, setHint: false })
    expect(lookup).not.toHaveBeenCalled()
  })

  it("recognises a returning coach from a token that expired a day and a half ago", async () => {
    profileIs({ role: "college_coach", is_admin: false })
    expect(await coachFrontDoor(none, [session("u-koll", expired)])).toEqual({ redirect: true, setHint: true })
  })

  it("reads college-coach however it is spelt, and never an admin", async () => {
    profileIs({ role: "college-coach" })
    expect((await coachFrontDoor(none, [session("u-hyphen", expired)])).redirect).toBe(true)
    vi.restoreAllMocks()
    profileIs({ role: "college_coach", is_admin: true })
    expect((await coachFrontDoor(none, [session("u-admin", expired)])).redirect).toBe(false)
  })

  it("does not move a parent, an athlete or a high-school coach", async () => {
    for (const [id, role] of [["u-p", "parent"], ["u-a", "athlete"], ["u-h", "coach"]] as const) {
      vi.restoreAllMocks()
      profileIs({ role })
      expect((await coachFrontDoor(none, [session(id, expired)])).redirect).toBe(false)
    }
  })

  it("ignores a token it did not sign", async () => {
    const lookup = profileIs({ role: "college_coach" })
    const forged = { name: "sb-abc123-auth-token", value: "base64-" + Buffer.from(JSON.stringify({ access_token: token("u-x", expired).slice(0, -3) + "abc" })).toString("base64url") }
    expect(await coachFrontDoor(none, [forged])).toEqual({ redirect: false, setHint: false })
    expect(lookup).not.toHaveBeenCalled()
  })
})

describe("a partner program's coach", () => {
  const coach = [session("u-unc", expired), { name: "recruiting-shell", value: "1" }]
  const partner = [...coach, { name: "recruiting-partner", value: "1" }]

  it("still starts on Coach Home", async () => {
    expect((await coachFrontDoor(none, partner)).redirect).toBe(true)
  })

  it("reaches the NC United site when he asks for it", async () => {
    expect((await coachFrontDoor(none, partner, true)).redirect).toBe(false)
  })

  it("and no other coach does", async () => {
    expect((await coachFrontDoor(none, coach, true)).redirect).toBe(true)
  })
})
