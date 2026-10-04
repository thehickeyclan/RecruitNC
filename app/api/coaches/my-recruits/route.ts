import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { loadMyRecruits } from "@/lib/my-recruits"

export const dynamic = "force-dynamic"

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Sign in to see your recruits." }, { status: 401 })
  try {
    return NextResponse.json(await loadMyRecruits(createAdminClient(), user.id))
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Could not load recruits." }, { status: 500 })
  }
}

