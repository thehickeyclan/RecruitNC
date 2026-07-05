import { describe, expect, it } from "vitest"
import { isDataDawgFeedbackTableMissingError } from "@/lib/data-dawg-feedback"

describe("isDataDawgFeedbackTableMissingError", () => {
  it("detects PostgREST schema cache miss", () => {
    expect(
      isDataDawgFeedbackTableMissingError({
        code: "PGRST205",
        message: "Could not find the table 'public.data_dawg_feedback' in the schema cache",
      }),
    ).toBe(true)
  })

  it("detects postgres undefined relation", () => {
    expect(
      isDataDawgFeedbackTableMissingError({
        code: "42P01",
        message: 'relation "public.data_dawg_feedback" does not exist',
      }),
    ).toBe(true)
  })
})
