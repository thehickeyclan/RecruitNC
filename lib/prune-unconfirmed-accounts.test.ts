import { describe, expect, it } from "vitest"
import { staleUnconfirmed } from "./prune-unconfirmed-accounts"

describe("staleUnconfirmed", () => {
  const now = new Date("2026-09-29T12:00:00Z")
  const day = (n: number) => new Date(now.getTime() - n * 86_400_000).toISOString()
  it("takes only accounts past the grace period that never signed in, confirmed or not", () => {
    const users = [
      { id: "old-unconfirmed", created_at: day(10) },
      { id: "new-unconfirmed", created_at: day(2) },
      { id: "old-confirmed-never-signed-in", created_at: day(30), email_confirmed_at: day(29) },
      { id: "old-signed-in", created_at: day(30), last_sign_in_at: day(1) },
    ]
    expect(staleUnconfirmed(users, now).map((u) => u.id)).toEqual(["old-unconfirmed", "old-confirmed-never-signed-in"])
  })
})
