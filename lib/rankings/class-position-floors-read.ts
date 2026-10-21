import "server-only"
import { gunzipSync } from "zlib"
import { list } from "@vercel/blob"

/**
 * Reading the saved class-position star floors (written by lib/rankings/class-position-floors.ts).
 * Kept apart from the builder, which imports the ranking engine: the star loader reads this, and
 * the engine imports the star loader, so one file for both would be a circular import.
 */
export const CLASS_POSITION_FLOORS_PATH = "snapshots/class-position-floors.json.gz"

export type ClassPositionFloors = { builtAt: string; floors: Record<string, number> }

let cached: { at: number; value: ClassPositionFloors } | null = null
const TEN_MINUTES = 600_000

/** The saved floors, or none. A missing file means no floor anywhere, never an error. */
export async function readClassPositionFloors(): Promise<ClassPositionFloors> {
  if (cached && Date.now() - cached.at < TEN_MINUTES) return cached.value
  try {
    const { blobs } = await list({ prefix: CLASS_POSITION_FLOORS_PATH, limit: 1 })
    const url = blobs[0]?.url
    if (url) {
      const response = await fetch(`${url}?v=${Date.now()}`, { cache: "no-store" })
      if (response.ok) {
        const parsed = JSON.parse(gunzipSync(Buffer.from(await response.arrayBuffer())).toString("utf8")) as ClassPositionFloors
        if (parsed?.floors) {
          cached = { at: Date.now(), value: parsed }
          return parsed
        }
      }
    }
  } catch (e) {
    console.error("[class-position-floors] could not read:", e instanceof Error ? e.message : e)
  }
  return { builtAt: "", floors: {} }
}

/** One wrestler's floor: 1 (none) when he is not in the saved file. */
export async function classPositionFloorFor(athleteId: string): Promise<number> {
  const { floors } = await readClassPositionFloors()
  return floors[athleteId] ?? 1
}
