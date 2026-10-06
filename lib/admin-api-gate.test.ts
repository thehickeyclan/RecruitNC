import { describe, expect, it } from "vitest"
import { accessTokenFrom, adminGateApplies, verifiedUserId } from "./admin-api-gate"

const SECRET = "test-secret-at-least-32-characters-long!!"
const b64url = (b: Uint8Array | string) =>
  Buffer.from(typeof b === "string" ? b : Buffer.from(b)).toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "")

async function sign(claims: Record<string, unknown>, secret = SECRET, alg = "HS256") {
  const h = b64url(JSON.stringify({ alg, typ: "JWT" }))
  const p = b64url(JSON.stringify(claims))
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"])
  const sig = new Uint8Array(await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(`${h}.${p}`)))
  return `${h}.${p}.${b64url(sig)}`
}
const future = Math.floor(Date.now() / 1000) + 3600

describe("adminGateApplies", () => {
  it("guards admin routes, including ones that change data", () => {
    expect(adminGateApplies("/api/admin/athletes", "GET")).toBe(true)
    expect(adminGateApplies("/api/admin/impersonate", "POST")).toBe(true)
    expect(adminGateApplies("/api/admin/colleges/abc", "PATCH")).toBe(true)
  })
  it("guards debug, test and one-off fix routes too", () => {
    expect(adminGateApplies("/api/debug/find-colt-campbell", "GET")).toBe(true)
    expect(adminGateApplies("/api/debug-stats", "GET")).toBe(true)
    expect(adminGateApplies("/api/test-supabase", "GET")).toBe(true)
    expect(adminGateApplies("/api/fix-montreat", "GET")).toBe(true)
    expect(adminGateApplies("/api/athletes/x", "GET")).toBe(false)
  })
  it("leaves the read-only lists ordinary pages use, and TOC's own guards, alone", () => {
    expect(adminGateApplies("/api/admin/colleges", "GET")).toBe(false)
    expect(adminGateApplies("/api/admin/colleges", "POST")).toBe(true)
    expect(adminGateApplies("/api/admin/check-impersonation", "GET")).toBe(false)
    expect(adminGateApplies("/api/admin/toc/field", "GET")).toBe(false)
    expect(adminGateApplies("/api/athletes/x", "GET")).toBe(false)
  })
})

describe("verifiedUserId", () => {
  it("accepts a valid token signed with our secret", async () => {
    expect(await verifiedUserId(await sign({ sub: "u1", role: "authenticated", exp: future }), SECRET)).toBe("u1")
  })
  it("refuses a forged, expired, anonymous or wrongly-signed token", async () => {
    expect(await verifiedUserId(await sign({ sub: "u1", role: "authenticated", exp: future }, "other-secret-other-secret-other!!"), SECRET)).toBeNull()
    expect(await verifiedUserId(await sign({ sub: "u1", role: "authenticated", exp: 1 }), SECRET)).toBeNull()
    expect(await verifiedUserId(await sign({ sub: "u1", role: "anon", exp: future }), SECRET)).toBeNull()
    const tampered = (await sign({ sub: "u1", role: "authenticated", exp: future })).replace(/\.[^.]+\./, `.${b64url(JSON.stringify({ sub: "admin", role: "authenticated", exp: future }))}.`)
    expect(await verifiedUserId(tampered, SECRET)).toBeNull()
    expect(await verifiedUserId(await sign({ sub: "u1", role: "authenticated", exp: future }, SECRET, "none"), SECRET)).toBeNull()
  })
})

describe("accessTokenFrom", () => {
  it("reads a bearer header, a base64 session cookie, and a chunked one", async () => {
    const t = await sign({ sub: "u1", role: "authenticated", exp: future })
    expect(accessTokenFrom(new Headers({ authorization: `Bearer ${t}` }), [])).toBe(t)
    const cookie = "base64-" + b64url(JSON.stringify({ access_token: t }))
    expect(accessTokenFrom(new Headers(), [{ name: "sb-abc-auth-token", value: cookie }])).toBe(t)
    expect(
      accessTokenFrom(new Headers(), [
        { name: "sb-abc-auth-token.1", value: cookie.slice(40) },
        { name: "sb-abc-auth-token.0", value: cookie.slice(0, 40) },
      ]),
    ).toBe(t)
    expect(accessTokenFrom(new Headers(), [])).toBeNull()
  })
})
