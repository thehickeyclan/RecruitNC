import { describe, expect, it } from "vitest"
import {
  TOC_DEFAULT_BRACKET_SIZE,
  TOC_MAX_CONFIRMED_PER_WEIGHT,
  tocBracketSize,
} from "@/lib/toc/invitations"
import { TOC_WEIGHT_CLASSES } from "@/lib/toc/constants"

describe("tocBracketSize", () => {
  it("runs eight at 133", () => {
    expect(tocBracketSize(133)).toBe(8)
  })

  it("runs eight at every weight", () => {
    for (const weight of TOC_WEIGHT_CLASSES) {
      expect(tocBracketSize(weight)).toBe(TOC_DEFAULT_BRACKET_SIZE)
    }
  })

  it("does not grow because more wrestlers confirmed", () => {
    expect(tocBracketSize(133)).toBe(8)
    expect(tocBracketSize(117)).toBe(8)
  })

  it("falls back to eight for an unknown or junk weight", () => {
    expect(tocBracketSize(999)).toBe(8)
    expect(tocBracketSize(null)).toBe(8)
    expect(tocBracketSize("not a weight")).toBe(8)
  })

  it("never plans a field larger than the draw engine can build", () => {
    for (const weight of TOC_WEIGHT_CLASSES) {
      expect(tocBracketSize(weight)).toBeLessThanOrEqual(TOC_MAX_CONFIRMED_PER_WEIGHT)
    }
  })
})
