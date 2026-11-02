import { describe, expect, it, vi } from "vitest"
vi.mock("server-only", () => ({}))
vi.mock("@/lib/push-send", () => ({ sendToSubscribers: vi.fn() }))
import { buildRankingsUpdatePush } from "./rankings-notification"

describe("one alert for a whole rankings update", () => {
  it("names every class and the Top 75 once, and no wrestler", () => {
    const push = buildRankingsUpdatePush({ classes: [2029, 2027, 2028], top75: true, leader: "Carson Worrick", events: ["TOC", "Journeymen", "Super 32"] })
    expect(push.title).toBe("All NC College Prospect Rankings updated")
    expect(push.body).toBe("Classes of 2027, 2028 and 2029 and the Top 75 College Prospects now include TOC, Journeymen and Super 32 results. Log in to see them.")
    expect(push.data).toMatchObject({ kind: "rankings", path: "/public-rankings" })
  })
  it("reads right for one class and no Top 75", () => {
    expect(buildRankingsUpdatePush({ classes: [2027], top75: false, leader: "X" }).body).toBe("Class of 2027 is updated. Log in to see them.")
  })
})
