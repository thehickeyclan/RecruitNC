import { put } from "@vercel/blob"
import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { EXPENSE_TYPE_OPTIONS, type ExpensePaymentMethod } from "@/lib/athlete-expense-requests"
import { nanoid } from "nanoid"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

const MAX_FILE_BYTES = 10 * 1024 * 1024
const ALLOWED_EXT = new Set(["pdf", "png", "jpg", "jpeg", "webp", "heic", "gif"])

function parseDollarsToCents(raw: string): number | null {
  const n = Number.parseFloat(raw.replace(/[$,]/g, "").trim())
  if (!Number.isFinite(n) || n <= 0) return null
  return Math.min(Math.round(n * 100), 100_000_000)
}

const VALID_METHODS: ExpensePaymentMethod[] = ["zelle", "venmo"]
const TYPE_VALUES = new Set(EXPENSE_TYPE_OPTIONS.map((o) => o.value))

export async function GET() {
  const supabase = await createClient()
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 })
  }

  const admin = createAdminClient()
  const { data: rows, error } = await admin
    .from("athlete_expense_requests")
    .select(
      "id, athlete_id, expense_type, amount_cents, amount_approved_cents, payment_method, zelle_info, venmo_info, parent_notes, document_url, status, admin_notes, created_at, updated_at, reviewed_at, paid_at, athletes ( name )",
    )
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })

  if (error) {
    console.error("[RecruitNC] expense-requests GET", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const items = (rows ?? []).map((r) => {
    const a = r.athletes as { name: string } | { name: string }[] | null
    const athleteName = a == null ? "" : Array.isArray(a) ? a[0]?.name ?? "" : a.name
    return {
      id: r.id,
      athlete_id: r.athlete_id,
      athlete_name: athleteName,
      expense_type: r.expense_type,
      amount_cents: r.amount_cents,
      amount_approved_cents: r.amount_approved_cents,
      payment_method: r.payment_method,
      zelle_info: r.zelle_info,
      venmo_info: r.venmo_info,
      parent_notes: r.parent_notes,
      document_url: r.document_url,
      status: r.status,
      admin_notes: r.admin_notes,
      created_at: r.created_at,
      updated_at: r.updated_at,
      reviewed_at: r.reviewed_at,
      paid_at: r.paid_at,
    }
  })

  return NextResponse.json({ requests: items })
}

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 })
  }

  let form: FormData
  try {
    form = await request.formData()
  } catch {
    return NextResponse.json({ error: "Invalid form" }, { status: 400 })
  }

  const athleteId = (form.get("athleteId") as string) || ""
  const expenseType = (form.get("expenseType") as string) || ""
  const amountRaw = (form.get("amountDollars") as string) || ""
  const paymentMethod = (form.get("paymentMethod") as string) || ""
  const zelleInfo = ((form.get("zelleInfo") as string) || "").trim() || null
  const venmoInfo = ((form.get("venmoInfo") as string) || "").trim() || null
  const parentNotes = ((form.get("parentNotes") as string) || "").trim() || null
  const file = form.get("document") as File | null

  if (!athleteId) {
    return NextResponse.json({ error: "Athlete is required" }, { status: 400 })
  }
  if (!TYPE_VALUES.has(expenseType)) {
    return NextResponse.json({ error: "Invalid expense type" }, { status: 400 })
  }
  const amountCents = parseDollarsToCents(amountRaw)
  if (amountCents == null) {
    return NextResponse.json({ error: "Invalid amount" }, { status: 400 })
  }
  if (!VALID_METHODS.includes(paymentMethod as ExpensePaymentMethod)) {
    return NextResponse.json({ error: "Choose Zelle or Venmo" }, { status: 400 })
  }
  if (paymentMethod === "zelle" && !zelleInfo) {
    return NextResponse.json({ error: "Enter the email or phone for Zelle" }, { status: 400 })
  }
  if (paymentMethod === "venmo" && !venmoInfo) {
    return NextResponse.json({ error: "Enter your Venmo @username" }, { status: 400 })
  }

  const admin = createAdminClient()
  const { data: link, error: linkErr } = await admin
    .from("parent_athlete_links")
    .select("athlete_id")
    .eq("user_id", user.id)
    .eq("athlete_id", athleteId)
    .maybeSingle()

  if (linkErr || !link) {
    return NextResponse.json({ error: "Link the athlete in Your athletes before submitting" }, { status: 403 })
  }

  let documentUrl: string | null = null
  if (file && file.size > 0) {
    if (file.size > MAX_FILE_BYTES) {
      return NextResponse.json({ error: "Document must be 10MB or less" }, { status: 400 })
    }
    const ext = (file.name.split(".").pop() || "").toLowerCase()
    if (!ALLOWED_EXT.has(ext)) {
      return NextResponse.json(
        { error: "Use PDF or an image (PNG, JPG, WebP, HEIC, GIF)" },
        { status: 400 },
      )
    }
    const name = `expense-documents/${user.id}/${nanoid(10)}.${ext}`
    const blob = await put(name, file, { access: "public" })
    documentUrl = blob.url
  }

  const row = {
    user_id: user.id,
    athlete_id: athleteId,
    expense_type: expenseType,
    amount_cents: amountCents,
    payment_method: paymentMethod,
    zelle_info: paymentMethod === "zelle" ? zelleInfo : null,
    venmo_info: paymentMethod === "venmo" ? venmoInfo : null,
    parent_notes: parentNotes,
    document_url: documentUrl,
    status: "pending" as const,
  }

  const { data: inserted, error: insErr } = await admin
    .from("athlete_expense_requests")
    .insert(row)
    .select("id, created_at, status")
    .single()

  if (insErr) {
    console.error("[RecruitNC] expense-requests POST", insErr)
    return NextResponse.json({ error: insErr.message }, { status: 500 })
  }

  return NextResponse.json({ success: true, id: inserted.id, created_at: inserted.created_at, status: inserted.status })
}
