import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

export async function POST(
  _req: Request,
  { params }: { params: { schoolId: string } },
) {
  try {
    const id = params.schoolId
    const { data: school, error: fetchErr } = await supabase
      .from("schools")
      .select("id, logo_url")
      .eq("id", id)
      .single()
    if (fetchErr || !school) {
      return NextResponse.json({ error: "School not found" }, { status: 404 })
    }
    if (!school.logo_url) {
      return NextResponse.json({ error: "School has no logo_url to infer colors from" }, { status: 400 })
    }
    // Color detection temporarily disabled to avoid build-time dependency.
    return NextResponse.json({ error: "Brand color detection temporarily disabled" }, { status: 501 })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Server error" }, { status: 500 })
  }
}


