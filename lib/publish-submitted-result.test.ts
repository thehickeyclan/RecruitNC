import { describe, expect, it } from "vitest"
import { publishSubmittedResult } from "./publish-submitted-result"

/** The two calls this function makes, stubbed: the athlete lookup, then the insert. */
function stubClient(opts: {
  lookup: { data: unknown; error: { message: string } | null }
  insertError?: { message: string } | null
}) {
  const inserted: unknown[] = []
  const client = {
    from(table: string) {
      if (table === "athletes") {
        return {
          select: () => ({ eq: () => ({ maybeSingle: async () => opts.lookup }) }),
        }
      }
      return {
        insert: async (row: unknown) => {
          inserted.push(row)
          return { error: opts.insertError ?? null }
        },
      }
    },
  }
  return { client: client as never, inserted }
}

const form = { event: "Walsh Ironman", date: "2025-12-20", weight: "126", record: "6-2", placement: "5th" }

describe("publishSubmittedResult", () => {
  it("reports a failed lookup instead of calling the wrestler missing", () => {
    /*
     * The bug this exists for. The select asked for `athletes.club`, which is not a column —
     * it is `wrestlingClub`. PostgREST errored, `data` came back null, the error was discarded,
     * and the caller was told "athlete not found" about Adam Walker, who plainly exists. His
     * first real submission vanished without a trace anyone could follow.
     */
    const { client } = stubClient({
      lookup: { data: null, error: { message: 'column athletes.club does not exist' } },
    })
    return publishSubmittedResult(client, { athleteId: "abc", requestId: "r1", form }).then((result) => {
      expect(result.ok).toBe(false)
      expect(result.error).toContain("athlete lookup failed")
      expect(result.error).toContain("does not exist")
      expect(result.error).not.toBe("athlete not found")
    })
  })

  it("still says not found when the athlete really is absent", () => {
    const { client } = stubClient({ lookup: { data: null, error: null } })
    return publishSubmittedResult(client, { athleteId: "nope", requestId: "r1", form }).then((result) => {
      expect(result).toEqual({ ok: false, error: "athlete not found" })
    })
  })

  it("writes the row when the athlete resolves", () => {
    const { client, inserted } = stubClient({
      lookup: { data: { id: "abc", name: "Adam Walker", highschool: "Holly Springs", wrestlingClub: "TWA" }, error: null },
    })
    return publishSubmittedResult(client, { athleteId: "abc", requestId: "r1", form }).then((result) => {
      expect(result).toEqual({ ok: true })
      expect(inserted).toHaveLength(1)
      expect(inserted[0]).toMatchObject({
        athlete_name: "Adam Walker",
        club: "TWA",
        verification_status: "family-submitted",
        placement: 5,
      })
    })
  })

  it("surfaces an insert failure rather than reporting success", () => {
    const { client } = stubClient({
      lookup: { data: { id: "abc", name: "Adam Walker" }, error: null },
      insertError: { message: "permission denied" },
    })
    return publishSubmittedResult(client, { athleteId: "abc", requestId: "r1", form }).then((result) => {
      expect(result).toMatchObject({ ok: false, error: "permission denied" })
    })
  })
})
