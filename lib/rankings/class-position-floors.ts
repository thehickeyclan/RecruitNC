import "server-only"
import { gzipSync } from "zlib"
import { put } from "@vercel/blob"
import type { SupabaseClient } from "@supabase/supabase-js"
import { classPositionFloor, isRatedClass } from "@/lib/athlete-star-rating"
import { buildRecruitNcRankingBoard } from "@/lib/rankings/recruitnc-ranking-engine"
import { CLASS_POSITION_FLOORS_PATH as SNAPSHOT_PATH, type ClassPositionFloors } from "@/lib/rankings/class-position-floors-read"

/**
 * Each rated wrestler's class-position star floor, saved as a file (Matt, 21 October 2026).
 *
 * The floor needs the formula's order of the whole class, which only a full board build knows —
 * up to a minute per class. Profiles, scouting reports and Scout rate one wrestler at a time and
 * cannot build a class per request, so a daily cron (/api/cron/class-position-floors) builds the
 * rated classes and saves the result here; they read it.
 *
 * Only the floor is saved (2, 3 or 4), never the position. Places past the published 30 are a
 * private pool, not a ranking, and must not be readable anywhere — the blob is public.
 */
const STATES = ["NC", "SC"] as const

export async function buildClassPositionFloors(supabase: SupabaseClient, now: Date = new Date()): Promise<ClassPositionFloors> {
  const floors: Record<string, number> = {}
  const years = [now.getFullYear(), now.getFullYear() + 1, now.getFullYear() + 2].filter((y) => isRatedClass(y, now))
  for (const state of STATES) {
    for (const year of years) {
      const board = await buildRecruitNcRankingBoard({ supabase, year: String(year), gender: "Male", state })
      for (const athlete of board) {
        const floor = classPositionFloor(athlete.ai_rank)
        if (floor > 1) floors[String(athlete.id)] = floor
      }
    }
  }
  return { builtAt: now.toISOString(), floors }
}

export async function saveClassPositionFloors(snapshot: ClassPositionFloors): Promise<{ bytes: number }> {
  const body = gzipSync(JSON.stringify(snapshot))
  await put(SNAPSHOT_PATH, body, {
    access: "public",
    addRandomSuffix: false,
    allowOverwrite: true,
    contentType: "application/gzip",
    cacheControlMaxAge: 60,
  })
  return { bytes: body.length }
}

