import { describe, expect, it } from "vitest"
import { CLIENT_HEADER, isAppRequest } from "./app-usage"

const req = (headers: Record<string, string>) =>
  ({ headers: new Headers(headers) }) as unknown as Parameters<typeof isAppRequest>[0]

describe("isAppRequest", () => {
  it("recognises the app", () => {
    expect(isAppRequest(req({ [CLIENT_HEADER]: "recruitnc-app" }))).toBe(true)
  })

  it("does not care how the header is cased", () => {
    expect(isAppRequest(req({ "X-RecruitNC-Client": "RecruitNC-App" }))).toBe(true)
  })

  it("treats a browser as a browser", () => {
    expect(isAppRequest(req({}))).toBe(false)
  })

  it("is not fooled by a bearer token, which the website also sends", () => {
    // The national team hub, the school portal and the chat widget all send one.
    expect(isAppRequest(req({ authorization: "Bearer abc123" }))).toBe(false)
  })

  it("ignores some other client naming itself", () => {
    expect(isAppRequest(req({ [CLIENT_HEADER]: "someone-elses-app" }))).toBe(false)
  })
})
