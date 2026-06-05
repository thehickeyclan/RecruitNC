import { describe, expect, it } from "vitest"
import { aauTravelFulfillmentStatus, parseAauTravelNeed } from "./aau-duals-travel-commitment"

describe("aau-duals-travel-commitment", () => {
  it("parses travel need values", () => {
    expect(parseAauTravelNeed("flight")).toBe("flight")
    expect(parseAauTravelNeed("flight_hotel")).toBe("flight_hotel")
    expect(parseAauTravelNeed("bogus")).toBe("none")
  })

  it("compares verbal commitment to paid amounts", () => {
    expect(aauTravelFulfillmentStatus("flight", { flight_cents: 35500, hotel_cents: 0 })).toBe("complete")
    expect(aauTravelFulfillmentStatus("flight", { flight_cents: 0, hotel_cents: 0 })).toBe("verbal_only")
    expect(aauTravelFulfillmentStatus("flight_hotel", { flight_cents: 35500, hotel_cents: 31500 })).toBe("complete")
    expect(aauTravelFulfillmentStatus("flight_hotel", { flight_cents: 35500, hotel_cents: 0 })).toBe("partial")
    expect(aauTravelFulfillmentStatus("none", { flight_cents: 35500, hotel_cents: 0 })).toBe("not_set")
  })
})
