import { describe, expect, it } from "vitest"
import { shareResultMessage } from "@/lib/news-share-client"

describe("news share client", () => {
  it("describes native IG story share", () => {
    const msg = shareResultMessage({ mode: "native", format: "ig-story" }, false)
    expect(msg.description).toContain("Instagram")
    expect(msg.description).toContain("Story")
  })

  it("describes desktop fallback with copied link", () => {
    const msg = shareResultMessage(
      { mode: "download", format: "ig-story", filename: "test-ig-story.png" },
      true,
    )
    expect(msg.title).toBe("Image saved")
    expect(msg.description).toContain("link copied")
  })
})
