import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"

export const dynamic = "force-dynamic"

const MONTHS_BACK = 24
const BLUE_PRICE = 55

async function requireAdmin() {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return { ok: false as const, status: 401 as const, error: "Unauthorized" }
  const { data: profile } = await supabase.from("user_profiles").select("is_admin").eq("user_id", user.id).single()
  if (!profile?.is_admin) return { ok: false as const, status: 403 as const, error: "Admin required" }
  return { ok: true as const }
}

function monthKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`
}

function endOfMonth(year: number, month: number): Date {
  return new Date(year, month, 0, 23, 59, 59, 999)
}

export type BlueReportsData = {
  membershipTrend: { month: string; newCount: number; endedCount: number; activeAtEnd: number; estimatedMRR: number }[]
  currentActive: number
  currentPaused: number
  estimatedMRR: number
  byClass: { graduationYear: number; count: number; isAnticipatedChurn: boolean }[]
  anticipatedChurnCount: number
  /** Total rows in blue_signups (everyone who submitted the registration form). */
  signupTotal: number
  signupPaid: number
  signupPending: number
}

/** GET: Blue reports for charts — trends, class distribution, MRR */
export async function GET() {
  const auth = await requireAdmin()
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status })

  const admin = createAdminClient()

  const { data: rows, error } = await admin
    .from("blue_memberships")
    .select("id, athlete_id, status, started_at, ended_at, created_at")
    .order("created_at", { ascending: true })

  if (error) {
    if (error.code === "42P01") return NextResponse.json({ error: "Table blue_memberships does not exist." }, { status: 503 })
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // Signups (blue_signups): everyone who submitted the registration form
  let signupTotal = 0
  let signupPaid = 0
  let signupPending = 0
  const { data: signupRows } = await admin.from("blue_signups").select("id, status")
  if (signupRows && Array.isArray(signupRows)) {
    signupTotal = signupRows.length
    signupPaid = signupRows.filter((r) => (r as { status?: string }).status === "paid").length
    signupPending = signupTotal - signupPaid
  }

  const now = new Date()
  const currentYear = now.getFullYear()

  // Build last N months
  const months: { year: number; month: number; key: string }[] = []
  for (let i = MONTHS_BACK - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    months.push({ year: d.getFullYear(), month: d.getMonth(), key: monthKey(d) })
  }

  const trend = months.map(({ year, month, key }) => {
    const endDate = endOfMonth(year, month + 1)
    const newCount = (rows ?? []).filter((r) => {
      const created = new Date(r.created_at)
      return created.getFullYear() === year && created.getMonth() === month
    }).length
    const endedCount = (rows ?? []).filter((r) => {
      const ended = r.ended_at ? new Date(r.ended_at) : null
      return ended && ended.getFullYear() === year && ended.getMonth() === month
    }).length
    const activeAtEnd = (rows ?? []).filter((r) => {
      const started = new Date(r.started_at)
      const ended = r.ended_at ? new Date(r.ended_at) : null
      return started <= endDate && (!ended || ended > endDate)
    }).length
    return {
      month: key,
      newCount,
      endedCount,
      activeAtEnd,
      estimatedMRR: activeAtEnd * BLUE_PRICE,
    }
  })

  const activeRows = (rows ?? []).filter((r) => r.status === "active")
  const pausedRows = (rows ?? []).filter((r) => r.status === "paused")
  const currentActive = activeRows.length
  const currentPaused = pausedRows.length
  const estimatedMRR = (currentActive + currentPaused) * BLUE_PRICE

  // By class (graduation year) for active + paused
  const athleteIds = [...new Set([...activeRows, ...pausedRows].map((r) => r.athlete_id))]
  let byClass: { graduationYear: number; count: number; isAnticipatedChurn: boolean }[] = []
  if (athleteIds.length > 0) {
    const { data: athletes } = await admin
      .from("athletes")
      .select("id, graduationyear")
      .in("id", athleteIds)
    const gradMap = (athletes ?? []).reduce(
      (acc, a) => {
        const id = String(a.id)
        const y = Number((a as { graduationyear?: number }).graduationyear)
        acc[id] = Number.isFinite(y) ? y : 0
        return acc
      },
      {} as Record<string, number>
    )
    const classCounts: Record<number, number> = {}
    for (const r of [...activeRows, ...pausedRows]) {
      const y = gradMap[r.athlete_id] || 0
      if (y >= currentYear) classCounts[y] = (classCounts[y] ?? 0) + 1
    }
    const years = Object.keys(classCounts)
      .map(Number)
      .filter((y) => y >= currentYear)
      .sort((a, b) => a - b)
    byClass = years.map((graduationYear) => ({
      graduationYear,
      count: classCounts[graduationYear] ?? 0,
      isAnticipatedChurn: graduationYear === currentYear,
    }))
  }

  const anticipatedChurnCount = byClass.find((c) => c.graduationYear === currentYear)?.count ?? 0

  const data: BlueReportsData = {
    membershipTrend: trend,
    currentActive,
    currentPaused,
    estimatedMRR,
    byClass,
    anticipatedChurnCount,
    signupTotal,
    signupPaid,
    signupPending,
  }

  return NextResponse.json(data)
}
