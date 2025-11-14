import { cookies } from "next/headers"
import { NextResponse } from "next/server"

export async function GET() {
  const cookieStore = await cookies()
  const impersonatingProfileId = cookieStore.get("impersonating_profile_id")

  return NextResponse.json({
    isImpersonating: !!impersonatingProfileId,
  })
}
