import { NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { labelOpponents, type AccoladeBout } from "@/lib/opponent-accolades"

/**
 * Accolades for the opponents in a profile's bout tables: "2026 FL 1A State Champion" beside the
 * name, on wins and losses alike - a coach reads a 7-1 loss to a state finalist differently from
 * one to nobody in particular. The rules live in lib/opponent-accolades.ts.
 *
 * Takes the bouts rather than an athlete id because the tables draw from five sources (NCHSAA,
 * NHSCA, Super 32, TOC, other events) and already hold exactly what they show.
 */

export const dynamic = "force-dynamic"

type BoutIn = { name?: unknown; club?: unknown; year?: unknown; weight?: unknown }

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as { bouts?: BoutIn[] } | null
  const raw = (Array.isArray(body?.bouts) ? body!.bouts : []).slice(0, 500)
  const bouts: AccoladeBout[] = raw
    .filter((b) => typeof b.name === "string" && b.name.trim())
    .map((b) => ({
      name: String(b.name),
      club: typeof b.club === "string" ? b.club : null,
      year: Number.isFinite(Number(b.year)) ? Number(b.year) : null,
      weight: typeof b.weight === "string" || typeof b.weight === "number" ? b.weight : null,
    }))
  return NextResponse.json({ labels: await labelOpponents(createAdminClient(), bouts) })
}
