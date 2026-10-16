import { afterEach, describe, expect, it, vi } from "vitest"
import { isOpenWhileStaged, stagedBrandForHost } from "@/lib/recruiting/national-paths"
import { stagingGateAllows } from "@/lib/staging-gate"

const SECRET = "test-secret-for-staging-gate"

const b64url = (s: string | Uint8Array) =>
  Buffer.from(typeof s === "string" ? s : Buffer.from(s)).toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "")

async function token(claims: Record<string, unknown>, secret = SECRET) {
  const h = b64url(JSON.stringify({ alg: "HS256", typ: "JWT" }))
  const p = b64url(JSON.stringify(claims))
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"])
  const sig = new Uint8Array(await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(`${h}.${p}`)))
  return `${h}.${p}.${b64url(sig)}`
}
const bearer = (t: string) => new Headers({ authorization: `Bearer ${t}` })
const future = Math.floor(Date.now() / 1000) + 3600

describe("which addresses are pre-launch brands", () => {
  it("knows Guild Recruiting and RecruitWrestlers, and nothing else", () => {
    expect(stagedBrandForHost("recruit.wrestlingguild.com")).toBe("guild")
    expect(stagedBrandForHost("recruit.wrestlingguild.com:443")).toBe("guild")
    expect(stagedBrandForHost("www.recruitwrestlers.com")).toBe("national")
    expect(stagedBrandForHost("app.ncwrestlingunited.com")).toBeNull()
    expect(stagedBrandForHost("www.wrestlingguild.com")).toBeNull()
    expect(stagedBrandForHost("localhost")).toBeNull()
  })

  it("keeps only sign-in and the holding page open while the gate is closed", () => {
    for (const open of ["/auth/signin", "/auth/callback", "/api/auth/landing", "/guild-recruiting/coming-soon", "/robots.txt", "/guild/guild-mark.png"]) expect(isOpenWhileStaged(open)).toBe(true)
    for (const closed of ["/", "/prospects/all", "/athletes/abc", "/api/prospects", "/api/coach-messages", "/my-recruiting", "/coach-home", "/guild-recruiting"]) expect(isOpenWhileStaged(closed)).toBe(false)
  })
})

describe("the staging gate", () => {
  afterEach(() => {
    vi.unstubAllEnvs()
    vi.unstubAllGlobals()
  })

  it("refuses a visitor with no session, a forged token, or an expired one", async () => {
    vi.stubEnv("SUPABASE_JWT_SECRET", SECRET)
    expect(await stagingGateAllows(new Headers(), [])).toBe(false)
    expect(await stagingGateAllows(bearer(await token({ sub: "u1", role: "authenticated", exp: future }, "wrong-secret")), [])).toBe(false)
    expect(await stagingGateAllows(bearer(await token({ sub: "u1", role: "authenticated", exp: 1 })), [])).toBe(false)
  })

  it("fails closed when the deploy has no signing secret", async () => {
    vi.stubEnv("SUPABASE_JWT_SECRET", "")
    expect(await stagingGateAllows(bearer(await token({ sub: "u1", role: "authenticated", exp: future, email: "testcoach.thehickeyclan@gmail.com" })), [])).toBe(false)
  })

  it("lets our internal test accounts in without a profile lookup", async () => {
    vi.stubEnv("SUPABASE_JWT_SECRET", SECRET)
    const fetchSpy = vi.fn()
    vi.stubGlobal("fetch", fetchSpy)
    expect(await stagingGateAllows(bearer(await token({ sub: "u-test", role: "authenticated", exp: future, email: "testcoach.thehickeyclan@gmail.com" })), [])).toBe(true)
    expect(fetchSpy).not.toHaveBeenCalled()
  })

  it("lets an admin in and refuses an ordinary family or coach", async () => {
    vi.stubEnv("SUPABASE_JWT_SECRET", SECRET)
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://example.supabase.co")
    vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "service")
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string) => new Response(JSON.stringify(url.includes("u-admin") ? [{ is_admin: true }] : [{ is_admin: false, role: "parent" }]), { status: 200 })),
    )
    expect(await stagingGateAllows(bearer(await token({ sub: "u-admin", role: "authenticated", exp: future, email: "director@wrestlingclub.org" })), [])).toBe(true)
    expect(await stagingGateAllows(bearer(await token({ sub: "u-family", role: "authenticated", exp: future, email: "parent@gmail.com" })), [])).toBe(false)
  })
})
