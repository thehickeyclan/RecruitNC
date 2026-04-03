import { NextRequest, NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { getAdminAuth } from "@/lib/cached-auth-check"
import {
  parseNhscaRosterTsv,
  nhscaRosterRowToFullInsert,
  nhscaRosterRowToMinimalInsert,
  nhscaRosterRowHasExtended,
  type NhscaRosterTsvDeleteMode,
  type ParsedNhscaRosterRow,
} from "@/lib/nhsca-roster-tsv-parse"

function looksLikeMissingColumnError(msg: string): boolean {
  return /column|42703|does not exist|schema cache/i.test(msg)
}

export async function POST(request: NextRequest) {
  try {
    const { user, profile } = await getAdminAuth()
    if (!user || !profile?.is_admin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const tsv = typeof body.tsv === "string" ? body.tsv : ""
    const year = typeof body.year === "number" && Number.isFinite(body.year) ? body.year : 2026
    const state = typeof body.state === "string" && body.state.trim() ? body.state.trim() : "NC"
    const sourceRaw = typeof body.source === "string" ? body.source.trim() : ""
    const source = sourceRaw || `admin_roster_tsv_${year}`
    const deleteMode: NhscaRosterTsvDeleteMode =
      body.deleteMode === "source" ? "source" : "division"

    if (!tsv.trim()) {
      return NextResponse.json({ error: "tsv (string) is required" }, { status: 400 })
    }

    const parsed = parseNhscaRosterTsv(tsv, year, state, source)
    if (parsed.rows.length === 0) {
      return NextResponse.json(
        {
          error: "No rows to import",
          warnings: parsed.warnings,
          skippedEmptyName: parsed.skippedEmptyName,
        },
        { status: 400 },
      )
    }

    const supabase = createAdminClient()

    if (deleteMode === "source") {
      const { error: delErr } = await supabase
        .from("nhsca_placements")
        .delete()
        .eq("year", year)
        .eq("state", state)
        .eq("source", source)

      if (delErr) {
        console.error("NHSCA roster TSV delete (source):", delErr)
        return NextResponse.json(
          { error: "Failed to clear previous import for this source", details: delErr.message },
          { status: 500 },
        )
      }
    } else {
      for (const div of parsed.divisions) {
        const { error: deleteError } = await supabase
          .from("nhsca_placements")
          .delete()
          .eq("year", year)
          .eq("state", state)
          .eq("division", div)

        if (deleteError) {
          console.error(`NHSCA roster TSV delete division ${div}:`, deleteError)
          return NextResponse.json(
            { error: `Failed to clear ${year} ${state} ${div}`, details: deleteError.message },
            { status: 500 },
          )
        }
      }
    }

    const insertRows = async (rows: Record<string, unknown>[]) => {
      return supabase.from("nhsca_placements").insert(rows).select()
    }

    const tryInsert = async (rows: ParsedNhscaRosterRow[]) => {
      const anyExt = rows.some(nhscaRosterRowHasExtended)
      if (!anyExt) {
        const r = await insertRows(rows.map(nhscaRosterRowToMinimalInsert))
        return { ...r, usedMinimalOnly: false as const }
      }
      const full = rows.map(nhscaRosterRowToFullInsert)
      let result = await insertRows(full)
      if (result.error && looksLikeMissingColumnError(result.error.message)) {
        result = await insertRows(rows.map(nhscaRosterRowToMinimalInsert))
        return { ...result, usedMinimalOnly: true as const }
      }
      return { ...result, usedMinimalOnly: false as const }
    }

    const { data, error, usedMinimalOnly } = await tryInsert(parsed.rows)

    if (error) {
      console.error("NHSCA roster TSV insert:", error)
      return NextResponse.json(
        { error: "Failed to import rows", details: error.message },
        { status: 500 },
      )
    }

    const participantsCount = data?.length ?? parsed.rows.length
    const placersCount =
      data?.filter((p: { placement?: number | null }) => p.placement != null).length ?? 0

    return NextResponse.json({
      success: true,
      imported: participantsCount,
      placers: placersCount,
      nonPlacers: participantsCount - placersCount,
      year,
      state,
      source,
      deleteMode,
      divisions: parsed.divisions,
      skippedEmptyName: parsed.skippedEmptyName,
      warnings: [...parsed.warnings, ...(usedMinimalOnly ? ["Extended columns omitted (DB missing roster migration)."] : [])],
      usedMinimalOnly: Boolean(usedMinimalOnly),
      message: `Imported ${participantsCount} NHSCA roster row(s) (${placersCount} placers). Other years in nhsca_placements are unchanged.`,
    })
  } catch (error: unknown) {
    console.error("Roster TSV import error:", error)
    const msg = error instanceof Error ? error.message : "Internal server error"
    return NextResponse.json({ error: "Internal server error", details: msg }, { status: 500 })
  }
}
