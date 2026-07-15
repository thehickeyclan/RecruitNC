import { z } from "zod"
import { HISTORICAL_WINS_EXPECTED_COUNT } from "@/lib/historical-wins/constants"

const seasonRegex = /^(\d{4})-(\d{4})$/

export function parseSeasonYears(season: string): { start: number; end: number } {
  const m = seasonRegex.exec(season.trim())
  if (!m) {
    throw new Error(`Invalid season "${season}" (expected YYYY-YYYY)`)
  }
  const start = Number(m[1])
  const end = Number(m[2])
  if (end !== start + 1) {
    throw new Error(`Season end year must be start+1 (got ${season})`)
  }
  return { start, end }
}

export const historicalWinsSourceSchema = z.object({
  title: z.string().min(1),
  dataset: z.string().min(1),
  version: z.union([z.number().int().positive(), z.string().min(1)]),
})

export const historicalWinsRecordSchema = z
  .object({
    id: z.string().min(1),
    rank: z.number().int().positive(),
    tie: z.boolean(),
    name: z.string().min(1),
    school: z.string().min(1),
    record: z.string().min(1),
    wins: z.number().int().nonnegative(),
    losses: z.number().int().nonnegative(),
    season: z.string().min(1),
    source: historicalWinsSourceSchema,
  })
  .superRefine((row, ctx) => {
    const expected = `${row.wins}-${row.losses}`
    if (row.record !== expected) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `record "${row.record}" must equal wins-losses "${expected}"`,
        path: ["record"],
      })
    }
    try {
      parseSeasonYears(row.season)
    } catch (e) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: e instanceof Error ? e.message : "Invalid season",
        path: ["season"],
      })
    }
  })

export const historicalWinsDatasetSchema = z
  .object({
    schema_version: z.string().min(1),
    dataset: z.string().min(1),
    title: z.string().min(1),
    record_count: z.number().int().nonnegative(),
    ranking_method: z.string().optional(),
    records: z.array(historicalWinsRecordSchema),
  })
  .superRefine((doc, ctx) => {
    if (doc.record_count !== doc.records.length) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `record_count ${doc.record_count} !== records.length ${doc.records.length}`,
        path: ["record_count"],
      })
    }
    if (doc.records.length !== HISTORICAL_WINS_EXPECTED_COUNT) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `Expected exactly ${HISTORICAL_WINS_EXPECTED_COUNT} records, got ${doc.records.length}`,
        path: ["records"],
      })
    }
    const seen = new Set<string>()
    for (let i = 0; i < doc.records.length; i++) {
      const id = doc.records[i].id
      if (seen.has(id)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `Duplicate source record id "${id}"`,
          path: ["records", i, "id"],
        })
      }
      seen.add(id)
    }
  })

export type HistoricalWinsRecord = z.infer<typeof historicalWinsRecordSchema>
export type HistoricalWinsDataset = z.infer<typeof historicalWinsDatasetSchema>

/** Validate unknown JSON; throws ZodError on failure. */
export function parseHistoricalWinsDataset(raw: unknown): HistoricalWinsDataset {
  return historicalWinsDatasetSchema.parse(raw)
}

/** Soft validate without requiring 521 count — for unit fixtures. */
export const historicalWinsDatasetLooseSchema = z
  .object({
    schema_version: z.string().min(1),
    dataset: z.string().min(1),
    title: z.string().min(1),
    record_count: z.number().int().nonnegative(),
    ranking_method: z.string().optional(),
    records: z.array(historicalWinsRecordSchema),
  })
  .superRefine((doc, ctx) => {
    if (doc.record_count !== doc.records.length) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `record_count ${doc.record_count} !== records.length ${doc.records.length}`,
        path: ["record_count"],
      })
    }
    const seen = new Set<string>()
    for (let i = 0; i < doc.records.length; i++) {
      const id = doc.records[i].id
      if (seen.has(id)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `Duplicate source record id "${id}"`,
          path: ["records", i, "id"],
        })
      }
      seen.add(id)
    }
  })
