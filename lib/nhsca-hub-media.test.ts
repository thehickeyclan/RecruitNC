import { describe, expect, it } from "vitest"
import { resolveNhscaHubMediaFile } from "@/lib/nhsca-hub-media"

describe("resolveNhscaHubMediaFile", () => {
  it("accepts iOS camera roll photos with empty MIME type", () => {
    const r = resolveNhscaHubMediaFile({ type: "", name: "IMG_1234.HEIC" })
    expect(r?.mediaType).toBe("image")
    expect(r?.contentType).toBe("image/heic")
  })

  it("accepts image/jpg alias", () => {
    const r = resolveNhscaHubMediaFile({ type: "image/jpg", name: "photo.jpg" })
    expect(r?.mediaType).toBe("image")
    expect(r?.contentType).toBe("image/jpeg")
  })

  it("accepts mov by extension when MIME is missing", () => {
    const r = resolveNhscaHubMediaFile({ type: "", name: "clip.MOV" })
    expect(r?.mediaType).toBe("video")
    expect(r?.contentType).toBe("video/quicktime")
  })
})
