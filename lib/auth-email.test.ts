import { describe, expect, it } from "vitest"

import { authEmailsFor, brandForAuthEmail, verifyUrl } from "./auth-email"

const SB = "https://abc.supabase.co"

describe("brandForAuthEmail", () => {
  it("follows the site in the link first", () => {
    expect(brandForAuthEmail({ user_metadata: { signup_brand: "ncunited" } }, { email_action_type: "recovery", redirect_to: "https://www.recruitwrestlers.com/auth/reset-password" })).toBe("recruitwrestlers")
    expect(brandForAuthEmail({ user_metadata: { signup_brand: "ncunited" } }, { email_action_type: "recovery", redirect_to: "https://app.ncwrestlingunited.com/auth/reset-password" })).toBe("ncunited")
  })
  it("trusts where the account began over an NC United redirect Supabase substituted", () => {
    const { brand, emails } = authEmailsFor(
      { email: "f@x.com", user_metadata: { signup_brand: "recruitwrestlers" } },
      { email_action_type: "signup", token_hash: "pkce_1", redirect_to: "https://app.ncwrestlingunited.com" },
      SB,
    )
    expect(brand).toBe("recruitwrestlers")
    expect(emails[0].text).toContain("redirect_to=https%3A%2F%2Fwww.recruitwrestlers.com%2Fauth%2Fcallback")
  })
  it("falls back to where the account began, then NC United", () => {
    expect(brandForAuthEmail({ user_metadata: { signup_brand: "recruitwrestlers" } }, { email_action_type: "signup" })).toBe("recruitwrestlers")
    expect(brandForAuthEmail({}, { email_action_type: "signup" })).toBe("ncunited")
  })
})

describe("authEmailsFor", () => {
  it("sends a RecruitWrestlers sign-up confirmation through Supabase's verify link", () => {
    const { brand, emails } = authEmailsFor(
      { email: "fam@example.com", user_metadata: { signup_brand: "recruitwrestlers" } },
      { email_action_type: "signup", token_hash: "th1", redirect_to: "https://www.recruitwrestlers.com/auth/callback" },
      SB,
    )
    expect(brand).toBe("recruitwrestlers")
    expect(emails).toHaveLength(1)
    expect(emails[0].to).toBe("fam@example.com")
    expect(emails[0].html).toContain("Welcome to RecruitWrestlers")
    expect(emails[0].html).not.toContain("NC United")
    expect(emails[0].text).toContain(verifyUrl(SB, "th1", "signup", "https://www.recruitwrestlers.com/auth/callback"))
  })
  it("says NC United for an NC United sign-up", () => {
    const { emails } = authEmailsFor({ email: "a@b.com" }, { email_action_type: "signup", token_hash: "x", redirect_to: "https://app.ncwrestlingunited.com/auth/callback" }, SB)
    expect(emails[0].html).toContain("Welcome to NC United")
    expect(emails[0].html).not.toContain("RecruitWrestlers")
  })
  it("sends both halves of a secure email change, crossed the way Supabase names them", () => {
    const { emails } = authEmailsFor({ email: "old@b.com", new_email: "new@b.com" }, { email_action_type: "email_change", token_hash: "forNew", token_hash_new: "forOld" }, SB)
    expect(emails.map((e) => e.to)).toEqual(["old@b.com", "new@b.com"])
    expect(emails[0].text).toContain("token=forOld")
    expect(emails[1].text).toContain("token=forNew")
  })
  it("puts the code in a re-authentication email", () => {
    const { emails } = authEmailsFor({ email: "a@b.com" }, { email_action_type: "reauthentication", token: "123456" }, SB)
    expect(emails[0].text).toContain("123456")
  })
})
