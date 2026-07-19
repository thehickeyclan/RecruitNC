import { NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { recordTocProjectActivity } from "@/lib/toc/project-activity"
import { reviewTocProjectDocumentWithAi } from "@/lib/toc/project-document-ai"
import { requireTocInvitationManager } from "@/lib/toc/require-toc-invitation-manager"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

const TABLE = "toc_project_documents"
const BUCKET = "toc-project-documents"

function tableMissing(error: { code?: string; message?: string } | null | undefined): boolean {
  return error?.code === "42P01" || error?.code === "PGRST205" || String(error?.message ?? "").includes(TABLE)
}

function parseCurrency(value: string): number | null {
  const cleaned = value.replace(/[^0-9.-]/g, "")
  if (!cleaned || cleaned === "-" || cleaned === "." || cleaned === "-.") return null
  const numeric = Number(cleaned)
  return Number.isFinite(numeric) ? numeric : null
}

export async function GET() {
  const auth = await requireTocInvitationManager()
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status })

  const admin = createAdminClient()
  const { data, error } = await admin.from(TABLE).select("*").order("created_at", { ascending: false })
  if (error) {
    if (tableMissing(error)) {
      return NextResponse.json({
        unavailable: true,
        setupSql: "docs/sql/toc-project-plan.sql",
        documents: [],
      })
    }
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ documents: data ?? [] })
}

export async function POST(request: Request) {
  const auth = await requireTocInvitationManager()
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status })

  const form = await request.formData()
  const file = form.get("file")
  if (!(file instanceof File)) return NextResponse.json({ error: "file required" }, { status: 400 })

  const title = String(form.get("title") || file.name).trim()
  const category = String(form.get("category") || "").trim() || null
  const vendor = String(form.get("vendor") || "").trim() || null
  const description = String(form.get("description") || "").trim() || null
  const amountRaw = String(form.get("amount") || "").trim()
  const amount = amountRaw ? parseCurrency(amountRaw) : null

  const admin = createAdminClient()
  await admin.storage.createBucket(BUCKET, { public: true }).catch(() => null)

  const safeName = file.name.replace(/[^a-zA-Z0-9._-]+/g, "-").slice(0, 120)
  const path = `${new Date().toISOString().slice(0, 10)}/${Date.now()}-${safeName}`
  const buffer = Buffer.from(await file.arrayBuffer())
  const aiReview = await reviewTocProjectDocumentWithAi({
    fileName: file.name,
    mimeType: file.type || "application/octet-stream",
    buffer,
    title,
    category,
    vendor,
    amount,
  }).catch((error) => ({ ok: false as const, error: error instanceof Error ? error.message : "AI review failed" }))

  const aiMetadata = aiReview.ok ? aiReview.metadata : null
  const finalVendor = vendor || aiMetadata?.vendor || null
  const finalAmount = amount ?? aiMetadata?.totalAmount ?? null
  const finalCategory = category || aiMetadata?.suggestedCategory || null
  const finalDescription = description
  const documentDate = aiMetadata?.documentDate ?? null

  const { error: uploadError } = await admin.storage.from(BUCKET).upload(path, buffer, {
    contentType: file.type || "application/octet-stream",
    upsert: false,
  })
  if (uploadError) return NextResponse.json({ error: uploadError.message }, { status: 500 })

  const { data: publicData } = admin.storage.from(BUCKET).getPublicUrl(path)
  const payload = {
    title,
    category: finalCategory,
    vendor: finalVendor,
    document_date: documentDate,
    description: finalDescription,
    amount: finalAmount,
    ai_summary: aiMetadata?.summary || null,
    ai_metadata: aiMetadata,
    ai_review_status: aiReview.ok ? "reviewed" : "skipped",
    ai_reviewed_at: aiReview.ok ? new Date().toISOString() : null,
    url: publicData.publicUrl,
    path,
    file_name: file.name,
    file_type: file.type || null,
    file_size: file.size,
    uploaded_by: auth.email,
    created_by: auth.userId,
    updated_at: new Date().toISOString(),
  }

  const { data, error } = await admin.from(TABLE).insert(payload).select("*").single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  await recordTocProjectActivity(admin, {
    actionType: "document.uploaded",
    category: finalCategory,
    actorEmail: auth.email,
    actorUserId: auth.userId,
    summary: `uploaded shared document “${title}”${finalVendor ? ` for ${finalVendor}` : ""}`,
    details: {
      fileName: file.name,
      fileSize: file.size,
      fileType: file.type || null,
      amount: finalAmount,
      vendor: finalVendor,
      aiReviewStatus: aiReview.ok ? "reviewed" : "skipped",
      aiReviewError: aiReview.ok ? null : aiReview.error,
    },
  })

  return NextResponse.json({ document: data })
}
