import { describe, expect, it, vi } from "vitest"
vi.mock("server-only", () => ({}))
vi.mock("@/lib/push-send", () => ({ sendToSubscribers: vi.fn() }))
import { buildRankingsUpdatePush } from "./rankings-notification"

describe("one alert for a whole rankings update", () => {
  it("names every class and the Top 75 once, with the Top 75 leader", () => {
    const push = buildRankingsUpdatePush({ classes: [2029, 2027, 2028], top75: true, leader: "Carson Worrick" })
    expect(push.title).toBe("NC College Prospect Rankings updated")
    expect(push.body).toBe("Classes of 2027, 2028 and 2029, plus the Top 75 College Prospects, are out. Carson Worrick leads the Top 75. Tap to see them.")
    expect(push.data).toMatchObject({ kind: "rankings", path: "/public-rankings" })
  })
  it("reads right for one class and no Top 75", () => {
    expect(buildRankingsUpdatePush({ classes: [2027], top75: false, leader: "X" }).body).toBe("Class of 2027 is out. Tap to see them.")
  })
})
