import { NextResponse } from "next/server"

export async function GET() {
  const raw = process.env.PUBLIC_PROFILE_IDS || ""
  const ids = raw
    .split(",")
    .map((id) => id.trim())
    .filter(Boolean)

  return NextResponse.json({
    raw,
    parsed: ids,
    count: ids.length,
  })
}

