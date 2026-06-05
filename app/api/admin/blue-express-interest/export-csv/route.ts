import { NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { createClient } from "@/lib/supabase/server"
import { formatPhoneForDisplay } from "@/lib/phone-format"

export const dynamic = "force-dynamic"

const ACHIEVEMENT_LABELS: Record<string, string> = {
  all_american: "All American",
  state_champion: "State Champion",
  state_placer: "State Placer",
  state_qualifier: "State Qualifier",
  na: "N/A",
}

async function requireAdmin() {
  const supabase = await createClient()
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()
  if (authError || !user) {
    return { ok: false as const, status: 401 as const, error: "Unauthorized" }
  }
  const { data: profile } = await supabase
    .from("user_profiles")
    .select("is_admin")
    .eq("user_id", user.id)
    .single()
  if (!profile?.is_admin) {
    return { ok: false as const, status: 403 as const, error: "Admin access required" }
  }
  return { ok: true as const }
}

function escapeCsv(value: string | null | undefined): string {
  const str = (value ?? "").toString()
  return `"${str.replace(/"/g, '""')}"`
}

export async function GET() {
  try {
    const auth = await requireAdmin()
    if (!auth.ok) {
      return NextResponse.json({ error: auth.error }, { status: auth.status })
    }

    const adminClient = createAdminClient()
    const { data, error } = await adminClient
      .from("blue_express_interest")
      .select("*")
      .order("created_at", { ascending: false })

    if (error) {
      console.error("[Export CSV] blue_express_interest error:", error?.message)
      if (error.code === "42P01") {
        return NextResponse.json(
          { error: "Table blue_express_interest does not exist" },
          { status: 503 }
        )
      }
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    const submissions = data ?? []
    const headers = [
      "First Name",
      "Last Name",
      "Email",
      "Cell Phone",
      "Graduation Year",
      "Highest Achievement",
      "Weight Class",
      "High School",
      "Club",
      "Comments",
      "Status",
      "Regional",
      "Placement",
      "Submitted At",
    ]

    const rows = submissions.map((row: any) => [
      escapeCsv(row.first_name),
      escapeCsv(row.last_name),
      escapeCsv(row.parent_email),
      escapeCsv(formatPhoneForDisplay(row.cell_phone)),
      escapeCsv(row.graduation_year),
      escapeCsv(ACHIEVEMENT_LABELS[row.highest_achievement] ?? row.highest_achievement),
      escapeCsv(row.weight_class),
      escapeCsv(row.high_school),
      escapeCsv(row.club),
      escapeCsv(row.comments),
      escapeCsv(row.status),
      escapeCsv(row.regional),
      escapeCsv(row.placement),
      escapeCsv(row.created_at ? new Date(row.created_at).toISOString() : null),
    ])

    const csv =
      headers.join(",") +
      "\n" +
      rows.map((r) => r.join(",")).join("\n")

    const filename = `blue-interest-export-${new Date().toISOString().split("T")[0]}.csv`
    return new NextResponse(csv, {
      status: 200,
      headers: {
        "Content-Type": "text/csv",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    })
  } catch (err) {
    console.error("[Export CSV] blue-express-interest:", err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to export" },
      { status: 500 }
    )
  }
}
