import { NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"

const rawIds = (process.env.PUBLIC_PROFILE_IDS || "")
  .split(",")
  .map((id) => id.trim())
  .filter(Boolean)
const allowlist = new Set(rawIds)

export async function GET(
  _req: Request,
  { params }: { params: { id: string } },
) {
  const isAllowed = allowlist.has(params.id)
  const supabase = createAdminClient()

  const { data, error } = await supabase
    .from("athletes")
    .select("*")
    .eq("id", params.id)
    .single()

  return NextResponse.json({
    requestedId: params.id,
    isAllowed,
    rawIds,
    fetched: !!data,
    error: error?.message ?? null,
  })
}

